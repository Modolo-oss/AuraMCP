# ChatGPT MCP Integration Guide

## Overview

AURA MCP Server supports **Model Context Protocol (MCP)** for ChatGPT Custom Tool integration, allowing ChatGPT to call DeFi tools directly!

---

## MCP Endpoint

### **Endpoint:** `POST /mcp`

**URL:** `https://your-app.replit.app/mcp`

**Method:** `POST`

**Content-Type:** `application/json`

**Request Format:** JSON-RPC 2.0

---

## How It Works

### **1. Connection Flow**

```
ChatGPT → Connect to /sse → Server streams events in real-time
```

### **2. Event Types**

| Event Type | Description |
|------------|-------------|
| `connected` | Initial connection confirmation |
| `notification` | Alert triggered (price, portfolio, liquidation) |
| `heartbeat` | Keep-alive ping (every 30 seconds) |

### **3. Example SSE Stream**

```
data: {"type":"connected","message":"SSE stream established","timestamp":"2025-10-20T13:05:05.245Z"}

: heartbeat

event: notification
data: {"type":"alert_notification","userId":1,"alertId":5,"notification":{"id":10,"title":"ETH Price Alert Triggered","message":"ETH is now $4050.00 (above $4000)","severity":"warning"},"timestamp":"2025-10-20T13:10:00.123Z"}
```

---

## ChatGPT Setup Instructions

### **Step 1: Deploy Your Server**

1. Click **"Publish"** in Replit (top right)
2. Your server will be deployed at: `https://your-app.replit.app`
3. Copy this URL

### **Step 2: Open ChatGPT Custom Tools**

1. Go to **ChatGPT** (OpenAI platform)
2. Navigate to **Custom Tools** or **GPT Editor**
3. Click **"Add Custom Tool"**

### **Step 3: Configure MCP Server**

Fill in the following:

**Name:**
```
AURA DeFi Assistant
```

**Description:**
```
DeFi portfolio analysis, strategy recommendations, and transaction simulation across 200+ blockchains.
```

**MCP Server URL:**
```
https://your-app.replit.app/mcp
```

**Authentication:**
- Select: **OAuth** or **API Key** (Optional)
- If authenticated: Users get JWT token from `/api/auth/verify`
- If anonymous: All users see all notifications (not recommended for production)

**Note:** Currently supports anonymous mode. Authentication coming soon.

---

### **Step 4: Test Connection**

In ChatGPT, send:
```
"Connect to AURA"
```

Expected response:
```
✅ Connected to AURA MCP Server
SSE stream established successfully
I can now receive real-time alerts!
```

---

## Usage Examples

### **Example 1: Create Alert**

**User:**
> "Alert me when ETH goes above $4,000"

**ChatGPT:**
1. Calls `POST /api/alerts` to create alert
2. Server starts monitoring ETH price every 5 minutes
3. When ETH > $4,000 → Server emits notification via SSE
4. ChatGPT receives event → proactively messages user

**ChatGPT Response (When Triggered):**
```
🚨 ALERT: ETH Price Triggered!

ETH is now $4,050 (+1.25%)

Your holdings:
- 3.5 ETH = $14,175

What would you like to do?
1. Take profit (swap 50% to USDC)
2. Set trailing stop
3. Hold position
```

---

### **Example 2: Portfolio Value Alert**

**User:**
> "Notify me if my portfolio drops below $10,000"

**ChatGPT:**
1. Creates portfolio value alert
2. Server checks every 5 minutes
3. When portfolio < $10k → SSE notification sent

**ChatGPT (Proactive):**
```
⚠️ Portfolio Value Alert

Your portfolio is now $9,850 (below $10,000 threshold)

Top losers today:
- AAVE: -8.5% ($2,150 → $1,967)
- UNI: -5.2% ($850 → $806)

Recommendations:
1. Review risk exposure
2. Consider rebalancing
3. Check for liquidation risks
```

---

### **Example 3: Liquidation Risk**

**User:**
> "Monitor my Aave position for liquidation risk"

**ChatGPT:**
1. Creates liquidation alert with health factor threshold
2. Server monitors position every 5 minutes
3. When health factor < 1.3 → Critical alert sent

**ChatGPT (Proactive - CRITICAL):**
```
🚨 CRITICAL: Liquidation Risk Detected!

Aave Health Factor: 1.25 (Risk: HIGH)
Time to liquidation: ~24 hours

URGENT ACTIONS:
1. Add $2,500 collateral → HF = 1.8 (Safe)
2. Repay $1,000 debt → HF = 1.6 (Moderate)
3. Close position now → Avoid liquidation

Current position:
- Collateral: $15,000 ETH
- Debt: $10,000 USDC
- At risk: $15,000 (potential 10% penalty)
```

---

## Technical Details

### **SSE Message Format**

**Connection Message:**
```json
{
  "type": "connected",
  "message": "SSE stream established",
  "timestamp": "2025-10-20T13:05:05.245Z"
}
```

**Alert Notification:**
```json
{
  "type": "alert_notification",
  "userId": 1,
  "alertId": 5,
  "notification": {
    "id": 10,
    "title": "ETH Price Alert Triggered",
    "message": "ETH is now $4050.00 (above $4000)",
    "severity": "warning",
    "metadata": {
      "token": "ETH",
      "currentPrice": 4050,
      "threshold": 4000,
      "direction": "above",
      "changePercent": "1.25"
    }
  },
  "timestamp": "2025-10-20T13:10:00.123Z"
}
```

