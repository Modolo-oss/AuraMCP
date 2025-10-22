import { z } from 'zod'

export const SwapQuoteRequestSchema = z.object({
  chainId: z.number().describe('Blockchain chain ID (e.g., 1 for Ethereum, 8453 for Base)'),
  sellToken: z.string().describe('Token address to sell (or "ETH" for native token)'),
  buyToken: z.string().describe('Token address to buy'),
  sellAmount: z.string().describe('Amount to sell in base units (wei)'),
  taker: z.string().optional().describe('Wallet address executing the swap')
})

export const SwapQuoteResponseSchema = z.object({
  chainId: z.number(),
  buyAmount: z.string().describe('Amount of buyToken to receive'),
  sellAmount: z.string().describe('Amount of sellToken to sell'),
  buyToken: z.string(),
  sellToken: z.string(),
  price: z.string().describe('Price per unit'),
  estimatedGas: z.string().optional(),
  to: z.string().describe('Contract address to send transaction to'),
  data: z.string().describe('Transaction data'),
  value: z.string().describe('ETH value to send with transaction'),
  gasPrice: z.string().optional(),
  sources: z.array(z.any()).optional().describe('DEX sources used for the swap')
})

export const SupportedChainSchema = z.object({
  chainId: z.number(),
  name: z.string(),
  nativeCurrency: z.object({
    name: z.string(),
    symbol: z.string(),
    decimals: z.number()
  }),
  rpcUrl: z.string().optional()
})

export const SwapPrepareRequestSchema = z.object({
  chainId: z.number(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  slippagePercent: z.number().optional().default(1.0),
  taker: z.string().optional().describe('Wallet address executing the swap')
})

export type SwapQuoteRequest = z.infer<typeof SwapQuoteRequestSchema>
export type SwapQuoteResponse = z.infer<typeof SwapQuoteResponseSchema>
export type SupportedChain = z.infer<typeof SupportedChainSchema>
export type SwapPrepareRequest = z.infer<typeof SwapPrepareRequestSchema>
