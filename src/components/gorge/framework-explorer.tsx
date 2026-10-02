"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenText,
  Building2,
  Landmark,
  MapPin,
  Trees,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MicroLabel } from "./shared";

interface Framework {
  id: string;
  short: string;
  title: string;
  icon: LucideIcon;
  acres: string;
  tagline: string;
  description: string;
  supplyImpact: string;
  where: string;
}

const FRAMEWORKS: Framework[] = [
  {
    id: "act",
    short: "The 1986 Act",
    title: "Columbia River Gorge National Scenic Area Act (1986)",
    icon: Landmark,
    acres: "≈ 292,500 acres",
    tagline: "The federal overlay",
    description:
      "Congress created the CRGNSA to protect and enhance the scenic, cultural, natural, and recreational resources of the Gorge while supporting compatible economic growth. A 13-member bistate Commission (Oregon + Washington + USDA Forest Service + six counties + tribal interests) writes the Management Plan that every county in the corridor must implement through its land-use ordinances.",
    supplyImpact:
      "Every acre outside an urban area carries a federal-review layer on top of state and county rules — the single largest reason corridor land supply is structurally scarce and why entitlement inside UGB/UGA lines commands a premium.",
    where: "All 11 corridor jurisdictions sit inside the Scenic Area boundary.",
  },
  {
    id: "sma",
    short: "SMA",
    title: "Special Management Area",
    icon: Trees,
    acres: "≈ 115,000 acres",
    tagline: "The most restrictive tier",
    description:
      "The SMA hugs the immediate Columbia corridor: wetlands, streams, habitat, and the most visible riverfront benches. New residential development is heavily restricted, agricultural buildings face siting review, and any structure visible from Key Viewing Areas must meet strict color, reflectivity, and scale standards.",
    supplyImpact:
      "Effectively removes shoreline-adjacent land from the development ledger. Riverfront-parcel scarcity inside the corridor is a statutory condition, not a cyclical one.",
    where: "Riverfront benches near Cascade Locks, Stevenson, North Bonneville, Lyle, and Dallesport carry SMA overlays.",
  },
  {
    id: "gma",
    short: "GMA",
    title: "General Management Area",
    icon: BookOpenText,
    acres: "≈ 177,000 acres",
    tagline: "Resource-land emphasis",
    description:
      "The GMA governs the working landscape between towns: agriculture, forestry, and open space. New dwellings must be sited on the parcel portion least suitable for resource use and must satisfy visual-subordinance review — non-reflective materials, muted palettes, and screening from Key Viewing Areas.",
    supplyImpact:
      "Agricultural estates and vineyard compounds trade at premium multiples precisely because compliant homesites are scarce, permitted density is minimal, and each approved residence is effectively a final build-out event.",
    where: "The flagship GMA Agriculture estate listing in White Salmon is a textbook GMA review outcome.",
  },
  {
    id: "ugb",
    short: "UGB / UGA",
    title: "Urban Growth Boundaries & Urban Growth Areas",
    icon: Building2,
    acres: "11 urban enclaves",
    tagline: "Where building is actually allowed",
    description:
      "Oregon's Statewide Planning Goal 14 draws hard urban growth boundaries around Hood River, The Dalles, Cascade Locks, and Mosier — expansion requires a formal demonstration of need. Washington's GMA mirrors this with urban growth areas: White Salmon runs full city planning, while Bingen, Stevenson, and North Bonneville operate with partial-planning county overlays, and Dallesport, Lyle, and Wishram remain unincorporated UGAs.",
    supplyImpact:
      "This is the master scarcity dial: net buildable acreage is a fixed, auditable number per jurisdiction — the matrix quantifies exactly how many acres remain inside each line.",
    where: "The 11-jurisdiction Master Matrix tracks every UGB/UGA reserve in the corridor.",
  },
];

export function FrameworkExplorer() {
  const [selected, setSelected] = useState<string>("act");
  const active = FRAMEWORKS.find((f) => f.id === selected) ?? FRAMEWORKS[0];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <MicroLabel>Statutory Framework</MicroLabel>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
          One river, three regulatory lenses
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="tablist" aria-label="Regulatory frameworks">
        {FRAMEWORKS.map((f) => {
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
