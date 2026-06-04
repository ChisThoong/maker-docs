"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, FileWarning } from "lucide-react";
import type { Doc, DocFileMeta, DocMeta, DocStatus, ContentMode } from "@/lib/types";
import { useDocs } from "./DocsProvider";
import ShareModal from "./ShareModal";
import DocEditor from "./DocEditor";
import DocReadView from "./DocReadView";
import { usePrefs, toggleFavorite, recordVisit } from "@/lib/prefs";
import { toast } from "@/lib/ui-feedback";
import { normalizeExternalUrl } from "@/lib/content-embed";

interface DocAccess {
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateChild: boolean;
  canManagePerms: boolean;
}

export default function DocView({ id }: { id: string }) {
  const { docs, patchMeta } = useDocs();
  const prefs = usePrefs();
  const isFav = prefs.favorites.includes(id);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [docPath, setDocPath] = useState("");
  const [access, setAccess] = useState<DocAccess | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [icon, setIcon] = useState("");
  const [status, setStatus] = useState<DocStatus>("concept");
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [contentMode, setContentMode] = useState<ContentMode>("html");
  const [file, setFile] = useState<DocFileMeta | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    const res = await fetch(`/api/docs/${id}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.doc) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const d: Doc = data.doc;
    setDoc(d);
    setDocPath(typeof data.path === "string" ? data.path : "");
    setAccess((data.access as DocAccess) ?? null);
    setTitle(d.title);
    setSubtitle(d.subtitle ?? "");
    setIcon(d.icon ?? "");
    setStatus(d.status);
    setTags(d.tags ?? []);
    setContent(d.content ?? "");
    setContentMode(d.contentMode ?? "html");
    setFile(d.file ?? null);
    setEditing(false);
    setLoading(false);
    window.setTimeout(() => recordVisit(id), 0);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const breadcrumb = useMemo(() => {
    const byId = new Map(docs.map((d) => [d.id, d]));
    const chain: DocMeta[] = [];
    let cur = byId.get(id);
    while (cur?.parentId) {
      const p = byId.get(cur.parentId);
      if (!p) break;
      chain.unshift(p);
      cur = p;
    }
    return chain;
  }, [docs, id]);

  async function handleSave() {
    if (!doc) return;
    if (contentMode === "url") {
      const url = normalizeExternalUrl(content);
      if (!url) {
        toast.error("Enter a valid http(s) URL");
        return;
      }
    }
    setSaving(true);
    const patch = {
      title: title.trim() || "Untitled",
      subtitle,
      icon,
      status,
      tags,
      content: contentMode === "url" ? normalizeExternalUrl(content)! : content,
      contentMode,
      file,
    };
    const res = await fetch(`/api/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setDoc(data.doc);
      if (typeof data.path === "string") setDocPath(data.path);
      patchMeta(id, {
        title: patch.title,
        icon: patch.icon,
        status: patch.status,
        tags: patch.tags,
      });
      setEditing(false);
    }
  }

  function copyLink() {
    const path = docPath || `/doc/${id}`;
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  const tagList = tags;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-subtle">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-subtle">
        <FileWarning size={40} />
        <p>Document not found.</p>
        <Link
          href="/"
          className="brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <>
        {shareOpen && (
          <ShareModal
            docId={id}
            docTitle={doc.title}
            onClose={() => {
              setShareOpen(false);
              load();
            }}
          />
        )}
        <DocEditor
          title={title}
          subtitle={subtitle}
          icon={icon}
          status={status}
          tags={tagList}
          content={content}
          contentMode={contentMode}
          file={file}
          updatedAt={doc.updatedAt}
          saving={saving}
          onTitle={setTitle}
          onSubtitle={setSubtitle}
          onIcon={setIcon}
          onStatus={setStatus}
          onTags={setTags}
          onContent={setContent}
          onContentMode={setContentMode}
          onFile={setFile}
          onCancel={() => load()}
          onSave={handleSave}
        />
      </>
    );
  }

  return (
    <>
      {shareOpen && (
        <ShareModal
          docId={id}
          docTitle={doc.title}
          onClose={() => {
            setShareOpen(false);
            load();
          }}
        />
      )}
      <DocReadView
        doc={doc}
        breadcrumb={breadcrumb}
        access={access}
        isFav={isFav}
        copied={copied}
        onToggleFavorite={() => toggleFavorite(id)}
        onCopyLink={copyLink}
        onShare={() => setShareOpen(true)}
        onEdit={() => setEditing(true)}
      />
    </>
  );
}
