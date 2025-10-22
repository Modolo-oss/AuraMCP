import { TransactionTools } from '../../tools/transaction'
import { GuardEngine } from '../../core/guard-engine'
import { GuardEngineConfig } from '@/types'

describe('x402 Payment Integration', () => {
  let transactionTools: TransactionTools
  let guardEngine: GuardEngine

  beforeEach(() => {
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

    guardEngine = new GuardEngine(config)
    transactionTools = new TransactionTools(guardEngine)
  })

  describe('Payment Required Flow', () => {
    it('should return x402 payment required for high-value transactions', async () => {
      // Mock high-value transaction that should require payment
      const mockShouldRequirePayment = jest.spyOn(transactionTools as any, 'shouldRequirePayment')
      mockShouldRequirePayment.mockReturnValue(true)

      const executeRequest = {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '100000000000000000000', // 100 ETH - high value
          gasLimit: '150000',
          gasPrice: '20000000000'
        }
      }

      const result = await transactionTools.handleTool('tx.execute', executeRequest)

      // Should return x402 payment required object
      expect(result).toHaveProperty('invoiceId')
      expect(result).toHaveProperty('amount')
      expect(result).toHaveProperty('asset')
      expect(result).toHaveProperty('receiver')
      expect(result).toHaveProperty('description')

      // Check x402 structure
      expect(typeof result.invoiceId).toBe('string')
      expect(result.amount).toBe('0.50')
      expect(result.asset).toBe('USDC')
      expect(result.receiver).toMatch(/^0x[a-fA-F0-9]{40}$/)
    })

    it('should execute transaction after payment proof is provided', async () => {
      // Mock that payment is required
      const mockShouldRequirePayment = jest.spyOn(transactionTools as any, 'shouldRequirePayment')
      mockShouldRequirePayment.mockReturnValue(true)

      // Mock payment proof verification
      const mockVerifyPaymentProof = jest.spyOn(transactionTools as any, 'verifyPaymentProof')
      mockVerifyPaymentProof.mockResolvedValue(true)

      const executeRequest = {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '100000000000000000000',
          gasLimit: '150000',
          gasPrice: '20000000000'
        },
        paymentProof: {
          invoiceId: 'inv_123',
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          amount: '0.50',
          asset: 'USDC'
        }
      }

      const result = await transactionTools.handleTool('tx.execute', executeRequest)

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('submitted')
      expect(result.data.txHash).toBeDefined()
      expect(mockVerifyPaymentProof).toHaveBeenCalledWith(executeRequest.paymentProof)
    })

    it('should reject transaction with invalid payment proof', async () => {
      // Mock that payment is required
      const mockShouldRequirePayment = jest.spyOn(transactionTools as any, 'shouldRequirePayment')
      mockShouldRequirePayment.mockReturnValue(true)

      // Mock payment proof verification failure
      const mockVerifyPaymentProof = jest.spyOn(transactionTools as any, 'verifyPaymentProof')
      mockVerifyPaymentProof.mockResolvedValue(false)

      const executeRequest = {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '100000000000000000000',
          gasLimit: '150000',
          gasPrice: '20000000000'
        },
        paymentProof: {
          invoiceId: 'inv_invalid',
          txHash: '0xinvalidhash',
          amount: '0.50',
          asset: 'USDC'
        }
      }

      const result = await transactionTools.handleTool('tx.execute', executeRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('INVALID_PAYMENT_PROOF')
      expect(result.error?.message).toBe('Payment proof verification failed')
    })

    it('should execute low-value transactions without payment', async () => {
      // Mock that payment is not required
      const mockShouldRequirePayment = jest.spyOn(transactionTools as any, 'shouldRequirePayment')
      mockShouldRequirePayment.mockReturnValue(false)

      const executeRequest = {
        intentId: 'test-intent',
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          value: '1000000000000000000', // 1 ETH - low value
          gasLimit: '150000',
          gasPrice: '20000000000'
        }
      }

      const result = await transactionTools.handleTool('tx.execute', executeRequest)

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('submitted')
      expect(result.data.txHash).toBeDefined()
    })
  })

  describe('Payment Proof Verification', () => {
    it('should verify payment proof correctly', async () => {
      const mockVerifyPaymentProof = jest.spyOn(transactionTools as any, 'verifyPaymentProof')
      mockVerifyPaymentProof.mockResolvedValue(true)

      const paymentProof = {
        invoiceId: 'inv_123',
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: '0.50',
        asset: 'USDC'
      }

      const isValid = await (transactionTools as any).verifyPaymentProof(paymentProof)

      expect(isValid).toBe(true)
      expect(mockVerifyPaymentProof).toHaveBeenCalledWith(paymentProof)
    })

    it('should handle verification errors', async () => {
      const mockVerifyPaymentProof = jest.spyOn(transactionTools as any, 'verifyPaymentProof')
      mockVerifyPaymentProof.mockImplementation(async () => {
        throw new Error('Verification failed')
      })

      const paymentProof = {
        invoiceId: 'inv_invalid',
        txHash: '0xinvalidhash',
        amount: '0.50',
        asset: 'USDC'
      }

      try {
        await (transactionTools as any).verifyPaymentProof(paymentProof)
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Verification failed')
      }
    })
  })
})
