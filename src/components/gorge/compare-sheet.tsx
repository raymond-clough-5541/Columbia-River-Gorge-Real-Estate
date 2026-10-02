"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  Check,
  Crown,
  Download,
  FlaskConical,
  GitCompareArrows,
  Info,
  PiggyBank,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type ListingSubmarketSummary,
  type PropertyListing,
  type PropertyType,
  type Submarket,
} from "@/lib/gorge";
import { StateBadge } from "./shared";
/* ------------------------------------------------------------------ */
/* Watchlist comparison sheet — starred listings side-by-side with     */
/* financing + income-lens metrics, best-in-class highlighting, and    */
/* an income-vs-appreciation verdict. Round 7-b adds ONE hypothetical  */
/* "what-if" column (amber) at a target price point, underwritten by   */
/* the exact same sheet + winner logic as the live listings.           */
/* ------------------------------------------------------------------ */

/** Standard underwriting posture for the sheet (documented in the header). */
const SHEET_DOWN_PCT = 20;
const SHEET_RATE = 6.5;
const SHEET_TERM = 30;
const LAND_DOWN_PCT = 35;
const LAND_RATE = 8.5;

/* ------------------------ what-if (round 7-b) ----------------------- */

/** Singleton id of the hypothetical column injected by the editor. */
const WHAT_IF_ID = "what-if";
const WHAT_IF_MIN_PRICE = 50_000;
const WHAT_IF_PRICE_STEP = 5_000;
const WHAT_IF_MAX_SQFT = 15_000;
const WHAT_IF_MAX_ACREAGE = 500;
const WHAT_IF_DEFAULT_SQFT = 2200;
const WHAT_IF_DEFAULT_ACREAGE = 0.3;
const WHAT_IF_TYPES: PropertyType[] = [
  "Single-Family",
  "Infill Multi-Family",
  "Luxury Agricultural/Farm Estate",
  "Land Parcel",
];

/** Auto label used when the editor's label field is left blank.
 *  Kept compact (compact-currency) so the column header never truncates. */
const autoWhatIfLabel = (price: number) =>
  `What-if ${fmtCurrency(price, { compact: true })}`;

/** Matches the auto-generated label so "Edit" reopens with a blank field. */
const WHAT_IF_AUTO_LABEL = /^What-if \$[0-9.]+[kM]$/;

