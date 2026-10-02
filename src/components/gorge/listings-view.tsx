"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bath,
  BedDouble,
  Building2,
  Camera,
  Check,
  Database,
  Download,
  Grape,
  HelpCircle,
  LandPlot,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Ruler,
  Search,
  Sparkles,
  Star,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  toggleWatchlist,
  useWatchlist,
  exportWatchlistDoc,
  parseWatchlistDoc,
  restoreWatchlist,
  type WatchlistDocument,
} from "@/lib/watchlist-store";
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
import { CompareTrigger } from "./compare-sheet";

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
  starredOnly: boolean;
}

/** Star / unstar toggle with toast feedback. Shared by cards + dialogs. */
export function WatchstarButton({
  listing,
  className,
  size = "md",
  variant = "overlay",
}: {
  listing: PropertyListing;
  className?: string;
  size?: "sm" | "md";
  /** "overlay" sits on photo backdrops, "plain" on card backgrounds. */
  variant?: "overlay" | "plain";
}) {
  const watched = useWatchlist().includes(listing.id);
  const { toast } = useToast();
  const dims = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const unwatched =
    variant === "overlay"
      ? "border-zinc-950/30 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-950/85 hover:text-amber-300"
      : "bg-card text-muted-foreground hover:border-amber-400/60 hover:text-amber-500";
  return (
    <button
      type="button"
      aria-label={watched ? `Remove ${listing.title} from watchlist` : `Add ${listing.title} to watchlist`}
      aria-pressed={watched}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      onClick={(e) => {
        e.stopPropagation();
        const now = toggleWatchlist(listing.id);
        toast({
          title: now ? "Added to watchlist" : "Removed from watchlist",
          description: listing.title,
        });
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md border backdrop-blur-sm transition-all active:scale-90",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        watched
          ? "border-amber-400/60 bg-amber-400/20 text-amber-500 hover:bg-amber-400/30"
          : unwatched,
        className
      )}
    >
      <Star
        className={dims}
        fill={watched ? "currentColor" : "none"}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
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
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
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
        <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1.5">
          {listing.status !== "Active" ? (
            <span
              className={cn(
                "rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                listing.status === "New"
                  ? "bg-emerald-500 text-zinc-950"
                  : "bg-amber-500 text-zinc-950"
              )}
            >
              {listing.status}
            </span>
          ) : null}
          <WatchstarButton listing={listing} className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" />
        </div>
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Watchlist portability menu — JSON export / restore (round 7).       */
/* The starred set survives browser storage wipes and moves between    */
/* machines via a self-describing JSON document.                        */
/* ------------------------------------------------------------------ */

function timestampFileSuffix(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Parsed restore payload awaiting user confirmation in the preview
 *  dialog. `known` = ids present in this inventory; the rest are shown
 *  as unknown and get skipped on commit. */
interface RestorePreview {
  doc: WatchlistDocument;
  known: string[];
  exportedLabel: string;
}

function WatchlistDataMenu({
  listings,
}: {
  listings: PropertyListing[];
}) {
  const watchlist = useWatchlist();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);

  const exportJson = () => {
    if (watchlist.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Star at least one listing first — the export mirrors the watchlist.",
      });
      return;
    }
    const blob = new Blob([exportWatchlistDoc()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crgnsa-watchlist-${timestampFileSuffix()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({
      title: "Watchlist exported",
      description: `${watchlist.length} starred listing${watchlist.length === 1 ? "" : "s"} → JSON.`,
    });
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const doc = parseWatchlistDoc(raw);
      if (!doc) {
        toast({
          title: "Not a watchlist file",
          description:
            "Expected a CRGNSA watchlist JSON export — check the file and try again.",
          variant: "destructive",
        });
        return;
      }
      // Nothing is written yet — the preview dialog shows exactly what a
      // restore would do, and only its confirm button commits (unknown ids
      // are surfaced there instead of being silently skipped).
      const known = doc.ids.filter((id) =>
        listings.some((l) => l.id === id)
      );
      const exported = new Date(doc.exportedAt);
      const exportedLabel = Number.isNaN(exported.getTime())
        ? "unknown date"
        : exported.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
      setPreview({ doc, known, exportedLabel });
    };
    reader.onerror = () => {
      toast({
        title: "Could not read the file",
        description: "The upload failed mid-read — try exporting it again.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  /** Commit the reviewed restore — replaces the live watchlist with the
   *  file's known ids. Fires from the dialog's confirm button (event-time
   *  toast, never inside a state updater). */
  const confirmRestore = () => {
    if (!preview) return;
    const skipped = preview.doc.ids.length - preview.known.length;
    restoreWatchlist(preview.known);
    toast({
      title: preview.known.length > 0 ? "Watchlist restored" : "Nothing to restore",
      description:
        preview.known.length > 0
          ? `${preview.known.length} listing${preview.known.length === 1 ? "" : "s"} re-starred${
              skipped > 0 ? ` · ${skipped} unknown id${skipped === 1 ? "" : "s"} skipped` : ""
            }.`
          : "None of the file's listings match this inventory.",
    });
    setPreview(null);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFileChosen}
        aria-hidden
        tabIndex={-1}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Watchlist data — export or restore"
            title="Export or restore the starred set"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium text-muted-foreground transition-all hover:border-zinc-400 hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:hover:border-zinc-600"
          >
            <Database className="h-3.5 w-3.5" aria-hidden />
            Data
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider">
            Watchlist portability
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={exportJson}
            disabled={watchlist.length === 0}
            className="gap-2 text-[13px]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export JSON
            <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
              {watchlist.length}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              // Defer the click until the menu finishes closing so focus
              // hand-off doesn't re-open the trigger.
              window.setTimeout(() => fileRef.current?.click(), 0);
            }}
            className="gap-2 text-[13px]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Restore from file…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <p className="px-2 pb-1.5 pt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            The starred set lives in this browser only — export moves it
            across devices and survives storage wipes.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Restore preview — review before the file replaces the starred set. */}
      <Dialog
        open={preview !== null}
        onOpenChange={(next) => {
          if (!next) setPreview(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-[16px]">
              <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              Restore watchlist
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              {preview
                ? `Exported ${preview.exportedLabel} · ${preview.doc.ids.length} listing${
                    preview.doc.ids.length === 1 ? "" : "s"
                  } in the file. Restoring replaces your current ${watchlist.length} starred listing${
                    watchlist.length === 1 ? "" : "s"
                  } — nothing is written until you confirm.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {preview ? (
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <ul className="divide-y">
                {preview.doc.ids.map((id) => {
                  const listing = listings.find((l) => l.id === id);
                  return (
                    <li
                      key={id}
                      className="flex min-w-0 items-center gap-2.5 px-3 py-2.5"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          listing
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-zinc-300 bg-muted text-muted-foreground dark:border-zinc-700"
                        )}
                        aria-hidden
                      >
                        {listing ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <HelpCircle className="h-3 w-3" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-[13px] font-medium leading-tight",
                            !listing && "text-muted-foreground"
                          )}
                        >
                          {listing ? listing.title : "Unknown listing"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {listing
                            ? `${listing.submarket?.name ?? "—"} · ${fmtCurrency(
                                listing.price,
                                { compact: true }
                              )}`
                            : "not in this inventory — will be skipped"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          listing
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {listing ? "restore" : "skip"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="h-9 text-[13px]"
              onClick={() => setPreview(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!preview || preview.known.length === 0}
              onClick={confirmRestore}
              className="h-9 gap-1.5 bg-zinc-900 text-[13px] text-white hover:bg-zinc-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              {preview && preview.known.length > 0
                ? `Restore ${preview.known.length} listing${
                    preview.known.length === 1 ? "" : "s"
                  }`
                : "Nothing to restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
    starredOnly: false,
  });
  const watchlist = useWatchlist();
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

  // Watchlist-only mode is applied client-side over the API results.
  const visible = useMemo(
    () =>
      filters.starredOnly
        ? results.filter((l) => watchlist.includes(l.id))
        : results,
    [results, filters.starredOnly, watchlist]
  );

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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t pt-3">
          <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground tabular-nums">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Querying inventory…
              </span>
            ) : (
              <>
                <span>
                  <span className="font-semibold text-foreground">{visible.length}</span>{" "}
                  listing{visible.length === 1 ? "" : "s"} match
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, starredOnly: !f.starredOnly }))
                  }
                  aria-pressed={filters.starredOnly}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-all active:scale-[0.97]",
                    filters.starredOnly
                      ? "border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground hover:border-zinc-400 hover:text-foreground dark:hover:border-zinc-600",
                    watchlist.length === 0 && !filters.starredOnly && "opacity-60"
                  )}
                >
                  <Star
                    className="h-3.5 w-3.5"
                    fill={filters.starredOnly ? "currentColor" : "none"}
                    aria-hidden
                  />
                  Watchlist
                  <span className="rounded-sm bg-muted px-1 text-[11px] font-semibold tabular-nums">
                    {watchlist.length}
                  </span>
                </button>
                <CompareTrigger
                  listings={listings}
                  onOpenListing={(l) => setDetailId(l.id)}
                  submarkets={submarkets}
                />
                <WatchlistDataMenu listings={listings} />
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
        {visible.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onOpen={() => setDetailId(l.id)}
          />
        ))}
      </div>

      {visible.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm font-medium">
            {filters.starredOnly
              ? "Your watchlist is empty — or nothing starred matches the other filters."
              : "No listings match those filters."}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {filters.starredOnly
              ? "Star listings from any card or dossier to build a personal shortlist."
              : "Try widening the price ceiling or clearing the search."}
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
                starredOnly: false,
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
