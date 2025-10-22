import { 
  GuardEngineConfig, 
  GuardRuleParams,
  GuardType,
  TxSimulateResponse,
  TxExecuteRequest
} from '../types/index.js'

export interface GuardRule {
  type: GuardType
  params: GuardRuleParams
  enabled: boolean
}

export interface GuardResult {
  passed: boolean
  triggeredGuards: string[]
  warnings: string[]
}

export class GuardEngine {
  private rules: Map<string, GuardRule> = new Map()
  private config: GuardEngineConfig
  private emergencyStop = false

  constructor(config: GuardEngineConfig) {
    this.config = config
    this.loadDefaultRules()
  }

  /**
   * Add or update a guard rule
   */
  setRule(name: string, type: GuardType, params: GuardRuleParams): void {
    this.rules.set(name, {
      type,
      params,
      enabled: true
    })
  }

  /**
   * Remove a guard rule
   */
  removeRule(name: string): void {
    this.rules.delete(name)
  }

  /**
   * Enable/disable a guard rule
   */
  toggleRule(name: string, enabled: boolean): void {
    const rule = this.rules.get(name)
    if (rule) {
      rule.enabled = enabled
    }
  }

  /**
   * Check if a transaction simulation passes all guards
   */
  validateSimulation(simulation: TxSimulateResponse, txRequest: any): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    // Check if emergency stop is active
    if (this.emergencyStop || this.config.emergencyStop) {
      triggeredGuards.push('emergency_stop')
      return {
        passed: false,
        triggeredGuards,
        warnings: ['Emergency stop is active']
      }
    }

    // Check all enabled rules
    for (const [ruleName, rule] of this.rules) {
      if (!rule.enabled) continue

      const result = this.checkRule(ruleName, rule, simulation, txRequest)
      if (!result.passed) {
        triggeredGuards.push(...result.triggeredGuards)
        warnings.push(...result.warnings)
      }
    }

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Check if a transaction execution request passes all guards
   */
  validateExecution(executeRequest: TxExecuteRequest): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    // Check if emergency stop is active
    if (this.emergencyStop || this.config.emergencyStop) {
      triggeredGuards.push('emergency_stop')
      return {
        passed: false,
        triggeredGuards,
        warnings: ['Emergency stop is active']
      }
    }

    // Check daily limits if configured
    if (this.config.maxDailyVolumeUsd || this.config.maxDailyTransactions) {
      const dailyCheck = this.checkDailyLimits(executeRequest)
      if (!dailyCheck.passed) {
        triggeredGuards.push(...dailyCheck.triggeredGuards)
        warnings.push(...dailyCheck.warnings)
      }
    }

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Check a specific rule
   */
  private checkRule(
    ruleName: string, 
    rule: GuardRule, 
    simulation: TxSimulateResponse, 
    txRequest: any
  ): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    switch (rule.type) {
      case 'risk':
        const riskResult = this.checkRiskGuards(rule.params, simulation, txRequest)
        if (!riskResult.passed) {
          triggeredGuards.push(`${ruleName}_risk`)
          warnings.push(...riskResult.warnings)
        }
        break

      case 'gas':
        const gasResult = this.checkGasGuards(rule.params, simulation, txRequest)
        if (!gasResult.passed) {
          triggeredGuards.push(`${ruleName}_gas`)
          warnings.push(...gasResult.warnings)
        }
        break

      case 'route':
        const routeResult = this.checkRouteGuards(rule.params, simulation, txRequest)
        if (!routeResult.passed) {
          triggeredGuards.push(`${ruleName}_route`)
          warnings.push(...routeResult.warnings)
        }
        break

      case 'deny':
        const denyResult = this.checkDenyGuards(rule.params, simulation, txRequest)
        if (!denyResult.passed) {
          triggeredGuards.push(`${ruleName}_deny`)
          warnings.push(...denyResult.warnings)
        }
        break
    }

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Check risk-related guards
   */
  private checkRiskGuards(params: GuardRuleParams, simulation: TxSimulateResponse, txRequest: any): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    // Check slippage
    if (params.maxSlippagePct && simulation.est.slippagePct > params.maxSlippagePct) {
      triggeredGuards.push('max_slippage_exceeded')
      warnings.push(`Slippage ${simulation.est.slippagePct}% exceeds maximum ${params.maxSlippagePct}%`)
    }

