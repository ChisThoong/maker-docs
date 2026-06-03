import { getDb, COL } from "./mongodb";
import type { DocProfile } from "./profiles";

const MAX_RECENTS = 12;

export interface UserPrefs {
  favorites: string[];
  recents: string[];
}

function toPrefs(doc: Pick<DocProfile, "favorites" | "recents"> | null): UserPrefs {
  return {
    favorites: doc?.favorites ?? [],
    recents: doc?.recents ?? [],
  };
}

export async function getUserPrefs(email: string): Promise<UserPrefs> {
  const db = await getDb();
  const doc = await db
    .collection<DocProfile>(COL.profiles)
    .findOne(
      { email },
      { projection: { _id: 0, favorites: 1, recents: 1 } }
    );
  return toPrefs(doc);
}

async function savePrefs(
  email: string,
  patch: Partial<Pick<DocProfile, "favorites" | "recents">>
): Promise<UserPrefs> {
  const db = await getDb();
  const doc = await db.collection<DocProfile>(COL.profiles).findOneAndUpdate(
    { email },
    {
      $set: { ...patch, updatedAt: new Date().toISOString() },
      $setOnInsert: { email },
    },
    {
      upsert: true,
      returnDocument: "after",
      projection: { _id: 0, favorites: 1, recents: 1 },
    }
  );
  return toPrefs(doc);
}

export async function recordDocVisit(
  email: string,
  docId: string
): Promise<UserPrefs> {
  const current = await getUserPrefs(email);
  const recents = [
    docId,
    ...current.recents.filter((id) => id !== docId),
  ].slice(0, MAX_RECENTS);
  return savePrefs(email, { recents, favorites: current.favorites });
}

export async function toggleDocFavorite(
  email: string,
  docId: string
): Promise<UserPrefs> {
  const current = await getUserPrefs(email);
  const has = current.favorites.includes(docId);
  const favorites = has
    ? current.favorites.filter((id) => id !== docId)
    : [docId, ...current.favorites];
  return savePrefs(email, { favorites, recents: current.recents });
}

/** Keep only ids the user can still access. */
export function filterVisibleIds(ids: string[], visible: Set<string>): string[] {
  return ids.filter((id) => visible.has(id));
}
