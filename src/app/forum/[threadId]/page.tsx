import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Footer from '@/components/Footer'
import ThreadView from '@/components/ThreadView'

interface ThreadPageProps {
    params: {
        threadId: string
    }
}

export default function ThreadPage({ params }: ThreadPageProps) {
    return (
        <div className="container">
            <Header />
            <div className="main-layout">
                <Sidebar />
                <main className="main-content">
                    <ThreadView threadId={params.threadId} />
                </main>
            </div>
            <Footer />
        </div>
    )
}
