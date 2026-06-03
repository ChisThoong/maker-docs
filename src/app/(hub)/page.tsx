"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Library,
  Lock,
  Zap,
  PencilLine,
  Plus,
  FolderPlus,
  Code2,
  Upload,
  Settings2,
  TrendingUp,
  Clock,
  History,
  Star,
  Loader2,
} from "lucide-react";
import DocIcon from "@/components/DocIcon";
import StatusBadge from "@/components/StatusBadge";
import Avatar from "@/components/Avatar";
import { openCreate } from "@/components/CreateDocModal";
import type { DocMeta } from "@/lib/types";
import { TYPE_META } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

interface DashboardActivity {
  id: string;
  docId: string;
  docTitle: string;
  docPath: string;
  actorName: string;
  verb: string;
  createdAt: string;
}

interface DashboardData {
  stats: {
    total: number;
    locked: number;
    in_dev: number;
    concept: number;
    newThisMonth: number;
  };
  health: { design: number; impl: number; qa: number };
  recent: (DocMeta & { authorName: string })[];
  favorites: DocMeta[];
  recentViews: DocMeta[];
  activity: DashboardActivity[];
}

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (res.ok && !cancelled) {
          setData(await res.json());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const stats = data?.stats ?? {
    total: 0,
    locked: 0,
    in_dev: 0,
    concept: 0,
    newThisMonth: 0,
  };
  const health = data?.health ?? { design: 0, impl: 0, qa: 0 };
  const recent = data?.recent ?? [];
  const favorites = data?.favorites ?? [];
  const recents = data?.recentViews ?? [];
  const activity = data?.activity ?? [];

  return (
    <div className="max-w-[1400px] px-6 py-6">
      {/* Hero */}
      <motion.section
        custom={0}
        variants={fade}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border border-line bg-panel p-8 lg:p-10 dotted-grid"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--brand-soft)] blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-brand">
            <Sparkles size={13} /> Game Documentation Hub
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink lg:text-5xl">
            Maker Docs
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            The single source of truth for game design, characters, skills, mechanics,
            and systems. Collaborative docs for designers, artists, developers, and QA —
            all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={() => openCreate()}
              className="brand-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-95 active:scale-[0.99]"
            >
              <Plus size={16} /> New document
            </button>
            <button
              onClick={() => openCreate({ template: "blank" })}
              className="flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-panel-hover"
            >
              <Code2 size={16} /> Import HTML
            </button>
          </div>
        </div>
      </motion.section>

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          i={1}
          icon={<Library size={18} />}
          tone="brand"
          value={stats.total}
          label="Total documents"
          trend={
            stats.newThisMonth > 0
              ? `+${stats.newThisMonth} this month`
              : "Steady"
          }
        />
        <StatCard
          i={2}
          icon={<Lock size={18} />}
          tone="green"
          value={stats.locked}
          label="Design Locked"
          trend="Ready for dev"
        />
        <StatCard
          i={3}
          icon={<Zap size={18} />}
          tone="orange"
          value={stats.in_dev}
          label="In Development"
          trend="In progress"
        />
        <StatCard
          i={4}
          icon={<PencilLine size={18} />}
          tone="slate"
          value={stats.concept}
          label="Draft / Concept"
          trend="In draft"
        />
      </div>

      {/* Quick actions */}
      <Section title="Quick actions" className="mt-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <ActionCard
            icon={<Plus size={18} />}
            label="New document"
            onClick={() => openCreate()}
          />
          <ActionCard
            icon={<FolderPlus size={18} />}
            label="New folder"
            onClick={() => openCreate({ template: "folder" })}
          />
          <ActionCard
            icon={<Code2 size={18} />}
            label="Import HTML"
            onClick={() => openCreate({ template: "blank" })}
          />
          <ActionCard
            icon={<Upload size={18} />}
            label="Upload file"
            onClick={() => openCreate({ template: "blank" })}
          />
          <ActionCard
            icon={<Settings2 size={18} />}
            label="Settings"
            onClick={() => {}}
          />
        </div>
      </Section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <Section
          title="Favorite documents"
          icon={<Star size={15} className="text-amber-500" />}
          className="mt-8"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.slice(0, 6).map((d, i) => (
              <DocCard key={d.id} doc={d} i={i} compact />
            ))}
          </div>
        </Section>
      )}

      {/* Recently viewed */}
      {recents.length > 0 && (
        <Section
          title="Recently viewed"
          icon={<History size={15} />}
          className="mt-8"
        >
          <div className="flex flex-wrap gap-2.5">
            {recents.slice(0, 8).map((d) => (
              <Link
                key={d.id}
                href={`/doc/${d.id}`}
                className="flex w-44 items-center gap-2.5 rounded-xl border border-line bg-panel px-3 py-2.5 transition hover:border-line-strong hover:bg-panel-hover"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-2 text-muted">
                  <DocIcon icon={d.icon} fallback={TYPE_META[d.type].icon} size={16} />
                </span>
                <span className="truncate text-sm font-medium text-ink">
                  {d.title}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Main grid: recent + health/activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Recently updated" icon={<Clock size={15} />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {recent.map((d, i) => (
                <DocCard key={d.id} doc={d} authorName={d.authorName} i={i} />
              ))}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <HealthCard health={health} />
          <ActivityCard activity={activity} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Sub components ---------------- */

function Section({
  title,
  icon,
  className,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-subtle">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

const TONE: Record<string, string> = {
  brand: "bg-brand-soft text-brand",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  slate: "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300",
};

function StatCard({
  i,
  icon,
  tone,
  value,
  label,
  trend,
}: {
  i: number;
  icon: React.ReactNode;
  tone: string;
  value: number;
  label: string;
  trend: string;
}) {
  return (
    <motion.div
      custom={i}
      variants={fade}
      initial="hidden"
      animate="show"
      className="group rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-md)]"
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TONE[tone])}>
        {icon}
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight text-ink">
        {value}
      </div>
      <div className="mt-0.5 text-sm text-muted">{label}</div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-subtle">
        <TrendingUp size={12} className="text-emerald-500" /> {trend}
      </div>
    </motion.div>
  );
}

function ActionCard({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-md)]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel-2 text-muted transition group-hover:bg-brand-soft group-hover:text-brand">
        {icon}
      </span>
      <span className="text-sm font-medium text-ink">{label}</span>
    </button>
  );
}

