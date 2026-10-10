import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { FaRobot, FaPaperPlane, FaTimes, FaCommentDots, FaTrashAlt } from 'react-icons/fa'

const QUICK_PROMPTS = [
  "🛋️ Velvet Sofas",
  "🪵 Solid Oak Dining Tables",
  "🪑 Ergonomic Chairs",
  "🛏️ Minimalist Beds",
  "🌿 Outdoor Patio Sets"
]

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [threadId, setThreadId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Listen for custom trigger from product cards or hero buttons
  useEffect(() => {
    const handleOpenWithQuery = (e) => {
      const query = e.detail?.query
      setIsOpen(true)
      if (query) {
        setTimeout(() => {
          sendQuery(query)
        }, 150)
      }
    }
    window.addEventListener('open-chat-with-query', handleOpenWithQuery)
    return () => window.removeEventListener('open-chat-with-query', handleOpenWithQuery)
  }, [threadId, isLoading])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          text: "👋 Welcome to **ShopSmart Concierge**! I am your personal architectural design & furniture assistant.\n\nI can help you explore dimensions, compare fabrics, check real-time warehouse inventory, and find the perfect pieces for your space. What are you looking to design today?",
          isAgent: true
        }
      ])
    }
  }, [isOpen, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  const clearChat = () => {
    setMessages([
      {
        text: "✨ Chat cleared! Tell me about the room or furniture style you'd like to explore.",
        isAgent: true
      }
    ])
    setThreadId(null)
  }

  const sendQuery = async (queryText) => {
    const textToSend = queryText.trim()
    if (!textToSend || isLoading) return

    setMessages(prev => [...prev, { text: textToSend, isAgent: false }])
    setInputValue('')
    setIsLoading(true)

    const endpoint = threadId
      ? `http://localhost:8000/chat/${threadId}`
      : 'http://localhost:8000/chat'

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      let reply = data.response
      if (Array.isArray(reply)) {
        reply = reply.map(p => typeof p === 'string' ? p : p?.text || '').join('')
      } else if (typeof reply !== 'string') {
        reply = String(reply || '')
      }

      setMessages(prev => [
        ...prev,
        {
          text: reply,
          isAgent: true,
          threadId: data.threadId
        }
      ])

      if (data.threadId) {
        setThreadId(data.threadId)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [
        ...prev,
        {
          text: "⚠️ Our design catalog is temporarily unreachable. Please ensure the backend server is active on port 8000.",
          isAgent: true,
          isError: true
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendQuery(inputValue)
  }

  return (
    <div className={`chat-widget-container ${isOpen ? 'open' : ''}`}>
      {isOpen ? (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-title">
              <div className="agent-avatar">
                <FaRobot />
                <span className="online-badge"></span>
              </div>
              <div className="agent-info">
                <h3>ShopSmart AI Concierge</h3>
                <span className="agent-status">Architectural Furniture Advisor • Online</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-action-btn" onClick={clearChat} title="Clear conversation">
                <FaTrashAlt size={13} />
              </button>
              <button className="close-button" onClick={toggleChat} title="Close chat">
                <FaTimes size={15} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="quick-prompts-bar">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                className="quick-prompt-chip"
                onClick={() => sendQuery(prompt.replace(/^[^\w\s]+/, '').trim())}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message-wrapper ${message.isAgent ? 'wrapper-bot' : 'wrapper-user'}`}
              >
                {message.isAgent && (
                  <div className="bot-message-avatar">
                    <FaRobot size={12} />
                  </div>
                )}
                <div
                  className={`message ${message.isAgent ? 'message-bot' : 'message-user'} ${
                    message.isError ? 'message-error' : ''
                  }`}
                >
                  {message.isAgent ? (
                    <div className="markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          del: ({ node, ...props }) => (
                            <del className="price-cut" {...props} />
                          ),
                          img: ({ node, ...props }) => (
                            <span className="product-image-container">
                              <img
                                {...props}
                                className="product-card-img"
                                alt={props.alt || 'Furniture item'}
                                loading="lazy"
                              />
                            </span>
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="product-title-heading" {...props} />
                          ),
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" />
                          )
                        }}
                      >
                        {(() => {
                          if (typeof message.text !== 'string') return ''
                          let cleaned = message.text
                          // 1. Remove tilde marks and convert to <del class="price-cut">
                          cleaned = cleaned.replace(/~~(\$[^~]+)~~/g, '<del class="price-cut">$1</del>')
                          cleaned = cleaned.replace(/~~([^~]+)~~/g, '<del class="price-cut">$1</del>')
                          // 2. Replace 1/2 or ½ fraction in rating with half star symbol ⯨
                          cleaned = cleaned.replace(/⭐⭐⭐⭐½/g, '⭐⭐⭐⭐⯨')
                          cleaned = cleaned.replace(/⭐⭐⭐⭐\s*1\/2/g, '⭐⭐⭐⭐⯨')
                          cleaned = cleaned.replace(/★★★★½/g, '★★★★⯨')
                          cleaned = cleaned.replace(/★★★★\s*1\/2/g, '★★★★⯨')
                          cleaned = cleaned.replace(/⭐\s*1\/2/g, '⭐⯨')
                          cleaned = cleaned.replace(/★\s*1\/2/g, '★⯨')
                          cleaned = cleaned.replace(/½/g, '⯨')
                          cleaned = cleaned.replace(/\s+1\/2\s+/g, ' ⯨ ')
                          cleaned = cleaned.replace(/—\s*1\/2/g, '')
                          return cleaned
                        })()}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.text
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="message-wrapper wrapper-bot">
                <div className="bot-message-avatar">
                  <FaRobot size={12} />
                </div>
                <div className="message message-bot typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="chat-input-container" onSubmit={handleSubmit}>
            <input
              type="text"
              className="message-input"
              placeholder="Ask about dimensions, materials, styling tips..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="send-button"
              disabled={inputValue.trim() === '' || isLoading}
              title="Send message"
            >
              <FaPaperPlane size={13} />
            </button>
          </form>
        </div>
      ) : (
        <button className="chat-button" onClick={toggleChat} title="Chat with ShopSmart AI Concierge">
          <FaCommentDots size={24} />
          <span className="chat-badge-indicator">AI</span>
          <span className="chat-button-pulse"></span>
        </button>
      )}
    </div>
  )
}

export default ChatWidget