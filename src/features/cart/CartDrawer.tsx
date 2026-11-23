// src/features/cart/CartDrawer.tsx
import { useState, type FormEvent } from 'react' // Hooks de estado e tipagem de formulário
import { useNavigate } from '@tanstack/react-router' // Navegação programática para o checkout ou login
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react' // Ícones da interface
import { useCart } from './useCart' // Hook com os dados e ações do carrinho
import { useAuth } from '@/features/auth/AuthContext' // Verifica se o usuário precisa logar antes do checkout
import { Button } from '@/components/ui/button' // Botões estilizados
import { Input } from '@/components/ui/input' // Campo de texto para cupom
import { Badge } from '@/components/ui/badge' // Etiqueta visual do cupom aplicado

interface CartDrawerProps {
  open: boolean // Controla se a gaveta está visível
  onClose: () => void // Função para fechar a gaveta
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { cart, updateItem, removeItem, applyCoupon, isApplyingCoupon, isUpdatingItem } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Estado local do campo de texto do cupom
  const [couponInput, setCouponInput] = useState('')

  // Se a gaveta estiver fechada, não renderiza nada no DOM
  if (!open) return null

  const items = cart?.items ?? []

  // Envia o código do cupom para a API validar e aplicar
  async function handleApplyCoupon(e: FormEvent) {
    e.preventDefault()
    if (!couponInput.trim()) return
    try {
      await applyCoupon(couponInput.trim())
      setCouponInput('') // Limpa o campo após aplicar com sucesso
    } catch {
      // O erro já é exibido pelo toast dentro de useCart
    }
  }

  // Avança para a tela de checkout (ou pede login caso seja visitante)
  function handleProceedToCheckout() {
    onClose()
    if (!isAuthenticated) {
      navigate({ to: '/login', search: { redirect: '/checkout' } })
    } else {
      navigate({ to: '/checkout' })
    }
  }

  return (
    // Overlay escuro cobrindo a tela toda
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      {/* Painel lateral direito do carrinho */}
      <aside
        aria-label="Carrinho de compras"
        className="flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl"
      >
        {/* Cabeçalho da gaveta */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold">Seu Carrinho</h2>
            {items.length > 0 && (
              <Badge variant="secondary" className="bg-violet-600/20 text-violet-300">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Lista de itens com rolagem */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            // Estado vazio quando não há NFTs adicionados
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="mb-3 rounded-full bg-zinc-900 p-4 text-zinc-500">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="font-medium text-zinc-300">Seu carrinho está vazio</p>
              <p className="mt-1 text-sm text-zinc-500">
                Explore o catálogo e adicione NFTs exclusivos para colecionar.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.nftId}-${item.editionId}`}
                  className="flex gap-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3"
                >
                  {/* Miniatura do NFT */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-20 w-20 rounded-lg object-cover bg-zinc-800 shrink-0"
                  />

                  {/* Informações, preço e controles de quantidade */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm text-zinc-100">{item.title}</p>
                        <p className="text-xs text-zinc-400">{item.editionName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem({ nftId: item.nftId, editionId: item.editionId })}
                        aria-label={`Remover ${item.title}`}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Seletor de quantidade (- / +) */}
                      <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950">
                        <button
                          type="button"
                          disabled={isUpdatingItem}
                          onClick={() =>
                            updateItem({
                              nftId: item.nftId,
                              editionId: item.editionId,
                              quantity: item.quantity - 1,
                            })
                          }
                          aria-label="Diminuir quantidade"
                          className="px-2 py-1 text-zinc-400 hover:text-white disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={isUpdatingItem || item.quantity >= item.available}
                          onClick={() =>
                            updateItem({
                              nftId: item.nftId,
                              editionId: item.editionId,
                              quantity: item.quantity + 1,
                            })
                          }
                          aria-label="Aumentar quantidade"
                          className="px-2 py-1 text-zinc-400 hover:text-white disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Preço unitário */}
                      <span className="text-sm font-semibold text-violet-400">
                        {item.unitPriceEth} ETH
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé com cupom, resumo financeiro e botão de checkout */}
        {items.length > 0 && cart && (
          <div className="border-t border-zinc-800 bg-zinc-900/50 px-5 py-4 space-y-4">
            {/* Formulário de cupom */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Cupom (ex: WELCOME10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="pl-9 border-zinc-800 bg-zinc-950 text-sm uppercase"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={isApplyingCoupon || !couponInput.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              >
                Aplicar
              </Button>
            </form>

            {/* Badge do cupom ativo com botão para remover */}
            {cart.couponCode && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300">
                <span>
                  Cupom aplicado: <strong>{cart.couponCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => applyCoupon(null)}
                  className="text-emerald-300 hover:text-white underline"
                >
                  Remover
                </button>
              </div>
            )}

            {/* Resumo dos valores em ETH */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{cart.subtotalEth} ETH</span>
              </div>
              {parseFloat(cart.discountEth) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Desconto</span>
                  <span>- {cart.discountEth} ETH</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>Taxa de rede (Gas estimado)</span>
                <span>{cart.networkFeeEth} ETH</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2 text-base font-bold text-white">
                <span>Total</span>
                <span className="text-violet-400">{cart.totalEth} ETH</span>
              </div>
            </div>

            {/* Botão para avançar ao Checkout */}
            <Button
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-5"
            >
              {isAuthenticated ? 'Finalizar Compra' : 'Entrar para Finalizar Compra'}
            </Button>
          </div>
        )}
      </aside>
    </div>
  )
}