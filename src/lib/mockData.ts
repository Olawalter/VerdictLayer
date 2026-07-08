import {
  Agreement,
  AgreementStatus,
  WorkCategory,
  EvidenceType,
  VerdictType,
  PayoutAction,
  Evidence,
  Dispute,
  Verdict,
} from '@/types'

// ─── Case 1: DAO Bounty — Partially Fulfilled ──────────────────────────────

const evidence_vl0001: Evidence[] = [
  {
    evidence_id: 'EV-0001',
    agreement_id: 'VL-0001',
    submitted_by: '0xA1B2c3d4E5f6a7B8c9D0e1F2a3B4c5D6e7F8a9B0',
    evidence_type: EvidenceType.Link,
    title: 'Smart Contract Audit Repository',
    description: 'GitHub repo containing audited contracts and findings report',
    url: 'https://github.com/dao-worker/v3-audit-scope',
    content_hash: 'sha256:3e7a9c1b4d2f8e5a6b0c3d7f9e2a4b8c1d5f7a9b3e6c8d0f2a4b6c8d0e2f4a6',
    submitted_at: '2025-11-18T14:22:00Z',
    source_label: 'worker',
    claimed_relevance: 'Complete audit findings for all contracts in scope',
  },
  {
    evidence_id: 'EV-0002',
    agreement_id: 'VL-0001',
    submitted_by: '0xA1B2c3d4E5f6a7B8c9D0e1F2a3B4c5D6e7F8a9B0',
    evidence_type: EvidenceType.Document,
    title: 'Audit PDF Report — v3 Core Contracts',
    description: '47-page security audit report covering 3 of 5 contracts',
    url: 'https://ipfs.io/ipfs/Qm7xK9bVn3eP8mLjD4cFwY2uA6hR1oT5sZ8qB0iE3nG',
    content_hash: 'sha256:7b2e9d4c1f6a3b8e5c0d4f7a2b5e8c1d4f7a0b3c6e9d2f5a8b1c4e7d0f3a6b9',
    submitted_at: '2025-11-18T14:24:00Z',
    source_label: 'worker',
    claimed_relevance: 'Main deliverable: security audit report',
  },
  {
    evidence_id: 'EV-0003',
    agreement_id: 'VL-0001',
    submitted_by: '0xF1e2D3c4B5a6F7e8D9c0B1a2F3e4D5c6B7a8F9e0',
    evidence_type: EvidenceType.Communication,
    title: 'Discord Thread — Scope Negotiation',
    description:
      'Thread showing worker agreed to audit all 5 contracts but only delivered 3, citing "scope creep" on the governance module',
    url: 'https://discord.com/channels/dao-security/audit-thread-1182',
    content_hash: 'sha256:1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2d5f8a1c4',
    submitted_at: '2025-11-20T09:11:00Z',
    source_label: 'client',
    claimed_relevance: 'Proves 5-contract scope was agreed upon before start',
  },
]

const dispute_vl0001: Dispute = {
  dispute_id: 'DS-0001',
  agreement_id: 'VL-0001',
  opened_by: '0xF1e2D3c4B5a6F7e8D9c0B1a2F3e4D5c6B7a8F9e0',
  statement:
    'Worker submitted audit for only 3 of the 5 specified contracts. The governance.sol and timelock.sol modules — which carry the highest protocol risk — were omitted without prior authorization. The deliverable is fundamentally incomplete.',
  challenged_deliverables: [
    'Security audit of governance.sol',
    'Security audit of timelock.sol',
  ],
  missing_criteria: [
    'Coverage of all 5 contracts in scope',
    'Timelock reentrancy analysis',
    'Governance vote manipulation threat model',
  ],
  evidence_links: ['EV-0003'],
  requested_remedy: 'partial_refund',
  severity: 'high',
  opened_at: '2025-11-20T09:15:00Z',
}

const verdict_vl0001: Verdict = {
  agreement_id: 'VL-0001',
  verdict: VerdictType.PartiallyFulfilled,
  payout_action: PayoutAction.PartialRelease,
  payout_percentage_to_worker: 60,
  confidence_band: 'high',
  evidence_strength: 'strong',
  revision_recommended: true,
  short_reason:
    'The worker delivered a professional audit for 3 of 5 in-scope contracts and cannot credibly argue scope reduction was authorized — the Discord thread establishes the 5-contract scope was agreed. However, the 3 delivered audits are of documented high quality. A 60% release reflects completed work; remaining 40% is contingent on delivering the governance and timelock modules.',
  rendered_at: '2025-11-22T11:45:00Z',
}

