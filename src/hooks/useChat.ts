import { useCallback, useEffect, useState } from 'react'
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
    const { isConnected, status, sendMessage: wakuSendMessage, subscribeToMessages } = useWaku()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [text, setText] = useState("")
    
    // Subscribe to messages from Waku service
    useEffect(() => {
        let unsubscribe = () => {}
        
        const setupSubscription = async () => {
            unsubscribe = await subscribeToMessages(chatTopic, (decodedMessage: any) => {
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
    }, [subscribeToMessages, chatTopic])
    
    const sendMessage = useCallback(async () => {
        if (!text.trim() || !account.address) {
            console.log('Cannot send: message empty or no wallet connected')
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
            return 'OFFLINE'
        } else if (status === 'connecting') {
            return 'CONNECTING...'
        } else if (status === 'connected') {
            return 'ONLINE'
        } else {
            return 'OFFLINE'
        }
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
