// src/features/profile/ProfilePage.tsx
import { useEffect, useState, type FormEvent } from 'react' // Hooks de estado, ciclo de vida e formulário
import { Link, useNavigate } from '@tanstack/react-router' // Navegação entre rotas
import { useMutation, useQuery } from '@tanstack/react-query' // Busca e mutação de carteiras, pedidos e favoritos
import axios from 'axios' // Extrai mensagens de erro da API
import {
  CheckCircle2,
  ExternalLink,
  Heart,
  KeyRound,
  Loader2,
  Plus,
  Receipt,
  Save,
  Star,
  Trash2,
  UserCog,
  Wallet as WalletIcon,
} from 'lucide-react' // Ícones da interface
import { toast } from 'sonner' // Notificações flutuantes
import { api } from '@/api/client' // Cliente Axios
import { queryClient } from '@/lib/queryClient' // Cache global do React Query
import { useAuth } from '@/features/auth/AuthContext' // Dados e atualização do usuário autenticado
import { useFavorites } from '@/features/catalog/useFavorites' // Lista e remoção de favoritos
import { Button } from '@/components/ui/button' // Botões estilizados
import { Input } from '@/components/ui/input' // Campos de texto
import { Label } from '@/components/ui/label' // Rótulos acessíveis
import { Badge } from '@/components/ui/badge' // Etiquetas de status e rede
import type { Nft, Order, PaginatedResponse, User, Wallet } from '@/types' // Tipagens do domínio

const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/avataaars/svg?seed=AlexRivera',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=CyberCollector',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=MayaLin',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=NeonVault',
]

