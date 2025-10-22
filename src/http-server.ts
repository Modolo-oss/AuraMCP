import Fastify from 'fastify'
import cors from '@fastify/cors'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { AuraAdapter } from './core/aura-adapter.js'
import { GuardEngine } from './core/guard-engine.js'
import { McpHttpHandler } from './mcp/http-handler.js'
import type { GuardEngineConfig } from './types/guard.js'
import * as SwapTools from './tools/swap.js'
import * as AuthTools from './tools/auth/auth.js'
import * as WalletTools from './tools/wallet/wallet.js'
import * as AlertTools from './tools/alerts/alerts.js'
import * as ConversationTools from './tools/conversation/conversation.js'
import { authMiddleware, optionalAuthMiddleware } from './auth/middleware.js'
import { AlertMonitor } from './services/alert-monitor.js'
import * as TokenMetadataService from './services/token-metadata.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js'
import { PortfolioTools } from './tools/portfolio.js'
import { StrategyTools } from './tools/strategy.js'
import { TransactionTools } from './tools/transaction.js'
import { GuardTools } from './tools/guard.js'
import { ReportTools } from './tools/report.js'
import { SystemTools } from './tools/system.js'
import { ChatService } from './services/chat-service.js'
import winston from 'winston'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cache landing page HTML at startup
let cachedLandingPage: string | null = null

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

// Initialize core components
if (!process.env.AURA_API_KEY) {
  logger.error('AURA_API_KEY environment variable is required')
  process.exit(1)
}

const auraAdapter = new AuraAdapter({
  apiUrl: process.env.AURA_API_URL || 'https://aura.adex.network',
  apiKey: process.env.AURA_API_KEY,
  timeout: 30000
})

const config: GuardEngineConfig = {
  defaultRules: {
    risk: {
      maxSlippagePct: 1.0,
      maxGasGwei: 50
    },
    gas: {
      maxGasGwei: 100
    },
    route: {
      allowedDexes: ['uniswap', '1inch'],
      blockedTokens: []
    },
    deny: {
      blockedAddresses: [],
      blockedProtocols: []
    }
  },
  emergencyStop: false
}

const guardEngine = new GuardEngine(config)

// Initialize MCP HTTP Handler
const mcpHandler = new McpHttpHandler(auraAdapter, guardEngine)

// Initialize Alert Monitor
const alertMonitor = new AlertMonitor(process.env.AURA_API_KEY)

// Initialize Chat Service
const chatService = new ChatService(auraAdapter, guardEngine)

// Import cleanup function
import { cleanupExpiredTransactions } from './services/prepared-tx.js'
import cron from 'node-cron'

// Create Fastify server
const fastify = Fastify({
  logger: true
})

// Main function
async function startServer() {
  // Register CORS
  await fastify.register(cors, {
    origin: true
  })

  // Load landing page HTML once at startup
  if (!cachedLandingPage) {
    const htmlPath = join(__dirname, '..', 'public', 'index.html')
    cachedLandingPage = readFileSync(htmlPath, 'utf-8')
  }

  // Serve landing page at root
  fastify.get('/', async (request, reply) => {
    reply.type('text/html').send(cachedLandingPage)
  })

  // Serve swap interface
  fastify.get('/swap', async (request, reply) => {
    const swapPath = join(__dirname, '..', 'public', 'swap.html')
    const swapHtml = readFileSync(swapPath, 'utf-8')
    reply.type('text/html').send(swapHtml)
  })

  // Serve AuraGPT chat interface
  fastify.get('/chat', async (request, reply) => {
    const chatPath = join(__dirname, '..', 'public', 'chat', 'index.html')
    const chatHtml = readFileSync(chatPath, 'utf-8')
    reply.type('text/html').send(chatHtml)
  })

  // Serve chat static files
  fastify.get('/chat/chat.css', async (request, reply) => {
    const cssPath = join(__dirname, '..', 'public', 'chat', 'chat.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    reply.type('text/css').send(cssContent)
  })

  fastify.get('/chat/chat.js', async (request, reply) => {
    const jsPath = join(__dirname, '..', 'public', 'chat', 'chat.js')
    const jsContent = readFileSync(jsPath, 'utf-8')
    reply.type('application/javascript').send(jsContent)
  })

  // Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    }
  }
})

