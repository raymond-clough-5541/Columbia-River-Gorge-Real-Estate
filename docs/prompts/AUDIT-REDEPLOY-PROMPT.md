# Audit Redeploy Prompt — UI + Backend Security Audits

> **Purpose:** paste this into a fresh AI session (Z.ai full-stack sandbox
> or any agent with a browser + shell) to run BOTH audits on this repo:
> the **UI/design audit** and the **backend security audit** — using the
> repo's own workflows + skills AND the three external skill repos:
>
> - https://github.com/bergside/awesome-design-skills.git
> - https://github.com/ibelick/ui-skills.git
> - https://github.com/cloudflare/security-audit-skill.git
>
> The GitHub Actions workflows (`.github/workflows/ui-audit.yml` +
> `security-audit.yml`) run the deterministic half on GitHub's runners;
> this prompt runs the judgment half in a live session. Do both: the
> workflow receipts + this session's receipts belong in the report.

---PROMPT START---

You are auditing **KeyWolfpack/fsbo** — Gorge Capital Intelligence, a
production-grade CRGNSA real-estate & land-supply analytics platform
(Next.js 16 App Router + TypeScript strict + Tailwind 4 + shadcn/ui +
Recharts + Prisma/SQLite; single-route SPA on `/` with hash fragments).

**Repo:** https://github.com/KeyWolfpack/fsbo (private)
**Mission:** run the full UI audit AND backend security audit, produce two
committed reports with receipts, fix nothing yet — findings only (fixes
are scheduled by the owner from the reports).

## Step 0 — Redeploy first (the environment contract)

Follow `docs/REDEPLOY-PROMPT.md` Steps 0–4 verbatim (PAT reconstruction
from base64 → bootstrap/pull → `bash scripts/redeploy.sh` → verify
`git config core.hooksPath` prints `scripts/git-hooks`). The audits run
against a LIVE dev server on :3000 — confirm
`curl -s localhost:3000/api/stats` answers 200 before continuing.

## Step 1 — Stage the skills (three external repos + this repo's own)

```bash
mkdir -p .audit-skills docs/audits
git clone --depth 1 https://github.com/bergside/awesome-design-skills.git .audit-skills/awesome-design-skills
git clone --depth 1 https://github.com/ibelick/ui-skills.git            .audit-skills/ui-skills
git clone --depth 1 https://github.com/cloudflare/security-audit-skill.git .audit-skills/security-audit-skill
# (.audit-skills/ is gitignored — the CLONED rubrics are never committed;
#  the FINDINGS are, in docs/audits/.)
```

Read order: each repo's top-level README/SKILL files first — they are the
rubric. Then this repo's own quality disciplines from `portable-skills/`:
`cold-audit-discipline` (no score-chasing, no leading prompts, judge
noise), `audit-driver` (evidence integrity — scripts copied verbatim into
the report, outputs attached), `contrast-check` (measured contrast claims
only), `anti-ai-ui-style` + `four-axis-filter` (UI findings must be
functional, not decoration), `secrets-and-csrf` (backend), and
`receipts-or-retract` (every claimed finding carries a command + output;
otherwise retract it).

## Step 2 — Kick off the GitHub Actions half (server-side receipts)

```bash
# Requires: gh CLI authenticated, or click "Run workflow" in the Actions UI:
gh workflow run ui-audit.yml       --repo KeyWolfpack/fsbo --ref main
gh workflow run security-audit.yml --repo KeyWolfpack/fsbo --ref main
gh run watch                        # capture the run URLs + summaries
```

## Step 3 — THE UI AUDIT (design + interaction + a11y)

Scope: every surface of the single-route SPA — `#/` (overview KPIs, map,
framework explorer, tax-arbitrage calculator), `#/matrix` (sortable
ledger), `#/projections` (compound visualizer + sliders), `#/listings`
(filters + dossier dialog), `#/submarket/<slug>` — plus dark/light themes
and mobile 390px. Components live in `src/components/gorge/`.

