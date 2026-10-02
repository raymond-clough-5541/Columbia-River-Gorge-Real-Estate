"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Menu, Moon, Mountain, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Route } from "./gorge-app";

const NAV_ITEMS: { label: string; route: Route; hash: string }[] = [
  { label: "Overview", route: { view: "overview" }, hash: "#/" },
  { label: "Master Matrix", route: { view: "matrix" }, hash: "#/matrix" },
  { label: "Projections", route: { view: "projections" }, hash: "#/projections" },
  { label: "Listings", route: { view: "listings" }, hash: "#/listings" },
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
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

export function SiteHeader({ route }: { route: Route }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.route.view === "overview") return route.view === "overview";
    return route.view === item.route.view;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950">
            <Mountain className="h-5 w-5" aria-hidden />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[15px] font-semibold tracking-tight">
              Gorge Capital Intelligence
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              CRGNSA Land &amp; Valuation Analytics
            </span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.hash}
              href={item.hash}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                isActive(item)
                  ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-current={isActive(item) ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
          className="border-t bg-background px-4 pb-4 pt-2 md:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.hash}
              href={item.hash}
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
        </nav>
      ) : null}
    </header>
  );
}
