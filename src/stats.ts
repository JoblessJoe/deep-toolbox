// Core: turn dsh session logs into per-tool usage + cost numbers.
//
// dsh already records everything we need in its own session logs
// ($DSH_HOME/sessions/<cwd>/<session>/session.v{3,4}.jsonl.zstd):
//   tool/call       -> name, callId, time
//   tool/result     -> toolCallId, isError, content, time
//   request/header  -> the full tool schemas sent with each request
//   system/message + user/message (before the first request) -> startup context
// So there is no runtime hook and no database: read the logs, aggregate.
// Node builtins only (zstd via node:zlib, Node >= 22.15).

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'
import { readOwners } from './owners.ts'

export interface ToolRow {
  name: string
  /** `built-in`, `mcp:<server>` for `mcp__<server>__<tool>`, or `plugin:<name>` (see ./owners). */
  group: string
  calls: number
  /** Calls made by subagents (session delegationDepth > 0). */
  subCalls: number
  errors: number
  /** Mean call → result time, ms (null when no result was seen). */
  avgMs: number | null
  /** Mean result size, tokens (chars / 4). */
  avgResultTok: number | null
  /** Tokens the tool's schema adds to every request (chars / 4), newest size in range. */
  cost: number
  /** Sessions that offered this tool in range. */
  offeredIn: number
  /** Requests in range that carried this tool. */
  offeredRequests: number
  /** Schema tokens actually sent in range (before prompt caching). */
  sentTok: number
  /** Last call, epoch ms (0 = never in range). */
  lastUsed: number
  /** Offered in the newest main-agent request, i.e. still configured. */
  current: boolean
  /** Newest error messages, newest first (max 20). */
  recentErrors: { time: number; text: string }[]
}

/** One slice of the context every new chat starts with. */
export interface StartupPart {
  kind: 'system' | 'instructions' | 'context' | 'skills' | 'tools'
  label: string
  tokens: number
}

export interface StatsReport {
  days: number
  generatedAt: number
  sessions: number
  rows: ToolRow[]
  current: { tools: number; cost: number; unused: number; unusedCost: number }
  /** Newest main session's first request, biggest parts first (empty when unknown). */
  startup: { total: number; parts: StartupPart[] }
}

export const sessionsRoot = (): string =>
  process.env.DSH_SESSIONS ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'sessions')

export const tokens = (value: unknown): number => Math.round((typeof value === 'string' ? value : JSON.stringify(value ?? '')).length / 4)
export const groupOf = (name: string, owners: Record<string, string> = {}): string =>
  name.startsWith('mcp__') ? `mcp:${name.split('__')[1]}` : owners[name] ? `plugin:${owners[name]}` : 'built-in'
export const clampDays = (raw: unknown): number => {
  const n = Number(raw)
  return Number.isFinite(n) ? Math.min(365, Math.max(1, Math.round(n))) : 30
}
const DAY = 86_400_000

/** Per tool, per UTC day: requests carrying it, tokens sent, newest schema size. */
type DayUse = Map<number, { req: number; sent: number; cost: number; at: number }>

/** What one session log contributes; cached per file (mtime + size). */
interface SessionFacts {
  depth: number
  calls: { name: string; time: number; ms: number | null; resultTok: number | null; error: string | null }[]
  offered: Map<string, DayUse>
  /** Newest request header: time + tool names (main sessions define the current config). */
  latest: { time: number; names: string[] } | null
  /** Context of the first request, or null (subagent / no request yet). */
  startup: { time: number; parts: StartupPart[]; tools: { name: string; tokens: number }[] } | null
}

const sourceLabel = (group: string): string =>
  group === 'built-in' ? 'Built-in tools' : group.startsWith('mcp:') ? `MCP: ${group.slice(4)}` : `Plugin: ${group.slice(7)}`

/** Startup parts + the first request's tools summed per source (owners applied now, not at parse time). */
function regroupTools(startup: NonNullable<SessionFacts['startup']>, owners: Record<string, string>): StartupPart[] {
  const groups = new Map<string, number>()
  for (const t of startup.tools) { const g = groupOf(t.name, owners); groups.set(g, (groups.get(g) ?? 0) + t.tokens) }
  return [...startup.parts, ...[...groups].map(([g, tok]) => ({ kind: 'tools' as const, label: sourceLabel(g), tokens: tok }))]
}

const text = (content: unknown): string =>
  typeof content === 'string' ? content
    : Array.isArray(content) ? content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('') : ''

