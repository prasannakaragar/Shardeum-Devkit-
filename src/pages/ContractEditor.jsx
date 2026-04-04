import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Copy, Download, BookOpen, ChevronDown, ChevronUp,
  Plus, X, Play, Zap, AlertCircle, CheckCircle, Loader,
  FileCode, Trash2, ChevronRight
} from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'
import { ethers } from 'ethers'
import DebugAssistant from '../components/DebugAssistant'

// ─── Storage helpers ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'shardeum_editor_contracts'
const ACTIVE_KEY  = 'shardeum_editor_active'

function loadContracts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveContracts(contracts) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts)) } catch {}
}

function loadActive() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveActive(id) {
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(id)) } catch {}
}

// ─── Templates ───────────────────────────────────────────────────────────────
const TEMPLATES = {
  storage: {
    name: 'Simple Storage',
    description: 'Basic key-value storage',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleStorage
 * @dev A basic key-value store demonstrating Shardeum state
 */
contract SimpleStorage {
    struct DataEntry {
        string value;
        uint256 timestamp;
        address setter;
    }
    
    mapping(string => DataEntry) private store;
    string[] private keys;
    address public owner;
    
    event DataSet(string indexed key, string value, address indexed setter);
    event DataDeleted(string indexed key);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function set(string memory key, string memory value) external {
        require(bytes(key).length > 0, "Key cannot be empty");
        require(bytes(value).length > 0, "Value cannot be empty");
        
        if (bytes(store[key].value).length == 0) {
            keys.push(key);
        }
        
        store[key] = DataEntry({
            value: value,
            timestamp: block.timestamp,
            setter: msg.sender
        });
        
        emit DataSet(key, value, msg.sender);
    }

    function get(string memory key) external view returns (DataEntry memory) {
        return store[key];
    }

    function getAllKeys() external view returns (string[] memory) {
        return keys;
    }
}`
  },
  erc20: {
    name: 'ERC-20 Token',
    description: 'Standard fungible token',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ShardeumToken
 * @dev Minimal ERC-20 token for Shardeum
 */
contract ShardeumToken {
    string public name;
    string public symbol;
    uint8  public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        _mint(msg.sender, _initialSupply * 10 ** decimals);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Allowance exceeded");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}`
  },
  erc721: {
    name: 'ERC-721 NFT',
    description: 'Non-fungible token',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ShardeumNFT
 * @dev Minimal ERC-721 NFT for Shardeum
 */
contract ShardeumNFT {
    string public name;
    string public symbol;

    uint256 private _tokenIds;
    uint256 public mintPrice = 0.01 ether;
    uint256 public maxSupply = 10000;
    bool public publicMintOpen = false;
    address public owner;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(uint256 => string)  private _tokenURIs;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event NFTMinted(address indexed to, uint256 tokenId, string uri);

    constructor() {
        name = "ShardeumNFT";
        symbol = "SNFT";
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function mint(address to, string memory tokenURI) external payable returns (uint256) {
        require(publicMintOpen || msg.sender == owner, "Minting not open");
        require(msg.value >= mintPrice || msg.sender == owner, "Insufficient payment");
        require(_tokenIds < maxSupply, "Max supply reached");

        _tokenIds++;
        uint256 newId = _tokenIds;
        _owners[newId] = to;
        _balances[to]++;
        _tokenURIs[newId] = tokenURI;

        emit Transfer(address(0), to, newId);
        emit NFTMinted(to, newId, tokenURI);
        return newId;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Token does not exist");
        return o;
    }

    function balanceOf(address addr) public view returns (uint256) {
        return _balances[addr];
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function totalSupply() public view returns (uint256) { return _tokenIds; }

    function togglePublicMint() external onlyOwner { publicMintOpen = !publicMintOpen; }
    function setMintPrice(uint256 price) external onlyOwner { mintPrice = price; }

    function withdraw() external onlyOwner {
        (bool ok,) = owner.call{value: address(this).balance}("");
        require(ok, "Transfer failed");
    }
}`
  },
  multisig: {
    name: 'MultiSig Wallet',
    description: 'Multi-signature wallet',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MultiSigWallet
 * @dev Multi-signature wallet for Shardeum
 */
contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount);
    event SubmitTransaction(address indexed owner, uint indexed txIndex);
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
        string description;
    }

    mapping(uint => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;

    modifier onlyOwner() { require(isOwner[msg.sender], "Not an owner"); _; }
    modifier txExists(uint i) { require(i < transactions.length, "TX does not exist"); _; }
    modifier notExecuted(uint i) { require(!transactions[i].executed, "Already executed"); _; }

    constructor(address[] memory _owners, uint _required) {
        require(_owners.length > 0, "Need owners");
        require(_required > 0 && _required <= _owners.length, "Invalid confirmations");
        for (uint i = 0; i < _owners.length; i++) {
            require(_owners[i] != address(0) && !isOwner[_owners[i]], "Bad owner");
            isOwner[_owners[i]] = true;
            owners.push(_owners[i]);
        }
        numConfirmationsRequired = _required;
    }

    receive() external payable { emit Deposit(msg.sender, msg.value); }

    function submitTransaction(address to, uint value, bytes memory data, string memory desc)
        external onlyOwner returns (uint)
    {
        uint txIndex = transactions.length;
        transactions.push(Transaction(to, value, data, false, 0, desc));
        emit SubmitTransaction(msg.sender, txIndex);
        return txIndex;
    }

    function confirmTransaction(uint i) external onlyOwner txExists(i) notExecuted(i) {
        require(!isConfirmed[i][msg.sender], "Already confirmed");
        transactions[i].numConfirmations++;
        isConfirmed[i][msg.sender] = true;
        emit ConfirmTransaction(msg.sender, i);
    }

    function executeTransaction(uint i) external onlyOwner txExists(i) notExecuted(i) {
        require(transactions[i].numConfirmations >= numConfirmationsRequired, "Need more confirmations");
        transactions[i].executed = true;
        (bool ok,) = transactions[i].to.call{value: transactions[i].value}(transactions[i].data);
        require(ok, "TX failed");
        emit ExecuteTransaction(msg.sender, i);
    }
}`
  }
}

// ─── Solidity compiler via solc CDN ──────────────────────────────────────────
let solcWorker = null

function loadSolc() {
  return new Promise((resolve, reject) => {
    if (window._solcLoaded) { resolve(window._solc); return }
    const script = document.createElement('script')
    script.src = 'https://binaries.soliditylang.org/bin/soljson-v0.8.24+commit.e11b9ed9.js'
    script.onload = () => {
      // eslint-disable-next-line no-undef
      const solc = Module
      window._solc = solc
      window._solcLoaded = true
      resolve(solc)
    }
    script.onerror = () => reject(new Error('Failed to load Solidity compiler'))
    document.head.appendChild(script)
  })
}

async function compileSolidity(source, contractName) {
  // Use a remote compilation service via fetch for browser compatibility
  // We use the Solidity compiler JSON standard input/output
  const input = {
    language: 'Solidity',
    sources: {
      'Contract.sol': { content: source }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
        }
      },
      optimizer: { enabled: true, runs: 200 }
    }
  }

  // Try browser-based compilation via solc-js CDN wrapper
  return new Promise((resolve, reject) => {
    try {
      // Use a Web Worker approach with importScripts for solc
      const workerCode = `
        importScripts('https://binaries.soliditylang.org/bin/soljson-v0.8.24+commit.e11b9ed9.js');
        const wrapper = cwrap || Module.cwrap;
        
        self.onmessage = function(e) {
          try {
            const input = e.data;
            const compile = Module.cwrap('solidity_compile', 'string', ['string', 'number']);
            const output = compile(JSON.stringify(input), 0);
            self.postMessage({ success: true, output: JSON.parse(output) });
          } catch(err) {
            self.postMessage({ success: false, error: err.message });
          }
        };
      `
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      const worker = new Worker(workerUrl)

      const timeout = setTimeout(() => {
        worker.terminate()
        URL.revokeObjectURL(workerUrl)
        reject(new Error('Compilation timed out (30s). The compiler may still be loading.'))
      }, 30000)

      worker.onmessage = (e) => {
        clearTimeout(timeout)
        worker.terminate()
        URL.revokeObjectURL(workerUrl)
        if (e.data.success) {
          resolve(e.data.output)
        } else {
          reject(new Error(e.data.error))
        }
      }

      worker.onerror = (e) => {
        clearTimeout(timeout)
        worker.terminate()
        URL.revokeObjectURL(workerUrl)
        reject(new Error('Worker error: ' + e.message))
      }

      worker.postMessage(input)
    } catch (err) {
      reject(err)
    }
  })
}

