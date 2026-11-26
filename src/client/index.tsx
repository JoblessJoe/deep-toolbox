// deep-toolbox — browser half: a "Toolbox" tab on dsh's Plugins page (next to
// Installed / Discover): which tools agents call, how often they fail, and what each
// one's definition costs in every request. Styling uses the host's own
// tokens (--dsw-*), so light and dark themes just work.

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { en, zh } from './locales'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    toolbox: keyof typeof en
  }
}

export const TAB_ID = 'deep-toolbox'
export const inject = ['slots', 'locale']

type T = (k: keyof typeof en) => string

// --- wire types (mirror src/stats.ts) ------------------------------------
interface ToolRow {
  name: string; group: string; calls: number; subCalls: number; errors: number
  avgMs: number | null; avgResultTok: number | null; cost: number
  offeredIn: number; offeredRequests: number; sentTok: number; lastUsed: number; current: boolean
  recentErrors: { time: number; text: string }[]
}
interface Report {
  ok: true; days: number; generatedAt: number; sessions: number; rows: ToolRow[]
  current: { tools: number; cost: number; unused: number; unusedCost: number }
  startup: { total: number; parts: { kind: StartupKind; label: string; tokens: number }[] }
}
type StartupKind = 'system' | 'instructions' | 'context' | 'skills' | 'tools'
/** One distinct colour per startup part (in order); "Other" is always grey. */
const PART_COLORS = ['#4f8fd9', '#e07b39', '#3fa37a', '#a66bd6', '#d9a441', '#d1566f', '#2fb3b8', '#8a9a3b', '#7c6f64', '#5b6ee1']
const partColor = (label: string, i: number): string => (label === 'Other' ? 'var(--dtbx-c3)' : PART_COLORS[i % PART_COLORS.length])

