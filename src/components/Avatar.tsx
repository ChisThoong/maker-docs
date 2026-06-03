import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-blue-500 to-sky-400",
  "from-rose-500 to-orange-400",
  "from-emerald-500 to-teal-400",
  "from-sky-500 to-blue-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-yellow-400",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({
  name,
  src,
  size = 28,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const grad = GRADIENTS[hash(name) % GRADIENTS.length];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-panel",
          className
        )}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-panel",
        grad,
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
