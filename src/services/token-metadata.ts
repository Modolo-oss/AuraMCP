import { ethers } from 'ethers'
import { logger } from '../utils/logger.js'

// Chain ID to RPC URL mapping (public RPCs)
const RPC_URLS: { [chainId: number]: string } = {
  1: 'https://eth.llamarpc.com',
  8453: 'https://mainnet.base.org',
  137: 'https://polygon-rpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  56: 'https://bsc-dataseed.binance.org',
  43114: 'https://api.avax.network/ext/bc/C/rpc'
}

// ERC20 ABI for metadata functions
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)'
]

interface TokenMetadata {
  address: string
  symbol: string
  name: string
  decimals: number
  totalSupply?: string
  chainId: number
}

// Cache for token metadata (in-memory, simple implementation)
const metadataCache = new Map<string, TokenMetadata>()

function getCacheKey(address: string, chainId: number): string {
  return `${chainId}:${address.toLowerCase()}`
}

export async function getTokenMetadata(
  address: string,
  chainId: number
): Promise<TokenMetadata> {
  // Check cache first
  const cacheKey = getCacheKey(address, chainId)
  const cached = metadataCache.get(cacheKey)
  if (cached) {
    logger.info(`Token metadata cache hit: ${address} on chain ${chainId}`)
    return cached
  }

  // Get RPC URL for chain
  const rpcUrl = RPC_URLS[chainId]
  if (!rpcUrl) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported: ${Object.keys(RPC_URLS).join(', ')}`)
  }

  try {
    // Create provider and contract instance
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const contract = new ethers.Contract(address, ERC20_ABI, provider)

    // Fetch metadata in parallel
    const [symbol, name, decimals, totalSupply] = await Promise.all([
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.name().catch(() => 'Unknown Token'),
      contract.decimals().catch(() => 18),
      contract.totalSupply().catch(() => null)
    ])

    const metadata: TokenMetadata = {
      address: address.toLowerCase(),
      symbol,
      name,
      decimals: Number(decimals),
      totalSupply: totalSupply ? totalSupply.toString() : undefined,
      chainId
    }

    // Cache the result
    metadataCache.set(cacheKey, metadata)
    logger.info(`Fetched token metadata: ${symbol} (${name}) on chain ${chainId}`)

    return metadata
  } catch (error) {
    logger.error(`Failed to fetch token metadata for ${address} on chain ${chainId}:`, error)
    throw new Error(`Failed to fetch token metadata: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getMultipleTokenMetadata(
  addresses: string[],
  chainId: number
): Promise<TokenMetadata[]> {
  const promises = addresses.map(addr => getTokenMetadata(addr, chainId))
  return Promise.all(promises)
}

// Pre-populate cache with popular tokens for performance
export async function preloadPopularTokens() {
  const popularTokens = [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chainId: 1 }, // USDC on Ethereum
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', chainId: 1 }, // USDT on Ethereum
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', chainId: 8453 }, // USDC on Base
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', chainId: 42161 }, // USDC on Arbitrum
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', chainId: 137 }, // USDC on Polygon
  ]

  try {
    logger.info('Preloading popular token metadata...')
    await Promise.allSettled(
      popularTokens.map(({ address, chainId }) => getTokenMetadata(address, chainId))
    )
    logger.info(`Preloaded ${popularTokens.length} popular tokens`)
  } catch (error) {
    logger.warn('Some popular tokens failed to preload:', error)
  }
}
