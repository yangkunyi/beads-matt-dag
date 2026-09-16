/**
 * The overview as a self-contained HTML page: the DAG, the three filters, and a click-for-detail panel.
 *
 * All data is embedded. A static snapshot has no socket — a browser talking to that file is looking
 * at what `bd` already answered. A served page posts an operator reply as `bd comment`; Beads stays
 * the only comment store.
 */

import type { LiveRun, Overview, OverviewIssue } from "./model";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function unique(values: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
		if (seen.has(value)) continue;
		seen.add(value);
		out.push(value);
	}
	return out.sort();
}

function fieldsetHtml(legend: string, name: string, values: { value: string; label: string }[]): string {
	const options = values
		.map((entry) => {
			return `<label><input type="checkbox" data-filter="${escapeHtml(name)}" value="${escapeHtml(entry.value)}" checked> ${escapeHtml(entry.label)}</label>`;
		})
		.join("");
	const body = options || `<p class="muted">none</p>`;
	return `<fieldset><legend>${escapeHtml(legend)}</legend>${body}</fieldset>`;
}

function filtersHtml(overview: Overview): string {
	const types = unique(overview.issues.map((issue) => issue.type)).map((type) => ({ value: type, label: type }));
	const statuses = unique(overview.issues.map((issue) => issue.status)).map((status) => ({
		value: status,
		label: status,
	}));
	const labelValues = unique(overview.issues.flatMap((issue) => issue.labels));
	const hasUnlabeled = overview.issues.some((issue) => issue.labels.length === 0);
	const labels = [
		...(hasUnlabeled ? [{ value: "", label: "(none)" }] : []),
		...labelValues.map((label) => ({ value: label, label })),
	];
	return (
		fieldsetHtml("Type", "type", types) +
		fieldsetHtml("Status", "status", statuses) +
		fieldsetHtml("Label", "label", labels)
	);
}

