import { SwapAdapter } from '../core/swap-adapter.js'
import { GuardEngine } from '../core/guard-engine.js'
import { SwapQuoteRequest, SwapPrepareRequest } from '../types/swap.js'
import { getTokenMetadata } from '../services/token-metadata.js'

const swapAdapter = new SwapAdapter()

// Chain name to chain ID mapping
const CHAIN_IDS: { [key: string]: number } = {
  'ethereum': 1,
  'eth': 1,
  'base': 8453,
  'polygon': 137,
  'matic': 137,
  'arbitrum': 42161,
  'arb': 42161,
  'optimism': 10,
  'op': 10,
  'bsc': 56,
  'bnb': 56,
  'avalanche': 43114,
  'avax': 43114
}

// Token address mapping per chain
const TOKEN_ADDRESSES: { [chain: number]: { [symbol: string]: string } } = {
  // Ethereum Mainnet
  1: {
    'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
  },
  // Base
  8453: {
    'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'WETH': '0x4200000000000000000000000000000000000006',
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'USDbC': '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    'CBETH': '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
  },
  // Polygon
  137: {
    'MATIC': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'WMATIC': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    'WETH': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
  },
  // Arbitrum
  42161: {
    'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    'ARB': '0x912CE59144191C1204E64559FE8253a0e49E6548'
  },
  // Optimism
  10: {
    'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'WETH': '0x4200000000000000000000000000000000000006',
    'USDC': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    'USDT': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    'OP': '0x4200000000000000000000000000000000000042'
  }
}

