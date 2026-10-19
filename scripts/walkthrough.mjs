/**
 * Live funding -> adjudication -> settlement walkthrough on studionet.
 *   CLIENT_PRIVATE_KEY=0x.. WORKER_PRIVATE_KEY=0x.. NEXT_PUBLIC_VERDICTLAYER_ADDRESS=0x.. node scripts/walkthrough.mjs
 * Prints every tx hash and the contract state after each step. Appeal bond is 0 so settle() is immediate.
 */
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { createHash } from 'crypto'

const address = process.env.NEXT_PUBLIC_VERDICTLAYER_ADDRESS
const client = createAccount(process.env.CLIENT_PRIVATE_KEY)
const worker = createAccount(process.env.WORKER_PRIVATE_KEY)
const cc = createClient({ chain: studionet, account: client })
const wc = createClient({ chain: studionet, account: worker })
const REWARD = 10n ** 15n // 0.001 GEN

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const read = async (m, args = []) => cc.readContract({ address, functionName: m, args })

async function send(c, label, method, args = [], value = 0n, gas) {
  const hash = await c.writeContract({ address, functionName: method, args, value, ...(gas ? { gas } : {}) })
  let tx
  for (let i = 0; i < 120; i++) {
    await sleep(3000)
    tx = await c.getTransaction({ hash })
    if (['FINALIZED', 'ACCEPTED', 'UNDETERMINED', 'CANCELED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'].includes(tx.statusName)) break
  }
  console.log(`[${label}] ${method} tx=${hash} status=${tx.statusName}`)
  return { hash, tx }
}

const show = async (label, aid) => {
  const cust = await read('get_custody')
  const a = aid ? JSON.parse(await read('get_agreement', [aid])) : null
  console.log(`   state after ${label}:`, aid ? `status=${a.status} reward_deposited=${a.reward_deposited}` : '', 'custody=', cust)
  return a
}

const evidence = 'Landing page shipped: hero, features, pricing sections; responsive; WCAG AA contrast verified.'
const before = { worker: 0n, client: 0n }
{
  const r = async (addr) => BigInt((await (await fetch('https://studio.genlayer.com/api', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] }),
  })).json()).result)
  before.worker = await r(worker.address); before.client = await r(client.address)
  console.log('   eth_getBalance before :', JSON.stringify({ worker: String(before.worker), client: String(before.client) }))
}
const aid = 'VL-' + String(JSON.parse(await read('list_agreements')).length + 1).padStart(4, '0')

await send(cc, 'client', 'create_agreement', [
  'Landing page', 'design', 'Build a three-section landing page',
  JSON.stringify(['Landing page']), JSON.stringify(['Has hero, features and pricing sections', 'Responsive', 'WCAG AA contrast']),
  '2099-01-01', 3, 'Inline text evidence', 'milestone', worker.address, REWARD, 0n, 3000,
])
await show('create', aid)

// wrong value must be rejected
try {
  const r = await send(cc, 'client', 'fund_agreement', [aid], REWARD - 1n)
  console.log('   wrong-value fund tx status (expect not FINALIZED/ACCEPTED success):', r.tx.statusName)
} catch (e) { console.log('   wrong-value fund rejected:', String(e.message).slice(0, 160)) }
await show('wrong-value fund attempt', aid)

await send(cc, 'client', 'withdraw_credit', [])
await show('withdraw_credit (refused deposit returned)', aid)
await sleep(45000)
await send(cc, 'client', 'confirm_settlements', [])
await show('confirm credit withdrawal', aid)
await send(cc, 'client', 'fund_agreement', [aid], REWARD)
await show('exact funding', aid)

await send(wc, 'worker', 'accept_agreement', [aid])
await send(wc, 'worker', 'submit_deliverables', [aid, JSON.stringify([{ evidence_type: 'document', title: 'Page copy', inline_content: evidence, claimed_relevance: 'all criteria' }])])
console.log('   evidence sha256 expected:', createHash('sha256').update(evidence).digest('hex'))
console.log('   stored evidence:', await read('get_evidence', [aid]))
await send(cc, 'client', 'open_dispute', [aid, 'Not all sections present', '[]', '[]', '[]', 'refund', 'high'])
await send(cc, 'client', 'request_verdict', [aid], 0n, 10_000_000n)
await show('request_verdict', aid)
console.log('   verdict:', await read('get_verdict', [aid]))

await send(cc, 'client', 'settle', [aid])
await show('settle', aid)
try { const r = await send(cc, 'client', 'settle', [aid]); console.log('   second settle status:', r.tx.statusName) } catch (e) { console.log('   second settle rejected:', String(e.message).slice(0, 160)) }
await sleep(45000)
await send(cc, 'client', 'confirm_settlements', [])
const fin = await show('confirm_settlements', aid)
console.log('   settlement:', JSON.stringify(fin.settlement))
const bal = async (addr) => BigInt((await (await fetch('https://studio.genlayer.com/api', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] }),
})).json()).result)
const after = { worker: await bal(worker.address), client: await bal(client.address) }
console.log('   eth_getBalance after  :', JSON.stringify({ worker: String(after.worker), client: String(after.client) }))
console.log('   worker balance delta  :', String(after.worker - before.worker), '(expected', String(REWARD), ')')
