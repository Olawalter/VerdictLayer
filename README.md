# VerdictLayer

**Trustless AI adjudication for subjective work.**

VerdictLayer replaces trust in freelance and contractor agreements with cryptographic escrow and consensus-based AI evaluation. Define the work. Fund the escrow. Let the protocol decide.

Built on [GenLayer](https://genlayer.com) — an intelligent contract network where AI runs inside the blockchain, evaluated by multiple independent validators before any result is recorded on-chain.

---

## The Problem

Subjective work disputes have no neutral ground.

- **"Good enough" is relative.** Traditional arbitration is slow, expensive, and biased toward whoever can afford to wait.
- **Escrow is binary.** Classic smart contract escrow releases all-or-nothing. Real work is rarely black and white.
- **Trust is a risk vector.** Both parties bear the risk of the other acting in bad faith. Web3 has eliminated counterparty risk almost everywhere — except where it matters most.

VerdictLayer closes that gap.

---

## How It Works

| Step | Actor | What Happens |
|------|-------|--------------|
| 01 | Client | Draft an agreement — deliverables, acceptance criteria, deadline, evidence rules |
| 02 | Client | Fund escrow — payment is locked in the smart contract |
| 03 | Worker | Accept on-chain — bilateral binding commitment recorded |
| 04 | Worker | Submit deliverables — evidence packages (links, file hashes, screenshots, commits) |
| 05 | Client | Review window — approve delivery or open a dispute |
| 06 | Protocol | AI adjudication — GenLayer validators evaluate the dispute with consensus |
| 07 | Protocol | Settlement — escrow distributed automatically, proportional to fulfillment |

Silence after the review window defaults to approval. Bad-faith actors are flagged in the verdict.

---

## Why GenLayer

Standard AI evaluation has a single point of failure: one model, one output, no accountability. GenLayer changes that.

- **Validator consensus** — multiple independent nodes evaluate the dispute; results must converge before the verdict is accepted.
- **No trusted arbitrator** — the protocol is the judge. There is nothing and no one to bribe, coerce, or corrupt.
- **Auditable prompts** — the evaluation prompt is constructed deterministically from on-chain data. Anyone can verify exactly how a verdict was reached.
- **Economic finality** — verdicts trigger automatic settlement. No enforcement delay, no legal overhead, no appeals process outside the protocol.

---

## Use Cases

- **DAO Bounties** — Protocol treasuries fund external contributors without governance risk. Resolution is automatic.
- **Freelance Milestones** — Designers, developers, and writers work without trust assumptions. Bad-faith clients get flagged on-chain.
- **AI Agent Tasks** — Autonomous agent outputs evaluated against measurable success criteria with evidence-based verdicts.
- **Research Grants** — Academic and applied research deliverables adjudicated against stated methodology and output criteria.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16.2.10 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Animation | Framer Motion |
| Wallet | EIP-6963 multi-wallet discovery (MetaMask, Rabby, etc.) |
| Chain SDK | genlayer-js 1.1.8 |
| Network | GenLayer Studio (studionet, chain ID 61999) |
| Contract | Intelligent Contract — Python on studionet |

---

## Contract

`contract/verdict_layer.py` — a GenLayer Intelligent Contract (runner pinned in its `# Depends` header).

**Deployment:** deployed on studionet at `0xD6d60c1dB4064b9EdD7fb70dc893d5B1c0284c2B` (see REPLY.md). Deploy it with
`PRIVATE_KEY=0x… node scripts/deploy.mjs` and set `NEXT_PUBLIC_VERDICTLAYER_ADDRESS` (see *Environment*). The earlier
studionet deployment (`0x42248f…D6b4`) predates the custody/settlement implementation, has no payable methods and must not
be used with this code.

```
Network: GenLayer Studio Network   Chain ID: 61999
RPC:     https://studio.genlayer.com/api
```

### Custody and settlement

- `fund_agreement` and `appeal_verdict` are **payable**. The ledger (`reward_deposited`, `bond_deposited`) is written from
  `gl.message.value`, never from an argument, and the value must equal the amount frozen in the agreement terms.
- `settle` is the only path that releases funds. It zeroes the ledger, then emits native GEN transfers with the EVM-style
  plain send `emit_transfer(..., on="finalized")` (`_pay`; it credits ordinary accounts, verified with `eth_getBalance`), so they only leave once the settling transaction finalizes.
- A queued payout is `settlement_pending`, **not** settled. `confirm_settlements` marks agreements `settled` only when the
  contract's real balance is no more than the funds it still holds, i.e. the transfers have actually left.
- `get_custody` exposes the real balance next to internal liabilities.

### Authenticated evidence and validator verification

- Every evidence item is bound to a sha256 digest at submission (supplied for URLs, computed on-chain for inline content).
- `request_verdict`: the leader **and every validator** re-fetch each URL, re-hash the bytes and exclude anything that does not
  match its committed digest, then judge the surviving evidence against the frozen terms (`terms_hash`).
- A validator agrees only if its authenticated snapshot is identical to the leader's, the verdict label's payout band holds,
  and its own independent payout is within 15 percentage points. A leader error is never auto-approved.
- If no evidence authenticates, the verdict is `insufficient_evidence` and the pre-agreed `inconclusive_worker_bps` split applies.

## Agreement Lifecycle

```
draft → funded → accepted → submitted ─(approve / review window lapses)─► resolved ─► settlement_pending ─► settled
                                │                                            ▲
                                └► disputed → response_submitted → (request_verdict) ─┘   (resolved may be appealed once, if a bond was frozen)
cancelled / declined / expired / mutual settlement also resolve → settle() → settlement_pending → settled
```

**Verdict types and payout bands** (share of the *deposited* reward owed to the worker):
`fulfilled` 100% · `mostly_fulfilled` 70–95% · `partially_fulfilled` 20–70% · `minor_revision_required` 40–80% ·
`major_revision_required` 5–40% · `not_fulfilled` 0% · `bad_faith_client` 100% · `bad_faith_worker` 0% ·
`out_of_scope_dispute` 100% · `insufficient_evidence` = frozen `inconclusive_worker_bps`.

---

## Demo Cases

The Case Explorer is pre-seeded with four illustrative cases (VL-0001 to VL-0004) so you can explore the verdict UI without creating agreements first. These are **local fixtures only** — they are not stored on-chain. Any case loaded from the live contract is labelled **LIVE** in the UI; demo cases display a **DEMO** badge.

---

## Getting Started

### Prerequisites

- Node.js 18+
- An EVM-compatible injected wallet (MetaMask, Rabby, Trust Wallet, etc.)
- The wallet must be on **GenLayer Studio Network** (chain ID 61999). The app will prompt you to add/switch automatically on your first write transaction.

### Install & Run

```bash
git clone https://github.com/Olawalter/VerdictLayer.git
cd VerdictLayer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

### Run Contract Tests

Python tooling lives in a virtualenv (Python 3.12+; on Windows run the direct tests under WSL/Linux — the direct-test
harness cannot delete its temp file on Windows):

```bash
pip install -r requirements.txt
genvm-lint check contract/verdict_layer.py --json
pytest tests/direct/ -v                  # in-process: custody, evidence, validators, settlement
gltest tests/integration/ -v -s          # needs a running GenLayer Studio + LLM provider
```

Read-only smoke test of a deployed contract (no wallet):

```bash
NEXT_PUBLIC_VERDICTLAYER_ADDRESS=0x… npm run test:contract
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── explorer/page.tsx               # Browse all agreements
│   └── agreements/
│       ├── new/page.tsx                # Create agreement form
│       └── [id]/
│           ├── page.tsx                # Case dashboard (live from contract)
│           ├── submit/page.tsx         # Submit deliverables
│           ├── dispute/page.tsx        # Open dispute
│           ├── respond/page.tsx        # File worker response
│           ├── verdict/page.tsx        # Verdict detail
│           ├── appeal/page.tsx         # Appeal form
│           └── review/page.tsx         # Pre-submission review
├── components/
│   ├── layout/Header.tsx               # Wallet connect + navigation
│   ├── WalletModal.tsx                 # EIP-6963 wallet picker
│   ├── SettlementRail.tsx              # Context-aware action panel
│   ├── VerdictCard.tsx                 # Verdict summary display
│   ├── SettlementSplitter.tsx          # Payout breakdown visualization
│   ├── CriteriaHeatmap.tsx             # Per-criterion verdict overlay
│   ├── DisputePanel.tsx                # Dispute record display
│   ├── EvidenceTimeline.tsx            # Chronological case events
│   ├── EscrowVault.tsx                 # Escrow status widget
│   ├── CriteriaChecklist.tsx           # Acceptance criteria with dispute flags
│   ├── AgreementReadinessMeter.tsx     # Pre-submission completeness check
│   └── CanonicalJsonPanel.tsx          # Raw JSON inspector (collapsible)
├── lib/
│   ├── genlayer.ts                     # Contract client, read/write wrappers
│   ├── injectedWallets.ts              # EIP-6963 discovery + EIP-1193 helpers
│   ├── store.ts                        # Zustand wallet state
│   └── mockData.ts                     # Seeded demo cases (no wallet needed)
└── types/index.ts                      # All TypeScript types and enums
```

---

## Wallet Integration

VerdictLayer uses the **EIP-6963** multi-wallet standard. On page load the app listens for `eip6963:announceProvider` events — any installed wallet that implements EIP-6963 appears in the connect modal automatically, without relying on `window.ethereum`.

Legacy `window.ethereum` (single-wallet injection) is supported as a fallback.

The app persists your last-connected wallet (`rdns`) in `localStorage` and silently reconnects on reload if the wallet is still unlocked.

**Read operations** (browsing agreements, viewing verdicts) never require a wallet. A read-only client is used automatically.

**Write operations** (fund, accept, submit, dispute, respond, request verdict, apply settlement) require a connected wallet on GenLayer Studio Network.

---

## End-to-End Test Flow

Complete manual test using two wallets (Client and Worker):

**Setup**
- Wallet A = Client address
- Wallet B = Worker address
- Both wallets funded with GEN (native token) on studionet

**Steps**

1. **Create Agreement** (Client) — `/agreements/new` — fill title, brief, deliverables, criteria, set Worker to Wallet B address, submit on-chain.
2. **Fund** (Client) — case dashboard → "Fund N GEN". The wallet sends exactly the frozen escrow amount; the contract rejects any other value.
3. **Accept** (Worker) — switch to Wallet B → "Accept Agreement".
4. **Submit Deliverables** (Worker) — `/agreements/[id]/submit` — add a package with either inline content, or a URL plus the sha256 hex of the exact bytes at that URL (`sha256sum file`).
5. **Open Dispute** (Client) — switch to Wallet A → "Open Dispute" → fill statement + challenged deliverables.
6. **File Response** (Worker) — switch to Wallet B → "File Response" → explanation + optional counter-evidence.
7. **Request Verdict** — "Request Verdict" → GenLayer validators evaluate the dispute → redirects to verdict page.
8. **Settle** — anyone → "Settle". If a bond was frozen the verdict is appealable for 24 h first. This queues finalized GEN transfers to the worker/client and shows `settlement_pending`.
9. **Confirm** — after the settle transaction finalizes, "Confirm Delivery" marks `settled` only if the contract balance proves the funds left. A second `settle` is rejected.

Each write transaction is submitted to studionet and polled until `FINALIZED` (status code 7). The UI retries reading the updated state automatically after each action.

---

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_VERDICTLAYER_ADDRESS` | Optional override of the contract address. Defaults to the current studionet deployment in `src/lib/genlayer.ts`. Leave unset on Vercel unless you redeploy. |
| `PRIVATE_KEY` | Deployer key for `scripts/deploy.mjs` only. |

---

## License

MIT

---

## Contact

Walter Olaoluwa — walterolaoluwa@gmail.com
