// src/stats.ts
import { readdirSync, readFileSync as readFileSync2, statSync } from "node:fs";
import { join as join2 } from "node:path";
import { homedir as homedir2 } from "node:os";
import { zstdDecompressSync } from "node:zlib";

// src/owners.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
var ownersFile = () => join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "deep-toolbox", "owners.json");
function readOwners(file = ownersFile()) {
  try {
    return JSON.parse(readFileSync(file, "utf8")) ?? {};
  } catch {
    return {};
  }
}
var isCore = (pkg) => pkg.startsWith("@deepseek-ai/");
var PLUMBING = /* @__PURE__ */ new Set(["@deepseek-ai/cordis", "@deepseek-ai/dsh-tools", "@deepseek-ai/dsh-scope"]);
var pkgCache = /* @__PURE__ */ new Map();
function packageOf(file) {
  let dir = dirname(file);
  const seen = [];
  for (let i = 0; i < 15; i++) {
    if (pkgCache.has(dir)) {
      const hit = pkgCache.get(dir);
      for (const d of seen) pkgCache.set(d, hit);
      return hit;
    }
    seen.push(dir);
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      let name;
      try {
        name = JSON.parse(readFileSync(pj, "utf8")).name;
      } catch {
      }
      if (typeof name === "string" && name) {
        for (const d of seen) pkgCache.set(d, name);
        return name;
      }
    }
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  for (const d of seen) pkgCache.set(d, void 0);
  return void 0;
}
function stackFiles(stack) {
  const files = [];
  for (const raw of stack.split("\n").slice(1)) {
    const m = raw.trim().match(/^at (?:.*?\()?(.+?):\d+:\d+\)?$/);
    if (!m) continue;
    let file = m[1];
    if (file.startsWith("file://")) {
      try {
        file = fileURLToPath(file);
      } catch {
        continue;
      }
    }
    if (isAbsolute(file)) files.push(file);
  }
  return files;
}
function callerPackage(stack) {
  for (const file of stackFiles(stack).slice(1)) {
    const pkg = packageOf(file);
    if (pkg && !PLUMBING.has(pkg)) return pkg;
  }
  return void 0;
}
var ORIGINAL = /* @__PURE__ */ Symbol.for("cordis.original");
function trackOwners(ctx, file = ownersFile()) {
  const svc = ctx.get?.("tools", false);
  const target = svc?.[ORIGINAL] ?? svc;
  if (!target || typeof target.register !== "function") return () => {
  };
  const original = target.register;
  const owners = readOwners(file);
  let timer;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(owners, null, 1));
      } catch {
      }
    }, 500);
  };
  target.register = function register(definition, ...rest) {
    const name = definition?.name;
    if (typeof name === "string" && !name.startsWith("mcp__")) {
      const pkg = callerPackage(new Error().stack ?? "");
      if (pkg && isCore(pkg)) {
        if (name in owners) {
          delete owners[name];
          save();
        }
      } else if (pkg && owners[name] !== pkg) {
        owners[name] = pkg;
        save();
      }
    }
    return Reflect.apply(original, this, [definition, ...rest]);
  };
  return () => {
    clearTimeout(timer);
    if (target.register !== original) target.register = original;
  };
}

