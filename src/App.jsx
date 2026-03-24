import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ShardeumProvider } from './contexts/ShardeumContext'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import ContractEditor from './pages/ContractEditor'
import Deployer from './pages/Deployer'
import ContractInteract from './pages/ContractInteract'
import TxMonitor from './pages/TxMonitor'
import NetworkMonitor from './pages/NetworkMonitor'
import LogConsole from './pages/LogConsole'
import WalletManager from './pages/WalletManager'
import Settings from './pages/Settings'

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--cyber-bg)' }}>
      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 245, 212, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 245, 212, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        zIndex: 0
      }} />

      {/* Glow orbs */}
      <div className="fixed pointer-events-none" style={{
        top: '-20%', left: '-10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(0,245,212,0.04) 0%, transparent 70%)',
        zIndex: 0
      }} />
      <div className="fixed pointer-events-none" style={{
        bottom: '-20%', right: '-10%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(6,184,151,0.04) 0%, transparent 70%)',
        zIndex: 0
      }} />

      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor" element={<ContractEditor />} />
            <Route path="/deploy" element={<Deployer />} />
            <Route path="/interact" element={<ContractInteract />} />
            <Route path="/transactions" element={<TxMonitor />} />
            <Route path="/network" element={<NetworkMonitor />} />
            <Route path="/logs" element={<LogConsole />} />
            <Route path="/wallet" element={<WalletManager />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ShardeumProvider>
        <AppLayout />
      </ShardeumProvider>
    </BrowserRouter>
  )
}
