"use client";

import { useState } from "react";
import Image from "next/image";
import { Bath, BedDouble, Camera, ChevronLeft, ChevronRight, Printer, Ruler, Map as MapIcon } from "lucide-react";
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
import { FinancingLab } from "./financing-lab";
import { WatchstarButton } from "./listings-view";
import { KeyStatRow, MicroLabel, StateBadge } from "./shared";

/* ---------------------------------------------------------------- */
/* Photo dossiers — multi-image galleries for showcase assets.        */
/* Keyed by listing title (stable seed data). Extend as imagery       */
/* is produced.                                                       */
/* ---------------------------------------------------------------- */

const GALLERY_BY_TITLE: Record<string, string[]> = {
  "GMA Luxury Farm & Vineyard Estate with High-Value Residence": [
    "/images/vineyard-estate.png",
    "/images/estate-interior.png",
    "/images/estate-vineyard.png",
    "/images/estate-grounds.png",
  ],
};

export function getGalleryImages(listing: PropertyListing): string[] {
  const gallery = listing.featured
    ? GALLERY_BY_TITLE[listing.title]
    : undefined;
  return gallery && gallery.length > 1 ? gallery : [listing.imageUrl];
}

/** Main image + thumbnail strip + arrow nav; keyed per listing so state resets. */
function ListingGallery({
  listing,
}: {
  listing: PropertyListing;
}) {
  const images = getGalleryImages(listing);
  const [active, setActive] = useState(0);
  const multiple = images.length > 1;

  const step = (dir: 1 | -1) =>
    setActive((i) => (i + dir + images.length) % images.length);

  return (
    <div>
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg border">
        <Image
          src={images[active]}
          alt={`${listing.title} — photo ${active + 1} of ${images.length}`}
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
        {multiple ? (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-950/60 text-white backdrop-blur-sm transition-colors hover:bg-zinc-950/90"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-950/60 text-white backdrop-blur-sm transition-colors hover:bg-zinc-950/90"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-zinc-950/70 px-2 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
              <Camera className="h-3 w-3" aria-hidden />
              {active + 1}/{images.length}
            </span>
          </>
        ) : null}
      </div>

      {multiple ? (
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-[16/10] overflow-hidden rounded-md border-2 transition-all",
                i === active
                  ? "border-emerald-500 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="140px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2 pr-8 text-xl leading-tight tracking-tight">
            <span>{listing.title}</span>
            <span data-print="hide">
              <WatchstarButton listing={listing} size="sm" variant="plain" />
            </span>
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
          <ListingGallery key={listing.id} listing={listing} />

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

          <FinancingLab listing={listing} />

          {sm ? (
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <MicroLabel>Micro-Market Context · {sm.name}</MicroLabel>
                <button
                  type="button"
                  data-print="hide"
                  onClick={() => window.print()}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-zinc-400 hover:text-foreground dark:hover:border-zinc-600 active:scale-[0.97]"
                >
                  <Printer className="h-3 w-3" aria-hidden />
                  Print dossier
                </button>
              </div>
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
