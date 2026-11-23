// src/features/auth/AuthContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { api, getStoredToken, SESSION_EXPIRED_EVENT, setStoredToken } from '@/api/client'
import { queryClient } from '@/lib/queryClient'
import type { Session, User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshUser = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const { data } = await api.get<Session>('/auth/me')
      setUser(data.user)
    } catch {
      setStoredToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Escuta expiração automática da sessão vinda do interceptor do Axios
  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      queryClient.clear()
      toast.error('Sua sessão expirou. Faça login novamente.')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<Session>('/auth/login', { email, password })
    setStoredToken(data.token)
    setUser(data.user)
    // Atualiza carrinho (mesclado), favoritos e carteiras do usuário logado
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cart'] }),
      queryClient.invalidateQueries({ queryKey: ['favorites'] }),
      queryClient.invalidateQueries({ queryKey: ['wallets'] }),
    ])
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await api.post<Session>('/auth/register', { name, email, password })
    setStoredToken(data.token)
    setUser(data.user)
    await queryClient.invalidateQueries({ queryKey: ['cart'] })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setStoredToken(null)
      setUser(null)
      // Limpa dados privados do usuário anterior para evitar vazamento entre contas
      queryClient.removeQueries({ queryKey: ['favorites'] })
      queryClient.removeQueries({ queryKey: ['wallets'] })
      queryClient.removeQueries({ queryKey: ['order'] })
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider')
  }
  return ctx
}