/**
 * One part per instruction file: dsh prefixes each with "Instructions from:
 * <path>". The wrapper text before the first file counts as "Other".
 */
function instructionParts(body: string): StartupPart[] {
  const parts: StartupPart[] = []
  let file = '', buf = ''
  const flush = () => {
    if (buf.trim()) parts.push(file ? { kind: 'instructions', label: file, tokens: tokens(buf) } : { kind: 'context', label: 'Other', tokens: tokens(buf) })
  }
  for (const line of body.split('\n')) {
    const from = line.match(/^Instructions from: (.+)$/)
    if (from) { flush(); file = from[1].trim(); buf = '' }
    buf += line + '\n'
  }
  flush()
  return parts
}

const SOURCE_LABEL: Record<string, [StartupPart['kind'], string]> = {
  'system-prompt': ['system', 'System prompt'],
  'skill-catalog': ['skills', 'Skill list'],
  'runtime-context': ['context', 'Other'],
  'working-directory': ['context', 'Other'],
  'time-context': ['context', 'Other'],
}

/** Parse one session log (JSONL text). Exported for tests. */
export function parseSession(raw: string): SessionFacts {
  const facts: SessionFacts = { depth: 0, calls: [], offered: new Map(), latest: null, startup: null }
  const pending = new Map<string, number>() // callId -> index into facts.calls
  let lastTime = 0
  let early: StartupPart[] | null = [] // collected until the first request
  for (const line of raw.split('\n')) {
    if (!line) continue
    let e: any
    try { e = JSON.parse(line) } catch { continue }
    const time: number = typeof e.time === 'number' ? (lastTime = e.time) : lastTime
    switch (e.type) {
      case 'session':
        facts.depth = e.delegationDepth ?? 0
        break
      case 'system/message':
      case 'user/message': {
        if (!early) break
        const m = e.data?.message ?? e.data // v4 puts the message at data
        const kind: string = m?.source?.kind ?? ''
        if (kind === 'user') break // the user's own prompt is not startup overhead
        if (kind === 'agent-instructions') { early.push(...instructionParts(text(m.content))); break }
        const [k, label] = SOURCE_LABEL[kind] ?? ['context', kind || 'Other']
        const tok = tokens(text(m?.content))
        if (tok > 0) early.push({ kind: k, label, tokens: tok })
        break
      }
      case 'request/header': {
        const defs: any[] = e.data?.header?.tools ?? []
        const names = defs.map(d => d.name as string)
        const day = Math.floor(time / DAY)
        for (const def of defs) {
          const cost = tokens(def)
          let use = facts.offered.get(def.name)
          if (!use) facts.offered.set(def.name, (use = new Map()))
          const d = use.get(day) ?? { req: 0, sent: 0, cost: 0, at: 0 }
          d.req++; d.sent += cost
          if (time >= d.at) { d.cost = cost; d.at = time }
          use.set(day, d)
        }
        if (!facts.latest || time >= facts.latest.time) facts.latest = { time, names }
        if (early) {
          if (facts.depth === 0) facts.startup = { time, parts: early, tools: defs.map(d => ({ name: d.name as string, tokens: tokens(d) })) }
          early = null
        }
        break
      }
      case 'tool/call':
        pending.set(e.data?.callId, facts.calls.length)
        facts.calls.push({ name: e.data?.name ?? '?', time, ms: null, resultTok: null, error: null })
        break
      case 'tool/result': {
        const m = e.data?.message
        const i = pending.get(m?.toolCallId)
        if (i === undefined) break
        pending.delete(m.toolCallId)
        const call = facts.calls[i]
        call.ms = time - call.time
        call.resultTok = tokens(m.content)
        if (m.isError) call.error = text(m.content).replace(/\s+/g, ' ').trim().slice(0, 300) || 'error'
        break
      }
    }
  }
  return facts
}

const ZSTD_MAGIC = 0xfd2fb528

/**
 * dsh appends one zstd frame per event batch, and node:zlib stops after the
 * first frame — so walk the frame headers (same layout dsh's own
 * session-persistence-jsonl scanner reads) and decode frame by frame.
 * A torn final frame (file mid-write) is skipped. Exported for tests.
 */
