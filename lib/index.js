// src/stats.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";
var sessionsRoot = () => process.env.DSH_SESSIONS ?? join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "sessions");
var tokens = (value) => Math.round(JSON.stringify(value ?? "").length / 4);
var groupOf = (name) => name.startsWith("mcp__") ? `mcp:${name.split("__")[1]}` : "built-in";
function parseSession(text) {
  const facts = { depth: 0, calls: [], offered: /* @__PURE__ */ new Map(), headers: [], latest: null };
  const pending = /* @__PURE__ */ new Map();
  for (const line of text.split("\n")) {
    if (!line) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    switch (e.type) {
      case "session":
        facts.depth = e.delegationDepth ?? 0;
        break;
      case "request/header": {
        const defs = e.data?.header?.tools ?? [];
        for (const def of defs) facts.offered.set(def.name, Math.max(facts.offered.get(def.name) ?? 0, tokens(def)));
        facts.headers.push({ time: e.time, names: defs.map((d) => d.name) });
        if (facts.depth === 0 && (facts.latest === null || e.time > facts.latest.time)) {
          facts.latest = { time: e.time, names: defs.map((d) => d.name) };
        }
        break;
      }
      case "tool/call":
        pending.set(e.data?.callId, facts.calls.length);
        facts.calls.push({ name: e.data?.name ?? "?", time: e.time, ms: null, resultTok: null, error: null });
        break;
      case "tool/result": {
        const m = e.data?.message;
        const i = pending.get(m?.toolCallId);
        if (i === void 0) break;
        pending.delete(m.toolCallId);
        const call = facts.calls[i];
        call.ms = e.time - call.time;
        call.resultTok = tokens(m.content);
        if (m.isError) {
          const text2 = (Array.isArray(m.content) ? m.content : []).map((c) => c?.text ?? "").join(" ");
          call.error = text2.replace(/\s+/g, " ").trim().slice(0, 300) || "error";
        }
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
      ids = readdirSync(join(root, dir));
    } catch {
      continue;
    }
    for (const id of ids) {
      for (const name of LOG_NAMES) {
        const path = join(root, dir, id, name);
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
    const facts = parseSession(decodeZstdFrames(readFileSync(file.path)));
    cache.set(file.path, { key, facts });
    return facts;
  } catch {
    return null;
  }
}
function collect(days = 30, root = sessionsRoot(), now = Date.now()) {
  const since = now - days * 864e5;
  const rows = /* @__PURE__ */ new Map();
  const row = (name) => {
    let r = rows.get(name);
    if (!r) {
      r = {
        name,
        group: groupOf(name),
        calls: 0,
        subCalls: 0,
        errors: 0,
        avgMs: null,
        avgResultTok: null,
        cost: 0,
        offeredIn: 0,
        offeredRequests: 0,
        lastUsed: 0,
        current: false,
        recentErrors: [],
        msSum: 0,
        msN: 0,
        resSum: 0,
        resN: 0
      };
      rows.set(name, r);
    }
    return r;
  };
  let sessions = 0;
  let latest = null;
  for (const file of sessionFiles(root)) {
    if (file.mtimeMs < since) continue;
    const facts = factsFor(file);
    if (!facts) continue;
    sessions++;
    for (const [name, cost] of facts.offered) {
      const r = row(name);
      r.cost = Math.max(r.cost, cost);
      r.offeredIn++;
    }
    for (const h of facts.headers) if (h.time >= since) for (const name of h.names) row(name).offeredRequests++;
    if (facts.latest && (!latest || facts.latest.time > latest.time)) latest = facts.latest;
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
  const currentNames = new Set(latest?.names ?? []);
  const out = [...rows.values()].map(({ msSum, msN, resSum, resN, ...r }) => ({
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
  return {
    days,
    generatedAt: now,
    sessions,
    rows: out,
    current: { tools: cur.length, cost: sum(cur), unused: unused.length, unusedCost: sum(unused) }
  };
}

// src/index.ts
var inject = ["connection"];
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
function apply(ctx) {
  if (!ctx.connection?.fetch?.register) return;
  ctx.effect(() => ctx.connection.fetch.register({
    path: "/api/deep-toolbox/stats",
    methods: ["GET"],
    fetch: async (request) => {
      try {
        const raw = Number(new URL(request.url, "http://x").searchParams.get("days") ?? 30);
        const days = Number.isFinite(raw) ? Math.min(365, Math.max(1, Math.round(raw))) : 30;
        return json({ ok: true, ...collect(days) });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
      }
    }
  }), "deep-toolbox.route/stats");
}
export {
  apply,
  inject
};
