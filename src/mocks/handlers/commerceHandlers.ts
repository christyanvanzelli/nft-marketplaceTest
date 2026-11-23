// src/mocks/handlers/commerceHandlers.ts
import { delay, http, HttpResponse } from 'msw'
import { db } from '../db'
import { applyNetworkScenario, getAuthSession, requireAuth } from './helpers'
import type { NetworkType, Order } from '@/types'

// Descobre se o carrinho pertence ao usuário logado ou a um visitante ('guest')
function resolveCartOwner(request: Request): string {
  const { session } = getAuthSession(request as never)
  return session ? session.user.id : 'guest'
}

export const commerceHandlers = [
  // GET /api/cart - Busca o carrinho atual com preços e taxas calculados
  http.get('/api/cart', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const owner = resolveCartOwner(request)
    return HttpResponse.json(db.computeCartQuote(owner))
  }),

  // POST /api/cart/items - Adiciona ou atualiza quantidade de um NFT no carrinho
  http.post('/api/cart/items', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const body = (await request.json()) as {
      nftId: string
      editionId: string
      quantity: number
    }

    const nft = db.getState().nfts.find((n) => n.id === body.nftId)
    const edition = nft?.editions.find((e) => e.id === body.editionId)

    if (!nft || !edition) {
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'Edição não encontrada.' }, { status: 404 })
    }

    if (edition.available <= 0) {
      return HttpResponse.json({ code: 'OUT_OF_STOCK', message: 'Esta edição está esgotada.' }, { status: 409 })
    }

    if (body.quantity > edition.available) {
      return HttpResponse.json(
        { code: 'EXCEEDS_STOCK', message: `Apenas ${edition.available} unidade(s) disponível(is).` },
        { status: 409 },
      )
    }

    const owner = resolveCartOwner(request)
    db.update((draft) => {
      const cart = draft.carts[owner] ?? { items: [], couponCode: null }
      const existing = cart.items.find(
        (i) => i.nftId === body.nftId && i.editionId === body.editionId,
      )

      if (body.quantity <= 0) {
        cart.items = cart.items.filter(
          (i) => !(i.nftId === body.nftId && i.editionId === body.editionId),
        )
      } else if (existing) {
        existing.quantity = body.quantity
      } else {
        cart.items.push({
          nftId: body.nftId,
          editionId: body.editionId,
          quantity: body.quantity,
        })
      }
      draft.carts[owner] = cart
    })

    return HttpResponse.json(db.computeCartQuote(owner))
  }),

  // DELETE /api/cart/items/:nftId/:editionId - Remove um item do carrinho
  http.delete('/api/cart/items/:nftId/:editionId', async ({ request, params }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const owner = resolveCartOwner(request)
    db.update((draft) => {
      const cart = draft.carts[owner]
      if (!cart) return
      cart.items = cart.items.filter(
        (i) => !(i.nftId === String(params.nftId) && i.editionId === String(params.editionId)),
      )
    })

    return HttpResponse.json(db.computeCartQuote(owner))
  }),

  // POST /api/cart/coupon - Aplica ou remove cupom de desconto
  http.post('/api/cart/coupon', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const body = (await request.json()) as { code: string | null }
    const owner = resolveCartOwner(request)

    if (!body.code) {
      db.update((draft) => {
        const cart = draft.carts[owner] ?? { items: [], couponCode: null }
        cart.couponCode = null
        draft.carts[owner] = cart
      })
      return HttpResponse.json(db.computeCartQuote(owner))
    }

    const normalizedCode = body.code.trim().toUpperCase()
    const coupon = db.getState().coupons[normalizedCode]

    if (!coupon) {
      return HttpResponse.json({ code: 'INVALID_COUPON', message: 'Cupom inválido.' }, { status: 422 })
    }

    if (coupon.status === 'expired') {
      return HttpResponse.json({ code: 'EXPIRED_COUPON', message: 'Este cupom expirou.' }, { status: 422 })
    }

    db.update((draft) => {
      const cart = draft.carts[owner] ?? { items: [], couponCode: null }
      cart.couponCode = normalizedCode
      draft.carts[owner] = cart
    })

    return HttpResponse.json(db.computeCartQuote(owner))
  }),

  // POST /api/orders - Cria o pedido com chave de idempotência (evita compra duplicada)
  http.post('/api/orders', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      return HttpResponse.json(
        { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Chave de idempotência obrigatória.' },
        { status: 400 },
      )
    }

    const body = (await request.json()) as {
      walletId: string
      network: NetworkType
      expectedQuoteHash: string
    }

    // 1. Verifica se essa mesma tentativa já foi processada antes (evita duplicidade)
    const existingOrder = db
      .getState()
      .orders.find((o) => o.idempotencyKey === idempotencyKey && o.userId === session.user.id)

    if (existingOrder) {
      if (existingOrder.walletId !== body.walletId || existingOrder.network !== body.network) {
        return HttpResponse.json(
          { code: 'IDEMPOTENCY_CONFLICT', message: 'Chave reutilizada com dados diferentes.' },
          { status: 409 },
        )
      }
      return HttpResponse.json(existingOrder)
    }

    const wallet = db
      .getState()
      .wallets.find((w) => w.id === body.walletId && w.userId === session.user.id)
    if (!wallet) {
      return HttpResponse.json({ code: 'INVALID_WALLET', message: 'Carteira inválida.' }, { status: 422 })
    }

    // 2. Revalida preços e estoque antes de fechar
    const currentQuote = db.computeCartQuote(session.user.id)
    if (currentQuote.items.length === 0) {
      return HttpResponse.json({ code: 'EMPTY_CART', message: 'Seu carrinho está vazio.' }, { status: 422 })
    }

    if (
      db.getState().scenario === 'price_changed_checkout' ||
      currentQuote.quoteHash !== body.expectedQuoteHash
    ) {
      return HttpResponse.json(
        {
          code: 'QUOTE_CHANGED',
          message: 'Os preços ou a disponibilidade mudaram. Revise o resumo antes de confirmar.',
          updatedCart: currentQuote,
        },
        { status: 409 },
      )
    }

    for (const item of currentQuote.items) {
      if (item.quantity > item.available) {
        return HttpResponse.json(
          { code: 'OUT_OF_STOCK', message: `Estoque insuficiente para ${item.title}.` },
          { status: 409 },
        )
      }
    }

    const scenario = db.getState().scenario
    const isRejected = scenario === 'payment_rejected'
    const isTimeout = scenario === 'order_timeout'

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      idempotencyKey,
      userId: session.user.id,
      walletId: wallet.id,
      walletAddress: wallet.address,
      network: body.network,
      status: isTimeout ? 'pending' : isRejected ? 'rejected' : 'confirmed',
      txHash: !isRejected && !isTimeout ? `0x${crypto.randomUUID().replace(/-/g, '')}` : undefined,
      failureReason: isRejected ? 'Transação recusada pela carteira/rede simulada.' : undefined,
      items: currentQuote.items.map((i) => ({
        nftId: i.nftId,
        editionId: i.editionId,
        title: i.title,
        editionName: i.editionName,
        imageUrl: i.imageUrl,
        quantity: i.quantity,
        unitPriceEth: i.unitPriceEth,
      })),
      subtotalEth: currentQuote.subtotalEth,
      discountEth: currentQuote.discountEth,
      networkFeeEth: currentQuote.networkFeeEth,
      totalEth: currentQuote.totalEth,
      createdAt: new Date().toISOString(),
      version: 1,
    }

    db.update((draft) => {
      draft.orders.unshift(newOrder)

      // Se confirmado, desconta estoque e limpa os itens comprados do carrinho
      if (newOrder.status === 'confirmed') {
        for (const item of newOrder.items) {
          const nft = draft.nfts.find((n) => n.id === item.nftId)
          const ed = nft?.editions.find((e) => e.id === item.editionId)
          if (ed) {
            ed.available = Math.max(0, ed.available - item.quantity)
          }
        }
        draft.carts[session.user.id] = { items: [], couponCode: null }
      }
    })

    // Simula timeout de resposta mesmo com o pedido já criado no servidor
    if (isTimeout) {
      await delay(3000)
      return HttpResponse.json(
        { code: 'GATEWAY_TIMEOUT', message: 'Tempo limite esgotado ao aguardar confirmação.' },
        { status: 504 },
      )
    }

    return HttpResponse.json(newOrder, { status: 201 })
  }),

  // GET /api/orders/:id - Consulta o recibo de um pedido
  http.get('/api/orders/:id', async ({ request, params }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const order = db
      .getState()
      .orders.find((o) => o.id === String(params.id) && o.userId === session.user.id)

    if (!order) {
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'Pedido não encontrado.' }, { status: 404 })
    }

    return HttpResponse.json(order)
  }),
]