import React, { useState } from 'react'
import {
  HelpCircle, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle, Copy, Wallet, Coins, Globe, BookOpen,
  ArrowRight, AlertTriangle, Shield, Smartphone, Monitor
} from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'metamask-install',
    icon: Wallet,
    color: '#f59e0b',
    title: 'Step 1 — Install MetaMask',
    subtitle: 'The browser wallet you need to interact with Shardeum',
    steps: [
      {
        title: 'Choose your browser',
        body: 'MetaMask works on Chrome, Firefox, Brave, and Edge. Open your browser and go to metamask.io',
        tip: 'We recommend Chrome or Brave for the best experience.',
        link: { label: 'metamask.io (official)', href: 'https://metamask.io/download/' },
      },
      {
        title: 'Click "Install MetaMask for Chrome"',
        body: 'This takes you to the Chrome Web Store. Click "Add to Chrome" → "Add extension". Wait for the extension to install.',
        tip: 'Always install from the official site or Chrome Web Store — never from a random link.',
        warning: 'Never share your Secret Recovery Phrase with anyone, even if they claim to be MetaMask support.',
      },
      {
        title: 'Create a new wallet',
        body: 'After installing, click the MetaMask fox icon in your browser toolbar. Click "Create a new wallet" → agree to terms → create a strong password.',
      },
      {
        title: 'Save your Secret Recovery Phrase',
        body: 'MetaMask will show you 12 words. Write them down on paper and store them somewhere safe offline. This phrase is the ONLY way to recover your wallet.',
        warning: 'If you lose this phrase and forget your password, your wallet is gone forever. Never store it in email, photos, or cloud drives.',
      },
      {
        title: 'Confirm and finish',
        body: 'Select the words in order to confirm you saved them. After verifying, your wallet is ready. You\'ll see your address (starts with 0x) in the extension.',
      },
    ],
  },
  {
    id: 'add-shardeum',
    icon: Globe,
    color: '#00f5d4',
    title: 'Step 2 — Add Shardeum Network to MetaMask',
    subtitle: 'Connect MetaMask to the Shardeum blockchain',
    steps: [
      {
        title: 'Open MetaMask and click the network dropdown',
        body: 'At the top of MetaMask you\'ll see "Ethereum Mainnet" — click that dropdown. Then click "Add network" at the bottom.',
      },
      {
        title: 'Click "Add a network manually"',
        body: 'Scroll down on the networks page and click "Add a network manually" to enter custom network details.',
      },
      {
        title: 'Enter Shardeum Testnet details',
        body: 'Fill in the form with the exact values below:',
        networkDetails: {
          'Network Name': 'Shardeum EVM Testnet',
          'New RPC URL': 'https://api-mezame.shardeum.org',
          'Chain ID': '8119',
          'Currency Symbol': 'SHM',
          'Block Explorer URL': 'https://explorer-mezame.shardeum.org',
        },
      },
      {
        title: 'Click Save',
        body: 'MetaMask will switch to the Shardeum testnet. You should see "Shardeum EVM Testnet" in the network dropdown and 0 SHM balance.',
        tip: 'If MetaMask shows a warning about the chain ID, just click "Approve" — this is expected for testnets.',
      },
      {
        title: 'Or use the DevKit to auto-add it',
        body: 'In this DevKit, connect your wallet using the "Connect Wallet" button in the top bar. The DevKit will automatically prompt MetaMask to add Shardeum — no manual entry needed.',
        tip: 'This is the easiest method — just click Connect Wallet and approve the prompts in MetaMask.',
      },
    ],
  },
  {
    id: 'get-shm',
    icon: Coins,
    color: '#8b5cf6',
    title: 'Step 3 — Get Testnet SHM Tokens',
    subtitle: 'You need SHM to pay for gas when deploying contracts',
    steps: [
      {
        title: 'Copy your wallet address',
        body: 'In MetaMask, click your account name at the top to copy your address. It looks like: 0x1234...abcd. You\'ll need this to receive tokens.',
        tip: 'Your address is public — sharing it is safe. Never share your private key or recovery phrase.',
      },
      {
        title: 'Join the Shardeum Discord',
        body: 'Go to the official Shardeum Discord server. The faucet is only available to Discord members.',
        link: { label: 'Shardeum Discord (official)', href: 'https://discord.com/invite/shardeum' },
        warning: 'Use only the official Discord link above. Fake Discord servers exist that will steal your wallet.',
      },
      {
        title: 'Verify yourself in Discord',
        body: 'In the Discord, complete the verification step (usually a CAPTCHA or bot prompt). This is required before you can access faucet channels.',
      },
      {
        title: 'Go to the #faucet channel',
        body: 'Once verified, find the #faucet or #testnet-faucet channel in the Discord sidebar. If you can\'t see it, check the #get-roles channel first.',
      },
      {
        title: 'Request testnet SHM',
        body: 'In the faucet channel, type the command: !faucet YOUR_WALLET_ADDRESS — replacing YOUR_WALLET_ADDRESS with the address you copied in step 1.',
        code: '!faucet 0xYourWalletAddressHere',
        tip: 'The bot usually responds within a few seconds. You\'ll receive a small amount of SHM (enough to deploy several contracts).',
      },
      {
        title: 'Confirm receipt in MetaMask',
        body: 'After a minute, open MetaMask and check your balance. You should see testnet SHM. It may take 1–2 minutes to appear.',
        tip: 'Make sure MetaMask is connected to "Shardeum EVM Testnet" — if it shows 0 balance, check you\'re on the right network.',
      },
    ],
  },
  {
    id: 'deploy-first',
    icon: BookOpen,
    color: '#10b981',
    title: 'Step 4 — Deploy Your First Contract',
    subtitle: 'Put it all together and deploy on Shardeum',
    steps: [
      {
        title: 'Go to Contract Editor',
        body: 'In the sidebar, click "Contract Editor". You\'ll see a code editor with Solidity templates. Start with "Simple Storage" — it\'s the easiest.',
      },
      {
        title: 'Click Compile',
        body: 'Press the "Compile" button in the right panel. Wait 10–30 seconds for the Solidity compiler to load and compile your contract. You should see "Compiled successfully".',
        tip: 'If you see errors, the AI Debug Assistant will appear below — click "Auto-Fix Errors" and let it fix the code for you.',
      },
      {
        title: 'Connect your wallet',
        body: 'Click "Connect Wallet" in the top-right of the page. MetaMask will pop up — approve the connection. You\'ll see your address and SHM balance appear.',
      },
      {
        title: 'Click Deploy',
        body: 'After compiling, click the "Deploy" button (yellow). MetaMask will show you a transaction to approve. Check the gas fee (should be very small on testnet) and click Confirm.',
      },
      {
        title: 'Your contract is live! 🎉',
        body: 'Once deployed, you\'ll see the contract address. Click the explorer link to view it on the Shardeum Explorer. You can now interact with it in the "Interact" page.',
        tip: 'Save the contract address — you\'ll need it to interact with the contract later.',
      },
    ],
  },
  {
    id: 'faq',
    icon: HelpCircle,
    color: '#6b9aaa',
    title: 'Common Questions',
    subtitle: 'Quick answers to things beginners often ask',
    faqs: [
      { q: 'Why does MetaMask ask me to pay gas?', a: 'Every transaction on a blockchain costs a tiny fee (gas) to pay the network validators. On Shardeum testnet, this is paid in SHM — that\'s why you need testnet SHM from the faucet.' },
      { q: 'My transaction is pending — what do I do?', a: 'Wait 1–2 minutes. If it\'s still pending, open MetaMask → Activity → click the transaction → Speed Up (this submits a new transaction with higher gas). On testnet this usually resolves quickly.' },
      { q: 'I got an error "insufficient funds"', a: 'Your wallet has 0 SHM or not enough for gas. Go back to Step 3 and request more tokens from the faucet.' },
      { q: 'Can I use the same wallet on Shardeum mainnet?', a: 'Yes! Your MetaMask address works on all EVM networks. Just add the mainnet RPC (https://api.shardeum.org, Chain ID 8118) and you can use the same wallet.' },
      { q: 'Is it safe to share my wallet address?', a: 'Yes — your 0x address is public like an email address. Share it freely to receive tokens. NEVER share your private key or 12-word recovery phrase.' },
      { q: 'The DevKit says "Network offline" — what do I do?', a: 'The Shardeum testnet may be temporarily down. Check the Shardeum Discord #status channel, or try switching to a different network in Settings → Network Configuration.' },
      { q: 'Can I deploy real contracts on mainnet with this DevKit?', a: 'Yes! Switch the network to "Shardeum Mainnet" in the top dropdown. You\'ll need real SHM tokens (not testnet) and real ETH gas will apply.' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded transition-all"
      style={{ background: 'rgba(0,245,212,0.1)', border: '1px solid rgba(0,245,212,0.25)', color: ok ? '#10b981' : '#00f5d4', cursor: 'pointer' }}
    >
      {ok ? <CheckCircle size={10} /> : <Copy size={10} />}
      {ok ? 'Copied' : 'Copy'}
    </button>
  )
}

function NetworkRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded"
      style={{ background: 'rgba(0,245,212,0.04)', border: '1px solid #0d2d3d' }}>
      <span className="text-xs font-mono" style={{ color: '#2d5a68' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium" style={{ color: '#00f5d4' }}>{value}</span>
        <CopyBtn text={value} />
      </div>
    </div>
  )
}

function StepCard({ index, step, color }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div className="rounded overflow-hidden" style={{ border: `1px solid ${open ? color + '30' : '#0d2d3d'}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
        style={{ background: open ? `${color}08` : 'transparent' }}
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold"
          style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
          {index + 1}
        </div>
        <span className="text-sm font-mono font-medium flex-1" style={{ color: open ? '#e2f4f1' : '#6b9aaa' }}>
          {step.title}
        </span>
        {open
          ? <ChevronUp size={13} style={{ color: '#2d5a68', flexShrink: 0 }} />
          : <ChevronDown size={13} style={{ color: '#2d5a68', flexShrink: 0 }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: '#0d2d3d' }}>
          <div className="h-2" />
          <p className="text-sm font-mono" style={{ color: '#6b9aaa', lineHeight: 1.7 }}>{step.body}</p>

          {step.networkDetails && (
            <div className="space-y-1.5 mt-2">
              <div className="text-xs font-mono mb-2" style={{ color: '#2d5a68' }}>NETWORK DETAILS — copy these exactly:</div>
              {Object.entries(step.networkDetails).map(([k, v]) => (
                <NetworkRow key={k} label={k} value={v} />
              ))}
            </div>
          )}

          {step.code && (
            <div className="flex items-center justify-between p-3 rounded font-mono text-sm"
              style={{ background: '#020e17', border: '1px solid #0d2d3d', color: '#00f5d4' }}>
              <span>{step.code}</span>
              <CopyBtn text={step.code} />
            </div>
          )}

          {step.tip && (
            <div className="flex items-start gap-2 p-3 rounded text-xs font-mono"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
              <CheckCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.6 }}>{step.tip}</span>
            </div>
          )}

          {step.warning && (
            <div className="flex items-start gap-2 p-3 rounded text-xs font-mono"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.6 }}>{step.warning}</span>
            </div>
          )}

          {step.link && (
            <a
              href={step.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono"
              style={{ color: '#00f5d4' }}
            >
              <ExternalLink size={11} />
              {step.link.label}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function SectionCard({ section }) {
  const [open, setOpen] = useState(false)
  const Icon = section.icon

  return (
    <div className="cyber-card overflow-hidden" style={{ borderColor: open ? `${section.color}40` : '#0d2d3d' }}>
      {/* Section header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
        style={{ background: open ? `${section.color}08` : 'transparent' }}
      >
        <div className="p-2 rounded flex-shrink-0" style={{ background: `${section.color}15`, border: `1px solid ${section.color}30` }}>
          <Icon size={18} style={{ color: section.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono font-bold text-sm" style={{ color: open ? section.color : '#e2f4f1' }}>
            {section.title}
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: '#2d5a68' }}>{section.subtitle}</div>
        </div>
        {open
          ? <ChevronUp size={15} style={{ color: '#2d5a68', flexShrink: 0 }} />
          : <ChevronDown size={15} style={{ color: '#2d5a68', flexShrink: 0 }} />}
      </button>

      {/* Section content */}
      {open && (
        <div className="px-5 pb-5 border-t space-y-2" style={{ borderColor: '#0d2d3d' }}>
          <div className="h-3" />

          {/* Steps */}
          {section.steps && section.steps.map((step, i) => (
            <StepCard key={i} index={i} step={step} color={section.color} />
          ))}

          {/* FAQs */}
          {section.faqs && section.faqs.map((faq, i) => (
            <FaqItem key={i} faq={faq} />
          ))}
        </div>
      )}
    </div>
  )
}

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded overflow-hidden" style={{ border: '1px solid #0d2d3d' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: open ? 'rgba(0,245,212,0.04)' : 'transparent' }}
      >
        <span className="text-sm font-mono" style={{ color: '#e2f4f1' }}>{faq.q}</span>
        {open ? <ChevronUp size={12} style={{ color: '#2d5a68', flexShrink: 0 }} /> : <ChevronDown size={12} style={{ color: '#2d5a68', flexShrink: 0 }} />}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t" style={{ borderColor: '#0d2d3d' }}>
          <p className="text-xs font-mono mt-3" style={{ color: '#6b9aaa', lineHeight: 1.7 }}>{faq.a}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HelpCenter() {
  const [search, setSearch] = useState('')

  const filteredSections = SECTIONS.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const inTitle = s.title.toLowerCase().includes(q)
    const inSubtitle = s.subtitle.toLowerCase().includes(q)
    const inSteps = s.steps?.some(st => st.title.toLowerCase().includes(q) || st.body.toLowerCase().includes(q))
    const inFaqs = s.faqs?.some(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    return inTitle || inSubtitle || inSteps || inFaqs
  })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>HELP CENTER</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>
          Complete beginner's guide — from installing MetaMask to deploying your first contract on Shardeum
        </p>
      </div>

      {/* Quick status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Monitor, label: 'Install MetaMask', desc: 'Browser wallet', color: '#f59e0b' },
          { icon: Globe, label: 'Add Network', desc: 'Shardeum testnet', color: '#00f5d4' },
          { icon: Coins, label: 'Get SHM', desc: 'From Discord faucet', color: '#8b5cf6' },
          { icon: Shield, label: 'Deploy', desc: 'Your first contract', color: '#10b981' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="cyber-card p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-2 rounded" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div className="text-xs font-mono font-medium" style={{ color }}>{label}</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: '#2d5a68' }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="cyber-card p-4">
        <div className="text-xs font-mono mb-3" style={{ color: '#2d5a68' }}>QUICK LINKS</div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'MetaMask Official Site', href: 'https://metamask.io/download/' },
            { label: 'Shardeum Discord (Faucet)', href: 'https://discord.com/invite/shardeum' },
            { label: 'Shardeum Explorer (Testnet)', href: 'https://explorer-mezame.shardeum.org' },
            { label: 'Shardeum Docs', href: 'https://docs.shardeum.org' },
            { label: 'Shardeum Website', href: 'https://shardeum.org' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all"
              style={{
                background: 'rgba(0,245,212,0.06)',
                border: '1px solid #0d2d3d',
                color: '#00f5d4',
                textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#00f5d4'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#0d2d3d'}
            >
              <ExternalLink size={10} />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="cyber-input rounded w-full"
          style={{ borderRadius: '4px' }}
          placeholder="Search help topics... (e.g. 'metamask', 'faucet', 'gas', 'deploy')"
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {filteredSections.map(section => (
          <SectionCard key={section.id} section={section} />
        ))}
        {filteredSections.length === 0 && (
          <div className="cyber-card p-8 text-center">
            <HelpCircle size={32} style={{ color: '#0d2d3d', margin: '0 auto 12px' }} />
            <div className="text-sm font-mono" style={{ color: '#2d5a68' }}>No results for "{search}"</div>
            <div className="text-xs font-mono mt-1" style={{ color: '#0d2d3d' }}>
              Try searching for "metamask", "faucet", "gas", "deploy", or "SHM"
            </div>
          </div>
        )}
      </div>

      {/* Bottom note */}
      <div className="flex items-start gap-3 p-4 rounded"
        style={{ background: 'rgba(0,245,212,0.04)', border: '1px solid rgba(0,245,212,0.15)' }}>
        <HelpCircle size={14} style={{ color: '#00f5d4', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs font-mono" style={{ color: '#6b9aaa', lineHeight: 1.7 }}>
          Still stuck? Join the{' '}
          <a href="https://discord.com/invite/shardeum" target="_blank" rel="noopener noreferrer" style={{ color: '#00f5d4' }}>
            Shardeum Discord
          </a>
          {' '}and ask in the #developers or #help channel. The community is very beginner-friendly.
        </p>
      </div>
    </div>
  )
}
