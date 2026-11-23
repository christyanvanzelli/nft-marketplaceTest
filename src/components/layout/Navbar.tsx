// src/components/layout/Navbar.tsx
import { useState } from 'react' // Controla a abertura da gaveta do carrinho e do painel de cenários
import { Link, useNavigate } from '@tanstack/react-router' // Links de navegação e redirecionamento
import {
  FlaskConical,
  Heart,
  Hexagon,
  LogOut,
  RotateCcw,
  ShoppingBag,
  User,
  Zap,
} from 'lucide-react' // Ícones da barra superior
import { toast } from 'sonner' // Notificações visuais
import { api } from '@/api/client' // Cliente Axios para acionar endpoints de controle do mock
import { queryClient } from '@/lib/queryClient' // Cache global para atualizar dados após reset/evento
import { useAuth } from '@/features/auth/AuthContext' // Dados e ações da sessão do usuário
import { useCart } from '@/features/cart/useCart' // Contador de itens no carrinho
import { CartDrawer } from '@/features/cart/CartDrawer' // Gaveta lateral do carrinho
import { Button } from '@/components/ui/button' // Botões estilizados
import { Badge } from '@/components/ui/badge' // Etiqueta com número de itens no carrinho

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { totalItemsCount } = useCart()
  const navigate = useNavigate()

  // Estado que abre/fecha a gaveta lateral do carrinho
  const [cartOpen, setCartOpen] = useState(false)
  // Estado que abre/fecha o menu flutuante de simulação de cenários (QA / Demo)
  const [simOpen, setSimOpen] = useState(false)
  // Guarda o cenário de rede/erro atualmente ativo no MSW
  const [activeScenario, setActiveScenario] = useState('default')

  // Encerra a sessão e volta para o catálogo
  async function handleLogout() {
    await logout()
    toast.info('Você saiu da sua conta.')
    navigate({ to: '/' })
  }

  // Troca o cenário de falha/latência no MSW para testes e demonstração
  async function handleChangeScenario(scenario: string) {
    await api.post('/__mock/scenario', { scenario })
    setActiveScenario(scenario)
    toast.info(`Cenário de mock alterado para: ${scenario}`)
  }

  // Dispara um evento Socket.IO simulado alterando preço e estoque do primeiro NFT
  async function handleSimulatePriceDrop() {
    const newPrice = (Math.random() * 0.4 + 0.15).toFixed(4)
    await api.post('/__mock/emit/nft-updated', {
      nftId: 'nft-01',
      editionId: 'ed-01-a',
      priceEth: newPrice,
      available: 3,
    })
    toast.success(`Evento Socket.IO emitido: Cyber Ronin #01 agora custa ${newPrice} ETH!`)
  }

  // Restaura todos os dados do banco simulado para o estado inicial
  async function handleResetMocks() {
    await api.post('/__mock/reset')
    setActiveScenario('default')
    await queryClient.invalidateQueries()
    toast.success('Banco de dados simulado restaurado ao estado inicial.')
  }

  return (
    <>
      {/* Cabeçalho fixo no topo com efeito translúcido */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo e links principais */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/25">
                <Hexagon className="h-5 w-5" />
              </div>
              <span className="tracking-tight">
                Aether<span className="text-violet-400">Vault</span>
              </span>
            </Link>

            <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-5 text-sm">
              <Link
                to="/"
                className="text-zinc-300 hover:text-white transition-colors font-medium"
              >
                Explorar
              </Link>
              {isAuthenticated && (
                <Link
                  to="/profile"
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Minha Conta & Carteiras
                </Link>
              )}
            </nav>
          </div>

          {/* Ações do lado direito: Simulador QA, Favoritos, Carrinho e Perfil */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botão discreto para abrir painel de simulação de falhas/tempo real */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSimOpen((prev) => !prev)}
                title="Simular cenários de rede, erros e eventos em tempo real"
                className="border-zinc-800 bg-zinc-900/80 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                <FlaskConical className="h-3.5 w-3.5 sm:mr-1.5 text-amber-400" />
                <span className="hidden sm:inline">Simulador</span>
              </Button>

              {/* Popover com botões de simulação exigidos na demonstração */}
              {simOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 shadow-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="font-semibold text-zinc-200">Painel de Simulação (MSW)</span>
                    <button
                      type="button"
                      onClick={() => setSimOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-zinc-400 font-medium">Comportamento da API:</p>
                    <select
                      aria-label="Selecionar cenário de rede"
                      value={activeScenario}
                      onChange={(e) => handleChangeScenario(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-zinc-200"
                    >
                      <option value="default">Normal (180ms)</option>
                      <option value="slow_network">Rede lenta (1.5s)</option>
                      <option value="network_error">Falha de rede (Offline)</option>
                      <option value="server_error">Erro HTTP 500</option>
                      <option value="out_of_order">Respostas fora de ordem</option>
                      <option value="payment_rejected">Pagamento recusado no checkout</option>
                      <option value="order_timeout">Timeout no checkout (504)</option>
                      <option value="price_changed_checkout">Preço alterado no checkout</option>
                    </select>
                  </div>

                  <div className="pt-1 space-y-2 border-t border-zinc-800">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleSimulatePriceDrop}
                      className="w-full justify-start bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 text-xs"
                    >
                      <Zap className="mr-2 h-3.5 w-3.5" />
                      Emitir atualização ao vivo (Socket)
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleResetMocks}
                      className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      Resetar dados iniciais
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Atalho para favoritos quando logado */}
            {isAuthenticated && (
              <Link
                to="/profile"
                aria-label="Meus favoritos"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <Heart className="h-4 w-4" />
              </Link>
            )}

            {/* Botão do carrinho com contador */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCartOpen(true)}
              aria-label="Abrir carrinho"
              className="relative border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800"
            >
              <ShoppingBag className="h-4 w-4 sm:mr-1.5 text-violet-400" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalItemsCount > 0 && (
                <Badge className="ml-1.5 bg-violet-600 text-white px-1.5 py-0 text-[11px]">
                  {totalItemsCount}
                </Badge>
              )}
            </Button>

            {/* Área do usuário: exibe perfil + sair se logado, ou botão Entrar se visitante */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-5 w-5 rounded-full bg-zinc-800"
                  />
                  <span className="hidden md:inline max-w-[110px] truncate">{user.name}</span>
                </Link>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Sair da conta"
                  title="Sair da conta"
                  className="text-zinc-400 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">
                  <User className="h-4 w-4 mr-1.5" />
                  Entrar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Gaveta lateral do carrinho controlada pelo estado cartOpen */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}