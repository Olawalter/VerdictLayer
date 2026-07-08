import { AlertTriangle, MessageSquare } from 'lucide-react'
import { Agreement } from '@/types'
import MonoText from './ui/MonoText'

interface DisputePanelProps {
  agreement: Agreement
}

export default function DisputePanel({ agreement }: DisputePanelProps) {
  const { dispute, worker_response } = agreement

  if (!dispute) return null

  return (
    <div className="space-y-4">
      {/* Client Claims */}
      <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444]" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#EF4444]">
            Dispute Statement
          </span>
          <span className="ml-auto text-[10px] font-mono text-[#9AA6B2] uppercase tracking-wider">
            {dispute.severity} severity
          </span>
        </div>
        <p className="text-sm text-[#F4F7FA] leading-relaxed mb-4">
          {dispute.statement}
        </p>

        {dispute.challenged_deliverables.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-1.5">
              Challenged Deliverables
            </div>
            <ul className="space-y-1">
              {dispute.challenged_deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#EF4444]">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-[#EF4444]" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {dispute.missing_criteria.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-1.5">
              Unmet Criteria
            </div>
            <ul className="space-y-1">
              {dispute.missing_criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#EF4444]">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-[#EF4444]" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#EF4444]/20">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2]">Remedy</div>
            <div className="text-xs font-mono text-[#F4F7FA] mt-0.5">
              {dispute.requested_remedy.replace(/_/g, ' ')}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2]">Opened By</div>
            <MonoText truncate className="text-xs mt-0.5">
              {dispute.opened_by}
            </MonoText>
          </div>
        </div>
      </div>

      {/* Worker Response */}
      {worker_response ? (
        <div className="border border-[#3B82F6]/30 bg-[#3B82F6]/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#3B82F6]">
              Worker Response
            </span>
          </div>
          <p className="text-sm text-[#F4F7FA] leading-relaxed mb-3">
            {worker_response.explanation}
          </p>
          {worker_response.revision_offer && (
            <div className="border-t border-[#3B82F6]/20 pt-3">
              <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-1">
                Revision Offer
              </div>
              <p className="text-xs text-[#9AA6B2]">{worker_response.revision_offer}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-[#1E2A35] p-4 text-center">
          <p className="text-xs text-[#9AA6B2]">No worker response filed yet</p>
        </div>
      )}
    </div>
  )
}
