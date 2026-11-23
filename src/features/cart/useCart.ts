// src/features/cart/useCart.ts
import { useMutation, useQuery } from '@tanstack/react-query' // Hooks do TanStack Query para buscar e alterar dados na API
import axios from 'axios' // Usado para extrair mensagens de erro vindas do backend simulado
import { toast } from 'sonner' // Notificações visuais para o usuário
import { api } from '@/api/client' // Nosso cliente Axios configurado
import { queryClient } from '@/lib/queryClient' // Instância global do cache do React Query
import type { Cart } from '@/types' // Tipagem do carrinho

// Hook centralizado para consultar e manipular o carrinho em qualquer lugar do app
export function useCart() {
  // Busca os dados atuais do carrinho (itens, subtotal, desconto, taxa e total)
  const cartQuery = useQuery<Cart>({
    queryKey: ['cart'], // Chave única no cache do TanStack Query
    queryFn: async () => {
      const { data } = await api.get<Cart>('/cart')
      return data
    },
  })

  // Mutação para adicionar um NFT ou alterar sua quantidade no carrinho
  const updateItemMutation = useMutation({
    mutationFn: async (payload: { nftId: string; editionId: string; quantity: number }) => {
      const { data } = await api.post<Cart>('/cart/items', payload)
      return data
    },
    // Atualiza o cache imediatamente com o carrinho devolvido pela API
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart)
    },
    // Exibe aviso amigável se tentar comprar mais do que o estoque disponível
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message ?? 'Não foi possível atualizar o carrinho.')
      }
    },
  })

  // Mutação para remover um item específico do carrinho
  const removeItemMutation = useMutation({
    mutationFn: async ({ nftId, editionId }: { nftId: string; editionId: string }) => {
      const { data } = await api.delete<Cart>(`/cart/items/${nftId}/${editionId}`)
      return data
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart)
      toast.info('Item removido do carrinho.')
    },
  })

  // Mutação para aplicar ou remover um cupom de desconto
  const applyCouponMutation = useMutation({
    mutationFn: async (code: string | null) => {
      const { data } = await api.post<Cart>('/cart/coupon', { code })
      return data
    },
    onSuccess: (updatedCart, code) => {
      queryClient.setQueryData(['cart'], updatedCart)
      if (code) {
        toast.success(`Cupom ${code.toUpperCase()} aplicado!`)
      } else {
        toast.info('Cupom removido.')
      }
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message ?? 'Cupom inválido ou expirado.')
      }
    },
  })

  // Soma a quantidade total de unidades no carrinho com fallback seguro caso items venha vazio
  const totalItemsCount =
    (cartQuery.data?.items ?? []).reduce((acc, item) => acc + item.quantity, 0)

  return {
    cart: cartQuery.data, // Dados completos do carrinho
    isLoading: cartQuery.isLoading, // Carregamento inicial
    totalItemsCount, // Quantidade total de peças
    updateItem: updateItemMutation.mutateAsync, // Função para adicionar/alterar quantidade
    isUpdatingItem: updateItemMutation.isPending, // Estado de carregamento da adição
    removeItem: removeItemMutation.mutateAsync, // Função para remover item
    applyCoupon: applyCouponMutation.mutateAsync, // Função para aplicar/remover cupom
    isApplyingCoupon: applyCouponMutation.isPending, // Estado de carregamento do cupom
  }
}