// Which plugin registered which tool. dsh's tool registry doesn't record the
// owner, so we wrap `tools.register` and read the call stack: the first frame
// outside dsh's registry plumbing is the registering plugin's code, and its
// nearest package.json names the plugin. `@deepseek-ai/*` = dsh core (built-in).
// The map is saved to $DSH_HOME/deep-toolbox/owners.json so the CLI (another
// process) sees it too.
//
// ponytail: only registrations after deep-toolbox loads are seen. Global tools
// registered at boot before us stay "built-in"; per-agent tools (the common
// case) are always caught.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const ownersFile = (): string =>
  join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'deep-toolbox', 'owners.json')

/** tool name -> plugin package name; never throws. */
export function readOwners(file = ownersFile()): Record<string, string> {
  try { return JSON.parse(readFileSync(file, 'utf8')) ?? {} } catch { return {} }
}

/** dsh core packages count as built-in. */
export const isCore = (pkg: string): boolean => pkg.startsWith('@deepseek-ai/')

/** Registry plumbing between a plugin's register() call and our wrapper. */
const PLUMBING = new Set(['@deepseek-ai/cordis', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-scope'])

const pkgCache = new Map<string, string | undefined>()
/** Nearest package.json name above a file (cached per directory). */
export function packageOf(file: string): string | undefined {
  let dir = dirname(file)
  const seen: string[] = []
  for (let i = 0; i < 15; i++) {
    if (pkgCache.has(dir)) { const hit = pkgCache.get(dir); for (const d of seen) pkgCache.set(d, hit); return hit }
    seen.push(dir)
    const pj = join(dir, 'package.json')
    if (existsSync(pj)) {
      let name: string | undefined
      try { name = JSON.parse(readFileSync(pj, 'utf8')).name } catch { /* unreadable */ }
      if (typeof name === 'string' && name) { for (const d of seen) pkgCache.set(d, name); return name }
    }
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  for (const d of seen) pkgCache.set(d, undefined)
  return undefined
}

/** File paths of a stack trace, top first (frame 0 = the function that made the Error). */
export function stackFiles(stack: string): string[] {
  const files: string[] = []
  for (const raw of stack.split('\n').slice(1)) {
    const m = raw.trim().match(/^at (?:.*?\()?(.+?):\d+:\d+\)?$/)
    if (!m) continue
    let file = m[1]
    if (file.startsWith('file://')) { try { file = fileURLToPath(file) } catch { continue } }
    if (isAbsolute(file)) files.push(file)
  }
  return files
}

/** The package that called register(): skip our wrapper (frame 0) and the registry plumbing. */
export function callerPackage(stack: string): string | undefined {
  for (const file of stackFiles(stack).slice(1)) {
    const pkg = packageOf(file)
    if (pkg && !PLUMBING.has(pkg)) return pkg
  }
  return undefined
}

const ORIGINAL = Symbol.for('cordis.original')

/** Start recording tool owners. Returns the undo function. */
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
  target.register = function register(this: unknown, definition: any, ...rest: unknown[]) {
    const name = definition?.name
    if (typeof name === 'string' && !name.startsWith('mcp__')) {
      const pkg = callerPackage(new Error().stack ?? '')
      if (pkg && isCore(pkg)) { if (name in owners) { delete owners[name]; save() } }
      else if (pkg && owners[name] !== pkg) { owners[name] = pkg; save() }
    }
    return Reflect.apply(original, this, [definition, ...rest])
  }
  return () => { clearTimeout(timer); if (target.register !== original) target.register = original }
}
