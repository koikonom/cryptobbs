'use client'

import { useChat } from '@/hooks/useChat'

export default function ChatContainer() {
    const { messages, text, setText, status, sendMessage, isConnected } = useChat()

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h2>REAL-TIME CHAT</h2>
                <div className="chat-status">
                    STATUS: {status}
                </div>
            </div>
            
            <div className="chat-messages">
                <div className="message">
                    <span className="timestamp">[12:34:56]</span>
                    <span className="username">SYSTEM:</span>
                    <span className="message-text">WELCOME TO CRYPTOBBS CHAT</span>
                </div>
                {!isConnected && (
                    <div className="message">
                        <span className="timestamp">[12:35:12]</span>
                        <span className="username">SYSTEM:</span>
                        <span className="message-text">CONNECT YOUR WALLET TO PARTICIPATE</span>
                    </div>
                )}
                {messages.map((message, index) => (
                    <div key={index} className="chat-message">
                        <span className="timestamp"> [{new Date(message.timestamp).toUTCString()}] </span>
                        <span className="username">{message.username}: </span>
                        <span className="message-text">{message.message}</span>
                    </div>
                ))}
            </div>
            
            <div className="chat-input-area">
                {isConnected ? (
                    <div className="input-container">
                        <input 
                            type="text" 
                            placeholder="TYPE YOUR MESSAGE HERE..."
                            className="chat-input"
                            disabled={!isConnected}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button 
                            className="btn btn-primary" 
                            disabled={!isConnected} 
                            onClick={sendMessage}
                        >
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
    )
}
