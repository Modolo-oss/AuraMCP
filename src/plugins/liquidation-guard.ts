import {
  LiquidationGuardParams,
  StrategyProposeResponse,
  TxSimulateResponse,
  TxExecuteResponse
} from '../types/index.js'

export interface LiquidationGuardPlugin {
  propose(params: LiquidationGuardParams): Promise<StrategyProposeResponse>
  simulate(intentId: string, params: LiquidationGuardParams): Promise<TxSimulateResponse>
  execute(intentId: string, params: LiquidationGuardParams): Promise<TxExecuteResponse>
}

export class LiquidationGuardStrategy implements LiquidationGuardPlugin {
  async propose(params: LiquidationGuardParams): Promise<StrategyProposeResponse> {
    const intentId = `liquidation_guard_${Date.now()}`
    
    // Generate liquidation guard plan
    const plan = this.generateLiquidationGuardPlan(params)
    
    // Identify risks
    const risks = this.identifyLiquidationRisks(params)
    
    return {
      intentId,
      plan,
      risks,
      next: 'tx.simulate'
    }
  }

  async simulate(intentId: string, params: LiquidationGuardParams): Promise<TxSimulateResponse> {
    // Simulate liquidation guard monitoring setup
    const monitoringGas = 100000 // Gas for monitoring setup
    const gasPrice = 20 // 20 gwei
    
    // Estimate potential auto-repay gas
    const autoRepayGas = 200000 // Gas for auto-repay
    const maxRepaysPerDay = 3 // Maximum auto-repays per day
    
    const totalDailyGas = (monitoringGas + (autoRepayGas * maxRepaysPerDay)) * gasPrice
    
    return {
      ok: true,
      est: {
        feeUsd: totalDailyGas * 2000 / 1e9, // Convert gwei to USD
        slippagePct: 0, // No slippage for monitoring
        avgPrice: 0 // No price impact for monitoring
      },
      guardsTriggered: []
    }
  }

  async execute(intentId: string, params: LiquidationGuardParams): Promise<TxExecuteResponse> {
    // Execute liquidation guard setup
    const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
    
    return {
      status: 'submitted',
      txHash: mockTxHash,
      route: 'AURA:liquidation-monitor',
      notes: `Liquidation guard activated for ${params.protocols.length} protocols with HF threshold ${params.minHealthFactor}`
    }
  }

  private generateLiquidationGuardPlan(params: LiquidationGuardParams): any {
    return {
      protocols: params.protocols,
      maxHealthFactor: params.maxHealthFactor,
      minHealthFactor: params.minHealthFactor,
      autoRepayThreshold: params.autoRepayThreshold,
      monitoring: {
        interval: 300, // 5 minutes
        alertThreshold: 1.5, // Alert when HF drops below 1.5
        emergencyThreshold: 1.1 // Emergency action when HF drops below 1.1
      },
      actions: {
        autoRepay: {
          enabled: true,
          maxAmountUsd: params.autoRepayThreshold,
          tokens: ['USDC', 'USDT', 'ETH'] // Preferred repayment tokens
        },
        hedging: {
          enabled: true,
          protocol: 'perpetual', // Use perpetuals for hedging
          maxHedgeRatio: 0.5 // Max 50% hedge ratio
        },
        notification: {
          enabled: true,
          channels: ['email', 'telegram', 'discord']
        }
      },
      execution: {
        type: 'monitoring',
        startTime: new Date().toISOString(),
        duration: 'indefinite' // Runs until manually stopped
      }
    }
  }

  private identifyLiquidationRisks(params: LiquidationGuardParams): string[] {
    const risks = []
    
    // Health factor risks
    if (params.minHealthFactor < 1.2) {
      risks.push('very_low_health_factor')
    }
    
    if (params.maxHealthFactor > 2.0) {
      risks.push('conservative_health_factor')
    }
    
    // Protocol risks
    if (params.protocols.length === 0) {
      risks.push('no_protocols_configured')
    }
    
    if (params.protocols.length > 5) {
      risks.push('too_many_protocols')
    }
    
    // Auto-repay risks
    if (params.autoRepayThreshold > 1000) {
      risks.push('high_auto_repay_threshold')
    }
    
    // Protocol-specific risks
    const riskyProtocols = ['compound', 'cream', 'iron-bank']
    const hasRiskyProtocol = params.protocols.some(protocol => 
      riskyProtocols.includes(protocol.toLowerCase())
    )
    if (hasRiskyProtocol) {
      risks.push('risky_protocol_detected')
    }

    return risks
  }

  /**
   * Check if liquidation guard should trigger auto-repay
   */
  shouldTriggerAutoRepay(currentHealthFactor: number, params: LiquidationGuardParams): boolean {
    return currentHealthFactor <= params.minHealthFactor
  }

  /**
   * Calculate optimal repayment amount
   */
  calculateRepaymentAmount(
    currentHealthFactor: number, 
    targetHealthFactor: number,
    totalDebt: number
  ): number {
    // Simple calculation: repay enough to reach target health factor
    const healthFactorRatio = targetHealthFactor / currentHealthFactor
    const repaymentRatio = 1 - (1 / healthFactorRatio)
    
    return Math.min(totalDebt * repaymentRatio, totalDebt * 0.5) // Max 50% of debt
  }

  /**
   * Get optimal repayment token
   */
  getOptimalRepaymentToken(
    availableTokens: string[], 
    debtTokens: string[]
  ): string {
    // Prefer stablecoins for repayment
    const stablecoins = ['USDC', 'USDT', 'DAI']
    const preferredToken = availableTokens.find(token => 
      stablecoins.includes(token)
    )
    
    if (preferredToken) return preferredToken
    
    // Fallback to native token
    return availableTokens.includes('ETH') ? 'ETH' : availableTokens[0]
  }
}
