import React, { useState, useRef } from 'react'
import { ethers } from 'ethers'
import { Rocket, AlertTriangle, CheckCircle, Loader, ExternalLink, Upload, Info, X } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

// Parse constructor inputs from ABI to build typed arg fields
function getConstructorInputs(parsedAbi) {
  const ctor = parsedAbi.find(e => e.type === 'constructor')
  return ctor ? ctor.inputs || [] : []
}

// Coerce a string arg to the right JS/ethers type based on Solidity type
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
    // Array type — expect JSON
    try { return JSON.parse(v) } catch {
      throw new Error(`Expected JSON array for ${solidityType}, got: "${v}"`)
    }
  }
  // bytes32, bytes, string — return as-is
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

export default function Deployer() {
  const { signer, walletAddress, network, addLog, addDeployedContract, addTransaction } = useShardeum()

  const [contractName, setContractName] = useState('')
  const [abiText, setAbiText] = useState('')
  const [bytecode, setBytecode] = useState('')
  const [gasLimit, setGasLimit] = useState('3000000')

  // Parsed state
  const [parsedAbi, setParsedAbi] = useState(null)
  const [constructorInputs, setConstructorInputs] = useState([])
  const [argValues, setArgValues] = useState([]) // parallel array of string values

  const [abiError, setAbiError] = useState(null)
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const [liveGasPrice, setLiveGasPrice] = useState(null)

  const fileInputRef = useRef(null)

  const STEPS = ['Validate ABI', 'Encode Constructor', 'Estimate Gas', 'Deploy Transaction', 'Confirm']

  // Parse ABI whenever the user edits it
  const handleAbiChange = (text) => {
    setAbiText(text)
    setAbiError(null)
    setParsedAbi(null)
    setConstructorInputs([])
    setArgValues([])
    if (!text.trim()) return
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) throw new Error('ABI must be a JSON array')
      const inputs = getConstructorInputs(parsed)
      setParsedAbi(parsed)
      setConstructorInputs(inputs)
      setArgValues(inputs.map(() => ''))
    } catch (e) {
      setAbiError('Invalid ABI: ' + e.message)
    }
  }

  // Load from a compiled artifact JSON file (contains abi + bytecode fields)
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const artifact = JSON.parse(ev.target.result)
        // Support both Hardhat artifacts and our compile.js output
        const abi = artifact.abi
        const bc = artifact.bytecode || artifact.evm?.bytecode?.object
        const name = artifact.contractName || artifact.name || file.name.replace('.json', '')
        if (!abi) throw new Error('No "abi" field found in JSON')
        if (!bc) throw new Error('No "bytecode" field found in JSON')
        setContractName(name)
        setAbiText(JSON.stringify(abi, null, 2))
        setBytecode(bc.startsWith('0x') ? bc : '0x' + bc)
        handleAbiChange(JSON.stringify(abi, null, 2))
        addLog(`Loaded artifact: ${name}`, 'success')
      } catch (err) {
        addLog(`Failed to load artifact: ${err.message}`, 'error')
        setAbiError(err.message)
      }
    }
    reader.readAsText(file)
    // Reset so same file can be re-uploaded
    e.target.value = ''
  }

  const handleDeploy = async () => {
    if (!signer) { setError('Connect your wallet to deploy'); return }
    if (!abiText.trim()) { setError('Paste your contract ABI first'); return }
    if (!bytecode.trim()) { setError('Paste your contract bytecode first'); return }
    if (!parsedAbi) { setError(abiError || 'Fix ABI errors first'); return }

    const bc = bytecode.trim()
    if (bc === '0x' || bc.length < 10) {
      setError('Bytecode looks empty or invalid. Run compile.js first and paste the output bytecode.')
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
        args = constructorInputs.map((input, i) => {
          return coerceArg(argValues[i] || '', input.type)
        })
      }
      addLog(`Constructor args: ${args.length > 0 ? JSON.stringify(args.map(String)) : 'none'}`, 'info')

      // Step 3: Fetch live gas price
      setStep(3)
      addLog('Fetching network gas price...', 'info')
      let deployGasPrice
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum)
        const feeData = await web3Provider.getFeeData()
        deployGasPrice = feeData.gasPrice || feeData.maxFeePerGas
        if (!deployGasPrice) throw new Error('Gas price unavailable')
        // Add 20% buffer
        deployGasPrice = deployGasPrice * 120n / 100n
        setLiveGasPrice(ethers.formatUnits(deployGasPrice, 'gwei'))
        addLog(`Gas price: ${parseFloat(ethers.formatUnits(deployGasPrice, 'gwei')).toFixed(4)} gwei`, 'success')
      } catch (e) {
        addLog(`Could not fetch gas price: ${e.message}`, 'error')
        throw new Error('Failed to fetch network gas price. Is your wallet connected to the right network?')
      }

      // Step 4: Deploy
      setStep(4)
      addLog('Sending deployment transaction...', 'info')
      const factory = new ethers.ContractFactory(parsedAbi, bc, signer)
      const contract = await factory.deploy(...args, {
        gasLimit: BigInt(gasLimit),
        gasPrice: deployGasPrice
      })
      const txHash = contract.deploymentTransaction()?.hash
      addLog(`Transaction sent: ${txHash}`, 'info')

      // Step 5: Wait for confirmation
      setStep(5)
      addLog('Waiting for confirmation...', 'info')
      await contract.waitForDeployment()
      const address = await contract.getAddress()

      const finalName = contractName.trim() || 'MyContract'
      setDeployResult({ address, txHash, network: network.name })
      addDeployedContract({
        name: finalName,
        address,
        abi: parsedAbi,
        bytecode: bc,
        network: network.name,
        txHash,
        deployedAt: new Date().toLocaleTimeString()
      })
      addTransaction({
        hash: txHash,
        type: 'Deploy',
        contract: finalName,
        status: 'confirmed',
        timestamp: new Date().toLocaleTimeString()
      })
      addLog(`✓ Contract deployed at ${address}`, 'success')
    } catch (e) {
      const msg = e.reason || e.shortMessage || e.message || 'Deployment failed'
      setError(msg)
      addLog(`Deployment failed: ${msg}`, 'error')
    } finally {
      setDeploying(false)
    }
  }

  const reset = () => {
    setContractName('')
    setAbiText('')
    setBytecode('')
    setParsedAbi(null)
    setConstructorInputs([])
    setArgValues([])
    setAbiError(null)
    setDeployResult(null)
    setError(null)
    setStep(0)
    setLiveGasPrice(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>DEPLOY CONTRACT</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Deploy smart contracts to {network.name}</p>
        </div>
        {(abiText || bytecode) && (
          <button onClick={reset} className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3" style={{ borderRadius: '4px', color: '#ef4444', borderColor: '#ef4444' }}>
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

      {/* How to get bytecode tip */}
      <div className="cyber-card p-4 flex items-start gap-3" style={{ borderColor: 'rgba(0,245,212,0.15)' }}>
        <Info size={15} style={{ color: '#00f5d4', flexShrink: 0, marginTop: '1px' }} />
        <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>
          <span style={{ color: '#00f5d4' }}>How to get ABI & Bytecode:</span> Run <code style={{ color: '#f59e0b' }}>npm install solc</code> then <code style={{ color: '#f59e0b' }}>node scripts/compile.js</code> — this creates <code style={{ color: '#00f5d4' }}>artifacts/YourContract.json</code>.
          Upload that file below, or copy-paste the <code style={{ color: '#f59e0b' }}>abi</code> and <code style={{ color: '#f59e0b' }}>bytecode</code> fields manually.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left: config */}
        <div className="space-y-4">
          <div className="cyber-card p-5 space-y-4">
            <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>CONTRACT DETAILS</div>

            {/* Artifact file upload */}
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>LOAD FROM ARTIFACT FILE</label>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="cyber-btn rounded w-full flex items-center justify-center gap-2 text-xs py-2"
                style={{ borderRadius: '4px' }}>
                <Upload size={13} />
                Upload artifacts/Contract.json
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono" style={{ color: '#2d5a68' }}>
              <div style={{ flex: 1, height: '1px', background: '#0d2d3d' }} />
              or paste manually
              <div style={{ flex: 1, height: '1px', background: '#0d2d3d' }} />
            </div>

            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>CONTRACT NAME</label>
              <input value={contractName} onChange={e => setContractName(e.target.value)}
                className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} placeholder="MyContract" />
            </div>

            {/* Dynamic constructor arg fields */}
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
              <input value={gasLimit} onChange={e => setGasLimit(e.target.value)}
                className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} />
            </div>
            <div className="text-xs font-mono p-2 rounded" style={{ background: 'rgba(0,245,212,0.05)', color: '#6b9aaa' }}>
              ⚡ Gas price fetched live from network at deploy time
              {liveGasPrice && <span style={{ color: '#00f5d4' }}> · Last: {parseFloat(liveGasPrice).toFixed(4)} gwei</span>}
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
            style={{ borderRadius: '6px', opacity: (deploying || !walletAddress || !parsedAbi || !bytecode) ? 0.6 : 1, cursor: (deploying || !walletAddress || !parsedAbi || !bytecode) ? 'not-allowed' : 'pointer' }}
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
              placeholder="0x608060405234801561001057600080fd... (full bytecode from artifacts/)"
            />
          </div>
        </div>
      </div>

      {/* Result */}
      {deployResult && (
        <div className="cyber-card p-5" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} style={{ color: '#10b981' }} />
            <span className="font-display font-bold text-sm" style={{ color: '#10b981' }}>DEPLOYMENT SUCCESSFUL</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono" style={{ color: '#6b9aaa' }}>Contract Address</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: '#00f5d4' }}>{deployResult.address}</span>
                <a href={`${network.explorerUrl}/address/${deployResult.address}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} style={{ color: '#2d5a68' }} />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono" style={{ color: '#6b9aaa' }}>Transaction Hash</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: '#00f5d4' }}>
                  {deployResult.txHash?.slice(0, 20)}...
                </span>
                <a href={`${network.explorerUrl}/tx/${deployResult.txHash}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} style={{ color: '#2d5a68' }} />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono" style={{ color: '#6b9aaa' }}>Network</span>
              <span className="tag text-xs">{deployResult.network}</span>
            </div>
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