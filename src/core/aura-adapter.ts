// Real AURA API Integration
import { 
  PortfolioBalanceResponse, 
  PortfolioPositionsResponse,
  StrategyProposeResponse,
  DCAEventAwareParams,
  LiquidationGuardParams
} from '../types/index.js'
import axios from 'axios'

export interface AuraAdapterConfig {
  apiUrl?: string  // Default: https://aura.adex.network
  apiKey?: string  // API key for higher rate limits
  timeout?: number
}

export class AuraAdapter {
  private config: AuraAdapterConfig

  constructor(config: AuraAdapterConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || process.env.AURA_API_URL || 'https://aura.adex.network',
      apiKey: config.apiKey || process.env.AURA_API_KEY || '',
      timeout: config.timeout || 30000
    }
  }

  /**
   * Get portfolio balance for an address across all supported chains
   */
  async getPortfolioBalance(address: string): Promise<PortfolioBalanceResponse> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/portfolio/balances`, {
        params: {
          address
        },
        headers: {
          'X-API-Key': this.config.apiKey
        },
        timeout: this.config.timeout
      });

      // Parse response to match our schema
      const portfolio = response.data.portfolio;
      const totalBalanceUSD = portfolio.reduce((sum: number, network: any) => 
        sum + network.tokens.reduce((netSum: number, token: any) => netSum + token.balanceUSD, 0), 0
      );

      return {
        native: totalBalanceUSD.toString(),
        tokens: portfolio.flatMap((network: any) => 
          network.tokens.map((token: any) => ({
            address: token.address,
            symbol: token.symbol,
            decimals: 18,
            balance: token.balance.toString(),
            usd: token.balanceUSD
          }))
        )
      };
    } catch (error: any) {
      const errorMsg = error?.response?.data ? JSON.stringify(error.response.data) : (error instanceof Error ? error.message : String(error));
      console.error('AURA API Error Details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message
      });
      throw new Error(`AURA API error: ${errorMsg}`);
    }
  }

  /**
   * Get DeFi positions for an address
   */
  async getPortfolioPositions(address: string): Promise<PortfolioPositionsResponse> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/portfolio/balances`, {
        params: {
          address
        },
        headers: {
          'X-API-Key': this.config.apiKey
        },
        timeout: this.config.timeout
      });

      // Parse positions from portfolio data
      const positions = response.data.portfolio.flatMap((network: any) =>
        network.tokens
          .filter((token: any) => token.balanceUSD > 0)
          .map((token: any) => ({
            protocol: 'wallet',
            asset: token.symbol,
            balance: token.balance.toString(),
            balanceUSD: token.balanceUSD.toString(),
            apy: '0',
            healthFactor: '0',
            network: network.network.name
          }))
      );

      return { positions };
    } catch (error) {
      throw new Error(`AURA API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get AURA recommendations for an address
   */
  async getRecommendations(address: string, llm: 'gemini' | 'grok' = 'gemini'): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/portfolio/strategies`, {
        params: {
          address
        },
        headers: {
          'X-API-Key': this.config.apiKey
        },
        timeout: this.config.timeout
      });

      // Return all strategy responses from AURA
      return response.data.strategies.flatMap((strategy: any) => strategy.response || []);
    } catch (error) {
      throw new Error(`AURA API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Propose a specific strategy using AURA insights
   */
  async proposeStrategy(
    intent: string, 
    params: any, 
    address: string
  ): Promise<StrategyProposeResponse> {
    try {
      // Try to get real strategies from AURA with longer timeout
      let strategies: any[] = [];
      let auraRecommendations: any[] = [];

      try {
        const response = await axios.get(`${this.config.apiUrl}/api/portfolio/strategies`, {
          params: {
            address
          },
          headers: {
            'X-API-Key': this.config.apiKey
          },
          timeout: 30000 // 30 seconds timeout for strategies
        });
        strategies = response.data.strategies || [];
        auraRecommendations = strategies.flatMap(s => s.response || []);
      } catch (auraError) {
        console.warn('AURA strategies API timeout/slow, using fallback strategy');
        // Fallback: create basic strategy without AURA recommendations
        auraRecommendations = [];
      }

      const intentId = `${intent}_${Date.now()}`;

      // Map AURA strategies to our format
      if (intent === 'dca_event_aware') {
        return this.generateDCAFromAura(intentId, params, strategies, address, auraRecommendations);
      } else if (intent === 'liquidation_guard') {
        return this.generateLiquidationFromAura(intentId, params, strategies, address, auraRecommendations);
      }

      throw new Error(`Unknown strategy intent: ${intent}`);
    } catch (error) {
      throw new Error(`Strategy generation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }



  /**
   * Simple prompt generator (from existing AURA codebase)
   */
  private async makeSimplePrompt(props: { portfolio: any[] }): Promise<string> {
    return `Provide investment strategies for a user with the following crypto portfolio:
${JSON.stringify(props.portfolio)}
Be concise, specific and precise in your instruction in each strategy action. 
`
  }

  /**
   * Generate DCA strategy from AURA recommendations
   */
  private generateDCAFromAura(intentId: string, params: DCAEventAwareParams, auraStrategies: any[], address: string, auraRecommendations: any[] = []): StrategyProposeResponse {
    // Extract relevant DCA strategies from AURA response
    const dcaStrategy = auraStrategies.find(s => 
      s.response && Array.isArray(s.response) && s.response.some((r: any) => r.name && (r.name.toLowerCase().includes('dca') || r.name.toLowerCase().includes('dollar cost')))
    );

    return {
      intentId,
      plan: {
        splits: Math.ceil(params.budgetUsd / 50),
        windowDays: this.parseCadenceToDays(params.cadence),
        venue: ['uniswap', '1inch'],
        maxSlipPct: 0.5,
        budgetUsd: params.budgetUsd,
        asset: params.asset,
        auraRecommendations: dcaStrategy?.response || auraRecommendations || []
      },
      risks: this.extractRisksFromAura(dcaStrategy),
      next: 'tx.simulate'
    };
  }

  /**
   * Generate Liquidation Guard strategy from AURA recommendations
   */
  private generateLiquidationFromAura(intentId: string, params: LiquidationGuardParams, auraStrategies: any[], address: string, auraRecommendations: any[] = []): StrategyProposeResponse {
    // Extract relevant liquidation strategies from AURA response
    const liquidationStrategy = auraStrategies.find(s => 
      s.response && Array.isArray(s.response) && s.response.some((r: any) => r.name && (r.name.toLowerCase().includes('liquidation') || r.name.toLowerCase().includes('guard')))
    );

    return {
      intentId,
      plan: {
        protocols: params.protocols,
        maxHealthFactor: params.maxHealthFactor,
        minHealthFactor: params.minHealthFactor,
        autoRepayThreshold: params.autoRepayThreshold,
        auraRecommendations: liquidationStrategy?.response || auraRecommendations || []
      },
      risks: this.extractRisksFromAura(liquidationStrategy),
      next: 'tx.simulate'
    };
  }

  /**
   * Extract risks from AURA strategy response
   */
  private extractRisksFromAura(strategy: any): string[] {
    if (!strategy || !strategy.response || !Array.isArray(strategy.response)) return [];
    
    const risks: string[] = [];
    strategy.response.forEach((r: any) => {
      if (r.risk === 'high') risks.push('high_risk_detected');
      if (r.risk === 'moderate') risks.push('moderate_risk');
      if (r.risk === 'opportunistic') risks.push('opportunistic_strategy');
      if (r.risk === 'low') risks.push('low_risk');
    });
    
    return risks.length > 0 ? risks : ['risk_unknown'];
  }

  /**
   * Parse cadence string to days
   */
  private parseCadenceToDays(cadence: string): number {
    if (cadence.includes('daily')) return 1;
    if (cadence.includes('2x/week')) return 3;
    if (cadence.includes('weekly')) return 7;
    if (cadence.includes('bi-weekly')) return 14;
    return 7; // default to weekly
  }

  /**
   * Scan for airdrop opportunities (native AURA API)
   */
  async scanAirdropOpportunities(address: string, chains?: string[]): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/opportunities/airdrops`, {
        params: {
          address,
          chains: chains?.join(','),
          apiKey: this.config.apiKey
        },
        timeout: this.config.timeout
      })

      return response.data.opportunities || response.data.airdrops || []
    } catch (error) {
      // If endpoint not available, try alternative endpoint
      try {
        const altResponse = await axios.get(`${this.config.apiUrl}/api/portfolio/airdrops`, {
          params: {
            address,
            apiKey: this.config.apiKey
          },
          timeout: this.config.timeout
        })
        return altResponse.data.opportunities || altResponse.data.airdrops || []
      } catch {
        throw new Error(`AURA airdrop scanning error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  /**
   * Scan for liquidation opportunities (native AURA API)
   */
  async scanLiquidationOpportunities(address: string, chains?: string[]): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/opportunities/liquidations`, {
        params: {
          address,
          chains: chains?.join(','),
          apiKey: this.config.apiKey
        },
        timeout: this.config.timeout
      })

      return response.data.opportunities || response.data.liquidations || []
    } catch (error) {
      // Try alternative endpoint for portfolio risks
      try {
        const altResponse = await axios.get(`${this.config.apiUrl}/api/portfolio/risks`, {
          params: {
            address,
            apiKey: this.config.apiKey
          },
          timeout: this.config.timeout
        })
        return altResponse.data.risks || altResponse.data.liquidations || []
      } catch {
        throw new Error(`AURA liquidation scanning error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  /**
   * Scan for narrative/trend opportunities (native AURA API)
   */
  async scanNarrativeOpportunities(address: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/opportunities/narratives`, {
        params: {
          address,
          apiKey: this.config.apiKey
        },
        timeout: this.config.timeout
      })

      return response.data.opportunities || response.data.narratives || []
    } catch (error) {
      throw new Error(`AURA narrative scanning error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Scan for governance opportunities (native AURA API)
   */
  async scanGovernanceOpportunities(address: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/opportunities/governance`, {
        params: {
          address,
          apiKey: this.config.apiKey
        },
        timeout: this.config.timeout
      })

      return response.data.opportunities || response.data.governance || []
    } catch (error) {
      throw new Error(`AURA governance scanning error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generic request method for AURA API
   * Used by tools that need custom API calls
   */
  async request(config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    data?: any
    params?: any
  }): Promise<any> {
    try {
      const url = `${this.config.apiUrl}${config.path}`
      const axiosConfig = {
        method: config.method,
        url,
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout,
        ...(config.data && { data: config.data }),
        ...(config.params && { params: config.params })
      }

      const response = await axios(axiosConfig)
      return response.data
    } catch (error: any) {
      const errorMsg = error?.response?.data 
        ? JSON.stringify(error.response.data) 
        : (error instanceof Error ? error.message : String(error))
      throw new Error(`AURA API request error: ${errorMsg}`)
    }
  }

}
