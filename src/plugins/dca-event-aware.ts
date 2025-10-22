import {
  DCAEventAwareParams,
  StrategyProposeResponse,
  TxSimulateResponse,
  TxExecuteResponse
} from '../types/index.js'

export interface DCAEventAwarePlugin {
  propose(params: DCAEventAwareParams): Promise<StrategyProposeResponse>
  simulate(intentId: string, params: DCAEventAwareParams): Promise<TxSimulateResponse>
  execute(intentId: string, params: DCAEventAwareParams): Promise<TxExecuteResponse>
}

export class DCAEventAwareStrategy implements DCAEventAwarePlugin {
  async propose(params: DCAEventAwareParams): Promise<StrategyProposeResponse> {
    const intentId = `dca_${Date.now()}`
    
    // Generate DCA plan
    const plan = this.generateDCAPlan(params)
    
    // Identify risks
    const risks = this.identifyRisks(params)
    
    return {
      intentId,
      plan,
      risks,
      next: 'tx.simulate'
    }
  }

  async simulate(intentId: string, params: DCAEventAwareParams): Promise<TxSimulateResponse> {
    // Simulate DCA transaction
    const splits = Math.ceil(params.budgetUsd / 50)
    const splitAmount = params.budgetUsd / splits
    
    // Estimate gas for multiple transactions
    const gasPerTx = 150000 // Standard gas limit
    const gasPrice = params.eventRules.maxGasGwei
    const totalGas = gasPerTx * splits * gasPrice
    
    // Estimate slippage based on asset
    let slippagePct = 0.3 // Default 0.3%
    if (params.asset === 'ETH') {
      slippagePct = 0.2 // Lower slippage for ETH
    } else if (params.asset === 'USDC' || params.asset === 'USDT') {
      slippagePct = 0.1 // Very low slippage for stablecoins
    }

    return {
      ok: true,
      est: {
        feeUsd: totalGas * 2000 / 1e9, // Convert gwei to USD (assuming ETH = $2000)
        slippagePct,
        avgPrice: this.getAssetPrice(params.asset)
      },
      guardsTriggered: []
    }
  }

  async execute(intentId: string, params: DCAEventAwareParams): Promise<TxExecuteResponse> {
    // Execute DCA strategy
    const splits = Math.ceil(params.budgetUsd / 50)
    
    // For demo purposes, execute one transaction
    // In reality, this would schedule multiple transactions
    const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
    
    return {
      status: 'submitted',
      txHash: mockTxHash,
      route: 'AURA:dca-executor',
      notes: `DCA strategy initiated with ${splits} splits over ${this.parseCadenceToDays(params.cadence)} days`
    }
  }

  private generateDCAPlan(params: DCAEventAwareParams): any {
    const splits = Math.ceil(params.budgetUsd / 50) // Split into ~$50 chunks
    const windowDays = this.parseCadenceToDays(params.cadence)
    const intervalHours = (windowDays * 24) / splits

    return {
      splits,
      windowDays,
      intervalHours,
      venue: this.selectOptimalVenues(params.asset),
      maxSlipPct: 0.5,
      budgetUsd: params.budgetUsd,
      asset: params.asset,
      eventRules: params.eventRules,
      execution: {
        type: 'scheduled',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  }

  private identifyRisks(params: DCAEventAwareParams): string[] {
    const risks = []
    
    // Gas price risks
    if (params.eventRules.maxGasGwei > 30) {
      risks.push('high_gas_prices')
    }
    
    // Asset volatility risks
    if (params.asset !== 'ETH' && params.asset !== 'USDC' && params.asset !== 'USDT') {
      risks.push('altcoin_volatility')
    }
    
    // Event-based risks
    if (params.eventRules.pauseOnUnlock) {
      risks.push('token_unlock_events')
    }
    
    // Drawdown risks
    if (params.eventRules.boostOnDrawdownPct > 5) {
      risks.push('aggressive_boost_settings')
    }

    return risks
  }

  private parseCadenceToDays(cadence: string): number {
    if (cadence.includes('daily')) return 1
    if (cadence.includes('2x/week')) return 7
    if (cadence.includes('weekly')) return 7
    if (cadence.includes('monthly')) return 30
    return 7 // default
  }

  private selectOptimalVenues(asset: string): string[] {
    const venues = []
    
    // Always include Uniswap for major assets
    venues.push('uniswap')
    
    // Add venue-specific logic based on asset
    if (asset === 'ETH' || asset === 'USDC' || asset === 'USDT') {
      venues.push('1inch', 'sushiswap')
    } else {
      // For altcoins, focus on venues with good liquidity
      venues.push('sushiswap', 'balancer')
    }
    
    return venues
  }

  private getAssetPrice(asset: string): number {
    // Mock prices - in reality, would fetch from price feeds
    const prices: { [key: string]: number } = {
      'ETH': 2000,
      'USDC': 1,
      'USDT': 1,
      'BTC': 45000,
      'ADA': 0.5,
      'DOT': 7
    }
    
    return prices[asset] || 1
  }
}
