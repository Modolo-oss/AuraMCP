import { z } from 'zod'
import { TxHashSchema } from './common.js'

// Fill/trade record
export const FillSchema = z.object({
  tx: TxHashSchema,
  time: z.string(), // ISO timestamp
  side: z.enum(['buy', 'sell']).optional(),
  size: z.string().optional(),
  price: z.string().optional(),
  asset: z.string().optional(),
  protocol: z.string().optional()
})
export type Fill = z.infer<typeof FillSchema>

// Report summary
export const ReportSummarySchema = z.object({
  totalPnlUsd: z.number().optional(),
  totalVolumeUsd: z.number().optional(),
  totalFeesUsd: z.number().optional(),
  winRate: z.number().optional(),
  sharpeRatio: z.number().optional(),
  maxDrawdown: z.number().optional(),
  period: z.object({
    start: z.string(),
    end: z.string()
  })
})
export type ReportSummary = z.infer<typeof ReportSummarySchema>

// Get report request
export const GetReportRequestSchema = z.object({
  sessionId: z.string()
})
export type GetReportRequest = z.infer<typeof GetReportRequestSchema>

// Get report response
export const GetReportResponseSchema = z.object({
  pnlUsd: z.number().optional(),
  fills: z.array(FillSchema),
  summary: ReportSummarySchema
})
export type GetReportResponse = z.infer<typeof GetReportResponseSchema>
