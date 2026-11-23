// src/features/catalog/useFavorites.ts
import { useMutation, useQuery } from '@tanstack/react-query' // Hooks de busca e mutação do TanStack Query
import { toast } from 'sonner' // Notificações visuais
import { api } from '@/api/client' // Cliente HTTP Axios
import { queryClient } from '@/lib/queryClient' // Cache global do React Query
import { useAuth } from '@/features/auth/AuthContext' // Verifica se o usuário está autenticado

export function useFavorites() {
  // Descobre se há um usuário logado no momento
  const { isAuthenticated } = useAuth()

  // Busca a lista de IDs de NFTs favoritados apenas quando o usuário estiver logado
  const favoritesQuery = useQuery<string[]>({
    queryKey: ['favorites'], // Chave no cache
    queryFn: async () => {
      const { data } = await api.get<string[]>('/favorites')
      return data
    },
    enabled: isAuthenticated, // Não faz chamada à API se for visitante
  })

  // Mutação para favoritar ou desfavoritar com atualização otimista
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ nftId, isFavorite }: { nftId: string; isFavorite: boolean }) => {
      // Se já era favorito, chama DELETE; senão, chama POST
      if (isFavorite) {
        const { data } = await api.delete<string[]>(`/favorites/${nftId}`)
        return data
      } else {
        const { data } = await api.post<string[]>(`/favorites/${nftId}`)
        return data
      }
    },
    // Executa ANTES da resposta da API chegar para a interface responder na hora
    onMutate: async ({ nftId, isFavorite }) => {
      // Cancela buscas em andamento para não sobrescrever nossa mudança otimista
      await queryClient.cancelQueries({ queryKey: ['favorites'] })

      // Guarda uma cópia do estado anterior caso precise desfazer (rollback)
      const previousFavorites = queryClient.getQueryData<string[]>(['favorites']) ?? []

      // Atualiza o cache imediatamente na tela
      queryClient.setQueryData<string[]>(['favorites'], (old = []) =>
        isFavorite ? old.filter((id) => id !== nftId) : [...old, nftId],
      )

      return { previousFavorites }
    },
    // Se a API retornar erro (ex: falha de rede simulada), desfaz a mudança na tela
    onError: (_err, _variables, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites)
      }
      toast.error('Não foi possível atualizar seus favoritos. Tente novamente.')
    },
    // Sincroniza com o estado oficial devolvido pela API
    onSuccess: (updatedIds) => {
      queryClient.setQueryData(['favorites'], updatedIds)
    },
  })

  const favoriteIds = favoritesQuery.data ?? []

  // Helper prático para verificar se um NFT específico está favoritado
  function isFavorite(nftId: string): boolean {
    return favoriteIds.includes(nftId)
  }

  return {
    favoriteIds, // Array de IDs favoritados
    isLoading: favoritesQuery.isLoading, // Carregamento inicial
    isFavorite, // Função booleana isFavorite(id)
    toggleFavorite: toggleFavoriteMutation.mutate, // Dispara favoritar/desfavoritar
  }
}