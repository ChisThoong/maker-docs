import { getDb, COL } from "./mongodb";

export interface DocProfile {
  email: string;
  /** Custom avatar URL uploaded by the user (overrides Google avatar). */
  avatarUrl?: string | null;
  /** Custom display name (overrides Google / member name). */
  displayName?: string | null;
  bio?: string | null;
  /** Admin-set workspace role override: "admin" | "editor" | "viewer". */
  workspaceRole?: string | null;
  favorites?: string[];
  recents?: string[];
  updatedAt?: string;
}

export interface PersonDisplay {
  displayName?: string | null;
  image?: string | null;
}

/** Display overrides and avatars keyed by lowercase email. */
export async function getPersonDisplayMap(
  emails: (string | null | undefined)[]
): Promise<Map<string, PersonDisplay>> {
  const keys = [
    ...new Set(
      emails
        .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
        .map((e) => e.trim().toLowerCase())
    ),
  ];
  const map = new Map<string, PersonDisplay>();
  if (!keys.length) return map;

  const db = await getDb();
  const [profiles, users] = await Promise.all([
    db
      .collection<DocProfile>(COL.profiles)
      .find(
        { email: { $in: keys } },
        { projection: { _id: 0, email: 1, avatarUrl: 1, displayName: 1 } }
      )
      .toArray(),
    db
      .collection<{ email: string; image?: string | null }>("users")
      .find(
        { email: { $in: keys } },
        { projection: { _id: 0, email: 1, image: 1 } }
      )
      .toArray(),
  ]);

  for (const u of users) {
    if (!u.email) continue;
    map.set(u.email.toLowerCase(), { image: u.image ?? null });
  }

  for (const p of profiles) {
    const key = p.email.toLowerCase();
    const existing = map.get(key) ?? {};
    map.set(key, {
      ...existing,
      displayName: p.displayName ?? null,
      image: p.avatarUrl ?? existing.image ?? null,
    });
  }

  return map;
}

/** Set (or clear) a user's workspace role override. Admin-gated by callers. */
export async function setWorkspaceRole(
  email: string,
  role: string | null
): Promise<void> {
  const db = await getDb();
  await db
    .collection<DocProfile>(COL.profiles)
    .updateOne(
      { email },
      { $set: { workspaceRole: role, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
}

export async function getProfile(email: string): Promise<DocProfile | null> {
  const db = await getDb();
  const doc = await db
    .collection<DocProfile>(COL.profiles)
    .findOne({ email }, { projection: { _id: 0 } });
  return doc ?? null;
}

export async function upsertProfile(
  email: string,
  patch: Partial<Omit<DocProfile, "email">>
): Promise<DocProfile> {
  const db = await getDb();
  const clean: Partial<DocProfile> = {};
  if (patch.avatarUrl !== undefined) clean.avatarUrl = patch.avatarUrl;
  if (patch.displayName !== undefined) clean.displayName = patch.displayName;
  if (patch.bio !== undefined) clean.bio = patch.bio;
  if (patch.favorites !== undefined) clean.favorites = patch.favorites;
  if (patch.recents !== undefined) clean.recents = patch.recents;
  clean.updatedAt = new Date().toISOString();

  await db
    .collection<DocProfile>(COL.profiles)
    .updateOne({ email }, { $set: clean }, { upsert: true });

  return (await getProfile(email))!;
}
