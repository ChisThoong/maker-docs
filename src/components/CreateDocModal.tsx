"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Loader2, X, Film } from "lucide-react";
import {
  DEFAULT_TEMPLATE_KEY,
  TEMPLATES,
  type Template,
} from "@/lib/templates";
import { useDocs } from "./DocsProvider";
import DocIcon from "./DocIcon";
import { cn } from "@/lib/utils";
import { uploadFile, uploadSpineBundle } from "@/lib/upload";
import {
  iconForFileKind,
  makeFileMeta,
  titleFromFilename,
  formatFileSize,
} from "@/lib/file-content";
import type { DocFileMeta } from "@/lib/types";
import type { SpineBundleMeta } from "@/lib/types";
import { spineTitleFromFiles, validateSpineFiles } from "@/lib/spine-content";

interface CreateState {
  open: boolean;
  parentId: string | null;
  parentTitle?: string;
  template?: Template["key"];
}

let state: CreateState = { open: false, parentId: null };
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function openCreate(opts?: {
  parentId?: string | null;
  parentTitle?: string;
  template?: Template["key"];
}) {
  state = {
    open: true,
    parentId: opts?.parentId ?? null,
    parentTitle: opts?.parentTitle,
    template: opts?.template,
  };
  emit();
}
function close() {
  state = { ...state, open: false };
  emit();
}
const SERVER_SNAPSHOT: CreateState = { open: false, parentId: null };
function useCreateState(): CreateState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER_SNAPSHOT
  );
}

