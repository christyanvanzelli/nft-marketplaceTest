// src/mocks/browser.ts
import { http, HttpResponse, ws } from 'msw'
import { setupWorker } from 'msw/browser'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { db, type MockScenario } from './db'
import { authHandlers } from './handlers/authHandlers'
import { commerceHandlers } from './handlers/commerceHandlers'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types'
import { catalogHandlers } from './handlers/catalogHandlers'


// Intercepta conexões WebSocket na rota padrão do Socket.IO (em dev e em produção)
const chat = ws.link(/\/socket\.io\//)

type SocketIoClient = ReturnType<typeof toSocketIo>['client']
const activeClients = new Set<SocketIoClient>()

const socketHandler = chat.addEventListener('connection', (connection) => {
  const io = toSocketIo(connection)
  activeClients.add(io.client)

  connection.client.addEventListener('close', () => {
    activeClients.delete(io.client)
  })
})

// Emite atualização de preço/estoque de NFT e salva no banco simulado
export function emitNftUpdated(payload: {
  nftId: string
  editionId?: string
  priceEth: string
  available: number
  version?: number
}) {
  let finalVersion = payload.version ?? 1

  db.update((draft) => {
    const nft = draft.nfts.find((n) => n.id === payload.nftId)
    if (!nft) return

    finalVersion = payload.version ?? nft.version + 1
    nft.version = finalVersion

    if (payload.editionId) {
      const ed = nft.editions.find((e) => e.id === payload.editionId)
      if (ed) {
        ed.priceEth = payload.priceEth
        ed.available = payload.available
      }
    } else if (nft.editions[0]) {
      nft.editions[0].priceEth = payload.priceEth
      nft.editions[0].available = payload.available
    }

    const minPrice = Math.min(...nft.editions.map((e) => parseFloat(e.priceEth)))
    nft.priceEth = minPrice.toFixed(4)
  })

  const event: NftUpdatedEvent = {
    eventId: `evt_${crypto.randomUUID()}`,
    nftId: payload.nftId,
    editionId: payload.editionId,
    priceEth: payload.priceEth,
    available: payload.available,
    version: finalVersion,
    timestamp: Date.now(),
  }

  for (const client of activeClients) {
    client.emit('nft.updated', event)
  }

  return event
}

// Emite atualização de status do pedido e salva no banco simulado
export function emitOrderUpdated(payload: {
  orderId: string
  status: 'confirmed' | 'rejected'
  failureReason?: string
  version?: number
}) {
  let eventToEmit: OrderUpdatedEvent | null = null

  db.update((draft) => {
    const order = draft.orders.find((o) => o.id === payload.orderId)
    if (!order) return

    const nextVersion = payload.version ?? order.version + 1
    order.version = nextVersion
    order.status = payload.status

    if (payload.status === 'confirmed') {
      order.txHash = order.txHash ?? `0x${crypto.randomUUID().replace(/-/g, '')}`
      for (const item of order.items) {
        const nft = draft.nfts.find((n) => n.id === item.nftId)
        const ed = nft?.editions.find((e) => e.id === item.editionId)
        if (ed) ed.available = Math.max(0, ed.available - item.quantity)
      }
      draft.carts[order.userId] = { items: [], couponCode: null }
    } else {
      order.failureReason = payload.failureReason ?? 'Pagamento recusado após processamento.'
    }

    eventToEmit = {
      eventId: `evt_${crypto.randomUUID()}`,
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      txHash: order.txHash,
      failureReason: order.failureReason,
      version: nextVersion,
      timestamp: Date.now(),
    }
  })

  if (eventToEmit) {
    for (const client of activeClients) {
      client.emit('order.updated', eventToEmit)
    }
  }

  return eventToEmit
}

// Endpoints de controle para testes E2E (Playwright) e painel de demonstração
const controlHandlers = [
  http.post('/api/__mock/reset', () => {
    const state = db.reset()
    return HttpResponse.json({ ok: true, scenario: state.scenario })
  }),

  http.post('/api/__mock/scenario', async ({ request }) => {
    const body = (await request.json()) as { scenario: MockScenario }
    db.setScenario(body.scenario)
    return HttpResponse.json({ ok: true, scenario: body.scenario })
  }),

  http.post('/api/__mock/emit/nft-updated', async ({ request }) => {
    const body = (await request.json()) as {
      nftId: string
      editionId?: string
      priceEth: string
      available: number
      version?: number
    }
    const event = emitNftUpdated(body)
    return HttpResponse.json(event)
  }),

  http.post('/api/__mock/emit/order-updated', async ({ request }) => {
    const body = (await request.json()) as {
      orderId: string
      status: 'confirmed' | 'rejected'
      failureReason?: string
      version?: number
    }
    const event = emitOrderUpdated(body)
    return HttpResponse.json(event)
  }),
]

export const worker = setupWorker(
  ...controlHandlers,
  ...authHandlers,
  ...catalogHandlers,
  ...commerceHandlers,
  socketHandler,
)