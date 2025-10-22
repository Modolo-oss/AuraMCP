import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { AuraAdapter } from './core/aura-adapter.js'
import { GuardEngine } from './core/guard-engine.js'
import { GuardEngineConfig } from './types/index.js'
import winston from 'winston'

// Import all tools
import { PortfolioTools } from './tools/portfolio.js'
import { StrategyTools } from './tools/strategy.js'
import { TransactionTools } from './tools/transaction.js'
import { GuardTools } from './tools/guard.js'
import { ReportTools } from './tools/report.js'
import { SystemTools } from './tools/system.js'
import { PriceTools } from './tools/price.js'

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})

class AuraMcpServer {
  private server: Server
  private auraAdapter: AuraAdapter
  private guardEngine: GuardEngine
  private tools: Map<string, Tool> = new Map()

  constructor() {
    this.server = new Server(
      {
        name: 'aura-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    // Initialize core components
    this.auraAdapter = new AuraAdapter({
      apiUrl: process.env.AURA_API_URL,
      apiKey: process.env.AURA_API_KEY,
      timeout: 30000
    })

    // Initialize guard engine with default config
    const guardConfig: GuardEngineConfig = {
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
          allowedDexes: ['uniswap', '1inch', 'sushiswap'],
          blockedTokens: []
        },
        deny: {
          blockedAddresses: [],
          blockedProtocols: []
        }
      },
      emergencyStop: false
    }
    this.guardEngine = new GuardEngine(guardConfig)

    this.setupHandlers()
    this.registerTools()
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values())
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      
      logger.info(`Tool called: ${name}`, { args })

      try {
        const result = await this.handleToolCall(name, args)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      } catch (error) {
        logger.error(`Tool error: ${name}`, { error: error instanceof Error ? error.message : String(error) })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  code: 'TOOL_ERROR',
                  message: error instanceof Error ? error.message : String(error)
                }
              }, null, 2)
            }
          ],
          isError: true
        }
      }
    })
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    // Portfolio tools
    if (name.startsWith('portfolio.')) {
      const portfolioTools = new PortfolioTools(this.auraAdapter)
      return await portfolioTools.handleTool(name, args)
    }

    // Strategy tools
    if (name.startsWith('strategy.')) {
      const strategyTools = new StrategyTools(this.auraAdapter, this.guardEngine)
      return await strategyTools.handleTool(name, args)
    }

    // Transaction tools
    if (name.startsWith('tx.')) {
      const txTools = new TransactionTools(this.guardEngine)
      return await txTools.handleTool(name, args)
    }

    // Guard tools
    if (name.startsWith('guard.')) {
      const guardTools = new GuardTools(this.guardEngine)
      return await guardTools.handleTool(name, args)
    }

    // Report tools
    if (name.startsWith('report.')) {
      const reportTools = new ReportTools()
      return await reportTools.handleTool(name, args)
    }

    // Price tools
    if (name.startsWith('price.')) {
      const priceTools = new PriceTools()
      return await priceTools.handleTool(name, args)
    }

    // System tools
    if (name.startsWith('system.')) {
      const systemTools = new SystemTools()
      return await systemTools.handleTool(name, args)
    }

    throw new Error(`Unknown tool: ${name}`)
  }

  private registerTools() {
    // Portfolio tools
    this.tools.set('portfolio.getBalance', {
      name: 'portfolio.getBalance',
      description: 'Get portfolio balance for an address on a specific chain',
      inputSchema: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism'],
            description: 'Blockchain network'
          },
          address: {
            type: 'string',
            description: 'Ethereum address (0x...)'
          }
        },
        required: ['chain', 'address']
      }
    })

    this.tools.set('portfolio.getPositions', {
      name: 'portfolio.getPositions',
      description: 'Get DeFi positions for an address',
      inputSchema: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism'],
            description: 'Blockchain network'
          },
          address: {
            type: 'string',
            description: 'Ethereum address (0x...)'
          }
        },
        required: ['chain', 'address']
      }
    })

    // Strategy tools
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

    this.tools.set('strategy.propose', {
      name: 'strategy.propose',
      description: 'Propose a new strategy based on current portfolio and market conditions',
      inputSchema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            enum: ['dca_event_aware', 'auto_repay', 'rotate_to', 'quest_batch', 'liquidation_guard'],
            description: 'Strategy intent'
          },
          params: {
            type: 'object',
            description: 'Strategy parameters'
          }
        },
        required: ['intent', 'params']
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

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    logger.info('AURA MCP Server started')
  }
}

// Start the server
const server = new AuraMcpServer()
server.run().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
