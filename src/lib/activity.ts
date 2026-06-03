import { nanoid } from "nanoid";
import { getDb, COL } from "./mongodb";
import type { DocStatus } from "./types";

export type ActivityAction = "created" | "updated" | "status_changed";

export interface ActivityRecord {
  id: string;
  docId: string;
  docTitle: string;
  actorEmail: string;
  action: ActivityAction;
  status: DocStatus;
  previousStatus?: DocStatus | null;
  createdAt: string;
}

interface ActivityDoc {
  _id: string;
  docId: string;
  docTitle: string;
  actorEmail: string;
  action: ActivityAction;
  status: DocStatus;
  previousStatus?: DocStatus | null;
  createdAt: string;
}

async function col() {
  const db = await getDb();
  return db.collection<ActivityDoc>(COL.activity);
}

export async function logActivity(input: {
  docId: string;
  docTitle: string;
  actorEmail: string;
  action: ActivityAction;
  status: DocStatus;
  previousStatus?: DocStatus | null;
}): Promise<void> {
  const c = await col();
  await c.insertOne({
    _id: nanoid(12),
    docId: input.docId,
    docTitle: input.docTitle,
    actorEmail: input.actorEmail.toLowerCase(),
    action: input.action,
    status: input.status,
    previousStatus: input.previousStatus ?? null,
    createdAt: new Date().toISOString(),
  });
}

/** Admin: all activity. Others: only for visible doc ids. Optional actor filter. */
export async function listActivity(
  visibleDocIds: string[] | null,
  limit = 20,
  options?: { actorEmail?: string }
): Promise<ActivityRecord[]> {
  const c = await col();
  const filter: Record<string, unknown> = {};

  if (visibleDocIds !== null) {
    filter.docId = {
      $in: visibleDocIds.length ? visibleDocIds : ["__none__"],
    };
  }
  if (options?.actorEmail) {
    filter.actorEmail = options.actorEmail.toLowerCase();
  }

  const rows = await c
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return rows.map((r) => ({
    id: r._id,
    docId: r.docId,
    docTitle: r.docTitle,
    actorEmail: r.actorEmail,
    action: r.action,
    status: r.status,
    previousStatus: r.previousStatus ?? null,
    createdAt: r.createdAt,
  }));
}

export function activityVerb(action: ActivityAction, status: DocStatus): string {
  if (action === "created") return "created a draft of";
  if (action === "status_changed") {
    const map: Record<DocStatus, string> = {
      concept: "updated draft for",
      in_dev: "moved to In Development:",
      review: "sent for review:",
      locked: "locked design for",
      shipped: "shipped",
      tbd: "marked TBD for",
    };
    return map[status] ?? "updated status for";
  }
  return "updated";
}
