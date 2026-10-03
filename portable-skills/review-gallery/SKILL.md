---
name: review-gallery
description: Deliver visual sign-offs in a medium the reviewer can actually use — a dependency-free local web gallery that walks any folder of PNG screenshots (round-grouped, captioned, keyboard-navigable, full-screen scan with fill/fit/zoom contract), never inside the product app's served tree, with the PNGs never committed. The executable engine is a copy-to-any-project package (portable-workflows/review-gallery/); this skill carries the usage knowledge: the corpus seam, the run command, the keep-alive pattern, the guard self-test. Use this skill whenever a non-technical reviewer must approve UI state from real screenshots, or when review artifacts keep leaking into the product tree.
license: MIT
---

# The Portable Review Gallery

The failure class this skill prevents: **visual sign-offs delivered in
a medium the reviewer cannot use** — asking a human to approve UI
state from a text document or a table of filenames (two consecutive
rounds were lost to exactly this on the source project), and the
over-correction failure where "no review pages in the app" pushed the
review to prose-on-a-website, which fixed the location and broke the
medium. The constraints were always compatible: not-in-app AND
visually-reviewable AND screenshots-never-pushed.

## The pattern (engine + one seam + a keep-alive)

**The executable package lives at `portable-workflows/review-gallery/`**
(engine + guard self-test + README). Copy that folder into the target
project; this skill is the usage knowledge.

- The **engine** (dependency-free: node fs + a tiny HTTP server)
  walks a corpus root for PNGs, groups them into sections
  (top-level folders, newest-captured first), reads optional
  per-folder `captions.json`, and renders a one-page dark grid with
  a keyboard-accessible lightbox:
  - opening a shot lands DIRECTLY in full-screen scan (the opening
    click is the user-activation gesture, so the Fullscreen API
    engages in normal browser contexts; a CSS class fills the
    viewport as the always-works fallback where the API rejects —
    headless browsers, iOS Safari, iframes);
  - the **fit contract**: in scan mode the image itself fills the
    screen edge to edge (`object-fit: cover` + center crop); `F`
    toggles the windowed fit-whole-shot view; `Z` toggles native
    1:1 zoom (scrollable); `Home`/`End` jump to the ends;
    arrow keys walk from the gallery itself; only backdrop clicks
    close; a typing guard keeps the keys away from inputs.
- The **one seam** is `CORPUS_ROOT` (env): point it at any folder of
  PNGs. `PORT` defaults to 3031.
- **Gateway awareness**: asset URLs can embed a port-forwarding
  query param so the page and its images route through a sandbox
  gateway; direct access ignores it.
- The **keep-alive pattern**: sandbox/tool shells often reap
  backgrounded descendants when a command returns. The working
  pattern is the **double-fork orphan**: an intermediate shell starts
  the supervisor and exits immediately while the outer command is
  still running, so the supervisor re-parents to init and survives.
  (Plain backgrounding verified NOT to survive.)

## The wiring (copy into any project)

1. Copy `portable-workflows/review-gallery/`, then run its
   `bun self-test.mjs` (21 assertions in the reference package —
   corpus traversal 403, PNG-only 404, content types, the
   served-HTML machinery markers). Exit 0 = the guard model holds in
   YOUR environment. If it fails, do not ship.
2. Run: `CORPUS_ROOT=/path/to/screenshots PORT=3031 bun index.ts`.
3. Keep it alive with the double-fork orphan pattern.
4. Reviewer URL: the gallery link (+ your proxy's port param if
   behind a gateway).

## The discipline that travels with the pattern

- **Screenshots are NEVER committed/pushed** — the corpus is a local
  folder; only text analyses are committed.
- **The gallery NEVER lives inside the product app's served tree** —
  it is tooling beside the app, not a page in it (pairs with
  `commit-gate`: staging a review artifact into the app tree blocks
  the commit).
- A visual sign-off ask = the gallery link + the shot filenames named
  in the ask (where/what-you-see) + the recommendation — never a
  text doc as the primary review surface (pairs with
  `always-explain-format`).
- A progress walkthrough for a non-technical reviewer pairs every
  claim with its screenshot and states honest progress numbers from
  a named source (pairs with `progress-report-pdf` for the
  file-that-travels variant).

Pairs with: `verified-build-round` (the walk's shots land in the
corpus; the gallery is the review surface) and `receipts-or-retract`
(the shots are the visual receipts).
