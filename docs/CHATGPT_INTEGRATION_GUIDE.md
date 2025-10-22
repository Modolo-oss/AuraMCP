# ChatGPT Integration Guide - AURA MCP Server

## Overview

AURA MCP Server sekarang mendukung **Alerts System** dan **Conversation History** untuk menciptakan pengalaman ChatGPT yang lebih personal dan proaktif. Chatbot dapat:

✅ **Mengingat preferensi user** dari percakapan sebelumnya  
✅ **Memberikan alert proaktif** saat event portfolio terjadi  
✅ **Rekomendasi yang dipersonalisasi** berdasarkan riwayat chat  
✅ **Multi-wallet context** dengan auto-switch ke active wallet  

---

## Alur Kerja ChatGPT

### 1. **Anonymous Mode** (Tanpa Login)

User bisa langsung menggunakan API portfolio dan swap tanpa autentikasi:

```
User: "Berapa portfolio saya di address 0xd8dA...96045?"

ChatGPT Action:
POST /api/portfolio/balance
Body: { "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }

ChatGPT Response:
"Portfolio Anda bernilai $12,345.67 dengan:
- 3.5 ETH ($9,100)
- 5,000 USDC ($5,000)
..."
```

**Keuntungan:** Cepat, tidak perlu setup  
**Kekurangan:** Tidak ada persistent memory, harus input address setiap kali

---

### 2. **Authenticated Mode** (Dengan MetaMask Login)

User login sekali, chatbot "ingat" selamanya:

#### Langkah 1: Connect Wallet

```
User: "Connect wallet saya"

ChatGPT Action:
1. POST /api/auth/nonce → Get nonce
2. User signs with MetaMask
3. POST /api/auth/verify → Get JWT token
4. ChatGPT menyimpan JWT untuk request berikutnya

ChatGPT Response:
"✅ Wallet connected! Saya sekarang bisa mengingat preferensi Anda."
```

#### Langkah 2: Add Wallet dengan Label

```
User: "Tambah wallet trading saya: 0xABC...123"

ChatGPT Action:
POST /api/user/wallets
Headers: Authorization: Bearer <JWT>
Body: { 
  "address": "0xABC...123", 
  "label": "Trading", 
  "isActive": true 
}

ChatGPT Response:
"✅ Wallet 'Trading' ditambahkan dan diaktifkan!"
```

#### Langkah 3: Seamless Portfolio Queries

```
User: "Berapa portfolio saya?"

ChatGPT Action:
POST /api/portfolio/balance
Headers: Authorization: Bearer <JWT>
Body: {} 
(No address needed! Auto-uses active wallet)

ChatGPT Response:
"Portfolio Anda (Trading wallet) bernilai $45,678.90..."
```

---

## Alert System - Proactive Notifications

### Contoh 1: Price Alert

```
User: "Alert saya kalau ETH naik di atas $4,000"

ChatGPT Action:
POST /api/alerts
Headers: Authorization: Bearer <JWT>
Body: {
  "name": "ETH $4,000 Alert",
  "alertType": "price_change",
  "rules": {
    "type": "price_change",
    "conditions": {
      "token": "ETH",
      "threshold": 4000,
      "direction": "above"
    }
  }
}

ChatGPT Response:
"✅ Alert dibuat! Saya akan notify Anda saat ETH > $4,000"
```

**Nanti, saat ETH naik:**

```
ChatGPT (Proactive):
"🚨 **Alert:** ETH sekarang $4,050 (+5.2%)! 
Holding ETH Anda sekarang worth $7,087.

Mau:
1. Take profit 50%?
2. Set trailing stop?
3. Biarkan running?"
```

### Contoh 2: Liquidation Alert

```
User: "Pantau leverage position saya di Aave"

ChatGPT Action:
POST /api/alerts
Body: {
  "name": "Aave Liquidation Watch",
  "alertType": "liquidation_risk",
  "rules": {
    "type": "liquidation_risk",
    "conditions": {
      "protocol": "Aave",
      "healthFactor": 1.3
    }
  }
}

ChatGPT Response:
"✅ Saya akan monitoring health factor Anda di Aave"
```

**Nanti, saat health factor turun:**

```
ChatGPT (Proactive):
"⚠️ **CRITICAL:** Aave health factor Anda = 1.25! 
Risk liquidation dalam 24 jam.

Rekomendasi urgent:
1. Add $2,500 collateral (menaikkan HF ke 1.8)
2. Repay $1,000 debt (menaikkan HF ke 1.6)
3. Close position sekarang (avoid liquidation)"
```

---

## Conversation History - Personalized AI

### Contoh: Context-Aware Recommendations

**Session 1:**
```
User: "Saya prefer low-risk strategy"

ChatGPT Action:
POST /api/conversation/messages
Body: {
  "role": "user",
  "content": "Saya prefer low-risk strategy",
  "metadata": { "preference": "low_risk" }
}

ChatGPT Response:
"Noted! Saya akan fokus ke stablecoin yield dan blue-chip tokens."
```

**Session 2 (Hari berikutnya):**
```
User: "Ada strategi yang cocok buat saya?"

ChatGPT Action:
1. GET /api/conversation/context → Load riwayat chat
2. Detect user preference: low_risk
3. POST /api/strategy/propose dengan custom params

ChatGPT Response (Personalized):
"Berdasarkan preferensi low-risk Anda, saya recommend:

1. **Aave USDC** - 4.2% APY (very safe)
2. **Compound DAI** - 3.8% APY (low risk)
3. **ETH staking** - 3.5% APY (long-term safe)

Avoid:
❌ Leverage farming (high risk)
❌ Meme coins (volatility tinggi)
❌ New protocols (smart contract risk)"
```

---

## Multi-Wallet Management

