"use client";

import { useMemo, type CSSProperties } from "react";
import { Activity } from "lucide-react";
import {
  fmtCurrency,
  fmtPct,
  futureValue,
  type Submarket,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";

/* ------------------------------------------------------------------ */
/* Round 16 — Market Pulse.                                            */
/* A terminal-style ticker band pinned to the top of the footer: one   */
/* line per submarket, baseline 2026 price compounding to the 2046     */
/* future value on the market's own CAGR — the platform's core         */
/* FV = PV·(1+r)ⁿ formula reduced to a glanceable strip. Items are     */
/* buttons: clicking one opens that market's dossier.                  */
/*                                                                     */
/* Motion contract (baseline-ui / DESIGN.md): the loop animates ONLY   */
/* transform (compositor-safe), pauses on hover AND on keyboard focus  */
/* inside the band, and collapses to a static, scrollable strip under  */
/* prefers-reduced-motion via the globals.css rule. The duplicated     */
/* second copy of the item list exists purely for the seamless loop    */
/* and is aria-hidden + tabIndex=-1 so it never reaches AT or Tab.     */
/* ------------------------------------------------------------------ */

interface PulseItem {
  slug: string;
  name: string;
  baseline: number;
  fv2046: number;
  cagr: number;
}

function PulseStrip({
  items,
  navigate,
  phantom,
}: {
  items: PulseItem[];
  navigate: NavigateFn;
  /** Second copy of the loop — invisible to AT and keyboard. */
  phantom: boolean;
}) {
  return (
    <div
      aria-hidden={phantom || undefined}
      className="flex shrink-0 items-center"
    >
      {items.map((it) => (
        <button
          key={it.slug}
          type="button"
          tabIndex={phantom ? -1 : 0}
          onClick={
            phantom ? undefined : () => navigate({ view: "submarket", slug: it.slug })
          }
          className="group/pulse flex h-9 items-center gap-2.5 border-r border-white/10 px-4 text-left whitespace-nowrap transition-colors hover:bg-white/[0.06] sm:px-5"
        >
          <span className="text-[12px] font-semibold tracking-tight text-zinc-100">
            {it.name}
          </span>
          <span className="text-[12px] tabular-nums text-zinc-400">
            {fmtCurrency(it.baseline, { compact: true })}
            <span aria-hidden> → </span>
            <span className="font-semibold text-emerald-400">
              {fmtCurrency(it.fv2046, { compact: true })}
            </span>
          </span>
          <span className="inline-flex min-w-[3.25rem] justify-center rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-400 group-hover/pulse:bg-emerald-500/20">
            +{fmtPct(it.cagr)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function MarketPulse({
  submarkets,
  navigate,
  scopeWord = "corridor",
}: {
  submarkets: Submarket[];
  navigate: NavigateFn;
  scopeWord?: string;
}) {
  const items = useMemo<PulseItem[]>(
    () =>
      [...submarkets]
        // Deterministic "leadership" reading: fastest compounders first.
        .sort((a, b) => b.projectedCagr - a.projectedCagr)
        .map((s) => ({
          slug: s.slug,
          name: s.name,
          baseline: s.baselinePrice2026,
          fv2046: futureValue(s.baselinePrice2026, s.projectedCagr, 20),
          cagr: s.projectedCagr,
        })),
    [submarkets]
  );

  if (items.length === 0) return null;

  /* Loop duration scales with content width so the band never outruns
   * legibility — roughly 7s of travel per market, floored at 35s. */
  const duration = `${Math.max(35, items.length * 7)}s`;

  return (
    <section
      aria-label={`Market pulse — projected 2026 to 2046 values across the ${scopeWord}`}
      className="market-pulse relative border-b border-white/10 bg-zinc-950 text-zinc-50"
    >
      <div className="flex items-stretch">
        {/* Fixed header cell — labels the band in both themes. */}
        <div className="flex shrink-0 items-center gap-2 border-r border-white/10 bg-zinc-950 px-4 py-2 sm:px-5">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <Activity className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
            Market pulse
            <span className="hidden text-zinc-500 sm:inline">
              {" "}
              · 2026 → 2046
            </span>
          </span>
        </div>

        {/* Scrolling band + edge fades (mask the loop seam). */}
        <div className="relative flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-zinc-950 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-zinc-950 to-transparent"
            aria-hidden
          />
          <div
            className="market-pulse-track flex w-max"
            style={{ "--ticker-duration": duration } as CSSProperties}
          >
            <PulseStrip items={items} navigate={navigate} phantom={false} />
            <PulseStrip items={items} navigate={navigate} phantom />
          </div>
        </div>
      </div>
    </section>
  );
}