// ==================== AUTHENTICATION ENDPOINTS ====================

// Request nonce for MetaMask signature
fastify.post('/api/auth/nonce', async (request, reply) => {
  try {
    const { walletAddress } = request.body as any
    
    if (!walletAddress) {
      reply.code(400)
      return { success: false, error: { code: 'MISSING_WALLET', message: 'Wallet address is required' } }
    }

    const result = await AuthTools.requestNonce(walletAddress)
    return { success: true, data: result }
  } catch (error) {
    logger.error('Nonce generation error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'NONCE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Verify signature and login
fastify.post('/api/auth/verify', async (request, reply) => {
  try {
    const { walletAddress, signature } = request.body as any
    
    if (!walletAddress || !signature) {
      reply.code(400)
      return { 
        success: false, 
        error: { code: 'MISSING_PARAMS', message: 'Wallet address and signature are required' } 
      }
    }

    const result = await AuthTools.verifyAndLogin(walletAddress, signature)
    return { success: true, data: result }
  } catch (error) {
    logger.error('Authentication error:', error)
    reply.code(401)
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Get current user info (authenticated)
fastify.get('/api/auth/me', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const user = await AuthTools.getUserById(request.user!.userId)
    return { success: true, data: user }
  } catch (error) {
    logger.error('Get user error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'USER_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// ==================== WALLET MANAGEMENT ENDPOINTS ====================

// Add wallet (authenticated)
fastify.post('/api/user/wallets', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { address, label } = request.body as any
    
    if (!address || !label) {
      reply.code(400)
      return { 
        success: false, 
        error: { code: 'MISSING_PARAMS', message: 'Address and label are required' } 
      }
    }

    const wallet = await WalletTools.addWallet(request.user!.userId, address, label)
    return { success: true, data: wallet }
  } catch (error) {
    logger.error('Add wallet error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'WALLET_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// List user wallets (authenticated)
fastify.get('/api/user/wallets', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const wallets = await WalletTools.listUserWallets(request.user!.userId)
    return { success: true, data: { wallets, count: wallets.length } }
  } catch (error) {
    logger.error('List wallets error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'WALLET_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Switch active wallet (authenticated)
fastify.put('/api/user/wallets/:id/activate', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { id } = request.params as any
    const walletId = parseInt(id, 10)

    if (isNaN(walletId)) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid wallet ID' } }
    }

    const wallet = await WalletTools.switchActiveWallet(request.user!.userId, walletId)
    return { success: true, data: wallet }
  } catch (error) {
    logger.error('Switch wallet error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'WALLET_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Remove wallet (authenticated)
fastify.delete('/api/user/wallets/:id', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { id } = request.params as any
    const walletId = parseInt(id, 10)

    if (isNaN(walletId)) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid wallet ID' } }
    }

    await WalletTools.removeWallet(request.user!.userId, walletId)
    return { success: true, data: { message: 'Wallet removed successfully' } }
  } catch (error) {
    logger.error('Remove wallet error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'WALLET_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// ==================== ALERT MANAGEMENT ENDPOINTS ====================

// Manual trigger for alert check (for testing)
fastify.post('/api/alerts/check', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    logger.info('Manual alert check triggered by user', { userId: request.user!.userId })
    
    // Run check asynchronously
    alertMonitor.manualCheck().catch((error) => {
      logger.error('Error in manual alert check:', error)
    })
    
    return { 
      success: true, 
      data: { message: 'Alert check triggered. Notifications will be created if conditions are met.' } 
    }
  } catch (error) {
    logger.error('Manual alert check error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'ALERT_CHECK_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Create alert (authenticated)
fastify.post('/api/alerts', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { name, alertType, rules } = request.body as any
    
    if (!name || !alertType || !rules) {
      reply.code(400)
      return { 
        success: false, 
        error: { code: 'MISSING_PARAMS', message: 'Name, alertType, and rules are required' } 
      }
    }

    const alert = await AlertTools.createAlert(request.user!.userId, name, alertType, rules)
    return { success: true, data: alert }
  } catch (error) {
    logger.error('Create alert error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'ALERT_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// List user alerts (authenticated)
fastify.get('/api/alerts', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const alerts = await AlertTools.listUserAlerts(request.user!.userId)
    return { success: true, data: { alerts, count: alerts.length } }
  } catch (error) {
    logger.error('List alerts error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'ALERT_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Update alert (authenticated)
fastify.put('/api/alerts/:id', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { id } = request.params as any
    const alertId = parseInt(id, 10)
    const updates = request.body as any

    if (isNaN(alertId)) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid alert ID' } }
    }

    const alert = await AlertTools.updateAlert(request.user!.userId, alertId, updates)
    return { success: true, data: alert }
  } catch (error) {
    logger.error('Update alert error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'ALERT_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Delete alert (authenticated)
fastify.delete('/api/alerts/:id', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { id } = request.params as any
    const alertId = parseInt(id, 10)

    if (isNaN(alertId)) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid alert ID' } }
    }

    await AlertTools.deleteAlert(request.user!.userId, alertId)
    return { success: true, data: { message: 'Alert deleted successfully' } }
  } catch (error) {
    logger.error('Delete alert error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'ALERT_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Get notifications (authenticated)
fastify.get('/api/alerts/notifications', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { includeRead } = request.query as any
    const notifications = await AlertTools.getUserNotifications(
      request.user!.userId,
      includeRead === 'true'
    )
    return { success: true, data: { notifications, count: notifications.length } }
  } catch (error) {
    logger.error('Get notifications error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'NOTIFICATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Mark notification as read (authenticated)
fastify.put('/api/alerts/notifications/:id/read', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { id } = request.params as any
    const notificationId = parseInt(id, 10)

    if (isNaN(notificationId)) {
      reply.code(400)
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid notification ID' } }
    }

    const notification = await AlertTools.markNotificationAsRead(request.user!.userId, notificationId)
    return { success: true, data: notification }
  } catch (error) {
    logger.error('Mark notification as read error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'NOTIFICATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Mark all notifications as read (authenticated)
fastify.put('/api/alerts/notifications/read-all', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const count = await AlertTools.markAllNotificationsAsRead(request.user!.userId)
    return { success: true, data: { markedCount: count } }
  } catch (error) {
    logger.error('Mark all notifications as read error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'NOTIFICATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// ==================== CONVERSATION HISTORY ENDPOINTS ====================

// Save conversation message (authenticated)
fastify.post('/api/conversation/messages', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { role, content, metadata } = request.body as any
    
    if (!role || !content) {
      reply.code(400)
      return { 
        success: false, 
        error: { code: 'MISSING_PARAMS', message: 'Role and content are required' } 
      }
    }

    const message = await ConversationTools.saveMessage(
      request.user!.userId,
      role,
      content,
      metadata
    )
    return { success: true, data: message }
  } catch (error) {
    logger.error('Save message error:', error)
    reply.code(400)
    return {
      success: false,
      error: {
        code: 'CONVERSATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Get conversation history (authenticated)
fastify.get('/api/conversation/history', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { limit } = request.query as any
    const limitNum = limit ? parseInt(limit, 10) : 50

    const messages = await ConversationTools.getConversationHistory(request.user!.userId, limitNum)
    return { success: true, data: { messages, count: messages.length } }
  } catch (error) {
    logger.error('Get conversation history error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'CONVERSATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Get recent context for AI (authenticated)
fastify.get('/api/conversation/context', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const { messageCount } = request.query as any
    const count = messageCount ? parseInt(messageCount, 10) : 10

    const context = await ConversationTools.getRecentContext(request.user!.userId, count)
    return { success: true, data: { context, count: context.length } }
  } catch (error) {
    logger.error('Get conversation context error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'CONVERSATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Get conversation stats (authenticated)
fastify.get('/api/conversation/stats', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const stats = await ConversationTools.getConversationStats(request.user!.userId)
    return { success: true, data: stats }
  } catch (error) {
    logger.error('Get conversation stats error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'CONVERSATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Clear conversation history (authenticated)
fastify.delete('/api/conversation/history', { preHandler: authMiddleware }, async (request, reply) => {
  try {
    const count = await ConversationTools.clearConversationHistory(request.user!.userId)
    return { success: true, data: { deletedCount: count, message: 'Conversation history cleared' } }
  } catch (error) {
    logger.error('Clear conversation history error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'CONVERSATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Portfolio endpoints (supports both anonymous and authenticated mode)
fastify.post('/api/portfolio/balance', { preHandler: optionalAuthMiddleware }, async (request, reply) => {
  try {
    let { address } = request.body as any
    
    // If authenticated and no address provided, use active wallet
    if (request.user && !address) {
      const activeWallet = await WalletTools.getActiveWallet(request.user.userId)
      if (activeWallet) {
        address = activeWallet.address
        logger.info('Using active wallet for authenticated user', { userId: request.user.userId, address })
      }
    }
    
    if (!address) {
      reply.code(400)
      return { 
        success: false, 
        error: { code: 'MISSING_ADDRESS', message: 'Wallet address is required' } 
      }
    }
    
    const result = await auraAdapter.getPortfolioBalance(address)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    logger.error('Portfolio balance error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'PORTFOLIO_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

fastify.post('/api/portfolio/positions', { preHandler: optionalAuthMiddleware }, async (request, reply) => {
  try {
    let { address } = request.body as any
    
    // If authenticated and no address provided, use active wallet
    if (request.user && !address) {
      const activeWallet = await WalletTools.getActiveWallet(request.user.userId)
      if (activeWallet) {
        address = activeWallet.address
        logger.info('Using active wallet for authenticated user', { userId: request.user.userId, address })
      }
    }
    
    if (!address) {
      reply.code(400)
      return { 
        success: false, 
        error: { code: 'MISSING_ADDRESS', message: 'Wallet address is required' } 
      }
    }
    
    const result = await auraAdapter.getPortfolioPositions(address)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    logger.error('Portfolio positions error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'PORTFOLIO_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Strategy endpoints (supports both anonymous and authenticated mode)
fastify.post('/api/strategy/propose', { preHandler: optionalAuthMiddleware }, async (request, reply) => {
  try {
    const { intent, params } = request.body as any
    let { address } = request.body as any
    
    // If authenticated and no address provided, use active wallet
    if (request.user && !address) {
      const activeWallet = await WalletTools.getActiveWallet(request.user.userId)
      if (activeWallet) {
        address = activeWallet.address
        logger.info('Using active wallet for strategy proposal', { userId: request.user.userId, address })
      }
    }
    
    if (!address || !intent) {
      reply.code(400)
      return { 
        success: false, 
        error: { code: 'MISSING_PARAMS', message: 'Address and intent are required' } 
      }
    }
    
    const result = await auraAdapter.proposeStrategy(intent, params, address)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    logger.error('Strategy proposal error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'STRATEGY_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Guard endpoints
fastify.post('/api/guard/setRules', async (request, reply) => {
  try {
    const { rules } = request.body as any
    // Set individual rules
    if (rules.risk) {
      guardEngine.setRule('risk', 'risk', rules.risk)
    }
    if (rules.gas) {
      guardEngine.setRule('gas', 'gas', rules.gas)
    }
    if (rules.route) {
      guardEngine.setRule('route', 'route', rules.route)
    }
    if (rules.deny) {
      guardEngine.setRule('deny', 'deny', rules.deny)
    }
    return {
      success: true,
      data: {
        message: 'Rules updated successfully',
        rules: rules
      }
    }
  } catch (error) {
    logger.error('Guard rules error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'GUARD_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

fastify.post('/api/guard/setEmergencyStop', async (request, reply) => {
  try {
    const { enabled } = request.body as any
    guardEngine.setEmergencyStop(enabled)
    return {
      success: true,
      data: {
        message: `Emergency stop set to ${enabled}`
      }
    }
  } catch (error) {
    logger.error('Emergency stop error:', error)
    reply.code(500).send({ 
      success: false, 
      error: { 
        code: 'GUARD_ERROR',
        message: error instanceof Error ? error.message : String(error) 
      } 
    })
  }
})

// Swap endpoints
fastify.get('/api/swap/chains', async (request, reply) => {
  try {
    const result = await SwapTools.getSupportedChains(guardEngine)
    if (!result.success) {
      reply.code(500)
      return result
    }
    return result
  } catch (error) {
    logger.error('Swap chains error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SWAP_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

fastify.post('/api/swap/quote', async (request, reply) => {
  try {
    const { chainId, sellToken, buyToken, sellAmount, taker } = request.body as any
    
    if (!chainId || !sellToken || !buyToken || !sellAmount) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Required: chainId, sellToken, buyToken, sellAmount'
        }
      }
    }

    const result = await SwapTools.getSwapQuote(
      { chainId, sellToken, buyToken, sellAmount, taker },
      guardEngine
    )
    
    if (!result.success) {
      reply.code(500)
      return result
    }
    
    return result
  } catch (error) {
    logger.error('Swap quote error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SWAP_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

fastify.post('/api/swap/price', async (request, reply) => {
  try {
    const { chainId, sellToken, buyToken, sellAmount } = request.body as any
    
    if (!chainId || !sellToken || !buyToken || !sellAmount) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Required: chainId, sellToken, buyToken, sellAmount'
        }
      }
    }

    const result = await SwapTools.getSwapPrice({ chainId, sellToken, buyToken, sellAmount })
    
    if (!result.success) {
      reply.code(500)
      return result
    }
    
    return result
  } catch (error) {
    logger.error('Swap price error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SWAP_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

fastify.post('/api/swap/prepare', async (request, reply) => {
  try {
    let { chainId, sellToken, buyToken, sellAmount, slippagePercent, taker } = request.body as any
    
    if (!chainId || !sellToken || !buyToken || !sellAmount) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Required: chainId, sellToken, buyToken, sellAmount'
        }
      }
    }

    // Auto-convert token symbols to addresses if needed
    if (!SwapTools.isAddress(sellToken)) {
      sellToken = SwapTools.getTokenAddress(sellToken, parseInt(chainId))
    }
    
    if (!SwapTools.isAddress(buyToken)) {
      buyToken = SwapTools.getTokenAddress(buyToken, parseInt(chainId))
    }
    
    // Auto-convert amount to wei if it looks like a decimal number
    const sellAmountNum = parseFloat(sellAmount)
    if (!isNaN(sellAmountNum) && sellAmountNum < 1000000) {
      sellAmount = SwapTools.toWei(sellAmount)
    }

    const result = await SwapTools.prepareSwapTransaction(
      { chainId: parseInt(chainId), sellToken, buyToken, sellAmount, slippagePercent, taker },
      guardEngine
    )
    
    if (!result.success) {
      reply.code(500)
      return result
    }
    
    return result
  } catch (error) {
    logger.error('Swap prepare error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SWAP_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

fastify.get('/api/swap/sources/:chainId', async (request, reply) => {
  try {
    const { chainId } = request.params as any
    
    if (!chainId) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'chainId is required'
        }
      }
    }

    const result = await SwapTools.getLiquiditySources(parseInt(chainId))
    
    if (!result.success) {
      reply.code(500)
      return result
    }
    
    return result
  } catch (error) {
    logger.error('Swap sources error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SWAP_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Prepare transaction and return shareable link
fastify.post('/api/swap/prepare-link', async (request, reply) => {
  try {
    let { chainId, sellToken, buyToken, sellAmount, slippagePercent, taker } = request.body as any
    
    if (!chainId || !sellToken || !buyToken || !sellAmount || !taker) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Required: chainId, sellToken, buyToken, sellAmount, taker'
        }
      }
    }

    // Store original token symbols for display
    const fromTokenSymbol = sellToken
    const toTokenSymbol = buyToken
    const amountDisplay = sellAmount

    // Auto-convert token symbols to addresses if needed
    if (!SwapTools.isAddress(sellToken)) {
      sellToken = SwapTools.getTokenAddress(sellToken, parseInt(chainId))
    }
    
    if (!SwapTools.isAddress(buyToken)) {
      buyToken = SwapTools.getTokenAddress(buyToken, parseInt(chainId))
    }
    
    // Auto-convert amount to wei if it looks like a decimal number
    const sellAmountNum = parseFloat(sellAmount)
    if (!isNaN(sellAmountNum) && sellAmountNum < 1000000) {
      sellAmount = SwapTools.toWei(sellAmount)
    }

    // Prepare transaction
    const result = await SwapTools.prepareSwapTransaction(
      { chainId: parseInt(chainId), sellToken, buyToken, sellAmount, slippagePercent, taker },
      guardEngine
    )
    
    if (!result.success) {
      reply.code(500)
      return result
    }

    // Save to database
    const { savePreparedTransaction } = await import('./services/prepared-tx.js')
    const txId = await savePreparedTransaction(
      result.data,
      parseInt(chainId),
      fromTokenSymbol,
      toTokenSymbol,
      amountDisplay
    )

    const domain = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS}`
      : 'http://localhost:5000'

    return {
      success: true,
      data: {
        txId,
        url: `${domain}/swap?tx=${txId}`,
        expiresIn: '15 minutes'
      }
    }
  } catch (error) {
    logger.error('Swap prepare-link error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SWAP_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Get prepared transaction by ID
fastify.get('/api/swap/get-prepared/:id', async (request, reply) => {
  try {
    const { id } = request.params as any
    
    if (!id) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Transaction ID is required'
        }
      }
    }

    const { getPreparedTransaction } = await import('./services/prepared-tx.js')
    const tx = await getPreparedTransaction(id)

    if (!tx) {
      reply.code(404)
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found or expired'
        }
      }
    }

    return {
      success: true,
      data: tx
    }
  } catch (error) {
    logger.error('Get prepared transaction error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// Token metadata endpoint - fetch symbol, name, decimals from blockchain
fastify.get('/api/tokens/metadata', async (request, reply) => {
  try {
    const { address, chainId } = request.query as any
    
    if (!address || !chainId) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Required: address, chainId'
        }
      }
    }

    // Validate address format
    if (!SwapTools.isAddress(address)) {
      reply.code(400)
      return {
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid token address format'
        }
      }
    }

    const metadata = await TokenMetadataService.getTokenMetadata(address, parseInt(chainId))
    
    return {
      success: true,
      data: metadata
    }
  } catch (error) {
    logger.error('Token metadata error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'METADATA_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

// System endpoints
fastify.get('/api/system/health', async (request, reply) => {
  try {
    return {
      success: true,
      data: {
        status: 'healthy',
        components: {
          auraAdapter: 'connected',
          guardEngine: 'active',
          swapAdapter: 'connected',
          emergencyStop: (guardEngine as any).emergencyStop || false
        },
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    logger.error('System health error:', error)
    reply.code(500)
    return {
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }
})

  // ==================== CHAT API ENDPOINTS (AuraGPT) ====================

  // Create new chat session
  fastify.post('/api/chat/new-session', async (request, reply) => {
    try {
      const { walletAddress } = request.body as any
      const sessionId = await chatService.createSession(walletAddress)
      
      return {
        success: true,
        data: { sessionId }
      }
    } catch (error) {
      logger.error('Chat session creation error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'SESSION_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  // Send chat message and get AI response
  fastify.post('/api/chat/message', async (request, reply) => {
    try {
      const { sessionId, message, walletAddress } = request.body as any
      
      if (!sessionId || !message) {
        reply.code(400)
        return {
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Session ID and message are required' }
        }
      }

      const result = await chatService.sendMessage(sessionId, message, walletAddress)
      
      return {
        success: true,
        data: result
      }
    } catch (error) {
      logger.error('Chat message error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  // Get chat history
  fastify.get('/api/chat/history/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params as any
      const history = await chatService.getSessionHistory(sessionId)
      
      return {
        success: true,
        data: { messages: history }
      }
    } catch (error) {
      logger.error('Chat history error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  // ==================== MCP SERVER ENDPOINT FOR CHATGPT ====================

  // Register MCP tools
  const mcpTools: Map<string, Tool> = new Map()

  // Portfolio tools
  mcpTools.set('portfolio.getBalance', {
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

  mcpTools.set('portfolio.getPositions', {
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

  mcpTools.set('strategy.propose', {
    name: 'strategy.propose',
    description: 'Propose a DeFi strategy based on portfolio and market conditions',
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

  mcpTools.set('tx.simulate', {
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

  mcpTools.set('system.health', {
    name: 'system.health',
    description: 'Get system health status',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  })

  // ==================== MCP PROTOCOL ENDPOINTS ====================
  
  // MCP JSON-RPC 2.0 endpoint (for ChatGPT Connector)
  fastify.post('/mcp', async (request, reply) => {
    await mcpHandler.handleRequest(request, reply)
  })

  // MCP SSE stream endpoint (for real-time updates)
  fastify.get('/mcp/stream', async (request, reply) => {
    await mcpHandler.handleStream(request, reply)
  })

  // ==================== SSE ENDPOINT FOR REAL-TIME NOTIFICATIONS ====================

  // SSE endpoint for real-time alert notifications
  fastify.get('/sse', { onRequest: [optionalAuthMiddleware] }, async (request, reply) => {
    const userId = (request as any).userId;

    logger.info(`SSE client connected ${userId ? `(user: ${userId})` : '(anonymous)'}`);

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection message
    reply.raw.write(`data: ${JSON.stringify({
      type: 'connected',
      message: 'SSE stream established',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      reply.raw.write(`: heartbeat\n\n`);
    }, 30000);

    // Listen for notifications from AlertMonitor
    const notificationHandler = (data: any) => {
      // Only send notifications for this user (if authenticated)
      if (userId && data.userId !== userId) {
        return;
      }

      // Send notification event
      reply.raw.write(`event: notification\n`);
      reply.raw.write(`data: ${JSON.stringify({
        type: 'alert_notification',
        userId: data.userId,
        alertId: data.alertId,
        notification: data.notification,
        timestamp: data.timestamp
      })}\n\n`);

      logger.info(`📤 SSE notification sent to user ${data.userId}`);
    };

    alertMonitor.on('notification', notificationHandler);

    // Handle client disconnect
    request.raw.on('close', () => {
      logger.info(`SSE client disconnected ${userId ? `(user: ${userId})` : '(anonymous)'}`);
      clearInterval(heartbeatInterval);
      alertMonitor.off('notification', notificationHandler);
    });
  });

  // Start server
  try {
    // Use PORT for Vercel/cloud platforms, fallback to MCP_SERVER_PORT for Replit, default 5000
    const port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '5000')
    await fastify.listen({ port, host: '0.0.0.0' })
    logger.info(`🚀 AURA MCP HTTP Server running on port ${port}`)
    logger.info(`📡 Health check: http://localhost:${port}/api/health`)
    logger.info(`📊 Portfolio API: http://localhost:${port}/api/portfolio/balance`)
    logger.info(`🎯 Strategy API: http://localhost:${port}/api/strategy/propose`)
    logger.info(`🔄 Swap API: http://localhost:${port}/api/swap/chains`)
    logger.info(`🛡️ Guard API: http://localhost:${port}/api/guard/setRules`)
    
    // Preload popular token metadata in background
    TokenMetadataService.preloadPopularTokens().catch(err => {
      logger.warn('Failed to preload token metadata:', err)
    })
  } catch (err) {
    logger.error('Server start error:', err)
    process.exit(1)
  }
}

// Export the Fastify instance for Vercel compatibility
export default async function createFastifyInstance() {
  const fastify = Fastify({
    logger: false // Disable Fastify's built-in logger to avoid conflicts
  })

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true
  })

  // Initialize adapters
  const auraAdapter = new AuraAdapter()
  const guardEngine = new GuardEngine({
    defaultRules: {},
    emergencyStop: false
  })

  // Cache landing page HTML at startup
  if (!cachedLandingPage) {
    try {
      const landingPath = join(__dirname, '../../public/index.html')
      cachedLandingPage = readFileSync(landingPath, 'utf8')
    } catch (error) {
      logger.warn('Could not load landing page:', error)
      cachedLandingPage = `
        <!DOCTYPE html>
        <html>
        <head><title>AURA MCP Server</title></head>
        <body>
          <h1>🚀 AURA MCP Server</h1>
          <p>Bridge LLMs with AURA API and EVM for on-chain intelligence</p>
          <p><a href="/api/health">Health Check</a></p>
        </body>
        </html>
      `
    }
  }

  // Landing page
  fastify.get('/', async (request, reply) => {
    reply.type('text/html')
    return cachedLandingPage
  })

  // Health check endpoint
  fastify.get('/api/health', async (request, reply) => {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime()
      }
    }
  })

  // Portfolio balance endpoint
  fastify.post('/api/portfolio/balance', async (request, reply) => {
    try {
      const { address, chain = 'ethereum' } = request.body as any
      
      if (!address) {
        reply.code(400)
        return { success: false, error: { code: 'MISSING_ADDRESS', message: 'Address is required' } }
      }

      const result = await auraAdapter.getPortfolioBalance(address)
      return { success: true, data: result }
    } catch (error) {
      logger.error('Portfolio balance error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'PORTFOLIO_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  // Strategy proposal endpoint
  fastify.post('/api/strategy/propose', async (request, reply) => {
    try {
      const { intent, params, address } = request.body as any
      
      if (!intent || !address) {
        reply.code(400)
        return { success: false, error: { code: 'MISSING_PARAMS', message: 'Intent and address are required' } }
      }

      const result = await auraAdapter.proposeStrategy(intent, params, address)
      return { success: true, data: result }
    } catch (error) {
      logger.error('Strategy proposal error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'STRATEGY_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  // Transaction simulation endpoint
  fastify.post('/api/transaction/simulate', async (request, reply) => {
    try {
      const { intentId, txParams } = request.body as any
      
      if (!intentId || !txParams) {
        reply.code(400)
        return { success: false, error: { code: 'MISSING_PARAMS', message: 'IntentId and txParams are required' } }
      }

      // Create a mock simulation response for validation
      const simulation = {
        ok: true,
        est: {
          feeUsd: 10.50,
          slippagePct: 0.5,
          avgPrice: 2000
        },
        guardsTriggered: []
      }
      const result = guardEngine.validateSimulation(simulation, txParams)
      return { success: true, data: result }
    } catch (error) {
      logger.error('Transaction simulation error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'TRANSACTION_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  // Guard rules endpoint
  fastify.post('/api/guard/setRules', async (request, reply) => {
    try {
      const { rules } = request.body as any
      
      if (!rules) {
        reply.code(400)
        return { success: false, error: { code: 'MISSING_RULES', message: 'Rules are required' } }
      }

      // Set multiple rules
      for (const [name, rule] of Object.entries(rules as Record<string, any>)) {
        guardEngine.setRule(name, rule.type, rule.params)
      }
      const result = { success: true, rulesSet: Object.keys(rules).length }
      return { success: true, data: result }
    } catch (error) {
      logger.error('Guard rules error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'GUARD_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  // System health endpoint
  fastify.get('/api/system/health', async (request, reply) => {
    try {
      return {
        success: true,
        data: {
          status: 'operational',
          services: {
            auraApi: 'connected',
            guardEngine: 'active',
            emergencyStop: (guardEngine as any).emergencyStop || false
          },
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      logger.error('System health error:', error)
      reply.code(500)
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
  })

  return fastify
}

// Start the server only if not in Vercel environment
if (!process.env.VERCEL) {
  startServer().then(() => {
    // Start alert monitoring after server is up
    logger.info('Starting AlertMonitor...')
    alertMonitor.start()

    // Start transaction cleanup job (every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      try {
        const deletedCount = await cleanupExpiredTransactions()
        if (deletedCount > 0) {
          logger.info(`🧹 Cleaned up ${deletedCount} expired transactions`)
        }
      } catch (error) {
        logger.error('Transaction cleanup error:', error)
      }
    })
    logger.info('🧹 Transaction cleanup scheduler started')
  })
}
