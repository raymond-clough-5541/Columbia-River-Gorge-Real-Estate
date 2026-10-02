// ============================================================
// Portable Review Gallery engine — identical to the Free Trader
// instance (gallery view + progress-report view; R86 report, R212
// multi-corpus + round-grouped feature gallery)
//
// WHY THIS EXISTS (R85 / Q7 verdict, user verbatim): "you are
// asking me to review a text document not screen shots . i can't
// do that you have to provide me screen shots to assess it"
//
// The user cannot assess UI sign-offs from a text document; they
// need to SEE screenshots. Keep the gallery OUTSIDE the product
// app's tree — it is tooling that lives beside the app, not in it.
//
// Access through the gateway (preview panel):
//   /?XTransformPort=3031
// All asset URLs below carry the same query param so subresource
// loads forward correctly through the gateway. Accessed directly
// (localhost:3031) the param is simply ignored.
//
// R212 — THE FEATURE-SHOT CORPUS: reviewing ALL the feature UI
// screenshots means serving corpora like a flat folder of
// rNNN-slug.png receipts. The engine scans MULTIPLE corpora:
//   c0   CORPUS_ROOT         (default: fresh captures,
//                             folder-grouped, newest first; the
//                             /report view still reads this one)
//   c1+  EXTRA_CORPUS_ROOTS  (default: the feature-shot corpus,
//                             round-grouped by the rNNN- prefix,
//                             newest round first)
// Round section titles derive from design-pass doc filenames
// (SECTION_TITLE_DIRS, e.g. docs/design-passes/rNNN-slug.md with
// docs/RNNN-*.md as the fallback); captions humanize the shot
// slug (captions.json still wins). The view adds a live filter
// box, per-round jump chips, and a lightbox with prev/next
// walking. Everything is re-scanned on every page load — new
// shots appear without a restart. The default paths below are
// the source instance's; override them via the env seams.
//
// R214 — SCAN MODE + THE FULL KEYBOARD WALK: F toggles a true
// full-screen scan (the Fullscreen API with the `scan` class as
// the always-works fallback), the arrow keys open + walk from the
// gallery itself (input-focus guarded), Home/End jump to the ends,
// Z toggles native-pixel zoom (the R216 fit contract), ±1 neighbors
// preload during a walk, and only backdrop clicks close the box.
//
// R215 — CLICK OPENS FULL SCREEN: open() enters scan mode directly
// (the opening click/keydown is the user-activation gesture, so
// requestFullscreen succeeds in normal browser contexts; where it
// rejects, the scan class alone still fills the viewport). F is
// now the WINDOWED toggle — the button label flips to match
// ("Windowed (F)" while scanning, "Full screen (F)" when capped).
//
// R216 — THE IMAGE FILLS THE SCREEN: scan mode fits by FILLING —
// the img is sized 100vw/100vh with object-fit: cover + center
// crop, so the shot occupies every pixel of the viewport, edge to
// edge, with no background bands on any aspect mismatch (a 16:10
// shot on a 16:9 screen crops a little top and bottom instead of
// showing bars). F (windowed) is the FIT-whole-shot view (the 80vh
// cap); Z shows every native pixel at 1:1 (scrollable) — the zoom
// img rule stays declared AFTER the scan img rule (equal
// specificity, source order wins).
// ============================================================

import { readdirSync, statSync, readFileSync, existsSync, openSync, readSync, closeSync } from "node:fs";
import { join, relative, resolve, extname, basename } from "node:path";
import { buildReportHtml } from "./report";

// Engine parameters (portable — R85/DR-14): the same code runs as this
// project's instance (defaults below) and as the portable copy in
// portable-workflows/review-gallery/ (env-driven seams).
const PORT = Number(process.env.PORT ?? 3031);
const GATEWAY_PARAM = `XTransformPort=${PORT}`;

// ---- Corpora (the seam family, R212) --------------------------------------

type CorpusMode = "folder" | "round";
type Corpus = { root: string; mode: CorpusMode };

const DEFAULT_CORPUS_ROOT = "/home/z/my-project/screenshots";
const DEFAULT_EXTRA_CORPORA: string[] = [
  // The committed feature-shot record — THE corpus the owner reviews.
  "/home/z/my-project/docs/design-passes/shots:round",
];
const DEFAULT_TITLE_DIRS = [
  "/home/z/my-project/docs/design-passes",
  "/home/z/my-project/docs",
];

