'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import VerdictCard from '@/components/VerdictCard'
import SettlementSplitter from '@/components/SettlementSplitter'
import CriteriaHeatmap from '@/components/CriteriaHeatmap'
import CanonicalJsonPanel from '@/components/CanonicalJsonPanel'
import MonoText from '@/components/ui/MonoText'
import StatusBadge from '@/components/ui/StatusBadge'
import { getCaseById } from '@/lib/mockData'
import { getAgreement, getVerdict } from '@/lib/genlayer'
import type { Agreement, Verdict } from '@/types'

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

export default function VerdictPage() {
  const params = useParams()
  const id = params.id as string

  const mockCase = getCaseById(id)
  const [agreement, setAgreement] = useState<Agreement | null>(mockCase ?? null)
  const [verdict, setVerdict] = useState<Verdict | null>(mockCase?.verdict ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = await getAgreement(id) as any
        setAgreement({ ...a, review_window: a.review_window_days ?? a.review_window ?? 7 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = await getVerdict(id) as any
        setVerdict(v)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not load verdict from contract')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080A0D]">
        <div className="flex items-center gap-3 text-[#9AA6B2]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading verdict from contract…</span>
        </div>
      </div>
    )
  }

  if (error || !verdict) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080A0D]">
        <div className="max-w-md text-center border border-[#EF4444]/30 bg-[#EF4444]/5 p-8">
          <p className="text-sm font-medium text-[#EF4444] mb-2">Verdict not available</p>
          <p className="text-xs text-[#9AA6B2] mb-6">{error ?? 'No verdict has been recorded for this agreement yet.'}</p>
          <Link href={`/agreements/${id}`} className="text-xs text-[#3B82F6] hover:underline">
            ← Back to agreement
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080A0D] px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href={`/agreements/${id}`}
          className="mb-6 flex items-center gap-2 text-xs text-[#9AA6B2] hover:text-[#F4F7FA]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {id}
        </Link>

        <div className="border border-[#1E2A35] bg-[#11161C] px-5 py-3 mb-6 flex flex-wrap items-center gap-4">
          <MonoText className="text-[#3B82F6]">{id}</MonoText>
          {agreement && <StatusBadge status={agreement.status} />}
          {verdict.rendered_at && (
            <div className="ml-auto font-mono text-[10px] text-[#9AA6B2]">
              Verdict rendered {formatTs(verdict.rendered_at)}
            </div>
          )}
        </div>

        {agreement && (
          <>
            <h1 className="font-display text-xl font-bold text-[#F4F7FA] mb-1">{agreement.title}</h1>
            <p className="text-xs text-[#9AA6B2] mb-8 capitalize">
              {agreement.work_category?.replace(/_/g, ' ')}
            </p>
          </>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <VerdictCard verdict={verdict} />
            {agreement && <SettlementSplitter agreement={agreement} verdict={verdict} />}
            {agreement && (
              <CriteriaHeatmap
                criteria={agreement.acceptance_criteria ?? []}
                verdict={verdict}
                missingCriteria={agreement.dispute?.missing_criteria ?? []}
              />
            )}
          </div>

          <div className="space-y-5">
            {agreement?.dispute && (
              <div className="border border-[#1E2A35] bg-[#11161C] p-4">
                <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Dispute Summary</div>
                <p className="text-xs text-[#9AA6B2] leading-relaxed mb-3">
                  {agreement.dispute.statement.slice(0, 200)}…
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#9AA6B2]">Severity</span>
                    <span className="font-mono uppercase" style={{
                      color: agreement.dispute.severity === 'high' ? '#EF4444'
                        : agreement.dispute.severity === 'medium' ? '#F59E0B' : '#9AA6B2',
                    }}>{agreement.dispute.severity}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#9AA6B2]">Remedy Requested</span>
                    <span className="font-mono text-[#F4F7FA]">
                      {agreement.dispute.requested_remedy.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-[#1E2A35] bg-[#11161C] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Appeal</div>
              <p className="text-xs text-[#9AA6B2] mb-3">
                Either party may appeal this verdict. Appeals trigger a secondary validator round.
              </p>
              <Link href={`/agreements/${id}/appeal`}
                className="block w-full border border-[#EF4444]/40 bg-[#EF4444]/5 py-2 text-center text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                File Appeal
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <CanonicalJsonPanel data={verdict} title="Verdict JSON" defaultOpen={false} />
          {agreement && (
            <CanonicalJsonPanel
              data={{ agreement_id: id, title: agreement.title, deliverables: agreement.deliverables, acceptance_criteria: agreement.acceptance_criteria, dispute: agreement.dispute }}
              title="Dispute Packet (input to adjudicator)"
              defaultOpen={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}
