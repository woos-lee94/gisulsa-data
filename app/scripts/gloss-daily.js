// 새 세트·모의고사 낱말을 앱 용어 사전에 더한다(예약 작업 "기술사 용어 사전"이 app/gloss/RUNBOOK_GLOSS.md대로 부른다).
//   node scripts/gloss-daily.js candidates [출력.json]  아직 처리하지 않은 날짜의 세트·모의고사에서 카드·사전에 없는 낱말 후보를 뽑는다
//   node scripts/gloss-daily.js check 풀이.json         [{"w":표제어,"d":풀이}] 를 검사만 한다(파일은 그대로)
//   node scripts/gloss-daily.js add 풀이.json           검사를 통과한 것을 app/gloss/daily.json에 더하고 그 날짜들을 처리됨으로 적는다
// 낱말 찾기는 앱과 똑같이(web/app.js의 glLookup·glForms·glStem) 하려고 jsdom으로 앱을 띄워 쓴다.
// 경로 바꾸기(검사용): GLOSS_DATA=자료 폴더(data), GLOSS_FILE=daily.json 경로
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = path.join(__dirname, '..');
const DATA = process.env.GLOSS_DATA || path.join(APP, '..', 'data');
const FILE = process.env.GLOSS_FILE || path.join(APP, 'gloss', 'daily.json');
const MAX = 300;

function readDaily() {
  try { const j = JSON.parse(fs.readFileSync(FILE, 'utf8')); return { v: 1, updated: j.updated || '', done: Array.isArray(j.done) ? j.done : [], w: j.w && typeof j.w === 'object' ? j.w : {} }; }
  catch (e) { return { v: 1, updated: '', done: [], w: {} }; }
}
function writeDaily(g) {
  const w = {}; Object.keys(g.w).sort((a, b) => a.localeCompare(b, 'ko')).forEach(k => { w[k] = g.w[k]; });
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ v: 1, updated: g.updated, done: [...new Set(g.done)].sort(), w }, null, 1) + '\n');
}

// 앱을 띄워 낱말 찾기 함수를 쓴다(매일 받은 풀이도 사전에 넣은 상태로)
function app(daily) {
  const web = path.join(APP, 'web');
  const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8')
    .replace(/<script src="([^"]+)\?v=\d+"><\/script>/g, (m, src) => `<script>${fs.readFileSync(path.join(web, src), 'utf8')}</script>`);
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://gloss.local/',
    beforeParse(w) { w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) }); w.console.error = () => {}; } });
  const pe = dom.window.__pe;
  pe.SETS().gloss = { at: Date.now(), updated: daily.updated, w: daily.w };
  return pe;
}

// 앱에 들어 있는 내장 사전(web/data_gloss.js)
function builtinGloss() {
  const vm = require('vm'); const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'web', 'data_gloss.js'), 'utf8'), ctx);
  return ctx.window.PE_GLOSS.w;
}

// 처리하지 않은 날짜의 세트·모의고사 파일
function pending(daily) {
  const out = [];
  for (const dir of ['sets', 'mocks']) {
    const p = path.join(DATA, dir); if (!fs.existsSync(p)) continue;
    for (const f of fs.readdirSync(p).sort()) {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/); if (!m || daily.done.includes(m[1])) continue;
      try { out.push({ date: m[1], kind: dir, json: JSON.parse(fs.readFileSync(path.join(p, f), 'utf8')) }); } catch (e) { /* 깨진 파일은 건너뛴다 */ }
    }
  }
  return out;
}

