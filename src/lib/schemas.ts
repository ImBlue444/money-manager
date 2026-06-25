import { z } from 'zod'

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const transactionSchema = z.object({
  amount: z.number().positive(),
  amount_base: z.number().nonnegative(),
  conversion_warning: z.union([z.literal(0), z.literal(1)]).default(0),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1).max(100),
  description: z.string().max(500).nullable().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().min(3).max(3).default('EUR')
})

export const transactionUpdateSchema = transactionSchema.partial()

export const transactionFiltersSchema = z.object({
  type: z.enum(['income', 'expense', 'all']).optional(),
  category: z.string().min(1).max(100).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  search: z.string().max(200).optional(),
  limit: z.number().int().nonnegative().max(1000).optional(),
  offset: z.number().int().nonnegative().optional()
})

export const subscriptionSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive(),
  amount_base: z.number().nonnegative().optional(),
  conversion_warning: z.union([z.literal(0), z.literal(1)]).default(0),
  currency: z.string().min(3).max(3).default('EUR'),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  category: z.string().min(1).max(100),
  next_billing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  color: hexColorSchema.default('#6366f1'),
  icon: z.string().max(50).default('credit-card'),
  is_active: z.union([z.literal(0), z.literal(1)]).default(1),
  notes: z.string().max(1000).default('')
})

export const subscriptionUpdateSchema = subscriptionSchema.partial()

export const goalSchema = z.object({
  name: z.string().min(1).max(200),
  target_amount: z.number().nonnegative(),
  current_amount: z.number().nonnegative().default(0),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  color: hexColorSchema.default('#10b981'),
  icon: z.string().max(50).default('target'),
  notes: z.string().max(1000).default('')
})

export const goalUpdateSchema = goalSchema.partial()

export const budgetSchema = z.object({
  category: z.string().min(1).max(100),
  monthly_limit: z.number().nonnegative(),
  month: z.string().regex(/^\d{4}-\d{2}$/)
})

export const settingKeySchema = z.enum([
  'base_currency',
  'locale',
  'theme',
  'starting_balance',
  'username',
  'onboarding_completed',
  'ai_provider',
  'ai_model',
  'ai_auto_insight'
])

export const backupDataSchema = z.object({
  transactions: z.array(z.record(z.any())).default([]),
  subscriptions: z.array(z.record(z.any())).default([]),
  budget: z.array(z.record(z.any())).default([]),
  goals: z.array(z.record(z.any())).default([]),
  settings: z.record(z.string()).default({})
})

export const aiPeriodSchema = z.enum([
  'current_month',
  'last_month',
  'last_3_months',
  'last_6_months',
  'last_12_months',
  'all'
])

export const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/)
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const currencyCodeSchema = z.string().min(3).max(3).toUpperCase()
