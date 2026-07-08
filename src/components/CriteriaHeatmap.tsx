import { Verdict, VerdictType } from '@/types'
import clsx from 'clsx'

interface CriteriaHeatmapProps {
  criteria: string[]
  verdict: Verdict
  missingCriteria?: string[]
}

type CriteriaStatus = 'met' | 'partial' | 'unmet' | 'unknown'

function getStatus(
  criterion: string,
  missing: string[],
  verdict: Verdict
): CriteriaStatus {
  const lc = criterion.toLowerCase()
  const isMissing = missing.some((m) => {
    const mlc = m.toLowerCase()
    return lc.includes(mlc.slice(0, 15)) || mlc.includes(lc.slice(0, 15))
  })

  if (isMissing) return 'unmet'

  switch (verdict.verdict) {
    case VerdictType.Fulfilled:
      return 'met'
    case VerdictType.MostlyFulfilled:
      return 'met'
    case VerdictType.NotFulfilled:
    case VerdictType.BadFaithWorker:
      return 'unmet'
    case VerdictType.PartiallyFulfilled:
    case VerdictType.MinorRevisionRequired:
    case VerdictType.MajorRevisionRequired:
      return 'partial'
    default:
      return 'unknown'
  }
}

const STATUS_STYLES: Record<CriteriaStatus, { bg: string; text: string; border: string; label: string }> = {
  met: {
    bg: 'bg-[#22C55E]/15',
    text: 'text-[#22C55E]',
    border: 'border-[#22C55E]/30',
    label: 'Met',
  },
  partial: {
    bg: 'bg-[#F59E0B]/15',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/30',
    label: 'Partial',
  },
  unmet: {
    bg: 'bg-[#EF4444]/15',
    text: 'text-[#EF4444]',
    border: 'border-[#EF4444]/30',
    label: 'Unmet',
  },
  unknown: {
    bg: 'bg-[#1A222B]',
    text: 'text-[#9AA6B2]',
    border: 'border-[#1E2A35]',
    label: '—',
  },
}

export default function CriteriaHeatmap({
  criteria,
  verdict,
  missingCriteria = [],
}: CriteriaHeatmapProps) {
  return (
    <div className="border border-[#1E2A35] bg-[#11161C] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">
        Criteria Assessment
      </div>
      <div className="space-y-1.5">
        {criteria.map((criterion, i) => {
          const status = getStatus(criterion, missingCriteria, verdict)
          const style = STATUS_STYLES[status]
          return (
            <div
              key={i}
              className={clsx(
                'flex items-center justify-between gap-3 border p-2',
                style.bg,
                style.border
              )}
            >
              <span className="text-xs text-[#F4F7FA] leading-snug flex-1 min-w-0">
                {criterion}
              </span>
              <span
                className={clsx(
                  'flex-shrink-0 font-mono text-[9px] uppercase tracking-widest',
                  style.text
                )}
              >
                {style.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
