// ============================================================
// portable-chat-service — real-time chat mini-service (socket.io)
// ============================================================
// A copy-to-any-project realtime service: presence, conversation
// rooms, message relay, typing indicators, pin/unpin, read
// receipts — with the security model baked in (see README.md).
//
// ZERO project imports. Your project's membership rules plug in
// via ONE of:
//   - MEMBERSHIPS_FILE  (default ./memberships.json if present):
//       { "conversations": [ { "id": "conv_x", "participantIds": ["u_1","u_2"] } ] }
//   - MEMBERSHIP_MODULE (ESM path exporting):
//       isParticipant(conversationId, userId) -> boolean | Promise<boolean>
//       canModerate?(conversationId, userId, roles) -> boolean | Promise<boolean>
//   - neither: FAIL-CLOSED (every join/send rejected) + boot warning.
//
// Configuration (env):
//   PORT               listen port            (default 3003)
//   CHAT_JWT_SECRET    REQUIRED — the JWT signing secret shared
//                      with your app's token issuer. Hard-fails
//                      at boot if missing.
//   ALLOWED_ORIGINS    comma-separated CORS origins
//                      (default "http://localhost:3000")
//   APP_ORIGIN         extra allowed origin (e.g. your prod URL)
//
// Run:  bun index.ts     (or: bun run dev for hot reload)
//
// Provenance: extracted R74 from the Free Trader mini-service per
// the modularity mandate (DR-14) — the original imported the app's
// mock-data for membership checks; this engine makes that an
// adapter. Receipts: audits/e2e/r74-portability-closure.md.
// ============================================================

/* eslint-disable no-console -- a standalone service: stdout is its log */
/* eslint-disable security/detect-non-literal-fs-filename -- the memberships
   path comes from the operator's MEMBERSHIPS_FILE env / default location;
   same trust boundary as any config file the operator points us at */
import { createServer } from 'http'
import { existsSync, readFileSync } from 'fs'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

const PORT = Number(process.env.PORT) || 3003

// ── Conditional logging (quiet in production) ────────────────
const log = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}

// ── Required secret — never silently run with no auth ─────────
const CHAT_JWT_SECRET = process.env.CHAT_JWT_SECRET
if (!CHAT_JWT_SECRET) {
  console.error('[chat] FATAL: CHAT_JWT_SECRET env var is not set. Refusing to start.')
  console.error('[chat] Set CHAT_JWT_SECRET (shared with your app\'s token issuer).')
  process.exit(1)
}

// ── Types ────────────────────────────────────────────────────
interface OnlineUser {
  socketId: string
  userId: string
  name: string
}

interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  text?: string
  imageUrl?: string
  sentAt: string
  // The message shape receivers render must carry read receipts and pin
  // state (UIs read these directly). The sender has read their own message.
  readBy: string[]
  pinned: boolean
}

interface TypingPayload {
  conversationId: string
  userId: string
  name: string
  isTyping: boolean
}

interface PinPayload {
  conversationId: string
  messageId: string
  pinnedBy: string
}

interface ReadPayload {
  conversationId: string
  userId: string
  messageIds: string[]
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

type Roles = string[]

// ── The membership adapter (THE project seam) ────────────────
// Async signatures so a real app's adapter can call its API.
type ParticipantFn = (conversationId: string, userId: string) => Promise<boolean> | boolean
type ModerateFn = (conversationId: string, userId: string, roles: Roles) => Promise<boolean> | boolean

interface MembershipAdapter {
  source: string
  isParticipant: ParticipantFn
  canModerate?: ModerateFn
}

function loadJsonAdapter(path: string): MembershipAdapter | null {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      conversations?: Array<{ id: string; participantIds: string[] }>
    }
    const index = new Map<string, Set<string>>()
    for (const conv of raw.conversations ?? []) {
      index.set(conv.id, new Set(conv.participantIds ?? []))
    }
    return {
      source: `json:${path}`,
      isParticipant: (conversationId, userId) => {
        const participants = index.get(conversationId)
        return Boolean(participants && participants.has(userId))
      },
      // Default moderation: site-wide roles OR any participant
      // (override by providing a MEMBERSHIP_MODULE with canModerate).
      canModerate: (conversationId, userId, roles) =>
        roles.includes('site_admin') || roles.includes('site_mod') ||
        Boolean(index.get(conversationId)?.has(userId)),
    }
  } catch (e) {
    console.error(`[chat] FATAL: cannot parse memberships file ${path}:`, e)
    process.exit(1)
  }
}

