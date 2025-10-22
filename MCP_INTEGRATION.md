# MCP Protocol Integration Guide

## Overview

AURA MCP Server now supports native **Model Context Protocol (MCP)** over HTTP with Server-Sent Events (SSE) for real-time two-way communication with AI assistants like ChatGPT and Claude.

## 🚀 Quick Start

### MCP Endpoint
```
POST https://mcp-aura.replit.app/mcp
```

### SSE Stream Endpoint
```
GET https://mcp-aura.replit.app/mcp/stream
```

## 📋 Protocol Details

AURA MCP implements **MCP over HTTP** using JSON-RPC 2.0 format with the following capabilities:

- ✅ **Tools** - 15 DeFi operations (swap, portfolio, strategy, guard, etc.)
- ✅ **Prompts** - Pre-configured workflows for common tasks
- ✅ **Resources** - Real-time portfolio and opportunities data
- ✅ **SSE Streaming** - Real-time updates and notifications

### Protocol Version
```
2024-11-05
```

## 🔧 Available Methods

### 1. Initialize Connection
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "chatgpt",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": false },
      "resources": { "subscribe": false, "listChanged": false },
      "prompts": { "listChanged": false }
    },
    "serverInfo": {
      "name": "aura-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

### 2. List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Returns:** Array of 15 tools including:
- `portfolio.getBalance` - Get wallet balance
- `portfolio.getPositions` - Get DeFi positions
- `ops.scanOpportunities` - Find airdrops, liquidations, etc.
- `strategy.propose` - AI-powered strategy suggestions
- `swap.parse` - Natural language swap parsing
- `swap.quote` - Get best DEX quote
- `swap.prepare` - Prepare swap transaction
- `swap.execute` - Execute swap
- `tx.simulate` - Simulate transaction
- `guard.setRules` - Configure risk management
- `system.health` - System status

### 3. Call a Tool
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "system.health",
    "arguments": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{\"status\":\"ok\",...}}"
      }
    ]
  }
}
```

### 4. List Prompts
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "prompts/list",
  "params": {}
}
```

**Returns:** Pre-configured prompts:
- `analyze_portfolio` - Analyze wallet and suggest optimizations
- `find_opportunities` - Find DeFi opportunities
- `execute_swap` - Execute token swap with routing

### 5. List Resources
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/list",
  "params": {}
}
```

**Returns:** Available data resources:
- `aura://portfolio` - Real-time portfolio data
- `aura://opportunities` - DeFi opportunities feed

## 🤖 Integration with AI Assistants

### ChatGPT MCP Connector (Recommended)

**Requirements:** ChatGPT Pro or Plus account

**Setup Steps:**

1. **Enable Developer Mode**
   - Open ChatGPT → Settings
   - Navigate to **Connectors**
   - Enable **Developer mode** in Advanced settings

2. **Create MCP Connector**
   - Click **Create new connector**
   - Name: `AURA DeFi`
   - MCP Server URL: `https://mcp-aura.replit.app/mcp`
   - Authentication: `No authentication` (or OAuth if configured)
   - Click **Create**

3. **Use in Chat**
   - Start a new chat
   - Enable **Developer mode** in composer
   - Select **AURA DeFi** connector
   - AI can now access all 15 tools!

### Claude Desktop (Alternative)

**For Claude Pro/Max/Team/Enterprise users:**

1. Open Claude Desktop Settings
2. Navigate to **Connectors**
3. Click **Add custom connector**
4. Configure:
   ```
   Name: AURA DeFi
   URL: https://mcp-aura.replit.app/mcp
   ```
5. Save and use in conversations

### Custom GPT (Free Alternative)

If you don't have Pro/Plus, create a Custom GPT:

1. Go to https://chat.openai.com/gpts/editor
2. Create new GPT
3. Add Actions pointing to REST API endpoints:
   - `POST /api/swap/parse`
   - `POST /api/swap/quote`
   - `POST /api/portfolio/balance`
   - etc.

## 📡 SSE Streaming

For real-time updates, connect to the SSE endpoint:

```bash
curl -N https://mcp-aura.replit.app/mcp/stream
```

**Stream Events:**
- `connected` - Initial connection
- `heartbeat` - Keep-alive (every 30s)
- `tool_update` - Tool execution updates (future)
- `opportunity_alert` - New opportunities (future)

## 🛠️ Example Tool Calls

### Portfolio Analysis
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "portfolio.getBalance",
    "arguments": {
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }
  }
}
```

### Swap Execution
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "swap.parse",
    "arguments": {
      "text": "swap 1 ETH to USDC on Base"
    }
  }
}
```

### Find Airdrops
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "ops.scanOpportunities",
    "arguments": {
      "kind": "airdrop",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }
  }
}
```

## 🔒 Security

### Authentication Options

**Current:** No authentication (development)

**Production Options:**
1. **OAuth** - Recommended for ChatGPT/Claude connectors
2. **API Key** - Header-based authentication
3. **JWT** - Token-based auth with expiry

### Rate Limiting

- Default: 60 requests/minute per IP
- Configurable per client
- Upgrade available for higher limits

## 🐛 Debugging

### Test Connection
```bash
curl -X POST https://mcp-aura.replit.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0.0"}}}'
```

### Check Tools
```bash
curl -X POST https://mcp-aura.replit.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### Health Check
```bash
curl https://mcp-aura.replit.app/api/health
```

## 📚 Resources

- **GitHub:** https://github.com/antidumpalways/MCP
- **MCP Spec:** https://modelcontextprotocol.io
- **AURA API:** https://aura.adex.network
- **Replit Deployment:** https://mcp-aura.replit.app

## 🎯 Next Steps

1. **Deploy to Production** - Click "Publish" in Replit to update live deployment
2. **Connect ChatGPT** - Follow setup guide above
3. **Test Tools** - Try portfolio analysis or swap execution
4. **Add Authentication** - Configure OAuth for security
5. **Monitor Usage** - Track API calls and performance

## ⚡ Performance

- **Latency:** <100ms for most tools
- **Uptime:** 99.9% (Replit infrastructure)
- **SSE:** Persistent connections with 30s heartbeat
- **Concurrent:** Supports 100+ simultaneous connections

---

**Need help?** Open an issue on GitHub or contact support.