**Heartbeat:**
```
: heartbeat
```
(Sent every 30 seconds to keep connection alive)

---

## Alert System Architecture

### **Background Monitoring**

```
┌──────────────────────────────────────────────────────┐
│           AlertMonitor (node-cron)                   │
│                                                      │
│  Every 5 minutes:                                    │
│  1. Fetch active alerts from database                │
│  2. Query AURA API for portfolio data                │
│  3. Check if conditions met                          │
│  4. Create notification in database                  │
│  5. Emit event to SSE clients                        │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│              SSE Endpoint (/sse)                     │
│                                                      │
│  - Listens to AlertMonitor events                   │
│  - Filters by userId (if authenticated)              │
│  - Streams to connected ChatGPT clients              │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│              ChatGPT Custom Tool                     │
│                                                      │
│  - Receives SSE event                                │
│  - Parses notification                               │
│  - Proactively messages user                         │
└──────────────────────────────────────────────────────┘
```

---

## Anti-Spam Protection

- **Max 1 notification/hour** per alert
- Prevents duplicate notifications
- Reduces noise for users

---

## Authentication Modes

### **1. Anonymous Mode (Quick Start)**

**Setup:**
```
MCP Server URL: https://your-app.replit.app/sse
Authentication: None
```

**Pros:** Fast setup, no auth needed  
**Cons:** All users see all notifications

### **2. Authenticated Mode (Recommended)**

**Setup:**
```
MCP Server URL: https://your-app.replit.app/sse
Authentication: API Key
Header Name: Authorization
Header Value: Bearer <JWT_TOKEN>
```

**How to Get JWT:**
1. User connects MetaMask
2. Call `POST /api/auth/nonce` → get nonce
3. User signs nonce with MetaMask
4. Call `POST /api/auth/verify` → get JWT token
5. ChatGPT stores JWT for subsequent requests

**Pros:** Secure, personalized, private  
**Cons:** Requires MetaMask setup

---

## Testing SSE Locally

### **Test with curl:**

```bash
curl -X POST https://your-app.replit.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**Expected output:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "portfolio.getBalance",
        "description": "Get portfolio balance...",
        "inputSchema": {...}
      }
    ]
  }
}
```

### **Test with JavaScript:**

```javascript
const eventSource = new EventSource('https://your-app.replit.app/sse');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('SSE Message:', data);
};

eventSource.addEventListener('notification', (event) => {
  const notification = JSON.parse(event.data);
  console.log('🚨 Alert:', notification);
});
```

---

## Deployment Checklist

- [✅] Server running on port 5000
- [✅] SSE endpoint `/sse` accessible
- [✅] AlertMonitor running (checks every 5 minutes)
- [✅] Database connected (Neon PostgreSQL)
- [✅] AURA_API_KEY configured
- [✅] CORS enabled for ChatGPT domain

---

## Troubleshooting

### **Issue: SSE connection drops**

**Solution:**
- Heartbeat sent every 30s to keep connection alive
- Check proxy/firewall settings
- Ensure ChatGPT has persistent connection support

### **Issue: Notifications not received**

**Check:**
1. AlertMonitor running? (`Server logs → "AlertMonitor started"`)
2. Alerts active in database? (`GET /api/alerts`)
3. Conditions met? (Check portfolio vs alert thresholds)
4. Spam protection? (Max 1 notification/hour per alert)

### **Issue: Duplicate notifications**

**Solution:**
- Anti-spam already implemented (1/hour limit)
- Check if multiple SSE clients connected
- Verify userId filtering works

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sse` | GET | SSE stream for real-time notifications |
| `/api/alerts` | POST | Create new alert rule |
| `/api/alerts` | GET | List all alerts |
| `/api/alerts/:id` | PUT | Update alert |
| `/api/alerts/:id` | DELETE | Delete alert |
| `/api/alerts/notifications` | GET | Get triggered notifications |
| `/api/alerts/check` | POST | Force immediate alert check (testing) |

---

## Security Best Practices

1. **Use HTTPS** in production (Replit provides this automatically)
2. **Authenticate SSE connections** with JWT tokens
3. **Filter notifications** by userId (already implemented)
4. **Rate limiting** on alert creation (TODO)
5. **Validate user owns wallets** before creating alerts (already implemented)

---

## Next Steps

1. ✅ Deploy server to Replit
2. ✅ Get public URL
3. ✅ Configure ChatGPT Custom Tool with SSE endpoint
4. ✅ Test connection
5. ✅ Create test alert
6. ✅ Trigger alert (manual or wait for price change)
7. ✅ Verify ChatGPT receives proactive notification

---

## Support

- **Documentation:** `/docs/ALERTS_AND_CONVERSATION_API.md`
- **Integration Guide:** `/docs/CHATGPT_INTEGRATION_GUIDE.md`
- **Health Check:** `GET /api/health`
- **System Status:** `GET /api/system/health`

---

**Built with:**
- Fastify (HTTP server)
- Server-Sent Events (SSE)
- EventEmitter (Node.js)
- node-cron (Background monitoring)
- Neon PostgreSQL (Persistent storage)
- AURA DeFi API (Portfolio data)
