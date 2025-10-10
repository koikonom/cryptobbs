'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()

  const getStatusClass = () => {
    switch (account.status) {
      case 'connected':
        return 'status-connected'
      case 'connecting':
        return 'status-pending'
      default:
        return 'status-disconnected'
    }
  }

  const getStatusText = () => {
    switch (account.status) {
      case 'connected':
        return '[ONLINE]'
      case 'connecting':
        return '[CONNECTING...]'
      default:
        return '[OFFLINE]'
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>*** CRYPTOBBS ***</h1>
            <p>DECENTRALIZED BULLETIN BOARD SYSTEM</p>
            <p>WELCOME TO THE MATRIX</p>
          </div>
          <div className="header-right">
            <div className="card ascii-border wallet-connection">
              <h2>WALLET</h2>
              <div className={`status-indicator ${getStatusClass()}`}>
                {getStatusText()}
              </div>
              
              <div style={{ margin: '1rem 0' }}>
                <ConnectButton showBalance={false} />
              </div>

              {account.status === 'connected' && (
                <button 
                  type="button" 
                  onClick={() => disconnect()}
                  className="btn btn-danger"
                >
                  DISCONNECT
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
      </main>

      <footer className="footer">
        <p>BUILT WITH NEXT.JS, WAGMI, AND WEB3 TECHNOLOGIES</p>
        <p>SYSTEM READY - AWAITING CONNECTION</p>
      </footer>
    </div>
  )
}

export default App
