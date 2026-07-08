'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scale, Wallet, LogOut, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useWallet } from '@/lib/store'
import WalletModal from '@/components/WalletModal'

const NAV_LINKS = [
  { href: '/explorer', label: 'Explorer' },
  { href: '/agreements/new', label: 'New Agreement' },
]

export default function Header() {
  const pathname = usePathname()
  const { address, connected, activeWallet, openModal, disconnect, initialize } = useWallet()

  // Start wallet discovery and silent reconnect once on mount
  useEffect(() => {
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#1E2A35] bg-[#080A0D]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center border border-[#3B82F6] bg-[#3B82F6]/10">
              <Scale className="h-4 w-4 text-[#3B82F6]" strokeWidth={1.5} />
            </div>
            <span className="font-display text-sm font-semibold tracking-wider text-[#F4F7FA] uppercase">
              VerdictLayer
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'text-xs font-medium uppercase tracking-wider transition-colors',
                  pathname === link.href
                    ? 'text-[#3B82F6]'
                    : 'text-[#9AA6B2] hover:text-[#F4F7FA]'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wallet */}
          {connected && address ? (
            <div className="flex items-center gap-2">
              {/* Connected chip — click to show wallet name */}
              <div className="flex items-center gap-2 border border-[#22C55E]/30 bg-[#22C55E]/5 px-3 py-1.5">
                {activeWallet?.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeWallet.icon}
                    alt={activeWallet.name}
                    className="h-3.5 w-3.5 rounded-sm object-contain"
                  />
                )}
                <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                <span className="font-mono text-[10px] text-[#9AA6B2]">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                {activeWallet && (
                  <span className="text-[9px] text-[#9AA6B2]/60">
                    · {activeWallet.name}
                  </span>
                )}
              </div>

              {/* Switch wallet */}
              <button
                onClick={openModal}
                title="Switch wallet"
                className="flex items-center border border-[#1E2A35] bg-[#11161C] px-2 py-1.5 text-[#9AA6B2] hover:border-[#3B82F6]/40 hover:text-[#F4F7FA] transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {/* Disconnect */}
              <button
                onClick={disconnect}
                title="Disconnect"
                className="flex items-center border border-[#1E2A35] bg-[#11161C] px-2 py-1.5 text-[#9AA6B2] hover:border-[#EF4444]/50 hover:text-[#EF4444] transition-colors"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={openModal}
              className="flex items-center gap-2 border border-[#1E2A35] bg-[#11161C] px-3 py-1.5 text-xs font-medium text-[#9AA6B2] hover:border-[#3B82F6] hover:text-[#F4F7FA] transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Wallet selection modal — rendered outside header for z-index */}
      <WalletModal />
    </>
  )
}
