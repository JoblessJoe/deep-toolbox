// deep-toolbox client bundle (esbuild CJS + __ModuleLoader__ banner). Do not edit.
window.__ModuleLoader__.load({id:"deep-toolbox",factory:Pt=>{
var module={exports:{}},exports=module.exports,require=Pt;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// src/client/locales.ts
var zh = {
  "nav": "\u5DE5\u5177\u7BB1",
  "title": "\u5DE5\u5177\u7BB1",
  "subtitle": "\u667A\u80FD\u4F53\u771F\u6B63\u7528\u5230\u4E86\u54EA\u4E9B\u5DE5\u5177\uFF0C\u6BCF\u4E2A\u5DE5\u5177\u5728\u6BCF\u6B21\u8BF7\u6C42\u4E2D\u5360\u7528\u591A\u5C11 token\u3002",
  "range.days": "{n} \u5929",
  "filter.all": "\u5168\u90E8",
  "filter.unused": "\u672A\u4F7F\u7528",
  "filter.errors": "\u6709\u9519\u8BEF",
  "filter.removed": "\u663E\u793A\u5DF2\u79FB\u9664",
  "search": "\u641C\u7D22\u5DE5\u5177\u2026",
  "card.tools": "\u5F53\u524D\u5DE5\u5177",
  "card.cost": "\u6BCF\u6B21\u8BF7\u6C42",
  "card.unused": "\u4ECE\u672A\u4F7F\u7528",
  "card.errors": "\u9519\u8BEF\u7387",
  "card.sessions": "{n} \u4E2A\u4F1A\u8BDD",
  "card.unusedHint": "{tok} token/\u8BF7\u6C42",
  "card.costHint": "\u5DE5\u5177\u5B9A\u4E49",
  "card.callsHint": "{n} \u6B21\u8C03\u7528",
  "col.tool": "\u5DE5\u5177",
  "col.calls": "\u8C03\u7528",
  "col.errors": "\u9519\u8BEF",
  "col.time": "\u5E73\u5747\u8017\u65F6",
  "col.result": "\u7ED3\u679C\u5927\u5C0F",
  "col.cost": "\u6BCF\u8BF7\u6C42",
  "col.last": "\u6700\u8FD1\u4F7F\u7528",
  "badge.unused": "\u672A\u4F7F\u7528",
  "badge.removed": "\u5DF2\u79FB\u9664",
  "badge.errors": "\u9519\u8BEF\u591A",
  "group.builtin": "\u5185\u7F6E",
  "group.spent": "{tok} token \u5DF2\u53D1\u9001",
  "errors.title": "\u6700\u8FD1\u9519\u8BEF",
  "errors.none": "\u65E0\u9519\u8BEF\u8BB0\u5F55",
  "never": "\u4ECE\u672A",
  "empty": "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5DE5\u5177\u3002",
  "loading": "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u65E5\u5FD7\u2026",
  "error": "\u8BFB\u53D6\u5931\u8D25",
  "retry": "\u91CD\u8BD5",
  "refresh": "\u5237\u65B0",
  "how": "token \u6570\u4E3A\u4F30\u7B97\uFF08\u5B57\u7B26 \xF7 4\uFF09\u3002\u201C\u5DF2\u53D1\u9001\u201D\u662F\u7F13\u5B58\u524D\u7684\u91CF\u3002",
  "startup.title": "\u65B0\u5BF9\u8BDD\u7684\u542F\u52A8\u4E0A\u4E0B\u6587",
  "startup.total": "\u7EA6 {tok} token",
  "startup.hint": "\u6BCF\u4E2A\u65B0\u5BF9\u8BDD\u5728\u4F60\u8F93\u5165\u4E4B\u524D\u5C31\u5DF2\u5E26\u4E0A\u8FD9\u4E9B\u5185\u5BB9\uFF08\u53D6\u81EA\u6700\u8FD1\u4E00\u6B21\u4E3B\u5BF9\u8BDD\u7684\u7B2C\u4E00\u6B21\u8BF7\u6C42\uFF09\u3002"
};
var en = {
  "nav": "Toolbox",
  "title": "Toolbox",
  "subtitle": "Which tools your agents actually use, and what each one costs in every request.",
  "range.days": "{n} days",
  "filter.all": "All",
  "filter.unused": "Unused",
  "filter.errors": "Errors",
  "filter.removed": "Show removed",
  "search": "Search tools\u2026",
  "card.tools": "Tools offered",
  "card.cost": "Per request",
  "card.unused": "Never used",
  "card.errors": "Error rate",
  "card.sessions": "{n} sessions",
  "card.unusedHint": "{tok} tok per request",
  "card.costHint": "tool definitions",
  "card.callsHint": "{n} calls",
  "col.tool": "Tool",
  "col.calls": "Calls",
  "col.errors": "Errors",
  "col.time": "Avg time",
  "col.result": "Result",
  "col.cost": "Per request",
  "col.last": "Last used",
  "badge.unused": "unused",
  "badge.removed": "removed",
  "badge.errors": "often fails",
  "group.builtin": "Built-in",
  "group.spent": "{tok} tok sent",
  "errors.title": "Recent errors",
  "errors.none": "No errors recorded",
  "never": "never",
  "empty": "No tools match.",
  "loading": "Reading session logs\u2026",
  "error": "Could not read stats",
  "retry": "Retry",
  "refresh": "Refresh",
  "how": 'Token numbers are estimates (chars \xF7 4). "Sent" is before prompt caching.',
  "startup.title": "Startup context of a new chat",
  "startup.total": "\u2248 {tok} tok",
  "startup.hint": "What every new chat carries before you type anything (from the newest main chat's first request)."
};

// src/client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var PANEL_ID = "deep-toolbox";
var inject = ["slots", "locale", "layout"];
var KIND_COLOR = {
  system: "var(--dtbx-c1)",
  instructions: "var(--dtbx-c2)",
  context: "var(--dtbx-c3)",
  skills: "var(--dtbx-c4)",
  tools: "var(--dtbx-c5)"
};
var STYLE_ID = "dtbx-styles";
var CSS = `
.dtbx-root {
  --dtbx-line: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent);
  --dtbx-fill: var(--dsw-alias-bg-skeleton);
  --dtbx-hover: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-skeleton));
  --dtbx-bar: color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);
  --dtbx-warn: var(--dsw-alias-state-warning-primary, #d29922);
  --dtbx-err: var(--dsw-alias-state-error-primary, #e5484d);
  --dtbx-ok: var(--dsw-alias-state-success-primary, #30a46c);
  --dtbx-c1: #8e7cc3; --dtbx-c2: #4f8fd9; --dtbx-c3: #9aa4b1; --dtbx-c4: #d9a441; --dtbx-c5: #3fa37a;
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
  .dtbx-inner { padding: 20px 16px 32px; }
  .dtbx-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dtbx-group { overflow-x: auto; }
  .dtbx-legend { grid-template-columns: 1fr; }
  .dtbx-hide-narrow { display: none; }
}
`;
function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}
var RANGES = [7, 30, 90];
var fmt = (n) => n.toLocaleString();
var compact = (n) => new Intl.NumberFormat(void 0, { notation: "compact", maximumFractionDigits: 1 }).format(n);
var secs = (ms) => ms === null ? "\u2013" : ms < 1e3 ? `${ms} ms` : `${(ms / 1e3).toFixed(1)} s`;
var failsOften = (r) => r.calls >= 3 && r.errors / r.calls >= 0.2;
function shortName(r) {
  return r.group === "built-in" ? r.name : r.name.split("__").slice(2).join("__") || r.name;
}
function ago(ts, t) {
  if (!ts) return t("never");
  const days = Math.floor((Date.now() - ts) / 864e5);
  if (days < 7) return new Intl.RelativeTimeFormat(void 0, { numeric: "auto" }).format(-days, "day");
  return new Date(ts).toLocaleDateString(void 0, { day: "numeric", month: "short" });
}
function ToolboxPage({ ctx }) {
  const t = ctx.locale.bind("toolbox");
  const [days, setDays] = (0, import_react.useState)(30);
  const [report, setReport] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(false);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [filter, setFilter] = (0, import_react.useState)("all");
  const [query, setQuery] = (0, import_react.useState)("");
  const [showRemoved, setShowRemoved] = (0, import_react.useState)(false);
  const [open, setOpen] = (0, import_react.useState)(null);
  const [tick, setTick] = (0, import_react.useState)(0);
  const load = (0, import_react.useCallback)(() => setTick((n) => n + 1), []);
  (0, import_react.useEffect)(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/deep-toolbox/stats?days=${days}`, { headers: { accept: "application/json" }, signal: ac.signal }).then((r) => r.json()).then((d) => {
      if (d == null ? void 0 : d.ok) setReport(d);
      else setError(true);
    }).catch((e) => {
      if (!ac.signal.aborted) setError(true);
    }).finally(() => {
      if (!ac.signal.aborted) setLoading(false);
    });
    return () => ac.abort();
  }, [days, tick]);
  const groups = (0, import_react.useMemo)(() => {
    var _a;
    if (!report) return [];
    const q = query.trim().toLowerCase();
    const rows = report.rows.filter((r) => showRemoved || r.current).filter((r) => filter === "all" || (filter === "unused" ? r.current && r.calls === 0 : r.errors > 0)).filter((r) => !q || r.name.toLowerCase().includes(q));
    const byGroup = /* @__PURE__ */ new Map();
    for (const r of rows) byGroup.set(r.group, [...(_a = byGroup.get(r.group)) != null ? _a : [], r]);
    return [...byGroup].map(([group, rs]) => ({
      group,
      rows: rs,
      calls: rs.reduce((n, r) => n + r.calls, 0),
      cost: rs.filter((r) => r.current).reduce((n, r) => n + r.cost, 0),
      sent: rs.reduce((n, r) => n + r.sentTok, 0)
    })).sort((a, b) => b.calls - a.calls || b.cost - a.cost);
  }, [report, filter, query, showRemoved]);
  const totals = (0, import_react.useMemo)(() => {
    var _a;
    const rows = (_a = report == null ? void 0 : report.rows) != null ? _a : [];
    const calls = rows.reduce((n, r) => n + r.calls, 0);
    const errors = rows.reduce((n, r) => n + r.errors, 0);
    return { calls, errors, maxCalls: Math.max(1, ...rows.map((r) => r.calls)) };
  }, [report]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtbx-root", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-inner", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "dtbx-title", children: t("title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dtbx-sub", children: t("subtitle") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtbx-tabs", role: "tablist", children: RANGES.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", role: "tab", "aria-selected": days === n, className: "dtbx-tab", onClick: () => setDays(n), children: t("range.days").replace("{n}", String(n)) }, n)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-end", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dtbx-search", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: query, placeholder: t("search"), onChange: (e) => setQuery(e.target.value) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dtbx-btn", onClick: load, disabled: loading, children: t("refresh") })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-notice", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("error") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dtbx-btn", onClick: load, children: t("retry") })
    ] }),
    !report && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dtbx-muted", children: t("loading") }),
    report && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-cards", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { label: t("card.tools"), value: fmt(report.current.tools), hint: t("card.sessions").replace("{n}", fmt(report.sessions)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { label: t("card.cost"), value: `${compact(report.current.cost)} tok`, hint: t("card.costHint") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Card,
          {
            warn: report.current.unused > 0,
            label: t("card.unused"),
            value: fmt(report.current.unused),
            hint: t("card.unusedHint").replace("{tok}", compact(report.current.unusedCost))
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Card,
          {
            warn: totals.calls > 0 && totals.errors / totals.calls >= 0.05,
            label: t("card.errors"),
            value: totals.calls ? `${(totals.errors / totals.calls * 100).toFixed(1)}%` : "\u2013",
            hint: t("card.callsHint").replace("{n}", fmt(totals.calls))
          }
        )
      ] }),
      report.startup.total > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Startup, { t, startup: report.startup }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtbx-tabs", role: "tablist", children: ["all", "unused", "errors"].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", role: "tab", "aria-selected": filter === f, className: "dtbx-tab", onClick: () => setFilter(f), children: t(`filter.${f}`) }, f)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dtbx-check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: showRemoved, onChange: (e) => setShowRemoved(e.target.checked) }),
          t("filter.removed")
        ] })
      ] }),
      groups.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dtbx-muted", children: t("empty") }),
      groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dtbx-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-group-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-group-name", children: g.group === "built-in" ? t("group.builtin") : g.group.slice(4) }),
          g.group !== "built-in" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-badge", children: "MCP" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtbx-group-meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("card.callsHint").replace("{n}", fmt(g.calls)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              compact(g.cost),
              " tok / req"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-hide-narrow", children: t("group.spent").replace("{tok}", compact(g.sent)) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "dtbx-table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("col.tool") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("col.calls") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("col.errors") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "dtbx-hide-narrow", children: t("col.time") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "dtbx-hide-narrow", children: t("col.result") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("col.cost") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: t("col.last") })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: g.rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { r, t, max: totals.maxCalls, open: open === r.name, onToggle: () => setOpen(open === r.name ? null : r.name) }, r.name)) })
        ] })
      ] }, g.group)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dtbx-note", children: t("how") })
    ] })
  ] }) });
}
function Startup({ t, startup }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dtbx-startup", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-startup-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "dtbx-h2", children: t("startup.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-muted", children: t("startup.total").replace("{tok}", fmt(startup.total)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtbx-stack", role: "img", "aria-label": t("startup.title"), children: startup.parts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: `${p.label}: ${fmt(p.tokens)} tok`, style: { width: `${p.tokens / startup.total * 100}%`, background: KIND_COLOR[p.kind] } }, i)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtbx-legend", children: startup.parts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-legend-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-dot", style: { background: KIND_COLOR[p.kind] } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-legend-label", title: p.label, children: p.label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtbx-legend-num", children: [
        compact(p.tokens),
        " \xB7 ",
        Math.round(p.tokens / startup.total * 100),
        "%"
      ] })
    ] }, i)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-note", children: t("startup.hint") })
  ] });
}
function Card({ label, value, hint, warn }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: warn ? "dtbx-card dtbx-card-warn" : "dtbx-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-card-label", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-card-value", children: value }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-card-hint", children: hint })
  ] });
}
function Row({ r, t, max, open, onToggle }) {
  const width = r.calls ? Math.max(3, Math.sqrt(r.calls / max) * 100) : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "dtbx-row", onClick: onToggle, "aria-expanded": open, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtbx-name", title: r.name, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-name-text", children: shortName(r) }),
        !r.current && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-badge", children: t("badge.removed") }),
        r.current && r.calls === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-badge dtbx-badge-unused", children: t("badge.unused") }),
        failsOften(r) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-badge dtbx-badge-err", children: t("badge.errors") })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtbx-calls", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-track", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtbx-fillbar", style: { width: `${width}%`, display: "block" } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt(r.calls) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: r.errors ? "dtbx-err-num" : "dtbx-dim", children: r.errors ? fmt(r.errors) : "\u2013" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "dtbx-hide-narrow dtbx-dim", children: secs(r.avgMs) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "dtbx-hide-narrow dtbx-dim", children: r.avgResultTok === null ? "\u2013" : `${compact(r.avgResultTok)} tok` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
        fmt(r.cost),
        " tok"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "dtbx-dim", children: ago(r.lastUsed, t) })
    ] }),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { colSpan: 7, className: "dtbx-errors", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtbx-errors-title", children: t("errors.title") }),
      r.recentErrors.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtbx-muted", children: t("errors.none") }),
      r.recentErrors.slice(0, 8).map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtbx-error", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: new Date(e.time).toLocaleString(void 0, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: e.text })
      ] }, i))
    ] }) })
  ] });
}
function ToolboxNavIcon({ size }) {
  const px = typeof size === "number" ? size : 16;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: px,
      height: px,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      style: { fill: "none" },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { transform: "rotate(45 12 12)", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "10.8", y: "8.4", width: "2.4", height: "13.4", rx: "1.2" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "4.6", y: "3.4", width: "10.4", height: "5", rx: "1" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "15", y: "2.4", width: "3.4", height: "7", rx: "0.9" })
      ] })
    }
  );
}
function apply(ctx) {
  ensureStyles();
  const Page = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolboxPage, { ctx });
  const t = ctx.locale.bind("toolbox");
  ctx.effect(() => ctx.locale.register("toolbox", { zh, en }), "deep-toolbox: dictionaries");
  ctx.effect(
    () => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: PANEL_ID, order: 40, label: () => t("nav"), locale: "toolbox" }, ToolboxNavIcon)),
    "deep-toolbox: sidebar"
  );
  ctx.effect(
    () => ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_ID, locale: "toolbox" }, Page)),
    "deep-toolbox: main"
  );
}

return module.exports;
}});