// Helper: Get chain ID from chain name
export function getChainId(chain: string): number {
  const chainLower = chain.toLowerCase()
  const chainId = CHAIN_IDS[chainLower]
  if (!chainId) {
    throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(CHAIN_IDS).join(', ')}`)
  }
  return chainId
}

// Helper: Get token address from symbol
export function getTokenAddress(symbol: string, chainId: number): string {
  const symbolUpper = symbol.toUpperCase()
  const chainTokens = TOKEN_ADDRESSES[chainId]
  
  if (!chainTokens) {
    throw new Error(`No token mapping for chain ID: ${chainId}`)
  }
  
  const address = chainTokens[symbolUpper]
  if (!address) {
    throw new Error(`Unknown token ${symbol} on chain ${chainId}. Known tokens: ${Object.keys(chainTokens).join(', ')}`)
  }
  
  return address
}

// Helper: Convert amount to wei (18 decimals for ETH-like tokens)
export function toWei(amount: string, decimals: number = 18): string {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  const result = whole + paddedFraction
  return BigInt(result).toString()
}

// Helper: Check if a string is an address (starts with 0x and 40 hex chars)
export function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

export async function getSupportedChains(guardEngine?: GuardEngine) {
  try {
    const chains = await swapAdapter.getSupportedChains()
    
    return {
      success: true,
      data: {
        chains,
        count: chains.length
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CHAINS_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

export async function getSwapQuote(request: SwapQuoteRequest, guardEngine?: GuardEngine) {
  try {
    const quote = await swapAdapter.getSwapQuote(request)
    
    if (guardEngine) {
      const validation = guardEngine.validateSwap({
        fromToken: quote.sellToken,
        toToken: quote.buyToken,
        fromAmount: quote.sellAmount,
        toAmount: quote.buyAmount,
        slippagePct: 1.0,
        gasPrice: quote.gasPrice || '0',
        route: quote.sources?.map((s: any) => s.name || 'unknown') || []
      })
      
      if (!validation.allowed) {
        return {
          success: false,
          error: {
            code: 'GUARD_REJECTED',
            message: 'Swap rejected by guard engine',
            reasons: validation.reasons
          }
        }
      }
    }
    
    // Fetch token metadata for human-readable conversion
    const tokenMetadata = await getTokenMetadata(
      quote.buyToken,
      quote.chainId
    )
    
    // Convert buyAmount to human-readable format
    const buyAmountNum = parseFloat(quote.buyAmount)
    const divisor = Math.pow(10, tokenMetadata.decimals)
    const buyAmountFormatted = (buyAmountNum / divisor).toFixed(6)
    
    return {
      success: true,
      data: {
        ...quote,
        buyAmountFormatted,
        buyTokenSymbol: tokenMetadata.symbol,
        buyTokenDecimals: tokenMetadata.decimals
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'QUOTE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

export async function getSwapPrice(request: SwapQuoteRequest) {
  try {
    const price = await swapAdapter.getSwapPrice(request)
    
    return {
      success: true,
      data: price
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PRICE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

export async function prepareSwapTransaction(request: SwapPrepareRequest, guardEngine?: GuardEngine) {
  try {
    const quoteRequest: SwapQuoteRequest = {
      chainId: request.chainId,
      sellToken: request.sellToken,
      buyToken: request.buyToken,
      sellAmount: request.sellAmount,
      taker: request.taker
    }
    
    const quote = await swapAdapter.getSwapQuote(quoteRequest)
    
    if (guardEngine) {
      const validation = guardEngine.validateSwap({
        fromToken: quote.sellToken,
        toToken: quote.buyToken,
        fromAmount: quote.sellAmount,
        toAmount: quote.buyAmount,
        slippagePct: request.slippagePercent || 1.0,
        gasPrice: quote.gasPrice || '0',
        route: quote.sources?.map((s: any) => s.name || 'unknown') || []
      })
      
      if (!validation.allowed) {
        return {
          success: false,
          error: {
            code: 'GUARD_REJECTED',
            message: 'Swap rejected by guard engine',
            reasons: validation.reasons
          }
        }
      }
    }
    
    return {
      success: true,
      data: {
        transaction: {
          to: quote.to,
          data: quote.data,
          value: quote.value,
          chainId: quote.chainId,
          estimatedGas: quote.estimatedGas,
          gasPrice: quote.gasPrice
        },
        quote: {
          buyAmount: quote.buyAmount,
          sellAmount: quote.sellAmount,
          price: quote.price,
          buyToken: quote.buyToken,
          sellToken: quote.sellToken
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PREPARE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

export async function getLiquiditySources(chainId: number) {
  try {
    const sources = await swapAdapter.getLiquiditySources(chainId)
    
    return {
      success: true,
      data: sources
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SOURCES_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// SwapTools class for MCP compatibility
export class SwapTools {
  constructor(
    private auraAdapter: any,
    private guardEngine: GuardEngine
  ) {}

  async handleTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'swap.parse':
        return this.parseSwapIntent(args)
      
      case 'swap.prepare':
        return this.prepareWithMapping(args)
      
      default:
        throw new Error(`Unknown swap tool: ${name}`)
    }
  }

  private async getQuoteWithMapping(args: any): Promise<any> {
    try {
      // Convert friendly parameters to 0x API format
      const chainId = getChainId(args.chain)
      const sellToken = getTokenAddress(args.fromToken, chainId)
      const buyToken = getTokenAddress(args.toToken, chainId)
      const sellAmount = toWei(args.amount)
      const taker = args.userAddress
      
      // Call swap quote with proper parameters
      const quoteRequest: SwapQuoteRequest = {
        chainId,
        sellToken,
        buyToken,
        sellAmount,
        taker
      }
      
      return await getSwapQuote(quoteRequest, this.guardEngine)
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUOTE_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  }

  private async prepareWithMapping(args: any): Promise<any> {
    try {
      // Validate required parameters
      if (!args.fromToken || !args.toToken || !args.amount || !args.chain || !args.userAddress) {
        return {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: `Missing required parameters. Got: fromToken=${args.fromToken}, toToken=${args.toToken}, amount=${args.amount}, chain=${args.chain}, userAddress=${args.userAddress}`
          }
        }
      }

      // Call prepare-link endpoint to get shareable URL
      const axios = (await import('axios')).default
      
      const apiUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS}`
        : 'http://localhost:5000'

      const response = await axios.post(`${apiUrl}/api/swap/prepare-link`, {
        chainId: getChainId(args.chain),
        sellToken: args.fromToken,
        buyToken: args.toToken,
        sellAmount: args.amount,
        slippagePercent: args.slippagePercent || 1.0,
        taker: args.userAddress
      })

      if (!response.data.success) {
        return response.data
      }

      // Return user-friendly message with link
      return {
        success: true,
        data: {
          message: `✅ Transaction ready! Click to sign: ${response.data.data.url}`,
          url: response.data.data.url,
          txId: response.data.data.txId,
          expiresIn: response.data.data.expiresIn
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREPARE_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  }

  private async parseSwapIntent(args: { text: string }): Promise<any> {
    // Simple intent parsing (can be enhanced with NLP)
    const text = args.text.toLowerCase()
    
    const amountMatch = text.match(/(\d+\.?\d*)\s*(\w+)/)
    const toMatch = text.match(/to\s+(\w+)/)
    const chainMatch = text.match(/on\s+(\w+)/)
    
    return {
      success: true,
      data: {
        fromToken: amountMatch?.[2]?.toUpperCase() || 'ETH',
        toToken: toMatch?.[1]?.toUpperCase() || 'USDC',
        amount: amountMatch?.[1] || '1',
        chain: chainMatch?.[1]?.toLowerCase() || 'ethereum',
        rawText: args.text
      }
    }
  }

  private async executeSwap(args: any): Promise<any> {
    // For web-based signing, return instruction to sign in browser
    return {
      success: true,
      data: {
        status: 'ready_for_signature',
        message: 'Please sign this transaction in your browser wallet',
        txData: args.txData
      }
    }
  }
}
