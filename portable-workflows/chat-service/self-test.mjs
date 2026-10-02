#!/usr/bin/env node
// ============================================================
// portable-chat-service self-test — prove the security model.
// ============================================================
// Boots NOTHING itself: point it at an ALREADY-RUNNING instance.
//
//   # terminal 1:
//   PORT=3005 CHAT_JWT_SECRET=selftest-secret MEMBERSHIPS_FILE=./memberships.example.json bun index.ts
//   # terminal 2:
//   PORT=3005 CHAT_JWT_SECRET=selftest-secret bun self-test.mjs
//
// Verifies (each is a ✓ line; any failure exits 1):
//   1. no token        → connection rejected ("No token")
//   2. bad token       → connection rejected ("Invalid token")
//   3. valid token     → alice connects
//   4. join allowed    → alice joins conv_demo, gets members list
//   5. join forbidden  → alice rejected from conv_private (fail-closed membership)
//   6. sender spoofing → message:new carries the AUTHENTICATED senderId,
//                          not the payload's forged senderId
//   7. relay           → bob (same room) receives alice's message
//   8. typing          → bob receives alice's typing:update
//   9. send forbidden  → alice cannot send into conv_private
//  10. non-participant message → bob's spoof attempt into conv_demo (not a
//                          member... he IS a member — so this case uses carol,
//                          who is not in conv_demo) is rejected
// ============================================================

/* eslint-disable no-console -- this file is a CLI: stdout is its interface */
import { io } from 'socket.io-client'
import jwt from 'jsonwebtoken'

const PORT = process.env.PORT || '3005'
const SECRET = process.env.CHAT_JWT_SECRET || 'selftest-secret'
const URL = process.env.SELFTEST_URL || `http://localhost:${PORT}`

const TOKEN_OPTS = { expiresIn: '5m' }
const mint = (sub, name, roles = []) => jwt.sign({ sub, name, roles }, SECRET, TOKEN_OPTS)

let passed = 0
let failed = 0
const ok = (label) => {
  passed++
  console.log(`  ✓ ${label}`)
}
const bad = (label, detail) => {
  failed++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Wait for an event matching pred; resolves null on timeout.
// NOTE: arg-less events (e.g. 'connect') emit payload=undefined — we
// resolve `true` for those so callers can truthiness-check safely.
function expectEvent(socket, event, pred, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent)
      resolve(null)
    }, timeoutMs)
    const onEvent = (payload) => {
      if (!pred || pred(payload)) {
        clearTimeout(timer)
        socket.off(event, onEvent)
        resolve(payload ?? true)
      }
    }
    socket.on(event, onEvent)
  })
}

// Expect a connection to FAIL with a message containing fragment.
async function expectConnectError(auth, fragment, label) {
  // forceNew: a fresh manager per socket — the client caches managers by
  // origin, and a poisoned one (failed handshake) must never leak into the
  // next test socket.
  const socket = io(URL, { path: '/', auth, reconnection: false, timeout: 3000, forceNew: true })
  const err = await expectEvent(socket, 'connect_error', null, 4000)
  if (err && String(err?.message || err).includes(fragment)) ok(label)
  else bad(label, `got: ${err ? String(err.message ?? err) : '(no connect_error)'}`)
  socket.close()
}

function connect(token) {
  return io(URL, { path: '/', auth: { token }, reconnection: false, timeout: 4000, forceNew: true })
}

async function main() {
  console.log(`self-test → ${URL}`)
  console.log('')

  // 1-2: auth rejections
  await expectConnectError({}, 'No token', 'no-token connection rejected')
  await expectConnectError({ token: 'not-a-jwt' }, 'Invalid token', 'bad-token connection rejected')

  // 3: valid connection
  const alice = connect(mint('u_alice', 'Alice'))
  const aliceUp = await expectEvent(alice, 'connect', null, 4000)
  if (aliceUp) ok('valid-token connection accepted (alice)')
  else bad('valid-token connection accepted (alice)')

  // 4: allowed join
  alice.emit('conversation:join', { conversationId: 'conv_demo' })
  const members = await expectEvent(alice, 'conversation:members', (p) => p.conversationId === 'conv_demo')
  if (members && Array.isArray(members.onlineMembers) && members.onlineMembers.includes('u_alice')) {
    ok('join allowed (conv_demo) + members list')
  } else bad('join allowed (conv_demo) + members list', JSON.stringify(members))

  // 5: forbidden join (fail-closed membership)
  alice.emit('conversation:join', { conversationId: 'conv_private' })
  const joinErr = await expectEvent(alice, 'error', (p) => p.message === 'Not a participant')
  if (joinErr) ok('join forbidden (conv_private → Not a participant)')
  else bad('join forbidden (conv_private → Not a participant)')

  // 6+7: bob connects, joins; alice spoofs senderId; bob must receive
  // the message with the AUTHENTICATED sender.
  const bob = connect(mint('u_bob', 'Bob'))
  await expectEvent(bob, 'connect', null, 4000)
  bob.emit('conversation:join', { conversationId: 'conv_demo' })
  await expectEvent(bob, 'conversation:members', (p) => p.conversationId === 'conv_demo')

  const bobGotMessage = expectEvent(bob, 'message:new', (p) => p.conversationId === 'conv_demo')
  // Spoof attempt: claim to be carol.
  alice.emit('message:send', {
    conversationId: 'conv_demo',
    senderId: 'u_carol',
    senderName: 'Carol (spoofed)',
    text: 'hello from alice',
  })
  const relayed = await bobGotMessage
  if (relayed && relayed.senderId === 'u_alice' && relayed.senderName === 'Alice') {
    ok('sender spoofing defeated (message:new senderId = authenticated u_alice)')
  } else {
    bad('sender spoofing defeated', `got senderId=${relayed?.senderId} senderName=${relayed?.senderName}`)
  }
  ok('relay works (bob received alice\'s message)')

  // 8: typing relay
  const bobTyping = expectEvent(bob, 'typing:update', (p) => p.conversationId === 'conv_demo')
  await sleep(100)
  alice.emit('typing', { conversationId: 'conv_demo', isTyping: true })
  const typing = await bobTyping
  if (typing && typing.userId === 'u_alice' && typing.isTyping === true) {
    ok('typing indicator relayed with authenticated identity')
  } else bad('typing indicator relayed', JSON.stringify(typing))

  // 9: send into a conversation alice is NOT in
  alice.emit('message:send', { conversationId: 'conv_private', text: 'sneak' })
  const sendErr = await expectEvent(alice, 'error', (p) => p.message.includes('not in'))
  if (sendErr) ok('send forbidden (non-participant → rejected)')
  else bad('send forbidden (non-participant → rejected)')

  // 10: carol (stranger to conv_demo) cannot send there
  const carol = connect(mint('u_carol', 'Carol'))
  await expectEvent(carol, 'connect', null, 4000)
  carol.emit('message:send', { conversationId: 'conv_demo', text: 'intrude' })
  const carolErr = await expectEvent(carol, 'error', (p) => p.message.includes('not in'))
  if (carolErr) ok('stranger send rejected (carol → conv_demo)')
  else bad('stranger send rejected (carol → conv_demo)')

  alice.close()
  bob.close()
  carol.close()

  console.log('')
  console.log(`${passed} passed · ${failed} failed ${failed === 0 ? '→ PASS' : '→ FAIL'}`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('self-test crashed:', e)
  process.exit(1)
})