export const MOCK_CASE_VL0001: Agreement = {
  id: 'VL-0001',
  client_address: '0xF1e2D3c4B5a6F7e8D9c0B1a2F3e4D5c6B7a8F9e0',
  worker_address: '0xA1B2c3d4E5f6a7B8c9D0e1F2a3B4c5D6e7F8a9B0',
  title: 'DeFi Protocol v3 — Full Security Audit',
  work_category: WorkCategory.DaoBounty,
  brief:
    'Conduct a comprehensive smart contract security audit of the DeFiCore v3 protocol. Scope includes 5 contracts: core.sol, vault.sol, router.sol, governance.sol, and timelock.sol. Provide a written report with severity ratings, proof-of-concept exploits for critical findings, and remediation recommendations.',
  deliverables: [
    'Security audit report (PDF) covering all 5 contracts',
    'Severity-rated findings list (Critical / High / Medium / Low)',
    'PoC exploit code for any Critical or High findings',
    'Remediation recommendations for each finding',
    'Executive summary suitable for public disclosure',
  ],
  acceptance_criteria: [
    'All 5 contracts fully analyzed',
    'Report follows standard audit format (e.g., Trail of Bits, Code4rena style)',
    'All Critical findings include working PoC',
    'Delivered within 21 days of agreement acceptance',
    'No pre-disclosure of findings until client review period ends',
  ],
  deadline: '2025-11-21T23:59:00Z',
  funding_amount: 8500,
  currency: 'USDC',
  review_window: 7,
  evidence_rules:
    'GitHub commits with timestamps, IPFS-pinned PDF report, Discord/Telegram communications, on-chain transaction receipts if applicable',
  payout_model: 'milestone_on_delivery',
  created_at: '2025-10-28T10:00:00Z',
  status: AgreementStatus.Resolved,
  funded_at: '2025-10-28T12:00:00Z',
  accepted_at: '2025-10-29T09:30:00Z',
  submitted_at: '2025-11-18T14:30:00Z',
  disputed_at: '2025-11-20T09:15:00Z',
  active_dispute_id: 'DS-0001',
  worker_response: {
    explanation:
      'The governance.sol and timelock.sol contracts were added to the repository after the agreement was signed and represent a 40% increase in scope. I verbally flagged this to the client in Discord but they insisted the deadline remain unchanged. Three completed audits in 21 days is already above market pace.',
    revision_offer: 'I will complete governance.sol and timelock.sol within 14 additional days for 25% of the original fee.',
    responded_at: '2025-11-21T16:00:00Z',
  },
  evidence: evidence_vl0001,
  dispute: dispute_vl0001,
  verdict: verdict_vl0001,
}

// ─── Case 2: Freelance Design — Bad Faith Client ───────────────────────────

const evidence_vl0002: Evidence[] = [
  {
    evidence_id: 'EV-0010',
    agreement_id: 'VL-0002',
    submitted_by: '0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2',
    evidence_type: EvidenceType.Link,
    title: 'Brand Identity Figma File',
    description: 'Complete brand identity system: logo suite, color palette, typography, icon set, component library',
    url: 'https://figma.com/file/9xKjHnBvQwErTy2/BrandIdentity-v3-Final',
    content_hash: 'sha256:9d2f5a8b1c4e7d0f3a6b9c2e5f8a1b4d7e0c3f6a9b2d5e8f1a4b7c0d3e6f9a2',
    submitted_at: '2026-01-10T17:00:00Z',
    source_label: 'worker',
    claimed_relevance: 'Primary deliverable: complete brand identity system',
  },
  {
    evidence_id: 'EV-0011',
    agreement_id: 'VL-0002',
    submitted_by: '0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2',
    evidence_type: EvidenceType.Screenshot,
    title: 'Client Feedback — Iteration 1 (Positive)',
    description: 'Screenshot of Slack message where client praised the direction and approved proceeding to refinement',
    url: 'https://ipfs.io/ipfs/Qm3aP7nKjHxVwErTyBv5cFdYu8iLmNo2qRsZtGhAe4',
    content_hash: 'sha256:2e5b8c1d4f7a0b3c6e9d2f5a8b1c4e7d0f3a6b9c2e5b8c1d4f7a0b3c6e9d2f5',
    submitted_at: '2026-01-10T17:05:00Z',
    source_label: 'worker',
    claimed_relevance: 'Shows client approved direction mid-project',
  },
  {
    evidence_id: 'EV-0012',
    agreement_id: 'VL-0002',
    submitted_by: '0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2',
    evidence_type: EvidenceType.Communication,
    title: 'Email: Client Admits Using Designs',
    description:
      'Email thread where client accidentally cc\'d worker on internal communications showing the delivered brand assets being used in production website and marketing materials',
    url: 'https://ipfs.io/ipfs/Qm5cFdYu8iLmNo2qRsZtGhAeP7nKjHxVwErTyBv3aP7n',
    content_hash: 'sha256:5a8b1c4e7d0f3a6b9c2e5f8a1b4d7e0c3f6a9b2d5e8f1a4b7c0d3e6f9a2b5c8',
    submitted_at: '2026-01-12T08:30:00Z',
    source_label: 'worker',
    claimed_relevance: 'Proves client is already using the delivered work',
  },
]

