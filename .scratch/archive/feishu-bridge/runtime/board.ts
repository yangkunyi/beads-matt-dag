/**
 * board.ts — .scratch/<feature>/issues/*.md  →  飞书多维表格「pi 工作台」的单向镜像
 *
 * 方向：markdown 是唯一真相，Base 只是看得见的那一面。
 * 唯一反向写入的是 `闸门` 列（ready-for-agent 这类闸门标签），见 writeGateBack()。
 *
 * 用法：
 *   bun board.ts --sync <repo-cwd>           同步票板
 *   bun board.ts --sync-runs <repo-cwd>      同步 run 台账
 *   bun board.ts --sync-all <repo-cwd>
 *   bun board.ts --dump <repo-cwd>           只解析，不写库（调试）
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const BRIDGE_DIR = '/data3/yky/.local/share/feishu-pi-bridge';
const CONFIG_PATH = join(BRIDGE_DIR, 'config.json');

// ---- 默认值（首次建表时确定，见 .scratch/feishu-bridge/issues/12-base-board.md） ----
const DEFAULT_BOARD = {
  baseToken: 'PaV0bbSv5ai0Ols622vcAWV0ned',
  url: 'https://sjtu.feishu.cn/base/PaV0bbSv5ai0Ols622vcAWV0ned',
  ticketsTable: 'tblIjeBZ7EZiuFlF',
  runsTable: 'tblUGAFsv1S3SsaF',
  profile: 'archon-bridge',
};

export type BoardCfg = typeof DEFAULT_BOARD;

export function boardCfg(): BoardCfg {
  try {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    if (cfg.board) return { ...DEFAULT_BOARD, ...cfg.board };
    return { ...DEFAULT_BOARD, profile: cfg.profile || DEFAULT_BOARD.profile };
  } catch {
    return { ...DEFAULT_BOARD };
  }
}

const LIFE_CYCLE = new Set(['BLOCKED', 'READY', 'RUNNING', 'MERGING', 'CONFLICT', 'RESOLVING', 'MERGED', 'FAILED']);
const WAYFINDER = new Set(['claimed', 'resolved', 'open']);
const SKIP_TYPES = new Set(['research', 'prototype', 'grilling', 'task']);

export type Ticket = {
  feature: string;
  no: string;
  id: string; // <feature>/<NN>
  title: string;
  status: string;
  blockedBy: string;
  gate: string;
  path: string; // repo-relative
};

function field(lines: string[], name: string): string {
  const re = new RegExp(`^${name}:\\s*(.*)$`, 'i');
  for (const l of lines) {
    const m = l.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

/** 解析一个仓库里所有 feature 的 ticket 文件 */
export function scanTickets(cwd: string): Ticket[] {
  const root = join(cwd, '.scratch');
  if (!existsSync(root)) return [];
  const out: Ticket[] = [];
  for (const feature of readdirSync(root)) {
    const dir = join(root, feature, 'issues');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const raw = readFileSync(join(dir, file), 'utf8');
      const lines = raw.split('\n').slice(0, 40);
      const type = field(lines, 'Type');
      if (type && SKIP_TYPES.has(type)) continue;

      const no = (file.match(/^(\d+)/) || [, ''])[1];
      const head = (lines.find((l) => l.startsWith('# ')) || '').replace(/^#\s*/, '');
      // "# 11 — 话题群工作台" → "话题群工作台"；没编号就当整行是标题
      const title = head.replace(new RegExp(`^${no}\\s*[—–:-]\\s*`), '').trim() || head;

      const statusRaw = field(lines, 'Status');
      const status = (statusRaw.match(/[A-Za-z_]+/) || [''])[0].toUpperCase();
      const gateRaw = field(lines, 'Gate') || field(lines, '闸门');

      out.push({
        feature,
        no,
        id: `${feature}/${no}`,
        title,
        status: LIFE_CYCLE.has(status) || WAYFINDER.has(status.toLowerCase()) ? status : statusRaw || 'READY',
        blockedBy: field(lines, 'Blocked by') || field(lines, '阻塞于'),
        gate: /ready-for-agent/i.test(raw) ? 'ready-for-agent' : gateRaw,
        path: `.scratch/${feature}/issues/${file}`,
      });
    }
  }
  return out;
}

// ---- lark-cli ----