export function decodeZstdFrames(buf: Buffer): string {
  const out: Buffer[] = []
  let off = 0
  while (off + 5 <= buf.length && buf.readUInt32LE(off) === ZSTD_MAGIC) {
    const start = off
    const fhd = buf.readUInt8(off + 4)
    const fcsFlag = fhd >>> 6, single = (fhd & 0x20) !== 0, checksum = (fhd & 0x04) !== 0, dictFlag = fhd & 0x03
    off += 5 + (single ? 0 : 1) + (dictFlag === 3 ? 4 : dictFlag) + (fcsFlag === 0 ? (single ? 1 : 0) : 1 << fcsFlag)
    for (;;) {
      if (off + 3 > buf.length) return Buffer.concat(out).toString('utf8')
      const header = buf.readUIntLE(off, 3)
      off += 3 + (((header >>> 1) & 3) === 1 ? 1 : header >>> 3)
      if (header & 1) break
    }
    if (checksum) off += 4
    if (off > buf.length) break
    out.push(zstdDecompressSync(buf.subarray(start, off)))
  }
  return Buffer.concat(out).toString('utf8')
}

const cache = new Map<string, { key: string; facts: SessionFacts }>()
const LOG_NAMES = ['session.v4.jsonl.zstd', 'session.v3.jsonl.zstd']

function* sessionFiles(root: string): Generator<{ path: string; mtimeMs: number; size: number }> {
  let dirs: string[] = []
  try { dirs = readdirSync(root) } catch { return }
  for (const dir of dirs) {
    let ids: string[] = []
    try { ids = readdirSync(join(root, dir)) } catch { continue }
    for (const id of ids) {
      for (const name of LOG_NAMES) {
        const path = join(root, dir, id, name)
        try { const st = statSync(path); yield { path, mtimeMs: st.mtimeMs, size: st.size }; break } catch { /* try next */ }
      }
    }
  }
}

// ponytail: parses synchronously on the host event loop (~1-2 s cold for ~100
// sessions, then only changed files). Move to a worker if logs grow a lot.
function factsFor(file: { path: string; mtimeMs: number; size: number }): SessionFacts | null {
  const key = `${file.mtimeMs}:${file.size}`
  const hit = cache.get(file.path)
  if (hit?.key === key) return hit.facts
  try {
    const facts = parseSession(decodeZstdFrames(readFileSync(file.path)))
    cache.set(file.path, { key, facts })
    return facts
  } catch {
    return null // unreadable right now: skip this round
  }
}

/** Aggregate all sessions touched in the last `days` days. */
export function collect(days = 30, root = sessionsRoot(), now = Date.now(), owners = readOwners()): StatsReport {
  const since = now - days * DAY
  const sinceDay = Math.floor(since / DAY)
  type Acc = ToolRow & { msSum: number; msN: number; resSum: number; resN: number; costAt: number }
  const rows = new Map<string, Acc>()
  const row = (name: string): Acc => {
    let r = rows.get(name)
    if (!r) {
      r = { name, group: groupOf(name, owners), calls: 0, subCalls: 0, errors: 0, avgMs: null, avgResultTok: null, cost: 0,
        offeredIn: 0, offeredRequests: 0, sentTok: 0, lastUsed: 0, current: false, recentErrors: [],
        msSum: 0, msN: 0, resSum: 0, resN: 0, costAt: 0 }
      rows.set(name, r)
    }
    return r
  }
  let sessions = 0
  let latest: { time: number; names: string[] } | null = null
  let startup: SessionFacts['startup'] = null
  const seen = new Set<string>()

  for (const file of sessionFiles(root)) {
    seen.add(file.path)
    if (file.mtimeMs < since) continue
    const facts = factsFor(file)
    if (!facts) continue
    sessions++
    for (const [name, byDay] of facts.offered) {
      let inRange = false
      for (const [day, d] of byDay) {
        if (day < sinceDay) continue
        const r = row(name)
        inRange = true
        r.offeredRequests += d.req; r.sentTok += d.sent
        if (d.at >= r.costAt) { r.cost = d.cost; r.costAt = d.at }
      }
      if (inRange) row(name).offeredIn++
    }
    if (facts.depth === 0 && facts.latest && (!latest || facts.latest.time > latest.time)) latest = facts.latest
    if (facts.startup && (!startup || facts.startup.time > startup.time)) startup = facts.startup
    for (const c of facts.calls) {
      if (c.time < since) continue
      const r = row(c.name)
      r.calls++
      if (facts.depth > 0) r.subCalls++
      r.lastUsed = Math.max(r.lastUsed, c.time)
      if (c.ms !== null) { r.msSum += c.ms; r.msN++ }
      if (c.resultTok !== null) { r.resSum += c.resultTok; r.resN++ }
      if (c.error !== null) { r.errors++; r.recentErrors.push({ time: c.time, text: c.error }) }
    }
  }
  for (const path of cache.keys()) if (!seen.has(path)) cache.delete(path) // deleted sessions

  const currentNames = new Set(latest?.names ?? [])
  const out: ToolRow[] = [...rows.values()].map(({ msSum, msN, resSum, resN, costAt, ...r }) => ({
    ...r,
    avgMs: msN ? Math.round(msSum / msN) : null,
    avgResultTok: resN ? Math.round(resSum / resN) : null,
    current: currentNames.has(r.name),
    recentErrors: r.recentErrors.sort((a, b) => b.time - a.time).slice(0, 20),
  }))
  out.sort((a, b) => b.calls - a.calls || b.cost - a.cost || a.name.localeCompare(b.name))

  const cur = out.filter(r => r.current)
  const unused = cur.filter(r => r.calls === 0)
  const sum = (rs: ToolRow[]) => rs.reduce((n, r) => n + r.cost, 0)
  const parts = mergeParts(startup ? regroupTools(startup, owners) : [])
  return {
    days, generatedAt: now, sessions, rows: out,
    current: { tools: cur.length, cost: sum(cur), unused: unused.length, unusedCost: sum(unused) },
    startup: { total: parts.reduce((n, p) => n + p.tokens, 0), parts },
  }
}

