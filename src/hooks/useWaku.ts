import { useEffect, useRef, useState } from 'react'
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
        console.log('useWaku effect triggered, account status:', account.status)
        if (account.status !== 'connected') {
            console.log('Account not connected, skipping Waku initialization')
            return
        }
        if (isInitializing.current) {
            console.log('   Already initializing, skipping...')
            return
        }
        if (wakuService.isReady()) {
            console.log('Waku service already ready')
            setIsConnected(true)
            setStatus('connected')
            return
        }
        
        isInitializing.current = true
        console.log('Initializing Waku with all topics...')
        
        const initWaku = async () => {
            try {
                // Define ChatMessage schema
                const ChatPacket = new protobuf.Type('ChatMessage')
                    .add(new protobuf.Field('timestamp', 1, 'uint64'))
                    .add(new protobuf.Field('username', 2, 'string'))
                    .add(new protobuf.Field('message', 3, 'string'))
                
                await wakuService.initialize({
                    '/cryptobbs/1/forum/proto': ThreadPacket,
                    '/cryptobbs/1/forum-message/proto': MessagePacket,
                    '/cryptobbs/1/chat/proto': ChatPacket
                })
                console.log('Waku initialization successful')
                setIsConnected(true)
                setStatus('connected')
            } catch (error) {
                console.log("error while connecting to waku", error)
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

        const messageWithMetadata = {
            timestamp: Date.now(),
            username: account.address,
            ...message
        }

        return wakuService.sendMessage(topicName, messageWithMetadata)
    }

    const subscribeToMessages = (topicName: string, handler: (message: any) => void) => {
        console.log(`Subscribing to messages on topic: ${topicName}`)
        return wakuService.onMessage(topicName, handler)
    }

    return {
        isConnected,
        status,
        sendMessage,
        subscribeToMessages,
        isReady: wakuService.isReady()
    }
}
