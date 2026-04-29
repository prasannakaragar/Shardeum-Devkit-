import React, { useState, useCallback } from 'react'
import {
  Wand2, Loader, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Copy, RotateCcw, XCircle, Key
} from 'lucide-react'

// ─── Parse errors ─────────────────────────────────────────────────────────────
function parseErrors(errors) {
  return errors.map(e => {
    const msg = e.formattedMessage || e.message || String(e)
    const lineMatch = msg.match(/:(\d+):\d+:/)
    const line = lineMatch ? parseInt(lineMatch[1]) : null
    return { msg, line }
  })
}

// ─── Diff viewer ─────────────────────────────────────────────────────────────
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
    <div className="text-xs font-mono p-3 rounded"
      style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
      Contract structure was adjusted — no line-level text changes
    </div>
  )
  return (
    <div className="space-y-1 max-h-52 overflow-y-auto">
      {diffs.map(({ line, old: o, new: n }) => (
        <div key={line} className="rounded overflow-hidden text-xs font-mono"
          style={{ border: '1px solid #0d2d3d' }}>
          <div className="px-3 py-1 flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <span style={{ opacity: 0.5, minWidth: 28, flexShrink: 0 }}>L{line}−</span>
            <span className="break-all">{o || '(empty)'}</span>
          </div>
          <div className="px-3 py-1 flex items-start gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
            <span style={{ opacity: 0.5, minWidth: 28, flexShrink: 0 }}>L{line}+</span>
            <span className="break-all">{n || '(empty)'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Local heuristic fixer (works offline, no API needed) ─────────────────────
function localHeuristicFix(sourceCode, errors) {
  let code = sourceCode
  const fixes = []
  const lines = code.split('\n')

  errors.forEach(e => {
    const msg = (e.formattedMessage || e.message || '').toLowerCase()
    const lineMatch = (e.formattedMessage || e.message || '').match(/:(\d+):\d+:/)
    const lineNum = lineMatch ? parseInt(lineMatch[1]) - 1 : -1

    // Missing SPDX
    if ((msg.includes('spdx') || msg.includes('license')) && !code.includes('SPDX-License-Identifier')) {
      code = '// SPDX-License-Identifier: MIT\n' + code
      fixes.push('Added missing SPDX-License-Identifier comment')
    }

    // Missing pragma
    if (msg.includes('pragma') && !code.includes('pragma solidity')) {
      const insertAt = code.includes('SPDX') ? code.indexOf('\n') + 1 : 0
      code = code.slice(0, insertAt) + 'pragma solidity ^0.8.19;\n' + code.slice(insertAt)
      fixes.push('Added missing pragma solidity declaration')
    }

    // Missing semicolon on a specific line
    if ((msg.includes('expected') && msg.includes(';')) || msg.includes('expected \';\' but got')) {
      if (lineNum >= 0 && lineNum < lines.length) {
        const trimmed = lines[lineNum].trim()
        if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{')
          && !trimmed.endsWith('}') && !trimmed.startsWith('//')
          && !trimmed.startsWith('*')) {
          lines[lineNum] = lines[lineNum].replace(/\s*$/, ';')
          code = lines.join('\n')
          fixes.push(`Added missing semicolon at line ${lineNum + 1}`)
        }
      }
    }

    // Visibility not specified for state variable
    if (msg.includes('no visibility specified') && lineNum >= 0) {
      if (!lines[lineNum].includes('public') && !lines[lineNum].includes('private')
        && !lines[lineNum].includes('internal') && !lines[lineNum].includes('external')) {
        lines[lineNum] = lines[lineNum].replace(/^(\s*\w+\s+)/, '$1public ')
        code = lines.join('\n')
        fixes.push(`Added public visibility to state variable at line ${lineNum + 1}`)
      }
    }

    // Wrong function declaration keyword
    if (msg.includes('expected function') || msg.includes('function expected')) {
      fixes.push(`Function syntax issue at line ${lineNum + 1} — check keyword order`)
    }
  })

  return {
    fixedCode: code,
    explanation: fixes.length > 0
      ? `Applied ${fixes.length} automatic fix(es) using pattern matching.`
      : 'Could not automatically detect fixable patterns. Please review errors manually.',
    changes: fixes.length > 0
      ? fixes
      : ['No automatic patterns matched — add your Anthropic API key for full AI fixing'],
    isHeuristic: true,
  }
}

// ─── Claude API call ──────────────────────────────────────────────────────────
async function callClaudeAPI(sourceCode, errorSummary, apiKey) {
  const prompt = `You are an expert Solidity smart contract developer helping a beginner fix compile errors.

CONTRACT WITH ERRORS:
\`\`\`solidity
${sourceCode}
\`\`\`

COMPILE ERRORS:
\`\`\`
${errorSummary}
\`\`\`

Fix ALL the errors above. Rules:
- Preserve the original contract logic and intent completely
- Only change what is necessary to fix the errors
- Do not add extra comments, features, or change variable names unnecessarily
- Make sure the fixed contract compiles successfully with solidity ^0.8.x

Return ONLY valid JSON, no markdown fences, no extra text:
{"fixedCode":"COMPLETE_FIXED_CONTRACT","explanation":"What was wrong in one sentence","changes":["Specific change 1","Specific change 2"]}`

  const headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }

  // Use provided API key, or fall back to env variable
  const key = apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (key) headers['x-api-key'] = key

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 401) throw new Error('Invalid or missing API key. Add VITE_ANTHROPIC_API_KEY to your .env file.')
    if (res.status === 403) throw new Error('CORS blocked. Run the app locally with `npm run dev`.')
    throw new Error(`API returned ${res.status}: ${body.slice(0, 100)}`)
  }

  const data = await res.json()
  const rawText = data.content?.map(b => b.text || '').join('') || ''

  // Robustly extract JSON even if model adds surrounding text
  const jsonStart = rawText.indexOf('{')
  const jsonEnd = rawText.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found in API response')

  const parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1))
  if (!parsed.fixedCode) throw new Error('API response missing fixedCode')
  return parsed
}

