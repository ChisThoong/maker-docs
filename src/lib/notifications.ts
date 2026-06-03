import { nanoid } from "nanoid";
import { getDb, COL } from "./mongodb";
import type { AccessLevel, ACEntry } from "./acl";
import type { Notification } from "./notification-types";
import { listMembers } from "./members";
import { jobPositionSlug } from "./job-positions";

export type { Notification } from "./notification-types";
export { LEVEL_LABEL } from "./notification-types";

interface NotificationRecord extends Omit<Notification, "id"> {
  _id: string;
}

const LEVEL_RANK: Record<AccessLevel, number> = {
  viewer: 1,
  commenter: 1,
  editor: 2,
  admin: 3,
};

function entryKey(e: ACEntry): string {
  return `${e.subjectType}:${e.subjectId.toLowerCase()}`;
}

function toNotification(r: NotificationRecord): Notification {
  return {
    id: r._id,
    recipientEmail: r.recipientEmail,
    type: r.type,
    docId: r.docId,
    docTitle: r.docTitle,
    docPath: r.docPath,
    sharedByEmail: r.sharedByEmail,
    sharedByName: r.sharedByName,
    level: r.level,
    read: r.read,
    createdAt: r.createdAt,
  };
}

async function col() {
  const db = await getDb();
  return db.collection<NotificationRecord>(COL.notifications);
}

export async function getMemberName(email: string): Promise<string> {
  const members = await listMembers();
  const hit = members.find((m) => m.email.toLowerCase() === email.toLowerCase());
  return hit?.name ?? email.split("@")[0];
}

function isNewOrUpgrade(prev: ACEntry | undefined, next: ACEntry): boolean {
  if (!prev) return true;
  return LEVEL_RANK[next.level] > LEVEL_RANK[prev.level];
}

async function resolveRecipients(
  entry: ACEntry,
  actorEmail: string
): Promise<string[]> {
  const actor = actorEmail.toLowerCase();

  if (entry.subjectType === "user") {
    const email = entry.subjectId.toLowerCase();
    return email !== actor ? [email] : [];
  }

  const members = await listMembers();
  const roleId = entry.subjectId.toLowerCase();

  if (roleId === "everyone") {
    return members.map((m) => m.email.toLowerCase()).filter((e) => e !== actor);
  }

  if (roleId.startsWith("job:")) {
    return members
      .filter(
        (m) => m.jobPosition && jobPositionSlug(m.jobPosition) === roleId
      )
      .map((m) => m.email.toLowerCase())
      .filter((e) => e !== actor);
  }

  return members
    .filter((m) => m.role?.toLowerCase() === roleId)
    .map((m) => m.email.toLowerCase())
    .filter((e) => e !== actor);
}

/** Notify users who received new or upgraded direct grants on a document. */
export async function notifyShareGrants(opts: {
  docId: string;
  docTitle: string;
  docPath: string;
  actorEmail: string;
  actorName: string;
  previous: ACEntry[];
  next: ACEntry[];
}): Promise<void> {
  const prevMap = new Map(opts.previous.map((e) => [entryKey(e), e]));
  const notifyEntries = opts.next.filter((e) =>
    isNewOrUpgrade(prevMap.get(entryKey(e)), e)
  );
  if (!notifyEntries.length) return;

  const recipientLevels = new Map<string, AccessLevel>();

  for (const entry of notifyEntries) {
    const emails = await resolveRecipients(entry, opts.actorEmail);
    for (const email of emails) {
      const cur = recipientLevels.get(email);
      if (!cur || LEVEL_RANK[entry.level] > LEVEL_RANK[cur]) {
        recipientLevels.set(email, entry.level);
      }
    }
  }

  if (!recipientLevels.size) return;

  const c = await col();
  const now = new Date().toISOString();
  const records: NotificationRecord[] = [];

  for (const [recipientEmail, level] of recipientLevels) {
    records.push({
      _id: nanoid(12),
      recipientEmail,
      type: "share",
      docId: opts.docId,
      docTitle: opts.docTitle,
      docPath: opts.docPath,
      sharedByEmail: opts.actorEmail.toLowerCase(),
      sharedByName: opts.actorName,
      level,
      read: false,
      createdAt: now,
    });
  }

  await c.insertMany(records);
}

export async function listNotifications(
  email: string,
  limit = 30
): Promise<Notification[]> {
  const c = await col();
  const rows = await c
    .find({ recipientEmail: email.toLowerCase() })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return rows.map(toNotification);
}

export async function countUnread(email: string): Promise<number> {
  const c = await col();
  return c.countDocuments({
    recipientEmail: email.toLowerCase(),
    read: false,
  });
}

export async function markNotificationRead(
  id: string,
  email: string
): Promise<boolean> {
  const c = await col();
  const r = await c.updateOne(
    { _id: id, recipientEmail: email.toLowerCase() },
    { $set: { read: true } }
  );
  return r.matchedCount > 0;
}

export async function markAllNotificationsRead(email: string): Promise<void> {
  const c = await col();
  await c.updateMany(
    { recipientEmail: email.toLowerCase(), read: false },
    { $set: { read: true } }
  );
}
