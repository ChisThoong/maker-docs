"use client";

import { Download, ExternalLink, Film } from "lucide-react";
import type { SpineBundleMeta } from "@/lib/types";
import { formatFileSize } from "@/lib/file-content";
import { spinePlayerHtml } from "@/lib/spine-content";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

export default function SpinePreview({
  spine,
  title,
  className,
  compact = false,
}: {
  spine: SpineBundleMeta;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel-2",
        compact ? "h-full" : "min-h-[520px]",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Film size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">
            {title || spine.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-subtle">
            Spine bundle · {spine.files.length} files ·{" "}
            {formatFileSize(spine.files.reduce((sum, f) => sum + f.size, 0))}
          </div>
        </div>
        <a
          href={spine.jsonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary hidden sm:inline-flex"
        >
          <ExternalLink size={14} /> JSON
        </a>
        <a href={spine.atlasUrl} download className="btn-secondary">
          <Download size={14} /> Atlas
        </a>
      </div>
      <iframe
        title={title || spine.name}
        srcDoc={spinePlayerHtml(spine, resolvedTheme)}
        sandbox="allow-scripts allow-same-origin"
        className="min-h-0 flex-1 border-0 bg-slate-50 dark:bg-[#060a14]"
      />
    </div>
  );
}