export default function CreateDocModal() {
  const { open, parentId, parentTitle, template } = useCreateState();
  const { create } = useDocs();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Template["key"] | "file" | "spine">(DEFAULT_TEMPLATE_KEY);
  const [busy, setBusy] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [spineFiles, setSpineFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setKind(template ?? DEFAULT_TEMPLATE_KEY);
      setPickedFile(null);
      setSpineFiles([]);
      setFileErr(null);
    }
  }, [open, template]);

  const selected =
    kind === "file" ? null : TEMPLATES.find((t) => t.key === kind) ?? TEMPLATES[1];

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    setFileErr(null);
    setPickedFile(file);
    if (file && !title.trim()) setTitle(titleFromFilename(file.name));
  }

  function onPickSpineFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setFileErr(validateSpineFiles(files));
    setSpineFiles(files);
    if (files.length && !title.trim()) setTitle(spineTitleFromFiles(files));
  }

  async function handleCreate() {
    if (busy) return;
    setBusy(true);
    let fileMeta: DocFileMeta | null = null;
    let spineMeta: SpineBundleMeta | null = null;
    if (kind === "file") {
      if (!pickedFile) {
        setFileErr("Choose a file to upload.");
        setBusy(false);
        return;
      }
      try {
        const url = await uploadFile(pickedFile);
        fileMeta = makeFileMeta(pickedFile, url);
      } catch (e) {
        setFileErr(e instanceof Error ? e.message : "Upload failed");
        setBusy(false);
        return;
      }
    }
    if (kind === "spine") {
      const validation = validateSpineFiles(spineFiles);
      if (validation) {
        setFileErr(validation);
        setBusy(false);
        return;
      }
      try {
        const bundle = await uploadSpineBundle(spineFiles);
        spineMeta = {
          ...bundle,
          name: title.trim() || spineTitleFromFiles(spineFiles),
        };
      } catch (e) {
        setFileErr(e instanceof Error ? e.message : "Spine bundle upload failed");
        setBusy(false);
        return;
      }
    }

    const doc = await create({
      title:
        title.trim() ||
        (kind === "file" && pickedFile
          ? titleFromFilename(pickedFile.name)
          : kind === "spine"
            ? spineTitleFromFiles(spineFiles)
            : selected?.label),
      type: selected?.type ?? "doc",
      icon: spineMeta ? "lucide:film" : fileMeta ? iconForFileKind(fileMeta.kind) : selected?.icon,
      content: spineMeta?.jsonUrl ?? fileMeta?.url ?? selected?.content,
      contentMode: spineMeta ? "spine" : fileMeta ? "file" : "html",
      file: fileMeta,
      spine: spineMeta,
      parentId,
    });
    setBusy(false);
    close();
    if (doc) router.push(`/doc/${doc.id}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm dark:bg-black/50"
            onClick={close}
          />
          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Create new</h2>
                {parentTitle && (
                  <p className="mt-0.5 text-xs text-subtle">Inside: {parentTitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                className="btn-secondary btn-secondary-icon"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Name
              </label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder={
                  kind === "folder"
                    ? "e.g. Design, Features, Assets…"
                    : kind === "file"
                      ? "Defaults to uploaded file name"
                      : kind === "spine"
                        ? "Defaults to Spine JSON name"
                    : "e.g. Drop Simulator, Character Spec…"
                }
                className="mb-4 w-full rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-panel focus:ring-4 focus:ring-[var(--ring)]"
              />

              <label className="mb-1.5 block text-xs font-medium text-muted">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setKind(t.key)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition",
                      kind === t.key
                        ? "border-brand bg-brand-soft ring-2 ring-[var(--ring)]"
                        : "border-line bg-panel hover:border-line-strong hover:bg-panel-hover"
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-2 text-muted">
                      <DocIcon icon={t.icon} size={18} />
                    </span>
                    <span className="text-sm font-medium text-ink">{t.label}</span>
                    <span className="text-[11px] leading-snug text-subtle">
                      {t.description}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setKind("file")}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition",
                    kind === "file"
                      ? "border-brand bg-brand-soft ring-2 ring-[var(--ring)]"
                      : "border-line bg-panel hover:border-line-strong hover:bg-panel-hover"
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-2 text-muted">
                    <FileUp size={18} />
                  </span>
                  <span className="text-sm font-medium text-ink">File upload</span>
                  <span className="text-[11px] leading-snug text-subtle">
                    PDF, image, video, Word, Excel, PPT
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setKind("spine")}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition",
                    kind === "spine"
                      ? "border-brand bg-brand-soft ring-2 ring-[var(--ring)]"
                      : "border-line bg-panel hover:border-line-strong hover:bg-panel-hover"
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-2 text-muted">
                    <Film size={18} />
                  </span>
                  <span className="text-sm font-medium text-ink">Spine Bundle</span>
                  <span className="text-[11px] leading-snug text-subtle">
                    Upload .json/.atlas/textures and preview animation
                  </span>
                </button>
              </div>
              {kind === "file" && (
                <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-panel-2 p-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-panel px-3 py-2 text-sm font-medium text-ink transition hover:bg-panel-hover">
                    <FileUp size={15} className="text-brand" />
                    Choose file
                    <input
                      type="file"
                      className="hidden"
                      onChange={onPickFile}
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                  </label>
                  {pickedFile && (
                    <div className="mt-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs">
                      <div className="truncate font-medium text-ink">{pickedFile.name}</div>
                      <div className="mt-0.5 text-subtle">
                        {pickedFile.type || "Unknown type"} · {formatFileSize(pickedFile.size)}
                      </div>
                    </div>
                  )}
                  {fileErr && <p className="mt-2 text-xs text-rose-500">{fileErr}</p>}
                </div>
              )}
              {kind === "spine" && (
                <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-panel-2 p-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-panel px-3 py-2 text-sm font-medium text-ink transition hover:bg-panel-hover">
                    <Film size={15} className="text-brand" />
                    Choose Spine files
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={onPickSpineFiles}
                      accept=".json,.skel,.atlas,image/png,image/webp,image/jpeg"
                    />
                  </label>
                  {spineFiles.length > 0 && (
                    <div className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-line bg-panel px-3 py-2 text-xs">
                      {spineFiles.map((f) => (
                        <div key={`${f.name}-${f.size}`} className="flex justify-between gap-2">
                          <span className="truncate text-ink">{f.name}</span>
                          <span className="shrink-0 text-subtle">{formatFileSize(f.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {fileErr && <p className="mt-2 text-xs text-rose-500">{fileErr}</p>}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line bg-panel-2 px-5 py-3.5">
              <button type="button" onClick={close} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy}
                className="btn-primary"
              >
                {busy ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    {kind === "file" || kind === "spine" ? "Uploading…" : "Creating…"}
                  </>
                ) : kind === "folder"
                    ? "Create folder"
                    : kind === "file"
                      ? "Upload file"
                      : kind === "spine"
                        ? "Upload Spine"
                      : "Create document"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
