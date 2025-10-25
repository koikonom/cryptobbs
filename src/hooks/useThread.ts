import { useCallback, useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useWaku } from './useWaku'
import { swarmService } from '@/services/swarmService'
import { messageCache } from '@/services/messageCache'
import { threadCache } from '@/services/threadCache'
import { ForumMessage } from './useForum'

export function useThread(threadId: string) {
    const account = useAccount()
    // Encode thread ID to make it Waku-compatible (remove hyphens)
    const encodedThreadId = threadId.replace(/-/g, '')
    const messageTopic = `/cryptobbs/1/forum${encodedThreadId}/proto`
    const { isConnected, status: wakuStatus, peerCount, sendMessage: wakuSendMessage, subscribeToMessages } = useWaku()
    const [messages, setMessages] = useState<ForumMessage[]>(() => messageCache.getMessages(threadId))
    const [isLoading, setIsLoading] = useState(false)
    const [forceUpdate, setForceUpdate] = useState(0)
    const processedMessages = useRef<Set<string>>(new Set())
    
    
    // Subscribe to messages from this thread's topic
    useEffect(() => {
        let unsubscribe = () => {}

        const setupSubscription = async () => {
            unsubscribe = await subscribeToMessages(messageTopic, async (message: ForumMessage) => {
                // Only process messages for this specific thread
                if (message.threadId !== threadId) {
                    return
                }

                // Check if we've already processed this message
                if (processedMessages.current.has(message.id)) {
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
                                const updated = [...currentMessages]
                                updated[existingIndex] = messageWithContent
                                return updated
                            } else {
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
                                return [...currentMessages, messageWithoutContent]
                            }
                        })
                    
                    // Force update to ensure UI re-renders
                    setForceUpdate(prev => prev + 1)
                }
            })
        }
        
        setupSubscription()
        
        return () => {
            unsubscribe()
        }
    }, [messageTopic, threadId])


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
            return 'WALLET DISCONNECTED'
        }
        
        // Use the Waku status which includes peer count
        return wakuStatus
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