    // Check drawdown (would need historical data)
    if (params.maxDrawdownPct) {
      // This would require portfolio history analysis
      // For now, we'll skip this check
    }

    // Check minimum liquidity
    if (params.minLiquidityUsd && simulation.est.avgPrice) {
      // This would require checking DEX liquidity
      // For now, we'll skip this check
    }

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Check gas-related guards
   */
  private checkGasGuards(params: GuardRuleParams, simulation: TxSimulateResponse, txRequest: any): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    // Check max gas price
    if (params.maxGasGwei && txRequest.gasPrice) {
      const gasPriceGwei = parseFloat(txRequest.gasPrice) / 1e9
      if (gasPriceGwei > params.maxGasGwei) {
        triggeredGuards.push('max_gas_price_exceeded')
        warnings.push(`Gas price ${gasPriceGwei} gwei exceeds maximum ${params.maxGasGwei} gwei`)
      }
    }

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Check route-related guards
   */
  private checkRouteGuards(params: GuardRuleParams, simulation: TxSimulateResponse, txRequest: any): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    // Check allowed DEXes
    if (params.allowedDexes && (simulation as any).route) {
      const routeDexes = this.extractDexesFromRoute((simulation as any).route)
      const hasAllowedDex = routeDexes.some(dex => params.allowedDexes!.includes(dex))
      if (!hasAllowedDex) {
        triggeredGuards.push('unauthorized_dex')
        warnings.push(`Route uses unauthorized DEXes: ${routeDexes.join(', ')}`)
      }
    }

    // Check blocked tokens
    if (params.blockedTokens && txRequest.tokenAddresses) {
      const blockedTokens = txRequest.tokenAddresses.filter((addr: string) => 
        params.blockedTokens!.includes(addr.toLowerCase())
      )
      if (blockedTokens.length > 0) {
        triggeredGuards.push('blocked_token')
        warnings.push(`Transaction involves blocked tokens: ${blockedTokens.join(', ')}`)
      }
    }

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Check deny list guards
   */
  private checkDenyGuards(params: GuardRuleParams, simulation: TxSimulateResponse, txRequest: any): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    // Check blocked addresses
    if (params.blockedAddresses && txRequest.to) {
      if (params.blockedAddresses.includes(txRequest.to.toLowerCase())) {
        triggeredGuards.push('blocked_address')
        warnings.push(`Transaction target is blocked: ${txRequest.to}`)
      }
    }

    // Check blocked protocols
    if (params.blockedProtocols && (simulation as any).route) {
      const routeProtocols = this.extractProtocolsFromRoute((simulation as any).route)
      const blockedProtocols = routeProtocols.filter(protocol => 
        params.blockedProtocols!.includes(protocol)
      )
      if (blockedProtocols.length > 0) {
        triggeredGuards.push('blocked_protocol')
        warnings.push(`Route uses blocked protocols: ${blockedProtocols.join(', ')}`)
      }
    }

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Check daily limits
   */
  private checkDailyLimits(executeRequest: TxExecuteRequest): GuardResult {
    const triggeredGuards: string[] = []
    const warnings: string[] = []

    // This would require implementing daily tracking
    // For now, we'll return a passed result
    // In a real implementation, you'd check against a database or cache

    return {
      passed: triggeredGuards.length === 0,
      triggeredGuards,
      warnings
    }
  }

  /**
   * Load default rules from config
   */
  private loadDefaultRules(): void {
    for (const [ruleName, params] of Object.entries(this.config.defaultRules)) {
      this.setRule(ruleName, 'risk', params)
    }
  }

  /**
   * Extract DEX names from route string
   */
  private extractDexesFromRoute(route: string): string[] {
    // Simple implementation - in reality, you'd parse the route more carefully
    const dexes = []
    if (route.toLowerCase().includes('uniswap')) dexes.push('uniswap')
    if (route.toLowerCase().includes('1inch')) dexes.push('1inch')
    if (route.toLowerCase().includes('sushiswap')) dexes.push('sushiswap')
    return dexes
  }

