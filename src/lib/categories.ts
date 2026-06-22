export interface CategoryDef {
  name: string
  color: string
  icon: string
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { name: 'Casa', color: '#f59e0b', icon: 'Home' },
  { name: 'Cibo & Ristoranti', color: '#ef4444', icon: 'UtensilsCrossed' },
  { name: 'Trasporti', color: '#3b82f6', icon: 'Bus' },
  { name: 'Salute', color: '#10b981', icon: 'HeartPulse' },
  { name: 'Intrattenimento', color: '#8b5cf6', icon: 'Film' },
  { name: 'Abbigliamento', color: '#ec4899', icon: 'Shirt' },
  { name: 'Tecnologia', color: '#6366f1', icon: 'Laptop' },
  { name: 'Istruzione', color: '#14b8a6', icon: 'GraduationCap' },
  { name: 'Viaggi', color: '#0ea5e9', icon: 'Plane' },
  { name: 'Regali', color: '#f43f5e', icon: 'Gift' },
  { name: 'Risparmio', color: '#22c55e', icon: 'PiggyBank' },
  { name: 'Altro', color: '#6b7280', icon: 'CircleHelp' }
]

export const INCOME_CATEGORIES: CategoryDef[] = [
  { name: 'Stipendio', color: '#10b981', icon: 'Briefcase' },
  { name: 'Freelance', color: '#6366f1', icon: 'User' },
  { name: 'Investimenti', color: '#f59e0b', icon: 'TrendingUp' },
  { name: 'Regalo', color: '#ec4899', icon: 'Gift' },
  { name: 'Rimborso', color: '#3b82f6', icon: 'RotateCcw' },
  { name: 'Altro', color: '#6b7280', icon: 'CircleHelp' }
]

export const ALL_CATEGORIES: CategoryDef[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function getCategory(name: string): CategoryDef | undefined {
  return ALL_CATEGORIES.find((c) => c.name === name)
}
