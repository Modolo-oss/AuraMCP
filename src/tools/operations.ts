import { AuraAdapter } from '../core/aura-adapter.js'
import {
  ScanOpportunitiesRequest,
  ScanOpportunitiesResponse,
  McpResponse,
  OpportunityItem
} from '../types/index.js'

export class OperationsTools {
  constructor(private auraAdapter: AuraAdapter) {}

  async handleTool(name: string, args: any): Promise<McpResponse> {
    switch (name) {
      case 'ops.scanOpportunities':
        return await this.scanOpportunities(args as ScanOpportunitiesRequest)
      
      default:
        throw new Error(`Unknown operations tool: ${name}`)
    }
  }

  private async scanOpportunities(request: ScanOpportunitiesRequest): Promise<McpResponse<ScanOpportunitiesResponse>> {
    try {
      let items: OpportunityItem[] = []

      switch (request.kind) {
        case 'liquidation':
          items = await this.scanLiquidationOpportunities(request.params)
          break
        
        case 'airdrop':
          items = await this.scanAirdropOpportunities(request.params)
          break
        
        case 'narrative':
          items = await this.scanNarrativeOpportunities(request.params)
          break
        
        case 'governance':
          items = await this.scanGovernanceOpportunities(request.params)
          break
        
        default:
          throw new Error(`Unknown opportunity kind: ${request.kind}`)
      }

      return {
        success: true,
        data: { items },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: `scan_${request.kind}_${Date.now()}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCAN_OPPORTUNITIES_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  private async scanLiquidationOpportunities(params?: any): Promise<OpportunityItem[]> {
    try {
      const address = params?.address || params
      const opportunities = await this.auraAdapter.scanLiquidationOpportunities(address)
      
      // Transform AURA response to our format
      return opportunities.map((opp: any) => ({
        vaultId: opp.vaultId || opp.id,
        address: opp.address || opp.vault,
        health: opp.healthFactor || opp.health,
        threshold: opp.threshold || opp.liquidationThreshold || 1.0,
        repayNeededUsd: opp.repayAmount || opp.repayNeededUsd || 0,
        protocol: opp.protocol || 'Unknown',
        apy: opp.apy || opp.currentApy || 0
      }))
    } catch (error) {
      console.error('AURA liquidation scan failed:', error)
      return []
    }
  }

  private async scanAirdropOpportunities(params?: any): Promise<OpportunityItem[]> {
    try {
      const address = params?.address || params
      const opportunities = await this.auraAdapter.scanAirdropOpportunities(address)
      
      // Transform AURA response to our format
      return opportunities.map((opp: any) => ({
        address: opp.contractAddress || opp.address,
        protocol: opp.protocol || opp.project || 'Unknown',
        apy: 0, // Airdrops don't have APY
        risk: opp.risk || opp.riskLevel || 'medium',
        deadline: opp.deadline || opp.expiryDate,
        eligible: opp.eligible || opp.isEligible,
        estimatedValue: opp.estimatedValue || opp.valueUsd
      }))
    } catch (error) {
      console.error('AURA airdrop scan failed:', error)
      return []
    }
  }

  private async scanNarrativeOpportunities(params?: any): Promise<OpportunityItem[]> {
    try {
      const address = params?.address || params
      const opportunities = await this.auraAdapter.scanNarrativeOpportunities(address)
      
      return opportunities.map((opp: any) => ({
        address: opp.address || opp.contractAddress,
        protocol: opp.narrative || opp.protocol || opp.trend || 'Unknown',
        apy: opp.apy || opp.estimatedApy || 0,
        risk: opp.risk || opp.riskLevel || 'moderate',
        category: opp.category || opp.narrativeType
      }))
    } catch (error) {
      console.error('AURA narrative scan failed:', error)
      return []
    }
  }

  private async scanGovernanceOpportunities(params?: any): Promise<OpportunityItem[]> {
    try {
      const address = params?.address || params
      const opportunities = await this.auraAdapter.scanGovernanceOpportunities(address)
      
      return opportunities.map((opp: any) => ({
        address: opp.address || opp.governanceAddress,
        protocol: opp.protocol || opp.dao || 'Unknown',
        apy: opp.apy || opp.votingRewardsApy || 0,
        risk: opp.risk || 'low',
        deadline: opp.deadline || opp.votingDeadline,
        proposalId: opp.proposalId || opp.id
      }))
    } catch (error) {
      console.error('AURA governance scan failed:', error)
      return []
    }
  }
}
