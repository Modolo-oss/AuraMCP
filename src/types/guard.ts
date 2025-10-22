import { z } from 'zod'
import { GuardTypeEnum } from './common.js'

// Guard rule parameters
export const GuardRuleParamsSchema = z.object({
  // Risk guard params
  maxSlippagePct: z.number().optional(),
  maxGasGwei: z.number().optional(),
  maxDrawdownPct: z.number().optional(),
  minLiquidityUsd: z.number().optional(),
  
  // Route guard params
  allowedDexes: z.array(z.string()).optional(),
  blockedTokens: z.array(z.string()).optional(),
  
  // Deny list params
  blockedAddresses: z.array(z.string()).optional(),
  blockedProtocols: z.array(z.string()).optional(),
  
  // Approval policy
  requireApproval: z.boolean().optional(),
  maxApprovalAmount: z.string().optional()
})
export type GuardRuleParams = z.infer<typeof GuardRuleParamsSchema>

// Set guard rules request
export const SetGuardRulesRequestSchema = z.object({
  ruleType: GuardTypeEnum,
  params: GuardRuleParamsSchema
})
export type SetGuardRulesRequest = z.infer<typeof SetGuardRulesRequestSchema>

// Set guard rules response
export const SetGuardRulesResponseSchema = z.object({
  ok: z.boolean()
})
export type SetGuardRulesResponse = z.infer<typeof SetGuardRulesResponseSchema>

// Guard engine configuration
export const GuardEngineConfigSchema = z.object({
  defaultRules: z.record(GuardRuleParamsSchema),
  emergencyStop: z.boolean().default(false),
  maxDailyVolumeUsd: z.number().optional(),
  maxDailyTransactions: z.number().optional()
})
export type GuardEngineConfig = z.infer<typeof GuardEngineConfigSchema>
