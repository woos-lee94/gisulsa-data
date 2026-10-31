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
const repo = () => { const X = pe ? pe.SETS() : FIX, f = { 'data/index.json': { v: 1, updated: '2026-10-31T06:30:00+09:00', sets: Object.keys(X.sets).sort().map(d => ({ d, rev: 1, t: X.sets[d].title, u: X.sets[d].units })), mocks: Object.keys(X.mocks).sort().map(d => ({ d, rev: 1, t: X.mocks[d].title })) } };
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
    else if (ty === 'rev') { const p = sp(a); p.rev = p.rev || {}; [1, 3, 7, 14, 30].filter(s => s <= Number(b)).forEach(s => p.rev[s] = date); pe.setIds(a).forEach(gradeCard); }
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
  ok(Object.keys(pe.SETS().sets).length === 10 && pe.SETS().mocks['2026-10-31'] && pe.SETS().mocks['2026-10-31'].p2.length === 2, '가짜 저장소: 세트 10개(10/19~10/30), 10/31 모의(1교시 + 논술 2문)');
  ok(Object.values(REFS).flat().every(id => pe.deck().some(c => c.id === id)), '복제 세트가 가리키는 카드가 모두 덱에 있음');
  ok(pe.setIds('2026-10-29').length === 10 && pe.setIds('2026-10-29')[0] === 'D20261029-1', '복제 세트의 새 용어는 날짜마다 다른 카드(D20261029-1…)');
  const THU = '2026-10-29', WD = '2026-10-28', SAT = '2026-10-31', SUN = '2026-11-01', MON = '2026-11-02';

  // 1. 목 07:40
  scene('2026-10-29T07:40:00', ST);
  { const P = pe.dayPlan(THU), B = pe.weekBoard(THU), I = ids(P);
    ok(I[0] === 'set.read:2026-10-29', '1. 목 07:40: 첫 줄은 오늘 세트 용어 읽기');
    const rv = P.rows.filter(r => r.task.k === 'rev');
    ok(rv.length === 2 && rv.every(r => r.task.need === '필수') && rv.map(r => r.id).join() === 'rev:2026-10-27:1,rev:2026-10-28:1', '1. 필수 세트 복습 2개(1·3일 차, 기한 오래된 것부터: 10/27·10/28 1일 차)');
    ok(P.rows.filter(r => r.task.k === 'late').map(r => r.id).join() === 'late:2026-10-28', '1. 밀린 세트는 가장 오래된 하나(10/28 퀴즈)');
    ok(!I.some(id => /^q\./.test(id)) && P.fold.filter(x => x.k === 'rev').length === 5, '1. 평일엔 손글씨 몫 줄 없음, 나머지 세트 복습 5개는 시간이 되면');
    ok(B.B === 468 && B.C === 900 && B.lv === 0, `1. 이번 주 B ${B.B} / C ${B.C} → 단계 ${B.lv} (기록: 468 / 900 → 0)`);
    const hw = P.rows.filter(r => r.task.hw), R1 = w.PE_HW[1];
    ok(hw.length === 3 && hw.every(r => r.tgt === 'full') && P.rows.find(r => r.id === 'hw.say:2026-10-29').task.prog[1] === 4 * R1.s && P.rows.find(r => r.id === 'hw.write:2026-10-29').task.prog[1] === 4 * R1.w && P.rows.find(r => r.id === 'hw.eo:2026-10-29').task.prog[1] === R1.eo, '1. 단계 0: 숙제 목표는 학원 횟수(말하기 16·쓰기 8·목차 4)');
    const floor = P.rows.reduce((a, r) => a + (r.task.hw ? r.task.minFloor : r.m), 0);
    ok(floor === 82 && floor <= 120, `1. 필수 칸만이면 ${floor}분(≤120, 기록 82)`);
    ok(P.rows.length === 10 && mins(P) === 108, `1. 오늘 몫 ${P.rows.length}줄(세트 복습 2개를 묶으면 9개) · ${mins(P)}분 (기록 108)`);
    ok(B.pct === 17 && B.reach === 97, `1. 지금 ${B.pct}% → 다 하면 ${B.reach}% (기록 17 → 97)`);
    ok(P.fold.some(x => x.id === 'cards:2026-10-29' && x.kc === 30), '1. 카드 복습 30장은 세트 복습 나머지 뒤(시간이 되면)');
    ok(pe.cardsOut(THU).length === 57, '1. 카드 복습 수 = 간격 온 카드 − 오늘 계획한 세트 복습 카드 (57)'); }

  // 2. 수 21:30(화요일 건너뜀, 이날 처음 연 화면)
  scene('2026-10-28T21:30:00', WED);
  { const P = pe.dayPlan(WD);
    ok(P.capLeft === 120 && P.cap === 180, `2. 수 21:30: 계획 한도 ${P.capLeft}분(예산 180이 아니라 23:30까지 남은 시간)`);
    ok(pe.curBlock(WD) === 'eve', '2. 지금 블록은 저녁');
    ok(P.rows.length === 8 && mins(P) === 100 && P.lv === 0, `2. 기본: 8줄 · ${mins(P)}분 (기록 100)`);
    const P60 = pe.dayPlan(WD, { user: 60 }), I = ids(P60);
    ok(mins(P60) === 52 && mins(P60) <= 60 && ['set.quiz:2026-10-28', 'hw.dd:2026-10-28', 'hw.sl:2026-10-28'].every(x => I.includes(x)), `2. 오늘 시간 1시간: ${mins(P60)}분(≤60, 기록 52), 최소 몫(세트 퀴즈·단답 1문·자기 전) 들어 있음`);
    ok(P60.moved.length === 2 && P60.moved.every(x => x.dest === '토요일 따라잡기') && P60.moved.map(x => x.label + ' ' + x.min).join() === '새 용어 4개 안 보고 쓰기 1번 12,논술 목차 옮겨 적기 2번 10', '2. 1시간: 뺀 필수(쓰기 1번 12분·목차 2번 10분) → 토요일 따라잡기');
    ok(P60.rows.find(r => r.id === 'hw.say:2026-10-28').task.meta === '오늘은 2번까지', '2. 줄인 날 말하기는 필수 칸까지("오늘은 2번까지")');
    const P30 = pe.dayPlan(WD, { user: 30 }), I3 = ids(P30);
    ok(mins(P30) === 29 && I3.join() === 'set.quiz:2026-10-28,hw.say:2026-10-28,hw.dd:2026-10-28,hw.sl:2026-10-28', `2. 30분: 들어가는 줄만 ${mins(P30)}분(기록 29), 최소 몫 포함`);
    ok(P30.moved.every(x => x.dest) && P30.moved.find(x => x.id === 'late:2026-10-27').dest === '토요일 따라잡기' && P30.moved.find(x => x.id === 'rev:2026-10-26:1').dest === '내일 다시 나와요', '2. 30분: 뺀 필수마다 갈 곳(밀린 세트 → 토요일 따라잡기, 세트 복습 → 내일 다시 나와요)'); }

  // 3. 고정: 줄을 끝내도 id 그대로, 다 해도 새 필수 줄이 생기지 않음, 다시 그려도 "다른 날로 옮긴 것" 그대로
  scene('2026-10-28T21:30:00', WED);
  { const V0 = pe.planToday(WD), F = pe.S().today;
    ok(F && F.d === WD && F.v === 1 && F.lv === 0 && F.user === null && F.rows.length === 8 && F.rows.every(r => r.id && r.m >= 0 && !('label' in r)), '3. planToday가 S.today를 고정(id·분만, 글은 없음)');
    pe.planToday(WD, { replan: 'cap', user: 60 });
    const id0 = pe.S().today.rows.map(r => r.id).join(), V1 = pe.planToday(WD);
    ok(V1.moved.map(x => x.id).join() === 'hw.write:2026-10-28,hw.eo:2026-10-28', '3. 오늘 시간 1시간 뒤 옮긴 것 2개');
    applyRows([pe.S().today.rows.map(r => Object.assign({}, r))[0]], WD);
    const V2 = pe.planToday(WD);
    ok(pe.S().today.rows.map(r => r.id).join() === id0 && V2.rows[0].done && V2.doneMin === 8, '3. 1줄을 끝내도 같은 줄, 끝낸 줄은 그 자리(한 분 8)');
    ok(V2.moved.map(x => x.id).join() === V1.moved.map(x => x.id).join(), '3. 다시 그려도 다른 날로 옮긴 것 그대로');
    applyRows(V2.rows, WD); at('2026-10-28T22:40:00');
    const V3 = pe.planToday(WD);
    ok(V3.rows.every(r => r.done) && pe.S().today.rows.map(r => r.id).join() === id0 && V3.rows.length === 6, '3. 다 끝내도 새 필수 줄이 생기지 않음(다시 늘지 않음)');
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
    pe.planToday(THU); ok(pe.S().today && pe.S().today.rows.length === 10 && pe.S().today.at === '08:20', '4. 9시 전에 세트가 오면 그때 처음 고정(10줄)'); }

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
    ok(P.moved.map(x => `${x.label}·${x.min}·${x.dest}`).join(' | ') === '단답 손글씨 2문·30·내일(일) 손글씨 몫 | 논술 목차 옮겨 적기 6번·30·내일(일) 손글씨 몫 | 새 용어 안 보고 쓰기 16개·48·내일(일) 손글씨 몫 | 카드 복습 48장·24·내일 다시 나와요', '5. 다른 날로 옮긴 것 4개 · 132분(기록대로)');
    ok(P.fold.length === 5 && P.fold.every(x => x.k === 'rev' && x.step === 7), '5. 시간이 되면: 세트 복습 7일 차 5개(단계 1이라 권장은 접음)');
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
    ok(B2.pct === 93 && JSON.stringify(B2.parts) === '[["core",25,25],["mock",25,25],["hand",30,30],["rev",9.6,15],["close",3,5]]', `6. 밤 점수 ${B2.pct}% = 기록(93%: 핵심 25 · 모의 25 · 손글씨 30 · 복습 9.6 · 마감 3)`); }

  // 7. 일 09:00, 토요일을 건너뛴 채
  scene('2026-11-01T09:00:00', ST);
  { const P = pe.dayPlan(SUN), B = pe.weekBoard(SUN), I = ids(P);
    ok(P.lv === 3 && B.B === 455 && B.C === 240, `7. 토요일 건너뜀: 단계 3 핵심만(B ${B.B} / C ${B.C}, 기록 455 / 240)`);
    ok(['q.dd:2026-10-26', 'q.eo:2026-10-26', 'q.w:2026-10-26'].every(x => P.freed.some(f => f.id === x)) && P.freed.filter(f => f.k === 'rev' && f.step === 7).length === 5 && P.freed.length === 8, '7. 놓아준 것 8개: 손글씨 몫 3개·세트 복습 7일 차 5개');
    ok(['mock:2026-10-31:p1', 'mock:2026-10-31:p2', 'mock.g:2026-10-31', 'late:2026-10-28', 'late:2026-10-29', 'late:2026-10-30', 'report:2026-10-26'].every(x => I.includes(x)) && mins(P) === 236, `7. 모의·채점·밀린 핵심·리포트는 남음, ${mins(P)}분(기록 236)`);
    ok(P.rows.some(r => r.task.paper), '7. 손글씨 1단위 이상(모의 답안)');
    ok(P.moved.map(x => x.id + '→' + x.dest).join() === 'rev:2026-10-30:1→내일 다시 나와요,rev:2026-10-28:3→내일 다시 나와요', '7. 못 넣은 세트 복습 2개 → 내일 다시 나와요');
    ok(B.pct === 19 && B.reach === 63, `7. 지금 ${B.pct}% → 다 하면 ${B.reach}% (기록 19 → 63)`);
    // 모의를 다 썼는데도 넘쳐 손글씨 몫을 놓아주는 날: 단답 1문(바닥)은 남는다
    const st = clone(ST); st.mockp['2026-10-31'] = { p1: true, p2: true, g: '2026-10-31' }; st.settings.budget = { sun: 120 };
    scene('2026-11-01T09:00:00', st); const Q = pe.dayPlan(SUN), q = Q.rows.find(r => r.id === 'q.dd:2026-10-26');
    ok(Q.lv === 3 && q && q.task.relFloor && JSON.stringify(q.q) === '[["2026-10-26",1]]' && !Q.freed.some(f => f.id === 'q.dd:2026-10-26') && Q.freed.some(f => f.id === 'q.eo:2026-10-26'), '7. 단계 3이라도 손글씨 바닥 1단위(가장 오래된 단답 1문)는 남김'); }

  // 8. 월 07:00(같은 기록, 세트 도착 전)
  scene('2026-11-02T07:00:00', ST);
  { const V = pe.planToday(MON), wk = clone(pe.S().wk['2026-10-26']);
    ok(wk && wk.at === MON && wk.p === 19 && wk.lv === 3 && wk.parts.core === 13.8 && wk.carry.join() === 'carry.sets:2026-11-02,carry.mock:2026-10-31' && wk.rel.length === 3, `8. 월요일 첫 계산에서 지난주를 한 번 고정(S.wk[10/26]: ${wk && wk.p}%, 넘어온 것 2, 놓아준 것 3)`);
    pe.S().mockp['2026-10-31'] = { p1: true }; pe.S().sp['2026-10-29'] = { read: { 0: 1 }, quiz: {}, tasks: {}, essay: {}, rev: {}, first: MON };
    pe.planToday(MON); ok(JSON.stringify(pe.S().wk['2026-10-26']) === JSON.stringify(wk), '8. 두 번째 계산·지난 기록을 고쳐도 S.wk[지난주] 그대로');
    scene('2026-11-02T07:00:00', ST); const V2 = pe.planToday(MON), B = pe.weekBoard(MON);
    ok(['dd', 'eo', 'w'].every(k => line(B, k).a === 0) && line(B, 'dd').b === 5 && line(B, 'eo').b === 10 && line(B, 'w').b === 20 && B.pct === 0, '8. 새 주: 손글씨 몫은 0부터(빚 없음), 지금 0%');
    ok(V2.fold.some(x => x.id === 'carry.mock:2026-10-31' && x.min === 150) && !V2.rows.some(r => /carry/.test(r.id)), '8. 지난주 모의고사는 시간이 되면 줄로만(150분)');
    ok(V2.fold.some(x => x.id === 'carry.sets:2026-11-02' && x.ds.join() === '2026-10-30,2026-10-29,2026-10-28'), '8. 지난주 세트 읽기·퀴즈 3개(10/30·10/29·10/28)는 권장');
    ok(V2.rows.map(r => r.id).join() === 'rev:2026-10-27:3,rev:2026-10-28:3' && mins(V2) === 16 && V2.info.some(x => x.id === 'wait.set'), '8. 오늘 몫 16분 = 세트 복습 2개(10/27·10/28 3일 차), 세트를 기다리는 중');
    ok(V2.active && V2.active.id === 'rev:2026-10-27:3', '8. 펼칠 줄은 세트 복습(모의가 아님)');
    at('2026-11-02T09:30:00'); pe.planToday(MON); V2.rows.forEach(r => { const p = pe.S().sp[r.id.split(':')[1]]; p.rev[1] = p.rev[3] = MON; });
    const V3 = pe.planToday(MON);
    ok(V3.active && V3.active.fold && V3.active.task.k === 'rev' && !/carry\.mock/.test(V3.active.id), '8. 필수를 다 하면 시간이 되면의 세트 복습이 펼쳐짐(지난주 모의고사는 어느 날에도 아님)');
    ok(B.B === 562 && B.C === 1440 && B.lv === 0 && B.reach === 98, `8. 새 주 B ${B.B} / C ${B.C} → 단계 0, 다 하면 ${B.reach}% (기록 98%; B는 아직 안 온 세트의 1·3일 차를 미리 세어 522+40)`); }

  // 9. 읽기만: 오늘·계산 함수가 S.sp 키나 first를 만들지 않음
  scene('2026-10-29T07:40:00', ST);
  { const sp0 = JSON.stringify(pe.S().sp), keep = () => { const S = clone(pe.S()); delete S.today; delete S.wk; delete S.cal; return JSON.stringify(S); }, s0 = keep();
    await go('#review'); await go('#today'); pe.render(); await go('#week');
    pe.taskList(THU); pe.weekBoard(THU); pe.dayPlan(THU); pe.dayPlan(THU, { user: 30 }); pe.cardsOut(THU); pe.reqParts(THU); pe.hwParts(THU); pe.weekBoard(SAT); pe.taskList(SAT);
    ok(keep() === s0, '9. taskList·dayPlan·weekBoard·cardsOut·reqParts는 기록을 바꾸지 않음');
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
    ok(R.map(x => x.am + '→' + x.pm).join(' ') === '1→12 12→24 24→36 36→49 49→61 61→90 90→94', '12. 기록과 같은 흐름 1→12→24→36→49→61→90→94');
    ok(R.map(x => x.plan).join() === '87,95,95,103,103,260,18' && R.map(x => x.reach).join() === '98,98,98,97,96,95,94' && R.every(x => x.done && x.lv === 0), '12. 날마다 계획 87~103분, 토요일 260, 다 하면 98→94%(1·3일 차가 늦은 만큼만)');
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
      ok(seq.every((v, i) => !i || v >= seq[i - 1]) && seq[seq.length - 1] >= 80, `19. ${ph}단계 빈 주를 계획대로: 지금 n%가 줄지 않음 ${seq.join('→')}`); }
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

  // 25. 시작일이 월요일이 아니어도(2026-10-21 수) 한 달력 주 안에서 단계·약속 줄이 바뀌지 않음(계획 주차 = 그 주 월요일의 주차). 시작 전 날은 비어 있음
  { const st = clone(BLANK); st.settings.start = '2026-10-21'; scene('2027-01-04T07:00:00', st);
    const sig = t => { at(t + 'T07:00:00'); const B = pe.weekBoard(t); return B.ph + '|' + B.lines.map(l => l.k).join(',') + '|' + line(B, 'mock').b; }, S7 = [0, 1, 2, 3, 4, 5, 6].map(i => sig(add('2027-01-04', i)));
    ok(pe.weekIndex('2027-01-04') !== pe.weekIndex('2027-01-06') && S7.every(x => x === S7[0]) && S7[0].indexOf('1|') === 0, `25. 시작 10/21(수): 1/4~1/10 한 주 내내 같은 단계·같은 약속 줄(${S7[0]})`);
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
    ok(!bad.length && n > 600, `26. ${n}번(날 × 시각) 모두 id 겹침 없음 ${bad.slice(0, 3).join(' | ')}`); }

  // 화면(시계 고정): 오늘·이번 주를 다시 그린다(같은 주소면 hashchange가 없으므로 render)
  const show = async h => { await go(h); pe.render(); await sleep(10); }, V$ = () => d.querySelector('#view'), prim = () => [...V$().querySelectorAll('.btn:not(.sec):not(.ghost)')];
  const ROLL = /일요일까지|오늘만|다시 나와요|다음 모의 전까지|오늘 밤까지|D-\d|오늘까지/;
  // 27. 목 07:40 오늘 화면: 블록마다 번호 줄 9개, 파란 버튼은 펼친 첫 줄(용어 10개 읽기) 하나, 필수 줄마다 "못 하면", 체크리스트 없음, 이번 주 띠·남은 필수
  scene('2026-10-29T07:40:00', ST);
  { await show('#today'); const rows = [...V$().querySelectorAll('.blk + .plan > .prow, .blk + .plan .pmore > .prow')], nums = rows.map(r => (r.querySelector('.pn') || {}).textContent).join(',');
    ok(rows.length === 9 && nums === '1,2,3,4,5,6,7,8,9' && /오늘 몫 9개 · 약 1시간 48분/.test(V$().querySelector('.daysum').textContent), `27. 목 07:40: 오늘 몫 9줄(번호 ${nums}), "오늘 몫 9개 · 약 1시간 48분"`);
    const p = prim(); ok(p.length === 1 && p[0].closest('.prow.now') && p[0].closest('.prow.now').dataset.task === 'set.read:2026-10-29' && p[0].textContent === '시작', '27. 파란 버튼은 하나: 펼친 첫 줄 "용어 10개 읽기"의 시작');
    const req = rows.filter(r => !r.querySelector('.tag')), miss = req.filter(r => !ROLL.test((r.querySelector('.pm') || {}).textContent || ''));
    ok(req.length === 9 && !miss.length, `27. 필수 줄마다 못 하면(일요일까지·오늘만·다시 나와요 …) ${miss.map(r => r.dataset.task).join(' ')}`);
    ok(/세트 복습 2개/.test(rows[1].textContent) && /10\/27·10\/28 1일 차 · 16분 · 다시 나와요/.test(rows[1].textContent) && /0\/2/.test(rows[1].querySelector('.pv').textContent), '27. 세트 복습 2개는 한 줄(날짜·단계, 16분, 0/2)');
    const ddSub = pe.taskList(THU).find(x => x.id === 'hw.dd:2026-10-29').sub;
    ok(/말하기 4번/.test(rows[3].textContent) && /필수 2번 · 8분 · 오늘만/.test(rows[3].textContent) && /0\/16/.test(rows[3].textContent) && ddSub && rows[6].textContent.indexOf(ddSub) > 0 && /15분/.test(rows[6].querySelector('.pv').textContent), '27. 숙제 줄은 학원 횟수 그대로(말하기 4번 0/16, 필수 2번), 단답은 그 카드 이름 · 15분');
    ok(!V$().querySelector('[data-act="chk"]') && !V$().querySelector('.check') && V$().querySelector('.blk.cur') && /아침·출근길/.test(V$().querySelector('.blk.cur').textContent) && /지금/.test(V$().querySelector('.blk.cur').textContent), '27. 체크리스트 없음, 지금 블록은 아침·출근길');
    const wk = V$().querySelector('.wksec');
    ok(wk && wk.querySelectorAll('.wkd').length === 7 && /남은 필수 약 7시간 48분 \/ 남은 시간 15시간/.test(wk.textContent) && /다 하면 97% · 지금 17%/.test(wk.textContent) && wk.querySelectorAll('.qline').length <= 5 && /세트 핵심 2\/5 · 다음 하나: 10\/28\(수\) 퀴즈/.test(wk.textContent), '27. 이번 주: 띠 7칸, 남은 필수 약 7시간 48분 / 남은 시간 15시간, 다 하면 97% · 지금 17%, 줄 5개 이하');
    ok([...wk.querySelectorAll('.wkd .wg')].map(g => g.classList.contains('today') ? 'T' : g.classList[1]).join() === 'done,done,half,T,fut,fut,fut', '27. 띠: 월·화 끝, 수 반쯤, 목 오늘, 금~일 앞날(지난날도 빨강 없음)');
    const fold = [...V$().querySelectorAll('details.pf')].find(x => /시간이 되면/.test(x.textContent));
    ok(fold && !fold.open && /시간이 되면 · \d+개/.test(fold.querySelector('summary').textContent) && fold.querySelector('[data-task^="cards:"]'), '27. 시간이 되면은 접혀 있고 카드 복습은 거기(세트 복습 나머지 뒤)');
    click('[data-act="later"]'); await sleep(10);
    ok(prim().length === 1 && prim()[0].closest('.prow.now').dataset.task === 'rev:2026-10-27:1' && /시작 · 10\/27 세트부터/.test(prim()[0].textContent), '27. 나중에 → 다음 줄(세트 복습 2개, "시작 · 10/27 세트부터")이 펼쳐짐');
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
  // 28. 토 08:00 오늘 화면: 1~3줄 모의고사(1교시 시작이 파란 버튼), 쉬는 시간 줄, 따라잡기 4줄, 다른 날로 옮긴 것 4개, 시간이 되면 1개
  scene('2026-10-31T08:00:00', ST);
  { await show('#today'); const t = V$().textContent, p = prim();
    ok(/오늘 몫 7개 · 약 4시간 57분/.test(V$().querySelector('.daysum').textContent) && p.length === 1 && p[0].textContent === '1교시 시작' && p[0].closest('.prow.now').dataset.task === 'mock:2026-10-31:p1', '28. 토 08:00: 오늘 몫 7개 · 약 4시간 57분, 파란 버튼은 "1교시 시작" 하나');
    ok(/쉬는 시간 · 답안 사진 찍기/.test(t) && /2교시논술50분/.test(t.replace(/\s+/g, '')) && /쏘일네일링 · 심층혼합처리공법\(DCM\)/.test(t) && /밀린 세트 3개/.test(t) && /10\/26·10\/27·10\/28 3일 차 · 10\/30 1일 차/.test(t), '28. 쉬는 시간 줄, 2교시 논술 50분(문제 이름), 밀린 세트 3개, 세트 복습 4개(단계마다 묶음)');
    ok(/다른 날로 옮긴 것 · 4개 · 약 2시간 12분/.test(t) && /내일\(일\) 손글씨 몫 3개 · 내일 다시 나와요 1개/.test(t) && /시간이 되면 · 1개/.test(t), '28. 다른 날로 옮긴 것 4개(갈 곳별 수), 시간이 되면 1개');
    ok(/빠듯해요 · 권장은 접어 두었어요/.test(V$().querySelector('.wksec').textContent) && /주간 리포트\(일\) 0\/1/.test(V$().querySelector('.wksec').textContent), '28. 이번 주: 단계 1 문장, 토·일요일엔 주간 리포트 줄');
    await show('#week'); const sc = V$().querySelector('.score');
    ok(sc && /다 하면 94%/.test(sc.textContent) && /지금 18%/.test(sc.textContent) && /세트 핵심 14\/25 · 모의고사 0\/25 · 손글씨 4\/30 · 복습 1\/15 · 마감 0\/5/.test(sc.textContent) && prim().length === 1 && /^다음: 주간 모의고사 1교시 · 100분$/.test(prim()[0].textContent), '28. 이번 주 화면: 다 하면 94% · 지금 18%, 부분 점수, 파란 버튼 "다음: 주간 모의고사 1교시 · 100분"');
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
    ok(prim().length === 1 && cmRow && cmRow.closest('details') && !cmRow.classList.contains('now') && /주간 모의고사를 기다리는 중/.test(V$().textContent), '30. 화면: 파란 버튼 하나, 지난주 모의고사 줄은 시간이 되면 안');
    applyRows(pe.S().today.rows, SAT); const V2 = pe.planToday(SAT); await show('#today');
    ok(V2.rows.every(r => r.done) && (!V2.active || V2.active.id !== cm.id) && prim().length === 1 && /오늘 몫 끝/.test(V$().textContent), '30. 오늘 몫을 다 해도 지난주 모의고사는 펼치지 않음, "오늘 몫 끝", 파란 버튼 하나'); }
  // 31. 할 몫이 없는 날(받은 세트 없음): 카드 하나에 파란 버튼 하나("지금 받아 오기"). 9시 전 세트를 기다리는 평일은 그 안내가 카드 제목
  { scene('2026-11-03T10:00:00', BLANK, { sets: {}, mocks: {} }); await show('#today');
    ok(V$().querySelector('.norows') && /아직 받은 세트가 없어요/.test(V$().querySelector('.norows').textContent) && prim().length === 1 && prim()[0].dataset.act === 'sync' && !V$().querySelectorAll('.blk').length, '31. 받은 세트가 없으면 할 몫 없음 카드("아직 받은 세트가 없어요" + 지금 받아 오기) 하나');
    const X = { sets: {}, mocks: {} }; X.sets['2026-10-19'] = clone(FIX.sets['2026-10-19']); scene('2026-11-03T07:00:00', BLANK, X); await show('#today');
    ok(V$().querySelector('.norows') && /오늘 세트를 기다리는 중/.test(V$().querySelector('.norows').textContent) && prim().length === 1 && prim()[0].dataset.act === 'sync', '31. 평일 07:00 세트 전·할 일 없음: "오늘 세트를 기다리는 중" 카드에 지금 받아 오기'); await go('#today'); }

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

  ok(errors.length === 0, '콘솔 오류 없음 ' + errors.slice(0, 3).join(' | '));
  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
