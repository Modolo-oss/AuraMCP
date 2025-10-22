class AuraGPTChat {
  constructor() {
    this.sessionId = null
    this.walletAddress = null
    this.isTyping = false
    this.selectedModel = 'gpt4'
    
    this.messagesContainer = document.getElementById('messages')
    this.messageInput = document.getElementById('message-input')
    this.sendBtn = document.getElementById('send-btn')
    this.connectWalletBtn = document.getElementById('connect-wallet')
    this.newChatBtn = document.getElementById('new-chat-btn')
    
    this.init()
  }

  init() {
    this.sendBtn.addEventListener('click', () => this.sendMessage())
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })
    this.messageInput.addEventListener('input', () => this.handleInputChange())
    this.connectWalletBtn.addEventListener('click', () => this.connectWallet())
    this.newChatBtn.addEventListener('click', () => this.newChat())
    
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectModel(e.target.dataset.model))
    })
    
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', (e) => this.handleSuggestion(e.target.textContent))
    })
    
    this.createSession()
    this.checkMetaMask()
  }

  selectModel(model) {
    this.selectedModel = model
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.remove('active')
    })
    event.target.classList.add('active')
    console.log('Model selected:', model)
  }

  handleSuggestion(text) {
    this.messageInput.value = text
    this.handleInputChange()
    this.messageInput.focus()
  }

  newChat() {
    this.messagesContainer.innerHTML = `
      <div class="empty-state">
        <div class="sparkle-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M24 8L26 14L32 16L26 18L24 24L22 18L16 16L22 14L24 8Z" fill="#2d4a3e"/>
            <path d="M32 24L33 27L36 28L33 29L32 32L31 29L28 28L31 27L32 24Z" fill="#4a6b5a"/>
            <circle cx="12" cy="36" r="2" fill="#6b8570"/>
          </svg>
        </div>
        <h2>Ask AURA Engine anything</h2>
        
        <div class="suggestions">
          <p class="suggestions-label">Suggestions on what to ask AURA Engine</p>
          <div class="suggestion-chips">
            <button class="suggestion-chip">What can AURA Engine help me with?</button>
            <button class="suggestion-chip">Check my DeFi portfolio balance</button>
            <button class="suggestion-chip">What's the current price of ETH?</button>
            <button class="suggestion-chip">Help me swap tokens safely</button>
          </div>
        </div>
      </div>
    `
    
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', (e) => this.handleSuggestion(e.target.textContent))
    })
    
    this.createSession()
  }

  handleInputChange() {
    const hasText = this.messageInput.value.trim().length > 0
    this.sendBtn.disabled = !hasText || this.isTyping
    
    this.messageInput.style.height = 'auto'
    this.messageInput.style.height = this.messageInput.scrollHeight + 'px'
  }

  async createSession() {
    try {
      const response = await fetch('/api/chat/new-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: this.walletAddress })
      })
      
      const data = await response.json()
      if (data.success) {
        this.sessionId = data.data.sessionId
        console.log('Chat session created:', this.sessionId)
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  async checkMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        })
        if (accounts.length > 0) {
          this.setWalletConnected(accounts[0])
        }
      } catch (error) {
        console.error('Failed to check MetaMask:', error)
      }
    }
  }

  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to connect your wallet')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts.length > 0) {
        this.setWalletConnected(accounts[0])
        await this.createSession()
        this.removeEmptyState()
        this.addMessage('assistant', `✅ Wallet connected! I can now help you with your portfolio and transactions. Your address: ${this.formatAddress(accounts[0])}`)
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  setWalletConnected(address) {
    this.walletAddress = address
    this.connectWalletBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="10" cy="10" r="8" stroke="#10B981" stroke-width="2" fill="none"/>
        <circle cx="10" cy="10" r="3" fill="#10B981"/>
      </svg>
    `
    this.connectWalletBtn.style.borderColor = '#10B981'
  }

  formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  removeEmptyState() {
    const emptyState = this.messagesContainer.querySelector('.empty-state')
    if (emptyState) {
      emptyState.remove()
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim()
    if (!message || this.isTyping || !this.sessionId) return

    this.removeEmptyState()
    this.addMessage('user', message)
    this.messageInput.value = ''
    this.handleInputChange()
    
    this.isTyping = true
    this.showTypingIndicator()

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message,
          walletAddress: this.walletAddress
        })
      })

      const data = await response.json()
      
      if (data.success) {
        this.hideTypingIndicator()
        this.addMessage('assistant', data.data.response, data.data.toolCalls)
      } else {
        this.hideTypingIndicator()
        this.addMessage('assistant', '❌ Sorry, I encountered an error: ' + data.error.message)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      this.hideTypingIndicator()
      this.addMessage('assistant', '❌ Sorry, I encountered a network error. Please try again.')
    }

    this.isTyping = false
    this.handleInputChange()
  }

  addMessage(role, content, toolCalls) {
    const messageDiv = document.createElement('div')
    messageDiv.className = `message ${role}-message`

    const avatar = document.createElement('div')
    avatar.className = 'message-avatar'
    avatar.textContent = role === 'user' ? 'U' : 'A'

    const contentDiv = document.createElement('div')
    contentDiv.className = 'message-content'
    
    const textDiv = document.createElement('div')
    textDiv.className = 'message-text'
    textDiv.innerHTML = this.formatMessage(content)
    contentDiv.appendChild(textDiv)

    if (toolCalls && toolCalls.length > 0) {
      toolCalls.forEach(toolCall => {
        const toolResult = this.createToolResultElement(toolCall)
        contentDiv.appendChild(toolResult)
      })
    }

    messageDiv.appendChild(avatar)
    messageDiv.appendChild(contentDiv)
    
    this.messagesContainer.appendChild(messageDiv)
    this.scrollToBottom()
  }

  formatMessage(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    text = text.replace(/\n/g, '<br>')
    
    const urlRegex = /(https?:\/\/[^\s]+)/g
    text = text.replace(urlRegex, '<a href="$1" target="_blank" style="color: #2d4a3e; text-decoration: underline; font-weight: 600;">$1</a>')
    
    return text
  }

  createToolResultElement(toolCall) {
    const toolDiv = document.createElement('div')
    toolDiv.className = 'tool-result'

    const headerDiv = document.createElement('div')
    headerDiv.className = 'tool-result-header'
    
    const toolIcon = this.getToolIcon(toolCall.function)
    headerDiv.innerHTML = `${toolIcon} ${this.getToolName(toolCall.function)}`

    const dataDiv = document.createElement('div')
    dataDiv.className = 'tool-result-data'
    
    if (toolCall.function === 'swap_prepare' && toolCall.result.success && toolCall.result.data.shareableLink) {
      const link = toolCall.result.data.shareableLink
      dataDiv.innerHTML = `<a href="${link}" target="_blank" style="color: #2d4a3e; font-weight: 600;">🔗 Click here to execute swap</a>`
    } else {
      dataDiv.textContent = this.formatToolResult(toolCall.result)
    }

    toolDiv.appendChild(headerDiv)
    toolDiv.appendChild(dataDiv)
    
    return toolDiv
  }

  getToolIcon(functionName) {
    const icons = {
      'portfolio_getBalance': '📊',
      'price_getQuote': '💱',
      'swap_prepare': '🔄',
      'strategy_propose': '🎯'
    }
    return icons[functionName] || '🔧'
  }

  getToolName(functionName) {
    const names = {
      'portfolio_getBalance': 'Portfolio Balance',
      'price_getQuote': 'Price Quote',
      'swap_prepare': 'Swap Prepared',
      'strategy_propose': 'Strategy Proposal'
    }
    return names[functionName] || functionName
  }

  formatToolResult(result) {
    if (typeof result === 'string') return result
    return JSON.stringify(result, null, 2)
  }

  showTypingIndicator() {
    const template = document.getElementById('typing-indicator')
    const indicator = template.content.cloneNode(true)
    indicator.firstElementChild.id = 'typing-indicator-active'
    this.messagesContainer.appendChild(indicator)
    this.scrollToBottom()
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator-active')
    if (indicator) {
      indicator.remove()
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
    }, 100)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.auraChat = new AuraGPTChat()
})
