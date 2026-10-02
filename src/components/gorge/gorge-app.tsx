"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import type {
  PropertyListing,
  Region,
  Submarket,
} from "@/lib/gorge";
import {
  computeRegionStats,
  submarketsOfRegion,
  DEFAULT_REGION_SLUG,
} from "@/lib/gorge";
import { regionContent } from "@/lib/region-content";
import { pushRecent } from "@/lib/recents";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { MarketPulse } from "./market-pulse";
import { OverviewView } from "./overview";
import { MatrixView } from "./matrix";
import { ProjectionsView } from "./projections";
import { ListingsView } from "./listings-view";
import { SubmarketDetailView } from "./submarket-detail";
import { RegionsView } from "./regions";
import { KeyboardShortcuts } from "./shortcuts";
import { CommandPalette } from "./command-palette";

/* ---------------------------------------------------------------- */
/* Hash-based SPA router — keeps the whole experience on the `/`      */
/* route while giving each analytics workspace its own addressable    */
/* URL fragment (#/matrix, #/projections, #/submarket/hood-river…).   */
/*                                                                     */
/* Round 15 — region scoping: an optional /r/<region-slug> prefix      */
/* scopes every workspace to one registry region                       */
/* (#/r/puget-sound/matrix, #/r/puget-sound/submarket/sammamish…).      */
/* Bare routes keep meaning the DEFAULT region (the corridor), so      */
/* every share link minted before the region switch still resolves.    */
/* ---------------------------------------------------------------- */

export type Route =
  | { view: "overview"; region?: string }
  | { view: "matrix"; region?: string }
  | { view: "projections"; query?: string; region?: string }
  | { view: "listings"; region?: string }
  | { view: "submarket"; slug: string; region?: string }
  | { view: "regions"; region?: string };

export type NavigateFn = (route: Route) => void;

/** Canonical region for a route: undefined (bare hash) and the default
 *  slug both mean the corridor — the default never gets a /r/ prefix so
 *  there is exactly ONE hash per destination. */
function canonicalRegion(region: string | undefined): string | undefined {
  if (!region || region === DEFAULT_REGION_SLUG) return undefined;
  return region;
}

export function routeToHash(route: Route): string {
  const scope = canonicalRegion(route.region);
  const prefix = scope ? `/r/${scope}` : "";
  switch (route.view) {
    case "overview":
      return scope ? `#/r/${scope}/` : "#/";
    case "matrix":
      return `#${prefix}/matrix`;
    case "projections":
      // An optional hash query (share links, KPI drilldown presets) rides
      // along; parseHash strips it, the Projections view adopts it on mount.
      return route.query
        ? `#${prefix}/projections?${route.query}`
        : `#${prefix}/projections`;
    case "listings":
      return `#${prefix}/listings`;
    case "submarket":
      return `#${prefix}/submarket/${route.slug}`;
    case "regions":
      return "#/regions";
  }
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "").split("?")[0];
  let parts = clean.split("/").filter(Boolean);

  // Region scope prefix: /r/<slug>/… — normalized away for the default
  // region so bare corridor routes stay the canonical form.
  let region: string | undefined;
  if (parts[0] === "r" && parts[1]) {
    region = canonicalRegion(parts[1]);
    parts = parts.slice(2);
  }

  if (parts.length === 0) return { view: "overview", region };
  if (parts[0] === "matrix") return { view: "matrix", region };
  if (parts[0] === "projections") return { view: "projections", region };
  if (parts[0] === "listings") return { view: "listings", region };
  if (parts[0] === "regions") return { view: "regions" };
  if (parts[0] === "submarket" && parts[1]) {
    return { view: "submarket", slug: parts[1], region };
  }
  return { view: "overview", region };
}

export function routeKey(route: Route): string {
  const scope = canonicalRegion(route.region) ?? DEFAULT_REGION_SLUG;
  return route.view === "submarket"
    ? `${scope}-submarket-${route.slug}`
    : `${scope}-${route.view}`;
}

/* ---------------------------------------------------------------- */
/* Hash route as an external store — the hydration-safe way to read  */
/* window.location.hash. getServerSnapshot renders the overview on   */
/* the server AND during hydration, so the SSR tree always matches;  */
/* React then syncs to the client hash without throwing a mismatch.  */
/* The snapshot is memoized on the raw hash string so it stays        */
/* referentially stable between calls (a hard React requirement).     */
/* ---------------------------------------------------------------- */

const SERVER_ROUTE: Route = { view: "overview" };
let lastHashRaw = "";
let cachedRoute: Route = SERVER_ROUTE;

function getHashRoute(): Route {
  const current = window.location.hash;
  if (current !== lastHashRaw) {
    lastHashRaw = current;
    cachedRoute = parseHash(current);
  }
  return cachedRoute;
}

function subscribeHash(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export interface GorgeAppProps {
  submarkets: Submarket[];
  listings: PropertyListing[];
  regions: Region[];
}

/** Lint-safe scroll-position flag via useSyncExternalStore. */
function useIsScrolledPast(threshold: number): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      window.addEventListener("scroll", cb, { passive: true });
      return () => window.removeEventListener("scroll", cb);
    },
    []
  );
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    () => false
  );
}

