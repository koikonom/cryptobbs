import { createLightNode, LightNode, Protocols, ReliableChannel } from '@waku/sdk'

export class WakuService {
    private node: LightNode | null = null
    private channels: Map<string, ReliableChannel<any>> = new Map()
    private isInitializing = false
    private isConnected = false
    private messageHandlers: Map<string, Set<(message: any) => void>> = new Map()
    private seenMessages = new Set<string>()
    private readonly MAX_MESSAGES = 1000
    private dataPackets: Map<string, any> = new Map()

    async initialize(topics: Record<string, any>): Promise<void> {
        if (this.isConnected) {
            console.log('Waku already connected, adding new topics...')
            // Add new topics to existing service
            await this.addTopics(topics)
            return
        }

        if (this.isInitializing) {
            console.log('Waku already initializing, waiting...')
            // Wait for initialization to complete, then add topics
            await this.waitForInitialization()
            await this.addTopics(topics)
            return
        }

        this.isInitializing = true
        this.dataPackets = new Map(Object.entries(topics))
        console.log('Initializing Waku...')

        try {
            // Create a Light Node - keeping exact same setup
            const wakuNode = await createLightNode({
                defaultBootstrap: true,
            })
            await wakuNode.start()
            await wakuNode.waitForPeers([Protocols.LightPush, Protocols.Filter], 10000)
            console.log("connected?", wakuNode.isConnected())
            this.node = wakuNode

            // Set up channels for each topic
            for (const [topicName, dataPacket] of Object.entries(topics)) {
                await this.setupChannel(topicName, dataPacket)
            }

            this.isConnected = true
            this.isInitializing = false

        } catch (error) {
            console.log("error while connecting to waku", error)
            this.isInitializing = false
            await this.cleanup()
            throw error
        }
    }

