'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useThread } from '@/hooks/useThread'
import { ForumMessage } from '@/hooks/useForum'

interface ThreadViewProps {
    threadId: string
    threadName?: string
}

export default function ThreadView({ threadId, threadName = 'THREAD' }: ThreadViewProps) {
    const { messages, postMessage, isLoading, status, isConnected } = useThread(threadId)
    const router = useRouter()
    const [newMessage, setNewMessage] = useState('')
    const [subject, setSubject] = useState('')
    const [replyingTo, setReplyingTo] = useState<string | null>(null)

    const handlePostMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        try {
            await postMessage(
                newMessage.trim(),
                subject.trim() || undefined,
                replyingTo || undefined
            )
            
            // Reset form
            setNewMessage('')
            setSubject('')
            setReplyingTo(null)
        } catch (error) {
            console.error('Failed to post message:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to post message. Please try again.'
            alert(errorMessage)
        }
    }

    const formatAddress = (address: string | undefined) => {
        if (!address) return 'Unknown'
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString()
    }

    const getMessageDepth = (message: ForumMessage, allMessages: ForumMessage[]): number => {
        if (!message.inReplyTo) return 0
        
        const parent = allMessages.find(m => m.id === message.inReplyTo)
        if (!parent) return 0
        
        return 1 + getMessageDepth(parent, allMessages)
    }

    const renderMessage = (message: ForumMessage, allMessages: ForumMessage[]) => {
        const depth = getMessageDepth(message, allMessages)
        const isReply = depth > 0
        
        return (
            <div 
                className={`message-item ${isReply ? 'reply' : ''}`}
                style={{ marginLeft: `${depth * 20}px` }}
            >
                <div className="message-header">
                    <span className="message-author">{formatAddress(message.createdBy)}</span>
                    <span className="message-timestamp">[{formatTimestamp(message.createdAt)}]</span>
                    {isReply && <span className="reply-indicator">REPLY</span>}
                </div>
                
                {message.subject && (
                    <div className="message-subject">
                        <strong>SUBJECT: {message.subject}</strong>
                    </div>
                )}
                
                <div className="message-content">
                    {message.content || 'Loading content...'}
                </div>
                
                {isConnected && (
                    <button 
                        className="reply-button"
                        onClick={() => setReplyingTo(message.id)}
                    >
                        REPLY
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="thread-view">
            <div className="thread-header">
                <button 
                    className="btn btn-secondary"
                    onClick={() => router.back()}
                >
                    ← BACK
                </button>
                <h2>{threadName}</h2>
                <div className="thread-status">
                    STATUS: {status}
                </div>
            </div>
            
            <div className="message-thread">
                {messages.length === 0 ? (
                    <div className="no-messages">
                        <p>NO MESSAGES YET. BE THE FIRST TO POST!</p>
                    </div>
                ) : (
                    messages.map(message => (
                        <div key={message.id}>
                            {renderMessage(message, messages)}
                        </div>
                    ))
                )}
            </div>
            
            <div className="message-input-area">
                {isConnected ? (
                    <form onSubmit={handlePostMessage} className="message-form">
                        {replyingTo && (
                            <div className="reply-notice">
                                <span>REPLYING TO MESSAGE</span>
                                <button 
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                >
                                    CANCEL
                                </button>
                            </div>
                        )}
                        
                        <div className="input-row">
                            <input
                                type="text"
                                placeholder="SUBJECT (OPTIONAL)..."
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                maxLength={256}
                                className="subject-input"
                            />
                        </div>
                        
                        <div className="input-row">
                            <textarea
                                placeholder="TYPE YOUR MESSAGE HERE..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                rows={3}
                                className="message-input"
                                required
                            />
                        </div>
                        
                        <div className="input-actions">
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? 'POSTING...' : 'POST MESSAGE'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="connect-prompt">
                        <p>CONNECT YOUR WALLET TO POST MESSAGES</p>
                    </div>
                )}
            </div>
        </div>
    )
}
