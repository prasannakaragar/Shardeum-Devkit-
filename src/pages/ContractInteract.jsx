import React, { useState } from 'react'
import { ethers } from 'ethers'
import { Zap, Play, Search, ChevronDown, ChevronUp, Loader, AlertTriangle } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

function FunctionCard({ func, signer, provider, contract, addLog, addTransaction, network }) {
  const [args, setArgs] = useState(func.inputs.map(() => ''))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [ethValue, setEthValue] = useState('0')

  const isView = func.stateMutability === 'view' || func.stateMutability === 'pure'
  const isPayable = func.stateMutability === 'payable'

  const call = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const runner = isView ? provider : signer
      if (!runner) throw new Error(isView ? 'Not connected to network' : 'Connect wallet to send transactions')

      const iface = new ethers.Interface([func])
      const parsedArgs = args.map((a, i) => {
        const type = func.inputs[i].type
        if (type.startsWith('uint') || type.startsWith('int')) return BigInt(a)
        if (type === 'bool') return a === 'true'
        return a
      })

      let res
      if (isView) {
        const data = iface.encodeFunctionData(func.name, parsedArgs)
        const response = await provider.call({ to: contract, data })
        const decoded = iface.decodeFunctionResult(func.name, response)
        res = decoded.length === 1 ? decoded[0].toString() : decoded.map(v => v.toString()).join(', ')
        addLog(`Read ${func.name}: ${res}`, 'success')
      } else {
        const txSigner = new ethers.Contract(contract, [func], signer)
        const overrides = isPayable ? { value: ethers.parseEther(ethValue || '0') } : {}
        const tx = await txSigner[func.name](...parsedArgs, overrides)
        addLog(`TX sent: ${tx.hash}`, 'info')
        const receipt = await tx.wait()
        res = `TX confirmed. Gas used: ${receipt.gasUsed.toString()}`
        addTransaction({ hash: tx.hash, func: func.name, status: 'confirmed', timestamp: new Date().toLocaleTimeString() })
        addLog(`${func.name} confirmed: ${tx.hash}`, 'success')
      }
      setResult(res)
    } catch (e) {
      setError(e.reason || e.message)
      addLog(`${func.name} failed: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const colorForType = isView ? '#10b981' : isPayable ? '#f59e0b' : '#8b5cf6'
  const typeLabel = isView ? 'VIEW' : isPayable ? 'PAYABLE' : 'WRITE'

  return (
    <div className="cyber-card overflow-hidden" style={{ borderColor: open ? `${colorForType}40` : '#0d2d3d' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: open ? `${colorForType}08` : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${colorForType}15`, color: colorForType, border: `1px solid ${colorForType}30`, fontSize: '10px' }}>
            {typeLabel}
          </span>
          <span className="font-mono text-sm font-medium" style={{ color: '#e2f4f1' }}>{func.name}</span>
          {func.inputs.length > 0 && (
            <span className="text-xs font-mono" style={{ color: '#2d5a68' }}>
              ({func.inputs.map(i => `${i.type} ${i.name}`).join(', ')})
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} style={{ color: '#6b9aaa' }} /> : <ChevronDown size={14} style={{ color: '#6b9aaa' }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-cyber-border">
          <div className="h-3" />
          {func.inputs.map((input, i) => (
            <div key={i}>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>
                {input.name || `param${i}`} <span style={{ color: '#2d5a68' }}>({input.type})</span>
              </label>
              <input
                value={args[i]}
                onChange={e => { const a = [...args]; a[i] = e.target.value; setArgs(a) }}
                className="cyber-input rounded w-full"
                style={{ borderRadius: '4px' }}
                placeholder={`Enter ${input.type}`}
              />
            </div>
          ))}

          {isPayable && (
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#f59e0b' }}>VALUE (SHM)</label>
              <input value={ethValue} onChange={e => setEthValue(e.target.value)}
                className="cyber-input rounded w-full"
                style={{ borderRadius: '4px', borderColor: '#f59e0b44' }} placeholder="0.0" />
            </div>
          )}

          <button onClick={call} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-medium transition-all"
            style={{ background: `${colorForType}15`, border: `1px solid ${colorForType}50`, color: colorForType, borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
            {loading ? 'Processing...' : isView ? 'Call (read)' : 'Send Transaction'}
          </button>

          {result !== null && (
            <div className="p-3 rounded text-xs font-mono" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
              <div style={{ color: '#2d5a68', marginBottom: '4px' }}>RESULT:</div>
              <div style={{ wordBreak: 'break-all' }}>{result.toString()}</div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded text-xs font-mono" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <div style={{ color: '#2d5a68', marginBottom: '4px' }}>ERROR:</div>
              <div style={{ wordBreak: 'break-all' }}>{error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ContractInteract() {
  const { signer, provider, walletAddress, network, addLog, addTransaction, deployedContracts } = useShardeum()
  const [contractAddress, setContractAddress] = useState('')
  const [abiText, setAbiText] = useState('')
  const [functions, setFunctions] = useState([])
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)

  const loadContract = () => {
    if (!contractAddress.trim()) return
    try {
      const abi = JSON.parse(abiText)
      const fns = abi.filter(e => e.type === 'function')
      setFunctions(fns)
      setLoaded(true)
      addLog(`Loaded contract: ${contractAddress} (${fns.length} functions)`, 'success')
    } catch (e) {
      addLog('Invalid ABI: ' + e.message, 'error')
    }
  }

  const loadDeployed = (c) => {
    setContractAddress(c.address)
    setAbiText(JSON.stringify(c.abi, null, 2))
    const fns = c.abi.filter(e => e.type === 'function')
    setFunctions(fns)
    setLoaded(true)
    addLog(`Loaded deployed contract: ${c.name}`, 'info')
  }

  const filtered = functions.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>CONTRACT INTERACT</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Call and transact with deployed contracts</p>
      </div>

      {/* Load contract */}
      <div className="cyber-card p-5 space-y-4">
        <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>LOAD CONTRACT</div>
        <div>
          <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>CONTRACT ADDRESS</label>
          <input value={contractAddress} onChange={e => setContractAddress(e.target.value)}
            className="cyber-input rounded w-full" style={{ borderRadius: '4px' }}
            placeholder="0x..." />
        </div>
        <div>
          <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>ABI (JSON)</label>
          <textarea value={abiText} onChange={e => setAbiText(e.target.value)}
            className="code-editor w-full" style={{ height: '120px', fontSize: '11px' }}
            placeholder='[{"name":"get","inputs":[],"outputs":[{"type":"string"}],"stateMutability":"view","type":"function"}]' />
        </div>
        <button onClick={loadContract} className="cyber-btn-primary px-5 py-2 rounded flex items-center gap-2 text-sm"
          style={{ borderRadius: '4px' }}>
          <Zap size={14} />
          Load Contract
        </button>
      </div>

      {/* Quick load from deployed */}
      {deployedContracts.length > 0 && (
        <div className="cyber-card p-4">
          <div className="text-xs font-mono mb-3" style={{ color: '#6b9aaa' }}>OR LOAD FROM DEPLOYED</div>
          <div className="flex flex-wrap gap-2">
            {deployedContracts.map((c, i) => (
              <button key={i} onClick={() => loadDeployed(c)}
                className="cyber-btn px-3 py-1.5 rounded text-xs flex items-center gap-2"
                style={{ borderRadius: '4px' }}>
                {c.name}
                <span style={{ color: '#2d5a68', fontSize: '10px' }}>{c.address.slice(0, 8)}...</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Functions */}
      {loaded && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>{filtered.length} FUNCTIONS</div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2d5a68' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="cyber-input rounded pl-8 text-xs" style={{ borderRadius: '4px', width: '200px' }}
                placeholder="Search functions..." />
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-xs font-mono">
            {[['VIEW', '#10b981'], ['WRITE', '#8b5cf6'], ['PAYABLE', '#f59e0b']].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span style={{ color: '#6b9aaa' }}>{label}</span>
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((func, i) => (
              <FunctionCard key={i} func={func} signer={signer} provider={provider}
                contract={contractAddress} addLog={addLog} addTransaction={addTransaction} network={network} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
