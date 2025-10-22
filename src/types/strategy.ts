import { z } from 'zod'
import { StrategyIntentEnum, RiskLevelEnum } from './common.js'

// Strategy action schema
export const StrategyActionSchema = z.object({
  tokens: z.string(),
  description: z.string(),
  platforms: z.array(z.object({
    name: z.string(),
    url: z.string().url()
  })).optional(),
  networks: z.array(z.string()).optional(),
  operations: z.array(z.string()).optional(),
  apy: z.string().optional(),
  flags: z.array(z.string()).optional()
})
export type StrategyAction = z.infer<typeof StrategyActionSchema>

// Strategy schema
export const StrategySchema = z.object({
  name: z.string(),
  risk: RiskLevelEnum,
  actions: z.array(StrategyActionSchema)
})
export type Strategy = z.infer<typeof StrategySchema>

// Backtest request
export const BacktestRequestSchema = z.object({
  name: StrategyIntentEnum,
  params: z.record(z.any()),
  lookbackDays: z.number().min(1).max(365)
})
export type BacktestRequest = z.infer<typeof BacktestRequestSchema>

// Backtest response
export const BacktestResponseSchema = z.object({
  metrics: z.object({
    cagr: z.number(),
    maxDD: z.number(),
    sharpe: z.number().optional(),
    winrate: z.number().optional()
  }),
  equityCurve: z.array(z.object({
    t: z.number(), // timestamp
    v: z.number()  // value
  })),
  notes: z.string().optional()
})
export type BacktestResponse = z.infer<typeof BacktestResponseSchema>

// Strategy propose request
export const StrategyProposeRequestSchema = z.object({
  intent: StrategyIntentEnum,
  params: z.record(z.any())
})
export type StrategyProposeRequest = z.infer<typeof StrategyProposeRequestSchema>

// Strategy propose response
export const StrategyProposeResponseSchema = z.object({
  intentId: z.string(),
  plan: z.record(z.any()),
  risks: z.array(z.string()),
  next: z.enum(['tx.simulate', 'tx.execute'])
})
export type StrategyProposeResponse = z.infer<typeof StrategyProposeResponseSchema>

// DCA Event-Aware specific params
export const DCAEventAwareParamsSchema = z.object({
  asset: z.string(),
  budgetUsd: z.number().positive(),
  cadence: z.string(),
  eventRules: z.object({
    pauseOnUnlock: z.boolean(),
    maxGasGwei: z.number().positive(),
    boostOnDrawdownPct: z.number().positive()
  })
})
export type DCAEventAwareParams = z.infer<typeof DCAEventAwareParamsSchema>

// Liquidation Guard specific params
export const LiquidationGuardParamsSchema = z.object({
  protocols: z.array(z.string()),
  maxHealthFactor: z.number().positive(),
  minHealthFactor: z.number().positive(),
  autoRepayThreshold: z.number().positive()
})
export type LiquidationGuardParams = z.infer<typeof LiquidationGuardParamsSchema>