const verdict_vl0002: Verdict = {
  agreement_id: 'VL-0002',
  verdict: VerdictType.BadFaithClient,
  payout_action: PayoutAction.FullRelease,
  payout_percentage_to_worker: 100,
  confidence_band: 'high',
  evidence_strength: 'strong',
  revision_recommended: false,
  short_reason:
    'All contractual deliverables were completed to specification and the client demonstrably accepted the work by deploying it in production. The dispute appears to be a bad-faith attempt to withhold payment for work already received and used. Full payout to the worker is warranted.',
  rendered_at: '2026-01-15T14:22:00Z',
}

export const MOCK_CASE_VL0002: Agreement = {
  id: 'VL-0002',
  client_address: '0xB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1',
  worker_address: '0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2',
  title: 'Complete Brand Identity — Nexus Labs',
  work_category: WorkCategory.Design,
  brief:
    'Design a complete brand identity system for Nexus Labs, a deep-tech startup. Include logo design (primary, secondary, icon variants), color system, typography hierarchy, component library for web/print, and a brand usage guide. The aesthetic should convey precision, intelligence, and institutional trust.',
  deliverables: [
    'Logo suite: primary, secondary, monochrome, icon-only variants (SVG + PNG)',
    'Brand color palette with hex, RGB, CMYK values',
    'Typography system: heading, body, mono font selections with usage rules',
    'UI component library in Figma (buttons, cards, forms, nav)',
    'Brand usage guide (PDF, 20+ pages)',
    'All source files in Figma and Illustrator',
  ],
  acceptance_criteria: [
    'Logo works at 16px and billboard scale',
    'Color system passes WCAG AA contrast requirements',
    'Figma file uses auto-layout throughout',
    'All components have documented states (hover, active, disabled)',
    'Brand guide covers DO/DON\'T examples',
    'Delivered within 30 days',
  ],
  deadline: '2026-01-12T23:59:00Z',
  funding_amount: 4200,
  currency: 'USDC',
  review_window: 14,
  evidence_rules:
    'Figma file links with version history, exported asset files, written communication via email or Slack',
  payout_model: 'full_on_approval',
  created_at: '2025-12-10T09:00:00Z',
  status: AgreementStatus.Finalized,
  funded_at: '2025-12-10T10:00:00Z',
  accepted_at: '2025-12-11T08:00:00Z',
  submitted_at: '2026-01-10T17:10:00Z',
  disputed_at: '2026-01-14T11:00:00Z',
  finalized_at: '2026-01-15T15:00:00Z',
  active_dispute_id: 'DS-0002',
  worker_response: {
    explanation:
      'Every deliverable was completed on time and to spec. The client provided positive feedback at every milestone. They are now attempting to dispute after already using the designs in production — I have email evidence of this.',
    revision_offer: 'No revision is necessary. Work is complete and accepted via client conduct.',
    responded_at: '2026-01-14T13:00:00Z',
  },
  evidence: evidence_vl0002,
  dispute: {
    dispute_id: 'DS-0002',
    agreement_id: 'VL-0002',
    opened_by: '0xB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1',
    statement: 'The brand identity does not match our vision. The logo feels generic and the color palette is too conservative for a tech startup. We expected something more innovative.',
    challenged_deliverables: ['Logo suite', 'Color palette'],
    missing_criteria: ['Innovative aesthetic', 'Unique visual identity'],
    evidence_links: [],
    requested_remedy: 'full_refund',
    severity: 'medium',
    opened_at: '2026-01-14T11:00:00Z',
  },
  verdict: verdict_vl0002,
  settlement: {
    worker_amount: 4200,
    client_amount: 0,
    currency: 'USDC',
    applied_at: '2026-01-15T15:00:00Z',
  },
}

// ─── Case 3: AI Agent Task — Insufficient Evidence ─────────────────────────