  /**
   * Extract protocol names from route string
   */
  private extractProtocolsFromRoute(route: string): string[] {
    // Simple implementation - in reality, you'd parse the route more carefully
    const protocols = []
    if (route.toLowerCase().includes('aave')) protocols.push('aave')
    if (route.toLowerCase().includes('compound')) protocols.push('compound')
    if (route.toLowerCase().includes('curve')) protocols.push('curve')
    return protocols
  }

  /**
   * Set emergency stop
   */
  setEmergencyStop(enabled: boolean): void {
    this.emergencyStop = enabled
  }

  /**
   * Get all rules
   */
  getAllRules(): Map<string, GuardRule> {
    return new Map(this.rules)
  }

  /**
   * Check transaction parameters against guard rules
   * Used by transaction simulation and execution tools
   */
  checkTransaction(txParams: {
    gasLimit?: number
    maxFeePerGas?: number
    slippagePct?: number
    [key: string]: any
  }): { passed: boolean; violations?: string[] } {
    const violations: string[] = []

    if (this.emergencyStop || this.config.emergencyStop) {
      violations.push('Emergency stop is active')
      return { passed: false, violations }
    }

    for (const [ruleName, rule] of this.rules) {
      if (!rule.enabled) continue

      if (rule.type === 'gas' && rule.params.maxGasGwei && txParams.maxFeePerGas) {
        if (txParams.maxFeePerGas > rule.params.maxGasGwei) {
          violations.push(`Gas fee ${txParams.maxFeePerGas} gwei exceeds maximum ${rule.params.maxGasGwei} gwei`)
        }
      }

      if (rule.type === 'risk' && rule.params.maxSlippagePct && txParams.slippagePct) {
        if (txParams.slippagePct > rule.params.maxSlippagePct) {
          violations.push(`Slippage ${txParams.slippagePct}% exceeds maximum ${rule.params.maxSlippagePct}%`)
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    }
  }

  /**
   * Validate a swap transaction
   */
  validateSwap(swapParams: {
    fromToken: string
    toToken: string
    fromAmount: string
    toAmount: string
    slippagePct: number
    gasPrice: string
    route: string[]
  }): { allowed: boolean; reasons: string[] } {
    const reasons: string[] = []

    if (this.emergencyStop || this.config.emergencyStop) {
      reasons.push('Emergency stop is active')
      return { allowed: false, reasons }
    }

    for (const [ruleName, rule] of this.rules) {
      if (!rule.enabled) continue

      if (rule.type === 'risk' && rule.params.maxSlippagePct) {
        if (swapParams.slippagePct > rule.params.maxSlippagePct) {
          reasons.push(`Slippage ${swapParams.slippagePct}% exceeds maximum ${rule.params.maxSlippagePct}%`)
        }
      }

      if (rule.type === 'gas' && rule.params.maxGasGwei) {
        const gasPriceGwei = parseFloat(swapParams.gasPrice) / 1e9
        if (gasPriceGwei > rule.params.maxGasGwei) {
          reasons.push(`Gas price ${gasPriceGwei} gwei exceeds maximum ${rule.params.maxGasGwei} gwei`)
        }
      }

      if (rule.type === 'route' && rule.params.allowedDexes) {
        const hasAllowedDex = swapParams.route.some(dex => 
          rule.params.allowedDexes!.some(allowed => 
            dex.toLowerCase().includes(allowed.toLowerCase())
          )
        )
        if (swapParams.route.length > 0 && !hasAllowedDex) {
          reasons.push(`Route uses unauthorized DEXes: ${swapParams.route.join(', ')}`)
        }
      }

      if (rule.type === 'deny') {
        if (rule.params.blockedTokens) {
          const blockedTokens = rule.params.blockedTokens.filter(blocked => 
            swapParams.fromToken.toLowerCase() === blocked.toLowerCase() ||
            swapParams.toToken.toLowerCase() === blocked.toLowerCase()
          )
          if (blockedTokens.length > 0) {
            reasons.push(`Transaction involves blocked tokens: ${blockedTokens.join(', ')}`)
          }
        }
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons
    }
  }
}
