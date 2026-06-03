import type { DocStatus } from "@/lib/types";
import { STATUS_META, STATUS_TONE_CLASS } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StatusBadge({
  status,
  size = "sm",
  dot = true,
}: {
  status: DocStatus;
  size?: "sm" | "xs";
  dot?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        STATUS_TONE_CLASS[meta.tone],
        size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />}
      {meta.label}
    </span>
  );
}
