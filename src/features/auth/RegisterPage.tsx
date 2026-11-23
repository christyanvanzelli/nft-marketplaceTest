// src/features/auth/RegisterPage.tsx
import { useState, type FormEvent } from 'react' // Hooks de estado e tipagem de evento de formulário do React
import { Link, useNavigate } from '@tanstack/react-router' // Link de navegação e função para redirecionar via código
import axios from 'axios' // Usado para identificar se o erro veio de uma resposta HTTP da API
import { toast } from 'sonner' // Biblioteca de notificações flutuantes (toasts)
import { Loader2, UserPlus } from 'lucide-react' // Ícones de carregamento e cadastro
import { useAuth } from './AuthContext' // Hook do nosso contexto de autenticação
import { Button } from '@/components/ui/button' // Componente de botão do Shadcn/UI
import { Input } from '@/components/ui/input' // Componente de campo de texto do Shadcn/UI
import { Label } from '@/components/ui/label' // Componente de rótulo acessível para inputs
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card' // Componentes de cartão

export function RegisterPage() {
  // Pega a função register do nosso AuthContext
  const { register } = useAuth()
  // Hook para navegar para outra rota após criar a conta
  const navigate = useNavigate()

  // Estados controlados para cada campo do formulário
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Estado para exibir mensagens de erro de validação ou da API
  const [error, setError] = useState<string | null>(null)
  // Estado para bloquear o formulário enquanto a requisição está em andamento
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Função executada ao enviar o formulário
  async function handleSubmit(e: FormEvent) {
    e.preventDefault() // Impede o navegador de recarregar a página
    setError(null) // Limpa erros anteriores

    // Validações locais antes de chamar a API
    if (name.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres.')
      return
    }
    if (!email.includes('@')) {
      setError('Informe um endereço de e-mail válido.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.')
      return
    }

    setIsSubmitting(true) // Ativa estado de carregamento
    try {
      // Chama a API de cadastro e já inicia a sessão automaticamente
      await register(name, email, password)
      toast.success('Conta criada com sucesso! Bem-vindo(a).')
      // Redireciona para o catálogo principal
      navigate({ to: '/' })
    } catch (err) {
      // Trata erros vindos da API (ex: 409 Conflict se o e-mail já existir)
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Não foi possível concluir o cadastro.')
      } else {
        setError('Erro inesperado ao criar conta.')
      }
    } finally {
      // Libera o botão independente de sucesso ou erro
      setIsSubmitting(false)
    }
  }

  return (
    // Centraliza o cartão vertical e horizontalmente na tela
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/90 text-zinc-100 shadow-2xl">
        {/* Cabeçalho do cartão */}
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Criar nova conta</CardTitle>
          <CardDescription className="text-zinc-400">
            Cadastre-se para favoritar peças, gerenciar carteiras e colecionar NFTs
          </CardDescription>
        </CardHeader>

        {/* Formulário com noValidate para usarmos nossas próprias mensagens de erro */}
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {/* Caixa de alerta exibida apenas quando houver mensagem de erro */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            {/* Campo Nome */}
            <div className="space-y-2">
              <Label htmlFor="reg-name">Nome completo</Label>
              <Input
                id="reg-name"
                type="text"
                placeholder="Ex: Jordan Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            {/* Campo E-mail */}
            <div className="space-y-2">
              <Label htmlFor="reg-email">E-mail</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <Label htmlFor="reg-password">Senha</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            {/* Campo Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="reg-confirm">Confirmar senha</Label>
              <Input
                id="reg-confirm"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            {/* Botão principal de envio */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </CardContent>

          {/* Rodapé com link de volta para o Login */}
          <CardFooter className="flex justify-center border-t border-zinc-800/80 pt-4">
            <p className="text-sm text-zinc-400">
              Já possui uma conta?{' '}
              <Link to="/login" search={{ redirect: '/' }} className="font-medium text-violet-400 hover:underline">
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}