---
name: production-deploy-stack
description: Wire a local-first app into the Supabase + Cloudflare + GitHub production-testing stack, the AI holding the keys: the 3-environment topology (local, disposable staging, locked prod), Supabase as code (two projects, migrations + RLS policies, service_role server-side), branch-mapped Cloudflare deploys (preview per PR, staging on main, prod on tags), GitHub Actions as the CI gate, the three scoped AI credentials for database setup + security testing (GitHub PAT; Supabase ref + DB password + service key; Cloudflare API token — copy-proof base64, live-verified), the security checklist with receipts (RLS probes, auth flows, CSRF, WAF + Turnstile, bundle secret scan), and private preview in layers (Access + service tokens, the agent-walkable Worker cookie-gate, the WAF IP allowlist). Use this skill when a local-first project goes cross-device, when standing up a production-TEST environment, when connecting an AI to Supabase, Cloudflare or GitHub, or when a deployed site must stay private yet agent-reviewable.
license: MIT
---

# The Production-Deploy Stack (Supabase + Cloudflare + GitHub)

The failure class this skill prevents: the untested lift. A local-first
app — SQLite on a dev box, schema applied with a push command, secrets
in a gitignored .env — is thrown at a public deploy in one motion, and
everything cheap locally becomes a liability in production: migrations
that have never run clean from zero, RLS policies that exist only as
comments (or not at all), a staging environment hand-patched until it
no longer matches the migration history, a service key baked into a
client bundle, an unfinished product exposed to the whole internet, and
an AI agent locked out of its own test environment — no credentials, no
verification path to the deployed URL. Production testing is a STACK —
environments, credentials, gates, receipts — not a deploy button. This
skill is that stack, for any local-first full-stack app (the
Next.js + Prisma/SQLite shape) moving to Supabase + Cloudflare +
GitHub.

## 1. The topology (three environments, one repo)

| Env | Database | Edge | Role | Disposability |
|---|---|---|---|---|
| LOCAL — the dev box or sandbox | SQLite file, Prisma | dev server | feature work, hermetic tests | everything disposable |
| STAGING — production-TESTING | real Supabase Postgres | real Cloudflare edge, real auth | the AI's operating theater: migrations, security testing, owner review | disposable BY DESIGN |
| PROD — locked | a separate Supabase project | custom domain on the zone | real users | never disposable; changes on tags only |

Branch mapping (the deploy trigger):

- PR → preview deployment — a fresh URL per PR.
- main → staging, auto-deploy.
- tag `v*` → prod, behind a GitHub Environment protection rule with
  required reviewers.

The rule: staging is REBUILT from migrations, never hand-patched — if a
change cannot be expressed as a migration + code, it does not exist.
WHY: a hand-patched staging verifies nothing; the first prod deploy
from the chain is then also the FIRST time the chain runs clean — prod
becomes the test. And prod credentials NEVER enter staging; neither
ever enters the repo. WHY: the moment prod secrets exist in the
AI-reachable environment, every staging compromise is a prod
compromise.

## 2. Supabase: the database as code

- **Two projects minimum** (staging + prod). The isolation IS the
  security model: a leaked staging key reaches test data, nothing
  else. Honest free-tier note: 2 projects fit the free tier, and a
  free project PAUSES after ~1 week of inactivity — wake it in CI (a
  scheduled health ping) or accept the wake delay on first use.
- **`supabase init` once; the chain is the truth.** Migrations live in
  `supabase/migrations/`, committed; `supabase db push` applies them
  per environment — each push targets that environment's project (pass
  the `--db-url` connection string from CI secrets; never commit it).
  WHY: when the schema is only reachable through the committed chain,
  any environment can be rebuilt from zero, and any divergence is
  visible in a diff.
- **`supabase/seed.sql` for test data — staging only.** WHY: seed data
  pushed to prod is test data in prod; known-password demo accounts
  are a documented breach class.
- **RLS ON for every table; policies written AS MIGRATIONS.** WHY: a
  policy is code — it belongs in the PR where a reviewer can see the
  new table ship locked, not applied later by hand in a dashboard
  nobody audits. The anon key is PUBLIC by design — safety comes from
  RLS, never from key secrecy. The service_role key BYPASSES RLS —
  server-side only, never in a client bundle, never in a URL (URLs
  land in logs, referrers, and browser history).
