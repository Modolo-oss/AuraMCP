# Alerts & Conversation History API Documentation

## Overview

The Alerts and Conversation History system enables ChatGPT to provide personalized, proactive DeFi portfolio management through:
- **Alerts System**: Custom monitoring rules for price changes, portfolio events, and liquidation risks
- **Background Monitoring**: Automatic alert checking every 5 minutes with real-time AURA API integration
- **Conversation History**: Persistent chat context for personalized AI recommendations

All endpoints require **JWT authentication** via MetaMask signature.

---

## Background Monitoring System

The **AlertMonitor** service runs automatically in the background:
- ⏱️ **Checks every 5 minutes** - Scheduled via node-cron
- 🔍 **Real-time price tracking** - Queries AURA API for current portfolio data
- 🚨 **Auto-notifications** - Creates notifications when alert conditions are met
- 🛡️ **Anti-spam protection** - Prevents duplicate notifications (max 1 per hour per alert)
- 📊 **Zero config needed** - Starts automatically with server

**How it works:**
1. Monitor fetches all active alerts from database
2. For each alert, gets user's active wallet address
3. Queries AURA API for current portfolio balance and token prices
4. Compares current values against alert conditions
5. Creates notification if threshold crossed
6. ChatGPT polls `/api/alerts/notifications` to get new alerts

---

## Alerts Management API

### Create Alert

Create a custom alert rule to monitor portfolio events.

**Endpoint:** `POST /api/alerts`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "ETH Price Alert",
  "alertType": "price_change",
  "rules": {
    "type": "price_change",
    "conditions": {
      "token": "ETH",
      "chain": "ethereum",
      "threshold": 4000,
      "direction": "above",
      "percentage": 5
    }
  }
}
```

**Alert Types:**
- `price_change` - Token price movement alerts
- `portfolio_value` - Total portfolio value thresholds
- `liquidation_risk` - DeFi position liquidation warnings
- `custom` - Custom rule definitions

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 123,
    "name": "ETH Price Alert",
    "alertType": "price_change",
    "rules": {
      "type": "price_change",
      "conditions": {
        "token": "ETH",
        "chain": "ethereum",
        "threshold": 4000,
        "direction": "above",
        "percentage": 5
      }
    },
    "isActive": true,
    "createdAt": "2025-10-20T00:58:51.000Z",
    "updatedAt": "2025-10-20T00:58:51.000Z"
  }
}
```

---

### List All Alerts

Get all alert rules for the authenticated user.

**Endpoint:** `GET /api/alerts`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": 1,
        "name": "ETH Price Alert",
        "alertType": "price_change",
        "isActive": true,
        "createdAt": "2025-10-20T00:58:51.000Z"
      },
      {
        "id": 2,
        "name": "Liquidation Watch",
        "alertType": "liquidation_risk",
        "isActive": true,
        "createdAt": "2025-10-20T01:00:00.000Z"
      }
    ],
    "count": 2
  }
}
```

---

### Update Alert

Update an existing alert rule.

**Endpoint:** `PUT /api/alerts/:id`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated ETH Alert",
  "isActive": false,
  "rules": {
    "type": "price_change",
    "conditions": {
      "token": "ETH",
      "threshold": 4500,
      "direction": "above"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated ETH Alert",
    "isActive": false,
    "updatedAt": "2025-10-20T01:05:00.000Z"
  }
}
```

---

### Delete Alert

Remove an alert rule.

**Endpoint:** `DELETE /api/alerts/:id`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Alert deleted successfully"
  }
}
```

---

### Manual Alert Check (Testing)

Force an immediate alert check (useful for testing).

**Endpoint:** `POST /api/alerts/check`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Alert check triggered. Notifications will be created if conditions are met."
  }
}
```

**Note:** This endpoint triggers an immediate alert check instead of waiting for the next scheduled 5-minute interval. Useful for testing new alerts.

---

## Notifications API

### Get Notifications

Fetch pending or all notifications.

**Endpoint:** `GET /api/alerts/notifications?includeRead=false`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `includeRead` (optional): `true` to include read notifications, `false` (default) for unread only

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "userId": 123,
        "alertId": 1,
        "title": "ETH Price Alert Triggered",
        "message": "ETH has crossed $4,000 on Ethereum mainnet",
        "severity": "warning",
        "metadata": {
          "currentPrice": 4050,
          "threshold": 4000,
          "change": "+5.2%"
        },
        "isRead": false,
        "createdAt": "2025-10-20T01:10:00.000Z"
      }
    ],
    "count": 1
  }
}
```

**Severity Levels:**
- `info` - Informational updates
- `warning` - Important events requiring attention
- `critical` - Urgent actions needed (liquidation risks)

---

### Mark Notification as Read

Mark a single notification as read.

**Endpoint:** `PUT /api/alerts/notifications/:id/read`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isRead": true
  }
}
```

---

### Mark All Notifications as Read

