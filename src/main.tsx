// src/main.tsx
import { StrictMode } from 'react' // Modo estrito do React para detectar problemas em desenvolvimento
import { createRoot } from 'react-dom/client' // Função que monta a aplicação React na árvore DOM
import './index.css' // Estilos globais e tema escuro do Tailwind
import App from './App' // Componente raiz com roteador e provedores

// Função assíncrona que inicia o Mock Service Worker antes de renderizar a interface (dev e produção)
async function enableMocking() {
  const { worker } = await import('./mocks/browser')

  return worker.start({
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
    onUnhandledRequest: 'bypass',
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})