function BackToTop() {
  const show = useIsScrolledPast(700);
  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border bg-card/95 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-accent active:scale-95"
        >
          <ArrowUp className="h-4.5 w-4.5" aria-hidden />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

export function GorgeApp({
  submarkets,
  listings,
  regions,
}: GorgeAppProps) {
  const route = useSyncExternalStore(subscribeHash, getHashRoute, () => SERVER_ROUTE);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    // Normalize an empty hash to "#/" once on mount.
    if (!window.location.hash) window.history.replaceState(null, "", "#/");
  }, []);

  // Round 13 — recent-destinations memory: every completed navigation
  // (anchor, palette jump, or goto sequence) lands here, capped + deduped
  // by the store. Query-stripped so share-link parameter changes never
  // spam the stack.
  useEffect(() => {
    pushRecent(routeToHash(route));
  }, [route]);

  const navigate: NavigateFn = useCallback((next: Route) => {
    // Setting the hash fires hashchange → the external store re-parses and
    // re-renders. Query-only replaceState (share links) deliberately skips
    // this because parseHash ignores the query — the route is unchanged.
    const hash = routeToHash(next);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, []);

  /* ------------------ Round 15 — region scoping ------------------ */
  // The active region resolves from the route (bare = corridor). All
  // downstream data is derived client-side from the full registry the
  // server already shipped — no refetch, instant region switches.
  const activeRegionSlug = route.region ?? DEFAULT_REGION_SLUG;
  const activeRegion = useMemo(
    () =>
      regions.find((r) => r.slug === activeRegionSlug) ?? {
        // Degenerate fallback keeps views alive even for an unknown slug.
        id: "",
        slug: activeRegionSlug,
        name: activeRegionSlug,
        country: "USA",
        statesProvinces: "",
        wave: "core",
        status: "live",
        scarcityHook: "",
        regulatoryContext: "",
        taxArbitrageNote: "",
        targetSubmarkets: 0,
        launchOrder: 999,
        launchedAt: null,
        aggregate: null,
      },
    [regions, activeRegionSlug]
  );

  const regionSubmarkets = useMemo(
    () => submarketsOfRegion(submarkets, activeRegion),
    [submarkets, activeRegion]
  );
  const regionListings = useMemo(
    () =>
      listings.filter((l) =>
        regionSubmarkets.some((s) => s.id === l.submarketId)
      ),
    [listings, regionSubmarkets]
  );
  const regionStats = useMemo(
    () => computeRegionStats(regionSubmarkets, regionListings.length),
    [regionSubmarkets, regionListings]
  );
  const content = useMemo(
    () => regionContent(activeRegionSlug),
    [activeRegionSlug]
  );

  // Region-preserving navigate: every in-view navigation (rows, chips,
  // leaderboard, comparables, shortcuts) keeps the active region unless
  // the caller explicitly targets another one or the registry view.
  const scopedNavigate: NavigateFn = useCallback(
    (next: Route) => {
      if (next.view === "regions") {
        navigate(next);
        return;
      }
      navigate({ ...next, region: next.region ?? activeRegionSlug });
    },
    [navigate, activeRegionSlug]
  );

  // Scroll to top whenever the workspace changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader
        route={route}
        regions={regions}
        activeRegionSlug={activeRegionSlug}
        navigate={navigate}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <KeyboardShortcuts
        navigate={scopedNavigate}
        helpOpen={shortcutsOpen}
        onHelpOpenChange={setShortcutsOpen}
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        navigate={navigate}
        submarkets={submarkets}
        listings={listings}
        regions={regions}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={routeKey(route)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {route.view === "overview" ? (
              <OverviewView
                submarkets={regionSubmarkets}
                stats={regionStats}
                listings={regionListings}
                navigate={scopedNavigate}
                content={content}
              />
            ) : null}
            {route.view === "matrix" ? (
              <MatrixView
                submarkets={regionSubmarkets}
                navigate={scopedNavigate}
                regionName={content.scopeWord}
              />
            ) : null}
            {route.view === "projections" ? (
              <ProjectionsView
                submarkets={regionSubmarkets}
                navigate={scopedNavigate}
                regionName={content.scopeWord}
              />
            ) : null}
            {route.view === "listings" ? (
              <ListingsView
                listings={regionListings}
                submarkets={regionSubmarkets}
                navigate={scopedNavigate}
                regionSlug={activeRegionSlug}
              />
            ) : null}
            {route.view === "submarket" ? (
              <SubmarketDetailView
                slug={route.slug}
                submarkets={regionSubmarkets}
                listings={regionListings}
                navigate={scopedNavigate}
                regionName={content.scopeWord}
              />
            ) : null}
            {route.view === "regions" ? (
              <RegionsView
                regions={regions}
                submarkets={submarkets}
                navigate={navigate}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
      <BackToTop />
      <SiteFooter
        navigate={scopedNavigate}
        pulse={
          <MarketPulse
            submarkets={regionSubmarkets}
            navigate={scopedNavigate}
            scopeWord={content.scopeWord}
          />
        }
      />
    </div>
  );
}
