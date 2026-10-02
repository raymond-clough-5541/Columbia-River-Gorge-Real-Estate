"use client";

import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/* Watchlist — starred listings persisted to localStorage.             */
/* Follows the same lint-safe useSyncExternalStore pattern as the      */
/* saved-scenario store in projections.tsx: a cached parse keyed on the */
/* raw storage string so getSnapshot stays referentially stable.       */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "crgnsa-watchlist";
const CHANGE_EVENT = "crgnsa:watchlist-changed";
const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cachedList: string[] = EMPTY;

function readList(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cachedList = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

function writeList(list: string[]): void {
  cachedRaw = null; // force re-parse on next read
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* storage unavailable — ignore */
  }
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Live list of starred listing ids (reactive across components). */
export function useWatchlist(): string[] {
  return useSyncExternalStore(subscribe, readList, () => EMPTY);
}

/** Returns true when the id is currently starred. */
export function isWatched(id: string): boolean {
  return readList().includes(id);
}

/** Toggle a listing's star. Returns the new starred state. */
export function toggleWatchlist(id: string): boolean {
  const list = readList();
  const watched = list.includes(id);
  writeList(watched ? list.filter((x) => x !== id) : [...list, id]);
  return !watched;
}