async function loadMembershipAdapter(): Promise<MembershipAdapter> {
  // 1. Explicit module adapter (a real app's source of truth).
  if (process.env.MEMBERSHIP_MODULE) {
    const modPath = new URL(process.env.MEMBERSHIP_MODULE, `file://${process.cwd()}/`).href
    const mod = (await import(modPath)) as {
      isParticipant?: ParticipantFn
      canModerate?: ModerateFn
    }
    if (typeof mod.isParticipant !== 'function') {
      console.error('[chat] FATAL: MEMBERSHIP_MODULE must export isParticipant(conversationId, userId)')
      process.exit(1)
    }
    return { source: `module:${process.env.MEMBERSHIP_MODULE}`, isParticipant: mod.isParticipant, canModerate: mod.canModerate }
  }
  // 2. JSON file (explicit path, or the default location if present).
  const file = process.env.MEMBERSHIPS_FILE ?? './memberships.json'
  if (process.env.MEMBERSHIPS_FILE || existsSync(file)) {
    const adapter = loadJsonAdapter(file)
    if (adapter) return adapter
  }
  // 3. Fail-closed: the service runs, but every join/send is rejected.
  console.warn('[chat] WARNING: no MEMBERSHIPS_FILE / MEMBERSHIP_MODULE — running FAIL-CLOSED (all joins rejected).')
  return {
    source: 'fail-closed',
    isParticipant: () => false,
    canModerate: () => false,
  }
}

// ── Rate limiting (per user, in-memory; Redis for HA later) ──
const rateLimits = new Map<string, RateLimitEntry>()
interface RateLimitOpts {
  max: number
  windowMs: number
}
function rateLimitExceeded(userId: string, action: string, opts: RateLimitOpts): boolean {
  const key = `${userId}:${action}`
  const now = Date.now()
  const entry = rateLimits.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + opts.windowMs })
    return false
  }
  entry.count++
  return entry.count > opts.max
}
const RATE_LIMITS = {
  'message:send': { max: 30, windowMs: 60_000 },
  'conversation:join': { max: 10, windowMs: 60_000 },
} as const

const genId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

// ── HTTP + socket.io server ──────────────────────────────────
const httpServer = createServer()
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),
  ...(process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : []),
]
const io = new Server(httpServer, {
  // DO NOT change the path — reverse proxies (e.g. the sandbox
  // gateway) use it to forward to the right port. Client connects
  // with path "/" + whatever port-routing your gateway requires.
  path: '/',
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, origin?: boolean) => void) => {
      // Allow same-origin / no Origin header (server-to-server, mobile,
      // curl) + any explicitly-allowed origin.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Presence: userId -> Set<socketId> (a user may have multiple tabs)
const onlineUsers = new Map<string, Set<string>>()
const socketToUser = new Map<string, OnlineUser>()
const conversationMembers = new Map<string, Set<string>>()

// ── Explicit room delivery ───────────────────────────────────
// socket.io's adapter-based room broadcasts (io.to(room).emit) have
// failed to deliver under the Bun runtime in this stack (verified live:
// direct socket.emit works, room emits reach nobody). The service tracks
// membership itself (conversationMembers + onlineUsers), so delivery is
// per-socket from those maps — identical semantics, no adapter
// dependency. Under Node or a working adapter, io.to() is equivalent.
function broadcastToConversation(
  conversationId: string,
  event: string,
  payload: unknown,
  exceptSocketId?: string
) {
  const members = conversationMembers.get(conversationId)
  if (!members) return
  for (const uid of members) {
    const sockets = onlineUsers.get(uid)
    if (!sockets) continue
    for (const sid of sockets) {
      if (sid === exceptSocketId) continue
      io.to(sid).emit(event, payload)
    }
  }
}

function setUserOnline(userId: string, socketId: string) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
  onlineUsers.get(userId)!.add(socketId)
}

