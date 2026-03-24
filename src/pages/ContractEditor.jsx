import React, { useState } from 'react'
import { Copy, Download, RotateCcw, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

const TEMPLATES = {
  erc20: {
    name: 'ERC-20 Token',
    description: 'Standard fungible token',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShardeumToken
 * @dev ERC-20 token optimized for Shardeum's sharded architecture
 */
contract ShardeumToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    mapping(address => bool) public blacklisted;
    
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(initialSupply <= MAX_SUPPLY, "Exceeds max supply");
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function blacklist(address account) external onlyOwner {
        blacklisted[account] = true;
        emit Blacklisted(account);
    }

    function unblacklist(address account) external onlyOwner {
        blacklisted[account] = false;
        emit Unblacklisted(account);
    }

    function _update(address from, address to, uint256 amount) internal override {
        require(!blacklisted[from] && !blacklisted[to], "Address blacklisted");
        super._update(from, to, amount);
    }
}`
  },
  erc721: {
    name: 'ERC-721 NFT',
    description: 'Non-fungible token',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShardeumNFT
 * @dev NFT contract for Shardeum network
 */
contract ShardeumNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    uint256 public mintPrice = 0.01 ether;
    uint256 public maxSupply = 10000;
    bool public publicMintOpen = false;

    event NFTMinted(address indexed to, uint256 tokenId, string uri);

    constructor() ERC721("ShardeumNFT", "SNFT") Ownable(msg.sender) {}

    function mint(address to, string memory tokenURI) 
        external payable returns (uint256) 
    {
        require(publicMintOpen || msg.sender == owner(), "Minting not open");
        require(msg.value >= mintPrice || msg.sender == owner(), "Insufficient payment");
        require(_tokenIds < maxSupply, "Max supply reached");

        _tokenIds++;
        uint256 newItemId = _tokenIds;
        _mint(to, newItemId);
        _setTokenURI(newItemId, tokenURI);
        
        emit NFTMinted(to, newItemId, tokenURI);
        return newItemId;
    }

    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
    }

    function togglePublicMint() external onlyOwner {
        publicMintOpen = !publicMintOpen;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds;
    }
}`
  },
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

    function delete_(string memory key) external onlyOwner {
        delete store[key];
        emit DataDeleted(key);
    }

    function getAllKeys() external view returns (string[] memory) {
        return keys;
    }
}`
  },
  multisig: {
    name: 'MultiSig Wallet',
    description: 'Multi-signature transaction approval',
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

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "TX does not exist");
        _;
    }

    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "TX already executed");
        _;
    }

    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "Need owners");
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "Invalid confirmations");

        for (uint i = 0; i < _owners.length; i++) {
            require(_owners[i] != address(0), "Invalid owner");
            require(!isOwner[_owners[i]], "Duplicate owner");
            isOwner[_owners[i]] = true;
            owners.push(_owners[i]);
        }
        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable { emit Deposit(msg.sender, msg.value); }

    function submitTransaction(address to, uint value, bytes memory data, string memory description)
        external onlyOwner returns (uint)
    {
        uint txIndex = transactions.length;
        transactions.push(Transaction({ to: to, value: value, data: data, executed: false, numConfirmations: 0, description: description }));
        emit SubmitTransaction(msg.sender, txIndex);
        return txIndex;
    }

    function confirmTransaction(uint _txIndex) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "TX already confirmed");
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations++;
        isConfirmed[_txIndex][msg.sender] = true;
        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(uint _txIndex) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        require(transaction.numConfirmations >= numConfirmationsRequired, "Not enough confirmations");
        transaction.executed = true;
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "TX failed");
        emit ExecuteTransaction(msg.sender, _txIndex);
    }
}`
  }
}