// src/stats.ts
var sessionsRoot = () => process.env.DSH_SESSIONS ?? join2(process.env.DSH_HOME ?? join2(homedir2(), ".dsh"), "sessions");
var tokens = (value) => Math.round((typeof value === "string" ? value : JSON.stringify(value ?? "")).length / 4);
var groupOf = (name, owners = {}) => name.startsWith("mcp__") ? `mcp:${name.split("__")[1]}` : owners[name] ? `plugin:${owners[name]}` : "built-in";
var clampDays = (raw) => {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(365, Math.max(1, Math.round(n))) : 30;
};
var DAY = 864e5;
var sourceLabel = (group) => group === "built-in" ? "Built-in tools" : group.startsWith("mcp:") ? `MCP: ${group.slice(4)}` : `Plugin: ${group.slice(7)}`;
function regroupTools(startup, owners) {
  const groups = /* @__PURE__ */ new Map();
  for (const t of startup.tools) {
    const g = groupOf(t.name, owners);
    groups.set(g, (groups.get(g) ?? 0) + t.tokens);
  }
  return [...startup.parts, ...[...groups].map(([g, tok]) => ({ kind: "tools", label: sourceLabel(g), tokens: tok }))];
}
var text = (content) => typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => typeof c?.text === "string" ? c.text : "").join("") : "";
function instructionParts(body) {
  const parts = [];
  let file = "", buf = "";
  const flush = () => {
    if (buf.trim()) parts.push(file ? { kind: "instructions", label: file, tokens: tokens(buf) } : { kind: "context", label: "Other", tokens: tokens(buf) });
  };
  for (const line of body.split("\n")) {
    const from = line.match(/^Instructions from: (.+)$/);
    if (from) {
      flush();
      file = from[1].trim();
      buf = "";
    }
    buf += line + "\n";
  }
  flush();
  return parts;
}
var SOURCE_LABEL = {
  "system-prompt": ["system", "System prompt"],
  "skill-catalog": ["skills", "Skill list"],
  "runtime-context": ["context", "Other"],
  "working-directory": ["context", "Other"],
  "time-context": ["context", "Other"]
};
function parseSession(raw) {
  const facts = { depth: 0, calls: [], offered: /* @__PURE__ */ new Map(), latest: null, startup: null };
  const pending = /* @__PURE__ */ new Map();
  let lastTime = 0;
  let early = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const time = typeof e.time === "number" ? lastTime = e.time : lastTime;
    switch (e.type) {
      case "session":
        facts.depth = e.delegationDepth ?? 0;
        break;
      case "system/message":
      case "user/message": {
        if (!early) break;
        const m = e.data?.message ?? e.data;
        const kind = m?.source?.kind ?? "";
        if (kind === "user") break;
        if (kind === "agent-instructions") {
          early.push(...instructionParts(text(m.content)));
          break;
        }
        const [k, label] = SOURCE_LABEL[kind] ?? ["context", kind || "Other"];
        const tok = tokens(text(m?.content));
        if (tok > 0) early.push({ kind: k, label, tokens: tok });
        break;
      }
      case "request/header": {
        const defs = e.data?.header?.tools ?? [];
        const names = defs.map((d) => d.name);
        const day = Math.floor(time / DAY);
        for (const def of defs) {
          const cost = tokens(def);
          let use = facts.offered.get(def.name);
          if (!use) facts.offered.set(def.name, use = /* @__PURE__ */ new Map());
          const d = use.get(day) ?? { req: 0, sent: 0, cost: 0, at: 0 };
          d.req++;
          d.sent += cost;
          if (time >= d.at) {
            d.cost = cost;
            d.at = time;
          }
          use.set(day, d);
        }
        if (!facts.latest || time >= facts.latest.time) facts.latest = { time, names };
        if (early) {
          if (facts.depth === 0) facts.startup = { time, parts: early, tools: defs.map((d) => ({ name: d.name, tokens: tokens(d) })) };
          early = null;
        }
        break;
      }
      case "tool/call":
        pending.set(e.data?.callId, facts.calls.length);
        facts.calls.push({ name: e.data?.name ?? "?", time, ms: null, resultTok: null, error: null });
        break;
      case "tool/result": {
        const m = e.data?.message;
        const i = pending.get(m?.toolCallId);
        if (i === void 0) break;
        pending.delete(m.toolCallId);
        const call = facts.calls[i];
        call.ms = time - call.time;
        call.resultTok = tokens(m.content);
        if (m.isError) call.error = text(m.content).replace(/\s+/g, " ").trim().slice(0, 300) || "error";
        break;
      }
    }
  }
  return facts;
}
var ZSTD_MAGIC = 4247762216;
function decodeZstdFrames(buf) {
  const out = [];
  let off = 0;
  while (off + 5 <= buf.length && buf.readUInt32LE(off) === ZSTD_MAGIC) {
    const start = off;
    const fhd = buf.readUInt8(off + 4);
    const fcsFlag = fhd >>> 6, single = (fhd & 32) !== 0, checksum = (fhd & 4) !== 0, dictFlag = fhd & 3;
    off += 5 + (single ? 0 : 1) + (dictFlag === 3 ? 4 : dictFlag) + (fcsFlag === 0 ? single ? 1 : 0 : 1 << fcsFlag);
    for (; ; ) {
      if (off + 3 > buf.length) return Buffer.concat(out).toString("utf8");
      const header = buf.readUIntLE(off, 3);
      off += 3 + ((header >>> 1 & 3) === 1 ? 1 : header >>> 3);
      if (header & 1) break;
    }
    if (checksum) off += 4;
    if (off > buf.length) break;
    out.push(zstdDecompressSync(buf.subarray(start, off)));
  }
  return Buffer.concat(out).toString("utf8");
}
var cache = /* @__PURE__ */ new Map();
var LOG_NAMES = ["session.v4.jsonl.zstd", "session.v3.jsonl.zstd"];
function* sessionFiles(root) {
  let dirs = [];
  try {
    dirs = readdirSync(root);
  } catch {
    return;
  }
  for (const dir of dirs) {
    let ids = [];
    try {
      ids = readdirSync(join2(root, dir));
    } catch {
      continue;
    }
    for (const id of ids) {
      for (const name of LOG_NAMES) {
        const path = join2(root, dir, id, name);
        try {
          const st = statSync(path);
          yield { path, mtimeMs: st.mtimeMs, size: st.size };
          break;
        } catch {
        }
      }
    }
  }
}
function factsFor(file) {
  const key = `${file.mtimeMs}:${file.size}`;
  const hit = cache.get(file.path);
  if (hit?.key === key) return hit.facts;
  try {
    const facts = parseSession(decodeZstdFrames(readFileSync2(file.path)));
    cache.set(file.path, { key, facts });
    return facts;
  } catch {
    return null;
  }
}
function collect(days = 30, root = sessionsRoot(), now = Date.now(), owners = readOwners()) {
  const since = now - days * DAY;
  const sinceDay = Math.floor(since / DAY);
  const rows = /* @__PURE__ */ new Map();
  const row = (name) => {
    let r = rows.get(name);
    if (!r) {
      r = {
        name,
        group: groupOf(name, owners),
        calls: 0,
        subCalls: 0,
        errors: 0,
        avgMs: null,
        avgResultTok: null,
        cost: 0,
        offeredIn: 0,
        offeredRequests: 0,
        sentTok: 0,
        lastUsed: 0,
        current: false,
        recentErrors: [],
        msSum: 0,
        msN: 0,
        resSum: 0,
        resN: 0,
        costAt: 0
      };
      rows.set(name, r);
    }
    return r;
  };
  let sessions = 0;
  let latest = null;
  let startup = null;
  const seen = /* @__PURE__ */ new Set();
  for (const file of sessionFiles(root)) {
    seen.add(file.path);
    if (file.mtimeMs < since) continue;
    const facts = factsFor(file);
    if (!facts) continue;
    sessions++;
    for (const [name, byDay] of facts.offered) {
      let inRange = false;
      for (const [day, d] of byDay) {
        if (day < sinceDay) continue;
        const r = row(name);
        inRange = true;
        r.offeredRequests += d.req;
        r.sentTok += d.sent;
        if (d.at >= r.costAt) {
          r.cost = d.cost;
          r.costAt = d.at;
        }
      }
      if (inRange) row(name).offeredIn++;
    }
    if (facts.depth === 0 && facts.latest && (!latest || facts.latest.time > latest.time)) latest = facts.latest;
    if (facts.startup && (!startup || facts.startup.time > startup.time)) startup = facts.startup;
    for (const c of facts.calls) {
      if (c.time < since) continue;
      const r = row(c.name);
      r.calls++;
      if (facts.depth > 0) r.subCalls++;
      r.lastUsed = Math.max(r.lastUsed, c.time);
      if (c.ms !== null) {
        r.msSum += c.ms;
        r.msN++;
      }
      if (c.resultTok !== null) {
        r.resSum += c.resultTok;
        r.resN++;
      }
      if (c.error !== null) {
        r.errors++;
        r.recentErrors.push({ time: c.time, text: c.error });
      }
    }
  }
  for (const path of cache.keys()) if (!seen.has(path)) cache.delete(path);
  const currentNames = new Set(latest?.names ?? []);
  const out = [...rows.values()].map(({ msSum, msN, resSum, resN, costAt, ...r }) => ({
    ...r,
    avgMs: msN ? Math.round(msSum / msN) : null,
    avgResultTok: resN ? Math.round(resSum / resN) : null,
    current: currentNames.has(r.name),
    recentErrors: r.recentErrors.sort((a, b) => b.time - a.time).slice(0, 20)
  }));
  out.sort((a, b) => b.calls - a.calls || b.cost - a.cost || a.name.localeCompare(b.name));
  const cur = out.filter((r) => r.current);
  const unused = cur.filter((r) => r.calls === 0);
  const sum = (rs) => rs.reduce((n, r) => n + r.cost, 0);
  const parts = mergeParts(startup ? regroupTools(startup, owners) : []);
  return {
    days,
    generatedAt: now,
    sessions,
    rows: out,
    current: { tools: cur.length, cost: sum(cur), unused: unused.length, unusedCost: sum(unused) },
    startup: { total: parts.reduce((n, p) => n + p.tokens, 0), parts }
  };
}
function mergeParts(raw) {
  const byLabel = /* @__PURE__ */ new Map();
  for (const p of raw) {
    const hit = byLabel.get(p.label);
    if (hit) hit.tokens += p.tokens;
    else byLabel.set(p.label, { ...p });
  }
  const total = [...byLabel.values()].reduce((n, p) => n + p.tokens, 0);
  const keep = [];
  let other = 0;
  for (const p of byLabel.values()) {
    if (p.label === "Other" || p.tokens < total * 0.01) other += p.tokens;
    else keep.push(p);
  }
  keep.sort((a, b) => b.tokens - a.tokens);
  if (other > 0) keep.push({ kind: "context", label: "Other", tokens: other });
  return keep;
}
function agentSummary(r, top = 8) {
  const lines = [];
  const k = (n) => n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);
  lines.push(`Last ${r.days} days, ${r.sessions} sessions. Every request carries ${r.current.tools} tool definitions = ${k(r.current.cost)} tok.`);
  if (r.startup.total) {
    lines.push(`
Startup context of a new chat \u2248 ${k(r.startup.total)} tok:`);
    for (const p of r.startup.parts.slice(0, top)) lines.push(`- ${p.label}: ${k(p.tokens)}`);
  }
  const groups = /* @__PURE__ */ new Map();
  for (const row of r.rows.filter((x) => x.offeredRequests > 0)) {
    const g = groups.get(row.group) ?? { calls: 0, cost: 0, tools: 0, current: false };
    g.calls += row.calls;
    g.cost += row.cost;
    g.tools++;
    g.current ||= row.current;
    groups.set(row.group, g);
  }
  lines.push("\nTool sources (tok each adds to every request it is loaded in, calls in range):");
  for (const [name, g] of [...groups].sort((a, b) => b[1].cost - a[1].cost)) {
    lines.push(`- ${sourceLabel(name)}: ${g.tools} tools, ${k(g.cost)} tok/request, ${g.calls} calls${g.calls === 0 ? " \u2190 never used" : ""}${g.current ? "" : " (not in the latest request: removed, or another profile)"}`);
  }
  const unused = r.rows.filter((x) => x.current && x.calls === 0).sort((a, b) => b.cost - a.cost);
  if (unused.length) lines.push(`
Never called (${unused.length}, ${k(r.current.unusedCost)} tok per request), biggest: ${unused.slice(0, top).map((x) => `${x.name} ${k(x.cost)}`).join(", ")}`);
  const failing = r.rows.filter((x) => x.calls >= 3 && x.errors / x.calls >= 0.2);
  if (failing.length) lines.push(`
Often failing: ${failing.map((x) => `${x.name} ${x.errors}/${x.calls}, ${k(x.cost)} tok/request (${x.recentErrors[0]?.text.slice(0, 90) ?? ""})`).join("; ")}`);
  lines.push("\nTo turn a source off: plugin_manager list_plugins \u2192 set_plugin enabled=false. Ask the user first; it changes every session.");
  return lines.join("\n");
}

