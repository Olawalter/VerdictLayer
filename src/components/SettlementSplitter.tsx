'use client'

import { useState } from 'react'
import { Verdict, Agreement } from '@/types'

interface SettlementSplitterProps {
  agreement: Agreement
  verdict: Verdict
}

export default function SettlementSplitter({ agreement, verdict }: SettlementSplitterProps) {
  const workerPct = verdict.payout_percentage_to_worker
  const clientPct = 100 - workerPct
  const total = agreement.funding_amount
  const workerAmt = Math.round(total * workerPct / 100)
  const clientAmt = total - workerAmt

  return (
    <div className="border border-[#1E2A35] bg-[#11161C] p-5">
      <div className="text-[10px] uppercase tracking-widest text-[#9AA6B2] mb-4">
        Settlement Split
      </div>

      {/* Split bar */}
      <div className="relative mb-4">
        <div className="flex h-8 w-full overflow-hidden border border-[#1E2A35]">
          <div
            className="flex h-full items-center justify-center bg-[#22C55E]/20 border-r border-[#22C55E]/40 transition-all duration-700"
            style={{ width: `${workerPct}%` }}
          >
            {workerPct > 15 && (
              <span className="font-mono text-xs font-bold text-[#22C55E]">
                {workerPct}%
              </span>
            )}
          </div>
          <div
            className="flex h-full items-center justify-center bg-[#EF4444]/20 transition-all duration-700"
            style={{ width: `${clientPct}%` }}
          >
            {clientPct > 15 && (
              <span className="font-mono text-xs font-bold text-[#EF4444]">
                {clientPct}%
              </span>
            )}
          </div>
        </div>

        {/* Tick mark */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/20"
          style={{ left: `${workerPct}%` }}
        />
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#22C55E]/30 bg-[#22C55E]/5 p-3">
          <div className="text-[9px] uppercase tracking-widest text-[#22C55E] mb-1">
            Worker Receives
          </div>
          <div className="font-display text-xl font-bold text-[#22C55E]">
            {workerAmt.toLocaleString()}
          </div>
          <div className="font-mono text-xs text-[#9AA6B2]">{agreement.currency}</div>
        </div>
        <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 p-3">
          <div className="text-[9px] uppercase tracking-widest text-[#EF4444] mb-1">
            Client Refund
          </div>
          <div className="font-display text-xl font-bold text-[#EF4444]">
            {clientAmt.toLocaleString()}
          </div>
          <div className="font-mono text-xs text-[#9AA6B2]">{agreement.currency}</div>
        </div>
      </div>

      {/* Payout action */}
      <div className="mt-3 pt-3 border-t border-[#1E2A35]">
        <div className="text-[9px] uppercase tracking-widest text-[#9AA6B2] mb-1">
          Payout Action
        </div>
        <div className="font-mono text-xs text-[#F4F7FA]">
          {verdict.payout_action.replace(/_/g, ' ')}
        </div>
      </div>
    </div>
  )
}
