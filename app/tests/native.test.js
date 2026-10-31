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
const dev = { clip: null, saved: null, asked: [], answers: [], awake: [], looks: [], notif: [], denyNotif: false, fetched: [], member: [] };
// 가짜 회원 서버(Firebase 자리): 관리자 화면이 부르는 요청을 기록한다
const MEMBERS = [{ uid: 'U2', id: 'kim', status: 'pending', createdAt: '2026-10-20T01:00:00Z', code: '' }, { uid: 'U1', id: 'boss', status: 'approved', createdAt: '2026-10-19T01:00:00Z', code: '' }, { uid: 'U3', id: 'lee', status: 'rejected', createdAt: '2026-10-18T01:00:00Z', code: '' }];
const CODES = [{ code: 'QWER23', createdAt: '2026-10-20T02:00:00Z' }];

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
    member: async (op, a) => {
      dev.member.push([op, a]);
      if (op === 'list') return { members: MEMBERS, codes: CODES, me: 'U1' };
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
  ok(B.pe.S().cards['K04'] && B.pe.S().cards['D20261019-1'] && Object.keys(B.pe.S().wrong).length >= 1, '다시 열어도 진도·오답 그대로');
  ok(B.pe.S().settings.newPerDay === 17, '백그라운드 직전 설정도 남음');
  ok(B.pe.SETS().sets['2026-10-19'] && B.pe.deck().length === 327, '받은 세트가 남아 덱 327장');
  await B.go('#settings');
  ok(B.d.querySelector('[data-nf="wd"]').checked && B.d.querySelector('[data-nt="wd"]').value === '06:45', '알림 설정도 남음');
  await B.go('#more');
  const appVer = require('../app.json').expo.version;
  ok(B.txt().includes('기술사 6개월 v' + appVer), '더보기 버전 = app.json 버전 ' + appVer);
  ok(B.errors.length === 0, '다시 연 화면 콘솔 오류 없음 ' + B.errors.slice(0, 3).join(' | '));

  // 3) 회원: 아이디 없는 앱 묶음(검사용)에는 회원 칸이 없고, 관리자 휴대폰에만 승인 관리가 보인다
  ok(!/승인 관리/.test(B.txt()) && !/아이디/.test(B.txt()), '회원 정보가 없으면 더보기에 아이디·승인 관리 없음');
  const K = open({ member: { id: 'kim', admin: false, uid: 'U2' } });
  await sleep(300);
  await K.go('#more');
  ok(/아이디 kim/.test(K.txt()) && !/승인 관리/.test(K.txt()), '일반 회원: 더보기에 아이디만, 승인 관리 없음');
  await K.go('#admin');
  ok(/관리자만 볼 수 있어요/.test(K.txt()) && !dev.member.length, '일반 회원이 #admin을 열어도 목록을 부르지 않음');
  await K.go('#settings');
  ok(/이 휴대폰에 고정된 아이디/.test(K.txt()) && K.d.querySelector('[data-act="member-remove"]'), '설정에 아이디·아이디 지우기');
  dev.answers.push(false);
  K.click('[data-act="member-remove"]'); await sleep(40);
  ok(/아이디를 지울까요/.test(dev.asked[dev.asked.length - 1]) && !dev.member.length, '아이디 지우기 확인에서 취소 → 그대로');
  dev.answers.push(true);
  K.click('[data-act="member-remove"]'); await sleep(40);
  ok(dev.member.length === 1 && dev.member[0][0] === 'remove', '아이디 지우기 확인 → 앱에 지우기 요청');
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
  ok(dev.member[0][0] === 'list' && /승인 기다리는 사람1명/.test(at) && /boss \(나\)/.test(at) && /거절한 사람1명/.test(at) && /QWER23/.test(at) && /내 기기 번호: U1/.test(at), '승인 관리: 대기·승인·거절·초대 코드·내 기기 번호');
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
  ok(/"member":\{"id":"boss","admin":true/.test(host.bootScript({ store: {}, notif: null, version: '1', member: { id: 'boss', admin: true, uid: 'U1' } })) && /"member":null/.test(host.bootScript({ store: {}, notif: null, version: '1' })), 'bootScript: 회원 정보 주입');

  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
