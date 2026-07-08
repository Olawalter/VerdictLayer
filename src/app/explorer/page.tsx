'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Loader2, RefreshCw } from 'lucide-react'
import { ALL_CASES } from '@/lib/mockData'
import { AgreementStatus, WorkCategory } from '@/types'
import CaseFileCard from '@/components/CaseFileCard'
import { listAgreements, getAgreement } from '@/lib/genlayer'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...Object.values(AgreementStatus).map((s) => ({
    value: s,
    label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  ...Object.values(WorkCategory).map((c) => ({
    value: c,
    label: c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  })),
]

export default function ExplorerPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveAgreements, setLiveAgreements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)

  async function fetchLive() {
    setLoading(true)
    setLiveError(null)
    try {
      const summaries = await listAgreements() as { id: string }[]
      const full = await Promise.all(summaries.map((s) => getAgreement(s.id)))
      setLiveAgreements(full)
    } catch (e: unknown) {
      setLiveError(e instanceof Error ? e.message : 'Could not reach contract')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLive() }, [])

  // Merge live + mock; live takes priority by ID
  const liveIds = new Set(liveAgreements.map((a) => a.id))
  const merged = [
    ...liveAgreements,
    ...ALL_CASES.filter((a) => !liveIds.has(a.id)),
  ]

  const filtered = merged.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false
    if (categoryFilter && a.work_category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.title?.toLowerCase().includes(q) ||
        a.brief?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-[#080A0D] px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F4F7FA] mb-1">
              Case Explorer
            </h1>
            <p className="text-sm text-[#9AA6B2]">
              {liveAgreements.length > 0
                ? `${liveAgreements.length} live on-chain + ${ALL_CASES.filter((a) => !liveIds.has(a.id)).length} mock`
                : `${merged.length} agreements`}
            </p>
          </div>
          <button
            onClick={fetchLive}
            disabled={loading}
            className="flex items-center gap-1.5 border border-[#1E2A35] bg-[#11161C] px-3 py-1.5 text-[10px] text-[#9AA6B2] hover:border-[#3B82F6]/50 hover:text-[#F4F7FA] disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
        </div>

        {/* Live error banner */}
        {liveError && (
          <div className="mb-4 border border-[#F59E0B]/40 bg-[#F59E0B]/5 px-4 py-2 text-xs text-[#F59E0B]">
            Contract read failed: {liveError} — showing mock data only.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9AA6B2]" />
            <input
              type="text"
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-[#1E2A35] bg-[#11161C] pl-9 pr-3 py-2 text-xs text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#3B82F6]/60 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#1E2A35] bg-[#11161C] px-3 py-2 text-xs text-[#9AA6B2] focus:border-[#3B82F6]/60 focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-[#1E2A35] bg-[#11161C] px-3 py-2 text-xs text-[#9AA6B2] focus:border-[#3B82F6]/60 focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-3 w-3 text-[#9AA6B2]" />
          <span className="font-mono text-[10px] text-[#9AA6B2]">
            {loading ? 'loading…' : `${filtered.length} case${filtered.length !== 1 ? 's' : ''} found`}
          </span>
          {liveAgreements.length > 0 && (
            <span className="ml-2 border border-[#22C55E]/30 bg-[#22C55E]/5 px-1.5 py-0.5 font-mono text-[9px] text-[#22C55E]">
              LIVE
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && liveAgreements.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse border border-[#1E2A35] bg-[#11161C]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-[#1E2A35] bg-[#11161C] p-12 text-center">
            <p className="text-sm text-[#9AA6B2]">No cases match your filters</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CaseFileCard key={c.id} agreement={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
