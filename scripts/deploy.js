#!/usr/bin/env node
/**
 * Shardeum DevKit - Deploy Script
 * Usage: node scripts/deploy.js --network sphinx --contract contracts/SimpleStorage.sol
 */

const { ethers } = require('ethers')
const fs = require('fs')
const path = require('path')

const NETWORKS = {
  mainnet: { rpc: 'https://api.shardeum.org', chainId: 8082 },
  sphinx: { rpc: 'https://sphinx.shardeum.org', chainId: 8081 },
  liberty: { rpc: 'https://liberty20.shardeum.org', chainId: 8080 },
  local: { rpc: 'http://localhost:8080', chainId: 8080 },
}

async function deploy() {
  const args = process.argv.slice(2)
  const networkName = args[args.indexOf('--network') + 1] || 'sphinx'
  const contractPath = args[args.indexOf('--contract') + 1]
  const privateKey = process.env.PRIVATE_KEY

  console.log('\n🔷 Shardeum DevKit — Deploy Script')
  console.log('━'.repeat(50))

  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable not set')
    console.log('   Export your key: export PRIVATE_KEY=0x...')
    process.exit(1)
  }

  const network = NETWORKS[networkName]
  if (!network) {
    console.error(`❌ Unknown network: ${networkName}`)
    console.log('   Available: ' + Object.keys(NETWORKS).join(', '))
    process.exit(1)
  }

  console.log(`🌐 Network: ${networkName} (Chain ID: ${network.chainId})`)
  console.log(`📡 RPC: ${network.rpc}`)

  const provider = new ethers.JsonRpcProvider(network.rpc)
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log(`👛 Deployer: ${wallet.address}`)

  const balance = await provider.getBalance(wallet.address)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} SHM`)

  if (balance === 0n) {
    console.warn('⚠️  Warning: Zero balance. You need SHM for gas.')
  }

  // Load contract artifacts
  let abi, bytecode, contractName

  if (contractPath) {
    // Load from compiled artifacts if exists
    const artifactPath = contractPath.replace('.sol', '.json').replace('contracts/', 'artifacts/')
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
      abi = artifact.abi
      bytecode = artifact.bytecode
      contractName = artifact.contractName
    } else {
      console.error(`❌ Artifact not found: ${artifactPath}`)
      console.log('   Compile first: node scripts/compile.js')
      process.exit(1)
    }
  } else {
    console.log('\n📋 No contract specified, using SimpleStorage example...')
    // Minimal SimpleStorage ABI & bytecode for demo
    contractName = 'SimpleStorage'
    abi = [
      { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
      { "inputs": [{ "name": "key", "type": "string" }, { "name": "value", "type": "string" }], "name": "set", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [{ "name": "key", "type": "string" }], "name": "get", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" }
    ]
    bytecode = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610a6e806100606000396000f3fe'
  }

  console.log(`\n📦 Deploying: ${contractName}`)

  try {
    const factory = new ethers.ContractFactory(abi, bytecode, wallet)
    console.log('⏳ Sending transaction...')

    const contract = await factory.deploy({ gasLimit: 3000000 })
    const txHash = contract.deploymentTransaction()?.hash
    console.log(`📤 TX Hash: ${txHash}`)
    console.log('⏳ Waiting for confirmation...')

    await contract.waitForDeployment()
    const address = await contract.getAddress()

    console.log(`\n✅ Deployed Successfully!`)
    console.log('━'.repeat(50))
    console.log(`📍 Address:  ${address}`)
    console.log(`🔗 TX Hash:  ${txHash}`)
    console.log(`🌐 Explorer: https://explorer-${networkName}.shardeum.org/address/${address}`)

    // Save deployment info
    const deploymentsDir = path.join(process.cwd(), 'deployments')
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true })

    const deploymentInfo = {
      contractName, address, txHash, network: networkName,
      chainId: network.chainId, deployer: wallet.address,
      deployedAt: new Date().toISOString()
    }

    const outPath = path.join(deploymentsDir, `${contractName}-${networkName}.json`)
    fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2))
    console.log(`💾 Saved to: ${outPath}`)

  } catch (e) {
    console.error(`\n❌ Deployment Failed: ${e.message}`)
    if (e.data) console.error(`   Data: ${e.data}`)
    process.exit(1)
  }
}

deploy()
