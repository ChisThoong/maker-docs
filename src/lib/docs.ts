import { nanoid } from "nanoid";
import { getDb, COL } from "./mongodb";
import { SEED_DOCS } from "./seedData";
import type {
  Doc,
  DocMeta,
  DocStatus,
  DocType,
  ContentMode,
  DocVisibility,
  DocFileMeta,
} from "./types";

const COLLECTION = COL.documents;

interface DocRecord {
  _id: string;
  title: string;
  subtitle?: string;
  type: DocType;
  parentId: string | null;
  order: number;
  status: DocStatus;
  icon: string;
  tags: string[];
  content: string;
  contentMode: ContentMode;
  file?: DocFileMeta | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  visibility?: DocVisibility;
  publicId?: string | null;
}

function toMeta(r: DocRecord): DocMeta {
  return {
    id: r._id,
    title: r.title,
    subtitle: r.subtitle,
    type: r.type,
    parentId: r.parentId,
    order: r.order,
    status: r.status,
    icon: r.icon,
    tags: r.tags ?? [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: r.createdBy ?? null,
    visibility: r.visibility ?? "inherit",
  };
}

function toDoc(r: DocRecord): Doc {
  return {
    ...toMeta(r),
    content: r.content ?? "",
    contentMode: r.contentMode ?? "html",
    file: r.file ?? null,
    publicId: r.publicId ?? null,
  };
}

async function col() {
  const db = await getDb();
  return db.collection<DocRecord>(COLLECTION);
}

let seedChecked = false;

async function ensureSeeded() {
  if (seedChecked) return;
  const c = await col();
  const count = await c.countDocuments();
  if (count === 0) {
    const now = new Date().toISOString();
    const records: DocRecord[] = SEED_DOCS.map((s) => ({
      ...s,
      createdAt: now,
      updatedAt: now,
    }));
    await c.insertMany(records);
  }
  seedChecked = true;
}

export async function listDocs(): Promise<DocMeta[]> {
  const c = await col();
  await ensureSeeded();
  const rows = await c
    .find({}, { projection: { content: 0 } })
    .sort({ order: 1 })
    .toArray();
  return rows.map((r) => toMeta(r as DocRecord));
}

export async function getDoc(id: string): Promise<Doc | null> {
  const c = await col();
  const r = await c.findOne({ _id: id });
  return r ? toDoc(r as DocRecord) : null;
}

export interface CreateDocInput {
  title?: string;
  type?: DocType;
  parentId?: string | null;
  status?: DocStatus;
  icon?: string;
  tags?: string[];
  content?: string;
  contentMode?: ContentMode;
  file?: DocFileMeta | null;
  subtitle?: string;
  createdBy?: string | null;
}

export async function createDoc(input: CreateDocInput): Promise<Doc> {
  const c = await col();
  const now = new Date().toISOString();
  const parentId = input.parentId ?? null;

  const last = await c
    .find({ parentId })
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  const order = last.length ? (last[0].order ?? 0) + 1 : 0;

  const record: DocRecord = {
    _id: nanoid(10),
    title: input.title?.trim() || "Untitled",
    subtitle: input.subtitle,
    type: input.type ?? "doc",
    parentId,
    order,
    status: input.status ?? "concept",
    icon: input.icon ?? "",
    tags: input.tags ?? [],
    content: input.content ?? "",
    contentMode: input.contentMode ?? "html",
    file: input.file ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy ?? null,
    visibility: "inherit",
  };
  await c.insertOne(record);
  return toDoc(record);
}

/** Enable/disable a public share link. Returns the public token (or null). */
export async function setPublicShare(
  id: string,
  enabled: boolean
): Promise<string | null> {
  const c = await col();
  const now = new Date().toISOString();
  if (!enabled) {
    await c.updateOne({ _id: id }, { $set: { publicId: null, updatedAt: now } });
    return null;
  }
  const existing = await c.findOne({ _id: id }, { projection: { publicId: 1 } });
  const token = (existing as DocRecord | null)?.publicId || nanoid(16);
  await c.updateOne({ _id: id }, { $set: { publicId: token, updatedAt: now } });
  return token;
}

/** Fetch a document by its public share token (no permission checks). */
export async function getDocByPublicId(token: string): Promise<Doc | null> {
  if (!token) return null;
  const c = await col();
  const r = await c.findOne({ publicId: token });
  return r ? toDoc(r as DocRecord) : null;
}

/** Set a document's visibility (used by the permissions endpoint). */
export async function setDocVisibility(
  id: string,
  visibility: DocVisibility
): Promise<void> {
  const c = await col();
  await c.updateOne(
    { _id: id },
    { $set: { visibility, updatedAt: new Date().toISOString() } }
  );
}

export type UpdateDocInput = Partial<
  Pick<
    DocRecord,
    | "title"
    | "subtitle"
    | "type"
    | "parentId"
    | "order"
    | "status"
    | "icon"
    | "tags"
    | "content"
    | "contentMode"
    | "file"
  >
>;

export async function updateDoc(
  id: string,
  patch: UpdateDocInput
): Promise<Doc | null> {
  const c = await col();
  const update = { ...patch, updatedAt: new Date().toISOString() };
  await c.updateOne({ _id: id }, { $set: update });
  return getDoc(id);
}

export async function deleteDoc(id: string): Promise<string[]> {
  const c = await col();
  const all = await c.find({}, { projection: { _id: 1, parentId: 1 } }).toArray();
  const childrenMap = new Map<string | null, string[]>();
  for (const r of all) {
    const p = (r as DocRecord).parentId;
    if (!childrenMap.has(p)) childrenMap.set(p, []);
    childrenMap.get(p)!.push((r as DocRecord)._id);
  }
  const toDelete: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    toDelete.push(cur);
    const kids = childrenMap.get(cur) ?? [];
    stack.push(...kids);
  }
  await c.deleteMany({ _id: { $in: toDelete } });
  return toDelete;
}

export async function reorderDocs(
  updates: { id: string; parentId: string | null; order: number }[]
): Promise<void> {
  const c = await col();
  const now = new Date().toISOString();
  await Promise.all(
    updates.map((u) =>
      c.updateOne(
        { _id: u.id },
        { $set: { parentId: u.parentId, order: u.order, updatedAt: now } }
      )
    )
  );
}

export async function countDocs(): Promise<number> {
  const c = await col();
  return c.countDocuments();
}
