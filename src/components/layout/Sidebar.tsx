import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  PieChart,
  RefreshCw,
  Settings,
  Sparkles,
  Target
} from 'lucide-react'
import { BrandLogo } from '../ui/BrandLogo'
import { useSettings } from '../../context/SettingsContext'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ai', label: 'LoveAI', icon: Sparkles },
  { to: '/transactions', label: 'Transazioni', icon: ArrowLeftRight },
  { to: '/subscriptions', label: 'Abbonamenti', icon: RefreshCw },
  { to: '/budget', label: 'Budget', icon: PieChart },
  { to: '/goals', label: 'Obiettivi', icon: Target },
  { to: '/reports', label: 'Report', icon: BarChart3 }
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function NavItem({ item }: { item: { to: string; label: string; icon: React.ElementType } }): JSX.Element {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-primary-400'
        }`
      }
    >
      <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
      {item.label}
    </NavLink>
  )
}

export function Sidebar(): JSX.Element {
  const { settings } = useSettings()
  const username = settings.username || 'Utente'
  const currency = settings.base_currency || 'EUR'

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-love-card-dark/70">
      <div className="flex h-16 items-center gap-3 border-b border-white/60 px-4 dark:border-white/10">
        <BrandLogo className="h-8 w-8" />
        <span className="font-display text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          MoneyLove
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainNav.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      <div className="border-t border-white/60 p-3 dark:border-white/10">
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-primary-50/70 px-3 py-2.5 dark:bg-white/5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
            {getInitials(username)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{currency}</p>
          </div>
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-primary-400'
            }`
          }
        >
          <Settings className="h-5 w-5 transition-transform group-hover:scale-110" />
          Impostazioni
        </NavLink>
      </div>
    </aside>
  )
}
