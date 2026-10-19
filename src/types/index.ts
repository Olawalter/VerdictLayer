// VerdictLayer — TypeScript types

export enum AgreementStatus {
  Draft = 'draft',
  Funded = 'funded',
  Accepted = 'accepted',
  Submitted = 'submitted',
  Disputed = 'disputed',
  ResponseSubmitted = 'response_submitted',
  Resolved = 'resolved',
  Appealed = 'appealed',
  SettlementPending = 'settlement_pending',
  Settled = 'settled',
  Cancelled = 'cancelled',
}

export enum VerdictType {
  Fulfilled = 'fulfilled',
  MostlyFulfilled = 'mostly_fulfilled',
  PartiallyFulfilled = 'partially_fulfilled',
  MinorRevisionRequired = 'minor_revision_required',
  MajorRevisionRequired = 'major_revision_required',
  NotFulfilled = 'not_fulfilled',
  BadFaithClient = 'bad_faith_client',
  BadFaithWorker = 'bad_faith_worker',
  InsufficientEvidence = 'insufficient_evidence',
  OutOfScopeDispute = 'out_of_scope_dispute',
  ManualReviewRequired = 'manual_review_required',
}

export enum PayoutAction {
  FullRelease = 'full_release',
  PartialRelease = 'partial_release',
  FullRefund = 'full_refund',
  PartialRefund = 'partial_refund',
  HoldPendingRevision = 'hold_pending_revision',
  EscrowHold = 'escrow_hold',
}

export enum WorkCategory {
  Design = 'design',
  Development = 'development',
  Writing = 'writing',
  Research = 'research',
  DataAnalysis = 'data_analysis',
  VideoProduction = 'video_production',
  Marketing = 'marketing',
  Legal = 'legal',
  AiAgent = 'ai_agent',
  DaoBounty = 'dao_bounty',
  Other = 'other',
}

export enum EvidenceType {
  Link = 'link',
  FileHash = 'file_hash',
  Screenshot = 'screenshot',
  Document = 'document',
  CodeCommit = 'code_commit',
  Communication = 'communication',
  OnchainTx = 'onchain_tx',
}

export interface Evidence {
  evidence_id: string
  agreement_id: string
  submitted_by: string
  evidence_type: EvidenceType
  title: string
  description: string
  url: string
  content_hash: string
  submitted_at: string
  source_label: 'worker' | 'client' | 'worker_response' | 'third_party'
  claimed_relevance: string
}

export interface Dispute {
  dispute_id: string
  agreement_id: string
  opened_by: string
  statement: string
  challenged_deliverables: string[]
  missing_criteria: string[]
  evidence_links: string[]
  requested_remedy: string
  severity: 'low' | 'medium' | 'high'
  opened_at: string
}

export interface WorkerResponse {
  explanation: string
  revision_offer: string
  responded_at: string
}

export interface Verdict {
  agreement_id: string
  verdict: VerdictType
  payout_action: PayoutAction
  payout_percentage_to_worker: number
  confidence_band?: 'low' | 'medium' | 'high'
  evidence_strength?: 'weak' | 'moderate' | 'strong'
  revision_recommended?: boolean
  short_reason: string
  rendered_at: string
  // on-chain adjudication provenance (live agreements)
  payout_bps_to_worker?: number
  terms_hash?: string
  snapshot?: string
  verified_ids?: string[]
  unverified?: { evidence_id: string; reason: string }[]
  criteria_findings?: string[]
}

export interface Appeal {
  appeal_id: string
  agreement_id: string
  opened_by: string
  grounds: string
  bond_amount: number
  status: 'pending' | 'accepted' | 'rejected'
  opened_at: string
}

export interface Settlement {
  worker_amount: number
  client_amount: number
  currency: string
  applied_at: string
  state?: string
}

export interface Agreement {
  id: string
  client_address: string
  worker_address: string
  title: string
  work_category: WorkCategory
  brief: string
  deliverables: string[]
  acceptance_criteria: string[]
  deadline: string
  funding_amount: number
  currency: string
  review_window: number
  evidence_rules: string
  payout_model: string
  created_at: string
  status: AgreementStatus
  worker_response?: WorkerResponse
  funded_at?: string
  accepted_at?: string
  submitted_at?: string
  disputed_at?: string
  finalized_at?: string
  active_dispute_id?: string
  active_appeal_id?: string
  settlement?: Settlement
  // custody + frozen terms (live agreements; amounts are wei as decimal strings)
  terms_hash?: string
  required_reward?: string
  reward_deposited?: string
  appeal_bond?: string
  bond_deposited?: string
  inconclusive_worker_bps?: number
  appealable?: boolean
  resolved_at?: number
  verdict_source?: string
  // enriched client-side
  evidence?: Evidence[]
  dispute?: Dispute
  verdict?: Verdict
}

export interface TimelineEvent {
  id: string
  type: 'agreement' | 'evidence' | 'dispute' | 'response' | 'verdict' | 'appeal' | 'settlement'
  label: string
  description: string
  actor: string
  timestamp: string
  data?: unknown
}
