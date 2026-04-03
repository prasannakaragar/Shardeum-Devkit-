import React, { useState } from 'react'
import { ethers } from 'ethers'
import { Zap, Play, Search, ChevronDown, ChevronUp, Loader, AlertTriangle, Copy, CheckCircle } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

// Safely coerce user string input to the correct type for ethers.js
function coerceArg(value, solidityType) {
  const v = (value || '').trim()
  const t = solidityType.toLowerCase()

  if (t.startsWith('uint') || t.startsWith('int')) {
    if (v === '') return 0n
    try { return BigInt(v) }
    catch { throw new Error(`"${v}" is not a valid integer for ${solidityType}`) }
  }

  if (t === 'bool') {
    if (v === '' || v === 'false' || v === '0') return false
    if (v === 'true' || v === '1') return true
    throw new Error(`"${v}" is not a valid bool — use true or false`)
  }

  if (t === 'address') {
    if (v === '') throw new Error(`Address is required`)
    if (!ethers.isAddress(v)) throw new Error(`"${v}" is not a valid address`)
    return v
  }

  if (t.endsWith('[]') || /\[\d+\]$/.test(t)) {
    // Array type — expect JSON array
    if (v === '') return []
    try { return JSON.parse(v) }
    catch { throw new Error(`Expected JSON array for ${solidityType}, e.g. ["a","b"] or [1,2]`) }
  }

  if (t === 'tuple' || t.startsWith('tuple(')) {
    // Struct / tuple — expect JSON object or array
    if (v === '') return []
    try { return JSON.parse(v) }
    catch { throw new Error(`Expected JSON for tuple ${solidityType}`) }
  }

  // bytes32, bytes, string — pass through as string; ethers handles encoding
  return v
}

// Format a return value nicely for display
function formatResult(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) {
    return '[' + value.map(formatResult).join(', ') + ']'
  }
  if (typeof value === 'object') {
    // Could be a Result object from ethers
    try {
      const entries = Object.entries(value)
        .filter(([k]) => isNaN(Number(k))) // skip numeric keys
        .map(([k, v]) => `${k}: ${formatResult(v)}`)
      return entries.length ? '{' + entries.join(', ') + '}' : value.toString()
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const doCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={doCopy} style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
      {copied
        ? <CheckCircle size={12} style={{ color: '#10b981' }} />
        : <Copy size={12} style={{ color: '#2d5a68' }} />}
    </button>
  )
}

