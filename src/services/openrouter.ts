import axios from 'axios'
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
  function_call?: {
    name: string
    arguments: string
  }
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  functions?: FunctionDefinition[]
  function_call?: 'auto' | 'none' | { name: string }
  temperature?: number
  max_tokens?: number
}

export interface ChatCompletionResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string | null
      function_call?: {
        name: string
        arguments: string
      }
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterService {
  private apiKey: string
  private baseURL: string = 'https://openrouter.ai/api/v1'
  private defaultModel: string = 'anthropic/claude-3.5-sonnet'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPEN_ROUTER_API_KEY || ''
    
    if (!this.apiKey) {
      logger.warn('OpenRouter API key not found. Chat features will not work.')
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: request.model || this.defaultModel,
          messages: request.messages,
          functions: request.functions,
          function_call: request.function_call,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.REPLIT_DOMAINS || 'https://auramcp.replit.app',
            'X-Title': 'AuraGPT - DeFi AI Assistant'
          }
        }
      )

      logger.info('OpenRouter API call successful', {
        model: request.model || this.defaultModel,
        tokens: response.data.usage?.total_tokens
      })

      return response.data
    } catch (error: any) {
      logger.error('OpenRouter API error', {
        error: error.message,
        response: error.response?.data
      })
      throw new Error(`OpenRouter API error: ${error.message}`)
    }
  }

  async chatWithFunctions(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    systemPrompt?: string
  ): Promise<ChatCompletionResponse> {
    const allMessages: ChatMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages

    return this.chat({
      model: this.defaultModel,
      messages: allMessages,
      functions,
      function_call: 'auto',
      temperature: 0.7
    })
  }

  async simpleChatCompletion(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    systemPrompt?: string
  ): Promise<string> {
    const messages: ChatMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ]

    const response = await this.chat({
      model: this.defaultModel,
      messages,
      temperature: 0.7
    })

    return response.choices[0]?.message?.content || 'No response from AI'
  }
}

export const openRouterService = new OpenRouterService()
