"use client";

import { useMemo, useState } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RUNWAY_TIER_STYLES,
  fmtAcres,
  fmtPct,
  runwayTier,
  runwayYears,
  type CorridorStats,
  type Submarket,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";
import { MicroLabel } from "./shared";

/* Map geometry: 0–100 market coordinates → 1000×460 viewBox units. */
const VW = 1000;
const VH = 460;
function pos(x: number, y: number) {
  return { px: 30 + x * 9.4, py: 20 + y * 4.2 };
}

const TIER_FILL: Record<string, string> = {
  elite: "#10b981",
  strong: "#14b8a6",
  moderate: "#f59e0b",
  baseline: "#a1a1aa",
};

function tierOf(cagr: number): string {
  if (cagr >= 5.5) return "elite";
  if (cagr >= 5.0) return "strong";
  if (cagr >= 4.7) return "moderate";
  return "baseline";
}

/** Lens of the map: appreciation tiers vs depletion-runway heat. */
type MapMode = "cagr" | "runway";

const MODES: { id: MapMode; label: string; icon: typeof TrendingUp; hint: string }[] = [
  { id: "cagr", label: "Appreciation", icon: TrendingUp, hint: "Dot color = 20-yr CAGR tier" },
  { id: "runway", label: "Land runway", icon: Flame, hint: "Dot color = years of raw land left" },
];

/** Fill color for a market under the active lens. */
function dotFill(s: Submarket, mode: MapMode): string {
  if (mode === "cagr") return TIER_FILL[tierOf(s.projectedCagr)];
  return RUNWAY_TIER_STYLES[runwayTier(runwayYears(s.depletionYear))].color;
}

/** Per-slug label placement tweaks so names never collide. */
const LABEL_POS: Record<string, { dx: number; dy: number; anchor: "start" | "end" }> = {
  "north-bonneville": { dx: 22, dy: 5, anchor: "start" },
  stevenson: { dx: 24, dy: 5, anchor: "start" },
  "white-salmon": { dx: 24, dy: 5, anchor: "start" },
  bingen: { dx: 24, dy: 18, anchor: "start" },
  lyle: { dx: 24, dy: 5, anchor: "start" },
  dallesport: { dx: -24, dy: 5, anchor: "end" },
  wishram: { dx: -24, dy: 5, anchor: "end" },
  "cascade-locks": { dx: 24, dy: 5, anchor: "start" },
  mosier: { dx: 24, dy: 5, anchor: "start" },
  "hood-river": { dx: 24, dy: 18, anchor: "start" },
  "the-dalles": { dx: -24, dy: 5, anchor: "end" },
};

const RIVER_PATH =
  "M 12 232 C 150 192, 250 272, 390 232 C 520 194, 630 272, 760 232 C 870 198, 940 268, 990 230";

