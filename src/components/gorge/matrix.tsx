"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Columns3,
  Download,
  Droplets,
  ExternalLink,
  Flame,
  Recycle,
  ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { downloadCsv, timestampSuffix, toCsv, type CsvCell } from "@/lib/csv";
import { useToast } from "@/hooks/use-toast";
import {
  fmtAcres,
  fmtCurrency,
  fmtPct,
  type Submarket,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";
import {
  CagrBadge,
  DepletionBadge,
  FrameworkBadge,
  KeyStatRow,
  MicroLabel,
  SectionHeader,
  StateBadge,
} from "./shared";

type SortCol = "net" | "baseline" | "cagr" | "forecast" | "footprint" | "dom";
type SortDir = "asc" | "desc";

/** Toggleable data columns (Market + row chevron always stay). */
type ColumnKey =
  | "jurisdiction"
  | "footprint"
  | "net"
  | "baseline"
  | "dom"
  | "cagr"
  | "forecast"
  | "sqft"
  | "depletion";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  jurisdiction: "Jurisdiction & framework",
  footprint: "UGB/UGA footprint",
  net: "Net buildable",
  baseline: "2026 baseline",
  dom: "Days on market",
  cagr: "20-yr CAGR",
  forecast: "2046 forecast",
  sqft: "$ / sqft",
  depletion: "Depletion",
};

const ALL_COLUMNS = Object.keys(COLUMN_LABELS) as ColumnKey[];

const SORTABLE: { col: SortCol; label: string; className?: string }[] = [
  { col: "footprint", label: "UGB/UGA Footprint" },
  { col: "net", label: "Net Buildable" },
  { col: "baseline", label: "2026 Baseline" },
  { col: "dom", label: "Days on Mkt" },
  { col: "cagr", label: "20-yr CAGR" },
  { col: "forecast", label: "2046 Forecast" },
];

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  jurisdiction: true,
  footprint: true,
  net: true,
  baseline: true,
  dom: true,
  cagr: true,
  forecast: true,
  sqft: true,
  depletion: true,
};

