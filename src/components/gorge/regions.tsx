"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Database,
  Download,
  Flag,
  FlaskConical,
  Globe2,
  Landmark,
  Layers,
  MapPin,
  Scale,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  downloadCsv,
  timestampSuffix,
  toCsv,
  type CsvCell,
} from "@/lib/csv";
import {
  fmtAcres,
  fmtCurrency,
  fmtPct,
  REGION_STATUS_STYLES,
  REGION_WAVES,
  type Region,
  type RegionStatus,
  type RegionWave,
} from "@/lib/gorge";
import { MicroLabel, SectionHeader, StatCard } from "./shared";
import type { NavigateFn } from "./gorge-app";

/* ------------------------------------------------------------------ */
/* Expansion Registry — the region-registry workspace (round 13).      */
/*                                                                     */
/* The first EXPANSION-PLAN.md deliverable: one live region (the       */
/* corridor), seven PNW scaffolds, six USA planned, four Canada        */
/* research rows — the platform's market expansion rendered as data,   */
/* never as a code fork. Each card opens a launch-dossier Sheet with   */
/* the region's statutory narrative and the 7-step launch runbook.     */
/* ------------------------------------------------------------------ */

/** The per-market launch runbook (EXPANSION-PLAN.md §7). */
const RUNBOOK_STEPS: { label: string; detail: string }[] = [
  {
    label: "Region registry row + schema migration",
    detail: "no code changes — the registry IS the migration",
  },
  {
    label: "Ledger research",
    detail: "submarkets, net-buildable bands, depletion-year estimates",
  },
  {
    label: "Seed migration",
    detail: "submarkets + curated listings + image pipeline",
  },
  {
    label: "Framework explorer content",
    detail: "the region's statutes, cited like the 1986 Act tabs",
  },
  {
    label: "Depletion + arbitrage calibration",
    detail: "absorption rates, tax bands, commuting pairs",
  },
  {
    label: "Audit gate",
    detail: "CI + ui-audit + security-audit green, LIVE browser QA",
  },
  {
    label: "Launch",
    detail: "path-scoped first; subdomain only at proven traction",
  },
];

function runbookProgress(status: RegionStatus): number {
  switch (status) {
    case "live":
      return RUNBOOK_STEPS.length; // all seven shipped
    case "scaffold":
      return 1; // the registry row itself is step one
    default:
      return 0; // wave hasn't started — the runbook begins at wave open
  }
}

function StatusBadge({ status }: { status: RegionStatus }) {
  const style = REGION_STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        style.className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          style.dot,
          status === "live" && "animate-pulse"
        )}
        aria-hidden
      />
      {style.label}
    </span>
  );
}

function CountryChip({ country }: { country: string }) {
  const isCanada = country === "Canada";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold tracking-widest",
        isCanada
          ? "border-violet-600/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
          : "border-teal-600/30 bg-teal-500/10 text-teal-700 dark:text-teal-400"
      )}
      title={isCanada ? "Canada — CAD + metric + bilingual QC route" : "United States"}
    >
      {isCanada ? "CAN" : "USA"}
    </span>
  );
}

