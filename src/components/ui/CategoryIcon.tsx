import React from 'react'
import {
  ArrowLeftRight,
  Briefcase,
  Bus,
  Calendar,
  CircleHelp,
  CreditCard,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  LayoutDashboard,
  PiggyBank,
  Plane,
  RefreshCw,
  RotateCcw,
  Shirt,
  Target,
  TrendingUp,
  User,
  UtensilsCrossed,
  Wallet
} from 'lucide-react'

const ICONS: Record<string, React.ElementType> = {
  Home,
  UtensilsCrossed,
  Bus,
  HeartPulse,
  Film,
  Shirt,
  Laptop,
  GraduationCap,
  Plane,
  Gift,
  PiggyBank,
  CircleHelp,
  Briefcase,
  User,
  TrendingUp,
  RotateCcw,
  'credit-card': CreditCard,
  'calendar': Calendar,
  target: Target,
  wallet: Wallet,
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'refresh-cw': RefreshCw
}

interface CategoryIconProps {
  name: string
  className?: string
  style?: React.CSSProperties
}

export function CategoryIcon({ name, className, style }: CategoryIconProps): JSX.Element {
  const Icon = ICONS[name] || CircleHelp
  return <Icon className={className} style={style} />
}
