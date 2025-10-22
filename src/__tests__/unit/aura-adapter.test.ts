import { AuraAdapter } from '../../core/aura-adapter'
import { DCAEventAwareParams, LiquidationGuardParams } from '@/types'

describe('AuraAdapter', () => {
  let auraAdapter: AuraAdapter

  beforeEach(() => {
    auraAdapter = new AuraAdapter({
      apiUrl: 'http://localhost:3001',
      apiKey: 'test-key',
      timeout: 30000
    })
  })

  describe('getPortfolioBalance', () => {
    it('should return portfolio balance with mock data', async () => {
      const result = await auraAdapter.getPortfolioBalance('0x1234567890123456789012345678901234567890')

      expect(result.native).toBeDefined()
      expect(result.tokens).toBeDefined()
      expect(Array.isArray(result.tokens)).toBe(true)
    })

    it('should handle empty portfolio', async () => {
      const result = await auraAdapter.getPortfolioBalance('0x1234567890123456789012345678901234567890')

      expect(result.native).toBe('0')
      expect(result.tokens).toHaveLength(0)
    })
  })

  describe('getPortfolioPositions', () => {
    it('should return portfolio positions', async () => {
      const result = await auraAdapter.getPortfolioPositions('0x1234567890123456789012345678901234567890')

      expect(result.positions).toBeDefined()
      expect(Array.isArray(result.positions)).toBe(true)
    })
  })

  describe('proposeStrategy', () => {
    it('should propose DCA Event-Aware strategy', async () => {
      const params: DCAEventAwareParams = {
        asset: 'ETH',
        budgetUsd: 200,
        cadence: '2x/week',
        eventRules: {
          pauseOnUnlock: true,
          maxGasGwei: 25,
          boostOnDrawdownPct: 3
        }
      }

      const result = await auraAdapter.proposeStrategy('dca_event_aware', params, '0x1234567890123456789012345678901234567890')

      expect(result.intentId).toMatch(/^dca_event_aware_\d+$/)
      expect(result.plan).toHaveProperty('splits')
      expect(result.plan).toHaveProperty('windowDays')
      expect(result.plan).toHaveProperty('venue')
      expect(result.risks).toBeDefined()
      expect(Array.isArray(result.risks)).toBe(true)
      expect(result.next).toBe('tx.simulate')
    })

    it('should propose Liquidation Guard strategy', async () => {
      const params: LiquidationGuardParams = {
        protocols: ['aave', 'compound'],
        maxHealthFactor: 2.0,
        minHealthFactor: 1.3,
        autoRepayThreshold: 500
      }

      const result = await auraAdapter.proposeStrategy('liquidation_guard', params, '0x1234567890123456789012345678901234567890')

      expect(result.intentId).toMatch(/^liquidation_guard_\d+$/)
      expect(result.plan).toHaveProperty('protocols')
      expect(result.plan).toHaveProperty('maxHealthFactor')
      expect(result.plan).toHaveProperty('minHealthFactor')
      expect(result.risks).toBeDefined()
      expect(Array.isArray(result.risks)).toBe(true)
      expect(result.next).toBe('tx.simulate')
    })

    it('should throw error for unknown strategy', async () => {
      await expect(
        auraAdapter.proposeStrategy('unknown_strategy', {}, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Unknown strategy intent: unknown_strategy')
    })
  })
})
