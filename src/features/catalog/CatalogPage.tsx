// src/features/catalog/CatalogPage.tsx
import { useEffect, useState } from 'react' // Hooks de estado e ciclo de vida do React
import { Link, useNavigate } from '@tanstack/react-router' // Link para detalhe do NFT e navegação
import { useQuery } from '@tanstack/react-query' // Busca paginada com cache
import {
  AlertCircle,
  Heart,
  RefreshCw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react' // Ícones da interface
import { toast } from 'sonner' // Notificações visuais
import { api } from '@/api/client' // Cliente Axios
import { useAuth } from '@/features/auth/AuthContext' // Verifica se usuário está logado ao favoritar
import { useCart } from '@/features/cart/useCart' // Adiciona NFT diretamente ao carrinho
import { useFavorites } from './useFavorites' // Gerencia favoritos com atualização otimista
import { Button } from '@/components/ui/button' // Botões estilizados
import { Input } from '@/components/ui/input' // Campos de busca e faixa de preço
import { Badge } from '@/components/ui/badge' // Etiquetas de categoria e estoque
import { Skeleton } from '@/components/ui/skeleton' // Placeholders animados de carregamento
import type { Nft, PaginatedResponse } from '@/types' // Tipagens do catálogo

// Lista fixa das categorias disponíveis para filtro rápido
const CATEGORIES = ['all', 'Art', 'Gaming', 'Photography', 'Music', 'Collectibles']
const COLLECTIONS = ['all', 'Neo-Edo Genesis', 'Ethereal Forms', 'Starlight Relics', 'Cyber Beats']

export function CatalogPage() {
  const { isAuthenticated } = useAuth()
  const { updateItem, isUpdatingItem } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const navigate = useNavigate()

  // Lê os filtros iniciais da URL para sobreviver ao F5 e compartilhamento de link
  const initialParams = new URLSearchParams(window.location.search)

  const [searchInput, setSearchInput] = useState(initialParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(initialParams.get('q') ?? '')
  const [category, setCategory] = useState(initialParams.get('category') ?? 'all')
  const [collection, setCollection] = useState(initialParams.get('collection') ?? 'all')
  const [minPrice, setMinPrice] = useState(initialParams.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(initialParams.get('maxPrice') ?? '')
  const [inStockOnly, setInStockOnly] = useState(initialParams.get('inStockOnly') === 'true')
  const [sort, setSort] = useState(initialParams.get('sort') ?? 'recent')
  const [page, setPage] = useState(Number(initialParams.get('page') ?? 1))

  // Aguarda 350ms após o usuário parar de digitar para não disparar requisições a cada letra
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput)
      setPage(1) // Volta para a página 1 sempre que mudar o termo de busca
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Sincroniza os filtros ativos na barra de endereço (query string)
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (category !== 'all') params.set('category', category)
    if (collection !== 'all') params.set('collection', collection)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (inStockOnly) params.set('inStockOnly', 'true')
    if (sort !== 'recent') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))

    const queryString = params.toString()
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    window.history.replaceState(null, '', nextUrl)
  }, [debouncedQuery, category, collection, minPrice, maxPrice, inStockOnly, sort, page])

  // Busca os NFTs filtrados e paginados; o TanStack Query descarta automaticamente respostas antigas
  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<Nft>>({
    queryKey: ['nfts', { debouncedQuery, category, collection, minPrice, maxPrice, inStockOnly, sort, page }],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Nft>>('/nfts', {
        params: {
          q: debouncedQuery || undefined,
          category,
          collection,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          inStockOnly,
          sort,
          page,
          pageSize: 6,
        },
      })
      return data
    },
  })

  // Reseta todos os filtros de volta ao padrão
  function handleClearFilters() {
    setSearchInput('')
    setDebouncedQuery('')
    setCategory('all')
    setCollection('all')
    setMinPrice('')
    setMaxPrice('')
    setInStockOnly(false)
    setSort('recent')
    setPage(1)
  }

  // Trata o clique no coração de favoritar
  function handleFavoriteClick(nftId: string) {
    if (!isAuthenticated) {
      toast.info('Entre na sua conta para salvar NFTs nos favoritos.')
      navigate({ to: '/login', search: { redirect: '/' } })
      return
    }
    toggleFavorite({ nftId, isFavorite: isFavorite(nftId) })
  }

  // Adiciona a primeira edição disponível do NFT ao carrinho
  async function handleQuickAdd(nft: Nft) {
    const availableEdition = nft.editions.find((e) => e.available > 0)
    if (!availableEdition) return

    await updateItem({
      nftId: nft.id,
      editionId: availableEdition.id,
      quantity: 1,
    })
    toast.success(`${nft.title} (${availableEdition.name}) adicionado ao carrinho!`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Banner de destaque do Marketplace */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-violet-950/60 via-zinc-900 to-zinc-950 p-6 sm:p-10">
        <div className="max-w-2xl space-y-3">
          <Badge className="bg-violet-600/20 text-violet-300 border-violet-500/30">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Coleções Digitais Verificadas
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Descubra, colecione e negocie NFTs raros em tempo real
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Explore edições limitadas com liquidação transparente em ETH, cotações atualizadas ao vivo e gestão multi-carteira.
          </p>
        </div>
      </section>

      {/* Barra de busca, filtros combinados e ordenação */}
      <section aria-label="Filtros do catálogo" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Campo de busca por título, criador ou coleção */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder="Buscar por nome do NFT, criador ou coleção..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 border-zinc-800 bg-zinc-900/90 text-zinc-100"
            />
          </div>

          {/* Seletor de ordenação */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-400 shrink-0" />
            <select
              aria-label="Ordenar catálogo"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="recent">Mais recentes</option>
              <option value="popular">Mais populares</option>
              <option value="price_asc">Menor preço (ETH)</option>
              <option value="price_desc">Maior preço (ETH)</option>
            </select>
          </div>
        </div>

        {/* Linha secundária de filtros: Categorias, Coleção, Faixa de Preço e Estoque */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
          {/* Botões de categoria */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat)
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {cat === 'all' ? 'Todas Categorias' : cat}
              </button>
            ))}
          </div>

          {/* Filtro por Coleção */}
          <select
            aria-label="Filtrar por coleção"
            value={collection}
            onChange={(e) => {
              setCollection(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300"
          >
            {COLLECTIONS.map((col) => (
              <option key={col} value={col}>
                {col === 'all' ? 'Todas Coleções' : col}
              </option>
            ))}
          </select>

          {/* Faixa de preço mínimo e máximo */}
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Mín ETH"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value)
                setPage(1)
              }}
              className="w-24 h-8 border-zinc-800 bg-zinc-950 text-xs"
            />
            <span className="text-zinc-600">-</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Máx ETH"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value)
                setPage(1)
              }}
              className="w-24 h-8 border-zinc-800 bg-zinc-950 text-xs"
            />
          </div>

          {/* Checkbox apenas em estoque */}
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked)
                setPage(1)
              }}
              className="rounded border-zinc-700 bg-zinc-950 text-violet-600"
            />
            Apenas disponíveis
          </label>
        </div>
      </section>

      {/* Conteúdo principal: Carregando (Skeleton), Erro, Vazio ou Grade de NFTs */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <Skeleton className="h-60 w-full rounded-xl bg-zinc-800" />
              <Skeleton className="h-5 w-2/3 bg-zinc-800" />
              <Skeleton className="h-4 w-1/2 bg-zinc-800" />
              <Skeleton className="h-9 w-full bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : isError ? (
        // Estado de erro com opção de tentar novamente
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/5 p-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-white">Falha ao carregar o catálogo</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Não foi possível obter os NFTs no momento. Verifique sua conexão ou cenário simulado.
          </p>
          <Button
            type="button"
            onClick={() => refetch()}
            className="mt-4 bg-violet-600 hover:bg-violet-500 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : !data || data.data.length === 0 ? (
        // Estado vazio quando nenhum NFT combina com os filtros
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <p className="text-lg font-semibold text-zinc-200">Nenhum NFT encontrado</p>
          <p className="mt-1 text-sm text-zinc-400">
            Tente ajustar os filtros ou limpar a busca para ver toda a coleção.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearFilters}
            className="mt-4 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <>
          {/* Grade responsiva de cards de NFT */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((nft) => {
              // Soma o estoque restante entre todas as edições do NFT
              // Soma o estoque restante entre todas as edições do NFT com fallback seguro
              const totalAvailable = (nft.editions ?? []).reduce((sum, ed) => sum + ed.available, 0)
              const soldOut = totalAvailable === 0
              const liked = isFavorite(nft.id)

              return (
                <article
                  key={nft.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/70 transition-all hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-950/20"
                >
                  {/* Imagem do NFT com botão flutuante de favoritar */}
                  <div className="relative aspect-square overflow-hidden bg-zinc-950">
                    <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
                      <img
                        src={nft.imageUrl}
                        alt={nft.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </Link>

                    {/* Etiqueta de categoria no canto superior esquerdo */}
                    <Badge className="absolute left-3 top-3 bg-zinc-950/80 text-zinc-200 backdrop-blur-md border-zinc-700">
                      {nft.category}
                    </Badge>

                    {/* Botão de favoritar no canto superior direito */}
                    <button
                      type="button"
                      onClick={() => handleFavoriteClick(nft.id)}
                      aria-label={liked ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
                      className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
                        liked
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-zinc-950/75 text-zinc-300 border border-zinc-700 hover:text-white'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                    </button>

                    {/* Faixa de Esgotado se não restar nenhuma edição */}
                    {soldOut && (
                      <div className="absolute inset-x-0 bottom-0 bg-red-950/90 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-red-200">
                        Esgotado
                      </div>
                    )}
                  </div>

                  {/* Corpo do card com coleção, título, preço e ações */}
                  <div className="flex flex-1 flex-col justify-between p-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-violet-400">{nft.collection}</p>
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: nft.id }}
                        className="mt-0.5 block text-lg font-bold text-white hover:text-violet-300 transition-colors truncate"
                      >
                        {nft.title}
                      </Link>
                      <p className="text-xs text-zinc-400 mt-0.5">por {nft.creator}</p>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Preço base</p>
                        <p className="text-base font-bold text-white">{nft.priceEth} ETH</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 bg-zinc-950 text-xs text-zinc-200 hover:bg-zinc-800"
                          >
                            Detalhes
                          </Button>
                        </Link>

                        <Button
                          type="button"
                          size="sm"
                          disabled={soldOut || isUpdatingItem}
                          onClick={() => handleQuickAdd(nft)}
                          aria-label={`Adicionar ${nft.title} ao carrinho`}
                          className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                          {soldOut ? 'Indisponível' : 'Comprar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Controles de Paginação */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
              <p className="text-sm text-zinc-400">
                Página <strong className="text-white">{data.meta.page}</strong> de{' '}
                <strong className="text-white">{data.meta.totalPages}</strong> ({data.meta.total} itens)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-zinc-800 bg-zinc-900 text-zinc-200"
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-zinc-800 bg-zinc-900 text-zinc-200"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}