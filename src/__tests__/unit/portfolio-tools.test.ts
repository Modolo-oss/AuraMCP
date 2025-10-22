import { PortfolioTools } from '../../tools/portfolio'
import { AuraAdapter } from '../../core/aura-adapter'
import { PortfolioBalanceRequest, PortfolioPositionsRequest } from '@/types'

describe('PortfolioTools', () => {
  let portfolioTools: PortfolioTools
  let mockAuraAdapter: jest.Mocked<AuraAdapter>

  beforeEach(() => {
    mockAuraAdapter = {
      getPortfolioBalance: jest.fn(),
      getPortfolioPositions: jest.fn()
    } as any

    portfolioTools = new PortfolioTools(mockAuraAdapter)
  })

  describe('getBalance', () => {
    it('should return portfolio balance successfully', async () => {
      const mockBalance = {
        native: '1.23456789',
        tokens: [
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            decimals: 6,
            balance: '1000.50',
            usd: 1000.50
          }
        ]
      }

      mockAuraAdapter.getPortfolioBalance.mockResolvedValue(mockBalance)

      const request: PortfolioBalanceRequest = {
        chain: 'ethereum',
        address: '0x1234567890123456789012345678901234567890'
      }

      const result = await portfolioTools.handleTool('portfolio.getBalance', request)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockBalance)
      expect(result.metadata?.requestId).toMatch(/^balance_\d+$/)
      expect(mockAuraAdapter.getPortfolioBalance).toHaveBeenCalledWith(request.address)
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Network error')
      mockAuraAdapter.getPortfolioBalance.mockRejectedValue(error)

      const request: PortfolioBalanceRequest = {
        chain: 'ethereum',
        address: '0x1234567890123456789012345678901234567890'
      }

      const result = await portfolioTools.handleTool('portfolio.getBalance', request)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('BALANCE_FETCH_ERROR')
      expect(result.error?.message).toBe('Network error')
    })
  })

  describe('getPositions', () => {
    it('should return portfolio positions successfully', async () => {
      const mockPositions = {
        positions: [
          {
            protocol: 'Aave',
            type: 'lending',
            healthFactor: 1.85,
            collateralUsd: 2500,
            debtUsd: 1350,
            apr: 3.2
          }
        ]
      }

      mockAuraAdapter.getPortfolioPositions.mockResolvedValue(mockPositions)

      const request: PortfolioPositionsRequest = {
        chain: 'ethereum',
        address: '0x1234567890123456789012345678901234567890'
      }

      const result = await portfolioTools.handleTool('portfolio.getPositions', request)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPositions)
      expect(result.metadata?.requestId).toMatch(/^positions_\d+$/)
      expect(mockAuraAdapter.getPortfolioPositions).toHaveBeenCalledWith(request.address)
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('RPC error')
      mockAuraAdapter.getPortfolioPositions.mockRejectedValue(error)

      const request: PortfolioPositionsRequest = {
        chain: 'ethereum',
        address: '0x1234567890123456789012345678901234567890'
      }

      const result = await portfolioTools.handleTool('portfolio.getPositions', request)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('POSITIONS_FETCH_ERROR')
      expect(result.error?.message).toBe('RPC error')
    })
  })

  describe('handleTool', () => {
    it('should throw error for unknown tool', async () => {
      await expect(
        portfolioTools.handleTool('portfolio.unknown', {})
      ).rejects.toThrow('Unknown portfolio tool: portfolio.unknown')
    })
  })
})
