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
      const m = String(url).match(/gisulsa-data\/main\/((?:data|app\/gloss)\/[^?]+)/);
      const f = m && path.join(FAKE, m[1]);
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
  // 숙제: 세트 내용과 학습 단계로 앱이 정한다(몇 번, 어떻게)
  const hws = () => [...view().querySelectorAll('.hw')], hwOf = k => view().querySelector(`.hw [data-k="${k}"]`) && view().querySelector(`.hw [data-k="${k}"]`).closest('.hw');
  const hp = () => (S().sp['2026-10-19'].hw || {});
  ok(/확인이 필요한 부분/.test(txt()) && /오늘 숙제/.test(txt()) && /준비 주/.test(txt()) && /이렇게 외워요/.test(txt()), '숙제 탭: 단계 설명·원칙·확인 필요');
  ok(/새 용어 4개: 안 보고 쓰기 2번, 소리 내어 말하기 4번/.test(txt()) && view().querySelectorAll('.hw [data-k="w0"]').length === 2 && view().querySelectorAll('.hw [data-k="s0"]').length === 4, '새 용어: 낱말마다 쓰기 2·말하기 4 동그라미');
  ok(/복습 용어 6개: 제목만 보고 키워드 백지 복원/.test(txt()) && /논술 목차 옮겨 적기 4번/.test(txt()) && view().querySelectorAll('.hw [data-k="eo"]').length === 4 && /그림·표 그리기 3번/.test(txt()) && /논술 실전 쓰기 25분/.test(txt()), '복습 용어·논술 목차 4번·실전 쓰기·그림 3번');
  ok(/퀴즈를 다 풀면 틀린 문제가 여기/.test(txt()) && /앞글자로 외우기/.test(txt()) && /자기 전 5분/.test(txt()), '퀴즈 오답(다 풀기 전)·앞글자·자기 전 떠올리기');
  ok(!/새 용어 4개를 소리 내어 30초씩/.test(txt()) && hws().length === 8, '예약 작업의 공통 과제는 숙제가 대신함(세트만의 과제만 남김)');
  ok(view().querySelectorAll('.hw .how').length === hws().length && /빨간 펜/.test(hwOf('w0').querySelector('.how').textContent), '항목마다 요령');
  const tabLabel = () => view().querySelector('[data-act="set-tab"][data-t="tasks"]').textContent;
  ok(/숙제 0\/8/.test(tabLabel()), '탭에 숙제 수');
  click('[data-act="hw"][data-k="w0"][data-v="2"]'); await sleep(10);
  ok(hp().w0 === 2 && view().querySelectorAll('.hw [data-k="w0"].on').length === 2, '두 번째 동그라미를 누르면 2번 한 것으로');
  click('[data-act="hw"][data-k="w0"][data-v="2"]'); await sleep(10);
  ok(hp().w0 === 1, '같은 동그라미를 다시 누르면 하나 뺌');
  for (let i = 0; i < 4; i++) { click(`[data-act="hw"][data-k="w${i}"][data-v="2"]`); await sleep(5); click(`[data-act="hw"][data-k="s${i}"][data-v="4"]`); await sleep(5); }
  ok(hwOf('w0').classList.contains('done') && /숙제 1\/8/.test(tabLabel()), '새 용어를 다 하면 그 숙제 끝');
  click('[data-act="hw"][data-k="eo"][data-v="4"]'); await sleep(10);
  click('[data-act="hw-ew"]'); await sleep(10);
  ok(S().sp['2026-10-19'].essay.done && hwOf('eo').classList.contains('done') && /숙제 3\/8/.test(tabLabel()), '목차 4번, 실전 쓰기(논술 탭 손글씨와 같은 기록)');
  view().querySelector('#hwMn').value = '침윤선 누수 파이핑 → 침누파'; click('[data-act="hw-mn"]'); await sleep(10);
  ok(hp().mn === '침윤선 누수 파이핑 → 침누파' && view().querySelector('#hwMn').value === hp().mn && /숙제 4\/8/.test(tabLabel()), '앞글자 외우기를 적어 둠');
  click('[data-act="hw-ew"]'); await sleep(10);
  ok(!S().sp['2026-10-19'].essay.done && /숙제 3\/8/.test(tabLabel()), '실전 쓰기를 다시 누르면 취소');
  click('[data-act="set-tab"][data-t="essay"]'); await sleep(20); click('[data-act="set-essay-done"]'); await sleep(20); click('[data-act="set-tab"][data-t="tasks"]'); await sleep(20);
  ok(/숙제 4\/8/.test(tabLabel()), '논술 탭에서 손글씨 체크해도 숙제에 반영');
  click('[data-act="hw-ew"]'); await sleep(10);
  ok(!S().sp['2026-10-19'].essay.done && /숙제 3\/8/.test(tabLabel()), '(되돌림) 실전 쓰기 취소');

  // 카드로 넘겨 보기 세션
  await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
  const rd = () => Object.keys((S().sp['2026-10-19'] || {}).read || {}).map(Number).sort((x, y) => x - y).join();
  const read0 = rd();
  click('[data-act="set-flash"]'); await sleep(40);
  ok(view().querySelector('.fc'), '세트 카드 세션 시작');
  ok(rd() === read0, '넘겨 보기를 시작만 해서는 읽음으로 치지 않음');
  const it0 = pe.SES().items[0];
  ok(view().querySelector('[data-act="sess-prev"]').disabled && view().querySelector('[data-act="sess-skip"]'), '첫 카드: 이전 꺼짐, 다음 있음');
  click('[data-act="sess-skip"]'); await sleep(20);
  ok(pe.SES().i === 1 && rd() === read0, '다음: 뒷면을 안 본 카드는 읽음 아님');
  click('[data-act="sess-prev"]'); await sleep(20);
  ok(pe.SES().i === 0 && !pe.SES().back, '이전: 첫 카드 앞면으로');
  click('[data-act="sess-flip"]'); await sleep(20);
  ok(rd().split(',').includes(String(it0.si)) && rd().split(',').filter(Boolean).length === read0.split(',').filter(Boolean).length + (read0.split(',').includes(String(it0.si)) ? 0 : 1), '뒷면을 본 카드만 읽음');
  click('[data-act="sess-grade"][data-g="0"]'); await sleep(20);
  ok(Object.keys(S().wrong).some(k => k.startsWith('C:')), '모름 → 오답 노트(카드)');
  // 이전으로 돌아와 다시 고르기: 처음 고르기 전 상태로 되돌린 뒤 다시 매김
  click('[data-act="sess-prev"]'); await sleep(20);
  ok(pe.SES().i === 0 && pe.SES().back && view().querySelector('.grade3 .g0.on') && /다시 고르면 바꿔요/.test(txt()), '이전으로 오면 뒷면과 고른 것 표시');
  click('[data-act="sess-grade"][data-g="2"]'); await sleep(20);
  ok(pe.SES().stats.no === 0 && pe.SES().stats.ok === 1 && !S().wrong['C:' + it0.id] && S().cards[it0.id].box >= 1, '다시 고르면 바뀜: 모름 → 앎(오답 노트에서 빠지고 점수도 바뀜)');
  click('[data-act="sess-prev"]'); await sleep(20);
  click('[data-act="sess-grade"][data-g="0"]'); await sleep(20);
  ok(pe.SES().stats.no === 1 && pe.SES().stats.ok === 0 && S().wrong['C:' + it0.id] && S().cards[it0.id].box === 0 && S().wrong['C:' + it0.id].n === 1, '한 번 더 바꿔도 두 번 세지 않음(오답 1회)');
  // 카드를 옆으로 밀어 넘기기
  const swipe = async dx => { const fc = view().querySelector('.fc'); const a = new w.Event('touchstart', { bubbles: true }); a.touches = [{ clientX: 200, clientY: 300 }]; fc.dispatchEvent(a); const b = new w.Event('touchend', { bubbles: true }); b.changedTouches = [{ clientX: 200 + dx, clientY: 305 }]; fc.dispatchEvent(b); await sleep(20); };
  const i1 = pe.SES().i; await swipe(-120);
  ok(pe.SES().i === i1 + 1, '왼쪽으로 밀면 다음 카드');
  await swipe(120);
  ok(pe.SES().i === i1, '오른쪽으로 밀면 이전 카드');
  ok(view().querySelector('.topbar [data-act="back"]'), '세션 위쪽 뒤로 버튼');
  await go('#set/2026-10-19');
  ok(rd().split(',').includes(String(it0.si)) && rd().split(',').filter(Boolean).length <= read0.split(',').filter(Boolean).length + 1, '중간에 나가도 본 카드만 읽음(나머지는 그대로)');
  // 이어 하기: 나갔다 다시 들어오면 보던 카드부터
  const si = pe.SES().i, nC = pe.SETS().sets['2026-10-19'].cards.length;
  ok(si > 0 && new RegExp('카드 넘겨 보기 이어서 \\(' + (si + 1) + '/' + nC + '\\)').test(txt()) && view().querySelector('[data-act="resume-clear"]'), '세트 화면: 카드 넘겨 보기 이어서 (n/N), 처음부터 버튼');
  const ses0 = pe.SES(); click('[data-act="set-flash"]'); await sleep(30);
  ok(w.location.hash === '#sess' && pe.SES() === ses0 && pe.SES().i === si, '넘겨 보기: 다시 누르면 보던 카드부터(매긴 기록도 그대로)');
  await go('#set/2026-10-19'); click('[data-act="resume-clear"]'); await sleep(20);
  ok(!pe.SES() && !S().resume['flash:2026-10-19'] && /카드로 넘겨 보며 외우기/.test(txt()) && !view().querySelector('[data-act="resume-clear"]'), '처음부터: 이어 하기 지움');
  S().resume['flash:2026-10-19'] = { i: 2, n: nC, day: '2020-01-01' }; await go('#today'); await go('#set/2026-10-19');
  click('[data-act="set-flash"]'); await sleep(30);
  ok(pe.SES().i === 2 && /3번째 카드부터 이어서/.test(w.document.querySelector('#toast').textContent), '앱을 껐다 켜도(저장된 자리) 보던 카드부터');
  click('[data-act="sess-skip"]'); await sleep(20);
  ok(S().resume['flash:2026-10-19'].i === 3, '넘길 때마다 자리 저장');
  await go('#set/2026-10-19'); click('[data-act="resume-clear"]'); await sleep(20);

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

  // 가리며 외우기: 보기 → 가림을 정한 시간마다 반복(시계는 검사에서 직접 돌린다)
  {
    let T = 2e12; const realNow = w.Date.now; w.Date.now = () => T;
    const tick = ms => { T += ms; pe.memoTick(); };
    const box = () => view().querySelector('#memoBox'), clock = () => view().querySelector('#memoClock').textContent;
    S().settings.memo = { show: 10, hide: 5, mode: 'all', reps: 2, auto: 1 };
    await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
    const rdm = () => (S().sp['2026-10-19'] || {}).read || {};
    click('[data-act="memo-set"]'); await sleep(30);
    const M = pe.MEMO;
    ok(M() && w.location.hash === '#memo' && box().querySelector('.mterm'), '세트 용어 탭 → 가리며 외우기');
    ok(rdm()[M().items[0].si] && !rdm()[M().items[M().items.length - 1].si] || M().items.length === 1, '보여 준 카드만 읽음');
    const nl = box().querySelectorAll('.ml').length;
    ok(nl >= 3 && box().querySelectorAll('.ml.hd').length === nl - 1 && !box().querySelector('.mterm.hd'), '전체: 용어만 남기고 모든 줄을 가릴 줄로');
    ok(!box().classList.contains('hiding') && /보기/.test(clock()) && /1 \/ 2회/.test(clock()), '시작 전: 보기, 1/2회');
    click('[data-act="memo-play"]'); await sleep(10);
    ok(M().run && view().querySelector('#memoPlay').textContent === '일시정지', '시작 → 일시정지 버튼');
    tick(9000);
    ok(!box().classList.contains('hiding') && /보기 1초/.test(clock()), '보이는 시간 안에는 그대로(남은 1초)');
    tick(1100);
    ok(box().classList.contains('hiding') && /가림/.test(clock()), '10초 뒤 가림');
    tick(5100);
    ok(!box().classList.contains('hiding') && /2 \/ 2회/.test(clock()), '가림 5초 뒤 다시 보기, 2/2회');
    const i0 = M().i; tick(10100); tick(5100);
    ok(M().i === i0 + 1 && M().cnt === 0 && M().run && rdm()[M().items[i0 + 1].si], '정한 횟수를 다 돌면 다음 카드로(그 카드도 읽음)');
    // 고른 줄만 가리기
    click('#memoBox .ml[data-li="d0"]'); await sleep(10);
    ok(pe.S().settings.memo.mode === 'pick' && box().querySelectorAll('.ml.hd').length === 1 && box().querySelector('.ml[data-li="d0"].hd.pk'), '줄을 탭하면 그 줄만 가리기로');
    click('#memoBox .ml[data-li="k0"]'); await sleep(10);
    ok(box().querySelectorAll('.ml.hd').length === 2 && JSON.stringify(S().memoPick[M().items[M().i].id]) === '["d0","k0"]', '여러 줄 고르기(카드마다 기억)');
    click('#memoBox .ml[data-li="k0"]'); await sleep(10);
    ok(box().querySelectorAll('.ml.hd').length === 1, '다시 탭하면 빼기');
    // 무한 반복
    click('[data-act="memo-cfg"][data-k="reps"][data-v="0"]'); await sleep(10);
    const i1 = M().i; for (let k = 0; k < 6; k++) { tick(10100); tick(5100); }
    ok(M().i === i1 && M().cnt === 6 && /7회째, 무한 반복/.test(clock()) && view().querySelector('#memoCfg').open, '무한: 다음 카드로 넘어가지 않고 계속(설정 칸은 열린 채)');
    // 일시정지·계속
    tick(4000); click('[data-act="memo-play"]'); await sleep(10);
    const leftAt = M().left; tick(60000);
    ok(!M().run && leftAt > 5000 && leftAt < 7000 && M().phase === 'show' && view().querySelector('#memoPlay').textContent === '계속', '일시정지하면 시간이 멈춤');
    click('[data-act="memo-play"]'); await sleep(10); tick(leftAt - 200);
    ok(M().phase === 'show', '계속: 남은 시간부터'); tick(400);
    ok(M().phase === 'hide', '남은 시간이 지나면 가림');
    // 한 번 하고 멈춤
    click('[data-act="memo-cfg"][data-k="reps"][data-v="1"]'); click('[data-act="memo-cfg"][data-k="auto"][data-v="0"]'); await sleep(10);
    tick(5100); 
    ok(!M().run && M().done && /다 했어요/.test(clock()) && view().querySelector('#memoPlay').textContent === '다시 하기' && !box().classList.contains('hiding'), '다 하면 멈춤(멈춤 설정)');
    // 이전·다음
    const i2 = M().i; click('[data-act="memo-next"]'); await sleep(10);
    ok(M().i === i2 + 1 && !M().done, '다음 카드'); click('[data-act="memo-prev"]'); await sleep(10);
    ok(M().i === i2, '이전 카드');
    click('[data-act="memo-play"]'); await sleep(10);
    await go('#study');
    ok(!M().run, '다른 화면으로 가면 멈춤');
    ok(/가리며 외우기 \(\d+장/.test(txt()), '암기 탭에 가리며 외우기');
    click('[data-act="memo-study"]'); await sleep(30);
    ok(M().items.length >= 1 && M().items.length <= 20 && !M().setD, '암기 탭 → 범위 카드로 가리며 외우기');
    // 이어 하기: 세트 가리며 외우기는 저장된 자리부터(메모리의 암기 탭 외우기와 따로)
    await go('#set/2026-10-19');
    const rs = S().resume['memo:set:2026-10-19'];
    ok(rs && rs.i > 0 && new RegExp('가리며 외우기 이어서 \\(' + (rs.i + 1) + '/').test(txt()), '세트 화면: 가리며 외우기 이어서 (n/N)');
    click('[data-act="memo-set"]'); await sleep(30);
    ok(M().key === 'memo:set:2026-10-19' && M().i === rs.i, '다시 들어오면 보던 카드부터(앱을 껐다 켜도)');
    while (M().i > 0) { click('[data-act="memo-prev"]'); await sleep(5); }
    click('[data-act="memo-next"]'); await sleep(10);
    const m0 = M(); await go('#set/2026-10-19'); click('[data-act="memo-set"]'); await sleep(20);
    ok(M() === m0 && M().i === 1 && S().resume['memo:set:2026-10-19'].i === 1, '뒤로 갔다 다시 누르면 그 자리 그대로');
    click('[data-act="memo-prev"]'); await sleep(10);
    // 무작위 N줄: 가릴 때마다 용어를 뺀 줄에서 N줄을 새로(바로 전에 가린 줄은 피함)
    click('[data-act="memo-cfg"][data-k="reps"][data-v="0"]'); click('[data-act="memo-cfg"][data-k="mode"][data-v="rand"]'); await sleep(10);
    ok(view().querySelector('[data-act="memo-cfg"][data-k="n"][data-v="2"].on') && /무작위 2줄/.test(txt()) && /2줄을 무작위로/.test(txt()), '가릴 것: 무작위(기본 2줄), 줄 수 고르기');
    click('[data-act="memo-cfg"][data-k="n"][data-v="3"]'); await sleep(10);
    const nh = box().querySelectorAll('.ml').length - 1, hd = () => [...box().querySelectorAll('.ml.hd')].map(e => e.dataset.li);
    click('[data-act="memo-play"]'); await sleep(10); tick(10100);
    const h1 = hd();
    ok(nh >= 6 && box().classList.contains('hiding') && h1.length === 3 && !h1.includes('t'), '무작위: 가릴 때 3줄(용어는 안 가림)');
    tick(5100); ok(!box().classList.contains('hiding'), '보기로 돌아옴'); tick(10100);
    const h2 = hd();
    ok(h2.length === 3 && h2.every(x => !h1.includes(x)), '다음 가림: 새로 고른 3줄(바로 전 줄은 피함)');
    tick(5100); tick(10100);
    ok(hd().length === 3 && hd().some(x => !h2.includes(x)), '반복마다 바뀜');
    click('[data-act="memo-play"]'); await sleep(10);
    click('#memoBox .ml[data-li="d1"]'); await sleep(10);
    ok(pe.S().settings.memo.mode === 'pick' && hd().join() === 'd1', '무작위 중 줄을 탭하면 고른 줄 가리기로');
    click('#memoBox .ml[data-li="d1"]'); await sleep(10);
    // 테이프: 손가락으로 그은 곳만 마스킹 테이프로 가린다(여러 줄도)
    click('[data-act="memo-tape-on"]'); await sleep(10);
    ok(S().settings.memo.mode === 'tape' && M().edit && box().classList.contains('editing') && /가릴 곳을 한 손가락으로 그으세요/.test(txt()), '테이프로 가리기: 붙이기 켜짐');
    const cid = M().items[M().i].id, mlEl = li => box().querySelector(`.ml[data-li="${li}"]`);
    const at = (li, k) => { const tw = w.document.createTreeWalker(mlEl(li), 4); let n; while ((n = tw.nextNode())) { if (k <= n.data.length) return { startContainer: n, startOffset: k }; k -= n.data.length; } return null; };
    const ptr = (type, li, k, x, y, tg, pid) => { w.document.caretRangeFromPoint = () => at(li, k); const ev = new w.Event(type, { bubbles: true, cancelable: true }); ev.clientX = x; ev.clientY = y; ev.pointerId = pid || 1; (tg || (type === 'pointerdown' ? mlEl(li) : w.document)).dispatchEvent(ev); };
    const base = li => Number(mlEl(li).dataset.o), full = () => [...box().querySelectorAll('.ml')].map(e => e.textContent).join('\n');
    ok(pe.memoOff(at('d1', 2).startContainer, 2) === base('d1') + 2, '손가락 밑 글자 → 카드 글 자리');
    ptr('pointerdown', 'd0', 3, 10, 10); ptr('pointermove', 'd1', 2, 40, 40);
    ok(box().querySelector('.ml[data-li="d0"] .tsel') && box().querySelector('.ml[data-li="d1"] .tsel'), '긋는 동안 범위 표시(여러 줄)');
    ptr('pointermove', 'd1', 4, 60, 40); ptr('pointerup', 'd1', 4, 60, 40); await sleep(10);
    const t1 = S().memoTape[cid];
    ok(t1 && t1.length === 1 && t1[0][0] === base('d0') + 3 && t1[0][1] === base('d1') + 5 && t1[0][2] === full().slice(t1[0][0], t1[0][1]), '그은 범위가 테이프로(끝 글자까지, 카드마다 기억)');
    ok(mlEl('d0').querySelector('.tp') && mlEl('d1').querySelector('.tp') && !mlEl('d2').querySelector('.tp') && mlEl('d1').querySelector('.tp').textContent.length === 5, '여러 줄에 걸친 테이프');
    const k0 = mlEl('k0').textContent, kk = k0.search(/[가-힣]/);
    ptr('pointerdown', 'k0', kk + 1, 20, 300); ptr('pointerup', 'k0', kk + 1, 20, 300); await sleep(130);
    const kt = mlEl('k0').querySelector('.tp');
    ok(S().memoTape[cid].length === 2 && kt && !/\s/.test(kt.textContent) && k0.includes(kt.textContent) && pe.glStem(kt.textContent) === kt.textContent, '짧게 누르면 그 낱말(조사는 남김)');
    ptr('pointerdown', 'k1', 0, 20, 330); ptr('pointerup', 'k1', 0, 20, 330); await sleep(130);
    ok(S().memoTape[cid].length === 3 && S().memoTape[cid].some(r => r[2] && mlEl('k1').textContent.startsWith(r[2]) && !r[2].includes('\n')) && mlEl('k1').querySelector('.tp'), '줄 첫 낱말을 눌러도 앞 줄 글자는 안 붙음');
    ptr('pointerdown', 'k1', 0, 20, 330, mlEl('k1').querySelector('.tp')); ptr('pointerup', 'k1', 0, 20, 330); await sleep(130);
    ptr('pointerdown', 'k0', kk + 1, 20, 300, mlEl('k0').querySelector('.tp')); ptr('pointerup', 'k0', kk + 1, 20, 300); await sleep(130);
    ok(S().memoTape[cid].length === 1 && !mlEl('k0').querySelector('.tp') && /테이프를 뗐어요/.test(d.querySelector('#toast').textContent), '붙은 테이프를 누르면 뗌');
    // 두 손가락: 테이프를 만들지 않고, 끌면 화면이 위아래로 움직인다
    const nT = () => S().memoTape[cid].length, n0 = nT();
    ptr('pointerdown', 'k2', 1, 20, 360, null, 1); ptr('pointerdown', 'k2', 3, 60, 360, null, 2); ptr('pointerup', 'k2', 1, 20, 360, null, 1); ptr('pointerup', 'k2', 3, 60, 360, null, 2); await sleep(130);
    ok(nT() === n0 && !mlEl('k2').querySelector('.tp'), '두 손가락으로 톡: 테이프 안 붙음');
    ptr('pointerdown', 'k2', 1, 20, 360, null, 1); ptr('pointerup', 'k2', 1, 20, 360, null, 1); await sleep(20); ptr('pointerdown', 'k2', 3, 60, 360, null, 2); ptr('pointerup', 'k2', 3, 60, 360, null, 2); await sleep(130);
    ok(nT() === n0, '두 손가락이 살짝 어긋나 닿아도(90ms 안) 테이프 안 붙음');
    ptr('pointerdown', 'd0', 2, 20, 60, null, 1); ptr('pointermove', 'd0', 6, 70, 60, null, 1);
    ok(box().querySelector('.tsel'), '(한 손가락으로 긋는 중)');
    const scr = []; const rsb = w.scrollBy; w.scrollBy = (x, y) => scr.push(y);
    const tsel0 = box().querySelector('.tsel');
    ptr('pointerdown', 'd1', 2, 120, 80, null, 2);
    ok(box().classList.contains('tpoff') && box().querySelector('.tsel') === tsel0, '두 번째 손가락이 닿으면 긋던 범위를 숨김(손가락이 닿은 동안 줄을 새로 그리지 않음)');
    ptr('pointermove', 'd0', 6, 70, 20, null, 1); ptr('pointermove', 'd1', 2, 120, 40, null, 2); ptr('pointermove', 'd0', 6, 70, -30, null, 1); ptr('pointermove', 'd1', 2, 120, -10, null, 2);
    ok(scr.reduce((a, b) => a + b, 0) === 90 && scr.every(v => v > 0), '두 손가락으로 끌면 화면 스크롤(두 손가락 평균만큼)');
    ptr('pointerup', 'd0', 6, 70, -30, null, 1);
    ptr('pointermove', 'd1', 2, 120, -60, null, 2);
    ok(scr.length === 4, '한 손가락을 떼면 스크롤도 멈춤');
    ptr('pointerup', 'd1', 2, 120, -60, null, 2); await sleep(130); w.scrollBy = rsb;
    ok(!box().classList.contains('tpoff') && !box().querySelector('.tsel'), '다 떼면 줄을 다시 그림');
    ok(nT() === n0, '두 손가락 끌기 뒤에도 테이프 안 붙음');
    ptr('pointerdown', 'k2', 1, 20, 360); ptr('pointerup', 'k2', 1, 20, 360); await sleep(130);
    ok(nT() === n0 + 1 && mlEl('k2').querySelector('.tp'), '다시 한 손가락으로 누르면 테이프 붙음');
    ptr('pointerdown', 'k2', 1, 20, 360, mlEl('k2').querySelector('.tp')); ptr('pointerup', 'k2', 1, 20, 360); await sleep(130);
    click('#memoBox .ml[data-li="k1"]'); await sleep(10);
    ok(S().settings.memo.mode === 'tape' && S().memoTape[cid].length === 1, '테이프 모드에서는 줄 탭으로 모드가 바뀌지 않음');
    click('[data-act="memo-tape-edit"]'); await sleep(10);
    ok(!M().edit && !box().classList.contains('editing') && /테이프 1곳만 가려요/.test(txt()), '다 붙였어요');
    click('[data-act="memo-play"]'); await sleep(10); tick(10100);
    ok(box().classList.contains('hiding') && box().querySelectorAll('.tp').length === 2 && !box().querySelector('.ml.hd'), '가릴 때는 테이프 붙인 곳만(줄 전체는 안 가림)');
    click('[data-act="memo-tape-edit"]'); await sleep(10);
    ok(M().edit && !M().run && !box().classList.contains('hiding'), '붙이기를 켜면 멈추고 글이 보임');
    const sv = S().memoTape[cid][0], cc = pe.deck().find(c => c.id === cid); S().memoTape[cid][0] = [sv[0] + 1, sv[1] + 1, sv[2]];
    ok(JSON.stringify(pe.memoTapes(cc)) === JSON.stringify([[sv[0], sv[1]]]), '자리가 어긋나면 같은 글귀를 다시 찾음');
    S().memoTape[cid][0] = [sv[0], sv[1], '없는글귀'];
    ok(pe.memoTapes(cc).length === 0, '글귀가 없어지면 그 테이프는 버림');
    S().memoTape[cid][0] = sv;
    const rc = w.confirm; w.confirm = () => true; click('[data-act="memo-tape-clear"]'); await sleep(10); w.confirm = rc;
    ok(!S().memoTape[cid] && !box().querySelector('.tp') && !view().querySelector('[data-act="memo-tape-clear"]'), '이 카드 테이프 모두 떼기');
    click('[data-act="memo-cfg"][data-k="mode"][data-v="all"]'); await sleep(10);
    ok(!M().edit && !box().classList.contains('tape'), '다른 가릴 것으로 바꾸면 테이프 끔');
    click('[data-act="memo-play"]'); await sleep(10);
    // 끝까지 가면 완료
    while (M().i + 1 < M().items.length) { click('[data-act="memo-next"]'); await sleep(5); }
    ok(!view().querySelector('[data-act="memo-next"]') && view().querySelector('[data-act="memo-finish"]').textContent === '완료', '마지막 카드: 다음 대신 완료');
    ok(view().querySelector('.prog .bar i').style.width === '100%', '마지막 카드에서 진행 막대가 끝까지');
    click('[data-act="memo-finish"]'); await sleep(20);
    const tdy = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new w.Date());
    const cx = () => Object.values((S().cal[tdy] || {}).x || {});
    ok(M().fin && /가리며 외우기 완료/.test(txt()) && /외운 카드/.test(txt()) && !S().resume['memo:set:2026-10-19'], '완료: 끝 화면, 이어 하기 자리 지움');
    ok(cx().some(v => v[0] === 'term' && /가리며 외우기 완료: 10월 19일 세트 10장/.test(v[1])) && !cx().some(v => /가리며 외우기: 10월 19일/.test(v[1])), '달력에 완료로 남음(진행 기록은 완료로 바뀜)');
    click('[data-act="memo-close"]'); await sleep(20);
    ok(w.location.hash === '#set/2026-10-19' && !M() && /가리며 외우기\(보였다 가렸다 반복\)/.test(txt()), '돌아가기 → 세트 화면(이어 하기 없음)');
    click('[data-act="memo-set"]'); await sleep(20);
    ok(M().i === 0 && !M().fin, '완료 뒤에는 처음부터');
    click('[data-act="memo-next"]'); await sleep(10);
    await go('#set/2026-10-19'); click('[data-act="resume-clear"]'); await sleep(10);
    ok(!M() && !S().resume['memo:set:2026-10-19'], '처음부터 버튼: 가리며 외우기 자리도 지움');
    w.Date.now = realNow; S().settings.memo = { show: 10, hide: 5, mode: 'all', reps: 3, auto: 1 };
    await go('#today');
  }

  // 학습 달력: 접속한 날과 끝낸 공부(빨강 용어·파랑 논술·초록 퀴즈·주황 모의·보라 할 일)
  {
    const tdy = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new w.Date());
    ok(S().cal[tdy] && S().cal[tdy].in.length >= 1 && /^\d\d:\d\d$/.test(S().cal[tdy].in[0]), '앱을 열면 접속 시각을 적음');
    await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="essay"]'); await sleep(20);
    click('[data-act="set-essay-done"]'); await sleep(20);
    click('[data-act="set-tab"][data-t="tasks"]'); await sleep(20); click('[data-act="hw"][data-k="sl"][data-v="1"]'); await sleep(20);
    // 홈 화면 왼쪽 위 달력 아이콘: 이달·오늘 날짜와 오늘 끝낸 공부 점, 누르면 학습 달력
    await go('#today');
    const ib = view().querySelector('.ltitle .ltl > .calbtn:first-child');
    ok(ib && ib.querySelector('.cm').textContent === (new w.Date().getMonth() + 1) + '월' && ib.querySelector('b').textContent === String(new w.Date().getDate()), '홈 왼쪽 위 달력 아이콘: 이달·오늘 날짜');
    ok(['term', 'essay', 'quiz', 'todo'].every(k => ib.querySelector('.cdots .k-' + k)), '아이콘 아래 오늘 끝낸 공부 점');
    click('.calbtn'); await sleep(20);
    ok(w.location.hash === '#cal', '아이콘 → 학습 달력');
    const hero = () => view().querySelector('.calhero');
    ok(hero() && /오늘 끝낸 공부/.test(hero().textContent) && /\d+일 연속/.test(hero().textContent), '달력 맨 위: 오늘 끝낸 공부, 연속 학습');
    ok(['term', 'essay', 'quiz', 'todo'].every(k => hero().querySelector('.ch5 .on .k-' + k)) && !hero().querySelector('.ch5 .on .k-mock') && Number(hero().querySelector('.ch5 .k-term').textContent) >= 3, '종류별 개수 칸(끝낸 종류만 켜짐)');
    ok(['term', 'essay', 'quiz', 'todo'].every(k => hero().querySelector('.chg.k-' + k + '-l')), '종류별로 묶은 목록');
    const cell = () => view().querySelector('.cd.today');
    ok(cell() && cell().classList.contains('was'), '오늘 칸: 접속 표시');
    ok(['term', 'essay', 'quiz', 'todo'].every(k => cell().querySelector('.dots .k-' + k)), '오늘 칸: 용어·논술·퀴즈·할 일 동그라미');
    ok(['용어', '논술', '퀴즈·테스트', '모의고사', '할 일', '접속'].every(x => view().querySelector('.callg').textContent.includes(x)) && /접속 \d+일/.test(view().querySelector('.callg').textContent), '색 설명과 이달 날 수');
    ok(/접속 \d+번 \d\d:\d\d/.test(txt()) && /세트 논술 손글씨/.test(txt()) && /세트 퀴즈 \d+\/\d+문 풂/.test(txt()) && /카드 \d+장 매김/.test(txt()) && /가리며 외우기 완료/.test(txt()), '고른 날: 접속 시각과 끝낸 공부 목록');
    ok(/10월 19일 숙제 \d+\/8/.test(txt()) && /10월 19일 숙제\(용어\) \d+\/\d+/.test(txt()) && /10월 19일 숙제\(논술\)/.test(txt()), '숙제 → 할 일(보라)·용어·논술로 달력에');
    ok(!view().querySelector('[data-act="cal-mon"][data-v="1"]').disabled, '앞으로 올 달도 볼 수 있음');
    await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="essay"]'); await sleep(20);
    click('[data-act="set-essay-done"]'); await sleep(20);
    await go('#cal');
    ok(!/세트 논술 손글씨/.test(txt()) && /숙제\(논술\) 1\/3/.test(txt()), '논술 체크를 풀면 달력에서도 빠짐(목차 옮겨 적기 숙제는 남음)');
    // 예전 기록(카드 매김·테스트·오늘 할 일)도 보임
    const old = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new w.Date(new w.Date().getFullYear(), new w.Date().getMonth() - 1, 15));
    S().daily[old] = { newSeen: 2, graded: 7, active: true }; S().log.push({ d: old, type: 'outline', total: 5, ok: 3 });
    S().mockp.x = 1; S().cal[old] = { in: ['21:05'], x: { 'mock:2026-10-24:p1': ['mock', '10월 24일 모의고사 1교시 다 씀'] } };
    click('[data-act="cal-mon"][data-v="-1"]'); await sleep(10);
    const oc = view().querySelector(`[data-act="cal-day"][data-d="${old}"]`);
    ok(oc && ['term', 'essay', 'mock'].every(k => oc.querySelector('.k-' + k)) && !view().querySelector('[data-act="cal-mon"][data-v="1"]').disabled, '지난달로: 예전 기록 동그라미');
    click(`[data-act="cal-day"][data-d="${old}"]`); await sleep(10);
    const mt = () => d.querySelector('#modal-wrap').textContent;
    ok(view().querySelector(`.cd.sel[data-d="${old}"]`) && /그날 끝낸 공부/.test(mt()) && /카드 7장 매김\(처음 본 카드 2장\)/.test(mt()) && /논술 목차 떠올리기 3\/5/.test(mt()) && /접속 1번 21:05/.test(mt()) && /모의고사 1교시 다 씀/.test(mt()), '날짜를 누르면 아래에서 그날 내용: 카드 매김·논술 목차·모의고사·접속 시각');
    click('[data-act="cal-close"]'); await sleep(10);
    ok(!mt(), '닫기');
    click('[data-act="cal-today"]'); await sleep(10);
    ok(view().querySelector('.cd.today') && !view().querySelector('[data-act="cal-today"]'), '이번 달로');
    // 옆으로 밀면 이전·다음 달(이번 달 다음과 기록 전 달은 못 감)
    const head = () => view().querySelector('.calhd b').textContent, nowYm = head();
    const swipeCal = async dx => { const g = view().querySelector('.calg'); const a = new w.Event('touchstart', { bubbles: true }); a.touches = [{ clientX: 200, clientY: 400 }]; g.dispatchEvent(a); const b = new w.Event('touchend', { bubbles: true }); b.changedTouches = [{ clientX: 200 + dx, clientY: 408 }]; g.dispatchEvent(b); await sleep(20); };
    const ymOf = k => { const x = new w.Date(new w.Date().getFullYear(), new w.Date().getMonth() + k, 1); return x.getFullYear() + '년 ' + (x.getMonth() + 1) + '월'; };
    await swipeCal(-120);
    ok(head() === ymOf(1) && view().querySelector('.calg.nx') && !mt(), '왼쪽으로 밀면 다음 달(넘기는 움직임, 날짜 창은 안 뜸)');
    await swipeCal(120); await swipeCal(120);
    ok(head() === ymOf(-1) && view().querySelector('.calg.pv'), '오른쪽으로 밀면 이전 달');
    await swipeCal(120);
    ok(head() === ymOf(-1) && /기록이 시작되기 전/.test(d.querySelector('#toast').textContent), '기록 전 달로는 못 감');
    await swipeCal(30);
    ok(head() === ymOf(-1), '조금 밀면 그대로');
    for (let i = 0; i < 30; i++) click('[data-act="cal-mon"][data-v="1"]');
    ok(view().querySelector('[data-act="cal-mon"][data-v="1"]').disabled && /더 뒤의 달은/.test(d.querySelector('#toast').textContent) && head() === ymOf(12), '앞으로는 12달 뒤까지(목표 시험이 더 뒤면 그 달까지)');
    click('[data-act="cal-today"]'); await sleep(10);
    for (let i = 0; i < 40 && head() !== '2026년 10월'; i++) click('[data-act="cal-mon"][data-v="-1"]');
    // 공휴일: 빨간 숫자와 짧은 이름, 날짜 창에 공휴일 이름
    ok(pe.KR_HOLI['2026-10-03'] === '개천절' && pe.KR_HOLI['2026-10-05'] === '대체공휴일(개천절)' && pe.KR_HOLI['2027-02-09'] === '대체공휴일(설날)' && pe.KR_HOLI['2026-07-17'] === '제헌절' && pe.KR_HOLI['2027-05-03'] === '대체공휴일(노동절)' && !pe.KR_HOLI['2026-10-04'], '공휴일 표(대체공휴일, 2026년부터 노동절·제헌절)');
    if (head() === '2026년 10월') {
      const hc = x => view().querySelector(`[data-act="cal-day"][data-d="${x}"]`);
      ok(hc('2026-10-03').classList.contains('hol') && hc('2026-10-03').querySelector('.hn').textContent === '개천절' && hc('2026-10-05').querySelector('.hn').textContent === '대체' && hc('2026-10-09').querySelector('.hn').textContent === '한글날' && !hc('2026-10-06').classList.contains('hol'), '달력 칸: 공휴일은 빨간 숫자와 짧은 이름');
      click('[data-act="cal-day"][data-d="2026-10-05"]'); await sleep(10);
      ok(/공휴일 · 대체공휴일\(개천절\)/.test(mt()), '날짜 창: 공휴일 이름');
      click('[data-act="cal-close"]'); await sleep(10);
    }
    await go('#more'); ok(view().querySelector('[data-h="cal"]'), '더보기 → 학습 달력');
    delete S().daily[old]; S().log.pop(); delete S().cal[old]; delete S().mockp.x;
    await go('#today');
  }

  // 어려운 낱말 형광펜: 설명 속 다른 카드 용어, 꾹 누르면 그 카드
  {
    const nm = pe.glNames('평탄성 (PrI·IRI)');
    ok(nm.includes('평탄성') && nm.includes('IRI') && !nm.includes('PrI'), '형광펜 이름: 본 이름 + 괄호 속 영문 약어');
    ok(!pe.glNames('시설물안전법상 중대한 결함 (교량)').includes('교량') && !pe.glNames('지보 패턴 설계·변경').includes('변경') && pe.glNames('OSC·모듈러·프리캐스트').includes('프리캐스트'), '괄호 속 한글·짧은 조각은 이름이 아님, 긴 조각은 이름');
    const all = pe.deck(), gm = pe.glIdx().m;
    const linked = all.filter(c => /data-gl=/.test(pe.glHTML(c.d, c.id)));
    ok(linked.length >= 100, `형광펜이 붙는 설명 ${linked.length}개`);
    ok(all.every(c => !pe.glHTML(c.d, c.id).includes(`data-gl="${c.id}"`)), '자기 카드에는 형광펜 없음');
    const sh = gm.get('숏크리트'), ab = gm.get('압밀');
    ok(sh && pe.glHTML('전면에 숏크리트를 친다', '').includes(`data-gl="${sh}"`) && !pe.glHTML('가숏크리트', '').includes('data-gl'), '낱말 앞이 끊긴 곳에서만(조사는 뒤에 붙어도 됨)');
    ok(ab && pe.glHTML('압밀이 끝나면', '').includes(`data-gl="${ab}"`) && !pe.glHTML('압밀침하', '').includes('data-gl'), '두 글자 용어는 뒤에 조사·띄어쓰기일 때만');
    ok(pe.glHTML('<b>숏크리트</b>', '').startsWith('&lt;b&gt;'), '형광펜 글도 HTML 이스케이프');
    // 화면: 세트 용어를 펼쳐 형광펜 낱말을 꾹 누르면 그 카드 설명
    await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
    let gl = null;
    for (let i = 0; i < 10 && !gl; i++) { const b = d.querySelector(`[data-act="set-open"][data-i="${i}"]`); if (!b) break; if (!b.closest('.acc').classList.contains('open')) { b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(20); } gl = d.querySelector('#view .acc.open .gl'); }
    ok(gl, '세트 용어 설명에 형광펜 낱말');
    if (gl) {
      const id = gl.dataset.gl, title = pe.deck().find(c => c.id === id).t;
      const touch = (type, el, x = 5, y = 5) => { const ev = new w.Event(type, { bubbles: true }); ev.touches = [{ clientX: x, clientY: y }]; el.dispatchEvent(ev); };
      touch('touchstart', gl); await sleep(100); touch('touchmove', d.querySelector('#view .acc.open .gl'), 60, 60); await sleep(450);
      ok(!d.querySelector('#modal-wrap').textContent, '누르다 손가락을 움직이면(스크롤) 열지 않음');
      touch('touchend', d.body);
      const g2 = d.querySelector(`#view .gl[data-gl="${id}"]`);
      touch('touchstart', g2); await sleep(520);
      ok(d.querySelector('#modal-wrap h3') && d.querySelector('#modal-wrap h3').textContent === title, '꾹 누르면 그 용어 카드 설명: ' + title);
      touch('touchend', d.body);
      click('#modal-wrap .modal'); await sleep(20);
      ok(d.querySelector('#modal-wrap h3'), '손을 뗄 때 생긴 클릭으로 창이 바로 닫히지 않음');
      touch('touchstart', d.body); click('#modal-wrap .modal'); await sleep(20);
      ok(!d.querySelector('#modal-wrap h3'), '다음 탭으로는 창이 닫힘');
      d.querySelector(`#view .gl[data-gl="${id}"]`).dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(20);
      ok(d.querySelector('#modal-wrap h3') && d.querySelector('#modal-wrap h3').textContent === title, '오른쪽 클릭(데스크톱)으로도 열림');
      click('#modal-wrap .modal'); await sleep(20);
      ok(!d.querySelector('#modal-wrap h3'), '오른쪽 클릭으로 연 창은 다음 클릭에 닫힘');
    }
    await go('#settings'); click('[data-act="gloss"][data-v="off"]'); await sleep(20);
    ok(pe.S().settings.gloss === 'off' && !/data-gl=/.test(pe.glHTML('전면에 숏크리트를 친다', '')), '설정에서 형광펜 끄기');
    await go('#set/2026-10-19'); await sleep(20);
    ok(!d.querySelector('#view .gl'), '끄면 세트 용어에도 형광펜 없음');
    await go('#settings'); click('[data-act="gloss"][data-v="on"]'); await sleep(20);
  }

  // 꾹 누른 낱말 풀이(카드에 없는 낱말도): 카드 → 앱 사전(data_gloss.js) → 바깥 사전 찾기
  {
    ok(fetchLog.some(u => /app\/gloss\/daily\.json/.test(u)) && pe.SETS().gloss && pe.SETS().gloss.w['가상낱말'], '받아 오기 때 매일 용어 사전(app/gloss/daily.json)도 받음');
    const rd = pe.glLookup('가상낱말을');
    ok(rd && rd.t === 'gloss' && rd.w === '가상낱말' && /검사용/.test(rd.d), '매일 받은 낱말도 꾹 누르기에서 찾음');
    const G = (w.PE_GLOSS && w.PE_GLOSS.w) || {}, keys = Object.keys(G), cm = pe.glIdx().m;
    ok(keys.length >= 500, `앱 사전 ${keys.length}낱말`);
    ok(keys.every(k => typeof G[k] === 'string' && G[k].length >= 10 && G[k].length <= 140 && !/[<>\n]/.test(G[k])), '사전 풀이 형식(10~140자, 꺾쇠·줄바꿈 없음)');
    const k = keys.find(x => /^[가-힣]{3,}$/.test(x) && !cm.has(x) && pe.glStem(x + '를') === x);
    const r1 = k && pe.glLookup(k + '를');
    ok(r1 && r1.t === 'gloss' && r1.w === k, `조사 붙은 낱말도 사전에서: ${k}를 → ${k}`);
    const r2 = pe.glLookup('숏크리트층에');
    ok(r2 && r2.t === 'card' && r2.id === cm.get('숏크리트'), '붙여 쓴 말은 가장 긴 조각: 숏크리트층에 → 숏크리트 카드');
    const r4 = pe.glLookup('흙막이벽체에');
    ok(r4 && r4.t === 'gloss' && r4.w === '흙막이벽', '더 긴 조각이 사전에 있으면 그것: 흙막이벽체에 → 흙막이벽');
    ok(pe.glLookup('압축강도는').w === '압축강도' && pe.glLookup('가물막이를').t === 'card', '조사 떼기로 줄어들던 낱말도 바탕꼴로: 압축강도는, 가물막이를');
    const r3 = pe.glLookup('뭉게구름이');
    ok(r3 && r3.t === 'none' && r3.w === '뭉게구름', '카드·사전에 없는 낱말은 바깥 사전 찾기');
    // 화면: 아무 낱말을 꾹 누르면(jsdom엔 caretRangeFromPoint가 없어 누른 글자 위치를 흉내)
    const touch = (type, el) => { const ev = new w.Event(type, { bubbles: true }); ev.touches = [{ clientX: 5, clientY: 5 }]; el.dispatchEvent(ev); };
    const pressWord = async (el, word) => { const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.data.includes(word)); d.caretRangeFromPoint = () => ({ startContainer: tn, startOffset: tn.data.indexOf(word) + 1 }); touch('touchstart', el); await sleep(520); touch('touchend', d.body); };
    await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
    const p0 = d.createElement('p'); p0.className = 'defn'; p0.textContent = `앞에서 ${k}를 쓰고 뭉게구름이 떴다`; d.querySelector('#view').appendChild(p0);
    await pressWord(p0, k);
    ok(d.querySelector('#modal-wrap h3') && d.querySelector('#modal-wrap h3').textContent === k && d.querySelector('#modal-wrap').textContent.includes(G[k].slice(0, 10)) && /AI 작성/.test(d.querySelector('#modal-wrap').textContent), '설명 글의 낱말을 꾹 → 앱 사전 풀이');
    touch('touchstart', d.body); click('#modal-wrap .modal'); await sleep(20);
    await pressWord(p0, '뭉게구름');
    const links = [...d.querySelectorAll('#modal-wrap a.btn')].map(a => a.getAttribute('href'));
    ok(/앱 사전에 없는/.test(d.querySelector('#modal-wrap').textContent) && links.length === 2 && links.every(h => h.startsWith('https://') && h.endsWith(encodeURIComponent('뭉게구름'))), '없는 낱말 → 국어사전·지식백과 찾기 링크');
    touch('touchstart', d.body); click('#modal-wrap .modal'); await sleep(20);
    const b0 = d.createElement('button'); b0.className = 'btn'; b0.textContent = '뭉게구름'; d.querySelector('#view').appendChild(b0);
    await pressWord(b0, '뭉게구름');
    ok(!d.querySelector('#modal-wrap h3'), '버튼은 꾹 눌러도 풀이를 띄우지 않음');
    p0.remove(); b0.remove(); delete d.caretRangeFromPoint;
  }

  ok(errors.length === 0, '콘솔 오류 없음 ' + errors.slice(0, 3).join(' | '));
  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
