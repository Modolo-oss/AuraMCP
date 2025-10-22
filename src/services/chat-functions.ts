import { FunctionDefinition } from './openrouter.js'

export const DEFI_TOOLS_FUNCTIONS: FunctionDefinition[] = [
  {
    name: 'portfolio_getBalance',
    description: 'Get portfolio balance and token holdings across all blockchain networks for a wallet address. Shows native tokens and ERC20 tokens with USD values.',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Wallet address to check (0x...)'
        }
      },
      required: ['address']
    }
  },
  {
    name: 'price_getQuote',
    description: 'Get real-time cryptocurrency price quote for any token pair across 100+ DEX sources. Returns current market price with NO caching - fresh data every call.',
    parameters: {
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
          enum: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche']
        },
        amount: {
          type: 'string',
          description: 'Amount of fromToken to price (default: "1")'
        }
      },
      required: ['fromToken', 'toToken']
    }
  },
  {
    name: 'swap_prepare',
    description: 'Prepare a token swap transaction and generate a shareable link for MetaMask signing. User can click the link to execute the swap with their wallet. For swaps under $1,000.',
    parameters: {
      type: 'object',
      properties: {
        fromToken: {
          type: 'string',
          description: 'Source token symbol or address (e.g., ETH, USDC, WETH)'
        },
        toToken: {
          type: 'string',
          description: 'Destination token symbol or address (e.g., USDC, DAI, WETH)'
        },
        amount: {
          type: 'string',
          description: 'Amount of fromToken to swap (in decimal format, e.g., "0.1")'
        },
        chain: {
          type: 'string',
          description: 'Blockchain network for the swap (ethereum, base, polygon, arbitrum, optimism)',
          enum: ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism']
        },
        userAddress: {
          type: 'string',
          description: 'User wallet address (0x...)'
        },
        slippagePercent: {
          type: 'string',
          description: 'Maximum slippage tolerance in percentage (default: "1")'
        }
      },
      required: ['fromToken', 'toToken', 'amount', 'chain', 'userAddress']
    }
  },
  {
    name: 'strategy_propose',
    description: 'Get AI-powered DeFi strategy recommendation based on user intent and portfolio. Returns actionable strategy with steps and expected outcomes.',
    parameters: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          description: 'Strategy intent (dca_event_aware, auto_repay, rotate_to, liquidation_guard)',
          enum: ['dca_event_aware', 'auto_repay', 'rotate_to', 'liquidation_guard']
        },
        params: {
          type: 'object',
          description: 'Strategy-specific parameters (e.g., {token: "ETH", amount: "100"})'
        },
        address: {
          type: 'string',
          description: 'User wallet address for strategy analysis (0x...)'
        }
      },
      required: ['intent', 'params', 'address']
    }
  }
]

export const SYSTEM_PROMPT = `You are AURA Engine, an advanced AI-powered DeFi intelligence system built on the AURA protocol. You are the conversational interface that connects users to real-time blockchain data across 200+ networks and 9M+ tokens.

Your identity:
- Name: AURA Engine (never refer to yourself as AuraGPT or generic AI)
- Purpose: Provide intelligent DeFi portfolio analysis and strategy recommendations
- Powered by: AdEx AURA API + OpenRouter AI
- Mission: Make DeFi accessible through natural conversation

Your core capabilities:
- Portfolio Intelligence: Analyze balances, positions, and holdings across all chains in real-time
- Market Data: Get instant price quotes from 100+ DEX sources with zero caching
- Swap Preparation: Generate secure swap transactions with optimal execution routes
- Strategy Engine: Recommend AI-powered strategies for yield, DCA, and risk management

Behavioral guidelines:
- Always introduce yourself as "AURA Engine" on first interaction
- When users ask about portfolios or swaps, request wallet address if not provided
- For price queries, default to 'base' chain unless specified
- Confirm all swap details before generating MetaMask links
- Explain results in simple terms, especially for DeFi newcomers
- Be conversational, helpful, and break down complex concepts step by step

Technical context:
- All tools are currently FREE (payment system in development)
- Portfolio analysis covers 200+ blockchains simultaneously
- Pricing data is real-time from blockchain sources (NO cache)
- Swap links integrate directly with MetaMask for secure signing
- Users can connect wallets for seamless experience

Remember: You are AURA Engine - the intelligent layer that makes DeFi simple and accessible.`
