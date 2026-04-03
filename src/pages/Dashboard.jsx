import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code2, Rocket, Zap, Activity, ArrowRight, TrendingUp, Box, Layers, Trash2 } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { ethers } from 'ethers'

const ACTIONS = [
  { icon: Code2, label: 'Write Contract', desc: 'Solidity editor with templates', path: '/editor', color: '#00f5d4' },
  { icon: Rocket, label: 'Deploy', desc: 'Compile & deploy to Shardeum', path: '/deploy', color: '#8b5cf6' },
  { icon: Zap, label: 'Interact', desc: 'Call contract functions', path: '/interact', color: '#f59e0b' },
  { icon: Activity, label: 'Monitor TXs', desc: 'Track transactions live', path: '/transactions', color: '#10b981' },
]

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="cyber-card p-5">
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

function MiniChart({ data, color, dataKey = 'v' }) {
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
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${gradId})`} strokeWidth={1.5} dot={false} />
        <Tooltip
          contentStyle={{ background: '#061520', border: '1px solid #0d2d3d', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
          labelStyle={{ display: 'none' }}
          itemStyle={{ color }}
          formatter={(v) => [typeof v === 'number' ? v.toFixed(2) : v, '']}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    walletAddress, balance, networkStatus, deployedContracts, transactions,
    network, logs, provider, clearDeployedContracts, clearTransactions
  } = useShardeum()

  const [blockData, setBlockData] = useState([])
  const [gasData, setGasData] = useState([])
  const [latestBlock, setLatestBlock] = useState(null)

  const fetchLiveData = useCallback(async () => {
    if (!provider) return
    try {
      const [blockNumber, feeData] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData()
      ])
      const gasGwei = feeData.gasPrice
        ? parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei'))
        : 0

      setLatestBlock(blockNumber)

      setBlockData(prev => {
        const next = [...prev, { v: blockNumber, label: blockNumber }]
        return next.slice(-20)
      })

      setGasData(prev => {
        const next = [...prev, { v: parseFloat(gasGwei.toFixed(3)) }]
        return next.slice(-20)
      })
    } catch {
      // Network not reachable — skip silently
    }
  }, [provider])

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 6000)
    return () => clearInterval(interval)
  }, [fetchLiveData])

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
          : networkStatus === 'checking'
          ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(0,0,0,0.05))'
          : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(0,0,0,0.05))',
        borderColor: networkStatus === 'online'
          ? 'rgba(0,245,212,0.3)'
          : networkStatus === 'checking'
          ? 'rgba(245,158,11,0.3)'
          : 'rgba(239,68,68,0.3)'
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`status-dot ${networkStatus === 'online' ? 'online' : networkStatus === 'checking' ? 'pending' : 'offline'}`} />
            <div>
              <span className="font-mono text-sm font-medium" style={{
                color: networkStatus === 'online' ? '#10b981' : networkStatus === 'checking' ? '#f59e0b' : '#ef4444'
              }}>
                {networkStatus === 'online' ? 'Connected' : networkStatus === 'checking' ? 'Connecting...' : 'Disconnected'}
              </span>
              <span className="text-xs font-mono ml-3" style={{ color: '#6b9aaa' }}>
                {network.name} · {network.rpcUrl}
              </span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {latestBlock && (
              <span className="text-xs font-mono" style={{ color: '#2d5a68' }}>
                Block #{latestBlock.toLocaleString()}
              </span>
            )}
            <span className="tag">{parseInt(network.chainId, 16)}</span>
            <span className="tag">{network.symbol}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="WALLET BALANCE" value={walletAddress ? `${parseFloat(balance || 0).toFixed(4)}` : '—'} sub="SHM" color="#00f5d4" icon={TrendingUp} />
        <StatCard label="DEPLOYED CONTRACTS" value={deployedContracts.length} sub="saved locally" color="#8b5cf6" icon={Box} />
        <StatCard label="TRANSACTIONS" value={transactions.length} sub="saved locally" color="#f59e0b" icon={Layers} />
        <StatCard label="CONSOLE ERRORS" value={errors} sub="in logs" color={errors > 0 ? '#ef4444' : '#10b981'} icon={Activity} />
      </div>

      {/* Charts row — live data */}
      <div className="grid grid-cols-2 gap-4">
        <div className="cyber-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>BLOCK HEIGHT (LIVE)</div>
            {blockData.length === 0 && (
              <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>waiting for data...</div>
            )}
          </div>
          {blockData.length > 0
            ? <MiniChart data={blockData} color="#00f5d4" dataKey="v" />
            : <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-xs font-mono" style={{ color: '#0d2d3d' }}>—</span>
              </div>
          }
        </div>
        <div className="cyber-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>GAS PRICE GWEI (LIVE)</div>
            {gasData.length === 0 && (
              <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>waiting for data...</div>
            )}
          </div>
          {gasData.length > 0
            ? <MiniChart data={gasData} color="#8b5cf6" dataKey="v" />
            : <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-xs font-mono" style={{ color: '#0d2d3d' }}>—</span>
              </div>
          }
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
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>RECENT DEPLOYMENTS</div>
            <button onClick={clearDeployedContracts}
              className="flex items-center gap-1 text-xs font-mono"
              style={{ color: '#2d5a68', cursor: 'pointer', background: 'none', border: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#2d5a68'}>
              <Trash2 size={11} /> Clear
            </button>
          </div>
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
                {deployedContracts.slice(0, 8).map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(13,45,61,0.5)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,212,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#00f5d4' }}>{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#6b9aaa' }}>
                      <a
                        href={`${network.explorerUrl}/address/${c.address}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: '#6b9aaa', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#00f5d4'}
                        onMouseLeave={e => e.currentTarget.style.color = '#6b9aaa'}
                      >
                        {c.address.slice(0, 10)}...{c.address.slice(-6)}
                      </a>
                    </td>
                    <td className="px-4 py-3"><span className="tag text-xs">{c.network}</span></td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#2d5a68' }}>{c.deployedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>RECENT TRANSACTIONS</div>
            <button onClick={clearTransactions}
              className="flex items-center gap-1 text-xs font-mono"
              style={{ color: '#2d5a68', cursor: 'pointer', background: 'none', border: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#2d5a68'}>
              <Trash2 size={11} /> Clear
            </button>
          </div>
          <div className="cyber-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #0d2d3d' }}>
                  {['Hash', 'Type', 'Status', 'Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono" style={{ color: '#2d5a68' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(13,45,61,0.5)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,212,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#6b9aaa' }}>
                      {tx.hash ? (
                        <a href={`${network.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#6b9aaa', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#00f5d4'}
                          onMouseLeave={e => e.currentTarget.style.color = '#6b9aaa'}>
                          {tx.hash.slice(0, 12)}...
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><span className="tag text-xs">{tx.type || 'Call'}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono" style={{
                        color: tx.status === 'confirmed' ? '#10b981' : tx.status === 'pending' ? '#f59e0b' : '#ef4444'
                      }}>{tx.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#2d5a68' }}>{tx.timestamp}</td>
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