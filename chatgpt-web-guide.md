# 🤖 ChatGPT Web + AURA MCP Server Integration

## Cara 1: Langsung via HTTP API

### **Test Endpoints:**
```
GET  https://your-vercel-url.vercel.app/api/health
POST https://your-vercel-url.vercel.app/api/portfolio/balance
POST https://your-vercel-url.vercel.app/api/strategy/propose
```

### **Contoh Request ke ChatGPT:**
```
"Analyze this wallet address using AURA MCP: 0x69bfD720Dd188B8BB04C4b4D24442D3c15576D10"

ChatGPT akan:
1. Call POST /api/portfolio/balance dengan {"address": "0x69bfD720Dd188B8BB04C4b4D24442D3c15576D10"}
2. Tampilkan hasil analisis portfolio
3. Berikan rekomendasi strategi
```

## Cara 2: Via Connector Plugin

### **Setup Connector:**
1. Buka ChatGPT Web
2. Aktifkan Connector plugin
3. Tambahkan URL: `https://your-vercel-url.vercel.app`
4. Test connection

### **Available Functions untuk ChatGPT:**
- `get_portfolio_balance(address)` - Analisis portfolio
- `propose_strategy(intent, params, address)` - Rekomendasi strategi
- `simulate_transaction(intentId, txParams)` - Simulasi transaksi
- `set_guard_rules(rules)` - Setup risk management
- `get_system_health()` - Status sistem

## Cara 3: Custom Instructions

### **Tambahkan ke Custom Instructions ChatGPT:**
```
You have access to AURA MCP Server at https://your-vercel-url.vercel.app

Available endpoints:
- GET /api/health - Check server status
- POST /api/portfolio/balance - Analyze wallet portfolio
- POST /api/strategy/propose - Generate trading strategies
- POST /api/transaction/simulate - Simulate transactions
- POST /api/guard/setRules - Configure risk management

When user asks about:
- Portfolio analysis → Use /api/portfolio/balance
- Trading strategies → Use /api/strategy/propose  
- Transaction simulation → Use /api/transaction/simulate
- Risk management → Use /api/guard/setRules

Always include the AURA API data in your responses.
```

## Test Commands untuk ChatGPT:

```
1. "Check AURA MCP server health"
2. "Analyze wallet 0x69bfD720Dd188B8BB04C4b4D24442D3c15576D10"
3. "Generate DCA strategy for ETH with $200 budget"
4. "Simulate a swap transaction"
5. "Set up risk management rules"
```
