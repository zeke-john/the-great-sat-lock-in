/* SAT Bank. Routes: #/  #/math  #/rw  #/math/s/<skill>  #/math/d/<domain>  #/math/all  #/q/<id> */
(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const NAME = { math: 'Math', rw: 'Reading and Writing' };
const SHORT = { math: 'Math', rw: 'Reading & Writing' };
const DIFF = { E: 'Easy', M: 'Medium', H: 'Hard' };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = async (path, body) => {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
};
const fmt = ms => { const s = Math.floor((ms || 0) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const I = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  bm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 7h8M8 12h2M12 12h2M16 12h.01M8 16h2M12 16h2M16 16h.01"/></svg>',
  ref: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M12 8l4 4"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
};
const DIRECTIONS = {
  rw: `<h3>Reading and Writing</h3><p>The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).</p><p>All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.</p>`,
  math: `<h3>Math</h3><p>The questions in this section address a number of important math skills. Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed throughout the test.</p><p>Unless otherwise indicated: all variables and expressions represent real numbers; figures provided are drawn to scale; all figures lie in a plane; the domain of a given function <i>f</i> is the set of all real numbers <i>x</i> for which <i>f</i>(<i>x</i>) is a real number.</p><p><b>For multiple-choice questions</b>, solve each problem and choose the correct answer from the choices provided. Each multiple-choice question has a single correct answer.</p><p><b>For student-produced response questions</b>, solve each problem and enter your answer: if you find more than one correct answer, enter only one; you can enter up to 5 characters for a positive answer and up to 6 characters (including the negative sign) for a negative answer; if your answer is a fraction that doesn't fit, enter the decimal equivalent; if your answer is a decimal that doesn't fit, enter it by truncating or rounding at the fourth digit; if your answer is a mixed number, enter it as an improper fraction or its decimal equivalent; don't enter symbols such as a percent sign, comma, or dollar sign.</p>`,
};

/* ---------- state ---------- */
let META = null;
const cache = {};
const filters = (() => { try { return JSON.parse(localStorage.getItem('satbank:f3')) || {}; } catch { return {}; } })();
const saveF = () => localStorage.setItem('satbank:f3', JSON.stringify(filters));
const defF = () => ({ diff: [], type: 'all', status: 'all', sort: 'num', q: '' });
const F = sec => filters[sec] || (filters[sec] = defF());
let collapsed = localStorage.getItem('satbank:side') === '0';
async function rows(sec, fresh) { if (!cache[sec] || fresh) cache[sec] = await api('/api/questions?section=' + sec); return cache[sec]; }
function applyF(list, f) {
  let out = list.filter(r => (!f.diff.length || f.diff.includes(r.difficulty)) && (f.type === 'all' || r.type === f.type) &&
    (f.status === 'all' || (f.status === 'marked' ? r.bookmarked : r.status === f.status)));
  if (f.q) { const q = f.q.toLowerCase(); out = out.filter(r => (r.preview || '').toLowerCase().includes(q) || r.id.startsWith(q) || String(r.ord) === q); }
  const o = { E: 0, M: 1, H: 2 };
  const by = { num: (a, b) => a.ord - b.ord, hard: (a, b) => o[b.difficulty] - o[a.difficulty] || a.ord - b.ord,
    missed: (a, b) => (b.attempts - b.corrects) - (a.attempts - a.corrects) || a.ord - b.ord,
    recent: (a, b) => (b.last_at || '').localeCompare(a.last_at || '') || a.ord - b.ord, slow: (a, b) => (b.last_ms || 0) - (a.last_ms || 0) };
  if (f.sort === 'shuffle') { out = [...out]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } }
  else out = [...out].sort(by[f.sort] || by.num);
  return out;
}
const setList = (ids, sec, title) => sessionStorage.setItem('satbank:list', JSON.stringify({ sec, ids, title }));
const getList = () => { try { return JSON.parse(sessionStorage.getItem('satbank:list')); } catch { return null; } };
const toast = msg => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1500); };

/* ---------- router ---------- */
let cleanup = [];
const onKey = fn => { window.addEventListener('keydown', fn); cleanup.push(() => window.removeEventListener('keydown', fn)); };
window.addEventListener('hashchange', route);

