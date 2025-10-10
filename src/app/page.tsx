'use client'

import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Footer from '@/components/Footer'

function App() {
  return (
    <div className="container">
      <Header />

      <div className="main-layout">
        <Sidebar />

        <main className="main-content">
          <div className="content-area">
            <p>SELECT AN AREA TO BEGIN</p>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}

export default App