// ─── Storage key for API key ───────────────────────────────────────────────────
const API_KEY_STORAGE = 'shardeum_devkit_anthropic_key'

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DebugAssistant({ errors, sourceCode, onApplyFix }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [copied, setCopied] = useState(false)
  const [applying, setApplying] = useState(false)
  const [isHeuristic, setIsHeuristic] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savedKey, setSavedKey] = useState(() => {
    try { return localStorage.getItem(API_KEY_STORAGE) || '' } catch { return '' }
  })

  const parsedErrors = parseErrors(errors)

  const saveApiKey = () => {
    try { localStorage.setItem(API_KEY_STORAGE, apiKeyInput) } catch {}
    setSavedKey(apiKeyInput)
    setShowKeyInput(false)
  }

  const runDebug = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setErrorMsg(null)
    setIsHeuristic(false)
    setOpen(true)

    const errorSummary = parsedErrors.map(e => e.msg).join('\n')
    const keyToUse = savedKey || apiKeyInput

    try {
      const parsed = await callClaudeAPI(sourceCode, errorSummary, keyToUse)
      setResult(parsed)
      setIsHeuristic(false)
    } catch (apiErr) {
      console.warn('AI API failed, falling back to heuristic:', apiErr.message)
      const heuristic = localHeuristicFix(sourceCode, errors)
      setResult(heuristic)
      setIsHeuristic(true)
      // Show the actual API error as info (not fatal)
      setErrorMsg(apiErr.message)
    } finally {
      setLoading(false)
    }
  }, [sourceCode, parsedErrors, errors, savedKey, apiKeyInput])

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

  if (!errors || errors.length === 0) return null

  const hasKey = !!(savedKey || import.meta.env.VITE_ANTHROPIC_API_KEY)

  return (
    <div className="rounded overflow-hidden"
      style={{ border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.04)' }}>

      {/* ── Header ── */}
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
          <span className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '10px' }}>
            {errors.length} error{errors.length > 1 ? 's' : ''} detected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!result && !loading && (
            <button
              onClick={e => { e.stopPropagation(); runDebug() }}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#030d12', border: 'none', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Wand2 size={11} />
              Auto-Fix Errors
            </button>
          )}
          {open
            ? <ChevronUp size={13} style={{ color: '#6b9aaa' }} />
            : <ChevronDown size={13} style={{ color: '#6b9aaa' }} />}
        </div>
      </div>

      {/* ── Body ── */}
      {open && (
        <div className="px-4 pb-4 space-y-3 pt-3">

          {/* API Key section */}
          <div className="flex items-center justify-between p-2 rounded"
            style={{ background: 'rgba(0,245,212,0.04)', border: '1px solid #0d2d3d' }}>
            <div className="flex items-center gap-2">
              <Key size={11} style={{ color: hasKey ? '#10b981' : '#f59e0b' }} />
              <span className="text-xs font-mono" style={{ color: hasKey ? '#10b981' : '#f59e0b' }}>
                {hasKey ? 'API key set ✓' : 'No API key — will use heuristic fix'}
              </span>
            </div>
            <button
              onClick={() => setShowKeyInput(v => !v)}
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,245,212,0.1)', color: '#00f5d4', border: '1px solid #0d2d3d', cursor: 'pointer' }}
            >
              {showKeyInput ? 'Cancel' : hasKey ? 'Change key' : 'Add API key'}
            </button>
          </div>

          {showKeyInput && (
            <div className="space-y-2">
              <div className="text-xs font-mono" style={{ color: '#6b9aaa' }}>
                Enter your Anthropic API key for full AI fixing. Get one at console.anthropic.com
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-..."
                  className="cyber-input rounded flex-1 text-xs"
                  style={{ borderRadius: '4px' }}
                />
                <button
                  onClick={saveApiKey}
                  disabled={!apiKeyInput.startsWith('sk-')}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold"
                  style={{
                    background: apiKeyInput.startsWith('sk-') ? 'linear-gradient(135deg,#00f5d4,#00c4aa)' : '#0d2d3d',
                    color: apiKeyInput.startsWith('sk-') ? '#030d12' : '#2d5a68',
                    border: 'none', cursor: apiKeyInput.startsWith('sk-') ? 'pointer' : 'not-allowed', borderRadius: '4px',
                  }}
                >
                  Save
                </button>
              </div>
              <div className="text-xs font-mono p-2 rounded"
                style={{ background: 'rgba(0,245,212,0.04)', border: '1px solid #0d2d3d', color: '#2d5a68' }}>
                Or add to your project: create a <span style={{ color: '#00f5d4' }}>.env</span> file with{' '}
                <span style={{ color: '#00f5d4' }}>VITE_ANTHROPIC_API_KEY=sk-ant-...</span>
              </div>
            </div>
          )}

          {/* Detected errors */}
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: '#2d5a68' }}>DETECTED ERRORS</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
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

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-5">
              <Loader size={20} className="animate-spin" style={{ color: '#f59e0b' }} />
              <span className="text-sm font-mono" style={{ color: '#f59e0b' }}>
                {hasKey ? 'Claude AI is fixing your contract...' : 'Applying heuristic fixes...'}
              </span>
            </div>
          )}

          {/* Heuristic fallback notice */}
          {isHeuristic && result && (
            <div className="flex items-start gap-2 p-3 rounded text-xs font-mono"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ lineHeight: 1.6 }}>
                <div className="font-semibold mb-1">Used heuristic fixing (AI unavailable)</div>
                <div style={{ opacity: 0.85 }}>{errorMsg}</div>
                <div className="mt-1">Add an Anthropic API key above for full AI-powered fixing.</div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">

              {/* Explanation */}
              <div className="p-3 rounded"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="text-xs font-mono mb-1" style={{ color: '#f59e0b' }}>WHAT WAS WRONG</div>
                <p className="text-xs font-mono" style={{ color: '#e2f4f1', lineHeight: 1.6 }}>{result.explanation}</p>
              </div>

              {/* Changes */}
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

              {/* Diff */}
              <div>
                <div className="text-xs font-mono mb-2" style={{ color: '#2d5a68' }}>DIFF (BEFORE → AFTER)</div>
                <CodeDiff original={sourceCode} fixed={result.fixedCode} />
              </div>

              {/* Fixed code preview */}
              <div>
                <div className="text-xs font-mono mb-2" style={{ color: '#2d5a68' }}>FIXED CODE PREVIEW</div>
                <div className="rounded p-3 overflow-auto max-h-48"
                  style={{ background: '#020e17', border: '1px solid #0d2d3d' }}>
                  <pre className="text-xs font-mono"
                    style={{ color: '#e2f4f1', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {result.fixedCode}
                  </pre>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button onClick={handleApply}
                  className="flex items-center gap-2 px-4 py-2 rounded text-sm font-mono font-bold"
                  style={{
                    background: applying ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#00f5d4,#00c4aa)',
                    color: applying ? '#10b981' : '#030d12',
                    border: applying ? '1px solid #10b981' : 'none',
                    cursor: 'pointer', borderRadius: '4px',
                  }}>
                  {applying ? <CheckCircle size={13} /> : <Wand2 size={13} />}
                  {applying ? 'Applied!' : 'Apply Fix to Editor'}
                </button>

                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono"
                  style={{
                    background: 'rgba(0,245,212,0.08)', border: '1px solid #0d2d3d',
                    color: copied ? '#10b981' : '#6b9aaa',
                    cursor: 'pointer', borderRadius: '4px',
                  }}>
                  {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy Fixed Code'}
                </button>

                <button onClick={runDebug}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono"
                  style={{
                    background: 'transparent', border: '1px solid #0d2d3d',
                    color: '#2d5a68', cursor: 'pointer', borderRadius: '4px',
                  }}>
                  <RotateCcw size={11} /> Re-analyze
                </button>
              </div>
            </div>
          )}

          {/* Initial CTA */}
          {!loading && !result && (
            <div className="text-center py-4">
              <p className="text-xs font-mono mb-4" style={{ color: '#6b9aaa', lineHeight: 1.7 }}>
                {hasKey
                  ? 'Claude AI will analyze your errors and generate a corrected contract.'
                  : 'No API key set — will apply smart heuristic fixes. Add an API key above for full AI correction.'}
              </p>
              <button onClick={runDebug}
                className="inline-flex items-center gap-2 px
                -6 py-3 rounded font-mono font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  color: '#030d12', border: 'none', cursor: 'pointer', borderRadius: '6px',
                }}>
                <Wand2 size={15} />
                {hasKey ? 'Auto-Fix All Errors with AI' : 'Apply Heuristic Fix'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}