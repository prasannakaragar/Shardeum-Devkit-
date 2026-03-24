import React, { useState } from 'react'
import { ethers } from 'ethers'
import { Rocket, AlertTriangle, CheckCircle, Loader, ExternalLink } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

const SAMPLE_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "name": "key", "type": "string" }, { "name": "value", "type": "string" }], "name": "set", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "key", "type": "string" }], "name": "get", "outputs": [{ "name": "", "type": "tuple", "components": [{ "name": "value", "type": "string" }, { "name": "timestamp", "type": "uint256" }, { "name": "setter", "type": "address" }] }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getAllKeys", "outputs": [{ "name": "", "type": "string[]" }], "stateMutability": "view", "type": "function" }
]

const SAMPLE_BYTECODE = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610a6e806100606000396000f3fe'

export default function Deployer() {
  const { signer, provider, walletAddress, network, addLog, addDeployedContract, addTransaction } = useShardeum()
  const [contractName, setContractName] = useState('SimpleStorage')
  const [abi, setAbi] = useState(JSON.stringify(SAMPLE_ABI, null, 2))
  const [bytecode, setBytecode] = useState(SAMPLE_BYTECODE)
  const [constructorArgs, setConstructorArgs] = useState('')
  const [gasLimit, setGasLimit] = useState('3000000')
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const [liveGasPrice, setLiveGasPrice] = useState(null)

  const STEPS = ['Validate ABI', 'Encode Constructor', 'Estimate Gas', 'Deploy Transaction', 'Confirm']

  const handleDeploy = async () => {
    if (!signer) {
      setError('Connect your wallet to deploy')
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
      let parsedAbi
      try {
        parsedAbi = JSON.parse(abi)
        addLog(`ABI validated: ${parsedAbi.length} entries`, 'success')
      } catch (e) {
        throw new Error('Invalid ABI JSON: ' + e.message)
      }

      // Step 2: Parse constructor args
      setStep(2)
      addLog('Encoding constructor arguments...', 'info')
      let args = []
      if (constructorArgs.trim()) {
        try {
          args = JSON.parse(constructorArgs)
          if (!Array.isArray(args)) args = [args]
        } catch {
          args = constructorArgs.split(',').map(s => s.trim())
        }
      }
      addLog(`Constructor args: ${args.length > 0 ? args.join(', ') : 'none'}`, 'info')

      // Step 3: Fetch live gas price from network
      setStep(3)
      addLog('Fetching network gas price...', 'info')
      let deployGasPrice
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum)
        const feeData = await web3Provider.getFeeData()
        deployGasPrice = feeData.gasPrice || feeData.maxFeePerGas
        // Add 20% buffer to ensure tx goes through
        deployGasPrice = deployGasPrice * 120n / 100n
        setLiveGasPrice(ethers.formatUnits(deployGasPrice, 'gwei'))
        addLog(`Gas price: ${ethers.formatUnits(deployGasPrice, 'gwei')} gwei`, 'success')
      } catch (e) {
        addLog(`Could not fetch gas price: ${e.message}`, 'error')
        throw new Error('Failed to fetch network gas price. Please try again.')
      }

      // Step 4: Deploy
      setStep(4)
      addLog('Sending deployment transaction...', 'info')
      const factory = new ethers.ContractFactory(parsedAbi, bytecode, signer)

      const contract = await factory.deploy(...args, {
        gasLimit: BigInt(gasLimit),
        gasPrice: deployGasPrice
      })
      addLog(`Transaction sent: ${contract.deploymentTransaction()?.hash}`, 'info')

      // Step 5: Wait for confirmation
      setStep(5)
      addLog('Waiting for confirmation...', 'info')
      await contract.waitForDeployment()
      const address = await contract.getAddress()
      const txHash = contract.deploymentTransaction()?.hash

      setDeployResult({ address, txHash, network: network.name })
      addDeployedContract({
        name: contractName,
        address,
        abi: parsedAbi,
        bytecode,
        network: network.name,
        txHash,
        deployedAt: new Date().toLocaleTimeString()
      })
      addTransaction({
        hash: txHash,
        type: 'Deploy',
        contract: contractName,
        status: 'confirmed',
        timestamp: new Date().toLocaleTimeString()
      })
      addLog(`✓ Contract deployed at ${address}`, 'success')
    } catch (e) {
      setError(e.message || 'Deployment failed')
      addLog(`Deployment failed: ${e.message}`, 'error')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>DEPLOY CONTRACT</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Compile & deploy smart contracts to {network.name}</p>
      </div>

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

      <div className="grid grid-cols-2 gap-5">
        {/* Left: config */}
        <div className="space-y-4">
          <div className="cyber-card p-5 space-y-4">
            <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>CONTRACT DETAILS</div>

            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>CONTRACT NAME</label>
              <input value={contractName} onChange={e => setContractName(e.target.value)}
                className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} placeholder="MyContract" />
            </div>

            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>CONSTRUCTOR ARGS (JSON array)</label>
              <input value={constructorArgs} onChange={e => setConstructorArgs(e.target.value)}
                className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} placeholder='["arg1", 100, "0x..."]' />
            </div>
          </div>

          <div className="cyber-card p-5 space-y-4">
            <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>GAS SETTINGS</div>
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>GAS LIMIT</label>
              <input value={gasLimit} onChange={e => setGasLimit(e.target.value)}
                className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} />
            </div>
            <div className="text-xs font-mono p-2 rounded" style={{ background: 'rgba(0,245,212,0.05)', color: '#6b9aaa' }}>
              ⚡ Gas price is fetched automatically from the network at deploy time
              {liveGasPrice && <span style={{ color: '#00f5d4' }}> · Last: {parseFloat(liveGasPrice).toLocaleString()} gwei</span>}
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
            disabled={deploying || !walletAddress}
            className="cyber-btn-primary w-full py-3 rounded flex items-center justify-center gap-2"
            style={{ borderRadius: '6px', opacity: (deploying || !walletAddress) ? 0.6 : 1, cursor: (deploying || !walletAddress) ? 'not-allowed' : 'pointer' }}
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
            <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>ABI (JSON)</label>
            <textarea value={abi} onChange={e => setAbi(e.target.value)}
              className="code-editor w-full" style={{ height: '200px', fontSize: '11px' }} />
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: '#6b9aaa' }}>BYTECODE</label>
            <textarea value={bytecode} onChange={e => setBytecode(e.target.value)}
              className="code-editor w-full" style={{ height: '100px', fontSize: '11px' }}
              placeholder="0x608060405234801561001057600080fd..." />
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
            <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>{error}</div>
          </div>
        </div>
      )}
    </div>
  )
}