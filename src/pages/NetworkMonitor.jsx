import React, { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { RefreshCw, Loader } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useShardeum } from '../contexts/ShardeumContext'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#061520', border: '1px solid #0d2d3d', padding: '8px 12px', borderRadius: '4px' }}>
        <p style={{ color: '#6b9aaa', fontSize: '11px', fontFamily: 'monospace' }}>{label}</p>
        <p style={{ color: '#00f5d4', fontSize: '12px', fontFamily: 'monospace' }}>{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function NetworkMonitor() {
  const { provider, network, networkStatus, refreshNetwork } = useShardeum()
  const [networkInfo, setNetworkInfo] = useState(null)
  const [blockHistory, setBlockHistory] = useState([])
  const [gasHistory, setGasHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchNetworkData = useCallback(async () => {
    if (!provider) return
    setLoading(true)
    try {
      const [blockNumber, feeData, netInfo] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
        provider.getNetwork()
      ])
      const block = await provider.getBlock(blockNumber)

      setNetworkInfo({
        blockNumber,
        chainId: netInfo.chainId.toString(),
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '—',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : '—',
        blockTime: block ? new Date(block.timestamp * 1000).toLocaleTimeString() : '—',
        txCount: block?.transactions?.length || 0,
      })

      setBlockHistory(prev => {
        const next = [...prev, { block: blockNumber, txs: block?.transactions?.length || 0 }]
        return next.slice(-20)
      })

      setGasHistory(prev => {
        const gasGwei = feeData.gasPrice ? parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')) : 0
        const next = [...prev, { t: new Date().toLocaleTimeString(), gas: parseFloat(gasGwei.toFixed(2)) }]
        return next.slice(-20)
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    fetchNetworkData()
    const interval = setInterval(fetchNetworkData, 5000)
    return () => clearInterval(interval)
  }, [fetchNetworkData])

  const STATS = networkInfo ? [
    { label: 'BLOCK NUMBER', value: networkInfo.blockNumber.toLocaleString(), color: '#00f5d4' },
    { label: 'CHAIN ID', value: networkInfo.chainId, color: '#8b5cf6' },
    { label: 'GAS PRICE', value: `${parseFloat(networkInfo.gasPrice).toFixed(2)} Gwei`, color: '#f59e0b' },
    { label: 'TX IN BLOCK', value: networkInfo.txCount, color: '#10b981' },
  ] : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>NETWORK MONITOR</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Live metrics for {network.name}</p>
        </div>
        <button onClick={() => { refreshNetwork(); fetchNetworkData() }}
          className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3" style={{ borderRadius: '4px' }}>
          {loading ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh
        </button>
      </div>

      {/* Network info banner */}
      <div className="cyber-card p-4">
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {[
            ['RPC Endpoint', network.rpcUrl],
            ['Explorer', network.explorerUrl],
            ['Symbol', network.symbol],
            ['Status', networkStatus],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span style={{ color: '#2d5a68' }}>{k}:</span>
              <span style={{ color: networkStatus === 'Status' && v === 'online' ? '#10b981' : '#e2f4f1' }} className="truncate">
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {STATS.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {STATS.map(({ label, value, color }) => (
            <div key={label} className="cyber-card p-4">
              <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>{label}</div>
              <div className="text-xl font-display font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5">
        <div className="cyber-card p-5">
          <div className="text-xs font-mono mb-4" style={{ color: '#6b9aaa' }}>TXS PER BLOCK (LAST 20)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={blockHistory}>
              <defs>
                <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00f5d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0d2d3d" />
              <XAxis dataKey="block" tick={{ fontSize: 10, fill: '#2d5a68', fontFamily: 'monospace' }} />
              <YAxis tick={{ fontSize: 10, fill: '#2d5a68', fontFamily: 'monospace' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="txs" stroke="#00f5d4" fill="url(#txGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="cyber-card p-5">
          <div className="text-xs font-mono mb-4" style={{ color: '#6b9aaa' }}>GAS PRICE TREND (GWEI)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={gasHistory}>
              <defs>
                <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0d2d3d" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#2d5a68', fontFamily: 'monospace' }} />
              <YAxis tick={{ fontSize: 10, fill: '#2d5a68', fontFamily: 'monospace' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="gas" stroke="#8b5cf6" fill="url(#gasGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Node info */}
      <div className="cyber-card p-5">
        <div className="text-xs font-mono mb-3" style={{ color: '#00f5d4' }}>SHARDEUM NETWORK DETAILS</div>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          {[
            ['Consensus', 'Proof of Quorum (PoQ)'],
            ['Architecture', 'Dynamic State Sharding'],
            ['EVM Compatible', 'Yes (Fully)'],
            ['Linear Scalability', 'Enabled'],
            ['Node Type', 'Validator / Archive'],
            ['Smart Contracts', 'Solidity / Vyper'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid #0d2d3d' }}>
              <span style={{ color: '#2d5a68' }}>{k}</span>
              <span style={{ color: '#00f5d4' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}