Rubric sources: `.audit-skills/awesome-design-skills` + `.audit-skills/ui-skills`
(typography rhythm, spacing scale, hierarchy, motion/states, focus order,
form/detail patterns, visual craft) — APPLY their checklists to this
codebase; where a checklist item is generic, cite which skill + which item.

Method (agent-browser, LIVE — receipts mandatory):

```bash
agent-browser open http://localhost:3000/
agent-browser screenshot docs/audits/__DATE__-ui-01-overview.png
agent-browser a11y http://localhost:3000/ --json          # axe-core: WCAG violations
agent-browser open "http://localhost:3000/#/matrix"       # …repeat per surface
agent-browser set viewport 390 844 && agent-browser screenshot …
agent-browser media dark   # dark-mode pass
agent-browser console && agent-browser errors             # must be zero
agent-browser vitals http://localhost:3000/               # LCP/CLS/INP receipts
```

Grade each surface on the rubric axes (typography, spacing, hierarchy,
interaction states, a11y, responsive, dark mode, performance) — finding →
severity (blocker/major/minor/polish) → evidence (screenshot/axe output/
selector) → suggested fix. The repo's established aesthetic is
editorial-financial (slate/zinc + emerald accents, tabular numerals) —
findings that would erase that identity are out of scope.

## Step 4 — THE BACKEND SECURITY AUDIT

Rubric sources: `.audit-skills/security-audit-skill` (its methodology —
apply its checklist categories verbatim, citing which) + this repo's
`portable-skills/secrets-and-csrf`.

Minimum coverage (add what the skill repos demand):

1. **Secrets**: `gitleaks detect --redact` (or the CI workflow's receipt);
   grep for `github_pat_|ghp_|api[_-]?key|secret|token` across the tree;
   verify the ONLY committed credential is the deliberate R94 pair
   (`scripts/redeploy.sh` DEFAULT_PAT + `docs/REDEPLOY-PROMPT.md`),
   allowlisted in `.gitleaks.toml`, repo private. Flag the model itself
   as a risk if the repo could ever go public.
2. **Dependencies**: `bun audit` (report every advisory + fix path).
3. **API surface** (`src/app/api/*`): input validation (zod?) on every
   query param; error responses leaking stack/internal details; Prisma
   query injection surface (raw queries?); mass-assignment risk on any
   future write route; rate limiting absence (document as accepted-risk
   for a read-only analytics API or propose a fix).
4. **Data layer**: `prisma/schema.prisma` + `supabase/migration.sql` —
   verify the RLS policies actually restrict `anon` to read-only and
   `service_role` writes (cite the policy lines).
5. **Client-side exposure**: `next.config.ts` headers (CSP/X-Frame-Options/
   HSTS), `dangerouslySetInnerHTML` grep, image URL handling.
6. **Auth surface**: NextAuth is a dependency but unused (read-only app) —
   confirm no route imports it half-wired; flag NEXTAUTH secret handling
   if any route starts using it.

## Step 5 — The reports (committed, with receipts)

Write exactly two files (plus screenshots):

```
docs/audits/__DATE__-ui-audit.md        # rubric sources cited, per-surface
                                        # grades, findings table w/ evidence
docs/audits/__DATE__-security-audit.md  # category coverage checklist, every
                                        # finding w/ command + output, risk
                                        # ratings, remediation order
```

Then: `git add docs/audits/ && git commit -m "qa: UI + security audit
reports (round N)"` — the armed hooks run the secret scan (expect PASS)
and auto-push to both remotes. Append the audit summary to `worklog.md`
(same commit or a follow-up).

---PROMPT END---

## Notes for the owner

- The workflows alone are not the audit — they are the deterministic half
  (lint/tsc/gitleaks/dep-audit/axe-on-runner). The session prompt above
  is the judgment half. Run both; file the receipts together.
- Schedule: run the full pair before every market-launch gate (see
  `docs/EXPANSION-PLAN.md` §7) and after any dependency bump touching
  auth/network/data layers.
- `security-audit.yml` also self-runs weekly (cron) — check the Actions
  tab for drift between full audits.
