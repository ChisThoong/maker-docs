"use client";

import { usePathname } from "next/navigation";
import { Search, PanelLeft, PanelLeftClose, Menu, X } from "lucide-react";
import { useDocs } from "./DocsProvider";
import { openCommand } from "./CommandPalette";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

export default function Topbar({
  collapsed,
  mobileOpen,
  onToggleSidebar,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const { docs } = useDocs();

  let title = "Dashboard";
  if (pathname?.startsWith("/doc/")) {
    const id = pathname.split("/")[2];
    title = docs.find((d) => d.id === id)?.title ?? "Document";
  } else if (pathname === "/profile") {
    title = "Profile";
  } else if (pathname === "/settings/members") {
    title = "Members";
  }

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line px-4 md:gap-3 md:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-panel-hover hover:text-ink"
        title={
          mobileOpen
            ? "Close menu"
            : collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
        }
        aria-label={
          mobileOpen
            ? "Close menu"
            : collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
        }
      >
        <span className="md:hidden">
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </span>
        <span className="hidden md:inline-flex">
          {collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
        </span>
      </button>

      <h1 className="min-w-0 truncate text-sm font-semibold text-ink">{title}</h1>

      <div className="mx-auto hidden w-full max-w-md md:block">
        <button
          type="button"
          onClick={openCommand}
          className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-panel-2 px-3.5 py-2 text-sm text-subtle transition hover:border-line-strong hover:bg-panel-hover"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Search workspace…</span>
          <kbd className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11px] font-medium text-muted">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
        <button
          type="button"
          onClick={openCommand}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-panel-hover hover:text-ink md:hidden"
          aria-label="Search"
        >
          <Search size={17} />
        </button>
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
