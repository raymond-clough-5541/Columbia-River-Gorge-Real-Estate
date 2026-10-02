"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import type { CorridorStats, PropertyListing, Submarket } from "@/lib/gorge";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { OverviewView } from "./overview";
import { MatrixView } from "./matrix";
import { ProjectionsView } from "./projections";
import { ListingsView } from "./listings-view";
import { SubmarketDetailView } from "./submarket-detail";
import { KeyboardShortcuts } from "./shortcuts";

/* ---------------------------------------------------------------- */
/* Hash-based SPA router — keeps the whole experience on the `/`      */
/* route while giving each analytics workspace its own addressable    */
/* URL fragment (#/matrix, #/projections, #/submarket/hood-river…).   */
/* ---------------------------------------------------------------- */

export type Route =
  | { view: "overview" }
  | { view: "matrix" }
  | { view: "projections"; query?: string }
  | { view: "listings" }
  | { view: "submarket"; slug: string };

export type NavigateFn = (route: Route) => void;

export function routeToHash(route: Route): string {
  switch (route.view) {
    case "overview":
      return "#/";
    case "matrix":
      return "#/matrix";
    case "projections":
      // An optional hash query (share links, KPI drilldown presets) rides
      // along; parseHash strips it, the Projections view adopts it on mount.
      return route.query ? `#/projections?${route.query}` : "#/projections";
    case "listings":
      return "#/listings";
    case "submarket":
      return `#/submarket/${route.slug}`;
  }
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "").split("?")[0];
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return { view: "overview" };
  if (parts[0] === "matrix") return { view: "matrix" };
  if (parts[0] === "projections") return { view: "projections" };
  if (parts[0] === "listings") return { view: "listings" };
  if (parts[0] === "submarket" && parts[1]) {
    return { view: "submarket", slug: parts[1] };
  }
  return { view: "overview" };
}

export function routeKey(route: Route): string {
  return route.view === "submarket"
    ? `submarket-${route.slug}`
    : route.view;
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
  stats: CorridorStats;
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

export function GorgeApp({ submarkets, listings, stats }: GorgeAppProps) {
  const route = useSyncExternalStore(subscribeHash, getHashRoute, () => SERVER_ROUTE);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    // Normalize an empty hash to "#/" once on mount.
    if (!window.location.hash) window.history.replaceState(null, "", "#/");
  }, []);

  const navigate: NavigateFn = useCallback((next: Route) => {
    // Setting the hash fires hashchange → the external store re-parses and
    // re-renders. Query-only replaceState (share links) deliberately skips
    // this because parseHash ignores the query — the route is unchanged.
    const hash = routeToHash(next);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, []);

  // Scroll to top whenever the workspace changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader
        route={route}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <KeyboardShortcuts
        navigate={navigate}
        helpOpen={shortcutsOpen}
        onHelpOpenChange={setShortcutsOpen}
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
                submarkets={submarkets}
                stats={stats}
                listings={listings}
                navigate={navigate}
              />
            ) : null}
            {route.view === "matrix" ? (
              <MatrixView submarkets={submarkets} navigate={navigate} />
            ) : null}
            {route.view === "projections" ? (
              <ProjectionsView submarkets={submarkets} navigate={navigate} />
            ) : null}
            {route.view === "listings" ? (
              <ListingsView
                listings={listings}
                submarkets={submarkets}
                navigate={navigate}
              />
            ) : null}
            {route.view === "submarket" ? (
              <SubmarketDetailView
                slug={route.slug}
                submarkets={submarkets}
                listings={listings}
                navigate={navigate}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
      <BackToTop />
      <SiteFooter />
    </div>
  );
}
