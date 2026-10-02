"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Landmark, Layers, Pause, Play, RotateCcw, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  RUNWAY_TIER_STYLES,
  fmtAcres,
  fmtCurrency,
  fmtPct,
  futureValue,
  netBuildableMid,
  runwayTier,
  runwayYears,
  type CorridorStats,
  type Submarket,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";
import { MicroLabel } from "./shared";

/* Map geometry: 0–100 market coordinates → 1000×460 viewBox units — the
   same transform the corridor map uses, so mapX/mapY data carries over. */
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

const T0 = 2026;
const T1 = 2046;
const PLAY_MS_PER_YEAR = 400;
const REDUCED_PLAY_MS_PER_YEAR = 700;

const MODES: { id: MapMode; label: string; icon: typeof TrendingUp; hint: string }[] = [
  { id: "cagr", label: "Appreciation", icon: TrendingUp, hint: "Dot color = 20-yr CAGR tier" },
  { id: "runway", label: "Land runway", icon: Flame, hint: "Dot color = years of raw land left" },
];

/** Fill color for a market under the active lens (dark zinc once spent). */
function dotFill(s: Submarket, mode: MapMode, spent: boolean): string {
  if (spent) return "#71717a";
  if (mode === "cagr") return TIER_FILL[tierOf(s.projectedCagr)];
  return RUNWAY_TIER_STYLES[runwayTier(runwayYears(s.depletionYear))].color;
}

/** Per-slug label placement tweaks so names never collide. Issaquah
    anchors END (left of its dot) so its label can never run under the
    Snoqualmie dot one grid step east; Snoqualmie sits centered below
    its own dot for the same reason. */
const LABEL_POS: Record<
  string,
  { dx: number; dy: number; anchor: "start" | "end" | "middle" }
> = {
  shoreline: { dx: 24, dy: 5, anchor: "start" },
  sammamish: { dx: 24, dy: 5, anchor: "start" },
  issaquah: { dx: -24, dy: 5, anchor: "end" },
  snoqualmie: { dx: 0, dy: 38, anchor: "middle" },
  "bainbridge-island": { dx: 24, dy: 5, anchor: "start" },
  "vashon-island": { dx: 24, dy: 5, anchor: "start" },
};

/* ------------------------------------------------------------------ */
/* Geography — a stylized central Puget Sound. Land west = Kitsap      */
/* Peninsula (Bainbridge off its coast); the diagonal main basin;      */
/* the mainland east with Lake Washington, the Eastside plateau,      */
/* Lake Sammamish, and the I-90 corridor climbing to Snoqualmie.      */
/* ------------------------------------------------------------------ */

const SOUND_PATH =
  "M 275 0 " +
  "C 300 55, 285 100, 292 150 " +
  "C 298 200, 280 260, 292 310 " +
  "C 300 360, 285 420, 295 460 " +
  "L 470 460 " +
  "C 440 400, 452 340, 462 290 " +
  "C 472 235, 458 180, 470 130 " +
  "C 480 75, 455 40, 465 0 Z";

const KITSAP_PATH =
  "M 0 0 L 285 0 " +
  "C 268 60, 262 120, 272 180 " +
  "C 280 235, 265 300, 274 360 " +
  "C 280 410, 270 440, 276 460 " +
  "L 0 460 Z";

const BAINBRIDGE_PATH =
  "M 298 92 C 316 86, 330 96, 328 112 C 326 128, 312 158, 300 162 C 288 166, 282 150, 284 130 C 286 112, 288 96, 298 92 Z";

const VASHON_PATH =
  "M 292 235 C 300 230, 308 240, 308 258 C 308 285, 302 330, 296 344 C 290 356, 284 348, 284 322 C 284 290, 286 240, 292 235 Z";

const MAINLAND_PATH =
  "M 465 0 C 455 40, 480 75, 470 130 C 458 180, 472 235, 462 290 C 452 340, 440 400, 470 460 L 1000 460 L 1000 0 Z";

const LAKE_WA_PATH =
  "M 520 55 C 536 52, 548 56, 548 70 C 548 140, 540 240, 536 300 C 534 330, 528 345, 522 342 C 516 339, 514 320, 514 290 C 514 220, 518 120, 520 55 Z";

const MERCER_ISLAND =
  "M 524 175 C 534 172, 540 180, 538 190 C 536 200, 528 208, 524 204 C 520 200, 518 182, 524 175 Z";

const LAKE_SAMMAMISH_PATH =
  "M 622 60 C 634 56, 642 62, 641 74 C 640 92, 634 108, 628 107 C 622 106, 618 92, 618 78 C 618 68, 618 62, 622 60 Z";

