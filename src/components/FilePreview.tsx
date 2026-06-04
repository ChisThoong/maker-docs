"use client";

import { Download, ExternalLink, FileText, ImageIcon, Music, Video } from "lucide-react";
import type { DocFileMeta } from "@/lib/types";
import { formatFileSize } from "@/lib/file-content";
import { cn } from "@/lib/utils";

function KindIcon({ kind }: { kind: DocFileMeta["kind"] }) {
  if (kind === "image") return <ImageIcon size={22} />;
  if (kind === "video") return <Video size={22} />;
  if (kind === "audio") return <Music size={22} />;
  return <FileText size={22} />;
}

export default function FilePreview({
  file,
  title,
  className,
  compact = false,
}: {
  file: DocFileMeta;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const header = (
    <div className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <KindIcon kind={file.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{title || file.name}</div>
        <div className="mt-0.5 truncate text-xs text-subtle">
          {file.name} · {formatFileSize(file.size)}
        </div>
      </div>
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary hidden sm:inline-flex"
      >
        <ExternalLink size={14} /> Open
      </a>
      <a href={file.url} download className="btn-secondary">
        <Download size={14} /> Download
      </a>
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel-2",
        compact ? "h-full" : "min-h-[520px]",
        className
      )}
    >
      {header}
      <div className="min-h-0 flex-1 overflow-auto bg-[#060a14]">
        {file.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={title || file.name}
            className="mx-auto block h-full max-h-full max-w-full object-contain"
          />
        ) : file.kind === "video" ? (
          <video src={file.url} controls className="h-full w-full bg-black object-contain" />
        ) : file.kind === "audio" ? (
          <div className="flex h-full items-center justify-center p-8">
            <audio src={file.url} controls className="w-full max-w-xl" />
          </div>
        ) : file.kind === "pdf" ? (
          <iframe
            src={file.url}
            title={title || file.name}
            className="h-full min-h-[420px] w-full border-0"
          />
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center p-6 text-center">
            <div className="max-w-sm rounded-2xl border border-line bg-panel p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <KindIcon kind={file.kind} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink">{file.name}</h3>
              <p className="mt-2 text-sm text-muted">
                Preview is not available for this file type yet. Open or download
                the original file.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <ExternalLink size={14} /> Open
                </a>
                <a href={file.url} download className="btn-secondary">
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
