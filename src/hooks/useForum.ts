import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useWaku } from './useWaku'
import { swarmService } from '@/services/swarmService'
import { threadCache } from '@/services/threadCache'
import protobuf from 'protobufjs'

// Forum domain types
export type ForumThread = {
    id: string
    name: string
    createdAt: number
    updatedAt: number
    createdBy: string
}

export type ForumMessage = {
    id: string
    threadId: string
    createdAt: number
    createdBy: string
    inReplyTo: string | null
    subject?: string
    contentRef: string
    content?: string // Populated when content is fetched from Swarm
}

// Protobuf schemas
const ThreadPacket = new protobuf.Type('ThreadPacket')
    .add(new protobuf.Field('id', 1, 'string'))
    .add(new protobuf.Field('name', 2, 'string'))
    .add(new protobuf.Field('createdAt', 3, 'uint64'))
    .add(new protobuf.Field('updatedAt', 4, 'uint64'))
    .add(new protobuf.Field('createdBy', 5, 'string'))

const MessagePacket = new protobuf.Type('MessagePacket')
    .add(new protobuf.Field('id', 1, 'string'))
    .add(new protobuf.Field('threadId', 2, 'string'))
    .add(new protobuf.Field('createdAt', 3, 'uint64'))
    .add(new protobuf.Field('createdBy', 4, 'string'))
    .add(new protobuf.Field('inReplyTo', 5, 'string'))
    .add(new protobuf.Field('subject', 6, 'string'))
    .add(new protobuf.Field('contentRef', 7, 'string'))

// Export MessagePacket and ThreadPacket for use in other hooks
export { MessagePacket, ThreadPacket }

export function useForum() {
    const account = useAccount()
    const forumTopic = "/cryptobbs/1/forum/proto"
    const { isConnected, status, sendMessage: wakuSendMessage, subscribeToMessages } = useWaku()
    const [threads, setThreads] = useState<ForumThread[]>(() => {
        const cachedThreads = threadCache.getSortedThreads()
        return cachedThreads
    })
    
    // Subscribe to thread updates from Waku
    useEffect(() => {
        let unsubscribe = () => {}

        const setupSubscription = async () => {
            unsubscribe = await subscribeToMessages(forumTopic, (thread: ForumThread) => {
                // Update cache
                threadCache.addThread(thread)

                setThreads((currentThreads) => {
                    // Update existing thread or add new one
                    const existingIndex = currentThreads.findIndex(t => t.id === thread.id)
                    if (existingIndex >= 0) {
                        const updated = [...currentThreads]
                        updated[existingIndex] = thread
                        return updated
                    } else {
                        return [...currentThreads, thread]
                    }
                })
            })
        }

        setupSubscription()

        return () => {
            unsubscribe()
        }
    }, [subscribeToMessages, forumTopic])
    
    
    const createThread = useCallback(async (name: string, firstMessageContent: string, subject?: string) => {
        if (!account.address) {
            throw new Error('No wallet connected')
        }

        if (!isConnected) {
            throw new Error('Waku not connected. Please wait for connection.')
        }

        try {
            // Generate IDs
            const threadId = crypto.randomUUID()
            const messageId = crypto.randomUUID()
            const now = Date.now()

            // Upload first message content to Swarm
            const contentRef = await swarmService.uploadData(firstMessageContent)

            // Create thread metadata
            const thread: ForumThread = {
                id: threadId,
                name,
                createdAt: now,
                updatedAt: now,
                createdBy: account.address
            }

            // Create first message metadata
            const firstMessage: ForumMessage = {
                id: messageId,
                threadId,
                createdAt: now,
                createdBy: account.address,
                inReplyTo: null,
                subject,
                contentRef
            }

            // Publish thread metadata via Waku
            await wakuSendMessage(forumTopic, thread)

            // Add to cache immediately for instant UI update
            threadCache.addThread(thread)
            setThreads(prev => {
                const existingIndex = prev.findIndex(t => t.id === thread.id)
                if (existingIndex >= 0) {
                    const updated = [...prev]
                    updated[existingIndex] = thread
                    return updated
                } else {
                    return [...prev, thread]
                }
            })

            // Note: First message will be posted when user navigates to the thread
            
            return threadId
        } catch (error) {
            console.error('Failed to create thread:', error)
            throw error
        }
    }, [account.address, wakuSendMessage, forumTopic, isConnected])

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

    // Sort threads by most recently updated first
    const sortedThreads = threads.sort((a, b) => b.updatedAt - a.updatedAt)

    return {
        threads: sortedThreads,
        createThread,
        status: getStatusText(),
        isConnected: account.status === 'connected'
    }
}