    private async waitForInitialization(): Promise<void> {
        // Wait for initialization to complete
        while (this.isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }

    async addTopics(topics: Record<string, any>): Promise<void> {
        if (!this.node) {
            throw new Error('Waku node not initialized')
        }

        for (const [topicName, dataPacket] of Object.entries(topics)) {
            if (!this.dataPackets.has(topicName)) {
                this.dataPackets.set(topicName, dataPacket)
                await this.setupChannel(topicName, dataPacket)
                console.log(`Added topic: ${topicName}`)
            }
        }
    }

    private async setupChannel(topicName: string, dataPacket: any): Promise<void> {
        if (!this.node) return

        // Skip if channel already exists
        if (this.channels.has(topicName)) {
            console.log(`Channel for topic ${topicName} already exists`)
            return
        }

        const decoder = this.node.createDecoder({ contentTopic: topicName })
        const encoder = this.node.createEncoder({ contentTopic: topicName })
        
        const channel = await ReliableChannel.create(
            this.node, 
            topicName, 
            "main", 
            encoder, 
            decoder
        )

        this.channels.set(topicName, channel)
        this.messageHandlers.set(topicName, new Set())

        channel.addEventListener("message-received", async (event: any) => {
            console.log(`Message received on topic ${topicName}:`, event.detail)
            await this.handleMessage(event, topicName, dataPacket)
        })
    }

    private async handleMessage(event: any, topicName: string, dataPacket: any): Promise<void> {
        const wakuMessage = event.detail
        
        // Cleanup old messages if we exceed limit
        if (this.seenMessages.size > this.MAX_MESSAGES) {
            const oldHashes = Array.from(this.seenMessages).slice(0, this.seenMessages.size - this.MAX_MESSAGES)
            oldHashes.forEach(hash => this.seenMessages.delete(hash))
        }
        
        try {
            // decode your payload using the protobuf object previously created
            const decodedMessage = dataPacket.decode(wakuMessage.payload) as any
            console.log(`Decoded message for topic ${topicName}:`, decodedMessage)
            
            // Check if we've seen this message
            const msgHash = await this.generateMessageHash(decodedMessage)
            if (this.seenMessages.has(msgHash)) {
                console.log('Message already seen, skipping:', msgHash)
                return
            }
            this.seenMessages.add(msgHash)
            
            // console.log(decodedMessage.timestamp, decodedMessage.sender, decodedMessage.message)
            
            // Pass through the decoded message as-is to let each hook handle its own format
            const message = decodedMessage
            
            // Notify all registered handlers for this topic
            const handlers = this.messageHandlers.get(topicName)
            console.log(`Notifying ${handlers?.size || 0} handlers for topic ${topicName}`)
            if (handlers) {
                handlers.forEach(handler => {
                    try {
                        console.log('Calling handler with message:', message)
                        handler(message)
                    } catch (error) {
                        console.error('Error in message handler:', error)
                    }
                })
            }
            
        } catch (error) {
            console.error('Error handling message:', error)
        }
    }

    private async generateMessageHash(message: any): Promise<string> {
        // Generate hash based on message type
        let content: string
        
        if (message.id && message.threadId) {
            // Forum message format
            content = `${message.id}-${message.threadId}-${message.createdAt}-${message.createdBy}`
        } else if (message.timestamp && message.username && message.message) {
            // Chat message format
            content = `${message.timestamp}-${message.username}-${message.message}`
        } else {
            // Fallback to JSON stringify
            content = JSON.stringify(message)
        }
        
        const encoder = new TextEncoder()
        const data = encoder.encode(content)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    async sendMessage(topicName: string, message: any): Promise<void> {
        console.log('sendMessage called for topic:', topicName)
        console.log('isConnected:', this.isConnected)
        console.log('channels.size:', this.channels.size)
        console.log('isReady():', this.isReady())
        console.log('Available channels:', Array.from(this.channels.keys()))
        console.log('Available dataPackets:', Array.from(this.dataPackets.keys()))
        
        const channel = this.channels.get(topicName)
        const dataPacket = this.dataPackets.get(topicName)
        
        console.log('Channel found:', !!channel)
        console.log('DataPacket found:', !!dataPacket)
        
        if (!channel || !dataPacket || !this.isReady()) {
            throw new Error(`Waku not connected or topic '${topicName}' not found`)
        }

        try {
            // Encode with Protobuf - keeping exact same setup
            const protoMessage = dataPacket.create(message)
            const serializedMessage = dataPacket.encode(protoMessage).finish()
            const messageId = channel.send(serializedMessage)
            
            console.log('Message sent:', message, messageId)
        } catch (error) {
            console.error('Failed to send message:', error)
            throw error
        }
    }

    // Subscribe to messages for a specific topic
    onMessage(topicName: string, handler: (message: any) => void): () => void {
        console.log(`onMessage called for topic: ${topicName}`)
        let handlers = this.messageHandlers.get(topicName)
        if (!handlers) {
            handlers = new Set()
            this.messageHandlers.set(topicName, handlers)
            console.log(`Created new handler set for topic: ${topicName}`)
        }
        handlers.add(handler)
        console.log(`Added handler for topic: ${topicName}, total handlers: ${handlers.size}`)
        
        // Return unsubscribe function
        return () => {
            console.log(`Unsubscribing from topic: ${topicName}`)
            const handlers = this.messageHandlers.get(topicName)
            if (handlers) {
                handlers.delete(handler)
                console.log(`Removed handler for topic: ${topicName}, remaining handlers: ${handlers.size}`)
            }
        }
    }

    // Initialize a single topic dynamically
    async initializeTopic(topicName: string, dataPacket: any): Promise<void> {
        if (!this.node) {
            throw new Error('Waku node not initialized')
        }
        
        // Check if topic is already initialized
        if (this.channels.has(topicName)) {
            console.log(`Topic ${topicName} already initialized`)
            return
        }
        
        console.log(`Initializing topic: ${topicName}`)
        
        // Store the dataPacket first
        this.dataPackets.set(topicName, dataPacket)
        
        // Then setup the channel
        await this.setupChannel(topicName, dataPacket)
        console.log(`Topic ${topicName} initialized successfully`)
    }

    // Get connection status
    getStatus(): 'disconnected' | 'connecting' | 'connected' {
        if (this.isInitializing) return 'connecting'
        if (this.isConnected && this.channels.size > 0) return 'connected'
        return 'disconnected'
    }

    // Check if service is ready
    isReady(): boolean {
        return this.isConnected && this.channels.size > 0
    }

    // Cleanup resources - keeping exact same cleanup logic
    async cleanup(): Promise<void> {
        console.log("cleaning up")
        
        // Clean up all channels
        this.channels.forEach((channel, topicName) => {
            channel.removeEventListener("message-received")
            channel.stop()
        })
        this.channels.clear()
        
        // Stop the Waku node
        if (this.node) {
            this.node.stop()
            this.node = null
        }
        
        this.isConnected = false
        this.isInitializing = false
        this.messageHandlers.clear()
        this.dataPackets.clear()
        this.seenMessages.clear()
    }
}

// Export singleton instance
export const wakuService = new WakuService()

