'use client'

import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Footer from '@/components/Footer'
import ChatContainer from '@/components/ChatContainer'

function ChatPage() {
    return (
        <div className="container">
            <Header />
            
            <div className="main-layout">
                <Sidebar />
                
                <main className="main-content">
                    <ChatContainer />
                </main>
            </div>
            
            <Footer />
        </div>
    )
}

export default ChatPage
