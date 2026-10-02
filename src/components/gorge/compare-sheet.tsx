"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  Crown,
  Download,
  GitCompareArrows,
  Info,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadCsv, timestampSuffix, toCsv, type CsvCell } from "@/lib/csv";
import { useToast } from "@/hooks/use-toast";
import { useWatchlist } from "@/lib/watchlist-store";
import {
  INSURANCE_RATE,
  PROPERTY_TAX_RATES,
  RENTAL_RESERVE_RATE,
  estimateMarketRent,
  fmtAcres,
  fmtCurrency,
  fmtPct,
  futureValue,
  monthlyPayment,
  runwayYears,
  type PropertyListing,
} from "@/lib/gorge";
import { StateBadge } from "./shared";
/* ------------------------------------------------------------------ */
/* Watchlist comparison sheet — starred listings side-by-side with     */
/* financing + income-lens metrics, best-in-class highlighting, and    */
/* an income-vs-appreciation verdict.                                   */
/* ------------------------------------------------------------------ */

/** Standard underwriting posture for the sheet (documented in the header). */
const SHEET_DOWN_PCT = 20;
const SHEET_RATE = 6.5;
const SHEET_TERM = 30;
const LAND_DOWN_PCT = 35;
const LAND_RATE = 8.5;

interface CompareMetrics {
  listing: PropertyListing;
  isLand: boolean;
  loan: number;
  monthlyCarry: number;
  rentMonthly: number;
  grossYield: number;
  noiYield: number;
  cashFlow: number;
  cashOnCash: number;
  fv2046: number;
  multiple: number;
  pricePerSqft: number | null;
  runway: number;
}

function underwrite(l: PropertyListing): CompareMetrics {
  const isLand = l.propertyType === "Land Parcel" || l.squareFeet === 0;
  const price = Math.max(1, l.price);
  const downPct = isLand ? LAND_DOWN_PCT : SHEET_DOWN_PCT;
  const rate = isLand ? LAND_RATE : SHEET_RATE;
  const down = (price * downPct) / 100;
  const loan = price - down;
  const state = l.submarket?.state ?? "OR";
  const pi = monthlyPayment(loan, rate, SHEET_TERM);
  const tax = (price * PROPERTY_TAX_RATES[state]) / 100 / 12;
  const ins = isLand ? 0 : (price * INSURANCE_RATE) / 12;
  const monthlyCarry = pi + tax + ins;

  const rent = estimateMarketRent(l); // market-indexed per round 6
  const grossAnnual = (rent.dwelling + rent.agriculture) * 12;
  const noi = grossAnnual * (1 - RENTAL_RESERVE_RATE);
  const cagr = l.submarket?.projectedCagr ?? 5;
  const fv2046 = futureValue(price, cagr, 20);

  return {
    listing: l,
    isLand,
    loan,
    monthlyCarry,
    rentMonthly: rent.dwelling + rent.agriculture,
    grossYield: isLand ? 0 : (grossAnnual / price) * 100,
    noiYield: isLand ? 0 : (noi / price) * 100,
    cashFlow: noi - monthlyCarry * 12,
    cashOnCash: down > 0 ? (noi - monthlyCarry * 12) / down : 0,
    fv2046,
    multiple: Math.pow(1 + cagr / 100, 20),
    pricePerSqft: !isLand && l.squareFeet > 0 ? price / l.squareFeet : null,
    runway: runwayYears(l.submarket?.depletionYear ?? 2046),
  };
}

type RowDef = {
  key: string;
  label: string;
  hint: string;
  /** Which direction wins. null → informational row, no highlight. */
  better: "high" | "low" | null;
  format: (m: CompareMetrics) => string;
  na?: (m: CompareMetrics) => boolean;
  /** Rose tint when the raw value is negative (cash-flow family). */
  negativeRose?: (m: CompareMetrics) => boolean;
};