function setUserOffline(userId: string, socketId: string) {
  const sockets = onlineUsers.get(userId)
  if (!sockets) return
  sockets.delete(socketId)
  if (sockets.size === 0) {
    onlineUsers.delete(userId)
    for (const [convId, members] of conversationMembers.entries()) {
      if (members.has(userId)) {
        broadcastToConversation(convId, 'presence:update', { userId, isOnline: false })
      }
    }
  }
}

// ── The security-critical auth middleware ────────────────────
// Runs once per connection at the handshake layer. No
// client-supplied identity is EVER trusted — userId/name/roles
// come only from the verified JWT.
io.use((socket, next) => {
  const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token
  if (!token || typeof token !== 'string') {
    log('[chat] rejected: no token')
    return next(new Error('No token'))
  }
  try {
    const payload = jwt.verify(token, CHAT_JWT_SECRET) as {
      sub: string
      name?: string
      roles?: string[]
    }
    if (!payload.sub) {
      log('[chat] rejected: token has no sub')
      return next(new Error('Invalid token'))
    }
    socket.data.userId = payload.sub
    socket.data.name = payload.name ?? 'Unknown'
    socket.data.roles = payload.roles ?? []
    return next()
  } catch {
    log('[chat] rejected: invalid token')
    return next(new Error('Invalid token'))
  }
})

// ── Boot ─────────────────────────────────────────────────────
const membership = await loadMembershipAdapter()

