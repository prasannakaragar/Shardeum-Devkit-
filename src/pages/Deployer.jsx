import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { Rocket, AlertTriangle, CheckCircle, Loader, ExternalLink, Upload, Info, X } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

// ─── Storage helpers ──────────────────────────────────────────────────────────
const DEPLOYER_KEY = 'shardeum_deployer_state'

function loadDeployerState() {
  try {
    const raw = localStorage.getItem(DEPLOYER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDeployerState(state) {
  try { localStorage.setItem(DEPLOYER_KEY, JSON.stringify(state)) } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getConstructorInputs(parsedAbi) {
  const ctor = parsedAbi.find(e => e.type === 'constructor')
  return ctor ? ctor.inputs || [] : []
}

function coerceArg(value, solidityType) {
  const v = value.trim()
  if (solidityType.startsWith('uint') || solidityType.startsWith('int')) {
    if (v === '') throw new Error(`Missing required argument (${solidityType})`)
    return BigInt(v)
  }
  if (solidityType === 'bool') {
    if (v === '') throw new Error(`Missing required argument (${solidityType})`)
    if (v === 'true' || v === '1') return true
    if (v === 'false' || v === '0') return false
    throw new Error(`Invalid bool value: "${v}" — use true or false`)
  }
  if (solidityType === 'address') {
    if (v === '') throw new Error(`Missing required argument (address)`)
    if (!ethers.isAddress(v)) throw new Error(`Invalid address: "${v}"`)
    return v
  }
  if (solidityType.includes('[]') || solidityType.includes('[')) {
    try { return JSON.parse(v) } catch {
      throw new Error(`Expected JSON array for ${solidityType}, got: "${v}"`)
    }
  }
  return v
}

function ArgField({ input, value, onChange }) {
  const placeholder =
    input.type.startsWith('uint') || input.type.startsWith('int') ? '0'
    : input.type === 'bool' ? 'true or false'
    : input.type === 'address' ? '0x...'
    : input.type.includes('[]') ? '["item1","item2"]'
    : `Enter ${input.type}`

  return (
    <div>
      <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>
        {input.name || `param_${input.type}`}
        <span style={{ color: '#2d5a68', marginLeft: '6px' }}>({input.type})</span>
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="cyber-input rounded w-full"
        style={{ borderRadius: '4px' }}
        placeholder={placeholder}
      />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Deployer() {
  const { signer, walletAddress, network, addLog, addDeployedContract, addTransaction } = useShardeum()

  // Load persisted state once on mount
  const savedState = loadDeployerState()

  const [contractName, setContractName] = useState(savedState?.contractName || '')
  const [abiText, setAbiText]           = useState(savedState?.abiText || '')
  const [bytecode, setBytecode]         = useState(savedState?.bytecode || '')
  const [gasLimit, setGasLimit]         = useState(savedState?.gasLimit || 'auto')
  const [estimatedGas, setEstimatedGas] = useState(null)
  const [estimatedCost, setEstimatedCost] = useState(null)
  const [argValues, setArgValues]       = useState(savedState?.argValues || [])

  // Derived parse state (not persisted — re-derived from abiText)
  const [parsedAbi, setParsedAbi]               = useState(null)
  const [constructorInputs, setConstructorInputs] = useState([])
  const [abiError, setAbiError]                 = useState(null)

  // UI state
  const [deploying, setDeploying]       = useState(false)
  const [deployResult, setDeployResult] = useState(null)
  const [error, setError]               = useState(null)
  const [step, setStep]                 = useState(0)
  const [liveGasPrice, setLiveGasPrice] = useState(null)

  const fileInputRef = useRef(null)
  const STEPS = ['Validate ABI', 'Encode Constructor', 'Estimate Gas', 'Deploy Transaction', 'Confirm']

  // ── Re-parse ABI whenever abiText changes (including initial load) ──
  const parseAbi = useCallback((text) => {
    setAbiError(null)
    setParsedAbi(null)
    setConstructorInputs([])
    if (!text.trim()) return
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) throw new Error('ABI must be a JSON array')
      const inputs = getConstructorInputs(parsed)
      setParsedAbi(parsed)
      setConstructorInputs(inputs)
      // Only reset arg values if inputs count changed (preserves typed values on re-parse)
      setArgValues(prev =>
        prev.length === inputs.length ? prev : inputs.map(() => '')
      )
    } catch (e) {
      setAbiError('Invalid ABI: ' + e.message)
    }
  }, [])

  // Parse on first mount from saved state
  useEffect(() => {
    if (savedState?.abiText) parseAbi(savedState.abiText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Persist to localStorage whenever relevant fields change ──
  useEffect(() => {
    saveDeployerState({ contractName, abiText, bytecode, gasLimit, argValues })
  }, [contractName, abiText, bytecode, gasLimit, argValues])

  // ── ABI change handler ──
  const handleAbiChange = (text) => {
    setAbiText(text)
    parseAbi(text)
  }

  // ── Load from artifact file ──
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const artifact = JSON.parse(ev.target.result)
        const abi  = artifact.abi
        const bc   = artifact.bytecode || artifact.evm?.bytecode?.object
        const name = artifact.contractName || artifact.name || file.name.replace('.json', '')
        if (!abi) throw new Error('No "abi" field found in JSON')
        if (!bc)  throw new Error('No "bytecode" field found in JSON')
        const abiStr = JSON.stringify(abi, null, 2)
        const bcStr  = bc.startsWith('0x') ? bc : '0x' + bc
        setContractName(name)
        setAbiText(abiStr)
        setBytecode(bcStr)
        parseAbi(abiStr)
        addLog(`Loaded artifact: ${name}`, 'success')
      } catch (err) {
        addLog(`Failed to load artifact: ${err.message}`, 'error')
        setAbiError(err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Deploy ──
  const handleDeploy = async () => {
    if (!signer)           { setError('Connect your wallet to deploy'); return }
    if (!abiText.trim())   { setError('Paste your contract ABI first'); return }
    if (!bytecode.trim())  { setError('Paste your contract bytecode first'); return }
    if (!parsedAbi)        { setError(abiError || 'Fix ABI errors first'); return }

    const bc = bytecode.trim()
    if (bc === '0x' || bc.length < 10) {
      setError('Bytecode looks empty or invalid. Compile your contract first and paste the output bytecode.')
      return
    }

    setDeploying(true)
    setError(null)
    setDeployResult(null)
    setStep(0)

    try {
      // Step 1: Validate ABI
      setStep(1)
      addLog('Validating ABI...', 'info')
      addLog(`ABI validated: ${parsedAbi.length} entries`, 'success')

      // Step 2: Encode constructor args
      setStep(2)
      addLog('Encoding constructor arguments...', 'info')
      let args = []
      if (constructorInputs.length > 0) {
        args = constructorInputs.map((input, i) => coerceArg(argValues[i] || '', input.type))
      }
      addLog(`Constructor args: ${args.length > 0 ? JSON.stringify(args.map(String)) : 'none'}`, 'info')

      // Step 3: Estimate gas & fetch gas price
      setStep(3)
      addLog('Estimating gas & fetching gas price...', 'info')
      let deployGasLimit
      let deployGasPrice
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum)
        const feeData = await web3Provider.getFeeData()
        deployGasPrice = feeData.gasPrice || feeData.maxFeePerGas
        if (!deployGasPrice) throw new Error('Gas price unavailable')
        // Use network gas price directly — no artificial inflation
        setLiveGasPrice(ethers.formatUnits(deployGasPrice, 'gwei'))
        addLog(`Gas price: ${parseFloat(ethers.formatUnits(deployGasPrice, 'gwei')).toFixed(4)} gwei`, 'success')

        // Estimate actual gas needed
        if (gasLimit === 'auto' || !gasLimit) {
          const tempFactory = new ethers.ContractFactory(parsedAbi, bc, signer)
          const deployTx = await tempFactory.getDeployTransaction(...args)
          const estimated = await web3Provider.estimateGas(deployTx)
          // Add 15% buffer for safety
          deployGasLimit = estimated * 115n / 100n
          setEstimatedGas(deployGasLimit.toString())
          const cost = deployGasLimit * deployGasPrice
          setEstimatedCost(parseFloat(ethers.formatEther(cost)).toFixed(6))
          addLog(`Estimated gas: ${deployGasLimit.toString()} (auto + 15% buffer)`, 'success')
          addLog(`Estimated cost: ~${parseFloat(ethers.formatEther(cost)).toFixed(6)} SHM`, 'info')
        } else {
          deployGasLimit = BigInt(gasLimit)
          const cost = deployGasLimit * deployGasPrice
          setEstimatedGas(deployGasLimit.toString())
          setEstimatedCost(parseFloat(ethers.formatEther(cost)).toFixed(6))
          addLog(`Manual gas limit: ${deployGasLimit.toString()}`, 'info')
        }
      } catch (e) {
        addLog(`Gas estimation warning: ${e.message}`, 'warn')
        // Fallback: use a reasonable default instead of 3M
        deployGasLimit = 500000n
        setEstimatedGas('500000')
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum)
          const feeData = await web3Provider.getFeeData()
          deployGasPrice = feeData.gasPrice || feeData.maxFeePerGas
          setLiveGasPrice(ethers.formatUnits(deployGasPrice, 'gwei'))
        } catch {
          throw new Error('Failed to fetch network gas price. Is your wallet connected to the right network?')
        }
        addLog(`Using fallback gas limit: 500,000`, 'warn')
      }

      // Step 4: Deploy
      setStep(4)
      addLog('Sending deployment transaction...', 'info')
      const factory = new ethers.ContractFactory(parsedAbi, bc, signer)
      const deployOverrides = { gasLimit: deployGasLimit }
      // Let the provider and MetaMask handle EIP-1559 pricing automatically
      const contract = await factory.deploy(...args, deployOverrides)
      const txHash = contract.deploymentTransaction()?.hash
      addLog(`Transaction sent: ${txHash}`, 'info')

      // Step 5: Wait for confirmation
      setStep(5)
      addLog('Waiting for confirmation...', 'info')
      await contract.waitForDeployment()
      const address = await contract.getAddress()

      const finalName = contractName.trim() || 'MyContract'

      setDeployResult({ address, txHash, network: network.name })

      // Save to global deployed contracts list
      addDeployedContract({
        name: finalName,
        address,
        abi: parsedAbi,
        bytecode: bc,
        network: network.name,
        txHash,
        deployedAt: new Date().toLocaleTimeString(),
        timestamp: new Date().toISOString(),
      })

      // Record in transaction monitor
      addTransaction({
        hash: txHash,
        type: 'Deploy',
        contract: finalName,
        status: 'confirmed',
        timestamp: new Date().toLocaleTimeString(),
      })

      addLog(`✅ ${finalName} deployed at ${address}`, 'success')
      addLog(`TX: ${txHash}`, 'info')
      addLog(`Network: ${network.name}`, 'info')
    } catch (e) {
      const msg = e.reason || e.shortMessage || e.message || 'Deployment failed'
      setError(msg)
      addLog(`Deployment failed: ${msg}`, 'error')
    } finally {
      setDeploying(false)
    }
  }

  // ── Reset (clears both UI and persisted state) ──
  const reset = () => {
    setContractName('')
    setAbiText('')
    setBytecode('')
    setGasLimit('auto')
    setParsedAbi(null)
    setConstructorInputs([])
    setArgValues([])
    setAbiError(null)
    setDeployResult(null)
    setError(null)
    setStep(0)
    setLiveGasPrice(null)
    setEstimatedGas(null)
    setEstimatedCost(null)
    saveDeployerState(null)
    localStorage.removeItem(DEPLOYER_KEY)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>DEPLOY CONTRACT</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Deploy smart contracts to {network.name}</p>
        </div>
        {(abiText || bytecode) && (
          <button
            onClick={reset}
            className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3"
            style={{ borderRadius: '4px', color: '#ef4444', borderColor: '#ef4444' }}
          >
            <X size={13} /> Reset
          </button>
        )}
      </div>

      {/* Step progress */}
      <div className="grid grid-cols-5 gap-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-full h-1 rounded-full" style={{
              background: i < step ? '#00f5d4' : i === step && deploying ? '#f59e0b' : '#0d2d3d'
            }} />
            <div className="text-xs font-mono" style={{ color: i < step ? '#00f5d4' : '#2d5a68', fontSize: '9px' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* How-to tip */}
      <div className="cyber-card p-4 flex items-start gap-3" style={{ borderColor: 'rgba(0,245,212,0.15)' }}>
        <Info size={15} style={{ color: '#00f5d4', flexShrink: 0, marginTop: '1px' }} />
        <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>
          <span style={{ color: '#00f5d4' }}>Tip:</span> Use the{' '}
          <span style={{ color: '#f59e0b' }}>Contract Editor</span> tab to write &amp; compile your Solidity,
          then click <span style={{ color: '#f59e0b' }}>ABI / Bytecode</span> → <span style={{ color: '#f59e0b' }}>Export JSON</span>{' '}
          and upload the artifact here. Or paste the ABI &amp; bytecode manually below.
          {savedState?.abiText && (
            <span style={{ color: '#00f5d4' }}> · ✓ Previous session restored</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left: config */}
        <div className="space-y-4">
          <div className="cyber-card p-5 space-y-4">
            <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>CONTRACT DETAILS</div>

            {/* Artifact upload */}
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>LOAD FROM ARTIFACT FILE</label>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="cyber-btn rounded w-full flex items-center justify-center gap-2 text-xs py-2"
                style={{ borderRadius: '4px' }}
              >
                <Upload size={13} />
                Upload Contract.json artifact
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono" style={{ color: '#2d5a68' }}>
              <div style={{ flex: 1, height: '1px', background: '#0d2d3d' }} />
              or paste manually
              <div style={{ flex: 1, height: '1px', background: '#0d2d3d' }} />
            </div>

            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>CONTRACT NAME</label>
              <input
                value={contractName}
                onChange={e => setContractName(e.target.value)}
                className="cyber-input rounded w-full"
                style={{ borderRadius: '4px' }}
                placeholder="MyContract"
              />
            </div>

            {/* Constructor args */}
            {constructorInputs.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>CONSTRUCTOR ARGUMENTS</div>
                {constructorInputs.map((input, i) => (
                  <ArgField
                    key={i}
                    input={input}
                    value={argValues[i] || ''}
                    onChange={(v) => {
                      const next = [...argValues]
                      next[i] = v
                      setArgValues(next)
                    }}
                  />
                ))}
              </div>
            )}

            {parsedAbi && constructorInputs.length === 0 && (
              <div className="text-xs font-mono p-2 rounded" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                ✓ No constructor arguments needed
              </div>
            )}
          </div>

          <div className="cyber-card p-5 space-y-4">
            <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>GAS SETTINGS</div>
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>GAS LIMIT</label>
              <div className="flex gap-2">
                <input
                  value={gasLimit}
                  onChange={e => setGasLimit(e.target.value)}
                  className="cyber-input rounded w-full"
                  style={{ borderRadius: '4px' }}
                  placeholder="auto"
                />
                {gasLimit !== 'auto' && (
                  <button
                    onClick={() => setGasLimit('auto')}
                    className="cyber-btn rounded text-xs px-3 flex-shrink-0"
                    style={{ borderRadius: '4px', color: '#00f5d4', borderColor: '#00f5d4' }}
                  >
                    Auto
                  </button>
                )}
              </div>
              <div className="text-xs font-mono mt-1" style={{ color: '#2d5a68' }}>
                {gasLimit === 'auto'
                  ? '✓ Gas will be estimated automatically (recommended)'
                  : '⚠ Manual gas limit — set to "auto" for optimal fees'
                }
              </div>
            </div>
            <div className="text-xs font-mono p-2 rounded" style={{ background: 'rgba(0,245,212,0.05)', color: '#6b9aaa' }}>
              ⚡ Gas price fetched live from network · no markup applied
              {liveGasPrice && <span style={{ color: '#00f5d4' }}> · Last: {parseFloat(liveGasPrice).toFixed(4)} gwei</span>}
              {estimatedGas && <span style={{ color: '#10b981' }}> · Est. gas: {parseInt(estimatedGas).toLocaleString()}</span>}
              {estimatedCost && <span style={{ color: '#f59e0b' }}> · Est. cost: ~{estimatedCost} SHM</span>}
            </div>
          </div>

          {!walletAddress && (
            <div className="cyber-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>Connect your wallet to deploy</span>
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={deploying || !walletAddress || !parsedAbi || !bytecode}
            className="cyber-btn-primary w-full py-3 rounded flex items-center justify-center gap-2"
            style={{
              borderRadius: '6px',
              opacity: (deploying || !walletAddress || !parsedAbi || !bytecode) ? 0.6 : 1,
              cursor: (deploying || !walletAddress || !parsedAbi || !bytecode) ? 'not-allowed' : 'pointer'
            }}
          >
            {deploying ? <Loader size={16} className="animate-spin" /> : <Rocket size={16} />}
            <span className="font-display font-bold tracking-wider">
              {deploying ? 'DEPLOYING...' : 'DEPLOY CONTRACT'}
            </span>
          </button>
        </div>

        {/* Right: ABI + bytecode */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>
              ABI (JSON)
              {parsedAbi && <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ {parsedAbi.length} entries</span>}
              {abiError && <span style={{ color: '#ef4444', marginLeft: '8px' }}>✗ invalid</span>}
            </label>
            <textarea
              value={abiText}
              onChange={e => handleAbiChange(e.target.value)}
              className="code-editor w-full"
              style={{ height: '200px', fontSize: '11px', borderColor: abiError ? '#ef4444' : undefined }}
              placeholder='Paste ABI array here: [{"inputs":[],"type":"constructor",...}]'
            />
            {abiError && (
              <div className="text-xs font-mono mt-1" style={{ color: '#ef4444' }}>{abiError}</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>
              BYTECODE
              {bytecode && bytecode.length > 10 && (
                <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ {Math.round((bytecode.length - 2) / 2)} bytes</span>
              )}
            </label>
            <textarea
              value={bytecode}
              onChange={e => setBytecode(e.target.value)}
              className="code-editor w-full"
              style={{ height: '120px', fontSize: '11px' }}
              placeholder="0x608060405234801561001057600080fd... (full bytecode)"
            />
          </div>

          {/* Live preview of what's loaded */}
          {parsedAbi && (
            <div className="cyber-card p-3 space-y-1 text-xs font-mono" style={{ borderColor: 'rgba(0,245,212,0.15)' }}>
              <div style={{ color: '#00f5d4' }}>✓ ABI loaded — {parsedAbi.length} entries</div>
              {parsedAbi.filter(e => e.type === 'function').slice(0, 5).map((fn, i) => (
                <div key={i} style={{ color: '#2d5a68' }}>
                  <span style={{ color: '#6b9aaa' }}>fn</span> {fn.name}({fn.inputs?.map(i => i.type).join(', ')})
                  {fn.stateMutability && <span style={{ color: '#0d2d3d' }}> · {fn.stateMutability}</span>}
                </div>
              ))}
              {parsedAbi.filter(e => e.type === 'function').length > 5 && (
                <div style={{ color: '#2d5a68' }}>+{parsedAbi.filter(e => e.type === 'function').length - 5} more functions...</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deploy result */}
      {deployResult && (
        <div className="cyber-card p-5" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} style={{ color: '#10b981' }} />
            <span className="font-display font-bold text-sm" style={{ color: '#10b981' }}>DEPLOYMENT SUCCESSFUL</span>
          </div>
          <div className="space-y-3">
            {[
              ['Contract Address', deployResult.address],
              ['Transaction Hash', deployResult.txHash],
              ['Network', deployResult.network],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: '#6b9aaa' }}>{k}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: '#00f5d4' }}>
                    {typeof v === 'string' && v.length > 30 ? v.slice(0, 22) + '...' : v}
                  </span>
                  {k === 'Contract Address' && (
                    <a href={`${network.explorerUrl}/address/${deployResult.address}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={12} style={{ color: '#2d5a68' }} />
                    </a>
                  )}
                  {k === 'Transaction Hash' && deployResult.txHash && (
                    <a href={`${network.explorerUrl}/tx/${deployResult.txHash}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={12} style={{ color: '#2d5a68' }} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 text-xs font-mono" style={{ borderTop: '1px solid rgba(16,185,129,0.2)', color: '#2d5a68' }}>
            ✓ Saved to Deployed Contracts · ✓ Recorded in Transaction Monitor
          </div>
        </div>
      )}

      {error && (
        <div className="cyber-card p-4 flex items-start gap-3" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div className="text-xs font-mono font-medium mb-1" style={{ color: '#ef4444' }}>DEPLOYMENT FAILED</div>
            <div className="text-xs font-mono" style={{ color: '#6b9aaa', wordBreak: 'break-word' }}>{error}</div>
          </div>
        </div>
      )}
    </div>
  )
}