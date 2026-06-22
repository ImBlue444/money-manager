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

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ai', label: 'LoveAI', icon: Sparkles },
  { to: '/transactions', label: 'Transazioni', icon: ArrowLeftRight },
  { to: '/subscriptions', label: 'Abbonamenti', icon: RefreshCw },
  { to: '/budget', label: 'Budget', icon: PieChart },
  { to: '/goals', label: 'Obiettivi', icon: Target },
  { to: '/reports', label: 'Report', icon: BarChart3 },
  { to: '/settings', label: 'Impostazioni', icon: Settings }
]

export function Sidebar(): JSX.Element {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-love-card-dark/70">
      <div className="flex h-16 items-center gap-3 border-b border-white/60 px-4 dark:border-white/10">
        <BrandLogo className="h-8 w-8" />
        <span className="font-display text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">MoneyLove</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
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
        ))}
      </nav>
    </aside>
  )
}
