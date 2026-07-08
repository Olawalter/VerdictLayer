'use client'

// ---------------------------------------------------------------------------
// EIP-1193 provider interface
// ---------------------------------------------------------------------------

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
  on(event: string, handler: (...args: unknown[]) => void): void
  removeListener(event: string, handler: (...args: unknown[]) => void): void
}

// ---------------------------------------------------------------------------
// Wallet descriptor — one entry per detected injected wallet
// ---------------------------------------------------------------------------

export interface InjectedWallet {
  /** Unique ID from EIP-6963 or synthetic for legacy providers */
  uuid: string
  /** Human-readable name, e.g. "MetaMask" */
  name: string
  /** Base64 data-URI icon */
  icon: string
  /** Reverse-DNS identifier, e.g. "io.metamask". Used for persistence. */
  rdns: string
  provider: EIP1193Provider
}

// ---------------------------------------------------------------------------
// EIP-6963 event shapes
// ---------------------------------------------------------------------------

interface EIP6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

interface EIP6963AnnounceProviderEvent extends Event {
  detail: {
    info: EIP6963ProviderInfo
    provider: EIP1193Provider
  }
}

// ---------------------------------------------------------------------------
// Synthetic fallback icon used for legacy window.ethereum wallets
// ---------------------------------------------------------------------------

const FALLBACK_ICON =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzZCN0E4RCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNCI+Vzwvc3ZldD4='

// ---------------------------------------------------------------------------
// discoverWallets
//
// Starts EIP-6963 discovery and calls `onChange` every time the wallet set
// changes. Also folds in legacy window.ethereum providers for wallets that
// have not yet adopted EIP-6963.
//
// Returns a cleanup function that removes all listeners.
// ---------------------------------------------------------------------------

export function discoverWallets(
  onChange: (wallets: InjectedWallet[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const seen = new Map<string, InjectedWallet>()

  function emit() {
    onChange(Array.from(seen.values()))
  }

  // --- EIP-6963 -----------------------------------------------------------

  const announceHandler = (rawEvent: Event) => {
    const event = rawEvent as EIP6963AnnounceProviderEvent
    const { info, provider } = event.detail
    if (!seen.has(info.uuid)) {
      seen.set(info.uuid, { ...info, provider })
      emit()
    }
  }

  window.addEventListener('eip6963:announceProvider', announceHandler)
  // Prompt installed wallets to announce themselves
  window.dispatchEvent(new Event('eip6963:requestProvider'))

  // --- Legacy window.ethereum fallback ------------------------------------
  // Run after a short tick so EIP-6963 announcements arrive first.
  // We only add a legacy entry for providers that didn't announce via EIP-6963.

  const legacyTimer = window.setTimeout(() => {
    const eth = (window as unknown as { ethereum?: EIP1193Provider & { providers?: (EIP1193Provider & Record<string, unknown>)[], isMetaMask?: boolean, isRabby?: boolean } }).ethereum
    if (!eth) { emit(); return }

    const legacyProviders: (EIP1193Provider & Record<string, unknown>)[] =
      Array.isArray(eth.providers) ? eth.providers : [eth as EIP1193Provider & Record<string, unknown>]

    let added = false
    for (const p of legacyProviders) {
      // Derive a stable synthetic rdns so we can persist it
      const { name, rdns } = legacyProviderMeta(p)
      const uuid = `legacy:${rdns}`
      // Only add if no EIP-6963 wallet with same rdns is already present
      const alreadyCovered = Array.from(seen.values()).some((w) => w.rdns === rdns)
      if (!alreadyCovered && !seen.has(uuid)) {
        seen.set(uuid, { uuid, name, icon: FALLBACK_ICON, rdns, provider: p })
        added = true
      }
    }
    if (added) emit()
  }, 100)

  return () => {
    window.removeEventListener('eip6963:announceProvider', announceHandler)
    window.clearTimeout(legacyTimer)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function legacyProviderMeta(
  p: Record<string, unknown>
): { name: string; rdns: string } {
  if (p.isRabby)    return { name: 'Rabby',    rdns: 'io.rabby' }
  if (p.isBraveWallet) return { name: 'Brave',  rdns: 'com.brave.wallet' }
  if (p.isCoinbaseWallet) return { name: 'Coinbase Wallet', rdns: 'com.coinbase.wallet' }
  if (p.isMetaMask) return { name: 'MetaMask', rdns: 'io.metamask' }
  return { name: 'Browser Wallet', rdns: 'unknown.wallet' }
}

// ---------------------------------------------------------------------------
// connect — request accounts from a specific provider
// ---------------------------------------------------------------------------

export async function connectProvider(
  provider: EIP1193Provider
): Promise<string> {
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[]
  if (!accounts || accounts.length === 0) throw new Error('No accounts returned')
  return accounts[0]
}

// ---------------------------------------------------------------------------
// silentReconnect — get already-authorised accounts without a popup
// ---------------------------------------------------------------------------

export async function silentReconnect(
  provider: EIP1193Provider
): Promise<string | null> {
  try {
    const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
    return accounts && accounts.length > 0 ? accounts[0] : null
  } catch {
    return null
  }
}
