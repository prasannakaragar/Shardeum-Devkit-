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

export function ShardeumProvider({ children }) {
  const [selectedNetwork, setSelectedNetwork] = useState('testnet')
  const [walletAddress, setWalletAddress] = useState(null)
  const [balance, setBalance] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [networkStatus, setNetworkStatus] = useState('checking')
  const [deployedContracts, setDeployedContracts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [logs, setLogs] = useState([])

  const network = SHARDEUM_NETWORKS[selectedNetwork]

  const addLog = useCallback((message, type = 'info') => {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }
    setLogs(prev => [entry, ...prev].slice(0, 200))
  }, [])

  const checkNetworkStatus = useCallback(async () => {
    setNetworkStatus('checking')
    try {
      const p = new ethers.JsonRpcProvider(network.rpcUrl)
      await p.getBlockNumber()
      setProvider(p)
      setNetworkStatus('online')
      addLog(`Connected to ${network.name}`, 'success')
    } catch (e) {
      setNetworkStatus('offline')
      addLog(`Cannot reach ${network.name}: ${e.message}`, 'error')
    }
  }, [network, addLog])

  useEffect(() => {
    checkNetworkStatus()
  }, [selectedNetwork])

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      addLog('MetaMask not found. Please install MetaMask.', 'error')
      return
    }
    try {
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
      addLog(`Wallet connected: ${address.slice(0,6)}...${address.slice(-4)}`, 'success')
    } catch (e) {
      addLog(`Wallet connection failed: ${e.message}`, 'error')
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

  const addTransaction = useCallback((tx) => {
    setTransactions(prev => [tx, ...prev].slice(0, 100))
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
      deployedContracts, addDeployedContract,
      transactions, addTransaction,
      logs, addLog,
      refreshNetwork: checkNetworkStatus,
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