---
name: realtime-service
description: Stand up a portable realtime chat service where every identity comes from a verified JWT (never a client payload), membership is a swappable fail-closed adapter, and a 10-assertion security self-test PROVES the model (sender-spoofing defeated, fail-closed joins, rate limits) before you ship. The executable engine is a copy-to-any-project package (portable-workflows/chat-service/); this skill carries the usage knowledge: the adapter seam, the env contract, the run command, the self-test. Use this skill when a project needs realtime presence/messaging without welding the service to the app's data model, or when auditing a chat service for the identity-spoofing class.
license: MIT
---

# The Portable Realtime Chat Service

The failure class this skill prevents: **realtime services growing
project scars** — the source service imported the app's mock data for
membership checks, making it unrunnable anywhere else — and the
**chat spoofing class**: any protocol where identity arrives from the
client (a client-supplied "who am I" payload) lets anyone be anyone.

## The pattern (engine + one seam)

The workflow splits into **engine** (project-agnostic, never edited)
and a **membership adapter** (the one seam where your project
enters):

- The engine implements presence, conversation rooms, message relay,
  typing, pin/unpin, read receipts — with the audited 8-part
  security model: JWT handshake auth, no `identify` event,
  membership-checked joins, authenticated senders, per-user rate
  limits, moderated pins, authenticated receipts, locked CORS. Zero
  project imports.
- Membership plugs in ONE of three ways:
  1. a **JSON file** (`memberships.json`),
  2. a **module adapter** (env `MEMBERSHIP_MODULE=./my-membership.mjs`
     exporting `isParticipant`/`canModerate` — typically a fetch to
     your app's API),
  3. **neither -> fail-closed** (every join/send rejected).
  Refusing to guess is the safe default.

**The executable package lives at `portable-workflows/chat-service/`**
(engine `index.ts` + the example membership JSON + `self-test.mjs` +
README). Copy that folder into the target project; this skill is the
usage knowledge.

## The wiring (copy into any project)

1. Copy `portable-workflows/chat-service/`, then install its
   dependencies inside it (websocket lib + JWT lib).
2. Configure env: `PORT`, `CHAT_JWT_SECRET` (**required — the boot
   hard-fails without it**; never a fallback secret, pairs with
   `secrets-and-csrf`), `ALLOWED_ORIGINS`, `APP_ORIGIN`.
3. Wire membership (JSON file or module adapter — above).
4. Run: `PORT=3003 CHAT_JWT_SECRET=<secret> bun index.ts`. Your app
   mints short-lived JWTs with the same secret at its own
   token-minting route; the service verifies, never trusts.
5. **Prove it: `bun self-test.mjs`** — 10 assertions: no-token
   rejected, bad-token rejected, valid connect, allowed join,
   forbidden join, **sender spoofing defeated**, relay, typing,
   non-participant send rejected, stranger send rejected. Exit 0 =
   the model holds. If it ever fails, do not ship.
6. Reverse-proxy note: the socket path stays `/` — proxies route by
   port (e.g. a gateway's port-forwarding query param).

## The security model (why each part exists)

| Guarantee | The failure it kills |
|---|---|
| JWT handshake before any event | anonymous socket access |
| No `identify` event exists | client-declared identity (the spoofing class) |
| Membership checked on join | lurkers in private rooms |
| Sender = token subject, always | "send as someone else" |
| Per-user rate limits | flooding |
| Pins moderated | non-mods pinning abuse |
| Receipts authenticated | read-receipt forgery |
| CORS locked to app origins | cross-origin socket hijack |

## The receipts discipline

A portability claim requires run receipts (pairs with
`receipts-or-retract`): the self-test 10/10 pass against a live
instance on a scratch port, plus a strict typecheck pass on the
engine.

Pairs with: `secrets-and-csrf` (the no-fallback-secret rule + the
token-minting route pattern) and `battery-runner` (the self-test can
join the battery config).
