'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import clsx from 'clsx'

interface CanonicalJsonPanelProps {
  data: unknown
  title?: string
  defaultOpen?: boolean
}

export default function CanonicalJsonPanel({
  data,
  title = 'Canonical JSON',
  defaultOpen = false,
}: CanonicalJsonPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="border border-[#1E2A35] bg-[#080A0D]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-[#11161C] transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#9AA6B2]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#9AA6B2]" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#9AA6B2]">
            {title}
          </span>
        </div>
        {open && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="flex items-center gap-1 text-[10px] text-[#9AA6B2] hover:text-[#F4F7FA] transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-[#22C55E]" />
                <span className="text-[#22C55E]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        )}
      </button>

      {open && (
        <div className="border-t border-[#1E2A35] overflow-x-auto">
          <pre className="p-4 font-mono text-[11px] text-[#9AA6B2] leading-relaxed whitespace-pre">
            <code>{json}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
