# 🧪 Test All 15 MCP Tools

## Setup
```bash
# Local testing
export BASE_URL="http://localhost:5000/mcp"

# Live testing (setelah re-publish)
export BASE_URL="https://mcp-aura.replit.app/mcp"

# Test wallet (Vitalik's address)
export WALLET="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

---

## 1️⃣ SYSTEM TOOLS (1)

### System Health
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":1,"method":"tools/call",
  "params":{"name":"system.health","arguments":{}}
}' | jq
```

---

## 2️⃣ PORTFOLIO TOOLS (2)

### Portfolio Balance
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":2,"method":"tools/call",
  "params":{"name":"portfolio.getBalance","arguments":{"address":"'$WALLET'"}}
}' | jq
```

### Portfolio Positions
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":3,"method":"tools/call",
  "params":{"name":"portfolio.getPositions","arguments":{"address":"'$WALLET'"}}
}' | jq
```

---

## 3️⃣ OPERATIONS TOOLS (4 variations)

### Scan Airdrops
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":4,"method":"tools/call",
  "params":{"name":"ops.scanOpportunities","arguments":{"kind":"airdrop","address":"'$WALLET'"}}
}' | jq
```

### Scan Liquidations
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":5,"method":"tools/call",
  "params":{"name":"ops.scanOpportunities","arguments":{"kind":"liquidation","address":"'$WALLET'"}}
}' | jq
```

### Scan Narratives
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":6,"method":"tools/call",
  "params":{"name":"ops.scanOpportunities","arguments":{"kind":"narrative","address":"'$WALLET'"}}
}' | jq
```

### Scan Governance
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":7,"method":"tools/call",
  "params":{"name":"ops.scanOpportunities","arguments":{"kind":"governance","address":"'$WALLET'"}}
}' | jq
```

---

## 4️⃣ SWAP TOOLS (4)

### Swap Parse (Natural Language)
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":8,"method":"tools/call",
  "params":{"name":"swap.parse","arguments":{"text":"swap 1 ETH to USDC on Base"}}
}' | jq
```

### Swap Quote
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":9,"method":"tools/call",
  "params":{"name":"swap.quote","arguments":{
    "fromToken":"ETH","toToken":"USDC","amount":"1",
    "chain":"base","userAddress":"'$WALLET'"
  }}
}' | jq
```

### Swap Prepare
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":10,"method":"tools/call",
  "params":{"name":"swap.prepare","arguments":{
    "quoteId":"test_quote_123","userAddress":"'$WALLET'"
  }}
}' | jq
```

### Swap Execute
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":11,"method":"tools/call",
  "params":{"name":"swap.execute","arguments":{
    "txData":{"to":"0x1234567890123456789012345678901234567890","data":"0x"},
    "signedTx":"0x..."
  }}
}' | jq
```

---

## 5️⃣ STRATEGY TOOLS (2)

### Strategy Propose
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":12,"method":"tools/call",
  "params":{"name":"strategy.propose","arguments":{
    "intent":"dca_event_aware",
    "params":{"token":"ETH","amountUsd":100,"frequency":"weekly"},
    "address":"'$WALLET'"
  }}
}' | jq
```

### Strategy Backtest
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":13,"method":"tools/call",
  "params":{"name":"strategy.backtest","arguments":{
    "name":"dca_event_aware",
    "params":{"token":"ETH","amountUsd":100,"frequency":"weekly"},
    "lookbackDays":30
  }}
}' | jq
```

---

## 6️⃣ TRANSACTION TOOLS (2)

### Transaction Simulate
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":14,"method":"tools/call",
  "params":{"name":"tx.simulate","arguments":{
    "intentId":"intent_123",
    "txParams":{"to":"0x1234567890123456789012345678901234567890","value":"1000000000000000000"}
  }}
}' | jq
```

### Transaction Execute
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":15,"method":"tools/call",
  "params":{"name":"tx.execute","arguments":{
    "intentId":"intent_123",
    "txParams":{"to":"0x1234567890123456789012345678901234567890","value":"1000000000000000000"}
  }}
}' | jq
```

---

## 7️⃣ GUARD TOOLS (2)

### Guard Set Rules
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":16,"method":"tools/call",
  "params":{"name":"guard.setRules","arguments":{
    "ruleType":"risk","params":{"maxSlippagePct":1.5,"maxGasGwei":80}
  }}
}' | jq
```

### Guard Emergency Stop
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":17,"method":"tools/call",
  "params":{"name":"guard.setEmergencyStop","arguments":{"enabled":false}}
}' | jq
```

---

## 8️⃣ REPORT TOOLS (1)

### Get Report
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":18,"method":"tools/call",
  "params":{"name":"report.get","arguments":{"sessionId":"session_123"}}
}' | jq
```

---

## 🔥 BONUS: MCP Protocol Commands

### Initialize Connection
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":100,"method":"initialize",
  "params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0.0"}}
}' | jq
```

### List All Tools
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":101,"method":"tools/list","params":{}
}' | jq
```

### List Prompts
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":102,"method":"prompts/list","params":{}
}' | jq
```

### List Resources
```bash
curl -X POST $BASE_URL -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":103,"method":"resources/list","params":{}
}' | jq
```

### SSE Stream Test
```bash
curl -N $BASE_URL/stream
```

---

## 📊 Summary

**Total Tools: 15**
- ✅ System: 1
- ✅ Portfolio: 2
- ✅ Operations: 1 (4 variations)
- ✅ Swap: 4
- ✅ Strategy: 2
- ✅ Transaction: 2
- ✅ Guard: 2
- ✅ Report: 1

**MCP Protocol: 5 commands**
- initialize, tools/list, prompts/list, resources/list, SSE stream

---

## 🚀 Quick Test All

```bash
# Make script executable
chmod +x test-mcp-tools.sh

# Run all tests
./test-mcp-tools.sh

# Or test specific tool
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"system.health","arguments":{}}}' | jq
```

---

**Need `jq` for pretty JSON?**
```bash
# Install jq
npm install -g jq  # or: sudo apt install jq
```