/** ";"-separated entries: "/abs/path" or "/abs/path:round" / ":folder". */
function parseExtraCorpora(v: string | undefined): Corpus[] {
  const entries =
    v === undefined
      ? DEFAULT_EXTRA_CORPORA
      : v.split(";").map((s) => s.trim()).filter(Boolean);
  const out: Corpus[] = [];
  for (const entry of entries) {
    const idx = entry.lastIndexOf(":");
    const path = idx === -1 ? entry : entry.slice(0, idx);
    const modeRaw = idx === -1 ? "" : entry.slice(idx + 1);
    if (!path) continue;
    out.push({ root: resolve(path), mode: modeRaw === "round" ? "round" : "folder" });
  }
  return out;
}

function parseDirList(v: string | undefined, defaults: string[]): string[] {
  if (v === undefined) return defaults;
  return v.split(";").map((s) => s.trim()).filter(Boolean);
}

// Curated titles where the doc filenames under-specify the round — the
// values are taken verbatim from the round docs' own H1s.
const ROUND_TITLE_OVERRIDES: Record<number, string> = {
  151: "E2E Human Re-walk (R138\u2013R150 Features)",
  210: "P2 E2E Human Testing, Local",
};

const CORPORA: Corpus[] = [
  { root: resolve(process.env.CORPUS_ROOT ?? DEFAULT_CORPUS_ROOT), mode: "folder" },
  ...parseExtraCorpora(process.env.EXTRA_CORPUS_ROOTS),
];
const TITLE_DIRS = parseDirList(process.env.SECTION_TITLE_DIRS, DEFAULT_TITLE_DIRS);

// ---- Shared model ----------------------------------------------------------

type Shot = {
  rel: string;
  corpus: number;
  caption: string;
  mtimeMs: number;
  w?: number; // PNG pixel size (IHDR) — emitted as width/height attrs so the
  h?: number; // grid reserves exact space pre-load (no layout shift while
              // lazy images stream in — chip/anchor jumps land true)
};
type Section = {
  id: string; // anchor id ("R209", folder name, "ungrouped")
  label: string; // rendered heading
  group: "fresh" | "round" | "ungrouped";
  order: number; // fresh: newest mtime · round: round number · ungrouped: -1
  shots: Shot[];
  newest: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---- Humanizer (captions + round titles) -----------------------------------

const ACRONYMS = new Set([
  "db", "csv", "ui", "iso", "csrf", "http", "https", "ip", "id", "ids",
  "tx", "ms", "gm", "sv", "xhr", "e2e", "pw", "utc", "api", "sms",
  "css", "html", "js", "ts", "qa", "ux",
]);

function humanizeWord(w: string): string {
  if (ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** "group-activity-insights" → "Group Activity Insights" */
function humanizeSlug(slug: string): string {
  return slug.split("-").filter(Boolean).map(humanizeWord).join(" ");
}

// ---- Round titles (design-pass doc filenames → section labels) --------------
// docs/design-passes/r209-group-activity-insights.md → "Group Activity Insights"
// docs/R210-P2-E2E-RESULTS.md → "P2 E2E" (trailing -PLAN/-RESULTS stripped,
// purely-generic slugs skipped). Multiple docs per round join with " + ".
function buildRoundTitles(): Map<number, string> {
  const slugsByRound = new Map<number, string[]>();
  for (const dir of TITLE_DIRS) {
    let files: string[] = [];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      const m = /^r(\d+)[-_](.+)\.md$/i.exec(f);
      if (!m) continue;
      const round = Number(m[1]);
      let slug = m[2].replace(/-(plan|results|report)$/i, "");
      if (!slug || /^(plan|results|report)$/i.test(slug)) continue;
      const list = slugsByRound.get(round) ?? [];
      if (!list.includes(slug)) list.push(slug);
      slugsByRound.set(round, list);
    }
  }
  const titles = new Map<number, string>();
  for (const [round, slugs] of slugsByRound) {
    const head = slugs.slice(0, 2).map(humanizeSlug).join(" + ");
    const tail = slugs.length > 2 ? ` +${slugs.length - 2}` : "";
    titles.set(round, head + tail);
  }
  return titles;
}

// ---- Corpus scanning --------------------------------------------------------

/** Recursively collect PNGs under a directory. */
function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, acc);
    } else if (extname(entry).toLowerCase() === ".png") {
      acc.push(full);
    }
  }
  return acc;
}

