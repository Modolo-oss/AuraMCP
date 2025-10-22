import { GuardEngine } from '../core/guard-engine.js'
import {
  SetGuardRulesRequest,
  SetGuardRulesResponse,
  McpResponse
} from '../types/index.js'

export class GuardTools {
  constructor(private guardEngine: GuardEngine) {}

  async handleTool(name: string, args: any): Promise<McpResponse> {
    switch (name) {
      case 'guard.setRules':
        return await this.setRules(args as SetGuardRulesRequest)
      
      default:
        throw new Error(`Unknown guard tool: ${name}`)
    }
  }

  private async setRules(request: SetGuardRulesRequest): Promise<McpResponse<SetGuardRulesResponse>> {
    try {
      const ruleName = `${request.ruleType}_${Date.now()}`
      this.guardEngine.setRule(ruleName, request.ruleType, request.params)
      
      return {
        success: true,
        data: { ok: true },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: `setRules_${request.ruleType}_${Date.now()}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SET_RULES_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    }
  }
}
