"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Download,
  Droplets,
  Flame,
  LandPlot,
  Recycle,
  Table2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadCsv, timestampSuffix, toCsv } from "@/lib/csv";
import { useToast } from "@/hooks/use-toast";
import {
  fmtAcres,
  fmtCurrency,
  fmtPct,
  findComparableMarkets,
  futureValue,
  netBuildableMid,
  runwayYears,
  type PropertyListing,
  type Submarket,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";
import {
  CagrBadge,
  DepletionBadge,
  FrameworkBadge,
  KeyStatRow,
  MicroLabel,
  StatCard,
  StateBadge,
} from "./shared";
import { ListingDialog } from "./listing-dialog";

const START_YEAR = 2026;
const HORIZON = 20;

/** Signed delta chip: emerald when the comparable is richer, zinc when leaner. */
function DeltaChip({
  label,
  delta,
  format,
  invert = false,
}: {
  label: string;
  delta: number;
  format: (v: number) => string;
  /** For metrics where "higher is worse" (e.g. price when buying) — flips the color logic. */
  invert?: boolean;
}) {
  const flat = Math.abs(delta) < 0.05;
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta >= 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums",
        flat
          ? "border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300"
          : good
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
      )}
      title={`${label} vs ${format(Math.abs(delta))} ${delta >= 0 ? "higher" : "lower"}`}
    >
      {flat ? null : <Icon className="h-2.5 w-2.5" aria-hidden />}
      {format(delta)}
    </span>
  );
}

