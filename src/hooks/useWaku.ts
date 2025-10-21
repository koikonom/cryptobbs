import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { wakuService } from '@/services/wakuService'

export function useWaku(topics: Record<string, any>) {
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

    // Initialize Waku node - keeping exact same logic flow
    useEffect(() => {
        if (account.status !== 'connected') {
            return
        }
        if (isInitializing.current) {
            console.log('   Already initializing, skipping...')
            return
        }
        if (wakuService.isReady()) {
            setIsConnected(true)
            setStatus('connected')
            return
        }
        
        isInitializing.current = true
        console.log('Initializing Waku...')
        
        const initWaku = async () => {
            try {
                await wakuService.initialize(topics)
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
            // The service will be reused across components
        }
    }, [account.status, topics])

    // Handle disconnect and reconnect during the same session - keeping exact same logic
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
