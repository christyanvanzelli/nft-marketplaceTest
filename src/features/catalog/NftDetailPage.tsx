// src/features/catalog/NftDetailPage.tsx
import { useEffect, useState } from 'react' // Hooks de estado e sincronização
import { Link, useNavigate } from '@tanstack/react-router' // Navegação entre rotas
import { useQuery } from '@tanstack/react-query' // Busca os detalhes do NFT com suporte a atualização via Socket
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Layers,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react' // Ícones da interface
import { toast } from 'sonner' // Notificações flutuantes
import { api } from '@/api/client' // Cliente Axios
import { useAuth } from '@/features/auth/AuthContext' // Verifica autenticação ao favoritar
import { useCart } from '@/features/cart/useCart' // Adiciona edição selecionada ao carrinho
import { useFavorites } from './useFavorites' // Hook de favoritos com atualização otimista
import { Button } from '@/components/ui/button' // Botões estilizados
import { Badge } from '@/components/ui/badge' // Etiquetas de categoria e estoque
import { Skeleton } from '@/components/ui/skeleton' // Placeholders de carregamento
import type { Nft } from '@/types' // Tipagem do NFT

interface NftDetailPageProps {
  nftId: string // ID recebido pelo parâmetro da rota (/nft/$nftId)
}

export function NftDetailPage({ nftId }: NftDetailPageProps) {
  const { isAuthenticated } = useAuth()
  const { updateItem, isUpdatingItem } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const navigate = useNavigate()

  // Guarda o ID da edição selecionada pelo usuário e a quantidade escolhida
  const [selectedEditionId, setSelectedEditionId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)

  // Busca os dados do NFT; quando o Socket.IO emite 'nft.updated', este cache é atualizado ao vivo
  const {
    data: nft,
    isLoading,
    isError,
  } = useQuery<Nft>({
    queryKey: ['nft', nftId],
    queryFn: async () => {
      const { data } = await api.get<Nft>(`/nfts/${nftId}`)
      return data
    },
  })

  // Seleciona automaticamente a primeira edição disponível assim que o NFT carregar
  useEffect(() => {
    if (nft && nft.editions.length > 0 && !selectedEditionId) {
      const firstInStock = nft.editions.find((e) => e.available > 0) ?? nft.editions[0]
      setSelectedEditionId(firstInStock.id)
    }
  }, [nft, selectedEditionId])

  // Encontra o objeto da edição atualmente selecionada
  const selectedEdition =
    nft?.editions.find((e) => e.id === selectedEditionId) ?? nft?.editions[0]

  // Ajusta a quantidade caso o estoque caia ao vivo via WebSocket abaixo do número selecionado
  useEffect(() => {
    if (selectedEdition && selectedEdition.available > 0 && quantity > selectedEdition.available) {
      setQuantity(selectedEdition.available)
    }
  }, [selectedEdition, quantity])

  // Estado de carregamento inicial (Skeleton)
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl bg-zinc-800" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 bg-zinc-800" />
            <Skeleton className="h-10 w-3/4 bg-zinc-800" />
            <Skeleton className="h-24 w-full bg-zinc-800" />
            <Skeleton className="h-40 w-full bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  // Estado de erro / NFT não encontrado (404)
  if (isError || !nft || !selectedEdition) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="text-2xl font-bold text-white">NFT não encontrado</h1>
          <p className="text-sm text-zinc-400">
            A peça que você tentou acessar não existe ou foi removida do catálogo.
          </p>
          <Link to="/">
            <Button className="mt-2 bg-violet-600 hover:bg-violet-500 text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao catálogo
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const liked = isFavorite(nft.id)
  const isSoldOut = selectedEdition.available <= 0

  // Trata o clique no coração de favoritar
   
   // Trata o clique no coração de favoritar
  function handleToggleFavorite() {
    if (!nft) return
    if (!isAuthenticated) {
      toast.info('Entre na sua conta para salvar NFTs nos favoritos.')
      navigate({ to: '/login', search: { redirect: `/nft/${nft.id}` } })
      return
    }
    toggleFavorite({ nftId: nft.id, isFavorite: liked })
  }

  // Adiciona a edição e quantidade escolhidas ao carrinho
  async function handleAddToCart() {
    if (!nft || !selectedEdition || isSoldOut) return
    await updateItem({
      nftId: nft.id,
      editionId: selectedEdition.id,
      quantity,
    })
    toast.success(`${quantity}x ${nft.title} (${selectedEdition.name}) adicionado ao carrinho!`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Botão de voltar para o catálogo */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para explorar
        </Link>
      </div>

      {/* Layout em duas colunas: Imagem à esquerda, especificações e compra à direita */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Coluna Esquerda: Obra + Atributos */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <img
              src={nft.imageUrl}
              alt={nft.title}
              className="aspect-square w-full object-cover"
            />
          </div>

          {/* Grade de atributos / propriedades da obra */}
          {nft.attributes && nft.attributes.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Propriedades & Raridade
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {nft.attributes.map((attr) => (
                  <div
                    key={`${attr.trait_type}-${attr.value}`}
                    className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 text-center"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-violet-400">
                      {attr.trait_type}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white truncate">{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Informações, Seleção de Edição e Compra */}
        <div className="space-y-6">
          {/* Cabeçalho com coleção, categoria e botão de favorito */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-violet-400">{nft.collection}</span>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                  {nft.category}
                </Badge>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {nft.title}
              </h1>
              <p className="text-sm text-zinc-400">
                Criado por <strong className="text-zinc-200">{nft.creator}</strong>
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleToggleFavorite}
              aria-label={liked ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`h-11 w-11 rounded-xl border-zinc-800 ${
                liked ? 'bg-rose-500/15 text-rose-400 border-rose-500/40' : 'bg-zinc-900 text-zinc-300'
              }`}
            >
              <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Descrição da obra */}
          <p className="text-sm leading-relaxed text-zinc-300">{nft.description}</p>

          {/* Seletor de Edições */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-400" />
              Selecione a Edição
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nft.editions.map((edition) => {
                const isSelected = edition.id === selectedEdition.id
                const editionSoldOut = edition.available <= 0

                return (
                  <button
                    key={edition.id}
                    type="button"
                    onClick={() => {
                      setSelectedEditionId(edition.id)
                      setQuantity(1)
                    }}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-600/15 ring-1 ring-violet-500'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{edition.name}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-violet-400" />}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-base font-bold text-violet-300">
                        {edition.priceEth} ETH
                      </span>
                      <span
                        className={`text-xs ${
                          editionSoldOut ? 'text-red-400 font-medium' : 'text-zinc-400'
                        }`}
                      >
                        {editionSoldOut
                          ? 'Esgotado'
                          : `${edition.available} de ${edition.total} disponíveis`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Caixa de Compra com preço atual, seletor de quantidade e botão principal */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">Preço da edição</p>
                <p className="text-3xl font-extrabold text-white mt-0.5">
                  {selectedEdition.priceEth} <span className="text-lg text-violet-400">ETH</span>
                </p>
              </div>

              {/* Controle de quantidade */}
              {!isSoldOut && (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Diminuir quantidade"
                    className="text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-white">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= selectedEdition.available}
                    onClick={() =>
                      setQuantity((q) => Math.min(selectedEdition.available, q + 1))
                    }
                    aria-label="Aumentar quantidade"
                    className="text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <Button
              type="button"
              disabled={isSoldOut || isUpdatingItem}
              onClick={handleAddToCart}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-6 text-base"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              {isSoldOut ? 'Edição Esgotada' : 'Adicionar ao Carrinho'}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Autenticidade verificada on-chain • Cotação atualizada ao vivo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}