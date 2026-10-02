"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Calculator, Landmark, Wallet } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { fmtCurrency, fmtPct } from "@/lib/gorge";
import { MicroLabel } from "./shared";

/* Oregon 2025 single-filer progressive brackets + std deduction (illustrative). */
const OR_STD_DEDUCTION = 2800;
const OR_BRACKETS = [
  { upTo: 4300, rate: 0.0475 },
  { upTo: 10750, rate: 0.0675 },
  { upTo: 125000, rate: 0.0875 },
  { upTo: Infinity, rate: 0.099 },
];

function orIncomeTax(income: number): number {
  const taxable = Math.max(0, income - OR_STD_DEDUCTION);
  let tax = 0;
  let lower = 0;
  for (const b of OR_BRACKETS) {
    if (taxable > lower) {
      const slice = Math.min(taxable, b.upTo) - lower;
      tax += slice * b.rate;
      lower = b.upTo;
    } else break;
  }
  return tax;
}

const CROSSINGS = [
  {
    wa: "Dallesport",
    or: "The Dalles",
    bridge: "The Dalles Bridge · US-197",
    time: "≈ 4 min",
    note: "Zero-income-tax residency against the corridor's deepest OR job market.",
  },
  {
    wa: "White Salmon",
    or: "Hood River",
    bridge: "Hood River–White Salmon Bridge",
    time: "≈ 9 min",
    note: "View-parity living without Oregon's 8.75–9.9% wage bracket.",
  },
];

export function ArbitrageSpotlight() {
  const [income, setIncome] = useState(140000);
  const [cagr, setCagr] = useState(5.0);

  const calc = useMemo(() => {
    const orTax = orIncomeTax(income);
    const annualSaving = orTax;
    const compounded = annualSaving * Math.pow(1 + cagr / 100, 20);
    const effectiveRate = income > 0 ? (orTax / income) * 100 : 0;
    return { orTax, annualSaving, compounded, effectiveRate };
  }, [income, cagr]);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Two-sided tax comparison */}
      <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
        <MicroLabel>State Arbitrage</MicroLabel>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
          Two states, one labor shed
        </h3>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-teal-500/30 bg-teal-500/[0.06] p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden />
                Washington
              </span>
              <span className="text-xl font-semibold tabular-nums text-teal-600 dark:text-teal-400">
                0.0%
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              No personal income tax on wages. Gorge-side residents keep every
              dollar of salary earned from Washington-source or remote work.
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                Oregon
              </span>
              <span className="text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                9.9%
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Progressive brackets up to 9.9% on income above $125k. No sales
              tax statewide — the mirror-image trade to Washington's ≈8%
              combined rate.
            </p>
            <div className="mt-3 space-y-1 border-t border-amber-500/20 pt-3 text-[11px] tabular-nums text-muted-foreground">
              <div className="flex justify-between"><span>First $4,300</span><span>4.75%</span></div>
              <div className="flex justify-between"><span>$4,300 – $10,750</span><span>6.75%</span></div>
              <div className="flex justify-between"><span>$10,750 – $125,000</span><span>8.75%</span></div>
              <div className="flex justify-between"><span>Above $125,000</span><span>9.9%</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" aria-hidden />
          <MicroLabel>Residency Arbitrage Calculator</MicroLabel>
        </div>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
          What the income-tax spread is worth, compounded
        </h3>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="arb-income" className="text-[13px] text-muted-foreground">
                Household income
              </label>
              <span className="text-sm font-semibold tabular-nums">
                {fmtCurrency(income)}
              </span>
            </div>
            <Slider
              id="arb-income"
              value={[income]}
              onValueChange={(v) => setIncome(v[0])}
              min={60000}
              max={600000}
              step={5000}
              aria-label="Household income"
            />
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="arb-cagr" className="text-[13px] text-muted-foreground">
                Reinvestment CAGR
              </label>
              <span className="text-sm font-semibold tabular-nums">
                {fmtPct(cagr)}
              </span>
            </div>
            <Slider
              id="arb-cagr"
              value={[cagr]}
              onValueChange={(v) => setCagr(v[0])}
              min={3}
              max={8}
              step={0.1}
              aria-label="Reinvestment CAGR"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              OR estimated tax / yr
            </p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {fmtCurrency(calc.orTax)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              eff. {fmtPct(calc.effectiveRate)} · single filer
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              WA income tax / yr
            </p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-teal-600 dark:text-teal-400">
              $0
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              wages + passive income
            </p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
              20-yr compounded spread
            </p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(calc.compounded, { compact: true })}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              {fmtCurrency(calc.annualSaving)} / yr reinvested at {fmtPct(cagr)}
            </p>
          </div>
        </div>

        {/* Cross-river pairs */}
        <div className="mt-6 border-t pt-4">
          <MicroLabel>Cross-River Commuting Pairs</MicroLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {CROSSINGS.map((c) => (
              <div
                key={c.bridge}
                className="flex items-center gap-3 rounded-lg border bg-background p-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <ArrowLeftRight className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1 text-[13px] font-semibold">
                    {c.wa}
                    <span className="text-muted-foreground">· WA</span>
                    <span className="text-muted-foreground">⟷</span>
                    {c.or}
                    <span className="text-muted-foreground">· OR</span>
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {c.bridge} · {c.time}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                    {c.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          <Wallet className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
          Wages earned physically inside Oregon remain Oregon-source income even
          for Washington residents — the clean arbitrage applies to retirement,
          investment, remote-work, and Washington-source income. Bracket math is
          illustrative (2025 single filer, standard deduction).
        </p>
      </div>
    </div>
  );
}