const VERBISH = /(다|게|며|려고|도록|어야|아야|해야|않|던|겠|었|았|듯|려면|으려|니까|지만|는데|있|없)$/;
function candidates(pe, files) {
  const by = new Map();
  for (const f of files) {
    const texts = [];
    JSON.stringify(f.json, (k, v) => { if (typeof v === 'string' && /[가-힣A-Za-z]/.test(v) && v.length > 3 && !/^\d{4}-\d{2}-\d{2}$/.test(v)) texts.push(v); return v; });
    for (const s of texts) {
      const re = /[가-힣A-Za-z0-9]+/g; let m;
      while ((m = re.exec(s))) {
        const t = m[0];
        if (t.length < 2 || /^[0-9]/.test(t) || (/^[A-Za-z]/.test(t) && !/^[A-Z][A-Za-z0-9]*$/.test(t))) continue;
        if (/^[가-힣]+$/.test(t) && VERBISH.test(t)) continue;
        const r = pe.glLookup(t); if (!r || r.t !== 'none') continue;
        const key = pe.glStem(t);
        const c = by.get(key) || { key, forms: new Set(), n: 0, ex: '', dates: new Set() };
        pe.glForms(t).concat(key).forEach(x => c.forms.add(x));
        c.n++; c.dates.add(f.date);
        if (!c.ex) c.ex = s.slice(Math.max(0, m.index - 30), m.index + t.length + 30).replace(/\s+/g, ' ');
        by.set(key, c);
      }
    }
  }
  return [...by.values()].sort((a, b) => b.n - a.n).slice(0, MAX)
    .map(c => ({ key: c.key, forms: [...c.forms], n: c.n, ex: c.ex, dates: [...c.dates] }));
}

const cmd = process.argv[2];
const daily = readDaily();
if (cmd === 'candidates') {
  const files = pending(daily);
  const outFile = process.argv[3] || path.join(require('os').tmpdir(), 'gloss-cands.json');
  if (!files.length) { fs.writeFileSync(outFile, JSON.stringify({ dates: [], cands: [] })); console.log('SKIP: 처리할 새 세트·모의고사가 없어요'); process.exit(0); }
  const pe = app(daily);
  const cands = candidates(pe, files);
  const dates = [...new Set(files.map(f => f.date))];
  fs.writeFileSync(outFile, JSON.stringify({ dates, cands }, null, 1));
  console.log(`날짜 ${dates.join(', ')}: 카드·사전에 없는 낱말 후보 ${cands.length}개 → ${outFile}`);
} else if (cmd === 'add' || cmd === 'check') {
  const inFile = process.argv[3];
  let entries;
  try { entries = JSON.parse(fs.readFileSync(inFile, 'utf8')); if (!Array.isArray(entries)) throw new Error('배열이 아니에요'); }
  catch (e) { console.error('풀이 파일을 읽지 못했어요:', e.message); process.exit(1); }
  const files = pending(daily);
  const pe = app(daily);
  const forms = new Set(); candidates(pe, files).forEach(c => c.forms.forEach(x => forms.add(x)));
  const cm = pe.glIdx().m, G = builtinGloss();
  const why = {}; const skip = (w, r) => { why[r] = (why[r] || []).concat(w); };
  let added = 0;
  for (const e of entries) {
    const w = String((e && e.w) || '').trim(); const d = String((e && e.d) || '').replace(/\s+/g, ' ').trim();
    if (!forms.has(w)) { skip(w, '후보 낱말 꼴이 아님'); continue; }
    if (cm.has(w)) { skip(w, '카드가 있음'); continue; }
    if (Object.prototype.hasOwnProperty.call(G, w) || Object.prototype.hasOwnProperty.call(daily.w, w)) { skip(w, '이미 사전에 있음'); continue; }
    if (d.length < 10 || d.length > 140 || /[<>\n]/.test(d)) { skip(w, '풀이 길이·형식(10~140자, 꺾쇠 없음)'); continue; }
    if (new RegExp('^' + w + '(은|는|이란|:)').test(d)) { skip(w, '풀이가 표제어로 시작'); continue; }
    daily.w[w] = d; added++;
  }
  if (cmd === 'check') {
    console.log(`검사만: 더할 수 있음 ${added}개, 뺌 ${entries.length - added}개(파일은 그대로)`);
    for (const [r, ws] of Object.entries(why)) console.log(`  뺌(${r}): ${ws.join(', ')}`);
    process.exit(0);
  }
  daily.done = daily.done.concat(files.map(f => f.date));
  daily.updated = new Date().toISOString();
  writeDaily(daily);
  console.log(`더함 ${added}개, 뺌 ${entries.length - added}개, 처리한 날짜 ${[...new Set(files.map(f => f.date))].join(', ') || '없음'}, 매일 사전 모두 ${Object.keys(daily.w).length}개`);
  for (const [r, ws] of Object.entries(why)) console.log(`  뺌(${r}): ${ws.join(', ')}`);
} else {
  console.log('쓰는 법: node scripts/gloss-daily.js candidates [출력.json] | check 풀이.json | add 풀이.json');
  process.exit(1);
}
