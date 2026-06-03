import type { ContentMode } from "./types";
import { prepareIframeHtml } from "./iframe-html";

/** Sandbox flags for embedded interactive demos (Workers, static hosts, …). */
export const DOC_IFRAME_SANDBOX =
  "allow-scripts allow-popups allow-forms allow-modals";

export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export type DocEmbed =
  | { kind: "url"; url: string }
  | { kind: "html"; html: string };

export function externalEmbedSrc(url: string): string {
  return `/api/embed?url=${encodeURIComponent(url)}`;
}

export function resolveDocEmbed(input: {
  contentMode?: ContentMode;
  content?: string;
}): DocEmbed {
  if (input.contentMode === "url") {
    const url = normalizeExternalUrl(input.content ?? "");
    if (url) return { kind: "url", url };
  }
  return { kind: "html", html: prepareIframeHtml(input.content ?? "") };
}
