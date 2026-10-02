"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Keyboard,
  MapPin,
  Menu,
  Moon,
  Mountain,
  Search,
  Sun,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Region } from "@/lib/gorge";
import { REGION_SHORT_NAMES } from "@/lib/region-content";
import type { Route } from "./gorge-app";
import { routeToHash } from "./gorge-app";

const NAV_ITEMS: { label: string; route: Route }[] = [
  { label: "Overview", route: { view: "overview" } },
  { label: "Master Matrix", route: { view: "matrix" } },
  { label: "Projections", route: { view: "projections" } },
  { label: "Listings", route: { view: "listings" } },
  { label: "Regions", route: { view: "regions" } },
];

const emptySubscribe = () => () => {};
/** true on the client after hydration, false during SSR — without setState-in-effect. */
function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useIsHydrated();
  const isDark = hydrated ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      title="Toggle theme (t)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Round 15 — the region switcher. Live regions only; switching keeps  */
/* the current workspace (the hash keeps its view segment and swaps    */
/* the /r/<slug> scope). Registry scaffolds route through #/regions.   */
/* ------------------------------------------------------------------ */
function RegionSwitcher({
  regions,
  activeRegionSlug,
  navigate,
  compact = false,
}: {
  regions: Region[];
  activeRegionSlug: string;
  navigate: (next: Route) => void;
  /** Inline (mobile menu) presentation instead of the dropdown trigger. */
  compact?: boolean;
}) {
  const liveRegions = regions.filter((r) => r.status === "live");
  const active =
    liveRegions.find((r) => r.slug === activeRegionSlug) ?? liveRegions[0];
  const activeName =
    REGION_SHORT_NAMES[activeRegionSlug] ?? active?.name ?? "Columbia River Gorge";

  if (liveRegions.length === 0) return null;

  const switchTo = (slug: string) => {
    navigate({ view: "overview", region: slug });
  };

  if (compact) {
    return (
      <div className="rounded-lg border bg-muted/40 p-2">
        <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Market region
        </p>
        {liveRegions.map((r) => {
          const isActive = r.slug === activeRegionSlug;
          return (
            <button
              key={r.slug}
              type="button"
              onClick={() => switchTo(r.slug)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "mt-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[14px] font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {REGION_SHORT_NAMES[r.slug] ?? r.name}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group/region flex h-9 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 active:scale-[0.98]"
        )}
        aria-label={`Switch market region — current: ${activeName}`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span className="hidden max-w-[130px] truncate lg:inline">
          {activeName}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]/region:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.16em]">
          Market region
        </DropdownMenuLabel>
        {liveRegions.map((r) => (
          <DropdownMenuItem
            key={r.slug}
            onClick={() => switchTo(r.slug)}
            className={cn(
              "gap-2",
              r.slug === activeRegionSlug && "font-semibold text-emerald-700 dark:text-emerald-400"
            )}
            aria-current={r.slug === activeRegionSlug ? "true" : undefined}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                r.slug === activeRegionSlug
                  ? "bg-emerald-500"
                  : "bg-zinc-300 dark:bg-zinc-600"
              )}
              aria-hidden
            />
            <span className="truncate">
              {REGION_SHORT_NAMES[r.slug] ?? r.name}
            </span>
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {r.aggregate?.marketCount ?? 0} mkt
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate({ view: "regions" })}
          className="gap-2 text-muted-foreground"
        >
          <Mountain className="h-3.5 w-3.5" aria-hidden />
          Expansion registry…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader({
  route,
  regions,
  activeRegionSlug,
  navigate,
  onOpenShortcuts,
  onOpenPalette,
}: {
  route: Route;
  regions: Region[];
  activeRegionSlug: string;
  navigate: (next: Route) => void;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Nav destinations preserve the active region scope — the same hash the
  // router would mint for the current region (round 15).
  const scopedHash = (item: (typeof NAV_ITEMS)[number]): string =>
    routeToHash({ ...item.route, region: route.region } as Route);

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.route.view === "overview") return route.view === "overview";
    return route.view === item.route.view;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white transition-transform group-hover:scale-[1.04] dark:bg-emerald-500 dark:text-zinc-950">
            <Mountain className="h-5 w-5" aria-hidden />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[15px] font-semibold tracking-tight">
              Gorge Capital Intelligence
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Regulated-Land Scarcity Analytics
            </span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <a
                key={item.route.view}
                href={scopedHash(item)}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-white dark:text-zinc-950"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-emerald-500"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-10">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <RegionSwitcher
            regions={regions}
            activeRegionSlug={activeRegionSlug}
            navigate={navigate}
          />
          <button
            type="button"
            aria-label="Open the command palette"
            title="Search anything (⌘K)"
            onClick={onOpenPalette}
            className="group/palette flex h-9 items-center gap-2 rounded-lg border bg-card pl-2.5 pr-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden text-[12px] font-medium lg:inline">
              Search markets…
            </span>
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold sm:inline">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            onClick={onOpenShortcuts}
            className="hidden h-9 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 sm:flex"
          >
            <Keyboard className="h-4 w-4" aria-hidden />
            <kbd className="rounded border bg-muted px-1 font-mono text-[10.5px] font-semibold">
              ?
            </kbd>
          </button>
          <ThemeToggle />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <Menu className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          aria-label="Mobile"
          className="border-t bg-background px-4 pb-4 pt-3 md:hidden"
        >
          <RegionSwitcher
            regions={regions}
            activeRegionSlug={activeRegionSlug}
            navigate={(next) => {
              setMobileOpen(false);
              navigate(next);
            }}
            compact
          />
          <div className="mt-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.route.view}
                href={scopedHash(item)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                  isActive(item)
                    ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-current={isActive(item) ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
