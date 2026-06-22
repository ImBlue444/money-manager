export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: number
  amount: number
  amount_eur: number
  type: TransactionType
  category: string
  description: string
  date: string
  currency: string
  created_at: string
}

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Subscription {
  id: number
  name: string
  amount: number
  currency: string
  billing_cycle: BillingCycle
  category: string
  next_billing_date: string
  color: string
  icon: string
  is_active: number
  notes: string
  created_at: string
}

export interface Budget {
  id: number
  category: string
  monthly_limit: number
  month: string
  created_at: string
}

export interface BudgetWithSpending {
  budget: Budget
  spent: number
}

export interface Goal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  color: string
  icon: string
  notes: string
  created_at: string
}

export interface SettingsMap {
  base_currency: string
  locale: string
  theme: 'light' | 'dark'
  starting_balance: string
  username: string
  onboarding_completed: string
  ai_provider: string
  ai_model: string
  ai_auto_insight: string
}

export type AiProvider = 'openai' | 'anthropic' | 'gemini'

export interface AiModelOption {
  id: string
  label: string
  tier: 'economy' | 'performance'
}

export interface AiProviderConfig {
  label: string
  models: AiModelOption[]
}

export type AiPeriod =
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'all'

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ExchangeRateResult {
  rate: number | null
  date?: string
  error?: string
}

export interface Api {
  // Transactions
  getTransactions: (filters: TransactionFilters) => Promise<Transaction[]>
  addTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<{ id: number }>
  updateTransaction: (id: number, data: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>
  deleteTransaction: (id: number) => Promise<void>
  getTransactionMonths: () => Promise<string[]>

  // Subscriptions
  getSubscriptions: () => Promise<Subscription[]>
  addSubscription: (data: Omit<Subscription, 'id' | 'created_at'>) => Promise<{ id: number }>
  updateSubscription: (id: number, data: Partial<Omit<Subscription, 'id' | 'created_at'>>) => Promise<void>
  deleteSubscription: (id: number) => Promise<void>

  // Budget
  getBudget: (month: string) => Promise<BudgetWithSpending[]>
  setBudget: (data: Omit<Budget, 'id' | 'created_at'>) => Promise<{ id: number }>
  deleteBudget: (id: number) => Promise<void>

  // Goals
  getGoals: () => Promise<Goal[]>
  addGoal: (data: Omit<Goal, 'id' | 'created_at'>) => Promise<{ id: number }>
  updateGoal: (id: number, data: Partial<Omit<Goal, 'id' | 'created_at'>>) => Promise<void>
  deleteGoal: (id: number) => Promise<void>

  // Settings
  getSetting: <K extends keyof SettingsMap>(key: K) => Promise<SettingsMap[K] | undefined>
  setSetting: <K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) => Promise<void>
  getAllSettings: () => Promise<Partial<SettingsMap>>

  // System
  showSaveDialog: (options: ElectronSaveDialogOptions) => Promise<string | null>
  showOpenDialog: (options: ElectronOpenDialogOptions) => Promise<string | null>
  getSystemLocale: () => Promise<string>

  // AI
  saveAiApiKey: (provider: AiProvider, key: string) => Promise<void>
  getAiApiKey: (provider: AiProvider) => Promise<string>
  sendAiMessage: (message: string, history: AiMessage[], period: AiPeriod) => Promise<void>
  onAiChunk: (callback: (chunk: string) => void) => () => void
  onAiDone: (callback: () => void) => () => void
  onAiError: (callback: (error: string) => void) => () => void
  generateInsight: (period: AiPeriod) => Promise<string>

  // Currency
  getExchangeRate: (from: string, to: string) => Promise<ExchangeRateResult>

  // Backup
  exportBackup: () => Promise<BackupData>
  importBackup: (data: BackupData) => Promise<void>
  saveBackup: () => Promise<void>
  loadBackup: () => Promise<void>
  resetData: () => Promise<void>

  // Reports / CSV
  exportCsv: (rows: Transaction[]) => Promise<void>
  getDashboardSummary: (month: string) => Promise<DashboardSummary>
  getReportsSummary: (from: string, to: string) => Promise<ReportsSummary>
}

export interface DashboardSummary {
  balance: number
  income: number
  expense: number
  subscriptions: number
  upcoming: Subscription[]
  recent: Transaction[]
  trend: Array<{ month: string; balance: number }>
  spendingByCategory: Array<{ category: string; amount: number }>
}

export interface ReportsSummary {
  categorySummary: Array<{ category: string; amount: number; count: number; avg: number }>
  incomeExpense: Array<{ month: string; income: number; expense: number }>
  categoryTrend: Array<{ month: string; category: string; amount: number }>
}

export interface ElectronSaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface ElectronOpenDialogOptions {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface BackupData {
  transactions: Transaction[]
  subscriptions: Subscription[]
  budget: Budget[]
  goals: Goal[]
  settings: Partial<SettingsMap>
}

export interface TransactionFilters {
  type?: TransactionType | 'all'
  category?: string
  month?: string
  search?: string
  limit?: number
  offset?: number
}
