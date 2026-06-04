"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, Share2 } from "lucide-react";
import type { Notification } from "@/lib/notification-types";
import { LEVEL_LABEL } from "@/lib/notification-types";
import { cn, timeAgo } from "@/lib/utils";
import Avatar from "./Avatar";

export default function NotificationBell() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications ?? []);
    setUnread(data.unread ?? 0);
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const t = setInterval(() => void fetchNotifications(), 10_000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchNotifications().finally(() => setLoading(false));

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, fetchNotifications]);

  async function openNotification(n: Notification) {
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    router.push(n.docPath || `/doc/${n.docId}`);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-panel-hover hover:text-ink"
        title="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ring-2 ring-panel">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-brand transition hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-subtle">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-subtle">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void openNotification(n)}
                  className={cn(
                    "flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 hover:bg-panel-hover",
                    !n.read && "bg-brand-soft/40"
                  )}
                >
                  {n.sharedByImage ? (
                    <Avatar
                      name={n.sharedByName}
                      src={n.sharedByImage}
                      size={32}
                      className="mt-0.5"
                    />
                  ) : (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Share2 size={15} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-ink">
                      <span className="font-medium">{n.sharedByName}</span> shared{" "}
                      <span className="font-medium">&quot;{n.docTitle}&quot;</span>{" "}
                      with you
                    </span>
                    <span className="mt-1 block text-[11px] text-subtle">
                      {LEVEL_LABEL[n.level]} access · {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
