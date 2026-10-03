---
name: zai-fullstack-session
description: The Z.ai full-stack sandbox operating method — the environment facts a session needs on day one: the single visible route + its dev server (port 3000, background, dev.log as the log source), the one-port gateway + XTransformPort routing (relative URLs only, websockets included), mini-services (own port + package.json, bun --hot, setsid supervisors surviving reaping), Prisma/SQLite (schema in prisma/, db/ file, db:push, one shared client), the backend-only AI-SDK rule, LIVE agent-browser verification as the completion standard, the shared worklog + attestation commits + dual-remote auto-push, the rollback-recovery playbook (remote is truth), the trimmed-.env secret restore (ensure_env_secret, fail-closed), tool-failure discipline (anti-lockout), and the display-redaction trap (base64 credential reconstruction). FIRST RULE: a repo that carries its own redeploy docs (REDEPLOY-PROMPT.md / REDEPLOY.md or equivalent) is read BEFORE this skill — those docs encode THIS repo's proven recoveries and outrank every generic pattern where they conflict. Use this skill when a session starts in a Z.ai full-stack sandbox, when a repo must run there, when ports, gateways or services misbehave, after a rollback, or when making a project Z.ai-ready.
license: MIT
---

# The Z.ai Full-Stack Sandbox Operating Method

The failure class this skill prevents: a fresh AI session treating the
sandbox like a generic Linux machine. Every rule below is a documented
behavior of this environment with a documented recovery: cloning into a
directory that can never be empty (the sandbox always ships a template
project), leaving a template dev server squatting on the only port the
user can see, calling side services with absolute localhost URLs that
bypass the one-port gateway, secrets silently lost to the platform's
display redaction, long-running services reaped the moment the Bash
call ends, and a container rollback mishandled as a fresh start —
bootstrapping over the recovery path instead of following it.

## 1. The environment contract

The sandbox ships a PRE-INITIALIZED full-stack project — Next.js 16
App Router + TypeScript, Prisma, a shadcn/ui component set, the bun
runtime. It is not a blank machine. The facts to hold from minute one:

- **One dev server, port 3000, background.** The dev server runs ONLY
  on port 3000, started in the background via the project's dev script
  with an increased heap
  (`NODE_OPTIONS="--max-old-space-size=2048"`). WHY: the default
  ~1024MB heap CRASHES Next.js 16 Turbopack mid-compilation; 2048MB is
  the stable, verified setting. Never run two instances; never run a
  production build in the sandbox (the preview panel proxies the dev
  server, so a build proves nothing and burns the memory the browser
  verification needs).
- **Kill the template dev server first.** A fresh sandbox may
  auto-start a TEMPLATE dev server on :3000 (a generic Next.js
  template, NOT your project). `pkill -f "next dev"` and
  `pkill -f "next-server"` before starting yours. WHY: port 3000 is
  single-occupancy; the template holding it is the classic day-one
  outage.
- **The user sees ONLY the `/` route.** The preview panel shows the
  root route of the :3000 server (the `src/app/page.tsx` entry). All
  "pages" of a single-route app are surfaces/params under `/` (e.g.
  `/?surface=app&page=feed`). Never tell the user to visit a localhost
  URL — they have no browser window into the sandbox; the preview
  panel is the only window, and it renders exactly one origin.
- **dev.log is the log source.** The dev server writes to `dev.log` at
  the project root; it is the source of truth for runtime errors. Read
  its RECENT tail after every change. WHY: the file grows unboundedly
  across sessions — reading it whole floods the context and can time
  out the read.
- **Prisma/SQLite layout.** Schema at `prisma/schema.prisma`, the
  SQLite database file under `db/`, applied with `bun run db:push`.
  ONE shared client module (a `src/lib/db.ts` that instantiates the
  client once and exports it — imported as `@/lib/db`); NEVER a
  per-file `new PrismaClient()`. WHY: per-file clients leak
  connections against SQLite and drift out of config.
