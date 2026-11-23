// src/mocks/handlers/authHandlers.ts
import { http, HttpResponse } from 'msw' // Primitivas do MSW para interceptar requisições HTTP e montar respostas
import { db } from '../db' // Banco de dados simulado persistido no localStorage
import { applyNetworkScenario, requireAuth } from './helpers' // Helpers de cenário de rede e validação de sessão
import type { Session, User, Wallet } from '@/types' // Tipagens públicas da aplicação
import type { MockUserRecord } from '../fixtures/initialData' // Tipagem interna do usuário no banco simulado (com passwordHash)


// Remove o campo sensível passwordHash antes de devolver o usuário para o frontend
// Remove apenas o passwordHash e mantém todos os demais campos exigidos pela interface User (incluindo createdAt)
function toPublicUser(record: MockUserRecord): User {
  const { passwordHash: _passwordHash, ...publicUser } = record
  return publicUser
}

// Transfere eventuais itens do carrinho de visitante ('guest') para o usuário recém-autenticado
function mergeGuestCartIntoUser(userId: string) {
  db.update((draft) => {
    const guestCart = draft.carts.guest
    if (!guestCart || guestCart.items.length === 0) return

    const userCart = draft.carts[userId] ?? { items: [], couponCode: null }
    for (const guestItem of guestCart.items) {
      const existing = userCart.items.find(
        (i) => i.nftId === guestItem.nftId && i.editionId === guestItem.editionId,
      )
      if (existing) {
        existing.quantity += guestItem.quantity
      } else {
        userCart.items.push({ ...guestItem })
      }
    }

    // Preserva o cupom do visitante caso o usuário ainda não tenha aplicado um
    if (!userCart.couponCode && guestCart.couponCode) {
      userCart.couponCode = guestCart.couponCode
    }

    draft.carts[userId] = userCart
    draft.carts.guest = { items: [], couponCode: null }
  })
}

