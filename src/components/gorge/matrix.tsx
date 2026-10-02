"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Columns3,
  Download,
  Droplets,
  ExternalLink,
  Flame,
  GitCompareArrows,
  Link2,
  Pin,
  PinOff,
  Recycle,
  ShieldAlert,
  TrendingUp,
  X,
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
  cagrTier,
  fmtAcres,
  fmtCurrency,
  fmtPct,
  type CagrTier,
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

/** Row-pinning cap — three jurisdictions above the fold. */
const MAX_PINS = 3;

/** Quick-compare cap (round 10) — same three-slot budget as pins and
 *  what-ifs, so every comparison surface on the platform reads the same. */
const MAX_COMPARE = 3;
/** Per-column bar tints — mirrors the projections curve palette so a
 *  market keeps its visual identity across workspaces. */
const COMPARE_COLORS = ["#0d9488", "#f59e0b", "#64748b"];

/** Quick-compare metric definitions (round 11: hoisted to module scope so
 *  the panel bars and the CSV export share ONE source of truth — they
 *  can never drift). `winner` tags the per-metric leader only where the
 *  investor direction is unambiguous (never on baseline/net buildable). */
const QUICK_METRICS: {
  label: string;
  csvLabel: string;
  value: (s: Submarket) => string;
  raw: (s: Submarket) => number;
  winner: "max" | "min" | null;
  tag?: string;
  title?: string;
}[] = [
  {
    label: "Baseline",
    csvLabel: "2026 baseline",
    value: (s) => fmtCurrency(s.baselinePrice2026, { compact: true }),
    raw: (s) => s.baselinePrice2026,
    winner: null,
  },
  {
    label: "20-yr CAGR",
    csvLabel: "20-yr CAGR (%)",
    value: (s) => fmtPct(s.projectedCagr),
    raw: (s) => s.projectedCagr,
    winner: "max",
    tag: "leads",
    title: "Highest projected appreciation in the selection",
  },
  {
    label: "Net buildable",
    csvLabel: "Net buildable (ac, mid)",
    value: (s) =>
      fmtAcres(Math.round((s.netBuildableAcresMin + s.netBuildableAcresMax) / 2)),
    raw: (s) => (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2,
    winner: null,
  },
  {
    label: "2046 f'cast",
    csvLabel: "2046 forecast ($, band mid)",
    value: (s) =>
      fmtCurrency(
        Math.round((s.projectedPrice2046Min + s.projectedPrice2046Max) / 2),
        { compact: true }
      ),
    raw: (s) => (s.projectedPrice2046Min + s.projectedPrice2046Max) / 2,
    winner: "max",
    tag: "leads",
    title: "Highest 2046 projected value (band midpoint)",
  },
  {
    label: "Runway",
    csvLabel: "Raw-land runway (yrs · depletion year)",
    value: (s) => `${s.depletionYear - 2026} yrs · ${s.depletionYear}`,
    raw: (s) => s.depletionYear - 2026,
    winner: "max",
    tag: "longest",
    title: "Latest raw-land depletion in the selection",
  },
];

/** Session-scoped pin persistence — survives the "Model the pinned set →
 *  ← Back to master matrix" round trip (view unmounts mid-loop). MatrixView
 *  only mounts post-hydration (the hash router serves the overview server
 *  snapshot first), so reading sessionStorage in the initializer is safe. */
const PINS_KEY = "crgnsa-matrix-pins";

function readPins(): string[] {
  try {
    const raw = sessionStorage.getItem(PINS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((x): x is string => typeof x === "string")
          .slice(0, MAX_PINS)
      : [];
  } catch {
    return [];
  }
}

/** Text-only tier colors for the pinned-set CAGR figure — the same text
 *  pairs the CAGR_TIER_STYLES badges use, minus their bg/border chrome
 *  (the amber dossier strip supplies its own tint). */
const CAGR_VALUE_COLORS: Record<CagrTier, string> = {
  elite: "text-emerald-700 dark:text-emerald-300",
  strong: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-700 dark:text-amber-300",
  baseline: "text-zinc-600 dark:text-zinc-300",
};

export function MatrixView({
  submarkets,
  navigate,
  regionName = "corridor",
}: {
  submarkets: Submarket[];
  navigate: NavigateFn;
  /** Region display word ("corridor" | "region") — round 15. */
  regionName?: string;
}) {
  const [stateFilter, setStateFilter] = useState<"all" | "OR" | "WA">("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<
    "all" | "Incorporated City" | "Unincorporated Urban Area" | "Unincorporated Rural Area"
  >("all");
  const [sortCol, setSortCol] = useState<SortCol>("net");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] =
    useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE);
  const [pins, setPins] = useState<string[]>(readPins);

  /* ---------------- Quick-compare (round 10) ----------------
   * Up to three rows, FIFO eviction — the fourth pick silently replaces
   * the oldest so exploring never hits a modal toast. The floating panel
   * mounts with the first pick (a one-market bar readout is still useful
   * for scale) and grows to the full side-by-side at two and three. */
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug].slice(-MAX_COMPARE)
    );
  };

  const compareMarkets = useMemo(
    () =>
      compareSlugs
        .map((slug) => submarkets.find((s) => s.slug === slug))
        .filter((s): s is Submarket => Boolean(s)),
    [compareSlugs, submarkets]
  );

  /** Round 11 — quick-compare CSV. Reads the same QUICK_METRICS the
   *  bars render from, plus one identity row per market, so the file and
   *  the panel can never disagree. */
  const exportCompareCsv = () => {
    if (compareMarkets.length === 0) return;
    const headers = [
      "Metric",
      ...compareMarkets.map((m) => `${m.name} (${m.state})`),
    ];
    const rows: CsvCell[][] = [
      [
        "Jurisdiction",
        ...compareMarkets.map(
          (m) => `${m.county} · ${m.jurisdictionType}`
        ),
      ],
      ...QUICK_METRICS.map((metric) => [
        metric.csvLabel,
        ...compareMarkets.map((m) => metric.value(m)),
      ]),
    ];
    downloadCsv(
      `quick-compare-${timestampSuffix()}`,
      toCsv(headers, rows)
    );
    toast({
      title: "Quick compare exported",
      description: `${compareMarkets.length} market${
        compareMarkets.length === 1 ? "" : "s"
      } × ${QUICK_METRICS.length} metrics → CSV.`,
    });
  };

  // Mirror pins into sessionStorage so the "Model the pinned set → back"
  // round trip keeps the shortlist alive for the whole session.
  useEffect(() => {
    try {
      if (pins.length === 0) sessionStorage.removeItem(PINS_KEY);
      else sessionStorage.setItem(PINS_KEY, JSON.stringify(pins));
    } catch {
      /* storage unavailable — pins stay view-local */
    }
  }, [pins]);

  const togglePin = (slug: string) => {
    // Event-time logic only — never inside a state updater (that would
    // update the Toaster while MatrixView renders → React warning).
    if (pins.includes(slug)) {
      setPins((prev) => prev.filter((s) => s !== slug));
      return;
    }
    if (pins.length >= MAX_PINS) {
      toast({
        title: "Pin limit reached",
        description: `Up to ${MAX_PINS} jurisdictions can stay pinned — unpin one first.`,
      });
      return;
    }
    setPins((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
  };

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

  /** Pinned jurisdictions float above the fold, in pin order. */
  const orderedRows = useMemo(() => {
    const pinnedRows = pins
      .map((slug) => rows.find((r) => r.slug === slug))
      .filter((r): r is Submarket => Boolean(r));
    const rest = rows.filter((r) => !pins.includes(r.slug));
    return [...pinnedRows, ...rest];
  }, [rows, pins]);

  /** Pinned-set aggregate dossier — every figure for the amber strip in a
   *  single memo keyed on pins × submarkets. Null when nothing is pinned,
   *  so the strip mounts/unmounts with pin state. */
  const pinnedSet = useMemo(() => {
    const pinned = pins
      .map((slug) => submarkets.find((s) => s.slug === slug))
      .filter((s): s is Submarket => Boolean(s));
    if (pinned.length === 0) return null;
    const mid = (s: Submarket) =>
      (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
    const corridorReserve = submarkets.reduce((a, s) => a + mid(s), 0);
    const combinedReserve = pinned.reduce((a, s) => a + mid(s), 0);
    const avgCagr =
      pinned.reduce((a, s) => a + s.projectedCagr, 0) / pinned.length;
    // Strict < keeps the first-pinned market on depletion-year ties.
    const earliest = pinned.reduce((a, s) =>
      s.depletionYear < a.depletionYear ? s : a
    );
    return {
      names: pinned.map((s) => s.name).join(" · "),
      combinedReserve,
      corridorShare:
        corridorReserve > 0 ? (combinedReserve / corridorReserve) * 100 : 0,
      avgCagr,
      cagrMin: Math.min(...pinned.map((s) => s.projectedCagr)),
      cagrMax: Math.max(...pinned.map((s) => s.projectedCagr)),
      blendedMultiple: Math.pow(1 + avgCagr / 100, 20),
      earliestYear: earliest.depletionYear,
      earliestName: earliest.name,
      runway: earliest.depletionYear - 2026,
      critical: earliest.depletionYear <= 2032,
    };
  }, [pins, submarkets]);

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
    const data: CsvCell[][] = orderedRows.map((s) => [
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

  /** Copy — don't navigate — a share link that opens Projections with the
   *  pinned set preloaded. It reuses the exact m=…&s=1 serialization the
   *  modeling chip navigates with (the params Projections restores on
   *  mount), so a pasted link rebuilds precisely what the pinner sees.
   *  The drill-from breadcrumb stays unstamped: a shared recipient gets a
   *  clean Projections session, not a "← back to matrix" chip. */
  const sharePinnedSet = async () => {
    if (!pinnedSet) return; // only reachable from inside the strip
    const url = `${window.location.origin}${window.location.pathname}#/projections?m=${pins.join(",")}&s=1`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error("clipboard unavailable");
      }
      toast({
        title: "Share link copied",
        description: `Anyone opening it lands in Projections with ${pins.length} pinned market${pins.length === 1 ? "" : "s"} preloaded — ${pinnedSet.names}.`,
      });
    } catch {
      // Headless/embedded contexts block clipboard writes — surface the
      // URL itself so it can still be transcribed or select-copied by hand.
      toast({
        title: "Couldn't reach the clipboard",
        description: `Copy it manually: ${url}`,
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Master Real Estate & Land Inventory Matrix"
        title={`All ${submarkets.length} jurisdictions, one sortable ledger`}
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
                  v as
                    | "all"
                    | "Incorporated City"
                    | "Unincorporated Urban Area"
                    | "Unincorporated Rural Area"
                );
            }}
            className="gap-1"
          >
            <ToggleGroupItem value="all" className="h-8 px-3 text-[13px]">All</ToggleGroupItem>
            <ToggleGroupItem value="Incorporated City" className="h-8 px-3 text-[13px]">Cities</ToggleGroupItem>
            <ToggleGroupItem value="Unincorporated Urban Area" className="h-8 px-3 text-[13px]">
              Unincorp. UGAs
            </ToggleGroupItem>
            <ToggleGroupItem value="Unincorporated Rural Area" className="h-8 px-3 text-[13px]">
              Rural
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="ml-auto flex items-center gap-6 text-[13px] tabular-nums">
          {pins.length > 0 ? (
            <button
              type="button"
              onClick={() => setPins([])}
              title="Unpin all jurisdictions"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-400/60 bg-amber-400/10 px-2.5 text-[12px] font-medium text-amber-700 transition-all hover:bg-amber-400/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-amber-300"
            >
              <Pin className="h-3 w-3" fill="currentColor" aria-hidden />
              {pins.length}/{MAX_PINS} pinned
              <PinOff className="ml-1 h-3 w-3" aria-hidden />
            </button>
          ) : null}
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

      {/* Pinned-set aggregate dossier — mounts only while ≥1 pin exists
          and unmounts with the last one; all figures derive from the
          pinnedSet memo above. */}
      {pinnedSet ? (
        <section
          role="region"
          aria-label="Pinned set aggregate"
          className="mb-5 rounded-xl border border-amber-400/50 bg-amber-400/[0.06] p-3.5 shadow-sm sm:p-4"
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5">
            {/* Left block — pinned markets in pin order */}
            <div className="min-w-0 flex-auto">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <Pin
                  className="h-3 w-3"
                  fill="currentColor"
                  aria-hidden
                />
                Pinned set
              </p>
              <p className="mt-1 min-w-0 flex-wrap text-[13px] font-semibold leading-snug">
                {pinnedSet.names}
              </p>
            </div>

            {/* Right block — compact aggregate tiles; wrap into a 2×2
                grid on narrow viewports via flex-wrap + min-w. */}
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <div className="min-w-[130px]">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Combined reserve
                </p>
                <p className="mt-0.5 text-[15px] font-semibold leading-tight tabular-nums">
                  {fmtAcres(Math.round(pinnedSet.combinedReserve))}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground tabular-nums">
                  {fmtPct(pinnedSet.corridorShare)} of {regionName} reserve
                </p>
              </div>

              <div className="min-w-[130px] border-l border-amber-400/30 pl-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg 20-yr CAGR
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[15px] font-semibold leading-tight tabular-nums",
                    CAGR_VALUE_COLORS[cagrTier(pinnedSet.avgCagr)]
                  )}
                >
                  {fmtPct(pinnedSet.avgCagr)}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground tabular-nums">
                  band {pinnedSet.cagrMin.toFixed(1)}–{pinnedSet.cagrMax.toFixed(1)}%
                </p>
              </div>

              <div className="min-w-[130px] border-l border-amber-400/30 pl-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Blended 20-yr multiple
                </p>
                <p className="mt-0.5 text-[15px] font-semibold leading-tight tabular-nums">
                  {pinnedSet.blendedMultiple.toFixed(2)}×
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  compounded 2026–2046
                </p>
              </div>

              <div className="min-w-[130px] border-l border-amber-400/30 pl-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Earliest depletion
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[15px] font-semibold leading-tight tabular-nums",
                    pinnedSet.critical && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {pinnedSet.earliestYear}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground tabular-nums">
                  {pinnedSet.earliestName} · {pinnedSet.runway} yrs of runway
                </p>
              </div>
            </div>

            {/* Cross-workspace actions — grouped so the modeling chip and
                its copy-link twin wrap as one unit on narrow viewports
                (≤3 pins, well under the Projections selection cap of 5). */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // Breadcrumb flag — lets Projections offer "← back to matrix".
                  try {
                    sessionStorage.setItem("crgnsa-drill-from", "matrix");
                  } catch {
                    /* storage unavailable — no back-link */
                  }
                  navigate({
                    view: "projections",
                    query: `m=${pins.join(",")}&s=1`,
                  });
                }}
                title="Open the Projections workspace with the pinned set preloaded"
                className="group/model inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-amber-400/60 bg-amber-400/10 px-2.5 text-[12px] font-medium text-amber-700 transition-all hover:bg-amber-400/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-amber-300"
              >
                Model the pinned set
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 transition-transform group-hover/model:translate-x-0.5"
                  aria-hidden
                />
              </button>
              {/* Copy-link twin of the modeling chip — shares the pinned
                  analysis instead of navigating to it (see sharePinnedSet
                  for why the drill-from flag stays unstamped here). */}
              <button
                type="button"
                onClick={sharePinnedSet}
                aria-label="Copy a share link for the pinned set"
                title="Copy a share link — opens Projections with this pinned set preloaded"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-400/60 bg-amber-400/10 text-amber-700 transition-all hover:bg-amber-400/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-amber-300"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      ) : null}

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
            {orderedRows.map((s) => {
              const netMid = (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
              const isActive = detailSlug === s.slug;
              const pinned = pins.includes(s.slug);
              const pinRank = pins.indexOf(s.slug) + 1;
              const comparing = compareSlugs.includes(s.slug);
              const compareRank = compareSlugs.indexOf(s.slug) + 1;
              return (
                <TableRow
                  key={s.slug}
                  onClick={() => setDetailSlug(s.slug)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/40",
                    isActive && "bg-emerald-500/[0.06]",
                    pinned &&
                      "border-l-[3px] border-l-amber-400/80 bg-amber-500/[0.05]"
                  )}
                  aria-label={`Open infrastructure dossier for ${s.name}, ${s.state}`}
                >
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2">
                      {pinned ? (
                        <span
                          className="inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] bg-amber-400/25 px-1 text-[9.5px] font-bold tabular-nums text-amber-700 dark:text-amber-300"
                          title={`Pinned #${pinRank}`}
                        >
                          {pinRank}
                        </span>
                      ) : null}
                      <span className="text-[14px] font-semibold">{s.name}</span>
                      <StateBadge state={s.state} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(s.slug);
                        }}
                        aria-pressed={comparing}
                        aria-label={
                          comparing
                            ? `Remove ${s.name} from quick compare`
                            : `Add ${s.name} to quick compare`
                        }
                        title={
                          comparing
                            ? `Compared #${compareRank} — click to remove`
                            : "Add to the quick-compare panel"
                        }
                        className={cn(
                          "ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                          comparing
                            ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                            : "text-muted-foreground/50 hover:bg-muted hover:text-emerald-600 dark:hover:text-emerald-400"
                        )}
                      >
                        <GitCompareArrows
                          className="h-3.5 w-3.5"
                          fill={comparing ? "currentColor" : "none"}
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(s.slug);
                        }}
                        aria-pressed={pinned}
                        aria-label={pinned ? `Unpin ${s.name}` : `Pin ${s.name} to the top of the matrix`}
                        title={
                          pinned
                            ? `Pinned #${pinRank} — click to unpin`
                            : pins.length >= MAX_PINS
                              ? "Pin limit reached (3)"
                              : "Pin to the top of the matrix"
                        }
                        className={cn(
                          "ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                          pinned
                            ? "bg-amber-400/20 text-amber-600 hover:bg-amber-400/30 dark:text-amber-400"
                            : "text-muted-foreground/50 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400"
                        )}
                      >
                        <Pin
                          className="h-3.5 w-3.5"
                          fill={pinned ? "currentColor" : "none"}
                          aria-hidden
                        />
                      </button>
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

      {/* Keep the last table rows scrollable past the floating panel. */}
      {compareMarkets.length > 0 ? (
        <div className="h-56" aria-hidden />
      ) : null}

      {/* ---------------- Quick-compare floating panel (round 10) ----------
       * Side-by-side relative positioning for up to three rows — bars are
       * normalized to the selection's max (depletion: runway share), with
       * per-metric leader tags where the investor direction is unambiguous.
       * Centered via a flex wrapper so framer-motion's transform animation
       * never fights a Tailwind -translate-x centering utility. */}
      <AnimatePresence>
        {compareMarkets.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
          >
            <aside
              role="region"
              aria-label="Quick compare"
              className="pointer-events-auto w-full max-w-3xl rounded-2xl border bg-popover/95 p-4 shadow-xl backdrop-blur-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Quick compare
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium tabular-nums">
                    {compareMarkets.length} of {MAX_COMPARE}
                  </span>
                  {compareMarkets.length === 1 ? (
                    <span className="font-normal normal-case tracking-normal">
                      — add a second market for the side-by-side
                    </span>
                  ) : null}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={exportCompareCsv}
                    aria-label="Export the quick compare as CSV"
                    title="Export the compared markets and metrics as CSV"
                    className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-all hover:border-zinc-300 hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:hover:border-zinc-600"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {compareMarkets.length >= 2 ? (
                    <button
                      type="button"
                      onClick={() => {
                        // Same breadcrumb contract as the pinned-set CTA,
                        // tagged "compare" so the target's preset notice can
                        // name the quick-compare panel as the origin.
                        try {
                          sessionStorage.setItem("crgnsa-drill-from", "matrix-compare");
                        } catch {
                          /* storage unavailable — no back-link */
                        }
                        navigate({
                          view: "projections",
                          query: `m=${compareSlugs.join(",")}&s=1`,
                        });
                      }}
                      title="Open the Projections workspace with this compared set preloaded"
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2.5 text-[12px] font-medium text-emerald-700 transition-all hover:bg-emerald-500/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-emerald-300"
                    >
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                      Model this set
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setCompareSlugs([])}
                    aria-label="Clear quick compare"
                    title="Clear the comparison"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>

              <div
                className="mt-3 grid gap-x-3 gap-y-2.5"
                style={{
                  gridTemplateColumns: `72px repeat(${compareMarkets.length}, minmax(0, 1fr))`,
                }}
              >
                {/* Column headers — market identity + remove */}
                <div aria-hidden />
                {compareMarkets.map((m, i) => (
                  <div key={m.slug} className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="truncate">{m.name}</span>
                      <StateBadge state={m.state} />
                      <button
                        type="button"
                        onClick={() => toggleCompare(m.slug)}
                        aria-label={`Remove ${m.name} from quick compare`}
                        title="Remove from comparison"
                        className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </p>
                  </div>
                ))}

                {/* Metric rows — bar width = value / max of the selection.
                    QUICK_METRICS (module scope) is the single source of
                    truth; the CSV export reads the same definitions. */}
                {(() => {
                  return QUICK_METRICS.map((metric) => {
                    const raws = compareMarkets.map(metric.raw);
                    const max = Math.max(...raws);
                    const min = Math.min(...raws);
                    const winnerIdx =
                      metric.winner === "max"
                        ? raws.indexOf(max)
                        : metric.winner === "min"
                          ? raws.indexOf(min)
                          : -1;
                    return (
                      <div key={metric.label} className="contents">
                        <p
                          className="self-center text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                          title={metric.title ?? metric.label}
                        >
                          {metric.label}
                        </p>
                        {compareMarkets.map((m, i) => {
                          const pct = max > 0 ? (metric.raw(m) / max) * 100 : 0;
                          const isWinner = i === winnerIdx && compareMarkets.length > 1;
                          return (
                            <div key={m.slug} className="min-w-0">
                              <p
                                className={cn(
                                  "truncate text-[12.5px] font-semibold tabular-nums",
                                  isWinner && "text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                {metric.value(m)}
                                {isWinner ? (
                                  <span
                                    className="ml-1.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1 py-px text-[9.5px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300"
                                    title={metric.title}
                                  >
                                    {metric.tag}
                                  </span>
                                ) : null}
                              </p>
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full transition-[width] duration-300"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length],
                                    opacity: isWinner ? 1 : 0.75,
                                  }}
                                  aria-hidden
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>

              <p className="mt-2.5 text-[10.5px] leading-snug text-muted-foreground">
                Bars scale to the selection&apos;s maximum · a fourth pick replaces
                the oldest · {compareMarkets.length >= 2 ? "“leads”/“longest” tag the per-metric winner" : "winner tags appear with a second market"}.
              </p>
            </aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
