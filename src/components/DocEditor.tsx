"use client";

import { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Code2,
  Eye,
  Trash2,
  Check,
  Loader2,
  X,
  Lightbulb,
  Clock,
  Copy,
  Upload,
  ImageIcon,
  FileText,
} from "lucide-react";
import type { DocStatus } from "@/lib/types";
import IconPicker from "./IconPicker";
import StatusSelect from "./StatusSelect";
import HtmlSourceEditor from "./HtmlSourceEditor";
import { HTML_GEN_PROMPT } from "@/lib/html-gen-prompt";
import { cn, timeAgo } from "@/lib/utils";
import { prepareIframeHtml } from "@/lib/iframe-html";
import { confirmAction, toast } from "@/lib/ui-feedback";

const FILE_IMPORT_ENABLED = false;

type EditTab = "source" | "preview";
type ImportMode = "source" | "file";
type ImportPhase = "idle" | "loading" | "success" | "error";

function isHtmlFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".html") || lower.endsWith(".htm");
}

function isTextSource(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".markdown") ||
    lower.endsWith(".txt")
  );
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

interface Props {
  title: string;
  subtitle: string;
  icon: string;
  status: DocStatus;
  tags: string[];
  content: string;
  updatedAt: string;
  saving: boolean;
  onTitle: (v: string) => void;
  onSubtitle: (v: string) => void;
  onIcon: (v: string) => void;
  onStatus: (v: DocStatus) => void;
  onTags: (v: string[]) => void;
  onContent: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function DocEditor({
  title,
  subtitle,
  icon,
  status,
  tags,
  content,
  updatedAt,
  saving,
  onTitle,
  onSubtitle,
  onIcon,
  onStatus,
  onTags,
  onContent,
  onCancel,
  onSave,
}: Props) {
  const [tab, setTab] = useState<EditTab>("source");
  const [importMode, setImportMode] = useState<ImportMode>("source");
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importMessage, setImportMessage] = useState("");
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [wrap, setWrap] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const tagLock = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewHtml = useMemo(() => prepareIframeHtml(content), [content]);