const CLIENT = String.raw`
(function () {
  var dataEl = document.getElementById("overview");
  if (!dataEl) return;
  var overview = JSON.parse(dataEl.textContent || '{"issues":[],"edges":[]}');
  var issues = overview.issues || [];
  var edges = overview.edges || [];
  var live = overview.live || null;
  var commentEndpoint = overview.commentEndpoint || null;
  var selected = null;
  var attempted = {};
  if (live && live.attempted) {
    for (var a = 0; a < live.attempted.length; a++) attempted[live.attempted[a]] = true;
  }

  function checkedSet(name) {
    var boxes = document.querySelectorAll('input[data-filter="' + name + '"]');
    var set = {};
    var any = false;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) {
        any = true;
        set[boxes[i].value] = true;
      }
    }
    return { any: any, set: set };
  }

  function visible() {
    var types = checkedSet("type");
    var statuses = checkedSet("status");
    var labels = checkedSet("label");
    return issues.filter(function (issue) {
      if (types.any && !types.set[issue.type]) return false;
      if (statuses.any && !statuses.set[issue.status]) return false;
      if (labels.any) {
        if (!issue.labels || issue.labels.length === 0) return !!labels.set[""];
        var hit = false;
        for (var i = 0; i < issue.labels.length; i++) {
          if (labels.set[issue.labels[i]]) { hit = true; break; }
        }
        if (!hit) return false;
      }
      return true;
    });
  }

  function layersFor(shown, shownEdges) {
    var ids = shown.map(function (i) { return i.id; });
    var incoming = {};
    for (var i = 0; i < ids.length; i++) incoming[ids[i]] = [];
    for (var e = 0; e < shownEdges.length; e++) {
      var edge = shownEdges[e];
      if (edge.type !== "blocks") continue;
      if (!incoming[edge.to] || incoming[edge.from] === undefined) continue;
      incoming[edge.to].push(edge.from);
    }
    var layer = {};
    var changed = true;
    var guard = 0;
    while (changed && guard++ < ids.length + 2) {
      changed = false;
      for (var n = 0; n < ids.length; n++) {
        var id = ids[n];
        var deps = incoming[id];
        var ready = true;
        for (var d = 0; d < deps.length; d++) {
          if (layer[deps[d]] === undefined) { ready = false; break; }
        }
        if (!ready) continue;
        var next = 0;
        for (var d2 = 0; d2 < deps.length; d2++) {
          if (layer[deps[d2]] + 1 > next) next = layer[deps[d2]] + 1;
        }
        if (layer[id] !== next) { layer[id] = next; changed = true; }
      }
    }
    for (var k = 0; k < ids.length; k++) if (layer[ids[k]] === undefined) layer[ids[k]] = 0;
    return layer;
  }

  function escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function draw() {
    var shown = visible();
    var ids = {};
    for (var i = 0; i < shown.length; i++) ids[shown[i].id] = true;
    var shownEdges = edges.filter(function (e) { return ids[e.from] && ids[e.to]; });
    var layer = layersFor(shown, shownEdges);
    var columns = {};
    var maxLayer = 0;
    for (var s = 0; s < shown.length; s++) {
      var L = layer[shown[s].id] || 0;
      if (!columns[L]) columns[L] = [];
      columns[L].push(shown[s]);
      if (L > maxLayer) maxLayer = L;
    }
    var NODE_W = 200;
    var NODE_H = 52;
    var GAP_X = 80;
    var GAP_Y = 18;
    var pos = {};
    var height = NODE_H;
    for (var col = 0; col <= maxLayer; col++) {
      var column = columns[col] || [];
      for (var r = 0; r < column.length; r++) {
        var x = 24 + col * (NODE_W + GAP_X);
        var y = 24 + r * (NODE_H + GAP_Y);
        pos[column[r].id] = { x: x, y: y };
        var bottom = y + NODE_H;
        if (bottom > height) height = bottom;
      }
    }
    var width = 24 + (maxLayer + 1) * (NODE_W + GAP_X);
    var svg = document.getElementById("graph");
    var parts = [];
    parts.push('<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"></path></marker></defs>');
    for (var e = 0; e < shownEdges.length; e++) {
      var edge = shownEdges[e];
      var a = pos[edge.from];
      var b = pos[edge.to];
      if (!a || !b) continue;
      var x1 = a.x + NODE_W;
      var y1 = a.y + NODE_H / 2;
      var x2 = b.x;
      var y2 = b.y + NODE_H / 2;
      var dash = edge.type === "blocks" ? "" : ' stroke-dasharray="6 4"';
      var cls = "edge edge-" + edge.type;
      parts.push('<path class="' + cls + '" d="M ' + x1 + ' ' + y1 + ' C ' + (x1 + 40) + ' ' + y1 + ', ' + (x2 - 40) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" fill="none" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"' + dash + '><title>' + escape(edge.type) + "</title></path>");
    }
    for (var n = 0; n < shown.length; n++) {
      var issue = shown[n];
      var p = pos[issue.id];
      if (!p) continue;
      var cls = "node domain-" + issue.domain + " status-" + issue.status;
      if (attempted[issue.id]) cls += " live";
      if (selected === issue.id) cls += " selected";
      var label = issue.handle || issue.id;
      var title = issue.title || "";
      if (title.length > 28) title = title.slice(0, 27) + "\u2026";
      parts.push('<g class="' + cls + '" data-id="' + escape(issue.id) + '" transform="translate(' + p.x + ' ' + p.y + ')">');
      parts.push('<rect width="' + NODE_W + '" height="' + NODE_H + '" rx="8"></rect>');
      parts.push('<text class="id" x="12" y="20">' + escape(label) + "</text>");
      parts.push('<text class="title" x="12" y="40">' + escape(title) + "</text>");
      if (attempted[issue.id]) parts.push('<text class="live-tag" x="188" y="18">live</text>');
      parts.push("</g>");
    }
    svg.setAttribute("viewBox", "0 0 " + Math.max(width, 400) + " " + Math.max(height + 24, 120));
    svg.setAttribute("width", String(Math.max(width, 400)));
    svg.setAttribute("height", String(Math.max(height + 24, 120)));
    svg.innerHTML = parts.join("");
    var nodes = svg.querySelectorAll("g.node");
    for (var c = 0; c < nodes.length; c++) {
      nodes[c].addEventListener("click", function (ev) {
        var id = ev.currentTarget.getAttribute("data-id");
        selected = id;
        showDetail(id);
        draw();
      });
    }
    document.getElementById("count").textContent = shown.length + " of " + issues.length + " issues";
  }

  function showDetail(id) {
    var issue = null;
    for (var i = 0; i < issues.length; i++) if (issues[i].id === id) { issue = issues[i]; break; }
    var panel = document.getElementById("detail");
    if (!issue) {
      panel.innerHTML = '<p class="empty">Click an issue.</p>';
      return;
    }
    var html = "";
    html += "<h2>" + escape(issue.handle || issue.id) + "</h2>";
    html += "<p class='title'>" + escape(issue.title) + "</p>";
    html += "<dl>";
    html += "<dt>status</dt><dd>" + escape(issue.status) + "</dd>";
    html += "<dt>type</dt><dd>" + escape(issue.type) + " (" + escape(issue.domain) + ")</dd>";
    html += "<dt>labels</dt><dd>" + escape((issue.labels && issue.labels.length) ? issue.labels.join(", ") : "(none)") + "</dd>";
    if (live && attempted[issue.id]) {
      html += "<dt>live run</dt><dd>" + escape(live.kind) + " · " + escape(live.id) + " · attempted</dd>";
    }
    html += "</dl>";
    html += "<h3>Comments</h3>";
    if (!issue.comments || issue.comments.length === 0) {
      html += '<p class="muted">No comments.</p>';
    } else {
      for (var c = 0; c < issue.comments.length; c++) {
        var comment = issue.comments[c];
        html += '<article class="comment"><header>' + escape(comment.author) + " \u00b7 " + escape(comment.createdAt) + "</header><pre>" + escape(comment.text) + "</pre></article>";
      }
    }
    html += "<h3>Documents</h3>";
    if (!issue.documents || issue.documents.length === 0) {
      html += '<p class="muted">No documents (the issue has no handle/slug to name them).</p>';
    } else {
      for (var d = 0; d < issue.documents.length; d++) {
        var doc = issue.documents[d];
        html += '<article class="doc"><header>' + escape(doc.kind) + " \u00b7 " + escape(doc.rel) +
          (doc.exists ? "" : " \u00b7 missing") + "</header>";
        if (doc.exists && doc.text !== null) html += "<pre>" + escape(doc.text) + "</pre>";
        html += "</article>";
      }
    }
    if (commentEndpoint) {
      html += "<h3>Reply</h3>";
      html += '<form id="reply-form">';
      html += '<label class="sr-only" for="reply-text">Reply</label>';
      html += '<textarea id="reply-text" name="text" rows="4" required></textarea>';
      html += '<button type="submit">Comment</button>';
      html += '<p class="muted">Saved as a store comment. Close, reading:, and labels stay with the session.</p>';
      html += '<p class="muted" id="reply-status"></p>';
      html += "</form>";
    }
    panel.innerHTML = html;
    var form = document.getElementById("reply-form");
    if (form && commentEndpoint) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var box = document.getElementById("reply-text");
        var status = document.getElementById("reply-status");
        var text = box ? box.value : "";
        fetch(commentEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: issue.id, text: text }),
        }).then(function (res) {
          if (!res.ok) {
            return res.text().then(function (t) { throw new Error(t || String(res.status)); });
          }
          location.reload();
        }).catch(function (err) {
          if (status) status.textContent = String(err.message || err);
        });
      });
    }
  }

  function showLive() {
    var el = document.getElementById("live");
    if (!el) return;
    if (!live) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    var meta = document.getElementById("live-meta");
    var n = live.attempted ? live.attempted.length : 0;
    if (meta) {
      meta.innerHTML = "<strong>Live " + escape(live.kind) + "</strong> · " + escape(live.id) +
        " · " + escape(live.status || "") + " · " + n + " attempted";
    }
    var summary = document.getElementById("live-report-summary");
    var reportEl = document.getElementById("live-report");
    if (live.report && live.report.text) {
      if (summary) summary.textContent = "Last report · " + (live.report.rel || "");
      if (reportEl) reportEl.textContent = live.report.text;
    } else {
      if (summary) summary.textContent = "Last report · none yet";
      if (reportEl) reportEl.textContent = "";
    }
  }

  var boxes = document.querySelectorAll("#filters input[type=checkbox]");
  for (var b = 0; b < boxes.length; b++) boxes[b].addEventListener("change", draw);
  showLive();
  draw();
})();
`;

