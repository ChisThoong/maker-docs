"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Link2,
  ChevronRight,
  ChevronLeft,
  Star,
  Share2,
  Lock,
} from "lucide-react";
import type { Doc, DocMeta } from "@/lib/types";
import { TYPE_META } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";
import DocIcon, { isImage } from "./DocIcon";
import StatusBadge from "./StatusBadge";
import DocContentFrame from "./DocContentFrame";
import FilePreview from "./FilePreview";
import SpinePreview from "./SpinePreview";
import { cn, timeAgo } from "@/lib/utils";

interface DocAccess {
  canEdit: boolean;
  canManagePerms: boolean;
}

interface Props {
  doc: Doc;
  breadcrumb: DocMeta[];
  access: DocAccess | null;
  isFav: boolean;
  copied: boolean;
  onToggleFavorite: () => void;
  onCopyLink: () => void;
  onShare: () => void;
  onEdit: () => void;
}

const toolbarBtn = "btn-secondary";
const toolbarBtnIcon = "btn-secondary btn-secondary-icon";
const toolbarBtnPrimary = "btn-primary";

export default function DocReadView({
  doc,
  breadcrumb,
  access,
  isFav,
  copied,
  onToggleFavorite,
  onCopyLink,
  onShare,
  onEdit,
}: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("");
  const parentDoc = breadcrumb.at(-1);
  const isPreviewDoc =
    doc.contentMode === "html" ||
    doc.contentMode === "url" ||
    doc.contentMode === "file" ||
    doc.contentMode === "spine";
  const imageIcon = isImage(doc.icon);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (parentDoc) {
      router.push(`/doc/${parentDoc.id}`);
      return;
    }
    router.push("/");
  }

  const renderedHtml = useMemo(() => {
    if (isPreviewDoc) return "";
    const clean = sanitizeHtml(doc.content ?? "");
    if (typeof window === "undefined") return clean;
    const div = document.createElement("div");
    div.innerHTML = clean;
    div.querySelectorAll("h2, h3").forEach((el, i) => {
      el.id = `sec-${i}`;
    });
    return div.innerHTML;
  }, [doc.content, isPreviewDoc]);

  const toc = useMemo(() => {
    if (isPreviewDoc) return [];
    if (typeof window === "undefined") return [];
    const div = document.createElement("div");
    div.innerHTML = sanitizeHtml(doc.content ?? "");
    return Array.from(div.querySelectorAll("h2, h3")).map((el, i) => ({
      id: `sec-${i}`,
      text: el.textContent ?? "",
      level: el.tagName === "H3" ? 3 : 2,
    }));
  }, [doc.content, isPreviewDoc]);

  useEffect(() => {
    if (!toc.length) return;
    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter(Boolean) as HTMLElement[];
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc, renderedHtml]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div className="glass sticky top-0 z-20 flex items-center gap-2 border-b border-line px-6 py-2.5">
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-subtle">
          <Link href="/" className="shrink-0 transition hover:text-ink">
            Home
          </Link>
          {breadcrumb.map((b) => (
            <span key={b.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight size={14} className="shrink-0" />
              <Link
                href={`/doc/${b.id}`}
                className="truncate transition hover:text-ink"
              >
                {b.title}
              </Link>
            </span>
          ))}
          <ChevronRight size={14} className="shrink-0" />
          <span className="truncate font-medium text-ink">{doc.title}</span>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleFavorite}
            className={cn(
              toolbarBtnIcon,
              isFav && "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/15 hover:text-amber-500"
            )}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={14} fill={isFav ? "currentColor" : "none"} />
          </button>

          <button type="button" onClick={onCopyLink} className={toolbarBtn}>
            <Link2 size={14} /> {copied ? "Copied!" : "Link"}
          </button>

          {doc.visibility === "restricted" && (
            <span className="btn-secondary hidden text-xs text-amber-600 sm:inline-flex dark:text-amber-400">
              <Lock size={14} /> Restricted
            </span>
          )}

          {access?.canManagePerms && (
            <button type="button" onClick={onShare} className={toolbarBtn}>
              <Share2 size={14} /> Share
            </button>
          )}

          {access?.canEdit && (
            <button type="button" onClick={onEdit} className={toolbarBtnPrimary}>
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "min-h-0 flex-1",
          isPreviewDoc ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        <div
          className={cn(
            "doc-view flex w-full max-w-[1400px] gap-10 px-6 lg:gap-14",
            isPreviewDoc ? "h-full min-h-0 py-6" : "py-8"
          )}
        >
          <article
            className={cn(
              "min-w-0 flex-1",
              isPreviewDoc && "flex min-h-0 flex-col"
            )}
          >
            {/* Doc header */}
            <header
              className={cn(
                "doc-view-header animate-fade-up",
                isPreviewDoc && "shrink-0"
              )}
            >
              <button
                type="button"
                onClick={goBack}
                className="mb-4 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-muted transition hover:bg-panel-hover hover:text-ink"
              >
                <ChevronLeft size={16} className="shrink-0" />
                {parentDoc ? parentDoc.title : "Back"}
              </button>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-ink ring-1 ring-line",
                    imageIcon && "overflow-hidden !rounded-lg p-0"
                  )}
                >
                  <DocIcon
                    icon={doc.icon}
                    fallback={TYPE_META[doc.type].icon}
                    size={imageIcon ? 44 : 22}
                    className={imageIcon ? "!rounded-lg" : undefined}
                  />
                </span>
                <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
                  {doc.title}
                </h1>
              </div>

              {doc.subtitle && (
                <p className="mt-2 text-[15px] text-muted">{doc.subtitle}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-5">
                <StatusBadge status={doc.status} />
                <span className="inline-flex items-center rounded-full bg-panel-2 px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-inset ring-line">
                  {TYPE_META[doc.type].label}
                </span>
                {doc.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-panel-2 px-2.5 py-1 text-xs text-subtle ring-1 ring-inset ring-line"
                  >
                    #{t}
                  </span>
                ))}
                <span className="ml-auto text-xs text-subtle">
                  Updated {timeAgo(doc.updatedAt)}
                </span>
              </div>
            </header>

            {/* Content */}
            {doc.contentMode === "spine" ? (
              doc.spine ? (
                <div className="doc-view-content mt-5 min-h-0 flex-1 animate-fade-up overflow-hidden">
                  <SpinePreview
                    spine={doc.spine}
                    title={doc.title}
                    compact
                    className="h-full min-h-0"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center text-subtle">
                  Spine bundle metadata is missing. Click{" "}
                  <button
                    type="button"
                    onClick={onEdit}
                    className="font-medium text-brand hover:underline"
                  >
                    Edit
                  </button>{" "}
                  to replace the bundle.
                </div>
              )
            ) : doc.contentMode === "file" ? (
              doc.file ? (
                <div className="doc-view-content mt-5 min-h-0 flex-1 animate-fade-up overflow-hidden">
                  <FilePreview
                    file={doc.file}
                    title={doc.title}
                    compact
                    className="h-full min-h-0"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center text-subtle">
                  File metadata is missing. Click{" "}
                  <button
                    type="button"
                    onClick={onEdit}
                    className="font-medium text-brand hover:underline"
                  >
                    Edit
                  </button>{" "}
                  to replace the file.
                </div>
              )
            ) : isPreviewDoc ? (
              doc.content?.trim() ? (
                <div className="doc-view-content mt-5 min-h-0 flex-1 animate-fade-up overflow-hidden rounded-2xl border border-line">
                  <DocContentFrame
                    content={doc.content}
                    contentMode={doc.contentMode}
                    title={doc.title}
                    showUrlBar={doc.contentMode === "url"}
                    fill
                    className="h-full min-h-0"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center text-subtle">
                  No URL set. Click{" "}
                  <button
                    type="button"
                    onClick={onEdit}
                    className="font-medium text-brand hover:underline"
                  >
                    Edit
                  </button>{" "}
                  {doc.contentMode === "url"
                    ? "to add a deployed link."
                    : "to paste HTML."}
                </div>
              )
            ) : doc.content?.trim() ? (
              <div
                className="doc-content doc-view-content animate-fade-up"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-10 text-center text-subtle">
                This document is empty. Click{" "}
                <button
                  type="button"
                  onClick={onEdit}
                  className="font-medium text-brand hover:underline"
                >
                  Edit
                </button>{" "}
                to paste HTML or import a file.
              </div>
            )}
          </article>

          {/* TOC */}
          {toc.length > 0 && (
            <aside className="doc-view-toc hidden w-56 shrink-0 xl:block">
              <div className="sticky top-[4.5rem]">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">
                  On this page
                </div>
                <nav className="space-y-0.5 border-l border-line">
                  {toc.map((t) => (
                    <a
                      key={t.id}
                      href={`#${t.id}`}
                      onClick={() => setActiveSection(t.id)}
                      className={cn(
                        "block border-l-2 py-1.5 text-[13px] leading-snug transition",
                        t.level === 3 ? "pl-5" : "pl-3.5",
                        activeSection === t.id
                          ? "border-brand font-medium text-brand"
                          : "border-transparent text-muted hover:border-brand/40 hover:text-ink"
                      )}
                    >
                      {t.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
