export enum PricingTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE'
}

export interface ToolPricing {
  tier: PricingTier
  amount: string
  asset: string
  description: string
}

export const TOOL_PRICING: { [toolName: string]: ToolPricing } = {
  // FREE TIER - No payment required
  'portfolio.getBalance': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Get portfolio balance across all chains'
  },
  'portfolio.getPositions': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Get DeFi positions for wallet'
  },
  'strategy.propose': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Basic strategy recommendation (1 option)'
  },
  'strategy.backtest': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Backtest strategy with historical data'
  },
  'swap.parse': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Parse natural language swap intent'
  },
  'swap.prepare': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Generate swap link for MetaMask signing (< $1,000)'
  },
  'price.getQuote': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Real-time price quotes for any token pair'
  },
  'tx.simulate': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Simulate transaction to estimate costs'
  },
  'guard.setRules': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Set basic guard rules for risk management'
  },
  'guard.setEmergencyStop': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Enable/disable emergency stop'
  },
  'report.get': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Get performance report for session'
  },
  'system.health': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Get system health status'
  },

  // ALL TOOLS FREE - Payment system disabled (x402 coming soon in roadmap)
  'portfolio.getAdvancedAnalysis': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Deep portfolio analysis with risk factors and optimization suggestions'
  },
  'strategy.proposePremium': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Advanced AI strategy with multiple options, backtesting, and risk analysis'
  },
  'swap.executeLarge': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'High-value swap execution (> $1,000) with premium routing and MEV protection'
  },
  'tx.simulatePremium': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Advanced simulation with detailed gas estimation and route visualization'
  },
  'strategy.autoExecute': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Auto-execute AI strategy with continuous monitoring and rebalancing'
  },
  'portfolio.autoRebalance': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Automated portfolio rebalancing with DCA and yield optimization'
  },
  'guard.advancedRiskManagement': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Custom risk parameters with real-time monitoring and emergency triggers'
  },
  'tx.execute': {
    tier: PricingTier.FREE,
    amount: '0',
    asset: 'USDC',
    description: 'Execute high-value transaction with payment proof verification'
  }
}

// x402 Payment Configuration
// Receiver wallet address from environment variable (for x402 payment collection)
export const PAYMENT_RECEIVER_ADDRESS = process.env.X402_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000'
export const PAYMENT_ASSET = 'USDC'
export const PAYMENT_NETWORK = 'base'
export const BASE_CHAIN_ID = 8453
export const INVOICE_EXPIRY_MINUTES = 15

export function getToolPricing(toolName: string): ToolPricing | null {
  return TOOL_PRICING[toolName] || null
}

export function requiresPayment(toolName: string): boolean {
  const pricing = getToolPricing(toolName)
  return pricing !== null && pricing.tier !== PricingTier.FREE
}

export function getPaymentAmount(toolName: string): string {
  const pricing = getToolPricing(toolName)
  return pricing?.amount || '0'
}

export function getToolDescription(toolName: string): string {
  const pricing = getToolPricing(toolName)
  return pricing?.description || 'Unknown tool'
}
