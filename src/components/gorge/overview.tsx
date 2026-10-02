"use client";

import Image from "next/image";
import {
  ArrowRight,
  Flame,
  Layers,
  LineChart,
  Map,
  TrendingUp,
} from "lucide-react";
import {
  fmtAcres,
  fmtCurrency,
  fmtPct,
  type CorridorStats,
  type PropertyListing,
  type Submarket,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";
import {
  MicroLabel,
  SectionHeader,
  StatCard,
  StateBadge,
} from "./shared";
import { CorridorMap } from "./corridor-map";
import { FrameworkExplorer } from "./framework-explorer";
import { ArbitrageSpotlight } from "./arbitrage-spotlight";

function Hero({ stats }: { stats: CorridorStats }) {
  return (
    <section className="relative isolate overflow-hidden bg-zinc-950">
      <Image
        src="/images/hero-gorge.png"
        alt="Aerial view of the forested Columbia River Gorge at golden hour"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.14),transparent_55%)]" />

      <div className="relative mx-auto flex min-h-[540px] max-w-7xl flex-col justify-end px-4 pb-14 pt-20 sm:px-6 lg:px-8">
        <MicroLabel className="text-emerald-300/90">
          Columbia River Gorge National Scenic Area · Est. 1986
        </MicroLabel>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Statutory land scarcity,
          <span className="text-emerald-400"> priced in decades.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-300 sm:text-base">
          A full-ledger analytics platform for the 11 urban enclaves of the
          Gorge: regulatory land-supply scarcity, urban growth boundaries,
          micro-market pricing, and 20-year compound valuation projections
          across Oregon and Washington.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="#/matrix"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
          >
            Explore the Master Matrix
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <a
            href="#/projections"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <LineChart className="h-4 w-4" aria-hidden />
            Run 20-yr projections
          </a>
        </div>

        <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 backdrop-blur-md sm:grid-cols-4">
          {[
            { k: "Jurisdictions", v: String(stats.submarketCount) },
            { k: "Net buildable", v: `${fmtAcres(stats.totalNetBuildableMid)} band` },
            { k: "Median price 2026", v: fmtCurrency(stats.regionalMedianPrice, { compact: true }) },
            { k: "Avg 20-yr CAGR", v: fmtPct(stats.averageCagr) },
          ].map((s) => (
            <div key={s.k} className="bg-zinc-950/60 px-4 py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                {s.k}
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-white">
                {s.v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
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

function DepletionClock({ submarkets }: { submarkets: Submarket[] }) {
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
        At current absorption, the corridor's unentitled raw land converts to
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
}: {
  submarkets: Submarket[];
  stats: CorridorStats;
  listings: PropertyListing[];
  navigate: NavigateFn;
}) {
  const featured = listings.find((l) => l.featured) ?? null;

  return (
    <div className="flex flex-col gap-14 pb-16 sm:gap-16">
      <Hero stats={stats} />

      {/* Macro KPIs */}
      <section aria-label="Corridor key metrics" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Executive Overview"
          title="The corridor in four numbers"
          description="Every metric below is derived from the per-jurisdiction land inventories in the Master Matrix — the auditable bottom-up view of what remains buildable inside the Scenic Area's urban lines."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Layers}
            label="Corridor buildable reserve"
            value={fmtAcres(stats.totalNetBuildableMid)}
            sub={`band ${fmtAcres(stats.totalNetBuildableMin)} – ${fmtAcres(stats.totalNetBuildableMax)} · gross vacant ${fmtAcres(stats.totalGrossVacant)}`}
            footer={
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Map className="h-3.5 w-3.5" aria-hidden />
                OR {fmtAcres(Math.round(stats.orNetBuildable))} · WA {fmtAcres(Math.round(stats.waNetBuildable))}
              </div>
            }
          />
          <StatCard
            icon={TrendingUp}
            label="Regional median price · 2026"
            value={fmtCurrency(stats.regionalMedianPrice, { compact: true })}
            sub="11-jurisdiction median baseline, all product types"
            footer={
              <div className="text-[12px] text-muted-foreground">
                Wishram entry {fmtCurrency(305000, { compact: true })} → Hood River{" "}
                {fmtCurrency(685000, { compact: true })}
              </div>
            }
          />
          <StatCard
            icon={LineChart}
            label="Average projected CAGR"
            value={fmtPct(stats.averageCagr)}
            sub="20-year horizon to 2046, corridor-wide mean"
            accent="emerald"
            footer={
              <div className="text-[12px] text-muted-foreground">
                Top market: Hood River {fmtPct(5.8)} · floor: Wishram {fmtPct(4.3)}
              </div>
            }
          />
          <StatCard
            icon={Flame}
            label="Terminal raw-land depletion"
            value={`${stats.earliestDepletion}–${stats.latestDepletion}`}
            sub="Estimated window when net buildable acreage reaches zero"
            accent="rose"
            footer={
              <div className="text-[12px] text-muted-foreground">
                Mosier exhausts first ({stats.earliestDepletion}); The Dalles &amp;
                Dallesport last ({stats.latestDepletion})
              </div>
            }
          />
        </div>
      </section>

      {/* Map */}
      <section aria-label="Regional map" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Regional Geography"
          title="Eleven markets, one river, two tax regimes"
          description="Hover any enclave for its supply band and appreciation tier; click through for the full micro-market profile."
        />
        <CorridorMap submarkets={submarkets} stats={stats} navigate={navigate} />
      </section>

      {/* Regulatory framework */}
      <section aria-label="Regulatory framework" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Regulatory Framework"
          title="Why supply cannot respond to demand"
          description="The 1986 Act stacks a federal scenic review over Oregon's Goal 14 and Washington's GMA. Select a lens to see what each layer does to the buildable-land ledger."
        />
        <FrameworkExplorer />
      </section>

      {/* State arbitrage */}
      <section aria-label="State tax arbitrage" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="State Arbitrage Spotlight"
          title="The border on the bridge"
          description="Washington levies no personal income tax; Oregon tops out at 9.9%. The Gorge is one of the only metropolitan-scale labor sheds where the arbitrage is a four-minute commute across a river."
        />
        <ArbitrageSpotlight />
      </section>

      {/* Leaderboards */}
      <section aria-label="Market snapshot" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Market Snapshot"
          title="Who compounds fastest, who runs out first"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <AppreciationLeaderboard submarkets={submarkets} navigate={navigate} />
          <DepletionClock submarkets={submarkets} />
        </div>
      </section>

      {/* Featured listing teaser */}
      {featured ? (
        <section aria-label="Featured asset" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative isolate overflow-hidden rounded-xl border bg-zinc-950">
            <Image
              src={featured.imageUrl}
              alt="Luxury farm and vineyard estate with custom residence in the Columbia River Gorge"
              fill
              sizes="(max-width: 1024px) 100vw, 1152px"
              className="object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="relative flex flex-col gap-5 p-6 sm:p-10 lg:max-w-2xl">
              <MicroLabel className="text-emerald-300/90">Featured Corridor Asset</MicroLabel>
              <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                {featured.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300">
                {featured.acreage} deed acres under {featured.zoningCode} zoning
                with certified water rights, CRGNSA visual-subordinance
                compliance, and a{" "}
                {fmtCurrency(featured.price, { compact: true })} ask — the
                benchmark agricultural compound of the National Scenic Area.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  `${featured.squareFeet.toLocaleString()} sq ft residence`,
                  `${featured.bedrooms} bd / ${featured.bathrooms} ba`,
                  "Water rights",
                  "Mt. Hood views",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-sm border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <a
                href="#/listings"
                className="mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
              >
                View the listings showcase
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
