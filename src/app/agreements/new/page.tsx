'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { WorkCategory } from '@/types'
import AgreementReadinessMeter from '@/components/AgreementReadinessMeter'
import { createAgreement } from '@/lib/genlayer'
import { useWallet } from '@/lib/store'

const STEPS = [
  'Parties',
  'Work Type',
  'Brief',
  'Deliverables',
  'Acceptance Criteria',
  'Deadline',
  'Review Window',
  'Evidence Rules',
  'Escrow',
  'Payout Model',
  'Preview',
]

interface FormData {
  worker_address: string
  work_category: string
  title: string
  brief: string
  deliverables: string[]
  acceptance_criteria: string[]
  deadline: string
  review_window: string
  evidence_rules: string
  funding_amount: string
  appeal_bond: string
  inconclusive_pct: string
  currency: string
  payout_model: string
}

const EMPTY: FormData = {
  worker_address: '',
  work_category: '',
  title: '',
  brief: '',
  deliverables: [''],
  acceptance_criteria: [''],
  deadline: '',
  review_window: '7',
  evidence_rules: '',
  funding_amount: '',
  appeal_bond: '0',
  inconclusive_pct: '0',
  currency: 'GEN',
  payout_model: '',
}

function computeReadiness(data: FormData) {
  const fields = [
    { label: 'Worker Address', filled: data.worker_address.length > 10 },
    { label: 'Work Category', filled: !!data.work_category },
    { label: 'Title', filled: data.title.length > 5 },
    { label: 'Brief', filled: data.brief.length > 20 },
    { label: 'Deliverables', filled: data.deliverables.some((d) => d.trim().length > 0) },
    { label: 'Acceptance Criteria', filled: data.acceptance_criteria.some((c) => c.trim().length > 0) },
    { label: 'Deadline', filled: !!data.deadline },
    { label: 'Review Window', filled: !!data.review_window },
    { label: 'Evidence Rules', filled: data.evidence_rules.length > 10 },
    { label: 'Funding Amount', filled: parseFloat(data.funding_amount) > 0 },
    { label: 'Payout Model', filled: !!data.payout_model },
  ]
  const filled = fields.filter((f) => f.filled).length
  const score = Math.round((filled / fields.length) * 100)
  return { score, fields }
}

function ListInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={v}
            onChange={(e) => {
              const next = [...values]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder={`${placeholder} ${i + 1}`}
            className="flex-1 border border-[#1E2A35] bg-[#080A0D] px-3 py-2 text-sm text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#3B82F6]/60 focus:outline-none"
          />
          {values.length > 1 && (
            <button
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="border border-[#1E2A35] px-2 text-[#9AA6B2] hover:text-[#EF4444] hover:border-[#EF4444]/40 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => onChange([...values, ''])}
        className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>
    </div>
  )
}

export default function NewAgreementPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { score, fields } = computeReadiness(data)
  const { connected, address } = useWallet()
  const router = useRouter()

  const update = (patch: Partial<FormData>) => setData((d) => ({ ...d, ...patch }))

  async function handleDeploy() {
    setError(null)
    setSubmitting(true)
    try {
      await createAgreement({
        title: data.title,
        work_category: data.work_category,
        brief: data.brief,
        deliverables: data.deliverables.filter(Boolean),
        acceptance_criteria: data.acceptance_criteria.filter(Boolean),
        deadline: data.deadline,
        review_window_days: parseInt(data.review_window),
        evidence_rules: data.evidence_rules,
        payout_model: data.payout_model,
        worker_address: data.worker_address.trim().toLowerCase(),
        required_reward_gen: data.funding_amount,
        appeal_bond_gen: data.appeal_bond || '0',
        inconclusive_worker_bps: Math.round(parseFloat(data.inconclusive_pct || '0') * 100),
      })
      router.push('/explorer')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full border border-[#1E2A35] bg-[#080A0D] px-3 py-2 text-sm text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#3B82F6]/60 focus:outline-none'

  const labelClass = 'block text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-2'

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Your Address (Client)</label>
              <input
                className={fieldClass}
                value={address ?? '(not connected)'}
                readOnly
              />
              <p className="mt-1 text-[10px] text-[#9AA6B2]">Connected wallet address</p>
            </div>
            <div>
              <label className={labelClass}>Worker Address</label>
              <input
                className={fieldClass}
                placeholder="0x..."
                value={data.worker_address}
                onChange={(e) => update({ worker_address: e.target.value })}
              />
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Work Category</label>
              <select
                className={fieldClass}
                value={data.work_category}
                onChange={(e) => update({ work_category: e.target.value })}
              >
                <option value="">Select category…</option>
                {Object.values(WorkCategory).map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Agreement Title</label>
              <input
                className={fieldClass}
                placeholder="e.g. Smart Contract Security Audit"
                value={data.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div>
            <label className={labelClass}>Project Brief</label>
            <textarea
              className={`${fieldClass} min-h-40 resize-y`}
              placeholder="Describe the project scope, context, and expectations in detail. The more specific, the better the AI can evaluate disputes."
              value={data.brief}
              onChange={(e) => update({ brief: e.target.value })}
            />
            <p className="mt-1 text-[10px] text-[#9AA6B2]">
              This text will be included verbatim in the dispute evaluation prompt.
            </p>
          </div>
        )
      case 3:
        return (
          <div>
            <label className={labelClass}>Deliverables</label>
            <p className="text-xs text-[#9AA6B2] mb-3">
              List each deliverable as a concrete, verifiable item.
            </p>
            <ListInput
              values={data.deliverables}
              onChange={(v) => update({ deliverables: v })}
              placeholder="Deliverable"
            />
          </div>
        )
      case 4:
        return (
          <div>
            <label className={labelClass}>Acceptance Criteria</label>
            <p className="text-xs text-[#9AA6B2] mb-3">
              Define pass/fail conditions that can be objectively evaluated.
            </p>
            <ListInput
              values={data.acceptance_criteria}
              onChange={(v) => update({ acceptance_criteria: v })}
              placeholder="Criterion"
            />
          </div>
        )
      case 5:
        return (
          <div>
            <label className={labelClass}>Deadline</label>
            <input
              type="datetime-local"
              className={fieldClass}
              value={data.deadline}
              onChange={(e) => update({ deadline: e.target.value })}
            />
          </div>
        )
      case 6:
        return (
          <div>
            <label className={labelClass}>Review Window (days)</label>
            <p className="text-xs text-[#9AA6B2] mb-3">
              How many days does the client have to review and approve or dispute after delivery?
            </p>
            <input
              type="number"
              min="1"
              max="30"
              className={fieldClass}
              value={data.review_window}
              onChange={(e) => update({ review_window: e.target.value })}
            />
          </div>
        )
      case 7:
        return (
          <div>
            <label className={labelClass}>Evidence Rules</label>
            <p className="text-xs text-[#9AA6B2] mb-3">
              What types of evidence will be accepted? (e.g. GitHub links, IPFS hashes, screenshots)
            </p>
            <textarea
              className={`${fieldClass} min-h-28 resize-y`}
              placeholder="e.g. GitHub commit links with timestamps, IPFS-pinned files, Figma share links, email/Discord screenshots"
              value={data.evidence_rules}
              onChange={(e) => update({ evidence_rules: e.target.value })}
            />
          </div>
        )
      case 8:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Escrow Amount (GEN)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={fieldClass}
                placeholder="0.00"
                value={data.funding_amount}
                onChange={(e) => update({ funding_amount: e.target.value })}
              />
              <p className="mt-1.5 text-[10px] text-[#9AA6B2]">
                Native GEN only. This is the exact amount you must deposit; the contract rejects any other value and
                only treats the agreement as funded once the GEN is actually received.
              </p>
            </div>
            <div>
              <label className={labelClass}>Appeal Bond (GEN, 0 disables appeals)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={fieldClass}
                value={data.appeal_bond}
                onChange={(e) => update({ appeal_bond: e.target.value })}
              />
              <p className="mt-1.5 text-[10px] text-[#9AA6B2]">
                One appeal per agreement. Returned to the appellant if re-adjudication changes the payout; otherwise
                awarded to the counterparty.
              </p>
            </div>
            <div>
              <label className={labelClass}>Worker Share If Evidence Cannot Be Authenticated (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={fieldClass}
                value={data.inconclusive_pct}
                onChange={(e) => update({ inconclusive_pct: e.target.value })}
              />
              <p className="mt-1.5 text-[10px] text-[#9AA6B2]">
                Frozen now. Applies when no submitted evidence matches its committed hash, so no winner is invented.
              </p>
            </div>
          </div>
        )
      case 9:
        return (
          <div>
            <label className={labelClass}>Payout Model</label>
            <div className="space-y-2">
              {[
                {
                  value: 'full_on_approval',
                  label: 'Full on Approval',
                  desc: '100% released when client approves. Verdict determines partial split on dispute.',
                },
                {
                  value: 'milestone_on_delivery',
                  label: 'Milestone on Delivery',
                  desc: 'Payment released when deliverables are submitted. Dispute can claw back.',
                },
                {
                  value: 'proportional_verdict',
                  label: 'Proportional Verdict',
                  desc: 'Payout percentage determined entirely by AI verdict, regardless of approval.',
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer gap-3 border p-3 transition-colors ${
                    data.payout_model === opt.value
                      ? 'border-[#3B82F6]/60 bg-[#3B82F6]/5'
                      : 'border-[#1E2A35] bg-[#080A0D] hover:border-[#1E2A35]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payout_model"
                    value={opt.value}
                    checked={data.payout_model === opt.value}
                    onChange={() => update({ payout_model: opt.value })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#F4F7FA] mb-0.5">{opt.label}</div>
                    <div className="text-[10px] text-[#9AA6B2]">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )
      case 10:
        return (
          <div className="space-y-4">
            <div className="border border-[#1E2A35] bg-[#080A0D] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">
                Agreement Preview
              </div>
              <dl className="space-y-2">
                {[
                  ['Title', data.title],
                  ['Category', data.work_category],
                  ['Worker', data.worker_address],
                  ['Escrow', `${data.funding_amount} GEN`],
                  ['Appeal Bond', `${data.appeal_bond || '0'} GEN`],
                  ['Inconclusive Split', `${data.inconclusive_pct || '0'}% to worker`],
                  ['Deadline', data.deadline],
                  ['Review Window', `${data.review_window} days`],
                  ['Payout Model', data.payout_model],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <dt className="w-32 flex-shrink-0 text-[10px] text-[#9AA6B2]">{k}</dt>
                    <dd className="font-mono text-xs text-[#F4F7FA] break-all">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {error && (
              <div className="border border-[#EF4444]/40 bg-[#EF4444]/5 p-3 text-xs text-[#EF4444]">
                {error}
              </div>
            )}
            {!connected && (
              <div className="border border-[#F59E0B]/40 bg-[#F59E0B]/5 p-3 text-xs text-[#F59E0B]">
                Connect your wallet first using the button in the header.
              </div>
            )}
            <button
              onClick={handleDeploy}
              disabled={submitting || !connected}
              className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying to GenLayer…
                </>
              ) : (
                'Deploy Agreement On-Chain'
              )}
            </button>
            <p className="text-[10px] text-[#9AA6B2] text-center">
              Sends a transaction to the VerdictLayer contract on GenLayer Studio.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#080A0D]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FA]">
            New Agreement
          </h1>
          <p className="mt-1 text-sm text-[#9AA6B2]">
            Build a dispute-ready work agreement
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Step rail */}
          <div className="col-span-2">
            <div className="space-y-0.5">
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[10px] transition-colors ${
                    i === step
                      ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-l-2 border-[#3B82F6]'
                      : i < step
                        ? 'text-[#9AA6B2] hover:text-[#F4F7FA]'
                        : 'text-[#1E2A35] hover:text-[#9AA6B2]'
                  }`}
                >
                  <span className="font-mono">{String(i + 1).padStart(2, '0')}</span>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="col-span-7">
            <div className="border border-[#1E2A35] bg-[#11161C] p-6">
              <div className="mb-1 font-mono text-[10px] text-[#3B82F6] uppercase tracking-widest">
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="font-display text-lg font-bold text-[#F4F7FA] mb-6">
                {STEPS[step]}
              </h2>
              {renderStep()}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-2 border border-[#1E2A35] px-4 py-2 text-xs text-[#9AA6B2] hover:text-[#F4F7FA] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                {step < STEPS.length - 1 && (
                  <button
                    onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
                    className="flex items-center gap-2 bg-[#3B82F6] px-4 py-2 text-xs font-medium text-white hover:bg-[#2563EB] transition-colors"
                  >
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Readiness meter */}
          <div className="col-span-3">
            <AgreementReadinessMeter score={score} fields={fields} />
          </div>
        </div>
      </div>
    </div>
  )
}
