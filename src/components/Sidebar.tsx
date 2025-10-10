'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="sidebar">
      <div className="nav-section">
        <h3>AREAS</h3>
        <ul className="nav-menu">
          <li>
            <Link 
              href="/" 
              className={`nav-link ${pathname === '/' ? 'active' : ''}`}
            >
              NEWS
            </Link>
          </li>
          <li>
            <Link 
              href="/chat" 
              className={`nav-link ${pathname === '/chat' ? 'active' : ''}`}
            >
              CHAT
            </Link>
          </li>
          <li>
            <Link 
              href="/files" 
              className={`nav-link ${pathname === '/files' ? 'active' : ''}`}
            >
              FILES
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Sidebar
