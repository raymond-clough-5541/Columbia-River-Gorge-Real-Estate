"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  INSURANCE_RATE,
  POST_DEPLETION_CAGR,
  PROPERTY_TAX_RATES,
  RENTAL_RESERVE_RATE,
} from "@/lib/gorge";

/* ---------------------------------------------------------------- */
/* Methodology & sources — the audit trail behind every number on    */
/* the platform. Kept in one dialog so every workspace can link to   */
/* it without duplicating disclaimers.                                 */
/* ---------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-background p-3.5">
      <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
      <div className="mt-1.5 space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border bg-muted/50 px-2.5 py-1.5 font-mono text-[12px] text-foreground">
      {children}
    </p>
  );
}

function MethodologyBody() {
  return (
    <div className="thin-scroll max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <Section title="1 · Compound valuation">
        <Formula>FV = PV · (1 + r)ⁿ</Formula>
        <p>
          Every projection on the platform applies discrete annual
          compounding to a 2026 baseline band. Per-market growth rates
          (r) are scarcity-weighted: jurisdictions with tighter
          net-buildable inventories and earlier depletion dates carry
          higher corridor premiums.
        </p>
        <p>
          <strong className="text-foreground">Depletion-adjusted regime:</strong>{" "}
          when enabled, each market compounds at its full rate only until
          projected raw-land exhaustion, then cools to a{" "}
          {POST_DEPLETION_CAGR}% infill-replacement rate — the
          conservative case where scarcity pricing flattens once nothing
          remains to entitle.
        </p>
      </Section>

      <Section title="2 · Financing math">
        <Formula>M = P · i(1+i)ᴺ / ((1+i)ᴺ − 1)</Formula>
        <p>
          The Financing Lab amortizes a fully monthly note at rate i over
          N months; remaining balances use B = P·((1+i)ᴺ−(1+i)ⁿ)/((1+i)ᴺ−1).
          Carry stacks the note payment with state-blended property tax
          and a structure-value insurance heuristic:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            Property tax: {PROPERTY_TAX_RATES.OR.toFixed(2)}% effective
            (OR — Hood River/Wasco blends) vs {PROPERTY_TAX_RATES.WA.toFixed(2)}%
            (WA — Klickitat/Skamania blends)
          </li>
          <li>
            Insurance: {(INSURANCE_RATE * 100).toFixed(2)}% of structure
            value per year, excluded on unimproved land
          </li>
          <li>
            Land paper pre-loads 35% down at 8.5% APR — typical Gorge
            land-loan pricing
          </li>
        </ul>
      </Section>

      <Section title="3 · Income lens heuristics">
        <p>
          Market rent blends by product type: $1.35/sqft/mo single-family
          (tourism-adjacent premium), $1.05/sqft infill multi-family,
          $1.10/sqft luxury estates — which additionally stack an
          agricultural ground-lease at ≈$150/acre/yr on deed ground above
          2 acres. Net operating income applies a{" "}
          {(RENTAL_RESERVE_RATE * 100).toFixed(0)}% reserve for vacancy,
          maintenance, and management; cash-on-cash divides annual cash
          flow after the full note carry by the down stroke.
        </p>
      </Section>

      <Section title="4 · Comparable matching">
        <p>
          Submarket peers are ranked by normalized distance across four
          structural axes, weighted 45% appreciation rate, 25% baseline
          price, 15% land supply, and 15% depletion runway — so a
          &quot;comparable&quot; is a market that prices and scars
          similarly, not merely a geographic neighbor.
        </p>
      </Section>

      <Section title="5 · Data provenance & limitations">
        <p>
          Land-inventory figures (footprint, gross vacant, net buildable)
          are illustrative bands compiled from public CRGNSA land-use
          records, Oregon Goal 14 / Washington GMA urban-area documents,
          and corridor market surveys. Listing photography is
          AI-generated illustration, not photography of the specific
          parcels.
        </p>
        <p>
          Nothing here is investment advice: projections are compound
          arithmetic on stated assumptions, not forecasts. Verify
          entitlements, water rights, WUI mitigation requirements, and
          tax positions with counsel before transacting.
        </p>
      </Section>
    </div>
  );
}

/** Controlled dialog — for hosts that manage open state themselves. */
export function MethodologyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
            Methodology &amp; sources
          </DialogTitle>
          <DialogDescription>
            The formulas, blends, and heuristics behind every number on
            this platform — in the order they compound.
          </DialogDescription>
        </DialogHeader>
        <MethodologyBody />
      </DialogContent>
    </Dialog>
  );
}

/** Self-contained trigger button that owns its dialog state. */
export function MethodologyTrigger({
  label = "Methodology & sources",
  variant = "link",
  className,
}: {
  label?: string;
  /** "link" renders a quiet inline link; "button" a bordered control. */
  variant?: "link" | "button";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-1 rounded-sm",
          variant === "button"
            ? "h-8 rounded-md border bg-card px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.97]"
            : "text-[12px] font-medium text-muted-foreground underline decoration-dotted decoration-zinc-400 underline-offset-4 hover:text-foreground",
          className
        )}
      >
        {variant === "button" ? (
          <Info className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
        )}
        {label}
      </button>
      <MethodologyDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