const clampWhatIfNumber = (raw: string, min: number, max: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

interface WhatIfForm {
  price: string;
  type: PropertyType;
  /** Submarket slug. */
  market: string;
  sqft: string;
  acreage: string;
  label: string;
}

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
  submarkets,
}: {
  listings: PropertyListing[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenListing?: (listing: PropertyListing) => void;
  /** Real micro-markets the what-if editor can underwrite in. */
  submarkets?: Submarket[];
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
  /* ---- Hypothetical what-if column (round 7-b) ----
     At most ONE synthetic listing. The state lives here — the sheet stays
     mounted across open/close via CompareTrigger — so the what-if survives
     closing and reopening the sheet for the whole session. */
  const [whatIf, setWhatIf] = useState<PropertyListing | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<WhatIfForm>({
    price: "",
    type: "Single-Family",
    market: "",
    sqft: String(WHAT_IF_DEFAULT_SQFT),
    acreage: String(WHAT_IF_DEFAULT_ACREAGE),
    label: "",
  });

  const sortedSubmarkets = useMemo(
    () => [...(submarkets ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [submarkets]
  );

  const entries = useMemo(() => {
    const base = starred.map(underwrite);
    return whatIf ? [...base, underwrite(whatIf)] : base;
  }, [starred, whatIf]);

  const bestIncome = useMemo(() => {
    const improved = entries.filter((m) => !m.isLand);
    if (improved.length === 0) return null;
    return improved.reduce((a, b) => (b.cashFlow > a.cashFlow ? b : a));
  }, [entries]);
  const bestEquity = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => (b.fv2046 > a.fv2046 ? b : a));
  }, [entries]);

  /* ---- What-if editor plumbing (all toasts fire in event handlers,
     never inside state updaters — the round-6 bug class). ---- */

  const canWhatIf = starred.length >= 2 && sortedSubmarkets.length > 0;

  /** Median starred asking price, rounded to the nearest $5k. */
  const defaultWhatIfPrice = useMemo(() => {
    const prices = starred.map((l) => l.price).sort((a, b) => a - b);
    if (prices.length === 0) return 450_000;
    const mid = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 === 1
        ? prices[mid]
        : (prices[mid - 1] + prices[mid]) / 2;
    return Math.round(median / WHAT_IF_PRICE_STEP) * WHAT_IF_PRICE_STEP;
  }, [starred]);

  const handleEditorOpenChange = (next: boolean) => {
    if (next) {
      const firstStarredSlug = starred[0]?.submarket?.slug ?? "";
      const defaultSlug = sortedSubmarkets.some(
        (s) => s.slug === firstStarredSlug
      )
        ? firstStarredSlug
        : (sortedSubmarkets[0]?.slug ?? "");
      setForm({
        price: whatIf ? String(whatIf.price) : String(defaultWhatIfPrice),
        type: whatIf ? whatIf.propertyType : "Single-Family",
        market: whatIf?.submarket?.slug ?? defaultSlug,
        sqft: whatIf ? String(whatIf.squareFeet) : String(WHAT_IF_DEFAULT_SQFT),
        acreage: whatIf
          ? String(whatIf.acreage)
          : String(WHAT_IF_DEFAULT_ACREAGE),
        label:
          whatIf && !WHAT_IF_AUTO_LABEL.test(whatIf.title) ? whatIf.title : "",
      });
    }
    setEditorOpen(next);
  };

  const submitWhatIf = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = Number(form.price);
    if (!Number.isFinite(parsed) || parsed < WHAT_IF_MIN_PRICE) {
      toast({
        title: "Enter a target price first",
        description: `The hypothetical needs a target price of at least ${fmtCurrency(
          WHAT_IF_MIN_PRICE
        )} — in ${fmtCurrency(WHAT_IF_PRICE_STEP)} steps — to underwrite.`,
      });
      return;
    }
    const market = sortedSubmarkets.find((s) => s.slug === form.market);
    if (!market) {
      toast({
        title: "Pick a market first",
        description:
          "Choose the micro-market the hypothetical would trade in.",
      });
      return;
    }
    const price = Math.round(parsed / WHAT_IF_PRICE_STEP) * WHAT_IF_PRICE_STEP;
    const sqft = clampWhatIfNumber(form.sqft, 0, WHAT_IF_MAX_SQFT);
    const acreage = clampWhatIfNumber(form.acreage, 0, WHAT_IF_MAX_ACREAGE);
    const label = form.label.trim() || autoWhatIfLabel(price);
    const submarket: ListingSubmarketSummary = {
      slug: market.slug,
      name: market.name,
      state: market.state,
      county: market.county,
      regulatoryFramework: market.regulatoryFramework,
      projectedCagr: market.projectedCagr,
      depletionYear: market.depletionYear,
      baselinePrice2026: market.baselinePrice2026,
    };
    const isLand = form.type === "Land Parcel" || sqft === 0;
    setWhatIf({
      id: WHAT_IF_ID,
      submarketId: WHAT_IF_ID,
      title: label,
      propertyType: form.type,
      price,
      acreage,
      bedrooms: isLand ? 0 : 3,
      bathrooms: isLand ? 0 : 2,
      squareFeet: sqft,
      zoningCode: "—",
      description: "",
      imageUrl: "",
      featured: false,
      status: "Hypothesis",
      createdAt: new Date().toISOString(),
      submarket,
    });
    setEditorOpen(false);
    toast({
      title: whatIf ? "What-if updated" : "What-if added to sheet",
      description: `${label} · ${market.name} (${market.state}) — underwritten with the same sheet as the ${starred.length} starred listings.`,
    });
  };

  const removeWhatIf = () => {
    setWhatIf(null);
    toast({
      title: "What-if removed",
      description:
        "The hypothetical column was dropped — only live listings remain.",
    });
  };

  /** Verdict pick title, tagged when the hypothetical wins a pick. */
  const pickTitle = (m: CompareMetrics): string =>
    m.listing.id === WHAT_IF_ID
      ? `${m.listing.title} (what-if)`
      : m.listing.title;

  /** Live preview backing the label field's placeholder. */
  const formPrice = Number(form.price);
  const previewWhatIfPrice =
    Number.isFinite(formPrice) && formPrice >= WHAT_IF_MIN_PRICE
      ? Math.round(formPrice / WHAT_IF_PRICE_STEP) * WHAT_IF_PRICE_STEP
      : defaultWhatIfPrice;

  const exportCsv = () => {
    if (entries.length === 0) return;
    const headers: string[] = [
      "Metric",
      ...entries.map((m) =>
        m.listing.id === WHAT_IF_ID
          ? `${m.listing.title} (what-if)`
          : m.listing.title
      ),
    ];
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
      description: `${entries.length} underwritten column${entries.length === 1 ? "" : "s"} → CSV.`,
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
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <SheetDescription className="min-w-[180px] flex-1 text-[12.5px] leading-relaxed">
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
            {canWhatIf ? (
              <Popover open={editorOpen} onOpenChange={handleEditorOpenChange}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    title="Underwrite a hypothetical listing at a target price point"
                    className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-amber-400/60 bg-amber-400/[0.04] px-2.5 text-[12px] font-medium text-amber-700 transition-all hover:border-amber-400 hover:bg-amber-400/10 active:scale-[0.97] dark:text-amber-300 dark:hover:bg-amber-400/10"
                  >
                    <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                    {whatIf ? "Edit what-if" : "Add what-if"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  aria-label="Hypothetical what-if listing editor"
                  className="w-[320px] max-w-[calc(100vw-1.5rem)] p-3.5"
                >
                  <form
                    onSubmit={submitWhatIf}
                    className="grid grid-cols-2 gap-2.5"
                  >
                    <div className="col-span-2 flex items-center gap-1.5">
                      <FlaskConical
                        className="h-3.5 w-3.5 shrink-0 text-amber-500"
                        aria-hidden
                      />
                      <p className="text-[12.5px] font-semibold">
                        Hypothetical listing
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="what-if-price"
                        className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Target price
                      </label>
                      <Input
                        id="what-if-price"
                        type="number"
                        inputMode="numeric"
                        min={WHAT_IF_MIN_PRICE}
                        step={WHAT_IF_PRICE_STEP}
                        value={form.price}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, price: e.target.value }))
                        }
                        className="mt-1 h-8 text-[13px] tabular-nums"
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="what-if-type"
                        className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Product type
                      </label>
                      <Select
                        value={form.type}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, type: v as PropertyType }))
                        }
                      >
                        <SelectTrigger
                          id="what-if-type"
                          className="mt-1 h-8 w-full text-[13px]"
                          aria-label="Hypothetical product type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WHAT_IF_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-[13px]">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="what-if-market"
                        className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Market
                      </label>
                      <Select
                        value={form.market}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, market: v }))
                        }
                      >
                        <SelectTrigger
                          id="what-if-market"
                          className="mt-1 h-8 w-full text-[13px]"
                          aria-label="Hypothetical market"
                        >
                          <SelectValue placeholder="Pick a micro-market" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedSubmarkets.map((s) => (
                            <SelectItem
                              key={s.slug}
                              value={s.slug}
                              className="text-[13px]"
                            >
                              {s.name} ({s.state})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label
                        htmlFor="what-if-sqft"
                        className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Square feet
                      </label>
                      <Input
                        id="what-if-sqft"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={WHAT_IF_MAX_SQFT}
                        step={100}
                        value={form.sqft}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, sqft: e.target.value }))
                        }
                        className="mt-1 h-8 text-[13px] tabular-nums"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="what-if-acreage"
                        className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Acreage
                      </label>
                      <Input
                        id="what-if-acreage"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={WHAT_IF_MAX_ACREAGE}
                        step={0.1}
                        value={form.acreage}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, acreage: e.target.value }))
                        }
                        className="mt-1 h-8 text-[13px] tabular-nums"
                      />
                    </div>
                    {form.type === "Land Parcel" || Number(form.sqft) === 0 ? (
                      <p className="col-span-2 text-[11px] leading-snug text-muted-foreground">
                        Land posture applies — {LAND_DOWN_PCT}% down @ {LAND_RATE}%,
                        no rent until entitlement.
                      </p>
                    ) : null}
                    <div className="col-span-2">
                      <label
                        htmlFor="what-if-label"
                        className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Label · optional
                      </label>
                      <Input
                        id="what-if-label"
                        type="text"
                        value={form.label}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, label: e.target.value }))
                        }
                        className="mt-1 h-8 text-[13px]"
                        placeholder={autoWhatIfLabel(previewWhatIfPrice)}
                      />
                    </div>
                    <div className="col-span-2 mt-0.5 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 text-[12.5px]"
                        onClick={() => setEditorOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="h-8 gap-1.5 bg-zinc-900 text-[12.5px] text-white hover:bg-zinc-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                      >
                        <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                        Add to sheet
                      </Button>
                    </div>
                  </form>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
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
                    {bestIncome ? pickTitle(bestIncome) : "No improved listings"}
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
                    {bestEquity ? pickTitle(bestEquity) : "—"}
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
                {entries.map((m) => {
                  if (m.listing.id === WHAT_IF_ID) {
                    return (
                      <div
                        key={WHAT_IF_ID}
                        className="relative min-w-0 border-r bg-amber-400/[0.04] last:border-r-0 dark:bg-amber-400/[0.07]"
                      >
                        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-1.5 border-2 border-dashed border-amber-400/50 bg-amber-400/[0.06]">
                          <FlaskConical
                            className="h-5 w-5 text-amber-500/80 dark:text-amber-300/80"
                            aria-hidden
                          />
                          <span className="text-[10.5px] font-bold tracking-widest text-amber-600 dark:text-amber-300">
                            WHAT-IF
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeWhatIf}
                          aria-label="Remove the what-if listing"
                          title="Remove the what-if listing"
                          className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/40 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-rose-400/60 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 dark:hover:text-rose-400"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <div className="p-2.5">
                          <p className="truncate text-[13px] font-semibold leading-tight">
                            {m.listing.title}
                          </p>
                          <p className="mt-0.5 truncate text-[10.5px] font-medium text-amber-600/90 dark:text-amber-300/80">
                            {m.listing.propertyType}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="truncate">
                              {m.listing.submarket?.name ?? "—"}{" "}
                            </span>
                            {m.listing.submarket ? (
                              <StateBadge state={m.listing.submarket.state} />
                            ) : null}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={m.listing.id}
                      className="relative min-w-0 border-r last:border-r-0"
                    >
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
                  );
                })}

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
                        const isWhatIf = m.listing.id === WHAT_IF_ID;
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
                                    : "text-foreground/90",
                              // Amber wash on the hypothetical column — the
                              // emerald winner highlight takes precedence.
                              isWhatIf &&
                                !isWin &&
                                "bg-amber-400/[0.05] dark:bg-amber-400/[0.08]"
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
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                  Rent is market-indexed per round 6 — same floor plan pencils
                  differently in Hood River vs Wishram.
                </p>
                {whatIf ? (
                  <p className="flex items-center gap-1.5 text-[11.5px] text-amber-700/90 dark:text-amber-300/80">
                    <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                    The amber column is a hypothetical entry — underwritten with
                    the same sheet, not a live listing.
                  </p>
                ) : null}
              </div>
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
  submarkets,
}: {
  listings: PropertyListing[];
  onOpenListing?: (listing: PropertyListing) => void;
  /** Forwarded to the sheet so the what-if editor can offer real markets. */
  submarkets?: Submarket[];
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
        submarkets={submarkets}
      />
    </>
  );
}
