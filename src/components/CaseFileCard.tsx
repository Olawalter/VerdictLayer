import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { Agreement } from '@/types'
import StatusBadge from './ui/StatusBadge'
import MonoText from './ui/MonoText'

interface CaseFileCardProps {
  agreement: Agreement
  isDemo?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  design: 'Design',
  development: 'Development',
  writing: 'Writing',
  research: 'Research',
  data_analysis: 'Data Analysis',
  video_production: 'Video',
  marketing: 'Marketing',
  legal: 'Legal',
  ai_agent: 'AI Agent',
  dao_bounty: 'DAO Bounty',
  other: 'Other',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CaseFileCard({ agreement, isDemo = false }: CaseFileCardProps) {
  return (
    <Link
      href={`/agreements/${agreement.id}`}
      className="group block border border-[#1E2A35] bg-[#11161C] p-5 hover:border-[#3B82F6]/40 transition-all duration-150"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <MonoText className="text-xs text-[#3B82F6]">{agreement.id}</MonoText>
          <span className="text-[#1E2A35]">·</span>
          <span className="text-xs text-[#9AA6B2] uppercase tracking-wider">
            {CATEGORY_LABELS[agreement.work_category] ?? agreement.work_category}
          </span>
          {isDemo && (
            <span className="border border-[#F59E0B]/40 bg-[#F59E0B]/5 px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[#F59E0B]">
              demo
            </span>
          )}
        </div>
        <StatusBadge status={agreement.status} size="sm" />
      </div>

      {/* Title */}
      <h3 className="font-display text-sm font-semibold text-[#F4F7FA] mb-2 group-hover:text-white transition-colors leading-snug">
        {agreement.title}
      </h3>

      {/* Brief excerpt */}
      <p className="text-xs text-[#9AA6B2] leading-relaxed mb-4 line-clamp-2">
        {agreement.brief}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2] mb-0.5">
              Escrow
            </div>
            <div className="font-mono text-xs font-medium text-[#F59E0B]">
              {agreement.funding_amount.toLocaleString()} {agreement.currency}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2] mb-0.5">
              Deadline
            </div>
            <div className="flex items-center gap-1 font-mono text-xs text-[#9AA6B2]">
              <Clock className="h-2.5 w-2.5" />
              {formatDate(agreement.deadline)}
            </div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-[#1E2A35] group-hover:text-[#3B82F6] transition-colors" />
      </div>
    </Link>
  )
}