// --- styles ---------------------------------------------------------------
const STYLE_ID = 'dtbx-styles'
const CSS = `
.dtbx-root {
  --dtbx-line: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent);
  --dtbx-fill: var(--dsw-alias-bg-skeleton);
  --dtbx-hover: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-skeleton));
  --dtbx-bar: color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);
  --dtbx-warn: var(--dsw-alias-state-warning-primary, #d29922);
  --dtbx-err: var(--dsw-alias-state-error-primary, #e5484d);
  --dtbx-ok: var(--dsw-alias-state-success-primary, #30a46c);
  --dtbx-c1: #8e7cc3; --dtbx-c2: #4f8fd9; --dtbx-c3: #9aa4b1; --dtbx-c4: #d9a441; --dtbx-c5: #3fa37a;
  font-family: inherit; color: var(--dsw-alias-label-primary);
}
.dtbx-root svg { fill: currentColor; }
.dtbx-root button, .dtbx-root input { font-family: inherit; }
.dtbx-inner { width: 100%; max-width: 1080px; margin: 0 auto; box-sizing: border-box; padding: 8px 0 32px; display: flex; flex-direction: column; gap: 16px; }
.dtbx-sub { margin: 0; font-size: 13.5px; color: var(--dsw-alias-label-caption); }
.dtbx-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.dtbx-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.dtbx-tab { border: none; background: transparent; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 13.5px; color: var(--dsw-alias-label-secondary); }
.dtbx-tab:hover { background: var(--dtbx-hover); color: var(--dsw-alias-label-primary); }
.dtbx-tab[aria-selected="true"] { background: var(--dtbx-fill); color: var(--dsw-alias-label-primary); }
.dtbx-end { display: flex; align-items: center; gap: 6px; }
.dtbx-check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--dsw-alias-label-secondary); cursor: pointer; user-select: none; }
.dtbx-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.dtbx-card { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border-radius: 12px; background: var(--dtbx-fill); }
.dtbx-card-label { font-size: 12.5px; color: var(--dsw-alias-label-caption); }
.dtbx-card-value { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.dtbx-card-hint { font-size: 12px; color: var(--dsw-alias-label-caption); }
.dtbx-card-warn .dtbx-card-value { color: var(--dtbx-warn); }
.dtbx-group-name { font-weight: 600; }
.dtbx-group-meta { margin-left: auto; display: flex; gap: 14px; font-size: 12.5px; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dtbx-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.dtbx-table th { text-align: right; font-weight: 500; font-size: 12px; color: var(--dsw-alias-label-caption); padding: 6px 14px; border-bottom: 1px solid var(--dtbx-line); white-space: nowrap; }
.dtbx-table th:first-child, .dtbx-table td:first-child { text-align: left; }
.dtbx-table td { text-align: right; padding: 7px 14px; border-bottom: 1px solid var(--dtbx-line); white-space: nowrap; }
.dtbx-table tr:last-child td { border-bottom: none; }
.dtbx-row { cursor: pointer; }
.dtbx-row:hover td { background: var(--dtbx-hover); }
.dtbx-name { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 360px; }
.dtbx-name-text { overflow: hidden; text-overflow: ellipsis; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; }
.dtbx-calls { display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; }
.dtbx-track { width: 64px; height: 6px; border-radius: 3px; background: var(--dtbx-line); overflow: hidden; }
.dtbx-fillbar { height: 100%; border-radius: 3px; background: var(--dtbx-bar); }
.dtbx-dim { color: var(--dsw-alias-label-caption); }
.dtbx-badge { flex: none; font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--dtbx-fill); color: var(--dsw-alias-label-caption); }
.dtbx-badge-unused { color: var(--dtbx-warn); background: color-mix(in srgb, var(--dtbx-warn) 12%, transparent); }
.dtbx-badge-err { color: var(--dtbx-err); background: color-mix(in srgb, var(--dtbx-err) 10%, transparent); }
.dtbx-err-num { color: var(--dtbx-err); }
.dtbx-errors { padding: 8px 14px 12px; background: color-mix(in srgb, var(--dtbx-fill) 50%, transparent); }
.dtbx-errors-title { font-size: 12px; color: var(--dsw-alias-label-caption); margin-bottom: 6px; }
.dtbx-error { display: flex; gap: 10px; font-size: 12.5px; padding: 3px 0; white-space: normal; text-align: left; }
.dtbx-error time { flex: none; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dtbx-error span { overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
.dtbx-panel { display: flex; flex-direction: column; gap: 10px; }
.dtbx-tips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dtbx-tip { display: flex; align-items: baseline; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 13.5px; line-height: 1.45; background: var(--dtbx-fill); }
.dtbx-tip-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; transform: translateY(-1px); background: var(--dtbx-ok); }
.dtbx-tip-warn .dtbx-tip-dot { background: var(--dtbx-warn); }
.dtbx-tip-err .dtbx-tip-dot { background: var(--dtbx-err); }
.dtbx-sources { display: flex; flex-direction: column; border: 1px solid var(--dtbx-line); border-radius: 12px; overflow: hidden; }
.dtbx-table-wrap { overflow-x: auto; border-top: 1px solid var(--dtbx-line); }
.dtbx-source + .dtbx-source { border-top: 1px solid var(--dtbx-line); }
.dtbx-source-head { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 14px; border: none; background: transparent; cursor: pointer; font-size: 13.5px; color: var(--dsw-alias-label-primary); text-align: left; }
.dtbx-source-head:hover { background: var(--dtbx-hover); }
.dtbx-chev { display: inline-block; width: 10px; color: var(--dsw-alias-label-caption); transition: transform 120ms ease; }
.dtbx-chev-open { transform: rotate(90deg); }
.dtbx-strong { color: var(--dsw-alias-label-primary); font-weight: 550; }
.dtbx-verdict-busy { color: var(--dtbx-ok); background: color-mix(in srgb, var(--dtbx-ok) 12%, transparent); }
.dtbx-verdict-rare { color: var(--dtbx-warn); background: color-mix(in srgb, var(--dtbx-warn) 12%, transparent); }
.dtbx-verdict-never { color: var(--dtbx-err); background: color-mix(in srgb, var(--dtbx-err) 10%, transparent); }
.dtbx-link { align-self: flex-start; border: none; background: transparent; padding: 0; cursor: pointer; font-size: 13px; color: var(--dsw-alias-label-secondary); text-decoration: underline; text-underline-offset: 2px; }
.dtbx-startup { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--dtbx-line); }
.dtbx-startup-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.dtbx-h2 { margin: 0; font-size: 15px; font-weight: 600; }
.dtbx-stack { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--dtbx-line); }
.dtbx-stack span { height: 100%; }
.dtbx-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 24px; font-size: 13px; }
.dtbx-legend-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dtbx-dot { flex: none; width: 8px; height: 8px; border-radius: 2px; }
.dtbx-legend-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtbx-legend-num { flex: none; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dtbx-note { font-size: 12px; color: var(--dsw-alias-label-caption); }
.dtbx-notice { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 13px; color: var(--dtbx-err); background: color-mix(in srgb, var(--dtbx-err) 8%, transparent); }
.dtbx-btn { border: 1px solid var(--dtbx-line); background: transparent; border-radius: 8px; padding: 5px 10px; font-size: 13px; cursor: pointer; color: var(--dsw-alias-label-primary); }
.dtbx-btn:hover { background: var(--dtbx-hover); }
.dtbx-btn:disabled { opacity: 0.5; cursor: default; }
.dtbx-muted { color: var(--dsw-alias-label-caption); font-size: 13px; }
@media (max-width: 760px) {
  .dtbx-cards { grid-template-columns: 1fr; }
  .dtbx-group-meta span:not(.dtbx-strong) { display: none; }
  .dtbx-legend { grid-template-columns: 1fr; }
  .dtbx-hide-narrow { display: none; }
}
`
function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

