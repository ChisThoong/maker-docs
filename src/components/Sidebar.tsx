"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  BookOpen,
  Settings,
  Users,
} from "lucide-react";
import { useDocs } from "./DocsProvider";
import SidebarItem from "./SidebarItem";
import SidebarTooltip from "./SidebarTooltip";
import { openCreate } from "./CreateDocModal";
import Avatar from "./Avatar";
import { openCommand } from "./CommandPalette";
import { useProfile } from "./ProfileProvider";
import { formatJobPositionLabel } from "@/lib/job-positions";
import { cn } from "@/lib/utils";
import type { DocMeta } from "@/lib/types";
import { toast } from "@/lib/ui-feedback";

type DropIntent = "before" | "after" | "inside" | "root-end";

interface DropTarget {
  id: string | null;
  intent: DropIntent;
}

export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { docs, loading, error, childrenOf, canCreate, reorder } = useDocs();
  const pathname = usePathname();
  const { profile } = useProfile();
  const displayName = profile?.name || profile?.email || "Member";
  const subtitle = profile?.jobPosition
    ? formatJobPositionLabel(profile.jobPosition)
    : profile?.role || profile?.email || "Maker Studios";

  const activeId = pathname?.startsWith("/doc/")
    ? pathname.split("/")[2]
    : null;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  useEffect(() => {
    if (!activeId) return;
    const byId = new Map(docs.map((d) => [d.id, d]));
    const next = new Set(expanded);
    let cur = byId.get(activeId);
    while (cur?.parentId) {
      next.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, docs.length]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const roots = childrenOf(null);
  const byId = new Map(docs.map((d) => [d.id, d]));

  function isDescendant(parentId: string | null, possibleAncestorId: string) {
    let cur = parentId ? byId.get(parentId) : undefined;
    while (cur) {
      if (cur.id === possibleAncestorId) return true;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return false;
  }

  function orderedChildren(parentId: string | null, source: DocMeta[] = docs) {
    return source
      .filter((d) => d.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  async function moveDoc(targetId: string | null, intent: DropIntent) {
    if (!draggingId) return;
    const dragged = byId.get(draggingId);
    if (!dragged) return;

    const target = targetId ? byId.get(targetId) : null;
    if (targetId && !target) return;
    if (targetId === draggingId) return;

    let nextParentId: string | null;
    if (intent === "inside") {
      if (!target || target.type !== "folder") return;
      nextParentId = target.id;
    } else if (intent === "root-end") {
      nextParentId = null;
    } else {
      nextParentId = target?.parentId ?? null;
    }

    if (nextParentId === draggingId || isDescendant(nextParentId, draggingId)) {
      toast.error("Can't move a folder into itself.");
      return;
    }

    const oldParentId = dragged.parentId;
    const affectedParents = new Set<string | null>([oldParentId, nextParentId]);
    const targetSiblings = orderedChildren(nextParentId).filter((d) => d.id !== draggingId);
    let insertAt = targetSiblings.length;

    if ((intent === "before" || intent === "after") && target) {
      const targetIndex = targetSiblings.findIndex((d) => d.id === target.id);
      if (targetIndex >= 0) insertAt = intent === "before" ? targetIndex : targetIndex + 1;
    }

    const nextTargetSiblings = [
      ...targetSiblings.slice(0, insertAt),
      { ...dragged, parentId: nextParentId },
      ...targetSiblings.slice(insertAt),
    ];

    const updatesMap = new Map<
      string,
      { id: string; parentId: string | null; order: number }
    >();

    for (const parentId of affectedParents) {
      const siblings =
        parentId === nextParentId
          ? nextTargetSiblings
          : orderedChildren(parentId).filter((d) => d.id !== draggingId);
      siblings.forEach((d, order) => {
        const parent = parentId;
        if (d.parentId !== parent || d.order !== order || d.id === draggingId) {
          updatesMap.set(d.id, { id: d.id, parentId: parent, order });
        }
      });
    }

    const ok = await reorder([...updatesMap.values()]);
    if (!ok) toast.error("Couldn't move item. Check permissions and try again.");
    else if (intent === "inside" && target) {
      setExpanded((prev) => new Set(prev).add(target.id));
    }
  }

  function clearDragState() {
    setDraggingId(null);
    setDropTarget(null);
  }

  const iconBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel-hover hover:text-ink";

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-line bg-panel">
      {/* Brand */}
      <div className="shrink-0">
      <SidebarTooltip label="Maker Docs — Home">
        <Link
          href="/"
          className={cn(
            "flex items-center transition hover:opacity-90",
            collapsed ? "justify-center px-2 pb-2 pt-3" : "gap-3 px-4 pb-3 pt-4"
          )}
        >
          <div className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-md)]">
            <BookOpen size={19} />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-ink">
                Maker Docs
              </div>
              <div className="text-[11px] text-subtle">Game Documentation Hub</div>
            </div>
          )}
        </Link>
      </SidebarTooltip>
      </div>

      {/* Search */}
      <div className={cn("shrink-0 pb-2.5", collapsed ? "flex justify-center px-2" : "px-3")}>
        <SidebarTooltip label="Search documents (⌘K)">
          <button
            onClick={openCommand}
            className={cn(
              collapsed
                ? iconBtn
                : "flex w-full items-center gap-2.5 rounded-xl border border-line bg-panel-2 px-3 py-2 text-sm text-subtle transition hover:border-line-strong hover:bg-panel-hover"
            )}
          >
            <Search size={15} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search documents…</span>
                <kbd className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </SidebarTooltip>
      </div>

      {/* New document */}
      {canCreate && (
        <div className={cn("shrink-0 pb-3", collapsed ? "flex justify-center px-2" : "px-3")}>
          <SidebarTooltip label="New document">
            <button
              onClick={() => openCreate()}
              className={cn(
                collapsed
                  ? "brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[var(--shadow-md)] transition hover:opacity-95"
                  : "brand-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-95 hover:shadow-[var(--shadow-lg)] active:scale-[0.99]"
              )}
            >
              <Plus size={17} />
              {!collapsed && "New document"}
            </button>
          </SidebarTooltip>
        </div>
      )}

      {!collapsed && (
        <div className="shrink-0 px-4 pb-1.5 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
            Workspace
          </span>
        </div>
      )}

      {/* Tree */}
      <div
        className={cn(
          "min-h-0 flex-1 pb-2",
          collapsed
            ? "overflow-y-auto overflow-x-visible px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "overflow-x-hidden overflow-y-auto px-2"
        )}
      >
        {loading && (
          <div
            className={cn(
              "flex items-center gap-2 py-6 text-sm text-subtle",
              collapsed ? "justify-center px-0" : "px-3"
            )}
          >
            <Loader2 size={15} className="animate-spin" />
            {!collapsed && "Loading…"}
          </div>
        )}

        {error && !collapsed && (
          <div className="mx-1 mt-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={13} /> Couldn&apos;t connect to MongoDB
            </div>
            Check{" "}
            <code className="rounded bg-orange-100 px-1 dark:bg-orange-500/20">
              MONGODB_URI
            </code>
            .
          </div>
        )}

        {!loading && !error && (
          <div className={cn("pt-0.5", collapsed && "flex flex-col items-center gap-1")}>
            {roots.length === 0 ? (
              !collapsed && (
                <div className="px-3 py-8 text-center text-sm text-subtle">
                  No documents yet.
                  <br />
                  Click <span className="font-medium">&quot;New document&quot;</span>.
                </div>
              )
            ) : (
              roots.map((d) => (
                <SidebarItem
                  key={d.id}
                  doc={d}
                  depth={0}
                  activeId={activeId}
                  expanded={expanded}
                  toggle={toggle}
                  collapsed={collapsed}
                  draggingId={draggingId}
                  dropTarget={dropTarget}
                  onDragStartDoc={(id) => setDraggingId(id)}
                  onDragEndDoc={clearDragState}
                  onDropDoc={(id, intent) => {
                    void moveDoc(id, intent);
                    clearDragState();
                  }}
                  onDragOverDoc={(id, intent) => setDropTarget({ id, intent })}
                  onDragLeaveDoc={() => setDropTarget(null)}
                  onAddChild={(parentId, parentTitle) => {
                    setExpanded((prev) => new Set(prev).add(parentId));
                    openCreate({ parentId, parentTitle });
                  }}
                />
              ))
            )}
            {!collapsed && roots.length > 0 && draggingId && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget({ id: null, intent: "root-end" });
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  void moveDoc(null, "root-end");
                  clearDragState();
                }}
                className={cn(
                  "mx-1 mt-1 rounded-lg border border-dashed py-2 text-center text-[11px] transition",
                  dropTarget?.intent === "root-end"
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-transparent text-subtle"
                )}
              >
                Drop here to move to workspace root
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: members + profile stay above scrollable tree */}
      <div className="relative z-10 shrink-0 border-t border-line bg-panel">
      <div className={cn("pb-1.5 pt-1.5", collapsed ? "flex justify-center px-2" : "px-3")}>
        <SidebarTooltip label="Members">
          <Link
            href="/settings/members"
            className={cn(
              collapsed
                ? cn(
                    iconBtn,
                    pathname === "/settings/members" && "bg-brand-soft text-brand"
                  )
                : cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition",
                    pathname === "/settings/members"
                      ? "bg-brand-soft text-brand"
                      : "text-muted hover:bg-panel-hover hover:text-ink"
                  )
            )}
          >
            <Users size={15} />
            {!collapsed && "Members"}
          </Link>
        </SidebarTooltip>
      </div>

      {/* Workspace card */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="rounded-2xl border border-line bg-gradient-to-br from-[var(--brand-soft)] to-transparent p-3">
            <div className="flex items-center gap-2">
              <span className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-white">
                <BookOpen size={14} />
              </span>
              <span className="text-xs font-semibold text-ink">
                Game Documentation Hub
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              Store and share game knowledge for designers, artists, and developers.
            </p>
          </div>
        </div>
      )}

      {/* Profile */}
      <div className="p-2">
        <div
          className={cn(
            "flex items-center rounded-xl transition",
            collapsed ? "justify-center p-0" : "gap-2.5 px-1.5 py-1.5",
            pathname === "/profile" && !collapsed && "bg-panel-hover",
            pathname === "/profile" && collapsed && ""
          )}
        >
          <SidebarTooltip label={displayName}>
            <Link
              href="/profile"
              className={cn(
                "flex items-center",
                collapsed ? "justify-center" : "min-w-0 flex-1 gap-2.5"
              )}
            >
              <Avatar name={displayName} src={profile?.image} size={34} />
              {!collapsed && (
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-semibold text-ink">
                    {displayName}
                  </div>
                  <div className="truncate text-[11px] capitalize text-subtle">
                    {subtitle}
                  </div>
                </div>
              )}
            </Link>
          </SidebarTooltip>
          {!collapsed && (
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition hover:bg-panel hover:text-ink"
              title="Profile settings"
            >
              <Settings size={16} />
            </Link>
          )}
        </div>
      </div>
      </div>
    </aside>
  );
}
