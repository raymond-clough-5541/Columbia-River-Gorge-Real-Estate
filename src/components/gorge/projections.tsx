"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Flame,
  LineChart as LineChartIcon,
  RotateCcw,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildProjectionSeries,
  fmtCurrency,
  fmtPct,
  futureValue,
  type Submarket,
} from "@/lib/gorge";
import {
  CagrBadge,
  DepletionBadge,
  MicroLabel,
  SectionHeader,
  StateBadge,
} from "./shared";

const START_YEAR = 2026;
const MAX_SELECTED = 5;
/** Submarket curve palette — emerald is reserved for the custom scenario. */
const PALETTE = ["#0d9488", "#64748b", "#f59e0b", "#f43f5e", "#3f3f46"];
const SCENARIO_COLOR = "#10b981";

interface TooltipEntry {
  name?: string;
  value?: number;
  dataKey?: string | number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  depletionBySlug,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  depletionBySlug: Record<string, number>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const year = Number(label);
  return (
    <div className="rounded-lg border bg-popover p-3.5 text-popover-foreground shadow-xl">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
        {year}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => {
          const value = entry.value ?? 0;
          const isScenario = entry.dataKey === "scenario";
          const depletion = isScenario
            ? null
            : depletionBySlug[String(entry.dataKey)];
          const depleted = depletion !== null && depletion !== undefined && year >= depletion;
          return (
            <div key={String(entry.dataKey)} className="flex items-center gap-2.5 text-[13px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="font-medium">{entry.name}</span>
              <span className="ml-auto pl-4 font-semibold tabular-nums">
                {fmtCurrency(value, { compact: true })}
              </span>
              {depleted ? (
                <Flame className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-label="Raw land depleted" />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 border-t pt-1.5 text-[11px] text-muted-foreground">
        🜂 marks years after a market's projected raw-land exhaustion
      </p>
    </div>
  );
}

export function ProjectionsView({ submarkets }: { submarkets: Submarket[] }) {
  const defaultSelected = useMemo(
    () =>
      ["hood-river", "the-dalles", "dallesport"].filter((slug) =>
        submarkets.some((s) => s.slug === slug)
      ),
    [submarkets]
  );
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [pv, setPv] = useState(455000);
  const [cagr, setCagr] = useState(4.7);
  const [horizon, setHorizon] = useState(20);
  const [showScenario, setShowScenario] = useState(true);

  const selectedMarkets = submarkets.filter((s) => selected.includes(s.slug));
  const endYear = START_YEAR + horizon;

  const series = useMemo(() => {
    const points: Record<string, number | boolean>[] = [];
    for (let n = 0; n <= horizon; n++) {
      const year = START_YEAR + n;
      const row: Record<string, number | boolean> = { year };
      for (const s of selectedMarkets) {
        row[s.slug] = futureValue(s.baselinePrice2026, s.projectedCagr, n);
      }
      if (showScenario) {
        row.scenario = futureValue(pv, cagr, n);
      }
      points.push(row);
    }
    return points;
  }, [selectedMarkets, horizon, pv, cagr, showScenario]);

  const depletionBySlug = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of selectedMarkets) map[s.slug] = s.depletionYear;
    return map;
  }, [selectedMarkets]);

  const scenarioFv = futureValue(pv, cagr, horizon);
  const scenarioMultiple = Math.pow(1 + cagr / 100, horizon);

  const toggleSelected = (slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug) || [];
      }
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, slug];
    });
  };

  const reset = () => {
    setSelected(defaultSelected);
    setPv(455000);
    setCagr(4.7);
    setHorizon(20);
    setShowScenario(true);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Compound Capitalization & Land Depletion Visualizer"
        title="FV = PV · (1 + r)ⁿ, applied to every market in the Gorge"
        description="Select submarkets, override the baseline price and growth rate, and stretch the horizon to stress-test development hypotheses against the corridor's statutory land ceiling."
        action={
          <Button
            variant="outline"
            onClick={reset}
            className="h-9 gap-2 text-[13px]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset defaults
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Controls */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <MicroLabel>Submarkets</MicroLabel>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Up to {MAX_SELECTED} concurrent curves
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {submarkets.map((s) => {
                const idx = selected.indexOf(s.slug);
                const isOn = idx >= 0;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => toggleSelected(s.slug)}
                    aria-pressed={isOn}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-all",
                      isOn
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950"
                        : "bg-background text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-600"
                    )}
                  >
                    {isOn ? (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        aria-hidden
                      />
                    ) : null}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
            <MicroLabel>Scenario Inputs</MicroLabel>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="proj-pv" className="text-[13px] text-muted-foreground">
                  Baseline price · PV
                </label>
                <span className="text-sm font-semibold tabular-nums">
                  {fmtCurrency(pv, { compact: true })}
                </span>
              </div>
              <Slider
                id="proj-pv"
                value={[pv]}
                onValueChange={(v) => setPv(v[0])}
                min={250000}
                max={900000}
                step={5000}
                aria-label="Baseline price"
              />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="proj-cagr" className="text-[13px] text-muted-foreground">
                  Growth rate · r
                </label>
                <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {fmtPct(cagr)}
                </span>
              </div>
              <Slider
                id="proj-cagr"
                value={[cagr]}
                onValueChange={(v) => setCagr(v[0])}
                min={3}
                max={8}
                step={0.1}
                aria-label="Compound annual growth rate"
              />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="proj-horizon" className="text-[13px] text-muted-foreground">
                  Horizon · n years
                </label>
                <span className="text-sm font-semibold tabular-nums">
                  {horizon} yrs → {endYear}
                </span>
              </div>
              <Slider
                id="proj-horizon"
                value={[horizon]}
                onValueChange={(v) => setHorizon(v[0])}
                min={5}
                max={25}
                step={1}
                aria-label="Time horizon in years"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowScenario((v) => !v)}
              aria-pressed={showScenario}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border p-3 text-left text-[13px] font-medium transition-colors",
                showScenario ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "bg-background"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SCENARIO_COLOR }}
                  aria-hidden
                />
                Custom scenario curve
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {showScenario ? "On" : "Off"}
              </span>
            </button>
          </div>

          {/* Live formula */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sigma className="h-4 w-4 text-muted-foreground" aria-hidden />
              <MicroLabel>Live Formula</MicroLabel>
            </div>
            <div className="mt-3 space-y-1.5 rounded-lg border bg-background p-3.5 font-mono text-[12.5px] leading-relaxed">
              <p className="text-muted-foreground">FV = PV · (1 + r)ⁿ</p>
              <p>
                FV = {fmtCurrency(pv, { compact: true })} · (1 +{" "}
                {(cagr / 100).toFixed(3)})<sup>{horizon}</sup>
              </p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                FV = {fmtCurrency(scenarioFv, { compact: true })}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-muted/60 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Multiple
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {scenarioMultiple.toFixed(2)}×
                </p>
              </div>
              <div className="rounded-lg bg-muted/60 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Avg gain / yr
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {fmtCurrency((scenarioFv - pv) / horizon, { compact: true })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart + milestones */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <MicroLabel>
                  Appreciation Curves · {START_YEAR}–{endYear}
                </MicroLabel>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground">
                {selectedMarkets.map((s, i) => (
                  <span key={s.slug} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      aria-hidden
                    />
                    {s.name}
                  </span>
                ))}
                {showScenario ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-0.5 w-4 rounded"
                      style={{
                        backgroundColor: SCENARIO_COLOR,
                        borderTop: "2px dashed",
                      }}
                      aria-hidden
                    />
                    Scenario
                  </span>
                ) : null}
              </div>
            </div>

            <div className="h-[380px] w-full sm:h-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={series}
                  margin={{ top: 10, right: 16, bottom: 0, left: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ strokeWidth: 0 }}
                    tickFormatter={(y: number) => `${y}`}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v: number) => fmtCurrency(v, { compact: true })}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                    content={
                      <ChartTooltip depletionBySlug={depletionBySlug} />
                    }
                  />
                  {selectedMarkets.map((s, i) => (
                    <Line
                      key={s.slug}
                      type="monotone"
                      dataKey={s.slug}
                      name={s.name}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeWidth={2.25}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                  {selectedMarkets.map((s, i) => {
                    const color = PALETTE[i % PALETTE.length];
                    const nDepletion = s.depletionYear - START_YEAR;
                    const depletionValue =
                      nDepletion >= 0 && nDepletion <= horizon
                        ? futureValue(s.baselinePrice2026, s.projectedCagr, nDepletion)
                        : null;
                    return depletionValue !== null ? (
                      <ReferenceDot
                        key={`${s.slug}-depletion`}
                        x={s.depletionYear}
                        y={depletionValue}
                        r={6}
                        fill={color}
                        stroke="var(--background)"
                        strokeWidth={2.5}
                        aria-label={`${s.name} raw land exhausted in ${s.depletionYear}`}
                      />
                    ) : null;
                  })}
                  {showScenario ? (
                    <Line
                      type="monotone"
                      dataKey="scenario"
                      name="Your scenario"
                      stroke={SCENARIO_COLOR}
                      strokeWidth={2.75}
                      strokeDasharray="7 5"
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Land depletion milestone strip */}
          <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" aria-hidden />
              <MicroLabel>Raw Land Exhaustion Milestones</MicroLabel>
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Marked on the chart where each curve crosses its market&apos;s
              depletion year — the point after which appreciation is pure
              infill-replacement pricing.
            </p>
            <div className="relative mt-6 h-16">
              <div className="absolute inset-x-0 top-7 h-1 rounded-full bg-muted" />
              <div className="absolute inset-x-0 top-7 h-1 rounded-full bg-gradient-to-r from-emerald-500/70 via-amber-500/70 to-rose-500/70" />
              {selectedMarkets.map((s, i) => {
                const pct = ((s.depletionYear - START_YEAR) / horizon) * 100;
                const clamped = Math.max(0, Math.min(100, pct));
                const color = PALETTE[i % PALETTE.length];
                return (
                  <div
                    key={s.slug}
                    className="absolute flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${clamped}%` }}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border-2"
                      style={{
                        backgroundColor: color,
                        borderColor: "var(--background)",
                        marginTop: "22px",
                      }}
                      aria-hidden
                    />
                    <span className="mt-1.5 whitespace-nowrap rounded-sm border bg-background px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums">
                      {s.name} {s.depletionYear}
                    </span>
                  </div>
                );
              })}
              <span className="absolute left-0 top-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {START_YEAR}
              </span>
              <span className="absolute right-0 top-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {endYear}
              </span>
            </div>
          </div>

          {/* Per-market outcome cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedMarkets.map((s, i) => {
              const fv = futureValue(s.baselinePrice2026, s.projectedCagr, horizon);
              const multiple = Math.pow(1 + s.projectedCagr / 100, horizon);
              const color = PALETTE[i % PALETTE.length];
              return (
                <div
                  key={s.slug}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-[14px] font-semibold">
                      {s.name}
                      <StateBadge state={s.state} />
                    </p>
                    <CagrBadge cagr={s.projectedCagr} showTier={false} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-[12px] text-muted-foreground">
                      {fmtCurrency(s.baselinePrice2026, { compact: true })} →
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmtCurrency(fv, { compact: true })}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" aria-hidden />
                      {multiple.toFixed(2)}× over {horizon} yrs
                    </span>
                    <DepletionBadge year={s.depletionYear} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Underlying series table */}
      <div className="mt-6 overflow-x-auto rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4">
          <MicroLabel>Underlying Series · Annual Snapshots</MicroLabel>
        </div>
        <div className="thin-scroll max-h-72 overflow-auto">
          <table className="w-full min-w-[640px] text-[13px] tabular-nums">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="text-left">
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Year
                </th>
                {selectedMarkets.map((s) => (
                  <th key={s.slug} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.name}
                  </th>
                ))}
                {showScenario ? (
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Scenario
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {series
                .slice()
                .reverse()
                .map((row) => {
                  const year = Number(row.year);
                  const is2046 = year === 2046;
                  return (
                    <tr
                      key={year}
                      className={cn(
                        "border-t",
                        is2046 && "bg-emerald-500/[0.06] font-semibold"
                      )}
                    >
                      <td className="px-5 py-2.5">{year}{is2046 ? " ★" : ""}</td>
                      {selectedMarkets.map((s) => (
                        <td key={s.slug} className="px-4 py-2.5">
                          {fmtCurrency(Number(row[s.slug]), { compact: true })}
                        </td>
                      ))}
                      {showScenario ? (
                        <td className="px-4 py-2.5 text-emerald-700 dark:text-emerald-400">
                          {fmtCurrency(Number(row.scenario), { compact: true })}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
