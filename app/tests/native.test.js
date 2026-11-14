// 앱 쪽 다리 검사(jsdom): 앱에 들어가는 web 묶음(scripts/build-web.js)을 PE_NATIVE와 함께 띄우고, 실제 native/host.js를 가짜 기기 기능에 이어 돈다.
// 저장이 네이티브 저장소로 가는지, 다시 열면 이어지는지, 복사·파일·확인 창·화면 켜 두기·받아 오기·알림 설정이 앱 쪽으로 가는지 본다.
// 실행: npm i -D jsdom && node tests/native.test.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { build } = require('../scripts/build-web');
const host = require('../native/host');
const FAKE = path.join(__dirname, 'fake');

build();
const bundle = require('../native/webBundle.js');
const html = bundle.files['index.html'].replace(/<script src="([^"]+)"><\/script>/g, (m, src) => `<script>${bundle.files[src]}</script>`);

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok:', m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 가짜 기기
const disk = {};               // Documents/store
const dev = { clip: null, saved: null, asked: [], answers: [], awake: [], looks: [], notif: [], denyNotif: false, fetched: [], member: [], pick: null, picks: 0, sendFail: null,
  upd: [], updDisk: null, updFail: null, updCheck: null, updApply: null };   // 앱 업데이트(3.2.0): 부탁받은 일, 그때 네이티브 저장소의 기록, 실패·결과
// 가짜 회원 서버(Firebase 자리): 관리자 화면이 부르는 요청을 기록한다
const MEMBERS = [{ uid: 'U2', id: 'kim', status: 'pending', createdAt: '2026-10-20T01:00:00Z', code: '' }, { uid: 'U1', id: 'boss', status: 'approved', createdAt: '2026-10-19T01:00:00Z', code: '' }, { uid: 'U3', id: 'lee', status: 'rejected', createdAt: '2026-10-18T01:00:00Z', code: '' }];
const CODES = [{ code: 'QWER23', createdAt: '2026-10-20T02:00:00Z' }];
// 관리자에게 온 문자(kim 2개 안 읽음, lee 1개 읽음)
const ago = m => new Date(Date.now() - m * 60000).toISOString();
const MSGS = () => [
  { mid: 'M1', uid: 'U2', id: 'kim', text: '김철수입니다.\n<b>승인</b> 부탁드려요', from: 'join', dev: 'iOS 18.1 · 앱 3.0.1', at: ago(90), read: false },
  { mid: 'M2', uid: 'U2', id: 'kim', text: '한 번 더 부탁드려요', from: 'wait', dev: 'iOS 18.1 · 앱 3.0.1', at: ago(5), read: false },
  { mid: 'M3', uid: 'U3', id: 'lee', text: '이영희예요', from: 'join', dev: '', at: ago(60 * 30), read: true },
];
let msgs = MSGS();
let replies = [];   // 관리자 답장(3.1.3)
let thread = { msgs: [], replies: [] };   // 회원 휴대폰이 받아 오는 주고받은 말
const memOps = () => dev.member.filter(x => x[0] !== 'thread');   // 회원 탭 첫 화면은 5분에 한 번 답장을 받아 온다

function open(opt = {}) {
  const errors = [], webFetch = [], lsUse = [];
  let w;
  const deps = {
    inject: code => w.eval(code),
    writeStore: (k, v) => { disk[k] = v; },
    copy: async text => { dev.clip = text; },
    saveFile: async (name, text, type) => { dev.saved = { name, text, type }; },
    confirm: async msg => { dev.asked.push(msg); return dev.answers.length ? dev.answers.shift() : true; },
    keepAwake: on => { dev.awake.push(on); },
    fetchText: async url => {
      dev.fetched.push(url);
      const m = String(url).match(/gisulsa-data\/main\/((?:data|app\/gloss)\/[^?]+)/);
      const f = m && path.join(FAKE, m[1]);
      if (f && fs.existsSync(f)) return { ok: true, status: 200, text: fs.readFileSync(f, 'utf8') };
      return { ok: false, status: 404, text: '' };
    },
    setNotif: async cfg => { dev.notif.push(cfg); if (dev.denyNotif) throw new Error('denied'); return cfg; },
    look: d => { dev.looks.push(d); },
    pickFile: async () => { dev.picks++; return dev.pick; },
    update: async op => {
      dev.upd.push(op); dev.updDisk = disk.pe_state_v1;
      if (dev.updFail) throw new Error(dev.updFail);
      return op === 'check' ? (dev.updCheck || { found: false, v: '' }) : op === 'apply' ? (dev.updApply || { s: 'reload' }) : true;
    },
    member: async (op, a) => {
      dev.member.push([op, a]);
      if (op === 'list') return { members: MEMBERS, codes: CODES, me: 'U1', msgs: msgs === null ? null : msgs.map(m => ({ ...m })), replies: replies.map(r => ({ ...r })) };
      if (op === 'reply') { if (dev.sendFail) throw new Error(dev.sendFail); if (!a.text) return null; const r = { rid: 'R' + (replies.length + 1), uid: a.uid, id: (MEMBERS.find(x => x.uid === a.uid) || {}).id, text: a.text, dec: a.dec || '', at: new Date().toISOString(), read: false }; replies.push(r); return r.rid; }
      if (op === 'thread') return JSON.parse(JSON.stringify(thread));
      if (op === 'reply-read') { thread.replies.forEach(r => { if (a.rids.includes(r.rid)) r.read = true; }); return a.rids.length; }
      if (op === 'unread') return (msgs || []).filter(m => !m.read).length;
      if (op === 'msg-read') { (msgs || []).forEach(m => { if (a.mids.includes(m.mid)) m.read = true; }); return a.mids.length; }
      if (op === 'msg-del') { msgs = (msgs || []).filter(m => !a.mids.includes(m.mid)); replies = replies.filter(r => !(a.rids || []).includes(r.rid)); return a.mids.length; }
      if (op === 'msg-send') { if (dev.sendFail) throw new Error(dev.sendFail); return 'NEWID'; }
      if (op === 'code-add') return 'ABCD23';
      return true;
    },
  };
  const handle = host.createHost(deps);
  const store = {}; for (const k of host.STORE_KEYS) store[k] = disk[k] == null ? null : disk[k];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'file:///var/mobile/Containers/Data/Application/X/Library/Caches/web/' + bundle.hash + '/index.html#today',
    beforeParse(win) {
      w = win;
      win.eval(host.bootScript({ store, notif: host.cleanNotif(disk.notif ? JSON.parse(disk.notif) : null), version: '2.2.0', member: opt.member }));
      win.ReactNativeWebView = { postMessage: data => setTimeout(() => handle(data), 0) };
      win.fetch = async url => { webFetch.push(url); throw new Error('웹 fetch를 쓰면 안 됨'); };
      Object.defineProperty(win, 'localStorage', { configurable: true, get() { lsUse.push(new Error().stack); throw new Error('localStorage를 쓰면 안 됨'); } });
      win.matchMedia = () => ({ matches: false, addEventListener() {} });
      win.console.error = (...a) => { errors.push(a.join(' ')); };
    }
  });
  w.confirm = () => { throw new Error('window.confirm을 쓰면 안 됨'); };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const d = w.document;
  const click = sel => { const el = d.querySelector(sel); if (!el) { fails++; console.log('FAIL: no element', sel); return null; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return el; };
  const go = async h => { w.location.hash = h; await sleep(30); };
  const txt = () => d.querySelector('#view').textContent;
  const toast = () => d.querySelector('#toast').textContent;
  return { w, d, click, go, txt, toast, errors, webFetch, lsUse, pe: w.__pe };
}

