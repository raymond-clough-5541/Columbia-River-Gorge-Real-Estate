"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Bath,
  BedDouble,
  Building2,
  Camera,
  Grape,
  LandPlot,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Ruler,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  fmtAcres,
  fmtCurrency,
  type PropertyListing,
  type Submarket,
} from "@/lib/gorge";
import type { NavigateFn } from "./gorge-app";
import {
  CagrBadge,
  MicroLabel,
  SectionHeader,
  StateBadge,
} from "./shared";
import { ListingDialog, getGalleryImages } from "./listing-dialog";

const TYPE_ICONS: Record<string, typeof MapIcon> = {
  "Single-Family": Building2,
  "Luxury Agricultural/Farm Estate": Grape,
  "Infill Multi-Family": LandPlot,
  "Land Parcel": MapIcon,
};

const MAX_PRICE_CEILING = 5_000_000;
const MAX_ACREAGE_CEILING = 40;

interface Filters {
  q: string;
  submarket: string;
  type: string;
  maxPrice: number;
  minAcreage: number;
  sort: string;
}

function ListingCard({
  listing,
  onOpen,
}: {
  listing: PropertyListing;
  onOpen: () => void;
}) {
  const TypeIcon = TYPE_ICONS[listing.propertyType] ?? MapIcon;
  const isLand = listing.propertyType === "Land Parcel" || listing.squareFeet === 0;
  const photoCount = getGalleryImages(listing).length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`View ${listing.title}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950/70 to-transparent" />
        <span className="absolute bottom-2.5 left-3 text-lg font-semibold tabular-nums text-white drop-shadow">
          {fmtCurrency(listing.price, { compact: true })}
        </span>
        {listing.status !== "Active" ? (
          <span
            className={cn(
              "absolute right-2.5 top-2.5 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
              listing.status === "New"
                ? "bg-emerald-500 text-zinc-950"
                : "bg-amber-500 text-zinc-950"
            )}
          >
            {listing.status}
          </span>
        ) : null}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-sm bg-zinc-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          <TypeIcon className="h-3 w-3" aria-hidden />
          {listing.propertyType}
        </span>
        {photoCount > 1 ? (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-sm bg-zinc-950/70 px-2 py-1 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
            <Camera className="h-3 w-3" aria-hidden />
            {photoCount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-1 text-[14.5px] font-semibold leading-snug">
          {listing.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          {listing.submarket ? (
            <>
              <span className="font-medium text-foreground">
                {listing.submarket.name}
              </span>
              <StateBadge state={listing.submarket.state} />
            </>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] tabular-nums text-muted-foreground">
          {!isLand ? (
            <>
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
                {listing.squareFeet.toLocaleString()} sqft
              </span>
            </>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <MapIcon className="h-3.5 w-3.5" aria-hidden />
            {fmtAcres(listing.acreage, listing.acreage < 1 ? 2 : 1)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {listing.zoningCode}
          </span>
          {listing.submarket ? (
            <CagrBadge cagr={listing.submarket.projectedCagr} showTier={false} />
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function ListingsView({
  listings,
  submarkets,
  navigate,
}: {
  listings: PropertyListing[];
  submarkets: Submarket[];
  navigate: NavigateFn;
}) {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    submarket: "all",
    type: "all",
    maxPrice: MAX_PRICE_CEILING,
    minAcreage: 0,
    sort: "price-desc",
  });
  const [results, setResults] = useState<PropertyListing[]>(listings);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const featured = useMemo(
    () => listings.find((l) => l.featured) ?? null,
    [listings]
  );

  // Debounced, API-driven filtering.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.q.trim()) params.set("q", filters.q.trim());
        if (filters.submarket !== "all") params.set("submarket", filters.submarket);
        if (filters.type !== "all") params.set("type", filters.type);
        if (filters.maxPrice < MAX_PRICE_CEILING)
          params.set("maxPrice", String(filters.maxPrice));
        if (filters.minAcreage > 0) params.set("minAcreage", String(filters.minAcreage));
        params.set("sort", filters.sort);

        const res = await fetch(`/api/listings?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (Array.isArray(json.data)) setResults(json.data);
      } catch {
        /* aborted or offline — keep last results */
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters]);

  const detail =
    listings.find((l) => l.id === detailId) ??
    results.find((l) => l.id === detailId) ??
    null;

  const types = useMemo(
    () => Array.from(new Set(listings.map((l) => l.propertyType))),
    [listings]
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Micro-Market & Featured Listings Showcase"
        title="Curated assets across the corridor"
        description="From the flagship GMA agricultural compound to infill redevelopment plays in Dallesport, Hood River, and White Salmon — every listing cross-referenced against its micro-market's supply and appreciation profile."
      />

      {/* Featured flagship */}
      {featured ? (
        <div className="mb-10 grid overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-5">
          <div className="relative min-h-[260px] lg:col-span-3">
            <Image
              src={featured.imageUrl}
              alt={featured.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 690px"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-sm bg-emerald-500 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-widest text-zinc-950">
              <Sparkles className="h-3 w-3" aria-hidden />
              Flagship
            </span>
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 lg:col-span-2 lg:p-8">
            <div className="flex items-center gap-2">
              <MicroLabel>Featured Estate · White Salmon, WA</MicroLabel>
            </div>
            <h3 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
              {featured.title}
            </h3>
            <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
              {fmtCurrency(featured.price)}
            </p>
            <p className="line-clamp-3 text-[13.5px] leading-relaxed text-muted-foreground">
              {featured.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                `${fmtAcres(featured.acreage, 1)} deed acres`,
                "Certified water rights",
                `${featured.zoningCode} zoning`,
                "Visual subordinance compliance",
                "Non-reflective CRGNSA finishes",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-sm border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>
            <Button
              className="h-11 w-full gap-2 text-[14px] sm:w-fit sm:px-6"
              onClick={() => setDetailId(featured.id)}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
              View the full dossier
            </Button>
          </div>
        </div>
      ) : null}

      {/* Filter bar */}
      <div className="sticky top-16 z-30 -mx-2 mb-6 rounded-xl border bg-background/95 px-4 py-4 shadow-sm backdrop-blur-md sm:mx-0">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search titles, zoning, descriptions…"
              className="h-10 pl-9 text-[13.5px]"
              aria-label="Search listings"
            />
            {filters.q ? (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, q: "" }))}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          <Select
            value={filters.submarket}
            onValueChange={(v) => setFilters((f) => ({ ...f, submarket: v }))}
          >
            <SelectTrigger className="h-10 text-[13.5px] lg:col-span-2" aria-label="Filter by submarket">
              <SelectValue placeholder="Submarket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All submarkets</SelectItem>
              {submarkets.map((s) => (
                <SelectItem key={s.slug} value={s.slug}>
                  {s.name} · {s.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.type}
            onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          >
            <SelectTrigger className="h-10 text-[13.5px] lg:col-span-2" aria-label="Filter by property type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="lg:col-span-2">
            <div className="mb-1 flex items-baseline justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Max price</span>
              <span className="font-semibold tabular-nums text-foreground">
                {filters.maxPrice >= MAX_PRICE_CEILING
                  ? "Any"
                  : fmtCurrency(filters.maxPrice, { compact: true })}
              </span>
            </div>
            <Slider
              value={[filters.maxPrice]}
              onValueChange={(v) => setFilters((f) => ({ ...f, maxPrice: v[0] }))}
              min={150000}
              max={MAX_PRICE_CEILING}
              step={25000}
              aria-label="Maximum price"
            />
          </div>

          <div className="lg:col-span-2">
            <div className="mb-1 flex items-baseline justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Min acreage</span>
              <span className="font-semibold tabular-nums text-foreground">
                {filters.minAcreage === 0 ? "Any" : `${filters.minAcreage}+ ac`}
              </span>
            </div>
            <Slider
              value={[filters.minAcreage]}
              onValueChange={(v) => setFilters((f) => ({ ...f, minAcreage: v[0] }))}
              min={0}
              max={MAX_ACREAGE_CEILING}
              step={1}
              aria-label="Minimum acreage"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Querying inventory…
              </span>
            ) : (
              <>
                <span className="font-semibold text-foreground">{results.length}</span>{" "}
                listings match
              </>
            )}
          </p>
          <Select
            value={filters.sort}
            onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}
          >
            <SelectTrigger className="h-8 w-40 text-[12.5px]" aria-label="Sort listings">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-desc">Price · high → low</SelectItem>
              <SelectItem value="price-asc">Price · low → high</SelectItem>
              <SelectItem value="acreage-desc">Acreage · high → low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results grid */}
      <div
        className={cn(
          "grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
          loading && "pointer-events-none opacity-60"
        )}
      >
        {results.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onOpen={() => setDetailId(l.id)}
          />
        ))}
      </div>

      {results.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No listings match those filters.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Try widening the price ceiling or clearing the search.
          </p>
          <Button
            variant="outline"
            className="mt-4 h-9 text-[13px]"
            onClick={() =>
              setFilters({
                q: "",
                submarket: "all",
                type: "all",
                maxPrice: MAX_PRICE_CEILING,
                minAcreage: 0,
                sort: "price-desc",
              })
            }
          >
            Reset filters
          </Button>
        </div>
      ) : null}

      <ListingDialog
        listing={detail}
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        navigate={navigate}
      />
    </div>
  );
}
