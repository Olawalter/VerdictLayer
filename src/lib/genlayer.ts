'use client'

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import type { EIP1193Provider } from './injectedWallets'

// Current escrow-backed deployment on GenLayer Studio (studionet). Verified live: see REPLY.md.
// NEXT_PUBLIC_VERDICTLAYER_ADDRESS is an optional override (e.g. for a redeploy) and is not required.
// The pre-remediation deployment (0x42248f...) recorded notional amounts only and must not be used.
export const DEFAULT_CONTRACT_ADDRESS = '0xD6d60c1dB4064b9EdD7fb70dc893d5B1c0284c2B' as const
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_VERDICTLAYER_ADDRESS || DEFAULT_CONTRACT_ADDRESS) as `0x${string}`

function contractAddress(): `0x${string}` {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      'NEXT_PUBLIC_VERDICTLAYER_ADDRESS is not set. Deploy the corrected contract and set its address.'
    )
  }
  return CONTRACT_ADDRESS
}

const GEN_DECIMALS = 18

/** Decimal GEN string -> wei bigint, without floating point. */
export function genToWei(gen: string): bigint {
  const t = gen.trim()
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error(`Invalid GEN amount: "${gen}"`)
  const [whole, frac = ''] = t.split('.')
  if (frac.length > GEN_DECIMALS) throw new Error('Too many decimal places (max 18).')
  return BigInt(whole) * BigInt(10) ** BigInt(GEN_DECIMALS) + BigInt(frac.padEnd(GEN_DECIMALS, '0') || '0')
}

/** wei (decimal string / bigint) -> GEN display string. */
export function weiToGen(wei: string | bigint | undefined | null): string {
  if (wei === undefined || wei === null || wei === '') return '0'
  const unit = BigInt(10) ** BigInt(GEN_DECIMALS)
  const v = BigInt(wei)
  const whole = v / unit
  const frac = (v % unit).toString().padStart(GEN_DECIMALS, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole.toString()
}

// ---------------------------------------------------------------------------
// Singleton client — rebuilt when wallet connects / changes account
// ---------------------------------------------------------------------------

let _client: ReturnType<typeof createClient> | null = null
let _provider: EIP1193Provider | null = null

export function resetClient(
  provider: EIP1193Provider | null,
  address: string | null
) {
  _provider = provider
  if (!provider || !address) {
    _client = null
    return
  }
  _client = createClient({
    chain: studionet,
    account: address as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: provider as any,
  })
}

function getClient() {
  if (!_client) throw new Error('Wallet not connected. Connect a wallet first.')
  return _client
}

// Read-only client — no wallet required, used for view calls
let _readClient: ReturnType<typeof createClient> | null = null
function getReadClient() {
  if (_client) return _client
  if (!_readClient) _readClient = createClient({ chain: studionet })
  return _readClient
}

// ---------------------------------------------------------------------------
// Network switch — asks the wallet to move to GenLayer Studio (chain 61999)
// before sending any write transaction. Adds the network if not present.
// ---------------------------------------------------------------------------

async function ensureStudioNetwork() {
  if (!_provider) return
  const chainIdHex = `0x${(61999).toString(16)}`
  try {
    await _provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
  } catch (err: unknown) {
    // 4902 = chain not added to wallet yet
    const code = (err as { code?: number }).code
    if (code === 4902 || code === -32603) {
      await _provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: 'Genlayer Studio Network',
          nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
          rpcUrls: ['https://studio.genlayer.com/api'],
          blockExplorerUrls: ['https://genlayer-explorer.vercel.app'],
        }],
      })
    } else {
      throw err
    }
  }
}

// ---------------------------------------------------------------------------
// Read helpers — no gas, no signing
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readContract(method: string, args: any[] = []) {
  const client = getReadClient()
  return client.readContract({
    address: contractAddress(),
    functionName: method,
    args,
  })
}

