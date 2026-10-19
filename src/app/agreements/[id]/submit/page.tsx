'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, X, ArrowLeft, Upload, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { EvidenceType } from '@/types'
import { submitDeliverables } from '@/lib/genlayer'

interface EvidencePkg {
  evidence_type: EvidenceType
  title: string
  description: string
  url: string
  content_hash: string
  inline_content: string
  claimed_relevance: string
}

const EMPTY_PKG: EvidencePkg = {
  evidence_type: EvidenceType.Link,
  title: '',
  description: '',
  url: '',
  content_hash: '',
  inline_content: '',
  claimed_relevance: '',
}

const SHA256_HEX = /^[0-9a-f]{64}$/

export default function SubmitDeliverablesPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [packages, setPackages] = useState<EvidencePkg[]>([{ ...EMPTY_PKG }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldClass =
    'w-full border border-[#1E2A35] bg-[#080A0D] px-3 py-2 text-sm text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#3B82F6]/60 focus:outline-none'
  const labelClass = 'block text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-1.5'

  const updatePkg = (i: number, patch: Partial<EvidencePkg>) =>
    setPackages((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const filtered = packages.filter((p) => p.title.trim() || p.url.trim() || p.inline_content.trim())
      if (filtered.length === 0) throw new Error('Add at least one evidence package.')
      for (const [i, p] of filtered.entries()) {
        // The contract refuses evidence it cannot later authenticate.
        if (!p.inline_content.trim()) {
          if (!/^https?:\/\//.test(p.url.trim())) throw new Error(`Package ${i + 1}: provide an http(s) URL or inline content.`)
          if (!SHA256_HEX.test(p.content_hash.trim().toLowerCase()))
            throw new Error(`Package ${i + 1}: a URL needs the 64-character sha256 hex digest of the exact bytes served at it.`)
        }
      }
      await submitDeliverables(
        id,
        filtered.map((p) => ({
          ...p,
          url: p.url.trim(),
          content_hash: p.content_hash.trim().toLowerCase(),
        }))
      )
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

        <h1 className="font-display text-2xl font-bold text-[#F4F7FA] mb-1">Submit Deliverables</h1>
        <p className="text-sm text-[#9AA6B2] mb-6">Provide evidence packages for agreement <span className="font-mono text-[#3B82F6]">{id}</span></p>

        <div className="space-y-4 mb-6">
          {packages.map((pkg, i) => (
            <div key={i} className="border border-[#1E2A35] bg-[#11161C] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-[#3B82F6]">Package {String(i + 1).padStart(2, '0')}</span>
                {packages.length > 1 && (
                  <button onClick={() => setPackages((p) => p.filter((_, j) => j !== i))}
                    className="text-[#9AA6B2] hover:text-[#EF4444] transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Evidence Type</label>
                    <select className={fieldClass} value={pkg.evidence_type}
                      onChange={(e) => updatePkg(i, { evidence_type: e.target.value as EvidenceType })}>
                      {Object.values(EvidenceType).map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Title</label>
                    <input className={fieldClass} placeholder="e.g. GitHub Repository"
                      value={pkg.title} onChange={(e) => updatePkg(i, { title: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>URL / Link</label>
                  <input className={fieldClass} placeholder="https://"
                    value={pkg.url} onChange={(e) => updatePkg(i, { url: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea className={`${fieldClass} min-h-20 resize-none`}
                    placeholder="Describe what this evidence demonstrates"
                    value={pkg.description} onChange={(e) => updatePkg(i, { description: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Claimed Relevance</label>
                  <input className={fieldClass} placeholder="Which deliverable or criterion does this satisfy?"
                    value={pkg.claimed_relevance} onChange={(e) => updatePkg(i, { claimed_relevance: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>SHA-256 of the content at the URL (required for URLs)</label>
                  <input className={fieldClass} placeholder="64 hex characters, e.g. from `sha256sum file`"
                    value={pkg.content_hash} onChange={(e) => updatePkg(i, { content_hash: e.target.value })} />
                  <p className="mt-1 text-[10px] text-[#9AA6B2]">
                    Validators re-fetch the URL and re-hash it. If the bytes differ from this digest the item is excluded from
                    adjudication, so pin the exact version you are submitting.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Or inline content (hashed on-chain)</label>
                  <textarea className={`${fieldClass} min-h-20 resize-none`}
                    placeholder="Paste text evidence directly instead of a URL (max ~64 KB)"
                    value={pkg.inline_content} onChange={(e) => updatePkg(i, { inline_content: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setPackages((p) => [...p, { ...EMPTY_PKG }])}
          className="flex items-center gap-2 text-xs text-[#3B82F6] hover:text-[#60A5FA] mb-8 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Add another evidence package
        </button>

        {error && (
          <div className="mb-4 border border-[#EF4444]/40 bg-[#EF4444]/5 px-4 py-2.5 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="flex w-full items-center justify-center gap-2 bg-[#3B82F6] py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting On-Chain…</> : <><Upload className="h-4 w-4" /> Submit Deliverables On-Chain</>}
        </button>
        <p className="mt-2 text-center text-[10px] text-[#9AA6B2]">
          This action is irreversible. Review all packages before submitting.
        </p>
      </div>
    </div>
  )
}
