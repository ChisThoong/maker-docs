"use client";

import type { DocStatus } from "@/lib/types";
import { STATUS_META, STATUS_ORDER } from "@/lib/types";
import MenuSelect from "./MenuSelect";

export default function StatusSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value: DocStatus;
  onChange: (value: DocStatus) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <MenuSelect
      value={value}
      onChange={(v) => onChange(v as DocStatus)}
      disabled={disabled}
      className={className}
      triggerClassName="rounded-xl border-line bg-panel-2 px-3.5 py-2.5"
      options={STATUS_ORDER.map((st) => ({
        value: st,
        label: STATUS_META[st].label,
        description: STATUS_META[st].description,
        dotClassName: STATUS_META[st].dot,
      }))}
    />
  );
}
