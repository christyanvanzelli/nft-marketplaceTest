// src/features/checkout/OrderReceiptPage.tsx
import { useState } from 'react' // Controla o feedback visual do botão "Copiar Hash"
import { Link } from '@tanstack/react-router' // Links para voltar ao catálogo ou ir ao perfil
import { useQuery } from '@tanstack/react-query' // Busca o pedido e reage às atualizações do Socket.IO
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Receipt,
  XCircle,
} from 'lucide-react' // Ícones da linha do tempo e recibo
import { toast } from 'sonner' // Notificações visuais
import { api } from '@/api/client' // Cliente Axios
import { Button } from '@/components/ui/button' // Botões estilizados
import { Badge } from '@/components/ui/badge' // Etiquetas de status
import { Skeleton } from '@/components/ui/skeleton' // Placeholders de carregamento
import type { Order } from '@/types' // Tipagem do pedido

interface OrderReceiptPageProps {
  orderId: string // ID do pedido vindo da rota (/orders/$orderId)
}

const FAILED_CONFIG = {
  label: 'Transação Recusada',
  description: 'Não foi possível confirmar a transação na rede ou carteira simulada.',
  badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
}

// Mapa visual de cada status possível do pedido (suporta tanto 'rejected' quanto 'failed')
const STATUS_CONFIG: Record<
  string,
  { label: string; description: string; badgeClass: string }
> = {
  pending: {
    label: 'Aguardando Envio',
    description: 'Sua ordem foi registrada e está na fila de assinatura da rede.',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  confirming: {
    label: 'Confirmando na Blockchain',
    description: 'Transação transmitida! Aguardando validações dos blocos em tempo real...',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  confirmed: {
    label: 'Confirmado On-Chain',
    description: 'Transferência concluída com sucesso! Os NFTs já pertencem à sua carteira.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  rejected: FAILED_CONFIG,
  failed: FAILED_CONFIG,
}

export function OrderReceiptPage({ orderId }: OrderReceiptPageProps) {
  const [copiedHash, setCopiedHash] = useState(false)

  // Busca o pedido; o Socket.IO atualiza este cache ao vivo via 'order.updated',
  // e o refetchInterval atua como rede de segurança enquanto o pedido não finalizar
  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/orders/${orderId}`)
      return data
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status
      if (
        currentStatus === 'confirmed' ||
        currentStatus === 'rejected' ||
        currentStatus === 'failed'
      ) {
        return false // Para o polling assim que atingir um estado final
      }
      return 3000 // Consulta a cada 3s enquanto estiver em andamento
    },
  })

  // Copia o hash da transação para a área de transferência
  async function handleCopyTxHash(hash: string) {
    await navigator.clipboard.writeText(hash)
    setCopiedHash(true)
    toast.success('Hash da transação copiado!')
    setTimeout(() => setCopiedHash(false), 2000)
  }

  // Tela de carregamento inicial
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
        <Skeleton className="h-36 w-full rounded-2xl bg-zinc-800" />
        <Skeleton className="h-64 w-full rounded-2xl bg-zinc-800" />
      </div>
    )
  }

  // Tela de erro caso o pedido não exista
  if (isError || !order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="text-2xl font-bold text-white">Pedido não encontrado</h1>
          <p className="text-sm text-zinc-400">
            Não localizamos o recibo informado ou você não tem permissão para visualizá-lo.
          </p>
          <Link to="/">
            <Button className="mt-2 bg-violet-600 hover:bg-violet-500 text-white">
              Voltar ao catálogo
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isFailed = order.status === 'rejected' || order.status === 'failed'
  const isInProgress = order.status === 'pending' || order.status === 'confirming'
  const statusInfo = STATUS_CONFIG[order.status] ?? FAILED_CONFIG

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Navegação superior */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <Link to="/profile" className="text-sm font-medium text-violet-400 hover:underline">
          Ver todos os meus pedidos
        </Link>
      </div>

      {/* Cartão Principal de Status em Tempo Real */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Receipt className="h-4 w-4 text-violet-400" />
              <span>Comprovante Digital #{order.id}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Status da Transação</h1>
          </div>

          <Badge className={`px-3 py-1 text-xs font-semibold border ${statusInfo.badgeClass}`}>
            {isInProgress && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin inline" />}
            {order.status === 'confirmed' && (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 inline" />
            )}
            {isFailed && <XCircle className="mr-1.5 h-3.5 w-3.5 inline" />}
            {statusInfo.label}
          </Badge>
        </div>

        {/* Mensagem explicativa do estágio atual */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 space-y-2">
          <p className="text-sm font-medium text-zinc-200">{statusInfo.description}</p>
          {order.failureReason && (
            <p className="text-xs text-red-400">Motivo técnico: {order.failureReason}</p>
          )}
          <p className="text-xs text-zinc-400 font-mono">
            Carteira de destino: {order.walletAddress} ({order.network})
          </p>
        </div>

        {/* Barra de progresso em 3 etapas (Recebido -> Confirmando -> Concluído) */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
          <div className="space-y-1.5">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white">
              <Check className="h-4 w-4" />
            </div>
            <p className="font-medium text-zinc-200">1. Ordem Criada</p>
          </div>

          <div className="space-y-1.5">
            <div
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                order.status === 'pending'
                  ? 'bg-zinc-800 text-zinc-500'
                  : 'bg-violet-600 text-white'
              }`}
            >
              {order.status === 'confirming' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : order.status === 'confirmed' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </div>
            <p className="font-medium text-zinc-200">2. Validação Rede</p>
          </div>

          <div className="space-y-1.5">
            <div
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                order.status === 'confirmed'
                  ? 'bg-emerald-600 text-white'
                  : isFailed
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {order.status === 'confirmed' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : isFailed ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </div>
            <p className="font-medium text-zinc-200">3. NFT Entregue</p>
          </div>
        </div>

        {/* Hash da Transação (exibido assim que gerado pela rede simulada) */}
        {order.txHash && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                Transaction Hash ({order.network})
              </p>
              <p className="mt-1 truncate font-mono text-xs text-violet-300">{order.txHash}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyTxHash(order.txHash!)}
                className="border-zinc-800 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                {copiedHash ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copiar Hash
                  </>
                )}
              </Button>
              <a
                href={`https://etherscan.io/tx/${order.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800"
                title="Visualizar estrutura no explorador"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Lista de NFTs adquiridos neste pedido */}
        <div className="space-y-3 border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Itens Adquiridos
          </h2>
          <ul className="divide-y divide-zinc-800/80">
            {order.items.map((item) => (
              <li
                key={`${item.nftId}-${item.editionId}`}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-12 w-12 rounded-lg object-cover bg-zinc-800 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-zinc-400">
                      {item.editionName} • Quantidade: {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-zinc-200 shrink-0">
                  {(parseFloat(item.unitPriceEth) * item.quantity).toFixed(4)} ETH
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Resumo financeiro final */}
        <div className="space-y-2 border-t border-zinc-800 pt-4 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>{order.subtotalEth} ETH</span>
          </div>
          {parseFloat(order.discountEth) > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Desconto aplicado</span>
              <span>- {order.discountEth} ETH</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-400">
            <span>Taxa de rede (Gas)</span>
            <span>{order.networkFeeEth} ETH</span>
          </div>
          <div className="flex justify-between border-t border-zinc-800 pt-3 text-lg font-extrabold text-white">
            <span>Total Liquidado</span>
            <span className="text-violet-400">{order.totalEth} ETH</span>
          </div>
        </div>
      </section>
    </div>
  )
}