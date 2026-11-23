// src/mocks/handlers/helpers.ts
import { delay, HttpResponse, type StrictRequest } from 'msw'
import { db } from '../db'
import type { Session } from '@/types'

export async function applyNetworkScenario(request: StrictRequest<any>) {
  const scenario = db.getState().scenario
  const url = new URL(request.url)

  // Permite sempre endpoints de controle de mock
  if (url.pathname.startsWith('/api/__mock')) {
    return null
  }

  if (scenario === 'slow_network') {
    await delay(1500)
  } else if (scenario === 'out_of_order') {
    // Respostas com tempo aleatório para testar descarte de requisições obsoletas
    await delay(Math.floor(Math.random() * 1200) + 100)
  } else {
    // Latência realista padrão
    await delay(180)
  }

  if (scenario === 'network_error') {
    return HttpResponse.error()
  }

  if (scenario === 'server_error') {
    return HttpResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Falha transitória no servidor simulado.' },
      { status: 500 },
    )
  }

  return null
}

export function getAuthSession(request: StrictRequest<any>): {
  session: Session | null
  expired: boolean
} {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { session: null, expired: false }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  const session = db.getState().sessions[token]

  if (!session) {
    return { session: null, expired: false }
  }

  if (Date.now() > session.expiresAt) {
    db.update((draft) => {
      delete draft.sessions[token]
    })
    return { session: null, expired: true }
  }

  return { session, expired: false }
}

export function requireAuth(request: StrictRequest<any>) {
  const { session, expired } = getAuthSession(request)
  if (expired) {
    return {
      errorResponse: HttpResponse.json(
        { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Faça login novamente.' },
        { status: 401 },
      ),
      session: null,
    }
  }
  if (!session) {
    return {
      errorResponse: HttpResponse.json(
        { code: 'UNAUTHORIZED', message: 'Autenticação obrigatória.' },
        { status: 401 },
      ),
      session: null,
    }
  }
  return { errorResponse: null, session }
}