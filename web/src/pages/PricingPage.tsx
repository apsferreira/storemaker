import { useEffect, useState } from 'react';
import { Check, X, Zap, Globe, ShieldCheck, Headphones } from 'lucide-react';

interface Plano {
  id: string;
  slug: string;
  name: string;
  price: string;
  price_cents: number;
  max_products: number;
  custom_domain: boolean;
  support_level: string;
  features: Record<string, boolean>;
}

const supportLabel: Record<string, string> = {
  community: 'Comunidade',
  email: 'Email',
  priority: 'Prioritario',
};

export function PricingPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanos = async () => {
      try {
        const response = await fetch('/api/v1/public/plans');
        const data = await response.json();
        setPlanos(data.data || []);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    fetchPlanos();
  }, []);

  const featuresList = [
    { key: 'frete', label: 'Calculo de frete integrado', icon: Globe },
    { key: 'cupons', label: 'Cupons de desconto', icon: Zap },
    { key: 'whatsapp', label: 'Integracao WhatsApp', icon: ShieldCheck },
    { key: 'crm', label: 'Sistema de CRM', icon: Headphones },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
          <p className="text-sm text-gray-500">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div
        className="py-16 sm:py-20 px-4 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e0a3c 0%, #3b1f6b 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #7c3aed, transparent 60%), radial-gradient(circle at 75% 20%, #a855f7, transparent 50%)' }}
          aria-hidden="true"
        />
        <div className="relative max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 bg-violet-500/20 text-violet-300 text-xs font-semibold px-3 py-1 rounded-full border border-violet-500/30 mb-4">
            <Zap size={12} />
            Precos simples e transparentes
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Escolha o plano certo<br className="hidden sm:block" /> para sua loja
          </h1>
          <p className="text-violet-200/70 text-base sm:text-lg">
            Comece gratis. Cresça sem limites. Cancele quando quiser.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Pricing Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {planos.map((plano) => {
            const isPopular = plano.slug === 'starter';
            const isFree = plano.slug === 'free';

            return (
              <div
                key={plano.id}
                className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
                  isPopular
                    ? 'ring-2 ring-violet-500 shadow-xl shadow-violet-500/10 lg:-translate-y-2'
                    : 'ring-1 ring-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold text-center py-2 tracking-wide uppercase">
                    Mais popular
                  </div>
                )}

                <div className={`p-6 sm:p-8 ${isPopular ? 'bg-white' : 'bg-white'}`}>
                  {/* Plan name */}
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plano.name}</h3>
                  <p className="text-xs text-gray-400 mb-5">
                    {isFree ? 'Para comecar a explorar' : isPopular ? 'Para lojistas em crescimento' : 'Para lojas estabelecidas'}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    {isFree ? (
                      <span className="text-4xl font-bold text-gray-900">Gratis</span>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold text-gray-900 tabular-nums">
                          {plano.price}
                        </span>
                        <span className="text-gray-400 text-sm mb-1">/mes</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <a
                    href={`/admin/signup?plano=${plano.slug}`}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-150 mb-7 ${
                      isPopular
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-500/20'
                        : isFree
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isFree ? 'Comecar Gratis' : 'Comecar agora'}
                  </a>

                  {/* Key highlights */}
                  <div className="space-y-1 mb-5 pb-5 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={14} className="text-violet-500 shrink-0" />
                      Ate {plano.max_products.toLocaleString('pt-BR')} produtos
                    </div>
                    {plano.custom_domain && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Check size={14} className="text-violet-500 shrink-0" />
                        Dominio customizado
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={14} className="text-violet-500 shrink-0" />
                      Suporte {supportLabel[plano.support_level] || plano.support_level}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5">
                    {featuresList.map((f) => {
                      const has = plano.features?.[f.key] || false;
                      return (
                        <div key={f.key} className="flex items-center gap-2.5">
                          {has ? (
                            <Check size={14} className="text-violet-500 shrink-0" />
                          ) : (
                            <X size={14} className="text-gray-300 shrink-0" />
                          )}
                          <span className={`text-sm ${has ? 'text-gray-700' : 'text-gray-400'}`}>
                            {f.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-center mb-16 py-8 border-y border-gray-100">
          {[
            { label: 'Lojas ativas', value: '500+' },
            { label: 'Pedidos processados', value: '12k+' },
            { label: 'Uptime', value: '99.9%' },
            { label: 'Suporte medio', value: '< 2h' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Duvidas frequentes</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Posso mudar de plano a qualquer momento?',
                a: 'Sim. Upgrade ou downgrade entram em vigor no proximo periodo de cobranca, sem multa ou burocracia.',
              },
              {
                q: 'O plano Free tem alguma restricao?',
                a: 'O plano Free permite ate 10 produtos e suporte via comunidade. Para mais recursos, escolha Starter ou Pro.',
              },
              {
                q: 'Qual o diferencial do Starter?',
                a: 'O Starter oferece 200 produtos, dominio customizado e suporte por email — ideal para lojistas que querem crescer sem compromisso.',
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
