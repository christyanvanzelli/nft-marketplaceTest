// src/main.tsx
import { StrictMode } from 'react' // Modo estrito do React para detectar problemas em desenvolvimento
import { createRoot } from 'react-dom/client' // Função que monta a aplicação React na árvore DOM
import './index.css' // Estilos globais e tema escuro do Tailwind
import App from './App' // Componente raiz com roteador e provedores

// Função assíncrona que inicia o Mock Service Worker antes de renderizar a interface
async function enableMocking() {
  // Importa o worker configurado na pasta mocks
  const { worker } = await import('./mocks/browser')

  // Inicia o Service Worker interceptando as chamadas /api/* sem bloquear recursos estáticos
  return worker.start({
    onUnhandledRequest: 'bypass',
  })
}

// Aguarda o MSW ficar pronto e só então monta o React na div #root
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})