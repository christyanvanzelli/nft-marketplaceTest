// src/lib/socket.ts
import { io, type Socket } from 'socket.io-client'
import { queryClient } from './queryClient'
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, PaginatedResponse } from '@/types'

class RealtimeClient {
  private socket: Socket | null = null
  private processedEventIds = new Set<string>()
  private nftVersions = new Map<string, number>()
  private orderVersions = new Map<string, number>()

  connect() {
    if (this.socket?.connected) return

    this.socket = io(window.location.origin, {
      path: '/socket.io/',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })

    this.socket.on('nft.updated', (event: NftUpdatedEvent) => {
      this.handleNftUpdated(event)
    })

    this.socket.on('order.updated', (event: OrderUpdatedEvent) => {
      this.handleOrderUpdated(event)
    })

    // Ao reconectar após queda, revalida catálogo, carrinho e pedido ativo
    this.socket.on('connect', () => {
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
    })
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  private handleNftUpdated(event: NftUpdatedEvent) {
    // 1. Ignora evento duplicado
    if (this.processedEventIds.has(event.eventId)) return
    this.processedEventIds.add(event.eventId)

    // 2. Ignora evento fora de ordem (versão menor ou igual à já aplicada)
    const lastVersion = this.nftVersions.get(event.nftId) ?? 0
    if (event.version <= lastVersion) return
    this.nftVersions.set(event.nftId, event.version)

    // 3. Atualiza detalhe do NFT no cache do TanStack Query sem piscar a tela
    queryClient.setQueryData<Nft>(['nft', event.nftId], (old) => {
      if (!old || event.version <= old.version) return old
      const updatedEditions = old.editions.map((ed, idx) => {
        if (event.editionId ? ed.id === event.editionId : idx === 0) {
          return { ...ed, priceEth: event.priceEth, available: event.available }
        }
        return ed
      })
      const minPrice = Math.min(...updatedEditions.map((e) => parseFloat(e.priceEth))).toFixed(4)
      return {
        ...old,
        priceEth: minPrice,
        editions: updatedEditions,
        version: event.version,
      }
    })

    // 4. Atualiza listas paginadas do catálogo no cache
    queryClient.setQueriesData<PaginatedResponse<Nft>>({ queryKey: ['nfts'] }, (old) => {
      if (!old) return old
      return {
        ...old,
        data: old.data.map((nft) => {
          if (nft.id !== event.nftId || event.version <= nft.version) return nft
          const updatedEditions = nft.editions.map((ed, idx) => {
            if (event.editionId ? ed.id === event.editionId : idx === 0) {
              return { ...ed, priceEth: event.priceEth, available: event.available }
            }
            return ed
          })
          const minPrice = Math.min(...updatedEditions.map((e) => parseFloat(e.priceEth))).toFixed(4)
          return {
            ...nft,
            priceEth: minPrice,
            editions: updatedEditions,
            version: event.version,
          }
        }),
      }
    })

    // 5. Revalida carrinho caso o item atualizado esteja nele
    queryClient.invalidateQueries({ queryKey: ['cart'] })
  }

  private handleOrderUpdated(event: OrderUpdatedEvent) {
    if (this.processedEventIds.has(event.eventId)) return
    this.processedEventIds.add(event.eventId)

    const lastVersion = this.orderVersions.get(event.orderId) ?? 0
    if (event.version <= lastVersion) return
    this.orderVersions.set(event.orderId, event.version)

    queryClient.setQueryData<Order>(['order', event.orderId], (old) => {
      if (!old || event.version <= old.version) return old
      return {
        ...old,
        status: event.status,
        txHash: event.txHash ?? old.txHash,
        failureReason: event.failureReason,
        version: event.version,
      }
    })

    if (event.status === 'confirmed') {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
    }
  }
}

export const realtime = new RealtimeClient()