// src/types/index.ts

export type NetworkType = 'ethereum' | 'polygon' | 'arbitrum' | 'base'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string
  createdAt: string
}

export interface Session {
  token: string
  user: User
  expiresAt: number
}

export interface Wallet {
  id: string
  userId: string // Identificador do colecionador dono da carteira
  label: string
  address: string
  network: NetworkType
  isDefault?: boolean
}

export interface NftEdition {
  id: string
  name: string // ex: "Standard", "Gold", "1 of 1"
  priceEth: string // sempre string decimal para manter precisão
  available: number
  total: number

}

export interface Nft {
  id: string
  title: string
  description: string
  creator: string
  collection: string
  category: 'Art' | 'Gaming' | 'Photography' | 'Music' | 'Collectibles'
  imageUrl: string
  gallery: string[]
  priceEth: string // menor preço ou preço base em string decimal
  editions: NftEdition[]
  featured: boolean
  createdAt: string 
  version: number // controle de versão para Socket.IO
  attributes?: { trait_type: string; value: string }[] // Atributos opcionais de raridade da peça
}

export interface CartItem {
  nftId: string
  editionId: string
  quantity: number
  unitPriceEth: string
  title: string
  editionName: string
  imageUrl: string
  available: number
}

export interface Cart {
  items: CartItem[]
  couponCode: string | null
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  quoteHash: string // detecta se preço/estoque mudou antes de fechar o pedido
}

export type OrderStatus = 'pending' | 'confirming' | 'confirmed' | 'failed' | 'rejected'

export interface OrderItemSnapshot {
  nftId: string
  editionId: string
  title: string
  editionName: string
  imageUrl: string
  quantity: number
  unitPriceEth: string
}

export interface Order {
  id: string
  idempotencyKey: string
  userId: string
  walletId: string
  walletAddress: string
  network: NetworkType
  status: OrderStatus
  txHash?: string
  failureReason?: string
  items: OrderItemSnapshot[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  createdAt: string
  version: number
}

// Eventos Socket.IO
export interface NftUpdatedEvent {
  eventId: string
  nftId: string
  editionId?: string
  priceEth: string
  available: number
  version: number
  timestamp: number
}

export interface OrderUpdatedEvent {
  eventId: string
  orderId: string
  userId: string
  status: OrderStatus
  txHash?: string
  failureReason?: string
  version: number
  timestamp: number
}

// Parâmetros de busca do catálogo (espelhados na URL)
export interface CatalogFilters {
  q?: string
  category?: string
  collection?: string
  minPrice?: string
  maxPrice?: string
  inStockOnly?: boolean
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'popular'
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}