```
User: "List semua wallet saya"

ChatGPT Action:
GET /api/user/wallets
Headers: Authorization: Bearer <JWT>

ChatGPT Response:
"Anda punya 3 wallets:
1. **Main** (active) - 0xd8dA...96045 - $12,345
2. **Trading** - 0xABC...123 - $45,678
3. **Vault** - 0xDEF...789 - $100,000

Mau switch ke wallet lain?"
```

```
User: "Switch ke Trading wallet"

ChatGPT Action:
PUT /api/user/wallets/2/active
Headers: Authorization: Bearer <JWT>

ChatGPT Response:
"✅ Switched to 'Trading' wallet! 
Portfolio sekarang auto-use 0xABC...123"
```

---

## Privacy Controls

```
User: "Lupa wallet saya"

ChatGPT Action:
DELETE /api/user/wallets/1

ChatGPT Response:
"✅ Wallet 'Main' dihapus dari memory. 
All alerts dan data terkait wallet ini juga dihapus."
```

```
User: "Reset semua conversation history"

ChatGPT Action:
DELETE /api/conversation/history

ChatGPT Response:
"✅ Conversation history cleared. Fresh start!"
```

---

## Technical Implementation for ChatGPT

### Required Headers

**Authenticated Endpoints:**
```javascript
headers: {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
}
```

**Anonymous Endpoints:**
```javascript
headers: {
  'Content-Type': 'application/json'
}
```

### Context Enhancement Middleware

Server **automatically injects** active wallet untuk authenticated users:

```javascript
// User request (no address needed)
POST /api/portfolio/balance
Headers: { Authorization: Bearer <JWT> }
Body: {}

// Server automatically adds active wallet
Internal Query: {
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" 
}
```

ChatGPT tidak perlu handle wallet address manually!

---

## ChatGPT Workflow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
└─────────────────┬───────────────────────────────────────┘
                  │
         ┌────────▼────────┐
         │  Authenticated? │
         └────────┬────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
    ┌───▼───┐          ┌────▼─────┐
    │  Yes  │          │    No    │
    └───┬───┘          └────┬─────┘
        │                   │
        │              Require address
        │              in request body
        │                   │
        │              ┌────▼─────────┐
        │              │ Portfolio/   │
        │              │ Swap Query   │
        │              └──────────────┘
        │
  ┌─────▼──────┐
  │Auto-inject │
  │active      │
  │wallet      │
  └─────┬──────┘
        │
  ┌─────▼───────────────────────────┐
  │ Available Actions:              │
  │ • Portfolio queries             │
  │ • Strategy recommendations      │
  │ • Create/manage alerts          │
  │ • Save conversation context     │
  │ • Receive proactive alerts      │
  │ • Switch between wallets        │
  └─────────────────────────────────┘
```

---

## Best Practices

### 1. **Save Important Context**
```javascript
// After user shares preference
POST /api/conversation/messages
{
  "role": "user",
  "content": "I prefer DCA every Friday",
  "metadata": { 
    "strategy": "dca",
    "cadence": "weekly",
    "day": "friday"
  }
}
```

### 2. **Poll for Alerts Periodically**
```javascript
// Every 5 minutes
GET /api/alerts/notifications?includeRead=false

// If notifications found:
ChatGPT proactively notifies user
```

### 3. **Use Context for Better Responses**
```javascript
// Before generating response
GET /api/conversation/context?messageCount=10

// Analyze user:
// - Risk tolerance
// - Preferred chains
// - Trading frequency
// - Past strategies

// Then provide personalized recommendation
```

### 4. **Respect Privacy**
```javascript
// User says "forget my data"
DELETE /api/conversation/history
DELETE /api/user/wallets/:id (for each wallet)
```

---

## Error Handling

```javascript
try {
  const response = await fetch('/api/alerts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(alertData)
  })
  
  const data = await response.json()
  
  if (!data.success) {
    // Handle error
    if (data.error.code === 'UNAUTHORIZED') {
      // Re-authenticate user
    } else {
      // Show error to user
    }
  }
} catch (error) {
  // Network error handling
}
```

---

## Complete Example Flow

### User Journey: From Anonymous → Authenticated → Personalized

1. **Day 1 - Anonymous**
```
User: "Cek portfolio 0xd8dA...96045"
ChatGPT: Returns balance (no memory)
```

2. **Day 1 - Login**
```
User: "Connect wallet"
ChatGPT: Auth flow → JWT token saved
```

3. **Day 1 - Setup**
```
User: "Tambah wallet trading, set alert ETH > $4k"
ChatGPT: Creates wallet + alert
```

4. **Day 2 - Seamless**
```
User: "Berapa portfolio saya?"
ChatGPT: Auto-uses active wallet, no address needed
```

5. **Day 3 - Proactive**
```
ChatGPT: "🚨 ETH hit $4,050! Your alert triggered"
User: "What should I do?"
ChatGPT: Analyzes context → knows user prefers low-risk
         → recommends conservative DCA strategy
```

---

## Summary

| Feature | Anonymous Mode | Authenticated Mode |
|---------|---------------|-------------------|
| Portfolio Query | ✅ (manual address) | ✅ (auto-active wallet) |
| Token Swap | ✅ (manual taker) | ✅ (auto-taker) |
| Multi-Wallet | ❌ | ✅ |
| Alerts | ❌ | ✅ |
| Conversation History | ❌ | ✅ |
| Personalized AI | ❌ | ✅ |
| Proactive Notifications | ❌ | ✅ |

**Recommendation:** Encourage users to authenticate for best experience!

---

📚 **Full API Documentation:**
- Alerts: `docs/ALERTS_AND_CONVERSATION_API.md`
- Authentication: `README.md` (MetaMask signature section)
- Main Features: `replit.md`
