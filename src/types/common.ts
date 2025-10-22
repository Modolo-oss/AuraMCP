import { z } from 'zod'

// Common types and enums
export const ChainEnum = z.enum(['ethereum', 'base', 'arbitrum', 'polygon', 'optimism'])
export type Chain = z.infer<typeof ChainEnum>

export const RiskLevelEnum = z.enum(['low', 'moderate', 'high', 'opportunistic'])
export type RiskLevel = z.infer<typeof RiskLevelEnum>

export const StrategyIntentEnum = z.enum([
  'dca_event_aware',
  'auto_repay', 
  'rotate_to',
  'quest_batch',
  'liquidation_guard',
  'basket_rotation',
  'hedge_guard'
])
export type StrategyIntent = z.infer<typeof StrategyIntentEnum>

export const OperationTypeEnum = z.enum([
  'liquidation',
  'airdrop', 
  'narrative',
  'governance'
])
export type OperationType = z.infer<typeof OperationTypeEnum>

export const GuardTypeEnum = z.enum(['risk', 'gas', 'route', 'deny'])
export type GuardType = z.infer<typeof GuardTypeEnum>

export const TransactionStatusEnum = z.enum(['submitted', 'mined', 'failed'])
export type TransactionStatus = z.infer<typeof TransactionStatusEnum>

// Common schemas
export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
export type Address = z.infer<typeof AddressSchema>

export const TxHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash')
export type TxHash = z.infer<typeof TxHashSchema>

// Error types
export const McpErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional()
})
export type McpError = z.infer<typeof McpErrorSchema>

// Response wrapper
export const McpResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: McpErrorSchema.optional(),
  metadata: z.object({
    timestamp: z.string(),
    requestId: z.string().optional()
  }).optional()
})
export type McpResponse<T = any> = {
  success: boolean
  data?: T
  error?: McpError
  metadata?: {
    timestamp: string
    requestId?: string
  }
}
