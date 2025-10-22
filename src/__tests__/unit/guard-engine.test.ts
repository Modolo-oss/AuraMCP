import { GuardEngine } from '../../core/guard-engine'
import { GuardEngineConfig, TxSimulateResponse, TxExecuteRequest } from '@/types'

describe('GuardEngine', () => {
  let guardEngine: GuardEngine
  let config: GuardEngineConfig

  beforeEach(() => {
    config = {
      defaultRules: {
        risk: {
          maxSlippagePct: 1.0,
          maxGasGwei: 50,
          minLiquidityUsd: 10000
        },
        gas: {
          maxGasGwei: 100
        },
        route: {
          allowedDexes: ['uniswap', '1inch'],
          blockedTokens: []
        },
        deny: {
          blockedAddresses: [],
          blockedProtocols: []
        }
      },
      emergencyStop: false
    }
    guardEngine = new GuardEngine(config)
  })

  describe('setRule', () => {
    it('should add a new guard rule', () => {
      guardEngine.setRule('test-risk', 'risk', {
        maxSlippagePct: 2.0,
        maxGasGwei: 30
      })

      const rules = guardEngine.getAllRules()
      expect(rules.has('test-risk')).toBe(true)
      expect(rules.get('test-risk')?.params.maxSlippagePct).toBe(2.0)
    })
  })

  describe('validateSimulation', () => {
    it('should pass validation for normal transaction', () => {
      const simulation: TxSimulateResponse = {
        ok: true,
        est: {
          feeUsd: 5.0,
          slippagePct: 0.3,
          avgPrice: 2000
        },
        guardsTriggered: []
      }

      const result = guardEngine.validateSimulation(simulation, {})
      expect(result.passed).toBe(true)
      expect(result.triggeredGuards).toHaveLength(0)
    })

    it('should fail validation for high slippage', () => {
      const simulation: TxSimulateResponse = {
        ok: true,
        est: {
          feeUsd: 5.0,
          slippagePct: 2.0, // Above max of 1.0%
          avgPrice: 2000
        },
        guardsTriggered: []
      }

      const result = guardEngine.validateSimulation(simulation, {})
      expect(result.passed).toBe(false)
      expect(result.triggeredGuards).toContain('risk_risk')
    })

    it('should fail validation when emergency stop is active', () => {
      guardEngine.setEmergencyStop(true)

      const simulation: TxSimulateResponse = {
        ok: true,
        est: {
          feeUsd: 5.0,
          slippagePct: 0.3,
          avgPrice: 2000
        },
        guardsTriggered: []
      }

      const result = guardEngine.validateSimulation(simulation, {})
      expect(result.passed).toBe(false)
      expect(result.triggeredGuards).toContain('emergency_stop')
    })
  })

  describe('validateExecution', () => {
    it('should pass validation for normal execution', () => {
      const executeRequest: TxExecuteRequest = {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '1000000000000000000'
        }
      }

      const result = guardEngine.validateExecution(executeRequest)
      expect(result.passed).toBe(true)
      expect(result.triggeredGuards).toHaveLength(0)
    })

    it('should fail validation when emergency stop is active', () => {
      guardEngine.setEmergencyStop(true)

      const executeRequest: TxExecuteRequest = {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '1000000000000000000'
        }
      }

      const result = guardEngine.validateExecution(executeRequest)
      expect(result.passed).toBe(false)
      expect(result.triggeredGuards).toContain('emergency_stop')
    })
  })

  describe('toggleRule', () => {
    it('should enable/disable a rule', () => {
      guardEngine.setRule('test-rule', 'risk', { maxSlippagePct: 1.0 })
      
      guardEngine.toggleRule('test-rule', false)
      const rules = guardEngine.getAllRules()
      expect(rules.get('test-rule')?.enabled).toBe(false)

      guardEngine.toggleRule('test-rule', true)
      expect(rules.get('test-rule')?.enabled).toBe(true)
    })
  })

  describe('removeRule', () => {
    it('should remove a rule', () => {
      guardEngine.setRule('test-rule', 'risk', { maxSlippagePct: 1.0 })
      expect(guardEngine.getAllRules().has('test-rule')).toBe(true)

      guardEngine.removeRule('test-rule')
      expect(guardEngine.getAllRules().has('test-rule')).toBe(false)
    })
  })
})