export function RegionsView({
  regions,
  navigate,
}: {
  regions: Region[];
  navigate: NavigateFn;
}) {
  const { toast } = useToast();
  const [detailSlug, setDetailSlug] = useState<string | null>(null);

  const detail = useMemo(
    () => regions.find((r) => r.slug === detailSlug) ?? null,
    [regions, detailSlug]
  );

  const byWave = useMemo(() => {
    const map = new Map<RegionWave, Region[]>();
    for (const w of REGION_WAVES) map.set(w.id, []);
    for (const r of regions) map.get(r.wave)?.push(r);
    return map;
  }, [regions]);

  const liveCount = regions.filter((r) => r.status === "live").length;
  const scaffoldCount = regions.filter((r) => r.status === "scaffold").length;
  const plannedCount = regions.filter((r) => r.status === "planned").length;
  const researchCount = regions.filter((r) => r.status === "research").length;
  const liveRegion = regions.find((r) => r.status === "live") ?? null;
  const targetMarkets = regions.reduce((a, r) => a + r.targetSubmarkets, 0);

  const exportCsv = () => {
    const headers = [
      "Slug",
      "Region",
      "Wave",
      "Status",
      "Country",
      "States/Provinces",
      "Target Markets",
      "Launch Order",
      "Scarcity Hook",
    ];
    const rows: CsvCell[][] = regions.map((r) => [
      r.slug,
      r.name,
      REGION_WAVES.find((w) => w.id === r.wave)?.label ?? r.wave,
      REGION_STATUS_STYLES[r.status].label,
      r.country,
      r.statesProvinces,
      r.targetSubmarkets,
      r.launchOrder,
      r.scarcityHook,
    ]);
    downloadCsv(
      `crgnsa-expansion-registry-${timestampSuffix()}.csv`,
      toCsv(headers, rows)
    );
    toast({
      title: "Expansion registry exported",
      description: `${regions.length} regions × 9 fields → CSV.`,
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Expansion registry"
        title="One platform. N regulated markets."
        description="The corridor proved the methodology — statutory scarcity, depletion ledgers, compounding curves. The registry turns that into a rollout: every new market is a seed migration and a narrative, never a code fork."
        action={
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            aria-label="Export the expansion registry as CSV"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export registry
          </button>
        }
      />

      {/* KPI strip */}
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Globe2}
          label="Live regions"
          value={liveCount}
          sub={
            liveRegion
              ? `${liveRegion.aggregate?.marketCount ?? 0} markets · ${liveRegion.aggregate?.listingCount ?? 0} listings under the 1986 Act`
              : "—"
          }
          accent="emerald"
        />
        <StatCard
          icon={Layers}
          label="PNW wave · scaffolds"
          value={scaffoldCount}
          sub="months 0–6 · Goal 14 + GMA boundary markets"
          accent="amber"
        />
        <StatCard
          icon={Flag}
          label="USA + Canada pipeline"
          value={plannedCount + researchCount}
          sub={`${plannedCount} planned · ${researchCount} research — TRPA to the ALR`}
        />
        <StatCard
          icon={Database}
          label="Registry rows"
          value={regions.length}
          sub={`${targetMarkets} target micro-markets at buildout — each a seed migration, not a code change`}
        />
      </div>

      {/* The architecture decision callout */}
      <div className="mt-6 rounded-xl border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Landmark
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <MicroLabel>The architecture decision</MicroLabel>
            </div>
            <p className="mt-2.5 text-[15px] font-semibold leading-snug md:text-base">
              One codebase, one registry, one canonical site per market
              region — never a repo per city, never one national mega-page.
            </p>
            <div className="mt-3.5 grid gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground sm:grid-cols-3">
              <p className="flex items-start gap-2">
                <ShieldCheck
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <span>
                  <strong className="font-semibold text-foreground">
                    Shared platform
                  </strong>{" "}
                  — every fix compounds across all markets: hooks, audits,
                  and the analytics engine stay one.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <span>
                  <strong className="font-semibold text-foreground">
                    Path-scoped first
                  </strong>{" "}
                  — regions live at{" "}
                  <span className="whitespace-nowrap font-mono text-[11.5px]">
                    /regions/&lt;slug&gt;
                  </span>
                  ; a subdomain per market only at proven traction.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <FlaskConical
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <span>
                  <strong className="font-semibold text-foreground">
                    Gated launches
                  </strong>{" "}
                  — CI + UI/security audits + LIVE agent-browser QA gate
                  every market, the corridor standard.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wave lanes */}
      {REGION_WAVES.map((wave) => {
        const waveRegions = byWave.get(wave.id) ?? [];
        if (waveRegions.length === 0) return null;
        const statusChips: { status: RegionStatus; count: number }[] = (
          ["live", "scaffold", "planned", "research"] as RegionStatus[]
        )
          .map((status) => ({
            status,
            count: waveRegions.filter((r) => r.status === status).length,
          }))
          .filter((c) => c.count > 0);

        return (
          <section key={wave.id} className="mt-10" aria-label={wave.label}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border-b pb-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[17px] font-semibold tracking-tight">
                  {wave.label}
                </h3>
                <span className="rounded-sm border bg-muted/60 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {wave.window}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  {wave.description}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {statusChips.map((c) => (
                  <span
                    key={c.status}
                    className="text-[11px] font-semibold tabular-nums text-muted-foreground"
                  >
                    {c.count}{" "}
                    {REGION_STATUS_STYLES[c.status].label.toLowerCase()}
                    {c.count === 1 ? "" : "s"}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {waveRegions.map((region) =>
                region.status === "live" ? (
                  <LiveRegionCard
                    key={region.slug}
                    region={region}
                    navigate={navigate}
                  />
                ) : (
                  <RegionCard
                    key={region.slug}
                    region={region}
                    onOpen={() => setDetailSlug(region.slug)}
                  />
                )
              )}
            </div>
          </section>
        );
      })}

      <p className="mt-10 border-t pt-5 text-[11.5px] leading-relaxed text-muted-foreground">
        Registry rows for waves 1–3 are directional planning content, not
        listings — scarcity hooks and statutory narratives name the regime
        each future ledger will quantify. Full rollout plan, trade-offs,
        and the per-market launch runbook live in{" "}
        <span className="font-mono text-[11px]">docs/EXPANSION-PLAN.md</span>{" "}
        (mirrored in the methodology dialog).
      </p>

      {/* Region launch dossier */}
      <Sheet
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSlug(null);
        }}
      >
        <SheetContent
          className="thin-scroll w-full overflow-y-auto sm:max-w-md"
          aria-describedby={undefined}
        >
          {detail ? (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="flex flex-wrap items-center gap-2 text-xl">
                  {detail.name}
                  <StatusBadge status={detail.status} />
                </SheetTitle>
                <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                  <CountryChip country={detail.country} />
                  <span>{detail.statesProvinces}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>
                    {REGION_WAVES.find((w) => w.id === detail.wave)?.label}
                  </span>
                </p>
              </SheetHeader>

              <div className="mt-5 space-y-6 px-4 pb-8">
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-3.5">
                  <MicroLabel className="text-emerald-700 dark:text-emerald-300">
                    The scarcity story
                  </MicroLabel>
                  <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed">
                    {detail.scarcityHook}
                  </p>
                </div>

                <div>
                  <MicroLabel>Regulatory context</MicroLabel>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {detail.regulatoryContext}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Scale
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div>
                      <MicroLabel>Tax arbitrage hook</MicroLabel>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                        {detail.taxArbitrageNote}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <MicroLabel>Launch runbook</MicroLabel>
                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {runbookProgress(detail.status)}/{RUNBOOK_STEPS.length}{" "}
                      steps
                    </span>
                  </div>
                  <ol className="mt-2 space-y-1.5">
                    {RUNBOOK_STEPS.map((step, i) => {
                      const done = i < runbookProgress(detail.status);
                      return (
                        <li
                          key={step.label}
                          className={cn(
                            "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
                            done
                              ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                              : "bg-card"
                          )}
                        >
                          {done ? (
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                              aria-hidden
                            />
                          ) : (
                            <Circle
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                              aria-hidden
                            />
                          )}
                          <div>
                            <p
                              className={cn(
                                "text-[12.5px] font-medium leading-tight",
                                !done && "text-muted-foreground"
                              )}
                            >
                              {step.label}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
                              {step.detail}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {detail.status !== "live" ? (
                    <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                      {detail.status === "scaffold"
                        ? "Step one ships with this registry — the row you are reading IS the migration. Steps 2–7 run at wave open."
                        : "The runbook begins when the wave opens; research rows first face a data-feasibility review (MLS/board licensing, bilingual routing for QC)."}
                    </p>
                  ) : null}
                </div>

                {detail.status === "live" && detail.aggregate ? (
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-3.5">
                    <MicroLabel className="text-emerald-700 dark:text-emerald-300">
                      Live ledger
                    </MicroLabel>
                    <div className="mt-2 grid grid-cols-2 gap-2.5 text-center">
                      {[
                        {
                          label: "Markets",
                          value: String(detail.aggregate.marketCount),
                        },
                        {
                          label: "Listings",
                          value: String(detail.aggregate.listingCount),
                        },
                        {
                          label: "Net buildable",
                          value: fmtAcres(detail.aggregate.netBuildableMid),
                        },
                        {
                          label: "Avg CAGR",
                          value: fmtPct(detail.aggregate.averageCagr),
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-md border bg-background p-2.5"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {s.label}
                          </p>
                          <p className="mt-0.5 text-[14px] font-semibold tabular-nums">
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      Median 2026 baseline{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {fmtCurrency(detail.aggregate.medianBaseline)}
                      </span>{" "}
                      · every market with depletion-year, water, and
                      wastewater detail in the Master Matrix.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailSlug(null);
                        navigate({ view: "matrix" });
                      }}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] dark:bg-emerald-500 dark:text-zinc-950"
                    >
                      Open the corridor ledger
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-card p-3.5 text-center">
                    <p className="text-[12.5px] font-medium">
                      {detail.targetSubmarkets} target micro-markets
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Awaiting ledger research — the buildout that fills this
                      region is a seed migration, not a code change.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Region cards                                                        */
/* ------------------------------------------------------------------ */

function RegionCard({
  region,
  onOpen,
}: {
  region: Region;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Open the ${region.name} launch dossier`}
      className="group flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
    >
      <div className="flex items-start justify-between gap-2.5">
        <h4 className="text-[14.5px] font-semibold leading-snug tracking-tight">
          {region.name}
        </h4>
        <StatusBadge status={region.status} />
      </div>
      <p className="mt-1.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <CountryChip country={region.country} />
        <span>{region.statesProvinces}</span>
      </p>
      <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {region.scarcityHook}
      </p>
      <p className="mt-2.5 flex items-start gap-1.5 border-t pt-2.5 text-[11.5px] leading-relaxed text-muted-foreground/90">
        <Scale className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        <span className="line-clamp-2">{region.taxArbitrageNote}</span>
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-semibold tabular-nums">
          {region.targetSubmarkets} target markets
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground/80 transition-colors group-hover:text-foreground">
          Dossier
          <ArrowRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </button>
  );
}

function LiveRegionCard({
  region,
  navigate,
}: {
  region: Region;
  navigate: NavigateFn;
}) {
  const agg = region.aggregate;
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/35 bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-3">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500/0"
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[16px] font-semibold tracking-tight">
              {region.name}
            </h4>
            <StatusBadge status={region.status} />
            <CountryChip country={region.country} />
            <span className="text-[11.5px] text-muted-foreground">
              {region.statesProvinces}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-muted-foreground">
            {region.scarcityHook}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ view: "matrix" })}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] dark:bg-emerald-500 dark:text-zinc-950"
        >
          Open the corridor ledger
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {agg ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Markets", value: String(agg.marketCount) },
            { label: "Listings", value: String(agg.listingCount) },
            {
              label: "Net buildable",
              value: fmtAcres(agg.netBuildableMid),
            },
            { label: "Avg CAGR", value: fmtPct(agg.averageCagr) },
            {
              label: "Median baseline",
              value: fmtCurrency(agg.medianBaseline, { compact: true }),
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border bg-background p-2.5 text-center"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
