"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Globe,
  Lock,
  Trash2,
  Search,
  Check,
  Link2,
  Copy,
  Briefcase,
  Users,
} from "lucide-react";
import type { ACEntry, AccessLevel } from "@/lib/acl";
import { aclRoleLabel, type JobPositionOption } from "@/lib/job-positions";
import Avatar from "./Avatar";
import MenuSelect from "./MenuSelect";
import { toast } from "@/lib/ui-feedback";

interface MemberLite {
  email: string;
  name: string;
  role: string | null;
  image?: string | null;
}

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "viewer", label: "View" },
  { value: "editor", label: "Edit" },
  { value: "admin", label: "Admin" },
];

function normalizeLevel(level: AccessLevel): AccessLevel {
  return level === "commenter" ? "viewer" : level;
}

const levelOptions = LEVELS.map((l) => ({ value: l.value, label: l.label }));

export default function ShareModal({
  docId,
  docTitle,
  onClose,
}: {
  docId: string;
  docTitle: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<"inherit" | "restricted">("inherit");
  const [entries, setEntries] = useState<ACEntry[]>([]);
  const [inherited, setInherited] = useState<
    { docId: string; title: string; entries: ACEntry[] }[]
  >([]);
  const [jobPositions, setJobPositions] = useState<JobPositionOption[]>([
    { id: "everyone", label: "All members" },
  ]);
  const [docPath, setDocPath] = useState("");
  const [copied, setCopied] = useState(false);

  // add-grant UI
  const [mode, setMode] = useState<"user" | "job">("user");
  const [query, setQuery] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [results, setResults] = useState<MemberLite[]>([]);
  const [pendingLevel, setPendingLevel] = useState<AccessLevel>("viewer");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/docs/${docId}/permissions`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setVisibility(data.visibility ?? "inherit");
          setEntries(
            (data.direct ?? []).map((e: ACEntry) => ({
              ...e,
              level: normalizeLevel(e.level),
            }))
          );
          setInherited(data.inherited ?? []);
          const positions: JobPositionOption[] =
            data.availableJobPositions ?? [{ id: "everyone", label: "All members" }];
          setJobPositions(positions);
          setDocPath(data.docPath ?? "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [docId]);

  // member search
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (term: string) => {
    const res = await fetch(`/api/members?q=${encodeURIComponent(term)}`, {
      cache: "no-store",
    });
    if (res.ok) setResults((await res.json()).members ?? []);
  }, []);

  // Prefetch the list when entering "user" mode.
  useEffect(() => {
    if (mode === "user") void runSearch("");
  }, [mode, runSearch]);

  function onSearchChange(v: string) {
    setQuery(v);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => void runSearch(v), 250);
  }

  function upsertEntry(e: ACEntry) {
    setEntries((prev) => {
      const key = `${e.subjectType}:${e.subjectId.toLowerCase()}`;
      const next = prev.filter(
        (x) => `${x.subjectType}:${x.subjectId.toLowerCase()}` !== key
      );
      return [...next, e];
    });
  }

  function addUser(m: MemberLite) {
    upsertEntry({
      subjectType: "user",
      subjectId: m.email,
      level: pendingLevel,
      label: m.name,
    });
    setQuery("");
    setResults([]);
  }

  function addJobPosition(jobId: string, label: string) {
    upsertEntry({
      subjectType: "role",
      subjectId: jobId,
      level: pendingLevel,
      label,
    });
  }

  function removeEntry(e: ACEntry) {
    setEntries((prev) =>
      prev.filter(
        (x) =>
          !(x.subjectType === e.subjectType && x.subjectId === e.subjectId)
      )
    );
  }

  function setLevel(e: ACEntry, level: AccessLevel) {
    setEntries((prev) =>
      prev.map((x) =>
        x.subjectType === e.subjectType && x.subjectId === e.subjectId
          ? { ...x, level: normalizeLevel(level) }
          : x
      )
    );
  }

  const shareUrl =
    docPath && typeof window !== "undefined"
      ? `${window.location.origin}${docPath}`
      : "";

  const teamCanView = entries.some(
    (e) => e.subjectType === "role" && e.subjectId === "everyone"
  );

  function toggleTeamShare(enabled: boolean) {
    if (enabled) {
      upsertEntry({
        subjectType: "role",
        subjectId: "everyone",
        level: "viewer",
        label: "All members",
      });
    } else {
      setEntries((prev) =>
        prev.filter(
          (e) => !(e.subjectType === "role" && e.subjectId === "everyone")
        )
      );
    }
  }

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  const filteredJobs = jobPositions.filter((p) => {
    if (p.id === "everyone") return false;
    const term = jobQuery.trim().toLowerCase();
    if (!term) return true;
    return p.label.toLowerCase().includes(term) || p.id.toLowerCase().includes(term);
  });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/docs/${docId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, visibility }),
      });
      if (res.ok) onClose();
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[8vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">Share & permissions</h2>
            <p className="truncate text-xs text-subtle">{docTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel-hover hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-subtle">
            <Loader2 className="mr-2 animate-spin" size={18} /> Loading…
          </div>
        ) : (
          <div className="max-h-[64vh] overflow-y-auto px-5 py-4">
            {/* Internal link */}
            <div className="mb-4 rounded-xl border border-line bg-panel-2 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Link2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">Internal link</div>
                  <div className="text-[11px] text-subtle">
                    Only signed-in members with access can view.
                  </div>
                </div>
              </div>
              {docPath && (
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs text-muted outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-panel-hover hover:text-ink"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2.5 border-t border-line pt-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-brand">
                  <Users size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">Entire team can view</div>
                  <div className="text-[11px] text-subtle">
                    All workspace members get view access.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleTeamShare(!teamCanView)}
                  role="switch"
                  aria-checked={teamCanView}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    teamCanView ? "bg-brand" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      teamCanView ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Visibility */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setVisibility("inherit")}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  visibility === "inherit"
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line bg-panel-2 text-muted hover:bg-panel-hover"
                }`}
              >
                <Globe size={16} className="text-brand" />
                <span>
                  <span className="block font-medium text-ink">Workspace default</span>
                  <span className="text-[11px] text-subtle">Inherit from parent folder</span>
                </span>
              </button>
              <button
                onClick={() => setVisibility("restricted")}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  visibility === "restricted"
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line bg-panel-2 text-muted hover:bg-panel-hover"
                }`}
              >
                <Lock size={16} className="text-brand" />
                <span>
                  <span className="block font-medium text-ink">Restricted</span>
                  <span className="text-[11px] text-subtle">Only people with access</span>
                </span>
              </button>
            </div>

            {/* Add grant */}
            <div className="relative z-10 mb-3 overflow-visible rounded-xl border border-line bg-panel-2 p-3">
              <div className="mb-2 flex gap-1.5">
                <button
                  onClick={() => setMode("user")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    mode === "user" ? "bg-brand text-white" : "text-muted hover:bg-panel-hover"
                  }`}
                >
                  By person
                </button>
                <button
                  onClick={() => setMode("job")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    mode === "job" ? "bg-brand text-white" : "text-muted hover:bg-panel-hover"
                  }`}
                >
                  By position
                </button>
                <div className="ml-auto w-[140px]">
                  <MenuSelect
                    value={pendingLevel}
                    onChange={(v) => setPendingLevel(v as AccessLevel)}
                    options={levelOptions}
                    menuClassName="min-w-[140px]"
                  />
                </div>
              </div>

              {mode === "user" ? (
                <div>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle"
                    />
                    <input
                      value={query}
                      onChange={(e) => onSearchChange(e.target.value)}
                      onFocus={() => void runSearch(query)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      name="share-member-search"
                      data-1p-ignore
                      data-lpignore="true"
                      placeholder="Search by name or email…"
                      className="w-full rounded-lg border border-line bg-panel py-1.5 pl-8 pr-3 text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>
                  <div className="mt-1.5 max-h-44 min-h-44 overflow-y-auto rounded-lg border border-line bg-panel">
                    {results.length > 0 ? (
                      results.map((m) => (
                        <button
                          key={m.email}
                          onClick={() => addUser(m)}
                          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition hover:bg-panel-hover"
                        >
                          <Avatar name={m.name} src={m.image} size={26} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-ink">{m.name}</span>
                            <span className="block truncate text-[11px] text-subtle">{m.email}</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="flex h-full min-h-44 items-center justify-center px-3 text-center text-xs text-subtle">
                        Type to search members…
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle"
                    />
                    <input
                      value={jobQuery}
                      onChange={(e) => setJobQuery(e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Search positions…"
                      className="w-full rounded-lg border border-line bg-panel py-1.5 pl-8 pr-3 text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>
                  <div className="mt-1.5 max-h-44 min-h-44 overflow-y-auto rounded-lg border border-line bg-panel">
                    {filteredJobs.length > 0 ? (
                      filteredJobs.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addJobPosition(p.id, p.label)}
                          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition hover:bg-panel-hover"
                        >
                          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <Briefcase size={13} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">
                            {p.label}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="flex h-full min-h-44 items-center justify-center px-3 text-center text-xs text-subtle">
                        No matching positions.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Direct entries */}
            <div className="space-y-1.5">
              {entries.length === 0 && (
                <p className="py-2 text-center text-xs text-subtle">
                  No direct permissions yet.
                </p>
              )}
              {entries.map((e) => (
                <div
                  key={`${e.subjectType}:${e.subjectId}`}
                  className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5"
                >
                  {e.subjectType === "user" ? (
                    <Avatar name={e.label || e.subjectId} size={26} />
                  ) : (
                    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Briefcase size={13} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {e.subjectType === "user"
                        ? e.label || e.subjectId
                        : aclRoleLabel(e.subjectId, e.label, jobPositions)}
                    </span>
                    {e.subjectType === "user" && (
                      <span className="block truncate text-[11px] text-subtle">
                        {e.subjectId}
                      </span>
                    )}
                  </span>
                  <MenuSelect
                    value={e.level}
                    onChange={(v) => setLevel(e, v as AccessLevel)}
                    options={levelOptions}
                    className="w-[140px]"
                    menuClassName="min-w-[140px]"
                  />
                  <button
                    onClick={() => removeEntry(e)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle transition hover:bg-panel-hover hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Inherited */}
            {inherited.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  Inherited from parent
                </div>
                <div className="space-y-1">
                  {inherited.flatMap((g) =>
                    g.entries.map((e) => (
                      <div
                        key={`${g.docId}:${e.subjectType}:${e.subjectId}`}
                        className="flex items-center gap-2 px-1 text-xs text-muted"
                      >
                        <span className="flex-1 truncate">
                          {e.subjectType === "user"
                            ? e.label || e.subjectId
                            : aclRoleLabel(e.subjectId, e.label, jobPositions)}
                        </span>
                        <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px]">
                          {LEVELS.find((l) => l.value === normalizeLevel(e.level))?.label ??
                            normalizeLevel(e.level)}
                        </span>
                        <span className="truncate text-[10px] text-subtle">
                          ← {g.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-panel-hover"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="brand-gradient flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Save changes
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(<AnimatePresence>{body}</AnimatePresence>, document.body);
}
