"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  DEFAULT_TEMPLATE_KEY,
  TEMPLATES,
  type Template,
} from "@/lib/templates";
import { useDocs } from "./DocsProvider";
import DocIcon from "./DocIcon";
import { cn } from "@/lib/utils";

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
  const [kind, setKind] = useState<Template["key"]>(DEFAULT_TEMPLATE_KEY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setKind(template ?? DEFAULT_TEMPLATE_KEY);
    }
  }, [open, template]);

  const selected = TEMPLATES.find((t) => t.key === kind) ?? TEMPLATES[1];

  async function handleCreate() {
    setBusy(true);
    const doc = await create({
      title: title.trim() || selected.label,
      type: selected.type,
      icon: selected.icon,
      content: selected.content,
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
              </div>
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
                {busy
                  ? "Creating…"
                  : kind === "folder"
                    ? "Create folder"
                    : "Create document"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