  function normalizeTag(raw: string) {
    return raw.trim().replace(/^#/, "");
  }

  function addTagsFromRaw(raw: string) {
    const parts = raw
      .split(",")
      .map(normalizeTag)
      .filter(Boolean);
    if (!parts.length) return;

    const next = [...tags];
    let changed = false;
    for (const t of parts) {
      if (!next.includes(t)) {
        next.push(t);
        changed = true;
      }
    }
    if (!changed) return;
    onTags(next);
    setTagInput("");
  }

  function commitTagInput() {
    if (tagLock.current) return;
    tagLock.current = true;
    addTagsFromRaw(tagInput);
    requestAnimationFrame(() => {
      tagLock.current = false;
    });
  }

  function removeTag(t: string) {
    onTags(tags.filter((x) => x !== t));
  }

  async function runImport(files: File[]) {
    if (!files.length) return;

    setImportPhase("loading");
    setImportMessage("Processing…");

    const htmlFiles = files.filter((f) => isHtmlFile(f.name));
    const textFiles = files.filter((f) => isTextSource(f.name));
    const images = files.filter(isImageFile);
    const needsAi = textFiles.length > 0 || images.length > 0;

    if (!needsAi && htmlFiles.length > 0) {
      try {
        let html = await htmlFiles[0].text();
        if (/<html[\s>]/i.test(html)) {
          const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (match) html = match[1];
        }
        onContent(content.trim() ? `${content}\n${html}` : html);
        setImportPhase("success");
        setImportMessage("HTML imported successfully!");
        setImportMode("file");
        setTab("preview");
      } catch {
        setImportPhase("error");
        setImportMessage("Couldn't read HTML file.");
      }
      return;
    }

    if (!needsAi) {
      setImportPhase("error");
      setImportMessage("Choose a .html, .md, .txt, or reference image file.");
      return;
    }

    setImportMessage("AI is analyzing and generating HTML… (30–90s)");

    try {
      let source = "";
      if (textFiles.length) {
        const parts = await Promise.all(
          textFiles.map(async (f) => {
            const text = await f.text();
            return textFiles.length > 1 ? `### ${f.name}\n\n${text}` : text;
          })
        );
        source = parts.join("\n\n");
      }

      const imagePayload = await Promise.all(
        images.slice(0, 6).map(async (img) => ({
          name: img.name,
          mimeType: img.type,
          dataUrl: await readDataUrl(img),
        }))
      );

      const res = await fetch("/api/generate/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          filename: textFiles[0]?.name ?? images[0]?.name,
          title: title.trim() || undefined,
          images: imagePayload,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Couldn't generate HTML."
        );
      }
      if (typeof data.html !== "string" || !data.html.trim()) {
        throw new Error("AI didn't return valid HTML.");
      }

      onContent(data.html);
      setImportPhase("success");
      setImportMessage("HTML generated successfully!");
      setImportMode("file");
      setTab("preview");
    } catch (e) {
      setImportPhase("error");
      setImportMessage(
        e instanceof Error ? e.message : "Couldn't generate HTML."
      );
    }
  }

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list?.length || importPhase === "loading") return;

    const files = Array.from(list);
    setPickedFiles(files);
    setImportMode("file");

    const previews: Record<string, string> = {};
    for (const f of files) {
      if (isImageFile(f)) {
        previews[`${f.name}-${f.size}`] = await readDataUrl(f);
      }
    }
    setImagePreviews(previews);

    await runImport(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  function copyHtmlPrompt() {
    navigator.clipboard.writeText(HTML_GEN_PROMPT);
    toast.success("HTML prompt copied");
  }

  const tabs: { id: EditTab; label: string; icon: typeof Code2 }[] = [
    { id: "source", label: "HTML Source", icon: Code2 },
    { id: "preview", label: "Preview", icon: Eye },
  ];

  function renderEditorBody(className?: string) {
    if (tab === "source") {
      return (
        <HtmlSourceEditor
          value={content}
          onChange={onContent}
          wrap={wrap}
          className={className}
          placeholder="<header>&#10;  <h1>Title</h1>&#10;</header>"
        />
      );
    }

    return (
      <div className={cn("relative overflow-hidden bg-panel-2", className)}>
        {content.trim() ? (
          <iframe
            title="Preview"
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-popups allow-forms allow-modals"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-center text-sm text-subtle">
              No content yet — paste HTML or import a file.
            </p>
          </div>
        )}
      </div>
    );
  }

  const importOptions: {
    id: ImportMode;
    title: string;
    desc: string;
  }[] = [
    {
      id: "source",
      title: "HTML Source",
      desc: "Paste HTML directly into the editor",
    },
    ...(FILE_IMPORT_ENABLED
      ? [
          {
            id: "file" as const,
            title: "Import file",
            desc: "Direct HTML · .md/.txt/images → AI",
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-canvas">
      {/* Page header */}
      <div className="shrink-0 px-6 pb-4 pt-5">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles size={18} className="shrink-0 text-brand" />
          <h1 className="truncate text-xl font-bold text-ink">
            {title.trim() || "Untitled"}
          </h1>
        </div>
        <p className="text-sm text-muted">
          Edit HTML source, or import files and images from the panel on the right.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-5 px-6 pb-6">
        {/* Main column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {/* Meta card */}
          <div className="rounded-2xl border border-line bg-panel p-5 shadow-[var(--shadow-sm)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-subtle">
                  Title
                </label>
                <div className="flex items-center gap-2.5">
                  <IconPicker value={icon} onChange={onIcon} />
                  <input
                    value={title}
                    onChange={(e) => onTitle(e.target.value)}
                    placeholder="Document title…"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-subtle">
                  Status
                </label>
                <StatusSelect value={status} onChange={onStatus} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-subtle">
                  Subtitle
                </label>
                <input
                  value={subtitle}
                  onChange={(e) => onSubtitle(e.target.value)}
                  placeholder="Short description…"
                  className="w-full rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-subtle">
                  Tags
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel-2 px-2.5 py-1 text-xs font-medium text-muted"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="text-subtle hover:text-rose-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(",")) {
                        const idx = val.indexOf(",");
                        addTagsFromRaw(val.slice(0, idx));
                        setTagInput(val.slice(idx + 1));
                        return;
                      }
                      setTagInput(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || e.repeat) return;
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        commitTagInput();
                      }
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="+ Add tag"
                    className="min-w-[100px] flex-1 rounded-lg border border-dashed border-line bg-transparent px-2 py-1 text-xs text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 text-right text-xs text-subtle">
              Last saved: {timeAgo(updatedAt)}
            </p>
          </div>

          {/* Editor card */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-sm)]">
            {/* Tabs */}
            <div className="flex shrink-0 items-center gap-1 border-b border-line px-3 pt-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition",
                    tab === id ? "text-brand" : "text-muted hover:text-ink"
                  )}
                >
                  <Icon size={15} />
                  {label}
                  {tab === id && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
                  )}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2 pb-1 pr-1">
                {tab === "source" && (
                  <button
                    type="button"
                    onClick={copyHtmlPrompt}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-panel px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-panel-hover hover:text-ink"
                    title="Copy prompt for AI-generated HTML"
                  >
                    <Copy size={12} />
                    Copy prompt
                  </button>
                )}
                {tab === "source" && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                    <span>Wrap</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={wrap}
                      onClick={() => setWrap((w) => !w)}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition",
                        wrap ? "bg-brand" : "bg-line"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                          wrap ? "left-[18px]" : "left-0.5"
                        )}
                      />
                    </button>
                  </label>
                )}
                {tab === "source" && (
                  <span className="rounded-lg border border-line bg-panel-2 px-2 py-1 text-[11px] font-medium text-muted">
                    HTML
                  </span>
                )}
              </div>
            </div>

            {/* Editor body — grows to fill viewport; CodeMirror scrolls internally */}
            <div className="min-h-[420px] flex-1 overflow-hidden">
              {renderEditorBody("h-full")}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-subtle">
                <Clock size={14} />
                Last saved: {timeAgo(updatedAt)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!content.trim()) return;
                    const ok = await confirmAction({
                      title: "Clear content",
                      message:
                        "Clear all HTML in the editor? Unsaved changes will be lost.",
                      confirmLabel: "Delete",
                      cancelLabel: "Cancel",
                      danger: true,
                    });
                    if (ok) {
                      onContent("");
                      toast.success("Content cleared");
                    }
                  }}
                  className="btn-secondary"
                >
                  <Trash2 size={14} /> Clear
                </button>
                <button type="button" onClick={onCancel} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="hidden w-[280px] shrink-0 space-y-4 xl:block">
          <div className="rounded-2xl border border-line bg-panel p-4 shadow-[var(--shadow-sm)]">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-ink">Import options</h2>
            </div>
            <div className="space-y-2">
              {importOptions.map((opt) => {
                const active = importMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setImportMode(opt.id);
                      if (opt.id === "source") setTab("source");
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                      active
                        ? "border-brand bg-brand-soft"
                        : "border-line bg-panel-2 hover:border-line-strong hover:bg-panel-hover"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-line bg-panel"
                      )}
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        {opt.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-subtle">
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {FILE_IMPORT_ENABLED && importMode === "file" && (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <button
                  type="button"
                  disabled={importPhase === "loading"}
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-panel-2 px-3 py-3 text-sm font-medium text-ink transition hover:border-brand/50 hover:bg-brand-soft disabled:opacity-60"
                >
                  {importPhase === "loading" ? (
                    <Loader2 size={16} className="animate-spin text-brand" />
                  ) : (
                    <Upload size={16} className="text-brand" />
                  )}
                  Choose file or image
                </button>

                {pickedFiles.length > 0 && (
                  <ul className="space-y-1.5">
                    {pickedFiles.map((f) => {
                      const key = `${f.name}-${f.size}`;
                      const preview = imagePreviews[key];
                      return (
                        <li
                          key={key}
                          className="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-[11px] text-muted"
                        >
                          {preview ? (
                            <img
                              src={preview}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded object-cover"
                            />
                          ) : isTextSource(f.name) ? (
                            <FileText size={14} className="shrink-0 text-brand" />
                          ) : (
                            <ImageIcon size={14} className="shrink-0 text-brand" />
                          )}
                          <span className="truncate">{f.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {importPhase !== "idle" && (
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
                      importPhase === "loading" &&
                        "border-brand/30 bg-brand-soft text-brand",
                      importPhase === "success" &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
                      importPhase === "error" &&
                        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                    )}
                  >
                    {importPhase === "loading" && (
                      <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" />
                    )}
                    {importPhase === "success" && (
                      <Check size={14} className="mt-0.5 shrink-0" strokeWidth={2.5} />
                    )}
                    {importPhase === "error" && (
                      <X size={14} className="mt-0.5 shrink-0" />
                    )}
                    <span>{importMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 shadow-[var(--shadow-sm)]">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-ink">Tips</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                "Paste HTML directly in the HTML Source tab",
                "Use Copy prompt to generate HTML with external AI",
                "Preview before saving",
                "Embed CSS/JS in a single HTML file",
              ].map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-xs leading-relaxed text-muted"
                >
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-brand"
                    strokeWidth={2.5}
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".html,.htm,.md,.markdown,.txt,image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={pickFiles}
        className="hidden"
      />
    </div>
  );
}
