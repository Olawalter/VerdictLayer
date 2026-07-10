'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Scale, MessageSquare, AlertTriangle, CheckCircle, Loader2, Wallet, UserCheck } from 'lucide-react'
import { Agreement, AgreementStatus } from '@/types'
import clsx from 'clsx'
import { approveDelivery, applyVerdict, requestVerdict, fundAgreement, acceptAgreement } from '@/lib/genlayer'

// Retry fetching live state after a write — studionet can take several seconds
// to make the new state readable. Polls up to 5 times with growing delays.
async function retryRefresh(onRefresh: (() => Promise<void> | void) | undefined) {
  if (!onRefresh) return
  const delays = [2000, 3000, 4000, 5000, 6000]
  for (const delay of delays) {
    await new Promise((r) => setTimeout(r, delay))
    await onRefresh()
  }
}

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

export default function SettlementRail({ agreement, onRefresh }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // fund form state
  const [fundAmount, setFundAmount] = useState(String(agreement.funding_amount || ''))
  const [fundCurrency, setFundCurrency] = useState(agreement.currency || 'GEN')
  const router = useRouter()
  const id = agreement.id

  async function handle(action: string) {
    setBusy(action)
    setError(null)
    try {
      switch (action) {
        case 'fund':
          await fundAgreement(id, parseFloat(fundAmount), fundCurrency)
          await new Promise(r => setTimeout(r, 3000))
          window.location.reload()
          break
        case 'accept':
          await acceptAgreement(id)
          await new Promise(r => setTimeout(r, 3000))
          window.location.reload()
          break
        case 'approve':
          await approveDelivery(id)
          await new Promise(r => setTimeout(r, 3000))
          window.location.reload()
          break
        case 'apply_verdict':
          await applyVerdict(id)
          await new Promise(r => setTimeout(r, 3000))
          window.location.reload()
          break
        case 'request_verdict':
          await requestVerdict(id)
          router.push(`/agreements/${id}/verdict`)
          break
      }
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

  const renderActions = () => {
    switch (agreement.status) {
      case AgreementStatus.Draft:
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="flex-1 border border-[#1E2A35] bg-[#080A0D] px-2 py-1.5 text-xs text-[#F4F7FA] placeholder:text-[#9AA6B2] focus:border-[#22C55E]/60 focus:outline-none"
              />
              <select
                value={fundCurrency}
                onChange={(e) => setFundCurrency(e.target.value)}
                className="border border-[#1E2A35] bg-[#080A0D] px-2 py-1.5 text-xs text-[#9AA6B2] focus:outline-none"
              >
                {['GEN', 'USDC', 'ETH', 'USDT', 'DAI'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handle('fund')}
              disabled={!!busy || !fundAmount || parseFloat(fundAmount) <= 0}
              className={btnCls('green')}
            >
              <span className="flex items-center gap-2">
                {busy === 'fund' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
                {busy === 'fund' ? 'Funding…' : 'Fund Agreement'}
              </span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )

      case AgreementStatus.Funded:
        return (
          <button
            onClick={() => handle('accept')}
            disabled={!!busy}
            className={btnCls('blue')}
          >
            <span className="flex items-center gap-2">
              {busy === 'accept' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
              {busy === 'accept' ? 'Accepting…' : 'Accept Agreement'}
            </span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )

      case AgreementStatus.Accepted:
        return (
          <Link href={`/agreements/${id}/submit`} className={btnCls('blue')}>
            <span className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Submit Deliverables
            </span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )

      case AgreementStatus.Submitted:
        return (
          <>
            <button
              onClick={() => handle('approve')}
              disabled={!!busy}
              className={btnCls('green')}
            >
              <span className="flex items-center gap-2">
                {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                {busy === 'approve' ? 'Approving…' : 'Approve Delivery'}
              </span>
              <ArrowRight className="h-3 w-3" />
            </button>
            <Link href={`/agreements/${id}/dispute`} className={btnCls('red')}>
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Open Dispute
              </span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        )

      case AgreementStatus.Disputed:
        return (
          <Link href={`/agreements/${id}/respond`} className={btnCls('blue')}>
            <span className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              File Response
            </span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )

      case AgreementStatus.ResponseSubmitted:
        return (
          <button
            onClick={() => handle('request_verdict')}
            disabled={!!busy}
            className={btnCls('blue')}
          >
            <span className="flex items-center gap-2">
              {busy === 'request_verdict' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
              {busy === 'request_verdict' ? 'Requesting Verdict…' : 'Request Verdict'}
            </span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )

      case AgreementStatus.Resolved:
        return (
          <>
            <Link href={`/agreements/${id}/verdict`} className={btnCls('green')}>
              <span className="flex items-center gap-2">
                <Scale className="h-3.5 w-3.5" />
                View Verdict
              </span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={() => handle('apply_verdict')}
              disabled={!!busy}
              className={btnCls('amber')}
            >
              <span className="flex items-center gap-2">
                {busy === 'apply_verdict' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {busy === 'apply_verdict' ? 'Applying…' : 'Apply Settlement'}
              </span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </>
        )

      case AgreementStatus.Finalized:
        return (
          <Link href={`/agreements/${id}/verdict`} className={btnCls('default')}>
            <span className="flex items-center gap-2">
              <Scale className="h-3.5 w-3.5" />
              View Final Verdict
            </span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )

      default:
        return <p className="text-xs text-[#9AA6B2]">No actions available</p>
    }
  }

  return (
    <div className="border border-[#1E2A35] bg-[#11161C] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-3">Available Actions</div>
      {error && (
        <div className="mb-3 border border-[#EF4444]/40 bg-[#EF4444]/5 px-3 py-2 text-[10px] text-[#EF4444] break-all">
          {error}
        </div>
      )}
      <div className="space-y-2">{renderActions()}</div>
    </div>
  )
}
