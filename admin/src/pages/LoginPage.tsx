import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Store } from 'lucide-react'
import { sanitize } from '@/lib/utils'

const AUTH_URL = import.meta.env.VITE_AUTH_URL || '/api/v1/auth/login'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitize(email),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Credenciais invalidas')
        return
      }

      login(data.token || data.access_token)
      navigate('/')
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1458 50%, #3b1f6b 100%)' }}
    >
      {/* Background decoration */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }}
        aria-hidden="true"
      />

      <div className="w-full max-w-sm relative">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-violet-900/50">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Storemake</h1>
          <p className="text-sm text-violet-300/70 mt-1">Painel de gestao da loja</p>
        </div>

        {/* Form */}
        <div className="bg-white/95 backdrop-blur-sm p-7 rounded-2xl shadow-2xl shadow-black/30 border border-white/10 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">!</span>
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@loja.com"
            required
            autoComplete="email"
          />

          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button type="submit" loading={loading} className="w-full mt-1">
            Entrar no painel
          </Button>
        </div>

        <p className="text-center text-xs text-violet-300/40 mt-6">
          Storemake &copy; {new Date().getFullYear()} — Instituto Itinerante
        </p>
      </div>
    </div>
  )
}
