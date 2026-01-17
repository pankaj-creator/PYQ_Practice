import React, { useState } from 'react'
import Home from './pages/Home'
import Practice from './pages/Practice'
import Navbar from './components/Navbar'

export default function App() {
  const [route, setRoute] = useState('home')

  return (
    <div className="app-root">
      <Navbar onNavigate={(r) => setRoute(r)} />
      <main className="container">
        {route === 'home' && <Home onStart={() => setRoute('practice')} />}
        {route === 'practice' && <Practice onDone={() => setRoute('home')} />}
      </main>
    </div>
  )
}