const I5_PATH =
  "M 444 0 C 452 40, 470 90, 478 140 C 484 190, 478 240, 470 290 C 462 350, 448 410, 442 460";
const I90_PATH =
  "M 500 195 C 520 193, 536 190, 552 189 C 600 185, 660 170, 700 160 C 740 151, 800 152, 857 163";
const I405_PATH =
  "M 556 300 C 562 250, 566 190, 572 130 C 576 90, 580 50, 588 15";
const SR520_PATH = "M 512 130 C 530 128, 548 127, 566 126";

const FERRY_SEATTLE_BAINBRIDGE = "M 492 185 C 440 165, 380 150, 330 132";
const FERRY_VASHON = "M 486 235 C 440 240, 390 248, 312 252";

/** Issaquah Alps + Mount Si conservation wall (decorative peaks). */
const PEAKS = "M 790 120 L 802 96 L 814 120 M 818 128 L 830 102 L 842 128 M 860 118 L 874 88 L 888 118";

export function PugetSoundMap({
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

  /* ---------------- Depletion-timeline scrubber ---------------- */
  const [timelineYear, setTimelineYear] = useState(T0);
  const [playing, setPlaying] = useState(false);
  const yearRef = useRef(timelineYear);
  useEffect(() => {
    yearRef.current = timelineYear;
  }, [timelineYear]);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (reducedMotion) {
      let year = yearRef.current;
      const id = window.setInterval(() => {
        year = Math.min(T1, year + 1);
        setTimelineYear(year);
        if (year >= T1) {
          setPlaying(false);
          window.clearInterval(id);
        }
      }, REDUCED_PLAY_MS_PER_YEAR);
      return () => window.clearInterval(id);
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      if (dt >= PLAY_MS_PER_YEAR) {
        last = now;
        const next = Math.min(T1, yearRef.current + dt / PLAY_MS_PER_YEAR);
        yearRef.current = next;
        setTimelineYear(Math.round(next));
        if (next >= T1) {
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reducedMotion]);

  const scrub = (year: number) => {
    setTimelineYear(Math.max(T0, Math.min(T1, Math.round(year))));
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (timelineYear >= T1) scrub(T0);
    setPlaying(true);
  };

  const spentCount = submarkets.filter((s) => timelineYear >= s.depletionYear).length;

  const dots = useMemo(
    () =>
      submarkets.map((s) => {
        const { px, py } = pos(s.mapX, s.mapY);
        const netMid = (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
        const r = 9 + netMid * 0.065;
        const label = LABEL_POS[s.slug] ?? { dx: 24, dy: 5, anchor: "start" as const };
        return { s, px, py, r, netMid, label };
      }),
    [submarkets]
  );

  const hoveredDot = dots.find((d) => d.s.slug === hovered) ?? null;

  /* Year-synced KPI readouts — recomputed from the region data at the
     scrub year (never hard-coded). The county split replaces the
     corridor's OR/WA split: King = mainland + Vashon, Kitsap = Bainbridge. */
  const kpis = useMemo(() => {
    const projected = submarkets
      .map((s) => futureValue(s.baselinePrice2026, s.projectedCagr, timelineYear - T0))
      .sort((a, b) => a - b);
    const mid = Math.floor(projected.length / 2);
    const medianPrice =
      projected.length === 0
        ? 0
        : projected.length % 2 === 1
          ? projected[mid]
          : (projected[mid - 1] + projected[mid]) / 2;
    const priceDeltaPct =
      stats.regionalMedianPrice > 0
        ? (medianPrice / stats.regionalMedianPrice - 1) * 100
        : 0;

    let fullReserve = 0;
    let liveReserve = 0;
    let liveReserveKing = 0;
    let liveReserveKitsap = 0;
    let liveMarkets = 0;
    let next: { year: number; name: string; yearsOut: number; tierColor: string } | null =
      null;
    for (const s of submarkets) {
      const acresMid = netBuildableMid(s);
      fullReserve += acresMid;
      if (timelineYear < s.depletionYear) {
        liveReserve += acresMid;
        if (s.county.startsWith("Kitsap")) liveReserveKitsap += acresMid;
        else liveReserveKing += acresMid;
        liveMarkets += 1;
        if (!next || s.depletionYear < next.year) {
          next = {
            year: s.depletionYear,
            name: s.name,
            yearsOut: s.depletionYear - timelineYear,
            tierColor: RUNWAY_TIER_STYLES[runwayTier(s.depletionYear - timelineYear)].color,
          };
        }
      }
    }
    const reservePct = fullReserve > 0 ? (liveReserve / fullReserve) * 100 : 0;
    const liveReserveKingShare =
      liveReserve > 0 ? (liveReserveKing / liveReserve) * 100 : 0;

    return {
      medianPrice,
      priceDeltaPct,
      liveReserve,
      liveReserveKing,
      liveReserveKitsap,
      liveReserveKingShare,
      liveMarkets,
      reservePct,
      next,
    };
  }, [submarkets, stats.regionalMedianPrice, timelineYear]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <MicroLabel>Regional Map Summary</MicroLabel>
          <p className="mt-1 text-sm text-muted-foreground">
            All {submarkets.length} King + Kitsap markets · dot size = net
            buildable acres ·{" "}
            {mode === "cagr"
              ? "color = 20-yr CAGR tier"
              : "color = raw-land runway remaining"}
            {timelineYear > T0 ? (
              <>
                {" · as of "}
                <span className="font-semibold tabular-nums text-foreground">
                  {timelineYear}
                </span>
              </>
            ) : null}
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
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
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
            aria-label="Map of the central Puget Sound showing the six analyzed King and Kitsap county micro-markets"
          >
            {/* Kitsap Peninsula (west land mass) */}
            <path
              d={KITSAP_PATH}
              className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-900 dark:stroke-zinc-700"
              strokeWidth="1.5"
            />
            {/* Mainland (east land mass) */}
            <path
              d={MAINLAND_PATH}
              className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-900 dark:stroke-zinc-700"
              strokeWidth="1.5"
            />
            {/* The Sound itself */}
            <path
              d={SOUND_PATH}
              className="fill-sky-100/80 stroke-sky-300/80 dark:fill-sky-950/70 dark:stroke-sky-800/60"
              strokeWidth="1.5"
            />
            {/* Islands */}
            <path
              d={BAINBRIDGE_PATH}
              className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-900 dark:stroke-zinc-700"
              strokeWidth="1.5"
            />
            <path
              d={VASHON_PATH}
              className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-900 dark:stroke-zinc-700"
              strokeWidth="1.5"
            />
            {/* Lakes */}
            <path
              d={LAKE_WA_PATH}
              className="fill-sky-100/80 stroke-sky-300/80 dark:fill-sky-950/70 dark:stroke-sky-800/60"
              strokeWidth="1.2"
            />
            <path
              d={MERCER_ISLAND}
              className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-900 dark:stroke-zinc-700"
              strokeWidth="1"
            />
            <path
              d={LAKE_SAMMAMISH_PATH}
              className="fill-sky-100/80 stroke-sky-300/80 dark:fill-sky-950/70 dark:stroke-sky-800/60"
              strokeWidth="1.2"
            />

            {/* Conservation peaks — the Issaquah Alps / Mount Si wall */}
            <path
              d={PEAKS}
              className="fill-none stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Highways */}
            {[
              { d: I5_PATH, label: "I-5", lx: 480, ly: 300 },
              { d: I90_PATH, label: "I-90", lx: 640, ly: 150 },
              { d: I405_PATH, label: "I-405", lx: 560, ly: 75 },
              { d: SR520_PATH, label: "SR-520", lx: 528, ly: 118 },
            ].map((h) => (
              <g key={h.label}>
                <path
                  d={h.d}
                  className="stroke-zinc-300 dark:stroke-zinc-700"
                  strokeWidth="2.5"
                  strokeDasharray="9 7"
                  fill="none"
                />
                <text
                  x={h.lx}
                  y={h.ly}
                  className="fill-zinc-400 dark:fill-zinc-600"
                  fontSize="10.5"
                  letterSpacing="2"
                >
                  {h.label}
                </text>
              </g>
            ))}

            {/* Ferry routes — labeled in plain small caps with minimal
                tracking so the label stays legible at map scale. */}
            {[
              { d: FERRY_SEATTLE_BAINBRIDGE, lx: 402, ly: 143 },
              { d: FERRY_VASHON, lx: 402, ly: 246 },
            ].map((f, i) => (
              <g key={i}>
                <path
                  d={f.d}
                  className="stroke-teal-400/70 dark:stroke-teal-500/50"
                  strokeWidth="2"
                  strokeDasharray="3 6"
                  strokeLinecap="round"
                  fill="none"
                />
                <text
                  x={f.lx}
                  y={f.ly}
                  className="fill-teal-600/90 dark:fill-teal-400/70"
                  fontSize="11"
                  fontWeight="600"
                  fontStyle="italic"
                  letterSpacing="0.5"
                >
                  ferry
                </text>
              </g>
            ))}

            {/* Water + land labels */}
            <text
              x="345" y="225" rotate={-72}
              className="fill-sky-500/70 dark:fill-sky-300/60"
              fontSize="13" fontWeight="700" letterSpacing="6"
            >
              PUGET SOUND
            </text>
            <text
              x="24" y="235"
              className="fill-zinc-400 dark:fill-zinc-600"
              fontSize="15" fontWeight="700" letterSpacing="4"
            >
              KITSAP
            </text>
            <text
              x="24" y="255"
              className="fill-zinc-400 dark:fill-zinc-600"
              fontSize="15" fontWeight="700" letterSpacing="4"
            >
              PENINSULA
            </text>
            <text
              x="537" y="212" rotate={86}
              className="fill-sky-500/60 dark:fill-sky-300/50"
              fontSize="10.5" fontWeight="600" letterSpacing="3.5"
            >
              LAKE WASHINGTON
            </text>
            <text
              x="632" y="95"
              className="fill-sky-500/60 dark:fill-sky-300/50"
              fontSize="9.5" fontWeight="600" letterSpacing="2"
            >
              L. SAMM.
            </text>
            <text
              x="492" y="178"
              className="fill-zinc-500 dark:fill-zinc-400"
              fontSize="13.5" fontWeight="700" letterSpacing="3"
            >
              SEATTLE
            </text>
            <text
              x="792" y="142"
              className="fill-zinc-400 dark:fill-zinc-600"
              fontSize="10" letterSpacing="2.5"
            >
              ISSAQUAH ALPS
            </text>
            <text
              x="846" y="110"
              className="fill-zinc-400 dark:fill-zinc-600"
              fontSize="10" letterSpacing="2.5"
            >
              MT. SI
            </text>

            {/* Market dots */}
            {dots.map(({ s, px, py, r, label }) => {
              const active = hovered === s.slug;
              const spent = timelineYear >= s.depletionYear;
              const fill = dotFill(s, mode, spent);
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
                  {spent ? (
                    <circle
                      cx={px} cy={py} r={r + 5.5}
                      fill="none"
                      stroke="#71717a"
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                      opacity={active ? 0.8 : 0.55}
                    />
                  ) : null}
                  <circle
                    cx={px} cy={py} r={r}
                    fill={fill}
                    opacity={spent ? (active ? 0.7 : 0.42) : active ? 1 : 0.88}
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
                        : "fill-zinc-500 dark:fill-zinc-300",
                      spent && !active && "fill-zinc-400/80 dark:fill-zinc-500"
                    )}
                  >
                    {s.name}
                  </text>
                  <text
                    x={px + label.dx} y={py + label.dy + 16}
                    textAnchor={label.anchor}
                    fontSize="12.5"
                    className={cn(
                      "tabular-nums",
                      spent
                        ? "fill-zinc-400/90 dark:fill-zinc-500"
                        : "fill-zinc-400 dark:fill-zinc-500"
                    )}
                  >
                    {spent
                      ? `${s.county.replace(" County", "")} · exhausted ${s.depletionYear}`
                      : mode === "cagr"
                        ? `${s.county.replace(" County", "")} · ${fmtPct(s.projectedCagr)}`
                        : `${s.county.replace(" County", "")} · ${runway} yrs land`}
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
                {timelineYear > T0 ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">As of {timelineYear}</span>
                    <span
                      className={cn(
                        "font-medium",
                        timelineYear >= hoveredDot.s.depletionYear
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {timelineYear >= hoveredDot.s.depletionYear
                        ? `exhausted ${timelineYear - hoveredDot.s.depletionYear} yr${
                            timelineYear - hoveredDot.s.depletionYear === 1 ? "" : "s"
                          } prior`
                        : `${hoveredDot.s.depletionYear - timelineYear} yrs of runway left`}
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 border-t pt-1.5 text-[11px] text-muted-foreground">
                Click to open profile →
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Year-synced KPI readouts — recomputed from the region data at the
          scrub year. The county split replaces the corridor's OR/WA bar. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <MicroLabel className="min-w-0">Median price · as of {timelineYear}</MicroLabel>
          </div>
          <p className="mt-2 text-[17px] font-semibold tracking-tight tabular-nums">
            {fmtCurrency(kpis.medianPrice, { compact: true })}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[11.5px] tabular-nums",
              kpis.priceDeltaPct > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            {kpis.priceDeltaPct >= 0 ? "+" : "−"}
            {Math.abs(Math.round(kpis.priceDeltaPct))}% vs 2026 baseline
          </p>
        </div>

        <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <MicroLabel className="min-w-0">Live buildable reserve</MicroLabel>
          </div>
          <p className="mt-2 text-[17px] font-semibold tracking-tight tabular-nums">
            {fmtAcres(kpis.liveReserve)}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[11.5px] tabular-nums",
              kpis.liveMarkets === 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
            )}
          >
            {kpis.liveMarkets === 0
              ? "region fully built out"
              : `${Math.round(kpis.reservePct)}% of the 2026 reserve`}
          </p>
          {/* King / Kitsap split of the live reserve — King slate-violet,
              Kitsap emerald; the caption carries the same data as text. */}
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            {kpis.liveReserve > 0 ? (
              <>
                <div
                  className="h-full bg-violet-500"
                  style={{ width: `${kpis.liveReserveKingShare}%` }}
                />
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${100 - kpis.liveReserveKingShare}%` }}
                />
              </>
            ) : (
              <div className="h-full w-full bg-zinc-300/70 dark:bg-zinc-700/70" />
            )}
          </div>
          <p className="mt-1 min-w-0 truncate text-[10.5px] tabular-nums text-muted-foreground">
            <span className="font-medium text-violet-600 dark:text-violet-400">King</span>{" "}
            {fmtAcres(kpis.liveReserveKing)} ·{" "}
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Kitsap</span>{" "}
            {fmtAcres(kpis.liveReserveKitsap)}
          </p>
        </div>

        <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <MicroLabel className="min-w-0">Next exhaustion</MicroLabel>
          </div>
          <p className="mt-2 text-[17px] font-semibold tracking-tight tabular-nums">
            {kpis.next ? (
              <>
                <span style={{ color: kpis.next.tierColor }}>{kpis.next.year}</span>
                <span className="font-medium text-muted-foreground">
                  {" · "}
                  {kpis.next.name}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[11.5px] tabular-nums",
              kpis.next ? "text-muted-foreground" : "text-rose-600 dark:text-rose-400"
            )}
          >
            {kpis.next
              ? `${kpis.next.yearsOut} ${
                  kpis.next.yearsOut === 1 ? "yr" : "yrs"
                } out from ${timelineYear}`
              : "every market is past exhaustion"}
          </p>
        </div>
      </div>

      {/* Depletion-timeline scrubber — watch the region go dark */}
      <div className="mt-4 rounded-xl border bg-muted/30 p-3.5 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause the depletion timeline" : "Play the depletion timeline"}
              title={playing ? "Pause" : "Play 2026 → 2046"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                playing
                  ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950"
                  : "border-zinc-300 text-foreground hover:border-emerald-500/60 hover:text-emerald-600 dark:border-zinc-700 dark:hover:text-emerald-400"
              )}
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => scrub(T0)}
              disabled={timelineYear === T0 && !playing}
              aria-label="Reset the timeline to 2026"
              title="Reset to 2026"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                timelineYear === T0
                  ? "cursor-default text-muted-foreground/50"
                  : "border-zinc-300 text-foreground hover:border-emerald-500/60 hover:text-emerald-600 dark:border-zinc-700 dark:hover:text-emerald-400"
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            </button>
            <div>
              <MicroLabel>Depletion Timeline</MicroLabel>
              <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                2026 → 2046 · ticks mark each exhaustion year
              </p>
            </div>
          </div>
          <p className="text-[12.5px] text-muted-foreground tabular-nums">
            As of{" "}
            <span className="text-[15px] font-semibold text-foreground">
              {timelineYear}
            </span>
            <span
              className={cn(
                "ml-2.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                spentCount > 0
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              )}
            >
              {spentCount} of {submarkets.length} past exhaustion
            </span>
          </p>
        </div>

        <div className="relative">
          <Slider
            value={[timelineYear]}
            min={T0}
            max={T1}
            step={1}
            onValueChange={(v) => scrub(v[0])}
            aria-label="Scrub the depletion timeline year"
          />
          {/* Exhaustion-year tick marks, punched out of the track */}
          {submarkets.map((s) => {
            const pct = ((s.depletionYear - T0) / (T1 - T0)) * 100;
            const passed = timelineYear >= s.depletionYear;
            return (
              <span
                key={s.slug}
                className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pct}%` }}
                title={`${s.name} exhausts ${s.depletionYear}`}
              >
                <span
                  className={cn(
                    "block h-2 w-2 rounded-full ring-[2.5px] ring-[#e4e4e7] dark:ring-[#27272a]",
                    passed
                      ? "bg-rose-500"
                      : "bg-zinc-400 dark:bg-zinc-500"
                  )}
                  aria-hidden
                />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
