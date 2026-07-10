'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { appealVerdict } from '@/lib/genlayer'

export default function AppealPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [grounds, setGrounds] = useState('')
  const [bondAmount, setBondAmount] = useState('50')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldClass =
    'w-full border border-[#1E2A35] bg-[#080A0D] px-3 py-2 text-sm text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#EF4444]/60 focus:outline-none'
  const labelClass = 'block text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-1.5'

  async function handleSubmit() {
    setError(null)
    if (!grounds.trim()) { setError('Grounds for appeal are required.'); return }
    const bond = parseFloat(bondAmount)
    if (!bond || bond <= 0) { setError('Bond amount must be greater than 0.'); return }
    setSubmitting(true)
    try {
      await appealVerdict(id, grounds, bond)
      router.push(`/agreements/${id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080A0D] px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/agreements/${id}/verdict`}
          className="mb-6 flex items-center gap-2 text-xs text-[#9AA6B2] hover:text-[#F4F7FA]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to verdict
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
          <h1 className="font-display text-2xl font-bold text-[#F4F7FA]">File Appeal</h1>
        </div>
        <p className="text-sm text-[#9AA6B2] mb-2">
          Agreement <span className="font-mono text-[#3B82F6]">{id}</span>
        </p>

        <div className="mb-8 border border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-3">
          <p className="text-xs text-[#EF4444] leading-relaxed">
            Appeals trigger a secondary validator round. The bond is forfeited if the appeal is rejected.
            Only file if you have substantive grounds — procedural errors, new material evidence, or
            clear bias in the original verdict.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className={labelClass}>Grounds for Appeal</label>
            <textarea
              className={`${fieldClass} min-h-40 resize-y`}
              placeholder="State your grounds clearly. Examples: new evidence not available during the original review, a factual error in the verdict's reasoning, or a criterion that was misinterpreted."
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Bond Amount (GEN)</label>
            <p className="text-[10px] text-[#9AA6B2] mb-1.5">
              Forfeited if the appeal is rejected. Returned if accepted.
            </p>
            <input
              type="number"
              min="1"
              step="1"
              className={fieldClass}
              value={bondAmount}
              onChange={(e) => setBondAmount(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mt-6 border border-[#EF4444]/40 bg-[#EF4444]/5 px-4 py-2.5 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Link
            href={`/agreements/${id}/verdict`}
            className="flex-1 border border-[#1E2A35] py-3 text-center text-sm text-[#9AA6B2] hover:text-[#F4F7FA] transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 border border-[#EF4444]/60 bg-[#EF4444]/10 py-3 text-sm font-semibold text-[#EF4444] hover:bg-[#EF4444]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Filing Appeal…</>
              : 'File Appeal On-Chain'}
          </button>
        </div>
      </div>
    </div>
  )
}
