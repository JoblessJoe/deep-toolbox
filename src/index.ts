// deep-toolbox — host half.
//
// - GET /api/deep-toolbox/stats?days=30 for the Toolbox page.
// - `toolbox_report`, a read-only agent tool: the same numbers as short text,
//   so an agent can say "X costs 4k tok per request and was never used —
//   turn it off?" and then use dsh's own `plugin_manager` (which asks the user).
// Numbers come from dsh's session logs (see ./stats); parsed files are cached
// by mtime, so repeat calls only re-read sessions that changed.

import { agentSummary, clampDays, collect } from './stats'
import { trackOwners } from './owners'

// Both optional: `connection` only exists in web profiles; without it the plugin
// must still load so terminal/headless agents get the tool.
export const inject = { connection: { required: false }, agents: { required: false } }

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

/** Kept short on purpose: this description is sent with every request too. */
const reportTool = {
  name: 'toolbox_report',
  description: 'Tool usage report from this dsh install\'s session logs: calls, errors, and the tokens each tool definition and startup-context part adds to every request. Use when the user asks about tool/context cost, or to suggest disabling unused tool sources (then ask the user before using plugin_manager).',
  parameters: {
    type: 'object',
    properties: { days: { type: 'number', description: 'Look-back window in days (1-365, default 30).' } },
  },
  output: {
    schema: { type: 'object', properties: { report: { type: 'string' } }, required: ['report'] },
    render: (_args: unknown, value: any) => [{ type: 'text', text: value?.report ?? '' }],
  },
  execute: async (args: { days?: number }) => ({ report: agentSummary(collect(clampDays(args?.days ?? 30))) }),
}

export function apply(ctx: any): void {
  // Remember which plugin registers which tool, so plugin tools don't count as built-in.
  ctx.effect(() => trackOwners(ctx), 'deep-toolbox.owners')

  // The /api channel only exists in web profiles; the agent tool works everywhere.
  if (ctx.connection?.fetch?.register) {
    ctx.effect(() => ctx.connection.fetch.register({
      path: '/api/deep-toolbox/stats',
      methods: ['GET'],
      requestBody: 'buffered', // required by dsh's route registry; GET has no body anyway
      fetch: async (request: Request): Promise<Response> => {
        try {
          return json({ ok: true, ...collect(clampDays(new URL(request.url, 'http://x').searchParams.get('days') ?? 30)) })
        } catch (error) {
          return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
        }
      },
    }), 'deep-toolbox.route/stats')
  }

  // Tools are per agent: register on each new agent, and on those already alive.
  if (ctx.on && ctx.agents) {
    const add = (agent: any) => ctx.effect(() => agent.ctx.tools.register(reportTool), 'deep-toolbox.tool.toolbox_report')
    ctx.on('agent/created', ({ agent }: { agent: any }) => add(agent))
    try { for (const agent of ctx.agents.roots?.() ?? []) add(agent) } catch { /* agent/created covers the rest */ }
  }
}
