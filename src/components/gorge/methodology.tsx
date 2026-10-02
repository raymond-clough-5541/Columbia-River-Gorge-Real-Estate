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
  REAL_TERMS_INFLATION,
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
        <p>
          <strong className="text-foreground">Real 2026 dollars (round 10):</strong>{" "}
          the real-terms lens deflates every curve back into start-year
          purchasing power at the configurable inflation assumption:
        </p>
        <Formula>Real FV = FV / (1 + i)ⁿ · real r = (1 + r)/(1 + i) − 1</Formula>
        <p>
          A 4.7% nominal run at a 2.5% deflator is a 2.1% real run — the
          lens composes with the depletion regime (the nominal path is
          computed first, then deflated), and it rides through saved
          scenarios and share links as the <span className="font-mono">v</span>/
          <span className="font-mono">i</span> hash params.
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
        <p>
          <strong className="text-foreground">2026$ lens (round 13):</strong>{" "}
          the Financing Lab's real-terms toggle deflates the equity-runway
          family (2046 value, equity, return-of-equity multiple, the
          schedule's value column) at the shared fixed{" "}
          {REAL_TERMS_INFLATION}% deflator, while the loan balance stays
          contractual nominal dollars — equity under the lens is real value
          minus nominal debt, the honest purchasing-power read. The
          adjustable deflator slider remains exclusive to the Projections
          workspace.
        </p>
      </Section>

      <Section title="3 · Income lens heuristics">
        <p>
          Market rent blends by product type: $1.35/sqft/mo single-family
          (tourism-adjacent premium), $1.05/sqft infill multi-family,
          $1.10/sqft luxury estates — each base rate is then indexed by the
          micro-market&apos;s price tier (baseline ÷ $450k corridor anchor,
          clamped to −15%…+25%), so the same floor plan pencils richer in
          Hood River than in Wishram. Luxury estates additionally stack an
          agricultural ground-lease at ≈$150/acre/yr on deed ground above
          2 acres. Net operating income applies a{" "}
          {(RENTAL_RESERVE_RATE * 100).toFixed(0)}% reserve for vacancy,
          maintenance, and management; cash-on-cash divides annual cash
          flow after the full note carry by the down stroke.
        </p>
        <p>
          <strong className="text-foreground">Seasonality band:</strong> the
          Gorge rental market is tourism-shaped — windsurfing, mountain
          biking, and harvest demand concentrate Jun–Sep while winter
          tenancy discounts. The Financing Lab therefore lets the rent
          heuristic run in one of three corridor-wide bands: Lean ×0.88
          (winter-weighted tenancy, Nov–Mar), Annualized ×1.00 (full-year
          blended lease, the default everywhere else on the platform), and
          Peak ×1.15 (summer short-term-rental premium net of shoulder
          vacancy). The band multiplies the market-indexed base rate before
          the investor posture and the operating reserve are applied.
        </p>
      </Section>

      <Section title="4 · Watchlist comparison sheet">
        <p>
          Starred listings are underwritten on a standard sheet — 20% down
          at 6.5% over 30 years (land paper: 35% at 8.5%) — with the base
          rent posture and the 8% operating reserve. Emerald highlights the
          best-in-class value per metric row (ties suppress the highlight);
          rose marks negative cash-flow family rows. The income pick and the
          appreciation pick are computed independently, and diverge whenever
          the best cash-flow listing is not the strongest compounding market.
        </p>
        <p>
          <strong className="text-foreground">What-if entries:</strong> the
          sheet can underwrite up to three hypothetical listings at a time
          alongside the real stars — entry vs premium price points, or a
          land pencil against improved product. Each flows through the
          identical underwriting posture and can win rows and verdict
          picks — the amber columns are pencils, not parcels. The starred
          set itself exports to a self-describing JSON document; restores
          open a preview that lists every listing in the file (with
          known-vs-unknown status) before anything is written, and ids the
          inventory no longer knows are skipped with a note rather than
          silently dropped.
        </p>
        <p>
          <strong className="text-foreground">Portfolio strip (round 11):</strong>{" "}
          the sheet also reads the whole shortlist as one position —
          purchase price, down stroke, and monthly carry summed per entry at
          each one&apos;s own sheet posture. The 2046 equity is the
          portfolio&apos;s compounded value minus every remaining note
          balance after 240 on-time months (B = P·((1+i)ᴺ−(1+i)ⁿ)/((1+i)ᴺ−1)),
          and the leverage multiple divides that equity by the total down
          stroke. The sheet&apos;s 2026$ lens (violet) deflates the same
          2046 family the Projections workspace deflates — fixed at 2.5%/yr
          there, adjustable on the Projections side — while rent and carry
          rows stay current-year figures.
        </p>
      </Section>

      <Section title="5 · Comparable matching">
        <p>
          Submarket peers are ranked by normalized distance across four
          structural axes, weighted 45% appreciation rate, 25% baseline
          price, 15% land supply, and 15% depletion runway — so a
          &quot;comparable&quot; is a market that prices and scars
          similarly, not merely a geographic neighbor.
        </p>
        <p>
          <strong className="text-foreground">Pinned-set aggregates</strong>
          (Master Matrix) sum the net-buildable midpoints of the pinned
          jurisdictions, average their growth rates arithmetically, and
          compound that blend over the full 2026–2046 horizon — an honest
          first-order sketch of the pinned corridor slice, not a
          portfolio-weighted forecast. The pinned set also serializes to a
          share link that preloads Projections with the same markets.
          The corridor-map timeline readouts apply the same per-market
          compounding at the scrub year, with spent markets contributing
          zero remaining reserve; the state split further partitions that
          live reserve between Oregon and Washington at the scrub year.
        </p>
      </Section>

      <Section title="6 · Data provenance & limitations">
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

      <Section title="7 · Expansion registry (round 13)">
        <p>
          <strong className="text-foreground">One codebase, N regulated markets.</strong>{" "}
          The Regions workspace renders the rollout plan as data: a
          <span className="font-mono"> Region </span> registry table
          (18 rows — the corridor live, seven PNW scaffolds, six USA
          planned, four Canada research) keyed to submarkets by
          <span className="font-mono"> region_id</span>. Each new market
          is a seed migration plus region-authored narratives — never a
          code fork; a subdomain per market is granted only at proven
          organic traction.
        </p>
        <p>
          Registry rows for waves 1–3 are directional planning content:
          the scarcity hook names the binding regime (GMA UGAs, Goal 14,
          TRPA thresholds, the ALR, CPTAQ…) and the tax-arbitrage note
          names the border pair the calculator will quantify once that
          region's ledger is researched. Every launch is gated on CI +
          the ui-audit/security-audit workflows + LIVE agent-browser QA
          of the new region's workspaces (the launch runbook in each
          region's dossier mirrors <span className="font-mono">docs/EXPANSION-PLAN.md §7</span>).
        </p>
      </Section>

      <Section title="8 · Aggregate curves & the runway chart (round 14)">
        <p>
          <strong className="text-foreground">Portfolios underwrite per entry, never at one blanket rate.</strong>{" "}
          The compare sheet&apos;s equity-runway chart aggregates two paths
          across the whole shortlist: the value path compounds each
          column at its own market CAGR (deflated to 2026$ when the lens
          is on), while the debt path amortizes each note at its own
          posture — land paper 35% down / 8.5%, improved product 20% down
          / 6.5%. The wedge between the curves is the equity build; the
          dashed amber milestone marks the price-weighted average
          raw-land depletion year of the mix.
        </p>
        <p>
          The live region card&apos;s corridor composite indexes every
          attached market to 100 at 2026 and averages their
          depletion-adjusted curves — each market compounds at its own
          CAGR until its depletion year, then cools to the 2.5%
          post-depletion replacement rate — so the visible bend in the
          line is the corridor&apos;s blended scarcity, not an input. The
          amortization schedule prints with repeated header rows and a
          self-contained posture block (which note, which rate, when
          generated) for paper dossiers.
        </p>
      </Section>

      <Section title="9 · Multi-region ledgers (round 15)">
        <p>
          <strong className="text-foreground">One engine, one registry, many regions.</strong>{" "}
          Region-scoped routes (<span className="font-mono text-[11.5px]">#/r/&lt;slug&gt;/matrix</span> …)
          scope every workspace — matrix, projections, listings,
          submarket profiles — to one registry region. Bare routes keep
          meaning the corridor, so every share link minted before the
          region switch still resolves. All per-region aggregates
          (medians, mean CAGR, depletion window, OR/WA and county splits)
          are computed from that region&apos;s rows only; a second live
          region never blends into another&apos;s ledger.
        </p>
        <p>
          The Puget Sound ledger (round 15&apos;s first live PNW region)
          carries two region-calibrated inputs:{" "}
          <strong className="text-foreground">property tax</strong> uses
          county-level effective blends (King 0.90%, Kitsap 0.85%) in
          place of the Gorge-county state blends, and the rent heuristic
          stays corridor-anchored with its market index{" "}
          <strong className="text-foreground">capped at +25%</strong> —
          deliberately conservative for King County&apos;s $875k–$1.65M
          baselines until a per-region rent calibration lands.
          Comparables and palette searches are region-scoped; the
          depletion-adjusted and real-terms lenses apply unchanged
          because they are properties of each market row, not of the
          region.
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
        data-methodology-trigger
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