function extractContractName(source) {
  const matches = [...source.matchAll(/^\s*contract\s+(\w+)/gm)]
  if (matches.length > 0) return matches[matches.length - 1][1]
  return null
}

function parseCompilerOutput(output, source) {
  const errors = output.errors || []
  const fatalErrors = errors.filter(e => e.severity === 'error')
  const warnings = errors.filter(e => e.severity === 'warning')

  if (fatalErrors.length > 0) {
    return { success: false, errors: fatalErrors, warnings }
  }

  const contracts = output.contracts?.['Contract.sol'] || {}
  const names = Object.keys(contracts)
  if (names.length === 0) {
    return { success: false, errors: [{ message: 'No contracts found in output' }], warnings }
  }

  const results = names.map(name => {
    const c = contracts[name]
    return {
      name,
      abi: c.abi,
      bytecode: '0x' + c.evm.bytecode.object,
      deployedBytecode: '0x' + c.evm.deployedBytecode.object,
    }
  })

  return { success: true, contracts: results, warnings }
}

// ─── New contract default ─────────────────────────────────────────────────────
let _idCounter = Date.now()
function makeId() { return ++_idCounter }

function newContract(name = 'MyContract', code = '') {
  return {
    id: makeId(),
    name,
    code: code || `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ${name} {
    // Write your contract here
}`,
    compiled: null,
    selectedContract: null,
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContractEditor() {
  const { addLog, signer, addDeployedContract, addTransaction, walletAddress, network } = useShardeum()

  // ── Persistent contracts list ──
  const [contracts, setContracts] = useState(() => {
    const saved = loadContracts()
    if (saved && saved.length > 0) return saved
    return [newContract('SimpleStorage', TEMPLATES.storage.code)]
  })

  const [activeId, setActiveId] = useState(() => {
    const saved = loadContracts()
    const active = loadActive()
    if (saved && saved.length > 0) {
      const found = saved.find(c => c.id === active)
      return found ? active : saved[0].id
    }
    return null
  })

  const [showTemplates, setShowTemplates] = useState(false)
  const [copied, setCopied] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [compileResult, setCompileResult] = useState(null) // { success, errors, warnings, contracts }
  const [constructorArgs, setConstructorArgs] = useState([])
  const [constructorInputs, setConstructorInputs] = useState({})
  const [showAbi, setShowAbi] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const lineNumRef = useRef(null)
  const textareaRef = useRef(null)

  // Active contract object
  const activeContract = contracts.find(c => c.id === activeId) || contracts[0] || null

  // ── Persist on change ──
  useEffect(() => { saveContracts(contracts) }, [contracts])
  useEffect(() => { if (activeId) saveActive(activeId) }, [activeId])

  // ── Sync line numbers scroll ──
  const syncScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // ── Helpers ──
  const updateActiveCode = useCallback((newCode) => {
    setContracts(prev => prev.map(c =>
      c.id === activeId ? { ...c, code: newCode, compiled: null, selectedContract: null } : c
    ))
    setCompileResult(null)
  }, [activeId])

  const addNewContract = () => {
    const name = `Contract${contracts.length + 1}`
    const c = newContract(name)
    setContracts(prev => [...prev, c])
    setActiveId(c.id)
    setCompileResult(null)
  }

  const removeContract = (id) => {
    if (contracts.length === 1) return
    setContracts(prev => {
      const remaining = prev.filter(c => c.id !== id)
      if (activeId === id) setActiveId(remaining[0]?.id ?? null)
      return remaining
    })
    setCompileResult(null)
  }

  const handleTemplateSelect = (key) => {
    const tpl = TEMPLATES[key]
    setContracts(prev => prev.map(c =>
      c.id === activeId ? { ...c, code: tpl.code, name: tpl.name, compiled: null } : c
    ))
    setShowTemplates(false)
    setCompileResult(null)
    addLog(`Loaded template: ${tpl.name}`, 'info')
  }

  const copyCode = () => {
    if (!activeContract) return
    navigator.clipboard.writeText(activeContract.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadContract = () => {
    if (!activeContract) return
    const blob = new Blob([activeContract.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeContract.name || 'contract'}.sol`
    a.click()
    URL.revokeObjectURL(url)
    addLog('Contract downloaded as .sol file', 'success')
  }

  // ── Tab key support ──
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.target
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newCode = activeContract.code.substring(0, start) + '    ' + activeContract.code.substring(end)
      updateActiveCode(newCode)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 4 }, 0)
    }
  }

  // ── Compile ──
  const handleCompile = async () => {
    if (!activeContract) return
    setCompiling(true)
    setCompileResult(null)
    addLog('Starting Solidity compilation...', 'info')

    try {
      const output = await compileSolidity(activeContract.code)
      const result = parseCompilerOutput(output, activeContract.code)

      if (result.success) {
        // Store compiled data into the contract object
        setContracts(prev => prev.map(c =>
          c.id === activeId
            ? { ...c, compiled: result.contracts, selectedContract: result.contracts[0]?.name }
            : c
        ))
        setCompileResult(result)
        addLog(`Compiled successfully! Found ${result.contracts.length} contract(s): ${result.contracts.map(c => c.name).join(', ')}`, 'success')

        // Extract constructor args for the first contract
        const firstContract = result.contracts[0]
        if (firstContract) {
          const ctor = firstContract.abi.find(f => f.type === 'constructor')
          setConstructorArgs(ctor?.inputs || [])
          setConstructorInputs({})
        }

        if (result.warnings.length > 0) {
          result.warnings.forEach(w => addLog(`Warning: ${w.formattedMessage || w.message}`, 'warn'))
        }
      } else {
        setCompileResult(result)
        addLog(`Compilation failed: ${result.errors.length} error(s)`, 'error')
        result.errors.forEach(e => addLog(e.formattedMessage || e.message, 'error'))
      }
    } catch (err) {
      setCompileResult({ success: false, errors: [{ message: err.message }], warnings: [] })
      addLog(`Compilation error: ${err.message}`, 'error')
    } finally {
      setCompiling(false)
    }
  }

  // ── Deploy ──
  const handleDeploy = async () => {
    if (!activeContract?.compiled) {
      addLog('Please compile first', 'warn')
      return
    }
    if (!signer) {
      addLog('Please connect your wallet first', 'error')
      return
    }

    const selectedName = activeContract.selectedContract || activeContract.compiled[0]?.name
    const contractData = activeContract.compiled.find(c => c.name === selectedName)
    if (!contractData) { addLog('No compiled contract selected', 'error'); return }

    setDeploying(true)
    addLog(`Deploying ${contractData.name}...`, 'info')

    try {
      // Build constructor args
      const abi = contractData.abi
      const bytecode = contractData.bytecode
      const ctor = abi.find(f => f.type === 'constructor')
      const ctorInputs = ctor?.inputs || []

      const args = ctorInputs.map((inp, i) => {
        const val = constructorInputs[i] || ''
        if (inp.type === 'uint256' || inp.type.startsWith('uint') || inp.type.startsWith('int')) {
          return BigInt(val || '0')
        }
        if (inp.type === 'bool') return val === 'true' || val === '1'
        if (inp.type === 'address') return val
        if (inp.type.endsWith('[]')) {
          try { return JSON.parse(val) } catch { return [] }
        }
        return val
      })

      const factory = new ethers.ContractFactory(abi, bytecode, signer)
      const contract = await factory.deploy(...args)
      addLog(`Transaction sent: ${contract.deploymentTransaction()?.hash}`, 'info')

      await contract.waitForDeployment()
      const address = await contract.getAddress()

      const txHash = contract.deploymentTransaction()?.hash

      const deployed = {
        name: contractData.name,
        address,
        abi,
        bytecode,
        network: network.name,
        timestamp: new Date().toISOString(),
        txHash,
        deployedAt: new Date().toLocaleTimeString(),
      }
      addDeployedContract(deployed)

      // Record in transaction monitor (same shape Deployer.jsx uses)
      addTransaction({
        hash: txHash,
        type: 'Deploy',
        contract: contractData.name,
        status: 'confirmed',
        timestamp: new Date().toLocaleTimeString(),
      })

      addLog(`✅ Deployed ${contractData.name} at ${address}`, 'success')
      addLog(`TX: ${txHash}`, 'info')
      addLog(`Network: ${network.name}`, 'info')

      // Store deployment result in state for display
      setCompileResult(prev => prev ? { ...prev, deployed: { address, txHash, contractName: contractData.name } } : null)
    } catch (err) {
      addLog(`Deployment failed: ${err.message}`, 'error')
    } finally {
      setDeploying(false)
    }
  }

  // ── Rename tab ──
  const startRename = (id, currentName) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }
  const commitRename = () => {
    if (renameValue.trim()) {
      setContracts(prev => prev.map(c =>
        c.id === renamingId ? { ...c, name: renameValue.trim() } : c
      ))
    }
    setRenamingId(null)
  }

  if (!activeContract) return null

  const lines = activeContract.code.split('\n')
  const compiledContracts = activeContract.compiled || []
  const selectedContractData = compiledContracts.find(c => c.name === activeContract.selectedContract) || compiledContracts[0]

  return (
    <div className="space-y-3" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>CONTRACT EDITOR</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Write, compile & deploy Solidity contracts</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Template selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3"
            >
              <BookOpen size={13} />
              Templates
              {showTemplates ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showTemplates && (
              <div
                className="absolute right-0 top-full mt-1 w-56 rounded overflow-hidden"
                style={{ background: '#061520', border: '1px solid #0d2d3d', zIndex: 1000 }}
                onMouseLeave={() => setShowTemplates(false)}
              >
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    onClick={() => handleTemplateSelect(key)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{ color: '#e2f4f1' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,212,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="font-mono text-xs font-medium">{tpl.name}</div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: '#2d5a68' }}>{tpl.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={copyCode} className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3">
            <Copy size={13} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={downloadContract} className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3">
            <Download size={13} />
            .sol
          </button>
        </div>
      </div>

      {/* ── Contract Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto flex-shrink-0" style={{ borderBottom: '1px solid #0d2d3d' }}>
        {contracts.map(c => (
          <div
            key={c.id}
            className="flex items-center gap-1 px-3 py-1.5 cursor-pointer flex-shrink-0 group"
            style={{
              background: c.id === activeId ? 'rgba(0,245,212,0.08)' : 'transparent',
              borderBottom: c.id === activeId ? '2px solid #00f5d4' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
            onClick={() => { setActiveId(c.id); setCompileResult(null) }}
          >
            <FileCode size={12} style={{ color: c.id === activeId ? '#00f5d4' : '#2d5a68' }} />
            {renamingId === c.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null) }}
                onClick={e => e.stopPropagation()}
                className="text-xs font-mono outline-none"
                style={{ background: 'transparent', color: '#00f5d4', width: '100px', borderBottom: '1px solid #00f5d4' }}
              />
            ) : (
              <span
                className="text-xs font-mono"
                style={{ color: c.id === activeId ? '#00f5d4' : '#6b9aaa' }}
                onDoubleClick={e => { e.stopPropagation(); startRename(c.id, c.name) }}
              >
                {c.name}.sol
              </span>
            )}
            {c.compiled && <span style={{ color: '#00f5d4', fontSize: 10 }}>✓</span>}
            {contracts.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); removeContract(c.id) }}
                className="opacity-0 group-hover:opacity-100 ml-1"
                style={{ color: '#6b9aaa', transition: 'opacity 0.15s' }}
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addNewContract}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-mono flex-shrink-0"
          style={{ color: '#2d5a68' }}
          title="New contract"
          onMouseEnter={e => e.currentTarget.style.color = '#00f5d4'}
          onMouseLeave={e => e.currentTarget.style.color = '#2d5a68'}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex items-center gap-4 px-3 py-1.5 rounded text-xs font-mono flex-shrink-0"
        style={{ background: 'rgba(0,245,212,0.04)', border: '1px solid rgba(0,245,212,0.08)' }}
      >
        <span style={{ color: '#00f5d4' }}>{activeContract.name}</span>
        <span style={{ color: '#2d5a68' }}>·</span>
        <span style={{ color: '#6b9aaa' }}>{lines.length} lines</span>
        <span style={{ color: '#2d5a68' }}>·</span>
        <span style={{ color: '#6b9aaa' }}>{activeContract.code.length} chars</span>
        <span style={{ color: '#2d5a68' }}>·</span>
        <span style={{ color: '#6b9aaa' }}>Solidity 0.8.24</span>
        {activeContract.compiled && (
          <>
            <span style={{ color: '#2d5a68' }}>·</span>
            <span style={{ color: '#00f5d4' }}>✓ Compiled</span>
          </>
        )}
      </div>

      {/* ── Editor ── */}
      <div className="cyber-card overflow-hidden flex-1" style={{ minHeight: 0 }}>
        <div className="flex h-full">
          {/* Line numbers */}
          <div
            ref={lineNumRef}
            className="flex-shrink-0 pt-4 pb-4 pl-3 pr-2 select-none overflow-hidden"
            style={{
              background: 'rgba(0,0,0,0.2)',
              borderRight: '1px solid #0d2d3d',
              minWidth: '44px',
              color: '#2d5a68',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              overflowY: 'hidden',
            }}
          >
            {lines.map((_, i) => (
              <div key={i} style={{ textAlign: 'right', paddingRight: '8px' }}>{i + 1}</div>
            ))}
          </div>
          {/* Code textarea */}
          <textarea
            ref={textareaRef}
            value={activeContract.code}
            onChange={e => updateActiveCode(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="flex-1 p-4 resize-none outline-none overflow-auto"
            style={{
              background: 'transparent',
              color: '#e2f4f1',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              border: 'none',
              tabSize: 4,
            }}
          />
        </div>
      </div>

      {/* ── Compile & Deploy panel ── */}
      <div className="flex-shrink-0 space-y-3">
        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCompile}
            disabled={compiling}
            className="cyber-btn rounded flex items-center gap-2 text-xs py-2 px-4 font-bold"
            style={{
              borderColor: compiling ? '#2d5a68' : '#00f5d4',
              color: compiling ? '#2d5a68' : '#00f5d4',
              opacity: compiling ? 0.7 : 1,
            }}
          >
            {compiling ? <Loader size={13} className="animate-spin" /> : <Play size={13} />}
            {compiling ? 'Compiling...' : 'Compile'}
          </button>

          {activeContract.compiled && (
            <>
              {/* Contract selector if multiple */}
              {compiledContracts.length > 1 && (
                <select
                  value={activeContract.selectedContract || ''}
                  onChange={e => setContracts(prev => prev.map(c =>
                    c.id === activeId ? { ...c, selectedContract: e.target.value } : c
                  ))}
                  className="text-xs font-mono px-2 py-1.5 rounded"
                  style={{ background: '#061520', border: '1px solid #0d2d3d', color: '#e2f4f1' }}
                >
                  {compiledContracts.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={handleDeploy}
                disabled={deploying || !walletAddress}
                className="cyber-btn rounded flex items-center gap-2 text-xs py-2 px-4 font-bold"
                style={{
                  borderColor: deploying ? '#2d5a68' : '#f59e0b',
                  color: deploying ? '#2d5a68' : '#f59e0b',
                  opacity: (deploying || !walletAddress) ? 0.6 : 1,
                }}
                title={!walletAddress ? 'Connect wallet first' : 'Deploy to network'}
              >
                {deploying ? <Loader size={13} className="animate-spin" /> : <Zap size={13} />}
                {deploying ? 'Deploying...' : 'Deploy'}
              </button>

              <button
                onClick={() => setShowAbi(!showAbi)}
                className="cyber-btn rounded flex items-center gap-2 text-xs py-2 px-3"
              >
                {showAbi ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                ABI / Bytecode
              </button>
            </>
          )}
        </div>

        {/* Constructor args */}
        {activeContract.compiled && constructorArgs.length > 0 && (
          <div
            className="rounded p-3 space-y-2"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #0d2d3d' }}
          >
            <div className="text-xs font-mono font-bold" style={{ color: '#6b9aaa' }}>Constructor Arguments</div>
            {constructorArgs.map((inp, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono w-32 flex-shrink-0" style={{ color: '#2d5a68' }}>
                  {inp.name} ({inp.type})
                </span>
                <input
                  value={constructorInputs[i] || ''}
                  onChange={e => setConstructorInputs(prev => ({ ...prev, [i]: e.target.value }))}
                  placeholder={`${inp.type}...`}
                  className="flex-1 text-xs font-mono px-2 py-1 rounded outline-none"
                  style={{
                    background: 'rgba(0,245,212,0.04)',
                    border: '1px solid #0d2d3d',
                    color: '#e2f4f1',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Compile result messages */}
        {compileResult && (
          <div
            className="rounded p-3 space-y-2 text-xs font-mono"
            style={{
              background: compileResult.success ? 'rgba(0,245,212,0.04)' : 'rgba(239,68,68,0.05)',
              border: `1px solid ${compileResult.success ? 'rgba(0,245,212,0.2)' : 'rgba(239,68,68,0.2)'}`,
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {compileResult.success ? (
              <>
                <div className="flex items-center gap-2" style={{ color: '#00f5d4' }}>
                  <CheckCircle size={13} />
                  Compiled successfully: {compileResult.contracts.map(c => c.name).join(', ')}
                </div>
                {compileResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ color: '#f59e0b' }}>
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{w.formattedMessage || w.message}</span>
                  </div>
                ))}
                {compileResult.deployed && (
                  <div className="space-y-1 mt-1 p-2 rounded" style={{ background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.2)' }}>
                    <div className="flex items-center gap-2" style={{ color: '#00f5d4' }}>
                      <Zap size={12} />
                      <span className="font-bold">{compileResult.deployed.contractName} deployed!</span>
                    </div>
                    <div style={{ color: '#6b9aaa' }}>Address: <span style={{ color: '#e2f4f1' }}>{compileResult.deployed.address}</span></div>
                    {compileResult.deployed.txHash && (
                      <div style={{ color: '#6b9aaa' }}>TX: <span style={{ color: '#e2f4f1' }}>{compileResult.deployed.txHash.slice(0, 24)}...</span></div>
                    )}
                    <div style={{ color: '#2d5a68', fontSize: '10px' }}>✓ Recorded in Transaction Monitor &amp; Deployed Contracts</div>
                  </div>
                )}
              </>
            ) : (
              compileResult.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2" style={{ color: '#ef4444' }}>
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <pre className="whitespace-pre-wrap break-all" style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
                    {e.formattedMessage || e.message}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABI + Bytecode viewer — DebugAssistant lives here when there are errors */}
        {compileResult && !compileResult.success && (
          <DebugAssistant
            errors={compileResult.errors}
            sourceCode={activeContract.code}
            onApplyFix={(fixedCode) => {
              setContracts(prev => {
                const updated = prev.map(c =>
                  c.id === activeId
                    ? { ...c, code: fixedCode, compiled: null, selectedContract: null }
                    : c
                )
                saveContracts(updated)
                return updated
              })
              setCompileResult(null)
              addLog('AI fix applied — click Compile to verify', 'success')
            }}
          />
        )}

        {/* ABI + Bytecode viewer */}
        {showAbi && selectedContractData && (
          <div
            className="rounded p-3 space-y-3 text-xs font-mono"
            style={{ background: '#020e17', border: '1px solid #0d2d3d', maxHeight: '280px', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: '#00f5d4' }}>Contract: {selectedContractData.name}</span>
              <div className="flex gap-2">
                <button
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ background: 'rgba(0,245,212,0.08)', color: '#00f5d4' }}
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedContractData.abi, null, 2))
                    addLog('ABI copied to clipboard', 'info')
                  }}
                >
                  Copy ABI
                </button>
                <button
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ background: 'rgba(0,245,212,0.08)', color: '#00f5d4' }}
                  onClick={() => {
                    navigator.clipboard.writeText(selectedContractData.bytecode)
                    addLog('Bytecode copied to clipboard', 'info')
                  }}
                >
                  Copy Bytecode
                </button>
                <button
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ background: 'rgba(0,245,212,0.08)', color: '#00f5d4' }}
                  onClick={() => {
                    const exportData = {
                      contractName: selectedContractData.name,
                      abi: selectedContractData.abi,
                      bytecode: selectedContractData.bytecode,
                      deployedBytecode: selectedContractData.deployedBytecode,
                    }
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${selectedContractData.name}_artifact.json`
                    a.click()
                    URL.revokeObjectURL(url)
                    addLog(`Exported ${selectedContractData.name} artifact`, 'success')
                  }}
                >
                  Export JSON
                </button>
              </div>
            </div>

            <div>
              <div className="mb-1" style={{ color: '#6b9aaa' }}>ABI ({selectedContractData.abi.length} entries)</div>
              <pre
                className="rounded p-2 overflow-x-auto"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  color: '#e2f4f1',
                  fontSize: '11px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {JSON.stringify(selectedContractData.abi, null, 2)}
              </pre>
            </div>

            <div>
              <div className="mb-1" style={{ color: '#6b9aaa' }}>
                Bytecode ({Math.ceil((selectedContractData.bytecode.length - 2) / 2)} bytes)
              </div>
              <div
                className="rounded p-2 break-all"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  color: '#6b9aaa',
                  fontSize: '10px',
                  maxHeight: '60px',
                  overflowY: 'auto',
                  wordBreak: 'break-all',
                }}
              >
                {selectedContractData.bytecode}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}