import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ordersApi, productsApi, stockApi } from '@/api/endpoints'
import { formatCents, formatDate } from '@/lib/utils'
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Order, Product } from '@/types'

function MetricCard({
  label,
  value,
  icon: Icon,
  gradient,
  subtitle,
  trend,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  gradient: string
  subtitle?: string
  trend?: { value: string; positive: boolean }
}) {
  return (
    <Card className="relative overflow-hidden animate-fade-in">
      {/* Decorative blob */}
      <div
        className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 ${gradient}`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-xs font-medium mt-1.5 ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.positive ? '+' : ''}{trend.value}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${gradient} shadow-sm shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </Card>
  )
}

function orderStatusBadge(status: string) {
  const map: Record<string, { variant: 'warning' | 'info' | 'success' | 'danger' | 'default'; label: string }> = {
    pendente: { variant: 'warning', label: 'Pendente' },
    pago: { variant: 'info', label: 'Pago' },
    preparando: { variant: 'info', label: 'Preparando' },
    enviado: { variant: 'info', label: 'Enviado' },
    entregue: { variant: 'success', label: 'Entregue' },
    cancelado: { variant: 'danger', label: 'Cancelado' },
  }
  const s = map[status] || { variant: 'default' as const, label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function DashboardPage() {
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'dashboard'],
    queryFn: () => ordersApi.list({ per_page: 100 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'dashboard'],
    queryFn: () => productsApi.list({ per_page: 100 }),
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['stock', 'low'],
    queryFn: () => stockApi.lowStock(),
  })

  const orders = ordersData?.data || []
  const products = productsData?.data || []
  const lowStock = lowStockData?.data || []

  const pendingOrders = orders.filter((o: Order) => o.status === 'pendente' || o.status === 'pago')
  const todayOrders = orders.filter((o: Order) => {
    const d = new Date(o.created_at)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })
  const todayRevenue = todayOrders.reduce((sum: number, o: Order) => sum + o.total_cents, 0)
  const monthRevenue = orders.reduce((sum: number, o: Order) => {
    const d = new Date(o.created_at)
    const now = new Date()
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      return sum + o.total_cents
    }
    return sum
  }, 0)

  // Sales chart data (last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dayStr = date.toDateString()
    const dayOrders = orders.filter((o: Order) => new Date(o.created_at).toDateString() === dayStr)
    const total = dayOrders.reduce((s: number, o: Order) => s + o.total_cents, 0)
    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      vendas: total / 100,
    }
  })

  const recentOrders = [...orders]
    .sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Vendas Hoje"
          value={formatCents(todayRevenue)}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          subtitle={`${todayOrders.length} pedido${todayOrders.length !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Vendas no Mes"
          value={formatCents(monthRevenue)}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <MetricCard
          label="Pedidos Pendentes"
          value={pendingOrders.length}
          icon={ShoppingCart}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          subtitle={pendingOrders.length > 0 ? 'Aguardando acao' : 'Tudo em dia'}
        />
        <MetricCard
          label="Estoque Baixo"
          value={lowStock.length}
          icon={AlertTriangle}
          gradient={lowStock.length > 0
            ? 'bg-gradient-to-br from-red-500 to-rose-600'
            : 'bg-gradient-to-br from-gray-400 to-gray-500'}
          subtitle={lowStock.length > 0 ? 'Reposicao necessaria' : 'Estoque saudavel'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Vendas — ultimos 7 dias</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) =>
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
                  }
                />
                <Bar dataKey="vendas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent orders */}
        <Card>
          <h3 className="text-sm font-medium text-muted mb-4">Pedidos Recentes</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Nenhum pedido ainda</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: Order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-muted">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCents(order.total_cents)}</p>
                    {orderStatusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-sm font-medium text-gray-900">Produtos com Estoque Baixo</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((p: Product) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-muted">{p.sku || 'Sem SKU'}</p>
                </div>
                <Badge variant="warning">{p.stock_quantity} un.</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Products summary */}
      <Card>
        <h3 className="text-sm font-medium text-muted mb-2">Catalogo</h3>
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            <p className="text-xs text-muted">produtos cadastrados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {products.filter((p: Product) => p.is_active).length}
            </p>
            <p className="text-xs text-muted">ativos</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
