'use client'

import { useAccount } from 'wagmi'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Footer from '@/components/Footer'
import { useCallback, useEffect, useState, useRef } from 'react'
import protobuf from 'protobufjs'
import { createLightNode, LightNode, Protocols, ReliableChannel } from '@waku/sdk';

type ChatMessage = {
    timestamp: number
    username: string
    message: string
}

// Define Protobuf schema for messages
const DataPacket = new protobuf.Type('ChatMessage')
.add(new protobuf.Field('timestamp', 1, 'uint64'))
.add(new protobuf.Field('username', 2, 'string'))
.add(new protobuf.Field('message', 3, 'string'));

function ChatPage() {
    const account = useAccount()
    const ct = "/cryptobbs/1/chat/proto";
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");
    const isInitializing = useRef(false);
    const isMounted = useRef(true);
    const wakuNodeRef = useRef<LightNode | null>(null);
    const channelRef = useRef<ReliableChannel<any> | null>(null);
    const seenMessages = useRef<Set<string>>(new Set());
    const MAX_MESSAGES = 1000;
    
    useEffect(() => {
        return () => {
            isMounted.current = false;
        }
    }, []);
    
    // Initialize Waku node
    useEffect( () => {
        if (account.status !== 'connected') {
            return;
        }
        if (isInitializing.current) {
            console.log('   Already initializing, skipping...');
            return;
        }
        isInitializing.current = true;
        console.log('Initializing Waku...');
        const initWaku = async () => {
            
            try {
                // Create a Light Node
                const wakuNode = await createLightNode({
                    defaultBootstrap: true,
                });
                await wakuNode.start();
                await wakuNode.waitForPeers([Protocols.LightPush, Protocols.Filter], 10000);
                console.log("connected?", wakuNode.isConnected());
                wakuNodeRef.current = wakuNode;
                
                // Subscribe to messages
                const decoder = wakuNode.createDecoder({contentTopic: ct});
                const encoder = wakuNode.createEncoder({ contentTopic: ct });
                const reliableChannel = await ReliableChannel.create(wakuNode, "test","anothertest", encoder, decoder);
                channelRef.current = reliableChannel;
                reliableChannel.addEventListener("message-received", async (event) => {
                    const wakuMessage = event.detail;
                    // Cleanup old messages if we exceed limit
                    if (seenMessages.current.size > MAX_MESSAGES) {
                        const oldHashes = Array.from(seenMessages.current).slice(0, seenMessages.current.size - MAX_MESSAGES);
                        oldHashes.forEach(hash => seenMessages.current.delete(hash));
                    }
                    
                    // decode your payload using the protobuf object previously created
                    const decodedMessage = DataPacket.decode(wakuMessage.payload) as any;
                    // Check if we've seen this message
                    const msgHash = await generateMessageHash(decodedMessage);
                    if (seenMessages.current.has(msgHash)) {
                        console.log('Duplicate message ignored:', msgHash);
                        return;
                    }
                    seenMessages.current.add(msgHash);                    
                    console.log(decodedMessage.timestamp, decodedMessage.sender, decodedMessage.message);
                    setMessages((msgs) => [...msgs, {
                        timestamp: decodedMessage.timestamp,
                        username: decodedMessage.username || 'Unknown',
                        message: decodedMessage.message
                    }]);
                    seenMessages.current.add(msgHash);
                    
                })
            } catch (error) {
                console.log("error while connecting to waku", error);
                isInitializing.current = false;
                cleanup();
            }
        }
        initWaku();
        return () => {
            cleanup();
        }
    }, [account.status]);
    
    // Handle disconnect and reconnect during the same session
    useEffect(() => {
        if (account.status === 'connected' && isInitializing.current) {
            isInitializing.current = false;
            return;
        }
        return () => {
            cleanup();
        }
    }, [account.status]);
    
    const cleanup = () => {
        console.log("cleaning up");
        if (channelRef.current) {
            channelRef.current.removeEventListener("message-received");
            channelRef.current.stop();
            channelRef.current = null;
        }
        
        // Stop the Waku node
        if (wakuNodeRef.current) {
            wakuNodeRef.current.stop();
            wakuNodeRef.current = null;
        }
        
        if (!isMounted.current) {
            isMounted.current = false;
        }
    };
    
    const generateMessageHash = async (message: ChatMessage): Promise<string> => {
        const content = `${message.timestamp}-${message.username}-${message.message}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };
    
    const sendMessage = useCallback(async () => {
        if (!channelRef.current || !text.trim() || !account.address) {
            console.log('Cannot send: node not ready or message empty');
            console.log("node", channelRef.current);
            console.log("text", text);
            console.log("username", account.address);
            return;
        }
        
        try {
            // Create the message object
            const chatMessage = {
                timestamp: Date.now(),
                username: account.address,
                message: text,
            };
            
            // Encode with Protobuf
            const protoMessage = DataPacket.create(chatMessage);
            const serializedMessage = DataPacket.encode(protoMessage).finish();
            const messageId = channelRef.current.send(serializedMessage);
            
            console.log('Message sent:', chatMessage, messageId);
            setText('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }, [channelRef.current, text, account.address]);
    
    return (
        <div className="container">
        <Header />
        
        <div className="main-layout">
        <Sidebar />
        
        <main className="main-content">
        <div className="chat-container">
        <div className="chat-header">
        <h2>REAL-TIME CHAT</h2>
        <div className="chat-status">
        STATUS: {account.status === 'connected' ? 'ONLINE' : 'OFFLINE'}
        </div>
        </div>
        
        <div className="chat-messages">
        <div className="message">
        <span className="timestamp">[12:34:56]</span>
        <span className="username">SYSTEM:</span>
        <span className="message-text">WELCOME TO CRYPTOBBS CHAT</span>
        </div>
        {account.status !== 'connected' && (
            <div className="message">
            <span className="timestamp">[12:35:12]</span>
            <span className="username">SYSTEM:</span>
            <span className="message-text">CONNECT YOUR WALLET TO PARTICIPATE</span>
            </div>
        )}
        {messages.map((message, index) => (
            <div key={index} className="chat-message">
            <span className="timestamp"> [{new Date(message.timestamp).toUTCString()}]</span>
            <span className="username">{message.username}:</span>
            <span className="message-text">{message.message}</span>
            </div>
        ))}
        </div>
        
        <div className="chat-input-area">
        {account.status === 'connected' ? (
            <div className="input-container">
            <input 
            type="text" 
            placeholder="TYPE YOUR MESSAGE HERE..."
            className="chat-input"
            disabled={account.status !== 'connected'}
            value={text}
            // onChange={handleInputChange}
            onChange={(e) => setText(e.target.value)}
            // onKeyPress={(e) => e.key === 'Enter' && sendMessage()}                    
            />
            <button className="btn btn-primary" disabled={account.status !== 'connected'} onClick={sendMessage} >
            SEND
            </button>
            </div>
        ) : (
            <div className="connect-prompt">
            <p>CONNECT YOUR WALLET TO START CHATTING</p>
            </div>
        )}
        </div>
        </div>
        </main>
        </div>
        
        <Footer />
        </div>
    )
}

export default ChatPage
