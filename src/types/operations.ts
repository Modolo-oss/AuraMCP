import { z } from 'zod'
import { OperationTypeEnum } from './common.js'

// Opportunity item schema
export const OpportunityItemSchema = z.object({
  vaultId: z.string().optional(),
  address: z.string(),
  health: z.number().optional(),
  threshold: z.number().optional(),
  repayNeededUsd: z.number().optional(),
  // Additional fields for different opportunity types
  protocol: z.string().optional(),
  apy: z.number().optional(),
  risk: z.string().optional(),
  deadline: z.string().optional()
})
export type OpportunityItem = z.infer<typeof OpportunityItemSchema>

// Scan opportunities request
export const ScanOpportunitiesRequestSchema = z.object({
  kind: OperationTypeEnum,
  params: z.record(z.any()).optional()
})
export type ScanOpportunitiesRequest = z.infer<typeof ScanOpportunitiesRequestSchema>

// Scan opportunities response
export const ScanOpportunitiesResponseSchema = z.object({
  items: z.array(OpportunityItemSchema)
})
export type ScanOpportunitiesResponse = z.infer<typeof ScanOpportunitiesResponseSchema>