- **Staging is disposable — prove the chain.** `supabase db reset` (or
  drop + re-push) proves the migration chain runs clean from zero; run
  it in CI on every PR when preview DB branches are unavailable.
  Honest limit: preview DB branching is a paid-tier feature; the
  free-tier workaround is the shared staging DB plus a reset job —
  disclosed as a workaround, not hidden. WHY: a chain that only ever
  ran forward on a long-lived database hides order-dependent breaks (a
  table a developer created by hand, then a migration referencing it
  that never creates it).

## 3. Cloudflare: deploys at the edge

- **Workers (static assets) or Pages for the frontend; a Worker for
  the API when needed.** The config (`wrangler.toml` or
  `wrangler.jsonc`) is committed. WHY: the deploy target is reviewable
  code, not a dashboard state someone must remember.
- **Deploys run `wrangler deploy`, authenticated with
  `CLOUDFLARE_API_TOKEN` — SCOPED.** Workers Scripts:Edit on the
  account; zone-scoped rules (WAF, Access) only if the AI must touch
  them. NEVER the Global API Key — it is all-permissions everywhere
  and cannot be scoped down.
- **Every deploy gets a preview URL**; production serves a custom
  domain on the zone. Secrets reach the Worker as wrangler secrets
  (`wrangler secret put <NAME>`) — never plain vars in the config
  file. WHY: the config file is committed; a plain var there is a
  committed secret.
- **Zone-level tools come free with the setup:** WAF custom rules,
  rate limiting, Turnstile on public forms. Once traffic is real, the
  edge — not the app process — is where shared abuse protection
  belongs.

## 4. GitHub Actions: the CI gate

- **On PR:** install → typecheck → lint → test → build → upload a
  preview (`wrangler versions upload`, or `wrangler pages deploy
  --branch <pr>`) → E2E (Playwright) against the preview URL with
  staging-scoped credentials from repo secrets. A URL-driven harness
  (the sibling skill `human-e2e-testing` describes one) runs the SAME
  scenarios against any base URL — local, preview, staging, prod.
- **On main:** deploy staging, then smoke-test it (the same E2E suite,
  staging-scoped).
- **On tag `v*`:** deploy prod — behind a GitHub Environment protection
  rule with required reviewers. The human approves; the AI never
  deploys prod.
- **Secrets live in GitHub repo/environment secrets** — never in the
  repo, never in workflow files. The workflow files themselves are
  code, reviewed in PRs like everything else. WHY: a workflow is
  arbitrary code with access to every secret in its scope — a PR that
  can edit the workflow that gates it is a credential-exfiltration
  path.

## 5. AI connectivity (the keys and the work)

The point of the stack: the AI session holds credentials and OPERATES
the test environment. Three credentials, each scoped and each
reconstructable:

1. **GitHub — a fine-grained PAT** (repo read/write, Actions read):
   clone, push, open PRs, read CI logs. Enough for the whole loop; not
   enough to change repo settings or secrets.
2. **Supabase — the project ref + DB password (the postgres connection
   string) + the STAGING service_role key.** Full database authority
   in staging: migrations, seed/reset, test users, RLS probes. The
   PROD service_role key NEVER enters any AI session — the owner runs
   prod migrations; the AI's authority ends at staging. WHY: the blast
   radius of a compromised session is then exactly one disposable
   environment.
3. **Cloudflare — an API token scoped to the account/zone** (Workers
   Scripts:Edit; Zone WAF:Edit + Access: Apps:Edit only if the AI
   manages the gate and the rules).

**Storage — the copy-proof method.** Credentials are stored as BASE64
strings in the project's redeploy prompt or owner-held docs; decoded
in-session into a shell variable; LIVE-VERIFIED before first use;
never committed raw, never pasted into client code.

