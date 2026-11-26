// deep-toolbox — browser half: a "Toolbox" row in the left sidebar that opens
// a full page: which tools agents call, how often they fail, and what each
// one's definition costs in every request. Styling uses the host's own
// tokens (--dsw-*), so light and dark themes just work.

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconCordisPluginOutlineRegular as ToolboxIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { en, zh } from './locales'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    toolbox: keyof typeof en
  }
}

export const PANEL_ID = 'deep-toolbox' as MainPanelId
export const inject = ['slots', 'locale', 'layout']

type T = (k: keyof typeof en) => string
let appCtx: ClientContext | null = null

// --- wire types (mirror src/stats.ts) ------------------------------------
interface ToolRow {
  name: string; group: string; calls: number; subCalls: number; errors: number
  avgMs: number | null; avgResultTok: number | null; cost: number
  offeredIn: number; offeredRequests: number; lastUsed: number; current: boolean
  recentErrors: { time: number; text: string }[]
}
interface Report {
  ok: true; days: number; generatedAt: number; sessions: number; rows: ToolRow[]
  current: { tools: number; cost: number; unused: number; unusedCost: number }
}

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
  height: 100%; overflow-y: auto; font-family: inherit; color: var(--dsw-alias-label-primary);
}
.dtbx-root svg { fill: currentColor; }
.dtbx-root button, .dtbx-root input { font-family: inherit; }
.dtbx-inner { width: 100%; max-width: 1080px; margin: 0 auto; box-sizing: border-box; padding: 32px 40px 48px; display: flex; flex-direction: column; gap: 16px; }
.dtbx-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.01em; }
.dtbx-sub { margin: -8px 0 0; font-size: 13.5px; color: var(--dsw-alias-label-caption); }
.dtbx-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.dtbx-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.dtbx-tab { border: none; background: transparent; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 13.5px; color: var(--dsw-alias-label-secondary); }
.dtbx-tab:hover { background: var(--dtbx-hover); color: var(--dsw-alias-label-primary); }
.dtbx-tab[aria-selected="true"] { background: var(--dtbx-fill); color: var(--dsw-alias-label-primary); }
.dtbx-end { display: flex; align-items: center; gap: 6px; }
.dtbx-search { display: flex; align-items: center; padding: 5px 10px; background: var(--dtbx-fill); border: 1px solid transparent; border-radius: 10px; }
.dtbx-search:focus-within { border-color: var(--dtbx-line); }
.dtbx-search input { width: 180px; border: none; outline: none; background: transparent; font-size: 13px; color: var(--dsw-alias-label-primary); }
.dtbx-search input::placeholder { color: var(--dsw-alias-label-caption); }
.dtbx-check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--dsw-alias-label-secondary); cursor: pointer; user-select: none; }
.dtbx-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.dtbx-card { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border-radius: 12px; background: var(--dtbx-fill); }
.dtbx-card-label { font-size: 12.5px; color: var(--dsw-alias-label-caption); }
.dtbx-card-value { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.dtbx-card-hint { font-size: 12px; color: var(--dsw-alias-label-caption); }
.dtbx-card-warn .dtbx-card-value { color: var(--dtbx-warn); }
.dtbx-group { border: 1px solid var(--dtbx-line); border-radius: 12px; overflow: hidden; }
.dtbx-group-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--dtbx-fill); font-size: 13.5px; }
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
.dtbx-note { font-size: 12px; color: var(--dsw-alias-label-caption); }
.dtbx-notice { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 13px; color: var(--dtbx-err); background: color-mix(in srgb, var(--dtbx-err) 8%, transparent); }
.dtbx-btn { border: 1px solid var(--dtbx-line); background: transparent; border-radius: 8px; padding: 5px 10px; font-size: 13px; cursor: pointer; color: var(--dsw-alias-label-primary); }
.dtbx-btn:hover { background: var(--dtbx-hover); }
.dtbx-btn:disabled { opacity: 0.5; cursor: default; }
.dtbx-muted { color: var(--dsw-alias-label-caption); font-size: 13px; }
@media (max-width: 760px) {
  .dtbx-inner { padding: 20px 16px 32px; }
  .dtbx-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dtbx-group { overflow-x: auto; }
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
type Filter = 'all' | 'unused' | 'errors'
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
function ToolboxPage(): ReactNode {
  const t = appCtx!.locale.bind('toolbox') as T // set in apply() before any render
  const [days, setDays] = useState<number>(30)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [showRemoved, setShowRemoved] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(false)
    fetch(`/api/deep-toolbox/stats?days=${days}`, { headers: { accept: 'application/json' } })
      .then(r => r.json())
      .then((d) => { if (d?.ok) setReport(d); else setError(true) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [days])
  useEffect(load, [load])

  const groups = useMemo(() => {
    if (!report) return []
    const q = query.trim().toLowerCase()
    const rows = report.rows
      .filter(r => showRemoved || r.current)
      .filter(r => filter === 'all' || (filter === 'unused' ? r.current && r.calls === 0 : r.errors > 0))
      .filter(r => !q || r.name.toLowerCase().includes(q))
    const byGroup = new Map<string, ToolRow[]>()
    for (const r of rows) byGroup.set(r.group, [...(byGroup.get(r.group) ?? []), r])
    return [...byGroup].map(([group, rs]) => ({
      group, rows: rs,
      calls: rs.reduce((n, r) => n + r.calls, 0),
      cost: rs.filter(r => r.current).reduce((n, r) => n + r.cost, 0),
      sent: rs.reduce((n, r) => n + r.cost * r.offeredRequests, 0),
    })).sort((a, b) => b.calls - a.calls || b.cost - a.cost)
  }, [report, filter, query, showRemoved])

  const totals = useMemo(() => {
    const rows = report?.rows ?? []
    const calls = rows.reduce((n, r) => n + r.calls, 0)
    const errors = rows.reduce((n, r) => n + r.errors, 0)
    return { calls, errors, maxCalls: Math.max(1, ...rows.map(r => r.calls)) }
  }, [report])

  return (
    <div className="dtbx-root">
      <div className="dtbx-inner">
        <h1 className="dtbx-title">{t('title')}</h1>
        <p className="dtbx-sub">{t('subtitle')}</p>

        <div className="dtbx-toolbar">
          <div className="dtbx-tabs" role="tablist">
            {RANGES.map(n => (
              <button key={n} type="button" role="tab" aria-selected={days === n} className="dtbx-tab" onClick={() => setDays(n)}>
                {t('range.days').replace('{n}', String(n))}
              </button>
            ))}
          </div>
          <div className="dtbx-end">
            <label className="dtbx-search"><input value={query} placeholder={t('search')} onChange={e => setQuery(e.target.value)} /></label>
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
              <Card label={t('card.tools')} value={fmt(report.current.tools)} hint={t('card.sessions').replace('{n}', fmt(report.sessions))} />
              <Card label={t('card.cost')} value={`${compact(report.current.cost)} tok`} hint={t('card.costHint')} />
              <Card warn={report.current.unused > 0} label={t('card.unused')} value={fmt(report.current.unused)}
                hint={t('card.unusedHint').replace('{tok}', compact(report.current.unusedCost))} />
              <Card warn={totals.calls > 0 && totals.errors / totals.calls >= 0.05} label={t('card.errors')}
                value={totals.calls ? `${((totals.errors / totals.calls) * 100).toFixed(1)}%` : '–'}
                hint={t('card.callsHint').replace('{n}', fmt(totals.calls))} />
            </div>

            <div className="dtbx-toolbar">
              <div className="dtbx-tabs" role="tablist">
                {(['all', 'unused', 'errors'] as const).map(f => (
                  <button key={f} type="button" role="tab" aria-selected={filter === f} className="dtbx-tab" onClick={() => setFilter(f)}>{t(`filter.${f}`)}</button>
                ))}
              </div>
              <label className="dtbx-check">
                <input type="checkbox" checked={showRemoved} onChange={e => setShowRemoved(e.target.checked)} />{t('filter.removed')}
              </label>
            </div>

            {groups.length === 0 && <p className="dtbx-muted">{t('empty')}</p>}
            {groups.map(g => (
              <section key={g.group} className="dtbx-group">
                <div className="dtbx-group-head">
                  <span className="dtbx-group-name">{g.group === 'built-in' ? t('group.builtin') : g.group.slice(4)}</span>
                  {g.group !== 'built-in' && <span className="dtbx-badge">MCP</span>}
                  <span className="dtbx-group-meta">
                    <span>{t('card.callsHint').replace('{n}', fmt(g.calls))}</span>
                    <span>{compact(g.cost)} tok / req</span>
                    <span className="dtbx-hide-narrow">{t('group.spent').replace('{tok}', compact(g.sent))}</span>
                  </span>
                </div>
                <table className="dtbx-table">
                  <thead>
                    <tr>
                      <th>{t('col.tool')}</th><th>{t('col.calls')}</th><th>{t('col.errors')}</th>
                      <th className="dtbx-hide-narrow">{t('col.time')}</th><th className="dtbx-hide-narrow">{t('col.result')}</th>
                      <th>{t('col.cost')}</th><th>{t('col.last')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(r => <Row key={r.name} r={r} t={t} max={totals.maxCalls} open={open === r.name} onToggle={() => setOpen(open === r.name ? null : r.name)} />)}
                  </tbody>
                </table>
              </section>
            ))}
            <p className="dtbx-note">{t('how')}</p>
          </>
        )}
      </div>
    </div>
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

function ToolboxNavIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return <ToolboxIcon size={size} />
}

export function apply(ctx: ClientContext): void {
  appCtx = ctx
  ensureStyles()
  const t = ctx.locale.bind('toolbox')
  ctx.effect(() => ctx.locale.register('toolbox', { zh, en }), 'deep-toolbox: dictionaries')
  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 40, label: () => t('nav'), locale: 'toolbox' }, ToolboxNavIcon)),
  'deep-toolbox: sidebar')
  ctx.effect(() => ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID, locale: 'toolbox' } as any, ToolboxPage as any)),
  'deep-toolbox: main')
}