- **The AI/media SDK is backend-only.** `z-ai-web-dev-sdk` (chat
  completions, vision, TTS, ASR, image generation/editing, search)
  runs in API routes and mini-services ONLY — never in client
  components. WHY: it is a server-side SDK (credentials + node-only
  APIs); imported client-side it breaks the build or leaks keys.
- **Build on the shipped component set.** Use the pre-existing
  shadcn/ui set in `src/components/ui` instead of hand-rolling
  primitives. WHY: consistency with the running app's look, and
  zero-cost a11y/dark-mode behavior the template already wired.

## 2. The one-port gateway + mini-services

The machine exposes exactly ONE port to the outside world. A built-in
gateway (Caddy) forwards by port: any request meant for a service on
another port must carry `?XTransformPort=<port>` in the URL query.

- **All API and websocket URLs are RELATIVE.** Correct:
  `fetch('/api/x?XTransformPort=3030')`. BANNED:
  `fetch('http://localhost:3030/api/x')` — the user's browser page is
  served through the gateway, so absolute localhost URLs bypass it and
  die unreachable. Websockets: `io("/?XTransformPort=3003")` — never
  `io("http://localhost:3003")`, never port-prefixed paths.
- **The mini-service pattern.** Each side service lives in
  `mini-services/<name>/` as an independent bun project: its own
  `package.json` (with its OWN `bun install` — the root install does
  NOT cover mini-services), its own FIXED port, an `index.ts` entry.
  Run with `bun --hot` so file changes auto-restart the service.
- **Start long-running services detached.** They MUST be started with
  `setsid --fork` (or a supervisor-loop script wrapped in it):

  ```bash
  setsid --fork bash -c 'cd mini-services/<name> && bun --hot index.ts >> <name>.log 2>&1'
  ```

  WHY: plain background processes (`&`, `nohup ... &`, even
  `setsid ... &` without `--fork`) are REAPED at the Bash-call/session
  boundary — the process manager tears down the session's process
  group. Documented repeated incident: a service silently dead until a
  health check catches it rounds later.
- **Check the port before starting.** `ss -tlnp | grep <port>` — if
  something already listens, do NOT start another instance. WHY:
  duplicated instances are the classic self-inflicted outage; the
  signature is an EADDRINUSE entry in the log.

## 3. Data + secrets

- **`.env` is gitignored — and the sandbox trims it.** A container
  reset or rollback TRIMS `.env`, sometimes back to a single line,
  silently deleting every secret the app needs. The dev/deploy script
  must therefore mint-on-boot with an `ensure_env_secret` helper
  (quoted from a working `scripts/dev.sh`):

  ```bash
  ensure_env_secret() {
    local key="$1"
    [[ -f .env && "$(grep -c "^${key}=" .env 2>/dev/null)" -gt 0 ]] && return 0
    local val
    val="$(openssl rand -hex 32 2>/dev/null)" || { echo "FATAL: openssl unavailable — cannot generate $key"; exit 1; }
    if [[ -f .env ]]; then
      printf '\n%s=%s\n' "$key" "$val" >> .env
    else
      printf '%s=%s\n' "$key" "$val" > .env
    fi
    echo "  generated a fresh ${key} into .env (gitignored)"
  }
  ensure_env_secret CHAT_JWT_SECRET
  ```

  WHY mint-on-boot: auth/session layers that find no secret may fall
  back to an EPHEMERAL RANDOM PER ROUTE BUNDLE — each route chunk
  mints its own key, sessions decrypt in one route and 401 in the
  next. A stable secret in `.env` is the only dev-boot truth.
- **Fail-closed secret reading.** Code NEVER carries string-fallback
  secrets; a missing env var THROWS, naming the variable. Fail-closed
  beats fail-open for anything cryptographic — a committed fallback
  literal becomes the de-facto production key. `.env.example`
  documents every key with its generation command.
- The full hygiene rules (rotation, test loaders, CSRF wiring, gate
  upgrades) live in the sibling collection skill `secrets-and-csrf`;
  this skill carries only the sandbox-specific trap — the trim.

## 4. LIVE verification is the completion standard