```bash
# decode once per session (base64 survives redacting copy paths)
TOKEN=$(printf '%s' '<the-base64-of-the-token>' | base64 -d)

# live-verify each credential through its own door
git ls-remote "https://<user>:${TOKEN}@<host>/<owner>/<repo>.git" HEAD
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://<project-ref>.supabase.co/rest/v1/" \
  -H "apikey: <the-staging-service-key>"          # expect 200
CLOUDFLARE_API_TOKEN="$CF_TOKEN" wrangler whoami   # names the account
```

WHY base64: display-redaction filters strip raw token patterns from
rendered views, and a copy taken through a redacting view loses the
token — a documented fresh-session failure class. The sibling skill
`zai-fullstack-session` carries the full redaction-trap mechanics (the
raw-prefix presence count, the never-echo-the-decoded-value rule);
`secrets-and-csrf` carries the hygiene rules (fail-closed readers,
rotation, the .env.example documentation).

**What the AI can then execute, end to end, in staging:**

- run + verify migrations (push, then re-query the schema);
- seed and reset test data;
- create test users and exercise the auth flows (signup, login,
  logout, password reset);
- probe RLS under all three roles (anon / authenticated / service);
- deploy a branch to a fresh preview URL;
- verify WAF + Turnstile behavior with deliberate probe requests;
- scan the DEPLOYED bundle for leaked secrets (grep the built assets
  for key patterns — the bundle, not the source, is what ships);
- rotate a leaked key;
- read CI logs and re-run failed workflows.

The point, stated once: the AI does not ASK for a test environment —
it OPERATES one.

## 6. The staging security-testing checklist (receipt-producing)

Every item produces a receipt — an HTTP status, a row count, a
screenshot, a log line. The receipts-or-retract discipline (see the
sibling skill `receipts-or-retract`) applies to security testing too:
a check without a receipt did not happen.

1. **RLS probe matrix:** every table × (anon, authenticated-as-A,
   authenticated-as-B). Expect DENY on cross-user reads and writes;
   any allow is a finding. Receipt: the probe output per cell.
2. **Auth flows end-to-end:** signup, login, logout, password reset;
   session cookie flags (HttpOnly, Secure, SameSite). Receipt: the
   network captures + the cookie attribute dump.
3. **CSRF:** mutating requests without the double-submit token must
   fail. (The sibling skill `secrets-and-csrf` defines the middleware
   enforcement pattern.) Receipt: the 403s.
4. **Rate limits + WAF rules:** deliberate probe payloads (SQLi/XSS
   shapes) against staging must be blocked; verify the block event in
   the Cloudflare dashboard or log. Receipt: the block event line.
   Tune rules AFTER feature verification — rules tuned before real
   traffic either over-block legitimate patterns or under-block
   attacks.
5. **Turnstile on public forms** (register, login, token mints — the
   abuse surfaces, not session-gated doors): the widget token verified
   SERVER-SIDE (siteverify) before the door proceeds. Client-only
   verification is theater — a real widget no door enforces. Receipt:
   the siteverify call in the server logs + a rejected forged-token
   request.
6. **Deployed-bundle secret scan:** grep the built JS assets for key
   patterns (service_role, sk-, token shapes) — zero hits required.
   WHY the bundle: the source tree can be clean while the bundler
   inlined a key into a shipped chunk. Receipt: the grep output
   (empty).