/* ---------- floating tool panels: Desmos + reference sheet, like Bluebook. Live on document.body so redraws never reload Desmos. ---------- */
const FLOAT = { els: {}, host: null, z: 60, onchange: null };
const floatHost = () => { if (!FLOAT.host) { FLOAT.host = document.createElement('div'); FLOAT.host.id = 'bb-floats'; document.body.appendChild(FLOAT.host); } return FLOAT.host; };
const floatOpen = kind => !!FLOAT.els[kind] && FLOAT.els[kind].style.display !== 'none';
const floatAny = () => Object.keys(FLOAT.els).some(floatOpen);
const floatHideAll = () => { Object.keys(FLOAT.els).forEach(k => floatShow(k, false)); };
const floatReset = () => { if (FLOAT.host) FLOAT.host.remove(); FLOAT.host = null; FLOAT.els = {}; };
function floatEl(kind) {
  if (FLOAT.els[kind]) return FLOAT.els[kind];
  const el = document.createElement('div'); el.className = 'bb-float ' + kind; el.style.display = 'none';
  const grip = '<svg viewBox="0 0 24 12" fill="currentColor"><circle cx="4" cy="3" r="1.7"/><circle cx="12" cy="3" r="1.7"/><circle cx="20" cy="3" r="1.7"/><circle cx="4" cy="9" r="1.7"/><circle cx="12" cy="9" r="1.7"/><circle cx="20" cy="9" r="1.7"/></svg>';
  el.innerHTML = `<div class="fh"><span class="t">${kind === 'calc' ? 'Calculator' : 'Reference Sheet'}</span><span class="grip" aria-hidden="true">${grip}</span><span class="acts"><button class="exp" title="Expand">${I.expand}<span>Expand</span></button><button class="cls" title="Close">${I.close}<span>Close</span></button></span></div>`
    + (kind === 'calc' ? '<iframe src="https://www.desmos.com/testing/collegeboard/graphing" title="Desmos graphing calculator"></iframe>' : '<div class="refimg"><img src="/ref.png" alt="SAT reference sheet"></div>');
  floatHost().appendChild(el);
  const top = 76, W = innerWidth, H = innerHeight;
  if (kind === 'calc') Object.assign(el.style, { left: '12px', top: top + 'px', width: Math.min(440, Math.round(W * 0.38)) + 'px', height: Math.max(360, H - top - 78) + 'px' });
  else { const w = Math.min(640, W - 24); Object.assign(el.style, { left: (W - w - 12) + 'px', top: top + 'px', width: w + 'px', height: Math.round((w - 28) * 593 / 1024 + 70) + 'px' }); }
  const fh = el.querySelector('.fh'); let drag = null;
  const raise = () => { el.style.zIndex = ++FLOAT.z; };
  fh.addEventListener('pointerdown', e => { raise(); if (e.target.closest('button')) return; drag = { dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop }; el.classList.add('dragging'); try { fh.setPointerCapture(e.pointerId); } catch {} });
  fh.addEventListener('pointermove', e => { if (!drag) return; el.style.left = Math.max(0, Math.min(innerWidth - 120, e.clientX - drag.dx)) + 'px'; el.style.top = Math.max(0, Math.min(innerHeight - 44, e.clientY - drag.dy)) + 'px'; });
  const end = () => { drag = null; el.classList.remove('dragging'); }; fh.addEventListener('pointerup', end); fh.addEventListener('pointercancel', end);
  el.querySelector('.exp').onclick = () => { const big = el.classList.toggle('big');
    if (big) { el.dataset.prev = JSON.stringify({ l: el.style.left, t: el.style.top, w: el.style.width, h: el.style.height }); Object.assign(el.style, { left: '12px', top: '76px', width: (innerWidth - 24) + 'px', height: (innerHeight - 154) + 'px' }); }
    else { const p = JSON.parse(el.dataset.prev || '{}'); Object.assign(el.style, { left: p.l, top: p.t, width: p.w, height: p.h }); } FLOAT.sync(); };
  el.querySelector('.cls').onclick = () => floatShow(kind, false);
  return FLOAT.els[kind] = el;
}
FLOAT.sync = () => { const el = FLOAT.els.calc, cols = document.querySelector('.bb-cols'); if (cols) cols.classList.toggle('calc-open', !!el && el.style.display !== 'none' && !el.classList.contains('big')); };
function floatShow(kind, on) { const el = floatEl(kind); el.style.display = on ? 'flex' : 'none'; if (on) el.style.zIndex = ++FLOAT.z; if (FLOAT.onchange) FLOAT.onchange(); FLOAT.sync(); }


/* Highlights: Bluebook-style color bar that pops up over a text selection in the passage or question. */
const HL = { bar: null, range: null, mark: null, onapply: null };
const HL_COLORS = ['y', 'b', 'p'];
function hlBar() {
  if (HL.bar) return HL.bar;
  const b = document.createElement('div'); b.className = 'hlbar'; b.style.display = 'none';
  b.innerHTML = HL_COLORS.map(c => `<button class="c ${c}" data-hl="${c}" aria-label="Highlight">${c === 'y' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5s-5.5 6.2-5.5 10a5.5 5.5 0 0 0 11 0c0-3.8-5.5-10-5.5-10z"/></svg>' : ''}</button>`).join('')
    + `<span class="sep"></span><button class="t" data-hl="del" aria-label="Remove highlight"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`;
  b.addEventListener('mousedown', e => e.preventDefault());
  b.addEventListener('click', e => { const k = e.target.closest('[data-hl]'); if (!k) return; hlApply(k.dataset.hl); });
  document.body.appendChild(b); HL.bar = b; return b;
}
function hlHide() { if (HL.bar) HL.bar.style.display = 'none'; HL.range = null; HL.mark = null; }
function hlShowAt(rect, hasMark) {
  const b = hlBar(); b.classList.toggle('has-mark', !!hasMark); b.style.display = 'flex';
  const w = b.offsetWidth, h = b.offsetHeight;
  let x = rect.left + rect.width / 2 - w / 2; x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
  let y = rect.top - h - 10; if (y < 76) y = rect.bottom + 10;
  b.style.left = x + 'px'; b.style.top = y + 'px';
}
function hlWrap(range, cls) {
  // Wrap every text node the range touches in <mark class="hl cls">, splitting the end text nodes first.
  if (range.endContainer.nodeType === 3 && range.endOffset < range.endContainer.length) range.endContainer.splitText(range.endOffset);
  if (range.startContainer.nodeType === 3 && range.startOffset > 0) { const t = range.startContainer.splitText(range.startOffset); range.setStart(t, 0); }
  const root = range.commonAncestorContainer; const walker = document.createTreeWalker(root.nodeType === 3 ? root.parentNode : root, NodeFilter.SHOW_TEXT);
  const nodes = []; let n; while ((n = walker.nextNode())) if (range.intersectsNode(n) && n.nodeValue.trim()) nodes.push(n);
  nodes.forEach(t => { const pm = t.parentNode.closest && t.parentNode.closest('mark.hl'); if (pm && pm.textContent === t.nodeValue) { pm.className = 'hl ' + cls; return; } const m = document.createElement('mark'); m.className = 'hl ' + cls; t.parentNode.insertBefore(m, t); m.appendChild(t); });
}
function hlApply(what) {
  if (what === 'del') { if (HL.mark) { HL.mark.replaceWith(...HL.mark.childNodes); } }
  else if (HL.mark && !HL.range) HL.mark.className = 'hl ' + what;
  else if (HL.range) hlWrap(HL.range, what);
  window.getSelection()?.removeAllRanges(); hlHide(); if (HL.onapply) HL.onapply();
}
function hlWatch(zones, onapply) {
  // zones: selector for the elements whose text can be highlighted. Returns a cleanup fn.
  HL.onapply = onapply;
  const inZone = node => { const el = node && (node.nodeType === 3 ? node.parentNode : node); return !!(el && el.closest && el.closest(zones)); };
  const up = e => {
    if (e.target.closest && e.target.closest('.hlbar')) return;
    setTimeout(() => {
      const s = window.getSelection();
      if (s && !s.isCollapsed && inZone(s.anchorNode) && inZone(s.focusNode)) {
        const r = s.getRangeAt(0); const rect = r.getBoundingClientRect(); if (!rect.width && !rect.height) return hlHide();
        HL.range = r.cloneRange(); HL.mark = (r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer).closest('mark.hl');
        hlShowAt(rect, false); return;
      }
      const m = e.target.closest && e.target.closest('mark.hl');
      if (m && inZone(m)) { HL.range = null; HL.mark = m; hlShowAt(m.getBoundingClientRect(), true); return; }
      hlHide();
    }, 0);
  };
  const down = e => { if (!(e.target.closest && e.target.closest('.hlbar'))) hlHide(); };
  const sc = () => hlHide();
  document.addEventListener('mouseup', up); document.addEventListener('mousedown', down); document.addEventListener('scroll', sc, true); window.addEventListener('resize', sc);
  return () => { document.removeEventListener('mouseup', up); document.removeEventListener('mousedown', down); document.removeEventListener('scroll', sc, true); window.removeEventListener('resize', sc); hlHide(); HL.onapply = null; };
}

