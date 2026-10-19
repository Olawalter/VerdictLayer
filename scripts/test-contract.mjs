/**
 * Basic smoke tests against the deployed VerdictLayer contract on studionet.
 * Run with: node scripts/test-contract.mjs
 *
 * Tests that the contract is reachable and that read methods return
 * well-formed data. No wallet required — all calls are view-only.
 */

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VERDICTLAYER_ADDRESS || '0xD6d60c1dB4064b9EdD7fb70dc893d5B1c0284c2B'

const client = createClient({ chain: studionet })

function read(method, args = []) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
  })
}

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓  ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗  ${name}`)
    console.error(`       ${err.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\nVerdictLayer contract smoke tests')
console.log(`  network : studionet (chain 61999)`)
console.log(`  address : ${CONTRACT_ADDRESS}\n`)

// 1. Contract responds to list_agreements
let agreements = []
await test('list_agreements() returns an array', async () => {
  const raw = await read('list_agreements')
  agreements = JSON.parse(raw)
  assert(Array.isArray(agreements), `expected array, got ${typeof agreements}`)
})

// 2. Each agreement summary has required fields
await test('list_agreements() entries have id, title, status', async () => {
  if (agreements.length === 0) {
    console.log('       (no agreements on-chain yet — skipping field check)')
    return
  }
  for (const a of agreements) {
    assert(typeof a.id === 'string' && a.id.startsWith('VL-'), `bad id: ${a.id}`)
    assert(typeof a.title === 'string', `missing title on ${a.id}`)
    assert(typeof a.status === 'string', `missing status on ${a.id}`)
  }
})

// 3. get_agreement() returns parseable JSON for each listed id
const liveIds = agreements.map((a) => a.id)
await test('get_agreement() returns valid JSON for each listed id', async () => {
  for (const id of liveIds) {
    const raw = await read('get_agreement', [id])
    const data = JSON.parse(raw)
    assert(data.id === id, `id mismatch: got ${data.id}`)
    assert(['draft','funded','accepted','submitted','disputed',
            'response_submitted','resolved','appealed','settlement_pending','settled','cancelled']
            .includes(data.status), `unexpected status: ${data.status}`)
    assert(/^[0-9a-f]{64}$/.test(data.terms_hash), 'missing frozen terms_hash')
    assert(BigInt(data.reward_deposited) <= BigInt(data.required_reward), 'deposit exceeds required reward')
    if (['draft', 'cancelled'].includes(data.status)) {
      assert(data.reward_deposited === '0', `${id}: ${data.status} agreement holds a deposit`)
    }
    assert(typeof data.client_address === 'string', 'missing client_address')
    assert(typeof data.worker_address === 'string', 'missing worker_address')
  }
})

// 4. get_verdict() is null until an agreement has been adjudicated
await test('get_verdict() returns null before adjudication', async () => {
  const pre = ['draft', 'funded', 'accepted', 'submitted', 'disputed', 'response_submitted', 'cancelled']
  for (const a of agreements.filter((x) => pre.includes(x.status))) {
    const v = JSON.parse(await read('get_verdict', [a.id]))
    assert(v === null, `expected null verdict for ${a.id}, got ${JSON.stringify(v)}`)
  }
})

// 5. consensus verdicts carry their evidence-snapshot provenance and a band-valid payout
await test('consensus verdicts bind to the frozen terms and an evidence snapshot', async () => {
  for (const a of agreements.filter((x) => ['resolved', 'settlement_pending', 'settled'].includes(x.status))) {
    const full = JSON.parse(await read('get_agreement', [a.id]))
    const v = JSON.parse(await read('get_verdict', [a.id]))
    if (v === null) continue // approval / lapse / mutual settlement resolve without adjudication
    assert(v.terms_hash === full.terms_hash, `${a.id}: verdict not bound to frozen terms`)
    assert(/^[0-9a-f]{64}$/.test(v.snapshot), `${a.id}: missing evidence snapshot digest`)
    assert(Number.isInteger(v.payout_bps_to_worker) && v.payout_bps_to_worker >= 0 && v.payout_bps_to_worker <= 10000,
      `${a.id}: payout bps out of range`)
  }
})

// 5b. custody is solvent: real balance covers every outstanding liability
await test('get_custody() reports a solvent contract', async () => {
  const c = JSON.parse(await read('get_custody'))
  assert(BigInt(c.balance) >= BigInt(c.held_total), `balance ${c.balance} < held ${c.held_total}`)
})

// 6. get_evidence() returns an array for any listed agreement
await test('get_evidence() returns an array', async () => {
  if (liveIds.length === 0) return
  const raw = await read('get_evidence', [liveIds[0]])
  const ev = JSON.parse(raw)
  assert(Array.isArray(ev), `expected array, got ${typeof ev}`)
})

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed`)
if (liveIds.length > 0) {
  console.log(`  live agreements on-chain: ${liveIds.join(', ')}`)
} else {
  console.log(`  note: no live agreements on-chain yet; create one to exercise write paths`)
}
console.log()

process.exit(failed > 0 ? 1 : 0)
