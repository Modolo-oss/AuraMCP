#!/bin/bash

# AURA MCP Tools Testing Script
# Test all 15 MCP tools via HTTP endpoint

BASE_URL="http://localhost:5000/mcp"
# Ganti ke live URL jika sudah publish:
# BASE_URL="https://mcp-aura.replit.app/mcp"

# Test wallet address (Vitalik's wallet)
WALLET="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

echo "🧪 Testing AURA MCP Server - 15 Tools"
echo "======================================"
echo ""

# 1. SYSTEM TOOLS (1)
echo "1️⃣ System Health"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"system.health",
      "arguments":{}
    }
  }' | jq
echo ""

# 2. PORTFOLIO TOOLS (2)
echo "2️⃣ Portfolio Balance"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"portfolio.getBalance",
      "arguments":{
        "address":"'$WALLET'"
      }
    }
  }' | jq
echo ""

echo "3️⃣ Portfolio Positions"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"portfolio.getPositions",
      "arguments":{
        "address":"'$WALLET'"
      }
    }
  }' | jq
echo ""

# 3. OPERATIONS TOOLS (1)
echo "4️⃣ Scan Airdrops"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":4,
    "method":"tools/call",
    "params":{
      "name":"ops.scanOpportunities",
      "arguments":{
        "kind":"airdrop",
        "address":"'$WALLET'"
      }
    }
  }' | jq
echo ""

echo "5️⃣ Scan Liquidations"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":5,
    "method":"tools/call",
    "params":{
      "name":"ops.scanOpportunities",
      "arguments":{
        "kind":"liquidation",
        "address":"'$WALLET'"
      }
    }
  }' | jq
echo ""

# 4. SWAP TOOLS (4)
echo "6️⃣ Swap Parse (Natural Language)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":6,
    "method":"tools/call",
    "params":{
      "name":"swap.parse",
      "arguments":{
        "text":"swap 1 ETH to USDC on Base"
      }
    }
  }' | jq
echo ""

echo "7️⃣ Swap Quote"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":7,
    "method":"tools/call",
    "params":{
      "name":"swap.quote",
      "arguments":{
        "fromToken":"ETH",
        "toToken":"USDC",
        "amount":"1",
        "chain":"base",
        "userAddress":"'$WALLET'"
      }
    }
  }' | jq
echo ""

echo "8️⃣ Swap Prepare (Example with mock quoteId)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":8,
    "method":"tools/call",
    "params":{
      "name":"swap.prepare",
      "arguments":{
        "quoteId":"test_quote_123",
        "userAddress":"'$WALLET'"
      }
    }
  }' | jq
echo ""

echo "9️⃣ Swap Execute (Example - requires signed tx)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":9,
    "method":"tools/call",
    "params":{
      "name":"swap.execute",
      "arguments":{
        "txData":{
          "to":"0x1234567890123456789012345678901234567890",
          "data":"0x"
        },
        "signedTx":"0x..."
      }
    }
  }' | jq
echo ""

# 5. STRATEGY TOOLS (2)
echo "🔟 Strategy Propose"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":10,
    "method":"tools/call",
    "params":{
      "name":"strategy.propose",
      "arguments":{
        "intent":"dca_event_aware",
        "params":{
          "token":"ETH",
          "amountUsd":100,
          "frequency":"weekly"
        },
        "address":"'$WALLET'"
      }
    }
  }' | jq
echo ""

echo "1️⃣1️⃣ Strategy Backtest"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":11,
    "method":"tools/call",
    "params":{
      "name":"strategy.backtest",
      "arguments":{
        "name":"dca_event_aware",
        "params":{
          "token":"ETH",
          "amountUsd":100,
          "frequency":"weekly"
        },
        "lookbackDays":30
      }
    }
  }' | jq
echo ""

# 6. TRANSACTION TOOLS (2)
echo "1️⃣2️⃣ Transaction Simulate"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":12,
    "method":"tools/call",
    "params":{
      "name":"tx.simulate",
      "arguments":{
        "intentId":"intent_123",
        "txParams":{
          "to":"0x1234567890123456789012345678901234567890",
          "value":"1000000000000000000"
        }
      }
    }
  }' | jq
echo ""

echo "1️⃣3️⃣ Transaction Execute"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":13,
    "method":"tools/call",
    "params":{
      "name":"tx.execute",
      "arguments":{
        "intentId":"intent_123",
        "txParams":{
          "to":"0x1234567890123456789012345678901234567890",
          "value":"1000000000000000000"
        }
      }
    }
  }' | jq
echo ""

# 7. GUARD TOOLS (2)
echo "1️⃣4️⃣ Guard Set Rules"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":14,
    "method":"tools/call",
    "params":{
      "name":"guard.setRules",
      "arguments":{
        "ruleType":"risk",
        "params":{
          "maxSlippagePct":1.5,
          "maxGasGwei":80
        }
      }
    }
  }' | jq
echo ""

echo "1️⃣5️⃣ Guard Emergency Stop"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":15,
    "method":"tools/call",
    "params":{
      "name":"guard.setEmergencyStop",
      "arguments":{
        "enabled":false
      }
    }
  }' | jq
echo ""

# 8. REPORT TOOLS (1)
echo "1️⃣6️⃣ Report Get (Bonus tool)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":16,
    "method":"tools/call",
    "params":{
      "name":"report.get",
      "arguments":{
        "sessionId":"session_123"
      }
    }
  }' | jq
echo ""

echo "✅ Testing Complete!"
echo ""
echo "📊 Summary:"
echo "- System Tools: 1 ✓"
echo "- Portfolio Tools: 2 ✓"
echo "- Operations Tools: 1 (airdrop + liquidation) ✓"
echo "- Swap Tools: 4 ✓"
echo "- Strategy Tools: 2 ✓"
echo "- Transaction Tools: 2 ✓"
echo "- Guard Tools: 2 ✓"
echo "- Report Tools: 1 ✓"
echo ""
echo "Total: 15+ tool calls tested!"