export const authHandlers = [
  // POST /api/auth/login - Autentica usuário demo ou cadastrado e cria sessão
  http.post('/api/auth/login', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const body = (await request.json()) as { email: string; password: string }
    const normalizedEmail = body.email?.trim().toLowerCase() ?? ''

    // Procura o usuário pelo e-mail no banco simulado
    const userRecord = db
      .getState()
      .users.find((u) => u.email.toLowerCase() === normalizedEmail)

    // Valida existência e senha
    if (!userRecord || userRecord.passwordHash !== body.password) {
      return HttpResponse.json(
        { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' },
        { status: 401 },
      )
    }

    // Gera token de sessão com validade de 4 horas
    const token = `tok_${crypto.randomUUID()}`
    const session: Session = {
      token,
      user: toPublicUser(userRecord),
      expiresAt: Date.now() + 1000 * 60 * 60 * 4,
    }

    db.update((draft) => {
      draft.sessions[token] = session
    })

    // Mescla o carrinho de visitante com o carrinho da conta logada
    mergeGuestCartIntoUser(userRecord.id)

    return HttpResponse.json(session)
  }),

  // POST /api/auth/register - Cria uma nova conta de colecionador
  http.post('/api/auth/register', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const body = (await request.json()) as { name: string; email: string; password: string }
    const normalizedEmail = body.email?.trim().toLowerCase() ?? ''

    if (!body.name || body.name.trim().length < 2) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'O nome deve ter pelo menos 2 caracteres.' },
        { status: 422 },
      )
    }

    // Impede cadastro duplicado com o mesmo e-mail
    const emailExists = db
      .getState()
      .users.some((u) => u.email.toLowerCase() === normalizedEmail)

    if (emailExists) {
      return HttpResponse.json(
        { code: 'EMAIL_CONFLICT', message: 'Este e-mail já está cadastrado.' },
        { status: 409 },
      )
    }

    // Cria o registro completo compatível com MockUserRecord
    const newUserId = `user-${Date.now()}`
    const newRecord: MockUserRecord = {
      id: newUserId,
      name: body.name.trim(),
      email: normalizedEmail,
      avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(body.name.trim())}`,
      passwordHash: body.password,
      createdAt: new Date().toISOString(),
    }

    const token = `tok_${crypto.randomUUID()}`
    const session: Session = {
      token,
      user: toPublicUser(newRecord),
      expiresAt: Date.now() + 1000 * 60 * 60 * 4,
    }

    // Salva usuário, sessão, lista de favoritos e carrinho inicial
    db.update((draft) => {
      draft.users.push(newRecord)
      draft.sessions[token] = session
      draft.favorites[newUserId] = []
      draft.carts[newUserId] = { items: [], couponCode: null }
    })

    mergeGuestCartIntoUser(newUserId)

    return HttpResponse.json(session, { status: 201 })
  }),

  // GET /api/auth/session - Recupera a sessão ativa após refresh (F5)
  http.get('/api/auth/session', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    return HttpResponse.json(session)
  }),
  // GET /api/auth/me - Recupera a sessão ativa após refresh (F5)
  http.get('/api/auth/me', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    return HttpResponse.json(session)
  }),

  // POST /api/auth/logout - Encerra e invalida o token atual
  http.post('/api/auth/logout', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      db.update((draft) => {
        delete draft.sessions[token]
      })
    }
    return HttpResponse.json({ ok: true })
  }),

  // PATCH /api/profile - Atualiza nome e avatar do usuário logado
  http.patch('/api/profile', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const body = (await request.json()) as { name?: string; avatarUrl?: string }
    if (!body.name || body.name.trim().length < 2) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Informe um nome válido com pelo menos 2 caracteres.' },
        { status: 422 },
      )
    }

    let updatedUser: User = session.user
    db.update((draft) => {
      const record = draft.users.find((u) => u.id === session.user.id)
      if (!record) return
      record.name = body.name!.trim()
      if (body.avatarUrl && body.avatarUrl.trim()) {
        record.avatarUrl = body.avatarUrl.trim()
      }
      updatedUser = toPublicUser(record)
      if (draft.sessions[session.token]) {
        draft.sessions[session.token].user = updatedUser
      }
    })

    return HttpResponse.json(updatedUser)
  }),

  // PATCH /api/profile/password - Altera a senha do usuário logado
  http.patch('/api/profile/password', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const body = (await request.json()) as { currentPassword: string; newPassword: string }
    const record = db.getState().users.find((u) => u.id === session.user.id)

    if (!record || record.passwordHash !== body.currentPassword) {
      return HttpResponse.json(
        { code: 'INVALID_PASSWORD', message: 'A senha atual informada está incorreta.' },
        { status: 422 },
      )
    }

    if (!body.newPassword || body.newPassword.length < 6) {
      return HttpResponse.json(
        { code: 'WEAK_PASSWORD', message: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 422 },
      )
    }

    db.update((draft) => {
      const target = draft.users.find((u) => u.id === session.user.id)
      if (target) target.passwordHash = body.newPassword
    })

    return HttpResponse.json({ ok: true })
  }),

  // GET /api/wallets - Lista as carteiras vinculadas do usuário
  http.get('/api/wallets', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const userWallets = db.getState().wallets.filter((w) => w.userId === session.user.id)
    return HttpResponse.json(userWallets)
  }),

  // POST /api/wallets - Cadastra nova carteira
  http.post('/api/wallets', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const body = (await request.json()) as { label: string; address: string; network: string }
    if (!body.address?.startsWith('0x') || body.address.length < 10) {
      return HttpResponse.json(
        { code: 'INVALID_ADDRESS', message: 'Endereço Ethereum inválido (deve começar com 0x).' },
        { status: 422 },
      )
    }

    let updatedWallets: Wallet[] = []
    db.update((draft) => {
      const existing = draft.wallets.filter((w) => w.userId === session.user.id)
      const newWallet: Wallet = {
        id: `wal-${Date.now()}`,
        userId: session.user.id,
        label: body.label.trim(),
        address: body.address.trim(),
        network: body.network as Wallet['network'],
        isDefault: existing.length === 0, // A primeira carteira vira principal automaticamente
      }
      draft.wallets.push(newWallet)
      updatedWallets = draft.wallets.filter((w) => w.userId === session.user.id)
    })

    return HttpResponse.json(updatedWallets, { status: 201 })
  }),

  // PATCH /api/wallets/:id/default - Define uma carteira como principal
  http.patch('/api/wallets/:id/default', async ({ request, params }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const targetId = String(params.id)
    let updatedWallets: Wallet[] = []
    db.update((draft) => {
      for (const w of draft.wallets) {
        if (w.userId === session.user.id) {
          w.isDefault = w.id === targetId
        }
      }
      updatedWallets = draft.wallets.filter((w) => w.userId === session.user.id)
    })

    return HttpResponse.json(updatedWallets)
  }),

  // DELETE /api/wallets/:id - Remove uma carteira
  http.delete('/api/wallets/:id', async ({ request, params }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const targetId = String(params.id)
    let updatedWallets: Wallet[] = []
    db.update((draft) => {
      draft.wallets = draft.wallets.filter(
        (w) => !(w.userId === session.user.id && w.id === targetId),
      )
      updatedWallets = draft.wallets.filter((w) => w.userId === session.user.id)
      // Garante que sempre exista uma carteira principal se restar alguma
      if (updatedWallets.length > 0 && !updatedWallets.some((w) => w.isDefault)) {
        updatedWallets[0].isDefault = true
      }
    })

    return HttpResponse.json(updatedWallets)
  }),

  // GET /api/orders - Lista todos os pedidos do usuário logado
  http.get('/api/orders', async ({ request }) => {
    const netErr = await applyNetworkScenario(request)
    if (netErr) return netErr

    const { errorResponse, session } = requireAuth(request)
    if (errorResponse || !session) return errorResponse!

    const userOrders = db.getState().orders.filter((o) => o.userId === session.user.id)
    return HttpResponse.json(userOrders)
  }),
]