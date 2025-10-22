import { AuraAdapter } from '../core/aura-adapter.js'
import {
  PortfolioBalanceRequest,
  PortfolioBalanceResponse,
  PortfolioPositionsRequest,
  PortfolioPositionsResponse,
  McpResponse
} from '../types/index.js'

export class PortfolioTools {
  constructor(private auraAdapter: AuraAdapter) {}

  async handleTool(name: string, args: any): Promise<McpResponse> {
    switch (name) {
      case 'portfolio.getBalance':
        return await this.getBalance(args as PortfolioBalanceRequest)
      
      case 'portfolio.getPositions':
        return await this.getPositions(args as PortfolioPositionsRequest)
      
      default:
        throw new Error(`Unknown portfolio tool: ${name}`)
    }
  }

  private async getBalance(request: PortfolioBalanceRequest): Promise<McpResponse<PortfolioBalanceResponse>> {
    try {
      const balance = await this.auraAdapter.getPortfolioBalance(request.address)
      
      return {
        success: true,
        data: balance,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: `balance_${Date.now()}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BALANCE_FETCH_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  private async getPositions(request: PortfolioPositionsRequest): Promise<McpResponse<PortfolioPositionsResponse>> {
    try {
      const positions = await this.auraAdapter.getPortfolioPositions(request.address)
      
      return {
        success: true,
        data: positions,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: `positions_${Date.now()}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'POSITIONS_FETCH_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    }
  }
}
