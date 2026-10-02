"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, ChevronDown, Info, Landmark, PiggyBank, Scale, SunSnow, Warehouse } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  INSURANCE_RATE,
  PROPERTY_TAX_RATES,
  RENTAL_RESERVE_RATE,
  estimateMarketRent,
  SEASONAL_RENT_BANDS,
  type RentSeasonality,
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

/** Investor rent postures applied on top of the market-rent heuristic. */
const RENT_POSTURES = [
  { id: "conservative", label: "Conservative", mult: 0.85 },
  { id: "base", label: "Base", mult: 1 },
  { id: "aggressive", label: "Aggressive", mult: 1.15 },
] as const;
type RentPosture = (typeof RENT_POSTURES)[number]["id"];

/** Seasonality band order for the segmented control (round 8-e). */
const SEASON_ORDER: RentSeasonality[] = ["lean", "annualized", "peak"];

export function FinancingLab({ listing }: { listing: PropertyListing }) {
  const isLand = listing.squareFeet === 0;
  const defaultDown = isLand ? 35 : 20;

  const [downPct, setDownPct] = useState(defaultDown);
  const [rate, setRate] = useState(isLand ? 8.5 : 6.5);
  const [term, setTerm] = useState<(typeof TERMS)[number]>(30);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [posture, setPosture] = useState<RentPosture>("base");
  const [seasonality, setSeasonality] = useState<RentSeasonality>("annualized");

  const state = listing.submarket?.state ?? "OR";
  const baseRent = useMemo(
    () => estimateMarketRent(listing, { seasonality }),
    [listing, seasonality]
  );
  const postureMult =
    RENT_POSTURES.find((p) => p.id === posture)?.mult ?? 1;

  const calc = useMemo(() => {
    const price = Math.max(1, listing.price);
    const down = (price * downPct) / 100;
    const loan = price - down;
    const pi = monthlyPayment(loan, rate, term);
    const taxMonthly = (price * PROPERTY_TAX_RATES[state]) / 100 / 12;
    const insMonthly = isLand ? 0 : (price * INSURANCE_RATE) / 12;
    const totalMonthly = pi + taxMonthly + insMonthly;
    const interest = totalInterest(loan, rate, term);

    // Income lens: gross rent (market heuristic × investor posture) → NOI
    // after an 8% operating reserve, then cash flow under the live note.
    const grossAnnual =
      (baseRent.dwelling * postureMult + baseRent.agriculture) * 12;
    const noi = grossAnnual * (1 - RENTAL_RESERVE_RATE);

    // 20-year equity runway: value compounds at the submarket CAGR while the
    // amortizing balance burns down — the classic Gorge leveraged hold.
    const cagr = listing.submarket?.projectedCagr ?? 5;
    const value2046 = futureValue(price, cagr, 20);
    const balance2046 = remainingBalance(loan, rate, term, 20 * 12);
    const equity2046 = value2046 - balance2046;
    const leverageMultiple =
      down > 0 && equity2046 > 0 ? equity2046 / down : 0;

    // Yearly amortization schedule + the note's "half-life": the first
    // year-end balance below 50% of the original note.
    const schedule: {
      year: number;
      principalY: number;
      interestY: number;
      cumInterest: number;
      balance: number;
      value: number;
      halfWay: boolean;
    }[] = [];
    let prev = loan;
    let cumInterest = 0;
    let halfLifeYear: number | null = null;
    for (let y = 1; y <= term; y++) {
      const balance = remainingBalance(loan, rate, term, y * 12);
      const principalY = prev - balance;
      const interestY = pi * 12 - principalY;
      cumInterest += interestY;
      const halfWay =
        halfLifeYear === null && balance <= loan / 2 && balance > 0;
      if (halfWay) halfLifeYear = y;
      schedule.push({
        year: 2026 + y,
        principalY,
        interestY,
        cumInterest,
        balance,
        value: futureValue(price, cagr, y),
        halfWay,
      });
      prev = balance;
    }

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
      schedule,
      halfLifeYear,
      income: {
        rentMonthly: baseRent.dwelling * postureMult + baseRent.agriculture,
        agMonthly: baseRent.agriculture,
        grossAnnual,
        noi,
        grossYield: (grossAnnual / price) * 100,
        noiYield: (noi / price) * 100,
        annualCarry: totalMonthly * 12,
        annualCashFlow: noi - totalMonthly * 12,
        cashOnCash: down > 0 ? (noi - totalMonthly * 12) / down : 0,
      },
    };
  }, [listing, listing.price, listing.submarket?.projectedCagr, downPct, rate, term, state, isLand, baseRent, postureMult]);

  const activeSeason = SEASONAL_RENT_BANDS[seasonality];

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

      {/* Income lens — rental stress-test */}
      {!isLand ? (
        <div className="mt-3 rounded-lg border bg-card p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-muted-foreground" aria-hidden />
              <MicroLabel>Income Lens · Rental Stress-Test</MicroLabel>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Seasonality band (round 8-e) — tourism-shaped demand */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Season
                </span>
                <div
                  role="radiogroup"
                  aria-label="Rent seasonality band"
                  className="flex rounded-md border bg-background p-0.5"
                >
                  {SEASON_ORDER.map((id) => {
                    const band = SEASONAL_RENT_BANDS[id];
                    const active = seasonality === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSeasonality(id)}
                        title={`${band.note} · rent × ${band.mult.toFixed(2)}`}
                        className={cn(
                          "h-6 rounded px-2 text-[11px] font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                          active
                            ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {band.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Investor posture on top of the market heuristic */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Posture
                </span>
                <div
                  role="radiogroup"
                  aria-label="Rent posture"
                  className="flex rounded-md border bg-background p-0.5"
                >
                  {RENT_POSTURES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={posture === p.id}
                      onClick={() => setPosture(p.id)}
                      title={`Market rent × ${p.mult.toFixed(2)}`}
                      className={cn(
                        "h-6 rounded px-2 text-[11px] font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                        posture === p.id
                          ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {seasonality !== "annualized" ? (
            <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
              <SunSnow className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
              {activeSeason.label} band — {activeSeason.note} (rent ×{" "}
              {activeSeason.mult.toFixed(2)}).
            </p>
          ) : null}

          <div className="mt-2.5 flex items-baseline justify-between gap-3 border-b border-border/60 pb-2.5">
            <span className="text-[12px] text-muted-foreground">
              Est. market rent
              <span className="ml-1.5 text-[10.5px] opacity-70">({baseRent.note})</span>
            </span>
            <span className="text-[15px] font-semibold tabular-nums">
              {fmtCurrency(Math.round(calc.income.rentMonthly))}
              <span className="text-[11px] font-normal text-muted-foreground">/mo</span>
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: "Gross yield",
                value: fmtPct(calc.income.grossYield),
                sub: "rent ÷ price",
                tone: "default" as const,
              },
              {
                label: "NOI yield",
                value: fmtPct(calc.income.noiYield),
                sub: `after ${fmtPct(RENTAL_RESERVE_RATE * 100, 0)} reserve`,
                tone: calc.income.noiYield >= rate ? ("emerald" as const) : ("default" as const),
              },
              {
                label: "Annual cash flow",
                value: fmtCurrency(Math.round(calc.income.annualCashFlow), { compact: true }),
                sub: "NOI − note carry",
                tone: calc.income.annualCashFlow >= 0 ? ("emerald" as const) : ("rose" as const),
              },
              {
                label: "Cash-on-cash",
                value: `${calc.income.cashOnCash >= 0 ? "" : "−"}${Math.abs(calc.income.cashOnCash * 100).toFixed(1)}%`,
                sub: "on the down stroke",
                tone: calc.income.cashOnCash >= 0 ? ("emerald" as const) : ("rose" as const),
              },
            ].map((m) => (
              <div
                key={m.label}
                className={cn(
                  "rounded-md border bg-background p-2.5 text-center",
                  m.tone === "emerald" && "border-emerald-500/30 bg-emerald-500/[0.05]",
                  m.tone === "rose" && "border-rose-500/30 bg-rose-500/[0.05]"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[13.5px] font-semibold tabular-nums",
                    m.tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
                    m.tone === "rose" && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {m.value}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{m.sub}</p>
              </div>
            ))}
          </div>

          <p className="mt-2.5 border-t border-border/60 pt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            {calc.income.annualCashFlow >= 0 ? (
              <>
                At {fmtPct(calc.income.noiYield)} NOI yield vs a {fmtPct(rate, 2)} note,
                the property carries itself —{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmtCurrency(Math.round(calc.income.annualCashFlow), { compact: true })} / yr
                </span>{" "}
                of cash left after the full monthly stack.
              </>
            ) : (
              <>
                Negative leverage: the {fmtPct(rate, 2)} note outruns the{" "}
                {fmtPct(calc.income.noiYield)} NOI yield by{" "}
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {fmtCurrency(Math.round(-calc.income.annualCashFlow), { compact: true })} / yr
                </span>{" "}
                — the bet rests on the {fmtPct(calc.cagr)} appreciation engine, not rent.
              </>
            )}
          </p>
        </div>
      ) : null}

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

      {/* Amortization schedule — collapsible deep dive */}
      <div className="mt-3 overflow-hidden rounded-lg border bg-card">
        <button
          type="button"
          onClick={() => setScheduleOpen((v) => !v)}
          aria-expanded={scheduleOpen}
          className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-accent/50"
        >
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Amortization schedule
            </span>
          </span>
          <span className="flex items-center gap-2.5">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {calc.halfLifeYear !== null
                ? `balance crosses 50% of note in ${calc.halfLifeYear}`
                : `${term}-yr note`}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                scheduleOpen && "rotate-180"
              )}
              aria-hidden
            />
          </span>
        </button>

        {scheduleOpen ? (
          <div className="border-t px-3.5 pb-4 pt-3.5">
            {/* Crossover chart: appreciating value vs amortizing balance */}
            <div className="h-[170px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={calc.schedule}
                  margin={{ top: 5, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10.5 }}
                    tickLine={false}
                    axisLine={{ strokeWidth: 0 }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10.5 }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) =>
                      fmtCurrency(v, { compact: true })
                    }
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                    formatter={(value: number, name: string) => [
                      fmtCurrency(value),
                      name === "value"
                        ? "Market value"
                        : "Loan balance",
                    ]}
                    labelFormatter={(y) => `${y}`}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                      color: "var(--popover-foreground)",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={(d: { balance: number }) =>
                      Math.round(d.balance)
                    }
                    stroke="#a1a1aa"
                    strokeWidth={1.75}
                    strokeDasharray="5 4"
                    dot={false}
                    name="balance"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={(d: { value: number }) => Math.round(d.value)}
                    stroke="#10b981"
                    strokeWidth={2.25}
                    dot={false}
                    name="value"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[10.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded bg-emerald-500" aria-hidden />
                Value at {fmtPct(calc.cagr)} market CAGR
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-0.5 w-4 rounded bg-zinc-400"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, #a1a1aa 0 5px, transparent 5px 9px)",
                  }}
                  aria-hidden
                />
                Amortizing balance
              </span>
              <span className="ml-auto italic">
                the widening wedge is the equity build
              </span>
            </p>

            {/* Yearly table */}
            <div className="thin-scroll mt-3 max-h-64 overflow-y-auto rounded-md border">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2.5 py-2 text-left font-semibold">Year</th>
                    <th className="px-2.5 py-2 text-right font-semibold">
                      Principal
                    </th>
                    <th className="px-2.5 py-2 text-right font-semibold">
                      Interest
                    </th>
                    <th className="px-2.5 py-2 text-right font-semibold">
                      Cum. interest
                    </th>
                    <th className="px-2.5 py-2 text-right font-semibold">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {calc.schedule.map((row) => (
                    <tr
                      key={row.year}
                      className={cn(
                        "border-t transition-colors hover:bg-muted/40",
                        row.halfWay && "bg-emerald-500/[0.07]"
                      )}
                    >
                      <td className="px-2.5 py-1.5 text-left font-medium">
                        {row.year}
                        {row.halfWay ? (
                          <span className="ml-1.5 rounded-sm bg-emerald-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            half-way
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-emerald-700 dark:text-emerald-400">
                        {fmtCurrency(Math.round(row.principalY))}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-rose-600 dark:text-rose-400">
                        {fmtCurrency(Math.round(row.interestY))}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-muted-foreground">
                        {fmtCurrency(Math.round(row.cumInterest))}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-medium">
                        {row.balance > 0
                          ? fmtCurrency(Math.round(row.balance))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
              Principal &amp; interest only — taxes, insurance, and any WUI
              riders stack on top. The interest column front-loads hard in
              the early years; extra principal payments attack it directly.
            </p>
          </div>
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
