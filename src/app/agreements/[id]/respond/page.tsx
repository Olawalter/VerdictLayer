'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { EvidenceType } from '@/types'
import { submitResponse } from '@/lib/genlayer'

interface CounterEvidence {
  title: string
  url: string
  claimed_relevance: string
  evidence_type: EvidenceType
  description: string
  content_hash: string
  inline_content: string
}

export default function WorkerResponsePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [explanation, setExplanation] = useState('')
  const [revisionOffer, setRevisionOffer] = useState('')
  const [counterEvidence, setCounterEvidence] = useState<CounterEvidence[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldClass =
    'w-full border border-[#1E2A35] bg-[#080A0D] px-3 py-2 text-sm text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#3B82F6]/60 focus:outline-none'
  const labelClass = 'block text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-1.5'

  const updateCE = (i: number, patch: Partial<CounterEvidence>) =>
    setCounterEvidence((e) => e.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  async function handleSubmit() {
    setError(null)
    if (!explanation.trim()) { setError('Explanation is required.'); return }
    const kept = counterEvidence.filter((c) => c.title.trim() || c.url.trim() || c.inline_content.trim())
    for (const [i, c] of kept.entries()) {
      if (c.inline_content.trim()) continue
      if (!/^https?:\/\//.test(c.url.trim()) || !/^[0-9a-f]{64}$/.test(c.content_hash.trim().toLowerCase())) {
        setError(`Counter-evidence ${i + 1}: provide inline content, or an http(s) URL with the 64-hex sha256 of its content.`)
        return
      }
    }
    setSubmitting(true)
    try {
      await submitResponse({
        agreement_id: id,
        explanation,
        counter_evidence: kept.map((c) => ({ ...c, url: c.url.trim(), content_hash: c.content_hash.trim().toLowerCase() })),
        revision_offer: revisionOffer,
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

        <h1 className="font-display text-2xl font-bold text-[#F4F7FA] mb-1">File Dispute Response</h1>
        <p className="text-sm text-[#9AA6B2] mb-6">Agreement <span className="font-mono text-[#3B82F6]">{id}</span></p>

        <div className="space-y-6">
          <div>
            <label className={labelClass}>Explanation</label>
            <textarea className={`${fieldClass} min-h-36 resize-y`}
              placeholder="Explain why the deliverables meet the agreement terms. Address each disputed point specifically."
              value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Counter-Evidence</label>
            <p className="text-[10px] text-[#9AA6B2] mb-3">Add links or references that support your position.</p>
            <div className="space-y-3">
              {counterEvidence.map((ce, i) => (
                <div key={i} className="border border-[#1E2A35] p-4">
                  <div className="flex justify-between mb-3">
                    <span className="font-mono text-xs text-[#3B82F6]">Evidence {i + 1}</span>
                    <button onClick={() => setCounterEvidence((e) => e.filter((_, j) => j !== i))}>
                      <X className="h-3.5 w-3.5 text-[#9AA6B2] hover:text-[#EF4444]" />
                    </button>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Type</label>
                        <select className={fieldClass} value={ce.evidence_type}
                          onChange={(e) => updateCE(i, { evidence_type: e.target.value as EvidenceType })}>
                          {Object.values(EvidenceType).map((t) => (
                            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Title</label>
                        <input className={fieldClass} value={ce.title}
                          onChange={(e) => updateCE(i, { title: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>URL</label>
                      <input className={fieldClass} placeholder="https://" value={ce.url}
                        onChange={(e) => updateCE(i, { url: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>SHA-256 of content at URL</label>
                      <input className={fieldClass} placeholder="64 hex characters" value={ce.content_hash}
                        onChange={(e) => updateCE(i, { content_hash: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Or inline content (hashed on-chain)</label>
                      <textarea className={`${fieldClass} min-h-16 resize-none`} value={ce.inline_content}
                        onChange={(e) => updateCE(i, { inline_content: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Description</label>
                      <input className={fieldClass} value={ce.description}
                        onChange={(e) => updateCE(i, { description: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>What does this prove?</label>
                      <input className={fieldClass} value={ce.claimed_relevance}
                        onChange={(e) => updateCE(i, { claimed_relevance: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCounterEvidence((e) => [...e, { title: '', url: '', claimed_relevance: '', description: '', content_hash: '', inline_content: '', evidence_type: EvidenceType.Link }])}
              className="mt-3 flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-[#60A5FA]">
              <Plus className="h-3 w-3" /> Add counter-evidence
            </button>
          </div>

          <div>
            <label className={labelClass}>Revision Offer (optional)</label>
            <textarea className={`${fieldClass} min-h-20 resize-none`}
              placeholder="If you're willing to make revisions, describe what you'd offer and on what timeline."
              value={revisionOffer} onChange={(e) => setRevisionOffer(e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="mt-6 border border-[#EF4444]/40 bg-[#EF4444]/5 px-4 py-2.5 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="mt-8">
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting On-Chain…</> : 'Submit Response On-Chain'}
          </button>
        </div>
      </div>
    </div>
  )
}
