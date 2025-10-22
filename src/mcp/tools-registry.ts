import { Tool } from '@modelcontextprotocol/sdk/types.js'

/**
 * MCP Tools Registry
 * Centralized tool definitions for both stdio and HTTP transports
 */
export class ToolsRegistry {
  private tools: Map<string, Tool> = new Map()

  constructor() {
    this.registerAllTools()
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values())
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  private registerAllTools() {
    // Portfolio tools
    this.tools.set('portfolio.getBalance', {
      name: 'portfolio.getBalance',
      description: 'Get portfolio balance for an address across all chains',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Ethereum address (0x...)'
          }
        },
        required: ['address']
      }
    })

    this.tools.set('portfolio.getPositions', {
      name: 'portfolio.getPositions',
      description: 'Get DeFi positions for an address',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Ethereum address (0x...)'
          }
        },
        required: ['address']
      }
    })

    // Strategy tools
    this.tools.set('strategy.propose', {
      name: 'strategy.propose',
      description: 'Propose a new DeFi strategy based on portfolio and market conditions',
      inputSchema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description: 'Strategy intent (dca_event_aware, auto_repay, rotate_to, liquidation_guard)'
          },
          params: {
            type: 'object',
            description: 'Strategy parameters'
          },
          address: {
            type: 'string',
            description: 'Ethereum address (0x...)'
          }
        },
        required: ['intent', 'params', 'address']
      }
    })

    this.tools.set('strategy.backtest', {
      name: 'strategy.backtest',
      description: 'Backtest a strategy with historical data',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            enum: ['dca_event_aware', 'basket_rotation', 'hedge_guard'],
            description: 'Strategy name to backtest'
          },
          params: {
            type: 'object',
            description: 'Strategy parameters'
          },
          lookbackDays: {
            type: 'number',
            minimum: 1,
            maximum: 365,
            description: 'Number of days to look back'
          }
        },
        required: ['name', 'params', 'lookbackDays']
      }
    })

    // Swap tools
    this.tools.set('swap.parse', {
      name: 'swap.parse',
      description: 'Parse natural language swap intent (e.g., "swap 1 ETH to USDC on Base")',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Natural language swap command'
          }
        },
        required: ['text']
      }
    })

    this.tools.set('swap.prepare', {
      name: 'swap.prepare',
      description: 'Generate shareable swap link for MetaMask signing. IMPORTANT: You MUST ask user for their wallet address (0x...) first if not already provided in conversation. After getting address, call this tool immediately without asking confirmation. Returns clickable URL for browser signature. Supports 200+ chains and 9M+ tokens.',
      inputSchema: {
        type: 'object',
        properties: {
          fromToken: {
            type: 'string',
            description: 'Source token symbol or address (e.g., ETH, USDC, 0x...)'
          },
          toToken: {
            type: 'string',
            description: 'Destination token symbol or address (e.g., USDC, DAI, 0x...)'
          },
          amount: {
            type: 'string',
            description: 'Amount to swap in decimal format (e.g., "0.001", "100")'
          },
          chain: {
            type: 'string',
            description: 'Blockchain network (ethereum, base, polygon, arbitrum, optimism, bsc, avalanche)'
          },
          userAddress: {
            type: 'string',
            description: 'REQUIRED: User wallet address (0x...). NEVER use 0x0000000000000000000000000000000000000000 or make up an address. If user has not provided their address, ask them first before calling this tool.'
          },
          slippagePercent: {
            type: 'number',
            description: 'Max slippage tolerance (default: 1.0 = 1%)',
            default: 1.0
          }
        },
        required: ['fromToken', 'toToken', 'amount', 'chain', 'userAddress']
      }
    })

    // Transaction tools
    this.tools.set('tx.simulate', {
      name: 'tx.simulate',
      description: 'Simulate a transaction to estimate costs and check guardrails',
      inputSchema: {
        type: 'object',
        properties: {
          intentId: {
            type: 'string',
            description: 'Intent ID from strategy.propose'
          },
          txParams: {
            type: 'object',
            description: 'Transaction parameters'
          }
        }
      }
    })

    this.tools.set('tx.execute', {
      name: 'tx.execute',
      description: 'Execute a transaction (may require payment via x402)',
      inputSchema: {
        type: 'object',
        properties: {
          intentId: {
            type: 'string',
            description: 'Intent ID from strategy.propose'
          },
          txParams: {
            type: 'object',
            description: 'Transaction parameters'
          },
          paymentProof: {
            type: 'object',
            description: 'x402 payment proof (if required)'
          }
        }
      }
    })

    // Guard tools
    this.tools.set('guard.setRules', {
      name: 'guard.setRules',
      description: 'Set guard rules for risk management',
      inputSchema: {
        type: 'object',
        properties: {
          ruleType: {
            type: 'string',
            enum: ['risk', 'gas', 'route', 'deny'],
            description: 'Type of guard rule'
          },
          params: {
            type: 'object',
            description: 'Guard rule parameters'
          }
        },
        required: ['ruleType', 'params']
      }
    })

    this.tools.set('guard.setEmergencyStop', {
      name: 'guard.setEmergencyStop',
      description: 'Enable or disable emergency stop (halt all transactions)',
      inputSchema: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Enable or disable emergency stop'
          }
        },
        required: ['enabled']
      }
    })

    // Report tools
    this.tools.set('report.get', {
      name: 'report.get',
      description: 'Get performance report for a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID'
          }
        },
        required: ['sessionId']
      }
    })

    // Price tools
    this.tools.set('price.getQuote', {
      name: 'price.getQuote',
      description: 'Get real-time cryptocurrency price quote for any token pair across 100+ DEX sources. Returns current market price with NO caching - fresh data every call. Use this when user asks "what is the price of X" or "how much is X worth". Supports 9M+ tokens across 200+ blockchains.',
      inputSchema: {
        type: 'object',
        properties: {
          fromToken: {
            type: 'string',
            description: 'Source token symbol or address (e.g., ETH, USDC, BTC, 0x...)'
          },
          toToken: {
            type: 'string',
            description: 'Destination token symbol for price quote (e.g., USDC, USD, ETH, 0x...)'
          },
          chain: {
            type: 'string',
            description: 'Blockchain network (ethereum, base, polygon, arbitrum, optimism, bsc, avalanche)',
            default: 'base'
          },
          amount: {
            type: 'string',
            description: 'Amount of fromToken to price (default: "1")',
            default: '1'
          }
        },
        required: ['fromToken', 'toToken']
      }
    })

    // Premium Portfolio tools (requires payment)
    this.tools.set('portfolio.getAdvancedAnalysis', {
      name: 'portfolio.getAdvancedAnalysis',
      description: '💎 PREMIUM ($0.05 USDC) - Deep portfolio analysis with risk factors, liquidation warnings, yield opportunities, and arbitrage detection. Provides optimization suggestions and health factor monitoring. Requires x402 payment proof.',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Wallet address for advanced analysis (0x...)'
          },
          paymentProof: {
            type: 'object',
            description: 'x402 payment proof (invoiceId, txHash) - if not provided, will return payment invoice',
            properties: {
              invoiceId: {
                type: 'string',
                description: 'Invoice ID from payment/create-invoice endpoint'
              },
              txHash: {
                type: 'string',
                description: 'Transaction hash of USDC payment on Base network'
              }
            }
          }
        },
        required: ['address']
      }
    })

    // Premium Strategy tools (requires payment)
    this.tools.set('strategy.proposePremium', {
      name: 'strategy.proposePremium',
      description: '💎 PREMIUM ($0.10 USDC) - Advanced AI strategy with multiple options (conservative/balanced/aggressive), backtesting over 90 days, risk analysis, and optimized parameters. Includes Sharpe ratio, win rate, and detailed recommendations. Requires x402 payment proof.',
      inputSchema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description: 'Strategy intent (dca_event_aware, auto_repay, rotate_to, liquidation_guard)'
          },
          params: {
            type: 'object',
            description: 'Strategy parameters'
          },
          address: {
            type: 'string',
            description: 'Wallet address for strategy proposal (0x...)'
          },
          paymentProof: {
            type: 'object',
            description: 'x402 payment proof (invoiceId, txHash) - if not provided, will return payment invoice',
            properties: {
              invoiceId: {
                type: 'string',
                description: 'Invoice ID from payment/create-invoice endpoint'
              },
              txHash: {
                type: 'string',
                description: 'Transaction hash of USDC payment on Base network'
              }
            }
          }
        },
        required: ['intent', 'params', 'address']
      }
    })

    // System tools
    this.tools.set('system.health', {
      name: 'system.health',
      description: 'Get system health status',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    })
  }
}
