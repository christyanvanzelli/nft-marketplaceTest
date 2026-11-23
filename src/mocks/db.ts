// src/mocks/db.ts
import type { Cart, Nft, Order, Session, Wallet } from '@/types'
import {
  INITIAL_COUPONS,
  INITIAL_NFTS,
  INITIAL_USERS,
  INITIAL_WALLETS,
  type MockUserRecord,
} from './fixtures/initialData'

export type MockScenario =
  | 'default'
  | 'slow_network'
  | 'network_error'
  | 'server_error'
  | 'out_of_order'
  | 'payment_rejected'
  | 'order_timeout'
  | 'price_changed_checkout'

export interface MockDatabaseState {
  users: MockUserRecord[]
  sessions: Record<string, Session> // token -> Session
  wallets: Wallet[]
  nfts: Nft[]
  favorites: Record<string, string[]> // userId -> nftId[]
  carts: Record<string, { items: { nftId: string; editionId: string; quantity: number }[]; couponCode: string | null }> // userId ou 'guest'
  orders: Order[]
  coupons: typeof INITIAL_COUPONS
  scenario: MockScenario
}

const STORAGE_KEY = 'nft_marketplace_mock_db_v1'

function createSeedState(): MockDatabaseState {
  return {
    users: structuredClone(INITIAL_USERS),
    sessions: {},
    wallets: structuredClone(INITIAL_WALLETS),
    nfts: structuredClone(INITIAL_NFTS),
    favorites: {
      'user-1': ['nft-01'],
      'user-2': ['nft-03'],
    },
    carts: {
      guest: { items: [], couponCode: null },
    },
    orders: [],
    coupons: structuredClone(INITIAL_COUPONS),
    scenario: 'default',
  }
}

class MockDatabase {
  private state: MockDatabaseState

  constructor() {
    this.state = this.load()
  }

  private load(): MockDatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw) as MockDatabaseState
      }
    } catch {
      // ignora erro de leitura e recria seed
    }
    const seed = createSeedState()
    this.save(seed)
    return seed
  }

  private save(nextState: MockDatabaseState) {
    this.state = nextState
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // ignora erro de quota
    }
  }

  getState(): MockDatabaseState {
    return this.state
  }

  update(mutator: (draft: MockDatabaseState) => void) {
    const draft = structuredClone(this.state)
    mutator(draft)
    this.save(draft)
  }

  reset() {
    const seed = createSeedState()
    this.save(seed)
    return seed
  }

  setScenario(scenario: MockScenario) {
    this.update((draft) => {
      draft.scenario = scenario
    })
  }

  // Helper para calcular cotação precisa em ETH (usando inteiros em Wei/10^4 para evitar erro de ponto flutuante)
  computeCartQuote(ownerKey: string): Cart {
    const rawCart = this.state.carts[ownerKey] ?? { items: [], couponCode: null }
    let subtotalScaled = 0
    const detailedItems: Cart['items'] = []

    for (const item of rawCart.items) {
      const nft = this.state.nfts.find((n) => n.id === item.nftId)
      const edition = nft?.editions.find((e) => e.id === item.editionId)
      if (!nft || !edition) continue

      const unitScaled = Math.round(parseFloat(edition.priceEth) * 10000)
      subtotalScaled += unitScaled * item.quantity

      detailedItems.push({
        nftId: nft.id,
        editionId: edition.id,
        quantity: item.quantity,
        unitPriceEth: edition.priceEth,
        title: nft.title,
        editionName: edition.name,
        imageUrl: nft.imageUrl,
        available: edition.available,
      })
    }

    let discountScaled = 0
    if (rawCart.couponCode && this.state.coupons[rawCart.couponCode]?.status === 'valid') {
      const pct = this.state.coupons[rawCart.couponCode].discountPercent
      discountScaled = Math.round((subtotalScaled * pct) / 100)
    }

    const networkFeeScaled = detailedItems.length > 0 ? 150 : 0 // 0.0150 ETH de taxa fixa simulada
    const totalScaled = Math.max(0, subtotalScaled - discountScaled + networkFeeScaled)

    const formatEth = (scaled: number) => (scaled / 10000).toFixed(4)

    // Gera uma assinatura simples do estado atual dos preços/estoques para detectar mudanças no checkout
    const quoteSignature = detailedItems
      .map((i) => `${i.nftId}:${i.editionId}:${i.quantity}:${i.unitPriceEth}:${i.available}`)
      .join('|')

    return {
      items: detailedItems,
      couponCode: rawCart.couponCode,
      subtotalEth: formatEth(subtotalScaled),
      discountEth: formatEth(discountScaled),
      networkFeeEth: formatEth(networkFeeScaled),
      totalEth: formatEth(totalScaled),
      quoteHash: `${quoteSignature}#${rawCart.couponCode ?? 'none'}`,
    }
  }
}

export const db = new MockDatabase()