#!/usr/bin/env node

// src/stats.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";
var sessionsRoot = () => process.env.DSH_SESSIONS ?? join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "sessions");
var tokens = (value) => Math.round(JSON.stringify(value ?? "").length / 4);
var groupOf = (name) => name.startsWith("mcp__") ? `mcp:${name.split("__")[1]}` : "built-in";
function parseSession(text) {
  const facts = { depth: 0, calls: [], offered: /* @__PURE__ */ new Map(), offeredReq: /* @__PURE__ */ new Map(), latest: null };
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
        for (const def of defs) {
          facts.offered.set(def.name, Math.max(facts.offered.get(def.name) ?? 0, tokens(def)));
          facts.offeredReq.set(def.name, (facts.offeredReq.get(def.name) ?? 0) + 1);
        }
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
function collect(days2 = 30, root = sessionsRoot(), now = Date.now()) {
  const since = now - days2 * 864e5;
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
      r.offeredRequests += facts.offeredReq.get(name) ?? 0;
    }
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
    days: days2,
    generatedAt: now,
    sessions,
    rows: out,
    current: { tools: cur.length, cost: sum(cur), unused: unused.length, unusedCost: sum(unused) }
  };
}

// src/cli.ts
var args = process.argv.slice(2);
var take = (flag) => {
  const i = args.indexOf(flag);
  return i < 0 ? null : args.splice(i, 2)[1] ?? "";
};
var errorsFor = take("--errors");
var asJson = args.includes("--json");
var days = Number(args.find((a) => /^\d+$/.test(a)) ?? 30);
var report = collect(days);
if (errorsFor !== null) {
  const row = report.rows.find((r) => r.name === errorsFor);
  if (!row) console.log(`unknown tool: ${errorsFor}`);
  else console.log(row.recentErrors.map((e) => `${new Date(e.time).toISOString().slice(0, 16)}  ${e.text}`).join("\n") || "no errors");
} else if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  const pad = (v, n) => String(v).padStart(n);
  const ago = (ms) => ms ? `${Math.round((Date.now() - ms) / 864e5)}d` : "never";
  const groups = /* @__PURE__ */ new Map();
  for (const r of report.rows.filter((r2) => r2.current || r2.calls > 0)) groups.set(r.group, [...groups.get(r.group) ?? [], r]);
  console.log(`deep-toolbox \u2014 last ${days} days, ${report.sessions} sessions
`);
  console.log(`${"tool".padEnd(44)}${pad("calls", 7)}${pad("err", 5)}${pad("avg s", 7)}${pad("cost", 6)}${pad("last", 7)}`);
  for (const [group, rows] of [...groups].sort((a, b) => sumCalls(b[1]) - sumCalls(a[1]))) {
    console.log(`
${group} \u2014 ${sumCalls(rows)} calls, ${rows.reduce((n, r) => n + r.cost, 0).toLocaleString()} tok/prompt`);
    for (const r of rows) {
      console.log(`  ${r.name.padEnd(42)}${pad(r.calls, 7)}${pad(r.errors || "", 5)}${pad(r.avgMs === null ? "-" : (r.avgMs / 1e3).toFixed(1), 7)}${pad(r.cost, 6)}${pad(ago(r.lastUsed), 7)}${r.current ? "" : "  (removed)"}`);
    }
  }
  const c = report.current;
  console.log(`
Now offered: ${c.tools} tools, ${c.cost.toLocaleString()} tok per prompt. Never used in ${days} days: ${c.unused} tools, ${c.unusedCost.toLocaleString()} tok.`);
}
function sumCalls(rows) {
  return rows.reduce((n, r) => n + r.calls, 0);
}
