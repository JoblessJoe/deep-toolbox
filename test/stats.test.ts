// Self-check for the log parser + aggregation. Run: npm test
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { collect, decodeZstdFrames, groupOf, parseSession } from '../src/stats.ts'

const now = Date.now()
const tool = (name: string, description = 'x'.repeat(40)) => ({ name, description, parameters: { type: 'object' } })
const lines = (events: object[]) => events.map(e => JSON.stringify(e)).join('\n')

const main = lines([
  { type: 'session', delegationDepth: 0 },
  { type: 'request/header', time: now - 5000, data: { header: { tools: [tool('bash'), tool('mcp__math__evaluate'), tool('old_tool')] } } },
  { type: 'request/header', time: now - 1000, data: { header: { tools: [tool('bash'), tool('mcp__math__evaluate')] } } },
  { type: 'tool/call', time: now - 900, data: { callId: 'a', name: 'bash' } },
  { type: 'tool/result', time: now - 400, data: { message: { toolCallId: 'a', isError: false, content: [{ type: 'text', text: 'ok' }] } } },
  { type: 'tool/call', time: now - 300, data: { callId: 'b', name: 'bash' } },
  { type: 'tool/result', time: now - 200, data: { message: { toolCallId: 'b', isError: true, content: [{ type: 'text', text: 'Error:\n  boom' }] } } },
])
const sub = lines([
  { type: 'session', delegationDepth: 1 },
  { type: 'request/header', time: now, data: { header: { tools: [tool('read')] } } },
  { type: 'tool/call', time: now - 100, data: { callId: 'c', name: 'bash' } },
])

// parseSession
const facts = parseSession(main + '\nnot json\n')
assert.equal(facts.calls.length, 2)
assert.equal(facts.calls[0].ms, 500)
assert.equal(facts.calls[1].error, 'Error: boom')
assert.deepEqual(facts.latest?.names, ['bash', 'mcp__math__evaluate'])
assert.equal(facts.headers.length, 2)
assert.equal(groupOf('mcp__math__evaluate'), 'mcp:math')
assert.equal(groupOf('bash'), 'built-in')

// multi-frame files (dsh appends one frame per batch) + a torn tail
const two = Buffer.concat([zstdCompressSync(Buffer.from('a\n')), zstdCompressSync(Buffer.from('b\n'))])
assert.equal(decodeZstdFrames(two), 'a\nb\n')
assert.equal(decodeZstdFrames(Buffer.concat([two, two.subarray(0, 6)])), 'a\nb\n')

// collect over a fake sessions root (v4 + v3 file names)
const root = mkdtempSync(join(tmpdir(), 'deep-toolbox-'))
mkdirSync(join(root, 'cwd', 's1'), { recursive: true })
mkdirSync(join(root, 'cwd', 's2'), { recursive: true })
writeFileSync(join(root, 'cwd', 's1', 'session.v4.jsonl.zstd'), Buffer.concat(main.split('\n').map(l => zstdCompressSync(Buffer.from(l + '\n')))))
writeFileSync(join(root, 'cwd', 's2', 'session.v3.jsonl.zstd'), zstdCompressSync(Buffer.from(sub)))
const report = collect(30, root, now + 1000)
const row = (n: string) => report.rows.find(r => r.name === n)!
assert.equal(report.sessions, 2)
assert.equal(row('bash').calls, 3)
assert.equal(row('bash').subCalls, 1)
assert.equal(row('bash').errors, 1)
assert.equal(row('bash').avgMs, 300) // (500 + 100) / 2; the sub call has no result
assert.equal(row('bash').current, true)
assert.equal(row('read').current, false, 'subagent headers do not define the current config')
assert.equal(row('old_tool').current, false)
assert.equal(row('mcp__math__evaluate').calls, 0)
assert.equal(report.current.tools, 2)
assert.equal(row('bash').offeredRequests, 2)
assert.equal(row('old_tool').offeredRequests, 1)
assert.equal(report.current.unused, 1)
assert.equal(report.current.cost, row('bash').cost + row('mcp__math__evaluate').cost)
// a range that ends before every call drops them
assert.equal(collect(1, root, now + 3 * 86_400_000).sessions, 0)
console.log('stats.test: ok')