async function route() {
  if (!META) META = await api('/api/meta');
  cleanup.forEach(fn => fn()); cleanup = [];
  const h = location.hash || '#/'; let m;
  if (!/^#\/q\//.test(h)) floatReset();
  if (h === '#/') return renderHome();
  if (h === '#/plan') return renderPlan();
  if ((m = h.match(/^#\/(math|rw)$/))) return renderSection(m[1]);
  if ((m = h.match(/^#\/(math|rw)\/(s|d)\/(.+)$/))) return renderSection(m[1], (m[2] === 's' ? 'sk-' : 'dm-') + decodeURIComponent(m[3]));
  if ((m = h.match(/^#\/(math|rw)\/all$/))) return renderSection(m[1]);
  if ((m = h.match(/^#\/q\/([\w-]+)/))) return renderProblem(m[1]);
  location.hash = '#/';
}

/* ---------- shared bits ---------- */
const ICONS = {
  bm: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  xr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const header = sec => `<header class="hdr"><a class="brand" href="#/" aria-label="Home">🦧</a><nav><a href="#/math" class="${sec === 'math' ? 'on' : ''}">Math</a><a href="#/rw" class="${sec === 'rw' ? 'on' : ''}">Reading &amp; Writing</a></nav><span class="right"><a href="#/plan" class="plan ${sec === 'plan' ? 'on' : ''}" title="Notes" aria-label="Notes">📝</a></span></header>`;
const VIEW = (() => { try { return JSON.parse(localStorage.getItem('satbank:view')) || {}; } catch { return {}; } })();
const V = sec => VIEW[sec] || (VIEW[sec] = { view: 'topic', diff: [] });
const saveV = () => localStorage.setItem('satbank:view', JSON.stringify(VIEW));
let sbHidden = localStorage.getItem('satbank:sb') === '0';

/* ---------- home ---------- */
async function renderHome() {
  const [m, r] = await Promise.all([rows('math'), rows('rw')]);
  const card = (sec, all, lbl) => { const s = all.filter(x => x.status === 'solved').length;
    return `<a class="card" href="#/${sec}"><div class="lbl">${lbl}</div><h2>${NAME[sec]}</h2><div class="n">${s}<small> / ${all.length} solved</small></div><div class="bar"><i style="width:${(s / all.length * 100).toFixed(1)}%"></i></div><div class="meta">${all.filter(x => x.status === 'missed').length} missed · ${all.filter(x => x.bookmarked).length} bookmarked</div></a>`; };
  app.innerHTML = header('') + `<main class="home"><div class="hero"><div class="lbl">College Board question bank</div><div class="big">${(m.length + r.length).toLocaleString()}</div><p>Every released SAT question, sorted by skill and difficulty. Pick a section.</p></div>
    <div class="cards">${card('math', m, 'Section 2')}${card('rw', r, 'Section 1')}</div></main>`;
}

/* ---------- plan page ---------- */
async function renderPlan() {
  const html = await (await fetch('/plan.html')).text();
  app.innerHTML = header('plan') + `<main class="planwrap">${html}</main>`;
  const ta = $('#plan-notes'), saved = $('#plan-saved');
  try { const s = await api('/api/settings'); if (s.planNotes) ta.value = s.planNotes; } catch {}
  let t; ta.oninput = () => { clearTimeout(t); saved.textContent = ''; t = setTimeout(async () => { await api('/api/setting', { key: 'planNotes', value: ta.value }); saved.textContent = 'Saved'; }, 600); };
}

/* ---------- section page (Bedrock layout) ---------- */
async function renderSection(sec, scrollTo) {
  const all = await rows(sec, true);
  const v = V(sec);
  const meta = META[sec];
  const skillName = cd => meta.domains.flatMap(d => d.skills).find(s => s.cd === cd)?.name || cd;
  const draw = () => {
    const solved = all.filter(x => x.status === 'solved').length;
    const R = 62, C = 2 * Math.PI * R;
    const pass = r => (!v.diff.length || v.diff.includes(r.difficulty)) && (!v.video || r.video) && (!v.bedrock || r.legacy === 2);
    const tile = r => { const b = r.bookmarked ? 'bm' : r.status === 'solved' ? 'ok' : r.status === 'missed' ? 'bad' : '';
      const ic = r.bookmarked ? ICONS.bm : r.status === 'solved' ? '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      return `<a class="tile ${r.difficulty} ${r.video ? 'vid' : ''}" href="#/q/${r.id}" data-id="${r.id}" data-skill="${r.skill_cd}" title="${esc(r.skill)} ${r.ord} · ${DIFF[r.difficulty]}${r.legacy === 2 ? ' · Bedrock' : ''}${r.video ? ' · video solution' : ''}${r.first_ms ? ' · ' + fmt(r.first_ms) : ''}">${r.ord}${r.video ? `<span class="pv">${I.play}</span>` : (r.legacy === 2 ? `<span class="pv bk">🪨</span>` : '')}${b ? `<span class="bd ${b}">${ic}</span>` : ''}</a>`; };
    const skillBlock = (s, items, rowsByDiff) => {
      const tot = all.filter(r => r.skill_cd === s.cd), sv = tot.filter(r => r.status === 'solved').length;
      const body = rowsByDiff
        ? ['E', 'M', 'H'].map(k => { const it = items.filter(r => r.difficulty === k); return it.length ? `<div class="row"><span class="tag">${DIFF[k]}</span>${it.map(tile).join('')}</div>` : ''; }).join('')
        : `<div class="row">${items.map(tile).join('')}</div>`;
      return `<div class="skill" id="sk-${s.cd}"><div class="nm">${esc(s.name)}<div class="pb"><i style="width:${(sv / tot.length * 100).toFixed(0)}%"></i></div><small>${sv}/${tot.length} solved</small><button class="skp" data-skp="${s.cd}" ${items.some(r => r.status !== 'solved') ? '' : 'disabled'}>Practice</button></div><div class="rows">${body}</div></div>`;
    };
    let main = '', shownIds = [];
    if (v.view === 'topic') {
      main = meta.domains.map(d => { const blocks = d.skills.map(s => { const items = all.filter(r => r.skill_cd === s.cd && pass(r)); shownIds.push(...items.map(r => r.id)); return items.length ? skillBlock(s, items, true) : ''; }).join(''); return blocks ? `<section class="dom" id="dm-${d.cd}"><h3>${esc(d.name)}</h3>${blocks}</section>` : ''; }).join('');
    } else if (v.view === 'difficulty') {
      main = ['E', 'M', 'H'].filter(k => !v.diff.length || v.diff.includes(k)).map(k => `<section class="dom"><h3>${DIFF[k]}</h3>${meta.domains.flatMap(d => d.skills).map(s => { const items = all.filter(r => r.skill_cd === s.cd && r.difficulty === k); shownIds.push(...items.map(r => r.id)); return items.length ? skillBlock(s, items, false) : ''; }).join('')}</section>`).join('');
    } else if (v.view === 'time') {
      const done = all.filter(r => r.attempts && pass(r)).sort((a, b) => (b.first_ms || 0) - (a.first_ms || 0));
      shownIds.push(...done.map(r => r.id));
      const buckets = [['Over 3 minutes', 180000, Infinity], ['2 to 3 minutes', 120000, 180000], ['1 to 2 minutes', 60000, 120000], ['30 to 60 seconds', 30000, 60000], ['Under 30 seconds', 0, 30000]];
      const blocks = buckets.map(([l, lo, hi]) => { const it = done.filter(r => (r.first_ms || 0) >= lo && (r.first_ms || 0) < hi); if (!it.length) return '';
        return `<div class="skill"><div class="nm">${l}<small>${it.length} problem${it.length === 1 ? '' : 's'} · ${it.filter(x => x.status === 'solved').length} right</small></div><div class="tl">${it.map(r => `<div class="tr">${tile(r)}<span class="t">${fmt(r.first_ms || 0)}</span><a class="s" href="#/q/${r.id}">${esc(r.skill)} <small>· ${DIFF[r.difficulty]}</small></a><span class="rs ${r.status}">${r.status === 'solved' ? 'Right' : 'Wrong'}${r.attempts > 1 ? ` · ${r.attempts} tries` : ''}</span></div>`).join('')}</div></div>`; }).join('');
      main = `<section class="dom"><h3>By time, slowest first</h3><p class="sub">Time of your first attempt on each problem. Open a problem and press History for later tries.</p>${blocks || '<div class="empty">Nothing attempted yet.</div>'}</section>`;
    } else {
      const pick = v.view === 'bookmarked' ? (r => r.bookmarked) : (r => r.status === 'missed');
      const blocks = meta.domains.flatMap(d => d.skills).map(s => { const items = all.filter(r => r.skill_cd === s.cd && pick(r) && pass(r)); shownIds.push(...items.map(r => r.id)); return items.length ? skillBlock(s, items, false) : ''; }).join('');
      main = `<section class="dom"><h3>${v.view === 'bookmarked' ? 'Bookmarked problems' : 'Missed problems'}</h3>${blocks || `<div class="empty">${v.view === 'bookmarked' ? 'Nothing bookmarked yet. Use Mark for Review on a question.' : 'No missed problems. Nice.'}</div>`}</section>`;
    }
    app.innerHTML = header(sec) + `
      <div class="hero"><div class="lbl">College Board question bank</div><div class="big">${all.length.toLocaleString()}<small>${sec === 'math' ? 'math problems' : 'reading &amp; writing problems'}</small></div><p>Every released ${NAME[sec]} question${sec === 'math' ? ' plus the Bedrock bank' : ''}, numbered from easiest to hardest within each skill.</p></div>
      <div class="wrap ${sbHidden ? 'nosb' : ''}">
        <aside class="sb">
          <div class="ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${R}" fill="none" stroke="#e4e2da" stroke-width="12"/><circle cx="75" cy="75" r="${R}" fill="none" stroke="#16a34a" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * solved / all.length).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 75 75)"/></svg><div class="v"><div><b>${solved}<small>/${all.length}</small></b><span>Solved</span></div></div></div>
          <ul class="dl">${['E', 'M', 'H'].map(k => { const t = all.filter(x => x.difficulty === k); return `<li><span class="${k}">${k === 'M' ? 'Med' : DIFF[k]}</span><span>${t.filter(x => x.status === 'solved').length}/${t.length}</span></li>`; }).join('')}</ul>
          <div class="quick"><button class="${v.view === 'bookmarked' ? 'on' : ''}" data-view="bookmarked"><span style="color:var(--coral)">${ICONS.bm}</span>Bookmarked Problems</button><button class="${v.view === 'missed' ? 'on' : ''}" data-view="missed"><span style="color:var(--r600)">${ICONS.xr}</span>Missed Problems</button></div>
          <h4>Topics</h4><ul class="topics">${meta.domains.map(d => { const t = all.filter(x => x.domain_cd === d.cd); const closed = (v.folded || []).includes(d.cd); return `<li class="${closed ? 'closed' : ''}" data-dom="${d.cd}"><div class="dh"><button class="caret" data-fold="${d.cd}" aria-label="Collapse ${esc(d.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><a class="d" href="#/${sec}" data-go="dm-${d.cd}">${esc(d.name)}<small>${t.filter(x => x.status === 'solved').length}/${t.length}</small></a></div><div class="skl">${d.skills.map(s => { const u = all.filter(x => x.skill_cd === s.cd); return `<a class="s" href="#/${sec}" data-go="sk-${s.cd}">${esc(s.name)}<small>${u.filter(x => x.status === 'solved').length}/${u.length}</small></a>`; }).join('')}</div></li>`; }).join('')}</ul>
          <button class="reset" id="resetsec">Reset ${NAME[sec]} progress…</button>
        </aside>
        <main class="main">
          <div class="top"><button class="hamb" id="sb" title="Toggle sidebar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><h2>Problems</h2>
            ${['E', 'M', 'H'].map(k => `<button class="chip ${k} ${v.diff.includes(k) ? 'on' : ''}" data-diff="${k}">${DIFF[k]}</button>`).join('')}${all.some(r => r.legacy === 2) ? `<button class="chip B ${v.bedrock ? 'on' : ''}" id="bkchip"><b>🪨</b>Bedrock</button>` : ''}${all.some(r => r.video) ? `<button class="chip V ${v.video ? 'on' : ''}" id="vidchip">${I.play}Video</button>` : ''}
            <div class="sel"><select id="view">${[['topic', 'Topic'], ['difficulty', 'Difficulty'], ['time', 'By time'], ['bookmarked', 'Bookmarked'], ['missed', 'Missed']].map(([k, l]) => `<option value="${k}" ${v.view === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <button class="btn" id="practice" ${shownIds.length ? '' : 'disabled'}>Practice</button></div>
          ${main}
        </main>
      </div>`;
    const re = () => { saveV(); draw(); };
    app.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { const k = b.dataset.diff; v.diff = v.diff.includes(k) ? v.diff.filter(x => x !== k) : [...v.diff, k]; re(); });
    app.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { v.view = v.view === b.dataset.view ? 'topic' : b.dataset.view; re(); });
    { const vc = $('#vidchip'); if (vc) vc.onclick = () => { v.video = !v.video; re(); }; const bc = $('#bkchip'); if (bc) bc.onclick = () => { v.bedrock = !v.bedrock; re(); }; }
    $('#view').onchange = e => { v.view = e.target.value; re(); };
    $('#sb').onclick = () => { sbHidden = !sbHidden; localStorage.setItem('satbank:sb', sbHidden ? '0' : '1'); $('.wrap').classList.toggle('nosb', sbHidden); };
    app.querySelectorAll('[data-fold]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const cd = b.dataset.fold; v.folded = v.folded || []; const li = b.closest('li'); if (v.folded.includes(cd)) { v.folded = v.folded.filter(x => x !== cd); li.classList.remove('closed'); } else { v.folded.push(cd); li.classList.add('closed'); } saveV(); });
    app.querySelectorAll('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); if (v.view !== 'topic') { v.view = 'topic'; saveV(); draw(); } const el = document.getElementById(a.dataset.go); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    app.querySelectorAll('.tile').forEach(a => a.onclick = () => { const ids = [...a.closest('.rows').querySelectorAll('.tile')].map(t => t.dataset.id); setList(ids, sec, skillName(a.dataset.skill)); });
    app.querySelectorAll('[data-skp]').forEach(b => b.onclick = () => { const cd = b.dataset.skp; const pool = all.filter(r => r.skill_cd === cd && pass(r) && r.status !== 'solved');
      if (!pool.length) { toast('Nothing left to practice here'); return; }
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      setList(pool.map(r => r.id), sec, skillName(cd)); location.hash = '#/q/' + pool[0].id; });
    $('#practice').onclick = () => { const byId = Object.fromEntries(all.map(r => [r.id, r])); const pool = shownIds.filter(i => byId[i].status !== 'solved');
      if (!pool.length) { toast('Nothing left to practice here'); return; }
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      setList(pool, sec, NAME[sec] + ' practice'); location.hash = '#/q/' + pool[0]; };
    $('#resetsec').onclick = async () => { if (!confirm(`Delete all your ${NAME[sec]} attempts? Bookmarks are kept.`)) return; await api('/api/reset', { section: sec }); delete cache[sec]; route(); };
  };
  draw();
  const barH = () => { const bar = $('.main .top'); if (bar) document.documentElement.style.setProperty('--barh', bar.offsetHeight + 'px'); };
  barH(); const ro = window.ResizeObserver ? new ResizeObserver(barH) : null; if (ro && $('.main .top')) ro.observe($('.main .top')); cleanup.push(() => ro && ro.disconnect());
  if (scrollTo) { const el = document.getElementById(scrollTo); if (el) setTimeout(() => { el.scrollIntoView({ block: 'start' }); }, 30); }
}


/* =====================================================================
   PROBLEM SCREEN (Bluebook)
   ===================================================================== */
async function renderProblem(id) {
  const q = await api('/api/question/' + id);
  const sec = q.section, isMath = sec === 'math';
  const all = await rows(sec);
  const row = all.find(r => r.id === id);
  let ctx = getList();
  if (!ctx || ctx.sec !== sec || !ctx.ids.includes(id)) { ctx = { sec, ids: all.filter(r => r.skill_cd === q.skill_cd).map(r => r.id), title: q.skill }; setList(ctx.ids, sec, ctx.title); }
  const idx = ctx.ids.indexOf(id), prevId = ctx.ids[idx - 1], nextId = ctx.ids[idx + 1];
  const listHash = `#/${sec}${row ? '/s/' + encodeURIComponent(row.skill_cd) : ''}`;

  let elapsed = 0, running = true, last = performance.now(), hidden = localStorage.getItem('satbank:timerHidden') === '1';
  const tick = setInterval(() => { if (running) { const n = performance.now(); elapsed += n - last; last = n; const t = $('#bbtime'); if (t && !hidden) t.textContent = fmt(elapsed); } }, 250);
  cleanup.push(() => clearInterval(tick));
  let selected = null, struck = new Set(), abc = localStorage.getItem('satbank:abc') !== '0', checked = null, bookmarked = q.bookmarked, pop = null, paused = false, showHist = false; // pop: 'nav' | 'more' | 'dir'
  const hlKey = 'satbank:hl:' + id; let saved = {}; try { saved = JSON.parse(localStorage.getItem(hlKey) || '{}'); } catch {}
  let passageHTML = saved.passage || q.stimulus || '', stemHTML = saved.stem || q.stem;
  const saveHL = () => { const pas = $('#passage'), st = $('.bb-stem'); if (pas) passageHTML = pas.innerHTML; if (st) stemHTML = st.innerHTML; const has = /class="hl /.test(passageHTML + stemHTML); if (has) localStorage.setItem(hlKey, JSON.stringify({ passage: passageHTML, stem: stemHTML })); else localStorage.removeItem(hlKey); };

  const opt = o => `<li class="bb-opt"><button class="o ${selected === o.label ? 'sel' : ''} ${struck.has(o.label) ? 'struck' : ''} ${checked ? (q.correct.includes(o.label) ? 'right' : selected === o.label ? 'wrong' : '') : ''}" data-opt="${o.label}" ${checked ? 'disabled' : ''}><span class="l">${o.label}</span><span class="b">${o.html}</span></button><button class="x ${struck.has(o.label) ? 'undo' : ''}" data-strike="${o.label}" aria-label="Cross out ${o.label}">${struck.has(o.label) ? 'Undo' : o.label}</button></li>`;

  if (!isMath) cleanup.push(hlWatch('#passage, .bb-stem', saveHL));
  const draw = () => {
    const qblock = `
      <div class="bb-qbar"><span class="n">${idx + 1}</span><button class="mark ${bookmarked ? 'on' : ''}" id="mark">${I.bm} Mark for Review</button>${q.type === 'mcq' ? `<button class="abc ${abc ? 'on' : ''}" id="abc" title="Cross out answer choices">ABC</button>` : ''}${q.attempts.length ? `<button class="hist ${showHist ? 'on' : ''}" id="hist">${I.clock} History · ${q.attempts.length}</button>` : ''}</div>
      ${showHist && q.attempts.length ? histHTML() : ''}
      ${isMath && q.stimulus ? `<div class="bb-stim">${q.stimulus}</div>` : ''}
      <div class="bb-stem ${isMath ? '' : 'serif'}">${isMath ? q.stem : stemHTML}</div>
      ${q.type === 'mcq' ? `<ul class="bb-opts ${abc ? 'abc-on' : ''} ${isMath ? '' : 'serif'}">${q.options.map(opt).join('')}</ul>`
        : `<div class="bb-spr"><input id="spr" autocomplete="off" ${checked ? 'disabled' : ''} value="${esc(selected || '')}"><div class="pv">Answer Preview:<b id="sprprev">${preview(selected)}</b></div></div>`}
      ${!checked ? `<div class="bb-check"><button class="bb-btn outline" id="check" ${selected ? '' : 'disabled'}>Check Answer</button></div>` : ''}
      ${checked ? `<div class="bb-result ${checked.correct ? 'ok' : 'bad'}"><div class="h">${checked.correct ? 'Correct' : 'Incorrect'}${checked.correct ? '' : ` · Correct answer: ${esc(checked.keys.join(' or '))}`}<span class="t">${fmt(elapsed)}</span></div><div class="x"><details ${checked.correct ? '' : 'open'}><summary>Explanation</summary>${q.rationale || '<p>No explanation available.</p>'}</details>${q.video ? `<div class="bb-video"><div class="vh">${I.play} Video solution</div><video controls preload="metadata" src="/videos/${q.video}"></video></div>` : ''}${checked.correct ? '' : '<div class="again"><button class="bb-pill" id="retry">Try again</button></div>'}</div></div>` : ''}`;
    app.innerHTML = `<div class="bb">
      <header class="bb-top">
        <div class="l"><div class="sec">${esc(q.skill)}: ${DIFF[q.difficulty] || ''}</div><button class="dir" id="dir">Directions ${I.chev}</button></div>
        <div class="c"><span class="bb-time" id="bbtime">${hidden ? I.clock : fmt(elapsed)}</span><button class="bb-pill" id="hide">${hidden ? 'Show' : 'Hide'}</button></div>
        <div class="r">${isMath ? `<button class="bb-tool ${floatOpen('calc') ? 'on' : ''}" id="calc">${I.calc}Calculator</button><button class="bb-tool ${floatOpen('ref') ? 'on' : ''}" id="ref">${I.ref}Reference</button>` : `<button class="bb-tool" id="annot">${I.pen}Annotate</button>`}<button class="bb-tool ${pop === 'more' ? 'on' : ''}" id="more">${I.more}More</button></div>
        ${pop === 'dir' ? `<div class="bb-dirpop" id="dirpop">${DIRECTIONS[sec]}<div class="close"><button class="bb-btn" id="dirclose">Close</button></div></div>` : ''}
        ${pop === 'more' ? `<div class="bb-menu" id="menu">${!checked ? `<button id="m-pause">${paused ? 'Resume timer' : 'Pause timer'}</button>` : ''}<button id="m-clear">Clear my attempts on this question</button><button id="m-copy">Copy question ID (${q.id})</button><div class="sep"></div><button id="m-exit">Exit to ${esc(ctx.title || NAME[sec])}</button></div>` : ''}
      </header>
      <div class="bb-body">
        <div class="bb-cols ${floatOpen('calc') ? 'calc-open' : ''}">
          ${paused ? `<div class="bb-veil"><div style="text-align:center">Timer paused<br><button class="bb-btn" id="resume">Resume</button></div></div>` : ''}
          ${isMath ? `<div class="bb-single"><div class="bb-q">${qblock}</div></div>`
            : `<div class="bb-pane left"><div class="bb-passage serif" id="passage">${passageHTML}</div></div><div class="bb-pane right">${qblock}</div>`}
        </div>
      </div>
      <footer class="bb-bot"><span class="who">${isMath ? 'Math' : 'Reading and Writing'}</span><button class="bb-qnav" id="navbtn">Question ${idx + 1} of ${ctx.ids.length} ${I.up}</button><div class="nav"><button class="bb-btn" id="prev" ${prevId ? '' : 'disabled'}>Back</button><button class="bb-btn" id="next">${checked ? 'Next' : (nextId ? 'Next' : 'Finish')}</button></div>
        ${pop === 'nav' ? navPop() : ''}</footer>
    </div>`;
    wire(); FLOAT.sync();
    if (q.legacy === 2 && window.renderMathInElement) { const root = $('.bb-q') || app; try { renderMathInElement(root, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch {} }
  };
  const when = t => { if (!t) return 'Just now'; const d = new Date(t.replace(' ', 'T') + 'Z'); return isNaN(d) ? t : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const histHTML = () => `<div class="bb-hist"><div class="h">Your history on this question</div><table><thead><tr><th>#</th><th>When</th><th>You chose</th><th>Result</th><th>Time</th></tr></thead><tbody>${q.attempts.map((a, i) => `<tr><td>${i + 1}</td><td>${when(a.created_at)}</td><td>${esc(a.answer || '—')}</td><td class="${a.is_correct ? 'ok' : 'bad'}">${a.is_correct ? 'Correct' : 'Incorrect'}</td><td>${fmt(a.elapsed_ms || 0)}</td></tr>`).join('')}</tbody></table></div>`;
  function preview(v) { if (!v) return ''; const m = String(v).match(/^(-?)(\d+)\/(\d+)$/); if (m) return `<math><mrow>${m[1] ? '<mo>−</mo>' : ''}<mfrac><mn>${m[2]}</mn><mn>${m[3]}</mn></mfrac></mrow></math>`; return esc(v); }
  const navPop = () => { const st = Object.fromEntries(all.map(r => [r.id, r]));
    return `<div class="bb-navpop" id="navpop"><div class="hd">${isMath ? 'Section 2: Math' : 'Section 1: Reading and Writing'} Questions<button class="cl" id="navclose" aria-label="Close">×</button></div>
      <div class="lg"><span><i class="cur"></i>Current</span><span><i></i>Unanswered</span><span><i style="border-style:solid;background:#324dc7"></i>Answered</span><span><i class="rev"></i>For Review</span></div>
      <div class="grid">${ctx.ids.map((i, k) => { const r = st[i] || {}; return `<a href="#/q/${i}" class="${r.status !== 'new' && r.status ? 'ans' : ''} ${r.status === 'missed' ? 'bad' : ''} ${r.bookmarked ? 'rev' : ''} ${i === id ? 'cur' : ''}" title="${esc(r.skill || '')} · ${DIFF[r.difficulty] || ''}${r.status === 'missed' ? ' · missed' : ''}">${k + 1}</a>`; }).join('')}</div>
      <div class="ft"><a href="${listHash}">Go to Review Page</a></div></div>`; };

  const go = h => { if (h) location.hash = '#/q/' + h; };
  const check = async () => {
    running = false;
    const res = await api('/api/attempt', { question_id: id, answer: selected, elapsed_ms: Math.round(elapsed) });
    checked = res; q.attempts.push({ answer: selected, is_correct: res.correct ? 1 : 0, elapsed_ms: Math.round(elapsed) });
    if (row) { if (!row.attempts) row.first_ms = Math.round(elapsed); row.attempts++; row.last_ms = Math.round(elapsed); row.status = res.correct ? 'solved' : 'missed'; if (res.correct) row.corrects++; }
    draw(); const r = $('.bb-result'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const next = () => { if (!checked && selected) return check(); if (nextId) go(nextId); else location.hash = listHash; };
  function highlight() {
    const s = window.getSelection();
    if (!s || s.isCollapsed) { toast('Make a selection first.'); return; }
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }
  function wire() {
    const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
    app.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { if (checked) return; const l = b.dataset.opt; selected = selected === l ? null : l; struck.delete(l); draw(); });
    app.querySelectorAll('[data-strike]').forEach(b => b.onclick = () => { const l = b.dataset.strike; if (struck.has(l)) struck.delete(l); else { struck.add(l); if (selected === l) selected = null; } draw(); });
    on('#abc', () => { abc = !abc; localStorage.setItem('satbank:abc', abc ? '1' : '0'); draw(); });
    const spr = $('#spr'); if (spr) { spr.oninput = () => { selected = spr.value.trim() || null; $('#sprprev').innerHTML = preview(selected); const cb = $('#check'); if (cb) cb.disabled = !selected; }; spr.onkeydown = e => { if (e.key === 'Enter') next(); }; if (!checked) spr.focus(); }
    on('#prev', () => go(prevId)); on('#next', next); on('#check', () => { if (selected && !checked) check(); });
    on('#retry', () => { checked = null; selected = null; paused = false; running = true; elapsed = 0; last = performance.now(); draw(); });
    on('#hist', () => { showHist = !showHist; draw(); });
    on('#hide', () => { hidden = !hidden; localStorage.setItem('satbank:timerHidden', hidden ? '1' : '0'); draw(); });
    on('#mark', async () => { bookmarked = !bookmarked; await api('/api/bookmark', { question_id: id, on: bookmarked }); if (row) row.bookmarked = bookmarked; draw(); });
    on('#calc', () => floatShow('calc', !floatOpen('calc'))); on('#ref', () => floatShow('ref', !floatOpen('ref')));
    FLOAT.onchange = () => { const c = $('#calc'), r = $('#ref'), cols = $('.bb-cols'); if (c) c.classList.toggle('on', floatOpen('calc')); if (r) r.classList.toggle('on', floatOpen('ref')); if (cols) cols.classList.toggle('calc-open', floatOpen('calc')); };
    on('#annot', highlight);
    on('#navbtn', () => { pop = pop === 'nav' ? null : 'nav'; draw(); }); on('#navclose', () => { pop = null; draw(); });
    on('#more', () => { pop = pop === 'more' ? null : 'more'; draw(); });
    on('#dir', () => { pop = pop === 'dir' ? null : 'dir'; draw(); }); on('#dirclose', () => { pop = null; draw(); });
    const setPaused = p => { paused = p; running = !p && !checked; last = performance.now(); };
    on('#m-pause', () => { setPaused(!paused); pop = null; draw(); }); on('#resume', () => { setPaused(false); draw(); });
    on('#m-copy', () => { navigator.clipboard?.writeText(id); toast('Copied ' + id); pop = null; draw(); });
    on('#m-exit', () => { location.hash = listHash; });
    on('#m-clear', async () => { if (!confirm('Clear your attempts on this question?')) return; await api('/api/reset', { question_id: id }); q.attempts = []; checked = null; selected = null; if (row) { row.attempts = 0; row.corrects = 0; row.status = 'new'; row.last_ms = null; row.first_ms = null; } pop = null; draw(); });
    if (pop) setTimeout(() => document.addEventListener('click', e => { if (!e.target.closest('#navpop,#menu,#dirpop,#navbtn,#more,#dir')) { pop = null; draw(); } }, { once: true }), 0);
  }
  draw();
}

const REF = `<div class="g">
  <div class="f"><div class="n">Circle</div><math><mi>A</mi><mo>=</mo><mi>π</mi><msup><mi>r</mi><mn>2</mn></msup></math><br><math><mi>C</mi><mo>=</mo><mn>2</mn><mi>π</mi><mi>r</mi></math></div>
  <div class="f"><div class="n">Rectangle</div><math><mi>A</mi><mo>=</mo><mi>ℓ</mi><mi>w</mi></math></div>
  <div class="f"><div class="n">Triangle</div><math><mi>A</mi><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mi>b</mi><mi>h</mi></math></div>
  <div class="f"><div class="n">Right triangle</div><math><msup><mi>c</mi><mn>2</mn></msup><mo>=</mo><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup></math></div>
  <div class="f"><div class="n">30-60-90</div><math><mi>x</mi><mo>,</mo><mi>x</mi><msqrt><mn>3</mn></msqrt><mo>,</mo><mn>2</mn><mi>x</mi></math></div>
  <div class="f"><div class="n">45-45-90</div><math><mi>s</mi><mo>,</mo><mi>s</mi><mo>,</mo><mi>s</mi><msqrt><mn>2</mn></msqrt></math></div>
  <div class="f"><div class="n">Box</div><math><mi>V</mi><mo>=</mo><mi>ℓ</mi><mi>w</mi><mi>h</mi></math></div>
  <div class="f"><div class="n">Cylinder</div><math><mi>V</mi><mo>=</mo><mi>π</mi><msup><mi>r</mi><mn>2</mn></msup><mi>h</mi></math></div>
  <div class="f"><div class="n">Sphere</div><math><mi>V</mi><mo>=</mo><mfrac><mn>4</mn><mn>3</mn></mfrac><mi>π</mi><msup><mi>r</mi><mn>3</mn></msup></math></div>
  <div class="f"><div class="n">Cone</div><math><mi>V</mi><mo>=</mo><mfrac><mn>1</mn><mn>3</mn></mfrac><mi>π</mi><msup><mi>r</mi><mn>2</mn></msup><mi>h</mi></math></div>
  <div class="f"><div class="n">Pyramid</div><math><mi>V</mi><mo>=</mo><mfrac><mn>1</mn><mn>3</mn></mfrac><mi>ℓ</mi><mi>w</mi><mi>h</mi></math></div>
</div><ul><li>The number of degrees of arc in a circle is 360.</li><li>The number of radians of arc in a circle is 2π.</li><li>The sum of the measures in degrees of the angles of a triangle is 180.</li></ul>`;

route();
})();
