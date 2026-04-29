import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'

const ShardeumContext = createContext(null)

export const SHARDEUM_NETWORKS = {
  testnet: {
    name: 'Shardeum EVM Testnet',
    chainId: '0x1FB7', // 8119
    rpcUrl: 'https://api-mezame.shardeum.org',
    explorerUrl: 'https://explorer-mezame.shardeum.org',
    symbol: 'SHM',
    color: '#8b5cf6',
  },
  mainnet: {
    name: 'Shardeum Mainnet',
    chainId: '0x1FB6', // 8118
    rpcUrl: 'https://api.shardeum.org',
    explorerUrl: 'https://explorer.shardeum.org',
    symbol: 'SHM',
    color: '#00f5d4',
  },
  localnet: {
    name: 'Local Shardeum Node',
    chainId: '0x1FB7', // 8119
    rpcUrl: 'http://localhost:8080',
    explorerUrl: 'http://localhost:6001',
    symbol: 'SHM',
    color: '#f59e0b',
  }
}

// Safely read from localStorage
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Safely write to localStorage
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

export function ShardeumProvider({ children }) {
  const [selectedNetwork, setSelectedNetwork] = useState(
    () => loadFromStorage('shardeum_network', 'testnet')
  )
  const [walletAddress, setWalletAddress] = useState(null)
  const [balance, setBalance] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [networkStatus, setNetworkStatus] = useState('checking')
  const [deployedContracts, setDeployedContracts] = useState(
    () => loadFromStorage('shardeum_contracts', [])
  )
  const [transactions, setTransactions] = useState(
    () => loadFromStorage('shardeum_transactions', [])
  )
  const [logs, setLogs] = useState([])

  const network = SHARDEUM_NETWORKS[selectedNetwork] || SHARDEUM_NETWORKS.testnet

  // Persist network preference
  useEffect(() => {
    saveToStorage('shardeum_network', selectedNetwork)
  }, [selectedNetwork])

  // Persist deployed contracts
  useEffect(() => {
    saveToStorage('shardeum_contracts', deployedContracts)
  }, [deployedContracts])

  // Persist transactions
  useEffect(() => {
    saveToStorage('shardeum_transactions', transactions)
  }, [transactions])

  const addLog = useCallback((message, type = 'info') => {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }
    setLogs(prev => [entry, ...prev].slice(0, 500))
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const refreshBalance = useCallback(async (address, web3Provider) => {
    if (!address || !web3Provider) return
    try {
      const bal = await web3Provider.getBalance(address)
      setBalance(ethers.formatEther(bal))
    } catch {
      // silently fail — balance will just stay stale
    }
  }, [])

  const checkNetworkStatus = useCallback(async () => {
    setNetworkStatus('checking')
    try {
      const p = new ethers.JsonRpcProvider(network.rpcUrl)
      // Use a short timeout so we don't hang
      const blockPromise = p.getBlockNumber()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      )
      await Promise.race([blockPromise, timeoutPromise])
      setProvider(p)
      setNetworkStatus('online')
      addLog(`Connected to ${network.name}`, 'success')
    } catch (e) {
      setNetworkStatus('offline')
      addLog(`Cannot reach ${network.name}: ${e.message}`, 'error')
    }
  }, [network, addLog])

  // Re-check on network switch, and refresh wallet balance if connected
  useEffect(() => {
    checkNetworkStatus()
  }, [selectedNetwork]) // eslint-disable-line react-hooks/exhaustive-deps

  // When wallet is connected and network changes, re-fetch balance with new provider
  useEffect(() => {
    if (walletAddress && window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      refreshBalance(walletAddress, web3Provider)
    }
  }, [selectedNetwork, walletAddress, refreshBalance])

  // Listen for MetaMask account/chain changes
  useEffect(() => {
    if (!window.ethereum) return
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setWalletAddress(null)
        setSigner(null)
        setBalance(null)
        addLog('Wallet disconnected via MetaMask', 'info')
      } else {
        setWalletAddress(accounts[0])
        const web3Provider = new ethers.BrowserProvider(window.ethereum)
        refreshBalance(accounts[0], web3Provider)
        addLog(`Account changed: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`, 'info')
      }
    }
    const handleChainChanged = () => {
      addLog('Chain changed in MetaMask — refreshing...', 'info')
      window.location.reload()
    }
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [addLog, refreshBalance])

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      addLog('MetaMask not found. Please install MetaMask.', 'error')
      return
    }
    try {
      // Force account selection dialog in MetaMask instead of auto-connecting
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      })
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      // Try to switch to the selected network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: network.chainId }],
        })
      } catch (switchError) {
        // Network not added yet — add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: network.chainId,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              nativeCurrency: { name: network.symbol, symbol: network.symbol, decimals: 18 },
              blockExplorerUrls: [network.explorerUrl],
            }],
          })
        } else {
          throw switchError
        }
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const web3Signer = await web3Provider.getSigner()
      const address = await web3Signer.getAddress()
      const bal = await web3Provider.getBalance(address)
      setWalletAddress(address)
      setSigner(web3Signer)
      setBalance(ethers.formatEther(bal))
      addLog(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`, 'success')
    } catch (e) {
      if (e.code === 4001) {
        addLog('Wallet connection rejected by user', 'warn')
      } else {
        addLog(`Wallet connection failed: ${e.message}`, 'error')
      }
    }
  }, [addLog, network])

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null)
    setSigner(null)
    setBalance(null)
    addLog('Wallet disconnected', 'info')
  }, [addLog])

  const addDeployedContract = useCallback((contract) => {
    setDeployedContracts(prev => [contract, ...prev])
  }, [])

  const clearDeployedContracts = useCallback(() => {
    setDeployedContracts([])
    saveToStorage('shardeum_contracts', [])
  }, [])

  const addTransaction = useCallback((tx) => {
    setTransactions(prev => [tx, ...prev].slice(0, 200))
  }, [])

  const clearTransactions = useCallback(() => {
    setTransactions([])
    saveToStorage('shardeum_transactions', [])
  }, [])

  return (
    <ShardeumContext.Provider value={{
      selectedNetwork, setSelectedNetwork,
      network,
      networks: SHARDEUM_NETWORKS,
      walletAddress, balance,
      provider, signer,
      networkStatus,
      connectWallet, disconnectWallet,
      deployedContracts, addDeployedContract, clearDeployedContracts,
      transactions, addTransaction, clearTransactions,
      logs, addLog, clearLogs,
      refreshNetwork: checkNetworkStatus,
      refreshBalance,
    }}>
      {children}
    </ShardeumContext.Provider>
  )
}

export function useShardeum() {
  const ctx = useContext(ShardeumContext)
  if (!ctx) throw new Error('useShardeum must be used inside ShardeumProvider')
  return ctx
}