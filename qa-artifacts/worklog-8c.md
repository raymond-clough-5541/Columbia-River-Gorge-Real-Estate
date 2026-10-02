---
Task ID: 8-c
Agent: matrix subagent
Task: Pinned-set share-link copy button

Work Log:
- Read worklog.md (round-7 entry: pinned-set dossier 7-c, drill-from breadcrumbs 7-d, session-persistent pins; round-8 candidate "export pinned set as share link — m= serialization already exists in projections").
- Read matrix.tsx in full: confirmed the pinned-set strip (`role="region"` aria-label "Pinned set aggregate") renders only while `pinnedSet` is non-null; the "Model the pinned set" chip navigates `{view: "projections", query: m=${pins.join(",")}&s=1}` after stamping `sessionStorage["crgnsa-drill-from"] = "matrix"`; `useToast` hook already destructured in-file (line 284).
- Read projections.tsx lines 420-470 ONLY (as instructed) for the established clipboard pattern: `navigator.clipboard?.writeText` guarded with an `if`, explicit `throw` when the API is absent (optional chaining alone would silently no-op and misreport success), success toast, catch-block fallback toast.
- Implemented in matrix.tsx (only file touched):
  1. Import: added `Link2` to the lucide-react import list (alphabetical, between Flame and Pin) — the only new import.
  2. Handler `sharePinnedSet` (async, placed after `toggleSort`, before `return`; toasts fire at event time, never inside state updaters): null-guards `pinnedSet` for type safety (button only renders inside the strip), builds the absolute URL `${window.location.origin}${window.location.pathname}#/projections?m=${pins.join(",")}&s=1` — the exact serialization Projections restores on mount — then try/catch around `navigator.clipboard?.writeText`:
     - Success → toast "Share link copied" / "Anyone opening it lands in Projections with {N} pinned market(s) preloaded — {pinnedSet.names}." (names reuse the existing "A · B · C" string; N = pins.length, matching the slugs the URL encodes).
     - Clipboard blocked/absent → non-destructive toast "Couldn't reach the clipboard" / "Copy it manually: {the URL}" so the URL is readable/transcribable (headless environments block clipboard writes).
     - Deliberately does NOT stamp the drill-from flag — copying is not a navigation; a shared recipient gets a clean Projections session with no "← back to matrix" chip.
  3. JSX: wrapped the unchanged "Model the pinned set" chip + a new icon-only button in a `flex shrink-0 items-center gap-2` group so the pair reads as one action cluster and wraps together on narrow viewports (matches the SectionHeader action-group convention; the chip element itself is byte-for-byte unchanged). New button: `Link2` icon (h-3.5 w-3.5, aria-hidden), h-7 w-7 square, `rounded-md border border-amber-400/60 bg-amber-400/10 text-amber-700 dark:text-amber-300 hover:bg-amber-400/20`, `active:scale-[0.97]`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60`, `aria-label="Copy a share link for the pinned set"`, `title="Copy a share link — opens Projections with this pinned set preloaded"`.
- Comments added explain WHY (serialization reuse, drill-from non-stamping, clipboard-block fallback rationale, wrap-as-a-unit grouping).
- Verification: `bun run lint` → clean (zero output); `bunx tsc --noEmit 2>&1 | grep -E "^src/"` → zero matches (grep exit 1). No other files modified; no browser used (orchestrator owns QA).

Stage Summary:
- matrix.tsx (968 → 1013 lines): pinned-set strip now offers a share path in addition to navigation — an amber icon-only "Copy link" button beside the "Model the pinned set" chip that copies the absolute `#/projections?m=…&s=1` URL to the clipboard, with a success toast naming the preloaded markets and a blocked-clipboard fallback toast that surfaces the URL itself. Renders only while pins exist (inherits the strip's `pinnedSet` guard); drill-from flag intentionally unstamped for the copy action; modeling chip unchanged. Lint clean, tsc clean for src/. Suggested orchestrator QA: pin 2-3 markets → click the link button → toast shows names; headless clipboard block → fallback toast contains the URL; paste URL in a fresh tab → Projections restores the markets with NO back-link chip; mobile 390px → chip + copy button wrap as a unit with no overflow.