export function lark(args: string[], cfg: BoardCfg): any {
  const full = [...args, '--as', 'bot', '--profile', cfg.profile, '--format', 'json'];
  const r = spawnSync('lark-cli', full, { encoding: 'utf8', timeout: 120_000 });
  const raw = (r.stdout || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    // lark-cli sometimes prints progress lines (e.g. "[page 1] fetching…") before the JSON body.
    const start = raw.indexOf('{');
    if (start >= 0) {
      try {
        return JSON.parse(raw.slice(start));
      } catch { /* fall through */ }
    }
    return { ok: false, error: { message: raw.slice(0, 300) || (r.stderr || '').slice(0, 300) } };
  }
}

function fail(res: any, what: string): never | null {
  if (res && res.ok) return null;
  const e = res?.error || {};
  const msg = res?.missing_scopes ? `缺权限 ${res.missing_scopes.join(', ')}` : e.message || JSON.stringify(res).slice(0, 200);
  console.error(`✗ ${what}: ${msg}`);
  return null;
}

/** 读一张表的所有记录 → { 路径: record_id }
 *  用原始 API：+record-list 的 JSON 是"行数组"（没有 record_id），原始 API 才有 record_id + 字段名。 */
export function listRecords(cfg: BoardCfg, table: string): any[] {
  const out: any[] = [];
  let token = '';
  for (let page = 0; page < 25; page++) {
    const params: Record<string, any> = { page_size: 200 };
    if (token) params.page_token = token;
    const res = lark(
      ['api', 'GET', `/open-apis/bitable/v1/apps/${cfg.baseToken}/tables/${table}/records`,
       '--params', JSON.stringify(params)],
      cfg,
    );
    if (!res.ok) {
      fail(res, 'record-list');
      throw new Error('record-list failed');
    }
    out.push(...(res.data?.items || []));
    if (!res.data?.has_more) break;
    token = String(res.data?.page_token ?? '');
    if (!token) break;
  }
  return out;
}

/** 同一个 key 出现多条（第一次同步索引写错时留下的）→ 保留同步时间最新的一条，其余删掉 */
export function dedupe(cfg: BoardCfg, table: string, keyField: string) {
  const rows = listRecords(cfg, table);
  const byKey = new Map<string, any[]>();
  for (const r of rows) {
    const k = String(r.fields?.[keyField] ?? '');
    if (!k) continue;
    byKey.set(k, [...(byKey.get(k) || []), r]);
  }
  const doomed: string[] = [];
  for (const [, group] of byKey) {
    if (group.length < 2) continue;
    group.sort((a, b) => (b.fields?.['同步时间'] || 0) - (a.fields?.['同步时间'] || 0));
    doomed.push(...group.slice(1).map((r) => r.record_id));
  }
  if (!doomed.length) {
    console.log(`去重：${rows.length} 条记录，没有重复`);
    return { deleted: 0, total: rows.length };
  }
  for (let i = 0; i < doomed.length; i += 100) {
    const chunk = doomed.slice(i, i + 100);
    const res = lark(
      ['api', 'POST', `/open-apis/bitable/v1/apps/${cfg.baseToken}/tables/${table}/records/batch_delete`,
       '--data', JSON.stringify({ records: chunk })],
      cfg,
    );
    if (!res.ok) fail(res, 'batch_delete');
  }
  console.log(`去重：${rows.length} 条 → 删掉 ${doomed.length} 条重复，剩 ${rows.length - doomed.length}`);
  return { deleted: doomed.length, total: rows.length - doomed.length };
}

/** 读回来的值归一化后比较：select 写的是数组、读回来是字符串，日期写的是 ms 数字 */
function norm(v: any): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' && 'text' in x ? String(x.text) : String(x))).join(',');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 只把真正变了的字段算进 patch，避免每轮把 41 张票重写一遍 */
function changedFields(desired: Record<string, any>, cur: any): Record<string, any> {
  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(desired)) {
    if (norm(v) !== norm(cur?.[k])) patch[k] = v;
  }
  return patch;
}

function batchCreate(cfg: BoardCfg, table: string, rows: Record<string, any>[]): number {
  let n = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const res = lark(
      ['base', '+record-batch-create', '--base-token', cfg.baseToken, '--table-id', table,
       '--json', JSON.stringify({ create_records: chunk })],
      cfg,
    );
    if (!res.ok) {
      fail(res, `batch-create ${chunk.length} 条`);
      continue;
    }
    n += chunk.length;
  }
  return n;
}

function batchDelete(cfg: BoardCfg, table: string, ids: string[]): number {
  let n = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = lark(
      ['api', 'POST', `/open-apis/bitable/v1/apps/${cfg.baseToken}/tables/${table}/records/batch_delete`,
       '--data', JSON.stringify({ records: chunk })],
      cfg,
    );
    if (!res.ok) {
      fail(res, `batch-delete ${chunk.length} 条`);
      continue;
    }
    n += chunk.length;
  }
  return n;
}

