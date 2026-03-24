import React from 'react'
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useShardeum, SHARDEUM_NETWORKS } from '../contexts/ShardeumContext'

export default function TopBar() {
  const { selectedNetwork, setSelectedNetwork, networkStatus, walletAddress, balance, connectWallet, disconnectWallet, refreshNetwork, network } = useShardeum()

  return (
    <header className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{
      background: 'rgba(6,21,32,0.9)',
      borderBottom: '1px solid #0d2d3d',
      backdropFilter: 'blur(10px)',
    }}>
      {/* Network selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {networkStatus === 'online' && <Wifi size={14} style={{ color: '#10b981' }} />}
          {networkStatus === 'offline' && <WifiOff size={14} style={{ color: '#ef4444' }} />}
          {networkStatus === 'checking' && <AlertCircle size={14} style={{ color: '#f59e0b', animation: 'pulse 1s infinite' }} />}

          <select
            value={selectedNetwork}
            onChange={e => setSelectedNetwork(e.target.value)}
            className="cyber-input rounded px-3 py-1 text-xs"
            style={{ width: 'auto', minWidth: '160px', borderRadius: '4px' }}
          >
            {Object.entries(SHARDEUM_NETWORKS).map(([key, net]) => (
              <option key={key} value={key}>{net.name}</option>
            ))}
          </select>

          <button onClick={refreshNetwork} className="p-1 transition-colors" style={{ color: '#2d5a68' }}
            onMouseEnter={e => e.currentTarget.style.color = '#00f5d4'}
            onMouseLeave={e => e.currentTarget.style.color = '#2d5a68'}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: '#2d5a68' }}>
          <span style={{ color: '#0d2d3d' }}>|</span>
          <span>Chain ID: {parseInt(network.chainId, 16)}</span>
        </div>
      </div>

      {/* Right: wallet */}
      <div className="flex items-center gap-3">
        {walletAddress ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>
                {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}
              </div>
              {balance && (
                <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>
                  {parseFloat(balance).toFixed(4)} SHM
                </div>
              )}
            </div>
            <button onClick={disconnectWallet} className="cyber-btn text-xs py-1 px-3 rounded" style={{ borderRadius: '4px', fontSize: '11px', color: '#ef4444', borderColor: '#ef4444' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={connectWallet} className="cyber-btn-primary text-xs py-1.5 px-4 rounded" style={{ borderRadius: '4px', fontSize: '12px' }}>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}
