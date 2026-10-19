'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Scale, MessageSquare, AlertTriangle, CheckCircle, Loader2, Wallet, UserCheck, Send, ShieldCheck } from 'lucide-react'
import { Agreement, AgreementStatus } from '@/types'
import clsx from 'clsx'
import {
  approveDelivery,
  requestVerdict,
  fundAgreement,
  acceptAgreement,
  settleAgreement,
  confirmSettlements,
  cancelAgreement,
  declineAgreement,
  claimAfterReviewWindow,
  reclaimExpired,
  weiToGen,
} from '@/lib/genlayer'
import { useWallet } from '@/lib/store'

const VARIANT_STYLES: Record<string, string> = {
  blue:    'border-[#3B82F6]/60 bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20',
  green:   'border-[#22C55E]/60 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20',
  red:     'border-[#EF4444]/60 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20',
  amber:   'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20',
  default: 'border-[#1E2A35] bg-[#11161C] text-[#9AA6B2] hover:text-[#F4F7FA]',
}

interface Props {
  agreement: Agreement
  onRefresh?: () => void
}

export default function SettlementRail({ agreement }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { address } = useWallet()
  const id = agreement.id

  const me = (address ?? '').toLowerCase()
  const isClient = me !== '' && me === agreement.client_address.toLowerCase()
  const isWorker = me !== '' && me === agreement.worker_address.toLowerCase()
  const isParty = isClient || isWorker
  const requiredWei = agreement.required_reward ?? '0'

  async function handle(action: string) {
    setBusy(action)
    setError(null)
    try {
      switch (action) {
        case 'fund': await fundAgreement(id, requiredWei); break
        case 'accept': await acceptAgreement(id); break
        case 'decline': await declineAgreement(id); break
        case 'cancel': await cancelAgreement(id); break
        case 'approve': await approveDelivery(id); break
        case 'claim': await claimAfterReviewWindow(id); break
        case 'reclaim': await reclaimExpired(id); break
        case 'settle': await settleAgreement(id); break
        case 'confirm': await confirmSettlements(); break
        case 'request_verdict':
          await requestVerdict(id)
          router.push(`/agreements/${id}/verdict`)
          return
      }
      await new Promise((r) => setTimeout(r, 3000))
      window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setBusy(null)
    }
  }

  const btnCls = (variant: string) =>
    clsx(
      'flex w-full items-center justify-between border px-3 py-2.5 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
      VARIANT_STYLES[variant]
    )

  const Btn = ({ action, variant, label, busyLabel, icon }: { action: string; variant: string; label: string; busyLabel: string; icon: React.ReactNode }) => (
    <button onClick={() => handle(action)} disabled={!!busy} className={btnCls(variant)}>
      <span className="flex items-center gap-2">
        {busy === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
        {busy === action ? busyLabel : label}
      </span>
      <ArrowRight className="h-3 w-3" />
    </button>
  )

  const VerdictLink = ({ label }: { label: string }) => (
    <Link href={`/agreements/${id}/verdict`} className={btnCls('default')}>
      <span className="flex items-center gap-2"><Scale className="h-3.5 w-3.5" />{label}</span>
      <ArrowRight className="h-3 w-3" />
    </Link>
  )

  const renderActions = () => {
    switch (agreement.status) {
      case AgreementStatus.Draft:
        return (
          <>
            {isClient && (
              <>
                <div className="border border-[#1E2A35] bg-[#080A0D] px-3 py-2 text-[10px] text-[#9AA6B2]">
                  Funding sends exactly <span className="font-mono text-[#F59E0B]">{weiToGen(requiredWei)} GEN</span> into
                  contract custody. The amount is fixed by the agreement terms; any other value is rejected on-chain.
                </div>
                <Btn action="fund" variant="green" label={`Fund ${weiToGen(requiredWei)} GEN`} busyLabel="Funding…" icon={<Wallet className="h-3.5 w-3.5" />} />
                <Btn action="cancel" variant="default" label="Cancel Draft" busyLabel="Cancelling…" icon={null} />
              </>
            )}
            {!isClient && <p className="text-xs text-[#9AA6B2]">Waiting for the client to fund the escrow.</p>}
          </>
        )

      case AgreementStatus.Funded:
        return (
          <>
            {isWorker && <Btn action="accept" variant="blue" label="Accept Agreement" busyLabel="Accepting…" icon={<UserCheck className="h-3.5 w-3.5" />} />}
            {isWorker && <Btn action="decline" variant="default" label="Decline & Refund Client" busyLabel="Declining…" icon={null} />}
            {isClient && <Btn action="cancel" variant="default" label="Cancel & Refund" busyLabel="Cancelling…" icon={null} />}
            {!isParty && <p className="text-xs text-[#9AA6B2]">Escrow funded. Awaiting the worker.</p>}
          </>
        )

      case AgreementStatus.Accepted:
        return (
          <>
            {isWorker && (
              <Link href={`/agreements/${id}/submit`} className={btnCls('blue')}>
                <span className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5" />Submit Deliverables</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {isClient && <Btn action="reclaim" variant="amber" label="Reclaim (after deadline + review window)" busyLabel="Reclaiming…" icon={null} />}
          </>
        )

      case AgreementStatus.Submitted:
        return (
          <>
            {isClient && <Btn action="approve" variant="green" label="Approve Delivery" busyLabel="Approving…" icon={<CheckCircle className="h-3.5 w-3.5" />} />}
            {isClient && (
              <Link href={`/agreements/${id}/dispute`} className={btnCls('red')}>
                <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />Open Dispute</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {isWorker && <Btn action="claim" variant="amber" label="Claim (review window lapsed)" busyLabel="Claiming…" icon={null} />}
          </>
        )

      case AgreementStatus.Disputed:
        return (
          <>
            {isWorker && (
              <Link href={`/agreements/${id}/respond`} className={btnCls('blue')}>
                <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" />File Response</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {isParty && <Btn action="request_verdict" variant="blue" label="Request Verdict" busyLabel="Requesting Verdict…" icon={<Scale className="h-3.5 w-3.5" />} />}
          </>
        )

      case AgreementStatus.ResponseSubmitted:
      case AgreementStatus.Appealed:
        return isParty
          ? <Btn action="request_verdict" variant="blue" label="Request Verdict" busyLabel="Requesting Verdict…" icon={<Scale className="h-3.5 w-3.5" />} />
          : <p className="text-xs text-[#9AA6B2]">Awaiting adjudication.</p>

      case AgreementStatus.Resolved:
        return (
          <>
            <VerdictLink label="View Verdict" />
            <Btn action="settle" variant="amber" label="Settle (queue transfers)" busyLabel="Settling…" icon={<Send className="h-3.5 w-3.5" />} />
            {agreement.appealable && isParty && Number(agreement.appeal_bond ?? 0) > 0 && (
              <Link href={`/agreements/${id}/appeal`} className={btnCls('red')}>
                <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />Appeal ({weiToGen(agreement.appeal_bond)} GEN bond)</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </>
        )

      case AgreementStatus.SettlementPending:
        return (
          <>
            <div className="border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-[10px] text-[#F59E0B]">
              Transfers are queued and are emitted when the settle transaction finalizes. This is not marked settled until the
              contract balance shows the funds have left custody.
            </div>
            <Btn action="confirm" variant="green" label="Confirm Delivery" busyLabel="Checking…" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
            <VerdictLink label="View Verdict" />
          </>
        )

      case AgreementStatus.Settled:
        return <VerdictLink label="View Final Verdict" />

      default:
        return <p className="text-xs text-[#9AA6B2]">No actions available</p>
    }
  }

  return (
    <div className="border border-[#1E2A35] bg-[#11161C] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Available Actions</div>
      {!address && (
        <p className="mb-3 text-[10px] text-[#9AA6B2]">Connect a wallet to see the actions available to your role.</p>
      )}
      {error && (
        <div className="mb-3 border border-[#EF4444]/40 bg-[#EF4444]/5 px-3 py-2 text-[10px] text-[#EF4444] break-all">
          {error}
        </div>
      )}
      <div className="space-y-2">{renderActions()}</div>
    </div>
  )
}
