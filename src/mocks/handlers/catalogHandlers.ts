// src/mocks/handlers/catalogHandlers.ts
import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { applyNetworkScenario, requireAuth } from './helpers'

export const catalogHandlers = [
  // GET /api/nfts
  http.get('/api/nfts', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const category = url.searchParams.get('category') ?? ''
    const collection = url.searchParams.get('collection') ?? ''
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const inStockOnly = url.searchParams.get('inStockOnly') === 'true'
    const sort = url.searchParams.get('sort') ?? 'recent'
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? 6))

    let items = [...db.getState().nfts]

    if (q) {
      items = items.filter(
        (nft) =>
          nft.title.toLowerCase().includes(q) ||
          nft.creator.toLowerCase().includes(q) ||
          nft.collection.toLowerCase().includes(q),
      )
    }

    if (category && category !== 'all') {
      items = items.filter((nft) => nft.category.toLowerCase() === category.toLowerCase())
    }

    if (collection && collection !== 'all') {
      items = items.filter((nft) => nft.collection.toLowerCase() === collection.toLowerCase())
    }

    if (minPrice && !Number.isNaN(parseFloat(minPrice))) {
      const min = parseFloat(minPrice)
      items = items.filter((nft) => parseFloat(nft.priceEth) >= min)
    }

    if (maxPrice && !Number.isNaN(parseFloat(maxPrice))) {
      const max = parseFloat(maxPrice)
      items = items.filter((nft) => parseFloat(nft.priceEth) <= max)
    }

    if (inStockOnly) {
      items = items.filter((nft) => nft.editions.some((e) => e.available > 0))
    }

    // Ordenação
    items.sort((a, b) => {
      if (sort === 'price_asc') return parseFloat(a.priceEth) - parseFloat(b.priceEth)
      if (sort === 'price_desc') return parseFloat(b.priceEth) - parseFloat(a.priceEth)
      if (sort === 'popular') return Number(b.featured) - Number(a.featured)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const paginated = items.slice(start, start + pageSize)

    return HttpResponse.json({
      data: paginated,
      meta: {
        total,
        page: safePage,
        pageSize,
        totalPages,
      },
    })
  }),

  // GET /api/nfts/:id
  http.get('/api/nfts/:id', async ({ request, params }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const nft = db.getState().nfts.find((n) => n.id === String(params.id))
    if (!nft) {
      return HttpResponse.json(
        { code: 'NFT_NOT_FOUND', message: 'NFT não encontrado no catálogo.' },
        { status: 404 },
      )
    }

    return HttpResponse.json(nft)
  }),

  // GET /api/favorites
  http.get('/api/favorites', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const favoriteIds = db.getState().favorites[session.user.id] ?? []
    return HttpResponse.json(favoriteIds)
  }),

  // POST /api/favorites/:nftId
  http.post('/api/favorites/:nftId', async ({ request, params }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const nftId = String(params.nftId)
    const nftExists = db.getState().nfts.some((n) => n.id === nftId)
    if (!nftExists) {
      return HttpResponse.json({ code: 'NFT_NOT_FOUND', message: 'NFT inexistente.' }, { status: 404 })
    }

    let updated: string[] = []
    db.update((draft) => {
      const current = draft.favorites[session.user.id] ?? []
      if (!current.includes(nftId)) {
        current.push(nftId)
      }
      draft.favorites[session.user.id] = current
      updated = [...current]
    })

    return HttpResponse.json(updated)
  }),

  // DELETE /api/favorites/:nftId
  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const nftId = String(params.nftId)
    let updated: string[] = []
    db.update((draft) => {
      const current = draft.favorites[session.user.id] ?? []
      draft.favorites[session.user.id] = current.filter((id) => id !== nftId)
      updated = [...draft.favorites[session.user.id]]
    })

    return HttpResponse.json(updated)
  }),
]