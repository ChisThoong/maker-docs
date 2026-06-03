import { HTML_GEN_PROMPT } from "./html-gen-prompt";
import { extractHtmlFromResponse } from "./extract-html";

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MAX_SOURCE_CHARS = 120_000;
const MAX_IMAGES = 6;

export interface ImportImageInput {
  name: string;
  mimeType: string;
  dataUrl: string;
}

type XaiMessage =
  | { role: "user"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: string } }
      >;
    };

function buildUserText(input: {
  source: string;
  filename?: string;
  title?: string;
  hasImages: boolean;
}): string {
  const source = input.source.trim().slice(0, MAX_SOURCE_CHARS);
  const label = input.filename || "document";
  const titleLine = input.title?.trim()
    ? `\nSuggested page title: **${input.title.trim()}**`
    : "";

  const imageLine = input.hasImages
    ? "\nReference image(s) are attached — match layout, sections, colors, and UI structure where visible."
    : "";

  const sourceBlock = source
    ? `\n\n${source}`
    : input.hasImages
      ? "\n\n(No text file — infer the page from the attached image(s).)"
      : "";

  return `${HTML_GEN_PROMPT}

---

## Source: ${label}${titleLine}${imageLine}

Turn the specification below into the single self-contained \`index.html\` described above. Preserve requirements, sections, labels, and data.${sourceBlock}`;
}

function buildMessages(input: {
  source: string;
  filename?: string;
  title?: string;
  images?: ImportImageInput[];
}): { model: string; messages: XaiMessage[] } {
  const images = (input.images ?? []).slice(0, MAX_IMAGES);
  const hasImages = images.length > 0;
  const text = buildUserText({ ...input, hasImages });

  if (!hasImages) {
    return {
      model: process.env.XAI_MODEL || "grok-3-latest",
      messages: [{ role: "user", content: text }],
    };
  }

  return {
    model:
      process.env.XAI_VISION_MODEL ||
      process.env.XAI_MODEL ||
      "grok-2-vision-1212",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          ...images.map((img) => ({
            type: "image_url" as const,
            image_url: { url: img.dataUrl, detail: "high" as const },
          })),
        ],
      },
    ],
  };
}

export async function generateHtmlFromSource(input: {
  source: string;
  filename?: string;
  title?: string;
  images?: ImportImageInput[];
}): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("missing_xai_key");

  const hasContent =
    input.source.trim().length > 0 || (input.images?.length ?? 0) > 0;
  if (!hasContent) throw new Error("bad_request");

  const { model, messages } = buildMessages(input);

  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.25,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `xai_error:${res.status}${detail ? `:${detail.slice(0, 200)}` : ""}`
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("empty_response");

  try {
    return extractHtmlFromResponse(raw);
  } catch {
    throw new Error("invalid_html");
  }
}
