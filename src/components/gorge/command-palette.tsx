"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Compass,
  Keyboard,
  LineChart,
  Map,
  Moon,
  Mountain,
  Search,
  Sun,
  Table2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { fmtPct, type Submarket } from "@/lib/gorge";
import type { NavigateFn, Route } from "./gorge-app";

/* ------------------------------------------------------------------ */
/* Command palette — ⌘K jump-anywhere layer (round 8-f).               */
/*                                                                     */
/* One keystroke surfaces every workspace, all 11 micro-markets, and   */
/* the quick actions (theme, shortcut reference). cmdk filters on the  */
/* item's `value` (name + state + county) so "Klickitat" or "WA"      */
/* finds markets without exact-name matches.                           */
/* ------------------------------------------------------------------ */

const WORKSPACES: {
  label: string;
  icon: typeof Mountain;
  route: Route;
  shortcut: string;
  hint: string;
}[] = [
  {
    label: "Executive Overview",
    icon: Mountain,
    route: { view: "overview" },
    shortcut: "g o",
    hint: "Corridor KPIs, statutory framework, tax arbitrage",
  },
  {
    label: "Master Matrix",
    icon: Table2,
    route: { view: "matrix" },
    shortcut: "g m",
    hint: "11-jurisdiction sortable ledger",
  },
  {
    label: "Projections",
    icon: LineChart,
    route: { view: "projections" },
    shortcut: "g p",
    hint: "Compound curves, scenarios, A/B verdicts",
  },
  {
    label: "Listings Showcase",
    icon: Search,
    route: { view: "listings" },
    shortcut: "g l",
    hint: "Search, filter, star a watchlist",
  },
];

export function CommandPalette({
  open,
  onOpenChange,
  navigate,
  submarkets,
  onOpenShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigate: NavigateFn;
  submarkets: Submarket[];
  onOpenShortcuts: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  /* Global ⌘K / Ctrl+K arm — works even while typing in a field
     (standard palette behavior; plain-letter shortcuts stay gated
     behind isTypingTarget in shortcuts.tsx). */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to any workspace, micro-market, or action."
      className="sm:max-w-[520px]"
    >
      <CommandInput placeholder="Search workspaces, markets, actions…" />
      <CommandList>
        <CommandEmpty>No matches in the corridor.</CommandEmpty>

        <CommandGroup heading="Workspaces">
          {WORKSPACES.map((w) => (
            <CommandItem
              key={w.label}
              value={`${w.label} ${w.hint}`}
              onSelect={() => run(() => navigate(w.route))}
              className="gap-2.5"
            >
              <w.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium leading-tight">
                  {w.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {w.hint}
                </span>
              </span>
              <CommandShortcut className="text-[10.5px] font-mono font-semibold text-muted-foreground">
                {w.shortcut}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Micro-markets · 11 jurisdictions">
          {submarkets.map((s) => (
            <CommandItem
              key={s.slug}
              value={`${s.name} ${s.state} ${s.county} micro-market profile`}
              onSelect={() =>
                run(() => navigate({ view: "submarket", slug: s.slug }))
              }
              className="gap-2.5"
            >
              <Map className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium leading-tight">
                  {s.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {s.county} ·{" "}
                  {s.jurisdictionType === "Incorporated City"
                    ? "City"
                    : "Unincorporated"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={
                    s.state === "OR"
                      ? "text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300"
                      : "text-[11px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {s.state}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {fmtPct(s.projectedCagr)}
                </span>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            value="toggle dark light theme"
            onSelect={() =>
              run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
            className="gap-2.5"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="text-[13.5px] font-medium">
              Toggle {resolvedTheme === "dark" ? "light" : "dark"} theme
            </span>
            <CommandShortcut className="text-[10.5px] font-mono font-semibold text-muted-foreground">
              t
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            value="keyboard shortcuts reference help"
            onSelect={() => run(onOpenShortcuts)}
            className="gap-2.5"
          >
            <Keyboard
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="text-[13.5px] font-medium">
              Keyboard shortcuts
            </span>
            <CommandShortcut className="text-[10.5px] font-mono font-semibold text-muted-foreground">
              ?
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            value="methodology sources how computed reference"
            onSelect={() =>
              run(() => {
                // The methodology trigger lives in the site footer —
                // surface the same dialog without a scroll hunt.
                document
                  .querySelector<HTMLButtonElement>(
                    "[data-methodology-trigger]"
                  )
                  ?.click();
              })
            }
            className="gap-2.5"
          >
            <Compass
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="text-[13.5px] font-medium">
              Methodology &amp; sources
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
