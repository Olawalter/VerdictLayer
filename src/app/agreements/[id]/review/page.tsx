'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCaseById } from '@/lib/mockData'

const REVIEW_STAGES = [
  {
    id: 'parse',
    label: 'Parsing Dispute Packet',
    desc: 'Extracting agreement terms, deliverables, criteria, and evidence…',
    duration: 1200,
  },
  {
    id: 'evidence',
    label: 'Evaluating Evidence',
    desc: 'Analyzing all submitted evidence packages and their claimed relevance…',
    duration: 2000,
  },
  {
    id: 'criteria',
    label: 'Mapping to Acceptance Criteria',
    desc: 'Cross-referencing evidence against each acceptance criterion…',
    duration: 1800,
  },
  {
    id: 'dispute',
    label: 'Analyzing Dispute Claims',
    desc: 'Evaluating the strength and specificity of the client\'s dispute claims…',
    duration: 1500,
  },
  {
    id: 'response',
    label: 'Reviewing Worker Response',
    desc: 'Assessing counter-evidence and worker explanation…',
    duration: 1200,
  },
  {
    id: 'consensus',
    label: 'Achieving Validator Consensus',
    desc: 'GenLayer validators converging on verdict via eq_principle_prompt_comparative…',
    duration: 2500,
  },
  {
    id: 'record',
    label: 'Recording On-Chain',
    desc: 'Committing consensus verdict to GenLayer ledger…',
    duration: 800,
  },
]

export default function ValidatorReviewPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const agreement = getCaseById(id)

  const [activeStage, setActiveStage] = useState(0)
  const [completedStages, setCompletedStages] = useState<number[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    let current = 0
    const advance = () => {
      if (current >= REVIEW_STAGES.length) {
        setDone(true)
        setTimeout(() => router.push(`/agreements/${id}/verdict`), 1000)
        return
      }
      setActiveStage(current)
      const duration = REVIEW_STAGES[current].duration
      setTimeout(() => {
        setCompletedStages((prev) => [...prev, current])
        current++
        advance()
      }, duration)
    }
    advance()
  }, [id, router])

  return (
    <div className="min-h-screen bg-[#080A0D] flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 border border-[#3B82F6]/30 bg-[#3B82F6]/5 px-3 py-1 mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#3B82F6]">
              GenLayer Consensus Active
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F4F7FA] mb-2">
            AI Adjudication Running
          </h1>
          <p className="text-sm text-[#9AA6B2]">
            Validator network is evaluating: {agreement?.title ?? id}
          </p>
        </div>

        {/* Stage cards */}
        <div className="space-y-2">
          {REVIEW_STAGES.map((stage, i) => {
            const isCompleted = completedStages.includes(i)
            const isActive = activeStage === i && !isCompleted
            const isPending = i > activeStage

            return (
              <div
                key={stage.id}
                className={`border p-4 transition-all duration-500 ${
                  isCompleted
                    ? 'border-[#22C55E]/30 bg-[#22C55E]/5'
                    : isActive
                      ? 'border-[#3B82F6]/50 bg-[#3B82F6]/5'
                      : 'border-[#1E2A35] bg-[#11161C] opacity-40'
                }`}
                style={{
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="h-5 w-5 border border-[#22C55E]/60 bg-[#22C55E]/20 flex items-center justify-center">
                        <span className="text-[#22C55E] text-[10px]">✓</span>
                      </div>
                    ) : isActive ? (
                      <div className="h-5 w-5 border border-[#3B82F6]/60 bg-[#3B82F6]/10 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-[#3B82F6] animate-ping" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 border border-[#1E2A35]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-semibold mb-0.5 ${
                        isCompleted
                          ? 'text-[#22C55E]'
                          : isActive
                            ? 'text-[#F4F7FA]'
                            : 'text-[#9AA6B2]'
                      }`}
                    >
                      {stage.label}
                    </div>
                    {(isActive || isCompleted) && (
                      <p className="text-[10px] text-[#9AA6B2] leading-relaxed">
                        {stage.desc}
                      </p>
                    )}
                  </div>

                  {/* Step number */}
                  <div className="flex-shrink-0">
                    <span className="font-mono text-[10px] text-[#1E2A35]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Active progress bar */}
                {isActive && (
                  <div className="mt-3 h-0.5 w-full bg-[#1A222B] overflow-hidden">
                    <div
                      className="h-full bg-[#3B82F6]"
                      style={{
                        animation: `fillBar ${stage.duration}ms linear forwards`,
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {done && (
          <div className="mt-6 border border-[#22C55E]/40 bg-[#22C55E]/10 p-4 text-center">
            <div className="font-mono text-xs text-[#22C55E] uppercase tracking-widest">
              Consensus Reached — Redirecting to Verdict…
            </div>
          </div>
        )}

        <style>{`
          @keyframes fillBar {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}
