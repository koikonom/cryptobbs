import { ForumThread } from '@/hooks/useForum'

class ThreadCache {
    private cache: ForumThread[] = []

    // Get all threads
    getThreads(): ForumThread[] {
        return [...this.cache]
    }

    // Add or update a thread
    addThread(thread: ForumThread): void {
        const existingIndex = this.cache.findIndex(t => t.id === thread.id)
        
        if (existingIndex >= 0) {
            // Update existing thread
            this.cache[existingIndex] = thread
        } else {
            // Add new thread
            this.cache.push(thread)
        }
    }

    // Get a specific thread by ID
    getThread(threadId: string): ForumThread | undefined {
        return this.cache.find(t => t.id === threadId)
    }

    // Clear all threads
    clear(): void {
        this.cache = []
    }

    // Sort threads by most recently updated
    getSortedThreads(): ForumThread[] {
        return [...this.cache].sort((a, b) => b.updatedAt - a.updatedAt)
    }
}

// Export singleton instance
export const threadCache = new ThreadCache()
