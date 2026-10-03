# portable-chat-service — real-time chat for any project

> **What this is:** a copy-to-any-project socket.io mini-service:
> presence, conversation rooms, message relay, typing indicators,
> pin/unpin, read receipts — with the security model **baked in,
> not bolted on** (JWT handshake auth, per-user rate limits,
> fail-closed membership, sender-spoofing defeat).
>
> **Provenance:** extracted R74 from the Free Trader mini-service
> per the modularity mandate (DR-14) — the original imported the
> app's mock-data for membership checks; this engine makes that a
> pluggable adapter. Receipts: `audits/e2e/r74-portability-closure.md`.

## Why it exists (the failure class it prevents)

1. **Realtime services grow project scars.** The source service was
   welded to one app's data model (`import { MOCK_CONVERSATIONS } …`).
   This engine has ZERO project imports — your membership rules plug
   in through one seam (below), and the engine never changes.
2. **Chat is where spoofing lives.** Every identity in the protocol
   comes from a **verified JWT**, never from client payloads — the
   classic "client claims to be someone else" holes are closed at
   the engine level, and the self-test proves it (see below).

## Port it in 3 steps (any project, any stack)

1. **Copy this folder** into the target project
   (`portable-workflows/chat-service/`), then:
   ```bash
   cd portable-workflows/chat-service && bun install
   ```
   Requirements: `bun` (or node ≥ 18 + npm install) — socket.io and
   jsonwebtoken install locally to the folder.
2. **Configure + wire membership** — pick ONE:
   - **JSON file** (static / mock mode): copy `memberships.example.json`
     to `memberships.json` and list conversations + participantIds.
   - **Module adapter** (real app): set `MEMBERSHIP_MODULE=./my-membership.mjs`
     exporting `isParticipant(conversationId, userId)` (async OK) and
     optionally `canModerate(conversationId, userId, roles)` — typically
     a fetch to your app's API (the single source of truth).
   - **Neither:** the service runs **fail-closed** — every join/send is
     rejected. Refusing to guess is the safe default.
3. **Run it:**
   ```bash
   PORT=3003 CHAT_JWT_SECRET=<shared-secret> bun index.ts
   # prove the security model in your environment:
   PORT=3003 CHAT_JWT_SECRET=<shared-secret> bun self-test.mjs
   ```
   If the self-test ever fails, do not ship.

## Configuration (env)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `3003` | Listen port |
| `CHAT_JWT_SECRET` | — | **Required.** JWT signing secret, shared with your app's token issuer. Boot hard-fails without it. |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| `APP_ORIGIN` | — | Extra allowed origin (e.g. prod URL) |
| `MEMBERSHIPS_FILE` | `./memberships.json` (if present) | JSON membership source |
| `MEMBERSHIP_MODULE` | — | ESM module adapter (overrides the file) |

## The event protocol (client ⇄ service)

| Client emits | Service emits back |
|---|---|
| *(handshake `auth: { token }`)* | `presence:update {userId, isOnline, name}` (broadcast) |
| `conversation:join {conversationId}` | `conversation:members {conversationId, onlineMembers}` · `error` |
| `conversation:leave {conversationId}` | — |
| `message:send {conversationId, text?, imageUrl?}` | `message:new {id, conversationId, senderId, senderName, text, imageUrl, sentAt}` (to the room) |
| `typing {conversationId, isTyping}` | `typing:update {conversationId, userId, name, isTyping}` (room, except sender) |
| `message:pin / message:unpin {conversationId, messageId}` | `message:pinned / message:unpinned {conversationId, messageId, pinnedBy}` |
| `message:read {conversationId, messageIds}` | `message:read {conversationId, userId, messageIds}` (room) |
| `ping (cb)` | *(callback — health check)* |

**Payload fields the service IGNORES on purpose:** `senderId`,
`senderName`, `userId` inside event payloads — identity always comes
from the verified JWT. `payload.roles` is not trusted either.

## The security model (baked in — same 8-part model as the audited original)

1. **JWT handshake auth** — `io.use()` verifies the token at connect;
   `socket.data.{userId,name,roles}` is the only identity source.
2. **No `identify` event** — clients can never claim a userId.
3. **Membership-checked joins** — non-participants rejected, always.
4. **Authenticated senders** — `message:send` uses the JWT identity;
   spoofed payload fields are ignored; membership re-checked pre-broadcast.
5. **Per-user rate limits** — 30 msgs/min, 10 joins/min (in-memory).
6. **Moderated pin/unpin** — site roles or a `canModerate` adapter call.
7. **Read receipts authenticated** — userId from the JWT.
8. **CORS locked** to the configured origins; path stays `/` so
   reverse proxies (like the sandbox gateway's `?XTransformPort=`
   routing) forward correctly.

## The self-test (verify the model in ANY project)

10 assertions, each mapped to a security claim (see the header of
`self-test.mjs`): no-token rejected · bad-token rejected · valid
connect · allowed join · forbidden join · **sender-spoofing
defeated** · relay · typing · non-participant send rejected ·
stranger send rejected. Exit 0 = the model holds in YOUR
environment. `bun self-test.mjs` needs the same `PORT` +
`CHAT_JWT_SECRET` as the running service and
`MEMBERSHIPS_FILE=./memberships.example.json` for its fixture
conversations.

## Real portability receipt

The engine was extracted from the Free Trader service with zero
behavior change to the protocol (event names and payload shapes are
identical — the app's existing client `src/lib/realtime/client.ts`
works against either). The membership seam replaced the app-import;
the self-test's 10/10 pass against a live instance on a scratch port
(3005) is the receipt. Full log: `audits/e2e/r74-portability-closure.md`.