// ---------------------------------------------------------------------------
// Write helpers — signs via injected wallet + waits for FINALIZED
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeContract(
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[] = [],
  opts: { gas?: bigint; retries?: number; value?: bigint } = {}
) {
  await ensureStudioNetwork()
  const client = getClient()
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: method,
    args,
    // Native GEN sent with the call. Payable methods credit exactly this amount to contract custody.
    value: opts.value ?? BigInt(0),
    // Providing an explicit gas bypasses gen_call simulation, which is required
    // for non-deterministic methods that fail during simulation.
    ...(opts.gas ? { gas: opts.gas } : {}),
  })
  console.log(`[VerdictLayer] tx submitted: ${hash}`)

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: opts.retries ?? 60,
    interval: 3000,
  })

  // receipt.status is the raw numeric code from the API
  const statusCode = Number((receipt as unknown as { status: unknown }).status)
  console.log(`[VerdictLayer] tx ${hash} → status code ${statusCode}`)

  // 5 = ACCEPTED, 7 = FINALIZED  → success
  // 6 = UNDETERMINED, 8 = CANCELED, 12 = VALIDATORS_TIMEOUT, 13 = LEADER_TIMEOUT → failure
  if (![5, 7].includes(statusCode)) {
    throw new Error(
      `Transaction did not succeed (status code: ${statusCode}). ` +
      `The contract may have rejected this call, or validators did not reach consensus.`
    )
  }

  return receipt
}

// ---------------------------------------------------------------------------
// Contract method wrappers
// ---------------------------------------------------------------------------

export async function createAgreement(params: {
  title: string
  work_category: string
  brief: string
  deliverables: string[]
  acceptance_criteria: string[]
  deadline: string
  review_window_days: number
  evidence_rules: string
  payout_model: string
  worker_address: string
  /** exact escrow in GEN (decimal string); frozen on creation */
  required_reward_gen: string
  /** appeal bond in GEN; "0" disables appeals; frozen on creation */
  appeal_bond_gen: string
  /** worker share (basis points) if evidence cannot be authenticated; frozen on creation */
  inconclusive_worker_bps: number
}) {
  return writeContract('create_agreement', [
    params.title,
    params.work_category,
    params.brief,
    JSON.stringify(params.deliverables),
    JSON.stringify(params.acceptance_criteria),
    params.deadline,
    params.review_window_days,
    params.evidence_rules,
    params.payout_model,
    params.worker_address,
    genToWei(params.required_reward_gen),
    genToWei(params.appeal_bond_gen),
    params.inconclusive_worker_bps,
  ])
}

/**
 * Payable: sends exactly `requiredRewardWei` GEN into contract custody.
 * A refused deposit does not revert (the value would otherwise be stranded); the contract parks it as a
 * withdrawable credit. So success is judged from contract state, not from the transaction status.
 */
export async function fundAgreement(agreement_id: string, requiredRewardWei: string) {
  const receipt = await writeContract('fund_agreement', [agreement_id], { value: BigInt(requiredRewardWei) })
  const a = await getAgreement(agreement_id)
  if (a.reward_deposited !== a.required_reward || a.status === 'draft') {
    throw new Error(
      'The contract refused this deposit and parked it as a credit. Use "Withdraw refused deposits" to reclaim it.'
    )
  }
  return receipt
}

/** Pull back value parked by a refused payable call. */
export async function withdrawCredit() {
  return writeContract('withdraw_credit', [])
}

export async function acceptAgreement(agreement_id: string) {
  return writeContract('accept_agreement', [agreement_id])
}

/**
 * Each package needs either `inline_content` (the contract computes its sha256) or a `url` plus
 * the sha256 hex digest of the exact bytes served at that url.
 */
export async function submitDeliverables(agreement_id: string, packages: object[]) {
  return writeContract('submit_deliverables', [agreement_id, JSON.stringify(packages)])
}

export async function approveDelivery(agreement_id: string) {
  return writeContract('approve_delivery', [agreement_id])
}

export async function openDispute(params: {
  agreement_id: string
  statement: string
  challenged_deliverables: string[]
  missing_criteria: string[]
  evidence_links: string[]
  requested_remedy: string
  severity: string
}) {
  return writeContract('open_dispute', [
    params.agreement_id,
    params.statement,
    JSON.stringify(params.challenged_deliverables),
    JSON.stringify(params.missing_criteria),
    JSON.stringify(params.evidence_links),
    params.requested_remedy,
    params.severity,
  ])
}

