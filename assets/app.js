const D = window.__DATA__;
// Public site (window.__PUBLIC__): no home team. AM becomes a neutral default (the #1 power team) and nothing is highlighted.
const PUB = !!window.__PUBLIC__;
const AM = PUB ? ((D.power && D.power.table || []).find(r => r.rank === 1) || {}).team || D.am : D.am;
const HL = PUB ? null : AM;   // team to highlight
if (PUB) { const dqTab = document.querySelector('.tab[data-tab="dq"]'); if (dqTab) dqTab.hidden = true; }   // Data quality is internal only
const SEASONS = window.__SEASONS__ || { current: String(D.season || '2026'), available: [String(D.season || '2026')] };
const CUR = SEASONS.current;
const OTHERS = window.__OTHERS__ || {};   // other seasons' slim summaries: { '2025': { teams, games, generated, matches } }
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmt = {
  pct: v => v == null ? '—' : (v * 100).toFixed(1) + '%',
  eff: v => { if (v == null) return '—'; const s = Math.abs(v).toFixed(3); return (Math.abs(v) < 0.0005 || v > 0 ? '' : '-') + (s.startsWith('0') ? s.slice(1) : s); },
  n2: v => v == null ? '—' : Number(v).toFixed(2),
  n3: v => v == null ? '—' : Number(v).toFixed(3),
  int: v => v == null ? '—' : Number(v).toLocaleString(),
  str: v => v == null ? '—' : v,
  date: v => { const [y, m, d] = v.split('-'); return `${m}/${d}`; }
};
const TEAM_NAMES = window.__NAMES__ || {};   // data/team_names.csv: official name → display name
const short = t => TEAM_NAMES[t] || t.replace(/^University of /, '').replace(/ University$/, '').replace(/^The /, '').replace('California State University, ', 'CSU ').replace('University of California, ', 'UC ');
// team search: matches the official name, the display name (LSU, BYU, Ole Miss) and common nicknames; ignores case, periods, apostrophes, hyphens
const NICK = { 'Alabama': 'bama', 'Missouri': 'mizzou', 'Mississippi State': 'miss st msu', 'Kentucky': 'uk', 'North Carolina': 'unc', 'NC State': 'ncsu', 'Pittsburgh': 'pitt',
  'Southern California': 'usc', 'UCLA': 'ucla', 'Cal': 'berkeley california', 'Penn State': 'psu', 'Ohio State': 'osu', 'Oklahoma State': 'osu okst', 'Oregon State': 'osu',
  'Michigan State': 'msu', 'Florida State': 'fsu', 'Arizona State': 'asu', 'Iowa State': 'isu', 'Kansas State': 'ksu k state', 'Georgia Tech': 'gt', 'Texas A&M': 'tamu aggies a&m',
  'Texas Tech': 'ttu', 'Miami (OH)': 'miami ohio', 'Long Beach State': 'lbsu', 'Stephen F. Austin': 'sfa', 'Sam Houston State': 'shsu', 'SIUE': 'edwardsville', 'Hawaii': 'hawai\'i',
  'Wisconsin': 'uw', 'Washington': 'uw udub', 'Nebraska': 'huskers', 'Louisville': 'uofl', 'Connecticut': 'uconn', 'Massachusetts': 'umass', 'Virginia Tech': 'vt', 'Western Kentucky': 'wku' };
const _tn = s => String(s || '').toLowerCase().replace(/[.'’]/g, '').replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
const tm = (t, q) => { const k = _tn(q); if (!k) return true; const d = short(t); return _tn(t).includes(k) || _tn(d).includes(k) || _tn(NICK[d]).includes(k); };
Chart.defaults.font.family = '"IBM Plex Sans", system-ui, sans-serif';
Chart.defaults.font.size = 12;
function theme() {
  Chart.defaults.color = css('--ink-2');
  Chart.defaults.borderColor = css('--grid');
}
theme();
const charts = {};
const rebuild = [];
function mk(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); }
const baseOpts = (extra = {}) => ({
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: css('--ink'), titleColor: css('--page'), bodyColor: css('--page'), padding: 8, cornerRadius: 4 } },
  scales: { x: { grid: { display: false }, border: { color: css('--axis') } }, y: { grid: { color: css('--grid') }, border: { display: false } } },
  ...extra
});

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== 'p-' + b.dataset.tab);
  try { localStorage.setItem('m26tab', b.dataset.tab); } catch (e) {}
  if (PUB) navTo(b.dataset.tab);
  b.scrollIntoView({ block: 'nearest', inline: 'center' });   // phones: keep the active tab in the scrolling strip
  if (window.innerWidth <= 760) window.scrollTo({ top: 0 });
  Object.values(charts).forEach(c => c.resize());
}));
/* public site: every tab has its own address (stats/rpi/, stats/power/ ...) so page views show which tabs get used */
const TAB_SLUG = { nat: '', cf: 'conference', am: 'team', cmp: 'compare', tr: 'trends', grp: 'top-50', rpi: 'rpi', pwr: 'power', ncaa: 'bracketology', sc: 'scores', gl: 'glossary' };
const TAB_TITLE = { nat: 'Stats', cf: 'Conference stats', am: 'Team', cmp: 'Compare', tr: 'Trends', grp: 'Top 50', rpi: 'RPI', pwr: 'Power', ncaa: 'Bracketology', sc: 'Scores', gl: 'Glossary' };
let navPop = false;
function navTo(tab) {
  if (!(tab in TAB_SLUG) || navPop) return;
  const root = location.pathname.replace(/\/stats\/.*$/, '/stats/');
  const q = new URLSearchParams(location.search); q.delete('tab'); if (tab !== 'am') q.delete('team');
  const url = root + (TAB_SLUG[tab] ? TAB_SLUG[tab] + '/' : '') + (q.toString() ? '?' + q : '');
  const site = document.querySelector('.site-brand')?.textContent || 'VolleyStats';
  document.title = tab === 'nat' ? 'Stats · ' + site : TAB_TITLE[tab] + ' · ' + site;
  if (url === location.pathname + location.search) return;
  history[window.__NAV_LIVE__ ? 'pushState' : 'replaceState']({ tab }, '', url);
}
if (PUB) window.addEventListener('popstate', () => {
  const m = location.pathname.match(/\/stats\/([^/]+)\/?$/); const tab = (m && Object.keys(TAB_SLUG).find(k => TAB_SLUG[k] === m[1])) || 'nat';
  const b = document.querySelector(`.tab[data-tab="${tab}"]`); if (b && !b.hidden) { navPop = true; b.click(); navPop = false; }
});
if (!PUB) try { const t = localStorage.getItem('m26tab'); const b = t && document.querySelector(`.tab[data-tab="${t}"]`); if (b && !b.hidden) b.click(); } catch (e) {}

/* ---------- generic table ---------- */
function table(el, rows, cols, opts = {}) {
  const tbl = typeof el === 'string' ? document.getElementById(el) : el;
  if (opts.tclass != null) tbl.className = opts.tclass;
  let sortKey = opts.sort || cols.find(c => c.key).key, asc = opts.asc ?? false;
  function render() {
    const data = [...rows].sort((a, b) => {
      const x = a[sortKey], y = b[sortKey];
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y));
      return asc ? c : -c;
    });
    let h = '<thead><tr>' + cols.map(c => `<th class="${c.left ? 'l ' : ''}${c.key === sortKey ? 'sorted ' + (asc ? 'asc' : '') : ''}" data-k="${c.key}"${c.title ? ` title="${c.title}"` : ''}>${c.label}</th>`).join('') + '</tr></thead><tbody>';
    const lim = opts.limit ? data.slice(0, opts.limit) : data;
    for (const r of lim) {
      const cls = [(opts.rowClass ? opts.rowClass(r) : ''), opts.onClick ? 'click' : ''].join(' ');
      h += `<tr class="${cls}" data-id="${r[opts.idKey || ''] ?? ''}">` + cols.map(c => { const bg = c.bg ? c.bg(r[c.key], r) : ''; return `<td class="${c.left ? 'l' : ''}${c.cls ? ' ' + c.cls : ''}"${bg ? ` style="background:${bg}"` : ''}>${(c.fmt || fmt.str)(r[c.key], r)}</td>`; }).join('') + '</tr>';
    }
    tbl.innerHTML = h + '</tbody>';
    tbl.querySelectorAll('th').forEach(th => th.onclick = () => { const k = th.dataset.k; if (k === sortKey) asc = !asc; else { sortKey = k; asc = cols.find(c => c.key === k).asc ?? false; } render(); });
    if (opts.onClick) tbl.querySelectorAll('tbody tr').forEach(tr => tr.onclick = () => opts.onClick(tr.dataset.id));
  }
  render();
}
/* ---------- horizontal bar list (leaderboard charts, team profile, conference strength) ----------
   items: [{ label, sub, value, text, hl, tip }] · opts: { ref, refLabel, lo, hi, color } — one bar per row, drawn from the zero line (or lo) */
