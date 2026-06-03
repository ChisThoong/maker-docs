import { getProfile, upsertProfile } from "./profiles";

const MAX_RECENTS = 12;

export interface UserPrefs {
  favorites: string[];
  recents: string[];
}

export async function getUserPrefs(email: string): Promise<UserPrefs> {
  const p = await getProfile(email);
  return {
    favorites: p?.favorites ?? [],
    recents: p?.recents ?? [],
  };
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
  await upsertProfile(email, { recents });
  return { ...current, recents };
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
  await upsertProfile(email, { favorites });
  return { ...current, favorites };
}

/** Keep only ids the user can still access. */
export function filterVisibleIds(ids: string[], visible: Set<string>): string[] {
  return ids.filter((id) => visible.has(id));
}
