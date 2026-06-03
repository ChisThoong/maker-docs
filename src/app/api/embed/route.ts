import { NextRequest, NextResponse } from "next/server";
import { normalizeExternalUrl } from "@/lib/content-embed";

export const dynamic = "force-dynamic";

const DARK_SCROLLBAR_CSS = `
html { color-scheme: dark; }
* {
  scrollbar-width: thin;
  scrollbar-color: #334155 #060a14;
}
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
*::-webkit-scrollbar-track {
  background: #060a14;
}
*::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 999px;
  border: 2px solid #060a14;
}
*::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
`;

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::1") return true;
  if (host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length === 4 && parts.every((n) => Number.isInteger(n))) {
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  return false;
}

function injectHead(html: string, sourceUrl: string): string {
  const base = `<base href="${sourceUrl}">`;
  const style = `<style data-maker-docs-scrollbar>${DARK_SCROLLBAR_CSS}</style>`;
  const injection = `${base}${style}`;

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${injection}</head>`);
  }

  return `<!DOCTYPE html><html><head>${injection}</head><body>${html}</body></html>`;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  const url = normalizeExternalUrl(raw);
  if (!url) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const parsed = new URL(url);
  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: "blocked_host" }, { status: 400 });
  }

  const upstream = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "text/html,application/xhtml+xml" },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "upstream_error" },
      { status: upstream.status }
    );
  }

  const html = await upstream.text();
  return new NextResponse(injectHead(html, url), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