function hbars(el, items, opts = {}) {
  const box = typeof el === 'string' ? document.getElementById(el) : el; if (!box) return;
  if (!items.length) { box.innerHTML = ''; return; }
  const vals = items.map(i => i.value).filter(v => v != null);
  const base = opts.base ?? 0;   // bars grow from here (0, or e.g. the median so the bar shows the gap to typical)
  let lo = opts.lo ?? Math.min(base, ...vals, opts.ref ?? base), hi = opts.hi ?? Math.max(base, ...vals, opts.ref ?? -Infinity);
  if (opts.lo == null && lo < base) lo = lo - (hi - lo) * 0.04; if (opts.hi == null) hi = hi + (hi - lo) * 0.04; if (hi <= lo) hi = lo + 1;
  const x = v => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)), z = x(Math.max(lo, Math.min(hi, base)));
  const esc = t => String(t ?? '').replace(/"/g, '&quot;');
  const ref = opts.ref != null ? `<i class="hb-ref" style="left:${x(opts.ref)}%"></i>` : '';
  box.innerHTML = items.map(i => { const v = i.value ?? lo, a = Math.min(z, x(v)), w = Math.abs(x(v) - z);
    return `<div class="hb-r${i.hl ? ' hl' : ''}" title="${esc(i.tip)}"><div class="hb-n">${i.label}${i.sub ? `<span>${i.sub}</span>` : ''}</div><div class="hb-t">${ref}<div class="hb-b" style="left:${a}%;width:${Math.max(w, 0.6)}%${opts.color ? ';background:' + opts.color : ''}"></div></div><div class="hb-v">${i.text ?? ''}</div></div>`; }).join('') +
    (opts.refLabel ? `<div class="hb-key"><i></i>${opts.refLabel}</div>` : '');
}
const median = a => { const b = a.filter(v => v != null).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const rk = (v, r, key) => v == null ? '—' : v + (r['rk_' + key] ? `<span class="rk">#${r['rk_' + key]}</span>` : '');

/* ================= NATIONAL ================= */
const teams = D.teams; teams.forEach(t => t.conf = t.conf || 'Non-D1');
const elig = teams.filter(t => t.matches >= 3);
const am = teams.find(t => t.team === AM);
const confs = [...new Set(teams.map(t => t.conf))].filter(c => c !== 'Non-D1').sort();
const GROUPS = {}; const GROUP_DATA = (D.groups && !Array.isArray(D.groups)) ? D.groups : {};
Object.entries(GROUP_DATA).forEach(([g, v]) => GROUPS[g] = v.teams);
if (!Object.keys(GROUPS).length) GROUPS['Top 15'] = ['University of Nebraska-Lincoln', 'University of Wisconsin-Madison', 'University of Kentucky', 'University of Texas at Austin', 'Stanford University', 'Texas A&M University', 'University of Louisville', 'Southern Methodist University', 'University of Pittsburgh', 'Pennsylvania State University', 'Purdue University', 'Arizona State University', 'Texas Christian University', 'University of Florida', 'University of Minnesota'];
const inGroup = (t, g) => GROUPS[g] ? GROUPS[g].includes(t.team) : t.conf === g;
document.querySelectorAll('select.conf-sel').forEach(sel => { sel.innerHTML = '<option value="">All conferences</option><optgroup label="Groups">' + Object.keys(GROUPS).map(g => `<option value="${g}">${g}</option>`).join('') + '</optgroup><optgroup label="Conferences">' + confs.map(c => `<option value="${c}">${c}</option>`).join('') + '<option value="Non-D1">Non-D1 opponents</option></optgroup>'; });
const RANKED = [['so_pct', false], ['ps_pct', false], ['att_eff', false], ['opp_att_eff', true], ['pass_rating', false], ['ace_pct', false], ['ko_pct', false], ['set_win_pct', false], ['kill_pct', false], ['opp_kill_pct', true], ['good_pass_pct', false]];
function rankPool(pool) {
  pool.forEach(t => RANKED.forEach(([k]) => t['rk_' + k] = null));
  const el = pool.filter(t => t.matches >= 3);
  RANKED.forEach(([k, asc]) => { const s = el.filter(t => t[k] != null).sort((a, b) => asc ? a[k] - b[k] : b[k] - a[k]); s.forEach((t, i) => t['rk_' + k] = (i > 0 && s[i - 1][k] === t[k]) ? s[i - 1]['rk_' + k] : i + 1); });
}
rankPool(teams);
const amNat = Object.fromEntries(RANKED.map(([k]) => [k, am['rk_' + k]]));
const secPool = teams.filter(t => t.conf === am.conf); rankPool(secPool); const amConf = Object.fromEntries(RANKED.map(([k]) => [k, am['rk_' + k]]));
rankPool(teams.filter(t => inGroup(t, 'Top 15'))); const amTop = Object.fromEntries(RANKED.map(([k]) => [k, am['rk_' + k]])); rankPool(teams);
const rkText = k => `<b>#${amNat[k]}</b> nat · #${amConf[k]} ${am.conf} · #${amTop[k]} Top 15`;
const med = (arr) => { const a = arr.filter(v => v != null).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
(function () { const sel = document.getElementById('season-sel'); if (!sel) return; sel.innerHTML = SEASONS.available.map(x => `<option value="${x}">${x}</option>`).join(''); sel.value = CUR; document.getElementById('h-season').textContent = CUR; if (SEASONS.available.length < 2) sel.parentElement.hidden = true; sel.addEventListener('change', () => { const u = new URL(location.href); u.searchParams.set('season', sel.value); location.href = u.toString(); }); })();
const PREV = D.prev || null;
const mv = (prev, cur, tip) => { if (cur == null) return ''; const t = tip ? ` title="${tip}"` : ''; if (prev == null) return `<span class="mv new"${t}>new</span>`; const d = prev - cur; return d > 0 ? `<span class="mv up"${t}>▲${d}</span>` : d < 0 ? `<span class="mv dn"${t}>▼${-d}</span>` : `<span class="mv same"${t}>–</span>`; };
(function () {
  const md = v => { if (!v) return ''; const [y, m, d] = String(v).slice(0, 10).split('-'); return `${+m}/${+d}`; };
  const tm = v => { const t = String(v || '').slice(11, 16); if (!t) return ''; let [h, mi] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${String(mi).padStart(2, '0')}${ap}`; };
  const el = document.getElementById('upd');
  el.innerHTML = `Updated <b>${md(D.generated)} ${tm(D.generated)}</b> · results through ${md(D.rpi ? D.rpi.through : D.dq.date_range[1])}`;
  el.title = `${D.dq.matches.toLocaleString()} matches · ${D.dq.teams} teams · ${fmt.int(D.dq.rows)} touches\nScout files ${D.dq.date_range[0]} to ${D.dq.date_range[1]}${D.rpi ? `\nNCAA results through ${D.rpi.through}` : ''}${PREV ? `\nMovement arrows vs the ${PREV.generated} update` : ''}\nBuilt ${D.generated}`;
})();

document.getElementById('foot-src').textContent = `Charted match data · built ${D.generated}`;
function kpi(el, items) {
  document.getElementById(el).innerHTML = items.map(k => `<div class="kpi ${k.am && !PUB ? 'am' : ''}"><div class="l">${k.l}</div><div class="v">${k.v}</div><div class="d">${k.d || ''}</div></div>`).join('');
}
kpi('nat-kpis', [
  { l: 'Matches', v: fmt.int(D.dq.matches), d: `${D.dq.sets.toLocaleString()} sets` },
  { l: 'Points charted', v: fmt.int(D.dq.points), d: `${(D.dq.points / D.dq.sets).toFixed(1)} per set` },
  { l: 'Median sideout %', v: fmt.pct(med(elig.map(t => t.so_pct))), d: '3+ match teams' },
  { l: 'Median kill %', v: fmt.pct(med(elig.map(t => t.kill_pct))), d: `kills ÷ attempts · att eff ${fmt.eff(med(elig.map(t => t.att_eff)))}` },
  ...(PUB ? [{ l: 'Teams', v: fmt.int(elig.length), d: 'with 3+ matches' }] : [{ l: short(AM) + ' sideout', v: fmt.pct(am.so_pct), d: `<b>#${amNat.so_pct}</b> of ${elig.length} · #${amConf.so_pct} ${am.conf} · #${amTop.so_pct} Top 15`, am: true }]),
  { l: 'Median good pass %', v: fmt.pct(med(elig.map(t => t.good_pass_pct))), d: `perfect + good passes · pass rating ${fmt.n2(med(elig.map(t => t.pass_rating)))}` },
]);

/* sideout histogram */
let chartPool = elig;
(function () {
  const vals = () => chartPool.map(t => t.so_pct * 100);
  const lo = 40, hi = 76, w = 2; const bins = [];
  const amBin = Math.floor(am.so_pct * 100 / w) * w;
  rebuild.push(() => { bins.length = 0; const v = vals(); for (let b = lo; b < hi; b += w) bins.push({ x: b, n: v.filter(x => x >= b && x < b + w).length }); mk('c-so-hist', {
    type: 'bar',
    data: { labels: bins.map(b => `${b.x}–${b.x + w}%`), datasets: [{ data: bins.map(b => b.n), backgroundColor: bins.map(b => b.x === amBin ? css('--maroon-ink') : css('--s1')), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom', barPercentage: .92, categoryPercentage: .92 }] },
    options: baseOpts({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y} teams${bins[c.dataIndex].x === amBin ? ' · includes Texas A&M (' + fmt.pct(am.so_pct) + ')' : ''}` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: css('--grid') }, border: { display: false }, title: { display: true, text: 'teams' } } } })
  }); });
})();
/* scatter */
const LOGOS = {}; let logosPending = 0;
Object.entries(window.__LOGOS__ || {}).forEach(([t, src]) => { const im = new Image(); logosPending++; im.onload = () => { if (--logosPending === 0 && charts['c-scatter']) charts['c-scatter'].update('none'); }; im.src = src; LOGOS[t] = im; });
const logoMode = () => chartPool.length <= 40;
const scatterLabels = { id: 'scatterLabels', afterDatasetsDraw(ch) {
  if (!logoMode()) return; const { ctx } = ch; ctx.save(); ctx.font = '11px "IBM Plex Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = css('--ink-2');
  ch.data.datasets.forEach((ds, di) => ch.getDatasetMeta(di).data.forEach((pt, i) => { const t = ds.data[i].t; if (!LOGOS[t]) ctx.fillText(short(t), pt.x, pt.y + 9); }));
  ctx.restore(); } };
rebuild.push(() => {
  const lm = logoMode();
  const pool = chartPool.filter(t => t.team !== HL);
  const style = t => (lm && LOGOS[t.team]) ? LOGOS[t.team] : 'circle';
  mk('c-scatter', {
  type: 'scatter',
  data: { datasets: [
    { label: 'D1 teams', data: pool.map(t => ({ x: t.so_pct * 100, y: t.ps_pct * 100, t: t.team })), pointStyle: pool.map(style), backgroundColor: css('--s1') + 'B3', borderColor: css('--surface'), borderWidth: 1, pointRadius: lm ? 6 : 4.5, pointHoverRadius: lm ? 8 : 7 },
    ...(PUB ? [] : [{ label: short(AM), data: [{ x: am.so_pct * 100, y: am.ps_pct * 100, t: AM }], pointStyle: [style(am)], backgroundColor: css('--maroon-ink'), borderColor: css('--surface'), borderWidth: 2, pointRadius: 8, pointHoverRadius: 10 }])
  ] },
  options: baseOpts({ layout: { padding: { top: 14, right: 20, bottom: 6, left: 6 } }, interaction: { mode: 'nearest', intersect: true, axis: 'xy' }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: i => i.length > 1 ? `${i.length} teams at this spot` : short(i[0].raw.t), label: c => c.chart.tooltip.dataPoints.length > 1 ? `${short(c.raw.t)}: SO ${c.parsed.x.toFixed(1)}% · PS ${c.parsed.y.toFixed(1)}%` : `SO ${c.parsed.x.toFixed(1)}% · PS ${c.parsed.y.toFixed(1)}%` } } },
    scales: { x: { title: { display: true, text: 'Sideout %' }, grid: { color: css('--grid') }, border: { display: false } }, y: { title: { display: true, text: 'Point-scoring %' }, grid: { color: css('--grid') }, border: { display: false } } } }),
  plugins: [scatterLabels]
  });
});

/* scorecard columns (shared) */
const SC = [
  ['pts_ps','Points',fmt.n2,1],['k_ps','K',fmt.n2,1],['blk_ps','Blk',fmt.n2,1],['ace_ps','Ace',fmt.n2,1],['ufe_ps','UFE',fmt.n2,0],
  ['xfbso','xFBSO',fmt.pct,1],['fbso','FBSO',fmt.pct,1],['eff_ip','GP Eff',fmt.eff,1],['eff_med','MP Eff',fmt.eff,1],['eff_oos','BP Eff',fmt.eff,1],
  ['so','SO',fmt.pct,1],['eso','ESO',fmt.pct,1],['tr_ins','Tr InSys',fmt.eff,1],['tr_oos','Tr OoS',fmt.eff,1],['tr_f','Tr F',fmt.eff,1],
  ['srv_xfb','xFBSO (S)',fmt.pct,0],['ko_pct','KO%',fmt.pct,1],['se_pct','SE%',fmt.pct,0],['ps','pS',fmt.pct,1],['insabe','INSABE',fmt.eff,1],['oosabe','OOSABE',fmt.eff,1],
  ['stuffs','Stuffs',fmt.pct,1],['xd_k','xD K%',fmt.pct,1],['create','Create',fmt.pct,1]
];
const n1 = v => v == null ? '—' : Number(v).toFixed(1);
SC.forEach(c => { if (c[1].match(/^(Points|K|Blk|Ace|UFE)$/)) c[2] = n1; });
const scCols = (pre) => SC.map(([k, label, f, hi]) => ({ key: pre + k, label, fmt: f, asc: !hi }));
const flatSc = (row, pre, sc) => { if (sc) { SC.forEach(([k]) => row[pre + k] = sc[k]); row[pre + 'sets'] = sc.sets; } return row; };
teams.forEach(t => flatSc(t, 'sc_', t.sc));
/* team table */
const teamCols = [
  { key: 'team', label: 'Team', left: true, asc: true, fmt: v => short(v) },
  { key: 'conf', label: 'Conf', left: true, asc: true },
  { key: 'matches', label: 'M' }, { key: 'rec', label: 'W–L', fmt: (v, r) => `${r.wins}–${r.losses}` },
  { key: 'set_win_pct', label: 'Set %', fmt: fmt.pct },
  { key: 'so_pct', label: 'SO %', fmt: (v, r) => rk(fmt.pct(v), r, 'so_pct') },
  { key: 'ps_pct', label: 'PS %', fmt: (v, r) => rk(fmt.pct(v), r, 'ps_pct') },
  { key: 'kill_pct', label: 'Kill %', fmt: fmt.pct },
  { key: 'opp_att_eff', label: 'Opp att eff', asc: true, fmt: (v, r) => rk(fmt.eff(v), r, 'opp_att_eff') },
  { key: 'good_pass_pct', label: 'Good pass', fmt: fmt.pct },
  { key: 'ace_pct', label: 'Ace %', fmt: fmt.pct }, { key: 'ko_pct', label: 'KO %', fmt: (v, r) => rk(fmt.pct(v), r, 'ko_pct') }, { key: 'serve_err_pct', label: 'SE %', asc: true, fmt: fmt.pct },
  { key: 'kills_per_set', label: 'K/set', fmt: fmt.n2 }, { key: 'blocks_per_set', label: 'B/set', fmt: fmt.n2 }, { key: 'digs_per_set', label: 'D/set', fmt: fmt.n2 },
  { key: 'att_eff', label: 'Att eff', fmt: (v, r) => rk(fmt.eff(v), r, 'att_eff') },
  { key: 'pass_rating', label: 'Pass', fmt: (v, r) => rk(fmt.n2(v), r, 'pass_rating') },
];
teams.forEach(t => t.rec = t.wins - t.losses);
/* ---------- Team: set distribution by rotation (app only: window.__SETDIST__) ----------
   __SETDIST__ = { rec: {team: rows}, free: {team: rows} } (older files: {team: rows} = rec). rows are SZ1, SZ6, SZ5, SZ4, SZ3, SZ2. */
const SD_KEYS = [['F', 'Front', '--maroon-ink'], ['C', 'Center', '--s1'], ['B', 'Back', '--s2'], ['P', 'Pipe', '--s3'], ['S', 'Setter', '--s4'], ['O', 'Other', '--ink-3']];
const SZ_ORDER = ['SZ1', 'SZ6', 'SZ5', 'SZ4', 'SZ3', 'SZ2'];
function drawSetDist(team) { drawDist('sd', 'rec', team); drawDist('fd', 'free', team); }
function drawDist(px, kind, team) {
  const raw = window.__SETDIST__, card = document.getElementById(`tm-${px}-card`);
  if (!card) return;
  const SD = raw ? (raw.rec || raw.free ? raw[kind] : (kind === 'rec' ? raw : null)) : null;
  const all = SD && SD[team];
  if (PUB || !all || !all.length) { card.hidden = true; return; }
  card.hidden = false;
  const cmpSel = document.getElementById(`tm-${px}-cmp`), pick = document.getElementById(`tm-${px}-rot`);
  const redraw = () => drawDist(px, kind, document.getElementById('tm-sel').value || team);
  if (!cmpSel.dataset.bound) { cmpSel.dataset.bound = 1; cmpSel.addEventListener('change', redraw); }
  if (!pick.dataset.bound) {   // rotation picker: built once, keeps its selection when the team changes
    pick.dataset.bound = 1;
    pick.innerHTML = SZ_ORDER.map(z => `<label><input type="checkbox" value="${z}" checked>${z}</label>`).join('') + '<button type="button" data-a="all">All</button><button type="button" data-a="front">Setter front</button><button type="button" data-a="back">Setter back</button>';
    pick.addEventListener('change', redraw);
    pick.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; if (!a) return;
      const on = { all: SZ_ORDER, front: ['SZ4', 'SZ3', 'SZ2'], back: ['SZ1', 'SZ6', 'SZ5'] }[a];
      pick.querySelectorAll('input').forEach(i => i.checked = on.includes(i.value)); redraw(); });
  }
  const want = new Set([...pick.querySelectorAll('input:checked')].map(i => i.value));
  const rows = all.filter(r => want.has(r.sz));
  if (!rows.length) { if (charts[`c-tm-${px}`]) { charts[`c-tm-${px}`].destroy(); delete charts[`c-tm-${px}`]; } document.getElementById(`tm-${px}-leg`).innerHTML = '<span>Pick at least one rotation.</span>'; return; }
  // Power top 30 average: pooled counts of the current top 30 in the power rankings
  const pooled = teamsIn => { const by = {}; teamsIn.forEach(t => (SD[t] || []).forEach(r => { const o = by[r.sz] = by[r.sz] || { sz: r.sz, n: 0, F: 0, C: 0, B: 0, P: 0, S: 0, O: 0 }; ['n', 'F', 'C', 'B', 'P', 'S', 'O'].forEach(k => o[k] += r[k] || 0); })); return rows.map(r => by[r.sz] || { sz: r.sz, n: 0 }); };
  const top30 = ((D.power && D.power.table) || []).filter(r => r.rank != null).slice().sort((x, y) => x.rank - y.rank).slice(0, 30).map(r => r.team);
  const cmp = cmpSel.value === '_P30' ? pooled(top30) : null;
  const labels = rows.map(r => r.sz);
  const pct = (r, k) => r && r.n ? r[k] / r.n * 100 : 0;
  const cmpBy = cmp ? Object.fromEntries(cmp.map(r => [r.sz, r])) : {};
  const sets = [];
  SD_KEYS.forEach(([k, lab, c]) => {
    sets.push({ label: lab, key: k, stack: 't', data: rows.map(r => pct(r, k)), backgroundColor: css(c), borderColor: css('--surface') || '#fff', borderWidth: 1 });
    if (cmp) sets.push({ label: lab + ' (top 30)', key: k, stack: 'd', data: rows.map(r => pct(cmpBy[r.sz], k)), backgroundColor: css(c) + '66', borderColor: css('--surface') || '#fff', borderWidth: 1 });
  });
  const box = document.getElementById(`c-tm-${px}`).parentElement; box.style.height = Math.max(160, rows.length * (cmp ? 70 : 60) + 60) + 'px';
  mk(`c-tm-${px}`, { type: 'bar', data: { labels, datasets: sets },
    options: baseOpts({ indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { ...baseOpts().plugins.tooltip, callbacks: {
        title: items => `${items[0].label} · ${items[0].dataset.stack === 'd' ? 'Power top 30 average' : short(team)}`,
        label: c => { const r = c.dataset.stack === 'd' ? cmpBy[labels[c.dataIndex]] : rows[c.dataIndex]; const k = c.dataset.key; return `${SD_KEYS.find(x => x[0] === k)[1]}: ${c.parsed.x.toFixed(1)}% (${r ? r[k] : 0} of ${r ? r.n : 0})`; } } } },
      scales: { y: { grid: { display: false }, border: { color: css('--axis') }, stacked: true, ticks: { callback: (v, i) => [labels[i], `${rows[i].n} sets`] } }, x: { grid: { color: css('--grid') }, border: { display: false }, stacked: true, min: 0, max: 100, ticks: { callback: v => v + '%' } } } }),
    plugins: [{ id: 'sdLbl', afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.font = '600 11px "IBM Plex Sans"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ch.data.datasets.forEach((ds, di) => { const meta = ch.getDatasetMeta(di); if (meta.hidden) return; meta.data.forEach((b, i) => { const v = ds.data[i]; if (v < 7) return;
        ctx.fillStyle = ds.stack === 'd' ? css('--ink') : (ds.key === 'S' || ds.key === 'O' ? css('--ink') : '#fff'); ctx.fillText(`${ds.key} ${Math.round(v)}`, (b.x + b.base) / 2, b.y); }); }); ctx.restore(); } }] });
  document.getElementById(`tm-${px}-leg`).innerHTML = SD_KEYS.map(([k, lab, c]) => `<span class="sq" style="--c:var(${c})">${k} · ${lab}</span>`).join('') + (cmp ? '<span class="sq" style="--c:var(--ink-3);opacity:.45">lighter bar = Power top 30 average</span>' : '');
}

function renderTeams() {
  const q = document.getElementById('t-search').value.toLowerCase(), mn = +document.getElementById('t-min').value || 1, cf = document.getElementById('t-conf').value;
  const pool = cf ? teams.filter(t => inGroup(t, cf)) : teams;
  rankPool(pool);
  chartPool = pool.filter(t => t.matches >= 3); rebuild.slice(0, 2).forEach(f => f());
  const rows = pool.filter(t => t.matches >= mn && tm(t.team, q));
  document.getElementById('t-count').textContent = `${rows.length} teams · ranks within ${cf || 'all of D1'} (3+ matches)`;
  document.getElementById('nat-scope').textContent = cf ? cf : 'D1';
  const view = document.getElementById('t-view').value;
  const cols = view === 'sc' ? [teamCols[0], teamCols[1], teamCols[2], { key: 'sc_sets', label: 'Sets' }, ...scCols('sc_')] : teamCols;
  table('t-teams', rows, cols, { sort: view === 'sc' ? 'sc_so' : 'so_pct', idKey: 'team', rowClass: r => r.team === HL ? 'am' : '', onClick: drill });
}
document.addEventListener('click', e => { const a = e.target.closest('a[data-open]'); if (!a) return; e.preventDefault(); document.getElementById('tm-sel').value = a.dataset.open; teamPanel.show(a.dataset.open); document.querySelector('.tab[data-tab="am"]').click(); window.scrollTo(0, 0); });
function drill(team) {
  const ms = D.matches.filter(m => m.home === team || m.away === team).sort((a, b) => a.date.localeCompare(b.date));
  const el = document.getElementById('t-drill');
  el.innerHTML = `<h3 style="margin:14px 0 6px">${team} <small>${ms.length} matches${D.detail[team] ? ` · <a href="#" data-open="${team.replace(/"/g, '&quot;')}" style="color:var(--s1)">open team page →</a>` : ''}</small></h3><div class="tbl-wrap"><table></table></div>`;
  table(el.querySelector('table'), ms.map(m => { const h = m.home === team; return { date: m.date, opp: h ? m.away : m.home, site: h ? 'Home' : 'Away', res: m.winner === team ? 'W' : m.winner ? 'L' : '—', sf: h ? m.home_sets : m.away_sets, sa: h ? m.away_sets : m.home_sets, scores: h ? m.scores : m.scores.split(', ').map(s => s.split('-').reverse().join('-')).join(', ') }; }),
    [{ key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'opp', label: 'Opponent', left: true, asc: true }, { key: 'site', label: 'Site', left: true }, { key: 'res', label: 'Result', fmt: v => `<span class="pill ${v}">${v}</span>` }, { key: 'sf', label: 'Sets', fmt: (v, r) => `${r.sf}–${r.sa}` }, { key: 'scores', label: 'Set scores', left: true }], { sort: 'date', asc: true });
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
['t-search', 't-min', 't-conf', 't-view'].forEach(id => document.getElementById(id).addEventListener('input', renderTeams));

/* players */
const attemptField = { att_eff: 'att', kills_per_set: 'att', kill_pct: 'att', aces_per_set: 'serves', ace_pct: 'serves', ko_pct: 'serves', serve_err_pct: 'serves', pass_rating: 'recs', good_pass_pct: 'recs', blocks_per_set: 'sets', digs_per_set: 'sets' };
const LOWER_BETTER = new Set(['serve_err_pct', 'rec_err_pct', 'opp_att_eff', 'set_err_pct']);
const attemptLabel = { att: 'Att', serves: 'Serves', recs: 'Recs', sets: 'Sets' };
function renderPlayers() {
  const m = document.getElementById('p-metric').value, mn = +document.getElementById('p-min').value || 0, q = document.getElementById('p-team').value.toLowerCase(), n = +document.getElementById('p-n').value;
  const af = attemptField[m];
  const pcf = document.getElementById('p-conf').value, ppos = document.getElementById('p-pos').value; const confOf = Object.fromEntries(teams.map(t => [t.team, t.conf]));
  const rows = D.players.filter(p => p[m] != null && p[af] >= mn && tm(p.team, q) && (!pcf || inGroup({ team: p.team, conf: confOf[p.team] }, pcf)) && (!ppos || p.pos_guess === ppos));
  const f = m.includes('pct') ? fmt.pct : m === 'att_eff' ? fmt.eff : fmt.n2;
  table('t-players', rows, [
    { key: 'rank', label: '#', fmt: (v, r) => '' },
    { key: 'player', label: 'Player', left: true, asc: true, fmt: (v, r) => `${v} <span class="pos">${r.pos_guess}</span>` },
    { key: 'team', label: 'Team', left: true, asc: true, fmt: (v) => `${short(v)} <span class="rk">${confOf[v]}</span>` },
    { key: 'sets', label: 'Sets' }, { key: af, label: attemptLabel[af] },
    { key: m, label: document.querySelector('#p-metric option:checked').textContent, fmt: f },
    { key: 'kills', label: 'K' }, { key: 'att_eff', label: 'Eff', fmt: fmt.eff }, { key: 'aces', label: 'Aces' }, { key: 'ko_pct', label: 'KO %', fmt: fmt.pct }, { key: 'blocks', label: 'Blk' }, { key: 'digs', label: 'Digs' }, { key: 'pass_rating', label: 'Pass', fmt: fmt.n2 }
  ], { sort: m, asc: LOWER_BETTER.has(m), limit: n, rowClass: r => r.team === HL ? 'am' : '' });
  const pmed = median(rows.map(r => r[m])), lb = LOWER_BETTER.has(m), top = rows.slice().sort((a, b) => lb ? a[m] - b[m] : b[m] - a[m]).slice(0, 15), lab = document.querySelector('#p-metric option:checked').textContent;
  hbars('hb-players', top.map((r, i) => ({ label: `${i + 1}. ${r.player}`, sub: short(r.team), value: r[m], text: f(r[m]), hl: r.team === HL, tip: `${r.player} · ${short(r.team)} · ${lab} ${f(r[m])} on ${r[af]} ${attemptLabel[af].toLowerCase()}` })),
    { ref: pmed, base: pmed, refLabel: `Bars start at the median of the ${rows.length} qualifying players (${f(pmed)}), so length = gap above typical · top 15${lb ? ' · lower is better' : ''}` });
  document.querySelectorAll('#t-players tbody tr').forEach((tr, i) => tr.firstElementChild.textContent = i + 1);
}
['p-metric', 'p-min', 'p-team', 'p-n', 'p-conf', 'p-pos'].forEach(id => document.getElementById(id).addEventListener('input', renderPlayers));
renderPlayers();


/* ---------- attack-combo names (codes from the scout file → the names we use) ---------- */
const COMBO_NAME = {"X5": "Go", "X6": "Red", "V5": "HighZ4", "X1": "Tight Quick", "V6": "HighZ2", "X7": "Gap", "CF": "Slide", "PP": "Setter Dump", "VP": "Pipe", "XP": "Bic", "XM": "Push", "X2": "A", "X3": "2 Ball", "X8": "D Ball", "X9": "Rip", "CB": "B Slide", "V8": "High D Ball", "XS": "OppSlide"};
const cbName = c => COMBO_NAME[c] ? `${COMBO_NAME[c]} <span class="rk">${c}</span>` : c;
const cbText = c => COMBO_NAME[c] ? `${COMBO_NAME[c]} (${c})` : c;

/* ---------- attack-combo helpers (shared by the national leaderboard and the Team page) ----------
   Phase prefixes: '' all swings, fb_ FBSO, tr_ transition; FBSO sub-layers by pass grade:
   is_ in system (R# / R+), md_ medium (R!), os_ out of system (R-). */
const CB_PRE = { all: '', fb: 'fb_', tr: 'tr_', is: 'is_', md: 'md_', os: 'os_' };
const cbPre = ph => CB_PRE[ph] || '';
const cbEffKey = pre => pre ? pre + 'eff' : 'eff';
// Re-point the headline columns (att/kills/err/blocked/eff/K%) at the chosen phase; the split columns stay.
const cbProj = (r, pre) => pre ? { ...r, att: r[pre + 'att'], kills: r[pre + 'k'], err: r[pre + 'e'], blocked: r[pre + 'b'], eff: r[pre + 'eff'], kill_pct: r[pre + 'att'] ? r[pre + 'k'] / r[pre + 'att'] : null } : { ...r };
const cbSplitCols = [
  { key: 'fb_att', label: 'FBSO att' }, { key: 'fb_eff', label: 'FBSO eff', fmt: fmt.eff },
  { key: 'is_att', label: 'InSys att', title: 'FBSO swings off a good pass (R# / R+)' }, { key: 'is_eff', label: 'InSys eff', fmt: fmt.eff, title: 'FBSO swings off a good pass (R# / R+)' },
  { key: 'md_att', label: 'Med att', title: 'FBSO swings off a medium pass (R!)' }, { key: 'md_eff', label: 'Med eff', fmt: fmt.eff, title: 'FBSO swings off a medium pass (R!)' },
  { key: 'os_att', label: 'OoS att', title: 'FBSO swings off a poor pass (R-)' }, { key: 'os_eff', label: 'OoS eff', fmt: fmt.eff, title: 'FBSO swings off a poor pass (R-)' },
  { key: 'tr_att', label: 'Tr att' }, { key: 'tr_eff', label: 'Tr eff', fmt: fmt.eff }
];

/* ---------- national attack-combo leaderboard (built from every team's combo rows) ---------- */
(function () {
  const all = []; const confOf = Object.fromEntries(teams.map(t => [t.team, t.conf]));
  for (const t in D.detail) { const rows = D.detail[t].combos; if (Array.isArray(rows)) rows.forEach(r => all.push({ ...r, team: t, conf: confOf[t] || 'Non-D1' })); }
  const card = document.getElementById('t-cb'); if (!all.length) { card.closest('.card').hidden = true; return; }
  const LGC = (D.league && Array.isArray(D.league.combos)) ? Object.fromEntries(D.league.combos.map(c => [c.combo, c])) : {};
  const counts = {}; all.forEach(r => counts[r.combo] = (counts[r.combo] || 0) + r.att);
  const combos = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const sel = document.getElementById('cb-combo'); sel.innerHTML = '<option value="">All combos</option>' + combos.map(c => `<option value="${c}">${cbText(c)} · ${counts[c].toLocaleString()} swings</option>`).join(''); sel.value = combos.includes('X5') ? 'X5' : '';
  function render() {
    const combo = sel.value, ph = document.getElementById('cb-phase').value, mn = +document.getElementById('cb-min').value || 1, cf = document.getElementById('cb-conf').value, q = document.getElementById('cb-q').value.toLowerCase(), n = +document.getElementById('cb-n').value;
    const pre = cbPre(ph), lk = cbEffKey(pre);
    const rows = all.filter(r => (!combo || r.combo === combo) && (pre ? r[pre + 'att'] : r.att) >= mn && (!cf || inGroup({ team: r.team, conf: r.conf }, cf)) && (!q || r.player.toLowerCase().includes(q) || tm(r.team, q)))
      .map(r => cbProj(r, pre));
    rows.sort((a, b) => (b.eff ?? -9) - (a.eff ?? -9)); rows.forEach((r, i) => r.rk = i + 1);
    document.getElementById('cb-count').textContent = `${rows.length} qualify`;
    table('t-cb', rows, [
      { key: 'rk', label: '#', asc: true }, { key: 'player', label: 'Player', left: true, asc: true }, { key: 'team', label: 'Team', left: true, asc: true, fmt: (v, r) => `${short(v)} <span class="rk">${r.conf}</span>` },
      { key: 'combo', label: 'Combo', left: true, asc: true, fmt: v => `<b>${cbName(v)}</b> ${LGC[v] && LGC[v][lk] != null ? `<span class="rk">D1 ${fmt.eff(LGC[v][lk])}</span>` : ''}` },
      { key: 'att', label: 'Att' }, { key: 'kills', label: 'K' }, { key: 'err', label: 'E' }, { key: 'blocked', label: "Blk'd" }, { key: 'kill_pct', label: 'K%', fmt: fmt.pct }, { key: 'eff', label: 'Eff', fmt: fmt.eff },
      ...cbSplitCols
    ], { sort: 'rk', asc: true, limit: n, rowClass: r => r.team === HL ? 'am' : '' });
    const d1 = combo && LGC[combo] ? LGC[combo][lk] : null, cmed = median(rows.map(r => r.eff));
    hbars('hb-cb', rows.slice(0, 15).map(r => ({ label: `${r.rk}. ${r.player}`, sub: `${short(r.team)}${combo ? '' : ' · ' + (COMBO_NAME[r.combo] || r.combo)}`, value: r.eff, text: fmt.eff(r.eff), hl: r.team === HL, tip: `${r.player} · ${short(r.team)} · ${cbText(r.combo)} · ${r.kills}–${r.err}–${r.blocked} on ${r.att} swings` })),
      { ref: d1 ?? cmed, base: d1 ?? cmed, refLabel: d1 != null ? `Bars start at the D1 average for ${cbText(combo)} (${fmt.eff(d1)}) · top 15 by efficiency` : `Bars start at the median of qualifying rows (${fmt.eff(cmed)}) · top 15 by efficiency` });
  }
  ['cb-combo', 'cb-phase', 'cb-min', 'cb-conf', 'cb-q', 'cb-n'].forEach(id => document.getElementById(id).addEventListener('input', render));
  render();
})();

/* ---------- setter leaderboard (D.league.setters) ---------- */
(function () {
  const all = ((D.league && D.league.setters) || []); const card = document.getElementById('t-st').closest('.card'); if (!all.length) { card.hidden = true; return; }
  const confOf = Object.fromEntries(teams.map(t => [t.team, t.conf])); all.forEach(r => r.conf = confOf[r.team] || 'Non-D1');
  function render() {
    const pre = cbPre(document.getElementById('st-phase').value), mn = +document.getElementById('st-min').value || 1, cf = document.getElementById('st-conf').value, q = document.getElementById('st-q').value.toLowerCase(), n = +document.getElementById('st-n').value;
    const rows = all.filter(r => r.sets >= mn && (!cf || inGroup({ team: r.team, conf: r.conf }, cf)) && (!q || r.setter.toLowerCase().includes(q) || tm(r.team, q)))
      .map(r => pre ? { ...r, att: r[pre + 'att'], eff: r[pre + 'eff'], kill_pct: null } : { ...r }).filter(r => r.att > 0);
    rows.sort((a, b) => (b.eff ?? -9) - (a.eff ?? -9)); rows.forEach((r, i) => r.rk = i + 1);
    document.getElementById('st-count').textContent = `${rows.length} qualify`;
    table('t-st', rows, [
      { key: 'rk', label: '#', asc: true }, { key: 'setter', label: 'Setter', left: true, asc: true }, { key: 'team', label: 'Team', left: true, asc: true, fmt: (v, r) => `${short(v)} <span class="rk">${r.conf}</span>` },
      { key: 'sets', label: 'Set att' }, { key: 'assists', label: 'Assists' }, { key: 'assist_pct', label: 'Assist %', fmt: fmt.pct }, { key: 'set_err_pct', label: 'Set err %', asc: true, fmt: fmt.pct },
      { key: 'att', label: pre ? 'Swings (phase)' : 'Swings' }, { key: 'eff', label: pre ? 'Eff (phase)' : 'Eff', fmt: fmt.eff }, { key: 'kill_pct', label: 'K%', fmt: fmt.pct }, { key: 'lowblk', label: '0–1 blk', fmt: fmt.pct, title: 'Share of attacks off this setter that met no block, one blocker or a seam' },
      { key: 'fb_eff', label: 'FBSO eff', fmt: fmt.eff }, { key: 'is_eff', label: 'InSys eff', fmt: fmt.eff }, { key: 'md_eff', label: 'Med eff', fmt: fmt.eff }, { key: 'os_eff', label: 'OoS eff', fmt: fmt.eff }, { key: 'tr_eff', label: 'Tr eff', fmt: fmt.eff }
    ], { sort: 'rk', asc: true, limit: n, rowClass: r => r.team === HL ? 'am' : '' });
    const smed = median(rows.map(r => r.eff));
    hbars('hb-st', rows.slice(0, 15).map(r => ({ label: `${r.rk}. ${r.setter}`, sub: short(r.team), value: r.eff, text: fmt.eff(r.eff), hl: r.team === HL, tip: `${r.setter} · ${short(r.team)} · attackers hit ${fmt.eff(r.eff)} on ${r.att} swings` })),
      { ref: smed, base: smed, refLabel: `Attack efficiency off their sets · bars start at the median of the ${rows.length} qualifying setters (${fmt.eff(smed)}) · top 15` });
  }
  ['st-phase', 'st-min', 'st-conf', 'st-q', 'st-n'].forEach(id => document.getElementById(id).addEventListener('input', render));
  render();
})();

/* ---------- libero / DS leaderboard (D.league.passers) ---------- */
(function () {
  const all = ((D.league && D.league.passers) || []); const card = document.getElementById('t-lb').closest('.card'); if (!all.length) { card.hidden = true; return; }
  const confOf = Object.fromEntries(teams.map(t => [t.team, t.conf])); all.forEach(r => r.conf = confOf[r.team] || 'Non-D1');
  function render() {
    const pos = document.getElementById('lb-pos').value, m = document.getElementById('lb-metric').value, mn = +document.getElementById('lb-min').value || 1, cf = document.getElementById('lb-conf').value, q = document.getElementById('lb-q').value.toLowerCase(), n = +document.getElementById('lb-n').value;
    const rows = all.filter(r => r.recs >= mn && (!pos || r.pos_guess === pos) && r[m] != null && (!cf || inGroup({ team: r.team, conf: r.conf }, cf)) && (!q || r.player.toLowerCase().includes(q) || tm(r.team, q))).map(r => ({ ...r }));
    rows.sort((a, b) => (b[m] ?? -9) - (a[m] ?? -9)); rows.forEach((r, i) => r.rk = i + 1);
    document.getElementById('lb-count').textContent = `${rows.length} qualify`;
    const hl = k => ({ cls: k === m ? 'rt' : '' });
    table('t-lb', rows, [
      { key: 'rk', label: '#', asc: true }, { key: 'player', label: 'Player', left: true, asc: true, fmt: (v, r) => `${v} <span class="pos">${r.pos_guess || ''}</span>` }, { key: 'team', label: 'Team', left: true, asc: true, fmt: (v, r) => `${short(v)} <span class="rk">${r.conf}</span>` },
      { key: 'recs', label: 'Recs' }, { key: 'xfbso', label: 'xFBSO', fmt: fmt.pct, ...hl('xfbso') }, { key: 'good_pass_pct', label: 'Good %', fmt: fmt.pct, ...hl('good_pass_pct') }, { key: 'rec_err_pct', label: 'Rec err', asc: true, fmt: fmt.pct },
      { key: 'sets', label: 'Sets', fmt: v => v ?? 0 }, { key: 'set_eff', label: 'Eff off set', fmt: fmt.eff, ...hl('set_eff') }, { key: 'set_kill_pct', label: 'K% off set', fmt: fmt.pct },
      { key: 'serves', label: 'Serves', fmt: v => v ?? 0 }, { key: 'ace_pct', label: 'Ace %', fmt: fmt.pct }, { key: 'ko_pct', label: 'KO %', fmt: fmt.pct, ...hl('ko_pct'), title: 'Knockout %: serves whose reception was R!, R-, R= (ace) or R/' }, { key: 'serve_err_pct', label: 'SE %', asc: true, fmt: fmt.pct }, { key: 'pass_rating', label: 'Pass', fmt: fmt.n2, ...hl('pass_rating') }
    ], { sort: 'rk', asc: true, limit: n, rowClass: r => r.team === HL ? 'am' : '' });
    const lf = m === 'pass_rating' ? fmt.n2 : m === 'set_eff' ? fmt.eff : fmt.pct, ml = document.querySelector('#lb-metric option:checked').textContent;
    const lmed = median(rows.map(r => r[m]));
    hbars('hb-lb', rows.slice(0, 15).map(r => ({ label: `${r.rk}. ${r.player}`, sub: short(r.team), value: r[m], text: lf(r[m]), hl: r.team === HL, tip: `${r.player} · ${short(r.team)} · ${ml} ${lf(r[m])} on ${r.recs} receptions` })),
      { ref: lmed, base: lmed, refLabel: `Bars start at the median of the ${rows.length} qualifying players (${lf(lmed)}) · top 15 by ${ml}` });
  }
  ['lb-pos', 'lb-metric', 'lb-min', 'lb-conf', 'lb-q', 'lb-n'].forEach(id => document.getElementById(id).addEventListener('input', render));
  render();
})();

/* ---------- team ratings (40–99, from D.ratings; other seasons carry a slim copy) ---------- */
const RTG = D.ratings || null;
const RT_COMPS = [['attack', 'Attacking'], ['serve', 'Serving'], ['pass', 'Passing'], ['setting', 'Setting'], ['block', 'Blocking'], ['dig', 'Digging']];
const rtRows = sn => sn === CUR ? (RTG ? RTG.table : []) : ((OTHERS[sn] || {}).ratings || []);
const rtOf = (team, sn = CUR) => rtRows(sn).find(r => r.team === team) || null;
const rtTier = v => v == null ? '' : v >= 95 ? 'rt-t99' : v >= 85 ? 'rt-t90' : v >= 75 ? 'rt-t80' : v >= 65 ? 'rt-t70' : v >= 55 ? 'rt-t60' : 'rt-t50';
const rtNum = v => v == null ? '—' : `<span class="${rtTier(v)}">${v}</span>`;
const RT_PW = (RTG && RTG.prev_week) || null;   // ratings were also computed as of this Sunday
const rtWk = (prev, cur) => { if (!RT_PW || cur == null || prev == null) return ''; const d = cur - prev; const t = ` title="vs ${fmt.date(RT_PW)}: ${prev}"`; return d > 0 ? `<span class="mv up"${t}>▲${d}</span>` : d < 0 ? `<span class="mv dn"${t}>▼${-d}</span>` : `<span class="mv same"${t}>–</span>`; };
const hexA = (c, a) => { const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) return c; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function rtRadar(id, sets) {   // sets: [{ label, data: [5 ratings], color }]
  mk(id, { type: 'radar', data: { labels: RT_COMPS.map(c => c[1]), datasets: sets.map(s => ({ label: s.label, data: s.data, borderColor: s.color, backgroundColor: hexA(s.color, .18), pointBackgroundColor: s.color, pointBorderColor: s.color, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5 })) },
    options: { responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: sets.length > 1, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: css('--ink-2') } }, tooltip: { backgroundColor: css('--ink'), titleColor: css('--page'), bodyColor: css('--page'), padding: 8, cornerRadius: 4, callbacks: { label: c => `${c.dataset.label}: ${c.raw ?? '—'}` } } },
      scales: { r: { min: 40, max: 100, ticks: { stepSize: 20, display: false }, grid: { color: css('--grid') }, angleLines: { color: css('--grid') }, pointLabels: { color: css('--ink-2'), font: { size: 11.5 } } } } } });
}
const rtCompMetrics = comp => (RTG && RTG.metrics ? RTG.metrics : []).filter(m => m.comp === comp);
const rtRawFmt = (comp, key, v) => v == null ? '—' : key === 'prate' ? fmt.n2(v) : /pct|ace|serr|rerr|stuff|create|xdk|xfb|sterr|lowblk|gpass|gbt|^ko$/.test(key) ? fmt.pct(v) : fmt.eff(v);

/* ================= TEAM (any team; default Texas A&M, or the #1 power team on the public site) ================= */
const teamPanel = (function () {
  const sel = document.getElementById('tm-sel');
  sel.innerHTML = teams.filter(t => t.conf !== 'Non-D1' && D.detail[t.team]).sort((a, b) => short(a.team).localeCompare(short(b.team))).map(t => `<option value="${t.team.replace(/"/g, '&quot;')}">${short(t.team)}</option>`).join('');
  let cur = AM; try { const s = localStorage.getItem('m26team'); if (s && D.detail[s]) cur = s; } catch (e) {}
  sel.value = cur;
  const natEff = D.players.filter(p => p.att >= 60).sort((a, b) => b.att_eff - a.att_eff); const effRank = {}; natEff.forEach((p, i) => effRank[p.team + p.player] = i + 1);
  const line = (c, data, w) => ({ data, borderColor: c, backgroundColor: c, borderWidth: w || 2, pointRadius: data.length > 24 ? 2.5 : 4, pointHoverRadius: 7, tension: .25 });
  let T, det, tm, nm, ranks;
  const isAM = () => cur === HL;
  const accent = () => isAM() ? css('--maroon-ink') : css('--s2');
  const rkText = k => ranks.nat[k] ? `<b>#${ranks.nat[k]}</b> nat · #${ranks.conf[k] || '—'} ${T.conf}${ranks.top[k] ? ` · #${ranks.top[k]} Top 15` : ''}` : '—';
  function load() {
    T = teams.find(t => t.team === cur); det = D.detail[cur]; tm = det.matches; nm = short(cur);
    rankPool(teams); const nat = Object.fromEntries(RANKED.map(([k]) => [k, T['rk_' + k]]));
    rankPool(teams.filter(t => t.conf === T.conf)); const conf = Object.fromEntries(RANKED.map(([k]) => [k, T['rk_' + k]]));
    rankPool(teams.filter(t => inGroup(t, 'Top 15'))); const top = Object.fromEntries(RANKED.map(([k]) => [k, inGroup(T, 'Top 15') ? T['rk_' + k] : null])); rankPool(teams);
    ranks = { nat, conf, top };
    document.querySelectorAll('.tm-name').forEach(e => e.textContent = nm);
    document.getElementById('tm-tab').textContent = PUB ? 'Teams' : nm;
    document.getElementById('tm-logo').innerHTML = (window.__LOGOS__ || {})[cur] ? `<img src="${window.__LOGOS__[cur]}" alt="" style="width:36px;height:36px;object-fit:contain;vertical-align:middle">` : '';
    ['tm-leg-so', 'tm-leg-eff', 'tm-leg-xfs', 'tm-leg-gp'].forEach(id => document.getElementById(id).style.setProperty('--c', accent())); document.getElementById('tm-leg-rot').style.setProperty('--c', accent());
  }
  function staticParts() {
    const prev = Object.keys(OTHERS).sort().reverse().map(sn => ({ sn, t: ((OTHERS[sn] || {}).teams || []).find(x => x.team === cur) })).filter(x => x.t);
    const pv = (k, f, rk) => prev.length ? prev.map(({ sn, t }) => `<br><span class="prev">${sn}: ${f(t[k])}${rk && t['rk_' + k] ? ` · #${t['rk_' + k]}` : ''}</span>`).join('') : '';
    kpi('tm-kpis', [
      { l: 'Record', v: `${T.wins}–${T.losses}`, d: `${T.conf} · sets ${T.sets_won}–${T.sets - T.sets_won}` + (prev.length ? prev.map(({ sn, t }) => `<br><span class="prev">${sn}: ${t.wins}–${t.losses}</span>`).join('') : ''), am: true },
      { l: 'Sideout %', v: fmt.pct(T.so_pct), d: rkText('so_pct') + pv('so_pct', fmt.pct, true) },
      { l: 'Point-scoring %', v: fmt.pct(T.ps_pct), d: rkText('ps_pct') + pv('ps_pct', fmt.pct, true) },
      { l: 'Kill %', v: fmt.pct(T.kill_pct), d: rkText('kill_pct') + ` · eff ${fmt.eff(T.att_eff)}` + pv('kill_pct', fmt.pct, true) },
      { l: 'Opp kill %', v: fmt.pct(T.opp_kill_pct), d: (T.opp_kill_pct == null ? 'run the force update' : rkText('opp_kill_pct') + ' · lower is better') + ` · opp eff ${fmt.eff(T.opp_att_eff)}` + pv('opp_kill_pct', fmt.pct, true) },
      { l: 'Serve KO %', v: fmt.pct(T.ko_pct), d: rkText('ko_pct') + ` · ace ${fmt.pct(T.ace_pct)} · error ${fmt.pct(T.serve_err_pct)}` + pv('ko_pct', fmt.pct, true) },
      { l: 'Good pass %', v: fmt.pct(T.good_pass_pct), d: rkText('good_pass_pct') + ` · pass rating ${fmt.n2(T.pass_rating)}` + pv('good_pass_pct', fmt.pct, true) },
    ]);
    ratingsCard(prev);
    profile();
    document.getElementById('tm-phase').innerHTML = det.phase.map(p => `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line)"><div><div style="font-weight:500">${p.phase}</div><div class="note">${p.att} attempts · kill ${fmt.pct(p.kill_pct)}</div></div><div style="font-size:24px;font-weight:600;font-family:'IBM Plex Sans Condensed'">${fmt.eff(p.att_eff)}</div></div>`).join('') +
      `<p class="note">Reception = first-ball attack after serve receive; Transition = everything after.</p>`;
    table('t-tm-matches', tm, [
      { key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'opponent', label: 'Opponent', left: true, asc: true, fmt: v => `${short(v)} <span class="rk">${(teams.find(t => t.team === v) || {}).conf || ''}</span>` }, { key: 'home', label: 'Site', left: true, fmt: v => v ? 'Home' : 'Away' },
      { key: 'result', label: 'Result', fmt: (v, r) => `<span class="pill ${v}">${v}</span> ${r.sets_for}–${r.sets_against}` }, { key: 'scores', label: 'Set scores', left: true },
      { key: 'so_pct', label: 'SO %', fmt: fmt.pct }, { key: 'opp_so_pct', label: 'Opp SO %', fmt: fmt.pct }, { key: 'ps_pct', label: 'PS %', fmt: fmt.pct }, { key: 'ko_pct', label: 'KO %', fmt: fmt.pct },
      { key: 'att_eff', label: 'Att eff', fmt: fmt.eff }, { key: 'opp_att_eff', label: 'Opp eff', fmt: fmt.eff }, { key: 'kills', label: 'K' }, { key: 'att_err', label: 'E' }, { key: 'blocked', label: 'Blk\'d' },
      { key: 'aces', label: 'Aces' }, { key: 'serve_err', label: 'SE' }, { key: 'blocks', label: 'Blocks' }, { key: 'digs', label: 'Digs' }, { key: 'good_pass_pct', label: 'Good pass', fmt: fmt.pct }, { key: 'pass_rating', label: 'Pass', fmt: fmt.n2 }
    ], { sort: 'date', asc: true });
    // remaining schedule (NCAA schedule, simulated with the power ratings at build time)
    (() => {
      const rem = (D.rpi && D.rpi.futures && D.rpi.futures.remaining) || [], card = document.getElementById('tm-rem-card');
      const rpiRk = Object.fromEntries(((D.rpi && D.rpi.table) || []).map(r => [r.team, r.rank_adj])), pwRk = Object.fromEntries(((D.power && D.power.table) || []).map(r => [r.team, r.rank]));
      const g = rem.filter(m => m.home === cur || m.away === cur).map(m => { const home = m.home === cur, opp = home ? m.away : m.home, oc = (teams.find(t => t.team === opp) || {}).conf || '';
        return { date: m.date, opp, oc, site: home ? 'Home' : 'Away', conf_game: oc && oc === T.conf, p: home ? m.p_home : 1 - m.p_home, rpi: rpiRk[opp] || null, pw: pwRk[opp] || null }; });
      if (!rem.length) { card.hidden = true; return; } card.hidden = false;
      const ew = g.reduce((a, x) => a + x.p, 0), vs = n => g.filter(x => x.rpi && x.rpi <= n).length;
      document.getElementById('tm-rem-sum').innerHTML = g.length ? `<b>${g.length}</b> matches left · expected <b>${ew.toFixed(1)}–${(g.length - ew).toFixed(1)}</b> · ${g.filter(x => x.conf_game).length} conference · ${vs(25)} vs RPI top 25 · ${vs(50)} vs top 50` : 'No remaining matches on the NCAA schedule.';
      table('t-tm-rem', g, [
        { key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'opp', label: 'Opponent', left: true, asc: true, fmt: (v, r) => `${(window.__LOGOS__ || {})[v] ? `<img src="${window.__LOGOS__[v]}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:-4px;margin-right:6px">` : ''}${short(v)} <span class="rk">${r.oc}</span>${r.conf_game ? '' : ' <span class="pos">NC</span>'}` }, { key: 'site', label: 'Site', left: true },
        { key: 'rpi', label: 'Opp RPI #', asc: true, fmt: v => v ? '#' + v : '—' }, { key: 'pw', label: 'Opp power #', asc: true, fmt: v => v ? '#' + v : '—' },
        { key: 'p', label: 'Win prob', fmt: v => `<span class="bar" style="width:${Math.round(v * 60)}px;background:${v >= .5 ? 'var(--good)' : 'var(--crit)'}"></span>${Math.round(v * 100)}%` }
      ], { sort: 'date', asc: true });
    })();
    const roster = D.players.filter(p => p.team === cur).map(p => ({ ...p, effrk: effRank[p.team + p.player] || null }));
    table('t-tm-roster', roster, [
      { key: 'number', label: '#', fmt: v => v }, { key: 'player', label: 'Player', left: true, asc: true, fmt: (v, r) => `${v} <span class="pos">${r.pos_guess}</span>` }, { key: 'sets', label: 'Sets' },
      { key: 'att', label: 'Att' }, { key: 'kills', label: 'K' }, { key: 'kills_per_set', label: 'K/set', fmt: fmt.n2 }, { key: 'att_eff', label: 'Eff', fmt: fmt.eff }, { key: 'effrk', label: 'Nat rk', fmt: v => v ? '#' + v : '—' },
      { key: 'serves', label: 'Srv' }, { key: 'aces', label: 'Aces' }, { key: 'serve_err', label: 'SE' }, { key: 'recs', label: 'Recs' }, { key: 'rec_err', label: 'RE' },
      { key: 'blocks', label: 'Blk' }, { key: 'digs', label: 'Digs' }, { key: 'pass_rating', label: 'Pass', fmt: fmt.n2 }
    ], { sort: 'kills' });
    const ids = tm.map(m => m.match_id); const names = [...new Set(det.pm.map(r => r.player))];
    const rows = names.map(n => { const o = { player: n, total: 0 }; ids.forEach((id, i) => { const r = det.pm.find(x => x.match_id === id && x.player === n); o['m' + i] = r ? r.att : null; o['r' + i] = r; if (r) o.total += r.att; }); return o; });
    table('t-tm-pm', rows, [{ key: 'player', label: 'Player', left: true, asc: true }, { key: 'total', label: 'Att' }, ...ids.map((id, i) => ({ key: 'm' + i, label: `${fmt.date(tm[i].date)} ${short(tm[i].opponent).slice(0, 10)}`, fmt: (v, r) => { const x = r['r' + i]; return x ? `${x.kills}/${x.att} <span class="rk">${fmt.eff(x.att_eff)}</span>` : '<span style="color:var(--ink-3)">—</span>'; } }))], { sort: 'total' });
    renderCombos(true);
    renderSetters(true);
    const cls = r => r.who === nm ? 'am' : '';
    if (det.sc) {
      table('t-tm-sc', [flatSc({ who: nm, ord: 0 }, 'sc_', det.sc.team), flatSc({ who: 'Opponents', ord: 1 }, 'sc_', det.sc.opp)], [{ key: 'ord', label: '', left: true, fmt: (v, r) => `<b>${r.who}</b>` }, ...scCols('sc_')], { sort: 'ord', asc: true, rowClass: cls });
      const pm = []; tm.forEach(m => { if (!m.sc) return; pm.push(flatSc({ date: m.date, who: nm, opp: m.opponent, key: m.date + 'a' }, 'sc_', m.sc)); pm.push(flatSc({ date: m.date, who: short(m.opponent), opp: m.opponent, key: m.date + 'b' }, 'sc_', m.sc_opp)); });
      table('t-tm-sc-pm', pm, [{ key: 'key', label: 'Date', left: true, asc: true, fmt: (v, r) => r.who === nm ? fmt.date(r.date) : '' }, { key: 'who', label: 'Team', left: true, fmt: v => v }, ...scCols('sc_')], { sort: 'key', asc: true, rowClass: cls });
    }
  }
  // percentile bars: where the team sits among D1 teams (3+ matches) on each box-score rate; lower-is-better stats are flipped so a longer bar is always better
  const PROF = [['so_pct', 'Sideout %', fmt.pct], ['ps_pct', 'Point-scoring %', fmt.pct], ['att_eff', 'Attack efficiency', fmt.eff], ['kill_pct', 'Kill %', fmt.pct], ['kills_per_set', 'Kills / set', fmt.n2],
    ['opp_att_eff', 'Opp attack efficiency', fmt.eff, true], ['blocks_per_set', 'Blocks / set', fmt.n2], ['digs_per_set', 'Digs / set', fmt.n2],
    ['ko_pct', 'Serve knockout %', fmt.pct], ['ace_pct', 'Ace %', fmt.pct], ['serve_err_pct', 'Serve error %', fmt.pct, true],
    ['good_pass_pct', 'Good pass %', fmt.pct], ['rec_err_pct', 'Reception error %', fmt.pct, true], ['pass_rating', 'Pass rating', fmt.n2]];
  let profVs = 'd1'; try { profVs = localStorage.getItem('m26profvs') || 'd1'; } catch (e) {}
  document.getElementById('tm-prof-vs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; profVs = b.dataset.v; try { localStorage.setItem('m26profvs', profVs); } catch (e) {} profile(); });
  function profile() {
    const d1 = teams.filter(t => t.conf !== 'Non-D1' && t.matches >= 3), cpool = d1.filter(t => t.conf === T.conf);
    const useConf = profVs === 'conf' && cpool.length >= 3, pool = useConf ? cpool : d1, who = useConf ? `the ${T.conf}` : 'D1';
    document.querySelectorAll('#tm-prof-vs button').forEach(b => { b.classList.toggle('on', b.dataset.v === (useConf ? 'conf' : 'd1')); if (b.dataset.v === 'conf') { b.textContent = `vs ${T.conf}`; b.disabled = cpool.length < 3; } });
    document.getElementById('tm-prof-vs-lab').textContent = useConf ? T.conf : 'D1';
    const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
    const items = PROF.filter(([k]) => T[k] != null).map(([k, lab, f, low]) => {
      const vals = pool.map(t => t[k]).filter(v => v != null), v = T[k], dvals = d1.map(t => t[k]).filter(x => x != null);
      const better = vals.filter(x => low ? x > v : x < v).length, ties = vals.filter(x => x === v).length - 1;
      const pct = Math.round((better + ties / 2) / Math.max(1, vals.length - 1) * 100);
      const rank = dvals.filter(x => low ? x < v : x > v).length + 1, crank = cpool.filter(t => t[k] != null && (low ? t[k] < v : t[k] > v)).length + 1;
      return { label: lab, sub: useConf ? `#${crank} of ${cpool.length}` : ord(pct), value: pct, text: f(v), tip: `${lab} ${f(v)} · #${rank} of ${dvals.length} D1 · #${crank} of ${cpool.length} in the ${T.conf} · ${ord(pct)} percentile in ${who} · ${who} median ${f(median(vals))}${low ? ' · lower is better' : ''}` };
    });
    hbars('tm-prof', items, { lo: 0, hi: 100, ref: 50, color: accent() });
    document.getElementById('tm-prof-sub').textContent = useConf
      ? `season · percentile among ${cpool.length} ${T.conf} teams with 3+ matches · dashed line = ${T.conf} median · longer bar is better (error and opponent stats are flipped) · hover for D1 rank`
      : `season · percentile among ${d1.length} D1 teams with 3+ matches · dashed line = D1 median · longer bar is better (error and opponent stats are flipped) · hover for rank`;
  }
  const LGC = (D.league && Array.isArray(D.league.combos)) ? Object.fromEntries(D.league.combos.map(c => [c.combo, c])) : {};
  const dEff = (combo, k) => { const c = LGC[combo]; return c && c[k] != null ? `<span class="rk">D1 ${fmt.eff(c[k])}</span>` : ''; };
  function renderCombos(refill) {
    const rows = Array.isArray(det.combos) ? det.combos : [];
    const psel = document.getElementById('tm-cb-player');
    if (refill) { const keep = psel.value; psel.innerHTML = '<option value="">All players</option>' + [...new Set(rows.map(r => r.player))].sort().map(p => `<option value="${p.replace(/"/g, '&quot;')}">${p}</option>`).join(''); psel.value = rows.some(r => r.player === keep) ? keep : ''; }
    const mn = +document.getElementById('tm-cb-min').value || 1, ph = document.getElementById('tm-cb-phase').value, who = psel.value;
    const pre = cbPre(ph), lk = cbEffKey(pre);
    const data = rows.filter(r => (!who || r.player === who) && (pre ? r[pre + 'att'] : r.att) >= mn).map(r => cbProj(r, pre));
    document.getElementById('tm-cb-count').textContent = `${data.length} rows`;
    table('t-tm-combos', data, [
      { key: 'player', label: 'Player', left: true, asc: true }, { key: 'combo', label: 'Combo', left: true, asc: true, fmt: (v) => `<b>${cbName(v)}</b> ${dEff(v, lk)}` },
      { key: 'att', label: 'Att' }, { key: 'kills', label: 'K' }, { key: 'err', label: 'E' }, { key: 'blocked', label: 'Blk\'d' }, { key: 'kill_pct', label: 'K%', fmt: fmt.pct }, { key: 'eff', label: 'Eff', fmt: fmt.eff },
      ...cbSplitCols
    ], { sort: 'att' });
    const mixCols = [{ key: 'combo', label: 'Combo', left: true, asc: true, fmt: v => `<b>${cbName(v)}</b> ${dEff(v, 'eff')}` }, { key: 'att', label: 'Att' }, { key: 'share', label: 'Share', fmt: fmt.pct }, { key: 'eff', label: 'Eff', fmt: fmt.eff }, { key: 'kill_pct', label: 'K%', fmt: fmt.pct },
      { key: 'fb_share', label: 'FBSO share', fmt: fmt.pct }, { key: 'fb_eff', label: 'FBSO eff', fmt: fmt.eff },
      { key: 'is_share', label: 'InSys share', fmt: fmt.pct, title: 'Share of FBSO-in-system swings (R# / R+)' }, { key: 'is_eff', label: 'InSys eff', fmt: fmt.eff, title: 'FBSO swings off a good pass (R# / R+)' },
      { key: 'md_share', label: 'Med share', fmt: fmt.pct, title: 'Share of FBSO-medium swings (R!)' }, { key: 'md_eff', label: 'Med eff', fmt: fmt.eff, title: 'FBSO swings off a medium pass (R!)' },
      { key: 'os_share', label: 'OoS share', fmt: fmt.pct, title: 'Share of FBSO-out-of-system swings (R-)' }, { key: 'os_eff', label: 'OoS eff', fmt: fmt.eff, title: 'FBSO swings off a poor pass (R-)' },
      { key: 'tr_share', label: 'Tr share', fmt: fmt.pct }, { key: 'tr_eff', label: 'Tr eff', fmt: fmt.eff }];
    table('t-tm-mix', (Array.isArray(det.team_combos) ? det.team_combos : []).filter(r => r.att >= 5), mixCols, { sort: 'att' });
    table('t-tm-mix-opp', (Array.isArray(det.opp_combos) ? det.opp_combos : []).filter(r => r.att >= 5), mixCols, { sort: 'att' });
  }
  ['tm-cb-player', 'tm-cb-min', 'tm-cb-phase'].forEach(id => document.getElementById(id).addEventListener('input', () => renderCombos(false)));
  function renderSetters(refill) {
    const card = document.getElementById('t-tm-setters').closest('.card'); const st = Array.isArray(det.setters) ? det.setters : [];
    if (!st.length) { card.hidden = true; return; } card.hidden = false;
    const ssel = document.getElementById('tm-st-setter');
    if (refill) { const keep = ssel.value; ssel.innerHTML = st.map(r => `<option value="${r.setter.replace(/"/g, '&quot;')}">${r.setter} (${r.sets} sets)</option>`).join(''); ssel.value = st.some(r => r.setter === keep) ? keep : st[0].setter; }
    const who = ssel.value;
    table('t-tm-setters', st, [
      { key: 'setter', label: 'Setter', left: true, asc: true, fmt: v => v === who ? `<b>${v}</b>` : v }, { key: 'sets', label: 'Set att' }, { key: 'assists', label: 'Assists' }, { key: 'assist_pct', label: 'Assist %', fmt: fmt.pct }, { key: 'set_err_pct', label: 'Set err %', asc: true, fmt: fmt.pct },
      { key: 'att', label: 'Swings' }, { key: 'eff', label: 'Eff', fmt: fmt.eff, title: 'Hitting efficiency off this setter' }, { key: 'kill_pct', label: 'K%', fmt: fmt.pct, title: 'Kill % off this setter' }, { key: 'lowblk', label: '0–1 blk', fmt: fmt.pct, title: 'Share of attacks off this setter that met no block, one blocker or a seam' },
      ...cbSplitCols
    ], { sort: 'sets', rowClass: r => r.setter === who ? 'am' : '', onClick: id => { ssel.value = id; renderSetters(false); }, idKey: 'setter' });
    const mn = +document.getElementById('tm-st-min').value || 1, pre = cbPre(document.getElementById('tm-st-phase').value), lk = cbEffKey(pre);
    const rows = (Array.isArray(det.setter_combos) ? det.setter_combos : []).filter(r => r.setter === who && (pre ? r[pre + 'att'] : r.att) >= mn).map(r => cbProj(r, pre));
    document.getElementById('tm-st-count').textContent = `${rows.length} combos`;
    table('t-tm-st-combos', rows, [
      { key: 'combo', label: 'Combo', left: true, asc: true, fmt: v => `<b>${cbName(v)}</b> ${dEff(v, lk)}` },
      { key: 'att', label: 'Att' }, { key: 'kills', label: 'K' }, { key: 'err', label: 'E' }, { key: 'blocked', label: 'Blk\'d' }, { key: 'kill_pct', label: 'K%', fmt: fmt.pct }, { key: 'eff', label: 'Eff', fmt: fmt.eff }, { key: 'lowblk', label: '0–1 blk', fmt: fmt.pct, title: 'Share of these attacks that met no block, one blocker or a seam' },
      ...cbSplitCols
    ], { sort: 'att' });
  }
  document.getElementById('tm-st-setter').addEventListener('change', () => renderSetters(false));
  ['tm-st-min', 'tm-st-phase'].forEach(id => document.getElementById(id).addEventListener('input', () => renderSetters(false)));
  function ratingsCard(prev) {
    const card = document.getElementById('tm-rt-card'); const R = rtOf(cur); if (!RTG || !R) { card.hidden = true; return; } card.hidden = false;
    if (RT_PW) document.getElementById('tm-rt-sub').textContent = `40–99 · 70 = D1 average · ▲▼ vs ${fmt.date(RT_PW)}`;
    const pool = RTG.table.filter(r => r.rank);
    const prevR = prev.map(({ sn }) => ({ sn, r: rtOf(cur, sn) })).filter(x => x.r);
    const pv = k => prevR.length ? prevR.map(({ sn, r }) => `<span class="prev">${sn}: ${r[k] ?? '—'}${k === 'overall' && r.rank ? ` (#${r.rank})` : ''}</span>`).join(' · ') : '';
    const compRank = k => R[k] == null ? '' : `#${pool.filter(r => r[k] > R[k]).length + 1} of ${pool.length}`;
    document.getElementById('tm-rt-tiles').innerHTML =
      `<div class="rt-tile ovr"><div class="l">Overall</div><div class="v"><span class="${rtTier(R.overall)}">${R.overall ?? '—'}</span>${rtWk(R.overall_pw, R.overall)}</div><div class="d">${R.rank ? `<b>#${R.rank}</b> of ${pool.length} D1 teams` : `needs ${RTG.min_matches} matches`}${R.power_rank ? ` · Power <b>#${R.power_rank}</b>${R.rank ? (R.power_rank < R.rank - 5 ? ' <span title="wins more points than the skills profile explains">↑ outperforming</span>' : R.power_rank > R.rank + 5 ? ' <span title="wins fewer points than the skills profile explains">↓ underperforming</span>' : '') : ''}` : ''}${prevR.length ? ' · ' + pv('overall') : ''}</div></div>` +
      RT_COMPS.map(([k, l]) => `<div class="rt-tile"><div class="l">${l}</div><div class="v"><span class="${rtTier(R[k])}">${R[k] ?? '—'}</span>${rtWk(R[k + '_pw'], R[k])}</div><div class="d">${compRank(k)}${prevR.length ? '<br>' + pv(k) : ''}</div></div>`).join('');
    document.getElementById('tm-rt-detail').innerHTML = RT_COMPS.map(([k, l]) => `<div><h4><span>${l}</span><span>${rtNum(R[k])}</span></h4>` +
      rtCompMetrics(k).map(m => { const key = `${k}_${m.key}`; return `<div class="m"><span class="n">${m.label.replace(/\s*\((?!S\))[^)]*\)/g, '').replace(/\s+—.*$/, '')}</span><span><span class="raw">${rtRawFmt(k, m.key, R[key + '_raw'])}${R[key + '_n'] != null ? ` · n ${Number(R[key + '_n']).toLocaleString()}` : ''}</span><span class="r ${rtTier(R[key])}">${R[key] ?? '—'}</span></span></div>`; }).join('') + '</div>').join('');
    document.getElementById('tm-rt-note').innerHTML = `Grey = raw season value · n = attempts · Overall = ${RT_COMPS.map(([k, l]) => `${l.toLowerCase()} ${Math.round((RTG.weights[k] || 0) * 100)}`).join(' · ')} · <a href="#" class="gl-link" data-gl="ratings">Glossary →</a>`;
  }
  const rtAvg = rows => rows.length ? RT_COMPS.map(([k]) => { const v = rows.map(r => r[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; }) : null;
  function radarPart() {
    const R = rtOf(cur); if (!R) return;
    const pick = document.getElementById('tm-rt-cmp');
    const prevSeasons = Object.keys(OTHERS).sort().reverse().filter(sn => rtOf(cur, sn));
    const want = [...pick.options].map(o => o.value); prevSeasons.forEach(sn => { if (!want.includes('s:' + sn)) pick.add(new Option(`${nm} ${sn}`, 's:' + sn)); });
    [...pick.options].forEach(o => { if (o.value.startsWith('s:')) { const sn = o.value.slice(2); o.textContent = `${nm} ${sn}`; o.hidden = !prevSeasons.includes(sn); } });
    if (pick.selectedOptions[0]?.hidden) pick.value = 'conf';
    pick.options[0].textContent = `${T.conf} average`;
    const ranked = (RTG ? RTG.table : []).filter(r => r.rank);
    let cmp = null;
    if (pick.value === 'conf') cmp = { label: `${T.conf} avg`, data: rtAvg(ranked.filter(r => r.conf === T.conf)) };
    else if (pick.value.startsWith('s:')) { const sn = pick.value.slice(2), r = rtOf(cur, sn); cmp = { label: `${nm} ${sn}`, data: RT_COMPS.map(([k]) => r[k]) }; }
    else cmp = { label: `${pick.value} avg`, data: rtAvg(ranked.filter(r => inGroup({ team: r.team, conf: r.conf }, pick.value))) };
    rtRadar('c-tm-radar', [{ label: `${nm} ${CUR}`, data: RT_COMPS.map(([k]) => R[k]), color: accent() }, ...(cmp && cmp.data ? [{ label: cmp.label, data: cmp.data, color: css('--ink-3') }] : [])]);
  }
  document.getElementById('tm-rt-cmp').addEventListener('change', radarPart);
  function chartsPart() {
    radarPart();
    const winSel = document.getElementById('tm-win'); const n = winSel ? +winSel.value : 0;
    const tmAll = det.matches; const tm = n ? tmAll.slice(-n) : tmAll;
    const mlabels = tm.map(m => fmt.date(m.date)), ac = accent();
    const mtitle = i => { const m = tm[i[0].dataIndex]; return `${fmt.date(m.date)} ${m.home ? 'vs' : 'at'} ${short(m.opponent)} (${m.result} ${m.sets_for}–${m.sets_against})`; };
    const dash = (c, data) => ({ ...line(c, data, 1.5), borderDash: [5, 4], pointRadius: 3, pointStyle: 'rectRot' });
    const scv = (m, k, opp) => { const s = opp ? m.sc_opp : m.sc; return s && s[k] != null ? s[k] * 100 : null; };
    mk('c-tm-so', { type: 'line', data: { labels: mlabels, datasets: [line(ac, tm.map(m => m.so_pct * 100), 2.5), line(css('--s1'), tm.map(m => m.opp_so_pct * 100)), dash(css('--s4'), tm.map(m => scv(m, 'xfbso'))), dash(css('--s3'), tm.map(m => scv(m, 'xfbso', true)))] },
      options: baseOpts({ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: mtitle, label: c => `${c.datasetIndex % 2 ? 'Opponent' : nm} ${c.datasetIndex > 1 ? 'xFBSO' : 'SO'} ${c.parsed.y == null ? '—' : c.parsed.y.toFixed(1) + '%'}` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: tm.length > 16, maxTicksLimit: 16 } }, y: { suggestedMin: 35, suggestedMax: 80, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => v + '%' } } } }) });
    mk('c-tm-xfs', { type: 'line', data: { labels: mlabels, datasets: [line(ac, tm.map(m => scv(m, 'srv_xfb')), 2.5), line(css('--s1'), tm.map(m => scv(m, 'srv_xfb', true)))] },
      options: baseOpts({ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: mtitle, label: c => `${c.datasetIndex ? 'Opponent' : nm} xFBSO (S) ${c.parsed.y == null ? '—' : c.parsed.y.toFixed(1) + '%'} · lower = tougher serve` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: tm.length > 16, maxTicksLimit: 16 } }, y: { suggestedMin: 35, suggestedMax: 55, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => v + '%' } } } }) });
    mk('c-tm-eff', { type: 'line', data: { labels: mlabels, datasets: [line(ac, tm.map(m => m.att_eff), 2.5), line(css('--s1'), tm.map(m => m.opp_att_eff))] },
      options: baseOpts({ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: mtitle, label: c => `${c.datasetIndex ? 'Opponent' : nm} ${fmt.eff(c.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: tm.length > 16, maxTicksLimit: 16 } }, y: { suggestedMin: 0, suggestedMax: .45, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => fmt.eff(v) } } } }) });
    // good pass % by match: team vs opponent (opponent's own reception from its scout rows for the same match) and the D1 average
    const oppRow = m => ((D.detail[m.opponent] || {}).matches || []).find(x => x.match_id === m.match_id) || null;
    const gpD1 = (() => { let g = 0, n = 0; teams.forEach(t => { if (t.conf !== 'Non-D1' && t.recs && t.good_pass_pct != null) { g += t.good_pass_pct * t.recs; n += t.recs; } }); return n ? g / n * 100 : null; })();
    document.getElementById('tm-gp-avg').textContent = gpD1 == null ? 'D1 average' : `D1 average (${gpD1.toFixed(1)}%)`;
    mk('c-tm-gp', { type: 'line', data: { labels: mlabels, datasets: [line(ac, tm.map(m => m.good_pass_pct == null ? null : m.good_pass_pct * 100), 2.5), line(css('--s1'), tm.map(m => { const o = oppRow(m); return o && o.good_pass_pct != null ? o.good_pass_pct * 100 : null; })),
      { data: tm.map(() => gpD1), borderColor: css('--ink-3'), borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 0 }] },
      options: baseOpts({ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { filter: c => c.datasetIndex < 2, callbacks: { title: mtitle, label: c => { const m = tm[c.dataIndex], o = oppRow(m); return c.datasetIndex ? `Opponent ${c.parsed.y == null ? '—' : c.parsed.y.toFixed(1) + '%'}${o && o.recs ? ` (${o.recs} recs)` : ''}` : `${nm} ${c.parsed.y == null ? '—' : c.parsed.y.toFixed(1) + '%'} (${m.recs} recs · pass ${fmt.n2(m.pass_rating)})`; } } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: tm.length > 16, maxTicksLimit: 16 } }, y: { suggestedMin: 30, suggestedMax: 70, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => v + '%' } } } }) });
    const rot = det.rot;
    mk('c-tm-rot', { type: 'bar', data: { labels: rot.map(r => 'R' + r.rotation), datasets: [
      { data: rot.map(r => r.so_pct * 100), backgroundColor: ac, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' },
      { data: rot.map(r => r.ps_pct * 100), backgroundColor: css('--s1'), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' }] },
      options: baseOpts({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const r = rot[c.dataIndex]; return c.datasetIndex ? `PS ${c.parsed.y.toFixed(1)}% (${r.srv_pts} serve pts)` : `SO ${c.parsed.y.toFixed(1)}% (${r.rec_pts} rec pts) · att eff ${fmt.eff(r.att_eff)}`; } } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 80, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => v + '%' } } } }) });
    const zones = det.zone.filter(z => z.att >= 10);
    mk('c-tm-zone', { type: 'bar', data: { labels: zones.map(z => 'Zone ' + z.zone), datasets: [{ data: zones.map(z => z.att_eff), backgroundColor: ac, borderRadius: 4, borderSkipped: 'left' }] },
      options: baseOpts({ indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `eff ${fmt.eff(c.parsed.x)} on ${zones[c.dataIndex].att} attempts` } } }, scales: { x: { beginAtZero: true, suggestedMax: Math.max(0.1, ...zones.map(z => z.att_eff)) * 1.3, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => fmt.eff(v) } }, y: { grid: { display: false } } } }),
      plugins: [{ id: 'lbl', afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.fillStyle = css('--ink-2'); ctx.font = '11px "IBM Plex Sans"'; ctx.textBaseline = 'middle'; ch.getDatasetMeta(0).data.forEach((b, i) => ctx.fillText(zones[i].att + ' att', b.x + 6, b.y)); ctx.restore(); } }] });
  }
  function show(team) { cur = team; try { localStorage.setItem('m26team', cur); } catch (e) {} load(); staticParts(); chartsPart(); drawSetDist(cur); }
  sel.addEventListener('change', () => show(sel.value));
  document.getElementById('tm-win')?.addEventListener('change', () => { load(); chartsPart(); });
  load(); staticParts();
  rebuild.push(() => { load(); chartsPart(); drawSetDist(cur); });   // first draw at startup (and on theme change), not only when the team changes
  return { show };
})();


/* ---------- expandable chart cards ---------- */
document.querySelectorAll('.card').forEach(card => {
  if (!card.querySelector('.chart')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'expand'; b.title = 'Expand'; b.setAttribute('aria-label', 'Expand chart'); b.textContent = '⤢';
  card.style.position = 'relative'; card.appendChild(b);
  b.addEventListener('click', () => { const on = card.classList.toggle('wide'); b.textContent = on ? '⤡' : '⤢'; b.title = on ? 'Collapse' : 'Expand'; requestAnimationFrame(() => Object.values(charts).forEach(c => c.resize())); });
});

/* ---------- pop-out table cards (full screen; Esc or the button closes) ---------- */
document.querySelectorAll('.card').forEach(card => {
  if (card.querySelector('.chart') || !card.querySelector('.tbl-wrap')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'expand'; b.title = 'Pop out'; b.setAttribute('aria-label', 'Pop out table'); b.textContent = '⤢';
  card.style.position = 'relative'; card.appendChild(b);
  const set = on => { card.classList.toggle('pop', on); document.body.classList.toggle('has-pop', on); b.textContent = on ? '✕' : '⤢'; b.title = on ? 'Close' : 'Pop out'; };
  b.addEventListener('click', () => set(!card.classList.contains('pop')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && card.classList.contains('pop')) set(false); });
});

/* ================= WIN PROJECTION MODEL ================= */
function gamesFromDetail(detail) { const games = []; for (const t in detail) for (const m of detail[t].matches) if (m.rec_pts && m.srv_pts) games.push({ t, o: m.opponent, so: m.so_pct, oso: m.opp_so_pct, wr: m.rec_pts, ws: m.srv_pts, home: m.home ? 1 : m.home === false ? -1 : 0 }); return games; }
function buildModel(games) {
  // Opponent-adjusted sideout ratings from every charted match (all teams, incl. non-D1 opponents that have detail).
  games = games.map(g => ({ ...g, home: typeof g.home === 'boolean' ? (g.home ? 1 : -1) : (g.home || 0) }));
  const L = games.reduce((a, g) => a + g.so * g.wr, 0) / games.reduce((a, g) => a + g.wr, 0); // league sideout rate
  const off = {}, def = {}; const names = new Set(games.map(g => g.t).concat(games.map(g => g.o)));
  names.forEach(n => { off[n] = L; def[n] = L; });
  let H = 0;
  const PRIOR = 60; // points of shrinkage toward league average (few-match teams regress)
  for (let it = 0; it < 30; it++) {
    const so = {}, sd = {}; names.forEach(n => { so[n] = [0, 0]; sd[n] = [0, 0]; });
    let hres = 0, hn = 0;
    for (const g of games) {
      const dO = def[g.o] ?? L, oO = off[g.o] ?? L;
      // team receiving: expected = off[t] + def[o] - L (+ home edge)
      so[g.t][0] += (g.so - (dO - L) - H * g.home) * g.wr; so[g.t][1] += g.wr;
      // opponent receiving vs this team: expected = off[o] + def[t] - L (- home edge for opp)
      sd[g.t][0] += (g.oso - (oO - L) + H * g.home) * g.ws; sd[g.t][1] += g.ws;
      if (g.home) { hres += (g.so - (off[g.t] + dO - L)) * g.home * g.wr + (-(g.oso - (oO + def[g.t] - L))) * g.home * g.ws; hn += g.wr + g.ws; }
    }
    names.forEach(n => { off[n] = (so[n][0] + L * PRIOR) / (so[n][1] + PRIOR); def[n] = (sd[n][0] + L * PRIOR) / (sd[n][1] + PRIOR); });
    H = hn ? Math.max(-0.05, Math.min(0.05, hres / hn)) : 0;
  }
  const clamp = p => Math.min(0.95, Math.max(0.05, p));
  // point win probabilities for A vs B; site: 1 = A home, -1 = B home, 0 neutral
  function points(A, B, site) {
    const pRec = clamp(off[A] + def[B] - L + H * site);        // A wins point when A receives
    const pSrv = clamp(1 - (off[B] + def[A] - L - H * site));  // A wins point when A serves
    return { pRec, pSrv };
  }
  const memo = new Map();
  function setWin(pSrv, pRec, target) {
    const key = pSrv.toFixed(4) + pRec.toFixed(4) + target; if (memo.has(key)) return memo.get(key);
    const CAP = target + 40; const f = {};
    const P = (a, b, srv) => { // srv: 1 = A serving
      if (a >= target && a - b >= 2) return 1; if (b >= target && b - a >= 2) return 0; if (a >= CAP || b >= CAP) return 0.5;
      const k = a * 400 + b * 2 + srv; if (k in f) return f[k];
      const p = srv ? pSrv : pRec; // if A wins the point A serves next; if B wins, B serves
      return f[k] = p * P(a + 1, b, 1) + (1 - p) * P(a, b + 1, 0);
    };
    const r = 0.5 * (P(0, 0, 1) + P(0, 0, 0)); memo.set(key, r); return r;
  }
  function outcome(pRec, pSrv) {
    const p = setWin(pSrv, pRec, 25), p5 = setWin(pSrv, pRec, 15), q = 1 - p;
    const a30 = p * p * p, a31 = 3 * p * p * p * q, a32 = 6 * p * p * q * q * p5, b30 = q * q * q, b31 = 3 * q * q * q * p, b32 = 6 * p * p * q * q * (1 - p5);
    return { pRec, pSrv, set: p, set5: p5, win: a30 + a31 + a32, dist: { '3-0': a30, '3-1': a31, '3-2': a32, '2-3': b32, '1-3': b31, '0-3': b30 } };
  }
  function match(A, B, site) { const { pRec, pSrv } = points(A, B, site); return outcome(pRec, pSrv); }
  return { off, def, L, H, match, outcome, clamp, games: games.length };
}
const MODEL = buildModel(gamesFromDetail(D.detail));
const MODELS = { [CUR]: MODEL };
const modelFor = sn => { if (!MODELS[sn]) MODELS[sn] = buildModel((OTHERS[sn] || {}).games || []); return MODELS[sn]; };
// A from season sA vs B from season sB: each team's rating comes from its own season; league means averaged.
function crossMatch(A, sA, B, sB, site) {
  if (sA === sB) return modelFor(sA).match(A, B, site);
  const MA = modelFor(sA), MB = modelFor(sB), L = (MA.L + MB.L) / 2, H = (MA.H + MB.H) / 2;
  const oA = MA.off[A] ?? MA.L, dA = MA.def[A] ?? MA.L, oB = MB.off[B] ?? MB.L, dB = MB.def[B] ?? MB.L;
  const r = MA.outcome(MA.clamp(oA + dB - L + H * site), MA.clamp(1 - (oB + dA - L - H * site)));
  return r;
}

/* ================= COMPARE ================= */
(function () {
  const selA = document.getElementById('cmp-a'), selB = document.getElementById('cmp-b'), sSA = document.getElementById('cmp-sa'), sSB = document.getElementById('cmp-sb');
  const seasonTeams = sn => sn === CUR ? teams : ((OTHERS[sn] || {}).teams || []).map(t => ({ ...t, conf: t.conf || 'Non-D1' }));
  const optsFor = sn => seasonTeams(sn).filter(t => t.conf !== 'Non-D1').sort((a, b) => short(a.team).localeCompare(short(b.team))).map(t => `<option value="${t.team.replace(/"/g, '&quot;')}">${short(t.team)}</option>`).join('');
  const sopts = SEASONS.available.map(x => `<option value="${x}">${x}</option>`).join(''); sSA.innerHTML = sopts; sSB.innerHTML = sopts; sSA.value = CUR; sSB.value = CUR;
  if (SEASONS.available.length < 2) [sSA, sSB].forEach(x => x.hidden = true);
  function fillTeams(sel, sn, keep) { const v = keep ?? sel.value; sel.innerHTML = optsFor(sn); sel.value = v; if (!sel.value) sel.value = sel.options[0]?.value; }
  // Team B defaults to Texas A&M's next opponent on the schedule (fallback: most recent opponent)
  const nextOpp = (() => {
    if (PUB) { const t2 = ((D.power && D.power.table) || []).find(r => r.rank === 2); if (t2) return t2.team; }
    const today = new Date().toISOString().slice(0, 10), rem = (D.rpi && D.rpi.futures && D.rpi.futures.remaining) || [];
    const g = rem.filter(m => (m.home === AM || m.away === AM) && m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const o = g ? (g.home === AM ? g.away : g.home) : null;
    if (o && teams.some(t => t.team === o && t.conf !== 'Non-D1')) return o;
    const last = ((D.detail[AM] || {}).matches || []).slice(-1)[0];
    return last && teams.some(t => t.team === last.opponent && t.conf !== 'Non-D1') ? last.opponent : teams.find(t => t.team !== AM && t.conf !== 'Non-D1').team;
  })();
  fillTeams(selA, CUR, AM); fillTeams(selB, CUR, nextOpp);
  const LOGO_SRC = window.__LOGOS__ || {};
  const RT = [
    ['matches', 'Matches', fmt.int, null], ['rec', 'W–L', (v, r) => `${r.wins}–${r.losses}`, null], ['set_win_pct', 'Set win %', fmt.pct, 1],
    ['so_pct', 'Sideout %', fmt.pct, 1], ['ps_pct', 'Point-scoring %', fmt.pct, 1], ['att_eff', 'Attack eff', fmt.eff, 1], ['kill_pct', 'Kill %', fmt.pct, 1],
    ['opp_att_eff', 'Opp attack eff', fmt.eff, 0], ['good_pass_pct', 'Good pass %', fmt.pct, 1], ['rec_err_pct', 'Reception err %', fmt.pct, 0],
    ['ace_pct', 'Ace %', fmt.pct, 1], ['ko_pct', 'Knockout %', fmt.pct, 1], ['serve_err_pct', 'Serve err %', fmt.pct, 0], ['kills_per_set', 'Kills / set', fmt.n2, 1], ['blocks_per_set', 'Blocks / set', fmt.n2, 1], ['digs_per_set', 'Digs / set', fmt.n2, 1], ['pass_rating', 'Pass rating', fmt.n2, 1]
  ];
  const natRank = {}; RANKED.forEach(([k]) => { natRank[k] = {}; }); rankPool(teams); teams.forEach(t => RANKED.forEach(([k]) => natRank[k][t.team] = t['rk_' + k]));
  const rankOf = (sn, k, t) => sn === CUR ? (natRank[k] ? natRank[k][t.team] : null) : (t['rk_' + k] ?? null);
  const pctCache = {};
  const pct = (sn, k, hi) => { const key = sn + k; if (!pctCache[key]) pctCache[key] = seasonTeams(sn).filter(t => t.matches >= 3).map(t => t[k]).filter(v => v != null).sort((a, b) => a - b); const vals = pctCache[key]; return v => { if (v == null || !vals.length) return null; let i = vals.findIndex(x => x >= v); if (i < 0) i = vals.length; const p = i / vals.length; return hi ? p : 1 - p; }; };
  function render() {
    const sA = sSA.value, sB = sSB.value, cross = sA !== sB;
    const A = seasonTeams(sA).find(t => t.team === selA.value), B = seasonTeams(sB).find(t => t.team === selB.value); if (!A || !B) return;
    const nmA = cross ? `${short(A.team)} ${sA}` : short(A.team), nmB = cross ? `${short(B.team)} ${sB}` : short(B.team);
    const mk1 = (t, sn, cls) => `<div class="cmp-team ${cls}">${LOGO_SRC[t.team] ? `<img src="${LOGO_SRC[t.team]}" alt="">` : ''}<div><div class="n">${short(t.team)}${cross ? ` <span style="color:var(--ink-3);font-weight:500">${sn}</span>` : ''}</div><div class="m">${t.conf} · ${t.wins}–${t.losses} · SO #${rankOf(sn, 'so_pct', t) || '—'} · PS #${rankOf(sn, 'ps_pct', t) || '—'}</div></div></div>`;
    document.getElementById('cmp-head').innerHTML = mk1(A, sA, 'a') + '<div class="cmp-vs">vs</div>' + mk1(B, sB, 'b');
    const h2h = (sA === CUR && sB === CUR) ? D.matches.filter(m => (m.home === A.team && m.away === B.team) || (m.home === B.team && m.away === A.team)) : [];
    (function () {
      const site = +document.getElementById('cmp-site').value; const r = crossMatch(A.team, sA, B.team, sB, site); const wa = r.win, wb = 1 - r.win;
      const MA = modelFor(sA), MB = modelFor(sB);
      const fav = wa >= wb ? A : B, fp = Math.max(wa, wb), favNm = fav === A ? nmA : nmB;
      const pc = v => (v * 100).toFixed(0) + '%';
      const bar = (v, c) => `<div style="flex:${Math.max(v, .02)};background:${c};height:100%"></div>`;
      const rt = (nm, o, d) => `<div class="note" style="margin:0">${nm}: sideout rating <b>${o == null ? '—' : (o * 100).toFixed(1) + '%'}</b> · opp sideout allowed <b>${d == null ? '—' : (d * 100).toFixed(1) + '%'}</b></div>`;
      document.getElementById('cmp-proj').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><div><span style="font-family:'IBM Plex Sans Condensed';font-size:30px;font-weight:600;color:${fav === A ? 'var(--maroon-ink)' : 'var(--s1)'}">${favNm}</span> <span style="font-size:15px;color:var(--ink-2)">projected to win · <b style="color:var(--ink)">${pc(fp)}</b></span></div>
          <div class="note" style="margin:0">${site === 1 ? nmA + ' home' : site === -1 ? nmB + ' home' : 'neutral site'} · home edge ≈ ${(MA.H * 100).toFixed(1)} pts of sideout${cross ? ' · cross-season: each team rated within its own season' : ''}</div></div>
        <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;margin:12px 0 6px;border:1px solid var(--line)">${bar(wa, 'var(--maroon-ink)')}${bar(wb, 'var(--s1)')}</div>
        <div style="display:flex;justify-content:space-between;font-size:13px"><span><b>${nmA}</b> ${pc(wa)}</span><span>${pc(wb)} <b>${nmB}</b></span></div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:14px 0 10px;text-align:center">${Object.entries(r.dist).map(([k, v]) => `<div style="background:var(--surface-2);border:1px solid var(--line);border-radius:4px;padding:6px 2px"><div style="font-size:11px;color:var(--ink-3)">${k.replace('-', '–')}</div><div style="font-weight:600">${pc(v)}</div></div>`).join('')}</div>
        <div class="note" style="margin:0 0 6px">Per set: ${nmA} wins ${pc(r.set)} (${pc(r.set5)} to 15) · expected point win for ${nmA}: ${pc(r.pRec)} receiving, ${pc(r.pSrv)} serving</div>
        ${rt(nmA, MA.off[A.team], MA.def[A.team])}${rt(nmB, MB.off[B.team], MB.def[B.team])}
        <p class="note" style="margin-top:10px">Model: each team's sideout % and sideout % allowed are opponent-adjusted across all team-matches in its season (${MA.games.toLocaleString()}${cross ? ' / ' + MB.games.toLocaleString() : ''}; regressed toward the season's D1 mean of ${(MA.L * 100).toFixed(1)}%${cross ? ' / ' + (MB.L * 100).toFixed(1) + '%' : ''} for small samples), combined into point-win rates when receiving and serving, then run through a rally-scoring set (to 25, win by 2; set 5 to 15) and a best-of-5. No injuries, lineups or recency weighting — treat it as a baseline, not a forecast.</p>`;
    })();
    document.getElementById('cmp-h2h').innerHTML = cross ? 'Cross-season comparison — no head-to-head' : (h2h.length ? 'Head-to-head: ' + h2h.map(m => { const aHome = m.home === A.team; const w = m.winner === A.team ? short(A.team) : m.winner === B.team ? short(B.team) : '—'; return `${fmt.date(m.date)} ${w} ${aHome ? m.home_sets + '–' + m.away_sets : m.away_sets + '–' + m.home_sets} (${m.scores})`; }).join(' · ') : 'No meeting yet this season');
    // team ratings (40–99) with overlaid radars
    (function () {
      const card = document.getElementById('cmp-rt-tiles').closest('.card'); const ra = rtOf(A.team, sA), rb = rtOf(B.team, sB);
      if (!ra && !rb) { card.hidden = true; return; } card.hidden = false;
      const keys = [['overall', 'Overall'], ...RT_COMPS];
      const cell = (r, k, o, cls) => { const v = r ? r[k] : null, ov = o ? o[k] : null; return `<div class="c ${cls} ${v != null && ov != null && v > ov ? 'edge' : ''}"><span class="${rtTier(v)}">${v ?? '—'}</span>${k === 'overall' && r && r.rank ? `<div class="rk" style="font:12px 'IBM Plex Sans';font-weight:400">#${r.rank}${r.power_rank ? ` · Power #${r.power_rank}` : ''}</div>` : ''}</div>`; };
      document.getElementById('cmp-rt-tiles').innerHTML = `<div class="h"></div><div class="h" style="text-align:center">${nmA}</div><div class="h" style="text-align:center">${nmB}</div>` +
        keys.map(([k, l]) => `<div style="color:var(--ink-2)">${l}</div>${cell(ra, k, rb, k === 'overall' ? 'ovr' : '')}${cell(rb, k, ra, k === 'overall' ? 'ovr' : '')}`).join('');
      rtRadar('c-cmp-radar', [{ label: nmA, data: RT_COMPS.map(([k]) => ra ? ra[k] : null), color: css('--maroon-ink') }, { label: nmB, data: RT_COMPS.map(([k]) => rb ? rb[k] : null), color: css('--s1') }]);
    })();
    // season numbers table
    const rows = RT.map(([k, label, f, hi]) => { const a = A[k], b = B[k]; let edge = null; if (hi != null && a != null && b != null && a !== b) edge = (hi ? a > b : a < b) ? 'a' : 'b'; return { label, a: f(a, A), b: f(b, B), edge, ra: rankOf(sA, k, A), rb: rankOf(sB, k, B) }; });
    document.getElementById('t-cmp-rt').innerHTML = '<thead><tr><th class="l">Metric</th><th>' + nmA + '</th><th>' + nmB + '</th></tr></thead><tbody>' + rows.map(r => `<tr><td class="l">${r.label}</td><td class="${r.edge === 'a' ? 'edge' : ''}">${r.a}${r.ra ? `<span class="rk">#${r.ra}</span>` : ''}</td><td class="${r.edge === 'b' ? 'edge' : ''}">${r.b}${r.rb ? `<span class="rk">#${r.rb}</span>` : ''}</td></tr>`).join('') + '</tbody>';
    // scorecard
    const scRows = SC.map(([k, label, f, hi]) => { const a = A.sc ? A.sc[k] : null, b = B.sc ? B.sc[k] : null; let edge = null; if (a != null && b != null && a !== b) edge = (hi ? a > b : a < b) ? 'a' : 'b'; return { label, a: f(a), b: f(b), edge }; });
    document.getElementById('t-cmp-sc').innerHTML = '<thead><tr><th class="l">Metric</th><th>' + nmA + '</th><th>' + nmB + '</th></tr></thead><tbody>' + scRows.map(r => `<tr><td class="l">${r.label}</td><td class="${r.edge === 'a' ? 'edge' : ''}">${r.a}</td><td class="${r.edge === 'b' ? 'edge' : ''}">${r.b}</td></tr>`).join('') + '</tbody>';
    // gap chart: percentile difference (each team within its own season's pool)
    const G = [['so_pct', 'Sideout', 1], ['ps_pct', 'Point-scoring', 1], ['att_eff', 'Attack eff', 1], ['opp_att_eff', 'Opp attack eff', 0], ['good_pass_pct', 'Good pass %', 1], ['ace_pct', 'Ace %', 1], ['ko_pct', 'KO %', 1], ['serve_err_pct', 'Serve err', 0], ['blocks_per_set', 'Blocks', 1], ['digs_per_set', 'Digs', 1], ['pass_rating', 'Pass rating', 1]];
    const data = G.map(([k, l, hi]) => { const pa = pct(sA, k, hi)(A[k]), pb = pct(sB, k, hi)(B[k]); return { l, d: pa == null || pb == null ? 0 : (pa - pb) * 100, pa, pb }; });
    mk('c-cmp', { type: 'bar', data: { labels: data.map(d => d.l), datasets: [{ data: data.map(d => d.d), backgroundColor: data.map(d => d.d >= 0 ? css('--maroon-ink') : css('--s1')), borderRadius: 4, borderSkipped: false }] },
      options: baseOpts({ layout: { padding: { top: 18 } }, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const d = data[c.dataIndex]; return `${nmA} ${Math.round(d.pa * 100)}th pct · ${nmB} ${Math.round(d.pb * 100)}th pct`; } } } },
        scales: { x: { min: -100, max: 100, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => (v > 0 ? '+' : '') + v } }, y: { grid: { display: false } } } }),
      plugins: [{ id: 'cmpLbl', afterDatasetsDraw(ch) { const { ctx, chartArea } = ch; ctx.save(); ctx.font = '11px "IBM Plex Sans"'; ctx.fillStyle = css('--ink-3'); ctx.textBaseline = 'top'; ctx.textAlign = 'right'; ctx.fillText('← ' + nmB + ' better', chartArea.left + (chartArea.right - chartArea.left) / 2 - 8, chartArea.top - 14); ctx.textAlign = 'left'; ctx.fillText(nmA + ' better →', chartArea.left + (chartArea.right - chartArea.left) / 2 + 8, chartArea.top - 14); ctx.restore(); } }] });
  }
  selA.addEventListener('change', render); selB.addEventListener('change', render);
  sSA.addEventListener('change', () => { fillTeams(selA, sSA.value); render(); }); sSB.addEventListener('change', () => { fillTeams(selB, sSB.value); render(); });
  document.getElementById('cmp-swap').addEventListener('click', () => { const a = selA.value, sa = sSA.value; sSA.value = sSB.value; sSB.value = sa; fillTeams(selA, sSA.value, selB.value); fillTeams(selB, sSB.value, a); render(); });
  document.getElementById('cmp-site').addEventListener('change', render);
  rebuild.push(render);
})();

/* ================= GROUP TABS (Top 50, Conference stats) ================= */
function groupTab(px, DATA, tab, defaultName, rankLabel) {
  const $ = id => document.getElementById(id.replace(/^grp-/, px + '-').replace(/^t-grp-/, 't-' + px + '-'));
  const names = Object.keys(DATA); if (!names.length) { document.querySelector(`.tab[data-tab="${tab}"]`).hidden = true; return; }
  const sel = $('grp-sel'); sel.innerHTML = names.map(g => `<option>${g}</option>`).join('');
  sel.value = names.includes(defaultName) ? defaultName : names[0];
  $('grp-ranklabel').textContent = rankLabel;
  const byTeam = Object.fromEntries(teams.map(t => [t.team, t]));
  const LG = window.__LOGOS__ || {};
  const selA = $('grp-a'), selB = $('grp-b');
  let G, gname, gteams, stats, results;
  const RTG = [['matches', 'Matches', fmt.int, null], ['rec', 'W–L', (v, r) => `${r.wins}–${r.losses}`, null], ['set_win_pct', 'Set win %', fmt.pct, 1], ['so_pct', 'Sideout %', fmt.pct, 1], ['ps_pct', 'Point-scoring %', fmt.pct, 1],
    ['kill_pct', 'Kill %', fmt.pct, 1], ['opp_att_eff', 'Opp attack eff', fmt.eff, 0], ['good_pass_pct', 'Good pass %', fmt.pct, 1],
    ['ace_pct', 'Ace %', fmt.pct, 1], ['ko_pct', 'Knockout %', fmt.pct, 1], ['serve_err_pct', 'Serve err %', fmt.pct, 0], ['kills_per_set', 'Kills / set', fmt.n2, 1], ['blocks_per_set', 'Blocks / set', fmt.n2, 1], ['digs_per_set', 'Digs / set', fmt.n2, 1], ['att_eff', 'Attack eff', fmt.eff, 1], ['pass_rating', 'Pass rating', fmt.n2, 1]];
  function load() {
    gname = sel.value; G = DATA[gname]; gteams = G.teams; stats = (G.stats && !Array.isArray(G.stats)) ? G.stats : {};
    const inG = new Set(gteams);
    results = D.matches.filter(m => inG.has(m.home) && inG.has(m.away)).map(m => {
      const h = (D.detail[m.home] || { matches: [] }).matches.find(x => x.match_id === m.match_id) || {};
      const a = (D.detail[m.away] || { matches: [] }).matches.find(x => x.match_id === m.match_id) || {};
      return { ...m, hso: h.so_pct, hps: h.ps_pct, heff: h.att_eff, hk: h.kill_pct, hgp: h.good_pass_pct, aso: a.so_pct, aps: a.ps_pct, aeff: a.att_eff, ak: a.kill_pct, agp: a.good_pass_pct };
    }).sort((x, y) => x.date.localeCompare(y.date));
    $('grp-count').textContent = `${gteams.length} teams · ${results.length} matchups played`;
    const opts = gteams.slice().sort((a, b) => short(a).localeCompare(short(b))).map(t => `<option value="${t.replace(/"/g, '&quot;')}">${short(t)}</option>`).join('');
    const a0 = selA.value, b0 = selB.value; selA.innerHTML = opts; selB.innerHTML = opts;
    selA.value = inG.has(a0) ? a0 : (inG.has(HL) ? HL : gteams[0]); selB.value = inG.has(b0) && b0 !== selA.value ? b0 : gteams.find(t => t !== selA.value);
  }
  function standings() {
    const view = $('grp-view').value, only = $('grp-played').checked;
    const rows = gteams.map((t, i) => { const st = stats[t] || { team: t, matches: 0, wins: 0, losses: 0 }; const r = { rank: i + 1, conf: (byTeam[t] || {}).conf || '', ...st }; return view === 'sc' ? flatSc(r, 'sc_', st.sc) : r; }).filter(r => !only || r.matches > 0);
    const base = [{ key: 'rank', label: '#', asc: true, fmt: v => v }, { key: 'team', label: 'Team', left: true, asc: true, fmt: (v, r) => `${LG[v] ? `<img src="${LG[v]}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:-4px;margin-right:6px">` : ''}${short(v)} <span class="rk">${r.conf}</span>` }, { key: 'matches', label: 'M' }, { key: 'wins', label: 'W–L', fmt: (v, r) => `${r.wins}–${r.losses}` }];
    const cols = view === 'sc' ? [...base, { key: 'sc_sets', label: 'Sets' }, ...scCols('sc_')] :
      [...base, { key: 'sets', label: 'Sets' }, { key: 'set_win_pct', label: 'Set W%', fmt: fmt.pct }, { key: 'so_pct', label: 'SO %', fmt: fmt.pct }, { key: 'ps_pct', label: 'PS %', fmt: fmt.pct }, { key: 'kill_pct', label: 'Kill %', fmt: fmt.pct }, { key: 'opp_att_eff', label: 'Opp eff', fmt: fmt.eff, asc: true }, { key: 'ko_pct', label: 'KO %', fmt: fmt.pct }, { key: 'good_pass_pct', label: 'Good pass', fmt: fmt.pct }, { key: 'ace_pct', label: 'Ace %', fmt: fmt.pct }, { key: 'serve_err_pct', label: 'SE %', fmt: fmt.pct, asc: true }, { key: 'blocks_per_set', label: 'Blk/set', fmt: fmt.n2 }, { key: 'digs_per_set', label: 'Digs/set', fmt: fmt.n2 }, { key: 'att_eff', label: 'Att eff', fmt: fmt.eff }, { key: 'pass_rating', label: 'Pass', fmt: fmt.n2 }];
    // conditional formatting: green = better, red = worse, strength = standard deviations from the reference average
    const heat = $('grp-heat') ? $('grp-heat').value : '';
    if (heat) {
      const good = css('--good'), bad = css('--crit'), skip = new Set(['rank', 'team', 'matches', 'wins', 'sets', 'sc_sets']);
      const keyOnly = $('grp-heatkey') && $('grp-heatkey').checked;
      const KEY = new Set(['so_pct', 'kill_pct', 'good_pass_pct', 'ko_pct', 'serve_err_pct', 'opp_att_eff', 'sc_so', 'sc_fbso', 'sc_eff_ip', 'sc_ko_pct', 'sc_se_pct']);
      const refRows = heat === 'd1' ? teams.filter(t => t.conf !== 'Non-D1' && t.matches >= 3) : rows;
      cols.forEach(c => { if (skip.has(c.key) || (keyOnly && !KEY.has(c.key))) return;
        const v = refRows.map(r => r[c.key]).filter(x => typeof x === 'number' && isFinite(x)); if (v.length < 3) return;
        const mu = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 0; if (!sd) return;
        const low = !!c.asc;
        c.bg = x => { if (typeof x !== 'number' || !isFinite(x)) return ''; const z = (x - mu) / sd * (low ? -1 : 1); if (Math.abs(z) < 0.25) return ''; return hexA(z > 0 ? good : bad, Math.min(0.45, Math.abs(z) * 0.2)); };
        c.title = `${c.title ? c.title + ' · ' : ''}${heat === 'd1' ? 'D1' : 'group'} average ${c.fmt ? c.fmt(mu) : mu.toFixed(3)}${low ? ' · lower is better' : ''}`; });
    }
    table($('t-grp-st'), rows, cols, { sort: 'rank', asc: true, rowClass: r => r.team === HL ? 'am' : '', tclass: 'freeze2' + (view === 'sc' ? ' compact' : '') + (px === 'cf' ? ' nock' : '') });
    const hl = $('grp-heat-leg'); if (hl) hl.hidden = !heat; const hk = $('grp-heatkey-lbl'); if (hk) hk.hidden = !heat;
  }
  function resultsTbl() {
    const q = $('grp-q').value.toLowerCase();
    const rows = results.filter(m => !q || tm(m.home, q) || tm(m.away, q));
    $('grp-res-count').textContent = `${rows.length} matches`;
    const nm = t => `${short(t)} <span class="rk">#${gteams.indexOf(t) + 1}</span>`;
    table($('t-grp-res'), rows, [{ key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'home', label: 'Home', left: true, asc: true, fmt: nm }, { key: 'away', label: 'Away', left: true, asc: true, fmt: nm },
      { key: 'winner', label: 'Winner', left: true, fmt: (v, r) => v ? `<span class="pill ${v === r.home ? 'W' : 'L'}">${v === r.home ? 'Home' : 'Away'}</span> ${short(v)}` : '—' }, { key: 'home_sets', label: 'Sets', fmt: (v, r) => `${r.home_sets}–${r.away_sets}` }, { key: 'scores', label: 'Set scores', left: true },
      { key: 'hso', label: 'Home SO', fmt: fmt.pct }, { key: 'hk', label: 'Home K%', fmt: fmt.pct }, { key: 'hgp', label: 'Home GP%', fmt: fmt.pct }, { key: 'aso', label: 'Away SO', fmt: fmt.pct }, { key: 'ak', label: 'Away K%', fmt: fmt.pct }, { key: 'agp', label: 'Away GP%', fmt: fmt.pct }], { sort: 'date', asc: false, rowClass: r => r.home === HL || r.away === HL ? 'am' : '' });
  }
  function h2h() {
    const played = gteams.filter(t => results.some(m => m.home === t || m.away === t));
    const res = {}; results.forEach(m => { if (!m.winner) return; const l = m.winner === m.home ? m.away : m.home; const k1 = m.winner + '|' + l, k2 = l + '|' + m.winner; const sc = m.winner === m.home ? `${m.home_sets}–${m.away_sets}` : `${m.away_sets}–${m.home_sets}`; (res[k1] = res[k1] || []).push({ r: 'W', t: `${fmt.date(m.date)} ${sc} (${m.scores})` }); (res[k2] = res[k2] || []).push({ r: 'L', t: `${fmt.date(m.date)} ${sc.split('–').reverse().join('–')} (${m.scores})` }); });
    let h = '<thead><tr><th class="l"></th>' + played.map(t => `<th class="top" title="${t}">${short(t)}</th>`).join('') + '</tr></thead><tbody>';
    played.forEach(r => { h += `<tr><td class="l${r === HL ? ' am' : ''}"><b>${short(r)}</b> <span class="rk">#${gteams.indexOf(r) + 1}</span></td>` + played.map(c => { if (c === r) return '<td class="self"></td>'; const x = res[r + '|' + c]; if (!x) return '<td></td>'; const w = x.filter(v => v.r === 'W').length, l = x.length - w; const cls = w > l ? 'W' : l > w ? 'L' : ''; return `<td class="${cls}" title="${r} vs ${c}: ${x.map(v => v.r + ' ' + v.t).join(' · ')}">${x.length > 1 ? w + '-' + l : x[0].r}</td>`; }).join('') + '</tr>'; });
    $('t-grp-h2h').innerHTML = h + '</tbody>';
    if (!played.length) $('t-grp-h2h').innerHTML = '<tbody><tr><td class="l">No group matchups played yet</td></tr></tbody>';
  }
  function compare() {
    const A = stats[selA.value] || { team: selA.value, matches: 0, wins: 0, losses: 0 }, B = stats[selB.value] || { team: selB.value, matches: 0, wins: 0, losses: 0 };
    const head = t => `<th style="max-width:120px;white-space:normal">${short(t)}</th>`;
    const row = (label, a, b, edge) => `<tr><td class="l">${label}</td><td class="${edge === 'a' ? 'edge' : ''}">${a}</td><td class="${edge === 'b' ? 'edge' : ''}">${b}</td></tr>`;
    const edgeOf = (a, b, hi) => (hi == null || a == null || b == null || a === b) ? null : ((hi ? a > b : a < b) ? 'a' : 'b');
    $('t-grp-cmp-rt').innerHTML = `<thead><tr><th class="l">Ratings</th>${head(A.team)}${head(B.team)}</tr></thead><tbody>` + RTG.map(([k, label, f, hi]) => row(label, f(A[k], A), f(B[k], B), edgeOf(A[k], B[k], hi))).join('') + '</tbody>';
    $('t-grp-cmp-sc').innerHTML = `<thead><tr><th class="l">Scorecard</th>${head(A.team)}${head(B.team)}</tr></thead><tbody>` + SC.map(([k, label, f, hi]) => { const a = A.sc ? A.sc[k] : null, b = B.sc ? B.sc[k] : null; return row(label, f(a), f(b), edgeOf(a, b, hi)); }).join('') + '</tbody>';
    const hh = results.filter(m => (m.home === A.team && m.away === B.team) || (m.home === B.team && m.away === A.team));
    $('grp-h2h-note').innerHTML = `${short(A.team)} ${A.matches} · ${short(B.team)} ${B.matches} matches · ` + (hh.length ? 'Head-to-head: ' + hh.map(m => { const aHome = m.home === A.team; const w = m.winner === A.team ? short(A.team) : m.winner === B.team ? short(B.team) : '—'; return `${fmt.date(m.date)} ${w} ${aHome ? m.home_sets + '–' + m.away_sets : m.away_sets + '–' + m.home_sets} (${m.scores})`; }).join(' · ') : 'no meeting yet');
  }
  function all() { load(); standings(); resultsTbl(); h2h(); compare(); }
  sel.addEventListener('change', all);
  ['grp-view', 'grp-played', 'grp-heat', 'grp-heatkey'].forEach(id => { const e = $(id); if (e) e.addEventListener('change', standings); });
  $('grp-q').addEventListener('input', resultsTbl);
  [selA, selB].forEach(x => x.addEventListener('change', compare));
  all();
}
groupTab('grp', GROUP_DATA, 'grp', 'Top 50', 'group list order (PAVE)');
groupTab('cf', (D.conferences && !Array.isArray(D.conferences)) ? D.conferences : {}, 'cf', PUB ? '' : ((teams.find(t => t.team === AM) || {}).conf || 'SEC'), 'conference standing (W, L, set win %)');



/* ================= RPI TAB ================= */
(function () {
  const R = D.rpi; const tabBtn = document.querySelector('.tab[data-tab="rpi"]');
  if (!R || !R.table || !R.table.length) { tabBtn.hidden = true; return; }
  const LG = window.__LOGOS__ || {}; const byTeam = Object.fromEntries(teams.map(t => [t.team, t]));
  const F = R.futures && R.futures.table ? R.futures.table : null; const fmap = F ? Object.fromEntries(F.map(r => [r.team, r])) : {};
  const rows = R.table.map(r => ({ ...r, ...(fmap[r.team] ? { proj_rank: fmap[r.team].proj_rank, rank_p10: fmap[r.team].rank_p10, rank_p90: fmap[r.team].rank_p90, p_top25: fmap[r.team].p_top25, p_top50: fmap[r.team].p_top50, proj_w: fmap[r.team].proj_w, proj_l: fmap[r.team].proj_l, remaining: fmap[r.team].remaining, proj_rpi: fmap[r.team].proj_rpi } : {}), delta: r.rank - r.rank_adj }));
  let am = rows.find(r => r.team === AM);
  document.getElementById('rpi-sub').textContent = `${R.teams} D1 teams · ${R.games.toLocaleString()} D1 vs D1 results through ${R.through} · source: ${R.source}`;
  const drawK = () => kpi('rpi-kpis', [
    { l: short(am ? am.team : AM) + ' RPI rank', v: am ? '#' + am.rank_adj : '—', d: am ? `standard #${am.rank} · ${am.w}–${am.l} · RPI ${fmt.n3(am.rpi_adj)}` : 'no D1 results', am: true },
    { l: 'Bonus / penalty', v: am ? (am.adj_pos > 0 ? '+' : '') + am.adj_pos : '—', d: 'positions · wins vs top 25 (+2), 26–50 (+1); losses vs 288+ (−1/−2)' },
    { l: 'Projected finish', v: am && am.proj_rank ? '#' + am.proj_rank : '—', d: am && am.proj_rank ? `80% range #${am.rank_p10}–#${am.rank_p90} · top 25 ${Math.round(am.p_top25 * 100)}% · ${am.proj_w}–${am.proj_l}` : 'no remaining schedule' },
    { l: 'Nonconf schedule', v: am && am.nonconf ? `${am.nc_top75}/${am.nonconf}` : '—', d: 'nonconference opponents ranked 1–75 (≥50% earns +2)' },
    { l: '#25 / #50 cut', v: rows[24] ? fmt.n3(rows.slice().sort((a, b) => a.rank_adj - b.rank_adj)[24].rpi_adj) : '—', d: rows[49] ? `#50 at ${fmt.n3(rows.slice().sort((a, b) => a.rank_adj - b.rank_adj)[49].rpi_adj)}` : '' },
  ]);
  drawK();
  // arrows: change since the team's previous match (rank from results before its latest match); older caches fall back to the previous update
  const hasPM = rows.some(r => r.rank_adj_pm != null);
  const pmArrow = (r, k, v, fallback) => hasPM ? (r.last_match ? mv(r[k], v, `since the ${fmt.date(r.last_match)} match`) : '') : mv(fallback, v);
  const name = (v, r) => `${LG[v] ? `<img src="${LG[v]}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:-4px;margin-right:6px">` : ''}${short(v)} <span class="rk">${r.conf || ''}</span>`;
  function render() {
    const view = document.getElementById('rpi-view').value, cf = document.getElementById('rpi-conf').value, q = document.getElementById('rpi-q').value.toLowerCase();
    const pool = rows.filter(r => (!cf || inGroup({ team: r.team, conf: r.conf }, cf)) && tm(r.team, q));
    document.getElementById('rpi-count').textContent = `${pool.length} teams`;
    const base = [{ key: 'team', label: 'Team', left: true, asc: true, fmt: name }, { key: 'w', label: 'W–L', fmt: (v, r) => `${r.w}–${r.l}` }];
    let cols, sort, asc = true, note;
    if (view === 'std') {
      cols = [{ key: 'rank', label: '#', asc: true, fmt: (v, r) => `${v} ${pmArrow(r, 'rank_pm', v, PREV && PREV.rpi ? PREV.rpi[r.team] : null)}` }, ...base, { key: 'wp', label: 'WP', fmt: fmt.n3 }, { key: 'owp', label: 'OWP', fmt: fmt.n3 }, { key: 'oowp', label: 'OOWP', fmt: fmt.n3 }, { key: 'rpi', label: 'RPI', fmt: v => Number(v).toFixed(4) }, { key: 'rank_adj', label: 'NCAA #', asc: true }];
      sort = 'rank'; note = 'Standard RPI = 0.25 × WP + 0.50 × OWP + 0.25 × OOWP. WP is the team\'s record against D1 opponents; OWP averages each opponent\'s record with the games against this team removed; OOWP averages the opponents\' OWPs. Non-D1 results are excluded. ▲▼ = change since the team\'s previous match.';
    } else if (view === 'adj') {
      cols = [{ key: 'rank_adj', label: '#', asc: true, fmt: (v, r) => `${v} ${pmArrow(r, 'rank_adj_pm', v, PREV && PREV.rpi_adj ? PREV.rpi_adj[r.team] : null)}` }, ...base, { key: 'rpi_adj', label: 'RPI', fmt: v => Number(v).toFixed(4) }, { key: 'rank', label: 'Std #', asc: true }, { key: 'delta', label: 'Δ', fmt: v => v > 0 ? `<span style="color:var(--good-ink)">+${v}</span>` : v < 0 ? `<span style="color:var(--crit)">${v}</span>` : '0' }, { key: 'adj_pos', label: 'Bonus', fmt: v => (v > 0 ? '+' : '') + v }, { key: 'nc_top75', label: 'NC top 75', fmt: (v, r) => r.nonconf ? `${v}/${r.nonconf}` : '—' }, { key: 'nc_260', label: 'NC 263+', fmt: (v, r) => r.nonconf ? `${v}/${r.nonconf}` : '—' }, { key: 'wp', label: 'WP', fmt: fmt.n3 }, { key: 'owp', label: 'OWP', fmt: fmt.n3 }, { key: 'oowp', label: 'OOWP', fmt: fmt.n3 }];
      sort = 'rank_adj'; note = 'NCAA volleyball adjustments (pre-championship manual), applied to the standard RPI order, one "position" = the average RPI gap between adjacent teams: wins vs teams ranked 1–25 +2 positions, 26–50 +1; losses vs 288–312 −1, vs 313+ or non-D1 −2; ≥50% of nonconference opponents ranked 1–75 +2; ≥50% ranked 263+ or non-NCAA −2 (2025-26 NCAA pre-championships manual). Checked against the NCAA\'s final 2025 RPI: the top 16 match exactly. ▲▼ = change since the team\'s previous match.';
    } else {
      if (!F) { document.getElementById('t-rpi').innerHTML = '<tbody><tr><td class="l">No remaining schedule for this season — futures need the NCAA schedule file.</td></tr></tbody>'; document.getElementById('rpi-note').textContent = ''; return; }
      cols = [{ key: 'proj_rank', label: 'Proj #', asc: true, fmt: v => v ?? '—' }, ...base, { key: 'rank_adj', label: 'Now #', asc: true }, { key: 'rank_p10', label: '80% range', asc: true, fmt: (v, r) => v ? `#${v}–#${r.rank_p90}` : '—' }, { key: 'p_top25', label: 'Top 25', fmt: v => v == null ? '—' : Math.round(v * 100) + '%' }, { key: 'p_top50', label: 'Top 50', fmt: v => v == null ? '—' : Math.round(v * 100) + '%' }, { key: 'proj_w', label: 'Proj W–L', fmt: (v, r) => v == null ? '—' : `${r.proj_w}–${r.proj_l}` }, { key: 'remaining', label: 'Left' }, { key: 'proj_rpi', label: 'Proj RPI', fmt: v => v == null ? '—' : Number(v).toFixed(4) }];
      sort = 'proj_rank'; note = `Futures: every remaining D1 vs D1 match on the NCAA schedule (${R.futures.remaining.length} games) is simulated ${R.futures.sims.toLocaleString()} times with the dashboard's opponent-adjusted sideout model (listed home team gets the home edge), and the standard RPI is recomputed for each simulated season. Proj # is the median final rank; the range covers 80% of simulations. Conference tournaments are included when the NCAA lists them; the model has no injuries or recency weighting.`;
    }
    table('t-rpi', pool, cols, { sort, asc, rowClass: r => r.team === HL ? 'am' : '' });
    document.getElementById('rpi-note').textContent = note;
  }
  // remaining schedule per team
  const tsel = document.getElementById('rpi-team'); const rem = R.futures && R.futures.remaining ? R.futures.remaining : [];
  const rankAdj = Object.fromEntries(rows.map(r => [r.team, r.rank_adj]));
  tsel.innerHTML = rows.slice().sort((a, b) => short(a.team).localeCompare(short(b.team))).map(r => `<option value="${r.team.replace(/"/g, '&quot;')}">${short(r.team)}</option>`).join(''); if (am) tsel.value = AM;
  function renderRem() {
    const t = tsel.value; const g = rem.filter(m => m.home === t || m.away === t).map(m => { const home = m.home === t; const opp = home ? m.away : m.home; const p = home ? m.p_home : 1 - m.p_home; return { date: m.date, opp, site: home ? 'Home' : 'Away', p, opp_rank: rankAdj[opp] || null, conf: (byTeam[opp] || {}).conf || '' }; });
    const ew = g.reduce((a, x) => a + x.p, 0);
    document.getElementById('rpi-team-sum').textContent = g.length ? `${g.length} games left · expected ${ew.toFixed(1)}–${(g.length - ew).toFixed(1)} · ${g.filter(x => x.opp_rank && x.opp_rank <= 50).length} vs current top 50` : 'no remaining games on the schedule';
    table('t-rpi-rem', g, [{ key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'opp', label: 'Opponent', left: true, asc: true, fmt: (v, r) => `${short(v)} <span class="rk">${r.conf}</span>` }, { key: 'site', label: 'Site', left: true }, { key: 'opp_rank', label: 'Opp RPI #', asc: true, fmt: v => v ? '#' + v : '—' }, { key: 'p', label: 'Win prob', fmt: v => `<span class="bar" style="width:${Math.round(v * 60)}px"></span>${Math.round(v * 100)}%` }], { sort: 'date', asc: true });
  }
  ['rpi-view', 'rpi-conf', 'rpi-q'].forEach(id => document.getElementById(id).addEventListener('input', render));
  const results = Array.isArray(R.results) && R.results.length ? R.results : (D.matches || []).map(m => ({ date: m.date, home: m.home, away: m.away, hs: m.home_sets, as: m.away_sets }));   // older caches: fall back to the master's results
  function renderRes() {
    const t = tsel.value;
    const g = results.filter(m => m.home === t || m.away === t).map(m => {
      const home = m.home === t, opp = home ? m.away : m.home, sf = home ? m.hs : m.as, sa = home ? m.as : m.hs, w = sf > sa, rk = rankAdj[opp] || null;
      return { date: m.date, opp, site: home ? 'Home' : 'Away', res: w ? 'W' : 'L', score: `${sf}–${sa}`, opp_rank: rk, conf: (byTeam[opp] || {}).conf || 'Non-D1', tier: w && rk && rk <= 25 ? 'q1' : w && rk && rk <= 50 ? 'q2' : '' };
    });
    const w25 = g.filter(x => x.tier === 'q1').length, w50 = g.filter(x => x.tier === 'q2').length;
    const vs = (lo, hi) => { const x = g.filter(r => r.opp_rank && r.opp_rank >= lo && r.opp_rank <= hi); return `${x.filter(r => r.res === 'W').length}–${x.filter(r => r.res === 'L').length}`; };
    document.getElementById('rpi-res-sum').innerHTML = g.length ? `${g.filter(x => x.res === 'W').length}–${g.filter(x => x.res === 'L').length} · vs top 25: <b>${vs(1, 25)}</b> · vs 26–50: <b>${vs(26, 50)}</b> · vs 51–100: ${vs(51, 100)}` : 'no results yet';
    table('t-rpi-res', g, [{ key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'opp', label: 'Opponent', left: true, asc: true, fmt: (v, r) => `${short(v)} <span class="rk">${r.conf}</span>` }, { key: 'site', label: 'Site', left: true },
      { key: 'res', label: 'Result', fmt: (v, r) => `<span class="pill ${v}">${v}</span> ${r.score}` }, { key: 'opp_rank', label: 'Opp RPI #', asc: true, fmt: v => v ? '#' + v : '—' }], { sort: 'date', asc: true, rowClass: r => r.tier ? 'rpi-' + r.tier : '' });
  }
  // RPI by conference: depth (top 25/50/100), average RPI, and nonconference results vs D1
  (function confRPI() {
    const cOf = Object.fromEntries(rows.map(r => [r.team, r.conf]));
    const C = {};
    rows.forEach(r => { if (!r.conf || r.conf === 'Non-D1') return; const c = C[r.conf] = C[r.conf] || { conf: r.conf, n: 0, sum: 0, ranks: [], best: null, w: 0, l: 0, w50: 0, l50: 0, w100: 0, l100: 0, bad: 0, oppRk: [] };
      c.n++; c.sum += r.rpi_adj; c.ranks.push(r.rank_adj); if (!c.best || r.rank_adj < c.best.rank_adj) c.best = r; });
    results.forEach(m => {
      const ch = cOf[m.home], ca = cOf[m.away]; if (!ch || !ca || ch === ca) return;
      [[m.home, ch, m.away, m.hs > m.as], [m.away, ca, m.home, m.as > m.hs]].forEach(([t, c, opp, won]) => {
        const x = C[c]; if (!x) return; const ork = rankAdj[opp];
        won ? x.w++ : x.l++; if (ork) x.oppRk.push(ork);
        if (ork && ork <= 50) won ? x.w50++ : x.l50++; else if (ork && ork <= 100) won ? x.w100++ : x.l100++;
        if (!won && ork && ork > 150) x.bad++;
      });
    });
    const list = Object.values(C).map(c => ({ ...c, avg: c.sum / c.n, avg_rank: c.ranks.reduce((a, b) => a + b, 0) / c.n, t25: c.ranks.filter(v => v <= 25).length, t50: c.ranks.filter(v => v <= 50).length, t100: c.ranks.filter(v => v <= 100).length,
      g: c.w + c.l, wpct: c.w + c.l ? c.w / (c.w + c.l) : null, opp: c.oppRk.length ? c.oppRk.reduce((a, b) => a + b, 0) / c.oppRk.length : null }));
    list.sort((a, b) => b.avg - a.avg).forEach((c, i) => c.rk = i + 1);
    if (!list.length) { document.getElementById('rpi-cf-card').hidden = true; return; }
    const tot = list.reduce((a, c) => a + c.g, 0) / 2;
    document.getElementById('rpi-cf-sub').textContent = `${list.length} conferences · ${Math.round(tot).toLocaleString()} nonconference D1 results through ${R.through}`;
    const pick = conf => { const s = document.getElementById('rpi-conf'); s.value = conf; render(); s.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const hlConf = HL ? cOf[HL] : null;
    table('t-rpi-cf', list, [
      { key: 'rk', label: '#', asc: true }, { key: 'conf', label: 'Conference', left: true, asc: true, fmt: v => `<b>${v}</b>` }, { key: 'n', label: 'Teams' },
      { key: 'avg', label: 'Avg RPI', fmt: v => v.toFixed(4) }, { key: 'best', label: 'Best', left: true, fmt: v => `${short(v.team)} <span class="rk">#${v.rank_adj}</span>` },
      { key: 't25', label: 'Top 25' }, { key: 't50', label: 'Top 50' }, { key: 't100', label: 'Top 100' },
      { key: 'wpct', label: 'NC W–L', fmt: (v, r) => r.g ? `${r.w}–${r.l}` : '—' }, { key: 'w50', label: 'vs top 50', fmt: (v, r) => `${r.w50}–${r.l50}` }, { key: 'w100', label: 'vs 51–100', fmt: (v, r) => `${r.w100}–${r.l100}` },
      { key: 'bad', label: 'Bad losses', asc: true }, { key: 'opp', label: 'NC opp #', asc: true, fmt: v => v == null ? '—' : Math.round(v) }
    ], { sort: 'rk', asc: true, idKey: 'conf', onClick: pick, rowClass: r => r.conf === hlConf ? 'am' : '' });
    const byW = list.filter(c => c.g).sort((a, b) => b.wpct - a.wpct);
    document.getElementById('rpi-cf-chart-sub').textContent = '· dashed line = .500';
    hbars('hb-rpi-cf', byW.map(c => ({ label: c.conf, sub: `${c.w}–${c.l}`, value: c.wpct * 100, text: (c.wpct * 100).toFixed(1) + '%', hl: c.conf === hlConf,
      tip: `${c.conf}: ${c.w}–${c.l} nonconference · vs top 50 ${c.w50}–${c.l50} · vs 51–100 ${c.w100}–${c.l100} · ${c.bad} bad losses · avg RPI #${Math.round(c.avg_rank)}` })), { lo: 0, hi: 100, ref: 50 });
    document.querySelectorAll('#hb-rpi-cf .hb-r').forEach((el, i) => { el.style.cursor = 'pointer'; el.onclick = () => pick(byW[i].conf); });
  })();
  tsel.addEventListener('change', () => { renderRes(); renderRem(); if (PUB) { am = rows.find(r => r.team === tsel.value); drawK(); } });
  render(); renderRes(); renderRem();
})();


/* ================= POWER RANKINGS TAB ================= */
(function () {
  const P = D.power; const btn = document.querySelector('.tab[data-tab="pwr"]');
  if (!P || !P.table || !P.table.length) { btn.hidden = true; return; }
  const LG = window.__LOGOS__ || {}; const rows = P.table.map(r => ({ ...r, prev: PREV && PREV.power ? PREV.power[r.team] : null }));
  const am = rows.find(r => r.team === AM);
  document.getElementById('pwr-sub').textContent = `${rows.filter(r => r.rank).length} teams ranked · D1 mean sideout ${(P.L * 100).toFixed(1)}% · home edge ${(P.H * 100).toFixed(1)} pts`;
  const pts = v => v == null ? '—' : (v > 0 ? '+' : '') + (v * 100).toFixed(1);
  const rk = rows.filter(r => r.rank), top = (f, asc) => rk.slice().sort((x, y) => asc ? f(x) - f(y) : f(y) - f(x))[0];
  if (PUB) { const t1 = top(r => r.net), so = top(r => r.off), sd = top(r => r.def, true), ss = top(r => r.sos ?? -9), fm = top(r => r.form ?? -9);
    kpi('pwr-kpis', [
      { l: 'No. 1', v: short(t1.team), d: `net ${pts(t1.net)} · ${t1.wins}–${t1.losses}` },
      { l: 'Best sideout rating', v: short(so.team), d: `${(so.off * 100).toFixed(1)}%` },
      { l: 'Best sideout defense', v: short(sd.team), d: `${(sd.def * 100).toFixed(1)}% allowed` },
      { l: 'Toughest schedule', v: short(ss.team), d: `SOS ${pts(ss.sos)}` },
      { l: 'Best form (last 10)', v: short(fm.team), d: `${pts(fm.form)} · ${fm.last10}` },
    ]);
  } else kpi('pwr-kpis', [
    { l: short(AM) + ' power rank', v: am && am.rank ? '#' + am.rank : '—', d: am ? `${mv(am.prev, am.rank)} · net ${pts(am.net)} · ${am.wins}–${am.losses}` : '', am: true },
    { l: 'Sideout rating', v: am ? (am.off * 100).toFixed(1) + '%' : '—', d: am ? `#${rows.filter(r => r.rank && r.off > am.off).length + 1} · raw SO ${fmt.pct(am.so_pct)}` : '' },
    { l: 'Sideout allowed', v: am ? (am.def * 100).toFixed(1) + '%' : '—', d: am ? `#${rows.filter(r => r.rank && r.def < am.def).length + 1} · lower is better` : '' },
    { l: 'Strength of schedule', v: am ? pts(am.sos) : '—', d: am ? `#${rows.filter(r => r.rank && r.sos > am.sos).length + 1} · avg opponent net` : '' },
    { l: 'Form (last 10)', v: am ? pts(am.form) : '—', d: am ? `${am.last10} · vs rating expectation` : '' },
  ]);
  const name = (v, r) => `${LG[v] ? `<img src="${LG[v]}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:-4px;margin-right:6px">` : ''}${short(v)} <span class="rk">${r.conf || ''}</span>`;
  function render() {
    const cf = document.getElementById('pwr-conf').value, q = document.getElementById('pwr-q').value.toLowerCase(), mn = +document.getElementById('pwr-min').value || 1;
    const pool = rows.filter(r => r.matches >= mn && (!cf || inGroup({ team: r.team, conf: r.conf }, cf)) && tm(r.team, q));
    document.getElementById('pwr-count').textContent = `${pool.length} teams`;
    table('t-pwr', pool, [
      { key: 'rank', label: '#', asc: true, fmt: (v, r) => v ? `${v} ${mv(r.prev, v)}` : '—' }, { key: 'team', label: 'Team', left: true, asc: true, fmt: name },
      { key: 'wins', label: 'W–L', fmt: (v, r) => `${r.wins}–${r.losses}` }, { key: 'net', label: 'Net', fmt: v => `<b>${pts(v)}</b>` },
      { key: 'off', label: 'SO rating', fmt: v => (v * 100).toFixed(1) + '%' }, { key: 'def', label: 'SO allowed', asc: true, fmt: v => (v * 100).toFixed(1) + '%' },
      { key: 'sos', label: 'SOS', fmt: pts }, { key: 'form', label: 'Form', fmt: v => v == null ? '—' : `<span style="color:${v > 0 ? 'var(--good-ink)' : v < 0 ? 'var(--crit)' : 'inherit'}">${pts(v)}</span>` }, { key: 'last10', label: 'Last 10', fmt: v => v || '—', title: 'Record in the last 10 matches (NCAA committee metric)' },
      { key: 'so_pct', label: 'Raw SO', fmt: fmt.pct }, { key: 'ps_pct', label: 'Raw PS', fmt: fmt.pct }
    ], { sort: 'net', rowClass: r => r.team === HL ? 'am' : '' });
    const rcard = document.getElementById('pwr-rt-card');
    if (!RTG || !RTG.table.length) { rcard.hidden = true; return; }
    const rpool = RTG.table.filter(r => r.matches >= mn && (!cf || inGroup({ team: r.team, conf: r.conf }, cf)) && tm(r.team, q));
    const rcol = (k, label, title) => ({ key: k, label, title, cls: 'rt', fmt: (v, r) => rtNum(v) + rtWk(r[k + '_pw'], v) });
    const mdef = k => rtCompMetrics(k).map(m => m.label.replace(/\s*\((?!S\))[^)]*\)/g, '').replace(/\s+—.*$/, '')).join(' · ');
    table('t-pwr-rt', rpool, [
      { key: 'rank', label: '#', asc: true, fmt: (v, r) => v ? `${v} ${RT_PW ? mv(r.rank_pw, v, `vs ${fmt.date(RT_PW)}`) : ''}` : '—' }, { key: 'team', label: 'Team', left: true, asc: true, fmt: name }, { key: 'matches', label: 'M' }, { key: 'power_rank', label: 'Pwr #', asc: true, title: 'Power ranking (points-won outcome)', fmt: v => v || '—' },
      rcol('overall', 'OVR', 'Overall — weighted blend of the five components'), rcol('attack', 'ATT', mdef('attack')), rcol('serve', 'SRV', mdef('serve')), rcol('pass', 'PASS', mdef('pass')), rcol('setting', 'SET', mdef('setting')), rcol('block', 'BLK', mdef('block')), rcol('dig', 'DIG', mdef('dig'))
    ], { sort: 'overall', rowClass: r => r.team === HL ? 'am' : '' });
  }
  if (RT_PW) document.getElementById('pwr-rt-sub').textContent = `40–99 · 70 = D1 average · ▲▼ change since ${fmt.date(RT_PW)}`;
  ['pwr-conf', 'pwr-q', 'pwr-min'].forEach(id => document.getElementById(id).addEventListener('input', render));
  render();
})();

/* ================= SHARED: segmented buttons, % cells ================= */
function segCtl(id, onChange) {
  const el = document.getElementById(id); if (!el) return () => null;
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onChange(); }));
  return () => { const b = el.querySelector('button.on'); return b ? (b.dataset.k || b.dataset.v) : null; };
}
const pctP = v => v == null ? '—' : v === 0 ? '<span style="color:var(--ink-3)">–</span>' : v < 0.005 ? '<1%' : v > 0.995 && v < 1 ? '>99%' : Math.round(v * 100) + '%';
const logoName = (v, conf) => { const LG = window.__LOGOS__ || {}; return `${LG[v] ? `<img src="${LG[v]}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:-4px;margin-right:6px">` : ''}${short(v)}${conf ? ` <span class="rk">${conf}</span>` : ''}`; };
const CONF_OF = Object.fromEntries([...(D.rpi && D.rpi.table ? D.rpi.table.map(r => [r.team, r.conf]) : []), ...teams.map(t => [t.team, t.conf])]);
const goHomeIfOn = btn => { if (btn.getAttribute('aria-selected') === 'true') document.querySelector('.tab[data-tab="nat"]').click(); };

/* ================= SCORES TAB (live scores via the scores worker) ================= */
(function () {
  // Primary scores URL from config, with the worker's own workers.dev address as a backup in case the custom domain is down
  const API_MAIN = (window.__SCORES_API__ || '').replace(/\/$/, ''), API_BACKUP = 'https://score.joeskinnervb.workers.dev';
  let API = API_MAIN;
  const apiGet = async path => {
    for (const base of [...new Set([API, API_MAIN, API_BACKUP])]) {
      try { const r = await fetch(base + path); if (!r.ok) throw new Error(r.status); API = base; return await r.json(); } catch (e) { /* try the next address */ }
    }
    throw new Error('scores unavailable');
  };
  const btn = document.getElementById('sc-tab');
  if (!API) { btn.hidden = true; goHomeIfOn(btn); return; }
  btn.hidden = false;
  let wasOn = false; try { wasOn = localStorage.getItem('m26tab') === 'sc'; } catch (e) {}
  const SEO = D.seo_map || {};                       // NCAA seo name → dashboard team name
  const LG = window.__LOGOS__ || {};
  const rpiRank = Object.fromEntries(((D.rpi && D.rpi.table) || []).map(r => [r.team, r.rank_adj]));
  const rpiRec = Object.fromEntries(((D.rpi && D.rpi.table) || []).filter(r => r.w != null).map(r => [r.team, `${r.w}-${r.l}`]));   // record as of the last results build
  const dayEl = document.getElementById('sc-day'), confEl = document.getElementById('sc-conf'), grpEl = document.getElementById('sc-group');
  const grid = document.getElementById('sc-grid'), stat = document.getElementById('sc-status');
  const iso = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const today = () => iso(new Date());
  dayEl.value = today();
  confEl.innerHTML = '<option value="">All conferences</option><option value="__top25">RPI top 25</option><option value="__conf">Conference matches only</option>' + confs.map(c => `<option value="${c}">${c}</option>`).join('');
  const view = segCtl('sc-seg', render);
  let games = [], sets = {}, timer = null, seq = 0; const watchCache = {};
  // TV / streaming: ESPN's public scoreboard, read directly by the browser and matched to NCAA games by team name
  const ABBR = { ala: 'alabama', ariz: 'arizona', ark: 'arkansas', cal: 'california', calif: 'california', caro: 'carolina', car: 'carolina', colo: 'colorado', conn: 'connecticut', fla: 'florida', ga: 'georgia', ill: 'illinois', ind: 'indiana', kan: 'kansas', ky: 'kentucky', la: 'louisiana', mass: 'massachusetts', md: 'maryland', mich: 'michigan', minn: 'minnesota', miss: 'mississippi', mo: 'missouri', mont: 'montana', neb: 'nebraska', nev: 'nevada', okla: 'oklahoma', ore: 'oregon', pa: 'pennsylvania', tenn: 'tennessee', tex: 'texas', va: 'virginia', wash: 'washington', wis: 'wisconsin', wyo: 'wyoming', so: 'southern', int: 'international' };
  const nrm = x => { let t = String(x || '').toLowerCase().replace(/^st\.\s*/, 'saint ').replace(/&/g, ' and ').replace(/\(([^)]*)\)/g, ' $1 '); t = t.replace(/[a-z]+\./g, w => { const k = w.slice(0, -1); return k === 'st' ? 'state ' : (ABBR[k] ? ABBR[k] + ' ' : k + ' '); }); return t.replace(/\buniversity\b|\bof\b|\bthe\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim(); };
  async function espnWatch(day) {
    const c = watchCache[day]; if (c && Date.now() - c.t < 10 * 60e3) return c.evs;
    try {
      const e = await fetch(`https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/scoreboard?dates=${day.replace(/-/g, '')}&limit=1000`).then(r => r.json());
      const evs = [];
      for (const ev of e.events || []) {
        const cp = (ev.competitions || [])[0] || {}; const names = [];
        for (const b of cp.broadcasts || []) for (const n of b.names || []) names.push(n);
        for (const b of cp.geoBroadcasts || []) { const n = b.media && (b.media.shortName || b.media.name); if (n) names.push(n); }
        if (!names.length && cp.broadcast) names.push(cp.broadcast);
        const watch = [...new Set(names.filter(Boolean))];
        const sides = (cp.competitors || []).map(t => { const tm = t.team || {}; return new Set([tm.location, tm.shortDisplayName, tm.displayName && tm.name ? tm.displayName.slice(0, -tm.name.length).trim() : null, tm.abbreviation].filter(Boolean).map(nrm)); });
        if (sides.length === 2 && watch.length) evs.push({ sides, watch });
      }
      watchCache[day] = { t: Date.now(), evs }; return evs;
    } catch (e) { return (c && c.evs) || []; }
  }
  function applyWatch(evs) {
    const has = (ev, n) => ev.sides.some(x => x.has(n));
    for (const g of games) {
      if (g.watch && g.watch.length) continue;
      const h = nrm(g.home.short), a = nrm(g.away.short);
      let hit = evs.filter(ev => has(ev, h) && has(ev, a));
      if (hit.length !== 1) { const c = evs.filter(ev => has(ev, h) || has(ev, a)); if (c.length === 1) hit = c; }
      if (hit.length === 1) g.watch = hit[0].watch;
    }
  }

  const teamOf = s => SEO[s.seo] || null;
  const confOf = s => { const t = teamOf(s); return (t && CONF_OF[t]) || ''; };
  async function load(quiet) {
    const my = ++seq; const day = dayEl.value;
    if (!quiet) { stat.textContent = 'Loading…'; }
    try {
      const j = await apiGet(`/scores?date=${day}`);
      if (my !== seq) return;                          // a newer request (other date) replaced this one
      games = j.games || [];
      render();
      espnWatch(day).then(evs => { if (my === seq) { applyWatch(evs); render(); } });
      // set scores: live matches every refresh, finals once
      const need = games.filter(g => g.state === 'live' || (g.state === 'final' && !sets[g.id]));
      let i = 0; const next = async () => { while (i < need.length) { const g = need[i++]; try { sets[g.id] = await apiGet(`/game?id=${g.id}`); } catch (e) {} } };
      await Promise.all([next(), next(), next(), next()]);
      if (my !== seq) return;
      render();
      const live = games.filter(g => g.state === 'live').length;
      const graded = games.filter(g => g.state === 'final' && pickOf(g) != null && g.home.score != null), hit = graded.filter(g => (pickOf(g) >= 0.5) === (g.home.score > g.away.score)).length;
      stat.innerHTML = (graded.length ? `Picks <b>${hit}–${graded.length - hit}</b> · ` : '') + (live ? `<span class="dot"></span>${live} live · ` : '') + `updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } catch (e) {
      if (my !== seq) return;
      stat.textContent = 'Scores are not available right now.';
      if (!games.length) grid.innerHTML = '<div class="sc-empty">Could not reach the scoreboard. Try again in a minute.</div>';
    } finally { if (my === seq) schedule(); }
  }
  function schedule() {
    clearTimeout(timer);
    const isToday = dayEl.value === today(), active = games.some(g => g.state === 'live') || (isToday && games.some(g => g.state === 'pre'));
    if (isToday && active) timer = setTimeout(() => { if (!document.hidden) load(true); else schedule(); }, 30000);
  }
  function row(g, s, other, isHome) {
    const t = teamOf(s), name = t ? short(t) : s.short, rk = t && rpiRank[t] ? `<span class="rk">#${rpiRank[t]}</span>` : '';
    const info = sets[g.id], rec = (info ? (isHome ? info.home.record : info.away.record) : '') || (t && rpiRec[t]) || '';   // NCAA record once live/final, otherwise ours
    const sc = info && info.sets ? info.sets : [];
    const cells = [0, 1, 2, 3, 4].map(i => { const x = sc[i]; if (!x || x[isHome ? 'home' : 'away'] == null) return '<span class="s"></span>'; const me = x[isHome ? 'home' : 'away'], op = x[isHome ? 'away' : 'home']; return `<span class="s${me > op ? ' w' : ''}">${me}</span>`; }).join('');
    let tot;
    if (g.state === 'pre') { const ta = teamOf(s), tb = teamOf(other); if (ta && tb && MODEL.off[ta] != null && MODEL.off[tb] != null) { const p = MODEL.match(ta, tb, isHome ? 1 : -1).win; tot = `${Math.round(p * 100)}%`; } else tot = ''; }
    else tot = s.score ?? '';
    const win = g.state === 'final' ? s.winner : false;
    return `<div class="sc-row${win ? ' win' : ''}"><span class="nm">${t && LG[t] ? `<img src="${LG[t]}" alt="">` : ''}<span class="t" title="${t || s.short}${rec ? ' · ' + rec : ''}">${name}</span>${rec ? `<span class="rec">${rec}</span>` : ''}${rk}</span>${cells}<span class="tot">${tot}</span></div>`;
  }
  // pregame win probability for the listed home team (power ratings, home edge); null when either team isn't rated
  // stored pregame pick (pick tracker) when the build has one for this date, otherwise today's model
  const PICK = {}; (window.__PICKS__ || []).forEach(r => { PICK[`${r.date}|${r.home}|${r.away}`] = r.p; });
  const pickOf = g => { const h = teamOf(g.home), a = teamOf(g.away); return h && a ? PICK[`${dayEl.value}|${h}|${a}`] : undefined; };
  const preP = g => { const k = pickOf(g); if (k != null) return k; const h = teamOf(g.home), a = teamOf(g.away); return h && a && MODEL.off[h] != null && MODEL.off[a] != null ? MODEL.match(h, a, 1).win : null; };
  const verdict = g => { const p = pickOf(g); if (p == null || g.state !== 'final' || g.home.score == null) return ''; const hw = g.home.score > g.away.score; return (p >= 0.5) === hw ? ' <span class="sc-ok">✓ called it</span>' : ` <span class="sc-miss">Upset${Math.max(p, 1 - p) >= 0.7 ? ' ✗' : ''}</span>`; };
  function card(g) {
    const when = g.startEpoch ? new Date(g.startEpoch * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : g.start;
    const info = sets[g.id], nSet = info && info.sets ? info.sets.filter(x => x.home != null).length : 0;
    const per = /(\d)/.exec(g.period || ''); const state = g.state === 'live' ? `<span class="sc-state live">Live${per ? ' · Set ' + per[1] : nSet ? ' · Set ' + nSet : ''}</span>` : g.state === 'final' ? `<span class="sc-state final">Final${nSet > 3 ? ' · ' + nSet + ' sets' : ''}</span>` : `<span class="sc-state">${when}</span>`;
    const watch = [...new Set([...(g.watch || []), ...(g.network ? [g.network] : [])])];
    const ha = teamOf(g.home), aa = teamOf(g.away);
    const confLbl = [confOf(g.away), confOf(g.home)].filter(Boolean); const cl = confLbl.length === 2 && confLbl[0] === confLbl[1] ? confLbl[0] : confLbl.join(' / ');
    const cmp = ha && aa && D.detail[ha] && D.detail[aa] ? `<a href="#" data-a="${aa.replace(/"/g, '&quot;')}" data-b="${ha.replace(/"/g, '&quot;')}" class="sc-cmp">Compare</a>` : '';
    return `<div class="sc-card ${g.state}"><div class="sc-top">${state}<span class="sc-watch">${watch.map(w => `<span>${w}</span>`).join('')}</span></div>` +
      row(g, g.away, g.home, false) + row(g, g.home, g.away, true) +
      ((sortEl.value === 'close' || (g.state === 'final' && pickOf(g) != null)) && preP(g) != null ? `<div class="sc-odds">${g.state === 'pre' ? 'Win probability' : 'Pregame'}: ${short(teamOf(g.away))} ${Math.round((1 - preP(g)) * 100)}% · ${short(teamOf(g.home))} ${Math.round(preP(g) * 100)}%${g.state === 'pre' && Math.abs(preP(g) - 0.5) <= 0.05 ? ' <b>Toss-up</b>' : ''}${verdict(g)}</div>` : '') +
      `<div class="sc-foot"><span>${cl || ''}</span><span>${cmp}${cmp && g.url ? ' · ' : ''}${g.url ? `<a href="${g.url}" target="_blank" rel="noopener">${g.state === 'pre' ? 'Match page' : 'Box score'} ↗</a>` : ''}</span></div></div>`;
  }
  function render() {
    const v = view() || 'all', cf = confEl.value;
    let list = games.filter(g => v === 'all' || g.state === v);
    if (cf === '__top25') list = list.filter(g => [g.home, g.away].some(s => { const t = teamOf(s); return t && rpiRank[t] && rpiRank[t] <= 25; }));
    else if (cf === '__conf') list = list.filter(g => confOf(g.home) && confOf(g.home) === confOf(g.away));
    else if (cf) list = list.filter(g => confOf(g.home) === cf || confOf(g.away) === cf);
    const order = { live: 0, pre: 1, final: 2 };
    if (sortEl.value === 'close') { const c = g => { const p = preP(g); return p == null ? 9 : Math.abs(p - 0.5); }; list.sort((a, b) => c(a) - c(b) || (a.startEpoch || 0) - (b.startEpoch || 0)); }
    else list.sort((a, b) => order[a.state] - order[b.state] || (a.startEpoch || 0) - (b.startEpoch || 0));
    const counts = { live: games.filter(g => g.state === 'live').length, pre: games.filter(g => g.state === 'pre').length, final: games.filter(g => g.state === 'final').length };
    document.querySelectorAll('#sc-seg button').forEach(b => { const n = b.dataset.v === 'all' ? games.length : counts[b.dataset.v]; b.textContent = `${{ all: 'All', live: 'Live', final: 'Final', pre: 'Upcoming' }[b.dataset.v]} ${n}`; });
    if (!list.length) { grid.innerHTML = `<div class="sc-empty">${games.length ? 'No matches for this filter.' : 'No D1 matches on this date.'}</div>`; return; }
    if (grpEl.checked && !cf) {
      const by = {}; list.forEach(g => { const a = confOf(g.away), h = confOf(g.home); const k = a && a === h ? a : 'Nonconference'; (by[k] = by[k] || []).push(g); });
      const keys = Object.keys(by).sort((x, y) => x === 'Nonconference' ? 1 : y === 'Nonconference' ? -1 : x.localeCompare(y));
      grid.innerHTML = keys.map(k => `<div class="sc-grp">${k} <span class="rk">${by[k].length}</span></div><div class="sc-grid">${by[k].map(card).join('')}</div>`).join('');
    } else grid.innerHTML = `<div class="sc-grid">${list.map(card).join('')}</div>`;
  }
  grid.addEventListener('click', e => {
    const a = e.target.closest('a.sc-cmp'); if (!a) return; e.preventDefault();
    const sa = document.getElementById('cmp-a'), sb = document.getElementById('cmp-b');
    if (sa && sb) { sa.value = a.dataset.a; sb.value = a.dataset.b; sa.dispatchEvent(new Event('change')); }
    document.querySelector('.tab[data-tab="cmp"]').click();
  });
  const shift = n => { const d = new Date(dayEl.value + 'T12:00:00'); d.setDate(d.getDate() + n); dayEl.value = iso(d); games = []; load(); };
  document.getElementById('sc-prev').onclick = () => shift(-1); document.getElementById('sc-next').onclick = () => shift(1);
  document.getElementById('sc-today').onclick = () => { dayEl.value = today(); games = []; load(); };
  dayEl.addEventListener('change', () => { games = []; load(); });
  const sortEl = document.getElementById('sc-sort');
  [confEl, grpEl, sortEl].forEach(x => x.addEventListener('change', render));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && dayEl.value === today()) load(true); });
  let started = false; const start = () => { if (!started) { started = true; load(); } };
  btn.addEventListener('click', start);
  if (wasOn && btn.getAttribute('aria-selected') !== 'true') btn.click();
  if (btn.getAttribute('aria-selected') === 'true') start();
})();

/* ================= PICK TRACKER (Scores tab): pregame predictions vs results, from D.picks ================= */
(function () {
  const P = (window.__PICKS__ || []).map(r => ({ ...r, hw: r.hs > r.as, fav: r.p >= 0.5, conf: Math.max(r.p, 1 - r.p) })).map(r => ({ ...r, ok: r.fav === r.hw }));
  const card = document.getElementById('pk-card'); if (!card) return;
  if (!P.length) { card.hidden = true; return; }
  const days = [...new Set(P.map(r => r.date))].sort();
  const rec = a => { const w = a.filter(r => r.ok).length; return { w, l: a.length - w, pct: a.length ? w / a.length : null, brier: a.length ? a.reduce((s, r) => s + (r.p - (r.hw ? 1 : 0)) ** 2, 0) / a.length : null, exp: a.reduce((s, r) => s + r.conf, 0) }; };
  const last = days[days.length - 1], wk = days.slice(-7), dayR = rec(P.filter(r => r.date === last)), wkR = rec(P.filter(r => wk.includes(r.date))), all = rec(P);
  const pc = v => v == null ? '—' : (v * 100).toFixed(1) + '%';
  kpi('pk-kpis', [
    { l: 'Latest day · ' + fmt.date(last), v: `${dayR.w}–${dayR.l}`, d: `${pc(dayR.pct)} · expected ${dayR.exp.toFixed(0)} right` },
    { l: 'Last 7 match days', v: pc(wkR.pct), d: `${wkR.w}–${wkR.l} · expected ${pc(wkR.exp / (wkR.w + wkR.l))}` },
    { l: 'Season', v: pc(all.pct), d: `${all.w}–${all.l} since ${fmt.date(days[0])}` },
    { l: 'Brier score', v: all.brier.toFixed(3), d: 'lower is better · 0.250 = coin flip' },
  ]);
  // daily accuracy vs what the probabilities promised
  mk('c-pk', { type: 'bar', data: { labels: days.map(fmt.date), datasets: [
      { type: 'bar', label: 'Picked right', data: days.map(d => { const r = rec(P.filter(x => x.date === d)); return r.pct * 100; }), backgroundColor: css('--s1'), borderRadius: 3, maxBarThickness: 22, order: 2 },
      { type: 'line', label: 'Expected from the odds', data: days.map(d => { const a = P.filter(x => x.date === d); return a.reduce((s, r) => s + r.conf, 0) / a.length * 100; }), borderColor: css('--ink-3'), borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, order: 1 }] },
    options: baseOpts({ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: css('--ink'), titleColor: css('--page'), bodyColor: css('--page'), padding: 8, cornerRadius: 4,
      callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y.toFixed(0)}%`, afterBody: it => { const r = rec(P.filter(x => x.date === days[it[0].dataIndex])); return `${r.w}–${r.l}`; } } } },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { min: 0, max: 100, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => v + '%' } } } }) });
  // calibration + upsets for the chosen window
  const segV = segCtl('pk-seg', renderWin);
  function renderWin() {
    const v = segV() || '14', win = v === 'all' ? days : days.slice(-(+v)), A = P.filter(r => win.includes(r.date)), R = rec(A);
    document.getElementById('pk-win').textContent = `${R.w}–${R.l} (${pc(R.pct)}) · expected ${pc(R.exp / Math.max(1, A.length))} · Brier ${R.brier == null ? '—' : R.brier.toFixed(3)}`;
    const B = [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.01]].map(([lo, hi]) => { const a = A.filter(r => r.conf >= lo && r.conf < hi), r = rec(a); return { band: `${Math.round(lo * 100)}–${Math.min(100, Math.round(hi * 100))}%`, n: a.length, rec: `${r.w}–${r.l}`, act: r.pct, exp: a.length ? a.reduce((s, x) => s + x.conf, 0) / a.length : null }; });
    table('t-pk-cal', B, [{ key: 'band', label: 'We said', left: true }, { key: 'n', label: 'Matches' }, { key: 'rec', label: 'Record' }, { key: 'exp', label: 'Expected', fmt: pc }, { key: 'act', label: 'Actual', fmt: v => v == null ? '—' : pc(v) }], { sort: 'band', asc: true });
    const up = A.filter(r => !r.ok).sort((a, b) => b.conf - a.conf).slice(0, 10).map(r => ({ ...r, winner: r.hw ? r.home : r.away, loser: r.hw ? r.away : r.home, score: r.hw ? `${r.hs}–${r.as}` : `${r.as}–${r.hs}` }));
    table('t-pk-up', up, [{ key: 'date', label: 'Date', left: true, fmt: fmt.date }, { key: 'winner', label: 'Winner', left: true, fmt: (v, r) => `<b>${short(v)}</b> ${r.score}` }, { key: 'loser', label: 'Over', left: true, fmt: v => short(v) }, { key: 'conf', label: 'Chance we gave the loser', fmt: pc }], { sort: 'conf' });
  }
  renderWin();
  document.getElementById('pk-sub').textContent = `${P.length.toLocaleString()} D1 matches graded · each prediction uses only matches charted before that day`;
})();

/* ================= TRENDS TAB (weekly ranking history) ================= */
(function () {
  const H = D.history; const btn = document.querySelector('.tab[data-tab="tr"]');
  if (!H || !H.rows || !H.rows.length || !H.weeks || H.weeks.length < 2) { btn.hidden = true; goHomeIfOn(btn); return; }
  const W = H.weeks, last = W[W.length - 1];
  const isSun = w => new Date(w + 'T12:00:00').getDay() === 0;
  const wl = w => (w === last && !isSun(w) ? 'thru ' : '') + fmt.date(w);
  const idx = {}; H.rows.forEach(r => { (idx[r.team] = idx[r.team] || {})[r.week] = r; });
  const names = Object.keys(idx).sort((a, b) => short(a).localeCompare(short(b)));
  const opt = t => `<option value="${t.replace(/"/g, '&quot;')}">${short(t)}</option>`;
  const s1 = document.getElementById('tr-team'), s2 = document.getElementById('tr-team2');
  s1.innerHTML = names.map(opt).join(''); s1.value = idx[AM] ? AM : names[0];
  s2.innerHTML = '<option value="">—</option>' + names.map(opt).join('');
  const dDays = (a, b) => (new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5;
  let sinceDef = 0; for (let i = W.length - 2; i >= 0; i--) if (dDays(W[i], last) >= 5) { sinceDef = i; break; }
  const since = document.getElementById('tr-since');
  since.innerHTML = W.slice(0, -1).map(w => `<option value="${w}">${wl(w)}</option>`).join(''); since.value = W[sinceDef];
  const at = (t, w, k) => (idx[t] && idx[t][w]) ? idx[t][w][k] : null;
  const mvTxt = (then, now) => then == null || now == null ? '' : then === now ? '<span class="mv same">–</span>' : then > now ? `<span class="mv up">▲${then - now}</span>` : `<span class="mv dn">▼${now - then}</span>`;

  function kpis() {
    const w0 = since.value;
    const pool = Object.keys(idx).filter(t => at(t, last, 'rrank') != null && at(t, last, 'rrank') <= 50 && at(t, w0, 'rrank') != null);
    const d = t => at(t, w0, 'rrank') - at(t, last, 'rrank');
    const up = pool.slice().sort((a, b) => d(b) - d(a))[0], dn = pool.slice().sort((a, b) => d(a) - d(b))[0];
    const FT = PUB ? s1.value : AM; const aP = at(FT, last, 'prank'), aR = at(FT, last, 'rrank');
    kpi('tr-kpis', [
      { l: short(FT) + ' power rank', v: aP ? '#' + aP : '—', d: `${mvTxt(at(FT, w0, 'prank'), aP)} since ${wl(w0)}`, am: true },
      { l: short(FT) + ' RPI rank', v: aR ? '#' + aR : '—', d: `${mvTxt(at(FT, w0, 'rrank'), aR)} since ${wl(w0)} · ${at(FT, last, 'w') ?? 0}–${at(FT, last, 'l') ?? 0}` },
      { l: 'Biggest RPI riser', v: up ? short(up) : '—', d: up ? `#${at(up, w0, 'rrank')} → #${at(up, last, 'rrank')} · current top 50` : '' },
      { l: 'Biggest RPI faller', v: dn && d(dn) < 0 ? short(dn) : '—', d: dn && d(dn) < 0 ? `#${at(dn, w0, 'rrank')} → #${at(dn, last, 'rrank')} · current top 50` : '' },
      { l: 'Weeks tracked', v: W.length, d: `${fmt.date(W[0])} to ${fmt.date(last)}` },
    ]);
  }
  function chart() {
    const t1 = s1.value, t2 = s2.value; const cP = css('--maroon-ink'), cR = css('--s1');
    const ds = (t, k, c, dash, lab) => ({ label: `${short(t)} ${lab}`, data: W.map(w => at(t, w, k)), borderColor: c, backgroundColor: c, borderDash: dash ? [5, 4] : [], pointRadius: 3, borderWidth: 2, tension: 0.25, spanGaps: true });
    const sets = [ds(t1, 'prank', cP, false, 'power'), ds(t1, 'rrank', cR, false, 'RPI')];
    if (t2 && t2 !== t1) sets.push(ds(t2, 'prank', cP, true, 'power'), ds(t2, 'rrank', cR, true, 'RPI'));
    const all = sets.flatMap(s => s.data).filter(v => v != null); const mx = Math.max(10, ...all);
    mk('c-tr', { type: 'line', data: { labels: W.map(wl), datasets: sets }, options: baseOpts({
      plugins: { legend: { display: false }, tooltip: { backgroundColor: css('--ink'), titleColor: css('--page'), bodyColor: css('--page'), padding: 8, cornerRadius: 4, callbacks: { label: c => `${c.dataset.label}: #${c.parsed.y}` } } },
      scales: { x: { grid: { display: false }, border: { color: css('--axis') } }, y: { reverse: true, min: 1, suggestedMax: Math.min(360, Math.ceil(mx * 1.1)), grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => '#' + v } } } }) });
    document.getElementById('tr-legend').innerHTML = `<span style="--c:${cP}">Power rank</span><span style="--c:${cR}">RPI rank</span>` + (t2 && t2 !== t1 ? `<span class="dashed" style="--c:var(--ink-3)">${short(t2)}</span>` : '');
    const f = at(t1, W[0], 'rrank') != null ? W[0] : W.find(w => at(t1, w, 'rrank') != null);
    document.getElementById('tr-sum').innerHTML = `Now: power <b>#${at(t1, last, 'prank') ?? '—'}</b> · RPI <b>#${at(t1, last, 'rrank') ?? '—'}</b> · ${at(t1, last, 'w') ?? 0}–${at(t1, last, 'l') ?? 0}`;
  }
  const mvKey = segCtl('tr-mv-seg', movers), hmKey = segCtl('tr-hm-seg', heat);
  function movers() {
    const k = mvKey() || 'rrank', w0 = since.value, cf = document.getElementById('tr-conf').value;
    const lab = k === 'rrank' ? 'RPI (with bonuses)' : 'power';
    document.getElementById('tr-mv-sub').textContent = `${lab} · ${wl(w0)} → ${wl(last)}`;
    const rows = Object.keys(idx).filter(t => at(t, last, k) != null && at(t, w0, k) != null && (!cf || inGroup({ team: t, conf: CONF_OF[t] }, cf)))
      .map(t => { const now = at(t, last, k), then = at(t, w0, k); return { team: t, conf: CONF_OF[t] || '', now, then, move: then - now, rec: `${at(t, last, 'w') ?? 0}–${at(t, last, 'l') ?? 0}`, dw: (at(t, last, 'w') ?? 0) - (at(t, w0, 'w') ?? 0), dl: (at(t, last, 'l') ?? 0) - (at(t, w0, 'l') ?? 0) }; });
    table('t-tr-mv', rows, [{ key: 'team', label: 'Team', left: true, asc: true, fmt: (v, r) => logoName(v, r.conf) }, { key: 'now', label: 'Now #', asc: true }, { key: 'then', label: 'Then #', asc: true },
      { key: 'move', label: 'Move', fmt: v => v > 0 ? `<span class="mv up" style="font-size:12.5px">▲${v}</span>` : v < 0 ? `<span class="mv dn" style="font-size:12.5px">▼${-v}</span>` : '<span class="mv same">–</span>' },
      { key: 'dw', label: 'In period', fmt: (v, r) => `${r.dw}–${r.dl}` }, { key: 'rec', label: 'W–L' }], { sort: 'move', rowClass: r => r.team === HL ? 'am' : '' });
  }
  function heat() {
    const k = hmKey() || 'rrank';
    document.getElementById('tr-hm-sub').textContent = `current top 25 · ${k === 'rrank' ? 'RPI (with bonuses)' : 'power'} rank at the end of each week`;
    const top = Object.keys(idx).filter(t => at(t, last, k) != null && at(t, last, k) <= 25).sort((a, b) => at(a, last, k) - at(b, last, k));
    const c = css('--s1'); const bg = v => v == null ? '' : `background:${hexA(c, Math.max(0.05, 0.6 * (1 - (v - 1) / 75)))}`;
    let h = '<thead><tr><th class="l">Team</th>' + W.map(w => `<th>${wl(w)}</th>`).join('') + '</tr></thead><tbody>';
    top.forEach(t => { h += `<tr class="${t === HL ? 'am' : ''}"><td class="l">${logoName(t, CONF_OF[t])}</td>` + W.map(w => { const v = at(t, w, k); return `<td class="c" style="${bg(v)}">${v ?? '—'}</td>`; }).join('') + '</tr>'; });
    document.getElementById('t-tr-hm').innerHTML = h + '</tbody>';
  }
  // ---- box-score trends (from each team's scouted matches, D.detail[team].matches) ----
  const mul = (r, n) => r == null || n == null ? null : r * n;
  const ST = [
    { k: 'pw', label: 'Points won %', f: fmt.pct, num: m => m.pts_won, den: m => m.points },
    { k: 'so', label: 'Sideout %', f: fmt.pct, num: m => mul(m.so_pct, m.rec_pts), den: m => m.rec_pts },
    { k: 'ps', label: 'Point-scoring %', f: fmt.pct, num: m => mul(m.ps_pct, m.srv_pts), den: m => m.srv_pts },
    { k: 'eff', label: 'Attack efficiency', f: fmt.eff, num: m => m.kills - m.att_err - m.blocked, den: m => m.att },
    { k: 'kp', label: 'Kill %', f: fmt.pct, num: m => m.kills, den: m => m.att },
    { k: 'oeff', label: 'Opp attack efficiency', f: fmt.eff, low: true, num: m => mul(m.opp_att_eff, m.points), den: m => m.points },
    { k: 'ko', label: 'Serve knockout %', f: fmt.pct, num: m => m.ko, den: m => m.serves },
    { k: 'ace', label: 'Ace %', f: fmt.pct, num: m => m.aces, den: m => m.serves },
    { k: 'se', label: 'Serve error %', f: fmt.pct, low: true, num: m => m.serve_err, den: m => m.serves },
    { k: 'gp', label: 'Good pass %', f: fmt.pct, num: m => mul(m.good_pass_pct, m.recs), den: m => m.recs },
    { k: 're', label: 'Reception error %', f: fmt.pct, low: true, num: m => m.rec_err, den: m => m.recs },
    { k: 'pr', label: 'Pass rating', f: fmt.n2, num: m => mul(m.pass_rating, m.recs), den: m => m.recs }
  ];
  const agg = (ms, st) => { let n = 0, d = 0; ms.forEach(m => { const a = st.num(m), b = st.den(m); if (a != null && b && !isNaN(a)) { n += a; d += b; } }); return d ? n / d : null; };
  const d1Teams = teams.filter(t => t.conf !== 'Non-D1' && t.matches >= 3);
  const D1AVG = Object.fromEntries(ST.map(st => [st.k, agg(d1Teams, st)]));
  const D1SD = Object.fromEntries(ST.map(st => { const v = d1Teams.map(t => { const b = st.den(t); return b ? st.num(t) / b : null; }).filter(x => x != null && !isNaN(x)); const mu = v.reduce((a, b) => a + b, 0) / (v.length || 1); return [st.k, Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / (v.length || 1)) || 1]; }));
  const wkOf = date => { const i = W.findIndex(w => date <= w); return i < 0 ? W.length - 1 : i; };
  const byWeek = t => { const out = W.map(() => []); ((D.detail[t] || {}).matches || []).forEach(m => out[wkOf(m.date)].push(m)); return out; };
  const stSel = document.getElementById('tr-st-m'), hcSel = document.getElementById('tr-hc-m');
  stSel.innerHTML = hcSel.innerHTML = ST.map(st => `<option value="${st.k}">${st.label}</option>`).join('');
  stSel.value = 'so'; hcSel.value = 'so';
  const stOf = k => ST.find(x => x.k === k);
  const delta = (st, v) => st.f === fmt.pct ? (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) : st.f === fmt.eff ? (v >= 0 ? '+' : '−') + fmt.eff(Math.abs(v)) : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
  function statTrend() {
    const t1 = s1.value, t2 = s2.value && s2.value !== s1.value ? s2.value : null, st = stOf(stSel.value), card = document.getElementById('tr-st-card');
    if (!D.detail[t1]) { card.hidden = true; return; } card.hidden = false;
    const wk = byWeek(t1), cum = []; let acc = [];
    const weekly = wk.map(ms => agg(ms, st)); wk.forEach(ms => { acc = acc.concat(ms); cum.push(ms.length ? agg(acc, st) : (cum.length ? cum[cum.length - 1] : null)); });
    const rec = ms => `${ms.filter(m => m.result === 'W').length}–${ms.filter(m => m.result === 'L').length}`;
    const acc1 = css('--maroon-ink'), cb = css('--s1'), c2 = css('--s2'), avg = D1AVG[st.k];
    const sets = [
      { type: 'line', label: `${short(t1)} that week`, data: weekly, borderColor: hexA(cb, .5), backgroundColor: cb, borderWidth: 1.5, pointRadius: 5, pointHoverRadius: 7, tension: 0, spanGaps: true, order: 3 },
      { type: 'line', label: `${short(t1)} season to date`, data: cum.map((v, i) => wk.slice(0, i + 1).some(x => x.length) ? v : null), borderColor: acc1, backgroundColor: acc1, borderWidth: 2, pointRadius: 3, tension: .25, spanGaps: true, order: 1 },
      { type: 'line', label: 'D1 average', data: W.map(() => avg), borderColor: css('--ink-3'), borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, order: 2 }
    ];
    if (t2 && D.detail[t2]) { const w2 = byWeek(t2); let a2 = []; const cum2 = w2.map(ms => { a2 = a2.concat(ms); return a2.length ? agg(a2, st) : null; }); sets.push({ type: 'line', label: `${short(t2)} season to date`, data: cum2, borderColor: c2, backgroundColor: c2, borderWidth: 2, pointRadius: 3, tension: .25, spanGaps: true, order: 1 }); }
    mk('c-tr-st', { type: 'line', data: { labels: W.map(wl), datasets: sets }, options: baseOpts({
      plugins: { legend: { display: false }, tooltip: { backgroundColor: css('--ink'), titleColor: css('--page'), bodyColor: css('--page'), padding: 8, cornerRadius: 4, mode: 'index', intersect: false,
        callbacks: { label: c => c.parsed.y == null ? null : `${c.dataset.label}: ${st.f(c.parsed.y)}`, afterBody: it => { const ms = wk[it[0].dataIndex]; return ms.length ? `${short(t1)} ${ms.length} match${ms.length > 1 ? 'es' : ''} (${rec(ms)}) that week` : `${short(t1)}: no scouted matches that week`; } } } },
      scales: { x: { grid: { display: false }, border: { color: css('--axis') } }, y: { grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => st.f(v) } } } }) });
    document.getElementById('tr-st-legend').innerHTML = `<span style="--c:${cb}">${short(t1)} that week</span><span style="--c:${acc1}">${short(t1)} season to date</span>` + (t2 ? `<span style="--c:${c2}">${short(t2)} season to date</span>` : '') + `<span class="dashed" style="--c:var(--ink-3)">D1 average (${st.f(avg)})</span>`;
    const all = wk.flat(), season = agg(all, st);
    document.getElementById('tr-st-sub').textContent = `${short(t1)} · ${st.label}${st.low ? ' · lower is better' : ''}`;
    document.getElementById('tr-st-sum').innerHTML = all.length ? `Season <b>${st.f(season)}</b> · D1 avg ${st.f(avg)} · ${all.length} scouted matches` : 'no scouted matches';
    // every stat × week, tinted against the D1 average
    const good = css('--good'), bad = css('--crit');
    const cell = (s, v) => { if (v == null) return '<td class="c" style="color:var(--ink-3)">—</td>'; const z = (v - D1AVG[s.k]) / D1SD[s.k] * (s.low ? -1 : 1); return `<td class="c" style="background:${hexA(z >= 0 ? good : bad, Math.min(0.42, Math.abs(z) * 0.22))}">${s.f(v)}</td>`; };
    let h = '<thead><tr><th class="l">Stat</th>' + W.map((w, i) => `<th title="${wk[i].length} matches · ${rec(wk[i])}">${wl(w)}<br><span class="rk">${wk[i].length ? rec(wk[i]) : '—'}</span></th>`).join('') + '<th>Season</th><th>D1 avg</th></tr></thead><tbody>';
    ST.forEach(s => { h += `<tr class="${s.k === st.k ? 'am' : ''}"><td class="l">${s.label}</td>` + wk.map(ms => cell(s, ms.length ? agg(ms, s) : null)).join('') + cell(s, agg(all, s)) + `<td class="c" style="color:var(--ink-2)">${s.f(D1AVG[s.k])}</td></tr>`; });
    const tb = document.getElementById('t-tr-st'); tb.innerHTML = h + '</tbody>';
    tb.querySelectorAll('tbody tr').forEach((tr, i) => { tr.style.cursor = 'pointer'; tr.onclick = () => { stSel.value = ST[i].k; statTrend(); }; });
  }
  function hotCold() {
    const st = stOf(hcSel.value), win = +document.getElementById('tr-hc-w').value, mn = +document.getElementById('tr-hc-min').value || 1, cf = document.getElementById('tr-hc-conf').value;
    const cut = W[Math.max(0, W.length - 1 - win)];
    const rows = [];
    Object.keys(D.detail).forEach(t => {
      const conf = CONF_OF[t]; if (!conf || conf === 'Non-D1' || (cf && !inGroup({ team: t, conf }, cf))) return;
      const ms = D.detail[t].matches || []; const a = ms.filter(m => m.date <= cut), b = ms.filter(m => m.date > cut);
      if (a.length < mn || b.length < mn) return;
      const v0 = agg(a, st), v1 = agg(b, st); if (v0 == null || v1 == null) return;
      rows.push({ team: t, conf, v0, v1, d: (v1 - v0) * (st.low ? -1 : 1), n0: a.length, n1: b.length, r1: `${b.filter(m => m.result === 'W').length}–${b.filter(m => m.result === 'L').length}` });
    });
    document.getElementById('tr-hc-sub').textContent = `${st.label} · after ${fmt.date(cut)} vs before · ${rows.length} teams qualify${st.f === fmt.pct ? ' · change in percentage points' : ''}`;
    const hot = rows.filter(r => r.d > 0).sort((a, b) => b.d - a.d).slice(0, 10), cold = rows.filter(r => r.d < 0).sort((a, b) => a.d - b.d).slice(0, 10);
    const vs = [...hot, ...cold].flatMap(r => [r.v0, r.v1]).concat(D1AVG[st.k] ?? []);
    const lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * 0.06 || 0.01, X = v => ((v - lo + pad) / (hi - lo + 2 * pad) * 100).toFixed(2);
    const avgLine = D1AVG[st.k] != null ? `<i class="avg" style="left:${X(D1AVG[st.k])}%" title="D1 average ${st.f(D1AVG[st.k])}"></i>` : '';
    const draw = (id, list, up) => { document.getElementById(id).innerHTML = list.length ? list.map(r => `<div class="db-r${r.team === HL ? ' hl' : ''}" title="${short(r.team)} · before ${st.f(r.v0)} (${r.n0} matches) → recent ${st.f(r.v1)} (${r.n1} matches, ${r.r1})"><div class="db-n">${short(r.team)}<span>${r.conf}</span></div><div class="db-t">${avgLine}<i class="ln" style="left:${Math.min(X(r.v0), X(r.v1))}%;width:${Math.abs(X(r.v1) - X(r.v0))}%"></i><i class="d0" style="left:${X(r.v0)}%"></i><i class="d1" style="left:${X(r.v1)}%"></i></div><div class="db-v ${up ? 'up' : 'dn'}">${delta(st, r.v1 - r.v0)}</div></div>`).join('') : '<p class="note">No teams qualify.</p>'; };
    draw('tr-hot', hot, true); draw('tr-cold', cold, false);
  }
  stSel.addEventListener('change', statTrend);
  ['tr-hc-m', 'tr-hc-w', 'tr-hc-conf', 'tr-hc-min'].forEach(id => document.getElementById(id).addEventListener('input', hotCold));
  hotCold();
  rebuild.push(statTrend);
  s1.addEventListener('change', statTrend); s2.addEventListener('change', statTrend);
  s1.addEventListener('change', () => { chart(); if (PUB) kpis(); }); s2.addEventListener('change', chart);
  since.addEventListener('change', () => { kpis(); movers(); });
  document.getElementById('tr-conf').addEventListener('change', movers);
  kpis(); movers(); heat();
  rebuild.push(chart);
})();

/* ================= BRACKETOLOGY (window.__NCAA__; public) ================= */
(function () {
  const N = window.__NCAA__; const btn = document.getElementById('ncaa-tab');
  if (!N || !N.table || !N.table.length) { btn.hidden = true; goHomeIfOn(btn); return; }
  btn.hidden = false;
  const fut = Object.fromEntries((D.rpi && D.rpi.futures && D.rpi.futures.table ? D.rpi.futures.table : []).map(r => [r.team, r]));
  const now = Object.fromEntries((D.rpi && D.rpi.table ? D.rpi.table : []).map(r => [r.team, r]));
  const rows = N.table.map(r => ({ ...r, proj_rank: (fut[r.team] || {}).proj_rank ?? null, proj_w: (fut[r.team] || {}).proj_w, proj_l: (fut[r.team] || {}).proj_l, now_rank: (now[r.team] || {}).rank_adj ?? null, rec: now[r.team] ? `${now[r.team].w}–${now[r.team].l}` : '' }));
  const a = rows.find(r => r.team === AM) || {}; const cut = N.cut_rank || {};
  document.getElementById('ncaa-sub').textContent = `${N.sims.toLocaleString()} simulated finishes · ${N.remaining.toLocaleString()} D1 matches left · results through ${N.through}`;
  if (PUB) {
    const BT = (N.bracket && N.bracket.teams) || [];
    const fav = BT.slice().sort((x, y) => y.champ - x.champ)[0];
    const one = BT.find(t => t.overall === 1) || rows.slice().sort((x, y) => (x.avg_seed ?? 99) - (y.avg_seed ?? 99))[0];
    const byConf = {}; BT.forEach(t => { byConf[t.conf] = (byConf[t.conf] || 0) + 1; });
    const topC = Object.entries(byConf).sort((x, y) => y[1] - x[1])[0];
    kpi('ncaa-kpis', [
      { l: 'Title favorite', v: fav ? short(fav.team) : '—', d: fav ? `wins it in ${pctP(fav.champ)} of runs` : '' },
      { l: 'Projected No. 1 overall', v: one ? short(one.team) : '—', d: one ? `top-4 seed in ${pctP((rows.find(r => r.team === one.team) || {}).p_top4)} of runs` : '' },
      { l: 'Most bids', v: topC ? topC[0] : '—', d: topC ? `${topC[1]} teams in the projected field` : '' },
      { l: 'Last at-large in', v: cut.median ? '#' + cut.median : '—', d: cut.median ? `RPI rank · 80% of sims #${cut.p10}–#${cut.p90}` : '' },
    ]);
  } else kpi('ncaa-kpis', [
    { l: short(AM) + ' makes the field', v: pctP(a.p_field), d: `at-large ${pctP(a.p_atlarge)} · AQ ${pctP(a.p_aq)}`, am: true },
    { l: 'Hosts (top 16)', v: pctP(a.p_host), d: `top-4 seed ${pctP(a.p_top4)}` },
    { l: 'Average seed line', v: a.avg_seed ? '#' + Number(a.avg_seed).toFixed(1) : '—', d: 'overall order of the field, when in it' },
    { l: 'Projected RPI finish', v: a.proj_rank ? '#' + a.proj_rank : '—', d: a.proj_w != null ? `proj ${a.proj_w}–${a.proj_l} · now #${a.now_rank ?? '—'}` : '' },
    { l: 'Last at-large in', v: cut.median ? '#' + cut.median : '—', d: cut.median ? `RPI rank · 80% of sims #${cut.p10}–#${cut.p90}` : '' },
  ]);
  // ---- projected bracket ----
  const B = N.bracket; const brCard = document.getElementById('ncaa-br-card');
  if (!B || !B.regions) brCard.hidden = true; else {
    const T = Object.fromEntries(B.teams.map(t => [t.team, t])); const LG = window.__LOGOS__ || {};
    const p = v => v == null ? '—' : v >= 0.995 ? '>99' : v < 0.005 ? (v > 0 ? '<1' : '–') : String(Math.round(v * 100));
    const regName = r => `${short(r.host)} Regional`;
    const trow = (name, host) => { const t = T[name] || { team: name }; return `<div class="br-t${name === host ? ' host' : ''}${name === HL ? ' am' : ''}" title="${name}${t.overall ? ' · overall ' + t.overall : ''} · makes field ${pctP(t.p_field)}"><span class="sd">${t.rseed ?? ''}</span><span class="nm">${LG[name] ? `<img src="${LG[name]}" alt="">` : ''}${short(name)} <span class="rk">${t.conf || ''}</span>${t.aq ? '<span class="aq-tag">AQ</span>' : ''}${name !== host && t.miles != null && B.geo ? `<span class="mi">${Number(t.miles).toLocaleString()} mi</span>` : ''}</span><span class="p">${p(t.r32)}</span><span class="p">${p(t.s16)}</span><span class="p">${p(t.e8)}</span><span class="p">${p(t.f4)}</span><span class="p">${p(t.champ)}</span></div>`; };
    document.getElementById('ncaa-br').innerHTML = B.regions.map(r => `<div class="br-reg"><h4>${regName(r)} <small>hosted by the regional #1 · regional semis and final</small></h4>` +
      r.pods.map(pod => `<div class="br-pod"><div class="ph"><span style="text-align:left">at ${short(pod.host)}</span><span>R2</span><span>S16</span><span>E8</span><span>F4</span><span>Title</span></div>` +
        pod.games.map(g => `<div class="br-game">${trow(g[0], pod.host)}${trow(g[1], pod.host)}</div>`).join('') + '</div>').join('') + '</div>').join('');
    const bub = (lab, arr) => `<div><b>${lab}</b>${arr.map(x => `<div class="row"><span>${logoName(x.team, x.conf)}</span><span>${pctP(x.p_field)} in</span></div>`).join('')}</div>`;
    document.getElementById('ncaa-bubble').innerHTML = bub('Last four in', B.bubble.last_in) + bub('First four out', B.bubble.first_out);
    const champs = B.teams.slice().sort((a, b) => b.champ - a.champ).slice(0, 8);
    const inReg = reg => new Set(B.regions[reg - 1].pods.flatMap(pd => pd.games.flat()));
    const ffRow = t => `<div class="br-t br-ffr${t.team === HL ? ' am' : ''}"><span class="sd">${t.rseed ?? ''}</span><span class="nm">${logoName(t.team, t.conf)}</span><span class="p">${p(t.f4)}</span><span class="p">${p(t.final)}</span><span class="p"><b>${p(t.champ)}</b></span></div>`;
    const ffHead = `<div class="br-t br-ffr ph"><span></span><span></span><span class="p">F4</span><span class="p">Final</span><span class="p">Title</span></div>`;
    const topIn = reg => { const S = inReg(reg); return B.teams.filter(t => S.has(t.team)).sort((x, y) => y.f4 - x.f4).slice(0, 3); };
    document.getElementById('ncaa-ff').innerHTML = B.semis.map(([a, b]) => `<div><h4>Semifinal · ${regName(B.regions[a - 1])} v ${regName(B.regions[b - 1])}</h4>${ffHead}${topIn(a).map(ffRow).join('')}<div style="height:6px"></div>${topIn(b).map(ffRow).join('')}</div>`).join('') +
      `<div><h4>Title odds</h4>${ffHead}${champs.map(ffRow).join('')}</div>`;
    document.getElementById('ncaa-br-sub').textContent = `field and seeds from the simulation averages · round odds from ${B.sims.toLocaleString()} runs of this bracket`;
    document.getElementById('ncaa-br-note').textContent = `Per the pre-championships manual: the most likely automatic qualifier from each conference plus the at-large teams most often selected; the top 16 in the committee order are seed groupings 1–4 (the 1-seeds host the regionals, all 16 host rounds 1–2) and the next 16 are groupings 5–8, ${B.geo ? `with seeds 1–16 spread across regions on an S-curve. Seeds 17–32 and the unseeded teams are placed by geography, as close to a pod host as the bracket allows (unseeded teams travel ${B.avg_miles_unseeded} miles on average; mi = distance to the pod host)` : 'spread across regions on an S-curve'}. Pods are 1/8, 4/5, 3/6 and 2/7 with two unseeded teams each, and first- and second-round conference matchups are avoided${(B.adjust || []).length ? ` (to keep them apart, ${B.adjust.map(x => `${short(x.a)} and ${short(x.b)}`).join('; ')} swapped places on adjacent seed lines)` : ''}. R2 = win the first match; then the chance to reach the Sweet 16, Elite 8, Final Four and win the title, with home court for pod and regional hosts.`;
  }
  const view = segCtl('ncaa-seg', render);
  function render() {
    const v = view() || 'all', cf = document.getElementById('ncaa-conf').value, q = document.getElementById('ncaa-q').value.toLowerCase();
    let pool = rows.filter(r => (!cf || inGroup({ team: r.team, conf: r.conf }, cf)) && tm(r.team, q));
    let sort = 'p_field', asc = false;
    if (v === 'host') { pool = pool.filter(r => r.p_host >= 0.01); sort = 'p_host'; }
    else if (v === 'bubble') pool = pool.filter(r => r.p_field >= 0.1 && r.p_field <= 0.9 && r.p_aq < 0.5);
    else if (v === 'aq') { pool = pool.filter(r => r.p_aq >= 0.01).sort((x, y) => y.p_aq - x.p_aq); sort = 'conf'; asc = true; }
    else pool = pool.filter(r => r.p_field >= 0.005 || r.p_aq >= 0.005);
    document.getElementById('ncaa-count').textContent = `${pool.length} teams`;
    table('t-ncaa', pool, [{ key: 'proj_rank', label: 'Proj #', asc: true, fmt: v => v ?? '—' }, { key: 'team', label: 'Team', left: true, asc: true, fmt: v => logoName(v) }, { key: 'conf', label: 'Conf', left: true, asc: true },
      { key: 'now_rank', label: 'Now #', asc: true, fmt: v => v ?? '—' }, { key: 'proj_w', label: 'Proj W–L', fmt: (v, r) => v == null ? '—' : `${r.proj_w}–${r.proj_l}` },
      { key: 'p_field', label: 'Field', fmt: v => `<span class="bar" style="width:${Math.round(v * 60)}px"></span><b>${pctP(v)}</b>` }, { key: 'p_aq', label: 'AQ', fmt: pctP }, { key: 'p_atlarge', label: 'At-large', fmt: pctP },
      { key: 'p_seed32', label: 'Seeded', title: 'Top 32 (seed groupings 1–8)', fmt: pctP }, { key: 'p_host', label: 'Host', title: 'Top 16 seed', fmt: pctP }, { key: 'p_top4', label: 'Top 4', fmt: pctP }, { key: 'avg_seed', label: 'Avg seed', asc: true, fmt: v => v == null ? '—' : Number(v).toFixed(1) }, { key: 'avg_rpi_rank', label: 'Proj RPI #', asc: true, title: 'Average simulated RPI rank with the NCAA bonuses/penalties', fmt: v => v == null ? '—' : Number(v).toFixed(1) }],
      { sort, asc, rowClass: r => r.team === HL ? 'am' : '' });
    document.getElementById('ncaa-note').textContent = `Selection follows the NCAA Division I women's volleyball pre-championships manual, inside each of the ${N.sims.toLocaleString()} simulated seasons: ${N.aq_confs} automatic bids (the manual's list; the simulated conference regular-season champion stands in for the conference's own process) and ${N.at_large} at-large teams with a .500 or better overall record. Teams are ordered by RPI with the manual's bonuses and penalties, then adjacent teams with close RPIs are compared on the primary criteria (head-to-head, results vs common opponents, significant wins and losses${N.kpi_used ? ', KPI' : ''}) with the last 10 matches as the secondary tiebreak — about ${Math.round(N.criteria_swaps)} such swaps per season.${N.kpi_used || PUB ? '' : ' KPI is not included: add data/kpi_2026.csv (team, kpi_rank) to use it.'} The top 32 are seeded, the top 16 in rank order. The committee's judgment, injuries and conference tournaments are not modeled.`;
  }
  ['ncaa-conf', 'ncaa-q'].forEach(id => document.getElementById(id).addEventListener('input', render));
  render();
})();

/* ---------- Bracketology: bids by conference ---------- */
(function () {
  const N = window.__NCAA__, card = document.getElementById('ncaa-cf-card');
  if (!N || !N.table || !N.table.length) { if (card) card.hidden = true; return; }
  const BT = (N.bracket && N.bracket.teams) || [], C = {};
  const get = c => C[c] = C[c] || { conf: c, proj: 0, exp: 0, seeds: 0, bubble: 0, bub: [], field: [], aqT: null, aqP: 0 };
  N.table.forEach(r => { if (!r.conf || r.conf === 'Non-D1') return; const x = get(r.conf); x.exp += r.p_field || 0; if (r.p_field >= 0.2 && r.p_field <= 0.8) { x.bubble++; x.bub.push(r); } if ((r.p_aq || 0) > x.aqP) { x.aqP = r.p_aq; x.aqT = r.team; } });
  BT.forEach(t => { const x = get(t.conf); x.proj++; if (t.overall && t.overall <= 16) x.seeds++; x.field.push(t); });
  const list = Object.values(C).filter(c => c.proj || c.exp >= 0.05).sort((a, b) => b.exp - a.exp || b.proj - a.proj || a.conf.localeCompare(b.conf));
  const inField = new Set(BT.map(t => t.team));
  const multi = list.filter(c => c.proj >= 2);
  document.getElementById('ncaa-cf-sub').textContent = `${list.length} conferences · ${multi.length} multi-bid in the projection · ${multi.reduce((a, c) => a + c.proj, 0)} of 64 bids go to multi-bid leagues`;
  const hlConf = HL ? (N.table.find(r => r.team === HL) || {}).conf : null;
  table('t-ncaa-cf', list, [
    { key: 'conf', label: 'Conference', left: true, asc: true, fmt: v => `<b>${v}</b>` },
    { key: 'proj', label: 'Projected' }, { key: 'exp', label: 'Expected', fmt: v => v.toFixed(1) }, { key: 'seeds', label: 'Seeds' }, { key: 'bubble', label: 'Bubble teams', left: true, fmt: (v, r) => r.bub.length ? r.bub.slice().sort((a, b) => b.p_field - a.p_field).map(t => `${short(t.team)} <span class="rk">${Math.round(t.p_field * 100)}%${inField.has(t.team) ? ' in' : ' out'}</span>`).join(', ') : '—' },
    { key: 'aqP', label: 'AQ favorite', left: true, fmt: (v, r) => r.aqT ? `${short(r.aqT)} <span class="rk">${Math.round(v * 100)}%</span>` : '—' },
    { key: 'field', label: 'In the projected field', left: true, fmt: v => v.slice().sort((a, b) => (a.overall || 99) - (b.overall || 99)).map(t => `${short(t.team)}${t.overall && t.overall <= 16 ? ` <span class="rk">#${t.overall}</span>` : ''}${t.aq ? ' <span class="pos">AQ</span>' : ''}`).join(', ') || '—' }
  ], { sort: 'exp', rowClass: r => r.conf === hlConf ? 'am' : '' });
  hbars('hb-ncaa-cf', list.filter(c => c.exp >= 1.5 || c.proj >= 2).map(c => ({ label: c.conf, sub: `proj ${c.proj}`, value: c.exp, text: c.exp.toFixed(1), hl: c.conf === hlConf,
    tip: `${c.conf}: ${c.exp.toFixed(1)} expected bids · ${c.proj} in the projected bracket · ${c.seeds} seeded · ${c.bubble} on the bubble` })), { lo: 0, ref: 1 });
})();

/* ================= DATA QUALITY ================= */
const dq = D.dq;
kpi('dq-kpis', [
  { l: 'Rows', v: fmt.int(dq.rows), d: `${dq.rows_per_match.min}–${dq.rows_per_match.max} per match, median ${dq.rows_per_match.median}` },
  { l: 'Set anomalies', v: dq.set_anomaly_count, d: `of ${dq.sets.toLocaleString()} sets` },
  { l: 'Match anomalies', v: dq.match_anomalies.length, d: 'set-count / no winner' },
  { l: 'Duplicate matches', v: dq.duplicate_matches.length, d: 'same date + pair' },
  { l: 'Low-coverage teams', v: dq.low_coverage_teams.length, d: '≤ 2 matches' },
  { l: 'Unknown skill rows', v: dq.unknown_skill_rows, d: `${dq.unknown_skill_by_match.length} match(es)` },
  { l: 'Number ↔ name conflicts', v: dq.number_multi_names_count, d: 'team + jersey w/ 2+ names' },
]);
rebuild.push(() => mk('c-dq-date', { type: 'bar', data: { labels: dq.matches_by_date.map(r => fmt.date(r.date)), datasets: [{ data: dq.matches_by_date.map(r => r.n), backgroundColor: css('--s1'), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' }] },
  options: baseOpts({ plugins: { legend: { display: false }, tooltip: { callbacks: { title: i => dq.matches_by_date[i[0].dataIndex].date, label: c => c.parsed.y + ' matches' } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: css('--grid') }, border: { display: false } } } }) }));
rebuild.push(() => mk('c-dq-hist', { type: 'bar', data: { labels: dq.team_match_hist.map(r => r.n_matches + (r.n_matches === 1 ? ' match' : ' matches')), datasets: [{ data: dq.team_match_hist.map(r => r.teams), backgroundColor: dq.team_match_hist.map(r => r.n_matches <= 2 ? css('--serious') : css('--s1')), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' }] },
  options: baseOpts({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y + ' teams' } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: css('--grid') }, border: { display: false } } } }) }));
const flagColor = { 'short set': 'var(--crit)', 'margin < 2': 'var(--serious)', 'extended set margin ≠ 2': 'var(--warn)' };
table('t-dq-sets', dq.set_anomalies, [
  { key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'home', label: 'Match (home vs away)', left: true, asc: true, fmt: (v, r) => `${short(r.home)} vs ${short(r.away)}` },
  { key: 'set_number', label: 'Set' }, { key: 'hs', label: 'Score', fmt: (v, r) => `${r.hs}–${r.vs}` }, { key: 'npts', label: 'Pts' }, { key: 'flag', label: 'Flag', left: true, fmt: v => `<span class="flag" style="--c:${flagColor[v]}">${v}</span>` }
], { sort: 'date', asc: true });
table('t-dq-matches', dq.match_anomalies, [
  { key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'home', label: 'Match (home vs away)', left: true, fmt: (v, r) => `${short(r.home)} vs ${short(r.away)}` }, { key: 'nsets', label: 'Sets' }, { key: 'home_sets', label: 'Won', fmt: (v, r) => `${r.home_sets}–${r.away_sets}` }, { key: 'scores', label: 'Set scores', left: true }
], { sort: 'date', asc: true });
document.getElementById('dq-dup').innerHTML = dq.duplicate_matches.length ? dq.duplicate_matches.map(m => `${m.date} · ${short(m.home)} vs ${short(m.away)} · ${m.scores}`).join('<br>') : 'None found.';
table('t-dq-low', dq.low_coverage_teams, [{ key: 'team', label: 'Team', left: true, asc: true, fmt: short }, { key: 'matches', label: 'Matches' }, { key: 'wins', label: 'W–L', fmt: (v, r) => `${r.wins}–${r.losses}` }], { sort: 'matches', asc: true });
table('t-dq-names', dq.number_multi_names, [{ key: 'team', label: 'Team', left: true, asc: true, fmt: short }, { key: 'player_number', label: '#' }, { key: 'names', label: 'Distinct names' }], { sort: 'names' });
(function () {
  const skills = [...new Set(dq.eval_counts.map(r => r.skill))], codes = ['#', '+', '!', '-', '/', '=', '1'];
  const rows = skills.map(s => { const o = { skill: s, total: 0 }; codes.forEach(c => { const r = dq.eval_counts.find(x => x.skill === s && x.evaluation_code === c); o[c] = r ? r.n : 0; o.total += o[c]; }); return o; });
  table('t-dq-eval', rows, [{ key: 'skill', label: 'Skill', left: true, asc: true }, { key: 'total', label: 'Rows', fmt: fmt.int }, ...codes.map(c => ({ key: c, label: c, fmt: fmt.int }))], { sort: 'total' });
})();
document.getElementById('dq-rows').innerHTML = [
  ['Unknown skill codes', dq.unknown_skill_rows, dq.unknown_skill_by_match.map(m => `${m.match_date} ${short(m.home_team)} vs ${short(m.visiting_team)} (${m.n} rows)`).join('; ')],
  ['Evaluation code "1"', dq.eval_code_1_rows, 'non-standard code, same rows as unknown skills'],
  ['Null player_name', dq.null_player_rows, ''],
  ['Points with null serving_team', dq.null_serving_team, ''],
  ['Attacks missing end_zone', fmt.pct(dq.attack_missing_end_zone), 'share of all attack rows'],
].map(r => `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)"><div><div>${r[0]}</div>${r[2] ? `<div class="note">${r[2]}</div>` : ''}</div><div style="font-weight:600;font-family:'IBM Plex Sans Condensed';font-size:18px">${r[1]}</div></div>`).join('');

/* build charts; rebuild on theme change */
function buildAll() { theme(); rebuild.forEach(f => f()); renderTeams(); }
buildAll();
const mq = window.matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', buildAll);
new MutationObserver(buildAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- Shiny: new-data banner ---------- */
if (window.Shiny) {
  Shiny.addCustomMessageHandler('data_version', v => {
    if (!v || v === D.generated) return;
    if (document.getElementById('databar')) return;
    const b = document.createElement('div'); b.className = 'databar'; b.id = 'databar';
    b.innerHTML = `<span>New data available (built ${v})</span><button type="button" onclick="location.reload()">Reload</button>`;
    document.body.appendChild(b);
  });
}

/* ---------- glossary: search + links from cards ---------- */
(function () {
  const q = document.getElementById('gl-q'); if (!q) return;
  const items = [...document.querySelectorAll('#p-gl dt')].map(dt => ({ dt, dd: dt.nextElementSibling, sec: dt.closest('.gl-sec') }));
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase(); let n = 0;
    items.forEach(({ dt, dd }) => { const hit = !v || (dt.textContent + ' ' + dd.textContent).toLowerCase().includes(v); dt.hidden = dd.hidden = !hit; if (hit) n++; });
    document.querySelectorAll('#p-gl .gl-sec').forEach(sec => sec.hidden = ![...sec.querySelectorAll('dt')].some(d => !d.hidden));
    document.getElementById('gl-count').textContent = v ? `${n} matches` : '';
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('a.gl-link'); if (!a) return; e.preventDefault();
    document.querySelector('.tab[data-tab="gl"]').click();
    const t = document.getElementById('gl-' + a.dataset.gl); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.classList.add('gl-hit'); setTimeout(() => t.classList.remove('gl-hit'), 1500); }
  });
})();
