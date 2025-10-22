import { SwapAdapter } from '../core/swap-adapter.js'
import { getTokenMetadata } from '../services/token-metadata.js'
import { getChainId, getTokenAddress, isAddress } from './swap.js'

const swapAdapter = new SwapAdapter()

export interface PriceQuoteParams {
  fromToken: string
  toToken: string
  chain: string
  amount?: string
}

export class PriceTools {
  async handleTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'price.getQuote':
        return this.getQuote(args)
      default:
        throw new Error(`Unknown price tool: ${name}`)
    }
  }

  private async getQuote(params: PriceQuoteParams): Promise<any> {
    try {
      const {
        fromToken,
        toToken,
        chain,
        amount = '1'
      } = params

      if (!fromToken || !toToken || !chain) {
        return {
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Missing required parameters: fromToken, toToken, chain'
          }
        }
      }

      const chainId = getChainId(chain)
      
      const fromTokenAddress = isAddress(fromToken) 
        ? fromToken 
        : getTokenAddress(fromToken, chainId)
      
      const toTokenAddress = isAddress(toToken)
        ? toToken
        : getTokenAddress(toToken, chainId)

      const fromMetadata = await getTokenMetadata(fromTokenAddress, chainId)
      const toMetadata = await getTokenMetadata(toTokenAddress, chainId)

      const sellAmountWei = this.toWei(amount, fromMetadata.decimals)

      const priceData = await swapAdapter.getSwapPrice({
        chainId,
        buyToken: toTokenAddress,
        sellToken: fromTokenAddress,
        sellAmount: sellAmountWei
      })

      const buyAmountNum = parseFloat(priceData.buyAmount || '0')
      const sellAmountNum = parseFloat(sellAmountWei)
      const buyAmountFormatted = (buyAmountNum / Math.pow(10, toMetadata.decimals)).toFixed(6)
      const sellAmountFormatted = amount

      let priceRatio = '0'
      if (sellAmountNum > 0 && buyAmountNum > 0) {
        const buyInDecimal = buyAmountNum / Math.pow(10, toMetadata.decimals)
        const sellInDecimal = sellAmountNum / Math.pow(10, fromMetadata.decimals)
        priceRatio = (buyInDecimal / sellInDecimal).toFixed(6)
      }

      return {
        success: true,
        data: {
          fromToken: {
            symbol: fromMetadata.symbol,
            address: fromTokenAddress,
            amount: sellAmountFormatted,
            decimals: fromMetadata.decimals
          },
          toToken: {
            symbol: toMetadata.symbol,
            address: toTokenAddress,
            amount: buyAmountFormatted,
            decimals: toMetadata.decimals
          },
          price: priceRatio,
          priceDescription: `1 ${fromMetadata.symbol} = ${priceRatio} ${toMetadata.symbol}`,
          chain: chain,
          chainId: chainId,
          timestamp: new Date().toISOString(),
          source: '0x DEX Aggregator (100+ liquidity sources)',
          note: 'Real-time price from blockchain, no caching'
        }
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

  private toWei(amount: string, decimals: number): string {
    const [whole, fraction = ''] = amount.split('.')
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
    const result = whole + paddedFraction
    return BigInt(result).toString()
  }
}