export function MatrixView({
  submarkets,
  navigate,
}: {
  submarkets: Submarket[];
  navigate: NavigateFn;
}) {
  const [stateFilter, setStateFilter] = useState<"all" | "OR" | "WA">("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<
    "all" | "Incorporated City" | "Unincorporated Urban Area"
  >("all");
  const [sortCol, setSortCol] = useState<SortCol>("net");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] =
    useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE);

  const visibleCount = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleCols[c]).length,
    [visibleCols]
  );
  const toggleCol = (col: ColumnKey) =>
    setVisibleCols((v) => ({ ...v, [col]: !v[col] }));

  const rows = useMemo(() => {
    const mid = (s: Submarket) =>
      (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
    const forecastMid = (s: Submarket) =>
      (s.projectedPrice2046Min + s.projectedPrice2046Max) / 2;

    const value = (s: Submarket): number => {
      switch (sortCol) {
        case "net":
          return mid(s);
        case "baseline":
          return s.baselinePrice2026;
        case "cagr":
          return s.projectedCagr;
        case "forecast":
          return forecastMid(s);
        case "footprint":
          return s.totalFootprintAcres;
        case "dom":
          return (s.daysOnMarketMin + s.daysOnMarketMax) / 2;
      }
    };

    return submarkets
      .filter(
        (s) =>
          (stateFilter === "all" || s.state === stateFilter) &&
          (jurisdictionFilter === "all" || s.jurisdictionType === jurisdictionFilter)
      )
      .sort((a, b) =>
        sortDir === "asc" ? value(a) - value(b) : value(b) - value(a)
      );
  }, [submarkets, stateFilter, jurisdictionFilter, sortCol, sortDir]);

  const filteredNet = rows.reduce(
    (a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2,
    0
  );
  const filteredCagr =
    rows.length > 0
      ? rows.reduce((a, s) => a + s.projectedCagr, 0) / rows.length
      : 0;

  const detail = submarkets.find((s) => s.slug === detailSlug) ?? null;

  const { toast } = useToast();

  const exportCsv = () => {
    const headers = [
      "Market",
      "State",
      "County",
      "Jurisdiction Type",
      "Regulatory Framework",
      "UGB/UGA Footprint (ac)",
      "Gross Vacant (ac)",
      "Net Buildable Min (ac)",
      "Net Buildable Max (ac)",
      "Net Buildable Mid (ac)",
      "2026 Baseline Median ($)",
      "Price/SqFt Min ($)",
      "Price/SqFt Max ($)",
      "Days on Market Min",
      "Days on Market Max",
      "Projected 20-yr CAGR (%)",
      "2046 Forecast Min ($)",
      "2046 Forecast Max ($)",
      "Est. Raw-Land Depletion Year",
      "Water Purveyor",
      "Wastewater System",
      "Primary Constraints & WUI Risk",
    ];
    const data: CsvCell[][] = rows.map((s) => [
      s.name,
      s.state,
      s.county,
      s.jurisdictionType,
      s.regulatoryFramework,
      s.totalFootprintAcres,
      s.grossVacantAcres,
      s.netBuildableAcresMin,
      s.netBuildableAcresMax,
      Math.round(((s.netBuildableAcresMin + s.netBuildableAcresMax) / 2) * 10) / 10,
      s.baselinePrice2026,
      Math.round(s.pricePerSqftMin),
      Math.round(s.pricePerSqftMax),
      s.daysOnMarketMin,
      s.daysOnMarketMax,
      s.projectedCagr,
      s.projectedPrice2046Min,
      s.projectedPrice2046Max,
      s.depletionYear,
      s.waterPurveyor,
      s.wastewaterSystem,
      s.primaryConstraints,
    ]);
    downloadCsv(
      `crgnsa-master-matrix-${timestampSuffix()}.csv`,
      toCsv(headers, data)
    );
    toast({
      title: "Master Matrix exported",
      description: `${rows.length} jurisdiction${rows.length === 1 ? "" : "s"} · current filters and sort order applied.`,
    });
  };

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Master Real Estate & Land Inventory Matrix"
        title="All 11 jurisdictions, one sortable ledger"
        description="Filter by state and jurisdiction type, sort any column, and click a row for the infrastructure dossier — water purveyors, wastewater capacity, and fire-risk constraints that gate every buildable acre."
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Toggle column visibility"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3.5 text-[13px] font-medium shadow-sm transition-all hover:border-zinc-400 hover:shadow dark:hover:border-zinc-600 active:scale-[0.98]"
                >
                  <Columns3 className="h-3.5 w-3.5" aria-hidden />
                  Columns
                  <span className="rounded-sm bg-muted px-1.5 text-[11px] font-semibold tabular-nums">
                    {visibleCount}/{ALL_COLUMNS.length}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[12px] uppercase tracking-wider">
                  Visible columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col}
                    checked={visibleCols[col]}
                    onCheckedChange={() => toggleCol(col)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-[13px]"
                  >
                    {COLUMN_LABELS[col]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-4 text-[13px] font-medium shadow-sm transition-all hover:border-zinc-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-zinc-600 active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export CSV
            </button>
          </div>
        }
      />

      {/* Filter + summary bar */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <MicroLabel className="hidden sm:block">State</MicroLabel>
          <ToggleGroup
            type="single"
            value={stateFilter}
            onValueChange={(v) => {
              if (v) setStateFilter(v as "all" | "OR" | "WA");
            }}
            className="gap-1"
          >
            <ToggleGroupItem value="all" className="h-8 px-3 text-[13px]">All</ToggleGroupItem>
            <ToggleGroupItem value="OR" className="h-8 px-3 text-[13px]">Oregon</ToggleGroupItem>
            <ToggleGroupItem value="WA" className="h-8 px-3 text-[13px]">Washington</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-3">
          <MicroLabel className="hidden sm:block">Jurisdiction</MicroLabel>
          <ToggleGroup
            type="single"
            value={jurisdictionFilter}
            onValueChange={(v) => {
              if (v)
                setJurisdictionFilter(
                  v as "all" | "Incorporated City" | "Unincorporated Urban Area"
                );
            }}
            className="gap-1"
          >
            <ToggleGroupItem value="all" className="h-8 px-3 text-[13px]">All</ToggleGroupItem>
            <ToggleGroupItem value="Incorporated City" className="h-8 px-3 text-[13px]">Cities</ToggleGroupItem>
            <ToggleGroupItem value="Unincorporated Urban Area" className="h-8 px-3 text-[13px]">
              Unincorp. UGAs
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="ml-auto flex items-center gap-6 text-[13px] tabular-nums">
          <span className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{rows.length}</span> of{" "}
            {submarkets.length}
          </span>
          <span className="hidden text-muted-foreground sm:block">
            Reserve: <span className="font-semibold text-foreground">{fmtAcres(Math.round(filteredNet))}</span>
          </span>
          <span className="hidden text-muted-foreground md:block">
            Avg CAGR: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtPct(filteredCagr)}</span>
          </span>
        </div>
      </div>

      {/* Matrix table — min-width tracks visible columns so hiding
          columns actually tightens the layout instead of leaving
          a fixed-width scroll region. */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table
          className="min-w-[640px]"
          style={{ minWidth: 320 + visibleCount * 95 }}
        >
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[210px]">Market</TableHead>
              {visibleCols.jurisdiction ? (
                <TableHead>Jurisdiction &amp; Framework</TableHead>
              ) : null}
              {SORTABLE.map((c) => {
                const colKey: ColumnKey | null =
                  c.col === "net"
                    ? "net"
                    : c.col === "baseline"
                      ? "baseline"
                      : c.col === "dom"
                        ? "dom"
                        : c.col === "cagr"
                          ? "cagr"
                          : c.col === "forecast"
                            ? "forecast"
                            : "footprint";
                if (!visibleCols[colKey]) return null;
                return (
                  <TableHead key={c.col} className="text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort(c.col)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
                        sortCol === c.col
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "hover:text-foreground"
                      )}
                      aria-label={`Sort by ${c.label}`}
                    >
                      {c.label}
                      {sortCol === c.col ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  </TableHead>
                );
              })}
              {visibleCols.sqft ? (
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.1em]">
                  $ / SqFt
                </TableHead>
              ) : null}
              {visibleCols.depletion ? (
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.1em]">
                  Depletion
                </TableHead>
              ) : null}
              <TableHead className="w-10" aria-label="Row actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const netMid = (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
              const isActive = detailSlug === s.slug;
              return (
                <TableRow
                  key={s.slug}
                  onClick={() => setDetailSlug(s.slug)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/40",
                    isActive && "bg-emerald-500/[0.06]"
                  )}
                  aria-label={`Open infrastructure dossier for ${s.name}, ${s.state}`}
                >
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">{s.name}</span>
                      <StateBadge state={s.state} />
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{s.county}</p>
                  </TableCell>
                  {visibleCols.jurisdiction ? (
                    <TableCell className="py-3.5">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="text-[13px]">{s.jurisdictionType}</span>
                        <FrameworkBadge framework={s.regulatoryFramework} />
                      </div>
                    </TableCell>
                  ) : null}
                  {visibleCols.footprint ? (
                    <TableCell className="py-3.5 text-right text-[13px] tabular-nums">
                      {fmtAcres(s.totalFootprintAcres)}
                    </TableCell>
                  ) : null}
                  {visibleCols.net ? (
                    <TableCell className="py-3.5 text-right text-[13px] font-medium tabular-nums">
                      <span className="block text-[13px] text-muted-foreground">
                        {fmtAcres(s.grossVacantAcres)} gross
                      </span>
                      {fmtAcres(s.netBuildableAcresMin)}–{fmtAcres(s.netBuildableAcresMax)}
                      <span className="block text-[11px] text-muted-foreground">
                        mid {fmtAcres(netMid)}
                      </span>
                    </TableCell>
                  ) : null}
                  {visibleCols.baseline ? (
                    <TableCell className="py-3.5 text-right text-[13px] font-semibold tabular-nums">
                      {fmtCurrency(s.baselinePrice2026, { compact: true })}
                    </TableCell>
                  ) : null}
                  {visibleCols.dom ? (
                    <TableCell className="py-3.5 text-right text-[13px] tabular-nums">
                      {s.daysOnMarketMin}–{s.daysOnMarketMax}
                    </TableCell>
                  ) : null}
                  {visibleCols.cagr ? (
                    <TableCell className="py-3.5 text-right">
                      <CagrBadge cagr={s.projectedCagr} showTier={false} />
                    </TableCell>
                  ) : null}
                  {visibleCols.forecast ? (
                    <TableCell className="py-3.5 text-right text-[13px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {fmtCurrency(s.projectedPrice2046Min, { compact: true })}
                      <span className="text-muted-foreground"> – </span>
                      {fmtCurrency(s.projectedPrice2046Max, { compact: true })}
                    </TableCell>
                  ) : null}
                  {visibleCols.sqft ? (
                    <TableCell className="py-3.5 text-right text-[13px] tabular-nums text-muted-foreground">
                      ${Math.round(s.pricePerSqftMin)}–${Math.round(s.pricePerSqftMax)}
                    </TableCell>
                  ) : null}
                  {visibleCols.depletion ? (
                    <TableCell className="py-3.5 text-right">
                      <DepletionBadge year={s.depletionYear} />
                    </TableCell>
                  ) : null}
                  <TableCell className="py-3.5 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2 + visibleCount}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No jurisdictions match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {/* Infrastructure dossier drawer */}
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
                  <StateBadge state={detail.state} />
                </SheetTitle>
                <p className="text-[13px] text-muted-foreground">
                  {detail.county} · {detail.jurisdictionType}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <FrameworkBadge framework={detail.regulatoryFramework} />
                  <CagrBadge cagr={detail.projectedCagr} />
                  <DepletionBadge year={detail.depletionYear} />
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-6 px-4 pb-8">
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  {detail.summaryNarrative}
                </p>

                {/* Price band visual */}
                <div className="rounded-lg border bg-background p-4">
                  <MicroLabel>Valuation Band · 2026 → 2046</MicroLabel>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-[12px] tabular-nums">
                        <span className="text-muted-foreground">2026 baseline</span>
                        <span className="font-semibold">{fmtCurrency(detail.baselinePrice2026, { compact: true })}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500"
                          style={{
                            width: `${(detail.baselinePrice2026 / 2250000) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[12px] tabular-nums">
                        <span className="text-muted-foreground">2046 projected band</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {fmtCurrency(detail.projectedPrice2046Min, { compact: true })}–
                          {fmtCurrency(detail.projectedPrice2046Max, { compact: true })}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            marginLeft: `${(detail.projectedPrice2046Min / 2250000) * 100}%`,
                            width: `${((detail.projectedPrice2046Max - detail.projectedPrice2046Min) / 2250000) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key stats */}
                <div>
                  <MicroLabel>Inventory Metrics</MicroLabel>
                  <div className="mt-2 rounded-lg border bg-background px-4 py-1">
                    <KeyStatRow
                      label="UGB/UGA footprint"
                      value={fmtAcres(detail.totalFootprintAcres)}
                    />
                    <KeyStatRow
                      label="Gross vacant acres"
                      value={fmtAcres(detail.grossVacantAcres)}
                    />
                    <KeyStatRow
                      label="Net buildable band"
                      value={`${fmtAcres(detail.netBuildableAcresMin)} – ${fmtAcres(detail.netBuildableAcresMax)}`}
                    />
                    <KeyStatRow
                      label="2026 baseline median"
                      value={fmtCurrency(detail.baselinePrice2026)}
                    />
                    <KeyStatRow
                      label="Price per sqft"
                      value={`$${Math.round(detail.pricePerSqftMin)} – $${Math.round(detail.pricePerSqftMax)}`}
                    />
                    <KeyStatRow
                      label="Days on market"
                      value={`${detail.daysOnMarketMin} – ${detail.daysOnMarketMax}`}
                    />
                  </div>
                </div>

                {/* Infrastructure limits */}
                <div>
                  <MicroLabel>Infrastructure Limits</MicroLabel>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border bg-background p-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Droplets className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Water purveyor
                        </p>
                        <p className="mt-0.5 text-[13px] leading-relaxed">
                          {detail.waterPurveyor}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border bg-background p-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Recycle className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Wastewater system
                        </p>
                        <p className="mt-0.5 text-[13px] leading-relaxed">
                          {detail.wastewaterSystem}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Flame className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Primary constraints &amp; WUI fire risk
                        </p>
                        <p className="mt-0.5 text-[13px] leading-relaxed">
                          {detail.primaryConstraints}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDetailSlug(null);
                    navigate({ view: "submarket", slug: detail.slug });
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Open micro-market profile
                </button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Source note */}
      <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Net buildable acreage nets gross vacant land down for slopes, critical
        habitat, wetlands, and right-of-way. Infrastructure capacity and WUI
        fire-risk classes are as compiled in the corridor inventory report.
      </p>
    </div>
  );
}