/**
 * Same label → one part; parts under 1 % and all "Other" bits fold into one
 * "Other" row at the end, so the chart stays readable.
 */
export function mergeParts(raw: StartupPart[]): StartupPart[] {
  const byLabel = new Map<string, StartupPart>()
  for (const p of raw) {
    const hit = byLabel.get(p.label)
    if (hit) hit.tokens += p.tokens
    else byLabel.set(p.label, { ...p })
  }
  const total = [...byLabel.values()].reduce((n, p) => n + p.tokens, 0)
  const keep: StartupPart[] = []
  let other = 0
  for (const p of byLabel.values()) {
    if (p.label === 'Other' || p.tokens < total * 0.01) other += p.tokens
    else keep.push(p)
  }
  keep.sort((a, b) => b.tokens - a.tokens)
  if (other > 0) keep.push({ kind: 'context', label: 'Other', tokens: other })
  return keep
}

/** Compact plain-text summary for agents (the `toolbox_report` tool). */
export function agentSummary(r: StatsReport, top = 8): string {
  const lines: string[] = []
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
  lines.push(`Last ${r.days} days, ${r.sessions} sessions. Every request carries ${r.current.tools} tool definitions = ${k(r.current.cost)} tok.`)
  if (r.startup.total) {
    lines.push(`\nStartup context of a new chat ≈ ${k(r.startup.total)} tok:`)
    for (const p of r.startup.parts.slice(0, top)) lines.push(`- ${p.label}: ${k(p.tokens)}`)
  }
  const groups = new Map<string, { calls: number; cost: number; tools: number }>()
  for (const row of r.rows.filter(x => x.current)) {
    const g = groups.get(row.group) ?? { calls: 0, cost: 0, tools: 0 }
    g.calls += row.calls; g.cost += row.cost; g.tools++
    groups.set(row.group, g)
  }
  lines.push('\nTool sources (calls in range / tok per request):')
  for (const [name, g] of [...groups].sort((a, b) => b[1].cost - a[1].cost)) {
    lines.push(`- ${name}: ${g.calls} calls / ${k(g.cost)} tok (${g.tools} tools)${g.calls === 0 ? ' ← never used' : ''}`)
  }
  const unused = r.rows.filter(x => x.current && x.calls === 0).sort((a, b) => b.cost - a.cost)
  if (unused.length) lines.push(`\nNever called (${unused.length}, ${k(r.current.unusedCost)} tok per request), biggest: ${unused.slice(0, top).map(x => `${x.name} ${k(x.cost)}`).join(', ')}`)
  const failing = r.rows.filter(x => x.calls >= 3 && x.errors / x.calls >= 0.2)
  if (failing.length) lines.push(`\nOften failing: ${failing.map(x => `${x.name} ${x.errors}/${x.calls} (${x.recentErrors[0]?.text.slice(0, 90) ?? ''})`).join('; ')}`)
  lines.push('\nTo turn a source off: plugin_manager list_plugins → set_plugin enabled=false. Ask the user first; it changes every session.')
  return lines.join('\n')
}
