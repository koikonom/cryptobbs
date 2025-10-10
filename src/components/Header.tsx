'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

function Header() {
  const account = useAccount()
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
            <div className="status-container">
              <div className={`status-indicator ${getStatusClass()}`}>
                {getStatusText()}
              </div>
              {account.status === 'connected' && (
                <button 
                  type="button" 
                  onClick={() => disconnect()}
                  className="btn btn-danger disconnect-btn"
                >
                  DISCONNECT
                </button>
              )}
            </div>
            
            <div style={{ margin: '1rem 0' }}>
              <ConnectButton showBalance={false} />
            </div>
            

          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
