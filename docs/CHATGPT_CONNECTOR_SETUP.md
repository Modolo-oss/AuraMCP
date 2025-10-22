# ChatGPT Connector Setup Guide - AURA MCP Server

## Overview

AURA MCP Server is **READY for ChatGPT Connector integration!** 

This server provides DeFi portfolio analysis, strategy recommendations, and token swap execution through 12 powerful tools that ChatGPT can call directly.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Open ChatGPT Settings

1. Go to **ChatGPT** (chatgpt.com)
2. Click your profile → **Settings**
3. Navigate to **Connectors** section
4. Enable **Developer Mode** (if not already enabled)

### Step 2: Create New Connector

Click **"Create New Connector"** and fill in:

**Connector Name:**
```
AURA DeFi Assistant
```

**Description:**
```
DeFi portfolio analysis, strategy recommendations, and transaction simulation across 200+ blockchains and 9M+ tokens.
```

**MCP Server URL:**
```
https://test-mcp.replit.app/mcp
```

**Authentication:**
```
No authentication
```

(Authentication support coming soon)

### Step 3: Save and Test

1. Click **"Create"** → **"Save"**
2. Start a new ChatGPT conversation
3. Enable your AURA connector
4. Ask: *"Check system health"*

Expected response:
```
✅ AURA MCP Server is healthy!

Status: ok
Version: 0.1.0
Uptime: 247 seconds

All systems operational:
- AURA API: Connected (51ms)
- Guard Engine: Active (10ms)
- Ethereum RPC: Connected (155ms)
- Base RPC: Connected (180ms)
- Arbitrum RPC: Connected (157ms)
```

---

## 📚 Available Tools

### 1. **portfolio.getBalance**

Get portfolio balance and token holdings for any wallet address.

**Example:**
```
Show me the portfolio for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Input:**
- `chain`: ethereum | base | arbitrum | polygon | optimism
- `address`: Wallet address (0x... format)

**Output:**
- Total portfolio value in USD
- Token holdings with balances
- NFT collections

---

### 2. **portfolio.getPositions**

Get DeFi positions (lending, staking, liquidity pools).

**Example:**
```
What DeFi positions does vitalik.eth have on Ethereum?
```

**Input:**
- `chain`: ethereum | base | arbitrum | polygon | optimism
- `address`: Wallet address

**Output:**
- Active DeFi positions
- Total value locked
- Yield APY

---

### 3. **strategy.propose**

Get AI-powered DeFi strategy recommendations.

**Example:**
```
Suggest a DCA strategy for buying ETH
```

**Input:**
- `intent`: dca_event_aware | auto_repay | rotate_to | quest_batch | liquidation_guard
- `params`: Strategy parameters (token, amount, frequency, etc.)

**Output:**
- Strategy name
- Step-by-step execution plan
- Estimated returns
- Risk assessment

---

### 4. **tx.simulate**

Simulate a DeFi transaction before executing.

**Example:**
```
Simulate the strategy from previous recommendation
```

**Input:**
- `intentId`: ID from strategy.propose
- `txParams`: Transaction parameters

**Output:**
- Estimated gas cost
- Slippage estimation
- Guardrail checks (safety validation)
- Warnings (if any)

---

### 5. **system.health**

Check AURA server health and connectivity.

**Example:**
```
Is AURA server online?
```

**Output:**
- System status
- API connectivity
- RPC node health
- Uptime

---

## 🎯 Real-World Use Cases

### Portfolio Analysis
```
User: Show me vitalik.eth's portfolio on Ethereum

ChatGPT: 
📊 Portfolio Analysis for vitalik.eth

Total Value: $2,450,000 USD

Top Holdings:
1. ETH: 1,250 ETH ($2,100,000)
2. USDC: 200,000 USDC ($200,000)
3. UNI: 50,000 UNI ($150,000)

DeFi Positions:
- Aave: $500k supplied (earning 3.2% APY)
- Uniswap V3: $300k LP (ETH/USDC)
```

### Strategy Recommendations
```
User: I want to DCA into ETH with $1000/month