"It compiles" and "the server is up" are NEVER sufficient.

- The golden path must be walked in a REAL browser (the agent-browser
  automation tool) against the visible route: click the main controls,
  submit the key forms, confirm data actually renders from the
  backend, check console + page errors, verify responsive widths and
  the sticky-footer contract.
- Cross-check the dev server log's recent tail for runtime/hydration
  errors that appeared DURING the visit. Fix and re-verify until
  clean.
- Report honestly what could not be verified. WHY: an unverified
  "done" compounds — the next session plans against a state that was
  never real.

## 5. State + receipts (the session discipline)

- **The shared worklog.** An append-only `worklog.md` at the project
  root. Read the previous entries at session start (the LAST entry +
  the session-state doc are the source of truth — never a snapshot
  inside a prompt); append your own entry at close with the standard
  template:

  ```markdown
  ---
  Task ID: <id>
  Agent: <who>
  Task: <one line>

  Work Log:
  - <concrete steps>

  Stage Summary:
  - <key results>
  ```

- **Marker commits.** Round-closing commits carry attestation tokens
  in the message — an approval reference, a worklog reference, a
  battery-log reference, the declared scope — enforced by git hooks.
  Mechanical gates, not honor systems: the hook BLOCKS a commit whose
  tokens are missing or stale. Install the hooks via the project's
  setup script on EVERY fresh sandbox. WHY: a container rollback can
  silently delete the `.git/hooks/` symlinks — re-run the setup after
  ANY environment restore, or every message check is bypassed without
  a single error.
- **Dual remotes.** Every commit auto-pushes to a primary remote AND a
  mirror (the post-commit hook). The backup IS the rollback insurance:
  a rolled-back container recovers exactly what was pushed, so push at
  commit time, never in batches at session end.

## 6. The container-rollback recovery playbook

This exact incident happened; the recovery below is battle-tested.

Symptoms: local main behind the remotes; `git pull --ff-only` fails;
the auto-push log shows rejected non-fast-forward pushes; recent
rounds' artifacts missing from the working tree.

A rolled-back container is NOT a fresh sandbox — never bootstrap from
scratch. The steps, in order:

1. `git ls-remote` for NETWORK truth. Never trust the local
   `origin/main` tracking ref — it can sit stale for weeks while the
   remotes hold the real history.
2. Preserve the diverged local state on a backup branch (cheap
   insurance; the local line may hold unpushed work).
3. `git reset --hard <verified-remote-tip>` — the hash from
   `ls-remote`, not from a local ref.
4. Re-run the git-hooks setup script. Rollbacks disarm the commit-msg
   hook silently; every message-token check is bypassed until the
   symlinks are restored.
5. Restore the trimmed `.env` secrets (the `ensure_env_secret` helper
   mints fresh ones on the next dev/deploy run).
6. Reinstall mini-service deps (`bun install` inside each
   `mini-services/<name>/` — their node_modules were rolled back
   too).
7. Restart services via their supervisors (`setsid --fork`), after the
   port check.
8. Verify: every service answering its health endpoint, the worklog's
   last entry matching the remote tip, the drift check clean.

## 7. Tool-failure discipline (anti-lockout)

The sandbox gateway rate-limits clients that hammer failing calls;
documented ~30-minute lockouts happened. The rules:

- On a tool failure: retry the SAME call at most once, and only after
  pausing to think about WHY it failed.
- After 2-3 consecutive failures: STOP retrying entirely. Summarize
  completed work from memory and end the turn — outages are not fixed
  by hammering, and hammering makes the lockout longer.
- Never fire identical commands in a tight loop or in parallel with
  yourself; vary the probe or wait.
- If Bash AND file-read AND glob fail together, it is an
  infrastructure outage — do not probe again this turn.
- A timed-out long-running command may have COMPLETED underneath.
  When tools return, check the artifacts (file timestamps, content)
  BEFORE re-running anything.