// src/index.ts
var inject = ["agents"];
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
var reportTool = {
  name: "toolbox_report",
  description: "Tool usage report from this dsh install's session logs: calls, errors, and the tokens each tool definition and startup-context part adds to every request. Use when the user asks about tool/context cost, or to suggest disabling unused tool sources (then ask the user before using plugin_manager).",
  parameters: {
    type: "object",
    properties: { days: { type: "number", description: "Look-back window in days (1-365, default 30)." } }
  },
  output: {
    schema: { type: "object", properties: { report: { type: "string" } }, required: ["report"] },
    render: (_args, value) => [{ type: "text", text: value?.report ?? "" }]
  },
  execute: async (args) => ({ report: agentSummary(collect(clampDays(args?.days ?? 30))) })
};
function apply(ctx) {
  ctx.effect(() => trackOwners(ctx), "deep-toolbox.owners");
  ctx.inject(["connection"], (ctx2) => {
    ctx2.effect(() => ctx2.connection.fetch.register({
      path: "/api/deep-toolbox/stats",
      methods: ["GET"],
      requestBody: "buffered",
      // required by dsh's route registry; GET has no body anyway
      fetch: async (request) => {
        try {
          return json({ ok: true, ...collect(clampDays(new URL(request.url, "http://x").searchParams.get("days") ?? 30)) });
        } catch (error) {
          return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
        }
      }
    }), "deep-toolbox.route/stats");
  });
  const add = (agent) => ctx.effect(() => agent.ctx.tools.register(reportTool), "deep-toolbox.tool.toolbox_report");
  ctx.on("agent/created", ({ agent }) => add(agent));
  try {
    for (const agent of ctx.agents.roots?.() ?? []) add(agent);
  } catch {
  }
}
export {
  apply,
  inject
};
