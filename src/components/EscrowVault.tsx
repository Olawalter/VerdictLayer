import { Lock, Unlock, AlertTriangle } from 'lucide-react'
import { Agreement, AgreementStatus } from '@/types'
import clsx from 'clsx'

interface EscrowVaultProps {
  agreement: Agreement
}

function getEscrowState(status: AgreementStatus) {
  switch (status) {
    case AgreementStatus.Draft:
      return { label: 'Unfunded', icon: 'unlock', color: '#9AA6B2', desc: 'Awaiting client escrow deposit' }
    case AgreementStatus.Funded:
    case AgreementStatus.Accepted:
    case AgreementStatus.Submitted:
      return { label: 'Locked', icon: 'lock', color: '#F59E0B', desc: 'Funds held in escrow' }
    case AgreementStatus.Disputed:
    case AgreementStatus.ResponseSubmitted:
      return { label: 'Disputed Hold', icon: 'alert', color: '#EF4444', desc: 'Release blocked pending verdict' }
    case AgreementStatus.Resolved:
      return { label: 'Verdict Rendered', icon: 'lock', color: '#8B5CF6', desc: 'Awaiting settlement application' }
    case AgreementStatus.Finalized:
      return { label: 'Settled', icon: 'unlock', color: '#22C55E', desc: 'Funds distributed' }
    case AgreementStatus.Appealed:
      return { label: 'Appeal Hold', icon: 'alert', color: '#EF4444', desc: 'Funds held during appeal' }
    default:
      return { label: 'Unknown', icon: 'lock', color: '#9AA6B2', desc: '' }
  }
}

export default function EscrowVault({ agreement }: EscrowVaultProps) {
  const state = getEscrowState(agreement.status)
  const workerPct = agreement.verdict?.payout_percentage_to_worker ?? 100
  const clientPct = 100 - workerPct
  const total = agreement.funding_amount

  const Icon =
    state.icon === 'lock'
      ? Lock
      : state.icon === 'unlock'
        ? Unlock
        : AlertTriangle

  return (
    <div className="border border-[#1E2A35] bg-[#11161C] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-[#9AA6B2]">
          Escrow Vault
        </span>
        <div
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider"
          style={{ color: state.color }}
        >
          <Icon className="h-3 w-3" />
          {state.label}
        </div>
      </div>

      {/* Amount */}
      <div className="mb-1">
        <span className="font-display text-2xl font-bold text-[#F59E0B]">
          {total.toLocaleString()}
        </span>
        <span className="ml-1.5 font-mono text-sm text-[#9AA6B2]">
          {agreement.currency}
        </span>
      </div>
      <p className="text-xs text-[#9AA6B2] mb-4">{state.desc}</p>

      {/* Split bar (only for resolved/finalized) */}
      {agreement.verdict && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] font-mono text-[#9AA6B2] mb-1.5">
            <span>Worker {workerPct}%</span>
            <span>Client {clientPct}%</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden bg-[#1A222B]">
            <div
              className="h-full bg-[#22C55E] transition-all duration-700"
              style={{ width: `${workerPct}%` }}
            />
            <div
              className="h-full bg-[#EF4444] transition-all duration-700"
              style={{ width: `${clientPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono mt-1">
            <span className="text-[#22C55E]">
              {Math.round(total * workerPct / 100).toLocaleString()} {agreement.currency}
            </span>
            <span className="text-[#EF4444]">
              {Math.round(total * clientPct / 100).toLocaleString()} {agreement.currency}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
