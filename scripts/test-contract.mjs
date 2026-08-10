/**
 * Basic smoke tests against the deployed VerdictLayer contract on studionet.
 * Run with: node scripts/test-contract.mjs
 *
 * Tests that the contract is reachable and that read methods return
 * well-formed data. No wallet required — all calls are view-only.
 */

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const CONTRACT_ADDRESS = '0x42248fBa931Fb9e77e491ee03ac5ccC82dBeD6b4'

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
            'response_submitted','resolved','finalized','appealed']
            .includes(data.status), `unexpected status: ${data.status}`)
    assert(typeof data.client_address === 'string', 'missing client_address')
    assert(typeof data.worker_address === 'string', 'missing worker_address')
  }
})

// 4. get_verdict() returns null JSON for agreements without a verdict
await test('get_verdict() returns null for non-resolved agreements', async () => {
  const unresolvedIds = agreements
    .filter((a) => !['resolved', 'finalized'].includes(a.status))
    .map((a) => a.id)
  for (const id of unresolvedIds) {
    const raw = await read('get_verdict', [id])
    const v = JSON.parse(raw)
    assert(v === null, `expected null verdict for ${id}, got ${JSON.stringify(v)}`)
  }
})

// 5. get_verdict() returns a valid verdict object for resolved agreements
await test('get_verdict() returns valid verdict for resolved/finalized agreements', async () => {
  const resolvedIds = agreements
    .filter((a) => ['resolved', 'finalized'].includes(a.status))
    .map((a) => a.id)
  if (resolvedIds.length === 0) {
    console.log('       (no resolved agreements yet — skipping verdict field check)')
    return
  }
  const validVerdicts = [
    'fulfilled','mostly_fulfilled','partially_fulfilled',
    'minor_revision_required','major_revision_required','not_fulfilled',
    'bad_faith_client','bad_faith_worker','insufficient_evidence','out_of_scope_dispute',
  ]
  const validActions = [
    'full_release','partial_release','full_refund','partial_refund','hold_pending_revision',
  ]
  for (const id of resolvedIds) {
    const raw = await read('get_verdict', [id])
    const v = JSON.parse(raw)
    assert(v !== null, `null verdict for resolved agreement ${id}`)
    assert(validVerdicts.includes(v.verdict), `unexpected verdict type: ${v.verdict}`)
    assert(validActions.includes(v.payout_action), `unexpected payout_action: ${v.payout_action}`)
    assert(Number.isInteger(v.payout_percentage_to_worker), 'payout_percentage_to_worker not integer')
    assert(v.payout_percentage_to_worker >= 0 && v.payout_percentage_to_worker <= 100,
      `payout out of range: ${v.payout_percentage_to_worker}`)
  }
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
