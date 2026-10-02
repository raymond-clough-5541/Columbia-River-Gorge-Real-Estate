---
name: progress-report-pdf
description: Produce a progress report a non-technical stakeholder can actually assess — a locally-generated PDF where every claim sits next to its zoomable screenshot, progress numbers derive from a named source, and recommendations ship with the asks; the PDF is a screenshot artifact that never enters the repo. The executable package is a copy-to-any-project folder (portable-workflows/progress-report-pdf/); this skill carries the usage knowledge: the content shape, the engine seams, the mandatory QA gates. Use this skill when a stakeholder needs the project's state in a file that travels (email, print, offline), or when prose-only reports keep failing the "can they assess it" test.
license: MIT
---

# Portable Progress-Report PDF

The failure class this skill prevents: **web-only review surfaces
that die with the workspace** (the gallery link works until the
sandbox resets), **prose-only progress reports a non-technical
stakeholder cannot assess**, and **review PDFs (which embed
screenshots) leaking into the repos or the product app tree**.

## When to use

- A non-technical stakeholder must understand how the project works
  today, where frontend/backend honestly stand, how it is built, and
  how it is tested — in a file that travels (email, print, phone,
  offline).
- A review must carry screenshots the reader can zoom (any PDF
  reader's zoom is the large mode; embed at full capture resolution).

## The rules that make it work

1. **Every claim sits next to its screenshot.** If a claim and its
   screenshot disagree, trust the screenshot (and fix the report).
2. **Progress numbers derive from a named, current source** (e.g.
   the feature inventory), never from a feeling. Gaps are stated,
   never hidden.
3. **Recommendations ship with the asks** (option + reasoning +
   tradeoffs — pairs with `always-explain-format`); a bare question
   list is not reviewable.
4. **The PDF is a screenshot artifact**: generated locally,
   delivered to a download folder, gitignored, never committed or
   pushed. Only the generator tooling is committed.
5. **Plain language throughout**; a glossary translates any
   unavoidable technical term.

**The executable package lives at
`portable-workflows/progress-report-pdf/`** (cover template + body
generator + A4 merge + README with the full QA procedure). Copy that
folder into the target project; this skill is the usage knowledge.

## The engine (copy, do not rewrite)

- `cover.html`: a poster-style cover, rendered headless to PNG at
  A4 width.
- `generate_report.py`: the body engine — clickable table of
  contents, roman front matter + arabic body numbering, header/footer
  furniture, and builder helpers (chapter / heading / para / callout
  / stat strip / card / shot figure / data table).
- `build_final.py`: cover+body merge with document metadata.
- Env seams: `REPORT_SHOTS` (the screenshot corpus),
  `REPORT_OUT_DIR`, `REPORT_TITLE`, `REPORT_AUTHOR`,
  `REPORT_SUBJECT`.

## The content shape (rewrite per project, keep the discipline)

Cover -> TOC -> 1 About (how to read; the zoom tip) -> 2 What the
project is (+ requirements table) -> 3 Guided tour (a screenshot per
step, grouped in phases) -> 4 Frontend progress (cards + bars) ->
5 Backend progress (cards + bars; the honest sample-data headline) ->
6 How it is being built (the way of working; security in plain words;
functional honesty; the interface rules; accessibility + scalability)
-> 7 How it is tested (the layers; the change pipeline; the evidence
rules; the honest limits) -> 8 Milestones timeline -> 9 Open asks
WITH recommendations + next track + plain-language glossary.

## The QA gates (all mandatory)

1. Cover validation (the HTML template's own checks).
2. Build.
3. Sanitize before every run (the generator's clean-output mode).
4. TOC check (every TOC entry resolves to a real page).
5. PDF QA pass (page count, fonts, metadata).
6. A visual pass: render cover/TOC/tour/cards/stats/last pages to
   PNG and check for overlap, clipping, and last-page voids.

Pairs with: `review-gallery` (the live-review counterpart — the
gallery is the interactive surface, this is the file-that-travels)
and `always-explain-format` (the recommendations section).
