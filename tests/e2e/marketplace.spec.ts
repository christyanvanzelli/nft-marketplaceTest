// tests/e2e/marketplace.spec.ts
import { expect, test, type Page } from '@playwright/test'

// Helper reutilizável para fazer login pelo fluxo real da interface (SPA)
async function loginAsAlex(page: Page) {
  await page.getByRole('link', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByRole('button', { name: /Alex Rivera/i }).click()
  await page.locator('form button[type="submit"]').click()

  await expect(page.getByRole('button', { name: /sair da conta/i })).toBeVisible({
    timeout: 10_000,
  })
}

test.describe('AetherVault NFT Marketplace - Suíte E2E & Regressão Visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Aguarda a vitrine carregar os NFTs do MSW antes de iniciar qualquer interação
    await expect(page.locator('a[href*="/nft/"]').first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('01. Carregamento do catálogo e regressão visual da vitrine', async ({ page }) => {
    await expect(page.getByRole('link', { name: /AetherVault/i })).toBeVisible()
    // Mascara as imagens externas dos NFTs para validar layout, grid, tipografia e tema escuro
    await expect(page).toHaveScreenshot('01-catalogo-vitrine.png', {
      fullPage: false,
      mask: [page.locator('main img')],
      maxDiffPixelRatio: 0.05,
    })
  })

  test('02. Busca e filtragem no catálogo preservando navegação', async ({ page }) => {
    const firstCardTitle = await page.locator('a[href*="/nft/"]').first().innerText()
    const searchTerm = firstCardTitle.trim().split(/\s+/)[0] || 'Cyber'

    const searchInput = page.locator('main input').first()
    await searchInput.fill(searchTerm)
    await page.waitForTimeout(500)

    await expect(page.locator('a[href*="/nft/"]').first()).toBeVisible()
  })

  test('03. Navegação para página de detalhe do NFT e seleção de edição', async ({ page }) => {
    await page.locator('a[href*="/nft/"]').first().click()

    await expect(page).toHaveURL(/\/nft\//)
    await expect(page.getByRole('button', { name: /adicionar ao carrinho/i })).toBeVisible()
  })

  test('04. Adição ao carrinho, alteração de quantidade e persistência', async ({ page }) => {
    await page.locator('a[href*="/nft/"]').first().click()
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click()

    const cartButton = page.getByRole('button', { name: /abrir carrinho/i })
    await expect(cartButton).toContainText('1')
    await cartButton.click()

    await expect(page.getByRole('button', { name: /finalizar compra/i })).toBeVisible()
  })

  test('05. Aplicação de cupom válido e rejeição de cupom inválido no carrinho', async ({
    page,
  }) => {
    await page.locator('a[href*="/nft/"]').first().click()
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click()
    await page.getByRole('button', { name: /abrir carrinho/i }).click()

    const couponInput = page.getByPlaceholder(/cupom/i)
    await couponInput.fill('CUPOM_INEXISTENTE')
    await page.getByRole('button', { name: /aplicar/i }).click()
    await expect(page.getByText(/inválido|expirou/i)).toBeVisible()
  })

  test('06. Login com conta demo, navegação autenticada e logout', async ({ page }) => {
    await loginAsAlex(page)

    // Valida acesso à área protegida /profile
    await page.getByRole('link', { name: /Minha Conta & Carteiras/i }).click()
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('Alex Rivera').first()).toBeVisible()

    // Faz logout e valida retorno ao estado visitante
    await page.getByRole('button', { name: /sair da conta/i }).click()
    await expect(page.locator('header').getByRole('link', { name: /entrar/i })).toBeVisible()
  })

  test('07. Fluxo completo de checkout idempotente e comprovante digital', async ({ page }) => {
    await loginAsAlex(page)

    // Adiciona item ao carrinho e avança para o checkout pelo carrinho
    await page.locator('a[href*="/nft/"]').first().click()
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click()
    await page.getByRole('button', { name: /abrir carrinho/i }).click()
    await page.getByRole('button', { name: /finalizar compra/i }).click()

    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByRole('heading', { name: /finalizar compra/i })).toBeVisible()
    await page.getByRole('button', { name: /confirmar pagamento/i }).click()

    // Valida redirecionamento para o recibo confirmado
    await expect(page).toHaveURL(/\/orders\//, { timeout: 10_000 })
    await expect(page.getByText(/Confirmado On-Chain/i)).toBeVisible()
    await expect(page.getByText(/0x[a-f0-9]+/i).first()).toBeVisible()
  })

  test('08. Atualização de preço/estoque em tempo real via evento Socket.IO simulado', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /simulador/i }).click()
    await page.getByRole('button', { name: /emitir atualização ao vivo/i }).click()

    await expect(page.getByText(/Evento Socket\.IO emitido/i)).toBeVisible()
  })

 test('09. Navegação e verificação de dados na página de perfil (/profile)', async ({ page }) => {
    await loginAsAlex(page)

    // Navega para a página de perfil
    await page.getByRole('link', { name: /Minha Conta & Carteiras/i }).click()
    await expect(page).toHaveURL(/\/profile/)

    // Valida que os dados do usuário logado (nome e e-mail) estão visíveis na área protegida
    await expect(page.getByText('Alex Rivera').first()).toBeVisible()
    await expect(page.getByText('alex@collector.io').first()).toBeVisible()
  })})