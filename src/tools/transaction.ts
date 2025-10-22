import { GuardEngine } from '../core/guard-engine.js'

export class TransactionTools {
  constructor(private guardEngine: GuardEngine) {}

  async handleTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'tx.simulate':
        return this.simulate(args)
      case 'tx.execute':
        return this.execute(args)
      default:
        throw new Error(`Unknown transaction tool: ${name}`)
    }
  }

  private async simulate(args: { intentId?: string; txParams?: any }): Promise<any> {
    const { intentId, txParams = {} } = args

    try {
      const simulation = {
        intentId: intentId || 'sim-' + Date.now(),
        estimatedGas: '150000',
        estimatedCost: '0.0045 ETH',
        slippage: '0.5%',
        route: txParams.route || 'Uniswap V3',
        guardrailsPassed: true,
        warnings: [] as string[]
      }

      const guardCheck = this.guardEngine.checkTransaction({
        gasLimit: 150000,
        maxFeePerGas: 50,
        slippagePct: 0.5,
        ...txParams
      })

      if (!guardCheck.passed) {
        simulation.guardrailsPassed = false
        simulation.warnings = guardCheck.violations || []
      }

      return {
        success: true,
        data: simulation
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIMULATION_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  }

  private async execute(args: { intentId?: string; txParams?: any; paymentProof?: any }): Promise<any> {
    const { intentId, txParams = {}, paymentProof } = args

    try {
      const guardCheck = this.guardEngine.checkTransaction({
        gasLimit: txParams.gasLimit || 150000,
        maxFeePerGas: txParams.maxFeePerGas || 50,
        slippagePct: txParams.slippagePct || 0.5,
        ...txParams
      })

      if (!guardCheck.passed) {
        return {
          success: false,
          error: {
            code: 'GUARDRAIL_VIOLATION',
            message: 'Transaction blocked by guardrails',
            violations: guardCheck.violations
          }
        }
      }

      return {
        success: true,
        data: {
          intentId: intentId || 'tx-' + Date.now(),
          status: 'pending',
          message: 'Transaction submitted. This is a simulation - no real transaction executed.',
          txHash: '0x' + Math.random().toString(16).substring(2, 66),
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  }
}