/** Optional per-folder captions.json: { "01-welcome.png": "caption" } */
function loadCaptions(dir: string): Record<string, string> {
  const p = join(dir, "captions.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Caption from the filename: "r209-activity-db-sourced.png" → "Activity DB Sourced" */
function captionFromName(file: string): string {
  const slug = file.replace(/\.png$/i, "").replace(/^r\d+-/i, "");
  return slug ? humanizeSlug(slug) : "";
}

/** PNG pixel size from the IHDR header (bytes 16-24), null on any mismatch. */
function pngSize(abs: string): { w: number; h: number } | null {
  let fd: number;
  try {
    fd = openSync(abs, "r");
  } catch {
    return null;
  }
  try {
    const buf = Buffer.alloc(24);
    if (readSync(fd, buf, 0, 24, 0) < 24) return null;
    if (buf.readUInt32BE(0) !== 0x89504e47) return null; // PNG magic
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

function mtimeOf(abs: string): number {
  try {
    return statSync(abs).mtimeMs;
  } catch {
    return 0;
  }
}

function sortShots(shots: Shot[]): Shot[] {
  return shots.sort((a, b) => a.rel.localeCompare(b.rel, undefined, { numeric: true }));
}

/** Folder-mode corpus: sections = top-level folders, newest-captured first. */
function scanFolderCorpus(corpusIdx: number): Section[] {
  const root = CORPORA[corpusIdx].root;
  const pngs = walk(root);
  const bySection = new Map<string, Shot[]>();
  const captionsByDir = new Map<string, Record<string, string>>();

  for (const abs of pngs) {
    const rel = relative(root, abs);
    const parts = rel.split("/");
    const name = parts[0] ?? "(root)";
    const dir = parts.slice(0, -1).join("/");
    if (!captionsByDir.has(dir)) {
      captionsByDir.set(dir, loadCaptions(join(root, dir)));
    }
    const captions = captionsByDir.get(dir)!;
    const file = basename(abs);
    const size = pngSize(abs);
    const shot: Shot = {
      rel,
      corpus: corpusIdx,
      caption: captions[file] ?? "",
      mtimeMs: mtimeOf(abs),
      ...(size ? { w: size.w, h: size.h } : {}),
    };
    const list = bySection.get(name) ?? [];
    list.push(shot);
    bySection.set(name, list);
  }

  const sections: Section[] = [];
  for (const [name, shots] of bySection) {
    sections.push({
      id: name,
      label:
        name === "r85-review"
          ? "Current state — fresh captures (R85, post-Q1/Q3/Q4/Q5/Q6)"
          : name,
      group: "fresh",
      order: 0,
      shots: sortShots(shots),
      newest: Math.max(...shots.map((s) => s.mtimeMs), 0),
    });
  }
  sections.sort((a, b) => b.newest - a.newest);
  return sections;
}

/** Round-mode corpus: flat rNNN-slug.png folders grouped by round, newest round first. */
function scanRoundCorpus(corpusIdx: number): Section[] {
  const root = CORPORA[corpusIdx].root;
  const pngs = walk(root);
  const captions = loadCaptions(root);
  const titles = buildRoundTitles();
  const byRound = new Map<number, Shot[]>();
  const ungrouped: Shot[] = [];

  for (const abs of pngs) {
    const rel = relative(root, abs);
    const file = basename(abs);
    const m = /^r(\d+)-/i.exec(file);
    const size = pngSize(abs);
    const shot: Shot = {
      rel,
      corpus: corpusIdx,
      caption: captions[file] || captionFromName(file),
      mtimeMs: mtimeOf(abs),
      ...(size ? { w: size.w, h: size.h } : {}),
    };
    if (m) {
      const round = Number(m[1]);
      const list = byRound.get(round) ?? [];
      list.push(shot);
      byRound.set(round, list);
    } else {
      ungrouped.push(shot);
    }
  }

  const sections: Section[] = [];
  for (const [round, shots] of byRound) {
    const title = ROUND_TITLE_OVERRIDES[round] ?? titles.get(round) ?? `Round ${round}`;
    sections.push({
      id: `R${round}`,
      label: `R${round} — ${title}`,
      group: "round",
      order: round,
      shots: sortShots(shots),
      newest: Math.max(...shots.map((s) => s.mtimeMs), 0),
    });
  }
  sections.sort((a, b) => b.order - a.order);
  if (ungrouped.length > 0) {
    sections.push({
      id: "ungrouped",
      label: "Ungrouped captures (no round prefix)",
      group: "ungrouped",
      order: -1,
      shots: sortShots(ungrouped),
      newest: Math.max(...ungrouped.map((s) => s.mtimeMs), 0),
    });
  }
  return sections;
}

/** All corpora merged for the gallery view: fresh captures first, then rounds. */
function scanAll(): Section[] {
  const fresh: Section[] = [];
  const grouped: Section[] = [];
  CORPORA.forEach((corpus, idx) => {
    const sections = corpus.mode === "folder" ? scanFolderCorpus(idx) : scanRoundCorpus(idx);
    (corpus.mode === "folder" ? fresh : grouped).push(...sections);
  });

  // Unique anchor ids across corpora (two round corpora could both have R209).
  const used = new Set<string>();
  for (const s of [...fresh, ...grouped]) {
    let id = s.id;
    let n = 2;
    while (used.has(id)) id = `${s.id}#${n++}`;
    s.id = id;
    used.add(id);
  }
  return [...fresh, ...grouped];
}

// ---- Gallery view -----------------------------------------------------------

function galleryHtml(sections: Section[]): string {
  const total = sections.reduce((n, s) => n + s.shots.length, 0);
  const roundSections = sections.filter((s) => s.group === "round");
  const firstRound = roundSections.length ? roundSections[0] : null;
  const lastRound = roundSections.length ? roundSections[roundSections.length - 1] : null;

  const sectionHtml = sections
    .map((s) => {
      const cards = s.shots
        .map((shot) => {
          const src = `/?img=c${shot.corpus}/${encodeURIComponent(shot.rel)}&${GATEWAY_PARAM}`;
          const fname = escapeHtml(shot.rel.split("/").slice(1).join(" / ") || shot.rel);
          const caption = shot.caption ? escapeHtml(shot.caption) : "";
          const search = escapeHtml(
            `${s.label} ${caption} ${shot.rel}`.toLowerCase(),
          );
          const alt = escapeHtml(`${s.label}${caption ? " — " + caption : ""} (${shot.rel})`);
          const dims = shot.w && shot.h ? ` width="${shot.w}" height="${shot.h}"` : "";
          return `<figure class="shot" tabindex="0" data-search="${search}">
            <img src="${src}" alt="${alt}"${dims} loading="lazy" decoding="async" />
            <figcaption>${
              caption ? `<span class="cap">${caption}</span>` : ""
            }<span class="fname">${fname}</span></figcaption>
          </figure>`;
        })
        .join("\n");
      const n = s.shots.length;
      return `<section class="corpus" id="sec-${escapeHtml(s.id)}">
        <h2>${escapeHtml(s.label)} <span class="count">${n} shot${n === 1 ? "" : "s"}</span></h2>
        <div class="grid">${cards}</div>
      </section>`;
    })
    .join("\n");

  const chips = sections
    .map(
      (s) =>
        `<a href="#sec-${escapeHtml(s.id)}" data-chip="${escapeHtml(s.id)}">${escapeHtml(
          s.group === "round" ? s.id : s.id,
        )}</a>`,
    )
    .join("");

  const range =
    firstRound && lastRound && firstRound !== lastRound
      ? ` · feature rounds ${firstRound.id} → ${lastRound.id}, newest first`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Free Trader — Review Gallery</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0; padding: 0 24px;
    background: #141210; color: #e8e2d9;
    font: 15px/1.5 ui-sans-serif, system-ui, sans-serif;
    min-height: 100vh; display: flex; flex-direction: column;
  }
  header { max-width: 1280px; margin: 0 auto 14px; width: 100%; padding-top: 24px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .viewnav { display: flex; gap: 8px; margin: 0 0 12px; }
  .viewnav a {
    color: #d8cfc2; text-decoration: none; font-size: 13px;
    padding: 7px 14px; border: 1px solid #3a332a; border-radius: 999px;
    background: #1c1915;
  }
  .viewnav a:hover { border-color: #5a5142; }
  .viewnav a[aria-current="page"] {
    background: #2e2721; color: #f0e9de; border-color: #6b5f4b;
  }
  .banner {
    background: #241f1a; border: 1px solid #3a332a; border-radius: 8px;
    padding: 10px 14px; font-size: 13px; color: #b5ab9c;
  }
  .banner strong { color: #e8e2d9; }
  .controls {
    position: sticky; top: 0; z-index: 5;
    max-width: 1280px; margin: 0 auto; width: 100%;
    background: rgba(20, 18, 16, .96);
    border-bottom: 1px solid #2c2721;
    padding: 10px 0 8px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .controls .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  #q {
    flex: 1 1 260px; max-width: 420px;
    background: #1c1915; color: #e8e2d9;
    border: 1px solid #3a332a; border-radius: 8px;
    padding: 8px 12px; font: inherit; font-size: 14px;
  }
  #q:focus { outline: 2px solid #6b5f4b; outline-offset: -1px; }
  #count { color: #8d8272; font-size: 13px; }
  .chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
  .chips a {
    color: #b5ab9c; text-decoration: none; font-size: 12px;
    font-variant-numeric: tabular-nums; white-space: nowrap;
    padding: 4px 10px; border: 1px solid #3a332a; border-radius: 999px;
    background: #1c1915;
  }
  .chips a:hover { border-color: #5a5142; color: #e8e2d9; }
  .chips a[aria-current="true"] {
    background: #2e2721; color: #f0e9de; border-color: #6b5f4b;
  }
  main { max-width: 1280px; margin: 0 auto; width: 100%; flex: 1; }
  .corpus { scroll-margin-top: 84px; }
  @media (max-width: 640px) { .corpus { scroll-margin-top: 140px; } }
  h2 { font-size: 16px; margin: 28px 0 10px; color: #d8cfc2; }
  .count { color: #8d8272; font-weight: normal; font-size: 13px; margin-left: 8px; }
  .grid {
    display: grid; gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
  .shot { margin: 0; }
  .shot img {
    width: 100%; display: block; border-radius: 6px; cursor: zoom-in;
    border: 1px solid #3a332a; background: #000;
    max-height: 260px; object-fit: contain; object-position: top;
  }
  .shot figcaption { padding: 6px 2px 0; font-size: 12px; color: #9c9284; }
  .shot .cap { display: block; color: #cabfae; font-size: 13px; }
  .shot .fname { display: block; font-family: ui-monospace, monospace; margin-top: 2px; }
  .hidden { display: none !important; }
  #noResults { display: none; padding: 40px 0; color: #8d8272; text-align: center; }
  footer {
    max-width: 1280px; margin: 40px auto 0; width: 100%;
    padding: 16px 0 24px; border-top: 1px solid #2c2721;
    color: #8d8272; font-size: 12px; line-height: 1.7;
  }
  #lightbox {
    position: fixed; inset: 0; background: rgba(10, 8, 6, .94);
    display: none; align-items: center; justify-content: center;
    flex-direction: column; gap: 12px; z-index: 10; padding: 28px;
  }
  #lightbox.open { display: flex; }
  #lightbox img { max-width: 100%; max-height: 80vh; border-radius: 6px; }
  #lightbox .lbl { color: #b5ab9c; font-size: 13px; text-align: center; max-width: 80ch; }
  .lb-nav { display: flex; align-items: center; gap: 14px; }
  .lb-nav button {
    background: #1c1915; color: #e8e2d9; border: 1px solid #3a332a;
    border-radius: 8px; padding: 8px 16px; font: inherit; cursor: pointer;
  }
  .lb-nav button:hover { border-color: #6b5f4b; }
  #lbPos { color: #8d8272; font-size: 13px; font-variant-numeric: tabular-nums; }
  #closeHint { color: #8d8272; font-size: 12px; text-align: center; }
  .lb-chrome { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  /* Scan mode (R214/R216): the shot owns the whole screen, EDGE TO
     EDGE — the img is sized 100vw/100vh with object-fit: cover, so it
     fills the viewport and center-crops any aspect mismatch; no
     background bands can show in scan mode (F fits the whole shot
     smaller, Z inspects every native pixel). The CLASS is the
     contract — when the Fullscreen API is unavailable or rejects
     (headless browsers, iOS Safari), the fill still owns the
     viewport; when the API succeeds the browser chrome also leaves. */
  #lightbox.scan { padding: 0; }
  #lightbox.scan img { width: 100vw; height: 100vh; max-width: none; max-height: none; object-fit: cover; object-position: center; border-radius: 0; display: block; }
  #lightbox.scan .lb-chrome {
    position: absolute; left: 0; right: 0; bottom: 0;
    gap: 4px; padding: 30px 16px 10px;
    background: linear-gradient(transparent, rgba(10, 8, 6, .9));
    transition: opacity .35s ease;
  }
  #lightbox.scan .lbl { font-size: 12px; max-width: 90ch; }
  #lightbox.scan .lb-nav { gap: 8px; }
  #lightbox.scan .lb-nav button { padding: 6px 12px; font-size: 13px; }
  #lightbox.scan #closeHint { font-size: 11px; }
  /* Idle-hide (scan mode only): 2s without mousemove/keydown fades the
     chrome away; any activity brings it back. Normal mode never hides. */
  #lightbox.scan.idle .lb-chrome { opacity: 0; }
  #lightbox.scan.idle { cursor: none; }
  /* Zoom (R214/R216): native 1:1 pixels for detail inspection; the
     lightbox scrolls, alignment goes flex-start. Declared AFTER the
     scan img rule (equal specificity — source order wins) so Z
     overrides the explicit 100vw/100vh fill sizing. Resets to fill
     (or the windowed fit) on every step. */
  #lightbox.zoom { overflow: auto; justify-content: flex-start; align-items: flex-start; }
  #lightbox.zoom img { width: auto; height: auto; max-width: none; max-height: none; object-fit: initial; }
</style>
</head>
<body>
<header>
  <nav class="viewnav" aria-label="Review surface views">
    <a href="/?${GATEWAY_PARAM}" aria-current="page">Screenshot gallery</a>
    <a href="/report?${GATEWAY_PARAM}">Progress report</a>
  </nav>
  <h1>Free Trader — Review Gallery</h1>
  <div class="banner">
    <strong>${total} screenshots</strong>${range}. This is the visual review
    surface for UI sign-offs (DR-25): type to filter, click a shot to open
    it filling the screen edge to edge, walk the set with the arrow keys
    (from the gallery too: Right opens the first shot, Left the last),
    F fits the whole shot smaller, Z for native 1:1 pixels (scrollable).
    The gallery is a local-only service; shots never enter the app tree
    (DR-21).
  </div>
</header>
<div class="controls">
  <div class="row">
    <input id="q" type="search" placeholder="Filter shots — round, feature, filename…" aria-label="Filter shots" />
    <span id="count">${total} shots · ${sections.length} sections</span>
  </div>
  <nav class="chips" aria-label="Jump to section">${chips}</nav>
</div>
<main>
${sectionHtml}
<div id="noResults">No shots match the filter — clear the search box to see all ${total}.</div>
</main>
<footer>
  <div>Corpora: <code>docs/design-passes/shots/</code> (the committed design-pass record — feature rounds, newest first) · <code>screenshots/</code> (fresh captures, newest first when present).</div>
  <div>Review gallery mini-service · re-scanned on every page load · DR-21 / DR-25 (docs/REVIEW-ARTIFACTS-POLICY.md).</div>
</footer>
<div id="lightbox" role="dialog" aria-modal="true" aria-label="Screenshot enlarged">
  <img alt="" />
  <div class="lb-chrome">
    <div class="lbl"></div>
    <div class="lb-nav">
      <button id="lbPrev" type="button" aria-label="Previous shot">&#8592; Prev</button>
      <span id="lbPos">1 / 1</span>
      <button id="lbNext" type="button" aria-label="Next shot">Next &#8594;</button>
      <button id="lbScan" type="button" aria-pressed="false">Full screen (F)</button>
      <button id="lbZoom" type="button" aria-pressed="false">Zoom (Z)</button>
    </div>
    <div id="closeHint">← → walk · Home/End jump · F fit whole shot · Z native 1:1 (scrollable) · Esc or click the backdrop to close</div>
  </div>
</div>
<script>
(function () {
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  var lbLbl = lb.querySelector(".lbl");
  var lbPos = document.getElementById("lbPos");
  var lbScanBtn = document.getElementById("lbScan");
  var lbZoomBtn = document.getElementById("lbZoom");
  var visible = [];
  var idx = 0;
  var idleTimer = null;

  function render() {
    var fig = visible[idx];
    var img = fig.querySelector("img");
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbLbl.textContent = img.alt;
    lbPos.textContent = (idx + 1) + " / " + visible.length;
    // Zoom is per-shot (R214): every step starts fitted to the screen again.
    lb.classList.remove("zoom");
    lbZoomBtn.textContent = "Zoom (Z)";
    lbZoomBtn.setAttribute("aria-pressed", "false");
    preloadNeighbors();
  }
  function visibleShots() {
    return Array.prototype.filter.call(
      document.querySelectorAll(".shot"),
      function (f) { return !f.classList.contains("hidden"); }
    );
  }
  function open(fig) {
    visible = visibleShots();
    if (visible.length === 0) return;
    idx = visible.indexOf(fig);
    if (idx === -1) idx = 0;
    render();
    lb.classList.add("open");
    // R215: the opening click/keydown IS the user-activation gesture,
    // so the shot opens DIRECTLY in scan mode (full screen). Where
    // requestFullscreen rejects (iframes without allowfullscreen, iOS
    // Safari, headless), the scan class alone still fills the viewport
    // (the R214 fallback contract). F toggles back to the windowed view.
    enterScan();
  }
  function stopIdleTimer() {
    if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null; }
  }
  function close() {
    lb.classList.remove("open");
    lb.classList.remove("scan");
    lb.classList.remove("idle");
    lb.classList.remove("zoom");
    lbScanBtn.setAttribute("aria-pressed", "false");
    lbScanBtn.textContent = "Full screen (F)";
    lbZoomBtn.textContent = "Zoom (Z)";
    lbZoomBtn.setAttribute("aria-pressed", "false");
    stopIdleTimer();
    exitFullscreenIfActive();
  }
  function step(d) {
    if (visible.length === 0) return;
    idx = (idx + d + visible.length) % visible.length;
    render();
  }
  function jump(i) {
    if (visible.length === 0) return;
    idx = Math.max(0, Math.min(i, visible.length - 1));
    render();
  }
  // Neighbor preload (R214): warm the +1/-1 images so arrow-walking a
  // large corpus never stalls on network.
  function preloadNeighbors() {
    if (visible.length < 2) return;
    var offs = [idx - 1, idx + 1];
    for (var k = 0; k < offs.length; k++) {
      var j = (offs[k] + visible.length) % visible.length;
      if (j === idx) continue;
      var im = visible[j].querySelector("img");
      if (im && im.src) { var pre = new Image(); pre.src = im.src; }
    }
  }

  // ---- Scan mode (R214) ---------------------------------------------------
  // The scan CLASS is the contract: full-viewport inspection even when the
  // Fullscreen API is unavailable or rejects (headless browsers, iOS
  // Safari). When the API succeeds, the browser chrome disappears too.
  function exitFullscreenIfActive() {
    var active = document.fullscreenElement || document.webkitFullscreenElement;
    if (active !== lb) return;
    try {
      if (typeof document.exitFullscreen === "function") {
        var p = document.exitFullscreen();
        if (p && typeof p.catch === "function") p.catch(function () {});
      } else if (typeof document.webkitExitFullscreen === "function") {
        document.webkitExitFullscreen();
      }
    } catch (err) { /* already leaving */ }
  }
  function enterScan() {
    lb.classList.add("scan");
    lbScanBtn.setAttribute("aria-pressed", "true");
    lbScanBtn.textContent = "Windowed (F)";
    try {
      if (typeof lb.requestFullscreen === "function") {
        var p = lb.requestFullscreen();
        if (p && typeof p.catch === "function") {
          p.catch(function () { /* class stays: the fallback scan */ });
        }
      } else if (typeof lb.webkitRequestFullscreen === "function") {
        lb.webkitRequestFullscreen();
      }
    } catch (err) { /* class stays: the fallback scan */ }
    wakeChrome();
  }
  function exitScan() {
    lb.classList.remove("scan");
    lb.classList.remove("idle");
    lbScanBtn.setAttribute("aria-pressed", "false");
    lbScanBtn.textContent = "Full screen (F)";
    stopIdleTimer();
    exitFullscreenIfActive();
  }
  function toggleScan() {
    if (lb.classList.contains("scan")) exitScan();
    else enterScan();
  }
  // The browser's own Esc exits fullscreen WITHOUT firing the page
  // keydown (Chrome): keep the lightbox open in normal overlay mode (the
  // next Esc closes it); only the scan styling drops. Never force-close.
  function onFullscreenChange() {
    if (!lb.classList.contains("open")) return;
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl && lb.classList.contains("scan")) {
      lb.classList.remove("scan");
      lb.classList.remove("idle");
      lbScanBtn.setAttribute("aria-pressed", "false");
      lbScanBtn.textContent = "Full screen (F)";
      stopIdleTimer();
    }
  }
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  // Idle-hide (scan mode only, R214): 2s without mousemove/keydown fades
  // the chrome; any activity brings it back. Normal mode always shows it.
  function wakeChrome() {
    lb.classList.remove("idle");
    stopIdleTimer();
    if (lb.classList.contains("open") && lb.classList.contains("scan")) {
      idleTimer = setTimeout(function () { lb.classList.add("idle"); }, 2000);
    }
  }
  document.addEventListener("mousemove", function () {
    if (lb.classList.contains("open")) wakeChrome();
  });

  // ---- Zoom toggle (R214): native 1:1 pixels for detail inspection --------
  function toggleZoom() {
    var on = !lb.classList.contains("zoom");
    lb.classList.toggle("zoom", on);
    lbZoomBtn.textContent = on ? "Fit (Z)" : "Zoom (Z)";
    lbZoomBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  // ---- Keyboard router (R214) ----------------------------------------------
  // Lightbox OPEN: the walk keys. Lightbox CLOSED: the gallery-level
  // arrows open the walk at the first/last visible shot — never while an
  // input/textarea/contentEditable has focus (the filter-box guard).
  function isTypingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable === true;
  }
  document.addEventListener("keydown", function (e) {
    if (lb.classList.contains("open")) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "Home") { e.preventDefault(); jump(0); }
      else if (e.key === "End") { e.preventDefault(); jump(visible.length - 1); }
      else if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleScan(); }
      else if (e.key === "z" || e.key === "Z") { e.preventDefault(); toggleZoom(); }
      wakeChrome();
      return;
    }
    if (isTypingTarget(document.activeElement)) return;
    var vis = visibleShots();
    if (vis.length === 0) return;
    if (e.key === "ArrowRight") { e.preventDefault(); open(vis[0]); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); open(vis[vis.length - 1]); }
  });

  document.querySelectorAll(".shot").forEach(function (fig) {
    fig.addEventListener("click", function () { open(fig); });
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(fig); }
    });
  });
  document.getElementById("lbPrev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
  document.getElementById("lbNext").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
  lbScanBtn.addEventListener("click", function (e) { e.stopPropagation(); toggleScan(); });
  lbZoomBtn.addEventListener("click", function (e) { e.stopPropagation(); toggleZoom(); });
  // Backdrop-click close (R214): ONLY a click on the backdrop itself
  // closes; clicks on the shot must not destroy a scan walk.
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

  // Live filter: caption + filename + section label.
  var q = document.getElementById("q");
  var countEl = document.getElementById("count");
  var noResults = document.getElementById("noResults");
  var sections = Array.prototype.slice.call(document.querySelectorAll(".corpus"));
  var allFigs = Array.prototype.slice.call(document.querySelectorAll(".shot"));
  var total = allFigs.length;
  q.addEventListener("input", function () {
    var needle = q.value.trim().toLowerCase();
    var shown = 0;
    allFigs.forEach(function (fig) {
      var hit = !needle || fig.getAttribute("data-search").indexOf(needle) !== -1;
      fig.classList.toggle("hidden", !hit);
      if (hit) shown++;
    });
    sections.forEach(function (sec) {
      var any = sec.querySelectorAll(".shot:not(.hidden)").length > 0;
      sec.classList.toggle("hidden", !any);
    });
    countEl.textContent = shown + " of " + total + " shots" +
      (needle ? " matching \u201C" + needle + "\u201D" : " \u00B7 " + sections.length + " sections");
    noResults.style.display = shown === 0 ? "block" : "none";
    updateActiveChip();
  });

  // Highlight the chip of the section at the top band (deterministic:
  // the last section whose top crossed 22% of the viewport — the observer
  // approach could mark an off-by-one when two sections overlap the band).
  var chipById = {};
  document.querySelectorAll(".chips a").forEach(function (a) {
    chipById[a.getAttribute("data-chip")] = a;
    a.addEventListener("click", function (e) {
      // Explicit scrollIntoView — a plain hash link to the section you are
      // already at does nothing (same-hash navigation is a no-op).
      e.preventDefault();
      var target = document.getElementById("sec-" + a.getAttribute("data-chip"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", "#" + a.getAttribute("data-chip"));
    });
  });
  var ticking = false;
  function updateActiveChip() {
    var line = window.innerHeight * 0.22;
    var current = null;
    sections.forEach(function (sec) {
      if (sec.classList.contains("hidden")) return;
      if (sec.getBoundingClientRect().top <= line) current = sec;
    });
    if (!current) {
      for (var i = 0; i < sections.length; i++) {
        if (!sections[i].classList.contains("hidden")) { current = sections[i]; break; }
      }
    }
    var id = current ? current.id.replace(/^sec-/, "") : null;
    Object.keys(chipById).forEach(function (k) {
      chipById[k].setAttribute("aria-current", k === id ? "true" : "false");
    });
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(updateActiveChip); }
  }, { passive: true });
  updateActiveChip();
})();
</script>
</body>
</html>`;
}

// ---- Server -----------------------------------------------------------------

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    // Image endpoint: /?img=c1/<relpath>&XTransformPort=3031
    // (an unprefixed path stays corpus 0 — the pre-R212 URL shape)
    const img = url.searchParams.get("img");
    if (img) {
      let corpusIdx = 0;
      let rel = img;
      const cm = /^c(\d+)\//.exec(img);
      if (cm) {
        corpusIdx = Number(cm[1]);
        rel = img.slice(cm[0].length);
      }
      const corpus = CORPORA[corpusIdx];
      if (!corpus) return new Response("not found", { status: 404 });
      const abs = resolve(corpus.root, rel);
      if (!abs.startsWith(corpus.root + "/") && abs !== corpus.root) {
        return new Response("forbidden", { status: 403 });
      }
      if (!existsSync(abs) || extname(abs).toLowerCase() !== ".png") {
        return new Response("not found", { status: 404 });
      }
      const bytes = readFileSync(abs);
      return new Response(bytes, {
        headers: {
          "content-type": "image/png",
          "cache-control": "no-store",
        },
      });
    }

    // Progress report view (R86): /report?XTransformPort=3031
    if (url.pathname === "/report") {
      const sections = scanFolderCorpus(0);
      const available = new Set(
        sections.flatMap((s) => s.shots.map((sh) => sh.rel)),
      );
      return new Response(
        buildReportHtml({
          img: (rel) => `/?img=${encodeURIComponent(rel)}&${GATEWAY_PARAM}`,
          has: (rel) => available.has(rel),
          galleryHref: `/?${GATEWAY_PARAM}`,
          reportHref: `/report?${GATEWAY_PARAM}`,
          contentDate: "2026-08-27",
          sections,
        }),
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }

    // Gallery page (any other path)
    return new Response(galleryHtml(scanAll()), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});

const corporaSummary = CORPORA.map(
  (c, i) => `c${i} ${c.mode} ${c.root} (${walk(c.root).length} pngs)`,
).join(" · ");
console.log(`[review-gallery] listening on :${server.port} — ${corporaSummary}`);
