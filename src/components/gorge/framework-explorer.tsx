"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MicroLabel } from "./shared";
import type { FrameworkLens } from "@/lib/region-content";

export function FrameworkExplorer({
  frameworks,
}: {
  /** Region-specific statutory lenses (round 15 — corridor, Puget, …). */
  frameworks: FrameworkLens[];
}) {
  const [selected, setSelected] = useState<string>(frameworks[0]?.id ?? "");
  const active = frameworks.find((f) => f.id === selected) ?? frameworks[0];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <MicroLabel>Statutory Framework</MicroLabel>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
          One geography, stacked regulatory lenses
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="tablist" aria-label="Regulatory frameworks">
        {frameworks.map((f) => {
          const isActive = f.id === selected;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(f.id)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-md dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950"
                  : "bg-background hover:border-zinc-400 hover:shadow-sm dark:hover:border-zinc-600"
              )}
            >
              <f.icon className="h-5 w-5" aria-hidden />
              <span className="text-sm font-semibold leading-tight">
                {f.short}
              </span>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  isActive ? "opacity-80" : "text-muted-foreground"
                )}
              >
                {f.acres}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-4 rounded-lg border bg-background p-5"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-[15px] font-semibold tracking-tight">
              {active.title}
            </h4>
            <span className="rounded-sm border bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {active.tagline}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {active.description}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                Land-supply consequence
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {active.supplyImpact}
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-md border p-3.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {active.where}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
