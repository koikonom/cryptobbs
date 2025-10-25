'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForum } from '@/hooks/useForum'

console.log('ForumThreadList component file loaded')

export default function ForumThreadList() {
    console.log('ForumThreadList component rendering')
    const { threads, createThread, status, isConnected } = useForum()
    console.log('useForum hook result:', { threads: threads.length, status, isConnected })
    const router = useRouter()
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        content: '',
        subject: ''
    })

    const handleCreateThread = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.content.trim()) return

        try {
            setIsCreating(true)
            const threadId = await createThread(
                formData.name.trim(),
                formData.content.trim(),
                formData.subject.trim() || undefined
            )
            
            // Reset form and close modal
            setFormData({ name: '', content: '', subject: '' })
            setShowCreateForm(false)
            
            // Navigate to the new thread
            router.push(`/forum/${threadId}`)
        } catch (error) {
            console.error('Failed to create thread:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to create thread. Please try again.'
            alert(errorMessage)
        } finally {
            setIsCreating(false)
        }
    }

    const formatAddress = (address: string | undefined) => {
        if (!address) return 'Unknown'
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString()
    }

    console.log('ForumThreadList rendering with threads:', threads.length)
    return (
        <div className="forum-container">
            <div className="forum-header">
                <h2>FORUM THREADS</h2>
                <div className="forum-status">
                    STATUS: {status}
                </div>
            </div>
            
            <div className="forum-controls">
                {isConnected ? (
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowCreateForm(true)}
                    >
                        CREATE NEW THREAD
                    </button>
                ) : (
                    <div className="connect-prompt">
                        <p>CONNECT YOUR WALLET TO CREATE THREADS</p>
                    </div>
                )}
            </div>

            {showCreateForm && (
                <div className="create-thread-modal">
                    <div className="create-thread-form">
                        <h3>CREATE NEW THREAD</h3>
                        <form onSubmit={handleCreateThread}>
                            <div className="form-group">
                                <label>THREAD NAME:</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="ENTER THREAD NAME..."
                                    maxLength={100}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>SUBJECT (OPTIONAL):</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                    placeholder="ENTER SUBJECT..."
                                    maxLength={256}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>FIRST MESSAGE:</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="ENTER YOUR MESSAGE..."
                                    rows={4}
                                    required
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    CANCEL
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={isCreating}
                                >
                                    {isCreating ? 'CREATING...' : 'CREATE THREAD'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="thread-list">
                {threads.length === 0 ? (
                    <div className="no-threads">
                        <p>NO THREADS YET. BE THE FIRST TO START A DISCUSSION!</p>
                    </div>
                ) : (
                    threads.map((thread) => (
                        <div 
                            key={thread.id} 
                            className="thread-item"
                            onClick={() => router.push(`/forum/${thread.id}`)}
                        >
                            <div className="thread-header">
                                <h3>{thread.name}</h3>
                                <span className="thread-meta">
                                    BY: {formatAddress(thread.createdBy)}
                                </span>
                            </div>
                            <div className="thread-footer">
                                <span className="thread-date">
                                    UPDATED: {formatTimestamp(thread.updatedAt)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
