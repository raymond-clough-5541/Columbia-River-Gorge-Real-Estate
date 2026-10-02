/**
 * Recent-destinations memory (round 13) — a tiny localStorage-backed
 * stack shared by the router (records) and the command palette
 * (renders + clears). Caps at 5 entries, dedupes repeat destinations
 * (the most recent visit wins).
 *
 * Exposed as a subscribable external store so consumers read it with
 * useSyncExternalStore — no setState-in-effect, hydration-safe (the
 * server snapshot is always the empty list; the client syncs on mount).
 */

export interface RecentDestination {
  /** Canonical hash, query-stripped: "#/matrix", "#/submarket/hood-river". */
  hash: string;
  /** Epoch milliseconds of the visit. */
  at: number;
}

const KEY = "crgnsa-recents-v1";
const MAX = 5;
const EMPTY: RecentDestination[] = [];

/* ------------------------- storage layer ------------------------- */

function readFromStorage(): RecentDestination[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (x): x is RecentDestination =>
          typeof x?.hash === "string" && typeof x?.at === "number"
      )
      .slice(0, MAX);
  } catch {
    // Corrupt payload or storage unavailable (private mode) — start fresh.
    return EMPTY;
  }
}

function writeToStorage(list: RecentDestination[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota / privacy mode — memory of destinations is best-effort only.
  }
}

/* --------------------- external-store surface --------------------- */

/** In-memory mirror so getSnapshot stays referentially stable. */
let cache: RecentDestination[] | null = null;
const listeners = new Set<() => void>();

function emitChange(): void {
  cache = null;
  for (const listener of listeners) listener();
}

/** getSnapshot for useSyncExternalStore — stable until a write fires. */
export function recentsSnapshot(): RecentDestination[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

/** getServerSnapshot — the server never has destination memory. */
export function recentsServerSnapshot(): RecentDestination[] {
  return EMPTY;
}

/** subscribe for useSyncExternalStore — re-reads on every local write. */
export function subscribeRecents(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/* ---------------------------- writes ----------------------------- */

export function pushRecent(hash: string): void {
  const next = [
    { hash, at: Date.now() },
    ...readFromStorage().filter((r) => r.hash !== hash),
  ].slice(0, MAX);
  writeToStorage(next);
  emitChange();
}

export function clearRecents(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  emitChange();
}

/** Compact relative-time formatter for palette display. */
export function relTime(at: number): string {
  const s = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