io.on('connection', (socket) => {
  const userId: string = socket.data.userId
  const name: string = socket.data.name
  const roles: Roles = socket.data.roles

  log(`[chat] connected: ${socket.id} (user=${userId})`)

  const user: OnlineUser = { socketId: socket.id, userId, name }
  socketToUser.set(socket.id, user)
  setUserOnline(userId, socket.id)
  io.emit('presence:update', { userId, isOnline: true, name })

  // --- Join a conversation room ---
  socket.on('conversation:join', async (payload: { conversationId: string }) => {
    try {
      if (rateLimitExceeded(userId, 'conversation:join', RATE_LIMITS['conversation:join'])) {
        socket.emit('error', { message: 'Rate limit exceeded' })
        return
      }
      if (!payload?.conversationId || !(await membership.isParticipant(payload.conversationId, userId))) {
        socket.emit('error', { message: 'Not a participant' })
        return
      }
      socket.join(`conv:${payload.conversationId}`)
      if (!conversationMembers.has(payload.conversationId)) {
        conversationMembers.set(payload.conversationId, new Set())
      }
      conversationMembers.get(payload.conversationId)!.add(userId)
      const onlineMembers: string[] = []
      for (const member of conversationMembers.get(payload.conversationId)!) {
        if (onlineUsers.has(member)) onlineMembers.push(member)
      }
      socket.emit('conversation:members', { conversationId: payload.conversationId, onlineMembers })
      log(`[chat] joined conv ${payload.conversationId}: ${userId}`)
    } catch {
      socket.emit('error', { message: 'Membership check failed' })
    }
  })

  socket.on('conversation:leave', (payload: { conversationId: string }) => {
    socket.leave(`conv:${payload.conversationId}`)
    conversationMembers.get(payload.conversationId)?.delete(userId)
  })

  // --- Send a message ---
  socket.on('message:send', async (payload: {
    conversationId: string
    senderId?: string
    senderName?: string
    text?: string
    imageUrl?: string
  }) => {
    try {
      if (rateLimitExceeded(userId, 'message:send', RATE_LIMITS['message:send'])) {
        socket.emit('error', { message: 'Rate limit exceeded' })
        return
      }
      if ((payload?.text?.length ?? 0) > 5000) {
        socket.emit('error', { message: 'Message too long' })
        return
      }
      if (!payload?.conversationId) {
        socket.emit('error', { message: 'conversationId required' })
        return
      }
      // senderId is ALWAYS the authenticated user. payload.senderId /
      // payload.senderName are IGNORED entirely. Membership is
      // re-checked before broadcasting (the user might have been
      // removed).
      if (!(await membership.isParticipant(payload.conversationId, userId))) {
        socket.emit('error', { message: 'Cannot send to a conversation you are not in' })
        return
      }
      const message: ChatMessage = {
        id: genId(),
        conversationId: payload.conversationId,
        senderId: userId, // ← authenticated, NOT payload.senderId
        senderName: name,
        text: payload.text,
        imageUrl: payload.imageUrl,
        sentAt: new Date().toISOString(),
        readBy: [userId],
        pinned: false,
      }
      broadcastToConversation(payload.conversationId, 'message:new', message)
      log(`[chat] message in ${payload.conversationId} from ${name} (${userId})`)
    } catch {
      socket.emit('error', { message: 'Message send failed' })
    }
  })

  // --- Typing indicator ---
  socket.on('typing', (payload: TypingPayload) => {
    if (!payload?.conversationId) return
    // Broadcast to the room except the sender, with the
    // AUTHENTICATED identity (no spoofing).
    socket.to(`conv:${payload.conversationId}`).emit('typing:update', {
      conversationId: payload.conversationId,
      userId,
      name,
      isTyping: payload.isTyping,
    })
  })

  // --- Pin / unpin a message (moderation) ---
  socket.on('message:pin', async (payload: PinPayload) => {
    try {
      if (!payload?.conversationId || !payload.messageId) {
        socket.emit('error', { message: 'conversationId + messageId required' })
        return
      }
      if (!(await membership.isParticipant(payload.conversationId, userId))) {
        socket.emit('error', { message: 'Not a participant' })
        return
      }
      const allowed = membership.canModerate
        ? await membership.canModerate(payload.conversationId, userId, roles)
        : true
      if (!allowed) {
        socket.emit('error', { message: 'Not authorized to pin' })
        return
      }
      broadcastToConversation(payload.conversationId, 'message:pinned', {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        pinnedBy: userId, // ← authenticated
      })
      log(`[chat] pinned msg ${payload.messageId} in ${payload.conversationId} by ${userId}`)
    } catch {
      socket.emit('error', { message: 'Pin failed' })
    }
  })

  socket.on('message:unpin', async (payload: PinPayload) => {
    try {
      if (!payload?.conversationId || !payload.messageId) return
      if (!(await membership.isParticipant(payload.conversationId, userId))) {
        socket.emit('error', { message: 'Not a participant' })
        return
      }
      const allowed = membership.canModerate
        ? await membership.canModerate(payload.conversationId, userId, roles)
        : true
      if (!allowed) {
        socket.emit('error', { message: 'Not authorized to unpin' })
        return
      }
      broadcastToConversation(payload.conversationId, 'message:unpinned', {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        pinnedBy: userId,
      })
    } catch {
      socket.emit('error', { message: 'Unpin failed' })
    }
  })

  // --- Read receipts ---
  socket.on('message:read', async (payload: ReadPayload) => {
    try {
      if (!payload?.conversationId || !Array.isArray(payload.messageIds) || payload.messageIds.length === 0) return
      if (!(await membership.isParticipant(payload.conversationId, userId))) {
        socket.emit('error', { message: 'Not a participant' })
        return
      }
      broadcastToConversation(payload.conversationId, 'message:read', {
        conversationId: payload.conversationId,
        userId, // ← authenticated
        messageIds: payload.messageIds,
      })
    } catch {
      socket.emit('error', { message: 'Read receipt failed' })
    }
  })

  // --- Disconnect ---
  socket.on('disconnect', () => {
    const stored = socketToUser.get(socket.id)
    if (stored) {
      setUserOffline(stored.userId, socket.id)
      socketToUser.delete(socket.id)
      log(`[chat] disconnected: ${stored.name} (${stored.userId})`)
    }
  })

  // --- Health check ---
  socket.on('ping', (cb: () => void) => {
    if (typeof cb === 'function') cb()
  })
})

httpServer.listen(PORT, () => {
  log(`[chat] portable realtime service listening on :${PORT}`)
  log(`[chat] membership source: ${membership.source}`)
  log(`[chat] allowed origins: ${allowedOrigins.join(', ')}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  log('[chat] SIGTERM received, shutting down')
  io.close(() => httpServer.close(() => process.exit(0)))
})
process.on('SIGINT', () => {
  log('[chat] SIGINT received, shutting down')
  io.close(() => httpServer.close(() => process.exit(0)))
})
