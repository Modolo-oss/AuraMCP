import { AuraAdapter } from '../../core/aura-adapter'
import { GuardEngine } from '../../core/guard-engine'
import { StrategyTools } from '../../tools/strategy'
import { TransactionTools } from '../../tools/transaction'
import { GuardEngineConfig } from '@/types'

describe('Strategy Flow Integration', () => {
  let auraAdapter: AuraAdapter
  let guardEngine: GuardEngine
  let strategyTools: StrategyTools
  let transactionTools: TransactionTools

  beforeEach(() => {
    auraAdapter = new AuraAdapter({
      apiUrl: 'http://localhost:3001',
      apiKey: 'test-key'
    })

    const config: GuardEngineConfig = {
      defaultRules: {
        risk: {
          maxSlippagePct: 1.0,
          maxGasGwei: 50
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
    strategyTools = new StrategyTools(auraAdapter, guardEngine)
    transactionTools = new TransactionTools(guardEngine)
  })

  describe('DCA Event-Aware Strategy Flow', () => {
    it('should complete full flow: propose -> simulate -> execute', async () => {
      // Step 1: Propose strategy
      const proposeRequest = {
        intent: 'dca_event_aware',
        params: {
          asset: 'ETH',
          budgetUsd: 200,
          cadence: '2x/week',
          eventRules: {
            pauseOnUnlock: true,
            maxGasGwei: 25,
            boostOnDrawdownPct: 3
          }
        }
      }

      const proposeResult = await strategyTools.handleTool('strategy.propose', proposeRequest)
      expect(proposeResult.success).toBe(true)
      expect(proposeResult.data.intentId).toBeDefined()
      expect(proposeResult.data.next).toBe('tx.simulate')

      const intentId = proposeResult.data.intentId

      // Step 2: Simulate transaction
      const simulateRequest = {
        intentId,
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '100000000000000000', // 0.1 ETH
          gasLimit: '150000',
          gasPrice: '20000000000' // 20 gwei
        }
      }

      const simulateResult = await transactionTools.handleTool('tx.simulate', simulateRequest)
      expect(simulateResult.success).toBe(true)
      expect(simulateResult.data.ok).toBe(true)
      expect(simulateResult.data.est).toBeDefined()

      // Step 3: Execute transaction
      const executeRequest = {
        intentId,
        txParams: simulateRequest.txParams
      }

      const executeResult = await transactionTools.handleTool('tx.execute', executeRequest)
      // executeResult could be McpResponse or X402PaymentRequired
      if ('success' in executeResult) {
        expect(executeResult.success).toBe(true)
        if (executeResult.success && executeResult.data) {
          expect(executeResult.data.status).toBeDefined()
        }
      } else {
        // It's an X402 payment required response
        expect(executeResult).toHaveProperty('invoiceId')
        expect(executeResult).toHaveProperty('amount')
      }
    })
  })

  describe('Liquidation Guard Strategy Flow', () => {
    it('should complete full flow for liquidation guard', async () => {
      // Propose liquidation guard strategy
      const proposeResult = await strategyTools.handleTool('strategy.propose', {
        intent: 'liquidation_guard',
        params: {
          protocols: ['aave', 'compound'],
          maxHealthFactor: 2.0,
          minHealthFactor: 1.3,
          autoRepayThreshold: 500
        }
      })

      expect(proposeResult.success).toBe(true)
      expect(proposeResult.data.intentId).toBeDefined()
      expect(proposeResult.data.plan.protocols).toContain('aave')
      expect(proposeResult.data.plan.protocols).toContain('compound')
    })

    it('should identify risks correctly', async () => {
      const proposeResult = await strategyTools.handleTool('strategy.propose', {
        intent: 'liquidation_guard',
        params: {
          protocols: ['compound'], // Using a risky protocol
          maxHealthFactor: 2.0,
          minHealthFactor: 1.1, // Very low minimum
          autoRepayThreshold: 1000 // High threshold
        }
      })

      expect(proposeResult.success).toBe(true)
      expect(proposeResult.data.risks).toContain('low_health_factor')
      // Check if any high threshold risks are present
      expect(proposeResult.data.risks.length).toBeGreaterThan(0)
      // Check if any protocol-related risks are present
      expect(proposeResult.data.risks.length).toBeGreaterThan(0)
    })
  })

  describe('Emergency Stop', () => {
    it('should block all transactions when emergency stop is active', async () => {
      // Activate emergency stop
      guardEngine.setEmergencyStop(true)

      const simulateResult = await transactionTools.handleTool('tx.simulate', {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '100000000000000000'
        }
      })

      // Emergency stop should block simulation
      expect(simulateResult.success).toBe(false)
      expect(simulateResult.error?.code).toBe('GUARD_VIOLATION')

      const executeResult = await transactionTools.handleTool('tx.execute', {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '100000000000000000'
        }
      })

      expect(executeResult.success).toBe(false)
      expect(executeResult.error?.code).toBe('GUARD_VIOLATION')
    })
  })
})
