import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { wakuService } from '@/services/wakuService'
import { ThreadPacket, MessagePacket } from './useForum'
import protobuf from 'protobufjs'

export function useWaku() {
    const account = useAccount()
    const [isConnected, setIsConnected] = useState(false)
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
    const isInitializing = useRef(false)
    const isMounted = useRef(true)

    useEffect(() => {
        return () => {
            isMounted.current = false
        }
    }, [])

    // Initialize Waku node with all topics (forum and chat)
    useEffect(() => {
        if (account.status !== 'connected') {
            return
        }
        if (isInitializing.current) {
            return
        }
        if (wakuService.isReady()) {
            setIsConnected(true)
            setStatus('connected')
            return
        }
        
        isInitializing.current = true
        
        const initWaku = async () => {
            try {
                // Define ChatMessage schema
                const ChatPacket = new protobuf.Type('ChatMessage')
                    .add(new protobuf.Field('timestamp', 1, 'uint64'))
                    .add(new protobuf.Field('username', 2, 'string'))
                    .add(new protobuf.Field('message', 3, 'string'))
                
                await wakuService.initialize({
                    '/cryptobbs/1/forum/proto': ThreadPacket,
                    // '/cryptobbs/1/forum-message/proto': MessagePacket,
                    '/cryptobbs/1/chat/proto': ChatPacket
                })
                setIsConnected(true)
                setStatus('connected')
            } catch (error) {
                console.error("Error while connecting to waku", error)
                isInitializing.current = false
                await wakuService.cleanup()
            }
        }
        
        initWaku()
        return () => {
            // Don't cleanup here - let the service manage its own lifecycle
        }
    }, [account.status])

    // Handle disconnect and reconnect during the same session
    useEffect(() => {
        if (account.status === 'connected' && isInitializing.current) {
            isInitializing.current = false
            return
        }
        // Only cleanup when wallet disconnects, not when component unmounts
        if (account.status === 'disconnected') {
            return () => {
                wakuService.cleanup()
            }
        }
    }, [account.status])

    const sendMessage = async (topicName: string, message: any) => {
        if (!account.address) {
            throw new Error('No wallet connected')
        }

        if (!wakuService.isReady()) {
            throw new Error('Waku not connected')
        }

        // Check if this is a thread-specific topic that needs dynamic initialization
        if (topicName.startsWith('/cryptobbs/1/forum') && topicName.endsWith('/proto') && !topicName.includes('/cryptobbs/1/forum/proto')) {
            try {
                // Initialize the thread-specific topic with MessagePacket
                await wakuService.initializeTopic(topicName, MessagePacket)
                
                // Wait a bit to ensure the topic is fully ready
                await new Promise(resolve => setTimeout(resolve, 100))
            } catch (error) {
                console.error('Failed to initialize thread topic for sending:', error)
                throw error
            }
        }

        const messageWithMetadata = {
            timestamp: Date.now(),
            username: account.address,
            ...message
        }

        return wakuService.sendMessage(topicName, messageWithMetadata)
    }

    const subscribeToMessages = useCallback(async (topicName: string, handler: (message: any) => void) => {
        // If Waku is not ready, wait for it
        if (!wakuService.isReady()) {
            return () => {} // Return empty unsubscribe function
        }
        
        // Check if this is a thread-specific topic that needs dynamic initialization
        if (topicName.startsWith('/cryptobbs/1/forum') && topicName.endsWith('/proto') && !topicName.includes('/cryptobbs/1/forum/proto')) {
            try {
                // Initialize the thread-specific topic with MessagePacket
                await wakuService.initializeTopic(topicName, MessagePacket)
            } catch (error) {
                console.error('Failed to initialize thread topic:', error)
                return () => {} // Return empty unsubscribe function
            }
        }
        
        const unsubscribe = wakuService.onMessage(topicName, handler)
        return unsubscribe
    }, [])

    return {
        isConnected,
        status,
        sendMessage,
        subscribeToMessages,
        isReady: wakuService.isReady()
    }
}
