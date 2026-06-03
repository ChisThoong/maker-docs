"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme, type AppTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme((isDark ? "light" : "dark") as AppTheme)}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-panel-hover hover:text-ink"
      title={!mounted ? "Toggle theme" : isDark ? "Light mode" : "Dark mode"}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
