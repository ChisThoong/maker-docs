"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { Search, X, ImagePlus, Loader2 } from "lucide-react";
import DocIcon, { isImage } from "./DocIcon";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload";

const ALL_NAMES = Object.keys(dynamicIconImports);
const NAME_SET = new Set(ALL_NAMES);

// Curated, game/docs-friendly icons shown by default
const CURATED = [
  "sprout", "leaf", "trees", "flower", "flame", "droplet", "wind", "snowflake",
  "zap", "sword", "swords", "shield", "shield-half", "axe", "bow-arrow",
  "target", "crosshair", "skull", "heart", "heart-pulse", "star", "sparkles",
  "crown", "gem", "trophy", "medal", "wand-sparkles", "bot", "ghost", "rabbit",
  "bird", "bug", "fish", "cat", "dog", "venetian-mask", "user-round", "users",
  "rocket", "bomb", "anchor", "compass", "map", "flag", "gamepad-2",
  "dices", "puzzle", "boxes", "package", "settings", "cpu", "cog", "wrench",
  "hammer", "key", "lock", "unlock", "eye", "clock", "calendar", "bell",
  "book-open", "file-text", "folder", "layers", "list-tree", "tags", "bookmark",
  "music", "volume-2", "image", "palette", "brush", "pencil", "feather",
  "circle-dot", "hexagon", "triangle", "moon", "sun", "cloud", "mountain",
].filter((n) => NAME_SET.has(n));

export default function IconPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURATED;
    return ALL_NAMES.filter((n) => n.includes(q)).slice(0, 120);
  }, [query]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image must be 8MB or smaller.");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      pick(`img:${url}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel-2 text-ink transition hover:border-brand hover:bg-brand-soft",
          isImage(value) && "overflow-hidden p-0"
        )}
        title="Choose icon"
      >
        {value ? (
          <DocIcon
            icon={value}
            size={isImage(value) ? 48 : 24}
            className={isImage(value) ? "rounded-xl" : undefined}
          />
        ) : (
          <Search size={18} className="text-subtle" />
        )}
      </button>

      {open && (
        <div className="animate-fade-up absolute left-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-lg)]">
          <div className="border-b border-line p-2.5">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons (sword, leaf, shield…)"
                className="w-full rounded-lg border border-line bg-panel-2 py-1.5 pl-8 pr-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          {!query && (
            <div className="border-b border-line px-2.5 py-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-panel-2 py-2 text-sm font-medium text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ImagePlus size={15} />
                )}
                {uploading ? "Uploading image…" : "Upload image as icon"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onUpload}
              />
              {err && (
                <p className="mt-1.5 text-[11px] text-rose-500">{err}</p>
              )}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="py-6 text-center text-sm text-subtle">
                No icons found
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {results.map((name) => {
                  const v = `lucide:${name}`;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pick(v)}
                      title={name}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand",
                        value === v &&
                          "bg-brand-soft text-brand ring-1 ring-[var(--ring)]"
                      )}
                    >
                      <DocIcon icon={v} size={17} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line bg-panel-2 px-3 py-2">
            <span className="text-[11px] text-subtle">
              {query ? `${results.length} results` : "Popular picks"}
            </span>
            <button
              type="button"
              onClick={() => pick("")}
              className="flex items-center gap-1 text-xs text-muted transition hover:text-rose-500"
            >
              <X size={12} /> Remove icon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
