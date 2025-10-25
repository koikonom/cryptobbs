import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Footer from '@/components/Footer'
import ForumThreadList from '@/components/ForumThreadList'

export default function ForumPage() {
    return (
        <div className="container">
            <Header />
            <div className="main-layout">
                <Sidebar />
                <main className="main-content">
                    <ForumThreadList />
                </main>
            </div>
            <Footer />
        </div>
    )
}
