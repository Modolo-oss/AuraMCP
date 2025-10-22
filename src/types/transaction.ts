import { z } from 'zod'
import { TxHashSchema, TransactionStatusEnum } from './common.js'

// Transaction simulation request
export const TxSimulateRequestSchema = z.object({
  intentId: z.string().optional(),
  txParams: z.record(z.any()).optional()
})
export type TxSimulateRequest = z.infer<typeof TxSimulateRequestSchema>

// Transaction simulation response
export const TxSimulateResponseSchema = z.object({
  ok: z.boolean(),
  est: z.object({
    feeUsd: z.number(),
    slippagePct: z.number(),
    avgPrice: z.number().optional()
  }),
  guardsTriggered: z.array(z.string())
})
export type TxSimulateResponse = z.infer<typeof TxSimulateResponseSchema>

// Transaction execution request
export const TxExecuteRequestSchema = z.object({
  intentId: z.string().optional(),
  txParams: z.record(z.any()).optional(),
  // x402 payment proof (if applicable)
  paymentProof: z.object({
    invoiceId: z.string(),
    txHash: TxHashSchema,
    amount: z.string(),
    asset: z.string()
  }).optional()
})
export type TxExecuteRequest = z.infer<typeof TxExecuteRequestSchema>

// Transaction execution response
export const TxExecuteResponseSchema = z.object({
  status: TransactionStatusEnum,
  txHash: TxHashSchema.optional(),
  route: z.string().optional(),
  notes: z.string().optional()
})
export type TxExecuteResponse = z.infer<typeof TxExecuteResponseSchema>

// x402 Payment Required response
export const X402PaymentRequiredSchema = z.object({
  invoiceId: z.string(),
  amount: z.string(),
  asset: z.string(),
  receiver: z.string(),
  description: z.string().optional()
})
export type X402PaymentRequired = z.infer<typeof X402PaymentRequiredSchema>
