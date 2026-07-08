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

**Deployed on GenLayer Studio (studionet)**

```
Address: 0x5D469e805de2Fe5A6340b4a91dF37eDd9C0114dE
Network: GenLayer Studio Network
Chain ID: 61999
RPC:     https://studio.genlayer.com/api
Explorer: https://genlayer-explorer.vercel.app
```

---

## Agreement Lifecycle

```
Draft → Funded → Accepted → Submitted ──────────────────────────────────► Finalized
                                      ↘ Disputed → ResponseSubmitted → Resolved → Finalized
```

**Verdict types** span the full spectrum:
`fulfilled` · `mostly_fulfilled` · `partially_fulfilled` · `minor_revision_required` · `major_revision_required` · `not_fulfilled` · `bad_faith_client` · `bad_faith_worker` · `insufficient_evidence`

**Payout actions:**
`full_release` · `partial_release` · `full_refund` · `partial_refund` · `hold_pending_revision` · `escrow_hold`

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
2. **Fund** (Client) — case dashboard → enter amount + currency → "Fund Agreement".
3. **Accept** (Worker) — switch to Wallet B → "Accept Agreement".
4. **Submit Deliverables** (Worker) — `/agreements/[id]/submit` — add at least one package with title, URL, evidence type.
5. **Open Dispute** (Client) — switch to Wallet A → "Open Dispute" → fill statement + challenged deliverables.
6. **File Response** (Worker) — switch to Wallet B → "File Response" → explanation + optional counter-evidence.
7. **Request Verdict** — "Request Verdict" → GenLayer validators evaluate the dispute → redirects to verdict page.
8. **Apply Settlement** — "Apply Settlement" → executes payout from escrow.

Each write transaction is submitted to studionet and polled until `FINALIZED` (status code 7). The UI retries reading the updated state automatically after each action.

---

## Environment

No environment variables are required. The contract address and RPC endpoint are set in `src/lib/genlayer.ts`. To point to a different deployment, update `CONTRACT_ADDRESS` in that file.

---

## License

MIT

---

## Contact

Walter Olaoluwa — walterolaoluwa@gmail.com
