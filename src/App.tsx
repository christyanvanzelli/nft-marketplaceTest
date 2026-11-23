// src/App.tsx
import { useEffect } from 'react' // Hook para conectar o Socket.IO ao iniciar o app
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router' // Primitivas de roteamento tipado do TanStack Router
import { QueryClientProvider } from '@tanstack/react-query' // Provedor do cache global do TanStack Query
import { Toaster } from 'sonner' // Componente que exibe os alertas flutuantes (toasts)
import { queryClient } from '@/lib/queryClient' // Nossa instância configurada do QueryClient
import { realtime } from '@/lib/socket' // Cliente Socket.IO que atualiza preços, estoque e pedidos ao vivo
import { AuthProvider } from '@/features/auth/AuthContext' // Provedor da sessão do usuário
import { Navbar } from '@/components/layout/Navbar' // Barra de navegação superior + gaveta do carrinho
import { CatalogPage } from '@/features/catalog/CatalogPage' // Tela principal do catálogo (/)
import { NftDetailPage } from '@/features/catalog/NftDetailPage' // Tela de detalhes do NFT (/nft/$nftId)
import { LoginPage } from '@/features/auth/LoginPage' // Tela de login (/login)
import { RegisterPage } from '@/features/auth/RegisterPage' // Tela de cadastro (/register)
import { CheckoutPage } from '@/features/checkout/CheckoutPage' // Tela de checkout (/checkout)
import { OrderReceiptPage } from '@/features/checkout/OrderReceiptPage' // Tela de recibo em tempo real (/orders/$orderId)
import { ProfilePage } from '@/features/profile/ProfilePage' // Tela de perfil, carteiras, favoritos e pedidos (/profile)

// Rota raiz que envolve todas as páginas com o layout padrão (Navbar + Conteúdo + Rodapé)
const rootRoute = createRootRoute({
  component: function RootLayout() {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        {/* Barra de navegação fixa no topo */}
        <Navbar />

        {/* Área onde cada página ativa é renderizada */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Rodapé institucional discreto */}
        <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
          AetherVault NFT Marketplace • Demonstração Full-Stack React, MSW & Socket.IO
        </footer>
      </div>
    )
  },
})

// Rota inicial: Catálogo de NFTs (/)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CatalogPage,
})

// Rota de Login (/login) com suporte a parâmetro ?redirect=/destino
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  component: function LoginRouteComponent() {
    const { redirect } = loginRoute.useSearch()
    return <LoginPage redirectTo={redirect} />
  },
})

// Rota de Cadastro (/register)
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

// Rota de Detalhes de um NFT específico (/nft/$nftId)
const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: function NftDetailRouteComponent() {
    const { nftId } = nftDetailRoute.useParams()
    return <NftDetailPage nftId={nftId} />
  },
})

// Rota de Finalização de Compra (/checkout)
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: CheckoutPage,
})

// Rota de Recibo e Acompanhamento On-Chain (/orders/$orderId)
const orderReceiptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  component: function OrderReceiptRouteComponent() {
    const { orderId } = orderReceiptRoute.useParams()
    return <OrderReceiptPage orderId={orderId} />
  },
})

// Rota da Área do Colecionador (/profile)
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
})

// Monta a árvore completa de rotas da aplicação
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  nftDetailRoute,
  checkoutRoute,
  orderReceiptRoute,
  profileRoute,
])

// Cria a instância do roteador
const router = createRouter({ routeTree })

// Registra a tipagem do roteador globalmente no TypeScript para autocomplete nos <Link to="..." />
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  // Inicia a conexão WebSocket/Socket.IO simulada ao montar a aplicação e encerra ao desmontar
  useEffect(() => {
    realtime.connect()
    return () => {
      realtime.disconnect()
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        {/* Notificações toast posicionadas no canto inferior direito em tema escuro */}
        <Toaster theme="dark" position="bottom-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App