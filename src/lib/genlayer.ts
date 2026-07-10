'use client'

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import type { EIP1193Provider } from './injectedWallets'

export const CONTRACT_ADDRESS = '0xb20520521A383010E73fa69F1de193dF1785326c' as const

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
    provider: provider as Parameters<typeof createClient>[0]['provider'],
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
// Network switch — asks the wallet to move to GenLayer Asimov (chain 4221)
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
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: method,
    args,
  })
}

// ---------------------------------------------------------------------------
// Write helpers — signs via injected wallet + waits for ACCEPTED
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeContract(method: string, args: any[] = [], opts: { gas?: bigint; retries?: number } = {}) {
  await ensureStudioNetwork()
  const client = getClient()
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: method,
    args,
    value: BigInt(0),
    // Providing an explicit gas bypasses gen_call simulation, which is required
    // for non-deterministic methods (gl.eq_principle) that fail during simulation.
    ...(opts.gas ? { gas: opts.gas } : {}),
  })
  console.log(`[VerdictLayer] tx submitted: ${hash}`)

  // On GenLayer Studio, transactions go directly to FINALIZED (numeric 7)
  // without stopping at ACCEPTED (5). Wait for FINALIZED as the primary target.
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
      `Transaction failed on-chain (status code: ${statusCode}). ` +
      `The contract may have rejected this call — check your wallet address matches the required role.`
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
  ])
}

export async function fundAgreement(agreement_id: string, amount: number, currency: string) {
  return writeContract('fund_agreement', [agreement_id, amount, currency])
}

export async function acceptAgreement(agreement_id: string) {
  return writeContract('accept_agreement', [agreement_id])
}

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
  // request_verdict uses gl.eq_principle.strict_eq (non-deterministic AI consensus).
  // gen_call simulation fails for these — pass explicit gas to skip simulation.
  // Validator consensus + single LLM call can take up to 3–4 minutes on studionet;
  // use 120 retries × 3s = 6 minutes to avoid a false timeout.
  return writeContract('request_verdict', [agreement_id], { gas: BigInt(10_000_000), retries: 120 })
}

export async function applyVerdict(agreement_id: string) {
  return writeContract('apply_verdict', [agreement_id])
}

export async function appealVerdict(agreement_id: string, grounds: string, bond_amount: number) {
  return writeContract('appeal_verdict', [agreement_id, grounds, bond_amount])
}

export async function finalizeAgreement(agreement_id: string) {
  return writeContract('finalize_agreement', [agreement_id])
}

// ---------------------------------------------------------------------------
// Read wrappers
// ---------------------------------------------------------------------------

export async function getAgreement(agreement_id: string) {
  const raw = await readContract('get_agreement', [agreement_id])
  return JSON.parse(raw as string)
}

export async function getVerdict(agreement_id: string) {
  const raw = await readContract('get_verdict', [agreement_id])
  return JSON.parse(raw as string)
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
