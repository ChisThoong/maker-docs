"use client";

import { useEffect, useState } from "react";
import { Briefcase, Loader2, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import { formatJobPositionLabel } from "@/lib/job-positions";

interface Row {
  email: string;
  name: string;
  role: string | null;
  jobPosition?: string | null;
}

export default function MembersSettingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/members?all=1", { cache: "no-store" });
      if (res.ok) setRows((await res.json()).members ?? []);
      setLoading(false);
    })();
  }, []);

  const term = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (!term) return true;
    return (
      r.name.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      (r.jobPosition ?? "").toLowerCase().includes(term) ||
      (r.role ?? "").toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-subtle">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-6">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Users size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Members</h1>
          <p className="text-sm text-muted">
            Workspace members and job positions.
          </p>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, or position…"
        className="mt-5 w-full max-w-xl shrink-0 rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-[var(--ring)]"
      />

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="hidden shrink-0 border-b border-line bg-panel px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-subtle lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-6">
          <span>Member</span>
          <span>Position</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((r) => (
          <div
            key={r.email}
            className="flex flex-col gap-2 border-b border-line px-5 py-3 last:border-b-0 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center lg:gap-6 lg:py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={r.name} size={34} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{r.name}</div>
                <div className="truncate text-[11px] text-subtle">{r.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-[46px] lg:pl-0">
              {r.jobPosition ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1 text-xs font-medium text-ink">
                  <Briefcase size={12} className="shrink-0 text-brand" />
                  {formatJobPositionLabel(r.jobPosition)}
                </span>
              ) : (
                <span className="text-xs text-subtle">—</span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-subtle">
            No members found.
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
