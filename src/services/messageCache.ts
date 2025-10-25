import { ForumMessage } from '@/hooks/useForum'

class MessageCache {
    private cache: Map<string, ForumMessage[]> = new Map()
    private contentCache: Map<string, string> = new Map()

    // Get messages for a thread
    getMessages(threadId: string): ForumMessage[] {
        return this.cache.get(threadId) || []
    }

    // Add or update a message
    addMessage(threadId: string, message: ForumMessage): void {
        const messages = this.getMessages(threadId)
        const existingIndex = messages.findIndex(m => m.id === message.id)
        
        if (existingIndex >= 0) {
            // Update existing message
            messages[existingIndex] = message
        } else {
            // Add new message
            messages.push(message)
        }
        
        this.cache.set(threadId, messages)
    }

    // Cache message content
    setContent(contentRef: string, content: string): void {
        this.contentCache.set(contentRef, content)
    }

    // Get cached content
    getContent(contentRef: string): string | undefined {
        return this.contentCache.get(contentRef)
    }

    // Check if content is cached
    hasContent(contentRef: string): boolean {
        return this.contentCache.has(contentRef)
    }

    // Clear cache for a specific thread
    clearThread(threadId: string): void {
        this.cache.delete(threadId)
    }

    // Clear all cache
    clear(): void {
        this.cache.clear()
        this.contentCache.clear()
    }

    // Get all cached thread IDs
    getCachedThreadIds(): string[] {
        return Array.from(this.cache.keys())
    }
}

// Export singleton instance
export const messageCache = new MessageCache()
