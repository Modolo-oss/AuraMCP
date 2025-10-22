import { nanoid } from 'nanoid'
import { db } from '../db/index.js'
import { chatSessions, chatMessages, InsertChatSession, InsertChatMessage } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { openRouterService, ChatMessage as LLMMessage } from './openrouter.js'
import { DEFI_TOOLS_FUNCTIONS, SYSTEM_PROMPT } from './chat-functions.js'
import { PortfolioTools } from '../tools/portfolio.js'
import { PriceTools } from '../tools/price.js'
import { SwapTools } from '../tools/swap.js'
import { StrategyTools } from '../tools/strategy.js'
import { AuraAdapter } from '../core/aura-adapter.js'
import { GuardEngine } from '../core/guard-engine.js'
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
})

export class ChatService {
  private portfolioTools: PortfolioTools
  private priceTools: PriceTools
  private swapTools: SwapTools
  private strategyTools: StrategyTools

  constructor(
    private auraAdapter: AuraAdapter,
    private guardEngine: GuardEngine
  ) {
    this.portfolioTools = new PortfolioTools(auraAdapter)
    this.priceTools = new PriceTools()
    this.swapTools = new SwapTools(auraAdapter, guardEngine)
    this.strategyTools = new StrategyTools(auraAdapter, guardEngine)
  }

  async createSession(walletAddress?: string): Promise<string> {
    const sessionId = nanoid(32)
    
    const newSession: InsertChatSession = {
      id: sessionId,
      walletAddress: walletAddress || null,
      title: 'New Chat'
    }

    await db.insert(chatSessions).values(newSession)
    logger.info('Chat session created', { sessionId, walletAddress })
    
    return sessionId
  }

  async getSessionHistory(sessionId: string): Promise<LLMMessage[]> {
    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, sessionId),
      orderBy: [chatMessages.createdAt]
    })

    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system' | 'function',
      content: msg.content
    }))
  }

  async sendMessage(
    sessionId: string,
    userMessage: string,
    walletAddress?: string
  ): Promise<{ 
    response: string
    toolCalls?: any[]
    usage?: any
  }> {
    const userMsg: InsertChatMessage = {
      sessionId,
      role: 'user',
      content: userMessage,
      metadata: { walletAddress }
    }
    await db.insert(chatMessages).values(userMsg)

    const history = await this.getSessionHistory(sessionId)
    
    const enhancedPrompt = walletAddress 
      ? `${SYSTEM_PROMPT}\n\nConnected wallet: ${walletAddress}`
      : SYSTEM_PROMPT

    let response = await openRouterService.chatWithFunctions(
      history,
      DEFI_TOOLS_FUNCTIONS,
      enhancedPrompt
    )

    const firstChoice = response.choices[0]
    let finalResponse = firstChoice.message.content || ''
    const toolCalls: any[] = []

    if (firstChoice.message.function_call) {
      const functionCall = firstChoice.message.function_call
      const functionName = functionCall.name
      const functionArgs = JSON.parse(functionCall.arguments)

      logger.info('LLM called function', { functionName, functionArgs })

      let toolResult: any
      try {
        toolResult = await this.executeToolCall(functionName, functionArgs)
        toolCalls.push({
          function: functionName,
          arguments: functionArgs,
          result: toolResult
        })

        const toolResultMessage: LLMMessage = {
          role: 'function',
          name: functionName,
          content: JSON.stringify(toolResult)
        }

        const followUpResponse = await openRouterService.chat({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            ...history,
            { role: 'assistant', content: '', function_call: functionCall },
            toolResultMessage
          ]
        })

        finalResponse = followUpResponse.choices[0]?.message?.content || 
          'I got the data but had trouble formatting the response.'

      } catch (error: any) {
        logger.error('Tool execution error', { error: error.message })
        finalResponse = `I tried to help but encountered an error: ${error.message}`
      }
    }

    const assistantMsg: InsertChatMessage = {
      sessionId,
      role: 'assistant',
      content: finalResponse,
      toolCalls: toolCalls.length > 0 ? toolCalls : null,
      metadata: {}
    }
    await db.insert(chatMessages).values(assistantMsg)

    return {
      response: finalResponse,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: response.usage
    }
  }

  private async executeToolCall(functionName: string, args: any): Promise<any> {
    switch (functionName) {
      case 'portfolio_getBalance':
        return await this.portfolioTools.handleTool('portfolio.getBalance', args)
      
      case 'price_getQuote':
        return await this.priceTools.handleTool('price.getQuote', args)
      
      case 'swap_prepare':
        return await this.swapTools.handleTool('swap.prepare', args)
      
      case 'strategy_propose':
        return await this.strategyTools.handleTool('strategy.propose', args)
      
      default:
        throw new Error(`Unknown function: ${functionName}`)
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await db
      .update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId))
  }

  async getUserSessions(walletAddress: string, limit: number = 10) {
    return await db.query.chatSessions.findMany({
      where: eq(chatSessions.walletAddress, walletAddress),
      orderBy: [desc(chatSessions.updatedAt)],
      limit
    })
  }
}
