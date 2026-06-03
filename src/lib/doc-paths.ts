import type { DocMeta } from "./types";

/** URL segment from a document title, e.g. "Team Rules" → "Team-Rules". */
export function pathSegmentFromTitle(title: string): string {
  const raw = title
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!raw) return "Untitled";

  if (!/\s/.test(raw)) {
    const cleaned = raw.replace(/[^\w.-]/g, "");
    if (!cleaned) return "Untitled";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return raw
    .split(/\s+/)
    .map((w) => w.replace(/[^\w.-]/g, ""))
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("-");
}

export function buildDocPath(docId: string, metas: DocMeta[]): string {
  const byId = new Map(metas.map((m) => [m.id, m]));
  const segments: string[] = [];
  let cur = byId.get(docId);
  const guard = new Set<string>();

  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    segments.unshift(pathSegmentFromTitle(cur.title));
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  return segments.length ? `/${segments.join("/")}` : "/";
}

export function resolveDocIdByPath(segments: string[], metas: DocMeta[]): string | null {
  if (!segments.length) return null;

  const byParent = new Map<string | null, DocMeta[]>();
  for (const m of metas) {
    const key = m.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  }

  function walk(parentId: string | null, index: number): string | null {
    const target = segments[index];
    const siblings = byParent.get(parentId) ?? [];
    const matches = siblings.filter(
      (m) => pathSegmentFromTitle(m.title) === target
    );
    if (matches.length !== 1) return null;
    const node = matches[0];
    if (index === segments.length - 1) return node.id;
    return walk(node.id, index + 1);
  }

  return walk(null, 0);
}
