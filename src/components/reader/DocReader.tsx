"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, FileWarning, Lock } from "lucide-react";
import { prepareIframeHtml } from "@/lib/iframe-html";

type State = "loading" | "ok" | "forbidden" | "notfound";

const pageCenter: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
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
      setState("ok");
    })();
  }, [id, token]);

  const iframeHtml = useMemo(() => prepareIframeHtml(content), [content]);

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

  return (
    <iframe
      title="document"
      srcDoc={iframeHtml}
      sandbox="allow-scripts allow-popups allow-forms allow-modals"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
        margin: 0,
        padding: 0,
      }}
    />
  );
}
