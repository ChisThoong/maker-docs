"use client";

import { ExternalLink } from "lucide-react";
import type { ContentMode } from "@/lib/types";
import {
  DOC_IFRAME_SANDBOX,
  externalEmbedSrc,
  normalizeExternalUrl,
  resolveDocEmbed,
} from "@/lib/content-embed";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  contentMode?: ContentMode;
  title?: string;
  className?: string;
  /** Fill a flex parent (editor preview, hub read view). */
  fill?: boolean;
  /** Standalone reader — fixed full viewport. */
  viewport?: boolean;
  showUrlBar?: boolean;
}

export default function DocContentFrame({
  content,
  contentMode = "html",
  title = "Preview",
  className,
  fill = false,
  viewport = false,
  showUrlBar = false,
}: Props) {
  const embed = resolveDocEmbed({ contentMode, content });
  const url = contentMode === "url" ? normalizeExternalUrl(content) : null;

  const emptyClass = cn(
    "flex items-center justify-center p-6 text-center text-sm text-subtle",
    viewport && "h-[100dvh] w-full",
    fill && "h-full w-full",
    !viewport && !fill && "min-h-[240px]",
    className
  );

  if (contentMode === "url" && !url) {
    return (
      <div className={emptyClass}>
        Enter a valid https:// URL to preview the deployed page.
      </div>
    );
  }

  if (!content.trim() && contentMode !== "url") {
    return <div className={emptyClass}>No content yet.</div>;
  }

  const shellClass = cn(
    "overflow-hidden bg-panel-2",
    viewport && "fixed inset-0 z-0 h-[100dvh] w-full",
    fill && !viewport && "flex h-full min-h-0 w-full flex-col",
    !viewport && !fill && "flex min-h-[420px] w-full flex-col",
    showUrlBar && url && "rounded-xl",
    className
  );

  return (
    <div className={shellClass}>
      {showUrlBar && url && (
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">
            {url}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-panel-2 px-2 py-1 text-[11px] font-medium text-muted transition hover:text-brand"
          >
            <ExternalLink size={12} />
            Open
          </a>
        </div>
      )}
      <iframe
        title={title}
        {...(embed.kind === "url"
          ? { src: externalEmbedSrc(embed.url) }
          : { srcDoc: embed.html })}
        sandbox={DOC_IFRAME_SANDBOX}
        className={cn(
          "block min-h-0 w-full flex-1",
          "border-0"
        )}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          colorScheme: "dark",
        }}
      />
    </div>
  );
}