7. **Dependency audit** (`npm audit` or the runtime's equivalent): new
   criticals disclosed, never silently ignored. Receipt: the audit
   output.

## 7. Private preview (block the public, keep the agent review)

The problem: staging/preview deploys must NOT be publicly viewable —
an unfinished product with test data on a public URL is an open
invitation — but the AI's headless browser and the owner must still
reach it. Three layers, each with an honest trade-off:

**Layer 1 — Cloudflare Access (the canonical Zero Trust answer).** Put
the hostname behind a self-hosted Access application; humans
authenticate via email OTP (the free tier covers small teams);
programmatic access via SERVICE TOKENS — the `CF-Access-Client-Id` +
`CF-Access-Client-Secret` headers. THE HONEST CAVEAT: a plain
headless-browser NAVIGATION cannot attach custom headers to the
top-level document request — so for agent-browser review, pair Access
with Layer 2, or exempt the cookie-gate path from Access.

**Layer 2 — the Worker cookie-gate (the agent-browser-friendly
pattern; the recommended primary for AI review).** A middleware in
front of the assets: `GET /__gate?key=<secret>` compares the key
against a Worker secret — SHA-256 BOTH sides, then compare
(constant-time without timing games) — and on match sets a signed
HttpOnly + Secure + SameSite=Lax cookie (value = a second Worker
secret, Max-Age ~12h); every other path without the cookie gets 403
with a no-information page. The agent browser walks the gate URL ONCE
— a normal navigation, no header support needed — then reviews the UI
like any user. Rotate the key by rotating the Worker secret and
redeploying.

```js
// Worker secrets (wrangler secret put — never plain vars):
//   GATE_KEY    — the gate key (rotatable)
//   GATE_COOKIE — the random cookie value (rotatable)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/__gate") {            // the one unlock route
      const given = await sha256(url.searchParams.get("key") || "");
      const want  = await sha256(env.GATE_KEY);  // both sides hashed
      if (given !== want) return new Response("no", { status: 403 });
      return new Response("gate open", { status: 200, headers: {
        "Set-Cookie": `__gate=${env.GATE_COOKIE}; HttpOnly; Secure;` +
                      ` SameSite=Lax; Max-Age=43200; Path=/` } });
    }
    const c = (request.headers.get("Cookie") || "")
      .split(/;\s*/).find(s => s.startsWith("__gate="))?.slice(7) ?? "";
    if (await sha256(c) !== await sha256(env.GATE_COOKIE))
      return new Response("no", { status: 403 });   // no-info page
    return env.ASSETS.fetch(request);               // the app assets
  },
};
async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b =>
    b.toString(16).padStart(2, "0")).join("");
}
```

**Layer 3 — WAF IP allowlist (defense in depth).** Allow the AI
sandbox's egress IP (discovered in-session: `curl ifconfig.me`) plus
the owner's IP; challenge or block everything else. Brittle alone —
dynamic IPs change — so a second factor, never the primary.

The rule: preview/staging hostnames get NO public surface unless
intentionally public; production may open selectively (a launch page)
with Turnstile + rate limits in front.

## 8. The port-day sequence (local-first → staging → prod)

The ordered run — each step's output is the next step's input:

1. **Freeze schema churn** — no new migrations land while the port is
   in flight.
2. **Migrations reviewed in a PR** — the whole chain, RLS policies
   included, read by a human.
3. **Staging reset from zero** — the chain proves itself on an empty
   project.
4. **The security checklist** — ALL PASS, receipts attached.
5. **Owner reviews staging through the gate** — the private preview
   doing its job.
6. **The prod deploy window** — owner-executed with prod credentials;
   the AI's authority ended at staging, and the AI prepared everything
   the owner clicks through.
7. **Prod smoke test** — the same E2E suite, prod-scoped.
8. **The evidence pack** — the report the owner reads: what was
   tested, what was found, what was fixed, receipts attached.

The philosophy, in one line: production testing is not a phase at the
end — it is an environment the AI operates continuously, with the same
receipts discipline as development.

## Honest limits

- **Supabase free tier:** 2 projects; a ~1-week inactivity pause (wake
  in CI or accept the delay); NO preview DB branching — the
  shared-staging + reset-job workaround is a real limit, disclosed.
- **Cloudflare Access:** free up to 50 users; beyond that it is a paid
  seat.
- **IP allowlists break on dynamic IPs** — always a second factor,
  never the primary control.
- **The cookie-gate protects the document and the data routes behind
  the middleware, but the hostname's existence is still visible** — a
  403 reveals a live host. Acceptable for staging; use a
  non-guessable subdomain if even existence must stay quiet.
- **The AI never holds prod credentials** — prod migrations are
  owner-run by design, which is exactly why the migration chain must
  be good enough to run clean unattended: that is what the staging
  reset proves.

Pairs with: `secrets-and-csrf` (the hygiene + CSRF enforcement),
`zai-fullstack-session` (the sandbox environment + the copy-proof
credential mechanics), `receipts-or-retract` (the receipt contract
behind the checklist), `human-e2e-testing` (the URL-driven harness the
preview and smoke tests run), `battery-runner` (the one-command gate
CI inherits).
