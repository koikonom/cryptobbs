'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useWaku } from '@/hooks/useWaku'

function Header() {
  const account = useAccount()
  const { disconnect } = useDisconnect()
  const { status: wakuStatus } = useWaku()

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
    if (account.status !== 'connected') {
      return '[CONNECT WALLET]'
    }
    return `[${wakuStatus}]`
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