export function ProfilePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, refreshUser } = useAuth()
  const { favoriteIds, toggleFavorite } = useFavorites()
  const navigate = useNavigate()

  // Estados do formulário de edição de perfil e avatar
  const [profileName, setProfileName] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)

  // Estados do formulário de alteração de senha
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Estados do formulário para cadastrar uma nova carteira Web3
  const [walletLabel, setWalletLabel] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletNetwork, setWalletNetwork] = useState('ethereum')

  // Sincroniza os campos do formulário assim que o usuário carrega
  useEffect(() => {
    if (user) {
      setProfileName(user.name)
      setProfileAvatarUrl(user.avatarUrl)
    }
  }, [user])

  // Protege a rota: visitantes não autenticados são enviados para o login
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { redirect: '/profile' } })
    }
  }, [isAuthLoading, isAuthenticated, navigate])

  // Busca as carteiras do usuário
  const walletsQuery = useQuery<Wallet[]>({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data } = await api.get<Wallet[]>('/wallets')
      return data
    },
    enabled: isAuthenticated,
  })

  // Busca o histórico de pedidos do usuário
  const ordersQuery = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get<Order[]>('/orders')
      return data
    },
    enabled: isAuthenticated,
  })

  // Busca todos os NFTs para exibir os detalhes dos itens favoritados
  const catalogQuery = useQuery<PaginatedResponse<Nft>>({
    queryKey: ['nfts', 'all-for-favorites'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Nft>>('/nfts', {
        params: { pageSize: 50 },
      })
      return data
    },
    enabled: isAuthenticated && favoriteIds.length > 0,
  })

  // Mutação para atualizar nome e avatar do perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; avatarUrl: string }) => {
      const { data } = await api.patch<User>('/profile', payload)
      return data
    },
    onSuccess: async () => {
      setProfileError(null)
      await refreshUser()
      toast.success('Dados do perfil atualizados com sucesso!')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message ?? 'Não foi possível atualizar o perfil.'
        setProfileError(msg)
        toast.error(msg)
      }
    },
  })

  // Mutação para alterar a senha da conta
  const updatePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      await api.patch('/profile/password', payload)
    },
    onSuccess: () => {
      setPasswordError(null)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Senha alterada com sucesso!')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message ?? 'Não foi possível alterar a senha.'
        setPasswordError(msg)
        toast.error(msg)
      }
    },
  })

  // Mutação para adicionar uma nova carteira
  const addWalletMutation = useMutation({
    mutationFn: async (payload: { label: string; address: string; network: string }) => {
      const { data } = await api.post<Wallet[]>('/wallets', payload)
      return data
    },
    onSuccess: (updatedWallets) => {
      queryClient.setQueryData(['wallets'], updatedWallets)
      setWalletLabel('')
      setWalletAddress('')
      toast.success('Carteira vinculada com sucesso!')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message ?? 'Não foi possível cadastrar a carteira.')
      }
    },
  })

  // Mutação para definir uma carteira como principal (isDefault)
  const setDefaultWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await api.patch<Wallet[]>(`/wallets/${walletId}/default`)
      return data
    },
    onSuccess: (updatedWallets) => {
      queryClient.setQueryData(['wallets'], updatedWallets)
      toast.success('Carteira principal atualizada!')
    },
  })

  // Mutação para remover uma carteira
  const deleteWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await api.delete<Wallet[]>(`/wallets/${walletId}`)
      return data
    },
    onSuccess: (updatedWallets) => {
      queryClient.setQueryData(['wallets'], updatedWallets)
      toast.info('Carteira removida da sua conta.')
    },
  })

  // Valida e envia atualização de nome e avatar
  function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    setProfileError(null)

    if (profileName.trim().length < 2) {
      setProfileError('O nome de exibição deve ter pelo menos 2 caracteres.')
      return
    }

    try {
      if (profileAvatarUrl.trim()) {
        new URL(profileAvatarUrl.trim())
      }
    } catch {
      setProfileError('Informe uma URL válida para a imagem de avatar.')
      return
    }

    updateProfileMutation.mutate({
      name: profileName.trim(),
      avatarUrl: profileAvatarUrl.trim(),
    })
  }

  // Valida e envia alteração de senha
  function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)

    if (!currentPassword) {
      setPasswordError('Informe sua senha atual.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não confere.')
      return
    }

    updatePasswordMutation.mutate({
      currentPassword,
      newPassword,
    })
  }

  // Valida e envia o formulário de nova carteira
  function handleCreateWallet(e: FormEvent) {
    e.preventDefault()

    if (walletLabel.trim().length < 2) {
      toast.error('Informe um apelido para a carteira (ex: MetaMask Principal).')
      return
    }
    if (!walletAddress.trim().startsWith('0x') || walletAddress.trim().length < 10) {
      toast.error('Informe um endereço público válido iniciado por 0x.')
      return
    }

    addWalletMutation.mutate({
      label: walletLabel.trim(),
      address: walletAddress.trim(),
      network: walletNetwork,
    })
  }

  // Enquanto verifica a sessão
  if (isAuthLoading || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-zinc-400">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400 mb-3" />
        <p>Carregando dados da conta...</p>
      </div>
    )
  }

  const wallets = walletsQuery.data ?? []
  const orders = ordersQuery.data ?? []
  const favoriteNfts = (catalogQuery.data?.data ?? []).filter((nft) =>
    favoriteIds.includes(nft.id),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Cabeçalho do Perfil do Colecionador */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex items-center gap-4">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-16 w-16 rounded-2xl border border-violet-500/40 bg-zinc-800 object-cover"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-white">{user.name}</h1>
            <p className="text-sm text-zinc-400">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-center">
            <p className="text-zinc-500">Carteiras</p>
            <p className="text-base font-bold text-white">{wallets.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-center">
            <p className="text-zinc-500">Favoritos</p>
            <p className="text-base font-bold text-rose-400">{favoriteIds.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-center">
            <p className="text-zinc-500">Pedidos</p>
            <p className="text-base font-bold text-violet-400">{orders.length}</p>
          </div>
        </div>
      </section>

      {/* Seção 1: Dados do Perfil, Avatar e Alteração de Senha */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Formulário de Dados Pessoais e Avatar */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCog className="h-5 w-5 text-violet-400" />
            Dados do Colecionador & Avatar
          </h2>
          <p className="text-xs text-zinc-400">
            Personalize seu nome público e imagem de perfil exibidos na plataforma.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
            {profileError && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                {profileError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nome de exibição</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-avatar">URL do Avatar</Label>
              <Input
                id="profile-avatar"
                type="url"
                value={profileAvatarUrl}
                onChange={(e) => setProfileAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs text-zinc-400 block">Ou escolha um avatar rápido:</span>
              <div className="flex items-center gap-2.5">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setProfileAvatarUrl(url)}
                    aria-label={`Selecionar avatar ${idx + 1}`}
                    className={`rounded-xl border p-0.5 transition ${
                      profileAvatarUrl === url
                        ? 'border-violet-500 ring-2 ring-violet-500/40'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Avatar opção ${idx + 1}`}
                      className="h-10 w-10 rounded-lg bg-zinc-800"
                    />
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </div>

        {/* Formulário de Segurança / Troca de Senha */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-400" />
            Alterar Senha
          </h2>
          <p className="text-xs text-zinc-400">
            Atualize sua credencial de acesso. A nova senha passa a valer no próximo login.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3.5" noValidate>
            {passwordError && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                {passwordError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <Button
              type="submit"
              variant="outline"
              disabled={updatePasswordMutation.isPending}
              className="w-full border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800"
            >
              {updatePasswordMutation.isPending ? 'Atualizando senha...' : 'Atualizar Senha'}
            </Button>
          </form>
        </div>
      </section>

      {/* Seção 2: Gestão de Carteiras Web3 */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Formulário de cadastro de nova carteira */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 h-fit">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <WalletIcon className="h-5 w-5 text-violet-400" />
            Vincular Nova Carteira
          </h2>
          <p className="text-xs text-zinc-400">
            Cadastre endereços públicos para receber seus NFTs no momento do checkout.
          </p>

          <form onSubmit={handleCreateWallet} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="wallet-label">Apelido da carteira</Label>
              <Input
                id="wallet-label"
                placeholder="Ex: Ledger Vault"
                value={walletLabel}
                onChange={(e) => setWalletLabel(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wallet-address">Endereço Público (0x...)</Label>
              <Input
                id="wallet-address"
                placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wallet-network">Rede</Label>
              <select
                id="wallet-network"
                value={walletNetwork}
                onChange={(e) => setWalletNetwork(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              >
                <option value="ethereum">Ethereum Mainnet</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum One</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={addWalletMutation.isPending}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Carteira
            </Button>
          </form>
        </div>

        {/* Lista das carteiras cadastradas */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-lg font-bold text-white">Minhas Carteiras</h2>

          {wallets.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
              Nenhuma carteira cadastrada ainda. Use o formulário ao lado para adicionar a primeira.
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{wallet.label}</span>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[11px] uppercase">
                        {wallet.network}
                      </Badge>
                      {wallet.isDefault && (
                        <Badge className="bg-violet-600/20 text-violet-300 text-[11px]">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Principal
                        </Badge>
                      )}
                    </div>
                    <p className="truncate font-mono text-xs text-zinc-400">{wallet.address}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!wallet.isDefault && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultWalletMutation.mutate(wallet.id)}
                        className="border-zinc-700 bg-zinc-950 text-xs text-zinc-200 hover:bg-zinc-800"
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                        Tornar principal
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWalletMutation.mutate(wallet.id)}
                      aria-label={`Remover carteira ${wallet.label}`}
                      className="text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Seção 3: NFTs Favoritados */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-400" />
          Meus Favoritos ({favoriteIds.length})
        </h2>

        {favoriteIds.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
            Você ainda não favoritou nenhum NFT. Explore o catálogo e clique no coração para salvar suas peças preferidas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteNfts.map((nft) => (
              <div
                key={nft.id}
                className="flex items-center gap-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5"
              >
                <img
                  src={nft.imageUrl}
                  alt={nft.title}
                  className="h-16 w-16 rounded-xl object-cover bg-zinc-800 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to="/nft/$nftId"
                    params={{ nftId: nft.id }}
                    className="block truncate font-semibold text-sm text-white hover:text-violet-300"
                  >
                    {nft.title}
                  </Link>
                  <p className="text-xs text-zinc-400">{nft.priceEth} ETH</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavorite({ nftId: nft.id, isFavorite: true })}
                  aria-label={`Desfavoritar ${nft.title}`}
                  className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seção 4: Histórico de Pedidos */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Receipt className="h-5 w-5 text-violet-400" />
          Histórico de Pedidos ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
            Você ainda não realizou nenhuma compra.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-white">#{order.id}</span>
                    <Badge
                      className={
                        order.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : order.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} • Total:{' '}
                    <strong className="text-zinc-200">{order.totalEth} ETH</strong>
                  </p>
                </div>

                <Link to="/orders/$orderId" params={{ orderId: order.id }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 bg-zinc-950 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Ver comprovante
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}