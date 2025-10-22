# ⚡ Quick Start - Deploy to Railway in 10 Minutes

## 🎯 What You Need

1. **GitHub account** with this repo pushed
2. **Railway account** (free tier available)
3. **AURA API Key** - Get from [aura.adex.network](https://aura.adex.network)
4. **OpenRouter API Key** - Get from [openrouter.ai](https://openrouter.ai/keys)

---

## 🚀 Deployment Steps

### 1️⃣ **Push to GitHub** (if not done)

```bash
git add .
git commit -m "Ready for Railway"
git push origin main
```

### 2️⃣ **Create Railway Project**

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select this repository
4. Wait for initial deployment ⏳

### 3️⃣ **Add PostgreSQL Database**

1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway auto-sets `DATABASE_URL` ✅

### 4️⃣ **Set Environment Variables**

Click your web service → **"Variables"** → Add these:

```env
AURA_API_KEY=your-aura-api-key
OPENROUTER_API_KEY=your-openrouter-key
NODE_ENV=production
```

**Optional:**
```env
SWAP_API_KEY=your-0x-api-key
```

Save → Railway auto-redeploys 🔄

### 5️⃣ **Initialize Database**

**Option A - Railway CLI:**
```bash
npm install -g @railway/cli
railway login
railway link
railway run npm run db:push
```

**Option B - In Deploy Command:**
Temporarily set start command to:
```
npm run db:push && npm start
```

### 6️⃣ **Get Your URL**

1. **"Settings"** → **"Networking"** → **"Generate Domain"**
2. Copy your URL:
   ```
   https://your-app.up.railway.app
   ```

### 7️⃣ **Test Endpoints**

```bash
# Health check
curl https://your-app.up.railway.app/api/health

# MCP endpoint (for ChatGPT)
curl -X POST https://your-app.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Web chat (open in browser)
https://your-app.up.railway.app/chat

# Landing page
https://your-app.up.railway.app/
```

---

## ✅ Success Checklist

- ✅ Service status: **Active**
- ✅ Deployment: **Success**
- ✅ Health endpoint returns `{"success": true}`
- ✅ MCP endpoint lists 10+ tools
- ✅ Web chat loads with AURA Engine interface
- ✅ Database tables created

---

## 🎯 What You Get

### **1. MCP Server** (`/mcp`)
ChatGPT Custom Tool endpoint with 10+ DeFi tools:
- Portfolio analysis
- Token swaps
- Strategy recommendations
- Risk management

### **2. AURA Engine Web Chat** (`/chat`)
Standalone chat interface with:
- AIVA-inspired design
- Model selector (GPT-4/Claude/Gemini)
- Chat history
- MetaMask integration

### **3. Token Swap UI** (`/swap`)
Web-based swap interface with:
- Multi-chain support (100+ DEXes)
- Best execution routes
- MetaMask wallet signing

### **4. Landing Page** (`/`)
Modern homepage with feature showcase

---

## 💰 Costs

**Railway Free Tier:**
- $5 credit/month
- Perfect for testing

**Estimated Monthly:**
- ~$10-15/month for production
- PostgreSQL + Web Service

**API Costs:**
- AURA API: FREE (currently)
- OpenRouter: ~$0.001-0.01/message
- 0x Swap: FREE

---

## 🐛 Troubleshooting

### Build Fails
- Check logs in **"Deployments"** tab
- Verify all dependencies in `package.json`

### Database Connection Error
- Ensure PostgreSQL service is running
- Run `npm run db:push` to initialize

### MCP Endpoint 404
- Wait for full deployment (check logs)
- Test health endpoint first

### Environment Variables Missing
- Verify in **"Variables"** tab
- Must have: `AURA_API_KEY`, `OPENROUTER_API_KEY`
- `DATABASE_URL` and `PORT` are auto-set

---

## 📞 Next Steps

### Configure ChatGPT Custom Tool

1. Go to [ChatGPT GPTs](https://chat.openai.com/gpts/editor)
2. Create new GPT → **"Actions"**
3. Add action:
   ```
   https://your-app.up.railway.app/mcp
   ```

### Share Your Web Chat

Send users to:
```
https://your-app.up.railway.app/chat
```

### Custom Domain (Optional)

Railway **"Settings"** → **"Networking"** → **"Custom Domain"**

---

## 🎉 You're Live!

All 23+ tools are **FREE** to use:
- ✅ Portfolio analysis across 200+ blockchains
- ✅ Token swaps via 100+ DEXes
- ✅ AI-powered strategy recommendations
- ✅ Risk management & alerts
- ✅ Real-time pricing

**Welcome to AURA Engine!** 🚀

---

## 📚 Full Documentation

- **Detailed Guide**: `RAILWAY_SETUP_GUIDE.md`
- **Full Deployment**: `RAILWAY_DEPLOYMENT.md`
- **API Docs**: See `/docs` folder

---

**Need help?** Check the detailed guides or Railway docs at [docs.railway.app](https://docs.railway.app)
