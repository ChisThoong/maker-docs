"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "./CommandPalette";
import CreateDocModal from "./CreateDocModal";
import UiHost from "./UiHost";
import { cn } from "@/lib/utils";

const SIDEBAR_EXPANDED = 288;
const SIDEBAR_COLLAPSED = 80;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((c) => !c);
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <motion.div
        initial={false}
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-40 hidden h-full min-h-0 shrink-0 self-stretch overflow-visible md:block"
      >
        <Sidebar collapsed={collapsed} />
      </motion.div>

      {/* Mobile drawer + backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/45 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ x: mobileOpen ? 0 : "-100%" }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(288px,88vw)] flex-col border-r border-line bg-panel shadow-[var(--shadow-lg)] md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <span className="text-sm font-semibold text-ink">Menu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-panel-hover hover:text-ink"
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <Sidebar collapsed={false} />
        </div>
      </motion.div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleSidebar={toggleSidebar}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette />
      <CreateDocModal />
      <UiHost />
    </div>
  );
}
