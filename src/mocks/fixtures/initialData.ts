// src/mocks/fixtures/initialData.ts
import type { Nft, User, Wallet } from '@/types'

export interface MockUserRecord extends User {
  passwordHash: string // não armazenamos senha em texto puro
}

export const INITIAL_USERS: MockUserRecord[] = [
  {
    id: 'user-1',
    name: 'Alex Rivera',
    email: 'alex@collector.io',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AlexRivera',
    passwordHash: 'Collector@123',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Maya Lin',
    email: 'maya@vault.io',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=MayaLin',
    passwordHash: 'Vault@123',
    createdAt: '2026-02-10T14:30:00.000Z',
  },
]

export const INITIAL_WALLETS: Wallet[] = [
  {
    id: 'wallet-1',
    userId: 'user-1',
    label: 'Cofre Principal',
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    network: 'ethereum',
    isDefault: true,
  },
  {
    id: 'wallet-2',
    userId: 'user-1',
    label: 'Carteira L2 Rápida',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    network: 'polygon',
    isDefault: false,
  },
]

export const INITIAL_COUPONS: Record<
  string,
  { discountPercent: number; status: 'valid' | 'expired' }
> = {
  WELCOME10: { discountPercent: 10, status: 'valid' },
  VIP20: { discountPercent: 20, status: 'valid' },
  OLD2025: { discountPercent: 15, status: 'expired' },
}

export const INITIAL_NFTS: Nft[] = [
  {
    id: 'nft-01',
    title: 'Cyber Samurai #042',
    description: 'Guerreiro cibernético forjado nas ruínas de Neo-Tóquio com armadura reativa.',
    creator: 'Kaito Studio',
    collection: 'Neo Bushido',
    category: 'Art',
    imageUrl: 'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=800&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    ],
    priceEth: '0.4500',
    editions: [
      { id: 'ed-01-std', name: 'Standard', priceEth: '0.4500', available: 5, total: 10 },
      { id: 'ed-01-gold', name: 'Gold Edition', priceEth: '1.2000', available: 1, total: 2 },
    ],
    featured: true,
    createdAt: '2026-10-01T12:00:00.000Z',
    version: 1,
  },
  {
    id: 'nft-02',
    title: 'Astral Drift #009',
    description: 'Exploração abstrata de nebulosas e ondas gravitacionais em alta resolução.',
    creator: 'Elena Vance',
    collection: 'Deep Cosmos',
    category: 'Photography',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    gallery: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'],
    priceEth: '0.2500',
    editions: [
      { id: 'ed-02-std', name: 'Standard', priceEth: '0.2500', available: 8, total: 15 },
    ],
    featured: true,
    createdAt: '2026-10-05T15:00:00.000Z',
    version: 1,
  },
  {
    id: 'nft-03',
    title: 'Mecha Core Genesis',
    description: 'Unidade de combate autônoma utilizável no metaverso Mecha Arena.',
    creator: 'Forge Labs',
    collection: 'Mecha Arena',
    category: 'Gaming',
    imageUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80',
    gallery: ['https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80'],
    priceEth: '0.8000',
    editions: [
      { id: 'ed-03-std', name: 'Standard', priceEth: '0.8000', available: 3, total: 5 },
      { id: 'ed-03-rare', name: 'Founder 1/1', priceEth: '2.5000', available: 0, total: 1 }, // esgotada para teste
    ],
    featured: true,
    createdAt: '2026-10-10T09:00:00.000Z',
    version: 1,
  },
  {
    id: 'nft-04',
    title: 'Synthwave Pulse 84',
    description: 'Faixa generativa audiovisual com sintetizadores analógicos dos anos 80.',
    creator: 'Neon Waves',
    collection: 'Retro Beats',
    category: 'Music',
    imageUrl: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80',
    gallery: ['https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80'],
    priceEth: '0.1500',
    editions: [
      { id: 'ed-04-std', name: 'Standard', priceEth: '0.1500', available: 12, total: 20 },
    ],
    featured: false,
    createdAt: '2026-10-12T18:20:00.000Z',
    version: 1,
  },
  {
    id: 'nft-05',
    title: 'Golden Ape Relic',
    description: 'Artefato colecionável comemorativo da primeira temporada.',
    creator: 'Kaito Studio',
    collection: 'Neo Bushido',
    category: 'Collectibles',
    imageUrl: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=800&q=80',
    gallery: ['https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=800&q=80'],
    priceEth: '1.5000',
    editions: [
      { id: 'ed-05-std', name: 'Standard', priceEth: '1.5000', available: 2, total: 3 },
    ],
    featured: false,
    createdAt: '2026-10-15T11:10:00.000Z',
    version: 1,
  },
  {
    id: 'nft-06',
    title: 'Liquid Chrome #18',
    description: 'Escultura digital reflexiva renderizada em tempo real.',
    creator: 'Elena Vance',
    collection: 'Deep Cosmos',
    category: 'Art',
    imageUrl: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=800&q=80',
    gallery: ['https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=800&q=80'],
    priceEth: '0.3200',
    editions: [
      { id: 'ed-06-std', name: 'Standard', priceEth: '0.3200', available: 6, total: 10 },
    ],
    featured: false,
    createdAt: '2026-10-18T14:00:00.000Z',
    version: 1,
  },
  {
    id: 'nft-07',
    title: 'Void Walker Helmet',
    description: 'Equipamento lendário cosmético com rastros de partículas.',
    creator: 'Forge Labs',
    collection: 'Mecha Arena',
    category: 'Gaming',
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    gallery: ['https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80'],
    priceEth: '0.5500',
    editions: [
      { id: 'ed-07-std', name: 'Standard', priceEth: '0.5500', available: 4, total: 8 },
    ],
    featured: false,
    createdAt: '2026-10-20T08:45:00.000Z',
    version: 1,
  },
  {
    id: 'nft-08',
    title: 'Solitude in Tokyo',
    description: 'Registro noturno em longa exposição sob chuva neon.',
    creator: 'Neon Waves',
    collection: 'Retro Beats',
    category: 'Photography',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
    gallery: ['https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80'],
    priceEth: '0.1800',
    editions: [
      { id: 'ed-08-std', name: 'Standard', priceEth: '0.1800', available: 9, total: 12 },
    ],
    featured: false,
    createdAt: '2026-10-22T21:00:00.000Z',
    version: 1,
  },
]