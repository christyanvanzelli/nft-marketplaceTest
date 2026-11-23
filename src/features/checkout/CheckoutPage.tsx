// src/features/checkout/CheckoutPage.tsx
import { useEffect, useState, type FormEvent } from 'react' // Hooks de estado, efeito e tipagem de formulário
import { Link, useNavigate } from '@tanstack/react-router' // Navegação entre rotas
import { useMutation, useQuery } from '@tanstack/react-query' // Busca carteiras e envia pedido de checkout
import axios from 'axios' // Identifica erros HTTP específicos (409 conflito de preço, etc.)
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Wallet as WalletIcon,
} from 'lucide-react' // Ícones da interface
import { toast } from 'sonner' // Notificações flutuantes
import { api } from '@/api/client' // Cliente Axios
import { queryClient } from '@/lib/queryClient' // Cache global do React Query
import { useAuth } from '@/features/auth/AuthContext' // Dados e estado da sessão do usuário
import { useCart } from '@/features/cart/useCart' // Itens e totais atuais do carrinho
import { Button } from '@/components/ui/button' // Botões estilizados
import { Badge } from '@/components/ui/badge' // Etiqueta de carteira principal
import type { Order, Wallet } from '@/types' // Tipagens de pedido e carteira

export function CheckoutPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { cart, isLoading: isCartLoading } = useCart()
  const navigate = useNavigate()

  // Guarda o ID da carteira selecionada para receber os NFTs
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  // Guarda o método de pagamento escolhido na interface
  const [paymentMethod, setPaymentMethod] = useState<'wallet_eth' | 'crypto_card'>('wallet_eth')
  // Armazena uma chave de idempotência estável para evitar cobranças duplicadas em retentativas
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID())
  // Guarda mensagens de erro detalhadas (ex: alteração de preço ou recusa de pagamento)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Redireciona visitantes não logados para a tela de login
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { redirect: '/checkout' } })
    }
  }, [isAuthLoading, isAuthenticated, navigate])

  // Busca as carteiras cadastradas na conta do usuário logado
  const walletsQuery = useQuery<Wallet[]>({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data } = await api.get<Wallet[]>('/wallets')
      return data
    },
    enabled: isAuthenticated,
  })

  // Seleciona automaticamente a carteira marcada como principal (isDefault) ao carregar
  useEffect(() => {
    const wallets = walletsQuery.data ?? []
    if (wallets.length > 0 && !selectedWalletId) {
      const defaultWallet = wallets.find((w) => w.isDefault) ?? wallets[0]
      setSelectedWalletId(defaultWallet.id)
    }
  }, [walletsQuery.data, selectedWalletId])

  const wallets = walletsQuery.data ?? []
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId)

  // Mutação que cria o pedido enviando walletId, network, expectedQuoteHash e Idempotency-Key
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWallet || !cart) {
        throw new Error('Carteira ou carrinho indisponível.')
      }

      const { data } = await api.post<Order>(
        '/orders',
        {
          walletId: selectedWallet.id,
          network: selectedWallet.network,
          expectedQuoteHash: cart.quoteHash,
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        },
      )
      return data
    },
    onSuccess: (createdOrder) => {
      // Salva o pedido recém-criado no cache e revalida carrinho/catálogo/pedidos
      queryClient.setQueryData(['order', createdOrder.id], createdOrder)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })

      // Gera uma nova chave para uma futura compra distinta
      setIdempotencyKey(crypto.randomUUID())

      toast.success('Pedido enviado! Acompanhe a confirmação on-chain.')
      navigate({ to: '/orders/$orderId', params: { orderId: createdOrder.id } })
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const code = err.response?.data?.code
        const message =
          err.response?.data?.message ?? 'Não foi possível concluir o pagamento no momento.'

        setCheckoutError(message)

        // Se o preço ou estoque mudou antes da confirmação (409 QUOTE_CHANGED), atualiza o resumo imediatamente
        if (status === 409) {
          if (err.response?.data?.updatedCart) {
            queryClient.setQueryData(['cart'], err.response.data.updatedCart)
          } else {
            queryClient.invalidateQueries({ queryKey: ['cart'] })
          }
          // Renova a chave para permitir confirmar com os novos valores
          if (code === 'QUOTE_CHANGED' || code === 'IDEMPOTENCY_CONFLICT') {
            setIdempotencyKey(crypto.randomUUID())
          }
        }
      } else {
        setCheckoutError('Falha de comunicação com a rede. Tente novamente.')
      }
    },
  })

  // Dispara a finalização ao enviar o formulário
  function handleConfirmPurchase(e: FormEvent) {
    e.preventDefault()
    setCheckoutError(null)

    if (!selectedWalletId || !selectedWallet) {
      setCheckoutError('Selecione ou cadastre uma carteira de destino antes de continuar.')
      return
    }

    createOrderMutation.mutate()
  }

  // Enquanto verifica autenticação ou carrega carrinho/carteiras
  if (isAuthLoading || isCartLoading || walletsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-zinc-400">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400 mb-3" />
        <p>Preparando ambiente seguro de checkout...</p>
      </div>
    )
  }

  const items = cart?.items ?? []

  // Se o carrinho estiver vazio, orienta o usuário a voltar ao catálogo
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 space-y-4">
          <h1 className="text-2xl font-bold text-white">Seu carrinho está vazio</h1>
          <p className="text-sm text-zinc-400">
            Adicione pelo menos um NFT ao carrinho antes de prosseguir para o checkout.
          </p>
          <Link to="/">
            <Button className="mt-2 bg-violet-600 hover:bg-violet-500 text-white">
              Explorar catálogo
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Continuar explorando
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Finalizar Compra
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-300">
          <Lock className="h-3.5 w-3.5" />
          Checkout Idempotente Protegido
        </div>
      </div>

      {/* Alerta de erro caso pagamento falhe ou preço seja atualizado */}
      {checkoutError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200"
        >
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Atenção ao processar o pedido</p>
            <p className="text-red-300/90">{checkoutError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleConfirmPurchase} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda (7 colunas): Carteira de Destino + Método de Pagamento */}
        <div className="lg:col-span-7 space-y-6">
          {/* Bloco 1: Seleção da Carteira de Destino */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-violet-400" />
                1. Carteira de Destino (Custódia)
              </h2>
              <Link to="/profile" className="text-xs text-violet-400 hover:underline">
                Gerenciar carteiras
              </Link>
            </div>

            {wallets.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 space-y-2">
                <p>Você ainda não possui nenhuma carteira Web3 cadastrada na sua conta.</p>
                <Link to="/profile">
                  <Button type="button" size="sm" variant="secondary" className="mt-1">
                    Adicionar carteira agora
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {wallets.map((wallet) => {
                  const isSelected = wallet.id === selectedWalletId
                  return (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => setSelectedWalletId(wallet.id)}
                      className={`w-full flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-600/15 ring-1 ring-violet-500'
                          : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{wallet.label}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-zinc-700 text-zinc-400 uppercase"
                          >
                            {wallet.network}
                          </Badge>
                          {wallet.isDefault && (
                            <Badge className="bg-violet-600/20 text-violet-300 text-[10px]">
                              Principal
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                          {wallet.address}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-violet-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Bloco 2: Método de Liquidação */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-violet-400" />
              2. Método de Pagamento
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet_eth')}
                className={`rounded-xl border p-4 text-left transition-all ${
                  paymentMethod === 'wallet_eth'
                    ? 'border-violet-500 bg-violet-600/15 ring-1 ring-violet-500'
                    : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                }`}
              >
                <p className="font-semibold text-sm text-white">Saldo ETH Direto</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Transferência on-chain imediata via carteira conectada
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('crypto_card')}
                className={`rounded-xl border p-4 text-left transition-all ${
                  paymentMethod === 'crypto_card'
                    ? 'border-violet-500 bg-violet-600/15 ring-1 ring-violet-500'
                    : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                }`}
              >
                <p className="font-semibold text-sm text-white">Cartão Cripto / Custódia</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Conversão instantânea com liquidação garantida
                </p>
              </button>
            </div>
          </section>
        </div>

        {/* Coluna Direita (5 colunas): Resumo dos Itens e Confirmação */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-5 shadow-xl">
            <h2 className="text-lg font-bold text-white">Resumo do Pedido</h2>

            {/* Lista compacta dos NFTs no carrinho */}
            <ul className="divide-y divide-zinc-800/80 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={`${item.nftId}-${item.editionId}`} className="py-3 flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-12 w-12 rounded-lg object-cover bg-zinc-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-400">
                      {item.editionName} • Qtd: {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-200">
                    {(parseFloat(item.unitPriceEth) * item.quantity).toFixed(4)} ETH
                  </span>
                </li>
              ))}
            </ul>

            {/* Detalhamento financeiro */}
            {cart && (
              <div className="space-y-2 border-t border-zinc-800 pt-4 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{cart.subtotalEth} ETH</span>
                </div>
                {parseFloat(cart.discountEth) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto ({cart.couponCode})</span>
                    <span>- {cart.discountEth} ETH</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Taxa de rede (Gas)</span>
                  <span>{cart.networkFeeEth} ETH</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-3 text-lg font-extrabold text-white">
                  <span>Total a pagar</span>
                  <span className="text-violet-400">{cart.totalEth} ETH</span>
                </div>
              </div>
            )}

            {/* Botão de confirmação bloqueado durante o envio */}
            <Button
              type="submit"
              disabled={createOrderMutation.isPending || wallets.length === 0}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-6 text-base"
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando transação...
                </>
              ) : (
                'Confirmar Pagamento'
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 text-center">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              Transação protegida contra envio duplicado (Idempotency-Key ativa)
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}