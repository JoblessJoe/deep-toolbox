// Which plugin registered which tool. dsh's tool registry doesn't record the
// owner, so we wrap `tools.register`: cordis calls it with `this.ctx` = the
// caller's context, whose fiber name is the plugin. The map is saved to
// $DSH_HOME/deep-toolbox/owners.json so the CLI (another process) sees it too.
//
// ponytail: only registrations after deep-toolbox loads are seen. Plugins that
// register global tools at boot before us stay "built-in" until a restart in
// a different order; per-agent tools (the common case) are always caught.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export const ownersFile = (): string =>
  join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'deep-toolbox', 'owners.json')

/** tool name -> plugin name; never throws. */
export function readOwners(file = ownersFile()): Record<string, string> {
  try { return JSON.parse(readFileSync(file, 'utf8')) ?? {} } catch { return {} }
}

/** Is this the dsh core (counted as built-in), or a third-party plugin? */
export const isCore = (owner: string): boolean => owner === 'root' || owner.startsWith('@deepseek-ai/')

const ORIGINAL = Symbol.for('cordis.original')

/**
 * Start recording tool owners. Returns the undo function.
 */
export function trackOwners(ctx: any, file = ownersFile()): () => void {
  const svc = ctx.get?.('tools', false)
  const target = svc?.[ORIGINAL] ?? svc
  if (!target || typeof target.register !== 'function') return () => {}
  const original = target.register
  const owners = readOwners(file)
  let timer: ReturnType<typeof setTimeout> | undefined
  const save = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(owners, null, 1)) } catch { /* read-only home: keep in memory */ }
    }, 500)
  }
  target.register = function (this: any, definition: any, ...rest: unknown[]) {
    const owner = this?.ctx?.fiber?.name
    const name = definition?.name
    if (typeof name === 'string' && typeof owner === 'string' && !name.startsWith('mcp__') && owners[name] !== owner) {
      if (isCore(owner)) { if (name in owners) { delete owners[name]; save() } } else { owners[name] = owner; save() }
    }
    return Reflect.apply(original, this, [definition, ...rest])
  }
  return () => { clearTimeout(timer); if (target.register !== original) target.register = original }
}
