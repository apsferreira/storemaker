import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  X,
  Store,
  Warehouse,
  ToggleLeft,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/estoque', label: 'Estoque', icon: Warehouse },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/cupons', label: 'Cupons', icon: Tag },
  { to: '/modulos', label: 'Modulos', icon: ToggleLeft },
  { to: '/relatorios', label: 'Relatorios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { logout } = useAuth()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64',
          'flex flex-col transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'linear-gradient(160deg, #1e0a3c 0%, #2d1458 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Store size={16} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white leading-none block">Storemake</span>
              <span className="text-[10px] text-violet-300 leading-none">Painel Admin</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-violet-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-violet-600/40 text-white shadow-sm border border-violet-500/20'
                    : 'text-violet-200/70 hover:bg-white/5 hover:text-violet-100'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={17}
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-violet-300' : 'text-violet-400/60 group-hover:text-violet-300'
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Upgrade hint */}
        <div className="mx-3 mb-3 p-3 rounded-lg bg-violet-600/20 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} className="text-violet-300" />
            <span className="text-xs font-semibold text-white">Upgrade para Pro</span>
          </div>
          <p className="text-[11px] text-violet-300/70 leading-relaxed">
            Dominio customizado, WhatsApp e CRM ilimitado.
          </p>
        </div>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-violet-200/60 hover:bg-white/5 hover:text-violet-100 w-full transition-all"
          >
            <LogOut size={17} className="shrink-0" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
