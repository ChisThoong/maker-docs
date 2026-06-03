"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuSelectOption {
  value: string;
  label: string;
  description?: string;
  dotClassName?: string;
}

interface MenuSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: MenuSelectOption[];
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
}

function computeMenuPos(trigger: HTMLButtonElement): MenuPos {
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const viewportPad = 8;
  const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
  const spaceAbove = rect.top - viewportPad;
  const placement = spaceBelow >= 160 || spaceBelow >= spaceAbove ? "bottom" : "top";
  const maxHeight = Math.min(288, placement === "bottom" ? spaceBelow - gap : spaceAbove - gap);
  const top =
    placement === "bottom"
      ? rect.bottom + gap
      : Math.max(viewportPad, rect.top - gap - Math.max(maxHeight, 120));

  return {
    top,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(120, maxHeight),
    placement,
  };
}

function OptionDot({ className }: { className?: string }) {
  if (!className) {
    return <span className="inline-block h-2 w-2 shrink-0" aria-hidden />;
  }
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      aria-hidden
    />
  );
}

export default function MenuSelect({
  value,
  onChange,
  options,
  className,
  triggerClassName,
  menuClassName,
  placeholder = "Select…",
  disabled,
}: MenuSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  function reposition() {
    if (!btnRef.current) return;
    setPos(computeMenuPos(btnRef.current));
  }

  useEffect(() => {
    if (!open) return;
    reposition();
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onLayout() {
      reposition();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open]);

  const menu =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: Math.max(pos.width, 220),
          maxHeight: pos.maxHeight,
          zIndex: 200,
        }}
        className={cn(
          "overflow-y-auto rounded-xl border border-line bg-panel py-1 shadow-[var(--shadow-lg)]",
          menuClassName
        )}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full gap-2 px-2.5 py-2 text-left transition",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-ink hover:bg-panel-hover"
              )}
            >
              <span className="flex h-5 w-3.5 shrink-0 items-center justify-center">
                <Check
                  size={14}
                  className={cn("shrink-0", active ? "opacity-100" : "opacity-0")}
                />
              </span>
              <div className="flex min-w-0 flex-1 gap-2">
                <span className="flex h-5 w-2 shrink-0 items-center">
                  <OptionDot className={opt.dotClassName} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-5">
                    {opt.label}
                  </span>
                  {opt.description && (
                    <span
                      className={cn(
                        "mt-0.5 block text-xs leading-snug",
                        active ? "text-brand/80" : "text-subtle"
                      )}
                    >
                      {opt.description}
                    </span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>,
      document.body
    );

  return (
    <>
      <div ref={rootRef} className={cn("relative", className)}>
        <button
          ref={btnRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-left text-sm text-ink transition",
            "hover:bg-panel-hover focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
            open && "border-brand ring-2 ring-brand/20",
            disabled && "cursor-not-allowed opacity-60",
            triggerClassName
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <OptionDot className={selected?.dotClassName} />
            <span className={cn("truncate", !selected && "text-subtle")}>
              {selected?.label ?? placeholder}
            </span>
          </span>
          <ChevronDown
            size={14}
            className={cn("shrink-0 text-subtle transition", open && "rotate-180")}
          />
        </button>
      </div>
      {menu}
    </>
  );
}