export function CorridorMap({
  submarkets,
  stats,
  navigate,
}: {
  submarkets: Submarket[];
  stats: CorridorStats;
  navigate: NavigateFn;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("cagr");

  const dots = useMemo(
    () =>
      submarkets.map((s) => {
        const { px, py } = pos(s.mapX, s.mapY);
        const netMid = (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
        const r = 9 + netMid * 0.065;
        const tier = tierOf(s.projectedCagr);
        const label = LABEL_POS[s.slug] ?? { dx: 24, dy: 5, anchor: "start" as const };
        return { s, px, py, r, tier, netMid, label };
      }),
    [submarkets]
  );

  const hoveredDot = dots.find((d) => d.s.slug === hovered) ?? null;
  const orShare = stats.orNetBuildable + stats.waNetBuildable > 0
    ? (stats.orNetBuildable / (stats.orNetBuildable + stats.waNetBuildable)) * 100
    : 50;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <MicroLabel>Regional Map Summary</MicroLabel>
          <p className="mt-1 text-sm text-muted-foreground">
            All 11 jurisdictions · dot size = net buildable acres ·{" "}
            {mode === "cagr"
              ? "color = 20-yr CAGR tier"
              : "color = raw-land runway remaining"}
          </p>
        </div>
        {/* Lens toggle — segmented control */}
        <div
          role="radiogroup"
          aria-label="Map color lens"
          className="flex rounded-lg border bg-background p-0.5"
        >
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                title={m.hint}
                onClick={() => setMode(m.id)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition-all active:scale-[0.97]",
                  active
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-emerald-500 dark:text-zinc-950"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <m.icon className="h-3.5 w-3.5" aria-hidden />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <div className="relative min-w-[680px]">
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="h-auto w-full"
            role="img"
            aria-label="Map of the Columbia River Gorge corridor showing the 11 analyzed micro-markets on both sides of the river"
          >
            {/* State backdrops */}
            <rect x="0" y="0" width={VW} height="205" rx="10" className="fill-teal-500/[0.04] dark:fill-teal-400/[0.05]" />
            <rect x="0" y="255" width={VW} height={VH - 255} rx="10" className="fill-amber-500/[0.05] dark:fill-amber-400/[0.04]" />

            <text x="28" y="36" className="fill-zinc-400 dark:fill-zinc-500" fontSize="17" fontWeight="700" letterSpacing="6">
              WASHINGTON
            </text>
            <text x="28" y={VH - 18} className="fill-zinc-400 dark:fill-zinc-500" fontSize="17" fontWeight="700" letterSpacing="6">
              OREGON
            </text>

            {/* Highways */}
            <path
              d="M 15 300 C 160 285, 300 315, 450 300 C 600 285, 740 315, 985 300"
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth="3" strokeDasharray="10 8" fill="none"
            />
            <path
              d="M 15 165 C 160 150, 300 180, 450 165 C 600 150, 740 180, 985 165"
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth="3" strokeDasharray="10 8" fill="none"
            />
            <text x="500" y="296" textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-600" fontSize="11" letterSpacing="3">
              I-84
            </text>
            <text x="500" y="161" textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-600" fontSize="11" letterSpacing="3">
              SR-14
            </text>

            {/* Columbia River */}
            <path
              d={RIVER_PATH}
              className="stroke-sky-200/70 dark:stroke-sky-400/25"
              strokeWidth="46" strokeLinecap="round" fill="none"
            />
            <path
              d={RIVER_PATH}
              className="stroke-sky-300/80 dark:stroke-sky-500/40"
              strokeWidth="4" strokeLinecap="round" fill="none"
            />
            <text
              x="500" y="238" textAnchor="middle" rotate={-3}
              className="fill-sky-500/70 dark:fill-sky-300/60"
              fontSize="13" fontWeight="700" letterSpacing="7"
            >
              COLUMBIA RIVER
            </text>

            {/* Market dots */}
            {dots.map(({ s, px, py, r, label }) => {
              const active = hovered === s.slug;
              const fill = dotFill(s, mode);
              const runway = runwayYears(s.depletionYear);
              return (
                <g
                  key={s.slug}
                  className="cursor-pointer transition-opacity"
                  onClick={() => navigate({ view: "submarket", slug: s.slug })}
                  onMouseEnter={() => setHovered(s.slug)}
                  onMouseLeave={() => setHovered(null)}
                  role="button"
                  aria-label={`Open ${s.name}, ${s.state} micro-market profile`}
                >
                  <circle cx={px} cy={py} r={r + 15} fill="transparent" />
                  {active ? (
                    <circle cx={px} cy={py} r={r + 9} fill={fill} opacity="0.22" />
                  ) : null}
                  <circle
                    cx={px} cy={py} r={r}
                    fill={fill}
                    opacity={active ? 1 : 0.88}
                    className="stroke-white dark:stroke-zinc-950"
                    strokeWidth="2.5"
                  />
                  <text
                    x={px + label.dx} y={py + label.dy}
                    textAnchor={label.anchor}
                    fontSize="16.5"
                    fontWeight={active ? 700 : 600}
                    className={cn(
                      active
                        ? "fill-zinc-900 dark:fill-zinc-50"
                        : "fill-zinc-500 dark:fill-zinc-300"
                    )}
                  >
                    {s.slug === "north-bonneville" ? "N. Bonneville" : s.name}
                  </text>
                  <text
                    x={px + label.dx} y={py + label.dy + 16}
                    textAnchor={label.anchor}
                    fontSize="12.5"
                    className="fill-zinc-400 dark:fill-zinc-500 tabular-nums"
                  >
                    {mode === "cagr"
                      ? `${s.state} · ${fmtPct(s.projectedCagr)}`
                      : `${s.state} · ${runway} yrs land`}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredDot ? (
            <div
              className="pointer-events-none absolute z-10 w-52 -translate-x-1/2 -translate-y-[115%] rounded-lg border bg-popover p-3 text-popover-foreground shadow-xl"
              style={{
                left: `${(hoveredDot.px / VW) * 100}%`,
                top: `${(hoveredDot.py / VH) * 100}%`,
              }}
            >
              <p className="text-sm font-semibold">
                {hoveredDot.s.name},{" "}
                <span className="text-muted-foreground">{hoveredDot.s.state}</span>
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {hoveredDot.s.jurisdictionType}
              </p>
              <div className="mt-2 space-y-1 text-[12px] tabular-nums">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Net buildable</span>
                  <span className="font-medium">
                    {fmtAcres(hoveredDot.netMid)} band
                  </span>
                </div>
                {mode === "cagr" ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">20-yr CAGR</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {fmtPct(hoveredDot.s.projectedCagr)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Land runway</span>
                    <span
                      className="font-medium"
                      style={{
                        color: RUNWAY_TIER_STYLES[
                          runwayTier(runwayYears(hoveredDot.s.depletionYear))
                        ].color,
                      }}
                    >
                      {runwayYears(hoveredDot.s.depletionYear)} yrs ·{" "}
                      {RUNWAY_TIER_STYLES[
                        runwayTier(runwayYears(hoveredDot.s.depletionYear))
                      ].label.toLowerCase()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Depletion</span>
                  <span className="font-medium">{hoveredDot.s.depletionYear}</span>
                </div>
              </div>
              <p className="mt-2 border-t pt-1.5 text-[11px] text-muted-foreground">
                Click to open profile →
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Legend + OR/WA split */}
      <div className="mt-4 flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
        {mode === "cagr" ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
            {(
              [
                ["elite", "≥ 5.5% CAGR"],
                ["strong", "5.0–5.5%"],
                ["moderate", "4.7–5.0%"],
                ["baseline", "< 4.7%"],
              ] as const
            ).map(([tier, text]) => (
              <span key={tier} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: TIER_FILL[tier] }}
                  aria-hidden
                />
                {text}
              </span>
            ))}
          </div>
        ) : (
          <div className="min-w-0 flex-1 max-w-md" aria-label="Runway heat legend">
            <div className="mb-1 flex items-baseline justify-between text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Raw-land runway heat</span>
              <span className="tabular-nums normal-case tracking-normal">
                6 → 12 years left
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full border">
              {(Object.keys(RUNWAY_TIER_STYLES) as (keyof typeof RUNWAY_TIER_STYLES)[]).map(
                (k) => (
                  <div
                    key={k}
                    className="h-full flex-1"
                    style={{
                      backgroundColor: `${RUNWAY_TIER_STYLES[k].color}cc`,
                    }}
                    title={`${RUNWAY_TIER_STYLES[k].years} · ${RUNWAY_TIER_STYLES[k].label}`}
                  />
                )
              )}
            </div>
            <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
              {(Object.keys(RUNWAY_TIER_STYLES) as (keyof typeof RUNWAY_TIER_STYLES)[]).map(
                (k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1"
                    title={`${RUNWAY_TIER_STYLES[k].years} · ${RUNWAY_TIER_STYLES[k].label}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: RUNWAY_TIER_STYLES[k].color }}
                      aria-hidden
                    />
                    {RUNWAY_TIER_STYLES[k].label}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        <div className="w-full max-w-sm">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>OR reserve {fmtAcres(Math.round(stats.orNetBuildable))}</span>
            <span>WA reserve {fmtAcres(Math.round(stats.waNetBuildable))}</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full border bg-muted">
            <div
              className="bg-amber-500/80"
              style={{ width: `${orShare}%` }}
              title="Oregon-side net buildable acres"
            />
            <div
              className="bg-teal-500/80"
              style={{ width: `${100 - orShare}%` }}
              title="Washington-side net buildable acres"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
