// Core: turn dsh session logs into per-tool usage + cost numbers.
//
// dsh already records everything we need in its own session logs
// ($DSH_HOME/sessions/<cwd>/<session>/session.v{3,4}.jsonl.zstd):
//   tool/call       -> name, callId, time
//   tool/result     -> toolCallId, isError, content, time
//   request/header  -> the full tool schemas sent with each request
// So there is no runtime hook and no database: read the logs, aggregate.
// Node builtins only (zstd via node:zlib, Node >= 22.15).

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'

export interface ToolRow {
  name: string
  /** `built-in`, or `mcp:<server>` for `mcp__<server>__<tool>`. */
  group: string
  calls: number
  /** Calls made by subagents (session delegationDepth > 0). */
  subCalls: number
  errors: number
  /** Mean call → result time, ms (null when no result was seen). */
  avgMs: number | null
  /** Mean result size, tokens (chars / 4). */
  avgResultTok: number | null
  /** Tokens the tool's schema adds to every request (chars / 4). */
  cost: number
  /** Sessions whose requests offered this tool. */
  offeredIn: number
  /** Requests that carried this tool's schema (its tokens were sent this often, before prompt caching). */
  offeredRequests: number
  /** Last call, epoch ms (0 = never in range). */
  lastUsed: number
  /** Offered in the newest main-agent request, i.e. still configured. */
  current: boolean
  /** Newest error messages, newest first (max 20). */
  recentErrors: { time: number; text: string }[]
}

export interface StatsReport {
  days: number
  generatedAt: number
  sessions: number
  rows: ToolRow[]
  current: { tools: number; cost: number; unused: number; unusedCost: number }
}

export const sessionsRoot = (): string =>
  process.env.DSH_SESSIONS ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'sessions')

export const tokens = (value: unknown): number => Math.round(JSON.stringify(value ?? '').length / 4)
export const groupOf = (name: string): string => (name.startsWith('mcp__') ? `mcp:${name.split('__')[1]}` : 'built-in')

/** What one session log contributes; cached per file (path + mtime + size). */
interface SessionFacts {
  depth: number
  calls: { name: string; time: number; ms: number | null; resultTok: number | null; error: string | null }[]
  /** Tool schema costs offered in this session. */
  offered: Map<string, number>
  /** Every request header: when, and which tools it carried. */
  headers: { time: number; names: string[] }[]
  /** Newest main-agent request header: time + tool names. */
  latest: { time: number; names: string[] } | null
}

/** Parse one session log (JSONL text). Exported for tests. */
export function parseSession(text: string): SessionFacts {
  const facts: SessionFacts = { depth: 0, calls: [], offered: new Map(), headers: [], latest: null }
  const pending = new Map<string, number>() // callId -> index into facts.calls
  for (const line of text.split('\n')) {
    if (!line) continue
    let e: any
    try { e = JSON.parse(line) } catch { continue }
    switch (e.type) {
      case 'session':
        facts.depth = e.delegationDepth ?? 0
        break
      case 'request/header': {
        const defs: any[] = e.data?.header?.tools ?? []
        for (const def of defs) facts.offered.set(def.name, Math.max(facts.offered.get(def.name) ?? 0, tokens(def)))
        facts.headers.push({ time: e.time, names: defs.map(d => d.name) })
        if (facts.depth === 0 && (facts.latest === null || e.time > facts.latest.time)) {
          facts.latest = { time: e.time, names: defs.map(d => d.name) }
        }
        break
      }
      case 'tool/call':
        pending.set(e.data?.callId, facts.calls.length)
        facts.calls.push({ name: e.data?.name ?? '?', time: e.time, ms: null, resultTok: null, error: null })
        break
      case 'tool/result': {
        const m = e.data?.message
        const i = pending.get(m?.toolCallId)
        if (i === undefined) break
        pending.delete(m.toolCallId)
        const call = facts.calls[i]
        call.ms = e.time - call.time
        call.resultTok = tokens(m.content)
        if (m.isError) {
          const text = (Array.isArray(m.content) ? m.content : []).map((c: any) => c?.text ?? '').join(' ')
          call.error = text.replace(/\s+/g, ' ').trim().slice(0, 300) || 'error'
        }
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
    return null // truncated / being written: skip this round
  }
}

/** Aggregate all sessions touched in the last `days` days. */
export function collect(days = 30, root = sessionsRoot(), now = Date.now()): StatsReport {
  const since = now - days * 86_400_000
  const rows = new Map<string, ToolRow & { msSum: number; msN: number; resSum: number; resN: number }>()
  const row = (name: string) => {
    let r = rows.get(name)
    if (!r) {
      r = { name, group: groupOf(name), calls: 0, subCalls: 0, errors: 0, avgMs: null, avgResultTok: null, cost: 0,
        offeredIn: 0, offeredRequests: 0, lastUsed: 0, current: false, recentErrors: [], msSum: 0, msN: 0, resSum: 0, resN: 0 }
      rows.set(name, r)
    }
    return r
  }
  let sessions = 0
  let latest: { time: number; names: string[] } | null = null

  for (const file of sessionFiles(root)) {
    if (file.mtimeMs < since) continue
    const facts = factsFor(file)
    if (!facts) continue
    sessions++
    for (const [name, cost] of facts.offered) { const r = row(name); r.cost = Math.max(r.cost, cost); r.offeredIn++ }
    for (const h of facts.headers) if (h.time >= since) for (const name of h.names) row(name).offeredRequests++
    if (facts.latest && (!latest || facts.latest.time > latest.time)) latest = facts.latest
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

  const currentNames = new Set(latest?.names ?? [])
  const out: ToolRow[] = [...rows.values()].map(({ msSum, msN, resSum, resN, ...r }) => ({
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
  return {
    days, generatedAt: now, sessions, rows: out,
    current: { tools: cur.length, cost: sum(cur), unused: unused.length, unusedCost: sum(unused) },
  }
}
