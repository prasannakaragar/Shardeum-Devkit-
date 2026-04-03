import React, { useState } from 'react'
import { ethers } from 'ethers'
import { Search, ExternalLink, Activity, Loader, Trash2 } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

export default function TxMonitor() {
  const { provider, network, transactions, addLog, clearTransactions } = useShardeum()
  const [searchHash, setSearchHash] = useState('')
  const [txData, setTxData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const lookupTx = async () => {
    const hash = searchHash.trim()
    if (!hash) return
    if (!provider) {
      setError('Not connected to network. Check network status.')
      return
    }
    setLoading(true)
    setError(null)
    setTxData(null)
    try {
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(hash),
        provider.getTransactionReceipt(hash)
      ])
      if (!tx) throw new Error('Transaction not found on ' + network.name)
      setTxData({ tx, receipt })
      addLog(`Fetched TX: ${hash.slice(0, 14)}...`, 'success')
    } catch (e) {
      const msg = e.reason || e.message || 'Lookup failed'
      setError(msg)
      addLog(`TX lookup failed: ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (s) => s === 'confirmed' ? '#10b981' : s === 'pending' ? '#f59e0b' : '#ef4444'
  const statusBg = (s) => s === 'confirmed' ? 'rgba(16,185,129,0.1)' : s === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>TRANSACTION MONITOR</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Track and inspect transactions on {network.name}</p>
      </div>

      {/* Search */}
      <div className="cyber-card p-5">
        <div className="text-xs font-mono mb-3" style={{ color: '#00f5d4' }}>LOOKUP TRANSACTION</div>
        <div className="flex gap-3">
          <input
            value={searchHash}
            onChange={e => setSearchHash(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookupTx()}
            className="cyber-input rounded flex-1"
            style={{ borderRadius: '4px' }}
            placeholder="0x transaction hash..."
          />
          <button onClick={lookupTx} disabled={loading || !searchHash.trim()}
            className="cyber-btn-primary px-5 py-2 rounded flex items-center gap-2 text-sm"
            style={{ borderRadius: '4px', opacity: (loading || !searchHash.trim()) ? 0.7 : 1 }}>
            {loading ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded text-xs font-mono" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {txData && (
          <div className="mt-4 space-y-3">
            <div className="text-xs font-mono mb-2" style={{ color: '#10b981' }}>✓ TRANSACTION FOUND</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Hash', txData.tx.hash],
                ['From', txData.tx.from],
                ['To', txData.tx.to || 'Contract Creation'],
                ['Value', ethers.formatEther(txData.tx.value || 0n) + ' SHM'],
                ['Gas Limit', txData.tx.gasLimit?.toString()],
                ['Nonce', txData.tx.nonce?.toString()],
                ['Block', txData.receipt?.blockNumber?.toString() || 'Pending'],
                ['Gas Used', txData.receipt?.gasUsed?.toString() || '—'],
                ['Status', txData.receipt ? (txData.receipt.status === 1 ? '✓ Success' : '✗ Reverted') : 'Pending'],
                ['Block Hash', txData.receipt?.blockHash?.slice(0, 18) + '...' || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between p-2 rounded gap-2"
                  style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid #0d2d3d' }}>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: '#2d5a68' }}>{k}</span>
                  <span className="text-xs font-mono text-right break-all"
                    style={{ color: k === 'Status' ? (txData.receipt?.status === 1 ? '#10b981' : '#ef4444') : '#e2f4f1' }}>
                    {typeof v === 'string' && v.length > 20 ? v.slice(0, 20) + '...' : v}
                  </span>
                </div>
              ))}
            </div>
            <a
              href={`${network.explorerUrl}/tx/${txData.tx.hash}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-mono"
              style={{ color: '#00f5d4' }}
            >
              <ExternalLink size={13} />
              View on {network.name} Explorer
            </a>
          </div>
        )}
      </div>

      {/* Session transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>
              SESSION TRANSACTIONS ({transactions.length})
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#2d5a68' }}>
              <Activity size={12} />
              Persisted locally
            </div>
          </div>
          {transactions.length > 0 && (
            <button onClick={clearTransactions}
              className="flex items-center gap-1 text-xs font-mono"
              style={{ color: '#2d5a68', cursor: 'pointer', background: 'none', border: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#2d5a68'}>
              <Trash2 size={11} /> Clear all
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="cyber-card p-8 text-center">
            <Activity size={32} style={{ color: '#0d2d3d', margin: '0 auto 12px' }} />
            <div className="text-sm font-mono" style={{ color: '#2d5a68' }}>No transactions yet</div>
            <div className="text-xs font-mono mt-1" style={{ color: '#0d2d3d' }}>
              Deploy a contract or call functions to see transactions here
            </div>
          </div>
        ) : (
          <div className="cyber-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #0d2d3d' }}>
                  {['Hash', 'Type', 'Contract / Function', 'Status', 'Time', 'Explorer'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono" style={{ color: '#2d5a68' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(13,45,61,0.5)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,212,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#6b9aaa' }}>
                      {tx.hash ? tx.hash.slice(0, 12) + '...' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="tag text-xs" style={{ fontSize: '10px' }}>{tx.type || 'Call'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#e2f4f1' }}>
                      {tx.contract || tx.func || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{ background: statusBg(tx.status), color: statusColor(tx.status), border: `1px solid ${statusColor(tx.status)}30` }}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#2d5a68' }}>{tx.timestamp}</td>
                    <td className="px-4 py-3">
                      {tx.hash && (
                        <a href={`${network.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={12} style={{ color: '#2d5a68' }} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}