import { CheckCircle, XCircle, Circle, AlertCircle } from 'lucide-react'
import { Verdict, VerdictType } from '@/types'

interface CriteriaChecklistProps {
  criteria: string[]
  missingCriteria?: string[]
  verdict?: Verdict
}

function getCriteriaStatus(
  criterion: string,
  missing: string[],
  verdict?: Verdict
): 'met' | 'unmet' | 'partial' | 'unknown' {
  if (!verdict) return 'unknown'

  // Check if explicitly listed as missing
  const isMissing = missing.some(
    (m) =>
      m.toLowerCase().includes(criterion.toLowerCase().slice(0, 20)) ||
      criterion.toLowerCase().includes(m.toLowerCase().slice(0, 20))
  )

  if (isMissing) return 'unmet'

  switch (verdict.verdict) {
    case VerdictType.Fulfilled:
      return 'met'
    case VerdictType.MostlyFulfilled:
      return 'met'
    case VerdictType.NotFulfilled:
    case VerdictType.BadFaithWorker:
      return 'unmet'
    default:
      return 'partial'
  }
}

export default function CriteriaChecklist({
  criteria,
  missingCriteria = [],
  verdict,
}: CriteriaChecklistProps) {
  return (
    <div className="space-y-1.5">
      {criteria.map((criterion, i) => {
        const status = getCriteriaStatus(criterion, missingCriteria, verdict)
        return (
          <div
            key={i}
            className="flex items-start gap-2.5 p-2 border border-[#1E2A35] bg-[#080A0D]"
          >
            <div className="mt-0.5 flex-shrink-0">
              {status === 'met' && (
                <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
              )}
              {status === 'unmet' && (
                <XCircle className="h-3.5 w-3.5 text-[#EF4444]" />
              )}
              {status === 'partial' && (
                <AlertCircle className="h-3.5 w-3.5 text-[#F59E0B]" />
              )}
              {status === 'unknown' && (
                <Circle className="h-3.5 w-3.5 text-[#1E2A35]" />
              )}
            </div>
            <span
              className={`text-xs leading-relaxed ${
                status === 'met'
                  ? 'text-[#F4F7FA]'
                  : status === 'unmet'
                    ? 'text-[#EF4444]'
                    : status === 'partial'
                      ? 'text-[#F59E0B]'
                      : 'text-[#9AA6B2]'
              }`}
            >
              {criterion}
            </span>
          </div>
        )
      })}
    </div>
  )
}
