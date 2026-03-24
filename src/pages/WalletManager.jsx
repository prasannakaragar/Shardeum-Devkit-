import React, { useState } from 'react'
import { ethers } from 'ethers'
import { Wallet, Copy, RefreshCw, Send, Eye, EyeOff, AlertTriangle, CheckCircle, Loader } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

export default function WalletManager() {
  const { walletAddress, balance, connectWallet, disconnectWallet, signer, provider, network, addLog, addTransaction } = useShardeum()

  const [sendTo, setSendTo] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [sendError, setSendError] = useState(null)

  const [genPrivKey, setGenPrivKey] = useState('')
  const [genAddress, setGenAddress] = useState('')
  const [showPrivKey, setShowPrivKey] = useState(false)

  const [importPrivKey, setImportPrivKey] = useState('')
  const [importedAddress, setImportedAddress] = useState(null)

  const [copied, setCopied] = useState('')

  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const generateWallet = () => {
    const wallet = ethers.Wallet.createRandom()
    setGenPrivKey(wallet.privateKey)
    setGenAddress(wallet.address)
    addLog(`Generated new wallet: ${wallet.address}`, 'success')
  }

  const importWallet = () => {
    try {
      const wallet = new ethers.Wallet(importPrivKey)
      setImportedAddress(wallet.address)
      addLog(`Imported wallet: ${wallet.address}`, 'success')
    } catch (e) {
      addLog('Invalid private key: ' + e.message, 'error')
    }
  }

  const sendSHM = async () => {
    if (!signer) { setSendError('Connect wallet first'); return }
    if (!ethers.isAddress(sendTo)) { setSendError('Invalid address'); return }
    if (!sendAmount || isNaN(parseFloat(sendAmount))) { setSendError('Invalid amount'); return }

    setSending(true)
    setSendError(null)
    setSendResult(null)

    try {
      const tx = await signer.sendTransaction({
        to: sendTo,
        value: ethers.parseEther(sendAmount)
      })
      addLog(`Sent ${sendAmount} SHM to ${sendTo}: ${tx.hash}`, 'info')
      const receipt = await tx.wait()
      setSendResult({ hash: tx.hash, status: receipt.status === 1 ? 'confirmed' : 'failed' })
      addTransaction({ hash: tx.hash, type: 'Transfer', status: 'confirmed', timestamp: new Date().toLocaleTimeString() })
      addLog(`Transfer confirmed: ${tx.hash}`, 'success')
    } catch (e) {
      setSendError(e.reason || e.message)
      addLog('Transfer failed: ' + e.message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>WALLET MANAGER</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Manage wallets, balances, and transfers</p>
      </div>

      {/* Connected wallet */}
      <div className="cyber-card p-5" style={{ borderColor: walletAddress ? 'rgba(0,245,212,0.3)' : '#0d2d3d' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>CONNECTED WALLET</div>
          {walletAddress ? (
            <button onClick={disconnectWallet} className="cyber-btn text-xs py-1 px-3 rounded" style={{ borderRadius: '4px', color: '#ef4444', borderColor: '#ef4444' }}>
              Disconnect
            </button>
          ) : (
            <button onClick={connectWallet} className="cyber-btn-primary text-xs py-1.5 px-4 rounded" style={{ borderRadius: '4px' }}>
              Connect MetaMask
            </button>
          )}
        </div>

        {walletAddress ? (
          <div className="space-y-3">
            <div className="p-3 rounded" style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.15)' }}>
              <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>ADDRESS</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm" style={{ color: '#00f5d4' }}>{walletAddress}</span>
                <button onClick={() => copy(walletAddress, 'addr')}>
                  <Copy size={13} style={{ color: copied === 'addr' ? '#00f5d4' : '#2d5a68' }} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded text-center" style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid #0d2d3d' }}>
                <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>BALANCE</div>
                <div className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>
                  {parseFloat(balance || 0).toFixed(4)}
                </div>
                <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>SHM</div>
              </div>
              <div className="p-3 rounded text-center" style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid #0d2d3d' }}>
                <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>NETWORK</div>
                <div className="font-mono text-sm" style={{ color: '#8b5cf6' }}>{network.symbol}</div>
                <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>{network.name.split(' ').slice(0, 2).join(' ')}</div>
              </div>
              <div className="p-3 rounded text-center" style={{ background: 'rgba(0,245,212,0.03)', border: '1px solid #0d2d3d' }}>
                <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>CHAIN ID</div>
                <div className="font-display text-lg font-bold" style={{ color: '#f59e0b' }}>{parseInt(network.chainId, 16)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Wallet size={40} style={{ color: '#0d2d3d', margin: '0 auto 12px' }} />
            <div className="text-sm font-mono" style={{ color: '#2d5a68' }}>No wallet connected</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Send SHM */}
        <div className="cyber-card p-5 space-y-4">
          <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>SEND SHM</div>
          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>RECIPIENT ADDRESS</label>
            <input value={sendTo} onChange={e => setSendTo(e.target.value)}
              className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} placeholder="0x..." />
          </div>
          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: '#6b9aaa' }}>AMOUNT (SHM)</label>
            <input value={sendAmount} onChange={e => setSendAmount(e.target.value)}
              className="cyber-input rounded w-full" style={{ borderRadius: '4px' }} placeholder="0.0" type="number" />
          </div>
          {balance && sendAmount && (
            <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>
              Balance after: {(parseFloat(balance) - parseFloat(sendAmount || 0)).toFixed(4)} SHM
            </div>
          )}
          <button onClick={sendSHM} disabled={sending || !walletAddress}
            className="cyber-btn-primary w-full py-2.5 rounded flex items-center justify-center gap-2 text-sm"
            style={{ borderRadius: '4px', opacity: (sending || !walletAddress) ? 0.6 : 1 }}>
            {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending...' : 'Send SHM'}
          </button>
          {sendResult && (
            <div className="p-3 rounded text-xs font-mono" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={13} />
                Transfer {sendResult.status}
              </div>
              <div style={{ color: '#6b9aaa', wordBreak: 'break-all' }}>{sendResult.hash}</div>
            </div>
          )}
          {sendError && (
            <div className="p-3 rounded text-xs font-mono" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              {sendError}
            </div>
          )}
        </div>

        {/* Generate / Import */}
        <div className="space-y-4">
          {/* Generate */}
          <div className="cyber-card p-5 space-y-3">
            <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>GENERATE WALLET</div>
            <p className="text-xs font-mono" style={{ color: '#2d5a68' }}>Create a new Shardeum-compatible wallet keypair</p>
            <button onClick={generateWallet} className="cyber-btn w-full py-2 rounded text-sm flex items-center justify-center gap-2" style={{ borderRadius: '4px' }}>
              <RefreshCw size={14} />
              Generate New Wallet
            </button>
            {genAddress && (
              <div className="space-y-2">
                <div className="p-2 rounded" style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.15)' }}>
                  <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>ADDRESS</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs truncate" style={{ color: '#00f5d4' }}>{genAddress}</span>
                    <button onClick={() => copy(genAddress, 'genAddr')}><Copy size={11} style={{ color: '#2d5a68' }} /></button>
                  </div>
                </div>
                <div className="p-2 rounded" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono" style={{ color: '#2d5a68' }}>PRIVATE KEY</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowPrivKey(!showPrivKey)}>
                        {showPrivKey ? <EyeOff size={11} style={{ color: '#2d5a68' }} /> : <Eye size={11} style={{ color: '#2d5a68' }} />}
                      </button>
                      <button onClick={() => copy(genPrivKey, 'privKey')}><Copy size={11} style={{ color: '#2d5a68' }} /></button>
                    </div>
                  </div>
                  <span className="font-mono text-xs break-all" style={{ color: '#ef4444' }}>
                    {showPrivKey ? genPrivKey : '•'.repeat(64)}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded text-xs font-mono" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                  <AlertTriangle size={12} />
                  Never share your private key with anyone
                </div>
              </div>
            )}
          </div>

          {/* Import */}
          <div className="cyber-card p-5 space-y-3">
            <div className="text-xs font-mono" style={{ color: '#00f5d4' }}>DERIVE ADDRESS FROM KEY</div>
            <input value={importPrivKey} onChange={e => setImportPrivKey(e.target.value)}
              className="cyber-input rounded w-full" style={{ borderRadius: '4px' }}
              placeholder="0x private key..." type="password" />
            <button onClick={importWallet} className="cyber-btn w-full py-2 rounded text-sm" style={{ borderRadius: '4px' }}>
              Derive Address
            </button>
            {importedAddress && (
              <div className="p-2 rounded" style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.15)' }}>
                <div className="text-xs font-mono mb-1" style={{ color: '#2d5a68' }}>DERIVED ADDRESS</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs" style={{ color: '#00f5d4' }}>{importedAddress}</span>
                  <button onClick={() => copy(importedAddress, 'imp')}><Copy size={11} style={{ color: '#2d5a68' }} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
