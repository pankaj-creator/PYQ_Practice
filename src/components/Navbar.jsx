import React from 'react'

export default function Navbar({ onNavigate }) {
  return (
    <header className="nav">
      <div className="nav-left">
        <strong>NTPC PYQ Practice</strong>
      </div>
      <nav className="nav-right">
        <button className="btn link" onClick={() => onNavigate('home')}>Home</button>
        <button className="btn link" onClick={() => onNavigate('practice')}>Practice</button>
      </nav>
    </header>
  )
}
