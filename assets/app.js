const D = window.__DATA__;
// Public site (window.__PUBLIC__): no home team. AM becomes a neutral default (the #1 power team) and nothing is highlighted.
const PUB = !!window.__PUBLIC__;
const AM = PUB ? ((D.power && D.power.table || []).find(r => r.rank === 1) || {}).team || D.am : D.am;
let FAV = null; if (PUB) try { const f = localStorage.getItem('m26fav'); if (f && D.detail && D.detail[f]) FAV = f; } catch (e) {}   // public site: visitor's favorite team (this browser only)
const HL = PUB ? FAV : AM;   // team to highlight
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
/* favorite team colors (public site): the dominant color of the team's logo, tuned for light/dark */
const isDarkUI = () => { const t = document.documentElement.dataset.theme; return t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches); };
function logoColor(src, cb) {
  const im = new Image(); im.onerror = () => cb(null);
  im.onload = () => { try {
    const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 40, 40);
    const d = x.getImageData(0, 0, 40, 40).data, cnt = {};   // most common color bucket (opaque, non-gray pixels), then the true average inside it
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 250) continue; const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn < 40 || mx < 30) continue; const k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); const e = cnt[k] = cnt[k] || [0, 0, 0, 0]; e[0]++; e[1] += r; e[2] += g; e[3] += b; }
    let best = null; for (const k in cnt) if (!best || cnt[k][0] > best[0]) best = cnt[k];
    cb(best ? [best[1] / best[0], best[2] / best[0], best[3] / best[0]].map(Math.round) : null);
  } catch (e) { cb(null); } };
  im.src = src;
}
const rgb2hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h / 6, s, l]; };
const hsl2rgb = (h, s, l) => { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
const hsl = (h, s, l) => '#' + hsl2rgb(h, s, l).map(v => v.toString(16).padStart(2, '0')).join('');   // hex, so Chart.js and CSS both take it
const TEAM_COLORS = {"Kentucky":"#0033A0","Tennessee":"#FF8200","Missouri":"#F1B82D","Florida":"#0021A5","Texas A&M":"#500000","Texas":"#BF5700","LSU":"#461D7C","Arkansas":"#9D2235","Alabama":"#9E1B32","Auburn":"#0C2340","Georgia":"#BA0C2F","Ole Miss":"#CE1126","Mississippi State":"#660000","South Carolina":"#73000A","Vanderbilt":"#866D4B","Oklahoma":"#841617","BYU":"#002E5D","Kansas":"#0051BA","Purdue":"#CEB888","Oregon":"#154733","Michigan State":"#18453B","UCLA":"#2D68C4","Nebraska":"#E41C38","Penn State":"#041E42","Wisconsin":"#C5050C","Indiana":"#990000","Pittsburgh":"#003594","Louisville":"#AD0000","Stanford":"#8C1515","SMU":"#C8102E","TCU":"#4D1979","Baylor":"#154734","Kansas State":"#512888","Utah":"#CC0000","James Madison":"#450084","Washington":"#4B2E83","Minnesota":"#7A0019","Illinois":"#E84A27","Iowa":"#FFCD00","Ohio State":"#BB0000","Michigan":"#00274C","Maryland":"#E03A3E","Rutgers":"#CC0033","Northwestern":"#4E2A84","USC":"#990000","Arizona":"#CC0033","Arizona State":"#8C1D40","Colorado":"#CFB87C","Cincinnati":"#E00122","Houston":"#C8102E","Iowa State":"#C8102E","Texas Tech":"#CC0000","UCF":"#BA9B37","West Virginia":"#002855","Georgia Tech":"#B3A369","Miami":"#F47321","North Carolina":"#7BAFD4","NC State":"#CC0000","Duke":"#003087","Clemson":"#F56600","Florida State":"#782F40","Notre Dame":"#0C2340","Virginia":"#232D4B","Virginia Tech":"#861F41","Boston College":"#8A100B","Syracuse":"#F76900","Wake Forest":"#9E7E38","Cal":"#003262","Creighton":"#005CA9","Marquette":"#003366"};   // official primaries; other teams use their logo's color
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
let FAVC = null; try { const c = JSON.parse(localStorage.getItem('m26favc') || 'null'); if (c && c.team === FAV) FAVC = c.rgb; } catch (e) {}
if (PUB && FAV && TEAM_COLORS[short(FAV)]) FAVC = hex2rgb(TEAM_COLORS[short(FAV)]);
function applyHL() {
  const st = document.documentElement.style;
  if (!PUB || !FAV || !FAVC) { ['--hl', '--hl-ink', '--hl-soft'].forEach(k => st.removeProperty(k)); return; }
  const [h, s0, l0] = rgb2hsl(FAVC), s = Math.max(s0, .35), dk = isDarkUI();
  // text-safe ink: walk lightness until the color has ~4.5:1 contrast on the page (darker on light, lighter on dark)
  const lum = rgb => { const c = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  let L = dk ? Math.min(Math.max(l0, .62), .75) : Math.min(Math.max(l0, .22), .42);
  for (let i = 0; i < 30; i++) { const y = lum(hsl2rgb(h, s, L)); if (dk ? y >= .30 : y <= .175) break; L += dk ? .015 : -.015; }
  const ink = hsl(h, s, L);
  st.setProperty('--hl-ink', ink); st.setProperty('--hl', dk ? hsl(h, s, .45) : ink);
  st.setProperty('--hl-soft', `rgba(${hsl2rgb(h, s, dk ? .6 : .45).join(',')},${dk ? .18 : .10})`);
}
applyHL();
// any team's color: official primary when known, otherwise sampled from its logo (cached)
const TC_CACHE = {};
function teamColor(team, cb) {
  if (!team) return cb(null); const k = short(team); if (TEAM_COLORS[k]) return cb(TEAM_COLORS[k]);
  if (team in TC_CACHE) return cb(TC_CACHE[team]); const src = (window.__LOGOS__ || {})[team]; if (!src) { TC_CACHE[team] = null; return cb(null); }
  logoColor(src, rgb => { TC_CACHE[team] = rgb ? '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('') : null; cb(TC_CACHE[team]); });
}
const paintStripes = root => root.querySelectorAll('[data-tc]').forEach(el => teamColor(el.dataset.tc, c => { if (c) el.style.background = c; }));
if (PUB && FAV && !FAVC && (window.__LOGOS__ || {})[FAV]) logoColor(window.__LOGOS__[FAV], rgb => { if (!rgb) return; FAVC = rgb; try { localStorage.setItem('m26favc', JSON.stringify({ team: FAV, rgb })); } catch (e) {} applyHL(); if (typeof buildAll === 'function') buildAll(); });
const setFav = t => { try { if (t) localStorage.setItem('m26fav', t); else localStorage.removeItem('m26fav'); } catch (e) {} location.reload(); };
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

// ---- player-rating helpers shared by the Team roster, Players cards and leaders (private: only when window.__PRATE__ is present) ----
(function () {
  const PR = window.__PRATE__; if (PUB || !PR || !PR.players) return;
  const SK = [['attack', 'Att'], ['serve', 'Srv'], ['pass', 'Pass'], ['block', 'Blk'], ['dig', 'Dig'], ['setting', 'Set']];
  const SKN = { attack: 'Attack', serve: 'Serve', pass: 'Pass', block: 'Block', dig: 'Dig', setting: 'Set' };
  const by = {}; PR.players.forEach(p => { by[p.team + '|' + p.player] = p; });
  const tone = v => v == null ? '' : v >= 85 ? 't-hi' : v >= 78 ? 't-ok' : v >= 62 ? 't-mid' : 't-lo';
  const compsOf = p => Object.fromEntries(Object.values(p.comps || []).map(c => [PR.comps[c[0]], { d1: c[1], cf: c[2], r: c[3], n: c[4] }]));
  window.__prtLookup = (team, player) => { const p = by[team + '|' + player]; return p && p.ov && p.ov[0] != null ? { p, ov: p.ov[0], comps: compsOf(p) } : null; };
  window.__prtTone = tone; window.__prtSK = SK; window.__prtSKN = SKN; window.__prtComps = compsOf;
  window.__prtBadge = v => v == null ? '<span class="rk">—</span>' : `<span class="prt-bdg ${tone(v)}">${v}</span>`;
  window.__prtSkillHead = () => `<span class="sk-head">${SK.map(([, l]) => `<span>${l}</span>`).join('')}</span>`;
  window.__prtSkills = x => { if (!x) return ''; return `<span class="sk-bars">${SK.map(([k]) => { const c = x.comps[k], v = c ? c.d1 : null;
    return v == null ? `<span class="sk-b none" title="${SKN[k]}: not rated"><i style="height:3px"></i></span>` : `<span class="sk-b ${tone(v)}" title="${SKN[k]}: ${v}"><i style="height:${Math.max(4, Math.round((v - 40) / 59 * 24))}px"></i></span>`; }).join('')}</span>`; };
})();
// ---- headshots (private: app NCAA_PREVIEW only, from the local headshots/ folder; never on the website) ----
window.__hs = (team, player, num) => { const H = window.__HS__; if (PUB || !H) return ''; return H[team + '|' + player] || (num != null && num !== '' ? H[team + '|#' + num] || '' : ''); };
window.__hsTeam = team => { const H = window.__HS__; if (PUB || !H) return false; const k = team + '|'; return Object.keys(H).some(x => x.startsWith(k)); };
window.__hsImg = (team, player, num, cls) => { const u = window.__hs(team, player, num); return u ? `<img class="hs ${cls || ''}" src="${u}" alt="" loading="lazy">` : ''; };
const plLink = r => D.pmatch ? `<a href="#" class="pl-a" data-pl="${String(r.player).replace(/"/g, '&quot;')}" data-plt="${String(r.team).replace(/"/g, '&quot;')}">${r.player}</a>` : r.player;
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
    tbl.innerHTML = h + '</tbody>' + (opts.foot ? opts.foot(cols) : '');
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
const P4 = ['SEC', 'Big Ten', 'Big 12', 'ACC'];
if (!PUB) GROUPS['Power 4'] = teams.filter(t => P4.includes(t.conf)).map(t => t.team);   // app + private preview only
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
  // values rounded to 0.1 so float error (0.58*100 = 57.999…) can't drop a team into the bin below
  const vals = () => chartPool.map(t => Math.round(t.so_pct * 1000) / 10).filter(x => isFinite(x));
  const w = 2; const bins = []; let lo = 40, hi = 76;
  // marked team: the highlighted team (Texas A&M in the app, the visitor's favorite on the public site); none otherwise
  const hlT = HL ? teams.find(t => t.team === HL) : null;
  const hlV = hlT && hlT.so_pct != null ? Math.round(hlT.so_pct * 1000) / 10 : null;
  const amBin = hlV == null ? null : Math.floor(hlV / w) * w;
  { const mk_ = document.getElementById('nat-mark'); if (mk_) { mk_.textContent = hlT ? ` · ${short(HL)} marked` : ''; } }
  rebuild.push(() => { bins.length = 0; const v = vals(); if (v.length) { lo = Math.min(40, Math.floor(Math.min(...v) / w) * w); hi = Math.max(76, Math.floor(Math.max(...v) / w) * w + w); } for (let b = lo; b < hi; b += w) bins.push({ x: b, n: v.filter(x => x >= b && x < b + w).length }); mk('c-so-hist', {
    type: 'bar',
    data: { labels: bins.map(b => `${b.x}–${b.x + w}%`), datasets: [{ data: bins.map(b => b.n), backgroundColor: bins.map(b => b.x === amBin ? css('--hl-ink') : css('--s1')), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom', barPercentage: .92, categoryPercentage: .92 }] },
    options: baseOpts({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y} teams${bins[c.dataIndex].x === amBin ? ` · includes ${short(HL)} (${fmt.pct(hlT.so_pct)})` : ''}` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: css('--grid') }, border: { display: false }, title: { display: true, text: 'teams' } } } })
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
  const hlT = HL ? (PUB ? chartPool.find(t => t.team === HL) : am) : null;
  const style = t => (lm && LOGOS[t.team]) ? LOGOS[t.team] : 'circle';
  mk('c-scatter', {
  type: 'scatter',
  data: { datasets: [
    { label: 'D1 teams', data: pool.map(t => ({ x: t.so_pct * 100, y: t.ps_pct * 100, t: t.team })), pointStyle: pool.map(style), backgroundColor: css('--s1') + 'B3', borderColor: css('--surface'), borderWidth: 1, pointRadius: lm ? 6 : 4.5, pointHoverRadius: lm ? 8 : 7 },
    ...(hlT ? [{ label: short(HL), data: [{ x: hlT.so_pct * 100, y: hlT.ps_pct * 100, t: HL }], pointStyle: [style(hlT)], backgroundColor: css('--hl-ink'), borderColor: css('--surface'), borderWidth: 2, pointRadius: 8, pointHoverRadius: 10 }] : [])
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
/* ---------- Team: starting rotation per set (app only: window.__SETDIST__.starts[team] = [[match index in D.detail[team].matches, set, rotation, served first 1/0, won set 1/0]]; the public site never gets this file) ---------- */
function drawStarts(team) {
  let card = document.getElementById('tm-st-card');
  if (!card) { const anchor = document.getElementById('tm-sd-card'); if (!anchor) return; card = document.createElement('div'); card.className = 'card'; card.id = 'tm-st-card'; card.style.marginBottom = '18px'; anchor.before(card); }
  const det = (D.detail || {})[team], st = ((window.__SETDIST__ || {}).starts || {})[team];
  if (PUB || !det || !st || !st.length) { card.hidden = true; return; }
  card.hidden = false;
  const ORD = [1, 6, 5, 4, 3, 2];   // rotation order: setter in 1, then 6, 5, 4, 3, 2
  const ms = det.matches, nm = short(team), pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';
  const bySet = {}; st.forEach(([mi, sn, rot, srv, won]) => { (bySet[sn] = bySet[sn] || []).push({ mi, rot, srv, won }); });
  const sets = Object.keys(bySet).map(Number).sort((a, b) => a - b);
  const rows = sets.map(sn => {
    const x = bySet[sn], n = x.length, cnt = [1, 2, 3, 4, 5, 6].map(r => x.filter(y => y.rot === r).length), mx = Math.max(...cnt);
    const tops = ORD.filter(r => cnt[r - 1] === mx);
    const usual = xs => { if (!xs.length) return null; const c = [1, 2, 3, 4, 5, 6].map(r => xs.filter(y => y.rot === r).length), m = Math.max(...c); return { rots: ORD.filter(r => c[r - 1] === m), k: m, n: xs.length }; };
    const sv = x.filter(y => y.srv), rc = x.filter(y => !y.srv);
    return { sn, n, tops, topN: mx, cnt, sv: sv.length, svW: sv.filter(y => y.won).length, rc: rc.length, rcW: rc.filter(y => y.won).length, svU: usual(sv), rcU: usual(rc) };
  });
  const uTxt = u => u ? `<b>${u.rots.map(r => 'S' + r).join(' / ')}</b> <span class="rk">${u.k} of ${u.n}</span>` : '<span class="rk">—</span>';
  const chip = (r, c, n, tops) => `<span class="st-chip${tops.includes(r) ? ' top' : ''}" title="Setter in ${r}: ${c} of ${n} sets" style="--a:${n ? (c / n) : 0}">S${r}<b>${c || '·'}</b></span>`;
  const recent = st.slice().sort((a, b) => (ms[b[0]].date || '').localeCompare(ms[a[0]].date || '') || a[1] - b[1]);
  const byMatch = []; recent.forEach(([mi, sn, rot, srv, won]) => { let m = byMatch.find(z => z.mi === mi); if (!m) byMatch.push(m = { mi, s: {} }); m.s[sn] = { rot, srv, won }; });
  const cell = c => c ? `<span class="st-cell ${c.won ? 'w' : 'l'}" title="setter in ${c.rot}, ${c.srv ? 'served' : 'received'} first, ${c.won ? 'won' : 'lost'} the set">S${c.rot} <i>${c.srv ? 'srv' : 'rec'}</i></span>` : '';
  card.innerHTML = `<h3>Starting rotation by set <small>app only · S1–S6 = where the setter is on the first rally of each set (S1 = setter in 1) · srv = served first, rec = received first</small></h3>
    <div class="tbl-wrap"><table class="st-sum"><thead><tr><th class="l">Set</th><th>Sets</th><th class="l">Usually starts in</th><th class="l">Serving first</th><th class="l">Receiving first</th><th class="l">All starts</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td class="l"><b>Set ${r.sn}</b></td><td>${r.n}</td><td class="l"><b>${r.tops.map(t => 'S' + t).join(' / ')}</b> <span class="rk">${r.topN} of ${r.n}</span></td>
      <td class="l">${pct(r.sv, r.n)} of sets · ${uTxt(r.svU)} <span class="rk">· won ${r.svW}–${r.sv - r.svW}</span></td>
      <td class="l">${pct(r.rc, r.n)} of sets · ${uTxt(r.rcU)} <span class="rk">· won ${r.rcW}–${r.rc - r.rcW}</span></td>
      <td class="l">${ORD.map(k => chip(k, r.cnt[k - 1], r.n, r.tops)).join('')}</td></tr>`).join('')}</tbody></table></div>
    <details class="st-more"><summary>Match by match <span class="rk">newest first · green = ${nm} won the set</span></summary>
    <div class="tbl-wrap"><table class="st-mm"><thead><tr><th class="l">Date</th><th class="l">Opponent</th><th>Result</th>${[1, 2, 3, 4, 5].map(k => `<th>Set ${k}</th>`).join('')}</tr></thead><tbody>
    ${byMatch.map(m => { const x = ms[m.mi] || {}; return `<tr><td class="l">${fmt.date(x.date)}</td><td class="l">${short(x.opponent || '')}${x.home === false ? ' <span class="rk">away</span>' : ''}</td><td><span class="pill ${x.result}">${x.result || '—'}</span> ${x.sets_for ?? ''}–${x.sets_against ?? ''}</td>${[1, 2, 3, 4, 5].map(k => `<td>${cell(m.s[k])}</td>`).join('')}</tr>`; }).join('')}
    </tbody></table></div></details>`;
}
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

const NAT_HEAT = new Set(['so_pct', 'att_eff', 'opp_att_eff', 'ko_pct']);
function renderTeams() {
  const q = document.getElementById('t-search').value.toLowerCase(), mn = +document.getElementById('t-min').value || 1, cf = document.getElementById('t-conf').value;
  const pool = cf ? teams.filter(t => inGroup(t, cf)) : teams;
  rankPool(pool);
  chartPool = pool.filter(t => t.matches >= 3); rebuild.slice(0, 2).forEach(f => f());
  const rows = pool.filter(t => t.matches >= mn && tm(t.team, q));
  document.getElementById('t-count').textContent = `${rows.length} teams · ranks within ${cf || 'all of D1'} (3+ matches)`;
  document.getElementById('nat-scope').textContent = cf ? cf : 'D1';
  const view = document.getElementById('t-view').value;
  let cols = view === 'sc' ? [teamCols[0], teamCols[1], teamCols[2], { key: 'sc_sets', label: 'Sets' }, ...scCols('sc_')] : teamCols;
  if (view !== 'sc') {   // light green/red tint on the key rate columns: distance from the D1 average (teams with 3+ matches)
    const ref = teams.filter(t => t.conf !== 'Non-D1' && t.matches >= 3), good = css('--good'), bad = css('--crit');
    cols = cols.map(c => { if (!NAT_HEAT.has(c.key)) return c; const v = ref.map(r => r[c.key]).filter(x => typeof x === 'number' && isFinite(x)); if (v.length < 3) return c;
      const mu = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 0; if (!sd) return c; const low = !!c.asc;
      return { ...c, title: `D1 average ${c.key.includes('eff') ? fmt.eff(mu) : fmt.pct(mu)}${low ? ' · lower is better' : ''}`, bg: x => { if (typeof x !== 'number' || !isFinite(x)) return ''; const z = (x - mu) / sd * (low ? -1 : 1); return Math.abs(z) < 0.35 ? '' : hexA(z > 0 ? good : bad, Math.min(0.32, (Math.abs(z) - 0.2) * 0.16)); } }; });
  }
  table('t-teams', rows, cols, { sort: view === 'sc' ? 'sc_so' : 'so_pct', idKey: 'team', rowClass: r => r.team === HL ? 'am' : '', onClick: drill });
}
document.addEventListener('click', e => { const a = e.target.closest('a[data-open]'); if (!a) return; e.preventDefault(); document.getElementById('tm-sel').value = a.dataset.open; teamPanel.show(a.dataset.open); document.querySelector('.tab[data-tab="am"]').click(); window.scrollTo(0, 0); });
function drill(team) {
  // results (NCAA feed, falls back to the scouted matches) + upcoming schedule for the clicked team
  const el = document.getElementById('t-drill'), R = D.rpi || {}, esc = s => String(s).replace(/"/g, '&quot;');
  const rpiRow = Object.fromEntries((R.table || []).map(r => [r.team, r])), pwRk = Object.fromEntries(((D.power && D.power.table) || []).map(r => [r.team, r.rank]));
  const confOf = t => (rpiRow[t] && rpiRow[t].conf) || ((D.teams || []).find(x => x.team === t) || {}).conf || 'Non-D1';
  const rec = t => rpiRow[t] ? `${rpiRow[t].w}–${rpiRow[t].l}` : '';
  const res = (Array.isArray(R.results) && R.results.length ? R.results : (D.matches || []).map(m => ({ date: m.date, home: m.home, away: m.away, hs: m.home_sets, as: m.away_sets })))
    .filter(m => m.home === team || m.away === team).map(m => {
      const h = m.home === team, opp = h ? m.away : m.home, sf = h ? m.hs : m.as, sa = h ? m.as : m.hs;
      return { date: m.date, opp, site: h ? 'Home' : 'Away', res: sf > sa ? 'W' : 'L', sf, sa, rk: (rpiRow[opp] || {}).rank_adj || null, conf: confOf(opp) };
    });
  const up = ((R.futures && R.futures.remaining) || []).filter(m => m.home === team || m.away === team).map(m => {
    const h = m.home === team, opp = h ? m.away : m.home; return { date: m.date, opp, site: h ? 'Home' : 'Away', rk: (rpiRow[opp] || {}).rank_adj || null, pw: pwRk[opp] || null, orec: rec(opp), conf: confOf(opp) }; });
  const w = res.filter(r => r.res === 'W').length, me = rpiRow[team];
  const vs = (lo, hi) => { const x = res.filter(r => r.rk && r.rk >= lo && r.rk <= hi); return `${x.filter(r => r.res === 'W').length}–${x.filter(r => r.res === 'L').length}`; };
  el.innerHTML = `<h3 style="margin:14px 0 6px">${short(team)} <small>${w}–${res.length - w}${me ? ` · RPI #${me.rank_adj}` : ''}${pwRk[team] ? ` · Power #${pwRk[team]}` : ''} · vs RPI top 25: ${vs(1, 25)} · 26–50: ${vs(26, 50)}${D.detail[team] ? ` · <a href="#" data-open="${esc(team)}" style="color:var(--s1)">open team page →</a>` : ''}</small></h3>
    <div class="grid g2"><div class="card"><h3>Results <small>${res.length} matches</small></h3><div class="tbl-wrap"><table id="t-drill-res"></table></div></div>
    <div class="card"><h3>Upcoming <small>${up.length ? up.length + ' left · ' + up.filter(r => r.rk && r.rk <= 50).length + ' vs RPI top 50' : 'none on the NCAA schedule'}</small></h3><div class="tbl-wrap"><table id="t-drill-up"></table></div></div></div>`;
  const oppCol = { key: 'opp', label: 'Opponent', left: true, asc: true, fmt: (v, r) => `${short(v)} <span class="rk">${r.conf}</span>` };
  table('t-drill-res', res, [{ key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, oppCol, { key: 'site', label: 'H/A', left: true, fmt: v => v[0] },
    { key: 'res', label: 'Result', fmt: (v, r) => `<span class="pill ${v}">${v}</span> ${r.sf}–${r.sa}` },
    { key: 'rk', label: 'Opp RPI', asc: true, fmt: v => v ? '#' + v : '—' }], { sort: 'date', asc: false });
  if (up.length) table('t-drill-up', up, [{ key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, oppCol, { key: 'site', label: 'H/A', left: true, fmt: v => v[0] },
    { key: 'orec', label: 'Opp W–L' }, { key: 'rk', label: 'RPI', asc: true, fmt: v => v ? '#' + v : '—' }, { key: 'pw', label: 'Power', asc: true, fmt: v => v ? '#' + v : '—' }], { sort: 'date', asc: true });
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
    { key: 'player', label: 'Player', left: true, asc: true, fmt: (v, r) => `${plLink(r)} <span class="pos">${r.pos_guess}</span>` },
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
  if (FAV && !new URLSearchParams(location.search).get('team')) cur = FAV;
  sel.value = cur;
  const natEff = D.players.filter(p => p.att >= 60).sort((a, b) => b.att_eff - a.att_eff); const effRank = {}; natEff.forEach((p, i) => effRank[p.team + p.player] = i + 1);
  const line = (c, data, w) => ({ data, borderColor: c, backgroundColor: c, borderWidth: w || 2, pointRadius: data.length > 24 ? 2.5 : 4, pointHoverRadius: 7, tension: .25 });
  let T, det, tm, nm, ranks;
  const isAM = () => cur === HL;
  const accent = () => isAM() ? css('--hl-ink') : css('--s2');
  const rkText = k => ranks.nat[k] ? `<b>#${ranks.nat[k]}</b> nat · #${ranks.conf[k] || '—'} ${T.conf}${ranks.top[k] ? ` · #${ranks.top[k]} Top 15` : ''}` : '—';
  function load() {
    T = teams.find(t => t.team === cur); det = D.detail[cur]; tm = det.matches; nm = short(cur);
    rankPool(teams); const nat = Object.fromEntries(RANKED.map(([k]) => [k, T['rk_' + k]]));
    rankPool(teams.filter(t => t.conf === T.conf)); const conf = Object.fromEntries(RANKED.map(([k]) => [k, T['rk_' + k]]));
    rankPool(teams.filter(t => inGroup(t, 'Top 15'))); const top = Object.fromEntries(RANKED.map(([k]) => [k, inGroup(T, 'Top 15') ? T['rk_' + k] : null])); rankPool(teams);
    ranks = { nat, conf, top };
    document.querySelectorAll('.tm-name').forEach(e => e.textContent = nm);
    const fb = document.getElementById('tm-fav'); if (fb) { fb.hidden = !PUB; fb.classList.toggle('on', cur === FAV); fb.textContent = cur === FAV ? '★ Favorite' : '☆ Make favorite'; fb.title = cur === FAV ? 'Your favorite team (saved in this browser). Click to clear.' : 'Highlight this team across the site and open it first'; }
    document.getElementById('tm-tab').textContent = PUB ? 'Teams' : nm;
    { const hd = document.getElementById('tm-head'); if (hd) { hd.style.borderTopColor = ''; hd.dataset.team = cur; teamColor(cur, c => { if (c && hd.dataset.team === cur) hd.style.borderTopColor = c; }); } }
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
    const RTX = !PUB && window.__prtLookup ? window.__prtLookup : null;   // private ratings (app / preview only)
    const roster = D.players.filter(p => p.team === cur).map(p => { const x = RTX ? RTX(p.team, p.player) : null; return { ...p, effrk: effRank[p.team + p.player] || null, rt: x ? x.ov : null, rtx: x }; });
    table('t-tm-roster', roster, [
      { key: 'number', label: '#', fmt: v => v }, { key: 'player', label: 'Player', left: true, asc: true, fmt: (v, r) => `${plLink(r)} <span class="pos">${r.pos_guess}</span>` }, { key: 'sets', label: 'Sets' },
      ...(RTX ? [{ key: 'rt', label: 'Rating', title: 'Private player rating, 40–99 vs D1 at her position (70 = average). App and your preview only.', fmt: (v, r) => window.__prtBadge(v) },
                 { key: 'rt2', label: window.__prtSkillHead(), left: true, fmt: (v, r) => window.__prtSkills(r.rtx) }] : []),
      { key: 'att', label: 'Att' }, { key: 'kills', label: 'K' }, { key: 'kills_per_set', label: 'K/set', fmt: fmt.n2 }, { key: 'att_eff', label: 'Eff', fmt: fmt.eff }, { key: 'effrk', label: 'Nat rk', fmt: v => v ? '#' + v : '—' },
      { key: 'serves', label: 'Srv' }, { key: 'aces', label: 'Aces' }, { key: 'serve_err', label: 'SE' }, { key: 'recs', label: 'Recs' }, { key: 'rec_err', label: 'RE' }, { key: 'good_pass_pct', label: 'Good pass', fmt: fmt.pct, title: 'Perfect + good passes (R# / R+) per reception' },
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
    mk('c-tm-eff', { type: 'line', data: { labels: mlabels, datasets: [line(ac, tm.map(m => m.kill_pct == null ? null : m.kill_pct * 100), 2.5), line(css('--s1'), tm.map(m => m.opp_kill_pct == null ? null : m.opp_kill_pct * 100))] },
      options: baseOpts({ interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: mtitle, label: c => `${c.datasetIndex ? 'Opponent' : nm} kill% ${c.parsed.y == null ? '—' : c.parsed.y.toFixed(1) + '%'}` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: tm.length > 16, maxTicksLimit: 16 } }, y: { suggestedMin: 20, suggestedMax: 50, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: v => v + '%' } } } }) });
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
  function show(team) { cur = team; try { localStorage.setItem('m26team', cur); } catch (e) {} load(); staticParts(); chartsPart(); drawSetDist(cur); drawStarts(cur); }
  sel.addEventListener('change', () => show(sel.value));
  document.getElementById('tm-win')?.addEventListener('change', () => { load(); chartsPart(); });
  load(); staticParts();
  rebuild.push(() => { load(); chartsPart(); drawSetDist(cur); drawStarts(cur); });   // first draw at startup (and on theme change), not only when the team changes
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
  // Team A = the home team (A&M) or, on the public site, the visitor's favorite; Team B = its next opponent on the schedule
  // (fallback: most recent opponent). Public site with no favorite: #1 vs #2 in the power ratings.
  const BASE = PUB ? FAV : AM;
  let nextGame = null;
  const nextOpp = (() => {
    if (!BASE) { const t2 = ((D.power && D.power.table) || []).find(r => r.rank === 2); if (t2) return t2.team; }
    const today = new Date().toISOString().slice(0, 10), rem = (D.rpi && D.rpi.futures && D.rpi.futures.remaining) || [];
    const g = rem.filter(m => (m.home === BASE || m.away === BASE) && m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const o = g ? (g.home === BASE ? g.away : g.home) : null;
    if (o && teams.some(t => t.team === o && t.conf !== 'Non-D1')) { nextGame = g; return o; }
    const last = ((D.detail[BASE] || {}).matches || []).slice(-1)[0];
    return last && teams.some(t => t.team === last.opponent && t.conf !== 'Non-D1') ? last.opponent : teams.find(t => t.team !== BASE && t.conf !== 'Non-D1').team;
  })();
  fillTeams(selA, CUR, BASE || AM); fillTeams(selB, CUR, nextOpp);
  if (nextGame) {
    const site = document.getElementById('cmp-site'); if (site) site.value = nextGame.home === BASE ? '1' : '-1';
    const nx = document.getElementById('cmp-next');
    if (nx) { const dt = new Date(nextGame.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      nx.textContent = `Next match: ${dt} · ${short(BASE)} ${nextGame.home === BASE ? 'vs' : 'at'} ${short(nextOpp)}`; nx.hidden = false; }
  }
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
      const projCard = document.getElementById('cmp-proj').closest('.card'); if (PUB) { projCard.hidden = true; const ss = document.getElementById('cmp-site'); if (ss && ss.closest('label')) ss.closest('label').hidden = true; return; }   // no win probabilities on the public site
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
  [selA, selB].forEach(x => x.addEventListener('change', () => { const nx = document.getElementById('cmp-next'); if (nx && nextGame) nx.hidden = !(selA.value === BASE && selB.value === nextOpp); }));
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
    const base = [{ key: 'rank', label: '#', asc: true, fmt: v => v }, { key: 'team', label: 'Team', left: true, asc: true, fmt: (v, r) => `${LG[v] ? `<img src="${LG[v]}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:-4px;margin-right:6px">` : ''}${short(v)} <span class="rk">${r.conf}</span>` }, { key: 'matches', label: 'M' }, { key: 'wins', label: 'W–L', fmt: (v, r) => `${r.wins}–${r.losses}` }, ...(px === 'cf' && !PUB ? [{ key: 'charted', label: 'Charted', title: 'Conference matches with a scout file behind the stat columns. W–L and sets are official NCAA results.', fmt: (v, r) => v == null ? '—' : (v < r.matches ? `<span style="color:var(--crit)">${v}</span>` : v) }] : [])];
    const cols = view === 'sc' ? [...base, { key: 'sc_sets', label: 'Sets' }, ...scCols('sc_')] :
      [...base, { key: 'sets', label: 'Sets' }, { key: 'set_win_pct', label: 'Set W%', fmt: fmt.pct }, { key: 'so_pct', label: 'SO %', fmt: fmt.pct }, { key: 'ps_pct', label: 'PS %', fmt: fmt.pct }, { key: 'kill_pct', label: 'Kill %', fmt: fmt.pct }, { key: 'opp_att_eff', label: 'Opp eff', fmt: fmt.eff, asc: true }, { key: 'ko_pct', label: 'KO %', fmt: fmt.pct }, { key: 'good_pass_pct', label: 'Good pass', fmt: fmt.pct }, { key: 'ace_pct', label: 'Ace %', fmt: fmt.pct }, { key: 'serve_err_pct', label: 'SE %', fmt: fmt.pct, asc: true }, { key: 'blocks_per_set', label: 'Blk/set', fmt: fmt.n2 }, { key: 'digs_per_set', label: 'Digs/set', fmt: fmt.n2 }, { key: 'att_eff', label: 'Att eff', fmt: fmt.eff }, { key: 'pass_rating', label: 'Pass', fmt: fmt.n2 }];
    // conditional formatting: green = better, red = worse, strength = standard deviations from the reference average
    const heat = $('grp-heat') ? $('grp-heat').value : '';
    if (heat) {
      const good = css('--good'), bad = css('--crit'), skip = new Set(['rank', 'team', 'matches', 'wins', 'sets', 'sc_sets']);
      const keyOnly = $('grp-heatkey') && $('grp-heatkey').checked;
      const KEY = new Set(['so_pct', 'att_eff', 'opp_att_eff', 'ko_pct', 'sc_so', 'sc_fbso', 'sc_eff_ip', 'sc_ko_pct']);
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
  function p4card() {
    let box = document.getElementById(px + '-p4'); const host = $('t-grp-st') && $('t-grp-st').closest('.card');
    if (!G || !G.p4) { if (box) box.hidden = true; return; }
    if (!box && host) { box = document.createElement('div'); box.className = 'card'; box.id = px + '-p4'; box.style.marginBottom = '16px'; host.before(box); }
    if (!box) return; box.hidden = false;
    const pr = Object.fromEntries(((D.power && D.power.table) || []).map(r => [r.team, r.rank])), rr = Object.fromEntries(((D.rpi && D.rpi.table) || []).map(r => [r.team, r.rank_adj || r.rank]));
    const cOf = t => (byTeam[t] || {}).conf;
    // head-to-head between the leagues, from every match played (non-conference)
    const W = {}; P4.forEach(a => P4.forEach(b => W[a + '|' + b] = [0, 0]));
    D.matches.forEach(m => { const ch = cOf(m.home), ca = cOf(m.away); if (!m.winner || !P4.includes(ch) || !P4.includes(ca) || ch === ca) return; const wc = cOf(m.winner), lc = wc === ch ? ca : ch; W[wc + '|' + lc][0]++; W[lc + '|' + wc][1]++; });
    const avg = (arr, k) => { const v = arr.map(t => t[k]).filter(x => typeof x === 'number' && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const med = arr => { const v = arr.filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const rows = P4.map(c => { const T = teams.filter(t => t.conf === c && t.matches >= 3); const nc = P4.filter(o => o !== c).reduce((a, o) => [a[0] + W[c + '|' + o][0], a[1] + W[c + '|' + o][1]], [0, 0]);
      const top25 = T.filter(t => rr[t.team] && rr[t.team] <= 25).length;
      return { c, n: T.length, nc, top25, pw: med(T.map(t => pr[t.team])), rpi: med(T.map(t => rr[t.team])), so: avg(T, 'so_pct'), ps: avg(T, 'ps_pct'), eff: avg(T, 'att_eff'), opp: avg(T, 'opp_att_eff'), gp: avg(T, 'good_pass_pct'), ace: avg(T, 'ace_pct'), ko: avg(T, 'ko_pct') }; });
    const best = (k, low) => { const v = rows.map(r => r[k]).filter(x => x != null); return low ? Math.min(...v) : Math.max(...v); };
    const cell = (r, k, f, low) => `<td${r[k] != null && r[k] === best(k, low) ? ' class="edge"' : ''}>${r[k] == null ? '—' : f(r[k])}</td>`;
    const pct = v => fmt.pct(v), rec = r => { const g = r.nc[0] + r.nc[1]; return `${r.nc[0]}–${r.nc[1]}${g ? ` <span class="rk">${Math.round(100 * r.nc[0] / g)}%</span>` : ''}`; };
    box.innerHTML = `<h3>Power 4 comparison <span class="priv-tag">private</span> <small>season averages per team (matches vs everyone) · best in each column outlined</small></h3>
      <div class="tbl-wrap"><table class="p4-tbl"><thead><tr><th class="l">League</th><th>Teams</th><th title="Record against the other three Power 4 leagues">vs other P4</th><th>RPI top 25</th><th title="Median team">Median power #</th><th title="Median team">Median RPI #</th><th>SO %</th><th>PS %</th><th>Hitting</th><th>Opp hitting</th><th>Good pass</th><th>Ace %</th><th>KO %</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td class="l"><b>${r.c}</b></td><td>${r.n}</td><td>${rec(r)}</td>${cell(r, 'top25', v => v)}${cell(r, 'pw', v => '#' + v, true)}${cell(r, 'rpi', v => '#' + v, true)}${cell(r, 'so', pct)}${cell(r, 'ps', pct)}${cell(r, 'eff', fmt.eff)}${cell(r, 'opp', fmt.eff, true)}${cell(r, 'gp', pct)}${cell(r, 'ace', pct)}${cell(r, 'ko', pct)}</tr>`).join('')}</tbody></table></div>
      <h3 style="margin-top:16px;font-size:14px">Head to head <small>row league's record against the column league (all matches between them)</small></h3>
      <div class="tbl-wrap"><table class="p4-h2h"><thead><tr><th class="l"></th>${P4.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
      ${P4.map(a => `<tr><td class="l"><b>${a}</b></td>${P4.map(b => { if (a === b) return '<td class="self"></td>'; const [w, l] = W[a + '|' + b], g = w + l; return `<td class="${g && w > l ? 'win' : g && w < l ? 'loss' : ''}">${g ? `${w}–${l}` : '—'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function all() { load(); p4card(); $('grp-ranklabel').textContent = G && G.p4 ? 'power rating (all four leagues together)' : rankLabel; standings(); resultsTbl(); h2h(); compare(); }
  sel.addEventListener('change', all);
  ['grp-view', 'grp-played', 'grp-heat', 'grp-heatkey'].forEach(id => { const e = $(id); if (e) e.addEventListener('change', standings); });
  $('grp-q').addEventListener('input', resultsTbl);
  [selA, selB].forEach(x => x.addEventListener('change', compare));
  all();
}
groupTab('grp', GROUP_DATA, 'grp', 'Top 50', 'group list order (PAVE)');
const CONF_DATA = (D.conferences && !Array.isArray(D.conferences)) ? { ...D.conferences } : {};
if (!PUB && P4.every(c => CONF_DATA[c])) {   // Power 4: the four leagues together (app + preview only), ordered by power rating
  const pr = Object.fromEntries(((D.power && D.power.table) || []).map(r => [r.team, r.rank]));
  const tms = P4.flatMap(c => CONF_DATA[c].teams).sort((a, b) => (pr[a] || 999) - (pr[b] || 999));
  CONF_DATA['Power 4'] = { teams: tms, matches: P4.reduce((n, c) => n + (CONF_DATA[c].matches || 0), 0), stats: Object.assign({}, ...P4.map(c => CONF_DATA[c].stats || {})), p4: true };
}
groupTab('cf', CONF_DATA, 'cf', PUB ? (FAV ? (teams.find(t => t.team === FAV) || {}).conf || '' : '') : ((teams.find(t => t.team === AM) || {}).conf || 'SEC'), 'conference standing (W, L, set win %)');



/* ================= RPI TAB ================= */
(function () {
  const R = D.rpi; const tabBtn = document.querySelector('.tab[data-tab="rpi"]');
  if (!R || !R.table || !R.table.length) { tabBtn.hidden = true; return; }
  const LG = window.__LOGOS__ || {}; const byTeam = Object.fromEntries(teams.map(t => [t.team, t]));
  const F = R.futures && R.futures.table ? R.futures.table : null; const fmap = F ? Object.fromEntries(F.map(r => [r.team, r])) : {};
  const rows = R.table.map(r => ({ ...r, ...(fmap[r.team] ? { proj_rank: fmap[r.team].proj_rank, rank_p10: fmap[r.team].rank_p10, rank_p90: fmap[r.team].rank_p90, p_top25: fmap[r.team].p_top25, p_top50: fmap[r.team].p_top50, proj_w: fmap[r.team].proj_w, proj_l: fmap[r.team].proj_l, remaining: fmap[r.team].remaining, proj_rpi: fmap[r.team].proj_rpi } : {}), delta: r.rank - r.rank_adj }));
  const RT0 = PUB && FAV && rows.some(r => r.team === FAV) ? FAV : AM;   // public site: the visitor's favorite
  let am = rows.find(r => r.team === RT0);
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
  tsel.innerHTML = rows.slice().sort((a, b) => short(a.team).localeCompare(short(b.team))).map(r => `<option value="${r.team.replace(/"/g, '&quot;')}">${short(r.team)}</option>`).join(''); if (am) tsel.value = RT0;
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
  confEl.innerHTML = '<option value="">All conferences</option><option value="__top25">RPI top 25</option><option value="__conf">Conference matches only</option>' + (PUB ? '' : '<option value="__p4">Power 4</option>') + confs.map(c => `<option value="${c}">${c}</option>`).join('');
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
    return `<div class="sc-card ${g.state}${HL && (ha === HL || aa === HL) ? ' fav' : ''}"><div class="sc-stripe"><i data-tc="${(aa || '').replace(/"/g, '&quot;')}"></i><i data-tc="${(ha || '').replace(/"/g, '&quot;')}"></i></div><div class="sc-top">${state}<span class="sc-watch">${watch.map(w => `<span>${w}</span>`).join('')}</span></div>` +
      row(g, g.away, g.home, false) + row(g, g.home, g.away, true) +
      ((sortEl.value === 'close' || (g.state === 'final' && pickOf(g) != null)) && preP(g) != null ? `<div class="sc-odds">${g.state === 'pre' ? 'Win probability' : 'Pregame'}: ${short(teamOf(g.away))} ${Math.round((1 - preP(g)) * 100)}% · ${short(teamOf(g.home))} ${Math.round(preP(g) * 100)}%${g.state === 'pre' && Math.abs(preP(g) - 0.5) <= 0.05 ? ' <b>Toss-up</b>' : ''}${verdict(g)}</div>` : '') +
      `<div class="sc-foot"><span>${cl || ''}</span><span>${cmp}${cmp && g.url ? ' · ' : ''}${g.url ? `<a href="${g.url}" target="_blank" rel="noopener">${g.state === 'pre' ? 'Match page' : 'Box score'} ↗</a>` : ''}</span></div></div>`;
  }
  function render() {
    const v = view() || 'all', cf = confEl.value;
    let list = games.filter(g => v === 'all' || g.state === v);
    if (cf === '__top25') list = list.filter(g => [g.home, g.away].some(s => { const t = teamOf(s); return t && rpiRank[t] && rpiRank[t] <= 25; }));
    else if (cf === '__conf') list = list.filter(g => confOf(g.home) && confOf(g.home) === confOf(g.away));
    else if (cf === '__p4') list = list.filter(g => P4.includes(confOf(g.home)) || P4.includes(confOf(g.away)));
    else if (cf) list = list.filter(g => confOf(g.home) === cf || confOf(g.away) === cf);
    const order = { live: 0, pre: 1, final: 2 };
    if (sortEl.value === 'close') { const c = g => { const p = preP(g); return p == null ? 9 : Math.abs(p - 0.5); }; list.sort((a, b) => c(a) - c(b) || (a.startEpoch || 0) - (b.startEpoch || 0)); }
    else list.sort((a, b) => order[a.state] - order[b.state] || (a.startEpoch || 0) - (b.startEpoch || 0));
    if (HL) { const mine = g => teamOf(g.home) === HL || teamOf(g.away) === HL; list.sort((a, b) => mine(b) - mine(a)); }
    const counts = { live: games.filter(g => g.state === 'live').length, pre: games.filter(g => g.state === 'pre').length, final: games.filter(g => g.state === 'final').length };
    document.querySelectorAll('#sc-seg button').forEach(b => { const n = b.dataset.v === 'all' ? games.length : counts[b.dataset.v]; b.textContent = `${{ all: 'All', live: 'Live', final: 'Final', pre: 'Upcoming' }[b.dataset.v]} ${n}`; });
    if (!list.length) { grid.innerHTML = `<div class="sc-empty">${games.length ? 'No matches for this filter.' : 'No D1 matches on this date.'}</div>`; return; }
    if (grpEl.checked && !cf) {
      const by = {}; list.forEach(g => { const a = confOf(g.away), h = confOf(g.home); const k = a && a === h ? a : 'Nonconference'; (by[k] = by[k] || []).push(g); });
      const keys = Object.keys(by).sort((x, y) => x === 'Nonconference' ? 1 : y === 'Nonconference' ? -1 : x.localeCompare(y));
      grid.innerHTML = keys.map(k => `<div class="sc-grp">${k} <span class="rk">${by[k].length}</span></div><div class="sc-grid">${by[k].map(card).join('')}</div>`).join('');
    } else grid.innerHTML = `<div class="sc-grid">${list.map(card).join('')}</div>`;
    paintStripes(grid);
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
  s1.innerHTML = names.map(opt).join(''); s1.value = PUB && FAV && idx[FAV] ? FAV : (idx[AM] ? AM : names[0]);
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

/* ---------- match audit (private: window.__AUDIT__, local NCAA_PREVIEW only): matches to track down ---------- */
(function () {
  const AU = window.__AUDIT__, panel = document.getElementById('p-dq');
  if (PUB || !AU || !panel) return;
  const SEV = { 'wrong result': 1, 'downloaded, not in data': 1, 'not on NCAA schedule': 1, 'incomplete set': 1, 'no winner / set count': 1,
    'missing rallies': 2, 'not scouted yet': 2, 'never available': 2, 'not in pull ledger': 2, 'flat-coded grades': 2,
    'flat-coded file': 3, 'thin file': 3, 'attack zones missing': 3, 'unknown skill codes': 3, 'unnamed players': 3, 'duplicate file': 3 };
  const SEVL = { 1: 'Wrong or missing in the data', 2: 'No scout file / gaps', 3: 'Detail inside a file' };
  const SEVC = { 1: 'var(--crit)', 2: 'var(--serious)', 3: 'var(--warn)' };
  const WHY = { 'wrong result': 'The file\'s sets don\'t match the official result: usually a file that stops early or is missing a set. Re-download it.',
    'downloaded, not in data': 'The file is in the DVW folder but nothing from it reached Master26Dirty.rds: a parse error, a team name that doesn\'t map (data/team_aliases.csv), or a date far from the schedule (data/date_fixes.csv).',
    'not on NCAA schedule': 'A scout file with no official result for that pair within a day: wrong date or team names in the file, or a duplicate.',
    'incomplete set': 'A set that ends short of 25 (15 in the fifth) or without a 2-point margin.', 'no winner / set count': 'No team reaches 3 sets in the file.',
    'missing rallies': 'Fewer points charted than the set score adds up to.', 'not scouted yet': 'The match exists but isn\'t scouted yet; the pull retries it.',
    'never available': 'No file after the pull\'s retries.', 'not in pull ledger': 'The pull has no record of this match.',
    'flat-coded grades': 'Almost every reception graded \'+\' (or none graded \'#\'): pass and attack grades are unusable.', 'flat-coded file': 'Excluded on purpose: flat-coded.',
    'thin file': 'Very few coded touches.', 'attack zones missing': 'Most attacks have no end zone.', 'unknown skill codes': 'Rows with a skill code the parser doesn\'t know.',
    'unnamed players': 'Players listed only by number. Name them in data/player_name_fixes.csv.', 'duplicate file': 'Same pair and date as another file; the build keeps the fuller one.' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = (AU.rows || []).map((r, i) => ({ ...r, id: String(i), codes: [].concat(r.codes || []), conf: r.conf || '' }));
  const card = document.createElement('div'); card.className = 'card'; card.id = 'dq-aud';
  const counts = {}; rows.forEach(r => r.codes.forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
  const codes = Object.keys(counts).sort((a, b) => (SEV[a] || 3) - (SEV[b] || 3) || counts[b] - counts[a]);
  const confs = [...new Set(rows.map(r => r.conf).filter(Boolean))].sort();
  card.innerHTML = `<h3>Matches to track down <span class="priv-tag" title="Private: only in your local preview (4). Lists file names.">private</span>
      <small>official NCAA results vs the scout files · built ${esc(AU.generated)}</small></h3>
    <p class="note">${AU.official_d1 != null ? `<b>${Number(AU.linked).toLocaleString()}</b> of ${Number(AU.official_d1).toLocaleString()} official D1 results have a scout file. ` : ''}${rows.length.toLocaleString()} matches flagged.${AU.ledger ? '' : ' Pull ledger not found, so missing files show without a reason.'} Click a chip to filter.</p>
    <div class="aud-chips">${codes.map(c => `<button type="button" class="aud-chip" data-c="${esc(c)}" title="${esc(WHY[c] || '')}" style="--c:${SEVC[SEV[c] || 3]}">${esc(c)} <b>${counts[c]}</b></button>`).join('')}</div>
    <div class="controls" style="margin:8px 0">
      <label>Show <select id="aud-sev"><option value="">Everything</option>${[1, 2, 3].map(k => `<option value="${k}">${SEVL[k]}</option>`).join('')}</select></label>
      <label>Conference <select id="aud-conf"><option value="">All</option><option value="@conf">Conference matches only</option>${PUB ? '' : '<option value="__p4">Power 4</option>'}${confs.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
      <label>Search <input id="aud-q" type="search" placeholder="team, file, game id" style="width:180px"></label>
      <button type="button" id="aud-csv">Export CSV</button> <span class="rk" id="aud-n"></span>
    </div>
    <div class="tbl-wrap" style="max-height:620px"><table id="t-dq-aud"></table></div>
    <p class="note">Red = the app shows something different from the official result. Orange = no scout file yet, or gaps. Yellow = the match counts, but some coding is thin, flat or unnamed. Hover a problem for what it means and where to fix it. File names come from the pull ledger.</p>`;
  panel.prepend(card);
  let pick = new Set();
  const flag = c => `<span class="flag" title="${esc(WHY[c] || '')}" style="--c:${SEVC[SEV[c] || 3]}">${esc(c)}</span>`;
  function filtered() {
    const sv = card.querySelector('#aud-sev').value, cf = card.querySelector('#aud-conf').value, q = card.querySelector('#aud-q').value.trim().toLowerCase();
    return rows.filter(r => (!sv || r.codes.some(c => String(SEV[c] || 3) === sv)) && (!cf || (cf === '@conf' ? r.conf : cf === '__p4' ? P4.includes(r.conf) : r.conf === cf)) && (!pick.size || r.codes.some(c => pick.has(c)))
      && (!q || [r.home, r.away, r.file, r.game_id, short(r.home), short(r.away)].some(x => String(x || '').toLowerCase().includes(q))));
  }
  function render() {
    const rs = filtered(); card.querySelector('#aud-n').textContent = `${rs.length} shown`;
    card.querySelectorAll('.aud-chip').forEach(b => b.classList.toggle('on', pick.has(b.dataset.c)));
    table('t-dq-aud', rs, [
      { key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date },
      { key: 'home', label: 'Match', left: true, asc: true, fmt: (v, r) => `${esc(short(r.away))} <span class="rk">at</span> ${esc(short(r.home))}` },
      { key: 'conf', label: 'Conf', left: true, asc: true, fmt: v => v ? esc(v) : '<span class="rk">non-conf</span>' },
      { key: 'official', label: 'Official', fmt: (v, r) => v ? esc(v) + (r.scouted && r.scouted !== v ? ` <span class="rk">file ${esc(r.scouted)}</span>` : '') : (r.scouted ? `<span class="rk">file ${esc(r.scouted)}</span>` : '—') },
      { key: 'sev', label: 'Problem', left: true, asc: true, fmt: (v, r) => r.codes.map(flag).join(' ') },
      { key: 'detail', label: 'Detail', left: true, fmt: v => `<span class="aud-d">${esc(v)}</span>` },
      { key: 'file', label: 'File', left: true, asc: true, fmt: (v, r) => v ? `<code class="aud-f">${esc(v)}</code> <button type="button" class="aud-cp" data-f="${esc(v)}" title="Copy file name">copy</button>` : (r.game_id ? `<span class="rk">NCAA ${esc(r.game_id)}</span>` : '—') }
    ], { sort: 'sev', asc: true });
  }
  card.addEventListener('click', e => {
    const ch = e.target.closest('.aud-chip'); if (ch) { const c = ch.dataset.c; pick.has(c) ? pick.delete(c) : pick.add(c); render(); return; }
    const cp = e.target.closest('.aud-cp'); if (cp) { e.stopPropagation(); (navigator.clipboard ? navigator.clipboard.writeText(cp.dataset.f) : Promise.reject()).then(() => { cp.textContent = 'copied'; setTimeout(() => cp.textContent = 'copy', 1200); }).catch(() => {}); return; }
    if (e.target.id === 'aud-csv') {
      const rs = filtered(), cols = ['date', 'away', 'home', 'conf', 'official', 'scouted', 'problems', 'detail', 'file', 'game_id'];
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [cols.join(',')].concat(rs.map(r => cols.map(c => q(c === 'problems' ? r.codes.join('; ') : r[c])).join(','))).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `match_audit_${String(AU.generated).slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  });
  ['aud-sev', 'aud-conf'].forEach(id => card.querySelector('#' + id).addEventListener('change', render));
  card.querySelector('#aud-q').addEventListener('input', render);
  render();
})();

/* ================= TPP STATS + TRANSFER PORTAL (window.__TPP__, window.__PORTAL__; private: local NCAA_PREVIEW run only, never deployed or published) ================= */
const TPPD = (() => {
  const T = window.__TPP__; if (PUB || !T || !T.players) return null;
  const K = T.keys, ix = Object.fromEntries(K.map((k, i) => [k, i])), VI = Object.fromEntries((T.vols || []).map((k, i) => [k, i]));
  const by = {}; T.players.forEach(r => { by[r.t + '|' + r.n] = r; });
  // portal athletes not playing this season: their 2025 TPP row (from the 2025 TPP file), re-keyed to this season's stat order
  const by25 = {}, T25 = window.__PORTAL__ && window.__PORTAL__.tpp25;
  if (T25 && T25.players) { const i25 = Object.fromEntries(T25.keys.map((k, i) => [k, i])), v25 = Object.fromEntries((T25.vols || []).map((k, i) => [k, i]));
    const rk = a => a ? K.map(k => i25[k] == null ? null : a[i25[k]]) : null;
    T25.players.forEach(r => { by25['2025:' + r.t + '|' + r.n] = { ...r, v: rk(r.v), p: rk(r.p), a: rk(r.a), pa: rk(r.pa), vol: (T.vols || []).map(k => v25[k] == null ? null : r.vol[v25[k]]), y: '2025' }; }); }
  const val = (r, k, w) => { const a = r[w || 'v']; const v = a ? a[ix[k]] : null; return v == null ? null : v; };
  const vol = (r, k) => r.vol ? r.vol[VI[k]] : null;
  const fmtT = (k, v) => { if (v == null) return '—';
    if (k === 'atk_eff' || /_eff$/.test(k) || /ABE$/.test(k)) return fmt.eff(v);
    if (/eVAr$/.test(k)) return (v > 0 ? '+' : '') + v.toFixed(1);
    if (/_att$/.test(k)) return Math.round(v).toLocaleString();
    if (k === 'eVA' || k === 'eVA100') return (v > 0 ? '+' : '') + v.toFixed(1);
    if (k === 'KAx_p' || k === 'AAx_p') return (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
    if (k === 'KAx' || k === 'AAx') return (v > 0 ? '+' : '') + v.toFixed(1);
    if (k === 'xKill' || k === 'xAssists') return v.toFixed(1);
    return fmt.pct(v); };
  const dfmt = (k, d) => { if (d == null || Math.abs(d) < 1e-9) return ''; if (/eVAr$/.test(k) || /_att$/.test(k) || k === 'eVA' || k === 'eVA100' || k === 'KAx' || k === 'AAx') return (d > 0 ? '+' : '') + d.toFixed(1);
    if (k === 'atk_eff' || /_eff$/.test(k) || /ABE$/.test(k)) return (d > 0 ? '+' : '') + d.toFixed(3).replace(/^(-?)0\./, '$1.').replace(/^\+?(-?)0\./, '$1.'); return (d > 0 ? '+' : '') + (d * 100).toFixed(1); };
  const low = new Set(T.low || []);
  const lbl = k => (T.labels || {})[k] || k, grp = k => (T.groups || {})[k] || 'attack';
  return { T, K, by, by25, val, vol, fmtT, dfmt, low, lbl, grp, pos: T.positions || {} };
})();

/* percentile wheel pop-out: click any wheel to see it bigger */
(function () {
  const dlg = document.createElement('dialog'); dlg.id = 'wheel-pop'; document.body.appendChild(dlg);
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.wp-x')) dlg.close(); });
  document.addEventListener('click', e => { const w = e.target.closest('.prt-wheel-svg'); if (!w) return; const host = w.closest('[data-wheel]'); if (!host || !host.__items) return;
    dlg.innerHTML = `<div class="wp-in"><button class="wp-x pp-x" aria-label="Close">×</button><button type="button" class="wp-dl">Download PNG</button><h3>${host.__title || 'Percentile wheel'}</h3><div class="wp-body"></div></div>`;
    prtWheel(dlg.querySelector('.wp-body'), host.__items, host.__legend2, host.__opts); if (!dlg.open) dlg.showModal();
    dlg.querySelector('.wp-dl').onclick = () => wheelPng(dlg.querySelector('.wp-body'), host.__title || 'Percentile wheel'); });
  // ---- save the enlarged wheel as a PNG: title, wheel (fonts embedded) and legend on white, 2x for sharp text ----
  let fontCss = null;
  async function embedFonts() {
    if (fontCss != null) return fontCss;
    try {
      const css = await fetch('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap').then(r => r.text());
      const blocks = css.split('@font-face').slice(1).filter(b => /U\+0000-00FF/.test(b));   // latin subset only
      const out = [];
      for (const b of blocks) { const url = (b.match(/url\((https:[^)]+)\)/) || [])[1], wt = (b.match(/font-weight:\s*(\d+)/) || [])[1]; if (!url) continue;
        const buf = await fetch(url).then(r => r.arrayBuffer()); let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
        out.push(`@font-face{font-family:'IBM Plex Sans';font-weight:${wt};src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`); }
      fontCss = out.join('');
    } catch (e) { fontCss = ''; }
    return fontCss;
  }
  async function wheelPng(body, title) {
    const svg = body.querySelector('svg'); if (!svg) return;
    const btn = dlg.querySelector('.wp-dl'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const vb = svg.viewBox.baseVal, S = 2, W = 1400, pad = 56;
      const cl = svg.cloneNode(true); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const M = 120; cl.setAttribute('viewBox', `${vb.x - M} ${vb.y - M} ${vb.width + 2 * M} ${vb.height + 2 * M}`);   // room for edge labels; trimmed below
      cl.setAttribute('width', vb.width + 2 * M); cl.setAttribute('height', vb.height + 2 * M);
      const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      st.textContent = (await embedFonts()) + "text{font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif}"; cl.insertBefore(st, cl.firstChild);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(cl)], { type: 'image/svg+xml' }));
      const img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = url; });
      // draw the wheel once off-screen, then trim the empty margin around it
      const tw0 = (W - pad * 2) * S * 2, th0 = tw0 * (vb.height + 2 * M) / (vb.width + 2 * M), tc = document.createElement('canvas'); tc.width = tw0; tc.height = th0;
      const tg = tc.getContext('2d'); tg.fillStyle = '#FFFFFF'; tg.fillRect(0, 0, tw0, th0); tg.drawImage(img, 0, 0, tw0, th0);
      const px = tg.getImageData(0, 0, tw0, th0).data; let x0 = tw0, y0 = th0, x1 = 0, y1 = 0;
      for (let yy = 0; yy < th0; yy += 2) for (let xx = 0; xx < tw0; xx += 2) { const k = (yy * tw0 + xx) * 4; if (px[k] < 245 || px[k + 1] < 245 || px[k + 2] < 245) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; } }
      if (x1 <= x0) { x0 = 0; y0 = 0; x1 = tw0; y1 = th0; }
      const cw = x1 - x0, ch = y1 - y0; let ww = W - pad * 2, wh = ch * ww / cw; if (wh > 1500) { wh = 1500; ww = cw * wh / ch; }
      const items = [...body.querySelectorAll('.prt-wheel-leg > span')].filter(s => s.querySelector('i')).map(s => ({ c: s.querySelector('i').style.background, t: s.textContent.trim() }));
      const note = (body.querySelector('.prt-wheel-leg .rk') || {}).textContent || '';
      const H = pad + 70 + wh + 100 + pad;
      const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; const g = cv.getContext('2d'); g.scale(S, S);
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
      const tt = document.createElement('div'); tt.innerHTML = title;
      g.fillStyle = '#141414'; g.font = "600 34px 'IBM Plex Sans', Helvetica, Arial, sans-serif"; g.textBaseline = 'top'; g.fillText(tt.textContent.trim(), pad, pad);
      g.drawImage(tc, x0, y0, x1 - x0, y1 - y0, (W - ww) / 2, pad + 70, ww, wh); URL.revokeObjectURL(url);
      let x = pad, y = pad + 70 + wh + 34; g.font = "500 22px 'IBM Plex Sans', Helvetica, Arial, sans-serif";
      items.forEach(it => { g.fillStyle = it.c; g.fillRect(x, y + 3, 18, 18); g.fillStyle = '#333'; g.fillText(it.t, x + 26, y); x += 26 + g.measureText(it.t).width + 30; });
      g.fillStyle = '#888'; g.font = "400 18px 'IBM Plex Sans', Helvetica, Arial, sans-serif"; g.fillText(note.replace(/\s*·\s*click to enlarge/, ''), pad, y + 38);
      const a = document.createElement('a'); a.download = tt.textContent.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.png';
      a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    } finally { if (btn) { btn.disabled = false; btn.textContent = 'Download PNG'; } }
  }
})();

(function () {
  if (!TPPD) return;
  const { T, by: by26, by25, val, vol, fmtT, dfmt, low, lbl, grp } = TPPD;
  const by = new Proxy({}, { get: (_, k) => by26[k] || by25[k] });   // '2025:<team>|<player>' = her 2025 row (portal athletes not playing this season)
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PORT = window.__PORTAL__ && window.__PORTAL__.athletes ? window.__PORTAL__ : null, SEC = (PORT && PORT.sec) || 'SEC';
  const inPortal = {}; if (PORT) PORT.athletes.forEach(a => { if (a.matched) inPortal[(a.season === '2025' ? '2025:' + a.team25 : a.team) + '|' + a.player] = a; });
  const POSL = { OH: 'Outside', OPP: 'Opposite', MB: 'Middle', S: 'Setter', 'DS/L': 'Libero / DS', SS: 'Serving specialist' };
  const pctCell = p => p == null ? '' : `<span class="tp-pc" style="--w:${Math.round(p * 100)}%;--c:${p >= .75 ? 'var(--good)' : p <= .25 ? 'var(--crit)' : 'var(--ink-3)'}">${Math.round(p * 100)}</span>`;
  // wheel items for a player from her TPP row: wedge = her percentile after adjusting to the SEC (SEC players and stats without an adjustment use the raw percentile)
  window.__tppWheel = (tm, pl) => { const r = by[tm + '|' + pl]; if (!r) return null; const keys = (TPPD.pos[r.pos] || []).filter(k => !/_att$/.test(k) && val(r, k, 'p') != null); // attempt counts stay in the table, not the wheel
    // wedges follow the position's stat list order (e.g. Joe's libero/DS order)
    return { pos: r.pos, items: keys.map(k => { const p = val(r, k, 'p'), pa = val(r, k, 'pa'), useA = pa != null && r.c !== SEC;
      return { label: lbl(k), comp: grp(k), p: useA ? pa : p, p3: null,
        tip: useA ? `${lbl(k)} adjusted to ${SEC}: ${fmtT(k, val(r, k, 'a'))} · ${Math.round(pa * 100)}th percentile · raw ${fmtT(k, val(r, k))} (${Math.round(p * 100)}th)`
          : `${lbl(k)}: ${fmtT(k, val(r, k))} · ${Math.round(p * 100)}th percentile among D1 ${r.pos}` }; }) }; };
  // player card section: every player's TPP stats, raw and adjusted to the SEC
  // player card section: TPP wheel + summary up top, then the full stat table grouped by skill
  const GRPN = { overall: 'Overall', attack: 'Attack', block: 'Block', serve: 'Serve', pass: 'Pass', dig: 'Dig', setting: 'Set' };
  const pbar = p => { if (p == null) return '<span class="rk">—</span>'; const c = p >= .75 ? 'hi' : p <= .25 ? 'lo' : '';
    return `<span class="tp-pb ${c}"><i style="width:${Math.max(3, Math.round(p * 100))}%"></i></span><b class="tp-pn ${c}">${Math.round(p * 100)}</b>`; };
  window.__tpSection = (tm, pl) => {
    const r = by[tm + '|' + pl]; if (!r) return '';
    const keys = TPPD.pos[r.pos] || [], pa = inPortal[tm + '|' + pl], isSec = r.c === SEC, PL = POSL[r.pos] || r.pos;
    // summary tiles: expected stats for attackers / setters
    const kt = (l, v, d) => `<div class="tp-k"><div class="l">${l}</div><div class="v">${v}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`;
    const pA = k => { const a = isSec ? null : val(r, k, 'pa'); return a != null ? a : val(r, k, 'p'); };   // adjusted percentile when there is one
    const pc = k => { const p = pA(k); return p == null ? '' : `${Math.round(p * 100)}th pctl`; };
    const atkX = val(r, 'xKill') != null && (['OH', 'OPP', 'MB'].includes(r.pos) || vol(r, 'x_att') >= 50);
    const setX = val(r, 'xAssists') != null && (r.pos === 'S' || vol(r, 'x_sets') >= 100);
    const vA = k => { const a = isSec ? null : val(r, k, 'a'); return a != null ? a : val(r, k); };   // adjusted value when there is one
    const tiles = [kt('eVA', fmtT('eVA', vA('eVA')), pc('eVA')), kt('eVA100', fmtT('eVA100', vA('eVA100')), pc('eVA100'))]
      .concat(setX ? [kt('Assists', vol(r, 'assists') ?? '—', `xAssists ${fmtT('xAssists', vA('xAssists'))}`), kt('AAx', fmtT('AAx', vA('AAx')), pc('AAx')), kt('AAx %', fmtT('AAx_p', vA('AAx_p')), pc('AAx_p'))] : [])
      .concat(atkX ? [kt('Kills', vol(r, 'kills') ?? '—', `xKill ${fmtT('xKill', vA('xKill'))}`), kt('KAx', fmtT('KAx', vA('KAx')), pc('KAx')), kt('KAx %', fmtT('KAx_p', vA('KAx_p')), pc('KAx_p'))] : []).join('');
    // best and lowest (rate stats only)
    const ranked = keys.filter(k => !/_att$/.test(k) && !['eVA', 'eVA100', 'xKill', 'xAssists'].includes(k) && pA(k) != null).map(k => [k, pA(k)]).sort((x, y) => y[1] - x[1]);
    const chip = ([k, p]) => `<span class="tp-chip"><i style="background:${WHEEL_C[grp(k)]}"></i>${esc(lbl(k))} <b>${Math.round(p * 100)}</b></span>`;
    const best = ranked.slice(0, 4).map(chip).join(''), worst = ranked.slice(-3).reverse().filter(x => x[1] < .5).map(chip).join('');
    // table, grouped by skill in her position's order
    let lastG = '';
    const rows = keys.map(k => { const v = val(r, k); if (v == null) return ''; const g = grp(k), a = val(r, k, 'a'), p = val(r, k, 'p'), q = val(r, k, 'pa');
      const head = g !== lastG ? `<tr class="tp-g"><td colspan="${isSec ? 3 : 5}"><i style="background:${WHEEL_C[g]}"></i>${GRPN[g] || g}</td></tr>` : ''; lastG = g;
      const d = a != null ? a - v : null, good = d == null ? 0 : (d > 0) !== low.has(k) ? 1 : -1;
      const adj = isSec ? '' : `<td class="tp-a">${a == null ? '<span class="rk">—</span>' : fmtT(k, a) + (d != null && Math.abs(d) > 1e-9 ? ` <span class="tp-d ${good > 0 ? 'up' : 'dn'}">${dfmt(k, d)}</span>` : '')}</td><td class="tp-p">${pbar(q)}</td>`;
      return `${head}<tr><td class="l">${esc(lbl(k))}${low.has(k) ? ' <span class="rk" title="Lower is better; the percentile is flipped">↓</span>' : ''}</td><td>${fmtT(k, v)}</td><td class="tp-p">${pbar(p)}</td>${adj}</tr>`; }).join('');
    return `<h3 class="pp-h3"><span class="priv-tag">private</span> <small class="rk" style="text-transform:none;letter-spacing:0">${PL} · vs D1 ${PL.toLowerCase()}s${r.y ? ` · <b>${r.y} season</b>` : ''}${pa ? ' · <b>in the transfer portal</b>' + (Object.keys(pa.extra || {}).length ? ' · ' + Object.entries(pa.extra).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ') : '') : ''}</small></h3>
      <div class="tp-top"><div class="tp-wheel" id="w-pp-tpp"></div>
        <div class="tp-side"><div class="tp-ks">${tiles}</div>
          ${best ? `<div class="tp-lst"><div class="l">Best</div>${best}</div>` : ''}${worst ? `<div class="tp-lst"><div class="l">Lowest</div>${worst}</div>` : ''}
          ${isSec ? '' : `<p class="note">Wheel, tiles and Best / Lowest use her percentiles after adjusting to the ${esc(SEC)}. The table shows both.</p>`}</div></div>
      <div class="tbl-wrap"><table class="tp-tbl"><thead><tr><th class="l">Stat</th><th>Value</th><th class="tp-p">D1 percentile</th>${isSec ? '' : `<th>Adjusted to ${esc(SEC)}</th><th class="tp-p">Adj. percentile</th>`}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="note">Percentile = where she ranks among D1 ${esc(PL.toLowerCase())}s with enough volume. Green = top quarter, red = bottom quarter. ↓ = lower is better (flipped so a high percentile is always good).${isSec ? '' : ` Adjusted to ${esc(SEC)} uses conference adjustment coefficients.`} KAx / AAx = kills / assists above expected for the situations she got.</p>`;
  };
  window.__tpAfter = (tm, pl, dlgEl) => { const el = dlgEl.querySelector('#w-pp-tpp'); if (!el) return; const tw = window.__tppWheel(tm, pl);
    if (tw && tw.items.length) prtWheel(el, tw.items, null, { title: `${esc(pl)} · ${tw.pos} · D1 percentiles${(by[tm + '|' + pl] || {}).c !== SEC ? `, adjusted to ${SEC}` : ''}`, adj: (by[tm + '|' + pl] || {}).c !== SEC ? SEC : '' }); else el.innerHTML = '<p class="note">Not enough volume for percentiles yet.</p>'; };
  window.__tpHas = (tm, pl) => !!inPortal[tm + '|' + pl];
  // ---------- Transfer portal tab: only the athletes on the portal list ----------
  const btn = document.getElementById('tp-tab'), card = document.getElementById('tp-card');
  if (!PORT || !btn || !card) { if (btn) btn.hidden = true; return; }
  btn.hidden = false; btn.innerHTML = 'Transfer portal <span class="priv-tag" title="Private: in the app and your local preview. Never on the website.">private</span>';
  const PREV = window.__PREVIEW__ !== false;   // Review matches saves to your Mac, so it only runs in 4 Private preview
  const PRL = window.__PRATE__ && window.__PRATE__.players ? Object.fromEntries(window.__PRATE__.players.map(p => [p.team + '|' + p.player, p])) : {};
  const rowOf = (a, i) => { const k25 = a.season === '2025' ? '2025:' + a.team25 + '|' + a.player : null;
    const r = !a.matched ? null : k25 ? by[k25] : by[a.team + '|' + a.player], pr = a.matched && !k25 && !a.possible ? PRL[a.team + '|' + a.player] : null;
    return { id: String(i), ...a, r, pos: r ? r.pos : '', ov: pr && pr.ov ? pr.ov[0] : null, ovr: pr && pr.ov ? pr.ov[2] : null, ovn: pr && pr.ov ? pr.ov[3] : null }; };
  const A = PORT.athletes.map(rowOf);
  const ALL = ['eVA', 'eVA100', 'atk_ovr_eVAr', 'atk_eff', 'blk_ovr_eVAr', 'srv_eVAr', 'pass_eVAr', 'pass_GPPP_p', 'dig_ovr_eVAr', 'set_ovr_eVAr'];
  const extraKeys = [...new Set(A.flatMap(a => Object.keys(a.extra || {})))];
  let view = 'adj', pos = '';
  card.innerHTML = `<h3>Transfer portal <span class="priv-tag">private</span> <small>${A.length} athletes from ${esc(PORT.source)} · built ${esc(PORT.generated)}</small></h3>
    <div class="seg" id="tp-mode" style="margin:6px 0 4px"${PREV ? '' : ' hidden'}><button type="button" data-m="players" class="on">Players</button><button type="button" data-m="review"${PREV ? '' : ' hidden'}>Review matches <span id="tp-rn"></span></button></div>
    <div id="tp-rev" hidden></div>
    <div id="tp-watch"></div>
    <div class="controls" id="tp-ctl" style="margin:8px 0 6px">
      <div class="seg" id="tp-view"><button type="button" data-v="adj" class="on">Adjusted to ${esc(SEC)}</button><button type="button" data-v="raw">Raw stats</button></div>
      <label>Position <select id="tp-pos"><option value="">All positions</option>${Object.keys(POSL).map(p => `<option value="${p}">${POSL[p]}</option>`).join('')}</select></label>
      <label>Entered <select id="tp-new"><option value="">Any time</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
      <label class="tp-wol"><input type="checkbox" id="tp-wo"> Watchlist only</label>
      <label>Search <input id="tp-q" type="search" placeholder="name or school" style="width:170px"></label>
      <span class="rk" id="tp-n"></span>
    </div>
    <div class="tbl-wrap" id="tp-tw"><table id="t-tp"></table></div>
    <p class="note" id="tp-note"></p>`;
  const q = () => card.querySelector('#tp-q').value.trim().toLowerCase();
  // days since she entered the portal ("Entered portal" column of the NCAA list, MM/DD/YYYY; dates only, so "last 24 hours" = entered today or yesterday)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysIn = a => { const m = String((a.extra || {})['Entered portal'] || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return null;
    return Math.round((today - new Date(+m[3], +m[1] - 1, +m[2])) / 864e5); };
  A.forEach(a => { a.days = daysIn(a); });
  const newTag = a => a.days != null && a.days <= 1 ? ` <span class="tp-tag new" title="Entered the portal ${a.days === 0 ? 'today' : 'yesterday'}">new</span>` : '';
  const newN = () => +card.querySelector('#tp-new').value || 0;
  // ---- watchlist (portal/watchlist.csv): star = watched; in 4 the star and the Add box edit the file ----
  const WL = (PORT.watch || []).map(w => ({ ...w, hits: w.hits || [] }));
  const canEdit = () => PREV && !!(window.Shiny && window.Shiny.setInputValue);
  const sendWatch = rec => { if (canEdit()) window.Shiny.setInputValue('portal_watch', rec, { priority: 'event' }); };
  const recent = d => d && (today - new Date(d + 'T00:00:00')) / 864e5 <= 7;
  const starOf = a => a.watch ? `<button type="button" class="tp-star on" data-wid="${esc(a.id)}" title="On your watchlist${a.watch !== 'watchlist' ? ': ' + esc(a.watch) : ''}${canEdit() ? ' · click to remove' : ''}"${canEdit() ? '' : ' disabled'}>★</button>`
    : canEdit() ? `<button type="button" class="tp-star" data-wid="${esc(a.id)}" title="Add to your watchlist">☆</button>` : '';
  const wo = () => card.querySelector('#tp-wo').checked;
  function renderWatch() {
    const box = card.querySelector('#tp-watch'); const nIn = WL.filter(w => w.in_portal).length;
    if (!WL.length && !canEdit()) { box.innerHTML = ''; return; }
    const chip = w => w.in_portal ? w.hits.map(h => `<button type="button" class="tp-wc in${recent(h.first_seen) ? ' fresh' : ''}" data-q="${esc(h.name)}" title="${esc(h.school)}${h.first_seen ? ' · first on your list ' + esc(h.first_seen) : ''}${w.note ? ' · ' + esc(w.note) : ''}">★ ${esc(h.name)} <small>${esc(short(h.school))}</small>${recent(h.first_seen) ? ' <span class="tp-tag new">new</span>' : ''}</button>`).join('')
      : `<span class="tp-wc out" title="${w.note ? esc(w.note) : 'Not on the portal list'}">${esc(w.name)}${w.school ? ` <small>${esc(w.school)}</small>` : ''} <small>· not in the portal</small></span>`;
    box.innerHTML = `<div class="tp-wl"><div class="tp-wh"><b>Watchlist</b> <span class="rk">${WL.length ? `${nIn} of ${WL.length} in the portal` : 'empty'}</span></div>
      <div class="tp-wcs">${WL.map(chip).join('')}</div>
      ${canEdit() ? `<form class="tp-wadd" id="tp-wadd"><input id="tp-wn" placeholder="Name" required><input id="tp-ws" placeholder="School (optional)"><input id="tp-wnote" placeholder="Note (optional)"><button type="submit">Add to watchlist</button></form>
        <p class="note" style="margin:4px 0 0">Saves to <code>portal/watchlist.csv</code>. You'll get a Mac notification when a watched name shows up on a new portal list (run 12 after pulling the list). Click ☆ on any row to watch her.</p>` : ''}</div>`;
    const f = box.querySelector('#tp-wadd'); if (f) f.onsubmit = e => { e.preventDefault(); const nm = f.querySelector('#tp-wn').value.trim(), sc = f.querySelector('#tp-ws').value.trim(), nt = f.querySelector('#tp-wnote').value.trim(); if (!nm) return;
      sendWatch({ action: 'add', name: nm, school: sc, note: nt });
      const key = x => String(x || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''), hit = A.filter(a => key(a.name) === key(nm) && (!sc || key(a.school).includes(key(sc)) || key(sc).includes(key(a.school))));
      hit.forEach(a => { a.watch = nt || 'watchlist'; a.watch_by = { name: nm, school: sc }; });
      WL.push({ name: nm, school: sc, note: nt, in_portal: hit.length > 0, hits: hit.map(a => ({ name: a.name, school: a.school, first_seen: a.first_seen || '' })) }); render(); };
  }
  card.addEventListener('click', e => { const b = e.target.closest('.tp-star'); if (b && canEdit()) { e.preventDefault(); e.stopPropagation(); const a = A.find(x => x.id === b.dataset.wid); if (!a) return;
      if (a.watch) { const by = a.watch_by || { name: a.name, school: a.school }; sendWatch({ action: 'remove', name: by.name, school: by.school || '' });
        const i = WL.findIndex(w => w.name === by.name && (w.school || '') === (by.school || '')); if (i >= 0) WL.splice(i, 1); A.filter(x => x.watch_by && x.watch_by.name === by.name && (x.watch_by.school || '') === (by.school || '')).forEach(x => { delete x.watch; delete x.watch_by; }); delete a.watch; }
      else { sendWatch({ action: 'add', name: a.name, school: a.school, note: '' }); a.watch = 'watchlist'; a.watch_by = { name: a.name, school: a.school }; WL.push({ name: a.name, school: a.school, note: '', in_portal: true, hits: [{ name: a.name, school: a.school, first_seen: a.first_seen || '' }] }); }
      render(); return; }
    const c = e.target.closest('.tp-wc.in'); if (c) { const qi = card.querySelector('#tp-q'); qi.value = c.dataset.q; render(); } });
  // shading percentile: adjusted-to-SEC percentile in the adjusted view (raw percentile when a stat has no adjustment), raw otherwise
  const pcOf = (r, k) => { if (!r.a.r) return null; const q = view === 'adj' && r.sc !== SEC ? val(r.a.r, k, 'pa') : null; return q != null ? q : val(r.a.r, k, 'p'); };
  const VOLN = { overall: 'touches (100)', attack: 'attacks (40)', block: 'block touches (20)', dig: 'dig chances (25)', serve: 'serves (40)', pass: 'passes (40)', setting: 'sets (50)' };
  function render() {
    const keys = pos ? (TPPD.pos[pos] || []) : ALL;
    renderWatch();
    const rows = A.filter(a => (!pos || a.pos === pos) && (!wo() || a.watch) && (!newN() || (a.days != null && a.days <= newN())) && (!q() || [a.name, a.school, a.team, short(a.team || '')].some(x => String(x || '').toLowerCase().includes(q())))).map(a => {
      const o = { id: a.id, name: a.name, pos: a.pos, from: a.possible ? a.school : a.team || a.school, conf: a.possible ? '' : a.conf || '', sc: a.r ? a.r.c : a.conf, a, ov: a.ov };   // sc = conference her stats came from
      keys.forEach(k => { o[k] = a.r ? val(a.r, k, view === 'adj' && o.sc !== SEC ? 'a' : 'v') ?? (view === 'adj' ? val(a.r, k) : null) : null; });
      return o; });
    card.querySelector('#tp-n').textContent = `${rows.length} shown`;
    const cols = [
      { key: 'name', label: 'Player', left: true, asc: true, fmt: (v, r) => starOf(r.a) + (r.a.matched && r.a.season === '2025' ? `<a href="#" class="tp25-a" data-k="${esc('2025:' + r.a.team25 + '|' + r.a.player)}">${esc(v)}</a> <span class="pos">${esc(r.pos)}</span> <span class="tp-tag" title="Not on a 2026 roster in the scout files: stats are her 2025 season (${esc(short(r.a.team25))})">2025</span>` :
        r.a.matched && r.a.possible ? `<a href="#" class="pl-a" data-pl="${esc(r.a.player)}" data-plt="${esc(r.a.team)}">${esc(v)}</a> <span class="pos">${esc(r.pos)}</span> <span class="tp-tag warn" title="Same name on ${esc(short(r.a.team))}'s 2026 roster; not confirmed it's her">possible match</span>` :
        r.a.matched ? `<a href="#" class="pl-a" data-pl="${esc(r.a.player)}" data-plt="${esc(r.a.team)}">${esc(v)}</a> <span class="pos">${esc(r.pos)}</span>` : r.a.decided === 'none' ? `${esc(v)} <span class="rk">no match</span>` : `${esc(v)} <span class="rk" title="Not found in the scout files for this school">not found</span>`) + newTag(r.a) },
      { key: 'from', label: 'From', left: true, asc: true, fmt: (v, r) => `${esc(short(v || ''))} <span class="rk">${esc(r.conf)}</span>` },
      ...(Object.keys(PRL).length ? [{ key: 'ov', label: 'Rating', title: 'Player rating vs D1 at her position (70 = average)', fmt: (v, r) => v == null ? '<span class="rk">—</span>' : `${rtNum(v)} <span class="rk">#${r.a.ovr} of ${r.a.ovn}</span>` }] : []),
      ...keys.map(k => ({ key: k, label: esc(lbl(k)), asc: low.has(k), fmt: (v, r) => { if (v == null) return '<span class="rk">—</span>';
        const pc = pcOf(r, k), thin = r.a.r && val(r.a.r, k, 'p') == null; let s = fmtT(k, v);
        if (view === 'adj' && r.a.r && r.sc !== SEC) { const raw = val(r.a.r, k); if (raw != null) { const d = v - raw; if (Math.abs(d) > 1e-9) s += `<span class="tp-d ${(d > 0) !== low.has(k) ? 'up' : 'dn'}">${dfmt(k, d)}</span>`; } }
        return thin ? `<span class="tp-thin" title="Not enough ${esc(VOLN[grp(k)] || 'touches')} for a percentile">${s}</span>` : pc == null ? s : `<span title="${Math.round(pc * 100)}th percentile among D1 ${esc((POSL[r.pos] || r.pos || '').toLowerCase())}s${view === 'adj' && r.sc !== SEC ? `, adjusted to ${esc(SEC)}` : ''}">${s}</span>`; }, bg: (v, r) => { const pc = pcOf(r, k); return pc == null ? '' : pc >= .75 ? hexA(css('--good'), .18 + (pc - .75) * .8) : pc <= .25 ? hexA(css('--crit'), .18 + (.25 - pc) * .8) : ''; } })),
      ...extraKeys.map(k => ({ key: 'x_' + k, label: esc(k), left: true, asc: true, fmt: (v, r) => esc((r.a.extra || {})[k] ?? '') }))
    ];
    table('t-tp', rows, cols, { sort: 'eVA', idKey: 'id', rowClass: r => r.a.matched ? '' : 'tp-miss' });
    card.querySelector('#tp-note').innerHTML = (view === 'adj' ? `<b>Adjusted to ${esc(SEC)}</b> with conference adjustment coefficients; small number = change from her raw stat (green = better). ` : '') +
      `Stats for the athletes on your portal list. <b>2025</b> = not on a 2026 roster in the scout files, so her 2025 season is shown (vs 2025 D1 players). <b>Possible match</b> = same name on another school's 2026 roster, not confirmed. Gray rows = no data found. Shading = her percentile among D1 players at her own position with enough volume (green = top quarter, red = bottom quarter; darker = further out), so the same number can shade differently for a middle and an outside. In the adjusted view everyone is compared on the ${esc(SEC)} scale. Gray text = too few attempts for a percentile; hover any number for its percentile. Pick a position to see that position's stats; click a name for her full card, wheel and rating. Every player's card has the same stats.`;
  }
  card.querySelector('#tp-view').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; card.querySelectorAll('#tp-view button').forEach(x => x.classList.toggle('on', x === b)); render(); });
  card.querySelector('#tp-pos').addEventListener('change', e => { pos = e.target.value; render(); });
  card.querySelector('#tp-q').addEventListener('input', render);
  card.querySelector('#tp-new').addEventListener('change', render);
  card.querySelector('#tp-wo').addEventListener('change', render);
  card.addEventListener('click', e => { const l = e.target.closest('.tp25-a'); if (!l) return; e.preventDefault(); open25(l.dataset.k); });
  function open25(key) { const dlg = document.getElementById('pl-pop'); if (!dlg) return; const [tk, pl] = key.split('|'), tm = tk.slice(5), r = by[key], a = inPortal[key] || {};
    dlg.innerHTML = `<div class="pp-in"><button class="pp-x" aria-label="Close">×</button>
      <div class="pp-h"><div><h2>${esc(pl)} <span class="pos">${esc(r ? r.pos : '')}</span></h2>
      <div class="pp-sub">${esc(short(tm))}${r ? ' · ' + esc(r.c) : ''} · <b>2025 season</b> (not on a 2026 roster in the scout files) · no 2025 xKill / xAssists or player rating</div></div></div>
      ${window.__tpSection(tk, pl)}</div>`;
    window.__tpAfter(tk, pl, dlg); if (!dlg.open) dlg.showModal(); }

  // ---------- Review matches: confirm or reject candidates; decisions save to portal/portal_matches.csv ----------
  const LSK = 'm26portalmatches';
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(LSK) || '[]'); } catch (e) { return []; } };
  const lsPut = v => { try { localStorage.setItem(LSK, JSON.stringify(v)); } catch (e) {} };
  const viaShiny = () => !!(window.Shiny && window.Shiny.setInputValue);
  const N25 = (PORT.names25 || []).map(([t, n, p]) => ({ season: '2025', team: t, player: n, pos: p }));
  const N26 = Object.values(TPPD.by).map(r => ({ season: '2026', team: r.t, player: r.n, pos: r.pos }));
  const NALL = N26.concat(N25), nk = s => String(s || '').normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase();
  NALL.forEach(x => { x.k = nk(x.player); x.tk = nk(x.team); });
  let showDone = false;
  const statLine = c => { const r = c.season === '2025' ? by['2025:' + c.team + '|' + c.player] : by[c.team + '|' + c.player];
    return r ? `${esc(r.pos)} · eVA ${fmtT('eVA', val(r, 'eVA'))}${vol(r, 'atk_att') ? ' · ' + vol(r, 'atk_att') + ' att' : ''}${vol(r, 'pass_att') ? ' · ' + vol(r, 'pass_att') + ' rec' : ''}` : (c.pos ? esc(c.pos) + ' · stats after next update' : ''); };
  const candBtn = (a, c) => `<div class="tp-cand"><div><b>${esc(c.player)}</b> <span class="tp-tag">${c.season}</span><div class="rk">${esc(short(c.team))}${c.why ? ' · ' + esc(c.why) : ''}</div><div class="rk">${statLine(c)}</div></div>
      <button type="button" class="tp-yes" data-id="${a.id}" data-c="${esc(JSON.stringify({ season: c.season, team: c.team, player: c.player }))}">This is her</button></div>`;
  function decide(a, dec) {
    const rec = { key: a.key, name: a.name, school: a.school, decision: dec.decision, season: dec.season || '', team: dec.team || '', player: dec.player || '', decided: new Date().toISOString().slice(0, 19).replace('T', ' ') };
    if (viaShiny()) window.Shiny.setInputValue('portal_match', rec, { priority: 'event' }); else { const L = lsGet(); L.push(rec); lsPut(L); }
    const src = PORT.athletes[+a.id];
    if (dec.decision === 'match') Object.assign(src, { matched: true, possible: false, season: dec.season, player: dec.player, decided: 'match', review: false }, dec.season === '2025' ? { team25: dec.team } : { team: dec.team, conf: null });
    else if (dec.decision === 'none') Object.assign(src, { matched: false, possible: false, decided: 'none', review: false });
    else Object.assign(src, { decided: null, review: true });
    if (src.matched) inPortal[(src.season === '2025' ? '2025:' + src.team25 : src.team) + '|' + src.player] = src;
    A[+a.id] = rowOf(src, +a.id); renderRev(); render(); }
  // static preview (no Shiny): replay saved decisions so they stick across reloads
  if (!viaShiny()) { const seen = {}; lsGet().forEach(r => { seen[r.key] = r; }); Object.values(seen).forEach(r => { const a = A.find(x => x.key === r.key); if (!a || a.decided) return;
    const src = PORT.athletes[+a.id]; if (r.decision === 'match') Object.assign(src, { matched: true, possible: false, season: r.season, player: r.player, decided: 'match', review: false }, r.season === '2025' ? { team25: r.team } : { team: r.team });
    else if (r.decision === 'none') Object.assign(src, { matched: false, possible: false, decided: 'none', review: false }); A[+a.id] = rowOf(src, +a.id); }); }
  const card1 = a => `<div class="tp-rv${a.decided ? ' done' : ''}${(a.cands || []).length || a.decided ? '' : ' slim'}" data-id="${a.id}">
      <div class="tp-rv-h"><div><b>${esc(a.name)}</b> <span class="rk">${esc(a.school)}${(a.extra || {})['Entered portal'] ? ' · entered ' + esc(a.extra['Entered portal']) : ''}</span>
        ${a.decided ? ` <span class="tp-tag">${a.decided === 'match' ? 'matched: ' + esc(a.player) + ' (' + esc(a.season) + ')' : 'no match'}</span>` : a.possible ? ` <span class="tp-tag warn">possible: ${esc(a.player)}, ${esc(short(a.team))}</span>` : ''}</div>
        <div class="tp-rv-f">${a.decided ? `<button type="button" class="tp-undo" data-id="${a.id}">Undo</button>` : `<input type="search" class="tp-find" data-id="${a.id}" placeholder="Search a player or school…"><button type="button" class="tp-no" data-id="${a.id}">None of these</button>`}</div></div>
      ${!a.decided && (a.cands || []).length ? `<div class="tp-cands">${a.cands.map(c => candBtn(a, c)).join('')}</div>` : ''}<div class="tp-found" id="tp-f-${a.id}"></div></div>`;
  function renderRev() {
    const box = card.querySelector('#tp-rev'), todo = A.filter(a => a.review && !a.decided), done = A.filter(a => a.decided);
    card.querySelector('#tp-rn').textContent = todo.length ? `(${todo.length})` : '';
    const withC = todo.filter(a => (a.cands || []).length), noC = todo.filter(a => !(a.cands || []).length);
    box.innerHTML = `<p class="note" style="margin:6px 0 10px">Athletes who didn't match a player exactly. Pick the right player, or <b>None of these</b>. Your decisions ${viaShiny() ? `save to <code>portal/${esc(PORT.matches_file || 'portal_matches.csv')}</code> and are applied on every rebuild` : `are kept in this browser (static preview) — <a href="#" id="tp-dl">download portal_matches.csv</a> and put it in the <code>portal</code> folder`}. Stats for a newly matched 2025 player appear after the next update (1).</p>
      <label class="rk" style="display:inline-flex;gap:6px;align-items:center;margin-bottom:8px"><input type="checkbox" id="tp-done" ${showDone ? 'checked' : ''}> Show decided (${done.length})</label>
      ${withC.length ? `<h4 class="tp-rv-sec">Suggested matches <span class="rk">${withC.length}</span></h4>${withC.map(card1).join('')}` : ''}
      ${noC.length ? `<h4 class="tp-rv-sec">No close names <span class="rk">${noC.length} · search by name or school, or mark None</span></h4>${noC.map(card1).join('')}` : ''}
      ${showDone && done.length ? `<h4 class="tp-rv-sec">Decided <span class="rk">${done.length}</span></h4>${done.map(card1).join('')}` : ''}
      ${!todo.length && !(showDone && done.length) ? '<p class="rk">Nothing left to review.</p>' : ''}`;
    const dl = box.querySelector('#tp-dl'); if (dl) dl.onclick = e => { e.preventDefault(); const seen = {}; lsGet().forEach(r => { seen[r.key] = r; });
      const cols = ['key', 'name', 'school', 'decision', 'season', 'team', 'player', 'decided'], q = v => /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
      const csv = [cols.join(',')].concat(Object.values(seen).map(r => cols.map(c => q(r[c] ?? '')).join(','))).join('\n');
      const u = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const l = document.createElement('a'); l.href = u; l.download = 'portal_matches.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); };
  }
  card.querySelector('#tp-rev').addEventListener('click', e => { const t = e.target, a = t.dataset && t.dataset.id != null ? A[+t.dataset.id] : null; if (!a) return;
    if (t.classList.contains('tp-yes')) decide(a, { decision: 'match', ...JSON.parse(t.dataset.c) });
    else if (t.classList.contains('tp-no')) decide(a, { decision: 'none' });
    else if (t.classList.contains('tp-undo')) decide(a, { decision: 'clear' }); });
  card.querySelector('#tp-rev').addEventListener('change', e => { if (e.target.id === 'tp-done') { showDone = e.target.checked; renderRev(); } });
  card.querySelector('#tp-rev').addEventListener('input', e => { const t = e.target; if (!t.classList.contains('tp-find')) return; const a = A[+t.dataset.id], out = card.querySelector('#tp-f-' + a.id), qq = nk(t.value);
    if (qq.length < 3) { out.innerHTML = ''; return; }
    const hits = NALL.filter(x => x.k.includes(qq) || (x.k + x.tk).includes(qq)).slice(0, 8);
    out.innerHTML = hits.length ? `<div class="tp-cands">${hits.map(c => candBtn(a, c)).join('')}</div>` : '<span class="rk">No players found.</span>'; });
  card.querySelector('#tp-mode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const m = b.dataset.m;
    card.querySelectorAll('#tp-mode button').forEach(x => x.classList.toggle('on', x === b));
    card.querySelector('#tp-rev').hidden = m !== 'review'; ['#tp-ctl', '#tp-tw', '#tp-note'].forEach(sel => { card.querySelector(sel).hidden = m === 'review'; }); if (m === 'review') renderRev(); });
  renderRev();
  render();
})();

/* build charts; rebuild on theme change */
function buildAll() { applyHL(); theme(); rebuild.forEach(f => f()); renderTeams(); }
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

/* favorite team (public site): star on the Team tab, chip in the header to jump to it or clear it */
(function () {
  if (!PUB) return;
  const fb = document.getElementById('tm-fav'); if (fb) fb.addEventListener('click', () => { const t = document.getElementById('tm-sel').value; setFav(t === FAV ? null : t); });
  const chip = document.getElementById('fav-chip'); if (!chip || !FAV) return;
  chip.innerHTML = `<a href="#" data-open="${FAV.replace(/"/g, '&quot;')}" title="Open your favorite team">★ ${short(FAV)}</a><button type="button" aria-label="Clear favorite team" title="Clear favorite">×</button>`;
  chip.hidden = false; chip.querySelector('button').addEventListener('click', () => setFav(null));
})();

/* ---------- player popup: click a player name → season line with national + conference ranks, then match by match ---------- */
(() => {
  const PM = D.pmatch; if (!PM || !PM.teams) return;
  const ci = Object.fromEntries(PM.cols.map((c, i) => [c, i])), confOf = Object.fromEntries(teams.map(t => [t.team, t.conf]));
  // ranked metrics: [key, label, format, minimum field, minimum, lower is better]
  const RK = [['kills_per_set', 'Kills / set', fmt.n2, 'att', 60], ['att_eff', 'Attack eff', fmt.eff, 'att', 60], ['kill_pct', 'Kill %', fmt.pct, 'att', 60],
    ['aces_per_set', 'Aces / set', fmt.n2, 'serves', 50], ['ace_pct', 'Ace %', fmt.pct, 'serves', 50], ['ko_pct', 'Knockout %', fmt.pct, 'serves', 50], ['serve_err_pct', 'Serve err %', fmt.pct, 'serves', 50, true],
    ['good_pass_pct', 'Good pass %', fmt.pct, 'recs', 50], ['pass_rating', 'Pass rating', fmt.n2, 'recs', 50], ['blocks_per_set', 'Blocks / set', fmt.n2, 'sets', 20], ['digs_per_set', 'Digs / set', fmt.n2, 'sets', 20]];
  const rankOf = (p, [k, , , mf, mn, low]) => {
    if (p[k] == null || !(p[mf] >= mn)) return null;
    const pool = D.players.filter(q => q[k] != null && q[mf] >= mn && confOf[q.team] && confOf[q.team] !== 'Non-D1'), cp = pool.filter(q => confOf[q.team] === confOf[p.team]);
    const r = arr => 1 + arr.filter(q => low ? q[k] < p[k] : q[k] > p[k]).length;
    return { nat: r(pool), natN: pool.length, conf: r(cp), confN: cp.length };
  };
  const dlg = document.createElement('dialog'); dlg.id = 'pl-pop'; dlg.tabIndex = -1; document.body.appendChild(dlg);
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.pp-x')) dlg.close(); });
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function open(team, player) {
    const rows = ((PM.teams[team] || {})[player]) || [], same = D.players.filter(p => p.team === team && p.player === player);
    if (!same.length) return;
    const p = same.reduce((a, b) => (b.touches > a.touches ? b : a)), conf = confOf[team] || '', logo = (window.__LOGOS__ || {})[team];
    const ms = rows.map(r => { const m = D.matches[r[ci.mi]] || {}, h = m.home === team, v = k => r[ci[k]];
      const sf = h ? m.home_sets : m.away_sets, sa = h ? m.away_sets : m.home_sets;
      return { date: m.date, opp: h ? m.away : m.home, site: h ? 'vs' : 'at', res: m.winner ? (m.winner === team ? 'W' : 'L') : '—', sc: sf != null ? `${sf}–${sa}` : '',
        sets: v('sets'), k: v('k'), e: v('e'), ta: v('ta'), kp: v('ta') ? v('k') / v('ta') : null, eff: v('ta') ? (v('k') - v('e') - v('b')) / v('ta') : null, ace: v('ace'), se: v('se'), ko: v('srv') ? v('ko') / v('srv') : null,
        rec: v('rec'), gp: v('rec') ? v('gp') / v('rec') : null, pr: v('pr'), blk: v('blk'), dig: v('dig'), _b: v('b'), _srv: v('srv'), _ko: v('ko'), _gp: v('gp') }; }).filter(m => m.date);
    // season line at the bottom of the match table: totals, per set, per match (rates are pooled, not averaged match by match)
    const S = k => ms.reduce((a, m) => a + (Number(m[k]) || 0), 0), nM = ms.length, nS = S('sets');
    const tot = { sets: nS, k: S('k'), e: S('e'), ta: S('ta'), ace: S('ace'), se: S('se'), rec: S('rec'), blk: S('blk'), dig: S('dig') };
    const rate = { kp: tot.ta ? tot.k / tot.ta : null, eff: tot.ta ? (tot.k - tot.e - S('_b')) / tot.ta : null, ko: S('_srv') ? S('_ko') / S('_srv') : null, gp: tot.rec ? S('_gp') / tot.rec : null,
      pr: tot.rec ? ms.reduce((a, m) => a + (m.pr != null && m.rec ? m.pr * m.rec : 0), 0) / tot.rec : null };
    const CNT = ['sets', 'k', 'e', 'ta', 'ace', 'se', 'rec', 'blk', 'dig'];
    const footRow = (label, div, cls) => cols => `<tr class="${cls}">` + cols.map((c, i) => {
      if (i === 0) return `<td class="l" colspan="1"><b>${label}</b></td>`;
      if (c.key === 'opp' || c.key === 'res') return '<td></td>';
      if (CNT.includes(c.key)) { const v = div ? (div === 'set' ? (c.key === 'sets' ? null : tot[c.key] / (nS || 1)) : tot[c.key] / (nM || 1)) : tot[c.key]; return `<td>${v == null ? '' : div ? fmt.n2(v) : v.toLocaleString()}</td>`; }
      const v = rate[c.key]; return `<td>${v == null ? '—' : c.key === 'eff' ? fmt.eff(v) : c.key === 'pr' ? fmt.n2(v) : fmt.pct(v)}</td>`;
    }).join('') + '</tr>';
    const ppFoot = cols => '<tfoot>' + footRow(`Total · ${nM} matches`, null, 'pp-tot')(cols) + footRow('Per set', 'set', 'pp-avg')(cols) + footRow('Per match', 'match', 'pp-avg')(cols) + '</tfoot>';
    const tiles = RK.map(m => { const rk = rankOf(p, m), val = p[m[0]]; if (val == null || (m[3] !== 'sets' && !(p[m[3]] >= 10)) || (m[0] === 'blocks_per_set' && !(p.blk_att >= 5))) return '';   // skip skills the player barely does
      const top = rk && rk.nat <= Math.max(10, Math.round(rk.natN * .05));
      return `<div class="pp-t${top ? ' top' : ''}"><div class="l">${m[1]}</div><div class="v">${m[2](val)}</div><div class="d"${rk ? ` title="#${rk.nat} of ${rk.natN} qualified D1 players · #${rk.conf} of ${rk.confN} in the ${esc(conf)}"` : ''}>${rk ? `<b>#${rk.nat}</b> D1 · <b>#${rk.conf}</b> ${esc(conf)}` : `not ranked (under ${m[4]} ${m[3]})`}</div></div>`; }).join('');
    const dup = same.length > 1 ? ` · scouted under ${same.length} numbers (${same.map(s => '#' + s.number).join(', ')}), combined below` : '';
    dlg.innerHTML = `<div class="pp-in"><button class="pp-x" aria-label="Close">×</button>
      <div class="pp-h">${window.__hs(team, player, p.number) ? `<span class="pp-hs">${window.__hsImg(team, player, p.number)}${logo ? `<img class="pp-hs-lg" src="${logo}" alt="">` : ''}</span>` : logo ? `<img src="${logo}" alt="">` : ''}<div><h2>${esc(player)} <span class="pos">${esc(p.pos_guess || '')}</span></h2>
      <div class="pp-sub">#${esc(p.number)} · ${esc(short(team))} · ${esc(conf)} · ${p.sets} sets in ${ms.length} matches${dup}</div></div></div>
      <div class="pp-tiles">${tiles}</div>
      ${window.__tpSection ? window.__tpSection(team, player) : ''}
      ${window.__prtSection ? window.__prtSection(team, player) : ''}
      <h3 class="pp-h3">Match by match</h3><div class="tbl-wrap"><table id="pp-tbl"></table></div>
      <p class="note">Ranks are among D1 players with at least 60 attacks, 50 serves, 50 receptions or 20 sets, depending on the stat. Outlined = top 5% in D1.</p></div>`;
    table(dlg.querySelector('#pp-tbl'), ms, [
      { key: 'date', label: 'Date', left: true, asc: true, fmt: fmt.date }, { key: 'opp', label: 'Opponent', left: true, asc: true, fmt: (v, r) => `<span class="rk" style="margin:0 4px 0 0">${r.site}</span>${esc(short(v))}` },
      { key: 'res', label: 'Result', fmt: (v, r) => `<span class="pill ${v}">${v}</span> ${r.sc}` }, { key: 'sets', label: 'Sets' },
      { key: 'k', label: 'K' }, { key: 'e', label: 'E' }, { key: 'ta', label: 'TA' }, { key: 'kp', label: 'Kill %', fmt: fmt.pct }, { key: 'eff', label: 'Eff', fmt: v => v == null ? '—' : fmt.eff(v) },
      { key: 'ace', label: 'Aces' }, { key: 'se', label: 'SE' }, { key: 'ko', label: 'KO %', fmt: fmt.pct },
      { key: 'rec', label: 'Recs' }, { key: 'gp', label: 'Good pass', fmt: fmt.pct }, { key: 'pr', label: 'Pass', fmt: fmt.n2 }, { key: 'blk', label: 'Blk' }, { key: 'dig', label: 'Digs' }
    ], { sort: 'date', asc: true, foot: ms.length ? ppFoot : null });
    dlg.showModal(); dlg.focus(); dlg.scrollTop = 0;
    if (window.__tpAfter) window.__tpAfter(team, player, dlg);
    if (window.__prtAfter) window.__prtAfter(team, player, dlg);
  }
  window.openPlayer = open;
  document.addEventListener('click', e => { const a = e.target.closest('[data-pl]'); if (!a) return; e.preventDefault(); e.stopPropagation(); open(a.dataset.plt, a.dataset.pl); });
})();

/* ---------- percentile wheel: one wedge per metric, grouped and colored by skill (player ratings, private) ----------
   items: [{ label, comp, p (0–1, solid), p2 (0–1, faded, optional), tip }] */
const WHEEL_C = { overall: '#5F6B7A', attack: '#6C8EEF', setting: '#C793F5', pass: '#3CC4C9', serve: '#A4C13F', block: '#F2B544', dig: '#F28B82' };
const WHEEL_N = { overall: 'Overall', attack: 'Attack', setting: 'Set', pass: 'Pass', serve: 'Serve', block: 'Block', dig: 'Dig' };
function prtWheel(el, items, legend2, opts) {
  if (!el) return; if (!items.length) { el.innerHTML = '<p class="note">No rated metrics yet.</p>'; return; }
  const W = 440, cx = W / 2, cy = W / 2, r0 = 36, R = 150, n = items.length, slot = 2 * Math.PI / n, gap = Math.min(0.03, slot * 0.08);
  const rad = p => r0 + Math.max(0, Math.min(1, p)) * (R - r0);
  const pt = (a, r) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const wedge = (a0, a1, r) => { const [x0, y0] = pt(a0, r0), [x1, y1] = pt(a0, r), [x2, y2] = pt(a1, r), [x3, y3] = pt(a1, r0), lg = a1 - a0 > Math.PI ? 1 : 0;
    return `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 ${lg} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${r0},${r0} 0 ${lg} 0 ${x0.toFixed(1)},${y0.toFixed(1)} Z`; };
  const ink = css('--ink'), ink2 = css('--ink-2'), grid = css('--grid');
  let g = '';
  [0, .25, .5, .75, 1].forEach(q => { g += `<circle cx="${cx}" cy="${cy}" r="${rad(q)}" fill="none" stroke="${grid}" stroke-width="1"/>`; });
  items.forEach((it, i) => { const a0 = i * slot + gap / 2, a1 = (i + 1) * slot - gap / 2, c = WHEEL_C[it.comp] || '#999';
    if (it.p2 != null) g += `<path d="${wedge(a0, a1, rad(it.p2))}" fill="${c}" fill-opacity=".32"><title>${it.tip || ''}</title></path>`;
    if (it.p != null) g += `<path d="${wedge(a0, a1, rad(it.p))}" fill="${c}" fill-opacity=".9"><title>${it.tip || ''}</title></path>`;
    if (it.p3 != null) { const r3 = rad(it.p3), [x1, y1] = pt(a0, r3), [x2, y2] = pt(a1, r3); g += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r3.toFixed(1)},${r3.toFixed(1)} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"><title>${it.tip || ''}</title></path>`; } });
  [[.25, '#d9534f'], [.5, ink], [.75, '#3b6fd8']].forEach(([q, c]) => { g += `<circle cx="${cx}" cy="${cy}" r="${rad(q)}" fill="none" stroke="${c}" stroke-width="1.2" stroke-dasharray="4 3" opacity=".85"/>`; });
  items.forEach((it, i) => { if (i && items[i - 1].comp === it.comp) return; const [x0, y0] = pt(i * slot, r0 - 6), [x1, y1] = pt(i * slot, R + 10); g += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${ink}" stroke-width="1.3"/>`; });
  items.forEach((it, i) => { const a = (i + .5) * slot, sn = Math.sin(a);
    if (n > 20) { // dense wheels: labels run along the spoke so neighbours never collide
      const [x, y] = pt(a, R + 14), deg = a * 180 / Math.PI - 90, left = sn < 0;
      g += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${(left ? deg + 180 : deg).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" text-anchor="${left ? 'end' : 'start'}" dominant-baseline="middle" font-size="11" fill="${ink2}">${it.label}</text>`; return; }
    const [x, y] = pt(a, R + 18), anc = sn > .2 ? 'start' : sn < -.2 ? 'end' : 'middle', dy = Math.cos(a) < -.3 ? 10 : Math.cos(a) > .3 ? -2 : 4;
    g += `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anc}" font-size="11" fill="${ink2}">${it.label}</text>`; });
  const comps = [...new Set(items.map(i => i.comp))];
  const has3 = items.some(i => i.p3 != null), has2 = items.some(i => i.p2 != null);
  el.setAttribute('data-wheel', '1'); el.__items = items; el.__legend2 = legend2; el.__opts = opts; el.__title = (opts && opts.title) || 'Percentile wheel';
  el.innerHTML = `<svg viewBox="${n > 20 ? `-70 -70 ${W + 140} ${W + 140}` : `-40 -6 ${W + 80} ${W + 12}`}" class="prt-wheel-svg${n > 20 ? ' dense' : ''}" role="img" aria-label="Percentile wheel" title="Click to enlarge">${g}</svg>
    <div class="prt-wheel-leg">${comps.map(c => `<span><i style="background:${WHEEL_C[c]}"></i>${WHEEL_N[c] || c}</span>`).join('')}<span class="rk">bar = percentile vs D1 at her position${opts && opts.adj ? `, adjusted to ${opts.adj}` : ''}${has2 && legend2 ? ` · faded = vs ${legend2}` : ''}${has3 ? ` · black mark = adjusted to ${(opts && opts.sec) || 'SEC'}` : ''} · click to enlarge</span></div>`;
}
const PRT_SHORT = { fb: 'FBSO eff', ip: 'In-sys eff', oos: 'Off-sys eff', tr: 'Trans eff', kill: 'Kill %', hb: 'High-ball', sxfb: 'Pass damage', ko: 'KO %', ace: 'Ace %', serr: 'Srv err',
  pxfb: 'Pass xFBSO', gpass: 'Good pass', rerr: 'Rec err', gbt: 'Block touch', bval: 'Touch value', dq: 'Dig quality', derr: 'Dig err', effset: 'Set eff INS', mdset: 'Set eff OOS',
  lowblk: 'vs 0–1 blk', sterr: 'Set err', lseff: 'Set eff', lsk: 'Set kill %', lserr: 'Set err', bps: 'Stuffs / set', dps: 'Digs / set' };
const pctFromRating = r => { if (r == null) return null; if (r <= 80) return Math.max(0, (r - 40) / 59); const zk = 0.4621, z = zk + (r - 80) * (3 - zk) / 19;
  const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - q : q; };

/* ================= PLAYER RATINGS (window.__PRATE__; private: local NCAA_PREVIEW run only, never deployed or published) ================= */
(function () {
  const PR = window.__PRATE__, btn = document.getElementById('prt-tab');
  if (PUB || !PR || !PR.players || !PR.players.length) { if (btn) btn.hidden = true; return; }
  btn.hidden = false; btn.innerHTML = 'Player ratings <span class="priv-tag" title="Private: only in a local preview (4). Never deployed or published.">private</span>';
  const CN = { attack: 'Attack', serve: 'Serve', pass: 'Pass', setting: 'Set', block: 'Block', dig: 'Dig' }, ORDER = ['attack', 'setting', 'pass', 'serve', 'block', 'dig'];
  const RAD = RT_COMPS.map(c => c[0]);   // same axes and order as the team hexagon
  const POSN = { 'OH': 'outsides', 'OPP': 'opposites', 'OPP/MB': 'opp / middles', 'MB': 'middles', 'S': 'setters', 'L/DS': 'liberos / DS' };
  const PL = PR.players.map(p => ({ team: p.team, player: p.player, number: p.number, pos: p.pos, conf: p.conf, sets: p.sets, id: p.team + '|' + p.player,
    ov: { d1: p.ov[0], cf: p.ov[1], d1r: p.ov[2], d1n: p.ov[3], cfr: p.ov[4], cfn: p.ov[5] },
    comps: Object.values(p.comps || []).map(c => ({ comp: PR.comps[c[0]], d1: c[1], cf: c[2], r: c[3], n: c[4] })),
    m: Object.values(p.m || []).map(x => { const md = PR.metrics[x[0]]; return { key: md.key, comp: md.comp, label: md.label, unit: md.unit, raw: x[1], n: x[2], d1: x[3], cf: x[4], r: x[5], rn: x[6] }; }),
    prev: p.prev ? { how: p.prev.how, ov: p.prev.ov ?? null, sets: p.prev.sets, team: p.prev.team || null, pos: p.prev.pos || null, cands: p.prev.cands || [],
      comps: Object.fromEntries(Object.values(p.prev.comps || []).map(c => [PR.comps[c[0]], c[1]])) } : null }));
  // change since last season, on the vs-D1 scale (how she moved against D1 players at her position)
  const PREVY = PR.prev_season || '2025', PY = "'" + String(PREVY).slice(2);
  PL.forEach(p => { p.dv = p.prev && p.prev.ov != null && p.ov.d1 != null ? p.ov.d1 - p.prev.ov : null; });
  const SMALL = 30;
  let chartMode = 'shape'; try { chartMode = localStorage.getItem('m26prtchart') || 'shape'; } catch (e) {}
  const WORDER = ['attack', 'setting', 'pass', 'serve', 'block', 'dig'];
  const wheelItems = (p, refConf) => p.m.filter(m => m.r && m.rn).sort((a, b) => WORDER.indexOf(a.comp) - WORDER.indexOf(b.comp)).map(m => {
    const pc = m.rn > 1 ? 1 - (m.r - 1) / (m.rn - 1) : .5, p2 = pctFromRating(m.cf);
    return { label: PRT_SHORT[m.key] || m.label, comp: m.comp, p: pc, p2,
      tip: `${m.label}: ${m.unit === 'eff' ? fmt.eff(m.raw) : m.unit === 'n2' ? fmt.n2(m.raw) : fmt.pct(m.raw)} · ${Math.round(pc * 100)}th percentile in D1${p2 != null ? ` · ${Math.round(p2 * 100)}th in ${refConf}` : ''}` }; });
  const chartSeg = id => `<div class="seg prt-cseg" data-for="${id}"><button type="button" data-c="shape"${chartMode === 'shape' ? ' class="on"' : ''}>Shape</button><button type="button" data-c="wheel"${chartMode === 'wheel' ? ' class="on"' : ''}>Wheel</button></div>`;
  const applyMode = root => { root.querySelectorAll('.prt-cseg button').forEach(b => b.classList.toggle('on', b.dataset.c === chartMode));
    root.querySelectorAll('.prt-shape').forEach(x => x.hidden = chartMode !== 'shape'); root.querySelectorAll('.prt-wheel').forEach(x => x.hidden = chartMode !== 'wheel'); };
  document.addEventListener('click', e => { const b = e.target.closest('.prt-cseg button'); if (!b) return; chartMode = b.dataset.c; try { localStorage.setItem('m26prtchart', chartMode); } catch (er) {}
    document.querySelectorAll('.prt-cseg').forEach(sg => applyMode(sg.closest('.prt-chartbox') || sg.parentElement)); });
  const sinceCell = r => {
    const pv = r.prev;
    if (!pv) return '<span class="rk" title="No ' + PREVY + ' rating: freshman, redshirt, did not play, outside D1, or a name change">new</span>';
    if (pv.how === 'ambiguous') return `<span class="rk" title="Same name on several ${PREVY} rosters: ${esc(pv.cands.map(short).join(', '))}. Link her in data/player_links.csv.">?</span>`;
    const tags = (pv.team ? `<span class="prt-tag" title="Transfer from ${esc(short(pv.team))}">T</span>` : '') + (pv.pos ? `<span class="prt-tag" title="Rated as ${pv.pos} in ${PREVY}">${pv.pos}</span>` : '');
    if (pv.ov == null || r.dv == null) return `<span class="rk" title="Played in ${PREVY} (${pv.sets} sets) but not rated: under ${PR.min_sets} sets or too little volume in her main skill">—</span>${tags}`;
    const d = r.dv, sm = pv.sets < SMALL || r.sets < SMALL;
    return `<span class="prt-dl ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}" title="${PREVY}: ${pv.ov} (${pv.sets} sets) → now ${Math.round(r.ov ?? 0)}${sm ? ' · small sample' : ''}">${d > 0 ? '+' : ''}${d}${sm ? '*' : ''}</span> <span class="rk">${pv.ov}</span>${tags}`;
  };
  const byId = Object.fromEntries(PL.map(p => [p.id, p])), byTeam = {}; PL.forEach(p => (byTeam[p.team] = byTeam[p.team] || []).push(p));
  // averages by position (conference and D1), all on the vs-D1 scale: AVG['SEC|OH'] = { n, ov, comps: { attack: 81, … }, m: { kill: { raw, n }, … } }
  const AVG = {}; (PR.avg || []).forEach(a => { AVG[a.conf + '|' + a.pos] = { conf: a.conf, pos: a.pos, n: a.n, ov: a.ov,
    comps: Object.fromEntries((a.comps || []).map(c => [PR.comps[c[0]], c[1]])), m: Object.fromEntries((a.m || []).map(x => [PR.metrics[x[0]].key, { raw: x[1], n: x[2] }])) }; });
  const avgOf = (conf, pos) => AVG[conf + '|' + pos];
  let basis = 'd1', view = 'team', team = byTeam[PR.focus] ? PR.focus : (byTeam[AM] ? AM : Object.keys(byTeam)[0]), curP = null, cmp = [];
  const MAXC = 4, CC = ['--s1', '--s2', '--s3', '--s4'];
  const $ = id => document.getElementById(id);
  const tsel = document.createElement('select'), vsel = document.createElement('select'), psel = document.createElement('select'), csel = document.createElement('select'), asel = document.createElement('select');
  tsel.innerHTML = Object.keys(byTeam).sort((a, b) => short(a).localeCompare(short(b))).map(t => `<option value="${t.replace(/"/g, '&quot;')}">${short(t)}</option>`).join(''); tsel.value = team;
  vsel.innerHTML = '<option value="team">One team</option><option value="lb">Leaderboard</option><option value="conf">Conference averages</option>';
  psel.innerHTML = Object.keys(POSN).map(p => `<option value="${p}">${p}</option>`).join('');
  const confs = [...new Set(PL.map(p => p.conf))].sort(); csel.innerHTML = '<option value="">All D1</option><option value="__p4">Power 4</option>' + confs.map(c => `<option>${c}</option>`).join('');
  asel.innerHTML = '<option value="">—</option><option value="@own">Her own conference</option><option value="D1">All D1</option>' + confs.map(c => `<option>${c}</option>`).join(''); asel.value = '@own';
  const ctl = document.createElement('div'); ctl.className = 'controls'; ctl.style.margin = '8px 0 4px';
  const lab = (t, el) => { const l = document.createElement('label'); l.textContent = t + ' '; l.appendChild(el); return l; };
  const lT = lab('Team', tsel), lP = lab('Position', psel), lC = lab('Conference', csel), lA = lab('vs average player in', asel);
  ctl.append(lab('View', vsel), lT, lA, lP, lC); $('prt-basis').before(ctl);
  // compare card (built once, after the detail card)
  const cc = document.createElement('div'); cc.className = 'card'; cc.id = 'prt-cmp'; cc.style.marginTop = '16px'; cc.hidden = true; $('prt-detail').after(cc);
  const rk = (r, n) => r ? `<span class="rk">#${r} of ${Number(n).toLocaleString()}</span>` : '';
  const uf = (u, v) => v == null ? '—' : u === 'eff' ? fmt.eff(v) : u === 'n2' ? fmt.n2(v) : fmt.pct(v);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bLab = p => basis === 'd1' ? 'D1' : p.conf;
  function radar(id, list) {   // list: [{ label, p, color }] — six axes like the team hexagon; skills a position isn't rated on are left out
    mk(id, { type: 'radar', data: { labels: RT_COMPS.map(c => c[1]),
      datasets: list.map(x => ({ label: x.label, data: RAD.map(c => { const k = x.p.comps.find(y => y.comp === c); return k ? k[basis] : null; }), spanGaps: true,
        borderColor: x.color, backgroundColor: x.ref ? 'transparent' : hexA(x.color, list.length > 1 ? .10 : .18), borderDash: x.ref ? [5, 4] : [], pointBackgroundColor: x.color, pointBorderColor: x.color,
        borderWidth: x.ref ? 1.5 : 2, pointRadius: x.ref ? 2 : 3, pointHoverRadius: 5 })) },
      options: { responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: list.length > 1, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: css('--ink-2') } }, tooltip: { backgroundColor: css('--ink'), titleColor: css('--page'), bodyColor: css('--page'), padding: 8, cornerRadius: 4, callbacks: { label: c => `${c.dataset.label}: ${c.raw ?? 'not rated'}` } } },
        scales: { r: { min: 40, max: 100, ticks: { stepSize: 20, display: false }, grid: { color: css('--grid') }, angleLines: { color: css('--grid') }, pointLabels: { color: css('--ink-2'), font: { size: 11.5 } } } } } });
  }
  function renderAvg() {
    const pos = psel.value; lT.style.display = lC.style.display = 'none'; lP.style.display = '';
    $('prt-title').textContent = `Conference averages · ${POSN[pos]}`;
    $('prt-sub').textContent = `private · average rating of each league's rated ${POSN[pos]} (${PR.min_sets}+ sets), all on the D1 scale so leagues compare · 70 = D1 average player`;
    $('prt-note').textContent = 'Each number is the mean of the players\' vs-D1 ratings, so a 78 means the league\'s typical player at this position rates like a 78 nationally. Click a conference to open its leaderboard.';
    const rows = Object.values(AVG).filter(a => a.pos === pos).map(a => { const o = { id: a.conf, conf: a.conf, n: a.n, ov: a.ov == null ? null : a.ov + (a.conf === 'D1' ? 1e-3 : 0) }; ORDER.forEach(c => { o[c] = a.comps[c]; }); return o; });
    const cs = ORDER.filter(c => (PR.weights[pos] || {})[c] != null);
    table('t-prt', rows, [{ key: 'conf', label: 'Conference', left: true, asc: true, fmt: v => v === 'D1' ? '<b>All D1</b>' : esc(v) }, { key: 'n', label: 'Players' },
      { key: 'ov', label: 'Overall', fmt: v => rtNum(v == null ? null : Math.round(v)) }, ...cs.map(c => ({ key: c, label: CN[c], fmt: v => v == null ? '<span class="rk">·</span>' : rtNum(v) }))],
      { sort: 'ov', idKey: 'id', rowClass: r => r.conf === 'D1' ? 'am' : '', onClick: id => { if (id === 'D1') return; vsel.value = view = 'lb'; csel.value = id; render(); } });
    renderCmp();
  }
  function render() {
    $('prt-basis').style.display = view === 'conf' ? 'none' : '';
    if (view === 'conf') { $('prt-detail').hidden = true; return renderAvg(); }
    const lb = view === 'lb'; lT.style.display = lb ? 'none' : ''; lP.style.display = lC.style.display = lb ? '' : 'none'; lA.style.display = lb ? 'none' : '';
    // roster vs a league's average player at each player's position (vs-D1 scale; the vs-conference basis would put every league at 70)
    const refA = p => !lb && asel.value && basis === 'd1' ? avgOf(asel.value === '@own' ? p.conf : asel.value, p.pos) : null;
    const dl = (v, a) => { if (v == null || a == null) return ''; const d = Math.round(v) - a; return ` <span class="prt-dl ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}" title="average ${a}">${d > 0 ? '+' : ''}${d}</span>`; };
    $('prt-cfbtn').textContent = 'vs her conference at her position';
    $('prt-title').textContent = lb ? `Player ratings · ${POSN[psel.value]}` : `${short(team)} player ratings`;
    $('prt-sub').textContent = `private · 40–99, 70 = average at her position (${basis === 'd1' ? 'D1' : 'her conference'}) · opponent-adjusted`;
    $('prt-note').textContent = (!lb && asel.value ? (basis === 'd1' ? `+/− = each player minus the average rated ${asel.value === '@own' ? 'player in her own conference' : asel.value === 'D1' ? 'D1 player' : asel.value + ' player'} at her position. ` : 'Switch to "vs D1" to see +/− against a league average. ') : '') + `Position is inferred from touch mix. Rated with ${PR.min_sets}+ sets; each skill needs a minimum volume (e.g. 40 serves, 40 receptions, 30 first-ball swings). Small samples are pulled toward the league average. Click a player for the detail; tick up to ${MAXC} to compare.`;
    const src = lb ? PL.filter(p => p.pos === psel.value && (!csel.value || (csel.value === '__p4' ? P4.includes(p.conf) : p.conf === csel.value)) && p.ov[basis] != null) : (byTeam[team] || []);
    const rows = src.map(p => { const o = { id: p.id, player: p.player, team: p.team, pos: p.pos, conf: p.conf, sets: p.sets, ovr: basis === 'd1' ? p.ov.d1r : p.ov.cfr, ovn: basis === 'd1' ? p.ov.d1n : p.ov.cfn, cmp: cmp.includes(p.id) ? 1 : 0 };
      o.ov = p.ov[basis] == null ? null : p.ov[basis] - (o.ovr || 0) * 1e-6;
      ORDER.forEach(c => { const x = p.comps.find(y => y.comp === c); o[c] = x ? x[basis] : undefined; });
      o.ref = refA(p); o.prev = p.prev; o.dv = p.dv; return o; });
    const cols = [{ key: 'cmp', label: '⇄', title: 'Compare (up to 4)', fmt: (v, r) => `<input type="checkbox" class="prt-ck" data-id="${esc(r.id)}" aria-label="Compare ${esc(r.player)}"${v ? ' checked' : ''}${!v && cmp.length >= MAXC ? ' disabled' : ''}>` },
      { key: 'player', label: 'Player', left: true, asc: true, fmt: (v, r) => `${esc(v)} <span class="pos">${r.pos}</span>` }];
    if (lb) cols.push({ key: 'team', label: 'Team', left: true, asc: true, fmt: (v, r) => `${short(v)} <span class="rk">${r.conf}</span>` });
    cols.push({ key: 'sets', label: 'Sets' }, { key: 'ov', label: 'Overall', fmt: (v, r) => `${rtNum(v == null ? null : Math.round(v))}${r.ref ? dl(v, r.ref.ov) : ''} ${v != null ? rk(r.ovr, r.ovn) : ''}` },
      { key: 'dv', label: `Since ${PY}`, title: `Change in overall vs D1 at her position since the full ${PREVY} season (small number = her ${PREVY} rating). T = transfer · * = under ${SMALL} sets in a season · new = no ${PREVY} rating`, fmt: (v, r) => sinceCell(r) },
      ...ORDER.filter(c => !lb || ((PR.weights[psel.value] || {})[c] != null)).map(c => ({ key: c, label: CN[c], fmt: (v, r) => v === undefined ? '<span class="rk">·</span>' : rtNum(v) + (r.ref ? dl(v, r.ref.comps[c]) : '') })));
    table('t-prt', rows, cols, { sort: 'ov', idKey: 'id', limit: lb ? 150 : 0, rowClass: r => lb && r.team === HL ? 'am' : '', onClick: id => show(byId[id]) });
    if (curP) show(curP, true);
    renderCmp();
  }
  function show(p, quiet) {
    if (!p) return; curP = p; const el = $('prt-detail'); el.hidden = false; const cfn = p.conf;
    const big = (l, v, r, n) => `<div class="kpi"><div class="l">${l}</div><div class="v">${rtNum(v)}</div><div class="d">${r ? `#${r} of ${Number(n).toLocaleString()} ${POSN[p.pos]}` : 'not rated (sets or main-skill volume)'}</div></div>`;
    const w = (PR.weights || {})[p.pos] || {}, inC = cmp.includes(p.id), ca = avgOf(p.conf, p.pos), da = avgOf('D1', p.pos);
    el.innerHTML = `<h3>${esc(p.player)} <small>${p.pos} · #${esc(p.number)} · ${short(p.team)} · ${cfn} · ${p.sets} sets</small>
        <button type="button" class="prt-add" data-id="${esc(p.id)}"${!inC && cmp.length >= MAXC ? ' disabled' : ''}>${inC ? 'Remove from compare' : '+ Compare'}</button></h3>
      <div class="prt-top"><div class="prt-chartbox">${chartSeg('d')}<div class="prt-shape"><div class="prt-radar"><canvas id="c-prt-radar"></canvas></div><div class="note" style="text-align:center">vs ${basis === 'd1' ? 'D1' : cfn} ${POSN[p.pos]}</div></div><div class="prt-wheel" id="w-prt-detail"></div></div>
      <div class="kpis prt-kpis">${big('Overall vs D1', p.ov.d1, p.ov.d1r, p.ov.d1n)}${big(`Overall vs ${cfn}`, p.ov.cf, p.ov.cfr, p.ov.cfn)}
      ${p.comps.map(c => `<div class="kpi"><div class="l">${CN[c.comp]} <span class="rk">${Math.round((w[c.comp] || 0) * 100)}%</span></div><div class="v">${rtNum(c.d1)} <span style="font-size:15px;color:var(--ink-3)">/ ${c.cf ?? '—'}</span></div><div class="d">${c.r ? `D1 #${c.r} of ${Number(c.n).toLocaleString()}` : 'not enough volume'}${ca && ca.comps[c.comp] != null ? ` · ${esc(cfn)} avg ${ca.comps[c.comp]}` : ''}</div></div>`).join('')}</div></div>
      ${sinceBlock(p)}
      <div class="tbl-wrap"><table id="t-prt-m"></table></div>
      <p class="note">Big number = vs D1 ${POSN[p.pos]}, small = vs ${cfn} ${POSN[p.pos]}. % next to each skill = its weight in her overall. Value is her raw number; the ratings use the opponent-adjusted version. Blank rating = under the minimum volume for that metric. Dashed shape = the average ${cfn} ${POSN[p.pos]} (vs-D1 view only).</p>`;
    const refP = a => ({ comps: Object.entries(a.comps).map(([comp, v]) => ({ comp, d1: v, cf: null })) });
    radar('c-prt-radar', [{ label: p.player, p, color: css('--s1') }, ...(basis === 'd1' && ca ? [{ label: `${cfn} avg ${p.pos}`, p: refP(ca), color: css('--ink-3'), ref: true }] : [])]);
    { const tw = window.__tppWheel && window.__tppWheel(p.team, p.player); if (tw && tw.items.length) prtWheel(document.getElementById('w-prt-detail'), tw.items, null, { title: `${esc(p.player)} · ${tw.pos} · D1 percentiles` });
      else prtWheel(document.getElementById('w-prt-detail'), wheelItems(p, cfn), cfn, { title: esc(p.player) }); } applyMode(el);
    if (p.prev && p.prev.ov != null && document.getElementById('c-prt-since')) {
      const asP = list => ({ comps: list.map(([comp, v]) => ({ comp, d1: v, cf: v })) });
      radar('c-prt-since', [{ label: 'Now', p: asP(p.comps.map(c => [c.comp, c.d1])), color: css('--s1') },
        { label: PREVY + (p.prev.team ? ` (${short(p.prev.team)})` : ''), p: asP(Object.entries(p.prev.comps)), color: css('--ink-3'), ref: true }]);
    }
    const ms = p.m.map(m => ({ ...m, ci: ORDER.indexOf(m.comp), ca: ca && ca.m[m.key] ? ca.m[m.key].raw : null, da: da && da.m[m.key] ? da.m[m.key].raw : null }));
    table('t-prt-m', ms, [
      { key: 'ci', label: 'Skill', left: true, asc: true, fmt: (v, r) => CN[r.comp] }, { key: 'label', label: 'Metric', left: true, asc: true },
      { key: 'raw', label: 'Value', fmt: (v, r) => uf(r.unit, v) }, { key: 'n', label: 'n', fmt: v => (v ?? 0).toLocaleString() },
      { key: 'ca', label: `${cfn} avg`, title: `Average of rated ${cfn} ${POSN[p.pos]}`, fmt: (v, r) => uf(r.unit, v) }, { key: 'da', label: 'D1 avg', title: `Average of rated D1 ${POSN[p.pos]}`, fmt: (v, r) => uf(r.unit, v) },
      { key: 'd1', label: 'vs D1', fmt: v => rtNum(v) }, { key: 'cf', label: `vs ${cfn}`, fmt: v => rtNum(v) },
      { key: 'r', label: 'D1 rank', asc: true, fmt: (v, r) => v ? `#${v} <span class="rk">of ${Number(r.rn).toLocaleString()}</span>` : '—' }
    ], { sort: 'ci', asc: true });
    if (!quiet) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function sinceBlock(p) {
    const pv = p.prev, h = `<h4 class="prt-since-h">Since ${PREVY}</h4>`;
    if (!pv) return `<div class="prt-since">${h}<p class="note">No ${PREVY} rating: a freshman, a redshirt, didn't play, came from outside D1, or changed her name. Compare her with the ${esc(p.conf)} and D1 averages above instead.</p></div>`;
    if (pv.how === 'ambiguous') return `<div class="prt-since">${h}<p class="note">Same name on more than one ${PREVY} roster (${esc(pv.cands.map(short).join(', '))}). Add a row to data/player_links.csv (team, player, prev_team, prev_player) to link her.</p></div>`;
    const from = [pv.team ? `Transferred from <b>${esc(short(pv.team))}</b>` : `Same team`, pv.pos ? `rated as <b>${pv.pos}</b> in ${PREVY}` : ''].filter(Boolean).join(' · ');
    if (pv.ov == null) return `<div class="prt-since">${h}<p class="note">${from}. Played ${pv.sets} sets in ${PREVY} but wasn't rated (under ${PR.min_sets} sets or too little volume in her main skill).</p></div>`;
    const d = p.dv, sm = pv.sets < SMALL || p.sets < SMALL;
    const comps = ORDER.filter(c => pv.comps[c] != null || p.comps.find(x => x.comp === c));
    const rows = comps.map(c => { const now = (p.comps.find(x => x.comp === c) || {}).d1, was = pv.comps[c]; const dd = now != null && was != null ? now - was : null;
      return `<tr><td class="l">${CN[c]}</td><td>${rtNum(was)}</td><td>${rtNum(now)}</td><td>${dd == null ? '<span class="rk">·</span>' : `<span class="prt-dl ${dd > 0 ? 'up' : dd < 0 ? 'dn' : ''}">${dd > 0 ? '+' : ''}${dd}</span>`}</td></tr>`; }).join('');
    return `<div class="prt-since">${h}
      <div class="prt-since-top"><div class="kpi"><div class="l">${PREVY} overall</div><div class="v">${rtNum(pv.ov)}</div><div class="d">${pv.sets} sets</div></div>
      <div class="kpi"><div class="l">Now</div><div class="v">${rtNum(p.ov.d1)}</div><div class="d">${p.sets} sets</div></div>
      <div class="kpi"><div class="l">Change</div><div class="v"><span class="prt-dl big ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d == null ? '—' : (d > 0 ? '+' : '') + d}</span></div><div class="d">vs D1 ${POSN[p.pos]}${sm ? ' · small sample' : ''}</div></div></div>
      <p class="note">${from}.${pv.pos ? ` Her ${PREVY} ratings were measured against ${POSN[pv.pos] || pv.pos}, so read the overall change as approximate; skills both positions are rated on compare directly.` : ''}</p>
      <div class="prt-since-grid"><div class="tbl-wrap"><table class="prt-since-t"><thead><tr><th class="l">Skill</th><th>${PREVY}</th><th>Now</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div><div class="prt-radar"><canvas id="c-prt-since"></canvas></div><div class="note" style="text-align:center">${PREVY} (dashed) vs now · vs D1 ${POSN[p.pos]}</div></div></div></div>`;
  }
  function renderCmp() {
    const ps = cmp.map(id => byId[id]).filter(Boolean);
    if (ps.length < 2) { cc.hidden = !ps.length; if (ps.length) cc.innerHTML = `<h3>Compare <small>${esc(ps[0].player)} added · tick one more player to compare (up to ${MAXC})</small> <button type="button" class="prt-clear">Clear</button></h3>`; return; }
    cc.hidden = false;
    const col = i => css(CC[i]);
    const head = ps.map((p, i) => `<th><span class="prt-dot" style="background:${col(i)}"></span>${esc(p.player)}<div class="rk" style="text-transform:none;letter-spacing:0">${p.pos} · ${short(p.team)} · ${p.sets} sets</div></th>`).join('');
    const line = (lab, f) => `<tr><td class="l">${lab}</td>${ps.map(f).join('')}</tr>`;
    const best = vals => { const v = vals.filter(x => x != null); return v.length > 1 ? Math.max(...v) : null; };
    const ovs = ps.map(p => p.ov[basis]), bo = best(ovs);
    let body = line(`<b>Overall</b> <span class="rk">vs ${basis === 'd1' ? 'D1' : 'conf.'} at position</span>`, (p, i) => `<td class="${ovs[i] != null && ovs[i] === bo ? 'prt-best' : ''}">${rtNum(ovs[i])}</td>`);
    ORDER.forEach(c => { if (!ps.some(p => p.comps.find(y => y.comp === c))) return; const v = ps.map(p => { const k = p.comps.find(y => y.comp === c); return k ? k[basis] : undefined; }), b = best(v.map(x => x ?? null));
      body += line(CN[c], (p, i) => `<td class="${v[i] != null && v[i] === b ? 'prt-best' : ''}">${v[i] === undefined ? '<span class="rk">·</span>' : rtNum(v[i])}</td>`); });
    const keys = []; ps.forEach(p => p.m.forEach(m => { if (!keys.find(k => k.key === m.key)) keys.push({ key: m.key, label: m.label, comp: m.comp, unit: m.unit }); }));
    keys.sort((a, b) => ORDER.indexOf(a.comp) - ORDER.indexOf(b.comp));
    let mb = ''; keys.forEach(k => { mb += line(`<span class="rk" style="margin:0 6px 0 0">${CN[k.comp]}</span>${k.label}`, p => { const m = p.m.find(x => x.key === k.key); return `<td>${m ? `${uf(m.unit, m.raw)} <span class="rk">${m[basis] != null ? m[basis] : '—'}</span>` : '<span class="rk">·</span>'}</td>`; }); });
    cc.innerHTML = `<h3>Compare <small>${ps.length} players · ratings vs ${basis === 'd1' ? 'D1' : 'each player\'s own conference'} at their position · best in each row shaded</small> <button type="button" class="prt-clear">Clear</button></h3>
      <div class="prt-cmp-grid"><div class="prt-radar big"><canvas id="c-prt-cmp"></canvas></div>
      <div class="tbl-wrap"><table class="prt-cmp-t"><thead><tr><th class="l"></th>${head}</tr></thead><tbody>${body}</tbody></table></div></div>
      <details class="prt-more"><summary>Every metric <span class="rk">raw value, then rating</span></summary><div class="tbl-wrap"><table class="prt-cmp-t"><thead><tr><th class="l"></th>${head}</tr></thead><tbody>${mb}</tbody></table></div></details>
      <p class="note">Players at different positions are each rated against their own position. Shapes only include the skills a position is rated on.</p>`;
    radar('c-prt-cmp', ps.map((p, i) => ({ label: `${p.player} (${short(p.team)})`, p, color: col(i) })));
  }
  const toggle = id => { const i = cmp.indexOf(id); if (i >= 0) cmp.splice(i, 1); else if (cmp.length < MAXC) cmp.push(id); render(); };
  $('p-prt').addEventListener('click', e => {
    const ck = e.target.closest('.prt-ck'); if (ck) { e.stopPropagation(); toggle(ck.dataset.id); return; }
    const ad = e.target.closest('.prt-add'); if (ad) { toggle(ad.dataset.id); return; }
    if (e.target.closest('.prt-clear')) { cmp = []; render(); }
  }, true);
  asel.addEventListener('change', render);
  tsel.addEventListener('change', () => { team = tsel.value; curP = null; $('prt-detail').hidden = true; render(); });
  [vsel, psel, csel].forEach(x => x.addEventListener('change', () => { view = vsel.value; curP = null; $('prt-detail').hidden = true; render(); }));
  document.querySelectorAll('#prt-basis button').forEach(b => b.addEventListener('click', () => { basis = b.dataset.b; document.querySelectorAll('#prt-basis button').forEach(x => x.classList.toggle('on', x === b)); render(); }));
  // player popup (National / roster): her rating, private like the rest of this tab
  window.__prtSection = (tm, pl) => {
    const p = byId[tm + '|' + pl]; if (!p) return '';
    const h = '<h3 class="pp-h3">Player rating <span class="priv-tag" title="Private: only in your local preview (4)">private</span></h3>';
    if (p.ov.d1 == null) return `${h}<p class="note">Not rated yet: under ${PR.min_sets} sets or too little volume in her main skill.</p>`;
    const rc = window.__tpHas && window.__tpHas(tm, pl) ? (window.__PORTAL__.sec || 'SEC') : p.conf;   // portal athletes compare to the SEC
    const ca = avgOf(rc, p.pos), da = avgOf('D1', p.pos);
    const kp = (l, v, d) => `<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
    const dv = p.dv == null ? (p.prev && p.prev.how === 'ambiguous' ? '?' : p.prev ? '—' : 'new') : `<span class="prt-dl big ${p.dv > 0 ? 'up' : p.dv < 0 ? 'dn' : ''}">${p.dv > 0 ? '+' : ''}${p.dv}</span>`;
    const dvd = p.prev && p.prev.ov != null ? `${PREVY}: ${p.prev.ov}${p.prev.team ? ' at ' + esc(short(p.prev.team)) : ''}` : p.prev ? `played ${PREVY}, not rated` : `no ${PREVY} rating`;
    const chips = ORDER.map(c => { const x = p.comps.find(y => y.comp === c); if (!x) return ''; const a = ca && ca.comps[c];
      return `<div class="pp-chip"><span class="l">${CN[c]}</span> ${rtNum(x.d1)}${a != null && x.d1 != null ? ` <span class="prt-dl ${x.d1 - a > 0 ? 'up' : x.d1 - a < 0 ? 'dn' : ''}" title="vs ${esc(rc)} average ${a}">${x.d1 - a > 0 ? '+' : ''}${x.d1 - a}</span>` : ''}</div>`; }).join('');
    return `${h}<div class="pp-prt"><div>
      <div class="kpis prt-kpis">${kp('Overall vs D1', rtNum(p.ov.d1), `#${p.ov.d1r} of ${Number(p.ov.d1n).toLocaleString()} ${POSN[p.pos]}`)}${kp(`vs ${esc(p.conf)}`, rtNum(p.ov.cf), p.ov.cfr ? `#${p.ov.cfr} of ${p.ov.cfn}` : '')}${kp(`Since ${PY}`, dv, dvd)}</div>
      <div class="pp-chips">${chips}</div>
      <p class="note">40–99 vs D1 ${POSN[p.pos]} (70 = average) · +/− vs the average ${esc(rc)} ${p.pos}${ca && ca.ov != null ? ` (${ca.ov})` : ''}${da && da.ov != null ? ` · D1 avg ${da.ov}` : ''}</p>
      <button type="button" class="pp-prt-open">Open full rating →</button></div>
      <div class="prt-chartbox">${chartSeg('pp')}<div class="prt-shape"><div class="prt-radar"><canvas id="c-pp-prt"></canvas></div><div class="note" style="text-align:center">${p.prev && p.prev.ov != null ? PREVY + ' dashed' : esc(rc) + ' avg dashed'}</div></div><div class="prt-wheel" id="w-pp-prt"></div></div></div>`;
  };
  window.__prtAfter = (tm, pl, dlgEl) => {
    const p = byId[tm + '|' + pl]; if (!p || p.ov.d1 == null || !document.getElementById('c-pp-prt')) return;
    const asP = list => ({ comps: list.map(([comp, v]) => ({ comp, d1: v, cf: v })) });
    const rc = window.__tpHas && window.__tpHas(tm, pl) ? (window.__PORTAL__.sec || 'SEC') : p.conf, ca = avgOf(rc, p.pos);
    const ref = p.prev && p.prev.ov != null ? { label: PREVY, p: asP(Object.entries(p.prev.comps)) } : ca ? { label: `${rc} avg ${p.pos}`, p: asP(Object.entries(ca.comps)) } : null;
    radar('c-pp-prt', [{ label: 'Now', p: asP(p.comps.map(c => [c.comp, c.d1])), color: css('--s1') }, ...(ref ? [{ ...ref, color: css('--ink-3'), ref: true }] : [])]);
    prtWheel(dlgEl.querySelector('#w-pp-prt'), wheelItems(p, p.conf), p.conf, { title: esc(pl) }); applyMode(dlgEl);
    const b = dlgEl.querySelector('.pp-prt-open');
    if (b) b.onclick = () => { dlgEl.close(); btn.click(); vsel.value = view = 'team'; team = p.team; tsel.value = team; render(); show(p); };
  };
  render();
})();


// ---------- Header search (app + public site): any team or player -> team page or player card ----------
(function () {
  const wrap = document.getElementById('g-wrap'); if (!wrap) return;
  // app, private preview and public site (player photos never show on the site: __hs returns '' when PUB)
  wrap.hidden = false;
  const q = document.getElementById('g-q'), box = document.getElementById('g-res'); if (!q || !box || !D) return;
  const nk = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LG = window.__LOGOS__ || {};
  const confOf = Object.fromEntries((D.teams || []).map(t => [t.team, t.conf || '']));
  const TEAMS = (D.teams || []).map(t => ({ kind: 'team', team: t.team, label: short(t.team), sub: t.conf || '', k: nk(t.team + ' ' + short(t.team)), k0: nk(short(t.team)) }));
  const seen = {}; const PLAYERS = [];
  (D.players || []).forEach(p => { if (!p.player || /^Player \d+$/.test(p.player) || !(p.sets > 0)) return; const key = p.team + '|' + p.player; if (seen[key]) { seen[key].sets += p.sets; return; }
    const o = { kind: 'player', team: p.team, player: p.player, label: p.player, sub: [p.pos_guess, short(p.team), p.number != null && p.number !== '' ? '#' + p.number : ''].filter(Boolean).join(' · '), k: nk(p.player), kt: nk(short(p.team)), sets: p.sets, num: p.number };
    seen[key] = o; PLAYERS.push(o); });
  // every typed word must start a word in the name (players can also match on their school)
  const hit = (words, k, extra) => words.every(w => (' ' + k).includes(' ' + w) || (extra && (' ' + extra).includes(' ' + w)));
  let items = [], sel = -1;
  function search(text) {
    const t = nk(text); if (t.length < 2) return [];
    const words = t.split(' ');
    const tm = TEAMS.filter(x => hit(words, x.k)).map(x => ({ ...x, s: (x.k0 === t ? 6 : 0) + (x.k0.startsWith(t) ? 3 : 0) }))
      .sort((a, b) => b.s - a.s || a.label.length - b.label.length || a.label.localeCompare(b.label)).slice(0, 4);
    const pl = PLAYERS.filter(x => hit(words, x.k, x.kt) && words.some(w => (' ' + x.k).includes(' ' + w))).map(x => ({ ...x, s: (x.k.startsWith(t) ? 3 : 0) + (hit(words, x.k) ? 2 : 0) }))
      .sort((a, b) => b.s - a.s || b.sets - a.sets).slice(0, 8);
    return tm.concat(pl);
  }
  const row = (x, i) => { const hu = x.kind === 'player' ? window.__hs(x.team, x.player, x.num) : '', lg = hu ? `<img class="g-hs" src="${hu}" alt="">` : LG[x.team] ? `<img src="${LG[x.team]}" alt="">` : '<span class="g-nolg"></span>';
    const attrs = x.kind === 'team' ? `data-open="${esc(x.team)}"` : D.pmatch ? `data-pl="${esc(x.player)}" data-plt="${esc(x.team)}"` : `data-open="${esc(x.team)}"`;
    return `<a href="#" class="g-it${i === sel ? ' on' : ''}" role="option" ${attrs} data-i="${i}">${lg}<span class="g-t"><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></span><span class="g-k">${x.kind === 'team' ? 'Team' : 'Player'}</span></a>`; };
  function render() {
    if (!items.length) { box.innerHTML = q.value.trim().length >= 2 ? '<div class="g-none">No players or teams found</div>' : ''; box.hidden = q.value.trim().length < 2; return; }
    box.innerHTML = items.map(row).join(''); box.hidden = false; }
  const close = () => { box.hidden = true; sel = -1; };
  q.addEventListener('input', () => { items = search(q.value); sel = items.length ? 0 : -1; render(); });
  q.addEventListener('focus', () => { if (q.value.trim().length >= 2) { items = search(q.value); render(); } });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return; e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; render(); }
    else if (e.key === 'Enter') { const a = box.querySelector(`.g-it[data-i="${Math.max(sel, 0)}"]`); if (a) { e.preventDefault(); a.click(); } }
    else if (e.key === 'Escape') { close(); q.blur(); } });
  box.addEventListener('click', e => { if (e.target.closest('.g-it')) { close(); q.value = ''; } });   // the existing data-open / data-pl handlers do the navigation
  document.addEventListener('click', e => { if (!e.target.closest('.gsearch')) close(); });
  document.addEventListener('keydown', e => { if (e.key === '/' && !/input|select|textarea/i.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); q.focus(); } });
})();


// ---------- Players page (private): Leaders by position + team cards; the original ratings table stays as "Table" ----------
(function () {
  const PR = window.__PRATE__, btn = document.getElementById('prt-tab'), panel = document.getElementById('p-prt');
  if (PUB || !PR || !PR.players || !btn || btn.hidden || !panel || !window.__prtLookup) return;
  btn.innerHTML = 'Players <span class="priv-tag" title="Private: only in the app and your local preview. Never on the website.">private</span>';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tone = window.__prtTone, SK = window.__prtSK, SKN = window.__prtSKN, LG = window.__LOGOS__ || {};
  const PY = "'" + String(PR.prev_season || '2025').slice(2);
  const POS = [['OH', 'Outsides'], ['OPP', 'Opposites'], ['MB', 'Middles'], ['S', 'Setters'], ['L/DS', 'Liberos / DS']];
  const POS1 = { OH: 'Outside', OPP: 'Opposite', 'OPP/MB': 'Opp / middle', MB: 'Middle', S: 'Setter', 'L/DS': 'Libero / DS' };
  const PL_ALL = PR.players.filter(p => p.ov && p.ov[0] != null).map(p => ({ p, team: p.team, player: p.player, pos: p.pos, conf: p.conf, sets: p.sets, num: p.number,
    d1: p.ov[0], cf: p.ov[1], d1r: p.ov[2], d1n: p.ov[3], cfr: p.ov[4], cfn: p.ov[5], comps: window.__prtComps(p), prev: p.prev && p.prev.ov != null ? p.prev.ov : null, psets: p.prev ? p.prev.sets : null, ppos: p.prev ? p.prev.pos || null : null }));
  PL_ALL.forEach(x => { x.dv = x.prev != null ? x.d1 - x.prev : null; });
  // conference matches only: same scale, rated on her conference matches (opponent strength still from the whole season)
  const byKey = Object.fromEntries(PL_ALL.map(x => [x.team + '|' + x.player, x]));
  const PL_CONF = (PR.conf_only || []).map(c => { const b = byKey[c.team + '|' + c.player]; if (!b) return null;
    return { ...b, sets: c.sets, d1: c.ov[0], cf: c.ov[1], d1r: c.ov[2], d1n: c.ov[3], cfr: c.ov[4], cfn: c.ov[5], comps: window.__prtComps(c), all: b.d1, dv: null }; }).filter(Boolean);
  let scope = 'all'; try { if (PR.conf_only && localStorage.getItem('m26plscope') === 'conf') scope = 'conf'; } catch (e) {}
  let PL = scope === 'conf' ? PL_CONF : PL_ALL;
  const scopeSeg = () => PR.conf_only ? `<div class="seg pl-scope"><button type="button" data-s="all"${scope === 'all' ? ' class="on"' : ''}>All matches</button><button type="button" data-s="conf"${scope === 'conf' ? ' class="on"' : ''}>Conference matches</button></div>` : '';
  const scopeWire = fn => { const sg = box.querySelector('.pl-scope'); if (sg) sg.onclick = e => { const b = e.target.closest('button'); if (!b) return; scope = b.dataset.s; PL = scope === 'conf' ? PL_CONF : PL_ALL;
    try { localStorage.setItem('m26plscope', scope); } catch (e) {} if (scope === 'conf' && lview === 'rise') lview = 'top'; fn(); }; };
  const teams = [...new Set(PL_ALL.map(x => x.team))].sort((a, b) => short(a).localeCompare(short(b)));
  const confs = [...new Set(PL_ALL.map(x => x.conf))].sort();
  const oldCards = [...panel.children];   // the original table card, detail and compare cards
  let mode = 'leaders'; try { mode = localStorage.getItem('m26plmode') || 'leaders'; } catch (e) {}
  let rankBy = 'overall', lconf = '', lview = 'top', team = window.__prtLookup && PR.focus && teams.includes(PR.focus) ? PR.focus : teams[0], basis = 'd1', cpos = '';
  const box = document.createElement('div'); box.className = 'card'; box.id = 'pl-new';
  const top = document.createElement('div'); top.className = 'seg'; top.id = 'pl-mode'; top.style.margin = '0 0 12px';
  top.innerHTML = '<button type="button" data-m="leaders">Leaders</button><button type="button" data-m="cards">Team</button><button type="button" data-m="table">Table</button>';
  panel.prepend(box); panel.prepend(top);
  const link = x => `<a href="#" data-pl="${esc(x.player)}" data-plt="${esc(x.team)}">${esc(x.player)}</a>`;
  const lg = t => LG[t] ? `<img src="${LG[t]}" alt="" class="pl-lg">` : '<span class="pl-lg"></span>';   // keep the slot so rows line up
  function leaders() {
    const val = x => rankBy === 'overall' ? x.d1 : (x.comps[rankBy] || {}).d1;
    const cols = POS.map(([pos, name]) => {
      let L = PL.filter(x => x.pos === pos && x.sets >= (scope === 'conf' ? 15 : 20) && (!lconf || (lconf === '__p4' ? ['SEC', 'Big Ten', 'Big 12', 'ACC'].includes(x.conf) : x.conf === lconf)));
      L = lview === 'rise' ? L.filter(x => x.dv != null && x.psets >= 20 && !x.ppos).sort((a, b) => b.dv - a.dv || b.d1 - a.d1) : L.filter(x => val(x) != null).sort((a, b) => val(b) - val(a) || b.sets - a.sets);
      const rows = L.slice(0, 15).map((x, i) => `<div class="pl-lr"><span class="rk">${i + 1}</span>${window.__hs(x.team, x.player, x.num) ? window.__hsImg(x.team, x.player, x.num, 'pl-lhs') : lg(x.team)}<div class="pl-lt"><div>${link(x)}</div><small>${esc(short(x.team))} · ${esc(x.conf)}</small></div>${lview === 'rise'
        ? `<span class="pl-rise"><b class="up">+${x.dv}</b><small>${x.prev} → ${x.d1}</small></span>` : window.__prtBadge(val(x))}</div>`).join('') || '<p class="rk">No players.</p>';
      return `<div class="pl-col"><h4>${name}<span class="rk">${L.length.toLocaleString()}</span></h4>${rows}</div>`; }).join('');
    box.innerHTML = `<h3>Top players by position <small>private · 40–99 vs D1 at her position (70 = average) · ${scope === 'conf' ? 'conference matches only · 15+ conference sets' : '20+ sets'} · click a name for her card</small></h3>
      <div class="controls" style="margin:8px 0 14px">${scopeSeg()}<div class="seg" id="pl-lv"><button type="button" data-v="top"${lview === 'top' ? ' class="on"' : ''}>Top rated</button><button type="button" data-v="rise"${lview === 'rise' ? ' class="on"' : ''}${scope === 'conf' ? ' disabled title="Risers compare full seasons"' : ''}>Risers since ${PY}</button></div>
        <label>Rank by <select id="pl-rb"${lview === 'rise' ? ' disabled' : ''}><option value="overall">Overall</option>${SK.map(([k]) => `<option value="${k}">${SKN[k]}</option>`).join('')}</select></label>
        <label>Conference <select id="pl-cf"><option value="">All D1</option><option value="__p4">Power 4</option>${confs.map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>
      <div class="pl-cols">${cols}</div>
      <p class="note">${scope === 'conf' ? 'Conference matches only: each player is rated on her matches against her own league (opponent strength still comes from the whole season), on the same 40–99 scale. Her card shows the full season. ' : ''}${lview === 'rise' ? `Risers = biggest jump in overall rating from ${PR.prev_season || 2025} (same scale): 20+ sets in both seasons, same position both years. Transfers are included.` : 'Skill ranks only include players rated in that skill.'}</p>`;
    box.querySelector('#pl-rb').value = rankBy; box.querySelector('#pl-cf').value = lconf;
    box.querySelector('#pl-rb').onchange = e => { rankBy = e.target.value; leaders(); };
    box.querySelector('#pl-cf').onchange = e => { lconf = e.target.value; leaders(); };
    box.querySelector('#pl-lv').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; lview = b.dataset.v; leaders(); };
    scopeWire(leaders);
  }
  let hsOn = false;
  function cardOf(x) {
    const ov = basis === 'd1' ? x.d1 : x.cf, r = basis === 'd1' ? `#${x.d1r} of ${Number(x.d1n).toLocaleString()}` : `#${x.cfr} of ${x.cfn} in ${esc(x.conf)}`;
    const bars = SK.filter(([k]) => x.comps[k] && x.comps[k][basis] != null).map(([k]) => { const v = x.comps[k][basis];
      return `<div class="pl-br"><span>${SKN[k]}</span><span class="pl-tr"><i class="${tone(v)}" style="width:${Math.max(2, Math.min(100, (v - 40) / 59 * 100)).toFixed(0)}%"></i><b></b></span><span class="pl-v">${v}</span></div>`; }).join('');
    const ch = scope === 'conf' ? `<span class="prt-dl ${x.d1 > x.all ? 'up' : x.d1 < x.all ? 'dn' : ''}">all matches ${x.all}</span>` : x.dv == null ? '<span class="rk">new</span>' : `<span class="prt-dl ${x.dv > 0 ? 'up' : x.dv < 0 ? 'dn' : ''}">${x.dv > 0 ? '+' : ''}${x.dv} since ${PY}</span>`;
    return `<a href="#" class="pl-card" data-pl="${esc(x.player)}" data-plt="${esc(x.team)}"><div class="pl-ct">${hsOn ? (window.__hsImg(x.team, x.player, x.num, 'pl-chs') || `<span class="hs pl-chs hs-none">${esc(x.player.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>`) : ''}<div class="pl-cn"><div class="pl-nm">${esc(x.player)}</div><div class="pl-ps">#${esc(x.num)} · ${POS1[x.pos] || x.pos} · ${x.sets} sets</div></div>
      <div class="pl-ov"><div class="${tone(ov)}">${ov}</div><small>${r}</small></div></div><div class="pl-bars">${bars}</div>
      <div class="pl-cf">${ch}<span>${basis === 'd1' ? `vs ${esc(x.conf)} ${x.cf}` : `vs D1 ${x.d1}`}</span></div></a>`;
  }
  function cards() {
    const L = PL.filter(x => x.team === team && (!cpos || x.pos === cpos)).sort((a, b) => (basis === 'd1' ? b.d1 - a.d1 : b.cf - a.cf));
    const conf = (L[0] || PL.find(x => x.team === team) || {}).conf || 'conference'; hsOn = window.__hsTeam(team);
    box.innerHTML = `<h3>${lg(team)}${esc(short(team))} player ratings <small>private · ${scope === 'conf' ? 'conference matches only · ' : ''}40–99 · 70 = average at her position · the tick on each bar is 70 · click a card for the full detail</small></h3>
      <div class="controls" style="margin:8px 0 14px">${scopeSeg()}<label>Team <select id="pl-tm">${teams.map(t => `<option value="${esc(t)}">${esc(short(t))}</option>`).join('')}</select></label>
        <div class="seg" id="pl-bs"><button type="button" data-b="d1"${basis === 'd1' ? ' class="on"' : ''}>vs D1</button><button type="button" data-b="cf"${basis === 'cf' ? ' class="on"' : ''}>vs ${esc(conf)}</button></div>
        <label>Position <select id="pl-ps"><option value="">All</option>${POS.map(([p, n]) => `<option value="${p}">${n}</option>`).join('')}</select></label></div>
      <div class="pl-grid">${L.map(cardOf).join('') || `<p class="rk">No rated players (15+ ${scope === 'conf' ? 'conference ' : ''}sets needed).</p>`}</div>`;
    box.querySelector('#pl-tm').value = team; box.querySelector('#pl-ps').value = cpos;
    box.querySelector('#pl-tm').onchange = e => { team = e.target.value; cards(); };
    box.querySelector('#pl-ps').onchange = e => { cpos = e.target.value; cards(); };
    box.querySelector('#pl-bs').onclick = e => { const b = e.target.closest('button'); if (!b) return; basis = b.dataset.b; cards(); };
    scopeWire(cards);
  }
  function setMode(m) {
    mode = m; try { localStorage.setItem('m26plmode', m); } catch (e) {}
    top.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    box.hidden = m === 'table';
    oldCards.forEach(el => { if (m === 'table') { if (el.dataset.plWas != null) { el.hidden = el.dataset.plWas === '1'; delete el.dataset.plWas; } } else { if (el.dataset.plWas == null) el.dataset.plWas = el.hidden ? '1' : '0'; el.hidden = true; } });
    if (m === 'leaders') leaders(); else if (m === 'cards') cards();
  }
  top.onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
  setMode(mode);
})();