Mark all notifications as read.

**Endpoint:** `PUT /api/alerts/notifications/read-all`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markedCount": 5
  }
}
```

---

## Conversation History API

### Save Chat Message

Store a chat message for context building.

**Endpoint:** `POST /api/conversation/messages`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "user",
  "content": "What's my portfolio worth on Base?",
  "metadata": {
    "wallet": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "action": "portfolio_query",
    "timestamp": "2025-10-20T01:15:00.000Z"
  }
}
```

**Roles:**
- `user` - User messages
- `assistant` - AI responses
- `system` - System notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 123,
    "role": "user",
    "content": "What's my portfolio worth on Base?",
    "metadata": {
      "wallet": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "action": "portfolio_query"
    },
    "createdAt": "2025-10-20T01:15:00.000Z"
  }
}
```

---

### Get Conversation History

Retrieve full conversation history.

**Endpoint:** `GET /api/conversation/history?limit=50`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "role": "user",
        "content": "What's my portfolio worth?",
        "createdAt": "2025-10-20T01:00:00.000Z"
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "Your portfolio is worth $12,345.67 across 5 chains.",
        "createdAt": "2025-10-20T01:00:05.000Z"
      }
    ],
    "count": 2
  }
}
```

---

### Get Recent Context for AI

Get recent conversation context optimized for AI prompts.

**Endpoint:** `GET /api/conversation/context?messageCount=10`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `messageCount` (optional): Number of recent messages (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "context": [
      {
        "role": "user",
        "content": "What's my portfolio worth?",
        "metadata": {
          "wallet": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        }
      },
      {
        "role": "assistant",
        "content": "Your portfolio is worth $12,345.67 across 5 chains."
      }
    ],
    "count": 2
  }
}
```

---

### Get Conversation Stats

Get conversation statistics for the user.

**Endpoint:** `GET /api/conversation/stats`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMessages": 150,
    "userMessages": 75,
    "assistantMessages": 75,
    "lastMessageAt": "2025-10-20T01:15:00.000Z"
  }
}
```

---

### Clear Conversation History

Delete all conversation history (privacy control).

**Endpoint:** `DELETE /api/conversation/history`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 150,
    "message": "Conversation history cleared"
  }
}
```

---

## ChatGPT Integration Examples

### Example 1: User Sets Price Alert via ChatGPT

**User:** "Alert me when ETH goes above $4,000"

**ChatGPT Action:**
1. Extract intent: Create price alert
2. Call `POST /api/alerts` with:
```json
{
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
```

**ChatGPT Response:** "✅ Alert created! I'll notify you when ETH crosses $4,000."

---

### Example 2: Proactive Alert Notification

**Background:** Alert system detects ETH > $4,000

**System Action:**
1. Create notification via internal logic
2. ChatGPT polls `GET /api/alerts/notifications`
3. Finds unread notification

**ChatGPT Proactive Message:** 
"🚨 **Alert:** ETH just hit $4,050 on Ethereum! That's a 5.2% increase. Your ETH holdings are now worth $7,087. Would you like to take profits or set a trailing stop?"

---

### Example 3: Personalized Recommendations Using Context

**User:** "What should I do with my portfolio?"

**ChatGPT Action:**
1. Call `GET /api/conversation/context` to get recent chat history
2. Call `GET /api/conversation/stats` to understand user behavior
3. Call `POST /api/portfolio/balance` (auto-uses active wallet)
4. Analyze context + portfolio data

**ChatGPT Response (Personalized):**
"Based on our previous conversations, I know you prefer low-risk DeFi strategies. Your current portfolio shows:
- 60% stablecoins (conservative ✓)
- 30% ETH (good exposure)
- 10% volatile alts (within your 15% risk tolerance)

Given your DCA strategy from last week and the current ETH price of $4,050, I'd recommend:
1. Continue weekly $500 ETH buys (next buy in 3 days)
2. Consider moving 5% of USDC into Aave for 4.2% APY
3. Your liquidation risk is 0% (no leverage positions)"

---

## Privacy Controls

All data is **user-isolated** with row-level security:
- Users can only access their own alerts, notifications, and conversation history
- JWT token contains `userId` for authentication
- Delete operations permanently remove data
- No cross-user data leakage

**Privacy Actions:**
- Clear conversation history: `DELETE /api/conversation/history`
- Remove specific wallet: `DELETE /api/user/wallets/:id`
- Delete alert: `DELETE /api/alerts/:id`

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "ALERT_ERROR",
    "message": "Alert not found"
  }
}
```

**Common Error Codes:**
- `MISSING_PARAMS` - Required parameters missing
- `INVALID_ID` - Invalid resource ID
- `ALERT_ERROR` - Alert operation failed
- `NOTIFICATION_ERROR` - Notification operation failed
- `CONVERSATION_ERROR` - Conversation operation failed
- `UNAUTHORIZED` - Authentication required or failed
