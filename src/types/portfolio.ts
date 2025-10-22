import { z } from 'zod'
import { ChainEnum, AddressSchema } from './common.js'

// Token schema
export const TokenSchema = z.object({
  address: AddressSchema,
  symbol: z.string(),
  decimals: z.number(),
  balance: z.string(), // BigInt as string
  usd: z.number().optional()
})
export type Token = z.infer<typeof TokenSchema>

// Position schema
export const PositionSchema = z.object({
  protocol: z.string(),
  type: z.string(),
  healthFactor: z.number().optional(),
  collateralUsd: z.number().optional(),
  debtUsd: z.number().optional(),
  apr: z.number().optional()
})
export type Position = z.infer<typeof PositionSchema>

// Portfolio balance request/response
export const PortfolioBalanceRequestSchema = z.object({
  chain: ChainEnum,
  address: AddressSchema
})
export type PortfolioBalanceRequest = z.infer<typeof PortfolioBalanceRequestSchema>

export const PortfolioBalanceResponseSchema = z.object({
  native: z.string(), // Native token balance
  tokens: z.array(TokenSchema)
})
export type PortfolioBalanceResponse = z.infer<typeof PortfolioBalanceResponseSchema>

// Portfolio positions request/response
export const PortfolioPositionsRequestSchema = z.object({
  chain: ChainEnum,
  address: AddressSchema
})
export type PortfolioPositionsRequest = z.infer<typeof PortfolioPositionsRequestSchema>

export const PortfolioPositionsResponseSchema = z.object({
  positions: z.array(PositionSchema)
})
export type PortfolioPositionsResponse = z.infer<typeof PortfolioPositionsResponseSchema>
