import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/permissions";
import { generateHtmlFromSource } from "@/lib/xai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BODY_CHARS = 120_000;

function errorMessage(code: string): string {
  const map: Record<string, string> = {
    unauthorized: "You need to sign in.",
    forbidden: "You do not have permission to perform this action.",
    bad_request: "Missing file content.",
    missing_xai_key: "XAI_API_KEY is not configured on the server.",
    empty_response: "AI returned no content.",
    invalid_html: "AI returned invalid HTML.",
  };
  if (code.startsWith("xai_error:")) {
    return "xAI request failed — check the API key or try again.";
  }
  return map[code] ?? "Could not generate HTML.";
}

export async function POST(req: NextRequest) {
  const ctx = await getAccessContext();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (ctx.workspaceRole === "viewer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    source?: string;
    filename?: string;
    title?: string;
    images?: { name?: string; mimeType?: string; dataUrl?: string }[];
  } | null;

  const source = body?.source?.trim() ?? "";
  const images = (body?.images ?? [])
    .filter((img) => img.dataUrl?.startsWith("data:image/"))
    .slice(0, 6)
    .map((img) => ({
      name: img.name || "image",
      mimeType: img.mimeType || "image/png",
      dataUrl: img.dataUrl!,
    }));

  if (!source && images.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (source.length > MAX_BODY_CHARS) {
    return NextResponse.json(
      { error: "bad_request", message: "File too large (max ~120k characters)." },
      { status: 400 }
    );
  }

  try {
    const html = await generateHtmlFromSource({
      source,
      filename: body?.filename,
      title: body?.title,
      images,
    });
    return NextResponse.json({ html });
  } catch (err) {
    const code = err instanceof Error ? err.message : "generate_failed";
    console.error("POST /api/generate/html", code);
    return NextResponse.json(
      { error: code, message: errorMessage(code) },
      { status: code === "missing_xai_key" ? 503 : 502 }
    );
  }
}
