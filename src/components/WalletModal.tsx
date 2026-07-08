'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Wallet, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { useWallet } from '@/lib/store'
import type { InjectedWallet } from '@/lib/injectedWallets'

export default function WalletModal() {
  const { wallets, modalOpen, closeModal, connectWallet } = useWallet()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!modalOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modalOpen, closeModal])

  // Reset error when modal closes
  useEffect(() => {
    if (!modalOpen) { setError(null); setConnecting(null) }
  }, [modalOpen])

  if (!modalOpen) return null

  async function handleConnect(wallet: InjectedWallet) {
    setError(null)
    setConnecting(wallet.uuid)
    try {
      await connectWallet(wallet)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connection rejected'
      // Treat user rejection gracefully
      setError(msg.includes('rejected') || msg.includes('denied') || msg.includes('cancel')
        ? 'Connection request was rejected. Try again.'
        : msg)
      setConnecting(null)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) closeModal() }}
    >
      <div className="w-full max-w-sm border border-[#1E2A35] bg-[#0D1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E2A35] px-5 py-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#3B82F6]" />
            <span className="font-display text-sm font-semibold text-[#F4F7FA]">
              Connect Wallet
            </span>
          </div>
          <button
            onClick={closeModal}
            className="text-[#9AA6B2] hover:text-[#F4F7FA] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {wallets.length === 0 ? (
            <NoWalletState />
          ) : (
            <>
              <p className="mb-4 text-xs text-[#9AA6B2]">
                {wallets.length === 1
                  ? 'One compatible wallet detected.'
                  : `${wallets.length} compatible wallets detected. Select one to connect.`}
              </p>

              <div className="space-y-2">
                {wallets.map((wallet) => (
                  <WalletOption
                    key={wallet.uuid}
                    wallet={wallet}
                    connecting={connecting === wallet.uuid}
                    disabled={connecting !== null}
                    onConnect={() => handleConnect(wallet)}
                  />
                ))}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 border border-[#EF4444]/40 bg-[#EF4444]/5 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#EF4444]" />
                  <p className="text-xs text-[#EF4444]">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E2A35] px-5 py-3">
          <p className="text-[10px] text-[#9AA6B2]">
            VerdictLayer only reads your address. It never requests access to funds
            without an explicit transaction confirmation in your wallet.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WalletOption({
  wallet,
  connecting,
  disabled,
  onConnect,
}: {
  wallet: InjectedWallet
  connecting: boolean
  disabled: boolean
  onConnect: () => void
}) {
  return (
    <button
      onClick={onConnect}
      disabled={disabled}
      className="flex w-full items-center gap-3 border border-[#1E2A35] bg-[#11161C] px-4 py-3 text-left transition-all hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {/* Icon */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#1E2A35] bg-[#080A0D]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wallet.icon} alt={wallet.name} className="h-6 w-6 object-contain" />
      </div>

      {/* Name */}
      <div className="flex-1">
        <div className="text-sm font-medium text-[#F4F7FA]">{wallet.name}</div>
      </div>

      {/* Status */}
      {connecting ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#3B82F6]" />
      ) : (
        <div className="text-[10px] font-medium text-[#3B82F6]">Connect</div>
      )}
    </button>
  )
}

function NoWalletState() {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[#1E2A35] bg-[#11161C]">
        <Wallet className="h-6 w-6 text-[#9AA6B2]" />
      </div>
      <p className="mb-1 text-sm font-medium text-[#F4F7FA]">No wallet detected</p>
      <p className="mb-5 text-xs text-[#9AA6B2]">
        Install a compatible EVM wallet extension to continue.
      </p>
      <div className="space-y-2">
        {[
          { name: 'MetaMask', url: 'https://metamask.io/download/' },
          { name: 'Rabby',    url: 'https://rabby.io/' },
        ].map(({ name, url }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between border border-[#1E2A35] bg-[#11161C] px-4 py-2.5 text-xs text-[#9AA6B2] hover:border-[#3B82F6]/40 hover:text-[#F4F7FA] transition-colors"
          >
            <span>Install {name}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ))}
      </div>
    </div>
  )
}
