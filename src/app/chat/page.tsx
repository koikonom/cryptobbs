'use client'

import { useAccount } from 'wagmi'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Footer from '@/components/Footer'
import { useEffect, useState } from 'react'

type ChatMessage = {
  timestamp: string
  username: string
  message: string
}

function ChatPage() {
  const account = useAccount()
  return (
    <div className="container">
      <Header />

      <div className="main-layout">
        <Sidebar />

        <main className="main-content">
          <div className="chat-container">
            <div className="chat-header">
              <h2>REAL-TIME CHAT</h2>
              <div className="chat-status">
                STATUS: {account.status === 'connected' ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
            
            <div className="chat-messages">
              <div className="message">
                <span className="timestamp">[12:34:56]</span>
                <span className="username">SYSTEM:</span>
                <span className="message-text">WELCOME TO CRYPTOBBS CHAT</span>
              </div>
              {account.status !== 'connected' && (
                <div className="message">
                  <span className="timestamp">[12:35:12]</span>
                  <span className="username">SYSTEM:</span>
                  <span className="message-text">CONNECT YOUR WALLET TO PARTICIPATE</span>
                </div>
              )}
            </div>

            <div className="chat-input-area">
              {account.status === 'connected' ? (
                <div className="input-container">
                  <input 
                    type="text" 
                    placeholder="TYPE YOUR MESSAGE HERE..."
                    className="chat-input"
                    disabled
                  />
                  <button className="btn btn-primary" disabled>
                    SEND
                  </button>
                </div>
              ) : (
                <div className="connect-prompt">
                  <p>CONNECT YOUR WALLET TO START CHATTING</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}

export default ChatPage
