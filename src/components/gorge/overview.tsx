"use client";

import { useMemo } from "react";
import Image from "next/image";
import { ArrowRight, ChevronDown, Flame, Layers, LineChart, Map, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import {
  fmtAcres,
  fmtCurrency,
  fmtPct,
  futureValue,
  type CorridorStats,
  type PropertyListing,
  type Submarket,
} from "@/lib/gorge";
import type { RegionContent } from "@/lib/region-content";
import type { NavigateFn, Route } from "./gorge-app";
import {
  CountUp,
  MicroLabel,
  SectionHeader,
  Sparkline,
  StatCard,
  StateBadge,
} from "./shared";
import { CorridorMap } from "./corridor-map";
import { PugetSoundMap } from "./puget-sound-map";
import { FrameworkExplorer } from "./framework-explorer";
import { ArbitrageSpotlight, PugetArbitrageSpotlight } from "./arbitrage-spotlight";

/** Small drilldown chip rendered in a StatCard's action slot. */
function DrilldownChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/chip inline-flex h-7 max-w-full items-center gap-1.5 truncate rounded-md border px-2.5 text-[12px] font-medium text-muted-foreground transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-700 active:scale-[0.97] dark:hover:text-emerald-300"
    >
      <span className="truncate">{label}</span>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 transition-transform group-hover/chip:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

function Hero({
  stats,
  content,
  navigate,
}: {
  stats: CorridorStats;
  content: RegionContent;
  navigate: NavigateFn;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-zinc-950">
      <Image
        src={content.heroImage}
        alt={content.heroAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.14),transparent_55%)]" />

      <div className="relative mx-auto flex min-h-[540px] max-w-7xl flex-col justify-end px-4 pb-14 pt-20 sm:px-6 lg:px-8">
        <MicroLabel className="text-emerald-300/90">{content.eyebrow}</MicroLabel>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {content.headline}
          <span className="text-emerald-400">{content.headlineAccent}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-300 sm:text-base">
          {content.heroBody}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate({ view: "matrix" })}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
          >
            {content.ctaPrimary}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => navigate({ view: "projections" })}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/15 px-5 text-sm font-semibold text-white shadow-lg shadow-zinc-950/30 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20 focus-visible:border-white/60"
          >
            <LineChart className="h-4 w-4" aria-hidden />
            {content.ctaSecondary}
          </button>
        </div>

        <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-lg shadow-zinc-950/20 backdrop-blur-md sm:grid-cols-4">
          {[
            { k: "Jurisdictions", v: String(stats.submarketCount) },
            { k: "Net buildable", v: `${fmtAcres(stats.totalNetBuildableMid)} band` },
            { k: "Median price 2026", v: fmtCurrency(stats.regionalMedianPrice, { compact: true }) },
            { k: "Avg 20-yr CAGR", v: fmtPct(stats.averageCagr) },
          ].map((s) => (
            <div key={s.k} className="bg-zinc-950/70 px-4 py-3.5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                {s.k}
              </dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums text-white">
                {s.v}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#region-metrics"
        aria-label="Scroll to regional metrics"
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-200 sm:flex"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">
          Scroll
        </span>
        <ChevronDown className="h-4 w-4" aria-hidden />
      </motion.a>
    </section>
  );
}

function AppreciationLeaderboard({
  submarkets,
  navigate,
}: {
  submarkets: Submarket[];
  navigate: NavigateFn;
}) {
  const ranked = [...submarkets].sort((a, b) => b.projectedCagr - a.projectedCagr);
  const max = ranked[0]?.projectedCagr ?? 1;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <MicroLabel>Appreciation Leaderboard</MicroLabel>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
        Projected 20-year CAGR
      </h3>
      <div className="thin-scroll mt-4 max-h-96 space-y-1 overflow-y-auto pr-2">
        {ranked.map((s, i) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => navigate({ view: "submarket", slug: s.slug })}
            className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
          >
            <span className="w-6 shrink-0 text-right text-[12px] font-semibold tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <span className="w-32 shrink-0 truncate text-[13px] font-medium sm:w-40">
              {s.name}
            </span>
            <StateBadge state={s.state} />
            <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:block">
              <span
                className="block h-full rounded-full bg-emerald-500/80"
                style={{ width: `${(s.projectedCagr / max) * 100}%` }}
              />
            </span>
            <span className="ml-auto shrink-0 text-[13px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 sm:ml-0">
              {fmtPct(s.projectedCagr)}
            </span>
            <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

function DepletionClock({
  submarkets,
  scopeWord = "corridor",
}: {
  submarkets: Submarket[];
  scopeWord?: string;
}) {
  const ordered = [...submarkets].sort((a, b) => a.depletionYear - b.depletionYear);
  const first = ordered[0]?.depletionYear ?? 2032;
  const last = ordered[ordered.length - 1]?.depletionYear ?? 2038;
  const span = last - first || 1;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <MicroLabel>Raw-Land Depletion Clock</MicroLabel>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
        Terminal exhaustion window {first}–{last}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        At current absorption, the {scopeWord}'s unentitled raw land converts to
        final lots inside a single decade — the scarcity engine behind every
        projection on this platform.
      </p>
      <div className="thin-scroll mt-4 max-h-96 space-y-2.5 overflow-y-auto pr-2">
        {ordered.map((s) => {
          const yearsLeft = s.depletionYear - 2026;
          const progress = ((s.depletionYear - first) / span) * 100;
          return (
            <div key={s.slug} className="rounded-lg border bg-background px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <Flame
                    className={`h-3.5 w-3.5 ${yearsLeft <= 8 ? "text-rose-500" : "text-amber-500"}`}
                    aria-hidden
                  />
                  {s.name}
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
                  {s.depletionYear}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${yearsLeft <= 8 ? "bg-rose-500/70" : "bg-amber-500/70"}`}
                  style={{ width: `${Math.max(8, 100 - progress)}%` }}
                  title={`${yearsLeft} years of raw-land runway remain`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OverviewView({
  submarkets,
  stats,
  listings,
  navigate,
  content,
}: {
  submarkets: Submarket[];
  stats: CorridorStats;
  listings: PropertyListing[];
  navigate: NavigateFn;
  content: RegionContent;
}) {
  const featured = listings.find((l) => l.featured) ?? null;

  /* Drilldown targets for the KPI cards — computed, never hard-coded. */
  const drill = useMemo(() => {
    const byPrice = [...submarkets].sort(
      (a, b) => a.baselinePrice2026 - b.baselinePrice2026
    );
    const medianMarket = byPrice[Math.floor(byPrice.length / 2)];
    const byCagr = [...submarkets].sort(
      (a, b) => b.projectedCagr - a.projectedCagr
    );
    const topCagr = byCagr[0];
    const floorCagr = byCagr[byCagr.length - 1];
    const byDepletion = [...submarkets].sort(
      (a, b) => a.depletionYear - b.depletionYear
    );
    const firstGone = byDepletion[0];
    const lastGone = byDepletion[byDepletion.length - 1];
    return { byPrice, medianMarket, topCagr, floorCagr, firstGone, lastGone };
  }, [submarkets]);

  /** Navigate into the projections workspace with a preset query.
   *  Leaves a breadcrumb flag so the target can offer a one-click
   *  "← back to overview" affordance (round 7). */
  const goToProjections = (query: string) => {
    try {
      sessionStorage.setItem("crgnsa-drill-from", "overview");
    } catch {
      /* storage unavailable — the back-link simply won't surface */
    }
    navigate({ view: "projections", query });
  };

  /* KPI sparkline series — 21 annual points, 2026–2046. */
  const SPARK_YEARS = 20;
  const sparkPoints = useMemo(() => {
    // 1) Median price compounding at the corridor-average CAGR.
    const median: number[] = [];
    // 2) Corridor aggregate buildable land remaining (linear absorption to
    //    the latest depletion year, then zero).
    const land: number[] = [];
    // 3) Cumulative markets past raw-land exhaustion.
    const exhausted: number[] = [];
    // 4) Growth of a $1 unit at the average CAGR (multiple curve).
    const multiple: number[] = [];
    const latest = stats.latestDepletion ?? 2038;
    for (let n = 0; n <= SPARK_YEARS; n++) {
      const year = 2026 + n;
      median.push(futureValue(stats.regionalMedianPrice, stats.averageCagr, n));
      const runway = Math.max(0, latest - year);
      land.push((runway / Math.max(1, latest - 2026)) * stats.totalNetBuildableMid);
      exhausted.push(
        submarkets.filter((s) => s.depletionYear <= year).length
      );
      multiple.push(Math.pow(1 + stats.averageCagr / 100, n));
    }
    return { median, land, exhausted, multiple };
  }, [stats, submarkets]);

  return (
    <div className="flex flex-col gap-14 pb-16 sm:gap-16">
      <Hero stats={stats} content={content} navigate={navigate} />

      {/* Macro KPIs */}
      <section
        id="region-metrics"
        aria-label="Regional key metrics"
        className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8"
      >
        <SectionHeader
          eyebrow="Executive Overview"
          title={content.metricsTitle}
          description={content.metricsDescription}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Layers}
            label={`${content.scopeWord === "corridor" ? "Corridor" : "Regional"} buildable reserve`}
            value={
              <CountUp
                target={stats.totalNetBuildableMid}
                format={(v) => fmtAcres(Math.round(v))}
              />
            }
            sub={`band ${fmtAcres(stats.totalNetBuildableMin)} – ${fmtAcres(stats.totalNetBuildableMax)} · gross vacant ${fmtAcres(stats.totalGrossVacant)}`}
            sparkline={
              <Sparkline
                points={sparkPoints.land}
                color="#64748b"
                label={`${content.scopeWord} buildable land declining to zero by the late 2030s`}
              />
            }
            footer={
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Map className="h-3.5 w-3.5" aria-hidden />
                {stats.orNetBuildable > 0 ? (
                  <>
                    OR {fmtAcres(Math.round(stats.orNetBuildable))} · WA {fmtAcres(Math.round(stats.waNetBuildable))}
                  </>
                ) : (
                  <>
                    WA {fmtAcres(Math.round(stats.waNetBuildable))} · all Washington side
                  </>
                )}
              </div>
            }
            action={
              <DrilldownChip
                label="Audit the inventory →"
                onClick={() => navigate({ view: "matrix" })}
              />
            }
          />
          <StatCard
            icon={TrendingUp}
            label="Regional median price · 2026"
            value={
              <CountUp
                target={stats.regionalMedianPrice}
                format={(v) => fmtCurrency(Math.round(v), { compact: true })}
              />
            }
            sub={`${stats.submarketCount}-jurisdiction median baseline, all product types`}
            sparkline={
              <Sparkline
                points={sparkPoints.median}
                color="#0d9488"
                label={`Median price compounding at the ${content.scopeWord}-average CAGR to 2046`}
              />
            }
            footer={
              <div className="text-[12px] text-muted-foreground">
                {drill.byPrice[0]?.name} entry{" "}
                {fmtCurrency(drill.byPrice[0]?.baselinePrice2026 ?? 0, { compact: true })} →{" "}
                {drill.byPrice[drill.byPrice.length - 1]?.name}{" "}
                {fmtCurrency(
                  drill.byPrice[drill.byPrice.length - 1]?.baselinePrice2026 ?? 0,
                  { compact: true }
                )}
              </div>
            }
            action={
              <DrilldownChip
                label={`Project ${drill.medianMarket?.name} at the median →`}
                onClick={() =>
                  goToProjections(
                    `m=${drill.medianMarket.slug}&pv=${
                      Math.round(stats.regionalMedianPrice / 5000) * 5000
                    }&r=${stats.averageCagr.toFixed(1)}&n=20&s=1`
                  )
                }
              />
            }
          />
          <StatCard
            icon={LineChart}
            label="Average projected CAGR"
            value={
              <CountUp
                target={stats.averageCagr}
                format={(v) => fmtPct(v)}
                duration={1.3}
              />
            }
            sub={`20-year horizon to 2046, ${content.scopeWord}-wide mean`}
            accent="emerald"
            sparkline={
              <Sparkline
                points={sparkPoints.multiple}
                color="#10b981"
                label={`Growth multiple of one dollar at the average ${content.scopeWord} CAGR`}
              />
            }
            footer={
              <div className="text-[12px] text-muted-foreground">
                Top market: {drill.topCagr?.name} {fmtPct(drill.topCagr?.projectedCagr ?? 0)} · floor:{" "}
                {drill.floorCagr?.name} {fmtPct(drill.floorCagr?.projectedCagr ?? 0)}
              </div>
            }
            action={
              <DrilldownChip
                label={`See the CAGR spread (${drill.topCagr?.name} vs ${drill.floorCagr?.name}) →`}
                onClick={() =>
                  goToProjections(
                    `m=${drill.topCagr.slug},${drill.floorCagr.slug}&r=${stats.averageCagr.toFixed(1)}&s=1`
                  )
                }
              />
            }
          />
          <StatCard
            icon={Flame}
            label="Terminal raw-land depletion"
            value={`${stats.earliestDepletion}–${stats.latestDepletion}`}
            sub="Estimated window when net buildable acreage reaches zero"
            accent="rose"
            sparkline={
              <Sparkline
                points={sparkPoints.exhausted.map((v) => v + 0.15)}
                color="#f43f5e"
                label="Cumulative count of markets past raw-land exhaustion"
              />
            }
            footer={
              <div className="text-[12px] text-muted-foreground">
                {drill.firstGone?.name} exhausts first ({stats.earliestDepletion});{" "}
                {drill.lastGone?.name} last ({stats.latestDepletion})
              </div>
            }
            action={
              <DrilldownChip
                label={`Model the exhaustion (${drill.firstGone?.name} → ${drill.lastGone?.name}) →`}
                onClick={() =>
                  goToProjections(
                    `m=${drill.firstGone.slug},${drill.lastGone.slug}&s=1&d=1`
                  )
                }
              />
            }
          />
        </div>
      </section>

      {/* Map */}
      <section aria-label="Regional map" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Regional Geography"
          title={content.mapTitle}
          description={content.mapDescription}
        />
        {content.map === "puget" ? (
          <PugetSoundMap
            submarkets={submarkets}
            stats={stats}
            navigate={navigate}
          />
        ) : (
          <CorridorMap
            submarkets={submarkets}
            stats={stats}
            navigate={navigate}
          />
        )}
      </section>

      {/* Regulatory framework */}
      <section aria-label="Regulatory framework" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Regulatory Framework"
          title={content.frameworkTitle}
          description={content.frameworkDescription}
        />
        <FrameworkExplorer frameworks={content.frameworks} />
      </section>

      {/* State arbitrage */}
      <section aria-label="Tax arbitrage spotlight" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Arbitrage Spotlight"
          title={content.arbitrageTitle}
          description={content.arbitrageDescription}
        />
        {content.arbitrage === "wa-ca" ? (
          <PugetArbitrageSpotlight />
        ) : (
          <ArbitrageSpotlight />
        )}
      </section>

      {/* Leaderboards */}
      <section aria-label="Market snapshot" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Market Snapshot"
          title="Who compounds fastest, who runs out first"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <AppreciationLeaderboard submarkets={submarkets} navigate={navigate} />
          <DepletionClock submarkets={submarkets} scopeWord={content.scopeWord} />
        </div>
      </section>

      {/* Featured listing teaser */}
      {featured ? (
        <section aria-label="Featured asset" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative isolate overflow-hidden rounded-xl border bg-zinc-950">
            <Image
              src={featured.imageUrl}
              alt={featured.title}
              fill
              sizes="(max-width: 1024px) 100vw, 1152px"
              className="object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="relative flex flex-col gap-5 p-6 sm:p-10 lg:max-w-2xl">
              <MicroLabel className="text-emerald-300/90">{content.featuredLabel}</MicroLabel>
              <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                {featured.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300">
                {featured.acreage} deed acres under {featured.zoningCode} zoning
                in {featured.submarket?.name ?? "the region"}
                {featured.submarket
                  ? ` — the ${featured.submarket.regulatoryFramework} market compounding at ${fmtPct(
                      featured.submarket.projectedCagr
                    )} through 2046`
                  : ""}
                , listed at{" "}
                {fmtCurrency(featured.price, { compact: true })}.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  featured.squareFeet > 0
                    ? `${featured.squareFeet.toLocaleString()} sq ft`
                    : "Unimproved land",
                  featured.bedrooms > 0
                    ? `${featured.bedrooms} bd / ${featured.bathrooms} ba`
                    : "Development site",
                  featured.submarket?.county,
                  `Depletion ${featured.submarket?.depletionYear}`,
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-sm border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate({ view: "listings" })}
                className="mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
              >
                View the listings showcase
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