const ROWS: RowDef[] = [
  {
    key: "price",
    label: "Asking price",
    hint: "Entry check",
    better: "low",
    format: (m) => fmtCurrency(m.listing.price),
  },
  {
    key: "sqft",
    label: "$ / sqft",
    hint: "Improved value",
    better: "low",
    format: (m) =>
      m.pricePerSqft ? `$${Math.round(m.pricePerSqft).toLocaleString()}` : "—",
    na: (m) => m.isLand,
  },
  {
    key: "acreage",
    label: "Deed acres",
    hint: "Land component",
    better: null,
    format: (m) => fmtAcres(m.listing.acreage, m.listing.acreage < 1 ? 2 : 1),
  },
  {
    key: "rent",
    label: "Est. rent / mo",
    hint: "Market-indexed",
    better: "high",
    format: (m) =>
      m.isLand ? "—" : fmtCurrency(Math.round(m.rentMonthly)),
    na: (m) => m.isLand,
  },
  {
    key: "gross",
    label: "Gross yield",
    hint: "Rent ÷ price",
    better: "high",
    format: (m) => (m.isLand ? "—" : fmtPct(m.grossYield)),
    na: (m) => m.isLand,
  },
  {
    key: "noi",
    label: "NOI yield",
    hint: `after ${fmtPct(RENTAL_RESERVE_RATE * 100, 0)} reserve`,
    better: "high",
    format: (m) => (m.isLand ? "—" : fmtPct(m.noiYield)),
    na: (m) => m.isLand,
  },
  {
    key: "carry",
    label: "Monthly carry",
    hint: `${SHEET_DOWN_PCT}%↓ · ${SHEET_RATE}% · ${SHEET_TERM}yr`,
    better: "low",
    format: (m) => fmtCurrency(Math.round(m.monthlyCarry)),
  },
  {
    key: "cashflow",
    label: "Annual cash flow",
    hint: "NOI − carry",
    better: "high",
    format: (m) => (m.isLand ? "—" : fmtCurrency(Math.round(m.cashFlow), { compact: true })),
    na: (m) => m.isLand,
    negativeRose: (m) => !m.isLand && m.cashFlow < 0,
  },
  {
    key: "coc",
    label: "Cash-on-cash",
    hint: "On the down stroke",
    better: "high",
    format: (m) => (m.isLand ? "—" : fmtPct(m.cashOnCash * 100)),
    na: (m) => m.isLand,
    negativeRose: (m) => !m.isLand && m.cashOnCash < 0,
  },
  {
    key: "fv",
    label: "2046 value",
    hint: "At market CAGR",
    better: "high",
    format: (m) => fmtCurrency(Math.round(m.fv2046), { compact: true }),
  },
  {
    key: "mult",
    label: "20-yr multiple",
    hint: "Appreciation engine",
    better: "high",
    format: (m) => `${m.multiple.toFixed(2)}×`,
  },
  {
    key: "runway",
    label: "Land runway",
    hint: "Market's raw-land years",
    better: "high",
    format: (m) => `${m.runway} yrs`,
  },
];

/** Pick the winning metric entry for a row (null when informational). */
function winnerOf(
  row: RowDef,
  entries: CompareMetrics[]
): CompareMetrics | null {
  if (!row.better || entries.length < 2) return null;
  const scored = entries.filter((m) => !row.na?.(m));
  if (scored.length < 2) return null;
  const val = (m: CompareMetrics) => {
    switch (row.key) {
      case "price": return m.listing.price;
      case "sqft": return m.pricePerSqft ?? Infinity;
      case "carry": return m.monthlyCarry;
      case "rent": return m.rentMonthly;
      case "gross": return m.grossYield;
      case "noi": return m.noiYield;
      case "cashflow": return m.cashFlow;
      case "coc": return m.cashOnCash;
      case "fv": return m.fv2046;
      case "mult": return m.multiple;
      case "runway": return m.runway;
      default: return 0;
    }
  };
  const sorted = [...scored].sort((a, b) =>
    row.better === "high" ? val(b) - val(a) : val(a) - val(b)
  );
  const best = sorted[0];
  // Ties → both win (highlight stays honest).
  return val(best) === val(sorted[1]) ? null : best;
}

