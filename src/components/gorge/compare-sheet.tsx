"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  Check,
  Coins,
  Crown,
  Download,
  Flame,
  FlaskConical,
  GitCompareArrows,
  Info,
  Landmark,
  Pencil,
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
  SEASONAL_RENT_BANDS,
  estimateMarketRent,
  fmtAcres,
  fmtCurrency,
  fmtPct,
  futureValue,
  monthlyPayment,
  realValue,
  remainingBalance,
  runwayYears,
  type ListingSubmarketSummary,
  type PropertyListing,
  type PropertyType,
  type RentSeasonality,
  type Submarket,
} from "@/lib/gorge";
import { MicroLabel, StateBadge } from "./shared";
/* ------------------------------------------------------------------ */
/* Watchlist comparison sheet — starred listings side-by-side with     */
/* financing + income-lens metrics, best-in-class highlighting, and    */
/* an income-vs-appreciation verdict. Round 8-a runs up to THREE       */
/* hypothetical "what-if" columns (amber) side by side — entry vs      */
/* premium vs land play — each underwritten by the exact same sheet    */
/* + winner logic as the live listings.                                */
/* Round 9-a: the what-ifs are EDITABLE in place (each column's pencil  */
/* reuses the same editor form; saving keeps the column id and order  */
/* so CSV exports stay stable), and a header season control bends    */
/* every column's rent onto the lean/annual/peak tourism band the    */
/* Financing Lab already uses.                                        */
/* ------------------------------------------------------------------ */

/** Standard underwriting posture for the sheet (documented in the header). */
const SHEET_DOWN_PCT = 20;
const SHEET_RATE = 6.5;
const SHEET_TERM = 30;
const LAND_DOWN_PCT = 35;
const LAND_RATE = 8.5;

/* -------------------- what-ifs (round 7-b → 8-a) -------------------- */

/** Shared id prefix for every hypothetical column ("what-if-1"…"what-if-3").
 *  Live listing ids are Prisma uuids, so a prefix test can't false-positive.
 *  `isWhatIf` is the single source of truth for verdict/CSV tagging. */
const WHAT_IF_ID = "what-if";
/** Hard cap — three hypotheticals (entry / premium / land play) is where
 *  the sheet stays readable; past that columns stop comparing and start
 *  wallpapering. Matches the matrix's 3-pin convention. */
const WHAT_IF_MAX = 3;
const whatIfId = (slot: number) => `${WHAT_IF_ID}-${slot}`;
const isWhatIf = (id: string) => id.startsWith(`${WHAT_IF_ID}-`);

/** Smallest unused slot 1..WHAT_IF_MAX, so ids stay canonical AND unique
 *  across add → remove → add churn (["-1", "-3"] refills "-2", never a
 *  dupe). Unreachable overflow slot keeps the helper total. */
const nextWhatIfSlot = (existing: PropertyListing[]): number => {
  const used = new Set(existing.map((w) => w.id));
  for (let slot = 1; slot <= WHAT_IF_MAX; slot += 1) {
    if (!used.has(whatIfId(slot))) return slot;
  }
  return WHAT_IF_MAX + 1;
};

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

/** Round 8-a: two what-ifs at the same price point would auto-label
 *  identically and become indistinguishable amber columns — append
 *  " · 2"/" · 3" until the title is free. Custom labels may collide;
 *  that's the user's call, no enforcement. */
const uniqueAutoWhatIfLabel = (
  price: number,
  existing: PropertyListing[]
): string => {
  const base = autoWhatIfLabel(price);
  if (!existing.some((w) => w.title === base)) return base;
  for (let n = 2; n <= WHAT_IF_MAX; n += 1) {
    const candidate = `${base} · ${n}`;
    if (!existing.some((w) => w.title === candidate)) return candidate;
  }
  return base; // unreachable at ≤3 entries — keeps the helper total
};

