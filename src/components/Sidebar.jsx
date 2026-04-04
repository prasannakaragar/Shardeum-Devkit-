import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Code2, Rocket, Zap, Activity,
  Network, Terminal, Wallet, Settings, ChevronLeft,
  ChevronRight, HelpCircle
} from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/editor', icon: Code2, label: 'Contract Editor' },
  { path: '/deploy', icon: Rocket, label: 'Deploy' },
  { path: '/interact', icon: Zap, label: 'Interact' },
  { path: '/transactions', icon: Activity, label: 'Transactions' },
  { path: '/network', icon: Network, label: 'Network Monitor' },
  { path: '/logs', icon: Terminal, label: 'Console' },
  { path: '/wallet', icon: Wallet, label: 'Wallet' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/help', icon: HelpCircle, label: 'Help Guide', highlight: true },
]

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { networkStatus, network } = useShardeum()

  return (
    <div
      className="flex flex-col relative z-20 transition-all duration-300"
      style={{
        width: collapsed ? '60px' : '220px',
        background: 'linear-gradient(180deg, #061520 0%, #03100d 100%)',
        borderRight: '1px solid #0d2d3d',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-cyber-border">
        <div className="relative flex-shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <polygon points="16,2 30,9 30,23 16,30 2,23 2,9"
              fill="none" stroke="#00f5d4" strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 0 4px #00f5d4)' }} />
            <polygon points="16,7 25,12 25,20 16,25 7,20 7,12"
              fill="rgba(0,245,212,0.15)" stroke="#00f5d4" strokeWidth="0.5" />
            <circle cx="16" cy="16" r="3" fill="#00f5d4"
              style={{ filter: 'drop-shadow(0 0 4px #00f5d4)' }} />
          </svg>
        </div>
        {!collapsed && (
          <div className="ml-3">
            <div className="font-display text-sm font-bold tracking-wider" style={{ color: '#00f5d4', textShadow: '0 0 8px rgba(0,245,212,0.5)' }}>
              SHARDEUM
            </div>
            <div className="font-mono text-xs" style={{ color: '#2d5a68' }}>DEV KIT</div>
          </div>
        )}
      </div>

      {/* Network indicator */}
      {!collapsed && (
        <div className="mx-3 my-3 px-3 py-2 rounded" style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.1)' }}>
          <div className="flex items-center gap-2">
            <span className={`status-dot ${networkStatus === 'online' ? 'online' : networkStatus === 'checking' ? 'pending' : 'offline'}`} />
            <span className="text-xs font-mono truncate" style={{ color: '#6b9aaa' }}>
              {network.name.split(' ')[1] || network.name}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label, highlight }) => {
          const active = location.pathname === path
          return (
            <div
              key={path}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(path)}
              title={collapsed ? label : ''}
              style={highlight ? {
                marginTop: '6px',
                borderTop: '1px solid #0d2d3d',
                paddingTop: '12px',
                color: active ? '#00f5d4' : '#f59e0b',
                borderLeft: active ? '2px solid #00f5d4' : '2px solid transparent',
              } : {}}
            >
              <Icon size={16} style={{ flexShrink: 0, color: highlight && !active ? '#f59e0b' : undefined }} />
              {!collapsed && (
                <span className="font-body font-medium" style={{ color: highlight && !active ? '#f59e0b' : undefined }}>
                  {label}
                </span>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center p-3 border-t border-cyber-border transition-colors"
        style={{ color: '#2d5a68', background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.color = '#00f5d4'}
        onMouseLeave={e => e.currentTarget.style.color = '#2d5a68'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  )
}
