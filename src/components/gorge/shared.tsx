"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  CAGR_TIER_STYLES,
  cagrTier,
  fmtPct,
  type StateCode,
} from "@/lib/gorge";
import { Flame, TrendingUp, type LucideIcon } from "lucide-react";

/* ---------------------------------------------------------------- */
/* Typography primitives                                             */
/* ---------------------------------------------------------------- */

export function MicroLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        <MicroLabel>{eyebrow}</MicroLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Badges                                                            */
/* ---------------------------------------------------------------- */

export function StateBadge({
  state,
  className,
}: {
  state: StateCode;
  className?: string;
}) {
  const isOR = state === "OR";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold tracking-widest",
        isOR
          ? "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-teal-600/30 bg-teal-500/10 text-teal-700 dark:text-teal-400",
        className
      )}
      title={isOR ? "Oregon — Goal 14 land-use system" : "Washington — GMA land-use system"}
    >
      {state}
    </span>
  );
}

export function CagrBadge({
  cagr,
  className,
  showTier = true,
}: {
  cagr: number;
  className?: string;
  showTier?: boolean;
}) {
  const tier = cagrTier(cagr);
  const style = CAGR_TIER_STYLES[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        style.className,
        className
      )}
    >
      <TrendingUp className="h-3 w-3" aria-hidden />
      {fmtPct(cagr)}
      {showTier ? (
        <span className="font-medium opacity-70">· {style.label}</span>
      ) : null}
    </span>
  );
}

export function DepletionBadge({
  year,
  className,
}: {
  year: number;
  className?: string;
}) {
  const yearsLeft = year - 2026;
  const imminent = yearsLeft <= 8;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        imminent
          ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className
      )}
      title={`Estimated terminal raw-land depletion in ${year}`}
    >
      <Flame className="h-3 w-3" aria-hidden />
      {year}
    </span>
  );
}

export function FrameworkBadge({
  framework,
  className,
}: {
  framework: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        className
      )}
    >
      {framework}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* KPI stat card                                                     */
/* ---------------------------------------------------------------- */

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  footer,
  accent = "default",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  footer?: ReactNode;
  accent?: "default" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  const accentRing: Record<string, string> = {
    default: "text-muted-foreground bg-muted",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
  };
  return (
    <div
      className={cn(
        "group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <MicroLabel>{label}</MicroLabel>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            accentRing[accent]
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums md:text-[28px]">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-[13px] text-muted-foreground">{sub}</div>
      ) : null}
      {footer ? <div className="mt-3 border-t pt-3">{footer}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Misc                                                              */
/* ---------------------------------------------------------------- */

export function DataBand({
  min,
  max,
  format,
  className,
}: {
  min: number;
  max: number;
  format: (v: number) => string;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {format(min)}
      <span className="mx-0.5 text-muted-foreground">–</span>
      {format(max)}
    </span>
  );
}

export function KeyStatRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-[13px] text-muted-foreground" title={hint}>
        {label}
      </span>
      <span className="text-right text-[13px] font-medium tabular-nums">
        {value}
      </span>
    </div>
  );
}