const clampWhatIfNumber = (raw: string, min: number, max: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

/* -------------------- seasonality band (round 9-a) -------------------- */

/** Season band order for the header segmented control — mirrors the
 *  Financing Lab's Income Lens radiogroup (lib/gorge.ts owns the band
 *  math) so the two surfaces can never drift apart. */
const SEASON_ORDER: RentSeasonality[] = ["lean", "annualized", "peak"];

/** Round 11 — the sheet's real-terms deflator. Fixed at the same 2.5%
 *  consensus assumption the Projections workspace defaults to (that
 *  workspace owns the adjustable slider; the sheet keeps one knob to
 *  avoid drowning the underwriting controls). */
const SHEET_INFLATION = 2.5;
/** Compact control labels — "Annualized" is wider than the sheet header
 *  can spare on mobile; the tooltip carries the full band note. */
const SEASON_SHORT: Record<RentSeasonality, string> = {
  lean: "Lean",
  annualized: "Annual",
  peak: "Peak",
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

/** Underwrite one listing on the sheet's standard posture. `season`
 *  (round 9-a) bends the market-indexed rent estimate onto the tourism
 *  band before any rent-derived row is computed from it. */
function underwrite(
  l: PropertyListing,
  season: RentSeasonality
): CompareMetrics {
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

  // Market-indexed per round 6, then bent by the sheet-wide seasonality
  // band (round 9-a) — lean/peak stress-tests every rent-derived row.
  const rent = estimateMarketRent(l, { seasonality: season });
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
  /* ---- Hypothetical what-if columns (round 8-a) ----
     Up to WHAT_IF_MAX synthetic listings underwrite side by side, in
     creation order. The array lives here — the sheet stays mounted across
     open/close via CompareTrigger — so the hypotheticals survive closing
     and reopening the sheet for the whole session. */
  const [whatIfs, setWhatIfs] = useState<PropertyListing[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  /** Round 9-a editor mode: null → ADD (header trigger), "what-if-N" →
   *  EDIT that entry (its column pencil). Saving an edit replaces the
   *  entry in place, so the id — and with it column order and CSV
   *  stability — survives. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Round 9-a seasonality band applied to EVERY column's rent estimate,
   *  starred listings and what-ifs alike. Defaults to "annualized" so
   *  the sheet and the Financing Lab agree out of the box. */
  const [season, setSeason] = useState<RentSeasonality>("annualized");
  /** Round 11 — real-terms lens: deflates the 2046 family (per-column
   *  2046 values, the verdict's appreciation figure, and the whole
   *  portfolio strip) back into 2026 dollars at SHEET_INFLATION. Rent
   *  and carry rows are already current-year figures, so they stay put
   *  (noted in the footer while the lens is on). */
  const [realTerms, setRealTerms] = useState(false);
  /** Round 14 — pointer/keyboard-tracked year index (0..20) on the
   *  portfolio equity-runway chart; null when not hovered/focused. */
  const [runwayYear, setRunwayYear] = useState<number | null>(null);
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

  // Explicit lambdas (not `.map(underwrite)`) — Array.map would pass
  // the index as the second arg; the season must reach every column.
  const entries = useMemo(
    () => [
      ...starred.map((l) => underwrite(l, season)),
      ...whatIfs.map((l) => underwrite(l, season)),
    ],
    [starred, whatIfs, season]
  );

  /* Round 11 display layer — exactly the Projections workspace's
   * displayValue pattern: the nominal underwrite stays canonical (winner
   * picks, CSV, FIFO — all order-stable), and a derived array swaps the
   * 2046 family for its deflated twins when the lens is on. The transform
   * is monotone, so any winner computed on nominal FVs is still the
   * winner on the displayed values. */
  const displayEntries = useMemo(
    () =>
      realTerms
        ? entries.map((m) => ({
            ...m,
            fv2046: realValue(m.fv2046, SHEET_INFLATION, 20),
          }))
        : entries,
    [entries, realTerms]
  );

  /* ---- Portfolio strip (round 11) — the aggregate readout across every
   * column: what the whole shortlist costs today, what it carries per
   * month, and the 20-year equity runway if every note amortizes to
   * plan while every market compounds at its own CAGR. Land paper and
   * improved product underwrite at their own sheet postures (35%/8.5% vs
   * 20%/6.5%), so the blend is honest per entry, not one blanket rate. */
  const portfolio = useMemo(() => {
    if (entries.length === 0) return null;
    const totalPrice = entries.reduce((a, m) => a + m.listing.price, 0);
    const totalDown = entries.reduce(
      (a, m) => a + (m.listing.price * (m.isLand ? LAND_DOWN_PCT : SHEET_DOWN_PCT)) / 100,
      0
    );
    const totalCarry = entries.reduce((a, m) => a + m.monthlyCarry, 0);
    const totalAcres = entries.reduce((a, m) => a + m.listing.acreage, 0);
    const landCount = entries.filter((m) => m.isLand).length;
    // Each note amortizes at its own rate over SHEET_TERM; 20 years =
    // 240 months elapsed by the 2046 horizon.
    const remainingDebt = entries.reduce(
      (a, m) =>
        a +
        remainingBalance(
          m.loan,
          m.isLand ? LAND_RATE : SHEET_RATE,
          SHEET_TERM,
          240
        ),
      0
    );
    const fvTotal = displayEntries.reduce((a, m) => a + m.fv2046, 0);
    const equity = fvTotal - remainingDebt;
    /* Round 14 — the equity-runway series: the aggregate value path (riding
     * the display layer, so the 2026$ lens deflates it), the aggregate
     * amortizing balance, and the wedge between them. 21 points, 2026→2046. */
    const series = Array.from({ length: 21 }, (_, t) => {
      const value = entries.reduce(
        (a, m) =>
          a +
          (realTerms
            ? realValue(
                futureValue(m.listing.price, m.listing.submarket?.projectedCagr ?? 5, t),
                SHEET_INFLATION,
                t
              )
            : futureValue(m.listing.price, m.listing.submarket?.projectedCagr ?? 5, t)),
        0
      );
      const debt = entries.reduce(
        (a, m) =>
          a +
          remainingBalance(
            m.loan,
            m.isLand ? LAND_RATE : SHEET_RATE,
            SHEET_TERM,
            t * 12
          ),
        0
      );
      return { year: 2026 + t, value, debt, equity: value - debt };
    });
    // Price-weighted average depletion year across entries attached to a
    // submarket — the blended raw-land exhaustion milestone for the mix.
    const depletionWeight = entries.reduce(
      (a, m) => a + (m.listing.submarket?.depletionYear ? m.listing.price : 0),
      0
    );
    const depletionYear =
      depletionWeight > 0
        ? Math.round(
            entries.reduce(
              (a, m) =>
                a + (m.listing.submarket?.depletionYear ?? 0) * m.listing.price,
              0
            ) / depletionWeight
          )
        : null;
    return {
      count: entries.length,
      landCount,
      totalPrice,
      totalDown,
      totalCarry,
      totalAcres,
      fvTotal,
      remainingDebt,
      equity,
      leverage: totalDown > 0 ? equity / totalDown : 0,
      blendedMultiple: totalPrice > 0 ? fvTotal / totalPrice : 0,
      series,
      depletionYear,
    };
  }, [entries, displayEntries, realTerms]);

  const bestIncome = useMemo(() => {
    const improved = entries.filter((m) => !m.isLand);
    if (improved.length === 0) return null;
    return improved.reduce((a, b) => (b.cashFlow > a.cashFlow ? b : a));
  }, [entries]);
  const bestEquity = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => (b.fv2046 > a.fv2046 ? b : a));
  }, [entries]);
  /** The appreciation banner figure must match the lens — display layer,
   *  not the canonical pick (same entry either way; the transform is
   *  monotone). */
  const bestEquityDisplay = useMemo(() => {
    if (displayEntries.length === 0) return null;
    return displayEntries.reduce((a, b) => (b.fv2046 > a.fv2046 ? b : a));
  }, [displayEntries]);

  /* ---- What-if editor plumbing (all toasts fire in event handlers,
     never inside state updaters — the round-6 bug class). One shared
     form serves TWO anchors as of round 9-a: the header "Add what-if"
     trigger (add mode — starred-derived defaults, 3-entry gate at open)
     and each column's pencil (edit mode — prefilled from that entry,
     replaces in place so editing can never exceed the limit). Radix
     unmounts closed popover content, so the shared field ids can never
     duplicate in the DOM across the N+1 anchors. ---- */

  const canWhatIf = starred.length >= 2 && sortedSubmarkets.length > 0;
  const isEditing = editingId !== null;
  /** Auto-label dedupe peers — the entry being edited must not count
   *  against its own next label, else "What-if $600k" couldn't keep its
   *  name through a price tweak. */
  const editorPeers = isEditing
    ? whatIfs.filter((w) => w.id !== editingId)
    : whatIfs;

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

  const handleEditorOpenChange = (
    next: boolean,
    editTarget: PropertyListing | null = null
  ) => {
    if (next) {
      if (editTarget) {
        // EDIT mode — prefilled from the entry; no limit gate, because a
        // save replaces that entry in place and can never grow a 4th
        // column. The market prefills from the entry's own submarket,
        // falling back to the first sorted slug if it ever disappears
        // from the live submarket list mid-session.
        setEditingId(editTarget.id);
        setForm({
          price: String(editTarget.price),
          type: editTarget.propertyType,
          market: sortedSubmarkets.some(
            (s) => s.slug === editTarget.submarket?.slug
          )
            ? (editTarget.submarket?.slug ?? "")
            : (sortedSubmarkets[0]?.slug ?? ""),
          sqft: String(editTarget.squareFeet),
          acreage: String(editTarget.acreage),
          label: editTarget.title,
        });
      } else {
        // ADD mode — limit gate at open time (event-handler context,
        // never an updater): the toast fires once per click and the
        // popover simply stays closed.
        if (whatIfs.length >= WHAT_IF_MAX) {
          toast({
            title: "What-if limit reached",
            description:
              "Three hypotheticals at a time — remove one to add another.",
          });
          return;
        }
        setEditingId(null);
        const firstStarredSlug = starred[0]?.submarket?.slug ?? "";
        const defaultSlug = sortedSubmarkets.some(
          (s) => s.slug === firstStarredSlug
        )
          ? firstStarredSlug
          : (sortedSubmarkets[0]?.slug ?? "");
        setForm({
          price: String(defaultWhatIfPrice),
          type: "Single-Family",
          market: defaultSlug,
          sqft: String(WHAT_IF_DEFAULT_SQFT),
          acreage: String(WHAT_IF_DEFAULT_ACREAGE),
          label: "",
        });
      }
    } else {
      // Closing is silent for BOTH modes — Escape/Cancel discards an
      // in-flight edit with no toast (the quieter option). Pointerdown
      // dismissal always precedes the next trigger's click, so clearing
      // the mode here can't race the subsequent open.
      setEditingId(null);
    }
    setEditorOpen(next);
  };

  const submitWhatIf = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Defensive double-gate — ADD mode only: the popover can't open at
    // the limit, but a stray Enter (or a future programmatic submit) must
    // not grow a 4th column. Editing replaces an entry in place, so it
    // is exempt by construction.
    if (!isEditing && whatIfs.length >= WHAT_IF_MAX) {
      toast({
        title: "What-if limit reached",
        description:
          "Three hypotheticals at a time — remove one to add another.",
      });
      return;
    }
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
    // editorPeers: in edit mode the entry's own title steps aside so it
    // can keep (or reclaim) its auto-label without colliding with itself.
    const label =
      form.label.trim() || uniqueAutoWhatIfLabel(price, editorPeers);
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

    if (editingId !== null) {
      // EDIT save — swap the fields in place so the what-if-N id, the
      // column order and every CSV export after it stay identical;
      // createdAt too, since it's the same hypothesis re-tuned, not a
      // new one.
      const targetId = editingId;
      setWhatIfs((prev) =>
        prev.map((w) =>
          w.id === targetId
            ? {
                ...w,
                title: label,
                propertyType: form.type,
                price,
                acreage,
                bedrooms: isLand ? 0 : 3,
                bathrooms: isLand ? 0 : 2,
                squareFeet: sqft,
                submarket,
              }
            : w
        )
      );
      setEditingId(null);
      setEditorOpen(false);
      toast({
        title: "What-if updated",
        description: `${label} re-underwritten — ${fmtCurrency(price)} · ${market.name} (${market.state}) — same column, same sheet.`,
      });
      return;
    }

    const id = whatIfId(nextWhatIfSlot(whatIfs));
    setWhatIfs((prev) => [
      ...prev,
      {
        id,
        submarketId: id,
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
      },
    ]);
    setEditorOpen(false);
    toast({
      title: "What-if added to sheet",
      description: `${label} · ${market.name} (${market.state}) — ${
        whatIfs.length + 1
      } of ${WHAT_IF_MAX} hypotheticals, underwritten with the same sheet as the ${starred.length} starred listings.`,
    });
  };

  const removeWhatIf = (whatIf: PropertyListing) => {
    setWhatIfs((prev) => prev.filter((w) => w.id !== whatIf.id));
    const remaining = whatIfs.length - 1;
    toast({
      title: "What-if removed",
      description: `${whatIf.title} was dropped — ${
        remaining === 0
          ? "only live listings remain."
          : `${remaining} hypothetical${remaining === 1 ? "" : "s"} still on the sheet.`
      }`,
    });
  };

  /** Verdict pick title, tagged when ANY hypothetical wins a pick. */
  const pickTitle = (m: CompareMetrics): string =>
    isWhatIf(m.listing.id)
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
    // Season tag follows the file's `(what-if)` suffix convention — it
    // rides the corner header cell so the export stays one flat header
    // row (nothing for downstream parsers to trip on), and the toast
    // repeats it because the file outlives the toast.
    const band = SEASONAL_RENT_BANDS[season];
    const seasonTag =
      season === "annualized" ? "" : ` (${season}-season rents ×${band.mult.toFixed(2)})`;
    const realTag = realTerms ? " · real 2026 $ (deflated 2.5%/yr)" : "";
    const headers: string[] = [
      `Metric${seasonTag}${realTerms ? " (real 2026 $)" : ""}`,
      ...entries.map((m) =>
        isWhatIf(m.listing.id)
          ? `${m.listing.title} (what-if)`
          : m.listing.title
      ),
    ];
    const rows: CsvCell[][] = ROWS.map((r) => [
      `${r.label} (${r.hint})`,
      ...(realTerms
        ? // The display layer carries the deflated 2046 family.
          displayEntries.map((m) => (r.na?.(m) ? "n/a" : r.format(m)))
        : entries.map((m) => (r.na?.(m) ? "n/a" : r.format(m)))),
    ]);
    downloadCsv(
      `watchlist-comparison-${timestampSuffix()}`,
      toCsv(headers, rows)
    );
    toast({
      title: "Comparison exported",
      description: `${entries.length} underwritten column${
        entries.length === 1 ? "" : "s"
      } → CSV${
        season === "annualized"
          ? ""
          : ` · rents at the ${season}-season band (×${band.mult.toFixed(2)})`
      }${realTag}.`,
    });
  };

  /* Round 9-a: the what-if editor form, hoisted out of the ADD popover
     so each column's pencil can mount the exact same fields in EDIT
     mode. Mode is derived from editingId — null renders the add
     defaults; a "what-if-N" id renders the save-in-place posture. */
  const editorForm = (
    <form onSubmit={submitWhatIf} className="grid grid-cols-2 gap-2.5">
      <div className="col-span-2 flex items-center gap-1.5">
        {isEditing ? (
          <Pencil
            className="h-3.5 w-3.5 shrink-0 text-emerald-500"
            aria-hidden
          />
        ) : (
          <FlaskConical
            className="h-3.5 w-3.5 shrink-0 text-amber-500"
            aria-hidden
          />
        )}
        <p className="text-[12.5px] font-semibold">
          {isEditing ? "Edit what-if" : "Hypothetical listing"}
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
          onValueChange={(v) => setForm((f) => ({ ...f, market: v }))}
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
          placeholder={uniqueAutoWhatIfLabel(previewWhatIfPrice, editorPeers)}
        />
      </div>
      <div className="col-span-2 mt-0.5 flex items-center justify-end gap-2">
        {/* Quiet cancel — discards an in-flight edit with no toast
            (Escape does the same through the popover's onOpenChange). */}
        <Button
          type="button"
          variant="ghost"
          className="h-8 text-[12.5px]"
          onClick={() => handleEditorOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className={cn(
            "h-8 gap-1.5 text-[12.5px] text-white dark:text-zinc-950",
            isEditing
              ? // Emerald accent — confirming an edit, not adding a column.
                "bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              : "bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          )}
        >
          {isEditing ? (
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          )}
          {isEditing ? "Save changes" : "Add to sheet"}
        </Button>
      </div>
    </form>
  );

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
                  {season !== "annualized" ? (
                    /* Muted by design — the amber what-if clause below
                       stays this description's only accent. */
                    <>
                      {" "}
                      · {season === "peak" ? "peak" : "lean"}-season rents
                    </>
                  ) : null}
                  {realTerms ? (
                    <span className="text-violet-600 dark:text-violet-300">
                      {" "}
                      · real 2026 dollars
                    </span>
                  ) : null}
                  {whatIfs.length > 0 ? (
                    /* Subtle amber clause — inline span so the description
                       reflows without layout-shift risk. */
                    <span className="text-amber-600 dark:text-amber-300">
                      {" "}
                      · +{whatIfs.length} what-if
                      {whatIfs.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </>
              ) : (
                "Star at least two listings to compare them side-by-side."
              )}
            </SheetDescription>
            {starred.length >= 2 ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                {/* Seasonality band (round 9-a) — same radiogroup semantics
                    as the Financing Lab's Income Lens so muscle memory
                    transfers; lib/gorge.ts owns the multipliers, so the two
                    surfaces can't drift. All-land sheets render it too — it
                    simply has no rent rows to bend there. */}
                <div
                  className="flex items-center gap-1.5"
                  title="Applies the seasonal rent band (×0.88 lean / ×1.15 peak) to every column's rent estimate"
                >
                  <MicroLabel className="text-[10px] tracking-wider">
                    Rent season
                  </MicroLabel>
                  <div
                    role="radiogroup"
                    aria-label="Rent seasonality band"
                    className="flex rounded-md border bg-background p-0.5"
                  >
                    {SEASON_ORDER.map((id) => {
                      const band = SEASONAL_RENT_BANDS[id];
                      const active = season === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setSeason(id)}
                          title={`${band.note} · rent × ${band.mult.toFixed(2)}`}
                          className={cn(
                            "h-6 rounded px-2 text-[11px] font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                            active
                              ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {SEASON_SHORT[id]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Round 11 — real-terms lens. One knob, fixed 2.5%
                    deflator (the Projections workspace owns the adjustable
                    slider); violet to match the lens language established
                    there. Rents/carry are already current-year figures — the
                    tooltip says so, the footer repeats it. */}
                <button
                  type="button"
                  onClick={() => setRealTerms((v) => !v)}
                  aria-pressed={realTerms}
                  title={
                    "Deflate the 2046 family — per-column 2046 values, multiples, the verdict figure and the portfolio strip — back into 2026 dollars at a 2.5%/yr inflation assumption. Rent and carry rows are already current-year figures and stay put."
                  }
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70",
                    realTerms
                      ? "border-violet-500/60 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      : "text-muted-foreground hover:border-zinc-300 hover:text-foreground dark:hover:border-zinc-600"
                  )}
                >
                  <Coins className="h-3.5 w-3.5" aria-hidden />
                  2026$
                </button>
                {canWhatIf ? (
                  <Popover
                    open={editorOpen && !isEditing}
                    onOpenChange={handleEditorOpenChange}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        title={
                          whatIfs.length >= WHAT_IF_MAX
                            ? "Three hypotheticals are already on the sheet — remove one to add another"
                            : "Underwrite a hypothetical listing at a target price point — up to three side by side"
                        }
                        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-amber-400/60 bg-amber-400/[0.04] px-2.5 text-[12px] font-medium text-amber-700 transition-all hover:border-amber-400 hover:bg-amber-400/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 dark:text-amber-300 dark:hover:bg-amber-400/10"
                      >
                        <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                        Add what-if
                        {whatIfs.length > 0 ? (
                          <span className="rounded-sm bg-amber-400/15 px-1 text-[10.5px] font-bold tabular-nums">
                            {whatIfs.length}/{WHAT_IF_MAX}
                          </span>
                        ) : null}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      aria-label="Hypothetical what-if listing editor"
                      className="w-[320px] max-w-[calc(100vw-1.5rem)] p-3.5"
                    >
                      {editorForm}
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
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
                  <p
                    className="mt-0.5 truncate text-[13.5px] font-semibold"
                    title={bestIncome ? pickTitle(bestIncome) : undefined}
                  >
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
                  <p
                    className="mt-0.5 truncate text-[13.5px] font-semibold"
                    title={bestEquity ? pickTitle(bestEquity) : undefined}
                  >
                    {bestEquity ? pickTitle(bestEquity) : "—"}
                  </p>
                  {bestEquityDisplay ? (
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
                      {fmtCurrency(Math.round(bestEquityDisplay.fv2046), { compact: true })}{" "}
                      {realTerms ? (
                        <span
                          className="mr-0.5 rounded-sm border border-violet-500/30 bg-violet-500/10 px-1 py-px text-[9.5px] font-semibold text-violet-700 dark:text-violet-300"
                          title="Deflated to 2026 dollars at 2.5%/yr"
                        >
                          2026$
                        </span>
                      ) : null}
                      at {fmtPct(bestEquityDisplay.listing.submarket?.projectedCagr ?? 0)} CAGR ·{" "}
                      {bestEquityDisplay.multiple.toFixed(2)}× multiple
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

            {/* Round 11 — portfolio strip: the whole shortlist as ONE position.
                Aggregates ride the display layer, so the 2046 family honors
                the real-terms lens; the amortization blend is per-entry (land
                paper 35%/8.5%, improved 20%/6.5%) rather than one blanket
                rate, mirroring the per-column sheet posture. */}
            {portfolio ? (
              <div
                role="region"
                aria-label="Portfolio aggregate"
                className="border-b bg-muted/25 px-5 py-3"
              >
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Landmark className="h-3.5 w-3.5" aria-hidden />
                      Portfolio
                      <span className="rounded-sm bg-muted px-1.5 py-px text-[10px] font-medium tabular-nums">
                        {portfolio.count} col{portfolio.count === 1 ? "" : "s"}
                        {portfolio.landCount > 0
                          ? ` · ${portfolio.landCount} land`
                          : ""}
                      </span>
                    </p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground tabular-nums">
                      {fmtAcres(portfolio.totalAcres, 1)} deed acres · blended{" "}
                      {portfolio.blendedMultiple.toFixed(2)}×
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-x-5 gap-y-3">
                    <div className="min-w-[104px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Purchase
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-tight tabular-nums">
                        {fmtCurrency(Math.round(portfolio.totalPrice), { compact: true })}
                      </p>
                    </div>
                    <div className="min-w-[104px] border-l border-border pl-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Down stroke
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-tight tabular-nums">
                        {fmtCurrency(Math.round(portfolio.totalDown), { compact: true })}
                      </p>
                    </div>
                    <div className="min-w-[104px] border-l border-border pl-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Carry / mo
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-tight tabular-nums">
                        {fmtCurrency(Math.round(portfolio.totalCarry), { compact: true })}
                      </p>
                    </div>
                    <div className="min-w-[124px] border-l border-border pl-4">
                      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        2046 equity
                        {realTerms ? (
                          <span
                            className="rounded-sm border border-violet-500/30 bg-violet-500/10 px-1 py-px text-[9px] font-bold text-violet-700 dark:text-violet-300"
                            title="Deflated to 2026 dollars at 2.5%/yr"
                          >
                            2026$
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmtCurrency(Math.round(portfolio.equity), { compact: true })}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted-foreground tabular-nums">
                        {fmtCurrency(Math.round(portfolio.fvTotal), { compact: true })} value −{" "}
                        {fmtCurrency(Math.round(portfolio.remainingDebt), { compact: true })} debt
                      </p>
                    </div>
                    <div className="min-w-[104px] border-l border-border pl-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        On the down stroke
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-tight tabular-nums">
                        {portfolio.leverage.toFixed(2)}×
                      </p>
                    </div>
                  </div>
                </div>

                {/* Round 14 — portfolio equity-runway chart. The aggregate
                    value path compounds at each market's own CAGR while the
                    per-entry notes amortize at their own postures; the wedge
                    between the curves is the equity build. Pointer- AND
                    keyboard-tracked (←/→ step years when focused). */}
                <PortfolioRunwayChart
                  series={portfolio.series}
                  depletionYear={portfolio.depletionYear}
                  realTerms={realTerms}
                  hoverT={runwayYear}
                  onHoverT={setRunwayYear}
                />
              </div>
            ) : null}

            {/* Comparison grid — horizontally scrollable, sticky label column.
                Round 11: sourced from displayEntries so the 2046 value and
                multiple rows honor the real-terms lens (every other row is
                byte-identical between the two arrays). */}
            <div className="overflow-x-auto">
              <div
                className="grid border-b text-[12.5px]"
                style={{
                  gridTemplateColumns: `152px repeat(${displayEntries.length}, minmax(168px, 1fr))`,
                }}
              >
                {/* Header row: photos + titles */}
                <div className="sticky left-0 z-10 border-r bg-background/95 backdrop-blur-sm" />
                {displayEntries.map((m) => {
                  if (isWhatIf(m.listing.id)) {
                    return (
                      <div
                        key={m.listing.id}
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
                        {/* Round 9-a affordances, stacked in the corner:
                            the pencil reopens the shared editor prefilled
                            with this entry (saving replaces in place, so
                            the id and column order survive); X drops it. */}
                        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                          <Popover
                            open={editorOpen && editingId === m.listing.id}
                            onOpenChange={(next) =>
                              handleEditorOpenChange(next, m.listing)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                title="Edit this what-if"
                                aria-label={`Edit the ${m.listing.title} what-if`}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/40 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-amber-400/70 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 dark:hover:text-amber-300"
                              >
                                <Pencil className="h-3 w-3" aria-hidden />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              aria-label={`Edit the ${m.listing.title} what-if`}
                              className="w-[320px] max-w-[calc(100vw-1.5rem)] p-3.5"
                            >
                              {editorForm}
                            </PopoverContent>
                          </Popover>
                          <button
                            type="button"
                            onClick={() => removeWhatIf(m.listing)}
                            aria-label={`Remove the ${m.listing.title} what-if`}
                            title={`Remove the ${m.listing.title} what-if`}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/40 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-rose-400/60 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 dark:hover:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        <div className="p-2.5">
                          <p
                            className="truncate text-[13px] font-semibold leading-tight"
                            title={m.listing.title}
                          >
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
                        <p
                          className="truncate text-[13px] font-semibold leading-tight"
                          title={m.listing.title}
                        >
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
                  const win = winnerOf(row, displayEntries);
                  return (
                    <div key={row.key} className="contents">
                      <div className="sticky left-0 z-10 border-r border-t bg-background/95 px-3 py-2.5 backdrop-blur-sm">
                        <p className="flex items-center gap-1 text-[12px] font-semibold leading-tight">
                          {row.label}
                          {realTerms && (row.key === "fv" || row.key === "mult") ? (
                            <span
                              className="rounded-sm border border-violet-500/30 bg-violet-500/10 px-1 py-px text-[9px] font-bold text-violet-700 dark:text-violet-300"
                              title="Deflated to 2026 dollars at 2.5%/yr"
                            >
                              2026$
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-muted-foreground">{row.hint}</p>
                      </div>
                      {displayEntries.map((m) => {
                        const isNa = row.na?.(m);
                        const isWin = win && win.listing.id === m.listing.id;
                        const rose = row.negativeRose?.(m);
                        const hypothetical = isWhatIf(m.listing.id);
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
                              // Amber wash on the hypothetical columns — the
                              // emerald winner highlight takes precedence.
                              hypothetical &&
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
                {realTerms ? (
                  <p className="flex items-center gap-1.5 text-[11.5px] text-violet-700 dark:text-violet-300">
                    <Coins className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Real-terms lens: the 2046 family is deflated to 2026
                    dollars at 2.5%/yr; rent and carry rows are already
                    current-year figures.
                  </p>
                ) : null}
                {whatIfs.length > 0 ? (
                  <p className="flex items-center gap-1.5 text-[11.5px] text-amber-700/90 dark:text-amber-300/80">
                    <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                    Amber columns are hypothetical entries — up to three at a
                    time, each underwritten with the same sheet, never live
                    listings.
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

/* ------------------------------------------------------------------ */
/* Portfolio equity-runway chart (round 14) — the aggregate value      */
/* path vs the aggregate amortizing balance, 2026→2046. The emerald    */
/* wedge between the curves is the equity build across the whole      */
/* shortlist. Pointer-tracked (crosshair) AND keyboard-tracked        */
/* (focus + ←/→ step years). The value path rides the real-terms      */
/* display layer; the debt path is contractual/nominal either way.    */
/* ------------------------------------------------------------------ */

interface RunwayPoint {
  year: number;
  value: number;
  debt: number;
  equity: number;
}

const RUNWAY_W = 600;
const RUNWAY_H = 76;
const RUNWAY_PAD = 3;

function PortfolioRunwayChart({
  series,
  depletionYear,
  realTerms,
  hoverT,
  onHoverT,
}: {
  series: RunwayPoint[];
  depletionYear: number | null;
  realTerms: boolean;
  hoverT: number | null;
  onHoverT: (t: number | null) => void;
}) {
  const hi = Math.max(...series.map((p) => p.value), 1);
  const xOf = (t: number) => (t / 20) * RUNWAY_W;
  const yOf = (v: number) =>
    RUNWAY_PAD +
    (RUNWAY_H - RUNWAY_PAD * 2) * (1 - Math.min(v, hi) / hi);

  const valuePts = series.map((p, t) => `${xOf(t).toFixed(1)},${yOf(p.value).toFixed(1)}`);
  const debtPts = series.map((p, t) => `${xOf(t).toFixed(1)},${yOf(p.debt).toFixed(1)}`);
  const valueLine = `M${valuePts.join(" L")}`;
  const debtLine = `M${debtPts.join(" L")}`;
  // The equity wedge: value path left→right, then debt path right→left.
  const wedge = `M${valuePts.join(" L")} L${[...debtPts].reverse().join(" L")} Z`;

  const terminal = series[20];
  const start = series[0];
  const hover = hoverT !== null ? series[hoverT] : null;
  const checkpoints = [0, 5, 10, 15, 20]
    .map((t) => `${series[t].year}: ${fmtCurrency(Math.round(series[t].equity), { compact: true })}`)
    .join("; ");

  const trackFromEvent = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const frac = (clientX - rect.left) / Math.max(1, rect.width);
    onHoverT(Math.min(20, Math.max(0, Math.round(frac * 20))));
  };

  return (
    <div className="mt-3 rounded-lg border bg-background/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp
            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          Equity runway · 2026→2046
          {realTerms ? (
            <span
              className="rounded-sm border border-violet-500/30 bg-violet-500/10 px-1 py-px text-[9px] font-bold text-violet-700 dark:text-violet-300"
              title="Value path deflated to 2026 dollars at 2.5%/yr — debt stays nominal"
            >
              2026$
            </span>
          ) : null}
        </p>
        <p className="text-[10.5px] text-muted-foreground tabular-nums">
          {fmtCurrency(Math.round(start.equity), { compact: true })} equity today →{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {fmtCurrency(Math.round(terminal.equity), { compact: true })}
          </span>{" "}
          at 2046
        </p>
      </div>

      <div
        role="img"
        aria-label={`Portfolio equity runway chart, 2026 to 2046. Equity at five-year checkpoints: ${checkpoints}. Focus and use left and right arrow keys to inspect individual years.`}
        tabIndex={0}
        className="relative mt-2 h-[76px] cursor-crosshair touch-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        onPointerMove={(e) => trackFromEvent(e.clientX, e.currentTarget)}
        onPointerLeave={() => onHoverT(null)}
        onBlur={() => onHoverT(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const dir = e.key === "ArrowLeft" ? -1 : 1;
            onHoverT(Math.min(20, Math.max(0, (hoverT ?? 20) + dir)));
          } else if (e.key === "Escape" || e.key === "Home" || e.key === "End") {
            if (e.key === "Home") onHoverT(0);
            else if (e.key === "End") onHoverT(20);
            else onHoverT(null);
          }
        }}
      >
        <svg
          viewBox={`0 0 ${RUNWAY_W} ${RUNWAY_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="port-runway-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          {/* equity wedge between the value and debt paths */}
          <path d={wedge} fill="url(#port-runway-grad)" />
          {/* aggregate amortizing balance (contractual, nominal) */}
          <path
            d={debtLine}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
          {/* aggregate value path (rides the real-terms display layer) */}
          <path
            d={valueLine}
            fill="none"
            stroke={realTerms ? "#8b5cf6" : "#10b981"}
            strokeWidth={2.25}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* terminal dot on the value path (HTML — stays a perfect circle) */}
        <span
          className="pointer-events-none absolute h-[7px] w-[7px] -translate-y-1/2 translate-x-[-3.5px] rounded-full ring-2 ring-background"
          style={{
            left: "100%",
            top: `${(yOf(terminal.value) / RUNWAY_H) * 100}%`,
            backgroundColor: realTerms ? "#8b5cf6" : "#10b981",
          }}
          aria-hidden
        />

        {/* blended raw-land depletion milestone */}
        {depletionYear !== null
          ? (() => {
              const t = Math.min(20, Math.max(1, depletionYear - 2026));
              const leftPct = (t / 20) * 100;
              return (
                <div
                  className="pointer-events-none absolute inset-y-0"
                  style={{ left: `${leftPct}%` }}
                  aria-hidden
                >
                  <div className="h-full border-l border-dashed border-amber-500/55" />
                  <span
                    className="absolute bottom-0.5 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap text-[9px] font-semibold text-amber-700 dark:text-amber-400"
                    style={{
                      left: 0,
                      transform: `translateX(${
                        leftPct < 10 ? -leftPct + 4 : leftPct > 90 ? -(leftPct - 96) : -50
                      }%)`,
                    }}
                  >
                    <Flame className="h-2.5 w-2.5" aria-hidden />
                    raw-land ~{depletionYear}
                  </span>
                </div>
              );
            })()
          : null}

        {/* hover guide + readout */}
        {hover && hoverT !== null ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25"
              style={{ left: `${(hoverT / 20) * 100}%` }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1.5 text-[10.5px] leading-snug shadow-sm"
              style={{
                left: `${Math.min(87, Math.max(13, (hoverT / 20) * 100))}%`,
              }}
            >
              <p className="font-semibold tabular-nums">
                {hover.year}
                {realTerms ? (
                  <span className="ml-1 text-[9px] font-bold uppercase text-violet-600 dark:text-violet-300">
                    2026$
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 tabular-nums text-muted-foreground">
                value{" "}
                <span className={realTerms ? "font-medium text-violet-600 dark:text-violet-300" : "font-medium text-emerald-600 dark:text-emerald-400"}>
                  {fmtCurrency(Math.round(hover.value), { compact: true })}
                </span>
              </p>
              <p className="tabular-nums text-muted-foreground">
                debt{" "}
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  {fmtCurrency(Math.round(hover.debt), { compact: true })}
                </span>
              </p>
              <p className="tabular-nums">
                equity{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmtCurrency(Math.round(hover.equity), { compact: true })}
                </span>
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-1.5 flex justify-between text-[9.5px] font-medium tabular-nums text-muted-foreground">
        {[2026, 2031, 2036, 2041, 2046].map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Each column compounds at its market&apos;s own CAGR
        {realTerms ? " (deflated to 2026$)" : ""} while its note amortizes at
        its own posture — land paper 35% down / 8.5%, improved product 20% down
        / 6.5%. Debt is contractual and stays nominal
        {realTerms ? " under the lens" : ""}; the wedge is the equity build.
      </p>
    </div>
  );
}
