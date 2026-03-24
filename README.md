# 🔷 Shardeum DevKit

> A comprehensive developer toolkit for building, testing, and deploying dApps on the Shardeum network.

![Shardeum DevKit](https://img.shields.io/badge/Shardeum-DevKit-00f5d4?style=for-the-badge&logo=ethereum)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Ethers.js](https://img.shields.io/badge/Ethers.js-6.x-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

| Feature | Description |
|---|---|
| 📝 **Contract Editor** | Solidity editor with templates (ERC-20, ERC-721, MultiSig, Storage) |
| 🚀 **One-Click Deploy** | Compile & deploy contracts with gas estimation |
| ⚡ **Contract Interact** | Call read/write functions on any deployed contract |
| 📊 **Transaction Monitor** | Track, search, and inspect all transactions |
| 🌐 **Network Monitor** | Live block & gas metrics with charts |
| 🖥️ **Console Logs** | Real-time debug output with filtering |
| 👛 **Wallet Manager** | Connect MetaMask, send SHM, generate wallets |
| ⚙️ **Settings** | Configure networks, gas defaults, preferences |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask browser extension (for wallet features)

### Installation

```bash
# Clone or extract the project
cd shardeum-devkit

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🌐 Supported Networks

| Network | Chain ID | RPC |
|---|---|---|
| Shardeum Mainnet | 8082 | https://api.shardeum.org |
| Shardeum Sphinx 1.X | 8081 | https://sphinx.shardeum.org |
| Shardeum Liberty 2.X | 8080 | https://liberty20.shardeum.org |
| Local Node | 8080 | http://localhost:8080 |

## 📦 CLI Tools

### Deploy a Contract

```bash
# Set your private key
export PRIVATE_KEY=0xyour_private_key_here

# Deploy to Sphinx testnet
node scripts/deploy.js --network sphinx --contract contracts/SimpleStorage.sol

# Deploy to Liberty testnet
node scripts/deploy.js --network liberty
```

### Compile Contracts

```bash
# Compile all contracts in ./contracts/
node scripts/compile.js

# Compile a specific contract
node scripts/compile.js contracts/ShardeumToken.sol
```

### Run Tests

```bash
# Test against Sphinx testnet
node scripts/test-runner.js --network sphinx

# Test against local node
node scripts/test-runner.js --network local
```

## 📂 Project Structure

```
shardeum-devkit/
├── src/
│   ├── contexts/
│   │   └── ShardeumContext.jsx    # Network & wallet state
│   ├── components/
│   │   ├── Sidebar.jsx            # Navigation sidebar
│   │   └── TopBar.jsx             # Network selector & wallet
│   ├── pages/
│   │   ├── Dashboard.jsx          # Overview & quick actions
│   │   ├── ContractEditor.jsx     # Solidity editor
│   │   ├── Deployer.jsx           # Deploy contracts
│   │   ├── ContractInteract.jsx   # Call contract functions
│   │   ├── TxMonitor.jsx          # Transaction tracking
│   │   ├── NetworkMonitor.jsx     # Live network metrics
│   │   ├── LogConsole.jsx         # Debug console
│   │   ├── WalletManager.jsx      # Wallet operations
│   │   └── Settings.jsx           # Configuration
│   ├── App.jsx
│   └── main.jsx
├── contracts/
│   ├── SimpleStorage.sol          # Key-value store example
│   └── ShardeumToken.sol          # ERC-20 token example
├── scripts/
│   ├── compile.js                 # Solidity compiler CLI
│   ├── deploy.js                  # Deployment CLI
│   └── test-runner.js             # Automated test suite
├── deployments/                   # Generated deployment records
├── artifacts/                     # Compiled contract artifacts
└── package.json
```

## 🔧 Adding MetaMask Network

To add Shardeum Sphinx to MetaMask manually:

- **Network Name:** Shardeum Sphinx 1.X
- **RPC URL:** https://sphinx.shardeum.org
- **Chain ID:** 8081
- **Currency Symbol:** SHM
- **Explorer:** https://explorer-sphinx.shardeum.org

## 📝 Writing Contracts

Place your `.sol` files in the `contracts/` directory. The editor includes templates for:

- **ERC-20 Token** — Fungible token with mint, burn, blacklist
- **ERC-721 NFT** — Non-fungible token with public mint
- **Simple Storage** — Key-value store with access control
- **MultiSig Wallet** — Multi-signature transaction approval

## 🧪 Test Suite

The test runner covers:
- Network connectivity
- Chain ID validation
- Block fetching
- Fee data retrieval
- Wallet operations
- ABI encoding/decoding
- Gas estimation
- Message signing

## 🛠️ Build for Production

```bash
npm run build
```

The built files will be in `dist/` — deployable to any static hosting (Vercel, Netlify, IPFS).

## 📄 License

MIT © Shardeum DevKit Contributors

---

Built for the **Shardeum Ecosystem** — the world's first EVM-compatible, linearly scalable blockchain using dynamic state sharding.
