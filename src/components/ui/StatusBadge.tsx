import clsx from 'clsx'
import { AgreementStatus } from '@/types'

const STATUS_CONFIG: Record<
  AgreementStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  [AgreementStatus.Draft]: {
    label: 'Draft',
    color: '#9AA6B2',
    bg: 'bg-[#9AA6B2]/10',
    border: 'border-[#9AA6B2]/30',
  },
  [AgreementStatus.Funded]: {
    label: 'Funded',
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/30',
  },
  [AgreementStatus.Accepted]: {
    label: 'Accepted',
    color: '#3B82F6',
    bg: 'bg-[#3B82F6]/10',
    border: 'border-[#3B82F6]/30',
  },
  [AgreementStatus.Submitted]: {
    label: 'Submitted',
    color: '#8B5CF6',
    bg: 'bg-[#8B5CF6]/10',
    border: 'border-[#8B5CF6]/30',
  },
  [AgreementStatus.Disputed]: {
    label: 'Disputed',
    color: '#EF4444',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/30',
  },
  [AgreementStatus.ResponseSubmitted]: {
    label: 'Response Filed',
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/30',
  },
  [AgreementStatus.Resolved]: {
    label: 'Resolved',
    color: '#22C55E',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/30',
  },
  [AgreementStatus.Finalized]: {
    label: 'Finalized',
    color: '#22C55E',
    bg: 'bg-[#22C55E]/15',
    border: 'border-[#22C55E]/40',
  },
  [AgreementStatus.Appealed]: {
    label: 'Appealed',
    color: '#EF4444',
    bg: 'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/30',
  },
}

interface StatusBadgeProps {
  status: AgreementStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StatusBadge({
  status,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: '#9AA6B2',
    bg: 'bg-[#9AA6B2]/10',
    border: 'border-[#9AA6B2]/30',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 border font-mono font-medium uppercase tracking-widest',
        config.bg,
        config.border,
        {
          'px-1.5 py-0.5 text-[9px]': size === 'sm',
          'px-2 py-0.5 text-[10px]': size === 'md',
          'px-3 py-1 text-xs': size === 'lg',
        },
        className
      )}
      style={{ color: config.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  )
}
