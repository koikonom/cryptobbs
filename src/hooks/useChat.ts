import { useCallback, useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useWaku } from './useWaku'

export type ChatMessage = {
    timestamp: number
    username: string
    message: string
}

export function useChat() {
    const account = useAccount()
    const chatTopic = "/cryptobbs/1/chat/proto"
    const { isConnected, status: wakuStatus, peerCount, sendMessage: wakuSendMessage, subscribeToMessages } = useWaku()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [text, setText] = useState("")
    const processedMessages = useRef<Set<string>>(new Set())
    
    // Subscribe to messages from Waku service
    useEffect(() => {
        let unsubscribe = () => {}
        
        const setupSubscription = async () => {
            unsubscribe = await subscribeToMessages(chatTopic, (decodedMessage: any) => {
                // Generate a unique key for this message to prevent duplicates
                const messageKey = `${decodedMessage.timestamp}-${decodedMessage.username}-${decodedMessage.message}`
                
                // Check if we've already processed this message
                if (processedMessages.current.has(messageKey)) {
                    return
                }
                processedMessages.current.add(messageKey)
                
                // Transform the decoded message to ChatMessage format
                const message: ChatMessage = {
                    timestamp: decodedMessage.timestamp,
                    username: decodedMessage.username || 'Unknown',
                    message: decodedMessage.message
                }
                setMessages((msgs) => [...msgs, message])
            })
        }
        
        setupSubscription()
        
        return () => {
            unsubscribe()
        }
    }, [chatTopic, isConnected])
    
    // Cleanup processed messages set when component unmounts
    useEffect(() => {
        return () => {
            processedMessages.current.clear()
        }
    }, [])
    
    const sendMessage = useCallback(async () => {
        if (!text.trim() || !account.address) {
            return
        }
        
        try {
            await wakuSendMessage(chatTopic, { message: text })
            setText('')
        } catch (error) {
            console.error('Failed to send message:', error)
        }
    }, [text, account.address, wakuSendMessage, chatTopic])

    const getStatusText = () => {
        if (account.status !== 'connected') {
            return 'WALLET DISCONNECTED'
        }
        
        // Use the Waku status which includes peer count
        return wakuStatus
    }

    return {
        messages,
        text,
        setText,
        status: getStatusText(),
        sendMessage,
        isConnected: account.status === 'connected'
    }
}
