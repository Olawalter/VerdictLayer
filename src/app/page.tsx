import Link from 'next/link'
import { ArrowRight, Scale, Shield, Clock, Zap, Globe, FileCheck } from 'lucide-react'
import { ALL_CASES } from '@/lib/mockData'
import CaseFileCard from '@/components/CaseFileCard'

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Draft Agreement',
    desc: 'Define deliverables, acceptance criteria, deadline, and evidence rules with machine-readable precision.',
    icon: FileCheck,
  },
  {
    num: '02',
    title: 'Fund Escrow',
    desc: 'Client deposits payment into smart contract escrow. Funds are locked until agreement resolves.',
    icon: Shield,
  },
  {
    num: '03',
    title: 'Worker Accepts',
    desc: 'Worker reviews terms and accepts on-chain, creating a bilateral binding commitment.',
    icon: Scale,
  },
  {
    num: '04',
    title: 'Submit Deliverables',
    desc: 'Worker uploads evidence packages: links, hashes, screenshots, and other proof of work.',
    icon: ArrowRight,
  },
  {
    num: '05',
    title: 'Client Review',
    desc: 'Client has a defined window to approve or open a dispute. Silence = approval after window.',
    icon: Clock,
  },
  {
    num: '06',
    title: 'AI Adjudication',
    desc: 'GenLayer validators run the dispute packet through consensus-based AI evaluation. No single point of control.',
    icon: Zap,
  },
  {
    num: '07',
    title: 'Settlement',
    desc: 'Verdict triggers automatic escrow distribution. Payout is proportional to fulfillment percentage.',
    icon: Globe,
  },
]

const USE_CASES = [
  {
    title: 'DAO Bounties',
    desc: 'Protocol treasuries can fund external contributors without governance risk. Dispute resolution is automatic.',
    color: '#3B82F6',
  },
  {
    title: 'Freelance Milestones',
    desc: 'Designers, developers, and writers can work without trust assumptions. Bad-faith clients get flagged.',
    color: '#8B5CF6',
  },
  {
    title: 'AI Agent Tasks',
    desc: 'Autonomous agent outputs evaluated against measurable success criteria with evidence-based verdicts.',
    color: '#22C55E',
  },
  {
    title: 'Research Grants',
    desc: 'Academic and applied research deliverables adjudicated against stated methodology and output criteria.',
    color: '#F59E0B',
  },
]

const GENLAYER_REASONS = [
  {
    title: 'Validator Consensus',
    desc: 'Multiple independent validators evaluate the dispute. The verdict must be consistent across nodes before it is accepted.',
  },
  {
    title: 'No Trusted Arbitrator',
    desc: 'There is no central arbiter to bribe, corrupt, or coerce. The protocol is the judge.',
  },
  {
    title: 'Auditable Prompts',
    desc: 'The evaluation prompt is constructed deterministically from on-chain data. Anyone can verify how the verdict was reached.',
  },
  {
    title: 'Economic Finality',
    desc: 'Verdicts trigger automatic settlement. No enforcement delay, no legal overhead.',
  },
]

