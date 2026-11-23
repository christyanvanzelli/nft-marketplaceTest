```markdown
# Arquitetura do Sistema - AetherVault NFT Marketplace

Este documento detalha as decisões estruturais, padrões de projeto, fluxos de dados e estratégias de resiliência implementadas no AetherVault.

---

## 1. Visão Geral da Arquitetura

O projeto adota uma arquitetura modular orientada a features, isolando responsabilidades entre componentes de UI, ganchos de estado global, camada de rede e o motor de simulação.

src/
├── api/              # Cliente HTTP centralizado (Axios)
├── components/       # Componentes globais de UI (Navbar, Layout, Primitivas Shadcn)
├── features/         # Módulos de domínio (Auth, Cart, Catalog, Checkout, Profile)
├── lib/              # Configurações globais (QueryClient, TanStack Router)
├── mocks/            # Handlers do MSW, fixtures e simulação de Socket.IO
└── routes/           # Definição de páginas e rotas tipadas

---

## 2. Camada de Mock e Tempo Real (MSW + Socket.IO)

Para garantir independência de infraestrutura e estabilidade total em ambientes de demonstração e testes automatizados, o **Mock Service Worker (MSW)** intercepta todas as requisições HTTP (`/api/*`) diretamente no navegador e no ambiente de teste.

- **Painel de Simulação (QA / Demo):** O Navbar possui um painel integrado que interage com endpoints de controle (`/__mock/*`), permitindo alternar cenários de rede em tempo real:
  - Latência simulada (redes lentas).
  - Erros HTTP 500 e timeouts (504).
  - Rejeições de pagamento no checkout e cenários de preço alterado.
- **WebSocket / Socket.IO:** Utiliza `@mswjs/socket.io-binding` para simular emissões de eventos ao vivo (como flutuação de preço e estoque de NFTs), testando a reatividade da interface de forma idêntica a um ambiente de produção real.

---

## 3. Gestão de Estado e Ciclo de Vida de Dados

- **Estado Assíncrono & Cache:** Gerenciado inteiramente pelo **TanStack React Query**, garantindo sincronização automática, deduplicação de requisições e mutações otimistas.
- **Autenticação & Sessão:** O `AuthContext` gerencia o ciclo de vida do usuário autenticado, mantendo a persistência de sessão e integrando-se perfeitamente com os guardas de rotas protegidas (como `/profile` e `/checkout`).

---

## 4. Estratégia de Testes E2E e Regressão Visual (Playwright)

A suíte de testes automatizados cobre 9 cenários críticos end-to-end:
1. **Regressão Visual da Vitrine:** Validação de layout, tipografia e tema escuro com mascaramento de imagens dinâmicas.
2. **Busca e Filtros:** Filtragem reativa de ativos no catálogo.
3. **Detalhes do Ativo:** Navegação e seleção de edições limitadas.
4. **Carrinho de Compras:** Adição, persistência e manipulação de itens.
5. **Sistema de Cupons:** Validação de códigos promocionais válidos e rejeição de inválidos.
6. **Ciclo de Autenticação:** Login com contas demo, persistência de sessão após `F5` e logout limpo.
7. **Checkout Idempotente:** Conclusão de compra e emissão de comprovante digital on-chain.
8. **Eventos em Tempo Real:** Disparo e reflexão de eventos Socket.IO na UI.
9. **Área Protegida (`/profile`):** Validação de acesso restrito e integridade dos dados do usuário.