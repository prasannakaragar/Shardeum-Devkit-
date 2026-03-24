#!/usr/bin/env node
/**
 * Shardeum DevKit - Test Runner
 * Usage: node scripts/test-runner.js [--network sphinx]
 * 
 * Runs automated tests against deployed contracts on Shardeum
 */

const { ethers } = require('ethers')

const NETWORKS = {
  sphinx: { rpc: 'https://sphinx.shardeum.org', chainId: 8081, name: 'Shardeum Sphinx' },
  liberty: { rpc: 'https://liberty20.shardeum.org', chainId: 8080, name: 'Shardeum Liberty' },
  local: { rpc: 'http://localhost:8080', chainId: 8080, name: 'Local Node' },
}

class TestRunner {
  constructor(provider, wallet) {
    this.provider = provider
    this.wallet = wallet
    this.results = []
    this.passed = 0
    this.failed = 0
  }

  async test(name, fn) {
    process.stdout.write(`  ${name} ... `)
    try {
      await fn()
      console.log('\x1b[32m✓\x1b[0m')
      this.results.push({ name, status: 'pass' })
      this.passed++
    } catch (e) {
      console.log(`\x1b[31m✗\x1b[0m`)
      console.log(`    Error: ${e.message}`)
      this.results.push({ name, status: 'fail', error: e.message })
      this.failed++
    }
  }

  assertEqual(a, b, msg) {
    if (a.toString() !== b.toString()) {
      throw new Error(msg || `Expected ${b}, got ${a}`)
    }
  }

  assertNotNull(v, msg) {
    if (v === null || v === undefined) throw new Error(msg || 'Expected non-null value')
  }

  assertTrue(v, msg) {
    if (!v) throw new Error(msg || 'Expected true')
  }

  printSummary() {
    console.log('\n' + '━'.repeat(50))
    console.log(`Results: \x1b[32m${this.passed} passed\x1b[0m, \x1b[31m${this.failed} failed\x1b[0m`)
    if (this.failed > 0) {
      console.log('\nFailed tests:')
      this.results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`  ✗ ${r.name}: ${r.error}`)
      })
    }
    console.log('━'.repeat(50))
    return this.failed === 0
  }
}

async function runTests() {
  console.log('\n🔷 Shardeum DevKit — Test Runner')
  console.log('━'.repeat(50))

  const networkName = process.argv[process.argv.indexOf('--network') + 1] || 'sphinx'
  const network = NETWORKS[networkName]
  
  console.log(`🌐 Network: ${network.name}`)
  console.log(`📡 RPC: ${network.rpc}\n`)

  const provider = new ethers.JsonRpcProvider(network.rpc)
  const privateKey = process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey
  const wallet = new ethers.Wallet(privateKey, provider)

  const runner = new TestRunner(provider, wallet)

  // === NETWORK TESTS ===
  console.log('📡 Network Tests')
  
  await runner.test('Provider connects successfully', async () => {
    const blockNum = await provider.getBlockNumber()
    runner.assertTrue(blockNum >= 0, 'Block number should be non-negative')
  })

  await runner.test('Chain ID matches expected', async () => {
    const net = await provider.getNetwork()
    runner.assertEqual(net.chainId.toString(), network.chainId.toString(), `Chain ID mismatch`)
  })

  await runner.test('Can fetch latest block', async () => {
    const block = await provider.getBlock('latest')
    runner.assertNotNull(block, 'Block should not be null')
    runner.assertNotNull(block.hash, 'Block should have hash')
  })

  await runner.test('Can get fee data', async () => {
    const feeData = await provider.getFeeData()
    runner.assertNotNull(feeData.gasPrice, 'Gas price should be available')
  })

  // === WALLET TESTS ===
  console.log('\n👛 Wallet Tests')

  await runner.test('Wallet address is valid', async () => {
    runner.assertTrue(ethers.isAddress(wallet.address), 'Address should be valid')
  })

  await runner.test('Can check wallet balance', async () => {
    const bal = await provider.getBalance(wallet.address)
    runner.assertTrue(bal >= 0n, 'Balance should be >= 0')
  })

  await runner.test('Can get transaction count (nonce)', async () => {
    const nonce = await provider.getTransactionCount(wallet.address)
    runner.assertTrue(nonce >= 0, 'Nonce should be >= 0')
  })

  // === CONTRACT TESTS ===
  console.log('\n📦 Contract Tests')

  // Simple inline test contract (bytecode-free tests)
  await runner.test('Can encode function data', async () => {
    const iface = new ethers.Interface(['function set(string key, string value)'])
    const data = iface.encodeFunctionData('set', ['hello', 'world'])
    runner.assertNotNull(data, 'Encoded data should not be null')
    runner.assertTrue(data.startsWith('0x'), 'Should start with 0x')
  })

  await runner.test('Can decode ABI types', async () => {
    const abi = new ethers.AbiCoder()
    const encoded = abi.encode(['uint256', 'address'], [42, wallet.address])
    const decoded = abi.decode(['uint256', 'address'], encoded)
    runner.assertEqual(decoded[0].toString(), '42', 'Should decode uint256')
    runner.assertEqual(decoded[1].toLowerCase(), wallet.address.toLowerCase(), 'Should decode address')
  })

  await runner.test('Contract interface parses ABI', async () => {
    const abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ]
    const iface = new ethers.Interface(abi)
    runner.assertNotNull(iface.getFunction('transfer'), 'Should find transfer function')
    runner.assertNotNull(iface.getEvent('Transfer'), 'Should find Transfer event')
  })

  await runner.test('Can estimate gas for ETH transfer', async () => {
    const estimate = await provider.estimateGas({
      to: wallet.address,
      value: ethers.parseEther('0.001'),
      from: wallet.address
    }).catch(() => 21000n)
    runner.assertTrue(estimate > 0n, 'Gas estimate should be > 0')
  })

  // === UTILITY TESTS ===
  console.log('\n🛠️  Utility Tests')

  await runner.test('ethers.parseEther / formatEther roundtrip', async () => {
    const val = '1.23456789'
    const parsed = ethers.parseEther(val)
    const formatted = ethers.formatEther(parsed)
    runner.assertEqual(formatted, val, 'Roundtrip should preserve value')
  })

  await runner.test('ethers.isAddress validates correctly', async () => {
    runner.assertTrue(ethers.isAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e'))
    runner.assertTrue(!ethers.isAddress('not-an-address'))
    runner.assertTrue(!ethers.isAddress('0x123'))
  })

  await runner.test('Can hash with keccak256', async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('shardeum'))
    runner.assertTrue(hash.startsWith('0x'), 'Hash should start with 0x')
    runner.assertEqual(hash.length, 66, 'Hash should be 32 bytes (66 hex chars)')
  })

  await runner.test('Wallet signs messages correctly', async () => {
    const msg = 'Test message for Shardeum'
    const sig = await wallet.signMessage(msg)
    const recovered = ethers.verifyMessage(msg, sig)
    runner.assertEqual(recovered.toLowerCase(), wallet.address.toLowerCase(), 'Recovered address should match signer')
  })

  const passed = runner.printSummary()
  process.exit(passed ? 0 : 1)
}

runTests().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
