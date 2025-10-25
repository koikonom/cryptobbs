import { useCallback, useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useWaku } from './useWaku'
import { swarmService } from '@/services/swarmService'
import { messageCache } from '@/services/messageCache'
import { threadCache } from '@/services/threadCache'
import { ForumMessage } from './useForum'

export function useThread(threadId: string) {
    const account = useAccount()
    const messageTopic = `/cryptobbs/1/forum-message/proto`
    const { isConnected, status, sendMessage: wakuSendMessage, subscribeToMessages } = useWaku()
    const [messages, setMessages] = useState<ForumMessage[]>(() => messageCache.getMessages(threadId))
    const [isLoading, setIsLoading] = useState(false)
    const [forceUpdate, setForceUpdate] = useState(0)
    const processedMessages = useRef<Set<string>>(new Set())
    
    // Debug: Log initial state
    useEffect(() => {
        console.log('useThread initialized for threadId:', threadId)
        console.log('Initial messages from cache:', messageCache.getMessages(threadId))
        console.log('Waku connection status:', { isConnected, status })
        console.log('useWaku hook result:', { isConnected, status, subscribeToMessages: !!subscribeToMessages })
    }, [threadId, isConnected, status, subscribeToMessages])
    
    // Subscribe to messages from this thread's topic
    useEffect(() => {
        console.log('Setting up message subscription for threadId:', threadId, 'topic:', messageTopic)
        const unsubscribe = subscribeToMessages(messageTopic, async (message: ForumMessage) => {
            console.log('Received message:', message, 'for threadId:', threadId)
            // Only process messages for this specific thread
            if (message.threadId !== threadId) {
                console.log('Message filtered out - different threadId')
                return
            }
            
            // Check if we've already processed this message
            if (processedMessages.current.has(message.id)) {
                console.log('Message already processed, skipping:', message.id)
                return
            }
            processedMessages.current.add(message.id)
            
            try {
                // Check if content is already cached
                let content: string
                if (messageCache.hasContent(message.contentRef)) {
                    content = messageCache.getContent(message.contentRef)!
                } else {
                    // Fetch content from Swarm
                    content = await swarmService.downloadData(message.contentRef)
                    // Cache the content
                    messageCache.setContent(message.contentRef, content)
                }
                
                const messageWithContent: ForumMessage = {
                    ...message,
                    content
                }
                
                // Update cache
                messageCache.addMessage(threadId, messageWithContent)
                
                setMessages((currentMessages) => {
                    // Update existing message or add new one
                    const existingIndex = currentMessages.findIndex(m => m.id === message.id)
                    if (existingIndex >= 0) {
                        console.log('Message already exists, updating:', message.id)
                        const updated = [...currentMessages]
                        updated[existingIndex] = messageWithContent
                        return updated
                    } else {
                        console.log('Adding new message:', message.id, 'Total messages:', currentMessages.length + 1)
                        const newMessages = [...currentMessages, messageWithContent]
                        return newMessages
                    }
                })
                
                // Force update to ensure UI re-renders
                setForceUpdate(prev => prev + 1)
            } catch (error) {
                console.error('Failed to fetch message content from Swarm:', error)
                // Still add the message but without content
                const messageWithoutContent = { ...message }
                messageCache.addMessage(threadId, messageWithoutContent)
                
                setMessages((currentMessages) => {
                    const existingIndex = currentMessages.findIndex(m => m.id === message.id)
                    if (existingIndex >= 0) {
                        return currentMessages
                    } else {
                        console.log('Adding message without content, total messages:', currentMessages.length + 1)
                        return [...currentMessages, messageWithoutContent]
                    }
                })
                
                // Force update to ensure UI re-renders
                setForceUpdate(prev => prev + 1)
            }
        })
        
        return unsubscribe
    }, [subscribeToMessages, messageTopic, threadId])

    // Debug: Track messages state changes
    useEffect(() => {
        console.log('Messages state changed, count:', messages.length)
    }, [messages])

    // Cleanup processed messages set when component unmounts
    useEffect(() => {
        return () => {
            processedMessages.current.clear()
        }
    }, [])

    // Optional: Clear cache when component unmounts (for memory management)
    // Uncomment if you want to clear cache on unmount
    // useEffect(() => {
    //     return () => {
    //         messageCache.clearThread(threadId)
    //     }
    // }, [threadId])
    
    const postMessage = useCallback(async (content: string, subject?: string, inReplyTo?: string) => {
        if (!account.address) {
            throw new Error('No wallet connected')
        }

        if (!isConnected) {
            throw new Error('Waku not connected. Please wait for connection.')
        }

        try {
            setIsLoading(true)
            
            // Generate message ID
            const messageId = crypto.randomUUID()
            const now = Date.now()

            // Upload message content to Swarm
            const contentRef = await swarmService.uploadData(content)

            // Create message metadata
            const message: ForumMessage = {
                id: messageId,
                threadId,
                createdAt: now,
                createdBy: account.address,
                inReplyTo: inReplyTo || null,
                subject,
                contentRef
            }

            // Publish message metadata via Waku
            console.log('Sending message:', message, 'to topic:', messageTopic)
            await wakuSendMessage(messageTopic, message)
            
            // Add to cache immediately for instant UI update
            const messageWithContent: ForumMessage = {
                ...message,
                content
            }
            messageCache.addMessage(threadId, messageWithContent)
            setMessages(prev => [...prev, messageWithContent])
            
            // Update thread's updatedAt timestamp
            const thread = threadCache.getThread(threadId)
            if (thread) {
                const updatedThread = {
                    ...thread,
                    updatedAt: now
                }
                threadCache.addThread(updatedThread)
            }
            
        } catch (error) {
            console.error('Failed to post message:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [account.address, threadId, wakuSendMessage, messageTopic, isConnected])

    const getStatusText = () => {
        if (account.status !== 'connected') {
            return 'OFFLINE'
        } else if (status === 'connecting') {
            return 'CONNECTING...'
        } else if (status === 'connected') {
            return 'ONLINE'
        } else {
            return 'OFFLINE'
        }
    }

    // Sort messages by creation time (oldest first for threaded display)
    const sortedMessages = messages.sort((a, b) => a.createdAt - b.createdAt)

    return {
        messages: sortedMessages,
        postMessage,
        isLoading,
        status: getStatusText(),
        isConnected: account.status === 'connected'
    }
}
