"use client";

import { Mountain, ShieldAlert } from "lucide-react";
import { MethodologyTrigger } from "./methodology";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-zinc-50 dark:bg-zinc-900/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950">
                <Mountain className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-semibold tracking-tight">
                Gorge Capital Intelligence
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              An analytics ledger of regulatory land-supply scarcity, urban
              growth boundaries, micro-market pricing, and 20-year compound
              valuation projections across the Columbia River Gorge National
              Scenic Area.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              <a href="#/" className="text-muted-foreground transition-colors hover:text-foreground">
                Executive Overview
              </a>
              <a href="#/matrix" className="text-muted-foreground transition-colors hover:text-foreground">
                Master Matrix
              </a>
              <a href="#/projections" className="text-muted-foreground transition-colors hover:text-foreground">
                Projections
              </a>
              <a href="#/listings" className="text-muted-foreground transition-colors hover:text-foreground">
                Listings
              </a>
              <a href="#/regions" className="text-muted-foreground transition-colors hover:text-foreground">
                Expansion Registry
              </a>
            </nav>
            <div className="mt-1 md:text-right">
              <MethodologyTrigger label="Methodology & sources" className="text-[13px]" />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t pt-6 text-[12px] text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <p className="flex max-w-3xl items-start gap-2 leading-relaxed">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Analytical illustrations compiled from public CRGNSA land-use
              records and corridor market surveys. Projections apply
              FV&nbsp;=&nbsp;PV·(1+r)ⁿ to baseline bands and are not investment
              advice. Verify entitlements, water rights, and tax positions with
              counsel before transacting.
            </span>
          </p>
          <p className="shrink-0 tabular-nums">
            © {new Date().getFullYear()} Gorge Capital Intelligence
          </p>
        </div>
      </div>
    </footer>
  );
}
