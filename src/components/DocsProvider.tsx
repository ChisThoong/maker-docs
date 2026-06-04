"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ContentMode, DocFileMeta, DocMeta, SpineBundleMeta } from "@/lib/types";

interface CreateInput {
  title?: string;
  type?: DocMeta["type"];
  parentId?: string | null;
  status?: DocMeta["status"];
  icon?: string;
  tags?: string[];
  content?: string;
  contentMode?: ContentMode;
  file?: DocFileMeta | null;
  spine?: SpineBundleMeta | null;
  subtitle?: string;
}

export type WorkspaceRole = "viewer" | "editor" | "admin";

interface DocsContextValue {
  docs: DocMeta[];
  loading: boolean;
  error: string | null;
  workspaceRole: WorkspaceRole;
  canCreate: boolean;
  refresh: () => Promise<boolean>;
  create: (input: CreateInput) => Promise<DocMeta | null>;
  patchMeta: (id: string, patch: Partial<DocMeta>) => void;
  remove: (id: string) => Promise<boolean>;
  childrenOf: (parentId: string | null) => DocMeta[];
}

const DocsContext = createContext<DocsContextValue | null>(null);

export function DocsProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole>("viewer");
  const [canCreate, setCanCreate] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/docs", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocs(data.docs ?? []);
      setWorkspaceRole((data.workspaceRole as WorkspaceRole) ?? "viewer");
      setCanCreate(!!data.canCreate);
      setError(null);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function tryLoad() {
      const ok = await refresh();
      attempts += 1;
      // DB (embedded) may still be booting on first run — retry a few times
      if (!ok && !cancelled && attempts < 8) {
        setTimeout(tryLoad, 1500);
      }
    }
    tryLoad();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const create = useCallback(async (input: CreateInput) => {
    const res = await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc: DocMeta = data.doc;
    setDocs((prev) => [...prev, doc]);
    return doc;
  }, []);

  const patchMeta = useCallback((id: string, patch: Partial<DocMeta>) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      const deleted: string[] = data.deleted ?? [id];
      setDocs((prev) => prev.filter((d) => !deleted.includes(d.id)));
      return true;
    }
    return false;
  }, []);

  const childrenOf = useCallback(
    (parentId: string | null) =>
      docs
        .filter((d) => d.parentId === parentId)
        .sort((a, b) => a.order - b.order),
    [docs]
  );

  const value = useMemo(
    () => ({
      docs,
      loading,
      error,
      workspaceRole,
      canCreate,
      refresh,
      create,
      patchMeta,
      remove,
      childrenOf,
    }),
    [docs, loading, error, workspaceRole, canCreate, refresh, create, patchMeta, remove, childrenOf]
  );

  return <DocsContext.Provider value={value}>{children}</DocsContext.Provider>;
}

export function useDocs() {
  const ctx = useContext(DocsContext);
  if (!ctx) throw new Error("useDocs must be used within DocsProvider");
  return ctx;
}
