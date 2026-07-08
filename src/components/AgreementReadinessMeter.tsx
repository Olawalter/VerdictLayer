import clsx from 'clsx'

interface AgreementReadinessMeterProps {
  score: number // 0–100
  fields: { label: string; filled: boolean }[]
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Dispute-Ready'
  if (score >= 70) return 'Good'
  if (score >= 40) return 'Needs Work'
  return 'Incomplete'
}

export default function AgreementReadinessMeter({
  score,
  fields,
}: AgreementReadinessMeterProps) {
  const color = getScoreColor(score)
  const label = getScoreLabel(score)

  return (
    <div className="sticky top-20 border border-[#1E2A35] bg-[#11161C] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">
        Dispute Readiness
      </div>

      {/* Score circle */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="relative flex h-14 w-14 items-center justify-center border-2"
          style={{ borderColor: color }}
        >
          <span
            className="font-display text-lg font-bold"
            style={{ color }}
          >
            {score}
          </span>
        </div>
        <div>
          <div className="font-mono text-xs font-medium" style={{ color }}>
            {label}
          </div>
          <div className="text-[10px] text-[#9AA6B2] mt-0.5">
            {fields.filter((f) => f.filled).length}/{fields.length} fields
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-[#1A222B] mb-4">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>

      {/* Field checklist */}
      <div className="space-y-1">
        {fields.map((field, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={clsx(
                'h-1.5 w-1.5 flex-shrink-0',
                field.filled ? 'bg-[#22C55E]' : 'bg-[#1E2A35] border border-[#1E2A35]'
              )}
            />
            <span
              className={clsx(
                'text-[10px]',
                field.filled ? 'text-[#F4F7FA]' : 'text-[#9AA6B2]'
              )}
            >
              {field.label}
            </span>
          </div>
        ))}
      </div>

      {score < 80 && (
        <div className="mt-4 border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-2.5">
          <p className="text-[10px] text-[#F59E0B] leading-relaxed">
            Complete all fields for maximum clarity in case of dispute.
          </p>
        </div>
      )}
    </div>
  )
}
