import { Scale, TrendingUp, AlertCircle } from 'lucide-react'
import { Verdict, VerdictType } from '@/types'
import clsx from 'clsx'

const VERDICT_CONFIG: Record<
  VerdictType,
  { label: string; color: string; bg: string; border: string; description: string }
> = {
  [VerdictType.Fulfilled]: {
    label: 'Fulfilled',
    color: '#22C55E',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/40',
    description: 'All deliverables met acceptance criteria',
  },
  [VerdictType.MostlyFulfilled]: {
    label: 'Mostly Fulfilled',
    color: '#22C55E',
    bg: 'bg-[#22C55E]/8',
    border: 'border-[#22C55E]/30',
    description: 'Substantial compliance with minor gaps',
  },
  [VerdictType.PartiallyFulfilled]: {
    label: 'Partially Fulfilled',
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/40',
    description: 'Some deliverables met, others missing or deficient',
  },
  [VerdictType.MinorRevisionRequired]: {
    label: 'Minor Revision Required',
    color: '#8B5CF6',
    bg: 'bg-[#8B5CF6]/10',
    border: 'border-[#8B5CF6]/30',
    description: 'Work is substantially complete with minor corrections needed',
  },
  [VerdictType.MajorRevisionRequired]: {
    label: 'Major Revision Required',
    color: '#8B5CF6',
    bg: 'bg-[#8B5CF6]/10',
    border: 'border-[#8B5CF6]/40',
    description: 'Significant rework needed before acceptance',
  },
  [VerdictType.NotFulfilled]: {
    label: 'Not Fulfilled',
    color: '#EF4444',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/40',
    description: 'Deliverables do not meet contractual obligations',
  },
  [VerdictType.BadFaithClient]: {
    label: 'Bad Faith — Client',
    color: '#EF4444',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/40',
    description: 'Client filed dispute in bad faith after receiving work',
  },
  [VerdictType.BadFaithWorker]: {
    label: 'Bad Faith — Worker',
    color: '#EF4444',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/40',
    description: 'Worker submitted fraudulent or non-compliant deliverables',
  },
  [VerdictType.InsufficientEvidence]: {
    label: 'Insufficient Evidence',
    color: '#9AA6B2',
    bg: 'bg-[#9AA6B2]/10',
    border: 'border-[#9AA6B2]/30',
    description: 'Evidence insufficient to render a confident verdict',
  },
  [VerdictType.OutOfScopeDispute]: {
    label: 'Out of Scope',
    color: '#9AA6B2',
    bg: 'bg-[#9AA6B2]/10',
    border: 'border-[#9AA6B2]/30',
    description: 'Dispute claims fall outside the agreed scope',
  },
  [VerdictType.ManualReviewRequired]: {
    label: 'Manual Review Required',
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/30',
    description: 'Case complexity requires human arbitration',
  },
}

interface VerdictCardProps {
  verdict: Verdict
  compact?: boolean
}

export default function VerdictCard({ verdict, compact = false }: VerdictCardProps) {
  const config = VERDICT_CONFIG[verdict.verdict] ?? {
    label: verdict.verdict,
    color: '#9AA6B2',
    bg: 'bg-[#9AA6B2]/10',
    border: 'border-[#9AA6B2]/30',
    description: '',
  }

  return (
    <div
      className={clsx(
        'border',
        config.bg,
        config.border,
        compact ? 'p-4' : 'p-6'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex h-9 w-9 items-center justify-center border"
          style={{ borderColor: config.color + '40', backgroundColor: config.color + '15' }}
        >
          <Scale className="h-4 w-4" style={{ color: config.color }} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2]">
            AI Verdict
          </div>
          <div
            className={clsx('font-display font-bold uppercase tracking-wide', compact ? 'text-base' : 'text-xl')}
            style={{ color: config.color }}
          >
            {config.label}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[#9AA6B2] mb-4">{config.description}</p>

      {/* Reason */}
      <div className="border-l-2 pl-3 mb-4" style={{ borderColor: config.color }}>
        <p className="text-sm text-[#F4F7FA] leading-relaxed">{verdict.short_reason}</p>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[#1E2A35] bg-[#080A0D] p-2.5">
          <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2] mb-1">
            Confidence
          </div>
          <div
            className="font-mono text-xs font-medium capitalize"
            style={{
              color:
                verdict.confidence_band === 'high'
                  ? '#22C55E'
                  : verdict.confidence_band === 'medium'
                    ? '#F59E0B'
                    : '#EF4444',
            }}
          >
            {verdict.confidence_band}
          </div>
        </div>
        <div className="border border-[#1E2A35] bg-[#080A0D] p-2.5">
          <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2] mb-1">
            Evidence
          </div>
          <div
            className="font-mono text-xs font-medium capitalize"
            style={{
              color:
                verdict.evidence_strength === 'strong'
                  ? '#22C55E'
                  : verdict.evidence_strength === 'moderate'
                    ? '#F59E0B'
                    : '#EF4444',
            }}
          >
            {verdict.evidence_strength}
          </div>
        </div>
        <div className="border border-[#1E2A35] bg-[#080A0D] p-2.5">
          <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2] mb-1">
            Revision
          </div>
          <div
            className="font-mono text-xs font-medium"
            style={{ color: verdict.revision_recommended ? '#8B5CF6' : '#22C55E' }}
          >
            {verdict.revision_recommended ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
    </div>
  )
}