export const MOCK_CASE_VL0003: Agreement = {
  id: 'VL-0003',
  client_address: '0xD4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3',
  worker_address: '0xE5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4',
  title: 'Autonomous Research Agent — Competitor Intelligence',
  work_category: WorkCategory.AiAgent,
  brief:
    'Build and deploy an autonomous AI research agent that monitors 15 specified competitor websites and Telegram channels daily, extracts structured data on product updates, pricing changes, and announcements, and delivers a weekly digest in JSON format to a specified webhook endpoint.',
  deliverables: [
    'Agent source code (Python) on private GitHub repo',
    'Deployed agent running on provided cloud infra',
    'Daily monitoring of 15 specified sources',
    'Weekly JSON digest to webhook (every Monday 08:00 UTC)',
    'Monitoring dashboard with run logs',
    '30-day operational warranty',
  ],
  acceptance_criteria: [
    'Agent successfully processes all 15 sources',
    'Webhook receives structured JSON on schedule for 2 consecutive weeks',
    'False positive rate below 5%',
    'Source code documented with README and setup instructions',
    'Error handling: agent restarts automatically on failure',
  ],
  deadline: '2026-02-28T23:59:00Z',
  funding_amount: 3800,
  currency: 'ETH',
  review_window: 14,
  evidence_rules:
    'GitHub repo with commit history, deployment logs, webhook delivery receipts, screenshot evidence of running agent',
  payout_model: 'milestone_on_delivery',
  created_at: '2026-01-20T10:00:00Z',
  status: AgreementStatus.Disputed,
  funded_at: '2026-01-20T11:00:00Z',
  accepted_at: '2026-01-21T09:00:00Z',
  submitted_at: '2026-02-27T18:00:00Z',
  disputed_at: '2026-03-02T10:00:00Z',
  active_dispute_id: 'DS-0003',
  evidence: [
    {
      evidence_id: 'EV-0020',
      agreement_id: 'VL-0003',
      submitted_by: '0xE5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4',
      evidence_type: EvidenceType.Link,
      title: 'Agent GitHub Repository',
      description: 'Private repo — link shared with client',
      url: 'https://github.com/worker-private/competitor-agent',
      content_hash: 'sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      submitted_at: '2026-02-27T18:05:00Z',
      source_label: 'worker',
      claimed_relevance: 'Source code for the deployed agent',
    },
  ],
  dispute: {
    dispute_id: 'DS-0003',
    agreement_id: 'VL-0003',
    opened_by: '0xD4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3',
    statement: 'The agent was never fully operational. Only 9 of 15 sources were monitored. No webhook data was received for week 2. Logs show repeated failures with no auto-restart.',
    challenged_deliverables: [
      'Daily monitoring of 15 specified sources',
      'Weekly JSON digest to webhook',
      'Error handling: agent restarts automatically',
    ],
    missing_criteria: [
      'All 15 sources monitored',
      'Two consecutive weeks of webhook delivery',
      'Auto-restart on failure',
    ],
    evidence_links: [],
    requested_remedy: 'partial_refund',
    severity: 'medium',
    opened_at: '2026-03-02T10:00:00Z',
  },
}

// ─── Case 4: Writing — Active / Funded ────────────────────────────────────

export const MOCK_CASE_VL0004: Agreement = {
  id: 'VL-0004',
  client_address: '0xF6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3F4a5',
  worker_address: '0xA7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6',
  title: 'Technical Whitepaper — zkRollup Protocol',
  work_category: WorkCategory.Writing,
  brief:
    'Write a 20-30 page technical whitepaper explaining the zkRollup architecture for a new L2 protocol. Must cover: problem statement, architecture overview, cryptographic primitives used, performance benchmarks vs alternatives, security model, and roadmap. Target audience: technical VCs and protocol researchers.',
  deliverables: [
    'Whitepaper (PDF + LaTeX source) — 20-30 pages',
    'Architecture diagrams (minimum 5)',
    'Benchmark comparison table',
    'Executive summary (1 page)',
  ],
  acceptance_criteria: [
    'Technically accurate: reviewed by at least one internal engineer',
    'Minimum 20 pages excluding diagrams',
    'All diagrams in vector format',
    'Chicago citation format for all references',
    'Delivered within 45 days',
  ],
  deadline: '2026-03-15T23:59:00Z',
  funding_amount: 2500,
  currency: 'USDC',
  review_window: 10,
  evidence_rules:
    'LaTeX source in GitHub, PDF on IPFS, internal engineer sign-off email',
  payout_model: 'full_on_approval',
  created_at: '2026-01-28T10:00:00Z',
  status: AgreementStatus.Accepted,
  funded_at: '2026-01-28T11:00:00Z',
  accepted_at: '2026-01-29T08:30:00Z',
}

// ─── All cases export ──────────────────────────────────────────────────────

export const ALL_CASES: Agreement[] = [
  MOCK_CASE_VL0001,
  MOCK_CASE_VL0002,
  MOCK_CASE_VL0003,
  MOCK_CASE_VL0004,
]

export function getCaseById(id: string): Agreement | undefined {
  return ALL_CASES.find((c) => c.id === id)
}