function DocCard({
  doc,
  authorName,
  i,
  compact,
}: {
  doc: DocMeta;
  authorName?: string;
  i: number;
  compact?: boolean;
}) {
  return (
    <motion.div custom={i} variants={fade} initial="hidden" animate="show">
      <Link
        href={`/doc/${doc.id}`}
        className="group flex items-start gap-3 rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-md)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-muted">
          <DocIcon icon={doc.icon} fallback={TYPE_META[doc.type].icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-ink transition group-hover:text-brand">
              {doc.title}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={doc.status} size="xs" />
            <span className="text-xs text-subtle">{timeAgo(doc.updatedAt)}</span>
          </div>
          {!compact && authorName && (
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
              <Avatar name={authorName} size={20} />
              <span className="text-xs text-muted">{authorName}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function HealthCard({
  health,
}: {
  health: { design: number; impl: number; qa: number };
}) {
  const rows = [
    { label: "Design Complete", value: health.design, color: "bg-emerald-500" },
    { label: "Implementation", value: health.impl, color: "bg-orange-500" },
    { label: "QA Complete", value: health.qa, color: "bg-sky-500" },
  ];
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h3 className="text-sm font-semibold text-ink">Documentation Health</h3>
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted">{r.label}</span>
              <span className="font-semibold text-ink">{r.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-panel-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${r.value}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className={cn("h-full rounded-full", r.color)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: DashboardActivity[] }) {
  if (activity.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold text-ink">Team activity</h3>
        <p className="mt-4 text-sm text-muted">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h3 className="text-sm font-semibold text-ink">Team activity</h3>
      <div className="mt-4 space-y-4">
        {activity.slice(0, 5).map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <Avatar name={a.actorName} size={28} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="leading-snug text-muted">
                <span className="font-medium text-ink">{a.actorName}</span>{" "}
                {a.verb}{" "}
                <Link
                  href={a.docPath || `/doc/${a.docId}`}
                  className="font-medium text-brand hover:underline"
                >
                  {a.docTitle}
                </Link>
              </p>
              <span className="text-xs text-subtle">{timeAgo(a.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
