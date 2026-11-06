// 오늘 몫·이번 주 계산(app.js 11-0) 검사(jsdom, 시계 고정). 실행: node tests/plan.test.js
// 가짜 저장소는 tests/fake로 메모리에서 만든다: 10/19 세트를 10/19~10/23(0주차)·10/26~10/30(1주차)로 복제(용어 이름·카드 id를 날짜마다 바꿈),
// 10/24 모의를 10/31로 복제하고 2교시 논술 2문을 붙인다. 기록은 ux 예시 상태와 같게 코드로 만든다
// (지난주 세트는 1·3일 차 복습까지, 10/26 핵심·논술·숙제(단답 빼고), 10/27 핵심, 10/28 읽기만, 10/29 안 엶, 10/30 읽기 5/10).
// 예시 숫자는 v3가 10/31에 나왔다고 보고 센다(MOCK_GRADE_SINCE='2026-10-31'; 앱의 값은 출시하는 날).
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '..', 'web');
const FAKE = path.join(__dirname, 'fake', 'data');
const rd = f => JSON.parse(fs.readFileSync(path.join(FAKE, f), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
const add = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok:', m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── 가짜 저장소 ── */
const BASE = rd('sets/2026-10-19.json'), MOCK0 = rd('mocks/2026-10-24.json');
// 세트마다 가리키는 기본 덱 카드(실제 세트와 같은 id라 간격이 돌아온 카드 수가 예시와 같다). 10/21은 새 용어 3개
const REFS = {
  '2026-10-19': ['F06', 'F14', 'K31', 'K04', 'B05', 'B08'], '2026-10-20': ['K01', 'N03', 'A06', 'K42', 'E12', 'B06'],
  '2026-10-21': ['E13', 'E02', 'K06', 'A06', 'Q03', 'K42', 'C09'], '2026-10-22': ['P06', 'A13', 'K07', 'E05', 'B02', 'B11'],
  '2026-10-23': ['K05', 'K100', 'K43', 'K15', 'K03', 'K26'], '2026-10-26': ['S02', 'S05', 'S04', 'K99', 'K21', 'T04'],
  '2026-10-27': ['K89', 'T09', 'T11', 'K29', 'K21', 'S01'], '2026-10-28': ['T02', 'T03', 'T06', 'S03', 'S10', 'S11'],
  '2026-10-29': ['T17', 'S08', 'S07', 'S09', 'S06', 'K90'], '2026-10-30': ['K21', 'T06', 'K29', 'T05', 'K89', 'T02']};
const ALT = ['F06', 'F14', 'K31', 'K04', 'B05', 'B08', 'K01', 'N03', 'A06'];
// 다른 단계 세트: 새 용어 수는 PE_SETRULE대로(1단계 4 · 2단계 3 · 3단계 2 · 4단계 1), 나머지는 기본 덱 카드
const refsFor = ph => ALT.slice(0, 10 - ({ 1: 4, 2: 3, 3: 2, 4: 1 }[ph] || 4));
function cloneSet(d, week, refs, extra) {
  const s = clone(BASE), tag = d.replace(/-/g, '').slice(2), r = refs || refsFor(1), nf = 10 - r.length;
  const fresh = s.cards.filter(c => !c.ref).slice(0, nf).map(c => Object.assign(clone(c), { t: c.t.replace(/^([^(]+?)(\s*\(.*)?$/, (m, a, b) => a + ' ' + tag + (b || '')) }));
  s.date = d; s.week = week; s.title = BASE.title + ' ' + tag; s.cards = fresh.concat(r.map(x => ({ ref: x })));
  return Object.assign(s, extra || {}); }
const ESSAY = (t, u) => ({ t, u, x: [], o: ['개요', '원리', '특징', '시공 관리', '품질 관리', '결론'], fig: t.slice(0, 8) + ' 단면' });
const P2_2 = [ESSAY('쏘일네일링 공법의 특성과 장단점을 설명하시오.', 1), ESSAY('심층혼합처리공법(DCM)의 특성 및 시공관리방안을 설명하시오.', 2)];
const P6 = n => Array.from({ length: 6 }, (_, i) => ESSAY(`${n}교시 논술 ${i + 1}번 문제를 설명하시오.`, 1 + i % 3));
function cloneMock(d, parts) { const m = clone(MOCK0); m.date = d; m.title = '모의 ' + d; delete m.p1; Object.assign(m, parts); return m; }
function buildSets() {
  const sets = {}, mocks = { '2026-10-24': clone(MOCK0) };
  Object.keys(REFS).forEach(d => sets[d] = cloneSet(d, d < '2026-10-26' ? 0 : 1, REFS[d]));
  mocks['2026-10-31'] = cloneMock('2026-10-31', { p1: clone(MOCK0.p1), p2: P2_2 });
  return { sets, mocks }; }
const FIX = buildSets();
const setIdsOf = (S, d) => S.sets[d].cards.map((c, i) => c.ref || ('D' + d.replace(/-/g, '') + '-' + (i + 1)));
function buildState() {
  const H4 = { w0: 2, s0: 4, w1: 2, s1: 4, w2: 2, s2: 4, w3: 2, s3: 4, r4: 1, r5: 1, r6: 1, r7: 1, r8: 1, r9: 1, eo: 4, fg: 3 };
  const spec = {
    '2026-10-19': { read: 10, quiz: 1, essay: 1, rev: 1, hw: Object.assign({}, H4, { dd0: 1, sl: 1 }) },
    '2026-10-20': { read: 10, quiz: 1, rev: 1, hw: Object.assign({}, H4, { dd0: 1, sl: 1 }) },
    '2026-10-21': { read: 10, quiz: 1, essay: 1, rev: 1, hw: { w0: 2, s0: 4, w1: 2, s1: 4, w2: 2, s2: 4, r3: 1, r4: 1, r5: 1, r6: 1, r7: 1, r8: 1, r9: 1, eo: 4, fg: 3 } },
    '2026-10-22': { read: 10, quiz: 1, rev: 1, hw: {} }, '2026-10-23': { read: 10, quiz: 1, rev: 1, hw: {} },
    '2026-10-26': { read: 10, quiz: 1, essay: 1, hw: H4 }, '2026-10-27': { read: 10, quiz: 1, hw: {} },
    '2026-10-28': { read: 10, hw: {} }, '2026-10-30': { read: 5, hw: {} }};
  const sp = {}, cards = {};
  Object.keys(spec).forEach(d => { const o = spec[d], s = FIX.sets[d], p = { read: {}, quiz: {}, tasks: {}, essay: {}, rev: {}, first: d, hw: clone(o.hw) };
    for (let i = 0; i < o.read; i++) p.read[i] = 1;
    if (o.quiz) s.quiz.forEach((q, i) => p.quiz[i] = { pick: q.a, ok: true });
    if (o.essay) p.essay = { done: true };
    if (o.rev) p.rev = { 1: add(d, 1), 3: add(d, 3) };
    sp[d] = p; const old = d < '2026-10-26';
    setIdsOf(FIX, d).slice(0, o.read).forEach(id => { if (!cards[id]) cards[id] = { box: old ? 2 : 1, due: add(d, old ? 4 : 1), seen: 1, ok: 0, ng: 0, star: false, last: d, intro: 1 }; }); });
  return { v: 2, settings: { start: '2026-10-19', target: 'auto', roundDates: {}, exam: '', mock: '', newPerDay: 10, theme: 'auto', fs: 'm', dataUrl: '' },
    cards, userCards: [], userEssays: [], essayStat: {}, checks: {}, log: [], hidden: {}, daily: {}, lastMock: null, created: '2026-10-31',
    sp, qp: {}, wrong: {}, sync: {}, mockp: { '2026-10-24': { p1: true } }, cal: {}, resume: {}, tk: {}, today: null, wk: {} }; }
const ST = buildState();
// 심사 상태(수 10/28): 월요일 다 함, 화요일 통째로 건너뜀, 수요일은 용어 10개 읽기만
const WED = (() => { const s = clone(ST); delete s.sp['2026-10-27']; delete s.sp['2026-10-30']; Object.keys(s.cards).forEach(id => { if (/^D20261030-/.test(id)) delete s.cards[id]; }); return s; })();
// 빈 주: 이번 주 기록 없음(지난주는 예시와 같다)
const EMPTY = (() => { const s = clone(ST); ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].forEach(d => delete s.sp[d]); Object.keys(s.cards).forEach(id => { if (s.cards[id].last >= '2026-10-26') delete s.cards[id]; }); return s; })();
const BLANK = (() => { const s = clone(ST); s.sp = {}; s.cards = {}; s.mockp = {}; return s; })();

/* ── 앱 띄우기(시계는 바꿀 수 있게) ── */
let appJs = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
const gradeRe = /const MOCK_GRADE_SINCE='[^']*'/;
const gradePatched = gradeRe.test(appJs); appJs = appJs.replace(gradeRe, "const MOCK_GRADE_SINCE='2026-10-31'");
// 무거운 기록 계산을 부른 횟수(검사 24): 숙제 항목(hwItems)·간격 온 카드(dueCards)·다시 볼 세트(dueSetReviews)
const CNT = ['function hwItems(d){', 'function dueCards(units){', 'function dueSetReviews(){'], cntPatched = CNT.every(f => appJs.split(f).length === 2);
CNT.forEach((f, i) => { appJs = appJs.replace(f, f + `(window.__cnt=window.__cnt||[0,0,0])[${i}]++;`); });
const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')
  .replace(/<script src="([^"]+)\?v=\d+"><\/script>/g, (m, src) => `<script>${src === 'app.js' ? appJs : fs.readFileSync(path.join(SITE, src), 'utf8')}</script>`)
  .replace(/<link rel="stylesheet" href="https:[^>]+>/, '');
let SERVER = null;   // 검사 46: 저장소가 앱보다 앞선 때(앱에 없는 세트가 저장소에 있음). 없으면 앱이 가진 세트를 그대로
const repo = () => { const X = SERVER || (pe ? pe.SETS() : FIX), f = { 'data/index.json': { v: 1, updated: '2026-10-31T06:30:00+09:00', sets: Object.keys(X.sets).sort().map(d => ({ d, rev: 1, t: X.sets[d].title, u: X.sets[d].units })), mocks: Object.keys(X.mocks).sort().map(d => ({ d, rev: 1, t: X.mocks[d].title })) } };
  Object.keys(X.sets).forEach(d => f['data/sets/' + d + '.json'] = X.sets[d]); Object.keys(X.mocks).forEach(d => f['data/mocks/' + d + '.json'] = X.mocks[d]); return f; };
let NOW = new Date('2026-10-31T08:00:00').getTime(), pe = null;
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://gisulsa.test/',
  beforeParse(w) {
    const RD = w.Date;
    class FD extends RD { constructor(...a) { if (a.length === 0) super(NOW); else super(...a); } static now() { return NOW; } }
    w.Date = FD;
    w.localStorage.setItem('pe_state_v1', JSON.stringify(ST));
    w.fetch = async (url) => { const m = String(url).match(/gisulsa-data\/main\/((?:data|app\/gloss)\/[^?]+)/); const f = m && repo()[m[1]];
      if (f) { const t = JSON.stringify(f); return { ok: true, status: 200, json: async () => JSON.parse(t) }; }
      return { ok: false, status: 404, json: async () => ({}) }; };
    w.console.error = (...a) => { errors.push(a.join(' ')); };
  } });
const w = dom.window, d = w.document;
w.confirm = () => true; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
const click = (sel, root) => { const el = (root || d).querySelector(sel); if (!el) { fails++; console.log('FAIL: no element', sel); return null; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return el; };
const go = async h => { w.location.hash = h; await sleep(40); };
/* 장면: 시계를 맞추고 기록을 통째로 바꾼다(앱 안의 S·SETS를 그 자리에서 바꾸고 다시 센다) */
function scene(iso, st, sets) {
  NOW = new Date(iso).getTime(); const S = pe.S();
  Object.keys(S).forEach(k => delete S[k]); Object.assign(S, { tk: {}, today: null, wk: {} }, clone(st));
  const X = pe.SETS(), Y = sets || FIX; X.sets = clone(Y.sets); X.mocks = clone(Y.mocks);
  pe.recalcPlan(); pe.invalidate(); const U = pe.UI(); U.later = {}; U.act = null; U.d = null; }
const at = iso => { NOW = new Date(iso).getTime(); };
const ids = P => P.rows.map(r => r.id);
const mins = P => P.rows.reduce((a, r) => a + r.m, 0);
const line = (B, k) => B.lines.find(x => x.k === k);
/* 계획한 줄을 다 한 것으로(앱이 쓰는 기록 그대로): 읽기·퀴즈·세트 복습·숙제 칸·손글씨 몫·모의·채점·리포트·카드·오답·단계 할 일 */
function applyRows(rows, date) {
  const S = pe.S(), sp = x => S.sp[x] || (S.sp[x] = { read: {}, quiz: {}, tasks: {}, essay: {}, rev: {}, hw: {} }), box = [0, 1, 3, 7, 14, 30, 60];
  const gradeCard = id => { const c = S.cards[id] || (S.cards[id] = { box: 0, seen: 0, ok: 0, ng: 0, star: false }); c.box = Math.min(6, (c.box || 0) + 1); c.seen = (c.seen || 0) + 1; c.ok = (c.ok || 0) + 1; c.last = date; c.due = add(date, box[c.box]);
    const g = S.daily[date] || (S.daily[date] = { newSeen: 0, graded: 0 }); g.graded++; };
  const readSet = x => { const s = pe.SETS().sets[x], p = sp(x); if (!p.first) p.first = date; s.cards.forEach((_, i) => p.read[i] = 1); pe.setIds(x).forEach(id => { if (!S.cards[id] || !S.cards[id].seen) S.cards[id] = { box: 1, due: add(date, 1), seen: 1, ok: 0, ng: 0, star: false, last: date, intro: 1 }; }); };
  const quizSet = x => { const s = pe.SETS().sets[x], p = sp(x); if (!p.first) p.first = date; s.quiz.forEach((q, i) => p.quiz[i] = { pick: q.a, ok: true }); };
  const setHw = (x, k, v) => { const h = sp(x).hw = sp(x).hw || {}; h[k] = Math.max(h[k] || 0, v); };
  for (const r of rows) {
    const x = r.task || {}, [ty, a, b] = r.id.split(':');
    if (ty === 'set.read') readSet(a); else if (ty === 'set.quiz') quizSet(a);
    else if (ty === 'late') { readSet(a); quizSet(a); }
    else if (ty === 'rev') { const p = sp(a); p.rev = p.rev || {}; p.rvd = p.rvd || {}; [1, 3, 7, 14, 30].filter(s => s <= Number(b)).forEach(s => { if (!p.rvd[s]) p.rvd[s] = p.rev[s] || date; p.rev[s] = date; }); pe.setIds(a).forEach(gradeCard); }   // markReviewed와 같게: rev는 덮고 rvd에 처음 끝낸 날
    else if (/^hw\.(say|write|eo|fg)$/.test(ty)) { const H = pe.hwParts(a)[{ 'hw.say': 'say', 'hw.write': 'write', 'hw.eo': 'eo', 'hw.fg': 'fg' }[ty]], v = r.tgt === 'full' ? H.F : H.f; H.ks.forEach(k => setHw(a, k, v)); }
    else if (ty === 'hw.dd') pe.hwParts(a).dd.ks.forEach(k => setHw(a, k, 1));
    else if (ty === 'hw.sl') setHw(a, 'sl', 1);
    else if (ty === 'hw.qz') pe.hwParts(a).qz.ks.forEach(k => setHw(a, k, 1));
    else if (ty === 'essay') sp(a).essay = { done: true };
    else if (/^q\./.test(ty)) { const q = ty.slice(2); for (const [x, n] of (r.q || [])) {
        if (q === 'redo') { S.tk['x.redo:' + date + ':' + x.slice(1)] = date; continue; }
        const P = pe.hwParts(x);
        if (q === 'dd') P.dd.ks.slice(0, n + P.dd.k).forEach(k => setHw(x, k, 1));
        if (q === 'eo') setHw(x, 'eo', Math.min((sp(x).hw || {}).eo || 0, P.eo.n) + n);
        if (q === 'fg') setHw(x, 'fg', Math.min((sp(x).hw || {}).fg || 0, P.fg.n) + n);
        if (q === 'w') { let m = n; P.write.ks.forEach(k => { if (m > 0 && !((sp(x).hw || {})[k] >= P.write.f)) { setHw(x, k, P.write.f); m--; } }); }
        if (q === 'essay') sp(x).essay = { done: true }; } }
    else if (ty === 'mock') { S.mockp[a] = S.mockp[a] || {}; S.mockp[a][b] = true; } else if (ty === 'mock.g') { S.mockp[a] = S.mockp[a] || {}; S.mockp[a].g = date; }
    else if (ty === 'report') S.tk['report:' + a] = date;
    else if (ty === 'cards') { S.tk['cards:' + date] = date; pe.cardsOut(date).slice(0, x.kc || 60).forEach(c => gradeCard(c.id)); }
    else if (ty === 'wrong') S.tk['wrong:' + date] = date;
    else if (ty === 'x.outline') { const es = pe.essays().slice(0, 5); es.forEach(e => S.essayStat[e.id] = { good: 1, weak: 0, last: date }); }
    else if (ty === 'x.rot') { const g = S.daily[date] || (S.daily[date] = { newSeen: 0, graded: 0 }); g.graded = Math.max(g.graded || 0, x.n || 50); }
    else S.tk[r.id] = date;
  }
}
/* 빈 주를 날마다 계획대로(세트는 그날 06:21에 온다): 07:00 계획 → 다 함 → 22:00. 점수(지금 n%)를 07:00·22:00마다 */
function runWeek(W, sets, st) {
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => add(W, i)), arrived = { sets: { }, mocks: { } };
  Object.keys(sets.sets).filter(x => x < W).forEach(x => arrived.sets[x] = sets.sets[x]); Object.keys(sets.mocks).filter(x => x < W).forEach(x => arrived.mocks[x] = sets.mocks[x]);
  scene(W + 'T07:00:00', st, arrived); const out = [];
  for (const day of days) {
    at(day + 'T07:00:00'); const X = pe.SETS(); if (sets.sets[day]) X.sets[day] = clone(sets.sets[day]); if (sets.mocks[day]) X.mocks[day] = clone(sets.mocks[day]); pe.invalidate();
    const V = pe.planToday(day), b0 = pe.weekBoard(day); applyRows(V.rows, day);
    at(day + 'T22:00:00'); const V2 = pe.planToday(day), b1 = pe.weekBoard(day);
    out.push({ day, am: b0.pct, pm: b1.pct, reach: b0.reach, lv: b0.lv, plan: mins(V), done: V2.rows.every(r => r.done), B: b1.B });
  }
  return out; }

(async () => {
  await sleep(700);
  pe = w.__pe;
  ok(gradePatched, '예시 계산용 MOCK_GRADE_SINCE를 2026-10-31로 맞춤');
  ok(cntPatched, '검사용 호출 수 세기(hwItems·dueCards·dueSetReviews)를 붙임');
  // 예전(2.x) 기록으로 3.0.0을 처음 열면 "바뀐 점" 창 한 번. 본 것(S.tk['seen:v3'])은 사용자가 닫을 때 적어 다시 뜨지 않음(점검 3-2):
  // 알림을 눌러 연 앱(App.js onLoadEnd → PE_IO._go)이 다른 화면으로 가도 창은 그 화면 위에 그대로, 본 것도 아직 아님
  { const mw = d.querySelector('#modal-wrap'), v3 = () => /바뀐 점/.test(mw.textContent) && !!mw.querySelector('[data-v3]'), hl = w.history.length;
    ok(/오늘 몫 · 이번 주 · 복습 · 연습으로 정리했어요\. 예전 기능은 모두 그대로 있어요\./.test(mw.textContent) && v3() && !pe.S_NEW() && !pe.S().tk['seen:v3'],
      '예전 기록으로 처음 열면 바뀐 점 창("오늘 몫 · 이번 주 · 복습 · 연습으로 정리했어요. 예전 기능은 모두 그대로 있어요."), 본 것은 닫을 때 적음');
    w.PE_IO._go('today'); await sleep(60);
    ok(v3() && !pe.S().tk['seen:v3'] && w.location.hash === '#today', '3-2. 평일 알림 "오늘 세트 확인"(_go today)으로 열어도 바뀐 점 창은 그대로(본 것 아님)');
    w.PE_IO._go('review'); await sleep(60);
    ok(v3() && !pe.S().tk['seen:v3'] && w.location.hash === '#review' && /오답 노트/.test(d.querySelector('#view').textContent) && w.history.length === hl, '3-2. 일요일 알림 "복습 비우기"(_go review): 복습 화면 위에 바뀐 점 창을 다시(방문 기록 그대로)');
    click('#modal-wrap [data-act="sheet-close"]'); await sleep(10); ok(!mw.innerHTML && pe.S().tk['seen:v3'] === '2026-10-31', '바뀐 점 창 닫기 → 본 것으로 적음(S.tk seen:v3)');
    w.PE_IO._go('today'); await sleep(60); ok(!mw.innerHTML && w.location.hash === '#today', '3-2. 닫은 뒤에는 알림으로 열어도 다시 뜨지 않음'); }
  ok(Object.keys(pe.SETS().sets).length === 10 && pe.SETS().mocks['2026-10-31'] && pe.SETS().mocks['2026-10-31'].p2.length === 2, '가짜 저장소: 세트 10개(10/19~10/30), 10/31 모의(1교시 + 논술 2문)');
  ok(Object.values(REFS).flat().every(id => pe.deck().some(c => c.id === id)), '복제 세트가 가리키는 카드가 모두 덱에 있음');
  ok(pe.setIds('2026-10-29').length === 10 && pe.setIds('2026-10-29')[0] === 'D20261029-1', '복제 세트의 새 용어는 날짜마다 다른 카드(D20261029-1…)');
  const THU = '2026-10-29', WD = '2026-10-28', SAT = '2026-10-31', SUN = '2026-11-01', MON = '2026-11-02';

  // 1. 목 07:40
  scene('2026-10-29T07:40:00', ST);
  { const P = pe.dayPlan(THU), B = pe.weekBoard(THU), I = ids(P);
    ok(I[0] === 'set.read:2026-10-29', '1. 목 07:40: 첫 줄은 오늘 세트 용어 읽기');
    const rv = P.rows.filter(r => r.task.k === 'rev');
    ok(rv.length === 7 && rv.every(r => r.task.need === '필수') && rv.filter(r => r.task.p === 3).map(r => r.id).join() === 'rev:2026-10-27:1,rev:2026-10-28:1' && rv.filter(r => r.task.p === 5).map(r => r.id).join() === 'rev:2026-10-26:3,rev:2026-10-19:7,rev:2026-10-20:7,rev:2026-10-21:7,rev:2026-10-22:7',
      '1. 세트 복습 7개 모두 필수: 1·3일 차 앞 2개(10/27·10/28 1일 차)는 P3, 나머지(10/26 3일 차 → 이번 주에 기한이 온 7일 차 10/19~10/22)는 손글씨 뒤 남은 시간에(P5)');
    ok(P.rows.filter(r => r.task.k === 'late').map(r => r.id).join() === 'late:2026-10-28', '1. 밀린 세트는 가장 오래된 하나(10/28 퀴즈)');
    ok(!I.some(id => /^q\./.test(id)) && !P.fold.some(x => x.k === 'rev'), '1. 평일엔 손글씨 몫 줄 없음, 세트 복습은 남은 시간에 다 들어가 시간이 되면에 남지 않음');
    ok(B.B === 468 && B.C === 900 && B.lv === 0, `1. 이번 주 B ${B.B} / C ${B.C} → 단계 ${B.lv} (기록: 468 / 900 → 0)`);
    const hw = P.rows.filter(r => r.task.hw), R1 = w.PE_HW[1];
    ok(hw.length === 3 && hw.every(r => r.tgt === 'full') && P.rows.find(r => r.id === 'hw.say:2026-10-29').task.prog[1] === 4 * R1.s && P.rows.find(r => r.id === 'hw.write:2026-10-29').task.prog[1] === 4 * R1.w && P.rows.find(r => r.id === 'hw.eo:2026-10-29').task.prog[1] === R1.eo, '1. 단계 0: 숙제 목표는 학원 횟수(말하기 16·쓰기 8·목차 4)');
    const floor = P.rows.filter(r => r.task.p < 5).reduce((a, r) => a + (r.task.hw ? r.task.minFloor : r.m), 0);
    ok(floor === 82 && floor <= 120, `1. 남은 시간에 채우는 줄(P5) 빼고 필수 칸만이면 ${floor}분(≤120, 기록 82)`);
    ok(P.rows.length === 16 && mins(P) === 153 && mins(P) <= 180, `1. 오늘 몫 ${P.rows.length}줄 · ${mins(P)}분(≤180) = 108분 + 세트 복습 5개 40분 + 카드 복습 10장 5분 (기록 108 → 153)`);
    ok(B.pct === 17 && B.reach === 97, `1. 지금 ${B.pct}% → 다 하면 ${B.reach}% (기록 17 → 97)`);
    const cr = P.rows.find(r => r.id === 'cards:2026-10-29'), ri = P.rows.map(r => r.id);
    ok(cr && cr.task.kc === 10 && cr.m === 5 && rv.every(r => ri.indexOf(r.id) < ri.indexOf(cr.id)), '1. 카드 복습은 세트 복습을 다 넣은 뒤 오늘 몫에(넣은 세트 복습 7개의 카드를 빼고 10장 · 5분)');
    ok(pe.cardsOut(THU).length === 57, '1. 고정 전 카드 복습 수 = 간격 온 카드 − 꼭 들어갈 세트 복습(P3 2개) 카드 (57)');
    pe.planToday(THU); ok(pe.cardsOut(THU).length === 10 && pe.taskList(THU).find(x => x.k === 'cards').kc === 10, '1. 고정한 뒤 카드 복습 수 = 간격 온 카드 − 오늘 계획한 세트 복습 7개의 카드 (10, 오늘 몫 줄과 같은 수)'); }

  // 2. 수 21:30(화요일 건너뜀, 이날 처음 연 화면)
  scene('2026-10-28T21:30:00', WED);
  { const P = pe.dayPlan(WD);
    ok(P.capLeft === 120 && P.cap === 180, `2. 수 21:30: 계획 한도 ${P.capLeft}분(예산 180이 아니라 23:30까지 남은 시간)`);
    ok(pe.curBlock(WD) === 'eve', '2. 지금 블록은 저녁');
    ok(P.rows.length === 10 && mins(P) === 116 && mins(P) <= 120 && P.lv === 0 && ['rev:2026-10-19:7', 'rev:2026-10-20:7'].every(x => ids(P).includes(x)) && P.moved.map(x => x.id + '→' + x.dest).join() === 'rev:2026-10-21:7→내일 다시 나와요' && P.fold.some(x => x.id === 'cards:2026-10-28' && x.wait),
      `2. 기본: 10줄 · ${mins(P)}분(≤120) = 100분 + 남은 20분에 이번 주 7일 차 세트 복습 2개, 셋째(10/21)는 내일 다시 나와요, 카드 복습은 그 뒤라 기다림 (기록 100 → 116)`);
    const P60 = pe.dayPlan(WD, { user: 60 }), I = ids(P60);
    ok(mins(P60) === 60 && ['set.quiz:2026-10-28', 'hw.dd:2026-10-28', 'hw.sl:2026-10-28'].every(x => I.includes(x)) && I.includes('rev:2026-10-19:7'), `2. 오늘 시간 1시간: ${mins(P60)}분(≤60), 최소 몫(세트 퀴즈·단답 1문·자기 전) 들어 있음, 쓰기·목차가 들어가지 않은 남은 8분에 7일 차 세트 복습 하나 (기록 52 → 60)`);
    ok(P60.moved.map(x => x.label + ' ' + x.min + '→' + x.dest).join() === '새 용어 4개 안 보고 쓰기 1번 12→토요일 따라잡기,논술 목차 옮겨 적기 2번 10→토요일 따라잡기,세트 복습 10/20(화) 7일 차 8→내일 다시 나와요,세트 복습 10/21(수) 7일 차 8→내일 다시 나와요', '2. 1시간: 뺀 필수(쓰기 1번 12분·목차 2번 10분 → 토요일 따라잡기, 7일 차 세트 복습 2개 → 내일 다시 나와요)');
    ok(P60.rows.find(r => r.id === 'hw.say:2026-10-28').task.meta === '오늘은 2번까지', '2. 줄인 날 말하기는 필수 칸까지("오늘은 2번까지")');
    const P30 = pe.dayPlan(WD, { user: 30 }), I3 = ids(P30);
    ok(mins(P30) === 29 && I3.join() === 'set.quiz:2026-10-28,hw.say:2026-10-28,hw.dd:2026-10-28,hw.sl:2026-10-28', `2. 30분: 들어가는 줄만 ${mins(P30)}분(기록 29), 최소 몫 포함`);
    ok(P30.moved.every(x => x.dest) && P30.moved.find(x => x.id === 'late:2026-10-27').dest === '토요일 따라잡기' && P30.moved.find(x => x.id === 'rev:2026-10-26:1').dest === '내일 다시 나와요', '2. 30분: 뺀 필수마다 갈 곳(밀린 세트 → 토요일 따라잡기, 세트 복습 → 내일 다시 나와요)'); }

  // 3. 고정: 줄을 끝내도 id 그대로, 다 해도 새 필수 줄이 생기지 않음, 다시 그려도 "다른 날로 옮긴 것" 그대로
  scene('2026-10-28T21:30:00', WED);
  { const V0 = pe.planToday(WD), F = pe.S().today;
    ok(F && F.d === WD && F.v === 2 && F.lv === 0 && F.user === null && F.rows.length === 10 && F.rows.every(r => r.id && r.m >= 0 && !('label' in r)), '3. planToday가 S.today를 고정(id·분만, 글은 없음, PLAN_V 2)');
    pe.planToday(WD, { replan: 'cap', user: 60 });
    const id0 = pe.S().today.rows.map(r => r.id).join(), V1 = pe.planToday(WD);
    ok(V1.moved.map(x => x.id).join() === 'hw.write:2026-10-28,hw.eo:2026-10-28,rev:2026-10-20:7,rev:2026-10-21:7', '3. 오늘 시간 1시간 뒤 옮긴 것 4개(쓰기·목차, 7일 차 세트 복습 2개)');
    applyRows([pe.S().today.rows.map(r => Object.assign({}, r))[0]], WD);
    const V2 = pe.planToday(WD);
    ok(pe.S().today.rows.map(r => r.id).join() === id0 && V2.rows[0].done && V2.doneMin === 8, '3. 1줄을 끝내도 같은 줄, 끝낸 줄은 그 자리(한 분 8)');
    ok(V2.moved.map(x => x.id).join() === V1.moved.map(x => x.id).join(), '3. 다시 그려도 다른 날로 옮긴 것 그대로');
    applyRows(V2.rows, WD); at('2026-10-28T22:40:00');
    const V3 = pe.planToday(WD);
    ok(V3.rows.every(r => r.done) && pe.S().today.rows.map(r => r.id).join() === id0 && V3.rows.length === 7, '3. 다 끝내도 새 필수 줄이 생기지 않음(다시 늘지 않음)');
    ok(!V3.active || V3.active.fold, '3. 남은 필수가 없으면 펼칠 줄은 시간이 되면에서만');
    ok(V3.ahead.map(x => x.id).join() === 'hw.write:2026-10-28,hw.eo:2026-10-28' && V3.ahead.every(x => x.roll === '일요일까지'), '3. 오늘 몫을 다 하면 미리 하기 2개(이번 주 남은 필수: 쓰기·목차)'); }

  // 4. 세트 도착: 07:00 세트 전 → 안내 줄, 고정 안 함 / 9시 넘어 고정한 뒤 세트가 오면 합침(먼저 고정한 줄은 그대로)
  { const noThu = clone(FIX); delete noThu.sets[THU];
    scene('2026-10-29T07:00:00', ST, noThu);
    const V = pe.planToday(THU);
    ok(!pe.S().today && V.info.some(x => x.id === 'wait.set' && x.label === '오늘 세트를 기다리는 중'), '4. 07:00 세트 전: "오늘 세트를 기다리는 중", S.today 고정 안 함');
    ok(V.rows.length && V.rows.every(r => r.id.indexOf(THU) < 0 || /^cards:/.test(r.id)), '4. 세트 전에도 이번 주 지난 일(세트 복습·밀린 세트)은 보임');
    at('2026-10-29T09:10:00'); const V9 = pe.planToday(THU), F = pe.S().today, before = F ? F.rows.map(r => r.id) : [];
    ok(F && F.sig === '0||3' && V9.info.some(x => x.label === '오늘 세트가 아직 없어요 · 이번 주 지난 세트부터 해요'), '4. 9시가 넘으면 세트 없이 고정("오늘 세트가 아직 없어요")');
    ok(F.rows.some(r => r.id === 'q.dd:2026-10-26' && r.m === 15 && JSON.stringify(r.q) === '[["2026-10-26",1]]'), '4. 세트 없는 평일 9시 뒤 손글씨 바닥: 이번 주 가장 오래된 단답 1문(10/26)');
    pe.SETS().sets[THU] = clone(FIX.sets[THU]); pe.invalidate(); at('2026-10-29T09:40:00');
    const V2 = pe.planToday(THU), after = pe.S().today.rows.map(r => r.id);
    ok(pe.S().today.sig === '1||4' && before.every(id => after.includes(id)) && before.join() === after.filter(id => before.includes(id)).join(), '4. 세트가 오면 합침: 먼저 고정한 줄은 그대로(순서도)');
    ok(['set.read:2026-10-29', 'set.quiz:2026-10-29', 'hw.dd:2026-10-29', 'hw.sl:2026-10-29'].every(id => after.includes(id)) && after[0] === 'set.read:2026-10-29', '4. 새 세트의 늘 넣는 줄(읽기·퀴즈·단답·자기 전)이 들어옴, 읽기가 맨 위');
    ok(V2.active && V2.active.id === 'set.read:2026-10-29', '4. 펼칠 줄이 "용어 10개 읽기"로');
    ok(V2.rows.some(r => r.id === 'q.dd:2026-10-26' && !r.done && r.left === 15), '4. 세트가 와도 고정한 단답 1문은 남은 일(끝난 것으로 치지 않음)');
    scene('2026-10-29T07:00:00', ST, noThu); pe.planToday(THU, { replan: 'cap', user: 30 });
    ok(pe.S().today && pe.S().today.user === 30 && pe.S().today.rows.reduce((a, r) => a + r.m, 0) <= 30, '4. 세트 전에 "오늘 시간 30분"을 고르면 바로 고정(고른 시간 그대로)');
    scene('2026-10-29T08:00:00', ST, noThu); pe.planToday(THU); pe.SETS().sets[THU] = clone(FIX.sets[THU]); pe.invalidate(); at('2026-10-29T08:20:00');
    pe.planToday(THU); ok(pe.S().today && pe.S().today.rows.length === 16 && pe.S().today.at === '08:20', '4. 9시 전에 세트가 오면 그때 처음 고정(16줄, 목 07:40과 같은 몫)'); }

  // 5. 토 08:00
  scene('2026-10-31T08:00:00', ST);
  { const P = pe.dayPlan(SAT), B = pe.weekBoard(SAT), I = ids(P);
    ok(I.slice(0, 3).join() === 'mock:2026-10-31:p1,mock:2026-10-31:p2,mock.g:2026-10-31', '5. 토 08:00: 1~3줄은 모의고사(1교시 · 2교시 · 채점)');
    const qd = P.rows.find(r => r.id === 'q.dd:2026-10-26'), qe = P.rows.find(r => r.id === 'q.eo:2026-10-26');
    ok(qd && JSON.stringify(qd.q) === '[["2026-10-26",1],["2026-10-27",1],["2026-10-28",1]]' && qd.m === 45, '5. 단답 몫은 세트째로 3문(10/26·10/27·10/28) = 남은 5문의 반 이하');
    ok(qe && JSON.stringify(qe.q) === '[["2026-10-27",2]]' && qe.m === 10, '5. 목차 몫은 들어가는 세트째로(10/27 2번)');
    ok(mins(P) === 297 && mins(P) <= 300 && P.rows.length === 12, `5. 오늘 몫 ${mins(P)}분(≤300, 기록 297), 12개 할 일`);
    ok(P.lv === 1 && B.B === 463 && B.C === 540, `5. 단계 1(B ${B.B} / C ${B.C}, 기록 463 / 540)`);
    ok(!P.rows.some(r => r.task.floorQ) && P.rows.some(r => r.task.paper), '5. 손글씨 바닥은 모의 답안으로 채움(단답 몫을 따로 당기지 않음)');
    ok(P.moved.map(x => `${x.label}·${x.min}·${x.dest}`).join(' | ') === '단답 손글씨 2문·30·내일(일) 손글씨 몫 | 논술 목차 옮겨 적기 6번·30·내일(일) 손글씨 몫 | 새 용어 안 보고 쓰기 16개·48·내일(일) 손글씨 몫 | ' + ['10/19(월)', '10/20(화)', '10/21(수)', '10/22(목)', '10/23(금)'].map(x => `세트 복습 ${x} 7일 차·8·내일 다시 나와요`).join(' | ') + ' | 카드 복습 48장·24·내일 다시 나와요',
      '5. 다른 날로 옮긴 것 9개 · 172분: 손글씨 몫 3개 → 내일(일) 손글씨 몫, 이번 주에 기한이 온 7일 차 세트 복습 5개(필수)·카드 복습 → 내일 다시 나와요');
    ok(!P.fold.length, '5. 시간이 되면 없음(7일 차 세트 복습은 이번 주 필수라 시간이 되면이 아니라 다른 날로 옮긴 것에)');
    ok(B.pct === 18 && B.reach === 94 && JSON.stringify(B.parts) === '[["core",13.8,25],["mock",0,25],["hand",3.6,30],["rev",1.1,15],["close",0,5]]', `5. 지금 ${B.pct}% → 다 하면 ${B.reach}% (기록 18 → 94)`); }

  // 6. 일 09:00, 토요일 몫을 다 한 뒤
  scene('2026-10-31T08:00:00', ST); applyRows(pe.dayPlan(SAT).rows, SAT); const SATDONE = clone(pe.S());
  scene('2026-11-01T09:00:00', SATDONE);
  { const P = pe.dayPlan(SUN), B = pe.weekBoard(SUN), I = ids(P);
    ok(P.lv === 0 && B.B === 166 && B.C === 240, `6. 일요일: 단계 0(B ${B.B} / C ${B.C}, 기록 166 / 240)`);
    ok(I.includes('report:2026-10-26') && ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].every(x => I.includes('rev:' + x + ':7')), '6. 주간 리포트와 7일 차 세트 복습 5개가 오늘 몫');
    ok(mins(P) === 166 && I.length === 10 && I[0] === 'rev:2026-10-29:1', `6. 오늘 몫 ${mins(P)}분(기록 166): 밀린 핵심 10/29 1일 차 → 손글씨 몫 → 복습 비우기 → 주간 마감`);
    ok(B.pct === 69 && B.reach === 93, `6. 지금 ${B.pct}% → 다 하면 ${B.reach}% (기록 69 → 93)`);
    applyRows(P.rows, SUN); at('2026-11-01T22:00:00');
    const B2 = pe.weekBoard(SUN);
    ok(B2.pct === 93 && JSON.stringify(B2.parts) === '[["core",25,25],["mock",25,25],["hand",30,30],["rev",10.2,15],["close",3,5]]', `6. 밤 점수 ${B2.pct}% = 핵심 25 · 모의 25 · 손글씨 30 · 복습 10.2 · 마감 3 (기록 9.6 → 10.2: 10/23 3일 차는 10/26에 처음 끝낸 날로 제때, 일요일 7일 차가 rev를 덮어도 그대로)`); }

  // 7. 일 09:00, 토요일을 건너뛴 채
  scene('2026-11-01T09:00:00', ST);
  { const P = pe.dayPlan(SUN), B = pe.weekBoard(SUN), I = ids(P);
    ok(P.lv === 3 && B.B === 455 && B.C === 240, `7. 토요일 건너뜀: 단계 3 핵심만(B ${B.B} / C ${B.C}, 기록 455 / 240)`);
    ok(['q.dd:2026-10-26', 'q.eo:2026-10-26', 'q.w:2026-10-26'].every(x => P.freed.some(f => f.id === x)) && P.freed.length === 3, '7. 놓아준 것 3개: 손글씨 몫 3개(세트 복습은 단계 3에서도 놓아주지 않음)');
    ok(['mock:2026-10-31:p1', 'mock:2026-10-31:p2', 'mock.g:2026-10-31', 'late:2026-10-28', 'late:2026-10-29', 'late:2026-10-30', 'report:2026-10-26'].every(x => I.includes(x)) && mins(P) === 236, `7. 모의·채점·밀린 핵심·리포트는 남음, ${mins(P)}분(기록 236)`);
    ok(P.rows.some(r => r.task.paper), '7. 손글씨 1단위 이상(모의 답안)');
    ok(P.moved.map(x => x.id + '→' + x.dest).join() === ['rev:2026-10-30:1', 'rev:2026-10-28:3', 'rev:2026-10-19:7', 'rev:2026-10-20:7', 'rev:2026-10-21:7', 'rev:2026-10-22:7', 'rev:2026-10-23:7'].map(x => x + '→내일 다시 나와요').join(), '7. 못 넣은 세트 복습 7개(1·3일 차 2개, 이번 주 7일 차 5개) → 내일 다시 나와요');
    ok(B.pct === 19 && B.reach === 66, `7. 지금 ${B.pct}% → 다 하면 ${B.reach}% (기록 19 → 63 → 66: 7일 차 세트 복습을 놓아준 0이 아니라 늦은 ½로 셈)`);
    // 모의를 다 썼는데도 넘쳐 손글씨 몫을 놓아주는 날: 단답 1문(바닥)은 남는다
    const st = clone(ST); st.mockp['2026-10-31'] = { p1: true, p2: true, g: '2026-10-31' }; st.settings.budget = { sun: 120 };
    scene('2026-11-01T09:00:00', st); const Q = pe.dayPlan(SUN), q = Q.rows.find(r => r.id === 'q.dd:2026-10-26');
    ok(Q.lv === 3 && q && q.task.relFloor && JSON.stringify(q.q) === '[["2026-10-26",1]]' && !Q.freed.some(f => f.id === 'q.dd:2026-10-26') && Q.freed.some(f => f.id === 'q.eo:2026-10-26'), '7. 단계 3이라도 손글씨 바닥 1단위(가장 오래된 단답 1문)는 남김'); }

  // 8. 월 07:00(같은 기록, 세트 도착 전). 그 전 일요일(토요일 건너뜀)에 오늘 몫을 단계 3으로 고정했다
  scene('2026-11-01T09:00:00', ST);
  { const sunLv = (pe.planToday(SUN), pe.S().today.lv); at('2026-11-02T07:00:00');
    const V = pe.planToday(MON), wk = clone(pe.S().wk['2026-10-26']);
    ok(sunLv === 3 && wk && wk.at === MON && wk.p === 21 && wk.lv === 3 && wk.lvx === 3 && wk.cut && wk.parts.core === 13.8 && wk.parts.hand === 6 && wk.carry.join() === 'carry.sets:2026-11-02,carry.mock:2026-10-31' && wk.rel.join() === '단답 손글씨 3문,논술 목차 옮겨 적기 4번,새 용어 안 보고 쓰기 8개',
      `8. 월요일 첫 계산에서 지난주를 한 번 고정(S.wk[10/26]: ${wk && wk.p}% — 일요일 단계 3 고정이 줄인 목표를 걸어 손글씨 3.6 → 6, 단계는 그 주에 고정한 단계 3, 넘어온 것 2, 놓아준 것 3)`);
    pe.S().mockp['2026-10-31'] = { p1: true }; pe.S().sp['2026-10-29'] = { read: { 0: 1 }, quiz: {}, tasks: {}, essay: {}, rev: {}, first: MON };
    pe.planToday(MON); ok(JSON.stringify(pe.S().wk['2026-10-26']) === JSON.stringify(wk), '8. 두 번째 계산·지난 기록을 고쳐도 S.wk[지난주] 그대로');
    scene('2026-11-02T07:00:00', ST); const V2 = pe.planToday(MON), B = pe.weekBoard(MON);
    ok(['dd', 'eo', 'w'].every(k => line(B, k).a === 0) && line(B, 'dd').b === 5 && line(B, 'eo').b === 10 && line(B, 'w').b === 20 && B.pct === 0, '8. 새 주: 손글씨 몫은 0부터(빚 없음), 지금 0%');
    ok(V2.fold.some(x => x.id === 'carry.mock:2026-10-31' && x.min === 150) && !V2.rows.some(r => /carry/.test(r.id)), '8. 지난주 모의고사는 시간이 되면 줄로만(150분)');
    ok(V2.fold.some(x => x.id === 'carry.sets:2026-11-02' && x.ds.join() === '2026-10-30,2026-10-29,2026-10-28'), '8. 지난주 세트 읽기·퀴즈 3개(10/30·10/29·10/28)는 권장');
    const rv2 = V2.rows.filter(r => /^rev:/.test(r.id));
    ok(V2.rows.slice(0, 2).map(r => r.id).join() === 'rev:2026-10-27:3,rev:2026-10-28:3' && rv2.length === 9 && V2.rows.length === 9 && rv2.slice(2, 5).map(r => r.id).join() === 'rev:2026-10-30:3,rev:2026-10-26:7,rev:2026-10-19:14' && rv2.slice(2, 5).every(r => r.task.need === '필수') && rv2.slice(5).every(r => r.task.need === '권장' && r.task.step === 7) && mins(V2) === 72 && V2.info.some(x => x.id === 'wait.set'),
      '8. 세트 전 월요일 07:00: 오늘 몫 72분 = 세트 복습 9개(1·3일 차 앞 2개 → 나머지 1·3일 차 → 이번 주 7·14일 차 → 지난주에 기한이 지난 7일 차 4개는 권장), 간격 온 카드는 모두 그 세트 복습 안이라 카드 복습 줄 없음, 세트를 기다리는 중');
    ok(V2.active && V2.active.id === 'rev:2026-10-27:3', '8. 펼칠 줄은 세트 복습(모의가 아님)');
    at('2026-11-02T09:30:00'); pe.planToday(MON); applyRows(pe.S().today.rows.map(r => Object.assign({}, r, { task: pe.taskList(MON).find(x => x.id === r.id) })), MON); pe.invalidate();
    const V3 = pe.planToday(MON);
    ok(V3.rows.every(r => r.done) && V3.active && V3.active.fold && /^(rev|cards|wrong|carry\.sets)$/.test(V3.active.task.k) && !/carry\.mock/.test(V3.active.id), `8. 오늘 몫을 다 하면 시간이 되면의 휴대폰 일(${V3.active && V3.active.id})이 펼쳐짐(지난주 모의고사는 어느 날에도 아님)`);
    ok(B.B === 562 && B.C === 1440 && B.lv === 0 && B.reach === 98, `8. 새 주 B ${B.B} / C ${B.C} → 단계 0, 다 하면 ${B.reach}% (기록 98%; B는 아직 안 온 세트의 1·3일 차를 미리 세어 522+40)`); }

  // 9. 읽기만: 오늘·계산 함수가 S.sp 키나 first를 만들지 않음
  scene('2026-10-29T07:40:00', ST);
  { const sp0 = JSON.stringify(pe.S().sp), keep = () => { const S = clone(pe.S()); delete S.today; delete S.wk; delete S.cal; return JSON.stringify(S); }, s0 = keep();
    await go('#review'); await go('#today'); pe.render(); await go('#week');
    pe.taskList(THU); pe.weekBoard(THU); pe.dayPlan(THU); pe.dayPlan(THU, { user: 30 }); pe.cardsOut(THU); pe.reqParts(THU); pe.hwParts(THU); pe.weekBoard(SAT); pe.taskList(SAT);
    pe.wkAhead(THU); pe.wkAhead(THU, { days: { [SAT]: 0 } }); pe.offDelta(THU, THU); pe.catchLine(THU);
    pe.slipCheck(THU); pe.roundRows(THU); pe.schFrom(pe.PLAN(), pe.computePlan('2026-10-19', 143), THU); pe.repoPlanState(THU); pe.schReq(); pe.weekP('2026-10-19');
    ok(keep() === s0, '9. taskList·dayPlan·weekBoard·cardsOut·reqParts·앞날 셈(wkAhead·offDelta·catchLine)·시험 일정 살펴보기(slipCheck·roundRows·schFrom·repoPlanState·schReq·weekP)는 기록을 바꾸지 않음');
    pe.planToday(THU); pe.planToday(THU);
    ok(JSON.stringify(pe.S().sp) === sp0 && !pe.S().sp['2026-10-29'], '9. 오늘 화면·이번 주·planToday 뒤에도 S.sp에 새 키·first가 없음(10/29 세트 복습 시계가 돌지 않음)');
    await go('#today'); }

  // 10. 같은 날 두 번 올리지 않음: 오답에서 매긴 카드는 그 세트의 세트 복습에서 빠진다
  scene('2026-10-29T07:40:00', ST);
  { const id = 'D20261027-2'; pe.S().wrong['C:' + id] = { type: 'card', since: '2026-10-27', n: 1, last: '2026-10-27', streak: 0 };
    ok(pe.setReviewItems('2026-10-27').some(x => x.id === id), '10. 오답 풀기 전: 10/27 세트 복습에 그 카드가 있음');
    pe.startWrong(); await sleep(40); click('[data-act="sess-flip"]'); await sleep(10); click('[data-act="sess-grade"][data-g="2"]'); await sleep(30);
    ok(pe.S().cards[id].last === THU && !pe.setReviewItems('2026-10-27').some(x => x.id === id) && !pe.cardsOut(THU).some(c => c.id === id), '10. 오답에서 매긴 카드는 같은 날 세트 복습·카드 복습에서 빠짐');
    click('[data-act="back"]'); await sleep(60); }

  // 11. 읽기 전 퀴즈 없음: 줄인 날마다 세트 퀴즈 줄은 그 세트 읽기와 함께(밀린 세트 줄은 둘을 함께 든다)
  { let bad = 0, n = 0; const days = [['2026-10-28T21:30:00', WED, WD], ['2026-10-29T07:40:00', ST, THU], ['2026-10-31T08:00:00', ST, SAT], ['2026-11-01T09:00:00', ST, SUN]];
    for (const [iso, st, t] of days) { scene(iso, st); for (const u of [null, 30, 60, 90]) { const P = pe.dayPlan(t, { user: u }); n++;
      P.rows.forEach(r => { const x = r.task, c = x && x.d && pe.setStatus(x.d);
        if (x.k === 'set.quiz' && !(ids(P).includes('set.read:' + x.d) || c.read >= c.nc)) bad++;
        if (x.k === 'late' && x.min !== (c.nc - c.read) + (c.nq - c.qa)) bad++; }); } }
    ok(!bad && n === 16, '11. 16가지 줄인 날 어디에도 읽기 없는 퀴즈 줄 없음(밀린 세트 줄은 읽기+퀴즈 분)'); }

  // 12. 점수는 저절로 떨어지지 않음: 빈 주를 날마다 계획대로(세트는 그날 도착), 줄인 목표는 그 주에 다시 오르지 않음
  { const R = runWeek('2026-10-26', FIX, EMPTY), seq = R.flatMap(x => [x.am, x.pm]);
    ok(seq.every((v, i) => !i || v >= seq[i - 1]), '12. 빈 주를 계획대로: 07:00·22:00마다 지금 n%가 줄지 않음 ' + seq.join('→'));
    ok(R.map(x => x.am + '→' + x.pm).join(' ') === '1→13 13→26 26→39 39→53 53→67 67→94 94→98', '12. 흐름 1→13→26→39→53→67→94→98 (기록 …→94: 7일 차 세트 복습을 평일 남은 시간에 제때 하고, 처음 끝낸 날로 세어 복습 15/15)');
    ok(R.map(x => x.plan).join() === '109,108,103,111,111,196,18' && R.map(x => x.reach).join() === '98,98,98,98,98,98,98' && R.every(x => x.done && x.lv === 0), '12. 날마다 계획 103~111분(7일 차 세트 복습·카드 복습 포함), 토요일 196, 다 하면 98%가 끝까지 그대로(계획대로 하면 내려가지 않음)');
    // 단계 2로 고정한 주: 목표를 줄이고(× 0.6) 일을 끝내도 그 주에는 다시 오르지 않음
    const st = clone(ST); st.settings.budget = { sat: 200 };
    scene('2026-10-31T08:00:00', st); const V = pe.planToday(SAT), x = pe.S().wk['2026-10-26'];
    ok(V.lv === 2 && x && x.cut === true && x.cph === 1, '12. 토요일을 단계 2로 고정하면 S.wk[주].cut(줄인 목표) = true, cph = 1단계');
    const B1 = pe.weekBoard(SAT);
    ok(line(B1, 'dd').b === 3 && line(B1, 'eo').b === 6 && line(B1, 'w').b === 12 && line(B1, 'dd').cut && V.moved.some(x => x.id === 'q.dd:2026-10-26' && x.label === '단답 손글씨 3문'), '12. 줄인 목표: 단답 5→3 · 목차 10→6 · 쓰기 20→12 (× 0.6 올림), 옮긴 몫도 줄인 목표로');
    applyRows(V.rows, SAT); const DONE = clone(pe.S()); scene('2026-11-01T09:00:00', DONE); const B2 = pe.weekBoard(SUN), P2 = pe.dayPlan(SUN);
    ok(line(B2, 'dd').b === 3 && line(B2, 'eo').b === 6 && line(B2, 'w').b === 12, '12. 다음 날(일)에도 목표는 줄인 그대로');
    applyRows(P2.rows, SUN); at('2026-11-01T22:00:00'); const B3 = pe.weekBoard(SUN);
    ok(B3.lv < 2 && B3.pct >= B2.pct && line(B3, 'dd').b === 3 && line(B3, 'eo').b === 6 && line(B3, 'w').b === 12, `12. 일을 끝내 단계가 ${B3.lv}로 내려가도 목표는 다시 오르지 않음(${B2.pct}% → ${B3.pct}%)`);
    const st2 = clone(ST); st2.settings.budget = { sat: 200 }; scene('2026-10-31T08:00:00', st2); pe.planToday(SAT); pe.S().wk = {};
    pe.planToday(SAT, { replan: 'cap', user: 60 });
    ok(pe.S().today.user === 60 && pe.S().today.lv === 2 && !(pe.S().wk['2026-10-26'] || {}).cut, '12. "오늘 시간"으로 줄인 고정은 줄인 목표를 걸지 않음'); }

  // 13. 특별한 날·다른 단계
  { scene('2026-12-25T08:00:00', ST);
    ok(pe.dayKind('2026-12-25') === 'holi' && pe.budgetOf('2026-12-25') === 240, '13. 12/25 성탄절: holi, 공부 시간 = 일요일·공휴일 240');
    const X = clone(FIX); X.sets['2027-01-27'] = cloneSet('2027-01-27', 14, refsFor(2)); X.sets['2027-01-04'] = cloneSet('2027-01-04', 11, refsFor(2));
    ['2027-02-22', '2027-02-23'].forEach(x => X.sets[x] = cloneSet(x, 18, refsFor(3))); X.sets['2027-04-12'] = cloneSet('2027-04-12', 25, refsFor(4));
    X.mocks['2027-02-27'] = cloneMock('2027-02-27', { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
    scene('2027-01-30T08:00:00', BLANK, X); const E = pe.taskList('2027-01-30');
    ok(pe.dayKind('2027-01-30') === 'exam' && E.filter(x => !x.info).every(x => x.k === 'ex') && E.some(x => x.label === '응시했어요') && pe.budgetOf('2027-01-30') === 0, '13. 2027-01-30: 시험 날(체크리스트와 "응시했어요"만, 공부 시간 0)');
    ok(pe.weekBoard('2027-01-30').chk && pe.weekBoard('2027-01-30').pct === null, '13. 시험이 든 주는 점수 대신 체크');
    scene('2027-01-27T07:00:00', BLANK, X); const T27 = pe.taskList('2027-01-27');
    ok(pe.dayKind('2027-01-27') === 'pre3' && T27.some(x => x.id === 'set.read:2027-01-27') && T27.some(x => x.id === 'set.quiz:2027-01-27') && !T27.some(x => /^hw\.|^essay:/.test(x.id)) && pe.reqParts('2027-01-27').length === 0, '13. 2027-01-27 시험 전 3일: 읽기·퀴즈만, 숙제 줄 없음');
    ok(T27.some(x => x.id === 'x.rot:2027-01-27' && x.label === '카드 30장 돌리기' && x.need === '필수') && T27.some(x => x.id === 'x.outline:2027-01-27' && x.label === '논술 목차 떠올리기 5문') && !T27.some(x => /^kit:/.test(x.id)), '13. 시험 전 3일: 카드 30장·목차 5문 필수, 준비물 점검은 금요일만');
    scene('2027-01-29T07:00:00', BLANK, X); ok(pe.taskList('2027-01-29').some(x => x.id === 'kit:2027-01-29' && x.need === '필수'), '13. 시험 전 금요일: 준비물 점검');
    const reh = '2027-01-23'; ok(pe.weekObj(pe.weekIndex(reh)).pre && pe.budgetOf(reh) >= 430 && pe.budgetOf(reh, 'sat') === 430, '13. 전교시 리허설 토요일(13주차) 공부 시간 ≥ 430');
    // 2단계(11주차) 세트
    scene('2027-01-04T07:00:00', BLANK, X); const T2 = pe.taskList('2027-01-04'), B2 = pe.weekBoard('2027-01-04');
    ok(T2.some(x => x.id === 'essay:2027-01-04' && x.need === '필수' && !x.fold) && T2.some(x => x.id === 'x.outline:2027-01-04' && x.need === '필수' && x.label === '논술 목차 떠올리기 5문'), '13. 2단계 세트: 논술 실전 25분·목차 떠올리기 5문 필수');
    ok(line(B2, 'essay') && line(B2, 'essay').n === 8 && line(B2, 'essay').label === '논술 실전 25분' && pe.reqParts('2027-01-04').some(p => p.t === '논술 실전'), '13. 2단계: 약속 8줄(논술 실전 25분), 숙제 필수에 논술 실전');
    ok(pe.dayPlan('2027-01-04').rows.some(r => r.id === 'essay:2027-01-04'), '13. 2단계: 논술 줄이 오늘 몫에');
    { const s = pe.SETS().sets['2027-01-04'], p = { read: {}, quiz: {}, tasks: {}, essay: {}, rev: {}, first: '2027-01-04', hw: {} }; s.cards.forEach((_, i) => p.read[i] = 1); s.quiz.forEach((q, i) => p.quiz[i] = { pick: q.a, ok: true }); pe.S().sp['2027-01-04'] = p;
      const c0 = pe.setStatus('2027-01-04').core; p.essay = { done: true }; ok(c0 === false && pe.setStatus('2027-01-04').core === true, '13. 2단계: 핵심 = 읽기 + 퀴즈 + 논술 실전(논술 전엔 핵심 ✓ 아님)'); }
    // 3단계(18주차) 세트: 다시 쓰기·그림 필수, 3·4교시는 일요일, 논술은 접힌 줄
    scene('2027-02-22T07:00:00', BLANK, X); const T3 = pe.taskList('2027-02-22'), B3 = pe.weekBoard('2027-02-22');
    ok(T3.some(x => x.id === 'x.redo:2027-02-22' && x.need === '필수') && T3.some(x => x.id === 'hw.fg:2027-02-22' && x.need === '필수' && x.hw.f === 1), '13. 3단계 세트: 모의 오답 다시 쓰기·그림·표 1번 필수');
    { const dk = pe.deck(), u1 = dk.find(c => c.src === 'base').u, a = dk.filter(c => c.u === u1).slice(0, 2), b = dk.filter(c => c.u !== u1 && c.src === 'base').slice(0, 2), S = pe.S();
      a.forEach(c => S.cards[c.id] = { box: 2, due: '2027-02-21', seen: 3, ok: 1, ng: 2, star: false, last: '2027-02-18' });
      b.forEach(c => S.cards[c.id] = { box: 2, due: '2027-02-20', seen: 3, ok: 3, ng: 0, star: false, last: '2027-02-17' });
      const c = pe.taskList('2027-02-22').find(x => x.k === 'cards'); pe.startDueAll({ weak: true }); await sleep(30);
      ok(c && c.sub === '약점 단원 먼저' && c.weak && c.kc === 4 && pe.SES().items.slice(0, 2).every(it => a.some(x => x.id === it.id)), '13. 3단계 카드 복습은 "약점 단원 먼저"(정답률 낮은 단원 카드가 앞)');
      pe.goTab('today'); await sleep(40); }
    ok(pe.planToday('2027-02-22').notes.bed === undefined && (scene('2027-04-18T09:00:00', BLANK, X), pe.planToday('2027-04-18').notes.day === '반나절은 쉬어요' && pe.planToday('2027-04-18').notes.bed === '수면 7시간'), '13. 4단계 일요일 머리 줄 "반나절은 쉬어요", 자기 전 "수면 7시간"(3단계엔 없음)');
    scene('2027-02-22T07:00:00', BLANK, X);
    ok(!pe.reqParts('2027-02-22').some(p => p.t === '논술 실전') && !line(B3, 'essay') && T3.some(x => x.id === 'essay:2027-02-22' && x.fold && x.need === '권장') && pe.reqParts('2027-02-22').some(p => p.t === '그림·표'), '13. 3단계: 숙제 필수에 논술 없음(그림·표는 있음), 8줄 없음, 논술은 시간이 되면');
    ok(B3.lines.map(l => l.k).join() === 'mock,core,redo,dd,fg,rev,close', '13. 3단계 약속 줄: 모의·핵심·다시 쓰기·단답·그림·복습·리포트');
    scene('2027-02-27T08:00:00', BLANK, X); const S3 = ids(pe.dayPlan('2027-02-27'));
    ok(S3.includes('mock:2027-02-27:p1') && S3.includes('mock:2027-02-27:p2') && !S3.some(x => /:p[34]$/.test(x)) && !S3.includes('mock.g:2027-02-27'), '13. 3단계 토요일: 1·2교시만(3·4교시와 채점은 일요일)');
    scene('2027-02-28T08:00:00', BLANK, X); const U3 = pe.dayPlan('2027-02-28');
    ok(['p3', 'p4'].every(k => U3.rows.some(r => r.id === 'mock:2027-02-27:' + k && r.blk === k)) && U3.rows.some(r => r.id === 'mock.g:2027-02-27' && r.blk === 'p4'), '13. 3단계 일요일: 3교시·4교시 블록, 채점은 4교시 뒤');
    scene('2027-04-12T07:00:00', BLANK, X); const T4 = pe.taskList('2027-04-12');
    ok(!T4.some(x => /^essay:/.test(x.id)) && T4.some(x => x.id === 'x.rot:2027-04-12' && x.label === '카드 50장 돌리기') && T4.some(x => x.id === 'x.outline:2027-04-12' && x.label === '기출 목차 외우기 5문'), '13. 4단계 세트: 논술 줄 없음, 카드 50장·기출 목차 5문 필수'); }

  // 14. 하루 공부 시간
  { const st = clone(ST); st.settings.budget = { wd: 150 }; scene('2026-10-29T07:40:00', st);
    ok(pe.budgetOf('2026-10-29') === 150 && pe.budgetOf('2026-10-31') === 300 && pe.budgetOf('2026-11-01') === 240, '14. budget {wd:150}: 평일 150, 토 300, 일 240(나머지는 기본값)');
    pe.S().settings.budget = { wd: 'x' }; ok(pe.budgetOf('2026-10-29') === 180, '14. 숫자가 아니면 기본값 180');
    scene('2027-01-25T07:00:00', BLANK); const B = pe.weekBoard('2027-01-25');
    ok(B.C === 1140 && isFinite(B.C), `14. 2027-01-25(월): C = 180+180+3×180+0+240 = ${B.C}`);
    at('2027-01-27T07:00:00'); const B2 = pe.weekBoard('2027-01-27');
    ok(B2.C === 780 && B2.lines.map(l => l.k).sort().join() === 'close,core,rev' && B2.B === B2.lines.reduce((a, l) => a + l.B, 0) && B2.lv === (B2.B / B2.C <= .8 ? 0 : 1), `14. 2027-01-27(시험 전 3일): C = ${B2.C}, 단계는 1·6·7줄의 B ${B2.B}분으로`); }

  // 15. 분은 MIN_PER 하나에서
  scene('2026-10-31T08:00:00', ST);
  { const B = pe.weekBoard(SAT); ok(B.B === 463 && B.C === 540, '15. 토요일 B/C = 463/540(기록)');
    const M = pe.MIN_PER, d0 = M.dd, r0 = M.revItem; M.dd = 20; M.revItem = 1;
    const B2 = pe.weekBoard(SAT); M.dd = d0; M.revItem = r0;
    ok(B2.B === 463 + 5 * 5 + 10 * 7, `15. MIN_PER만 바꾸면 B가 그만큼 바뀜(단답 15→20분, 세트 복습 항목 0.5→1분: ${B2.B})`);
    ok(pe.weekBoard(SAT).B === 463, '15. 되돌리면 그대로'); }

  // 16. 시작일 2026-11-02
  { const st = clone(BLANK); st.settings.start = '2026-11-02'; scene('2026-11-20T07:00:00', st);
    ok(pe.estMock(11) === 430 && pe.estMock(12) === 0 && pe.estMock(13) === 130, '16. 시작 11/02: 모의 어림 11주 430(리허설) · 12주 0(1/30 시험) · 13주 130(틀 12) = tool.py mock_format');
    const ps = []; for (let i = 0; i <= pe.PLAN().E; i++) if (pe.phaseStart(add('2026-11-02', 7 * i))) ps.push(i);
    ok(ps.join() === '1,11,16,23,27', '16. 단계 시작 안내 주: ' + ps.join(','));
    const note = t => { at(t + 'T07:00:00'); return pe.taskList(t).some(x => x.id === 'notice:2027' && x.label === '큐넷 2027 시행계획 공고 확인' && x.onlyWeek); };
    ok(note('2026-11-20') && note('2026-12-31') && !note('2026-11-19') && !note('2027-01-01'), '16. 공고 확인 줄은 2026-11-20~12-31(시작 11/02)');
    scene('2026-11-20T07:00:00', BLANK); const ps2 = []; for (let i = 0; i <= pe.PLAN().E; i++) if (pe.phaseStart(add('2026-10-19', 7 * i))) ps2.push(i);
    ok(note('2026-11-20') && note('2026-12-31') && !note('2026-11-19') && ps2.join() === '1,11,18,25,29', '16. 시작 10/19도 같은 날짜 창, 단계 시작 주 1,11,18,25,29'); }

  // 17. 고정 뒤 하나만 더하는 줄: 세트 퀴즈를 다 풀고 틀린 2문 → "틀린 이유" 줄
  scene('2026-10-29T07:40:00', ST);
  { pe.planToday(THU); const n0 = pe.S().today.rows.length, ids0 = pe.S().today.rows.map(r => r.id);
    at('2026-10-29T12:00:00'); await go('#set/2026-10-29'); click('[data-act="set-tab"][data-t="quiz"]'); await sleep(30);
    const qz = pe.SETS().sets[THU].quiz; for (let i = 0; i < qz.length; i++) { const k = i < 2 ? (qz[i].a + 1) % qz[i].o.length : qz[i].a; click(`[data-act="set-quiz"][data-i="${i}"][data-k="${k}"]`); await sleep(15); }
    const V = pe.planToday(THU), R = pe.S().today.rows, i = R.findIndex(r => r.id === 'hw.qz:2026-10-29');
    ok(pe.setStatus(THU).qa === 5 && pe.setStatus(THU).qok === 3, '17. 12:00 세트 퀴즈 5문 중 2문 틀림');
    ok(i > 0 && R[i - 1].id === 'set.quiz:2026-10-29' && R[i].m === 4 && R[i].dep === 'set.quiz:2026-10-29', '17. S.today에 hw.qz:2026-10-29가 세트 퀴즈 바로 뒤(4분, dep)');
    ok(R.length === n0 + 1 && ids0.every(id => R.some(r => r.id === id)), '17. 줄 수가 하나만 늘고 다른 줄은 그대로');
    ok(V.rows.filter(r => !r.done).length === n0 && V.rows.find(r => r.id === 'set.quiz:2026-10-29').done, '17. 세트 퀴즈는 끝, 남은 줄 수는 틀린 이유 한 줄만큼 늘어 그대로 10');
    pe.planToday(THU); ok(pe.S().today.rows.length === n0 + 1, '17. 다시 불러도 한 번만'); await go('#today'); }

  // 18. 단계는 시계·"오늘 시간"과 무관
  scene('2026-10-31T08:00:00', ST);
  { pe.planToday(SAT); const V = pe.planToday(SAT, { replan: 'cap', user: 60 });
    ok(pe.S().today.user === 60 && V.lv === 1 && pe.S().today.lv === 1 && !(pe.S().wk['2026-10-26'] || {}).cut, '18. 토 08:00 오늘 시간 1시간: 단계 1 그대로, 줄인 목표 걸지 않음');
    ok(V.moved.find(x => x.id === 'mock:2026-10-31:p1').dest === '내일(일) 밀린 핵심' && V.moved.find(x => x.id === 'mock.g:2026-10-31').dest === '내일(일) 밀린 핵심', '18. 1교시 단답·채점 → 내일(일) 밀린 핵심');
    ok(ids(V).join() === 'mock:2026-10-31:p2,late:2026-10-28' && mins(V) === 55, `18. 오늘 몫 = 2교시 논술 2문 + 밀린 세트 10/28(수) (${mins(V)}분, 기록 55)`);
    scene('2026-10-28T07:00:00', WED); const a = pe.weekBoard(WD); at('2026-10-28T21:30:00'); const b = pe.weekBoard(WD);
    ok(a.lv === b.lv && a.C === 1080 && b.C === 1080 && a.B === 483, `18. 수요일 심사 상태: 07:00과 21:30 단계 같음(C ${a.C}·${b.C}, 기록 1080)`); }

  // 19. 단계별 약속 줄·배점·빈 주
  { const order = l => l.map(x => x.k).join();
    const mkWeek = (W, wk, mock, ph) => { const X = { sets: {}, mocks: {} }; for (let i = 0; i < 5; i++) X.sets[add(W, i)] = cloneSet(add(W, i), wk, refsFor(ph)); X.mocks[add(W, 5)] = cloneMock(add(W, 5), mock); return X; };
    const cases = [[2, '2027-01-04', 11, { p2: P6(2) }, 'mock,core,essay,dd,eo,w,rev,close'], [3, '2027-02-22', 18, { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) }, 'mock,core,redo,dd,fg,rev,close'], [4, '2027-04-12', 25, { p2: P6(2) }, 'mock,core,redo,dd,rot,rev,close']];
    for (const [ph, W, wk, mock, want] of cases) {
      const X = mkWeek(W, wk, mock, ph); scene(W + 'T07:00:00', BLANK, X); const B = pe.weekBoard(W), sc = w.PE_SCORE[ph];
      ok(pe.phaseObj(wk).id === ph && order(B.lines) === want, `19. ${ph}단계 약속 줄: ${order(B.lines)}`);
      ok(sc.core + sc.mock + sc.hand + (sc.rot || 0) + sc.rev + sc.close === 100 && Object.values(sc.hw).reduce((a, v) => a + v, 0) === sc.hand, `19. ${ph}단계 배점 합 100(손글씨 ${sc.hand} = 안의 배분 합)`);
      const R = runWeek(W, X, BLANK), seq = R.flatMap(x => [x.am, x.pm]);
      ok(seq.every((v, i) => !i || v >= seq[i - 1]) && seq[seq.length - 1] >= 80, `19. ${ph}단계 빈 주를 계획대로: 지금 n%가 줄지 않음 ${seq.join('→')}`);
      ok(R.every(x => x.lv <= 1 && x.done), `19. ${ph}단계 계획대로 한 주는 주말에도 단계 1 이하(일요일 3·4교시·채점과 세트 복습은 단계에 넣지 않음), 날마다 다 함: 단계 ${R.map(x => x.lv).join('')}`); }
    ok(w.PE_SCORE[1].core + w.PE_SCORE[1].mock + w.PE_SCORE[1].hand + w.PE_SCORE[1].rev + w.PE_SCORE[1].close === 100, '19. 1단계 배점 합 100'); }

  // 20. 다시 짜기: 끝낸 줄은 그 자리, 오늘 한 분 이어 셈, 다시 짜기는 오늘 시간 유지·나중에 비움, 시험 일정 바꾸면 다시 고름·줄인 목표 풂, 복원은 새로
  scene('2026-10-29T07:40:00', ST);
  { pe.planToday(THU); const R0 = pe.S().today.rows.map(r => Object.assign({}, r));
    applyRows([R0[0], R0[1]], THU); at('2026-10-29T08:30:00'); const V0 = pe.planToday(THU);
    ok(V0.doneMin === 18 && V0.rows[0].done && V0.rows[1].done, '20. 두 줄을 끝냄(한 분 18)');
    const V1 = pe.planToday(THU, { replan: 'cap', user: 60 }), R1 = pe.S().today.rows;
    ok(R1[0].id === R0[0].id && R1[0].m === R0[0].m && R1[1].id === R0[1].id && R1[1].m === R0[1].m && V1.doneMin === 18 && pe.S().today.user === 60, '20. 오늘 시간 1시간: 끝낸 두 줄은 순서·분 그대로, 한 분 18 그대로');
    ok(V1.rows.filter(r => !r.done).reduce((a, r) => a + r.m, 0) <= 60, '20. 남은 줄은 1시간 안에서 다시 고름');
    pe.UI().later = { 'hw.sl:2026-10-29': 1 }; pe.planToday(THU, { replan: 'reset' });
    ok(pe.S().today.user === 60 && !Object.keys(pe.UI().later).length && pe.S().today.rows[0].id === R0[0].id, '20. 오늘 몫 다시 짜기: 오늘 시간 그대로, 나중에 비움, 끝낸 줄 그대로');
    // 시험 일정: 단계 2로 고정(줄인 목표) → 시작일을 바꿔 이번 주가 준비 주가 되면 줄인 목표를 풀고, 남은 줄은 새 후보에서만
    const st = clone(ST); st.settings.budget = { sat: 200 }; scene('2026-10-31T08:00:00', st); const dm0 = pe.planToday(SAT).doneMin;
    ok(pe.S().wk['2026-10-26'].cut && pe.S().wk['2026-10-26'].cph === 1, '20. (준비) 토요일 단계 2 고정, 줄인 목표 1단계에 걸림');
    pe.S().settings.budget = {}; await go('#schedule'); const inp = d.querySelector('#schStart'); inp.value = '2026-10-26'; inp.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(30);
    click('[data-act="sch-save"]'); await sleep(30);
    const T = pe.taskList(SAT), F = pe.S().today, V = pe.planToday(SAT);
    ok(pe.S().settings.start === '2026-10-26' && pe.weekIndex(SAT) === 0 && !pe.S().wk['2026-10-26'].cut, '20. 시험 일정 저장: 이번 주가 준비 주(0단계)가 되어 줄인 목표를 풂');
    ok(V.rows.filter(r => !r.done).every(r => T.some(x => x.id === r.id)) && F.rows.length === V.rows.length && line(pe.weekBoard(SAT), 'dd').b === 5 && V.lv === 1, '20. 다시 고른 줄은 모두 새 후보(옛 id 없음), 단계 1, 단답 목표는 줄이지 않은 5문');
    ok(F.rows.every(r => T.some(x => x.id === r.id) || V.rows.find(v => v.id === r.id).done) && V.doneMin === dm0, `20. 고정한 줄은 모두 새 후보이거나 끝난 줄, 오늘 한 분 ${V.doneMin} 그대로`);
    await go('#today');
    // 복원은 S.today를 비운다
    scene('2026-10-29T07:40:00', ST); pe.planToday(THU); const bk = JSON.stringify({ state: pe.S(), sets: pe.SETS() });
    await go('#backup'); d.querySelector('#restoreText').value = bk; click('[data-act="restore"]'); const rT = pe.S().today; await sleep(60);
    ok(rT === null && pe.S().wk && pe.S().tk, '20. 복원하면 S.today = null(다른 날·기기의 고정 목록을 쓰지 않음)');
    ok(pe.S().today && pe.S().today.d === THU && pe.S().today.at === '07:40' && w.location.hash === '#today', '20. 복원 뒤 오늘 화면이 오늘 몫을 새로 짬'); }

  // 21. 시험 일정을 바꿔 할 일 목록에서 사라진 줄(시험 전 3일의 "카드 30장 돌리기"): 안 한 것은 빼고(오늘 한 분 그대로), 바꾸기 전에 끝낸 것만 그 자리에
  { const X = clone(FIX), T0 = '2027-01-27'; X.sets[T0] = cloneSet(T0, 14, refsFor(2));
    for (const rot of [false, true]) {
      scene(T0 + 'T07:00:00', BLANK, X); pe.planToday(T0); const R0 = pe.S().today.rows.map(r => Object.assign({}, r));
      ok(pe.dayKind(T0) === 'pre3' && R0.map(r => r.id).join() === 'set.read:2027-01-27,x.rot:2027-01-27,set.quiz:2027-01-27,x.outline:2027-01-27', '21. (준비) 시험 전 3일 1/27 고정: 읽기·카드 30장·퀴즈·목차 5문');
      applyRows(rot ? [R0[0], R0[1]] : [R0[0]], T0); at(T0 + 'T08:00:00'); const dm0 = pe.planToday(T0).doneMin;
      await go('#schedule'); d.querySelector('#schRound').value = String(pe.PLAN().mock.r); d.querySelector('#schRoundDate').value = '2027-02-06'; click('[data-act="sch-round-set"]'); await sleep(30);
      const T = pe.taskList(T0), V = pe.planToday(T0), F = pe.S().today, rid = F.rows.map(r => r.id), xr = V.rows.find(r => r.id === 'x.rot:2027-01-27');
      ok(pe.PLAN().mock.d === '2027-02-06' && pe.dayKind(T0) === 'wd' && !T.some(x => x.id === 'x.rot:2027-01-27'), '21. 제141회를 2/6으로 옮기면 1/27은 보통 평일(카드 30장 돌리기는 할 일이 아님)');
      ok(V.doneMin === dm0 && dm0 === (rot ? 25 : 10) && rid[0] === 'set.read:2027-01-27' && V.rows[0].done, `21. ${rot ? '카드 30장을 끝낸 뒤' : '카드 30장 전'}: 오늘 한 분 ${V.doneMin} 그대로(기록 ${dm0}), 끝낸 읽기는 그 자리`);
      ok(F.rows.every(r => T.some(x => x.id === r.id) || V.rows.find(v => v.id === r.id).done) && new Set(rid).size === rid.length, '21. 고정한 줄은 모두 새 후보이거나 바꾸기 전에 끝난 줄(id 겹침 없음)');
      ok(rot ? xr && xr.done && xr.left === 0 : !xr, rot ? '21. 바꾸기 전에 끝낸 카드 30장 돌리기는 끝낸 줄로 남음' : '21. 안 한 카드 30장 돌리기는 빠짐(끝난 것으로 세지 않음)');
      await go('#today'); } }

  // 22. 평일 공휴일(12/25)에 세트가 아직 없을 때 10:00: 손글씨 바닥은 공휴일 손글씨 몫 q.dd 하나가 맡음(같은 id·같은 칸을 두 번 만들지 않음)
  const HOL = clone(FIX); ['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24'].forEach(x => HOL.sets[x] = cloneSet(x, 9, refsFor(1)));
  scene('2026-12-25T10:00:00', BLANK, HOL);
  { const T = pe.taskList('2026-12-25'), I = T.map(x => x.id), P = pe.dayPlan('2026-12-25'), q = P.rows.find(r => r.id === 'q.dd:2026-12-21');
    ok(pe.dayKind('2026-12-25') === 'holi' && new Set(I).size === I.length && I.filter(x => /^q\.dd:/.test(x)).length === 1, '22. 공휴일 세트 없이 10:00: 할 일 id 겹침 없음, 단답 몫 줄은 하나');
    pe.planToday('2026-12-25'); const F = pe.S().today.rows.map(r => r.id);
    ok(new Set(ids(P)).size === P.rows.length && new Set(F).size === F.length && q && JSON.stringify(q.q) === '[["2026-12-21",1],["2026-12-22",1]]', `22. 오늘 몫의 단답 몫은 가장 오래된 세트부터 반까지(${q && JSON.stringify(q.q)}), 고정한 줄 id 겹침 없음`); }

  // 23. 날짜 일 핀(원서접수·48시간 복기)은 펼칠 줄도 "다음"도 아님. "다음"은 펼칠 줄과 같은 규칙(나중에 미룬 줄은 뒤로, 자기 전은 다른 줄을 다 한 뒤)
  scene('2026-12-22T07:40:00', BLANK, HOL);
  { const V = pe.planToday('2026-12-22');
    ok(V.rows[0].id === 'apply:141' && V.active && V.active.id === 'set.read:2026-12-22' && V.rows.every(r => { const n = pe.nextAfter(r.id, V); return !n || n.row.blk !== 'pin'; }), '23. 원서접수 핀이 맨 위여도 펼칠 줄은 용어 읽기, 어느 줄의 "다음"도 핀이 아님');
    scene('2027-01-31T09:00:00', BLANK); const V2 = pe.planToday('2027-01-31');
    ok(V2.rows.some(r => r.id === 'recap:141') && V2.active && V2.active.blk !== 'pin', `23. 시험 다음 날 48시간 복기 핀: 펼칠 줄은 목록 쪽(${V2.active && V2.active.id})`);
    scene('2026-10-29T07:40:00', ST); const V3 = pe.planToday(THU), n3 = pe.nextAfter('hw.eo:2026-10-29', V3);
    ok(n3 && n3.row.id === 'set.read:2026-10-29' && n3.before, '23. 목차 다음: 자기 전은 아직(다른 줄이 남음) → 앞에서 넘긴 첫 줄(용어 읽기)');
    pe.UI().later = { 'set.read:2026-10-29': 1 }; const V4 = pe.planToday(THU), n4 = pe.nextAfter('hw.eo:2026-10-29', V4);
    ok(V4.active && V4.active.id === 'rev:2026-10-27:1' && n4 && n4.row.id === 'set.read:2026-10-29' && !n4.before, '23. 나중에 미룬 용어 읽기는 오늘 순서 맨 뒤(펼칠 줄은 세트 복습, 목차 다음은 미룬 용어 읽기)');
    pe.UI().later = {}; applyRows(pe.S().today.rows.filter(r => !/^hw\.(eo|sl):/.test(r.id)), THU); const V5 = pe.planToday(THU), n5 = pe.nextAfter('hw.eo:2026-10-29', V5);
    ok(n5 && n5.row.id === 'hw.sl:2026-10-29' && !n5.before, '23. 다른 줄을 다 하면 목차 다음은 자기 전 5분'); }

  // 24. 한 번 계산하는 비용(명세 위험 7): 숙제 항목은 이번 주 세트마다 한 번(≤7), 간격 온 카드·다시 볼 세트는 한 번. 오늘 몫이 스스로 저장해도 그 기억을 지우지 않음
  scene('2026-10-29T07:40:00', ST); pe.weekSnap(THU);
  { w.__cnt = [0, 0, 0]; pe.planToday(THU); const a = w.__cnt.slice(); w.__cnt = [0, 0, 0]; pe.planToday(THU); pe.weekBoard(THU); const b = w.__cnt.slice();
    ok(pe.S().today && a[0] <= 7 && a[1] === 1 && a[2] === 1, `24. 목요일 고정하는 계산: 숙제 항목 ${a[0]}번(≤7), 간격 온 카드 ${a[1]}번, 다시 볼 세트 ${a[2]}번`);
    ok(b[0] <= 2 * 7 && b[1] <= 2 && b[2] <= 2, `24. 고정한 뒤 오늘 몫 + 이번 주(따로 셈): ${b.join('·')}`);
    scene('2026-11-02T07:00:00', ST); w.__cnt = [0, 0, 0]; pe.planToday(MON); const c = w.__cnt.slice();
    ok(c[0] <= 7 && c[1] === 1 && c[2] === 1, `24. 월요일 첫 계산(지난주 고정 포함): ${c.join('·')}`); }

  // 25. 시작일이 월요일이 아니어도(2026-10-21 수) 주는 그 주 월요일(10/19)부터 센다: 한 달력 주 안에서 주차·단계·약속 줄이 바뀌지 않고, 주차는 10/19(월) 시작과 같다. 시작 전 날은 비어 있음
  { const st = clone(BLANK); st.settings.start = '2026-10-21'; scene('2027-01-04T07:00:00', st);
    const sig = t => { at(t + 'T07:00:00'); const B = pe.weekBoard(t); return B.ph + '|' + B.lines.map(l => l.k).join(',') + '|' + line(B, 'mock').b; }, S7 = [0, 1, 2, 3, 4, 5, 6].map(i => sig(add('2027-01-04', i)));
    const st0 = clone(BLANK); scene('2027-01-04T07:00:00', st0); const s0 = sig('2027-01-04'); scene('2027-01-04T07:00:00', st);
    ok(pe.weekIndex('2027-01-04') === 11 && pe.weekIndex('2027-01-10') === 11 && S7.every(x => x === S7[0]) && S7[0] === s0, `25. 시작 10/21(수): 1/4~1/10 한 주 내내 11주차·같은 단계·같은 약속 줄(${S7[0]}), 10/19(월) 시작과 같음(${s0})`);
    at('2026-10-22T07:00:00'); const a = pe.taskList('2026-10-22'); at('2026-10-20T07:00:00'); const b = pe.taskList('2026-10-20');
    ok(a.some(x => x.id === 'set.read:2026-10-22') && b.length === 0, '25. 첫 달력 주: 시작 뒤(10/22)는 할 일이 있고 시작 전(10/20)은 없음'); }

  // 26. 어느 날 어느 시각에도 할 일 id와 오늘 몫 줄 id는 겹치지 않음(10/19 ~ 시험 날, 07:00·10:00·22:00, 단계마다 세트·모의가 있는 저장소)
  { const X = clone(HOL); X.sets['2027-01-27'] = cloneSet('2027-01-27', 14, refsFor(2)); X.sets['2027-01-04'] = cloneSet('2027-01-04', 11, refsFor(2));
    ['2027-02-22', '2027-02-23'].forEach(x => X.sets[x] = cloneSet(x, 18, refsFor(3))); X.sets['2027-04-12'] = cloneSet('2027-04-12', 25, refsFor(4));
    X.mocks['2027-02-27'] = cloneMock('2027-02-27', { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
    scene('2026-10-19T07:00:00', ST, X); const bad = []; let n = 0;
    for (let t = '2026-10-19'; t <= pe.PLAN().target.d; t = add(t, 1)) for (const hh of ['07', '10', '22']) {
      at(t + 'T' + hh + ':00:00'); const I = pe.taskList(t).map(x => x.id), P = ids(pe.dayPlan(t)); n++;
      if (new Set(I).size !== I.length || new Set(P).size !== P.length) bad.push(t + ' ' + hh + '시'); }
    ok(!bad.length && n > 600, `26. ${n}번(날 × 시각) 모두 id 겹침 없음 ${bad.slice(0, 3).join(' | ')}`);
    // 평일 저녁에 나눠 하기를 켠 주마다(평일 손글씨 몫 q.*와 평일 바닥 q.dd가 같은 id를 두 번 만들지 않음, 밀린 세트 둘)
    scene('2026-10-19T07:00:00', ST, X); const bad2 = []; let n2 = 0, qd = 0;
    for (let t = '2026-10-19'; t <= pe.PLAN().target.d; t = add(t, 1)) { const S = pe.S(), Wk = pe.wkStart(t); (S.wk[Wk] = S.wk[Wk] || {}).cu = Wk;
      for (const hh of ['07', '10', '22']) { at(t + 'T' + hh + ':00:00'); const T0 = pe.taskList(t), I = T0.map(x => x.id), P = ids(pe.dayPlan(t)); n2++;
        if (pe.dayKind(t) === 'wd' && T0.some(x => x.quota && !x.quota.floorOnly)) qd++;
        if (new Set(I).size !== I.length || new Set(P).size !== P.length) bad2.push(t + ' ' + hh + '시'); } }
    ok(!bad2.length && n2 > 600 && qd > 50, `26. 나눠 하기를 켠 주마다 ${n2}번 모두 id 겹침 없음(평일 손글씨 몫이 있는 때 ${qd}번) ${bad2.slice(0, 3).join(' | ')}`); }

  // 화면(시계 고정): 오늘·이번 주를 다시 그린다(같은 주소면 hashchange가 없으므로 render)
  const show = async h => { await go(h); pe.render(); await sleep(10); }, V$ = () => d.querySelector('#view'), prim = () => [...V$().querySelectorAll('.btn:not(.sec):not(.ghost)')];
  const ROLL = /일요일까지|오늘만|다시 나와요|다음 모의 전까지|오늘 밤까지|D-\d|오늘까지/;
  // 27. 목 07:40 오늘 화면: 블록마다 번호 줄 10개(세트 복습 7개는 한 줄, 카드 복습은 그 뒤), 파란 버튼은 펼친 첫 줄(용어 10개 읽기) 하나, 필수 줄마다 "못 하면", 체크리스트 없음, 이번 주 띠·남은 필수
  scene('2026-10-29T07:40:00', ST);
  { await show('#today'); const rows = [...V$().querySelectorAll('.blk + .plan > .prow, .blk + .plan .pmore > .prow')], nums = rows.map(r => (r.querySelector('.pn') || {}).textContent).join(',');
    ok(rows.length === 10 && nums === '1,2,3,4,5,6,7,8,9,10' && /오늘 몫 10개 · 약 2시간 33분/.test(V$().querySelector('.daysum').textContent), `27. 목 07:40: 오늘 몫 10줄(번호 ${nums}), "오늘 몫 10개 · 약 2시간 33분"`);
    const p = prim(); ok(p.length === 1 && p[0].closest('.prow.now') && p[0].closest('.prow.now').dataset.task === 'set.read:2026-10-29' && p[0].textContent === '시작', '27. 파란 버튼은 하나: 펼친 첫 줄 "용어 10개 읽기"의 시작');
    const req = rows.filter(r => !r.querySelector('.tag')), miss = req.filter(r => !ROLL.test((r.querySelector('.pm') || {}).textContent || ''));
    ok(req.length === 9 && !miss.length, `27. 필수 줄마다 못 하면(일요일까지·오늘만·다시 나와요 …) ${miss.map(r => r.dataset.task).join(' ')}`);
    ok(/세트 복습 7개/.test(rows[1].textContent) && /1일 차 2 · 3일 차 1 · 7일 차 4 · 56분 · 다시 나와요/.test(rows[1].textContent) && /0\/7/.test(rows[1].querySelector('.pv').textContent) && !rows[1].querySelector('.tag'), '27. 필수 세트 복습 7개는 한 줄(4개부터는 단계마다 수만: 1일 차 2 · 3일 차 1 · 7일 차 4, 56분, 0/7)');
    ok(rows[2].dataset.task === 'cards:2026-10-29' && /카드 복습 10장/.test(rows[2].textContent) && /권장/.test((rows[2].querySelector('.tag') || {}).textContent || ''), '27. 카드 복습 10장(권장)은 세트 복습 바로 뒤 오늘 몫 줄');
    const ddSub = pe.taskList(THU).find(x => x.id === 'hw.dd:2026-10-29').sub;
    ok(/말하기 4번/.test(rows[4].textContent) && /필수 2번 · 8분 · 오늘만/.test(rows[4].textContent) && /0\/16/.test(rows[4].textContent) && ddSub && rows[7].textContent.indexOf(ddSub) > 0 && /15분/.test(rows[7].querySelector('.pv').textContent), '27. 숙제 줄은 학원 횟수 그대로(말하기 4번 0/16, 필수 2번), 단답은 그 카드 이름 · 15분');
    ok(!V$().querySelector('[data-act="chk"]') && !V$().querySelector('.check') && V$().querySelector('.blk.cur') && /아침·출근길/.test(V$().querySelector('.blk.cur').textContent) && /지금/.test(V$().querySelector('.blk.cur').textContent), '27. 체크리스트 없음, 지금 블록은 아침·출근길');
    const wk = V$().querySelector('.wksec');
    ok(wk && wk.querySelectorAll('.wkd').length === 7 && /남은 필수 약 7시간 48분 \/ 이번 주 공부 시간 15시간/.test(wk.textContent) && !/남은 시간/.test(wk.textContent) && /다 하면 97% · 지금 17%/.test(wk.textContent) && wk.querySelectorAll('.qline').length <= 5 && /세트 핵심 2\/5 · 다음 하나: 10\/28\(수\) 퀴즈/.test(wk.textContent), '27. 이번 주: 띠 7칸, 남은 필수 약 7시간 48분 / 이번 주 공부 시간 15시간(오늘의 "남은 시간"과 다른 낱말), 다 하면 97% · 지금 17%, 줄 5개 이하');
    ok([...wk.querySelectorAll('.wkd .wg')].map(g => g.classList.contains('today') ? 'T' : g.classList[1]).join() === 'done,done,half,T,fut,fut,fut', '27. 띠: 월·화 끝, 수 반쯤, 목 오늘, 금~일 앞날(지난날도 빨강 없음)');
    const fold = [...V$().querySelectorAll('details.pf')].find(x => /시간이 되면/.test(x.textContent));
    ok(fold && !fold.open && /시간이 되면 · \d+개/.test(fold.querySelector('summary').textContent) && !fold.querySelector('[data-task^="cards:"]') && !fold.querySelector('[data-task^="rev:"]'), '27. 시간이 되면은 접혀 있고 세트 복습·카드 복습은 거기 없음(오늘 몫에 다 들어감)');
    click('[data-act="later"]'); await sleep(10);
    ok(prim().length === 1 && prim()[0].closest('.prow.now').dataset.task === 'rev:2026-10-27:1' && /시작 · 10\/27 세트부터/.test(prim()[0].textContent), '27. 나중에 → 다음 줄(세트 복습 7개, "시작 · 10/27 세트부터")이 펼쳐짐');
    pe.UI().later = {}; await show('#today');
    const nt = V$().querySelector('.notice [data-act="wk-dismiss"]');
    ok(nt && nt.dataset.k === 'phase:1' && /1단계 시작/.test(V$().querySelector('.notice').textContent), '27. 단계 첫 주: 한 줄 안내(1단계 시작, × 로 닫음)');
    click('.notice [data-act="wk-dismiss"]'); await sleep(10);
    ok(!V$().querySelector('.notice') && pe.S().tk['phase:1'] === THU, '27. ×를 누르면 안내가 사라지고 S.tk에 남음');
    // 이어서: 오늘 세트를 카드 넘겨 보기로 보다 닫으면, 펼친 줄(용어 10개 읽기)의 버튼이 "이어서 · n번째 용어부터"로 그 세션을 잇는다(위의 이어서 줄은 숨김)
    await show('#set/2026-10-29'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(10); click('[data-act="set-flash"]'); await sleep(40);
    const sF = pe.SES(); click('[data-act="sess-flip"]'); await sleep(5); click('[data-act="sess-skip"]'); await sleep(5); click('[data-act="sess-flip"]'); await sleep(5);
    click('.topbar [data-act="back"]'); await sleep(60); await show('#today');
    ok(!V$().querySelector('.resume') && prim().length === 1 && prim()[0].dataset.act === 'resume' && /이어서 · 2번째 용어부터/.test(prim()[0].textContent), '27. 하다 만 넘겨 보기가 펼친 줄의 일이면 그 줄의 버튼이 "이어서 · 2번째 용어부터"(이어서 줄은 숨김)');
    click('.prow.now .btn'); await sleep(60);
    ok(w.location.hash === '#sess' && pe.SES() === sF && sF.i === 1 && sF.from === 'today', '27. 누르면 같은 세션 그 카드부터(연 곳은 오늘)');
    pe.goTab('today'); await sleep(40); }
  // 28. 토 08:00 오늘 화면: 1~3줄 모의고사(1교시 시작이 파란 버튼), 쉬는 시간 줄, 따라잡기 4줄, 다른 날로 옮긴 것 9개, 시간이 되면 없음
  scene('2026-10-31T08:00:00', ST);
  { await show('#today'); const t = V$().textContent, p = prim();
    ok(/오늘 몫 7개 · 약 4시간 57분/.test(V$().querySelector('.daysum').textContent) && p.length === 1 && p[0].textContent === '1교시 시작' && p[0].closest('.prow.now').dataset.task === 'mock:2026-10-31:p1', '28. 토 08:00: 오늘 몫 7개 · 약 4시간 57분, 파란 버튼은 "1교시 시작" 하나');
    ok(/쉬는 시간 · 답안 사진 찍기/.test(t) && /2교시논술50분/.test(t.replace(/\s+/g, '')) && /쏘일네일링 · 심층혼합처리공법\(DCM\)/.test(t) && /밀린 세트 3개/.test(t) && /세트 복습 4개1일 차 1 · 3일 차 3 · 32분/.test(t), '28. 쉬는 시간 줄, 2교시 논술 50분(문제 이름), 밀린 세트 3개, 세트 복습 4개(4개부터는 단계마다 수: 1일 차 1 · 3일 차 3)');
    ok(/다른 날로 옮긴 것 · 9개 · 약 2시간 52분/.test(t) && /내일\(일\) 손글씨 몫 3개 · 내일 다시 나와요 6개/.test(t) && !/시간이 되면/.test(t), '28. 다른 날로 옮긴 것 9개(갈 곳별 수: 손글씨 몫 3 · 7일 차 세트 복습 5와 카드 복습 1), 시간이 되면 없음');
    ok(/빠듯해요 · 권장은 접어 두었어요/.test(V$().querySelector('.wksec').textContent) && /주간 리포트\(일\) 0\/1/.test(V$().querySelector('.wksec').textContent), '28. 이번 주: 단계 1 문장, 토·일요일엔 주간 리포트 줄');
    await show('#week'); const sc = V$().querySelector('.score');
    const pm = sc && sc.textContent.match(/세트 핵심 (\d+)\/25\u00a0· 모의고사 (\d+)\/25\u00a0· 손글씨 (\d+)\/30\u00a0· 복습 (\d+)\/15\u00a0· 마감 (\d+)\/5/), pv = pm ? pm.slice(1).map(Number) : [];
    ok(sc && /다 하면 94%/.test(sc.textContent) && /지금 18%/.test(sc.textContent) && pm && pv.reduce((a, b) => a + b, 0) === 18 && [14, 0, 4, 1, 0].every((x, i) => Math.abs(pv[i] - x) <= 1) && prim().length === 1 && /^다음: 주간 모의고사 1교시 · 100분$/.test(prim()[0].textContent), '28. 이번 주 화면: 다 하면 94% · 지금 18%, 부분 점수(합 18, 칸 사이 붙는 "·") ' + pv + ', 파란 버튼 "다음: 주간 모의고사 1교시 · 100분"');
    const L = [...V$().querySelectorAll('.qline')].map(q => q.id);
    ok(L.join() === 'ql-mock,ql-core,ql-dd,ql-eo,ql-w,ql-rev,ql-close' && V$().querySelectorAll('.drow').length === 7, '28. 일요일까지 끝낼 것 7줄(모의·핵심·단답·목차·쓰기·세트 복습·리포트), 날마다 7줄'); }
  // 29. 주간 리포트는 그 리포트가 다루는 주로 친다: 일요일 오늘 줄 → report:W, 수요일 통계 → 치지 않고 알림, 월요일 "지난주 리포트" → 지난주 머리·report:LW, 토요일 통계 → report:W
  { let copied = ''; const cp0 = w.PE_IO.copy; w.PE_IO.copy = x => { copied = x; return Promise.resolve(); }; const toastT = () => d.querySelector('#toast').textContent;
    scene('2026-11-01T09:00:00', ST); await show('#today'); click('#view [data-task="report:2026-10-26"]'); await sleep(20);
    ok(pe.S().tk['report:2026-10-26'] === SUN && /\] 2026-10-26 ~ 2026-11-01/.test(copied) && /이번 주 필수 \d+%/.test(copied), '29. 일요일 오늘의 주간 리포트 줄 → 복사하고 이번 주(report:10/26)로 침');
    scene('2026-10-28T12:00:00', ST); await show('#stats'); copied = ''; click('[data-act="report"]'); await sleep(20);
    ok(!pe.S().tk['report:2026-10-26'] && /\] 2026-10-26 ~ 2026-10-28/.test(copied) && /토·일요일에 복사하면 이번 주 리포트로 쳐요/.test(toastT()), '29. 수요일 통계에서 복사하면 치지 않고 "토·일요일에 복사하면 이번 주 리포트로 쳐요"');
    scene('2026-11-02T07:00:00', ST); await show('#today'); copied = ''; click('#view [data-task="report:2026-10-26"]'); await sleep(20);
    ok(pe.S().tk['report:2026-10-26'] === MON && !pe.S().tk['report:2026-11-02'] && /\] 2026-10-26 ~ 2026-11-01/.test(copied) && /지난주 필수 19%/.test(copied), '29. 월요일 "지난주 리포트 아직" → 지난주(10/26~11/1, 고정한 19%) 복사, report:10/26');
    scene('2026-10-31T08:00:00', ST); await show('#stats'); copied = ''; click('[data-act="report"]'); await sleep(20);
    ok(pe.S().tk['report:2026-10-26'] === SAT && /\] 2026-10-26 ~ 2026-10-31/.test(copied), '29. 토요일 통계에서 복사 → 이번 주(report:10/26)로 침');
    w.PE_IO.copy = cp0; await go('#today'); }
  // 30. 모의고사가 오지 않은 토요일(예약 작업 실패): 지난주 모의고사는 권장 접힌 줄, 펼칠 줄이 아니고, 화면의 파란 버튼은 하나(오늘 몫을 다 한 뒤에도)
  { const st = clone(ST); delete st.mockp['2026-10-24']; const X = clone(FIX); delete X.mocks['2026-10-31'];
    scene('2026-10-31T10:00:00', st, X); const V = pe.planToday(SAT), cm = V.fold.find(x => x.k === 'carry.mock');
    ok(cm && cm.need === '권장' && cm.never && V.active && V.active.id !== cm.id && !V.rows.some(r => /^carry\.mock/.test(r.id)) && V.info.some(x => x.id === 'wait.mock'), '30. 모의가 안 온 토요일: 지난주 모의고사는 권장 접힌 줄(펼칠 줄 아님), "주간 모의고사를 기다리는 중"');
    await show('#today'); const cmRow = V$().querySelector('[data-task="carry.mock:2026-10-24"]');
    ok(prim().length === 1 && cmRow && cmRow.closest('details') && !cmRow.classList.contains('now') && /주간 모의고사가 아직 없어요 · 밀린 것부터 해요/.test(V$().textContent), '30. 화면: 파란 버튼 하나, 지난주 모의고사 줄은 시간이 되면 안(10:00이라 "주간 모의고사가 아직 없어요 · 밀린 것부터 해요")');
    applyRows(pe.S().today.rows, SAT); const V2 = pe.planToday(SAT); await show('#today');
    ok(V2.rows.every(r => r.done) && (!V2.active || V2.active.id !== cm.id) && prim().length === 1 && /오늘 몫 끝/.test(V$().textContent), '30. 오늘 몫을 다 해도 지난주 모의고사는 펼치지 않음, "오늘 몫 끝", 파란 버튼 하나'); }
  // 31. 할 몫이 없는 날(받은 세트 없음): 카드 하나에 파란 버튼 하나("지금 받아 오기"). 9시 전 세트를 기다리는 평일은 그 안내가 카드 제목
  { scene('2026-11-03T10:00:00', BLANK, { sets: {}, mocks: {} }); await show('#today');
    ok(V$().querySelector('.norows') && /아직 받은 세트가 없어요/.test(V$().querySelector('.norows').textContent) && prim().length === 1 && prim()[0].dataset.act === 'sync' && !V$().querySelectorAll('.blk').length, '31. 받은 세트가 없으면 할 몫 없음 카드("아직 받은 세트가 없어요" + 지금 받아 오기) 하나');
    const X = { sets: {}, mocks: {} }; X.sets['2026-10-19'] = clone(FIX.sets['2026-10-19']); scene('2026-11-03T07:00:00', BLANK, X); await show('#today');
    ok(V$().querySelector('.norows') && /오늘 세트를 기다리는 중/.test(V$().querySelector('.norows').textContent) && prim().length === 1 && prim()[0].dataset.act === 'sync', '31. 평일 07:00 세트 전·할 일 없음: "오늘 세트를 기다리는 중" 카드에 지금 받아 오기'); await go('#today'); }

  // 32. "핵심만" 문장은 고정한 단계(S.today.lv)를 따른다: 단계 3으로 고정해 줄인 목표가 걸리면 지금 단계는 2로 내려가도
  //     오늘 머리 줄과 놓아준 것, 이번 주 줄 모두 고정한 단계("핵심만 · 다음 주에 새로 시작해요". 일하는 동안 문장이 바뀌지 않음)
  { const st = clone(ST); st.mockp['2026-10-31'] = { p2: true }; scene('2026-11-01T09:00:00', st); await show('#today');
    const B = pe.weekBoard(SUN), dsx = [...V$().querySelectorAll('.dsx')].map(x => x.textContent).join(' | '), fr = [...V$().querySelectorAll('details.pf > summary')].find(x => /놓아준 것/.test(x.textContent));
    const ws = V$().querySelector('.wksec').textContent;
    ok(pe.S().today.lv === 3 && B.lv === 2 && pe.S().wk['2026-10-26'].cut === true && /핵심만 · 다음 주에 새로 시작해요/.test(dsx) && fr && /놓아준 것 · \d+개/.test(fr.textContent) && /핵심만 · 다음 주에 새로 시작해요/.test(ws) && !/줄인 목표 · 남은 시간에 맞췄어요/.test(ws),
      `32. 고정 단계 3·지금 단계 ${B.lv}: 오늘 머리 "핵심만"과 놓아준 것, 이번 주 줄도 고정한 단계(지금 단계로 바뀌지 않음)`);
    await show('#week'); ok(/핵심만 · 다음 주에 새로 시작해요/.test(V$().querySelector('.score').textContent), '32. 이번 주 탭 점수 카드도 고정한 단계 문장'); await go('#today'); }
  // 33~35. 접는 칸은 쓰는 동안 열린 채(UI.open), 시간이 되면에서 손으로 친 일은 끝낸 줄로 남아 다시 누르면 되돌림
  scene('2026-10-29T07:40:00', ST);
  { await show('#today'); const fold = () => V$().querySelector('details.pf[data-fold="fold"]'), xb = () => V$().querySelector('[data-task="x.book:2026-10-29"]');
    ok(fold() && !fold().open, '33. 시간이 되면은 처음엔 접힘');
    click('details.pf[data-fold="fold"] > summary'); await sleep(10);
    ok(fold().open && pe.UI().open.fold === true, '33. 요약을 누르면 열리고 UI.open에 적음');
    click('[data-act="tk"][data-id="x.book:2026-10-29"]'); await sleep(20);
    ok(pe.S().tk['x.book:2026-10-29'] === THU && fold().open && xb() && xb().classList.contains('done') && xb().querySelector('.tkc.on') && /시간이 되면 · \d+개 · 1개 했어요/.test(fold().querySelector('summary').textContent), '33·34. 교재 줄을 치면 칸은 열린 채, 그 줄은 ✓ 끝낸 줄로 남음');
    click('[data-act="tk"][data-id="x.book:2026-10-29"]'); await sleep(20);
    ok(!pe.S().tk['x.book:2026-10-29'] && fold().open && xb() && !xb().classList.contains('done'), '34. 끝낸 줄을 다시 누르면 되돌림(칸은 그대로 열림)');
    click('details.pf[data-fold="fold"] > summary'); await sleep(10); pe.render(); await sleep(10);
    ok(!fold().open && pe.UI().open.fold === false, '33. 닫으면 다시 그려도 닫힌 채');
    await show('#week'); const gl = () => V$().querySelector('#wkGoals'); click('#wkGoals > summary'); await sleep(10);
    click('#wkGoals [data-act="tk"]'); await sleep(20);
    ok(pe.S().tk['goal:2026-10-26:0'] === THU && gl().open && gl().querySelector('.tkc.on'), '33. 이번 주 목표를 치면 목표 칸은 열린 채');
    at('2026-10-30T07:40:00'); await show('#today');
    ok(!Object.keys(pe.UI().open).length, '33. 날이 바뀌면 연 칸 기억(UI.open)을 비움'); }
  // 35. 필수를 다 해 시간이 되면의 세트 복습이 펼친 줄일 때, 그 세트 복습을 하다 닫으면 그 줄의 버튼이 "이어서 · 2/15"(위의 이어서 줄은 숨김), 이번 주 "다음"도 이어서.
  //     월 11/2 07:00 "오늘 시간 30분": 세트 복습 3개만 오늘 몫, 지난주에 기한이 지난 7일 차 4개(권장)는 시간이 되면
  scene('2026-11-02T07:00:00', ST);
  { pe.planToday(MON, { replan: 'cap', user: 30 }); applyRows(pe.S().today.rows.map(r => Object.assign({}, r, { task: pe.taskList(MON).find(x => x.id === r.id) })), MON); pe.invalidate(); await show('#today'); const p0 = prim();
    ok(p0.length === 1 && p0[0].dataset.act === 'task' && /시작 · 10\/20 세트부터/.test(p0[0].textContent) && p0[0].closest('.prow.now.nonum'), '35. 오늘 몫을 다 하면 시간이 되면의 세트 복습(권장 4개)이 펼친 줄(시작 · 10/20 세트부터)');
    p0[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(60);
    const sR = pe.SES(), it = sR.items[0]; if (it.type === 'card') { click('[data-act="sess-flip"]'); await sleep(5); click('[data-act="sess-grade"][data-g="2"]'); } else { click('[data-act="sess-pick"][data-k="0"]'); await sleep(5); click('[data-act="sess-next"]'); }
    await sleep(10); click('.topbar [data-act="back"]'); await sleep(60); await show('#today');
    ok(w.location.hash === '#today' && pe.SES() === sR && sR.i === 1 && !V$().querySelector('.resume') && prim().length === 1 && prim()[0].dataset.act === 'resume' && prim()[0].textContent === '이어서 · 2/15', '35. 하다 만 세트 복습은 펼친 줄의 버튼이 "이어서 · 2/15"(이어서 줄 숨김)');
    await show('#week'); ok(prim().length === 1 && prim()[0].dataset.act === 'resume' && /^다음: 세트 복습/.test(prim()[0].textContent), '35. 이번 주 "다음"도 같은 세션을 이어서');
    pe.goTab('today'); await sleep(40); }
  // 36. 지금 할 세트 복습이 없고 일요일까지 돌아올 것만 있으면 "세트 복습 · 일요일까지 n개"("남은 0개"라고 하지 않음)
  scene('2026-10-29T07:40:00', ST);
  { const T = pe.taskList(THU).filter(x => x.k === 'rev'); applyRows(T.map(x => ({ id: x.id, task: x })), THU); pe.invalidate();
    const l = line(pe.weekBoard(THU), 'rev'); await show('#today'); const q = [...V$().querySelectorAll('.wksec .qline')].map(x => x.textContent).find(x => /세트 복습/.test(x)) || '';
    await show('#week'); const qw = (V$().querySelector('#ql-rev') || {}).textContent || '';
    ok(l.dueNow === 0 && l.fut > 0 && q.indexOf(`세트 복습 · 일요일까지 ${l.fut}개`) === 0 && qw.indexOf(`세트 복습 · 일요일까지 ${l.fut}개`) === 0 && !/남은 0개/.test(q + qw), `36. 지금 할 세트 복습 0 · 일요일까지 ${l.fut}: "${q}"`); }
  // 37. 모의 점수 칸은 적어도 화면을 다시 그리지 않는다(다음 칸을 누른 채 이어 적기, 범위 밖 수는 그 칸에서 0~100으로)
  scene('2026-10-31T13:00:00', ST);
  { await show('#mock/2026-10-31'); const inp = k => V$().querySelector(`[data-act="mock-score"][data-k="${k}"]`), p2 = inp('p2'), p1 = inp('p1');
    p1.value = '62'; p1.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    ok(inp('p2') === p2 && inp('p1') === p1 && pe.S().mockp['2026-10-31'].sc.p1 === 62, '37. 1교시 점수를 적어도 칸은 그대로(다시 그리지 않음), S.mockp[D].sc.p1 = 62');
    p2.value = '150'; p2.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    ok(pe.S().mockp['2026-10-31'].sc.p2 === 100 && inp('p2') === p2 && p2.value === '100', '37. 범위 밖 150은 100으로(그 칸에 바로)');
    p2.value = ''; p2.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    ok(!('p2' in pe.S().mockp['2026-10-31'].sc) && pe.S().mockp['2026-10-31'].sc.p1 === 62, '37. 칸을 비우면 그 점수만 지움'); await go('#today'); }

  // 38. 이번 주 탭 배지: 날짜가 정해진 일(원서접수 기간·48시간 복기)이 3일 안이고 안 했을 때만 빨간 수(밀린 일·세트 복습은 세지 않음).
  //     오늘 몫의 원서접수·복기 핀과 같은 날짜 규칙(12/1~2/5 날마다). 기본 시작일 10/19: 제141회(1/30) 실전 모의 → 원서접수 12/29~1/1
  { const RD = () => [pe.PLAN().mock, pe.PLAN().target].filter(Boolean), nb = () => d.querySelector('#nav button[data-tab="week"] .nb');
    const want = t => pe.taskList(t).filter(x => !x.done && (x.k === 'recap' || x.k === 'apply' && t >= add(add(RD().find(r => r.r === x.r).d, -32), -3))).length;
    scene('2026-12-01T09:00:00', BLANK, HOL); const bad = []; let nOn = 0;
    for (let t = '2026-12-01'; t <= '2027-02-05'; t = add(t, 1)) { at(t + 'T09:00:00'); const n = pe.navBadgeN(t); if (n !== want(t)) bad.push(t + ':' + n); if (n) nOn++; }
    ok(!bad.length && nOn === 9, `38. 배지 수 = 오늘 몫의 원서접수·복기 핀 가운데 3일 안이고 안 한 것(12/1~2/5 날마다): 배지가 뜨는 날 ${nOn}일(접수 3일 전 12/26~마지막 날 1/1 7일 + 복기 1/31·2/1 2일) ${bad.slice(0, 3).join(' ')}`);
    at('2026-12-22T09:00:00'); await show('#more');
    ok(pe.taskList('2026-12-22').some(x => x.id === 'apply:141') && !nb(), '38. 12/22: 원서접수 핀은 있지만(12/29까지 7일) 배지 없음');
    at('2026-12-26T09:00:00'); pe.S().sp['2026-10-19'] = { read: {}, quiz: {}, tasks: {}, essay: {}, rev: {}, first: '2026-12-25', hw: {} }; pe.invalidate(); pe.render();
    ok(nb() && nb().textContent === '1' && nb().classList.contains('due') && pe.dueSetReviews().length > 0 && !d.querySelector('#nav button[data-tab="review"] .nb'), '38. 12/26(접수 3일 전): 이번 주 탭에 빨간 1, 다시 볼 세트가 있어도 복습 탭에는 배지 없음');
    pe.S().tk['apply:141'] = '2026-12-26'; pe.render(); ok(!nb(), '38. 접수했어요(S.tk apply:141) → 배지 없음');
    delete pe.S().tk['apply:141']; at('2027-01-01T09:00:00'); pe.render(); const a1 = !!nb() && nb().textContent === '1'; at('2027-01-02T09:00:00'); pe.render();
    ok(a1 && !nb(), '38. 접수 마지막 날(1/1)까지 1, 다음 날은 없음');
    at('2027-01-31T09:00:00'); pe.render(); const r1 = !!nb() && nb().textContent === '1'; at('2027-02-02T09:00:00'); pe.render();
    ok(r1 && !nb() && pe.navBadgeN('2027-02-01') === 1, '38. 시험(1/30) 다음 날부터 48시간 복기 1(1/31·2/1), 2/2는 없음');
    // 배지가 세는 일은 이번 주 탭에도: "일요일까지 끝낼 것" 맨 위 동그라미 줄(누르면 접수했어요·다 했어요 → 배지 없음, ✓로 아래, 다시 누르면 되돌림).
    // 오늘은 맨 위 핀만(아래 이번 주 칸에 다시 넣지 않음). 화면의 파란 버튼은 그 줄이 아님
    for (const [t, id, re] of [['2026-12-30', 'apply:141', /^큐넷 원서접수 · 제141회15분12\/29\(화\)~1\/1\(금\) 예상 · 첫날 오전 10시 · 접수 기간$/], ['2027-02-01', 'recap:141', /^제141회 복기2시간 30분문제 모두 적기 → 4문제 다시 써서 채점\(48시간 안\) · 오늘까지$/]]) {
      scene(t + 'T09:00:00', BLANK, HOL); await show('#week');
      const ql = () => [...V$().querySelectorAll('.qline')], q = () => V$().querySelector(`.qline.tkl[data-act="tk"][data-id="${id}"]`), p = prim();
      ok(nb() && nb().textContent === '1' && q() && ql()[0] === q() && re.test(q().textContent) && !q().querySelector('.tkc.on') && p.length === 1 && p[0].dataset.id !== id, `38. ${t}: 배지 1 → 이번 주 탭 맨 위에 ${id} 줄(동그라미), 파란 버튼은 ${p[0] && p[0].textContent}`);
      await show('#today');
      ok(V$().querySelector(`.pin [data-act="tk"][data-id="${id}"]`) && V$().querySelector('.wksec') && !V$().querySelector(`.wksec [data-id="${id}"]`), `38. ${t}: 오늘은 맨 위 핀만(이번 주 칸에는 없음)`);
      await show('#week'); const hl = w.history.length; click(`.qline.tkl[data-id="${id}"]`); await sleep(10);
      const L1 = ql(), i1 = L1.indexOf(q());
      ok(pe.S().tk[id] === t && !nb() && pe.navBadgeN(t) === 0 && w.location.hash === '#week' && w.history.length === hl && q().querySelector('.tkc.on') && /접수했어요|다 했어요/.test(q().textContent) && i1 > 0 && L1.every((x, i) => (i < i1) !== x.classList.contains('done')), `38. ${t}: 이번 주 탭에서 누르면 S.tk → 배지 없음, 줄은 ✓로 아래(주소·방문 기록 그대로)`);
      click(`.qline.tkl[data-id="${id}"]`); await sleep(10);
      ok(!pe.S().tk[id] && nb() && nb().textContent === '1' && ql()[0] === q(), `38. ${t}: 다시 누르면 되돌림(배지 1, 줄은 맨 위)`); }
    await go('#today'); }

  // 39. 준비 시작 전·시험 뒤(이번 주 탭은 할 몫 카드 하나): 아래 기록(학습 달력 · 세트 보관함 · 통계·주간 리포트 · 로드맵)으로 통계에 간다(통계는 이번 주 탭에서만).
  //     통계는 이번 주 점수 없이("—", "시험 주" 줄 없음), 주간 리포트는 "시험 뒤라·준비 시작 전이라 필수 점수가 없어요"
  for (const [t, st, re] of [['2027-05-18', null, /이번 주는 시험 뒤라 필수 점수가 없어요/], ['2026-11-02', '2026-11-30', /이번 주는 준비 시작 전이라 필수 점수가 없어요/]]) {
    scene(t + 'T09:00:00', BLANK); if (st) { pe.S().settings.start = st; pe.recalcPlan(); } await show('#week');
    const hl = w.history.length;
    ok(V$().querySelector('.norows') && ['cal', 'archive', 'stats', 'plan'].every(h => V$().querySelector(`.sec [data-act="go"][data-h="${h}"]`)) && prim().length === 1, `39. ${t}: 이번 주 탭은 카드 하나(파란 버튼 하나)와 기록 4줄`);
    click('[data-act="go"][data-h="stats"]'); await sleep(60);
    const tx = V$().textContent;
    ok(w.location.hash === '#stats' && w.history.length === hl && (d.querySelector('.topbar .back') || {}).textContent === '이번 주' && /—이번 주 필수/.test(tx) && !/시험 주 · 점수 대신 체크/.test(tx) && !/ · 이번 주/.test(tx), `39. ${t}: → 통계(위쪽 "이번 주"), 이번 주 필수 "—", 이번 주 줄 없음`);
    let copied = ''; const cp0 = w.PE_IO.copy; w.PE_IO.copy = x => { copied = x; return Promise.resolve(); }; click('[data-act="report"]'); await sleep(20); w.PE_IO.copy = cp0;
    ok(re.test(copied) && !/시험이 든 주/.test(copied) && /^\[기술사 6개월 주간 리포트\] \S+ ~ \S+ \((시험 후|시작 전)\)\n/.test(copied), `39. ${t}: 주간 리포트 "${copied.split('\n').slice(0, 2).join(' / ')}"`);
    click('.topbar [data-act="back"]'); await sleep(60); ok(w.location.hash === '#week' && w.history.length === hl, `39. ${t}: 뒤로 → 이번 주`); }
  await go('#today');

  // 시작(taskGo)·다음 줄(nextAfter): 줄마다 한 번에 그 자리로
  scene('2026-10-29T07:40:00', ST);
  { const V = pe.planToday(THU), n1 = pe.nextAfter('set.read:2026-10-29', V);
    ok(n1 && n1.row.id === 'rev:2026-10-27:1' && !n1.before, 'nextAfter: 용어 읽기 다음은 세트 복습 10/27');
    pe.taskGo('set.read:2026-10-29'); await sleep(40); ok(w.location.hash === '#set/2026-10-29' && pe.R().page === 'set' && d.querySelector('[data-act="set-tab"][data-t="cards"]').classList.contains('on'), 'taskGo 용어 읽기 → 그 세트 화면 ① 용어');
    pe.goTab('today'); await sleep(40); pe.taskGo('hw.dd:2026-10-29'); await sleep(40); ok(w.location.hash === '#set/2026-10-29' && d.querySelector('[data-act="set-tab"][data-t="tasks"]').classList.contains('on'), 'taskGo 단답 → 세트 화면 숙제 탭');
    pe.goTab('today'); await sleep(40); pe.taskGo('rev:2026-10-27:1'); await sleep(40); ok(w.location.hash === '#sess' && pe.SES().kind === 'rev' && pe.SES().rv[0].d === '2026-10-27', 'taskGo 세트 복습 → 세션(세트 복습 10/27)');
    pe.goTab('today'); await sleep(40); const n0 = Object.keys(pe.S().tk).length; pe.taskGo('x.book:2026-10-29'); await sleep(20); ok(pe.S().tk['x.book:2026-10-29'] === THU && Object.keys(pe.S().tk).length === n0 + 1, 'taskGo 교재(앱이 볼 수 없는 일) → 다 했어요(S.tk)'); }
  scene('2026-10-31T08:00:00', ST);
  { pe.planToday(SAT); pe.taskGo('mock:2026-10-31:p1'); await sleep(40); ok(w.location.hash === '#mock/2026-10-31', 'taskGo 1교시 → 모의고사 화면'); pe.goTab('today'); await sleep(40); }
  scene('2026-11-01T09:00:00', ST);
  { pe.planToday(SUN); pe.taskGo('report:2026-10-26'); await sleep(20); ok(pe.S().tk['report:2026-10-26'] === SUN, 'taskGo 일요일 주간 리포트 → 복사하고 이번 주 리포트로 침'); }
  scene('2026-11-02T07:00:00', ST);
  { pe.taskGo('report:2026-10-26'); await sleep(20); ok(pe.S().tk['report:2026-10-26'] === MON, 'taskGo 월요일 "지난주 리포트 아직" → 지난주(10/26)로 침'); }
  // 카드 복습은 오늘 몫의 장 수(단계 2부터 하루 30장), 모의 점수 적기는 그 주 모의 화면으로(손으로 치지 않음)·모의가 없는 주엔 그 줄도 없음
  { const st = clone(ST); st.settings.budget = { sat: 200 }; scene('2026-10-31T08:00:00', st); const V = pe.planToday(SAT), c = pe.taskList(SAT).find(x => x.id === 'cards:2026-10-31');
    pe.taskGo('cards:2026-10-31'); await sleep(40);
    ok(V.lv === 2 && c && c.kc > 30 && pe.SES().kind === 'cards' && pe.SES().items.length === 30, `taskGo 카드 복습(단계 2): 주말 몫 ${c && c.kc}장이 아니라 오늘 몫 30장으로 시작`);
    pe.goTab('today'); await sleep(40); scene('2026-10-31T08:00:00', ST); pe.planToday(SAT); pe.taskGo('cards:2026-10-31'); await sleep(40);
    ok(pe.SES().kind === 'cards' && pe.SES().items.length === 48, 'taskGo 카드 복습(단계 1): 48장 그대로'); pe.goTab('today'); await sleep(40); }
  { const X = clone(FIX); ['2027-02-22', '2027-02-23'].forEach(x => X.sets[x] = cloneSet(x, 18, refsFor(3))); X.mocks['2027-02-27'] = cloneMock('2027-02-27', { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
    scene('2027-02-28T09:00:00', BLANK, X); const x = pe.taskList('2027-02-28').find(r => r.id === 'x.trend:2027-02-22');
    pe.taskGo('x.trend:2027-02-22'); await sleep(40);
    ok(x && x.d === '2027-02-27' && w.location.hash === '#mock/2027-02-27' && !pe.S().tk['x.trend:2027-02-22'] && !((pe.S().cal['2027-02-28'] || {}).x || {})['tk:x.trend:2027-02-22'], 'taskGo 모의 점수 적기 → 그 주 모의 화면(S.tk·달력 할 일로 치지 않음)');
    pe.goTab('today'); await sleep(40); scene('2027-03-07T09:00:00', BLANK, X);
    ok(!pe.taskList('2027-03-07').some(r => /^x\.trend:/.test(r.id)), '모의가 없는 3단계 일요일엔 "모의 점수 적기" 줄 없음'); }

  // 그 밖: 숙제 필수·핵심·같은 그림
  scene('2026-10-29T07:40:00', ST);
  { const rp = pe.reqParts('2026-10-27'); ok(rp.map(p => p.t).join() === '말하기,쓰기,단답,목차,자기 전' && rp.every(p => !p.done), '숙제 필수 5가지(퀴즈를 다 맞혀 틀린 이유 없음)');
    pe.S().sp['2026-10-27'].quiz[0] = { pick: 9, ok: false }; ok(pe.reqParts('2026-10-27').length === 6 && pe.reqParts('2026-10-27')[4].t === '틀린 이유', '퀴즈를 다 풀고 틀린 것이 있으면 6가지(틀린 이유)');
    ok(pe.setStatus('2026-10-27').core === true && pe.setStatus('2026-10-28').core === false, 'setStatus().core: 읽기 + 퀴즈(1단계)');
    const X = clone(FIX); X.sets['2026-10-29'] = cloneSet('2026-10-29', 1, REFS['2026-10-29'], { essay: Object.assign(clone(BASE.essay), { fig: '액상화 평가 흐름도(예비평가 → 본 평가 → 대책)' }), tasks: BASE.tasks.concat(['액상화 평가 흐름도(예비평가 생략 조건 3개 → 본 평가)를 손으로 그리기']) });
    X.sets['2026-10-27'] = cloneSet('2026-10-27', 1, REFS['2026-10-27'], { essay: Object.assign(clone(BASE.essay), { fig: '토사성토·암버럭 성토 구간 단면과 암쌓기 금지 구간 표시도' }), tasks: BASE.tasks.concat(['토사성토와 암버럭 성토의 층 두께·다짐 기준을 표로 정리하기']) });
    scene('2026-10-29T07:40:00', ST, X);
    ok(pe.figDup('2026-10-29', 3) && !pe.figDup('2026-10-27', 3) && pe.hwParts('2026-10-29').restMin === 18 && pe.hwParts('2026-10-27').restMin === 33, '같은 그림 과제(흐름도 그리기)는 그림·표 하나로, 표 정리는 따로(숙제 나머지 18분·33분)'); }

  // 세트 화면·숙제·끝 화면(시계 고정): 아래 막대가 오늘 줄을 잇고, 끝 화면의 "다음"은 정한 순서(1 이어서 · 2 세트 복습 잇기 · 3 오늘 줄 · 4 그 일의 다음 · 5 오늘 순서로)
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), H = () => w.location.hash, L = () => w.history.length, tabOn = () => [...d.querySelectorAll('#nav button.on')].map(b => b.dataset.tab).join();
    const bar = () => V$().querySelector('.nextbar .btn'), endP = () => V$().querySelector('.endb > .btn'), link = () => V$().querySelector('.endor .lnk'), tap = async (sel, root) => { click(sel, root); await sleep(60); };
    const doAll = async right => { for (let k = 0; k < 200 && pe.SES() && pe.SES().items[pe.SES().i]; k++) { const it = pe.SES().items[pe.SES().i];
      if (it.type === 'card') { click('[data-act="sess-flip"]'); click('[data-act="sess-grade"][data-g="2"]'); }
      else if (it.type === 'gq') { const q = pe.gqList(it.d).items[it.n]; click(`[data-act="sess-pick"][data-k="${right ? q.a : (q.a + 1) % q.o.length}"]`); click('[data-act="sess-next"]'); }
      else { click('[data-act="sess-pick"][data-k="0"]'); click('[data-act="sess-next"]'); } } await sleep(20); };
    // A: 오늘 → "단답 1문제" 줄 → 세트 ③(그 카드를 펼침) → [답안지](#dandap/카드/날짜) → 뒤로 → "다 썼어요 · 단답 1문" → "✓ 끝 · 다음: 논술 목차 옮겨 적기 4번" → 뒤로 → 오늘
    scene('2026-10-29T07:40:00', ST); await show('#today'); const hl = L();
    click('#view [data-task="hw.dd:2026-10-29"]'); await sleep(60);
    const fc = V$().querySelector('.hw.focus'), stB = fc ? [...fc.querySelectorAll('.steps3 li')].map(li => [...li.querySelectorAll('button')].map(b => b.dataset.act + ':' + (b.dataset.h || b.dataset.p || '')).join()) : [];
    ok(H() === '#set/2026-10-29' && V$().querySelector('[data-act="set-tab"][data-t="tasks"].on') && fc && fc.querySelector('[data-k^="dd"]') && stB.length === 3 && /^go:dandap\/D20261029-\d+\/2026-10-29$/.test(stB[0]) && stB[1] === 'tl-start:one1' && /^copy-dd/.test(stB[2]) && tabOn() === 'today',
      'A: 오늘 단답 줄 → 세트 ③, 단답 카드를 펼침(이렇게 해요 ① 답안지 → #dandap/카드/날짜 ② 타이머 10분(카드 안 타이머) ③ 첨삭 요청 복사)');
    ok(prim().length === 1 && bar() && T_(bar()) === '다 썼어요 · 단답 1문' && bar().dataset.act === 'hw-bulk', 'A: 이 화면의 파란 버튼은 아래 막대 "다 썼어요 · 단답 1문" 하나');
    await tap('.hw.focus .steps3 [data-h^="dandap/"]');
    ok(/^#dandap\/D20261029-\d+\/2026-10-29$/.test(H()) && prim().length === 1 && T_(prim()[0]) === '다 썼어요(숙제에 표시)' && tabOn() === 'today', 'A: 답안지(#dandap/카드/날짜): 파란 버튼 "다 썼어요(숙제에 표시)"');
    await tap('.topbar [data-act="back"]');
    ok(H() === '#set/2026-10-29' && T_(bar()) === '다 썼어요 · 단답 1문', 'A: 뒤로 → 세트 ③(막대 그대로)');
    const ddk = pe.hwParts('2026-10-29').dd.ks[0]; await tap('.nextbar .btn');
    ok(pe.S().sp['2026-10-29'].hw[ddk] === 1 && /^✓ 끝 · 다음: 논술 목차 옮겨 적기 4번 · 20분$/.test(T_(bar())) && pe.planToday(THU).rows.find(r => r.id === 'hw.dd:2026-10-29').done, 'A: "다 썼어요 · 단답 1문" → 단답 동그라미, 오늘 줄도 끝, 막대는 "✓ 끝 · 다음: 논술 목차 옮겨 적기 4번 · 20분"');
    await tap('.nextbar .btn');
    ok(H() === '#set/2026-10-29' && L() === hl && pe.FLOW().id === 'hw.eo:2026-10-29' && V$().querySelector('.hw.focus [data-k="eo"]') && T_(bar()) === '4번 다 옮겨 적었어요', 'A: 다음 → 같은 세트 화면에서 목차 카드를 펼침(바꿔 쓰기, 방문 기록 그대로), 막대 "4번 다 옮겨 적었어요"');
    await tap('.topbar [data-act="back"]');
    ok(H() === '#today' && L() === hl && tabOn() === 'today', 'A: 뒤로 → 오늘(사이에 낡은 세트 화면 없음)');
    // 펼친 말하기 카드의 "4번씩 다 했어요 · 말하기"는 고정한 목표(학원 횟수)까지 올리기만
    click('#view [data-task="hw.say:2026-10-29"]'); await sleep(60);
    ok(T_(bar()) === '4번씩 다 했어요 · 말하기' && V$().querySelector('.hw.focus [data-k="s0"]') && /30초 안에/.test(T_(V$().querySelector('.hw.focus .steps3'))), '펼친 말하기 카드: 막대 "4번씩 다 했어요 · 말하기", 이렇게 해요 세 단계');
    pe.S().sp['2026-10-29'].hw.s0 = 4; pe.S().sp['2026-10-29'].hw.s1 = 1; await tap('.nextbar .btn');
    ok(pe.hwParts('2026-10-29').say.ks.every(k => pe.S().sp['2026-10-29'].hw[k] === 4) && /^✓ 끝 · 다음: /.test(T_(bar())), '말하기 4번씩: 모든 말하기 칸을 4까지(이미 한 것은 그대로), 그다음 ✓ 끝');
    pe.goTab('today'); await sleep(40);
    // 세트 화면 막대(오늘 줄 없이): 읽기 → 세트 퀴즈 → 숙제 필수
    await show('#set/2026-10-29');
    ok(T_(bar()) === '다음: 용어 읽기 0/10' && bar().dataset.act === 'set-bar', '세트 막대(오늘 줄 없이): 다음: 용어 읽기 0/10');
    await tap('.nextbar .btn');
    ok(V$().querySelector('.acc.open') && pe.S().sp['2026-10-29'].read[0] === 1 && T_(bar()) === '다음: 용어 읽기 1/10', '"다음: 용어 읽기" → 첫 안 읽은 용어를 펼침(읽음)');
    for (let i = 1; i < 10; i++) pe.S().sp['2026-10-29'].read[i] = 1; pe.render();
    ok(T_(bar()) === '다음: 세트 퀴즈 5문', '다 읽으면 다음: 세트 퀴즈 5문');
    await tap('.nextbar .btn'); ok(V$().querySelector('[data-act="set-tab"][data-t="quiz"].on'), '→ ② 퀴즈');
    const q0 = pe.SETS().sets['2026-10-29'].quiz; for (let i = 0; i < q0.length; i++) { click(`[data-act="set-quiz"][data-i="${i}"][data-k="${i ? q0[i].a : (q0[i].a + 1) % q0[i].o.length}"]`); await sleep(5); }
    ok(/③ 숙제 2\/6/.test(T_(V$().querySelector('[data-act="set-tab"][data-t="tasks"]'))) && /틀린 이유/.test(pe.reqParts('2026-10-29').map(p => p.t).join()), 'D7: 세트 퀴즈를 다 풀고 하나 틀리면 ③ 숙제 필수가 6가지(틀린 이유)');
    ok(T_(bar()) === '다음: 숙제 필수 · 틀린 이유' && /틀린 문제는 오답 노트와 숙제 '틀린 이유'로 갔어요/.test(T_(V$())), '퀴즈를 다 풀면 막대는 다음 빠진 숙제 필수(오늘 세트: 말하기 → 틀린 이유 → …)');
    await tap('.nextbar .btn');
    ok(V$().querySelector('.hw.focus [data-k^="q"]') && T_(bar()) === '다 썼어요 · 틀린 이유', '→ ③ 틀린 이유 카드를 펼침, 막대 "다 썼어요 · 틀린 이유"');
    pe.goTab('today'); await sleep(40);

    // B: 오늘 → 세트 복습 7개 "시작" → 끝 → "다음 세트 복습: 10/28(수) 1일 차 (2/7)"(같은 #sess) → … → 마지막 끝 → 다음 오늘 줄(카드 복습) → "오늘로"
    scene('2026-10-29T07:40:00', ST); await show('#today'); const hb = L();
    click('#view [data-task="rev:2026-10-27:1"]'); await sleep(60); const sB = pe.SES();
    ok(H() === '#sess' && sB.kind === 'rev' && JSON.stringify(sB.chain) === '["2026-10-28","2026-10-26","2026-10-19","2026-10-20","2026-10-21","2026-10-22"]' && sB.from === 'today', 'B: 세트 복습 7개 줄 → 10/27 세트 복습(묶음의 나머지 6개를 이어서)');
    await doAll(true);
    ok(T_(endP()) === '다음 세트 복습: 10/28(수) 1일 차 (2/7) · 8분' && prim().length === 1 && V$().querySelector('.endb .btn.sec[data-act="sess-close"]') && T_(V$().querySelector('.endb .btn.sec')) === '오늘로', 'B: 끝 → 파란 "다음 세트 복습: 10/28(수) 1일 차 (2/7) · 8분", 회색 "오늘로"');
    click('[data-act="end-go"][data-w="p"]'); await sleep(60); const sB2 = pe.SES();
    ok(sB2 !== sB && sB2.rv[0].d === '2026-10-28' && H() === '#sess' && L() === hb && sB2.from === 'today' && tabOn() === 'today', 'B: 다음 세트 복습은 같은 #sess에서(방문 기록 그대로, 연 곳은 오늘)');
    const seen = []; for (let k = 0; k < 6; k++) { await doAll(true); const e = T_(endP()); seen.push(e); if (!/^다음 세트 복습/.test(e)) break; click('[data-act="end-go"][data-w="p"]'); await sleep(60); }
    ok(seen.length === 6 && seen.slice(0, 5).every((e, i) => e.indexOf(`(${i + 3}/7)`) > 0) && seen[5] === '다음: 카드 복습 10장 · 5분' && T_(V$().querySelector('.endb .btn.sec')) === '오늘로' && L() === hb, `B: 묶음의 세트 복습을 차례로(3/7~7/7), 마지막 끝 → 다음 오늘 줄(카드 복습 10장), 회색 "오늘로": ${seen.join(' / ')}`);
    await tap('[data-act="sess-close"]');
    ok(H() === '#today' && L() === hb && !pe.SES() && tabOn() === 'today', 'B: 오늘로 → 오늘');

    // 차례 1·2: 복습 날인 세트의 창에서 연 용어 퀴즈는 세트 복습 규칙(다 풀면 다음 세트 복습, 또는: 그 퀴즈의 다음)
    scene('2026-10-29T07:40:00', ST); await show('#review'); const mw = () => d.querySelector('#modal-wrap');
    ok(prim().length === 1 && /^세트 복습 시작 · 10\/27\(화\) 1일 차 · 8분$/.test(T_(prim()[0])) && /세트 복습 7 · 카드 복습 57/.test(T_(V$().querySelector('.lsub'))), '복습 탭: 상태 한 줄(세트 복습 7 · 카드 복습 57), 파란 "세트 복습 시작 · 10/27(화) 1일 차 · 8분" 하나');
    click('[data-act="rev-open"][data-d="2026-10-26"]'); await sleep(20);
    ok([...mw().querySelectorAll('.btn:not(.sec):not(.ghost)')].length === 1 && /세트 복습 시작 · 카드 10 \+ 퀴즈 5 · 약 8분/.test(T_(mw())) && mw().querySelector('details.rvm [data-act="gq-go"]'), '세트 창: 파란 "세트 복습 시작 · 카드 10 + 퀴즈 5 · 약 8분" 하나, 나머지는 "다른 방법으로" 안');
    click('[data-act="gq-go"]', mw()); await sleep(60);
    ok(pe.SES().kind === 'gq' && pe.SES().chain.length === 6 && pe.SES().chain[0] === '2026-10-19', '창에서 연 용어 퀴즈도 나머지 세트 복습을 잇는다(그 세트 뒤 차례부터)');
    await doAll(true);
    ok(/^다음 세트 복습: 10\/19\(월\) 7일 차 \(2\/7\) · 8분$/.test(T_(endP())) && T_(link()) === '또는: 2회 풀기 (15문)' && pe.S().sp['2026-10-26'].rev[3] === THU, '차례 2: 용어 퀴즈를 끝까지 풀면 세트 복습으로 치고 "다음 세트 복습", 아래 "또는: 2회 풀기 (15문)"');
    // 차례 4: ②에서 연 용어 퀴즈는 그 퀴즈의 다음("다음: 2회 풀기 (15문)", 같은 #sess에서 2회)
    pe.goTab('today'); await sleep(40); await show('#set/2026-10-29'); click('[data-act="set-tab"][data-t="quiz"]'); await sleep(10);
    const ord = [...V$().querySelectorAll('section.sec, details.gqf')].map(x => x.tagName).join();
    ok(ord === 'SECTION,DETAILS' && /세트 퀴즈/.test(T_(V$().querySelector('section.sec'))) && /더 연습: 용어 퀴즈 \d+문 · 0\/\d+/.test(T_(V$().querySelector('details.gqf > summary'))) && !V$().querySelector('details.gqf').open && !V$().querySelector('details.gqf .btn:not(.sec):not(.ghost)'), '②: 세트 퀴즈 먼저, 용어 퀴즈는 접은 "더 연습"(세트 퀴즈 전엔 닫힘, 안의 버튼은 모두 보조)');
    click('details.gqf [data-act="gq-go"][data-r="next"]'); await sleep(60); await doAll(true); const hq = L(), g1 = pe.SES();
    ok(T_(endP()) === '다음: 2회 풀기 (15문)' && !link() && T_(V$().querySelector('.endb .btn.sec')) === '세트로', '차례 4: ②에서 연 용어 퀴즈 끝 → "다음: 2회 풀기 (15문)", 회색 "세트로"');
    click('[data-act="end-go"][data-w="p"]'); await sleep(60);
    ok(pe.SES() !== g1 && pe.SES().items[0].n === 15 && pe.SES().gq.m === 'round' && H() === '#sess' && L() === hq, '"다음: 2회 풀기" → 같은 #sess에서 2회(16번부터)');
    // FLOW를 놓은 뒤(다른 화면에서 시작) 4지선다: 오늘 줄 없이 "다음: 4지선다 10문 더"
    pe.goTab('today'); await sleep(40); pe.taskGo('set.read:2026-10-29'); await sleep(60); const fl0 = pe.FLOW();
    await go('#test'); click('[data-act="start-mcq"]'); await sleep(60);
    ok(fl0 && fl0.id === 'set.read:2026-10-29' && !pe.FLOW() && pe.SES().kind === 'mcq', '오늘 줄로 세트를 연 뒤 연습 탭(예전 주소 #test)에서 4지선다를 시작하면 오늘 줄 흐름(FLOW)을 놓음');
    await doAll(); ok(T_(endP()) === '다음: 4지선다 10문 더' && !link() && !/오늘 순서/.test(T_(V$())) && T_(V$().querySelector('.endb .btn.sec')) === '연습으로', '4지선다 끝: "다음: 4지선다 10문 더"(오늘 줄 없음), 회색 "연습으로"');
    const m1 = pe.SES(), hm = L(); click('[data-act="end-go"][data-w="p"]'); await sleep(60);
    ok(pe.SES() !== m1 && pe.SES().kind === 'mcq' && pe.SES().from === 'test' && H() === '#sess' && L() === hm, '"4지선다 10문 더" → 같은 #sess에서, 돌아갈 곳은 연 곳(연습) 그대로');
    await tap('.topbar [data-act="back"]'); ok(H() === '#practice' && L() === hm && pe.SES() && d.querySelector('#nav button.on').dataset.tab === 'practice', '닫기 → 연습 탭 첫 화면(#practice, 방문 기록 그대로)');
    pe.goTab('today'); await sleep(40);

    // 하는 곳이 없는 다음 줄(주간 리포트): 오늘로 가서 그 줄을 펼침(앞의 남은 줄보다 먼저)
    scene('2026-10-31T08:00:00', ST); applyRows(pe.dayPlan(SAT).rows, SAT); const SD = clone(pe.S());
    scene('2026-11-01T09:00:00', SD); pe.goTab('today'); await sleep(40); const VR = pe.planToday(SUN), rr = VR.rows, rp = rr.find(r => /^report:/.test(r.id)), lr = rr[rr.indexOf(rp) - 1];
    applyRows(rr.filter(r => r !== rp && r !== lr && r !== rr[0]), SUN); pe.invalidate(); pe.taskGo(lr.id); await sleep(60); await doAll(true);
    ok(lr.task.k === 'rev' && T_(endP()) === '다음: 주간 리포트 복사 → Claude · 10분', `오늘 줄(${lr.id})의 끝 → "다음: 주간 리포트 복사 → Claude · 10분"`);
    click('[data-act="end-go"][data-w="p"]'); await sleep(60);
    ok(H() === '#today' && V$().querySelector('.prow.now') && V$().querySelector('.prow.now').dataset.task === rp.id && !pe.planToday(SUN).rows[0].done, '하는 곳이 없는 줄 → 오늘에서 그 줄을 펼침(앞에 남은 10/29 세트 복습보다 먼저)');

    // ① 가리며 외우기 끝: 세트 퀴즈가 남았으면 "다음: 세트 퀴즈 5문" → 세트 ②(방문 기록 그대로), 뒤로 → 오늘
    scene('2026-10-29T07:40:00', ST); pe.goTab('today'); await sleep(40); await show('#set/2026-10-29'); const hM = L();
    click('[data-act="memo-set"]'); await sleep(60); while (pe.MEMO().i + 1 < pe.MEMO().items.length) { click('[data-act="memo-next"]'); await sleep(2); }
    click('[data-act="memo-finish"]'); await sleep(20);
    ok(T_(endP()) === '다음: 세트 퀴즈 5문' && T_(V$().querySelector('.endb .btn.sec')) === '세트로' && !V$().querySelector('[data-h="cal"]'), '가리며 외우기 끝(세트): "다음: 세트 퀴즈 5문", 회색 "세트로"(학습 달력 버튼은 없음)');
    click('[data-act="end-go"][data-w="p"]'); await sleep(60);
    ok(H() === '#set/2026-10-29' && V$().querySelector('[data-act="set-tab"][data-t="quiz"].on') && L() === hM, '→ 세트 ② 퀴즈(방문 기록 그대로)');
    await tap('.topbar [data-act="back"]'); ok(H() === '#today' && L() === hM, '뒤로 → 오늘');

    // 같은 그림 과제: 그림·표 마지막 동그라미를 채우면 그 과제(sp.tasks[i])도 다 함, 하나 빼면 되돌림. 그 과제 카드는 숨기고 그림·표 카드에 한 줄
    const X = clone(FIX); X.sets[THU] = cloneSet(THU, 1, REFS[THU], { essay: Object.assign(clone(BASE.essay), { fig: '액상화 평가 흐름도(예비평가 → 본 평가 → 대책)' }), tasks: BASE.tasks.concat(['액상화 평가 흐름도(예비평가 생략 조건 3개 → 본 평가)를 손으로 그리기']) });
    scene('2026-10-29T07:40:00', ST, X); pe.goTab('today'); await sleep(40); await show('#set/' + THU); click('[data-act="set-tab"][data-t="tasks"]'); await sleep(10);
    const ti = BASE.tasks.length, fgN = w.PE_HW[1].fg;
    ok(pe.figDup(THU, ti) && !V$().querySelector(`[data-act="hw-task"][data-i="${ti}"]`) && /세트 숙제 항목과 같은 그림이에요/.test(T_(V$().querySelector('.hw [data-k="fg"]').closest('.hw'))), '같은 그림 과제 카드는 숨기고 그림·표 카드에 "세트 숙제 항목과 같은 그림이에요"');
    click(`[data-act="hw"][data-k="fg"][data-v="${fgN}"]`); await sleep(10); const tOn = pe.S().sp[THU].tasks[ti] === true;
    click(`[data-act="hw"][data-k="fg"][data-v="${fgN}"]`); await sleep(10);
    ok(tOn && pe.S().sp[THU].tasks[ti] === false && pe.setStatus(THU).nt === pe.hwItems(THU).length, '그림·표 마지막 동그라미 → 그 과제도 다 함(sp.tasks), 하나 빼면 되돌림(숙제 수는 그대로)');
    pe.goTab('today'); await sleep(40);

    // 하는 곳이 없는 다음 줄(3단계 토요일 "모의 오답 다시 쓰기" 몫): 끝 화면·세트 막대의 "다음"은 오늘에서 그 줄을 펼칠 뿐, 다시 쓰기를 한 것으로 치지 않는다(S.tk 그대로)
    { const W3 = '2027-02-22', X3 = { sets: {}, mocks: {} }; for (let i = 0; i < 5; i++) X3.sets[add(W3, i)] = cloneSet(add(W3, i), 18, refsFor(3));
      X3.mocks['2027-02-27'] = cloneMock('2027-02-27', { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
      const st3 = ddOpen => { const st = clone(BLANK); for (let i = 0; i < 5; i++) { const dd = add(W3, i), s = X3.sets[dd], p = { read: {}, quiz: {}, tasks: {}, essay: {}, rev: {}, first: dd, hw: { fg: 3 } };
          if (!(ddOpen && i === 0)) for (let j = 0; j < 10; j++) p.hw['dd' + j] = 1;
          s.cards.forEach((_, j) => p.read[j] = 1); s.quiz.forEach((q, j) => p.quiz[j] = { pick: q.a, ok: true }); if (ddOpen || i !== 2) p.rev = { 1: add(dd, 1), 3: add(dd, 3) }; st.sp[dd] = p; }
        st.mockp['2027-02-27'] = { p1: true, p2: true }; return st; };
      const redo = () => Object.keys(pe.S().tk).filter(k => /redo/.test(k)), act = () => (V$().querySelector('.prow.now') || {}).dataset;
      scene('2027-02-27T08:00:00', st3(false), X3); pe.goTab('today'); await sleep(40);
      const V3 = pe.planToday('2027-02-27'), rv = V3.rows.find(r => /^rev:/.test(r.id) && !r.done), qr = V3.rows.find(r => /^q\.redo:/.test(r.id)), h3 = L();
      pe.taskGo(rv.id); await sleep(60); await doAll(true); const tk1 = JSON.stringify(pe.S().tk);
      ok(qr && /^다음: 모의 오답 다시 쓰기 \d편 · /.test(T_(endP())), `3단계 토요일 세트 복습(${rv && rv.id}) 끝: 다음 오늘 줄은 "모의 오답 다시 쓰기"`);
      click('[data-act="end-go"][data-w="p"]'); await sleep(60);
      ok(H() === '#today' && L() === h3 && !redo().length && JSON.stringify(pe.S().tk) === tk1 && act() && act().task === qr.id && !pe.weekBoard('2027-02-27').lines.find(l => l.k === 'redo').a,
        '끝 화면 "다음: 모의 오답 다시 쓰기" → 오늘에서 그 줄을 펼침(다시 쓰기로 치지 않음: S.tk·주간 다시 쓰기 0/5 그대로, 방문 기록 그대로)');
      scene('2027-02-27T08:00:00', st3(true), X3); pe.goTab('today'); await sleep(40);
      const V4 = pe.planToday('2027-02-27'), qd = V4.rows.find(r => /^q\.dd:/.test(r.id)), qr4 = V4.rows.find(r => /^q\.redo:/.test(r.id)); pe.taskGo(qd.id); await sleep(60);
      for (let k = 0; k < 5 && /^다 썼어요/.test(T_(bar())); k++) await tap('.nextbar .btn');
      const tk2 = JSON.stringify(pe.S().tk);
      ok(H() === '#set/2027-02-22' && /^✓ 끝 · 아까 넘긴 것: 모의 오답 다시 쓰기 \d편 · /.test(T_(bar())), '단답 손글씨 몫을 다 쓰면 세트 막대 "✓ 끝 · 아까 넘긴 것: 모의 오답 다시 쓰기"');
      await tap('.nextbar .btn');
      ok(H() === '#today' && !redo().length && JSON.stringify(pe.S().tk) === tk2 && act() && act().task === qr4.id, '세트 막대 "✓ 끝 · 아까 넘긴 것: 모의 오답 다시 쓰기" → 오늘에서 그 줄을 펼침(치지 않음)');
      ok(T_(V$().querySelector('.prow.now .pgo .btn')) === '한 편 다 썼어요' && V$().querySelector('.prow.now .pgo .btn').dataset.act === 'redo-tick', '펼친 줄의 파란 "한 편 다 썼어요"(따로 된 동작 redo-tick)를 눌러야 다시 쓰기 1편으로 친다');
      pe.taskGo(qr4.id, { replace: true }); await sleep(30); ok(!redo().length && H() === '#today', '"다음"으로 부른 하는 곳 없는 줄(taskGo replace)은 손으로 치지 않음');
      click('#view .prow.now .pgo .btn'); await sleep(30); ok(redo().length === 1, '파란 "한 편 다 썼어요" → 다시 쓰기 1편(S.tk x.redo)'); }

    // 단답 답안지: 세트 ①·카드 창에서 연 그 세트 숙제 단답 카드는 #dandap/카드/날짜("다 썼어요(숙제에 표시)" → 숙제 동그라미). 숙제가 아닌 카드는 칠 것이 없어 타이머가 파란 버튼
    scene('2026-10-29T07:40:00', ST); pe.goTab('today'); await sleep(40);
    { const ddId = pe.hwParts(THU).dd.ids[0], ddk = pe.hwParts(THU).dd.ks[0], ix = pe.setIds(THU).indexOf(ddId), dds = pe.hwItems(THU).find(x => x.key === 'dd').rows.map(r => r.go);
      await show('#set/' + THU); click('[data-act="set-tab"][data-t="cards"]'); await sleep(10); click(`[data-act="set-open"][data-i="${ix}"]`); await sleep(20);
      ok(V$().querySelector('.acc.open [data-h^="dandap/"]').dataset.h === 'dandap/' + encodeURIComponent(ddId) + '/' + THU, '① 숙제 단답 카드의 "단답 답안지" → #dandap/카드/날짜');
      await tap('.acc.open [data-h^="dandap/"]');
      ok(prim().length === 1 && T_(prim()[0]) === '다 썼어요(숙제에 표시)' && !V$().querySelector('[data-act="dd-tick"]'), '①에서 연 숙제 카드 답안지: 파란 "다 썼어요(숙제에 표시)" 하나("단답 1문제 더" 없음)');
      await tap('[data-act="dd-done"]');
      ok(pe.S().sp[THU].hw[ddk] === 1 && !pe.S().tk['x.dd2:' + THU] && pe.planToday(THU).rows.find(r => r.id === 'hw.dd:' + THU).done, '→ 그 세트 숙제 단답 동그라미, 오늘 "단답 1문제" 줄도 끝("단답 1문제 더"는 치지 않음)');
      const b = d.createElement('button'); b.dataset.act = 'card-modal'; b.dataset.id = ddId; V$().appendChild(b); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(10);
      const mh = d.querySelector('#modal-wrap [data-h^="dandap/"]'); ok(mh && mh.dataset.h === 'dandap/' + encodeURIComponent(ddId) + '/' + THU, '카드 창의 "단답 답안지로 보기"도 숙제 단답 카드면 #dandap/카드/날짜'); d.querySelector('#modal-wrap').innerHTML = '';
      const nx = pe.setIds(THU).findIndex(id => !dds.includes(id)); await show('#set/' + THU); click('[data-act="set-tab"][data-t="cards"]'); await sleep(10); click(`[data-act="set-open"][data-i="${nx}"]`); await sleep(20);
      const nhs = V$().querySelector('.acc.open [data-h^="dandap/"]').dataset.h; await tap('.acc.open [data-h^="dandap/"]');
      ok(nhs.split('/').length === 2 && prim().length === 1 && prim()[0].dataset.act === 'timer-go' && !V$().querySelector('[data-act="dd-tick"], [data-act="dd-done"]'), '① 숙제 아닌 카드의 답안지(#dandap/카드): 칠 것이 없어 "다 썼어요" 없음, 파란 버튼은 타이머 10분'); }
    // 끝 화면에서 "다음"으로 연 "단답 1문제 더"(답안지)도 뒤로는 연 곳(오늘)으로(끝난 세션 화면으로 돌아가지 않음)
    scene('2026-10-29T07:40:00', ST); pe.goTab('today'); await sleep(40); pe.taskGo('rev:2026-10-27:1'); await sleep(60); await doAll(true); const hd = L();
    pe.taskGo('x.dd2:' + THU, { replace: true }); await sleep(60); const ddOk = /^#dandap\/[^/]+$/.test(H()) && prim().length === 1 && prim()[0].dataset.act === 'dd-tick';
    await tap('.topbar [data-act="back"]');
    ok(ddOk && H() === '#today' && L() === hd, '끝 화면 "다음"으로 연 "단답 1문제 더" 답안지: 파란 "다 썼어요", 뒤로 → 오늘(방문 기록 그대로)');
    // 연습(테스트 탭) "단답 답안지 1문"의 "다 썼어요": "단답 1문제 더" 줄이 없는 날(토요일)도 달력 할 일 글은 "단답 1문제 더"(id 그대로가 아님)
    scene('2026-10-31T08:00:00', ST); pe.goTab('today'); await sleep(40); await show('#test'); await tap('[data-act="dd-rand"]');
    ok(/^#dandap\/[^/]+$/.test(H()) && prim().length === 1 && prim()[0].dataset.act === 'dd-tick', '연습에서 연 답안지: 파란 "다 썼어요" 하나(오늘 "단답 1문제 더")');
    await tap('[data-act="dd-tick"]');
    ok(pe.S().tk['x.dd2:' + SAT] === SAT && JSON.stringify(((pe.S().cal[SAT] || {}).x || {})['tk:x.dd2:' + SAT]) === '["todo","단답 1문제 더"]', '토요일에 친 "다 썼어요": 달력 할 일 "단답 1문제 더"');

    // 끝 화면 "또는:"은 다른 곳으로 가는 것만: 오늘 줄(용어 읽기)에서 연 가리며 외우기 끝 → 다음 줄이 그 세트 퀴즈면 "또는: 세트 퀴즈 5문"을 다시 쓰지 않음
    { const E7 = clone(EMPTY); ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'].forEach(x => { E7.sp[x].rev[7] = THU; }); E7.tk['cards:' + THU] = THU;   // 아침 칸의 세트 복습·카드 복습을 끝낸 날: 용어 읽기 다음 오늘 줄이 세트 퀴즈
      scene('2026-10-29T07:40:00', E7); }
    pe.goTab('today'); await sleep(40); pe.taskGo('set.read:' + THU); await sleep(60);
    click('[data-act="memo-set"]'); await sleep(60); while (pe.MEMO().i + 1 < pe.MEMO().items.length) { click('[data-act="memo-next"]'); await sleep(2); }
    click('[data-act="memo-finish"]'); await sleep(20);
    ok(T_(endP()) === '다음: 세트 퀴즈 5문 · 5분' && !link() && prim().length === 1, '용어를 다 본 가리며 외우기 끝: "다음: 세트 퀴즈 5문 · 5분" 하나(같은 곳인 "또는: 세트 퀴즈 5문" 없음)');
    pe.goTab('today'); await sleep(40);

    // 지난 세트 막대: 넘어가는 칸(쓰기·단답·목차)만 끝났으면 "넘어가는 필수 끝"("③ 숙제 3/5"와 어긋나지 않게), 필수를 모두 하면 "이 세트 필수 끝"
    scene('2026-10-31T08:00:00', ST); pe.goTab('today'); await sleep(40);
    { const D = '2026-10-27', P = pe.hwParts(D), h = pe.S().sp[D].hw, seg3 = () => T_(V$().querySelector('[data-act="set-tab"][data-t="tasks"]'));
      P.write.ks.forEach(k => h[k] = P.write.f); P.dd.ks.forEach(k => h[k] = 1); h.eo = P.eo.f; pe.invalidate(); await show('#set/' + D); click('[data-act="set-tab"][data-t="tasks"]'); await sleep(10);
      ok(/③ 숙제 3\/5/.test(seg3()) && T_(bar()) === '넘어가는 필수 끝 · 돌아가기', '지난 세트: 쓰기·단답·목차만 했으면 막대 "넘어가는 필수 끝 · 돌아가기"(③ 숙제 3/5)');
      P.say.ks.forEach(k => h[k] = P.say.f); h.sl = 1; pe.invalidate(); pe.render(); await sleep(10);
      ok(/③ 숙제 ✓/.test(seg3()) && T_(bar()) === '이 세트 필수 끝 · 돌아가기', '필수를 모두 하면 "이 세트 필수 끝 · 돌아가기"'); }

    // 접는 칸: 세트 퀴즈를 다 푼 뒤 열리는 용어 퀴즈·숙제 더 하기는 닫으면 다시 그려도 닫힌 채. 오늘 "숙제 나머지" 줄로 오면 더 하기를 다시 펼친다
    await show('#set/2026-10-26'); click('[data-act="set-tab"][data-t="quiz"]'); await sleep(10);
    { const gf = () => V$().querySelector('details.gqf'), o0 = gf().open; click('details.gqf > summary'); gf().open = false;
      click('[data-act="set-tab"][data-t="cards"]'); await sleep(10); click('[data-act="set-tab"][data-t="quiz"]'); await sleep(10);
      ok(o0 && !gf().open, '용어 퀴즈 접는 칸: 세트 퀴즈를 다 풀면 열려 있고, 닫으면 다시 그려도 닫힌 채'); }
    scene('2026-10-29T07:40:00', ST); pe.goTab('today'); await sleep(40);
    { const hx = () => V$().querySelector('details.hwext'), rest = pe.taskList(THU).find(x => x.id === 'hw.rest:' + THU);
      pe.taskGo(rest.id); await sleep(60); const o1 = !!hx() && hx().open; click('details.hwext > summary'); hx().open = false; pe.render(); await sleep(10); const o2 = hx().open;
      pe.goTab('today'); await sleep(40); pe.taskGo(rest.id); await sleep(60);
      ok(rest && o1 && !o2 && hx().open, '숙제 더 하기: "숙제 나머지" 줄로 오면 펼쳐 있고, 닫으면 다시 그려도 닫힌 채, 그 줄로 다시 오면 다시 펼침'); }
    pe.goTab('today'); await sleep(40);

    // 스크롤: "다음: 용어 읽기"로 펼친 용어는 머리가 위쪽 막대 바로 아래(가운데 맞추기는 긴 설명에서 제목이 화면 위로 나감), 세트 퀴즈 카드는 가운데로
    { const calls = [], si0 = w.HTMLElement.prototype.scrollIntoView, st0 = w.scrollTo;
      w.HTMLElement.prototype.scrollIntoView = function (o) { calls.push(['into', this.className, o && o.block]); }; w.scrollTo = (x, y) => { calls.push(['to', y]); };
      scene('2026-10-29T07:40:00', EMPTY); pe.goTab('today'); await sleep(40); await show('#set/' + THU); click('[data-act="set-tab"][data-t="cards"]'); await sleep(10); calls.length = 0; await tap('.nextbar .btn');
      ok(V$().querySelector('.acc.open') && calls.some(c => c[0] === 'to') && !calls.some(c => c[0] === 'into'), '"다음: 용어 읽기" → 펼친 용어를 위쪽 막대 아래로(가운데로 맞추지 않음)');
      for (let i = 0; i < 10; i++) pe.S().sp[THU].read[i] = 1; pe.render(); calls.length = 0; await tap('.nextbar .btn');
      ok(calls.some(c => c[0] === 'into' && /qcard/.test(c[1]) && c[2] === 'center'), '"다음: 세트 퀴즈" → 퀴즈 카드는 가운데로');
      w.HTMLElement.prototype.scrollIntoView = si0; w.scrollTo = st0; pe.goTab('today'); await sleep(40); }
  }

  // 40. 모의고사 단계(토 08:00, 시계 고정): 오늘 "1교시 시작" → 모의 화면 아래 막대가 하나뿐인 파란 버튼(1교시 시작 · 타이머 100분 → 1교시 다 썼어요 → 2교시 시작 · 타이머 50분 → 2교시 다 썼어요 → 채점 받았어요 → 다음 오늘 줄).
  //     타이머는 이 화면 안(.tline), 도는 동안 집중 모드, 0이 되면 시간 끝 창(다 썼어요 · 5분 더 · 닫기), 다른 화면에서는 알림과 위쪽 알약. 채점·열어보기는 다 쓸 때까지 접힌 채 늘 있음
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), H = () => w.location.hash, L = () => w.history.length, tap = async (sel, root) => { click(sel, root); await sleep(60); };
    const bar = () => V$().querySelector('.nextbar .btn'), mw = () => d.querySelector('#modal-wrap'), pill = () => d.querySelector('#tpill-wrap .tpill'), toastT = () => d.querySelector('#toast').textContent;
    const TM = pe.TM(), MD = '2026-10-31', MH = '#mock/' + MD, pr = () => pe.S().mockp[MD] || {}, tick = async iso => { at(iso); await sleep(320); };
    const steps = () => [...V$().querySelectorAll('.stepper li')].map(li => (li.classList.contains('done') ? '✓' : li.classList.contains('cur') ? '●' : '○') + T_(li.querySelector('span'))).join(' ');
    scene('2026-10-31T08:00:00', ST); pe.goTab('today'); await sleep(40); await show('#today'); const hl = L();
    await tap('.prow.now .btn');
    const gf = V$().querySelector('details.mgrade'), rf = V$().querySelector('details.mrev'), p2f = V$().querySelector('details.mpart');
    ok(H() === MH && steps() === '●1교시 ○2교시 ○채점' && V$().querySelectorAll('.mcur .paper-q').length === 13 && p2f && !p2f.open && p2f.querySelectorAll('.paper-q').length === 2 && /쉬는 시간 · 답안 사진 찍기/.test(V$().textContent),
      '40. 오늘 "1교시 시작" → 모의 화면: 단계 ①1교시 ②2교시 ③채점, 지금 1교시 13문, 2교시는 접은 칸(2문), 쉬는 시간 줄');
    ok(gf && !gf.open && gf.querySelector('[data-act="copy-mock"]') && gf.querySelector('[data-act="mock-score"][data-k="p2"]') && rf && !rf.open && rf.querySelector('[data-act="mock-reveal"]'), '40. 채점·다 쓴 뒤 열어보기는 접힌 채(채점 요청 복사·점수 칸·열기 버튼은 그 안에 있음)');
    ok(prim().length === 1 && T_(bar()) === '1교시 시작 · 타이머 100분' && bar().dataset.act === 'mock-start' && !TM.running, '40. 파란 버튼은 아래 막대 "1교시 시작 · 타이머 100분" 하나');
    await tap('.nextbar [data-act="mock-start"]');
    ok(H() === MH && TM.preset === 'p1' && TM.running && TM.ctx && TM.ctx.kind === 'mock' && TM.ctx.D === MD && TM.ctx.pk === 'p1' && d.body.classList.contains('focus') && T_(d.querySelector('.topbar .back')) === '닫기', '40. 1교시 시작 → 이 화면에 머묾, 1교시 100분 타이머, 집중 모드(위쪽 "닫기")');
    ok(V$().querySelector('.mcur .tline[data-timer="p1"]') && !pill() && T_(bar()) === '1교시 다 썼어요' && bar().dataset.act === 'mock-part' && prim().length === 1, '40. 화면 안 타이머(알약 없음), 아래 막대 "1교시 다 썼어요"');
    await tick('2026-10-31T08:30:00'); const tl = V$().querySelector('.tline');
    ok(TM.remain === 4200 && T_(tl.querySelector('.tlt')) === '70:00' && T_(tl.querySelector('.tlp')) === '4/10문 · 10:00 남음' && T_(tl.querySelector('.tlp .nw')) === '10:00 남음' && T_(tl.querySelector('button')) === '일시정지', '40. 30분 뒤: 화면 안 타이머 70:00 · "4/10문 · 10:00 남음"(남은 시간은 한 덩이 .nw, 다시 그리지 않고 글자만)');
    await tick('2026-10-31T09:40:00'); const sh = mw();
    ok(TM.remain === 0 && !TM.running && TM.ended && TM.ended.ctx.pk === 'p1' && /시간 끝 · 1교시 단답/.test(sh.textContent) && sh.querySelectorAll('.btn:not(.sec):not(.ghost)').length === 1 && T_(sh.querySelector('.btn:not(.sec)')) === '다 썼어요' && sh.querySelector('[data-act="timer-more"]') && sh.querySelector('[data-act="sheet-close"]') && !d.body.classList.contains('focus'),
      '40. 이 화면에서 0이 되면 시간 끝 창(파란 "다 썼어요" · 5분 더 · 닫기), 집중 모드는 끝');
    click('#modal-wrap [data-act="timer-more"]'); await sleep(20);
    ok(!mw().innerHTML && TM.running && TM.remain === 300 && !TM.ended && d.body.classList.contains('focus'), '40. 5분 더 → 5분 타이머가 이어서 돌고 창은 닫힘');
    await tick('2026-10-31T09:45:00');
    ok(/시간 끝 · 1교시 단답/.test(mw().textContent), '40. 5분이 끝나면 다시 시간 끝 창');
    click('#modal-wrap [data-act="mock-part"]'); await sleep(20);
    ok(pr().p1 === true && !mw().innerHTML && !TM.running && !TM.ctx && !TM.ended && !pill() && steps() === '✓1교시 ●2교시 ○채점' && V$().querySelector('.mdone [data-act="mock-undo"][data-k="p1"]') && T_(bar()) === '2교시 시작 · 타이머 50분' && H() === MH,
      '40. 창의 "다 썼어요" → S.mockp[D].p1, 1교시 한 줄(되돌리기), 타이머는 멈춤, 아래 막대 "2교시 시작 · 타이머 50분"');
    ok(JSON.stringify(((pe.S().cal[SAT] || {}).x || {})['mock:' + MD + ':p1']) === '["mock","10월 31일 모의고사 1교시 다 씀"]', '40. 달력: 10월 31일 모의고사 1교시 다 씀');
    click('.mdone [data-act="mock-undo"]'); await sleep(10);
    ok(!('p1' in pr()) && steps() === '●1교시 ○2교시 ○채점' && T_(bar()) === '1교시 시작 · 타이머 100분' && !((pe.S().cal[SAT] || {}).x || {})['mock:' + MD + ':p1'], '40. 되돌리기 → p1 지움(달력도), 다시 1교시 시작');
    click('.mnot [data-act="mock-part"]'); await sleep(10);
    ok(pr().p1 === true && T_(bar()) === '2교시 시작 · 타이머 50분' && !TM.running, '40. 타이머 없이 다 썼어요 → p1 그대로 적음');
    await tap('.nextbar [data-act="mock-start"]');
    await sleep(300);
    ok(TM.preset === 'custom' && TM.total === 3000 && TM.parts === 2 && TM.running && TM.ctx.pk === 'p2' && V$().querySelector('.mcur .tline[data-timer="custom"]') && T_(bar()) === '2교시 다 썼어요' && /지금: 2교시 논술 2문/.test(V$().textContent), '40. 2교시 시작 → 문제당 25분 × 2문 = 50분 타이머(문제마다 알림), 아래 막대 "2교시 다 썼어요"');
    await tick('2026-10-31T10:15:00');
    ok(/2번째 문제 시간/.test(toastT()) && T_(V$().querySelector('.tline .tlp')) === '2/2문 · 20:00 남음', '40. 25분이 지나면 "2번째 문제 시간"(30분 뒤 "2/2문 · 20:00 남음")');
    await tap('.nextbar [data-act="mock-part"]');
    const gf2 = V$().querySelector('details.mgrade'), rf2 = V$().querySelector('details.mrev');
    ok(pr().p2 === true && !TM.running && !TM.ctx && steps() === '✓1교시 ✓2교시 ●채점' && gf2.open && !rf2.open && rf2.querySelector('[data-act="mock-reveal"]') && gf2.querySelector('[data-act="copy-mock"]') && T_(bar()) === '채점 받았어요' && bar().dataset.act === 'mock-graded' && prim().length === 1 && H() === MH, '40. 2교시 다 썼어요 → 채점 단계(채점 칸 펼침, 열어보기는 접힌 채 그 안에 열기 버튼), 아래 막대 "채점 받았어요"');
    const si = V$().querySelector('[data-act="mock-score"][data-k="p1"]'); si.value = '62'; si.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    ok(pr().sc && pr().sc.p1 === 62, '40. 점수 칸 1교시 62 → S.mockp[D].sc.p1');
    await tap('.nextbar [data-act="mock-graded"]');
    ok(pr().g === SAT && steps() === '✓1교시 ✓2교시 ✓채점' && V$().querySelector('details.mrev').open && V$().querySelector('details.mrev [data-act="mock-reveal"]') && /채점 받았어요 ✓ · 10\/31/.test(V$().querySelector('.mgd').textContent) && /^✓ 끝 · 다음: 밀린 세트 10\/28\(수\)/.test(T_(bar())) && prim().length === 1 && H() === MH && L() === hl,
      '40. 채점 받았어요 → S.mockp[D].g, 열어보기 칸 펼침(답은 열기를 눌러야), 아래 막대 "✓ 끝 · 다음: 밀린 세트 …"(모의고사 한 번을 이 화면에서 끝까지, 방문 기록 그대로)');
    await tap('.nextbar .btn');
    ok(H() === '#set/2026-10-28' && L() === hl && pe.FLOW() && /^late:/.test(pe.FLOW().id), '40. "다음" → 밀린 세트(오늘 줄 이어 감, 방문 기록 그대로)');
    // 가리며 외우기 화면에서 0이 되면 창은 띄우지 않고 알림과 "⏱ 시간 끝 · 1교시" 알약. 알약 → 그 모의 화면에서 시간 끝 창. 다음 타이머를 시작하면 지움
    scene('2026-10-31T11:00:00', ST); pe.goTab('today'); await sleep(40); await show(MH); await tap('.nextbar [data-act="mock-start"]');
    await tap('.topbar [data-act="back"]');
    ok(H() === '#practice' && TM.running && pill() && T_(pill()) === '⏱ 100:00' && !d.body.classList.contains('focus'), '40. 닫기 → 연습(모의고사의 위 화면), 타이머는 계속(위쪽 알약 ⏱ 100:00)');
    await tap('#tpill-wrap .tpill');
    ok(H() === MH && V$().querySelector('.tline[data-timer="p1"]') && !pill() && d.body.classList.contains('focus'), '40. 알약 → 그 모의 화면(화면 안 타이머·집중 모드)');
    pe.go('set/2026-10-30'); await sleep(60); click('[data-act="set-tab"][data-t="cards"]'); await sleep(10); await tap('[data-act="memo-set"]');
    ok(H() === '#memo' && TM.running && pill() && /⏱ 100:00|⏱ 99:5\d/.test(T_(pill())), '40. 1교시 타이머를 켠 채 가리며 외우기 → 위쪽 알약');
    await tick('2026-10-31T12:40:00');
    ok(H() === '#memo' && !mw().innerHTML && TM.ended && /1교시 시간이 끝났어요/.test(toastT()) && pill() && T_(pill()) === '⏱ 시간 끝 · 1교시', '40. 외우기 화면에서 0: 창 없음, 알림 "1교시 시간이 끝났어요", 알약 "⏱ 시간 끝 · 1교시"');
    await tap('#tpill-wrap .tpill');
    ok(H() === MH && /시간 끝 · 1교시 단답/.test(mw().textContent) && !pill(), '40. 알약 → 그 모의 화면에서 시간 끝 창');
    click('#modal-wrap [data-act="sheet-close"]'); await sleep(10);
    ok(!mw().innerHTML && T_(bar()) === '1교시 다 썼어요' && T_(V$().querySelector('.tline .tlp')) === '시간이 끝났어요' && V$().querySelector('.tline [data-act="timer-more"]'), '40. 닫기 → 아래 막대 "1교시 다 썼어요", 화면 안 타이머 "시간이 끝났어요 · 5분 더"');
    pe.render(); await sleep(10);
    ok(!mw().innerHTML, '40. 창은 한 번만(다시 그려도 다시 뜨지 않음)');
    pe.goTab('today'); await sleep(40);
    ok(pill() && T_(pill()) === '⏱ 시간 끝 · 1교시', '40. 다른 화면에서는 적을 때까지 "⏱ 시간 끝 · 1교시"');
    // 세트 ④ 논술 25분(화면 안 타이머): 시작하면 끝난 모의 타이머는 지움. 손글씨로 다 썼어요를 치면 그 타이머는 멈춤
    pe.go('set/2026-10-30'); await sleep(60); click('[data-act="set-tab"][data-t="essay"]'); await sleep(10);
    await tap('[data-act="tl-start"][data-p="one2"]');
    ok(TM.preset === 'one2' && TM.running && !TM.ended && TM.ctx.kind === 'essay' && TM.ctx.D === '2026-10-30' && V$().querySelector('.tline[data-timer="one2"]') && !V$().querySelector('[data-act="tl-start"]') && !pill(), '40. ④ 타이머 25분 → 그 화면 안 타이머(알약 없음), 끝난 모의 타이머는 지움');
    await tick('2026-10-31T12:41:00');
    ok(T_(V$().querySelector('.tline .tlt')) === '24:00' && T_(V$().querySelector('.tline .tlp')) === '논술 1문 25분', '40. ④ 화면 안 타이머 24:00 · 논술 1문 25분');
    // T9: 다른 타이머가 도는 동안 모의 "1교시 시작"도 묻고, 취소하면 그대로(그 화면 그대로)
    const rc = w.confirm, asked = []; w.confirm = m => { asked.push(m); return false; };
    await show(MH); await tap('.nextbar [data-act="mock-start"]');
    ok(asked.length === 1 && asked[0] === '돌고 있는 논술 1문 타이머(남은 24:00)를 멈추고 1교시 단답 100분으로 바꿀까요?' && TM.preset === 'one2' && TM.running && H() === MH && T_(bar()) === '1교시 시작 · 타이머 100분', '40. T9: 논술 1문 타이머가 도는 중 "1교시 시작" → 묻고, 취소하면 그대로');
    w.confirm = rc; pe.go('set/2026-10-30'); await sleep(60); click('[data-act="set-tab"][data-t="essay"]'); await sleep(10);
    click('[data-act="set-essay-done"]'); await sleep(10);
    ok(pe.S().sp['2026-10-30'].essay.done && !TM.running && !TM.ctx && !V$().querySelector('.tline') && V$().querySelector('[data-act="tl-start"][data-p="one2"]'), '40. 손글씨로 다 썼어요 → 그 25분 타이머는 멈추고 시작 버튼으로');
    // 자리 없는 타이머(타이머 화면): 다른 화면에서 끝나면 "⏱ 시간 끝" 알약 → 타이머 화면 "시간이 끝났어요 · 돌아가기", 본 뒤에는 알약 없음
    await show('#timer'); click('[data-act="timer-preset"][data-p="one1"]'); await sleep(10); click('[data-act="timer-toggle"]'); await sleep(10); pe.goTab('more'); await sleep(40);
    await tick('2026-10-31T12:52:00');
    ok(pill() && T_(pill()) === '⏱ 시간 끝' && /시간 종료/.test(toastT()), '40. 타이머 화면 타이머가 다른 화면에서 끝나면 알림과 "⏱ 시간 끝" 알약');
    await tap('#tpill-wrap .tpill');
    ok(H() === '#timer' && /시간이 끝났어요/.test(V$().textContent) && V$().querySelector('[data-act="back"]') && !pill(), '40. 알약 → 타이머 화면 "시간이 끝났어요 · 돌아가기"');
    pe.goTab('today'); await sleep(40);
    ok(!pill(), '40. 본 뒤에는 알약 없음');
    await show('#timer'); click('[data-act="timer-reset"]'); click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10); pe.goTab('today'); await sleep(40);
  }
  // 41. 숙제 단답 카드의 타이머 10분은 카드 안 타이머, "다 썼어요 · 단답 1문"을 치면 멈춤
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), TM = pe.TM();
    scene('2026-10-29T07:40:00', ST); await show('#today'); click('#view [data-task="hw.dd:2026-10-29"]'); await sleep(60);
    click('.hw.focus [data-act="tl-start"][data-p="one1"]'); await sleep(20);
    ok(TM.preset === 'one1' && TM.running && TM.ctx.kind === 'dd' && V$().querySelector('.hw.focus .steps3 .tline[data-timer="one1"]') && !d.querySelector('#tpill-wrap .tpill'), '41. 펼친 단답 카드 ② 타이머 10분 → 카드 안 타이머(알약 없음)');
    click('.nextbar [data-act="hw-bulk"]'); await sleep(20);
    ok(!TM.running && !TM.ctx && !V$().querySelector('.tline'), '41. "다 썼어요 · 단답 1문" → 그 10분 타이머는 멈춤');
    await show('#timer'); click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10); pe.goTab('today'); await sleep(40);
  }

  // 42. 특별한 날 화면(시계 고정): 시행계획 공고·원서접수 날짜 확인 줄(동그라미), 원서접수 핀(7일 전 주황 · 3일 안 빨강 · 접수했어요),
  //     공휴일 머리, 월요일 안내와 지난주 기록, 단계 시작 안내, 시험 전 3일, 시험 날 카드와 이번 주 체크, 48시간 복기 핀, 달력 앞으로 점, 시험 일정 월요일 경고
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), h1 = () => T_(V$().querySelector('.ltitle h1')), mw = () => d.querySelector('#modal-wrap');
    const X = clone(HOL); X.sets['2027-01-04'] = cloneSet('2027-01-04', 11, refsFor(2)); X.sets['2027-01-27'] = cloneSet('2027-01-27', 14, refsFor(2));
    // 시행계획 공고 확인(2026-11-20~12-31, 시작일과 무관): 이번 주 줄은 시험 일정으로, 동그라미는 확인했어요(친 주에는 ✓로 아래에)
    scene('2026-11-20T08:00:00', BLANK); await show('#week');
    const qn = () => V$().querySelector('#ql-notice');
    ok(qn() && qn().classList.contains('two') && /큐넷 2027 시행계획 공고 확인/.test(T_(qn())) && /시험 일정에서 확인/.test(T_(qn())) && !qn().querySelector('.tkc.on') && prim().length === 1 && !/공고/.test(T_(prim()[0])), '42. 11/20 이번 주: "큐넷 2027 시행계획 공고 확인" 줄(동그라미), 파란 버튼은 그 줄이 아님');
    { const css = fs.readFileSync(path.join(SITE, 'styles.css'), 'utf8'), kids = [...qn().children];   // 4-5(CSS만): 이 줄의 화살표(›)는 숨기고 동그라미(○)와 글 사이 12px 이상
      ok(kids.length === 2 && kids[0].matches('.qbody[data-act]') && kids[0].querySelector('.chev') && kids[1].matches('.tkc[data-act="tk"][data-id="notice:2027"]') && /(^|\n)\.qline\.two \.chev\{display:none\}/.test(css) && /(^|\n)\.qline\.two \.tkc\{margin:9px 14px 0 8px\}/.test(css),
        '42. 4-5. 11/20 공고 줄: 줄 가운데(시험 일정으로)와 동그라미(확인했어요) 두 칸, 줄의 화살표는 CSS로 숨기고 동그라미 앞 여백 8px(틈 4px와 합쳐 12px, "›○"가 한 글자처럼 붙지 않음)'); }
    await show('#today'); ok(/큐넷 2027 시행계획 공고 확인/.test(T_(V$().querySelector('.wksec'))), '42. 11/20 오늘의 이번 주 칸에도 공고 확인 줄');
    await show('#week'); click('#ql-notice .tkc'); await sleep(10);
    const L1 = [...V$().querySelectorAll('.sec .qline')];
    ok(pe.S().tk['notice:2027'] === '2026-11-20' && qn().classList.contains('done') && qn().querySelector('.tkc.on') && L1[L1.length - 1] === qn(), '42. 동그라미 → 확인했어요(S.tk notice:2027), 줄은 ✓로 맨 아래');
    await show('#today'); ok(!/시행계획 공고/.test(T_(V$().querySelector('.wksec'))), '42. 확인한 공고 줄은 오늘의 이번 주 칸에서 빠짐');
    await show('#week'); click('#ql-notice .tkc'); await sleep(10); ok(!pe.S().tk['notice:2027'] && !qn().classList.contains('done'), '42. 다시 누르면 되돌림');
    click('#ql-notice .qbody'); await sleep(60);
    const ck = () => V$().querySelector('.schk');
    ok(w.location.hash === '#schedule' && ck() && /큐넷 2027 시행계획 공고 확인/.test(T_(ck())) && ck().querySelector('[data-act="tk"][data-id="notice:2027"]'), '42. 줄을 누르면 시험 일정(맨 위에 공고 확인과 "확인했어요")');
    click('.schk [data-act="tk"][data-id="notice:2027"]'); await sleep(10);
    ok(pe.S().tk['notice:2027'] === '2026-11-20' && /✓ 확인했어요/.test(T_(ck())), '42. 시험 일정에서 확인했어요');
    at('2026-11-19T08:00:00'); delete pe.S().tk['notice:2027']; await show('#week'); ok(!qn(), '42. 11/19에는 공고 확인 줄 없음');
    { const st = clone(BLANK); st.settings.start = '2026-11-02'; scene('2026-11-20T08:00:00', st); await show('#week'); ok(qn() && /큐넷 2027 시행계획 공고 확인/.test(T_(qn())), '42. 시작일 11/02도 11/20에 공고 확인 줄'); }
    // 원서접수: 12/8~12/21 이번 주 줄 "원서접수 날짜 확인 · 12/29 무렵" → 12/22부터 오늘 맨 위 핀(D-7 주황), 12/26부터 3일 안(빨강, 배지와 같은 날)
    scene('2026-12-21T08:00:00', BLANK, HOL); await show('#week');
    const qa = () => V$().querySelector('#ql-applychk');
    ok(qa() && /원서접수 날짜 확인 · 12\/29 무렵/.test(T_(qa())) && qa().querySelector('[data-act="tk"][data-id="applychk:141"]'), '42. 12/21 이번 주: "원서접수 날짜 확인 · 12/29 무렵"(동그라미)');
    await show('#today'); ok(!V$().querySelector('.pin'), '42. 12/21 오늘: 핀 없음(7일 전부터)');
    at('2026-12-22T07:40:00'); await show('#today');
    const pin = () => V$().querySelector('.pin'), pdd = () => V$().querySelector('.pin .pdd');
    ok(pin() && T_(pin().querySelector('b')) === '큐넷 원서접수 · 제141회' && /12\/29\(화\)~1\/1\(금\) 예상 · 첫날 오전 10시/.test(T_(pin())) && T_(pdd()) === 'D-7' && !pdd().classList.contains('due'), '42. 12/22 오늘 맨 위 핀: 큐넷 원서접수 · 제141회 / 12/29(화)~1/1(금) 예상 · 첫날 오전 10시 / D-7(주황)');
    ok([...pin().querySelectorAll('.btn')].map(T_).join() === '접수했어요,날짜 확인·고치기' && [...pin().querySelectorAll('.btn')].every(b => b.classList.contains('sec')) && prim().length === 1 && !prim()[0].closest('.pin'), '42. 핀 버튼은 보조 두 개(접수했어요 · 날짜 확인·고치기), 파란 버튼은 목록 쪽 하나');
    await show('#week'); ok(!qa(), '42. 핀이 뜨면 날짜 확인 줄은 없음');
    at('2026-12-25T10:00:00'); await show('#today'); const p25 = T_(pdd()), d25 = pdd().classList.contains('due'), n25 = pe.navBadgeN('2026-12-25');
    at('2026-12-26T09:00:00'); await show('#today');
    ok(p25 === 'D-4' && !d25 && n25 === 0 && T_(pdd()) === 'D-3' && pdd().classList.contains('due') && pe.navBadgeN('2026-12-26') === 1, '42. 12/25 D-4 주황(배지 없음) → 12/26 D-3 빨강(배지 1)');
    click('.pin [data-act="tk"]'); await sleep(10);
    ok(pe.S().tk['apply:141'] === '2026-12-26' && pin().classList.contains('done') && /✓ 접수했어요/.test(T_(pin())) && !pin().querySelector('.btn') && pe.navBadgeN('2026-12-26') === 0, '42. 접수했어요 → 핀은 한 줄 "✓ 접수했어요", 배지 없음');
    // 공휴일: 머리 "12월 25일 금요일 · 성탄절", 공부 시간 일요일·공휴일(240), 따라잡기 블록
    scene('2026-12-25T10:00:00', BLANK, HOL); await show('#today');
    ok(h1() === '12월 25일 금요일 · 성탄절' && pe.budgetOf('2026-12-25') === 240 && /오늘 시간 4시간/.test(T_(V$().querySelector('.capb'))) && [...V$().querySelectorAll('.blk .bn')].some(b => /따라잡기/.test(T_(b))), `42. 12/25: 머리 "${h1()}", 오늘 시간 4시간(240), 따라잡기`);
    await show('#week'); ok([...V$().querySelectorAll('.drow')].some(r => /금 12\/25/.test(T_(r)) && /성탄절/.test(T_(r))), '42. 이번 주 날마다에도 성탄절');
    // 월요일 안내(화요일까지, ×로 지움)와 지난주 기록 창
    scene('2026-11-02T07:00:00', ST); await show('#today');
    const mon = () => V$().querySelector('.notice.mon');
    ok(mon() && T_(mon().querySelector('b')) === `2주차 시작 · ${pe.weekObj(2).t}` && /넘어온 것: 지난주 세트 3개\(권장\) · 지난주 모의고사/.test(T_(mon())) && mon().querySelector('.btn.ghost[data-act="wk-last"]') && !/%/.test(T_(mon())), `42. 월요일 안내: "${mon() && T_(mon().querySelector('b'))}" / 넘어온 것(이름만) / 지난주 기록(점수는 띠로 띄우지 않음)`);
    click('[data-act="wk-last"]'); await sleep(10);
    const lw = pe.S().wk['2026-10-26'];
    ok(lw && lw.at && new RegExp(`지난주\\(1주차\\) ${lw.p}%`).test(T_(mw())) && /세트 핵심 \d+\/25/.test(T_(mw())) && /넘어온 것/.test(T_(mw())) && /놓아준 것/.test(T_(mw())) && /놓아준 것은 빚이 아니에요/.test(T_(mw())), `42. 지난주 기록 창: 지난주(1주차) ${lw && lw.p}%, 부분, 넘어온 것, 놓아준 것`);
    click('#modal-wrap [data-act="sheet-close"]'); await sleep(10);
    at('2026-11-03T07:00:00'); await show('#today'); const tue = !!mon();
    click('.notice.mon .nx'); await sleep(10);
    ok(tue && pe.S().tk['wkline:2026-11-02'] === '2026-11-03' && !mon(), '42. 화요일까지 보이고 ×로 지움(S.tk wkline:주)');
    scene('2026-11-04T07:00:00', ST); await show('#today'); ok(!mon() && !pe.monNotice('2026-11-04'), '42. 수요일에는 월요일 안내 없음');
    // 단계 시작 월요일(2027-01-04, 11주차): 월요일 안내 칸에 단계 안내를 함께(×는 둘 다), 수요일에는 단계 안내만
    scene('2027-01-04T07:00:00', BLANK, X); await show('#today');
    ok(mon() && T_(mon().querySelector('b')) === `11주차 시작 · ${pe.weekObj(11).t}` && T_(mon()).includes(w.PE_PHASE_NOTE[2]) && V$().querySelectorAll('.notice').length === 1, '42. 2027-01-04: 월요일 안내 + 2단계 시작 안내(한 칸)');
    click('.notice.mon .nx'); await sleep(10);
    ok(pe.S().tk['wkline:2027-01-04'] && pe.S().tk['phase:2'] && !V$().querySelector('.notice'), '42. ×로 둘 다 지움');
    scene('2027-01-06T07:00:00', BLANK, X); await show('#today');
    ok(!mon() && V$().querySelector('.notice') && T_(V$().querySelector('.notice')).includes(w.PE_PHASE_NOTE[2]), '42. 수요일: 단계 안내만');
    { const st = clone(BLANK); st.settings.start = '2026-11-02'; scene('2027-02-22T07:00:00', st, X); await show('#today');
      ok(pe.weekIndex('2027-02-22') === 16 && [...V$().querySelectorAll('.notice')].some(n => T_(n).includes(w.PE_PHASE_NOTE[3])), '42. 시작 11/02: 2027-02-22(16주차)에 3단계 시작 안내'); }
    // 시험 전 3일(2027-01-27): 읽기·퀴즈만(숙제 줄 없음), 머리 줄 "수면 7시간"
    scene('2027-01-27T07:00:00', BLANK, X); await show('#today');
    ok([...V$().querySelectorAll('.dsx')].some(x => T_(x) === '시험 전 3일 · 새로 배우지 않아요 · 수면 7시간') && V$().querySelector('[data-task="set.read:2027-01-27"]') && !V$().querySelector('[data-task^="hw."]') && !V$().querySelector('[data-task^="essay:"]'), '42. 2027-01-27 시험 전 3일: 머리 줄과 읽기·퀴즈만(숙제 줄 없음)');
    await show('#week'); ok([...V$().querySelectorAll('.drow')].some(r => /수 1\/27/.test(T_(r)) && /시험 전 3일/.test(T_(r))), '42. 이번 주 날마다: 시험 전 3일');
    // 시험 날(2027-01-30): 머리 "오늘 제141회 시험(실전 응시)", 시험 카드(체크리스트 + 응시했어요), 점수 없이 이번 주 체크
    scene('2027-01-30T08:00:00', BLANK, X); await show('#today');
    const ex = () => V$().querySelector('.dcard.exam');
    ok(h1() === '오늘 제141회 시험(실전 응시)' && ex() && /문제 고르기 3분 → 시간 엄수 → 공란 금지/.test(T_(ex())) && /시험 당일 — 교시마다 시간표대로/.test(T_(ex())) && prim().length === 1 && T_(prim()[0]) === '응시했어요' && prim()[0].closest('.dcard.exam'), `42. 시험 날 오늘: 머리 "${h1()}", 시험 카드, 파란 버튼 "응시했어요" 하나`);
    ok(!V$().querySelector('.daysum') && !V$().querySelector('.blk') && !V$().querySelector('[data-act="plan-reset"]') && /시험 주 · 점수 대신 체크/.test(T_(V$().querySelector('.wksec'))) && !/다 하면/.test(T_(V$())), '42. 시험 날: 오늘 시간·블록·다시 짜기·점수 없음(이번 주는 체크)');
    await show('#week');
    ok(/시험 주 · 점수 대신 체크/.test(T_(V$().querySelector('.score'))) && /응시 ○ · 48시간 복기 ○ · 준비물 ○/.test(T_(V$().querySelector('.score'))) && !/다 하면/.test(T_(V$())) && prim().length === 1 && T_(prim()[0]) === '응시했어요', '42. 시험 날 이번 주: 점수 대신 체크(응시 ○ · 48시간 복기 ○ · 준비물 ○), 파란 버튼 "응시했어요"');
    await show('#today'); click('.dcard.exam .btn'); await sleep(10);
    ok(pe.S().tk['ex:2027-01-30:a'] === '2027-01-30' && /✓ 응시했어요/.test(T_(ex())) && !prim().length && ((pe.S().cal['2027-01-30'] || {}).x || {})['tk:ex:2027-01-30:a'][1] === '제141회 시험 응시', '42. 응시했어요 → ✓, 달력에 "제141회 시험 응시"');
    await show('#week'); ok(/응시 ✓/.test(T_(V$().querySelector('.score'))) && [...V$().querySelectorAll('.drow')].some(r => /토 1\/30/.test(T_(r)) && /제141회 시험\(실전 응시\) · 응시 ✓/.test(T_(r))), '42. 이번 주: 응시 ✓(날마다에도)');
    // 시험 다음 날(2027-01-31): 48시간 복기 핀(빨강 D-1), 다음 날 "오늘까지", 그다음 날 없음
    scene('2027-01-31T09:00:00', BLANK); await show('#today');
    ok(pin() && T_(pin().querySelector('b')) === '제141회 복기: 문제 모두 적기 → 4문제 다시 써서 채점(48시간 안)' && T_(pdd()) === 'D-1' && pdd().classList.contains('due') && T_(pin().querySelector('.btn.sec')) === '다 했어요', '42. 2027-01-31: 48시간 복기 핀(D-1 빨강, 다 했어요)');
    at('2027-02-01T09:00:00'); await show('#today'); const r1 = T_(pdd()); at('2027-02-02T09:00:00'); await show('#today');
    ok(r1 === '오늘까지' && !pin(), '42. 2/1 오늘까지, 2/2 핀 없음');
    // 학습 달력: 앞으로 할 일(이번 주 남은 날만) 빈 동그라미 — 토 주간 모의고사(주황), 일 주간 마감(보라), 세트 복습 기한(회색)
    scene('2026-10-29T07:40:00', ST);
    { const F = pe.calFwd('2026-10-29'), ks = Object.keys(F).sort();
      ok(ks.every(x => x > '2026-10-29' && x <= '2026-11-01') && F['2026-10-31'] && F['2026-10-31'].mock === 1 && F['2026-11-01'] && F['2026-11-01'].close === 1 && F['2026-10-30'] && F['2026-10-30'].rev >= 1, `42. 앞으로 할 일(목 10/29): ${ks.map(k => k.slice(5) + ':' + Object.keys(F[k]).join('+')).join(' ')}`);
      await show('#cal'); if (V$().querySelector('[data-act="cal-today"]')) { click('[data-act="cal-today"]'); await sleep(10); }
      const fw = () => [...V$().querySelectorAll('.cd .dots i.fwd')].map(i => i.closest('.cd').dataset.d);
      const oct = fw(); click('[data-act="cal-mon"][data-v="1"]'); await sleep(10); const nov = fw();
      ok(oct.every(x => x === '2026-10-30' || x === '2026-10-31') && V$().querySelector('.cd[data-d="2026-11-01"] .fwd.k-todo') && nov.every(x => x === '2026-11-01'), `42. 달력: 앞으로 점은 이번 주 남은 날에만(10월 ${[...new Set(oct)]} · 11월 ${[...new Set(nov)]})`);
      click('[data-act="cal-today"]'); await sleep(10);
      ok(V$().querySelector('.cd[data-d="2026-10-31"] .fwd.k-mock') && !V$().querySelector('.cd[data-d="2026-10-29"] .fwd') && /앞으로\(이번 주\)/.test(T_(V$().querySelector('.callg'))), '42. 토요일 주황(주간 모의고사), 오늘 칸에는 없음, 색 설명 "앞으로(이번 주)"');
      click('[data-act="cal-day"][data-d="2026-10-31"]'); await sleep(10);
      ok(/앞으로\(이번 주\): 주간 모의고사/.test(T_(mw())), '42. 그날 창: 앞으로(이번 주): 주간 모의고사');
      click('[data-act="cal-close"]'); await sleep(10);
      pe.S().tk['report:2026-10-26'] = '2026-10-29'; ok(!(pe.calFwd('2026-10-29')['2026-11-01'] || {}).close, '42. 리포트를 내면 일요일 보라 점 없음'); }
    // 시험 일정: 시작일이 월요일이 아니면 경고 대신 첫 주 안내 한 줄(어느 요일에 시작해도 된다, 3.1.1)
    scene('2026-10-29T07:40:00', ST); await show('#schedule');
    const fw = () => [...V$().querySelectorAll('.note')].find(n => /^첫 주\(준비 주\)/.test(T_(n))), warn = () => V$().querySelector('.note.warn');
    ok(!fw() && !warn(), '42. 시작일 10/19(월): 첫 주 안내·경고 없음');
    { const i = V$().querySelector('#schStart'); i.value = '2026-10-21'; i.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10); }
    ok(fw() && !warn() && T_(fw()) === '첫 주(준비 주)는 10/21(수)~10/25(일) 5일이고, 10/26(월)부터 1주차예요. 한 주는 늘 월요일부터 일요일까지예요(토요일 모의고사, 일요일 마감).', `42. 10/21(수)로 바꾸면 경고 없이 첫 주 안내 "${T_(fw())}"`);
    click('[data-act="sch-cancel"]'); await sleep(10); ok(!fw(), '42. 취소하면 첫 주 안내 없음');
    await go('#today');
  }

  // 43. 점검 고침(오늘 몫·이번 주, 시계 고정): 7·14·30일 차 세트 복습과 카드 복습이 오늘 몫에(넘침 단계로 접거나 놓아주지 않음), B의 세트 복습은 필수만,
  //     세트 복습 점수는 처음 끝낸 날(sp.rvd), 지난주 단계는 그 주에 고정한 단계, 다시 쓰기 동그라미, 일요일·복기 날 공부 시간 안, 알림뿐인 모의, 시험 주,
  //     핀 분, 세트 복습 묶음, 마감·목표, 문구(이번 주 공부 시간·은/는·줄바꿈), 지난 블록 옮김, 시험 날·시험 뒤·시작 전 화면
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), H = () => w.location.hash;
    const act = (a, D) => { const b = d.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, D || {}); d.body.appendChild(b); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); b.remove(); };   // 화면 밖 버튼(끝 화면 "오늘로" 등)을 누른 셈
    const doAll = async () => { for (let k = 0; k < 200 && pe.SES() && pe.SES().items[pe.SES().i]; k++) { const it = pe.SES().items[pe.SES().i];
      if (it.type === 'card') { click('[data-act="sess-flip"]'); click('[data-act="sess-grade"][data-g="2"]'); }
      else if (it.type === 'gq') { const q = pe.gqList(it.d).items[it.n]; click(`[data-act="sess-pick"][data-k="${q.a}"]`); click('[data-act="sess-next"]'); }
      else { click('[data-act="sess-pick"][data-k="0"]'); click('[data-act="sess-next"]'); } } await sleep(20); };
    if (pe.SES()) act('sess-close'); if (pe.MEMO() && !pe.MEMO().fin) act('resume-clear', { k: pe.MEMO().key }); await sleep(40);
    // 날마다 07:00 오늘 몫 → 다 함(세트·모의는 그날 온다). keep 날 밤의 기록을 남긴다
    const runDays = (W, Y, st, nd, keep) => { const arr = { sets: {}, mocks: {} }; let kept = null;
      Object.keys(Y.sets).filter(x => x < W).forEach(x => arr.sets[x] = Y.sets[x]); Object.keys(Y.mocks).filter(x => x < W).forEach(x => arr.mocks[x] = Y.mocks[x]);
      scene(W + 'T07:00:00', st, arr); const out = [];
      for (let i = 0; i < nd; i++) { const day = add(W, i); at(day + 'T07:00:00'); const Z = pe.SETS(); if (Y.sets[day]) Z.sets[day] = clone(Y.sets[day]); if (Y.mocks[day]) Z.mocks[day] = clone(Y.mocks[day]); pe.invalidate();
        const V = pe.planToday(day); applyRows(V.rows, day); at(day + 'T22:00:00'); out.push({ day, ids: ids(V), lv: V.lv, m: mins(V), cap: V.capLeft, b: pe.weekBoard(day) });
        if (day === keep) kept = { st: clone(pe.S()), sets: clone(pe.SETS()) }; }
      return { out, kept }; };
    // 1. 4주를 계획대로(10/26~11/22): 7·14·30일 차는 기한 날 오늘 몫에, 카드 복습은 평일에도, 주마다 세트 복습 15/15(모두 제때), 단계 0, 공부 시간 안
    const X4 = clone(FIX); for (let k = 1; k <= 3; k++) { const W = add('2026-10-26', 7 * k); for (let i = 0; i < 5; i++) X4.sets[add(W, i)] = cloneSet(add(W, i), 1 + k, refsFor(1)); X4.mocks[add(W, 5)] = cloneMock(add(W, 5), { p1: clone(MOCK0.p1), p2: P2_2 }); }
    { const { out: R, kept } = runDays('2026-10-26', X4, EMPTY, 28, '2026-11-11'), on = (day, id) => (R.find(x => x.day === day) || { ids: [] }).ids.includes(id), suns = [6, 13, 20, 27].map(i => R[i]);
      ok(on('2026-10-26', 'rev:2026-10-19:7') && on('2026-11-02', 'rev:2026-10-19:14') && on('2026-11-18', 'rev:2026-10-19:30') && on('2026-11-02', 'rev:2026-10-26:7') && on('2026-11-09', 'rev:2026-10-26:14') && on('2026-11-16', 'rev:2026-11-02:14')
        && R.some(x => pe.dayKind(x.day) === 'wd' && x.ids.some(i => /^cards:/.test(i))), '43-1. 계획대로 4주: 7·14·30일 차 세트 복습이 기한 날 오늘 몫에(10/19 7일 차 10/26 · 14일 차 11/2 · 30일 차 11/18), 카드 복습도 평일 오늘 몫에');
      ok(suns.every(x => { const l = line(x.b, 'rev'); return l.pairs.length && l.pairs.every(p => p.done && l.val(p) === 1); }) && suns.every(x => JSON.stringify(x.b.parts.find(p => p[0] === 'rev')) === '["rev",15,15]' && x.b.pct >= 97),
        `43-1. 주마다 세트 복습 15/15(이번 주에 돌아온 것 모두 제때), 일요일 밤 ${suns.map(x => x.b.pct).join('·')}%`);
      ok(R.every(x => x.lv === 0 && x.m <= x.cap), `43-1. 4주 내내 단계 0, 날마다 오늘 몫 ≤ 공부 시간(${R.map(x => x.m).join(',')})`);
      // 5. 평일 카드 복습: 넣을 수 있는 필수 세트 복습을 다 넣은 뒤 남은 시간에(목 11/12: 1·3·7·14일 차 다음 카드 20장, 단계 0이라 접지 않음), 1시간이면 못 넣은 7·14일 차 뒤로 카드는 시간이 되면
      const S0 = kept.st, sk = new Set(['2026-11-11', '2026-11-09', '2026-11-05', '2026-10-29', '2026-11-12'].flatMap(x => pe.setIds(x)));
      Object.keys(S0.cards).filter(id => !sk.has(id) && S0.cards[id].due > '2026-11-12').slice(0, 20).forEach(id => { S0.cards[id].due = '2026-11-12'; });
      const Y = kept.sets; Y.sets['2026-11-12'] = clone(X4.sets['2026-11-12']); scene('2026-11-12T07:00:00', S0, Y);
      const V = pe.planToday('2026-11-12'), I = ids(V), c = V.rows.find(r => /^cards:/.test(r.id));
      ok(V.lv === 0 && ['rev:2026-11-11:1', 'rev:2026-11-09:3', 'rev:2026-11-05:7', 'rev:2026-10-29:14'].every(x => I.includes(x)) && c && c.task.kc === 20 && I.indexOf('rev:2026-10-29:14') < I.indexOf(c.id) && mins(V) <= V.capLeft && !V.fold.some(x => x.k === 'rev'),
        `43-5. 목 11/12: 세트 복습 4개(7·14일 차 포함) 다음 카드 복습 20장이 오늘 몫(${mins(V)}분 / ${V.capLeft}분)`);
      scene('2026-11-12T07:00:00', S0, Y); const P = pe.dayPlan('2026-11-12', { user: 60 });
      ok(P.moved.filter(x => x.k === 'rev').map(x => x.id + '→' + x.dest).join() === 'rev:2026-11-05:7→내일 다시 나와요,rev:2026-10-29:14→내일 다시 나와요' && P.fold.some(x => x.k === 'cards' && x.wait) && !ids(P).some(i => /^cards:/.test(i)),
        '43-5. 오늘 시간 1시간: 못 넣은 7·14일 차는 "내일 다시 나와요", 카드 복습은 그 뒤라 시간이 되면'); }
    // B(이번 주 남은 필수)의 세트 복습은 오늘 몫이 필수로 두는 것만: 지난주 전에 기한이 지난 14일 차(권장)는 세지 않고, 이번 주 뒤에 돌아올 단계가 있는 세트만 그 하나로
    scene('2026-11-10T07:00:00', ST);
    { const T = pe.taskList('2026-11-10').filter(x => x.k === 'rev'), rl = line(pe.weekBoard('2026-11-10'), 'rev'), later = x => rl.pairs.some(p => p.d === x && !p.done && p.due > '2026-11-10');
      const req = T.filter(x => x.need === '필수'), rec = T.filter(x => x.need === '권장');
      ok(req.map(x => x.d).join() === '2026-10-26,2026-10-27' && rec.length === 7 && T.every(x => x.fill && !x.fold) && req.every(x => rl.ds.includes(x.d)) && rec.every(x => !rl.ds.includes(x.d) || later(x.d))
        && ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].every(x => !rl.ds.includes(x)) && rl.B === 8 * rl.ds.length,
        `43-1. 화 11/10: 세트 복습 필수 2(이번 주 14일 차)·권장 7, B는 필수와 이번 주에 돌아올 것만(${rl.ds.length}세트 × 8분 = ${rl.B}분, 지난주 전 14일 차 5개는 뺌)`); }
    // 넘침 단계 3이라도 세트 복습·카드 복습은 접거나 놓아주지 않는다(목 07:40 단계 0과 3의 세트 복습·카드 줄이 같음). 예전 규칙(PLAN_V 1)으로 고정한 오늘 몫은 새로 짬
    scene('2026-10-29T07:40:00', ST);
    { const f = P => ids(P).filter(i => /^(rev|cards):/.test(i)).join(), P0 = pe.dayPlan(THU), P3 = pe.dayPlan(THU, { lv: 3 });
      ok(f(P0) === f(P3) && f(P3).split(',').length === 8 && !P3.freed.some(x => /^(rev|cards)$/.test(x.k)) && !P3.fold.some(x => /^(rev|cards)$/.test(x.k)), '43-1. 단계 3에서도 세트 복습 7개·카드 복습은 오늘 몫 그대로(접지도 놓아주지도 않음)');
      const st = clone(ST); st.today = { d: THU, at: '07:00', v: 1, lv: 0, cap: 180, user: null, sig: 'x', dm: 0, rows: [] }; scene('2026-10-29T07:40:00', st); const V = pe.planToday(THU);
      ok(pe.S().today.v === 2 && V.rows.length === 16, `43-1. 예전 규칙(v 1)으로 고정한 오늘 몫은 새로 짬(v ${pe.S().today.v}, ${V.rows.length}줄)`); }

    // 2. 세트 복습 점수는 그 단계를 처음 끝낸 날(sp.rvd)로: 10/27 1일 차 → 10/29 3일 차(rev[1]이 10/29로 덮여도 1일 차는 제때 1), 3일 차를 10/31에 하면 늦은 ½
    { const st = clone(BLANK); st.sp['2026-10-26'] = { read: Object.fromEntries([...Array(10).keys()].map(i => [i, 1])), quiz: {}, tasks: {}, essay: {}, rev: {}, hw: {}, first: '2026-10-26' };
      scene('2026-10-27T08:00:00', st); pe.startSetReview('2026-10-26'); await sleep(40); const r1 = JSON.stringify(pe.SES().rv); await doAll(); act('sess-close');
      at('2026-10-29T08:00:00'); pe.invalidate(); pe.startSetReview('2026-10-26'); await sleep(40); const r3 = JSON.stringify(pe.SES().rv); await doAll(); act('sess-close');
      const p = pe.S().sp['2026-10-26'], l = line(pe.weekBoard('2026-10-29'), 'rev'), pr = l.pairs.filter(x => x.d === '2026-10-26');
      ok(r1 === '[{"d":"2026-10-26","step":1}]' && r3 === '[{"d":"2026-10-26","step":3}]' && JSON.stringify(p.rev) === '{"1":"2026-10-29","3":"2026-10-29"}' && JSON.stringify(p.rvd) === '{"1":"2026-10-27","3":"2026-10-29"}' && pr.map(x => x.st + ':' + x.done + ':' + l.val(x)).join() === '1:2026-10-27:1,3:2026-10-29:1',
        '43-2. 세트 복습 화면으로 1일 차(10/27) → 3일 차(10/29): rev는 둘 다 10/29로 덮지만 rvd는 처음 끝낸 날(1일 차 10/27) → 둘 다 제때 1');
      const st2 = clone(st); Object.assign(st2.sp['2026-10-26'], { rev: { 1: '2026-10-27' }, rvd: { 1: '2026-10-27' } }); scene('2026-10-31T08:00:00', st2); pe.startSetReview('2026-10-26'); await sleep(40); await doAll(); act('sess-close');
      const l2 = line(pe.weekBoard('2026-10-31'), 'rev');
      ok(l2.pairs.filter(x => x.d === '2026-10-26').map(x => x.st + ':' + x.done + ':' + l2.val(x)).join() === '1:2026-10-27:1,3:2026-10-31:0.5', '43-2. 3일 차(기한 10/29)를 10/31에 하면 늦은 ½, 1일 차는 처음 끝낸 날 그대로 1'); }

    // 3. 지난주 단계는 그 주에 오늘 몫을 고정한 단계 중 가장 높은 것(lvx): 토요일을 단계 1로 고정하고 일요일을 건너뛰면 월요일에 다시 센 단계(3)가 아니라 1.
    //    지난주 기록·통계는 "넘침 단계 n" 없이 그 단계 문장으로
    scene('2026-10-31T08:00:00', EMPTY);
    { const lvS = pe.planToday(SAT).lv; at('2026-11-02T07:00:00'); pe.invalidate(); const rec = pe.weekBoard(SUN).lv; pe.planToday(MON); const x = pe.S().wk['2026-10-26'], sh = pe.lastWeekSheet('2026-10-26');
      ok(lvS === 1 && rec === 3 && x.lv === 1 && x.lvx === 1 && /빠듯해요/.test(sh) && !/넘침 단계/.test(sh), `43-3. 토요일 단계 ${lvS}로 고정 → 월요일 지난주 기록 단계 ${x.lv}(다시 세면 ${rec}), 지난주 기록 창 "빠듯해요"`);
      await show('#stats'); const r = [...V$().querySelectorAll('.row')].map(T_).find(t => /10\/26~11\/1/.test(t)) || '';
      ok(/10\/26~11\/1 · 빠듯해요/.test(r) && !/넘침 단계/.test(V$().textContent), `43-3. 통계 주간 기록: "${r}"`); }
    // 일요일에 오늘 몫을 다 하면 이번 주 머리는 단계 문장 대신 "남은 필수 약 n은 다음 주로 놓아줘요"(조사는 받침 따라), 오늘 끝 카드도 같은 조사
    scene('2026-11-01T09:00:00', ST);
    { const V = pe.planToday(SUN); applyRows(V.rows, SUN); at('2026-11-01T22:00:00'); pe.invalidate(); const b = pe.weekBoard(SUN), m = pe.mfmt(b.B), want = `남은 필수 약 ${m}은 다음 주로 놓아줘요`; await show('#today');
      ok(V.lv === 3 && b.B > 0 && T_(V$().querySelector('.wksec .wkline')) === want && !V$().querySelector('.wksec .lvc') && T_(V$().querySelector('.dcard.fin .ds')).endsWith('이번 주 ' + want), `43-3·20. 일요일 오늘 몫 끝: 이번 주 "${want}"(단계 문장 없음), 끝 카드도 "…은"`);
      await show('#week'); ok(T_(V$().querySelector('.score .sc1')) === want && !V$().querySelector('.score .sc2'), '43-3. 이번 주 탭 점수 카드도 같은 문장(단계 문장 없음)'); }

    // 4. 모의 오답 다시 쓰기 몫(3단계 토요일 2/27, 평일 다시 쓰기는 건너뜀): 줄을 누르면 지난 모의 화면만(치지 않음), 동그라미가 "한 편 다 썼어요",
    //    펼친 줄의 "한 편 빼기"와 채운 동그라미로 되돌림(점수·달력도), 옮긴 줄에도 동그라미. 이번 주 탭의 "다음"은 치지 않고 모의 화면으로
    const X3 = clone(FIX); ['2027-02-22', '2027-02-23', '2027-02-24', '2027-02-25', '2027-02-26'].forEach(x => X3.sets[x] = cloneSet(x, 18, refsFor(3)));
    X3.mocks['2027-02-20'] = cloneMock('2027-02-20', { p1: clone(MOCK0.p1), p2: P6(2) }); X3.mocks['2027-02-27'] = cloneMock('2027-02-27', { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
    { const arr = { sets: {}, mocks: { '2027-02-20': X3.mocks['2027-02-20'] } }; Object.keys(X3.sets).filter(x => x < '2027-02-22').forEach(x => arr.sets[x] = X3.sets[x]);
      scene('2027-02-22T07:00:00', BLANK, arr);
      for (let i = 0; i < 5; i++) { const day = add('2027-02-22', i); at(day + 'T07:00:00'); pe.SETS().sets[day] = clone(X3.sets[day]); pe.invalidate(); applyRows(pe.planToday(day).rows.filter(r => !/^x\.redo:/.test(r.id)), day); }
      pe.SETS().mocks['2027-02-27'] = clone(X3.mocks['2027-02-27']); pe.invalidate(); const ST3 = clone(pe.S()), SETS3 = clone(pe.SETS());
      at('2027-02-27T08:00:00'); const SA = '2027-02-27', RID = 'q.redo:2027-02-22', V = pe.planToday(SA), b0 = pe.weekBoard(SA), rk = () => Object.keys(pe.S().tk).filter(k => k.indexOf('x.redo:' + SA + ':') === 0).sort();
      const prow = () => [...V$().querySelectorAll(`.prow[data-task="${RID}"]`)].find(r => !r.classList.contains('moved')), mrow = () => V$().querySelector(`.prow.moved[data-task="${RID}"]`), cal0 = () => ((pe.S().cal[SA] || {}).x || {})['tk:x.redo:' + SA + ':0'];
      await show('#today');
      ok(V.rows.some(r => r.id === RID && JSON.stringify(r.q) === '[["u0",1],["u1",1]]') && V.moved.some(x => x.id === RID && x.dest === '내일(일) 손글씨 몫') && prow() && prow().matches('.prow.two') && prow().querySelector('.pbody[data-act="task"]') && prow().querySelector('.tkc[data-act="redo-tick"]') && mrow() && mrow().querySelector('.tkc[data-act="redo-tick"]'),
        '43-4. 토요일 오늘 몫 "모의 오답 다시 쓰기 2편": 줄(지난 모의로)과 동그라미(한 편 다 썼어요), 옮긴 1편(→ 내일(일) 손글씨 몫)에도 동그라미');
      click('.pbody', prow()); await sleep(60);
      ok(H() === '#mock/2027-02-27' && !rk().length, '43-4. 줄을 누르면 모의 화면만 열고 치지 않음');
      await show('#today'); click('.tkc', prow()); await sleep(20); const b1 = pe.weekBoard(SA);
      ok(rk().join() === 'x.redo:2027-02-27:0' && line(b1, 'redo').a === 1 && b1.pct > b0.pct && cal0() && cal0()[1] === '모의 오답 다시 쓰기', `43-4. 동그라미 → 한 편(S.tk x.redo:날짜:0), 이번 주 다시 쓰기 1/${line(b1, 'redo').b}, 지금 ${b0.pct}% → ${b1.pct}%, 달력에 적음`);
      pe.UI().act = RID; await show('#week');
      const pw = prim().length === 1 && prim()[0].dataset.act === 'task' && prim()[0].dataset.id === RID; click('.score .btn'); await sleep(60);
      ok(pw && H() === '#mock/2027-02-27' && rk().length === 1, '43-4. 이번 주 탭 "다음"은 다시 쓰기를 치지 않고 모의 화면을 엶');
      await show('#today'); const nb = [...V$().querySelectorAll('.prow.now .btn')].map(b => b.dataset.act + ':' + T_(b)).join();
      click('.prow.now [data-act="redo-undo"]'); await sleep(20); const b2 = pe.weekBoard(SA);
      ok(nb === 'redo-tick:한 편 다 썼어요,redo-undo:한 편 빼기,later:나중에' && !rk().length && b2.pct === b0.pct && !cal0(), `43-4. 펼친 줄: ${nb} → "한 편 빼기"로 되돌림(점수 ${b2.pct}%, 달력 글도 지움)`);
      pe.UI().act = null; await show('#today'); click('.tkc', prow()); await sleep(10); click('.tkc', prow()); await sleep(10);
      const on2 = prow().matches('.done') && prow().querySelector('.tkc.on[data-act="redo-undo"]') && rk().length === 2; click('.tkc', prow()); await sleep(10);
      ok(on2 && rk().join() === 'x.redo:2027-02-27:0' && !prow().matches('.done'), '43-4. 2편 다 쓰면 채운 동그라미(누르면 마지막 한 편을 뺌)');
      click('.tkc', mrow()); await sleep(10); ok(rk().length === 2, '43-4. 옮긴 줄의 동그라미도 한 편 다 썼어요');
      // 6. 3단계 일요일(토요일 건너뜀): 그날의 3·4교시·채점·리포트만 늘 넣고, 토요일 1·2교시는 남은 시간 안에서만(못 넣으면 "→ 다음 모의 전까지") — 공부 시간을 넘지 않음
      scene('2027-02-28T09:00:00', ST3, SETS3); const Vs = pe.planToday('2027-02-28');
      ok(ids(Vs).join() === 'mock:2027-02-27:p3,mock:2027-02-27:p4,mock.g:2027-02-27,report:2027-02-22' && mins(Vs) <= Vs.capLeft && ['p1', 'p2'].every(k => Vs.moved.some(x => x.id === 'mock:2027-02-27:' + k && x.dest === '다음 모의 전까지')),
        `43-6. 토요일을 건너뛴 3단계 일요일: 3·4교시·채점·리포트 ${mins(Vs)}분 ≤ ${Vs.capLeft}분, 1·2교시는 → 다음 모의 전까지`); }

    // 7·8·9·16. 알림뿐인 모의(실전 응시 날 1/30), 시험이 든 주의 숙제 줄, 48시간 복기 핀의 분, 시험 전날 준비물 핀
    const XE = clone(HOL); ['2027-01-04', '2027-01-25', '2027-01-26', '2027-01-27', '2027-01-28', '2027-01-29', '2027-02-01'].forEach(x => XE.sets[x] = cloneSet(x, pe.weekIndex(x), refsFor(2)));
    XE.mocks['2027-01-30'] = { date: '2027-01-30', title: '실전 응시 날', notice: '오늘은 큐넷 실전 응시 날이에요.' };
    scene('2027-01-25T07:00:00', BLANK, XE);
    { const q = t => pe.taskList(t).filter(x => /^(hw\.(write|dd|eo)|essay)$/.test(x.k)), T = q('2027-01-25'), P = pe.dayPlan('2027-01-25', { user: 30 }), mv = P.moved.filter(x => /^(hw\.|essay)/.test(x.k));
      at('2027-01-04T07:00:00'); const N = q('2027-01-04');
      ok(T.length === 4 && T.every(x => x.roll === '오늘만') && mv.length && mv.every(x => x.dest === '오늘만이라 놓아줘요') && N.filter(x => x.k !== 'hw.dd').every(x => x.roll === '일요일까지'),
        '43-8. 시험이 든 주(1/25) 숙제 줄은 "오늘만"(주말 몫이 없음, 못 넣으면 오늘만이라 놓아줘요). 보통 주(1/4)는 일요일까지'); }
    scene('2027-01-29T20:00:00', BLANK, XE);
    { const V = pe.planToday('2027-01-29'); await show('#today'); const pin = V$().querySelector('.pin');
      ok(V.rows[0].id === 'kit:2027-01-29' && V.rows[0].blk === 'pin' && pin && /준비물 점검/.test(T_(pin)) && T_(pin.querySelector('.pdd')) === '내일 시험' && prim().length === 1 && !prim()[0].closest('.pin'), '43-16. 시험 전날 저녁: 준비물은 맨 위 핀("내일 시험"), 파란 버튼은 목록 쪽'); }
    scene('2027-01-31T09:00:00', BLANK, XE);
    { const T = pe.taskList('2027-01-31'), V = pe.planToday('2027-01-31'), pm = V.rows.reduce((a, r) => a + r.m, 0); await show('#today');
      ok(!T.some(x => /^mock/.test(x.k)) && V.rows[0].id === 'recap:141' && T_(V$().querySelector('.daysum span')) === `오늘 몫 ${pe.planItems(V).length}개 · 약 ${pe.mfmt(pm)} (복기 2시간 30분 포함)` && pm <= V.capLeft,
        `43-7·9. 1/31: 알림뿐인 1/30 모의는 채점 줄 없음, 상태 줄의 분에 복기 핀 포함("${T_(V$().querySelector('.daysum span'))}")`);
      await show('#archive'); const r = [...V$().querySelectorAll('.row')].find(x => /실전 응시 날/.test(T_(x)));
      ok(r && !/채점|○/.test(T_(r)), `43-7. 세트 보관함: 알림뿐인 모의는 교시·채점 칸 없음("${T_(r)}")`); }
    { const X = clone(FIX); X.mocks['2026-10-31'] = { date: '2026-10-31', title: '알림', notice: '이번 주는 모의고사가 없어요.' }; scene('2026-10-31T10:00:00', ST, X);
      const T = pe.taskList(SAT), B = pe.weekBoard(SAT); await show('#week'); const dr = [...V$().querySelectorAll('.drow')].map(T_).find(x => /토 10\/31/.test(x)) || '';
      ok(!T.some(x => /^mock/.test(x.k)) && !B.lines.some(l => l.k === 'mock') && /이번 주는 모의고사가 없어요/.test(dr), `43-7. 보통 토요일에 알림뿐인 모의: 모의 줄·채점·이번 주 모의 줄 없음, 날마다 "${dr}"`); }
    scene('2027-02-01T07:00:00', BLANK, XE);
    { const V = pe.planToday('2027-02-01');
      ok(V.rows[0].id === 'recap:141' && mins(V) <= V.capLeft && V.moved.some(x => x.id === 'hw.dd:2027-02-01' && x.dest === '토요일 따라잡기') && !V.rows.some(r => r.id === 'hw.dd:2027-02-01'),
        `43-6. 48시간 복기 마지막 날(월 2/1): 복기 핀과 최소 몫만 늘 넣고 단답은 시간 안에서(${mins(V)}분 ≤ ${V.capLeft}분, 단답 → 토요일 따라잡기)`); }
    // 16·17. 본시험 날(5/15): 단계 안내 없음, 이번 주는 체크만. 5/16·5/17 복기 핀(배지), 5/18 시험 후. 시작 전(시작일 11/30, 11/20): 머리와 카드 하나. 준비 주 머리 줄은 한 번만
    scene('2027-05-15T08:00:00', BLANK, XE);
    { await show('#today'); const ws = T_(V$().querySelector('.wksec'));
      ok(pe.phaseStart('2027-05-15') && !pe.planToday('2027-05-15').info.some(x => x.k === 'phase') && !V$().querySelector('.notice') && /시험 주 · 점수 대신 체크: 응시 ○ · 48시간 복기 ○ · 준비물 ○/.test(ws) && !/남은 필수/.test(ws), '43-16. 본시험 날: 단계 안내 없음, 이번 주는 "시험 주 · 점수 대신 체크"만'); }
    for (const [dd, roll, wk] of [['2027-05-16', 'D-1', 1], ['2027-05-17', '오늘까지', 0]]) { scene(dd + 'T09:00:00', BLANK, XE); await show('#today');
      ok(T_(V$().querySelector('.pin b')) === '제142회 복기: 문제 모두 적기 → 4문제 다시 써서 채점(48시간 안)' && T_(V$().querySelector('.pin .pdd')) === roll && pe.navBadgeN(dd) === 1 && T_(V$().querySelector('.dday b')) === '시험 후' && !V$().querySelector('.daysum') && !!V$().querySelector('.wksec') === !!wk,
        `43-17. ${dd}: 48시간 복기 핀(${roll}, 배지 1), D-day 자리 "시험 후", 이번 주 칸 ${wk ? '체크' : '없음'}`); }
    scene('2027-05-18T09:00:00', BLANK, XE); await show('#today');
    ok(!V$().querySelector('.pin') && pe.navBadgeN('2027-05-18') === 0 && T_(V$().querySelector('.dday b')) === '시험 후' && T_(V$().querySelector('.lsub')) === '시험 후' && /시험 후 · 복기와 면접 준비/.test(T_(V$().querySelector('.dcard'))), '43-17. 5/18: 핀 없음, 머리 줄 "시험 후" 한 번, 카드 하나');
    { const st = clone(BLANK); st.settings.start = '2026-11-30'; scene('2026-11-20T08:00:00', st); await show('#today');
      ok(V$().children.length === 2 && /준비 시작 전 · 11월 30일부터/.test(T_(V$().querySelector('.dcard'))) && T_(V$().querySelector('.lsub')) === '시작 전' && !V$().querySelector('.daysum, .wksec, .pin, [data-act="plan-reset"]'), '43-17. 시작 전(11/20, 시작일 11/30): 머리와 카드 하나뿐'); }
    scene('2026-10-21T08:00:00', ST); await show('#today'); ok(T_(V$().querySelector('.lsub')) === '준비 주', '43-17. 준비 주 머리 줄은 "준비 주" 한 번');

    // 10. 토요일 세트 복습 묶음은 블록·꼬리표(필수·권장)마다: 11/14 "세트 복습 4개"(필수, 다시 나와요) · 카드 · "세트 복습 5개 권장", 시작은 그 묶음의 줄만 잇는다
    scene('2026-11-14T08:00:00', ST);
    { const V = pe.planToday('2026-11-14'), its = pe.planItems(V), g = its.filter(i => i.g === 'rev'); await show('#today');
      const rs = [...V$().querySelectorAll('.blk + .plan > .prow')].map(T_);
      ok(g.length === 2 && g[0].need === '필수' && g[0].ids.length === 4 && g[1].need === '권장' && g[1].ids.length === 5 && /^1세트 복습 4개14일 차 4 · 32분 · 다시 나와요/.test(rs[0]) && /^3세트 복습 5개권장14일 차 5 · 40분/.test(rs[2]) && !/다시 나와요/.test(rs[2]),
        `43-10. 토 11/14 묶음: ${rs.map(x => x.slice(0, 18)).join(' / ')}`);
      click('.prow.now [data-act="task"]'); await sleep(60); const c1 = JSON.stringify(pe.SES().chain); act('sess-close'); await show('#today');
      click(`.prow[data-task="${g[1].ids[0]}"]`); await sleep(60); const s2 = pe.SES(), c2 = JSON.stringify(s2.chain), d2 = s2.rv[0].d; act('sess-close');
      ok(c1 === '["2026-10-27","2026-10-28","2026-10-30"]' && d2 === '2026-10-19' && c2 === '["2026-10-20","2026-10-21","2026-10-22","2026-10-23"]', `43-10. 필수 묶음 시작 → 그 묶음만 잇기(${c1}), 권장 묶음 → 10/19부터 ${c2}`); }

    // 11. 이번 주 점수: 마감 옆에 이번 주 목표 수, 설명 "필수와 이번 주 목표만 세요". 일요일 "이번 주 목표" 줄은 이번 주 탭의 목표 칸을 펼쳐 그곳으로
    scene('2026-11-01T09:00:00', ST);
    { await show('#week'); const s4 = T_(V$().querySelector('.score .sc4'));
      ok(/마감 \d\/5 · 이번 주 목표 0\/4/.test(s4) && /^필수와 이번 주 목표만 세요/.test(T_(V$().querySelector('.score .note'))), `43-11. 점수 부분 "${s4}"`);
      await show('#today'); pe.taskGo('goal:2026-10-26'); await sleep(60);
      ok(H() === '#week' && V$().querySelector('#wkGoals[open]') && pe.UI().open.goals === true, '43-11. 이번 주 목표 줄 → 이번 주 탭 목표 칸(펼침)'); }

    // 12·13·22. 목 21:30 "30분 · 최소 몫": 늘 넣는 줄만 남으면 "오늘 시간 줄이기"를 띄우지 않음. 이번 주 머리는 "이번 주 공부 시간", 분 덩어리는 줄을 넘기지 않음(.nw)
    scene('2026-10-29T21:30:00', ST);
    { pe.planToday(THU); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-set"][data-m="30"]'); await sleep(30); await show('#today');
      const V = pe.planToday(THU), dsx = [...V$().querySelectorAll('.dsx')].map(T_).join(' / ');
      ok(pe.S().today.user === 30 && V.leftMin > V.capLeft && V.rows.filter(r => !r.done).every(r => r.task.always) && !/오늘 시간 줄이기/.test(dsx), `43-12. 30분으로 줄인 뒤 늘 넣는 줄 ${V.leftMin}분만 남음: "오늘 시간 줄이기" 없음`); }
    scene('2026-10-29T07:40:00', ST);
    { await show('#today'); const wl = V$().querySelector('.wksec .wkline');
      ok(/^남은 필수 약 \d+시간 \d+분 \/ 이번 주 공부 시간 \d+시간$/.test(T_(wl)) && wl.querySelectorAll('.nw').length === 2 && /^약 /.test(T_(V$().querySelector('.daysum .nw'))), `43-13·22. 이번 주 머리 "${T_(wl)}"(분 덩어리 .nw), 상태 줄 분도 .nw`);
      await show('#week'); ok(/이번 주 공부 시간/.test(T_(V$().querySelector('.score .sc1'))) && [...V$().querySelectorAll('.score .sc4 .nw')].length >= 5, '43-13·22. 이번 주 탭 점수 카드도 "이번 주 공부 시간", 부분 점수마다 .nw'); }

    // 14. 다 채운 손글씨 줄(✓)은 누를 곳 없음·"다음 하나" 없음(토요일 몫을 다 한 일요일 밤)
    scene('2026-10-31T08:00:00', ST); applyRows(pe.dayPlan(SAT).rows, SAT); { const s6 = clone(pe.S()); scene('2026-11-01T09:00:00', s6); applyRows(pe.planToday(SUN).rows, SUN); at('2026-11-01T22:00:00'); }
    { await show('#week'); const q = V$().querySelector('#ql-dd');
      ok(q && q.tagName === 'DIV' && q.matches('.done') && !q.querySelector('.chev') && !/다음 하나/.test(T_(q)) && !q.dataset.act, `43-14. 다 채운 손글씨 줄 "${T_(q)}": 누를 곳·다음 하나 없음`); }

    // 15. 공휴일(12/25) 손글씨 몫을 반만 넣으면 옮긴 줄에 남은 세트를 적는다(12/23(수) · 12/24(목) · 30분 → 토요일 따라잡기)
    scene('2026-12-25T10:00:00', BLANK, HOL);
    { const V = pe.planToday('2026-12-25'); await show('#today'); const mv = [...V$().querySelectorAll('details.pf .prow.moved')].map(T_);
      ok(V.moved.filter(x => x.quota).length === 3 && V.moved.filter(x => x.quota).every(x => x.msets.join() === '2026-12-23,2026-12-24') && mv.some(x => /^단답 손글씨 2문12\/23\(수\) · 12\/24\(목\) · 30분 → 토요일 따라잡기$/.test(x)), `43-15. 옮긴 손글씨 몫에 남은 세트: ${mv[0]}`); }

    // 18. 수 21:30: 남은 줄이 있는 지난 블록은 끝낸 줄까지 통째로 지금 블록 위로("✓ 끝" 머리 없음), 묶음이 갈라지지 않고 번호는 고정한 순서 그대로
    scene('2026-10-28T21:30:00', WED);
    { const V = pe.planToday(WD), order = V.rows.filter(r => r.blk !== 'pin').map(r => r.id).join(); applyRows(V.rows.filter(r => r.id === 'rev:2026-10-26:1'), WD); pe.invalidate(); await show('#today');
      const V2 = pe.planToday(WD), its = pe.planItems(V2), heads = [...V$().querySelectorAll('.blk')].map(T_);
      ok(V2.rows.find(r => r.id === 'rev:2026-10-26:1').done && its.flatMap(i => i.ids).join() === order && its[0].ids.length === 3 && its[0].vb === 'eve' && !heads.some(h => /✓ 끝/.test(h)) && /^저녁/.test(heads[0]),
        `43-18. 아침·점심 몫(끝낸 1일 차 포함)을 저녁 위로 통째로: 머리 ${heads.join(' | ')}, 1번 세트 복습 3개(1/3)`); }

    // 19. 월 11/2 09:30 세트가 오지 않음: "오늘 세트가 아직 없어요 · 복습부터 해요"와 "지금 받아 오기"
    scene('2026-11-02T09:30:00', ST);
    { await show('#today'); const pi = V$().querySelector('.pinfo');
      ok(pi && /^오늘 세트가 아직 없어요 · 복습부터 해요/.test(T_(pi)) && pi.querySelector('.btn.sec[data-act="sync"]'), `43-19. 월요일 9시 넘어 세트 없음: "${T_(pi)}"`); }

    // 20. 용어를 다 읽은 세트의 넘겨 보기 자리는 이어서로 잇지 않음
    { const st = clone(ST); st.resume = { 'flash:2026-10-29': { i: 3, n: 10, day: THU } }; scene('2026-10-29T07:40:00', st); const r0 = pe.resumeSrc(THU);
      st.sp['2026-10-29'] = { read: Object.fromEntries([...Array(10).keys()].map(i => [i, 1])), quiz: {}, tasks: {}, essay: {}, rev: {}, hw: {}, first: THU }; scene('2026-10-29T07:40:00', st);
      ok(r0 && r0.k === 'flash' && r0.i === 3 && !pe.resumeSrc(THU), '43-20. 넘겨 보기 자리(4/10)는 용어를 다 읽은 뒤에는 이어서에 나오지 않음'); }

    // 21. 다른 날에 되돌려도 친 날의 달력 글을 지움(수요일에 친 이번 주 목표를 목요일에 되돌림)
    scene('2026-10-28T10:00:00', ST);
    { const G = 'goal:2026-10-26:0', cal = () => ((pe.S().cal['2026-10-28'] || {}).x || {})['tk:' + G]; await show('#week'); click('#wkGoals > summary'); await sleep(10); click(`#wkGoals [data-act="tk"][data-id="${G}"]`); await sleep(20); const c0 = cal();
      at('2026-10-29T10:00:00'); await show('#week'); if (!V$().querySelector('#wkGoals[open]')) { click('#wkGoals > summary'); await sleep(10); } click(`#wkGoals [data-act="tk"][data-id="${G}"]`); await sleep(20);
      ok(c0 && !pe.S().tk[G] && !cal(), '43-21. 목요일에 되돌리면 수요일 달력의 "이번 주 목표" 글도 지움'); }

    // 23. 채점은 그 모의의 교시를 다 쓴 뒤에만 펼칠 줄·"다음"(토 10/31: 1·2교시를 나중에로 미루면 채점이 아니라 밀린 핵심)
    scene('2026-10-31T08:00:00', ST);
    { pe.planToday(SAT); pe.UI().later = { 'mock:2026-10-31:p1': 1, 'mock:2026-10-31:p2': 2 }; const V = pe.planToday(SAT), n = pe.nextAfter('mock:2026-10-31:p2', V);
      pe.UI().later = {}; pe.S().mockp['2026-10-31'] = { p1: true, p2: true }; pe.invalidate(); const V2 = pe.planToday(SAT);
      ok(V.active.id === 'late:2026-10-28' && n.row.id === 'late:2026-10-28' && V2.active.id === 'mock.g:2026-10-31', `43-23. 교시가 남으면 채점은 건너뜀(펼칠 줄 ${V.active.id}), 다 쓰면 채점(${V2.active.id})`); }
    if (pe.SES()) act('sess-close'); await go('#today');
  }

  // 44. 점검 고침(세트·숙제·모의·타이머, 시계 고정): 모의는 고른 교시(오늘 줄·단계 줄)·도는 교시 타이머가 지금 교시, 교시마다 시작·타이머 없이 다 썼어요,
  //     채점 줄로 오면 안내, 이번 주에서 펼친 숙제 칸이 세트 막대보다 먼저, 끝난 화면 안 타이머는 같은 타이머를 새로 시작
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), H = () => w.location.hash, L = () => w.history.length, tap = async s => { click(s); await sleep(60); };
    const TM = pe.TM(), MD = '2026-10-31', MH = '#mock/' + MD, pr = () => pe.S().mockp[MD] || {}, bar = () => V$().querySelector('.nextbar .btn'), pill = () => d.querySelector('#tpill-wrap .tpill');
    const steps = () => [...V$().querySelectorAll('.stepper li')].map(li => (li.classList.contains('done') ? '✓' : li.classList.contains('cur') ? '●' : '○') + T_(li.querySelector('span'))).join(' ');
    const shown = () => prim().filter(b => !b.closest('details:not([open])'));
    const fold = k => [...V$().querySelectorAll('details.mpart')].find(f => f.querySelector(`[data-act="mock-start"][data-k="${k}"]`));
    // 44-1. 토 13:00 "오늘 시간" 1시간: 오늘 몫의 모의는 2교시 하나(1교시는 일요일로) → 그 줄 "2교시 시작" → 모의 화면은 2교시가 지금 교시, 아래 막대 "2교시 시작 · 타이머 50분"
    scene('2026-10-31T13:00:00', ST); pe.goTab('today'); await sleep(40); await show('#today');
    click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-set"][data-m="60"]'); await sleep(30); await show('#today');
    const nr = V$().querySelector('.prow.now'), hl = L();
    ok(nr && nr.dataset.task === 'mock:2026-10-31:p2' && T_(nr.querySelector('.pgo .btn:not(.ghost)')) === '2교시 시작' && pe.planToday(SAT).moved.some(x => x.id === 'mock:2026-10-31:p1'), `44-1. 토 13:00 1시간: 펼친 줄은 "2교시 시작"(1교시는 ${(pe.planToday(SAT).moved.find(x => x.id === 'mock:2026-10-31:p1') || {}).dest})`);
    await tap('.prow.now .pgo .btn:not(.ghost)');
    const f1 = fold('p1');
    ok(H() === MH && steps() === '○1교시 ●2교시 ○채점' && /지금: 2교시 논술 2문/.test(T_(V$().querySelector('.mcur h2'))) && T_(bar()) === '2교시 시작 · 타이머 50분' && bar().dataset.act === 'mock-start' && bar().dataset.k === 'p2' && shown().length === 1,
      `44-1. 2교시 줄 → 모의 화면: 지금 2교시, 아래 막대 "${T_(bar())}"(파란 버튼 하나)`);
    ok(f1 && !f1.open && T_(f1.querySelector('[data-act="mock-start"]')) === '1교시 시작 · 타이머 100분' && f1.querySelector('[data-act="mock-start"]').classList.contains('sec') && f1.querySelector('[data-act="mock-part"][data-k="p1"]') && V$().querySelector('.stepper [data-act="mock-pick"][data-k="p1"]'),
      '44-1. 안 쓴 1교시는 접은 칸에 보조 버튼 "1교시 시작 · 타이머 100분"과 "타이머 없이 다 썼어요"(단계 줄의 1교시는 누를 수 있음)');
    await tap('.nextbar [data-act="mock-start"]');
    ok(TM.running && TM.ctx.pk === 'p2' && TM.total === 3000 && V$().querySelector('.mcur .tline[data-timer="custom"]') && T_(bar()) === '2교시 다 썼어요' && d.body.classList.contains('focus') && !pill() && !V$().querySelector('.stepper [data-act="mock-pick"]'),
      '44-1. 2교시 시작 → 50분 화면 안 타이머, 아래 막대 "2교시 다 썼어요"(집중 모드, 타이머가 도는 동안 단계 줄은 누르지 않음)');
    // 44-2. 2교시 타이머가 도는 동안 1교시를 적었다가 되돌려도 2교시가 지금 교시(화면 안 타이머 그대로, 1교시 시작은 보조 버튼)
    click('details.mpart [data-act="mock-part"][data-k="p1"]'); await sleep(20);
    ok(pr().p1 === true && TM.running && TM.ctx.pk === 'p2' && steps() === '✓1교시 ●2교시 ○채점' && V$().querySelector('.mcur .tline[data-timer="custom"]'), '44-2. 2교시가 도는 중 접은 칸의 "타이머 없이 다 썼어요" → 1교시만 적고 2교시 타이머 그대로');
    click('.mdone [data-act="mock-undo"][data-k="p1"]'); await sleep(20);
    ok(!pr().p1 && TM.running && TM.ctx.pk === 'p2' && steps() === '○1교시 ●2교시 ○채점' && V$().querySelector('.mcur .tline[data-timer="custom"]') && /지금: 2교시/.test(T_(V$().querySelector('.mcur h2'))) && T_(bar()) === '2교시 다 썼어요' && d.body.classList.contains('focus') && !pill() && shown().length === 1,
      '44-2. 1교시 되돌리기 → 2교시가 지금 교시 그대로(화면 안 타이머 .tline, 아래 막대 "2교시 다 썼어요", 알약 없음)');
    // 44-3. 1교시를 쓰지 않고 2교시 다 썼어요 → p2만 적음, 그 오늘 줄은 끝 → "✓ 끝 · 다음: 오늘 다음 줄", 1교시는 접은 칸 그대로
    await tap('.nextbar [data-act="mock-part"]');
    ok(pr().p2 === true && !pr().p1 && !TM.running && !TM.ctx && JSON.stringify(((pe.S().cal[SAT] || {}).x || {})['mock:' + MD + ':p2']) === '["mock","10월 31일 모의고사 2교시 다 씀"]' && steps() === '○1교시 ✓2교시 ○채점',
      '44-3. 1교시 없이 2교시 다 썼어요 → S.mockp[D].p2만(달력 "2교시 다 씀")');
    ok(/^✓ 끝 · 다음: 밀린 세트 10\/28\(수\)/.test(T_(bar())) && bar().dataset.act === 'mock-next' && !V$().querySelector('.mcur') && fold('p1') && fold('p1').querySelector('[data-act="mock-start"].sec') && shown().length === 1 && H() === MH && L() === hl,
      `44-3. 그 오늘 줄을 끝냄 → 아래 막대 "${T_(bar())}", 1교시는 접은 칸(보조 시작 버튼), 방문 기록 그대로`);
    await tap('.nextbar .btn');
    ok(H() === '#set/2026-10-28' && pe.FLOW() && pe.FLOW().id === 'late:2026-10-28', '44-3. "다음" → 밀린 세트(오늘 순서 그대로)');
    // 44-4. 오늘 줄 없이 연 모의(연습): 안 쓴 첫 교시가 지금 교시, 단계 줄의 다른 교시를 누르면 그 교시가 지금 교시(아래 막대도 따라감)
    scene('2026-10-31T13:00:00', ST); pe.goTab('practice'); await sleep(40); await show(MH);
    ok(steps() === '●1교시 ○2교시 ○채점' && T_(bar()) === '1교시 시작 · 타이머 100분' && fold('p2') && T_(fold('p2').querySelector('[data-act="mock-start"]')) === '2교시 시작 · 타이머 50분', '44-4. 연습에서 연 모의: 1교시가 지금 교시, 2교시는 접은 칸(보조 "2교시 시작 · 타이머 50분")');
    await tap('.stepper [data-act="mock-pick"][data-k="p2"]');
    ok(steps() === '○1교시 ●2교시 ○채점' && T_(bar()) === '2교시 시작 · 타이머 50분' && fold('p1') && shown().length === 1, '44-4. 단계 줄의 2교시를 누르면 2교시가 지금 교시(아래 막대 "2교시 시작 · 타이머 50분", 1교시는 접은 칸)');
    await tap('.stepper [data-act="mock-pick"][data-k="p1"]');
    ok(steps() === '●1교시 ○2교시 ○채점' && T_(bar()) === '1교시 시작 · 타이머 100분', '44-4. 단계 줄의 1교시를 누르면 다시 1교시');
    // 접은 2교시의 보조 "2교시 시작" → 그 교시가 지금 교시(타이머가 이긴다)
    fold('p2').open = true; await tap('details.mpart [data-act="mock-start"][data-k="p2"]');
    ok(TM.running && TM.ctx.pk === 'p2' && steps() === '○1교시 ●2교시 ○채점' && V$().querySelector('.mcur .tline[data-timer="custom"]') && T_(bar()) === '2교시 다 썼어요', '44-4. 접은 2교시의 "2교시 시작 · 타이머 50분" → 2교시가 지금 교시(화면 안 타이머)');
    await show('#timer'); click('[data-act="timer-reset"]'); click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10); delete pe.SV()['mkw:' + MD];
    // 44-5. 오늘의 "채점하기" 줄로 왔는데 안 쓴 교시가 있으면: 안 쓴 첫 교시를 펼치고 "채점은 다 쓴 뒤에 해요", 채점 칸은 접은 채
    scene('2026-10-31T13:00:00', ST); pe.goTab('today'); await sleep(40); pe.planToday(SAT); pe.taskGo('mock.g:' + MD); await sleep(60);
    ok(H() === MH && steps() === '●1교시 ○2교시 ○채점' && /채점은 다 쓴 뒤에 해요/.test(T_(V$().querySelector('.mcur .mgn'))) && !V$().querySelector('details.mgrade').open && T_(bar()) === '1교시 시작 · 타이머 100분', '44-5. 채점 줄 → 1교시를 펼치고 "채점은 다 쓴 뒤에 해요"(채점 칸은 접음)');
    pe.goTab('today'); await sleep(40);
    // 44-6. 이번 주 "다음 하나"(목차·쓰기)로 연 숙제 칸: 세트의 핵심(퀴즈 4/5)이 남아도 아래 막대는 그 칸의 "다 했어요"
    { const st = clone(ST); delete st.sp['2026-10-27'].quiz[4]; scene('2026-10-30T20:00:00', st); }
    await show('#week'); click('[data-act="week-next"][data-k="eo"]'); await sleep(60);
    { const fc = V$().querySelector('.hw.focus'), sd = H().split('/')[1], b0 = bar();
      ok(sd === '2026-10-27' && fc && /목차/.test(T_(fc.querySelector('.hwt'))) && /옮겨 적었어요/.test(T_(b0)) && b0.dataset.act === 'hw-bulk' && b0.dataset.ks === 'eo', `44-6. 이번 주 목차 줄 → 10/27 숙제 목차 칸, 아래 막대 "${T_(b0)}"(세트 퀴즈 4/5보다 먼저)`);
      const v = Number(b0.dataset.v); await tap('.nextbar [data-act="hw-bulk"]');
      ok(((pe.S().sp['2026-10-27'] || {}).hw || {}).eo === v && /^다음: 세트 퀴즈 4\/5문/.test(T_(bar())), `44-6. 막대를 누르면 목차 ${v}번을 적고, 그 칸을 다 했으니 이 세트 순서로("${T_(bar())}")`); }
    await show('#week'); click('[data-act="week-next"][data-k="w"]'); await sleep(60);
    ok(/쓰기/.test(T_(bar())) && bar().dataset.act === 'hw-bulk' && V$().querySelector('.hw.focus'), `44-6. 이번 주 쓰기 줄 → 아래 막대 "${T_(bar())}"`);
    pe.goTab('today'); await sleep(40);
    // 44-7. 끝난 화면 안 타이머(④ 논술 25분): "5분 더" 옆에 같은 타이머를 새로 시작하는 보조 "타이머 25분"
    scene('2026-10-29T21:00:00', ST); await show('#set/2026-10-29'); click('[data-act="set-tab"][data-t="essay"]'); await sleep(10);
    await tap('[data-act="tl-start"][data-p="one2"]'); at('2026-10-29T21:26:00'); await sleep(320);
    { const tl = V$().querySelector('.tline'), bs = tl ? [...tl.querySelectorAll('button')] : [];
      ok(tl && tl.classList.contains('end') && T_(tl.querySelector('.tlp')) === '시간이 끝났어요' && bs.length === 2 && bs[0].dataset.act === 'timer-more' && bs[1].dataset.act === 'tl-start' && bs[1].dataset.p === 'one2' && T_(bs[1]) === '타이머 25분' && bs[1].classList.contains('sec'),
        `44-7. ④ 논술 25분이 끝나면 "${tl && T_(tl)}"(5분 더 · 타이머 25분)`); }
    await tap('.tline [data-act="tl-start"]');
    ok(TM.running && TM.preset === 'one2' && TM.remain === 1500 && !TM.ended && T_(V$().querySelector('.tline .tlt')) === '25:00' && V$().querySelectorAll('.tline button').length === 1, '44-7. "타이머 25분" → 25분 타이머를 새로(끝난 표시 없음)');
    // 펼친 숙제 단답 카드의 10분 타이머도 같게(끝나면 "5분 더 · 타이머 10분")
    scene('2026-10-29T07:40:00', ST); await show('#today'); click('#view [data-task="hw.dd:2026-10-29"]'); await sleep(60);
    click('.hw.focus [data-act="tl-start"][data-p="one1"]'); await sleep(20); at('2026-10-29T07:51:00'); await sleep(320);
    { const tl = V$().querySelector('.hw.focus .steps3 .tline[data-timer="one1"]'), bs = tl ? [...tl.querySelectorAll('button')].map(b => b.dataset.act + ':' + (b.dataset.p || '') + ':' + T_(b)) : [];
      ok(tl && tl.classList.contains('end') && bs.join() === 'timer-more::5분 더,tl-start:one1:타이머 10분' && TM.ctx.kind === 'dd', `44-7. 숙제 단답 10분이 끝나면 카드 안 타이머에 ${bs.join(' · ')}`); }
    click('.hw.focus .steps3 .tline [data-act="tl-start"]'); await sleep(20);
    ok(TM.running && TM.preset === 'one1' && TM.remain === 600 && TM.ctx.kind === 'dd' && !TM.ended, '44-7. "타이머 10분" → 10분 타이머를 새로');
    await show('#timer'); click('[data-act="timer-reset"]'); click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10); pe.goTab('today'); await sleep(40);
  }

  // 45. 점검 고침(화면 이동·창·집중 모드, 시계 고정): 교시 시간이 창(낱말 풀이) 아래서 끝나면 아래 화면만 다시 그려 집중 모드를 끄고 알림,
  //     그 창을 사용자가 닫으면(바깥·왼쪽 가장자리 밀기) 시간 끝 창. 점수 칸을 쓰는 중에 끝나면 쓰던 칸 그대로 집중 모드 표시만 끔(3-4).
  //     오늘 줄로 펼친 숙제 카드에서 답안지로 갔다가 위로 오면 그 카드를 다시 보여 줌(3-5)
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), H = () => w.location.hash, tap = async s => { click(s); await sleep(60); };
    const TM = pe.TM(), MD = '2026-10-31', MH = '#mock/' + MD, mw = () => d.querySelector('#modal-wrap'), up = () => T_(d.querySelector('.topbar .back')), foc = () => d.body.classList.contains('focus'), toastT = () => d.querySelector('#toast').textContent;
    const edgeSw = async () => { const a = new w.Event('touchstart', { bubbles: true }); a.touches = [{ clientX: 6, clientY: 300 }]; V$().dispatchEvent(a); const b = new w.Event('touchend', { bubbles: true }); b.changedTouches = [{ clientX: 150, clientY: 300 }]; V$().dispatchEvent(b); await sleep(60); };
    scene('2026-10-31T09:00:00', ST); pe.goTab('practice'); await sleep(40); await show(MH); await tap('.nextbar [data-act="mock-start"][data-k="p1"]');
    ok(TM.running && TM.ctx.pk === 'p1' && foc() && up() === '닫기', '(준비) 연습 → 모의 1교시 시작(집중 모드, 위쪽 "닫기")');
    pe.glOpen('콘크리트'); await sleep(10); const gl = mw().innerHTML;
    ok(gl && !/시간 끝/.test(mw().textContent), '(준비) 낱말 풀이 창을 연 채');
    at('2026-10-31T10:41:00'); await sleep(320);
    ok(!TM.running && TM.ended && !TM.ended.seen && !foc() && up() === '연습' && mw().innerHTML === gl && /1교시 시간이 끝났어요/.test(toastT()), `45-1. 창 아래서 1교시 시간 끝 → 아래 화면을 다시 그려 집중 모드를 끔(아래 탭, 위쪽 "${up()}"), 창은 그대로, 알림`);
    click('#modal-wrap .modal'); await sleep(20);
    ok(/시간 끝 · 1교시/.test(mw().textContent) && TM.ended.seen, '45-1. 그 창을 바깥을 눌러 닫으면 시간 끝 창');
    click('#modal-wrap [data-act="sheet-close"]'); await sleep(20);
    ok(!mw().innerHTML && H() === MH && T_(V$().querySelector('.nextbar .btn')) === '1교시 다 썼어요', '45-1. 시간 끝 창 닫기 → 그 모의 화면(다시 뜨지 않음, 아래 막대 "1교시 다 썼어요")');
    await tap('.nextbar [data-act="mock-part"]'); await tap('.nextbar [data-act="mock-start"]');
    ok(TM.running && TM.ctx.pk === 'p2' && foc(), '(준비) 1교시 다 썼어요 → 2교시 시작');
    pe.glOpen('콘크리트'); await sleep(10); at('2026-10-31T11:32:00'); await sleep(320);
    ok(!foc() && TM.ended && !TM.ended.seen && !/시간 끝/.test(mw().textContent), '45-2. 2교시도 창 아래서 끝 → 집중 모드 끔, 시간 끝 창은 아직');
    await edgeSw();
    ok(/시간 끝 · 2교시/.test(mw().textContent) && TM.ended.seen && H() === MH, '45-2. 왼쪽 가장자리 밀기로 그 창을 닫으면 시간 끝 창(화면은 그대로)');
    click('#modal-wrap [data-act="timer-more"]'); await sleep(20);
    ok(TM.running && TM.remain === 300 && foc() && up() === '닫기', '(준비) 5분 더 → 다시 집중 모드');
    const gf = V$().querySelector('details.mgrade'); gf.open = true; const si = V$().querySelector('[data-act="mock-score"][data-k="p1"]'); si.focus(); const vh = V$().innerHTML;
    at('2026-10-31T11:38:00'); await sleep(320);
    ok(!TM.running && d.activeElement === si && V$().querySelector('[data-act="mock-score"][data-k="p1"]') === si && !foc() && up() === '연습' && !mw().innerHTML && /2교시 시간이 끝났어요/.test(toastT()), `45-3. 점수 칸을 쓰는 중 시간 끝 → 다시 그리지 않고(쓰던 칸 그대로) 집중 모드 표시만 끔(위쪽 "${up()}"), 알림`);
    si.blur(); pe.render(); await sleep(10);
    ok(/시간 끝 · 2교시/.test(mw().textContent), '45-3. 다음에 그릴 때 시간 끝 창');
    click('#modal-wrap [data-act="mock-part"]'); await sleep(20); ok(!mw().innerHTML && !TM.ctx, '(정리) 2교시 다 썼어요');
    await show('#timer'); click('[data-act="timer-reset"]'); click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10); pe.goTab('today'); await sleep(40);
    // 45-4. 목 07:40 오늘 줄 "단답 1문제" → 펼친 단답 카드 → 답안지 → ‹ 세트: 그 카드를 다시 가운데로(맨 위로 가서 카드가 화면 밖에 남지 않게)
    scene('2026-10-29T07:40:00', ST); await show('#today'); click('#view [data-task="hw.dd:2026-10-29"]'); await sleep(60);
    const fc0 = V$().querySelector('.hw.focus'), bar0 = T_(V$().querySelector('.nextbar .btn'));
    ok(H() === '#set/2026-10-29' && fc0 && /단답/.test(bar0), `(준비) 오늘 줄 → 세트 숙제 단답 카드 펼침(아래 막대 "${bar0}")`);
    { const calls = [], si0 = w.HTMLElement.prototype.scrollIntoView, st0 = w.scrollTo;
      w.HTMLElement.prototype.scrollIntoView = function (o) { calls.push(['into', this.className, o && o.block]); }; w.scrollTo = (x, y) => { calls.push(['to', y]); };
      await tap('.hw.focus [data-act="go"][data-h^="dandap/"]');
      ok(/^#dandap\//.test(H()) && up() === '세트', '(준비) 펼친 카드의 답안지(위쪽 "세트")');
      calls.length = 0; await tap('.topbar [data-act="back"]');
      const fc = V$().querySelector('.hw.focus');
      ok(H() === '#set/2026-10-29' && fc && calls.some(c => c[0] === 'into' && /\bhw\b/.test(c[1]) && /\bfocus\b/.test(c[1]) && c[2] === 'center') && T_(V$().querySelector('.nextbar .btn')) === bar0, `45-4. ‹ 세트 → 펼친 숙제 카드를 다시 가운데로(아래 막대 그대로 "${bar0}")`);
      w.HTMLElement.prototype.scrollIntoView = si0; w.scrollTo = st0; }
    pe.goTab('today'); await sleep(40);
  }

  // 46. 점검 고침 2(시계 고정): 이번 주 탭의 파란 버튼은 지금 할 수 있는 줄만(아직 오지 않은 세트·모의, 일요일까지 돌아올 세트 복습만 남은 줄은 건너뛰고, 없으면 자유 연습),
  //     받아 오는 동안(앱을 열 때·앞으로 올 때)은 오늘 몫을 고정하지 않고 받아 온 자료로 고정, 늦게 온 세트 뒤에 남은 바닥 단답 줄은 이름·갈 곳 그대로
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), H = () => w.location.hash, tap = async s => { click(s); await sleep(60); }, sbtn = () => V$().querySelector('.score .btn');
    const upTo = (d, m) => { const X = clone(FIX); Object.keys(X.sets).forEach(k => { if (k > d) delete X.sets[k]; }); Object.keys(X.mocks).forEach(k => { if (k > m) delete X.mocks[k]; }); return X; };
    // 46-1. 목 22:00 오늘 몫을 다 함(10/30 세트·10/31 모의는 아직 안 옴): 핵심 줄(남은 세트가 아직 안 옴)·모의 줄(아직 안 옴)을 건너뛰고 지금 할 수 있는 단답 숙제(10/26)
    scene('2026-10-29T07:40:00', ST, upTo(THU, '2026-10-24')); applyRows(pe.planToday(THU).rows, THU); at('2026-10-29T22:00:00'); await show('#week');
    const b1 = sbtn();
    ok(pe.planToday(THU).rows.every(r => r.done) && b1 && b1.dataset.act === 'week-next' && b1.dataset.k === 'dd' && T_(b1) === '다음: 단답 손글씨 · 10/26(월) 세트', `46-1. 목 22:00 오늘 몫 끝: 이번 주 파란 버튼 "${T_(b1)}"(오지 않은 세트의 핵심·모의 줄은 건너뜀)`);
    await tap('.score .btn'); ok(H() === '#set/2026-10-26' && V$().querySelector('.hw.focus [data-k^="dd"]'), '46-1. 누르면 10/26 숙제의 단답 카드(알림만 뜨는 막다른 버튼이 아님)');
    // 46-2. 월 22:30 오늘 몫을 다 했고 이번 주에 지금 할 일이 없음(모의는 토요일, 세트 복습은 내일, 손글씨 필수 다 함): 파란 버튼은 오늘의 "오늘 몫 끝"처럼 자유 연습
    const MO = '2026-10-26'; scene('2026-10-26T07:00:00', EMPTY, upTo(MO, '2026-10-24')); applyRows(pe.planToday(MO).rows, MO); at('2026-10-26T22:30:00'); await show('#week');
    const b2 = sbtn(), wl = pe.wkLines(pe.planToday(MO), pe.weekBoard(MO), MO).filter(l => !l.done && !l.xt && !l.pin && !l.tick).map(l => l.k).join();
    ok(pe.planToday(MO).rows.every(r => r.done) && b2 && b2.dataset.act === 'start-free' && T_(b2) === '연습에서 자유 연습' && prim().filter(b => b.closest('.score')).length === 1, `46-2. 월 22:30 지금 할 이번 주 일이 없으면 파란 버튼 "${T_(b2)}"(남은 줄 ${wl}은 지금 할 수 없음)`);
    await tap('.score .btn'); ok(H() === '#sess' && pe.SES(), '46-2. 누르면 자유 연습'); await show('#today'); pe.goTab('today'); await sleep(40);
    // 46-3. 앞으로 올 때(visibilitychange): 08:50 세트 전(고정 안 함) → 그사이 저장소에 오늘 세트가 올라옴 → 09:30에 다시 열면 받아 오는 동안 고정하지 않고, 받아 온 세트로 고정
    const noThu = upTo('2026-10-28', '2026-10-24'); scene('2026-10-29T08:50:00', ST, noThu); await show('#today');
    ok(!pe.S().today, '(준비) 목 08:50 세트 전: 오늘 몫을 고정하지 않음');
    at('2026-10-29T09:30:00'); pe.S().sync = {}; SERVER = upTo(THU, '2026-10-24'); w.PE_IO._wake(); const F0 = pe.S().today;
    await sleep(120); const F1 = pe.S().today;
    ok(F0 === null && F1 && /^1\|/.test(F1.sig) && F1.at === '09:30' && F1.rows.some(r => r.id === 'set.read:' + THU) && !F1.rows.some(r => /^q\.dd:/.test(r.id)) && pe.SETS().sets[THU],
      `46-3. 09:30 앞으로 오면 받아 오는 동안 고정하지 않고(${F0 ? F0.sig : 'null'}), 받아 온 오늘 세트로 고정(${F1 && F1.sig}, 세트 없을 때의 바닥 단답 없음)`);
    SERVER = null;
    // 46-4. 앱을 처음 열 때(새 화면): 오래된 저장(오늘 세트 없음)으로 첫 화면을 그려도 고정하지 않고, 받아 온 뒤 오늘 세트로 고정(12:30, 세트가 늦은 날의 9시 규칙은 받아 온 뒤에도 없을 때만)
    { const T = new Date('2026-10-29T12:30:00').getTime(), errs = [], srv = upTo(THU, '2026-10-24');
      const dm = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://gisulsa-boot.test/',
        beforeParse(w2) { const RD = w2.Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(T); else super(...a); } static now() { return T; } } w2.Date = FD;
          const st = clone(ST); st.tk = { 'seen:v3': '2026-10-28' }; w2.localStorage.setItem('pe_state_v1', JSON.stringify(st)); w2.localStorage.setItem('pe_sets_v1', JSON.stringify(noThu));
          w2.fetch = async url => { const m = String(url).match(/gisulsa-data\/main\/(data\/[^?]+)/), f = m && m[1], i = { v: 1, updated: '2026-10-29T06:30:00+09:00', sets: Object.keys(srv.sets).sort().map(d => ({ d, rev: 1 })), mocks: Object.keys(srv.mocks).sort().map(d => ({ d, rev: 1 })) };
            const ms = f && /^data\/(sets|mocks)\/(.+)\.json$/.exec(f), o = f === 'data/index.json' ? i : ms ? srv[ms[1]][ms[2]] : null;
            if (o) { const t = JSON.stringify(o); return { ok: true, status: 200, json: async () => JSON.parse(t) }; } return { ok: false, status: 404, json: async () => ({}) }; };
          w2.console.error = (...a) => errs.push(a.join(' ')); } });
      const w2 = dm.window; w2.scrollTo = () => {}; w2.HTMLElement.prototype.scrollIntoView = function () {};
      const S2 = w2.__pe.S(), first = S2.today, card = T_(w2.document.querySelector('#view .pinfo'));
      await sleep(200); const F = w2.__pe.S().today;
      ok(first === null && F && /^1\|/.test(F.sig) && F.at === '12:30' && F.rows.some(r => r.id === 'set.read:' + THU) && !F.rows.some(r => /^q\.dd:/.test(r.id)) && w2.location.hash === '#today',
        `46-4. 앱을 열 때 받아 오기 전 첫 화면은 고정하지 않고(첫 화면 "${card}"), 받아 온 오늘 세트로 고정(${F && F.sig}, 바닥 단답 없음)`);
      ok(!errs.length, '46-4. 새로 연 앱 콘솔 오류 없음 ' + errs.slice(0, 2).join(' | ')); w2.close(); }
    // 46-5. 세트가 정말 늦은 날(9시 넘어 세트 없이 고정한 뒤 세트가 옴): 남은 바닥 단답 줄은 "단답 손글씨 1문 · 10/26(월)", 누르면 10/26 숙제의 단답 카드
    scene('2026-10-29T09:10:00', ST, noThu); pe.planToday(THU); pe.SETS().sets[THU] = clone(FIX.sets[THU]); pe.invalidate(); at('2026-10-29T09:40:00'); await show('#today');
    const qr = V$().querySelector('[data-task="q.dd:2026-10-26"]');
    ok(qr && /단답 손글씨 1문/.test(T_(qr)) && /10\/26\(월\)/.test(T_(qr)) && !/끝낸 일/.test(T_(qr)) && !qr.classList.contains('done'), `46-5. 세트가 온 뒤 남은 바닥 단답 줄 "${T_(qr)}"("끝낸 일"이 아님)`);
    pe.taskGo('q.dd:2026-10-26'); await sleep(60);
    ok(H() === '#set/2026-10-26' && V$().querySelector('.hw.focus [data-k^="dd"]') && /다 썼어요 · 10\/26\(월\) 단답 1문/.test(T_(V$().querySelector('.nextbar .btn'))), '46-5. 그 줄을 누르면 10/26 숙제의 단답 카드(아래 막대 "다 썼어요 · 10/26(월) 단답 1문")');
    pe.goTab('today'); await sleep(40);
  }

  // 47. 점검 고침 2(작은 것, 시계 고정): 모의 교시 타이머가 돌면 오늘 줄은 "이어서 · 1교시", 숙제 필수를 다 하면 머리 "n/n ✓"(약 0분 없음)·달력 "· 필수 ✓",
  //     지난주 기록의 놓아준 것 안내는 놓아준 것이 있을 때만(마감 옆에 그 주 목표 수), 복습 탭 지난 세트에 오늘 세트 없음, 기록을 만들기 전에 끝난 주는 고정하지 않음,
  //     토요일 모의를 기다리는 글은 시각마다 하나, 받아 오는 상태는 카드 하나·버튼 하나(받아 오는 중·실패, 한국어 이유), 복원은 모의의 고른 교시·연 목차(SV)를 비움
  {
    const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), H = () => w.location.hash, tap = async s => { click(s); await sleep(60); }, TM = pe.TM(), MD = '2026-10-31';
    const upTo = (dd, m) => { const X = clone(FIX); Object.keys(X.sets).forEach(k => { if (k > dd) delete X.sets[k]; }); Object.keys(X.mocks).forEach(k => { if (k > m) delete X.mocks[k]; }); return X; };
    // 47-1. 토 08:00 오늘 "1교시 시작" → 모의 화면에서 1교시 타이머 시작 → 오늘로: 그 줄은 "이어서 · 1교시"(09:00 안내 없음), 누르면 그 모의 화면
    scene('2026-10-31T08:00:00', ST); pe.goTab('today'); await sleep(40); await show('#today');
    ok(T_(V$().querySelector('.prow.now .btn')) === '1교시 시작' && /09:00에 시작하면 실제 시험과 같아요/.test(T_(V$().querySelector('.prow.now'))), '(준비) 토 08:00 오늘 첫 줄 "1교시 시작"');
    await tap('.prow.now .btn'); await tap('.nextbar [data-act="mock-start"]'); ok(TM.running && TM.ctx && TM.ctx.pk === 'p1', '(준비) 모의 화면에서 1교시 타이머 시작');
    pe.goTab('today'); await sleep(40); const rn = V$().querySelector('.prow.now');
    ok(rn && rn.dataset.task === 'mock:' + MD + ':p1' && T_(rn.querySelector('.btn')) === '이어서 · 1교시' && !/09:00에 시작하면/.test(T_(rn)), `47-1. 1교시 타이머가 도는 동안 오늘 줄 "${T_(rn && rn.querySelector('.btn'))}"(시작이라고 하지 않음, 09:00 안내 없음)`);
    await tap('.prow.now .btn'); ok(H() === '#mock/' + MD && V$().querySelector('.mcur .tline[data-timer="p1"]') && TM.running, '47-1. 누르면 도는 1교시 타이머가 있는 모의 화면');
    await show('#timer'); click('[data-act="timer-reset"]'); click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10); pe.goTab('today'); await sleep(40);
    // 47-2. 숙제 필수를 다 한 세트: ③ 숙제 "필수" 머리는 "n/n ✓"("약 0분" 없음), 전체 머리도 남은 분이 없으면 분을 쓰지 않음
    scene('2026-10-29T07:40:00', ST); applyRows(pe.planToday(THU).rows, THU); pe.SV()[THU] = 'tasks'; await show('#set/' + THU);
    const hm = T_(V$().querySelector('.hwsh .meta'));
    ok(pe.reqParts(THU).every(p => p.done) && /^\d+\/\d+ ✓$/.test(hm) && !/약 0분/.test(T_(V$().querySelector('.hwhd'))), `47-2. 필수를 다 하면 ③ 숙제 필수 머리 "${hm}"(약 0분 없음)`);
    // 47-3. 달력: 그 종류의 필수 칸을 다 했으면 학원 횟수 옆에 "· 필수 ✓"(목차 필수 2번만 쓴 날: 숙제(논술) 0/n · 필수 ✓)
    scene('2026-10-29T20:00:00', ST); pe.SV()[THU] = 'tasks'; await show('#set/' + THU); await tap(`[data-act="hw"][data-d="${THU}"][data-k="eo"][data-v="2"]`);
    const ce = (((pe.S().cal[THU] || {}).x || {})['hwe:' + THU] || [])[1] || '';
    ok(/^10월 29일 숙제\(논술\) 0\/\d+ · 필수 ✓$/.test(ce), `47-3. 목차 필수 2번을 쓰면 달력 "${ce}"`);
    await tap(`[data-act="hw"][data-d="${THU}"][data-k="eo"][data-v="2"]`); const ce2 = (((pe.S().cal[THU] || {}).x || {})['hwe:' + THU] || [])[1] || '';
    ok(/^10월 29일 숙제\(논술\) 0\/\d+$/.test(ce2), `47-3. 하나 빼면(필수 1/2) 달력 "${ce2}"(필수 ✓ 없음)`);
    // 47-4. 지난주 기록 창: 놓아준 것이 없으면 놓아준 것 안내 없음, 마감 옆에 그 주 목표 수
    scene('2026-11-02T07:30:00', ST); pe.planToday(MON); const lx = pe.S().wk['2026-10-26'], rel0 = lx.rel; lx.rel = [];
    const sh = pe.lastWeekSheet('2026-10-26'), gn = (pe.weekObj(pe.weekIndex('2026-10-26')).goals || []).length;
    ok(!/놓아준 것은 빚이 아니에요/.test(sh) && !/놓아준 것/.test(sh) && new RegExp(`마감 \\d+/\\d+</span> <span class="nw">· 그 주 목표 0/${gn}</span>`).test(sh), `47-4. 놓아준 것이 없는 지난주 기록: 놓아준 것 안내 없음, "마감 n/5 · 그 주 목표 0/${gn}"`);
    lx.rel = rel0; ok(/놓아준 것은 빚이 아니에요/.test(pe.lastWeekSheet('2026-10-26')), '47-4. 놓아준 것이 있으면 안내 그대로');
    // 47-5. 복습 탭 "지난 세트"에는 오늘 세트가 없음(오늘 세트는 오늘 화면에서)
    scene('2026-10-29T22:00:00', ST); pe.planToday(THU); pe.goTab('review'); await sleep(40);
    const pst = [...V$().querySelectorAll('.sec')].find(x => /지난 세트/.test(T_(x.querySelector('.sec-h, h2')))), pd = pst ? [...pst.querySelectorAll('[data-act="rev-open"]')].map(b => b.dataset.d) : [];
    ok(pst && pd.length && !pd.includes(THU) && pd.every(x => x < THU), `47-5. 지난 세트 ${pd.join(',')}(오늘 ${THU} 없음)`);
    pe.goTab('today'); await sleep(40);
    // 47-6. 기록을 만들기 전에 끝난 주는 고정하지 않음(새로 설치·초기화한 화요일: 지난주 기록·월요일 안내 없음). 그 주에 쓰던 기록이면 그대로 고정
    { const stN = clone(BLANK); stN.created = '2026-11-03'; scene('2026-11-03T09:30:00', stN); pe.planToday('2026-11-03');
      ok(!(pe.S().wk['2026-10-26'] || {}).at && !pe.monNotice('2026-11-03'), '47-6. 11/3에 만든 기록: 그 전에 끝난 주(10/26~11/1)는 고정하지 않음, "지난주 기록" 안내 없음');
      const stO = clone(BLANK); stO.created = '2026-10-19'; scene('2026-11-03T09:30:00', stO); pe.planToday('2026-11-03');
      ok((pe.S().wk['2026-10-26'] || {}).at === '2026-11-03' && pe.monNotice('2026-11-03'), '47-6. 10/19부터 쓴 기록: 지난주를 고정하고 화요일까지 안내'); }
    // 47-7. 모의가 아직 없는 토요일: 06:21 전 "토 06:21에 와요" · 06:21~9시 "만드는 중 · 보통 30분 안에 와요" · 9시 뒤 "아직 없어요"(오늘 안내 줄·이번 주 줄·날마다가 같은 글)
    { const X = upTo('2026-10-30', '2026-10-24'), wm = () => pe.taskList(SAT).find(x => x.id === 'wait.mock'), ml = () => (pe.wkLines(pe.planToday(SAT), pe.weekBoard(SAT), SAT).find(l => l.k === 'mock') || {}).next, sat = () => T_([...V$().querySelectorAll('.drow')].find(r => /^토 /.test(T_(r.querySelector('.dl')))));
      scene('2026-10-31T06:00:00', ST, X); await show('#week');
      ok(wm().label === '주간 모의고사를 기다리는 중' && wm().sub === '토요일 06:21에 만들기 시작해요.' && ml() === '토 06:21에 와요', `47-7. 06:00: "${wm().sub}" · 이번 주 줄 "${ml()}"`);
      at('2026-10-31T08:00:00'); await show('#week');
      ok(wm().sub === '만드는 중이에요. 보통 30분 안에 와요.' && ml() === '만드는 중 · 보통 30분 안에 와요' && /주간 모의고사 · 만드는 중 · 보통 30분 안에 와요/.test(sat()), `47-7. 08:00: 06:21이 지난 글 없음("${ml()}", 날마다 "${sat()}")`);
      at('2026-10-31T09:10:00'); await show('#today'); const pi = [...V$().querySelectorAll('.pinfo')].find(x => /모의/.test(T_(x)));
      ok(wm().label === '주간 모의고사가 아직 없어요 · 밀린 것부터 해요' && !wm().sub && pi && pi.querySelector('[data-act="sync"]') && !/기다리는 중|06:21/.test(T_(pi)), `47-7. 09:10 오늘 안내 줄 "${T_(pi)}"(지금 받아 오기)`);
      await show('#week'); ok(ml() === '이번 주 모의고사가 아직 없어요' && /주간 모의고사가 아직 없어요/.test(sat()), `47-7. 09:10 이번 주 줄 "${ml()}", 날마다 "${sat()}"`); pe.goTab('today'); await sleep(40); }
    // 47-8. 받은 세트가 없을 때 받아 오기 상태는 카드 하나·버튼 하나: 실패하면 "받아 오지 못했어요 — 인터넷 연결을 확인하세요 · 다시 받아 오기"(따로 뜨는 실패 줄 없음),
    //       누르면 그 버튼이 "받아 오는 중…"(누를 수 없음). 세트 보관함의 이유는 한국어, 마지막 확인이 오늘이 아니면 날짜도
    { scene('2026-11-03T10:00:00', BLANK, { sets: {}, mocks: {} }); pe.S().sync = { last: NOW, ok: false, err: 'Failed to fetch' }; await show('#today');
      const nc = V$().querySelector('.norows'), sb = () => [...V$().querySelectorAll('[data-act="sync"]')];
      ok(nc && /아직 받은 세트가 없어요/.test(T_(nc)) && /받아 오지 못했어요 — 인터넷 연결을 확인하세요/.test(T_(nc)) && sb().length === 1 && T_(sb()[0]) === '다시 받아 오기' && !V$().querySelector('.syncfail') && prim().length === 1,
        `47-8. 받아 오기 실패: 카드 하나("${T_(nc)}")에 받아 오기 버튼 하나`);
      click('.norows [data-act="sync"]'); const b0 = sb()[0];
      ok(sb().length === 1 && b0 && T_(b0) === '받아 오는 중…' && b0.disabled, '47-8. 누르면 바로 "받아 오는 중…"(누를 수 없음)');
      await sleep(120); ok(sb().length === 1 && T_(sb()[0]) === '지금 받아 오기' && !sb()[0].disabled && pe.S().sync.ok === true, '47-8. 받아 온 뒤 다시 "지금 받아 오기"');
      const sl = () => T_(V$().querySelector('.syncline'));
      pe.S().sync = { last: NOW - 3 * 864e5, ok: true }; await show('#archive'); ok(sl() === '마지막 확인 10/31 10:00, 받은 세트 0개', `47-8. 세트 보관함: 오늘이 아니면 날짜도 "${sl()}"`);
      pe.S().sync = { last: NOW, ok: true }; pe.render(); await sleep(10); ok(sl() === '마지막 확인 10:00, 받은 세트 0개', `47-8. 오늘이면 시각만 "${sl()}"`);
      pe.S().sync = { last: NOW, ok: false, err: 'Failed to fetch' }; pe.render(); await sleep(10); ok(sl() === '받아 오지 못했어요 — 인터넷 연결을 확인하세요' && !/Failed/.test(sl()), `47-8. 실패 이유는 한국어 "${sl()}"`);
      pe.S().sync = { last: NOW, ok: false, err: 'HTTP 404' }; pe.render(); await sleep(10); ok(sl() === '받아 오지 못했어요(저장소 응답 404) — 잠시 뒤 다시 받아 오세요', `47-8. "${sl()}"`);
      pe.goTab('today'); await sleep(40); }
    // 47-9. 복원은 그 기록에 묶인 모의 화면 값(고른 교시 mkw:, 연 키워드·목차 mk:)을 비움: 연습에서 연 10/31 모의의 2교시를 고르고 열어본 뒤 복원 → 1교시부터, 열기 버튼부터
    { scene('2026-10-31T10:00:00', ST); pe.goTab('practice'); await sleep(40); await show('#mock/' + MD);
      await tap('[data-act="mock-pick"][data-k="p2"]'); await tap('[data-act="mock-reveal"]');
      ok(pe.mockStep(MD).cur === 'p2' && V$().querySelector('.mrev .group.plain'), '(준비) 연습에서 연 모의: 2교시를 고르고 키워드·목차를 엶');
      const bk = JSON.stringify({ state: pe.S(), sets: pe.SETS() }); await go('#backup'); d.querySelector('#restoreText').value = bk; click('[data-act="restore"]'); await sleep(80);
      await show('#mock/' + MD); ok(pe.mockStep(MD).cur === 'p1' && !V$().querySelector('.mrev .group.plain') && V$().querySelector('.mrev [data-act="mock-reveal"]'), '47-9. 복원 뒤 그 모의는 안 쓴 첫 교시(1교시)부터, 열어보기는 다시 "열기" 버튼부터');
      pe.goTab('today'); await sleep(40); }
  }

  // 48. 점수 칸을 반올림해도 합이 머리 숫자와 같음(스크린샷 검토: 8+0+6+4+0=18인데 "지금 17%"), 줄이 "·"로 시작하지 않음
  { const r = pe.rParts([7.5, 0, 6, 3.8, 0], 17); ok(JSON.stringify(r) === '[7,0,6,4,0]' && r.reduce((a, b) => a + b, 0) === 17, '48-1. 칸 합 = 머리 숫자 ' + r);
    const r2 = pe.rParts([33.33, 33.33, 33.34]); ok(r2.reduce((a, b) => a + b, 0) === 100 && r2.every(x => x === 33 || x === 34), '48-2. 머리 숫자가 없으면 합을 반올림 ' + r2);
    ok(JSON.stringify(pe.rParts([0, 0, 0], 0)) === '[0,0,0]' && JSON.stringify(pe.rParts([2.6, 2.6], 4)) === '[2,2]', '48-3. 빈 주·머리 숫자가 칸 내림 합보다 작을 때도 맞춤');
    scene('2026-10-31T08:00:00', ST); pe.goTab('week'); await sleep(40);
    const sc4 = V$().querySelector('.score .sc4'), head = V$().querySelector('.score .sc3 span');
    if (sc4 && head) { const nums = [...sc4.querySelectorAll('.nw')].map(e => e.textContent).filter(t => !/목표/.test(t)).map(t => +t.match(/(\d+)\//)[1]);
      ok(nums.reduce((a, b) => a + b, 0) === +head.textContent.match(/\d+/)[0], '48-4. 이번 주 점수 카드: 칸 합 = 지금 %');
      ok(!/ · /.test(sc4.innerHTML.replace(/&nbsp;/g, '\u00a0').replace(/\u00a0· /g, '')), '48-5. 칸 사이 "·" 앞은 붙는 칸(줄 첫머리에 "·"가 오지 않음)'); }
    else ok(false, '48-4. 이번 주 점수 카드가 없음');
    pe.goTab('today'); await sleep(40); }

  // 49~54. 쉬는 날과 앞날 셈(v3.1, 시계 고정): 2주차 11/02~11/08(1단계, 세트 11/02~11/06, 모의 11/07 1교시 + 논술 2문). 월·화는 계획대로
  { const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), mw = () => d.querySelector('#modal-wrap'), toastT = () => d.querySelector('#toast').textContent;
    const W2 = '2026-11-02', DAYS = [0, 1, 2, 3, 4, 5, 6].map(i => add(W2, i)), [, , WE2, TH2, FR2, SA2, SU2] = DAYS;
    const SETS2 = clone(FIX); DAYS.slice(0, 5).forEach(x => SETS2.sets[x] = cloneSet(x, 2, refsFor(1))); SETS2.mocks[SA2] = cloneMock(SA2, { p1: clone(MOCK0.p1), p2: P2_2 });
    const before = (X, x) => { const a = { sets: {}, mocks: {} }; Object.keys(X.sets).filter(k => k < x).forEach(k => a.sets[k] = X.sets[k]); Object.keys(X.mocks).filter(k => k < x).forEach(k => a.mocks[k] = X.mocks[k]); return a; };
    const arrive = (X, x) => { const Y = pe.SETS(); if (X.sets[x]) Y.sets[x] = clone(X.sets[x]); if (X.mocks[x]) Y.mocks[x] = clone(X.mocks[x]); pe.invalidate(); };
    // 날마다 07:00 세트·모의 도착 → hook → planToday → 건너뛰지 않으면 다 함 → 22:00 점수. until: 그날 07:00 hook 뒤 멈춤(오늘 몫을 고정하기 전)
    const runW2 = (opt, X, W, st) => { opt = opt || {}; X = X || SETS2; W = W || W2; const DS = [0, 1, 2, 3, 4, 5, 6].map(i => add(W, i)); scene(W + 'T07:00:00', st || ST, before(X, W)); const res = {};
      for (const day of DS) { at(day + 'T07:00:00'); arrive(X, day); if (opt.decl && opt.decl[day]) Object.assign(pe.S().days = pe.S().days || {}, opt.decl[day]); if (opt.hook) opt.hook(day); if (opt.until === day) return res;
        const V = pe.planToday(day); res[day] = { plan: mins(V), V, lv: pe.S().today.lv }; if (!(opt.skip || []).includes(day)) applyRows(V.rows, day);
        at(day + 'T22:00:00'); res[day].pct = pe.weekBoard(day).pct; }
      at(add(W, 7) + 'T07:00:00'); res.snap = pe.weekSnap(add(W, 7)); return res; };
    const loads = A => A.out.map(x => x.load), dls = od => Object.keys(od.dl).filter(k => od.dl[k]).map(k => k.slice(5) + ' ' + od.dl[k]).join(' · ');
    // 계산의 필수 분(앞날 셈과 견줄 것): 모의·채점·밀린 세트·손글씨 몫(q.dd·q.eo·q.w)·리포트·세트 핵심 + 필수 세트 복습. 명세 §8.1의 /…|q\.|…:/는 "q.dd:"에 맞지 않아 q\.\w+로 씀
    const cm = V => V.rows.filter(r => /^(mock|mock\.g|late|q\.\w+|report|set\.read|set\.quiz):/.test(r.id) || /^rev:/.test(r.id) && r.task && r.task.need === '필수').reduce((a, r) => a + r.m, 0);

    // 49. 오늘 쉬는 날(수 11/04 07:00)
    runW2({ until: WE2 });
    { const B = pe.weekBoard(WE2), A = pe.wkAhead(WE2);
      ok(B.B === 426 && B.C === 1080 && B.lv === 0 && B.pct === 27 && JSON.stringify(loads(A)) === '[76,76,84,196,18]' && A.sp === 0, `49-1. 수 07:00: B ${B.B} / C ${B.C} · 단계 ${B.lv} · 지금 ${B.pct}%, 앞날 ${loads(A)} · 못 넣는 것 ${A.sp}`);
      const od = pe.offDelta(WE2, WE2);
      ok(od.dl[TH2] === 31 && od.dl[FR2] === 8 && od.dl[SA2] === 29 && od.dl[SU2] === 8 && od.sp === 0 && !od.cutFrom, `49-2. 오늘 쉬면: ${dls(od)} · 못 넣는 것 ${od.sp} · 줄인 목표 ${od.cutFrom}`);
      await show('#today'); const id0 = pe.S().today.rows.map(r => r.id).join();
      click('[data-act="cap"]'); await sleep(10); const mt = T_(mw());
      ok(/오늘 쉬면 → 목 \+31분 · 금 \+8분 · 주말 \+37분/.test(mt) && /이번 주 안에 다 따라잡아요 · 시험 일정은 그대로예요/.test(mt) && /말하기·자기 전은 오늘만이라 놓아줘요/.test(mt)
        && mw().querySelectorAll('[data-act="cap-set"]').length === 4 && mw().querySelectorAll('[data-act="cap-off"]').length === 1 && !mw().querySelectorAll('.btn:not(.sec):not(.ghost)').length, `49-3. 오늘 시간 창: "${mt.slice(0, 160)}"`);
      click('#modal-wrap [data-act="cap-off"]'); await sleep(30); const S = pe.S(), V = pe.planToday(WE2), B1 = pe.weekBoard(WE2), by = k => V.moved.filter(x => x.dest === k).length;
      ok(S.days[WE2] && S.days[WE2].m === 0 && S.today.rows.length === 0 && B1.C === 900 && !(S.wk[W2] || {}).cut && B1.pct === 27, `49-4. 오늘은 쉬어요: S.days, 오늘 몫 ${S.today.rows.length}줄, C ${B1.C}, 줄인 목표 없음, 지금 ${B1.pct}%`);
      ok(V.moved.length === 10 && by('토요일 따라잡기') === 5 && by('오늘만이라 놓아줘요') === 2 && by('내일 다시 나와요') === 3 && /오늘은 쉬어요/.test(toastT()), `49-4. 옮긴 것 ${V.moved.length}개: ${V.moved.map(x => x.k + '→' + x.dest).join(', ')}`);
      const oc = V$().querySelector('.dcard.off'), p = prim();
      ok(oc && T_(oc.querySelector('h3')) === '오늘은 쉬어요' && T_(oc.querySelector('.ds')) === '목 +31분 · 금 +8분 · 주말 +37분에 나눠 넣었어요' && T_(oc.querySelectorAll('.ds')[1]) === '이번 주 안에 다 따라잡아요 · 시험 일정은 그대로예요'
        && p.length === 1 && p[0].dataset.act === 'off-clear' && T_(p[0]) === '다시 공부할래요' && !V$().querySelector('.blk') && !V$().querySelector('[data-act="plan-reset"]') && /오늘은 쉬는 날/.test(T_(V$().querySelector('.daysum'))), `49-5. 쉬는 날 오늘 화면: "${T_(oc)}"`);
      click('[data-act="cap"]'); await sleep(10); const mt2 = T_(mw());
      ok(/오늘은 쉬는 날이에요\. 시간을 고르면 다시 공부하는 날이 돼요\./.test(mt2) && !/오늘 쉬면/.test(mt2) && mw().querySelector('[data-act="cap-off"].on') && !mw().querySelector('[data-act="cap-set"].on'), '49-5. 쉬는 날의 오늘 시간 창: "오늘은 쉬는 날이에요. 시간을 고르면 다시 공부하는 날이 돼요."(쉬어요가 켜짐)');
      click('#modal-wrap [data-act="sheet-close"]'); await sleep(10);
      click('[data-act="off-clear"]'); await sleep(30); const F = pe.S().today;
      ok(!Object.keys(pe.S().days || {}).length && F.rows.length === 10 && F.rows.reduce((a, r) => a + r.m, 0) === 111 && F.rows.map(r => r.id).join() === id0 && pe.weekBoard(WE2).C === 1080 && /다시 공부하는 날로/.test(toastT()), `49-6. 다시 공부할래요: 같은 10줄 · ${F.rows.reduce((a, r) => a + r.m, 0)}분, C ${pe.weekBoard(WE2).C}`);
      ok(F.v === 2, '49-7. 계획 규칙 판(PLAN_V)은 그대로 2'); }

    // 50. 쉬는 날 다음(수 07:00에 쉬는 날로 정하고 건너뜀)
    { const R = runW2({ decl: { [WE2]: { [WE2]: { m: 0 } } }, skip: [WE2] }), pl = [TH2, FR2, SA2, SU2].map(x => R[x].plan), pc = DAYS.map(x => R[x].pct);
      ok(pl.join() === '149,127,255,26', `50-1. 그 뒤 오늘 몫 목·금·토·일 ${pl.join(' · ')}분 (기록 149 · 127 · 255 · 26)`);
      ok(pc.join() === '13,27,27,47,62,93,98' && pc.every((x, i) => !i || x >= pc[i - 1]), `50-2. 22:00 지금 ${pc.join(' → ')}% (떨어지지 않음)`);
      const sn = R.snap; ok(sn && sn.p === 98 && sn.lv === 0 && !sn.rel.length && sn.off === 1 && sn.gn >= 0 && sn.gd >= 0 && 'left' in sn, `50-3. 지난주 기록 ${JSON.stringify({ p: sn.p, lv: sn.lv, rel: sn.rel, off: sn.off, gn: sn.gn, gd: sn.gd, left: sn.left })}`); }
    runW2({ decl: { [WE2]: { [WE2]: { m: 0 } } }, skip: [WE2], until: TH2 });
    { const A = pe.wkAhead(TH2), c = {}; A.out.filter(x => x.catch).forEach(x => c[x.d] = x.catch);
      ok(JSON.stringify(c) === JSON.stringify({ [TH2]: 15, [SA2]: 37 }), `50-4. 목 07:00 밀린 몫 ${JSON.stringify(c)}`);
      await show('#today'); const cl = V$().querySelector('.wkline.catch');
      ok(cl && T_(cl) === '밀린 몫은 11/7(토)까지 다 따라잡아요' && cl.dataset.h === 'week' && V$().querySelectorAll('.wksec .qline').length <= 4, `50-4. 오늘 "${T_(cl)}", 이번 주 줄 ${V$().querySelectorAll('.wksec .qline').length}개(4개까지)`);
      await show('#week'); const nt = V$().querySelector('.note.wkc');
      ok(nt && T_(nt) === '밀린 몫 → 목 15분 · 토 37분 · 11/7(토)까지 다 따라잡아요', `50-4. 이번 주 날마다 "${T_(nt)}"`); await go('#today'); }
    { const R = runW2({ skip: [WE2] }), pl = [TH2, FR2, SA2, SU2].map(x => R[x].plan);
      ok(pl.join() === '149,127,255,26' && R.snap.p === 98 && R.snap.lv === 0 && !R.snap.rel.length && R.snap.off === 0, `50-5. 정하지 않고 건너뛴 수요일도 같은 오늘 몫 ${pl.join(' · ')} · 기록 ${R.snap.p}%`); }

    // 51. 앞날 셈 = 오늘 몫 계산(같은 규칙)
    { let A; const R = runW2({ skip: [WE2, TH2], hook: x => { if (x === FR2) A = pe.wkAhead(FR2); } }), c = A.out.map(x => x.catch);
      ok(loads(A).join() === '123,248,55' && c.join() === '15,52,37' && Math.abs(cm(R[SA2].V) - 248) <= 5 && Math.abs(cm(R[SU2].V) - 55) <= 5, `51-1. 수·목 건너뜀, 금 07:00 앞날 ${loads(A)} · 밀린 몫 ${c} = 계산 토 ${cm(R[SA2].V)} · 일 ${cm(R[SU2].V)}`); }
    runW2({ skip: [WE2, TH2], until: FR2 }); await show('#today');
    ok(/11\/8\(일\)까지/.test(T_(V$().querySelector('.wkline.catch'))), `51-1. 오늘 "${T_(V$().querySelector('.wkline.catch'))}"`);
    { let A; const R = runW2({ decl: { [WE2]: { [FR2]: { m: 0 } } }, skip: [FR2], hook: x => { if (x === WE2) A = pe.wkAhead(WE2); } });
      ok(A.out[3].load === 272 && A.out[4].load === 26 && cm(R[SA2].V) === 272 && cm(R[SU2].V) === 26, `51-2. 수요일에 금요일을 쉬는 날로: 앞날 토 ${A.out[3].load} · 일 ${A.out[4].load} = 계산 ${cm(R[SA2].V)} · ${cm(R[SU2].V)}`); }
    { let A; const R = runW2({ decl: { [WE2]: { [SA2]: { m: 0 } } }, skip: [SA2], hook: x => { if (x === WE2) A = pe.wkAhead(WE2); } });
      ok(A.out[4].load === 214 && R[SU2].plan === 214 && R.snap.p === 98, `51-3. 토요일을 쉬는 날로: 앞날 일 ${A.out[4].load} = 계산 ${R[SU2].plan}, 그 주 ${R.snap.p}%`); }
    { let A; const R = runW2({ decl: { [TH2]: { [SU2]: { m: 0 } } }, skip: [WE2, TH2, SU2], hook: x => { if (x === FR2) A = pe.wkAhead(FR2); } }), sr = R[SA2].V.rows.find(r => r.id === 'report:' + W2);
      ok(A.out[0].lv === 1 && A.cutFrom === SA2 && A.out[1].load === 221, `51-4. 수·목 건너뛰고 일요일을 쉬는 날로, 금 앞날: 단계 ${A.out[0].lv} · 줄인 목표 ${A.cutFrom}부터 · 토 ${A.out[1].load}`);
      ok(R[FR2].lv === 1 && R[SA2].lv === 2 && R[SA2].plan === 221 && sr && sr.blk === 'catch' && R.snap && R.snap.p === 96 && R.snap.lv === 2 && !R.snap.rel.length, `51-4. 계산: 금 단계 ${R[FR2].lv}, 토 단계 ${R[SA2].lv} · ${R[SA2].plan}분(주간 리포트 따라잡기), 그 주 ${R.snap.p}% 단계 ${R.snap.lv}`);
      runW2({ decl: { [TH2]: { [SU2]: { m: 0 } } }, skip: [WE2, TH2, SU2], until: SA2 }); pe.planToday(SA2); ok((pe.S().wk[W2] || {}).cut === true, '51-4. 토요일 단계 2로 줄인 목표가 걸림'); }
    // 3단계 주(2027-02-22, 기록 없음, 모의 4교시)
    { const W3 = '2027-02-22', D3 = [0, 1, 2, 3, 4, 5, 6].map(i => add(W3, i)), X3 = { sets: clone(FIX.sets), mocks: clone(FIX.mocks) };
      D3.slice(0, 5).forEach(x => X3.sets[x] = cloneSet(x, 18, refsFor(3))); X3.mocks[D3[5]] = cloneMock(D3[5], { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
      let od; const R = runW2({ skip: [D3[5]], hook: x => { if (x === D3[4]) od = pe.offDelta(D3[4], D3[5]); } }, X3, W3, BLANK), txt = pe.outTxt(od) + ' / ' + pe.lvTxt(od);
      ok(od.ds.mock === 200 && od.alt.spill.mock === 200 && od.lv3From === D3[6] && /약 3시간 20분은 다음 주로 놓아줘요\(모의고사\)/.test(txt) && /일요일부터 핵심만 해요/.test(txt), `51-5. 3단계 금요일에 토요일 쉬면: "${txt}"`);
      ok(R[D3[6]].lv === 3 && R[D3[6]].V.moved.filter(x => x.k === 'mock' && x.min === 100 && x.dest === '다음 모의 전까지').length === 2 && R.snap.p === 79 && R.snap.lv === 3, `51-5. 계산(토요일 건너뜀): 일 단계 ${R[D3[6]].lv}, 그 주 ${R.snap.p}% 단계 ${R.snap.lv}`);
      let A; const R2 = runW2({ skip: [D3[1], D3[2]], hook: x => { if (x === D3[1]) A = pe.wkAhead(D3[1], { days: { [D3[1]]: 0, [D3[2]]: 0 } }); } }, X3, W3, BLANK);
      ok(A.cutFrom === D3[5] && R2[D3[5]].lv === 2 && R2.snap.lv === 2 && R2.snap.p === 93, `51-6. 3단계 화·수 쉬면 줄인 목표 ${A.cutFrom}부터 = 계산(화·수 건너뜀) 토 단계 ${R2[D3[5]].lv}, 그 주 ${R2.snap.p}% 단계 ${R2.snap.lv}`); }

    // 52. 이번 주 날마다의 앞날 공부 시간(수 07:00)
    runW2({ until: WE2 }); pe.planToday(WE2); await show('#week');
    { const fri = V$().querySelector(`.drow[data-act="day-cap"][data-d="${FR2}"]`), wedR = [...V$().querySelectorAll('.drow')][2];
      ok(fri && wedR && wedR.dataset.act !== 'day-cap' && V$().querySelectorAll('.drow[data-act="day-cap"]').length === 4, `52-1. 날마다: 금 줄 day-cap, 수(오늘) 줄은 아님, 앞날 ${V$().querySelectorAll('.drow[data-act="day-cap"]').length}줄`);
      const fc = x => { click(`.drow[data-act="day-cap"][data-d="${x}"]`); const t = [...mw().querySelectorAll('.ds.fore')].map(T_)[0]; return t; };
      const f1 = fc(FR2); click('#modal-wrap [data-act="sheet-close"]'); await sleep(10); const f2 = fc(SA2); click('#modal-wrap [data-act="sheet-close"]'); await sleep(10); const f3 = fc(SU2);
      ok(f1 === '이날 쉬면 → 주말 +1시간 24분' && f2 === '이날 쉬면 → 일 +3시간 16분' && f3 === '이날 쉬면 → 토 +10분' && mw().querySelectorAll('[data-act="day-set"]').length === 4 && !mw().querySelectorAll('.btn:not(.sec):not(.ghost)').length, `52-1. 금 "${f1}" · 토 "${f2}" · 일 "${f3}"`);
      { const nt = [...mw().querySelectorAll('.msheet p.note')], nb = nt[nt.length - 1];
        ok(nb && T_(nb) === '출장·야근처럼 미리 아는 날은 설정에서 한꺼번에 정해요.' && nb.nextElementSibling && nb.nextElementSibling.classList.contains('btns'), `52-1. 날마다 창 맨 아래(닫기 위) 알림 "${T_(nb)}"`); }
      click('#modal-wrap [data-act="sheet-close"]'); await sleep(10); const r0 = pe.S().today.rows.map(r => r.id).join();
      click(`.drow[data-act="day-cap"][data-d="${FR2}"]`); click(`#modal-wrap [data-act="day-set"][data-m="0"]`); await sleep(30);
      const fr = V$().querySelector(`.drow[data-d="${FR2}"]`), g5 = V$().querySelectorAll('.wkstrip .wg')[4];
      ok(pe.S().days[FR2] && pe.S().days[FR2].m === 0 && pe.weekBoard(WE2).C === 900 && pe.S().today.rows.length === 10 && pe.S().today.rows.map(r => r.id).join() === r0 && /^쉬는 날 · /.test(T_(fr.querySelector('.dt'))) && (!g5 || g5.classList.contains('off')) && toastT() === '11/6(금)은 쉬는 날로 정했어요',
        `52-2. 금요일을 쉬어요로: C ${pe.weekBoard(WE2).C}, 수요일 오늘 몫 그대로 10줄, 금 줄 "${T_(fr.querySelector('.dt'))}", 알림 "${toastT()}"`);
      await show('#today'); ok(V$().querySelectorAll('.wkstrip .wg')[4].classList.contains('off'), '52-2. 띠의 금요일 동그라미는 점선(off)'); }

    // 53. 오늘 시간 1시간(수): 줄인 만큼 다른 날로
    runW2({ until: WE2 }); pe.planToday(WE2); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-set"][data-m="60"]'); await sleep(30);
    { const x = [...V$().querySelectorAll('.dsx')].map(T_).find(t => /줄인 만큼/.test(t)); ok(x === '줄인 만큼 다른 날로: 목 +16분', `53. 오늘 시간 1시간: "${x}"`); }
    { const R = runW2({ hook: x => { if (x === WE2) pe.planToday(WE2, { replan: 'cap', user: 60 }); } }); ok(R[WE2].plan === 59 && R[TH2].plan === 134, `53. 계산: 수 ${R[WE2].plan}분 · 목 ${R[TH2].plan}분`); }

    // 54. 일요일을 쉬는 날로 정하면 토요일이 몫을 반이 아니라 들어가는 만큼, 주간 리포트도 토요일(토 6시간, 수·목 건너뜀)
    { const R = runW2({ decl: { [TH2]: { [SU2]: { m: 0 } } }, skip: [WE2, TH2, SU2], hook: x => { if (x === W2) pe.S().settings.budget = { wd: 180, sat: 360, sun: 240 }; } }), V = R[SA2].V, rw = k => V.rows.find(r => r.id.indexOf(k) === 0);
      ok(rw('q.dd:') && JSON.stringify(rw('q.dd:').q) === '[["2026-11-04",1],["2026-11-05",1]]' && rw('q.dd:').m === 30 && rw('q.eo:').m === 20 && rw('q.w:').m === 24 && rw('report:' + W2) && !V.moved.length, `54. 토요일: ${V.rows.map(r => r.id.split(':')[0] + ':' + r.m).join(' ')} · 옮긴 것 ${V.moved.length}`);
      ok(R[SA2].lv === 1 && R.snap.p === 96, `54. 토 단계 ${R[SA2].lv}, 그 주 ${R.snap.p}%`);
      scene('2026-10-31T08:00:00', ST); const P = pe.dayPlan(SAT); ok(JSON.stringify(P.rows.find(r => r.id === 'q.dd:2026-10-26').q) === '[["2026-10-26",1],["2026-10-27",1],["2026-10-28",1]]' && !P.rows.some(r => /^report:/.test(r.id)), '54. 일요일을 정하지 않은 토요일(검사 5)은 그대로 반까지, 리포트 없음'); }
    // 토요일 끝 카드: 일요일이 쉬는 날이면 "이번 주 남은 필수 … 다음 주로 놓아줘요"
    { runW2({ decl: { [TH2]: { [SU2]: { m: 0 } } }, skip: [WE2, TH2], until: SA2 }); const V = pe.planToday(SA2); applyRows(V.rows, SA2); at(SA2 + 'T20:00:00'); await show('#today');
      const fin = V$().querySelector('.dcard.fin'); ok(fin && /이번 주 남은 필수 약 .+ 다음 주로 놓아줘요|이번 주 필수를 다 했어요/.test(T_(fin)) && !/내일\(일\)/.test(T_(fin)), `54. 일요일이 쉬는 날인 토요일 끝 카드: "${T_(fin)}"`);
      const rp = pe.weeklyReport(W2); ok(/쉬는 날·짧은 날: 11\/8\(일\) 쉼/.test(rp), '54. 주간 리포트에 "쉬는 날·짧은 날: 11/8(일) 쉼"'); }

    // 55. 평일 저녁에 나눠 하기(수요일 건너뜀, 목 07:00): 이번 주 날마다 아래 미리 보기 → 켜면 오늘 저녁에 손글씨 몫(토요일 몫이 그만큼 줄어듦), 그만 나누기
    runW2({ skip: [WE2], until: TH2 }); pe.planToday(TH2); await show('#week');
    { const bx = V$().querySelector('.wkcu'), on = bx && bx.querySelector('[data-act="cu-on"]'), sum = () => pe.S().today.rows.reduce((a, r) => a + r.m, 0);
      ok(bx && T_(bx.querySelector('.note')) === '나눠 하면 → 목 +37분 · 토 −37분' && on && T_(on) === '평일 저녁에 나눠 하기' && on.classList.contains('sec') && prim().length === 1 && sum() === 149, `55-1. 이번 주 나눠 하기 칸 "${T_(bx)}"(켜기 전 목 ${sum()}분)`);
      click('[data-act="cu-on"]'); await sleep(30); const F = pe.S().today, rw = id => F.rows.find(r => r.id === id) || {};
      ok(pe.S().wk[W2].cu === TH2 && rw('q.dd:' + W2).m === 15 && rw('q.dd:' + W2).blk === 'eve' && rw('q.eo:' + W2).m === 10 && rw('q.w:' + W2).m === 12 && sum() === 179 && toastT() === '평일 저녁에 나눠 넣을게요. 오늘 몫을 다시 짰어요',
        `55-2. 켜면 목 오늘 몫 ${sum()}분: ${F.rows.filter(r => /^q\./.test(r.id)).map(r => r.id + ' ' + r.m + '분 ' + r.blk).join(', ')}`);
      { const P = pe.dayPlan(TH2, { now: 420, user: 60 }), dz = k => (P.moved.find(x => x.k === k) || {}).dest;
        ok(dz('q.dd') === '내일 따라잡기' && dz('hw.write') === '내일 따라잡기' && dz('hw.say') === '오늘만이라 놓아줘요' && P.moved.filter(x => x.k === 'rev').every(x => x.dest === '내일 다시 나와요'), `55-2. 나눠 하는 목요일을 1시간으로 줄이면: ${P.moved.map(x => x.k + '→' + x.dest).join(', ')}`); }
      const bx2 = V$().querySelector('.wkcu');
      ok(bx2 && T_(bx2.querySelector('.note')) === '평일 저녁에 손글씨 몫을 나눠 넣고 있어요' && bx2.querySelector('.lnk[data-act="cu-off"]') && T_(bx2.querySelector('.lnk')) === '그만 나누기' && !bx2.querySelector('.btn') && prim().length === 1, `55-2. 켠 주 "${T_(bx2)}"`);
      click('[data-act="cu-off"]'); await sleep(30);
      ok(!('cu' in pe.S().wk[W2]) && toastT() === '나눠 하기를 껐어요' && sum() === 149 && !pe.S().today.rows.some(r => /^q\./.test(r.id)) && V$().querySelector('.wkcu [data-act="cu-on"]'), `55-3. 그만 나누기: S.wk[W].cu 지움, 목 오늘 몫 ${sum()}분, 다시 미리 보기`); }
    { const R = runW2({ skip: [WE2], hook: x => { if (x === TH2) { (pe.S().wk[W2] = pe.S().wk[W2] || {}).cu = TH2; pe.invalidate(); } } });
      ok(R[TH2].plan === 179 && R[SA2].plan === 218 && R.snap.p === 98 && !R.snap.rel.length && R[TH2].V.rows.filter(r => /^late:/.test(r.id)).length === 1, `55-4. 나눠 하는 주(목에 켬): 목 ${R[TH2].plan}분 · 토 ${R[SA2].plan}분, 그 주 ${R.snap.p}% (켜지 않은 주 목 149 · 토 255)`);
      const A = (runW2({ skip: [WE2], hook: x => { if (x === TH2) { (pe.S().wk[W2] = pe.S().wk[W2] || {}).cu = TH2; pe.invalidate(); } }, until: FR2 }), pe.wkAhead(FR2)), c = A.out.filter(x => x.catch).map(x => x.d.slice(5) + ' ' + x.catch).join();
      ok(!pe.cuPreview(FR2) || pe.cuPreview(FR2).on, `55-4. 켠 주 금요일 이번 주 칸은 "나눠 넣고 있어요"(미리 보기 없음), 앞날 밀린 몫 ${c || '없음'}`); }
    // 3단계 주(화·수 쉬는 날, 목요일에 켬): 밀린 세트는 둘까지, 넣지 못한 손글씨 몫은 "내일 따라잡기"
    { const W3 = '2027-02-22', D3 = [0, 1, 2, 3, 4, 5, 6].map(i => add(W3, i)), X3 = { sets: clone(FIX.sets), mocks: clone(FIX.mocks) };
      D3.slice(0, 5).forEach(x => X3.sets[x] = cloneSet(x, 18, refsFor(3))); X3.mocks[D3[5]] = cloneMock(D3[5], { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
      const R = runW2({ skip: [D3[1], D3[2]], hook: x => { const S = pe.S(); if (x === D3[1]) S.days = { [D3[1]]: { m: 0 }, [D3[2]]: { m: 0 } }; if (x === D3[3]) { (S.wk[W3] = S.wk[W3] || {}).cu = x; pe.invalidate(); } } }, X3, W3, BLANK);
      const V = R[D3[3]].V, mq = V.moved.filter(x => x.quota);
      ok(mq.length && mq.every(x => x.dest === '내일 따라잡기') && V.rows.filter(r => /^late:/.test(r.id)).length === 2 && !V.rows.some(r => r.id === 'q.redo:' + W3) && V.rows.some(r => /^q\.dd:/.test(r.id) && r.blk === 'eve'),
        `55-5. 3단계 목요일(나눠 하기): 밀린 세트 ${V.rows.filter(r => /^late:/.test(r.id)).length}개, 못 넣은 몫 ${mq.map(x => x.id.split(':')[0] + '→' + x.dest).join(', ')}`);
      runW2({ skip: [D3[1], D3[2]], hook: x => { const S = pe.S(); if (x === D3[1]) S.days = { [D3[1]]: { m: 0 }, [D3[2]]: { m: 0 } }; if (x === D3[3]) { (S.wk[W3] = S.wk[W3] || {}).cu = x; pe.invalidate(); } }, until: D3[4] }, X3, W3, BLANK);
      const P = pe.dayPlan(D3[4], { now: 420, user: 30 }), fq = P.moved.filter(x => x.quota);
      ok(fq.length && fq.every(x => x.dest === '토요일 따라잡기'), `55-5. 금요일(나눠 하기, 30분)에 못 넣은 몫은 토요일 따라잡기: ${fq.map(x => x.id.split(':')[0] + '→' + x.dest).join(', ')}`); }
    // 63. Slice 2 고침(리뷰): 나눠 넣는 줄(두 번째 밀린 세트·손글씨 몫)은 그날 필수(세트 복습 포함)를 다 넣고 남은 시간에만(오늘 숙제는 필수 칸 먼저, 더 하기는 뒤에).
    //     미리 보기 "나눠 하면 → …" = 오늘 몫 계산(날마다 필수 분의 차이, ±5분), 켜고 계획대로 하면 그 주 점수가 켜지 않은 주보다 낮지 않고, 켠 날 필수 세트 복습을 밀어내지 않음
    { const reqF = V => V.rows.reduce((a, r) => { const x = r.task; if (x && x.hw) return a + Math.min(r.m, x.minFloor != null ? x.minFloor : r.m); return a + (x && x.need === '필수' || /^(q\.|late|mock|report|x\.)/.test(r.id) ? r.m : 0); }, 0);
      const cuHook = (W, day, h0) => x => { if (h0) h0(x); if (x === day) { (pe.S().wk[W] = pe.S().wk[W] || {}).cu = x; pe.invalidate(); } };
      const revMv = V => V.moved.filter(x => x.k === 'rev' && x.need === '필수').length, sh = x => x.slice(8), [MO2, TU2] = DAYS;
      const shadow = (nm, skip, on, txt, X, W, st) => { W = W || W2; const D = [0, 1, 2, 3, 4, 5, 6].map(i => add(W, i)), ds = D.filter(x => x >= on);
        runW2({ skip, until: on }, X, W, st); pe.planToday(on); const pv = pe.cuPreview(on) || {}, R0 = runW2({ skip }, X, W, st), R1 = runW2({ skip, hook: cuHook(W, on) }, X, W, st);
        const pd = ds.map(x => reqF(R1[x].V) - reqF(R0[x].V)), jd = ds.map(x => (pv.dl || {})[x] || 0), bad = ds.filter((x, i) => Math.abs(pd[i] - jd[i]) > 5);
        ok(pv.txt === txt && !bad.length && R1.snap.p >= R0.snap.p && revMv(R1[on].V) <= revMv(R0[on].V),
          `63-${nm}. 미리 보기 "${pv.txt}" · 날마다 ${ds.map((x, i) => sh(x) + ' ' + jd[i]).join(' · ')} = 계산 ${ds.map((x, i) => sh(x) + ' ' + pd[i]).join(' · ')}, 그 주 ${R0.snap.p}% → ${R1.snap.p}%, 켠 날 밀린 필수 세트 복습 ${revMv(R0[on].V)} → ${revMv(R1[on].V)}`);
        return { pv, R0, R1 }; };
      // 63-1. 수·목 건너뛰고 금요일에 켬(리뷰 A5: 금 +57분이라더니 +10분, 7·14일 차 세트 복습 5개를 밀어냄)
      { const { R1 } = shadow(1, [WE2, TH2], FR2, '금 +45분 · 주말 −45분'), F = R1[FR2].V, rw = id => F.rows.find(r => r.id === id) || {};
        ok(rw('q.dd:' + W2).m === 30 && rw('late:' + TH2).m && !F.moved.some(x => x.k === 'rev') && ['hw.write', 'hw.eo'].every(k => (F.rows.find(r => r.id === k + ':' + FR2) || {}).tgt === 'floor'),
          `63-1. 금요일: 손글씨 몫 ${F.rows.filter(r => /^(q\.|late:)/.test(r.id)).map(r => r.id.split(':')[0] + ' ' + r.m).join(', ')} · 오늘 숙제는 필수 칸(${F.rows.filter(r => /^hw\./.test(r.id)).map(r => r.id.split(':')[0] + ' ' + r.tgt).join(', ')}) · 옮긴 세트 복습 없음`); }
      shadow(2, [MO2, TU2], WE2, '평일 +1시간 14분 · 주말 −1시간 14분');   // 리뷰 A4(수요일에 켜면 필수 세트 복습 6개가 밀렸음)
      shadow(3, [TU2, WE2], TH2, '목 +55분 · 금 +27분 · 주말 −1시간 14분');   // 리뷰: 목 +1시간 5분 · 금 +17분이라더니 목 +18 · 금 +41
      // 63-4. 2단계 주(2027-01-11, 지난주부터 이어서, 논술 실전): 화·수 건너뛰고 목요일에 켬(리뷰: 토가 오히려 늘었음)
      { const W = '2027-01-11', D = [0, 1, 2, 3, 4, 5, 6].map(i => add(W, i)), X = { sets: clone(FIX.sets), mocks: clone(FIX.mocks) }, Wp = add(W, -7);
        D.slice(0, 5).forEach(x => X.sets[x] = cloneSet(x, 12, refsFor(2))); X.mocks[D[5]] = cloneMock(D[5], { p1: clone(MOCK0.p1), p2: P2_2 });
        [0, 1, 2, 3, 4].forEach(i => X.sets[add(Wp, i)] = cloneSet(add(Wp, i), 11, refsFor(2))); X.mocks[add(Wp, 5)] = cloneMock(add(Wp, 5), { p1: clone(MOCK0.p1), p2: P2_2 });
        runW2({}, X, Wp, BLANK); const st = clone(pe.S()); shadow(4, [D[1], D[2]], D[3], '목 +35분 · 금 +43분 · 주말 −1시간 10분', X, W, st); }
      // 63-5. 3단계 주: 화·수 쉬는 날이면 나눠도 줄인 목표가 풀려 뒷날이 늘기만 해서 미리 보기를 띄우지 않음(켜면 그 주 93% → 92%였음)
      const W3 = '2027-02-22', D3 = [0, 1, 2, 3, 4, 5, 6].map(i => add(W3, i)), X3 = { sets: clone(FIX.sets), mocks: clone(FIX.mocks) };
      D3.slice(0, 5).forEach(x => X3.sets[x] = cloneSet(x, 18, refsFor(3))); X3.mocks[D3[5]] = cloneMock(D3[5], { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
      runW2({ skip: [D3[1], D3[2]], until: D3[3], hook: x => { if (x === D3[1]) pe.S().days = { [D3[1]]: { m: 0 }, [D3[2]]: { m: 0 } }; } }, X3, W3, BLANK); pe.planToday(D3[3]);
      { const a = pe.wkAhead(D3[3], { fix: 1 }), c = pe.wkAhead(D3[3], { cu: 1 }), dl = c.out.map((x, i) => x.load - a.out[i].load);
        ok(!pe.cuPreview(D3[3]) && a.handBack > 0 && dl.every(v => v > -5), `63-5. 3단계 화·수 쉬는 날, 목요일: 나누면 날마다 ${dl.join(' · ')}(덜어지는 날 없음) → 미리 보기 없음`); }
      // 63-6. 3단계 주에 나눠 하기를 켠 화요일(월 건너뜀)에 오늘 쉬면: 다시 쓰기는 평일 줄 그대로·토요일 몫, 놓아주지 않음(리뷰: "약 25분은 다음 주로 놓아줘요(다시 쓰기)"), 날마다 = 계산
      { const cuT = cuHook(W3, D3[1]); runW2({ skip: [D3[0]], until: D3[1], hook: cuT }, X3, W3, BLANK); pe.planToday(D3[1]); const od = pe.offDelta(D3[1], D3[1]);
        const R0 = runW2({ skip: [D3[0]], hook: cuT }, X3, W3, BLANK), R1 = runW2({ skip: [D3[0], D3[1]], hook: x => { cuT(x); if (x === D3[1]) { pe.S().days = { [x]: { m: 0 } }; pe.invalidate(); } } }, X3, W3, BLANK);
        const ds = D3.slice(2), pd = ds.map(x => reqF(R1[x].V) - reqF(R0[x].V)), bad = ds.filter((x, i) => Math.abs(pd[i] - (od.dl[x] || 0)) > 5);
        ok(!od.ds.redo && !od.sp && pe.outTxt(od) === '이번 주 안에 다 따라잡아요 · 시험 일정은 그대로예요' && pe.lvTxt(od) === '일요일부터 핵심만 해요' && !bad.length && R1[D3[6]].lv === 3 && !R1.snap.rel.length && R1[D3[5]].V.rows.some(r => r.id === 'q.redo:' + W3),
          `63-6. "${pe.placeTxt(od.dl, D3[1])} / ${pe.outTxt(od)} / ${pe.lvTxt(od)}" = 계산 ${ds.map((x, i) => sh(x) + ' ' + pd[i]).join(' · ')}, 일 단계 ${R1[D3[6]].lv}, 놓아준 것 ${R1.snap.rel.length}`); }
      // 63-7. 9시 바닥 단답 1문을 끝낸 뒤 나눠 하기를 켜면: 남은 단답 몫은 오늘 밤 같은 줄에 이어서(내일로 미루지 않음)
      { const X = clone(SETS2); delete X.sets[TH2]; runW2({ skip: [TU2, WE2], until: TH2 }, X); at(TH2 + 'T09:30:00'); const V0 = pe.planToday(TH2), fl = V0.rows.find(r => r.id === 'q.dd:' + W2);
        applyRows([fl], TH2); pe.invalidate(); pe.planToday(TH2); await show('#week'); click('[data-act="cu-on"]'); await sleep(30); const V = pe.planToday(TH2), r = V.rows.find(r => r.id === 'q.dd:' + W2);
        ok(fl && JSON.stringify(fl.q) === '[["2026-11-03",1]]' && r && JSON.stringify(r.q) === '[["2026-11-03",1],["2026-11-04",1]]' && r.m === 30 && !r.done && r.left === 15 && !V.moved.some(x => x.k === 'q.dd') && new Set(V.rows.map(r => r.id)).size === V.rows.length && V.doneMin >= 15,
          `63-7. 바닥 ${fl && JSON.stringify(fl.q)} 끝 → 켜면 ${r && r.id + ' ' + JSON.stringify(r.q) + ' ' + r.m + '분(남은 ' + r.left + '분)'}, 옮긴 단답 ${V.moved.filter(x => x.k === 'q.dd').length}개`);
        await go('#today'); }
      // 63-8. 다른 날로 옮긴 것: 손글씨 몫은 세트 날짜까지(같은 이름의 오늘 숙제 줄과 둘로 보이지 않게)
      { runW2({ skip: [D3[0]], until: D3[1], hook: cuHook(W3, D3[1]) }, X3, W3, BLANK); pe.planToday(D3[1]); pe.planToday(D3[1], { replan: 'cap', user: 30 }); await show('#today');
        const L = [...V$().querySelectorAll('.prow.moved')].map(T_), fg = L.filter(x => /^그림·표 그리기/.test(x));
        ok(fg.length === 2 && new Set(L).size === L.length && fg.some(x => /2\/22\(월\) · 2분 → 내일 따라잡기/.test(x)), `63-8. 옮긴 것 ${L.length}줄(같은 줄 없음): ${fg.join(' / ')}`); }
      // 63-9. 알림은 내용 폭(화면 반에서 꺾이지 않게), 나눠 하기 버튼은 날마다 칸과 같은 폭
      { const css = fs.readFileSync(path.join(SITE, 'styles.css'), 'utf8');
        ok(/\.toast\{[^}]*width:max-content;max-width:88vw/.test(css) && /\.wkcu\{margin:10px 0 0\}/.test(css) && /\.wkcu \.note\{margin:0 4px\}/.test(css), '63-9. .toast width:max-content, .wkcu 버튼은 옆 여백 없이'); }
      pe.goTab('today'); await sleep(40); }
    pe.goTab('today'); await sleep(40);

    // 61. Slice 1 고침(리뷰): 미리 보기 = 오늘 몫 계산 = 쉬는 날 카드, 갈 곳은 쉬는 날·시험 날을 건너뜀
    { const fore = () => [...mw().querySelectorAll('.ds.fore')].map(T_), card = () => T_(V$().querySelector('.dcard.off .ds')), segOn = () => [...mw().querySelectorAll('[data-act="cap-set"].on,[data-act="day-set"].on')].map(T_);
      const closeM = async () => { click('#modal-wrap [data-act="sheet-close"]'); await sleep(10); }, dsheet = async x => { click(`.drow[data-act="day-cap"][data-d="${x}"]`); await sleep(10); };
      const dset = async (x, m) => { await dsheet(x); const b = m == null ? [...mw().querySelectorAll('[data-act="day-set"]')].pop() : mw().querySelector(`[data-act="day-set"][data-m="${m}"]`); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(30); };
      const pre = (s, p) => s.replace(p + ' → ', ''), TU2 = DAYS[1];
      // 61-1. 리허설 주 토요일을 쉬면: 토요일 교시는 일요일에 교시째로 들어가는 만큼(통째 430분이 아니라), 놓아주는 것은 3·4교시뿐
      { let pw = -1; for (let i = 0; i < 40; i++) if (pe.weekObj(i).pre) { pw = i; break; } const Wq = add('2026-10-19', 7 * pw), Dq = [0, 1, 2, 3, 4, 5, 6].map(i => add(Wq, i));
        const Xq = { sets: clone(FIX.sets), mocks: clone(FIX.mocks) }; Dq.slice(0, 5).forEach(x => Xq.sets[x] = cloneSet(x, pw, refsFor(2))); Xq.mocks[Dq[5]] = cloneMock(Dq[5], { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
        let od; const R = runW2({ skip: [Dq[5]], hook: x => { if (x === Dq[4]) od = pe.offDelta(Dq[4], Dq[5]); } }, Xq, Wq, BLANK), sun = R[Dq[6]].V, aSun = od.alt.out.find(x => x.d === Dq[6]).load;
        const mv = sun.moved.filter(x => x.k === 'mock' && x.dest === '다음 모의 전까지').reduce((a, x) => a + x.min, 0);
        ok(od.ds.mock === 200 && aSun === 240 && cm(sun) === 240 && mv === 200 && sun.rows.some(r => /^mock:.*:p1$/.test(r.id)) && sun.rows.some(r => /^mock:.*:p2$/.test(r.id)),
          `61-1. 리허설 주(${Wq}) 금요일에 토요일 쉬면: 앞날 일 ${aSun}분 · 놓아줌 ${od.ds.mock}분 = 계산 일 ${cm(sun)}분 · 다음 모의 전까지 ${mv}분`);
        runW2({ until: Dq[5] }, Xq, Wq, BLANK); pe.planToday(Dq[5]); await show('#today'); click('[data-act="cap"]'); await sleep(10); const f = fore();
        click('#modal-wrap [data-act="cap-off"]'); await sleep(30); const c = card();
        ok(/^오늘 쉬면 → 일 \+/.test(f[0]) && /^약 3시간 20분은 다음 주로 놓아줘요\(모의고사\) · 시험 일정은 그대로예요$/.test(f[1]) && c === pre(f[0], '오늘 쉬면') + '에 나눠 넣었어요', `61-1. 토요일 오늘 시간 창 "${f.join(' / ')}" = 쉬는 날 카드 "${c}"`); }
      // 61-2. 짧은 날: 쉬면 미리 보기는 지금(짧은 날)과 견주고, 정한 시간이 켜짐. 짧은 날을 쉬는 날로 바꿔도 같은 분, 다시 공부할래요는 짧은 날로
      runW2({ until: WE2 }); pe.planToday(WE2); await show('#week'); await dset(FR2, 60);
      { const a = pe.wkAhead(WE2), b = pe.wkAhead(WE2, { days: { [FR2]: 0 } }), we = b.out[3].load - a.out[3].load + b.out[4].load - a.out[4].load; await dsheet(FR2); const f1 = fore()[0], on1 = segOn().join(); await closeM();
        await dset(FR2, 0); await dsheet(FR2); const f2 = fore()[0]; await closeM();
        ok(we === 56 && f1 === '이날 쉬면 → 주말 +56분' && on1 === '1시간' && JSON.stringify(pe.S().days[FR2]) === '{"m":0,"p":60}' && f2 === f1, `61-2. 금 1시간 → 이날 쉬면 "${f1}"(켜짐 ${on1}), 쉬어요로 바꾼 뒤 "${f2}" ${JSON.stringify(pe.S().days[FR2])}`); }
      runW2({ decl: { [WE2]: { [TH2]: { m: 60 } } }, until: TH2 }); pe.planToday(TH2); await show('#today'); click('[data-act="cap"]'); await sleep(10);
      { const od = pe.offDelta(TH2, TH2), a = pe.wkAhead(TH2), b = pe.wkAhead(TH2, { days: { [TH2]: 0 } }), same = a.out.every((x, i) => od.dl[x.d] === b.out[i].load - x.load), f = fore()[0], on = segOn();
        click('#modal-wrap [data-act="cap-off"]'); await sleep(30); const c = card(), dd = JSON.stringify(pe.S().days[TH2]); click('[data-act="off-clear"]'); await sleep(30);
        ok(same && !on.length && f === '오늘 쉬면 → ' + pe.placeTxt(od.dl, TH2) && /\+/.test(f) && c === pre(f, '오늘 쉬면') + '에 나눠 넣었어요' && dd === '{"m":0,"p":60}' && pe.S().days[TH2].m === 60,
          `61-2. 짧은 날(목 1시간) 오늘 시간 창: 켜진 칸 ${on.length}개, "${f}" = 카드 "${c}", 다시 공부할래요 → ${JSON.stringify(pe.S().days[TH2])}`); }
      // 61-3. 오늘 시간 30분으로 줄인 뒤 쉬면: 창의 미리 보기와 쉬는 날 카드가 같은 분, 다시 공부할래요는 30분으로
      runW2({ until: WE2 }); pe.planToday(WE2); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-set"][data-m="30"]'); await sleep(30);
      { click('[data-act="cap"]'); await sleep(10); const f = fore()[0]; click('#modal-wrap [data-act="cap-off"]'); await sleep(30); const c = card(), dd = JSON.stringify(pe.S().days[WE2]); click('[data-act="off-clear"]'); await sleep(30);
        ok(c === pre(f, '오늘 쉬면') + '에 나눠 넣었어요' && dd === '{"m":0,"u":30}' && pe.S().today.user === 30 && !pe.S().days[WE2], `61-3. 30분 → 오늘 쉬면 "${f}" = 카드 "${c}", 다시 공부할래요 → 오늘 시간 ${pe.S().today.user}분`); }
      // 61-4. 앞날을 쉬는 날로 정해도 오늘 단계·줄인 목표는 그대로(다음 고정 때, 미리 보기가 말한 날부터), 평소대로로 되돌리면 흔적 없음
      runW2({ skip: [WE2, TH2], until: FR2 }); { const V0 = pe.planToday(FR2), r0 = V0.rows.map(r => r.id).join(); await show('#week'); await dsheet(SA2); const f = fore(); await closeM();
        await dset(SA2, 0); const a1 = [pe.S().today.lv, JSON.stringify(pe.S().wk[W2] || {})], r1 = pe.S().today.rows.map(r => r.id).join(); await dset(SA2, null); const a2 = [pe.S().today.lv, JSON.stringify(pe.S().wk[W2] || {})];
        ok(f.includes('일요일부터 손글씨 몫을 줄여요(줄인 목표)') && a1[0] === 0 && a1[1] === '{"lvx":0}' && r1 === r0 && a2[0] === 0 && a2[1] === '{"lvx":0}' && !Object.keys(pe.S().days).length,
          `61-4. 금 07:00 토요일 쉬어요 → 오늘 단계 ${a1[0]} · ${a1[1]}, 평소대로 → ${a2[0]} · ${a2[1]}`); }
      { const R0 = runW2({ skip: [WE2, TH2] }), R1 = runW2({ skip: [WE2, TH2], hook: x => { if (x === FR2) { pe.planToday(FR2); pe.S().days = { [SA2]: { m: 0 } }; pe.planToday(FR2, { replan: 'day' }); delete pe.S().days[SA2]; pe.planToday(FR2, { replan: 'day' }); } } });
        const R2 = runW2({ skip: [WE2, TH2, SA2], hook: x => { if (x === FR2) { pe.planToday(FR2); pe.S().days = { [SA2]: { m: 0 } }; pe.planToday(FR2, { replan: 'day' }); } } });
        ok(R1.snap.lv === R0.snap.lv && R1.snap.p === R0.snap.p && R1[SA2].plan === R0[SA2].plan && R1[SU2].plan === R0[SU2].plan && R2[FR2].lv === 0 && R2[SU2].lv === 2 && R2.snap.lv === 2,
          `61-4. 쉬어요 → 평소대로 한 주 = 안 누른 주(${R1.snap.p}% 단계 ${R1.snap.lv}), 토요일을 쉬면 금 단계 ${R2[FR2].lv} · 일 단계 ${R2[SU2].lv}(미리 보기의 일요일부터)`); }
      // 61-5. 일요일 쉬는 날로 토요일에 리포트 줄을 고정한 뒤 일요일을 평소대로: 끝내지 않은 리포트 줄이 끝낸 줄로 남지 않음
      runW2({ decl: { [TH2]: { [SU2]: { m: 0 } } }, until: SA2 }); pe.planToday(SA2); at(SA2 + 'T10:00:00'); await show('#week');
      { const r0 = pe.S().today.rows.some(r => r.id === 'report:' + W2); await dset(SU2, null); const V = pe.planToday(SA2);
        ok(r0 && !pe.S().today.rows.some(r => /^report:/.test(r.id)) && V.doneMin === 0 && pe.weekBoard(SA2).dm === 0 && !pe.S().tk['report:' + W2], `61-5. 토요일 리포트 줄 ${r0} → 일요일 평소대로 뒤 오늘 몫 ${pe.S().today.rows.length}줄, 한 분 ${V.doneMin}`); }
      // 61-6. 옮긴 줄의 갈 곳: 쉬는 날·시험 날은 건너뜀
      runW2({ decl: { [WE2]: { [FR2]: { m: 0 }, [SA2]: { m: 0 } } }, until: FR2 }); { const V = pe.planToday(FR2), ds = k => (V.moved.find(x => x.k === k) || {}).dest;
        ok(!V.moved.some(x => /토요일/.test(x.dest)) && ds('set.read') === '일요일 밀린 핵심' && ds('hw.write') === '일요일 손글씨 몫', `61-6. 금·토 쉬는 날, 금 옮긴 것: ${V.moved.map(x => x.k + '→' + x.dest).join(', ')}`); }
      runW2({ decl: { [FR2]: { [SA2]: { m: 0 }, [SU2]: { m: 0 } } }, until: SA2 }); { const V = pe.planToday(SA2); await show('#today');
        ok(!V.moved.some(x => /내일\(일\)/.test(x.dest)) && V.moved.filter(x => x.mock).every(x => x.dest === '다음 모의 전까지') && (V.moved.find(x => x.k === 'report') || {}).dest === '다음 주로 놓아줘요' && card() === '다른 날로 옮길 수 있는 필수는 없어요',
          `61-6. 토·일 쉬는 날, 토 옮긴 것: ${V.moved.map(x => x.k + '→' + x.dest).join(', ')} · 카드 "${card()}"`); }
      { const XE = clone(FIX); ['2027-01-25', '2027-01-26', '2027-01-27', '2027-01-28', '2027-01-29'].forEach(x => XE.sets[x] = cloneSet(x, 14, refsFor(2)));
        scene('2027-01-29T07:00:00', BLANK, XE); await show('#today'); click('[data-act="cap"]'); await sleep(10); const n0 = [...mw().querySelectorAll('.note')].map(T_);
        click('#modal-wrap [data-act="cap-off"]'); await sleep(30); const V = pe.planToday('2027-01-29'); click('[data-act="cap"]'); await sleep(10); const n1 = [...mw().querySelectorAll('.note')].map(T_); await closeM();
        ok(n0.includes('날짜가 정해진 일(준비물)은 쉬는 날에도 남아요') && !V.moved.some(x => /토요일/.test(x.dest)) && (V.moved.find(x => x.k === 'set.read') || {}).dest === '일요일 밀린 핵심' && !n1.some(x => /최소 몫/.test(x)) && n1.includes('날짜가 정해진 일(준비물)은 쉬는 날에도 남아요'),
          `61-6. 시험 전날(1/29, 토요일 시험)을 쉬면: ${V.moved.map(x => x.k + '→' + x.dest).join(', ')} · 창 "${n0.join(' / ')}" → 쉬는 날 창 "${n1.join(' / ')}"`);
        scene('2027-01-31T09:00:00', BLANK, XE); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-off"]'); await sleep(30);
        ok(toastT() === '오늘은 쉬어요. 남은 필수는 다음 주로 놓아줘요', `61-6. 일요일 오늘은 쉬어요 알림 "${toastT()}"`); }
      // 61-7. 일요일이 쉬는 날인 주: 리포트 줄은 "(토)", 토요일 끝 카드와 이번 주 줄이 같은 말
      runW2({ decl: { [TH2]: { [SU2]: { m: 0 } } }, until: SA2 }); pe.planToday(SA2); await show('#today');
      { const q = [...V$().querySelectorAll('.wksec .qline')].map(T_); await show('#week'); const qw = [...V$().querySelectorAll('.qline')].map(T_).find(x => /주간 리포트/.test(x)) || '';
        ok(q.includes('주간 리포트(토) 0/1') && /오늘 밤까지/.test(qw) && !q.some(x => /리포트\(일\)/.test(x)), `61-7. 토요일 이번 주 줄 "${q.join(' / ')}" · 이번 주 탭 "${qw}"`); }
      { runW2({ decl: { [TH2]: { [SU2]: { m: 0 } } }, skip: [WE2, TH2], until: SA2 }); const V = pe.planToday(SA2); applyRows(V.rows, SA2); at(SA2 + 'T20:00:00'); await show('#today');
        const wl = T_(V$().querySelector('.wksec .wkline')), fin = T_(V$().querySelector('.dcard.fin'));
        ok(/남은 필수 약 .+ 다음 주로 놓아줘요|이번 주 필수를 다 했어요/.test(wl) && !V$().querySelector('.wksec .lvc') && /다음 주로 놓아줘요|이번 주 필수를 다 했어요/.test(fin), `61-7. 일요일이 쉬는 날인 토요일 다 함: 이번 주 "${wl}" · 끝 카드 "${fin}"`); }
      // 61-8. 리포트만 남은 주의 "놓아준 필수"는 없음(리포트는 월요일 "지난주 리포트"로)
      { runW2({ until: SU2 }); const V = pe.planToday(SU2); applyRows(V.rows.filter(r => !/^report:/.test(r.id)), SU2); const MO3 = add(W2, 7); at(MO3 + 'T07:30:00'); const sn = pe.weekSnap(MO3);
        ok(sn.left === 0 && !/놓아준 필수/.test(pe.weeklyReport(W2)), `61-8. 리포트만 남은 주: left ${sn.left}, 주간 리포트에 "놓아준 필수" 없음`); }
      // 61-9. 옮길 곳 없이 놓아줄 것만: 서로 어긋나는 말 없이, "시험 일정은 그대로예요"는 한 덩이
      { const W3 = '2027-02-22', D3 = [0, 1, 2, 3, 4, 5, 6].map(i => add(W3, i)), X3 = { sets: clone(FIX.sets), mocks: clone(FIX.mocks) };
        D3.slice(0, 5).forEach(x => X3.sets[x] = cloneSet(x, 18, refsFor(3))); X3.mocks[D3[5]] = cloneMock(D3[5], { p1: clone(MOCK0.p1), p2: P6(2), p3: P6(3), p4: P6(4) });
        runW2({ until: D3[4] }, X3, W3, BLANK); pe.planToday(D3[4]); await show('#week'); await dsheet(D3[5]); const f = fore(), h = mw().querySelectorAll('.ds.fore')[1].innerHTML; await closeM();
        ok(f[0] === '이날 쉬면 → 다른 날로 옮길 수 있는 필수는 없어요' && f[1] === '약 3시간 20분은 다음 주로 놓아줘요(모의고사) · 시험 일정은 그대로예요' && /<span class="nw">시험 일정은 그대로예요<\/span>$/.test(h), `61-9. 3단계 금요일 토요일 창 "${f.join(' / ')}"`); }
      // 61-10. 쉬는 날의 이번 주 파란 버튼은 오늘 세트로 보내지 않음(지난 세트가 비었으면 그것)
      runW2({ until: WE2 }); pe.planToday(WE2); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-off"]'); await sleep(30); await show('#week');
      { const p1 = prim().map(T_).join(); runW2({ skip: [TU2], until: WE2 }); pe.planToday(WE2); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-off"]'); await sleep(30); await show('#week'); const p2 = prim().map(T_).join();
        ok(prim().length === 1 && !/11\/4\(수\)/.test(p1) && p2 === '다음: 11/3(화) 용어', `61-10. 수요일 쉬는 날 이번 주 파란 버튼 "${p1}" · 화요일을 건너뛴 주 "${p2}"`); }
      // 61-12. 쉬는 날의 이번 주 줄(오늘 화면 이번 주 칸 · #week 일요일까지 끝낼 것)도 "다음 하나"로 오늘 세트를 이름 대지 않음(지난 세트가 비었으면 그것, 누르면 그 세트)
      { const off = async skip => { runW2({ skip, until: WE2 }); pe.planToday(WE2); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-off"]'); await sleep(30); };
        const ql = sel => [...V$().querySelectorAll(sel)].map(T_), core = () => T_(V$().querySelector('#ql-core'));
        await off([]); await show('#today'); const t1 = ql('.wksec .qline'); await show('#week'); const w1 = ql('.qline'), c1 = core();
        ok(t1.length && !t1.some(x => /11\/4\(수\)/.test(x)) && t1.some(x => /^세트 핵심 2\/5$/.test(x)) && !w1.some(x => /다음 하나: 11\/4\(수\)/.test(x)) && !/다음 하나|06:21/.test(c1),
          `61-12. 수요일 쉬는 날(월·화 다 함): 오늘 이번 주 칸 "${t1.filter(x => /핵심/.test(x)).join()}", #week 핵심 줄 "${c1}"`);
        await off([TU2]); await show('#week'); const w2 = ql('.qline'), c2 = core(), h2 = w2.filter(x => /^단답 손글씨/.test(x)).join();
        click('#ql-core'); await sleep(40); const hs = w.location.hash;
        ok(/다음 하나: 11\/3\(화\) 용어$/.test(c2) && /다음 하나: 11\/3\(화\) 세트$/.test(h2) && !w2.some(x => /다음 하나: 11\/4\(수\)/.test(x)) && hs === '#set/' + TU2, `61-12. 화요일을 건너뛴 주: 핵심 "${c2}", 단답 "${h2}", 핵심 줄을 누르면 ${hs}`);
        await show('#week'); }
      // 61-11. 새 누르는 칸은 44px(오늘 시간·날마다 창의 칸, 밀린 몫 줄)
      { const css = fs.readFileSync(path.join(SITE, 'styles.css'), 'utf8'); ok(/\.capseg button\{[^}]*min-height:44px/.test(css) && /\.wkline\.catch\{[^}]*min-height:44px/.test(css), '61-11. .capseg button · .wkline.catch 높이 44px'); } }
    pe.goTab('today'); await sleep(40); }

  // 60. 쉬는 날의 가장자리와 읽기만
  { const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
    const XE = clone(FIX); ['2027-01-25', '2027-01-26', '2027-01-27', '2027-01-28', '2027-01-29'].forEach(x => XE.sets[x] = cloneSet(x, 14, refsFor(2)));
    scene('2027-01-30T09:00:00', BLANK, XE); await show('#today'); ok(!V$().querySelector('[data-act="cap"]') && V$().querySelector('.dcard.exam'), '60-1. 시험 날(1/30)에는 오늘 시간 없음');
    scene('2027-01-27T09:00:00', BLANK, XE); await show('#week'); const r30 = [...V$().querySelectorAll('.drow')].find(r => /^토 /.test(T_(r.querySelector('.dl'))));
    ok(r30 && r30.dataset.act !== 'day-cap' && V$().querySelector('.drow[data-act="day-cap"][data-d="2027-01-29"]'), '60-1. 1/27의 날마다: 시험 날(1/30) 줄은 공부 시간 창이 없고 1/29는 있음');
    scene('2027-01-29T07:00:00', BLANK, XE); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-off"]'); await sleep(30);
    ok(pe.S().today.rows.map(r => r.id).join() === 'kit:2027-01-29' && V$().querySelector('.pin') && V$().querySelector('.dcard.off'), `60-2. 시험 전날(1/29)을 쉬는 날로: 날짜 일(준비물)만 ${pe.S().today.rows.map(r => r.id).join()}`);
    scene('2027-01-31T09:00:00', BLANK, XE); await show('#today'); click('[data-act="cap"]'); await sleep(10); const sun = T_(d.querySelector('#modal-wrap'));
    click('#modal-wrap [data-act="cap-off"]'); await sleep(30);
    ok(pe.S().today.rows.map(r => r.id).join() === 'recap:141' && /오늘 쉬면 → 이번 주 남은 필수 약 .+ 다음 주로 놓아줘요/.test(sun) && /날짜가 정해진 일\(원서접수·복기\)은 쉬는 날에도 남아요/.test(sun), `60-3. 시험 다음 날(1/31 일)을 쉬는 날로: 48시간 복기만 ${pe.S().today.rows.map(r => r.id).join()}, 창 "${sun.slice(40, 150)}"`);
    const B0 = clone(ST); B0.settings.start = '2026-11-30'; scene('2026-11-25T09:00:00', B0); const a0 = pe.wkAhead('2026-11-25');
    scene('2027-05-16T09:00:00', BLANK); const a1 = pe.wkAhead('2027-05-16'); at('2027-05-18T09:00:00'); const a2 = pe.wkAhead('2027-05-18');
    ok(a0 === null && a1 === null && a2 === null, '60-4. 준비 시작 전(시작 11/30)·본시험(5/15) 뒤에는 앞날 셈 없음');
    scene('2026-11-04T07:00:00', ST, XE); const XW = pe.SETS(); ['2026-11-02', '2026-11-03', '2026-11-04'].forEach(x => XW.sets[x] = cloneSet(x, 2, refsFor(1))); pe.invalidate(); pe.planToday('2026-11-04');
    const keep = () => { const S = clone(pe.S()); delete S.cal; return JSON.stringify(S); }, s0 = keep();
    pe.wkAhead('2026-11-04'); pe.wkAhead('2026-11-04', { days: { '2026-11-06': 0 } }); pe.offDelta('2026-11-04', '2026-11-04'); pe.offDelta('2026-11-04', '2026-11-07', 120); pe.catchLine('2026-11-04');
    await show('#week'); click('.drow[data-act="day-cap"]'); await sleep(10); click('#modal-wrap [data-act="sheet-close"]'); await show('#today'); click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="sheet-close"]'); await sleep(10);
    ok(keep() === s0, '60-5. 앞날 셈·쉬면 미리 보기·이번 주·오늘 시간 창·날마다 창은 기록을 바꾸지 않음(달력 제외)');
    // (60-6 일부) 쉬는 날·짧은 날은 백업에 그대로, S.days가 없는 예전 백업은 빈 칸으로 복원
    pe.S().days = { '2026-11-06': { m: 0 } }; const bk = JSON.parse(JSON.stringify({ state: pe.S(), sets: pe.SETS() })), old = clone(bk); delete old.state.days;
    await go('#backup'); d.querySelector('#restoreText').value = JSON.stringify(bk); click('[data-act="restore"]'); await sleep(80); const r1 = JSON.stringify(pe.S().days);
    await go('#backup'); d.querySelector('#restoreText').value = JSON.stringify(old); click('[data-act="restore"]'); await sleep(80);
    ok(r1 === '{"2026-11-06":{"m":0}}' && JSON.stringify(pe.S().days) === '{}', `60-6. 백업 → 복원에 쉬는 날 ${r1}, 예전 백업은 ${JSON.stringify(pe.S().days)}`);
    // 60-6. 평일 저녁에 나눠 하기(S.wk[W].cu)도 백업 → 복원에 그대로
    { const S = pe.S(); S.wk = S.wk || {}; (S.wk['2026-11-02'] = S.wk['2026-11-02'] || {}).cu = '2026-11-05'; S.days = { '2026-11-12': { m: 60 } }; const bk2 = JSON.stringify({ state: S, sets: pe.SETS() });
      delete S.wk['2026-11-02'].cu; S.days = {}; await go('#backup'); d.querySelector('#restoreText').value = bk2; click('[data-act="restore"]'); await sleep(80);
      ok(pe.S().wk['2026-11-02'].cu === '2026-11-05' && JSON.stringify(pe.S().days) === '{"2026-11-12":{"m":60}}', '60-6. 나눠 하기(S.wk[W].cu)·짧은 날도 백업 → 복원에 그대로'); }
    // 60-7. 지난주 기록 창: 예전 기록(gn·gd·ph·off 없음)도 그려지고, 새 기록은 적어 둔 목표 수와 쉬는 날 수로
    { const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), box = d.createElement('div'), LW = '2026-11-02', S = pe.S(), w0 = clone(S.wk[LW] || {});
      S.wk[LW] = { p: 62, parts: { core: 20, mock: 15, hand: 18, rev: 8, close: 1 }, lv: 1, at: '2026-11-09', carry: [], rel: [] };
      box.innerHTML = pe.lastWeekSheet(LW); const o = T_(box), gs = (pe.weekObj(pe.weekIndex(LW)).goals || []).length;
      ok(/지난주\(.+\) 62%/.test(o) && !/undefined|NaN/.test(o) && !/쉬는 날/.test(o) && (!gs || new RegExp('그 주 목표 \\d+/' + gs).test(o)), `60-7. 예전 기록(gn·gd·ph·off 없음)의 지난주 기록 창: "${o.slice(0, 120)}"`);
      Object.assign(pe.S().wk[LW], { gn: 3, gd: 1, off: 2 }); box.innerHTML = pe.lastWeekSheet(LW); const o2 = T_(box);
      ok(/그 주 목표 1\/3/.test(o2) && /쉬는 날 2일/.test(o2) && box.querySelector('p.note') && !/undefined|NaN/.test(o2), `60-7. 새 기록(gn 3 · gd 1 · off 2): "${o2.slice(0, 160)}"`); pe.S().wk[LW] = w0; }
    // 62. 설정 → 쉬는 날·짧은 날(수 11/04 07:00): 빈 칸 → 기간 창(31일까지, 시험 날 빼고, 평소 시간이면 지움) → 이어진 같은 시간끼리 한 줄 → 지우기
    { const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), mw = () => d.querySelector('#modal-wrap'), toastT = () => d.querySelector('#toast').textContent, rows = () => [...V$().querySelectorAll('[data-act="days-del"]')].map(b => T_(b.closest('.row').querySelector('.tt')));
      const XW = clone(FIX); ['2026-11-02', '2026-11-03', '2026-11-04'].forEach(x => XW.sets[x] = cloneSet(x, 2, refsFor(1))); scene('2026-11-04T07:00:00', ST, XW); pe.planToday('2026-11-04');
      await go('#settings'); pe.render(); await sleep(10); const lb = [...V$().querySelectorAll('label.f')].map(T_);
      ok(lb.includes('쉬는 날·짧은 날') && [...V$().querySelectorAll('.note')].some(x => T_(x) === '정한 날이 없어요') && V$().querySelector('.btn.sec[data-act="days-sheet"]') && prim().length === 1, '62-1. 설정: "쉬는 날·짧은 날" · "정한 날이 없어요" · 날짜 정하기(보조 버튼)');
      click('[data-act="days-sheet"]'); await sleep(10); const f = mw().querySelector('#offFrom'), to = mw().querySelector('#offTo');
      ok(/쉬는 날·짧은 날/.test(T_(mw().querySelector('.sheet-k'))) && T_(mw().querySelector('h3')) === '날짜 정하기' && f && to && f.type === 'date' && f.min === '2026-11-05' && f.max === add(pe.PLAN().target.d, -1) && mw().querySelectorAll('[data-act="days-set"]').length === 3
        && /한 번에 31일까지 정할 수 있어요\. 시험 날은 빼요\./.test(T_(mw())) && !mw().querySelectorAll('.btn:not(.sec):not(.ghost)').length, '62-2. 기간 창: 시작·끝(내일 ~ 시험 전날), 쉬어요 · 1시간 · 2시간, 안내, 파란 버튼 없음');
      click('#modal-wrap [data-act="days-set"][data-m="0"]'); await sleep(10); const e1 = toastT();
      f.value = '2026-11-16'; to.value = '2026-12-20'; click('#modal-wrap [data-act="days-set"][data-m="0"]'); await sleep(10); const e2 = toastT();
      ok(e1 === '시작과 끝 날짜를 고르세요' && e2 === '31일까지만 한 번에 정할 수 있어요' && !Object.keys(pe.S().days || {}).length && mw().querySelector('#offFrom'), `62-3. 날짜 없음 "${e1}", 35일 "${e2}"(창은 그대로, 기록 없음)`);
      f.value = '2026-11-20'; to.value = '2026-11-16'; click('#modal-wrap [data-act="days-set"][data-m="0"]'); await sleep(30); const t1 = toastT();
      ok(t1 === '11/16(월)~11/20(금)을 쉬는 날로 정했어요' && ['16', '17', '18', '19', '20'].every(x => pe.S().days['2026-11-' + x] && pe.S().days['2026-11-' + x].m === 0) && !mw().innerHTML, `62-4. 끝·시작을 거꾸로 골라도 11/16~11/20 쉬는 날: "${t1}"`);
      click('[data-act="days-sheet"]'); await sleep(10); mw().querySelector('#offFrom').value = '2026-11-12'; mw().querySelector('#offTo').value = '2026-11-12'; click('#modal-wrap [data-act="days-set"][data-m="60"]'); await sleep(30); const t2 = toastT();
      click('[data-act="days-sheet"]'); await sleep(10); mw().querySelector('#offFrom').value = '2026-11-06'; mw().querySelector('#offTo').value = '2026-11-07'; click('#modal-wrap [data-act="days-set"][data-m="120"]'); await sleep(30); const t3 = toastT();
      ok(t2 === '11/12(목)을 1시간으로 정했어요' && t3 === '11/6(금)~11/7(토)를 2시간으로 정했어요' && JSON.stringify(rows()) === JSON.stringify(['11/6(금)~11/7(토) · 2시간', '11/12(목) · 1시간', '11/16(월)~11/20(금) · 쉬어요']) && pe.weekBoard('2026-11-04').C === 1080 - 60 - 180,
        `62-5. 1시간 "${t2}", 2시간 "${t3}", 줄 ${JSON.stringify(rows())}, 이번 주 공부 시간 ${pe.weekBoard('2026-11-04').C}`);
      scene('2027-01-25T07:00:00', BLANK); await go('#settings'); pe.render(); await sleep(10); click('[data-act="days-sheet"]'); await sleep(10); mw().querySelector('#offFrom').value = '2027-01-28'; mw().querySelector('#offTo').value = '2027-02-01'; click('#modal-wrap [data-act="days-set"][data-m="0"]'); await sleep(30);
      const dz = Object.keys(pe.S().days || {}).sort();
      ok(dz.join() === '2027-01-28,2027-01-29,2027-01-31,2027-02-01' && !pe.S().days['2027-01-30'] && /1\/28\(목\)~1\/29\(금\) · 쉬어요/.test(T_(V$())) && /1\/31\(일\)~2\/1\(월\) · 쉬어요/.test(T_(V$())), `62-6. 시험 날(1/30)은 빼요: ${dz.join(', ')}`);
      const b0 = V$().querySelector('[data-act="days-del"][data-a="2027-01-28"]'); b0.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(30);
      ok(Object.keys(pe.S().days).sort().join() === '2027-01-31,2027-02-01' && toastT() === '1/28(목)~1/29(금)은 평소대로예요' && rows().length === 1 && T_(b0) === '지우기', `62-7. 지우기: 남은 ${Object.keys(pe.S().days).join(', ')}, 알림 "${toastT()}"`);
      // 62-8. 시험 날만 고르면 "시작과 끝 날짜를 고르세요"가 아니라 시험 날은 정할 수 없다고(창은 그대로, 기록 없음)
      { const d0 = JSON.stringify(pe.S().days); click('[data-act="days-sheet"]'); await sleep(10); mw().querySelector('#offFrom').value = '2027-01-30'; mw().querySelector('#offTo').value = '2027-01-30'; click('#modal-wrap [data-act="days-set"][data-m="0"]'); await sleep(30);
        ok(toastT() === '시험 날은 정할 수 없어요' && JSON.stringify(pe.S().days) === d0 && mw().querySelector('#offFrom'), `62-8. 시험 날(1/30)만: "${toastT()}"`); click('#modal-wrap [data-act="sheet-close"]'); await sleep(10); }
      pe.goTab('today'); await sleep(40); }
    pe.goTab('today'); await sleep(40); }
  // 56~59. 시험 일정 살펴보기(v3.1, 시계 고정): 미룰지 묻는 때(최근 4주 점수·쉬는 날·원서접수), 회차 견주기, 목표만 바꾸면 이번 주가 그대로일 때 바로·아니면 그 월요일부터(nextTarget),
  //         접수한 실전 모의는 복기 다음 월요일까지 지금 계획대로, 그 월요일에 지난주를 지금 계획으로 고정한 뒤 넣고 지난 주마다 산 단계를 적어 둠(S.wk[주].ph), 예약 작업 상태 wait·next·sent
  { const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), mw = () => d.querySelector('#modal-wrap'), toastT = () => d.querySelector('#toast').textContent;
    const START = '2026-10-19', sig = r => pe.planSig(pe.computePlan(START, r)), red = () => { const c = V$().cloneNode(true); [...c.querySelectorAll('section.sec')].filter(x => /^정기시험 일정/.test(x.querySelector('h2').textContent)).forEach(x => x.remove()); return !!c.querySelector('.ic.red') || /var\(--red\)/.test(c.innerHTML); };   /* 새 칸만(정기시험 일정의 목표 회차 빨강은 예전 그대로) */
    let copied = ''; const cp0 = w.PE_IO.copy; w.PE_IO.copy = x => { copied = x; return Promise.resolve(); };
    // 56. 최근 4주 52·58·71·49%(3주가 60% 아래) → pace
    const B56 = clone(BLANK); B56.wk = { '2026-12-14': { at: '2026-12-21', p: 52 }, '2026-12-21': { at: '2026-12-28', p: 58 }, '2026-12-28': { at: '2027-01-04', p: 71 }, '2027-01-04': { at: '2027-01-11', p: 49 } };
    scene('2027-01-11T07:00:00', B56); const c56 = pe.slipCheck('2027-01-11');
    ok(c56 && c56.why === 'pace' && JSON.stringify(c56.ps) === '[52,58,71,49]' && c56.low === 3 && c56.avg === 58 && c56.nx.r === 143, `56-1. 1/11 pace: ps ${JSON.stringify(c56 && c56.ps)} · 낮은 주 ${c56 && c56.low} · 평균 ${c56 && c56.avg} · 다음 ${c56 && c56.nx.r}`);
    await show('#week'); const sr = [...V$().querySelectorAll('.row')].find(r => T_(r.querySelector('.tt')) === '시험 일정 살펴보기');
    ok(sr && T_(sr.querySelector('.ds')) === '최근 4주 가운데 3주가 60%보다 낮아요' && sr.dataset.act === 'go' && sr.dataset.h === 'schedule' && sr.querySelector('.ic.gray') && !red(), '56-2. 이번 주 줄 "시험 일정 살펴보기 / 최근 4주 가운데 3주가 60%보다 낮아요"(회색, 시험 일정으로)');
    await show('#schedule'); const s56 = [...V$().querySelectorAll('section.sec')].find(x => T_(x.querySelector('h2')) === '시험을 미룰지 살펴봐요'), op = s56 ? [...s56.querySelectorAll('.schopt .row')] : [];
    ok(s56 && T_(s56.querySelector('.meta')) === '최근 4주 52% · 58% · 71% · 49%' && /최근 4주 가운데 3주가 60%보다 낮아요\./.test(T_(s56)) && op.length === 3
      && op[0].tagName === 'DIV' && T_(op[0].querySelector('.tag')) === '지금' && /^제142회 · 5월 15일\(토, 예상\)/.test(T_(op[0].querySelector('.tt'))) && /^시험까지 18주 · 1·2단계 6주 남음 · 단원마다 약 1주/.test(T_(op[0].querySelector('.ds')))
      && op[1].dataset.act === 'sch-pick' && op[1].dataset.r === '143' && T_(op[1].querySelector('.tag')) === '추천' && /^시험까지 33주 · 1·2단계 21주 남음 · 단원마다 약 2주/.test(T_(op[1].querySelector('.ds'))) && /3단계 6\/7\(월\)부터 · 실전 모의 제142회 5\/15/.test(T_(op[1]))
      && !op[2].querySelector('.tag') && s56.querySelector('.lnk[data-act="slip-no"]') && !red() && prim().length === 0, `56-3. 시험 일정 "시험을 미룰지 살펴봐요": ${s56 ? T_(s56).slice(0, 300) : '없음'}`);
    click('[data-act="slip-no"]'); await sleep(20);
    ok(pe.S().settings.slipNo && pe.S().settings.slipNo.at === '2027-01-11' && pe.S().settings.slipNo.avg === 58 && pe.slipCheck('2027-01-11') === null && toastT() === '4주 동안 다시 묻지 않을게요' && /다음 회차와 비교/.test(T_(V$().querySelector('details.schcmp summary'))), '56-4. 지금 일정대로 할게요 → 1/11에는 묻지 않음(닫힌 "다음 회차와 비교")');
    at('2027-01-18T07:00:00'); const c56b = pe.slipCheck('2027-01-18');
    ok(c56b && c56b.why === 'pace' && c56b.avg === 45 && c56b.ps[3] < 5, `56-4. 1/18: 1/11 주(앱을 열지 않음)는 계산 ${c56b && c56b.ps[3]}% → 평균 ${c56b && c56b.avg} ≤ 58 − 10이라 다시 물음`);
    { pe.planToday('2027-01-18'); const keep = () => { const S = clone(pe.S()); delete S.cal; return JSON.stringify(S); }, k0 = keep();
      pe.slipCheck('2027-01-18'); pe.weekP('2027-01-11'); pe.roundRows('2027-01-18'); pe.schFrom(pe.PLAN(), pe.computePlan(START, 144), '2027-01-18'); pe.repoPlanState('2027-01-18'); pe.schReq();
      for (const h of ['#week', '#more', '#today', '#schedule']) await show(h); click('[data-act="sch-pick"][data-r="143"]'); await sleep(10); click('[data-act="sch-cancel"]'); await sleep(10);
      ok(keep() === k0, '60-5. 시험 일정 살펴보기(slipCheck·weekP·roundRows·schFrom·repoPlanState·schReq)·이번 주·시험 일정·더보기·미리 보기는 기록을 바꾸지 않음(달력 제외)'); }
    { const B2 = clone(B56); B2.created = '2026-12-28'; scene('2027-01-11T07:00:00', B2); ok(pe.slipCheck('2027-01-11') === null, '56-5. 센 주가 2주뿐(12/28 설치)이면 묻지 않음'); }
    scene('2027-01-11T07:00:00', B56); await show('#today'); ok(!/시험 일정 살펴보기|시험을 미룰지|살펴볼 때/.test(T_(V$())), '56-6. 오늘 화면에는 띄우지 않음');
    await show('#more'); const mr = [...V$().querySelectorAll('.row')].find(r => /준비 시작일·목표 회차/.test(r.textContent));
    ok(mr && /시험 일정을 살펴볼 때예요/.test(T_(mr)) && !mr.querySelector('.ic.red'), '56-7. 더보기 시험 일정 줄 셋째 줄 "시험 일정을 살펴볼 때예요"(빨강 아님)');
    // 57. 1/12(2단계 12주차) 제143회로: 접수한 제141회(1/30)는 지금 계획대로, 2/8(월)부터 새 일정(공정·품질·원가·계약 · 1단계)
    const X57 = clone(FIX); X57.sets['2027-01-12'] = cloneSet('2027-01-12', 12, refsFor(2)); const B57 = Object.assign(clone(BLANK), { tk: { 'apply:141': '2026-12-30' } });
    scene('2027-01-12T07:00:00', B57, X57); const T57 = '2027-01-12';
    ok(pe.schFrom(pe.PLAN(), pe.computePlan(START, 143), T57) === '2027-02-08', '57-1. schFrom(142 → 143, 1/12, 제141회 접수) = 2/8');
    pe.planToday(T57); const pct0 = pe.weekBoard(T57).pct, g0 = JSON.stringify(pe.weekObj(12).goals), hw0 = pe.hwMin(T57).ew;
    pe.SETS().plan = sig(142); await show('#schedule'); click('[data-act="sch-pick"][data-r="143"]'); await sleep(20);
    const pv = () => d.querySelector('#schPrev'), pli = () => [...pv().querySelectorAll('.steps li')].pop(), pds = () => [...pv().querySelectorAll('.ds.schl')].map(T_);
    ok(prim().length === 1 && T_(prim()[0]) === '2/8(월)부터 이 일정으로' && T_(pli().querySelector('.k')) === '2/8부터' && T_(pli().querySelector('.v')) === '공정·품질·원가·계약 · 1단계 기본·단답'
      && pds().includes('제141회(1/30)는 지금 일정대로 보고 2/8(월)부터 바뀌어요.') && pds().includes('2/8부터 1단계로 돌아가요(지금은 2단계).') && pds().includes('실전 모의: 제141회 1/30 → 제142회 5/15')
      && pds().includes('저장하면 예약 작업에 보낼 변경 요청을 복사해요.') && !pds().includes('이번 주는 지금 일정 그대로예요.'), `57-2. 미리 보기: 파란 "${T_(prim()[0])}", ${T_(pli())} / ${pds().join(' | ')}`);
    copied = ''; click('[data-act="sch-save"]'); await sleep(30); const st57 = pe.S().settings;
    ok(JSON.stringify(st57.nextTarget) === JSON.stringify({ r: 143, from: '2027-02-08', prev: 'auto', at: T57 }) && pe.PLAN().target.r === 142 && pe.weekBoard(T57).pct === pct0 && JSON.stringify(pe.weekObj(12).goals) === g0
      && /--target 143/.test(copied) && /2\/8\(월\)부터/.test(copied) && /2\/7\(일\) 전이면 실행하지 말고/.test(copied) && st57.schSent === T57 && toastT() === '2/8(월)부터 제143회 일정이에요. 변경 요청을 복사했어요',
      `57-3. 저장 → 기다림 ${JSON.stringify(st57.nextTarget)}, 지금 계획 제${pe.PLAN().target.r}회, 점수 ${pct0} → ${pe.weekBoard(T57).pct}, 알림 "${toastT()}"`);
    ok(pe.repoPlanState(T57) === 'wait' && T_(V$().querySelector('.schpend .tt')) === '2/8(월)부터 제143회 일정이에요' && T_(V$().querySelector('.schpend .ds')) === '제141회(1/30)는 지금 일정대로 봐요' && V$().querySelector('.lnk[data-act="sch-next-cancel"]')
      && [...V$().querySelectorAll('.row .tt')].some(x => T_(x) === '예약 작업은 2/8(월)부터 바꿔요') && /2\/7\(일\)에 변경 요청을 붙여 넣어요/.test(T_(V$())) && /그 전에 붙여 넣으면 이번 주 남은 세트가 새 일정으로 와요\./.test(T_(V$())) && !red() && prim().length === 0
      && [...V$().querySelectorAll('.btn.sec')].filter(b => !b.closest('details:not([open])')).length <= 2, '57-4. 시험 일정: 기다리는 줄(바꾸지 않기)·예약 작업 wait(회색, 변경 요청 복사), 빨강 없음');
    await show('#more'); const mr57 = [...V$().querySelectorAll('.row')].find(r => /준비 시작일·목표 회차/.test(r.textContent));
    ok(mr57 && !mr57.querySelector('.ic.red') && !/예약 작업 일정과 달라요/.test(T_(mr57)) && /2\/8\(월\)부터 제143회 일정이에요/.test(T_(mr57)), `57-4. 더보기: 빨강 없이 "2/8(월)부터 제143회 일정이에요": ${T_(mr57)}`);
    pe.SETS().plan = sig(143); ok(pe.repoPlanState(T57) === 'next', '57-4. 저장소가 이미 제143회면 next'); pe.SETS().plan = sig(142);
    await show('#today'); ok(/ · 2\/8부터 제143회$/.test(T_(V$().querySelector('.ltitle .lsub'))), `57-4. 오늘 머리 줄 "… · 2/8부터 제143회": ${T_(V$().querySelector('.ltitle .lsub'))}`);
    at('2027-02-01T07:00:00'); pe.planToday('2027-02-01');
    ok(pe.dayKind('2027-01-30') === 'exam' && pe.taskList('2027-02-01').some(x => x.id === 'recap:141') && pe.PLAN().target.r === 142 && pe.S().settings.nextTarget, '57-5. 2/1: 1/30은 시험 날 그대로, 48시간 복기 핀, 아직 제142회');
    at('2027-02-08T07:00:00'); pe.planToday('2027-02-08'); const st57b = pe.S().settings, mn = pe.monNotice('2027-02-08');
    ok(pe.S().wk['2027-02-01'] && pe.S().wk['2027-02-01'].at === '2027-02-08' && pe.PLAN().target.r === 143 && pe.phaseObj(pe.weekIndex('2027-02-08')).id === 1 && pe.weekObj(16).t === '공정·품질·원가·계약'
      && st57b.nextTarget === undefined && JSON.stringify(st57b.schUndo) === JSON.stringify({ r: 'auto', at: '2027-02-08' }), `57-6. 2/8 07:00: 지난주 고정 ${pe.S().wk['2027-02-01'] && pe.S().wk['2027-02-01'].at}, 제${pe.PLAN().target.r}회, 16주차 ${pe.weekObj(16).t}, 되돌리기 ${JSON.stringify(st57b.schUndo)}`);
    ok(pe.S().wk['2027-01-11'].ph === 2 && pe.setPh(T57) === 2 && pe.hwMin(T57).ew === 1 && hw0 === 1 && pe.phaseObj(12).id === 1, `57-6. 지난 주의 단계(S.wk['2027-01-11'].ph ${pe.S().wk['2027-01-11'].ph}) → 1/12 세트 숙제 논술 실전 필수 ${pe.hwMin(T57).ew}(2단계 그대로)`);
    ok(mn && mn.sch === '새 일정 · 제143회 8월 28일(토) 목표' && /새 일정 · 제143회 8월 28일\(토\) 목표/.test(pe.monNoticeHTML(mn)), `57-6. 월요일 안내 "${mn && mn.sch}"`);
    // 57-7. 접수하지 않았으면 다음 월요일(1/18)부터, 미리 보기는 빠지는 제141회와 "제141회 접수했어요" → 치면 2/8부터
    scene('2027-01-12T07:00:00', BLANK, X57); ok(pe.schFrom(pe.PLAN(), pe.computePlan(START, 143), T57) === '2027-01-18', '57-7. 접수 안 함: 1/18부터');
    await show('#schedule'); click('[data-act="sch-pick"][data-r="143"]'); await sleep(20); const dr = [...pv().querySelectorAll('.ds.schl')].find(x => /는 일정에서 빠져요/.test(T_(x)));
    ok(T_(prim()[0]) === '1/18(월)부터 이 일정으로' && pds().includes('이번 주는 지금 일정 그대로예요.') && dr && /^제141회\(1\/30\)는 일정에서 빠져요\./.test(T_(dr)) && T_(dr.querySelector('.lnk[data-act="tk"][data-id="apply:141"]')) === '제141회 접수했어요', `57-7. 미리 보기: ${pds().join(' | ')}`);
    click('.lnk[data-id="apply:141"]'); await sleep(20);
    ok(pe.S().tk['apply:141'] === T57 && T_(prim()[0]) === '2/8(월)부터 이 일정으로' && ((pe.S().cal[T57] || {}).x || {})['tk:apply:141'][1] === '큐넷 원서접수 · 제141회', `57-7. 접수했어요 → 2/8부터 "${T_(prim()[0])}"(달력 "큐넷 원서접수 · 제141회")`);
    click('[data-act="sch-save"]'); await sleep(20); const p57 = JSON.stringify(pe.PLAN().map);
    click('[data-act="sch-next-cancel"]'); await sleep(20);
    ok(pe.S().settings.nextTarget === undefined && JSON.stringify(pe.PLAN().map) === p57 && pe.PLAN().target.r === 142 && toastT() === '지금 일정 그대로 둬요', '57-8. 바꾸지 않기 → 기다림만 지움(계획 그대로)');
    // 58. 11/5(목, 2주차) 제143회로: 이번 주 주차 틀이 같아 바로, 되돌리기 7일
    scene('2026-11-05T07:40:00', ST); const T58 = '2026-11-05'; pe.planToday(T58); const pct58 = pe.weekBoard(T58).pct;
    ok(pe.schFrom(pe.PLAN(), pe.computePlan(START, 143), T58) === null, '58-1. schFrom(142 → 143, 11/5) = 바로');
    pe.SETS().plan = sig(142); await show('#schedule'); const tg = d.querySelector('#schTarget'); tg.value = '143'; tg.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
    ok(T_(prim()[0]) === '이 일정으로 저장' && T_(pli().querySelector('.k')) === '다음 주' && T_(pli().querySelector('.v')) === '기초 + 흙막이·가시설 (이어서) · 1단계 기본·단답' && pds().includes('실전 모의: 제141회 1/30 → 제142회 5/15') && pds().includes('제142회(5/15)는 실전 모의 날로 남아요.'),
      `58-1. 미리 보기 "${T_(prim()[0])}", ${T_(pli())} / ${pds().join(' | ')}`);
    copied = ''; click('[data-act="sch-save"]'); await sleep(30); const st58 = pe.S().settings, P58 = pe.PLAN();
    ok(P58.target.r === 143 && P58.E === 44 && P58.mock.r === 142 && pe.weekBoard(T58).pct === pct58 && JSON.stringify(st58.schUndo) === JSON.stringify({ r: 'auto', at: T58 }) && st58.schSent === T58 && pe.repoPlanState(T58) === 'sent'
      && /--target 143/.test(copied) && !/실행하지 말고/.test(copied) && toastT() === '제143회로 바꿨어요. 변경 요청을 복사했어요' && st58.nextTarget === undefined && pe.S().wk['2026-10-26'].ph === 1,
      `58-2. 저장 → 바로 제${P58.target.r}회(E ${P58.E}, 실전 모의 ${P58.mock.r}), 점수 ${pct58} → ${pe.weekBoard(T58).pct}, 상태 ${pe.repoPlanState(T58)}, 알림 "${toastT()}"`);
    ok(/변경 요청을 복사해 두었어요/.test(T_(V$())) && T_(V$().querySelector('[data-act="sch-copy"]')) === '다시 복사' && !red() && T_(V$().querySelector('.schpend .tt')) === '제142회로 되돌리기' && T_(V$().querySelector('.schpend .ds')) === '11/5에 바꿨어요 · 11/12까지', '58-2. 시험 일정: sent(회색, 다시 복사)·되돌리기 줄');
    await show('#more'); ok(![...V$().querySelectorAll('.row')].find(r => /준비 시작일·목표 회차/.test(r.textContent)).querySelector('.ic.red'), '58-2. 더보기 빨강 아님');
    at('2026-11-13T07:40:00'); await show('#schedule');
    ok(pe.repoPlanState('2026-11-13') === 'diff' && /예약 작업은 아직 이전 일정이에요/.test(T_(V$())) && !V$().querySelector('.schpend'), '58-4. 11/13: 7일이 지나 diff(빨강), 되돌리기 줄 없음');
    at('2026-11-05T07:50:00'); await show('#schedule'); click('.schpend [data-act="sch-pick"]'); await sleep(20); ok(T_(prim()[0]) === '이 일정으로 저장', '58-3. 되돌리기 → 같은 미리 보기(바로)');
    click('[data-act="sch-save"]'); await sleep(30);
    ok(pe.PLAN().target.r === 142 && pe.S().settings.target === 'auto' && pe.repoPlanState(T58) === 'same' && JSON.stringify(pe.S().settings.schUndo) === JSON.stringify({ r: 143, at: T58 }), `58-3. 되돌리기 저장 → 제${pe.PLAN().target.r}회(저장소와 같음)`);
    // 59. 4/20: 제142회 원서접수(4/13~4/16)를 치지 않음 → apply(미루면 제142회는 실전 모의 날로)
    scene('2027-04-20T07:00:00', BLANK); const c59 = pe.slipCheck('2027-04-20');
    await show('#week'); const r59 = [...V$().querySelectorAll('.row')].find(r => /원서접수를 했나요/.test(r.textContent));
    ok(c59 && c59.why === 'apply' && r59 && T_(r59.querySelector('.tt')) === '제142회 원서접수를 했나요?' && T_(r59.querySelector('.ds')) === '접수 기간(4/13~4/16)이 지났어요', `59. 이번 주 줄 "${T_(r59)}"`);
    await show('#schedule'); const s59 = [...V$().querySelectorAll('section.sec')].find(x => T_(x.querySelector('h2')) === '시험을 미룰지 살펴봐요');
    ok(s59 && /제142회 원서접수 기간\(4\/13~4\/16\)이 지났어요\./.test(T_(s59)) && T_(s59.querySelector('.btn.sec[data-act="tk"][data-id="apply:142"]')) === '제142회 접수했어요' && !s59.querySelector('[data-act="slip-no"]'), '59. 시험 일정: 까닭과 보조 버튼 "제142회 접수했어요"');
    click('[data-act="sch-pick"][data-r="143"]'); await sleep(20);
    ok(T_(prim()[0]) === '4/26(월)부터 이 일정으로' && pds().includes('제142회(5/15)는 실전 모의 날로 남아요.'), `59. 143 미리 보기: "${T_(prim()[0])}" / ${pds().join(' | ')}`);
    click('[data-act="sch-cancel"]'); await sleep(20); click('.btn.sec[data-id="apply:142"]'); await sleep(20);
    ok(pe.slipCheck('2027-04-20') === null && pe.schFrom(pe.PLAN(), pe.computePlan(START, 144), '2027-04-20') === '2027-05-24', '59. 접수했어요 → 묻지 않음, 그 뒤 제144회로는 5/24부터(제142회 복기 다음 월요일)');
    // 60-6. 바꾸기를 기다리는 기록도 백업 → 복원에 그대로, 그 월요일이 지났으면 복원한 뒤 받아 오기가 끝나면 넣음
    scene('2026-11-10T07:00:00', ST); Object.assign(pe.S().settings, { nextTarget: { r: 143, from: '2026-11-09', prev: 'auto', at: '2026-11-05' } }); const bk = JSON.stringify({ state: pe.S(), sets: pe.SETS() });
    pe.S().settings.nextTarget = { r: 143, from: '2026-11-16', prev: 'auto', at: '2026-11-05' }; const bk2 = JSON.stringify({ state: pe.S(), sets: pe.SETS() });
    await go('#backup'); d.querySelector('#restoreText').value = bk2; click('[data-act="restore"]'); await sleep(150);
    const r1 = JSON.stringify(pe.S().settings.nextTarget), t1 = pe.PLAN().target.r;
    await go('#backup'); d.querySelector('#restoreText').value = bk; click('[data-act="restore"]'); await sleep(150);
    ok(r1 === JSON.stringify({ r: 143, from: '2026-11-16', prev: 'auto', at: '2026-11-05' }) && t1 === 142 && pe.S().settings.nextTarget === undefined && pe.PLAN().target.r === 143 && pe.S().settings.schUndo.at === '2026-11-10',
      `60-6. 복원: 기다리는 ${r1}(제${t1}회 그대로), 지난 월요일 것은 받아 오기 뒤 제${pe.PLAN().target.r}회`);
    // 60-8. 오늘·이번 주·시험 일정·설정에 쓰지 않는 낱말("못 한 것", "진도 n", "넘침 단계")
    { const bad = []; for (const [iso, st, X] of [['2027-01-11T07:00:00', B56], ['2027-01-12T07:00:00', B57, X57], ['2026-11-05T07:40:00', ST], ['2027-04-20T07:00:00', BLANK]]) { scene(iso, st, X);
        if (iso.startsWith('2027-01-12')) pe.S().settings.nextTarget = { r: 143, from: '2027-02-08', prev: 'auto', at: '2027-01-12' };
        for (const h of ['#today', '#week', '#schedule', '#settings']) { await show(h); if (/못 한 것|진도 \d|넘침 단계/.test(T_(V$()))) bad.push(iso.slice(0, 10) + h); } }
      ok(!bad.length, '60-8. 쓰지 않는 낱말 없음 ' + bad.join(', ')); }
    // 60-9. 새 창·칸: 파란 버튼은 하나 이하, 빨강 없음(시험 일정 기다림·되돌리기·견주기, 지난주 기록의 살펴보기 줄, 더보기)
    { scene('2027-01-11T07:00:00', B56); pe.planToday('2027-01-11'); const box = d.createElement('div'); box.innerHTML = pe.lastWeekSheet('2027-01-04');
      const lr = [...box.querySelectorAll('.row')].find(r => T_(r.querySelector('.tt')) === '시험 일정 살펴보기');
      ok(lr && lr.dataset.act === 'go' && !box.querySelector('.ic.red') && !/var\(--red\)/.test(box.innerHTML) && box.querySelectorAll('.btn:not(.sec):not(.ghost)').length <= 1, '60-9. 지난주 기록 창의 "시험 일정 살펴보기" 줄(회색), 빨강 없음');
      await show('#schedule'); const n0 = prim().length; click('[data-act="sch-pick"][data-r="143"]'); await sleep(20);
      ok(n0 === 0 && prim().length === 1 && !red(), `60-9. 시험 일정: 파란 버튼 ${n0} → 미리 보기 ${prim().length}, 빨강 없음`); click('[data-act="sch-cancel"]'); await sleep(10); }
    // 64. 시험 일정 고침: 변경 요청은 저장한 일정의 것인지(schSig)로 sent, 7일 안의 두 번째 바꾸기·되돌리기·바꾸지 않기, 같은 계획은 저장 없음, 바꾼 뒤 다시 묻지 않음, 바꾸는 월요일의 받아 오기
    { const repoSec = () => [...V$().querySelectorAll('section.sec')].find(x => /예약 작업 일정/.test(T_(x.querySelector('h2')))), pick = async r => { const tg = d.querySelector('#schTarget'); tg.value = String(r); tg.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20); };
      const CP = '저장하면 예약 작업에 보낼 변경 요청을 복사해요.', setLine = () => copied.split('\n').find(l => /set-plan/.test(l)) || '';
      // 64-1. 11/5 제143회로 바로(복사) → 11/6 제144회(11/9부터): 첫 요청은 143이라 다시 복사, 144 요청과 "11/8(일) 전이면 실행하지 말고"
      scene('2026-11-05T07:40:00', ST); pe.planToday('2026-11-05'); pe.SETS().plan = sig(142); await show('#schedule'); await pick(143); copied = ''; click('[data-act="sch-save"]'); await sleep(30);
      const c1 = setLine(); at('2026-11-06T07:40:00'); await show('#schedule'); await pick(144); const pv1 = pds();
      copied = ''; click('[data-act="sch-save"]'); await sleep(30); const st1 = pe.S().settings;
      ok(/--target 143/.test(c1) && pv1.includes(CP) && /--target 144/.test(setLine()) && /11\/8\(일\) 전이면 실행하지 말고/.test(copied) && toastT() === '11/9(월)부터 제144회 일정이에요. 변경 요청을 복사했어요'
        && st1.schSent === '2026-11-06' && st1.schSig && st1.schSig.target === 144 && pe.repoPlanState('2026-11-06') === 'sent' && /변경 요청을 복사해 두었어요/.test(T_(repoSec())),
        `64-1. 7일 안에 두 번째 바꾸기(제144회, 11/9부터)도 같은 탭에서 복사: "${setLine()}", 알림 "${toastT()}", 상태 ${pe.repoPlanState('2026-11-06')}`);
      // 64-2. 11/5 제143회(복사) → 붙여 넣어 저장소 143(same) → 11/6 되돌리기: 미리 보기에 복사 줄, 저장하면 제142회 요청을 복사(sent는 그 요청)
      scene('2026-11-05T07:40:00', ST); pe.planToday('2026-11-05'); pe.SETS().plan = sig(142); await show('#schedule'); await pick(143); click('[data-act="sch-save"]'); await sleep(30);
      pe.SETS().plan = sig(143); at('2026-11-06T07:40:00'); const rp2 = pe.repoPlanState('2026-11-06'); await show('#schedule'); click('.schpend [data-act="sch-pick"]'); await sleep(20); const pv2 = pds();
      copied = ''; click('[data-act="sch-save"]'); await sleep(30);
      ok(rp2 === 'same' && pv2.includes(CP) && pe.PLAN().target.r === 142 && /--target auto/.test(setLine()) && /목표 142회/.test(copied) && toastT() === '제142회로 바꿨어요. 변경 요청을 복사했어요'
        && pe.repoPlanState('2026-11-06') === 'sent' && pe.S().settings.schSig.target === 142, `64-2. 저장소가 제143회일 때 되돌리기 → 제142회 요청 복사 "${setLine()}", 알림 "${toastT()}"`);
      pe.SETS().plan = sig(143); pe.S().settings.schSig = sig(143);
      ok(pe.repoPlanState('2026-11-06') === 'diff', '64-2. 복사해 둔 요청이 지금 일정(제142회)의 것이 아니면 sent가 아니라 diff(빨강)');
      // 64-3. 저장소로 돌아가는 되돌리기는 복사하지 않음(미리 보기에도 복사 줄 없음), 복사 기록을 지움
      scene('2026-11-05T07:40:00', ST); pe.planToday('2026-11-05'); pe.SETS().plan = sig(142); await show('#schedule'); await pick(143); click('[data-act="sch-save"]'); await sleep(30);
      at('2026-11-05T07:50:00'); await show('#schedule'); click('.schpend [data-act="sch-pick"]'); await sleep(20); const pv3 = pds(); copied = ''; click('[data-act="sch-save"]'); await sleep(30);
      ok(!pv3.includes(CP) && copied === '' && toastT() === '시험 일정을 바꿨어요' && pe.repoPlanState('2026-11-05') === 'same' && pe.S().settings.schSent === undefined && pe.S().settings.schSig === undefined,
        `64-3. 저장소 일정으로 되돌리기: 복사 줄 ${pv3.includes(CP)}, 알림 "${toastT()}", 상태 ${pe.repoPlanState('2026-11-05')}`);
      // 64-4. 다를 때(diff) "변경 요청 복사"를 누른 뒤 제143회로 바꿔도 새 요청을 복사
      scene('2026-11-05T07:40:00', ST); pe.planToday('2026-11-05'); pe.SETS().plan = sig(144); await show('#schedule'); const r4 = pe.repoPlanState('2026-11-05'); click('[data-act="sch-copy"]'); await sleep(30); const r4b = pe.repoPlanState('2026-11-05');
      await pick(143); copied = ''; click('[data-act="sch-save"]'); await sleep(30);
      ok(r4 === 'diff' && r4b === 'sent' && /--target 143/.test(setLine()) && toastT() === '제143회로 바꿨어요. 변경 요청을 복사했어요' && pe.repoPlanState('2026-11-05') === 'sent', `64-4. diff → 복사(sent) → 제143회 저장: 다시 복사 "${setLine()}"`);
      // 64-5. 기다리는 새 일정(제143회, 1/18부터)을 미리 붙여 넣었는데(next) 바꾸지 않기 → 저장소가 지금 일정과 달라 diff(빨강, 변경 요청 복사)
      scene('2027-01-12T07:00:00', BLANK, X57); pe.SETS().plan = sig(142); await show('#schedule'); click('[data-act="sch-pick"][data-r="143"]'); await sleep(20); click('[data-act="sch-save"]'); await sleep(30);
      pe.SETS().plan = sig(143); const r5 = pe.repoPlanState(T57); at('2027-01-14T07:00:00'); await show('#schedule'); click('[data-act="sch-next-cancel"]'); await sleep(20);
      ok(r5 === 'next' && pe.repoPlanState('2027-01-14') === 'diff' && /예약 작업은 아직 이전 일정이에요/.test(T_(repoSec())) && repoSec().querySelector('.ic.red') && T_(repoSec().querySelector('[data-act="sch-copy"]')) === '변경 요청 복사',
        `64-5. 미리 붙여 넣은 뒤 바꾸지 않기: ${r5} → ${pe.repoPlanState('2027-01-14')}`);
      // 64-6. 지금과 같은 계획(자동 = 제142회 → "제142회")은 바꾸지 않음: 미리 보기·저장 버튼·되돌리기 없음
      scene('2026-11-05T07:40:00', ST); pe.planToday('2026-11-05'); await show('#schedule'); await pick(142);
      ok(T_(d.querySelector('#schPrev .sheet-k')) === '지금 일정' && !d.querySelector('[data-act="sch-save"]') && !d.querySelector('[data-act="sch-cancel"]') && !pds().length && pe.S().settings.schUndo === undefined, '64-6. 자동(제142회)에서 제142회를 골라도 "지금 일정"(저장·취소 버튼 없음)');
      await pick('auto');
      // 64-7. 1/11 pace(52·58·71·49%)로 제143회(1/18부터) → 1/18 바꾼 월요일: 바꾼 주부터 세어 묻지 않음(이번 주 줄·시험 일정 칸·더보기 없음), 새 일정 3주(2/8)가 지나면 다시
      scene('2027-01-11T07:00:00', B56); pe.SETS().plan = null; await show('#schedule'); click('[data-act="sch-pick"][data-r="143"]'); await sleep(20); click('[data-act="sch-save"]'); await sleep(30);
      at('2027-01-18T07:00:00'); pe.planToday('2027-01-18'); const tr7 = pe.PLAN().target.r, c7 = pe.slipCheck('2027-01-18');
      await show('#week'); const w7 = [...V$().querySelectorAll('.row .tt')].some(x => T_(x) === '시험 일정 살펴보기'); await show('#schedule'); const s7 = [...V$().querySelectorAll('section.sec h2')].some(x => T_(x) === '시험을 미룰지 살펴봐요');
      await show('#more'); const m7 = /시험 일정을 살펴볼 때예요/.test(T_(V$()));
      at('2027-02-01T07:00:00'); const c7b = pe.slipCheck('2027-02-01'); at('2027-02-08T07:00:00'); const c7c = pe.slipCheck('2027-02-08');
      ok(tr7 === 143 && c7 === null && !w7 && !s7 && !m7 && c7b === null && c7c && c7c.why === 'pace' && c7c.ps.length === 3,
        `64-7. 바꾼 월요일(1/18)에는 다시 묻지 않음(이번 주 ${w7} · 시험 일정 ${s7} · 더보기 ${m7}), 2/1 ${c7b && c7b.why}, 2/8 ${c7c && c7c.why} ${c7c && JSON.stringify(c7c.ps)}`);
      // 64-8. 바꾸는 월요일(11/9)에 앱을 열면: 받아 오는 동안 그린 화면이 금요일 세트 전의 캐시를 남겨도 지난주는 받은 세트로 고정(모든 세트가 있을 때와 같음)
      { const X = clone(FIX); ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].forEach(x => X.sets[x] = cloneSet(x, 2, refsFor(1))); X.mocks['2026-11-07'] = cloneMock('2026-11-07', { p1: clone(MOCK0.p1), p2: P2_2 }); X.sets['2026-11-09'] = cloneSet('2026-11-09', 3, refsFor(1));
        const upto = dd => { const Y = { sets: {}, mocks: {} }; Object.keys(X.sets).filter(x => x <= dd).forEach(x => Y.sets[x] = clone(X.sets[x])); Object.keys(X.mocks).filter(x => x <= dd).forEach(x => Y.mocks[x] = clone(X.mocks[x])); return Y; };
        scene('2026-11-02T07:00:00', ST, upto('2026-11-01'));
        for (const day of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']) { at(day + 'T07:00:00'); pe.SETS().sets[day] = clone(X.sets[day]); pe.invalidate(); const V = pe.planToday(day); applyRows(V.rows, day); at(day + 'T22:00:00'); pe.planToday(day); }
        const S1 = clone(pe.S()), SETS1 = clone(pe.SETS()), f0 = w.fetch; SERVER = X; w.fetch = async u => { await sleep(15); return f0(u); };
        scene('2026-11-09T07:00:00', S1, SETS1); pe.S().sync = {}; pe.S().settings.nextTarget = { r: 144, from: '2026-11-09', prev: 'auto', at: '2026-11-05' }; pe.SETS().plan = sig(142);
        const pr = pe.sync(true); await go('#today'); pe.render(); await pr;   /* 앱을 열 때 순서(sync(true) → route()): 받아 오는 동안 그린 화면이 캐시를 채운다 */ await sleep(30); pe.render(); await sleep(10); const g = clone(pe.S().wk['2026-11-02'] || {}), tg8 = pe.PLAN().target.r;
        w.fetch = f0; SERVER = null; scene('2026-11-09T07:00:00', S1, upto('2026-11-09')); pe.planToday('2026-11-09'); const o = pe.S().wk['2026-11-02'];
        ok(tg8 === 144 && g.at === '2026-11-09' && g.p === o.p && JSON.stringify(g.parts) === JSON.stringify(o.parts) && JSON.stringify(g.rel) === JSON.stringify(o.rel),
          `64-8. 바꾸는 월요일 받아 오기: 지난주 ${g.p}% ${JSON.stringify(g.rel)} = 모든 세트로 ${o.p}% ${JSON.stringify(o.rel)}`); }
      // 64-9. 접수한 목표 시험(제142회) 뒤 기다리는 제144회(5/24부터): 시험 뒤에도 오늘 머리 줄 끝에 "· 5/24부터 제144회"(한 덩이)
      { const B9 = Object.assign(clone(BLANK), { tk: { 'apply:142': '2027-04-14' } }); B9.settings.nextTarget = { r: 144, from: '2027-05-24', prev: 'auto', at: '2027-04-20' }; const sb = [];
        for (const x of ['2027-05-10', '2027-05-16', '2027-05-20']) { scene(x + 'T07:00:00', B9); await show('#today'); const ls = V$().querySelector('.ltitle .lsub'); sb.push(ls && / · 5\/24부터 제144회$/.test(T_(ls)) && T_(ls.querySelector('.nw')) === '5/24부터 제144회'); }
        ok(sb.every(Boolean), `64-9. 오늘 머리 줄의 기다리는 바꾸기(5/10 · 5/16 · 5/20): ${sb.join(', ')}`); }
      // 64-10. 3단계 뒤(4/20) 지금 회차 줄: 단원마다·지난 3단계 시작·지난 실전 모의는 쓰지 않음. 미리 보기의 기다리는 버튼은 "이 일정으로"가 한 덩이, 아래 문장도 그날부터
      scene('2027-04-20T07:00:00', BLANK); await show('#schedule'); const op10 = [...V$().querySelectorAll('.schopt .row')], cur10 = T_(op10[0].querySelector('.ds'));
      click('[data-act="sch-pick"][data-r="143"]'); await sleep(20); const b10 = prim()[0], sv10 = [...pv().querySelectorAll('p.ds')].map(T_).find(x => /오늘 화면, 로드맵/.test(x));
      ok(/^시험까지 4주 · 1·2단계 0주 남음$/.test(cur10) && !/단원마다|3단계|실전 모의 제141회/.test(cur10) && T_(b10) === '4/26(월)부터 이 일정으로' && T_(b10.querySelector('.nw')) === '이 일정으로' && b10.closest('.btns.schsv')
        && sv10 === '4/26(월)부터 오늘 화면, 로드맵, 주차와 단계가 새 일정으로 바뀌어요. 카드·오답 기록은 그대로예요.', `64-10. 지금 회차 줄 "${cur10}", 버튼 "${T_(b10)}", 문장 "${sv10}"`);
      // 64-11. 시험 일정에서 "제142회 접수했어요"를 치면 알림(칸이 접혀 사라짐)
      click('[data-act="sch-cancel"]'); await sleep(10); click('.btn.sec[data-id="apply:142"]'); await sleep(20);
      ok(toastT() === '제142회 원서접수를 적어 두었어요' && pe.S().tk['apply:142'] === '2027-04-20', `64-11. 접수했어요 알림 "${toastT()}"`); }
    w.PE_IO.copy = cp0; pe.goTab('today'); await sleep(40); }

  // 65. 어느 요일에 시작해도(3.1.1): 주는 시작일이 든 주의 월요일부터 센다(한 주는 늘 월~일, 첫 주 = 준비 주는 시작일~일요일로 짧다).
  //     시작 전 날의 세트·모의는 첫 주 몫(밀린 세트·세트 핵심·모의·넘어온 것·점수)이 아니고, 예약 작업에는 그 월요일을 --start로 보낸다. 월요일 시작은 예전과 같다
  { const T_ = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim(), V$ = () => d.querySelector('#view'), show = async h => { await go(h); pe.render(); await sleep(10); };
    const stM = clone(BLANK); scene('2026-10-22T07:00:00', stM); const P0 = pe.PLAN();
    ok(P0.start === '2026-10-19' && P0.begin === '2026-10-19' && pe.firstWeekTxt('2026-10-19') === '' && pe.wkFrom('2026-10-19') === '2026-10-19', '65-1. 월요일(10/19) 시작: 기준 월요일 = 시작일, 첫 주 안내 없음');
    const st = clone(BLANK); st.settings.start = '2026-10-22'; scene('2026-10-22T07:00:00', st); const P = pe.PLAN();
    ok(P.start === '2026-10-19' && P.begin === '2026-10-22' && P.E === P0.E && P.M === P0.M && P.target.r === P0.target.r && pe.planSig().start === '2026-10-19' && pe.wkFrom('2026-10-19') === '2026-10-22',
      `65-2. 목요일(10/22) 시작: 주는 10/19(월)부터(E ${P.E} = ${P0.E}, 예약 작업 start ${pe.planSig().start})`);
    ok(pe.wkIdx('2026-10-21') === -1 && pe.wkIdx('2026-10-22') === 0 && pe.wkIdx('2026-10-25') === 0 && pe.wkIdx('2026-10-26') === 1 && pe.weekIndex('2026-10-26') === 1,
      '65-3. 10/21(수)은 시작 전, 10/22~10/25는 준비 주(0주), 10/26(월)부터 1주차');
    const T = pe.taskList('2026-10-22'), B = pe.weekBoard('2026-10-22'), core = line(B, 'core'), pre = x => [x.d, x.set].concat(x.ds || []).some(v => v && v < '2026-10-22') || /2026-10-2[01]/.test(JSON.stringify(x));   /* 10/19는 주 키(report:2026-10-19 등)라 날짜 칸으로 본다 */
    ok(!T.some(x => /^late:/.test(x.id)) && !T.some(pre) && core.b === 2 && !core.gaps.some(x => x < '2026-10-22') && T.some(x => x.id === 'set.read:2026-10-22'),
      `65-4. 첫날: 시작 전 세트(10/19~10/21)는 밀린 세트도 할 일도 아니고, 세트 핵심은 10/22·10/23 두 개(${core.b})`);
    at('2026-10-23T21:00:00'); const A = pe.wkAhead('2026-10-23'), T2 = pe.taskList('2026-10-23');
    ok(!T2.some(pre) && !JSON.stringify(A).match(/2026-10-(19|20|21)/), '65-5. 다음 날(10/23) 오늘 몫·앞날 셈에도 시작 전 세트 없음');
    await show('#week'); const sub = T_(V$().querySelector('.ltitle .lsub')), rows = [...V$().querySelectorAll('.drow')].map(T_);
    ok(/^준비 주 · 10\/22~10\/25 · /.test(sub) && rows.slice(0, 3).every(r => /준비 시작 전/.test(r)) && !/준비 시작 전/.test(rows[3]) && V$().querySelectorAll('.drow')[0].tagName === 'DIV',
      `65-6. 이번 주: 머리 "${sub}", 월~수 줄은 "준비 시작 전"(누를 수 없음)`);
    pe.S().settings.target = 'auto'; const rq = pe.schReq();
    ok(/--start 2026-10-19 /.test(rq) && /앱의 준비 시작일은 10\/22\(목\)이에요/.test(rq), '65-7. 변경 요청: --start는 그 주 월요일(10/19), 앱의 시작일 한 줄');
    await show('#schedule'); const fn = [...V$().querySelectorAll('.note')].map(T_).find(x => /^첫 주/.test(x));
    ok(fn === '첫 주(준비 주)는 10/22(목)~10/25(일) 4일이고, 10/26(월)부터 1주차예요. 한 주는 늘 월요일부터 일요일까지예요(토요일 모의고사, 일요일 마감).' && !V$().querySelector('.note.warn'), `65-8. 시험 일정 첫 주 안내 "${fn}"`);
    await show('#plan'); const lw = T_(V$().querySelector('.lsub')), w0 = [...V$().querySelectorAll('.wk')].find(x => /^0주차/.test(T_(x.querySelector('h4'))));
    ok(/^10월 22일 시작/.test(lw) && w0 && /^10\/22~10\/25/.test(T_(w0.querySelector('.dt'))), `65-9. 로드맵 "${lw}", 0주차 ${w0 && T_(w0.querySelector('.dt'))}`);
    // 다음 월요일: 지난주(첫 주) 넘어온 세트는 시작 뒤 세트만, 지난주 고정도 같음
    st.created = '2026-10-22'; scene('2026-10-26T07:00:00', st); const T3 = pe.taskList('2026-10-26'), cs = T3.find(x => x.k === 'carry.sets'), sn = pe.weekSnap('2026-10-26');
    ok(cs && cs.ds.join() === '2026-10-23,2026-10-22' && sn && sn.at && !JSON.stringify(sn).match(/10\/(19|20|21)/), `65-10. 10/26(월): 넘어온 세트 ${cs && cs.ds.join()}, 지난주 고정 ${sn && sn.p}%`);
    // 일요일 시작: 첫 주는 그날 하루, 시작 전 토요일 모의는 첫 주 몫이 아님
    const su = clone(BLANK); su.settings.start = '2026-10-25'; scene('2026-10-25T07:00:00', su); const B4 = pe.weekBoard('2026-10-25'), T4 = pe.taskList('2026-10-25');
    ok(pe.PLAN().start === '2026-10-19' && !line(B4, 'mock') && line(B4, 'core').b === 0 && !T4.some(x => [x.d, x.set].concat(x.ds || []).some(v => v && v < '2026-10-25') || /2026-10-2[0-4]/.test(JSON.stringify(x))) && pe.firstWeekTxt('2026-10-25') === '첫 주(준비 주)는 10/25(일) 하루이고, 10/26(월)부터 1주차예요. 한 주는 늘 월요일부터 일요일까지예요(토요일 모의고사, 일요일 마감).',
      `65-11. 일요일(10/25) 시작: 모의 줄 없음, 세트 핵심 0, 시작 전 할 일 없음`);
    // 시작 전(같은 주 월요일): 오늘은 카드 하나뿐
    const st2 = clone(BLANK); st2.settings.start = '2026-10-22'; scene('2026-10-19T08:00:00', st2); await show('#today');
    ok(/준비 시작 전 · 10월 22일부터/.test(T_(V$())) && pe.taskList('2026-10-19').length === 0, '65-12. 같은 주 시작 전 날(10/19): "준비 시작 전 · 10월 22일부터", 할 일 없음');
    pe.goTab('today'); await sleep(40); }
  ok(errors.length === 0, '콘솔 오류 없음 ' + errors.slice(0, 3).join(' | '));
  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
