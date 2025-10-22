import { z } from 'zod'

// System health request (empty object)
export const SystemHealthRequestSchema = z.object({})
export type SystemHealthRequest = z.infer<typeof SystemHealthRequestSchema>

// System health response
export const SystemHealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  version: z.string(),
  time: z.string(), // ISO timestamp
  uptime: z.number().optional(), // seconds
  dependencies: z.record(z.object({
    status: z.enum(['ok', 'error']),
    latency: z.number().optional(),
    lastCheck: z.string().optional()
  })).optional()
})
export type SystemHealthResponse = z.infer<typeof SystemHealthResponseSchema>