ChatGPT:
🎯 DCA Strategy Proposal

Strategy: Event-Aware DCA
Monthly Budget: $1,000
Target: ETH

Execution Plan:
1. Split into 4 weekly buys ($250 each)
2. Buy during low volatility periods
3. Use Uniswap V3 for best execution
4. Auto-compound to maximize returns

Estimated Annual Return: 8-12% (market dependent)
Risk Level: Low-Medium
Gas Costs: ~$15/month

Would you like me to simulate the first transaction?
```

### Token Swap Execution
```
User: Swap 0.001 ETH to USDC on Base

ChatGPT:
🔄 Swap Prepared

From: 0.001 ETH
To: ~3.86 USDC
Chain: Base
Slippage: 1%

Click here to sign with MetaMask:
https://auramcp.replit.app/swap?tx=abc123

The link will auto-load your transaction and prompt MetaMask for signature.
Link expires in 15 minutes.
```

---

## 🔧 Technical Details

### Server Architecture

**Endpoint:** `https://test-mcp.replit.app/mcp`

**Methods:**
- `GET /mcp` - Discovery endpoint (returns tools list)
- `POST /mcp` - Tool execution endpoint

**Request Format (POST):**
```json
{
  "name": "portfolio.getBalance",
  "arguments": {
    "chain": "ethereum",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "totalValueUsd": 2450000,
    "tokens": [...],
    "nfts": [...]
  }
}
```

---

### External APIs Integrated

1. **AURA DeFi API** - Portfolio data across 200+ blockchains
2. **0x Swap API** - DEX aggregation for best prices
3. **Ethereum RPC** - On-chain data access
4. **Guard Engine** - Risk management and safety checks

---

## 📖 Connector Configuration Schema

ChatGPT sees this configuration when discovering tools:

```json
{
  "mcp_server_url": "https://test-mcp.replit.app/mcp",
  "tools": [
    {
      "name": "portfolio.getBalance",
      "description": "Get portfolio balance and token holdings...",
      "input_schema": {
        "chain": "string (ethereum, base, arbitrum, polygon, optimism)",
        "address": "string (0x... format)"
      },
      "output_schema": {
        "success": "boolean",
        "data": {
          "totalValueUsd": "number",
          "tokens": "array",
          "nfts": "array"
        }
      }
    }
  ]
}
```

---

## ✅ Connection Checklist

Before using the connector, verify:

- [✅] Server is deployed at `https://test-mcp.replit.app`
- [✅] GET `/mcp` returns tools list
- [✅] POST `/mcp` accepts tool calls
- [✅] AURA_API_KEY is configured
- [✅] All systems healthy (check `/api/system/health`)

---

## 🐛 Troubleshooting

### Issue: Connector shows "Not connected"

**Solution:**
1. Verify URL: `https://test-mcp.replit.app/mcp`
2. Test endpoint: `curl https://test-mcp.replit.app/mcp`
3. Check server status: `GET /api/health`

### Issue: Tool calls timeout

**Solution:**
1. Check server logs for errors
2. Verify AURA API key is valid
3. Ensure network connectivity

### Issue: "Unknown tool" error

**Solution:**
- Ensure tool name is exact (case-sensitive)
- Valid tools: `portfolio.getBalance`, `portfolio.getPositions`, `strategy.propose`, `swap.prepare`, `tx.simulate`, `system.health`

---

## 🚀 Next Steps

1. ✅ **Test all tools** - Try portfolio, swap, and strategy tools to understand capabilities
2. ✅ **Explore DeFi strategies** - Ask ChatGPT for recommendations
3. ✅ **Execute swaps** - Swap tokens directly via ChatGPT + MetaMask
4. ✅ **Monitor your portfolio** - Track wallet balances in real-time

---

## 📞 Support

- **Server Status:** `GET /api/health`
- **System Health:** `GET /api/system/health`
- **Documentation:** `/docs/` folder

---

**Built with:**
- Fastify (HTTP server)
- TypeScript (Type safety)
- AURA DeFi API (Portfolio data)
- 0x Swap API (DEX aggregation)
- Zod (Runtime validation)
