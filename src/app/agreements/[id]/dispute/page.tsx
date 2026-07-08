'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { openDispute } from '@/lib/genlayer'

export default function OpenDisputePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [statement, setStatement] = useState('')
  const [challenged, setChallenged] = useState([''])
  const [missing, setMissing] = useState([''])
  const [remedy, setRemedy] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldClass =
    'w-full border border-[#1E2A35] bg-[#080A0D] px-3 py-2 text-sm text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#EF4444]/60 focus:outline-none'
  const labelClass = 'block text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-1.5'

  const addItem = (list: string[], set: (v: string[]) => void) => set([...list, ''])
  const removeItem = (list: string[], set: (v: string[]) => void, i: number) =>
    set(list.filter((_, j) => j !== i))
  const updateItem = (list: string[], set: (v: string[]) => void, i: number, v: string) => {
    const next = [...list]; next[i] = v; set(next)
  }

  async function handleSubmit() {
    setError(null)
    if (!statement.trim()) { setError('Dispute statement is required.'); return }
    if (!remedy) { setError('Select a requested remedy.'); return }
    setSubmitting(true)
    try {
      await openDispute({
        agreement_id: id,
        statement,
        challenged_deliverables: challenged.filter(Boolean),
        missing_criteria: missing.filter(Boolean),
        evidence_links: [],
        requested_remedy: remedy,
        severity,
      })
      router.push(`/agreements/${id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080A0D] px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href={`/agreements/${id}`}
          className="mb-6 flex items-center gap-2 text-xs text-[#9AA6B2] hover:text-[#F4F7FA]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {id}
        </Link>

        <div className="border-l-2 border-[#EF4444] pl-4 mb-8">
          <h1 className="font-display text-2xl font-bold text-[#F4F7FA]">Open Dispute</h1>
          <p className="text-sm text-[#9AA6B2] mt-1">Agreement <span className="font-mono text-[#3B82F6]">{id}</span></p>
        </div>

        <div className="border border-[#EF4444]/20 bg-[#EF4444]/5 p-4 mb-6">
          <p className="text-xs text-[#EF4444] leading-relaxed">
            Opening a dispute pauses the review window. Be specific — vague disputes are more likely
            to receive an "insufficient evidence" verdict from the AI adjudicator.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className={labelClass}>Dispute Statement</label>
            <textarea className={`${fieldClass} min-h-36 resize-y`}
              placeholder="Clearly describe why the deliverables do not meet the agreement terms. Reference specific criteria."
              value={statement} onChange={(e) => setStatement(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Challenged Deliverables</label>
            <p className="text-[10px] text-[#9AA6B2] mb-2">Which specific deliverables are you contesting?</p>
            <div className="space-y-2">
              {challenged.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input className={`${fieldClass} flex-1`} placeholder="Deliverable name"
                    value={c} onChange={(e) => updateItem(challenged, setChallenged, i, e.target.value)} />
                  {challenged.length > 1 && (
                    <button onClick={() => removeItem(challenged, setChallenged, i)}>
                      <X className="h-4 w-4 text-[#9AA6B2] hover:text-[#EF4444]" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addItem(challenged, setChallenged)}
                className="flex items-center gap-1.5 text-xs text-[#EF4444] hover:text-red-400">
                <Plus className="h-3 w-3" /> Add deliverable
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Unmet Acceptance Criteria</label>
            <div className="space-y-2">
              {missing.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input className={`${fieldClass} flex-1`} placeholder="Criterion that was not met"
                    value={m} onChange={(e) => updateItem(missing, setMissing, i, e.target.value)} />
                  {missing.length > 1 && (
                    <button onClick={() => removeItem(missing, setMissing, i)}>
                      <X className="h-4 w-4 text-[#9AA6B2] hover:text-[#EF4444]" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addItem(missing, setMissing)}
                className="flex items-center gap-1.5 text-xs text-[#EF4444] hover:text-red-400">
                <Plus className="h-3 w-3" /> Add criterion
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Severity</label>
            <div className="flex gap-3">
              {['low', 'medium', 'high'].map((s) => (
                <label key={s} className={`flex-1 cursor-pointer border px-3 py-2 text-center text-xs transition-colors ${
                  severity === s
                    ? s === 'high' ? 'border-[#EF4444]/60 bg-[#EF4444]/10 text-[#EF4444]'
                      : s === 'medium' ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]'
                      : 'border-[#9AA6B2]/60 bg-[#9AA6B2]/10 text-[#9AA6B2]'
                    : 'border-[#1E2A35] text-[#9AA6B2]'
                }`}>
                  <input type="radio" name="severity" value={s} checked={severity === s}
                    onChange={() => setSeverity(s)} className="sr-only" />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Requested Remedy</label>
            <select className={fieldClass} value={remedy} onChange={(e) => setRemedy(e.target.value)}>
              <option value="">Select remedy…</option>
              <option value="full_refund">Full Refund</option>
              <option value="partial_refund">Partial Refund</option>
              <option value="revision">Revision</option>
              <option value="partial_release">Partial Release + Revision</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-6 border border-[#EF4444]/40 bg-[#EF4444]/5 px-4 py-2.5 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="mt-8">
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 border border-[#EF4444]/60 bg-[#EF4444]/10 py-3 text-sm font-semibold text-[#EF4444] hover:bg-[#EF4444]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Filing On-Chain…</> : 'File Dispute On-Chain'}
          </button>
        </div>
      </div>
    </div>
  )
}
