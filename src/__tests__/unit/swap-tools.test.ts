import { SwapTools } from '../../tools/swap'
import { AuraAdapter } from '../../core/aura-adapter'
import { GuardEngine } from '../../core/guard-engine'
import { SwapIntent, SwapQuoteRequest } from '../../types'

// Mock dependencies
jest.mock('../../core/aura-adapter')
jest.mock('../../core/guard-engine')

describe('SwapTools', () => {
  let swapTools: SwapTools
  let mockAuraAdapter: jest.Mocked<AuraAdapter>
  let mockGuardEngine: jest.Mocked<GuardEngine>

  beforeEach(() => {
    mockAuraAdapter = {
      parseSwapIntent: jest.fn(),
      getSwapQuote: jest.fn(),
      checkAllowance: jest.fn()
    } as any

    mockGuardEngine = {
      validateSimulation: jest.fn()
    } as any

    swapTools = new SwapTools(mockAuraAdapter, mockGuardEngine)
  })

  describe('swap.parse', () => {
    it('should parse natural language swap intent', async () => {
      const intent: SwapIntent = {
        text: 'swap 1 ETH to USDC on Base',
        userAddress: '0x1234567890123456789012345678901234567890'
      }

      const expectedParams = {
        fromToken: 'ETH',
        toToken: 'USDC',
        amount: '1',
        chain: 'base',
        slippageTolerance: 0.5,
        userAddress: intent.userAddress
      }

      mockAuraAdapter.parseSwapIntent.mockResolvedValue(expectedParams)

      const result = await swapTools.handleTool('swap.parse', intent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(expectedParams)
      }
      expect(mockAuraAdapter.parseSwapIntent).toHaveBeenCalledWith(intent)
    })

    it('should handle parse errors gracefully', async () => {
      const intent: SwapIntent = {
        text: 'invalid swap command'
      }

      mockAuraAdapter.parseSwapIntent.mockRejectedValue(new Error('Could not parse amount from intent'))

      const result = await swapTools.handleTool('swap.parse', intent)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error?.code).toBe('PARSE_ERROR')
      }
    })
  })

  describe('swap.quote', () => {
    it('should get swap quote from AURA API', async () => {
      const request: SwapQuoteRequest = {
        fromToken: 'ETH',
        toToken: 'USDC',
        amount: '1',
        chain: 'base',
        slippageTolerance: 0.5
      }

      const mockQuote = {
        fromToken: {
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          symbol: 'ETH',
          decimals: 18,
          amount: '1000000000000000000'
        },
        toToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
          amount: '3000000000'
        },
        price: '3000',
        priceImpact: 0.1,
        route: {
          dex: 'Uniswap V3',
          path: ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
          protocols: ['uniswap-v3']
        },
        estimatedGas: '150000',
        estimatedGasUsd: 5.0,
        guaranteedAmount: '2970000000'
      }

      mockAuraAdapter.getSwapQuote.mockResolvedValue(mockQuote)
      mockGuardEngine.validateSimulation.mockReturnValue({
        passed: true,
        triggeredGuards: [],
        warnings: []
      })

      const result = await swapTools.handleTool('swap.quote', request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockQuote)
      }
      expect(mockAuraAdapter.getSwapQuote).toHaveBeenCalledWith(request)
    })

    it('should block quote if guards fail', async () => {
      const request: SwapQuoteRequest = {
        fromToken: 'ETH',
        toToken: 'USDC',
        amount: '1',
        chain: 'base'
      }

      const mockQuote = {
        fromToken: {
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          symbol: 'ETH',
          decimals: 18,
          amount: '1000000000000000000'
        },
        toToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
          amount: '3000000000'
        },
        price: '3000',
        priceImpact: 2.5, // High price impact
        route: {
          dex: 'Uniswap V3',
          path: ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']
        },
        estimatedGas: '150000',
        estimatedGasUsd: 5.0,
        guaranteedAmount: '2925000000'
      }

      mockAuraAdapter.getSwapQuote.mockResolvedValue(mockQuote)
      mockGuardEngine.validateSimulation.mockReturnValue({
        passed: false,
        triggeredGuards: ['slippage_too_high'],
        warnings: []
      })

      const result = await swapTools.handleTool('swap.quote', request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error?.code).toBe('GUARD_VIOLATION')
        expect(result.error?.details?.triggeredGuards).toContain('slippage_too_high')
      }
    })
  })

  describe('swap.prepare', () => {
    it('should build transaction with real calldata from AURA', async () => {
      const mockQuote = {
        fromToken: {
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          symbol: 'ETH',
          decimals: 18,
          amount: '1000000000000000000'
        },
        toToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
          amount: '3000000000'
        },
        price: '3000',
        priceImpact: 0.1,
        route: {
          dex: 'Uniswap V3',
          path: ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']
        },
        estimatedGas: '150000',
        estimatedGasUsd: 5.0,
        guaranteedAmount: '2970000000'
      }

      const mockTxData = {
        to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Real Uniswap router
        data: '0xac9650d80000...', // Real calldata
        value: '1000000000000000000',
        gasLimit: '150000',
        spenderAddress: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        needsApproval: false
      }

      const mockAuraAdapterWithBuild = mockAuraAdapter as any
      mockAuraAdapterWithBuild.buildSwapTransaction = jest.fn().mockResolvedValue(mockTxData)

      const request = {
        quote: mockQuote,
        userAddress: '0x1234567890123456789012345678901234567890',
        slippageTolerance: 0.5
      }

      const result = await swapTools.handleTool('swap.prepare', request)

      expect(result.success).toBe(true)
      if (result.success) {
        // Verify transaction has real data, not placeholders
        expect(result.data.swapTx.to).not.toBe(mockQuote.route.dex) // Should be contract address, not DEX name
        expect(result.data.swapTx.to).toBe('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45')
        expect(result.data.swapTx.data).not.toBe('0x') // Should have real calldata
        expect(result.data.swapTx.data).toBe('0xac9650d80000...')
      }
      expect(mockAuraAdapterWithBuild.buildSwapTransaction).toHaveBeenCalledWith(
        mockQuote,
        request.userAddress,
        request.slippageTolerance
      )
    })

    it('should handle multi-chain correctly', async () => {
      const mockQuoteBase = {
        fromToken: { address: '0xEth', symbol: 'ETH', decimals: 18, amount: '1000000000000000000' },
        toToken: { address: '0xUSDC', symbol: 'USDC', decimals: 6, amount: '3000000000' },
        price: '3000',
        priceImpact: 0.1,
        route: { dex: 'Uniswap V3', path: ['0xEth', '0xUSDC'] },
        estimatedGas: '150000',
        estimatedGasUsd: 5.0,
        guaranteedAmount: '2970000000'
      }

      const mockTxDataBase = {
        to: '0xBaseRouter',
        data: '0xbasecalldata',
        value: '1000000000000000000',
        gasLimit: '150000',
        spenderAddress: '0xBaseRouter',
        needsApproval: false
      }

      const mockAuraAdapterWithBuild = mockAuraAdapter as any
      mockAuraAdapterWithBuild.buildSwapTransaction = jest.fn().mockResolvedValue(mockTxDataBase)

      const result = await swapTools.handleTool('swap.prepare', {
        quote: mockQuoteBase,
        userAddress: '0x1234567890123456789012345678901234567890',
        slippageTolerance: 0.5
      })

      expect(result.success).toBe(true)
      // Verify AURA was called to build transaction (not hard-coded logic)
      expect(mockAuraAdapterWithBuild.buildSwapTransaction).toHaveBeenCalled()
    })
  })

  describe('swap.execute', () => {
    it('should require x402 payment when configured', async () => {
      const request = {
        signedTx: '0xsignedtxdata',
        chain: 'base'
      }

      const result = await swapTools.handleTool('swap.execute', request)

      // Should return payment required (x402)
      expect('invoiceId' in result).toBe(true)
      if ('invoiceId' in result) {
        expect(result.asset).toBe('USDC')
      }
    })
  })
})
