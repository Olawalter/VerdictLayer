'use client'

import { create } from 'zustand'
import {
  type InjectedWallet,
  type EIP1193Provider,
  discoverWallets,
  connectProvider,
  silentReconnect,
} from './injectedWallets'
import { resetClient } from './genlayer'

// ---------------------------------------------------------------------------
// Persistence key
// ---------------------------------------------------------------------------

const PERSIST_KEY = 'vl:wallet'

function savePersistedWallet(rdns: string) {
  try { localStorage.setItem(PERSIST_KEY, rdns) } catch {}
}
function clearPersistedWallet() {
  try { localStorage.removeItem(PERSIST_KEY) } catch {}
}
function getPersistedWalletRdns(): string | null {
  try { return localStorage.getItem(PERSIST_KEY) } catch { return null }
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface WalletState {
  // Detected injected wallets
  wallets: InjectedWallet[]
  // UI
  modalOpen: boolean
  // Connection
  connected: boolean
  address: string | null
  activeWallet: InjectedWallet | null
  // Internal — active EIP-1193 listeners so we can remove them
  _cleanupListeners: (() => void) | null
  _cleanupDiscovery: (() => void) | null
  _attachListeners: (provider: EIP1193Provider) => void

  // Actions
  openModal: () => void
  closeModal: () => void
  /** Called once on app mount to start wallet discovery + silent reconnect */
  initialize: () => void
  /** Connect to a specific wallet (may show wallet popup) */
  connectWallet: (wallet: InjectedWallet) => Promise<void>
  disconnect: () => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWallet = create<WalletState>((set, get) => ({
  wallets: [],
  modalOpen: false,
  connected: false,
  address: null,
  activeWallet: null,
  _cleanupListeners: null,
  _cleanupDiscovery: null,

  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),

  initialize() {
    // Start EIP-6963 discovery
    const cleanupDiscovery = discoverWallets((wallets) => {
      set({ wallets })

      // Attempt silent reconnect using persisted wallet rdns
      const persisted = getPersistedWalletRdns()
      if (!persisted) return
      const { connected } = get()
      if (connected) return

      const match = wallets.find((w) => w.rdns === persisted)
      if (!match) return

      silentReconnect(match.provider).then((address) => {
        if (address) {
          get()._attachListeners(match.provider)
          resetClient(match.provider, address)
          set({ connected: true, address, activeWallet: match })
        }
      })
    })

    set({ _cleanupDiscovery: cleanupDiscovery })
  },

  async connectWallet(wallet) {
    const address = await connectProvider(wallet.provider)
    get()._attachListeners(wallet.provider)
    resetClient(wallet.provider, address)
    savePersistedWallet(wallet.rdns)
    set({ connected: true, address, activeWallet: wallet, modalOpen: false })
  },

  disconnect() {
    const { _cleanupListeners, _cleanupDiscovery } = get()
    _cleanupListeners?.()
    _cleanupDiscovery?.()
    clearPersistedWallet()
    resetClient(null, null)
    set({
      connected: false,
      address: null,
      activeWallet: null,
      _cleanupListeners: null,
      wallets: [],
    })
    // Restart discovery so the wallet list is fresh for next connect
    const cleanupDiscovery = discoverWallets((wallets) => set({ wallets }))
    set({ _cleanupDiscovery: cleanupDiscovery })
  },

  // Internal — not exported on the public type, called internally
  _attachListeners(provider: EIP1193Provider) {
    const { _cleanupListeners } = get()
    _cleanupListeners?.() // remove any prior listeners

    const onAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[]
      if (!list || list.length === 0) {
        get().disconnect()
      } else {
        const newAddress = list[0]
        resetClient(provider, newAddress)
        set({ address: newAddress })
      }
    }

    const onChainChanged = () => {
      // Chain changed — reset the genlayer client so it picks up the new chain
      const { address } = get()
      resetClient(provider, address)
    }

    const onDisconnect = () => {
      get().disconnect()
    }

    provider.on('accountsChanged', onAccountsChanged)
    provider.on('chainChanged', onChainChanged)
    provider.on('disconnect', onDisconnect)

    set({
      _cleanupListeners: () => {
        provider.removeListener('accountsChanged', onAccountsChanged)
        provider.removeListener('chainChanged', onChainChanged)
        provider.removeListener('disconnect', onDisconnect)
      },
    })
  },
}))
