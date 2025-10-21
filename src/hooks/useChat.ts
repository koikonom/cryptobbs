import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useWaku } from './useWaku'
import protobuf from 'protobufjs'

export type ChatMessage = {
    timestamp: number
    username: string
    message: string
}

// Define Protobuf schema for messages - keeping exact same setup
const DataPacket = new protobuf.Type('ChatMessage')
    .add(new protobuf.Field('timestamp', 1, 'uint64'))
    .add(new protobuf.Field('username', 2, 'string'))
    .add(new protobuf.Field('message', 3, 'string'))

export function useChat() {
    const account = useAccount()
    const chatTopic = "/cryptobbs/1/chat/proto"
    const { isConnected, status, sendMessage: wakuSendMessage, subscribeToMessages } = useWaku({ [chatTopic]: DataPacket })
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [text, setText] = useState("")
    
    // Subscribe to messages from Waku service
    useEffect(() => {
        const unsubscribe = subscribeToMessages(chatTopic, (message: ChatMessage) => {
            setMessages((msgs) => [...msgs, message])
        })
        
        return unsubscribe
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
