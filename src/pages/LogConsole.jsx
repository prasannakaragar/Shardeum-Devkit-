import React, { useState, useRef, useEffect } from 'react'
import { Terminal, Trash2, Download, Search } from 'lucide-react'
import { useShardeum } from '../contexts/ShardeumContext'

const TYPE_COLORS = {
  info: '#6b9aaa',
  success: '#10b981',
  error: '#ef4444',
  warn: '#f59e0b',
}

const TYPE_PREFIX = {
  info:    'INFO ',
  success: 'OK   ',
  error:   'ERR  ',
  warn:    'WARN ',
}

export default function LogConsole() {
  const { logs, addLog, clearLogs } = useShardeum()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const filtered = logs
    .filter(l => {
      if (filter !== 'all' && l.type !== filter) return false
      if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .slice() // keep original order (newest first in state, display oldest first)
    .reverse()

  const downloadLogs = () => {
    const text = [...logs]
      .reverse()
      .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shardeum-devkit-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const counts = { all: logs.length, info: 0, success: 0, error: 0, warn: 0 }
  logs.forEach(l => { if (counts[l.type] !== undefined) counts[l.type]++ })

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold" style={{ color: '#00f5d4' }}>CONSOLE</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: '#6b9aaa' }}>System logs & debug output</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadLogs} disabled={logs.length === 0}
            className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3"
            style={{ borderRadius: '4px', opacity: logs.length === 0 ? 0.5 : 1 }}>
            <Download size={13} />
            Export
          </button>
          <button onClick={clearLogs} disabled={logs.length === 0}
            className="cyber-btn rounded flex items-center gap-2 text-xs py-1.5 px-3"
            style={{ borderRadius: '4px', color: '#ef4444', borderColor: '#ef4444', opacity: logs.length === 0 ? 0.5 : 1 }}>
            <Trash2 size={13} />
            Clear
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {['all', 'info', 'success', 'error', 'warn'].map(type => (
            <button key={type} onClick={() => setFilter(type)}
              className="px-3 py-1 rounded text-xs font-mono transition-all"
              style={{
                background: filter === type ? (type === 'all' ? 'rgba(0,245,212,0.15)' : `${TYPE_COLORS[type]}20`) : 'transparent',
                border: `1px solid ${filter === type ? (type === 'all' ? '#00f5d4' : TYPE_COLORS[type]) : '#0d2d3d'}`,
                color: filter === type ? (type === 'all' ? '#00f5d4' : TYPE_COLORS[type]) : '#6b9aaa',
                borderRadius: '4px'
              }}>
              {type.toUpperCase()} ({counts[type] || 0})
            </button>
          ))}
        </div>
        <div className="relative flex-1" style={{ maxWidth: '280px' }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2d5a68' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="cyber-input rounded text-xs w-full pl-8" style={{ borderRadius: '4px' }}
            placeholder="Search logs..." />
        </div>
        <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: '#6b9aaa' }}>
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
            style={{ accentColor: '#00f5d4' }} />
          Auto-scroll
        </label>
      </div>

      {/* Terminal */}
      <div className="flex-1 cyber-card overflow-hidden flex flex-col" style={{ minHeight: '400px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-border flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
          <span className="ml-3 text-xs" style={{ color: '#2d5a68' }}>shardeum-devkit — console</span>
          <div className="ml-auto flex items-center gap-1.5" style={{ color: '#2d5a68' }}>
            <Terminal size={12} />
            <span style={{ fontSize: '10px' }}>{filtered.length} entries</span>
          </div>
        </div>

        {/* Log entries */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 code-scroll" style={{ background: '#020a0f' }}>
          {filtered.length === 0 ? (
            <div style={{ color: '#2d5a68', paddingTop: '20px' }}>
              <span style={{ color: '#0d2d3d' }}>$ </span>
              <span>No log entries{filter !== 'all' ? ` for filter: ${filter}` : ''}</span>
              <span className="animate-pulse" style={{ color: '#00f5d4' }}>_</span>
            </div>
          ) : (
            filtered.map((log, i) => (
              <div key={log.id || i}
                className="flex gap-3 py-0.5 px-1 rounded transition-colors"
                style={{ lineHeight: '1.6' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: '#2d5a68', flexShrink: 0, userSelect: 'none' }}>{log.timestamp}</span>
                <span style={{ color: TYPE_COLORS[log.type] || '#6b9aaa', flexShrink: 0, userSelect: 'none', fontWeight: 600 }}>
                  {TYPE_PREFIX[log.type] || 'LOG  '}
                </span>
                <span style={{ color: '#e2f4f1', wordBreak: 'break-all' }}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input prompt */}
        <div className="flex items-center px-4 py-2 border-t border-cyber-border" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <span style={{ color: '#00f5d4', fontFamily: 'JetBrains Mono', fontSize: '12px' }}>$ </span>
          <span className="ml-2 text-xs" style={{ color: '#2d5a68', fontFamily: 'JetBrains Mono' }}>
            Use the toolkit to generate log output. {logs.length} total entries.
          </span>
          <span className="ml-1 animate-pulse" style={{ color: '#00f5d4' }}>█</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          ['ERRORS', counts.error, '#ef4444'],
          ['WARNINGS', counts.warn, '#f59e0b'],
          ['SUCCESS', counts.success, '#10b981'],
          ['INFO', counts.info, '#6b9aaa'],
        ].map(([label, count, color]) => (
          <div key={label} className="cyber-card px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: '#2d5a68' }}>{label}</span>
            <span className="text-lg font-display font-bold" style={{ color }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}