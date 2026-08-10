'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Clock, User, RefreshCw, Loader2 } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import MonoText from '@/components/ui/MonoText'
import EvidenceTimeline from '@/components/EvidenceTimeline'
import DisputePanel from '@/components/DisputePanel'
import EscrowVault from '@/components/EscrowVault'
import CriteriaChecklist from '@/components/CriteriaChecklist'
import SettlementRail from '@/components/SettlementRail'
import VerdictCard from '@/components/VerdictCard'
import { getCaseById } from '@/lib/mockData'
import { getAgreement } from '@/lib/genlayer'
import type { Agreement } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CaseDashboard() {
  const params = useParams()
  const id = params.id as string

  const [agreement, setAgreement] = useState<Agreement | null>(() => getCaseById(id) ?? null)
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)

  async function fetchLive() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await getAgreement(id) as any
      setAgreement({ ...data, review_window: data.review_window_days ?? data.review_window ?? 7 })
      setIsLive(true)
    } catch (e: unknown) {
      // Keep existing data but surface the error so it's visible
      console.warn('[VerdictLayer] fetchLive failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLive() }, [id])

  if (!agreement) return notFound()

  const isDemo = !isLive && !!getCaseById(id)

  return (
    <div className="min-h-screen bg-[#080A0D]">
      {/* Demo data banner */}
      {isDemo && (
        <div className="border-b border-[#F59E0B]/30 bg-[#F59E0B]/5 px-6 py-2 text-center text-[10px] text-[#F59E0B]">
          DEMO — This is an illustrative case seeded locally. It is not stored on-chain.{' '}
          <a href="/agreements/new" className="underline hover:text-[#FBBF24]">Create a real agreement</a>{' '}
          to use the live protocol.
        </div>
      )}
      {/* Status Strip */}
      <div className="border-b border-[#1E2A35] bg-[#11161C] px-6 py-3">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-4">
          <MonoText className="text-[#3B82F6] text-sm font-semibold">{agreement.id}</MonoText>
          <StatusBadge status={agreement.status} />
          {isLive && (
            <span className="border border-[#22C55E]/30 bg-[#22C55E]/5 px-1.5 py-0.5 font-mono text-[9px] text-[#22C55E]">
              LIVE
            </span>
          )}
          <div className="flex items-center gap-1 text-[#F59E0B]">
            <span className="font-mono text-xs font-semibold">
              {agreement.funding_amount?.toLocaleString()} {agreement.currency}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#9AA6B2]">
            <Clock className="h-3 w-3" />
            <span className="font-mono text-[10px]">{formatDate(agreement.deadline)}</span>
          </div>
          <div className="flex items-center gap-1 text-[#9AA6B2]">
            <User className="h-3 w-3" />
            <MonoText truncate className="text-[10px]">{agreement.worker_address}</MonoText>
          </div>
          <button
            onClick={fetchLive}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 border border-[#1E2A35] bg-[#080A0D] px-2.5 py-1 text-[10px] text-[#9AA6B2] hover:text-[#F4F7FA] disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="border-b border-[#1E2A35] px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-xl font-bold text-[#F4F7FA]">{agreement.title}</h1>
          <p className="text-xs text-[#9AA6B2] mt-1 capitalize">
            {agreement.work_category?.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid grid-cols-12 gap-5">
          {/* Left: Terms */}
          <div className="col-span-3 space-y-4">
            <div className="border border-[#1E2A35] bg-[#11161C] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Project Brief</div>
              <p className="text-xs text-[#9AA6B2] leading-relaxed">{agreement.brief}</p>
            </div>

            <div className="border border-[#1E2A35] bg-[#11161C] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Deliverables</div>
              <ul className="space-y-1.5">
                {agreement.deliverables?.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#F4F7FA]">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-[#3B82F6]" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-[#1E2A35] bg-[#11161C] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Acceptance Criteria</div>
              <CriteriaChecklist
                criteria={agreement.acceptance_criteria ?? []}
                missingCriteria={agreement.dispute?.missing_criteria ?? []}
                verdict={agreement.verdict}
              />
            </div>

            <div className="border border-[#1E2A35] bg-[#11161C] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Parties</div>
              <div className="space-y-2">
                <div>
                  <div className="text-[9px] text-[#9AA6B2] uppercase tracking-widest mb-0.5">Client</div>
                  <MonoText truncate className="text-xs">{agreement.client_address}</MonoText>
                </div>
                <div>
                  <div className="text-[9px] text-[#9AA6B2] uppercase tracking-widest mb-0.5">Worker</div>
                  <MonoText truncate className="text-xs">{agreement.worker_address}</MonoText>
                </div>
              </div>
            </div>
          </div>

          {/* Middle */}
          <div className="col-span-6 space-y-5">
            {agreement.verdict && <VerdictCard verdict={agreement.verdict} compact />}
            {agreement.dispute && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Dispute Record</div>
                <DisputePanel agreement={agreement} />
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Case Timeline</div>
              <EvidenceTimeline agreement={agreement} />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="col-span-3 space-y-4">
            <EscrowVault agreement={agreement} />
            <SettlementRail agreement={agreement} onRefresh={fetchLive} />

            {agreement.evidence && agreement.evidence.length > 0 && (
              <div className="border border-[#1E2A35] bg-[#11161C] p-4">
                <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Evidence Packages</div>
                <div className="space-y-2">
                  {agreement.evidence.map((ev) => (
                    <a key={ev.evidence_id} href={ev.url} target="_blank" rel="noopener noreferrer"
                      className="block border border-[#1E2A35] p-2.5 hover:border-[#3B82F6]/40 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <MonoText className="text-[9px] text-[#3B82F6]">{ev.evidence_id}</MonoText>
                        <span className="text-[9px] uppercase tracking-wider text-[#9AA6B2]">{ev.evidence_type}</span>
                      </div>
                      <div className="text-xs text-[#F4F7FA] leading-tight">{ev.title}</div>
                      <div className="text-[10px] text-[#9AA6B2] mt-1 line-clamp-2">{ev.description}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
