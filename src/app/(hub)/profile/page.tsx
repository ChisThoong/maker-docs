"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Camera,
  LogOut,
  Loader2,
  Mail,
  Shield,
  Briefcase,
  BadgeCheck,
  Activity,
  Lock,
  User,
  ExternalLink,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { useProfile } from "@/components/ProfileProvider";
import { useDocs } from "@/components/DocsProvider";
import { formatJobPositionLabel } from "@/lib/job-positions";
import { confirmAction, toast } from "@/lib/ui-feedback";
import { uploadFile } from "@/lib/upload";
import { cn, timeAgo } from "@/lib/utils";

interface ActivityItem {
  id: string;
  docId: string;
  docTitle: string;
  docPath: string;
  verb: string;
  createdAt: string;
}

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function ProfilePage() {
  const { profile, loading, update } = useProfile();
  const { workspaceRole } = useDocs();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadActivity() {
      try {
        const res = await fetch("/api/profile/activity", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setActivity(data.activity ?? []);
        }
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    }
    loadActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 animate-spin" size={20} /> Loading profile…
      </div>
    );
  }
  if (!profile) return null;

  const onPickAvatar = () => fileRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image must be 8MB or smaller.");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      await update({ avatarUrl: url });
      toast.success("Profile photo updated");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    const ok = await confirmAction({
      title: "Remove profile photo",
      message: "Remove your custom photo and use your Google avatar again?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    setUploading(true);
    try {
      await update({ avatarUrl: null });
      toast.success("Profile photo removed");
    } finally {
      setUploading(false);
    }
  };

  const workspaceRoleLabel =
    workspaceRole === "admin"
      ? "Admin"
      : workspaceRole === "editor"
        ? "Editor"
        : workspaceRole === "viewer"
          ? "Viewer"
          : null;

  const infoRows = [
    {
      icon: <Mail size={15} />,
      label: "Email",
      value: profile.email,
    },
    profile.role
      ? {
          icon: <Shield size={15} />,
          label: "Role",
          value: profile.role,
        }
      : null,
    profile.jobPosition
      ? {
          icon: <Briefcase size={15} />,
          label: "Position",
          value: formatJobPositionLabel(profile.jobPosition),
        }
      : null,
    workspaceRoleLabel
      ? {
          icon: <Lock size={15} />,
          label: "Workspace access",
          value: workspaceRoleLabel,
        }
      : null,
    profile.isActive != null
      ? {
          icon: <BadgeCheck size={15} />,
          label: "Status",
          value: profile.isActive ? "Active" : "Inactive",
          tone: profile.isActive ? ("green" as const) : ("muted" as const),
        }
      : null,
  ].filter(Boolean) as {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: "green" | "muted";
  }[];

  return (
    <div className="max-w-[1400px] px-6 py-6">
      <motion.div
        custom={0}
        variants={fade}
        initial="hidden"
        animate="show"
        className="flex items-center gap-3"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <User size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Profile</h1>
          <p className="text-sm text-muted">
            Manage your account and review recent activity.
          </p>
        </div>
      </motion.div>

      {err && (
        <motion.div
          custom={1}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {err}
        </motion.div>
      )}

      {/* Profile hero */}
      <motion.section
        custom={err ? 2 : 1}
        variants={fade}
        initial="hidden"
        animate="show"
        className="relative mt-6 overflow-hidden rounded-3xl border border-line bg-panel dotted-grid"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--brand-soft)] blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="rounded-full p-1 ring-2 ring-line-strong ring-offset-2 ring-offset-panel">
              <Avatar name={profile.name} src={profile.image} size={96} />
            </div>
            <button
              onClick={onPickAvatar}
              disabled={uploading}
              className="brand-gradient absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[var(--shadow-md)] ring-2 ring-panel transition hover:opacity-90 disabled:opacity-60"
              title="Change profile photo"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Camera size={16} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              {profile.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{profile.email}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {workspaceRoleLabel && (
                <Badge tone="brand">{workspaceRoleLabel}</Badge>
              )}
              {profile.jobPosition && (
                <Badge tone="slate">
                  {formatJobPositionLabel(profile.jobPosition)}
                </Badge>
              )}
              {profile.isActive != null && (
                <Badge tone={profile.isActive ? "green" : "slate"}>
                  {profile.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
            {profile.avatarUrl && (
              <button
                onClick={removeAvatar}
                disabled={uploading}
                className="mt-4 text-xs font-medium text-subtle underline-offset-2 transition hover:text-ink hover:underline disabled:opacity-60"
              >
                Remove custom photo, use Google avatar
              </button>
            )}
          </div>
        </div>
      </motion.section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Account details */}
        <motion.section
          custom={err ? 3 : 2}
          variants={fade}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-line bg-panel p-5 shadow-[var(--shadow-sm)]"
        >
          <h3 className="text-sm font-semibold text-ink">Account details</h3>
          <dl className="mt-4 divide-y divide-line">
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-muted">
                  {row.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                    {row.label}
                  </dt>
                  <dd
                    className={cn(
                      "mt-0.5 truncate text-sm font-medium capitalize",
                      row.tone === "green"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-ink"
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </motion.section>

        {/* Permissions */}
        <motion.section
          custom={err ? 4 : 3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-line bg-panel p-5 shadow-[var(--shadow-sm)]"
        >
          <h3 className="text-sm font-semibold text-ink">System permissions</h3>
          {profile.permissions.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {profile.permissions.map((p) => (
                <li
                  key={p}
                  className="rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-xs font-medium text-ink"
                >
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Your account has no extra system permissions. Document access is
              managed per workspace.
            </p>
          )}
        </motion.section>
      </div>

      {/* Activity */}
      <motion.section
        custom={err ? 5 : 4}
        variants={fade}
        initial="hidden"
        animate="show"
        className="mt-6 rounded-2xl border border-line bg-panel shadow-[var(--shadow-sm)]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Activity size={15} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink">Your activity</h3>
              <p className="text-xs text-subtle">Recent actions on documents</p>
            </div>
          </div>
          {!activityLoading && activity.length > 0 && (
            <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-[11px] font-medium text-muted">
              {activity.length}
            </span>
          )}
        </div>

        <div className="p-5">
          {activityLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-subtle">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Loading…
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-panel-2 text-subtle">
                <Activity size={20} />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">
                No activity yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                When you create or edit documents, your history will show up here.
              </p>
            </div>
          ) : (
            <ul className="space-y-0">
              {activity.slice(0, 12).map((a, i) => (
                <li
                  key={a.id}
                  className={cn(
                    "relative flex gap-3 py-3",
                    i > 0 && "border-t border-line"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar name={profile.name} src={profile.image} size={32} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm leading-snug text-muted">
                      You {a.verb}{" "}
                      <Link
                        href={a.docPath || `/doc/${a.docId}`}
                        className="inline-flex items-center gap-0.5 font-medium text-brand hover:underline"
                      >
                        {a.docTitle}
                        <ExternalLink size={11} className="opacity-60" />
                      </Link>
                    </p>
                    <time className="mt-1 block text-xs text-subtle">
                      {timeAgo(a.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>

      {/* Sign out */}
      <motion.div
        custom={err ? 6 : 5}
        variants={fade}
        initial="hidden"
        animate="show"
        className="mt-8 flex justify-center border-t border-line pt-6"
      >
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </motion.div>
    </div>
  );
}

function Badge({
  children,
  tone = "brand",
}: {
  children: React.ReactNode;
  tone?: "brand" | "green" | "slate";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
      : tone === "slate"
        ? "border-line bg-panel-2 text-muted"
        : "border-brand/20 bg-brand-soft text-brand";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        cls
      )}
    >
      {children}
    </span>
  );
}