const STYLES = `
:root {
  color-scheme: light;
  --bg: #f8fafc;
  --panel: #ffffff;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #cbd5e1;
  --inquiry: #2563eb;
  --experiment: #7c3aed;
  --development: #0f766e;
  --open: #ffffff;
  --progress: #fef3c7;
  --closed: #e2e8f0;
  --live: #d97706;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 ui-sans-serif, system-ui, sans-serif; }
header { padding: 16px 20px 8px; }
header h1 { margin: 0 0 4px; font-size: 20px; }
header p { margin: 0; color: var(--muted); }
#count { font-weight: 600; color: var(--ink); }
#live { margin: 0 20px 8px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; }
#live-meta { margin: 0; }
#live details { margin-top: 8px; }
#live pre { white-space: pre-wrap; background: var(--panel); padding: 8px; border-radius: 6px; margin: 6px 0 0; font: 12px/1.4 ui-monospace, monospace; max-height: 240px; overflow: auto; }
#filters { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 20px 12px; }
fieldset { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 8px 12px; margin: 0; }
legend { font-weight: 600; padding: 0 4px; }
fieldset label { display: inline-flex; align-items: center; gap: 6px; margin-right: 10px; margin-top: 4px; }
#layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 12px; padding: 0 20px 20px; align-items: start; }
#graph-wrap { overflow: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; min-height: 320px; }
svg#graph { display: block; }
g.node { cursor: pointer; }
g.node rect { stroke-width: 2; }
g.domain-inquiry rect { stroke: var(--inquiry); }
g.domain-experiment rect { stroke: var(--experiment); }
g.domain-development rect { stroke: var(--development); }
g.status-open rect { fill: var(--open); }
g.status-in_progress rect { fill: var(--progress); }
g.status-closed rect { fill: var(--closed); }
g.node.selected rect { stroke-width: 4; }
g.node.live rect { stroke: var(--live); stroke-width: 3; }
g.node text { font-size: 12px; fill: var(--ink); }
g.node text.id { font-weight: 650; }
g.node text.live-tag { font-size: 10px; font-weight: 700; fill: var(--live); text-anchor: end; }
#detail { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; min-height: 320px; }
#detail h2 { margin: 0 0 4px; font-size: 16px; }
#detail .title { margin: 0 0 12px; }
#detail dl { display: grid; grid-template-columns: 80px 1fr; gap: 4px 8px; margin: 0 0 16px; }
#detail dt { color: var(--muted); }
#detail dd { margin: 0; }
#detail h3 { margin: 16px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
#detail pre { white-space: pre-wrap; background: var(--bg); padding: 8px; border-radius: 6px; margin: 6px 0 0; font: 12px/1.4 ui-monospace, monospace; }
#detail article { margin-bottom: 10px; }
#detail article header { color: var(--muted); font-size: 12px; }
#reply-form textarea { width: 100%; min-height: 72px; padding: 8px; border: 1px solid var(--line); border-radius: 6px; font: 13px/1.4 ui-sans-serif, system-ui, sans-serif; }
#reply-form button { margin-top: 8px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
.muted, .empty { color: var(--muted); }
@media (max-width: 900px) {
  #layout { grid-template-columns: 1fr; }
}
`;

