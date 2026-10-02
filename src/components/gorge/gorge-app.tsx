"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CorridorStats, PropertyListing, Submarket } from "@/lib/gorge";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { OverviewView } from "./overview";
import { MatrixView } from "./matrix";
import { ProjectionsView } from "./projections";
import { ListingsView } from "./listings-view";
import { SubmarketDetailView } from "./submarket-detail";

/* ---------------------------------------------------------------- */
/* Hash-based SPA router — keeps the whole experience on the `/`      */
/* route while giving each analytics workspace its own addressable    */
/* URL fragment (#/matrix, #/projections, #/submarket/hood-river…).   */
/* ---------------------------------------------------------------- */

export type Route =
  | { view: "overview" }
  | { view: "matrix" }
  | { view: "projections" }
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
      return "#/projections";
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

export interface GorgeAppProps {
  submarkets: Submarket[];
  listings: PropertyListing[];
  stats: CorridorStats;
}

export function GorgeApp({ submarkets, listings, stats }: GorgeAppProps) {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined"
      ? { view: "overview" }
      : parseHash(window.location.hash)
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    // Normalize an empty hash to "#/" once on mount.
    if (!window.location.hash) window.history.replaceState(null, "", "#/");
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate: NavigateFn = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    setRoute(next);
  }, []);

  // Scroll to top whenever the workspace changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader route={route} />
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
              <ProjectionsView submarkets={submarkets} />
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
      <SiteFooter />
    </div>
  );
}