function FunctionCard({ func, signer, provider, contractAddress, addLog, addTransaction, network }) {
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
      if (!contractAddress || !ethers.isAddress(contractAddress)) {
        throw new Error('Invalid contract address')
      }

      // Coerce all args
      let parsedArgs
      try {
        parsedArgs = args.map((a, i) => coerceArg(a, func.inputs[i].type))
      } catch (e) {
        throw new Error(`Argument error: ${e.message}`)
      }

      if (isView) {
        if (!provider) throw new Error('Not connected to network')
        const contractInstance = new ethers.Contract(contractAddress, [func], provider)
        const raw = await contractInstance[func.name](...parsedArgs)
        const formatted = Array.isArray(raw)
          ? raw.map(formatResult).join(', ')
          : formatResult(raw)
        setResult(formatted)
        addLog(`Read ${func.name}(): ${formatted}`, 'success')
      } else {
        if (!signer) throw new Error('Connect wallet to send transactions')
        const contractInstance = new ethers.Contract(contractAddress, [func], signer)
        const overrides = {}
        if (isPayable) {
          const val = ethValue.trim() || '0'
          overrides.value = ethers.parseEther(val)
        }
        const tx = await contractInstance[func.name](...parsedArgs, overrides)
        addLog(`TX sent: ${tx.hash}`, 'info')
        const receipt = await tx.wait()
        const gasUsed = receipt.gasUsed?.toString() || '—'
        const statusText = receipt.status === 1 ? 'confirmed' : 'reverted'
        setResult(`TX ${statusText}. Gas used: ${gasUsed}`)
        addTransaction({
          hash: tx.hash,
          func: func.name,
          contract: contractAddress,
          status: statusText,
          timestamp: new Date().toLocaleTimeString()
        })
        addLog(`${func.name} ${statusText}: ${tx.hash}`, receipt.status === 1 ? 'success' : 'error')
      }
    } catch (e) {
      const msg = e.reason || e.shortMessage || e.message || 'Call failed'
      setError(msg)
      addLog(`${func.name} failed: ${msg}`, 'error')
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
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
            background: `${colorForType}15`, color: colorForType,
            border: `1px solid ${colorForType}30`, fontSize: '10px'
          }}>
            {typeLabel}
          </span>
          <span className="font-mono text-sm font-medium" style={{ color: '#e2f4f1' }}>{func.name}</span>
          {func.inputs.length > 0 && (
            <span className="text-xs font-mono" style={{ color: '#2d5a68' }}>
              ({func.inputs.map(i => `${i.type} ${i.name || ''}`).join(', ')})
            </span>
          )}
          {func.outputs?.length > 0 && (
            <span className="text-xs font-mono" style={{ color: '#2d5a68' }}>
              → {func.outputs.map(o => o.type).join(', ')}
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
                {input.name || `param${i}`}
                <span style={{ color: '#2d5a68', marginLeft: '6px' }}>({input.type})</span>
                {(input.type.includes('[]') || input.type === 'tuple') && (
                  <span style={{ color: '#f59e0b', marginLeft: '6px' }}>JSON</span>
                )}
              </label>
              <input
                value={args[i]}
                onChange={e => { const a = [...args]; a[i] = e.target.value; setArgs(a) }}
                className="cyber-input rounded w-full"
                style={{ borderRadius: '4px' }}
                placeholder={
                  input.type.startsWith('uint') || input.type.startsWith('int') ? '0'
                  : input.type === 'bool' ? 'true or false'
                  : input.type === 'address' ? '0x...'
                  : input.type.includes('[]') ? '["item1","item2"] or [1,2]'
                  : `Enter ${input.type}`
                }
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
            style={{
              background: `${colorForType}15`, border: `1px solid ${colorForType}50`,
              color: colorForType, borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
            {loading ? 'Processing...' : isView ? 'Call (read)' : 'Send Transaction'}
          </button>

          {result !== null && (
            <div className="p-3 rounded text-xs font-mono" style={{
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981'
            }}>
              <div style={{ color: '#2d5a68', marginBottom: '4px' }}>
                RESULT:
                <CopyButton text={result} />
              </div>
              <div style={{ wordBreak: 'break-all' }}>{result}</div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded text-xs font-mono" style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444'
            }}>
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
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [addressError, setAddressError] = useState(null)

  const loadContract = () => {
    const addr = contractAddress.trim()
    if (!addr) { setAddressError('Enter a contract address'); return }
    if (!ethers.isAddress(addr)) { setAddressError('Invalid Ethereum address'); return }
    setAddressError(null)

    try {
      const abi = JSON.parse(abiText)
      if (!Array.isArray(abi)) throw new Error('ABI must be a JSON array')
      const fns = abi.filter(e => e.type === 'function')
      const evs = abi.filter(e => e.type === 'event')
      setFunctions(fns)
      setEvents(evs)
      setLoaded(true)
      addLog(`Loaded contract: ${addr} (${fns.length} functions, ${evs.length} events)`, 'success')
    } catch (e) {
      addLog('Invalid ABI: ' + e.message, 'error')
    }
  }

  const loadDeployed = (c) => {
    setContractAddress(c.address)
    setAbiText(JSON.stringify(c.abi, null, 2))
    const fns = c.abi.filter(e => e.type === 'function')
    const evs = c.abi.filter(e => e.type === 'event')
    setFunctions(fns)
    setEvents(evs)
    setLoaded(true)
    setAddressError(null)
    addLog(`Loaded deployed contract: ${c.name} (${c.address})`, 'info')
  }

  const viewFns = functions.filter(f => f.stateMutability === 'view' || f.stateMutability === 'pure')
  const writeFns = functions.filter(f => f.stateMutability !== 'view' && f.stateMutability !== 'pure')

  const filteredView = viewFns.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  const filteredWrite = writeFns.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>CONTRACT INTERACT</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Call and transact with deployed contracts on {network.name}</p>
      </div>

      {/* Load contract */}
      <div className="cyber-card p-5 space-y-4">
        <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>LOAD CONTRACT</div>
        <div>
          <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>CONTRACT ADDRESS</label>
          <input
            value={contractAddress}
            onChange={e => { setContractAddress(e.target.value); setAddressError(null) }}
            className="cyber-input rounded w-full"
            style={{ borderRadius: '4px', borderColor: addressError ? '#ef4444' : undefined }}
            placeholder="0x..."
          />
          {addressError && <div className="text-xs font-mono mt-1" style={{ color: '#ef4444' }}>{addressError}</div>}
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
          <div className="text-xs font-mono mb-3" style={{ color: '#6b9aaa' }}>LOAD FROM DEPLOYED THIS SESSION</div>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>
                {functions.length} FUNCTIONS
              </div>
              {/* Legend */}
              <div className="flex gap-3 text-xs font-mono">
                {[['VIEW', '#10b981', viewFns.length], ['WRITE', '#8b5cf6', writeFns.length], ['PAYABLE', '#f59e0b', writeFns.filter(f => f.stateMutability === 'payable').length]].map(([label, color, count]) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span style={{ color: '#6b9aaa' }}>{label} ({count})</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2d5a68' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="cyber-input rounded pl-8 text-xs" style={{ borderRadius: '4px', width: '200px' }}
                placeholder="Search functions..." />
            </div>
          </div>

          {!walletAddress && writeFns.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded text-xs font-mono"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              <AlertTriangle size={13} />
              Connect wallet to call WRITE functions. VIEW functions work without a wallet.
            </div>
          )}

          {/* View functions */}
          {filteredView.length > 0 && (
            <div>
              <div className="text-xs font-mono mb-2" style={{ color: '#10b981' }}>READ / VIEW</div>
              <div className="space-y-2">
                {filteredView.map((func, i) => (
                  <FunctionCard key={`view-${i}`} func={func} signer={signer} provider={provider}
                    contractAddress={contractAddress} addLog={addLog} addTransaction={addTransaction} network={network} />
                ))}
              </div>
            </div>
          )}

          {/* Write functions */}
          {filteredWrite.length > 0 && (
            <div>
              <div className="text-xs font-mono mb-2 mt-4" style={{ color: '#8b5cf6' }}>WRITE / STATE-CHANGING</div>
              <div className="space-y-2">
                {filteredWrite.map((func, i) => (
                  <FunctionCard key={`write-${i}`} func={func} signer={signer} provider={provider}
                    contractAddress={contractAddress} addLog={addLog} addTransaction={addTransaction} network={network} />
                ))}
              </div>
            </div>
          )}

          {functions.length > 0 && filteredView.length === 0 && filteredWrite.length === 0 && (
            <div className="text-xs font-mono text-center py-6" style={{ color: '#2d5a68' }}>
              No functions match "{search}"
            </div>
          )}

          {/* Events list */}
          {events.length > 0 && (
            <div className="cyber-card p-4 mt-4">
              <div className="text-xs font-mono mb-3" style={{ color: '#6b9aaa' }}>EVENTS ({events.length})</div>
              <div className="space-y-2">
                {events.map((ev, i) => (
                  <div key={i} className="text-xs font-mono p-2 rounded" style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid #0d2d3d' }}>
                    <span style={{ color: '#00f5d4' }}>{ev.name}</span>
                    <span style={{ color: '#2d5a68', marginLeft: '4px' }}>
                      ({ev.inputs?.map(inp => `${inp.type}${inp.indexed ? ' indexed' : ''} ${inp.name}`).join(', ')})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}