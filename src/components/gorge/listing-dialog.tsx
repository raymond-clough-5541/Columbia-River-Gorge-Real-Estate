"use client";

import Image from "next/image";
import { Bath, BedDouble, Ruler, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fmtAcres,
  fmtCurrency,
  fmtPct,
  futureValue,
  type PropertyListing,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";
import { KeyStatRow, MicroLabel, StateBadge } from "./shared";

export function ListingDialog({
  listing,
  open,
  onOpenChange,
  navigate,
}: {
  listing: PropertyListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigate: NavigateFn;
}) {
  if (!listing) return null;
  const sm = listing.submarket;
  const proj2046 =
    sm && listing.price > 0
      ? futureValue(listing.price, sm.projectedCagr, 20)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="thin-scroll max-h-[92vh] w-full overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-8 text-xl leading-tight tracking-tight">
            {listing.title}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            {sm ? (
              <>
                <span className="text-[13px] font-medium text-foreground">
                  {sm.name}
                </span>
                <StateBadge state={sm.state} />
                <span className="text-[13px]">{sm.county}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-1">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border">
            <Image
              src={listing.imageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
            <span className="absolute bottom-3 left-3 rounded-lg bg-zinc-950/80 px-3 py-1.5 text-xl font-semibold tabular-nums text-white backdrop-blur-sm">
              {fmtCurrency(listing.price)}
            </span>
            {listing.status !== "Active" ? (
              <span
                className={cn(
                  "absolute right-3 top-3 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                  listing.status === "New"
                    ? "bg-emerald-500 text-zinc-950"
                    : "bg-amber-500 text-zinc-950"
                )}
              >
                {listing.status}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Acreage", value: fmtAcres(listing.acreage, listing.acreage < 1 ? 2 : 1) },
              { label: "Bedrooms", value: listing.squareFeet === 0 ? "—" : String(listing.bedrooms) },
              { label: "Bathrooms", value: listing.squareFeet === 0 ? "—" : String(listing.bathrooms) },
              {
                label: "Interior",
                value: listing.squareFeet === 0 ? "Land" : `${listing.squareFeet.toLocaleString()} sqft`,
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-background p-3 text-center">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1 text-[14px] font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] tabular-nums text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" aria-hidden />
              {listing.bedrooms} bd
            </span>
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" aria-hidden />
              {listing.bathrooms} ba
            </span>
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" aria-hidden />
              {listing.squareFeet === 0 ? "Land parcel" : `${listing.squareFeet.toLocaleString()} sqft`}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapIcon className="h-3.5 w-3.5" aria-hidden />
              {fmtAcres(listing.acreage, listing.acreage < 1 ? 2 : 1)}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {listing.description}
          </p>

          {sm ? (
            <div className="rounded-lg border bg-background p-4">
              <MicroLabel>Micro-Market Context · {sm.name}</MicroLabel>
              <div className="mt-2 px-0.5 py-0.5">
                <KeyStatRow label="Regulatory framework" value={sm.regulatoryFramework} />
                <KeyStatRow label="Projected 20-yr CAGR" value={fmtPct(sm.projectedCagr)} />
                <KeyStatRow label="Raw-land depletion" value={String(sm.depletionYear)} />
                {proj2046 ? (
                  <KeyStatRow
                    label="This asset at 2046 · at market CAGR"
                    value={
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ≈ {fmtCurrency(proj2046, { compact: true })}
                      </span>
                    }
                  />
                ) : null}
              </div>
              <Button
                className="mt-3 h-9 w-full gap-2 text-[13px]"
                onClick={() => {
                  onOpenChange(false);
                  navigate({ view: "submarket", slug: sm.slug });
                }}
              >
                Open {sm.name} micro-market profile
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <span className="rounded-sm border bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {listing.zoningCode}
            </span>
            <span className="rounded-sm border bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {listing.propertyType}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
