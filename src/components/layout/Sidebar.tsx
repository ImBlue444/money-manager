import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  PieChart,
  RefreshCw,
  Settings,
  Target,
  Wallet
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transazioni', icon: ArrowLeftRight },
  { to: '/subscriptions', label: 'Abbonamenti', icon: RefreshCw },
  { to: '/budget', label: 'Budget', icon: PieChart },
  { to: '/goals', label: 'Obiettivi', icon: Target },
  { to: '/reports', label: 'Report', icon: BarChart3 },
  { to: '/settings', label: 'Impostazioni', icon: Settings }
]

export function Sidebar(): JSX.Element {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-4 dark:border-gray-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white">
          <Wallet className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">Finanza</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