// --- helpers --------------------------------------------------------------
const RANGES = [7, 30, 90] as const
const fmt = (n: number): string => n.toLocaleString()
const compact = (n: number): string => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const secs = (ms: number | null): string => (ms === null ? '–' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`)
/** A tool fails "often" when ≥ 20 % of at least 3 calls error. */
const failsOften = (r: ToolRow): boolean => r.calls >= 3 && r.errors / r.calls >= 0.2
function shortName(r: ToolRow): string { return r.group === 'built-in' ? r.name : r.name.split('__').slice(2).join('__') || r.name }
function ago(ts: number, t: T): string {
  if (!ts) return t('never')
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days < 7) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-days, 'day')
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

// --- page -----------------------------------------------------------------
interface Source {
  group: string; label: string; mcp: boolean; rows: ToolRow[]
  calls: number; errors: number; cost: number; sent: number; tools: number
  verdict: 'busy' | 'rare' | 'never'
}
interface Tip { level: 'warn' | 'err' | 'ok'; text: string }

/** Rarely used = under 10 calls in the range. */
const verdictOf = (calls: number): Source['verdict'] => (calls === 0 ? 'never' : calls < 10 ? 'rare' : 'busy')

function sourcesOf(report: Report, t: T): Source[] {
  const by = new Map<string, ToolRow[]>()
  for (const r of report.rows) by.set(r.group, [...(by.get(r.group) ?? []), r])
  return [...by].map(([group, rows]) => {
    const cur = rows.filter(r => r.current)
    const calls = cur.reduce((n, r) => n + r.calls, 0) // installed tools only: removed ones don't make a source "used"
    return {
      group, rows, calls, label: group === 'built-in' ? t('group.builtin') : group.slice(4), mcp: group !== 'built-in',
      errors: cur.reduce((n, r) => n + r.errors, 0),
      cost: cur.reduce((n, r) => n + r.cost, 0), tools: cur.length,
      sent: rows.reduce((n, r) => n + r.sentTok, 0),
      verdict: verdictOf(calls),
    }
  }).filter(s => s.tools > 0 || s.rows.some(r => r.calls > 0))
    .sort((a, b) => b.cost - a.cost)
}

/** Plain-language findings, most useful first. */
function tipsOf(report: Report, sources: Source[], t: T): Tip[] {
  const tips: Tip[] = []
  const fill = (k: keyof typeof en, v: Record<string, string>) => Object.entries(v).reduce((s, [a, b]) => s.replace(`{${a}}`, () => b), t(k)) // fn: no $-patterns from error text
  const days = String(report.days)
  for (const r of report.rows.filter(x => x.current && failsOften(x)).sort((a, b) => b.errors - a.errors)) {
    tips.push({ level: 'err', text: fill('tip.fails', { tool: r.name, n: String(r.errors), of: String(r.calls), why: r.recentErrors[0]?.text.slice(0, 110) ?? '' }) })
  }
  for (const s of sources.filter(x => x.mcp && x.tools > 0 && x.verdict === 'never')) {
    tips.push({ level: 'warn', text: fill('tip.never', { src: s.label, tok: compact(s.cost), days }) })
  }
  for (const s of sources.filter(x => x.mcp && x.tools > 0 && x.verdict === 'rare' && x.cost >= 1000)) {
    tips.push({ level: 'warn', text: fill('tip.rare', { src: s.label, n: String(s.calls), tok: compact(s.cost), days }) })
  }
  const builtinUnused = report.rows.filter(r => r.current && r.group === 'built-in' && r.calls === 0)
  if (builtinUnused.length >= 5) {
    tips.push({ level: 'warn', text: fill('tip.builtin', { n: String(builtinUnused.length), tok: compact(builtinUnused.reduce((n, r) => n + r.cost, 0)), days }) })
  }
  if (tips.length === 0) tips.push({ level: 'ok', text: t('tip.ok') })
  return tips
}

function ToolboxPage({ ctx }: { ctx: ClientContext }): ReactNode {
  const t = useMemo(() => ctx.locale.bind('toolbox') as T, [ctx])
  const [days, setDays] = useState<number>(30)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [openSource, setOpenSource] = useState<string | null>(null)
  const [openTool, setOpenTool] = useState<string | null>(null)
  const [showRemoved, setShowRemoved] = useState(false)

  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick(n => n + 1), [])
  useEffect(() => {
    // Abort the previous request so a slow older range can't overwrite a newer one.
    const ac = new AbortController()
    setLoading(true); setError(false)
    fetch(`/api/deep-toolbox/stats?days=${days}`, { headers: { accept: 'application/json' }, signal: ac.signal })
      .then(r => r.json())
      .then((d) => { if (d?.ok) setReport(d); else setError(true) })
      .catch(() => { if (!ac.signal.aborted) setError(true) })
      .finally(() => { if (!ac.signal.aborted) setLoading(false) })
    return () => ac.abort()
  }, [days, tick])

  const sources = useMemo(() => (report ? sourcesOf(report, t) : []), [report, t])
  const tips = useMemo(() => (report ? tipsOf(report, sources, t) : []), [report, sources, t])
  const totals = useMemo(() => {
    const rows = report?.rows ?? []
    const calls = rows.reduce((n, r) => n + r.calls, 0)
    const errors = rows.reduce((n, r) => n + r.errors, 0)
    return { calls, errors, maxCalls: Math.max(1, ...rows.map(r => r.calls)) }
  }, [report])

  return (
    <div className="dtbx-root">
      <div className="dtbx-inner">
        <div className="dtbx-toolbar">
          <p className="dtbx-sub">{t('subtitle')}</p>
          <div className="dtbx-end">
            <div className="dtbx-tabs" role="tablist">
              {RANGES.map(n => (
                <button key={n} type="button" role="tab" aria-selected={days === n} className="dtbx-tab" onClick={() => setDays(n)}>
                  {t('range.days').replace('{n}', String(n))}
                </button>
              ))}
            </div>
            <button type="button" className="dtbx-btn" onClick={load} disabled={loading}>{t('refresh')}</button>
          </div>
        </div>

        {error && (
          <div className="dtbx-notice"><span>{t('error')}</span><button type="button" className="dtbx-btn" onClick={load}>{t('retry')}</button></div>
        )}
        {!report && !error && <p className="dtbx-muted">{t('loading')}</p>}

        {report && (
          <>
            <div className="dtbx-cards">
              <Card label={t('card.startup')} value={`${compact(report.startup.total || report.current.cost)} tok`}
                hint={t('card.startupHint').replace('{tok}', compact(report.startup.parts.filter(p => p.kind === 'tools').reduce((n, p) => n + p.tokens, 0)))} />
              <Card warn={report.current.unusedCost >= 2000} label={t('card.unused')} value={`${compact(report.current.unusedCost)} tok`}
                hint={t('card.unusedHint').replace('{n}', fmt(report.current.unused)).replace('{days}', String(report.days))} />
              <Card warn={totals.calls > 0 && totals.errors / totals.calls >= 0.05} label={t('card.errors')}
                value={totals.calls ? `${((totals.errors / totals.calls) * 100).toFixed(1)}%` : '–'}
                hint={t('card.callsHint').replace('{n}', fmt(totals.calls)).replace('{s}', fmt(report.sessions))} />
            </div>

            <section className="dtbx-panel">
              <h2 className="dtbx-h2">{t('tips.title')}</h2>
              <ul className="dtbx-tips">
                {tips.map((tip, i) => (
                  <li key={i} className={`dtbx-tip dtbx-tip-${tip.level}`}><span className="dtbx-tip-dot" />{tip.text}</li>
                ))}
              </ul>
              {tips.some(x => x.level === 'warn') && <span className="dtbx-note">{t('tips.how')}</span>}
            </section>

            {report.startup.total > 0 && <Startup t={t} startup={report.startup} />}

            <section className="dtbx-panel">
              <div className="dtbx-startup-head">
                <h2 className="dtbx-h2">{t('sources.title')}</h2>
                <label className="dtbx-check">
                  <input type="checkbox" checked={showRemoved} onChange={e => setShowRemoved(e.target.checked)} />{t('filter.removed')}
                </label>
              </div>
              <div className="dtbx-sources">
                {sources.map(s => {
                  const open = openSource === s.group
                  const rows = s.rows.filter(r => showRemoved || r.current)
                  return (
                    <div key={s.group} className="dtbx-source">
                      <button type="button" className="dtbx-source-head" aria-expanded={open} onClick={() => setOpenSource(open ? null : s.group)}>
                        <span className={open ? 'dtbx-chev dtbx-chev-open' : 'dtbx-chev'}>›</span>
                        <span className="dtbx-group-name">{s.label}</span>
                        {s.mcp && <span className="dtbx-badge">MCP</span>}
                        <span className={`dtbx-badge dtbx-verdict-${s.verdict}`}>{t(`verdict.${s.verdict}`)}</span>
                        <span className="dtbx-group-meta">
                          <span>{t('source.tools').replace('{n}', fmt(s.tools))}</span>
                          <span>{t('source.calls').replace('{n}', fmt(s.calls))}</span>
                          <span className="dtbx-strong">{t('source.cost').replace('{tok}', compact(s.cost))}</span>
                        </span>
                      </button>
                      {open && (
                        <div className="dtbx-table-wrap"><table className="dtbx-table">
                          <thead>
                            <tr>
                              <th>{t('col.tool')}</th><th>{t('col.calls')}</th><th>{t('col.errors')}</th>
                              <th className="dtbx-hide-narrow">{t('col.time')}</th><th className="dtbx-hide-narrow">{t('col.result')}</th>
                              <th>{t('col.cost')}</th><th>{t('col.last')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 && <tr><td colSpan={7} className="dtbx-muted">{t('empty')}</td></tr>}
                            {rows.map(r => <Row key={r.name} r={r} t={t} max={totals.maxCalls} open={openTool === r.name} onToggle={() => setOpenTool(openTool === r.name ? null : r.name)} />)}
                          </tbody>
                        </table></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
            <p className="dtbx-note">{t('how')}</p>
          </>
        )}
      </div>
    </div>
  )
}

function Startup({ t, startup }: { t: T; startup: Report['startup'] }): ReactNode {
  return (
    <section className="dtbx-startup">
      <div className="dtbx-startup-head">
        <h2 className="dtbx-h2">{t('startup.title')}</h2>
        <span className="dtbx-muted">{t('startup.total').replace('{tok}', fmt(startup.total))}</span>
      </div>
      <div className="dtbx-stack" role="img" aria-label={t('startup.title')}>
        {startup.parts.map((p, i) => (
          <span key={i} title={`${p.label}: ${fmt(p.tokens)} tok`} style={{ width: `${(p.tokens / startup.total) * 100}%`, background: partColor(p.label, i) }} />
        ))}
      </div>
      <div className="dtbx-legend">
        {startup.parts.map((p, i) => (
          <div key={i} className="dtbx-legend-row">
            <span className="dtbx-dot" style={{ background: partColor(p.label, i) }} />
            <span className="dtbx-legend-label" title={p.label}>{p.label}</span>
            <span className="dtbx-legend-num">{compact(p.tokens)} · {Math.round((p.tokens / startup.total) * 100)}%</span>
          </div>
        ))}
      </div>
      <span className="dtbx-note">{t('startup.hint')}</span>
    </section>
  )
}

function Card({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }): ReactNode {
  return (
    <div className={warn ? 'dtbx-card dtbx-card-warn' : 'dtbx-card'}>
      <span className="dtbx-card-label">{label}</span>
      <span className="dtbx-card-value">{value}</span>
      <span className="dtbx-card-hint">{hint}</span>
    </div>
  )
}

function Row({ r, t, max, open, onToggle }: { r: ToolRow; t: T; max: number; open: boolean; onToggle: () => void }): ReactNode {
  const width = r.calls ? Math.max(3, Math.sqrt(r.calls / max) * 100) : 0 // sqrt: small counts stay visible
  return (
    <>
      <tr className="dtbx-row" onClick={onToggle} aria-expanded={open}>
        <td>
          <span className="dtbx-name" title={r.name}>
            <span className="dtbx-name-text">{shortName(r)}</span>
            {!r.current && <span className="dtbx-badge">{t('badge.removed')}</span>}
            {r.current && r.calls === 0 && <span className="dtbx-badge dtbx-badge-unused">{t('badge.unused')}</span>}
            {failsOften(r) && <span className="dtbx-badge dtbx-badge-err">{t('badge.errors')}</span>}
          </span>
        </td>
        <td>
          <span className="dtbx-calls">
            <span className="dtbx-track"><span className="dtbx-fillbar" style={{ width: `${width}%`, display: 'block' }} /></span>
            <span>{fmt(r.calls)}</span>
          </span>
        </td>
        <td className={r.errors ? 'dtbx-err-num' : 'dtbx-dim'}>{r.errors ? fmt(r.errors) : '–'}</td>
        <td className="dtbx-hide-narrow dtbx-dim">{secs(r.avgMs)}</td>
        <td className="dtbx-hide-narrow dtbx-dim">{r.avgResultTok === null ? '–' : `${compact(r.avgResultTok)} tok`}</td>
        <td>{fmt(r.cost)} tok</td>
        <td className="dtbx-dim">{ago(r.lastUsed, t)}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="dtbx-errors">
            <div className="dtbx-errors-title">{t('errors.title')}</div>
            {r.recentErrors.length === 0 && <div className="dtbx-muted">{t('errors.none')}</div>}
            {r.recentErrors.slice(0, 8).map((e, i) => (
              <div key={i} className="dtbx-error">
                <time>{new Date(e.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                <span>{e.text}</span>
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  )
}

export function apply(ctx: ClientContext): void {
  ensureStyles()
  const Page = (): ReactNode => <ToolboxPage ctx={ctx} />
  const t = ctx.locale.bind('toolbox')
  ctx.effect(() => ctx.locale.register('toolbox', { zh, en }), 'deep-toolbox: dictionaries')
  ctx.effect(() => ctx.slots.inject('plugins.tab', () =>
    ctx.slots.register({ name: 'plugins.tab', id: TAB_ID, order: 50, label: () => t('nav'), locale: 'toolbox' } as any, Page as any)),
  'deep-toolbox: plugins tab')
}
