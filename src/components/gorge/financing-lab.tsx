"use client";

import { useMemo, useState } from "react";
import { Calculator, Info, Landmark, PiggyBank } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  INSURANCE_RATE,
  PROPERTY_TAX_RATES,
  fmtCurrency,
  fmtPct,
  futureValue,
  monthlyPayment,
  remainingBalance,
  totalInterest,
  type PropertyListing,
} from "@/lib/gorge";
import { MicroLabel } from "./shared";

/* ---------------------------------------------------------------- */
/* Financing Lab — amortized mortgage + carry-cost calculator         */
/* embedded in every listing dossier.                                 */
/* ---------------------------------------------------------------- */

const TERMS = [15, 20, 30] as const;

export function FinancingLab({ listing }: { listing: PropertyListing }) {
  const isLand = listing.squareFeet === 0;
  const defaultDown = isLand ? 35 : 20;

  const [downPct, setDownPct] = useState(defaultDown);
  const [rate, setRate] = useState(isLand ? 8.5 : 6.5);
  const [term, setTerm] = useState<(typeof TERMS)[number]>(30);

  const state = listing.submarket?.state ?? "OR";

  const calc = useMemo(() => {
    const price = Math.max(1, listing.price);
    const down = (price * downPct) / 100;
    const loan = price - down;
    const pi = monthlyPayment(loan, rate, term);
    const taxMonthly = (price * PROPERTY_TAX_RATES[state]) / 100 / 12;
    const insMonthly = isLand ? 0 : (price * INSURANCE_RATE) / 12;
    const totalMonthly = pi + taxMonthly + insMonthly;
    const interest = totalInterest(loan, rate, term);

    // 20-year equity runway: value compounds at the submarket CAGR while the
    // amortizing balance burns down — the classic Gorge leveraged hold.
    const cagr = listing.submarket?.projectedCagr ?? 5;
    const value2046 = futureValue(price, cagr, 20);
    const balance2046 = remainingBalance(loan, rate, term, 20 * 12);
    const equity2046 = value2046 - balance2046;
    const leverageMultiple =
      down > 0 && equity2046 > 0 ? equity2046 / down : 0;

    return {
      down,
      loan,
      pi,
      taxMonthly,
      insMonthly,
      totalMonthly,
      interest,
      value2046,
      balance2046,
      equity2046,
      leverageMultiple,
      cagr,
    };
  }, [listing.price, listing.submarket?.projectedCagr, downPct, rate, term, state, isLand]);

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" aria-hidden />
          <MicroLabel>Financing Lab</MicroLabel>
        </div>
        <span className="rounded-sm border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {state === "WA" ? "WA carry costs" : "OR carry costs"}
        </span>
      </div>

      {isLand ? (
        <p className="mt-2.5 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.07] p-2.5 text-[12px] leading-relaxed text-amber-700 dark:text-amber-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Raw-land paper: Gorge lenders typically demand 30–50% down on
          shorter amortizations — the lab pre-loads 35% down at 8.5% to
          reflect land-loan pricing.
        </p>
      ) : null}

      {/* Inputs */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="fin-down" className="text-[12px] text-muted-foreground">
              Down payment
            </label>
            <span className="text-[12.5px] font-semibold tabular-nums">
              {downPct}% · {fmtCurrency(calc.down, { compact: true })}
            </span>
          </div>
          <Slider
            id="fin-down"
            value={[downPct]}
            onValueChange={(v) => setDownPct(v[0])}
            min={5}
            max={75}
            step={1}
            aria-label="Down payment percent"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="fin-rate" className="text-[12px] text-muted-foreground">
              Rate · APR
            </label>
            <span className="text-[12.5px] font-semibold tabular-nums">
              {fmtPct(rate, 2)}
            </span>
          </div>
          <Slider
            id="fin-rate"
            value={[rate]}
            onValueChange={(v) => setRate(v[0])}
            min={3}
            max={12}
            step={0.125}
            aria-label="Interest rate"
          />
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-muted-foreground">Term</span>
        {TERMS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTerm(t)}
            aria-pressed={term === t}
            className={cn(
              "h-7 rounded-md border px-3 text-[12px] font-semibold tabular-nums transition-all active:scale-[0.97]",
              term === t
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950"
                : "bg-background text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-600"
            )}
          >
            {t} yr
          </button>
        ))}
      </div>

      {/* Monthly stack */}
      <div className="mt-4 rounded-lg border bg-card p-3.5">
        <div className="flex items-baseline justify-between border-b border-border/60 pb-2.5">
          <span className="text-[13px] font-semibold">Monthly carry</span>
          <span className="text-xl font-semibold tabular-nums">
            {fmtCurrency(Math.round(calc.totalMonthly))}
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            {
              label: "Principal & interest",
              value: fmtCurrency(Math.round(calc.pi)),
              note: `${fmtCurrency(calc.loan, { compact: true })} note`,
            },
            {
              label: `Property tax · ${fmtPct(PROPERTY_TAX_RATES[state], 2)} eff.`,
              value: fmtCurrency(Math.round(calc.taxMonthly)),
              note: `${state === "WA" ? "Klickitat/Skamania" : "HR/Wasco"} blend`,
            },
            {
              label: "Insurance",
              value: calc.insMonthly > 0 ? fmtCurrency(Math.round(calc.insMonthly)) : "—",
              note: isLand ? "n/a on unimproved land" : "structure heuristic",
            },
          ].map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] text-muted-foreground">
                {row.label}
                <span className="ml-1.5 text-[10.5px] opacity-70">({row.note})</span>
              </span>
              <span className="text-[12.5px] font-medium tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-border/60 pt-2.5 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5" aria-hidden />
            Lifetime interest · full {term}-yr note
          </span>
          <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
            {fmtCurrency(Math.round(calc.interest), { compact: true })}
          </span>
        </div>
      </div>

      {/* 2046 equity runway */}
      <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-3.5">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <MicroLabel className="text-emerald-700 dark:text-emerald-300">
            20-Year Equity Runway · {listing.submarket?.name ?? "corridor"} CAGR {fmtPct(calc.cagr)}
          </MicroLabel>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              Value 2046
            </p>
            <p className="mt-0.5 text-[13.5px] font-semibold tabular-nums">
              {fmtCurrency(calc.value2046, { compact: true })}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              Loan balance
            </p>
            <p className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-muted-foreground">
              −{fmtCurrency(calc.balance2046, { compact: true })}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              Equity
            </p>
            <p className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(calc.equity2046, { compact: true })}
            </p>
          </div>
        </div>
        {calc.leverageMultiple > 0 ? (
          <p className="mt-2.5 border-t border-emerald-500/20 pt-2.5 text-[12px] leading-relaxed text-muted-foreground">
            On a {fmtCurrency(calc.down, { compact: true })} down stroke, that is a{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {calc.leverageMultiple.toFixed(1)}× return of equity
            </span>{" "}
            — appreciation accrues to the levered position while the note
            amortizes.
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Estimates only — tax blends approximate Gorge county effective rates;
        insurance heuristics exclude flood/WUI riders. Verify carry with a
        local lender.
      </p>
    </div>
  );
}