export function CompareSheet({
  listings,
  open,
  onOpenChange,
  onOpenListing,
}: {
  listings: PropertyListing[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenListing?: (listing: PropertyListing) => void;
}) {
  const watchlist = useWatchlist();
  const { toast } = useToast();

  // Star order = the user's shortlist order.
  const starred = useMemo(
    () =>
      watchlist
        .map((id) => listings.find((l) => l.id === id))
        .filter((l): l is PropertyListing => Boolean(l)),
    [watchlist, listings]
  );
  const entries = useMemo(() => starred.map(underwrite), [starred]);

  const bestIncome = useMemo(() => {
    const improved = entries.filter((m) => !m.isLand);
    if (improved.length === 0) return null;
    return improved.reduce((a, b) => (b.cashFlow > a.cashFlow ? b : a));
  }, [entries]);
  const bestEquity = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => (b.fv2046 > a.fv2046 ? b : a));
  }, [entries]);

  const exportCsv = () => {
    if (entries.length === 0) return;
    const headers: string[] = ["Metric", ...entries.map((m) => m.listing.title)];
    const rows: CsvCell[][] = ROWS.map((r) => [
      `${r.label} (${r.hint})`,
      ...entries.map((m) => (r.na?.(m) ? "n/a" : r.format(m))),
    ]);
    downloadCsv(
      `watchlist-comparison-${timestampSuffix()}`,
      toCsv(headers, rows)
    );
    toast({
      title: "Comparison exported",
      description: `${entries.length} starred listings → CSV.`,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[760px]"
      >
        <SheetHeader className="border-b bg-muted/30 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-[16px]">
            <GitCompareArrows className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Watchlist comparison
          </SheetTitle>
          <SheetDescription className="text-[12.5px] leading-relaxed">
            {starred.length >= 2 ? (
              <>
                {starred.length} starred listings underwritten on a standard
                sheet — {SHEET_DOWN_PCT}% down @ {SHEET_RATE}% over {SHEET_TERM}
                yrs (land: {LAND_DOWN_PCT}% @ {LAND_RATE}%), base rent posture,
                8% operating reserve. Emerald = best in class.
              </>
            ) : (
              "Star at least two listings to compare them side-by-side."
            )}
          </SheetDescription>
        </SheetHeader>

        {starred.length < 2 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted/60">
              <GitCompareArrows className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-medium">Nothing to compare yet</p>
            <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Star two or more listings from the grid — the sheet underwrites
              each one and highlights the best-in-class metric.
            </p>
          </div>
        ) : (
          <>
            {/* Verdict banner — income pick vs appreciation pick */}
            <div className="grid min-w-0 gap-2 border-b px-5 py-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-start gap-2.5 rounded-lg border bg-card p-3">
                <PiggyBank
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Income pick
                  </p>
                  <p className="mt-0.5 truncate text-[13.5px] font-semibold">
                    {bestIncome ? bestIncome.listing.title : "No improved listings"}
                  </p>
                  {bestIncome ? (
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
                      {bestIncome.cashFlow >= 0 ? "+" : "−"}
                      {fmtCurrency(Math.abs(Math.round(bestIncome.cashFlow)), { compact: true })}/yr
                      cash flow · {fmtPct(bestIncome.cashOnCash * 100)} CoC
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      Land parcels carry no rent until entitlement.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-2.5 rounded-lg border bg-card p-3">
                <TrendingUp
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Appreciation pick · 2046
                  </p>
                  <p className="mt-0.5 truncate text-[13.5px] font-semibold">
                    {bestEquity ? bestEquity.listing.title : "—"}
                  </p>
                  {bestEquity ? (
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
                      {fmtCurrency(Math.round(bestEquity.fv2046), { compact: true })} at{" "}
                      {fmtPct(bestEquity.listing.submarket?.projectedCagr ?? 0)} CAGR ·{" "}
                      {bestEquity.multiple.toFixed(2)}× multiple
                    </p>
                  ) : null}
                </div>
              </div>
              {bestIncome && bestEquity && bestIncome.listing.id !== bestEquity.listing.id ? (
                <p className="sm:col-span-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  <Info className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
                  The cash-flow pick and the appreciation pick diverge here — a
                  classic Gorge split: entry markets carry the note better, while
                  supply-starved markets compound harder.
                </p>
              ) : null}
            </div>

            {/* Comparison grid — horizontally scrollable, sticky label column */}
            <div className="overflow-x-auto">
              <div
                className="grid border-b text-[12.5px]"
                style={{
                  gridTemplateColumns: `152px repeat(${entries.length}, minmax(168px, 1fr))`,
                }}
              >
                {/* Header row: photos + titles */}
                <div className="sticky left-0 z-10 border-r bg-background/95 backdrop-blur-sm" />
                {entries.map((m) => (
                  <div key={m.listing.id} className="relative min-w-0 border-r last:border-r-0">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={m.listing.imageUrl}
                        alt={m.listing.title}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/75 to-transparent" />
                      <button
                        type="button"
                        onClick={() => onOpenListing?.(m.listing)}
                        className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/60"
                        aria-label={`Open the ${m.listing.title} dossier`}
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-[13px] font-semibold leading-tight">
                        {m.listing.title}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{m.listing.submarket?.name ?? "—"} </span>
                        {m.listing.submarket ? <StateBadge state={m.listing.submarket.state} /> : null}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Metric rows */}
                {ROWS.map((row) => {
                  const win = winnerOf(row, entries);
                  return (
                    <div key={row.key} className="contents">
                      <div className="sticky left-0 z-10 border-r border-t bg-background/95 px-3 py-2.5 backdrop-blur-sm">
                        <p className="text-[12px] font-semibold leading-tight">{row.label}</p>
                        <p className="mt-0.5 text-[10.5px] text-muted-foreground">{row.hint}</p>
                      </div>
                      {entries.map((m) => {
                        const isNa = row.na?.(m);
                        const isWin = win && win.listing.id === m.listing.id;
                        const rose = row.negativeRose?.(m);
                        return (
                          <div
                            key={`${row.key}-${m.listing.id}`}
                            className={cn(
                              "flex items-center justify-end border-r border-t px-3 py-2.5 text-right tabular-nums last:border-r-0",
                              isWin
                                ? "bg-emerald-500/[0.08] font-semibold text-emerald-700 dark:text-emerald-300"
                                : isNa
                                  ? "text-muted-foreground/60"
                                  : rose
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-foreground/90"
                            )}
                          >
                            {isWin ? (
                              <Crown className="mr-1.5 h-3 w-3 text-emerald-500" aria-hidden />
                            ) : null}
                            {isNa ? "—" : row.format(m)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3">
              <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                Rent is market-indexed per round 6 — same floor plan pencils
                differently in Hood River vs Wishram.
              </p>
              <div className="flex items-center gap-2">
                {onOpenListing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-[12.5px]"
                    onClick={() => {
                      if (entries[0]) onOpenListing(entries[0].listing);
                    }}
                  >
                    Open first dossier
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-zinc-900 text-[12.5px] text-white hover:bg-zinc-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                  onClick={exportCsv}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Export CSV
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Trigger + sheet in one — drop next to the watchlist chip in the filter bar. */
export function CompareTrigger({
  listings,
  onOpenListing,
}: {
  listings: PropertyListing[];
  onOpenListing?: (listing: PropertyListing) => void;
}) {
  const watchlist = useWatchlist();
  const [open, setOpen] = useState(false);
  const count = watchlist.length;
  return (
    <>
      <button
        type="button"
        disabled={count < 2}
        onClick={() => setOpen(true)}
        title={
          count < 2
            ? "Star two or more listings to unlock the comparison sheet"
            : "Compare starred listings side-by-side"
        }
        aria-label={`Compare watchlist (${count} starred)`}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-all active:scale-[0.97]",
          count >= 2
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
            : "cursor-not-allowed text-muted-foreground/60"
        )}
      >
        <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
        Compare
        {count >= 2 ? (
          <span className="rounded-sm bg-muted px-1 text-[11px] font-semibold tabular-nums">
            {count}
          </span>
        ) : null}
      </button>
      <CompareSheet
        listings={listings}
        open={open}
        onOpenChange={setOpen}
        onOpenListing={(l) => {
          setOpen(false);
          onOpenListing?.(l);
        }}
      />
    </>
  );
}
