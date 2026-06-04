"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  SquarePen,
} from "lucide-react";
import type { DocMeta } from "@/lib/types";
import { STATUS_META, TYPE_META } from "@/lib/types";
import { useDocs } from "./DocsProvider";
import DocIcon, { isImage } from "./DocIcon";
import SidebarTooltip from "./SidebarTooltip";
import { buildDocPath } from "@/lib/doc-paths";
import { confirmAction, toast } from "@/lib/ui-feedback";
import { cn } from "@/lib/utils";

interface Props {
  doc: DocMeta;
  depth: number;
  activeId: string | null;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onAddChild: (parentId: string, title: string) => void;
  collapsed?: boolean;
  /** Compact tree row inside collapsed sidebar flyout */
  flyout?: boolean;
}

function isOnActiveBranch(
  docId: string,
  activeId: string | null,
  docs: DocMeta[]
): boolean {
  if (!activeId) return false;
  const byId = new Map(docs.map((d) => [d.id, d]));
  let cur = byId.get(activeId);
  while (cur) {
    if (cur.id === docId) return true;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return false;
}

export default function SidebarItem({
  doc,
  depth,
  activeId,
  expanded,
  toggle,
  onAddChild,
  collapsed = false,
  flyout = false,
}: Props) {
  const { docs, childrenOf, patchMeta, remove, canCreate } = useDocs();
  const router = useRouter();
  const kids = childrenOf(doc.id);
  const hasKids = kids.length > 0;
  const isOpen = expanded.has(doc.id);
  const isActive = activeId === doc.id;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(doc.title);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyoutAnchorRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const flyoutCloseTimer = useRef<number | null>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const MENU_W = 168;
      const MENU_H = 124;
      const top =
        rect.bottom + MENU_H > window.innerHeight
          ? rect.top - MENU_H - 4
          : rect.bottom + 4;
      setMenuPos({
        top,
        left: Math.min(rect.right - MENU_W, window.innerWidth - MENU_W - 8),
      });
    }
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !portalRef.current?.contains(t) &&
        !triggerRef.current?.contains(t)
      )
        setMenuOpen(false);
    }
    function onScroll() {
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuOpen]);

  function updateFlyoutPos() {
    const rect = flyoutAnchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxHeight = Math.min(420, window.innerHeight * 0.7);
    let top = rect.top;
    if (top + maxHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - maxHeight - 8);
    }
    setFlyoutPos({ top, left: rect.right + 8 });
  }

  function openFlyout() {
    if (flyoutCloseTimer.current) {
      window.clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
    updateFlyoutPos();
    setFlyoutOpen(true);
  }

  function scheduleCloseFlyout() {
    flyoutCloseTimer.current = window.setTimeout(() => {
      setFlyoutOpen(false);
    }, 120);
  }

  useEffect(() => {
    if (!flyoutOpen) return;
    function onScroll() {
      setFlyoutOpen(false);
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [flyoutOpen]);

  async function commitRename() {
    setRenaming(false);
    const t = name.trim();
    if (!t || t === doc.title) {
      setName(doc.title);
      return;
    }
    patchMeta(doc.id, { title: t });
    await fetch(`/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
  }

  async function handleDelete() {
    setMenuOpen(false);
    const ok = await confirmAction({
      title: "Delete document",
      message: `Delete "${doc.title}"${hasKids ? " and all child documents" : ""}? This can't be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    if (isActive) router.push("/");
    const deleted = await remove(doc.id);
    if (deleted) toast.success(`Deleted "${doc.title}"`);
    else toast.error("Couldn't delete document. Check permissions or try again.");
  }

  const status = STATUS_META[doc.status];
  const branchActive =
    isActive || isOnActiveBranch(doc.id, activeId, docs);
  const docImageIcon = isImage(doc.icon);

  if (collapsed && flyout) {
    return (
      <div>
        <div
          className={cn(
            "group relative flex items-center gap-1 rounded-lg pr-1 transition",
            isActive
              ? "bg-brand-soft text-brand"
              : "text-muted hover:bg-panel-hover hover:text-ink"
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          <button
            onClick={() => hasKids && toggle(doc.id)}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded text-subtle transition",
              hasKids ? "hover:bg-panel-hover" : "opacity-0"
            )}
          >
            <ChevronRight
              size={14}
              className={cn("transition-transform", isOpen && "rotate-90")}
            />
          </button>

          <span
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded-sm",
              docImageIcon ? "h-5 w-5" : "h-4 w-4"
            )}
          >
            <DocIcon
              icon={doc.icon}
              fallback={TYPE_META[doc.type].icon}
              size={docImageIcon ? 20 : 15}
              className={docImageIcon ? "rounded-sm" : undefined}
            />
          </span>

          <button
            onClick={() => router.push(`/doc/${doc.id}`)}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-[13px] font-medium"
          >
            <span className="truncate">{doc.title}</span>
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)}
              title={status.label}
            />
          </button>
        </div>

        {isOpen && hasKids && (
          <div>
            {kids.map((k) => (
              <SidebarItem
                key={k.id}
                doc={k}
                depth={depth + 1}
                activeId={activeId}
                expanded={expanded}
                toggle={toggle}
                collapsed
                flyout
                onAddChild={onAddChild}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (collapsed) {
    if (depth > 0) return null;

    const imageIcon = docImageIcon;
    const iconSize = imageIcon ? 36 : 17;

    const iconButton = (
      <button
        onClick={() => router.push(`/doc/${doc.id}`)}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
          imageIcon && "overflow-hidden p-0",
          !imageIcon && branchActive && "bg-brand-soft text-brand",
          !imageIcon &&
            !branchActive &&
            "text-muted hover:bg-panel-hover hover:text-ink",
          imageIcon &&
            branchActive &&
            "ring-2 ring-brand ring-offset-1 ring-offset-panel",
          imageIcon &&
            !branchActive &&
            "hover:opacity-90"
        )}
      >
        <DocIcon
          icon={doc.icon}
          fallback={TYPE_META[doc.type].icon}
          size={iconSize}
          className={imageIcon ? "rounded-xl" : undefined}
        />
      </button>
    );

    if (!hasKids) {
      return <SidebarTooltip label={doc.title}>{iconButton}</SidebarTooltip>;
    }

    const flyoutPanel = (
      <div
        className="max-h-[min(420px,70vh)] w-[min(280px,calc(100vw-96px))] overflow-y-auto rounded-xl border border-line bg-panel py-1 shadow-[var(--shadow-lg)]"
        onMouseEnter={openFlyout}
        onMouseLeave={scheduleCloseFlyout}
      >
        <div className="border-b border-line px-3 py-2 text-xs font-semibold text-ink">
          {doc.title}
        </div>
        {kids.map((k) => (
          <SidebarItem
            key={k.id}
            doc={k}
            depth={0}
            activeId={activeId}
            expanded={expanded}
            toggle={toggle}
            collapsed
            flyout
            onAddChild={onAddChild}
          />
        ))}
      </div>
    );

    return (
      <>
        <div
          ref={flyoutAnchorRef}
          className="relative flex justify-center"
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleCloseFlyout}
        >
          <SidebarTooltip label={doc.title}>{iconButton}</SidebarTooltip>
        </div>
        {flyoutOpen &&
          createPortal(
            <div
              className="fixed z-[300]"
              style={{ top: flyoutPos.top, left: flyoutPos.left }}
              onMouseEnter={openFlyout}
              onMouseLeave={scheduleCloseFlyout}
            >
              {flyoutPanel}
            </div>,
            document.body
          )}
      </>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "group relative flex items-center gap-1 rounded-lg pr-1 transition",
          isActive
            ? "bg-brand-soft text-brand"
            : "text-muted hover:bg-panel-hover hover:text-ink"
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <button
          onClick={() => hasKids && toggle(doc.id)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-subtle transition",
            hasKids ? "hover:bg-panel-hover" : "opacity-0"
          )}
        >
          <ChevronRight
            size={14}
            className={cn("transition-transform", isOpen && "rotate-90")}
          />
        </button>

        <span
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-sm",
            docImageIcon ? "h-5 w-5" : "h-4 w-4"
          )}
        >
          <DocIcon
            icon={doc.icon}
            fallback={TYPE_META[doc.type].icon}
            size={docImageIcon ? 20 : 15}
            className={docImageIcon ? "rounded-sm" : undefined}
          />
        </span>

        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setName(doc.title);
                setRenaming(false);
              }
            }}
            className="my-1 w-full rounded border border-brand bg-panel px-1.5 py-0.5 text-sm text-ink outline-none"
          />
        ) : (
          <button
            onClick={() => router.push(`/doc/${doc.id}`)}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-[13px] font-medium"
          >
            <span className="truncate">{doc.title}</span>
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)}
              title={status.label}
            />
          </button>
        )}

        <div className={cn(
          "flex shrink-0 items-center opacity-0 transition group-hover:opacity-100",
          !canCreate && "hidden"
        )}>
          <button
            onClick={() => onAddChild(doc.id, doc.title)}
            className="flex h-6 w-6 items-center justify-center rounded text-subtle hover:bg-panel-hover hover:text-ink"
            title="Add child document"
          >
            <Plus size={14} />
          </button>
          <button
            ref={triggerRef}
            onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
            className="flex h-6 w-6 items-center justify-center rounded text-subtle hover:bg-panel-hover hover:text-ink"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen &&
            createPortal(
              <div
                ref={portalRef}
                className="animate-fade-up fixed z-[120] overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-[var(--shadow-lg)]"
                style={{ top: menuPos.top, left: menuPos.left, width: 168 }}
              >
                <button
                  onClick={() => {
                    setRenaming(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-panel-hover hover:text-ink"
                >
                  <Pencil size={13} /> Rename
                </button>
                <button
                  onClick={() => {
                    router.push(`/doc/${doc.id}`);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-panel-hover hover:text-ink"
                >
                  <SquarePen size={13} /> Edit
                </button>
                <button
                  onClick={() => {
                    window.open(buildDocPath(doc.id, docs), "_blank");
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-panel-hover hover:text-ink"
                >
                  <ExternalLink size={13} /> Open in new tab
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>,
              document.body
            )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && hasKids && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {kids.map((k) => (
              <SidebarItem
                key={k.id}
                doc={k}
                depth={depth + 1}
                activeId={activeId}
                expanded={expanded}
                toggle={toggle}
                collapsed={collapsed}
                onAddChild={onAddChild}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
