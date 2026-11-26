// deep-toolbox CLI: the same report in a terminal (or for an agent via bash).
//   deep-toolbox [days=30] [--errors <tool>] [--json]
import { collect } from './stats'

const args = process.argv.slice(2)
const take = (flag: string): string | null => { const i = args.indexOf(flag); return i < 0 ? null : (args.splice(i, 2)[1] ?? '') }
const errorsFor = take('--errors')
const asJson = args.includes('--json')
const days = Number(args.find(a => /^\d+$/.test(a)) ?? 30)
const report = collect(days)

if (errorsFor !== null) {
  const row = report.rows.find(r => r.name === errorsFor)
  if (!row) console.log(`unknown tool: ${errorsFor}`)
  else console.log(row.recentErrors.map(e => `${new Date(e.time).toISOString().slice(0, 16)}  ${e.text}`).join('\n') || 'no errors')
} else if (asJson) {
  console.log(JSON.stringify(report, null, 1))
} else {
  const pad = (v: unknown, n: number) => String(v).padStart(n)
  const ago = (ms: number) => (ms ? `${Math.round((Date.now() - ms) / 86_400_000)}d` : 'never')
  const groups = new Map<string, typeof report.rows>()
  for (const r of report.rows.filter(r => r.current || r.calls > 0)) groups.set(r.group, [...(groups.get(r.group) ?? []), r])
  console.log(`deep-toolbox — last ${days} days, ${report.sessions} sessions\n`)
  console.log(`${'tool'.padEnd(44)}${pad('calls', 7)}${pad('err', 5)}${pad('avg s', 7)}${pad('cost', 6)}${pad('last', 7)}`)
  for (const [group, rows] of [...groups].sort((a, b) => sumCalls(b[1]) - sumCalls(a[1]))) {
    console.log(`\n${group} — ${sumCalls(rows)} calls, ${rows.reduce((n, r) => n + r.cost, 0).toLocaleString()} tok/prompt`)
    for (const r of rows) {
      console.log(`  ${r.name.padEnd(42)}${pad(r.calls, 7)}${pad(r.errors || '', 5)}${pad(r.avgMs === null ? '-' : (r.avgMs / 1000).toFixed(1), 7)}${pad(r.cost, 6)}${pad(ago(r.lastUsed), 7)}${r.current ? '' : '  (removed)'}`)
    }
  }
  const c = report.current
  console.log(`\nNow offered: ${c.tools} tools, ${c.cost.toLocaleString()} tok per prompt. Never used in ${days} days: ${c.unused} tools, ${c.unusedCost.toLocaleString()} tok.`)
}

function sumCalls(rows: { calls: number }[]): number { return rows.reduce((n, r) => n + r.calls, 0) }
