import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code2, Rocket, Zap, Activity, ArrowRight, TrendingUp, Box, Layers } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

const ACTIONS = [
  { icon: Code2, label: 'Write Contract', desc: 'Solidity editor with syntax highlighting', path: '/editor', color: '#00f5d4' },
  { icon: Rocket, label: 'Deploy', desc: 'Compile & deploy to Shardeum', path: '/deploy', color: '#8b5cf6' },
  { icon: Zap, label: 'Interact', desc: 'Call contract functions', path: '/interact', color: '#f59e0b' },
  { icon: Activity, label: 'Monitor TXs', desc: 'Track transactions live', path: '/transactions', color: '#10b981' },
]

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="cyber-card p-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>{label}</div>
          <div className="text-2xl font-display font-bold" style={{ color }}>
            {value}
          </div>
          {sub && <div className="text-xs font-mono mt-1" style={{ color: '#6b9aaa' }}>{sub}</div>}
        </div>
        <div className="p-2 rounded" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function MiniChart({ data, color }) {
  const gradId = `grad-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#${gradId})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { walletAddress, balance, networkStatus, deployedContracts, transactions, network, logs } = useShardeum()
  const [blockData, setBlockData] = useState([])
  const [gasData, setGasData] = useState([])

  useEffect(() => {
    // Generate mock chart data
    setBlockData(Array.from({ length: 20 }, (_, i) => ({ v: Math.floor(Math.random() * 100 + 50 + i * 2) })))
    setGasData(Array.from({ length: 20 }, () => ({ v: Math.random() * 20 + 5 })))
  }, [])

  const errors = logs.filter(l => l.type === 'error').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold" style={{ color: '#00f5d4', textShadow: '0 0 20px rgba(0,245,212,0.3)' }}>
          SHARDEUM DEVKIT
        </h1>
        <p className="font-mono text-sm mt-1" style={{ color: '#6b9aaa' }}>
          Developer toolkit for the Shardeum network — build, test, deploy
        </p>
      </div>

      {/* Network banner */}
      <div className="cyber-card px-5 py-4" style={{
        background: networkStatus === 'online'
          ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(0,245,212,0.05))'
          : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(0,0,0,0.05))',
        borderColor: networkStatus === 'online' ? 'rgba(0,245,212,0.3)' : 'rgba(239,68,68,0.3)'
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`status-dot ${networkStatus === 'online' ? 'online' : networkStatus === 'checking' ? 'pending' : 'offline'}`} />
            <div>
              <span className="font-mono text-sm font-medium" style={{ color: networkStatus === 'online' ? '#10b981' : '#ef4444' }}>
                {networkStatus === 'online' ? 'Connected' : networkStatus === 'checking' ? 'Connecting...' : 'Disconnected'}
              </span>
              <span className="text-xs font-mono ml-3" style={{ color: '#6b9aaa' }}>{network.name} · {network.rpcUrl}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="tag">{parseInt(network.chainId, 16)}</span>
            <span className="tag">{network.symbol}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="WALLET BALANCE" value={walletAddress ? `${parseFloat(balance || 0).toFixed(4)}` : '—'} sub="SHM" color="#00f5d4" icon={TrendingUp} />
        <StatCard label="DEPLOYED CONTRACTS" value={deployedContracts.length} sub="on network" color="#8b5cf6" icon={Box} />
        <StatCard label="TRANSACTIONS" value={transactions.length} sub="this session" color="#f59e0b" icon={Layers} />
        <StatCard label="CONSOLE ERRORS" value={errors} sub="in logs" color={errors > 0 ? '#ef4444' : '#10b981'} icon={Activity} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="cyber-card p-5">
          <div className="text-xs font-mono mb-3" style={{ color: '#2d5a68' }}>BLOCK HEIGHT TREND</div>
          <MiniChart data={blockData} color="#00f5d4" />
        </div>
        <div className="cyber-card p-5">
          <div className="text-xs font-mono mb-3" style={{ color: '#2d5a68' }}>GAS PRICE (GWEI)</div>
          <MiniChart data={gasData} color="#8b5cf6" />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <div className="text-xs font-mono mb-3" style={{ color: '#2d5a68' }}>QUICK ACTIONS</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ACTIONS.map(({ icon: Icon, label, desc, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="cyber-card p-4 text-left transition-all duration-200 group"
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#0d2d3d'}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <ArrowRight size={14} style={{ color: '#2d5a68' }} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="font-body font-semibold text-sm" style={{ color: '#e2f4f1' }}>{label}</div>
              <div className="text-xs font-mono mt-1" style={{ color: '#2d5a68' }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent contracts */}
      {deployedContracts.length > 0 && (
        <div>
          <div className="text-xs font-mono mb-3" style={{ color: '#2d5a68' }}>RECENT DEPLOYMENTS</div>
          <div className="cyber-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #0d2d3d' }}>
                  {['Contract', 'Address', 'Network', 'Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono" style={{ color: '#2d5a68' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployedContracts.slice(0, 5).map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(13,45,61,0.5)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,212,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#00f5d4' }}>{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#6b9aaa' }}>{c.address.slice(0,10)}...{c.address.slice(-6)}</td>
                    <td className="px-4 py-3"><span className="tag text-xs">{c.network}</span></td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#2d5a68' }}>{c.deployedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallet prompt */}
      {!walletAddress && (
        <div className="cyber-card p-6 text-center" style={{ borderColor: 'rgba(0,245,212,0.2)' }}>
          <div className="text-sm font-mono" style={{ color: '#6b9aaa' }}>
            Connect your wallet to deploy contracts and sign transactions
          </div>
        </div>
      )}
    </div>
  )
}