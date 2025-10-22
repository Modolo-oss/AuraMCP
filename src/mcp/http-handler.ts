import { FastifyRequest, FastifyReply } from 'fastify'
import { ToolsRegistry } from './tools-registry.js'
import { AuraAdapter } from '../core/aura-adapter.js'
import { GuardEngine } from '../core/guard-engine.js'
import { SwapTools } from '../tools/swap.js'
import { PortfolioTools } from '../tools/portfolio.js'
import { StrategyTools } from '../tools/strategy.js'
import { TransactionTools } from '../tools/transaction.js'
import { GuardTools } from '../tools/guard.js'
import { ReportTools } from '../tools/report.js'
import { SystemTools } from '../tools/system.js'
import { PriceTools } from '../tools/price.js'
import { PremiumPortfolioTools } from '../tools/premium-portfolio.js'
import { PremiumStrategyTools } from '../tools/premium-strategy.js'
import { requiresPayment, getPaymentAmount } from '../config/pricing.js'
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
})

export class McpHttpHandler {
  private toolsRegistry: ToolsRegistry
  private auraAdapter: AuraAdapter
  private guardEngine: GuardEngine
  private swapTools: SwapTools
  private portfolioTools: PortfolioTools
  private strategyTools: StrategyTools
  private txTools: TransactionTools
  private guardTools: GuardTools
  private reportTools: ReportTools
  private systemTools: SystemTools
  private priceTools: PriceTools
  private premiumPortfolioTools: PremiumPortfolioTools
  private premiumStrategyTools: PremiumStrategyTools

  constructor(auraAdapter: AuraAdapter, guardEngine: GuardEngine) {
    this.toolsRegistry = new ToolsRegistry()
    this.auraAdapter = auraAdapter
    this.guardEngine = guardEngine

    // Initialize all tool handlers
    this.swapTools = new SwapTools(auraAdapter, guardEngine)
    this.portfolioTools = new PortfolioTools(auraAdapter)
    this.strategyTools = new StrategyTools(auraAdapter, guardEngine)
    this.txTools = new TransactionTools(guardEngine)
    this.guardTools = new GuardTools(guardEngine)
    this.reportTools = new ReportTools()
    this.systemTools = new SystemTools()
    this.priceTools = new PriceTools()
    this.premiumPortfolioTools = new PremiumPortfolioTools(auraAdapter)
    this.premiumStrategyTools = new PremiumStrategyTools(auraAdapter, guardEngine)
  }

  /**
   * Handle MCP protocol requests over HTTP
   */
  async handleRequest(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any

    // MCP protocol uses JSON-RPC 2.0 format
    const { jsonrpc, id, method, params } = body

    if (jsonrpc !== '2.0') {
      reply.code(400).send({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be "2.0"'
        }
      })
      return
    }

    try {
      let result: any

      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params)
          break

        case 'tools/list':
          result = await this.handleToolsList()
          break

        case 'tools/call':
          result = await this.handleToolCall(params)
          break

        case 'resources/list':
          result = await this.handleResourcesList()
          break

        case 'prompts/list':
          result = await this.handlePromptsList()
          break

        default:
          throw {
            code: -32601,
            message: `Method not found: ${method}`
          }
      }

      reply.send({
        jsonrpc: '2.0',
        id,
        result
      })
    } catch (error: any) {
      logger.error('MCP request error:', error)

      reply.send({
        jsonrpc: '2.0',
        id,
        error: {
          code: error.code || -32603,
          message: error.message || 'Internal error',
          data: error.data
        }
      })
    }
  }

  /**
   * Handle SSE streaming endpoint for real-time updates
   */
  async handleStream(request: FastifyRequest, reply: FastifyReply) {
    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('Access-Control-Allow-Origin', '*')

    // Send initial connection message
    reply.raw.write('data: {"type":"connected","message":"MCP stream connected"}\n\n')

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      reply.raw.write('data: {"type":"heartbeat"}\n\n')
    }, 30000)

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat)
      logger.info('MCP stream disconnected')
    })
  }

  private async handleInitialize(params: any) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: false
        },
        resources: {
          subscribe: false,
          listChanged: false
        },
        prompts: {
          listChanged: false
        }
      },
      serverInfo: {
        name: 'aura-mcp-server',
        version: '1.0.0'
      }
    }
  }

  private async handleToolsList() {
    const tools = this.toolsRegistry.getTools()
    return { tools }
  }

  private async handleToolCall(params: any) {
    const { name, arguments: args } = params

    logger.info(`MCP tool called: ${name}`, { args })

    try {
      // Payment system disabled - all tools are FREE
      // x402 payment protocol coming soon (see roadmap)
      
      let result: any

      // Route to appropriate tool handler
      if (name.startsWith('portfolio.')) {
        if (name === 'portfolio.getAdvancedAnalysis') {
          result = await this.premiumPortfolioTools.handleTool(name, args)
        } else {
          result = await this.portfolioTools.handleTool(name, args)
        }
      } else if (name.startsWith('strategy.')) {
        if (name === 'strategy.proposePremium') {
          result = await this.premiumStrategyTools.handleTool(name, args)
        } else {
          result = await this.strategyTools.handleTool(name, args)
        }
      } else if (name.startsWith('swap.')) {
        result = await this.swapTools.handleTool(name, args)
      } else if (name.startsWith('price.')) {
        result = await this.priceTools.handleTool(name, args)
      } else if (name.startsWith('tx.')) {
        result = await this.txTools.handleTool(name, args)
      } else if (name.startsWith('guard.')) {
        result = await this.guardTools.handleTool(name, args)
      } else if (name.startsWith('report.')) {
        result = await this.reportTools.handleTool(name, args)
      } else if (name.startsWith('system.')) {
        result = await this.systemTools.handleTool(name, args)
      } else {
        throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Tool error: ${name}`, error)
      throw {
        code: -32000,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async handleResourcesList() {
    return {
      resources: [
        {
          uri: 'aura://portfolio',
          name: 'Portfolio Data',
          description: 'Real-time portfolio balances and positions',
          mimeType: 'application/json'
        },
        {
          uri: 'aura://opportunities',
          name: 'DeFi Opportunities',
          description: 'Airdrops, liquidations, and yield opportunities',
          mimeType: 'application/json'
        }
      ]
    }
  }

  private async handlePromptsList() {
    return {
      prompts: [
        {
          name: 'analyze_portfolio',
          description: 'Analyze wallet portfolio and suggest optimizations',
          arguments: [
            {
              name: 'address',
              description: 'Ethereum wallet address',
              required: true
            }
          ]
        },
        {
          name: 'find_opportunities',
          description: 'Find DeFi opportunities (airdrops, liquidations, etc)',
          arguments: [
            {
              name: 'type',
              description: 'Opportunity type (airdrop, liquidation, narrative, governance)',
              required: true
            },
            {
              name: 'address',
              description: 'Ethereum wallet address',
              required: true
            }
          ]
        },
        {
          name: 'execute_swap',
          description: 'Execute token swap with best DEX routing',
          arguments: [
            {
              name: 'command',
              description: 'Swap command (e.g., "swap 1 ETH to USDC on Base")',
              required: true
            }
          ]
        }
      ]
    }
  }
}
