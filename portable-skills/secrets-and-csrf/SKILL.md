---
name: secrets-and-csrf
description: Two hardenings that share one rule — a control that is not wired is not a control, and a gate must verify USAGE, not existence: (1) secrets hygiene with zero string fallbacks (missing env var throws; deploy scripts mint-on-boot) and (2) CSRF double-submit enforced in middleware at ONE choke point, with the security gate upgraded to prove the wiring. Use this skill at every project's security pass, when a security doc claims a control exists, or when rotating a secret that was once committed.
license: MIT
---

# Secrets Hygiene + CSRF Double-Submit (portable)

The failure class this skill prevents: (a) **fallback secrets
committed in the repo** — the "dev convenience" default that silently
becomes the production signing key (anyone with repo read can forge
tokens and reverse "anonymized" hashes); (b) **the claimed-but-unused
CSRF helper** — the security doc says "CSRF: HARD-FAIL" while zero
routes call the validator, and the gate proves file existence, not
usage; (c) **the silent defeat of a service's own boot check** by a
deploy script that exports the fallback it was supposed to remove.

Both findings share one root shape: documentation claimed a control
existed while the code path was dead. The remediation pattern is
always the same pair: wire the control at the narrowest choke point,
then make the gate verify the wiring.

## 1. Secrets hygiene (no fallbacks, generate-on-boot)

- The secret-reading code NEVER has a string fallback. Missing env
  var -> a thrown error naming the variable + the file that documents
  it. Fail-closed beats fail-open for anything cryptographic.
- The deploy/dev scripts each carry an `ensure_env_secret` helper:

```bash
ensure_env_secret() {
  local key="$1"
  [[ -f .env && "$(grep -c "^${key}=" .env 2>/dev/null)" -gt 0 ]] && return 0
  local val
  val="$(openssl rand -hex 32 2>/dev/null)" || { echo "FATAL: openssl unavailable"; exit 1; }
  if [[ -f .env ]]; then printf '\n%s=%s\n' "$key" "$val" >> .env
  else printf '%s=%s\n' "$key" "$val" > .env; fi
}
ensure_env_secret CHAT_JWT_SECRET
ensure_env_secret IP_HASH_SALT
```

- `.env` is gitignored; `.env.example` documents every key with the
  generation command.
- **Rotating a previously-committed value** = delete the old line,
  let the script mint a fresh one, restart every consumer of the
  secret in the same change.
- Tests read the same `.env` (a tiny loader in the test setup: parse
  `KEY=VALUE` lines, never override an existing process env) so a
  secret-dependent test fails LOUDLY when the file is missing
  instead of silently passing on a committed fallback literal.

## 2. CSRF double-submit, enforced in middleware

ONE enforcement point beats per-route discipline: the framework
middleware (runs on every request) validates mutating methods before
any route code executes.

```
cookie: <auth-lib>.csrf-token=<token>|<hmac>   (HttpOnly)
header: X-CSRF-Token: <token>                  (client echoes the mint)
rule:   constant-time(cookie-token == header-token) else 403
```

- The mint: a GET endpoint returns the raw token JSON AND sets the
  HttpOnly cookie in the same response. The client wrapper caches
  the token for the session, attaches the header on mutating
  fetches, and on a CSRF-403 re-mints ONCE and retries (the token
  rotates per mint — anything else calling the endpoint invalidates
  your cached pair).
- Exemptions are a DOCUMENTED list, not an accident: the auth
  library's own routes (built-in CSRF), public pre-auth routes
  (nothing to forge), and routes whose threat model is unaffected.
  Every exemption carries a comment naming the reason.
- The cookie-separator bug class: VERIFY the actual format your auth
  library writes (`token|hmac` vs `token.hmac`) — split on the wrong
  separator and the comparison never matches, which surfaces as
  "CSRF works in tests but 100% of requests 403."
- Edge-runtime note: a helper imported by Edge middleware must not
  import node:crypto — use the global `crypto.randomUUID()`.

## 3. The gate upgrade (the part that makes it stick)

After wiring, upgrade the security gate so the fix cannot silently
regress:

- Check "auth on mutating routes": require an auth marker (session
  resolver / mock-auth header / an explicit `@public` annotation) on
  every route with body input — schema validation validates SHAPE,
  not AUTHORIZATION.
- Check "CSRF": grep the MIDDLEWARE for the validator call + the
  client wrapper for the fetch-door usage + the known mutating
  call-sites for the wrapper. **File existence proves nothing.**

## The wiring order

1. Remove every string fallback; make the readers throw.
2. Add `ensure_env_secret` to the deploy + dev scripts; document
   keys; rotate any previously-committed value; restart consumers.
3. Implement the middleware validation + the client wrapper; wire
   every mutating call-site through the wrapper (sweep for raw
   mutating fetches that bypass it).
4. Annotate the deliberate public routes `@public` with the reason.
5. Add the test-setup loader; convert secret-dependent tests to fail
   loudly.
6. Upgrade the gate checks to prove usage.
7. Verify live: no-token curl -> 403; mint+token curl -> 200; one
   browser mutation -> the mint + the 200 in the network log.

Pairs with: `realtime-service` (the JWT secret it requires) and
`battery-runner` (the security gate joins the battery).
