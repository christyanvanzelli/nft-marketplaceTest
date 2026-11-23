// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 segundos antes de considerar os dados desatualizados
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Não insiste se o erro for de autenticação, não encontrado ou validação
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          if (status && [400, 401, 403, 404, 409, 422].includes(status)) {
            return false
          }
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})