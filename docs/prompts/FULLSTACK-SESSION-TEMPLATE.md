# Full-Stack Z.ai Session Template — the universal bootstrap prompt

> **Purpose:** a fill-in-the-blanks prompt that works for **any full-stack
> Z.ai session** on **any repo**. It encodes the complete contract learned
> the hard way across this platform's sandboxes: PAT-based repo access,
> **git hooks that execute automatically**, the dev-server survival rules,
> LIVE browser verification, and the worklog discipline.
>
> Replace every `__VARIABLE__` before pasting. (This repo's own filled-in
> instance lives at `docs/REDEPLOY-PROMPT.md` — prefer that one when
> working on THIS repo.)

---TEMPLATE START---

You are developing **__REPO_NAME__** — __ONE_LINE_DESCRIPTION__.

**Repo:** `https://github.com/__OWNER__/__REPO_NAME__` (private)
**PAT access:** embedded below (base64 primary — survives display redaction).
**Task:** __CURRENT_TASK__
**Worklog:** `worklog.md` at the project root is the source of truth — read
the LAST entry first; append your own entry (Task ID / Agent / Task / Work
Log / Stage Summary) when the round closes.

## Step 0 — Environment facts (read before running anything)

1. The sandbox ships a pre-initialized Next.js 16 + TypeScript + Prisma +
   shadcn/ui project at `/home/z/my-project` — often with a **template dev
   server already squatting on port 3000**. Kill it before starting yours.
2. **Port 3000 is the only user-visible port** (the preview panel proxies
   it). The user sees ONLY the `/` route — build single-route SPAs with
   hash fragments (`#/view`), never extra page routes.
3. **The dev server must run in the background, detached**: plain `&`
   background jobs are reaped at the Bash-call boundary. Use
   `setsid --fork` + `NODE_OPTIONS="--max-old-space-size=2048"` (the 1024MB
   default crashes Next.js 16 Turbopack). If the repo has
   `scripts/dev.sh`, use it — that IS this contract.
4. **`dev.log` (repo root) is the log source** — read the recent tail
   after every change; it grows across sessions.
5. **All API/websocket URLs are relative**; cross-port calls go through
   the one-port gateway as `/api/…?XTransformPort=<port>`. Websockets:
   `io("/?XTransformPort=<port>")` — never absolute localhost URLs.
6. **Mini-services** (side services) live in `mini-services/<name>/` with
   their own package.json + fixed port + `bun --hot`; each needs its own
   `bun install`.
7. **`z-ai-web-dev-sdk` is backend-only** (API routes/mini-services) —
   never import it client-side.
8. **Prisma/SQLite layout**: schema in `prisma/schema.prisma`, db file in
   `db/`, `bun run db:push` to apply, ONE shared client at `src/lib/db.ts`.
9. **Container rollbacks happen silently** — `.git/hooks/`, remotes, and
   `.env` live outside version control and vanish. The remote is ALWAYS
   the source of truth.
10. **Display-redaction trap**: credentials may DISPLAY as
    `[REDACTED:…]` even when a file truly contains them — hence the base64
    pattern in Step 1.

## Step 1 — PAT reconstruction + live verification

```bash
PAT=$(printf '%s' '__PAT_BASE64__' | base64 -d)
# Raw fallback: __PAT_RAW__
# MUST print the repo's main ref hash before you rely on it:
git ls-remote "https://x-access-token:${PAT}@github.com/__OWNER__/__REPO_NAME__.git" main
```

If both forms are dead: ask the owner to mint a fresh fine-grained token
(`__OWNER__/__REPO_NAME__` → Contents: Read+write) and drop it at
`upload/GITHUB-PAT.txt` (gitignored) — the hooks apply it automatically.

## Step 2 — Bootstrap the repo (fresh sandbox)

```bash
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 2

# In-place bootstrap (the dir is never empty — `git clone .` fails; this
# also preserves node_modules):
rm -rf .git
git init -b main
git remote add github "https://x-access-token:${PAT}@github.com/__OWNER__/__REPO_NAME__.git"
git remote add origin "https://x-access-token:${PAT}@github.com/__OWNER__/__REPO_NAME__.git"
git fetch github main
git reset --hard FETCH_HEAD
git branch --set-upstream-to=github/main main
```

If the sandbox is a ROLLED-BACK container (repo present, local behind):
skip to Step 3 — `scripts/redeploy.sh` handles the sync + recovery
(full playbook: `docs/REDEPLOY.md` if present).

