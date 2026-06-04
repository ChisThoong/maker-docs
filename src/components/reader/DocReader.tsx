"use client";

import { useEffect, useState } from "react";
import { Loader2, FileWarning, Lock } from "lucide-react";
import type { ContentMode, DocFileMeta } from "@/lib/types";
import {
  DOC_IFRAME_SANDBOX,
  externalEmbedSrc,
  normalizeExternalUrl,
  resolveDocEmbed,
} from "@/lib/content-embed";

type State = "loading" | "ok" | "forbidden" | "notfound";

const pageCenter: React.CSSProperties = {
  display: "flex",
  minHeight: "100dvh",
  alignItems: "center",
  justifyContent: "center",
  margin: 0,
  fontFamily: "system-ui, sans-serif",
};

export default function DocReader({
  id,
  token,
}: {
  id?: string;
  token?: string;
}) {
  const [content, setContent] = useState("");
  const [contentMode, setContentMode] = useState<ContentMode>("html");
  const [file, setFile] = useState<DocFileMeta | null>(null);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      const url = token ? `/api/public/${token}` : `/api/docs/${id}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 403) return setState("forbidden");
      if (res.status === 404) return setState("notfound");
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.doc) return setState("notfound");
      setContent(data.doc.content ?? "");
      setContentMode(data.doc.contentMode ?? "html");
      setFile(data.doc.file ?? null);
      setState("ok");
    })();
  }, [id, token]);

  if (state === "loading") {
    return (
      <>
        <style>{`@keyframes reader-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ ...pageCenter, color: "#9ca3af" }}>
          <Loader2
            size={28}
            style={{ animation: "reader-spin 1s linear infinite" }}
          />
        </div>
      </>
    );
  }

  if (state === "forbidden" || state === "notfound") {
    const forbidden = state === "forbidden";
    return (
      <div
        style={{
          ...pageCenter,
          flexDirection: "column",
          gap: 12,
          padding: "0 24px",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        {forbidden ? <Lock size={40} /> : <FileWarning size={40} />}
        <p style={{ margin: 0, fontSize: 15 }}>
          {forbidden
            ? "You do not have permission to view this document."
            : "Document not found."}
        </p>
      </div>
    );
  }

  if (contentMode === "file") {
    if (!file) {
      return (
        <div style={{ ...pageCenter, color: "#6b7280" }}>
          File metadata is missing.
        </div>
      );
    }
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          background: "#060a14",
          color: "#e2e8f0",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderBottom: "1px solid #1f2937",
            background: "#0b1020",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>{file.mimeType}</div>
          </div>
          <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", fontSize: 13 }}>
            Open
          </a>
          <a href={file.url} download style={{ color: "#93c5fd", fontSize: 13 }}>
            Download
          </a>
        </div>
        <div style={{ minHeight: 0, overflow: "auto" }}>
          {file.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : file.kind === "video" ? (
            <video src={file.url} controls style={{ width: "100%", height: "100%", background: "#000" }} />
          ) : file.kind === "audio" ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <audio src={file.url} controls style={{ width: "min(640px, 100%)" }} />
            </div>
          ) : file.kind === "pdf" ? (
            <iframe src={file.url} title={file.name} style={{ width: "100%", height: "100%", border: 0 }} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
              Preview is not available for this file type. Open or download the file.
            </div>
          )}
        </div>
      </div>
    );
  }

  const embed = resolveDocEmbed({ content, contentMode });
  const invalidUrl = contentMode === "url" && !normalizeExternalUrl(content);
  if (invalidUrl) {
    return (
      <div
        style={{
          ...pageCenter,
          padding: "0 24px",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Enter a valid https:// URL to preview this document.
      </div>
    );
  }

  return (
    <iframe
      title="document"
      {...(embed.kind === "url"
        ? { src: externalEmbedSrc(embed.url) }
        : { srcDoc: embed.html })}
      sandbox={DOC_IFRAME_SANDBOX}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        minHeight: "100vh",
        border: 0,
        margin: 0,
        padding: 0,
        display: "block",
        background: "#060a14",
        colorScheme: "dark",
      }}
    />
  );
}