export default function HomePage() {
  const featuredCases = ALL_CASES.slice(0, 3)

  return (
    <div className="min-h-screen bg-[#080A0D]">
      {/* Hero */}
      <section className="border-b border-[#1E2A35] px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-block border border-[#3B82F6]/30 bg-[#3B82F6]/5 px-3 py-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#3B82F6]">
              Powered by GenLayer
            </span>
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-[#F4F7FA] lg:text-6xl">
            Trustless AI adjudication
            <br />
            <span className="text-[#9AA6B2]">for subjective work.</span>
          </h1>
          <p className="mb-10 max-w-2xl text-base leading-relaxed text-[#9AA6B2]">
            VerdictLayer replaces trust in freelance and contractor agreements with
            cryptographic escrow and consensus-based AI evaluation. Define the work.
            Fund the escrow. Let the protocol decide.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/agreements/new"
              className="flex items-center gap-2 bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-colors"
            >
              Create Agreement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/explorer"
              className="flex items-center gap-2 border border-[#1E2A35] bg-[#11161C] px-5 py-2.5 text-sm font-medium text-[#9AA6B2] hover:text-[#F4F7FA] hover:border-[#3B82F6]/40 transition-all"
            >
              Browse Cases
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-[#1E2A35] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-3 text-xs font-semibold uppercase tracking-widest text-[#3B82F6]">
            The Problem
          </h2>
          <p className="mb-8 font-display text-2xl font-bold text-[#F4F7FA] leading-snug">
            Subjective work disputes have no neutral ground.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: 'No objective truth',
                desc: '"Good enough" is subjective. Arbitration is slow, expensive, and biased toward whoever can afford to wait.',
              },
              {
                label: 'Escrow is binary',
                desc: 'Traditional smart contract escrow releases all or nothing. Real work is rarely black and white.',
              },
              {
                label: 'Trust as a risk vector',
                desc: 'Both parties bear the risk of the other acting in bad faith. Web3 removes counterparty risk everywhere except where it matters most.',
              },
            ].map((item, i) => (
              <div key={i} className="border border-[#1E2A35] bg-[#11161C] p-4">
                <div className="mb-2 text-xs font-semibold text-[#F4F7FA]">{item.label}</div>
                <p className="text-xs text-[#9AA6B2] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-b border-[#1E2A35] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-10 text-xs font-semibold uppercase tracking-widest text-[#3B82F6]">
            How It Works
          </h2>
          <div className="space-y-0">
            {WORKFLOW_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={i}
                  className="group flex gap-6 border-b border-[#1E2A35] py-5 last:border-b-0 hover:bg-[#11161C] px-2 transition-colors"
                >
                  <div className="flex-shrink-0 w-16">
                    <span className="font-mono text-2xl font-bold text-[#1E2A35] group-hover:text-[#3B82F6]/20 transition-colors">
                      {step.num}
                    </span>
                  </div>
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center border border-[#1E2A35] bg-[#080A0D]">
                      <Icon className="h-3.5 w-3.5 text-[#3B82F6]" />
                    </div>
                    <div>
                      <div className="font-display text-sm font-semibold text-[#F4F7FA] mb-1">
                        {step.title}
                      </div>
                      <p className="text-xs text-[#9AA6B2] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-b border-[#1E2A35] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-xs font-semibold uppercase tracking-widest text-[#3B82F6]">
            Use Cases
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((uc, i) => (
              <div
                key={i}
                className="border border-[#1E2A35] bg-[#11161C] p-4 border-t-2"
                style={{ borderTopColor: uc.color }}
              >
                <div className="mb-2 font-display text-sm font-semibold text-[#F4F7FA]">
                  {uc.title}
                </div>
                <p className="text-xs text-[#9AA6B2] leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why GenLayer */}
      <section className="border-b border-[#1E2A35] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display mb-4 text-xs font-semibold uppercase tracking-widest text-[#3B82F6]">
                Why GenLayer
              </h2>
              <p className="font-display text-2xl font-bold text-[#F4F7FA] leading-snug mb-4">
                AI consensus, not a single AI judge.
              </p>
              <p className="text-sm text-[#9AA6B2] leading-relaxed">
                GenLayer runs intelligent contracts across a validator network.
                Each validator independently evaluates the dispute and the
                results must converge before any verdict is recorded on-chain.
                This eliminates single points of failure — and single points of
                manipulation.
              </p>
            </div>
            <div className="space-y-3">
              {GENLAYER_REASONS.map((r, i) => (
                <div key={i} className="border border-[#1E2A35] bg-[#11161C] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-1 w-4 bg-[#3B82F6]" />
                    <span className="font-display text-xs font-semibold text-[#F4F7FA]">
                      {r.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#9AA6B2] leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Example Cases */}
      <section className="border-b border-[#1E2A35] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-[#3B82F6]">
              Recent Cases
            </h2>
            <Link
              href="/explorer"
              className="flex items-center gap-1 text-xs text-[#9AA6B2] hover:text-[#F4F7FA] transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {featuredCases.map((c) => (
              <CaseFileCard key={c.id} agreement={c} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#3B82F6]" />
            <span className="font-mono text-xs text-[#9AA6B2]">VerdictLayer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/explorer" className="text-xs text-[#9AA6B2] hover:text-[#F4F7FA]">
              Explorer
            </Link>
            <Link href="/agreements/new" className="text-xs text-[#9AA6B2] hover:text-[#F4F7FA]">
              New Agreement
            </Link>
            <span className="font-mono text-[10px] text-[#1E2A35]">
              Built on GenLayer
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
