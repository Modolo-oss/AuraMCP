import axios from 'axios'
import { SwapQuoteRequest, SwapQuoteResponse, SupportedChain } from '../types/swap.js'

const ZEROEX_API_BASE = 'https://api.0x.org'

const CHAIN_TO_ZEROEX: { [key: number]: string } = {
  1: 'ethereum',
  8453: 'base',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  56: 'bsc',
  43114: 'avalanche',
  84532: 'base-sepolia'
}

export interface SwapAdapterConfig {
  zeroExApiKey?: string
  timeout?: number
}

export class SwapAdapter {
  private config: SwapAdapterConfig

  constructor(config: SwapAdapterConfig = {}) {
    this.config = {
      zeroExApiKey: config.zeroExApiKey || process.env.ZEROEX_API_KEY || '',
      timeout: config.timeout || 30000
    }
  }

  async getSwapQuote(params: SwapQuoteRequest): Promise<SwapQuoteResponse> {
    try {
      const { chainId, buyToken, sellToken, sellAmount, taker } = params

      if (!chainId || !buyToken || !sellToken || !sellAmount) {
        throw new Error('Missing required parameters: chainId, buyToken, sellToken, sellAmount')
      }

      const network = CHAIN_TO_ZEROEX[chainId]
      if (!network) {
        throw new Error(`Unsupported chain ID: ${chainId}`)
      }

      const headers: any = {
        '0x-api-key': this.config.zeroExApiKey || '',
        '0x-version': 'v2'
      }

      const apiParams: any = {
        chainId: chainId.toString(),
        buyToken,
        sellToken,
        sellAmount
      }
      
      if (taker) {
        apiParams.taker = taker
      }

      const response = await axios.get(
        `${ZEROEX_API_BASE}/swap/permit2/quote`,
        { 
          headers,
          timeout: this.config.timeout,
          params: apiParams
        }
      )

      const quoteData = response.data
      
      // Calculate price if not provided by API
      let price = '0'
      if (quoteData.buyAmount && quoteData.sellAmount) {
        const buyAmt = parseFloat(quoteData.buyAmount)
        const sellAmt = parseFloat(quoteData.sellAmount)
        if (sellAmt > 0) {
          price = (buyAmt / sellAmt).toString()
        }
      }
      
      return {
        chainId,
        buyAmount: quoteData.buyAmount || '0',
        sellAmount: quoteData.sellAmount || sellAmount,
        buyToken: quoteData.buyToken || buyToken,
        sellToken: quoteData.sellToken || sellToken,
        price: quoteData.price || price,
        estimatedGas: quoteData.transaction?.gas || quoteData.gas || '0',
        to: quoteData.transaction?.to || quoteData.to || '',
        data: quoteData.transaction?.data || quoteData.data || '0x',
        value: quoteData.transaction?.value || quoteData.value || '0',
        gasPrice: quoteData.transaction?.gasPrice || quoteData.gasPrice || '0',
        sources: quoteData.sources || []
      }
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(`0x API error: ${JSON.stringify(error.response.data)}`)
      }
      throw new Error(`Failed to get swap quote: ${error.message}`)
    }
  }

  async getSwapPrice(params: SwapQuoteRequest): Promise<any> {
    try {
      const { chainId, buyToken, sellToken, sellAmount } = params

      const network = CHAIN_TO_ZEROEX[chainId]
      if (!network) {
        throw new Error(`Unsupported chain ID: ${chainId}`)
      }

      const headers: any = {
        '0x-api-key': this.config.zeroExApiKey || '',
        '0x-version': 'v2'
      }

      const apiParams: any = {
        chainId: chainId.toString(),
        buyToken,
        sellToken,
        sellAmount
      }

      const response = await axios.get(
        `${ZEROEX_API_BASE}/swap/permit2/price`,
        { 
          headers,
          timeout: this.config.timeout,
          params: apiParams
        }
      )

      return response.data
    } catch (error: any) {
      throw new Error(`Failed to get swap price: ${error.message}`)
    }
  }

  async getSupportedChains(): Promise<SupportedChain[]> {
    const chains: SupportedChain[] = [
      {
        chainId: 1,
        name: 'Ethereum Mainnet',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://eth.public-rpc.com'
      },
      {
        chainId: 8453,
        name: 'Base',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://base.public-rpc.com'
      },
      {
        chainId: 137,
        name: 'Polygon',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrl: 'https://polygon-rpc.com'
      },
      {
        chainId: 42161,
        name: 'Arbitrum',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://arb1.arbitrum.io/rpc'
      },
      {
        chainId: 10,
        name: 'Optimism',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://mainnet.optimism.io'
      },
      {
        chainId: 84532,
        name: 'Base Sepolia',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://sepolia.base.org'
      }
    ]
    return chains
  }

  async getLiquiditySources(chainId: number): Promise<any> {
    const network = CHAIN_TO_ZEROEX[chainId]
    if (!network) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }

    return {
      chainId,
      sources: [
        { name: 'Uniswap V2', type: 'AMM' },
        { name: 'Uniswap V3', type: 'AMM' },
        { name: 'SushiSwap', type: 'AMM' },
        { name: 'Curve', type: 'AMM' },
        { name: '0x Native', type: 'PMM' }
      ]
    }
  }
}
