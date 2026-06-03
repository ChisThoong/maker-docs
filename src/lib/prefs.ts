"use client";

import { useSyncExternalStore } from "react";

interface Prefs {
  favorites: string[];
  recents: string[];
}

let state: Prefs = { favorites: [], recents: [] };
let hydrated = false;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function fetchPrefs() {
  if (loading) return;
  loading = true;
  try {
    const res = await fetch("/api/user/prefs", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      state = {
        favorites: data.favorites ?? [],
        recents: data.recents ?? [],
      };
      hydrated = true;
      emit();
    }
  } catch {
    /* ignore */
  } finally {
    loading = false;
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  void fetchPrefs();
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const EMPTY: Prefs = { favorites: [], recents: [] };

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return state;
    },
    () => EMPTY
  );
}

export function toggleFavorite(id: string) {
  hydrate();
  const has = state.favorites.includes(id);
  state = {
    ...state,
    favorites: has
      ? state.favorites.filter((x) => x !== id)
      : [id, ...state.favorites],
  };
  emit();
  void fetch("/api/user/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toggleFavorite: id }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) {
        state = {
          favorites: data.favorites ?? state.favorites,
          recents: data.recents ?? state.recents,
        };
        emit();
      }
    })
    .catch(() => {});
}

export function recordVisit(id: string) {
  hydrate();
  state = {
    ...state,
    recents: [id, ...state.recents.filter((x) => x !== id)].slice(0, 12),
  };
  emit();
  void fetch("/api/user/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visit: id }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) {
        state = {
          favorites: data.favorites ?? state.favorites,
          recents: data.recents ?? state.recents,
        };
        emit();
      }
    })
    .catch(() => {});
}

export function isFavorite(id: string): boolean {
  hydrate();
  return state.favorites.includes(id);
}