function batchUpdate(cfg: BoardCfg, table: string, patches: Record<string, Record<string, any>>): number {
  const ids = Object.keys(patches);
  let n = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const map: Record<string, any> = {};
    for (const id of chunk) map[id] = patches[id];
    const res = lark(
      ['base', '+record-batch-update', '--base-token', cfg.baseToken, '--table-id', table,
       '--json', JSON.stringify({ update_records: map })],
      cfg,
    );
    if (!res.ok) {
      fail(res, `batch-update ${chunk.length} 条`);
      continue;
    }
    n += chunk.length;
  }
  return n;
}

export function syncTickets(cwd: string, cfg: BoardCfg = boardCfg()) {
  const tickets = scanTickets(cwd);
  if (!tickets.length) {
    console.log('没有找到 ticket（.scratch/<feature>/issues/*.md）');
    return { created: 0, updated: 0, total: 0 };
  }
  const rows = listRecords(cfg, cfg.ticketsTable);
  const byPath = new Map<string, any>();
  for (const r of rows) {
    const k = String(r.fields?.['路径'] ?? '');
    if (k && r.record_id) byPath.set(k, r);
  }

  const creates: Record<string, any>[] = [];
  const patches: Record<string, Record<string, any>> = {};
  for (const t of tickets) {
    const fields: Record<string, any> = {
      票号: t.no,
      标题: t.title,
      项目: t.feature,
      状态: [t.status],
      阻塞于: t.blockedBy,
      闸门: t.gate,
      路径: t.path,
      仓库: cwd,
    };
    const cur = byPath.get(t.path);
    if (!cur) creates.push(fields);
    else {
      const patch = changedFields(fields, cur.fields);
      if (Object.keys(patch).length) patches[cur.record_id] = patch;
    }
  }
  // Ticket files that no longer exist → their rows are gone too. Scoped by 仓库 so syncing
  // another repo into the same board never deletes this one's rows.
  const live = new Set(tickets.map((t) => t.path));
  const stale = rows
    .filter((r) => {
      const repoOf = norm(r.fields?.['仓库']);
      const p = String(r.fields?.['路径'] ?? '');
      return (repoOf === cwd || repoOf === '') && p.startsWith('.scratch/') && !live.has(p);
    })
    .map((r) => r.record_id);

  const created = creates.length ? batchCreate(cfg, cfg.ticketsTable, creates) : 0;
  const updated = Object.keys(patches).length ? batchUpdate(cfg, cfg.ticketsTable, patches) : 0;
  const deleted = stale.length ? batchDelete(cfg, cfg.ticketsTable, stale) : 0;
  const bits = [`新建 ${created}`, `更新 ${updated}`];
  if (deleted) bits.push(`清理 ${deleted}`);
  console.log(`票板：${tickets.length} 张票（${bits.join(' / ')}）`);
  return { created, updated, total: tickets.length };
}

// ---- run 台账 ----

export type RunRow = {
  runId: string;
  workflow: string;
  status: string;
  outcome: string;
  cwd: string;
  startedAt: string;
  finishedAt: string;
};

/** 从 archon 拉这个仓库的最近 run（archon 必须在 git 仓库里跑） */
export function archonRuns(cwd: string, limit = 20): RunRow[] {
  const r = spawnSync('archon', ['--cwd', cwd, 'workflow', 'runs', '--limit', String(limit), '--json'], {
    encoding: 'utf8',
    timeout: 90_000,
  });
  let rows: any[] = [];
  try {
    const j = JSON.parse((r.stdout || '').trim());
    rows = j.runs || j.data?.runs || (Array.isArray(j) ? j : []);
  } catch {
    return [];
  }
  return rows.map((x) => ({
    runId: x.id || x.run_id || '',
    workflow: x.workflow_name || x.workflowName || '',
    status: x.status || '',
    outcome: x.outcome || '',
    cwd: x.working_path || x.workingPath || cwd,
    startedAt: x.started_at || x.startedAt || '',
    finishedAt: x.completed_at || x.completedAt || '',
  }));
}

