"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, FileText } from "lucide-react";
import { useDocs } from "./DocsProvider";
import DocIcon from "./DocIcon";
import StatusBadge from "./StatusBadge";
import { TYPE_META } from "@/lib/types";
import { cn } from "@/lib/utils";

let open = false;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
export function openCommand() {
  open = true;
  emit();
}
function setOpen(v: boolean) {
  open = v;
  emit();
}
function useCommandOpen() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => open,
    () => false
  );
}

export default function CommandPalette() {
  const isOpen = useCommandOpen();
  const { docs } = useDocs();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? docs.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.tags.some((t) => t.toLowerCase().includes(q))
        )
      : docs;
    return list.slice(0, 8);
  }, [query, docs]);

  function go(id: string) {
    setOpen(false);
    router.push(`/doc/${id}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      go(results[active].id);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm dark:bg-black/50"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
            initial={{ scale: 0.97, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search documents, tags…"
                className="w-full bg-transparent py-4 text-[15px] text-ink outline-none placeholder:text-subtle"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-subtle">
                ESC
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-subtle">
                  <FileText size={22} />
                  <span className="text-sm">No documents found</span>
                </div>
              ) : (
                results.map((d, i) => (
                  <button
                    key={d.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(d.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      i === active ? "bg-brand-soft" : "hover:bg-panel-hover"
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-2 text-muted">
                      <DocIcon
                        icon={d.icon}
                        fallback={TYPE_META[d.type].icon}
                        size={16}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {d.title}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {TYPE_META[d.type].label}
                      </span>
                    </span>
                    <StatusBadge status={d.status} size="xs" dot={false} />
                    {i === active && (
                      <CornerDownLeft size={14} className="text-subtle" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[11px] text-subtle">
              <span>{docs.length} documents</span>
              <span className="flex items-center gap-2">
                <kbd className="rounded border border-line px-1.5 py-0.5">↑↓</kbd>
                navigate
                <kbd className="rounded border border-line px-1.5 py-0.5">↵</kbd>
                open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