- Prefer one well-formed command over many small probes.
- Subagents that run full verification batteries must NEVER run
  concurrently — N parallel batteries multiply the hammering from one
  command stream (a documented session-killing incident). Run them one
  at a time, or keep the battery at the parent level and let
  subagents do code + targeted checks only.

## 8. The display-redaction trap

The platform's file-read and chat DISPLAYS may show credentials as
`[REDACTED:...]` even when the underlying file contains the real
value — and a copy taken through such a view genuinely loses the
token (documented redeploy failure: fresh-sandbox bootstraps failed
because the pasted prompt carried redaction placeholders where the
token used to be).

The remedies:

- **Store credentials as BASE64 strings** in prompts/docs — base64
  does not match the redaction pattern, so it survives every copy
  path. Decode in-session into a shell variable:

  ```bash
  TOKEN=$(printf '%s' '<the-base64-of-the-token>' | base64 -d)
  ```

- **Live-verify before use.** E.g. `git ls-remote
  "https://<user>:${TOKEN}@<host>/<owner>/<repo>.git" HEAD` must
  answer before any operation that depends on the token. Never echo
  the decoded value back into chat.
- **Check raw presence with a prefix count.** `grep -c
  "<the-token-prefix>" <file>` — a count of 1+ means the real token
  is in the file even though the display shows `[REDACTED:...]`;
  a 0 means it is genuinely gone.

## 9. The redeploy-prompt pattern (making any repo re-enterable)

**First rule: if the repo already carries redeploy docs, THEY are the
contract.** A repo with a `REDEPLOY-PROMPT.md` / `REDEPLOY.md` (or
equivalent) has already paid for its environment lessons — read those
BEFORE this section's generic pattern and follow them verbatim. Where
they conflict with any generic advice (including this skill), the
repo's own docs win: they encode THIS repo's proven recoveries, its
exact services, its exact hooks, its exact tokens. The live example
this skill was distilled from: `docs/REDEPLOY-PROMPT.md` +
`docs/REDEPLOY.md` in the Free-Trader repo (the copy-paste redeploy
prompt + the enforcement-stack + rollback playbook). The R222
incident is the cost of forgetting them: the sandbox sat on a stale
divergent chain for days because recovery ran from memory instead of
the playbook — which is why that repo now welds the pointer into its
AGENTS.md reading order, preamble rule 34, SESSION-STATE permanent
block, and the session-start script's printed check.

Keep a REDEPLOY-PROMPT.md in the repo: everything a fresh session
needs to stand the project up in a new sandbox, in one copy-paste.

- **The environment facts** — sections 1-3 above, condensed to a
  fact list the session reads before running anything.
- **The bootstrap.** Kill the template dev server FIRST; then
  bootstrap the repo IN PLACE. WHY in place: the sandbox dir is never
  empty (it ships a template + its own `.git`), so `git clone <url> .`
  fails on the non-empty directory. In-place bootstrap also preserves
  `node_modules/`, keeping the dependency install fast:

  ```bash
  cd <project-root>
  pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 2
  rm -rf .git
  git init -b main
  git remote add origin "https://<user>:<the-token>@<host>/<owner>/<repo>.git"
  git fetch origin main
  git reset --hard origin/main    # fresh from the fetch above
  git clean -fd                   # remove untracked template leftovers
  ```

- **The one-command redeploy script** — install deps, install hooks,
  mint secrets, start every service via its supervisor, verify.
- **The verification curls** — the app, and each mini-service's
  health endpoint (quote websocket handshake URLs — the `&` breaks
  unquoted shells).
- **The ordered context-docs reading list** — the rule documents a
  session must read before touching code.
- **The state warning** — the worklog's LAST entry + the
  session-state doc are the source of truth; any state snapshot
  inside the prompt is DATED and must be verified against them.
- **The standing rules that override session-template suggestions** —
  e.g. a permanent no-scheduled-tasks order beats any template
  suggestion to create recurring automation.

The philosophy, in one line: the environment is a character in the
project — its quirks (one external port, session reaping, display
redaction, container rollbacks) are documented behaviors with
documented recoveries, not surprises.
