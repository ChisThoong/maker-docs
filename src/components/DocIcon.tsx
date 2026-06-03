"use client";

import { Suspense, lazy, type ComponentType } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { cn } from "@/lib/utils";

type IconProps = { size?: number; className?: string };

const cache = new Map<string, ComponentType<IconProps>>();

export function isLucide(value?: string | null): value is string {
  return !!value && value.startsWith("lucide:");
}

export function lucideName(value: string): string {
  return value.slice("lucide:".length);
}

export function isImage(value?: string | null): value is string {
  return !!value && value.startsWith("img:");
}

export function imageUrl(value: string): string {
  return value.slice("img:".length);
}

function getLazy(name: string): ComponentType<IconProps> | null {
  const loader = (dynamicIconImports as Record<string, () => Promise<unknown>>)[
    name
  ];
  if (!loader) return null;
  if (!cache.has(name)) {
    cache.set(
      name,
      lazy(loader as () => Promise<{ default: ComponentType<IconProps> }>)
    );
  }
  return cache.get(name)!;
}

function imageRadiusClass(size: number): string {
  if (size >= 32) return "rounded-xl";
  if (size >= 22) return "rounded-lg";
  if (size >= 14) return "rounded-md";
  return "rounded";
}

export default function DocIcon({
  icon,
  fallback,
  size = 18,
  className,
}: {
  icon?: string | null;
  fallback?: string | null;
  size?: number;
  className?: string;
}) {
  const value = icon || fallback || "";

  if (isImage(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl(value)}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(
          "inline-block shrink-0 object-cover",
          imageRadiusClass(size),
          className
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  if (isLucide(value)) {
    const Cmp = getLazy(lucideName(value));
    if (Cmp) {
      return (
        <Suspense
          fallback={
            <span
              className="inline-block"
              style={{ width: size, height: size }}
            />
          }
        >
          <Cmp size={size} className={className} />
        </Suspense>
      );
    }
  }

  // Emoji / plain text fallback
  return (
    <span
      className={className}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
    >
      {value}
    </span>
  );
}
