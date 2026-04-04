import React, { useState, useCallback } from 'react'
import { Wand2, Loader, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Copy, RotateCcw } from 'lucide-react'

// ─── Parse errors into clean lines ───────────────────────────────────────────
function parseErrors(errors) {
  return errors.map(e => {
    const msg = e.formattedMessage || e.message || String(e)
    // Extract line number if present
    const lineMatch = msg.match(/:(\d+):\d+:/)
    const line = lineMatch ? parseInt(lineMatch[1]) : null
    return { msg, line }
  })
}

// ─── Diff: show old vs new lines ─────────────────────────────────────────────
function CodeDiff({ original, fixed }) {
  const origLines = original.split('\n')
  const fixedLines = fixed.split('\n')
  const maxLen = Math.max(origLines.length, fixedLines.length)
  const diffs = []
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i] ?? ''
    const f = fixedLines[i] ?? ''
    if (o !== f) diffs.push({ line: i + 1, old: o, new: f })
  }
  if (diffs.length === 0) return (
    <div className="text-xs font-mono p-3 rounded" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
      No textual changes — logic or structure was adjusted
    </div>
  )
  return (
    <div className="space-y-1 max-h-52 overflow-y-auto">
      {diffs.map(({ line, old: o, new: n }) => (
        <div key={line} className="rounded overflow-hidden text-xs font-mono" style={{ border: '1px solid #0d2d3d' }}>
          <div className="px-3 py-1 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <span style={{ opacity: 0.5, minWidth: 28 }}>L{line}−</span>
            <span className="break-all">{o || '(empty)'}</span>
          </div>
          <div className="px-3 py-1 flex items-start gap-2" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
            <span style={{ opacity: 0.5, minWidth: 28 }}>L{line}+</span>
            <span className="break-all">{n || '(empty)'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DebugAssistant({ errors, sourceCode, onApplyFix }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)   // { fixedCode, explanation, changes[] }
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [applying, setApplying] = useState(false)

  const parsedErrors = parseErrors(errors)

  const runDebug = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    const errorSummary = parsedErrors.map(e => e.msg).join('\n')

    const prompt = `You are an expert Solidity developer and debugger.

The following Solidity contract has compile errors. Your job is to fix ALL errors and return the corrected contract.

## Contract Source Code:
\`\`\`solidity
${sourceCode}
\`\`\`

## Compile Errors:
\`\`\`
${errorSummary}
\`\`\`

## Instructions:
1. Analyze each error carefully
2. Fix ALL errors while preserving the contract's original intent and logic
3. Do NOT add unnecessary changes — only fix what is broken
4. Return your response as valid JSON with this exact structure:
{
  "fixedCode": "// SPDX-License-Identifier: MIT\\npragma solidity...",
  "explanation": "Brief explanation of what was wrong and what was fixed",
  "changes": ["Fixed: missing semicolon on line 12", "Fixed: undefined variable 'foo'"]
}

Return ONLY valid JSON. No markdown, no extra text.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const text = data.content?.map(b => b.text || '').join('') || ''

      // Strip markdown fences if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)

      if (!parsed.fixedCode) throw new Error('No fixed code returned')
      setResult(parsed)
    } catch (e) {
      setError('Debug failed: ' + (e.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [sourceCode, parsedErrors])

  const handleApply = () => {
    if (!result?.fixedCode) return
    setApplying(true)
    onApplyFix(result.fixedCode)
    setTimeout(() => setApplying(false), 800)
  }

  const handleCopy = () => {
    if (!result?.fixedCode) return
    navigator.clipboard.writeText(result.fixedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Only render when there are actual compile errors
  if (!errors || errors.length === 0) return null

  return (
    <div
      className="rounded overflow-hidden"
      style={{ border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.04)' }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: 'rgba(239,68,68,0.08)' }}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Wand2 size={14} style={{ color: '#f59e0b' }} />
          <span className="text-xs font-mono font-semibold" style={{ color: '#f59e0b' }}>
            AI Debug Assistant
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '10px' }}
          >
            {errors.length} error{errors.length > 1 ? 's' : ''} detected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!result && !loading && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(true); runDebug() }}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded transition-all"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#030d12',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Wand2 size={11} />
              Auto-Fix Errors
            </button>
          )}
          {open ? <ChevronUp size={13} style={{ color: '#6b9aaa' }} /> : <ChevronDown size={13} style={{ color: '#6b9aaa' }} />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-4 pt-3">
          {/* Parsed errors list */}
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: '#2d5a68' }}>DETECTED ERRORS</div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {parsedErrors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono p-2 rounded"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <AlertCircle size={11} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: '#ef4444', wordBreak: 'break-all' }}>
                    {e.msg.split('\n')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex items-center gap-2">
                <Loader size={18} className="animate-spin" style={{ color: '#f59e0b' }} />
                <span className="text-sm font-mono" style={{ color: '#f59e0b' }}>Analyzing errors and generating fix...</span>
              </div>
              <div className="text-xs font-mono" style={{ color: '#2d5a68' }}>
                Claude AI is reading your contract and fixing issues
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded text-xs font-mono"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="font-semibold mb-1">Debug failed</div>
                <div style={{ opacity: 0.8 }}>{error}</div>
                <button
                  onClick={runDebug}
                  className="flex items-center gap-1 mt-2 text-xs"
                  style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <RotateCcw size={11} /> Try again
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Explanation */}
              <div className="p-3 rounded" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="text-xs font-mono mb-2" style={{ color: '#f59e0b' }}>WHAT WAS WRONG</div>
                <p className="text-xs font-mono" style={{ color: '#e2f4f1', lineHeight: 1.6 }}>{result.explanation}</p>
              </div>

              {/* Changes list */}
              {result.changes?.length > 0 && (
                <div>
                  <div className="text-xs font-mono mb-2" style={{ color: '#2d5a68' }}>CHANGES MADE</div>
                  <div className="space-y-1">
                    {result.changes.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-mono"
                        style={{ color: '#10b981' }}>
                        <CheckCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diff view */}
              <div>
                <div className="text-xs font-mono mb-2" style={{ color: '#2d5a68' }}>DIFF (BEFORE → AFTER)</div>
                <CodeDiff original={sourceCode} fixed={result.fixedCode} />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleApply}
                  className="flex items-center gap-2 px-4 py-2 rounded text-sm font-mono font-bold transition-all"
                  style={{
                    background: applying ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #00f5d4, #00c4aa)',
                    color: applying ? '#10b981' : '#030d12',
                    border: applying ? '1px solid #10b981' : 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                >
                  {applying ? <CheckCircle size={13} /> : <Wand2 size={13} />}
                  {applying ? 'Applied!' : 'Apply Fix to Editor'}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono transition-all"
                  style={{
                    background: 'rgba(0,245,212,0.08)',
                    border: '1px solid #0d2d3d',
                    color: copied ? '#10b981' : '#6b9aaa',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                >
                  {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy Fixed Code'}
                </button>
                <button
                  onClick={runDebug}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono"
                  style={{
                    background: 'transparent',
                    border: '1px solid #0d2d3d',
                    color: '#2d5a68',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                >
                  <RotateCcw size={11} /> Re-analyze
                </button>
              </div>
            </div>
          )}

          {/* Initial CTA when not yet run */}
          {!loading && !result && !error && (
            <div className="text-center py-3">
              <p className="text-xs font-mono mb-3" style={{ color: '#6b9aaa' }}>
                Claude AI will analyze your Solidity errors and automatically generate a corrected version of your contract.
              </p>
              <button
                onClick={runDebug}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded font-mono font-bold text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#030d12',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                }}
              >
                <Wand2 size={15} />
                Auto-Fix All Errors with AI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