export type RenderPageOptions = {
	/** When set, the detail panel posts a reply here as `bd comment`. Absent on a static snapshot. */
	commentEndpoint?: string;
};

export function renderPage(overview: Overview, options: RenderPageOptions = {}): string {
	const data = JSON.stringify({
		...overview,
		commentEndpoint: options.commentEndpoint ?? null,
	}).replace(/</g, "\\u003c");
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Target beads graph</title>
<style>${STYLES}</style>
</head>
<body>
<header>
  <h1>Target beads graph</h1>
  <p>Read from the beads store via <code>bd</code>, not the jsonl export. A view, not a second graph. Covers inquiry, experiment, and drain issues. Live overlay is the run lock, Archon status, the run's artefacts, and attempted — not a pack publish API. <span id="count"></span></p>
</header>
<section id="live" hidden aria-label="Live run">
  <p id="live-meta"></p>
  <details id="live-report-wrap">
    <summary id="live-report-summary">Last report</summary>
    <pre id="live-report"></pre>
  </details>
</section>
<section id="filters" aria-label="Filters">${filtersHtml(overview)}</section>
<div id="layout">
  <div id="graph-wrap"><svg id="graph" role="img" aria-label="Issue DAG"></svg></div>
  <aside id="detail"><p class="empty">Click an issue.</p></aside>
</div>
<script type="application/json" id="overview">${data}</script>
<script>${CLIENT}</script>
</body>
</html>
`;
}

/** Values the page must carry so a click can show them without another fetch. */
export function pageCarriesDetail(html: string, issue: OverviewIssue): boolean {
	if (!html.includes(issue.id)) return false;
	if (!html.includes(issue.status)) return false;
	for (const comment of issue.comments) {
		if (!html.includes(comment.text)) return false;
	}
	for (const doc of issue.documents) {
		if (!html.includes(doc.rel)) return false;
	}
	return true;
}

export function pageHasFilters(html: string): boolean {
	return html.includes("<legend>Type</legend>") && html.includes("<legend>Status</legend>") && html.includes("<legend>Label</legend>");
}

/** A served page posts replies; a static snapshot does not. */
export function pageOffersReply(html: string): boolean {
	return html.includes('"commentEndpoint":"/comment"');
}

/** The page still names all three domains even when a live run of one kind is overlaid. */
export function pageCoversThreeDomains(html: string): boolean {
	return html.includes("inquiry") && html.includes("experiment") && html.includes("drain");
}

/** Values the live overlay must carry so the graph can show the run and its last report. */
export function pageCarriesLive(html: string, live: LiveRun): boolean {
	if (!html.includes(live.id)) return false;
	if (!html.includes(live.kind)) return false;
	if (!html.includes(live.status)) return false;
	for (const id of live.attempted) {
		if (!html.includes(id)) return false;
	}
	if (live.report !== null && !html.includes(live.report.text)) return false;
	return html.includes("Last report");
}
