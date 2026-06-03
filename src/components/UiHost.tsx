"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import {
  dismissToast,
  getConfirmSnapshot,
  getToastsServerSnapshot,
  getToastsSnapshot,
  resolveConfirm,
  subscribeUi,
  type ToastVariant,
} from "@/lib/ui-feedback";
import { cn } from "@/lib/utils";

const TOAST_META: Record<
  ToastVariant,
  { icon: typeof Info; ring: string; bg: string; text: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: "border-emerald-200 dark:border-emerald-500/30",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-800 dark:text-emerald-300",
  },
  error: {
    icon: XCircle,
    ring: "border-rose-200 dark:border-rose-500/30",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-800 dark:text-rose-300",
  },
  warning: {
    icon: AlertTriangle,
    ring: "border-amber-200 dark:border-amber-500/30",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-900 dark:text-amber-300",
  },
  info: {
    icon: Info,
    ring: "border-brand/25",
    bg: "bg-brand-soft",
    text: "text-brand",
  },
};

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function ToastStack() {
  const mounted = useMounted();
  const items = useSyncExternalStore(
    subscribeUi,
    getToastsSnapshot,
    getToastsServerSnapshot
  );

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[min(100vw-2rem,380px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const meta = TOAST_META[t.variant];
          const Icon = meta.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur-sm",
                meta.ring,
                meta.bg
              )}
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", meta.text)} />
              <p className={cn("min-w-0 flex-1 text-sm leading-snug", meta.text)}>
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className={cn(
                  "shrink-0 rounded-lg p-1 opacity-70 transition hover:opacity-100",
                  meta.text
                )}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}

function ConfirmDialog() {
  const mounted = useMounted();
  const confirm = useSyncExternalStore(subscribeUi, getConfirmSnapshot, () => null);

  useEffect(() => {
    if (!confirm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") resolveConfirm(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {confirm && (
        <motion.div
          key={confirm.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) resolveConfirm(false);
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-[var(--shadow-lg)]"
          >
            <h2
              id="confirm-title"
              className="text-lg font-semibold tracking-tight text-ink"
            >
              {confirm.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {confirm.message}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="btn-secondary"
              >
                {confirm.cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => resolveConfirm(true)}
                className={cn(
                  confirm.danger
                    ? "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 dark:border-rose-500/40"
                    : "btn-primary"
                )}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Global toast stack + confirm dialog — mount once in AppShell. */
export default function UiHost() {
  return (
    <>
      <ToastStack />
      <ConfirmDialog />
    </>
  );
}