export function SubmarketDetailView({
  slug,
  submarkets,
  listings,
  navigate,
}: {
  slug: string;
  submarkets: Submarket[];
  listings: PropertyListing[];
  navigate: NavigateFn;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast } = useToast();

  const market = submarkets.find((s) => s.slug === slug);

  const corridorCagr = useMemo(
    () =>
      submarkets.length > 0
        ? submarkets.reduce((a, s) => a + s.projectedCagr, 0) / submarkets.length
        : 5,
    [submarkets]
  );

  const series = useMemo(() => {
    if (!market) return [];
    const points: { year: number; market: number; corridor: number }[] = [];
    for (let n = 0; n <= HORIZON; n++) {
      points.push({
        year: START_YEAR + n,
        market: futureValue(market.baselinePrice2026, market.projectedCagr, n),
        corridor: futureValue(market.baselinePrice2026, corridorCagr, n),
      });
    }
    return points;
  }, [market, corridorCagr]);

  const marketListings = useMemo(
    () => (market ? listings.filter((l) => l.submarketId === market.id) : []),
    [listings, market]
  );

  if (!market) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 pb-16 pt-24 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-semibold">Micro-market not found</p>
        <p className="max-w-md text-sm text-muted-foreground">
          No jurisdiction in the corridor ledger matches &quot;{slug}&quot;.
        </p>
        <Button onClick={() => navigate({ view: "matrix" })} className="gap-2">
          <Table2 className="h-4 w-4" aria-hidden />
          Back to the Master Matrix
        </Button>
      </div>
    );
  }

  const depletionN = market.depletionYear - START_YEAR;
  const depletionValue =
    depletionN >= 0 && depletionN <= HORIZON
      ? futureValue(market.baselinePrice2026, market.projectedCagr, depletionN)
      : null;
  const fv2046 = futureValue(market.baselinePrice2026, market.projectedCagr, 20);
  const outperformance =
    ((Math.pow(1 + market.projectedCagr / 100, 20) /
      Math.pow(1 + corridorCagr / 100, 20)) -
      1) * 100;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        onClick={() => navigate({ view: "matrix" })}
        className="mb-6 h-9 gap-2 text-[13px] text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Master Matrix
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <MicroLabel>Micro-Market Profile</MicroLabel>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {market.name}
            <StateBadge state={market.state} />
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <FrameworkBadge framework={market.regulatoryFramework} />
            <CagrBadge cagr={market.projectedCagr} />
            <DepletionBadge year={market.depletionYear} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {market.county} · {market.jurisdictionType} ·{" "}
            {market.listingCount ?? marketListings.length} active listing
            {marketListings.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        {market.summaryNarrative}
      </p>

      {/* KPI grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={LandPlot}
          label="Net buildable band"
          value={`${fmtAcres(market.netBuildableAcresMin)}–${fmtAcres(market.netBuildableAcresMax)}`}
          sub={`of ${fmtAcres(market.totalFootprintAcres)} UGB/UGA footprint · ${fmtAcres(market.grossVacantAcres)} gross vacant`}
        />
        <StatCard
          icon={Building2}
          label="2026 baseline median"
          value={fmtCurrency(market.baselinePrice2026, { compact: true })}
          sub={`$${Math.round(market.pricePerSqftMin)}–$${Math.round(market.pricePerSqftMax)} / sqft · ${market.daysOnMarketMin}–${market.daysOnMarketMax} DOM`}
        />
        <StatCard
          icon={Flame}
          label="2046 projected band"
          value={`${fmtCurrency(market.projectedPrice2046Min, { compact: true })}–${fmtCurrency(market.projectedPrice2046Max, { compact: true })}`}
          sub={`vs corridor mean: ${outperformance >= 0 ? "+" : ""}${outperformance.toFixed(0)}% cumulative`}
          accent="emerald"
        />
        <StatCard
          icon={Droplets}
          label="Terminal depletion"
          value={String(market.depletionYear)}
          sub={`${market.depletionYear - START_YEAR} years of raw-land runway remain`}
          accent={market.depletionYear - START_YEAR <= 8 ? "rose" : "amber"}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        {/* Projection chart */}
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <MicroLabel>Compound Projection · 2026–2046</MicroLabel>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {market.name} at {fmtPct(market.projectedCagr)} vs the same
                baseline compounding at the {fmtPct(corridorCagr)} corridor mean
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                {market.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-zinc-400" aria-hidden />
                Corridor mean
              </span>
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ strokeWidth: 0 }}
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
                  formatter={(value: number, name: string) => [
                    fmtCurrency(value),
                    name === "market" ? market.name : "Corridor mean",
                  ]}
                  labelFormatter={(y) => `${y}`}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="corridor"
                  stroke="#a1a1aa"
                  strokeWidth={1.75}
                  strokeDasharray="5 4"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="market"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#marketFill)"
                />
                {depletionValue !== null ? (
                  <ReferenceDot
                    x={market.depletionYear}
                    y={depletionValue}
                    r={6}
                    fill="#f43f5e"
                    stroke="var(--background)"
                    strokeWidth={2.5}
                    aria-label={`Raw land exhausted in ${market.depletionYear}`}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3 text-[12px] text-muted-foreground">
            <span>
              Terminal value{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {fmtCurrency(fv2046, { compact: true })}
              </span>{" "}
              · {Math.pow(1 + market.projectedCagr / 100, 20).toFixed(2)}× multiple
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden />
              Raw-land exhaustion {market.depletionYear}
            </span>
          </div>
        </div>

        {/* Infrastructure + inventory detail */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <MicroLabel>Inventory Ledger</MicroLabel>
            <div className="mt-2 px-0.5 py-0.5">
              <KeyStatRow label="UGB/UGA footprint" value={fmtAcres(market.totalFootprintAcres)} />
              <KeyStatRow label="Gross vacant acres" value={fmtAcres(market.grossVacantAcres)} />
              <KeyStatRow
                label="Net buildable band"
                value={`${fmtAcres(market.netBuildableAcresMin)} – ${fmtAcres(market.netBuildableAcresMax)}`}
              />
              <KeyStatRow label="Net-after-constraint ratio" value={`${(((market.netBuildableAcresMin + market.netBuildableAcresMax) / 2) / market.grossVacantAcres * 100).toFixed(0)}% of gross`} />
              <KeyStatRow label="2026 baseline median" value={fmtCurrency(market.baselinePrice2026)} />
              <KeyStatRow
                label="Price per sqft"
                value={`$${Math.round(market.pricePerSqftMin)} – $${Math.round(market.pricePerSqftMax)}`}
              />
              <KeyStatRow
                label="Days on market"
                value={`${market.daysOnMarketMin} – ${market.daysOnMarketMax}`}
              />
              <KeyStatRow label="Projected CAGR" value={fmtPct(market.projectedCagr)} />
              <KeyStatRow
                label="2046 forecast band"
                value={
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {fmtCurrency(market.projectedPrice2046Min, { compact: true })} –{" "}
                    {fmtCurrency(market.projectedPrice2046Max, { compact: true })}
                  </span>
                }
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
            <MicroLabel>Infrastructure &amp; Constraints</MicroLabel>
            <div className="flex items-start gap-3 rounded-lg border bg-background p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Droplets className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Water
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed">{market.waterPurveyor}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-background p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Recycle className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Wastewater
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed">{market.wastewaterSystem}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Flame className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Primary constraints &amp; WUI fire risk
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed">{market.primaryConstraints}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparable micro-markets — structural peers for cross-shopping */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel>Comparable Micro-Markets</MicroLabel>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
              Structural peers across the corridor
            </h2>
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
              Ranked by proximity on the four structural axes that drive this
              ledger — appreciation rate (45%), baseline price (25%), land
              supply (15%), and depletion runway (15%). Deltas are shown
              against {market.name}.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-[12.5px]"
            onClick={() => {
              const peers = findComparableMarkets(market, submarkets, 3);
              const headers = [
                "Rank",
                "Market",
                "State",
                "County",
                "Jurisdiction",
                "Baseline 2026 ($)",
                "20-yr CAGR (%)",
                `CAGR vs ${market.name} (pp)`,
                `Baseline vs ${market.name} ($)`,
                `Net buildable (ac mid)`,
                `Buildable vs ${market.name} (ac)`,
                `Runway vs ${market.name} (yr)`,
              ];
              const rows = peers.map((peer, i) => [
                i + 1,
                peer.name,
                peer.state,
                peer.county,
                peer.jurisdictionType,
                peer.baselinePrice2026,
                peer.projectedCagr,
                +(peer.projectedCagr - market.projectedCagr).toFixed(1),
                peer.baselinePrice2026 - market.baselinePrice2026,
                netBuildableMid(peer),
                Math.round(netBuildableMid(peer) - netBuildableMid(market)),
                runwayYears(peer.depletionYear) - runwayYears(market.depletionYear),
              ]);
              downloadCsv(
                `comparables-${market.slug}-${timestampSuffix()}`,
                toCsv(headers, rows)
              );
              toast({
                title: "Comparables exported",
                description: `${peers.length} structural peers vs ${market.name} → CSV.`,
              });
            }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export CSV
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {findComparableMarkets(market, submarkets, 3).map((peer, i) => {
            const dCagr = peer.projectedCagr - market.projectedCagr;
            const dPrice = peer.baselinePrice2026 - market.baselinePrice2026;
            const dNet = netBuildableMid(peer) - netBuildableMid(market);
            const dRunway = runwayYears(peer.depletionYear) - runwayYears(market.depletionYear);
            return (
              <button
                key={peer.id}
                type="button"
                onClick={() => navigate({ view: "submarket", slug: peer.slug })}
                className="group flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md dark:hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                aria-label={`Open the ${peer.name}, ${peer.state} profile`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                      {peer.name}
                      <StateBadge state={peer.state} />
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {peer.county} · {peer.jurisdictionType}
                    </p>
                  </div>
                  <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-muted px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    #{i + 1} match
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <DeltaChip
                    label="20-yr CAGR"
                    delta={dCagr}
                    format={(v) => `${v >= 0 ? "+" : "−"}${fmtPct(Math.abs(v))}`}
                  />
                  <DeltaChip
                    label="Baseline price"
                    delta={dPrice}
                    invert
                    format={(v) =>
                      `${v >= 0 ? "+" : "−"}${fmtCurrency(Math.abs(v), { compact: true })}`
                    }
                  />
                  <DeltaChip
                    label="Net buildable"
                    delta={dNet}
                    format={(v) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))} ac`}
                  />
                  <DeltaChip
                    label="Land runway"
                    delta={dRunway}
                    format={(v) => `${v >= 0 ? "+" : "−"}${Math.abs(v)} yr`}
                  />
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t pt-3">
                  <span className="text-[11.5px] text-muted-foreground tabular-nums">
                    {fmtCurrency(peer.baselinePrice2026, { compact: true })} base ·{" "}
                    {fmtPct(peer.projectedCagr)} CAGR
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Open profile
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Listings */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <MicroLabel>Active Inventory · {market.name}</MicroLabel>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
              {marketListings.length} listing{marketListings.length === 1 ? "" : "s"} in
              this micro-market
            </h2>
          </div>
          <Button
            variant="outline"
            className="h-9 gap-2 text-[13px]"
            onClick={() => navigate({ view: "listings" })}
          >
            Full showcase
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" aria-hidden />
          </Button>
        </div>

        {marketListings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {marketListings.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setDetailId(l.id)}
                className="group flex items-center gap-4 overflow-hidden rounded-xl border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                aria-label={`View ${l.title}`}
              >
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={l.imageUrl}
                    alt={l.title}
                    fill
                    sizes="112px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold leading-snug">
                    {l.title}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums">
                    {fmtCurrency(l.price, { compact: true })}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground tabular-nums">
                    {fmtAcres(l.acreage, l.acreage < 1 ? 2 : 1)} · {l.zoningCode}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No active listings in this micro-market right now — supply this
            thin moves by appointment.
          </div>
        )}
      </section>

      <ListingDialog
        listing={marketListings.find((l) => l.id === detailId) ?? null}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        navigate={navigate}
      />
    </div>
  );
}
