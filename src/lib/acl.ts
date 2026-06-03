import { getDb, COL } from "./mongodb";

export type AccessLevel = "viewer" | "commenter" | "editor" | "admin";
export type SubjectType = "role" | "user";

export interface ACEntry {
  subjectType: SubjectType;
  /** role name (e.g. "editor", "everyone") or user email for "user" entries. */
  subjectId: string;
  level: AccessLevel;
  /** Optional display label (name) for UI — purely cosmetic. */
  label?: string | null;
}

interface ACLRecord extends ACEntry {
  docId: string;
  createdAt: string;
  createdBy?: string | null;
}

async function col() {
  const db = await getDb();
  return db.collection<ACLRecord>(COL.acl);
}

function clean(e: ACEntry): ACEntry {
  return {
    subjectType: e.subjectType === "user" ? "user" : "role",
    subjectId:
      e.subjectType === "user"
        ? e.subjectId.trim().toLowerCase()
        : e.subjectId.trim().toLowerCase(),
    level: e.level,
    label: e.label ?? null,
  };
}

/** All ACL entries grouped by docId. Pass `ids` to limit the query. */
export async function getAclMap(
  ids?: string[]
): Promise<Map<string, ACEntry[]>> {
  const c = await col();
  const filter = ids && ids.length ? { docId: { $in: ids } } : {};
  const rows = await c.find(filter).toArray();
  const map = new Map<string, ACEntry[]>();
  for (const r of rows) {
    const list = map.get(r.docId) ?? [];
    list.push({
      subjectType: r.subjectType,
      subjectId: r.subjectId,
      level: r.level,
      label: r.label ?? null,
    });
    map.set(r.docId, list);
  }
  return map;
}

export async function getAclEntries(docId: string): Promise<ACEntry[]> {
  const c = await col();
  const rows = await c.find({ docId }).toArray();
  return rows.map((r) => ({
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    level: r.level,
    label: r.label ?? null,
  }));
}

/** Replace the full set of direct grants on a document. */
export async function setAclEntries(
  docId: string,
  entries: ACEntry[],
  actor?: string | null
): Promise<ACEntry[]> {
  const c = await col();
  const now = new Date().toISOString();

  // De-dup by subjectType+subjectId (last one wins).
  const byKey = new Map<string, ACEntry>();
  for (const raw of entries) {
    const e = clean(raw);
    if (!e.subjectId) continue;
    byKey.set(`${e.subjectType}:${e.subjectId}`, e);
  }

  await c.deleteMany({ docId });
  const records: ACLRecord[] = [...byKey.values()].map((e) => ({
    docId,
    ...e,
    createdAt: now,
    createdBy: actor ?? null,
  }));
  if (records.length) await c.insertMany(records);
  return [...byKey.values()];
}

/** Remove every ACL entry for the given doc ids (used on delete). */
export async function deleteAclForDocs(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const c = await col();
  await c.deleteMany({ docId: { $in: ids } });
}