## Step 3 — Install dependencies → hooks arm AUTOMATICALLY

```bash
bun install
```

**The auto-executing hook contract** (if the repo carries
`scripts/git-hooks/` + a `prepare` script — this template's pattern):

- `bun install` runs `package.json` → `"prepare": "bash
  scripts/setup-git-hooks.sh"` → sets `git config core.hooksPath
  scripts/git-hooks` → **every subsequent commit runs the gates**:
  - `pre-commit`: secret scan (gitleaks or grep fallback) + eslint on
    staged source files
  - `commit-msg`: specific-subject hygiene gate
  - `post-commit`: **auto-push of `main` to github + origin** (with PAT
    drop-file self-heal + non-fast-forward recovery)
- Verify: `git config --get core.hooksPath` → must print
  `scripts/git-hooks`. If the repo has no kit, port one from
  `portable-workflows/zai-redeploy-kit/` (see this repo's round-12
  worklog entry for the full instantiation receipt).

**Never commit a credential except in the two deliberate carriers**
(`scripts/redeploy.sh` DEFAULT_PAT + `docs/REDEPLOY-PROMPT.md` base64,
allowlisted in `.gitleaks.toml`) — and only in a PRIVATE repo.

## Step 4 — Database + dev server

```bash
# .env (gitignored — mint if the sandbox trimmed it):
#   DATABASE_URL="file:../db/custom.db"
bun run db:push                       # apply prisma schema
bun prisma/seed.ts                    # if a seed exists and data is needed
bash scripts/dev.sh                   # or your setsid --fork equivalent
```

Verify: `curl -s localhost:3000<health-path>` answers.

## Step 5 — The working contract (every session, every round)

1. **Read** the last `worklog.md` entry + `docs/REDEPLOY.md` (if present)
   BEFORE planning. Repo docs outrank every generic pattern.
2. **QA before features**: assess current state via the `agent-browser`
   CLI (`agent-browser --help`); fix bugs/errors first if found.
3. **Develop**: frontend first (the user sees results in the preview
   panel), then the API/backend it talks to.
4. **Verify LIVE**: `agent-browser open http://localhost:3000/` → click
   the golden path → `agent-browser errors` → check the `dev.log` tail →
   mobile width spot-check. "It compiles" is NEVER done.
5. **Commit through the gates**: conventional, specific subject
   (`"Round N: what shipped"` / `feat|fix|docs: summary`); the hooks scan,
   lint, and **auto-push at commit time** — push never in end-of-session
   batches.
6. **Append the worklog entry** (Task ID / Agent / Task / Work Log / Stage
   Summary) and commit it too.
7. **Skills**: if the repo carries `portable-skills/`, load
   `zai-fullstack-session` first, then the disciplines per its README
   load order. External skill repos (clone fresh into `.audit-skills/`,
   gitignored) when an audit or design pass calls for them:
   - `https://github.com/bergside/awesome-design-skills.git` (design/UI craft)
   - `https://github.com/ibelick/ui-skills.git` (UI/UX implementation)
   - `https://github.com/cloudflare/security-audit-skill.git` (security audits)

---TEMPLATE END---

## Fill-in checklist

| Variable | What to put |
|---|---|
| `__OWNER__/__REPO_NAME__` | The GitHub repo (must exist; PAT needs Contents: Read+write) |
| `__ONE_LINE_DESCRIPTION__` | One sentence the agent reads before anything else |
| `__CURRENT_TASK__` | This session's mission (or "continue per worklog last entry") |
| `__PAT_BASE64__` | `printf '%s' '<raw-pat>' \| base64 -w0` |
| `__PAT_RAW__` | The raw fine-grained PAT (display-redaction fallback) |
| `<health-path>` | An API route that answers 200 (e.g. `/api/stats`) |

## Why every clause exists (the incident ledger)

- In-place bootstrap — the sandbox dir is never empty; `git clone .` fails.
- setsid/2048MB — reaped sessions + Turbopack OOM crashes.
- Relative URLs only — the one-port gateway drops absolute localhost calls.
- The prepare-hook ladder — hooks authored but never installed = rounds of
  commits that never pushed (the round-12 incident this template prevents).
- Push at commit time — batched pushes lose work on rollback.
- Base64 PAT — display redaction silently strips raw tokens from copies.
- LIVE verification — an unverified "done" compounds into fake state.