export function syncRuns(cwd: string, cfg: BoardCfg = boardCfg()) {
  const runs = archonRuns(cwd);
  // 桥自己盯着的 run 也一起进台账（可能不在 archon 的 recent 列表里）
  const statePath = join(BRIDGE_DIR, 'state.json');
  if (existsSync(statePath)) {
    try {
      const st = JSON.parse(readFileSync(statePath, 'utf8'));
      for (const rec of Object.values<any>(st.runs || {})) {
        if (rec?.cwd !== cwd) continue;
        if (runs.some((r) => r.runId === rec.runId)) continue;
        runs.push({
          runId: rec.runId,
          workflow: rec.workflow || '',
          status: rec.status || 'unknown',
          outcome: rec.outcome || '',
          cwd: rec.cwd || cwd,
          startedAt: rec.created || '',
          finishedAt: '',
        });
      }
    } catch {}
  }
  if (!runs.length) {
    console.log('这个仓库没有 run 记录');
    return { created: 0, updated: 0, total: 0 };
  }
  const rows = listRecords(cfg, cfg.runsTable);
  const byId = new Map<string, any>();
  for (const r of rows) {
    const k = String(r.fields?.['run_id'] ?? '');
    if (k && r.record_id) byId.set(k, r);
  }
  const KNOWN = new Set(['running', 'paused', 'completed', 'failed', 'cancelled']);
  const creates: Record<string, any>[] = [];
  const patches: Record<string, Record<string, any>> = {};
  for (const r of runs) {
    const fields: Record<string, any> = {
      run_id: r.runId,
      workflow: r.workflow,
      状态: [KNOWN.has(r.status) ? r.status : 'cancelled'],
      结果: r.outcome || '',
      项目路径: r.cwd,
      开始时间: fmt(r.startedAt),
      结束时间: fmt(r.finishedAt),
    };
    const cur = byId.get(r.runId);
    if (!cur) creates.push(fields);
    else {
      const patch = changedFields(fields, cur.fields);
      if (Object.keys(patch).length) patches[cur.record_id] = patch;
    }
  }
  const created = creates.length ? batchCreate(cfg, cfg.runsTable, creates) : 0;
  const updated = Object.keys(patches).length ? batchUpdate(cfg, cfg.runsTable, patches) : 0;
  console.log(`run 台账：${runs.length} 条（新建 ${created} / 更新 ${updated}）`);
  return { created, updated, total: runs.length };
}

/** 只读快照：给桥的 /board 用（不写库） */
export function snapshot(cfg: BoardCfg = boardCfg()) {
  const tickets = listRecords(cfg, cfg.ticketsTable);
  const runs = listRecords(cfg, cfg.runsTable);
  const byProject: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let gate = 0;
  for (const r of tickets) {
    const p = String(r.fields?.项目 ?? '');
    const s = String(r.fields?.状态 ?? '');
    if (p) byProject[p] = (byProject[p] || 0) + 1;
    if (s) byStatus[s] = (byStatus[s] || 0) + 1;
    if (String(r.fields?.闸门 ?? '') === 'ready-for-agent') gate++;
  }
  const runStatus: Record<string, number> = {};
  for (const r of runs) {
    const s = String(r.fields?.状态 ?? '');
    if (s) runStatus[s] = (runStatus[s] || 0) + 1;
  }
  return { url: cfg.url, tickets: tickets.length, runs: runs.length, byProject, byStatus, runStatus, gate };
}

function fmt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---- CLI ----

if (import.meta.main) {
  const [mode, cwd] = process.argv.slice(2);
  const cfg = boardCfg();
  if (!mode || (!cwd && mode !== '--dedupe' && mode !== '--snapshot')) {
    console.log('用法: bun board.ts --sync|--sync-runs|--sync-all|--dedupe|--snapshot|--dump <repo-cwd>');
    process.exit(1);
  }
  if (mode === '--snapshot') {
    console.log(JSON.stringify(snapshot(cfg)));
  } else if (mode === '--dump') {
    for (const t of scanTickets(cwd)) console.log(t.id.padEnd(24), t.status.padEnd(10), t.gate.padEnd(16), t.title);
  } else if (mode === '--sync') {
    syncTickets(cwd, cfg);
  } else if (mode === '--sync-runs') {
    syncRuns(cwd, cfg);
  } else if (mode === '--sync-all') {
    syncTickets(cwd, cfg);
    syncRuns(cwd, cfg);
    console.log(`看板：${cfg.url}`);
  } else if (mode === '--dedupe') {
    dedupe(cfg, cfg.ticketsTable, '路径');
    dedupe(cfg, cfg.runsTable, 'run_id');
  } else {
    console.error(`未知参数 ${mode}`);
    process.exit(1);
  }
}