const KEYWORDS = ['pragma', 'solidity', 'contract', 'interface', 'library', 'function', 'event', 'modifier',
  'mapping', 'struct', 'enum', 'constructor', 'returns', 'return', 'emit', 'require', 'revert',
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'import', 'is', 'using', 'for',
  'public', 'private', 'internal', 'external', 'pure', 'view', 'payable', 'virtual', 'override',
  'memory', 'storage', 'calldata', 'indexed',
  'uint256', 'uint', 'int256', 'int', 'address', 'bool', 'bytes', 'bytes32', 'string']

export default function ContractEditor() {
  const { addLog } = useShardeum()
  const [code, setCode] = useState(TEMPLATES.storage.code)
  const [selectedTemplate, setSelectedTemplate] = useState('storage')
  const [showTemplates, setShowTemplates] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCodeChange = (e) => {
    setCode(e.target.value)
  }

  const handleTemplateSelect = (key) => {
    setCode(TEMPLATES[key].code)
    setSelectedTemplate(key)
    setShowTemplates(false)
    addLog(`Loaded template: ${TEMPLATES[key].name}`, 'info')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addLog('Contract code copied to clipboard', 'info')
  }

  const downloadContract = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTemplate || 'contract'}.sol`
    a.click()
    URL.revokeObjectURL(url)
    addLog('Contract downloaded as .sol file', 'success')
  }

  const lines = code.split('\n')
  const lineNums = lines.map((_, i) => i + 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>CONTRACT EDITOR</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>Write & manage Solidity contracts</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Template selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3"
              style={{ borderRadius: '4px' }}
            >
              <BookOpen size={13} />
              Templates
              {showTemplates ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded overflow-hidden z-50"
                style={{ background: '#061520', border: '1px solid #0d2d3d', zIndex: 1000 }}>
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button key={key} onClick={() => handleTemplateSelect(key)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{ color: selectedTemplate === key ? '#00f5d4' : '#e2f4f1' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,212,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="font-mono text-xs font-medium">{tpl.name}</div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: '#2d5a68' }}>{tpl.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={copyCode} className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3" style={{ borderRadius: '4px' }}>
            <Copy size={13} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={downloadContract} className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3" style={{ borderRadius: '4px' }}>
            <Download size={13} />
            .sol
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 rounded text-xs font-mono" style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.1)' }}>
        <span style={{ color: '#00f5d4' }}>{TEMPLATES[selectedTemplate]?.name || 'Custom'}</span>
        <span style={{ color: '#2d5a68' }}>·</span>
        <span style={{ color: '#6b9aaa' }}>{lines.length} lines</span>
        <span style={{ color: '#2d5a68' }}>·</span>
        <span style={{ color: '#6b9aaa' }}>{code.length} chars</span>
        <span style={{ color: '#2d5a68' }}>·</span>
        <span style={{ color: '#6b9aaa' }}>Solidity</span>
      </div>

      {/* Editor with line numbers */}
      <div className="cyber-card overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
        <div className="flex h-full">
          {/* Line numbers */}
          <div className="flex-shrink-0 pt-4 pb-4 pl-3 pr-2 overflow-hidden select-none"
            style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid #0d2d3d', minWidth: '40px', color: '#2d5a68', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: '1.6' }}>
            {lines.map((_, i) => (
              <div key={i} style={{ textAlign: 'right', paddingRight: '8px' }}>{i + 1}</div>
            ))}
          </div>
          {/* Code area */}
          <textarea
            value={code}
            onChange={handleCodeChange}
            spellCheck={false}
            className="flex-1 p-4 resize-none outline-none overflow-auto code-scroll"
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

      {/* Editor tips */}
      <div className="grid grid-cols-3 gap-3">
        {['Supports Solidity 0.8.x syntax', 'Templates for ERC-20, ERC-721, MultiSig', 'Export as .sol for Hardhat/Truffle'].map(tip => (
          <div key={tip} className="cyber-card px-3 py-2">
            <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>💡 {tip}</div>
          </div>
        ))}
      </div>
    </div>
  )
}