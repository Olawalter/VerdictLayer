import { FileText, Link2, MessageSquare, Code, ArrowRight, Scale, Shield } from 'lucide-react'
import { Agreement, TimelineEvent, EvidenceType } from '@/types'
import MonoText from './ui/MonoText'

function buildTimeline(agreement: Agreement): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    id: 'created',
    type: 'agreement',
    label: 'Agreement Created',
    description: `"${agreement.title}" drafted by client`,
    actor: agreement.client_address,
    timestamp: agreement.created_at,
  })

  if (agreement.funded_at) {
    events.push({
      id: 'funded',
      type: 'agreement',
      label: 'Escrow Funded',
      description: `${agreement.funding_amount.toLocaleString()} ${agreement.currency} locked`,
      actor: agreement.client_address,
      timestamp: agreement.funded_at,
    })
  }

  if (agreement.accepted_at) {
    events.push({
      id: 'accepted',
      type: 'agreement',
      label: 'Agreement Accepted',
      description: 'Worker accepted terms and started work',
      actor: agreement.worker_address,
      timestamp: agreement.accepted_at,
    })
  }

  // Evidence
  if (agreement.evidence) {
    for (const ev of agreement.evidence) {
      if (ev.source_label === 'worker' || ev.source_label === 'worker_response') {
        events.push({
          id: ev.evidence_id,
          type: 'evidence',
          label: ev.title,
          description: ev.description,
          actor: ev.submitted_by,
          timestamp: ev.submitted_at,
          data: ev,
        })
      }
    }
  }

  if (agreement.submitted_at) {
    events.push({
      id: 'submitted',
      type: 'evidence',
      label: 'Deliverables Submitted',
      description: 'Worker submitted deliverables for review',
      actor: agreement.worker_address,
      timestamp: agreement.submitted_at,
    })
  }

  // Client evidence
  if (agreement.evidence) {
    for (const ev of agreement.evidence) {
      if (ev.source_label === 'client') {
        events.push({
          id: ev.evidence_id,
          type: 'dispute',
          label: ev.title,
          description: ev.description,
          actor: ev.submitted_by,
          timestamp: ev.submitted_at,
          data: ev,
        })
      }
    }
  }

  if (agreement.disputed_at && agreement.dispute) {
    events.push({
      id: 'disputed',
      type: 'dispute',
      label: 'Dispute Opened',
      description: agreement.dispute.statement.slice(0, 100) + '…',
      actor: agreement.client_address,
      timestamp: agreement.disputed_at,
    })
  }

  if (agreement.worker_response) {
    events.push({
      id: 'response',
      type: 'response',
      label: 'Worker Response Filed',
      description: agreement.worker_response.explanation.slice(0, 100) + '…',
      actor: agreement.worker_address,
      timestamp: agreement.worker_response.responded_at,
    })
  }

  if (agreement.verdict) {
    events.push({
      id: 'verdict',
      type: 'verdict',
      label: 'Verdict Rendered',
      description: agreement.verdict.short_reason.slice(0, 100) + '…',
      actor: 'GenLayer Consensus',
      timestamp: agreement.verdict.rendered_at,
      data: agreement.verdict,
    })
  }

  if (agreement.finalized_at) {
    events.push({
      id: 'finalized',
      type: 'settlement',
      label: 'Agreement Finalized',
      description: 'Settlement applied and escrow distributed',
      actor: 'Protocol',
      timestamp: agreement.finalized_at,
    })
  }

  return events.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
}

function EventIcon({ type }: { type: TimelineEvent['type'] }) {
  switch (type) {
    case 'agreement':
      return <FileText className="h-3.5 w-3.5 text-[#3B82F6]" />
    case 'evidence':
      return <Link2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
    case 'dispute':
      return <Shield className="h-3.5 w-3.5 text-[#EF4444]" />
    case 'response':
      return <MessageSquare className="h-3.5 w-3.5 text-[#F59E0B]" />
    case 'verdict':
      return <Scale className="h-3.5 w-3.5 text-[#22C55E]" />
    case 'settlement':
      return <ArrowRight className="h-3.5 w-3.5 text-[#22C55E]" />
    default:
      return <Code className="h-3.5 w-3.5 text-[#9AA6B2]" />
  }
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

interface EvidenceTimelineProps {
  agreement: Agreement
}

export default function EvidenceTimeline({ agreement }: EvidenceTimelineProps) {
  const events = buildTimeline(agreement)

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1E2A35]" />

      <div className="space-y-0">
        {events.map((event, i) => (
          <div key={event.id} className="relative flex gap-4 pb-6">
            {/* Icon */}
            <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[#1E2A35] bg-[#080A0D]">
              <EventIcon type={event.type} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-[#F4F7FA]">
                  {event.label}
                </span>
                <MonoText className="text-[10px] flex-shrink-0">{formatTs(event.timestamp)}</MonoText>
              </div>
              <p className="text-xs text-[#9AA6B2] leading-relaxed mb-1">
                {event.description}
              </p>
              <MonoText truncate className="text-[10px]">
                {event.actor}
              </MonoText>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