export async function submitResponse(params: {
  agreement_id: string
  explanation: string
  counter_evidence: object[]
  revision_offer: string
}) {
  return writeContract('submit_response', [
    params.agreement_id,
    params.explanation,
    JSON.stringify(params.counter_evidence),
    params.revision_offer,
  ])
}

export async function requestVerdict(agreement_id: string) {
  // The leader and every validator re-fetch and re-hash the evidence and run an LLM. An explicit
  // gas value skips gen_call simulation, which cannot execute non-deterministic blocks.
  return writeContract('request_verdict', [agreement_id], { gas: BigInt(10_000_000), retries: 120 })
}

/** Permissionless. Queues transfers; they are emitted only when this transaction finalizes. */
export async function settleAgreement(agreement_id: string) {
  return writeContract('settle', [agreement_id])
}

/** Marks queued settlements settled only if the contract balance shows the funds have left. */
export async function confirmSettlements() {
  return writeContract('confirm_settlements', [])
}

/** Payable: sends exactly the frozen appeal bond. A refused bond is parked as a credit (see fundAgreement). */
export async function appealVerdict(agreement_id: string, grounds: string, appealBondWei: string) {
  const receipt = await writeContract('appeal_verdict', [agreement_id, grounds], { value: BigInt(appealBondWei) })
  const a = await getAgreement(agreement_id)
  if (a.status !== 'appealed') {
    throw new Error('The contract refused this appeal and parked the bond as a credit. Withdraw it from the agreement page.')
  }
  return receipt
}

export async function cancelAgreement(agreement_id: string) {
  return writeContract('cancel_agreement', [agreement_id])
}

export async function declineAgreement(agreement_id: string) {
  return writeContract('decline_agreement', [agreement_id])
}

export async function claimAfterReviewWindow(agreement_id: string) {
  return writeContract('claim_after_review_window', [agreement_id])
}

export async function reclaimExpired(agreement_id: string) {
  return writeContract('reclaim_expired', [agreement_id])
}

// ---------------------------------------------------------------------------
// Read wrappers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeAgreement(raw: any): any {
  const deposited: string = raw.reward_deposited ?? '0'
  const shown = deposited !== '0' ? deposited : raw.required_reward
  const bps: number = raw.verdict_bps ?? raw.verdict?.payout_bps_to_worker ?? 0
  const verdict = raw.verdict
    ? {
        ...raw.verdict,
        agreement_id: raw.id,
        payout_percentage_to_worker: bps / 100,
        payout_action: bps >= 10000 ? 'full_release' : bps <= 0 ? 'full_refund' : 'partial_release',
        rendered_at: raw.verdict.adjudicated_at ?? '',
      }
    : undefined
  return {
    ...raw,
    review_window: raw.review_window_days ?? 7,
    // GEN display value; exact wei strings stay in required_reward / reward_deposited
    funding_amount: Number(weiToGen(shown)),
    settlement: raw.settlement
      ? {
          ...raw.settlement,
          worker_amount: Number(weiToGen(raw.settlement.worker_amount)),
          client_amount: Number(weiToGen(raw.settlement.client_amount)),
          applied_at: '',
        }
      : undefined,
    verdict,
  }
}

export async function getAgreement(agreement_id: string) {
  const raw = await readContract('get_agreement', [agreement_id])
  return normalizeAgreement(JSON.parse(raw as string))
}

export async function getVerdict(agreement_id: string) {
  const raw = await readContract('get_verdict', [agreement_id])
  return JSON.parse(raw as string)
}

/** Real contract balance vs. internal liabilities (wei decimal strings). */
export async function getCustody() {
  const raw = await readContract('get_custody')
  return JSON.parse(raw as string) as {
    balance: string
    held_total: string
    pending_total: string
    credit_total: string
    solvent: boolean
  }
}

export async function getDispute(dispute_id: string) {
  const raw = await readContract('get_dispute', [dispute_id])
  return JSON.parse(raw as string)
}

export async function getEvidence(agreement_id: string) {
  const raw = await readContract('get_evidence', [agreement_id])
  return JSON.parse(raw as string) as object[]
}

export async function listAgreements() {
  const raw = await readContract('list_agreements')
  return JSON.parse(raw as string) as object[]
}
