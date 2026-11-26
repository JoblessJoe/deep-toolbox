// deep-toolbox — host half.
//
// One read-only route for the Toolbox page: GET /api/deep-toolbox/stats?days=30.
// The numbers come from dsh's own session logs (see ./stats), parsed files are
// cached by mtime, so repeat views only re-read sessions that changed.

import { collect } from './stats'

export const inject = ['connection']

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export function apply(ctx: any): void {
  // The /api channel only exists in web profiles.
  if (!ctx.connection?.fetch?.register) return
  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/deep-toolbox/stats',
    methods: ['GET'],
    fetch: async (request: Request): Promise<Response> => {
      try {
        const raw = Number(new URL(request.url, 'http://x').searchParams.get('days') ?? 30)
        const days = Number.isFinite(raw) ? Math.min(365, Math.max(1, Math.round(raw))) : 30
        return json({ ok: true, ...collect(days) })
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
      }
    },
  }), 'deep-toolbox.route/stats')
}