(async () => {
  // 순수 함수
  ok(host.jsLiteral('a\u2028b') === '"a\\u2028b"', 'jsLiteral: 줄 구분 문자 이스케이프');
  const plan = host.notifPlan({ wd: { on: true, time: '07:30' }, su: { on: true, time: '21:05' } });
  ok(plan.length === 6 && plan.filter(n => n.weekday >= 2 && n.weekday <= 6 && n.hour === 7 && n.minute === 30 && n.hash === 'today').length === 5, '알림 예약: 평일 5개(월~금 07:30)');
  ok(plan.some(n => n.weekday === 1 && n.hour === 21 && n.minute === 5 && n.title === '복습 비우기' && n.hash === 'review'), '알림 예약: 일요일 21:05 복습 비우기');
  ok(plan.some(n => n.weekday === 1 && n.body === '이번 주 오답 노트와 세트 복습을 정리해요.') && !plan.some(n => /다시 보기|복습 대기|목차 회상|체크리스트/.test(n.title + n.body)), '4-8. 일요일 알림 본문 "이번 주 오답 노트와 세트 복습을 정리해요."(물러난 낱말 "세트 다시 보기" 없음)');
  ok(host.notifPlan({ wd: { on: false }, su: { on: false } }).length === 0, '알림 끄면 예약 없음');
  ok(host.cleanNotif({ wd: { on: true, time: '25:00' } }).wd.time === '07:00', '잘못된 시각은 기본값');
  ok(host.safeFileName('../a b.json') === '..ab.json' && host.safeFileName('x.txt') === 'gisulsa-backup.json', '백업 파일 이름 정리');

  // 1) 첫 실행: 저장된 기록 없음 → 네이티브 fetch로 받아 오기
  let A = open();
  await sleep(300);
  ok(A.w.PE_NATIVE && A.w.PE_IO.native, 'PE_NATIVE 주입 → PE_IO.native');
  ok(dev.fetched.some(u => /index\.json/.test(u)) && A.webFetch.length === 0, '받아 오기는 네이티브 fetch로(웹 fetch 0회)');
  ok(A.pe.SETS().sets['2026-10-19'] && A.pe.SETS().mocks['2026-10-24'] && A.pe.SETS().kichul.rev === 3, '세트·모의·새 기출 받음');
  ok(disk.pe_sets_v1 && JSON.parse(disk.pe_sets_v1).sets['2026-10-19'], '받은 세트가 네이티브 저장소에 저장');
  ok(A.lsUse.length === 0, 'WebView localStorage는 쓰지 않음');
  ok(dev.looks.length >= 1 && dev.looks[0] === false, '밝기(밝게)를 앱에 알림');

  // 학습: 세트 카드 펼치기, 퀴즈 틀리기
  await A.go('#set/2026-10-19');
  A.click('[data-act="set-open"][data-i="0"]'); await sleep(20);
  A.click('[data-act="set-tab"][data-t="quiz"]'); await sleep(20);
  A.click('[data-act="set-quiz"][data-i="0"][data-k="0"]'); await sleep(150);
  const st1 = JSON.parse(disk.pe_state_v1);
  ok(st1.cards['D20261019-1'] && st1.cards['D20261019-1'].seen === 1, '진도가 네이티브 저장소에');
  ok(Object.keys(st1.wrong).some(k => k.startsWith('Q:2026-10-19:0')), '오답이 네이티브 저장소에');

  // 복사(expo-clipboard)
  await A.go('#backup');
  A.click('[data-act="backup-copy"]'); await sleep(30);
  ok(dev.clip && JSON.parse(dev.clip).state && JSON.parse(dev.clip).sets, '백업 복사 → 네이티브 클립보드');
  ok(/백업을 복사했어요/.test(A.toast()), '복사 알림 문구 그대로');
  // 첨삭·채점 요청: 형식 점검표와 모범 답안 뼈대가 들어감
  await A.go('#set/2026-10-19'); A.click('[data-act="set-tab"][data-t="essay"]'); await sleep(20);
  A.click('[data-act="copy-essay"]'); await sleep(30);
  ok(/제방 누수/.test(dev.clip) && /\[답안 형식 점검표/.test(dev.clip) && /이하 여백/.test(dev.clip) && /형식 첨삭/.test(dev.clip) && !/\{답안형식\}/.test(dev.clip), '논술 첨삭 요청에 문제 + 형식 점검표');
  { const c = A.pe.deck().find(x => x.x && x.x.length); await A.go('#dandap/' + encodeURIComponent(c.id)); A.click('[data-act="copy-dd"]'); await sleep(30);
    ok(dev.clip && dev.clip.includes('[용어] ' + c.t) && /단답형 손글씨 답안/.test(dev.clip) && !/여기에 용어를 적는다/.test(dev.clip), '단답 답안지 첨삭 요청에 그 용어'); }
  await A.go('#mock/2026-10-24'); A.click('[data-act="copy-mock"]'); await sleep(30);
  ok(/■ 1교시/.test(dev.clip) && /\[모범 답안 뼈대/.test(dev.clip) && /형식 지적 1개/.test(dev.clip) && !/\{답안형식\}/.test(dev.clip), '모의고사 채점 요청에 문제 목록 + 형식 점검표');
  await A.go('#backup');
  A.click('[data-act="backup-copy"]'); await sleep(30);
  // 파일로 저장(expo-file-system + 공유 시트)
  A.click('[data-act="backup-dl"]'); await sleep(30);
  ok(dev.saved && /^gisulsa-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dev.saved.name) && JSON.parse(dev.saved.text).state.cards['D20261019-1'], '백업 파일 → 네이티브 저장·공유');

  // 웹앱에서 복사한 백업을 복원(확인 창은 네이티브 Alert)
  const webBackup = JSON.parse(dev.clip);
  webBackup.state.cards['K04'] = { seen: 3, due: '2026-10-25', lv: 2, ok: 2, ng: 1 };
  webBackup.state.settings.theme = 'dark';
  dev.answers.push(false);
  A.d.querySelector('#restoreText').value = JSON.stringify(webBackup);
  A.click('[data-act="restore"]'); await sleep(30);
  ok(dev.asked.pop() === '지금 기록을 덮어씁니다. 계속할까요?' && !A.pe.S().cards['K04'], '복원 확인에서 취소 → 그대로');
  await A.go('#backup');
  A.d.querySelector('#restoreText').value = JSON.stringify(webBackup);
  A.click('[data-act="restore"]'); await sleep(40);
  ok(A.pe.S().cards['K04'] && A.pe.S().cards['K04'].seen === 3 && /복원했어요/.test(A.toast()), '복원 확인 → 진도 이어짐');
  ok(JSON.parse(disk.pe_state_v1).cards['K04'], '복원한 기록이 바로 네이티브 저장소에');
  ok(dev.looks[dev.looks.length - 1] === true, '복원한 테마(어둡게)를 앱에 알림');
  await A.go('#backup');
  A.d.querySelector('#restoreText').value = '{"x":1}';
  const askedBefore = dev.asked.length;
  A.click('[data-act="restore"]'); await sleep(20);
  ok(dev.asked.length === askedBefore && /백업 형식이 아니에요/.test(A.toast()), '형식이 틀리면 확인 창 없이 알림');

  // 타이머: 화면 켜 두기(expo-keep-awake)
  await A.go('#timer');
  A.click('[data-act="timer-toggle"]'); await sleep(20);
  A.click('[data-act="timer-toggle"]'); await sleep(20);
  ok(dev.awake.join() === 'true,false', '타이머 시작·정지 → 화면 켜 두기 켜고 끔');
  A.click('[data-act="timer-toggle"]'); await sleep(20);
  A.click('[data-act="timer-reset"]'); await sleep(20);
  ok(dev.awake.join() === 'true,false,true,false', '처음으로 → 화면 켜 두기 끔');
  // 가리며 외우기도 도는 동안 화면을 켜 두고, 멈추거나 다른 화면으로 가면 끈다
  await A.go('#set/2026-10-19'); A.click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
  A.click('[data-act="memo-set"]'); await sleep(30);
  A.click('[data-act="memo-play"]'); await sleep(20);
  ok(dev.awake[dev.awake.length - 1] === true, '가리며 외우기 시작 → 화면 켜 두기');
  A.click('[data-act="memo-play"]'); await sleep(20);
  ok(dev.awake[dev.awake.length - 1] === false, '일시정지 → 화면 켜 두기 끔');
  A.click('[data-act="memo-play"]'); await sleep(20); await A.go('#today');
  ok(dev.awake[dev.awake.length - 1] === false && !A.pe.MEMO().run, '다른 화면으로 가면 멈추고 끔');

  // 알림 설정(앱 전용)
  await A.go('#settings');
  ok(A.d.querySelector('#peNotif') && /평일 아침 "오늘 세트 확인"/.test(A.txt()) && /일요일 "복습 비우기"/.test(A.txt()), '설정에 알림 항목');
  const wd = A.d.querySelector('[data-nf="wd"]'); wd.checked = true; wd.dispatchEvent(new A.w.Event('change', { bubbles: true })); await sleep(30);
  ok(dev.notif.length === 1 && dev.notif[0].wd.on && !dev.notif[0].su.on && /알림을 맞췄어요/.test(A.toast()), '평일 알림 켬');
  const tm = A.d.querySelector('[data-nt="wd"]'); tm.value = '06:45'; tm.dispatchEvent(new A.w.Event('change', { bubbles: true })); await sleep(30);
  ok(dev.notif[1].wd.time === '06:45' && A.w.PE_NATIVE.notif.wd.time === '06:45' && /06:45/.test(A.txt()), '평일 알림 시각 06:45');
  dev.denyNotif = true;
  const su = A.d.querySelector('[data-nf="su"]'); su.checked = true; su.dispatchEvent(new A.w.Event('change', { bubbles: true })); await sleep(30);
  ok(!A.d.querySelector('[data-nf="su"]').checked && !A.w.PE_NATIVE.notif.su.on && /설정 앱/.test(A.toast()), '권한 거절 → 체크 되돌림 + 안내');
  dev.denyNotif = false;
  disk.notif = JSON.stringify(A.w.PE_NATIVE.notif);

  // 백그라운드: 미뤄 둔 저장을 바로 쓴다
  A.pe.S().settings.newPerDay = 17;
  A.w.PE_IO._hide(); await sleep(20);
  ok(JSON.parse(disk.pe_state_v1).settings.newPerDay === 17, '백그라운드로 가면 바로 저장');
  // 돌아오면 새 세트 확인
  A.pe.S().sync.last = 0; const nf = dev.fetched.length;
  A.w.PE_IO._wake(); await sleep(100);
  ok(dev.fetched.length > nf, '돌아오면 받아 오기 다시 확인');
  // 알림을 눌러 연 화면: 앱의 라우터로(탭 첫 화면으로 바꿔 쓰고 방문 기록은 그대로)
  const hl = A.w.history.length;
  A.w.PE_IO._go('review'); await sleep(60);
  ok(/오답 노트/.test(A.txt()) && A.w.location.hash === '#review' && A.w.history.length === hl && A.d.querySelector('#nav button.on').dataset.tab === 'review', '알림 → 복습 화면(방문 기록 그대로)');
  A.w.PE_IO._go('set/2026-10-19'); await sleep(60);
  ok(A.w.location.hash === '#set/2026-10-19' && A.w.history.length === hl && /복습/.test(A.d.querySelector('.topbar [data-act="back"]').textContent), '알림 → 세트 화면(위쪽은 보던 화면 "복습", 방문 기록 그대로)');

  // 전체 초기화: 확인 창 두 번
  await A.go('#backup');
  dev.answers.push(true, false);
  A.click('[data-act="reset"]'); await sleep(40);
  ok(dev.asked.slice(-2).join('|') === '모든 학습 기록과 내 카드를 지웁니다. 초기화할까요?|마지막 확인: 백업을 복사해 두었나요?' && A.pe.S().cards['K04'], '초기화 두 번째에서 취소 → 그대로');
  ok(A.errors.length === 0, '콘솔 오류 없음 ' + A.errors.slice(0, 3).join(' | '));

  // 2) 앱을 완전히 닫았다 다시 열기: 저장소에서 넣어 준 기록으로 시작
  const B = open();
  await sleep(300);
  ok(B.d.documentElement.getAttribute('data-theme') === 'dark', '다시 열면 첫 화면부터 저장한 테마');
  ok(!B.d.querySelector('#modal-wrap').innerHTML && B.pe.S().tk['seen:v3'], '처음(새로 설치)부터 3.0.0인 휴대폰은 다시 열어도 "바뀐 점" 창 없음');
  ok(B.pe.S().cards['K04'] && B.pe.S().cards['D20261019-1'] && Object.keys(B.pe.S().wrong).length >= 1, '다시 열어도 진도·오답 그대로');
  ok(B.pe.S().settings.newPerDay === 17, '백그라운드 직전 설정도 남음');
  ok(B.pe.SETS().sets['2026-10-19'] && B.pe.deck().length === 327, '받은 세트가 남아 덱 327장');
  await B.go('#settings');
  ok(B.d.querySelector('[data-nf="wd"]').checked && B.d.querySelector('[data-nt="wd"]').value === '06:45', '알림 설정도 남음');
  await B.go('#more');
  const appVer = require('../app.json').expo.version;
  ok(B.txt().includes('기술사 6개월 v' + appVer), '더보기 버전 = app.json 버전 ' + appVer);
  ok(appVer === '3.2.0' && require('../package.json').version === appVer && require('../package-lock.json').version === appVer && require('../package-lock.json').packages[''].version === appVer, `버전 ${appVer}: app.json = package.json = package-lock(앱 줄)`);
  ok(B.errors.length === 0, '다시 연 화면 콘솔 오류 없음 ' + B.errors.slice(0, 3).join(' | '));

  // 예전(2.x) 기록이 든 휴대폰에서 3.0.0을 처음 열면 "바뀐 점" 창 한 번(기록은 그대로), 표시는 네이티브 저장소에 남아 다시 열면 없음
  { const keep = disk.pe_state_v1, v2 = JSON.parse(keep); delete v2.tk; delete v2.today; delete v2.wk; disk.pe_state_v1 = JSON.stringify(v2);
    const U = open(); await sleep(300);
    ok(/오늘 몫 · 이번 주 · 복습 · 연습으로 정리했어요\. 예전 기능은 모두 그대로 있어요\./.test(U.d.querySelector('#modal-wrap').textContent) && !U.pe.S().tk['seen:v3'] && U.pe.S().cards['K04'] && U.pe.S().cards['K04'].seen === 3, '예전 기록으로 처음 연 3.0.0: 바뀐 점 창(진도는 그대로, 본 것은 닫을 때 적음)');
    U.w.PE_IO._go('review'); await sleep(60);   // 일요일 알림 "복습 비우기"를 눌러 연 앱(App.js onLoadEnd → _go)
    ok(U.w.location.hash === '#review' && /바뀐 점/.test(U.d.querySelector('#modal-wrap').textContent) && !U.pe.S().tk['seen:v3'], '알림으로 연 화면(_go review) 위에도 바뀐 점 창(본 것 아님)');
    U.click('#modal-wrap [data-act="sheet-close"]'); await sleep(20); ok(!U.d.querySelector('#modal-wrap').innerHTML && U.pe.S().tk['seen:v3'], '바뀐 점 창 닫기 → 본 것으로 적음'); U.w.PE_IO._hide(); await sleep(20);
    const U2 = open(); await sleep(300);
    ok(!U2.d.querySelector('#modal-wrap').innerHTML && JSON.parse(disk.pe_state_v1).tk['seen:v3'] && U.errors.length === 0 && U2.errors.length === 0, '다시 열면 바뀐 점 창 없음(표시는 네이티브 저장소에)');
    // 왼쪽 가장자리 밀기로 닫아도 본 것으로 적는다(닫기·바깥·밀기 모두 사용자가 닫은 것)
    disk.pe_state_v1 = JSON.stringify(v2); const U3 = open(); await sleep(300); U3.w.PE_IO._go('today'); await sleep(60);
    const sw = (type, x) => { const e = new U3.w.Event(type, { bubbles: true }); e[type === 'touchstart' ? 'touches' : 'changedTouches'] = [{ clientX: x, clientY: 300 }]; U3.d.querySelector('#modal-wrap .modal').dispatchEvent(e); };
    const had = /바뀐 점/.test(U3.d.querySelector('#modal-wrap').textContent) && !U3.pe.S().tk['seen:v3']; sw('touchstart', 6); sw('touchend', 150); await sleep(30); U3.w.PE_IO._hide(); await sleep(20);
    ok(had && !U3.d.querySelector('#modal-wrap').innerHTML && U3.pe.S().tk['seen:v3'] && JSON.parse(disk.pe_state_v1).tk['seen:v3'] && U3.errors.length === 0, '바뀐 점 창을 왼쪽 가장자리 밀기로 닫아도 본 것으로 적음(네이티브 저장소에)');
    disk.pe_state_v1 = keep; }

  // 3) 회원: 아이디 없는 앱 묶음(검사용)에는 회원 칸이 없고, 관리자 휴대폰에만 승인 관리가 보인다
  ok(!/승인 관리/.test(B.txt()) && !/아이디/.test(B.txt()), '회원 정보가 없으면 더보기에 아이디·승인 관리 없음');
  const K = open({ member: { id: 'kim', admin: false, uid: 'U2' } });
  await sleep(300);
  await K.go('#more');
  ok(/아이디 kim/.test(K.txt()) && !/승인 관리/.test(K.txt()), '일반 회원: 더보기에 아이디만, 승인 관리 없음');
  await K.go('#admin');
  ok(/관리자만 볼 수 있어요/.test(K.txt()) && !memOps().length, '일반 회원이 #admin을 열어도 목록을 부르지 않음');
  await K.go('#settings');
  ok(/이 휴대폰에 고정된 아이디/.test(K.txt()) && K.d.querySelector('[data-act="member-remove"]'), '설정에 아이디·아이디 지우기');
  dev.answers.push(false);
  K.click('[data-act="member-remove"]'); await sleep(40);
  ok(/아이디를 지울까요/.test(dev.asked[dev.asked.length - 1]) && !memOps().length, '아이디 지우기 확인에서 취소 → 그대로');
  dev.answers.push(true);
  K.click('[data-act="member-remove"]'); await sleep(40);
  ok(memOps().length === 1 && memOps()[0][0] === 'remove', '아이디 지우기 확인 → 앱에 지우기 요청');
  // 앱이 떠 있는 동안 관리자로 지정되면(콘솔) 앱이 알려 주고 화면이 바로 바뀐다
  await K.go('#more');
  K.w.PE_IO._member({ id: 'kim', admin: true, uid: 'U2' }); await sleep(20);
  ok(/승인 관리/.test(K.txt()), '떠 있는 더보기에 관리자 지정이 바로 반영');
  K.w.PE_IO._member({ id: 'kim', admin: false, uid: 'U2' }); await sleep(20);
  ok(!/승인 관리/.test(K.txt()), '관리자 해제도 바로 반영');
  dev.member.length = 0;
  ok(K.errors.length === 0, '일반 회원 화면 콘솔 오류 없음 ' + K.errors.slice(0, 3).join(' | '));

  dev.member.length = 0;
  const M = open({ member: { id: 'boss', admin: true, uid: 'U1' } });
  await sleep(300);
  await M.go('#more');
  ok(/아이디 boss/.test(M.txt()) && /승인 관리/.test(M.txt()), '관리자: 더보기에 승인 관리');
  await M.go('#admin'); await sleep(40);
  const at = M.txt();
  ok(dev.member.some(x => x[0] === 'list') && /승인 기다리는 사람1명/.test(at) && /boss \(나\)/.test(at) && /거절한 사람1명/.test(at) && /QWER23/.test(at) && /내 기기 번호: U1/.test(at), '승인 관리: 대기·승인·거절·초대 코드·내 기기 번호');
  ok(!M.d.querySelector('[data-act="adm-set"][data-uid="U1"]'), '내 아이디에는 승인 취소 버튼 없음');
  M.click('[data-act="adm-set"][data-uid="U2"][data-s="approved"]'); await sleep(40);
  ok(dev.member.some(x => x[0] === 'set' && x[1].uid === 'U2' && x[1].status === 'approved') && /kim 님을 승인했어요/.test(M.toast()), '승인 → 앱에 승인 요청 + 알림');
  ok(dev.member[dev.member.length - 1][0] === 'list', '승인 뒤 목록 다시 불러옴');
  M.click('[data-act="adm-set"][data-uid="U2"][data-s="rejected"]'); await sleep(40);
  ok(dev.member.some(x => x[0] === 'set' && x[1].uid === 'U2' && x[1].status === 'rejected'), '거절 → 앱에 거절 요청');
  dev.answers.push(true);
  M.click('[data-act="adm-del"][data-uid="U3"]'); await sleep(40);
  ok(/lee 아이디를 지울까요/.test(dev.asked[dev.asked.length - 1]) && dev.member.some(x => x[0] === 'del' && x[1].uid === 'U3' && x[1].id === 'lee'), '거절한 사람 지우기(확인 후)');
  M.click('[data-act="code-add"]'); await sleep(40);
  ok(dev.member.some(x => x[0] === 'code-add') && dev.clip === 'ABCD23' && /ABCD23/.test(M.toast()), '초대 코드 만들기 → 복사');
  M.click('[data-act="code-copy"][data-code="QWER23"]'); await sleep(40);
  ok(dev.clip === 'QWER23', '초대 코드 복사');
  M.click('[data-act="code-del"][data-code="QWER23"]'); await sleep(40);
  ok(dev.member.some(x => x[0] === 'code-del' && x[1].code === 'QWER23'), '초대 코드 지우기');
  ok(M.errors.length === 0, '관리자 화면 콘솔 오류 없음 ' + M.errors.slice(0, 3).join(' | '));

  // 4) 관리자 문자함: 탭 첫 화면 오른쪽 위 단추 + 안 읽은 수, 보낸 사람 목록, 한 사람의 문자(언제·어디서·무슨 내용), 읽음, 지우기
  msgs = MSGS(); dev.member.length = 0;
  const I = open({ member: { id: 'boss', admin: true, uid: 'U1' } });
  await sleep(300);
  for (const t of ['#today', '#week', '#review', '#practice', '#more']) { await I.go(t); await sleep(20); ok(I.d.querySelector('#view > .ibxrow .ibx'), '관리자: ' + t + ' 오른쪽 위에 문자함 단추'); }
  const bdg = I.d.querySelector('.ibx .bdg');
  ok(bdg && bdg.textContent === '2' && /안 읽은 문자 2개/.test(I.d.querySelector('.ibx').getAttribute('aria-label')), '안 읽은 문자 2개 → 빨간 동그라미 2');
  ok(dev.member.filter(x => x[0] === 'unread').length === 1, '안 읽은 수는 1분에 한 번만 셈(탭을 옮겨 다녀도)');
  ok(/문자함/.test(I.txt()) && /안 읽은 문자 2개/.test(I.txt()), '더보기 관리에도 문자함 줄과 안 읽은 수');
  await I.go('#more');
  I.click('#view .ibxrow .ibx'); await sleep(60);
  ok(I.w.location.hash === '#inbox' && dev.member.some(x => x[0] === 'list'), '문자함 단추 → 문자함(목록 불러옴)');
  const il = I.txt();
  ok(/안 읽은 문자 2개 · 보낸 사람 2명/.test(il) && /kim/.test(il) && /lee/.test(il) && /승인 대기/.test(il) && /거절됨/.test(il), '보낸 사람마다: 아이디·승인 상태·안 읽은 수');
  const rows = [...I.d.querySelectorAll('.ibxlist .row')];
  ok(rows.length === 2 && /kim/.test(rows[0].textContent) && rows[0].querySelector('.badge').textContent === '2' && !rows[1].querySelector('.badge'), '최근 문자 순(kim 먼저), kim에 안 읽은 수 2');
  ok(/한 번 더 부탁드려요/.test(rows[0].textContent) && /오늘/.test(rows[0].textContent) && /승인 대기 화면/.test(rows[0].textContent), '목록에 마지막 문자·언제·어디서');
  I.click('.ibxlist .row[data-h="inbox/U2"]'); await sleep(60);
  const th = I.txt();
  ok(I.w.location.hash === '#inbox/U2' && /kim/.test(th) && /문자 2개/.test(th), 'kim을 누르면 kim의 문자 2개');
  const cards = [...I.d.querySelectorAll('.msg')];
  ok(cards.length === 2 && /한 번 더/.test(cards[0].textContent) && /김철수입니다/.test(cards[1].textContent), '새 문자부터');
  ok(cards[1].querySelector('.mt').innerHTML.includes('&lt;b&gt;') && cards[1].querySelector('.mt').textContent.includes('\n'), '문자 내용은 그대로(태그 무력화, 줄바꿈 유지)');
  ok(/아이디 만들 때\(승인 요청\) · iOS 18\.1 · 앱 3\.0\.1/.test(cards[1].textContent) && /승인 대기 화면/.test(cards[0].textContent) && /(오늘|어제) 오[전후] \d+:\d{2}/.test(cards[1].textContent), '언제(오늘 오후 3:02 꼴)·어디서(보낸 화면·기기)');
  ok(cards.every(c => c.classList.contains('fresh')) && /새 문자/.test(th), '처음 본 문자에 "새 문자" 표시');
  ok(dev.member.some(x => x[0] === 'msg-read' && x[1].mids.slice().sort().join() === 'M1,M2') && msgs.filter(m => !m.read).length === 0, '열면 읽음으로(앱에 읽음 요청)');
  ok(!I.d.querySelector('.ibx'), '문자 화면에는 문자함 단추 없음(탭 첫 화면에만)');
  // 관리자 답장(3.1.3): 승인 대기인 사람은 답장 칸에 "승인하고 보내기"(파란 버튼 하나) · "답장만 보내기" · "거절하고 보내기"
  const rb = d => I.d.querySelector(`[data-act="ibx-reply"][data-uid="U2"]${d ? `[data-dec="${d}"]` : ':not([data-dec])'}`);
  ok(I.d.querySelector('#rpText') && rb('approved') && rb('rejected') && rb('') && rb('approved').className === 'btn' && !I.d.querySelector('[data-act="adm-set"]'), '승인 대기인 사람: 답장 칸과 승인하고 보내기·답장만 보내기·거절하고 보내기');
  I.click('[data-act="ibx-reply"][data-uid="U2"]:not([data-dec])'); await sleep(30);
  ok(/답장을 적어 주세요/.test(I.toast()) && !dev.member.some(x => x[0] === 'reply'), '빈 답장은 안 보냄');
  { const t = I.d.querySelector('#rpText'); t.value = '김철수 님 확인했어요. 승인합니다'; t.dispatchEvent(new I.w.Event('input', { bubbles: true })); }
  I.pe.render(); await sleep(10);
  ok(I.d.querySelector('#rpText').value === '김철수 님 확인했어요. 승인합니다', '다시 그려도 쓰던 답장 남음');
  I.click('[data-act="ibx-reply"][data-uid="U2"][data-dec="approved"]'); await sleep(80);
  ok(dev.member.some(x => x[0] === 'reply' && x[1].uid === 'U2' && x[1].dec === 'approved' && x[1].text === '김철수 님 확인했어요. 승인합니다') && /승인하고 답장을 보냈어요/.test(I.toast()) && I.w.location.hash === '#inbox/U2', '승인하고 보내기 → 앱에 답장 요청(승인과 함께), 그 화면 그대로');
  const rp = I.d.querySelector('.msg.rp');
  ok(rp && /보낸 답장 · 승인과 함께/.test(rp.textContent) && /아직 안 읽음/.test(rp.textContent) && I.d.querySelector('#rpText').value === '' && /답장 1개/.test(I.txt()), '보낸 답장이 문자들 사이에(승인과 함께 · 아직 안 읽음), 답장 칸은 비움');
  I.click('[data-act="ibx-reply"][data-uid="U2"][data-dec="rejected"]'); await sleep(60);
  ok(dev.member.some(x => x[0] === 'reply' && x[1].dec === 'rejected' && x[1].text === '') && /kim 님의 승인을 막았어요/.test(I.toast()), '답장 없이 거절만 → 상태만 바꾸기');
  I.click('.topbar .back'); await sleep(60);
  ok(I.w.location.hash === '#inbox' && !I.d.querySelector('.ibxlist .badge'), '뒤로 → 문자함 목록(안 읽은 수 없어짐)');
  I.click('.topbar .back'); await sleep(60);
  ok(I.w.location.hash === '#more' && !I.d.querySelector('.ibx .bdg') && /새 문자 없음/.test(I.txt()), '문자함에서 뒤로 → 연 탭(더보기), 빨간 동그라미 없어짐');
  await I.go('#inbox/U3'); await sleep(20);
  dev.answers.push(true);
  I.click('[data-act="ibx-del"]'); await sleep(80);
  ok(/lee 님이 보낸 문자 1개를 지울까요/.test(dev.asked[dev.asked.length - 1]) && dev.member.some(x => x[0] === 'msg-del' && x[1].mids.join() === 'M3' && x[1].rids.length === 0) && I.w.location.hash === '#inbox', '한 사람 문자 지우기(확인 후) → 목록으로');
  await I.go('#inbox/U2'); await sleep(40); dev.answers.push(true);
  I.click('[data-act="ibx-del"]'); await sleep(80);
  ok(/kim 님이 보낸 문자 2개와 보낸 답장 1개를 지울까요/.test(dev.asked[dev.asked.length - 1]) && dev.member.some(x => x[0] === 'msg-del' && x[1].rids.join() === 'R1'), '문자 지우기는 보낸 답장도 함께');
  msgs = null; await I.go('#today'); I.click('#view .ibxrow .ibx'); await sleep(60);
  ok(/문자함을 열지 못했어요/.test(I.txt()) && /규칙/.test(I.txt()), '문자 규칙을 아직 게시하지 않았으면 안내');
  ok(I.errors.length === 0, '문자함 콘솔 오류 없음 ' + I.errors.slice(0, 3).join(' | '));

  // 5) 회원: 문자함 단추 없음, 더보기 → 관리자에게 문자 보내기
  msgs = MSGS(); dev.member.length = 0;
  const W = open({ member: { id: 'kim', admin: false, uid: 'U2' } });
  await sleep(300);
  await W.go('#today');
  ok(!W.d.querySelector('.ibx') && !dev.member.some(x => x[0] === 'unread') && dev.member.some(x => x[0] === 'thread'), '회원: 답장이 없으면 문자함 단추 없음, 안 읽은 수는 세지 않고 답장만 받아 옴');
  await W.go('#more');
  W.click('[data-act="go"][data-h="msg"]'); await sleep(40);
  ok(W.w.location.hash === '#msg' && W.d.querySelector('#msgText'), '더보기 → 관리자에게 문자 보내기');
  W.click('[data-act="msg-send"]'); await sleep(30);
  ok(/보낼 말을 적어 주세요/.test(W.toast()) && !dev.member.some(x => x[0] === 'msg-send'), '빈 문자는 안 보냄');
  const ta = W.d.querySelector('#msgText'); ta.value = '오늘 세트가 안 보여요'; ta.dispatchEvent(new W.w.Event('input', { bubbles: true }));
  dev.sendFail = '인터넷에 연결되어 있지 않아요';
  W.click('[data-act="msg-send"]'); await sleep(40);
  ok(/보내지 못했어요: 인터넷/.test(W.toast()) && W.w.location.hash === '#msg', '못 보내면 알리고 그 화면 그대로');
  W.pe.render(); await sleep(10);
  ok(W.d.querySelector('#msgText').value === '오늘 세트가 안 보여요', '다시 그려도 쓰던 글 남음');
  dev.sendFail = null;
  W.click('[data-act="msg-send"]'); await sleep(40);
  ok(dev.member.some(x => x[0] === 'msg-send' && x[1].text === '오늘 세트가 안 보여요') && /관리자에게 보냈어요/.test(W.toast()) && W.w.location.hash === '#msg' && W.d.querySelector('#msgText').value === '', '보내기 → 앱에 보내기 요청, 그 화면 그대로(빈 칸)');
  // 관리자 답장(3.1.3): 안 읽은 답장이 오면 탭 첫 화면 오른쪽 위 단추와 수, 더보기 "새 답장 1개" → 관리자와 문자(주고받은 말, 새 답장 표시) → 읽음으로
  thread = { msgs: [{ mid: 'M9', uid: 'U2', id: 'kim', text: '오늘 세트가 안 보여요', from: 'app', at: new Date(Date.now() - 600000).toISOString(), read: false }],
    replies: [{ rid: 'R7', uid: 'U2', id: 'kim', text: '받아 오기를 한 번 눌러 주세요', dec: '', at: new Date().toISOString(), read: false }] };
  W.w.document.dispatchEvent(new W.w.Event('visibilitychange')); await W.go('#today'); await sleep(60);
  const mb = W.d.querySelector('#view > .ibxrow .ibx.mt');
  ok(mb && mb.querySelector('.bdg').textContent === '1' && /안 읽은 답장 1개/.test(mb.getAttribute('aria-label')), '안 읽은 답장 1개 → 오늘 오른쪽 위 단추와 빨간 동그라미 1');
  await W.go('#more'); await sleep(20);
  ok(/관리자와 문자/.test(W.txt()) && /새 답장 1개/.test(W.txt()), '더보기: 관리자와 문자 · 새 답장 1개');
  W.click('#view .ibxrow .ibx.mt'); await sleep(80);
  const items = [...W.d.querySelectorAll('.msg')];
  ok(W.w.location.hash === '#msg' && items.length === 2 && items[0].classList.contains('rp') && /관리자 답장/.test(items[0].textContent) && /새 답장/.test(items[0].textContent) && /받아 오기를 한 번/.test(items[0].textContent) && /오늘 세트가 안 보여요/.test(items[1].textContent),
    '단추 → 관리자와 문자: 새것부터(관리자 답장에 "새 답장"), 내가 보낸 문자');
  ok(dev.member.some(x => x[0] === 'reply-read' && x[1].rids.join() === 'R7') && thread.replies[0].read, '열면 답장을 읽음으로(앱에 읽음 요청)');
  await W.go('#today'); await sleep(20);
  ok(!W.d.querySelector('.ibx'), '읽은 뒤 오늘에는 단추 없음');
  await W.go('#inbox'); ok(/관리자만 볼 수 있어요/.test(W.txt()) && !dev.member.some(x => x[0] === 'list'), '회원이 #inbox를 열어도 목록을 부르지 않음');
  ok(W.errors.length === 0, '회원 문자 화면 콘솔 오류 없음 ' + W.errors.slice(0, 3).join(' | '));

  // 6) 백업 파일에서 불러오기: 앱의 파일 고르기 → 확인 → 복원. 취소·다른 파일
  {
    const F = open({ member: { id: 'kim', admin: false, uid: 'U2' } });
    await sleep(300);
    const S0 = F.pe.S(); const mine = JSON.parse(JSON.stringify(S0)); mine.settings.newPerDay = 37; mine.tk = Object.assign({}, mine.tk, { backup: '2026-10-30' });
    await F.go('#backup');
    ok(F.d.querySelector('[data-act="restore-file"]') && /파일에서 불러오기/.test(F.txt()), '백업 화면에 파일에서 불러오기');
    dev.pick = null; F.click('[data-act="restore-file"]'); await sleep(40);
    ok(dev.picks === 1 && F.pe.S().settings.newPerDay !== 37 && !/백업 파일이 아니에요/.test(F.toast()), '고르기를 취소하면 그대로');
    dev.pick = { name: 'memo.txt', text: 'hello' }; F.click('[data-act="restore-file"]'); await sleep(40);
    ok(/백업 파일이 아니에요/.test(F.toast()), '백업이 아닌 파일 → 알림');
    const asked0 = dev.asked.length;
    dev.pick = { name: 'gisulsa-backup-2026-10-30.json', text: '\uFEFF' + JSON.stringify({ state: mine, sets: F.pe.SETS() }) };
    dev.answers.push(false); F.click('[data-act="restore-file"]'); await sleep(60);
    ok(dev.asked.length === asked0 + 1 && /10월 30일 백업 파일로 지금 기록을 덮어씁니다/.test(dev.asked[asked0]) && /gisulsa-backup-2026-10-30\.json/.test(dev.asked[asked0]) && F.pe.S().settings.newPerDay !== 37, '확인 창(백업 날짜·파일 이름), 취소하면 그대로');
    dev.answers.push(true); F.click('[data-act="restore-file"]'); await sleep(120);
    ok(F.pe.S().settings.newPerDay === 37 && /복원했어요/.test(F.toast()) && JSON.parse(disk.pe_state_v1).settings.newPerDay === 37, '확인 → 복원(네이티브 저장소에도)');
    ok(F.errors.length === 0, '파일 복원 콘솔 오류 없음 ' + F.errors.slice(0, 3).join(' | '));
  }

  // 앱 쪽 규칙
  const bad = [];
  const H = host.createHost({ inject: c => bad.push(c), writeStore: () => bad.push('write') });
  await H(JSON.stringify({ t: 'fetch', id: 1, url: 'http://example.com/x.json' }));
  ok(/https 주소만/.test(bad[0]), 'https가 아닌 주소는 받지 않음');
  await H(JSON.stringify({ t: 'store', k: 'other', v: 'x' })); await H('not json');
  ok(bad.length === 1, '모르는 저장 키·깨진 메시지는 무시');
  const H2 = host.createHost({ inject: c => bad.push(c), member: async () => { bad.push('called'); return true; } });
  await H2(JSON.stringify({ t: 'member', id: 2, op: 'approve-me', args: {} }));
  ok(/모르는 회원 요청/.test(bad[1]) && !bad.includes('called'), '모르는 회원 요청은 앱에 넘기지 않음');
  const seen = [];
  const H3 = host.createHost({ inject: c => seen.push(c), member: async op => { seen.push('op:' + op); return 1; }, pickFile: async () => ({ name: 'a.json', text: '{}' }) });
  for (const op of ['unread', 'msg-read', 'msg-del', 'msg-send']) await H3(JSON.stringify({ t: 'member', id: 9, op, args: { mids: ['A'] } }));
  ok(['unread', 'msg-read', 'msg-del', 'msg-send'].every(op => seen.includes('op:' + op)), '문자 요청(unread·msg-read·msg-del·msg-send)은 앱에 넘김');
  await H3(JSON.stringify({ t: 'pick', id: 10 }));
  ok(/"id":10,"ok":true,"v":\{"name":"a.json","text":"\{\}"\}/.test(seen[seen.length - 1]), '파일 고르기(pick): 이름과 글을 돌려줌');
  ok(/maximum-scale=1, user-scalable=no/.test(bundle.files['index.html']) && /touch-action:manipulation/.test(bundle.files['styles.css']), '확대 막기: viewport와 두 번 눌러 확대 막기');
  ok(/"member":\{"id":"boss","admin":true/.test(host.bootScript({ store: {}, notif: null, version: '1', member: { id: 'boss', admin: true, uid: 'U1' } })) && /"member":null/.test(host.bootScript({ store: {}, notif: null, version: '1' })), 'bootScript: 회원 정보 주입');

  // 앱 업데이트(3.2.0): 앱(EAS Update)이 새 버전을 받아 두면 오늘 화면 위 한 줄 "새 버전(3.2.1)을 받아 두었어요 · 최신 버전 받기"(누르면 기록을 먼저 저장하고 앱에 부탁),
  // 더보기 "앱 업데이트"(확인·받기·App Store 열기), 업데이트한 뒤 처음 열면 "… 버전으로 업데이트했어요". 네이티브가 바뀌면 runtimeVersion을 올려야 함(지문 검사)
  {
    const UP = require('../native/updates'), APPV = require('../app.json').expo.version;
    ok(UP.newer('3.10.0', '3.9.1') && !UP.newer('3.2.0', '3.2.0') && UP.newer('3.2.1', '3.2') && !UP.newer('', '3.2.0') && !UP.newer('3.1.9', '3.2.0'), '업데이트: 버전 비교(3.10.0 > 3.9.1)');
    const man = v => ({ manifest: { extra: { expoClient: { version: v } } } });
    ok(UP.verOf(man('3.2.1')) === '3.2.1' && UP.verOf(null) === '' && UP.verOf({ manifest: {} }) === '', '업데이트: 받을 버전 번호(업데이트를 올릴 때의 app.json 버전)');
    const st = (u, o) => UP.updState(u, Object.assign({ enabled: true, store: null, running: '3.2.0' }, o)), t0 = new Date('2026-11-14T09:00:00');
    ok(st({}, { enabled: false }).s === 'off' && st({}).s === 'idle' && st({ lastCheckForUpdateTimeSinceRestart: t0 }).s === 'none' && st({ lastCheckForUpdateTimeSinceRestart: t0 }).at === +t0, '업데이트 상태: 꺼진 빌드·확인 전·최신(확인 시각)');
    ok(st({ isChecking: true }).s === 'check' && st({ isUpdateAvailable: true, availableUpdate: man('3.2.1') }).s === 'avail' && st({ isUpdateAvailable: true, availableUpdate: man('3.2.1') }).v === '3.2.1'
      && st({ isUpdateAvailable: true, isDownloading: true, availableUpdate: man('3.2.1') }).s === 'busy' && st({ isUpdateAvailable: true, isUpdatePending: true, downloadedUpdate: man('3.2.1') }).s === 'ready', '업데이트 상태: 확인 중·있음·받는 중·받아 둠');
    ok(st({ isUpdateAvailable: true, availableUpdate: man('3.2.1'), downloadError: new Error('The Internet connection appears to be offline.') }).err === '인터넷 연결을 확인하세요' && st({ checkError: new Error('server 500') }).s === 'err' && st({ checkError: new Error('server 500') }).err === '잠시 뒤 다시 확인하세요', '업데이트 상태: 받기·확인 실패 이유(한국어)');
    ok(st({}, { store: { v: '3.3.0', url: 'https://apps.apple.com/kr/app/id1' } }).s === 'store' && st({}, { store: { v: '3.2.0', url: 'https://apps.apple.com/kr/app/id1' } }).s === 'idle'
      && st({ isUpdatePending: true, downloadedUpdate: man('3.2.1') }, { store: { v: '3.3.0', url: 'https://apps.apple.com/kr/app/id1' } }).s === 'ready', '업데이트 상태: App Store에 지금보다 새 버전이면 store(앱 안 업데이트가 먼저)');
    ok(JSON.stringify(UP.parseStore(JSON.stringify({ resultCount: 1, results: [{ version: '3.3.0', trackViewUrl: 'https://apps.apple.com/kr/app/x/id123?uo=4' }] }))) === '{"v":"3.3.0","url":"https://apps.apple.com/kr/app/x/id123?uo=4"}'
      && UP.parseStore('{"resultCount":0,"results":[]}') === null && UP.parseStore('x') === null && UP.parseStore(JSON.stringify({ results: [{ version: '3.3.0', trackViewUrl: 'https://evil.example/x' }] })) === null, 'App Store 조회: 버전과 App Store 앱 페이지 주소만 받음');
    const seenU = [], HU = host.createHost({ inject: c => seenU.push(c), update: async op => { seenU.push('op:' + op); return op === 'check' ? { found: true, v: '3.2.1' } : true; } });
    await HU(JSON.stringify({ t: 'update', id: 1, op: 'check' })); await HU(JSON.stringify({ t: 'update', id: 2, op: 'wipe' }));
    ok(seenU.includes('op:check') && /"id":1,"ok":true,"v":\{"found":true,"v":"3\.2\.1"\}/.test(seenU.join('\n')) && /"id":2,"ok":false/.test(seenU.join('\n')) && !seenU.includes('op:wipe'), '업데이트 요청은 check·apply·store만 앱에 넘김');

    // 화면: 확인 전 → 더보기에서 지금 확인
    const E = open(); await sleep(300);
    const un = () => E.d.querySelector('#view .notice.upd'), ur = () => [...E.d.querySelectorAll('#view .row')].find(r => /앱 업데이트/.test(r.textContent));
    ok(!un(), '알림 전(확인 전)에는 오늘 화면에 업데이트 줄 없음');
    await E.go('#more');
    ok(ur() && ur().dataset.act === 'upd-check' && /v[\d.]+ · 눌러서 새 버전 확인/.test(ur().textContent), `더보기 "앱 업데이트": 확인 전 "${ur() && ur().textContent}"`);
    dev.upd = []; E.click('#view [data-act="upd-check"]'); await sleep(60);
    ok(dev.upd.join() === 'check' && /최신 버전이에요/.test(E.toast()), '누르면 지금 확인 → "최신 버전이에요"');
    E.w.PE_IO._update({ s: 'none', at: +new Date('2026-11-14T09:05:00') }); await sleep(20);
    ok(/최신 버전이에요 · 확인 09:05/.test(ur().textContent), `확인한 뒤 더보기 "${ur().textContent}"(앱이 알려 주면 바로 다시 그림)`);
    dev.updCheck = { found: true, v: '3.2.1' }; E.click('#view [data-act="upd-check"]'); await sleep(60); dev.updCheck = null;
    ok(/새 버전\(3\.2\.1\)을 받고 있어요/.test(E.toast()), `새 버전이 있으면 "${E.toast()}"`);
    // 받아 둠 → 오늘 화면 위 한 줄
    await E.go('#today'); E.w.PE_IO._update({ s: 'ready', v: '3.2.1', at: Date.now() }); await sleep(30);
    ok(un() && /새 버전\(3\.2\.1\)을 받아 두었어요/.test(un().textContent) && /누르면 앱이 잠깐 다시 열리며 바로 바뀌어요\. 기록은 그대로예요/.test(un().textContent) && un().querySelector('[data-act="upd-get"]').textContent === '최신 버전 받기',
      `오늘 화면: "${un() && un().textContent}"`);
    E.pe.TM().running = true; dev.upd = []; E.click('#view [data-act="upd-get"]'); await sleep(30); E.pe.TM().running = false;
    ok(!dev.upd.length && /타이머를 멈춘 뒤 업데이트해요/.test(E.toast()), '타이머가 도는 동안은 업데이트하지 않음(멈춘 뒤에)');
    E.pe.S().settings.newPerDay = 19; dev.upd = []; E.click('#view [data-act="upd-get"]'); await sleep(60);
    ok(dev.upd.join() === 'apply' && JSON.parse(dev.updDisk).settings.newPerDay === 19 && un().querySelector('[data-act="upd-get"]').disabled && /받는 중…/.test(un().textContent),
      '최신 버전 받기 → 기록을 먼저 네이티브 저장소에 쓰고 앱에 부탁(받아서 다시 열기), 버튼은 "받는 중…"');
    ok(E.errors.length === 0, '업데이트 화면 콘솔 오류 없음 ' + E.errors.slice(0, 3).join(' | '));
    // 받지 못하면 이유와 함께 다시 누를 수 있게, 이미 최신이면 그렇게
    const F = open(); await sleep(300); F.w.PE_IO._update({ s: 'avail', v: '3.2.1', at: Date.now(), err: '인터넷 연결을 확인하세요' }); await sleep(30);
    const fn = () => F.d.querySelector('#view .notice.upd');
    ok(fn() && /새 버전\(3\.2\.1\)이 있어요/.test(fn().textContent) && /받지 못했어요 — 인터넷 연결을 확인하세요/.test(fn().textContent), `받기 실패한 뒤 오늘 화면 "${fn() && fn().textContent}"`);
    dev.updFail = '인터넷에 연결되어 있지 않아요'; F.click('#view [data-act="upd-get"]'); await sleep(60); dev.updFail = null;
    ok(/최신 버전을 받지 못했어요 — 인터넷에 연결되어 있지 않아요/.test(F.toast()) && !fn().querySelector('[data-act="upd-get"]').disabled, '받지 못하면 이유를 알리고 다시 누를 수 있음');
    dev.updApply = { s: 'none' }; F.click('#view [data-act="upd-get"]'); await sleep(60); dev.updApply = null;
    ok(/이미 최신 버전이에요/.test(F.toast()), '이미 최신이면 "이미 최신 버전이에요"');
    F.click('#view [data-act="upd-later"]'); await sleep(20);
    ok(!fn(), '× 나중에 → 그 버전 줄은 숨김(앱을 다시 열거나 다른 버전이 오면 다시)');
    F.w.PE_IO._update({ s: 'ready', v: '3.2.2', at: Date.now() }); await sleep(20);
    ok(fn() && /3\.2\.2/.test(fn().textContent), '다른 상태·버전이 오면 다시 보임');
    // App Store에만 있는 새 버전(네이티브가 바뀐 빌드)
    F.w.PE_IO._update({ s: 'store', v: '3.3.0', url: 'https://apps.apple.com/kr/app/id1', at: Date.now() }); await sleep(20);
    ok(fn() && /App Store에 새 버전\(3\.3\.0\)이 있어요/.test(fn().textContent) && fn().querySelector('[data-act="upd-store"]'), `App Store 새 버전: "${fn() && fn().textContent}"`);
    dev.upd = []; F.click('#view [data-act="upd-store"]'); await sleep(30);
    ok(dev.upd.join() === 'store', 'App Store 열기 → 앱에 부탁(주소는 앱이 가진 것으로)');
    // 업데이트를 쓰지 않는 빌드
    F.w.PE_IO._update({ s: 'off' }); await sleep(20); await F.go('#more');
    const fr = [...F.d.querySelectorAll('#view .row')].find(r => /앱 업데이트/.test(r.textContent));
    ok(!F.d.querySelector('#view .notice.upd') && fr && !fr.dataset.act && /이 빌드는 앱 안 업데이트를 쓰지 않아요/.test(fr.textContent), '꺼진 빌드: 오늘 줄 없음, 더보기 "이 빌드는 앱 안 업데이트를 쓰지 않아요"(누를 수 없음)');
    ok(F.errors.length === 0, '업데이트 화면 2 콘솔 오류 없음 ' + F.errors.slice(0, 3).join(' | '));
    // 업데이트한 뒤 처음 열면 한 번 알림(기록의 마지막 버전과 다르면)
    { const k = JSON.parse(disk.pe_state_v1); k.tk = Object.assign({}, k.tk, { ver: '3.1.9' }); disk.pe_state_v1 = JSON.stringify(k);
      const G = open(); await sleep(1100);
      ok(G.toast() === `${APPV} 버전으로 업데이트했어요` && G.pe.S().tk.ver === APPV && JSON.parse(disk.pe_state_v1).tk.ver === APPV, `업데이트한 뒤 처음 열면 "${G.toast()}"`);
      const G2 = open(); await sleep(1100);
      ok(!/업데이트했어요/.test(G2.toast()), '다시 열면 알림 없음'); }
    // 앱 설정: 프로젝트 ID가 있는 PC에서만 업데이트를 켬, runtimeVersion 고정, 빌드 채널
    const cfgF = require('../app.config.js'), aj = require('../app.json').expo;
    const c1 = cfgF({ config: aj }), c2 = cfgF({ config: Object.assign({}, aj, { extra: { eas: { projectId: 'P-1' } } }) });
    ok(c1.updates.enabled === false && !c1.updates.url && c2.updates.enabled === true && c2.updates.url === 'https://u.expo.dev/P-1' && c2.runtimeVersion === cfgF.RUNTIME && c1.runtimeVersion === cfgF.RUNTIME
      && c2.updates.checkAutomatically === 'ON_LOAD' && c2.updates.fallbackToCacheTimeout === 0 && require('../eas.json').build.production.channel === 'production',
      'app.config.js: 프로젝트 ID가 있으면 u.expo.dev 업데이트(켤 때 확인·기다리지 않음), runtimeVersion 고정, eas.json production 채널');
    // 네이티브 부분(패키지·iOS 설정·플러그인·아이콘)의 지문: 바꾸면 app.config.js의 RUNTIME을 그 버전으로 올리고 PIN에 새 지문을 적은 뒤 App Store 빌드(앱 안 업데이트로 보내지 않음)
    const crypto = require('crypto'), pkg = require('../package.json');
    const nat = JSON.stringify({ deps: pkg.dependencies, ios: aj.ios, plugins: aj.plugins, icon: aj.icon, name: aj.name, slug: aj.slug, orientation: aj.orientation, ui: aj.userInterfaceStyle, platforms: aj.platforms });
    const fp = crypto.createHash('sha256').update(nat).digest('hex').slice(0, 12), PIN = { '3.2.0': '30ff453e3422' };
    ok(PIN[cfgF.RUNTIME] === fp, `네이티브 지문 ${fp} = runtimeVersion ${cfgF.RUNTIME}의 지문(네이티브를 바꿨으면 RUNTIME을 올리고 새 지문을 적은 뒤 App Store 빌드)`);
  }

  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
