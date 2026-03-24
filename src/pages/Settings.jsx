import React, { useState } from 'react'
import { Settings as SettingsIcon, Save, RotateCcw, CheckCircle } from 'lucide-react'
import { useShardeum, SHARDEUM_NETWORKS } from '../contexts/ShardeumContext'

export default function Settings() {
  const { selectedNetwork, setSelectedNetwork, refreshNetwork, addLog } = useShardeum()
  const [saved, setSaved] = useState(false)
  const [customRpc, setCustomRpc] = useState('')
  const [theme, setTheme] = useState('cyber')
  const [gasLimit, setGasLimit] = useState('3000000')
  const [gasPrice, setGasPrice] = useState('10')
  const [autoConnect, setAutoConnect] = useState(false)
  const [confirmTx, setConfirmTx] = useState(true)

  const save = () => {
    addLog('Settings saved', 'success')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>SETTINGS</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Configure DevKit preferences</p>
      </div>

      {/* Network */}
      <div className="cyber-card p-5 space-y-4">
        <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>NETWORK CONFIGURATION</div>
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>DEFAULT NETWORK</label>
          <select value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)}
            className="cyber-input rounded w-full" style={{ borderRadius: '4px' }}>
            {Object.entries(SHARDEUM_NETWORKS).map(([key, net]) => (
              <option key={key} value={key}>{net.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>CUSTOM RPC URL (optional)</label>
          <input value={customRpc} onChange={e => setCustomRpc(e.target.value)}
            className="cyber-input rounded w-full" style={{ borderRadius: '4px' }}
            placeholder="https://your-custom-rpc.com" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(SHARDEUM_NETWORKS).map(([key, net]) => (
            <div key={key} className="p-3 rounded cursor-pointer transition-all"
              style={{
                background: selectedNetwork === key ? 'rgba(0,245,212,0.08)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${selectedNetwork === key ? '#00f5d4' : '#0d2d3d'}`,
                borderRadius: '6px'
              }}
              onClick={() => setSelectedNetwork(key)}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: net.color }} />
                <span className="text-xs font-mono font-medium" style={{ color: selectedNetwork === key ? '#00f5d4' : '#e2f4f1' }}>
                  {net.name}
                </span>
              </div>
              <div className="text-xs font-mono" style={{ color: '#2d5a68', fontSize: '10px' }}>Chain {parseInt(net.chainId, 16)} · {net.symbol}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gas */}
      <div className="cyber-card p-5 space-y-4">
        <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>GAS DEFAULTS</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>DEFAULT GAS LIMIT</label>
            <input value={gasLimit} onChange={e => setGasLimit(e.target.value)}
              className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} />
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>DEFAULT GAS PRICE (GWEI)</label>
            <input value={gasPrice} onChange={e => setGasPrice(e.target.value)}
              className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} />
          </div>
        </div>
        <div className="text-xs font-mono p-2 rounded" style={{ background: 'rgba(0,245,212,0.05)', color: '#6b9aaa' }}>
          Default max cost: {(parseInt(gasLimit) * parseInt(gasPrice) / 1e9).toFixed(6)} SHM per transaction
        </div>
      </div>

      {/* Preferences */}
      <div className="cyber-card p-5 space-y-4">
        <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>PREFERENCES</div>
        {[
          { label: 'Auto-connect wallet on startup', value: autoConnect, set: setAutoConnect },
          { label: 'Confirm before sending transactions', value: confirmTx, set: setConfirmTx },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-mono" style={{ color: '#e2f4f1' }}>{label}</span>
            <div
              onClick={() => set(!value)}
              className="relative w-10 h-5 rounded-full transition-all"
              style={{ background: value ? 'rgba(0,245,212,0.3)' : '#0d2d3d', border: `1px solid ${value ? '#00f5d4' : '#0d2d3d'}` }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{ background: value ? '#00f5d4' : '#2d5a68', left: value ? '20px' : '2px', boxShadow: value ? '0 0 6px #00f5d4' : 'none' }} />
            </div>
          </label>
        ))}
      </div>

      {/* About */}
      <div className="cyber-card p-5">
        <div className="text-xs font-mono mb-4" style={{ color: '#00f5d4' }}>ABOUT</div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {[
            ['Version', '1.0.0'],
            ['Network', 'Shardeum EVM'],
            ['Ethers.js', '6.x'],
            ['Framework', 'React + Vite'],
            ['License', 'MIT'],
            ['Built for', 'Shardeum Hackathon'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid #0d2d3d' }}>
              <span style={{ color: '#2d5a68' }}>{k}</span>
              <span style={{ color: '#00f5d4' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={save}
          className="cyber-btn-primary px-6 py-2.5 rounded flex items-center gap-2"
          style={{ borderRadius: '6px' }}>
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <button onClick={() => { setGasLimit('3000000'); setGasPrice('10'); addLog('Settings reset to defaults', 'info') }}
          className="cyber-btn px-5 py-2.5 rounded flex items-center gap-2"
          style={{ borderRadius: '6px' }}>
          <RotateCcw size={15} />
          Reset Defaults
        </button>
      </div>
    </div>
  )
}
