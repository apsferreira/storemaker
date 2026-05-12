import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Store, ArrowLeft, Mail, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { sanitize } from '@/lib/utils'

const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? 'https://auth.institutoitinerante.com.br'
const API_BASE = '/api/v1'

type Step = 'email' | 'otp' | 'store'

interface PlanInfo {
  slug: string
  label: string
  price: string
}

const PLANS: Record<string, PlanInfo> = {
  free: { slug: 'free', label: 'Free', price: 'Grátis' },
  starter: { slug: 'starter', label: 'Starter', price: 'R$ 79/mês' },
  pro: { slug: 'pro', label: 'Pro', price: 'R$ 149/mês' },
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function SignupPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  const planParam = searchParams.get('plano') ?? 'free'
  const selectedPlan = PLANS[planParam] ?? PLANS.free

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // ── Etapa 1: solicitar OTP ──────────────────────────────────────────────────
  async function handleRequestOTP(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${AUTH_URL}/api/v1/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitize(email), channel: 'email' }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar código. Tente novamente.')
        return
      }

      setOtpSent(true)
      setStep('otp')
      startResendCooldown()
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function startResendCooldown() {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleResendOTP() {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${AUTH_URL}/api/v1/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitize(email), channel: 'email' }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao reenviar código.')
        return
      }
      startResendCooldown()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  // ── Etapa 2: verificar OTP ──────────────────────────────────────────────────
  async function handleVerifyOTP(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (otpCode.length !== 6) {
      setError('O código deve ter 6 dígitos.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${AUTH_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitize(email), code: otpCode }),
      })

      const data = await res.json() as { access_token?: string; error?: string }

      if (!res.ok) {
        setError('Código inválido ou expirado. Verifique e tente novamente.')
        return
      }

      setAuthToken(data.access_token ?? '')
      setStep('store')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Slug: check de disponibilidade (debounced via onBlur) ───────────────────
  async function checkSlug(value: string) {
    if (!value || value.length < 3) {
      setSlugAvailable(null)
      return
    }
    setSlugChecking(true)
    try {
      const res = await fetch(`${API_BASE}/public/check-slug?slug=${encodeURIComponent(value)}`)
      const data = await res.json() as { available: boolean }
      setSlugAvailable(data.available)
    } catch {
      setSlugAvailable(null)
    } finally {
      setSlugChecking(false)
    }
  }

  function handleStoreNameChange(value: string) {
    setStoreName(value)
    const generated = slugify(value)
    setSlug(generated)
    setSlugAvailable(null)
  }

  function handleSlugChange(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
    setSlug(normalized)
    setSlugAvailable(null)
  }

  // ── Etapa 3: criar loja ─────────────────────────────────────────────────────
  async function handleCreateStore(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!storeName.trim()) {
      setError('O nome da loja é obrigatório.')
      return
    }
    if (slug.length < 3) {
      setError('O slug deve ter pelo menos 3 caracteres.')
      return
    }
    if (slugAvailable === false) {
      setError('Esse slug já está em uso. Escolha outro.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/public/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          store_name: sanitize(storeName),
          slug,
          plan_slug: selectedPlan.slug,
        }),
      })

      const data = await res.json() as {
        token?: string
        store_id?: string
        slug?: string
        error?: string
      }

      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar loja. Tente novamente.')
        return
      }

      if (!data.token) {
        setError('Erro inesperado. Tente novamente.')
        return
      }

      login(data.token)
      navigate('/', { replace: true })
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1458 50%, #3b1f6b 100%)' }}
    >
      {/* Decoração de fundo */}
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
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-violet-900/50">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Storemake</h1>
          <p className="text-sm text-violet-300/70 mt-1">Crie sua loja em minutos</p>
        </div>

        {/* Plano selecionado */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="text-xs text-violet-300/60">Plano:</span>
          <span className="inline-flex items-center gap-1 bg-violet-500/20 text-violet-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-violet-500/30">
            {selectedPlan.label} — {selectedPlan.price}
          </span>
          <Link
            to={`/signup?plano=${planParam}`}
            className="text-xs text-violet-400/60 hover:text-violet-300 transition-colors"
            aria-label="Alterar plano"
          >
            alterar
          </Link>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6" aria-label="Etapas do cadastro">
          {(['email', 'otp', 'store'] as Step[]).map((s, i) => {
            const stepIndex = ['email', 'otp', 'store'].indexOf(step)
            const isDone = i < stepIndex
            const isCurrent = s === step
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={[
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isDone
                      ? 'bg-violet-500 text-white'
                      : isCurrent
                        ? 'bg-white text-violet-700'
                        : 'bg-white/10 text-white/40',
                  ].join(' ')}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isDone ? <Check size={12} /> : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={['w-8 h-px transition-colors', isDone ? 'bg-violet-500' : 'bg-white/20'].join(' ')}
                    aria-hidden="true"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Card do formulário */}
        <div className="bg-white/95 backdrop-blur-sm p-7 rounded-2xl shadow-2xl shadow-black/30 border border-white/10 space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2"
            >
              <span className="shrink-0 mt-0.5" aria-hidden="true">!</span>
              <span>{error}</span>
            </div>
          )}

          {/* Etapa 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleRequestOTP} noValidate>
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-0.5">Informe seu email</h2>
                <p className="text-xs text-gray-400">Vamos enviar um código de 6 dígitos para confirmar.</p>
              </div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                autoComplete="email"
                autoFocus
              />
              <Button
                type="submit"
                loading={loading}
                className="w-full mt-4"
                aria-label="Enviar código de verificação"
              >
                <Mail size={15} aria-hidden="true" />
                Enviar código
              </Button>
              <p className="text-center text-xs text-gray-400 mt-4">
                Já tem conta?{' '}
                <Link to="/login" className="text-violet-600 hover:underline font-medium">
                  Entrar
                </Link>
              </p>
            </form>
          )}

          {/* Etapa 2: OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} noValidate>
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtpCode(''); setError('') }}
                  className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 mb-3 transition-colors"
                  aria-label="Voltar para email"
                >
                  <ArrowLeft size={12} aria-hidden="true" />
                  Voltar
                </button>
                <h2 className="text-base font-bold text-gray-900 mb-0.5">Código enviado!</h2>
                <p className="text-xs text-gray-400">
                  Digite o código de 6 dígitos enviado para{' '}
                  <span className="font-medium text-gray-600">{email}</span>
                </p>
              </div>
              <Input
                label="Código de verificação"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                autoFocus
              />
              <Button
                type="submit"
                loading={loading}
                className="w-full mt-4"
                disabled={otpCode.length !== 6}
              >
                Verificar código
              </Button>
              <div className="text-center mt-3">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-gray-400">
                    Reenviar em {resendCooldown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-xs text-violet-600 hover:underline disabled:opacity-50 transition-colors"
                  >
                    Reenviar código
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Etapa 3: Dados da loja */}
          {step === 'store' && (
            <form onSubmit={handleCreateStore} noValidate>
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-0.5">Configure sua loja</h2>
                <p className="text-xs text-gray-400">Escolha um nome e endereço para sua loja.</p>
              </div>

              <Input
                label="Nome da loja"
                type="text"
                value={storeName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                placeholder="Ex: Minha Loja Bonita"
                required
                maxLength={100}
                autoFocus
              />

              <div className="mt-3 space-y-1">
                <label htmlFor="slug-input" className="block text-sm font-medium text-gray-700">
                  Endereço da loja
                </label>
                <div className="relative">
                  <input
                    id="slug-input"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    onBlur={() => checkSlug(slug)}
                    placeholder="minha-loja"
                    maxLength={48}
                    required
                    className={[
                      'w-full rounded-lg border px-3 py-2 text-sm pr-8',
                      'placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      slugAvailable === false
                        ? 'border-red-400'
                        : slugAvailable === true
                          ? 'border-green-400'
                          : 'border-border',
                    ].join(' ')}
                    aria-describedby="slug-hint"
                    aria-invalid={slugAvailable === false}
                  />
                  {slugChecking && (
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin"
                      aria-label="Verificando disponibilidade"
                    />
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <Check
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
                      aria-label="Slug disponível"
                    />
                  )}
                </div>
                <p id="slug-hint" className={[
                  'text-xs',
                  slugAvailable === false ? 'text-red-500' : 'text-gray-400',
                ].join(' ')}>
                  {slugAvailable === false
                    ? 'Esse endereço já está em uso. Tente outro.'
                    : slugAvailable === true
                      ? 'Disponível!'
                      : `Sua loja ficará em: storemake.com.br/${slug || '...'}`}
                </p>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-5"
                disabled={slugAvailable === false || slug.length < 3}
              >
                Criar minha loja
              </Button>
            </form>
          )}
        </div>

        {otpSent && step !== 'otp' && step !== 'store' && (
          <p className="text-center text-xs text-violet-300/40 mt-3">
            Codigo enviado. Verifique sua caixa de entrada.
          </p>
        )}

        <p className="text-center text-xs text-violet-300/40 mt-5">
          Storemake &copy; {new Date().getFullYear()} — Instituto Itinerante
        </p>
      </div>
    </div>
  )
}
