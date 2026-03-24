#!/usr/bin/env node
/**
 * Shardeum DevKit - Solidity Compiler
 * Usage: node scripts/compile.js [path/to/Contract.sol]
 */

const fs = require('fs')
const path = require('path')

async function compile() {
  console.log('\n🔷 Shardeum DevKit — Solidity Compiler')
  console.log('━'.repeat(50))

  const contractArg = process.argv[2]
  const contractsDir = path.join(process.cwd(), 'contracts')
  const artifactsDir = path.join(process.cwd(), 'artifacts')

  if (!fs.existsSync(contractsDir)) {
    console.error('❌ No contracts/ directory found')
    process.exit(1)
  }

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true })
  }

  let files = []
  if (contractArg) {
    if (!fs.existsSync(contractArg)) {
      console.error(`❌ File not found: ${contractArg}`)
      process.exit(1)
    }
    files = [contractArg]
  } else {
    files = fs.readdirSync(contractsDir)
      .filter(f => f.endsWith('.sol'))
      .map(f => path.join(contractsDir, f))
  }

  if (files.length === 0) {
    console.log('⚠️  No .sol files found in contracts/')
    return
  }

  console.log(`📁 Found ${files.length} contract(s)`)

  // Try to use solc if available
  let solc
  try {
    solc = require('solc')
    console.log(`🔧 Using solc ${solc.version()}`)
  } catch {
    console.log('⚠️  solc not installed. Run: npm install solc')
    console.log('   Generating placeholder artifacts...\n')
  }

  let compiled = 0, errors = 0

  for (const filePath of files) {
    const fileName = path.basename(filePath)
    const source = fs.readFileSync(filePath, 'utf8')
    console.log(`\n📄 Compiling: ${fileName}`)

    if (!solc) {
      // Placeholder artifact
      const contractName = fileName.replace('.sol', '')
      const artifact = {
        contractName,
        abi: [],
        bytecode: '0x',
        source,
        compiledAt: new Date().toISOString(),
        note: 'Install solc for real compilation'
      }
      const outPath = path.join(artifactsDir, fileName.replace('.sol', '.json'))
      fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2))
      console.log(`   ✅ Placeholder saved: ${path.basename(outPath)}`)
      compiled++
      continue
    }

    // Real compilation
    const input = {
      language: 'Solidity',
      sources: { [fileName]: { content: source } },
      settings: {
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'] } },
        optimizer: { enabled: true, runs: 200 }
      }
    }

    try {
      const output = JSON.parse(solc.compile(JSON.stringify(input)))

      if (output.errors) {
        const errs = output.errors.filter(e => e.severity === 'error')
        const warns = output.errors.filter(e => e.severity === 'warning')
        if (warns.length) console.log(`   ⚠️  ${warns.length} warning(s)`)
        if (errs.length) {
          errs.forEach(e => console.error(`   ❌ ${e.message}`))
          errors++
          continue
        }
      }

      const contracts = output.contracts[fileName]
      for (const [contractName, contract] of Object.entries(contracts)) {
        const artifact = {
          contractName,
          abi: contract.abi,
          bytecode: '0x' + contract.evm.bytecode.object,
          deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
          source,
          compiledAt: new Date().toISOString()
        }
        const outPath = path.join(artifactsDir, `${contractName}.json`)
        fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2))
        console.log(`   ✅ ${contractName} → artifacts/${contractName}.json`)
        console.log(`      ABI: ${contract.abi.length} entries | Bytecode: ${Math.round(contract.evm.bytecode.object.length / 2)} bytes`)
        compiled++
      }
    } catch (e) {
      console.error(`   ❌ Compilation error: ${e.message}`)
      errors++
    }
  }

  console.log('\n' + '━'.repeat(50))
  console.log(`✅ Compiled: ${compiled} contract(s)`)
  if (errors > 0) console.log(`❌ Failed: ${errors} contract(s)`)
  console.log(`📁 Artifacts saved to: ./artifacts/`)
}

compile()
