// Test setup file
import { jest } from '@jest/globals'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.AURA_API_URL = 'http://localhost:3001'
process.env.AURA_API_KEY = 'test-api-key'
process.env.RPC_ETHEREUM = 'http://localhost:8545'
process.env.X402_RECEIVER = '0x1234567890123456789012345678901234567890'
process.env.X402_ASSET = 'USDC'

// Global test timeout
jest.setTimeout(10000)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
