// src/features/auth/LoginPage.tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { toast } from 'sonner'
import { KeyRound, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginPageProps {
  redirectTo?: string
}

export function LoginPage({ redirectTo = '/' }: LoginPageProps) {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.includes('@') || password.length < 6) {
      setError('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email, password)
      toast.success('Sessão iniciada com sucesso!')
      navigate({ to: redirectTo || '/' })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Não foi possível entrar. Verifique suas credenciais.')
      } else {
        setError('Erro inesperado ao autenticar.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function fillDemoAccount(demoEmail: string, demoPass: string) {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError(null)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/90 text-zinc-100 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Entrar na conta</CardTitle>
          <CardDescription className="text-zinc-400">
            Acesse seu cofre de NFTs, carteiras e histórico de compras
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="alex@collector.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            {/* Atalhos para contas fictícias de demonstração */}
            <div className="pt-2 border-t border-zinc-800/80">
              <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                Contas de demonstração (clique para preencher):
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemoAccount('alex@collector.io', 'Collector@123')}
                  className="border-zinc-800 bg-zinc-950/60 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  Alex Rivera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemoAccount('maya@vault.io', 'Vault@123')}
                  className="border-zinc-800 bg-zinc-950/60 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  Maya Lin
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-zinc-800/80 pt-4">
            <p className="text-sm text-zinc-400">
              Ainda não tem conta?{' '}
              <Link to="/register" className="font-medium text-violet-400 hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}