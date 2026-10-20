// 웹 코드 회귀 검사(jsdom): 가짜 저장소(tests/fake)에서 세트·모의·기출을 받아 오고 주요 화면·세션·시험 일정을 돈다. 실행: npm i jsdom && node tests/app.test.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '..', 'web');
const FAKE = process.argv[2] || path.join(__dirname, 'fake');
const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')
  .replace(/<script src="([^"]+)\?v=\d+"><\/script>/g, (m, src) => `<script>${fs.readFileSync(path.join(SITE, src), 'utf8')}</script>`)
  .replace(/<script>\s*if \('serviceWorker'[\s\S]*?<\/script>/, '')
  .replace(/<link rel="stylesheet" href="https:[^>]+>/, '');
const errors = [];
let fetchLog = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://gisulsa.test/',
  beforeParse(w) {
    w.fetch = async (url) => {
      fetchLog.push(url);
      const m = String(url).match(/gisulsa-data\/main\/data\/([^?]+)/);
      const f = m && path.join(FAKE, 'data', m[1]);
      if (f && fs.existsSync(f)) { const txt = fs.readFileSync(f, 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(txt) }; }
      return { ok: false, status: 404, json: async () => ({}) };
    };
    w.console.error = (...a) => { errors.push(a.join(' ')); };
  }
});
const w = dom.window, d = w.document;
w.confirm = () => true; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok:', m); };
const click = (sel, root) => { const el = (root || d).querySelector(sel); if (!el) { fails++; console.log('FAIL: no element', sel); return null; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return el; };
const view = () => d.querySelector('#view');
const txt = () => view().textContent;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const go = async h => { w.location.hash = h; await sleep(30); };

(async () => {
  // 데이터 무결성
  const pe = w.__pe;
  const deck = pe.deck();
  ok(deck.length >= 323, `덱 ${deck.length}장 (세트 카드 포함 전 기본 323)`);
  ok(w.PE_KICHUL.rounds.length === 25, '내장 기출 25회분');
  ok(w.PE_KICHUL.rounds.reduce((a, r) => a + r.q.length, 0) === 775, '내장 기출 775문항');
  const kq = pe.kq();
  const badKX = Object.entries(w.PE_KX).flatMap(([c, xs]) => xs.filter(x => !kq[x]).map(x => c + ':' + x));
  ok(badKX.length === 0, 'PE_KX 참조 유효 ' + badKX.slice(0, 3));
  const badCardX = deck.flatMap(c => (c.x || []).filter(x => !kq[x]).map(x => c.id + ':' + x));
  ok(badCardX.length === 0, '카드 x 참조 유효 ' + badCardX.slice(0, 3));
  ok(deck.filter(c => c.src === 'kichul').length === 98, '기출 보강 카드 98장');
  const p1 = Object.values(kq).filter(q => q.p === 1);
  const cov = p1.filter(q => deck.some(c => (c.x || []).includes(q.id))).length;
  console.log(`   1교시 카드 연결 ${cov}/${p1.length}`);

  // 동기화
  await sleep(300);
  ok(fetchLog.some(u => /index\.json/.test(u)), 'index.json 요청');
  const SETS = pe.SETS();
  ok(SETS.sets['2026-10-19'] && SETS.sets['2026-10-19'].cards.length === 10, '세트 받음');
  ok(SETS.mocks['2026-10-24'], '모의고사 받음');
  ok(SETS.kichul && SETS.kichul.rev === 3 && SETS.kichul.rounds[0].r === 141, '새 회차(제141회) 받음');
  ok(pe.deck().length === 327, '세트 새 카드 4장이 덱에 들어옴: ' + pe.deck().length);
  ok(pe.deck().find(c => c.id === 'K04').x.includes('141-1-01'), '저장소 연결표(kx)가 K04에 반영');
  ok(pe.kq()['141-1-01'], '제141회 문항 조회');

  // 오늘
  await go('#today');
  const todayStr = new Date(); const ymd = todayStr.getFullYear() + '-' + String(todayStr.getMonth() + 1).padStart(2, '0') + '-' + String(todayStr.getDate()).padStart(2, '0');
  if (ymd === '2026-10-19') {
    ok(/댐·하천 맛보기/.test(txt()), '오늘 화면에 세트 제목');
    ok(view().querySelectorAll('.steps li').length === 4, '세트 단계 4줄');
  } else console.log('   (오늘 날짜가 2026-10-19가 아니라 세트 대기 화면)');
  ok(/D-\d+/.test(view().querySelector('.dday').textContent), 'D-day 표시 ' + view().querySelector('.dday').textContent.trim());
  ok(view().querySelectorAll('.check').length >= 3, '오늘 할 일 체크리스트');

  // 세트 화면
  await go('#set/2026-10-19');
  ok(/사방댐/.test(txt()) && view().querySelectorAll('.acc').length === 10, '세트 용어 10개');
  ok(view().querySelectorAll('.tag-new').length === 4, '새 용어 표시 4개');
  click('[data-act="set-open"][data-i="0"]'); await sleep(20);
  ok(/토석류/.test(txt()), '용어 펼치기');
  const S = () => pe.S();
  ok(S().cards['D20261019-1'] && S().cards['D20261019-1'].seen === 1, '펼친 새 카드가 간격반복에 들어감');
  click('[data-act="set-open"][data-i="4"]'); await sleep(20);
  ok(/수제/.test(txt()) && /141회 1-1/.test(txt()), 'ref 카드 펼치면 덱 내용 + 제141회 연결 표시');
  click('[data-act="set-open"][data-i="1"]'); await sleep(20);
  ok(/근거: 토질역학/.test(txt()), '근거(basis) 표시');
  click('[data-act="set-tab"][data-t="quiz"]'); await sleep(20);
  ok(view().querySelectorAll('.qcard').length === 5, '퀴즈 5문');
  click('[data-act="set-quiz"][data-i="0"][data-k="0"]'); await sleep(20);  // 오답
  click('[data-act="set-quiz"][data-i="1"][data-k="1"]'); await sleep(20);  // 정답
  ok(view().querySelectorAll('.opt.wrong').length === 1 && view().querySelectorAll('.opt.right').length === 2, '퀴즈 채점 표시');
  ok(Object.keys(S().wrong).some(k => k.startsWith('Q:2026-10-19:0')), '틀린 퀴즈가 오답 노트로');
  click('[data-act="set-tab"][data-t="essay"]'); await sleep(20);
  ok(/제방 누수/.test(txt()) && !/침윤선/.test(txt()), '논술: 목차는 숨김');
  click('[data-act="set-eo"]'); await sleep(20);
  ok(/침윤선/.test(txt()), '논술 목차 힌트 열림');
  click('[data-act="set-tab"][data-t="tasks"]'); await sleep(20);
  ok(view().querySelectorAll('[data-act="set-task"]').length === 3 && /확인이 필요한 부분/.test(txt()), '과제 3개 + 확인 필요');

  // 카드로 넘겨 보기 세션
  await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
  click('[data-act="set-flash"]'); await sleep(40);
  ok(view().querySelector('.fc'), '세트 카드 세션 시작');
  click('[data-act="sess-flip"]'); await sleep(20);
  click('[data-act="sess-grade"][data-g="0"]'); await sleep(20);
  ok(Object.keys(S().wrong).some(k => k.startsWith('C:')), '모름 → 오답 노트(카드)');

  // 복습 탭
  await go('#review');
  ok(/오답 노트/.test(txt()) && /2개/.test(view().querySelector('.sec .meta') ? txt() : ''), '복습 탭 오답 노트');
  click('[data-act="start-wrong"]'); await sleep(40);
  ok(view().querySelector('.prog'), '오답 다시 풀기 세션');
  // 세트 다시 보기: 처음 연 날을 3일 전으로 돌려 놓고 확인
  S().sp['2026-10-19'].first = '2026-10-15'; pe.render();
  await go('#review');
  ok(/일 차/.test(txt()), '세트 다시 보기 대상 표시');

  // 수치 빈칸
  await go('#test');
  click('[data-act="start-cloze"]'); await sleep(40);
  ok(view().querySelector('.cloze'), '수치 빈칸 문제');
  click('[data-act="sess-flip"]'); await sleep(20);
  ok(view().querySelector('.hl b'), '빈칸 정답 표시');

  // 4지선다·목차
  await go('#test'); click('[data-act="start-mcq"]'); await sleep(40);
  ok(view().querySelectorAll('.opt').length === 4, '4지선다 보기 4개');
  await go('#test'); click('[data-act="start-outline"]'); await sleep(40);
  ok(/모범 목차 보기/.test(txt()), '논술 목차 세션');

  // 기출
  await go('#kichul');
  ok(/제141회/.test(txt()) && /제116회/.test(txt()), '회차 목록 116~141');
  await go('#kichul/r/140');
  ok(view().querySelectorAll('.paper-q').length === 31, '제140회 31문항');
  click('.paper-q[data-id="140-1-05"]'); await sleep(20);
  ok(/수제/.test(d.querySelector('#modal-wrap').textContent), '기출 문항 → 연결 카드 모달');
  await go('#kichul/u');
  ok(view().querySelectorAll('.unitbar').length === 16, '단원별 출제 비중 16단원');

  // 모의고사
  await go('#mock/2026-10-24');
  ok(view().querySelectorAll('.paper-q').length === 13, '모의 1교시 13문');
  click('[data-act="mock-reveal"]'); await sleep(20);
  ok(/정의, 원리, 유의사항/.test(txt()), '모의 키워드 열기');

  // 앱 모의고사 생성
  await go('#test'); click('[data-act="gen-mock"]'); await sleep(40);
  ok(/앱 모의고사/.test(txt()), '앱 모의고사 생성');

  // 시험 일정
  {
    const P = pe.PLAN();
    ok(P.start === '2026-10-19' && P.target.r === 142 && P.target.d === '2027-05-15' && P.E === 29, `기본 일정: 제${P.target.r}회 ${P.target.d}, ${P.E}주`);
    ok(P.mock && P.mock.r === 141 && P.mock.d === '2027-01-30' && P.M === 14, `실전 모의: 제${P.mock && P.mock.r}회 ${P.mock && P.mock.d}, ${P.M}주차`);
    const rl = pe.roundList({});
    const want = { 138: '2026-02-07', 139: '2026-05-16', 140: '2026-08-22', 141: '2027-01-30', 142: '2027-05-15', 143: '2027-08-28', 144: '2028-02-05', 145: '2028-05-20', 146: '2028-08-26' };
    const bad = Object.entries(want).filter(([r, d]) => (rl.find(x => x.r === Number(r)) || {}).d !== d);
    ok(bad.length === 0, '정기시험 날짜 규칙 ' + JSON.stringify(bad));
    // 주차 지도: 시작일을 바꿔 가며 모든 주차가 채워지고 1회독 단원 16개가 빠지지 않는지
    let mapErr = [];
    for (let k = 0; k < 400; k += 3) {
      const st = new Date(2026, 9, 1); st.setDate(st.getDate() + k);
      const ds = st.getFullYear() + '-' + String(st.getMonth() + 1).padStart(2, '0') + '-' + String(st.getDate()).padStart(2, '0');
      const Q = pe.computePlan(ds, 'auto');
      const months = (new Date(Q.target.d) - new Date(ds)) / 864e5 / 30.44;
      if (months < 5.9) mapErr.push(ds + ' 기간 ' + months.toFixed(1));
      for (let a = 0; a <= Q.E; a++) if (!Q.map[a]) mapErr.push(ds + ' 빈 주차 ' + a);
      const us = new Set(); Q.map.forEach(m => (m.ts || [m.t]).forEach(t => (w.PE_WEEKS.find(x => x.w === t).u || []).forEach(u => us.add(u))));
      if (us.size !== 16) mapErr.push(ds + ' 단원 ' + us.size);
      if (Q.map[Q.E].t !== 29 || Q.map[0].t !== 0) mapErr.push(ds + ' 처음·끝');
    }
    ok(mapErr.length === 0, '시작일 134가지 주차 지도 ' + mapErr.slice(0, 4).join(' | '));
  }
  await go('#more');
  ok(/준비 시작일·목표 회차/.test(txt()) && /제142회 2027-05-15\(예상\), 29주/.test(txt()), '더보기 시험 일정 줄');
  await go('#schedule');
  ok(d.querySelector('#schStart') && d.querySelector('#schStart').value === '2026-10-19', '시작일 입력');
  ok(d.querySelectorAll('#schTarget option').length >= 4, '목표 회차 선택지 ' + d.querySelectorAll('#schTarget option').length);
  ok(/29주, 약 6\.7개월/.test(txt()) && /제141회 1\/30\(예상\), 14주차/.test(txt()), '지금 일정 요약');
  ok(/설 연휴/.test(txt()), '141회 설 연휴 메모');
  ok(/아직 확인하지 못했어요/.test(txt()), '저장소 일정 없음 → 확인 전');
  // 시작일 변경 → 미리보기 → 저장
  const se = d.querySelector('#schStart'); se.value = '2026-12-01'; se.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
  ok(/바꾸면 이렇게 돼요/.test(txt()) && /제143회 필기/.test(txt()) && d.querySelector('[data-act="sch-save"]'), '미리보기: 12/1 시작 → 제143회');
  ok(pe.S().settings.start === '2026-10-19', '저장 전엔 그대로');
  click('[data-act="sch-save"]'); await sleep(20);
  ok(pe.S().settings.start === '2026-12-01' && pe.PLAN().target.r === 143 && pe.S().settings.exam === '2027-08-28', '저장 → 제143회 2027-08-28');
  ok(pe.PLAN().mock && pe.PLAN().mock.r === 142, '실전 모의 제142회');
  // 목표 회차 직접 고르기
  const tg = d.querySelector('#schTarget'); tg.value = '144'; tg.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
  click('[data-act="sch-save"]'); await sleep(20);
  ok(pe.PLAN().target.r === 144 && pe.S().settings.target === 144, '목표 제144회 선택');
  // 시작일을 늦춰 144회가 6개월 안이 되면 자동으로 돌아감
  const se2 = d.querySelector('#schStart'); se2.value = '2027-09-01'; se2.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
  ok(d.querySelector('#schTarget').value === 'auto', '자격 없는 목표 → 자동');
  click('[data-act="sch-cancel"]'); await sleep(20);
  ok(pe.PLAN().target.r === 144, '취소하면 그대로');
  // 회차 날짜 직접 입력
  d.querySelector('#schRound').value = '144'; d.querySelector('#schRoundDate').value = '2028-02-12';
  click('[data-act="sch-round-set"]'); await sleep(20);
  ok(pe.PLAN().target.d === '2028-02-12' && /직접 입력/.test(txt()), '회차 날짜 직접 입력');
  d.querySelector('#schRound').value = '144'; click('[data-act="sch-round-reset"]'); await sleep(20);
  ok(pe.PLAN().target.d === '2028-02-05', '예상일로 되돌리기');
  for (const h of ['#plan', '#today', '#settings', '#prompts']) { await go(h); ok(!/화면을 그리는 중 오류/.test(txt()) && !/\{본시험\}|\{모의\}/.test(txt()), '일정 바꾼 뒤 화면 ' + h); }
  await go('#plan'); ok(/제144회 필기/.test(txt()) && /\d+주 로드맵/.test(txt()), '로드맵이 새 일정');
  // 저장소 일정 비교
  pe.SETS().plan = { start: '2026-10-19', target: 142, exam: '2027-05-15', mock: 141, mockDate: '2027-01-30' };
  await go('#schedule');
  ok(/예약 작업은 아직 이전 일정이에요/.test(txt()) && d.querySelector('[data-act="sch-copy"]'), '저장소와 다르면 경고 + 복사 버튼');
  await go('#more'); ok(/예약 작업 일정과 달라요/.test(txt()), '더보기에도 경고');
  // 원래대로
  await go('#schedule');
  const se3 = d.querySelector('#schStart'); se3.value = '2026-10-19'; se3.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
  const tg3 = d.querySelector('#schTarget'); tg3.value = 'auto'; tg3.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(20);
  click('[data-act="sch-save"]'); await sleep(20);
  ok(pe.PLAN().target.r === 142 && /예약 작업도 같은 일정이에요/.test(txt()), '원래 일정 → 저장소와 같음');

  // 설정: 글자 크기·테마
  await go('#settings');
  click('[data-act="fs"][data-v="xl"]'); await sleep(20);
  ok(d.documentElement.getAttribute('data-fs') === 'xl', '글자 크기 아주 크게');
  click('[data-act="theme"][data-v="dark"]'); await sleep(20);
  ok(d.documentElement.getAttribute('data-theme') === 'dark', '어둡게');
  click('[data-act="fs"][data-v="m"]'); click('[data-act="theme"][data-v="auto"]');

  // 출처·통계·로드맵
  for (const h of ['#about', '#stats', '#plan', '#prompts', '#imp', '#backup', '#timer', '#archive', '#wrong', '#more', '#study', '#schedule', '#guide']) {
    await go(h);
    ok(!/화면을 그리는 중 오류/.test(txt()) && txt().length > 50, '화면 ' + h);
  }
  await go('#about');
  ok(/기출 26회분/.test(txt()) || /기출 \d+회분/.test(txt()), '출처 화면 회차 수: ' + (txt().match(/기출 \d+회분 \d+문항/) || [''])[0]);
  await go('#study'); click('[data-act="start-study"]'); await sleep(40);
  ok(view().querySelector('.fc'), '오늘 학습 세션');

  // 용어 빈칸 쓰기(하·중·상, 직접 입력)
  {
    const want = { '하': [1, 1], '중': [2, 3], '상': [4, 6] }; const bad = [];
    for (const c of pe.deck()) for (const lv of ['하', '중', '상']) {
      const b = pe.fillBlanks(c, lv); const t = b.map(x => c.d.substr(x.i, x.len));
      if (b.length < want[lv][0] || b.length > want[lv][1]) bad.push(c.id + lv + ' 개수 ' + b.length);
      b.forEach((x, k) => { if (k && x.i < b[k - 1].i + b[k - 1].len) bad.push(c.id + ' 겹침'); });
      t.forEach(w2 => { if (!w2.trim() || c.d.indexOf(w2) !== c.d.lastIndexOf(w2) || c.t.includes(w2)) bad.push(c.id + ' 답이 보임 ' + w2); });
    }
    ok(bad.length === 0, `카드 ${pe.deck().length}장 × 하·중·상 빈칸 개수·겹침·답 노출 ` + bad.slice(0, 3).join(' | '));
    const J = pe.fillJudge;
    ok(J('평균운반거리', '평균 운반거리').ok && J('0.75mpa', '0.75MPa').ok && !J('075MPa', '0.75MPa').ok && J('스펀지형상', '스펀지 현상').typo && !J('90', '90%').ok && J('m2', '㎡').ok && !J('', '함수비').ok, '채점: 띄어쓰기·대소문자 무시, 수치·단위는 정확히, 오타 1자 허용');
  }
  await go('#test'); click('[data-act="start-fill"]'); await sleep(20);
  ok(d.querySelectorAll('#modal-wrap [data-act="fill-lv"]').length === 4, '빈칸 쓰기: 난이도 고르기(하·중·상·섞어서)');
  click('#modal-wrap [data-act="fill-lv"][data-v="중"]'); await sleep(40);
  {
    const ses = pe.SES(), it = ses.items[0], c = pe.deck().find(x => x.id === it.id);
    const ins = view().querySelectorAll('input.fill-in');
    ok(ses.items.length === 10 && it.type === 'fill' && ins.length === it.b.length && ins.length >= 2 && ins.length <= 3, `중: 빈칸 ${ins.length}개, 10문`);
    ok(d.activeElement === ins[0], '첫 빈칸에 바로 커서');
    ins[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    ok(d.activeElement === ins[1], '자판 다음 키 → 다음 빈칸');
    it.b.forEach((x, k) => { ins[k].value = c.d.substr(x.i, x.len).replace(/\s/g, ''); });
    click('[data-act="fill-check"]'); await sleep(20);
    ok(view().querySelector('.ex.ok') && view().querySelectorAll('.fill-ok').length === it.b.length && !view().querySelector('input.fill-in'), '맞게 쓰면 정답');
    click('[data-act="sess-next"]'); await sleep(20);
    const it2 = pe.SES().items[1];
    click('[data-act="fill-giveup"]'); await sleep(20);
    ok(view().querySelector('.ex.no') && pe.S().wrong['F:' + it2.id] && pe.S().wrong['F:' + it2.id].type === 'fill', '모르겠어요 → 정답 표시 + 오답 노트');
    click('[data-act="fill-accept"]'); await sleep(20);
    ok(!pe.S().wrong['F:' + it2.id] && /맞은 걸로 바꿨어요/.test(txt()), '맞은 걸로 하기 → 오답 노트에서 뺌');
    click('[data-act="sess-next"]'); await sleep(20);
    const it3 = pe.SES().items[2];
    view().querySelectorAll('input.fill-in').forEach(x => { x.value = '아무말'; });
    click('[data-act="fill-check"]'); await sleep(20);
    ok(view().querySelector('.fill-no s') && pe.S().wrong['F:' + it3.id], '틀리게 쓰면 내 답에 줄 긋고 정답');
    await go('#review'); ok(/빈칸 1/.test(txt()), '복습 탭 오답 노트에 빈칸 1');
    await go('#wrong'); ok(/빈칸 쓰기/.test(txt()), '오답 목록에 빈칸 쓰기');
    await go('#review'); click('[data-act="start-wrong"]'); await sleep(40);
    ok(pe.SES().items.some(x => x.type === 'fill' && x.wrongKey === 'F:' + it3.id), '오답 다시 풀기에 빈칸 문제');
    await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
    click('[data-act="start-fill"][data-d="2026-10-19"]'); await sleep(20);
    click('#modal-wrap [data-act="fill-lv"][data-v="상"]'); await sleep(40);
    const sset = pe.SES();
    ok(/2026-10-19|10월 19일/.test(sset.title) && sset.items.every(x => x.type === 'fill' && x.lv === '상' && x.b.length >= 4), '세트 용어로 빈칸 쓰기(상)');
    pe.S().wrong = {}; await go('#today');
  }


  await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="essay"]'); await sleep(20);
  ok(view().querySelector('[data-act="go"][data-h="guide"]'), '세트 논술 탭 → 답안 작성 요령 링크');
  await go('#guide');
  ok(/논술 답안 작성 요령/.test(txt()) && /번호 체계/.test(txt()) && /이하 여백/.test(txt()) && view().querySelectorAll('.asheet').length === 2, '작성 요령: 쓰는 법');
  click('[data-act="guide-tab"][data-t="ex"]'); await sleep(20);
  const pg = [...view().querySelectorAll('.asheet')];
  ok(pg.length === 4 && pg.every(p => { const l = p.querySelectorAll('.ar .ln'); return l.length && l[l.length - 1].textContent.endsWith('22'); }), '모범 답안 4면, 면마다 22줄');
  ok(/Ⅴ\. 결론/.test(txt()) && /〈그림 1〉 시공이음 위치 선정/.test(txt()) && /〈그림 2〉 시공이음부 처리 상세/.test(txt()) && view().querySelectorAll('.afig svg').length === 4 && view().querySelectorAll('table.at tr').length === 5, '모범 답안: 대제목·그림 2개·비교표');
  ok(view().querySelectorAll('.asheet u').length >= 15 && /끝/.test(pg[3].querySelector('.lR').textContent), '모범 답안: 밑줄·끝');
  click('[data-act="guide-tab"][data-t="chk"]'); await sleep(20);
  ok(view().querySelectorAll('.check input').length === w.PE_GUIDE.check.length, '형식 점검표 ' + w.PE_GUIDE.check.length + '항목');
  await go('#prompts');
  ok(/\[답안 형식 점검표/.test(txt()) && /\[모범 답안 뼈대/.test(txt()) && !/\{답안형식\}/.test(txt()), '프롬프트에 형식 점검표가 채워짐');
  await go('#test'); ok(view().querySelector('[data-h="guide"]'), '테스트 탭 → 답안 작성 요령');
  await go('#more'); ok(view().querySelector('[data-h="guide"]'), '더보기 → 답안 작성 요령');

  ok(errors.length === 0, '콘솔 오류 없음 ' + errors.slice(0, 3).join(' | '));
  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
