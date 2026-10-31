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

  // 오늘(오늘 몫): 머리(달력 아이콘·D-day) → 상태 줄 → 블록마다 번호 줄(파란 버튼 하나) 또는 할 몫 없음 카드 → 이번 주. 체크리스트는 없음.
  // 진짜 날짜로 도는 검사라 줄 수·내용은 tests/plan.test.js(시계 고정)가 보고, 여기서는 생김새만 본다(가짜 저장소는 10/19 세트·10/24 모의뿐이라 대개 할 몫 없음 카드)
  await go('#today');
  const todayStr = new Date(); const ymd = todayStr.getFullYear() + '-' + String(todayStr.getMonth() + 1).padStart(2, '0') + '-' + String(todayStr.getDate()).padStart(2, '0');
  const todayShape = () => { const pr = view().querySelectorAll('.plan .prow'), nr = view().querySelector('.norows'), np = view().querySelectorAll('.btn:not(.sec):not(.ghost)').length; return { pr: pr.length, nr: !!nr, np }; };
  ok(view().querySelector('.ltitle .ltl > .calbtn:first-child'), '오늘 머리: 달력 아이콘이 맨 앞');
  ok(/D-\d+/.test(view().querySelector('.dday').textContent), 'D-day 표시 ' + view().querySelector('.dday').textContent.trim());
  ok(view().querySelector('.daysum') && /오늘 몫|남은/.test(view().querySelector('.daysum').textContent) && view().querySelector('.daysum [data-act="cap"]'), '상태 줄: 오늘 몫 n개 · 오늘 시간');
  { const sh = todayShape(); ok((sh.pr > 0 || sh.nr) && sh.np <= 1 && sh.np === 1, `오늘 몫 줄(${sh.pr}) 또는 할 몫 없음 카드, 파란 버튼은 하나(${sh.np})`); }
  if (ymd <= pe.PLAN().target.d && pe.weekIndex(ymd) >= 0) ok(view().querySelectorAll('.wkstrip .wkd').length === 7 && /이번 주/.test(txt()), '이번 주: 월~일 띠 7칸');
  else ok(!view().querySelector('.wkstrip'), `${ymd}: 시험 뒤(또는 준비 시작 전)라 이번 주 띠 없음`);
  ok(!view().querySelector('[data-act="chk"]') && !view().querySelector('.check'), '오늘에 체크리스트 없음');
  if (ymd === '2026-10-19') ok(view().querySelector('[data-task="set.read:2026-10-19"]') && view().querySelectorAll('.plan .prow').length >= 4, '오늘 세트(10/19): 용어 읽기 줄과 4줄 이상');
  else console.log('   (오늘 날짜가 2026-10-19가 아니라 세트 줄 없이)');

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
  ok(/이 세트 숙제/.test(txt()) && /준비 주/.test(txt()) && /숙제 원칙 6가지/.test(txt()) && !/오늘 숙제/.test(txt()), '숙제 탭: 이 세트 숙제(단계 설명·숙제 원칙 6가지)');
  click('[data-act="set-tab"][data-t="cards"]'); await sleep(10);
  ok(/교재로 확인할 것 \d+/.test(txt()) && view().querySelector('details.schk') && /세트를 만들 때 확신하지 못한 내용이에요/.test(txt()), '① 용어: 접은 "교재로 확인할 것 n"(예전 숙제 탭의 확인이 필요한 부분)');
  click('[data-act="set-tab"][data-t="tasks"]'); await sleep(10);
  ok(/새 용어 4개: 안 보고 쓰기 2번, 소리 내어 말하기 4번/.test(txt()) && view().querySelectorAll('.hw [data-k="w0"]').length === 2 && view().querySelectorAll('.hw [data-k="s0"]').length === 4, '새 용어: 낱말마다 쓰기 2·말하기 4 동그라미');
  ok(/복습 용어 6개: 제목만 보고 키워드 백지 복원/.test(txt()) && /논술 목차 옮겨 적기 4번/.test(txt()) && view().querySelectorAll('.hw [data-k="eo"]').length === 4 && /그림·표 그리기 3번/.test(txt()) && /논술 실전 쓰기 25분/.test(txt()), '복습 용어·논술 목차 4번·실전 쓰기·그림 3번');
  ok(/퀴즈를 다 풀면 틀린 문제가 여기/.test(txt()) && /앞글자로 외우기/.test(txt()) && /자기 전 5분/.test(txt()), '퀴즈 오답(다 풀기 전)·앞글자·자기 전 떠올리기');
  ok(!/새 용어 4개를 소리 내어 30초씩/.test(txt()) && hws().length === 9, '예약 작업의 공통 과제는 숙제가 대신함(세트만의 과제만 남김)');
  ok(view().querySelectorAll('.hw .how').length === hws().length && /빨간 펜/.test(hwOf('w0').querySelector('.how').textContent), '항목마다 요령');
  const tabLabel = () => view().querySelector('[data-act="set-tab"][data-t="tasks"]').textContent, allN = () => (view().querySelector('.hwcnt') || {}).textContent || '';
  ok(/③ 숙제 0\/5/.test(tabLabel()) && /필수 0\/5/.test(allN()) && /전체 0\/9/.test(allN()), '탭: ③ 숙제 필수 0/5(퀴즈를 다 풀기 전에는 틀린 이유를 세지 않음), 머리에 전체 0/9');
  ok(view().querySelector('[data-k="w0"][data-v="1"].req') && view().querySelector('[data-k="w0"][data-v="2"].ext') && view().querySelectorAll('.hw [data-k="s0"].req').length === 2 && view().querySelectorAll('.hw [data-k="s0"].ext').length === 2 && view().querySelector('.hw [data-k="eo"][data-v="2"].req') && view().querySelector('.hw [data-k="eo"][data-v="3"].ext') && view().querySelector('.ccsep'), '필수 동그라미(.req)·더 하기(.ext)·사이 줄(쓰기 1번·말하기 2번·목차 2번이 필수)');
  ok(/필수: 쓰기 1번 · 말하기 2번 \(나머지는 시간이 되면\)/.test(hwOf('w0').textContent) && hwOf('r4') && hwOf('r4').closest('details.hwext') && !hwOf('w0').closest('details'), '새 용어 카드에 "필수:" 줄, 복습 용어는 접은 "더 하기" 안');
  click('[data-act="hw"][data-k="w0"][data-v="2"]'); await sleep(10);
  ok(hp().w0 === 2 && view().querySelectorAll('.hw [data-k="w0"].on').length === 2, '두 번째 동그라미를 누르면 2번 한 것으로');
  click('[data-act="hw"][data-k="w0"][data-v="2"]'); await sleep(10);
  ok(hp().w0 === 1, '같은 동그라미를 다시 누르면 하나 뺌');
  for (let i = 0; i < 4; i++) { click(`[data-act="hw"][data-k="w${i}"][data-v="2"]`); await sleep(5); click(`[data-act="hw"][data-k="s${i}"][data-v="4"]`); await sleep(5); }
  ok(hwOf('w0').classList.contains('done') && /③ 숙제 2\/5/.test(tabLabel()) && /전체 1\/9/.test(allN()), '새 용어를 다 하면 그 숙제 끝(필수 2/5: 쓰기·말하기, 전체 1/9)');
  click('[data-act="hw"][data-k="eo"][data-v="4"]'); await sleep(10);
  click('[data-act="hw-ew"]'); await sleep(10);
  ok(S().sp['2026-10-19'].essay.done && hwOf('eo').classList.contains('done') && /③ 숙제 3\/5/.test(tabLabel()) && /전체 3\/9/.test(allN()), '목차 4번(필수 3/5), 실전 쓰기(논술 탭 손글씨와 같은 기록, 전체 3/9)');
  view().querySelector('#hwMn').value = '침윤선 누수 파이핑 → 침누파'; click('[data-act="hw-mn"]'); await sleep(10);
  ok(hp().mn === '침윤선 누수 파이핑 → 침누파' && view().querySelector('#hwMn').value === hp().mn && /전체 4\/9/.test(allN()), '앞글자 외우기를 적어 둠');
  click('[data-act="hw-ew"]'); await sleep(10);
  ok(!S().sp['2026-10-19'].essay.done && /전체 3\/9/.test(allN()), '실전 쓰기를 다시 누르면 취소');
  click('[data-act="set-tab"][data-t="essay"]'); await sleep(20); click('[data-act="set-essay-done"]'); await sleep(20); click('[data-act="set-tab"][data-t="tasks"]'); await sleep(20);
  ok(/전체 4\/9/.test(allN()), '논술 탭에서 손글씨 체크해도 숙제에 반영');
  click('[data-act="hw-ew"]'); await sleep(10);
  ok(!S().sp['2026-10-19'].essay.done && /전체 3\/9/.test(allN()), '(되돌림) 실전 쓰기 취소');
  // 단답 답안지: 카드를 1교시 답안지 모양으로(정의 → 주요 내용(키워드) → 그림 칸 → 결론 → 끝)
  const ddHw = view().querySelector('.hw [data-k^="dd"]') && view().querySelector('.hw [data-k^="dd"]').closest('.hw');
  ok(ddHw && /단답 1문제: 답안지에 10분 쓰기/.test(txt()) && ddHw.querySelector('[data-h^="dandap/"]') && ddHw.querySelector('[data-p="one1"]'), '숙제: 단답 1문제(답안지 버튼, 10분 타이머)');
  ok(pe.ddNoun('물이 흐른다.') === '물이 흐름' && pe.ddNoun('압밀이 진행된다') === '압밀이 진행됨' && pe.ddNoun('강도가 크다') === '강도가 큼' && pe.ddNoun('물을 막는다.') === '물을 막음' && pe.ddNoun('구조물이다.') === '구조물임' && pe.ddNoun('효과가 있다') === '효과가 있음' && pe.ddNoun('시공이 쉽다') === '시공이 쉬움' && pe.ddNoun('폭이 넓다') === '폭이 넓음' && pe.ddNoun('키워드') === '키워드', '문장 끝을 답안식으로(함·됨·임·음)');
  const dw = pe.ddWrap('가나다라 마바사아자 차카타파하 가나다라마바사아자차카타파하가나다', 10);
  ok(dw.length >= 4 && dw.join('').replace(/\s/g, '') === '가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다' && dw.every(l => l.length <= 10), '줄 나누기(긴 낱말은 끊고 글자는 그대로)');
  click('.hw [data-h^="dandap/"]'); await sleep(30);
  const ddId = decodeURIComponent(w.location.hash.replace('#dandap/', '').split('/')[0]), ddc = pe.deck().find(c => c.id === ddId);
  ok(w.location.hash.split('/')[2] === '2026-10-19' && view().querySelector('[data-act="dd-done"][data-d="2026-10-19"]') && /다 썼어요\(숙제에 표시\)/.test(txt()), '숙제에서 연 답안지(#dandap/카드/날짜): "다 썼어요(숙제에 표시)"');
  const rowsN = () => [...view().querySelectorAll('.asheet.dd .ar')].reduce((a, r) => a + (r.classList.contains('blk') ? 5 : (r.querySelector('.ac').textContent.trim() ? 1 : 0)), 0);
  ok(ddc && /^#dandap\//.test(w.location.hash) && view().querySelector('.asheet.dd'), '답안지 화면');
  const sheetTxt = view().querySelector('.asheet.dd').textContent;
  ok(sheetTxt.includes(ddc.t + '에 대하여 설명하시오.') && /답\)/.test(sheetTxt) && /개요/.test(sheetTxt) && /주요 내용/.test(sheetTxt) && /결론/.test(sheetTxt) && /〈그림 1〉/.test(sheetTxt) && /그림 칸/.test(sheetTxt) && view().querySelector('.ddend'), '문제 → 답) → 개요 → 주요 내용 → 그림 칸 → 결론 → 끝');
  ok((ddc.k || []).every(k => sheetTxt.replace(/\s/g, '').includes(k.replace(/\s/g, ''))), '주요 내용은 카드 키워드 그대로');
  ok(view().querySelectorAll('.asheet.dd u').length >= 3 && view().querySelector('.asheet.dd .no').textContent === '1' && view().querySelectorAll('.asheet.dd .ar').length >= 18, '대제목 밑줄, 번호 칸');
  const statN = Number(view().querySelector('.ddstat b').textContent.replace(/\D/g, ''));
  ok(statN === rowsN() && (statN <= 22 ? /1면 안에/.test(txt()) : /넘쳐요/.test(txt())), '줄 수 표시가 답안지 줄과 같음: ' + statN);
  click('[data-act="copy-dd"]'); await sleep(20);
  ok(/복사/.test(d.querySelector('#toast').textContent), '첨삭 요청 복사 버튼');
  ok(view().querySelector('[data-act="timer-go"][data-p="one1"]') && /10분 쓰는 순서/.test(txt()), '10분 타이머, 쓰는 순서');
  const longC = pe.deck().find(c => pe.ddRows(c).reduce((a, r) => a + (Array.isArray(r) ? 1 : r.fig + 1), 0) > 22);
  if (longC) { await go('#dandap/' + encodeURIComponent(longC.id)); ok(view().querySelectorAll('.asheet.dd').length === 2 && view().querySelector('.asheet.dd.over') && /2면/.test(txt()) && /넘쳐요/.test(txt()), '22줄을 넘으면 2면으로 넘치고 알려 줌'); }
  await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(20);
  click('[data-act="set-open"][data-i="0"]'); await sleep(20);
  ok(view().querySelector('.acc.open [data-h^="dandap/"]'), '세트 용어에서 단답 답안지로');
  await go('#test'); click('[data-act="dd-rand"]'); await sleep(30);
  ok(/^#dandap\//.test(w.location.hash) && view().querySelector('.asheet.dd'), '테스트 탭: 단답 답안지 1문');
  { const t0 = (x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'))(new w.Date()), kk = 'x.dd2:' + t0, had = S().tk[kk]; delete S().tk[kk]; pe.render();
    ok(view().querySelectorAll('.btn:not(.sec):not(.ghost)').length === 1 && view().querySelector('.btn:not(.sec)[data-act="dd-tick"]') && view().querySelector('.btn.sec[data-p="one1"]'), '숙제 밖에서 연 답안지: 파란 "다 썼어요" 하나(타이머 10분은 보조)');
    click('[data-act="dd-tick"]'); await sleep(10); const on = S().tk[kk] === t0; click('[data-act="dd-tick"]'); await sleep(10);
    ok(on && !S().tk[kk], '"다 썼어요" → 오늘 "단답 1문제 더"(x.dd2)로 침, 다시 누르면 되돌림'); if (had) S().tk[kk] = had; }
  await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="tasks"]'); await sleep(20);

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
  ok(!pe.SES() && !S().resume['flash:2026-10-19'] && view().querySelector('[data-act="set-flash"]').textContent === '카드 넘겨 보기' && !view().querySelector('[data-act="resume-clear"]'), '처음부터: 이어 하기 지움("카드 넘겨 보기")');
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

  // 용어 퀴즈: 세트 용어로 앱이 만든 문제(용어당 15문, 15문씩 회차, 쉬운 것부터)
  {
    const D0 = '2026-10-19', L = pe.gqList(D0), GQ3 = ['round', 'term', 'rand'];
    ok(L && L.items.length >= 120 && L.items.length <= 150, `용어 퀴즈 ${L && L.items.length}문(용어 10개)`);
    ok(L.items.every(q => q.q && (q.o.length === 4 || q.o.length === 2) && new Set(q.o).size === q.o.length && q.a >= 0 && q.a < q.o.length), '보기 2·4개, 겹침 없음, 정답 자리 유효');
    ok(pe.gqBuild(D0).sig === L.sig && JSON.stringify(pe.gqBuild(D0).items) === JSON.stringify(L.items), '같은 세트는 늘 같은 문제·같은 보기 순서');
    const ks = new Set(L.items.map(q => q.k)); ok(['def', 'kw', 'ox', 'blank', 'notkw'].every(k => ks.has(k)), '문제 종류: ' + [...ks].join(','));
    ok(L.items.filter(q => ['def', 'field', 'plus'].includes(q.k)).every(q => !q.t.includes(q.o[q.a])), '설명 보고 고르는 문제에는 정답 용어 이름이 안 보임');
    const per = {}; L.items.forEach(q => { per[q.id] = (per[q.id] || 0) + 1; }); ok(Object.values(per).every(n => n <= 15), '용어당 15문 이하');
    const r1 = L.items.slice(0, 15).map(q => q.k), r9 = L.items.slice(-30).map(q => q.k);
    ok(r1.filter(k => k === 'def' || k === 'kw').length > r9.filter(k => k === 'def' || k === 'kw').length, '앞 회차는 정의·키워드 위주, 뒤로 갈수록 어려움');
    ok(L.items.filter(q => q.k === 'blank').every(q => (q.t.match(/\{_\}/g) || []).length === 1), '빈칸 문제는 빈칸 하나');
    ok(pe.jo('모래다짐말뚝', '은는') === '은' && pe.jo('동다짐', '과와') === '과' && pe.jo('액상화', '이가') === '가' && pe.jo('CPT', '은는') === '은(는)', '받침에 맞는 조사');
    const alt = pe.gqNumAlt('1.0', () => 0.3); ok(alt.length === 3 && alt.every(a => /^\d\.\d$/.test(a) && a !== '1.0'), '수치 보기는 같은 자릿수: ' + alt);
    ok(pe.gqNumAlt('25', () => 0.6).every(a => /^\d+$/.test(a)), '정수 수치는 정수 보기');
    ok(pe.gqNumAlt('2023', () => 0.5).every(a => Math.abs(Number(a) - 2023) <= 3), '연도는 앞뒤 몇 해');
    await go('#set/' + D0); click('[data-act="set-tab"][data-t="quiz"]'); await sleep(20);
    ok(/용어 퀴즈/.test(txt()) && view().querySelectorAll('.gqc').length === Math.ceil(L.items.length / 15) && /세트 퀴즈/.test(txt()) && view().querySelectorAll('.qcard').length === 5, '퀴즈 탭: 용어 퀴즈 회차 칸과 세트 퀴즈');
    { const sq = view().querySelector('section.sec'), gf = view().querySelector('details.gqf');
      ok(sq && gf && /세트 퀴즈/.test(sq.textContent) && (sq.compareDocumentPosition(gf) & 4) && gf.contains(view().querySelector('.gqc')) && /더 연습: 용어 퀴즈/.test(gf.querySelector('summary').textContent) && !gf.querySelector('.btn:not(.sec):not(.ghost)') && GQ3.every(m => gf.querySelector(`[data-act="gq-mode"][data-m="${m}"]`)), '② 퀴즈: 세트 퀴즈 먼저, 용어 퀴즈(회차별·용어별·무작위)는 그 아래 접은 "더 연습" 안, 버튼은 보조'); }
    click('[data-act="gq-go"][data-r="next"]'); await sleep(40);
    ok(pe.SES() && pe.SES().items.length === 15 && pe.SES().items.every((it, i) => it.type === 'gq' && it.n === i), '1회: 1~15번 세션');
    const q0 = L.items[0], q1 = L.items[1];
    ok(view().querySelector('.qtext') && view().querySelectorAll('.opt').length === q0.o.length, '문제와 보기');
    click(`[data-act="sess-pick"][data-k="${q0.a}"]`); await sleep(20);
    ok(view().querySelector('.opt.right') && /정답/.test(view().querySelector('.ex').textContent) && view().querySelector('[data-act="card-modal"]'), '맞히면 정답·풀이와 카드 보기');
    click('[data-act="sess-next"]'); await sleep(20);
    click(`[data-act="sess-pick"][data-k="${(q1.a + 1) % q1.o.length}"]`); await sleep(20);
    const wk = Object.keys(S().wrong).find(k => k.startsWith('G:' + D0 + ':1:'));
    ok(view().querySelector('.opt.wrong') && wk && pe.gqRec(D0).slice(0, 3) === '10-', '틀리면 오답 노트로, 문제마다 기록');
    ok(Object.values(S().cal).some(x => x.x && x.x['gq:' + D0] && /용어 퀴즈 2\/\d+문/.test(x.x['gq:' + D0][1])), '달력에 용어 퀴즈');
    click('[data-act="card-modal"]'); await sleep(10);
    const mw = () => d.querySelector('#modal-wrap');
    ok(mw().querySelector('h3') && mw().querySelector('[data-act="memo-one"]'), '카드 보기 창: 가리며 외우기 버튼');
    click('[data-act="memo-one"]', mw()); await sleep(30);
    ok(w.location.hash === '#memo' && !mw().innerHTML && pe.MEMO().items.length === 1 && pe.MEMO().items[0].id === q1.id, '카드 한 장 가리며 외우기(창 닫힘)');
    click('[data-act="back"]'); await sleep(60);
    ok(w.location.hash === '#sess' && pe.SES().i === 1, '닫으면 퀴즈로 돌아옴');
    await go('#set/' + D0); await sleep(10);
    ok(/이어 풀기: 1회/.test(txt()) && /틀린 문제만 \(1\)/.test(txt()) && view().querySelector('.gqc.part'), '나갔다 오면 이어 풀기·틀린 문제만');
    click('[data-act="gq-go"][data-r="next"]'); await sleep(40);
    ok(pe.SES().i === 2 && pe.SES().items[2].n === 2, '반쯤 푼 회차는 안 푼 문제부터');
    await go('#set/' + D0); click('[data-act="gq-go"][data-r="wrong"]'); await sleep(40);
    ok(pe.SES().items.length === 1 && pe.SES().items[0].n === 1, '틀린 문제만 다시');
    await go('#set/' + D0); click('[data-act="gq-go"][data-r="2"]'); await sleep(40);
    ok(pe.SES().items[0].n === 30 && /3회/.test(pe.SES().title), '회차 칸을 누르면 그 회차');
    // 용어별·무작위로도 푼다
    await go('#set/' + D0); click('[data-act="gq-mode"][data-m="term"]'); await sleep(10);
    const tid = L.items[3].id, tn = L.items.filter(q => q.id === tid).length;
    ok(view().querySelectorAll('[data-act="gq-go"][data-r^="t:"]').length === new Set(L.items.map(q => q.id)).size && !view().querySelector('.gqc'), '용어별: 외울 용어마다 한 줄(회차 칸 대신)');
    click(`[data-act="gq-go"][data-r="t:${tid}"]`); await sleep(40);
    ok(pe.SES().items.length === tn && pe.SES().items.every(it => L.items[it.n].id === tid) && pe.SES().items.every((it, i, a) => !i || a[i - 1].n < it.n) && pe.SES().title.includes(': '), '용어별: 그 용어 문제만 쉬운 것부터');
    await go('#set/' + D0); click('[data-act="gq-mode"][data-m="rand"]'); await sleep(10);
    click('[data-act="gq-go"][data-r="rand"]'); await sleep(40);
    const rs = pe.SES().items.map(it => it.n);
    ok(rs.length === 15 && new Set(rs).size === 15 && rs.some((n, i) => n !== i) && /무작위 15문/.test(pe.SES().title), '무작위 15문(풀 때마다 섞음)');
    await go('#set/' + D0); click('[data-act="gq-go"][data-r="all"]'); await sleep(40);
    ok(pe.SES().items.length === L.items.length && new Set(pe.SES().items.map(it => it.n)).size === L.items.length, '전체 섞기');
    await go('#set/' + D0); click('[data-act="gq-mode"][data-m="round"]'); await sleep(10);
    ok(view().querySelectorAll('.gqc').length && view().querySelector('[data-act="gq-mode"][data-m="round"].on'), '회차별로 돌아옴');
    await go('#review');
    ok(/용어 퀴즈 1/.test(txt()), '복습 탭 오답 노트에 용어 퀴즈');
    await go('#wrong'); ok(/용어 퀴즈, 1번 틀림/.test(txt()), '오답 노트 목록');
    await go('#review'); click('[data-act="start-wrong"]'); await sleep(40);
    ok(pe.SES().items.some(it => it.type === 'gq' && it.n === 1 && it.wrongKey === wk), '오답 다시 풀기에 용어 퀴즈');
    // 오답 카드 가리며 외우기
    await go('#review'); click('[data-act="memo-wrong"]'); await sleep(30);
    ok(pe.MEMO() && pe.MEMO().key === 'memo:wrong' && pe.MEMO().items.some(x => x.id === q1.id), '오답 카드 가리며 외우기(용어 퀴즈에서 틀린 용어 포함)');
    click('[data-act="back"]'); await sleep(60);
    // 다시 볼 세트를 누르면 외우기 방법을 고른다
    const read0 = JSON.stringify(S().sp[D0].read || {});
    await go('#review'); click('[data-act="rev-open"][data-d="' + D0 + '"]'); await sleep(20);
    ok(['start-setrev', 'memo-set', 'set-flash', 'start-fill', 'gq-go'].every(a => mw().querySelector(`[data-act="${a}"]`)) && /어느 방법이든 끝까지 하면 오늘 복습/.test(mw().textContent), '다시 볼 세트: 카드·퀴즈, 가리며 외우기, 넘겨 보기, 빈칸 쓰기, 용어 퀴즈');
    ok(mw().querySelectorAll('.btn:not(.sec):not(.ghost)').length === 1 && mw().querySelector('.btn:not(.sec):not(.ghost)[data-act="start-setrev"]') && /^세트 복습 시작 · 카드 \d+/.test(mw().querySelector('[data-act="start-setrev"]').textContent) && ['memo-set', 'set-flash', 'start-fill', 'gq-go'].every(a => mw().querySelector(`details.rvm [data-act="${a}"]`)), '세트 창: 파란 버튼은 "세트 복습 시작" 하나, 다른 방법은 접은 "다른 방법으로" 안');
    click('details.rvm [data-act="start-fill"]', mw()); await sleep(10);
    ok(mw().querySelector('[data-act="rev-open"].rvback') && mw().querySelectorAll('[data-act="fill-lv"][data-rv="1"]').length === 4, '빈칸 쓰기 난이도 창 맨 위 "‹ 다른 방법"');
    click('.rvback', mw()); await sleep(10); ok(mw().querySelector('[data-act="start-setrev"]'), '"‹ 다른 방법" → 세트 창으로');
    click('[data-act="memo-set"]', mw()); await sleep(30);
    ok(w.location.hash === '#memo' && !mw().innerHTML && pe.MEMO().setD === D0 && /가리며 외우기/.test(txt()), '창에서 가리며 외우기(창 닫힘)');
    while (pe.MEMO().i + 1 < pe.MEMO().items.length) { click('[data-act="memo-next"]'); await sleep(5); }
    click('[data-act="memo-finish"]'); await sleep(10);
    ok(Object.keys(S().sp[D0].rev || {}).length > 0, '가리며 외우기를 끝내도 그 날 복습으로 침');
    click('[data-act="memo-close"]'); await sleep(60);
    await go('#review');
    ok(!/일 차/.test(txt()) && view().querySelector('[data-act="rev-open"][data-d="' + D0 + '"]') && /지난 세트/.test(txt()) && !/지난 세트 다시 외우기/.test(txt()), '복습을 마친 세트는 지난 세트에서 다시 열기');
    S().sp[D0].rev = {}; S().resume = {}; pe.render();
    // 세션 중·끝에 가리며 외우기
    await go('#study'); click('[data-act="start-free"]'); await sleep(40);
    const ses = pe.SES(); click('[data-act="sess-flip"]'); await sleep(10); click('[data-act="sess-grade"][data-g="0"]'); await sleep(10);
    click('[data-act="sess-skip"]'); await sleep(10);
    ok(view().querySelector('[data-act="memo-sess"]'), '카드 넘겨 보기 중 가리며 외우기 버튼');
    click('[data-act="memo-sess"]'); await sleep(30);
    ok(pe.MEMO().key === 'memo:sess' && pe.MEMO().i === 2 && pe.MEMO().items.length === ses.items.length && pe.MEMO().items[2].id === ses.items[2].id, '이 카드부터 가리며 외우기(세션 카드 그대로)');
    click('[data-act="back"]'); await sleep(60);
    ok(w.location.hash === '#sess' && pe.SES() === ses && ses.i === 2, '닫으면 보던 카드로');
    ses.i = ses.items.length; pe.render(); await sleep(10);
    ok(/틀리거나 애매한 카드 가리며 외우기 \(1장\)/.test(txt()) && new RegExp(`방금 본 카드 가리며 외우기 \\(${ses.items.length}장\\)`).test(txt()), '끝 화면: 틀린 카드만·모두 가리며 외우기');
    click('[data-act="memo-sess"][data-only="miss"]'); await sleep(30);
    ok(pe.MEMO().items.length === 1 && pe.MEMO().items[0].id === ses.items[0].id, '틀리거나 애매한 카드만');
    click('[data-act="back"]'); await sleep(60); click('[data-act="sess-close"]'); await sleep(60);
    // 별표 카드 가리며 외우기
    pe.S().cards[q1.id] = Object.assign(pe.S().cards[q1.id] || {}, { star: true }); await go('#review');
    const hasStar = !!view().querySelector('[data-act="memo-stars"]'); if (hasStar) { click('[data-act="memo-stars"]'); await sleep(30); }
    ok(hasStar && pe.MEMO().key === 'memo:stars' && pe.MEMO().items.some(x => x.id === q1.id), '별표 카드 가리며 외우기');
    click('[data-act="back"]'); await sleep(60); delete pe.S().cards[q1.id].star;
    Object.keys(S().wrong).filter(k => k.startsWith('G:')).forEach(k => delete S().wrong[k]); delete S().sp[D0].gq; S().sp[D0].read = JSON.parse(read0); S().resume = {}; pe.render();
  }

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
  // 탭 이름: PE_WEEKS(= pipeline/curriculum.json)는 그대로 두고 보여 줄 때 지금 이름으로(weekObj, 로드맵의 요일별 루틴)
  { const P = pe.PLAN(), w17 = P.map.findIndex(m => m && (m.t === 17 || (m.ts || []).includes(17))), cf = path.join(__dirname, '..', '..', 'pipeline', 'curriculum.json');
    const cur = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')).weeks.find(x => x.w === 17) : null, raw = w.PE_WEEKS.find(x => x.w === 17), g17 = w17 >= 0 ? pe.weekObj(w17).goals : [];
    ok(g17.some(g => /^연습 탭 전체 카드 1회전/.test(g)) && !g17.some(g => /암기 탭/.test(g)) && raw.goals[0] === '암기 탭 전체 카드 1회전(하루 40장)' && (!cur || JSON.stringify(cur.goals) === JSON.stringify(raw.goals)), `${w17}주차(틀 17) 목표는 "연습 탭 전체 카드 1회전"으로 보이고, PE_WEEKS는 curriculum.json과 같이 "암기 탭" 그대로`);
    ok(pe.tabWords('토요일 모의고사(앱 테스트 탭) · 기출 훑기(테스트 → 기출 단원별) · 테스트 → 기출 회차에서 · 암기 탭 · 플랜 탭 · 다시 볼 세트') === '토요일 모의고사(연습 탭) · 기출 훑기(연습 → 기출 문제은행(단원별)) · 연습 → 기출 문제은행(회차별)에서 · 연습 탭 · 이번 주 탭 · 세트 복습', 'tabWords: 예전 탭 이름 → 연습 탭 · 이번 주 탭 · 연습 → 기출 문제은행 · 세트 복습');
    await go('#plan'); ok(!/암기 탭|테스트 탭|테스트 →|플랜 탭|다시 볼 세트/.test(txt()) && /연습 → 기출 문제은행에서 실제 시험지/.test(txt()) && /모의고사 채점 \(모의고사 화면/.test(w.PE_PROMPTS.find(x => x.id === 'p9').n), '로드맵(주차 목표·요일별 루틴·Claude 활용 순서)과 프롬프트 이름에 예전 탭 이름이 없음'); }
  // 연습 → "새 카드 n장"은 범위 안 새 카드만(카드 복습은 따로 "카드 복습 n장 · 전체 단원")
  await go('#study'); const nwRow = view().querySelector('[data-act="start-study"]'), nwN = Number(((nwRow && nwRow.textContent.match(/새 카드 (\d+)장/)) || [])[1] || 0);
  click('[data-act="start-study"]'); await sleep(40);
  ok(view().querySelector('.fc') && pe.SES().kind === 'study' && pe.SES().title === '새 카드' && pe.SES().items.length === nwN && pe.SES().items.every(it => !(S().cards[it.id] && S().cards[it.id].seen > 0)), `연습 "새 카드 ${nwN}장" → 새 카드만 ${nwN}장 세션`);

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
  await go('#test'); ok(!view().querySelector('[data-h="guide"]'), '테스트 탭에는 답안 작성 요령 줄이 없음(더보기·④ 논술·모의고사 화면에 있음)');
  await go('#mock/2026-10-24'); ok(view().querySelector('[data-h="guide"]'), '모의고사 화면 → 답안 작성 요령');
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
    ok(/가리며 외우기 \d+장 · 별표·오답 먼저/.test(txt()) && d.querySelector('#nav button.on').dataset.tab === 'practice', '예전 주소 #study → 연습 탭: 가리며 외우기 20장 · 별표·오답 먼저');
    click('[data-act="memo-study"]'); await sleep(30);
    ok(M().items.length >= 1 && M().items.length <= 20 && !M().setD && M().label === '연습 카드', '연습 탭 → 범위 카드로 가리며 외우기(이름 "연습 카드")');
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
    ok(S().settings.memo.mode === 'tape' && M().edit && box().classList.contains('editing') && /가릴 곳을 0\.3초 꾹 누른 뒤 그대로 그으세요/.test(txt()), '테이프로 가리기: 붙이기 켜짐');
    const cid = M().items[M().i].id, mlEl = li => box().querySelector(`.ml[data-li="${li}"]`);
    const at = (li, k) => { const tw = w.document.createTreeWalker(mlEl(li), 4); let n; while ((n = tw.nextNode())) { if (k <= n.data.length) return { startContainer: n, startOffset: k }; k -= n.data.length; } return null; };
    const ptr = (type, li, k, x, y, tg, pid, pt) => { w.document.caretRangeFromPoint = () => at(li, k); const ev = new w.Event(type, { bubbles: true, cancelable: true }); ev.clientX = x; ev.clientY = y; ev.pointerId = pid || 1; ev.pointerType = pt || 'touch'; (tg || (type === 'pointerdown' ? mlEl(li) : w.document)).dispatchEvent(ev); };
    const base = li => Number(mlEl(li).dataset.o), full = () => [...box().querySelectorAll('.ml')].map(e => e.textContent).join('\n');
    ok(pe.memoOff(at('d1', 2).startContainer, 2) === base('d1') + 2, '손가락 밑 글자 → 카드 글 자리');
    const tmove = () => { const ev = new w.Event('touchmove', { bubbles: true, cancelable: true }); mlEl('d1').dispatchEvent(ev); return ev.defaultPrevented; };
    ptr('pointerdown', 'd0', 3, 10, 10); ptr('pointermove', 'd1', 2, 40, 40); const sm = tmove(); ptr('pointerup', 'd1', 2, 40, 40); await sleep(130);
    ok(!(S().memoTape || {})[cid] && !sm && !box().classList.contains('drawing') && !box().querySelector('.tsl'), '꾹 누르지 않고 밀면 화면 스크롤(테이프 안 붙음, 터치 이동을 막지 않음)');
    const ml0 = mlEl('d0');
    ptr('pointerdown', 'd0', 3, 10, 10); await sleep(150); ptr('pointermove', 'd0', 3, 13, 12);
    ok(!box().classList.contains('drawing') && !tmove(), '(0.3초 전에는 아직 긋기 아님)');
    await sleep(200);
    ok(box().classList.contains('drawing') && box().querySelector('.tsl') && tmove(), '0.3초 꾹 누르면 긋기 시작(화면은 멈춤)');
    ptr('pointermove', 'd1', 2, 40, 40);
    ok(mlEl('d0') === ml0 && box().querySelector('.tsl') && !box().querySelector('.tp'), '긋는 동안 글자 요소는 그대로 두고 위에 범위 표시');
    ptr('pointermove', 'd1', 4, 60, 40); ptr('pointerup', 'd1', 4, 60, 40); await sleep(10);
    ok(!box().classList.contains('drawing') && !tmove(), '떼면 긋기 끝(다시 스크롤)');
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
    // 두 손가락: 테이프를 만들지 않는다(스크롤·확대는 기기에 맡김)
    const nT = () => S().memoTape[cid].length, n0 = nT();
    ptr('pointerdown', 'k2', 1, 20, 360, null, 1); ptr('pointerdown', 'k2', 3, 60, 360, null, 2); ptr('pointerup', 'k2', 1, 20, 360, null, 1); ptr('pointerup', 'k2', 3, 60, 360, null, 2); await sleep(130);
    ok(nT() === n0 && !mlEl('k2').querySelector('.tp'), '두 손가락으로 톡: 테이프 안 붙음');
    ptr('pointerdown', 'k2', 1, 20, 360, null, 1); ptr('pointerup', 'k2', 1, 20, 360, null, 1); await sleep(20); ptr('pointerdown', 'k2', 3, 60, 360, null, 2); ptr('pointerup', 'k2', 3, 60, 360, null, 2); await sleep(130);
    ok(nT() === n0, '두 손가락이 살짝 어긋나 닿아도(90ms 안) 테이프 안 붙음');
    ptr('pointerdown', 'd0', 2, 20, 60, null, 1); await sleep(330); ptr('pointermove', 'd0', 6, 70, 60, null, 1);
    ok(box().querySelector('.tsl') && box().classList.contains('drawing'), '(한 손가락으로 긋는 중)');
    ptr('pointerdown', 'd1', 2, 120, 80, null, 2);
    ok(!box().querySelector('.tsl') && !box().classList.contains('drawing') && !tmove(), '두 번째 손가락이 닿으면 긋기 취소(화면 이동은 기기에 맡김)');
    ptr('pointermove', 'd0', 6, 70, 20, null, 1); ptr('pointerup', 'd0', 6, 70, 20, null, 1); ptr('pointerup', 'd1', 2, 120, 40, null, 2); await sleep(130);
    ok(nT() === n0, '두 손가락 뒤에도 테이프 안 붙음');
    ptr('pointerdown', 'k2', 1, 20, 360, null, 1); ptr('pointerdown', 'k2', 3, 60, 360, null, 2); await sleep(330);
    ok(!box().classList.contains('drawing'), '두 손가락으로 꾹 눌러도 긋기 아님');
    ptr('pointerup', 'k2', 1, 20, 360, null, 1); ptr('pointerup', 'k2', 3, 60, 360, null, 2); await sleep(130);
    ok(nT() === n0, '(테이프 안 붙음)');
    w.dispatchEvent(new w.Event('scroll')); ptr('pointerdown', 'k2', 1, 20, 360); ptr('pointerup', 'k2', 1, 20, 360); await sleep(130);
    ok(nT() === n0, '미끄러지던 화면을 세우려고 누른 것은 테이프 안 붙음');
    T += 200;
    ptr('pointerdown', 'd2', 1, 20, 90); await sleep(330); ptr('pointermove', 'd2', 5, 60, 90);
    w.document.dispatchEvent(Object.assign(new w.Event('pointercancel', { bubbles: true }), { pointerId: 1 })); await sleep(10);
    ok(nT() === n0 && !box().querySelector('.tsl') && !box().classList.contains('drawing'), '긋다가 취소되면(전화 등) 테이프 안 붙음');
    ptr('pointerdown', 'k2', 1, 20, 360); await sleep(330); ptr('pointerup', 'k2', 1, 20, 360); await sleep(10);
    ok(nT() === n0 + 1 && mlEl('k2').querySelector('.tp'), '꾹 눌렀다 그냥 떼면 그 낱말');
    ptr('pointerdown', 'k2', 1, 20, 360, mlEl('k2').querySelector('.tp')); ptr('pointerup', 'k2', 1, 20, 360); await sleep(130);
    ok(nT() === n0 && !mlEl('k2').querySelector('.tp'), '(뗌)');
    ptr('pointerdown', 'd2', 1, 20, 90, null, 1, 'mouse'); ptr('pointermove', 'd2', 5, 60, 90, null, 1, 'mouse'); ptr('pointerup', 'd2', 5, 60, 90, null, 1, 'mouse'); await sleep(10);
    ok(nT() === n0 + 1 && mlEl('d2').querySelector('.tp') && mlEl('d2').querySelector('.tp').textContent.length === 5, '마우스는 꾹 누르지 않고 바로 긋기');
    ptr('pointerdown', 'd2', 1, 20, 90, mlEl('d2').querySelector('.tp')); ptr('pointerup', 'd2', 1, 20, 90); await sleep(130);
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
    click('[data-act="memo-close"]'); await sleep(60);
    ok(w.location.hash === '#set/2026-10-19' && !M() && view().querySelector('[data-act="memo-set"]').textContent === '가리며 외우기', '돌아가기 → 세트 화면(이어 하기 없음: "가리며 외우기")');
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
    ok(/10월 19일 숙제 \d+\/9/.test(txt()) && /10월 19일 숙제\(용어\) \d+\/\d+/.test(txt()) && /10월 19일 숙제\(논술\)/.test(txt()), '숙제 → 할 일(보라)·용어·논술로 달력에');
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
    const prevOff = () => view().querySelector('[data-act="cal-mon"][data-v="-1"]').disabled, ymN = s => { const m = /(\d+)년 (\d+)월/.exec(s); return m ? +m[1] * 12 + +m[2] : NaN; };
    for (let i = 0; i < 36 && !prevOff(); i++) await swipeCal(120);   // 기록이 시작된 달까지(지난달 기록을 넣었으니 늦어도 지난달, 준비 시작일이 더 앞이면 그 달)
    const firstYm = head(); d.querySelector('#toast').textContent = '';
    await swipeCal(120);
    ok(prevOff() && head() === firstYm && ymN(firstYm) <= ymN(ymOf(-1)) && /기록이 시작되기 전/.test(d.querySelector('#toast').textContent), `기록 전 달로는 못 감(${firstYm}에서 멈춤)`);
    await swipeCal(30);
    ok(head() === firstYm, '조금 밀면 그대로');
    for (let i = 0; i < 48; i++) click('[data-act="cal-mon"][data-v="1"]');
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

  // 기록 고침: 세트 복습은 80% 이상 끝냈을 때만(이어서는 남은 것만), 복습 날이 아니면 기록 없음, 오답 1번 앎, 같은 날 두 번 올리지 않기,
  // 테스트 기록 한 번, 주소가 바뀌면 창 닫기, 타이머 바꿀 때 묻기, 별표·앱 모의·단원 외우기, 새 기록 열쇠와 백업
  {
    const D0 = '2026-10-19', ymdOf = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    const T0 = ymdOf(new w.Date()), ago = n => { const x = new w.Date(); x.setDate(x.getDate() - n); return ymdOf(x); };
    const keep = JSON.stringify({ cards: S().cards, wrong: S().wrong, sp: S().sp, log: S().log, tk: S().tk, resume: S().resume, mockp: S().mockp, lastMock: S().lastMock, qp: S().qp, essayStat: S().essayStat });
    const mw = () => d.querySelector('#modal-wrap'), toastTxt = () => d.querySelector('#toast').textContent;
    const freshDay = () => Object.values(S().cards).forEach(p => { if (p.last === T0) p.last = ago(30); });   // 오늘 매긴 카드가 없는 날처럼
    const due = first => { S().sp[D0] = { read: {}, quiz: {}, tasks: {}, essay: {}, rev: {}, first }; freshDay(); };
    const revKeys = () => Object.keys((S().sp[D0] || {}).rev || {}).join();
    const sheet = async (dd, act) => { await go('#review'); click(`[data-act="rev-open"][data-d="${dd}"]`); await sleep(10); click(`[data-act="${act}"]`, mw()); await sleep(20); return pe.SES(); };
    const doItem = g => { const it = pe.SES().items[pe.SES().i]; if (it.type === 'card') { click('[data-act="sess-flip"]'); click(`[data-act="sess-grade"][data-g="${g}"]`); } else { click('[data-act="sess-pick"][data-k="0"]'); click('[data-act="sess-next"]'); } };
    const skipCard = () => click('[data-act="sess-skip"]');
    const primaries = () => view().querySelectorAll('.btn:not(.sec):not(.ghost)').length;

    // 하루 공부 시간과 날의 종류(새 기록 S.settings.budget)
    const P = pe.PLAN(), bg0 = S().settings.budget;
    ok(pe.dayKind(P.mock.d) === 'exam' && pe.dayKind(P.target.d) === 'exam' && pe.dayKind('2027-01-27') === 'pre3' && pe.dayKind('2027-01-29') === 'pre3' && pe.dayKind('2027-01-26') === 'wd' && pe.dayKind('2026-12-25') === 'holi' && pe.dayKind('2026-10-31') === 'sat' && pe.dayKind('2026-11-01') === 'sun', '날의 종류: 시험 날·시험 전 평일 3일·평일 공휴일·토·일');
    ok(JSON.stringify(bg0) === '{"wd":180,"sat":300,"sun":240}' && pe.budgetOf('2026-11-02') === 180 && pe.budgetOf('2026-10-31') === 300 && pe.budgetOf('2026-11-01') === 240 && pe.budgetOf('2026-12-25') === 240 && pe.budgetOf('2027-01-27') === 180 && pe.budgetOf(P.mock.d) === 0 && pe.budgetOf('2027-01-23') === 430, '하루 공부 시간: 평일 180·토 300·일과 공휴일 240·시험 전 3일 평일·시험 날 0·리허설 토요일 430');
    S().settings.budget = { wd: 150 }; const b1 = [pe.budgetOf('2026-11-02'), pe.budgetOf('2026-10-31'), pe.budgetOf('2026-11-01')].join();
    S().settings.budget = { wd: 'x' }; const b2 = pe.budgetOf('2026-11-02'); S().settings.budget = bg0;
    ok(b1 === '150,300,240' && b2 === 180, '하루 공부 시간: 고친 칸만 바뀌고 숫자가 아니면 기본값');

    // D2: 연 적 없는 세트도 처음 쓰는 순간 세트 복습 시계가 돈다(화면을 그리기만 해서는 안 생김)
    await go('#more'); delete S().sp[D0]; S().resume = {};   // 세트 화면을 여는 것은 그대로 시계를 돌리므로(T13) 다른 화면에서
    const rc0 = d.createElement('button'); rc0.dataset.act = 'resume-clear'; rc0.dataset.k = `memo:set:${D0} flash:${D0}`; view().appendChild(rc0); click('[data-act="resume-clear"]'); await sleep(10);
    await go('#today'); await go('#review');
    ok(!S().sp[D0] && view().querySelector(`[data-act="rev-open"][data-d="${D0}"]`), 'D2: 오늘·복습 화면을 그려도 세트 진행 기록이 생기지 않음');
    click(`[data-act="rev-open"][data-d="${D0}"]`); await sleep(10); click('[data-act="memo-set"]', mw()); await sleep(20);
    ok(pe.MEMO() && pe.MEMO().setD === D0 && S().sp[D0] && S().sp[D0].first === T0, 'D2: 열지 않은 세트를 가리며 외우기로 보면 그날부터 세트 복습 시계(first)');

    // D3: 복습 날 세트 복습은 항목의 80% 이상을 끝냈을 때만 친다
    due(ago(3)); let ses = await sheet(D0, 'start-setrev');
    ok(ses && ses.kind === 'rev' && ses.items.length === 15 && ses.items.filter(it => it.type === 'card').length === 10 && ses.rv.length === 1 && ses.rv[0].step === 3, 'D3: 3일 차 세트 복습 15항목(카드 10, 퀴즈 5)');
    for (let k = 0; k < 15 && pe.SES().items[pe.SES().i]; k++) { if (pe.SES().items[pe.SES().i].type === 'card') skipCard(); else doItem(0); }
    ok(/건너뛴 문제가 많아 오늘 세트 복습으로 치지 않았어요 \(5\/15\)/.test(txt()) && revKeys() === '', 'D3: 카드를 넘기기만 하고 끝내면 세트 복습으로 치지 않음(5/15)');
    ok(primaries() === 1 && view().querySelector('.btn:not(.sec)[data-act="sess-rest"]') && /이어서 · 남은 10문제/.test(txt()) && view().querySelector('.btn.sec[data-act="sess-close"]'), 'D3: 끝 화면의 파란 버튼 하나 "이어서 · 남은 10문제", 돌아가기는 회색');
    const s1 = pe.SES(), hl = w.history.length; click('[data-act="sess-rest"]'); await sleep(20); ses = pe.SES();
    ok(ses !== s1 && ses.kind === 'rev' && ses.items.length === 10 && ses.items.every((it, i) => it === s1.items[i]) && ses.i === 0 && w.location.hash === '#sess' && w.history.length === hl, 'D3: 이어서 = 안 한 10항목만(같은 화면, 방문 기록 그대로)');
    ok(ses.acc && ses.acc.a === 5 && ses.acc.n === 15 && ses.acc.d === D0 && ses.acc.step === 3 && ses.from === s1.from, 'D3: 이어서는 앞에서 한 5/15를 이어 셈(SES.acc), 돌아갈 곳도 그대로');
    for (let k = 0; k < 10; k++) { if (k < 3) doItem(2); else skipCard(); }
    ok(/\(8\/15\)/.test(txt()) && /이어서 · 남은 7문제/.test(txt()) && revKeys() === '', 'D3: 이어서 한 것까지 8/15면 아직 치지 않음');
    click('[data-act="sess-rest"]'); await sleep(20); ses = pe.SES();
    ok(ses.items.length === 7 && ses.acc.a === 8 && ses.acc.n === 15, 'D3: 다시 이어서도 남은 7항목, 8/15부터');
    for (let k = 0; k < 7; k++) { if (k < 4) doItem(1); else skipCard(); }
    ok(revKeys() === '1,3' && !/건너뛴 문제가 많아/.test(txt()) && primaries() === 1 && view().querySelector('.btn:not(.sec)[data-act="end-go"]') && /오늘 순서로|오늘 몫 끝 · 오늘로|오늘로/.test(view().querySelector('.btn:not(.sec)[data-act="end-go"]').textContent) && view().querySelector('.btn.sec[data-act="sess-close"]') && /복습으로/.test(view().querySelector('.btn.sec[data-act="sess-close"]').textContent), 'D3: 앞 세션과 합쳐 12/15를 채우면 그날 세트 복습(1·3일 차), 끝 화면은 "오늘 순서로" 하나와 "복습으로"');
    due(ago(3)); await sheet(D0, 'start-setrev');
    for (let k = 0; k < 15 && pe.SES().items[pe.SES().i]; k++) { if (pe.SES().items[pe.SES().i].type === 'card' && k >= 7) skipCard(); else doItem(2); }
    ok(revKeys() === '1,3' && !/건너뛴/.test(txt()), 'D3: 15항목 중 12개(카드 7, 퀴즈 5)를 하면 바로 세트 복습으로 침');
    // 카드 넘겨 보기는 뒷면을 본 카드를 끝낸 것으로 센다
    due(ago(3)); ses = await sheet(D0, 'set-flash');
    ok(ses && ses.kind === 'flash' && ses.setD === D0 && ses.items.length === 10, '넘겨 보기 세션(flash)');
    for (let k = 0; k < 10; k++) skipCard();
    ok(revKeys() === '' && /건너뛴 문제가 많아 오늘 세트 복습으로 치지 않았어요 \(0\/10\)/.test(txt()), 'D3: 넘겨 보기를 넘기기만 하면 세트 복습이 아님');
    ses = await sheet(D0, 'set-flash');
    for (let k = 0; k < 10; k++) { click('[data-act="sess-flip"]'); skipCard(); }
    ok(revKeys() === '1,3' && ses.kind === 'flash' && Object.keys(ses.done).length === 10 && ses.stats.ok + ses.stats.mid + ses.stats.no === 0, 'D3: 매기지 않아도 10장 뒷면을 다 보면 세트 복습');
    // 중간부터 이어서 한 세션: 앞에서 이미 한 것(용어 퀴즈 기록, 세트 읽음)은 끝낸 것으로 센다
    due(ago(3)); const GL = pe.gqList(D0); S().sp[D0].gq = { s: GL.sig, r: GL.items.map((_, n) => n < 7 ? '1' : '-').join('') };
    ses = await sheet(D0, 'gq-go');
    ok(ses && ses.kind === 'gq' && ses.items.length === 15 && ses.i === 7 && Object.keys(ses.done).join() === '0,1,2,3,4,5,6', 'D3: 반쯤 푼 용어 퀴즈 회차를 이어 풀면 앞에서 푼 7문은 끝낸 것');
    for (let k = 0; k < 8 && pe.SES().items[pe.SES().i]; k++) doItem(0);
    ok(revKeys() === '1,3' && !/건너뛴/.test(txt()) && !view().querySelector('[data-act="sess-rest"]'), 'D3: 이어 푼 회차를 끝까지 풀면 세트 복습(앞의 7문 + 오늘 8문)');
    due(ago(3)); [0, 1, 2, 3, 4].forEach(i => { S().sp[D0].read[i] = 1; }); S().resume = { ['flash:' + D0]: { i: 5, n: 10, day: T0 } };
    ses = await sheet(D0, 'set-flash');
    ok(ses && ses.kind === 'flash' && ses.i === 5 && Object.keys(ses.done).join() === '0,1,2,3,4', 'D3: 앱을 껐다 켜고 넘겨 보기를 6번째 카드부터 이어서 하면 앞의 본 카드 5장은 끝낸 것');
    for (let k = 0; k < 5; k++) doItem(2);
    ok(revKeys() === '1,3' && !/건너뛴/.test(txt()), 'D3: 이어서 넘겨 보기를 끝까지 하면 세트 복습');
    due(ago(3)); S().resume = { ['flash:' + D0]: { i: 5, n: 10, day: T0 } };
    ses = await sheet(D0, 'set-flash'); for (let k = 0; k < 5; k++) doItem(2);
    ok(ses.i === 10 && revKeys() === '' && /건너뛴 문제가 많아 오늘 세트 복습으로 치지 않았어요 \(5\/10\)/.test(txt()) && /이어서 · 남은 5문제/.test(txt()), 'D3: 앞 5장을 보지 않고 넘기기만 했으면(읽음 없음) 이어서 끝까지 해도 아직 아님(5/10)');
    click('[data-act="sess-rest"]'); await sleep(20);
    ok(pe.SES().items.map(it => it.si).join() === '0,1,2,3,4', 'D3: 이어서 = 넘기기만 한 앞 5장');
    for (let k = 0; k < 5; k++) { click('[data-act="sess-flip"]'); skipCard(); }
    ok(revKeys() === '1,3', 'D3: 그 5장 뒷면까지 보면 세트 복습');
    // D4: 복습 날이 아닌 세트는 끝까지 해도 세트 복습 기록을 남기지 않는다(다음 복습 날을 먹지 않음)
    due(T0); ses = await sheet(D0, 'start-setrev');
    ok(ses && ses.kind === 'rev' && ses.rv.length === 0, 'D4: 복습 날이 아닌 세트 다시 보기');
    for (let k = 0; k < 15 && pe.SES().items[pe.SES().i]; k++) doItem(2);
    ok(revKeys() === '' && /완료/.test(txt()) && !/건너뛴/.test(txt()), 'D4: 끝까지 해도 세트 복습 기록은 그대로');
    // 카드를 모두 오늘 매겨 항목이 없는(퀴즈 없는) 세트의 복습은 바로 친다
    const DC = '2026-10-20'; pe.SETS().sets[DC] = Object.assign({}, pe.SETS().sets[D0], { date: DC, quiz: [] }); S().sp[DC] = { read: {}, quiz: {}, tasks: {}, essay: {}, rev: {}, first: ago(1) };
    pe.setReviewItems(DC).forEach(it => { S().cards[it.id] = Object.assign({ box: 1, due: '2000-01-01', seen: 1, ok: 0, ng: 0, star: false }, S().cards[it.id] || {}, { last: T0 }); });
    const sesC = pe.SES(); await go('#review'); click(`[data-act="rev-open"][data-d="${DC}"]`); await sleep(10); click('[data-act="start-setrev"]', mw()); await sleep(20);
    ok(Object.keys(S().sp[DC].rev).join() === '1' && pe.SES() === sesC && !mw().innerHTML && /오늘 이미 본 카드라 세트 복습으로 쳤어요/.test(toastTxt()), '카드를 모두 오늘 매긴 퀴즈 없는 세트: 바로 세트 복습으로 침');
    delete pe.SETS().sets[DC]; delete S().sp[DC];

    // D1·E1: 오답 카드는 "앎" 한 번에 빠지지 않고(1번 맞힘), 오늘 매긴 카드는 그 세트 복습에 다시 나오지 않는다
    due(ago(3)); const X = pe.setReviewItems(D0).find(it => it.type === 'card').id;
    S().wrong = { ['C:' + X]: { type: 'card', since: ago(5), n: 1, last: ago(5), streak: 0 } };
    await go('#review'); click('[data-act="start-wrong"]'); await sleep(20);
    ok(pe.SES().kind === 'wrong' && pe.SES().items.length === 1 && pe.SES().items[0].id === X, '오답 다시 풀기(wrong)');
    click('[data-act="sess-flip"]'); click('[data-act="sess-grade"][data-g="2"]'); await sleep(10);
    ok(S().wrong['C:' + X] && S().wrong['C:' + X].streak === 1, 'D1: 오답 카드를 한 번 앎으로 고르면 오답 노트에 남음(1번 맞힘)');
    ok(S().tk['wrong:' + T0] === T0, '오답을 끝까지 풀면 오늘 오답 할 일로 남음(S.tk)');
    ok(!pe.setReviewItems(D0).some(it => it.id === X) && pe.setReviewItems(D0).filter(it => it.type === 'quiz').length === 5, 'E1: 오답에서 오늘 매긴 카드는 그 세트 복습에서 빠짐(퀴즈는 그대로)');
    await go('#review'); click('[data-act="start-wrong"]'); await sleep(20); click('[data-act="sess-flip"]'); click('[data-act="sess-grade"][data-g="2"]'); await sleep(10);
    ok(!S().wrong['C:' + X], 'D1: 다음에 또 앎이면(두 번 연속) 오답 노트에서 빠짐');
    S().wrong = { ['Q:' + D0 + ':0']: { type: 'quiz', since: ago(5), n: 1, last: ago(5), streak: 0 }, ['C:' + X]: { type: 'card', since: ago(5), n: 1, last: ago(5), streak: 0 } };
    pe.startWrong({ skipQ: D0 }); await sleep(20);
    ok(pe.SES().items.length === 1 && pe.SES().items[0].type === 'card', '오답 다시 풀기 skipQ: 그날 세트의 퀴즈 오답은 뺌');
    S().wrong = {};
    // 카드 복습: 오늘 매긴 카드와 오늘 세트 복습 카드(skip)는 빼고 k장, 그만큼 매기면 오늘 카드 복습 할 일로 남음
    const dk = pe.deck().filter(c => !(S().cards[c.id] && S().cards[c.id].seen)).slice(0, 4).map(c => c.id);
    dk.forEach((id, j) => { S().cards[id] = { box: 1, due: '2000-01-0' + (j + 1), seen: 1, ok: 0, ng: 0, star: false, last: j ? '2000-01-01' : T0 }; });
    pe.startDueAll({ k: 2, skip: [dk[1]] }); await sleep(20);
    ok(pe.SES().kind === 'cards' && pe.SES().items.map(it => it.id).join() === dk[2] + ',' + dk[3], 'E1: 카드 복습은 오늘 매긴 카드와 skip 카드를 빼고 k장');
    for (let k = 0; k < 2; k++) { click('[data-act="sess-flip"]'); click('[data-act="sess-grade"][data-g="2"]'); }
    ok(S().tk['cards:' + T0] === T0, '카드 복습 k장을 다 매기면 오늘 카드 복습 할 일로 남음(S.tk)');
    // 오늘 화면 "카드 복습" 수는 카드 복습 세션과 같은 목록(오늘 매긴 카드는 뺌). 빈 세션을 눌러도 하던 세션은 그대로.
    // 진짜 날짜로 돌므로 줄이 어디에 있든(오늘 몫 줄·펼친 줄·시간이 되면·다른 날로 옮긴 것) 그 줄의 시작으로 연다(펼친 줄은 줄 안의 버튼).
    // 공부 시간을 넉넉히 해 오늘 몫을 새로 짠다(단계 0: 카드 복습을 놓아주지 않음). 시험 날·시험 뒤처럼 카드 복습 할 일이 없는 날은 건너뜀
    const cardsRow = () => view().querySelector(`[data-task="cards:${T0}"]`);
    const cardsGo = () => { const r = cardsRow(), b = r && (r.matches('button[data-act]') ? r : r.querySelector('button[data-act="task"], button[data-act="resume"]')); if (!b) { fails++; console.log('FAIL: 카드 복습 줄에 시작 버튼이 없음'); return null; } b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return b; };
    const dueRow = () => { const r = cardsRow(); if (!r || r.classList.contains('done')) return 0; const m = /카드 복습 (\d+)장/.exec(r.textContent); return m ? Number(m[1]) : NaN; };
    Object.values(S().cards).forEach(p => { p.due = '2099-01-01'; }); const dz = pe.deck().slice(0, 3).map(c => c.id);
    dz.forEach(id => { S().cards[id] = { box: 2, due: '2000-01-01', seen: 2, ok: 1, ng: 0, star: false, last: '2000-01-01' }; });
    delete S().tk['cards:' + T0];   // 바로 위에서 다 한 카드 복습 할 일을 지워 오늘 몫 줄이 남은 일로 보이게
    const bgC = S().settings.budget, tdC = S().today; S().settings.budget = { wd: 900, sat: 900, sun: 900 }; S().today = null;
    if (pe.taskList(T0).some(x => x.k === 'cards')) {
      await go('#today'); pe.render(); const dn0 = dueRow(); cardsGo(); await sleep(20);
      ok(dn0 === 3 && pe.SES() && pe.SES().kind === 'cards' && pe.SES().items.length === 3, '오늘 몫 "카드 복습 3장" = 카드 복습 세션 3장');
      for (let k = 0; k < 3; k++) { click('[data-act="sess-flip"]'); click('[data-act="sess-grade"][data-g="0"]'); }
      const live = pe.SES(); await go('#today');
      ok(dueRow() === 0 && (!cardsRow() || cardsRow().classList.contains('done')), 'E1: 오늘 모름으로 매긴 카드는 오늘 화면 카드 복습 수에서도 빠짐(줄이 끝으로)');
      if (cardsRow()) { cardsGo(); await sleep(20); ok(pe.SES() === live && w.location.hash === '#today', '끝난 카드 복습 줄을 눌러도 하던 세션은 그대로'); }
      pe.startDueAll(); await sleep(20);
      ok(pe.SES() === live && live.i === 3 && w.location.hash === '#today' && /이 범위에 문제가 없어요/.test(toastTxt()), '카드 복습할 카드가 없을 때 눌러도 하던 세션은 그대로');
    } else console.log(`   (${T0}: 카드 복습 할 일이 없는 날(시험 날·시험 뒤)이라 오늘 화면의 카드 복습 줄 검사는 건너뜀)`);
    S().settings.budget = bgC; S().today = tdC;

    // T3: 테스트 기록은 끝 화면에서 한 번 남는다(돌아가기를 누르지 않고 뒤로 가도)
    await go('#more'); await go('#test'); const nl = S().log.length;
    click('[data-act="start-mcq"]'); await sleep(20);
    click('[data-act="sess-pick"][data-k="0"]'); click('[data-act="sess-next"]'); click('[data-act="sess-pick"][data-k="1"]');
    pe.SES().i = pe.SES().items.length; pe.render(); pe.render();
    const lg = S().log[S().log.length - 1];
    ok(S().log.length === nl + 1 && lg.type === 'mcq' && lg.total === 2 && lg.d === T0, 'T3: 끝 화면에서 테스트 기록 한 번(다시 그려도 한 번)');
    w.history.back(); await sleep(60);
    ok(w.location.hash !== '#sess' && S().log.length === nl + 1, 'T3: 끝 화면에서 뒤로 가도 기록은 하나');
    await go('#sess'); click('[data-act="sess-close"]'); await sleep(30);
    ok(S().log.length === nl + 1 && !pe.SES(), 'T3: 돌아가기를 눌러도 더 남기지 않음');

    // T8: 주소가 바뀌면(뒤로·앞으로 가기 포함) 열린 창을 닫는다
    await go('#review'); click(`[data-act="rev-open"][data-d="${D0}"]`); await sleep(10);
    const hadM = !!mw().innerHTML; w.location.hash = '#more'; await sleep(30);
    ok(hadM && !mw().innerHTML && w.location.hash === '#more', 'T8: 창이 열린 채 주소가 바뀌면 창이 닫힘');
    await go('#review'); click(`[data-act="rev-open"][data-d="${D0}"]`); await sleep(10); w.history.back(); await sleep(60);
    ok(!mw().innerHTML && w.location.hash === '#more', 'T8: 창이 열린 채 뒤로 가도 창이 닫힘');

    // T9: 돌고 있는 타이머를 다른 것으로 바꿀 때는 먼저 묻고, 취소하면 그대로
    {
      let T = 2e12; const realNow = w.Date.now; w.Date.now = () => T; const asked = [], rc = w.confirm, TM = pe.TM();
      const answer = yes => { w.confirm = m => { asked.push(m); return yes; }; };
      await go('#timer'); click('[data-act="timer-reset"]'); click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10);
      click('[data-act="timer-toggle"]'); await sleep(10); T += 60000; await sleep(300); const r0 = TM.remain;
      ok(TM.running && TM.preset === 'essay' && r0 === 5940, 'T9: 논술 교시 타이머가 1분 돌아감');
      answer(false); click('[data-act="timer-preset"][data-p="one1"]'); await sleep(10);
      ok(asked.length === 1 && asked[0] === '돌고 있는 논술 교시 타이머(남은 99:00)를 멈추고 단답 1문 10분으로 바꿀까요?' && TM.preset === 'essay' && TM.remain === r0 && TM.running, 'T9: 다른 타이머를 고르면 묻고, 취소하면 그대로(timer-preset)');
      click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10);
      ok(asked.length === 1 && TM.running && TM.remain === r0, 'T9: 타이머 화면에서 돌고 있는 그 칸을 다시 누르면 묻지 않고 그대로');
      await go('#kichul/r/140'); click('[data-act="timer-go"][data-p="p1"]'); await sleep(30);
      ok(asked.length === 2 && /를 멈추고 1교시 단답 100분으로 바꿀까요\?$/.test(asked[1]) && w.location.hash === '#timer' && TM.preset === 'essay' && TM.remain === r0 && TM.running, 'T9: 다른 화면의 타이머 버튼도 묻고, 취소하면 돌던 타이머 화면으로(timer-go)');
      answer(true); click('[data-act="timer-preset"][data-p="custom"]'); await sleep(10);
      ok(asked.length === 3 && TM.preset === 'custom' && !TM.running && TM.remain === TM.custom * 60, 'T9: 확인하면 바꿈');
      click('[data-act="timer-toggle"]'); await sleep(10); T += 30000; await sleep(300); const r1 = TM.remain, c1 = TM.custom;
      answer(false); d.querySelector('#tmCustom').value = String(c1 + 7); click('[data-act="timer-custom"]'); await sleep(10);
      ok(asked.length === 4 && new RegExp(`직접 ${c1 + 7}분으로 바꿀까요`).test(asked[3]) && TM.custom === c1 && TM.remain === r1 && TM.running, 'T9: 직접 분 맞추기도 묻고, 취소하면 그대로(timer-custom)');
      click('[data-act="timer-reset"]'); w.confirm = rc; w.Date.now = realNow; click('[data-act="timer-preset"][data-p="essay"]'); await sleep(10);
      ok(TM.preset === 'essay' && !TM.running && asked.length === 4, 'T9: 멈춰 있는(처음 상태) 타이머는 묻지 않고 바꿈');
      // 같은 타이머를 다른 화면의 타이머 버튼으로: 돌고 있으면 묻고(취소하면 그대로), 멈춰 두었으면 묻지 않고 새로(다음 문제)
      w.Date.now = () => T; answer(false); await go('#timer'); click('[data-act="timer-toggle"]'); await sleep(10); T += 60000; await sleep(300);
      await go('#kichul/r/140'); click('[data-act="timer-go"][data-p="essay"]'); await sleep(30);
      ok(asked.length === 5 && asked[4] === '돌고 있는 논술 교시 타이머(남은 99:00)를 멈추고 논술 교시 100분으로 바꿀까요?' && w.location.hash === '#timer' && TM.preset === 'essay' && TM.running && TM.remain === 5940, 'T9: 돌고 있는 그 타이머를 다른 화면에서 다시 누르면 묻고, 취소하면 돌던 그대로(timer-go)');
      click('[data-act="timer-toggle"]'); await sleep(10); await go('#kichul/r/140'); click('[data-act="timer-go"][data-p="essay"]'); await sleep(30);
      ok(asked.length === 5 && w.location.hash === '#timer' && TM.preset === 'essay' && !TM.running && TM.remain === TM.total && TM.total === 6000, 'T9: 멈춰 둔 그 타이머는 다른 화면의 버튼(다음 문제)에서 묻지 않고 새로 맞춤(timer-go)');
      w.confirm = rc; w.Date.now = realNow;
    }

    // E3: 기출 문항 창(카드가 든 창)에서 별표를 눌러도 그 창 그대로
    await go('#kichul/r/140'); click('.paper-q[data-id="140-1-05"]'); await sleep(10);
    const qn = mw().querySelector('.qnum').textContent, nst = mw().querySelectorAll('[data-act="star"]').length, sid = mw().querySelector('[data-act="star"]').dataset.id, st0 = !!(S().cards[sid] && S().cards[sid].star);
    click('[data-act="star"]', mw()); await sleep(10);
    ok(mw().querySelector('.qnum') && mw().querySelector('.qnum').textContent === qn && mw().querySelectorAll('[data-act="star"]').length === nst && !!S().cards[sid].star === !st0 && mw().querySelector('[data-act="star"]').textContent === (st0 ? '☆ 별표' : '★ 별표 해제'), 'E3: 기출 문항 창에서 별표를 눌러도 창은 그대로(버튼만 바뀜)');
    click('[data-act="star"]', mw()); await sleep(10); click('#modal-wrap .modal'); await sleep(10);

    // E2: 앱 모의고사를 새로 만들면 "다 썼어요"를 비우고 시작
    S().mockp.app = { p1: true, p2: true }; await go('#test'); click('[data-act="gen-mock"]'); await sleep(30);
    const mds = [...view().querySelectorAll('[data-act="mock-done"]')];
    ok(w.location.hash === '#mock/app' && !S().mockp.app && mds.length >= 4 && mds.every(x => !x.checked), 'E2: 새 앱 모의고사는 다 썼어요가 비어 있음');

    // E5: 단원 진도의 "이 단원 카드 외우기"는 범위(S.range)를 바꾸지 않는다
    const rg0 = S().range, cu = pe.deck()[0], u0 = Number(cu.u);
    S().cards[cu.id] = Object.assign({ box: 1, ok: 0, ng: 0, star: false }, S().cards[cu.id] || {}, { seen: 1, due: '2000-01-01', last: '2000-01-01' });
    await go('#study'); click(`[data-act="study-unit"][data-u="${u0}"]`); await sleep(20);
    ok(S().range === rg0 && pe.SES() && pe.SES().kind === 'study' && pe.SES().items.length > 0 && pe.SES().items.every(it => Number(pe.deck().find(c => c.id === it.id).u) === u0), 'E5: 이 단원 카드 외우기는 그 단원 카드로, 범위는 그대로');

    // 새 기록(S.tk·S.today·S.wk·하루 공부 시간)은 백업에 그대로 들어가고, 예전 백업은 기본값으로 복원
    S().tk['x.book:' + T0] = T0; S().today = { d: T0, at: '07:40', v: 1, lv: 0, cap: 180, user: null, sig: 'x', rows: [{ id: 'set.read:' + T0, m: 10, tgt: null, blk: 'am' }] };
    S().wk = { [ago(0)]: { cut: false, cph: 1 } }; S().settings.budget = { wd: 150, sat: 300, sun: 240 };
    const bk = JSON.parse(JSON.stringify({ state: S(), sets: pe.SETS() }));
    ok(bk.state.tk['x.book:' + T0] === T0 && bk.state.today && bk.state.today.rows[0].m === 10 && bk.state.wk[ago(0)].cph === 1 && bk.state.settings.budget.wd === 150, '백업 JSON에 S.tk·S.today·S.wk·하루 공부 시간이 그대로');
    await go('#backup'); d.querySelector('#restoreText').value = JSON.stringify(bk); click('[data-act="restore"]'); const rT = S().today; await sleep(40);
    ok(S().tk['x.book:' + T0] === T0 && rT === null && S().wk[ago(0)].cph === 1 && S().settings.budget.wd === 150, '복원: 할 일·주간 기록·공부 시간은 그대로, 오늘 몫은 새로 짬(S.today=null)');
    ok(!S().today || S().today.sig !== 'x', '복원 뒤 오늘 화면은 백업의 고정 목록이 아니라 새로 짠 오늘 몫');
    const old = JSON.parse(JSON.stringify(bk)); delete old.state.tk; delete old.state.today; delete old.state.wk; delete old.state.settings.budget;
    await go('#backup'); d.querySelector('#restoreText').value = JSON.stringify(old); click('[data-act="restore"]'); const oT = S().today, oW = JSON.stringify(S().wk), oK = JSON.stringify(S().tk); await sleep(40);
    ok(oK === '{}' && oT === null && oW === '{}' && JSON.stringify(S().settings.budget) === '{"wd":180,"sat":300,"sun":240}' && Object.keys(S().cards).length === Object.keys(bk.state.cards).length && JSON.stringify(S().sp) === JSON.stringify(bk.state.sp), '예전 백업(새 열쇠 없음)을 복원하면 tk·today·wk·공부 시간은 기본값, 나머지 기록은 그대로');
    const K = JSON.parse(keep); Object.keys(K).forEach(k => { S()[k] = K[k]; }); pe.render(); await go('#today');
  }

  // 내비게이션: 주소는 늘 바꿔 쓴다(앱 안에서 움직여도 방문 기록이 늘지 않음). 위쪽 뒤로·닫기·왼쪽 가장자리 밀기는 위 화면(들어온 곳 → 부모)으로, 탭은 그 탭 첫 화면으로.
  // 끝난 세션·외우기의 빈 화면은 어디로도 닿지 않고, 아래 탭 강조는 흐름을 시작한 탭, 세션·외우기는 집중 모드(아래 탭 숨김, 위쪽 "닫기")
  {
    const D0 = '2026-10-19', mw = () => d.querySelector('#modal-wrap');
    const keep = JSON.stringify({ cards: S().cards, wrong: S().wrong, sp: S().sp, log: S().log, tk: S().tk, resume: S().resume, daily: S().daily, cal: S().cal, mockp: S().mockp, qp: S().qp, essayStat: S().essayStat, memoCfg: S().settings.memo || null });
    S().settings.memo = { show: 10, hide: 5, mode: 'all', n: 2, reps: 3, auto: 1 };
    const cssTxt = fs.readFileSync(path.join(SITE, 'styles.css'), 'utf8');
    const H = () => w.location.hash, L = () => w.history.length, tabOn = () => [...d.querySelectorAll('#nav button.on')].map(b => b.dataset.tab).join();
    const upTxt = () => { const b = d.querySelector('.topbar [data-act="back"]'); return b ? b.textContent.trim() : ''; };
    const tap = async (sel, root) => { click(sel, root); await sleep(60); };
    const back = () => tap('.topbar [data-act="back"]'), tab = t => tap(`#nav button[data-tab="${t}"]`);
    const edge = async (x0, x1, dy, el) => { el = el || view(); const a = new w.Event('touchstart', { bubbles: true }); a.touches = [{ clientX: x0, clientY: 300 }]; el.dispatchEvent(a); const b = new w.Event('touchend', { bubbles: true }); b.changedTouches = [{ clientX: x1, clientY: 300 + (dy || 0) }]; el.dispatchEvent(b); await sleep(60); };
    const emptyFlow = () => /진행 중인 (학습이|외우기가) 없어요/.test(txt()), focus = () => d.body.classList.contains('focus');
    const primaries = () => view().querySelectorAll('.btn:not(.sec):not(.ghost)').length;
    const toSet = async () => { await tab('today'); pe.go('set/' + D0); await sleep(60); };   // 오늘 몫 줄의 "시작"과 같은 길(오늘에서 세트로)
    const cardsTab = async () => { click('[data-act="set-tab"][data-t="cards"]'); await sleep(20); if (view().querySelector('[data-act="resume-clear"]')) await tap('[data-act="resume-clear"]'); };

    // 아래 탭 다섯(오늘 · 이번 주 · 복습 · 연습 · 더보기). 탭은 바꿔 쓰기만 해서 쌓이지 않고(T7), 탭 첫 화면에서 가장자리를 밀어도 아무 데도 가지 않는다(I)
    // 탭 이름은 버튼의 글자 마디만(이번 주 배지 .nb의 수는 빼고 읽는다: 배지가 뜨는 날에도 "이번 주")
    const navLab = b => [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(), navLabs = () => [...d.querySelectorAll('#nav button')].map(b => b.dataset.tab + ':' + navLab(b)).join();
    ok(navLabs() === 'today:오늘,week:이번 주,review:복습,practice:연습,more:더보기', '아래 탭 다섯: 오늘 · 이번 주 · 복습 · 연습 · 더보기');
    const h1 = () => (view().querySelector('.ltitle h1') || {}).textContent || '';
    await go('#today'); let hl = L();
    await tab('week');
    ok(H() === '#week' && L() === hl && tabOn() === 'week' && !view().querySelector('.topbar') && h1() === '이번 주', '오늘 → 탭 이번 주: 탭 첫 화면(위쪽 막대 없음), 방문 기록 그대로');
    await tab('practice');
    ok(H() === '#practice' && L() === hl && tabOn() === 'practice' && !view().querySelector('.topbar') && h1() === '연습' && primaries() === 0, '이번 주 → 탭 연습: 방문 기록 그대로, 연습은 파란 버튼 없는 모음');
    await edge(8, 150);
    ok(H() === '#practice' && L() === hl && !emptyFlow(), 'I: 오늘 → 이번 주 → 연습 뒤 탭 첫 화면에서 왼쪽 가장자리 밀기는 그대로(탭이 쌓이지 않음)');
    await tab('review'); await tab('more');
    ok(H() === '#more' && L() === hl && tabOn() === 'more', 'T7: 탭을 네 번 바꿔도 방문 기록이 그대로(탭이 쌓이지 않음)');
    await edge(8, 150);
    ok(H() === '#more' && L() === hl && !emptyFlow(), 'I: 더보기에서도 가장자리 밀기는 그대로');
    await tap('#nav button[data-tab="more"]');
    ok(H() === '#more' && L() === hl, '지금 탭을 다시 눌러도 그대로(맨 위로)');
    // 예전 주소 #study(암기)·#test(테스트)는 연습 탭으로(주소는 그대로, 탭 강조는 연습). 검사들이 누르는 버튼이 모두 연습 탭에 있다
    for (const h of ['#study', '#test']) {
      await go(h);
      ok(H() === h && tabOn() === 'practice' && h1() === '연습' && ['start-due', 'start-study', 'start-free', 'memo-study', 'start-mcq', 'start-recall', 'start-cloze', 'start-fill', 'start-outline', 'dd-rand', 'gen-mock', 'study-unit'].every(a => view().querySelector(`[data-act="${a}"]`)) && view().querySelector('[data-act="go"][data-h="kichul"]'), `예전 주소 ${h} → 연습 탭(카드·문제·실전·단원별 진도 버튼 모두)`);
    }
    hl = L(); await tab('practice'); ok(H() === '#practice' && L() === hl && tabOn() === 'practice', '예전 주소에서 탭 연습 → #practice(방문 기록 그대로)');
    // 범위에 카드가 없으면(별표가 하나도 없는 "별표 카드") 자유 연습·가리며 외우기는 0장이라 쓰지 않고 "이 범위에 카드가 없어요"(새 카드 줄처럼)
    { const rg = S().range, st = Object.keys(S().cards).filter(id => S().cards[id].star).map(id => [id, S().cards[id].star]); st.forEach(([id]) => { S().cards[id].star = false; });
      S().range = 'stars'; pe.render();
      const rt = a => ((view().querySelector(`[data-act="${a}"]`) || {}).textContent || ''), mt = rt('memo-study');
      ok(/^자유 연습이 범위에 카드가 없어요$/.test(rt('start-free')) && !/0장/.test(rt('start-free') + mt) && (/이어서/.test(mt) || /^가리며 외우기이 범위에 카드가 없어요$/.test(mt)) && view().querySelector('[data-act="start-free"] .ic.gray'), `범위에 카드가 없으면: "자유 연습 · 이 범위에 카드가 없어요"(0장 없음), 가리며 외우기도(${mt})`);
      st.forEach(([id, v]) => { S().cards[id].star = v; }); S().range = rg; pe.render();
      ok(/^자유 연습 \d+장범위에서 섞어서$/.test(rt('start-free')), '범위를 되돌리면 자유 연습 n장'); }
    // 복습: 오답이 없어도 "오답 노트" 칸(빈 안내). 복습 탭에는 배지가 없다(밀린 수를 빨간 수로 세지 않음)
    { const wr = S().wrong; S().wrong = {}; await tab('review');
      ok(/오답 노트/.test(txt()) && /오답이 없어요 · 퀴즈·테스트에서 틀리거나 '모름'을 고르면 여기 모여요\./.test(txt()) && !d.querySelector('#nav button[data-tab="review"] .nb'), '복습: 오답이 없어도 "오답 노트" 칸, 복습 탭에 배지 없음');
      S().wrong = wr; pe.render(); }
    // 이번 주 탭 배지: 날짜가 3일 안인 일(원서접수 기간·48시간 복기)이 남았을 때만 빨간 수. 다음 회차를 내일 원서접수가 시작하는 날로 옮겨(시작일도 함께) 본다
    { const T0 = ymd, st0 = S().settings.start, rd0 = JSON.stringify(S().settings.roundDates || {}), tk0 = JSON.stringify(S().tk || {}), td0 = JSON.stringify(S().today || null);
      const addD = (x, n) => { const z = new w.Date(x + 'T12:00:00'); z.setDate(z.getDate() + n); return z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); };
      const nb = () => d.querySelector('#nav button[data-tab="week"] .nb'), rvb = () => d.querySelector('#nav button[data-tab="review"] .nb');
      const moveTo = ex => { S().settings.roundDates = Object.assign(JSON.parse(rd0), { [nx.r]: ex }); S().settings.start = addD(addD(T0, 33), -190); pe.recalcPlan(); S().today = null; pe.render(); };   // 시험 일정을 바꾸면 오늘 몫을 다시 고르듯(sch-save) 새로
      await tab('more'); const n0 = pe.navBadgeN();
      ok(!rvb() && (n0 ? nb() && nb().textContent === String(n0) : !nb()), `배지(지금 ${n0}개): 이번 주 탭에만, 날짜가 3일 안인 일만`);
      const nx = pe.roundList().find(x => x.d > T0);
      moveTo(addD(T0, 40)); const nFar = pe.navBadgeN(), farOk = pe.PLAN().target.r === nx.r && !pe.taskList(T0).some(x => x.id === 'apply:' + nx.r);
      moveTo(addD(T0, 33)); const n1 = pe.navBadgeN();
      ok(farOk && pe.PLAN().target.r === nx.r && n1 === nFar + 1 && pe.taskList(T0).some(x => x.id === 'apply:' + nx.r) && nb() && nb().textContent === String(n1) && nb().classList.contains('due') && !rvb(), `원서접수가 8일 뒤면 배지에 없고(${nFar}), 내일 시작하면 이번 주 탭에 빨간 ${n1}(오늘 몫의 원서접수 핀과 같은 날)`);
      ok(navLabs() === 'today:오늘,week:이번 주,review:복습,practice:연습,more:더보기' && nb(), '배지가 떠도 아래 탭 이름은 그대로(이번 주, 수는 배지에만)');
      // 배지가 세는 일은 이번 주 탭에도: "일요일까지 끝낼 것" 맨 위 원서접수 줄(동그라미, 누르면 접수했어요 → 배지에서 빠지고 ✓로 아래, 다시 누르면 되돌림). 오늘은 맨 위 핀만
      const aid = 'apply:' + nx.r, apl = () => view().querySelector(`#ql-apply[data-act="tk"][data-id="${aid}"]`), qls = () => [...view().querySelectorAll('.qline')], atTop = () => { const q = qls(), i = q.indexOf(apl()); return i >= 0 && q.slice(0, i).every(x => x.classList.contains('tkl') && !x.classList.contains('done')); };   // 맨 위(앞에는 다른 날짜 일 핀 줄만, 예: 전 회차 48시간 복기)
      await tab('today');
      ok(view().querySelector(`.pin [data-act="tk"][data-id="${aid}"]`) && !view().querySelector(`.wksec [data-id="${aid}"]`), '오늘: 원서접수는 맨 위 핀(아래 이번 주 칸에 다시 넣지 않음)');
      await tab('week'); const hl0 = L(), pw = [...view().querySelectorAll('.btn:not(.sec):not(.ghost)')];
      ok(apl() && atTop() && /큐넷 원서접수 · 제\d+회/.test(apl().textContent) && !apl().querySelector('.tkc.on') && pw.length <= 1 && !pw.some(b => b.dataset.id === aid), '이번 주 탭: 일요일까지 끝낼 것 맨 위에 원서접수 줄(동그라미), 파란 버튼은 그 줄이 아님');
      await tap('#ql-apply');
      const ai = qls().indexOf(apl());
      ok(S().tk[aid] === T0 && pe.navBadgeN() === nFar && (nFar ? nb().textContent === String(nFar) : !nb()) && H() === '#week' && L() === hl0 && apl().querySelector('.tkc.on') && /접수했어요/.test(apl().textContent) && qls().every((q, i) => (i < ai) !== q.classList.contains('done')), '이번 주 탭에서 원서접수 줄을 누르면 접수했어요(S.tk) → 배지에서 빠지고 줄은 ✓로 아래(주소·방문 기록 그대로)');
      await tap('#ql-apply');
      ok(!S().tk[aid] && pe.navBadgeN() === n1 && nb() && nb().textContent === String(n1) && atTop() && !apl().querySelector('.tkc.on'), '다시 누르면 되돌림(배지 다시 빨간 수, 줄은 맨 위로)');
      S().tk[aid] = T0; pe.render();
      ok(pe.navBadgeN() === nFar && (nFar ? nb().textContent === String(nFar) : !nb()), '"접수했어요"(S.tk) → 배지에서 빠짐');
      await tab('more');
      S().settings.start = st0; S().settings.roundDates = JSON.parse(rd0); S().tk = JSON.parse(tk0); S().today = JSON.parse(td0); pe.recalcPlan(); pe.render();
      ok(pe.navBadgeN() === n0 && pe.PLAN().start === st0, '(되돌림) 시작일·회차 날짜'); }
    // 준비 시작 전(시작일을 2주 뒤로)에도 이번 주 탭 아래 기록(학습 달력 · 세트 보관함 · 통계·주간 리포트 · 로드맵): 통계는 이번 주 탭에서만 들어간다(시험 뒤는 plan.test가 본다)
    { const st0 = S().settings.start, td0 = JSON.stringify(S().today || null), z = new w.Date(ymd + 'T12:00:00'); z.setDate(z.getDate() + 14);
      S().settings.start = z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); pe.recalcPlan();
      await tab('week'); const hl0 = L();
      ok(view().querySelector('.norows') && /준비 시작 전/.test(txt()) && ['cal', 'archive', 'stats', 'plan'].every(h => view().querySelector(`[data-act="go"][data-h="${h}"]`)) && primaries() === 1, '준비 시작 전 이번 주: 카드 하나(파란 버튼 하나) 아래 기록(학습 달력 · 세트 보관함 · 통계·주간 리포트 · 로드맵)');
      await tap('[data-act="go"][data-h="stats"]');
      ok(H() === '#stats' && L() === hl0 && upTxt() === '이번 주' && tabOn() === 'week' && /이번 주 필수/.test(txt()) && view().querySelector('[data-act="report"]'), '→ 통계·주간 리포트(위쪽 "이번 주", 리포트 복사 버튼)');
      await back(); ok(H() === '#week' && L() === hl0, '뒤로 → 이번 주(방문 기록 그대로)');
      S().settings.start = st0; S().today = JSON.parse(td0); pe.recalcPlan(); pe.render(); }

    // D: 오늘 → 세트 → ④ 논술 → 답안 작성 요령 → 모범 답안 → 뒤로 → 뒤로(아래 탭은 내내 오늘)
    await toSet(); hl = L();
    ok(H() === '#set/' + D0 && tabOn() === 'today' && upTxt() === '오늘', 'D: 오늘 → 세트(위쪽 "오늘", 아래 탭 오늘)');
    click('[data-act="set-tab"][data-t="essay"]'); await sleep(20);
    await tap('[data-act="go"][data-h="guide"]');
    ok(H() === '#guide' && tabOn() === 'today' && upTxt() === '세트', 'D: 세트 ④ → 답안 작성 요령(위쪽 "세트", 아래 탭은 오늘 그대로)');
    click('[data-act="guide-tab"][data-t="ex"]'); await sleep(20);
    await back();
    ok(H() === '#set/' + D0 && view().querySelector('[data-act="set-tab"][data-t="essay"].on') && tabOn() === 'today', 'D: 뒤로 → 세트 ④ 논술 탭 그대로');
    await back();
    ok(H() === '#today' && L() === hl && tabOn() === 'today', 'D: 뒤로 → 오늘(방문 기록 그대로)');
    await toSet(); click('[data-act="set-tab"][data-t="essay"]'); await sleep(20); await tap('[data-act="go"][data-h="guide"]');
    pe.go('set/' + D0); await sleep(60);
    ok(H() === '#set/' + D0 && upTxt() === '오늘', '앞 화면으로 되돌아가는 링크(요령 → 세트)는 세트의 들어온 곳(오늘)을 덮지 않음');
    await back(); ok(H() === '#today' && L() === hl, '그래서 뒤로가 두 화면 사이를 맴돌지 않고 오늘로');
    await edge(8, 150);
    ok(H() === '#today' && L() === hl && !view().querySelector('.topbar'), '오늘(탭 첫 화면)에서는 더 올라가지 않음(위쪽 뒤로 없음, 가장자리 밀기도 그대로)');

    // T11·O: 오늘 → 세트 → 단답 답안지 → 10분 타이머(깊이 3)도 오늘 탭. 알림(PE_IO._go)은 오늘 첫 화면으로, 열린 창은 닫힘
    const termOpen = async () => { await cardsTab(); if (!view().querySelector('.acc.open')) { click('[data-act="set-open"][data-i="0"]'); await sleep(20); } };
    await toSet(); hl = L(); await termOpen();
    await tap('.acc.open [data-act="go"][data-h^="dandap/"]');
    ok(/^#dandap\//.test(H()) && upTxt() === '세트' && tabOn() === 'today', 'T11: 세트 → 단답 답안지(위쪽 "세트", 아래 탭 오늘)');
    await tap('[data-act="timer-go"][data-p="one1"]');
    ok(H() === '#timer' && upTxt() === '뒤로' && tabOn() === 'today', 'T11: → 10분 타이머도 아래 탭 오늘');
    mw().innerHTML = '<div class="modal" data-act="modal-close"><div class="msheet" data-stop="1">창</div></div>';
    w.PE_IO._go('today'); await sleep(60);
    ok(H() === '#today' && !mw().innerHTML && L() === hl && tabOn() === 'today', 'O: 깊이 3에서 알림(PE_IO._go) → 오늘 첫 화면(창 닫힘, 방문 기록 그대로)');
    // K: 깊은 흐름에서 탭 더보기 → 더보기 첫 화면(들어온 곳 기록은 비움)
    await toSet(); await termOpen(); await tap('.acc.open [data-act="go"][data-h^="dandap/"]'); await tap('[data-act="timer-go"][data-p="one1"]');
    await tab('more');
    ok(H() === '#more' && L() === hl && tabOn() === 'more', 'K: 깊이 3에서 탭 더보기 → 더보기 첫 화면(방문 기록 그대로)');
    await go('#timer');
    ok(upTxt() === '더보기' && tabOn() === 'more', 'K: 탭을 바꾸면 들어온 곳 기록을 비움(타이머의 위 화면은 더보기)');
    await back(); ok(H() === '#more', 'K: 뒤로 → 더보기');

    // E·T6·T10: 연습 → 기출 → 단원별(회차별과 오가도 기록 그대로) → 한 단원 → 이 단원 카드 외우기 → 끝 → 돌아가기 → 뒤로 → 뒤로
    await tab('practice'); hl = L(); const rg0 = S().range;
    await tap('[data-act="go"][data-h="kichul"]');
    ok(H() === '#kichul' && upTxt() === '연습' && tabOn() === 'practice', 'E: 연습 → 기출 문제은행(위쪽 "연습")');
    await tap('.seg [data-h="kichul/u"]'); await tap('.seg [data-h="kichul"]'); await tap('.seg [data-h="kichul/u"]');
    ok(H() === '#kichul/u' && L() === hl && upTxt() === '연습', 'T10: 회차별 ↔ 단원별을 바꿔도 방문 기록이 그대로(뒤로는 연습)');
    const uh = view().querySelector('[data-h^="kichul/u/"]').dataset.h, cu = pe.deck().find(c => Number(c.u) === Number(uh.split('/')[2]));
    S().cards[cu.id] = Object.assign({ box: 1, ok: 0, ng: 0, star: false }, S().cards[cu.id] || {}, { seen: 1, due: '2000-01-01', last: '2000-01-01' });
    await tap(`[data-h="${uh}"]`);
    ok(H() === '#' + uh && upTxt() === '단원별' && tabOn() === 'practice', 'E: 단원 화면(위쪽 "단원별")');
    await tap('[data-act="study-unit"]');
    ok(H() === '#sess' && pe.SES().from === uh && focus() && upTxt() === '닫기' && tabOn() === 'practice' && / 카드 외우기$/.test(pe.SES().title), 'T6: 단원 화면에서 연 세션(이름 "○○ 카드 외우기")은 그 주소 그대로(#kichul/u/N), 집중 모드');
    pe.SES().i = pe.SES().items.length; pe.render(); await sleep(10);
    await tap('[data-act="sess-close"]');
    ok(H() === '#' + uh && !pe.SES() && S().range === rg0 && !focus(), 'E: 끝 → 돌아가기 → 그 단원 화면(범위 그대로)');
    await back(); ok(H() === '#kichul/u', 'E: 뒤로 → 단원별');
    await back(); ok(H() === '#practice' && L() === hl && tabOn() === 'practice', 'E: 뒤로 → 연습(방문 기록 그대로)');
    // T6: 기출 회차 문항 창 → 카드 가리며 외우기 → 완료 → 돌아가기 → 그 회차 화면
    await go('#kichul/r/140'); hl = L();
    ok(upTxt() === '기출' && tabOn() === 'practice', '기출 회차 화면(위쪽 "기출", 아래 탭 연습)');
    click('.paper-q[data-id="140-1-05"]'); await sleep(20);
    await tap('[data-act="memo-one"]', mw());
    ok(H() === '#memo' && pe.MEMO().from === 'kichul/r/140' && !mw().innerHTML && tabOn() === 'practice', 'T6: 기출 회차 문항 창 → 가리며 외우기(연 곳 #kichul/r/140)');
    click('[data-act="memo-finish"]'); await sleep(20);
    await tap('[data-act="memo-close"]');
    ok(H() === '#kichul/r/140' && !pe.MEMO() && L() === hl, 'T6: 완료 → 돌아가기 → 그 회차 화면');

    // F: 복습 창이 열린 채 알림(_go('review')) → 복습 첫 화면, 창 닫힘. 가장자리 밀기는 열린 창부터 닫는다
    await tab('review'); click(`[data-act="rev-open"][data-d="${D0}"]`); await sleep(20); hl = L();
    const hadSheet = !!mw().innerHTML; w.PE_IO._go('review'); await sleep(60);
    ok(hadSheet && H() === '#review' && !mw().innerHTML && /오답 노트/.test(txt()) && tabOn() === 'review' && L() === hl, 'F: 복습 창이 열린 채 알림(_go review) → 창이 닫히고 복습');
    click(`[data-act="rev-open"][data-d="${D0}"]`); await sleep(20); const hadSheet2 = !!mw().innerHTML;
    await edge(6, 140);
    ok(hadSheet2 && !mw().innerHTML && H() === '#review', '가장자리 밀기: 열린 창을 먼저 닫음');

    // T4: 세트에서 연 카드 넘겨 보기를 복습 창에서 이어 열면 같은 세션, 돌아가는 곳은 복습
    await toSet(); await cardsTab();
    await tap('[data-act="set-flash"]'); const sF = pe.SES();
    click('[data-act="sess-skip"]'); await sleep(10); click('[data-act="sess-skip"]'); await sleep(10);
    await back(); await tab('review'); click(`[data-act="rev-open"][data-d="${D0}"]`); await sleep(20);
    await tap('[data-act="set-flash"]', mw());
    ok(H() === '#sess' && pe.SES() === sF && sF.i === 2 && sF.from === 'review' && tabOn() === 'review', 'T4: 복습 창에서 이어 열면 같은 세션, 연 곳은 복습');
    await back(); ok(H() === '#review' && pe.SES() === sF, 'T4: 닫기 → 복습(세션은 그대로)');

    // H·집중 모드: 오늘 → 세트 → 카드 넘겨 보기(아래 탭 숨김, "닫기") → 가운데서 왼쪽 가장자리 밀기 → 세트(세션 그대로) → 뒤로 → 오늘
    await toSet(); hl = L(); await cardsTab();
    await tap('[data-act="set-flash"]');
    ok(H() === '#sess' && focus() && upTxt() === '닫기' && tabOn() === 'today' && cssTxt.includes('body.focus nav.tabs{display:none}'), '집중 모드: 세션은 아래 탭을 숨기고 위쪽은 "닫기"(강조는 연 탭)');
    for (let k = 0; k < 5; k++) { click('[data-act="sess-skip"]'); await sleep(5); }
    const sH = pe.SES(), iW = w.innerWidth;
    await edge(iW - 8, iW - 160, 0, view().querySelector('.fc'));
    ok(H() === '#sess' && sH.i === 5, '오른쪽 가장자리 24px 안에서 시작한 밀기는 카드를 넘기지 않음');
    await edge(6, 40); await edge(6, 160, 90); await edge(60, 220);
    ok(H() === '#sess' && sH.i === 5, '짧게(70px 안)·비스듬히(위아래 60px 넘게)·가장자리 밖에서 민 것은 뒤로 아님');
    await edge(6, 130, 0, view().querySelector('.fc'));
    ok(H() === '#set/' + D0 && pe.SES() === sH && sH.i === 5 && !focus() && /카드 넘겨 보기 이어서 \(6\/10\)/.test(txt()), 'H: 카드 위 왼쪽 가장자리에서 밀기 → 세트 화면(카드는 안 넘어가고 세션 그대로, 이어서 6/10)');
    await back();
    ok(H() === '#today' && L() === hl && tabOn() === 'today', 'H: 뒤로 → 오늘(방문 기록 그대로)');
    await toSet(); await tap('[data-act="set-flash"]');
    ok(pe.SES() === sH && sH.i === 5 && H() === '#sess', 'H: 다시 누르면 같은 세션 6번째 카드부터');
    // T1·P: 끝 → 돌아가기 → 세트 → 뒤로 → 오늘. 세션·외우기가 없을 때 #sess·#memo는 오늘로(빈 화면 없음)
    sH.i = sH.items.length; pe.render(); await sleep(10);
    ok(/완료/.test(txt()) && upTxt() === '닫기', 'T1: 끝 화면');
    await tap('[data-act="sess-close"]');
    ok(H() === '#set/' + D0 && !pe.SES() && L() === hl, 'T1: 돌아가기 → 세트 화면(끝난 세션은 지움)');
    await back(); ok(H() === '#today' && L() === hl, 'T1: 뒤로 → 오늘');
    w.location.hash = '#sess'; await sleep(80);
    ok(H() === '#today' && !emptyFlow() && tabOn() === 'today', 'P: 세션이 없을 때 #sess → 오늘(빈 화면 없음)');
    w.location.hash = '#memo'; await sleep(80);
    ok(!pe.MEMO() && H() === '#today' && !emptyFlow(), 'P: 외우기가 없을 때 #memo → 오늘');
    w.location.hash = '#nope/1'; await sleep(80);
    ok(H() === '#today' && tabOn() === 'today', '모르는 주소 → 오늘(주소와 화면이 늘 같음)');
    w.location.hash = '#set/' + D0 + '/quiz'; await sleep(80);
    ok(H() === '#set/' + D0 && view().querySelector('[data-act="set-tab"][data-t="quiz"].on'), '#set/날짜/탭 주소 → #set/날짜(그 탭을 열어 둠)');

    // T2: 세션 → 이 카드부터 가리며 외우기 → 완료 → 돌아가기(세션으로) → 세션 끝 → 돌아가기(세트) → 뒤로(오늘)
    await toSet(); hl = L(); await cardsTab();
    await tap('[data-act="set-flash"]'); const s2 = pe.SES(); click('[data-act="sess-skip"]'); await sleep(10);
    await tap('[data-act="memo-sess"]');
    ok(H() === '#memo' && pe.MEMO().from === 'sess' && focus() && tabOn() === 'today', 'T2: 세션 → 이 카드부터 가리며 외우기(연 곳은 세션)');
    while (pe.MEMO().i + 1 < pe.MEMO().items.length) { click('[data-act="memo-next"]'); await sleep(5); }
    click('[data-act="memo-finish"]'); await sleep(20); await tap('[data-act="memo-close"]');
    ok(H() === '#sess' && pe.SES() === s2 && !pe.MEMO() && !emptyFlow(), 'T2: 완료 → 돌아가기 → 보던 세션');
    s2.i = s2.items.length; pe.render(); await sleep(10); await tap('[data-act="sess-close"]');
    ok(H() === '#set/' + D0 && !pe.SES(), 'T2: 세션 끝 → 돌아가기 → 세트');
    await back();
    ok(H() === '#today' && L() === hl && !emptyFlow(), 'T2: 뒤로 한 번에 오늘(빈 화면 없음, 방문 기록 그대로)');

    // M: 오늘 → 세트 → ① 가리며 외우기(아래에 붙은 조작 막대) → 완료 → 돌아가기 → 세트 → 뒤로 → 오늘
    await toSet(); hl = L(); await cardsTab();
    await tap('[data-act="memo-set"]');
    ok(H() === '#memo' && pe.MEMO().from === 'set/' + D0 && focus() && upTxt() === '닫기' && view().querySelector('.mctl #memoPlay') && view().querySelector('.mctl [data-act="memo-prev"]') && view().querySelector('.mctl [data-act="memo-next"]') && cssTxt.includes('.mctl{position:sticky'), 'M: 세트 → 가리며 외우기(집중 모드, 시작·이전·다음은 아래에 붙은 막대)');
    ok(primaries() === 1 && view().querySelector('#memoPlay:not(.sec)') && /설정 · 보기 10초 · 가림 5초 · 전체 · 3회/.test(txt()), '가리며 외우기: 파란 버튼은 시작 하나, 설정 요약은 짧게');
    while (pe.MEMO().i + 1 < pe.MEMO().items.length) { click('[data-act="memo-next"]'); await sleep(5); }
    ok(view().querySelector('.mctl [data-act="memo-finish"].sec') && primaries() === 1, '마지막 카드: 완료는 회색(파란 버튼은 시작 하나)');
    click('[data-act="memo-finish"]'); await sleep(20);
    await tap('[data-act="memo-close"]');
    ok(H() === '#set/' + D0 && !pe.MEMO() && !focus(), 'M: 완료 → 돌아가기 → 세트(끝난 외우기는 지움)');
    await back();
    ok(H() === '#today' && L() === hl, 'M: 뒤로 → 오늘(방문 기록 그대로)');

    // J: 끝 화면 → 틀리거나 애매한 카드 가리며 외우기 → 닫기 → 같은 끝 화면(세션 그대로, 아래 탭은 연 탭)
    await tab('practice'); hl = L(); await tap('[data-act="start-free"]'); const sJ = pe.SES();
    click('[data-act="sess-flip"]'); await sleep(10); click('[data-act="sess-grade"][data-g="0"]'); await sleep(10);
    sJ.i = sJ.items.length; pe.render(); await sleep(10);
    await tap('[data-act="memo-sess"][data-only="miss"]');
    ok(H() === '#memo' && pe.MEMO().from === 'sess' && tabOn() === 'practice', 'J: 끝 화면 → 틀린 카드 가리며 외우기(아래 탭 연습)');
    await back();
    ok(H() === '#sess' && pe.SES() === sJ && /완료/.test(view().querySelector('.sheet h3').textContent) && tabOn() === 'practice' && L() === hl, 'J: 닫기 → 같은 끝 화면(세션 그대로)');
    ok(view().querySelector('.endb .btn.sec') && view().querySelector('.endb .btn.sec').textContent.trim() === '연습으로', 'J: 끝 화면의 돌아가기 이름 "연습으로"');
    await tap('[data-act="sess-close"]'); ok(H() === '#practice' && !pe.SES(), 'J: 돌아가기 → 연습 탭');

    // C·T5: 복습 → 오답 카드 가리며 외우기 → (낱말 꾹 → 카드 창) 가리며 외우기 → 완료 → 돌아가기 → 바깥 외우기 그 카드 → 닫기 → 복습
    const wids = pe.deck().slice(0, 3).map(c => c.id); wids.forEach(id => { S().wrong['C:' + id] = { type: 'card', since: '2026-10-01', n: 1, last: '2026-10-01', streak: 0 }; }); delete S().resume['memo:wrong'];
    await tab('review'); hl = L(); await tap('[data-act="memo-wrong"]');
    const mOut = pe.MEMO(); click('[data-act="memo-next"]'); await sleep(10); const iOut = mOut.i;
    const cardBtn = () => { const b = d.createElement('button'); b.dataset.act = 'card-modal'; b.dataset.id = wids[2]; view().appendChild(b); return b; };
    click('[data-act="card-modal"]', cardBtn().parentNode); await sleep(10);
    await tap('[data-act="memo-one"]', mw());
    ok(H() === '#memo' && pe.MEMO() !== mOut && pe.MEMO().outer === mOut && pe.MEMO().items.length === 1 && tabOn() === 'review', 'T5: 외우기 안에서 카드 창 → 가리며 외우기(바깥 외우기를 기억)');
    click('[data-act="memo-finish"]'); await sleep(20); await tap('[data-act="memo-close"]');
    ok(H() === '#memo' && pe.MEMO() === mOut && mOut.i === iOut && !emptyFlow(), 'C: 완료 → 돌아가기 → 바깥 외우기 그 카드');
    click('[data-act="card-modal"]', cardBtn().parentNode); await sleep(10); await tap('[data-act="memo-one"]', mw()); const inner = pe.MEMO().outer === mOut;
    await edge(6, 140);
    ok(inner && H() === '#memo' && pe.MEMO() === mOut && mOut.i === iOut, 'T5: 안쪽 외우기에서 가장자리 밀기 → 바깥 외우기 그 카드');
    await back();
    ok(H() === '#review' && pe.MEMO() === mOut && L() === hl, 'C: 닫기 → 복습(외우기는 그대로)');

    // 끝난 외우기의 끝 화면에서(제목 낱말 꾹 → 카드 창) 연 가리며 외우기는 그 외우기의 연 곳·바깥 외우기를 물려받는다(#memo 자신을 연 곳으로 적지 않음):
    // 닫기·가장자리 밀기·완료 → 돌아가기가 같은 #memo에 갇히거나 "진행 중인 외우기가 없어요"로 가지 않는다
    {
      const endWord = () => view().querySelector('.sheet h3').textContent.split(':')[0];
      const modalCard = id => { const b = d.createElement('button'); b.dataset.act = 'card-modal'; b.dataset.id = id; view().appendChild(b); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); b.remove(); };
      const againFromEnd = async id => { modalCard(id); await sleep(10); await tap('[data-act="memo-one"]', mw()); const m = pe.MEMO(); click('[data-act="memo-finish"]'); await sleep(20);
        const opened = pe.glOpen(endWord()); await sleep(10); await tap('[data-act="memo-one"]', mw()); return { m, opened }; };
      await tap('[data-act="memo-wrong"]'); hl = L();
      ok(H() === '#memo' && pe.MEMO() === mOut && mOut.i === iOut, '(준비) 복습 → 오답 카드 가리며 외우기 이어서');
      let r = await againFromEnd(wids[2]); const m3 = pe.MEMO();
      ok(r.opened && H() === '#memo' && m3 !== r.m && r.m.outer === mOut && m3.outer === mOut && m3.from === 'review' && tabOn() === 'review', '안쪽 외우기의 끝 화면 → 카드 창 → 가리며 외우기: 바깥 외우기와 연 곳(복습)을 물려받음');
      click('[data-act="memo-finish"]'); await sleep(20); await tap('[data-act="memo-close"]');
      ok(H() === '#memo' && pe.MEMO() === mOut && mOut.i === iOut && !emptyFlow(), '그 외우기 완료 → 돌아가기 → 바깥 외우기 그 카드');
      await back(); ok(H() === '#review' && pe.MEMO() === mOut && L() === hl, '닫기 → 복습');
      await toSet(); hl = L(); const cOne = pe.deck().find(x => x.id === 'T01');
      r = await againFromEnd(cOne.id); const m4 = pe.MEMO();
      ok(r.opened && H() === '#memo' && m4 !== r.m && m4.from === 'set/' + D0 && !m4.outer && upTxt() === '닫기' && tabOn() === 'today', '끝난 외우기의 끝 화면 → 카드 창 → 가리며 외우기: 연 곳은 세트(#memo 자신이 아님)');
      await back(); ok(H() === '#set/' + D0 && pe.MEMO() === m4 && !focus() && L() === hl, '그 외우기에서 닫기 → 세트(외우기는 그대로)');
      await againFromEnd(cOne.id); await edge(6, 150);
      ok(H() === '#set/' + D0 && !focus() && L() === hl, '그 외우기에서 가장자리 밀기 → 세트');
      await againFromEnd(cOne.id); click('[data-act="memo-finish"]'); await sleep(20); await tap('[data-act="memo-close"]');
      ok(H() === '#set/' + D0 && !pe.MEMO() && !emptyFlow() && !focus() && L() === hl, '그 외우기도 완료 → 돌아가기 → 세트("진행 중인 외우기가 없어요" 없음)');
      // 연 곳이 자기 자신(#sess)으로 적힌 세션도 닫기·돌아가기는 제자리에 머물지 않고 오늘로
      pe.startSession({ kind: 'free', title: '연 곳 점검', items: [{ type: 'card', id: cOne.id }], from: 'sess' }); await sleep(60); const sX = pe.SES();
      ok(H() === '#sess' && sX.from === 'sess', '(준비) 연 곳이 #sess로 적힌 세션');
      await back(); ok(H() === '#today' && pe.SES() === sX && tabOn() === 'today' && L() === hl, '연 곳이 자기 자신이면 닫기 → 오늘(세션은 그대로)');
      sX.i = sX.items.length; pe.go('sess'); await sleep(60);
      ok(H() === '#sess' && /완료/.test(view().querySelector('.sheet h3').textContent), '(준비) 그 세션의 끝 화면');
      await tap('[data-act="sess-close"]'); ok(H() === '#today' && !pe.SES() && !emptyFlow() && L() === hl, '끝 화면의 돌아가기 → 오늘');
      // 주소가 그대로라 route()를 거치지 않는 길(같은 주소로 다시 가기)에서도 빈 #sess는 그리지 않고 위로
      w.location.hash = '#sess'; pe.go('sess'); const noEmpty = !emptyFlow(); await sleep(80);
      ok(noEmpty && H() === '#today' && !emptyFlow() && tabOn() === 'today', '같은 주소의 빈 #sess도 그리지 않고 오늘로');
    }

    // 위쪽 이름: 들어온 곳(오늘 → 달력은 "오늘", 더보기 → 달력은 "더보기")
    await tab('today'); await tap('.calbtn'); ok(H() === '#cal' && upTxt() === '오늘' && tabOn() === 'today', '오늘 → 학습 달력(위쪽 "오늘")');
    await tab('more'); await tap('#view [data-act="go"][data-h="cal"]'); ok(H() === '#cal' && upTxt() === '더보기' && tabOn() === 'more', '더보기 → 학습 달력(위쪽 "더보기", 아래 탭 더보기)');

    // G: 모의고사 1교시 타이머가 도는 중 → 뒤로 → 세트 ④ "25분 타이머" → 묻고, 취소하면 100분 타이머 그대로
    {
      let T = 3e12; const realNow = w.Date.now; w.Date.now = () => T; const rc = w.confirm, asked = []; w.confirm = m => { asked.push(m); return false; }; const TM = pe.TM();
      await go('#mock/2026-10-24'); await tap('[data-act="timer-go"][data-p="p1"]');
      ok(H() === '#timer' && TM.preset === 'p1' && upTxt() === '모의고사', 'G: 모의고사 → 1교시 타이머(위쪽 "모의고사")');
      click('[data-act="timer-toggle"]'); await sleep(10); T += 768000; await sleep(300);
      await back(); ok(H() === '#mock/2026-10-24' && TM.running && TM.remain === 5232, 'G: 1교시 타이머가 도는 채로 뒤로 → 모의고사(남은 87:12)');
      await toSet(); click('[data-act="set-tab"][data-t="essay"]'); await sleep(20);
      await tap('[data-act="timer-go"][data-p="one2"]');
      ok(asked.length === 1 && asked[0] === '돌고 있는 1교시 단답 타이머(남은 87:12)를 멈추고 논술 1문 25분으로 바꿀까요?' && TM.preset === 'p1' && TM.running && TM.remain === 5232 && H() === '#timer', 'G: 세트 ④ 25분 타이머 → 묻고, 취소하면 100분 타이머 그대로(타이머 화면)');
      click('[data-act="timer-toggle"]'); click('[data-act="timer-reset"]'); await sleep(10); w.Date.now = realNow; w.confirm = rc;
    }

    // N: 더보기 → 백업 → 복원 → 오늘 첫 화면 → 탭 더보기. 초기화도 오늘 첫 화면으로(뒤에 백업으로 되돌림). 입력 칸을 쓰는 동안은 body.kb, 가장자리 밀기도 안 함
    await tab('more'); hl = L(); await tap('[data-act="go"][data-h="backup"]');
    ok(H() === '#backup' && upTxt() === '더보기' && tabOn() === 'more', 'N: 더보기 → 백업(위쪽 "더보기")');
    const bk = JSON.stringify({ state: S(), sets: pe.SETS() }), ta = d.querySelector('#restoreText');
    ta.value = bk; ta.focus(); await edge(6, 140);
    ok(d.body.classList.contains('kb') && H() === '#backup', '입력 칸을 쓰는 동안 body.kb(아래 붙은 막대 숨김), 가장자리 밀기는 하지 않음');
    click('[data-act="restore"]'); await sleep(80);
    ok(H() === '#today' && L() === hl && tabOn() === 'today' && !d.body.classList.contains('kb'), 'N: 복원 → 오늘 첫 화면(방문 기록 그대로)');
    await tab('more'); ok(H() === '#more' && L() === hl && tabOn() === 'more', 'N: 그다음 탭 더보기');
    await tap('[data-act="go"][data-h="backup"]'); click('[data-act="reset"]'); await sleep(300);
    ok(H() === '#today' && L() === hl && !Object.keys(S().cards).length, 'N: 초기화 → 오늘 첫 화면(방문 기록 그대로)');
    await go('#backup'); d.querySelector('#restoreText').value = bk; click('[data-act="restore"]'); await sleep(80);
    ok(Object.keys(S().cards).length > 0 && H() === '#today', '(되돌림) 백업으로 복원');

    const K = JSON.parse(keep); S().settings.memo = K.memoCfg || undefined; delete K.memoCfg; if (!S().settings.memo) delete S().settings.memo;
    Object.keys(K).forEach(k => { S()[k] = K[k]; }); pe.render(); await go('#today');
  }

  // 오늘 몫·이번 주 화면(진짜 날짜): 이번 주(#week) 점수 카드·약속 줄, 손으로 친 일(S.tk)과 연속 학습·백업 → 복원, 오늘 시간, 통계·주간 리포트,
  // 모의고사 채점 기록, 설정의 하루 공부 시간, 마지막 백업, 이어서(Q). 줄 내용·수는 시계를 고정한 tests/plan.test.js가 본다
  {
    const ymdOf = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    const T0 = ymdOf(new w.Date()), W = pe.wkStart(T0), mw = () => d.querySelector('#modal-wrap'), toastTxt = () => d.querySelector('#toast').textContent;
    const keep = JSON.stringify({ tk: S().tk, daily: S().daily, mockp: S().mockp, budget: S().settings.budget, today: S().today });
    await go('#today'); await go('#week');
    const wkOn = T0 <= pe.PLAN().target.d && pe.weekIndex(T0) >= 0;   // 시험 뒤(준비 시작 전)에는 이번 주 화면이 카드 하나
    if (wkOn) {
      // 약속 줄 수는 단계마다 다르다(1·3·4단계 7줄, 2단계는 논술 실전 25분이 더해 8줄, 시험이 든 주는 핵심·세트 복습·리포트): 계산(weekBoard)의 줄과 같은 수
      const sc = view().querySelector('.score'), qa = [...view().querySelectorAll('.qline')], P0 = /^ql-(apply|recap|applychk|notice)$/, cl = qa.filter(q => !P0.test(q.id) && q.id !== 'ql-carry.mock'), wb = pe.weekBoard(T0), nL = wb.lines.filter(l => l.b || l.B || l.k === 'close').length, mx = wb.ph === 2 ? 8 : 7;
      ok(sc && /다 하면 \d+%|시험 주/.test(sc.textContent) && /남은 필수|이번 주 필수를 다 했어요/.test(sc.textContent), '이번 주: 점수 카드(남은 필수 / 남은 시간 → 다 하면 n%)');
      ok(cl.length >= 1 && cl.length === nL && cl.length <= mx && qa.filter(q => P0.test(q.id)).length <= 2 && qa.filter(q => q.id === 'ql-carry.mock').length <= 1, `이번 주: 일요일까지 끝낼 것 ${cl.length}줄(${wb.ph}단계 약속 ${nL}줄, ${mx}줄 이하) + 날짜 일 2줄·지난주 모의 1줄 이하`);
      // 배지가 세는 날짜 일(원서접수·48시간 복기 핀)은 모두 이 탭에 동그라미 줄로 있다(배지 수 ≤ 안 친 핀 줄)
      const pins = pe.taskList(T0).filter(x => x.blk === 'pin');
      ok(pins.every(x => view().querySelector(`.qline.tkl[data-act="tk"][data-id="${x.id}"]`)) && view().querySelectorAll('.qline.tkl:not(.done)').length >= pe.navBadgeN(), `이번 주: 오늘의 날짜 일 핀 ${pins.length}개가 모두 줄로(배지 ${pe.navBadgeN()})`);
      ok(view().querySelectorAll('.drow').length === 7 && view().querySelectorAll('.btn:not(.sec):not(.ghost)').length === 1 && !d.querySelector('.topbar') && d.querySelector('#nav button.on').dataset.tab === 'week', '이번 주: 날마다 7줄, 파란 버튼 하나(다음), 탭 첫 화면(위쪽 막대 없음, 아래 탭 이번 주)');
    } else ok(view().querySelector('.norows') && view().querySelectorAll('.btn:not(.sec):not(.ghost)').length === 1 && !view().querySelector('.score'), `${T0}: 시험 뒤라 이번 주 화면은 카드 하나(파란 버튼 하나)`);
    // 손으로 친 일(이번 주 목표): S.tk에 남고, 그것 하나뿐인 날도 연속 학습으로 센다(touchDay). 목표 줄이 없는 주(시험 뒤)는 같은 동작(data-act="tk")의 버튼으로
    const gid = 'goal:' + W + ':0', dl0 = S().daily[T0], ck0 = S().checks[T0]; delete S().tk[gid]; delete S().daily[T0]; delete S().checks[T0]; pe.render();
    const tkGoal = () => { let b = view().querySelector(`[data-act="tk"][data-id="${gid}"]`); if (!b) { b = d.createElement('button'); b.dataset.act = 'tk'; b.dataset.id = gid; view().appendChild(b); } b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
    const hasGoal = !!view().querySelector(`[data-act="tk"][data-id="${gid}"]`);
    const s0 = pe.streak(); tkGoal(); await sleep(20);
    ok(S().tk[gid] === T0 && S().daily[T0] && S().daily[T0].active && pe.streak() === s0 + 1 && (!hasGoal || view().querySelector(`[data-act="tk"][data-id="${gid}"] .tkc.on`)), '이번 주 목표를 손으로 치면 S.tk, 그것뿐인 날도 연속 학습(+1일)');
    if (dl0) S().daily[T0] = Object.assign(dl0, { active: true }); if (ck0) S().checks[T0] = ck0;
    const bk3 = JSON.stringify({ state: S(), sets: pe.SETS() }); delete S().tk[gid];
    await go('#backup'); d.querySelector('#restoreText').value = bk3; click('[data-act="restore"]'); await sleep(80);
    ok(S().tk[gid] === T0 && w.location.hash === '#today', '손으로 친 기록은 백업 → 복원에도 남음');
    await go('#week'); tkGoal(); await sleep(20);
    ok(!S().tk[gid], '다시 누르면 되돌림');
    // 오늘 시간: 30분 · 1시간 · 1시간 30분 · 평소대로. 고르면 그날만 다시 짠다
    await go('#today'); const ds0 = view().querySelector('.daysum').textContent;
    click('[data-act="cap"]'); await sleep(10);
    ok(mw().querySelectorAll('[data-act="cap-set"]').length === 4 && /30분 · 최소 몫/.test(mw().textContent) && /평소대로 · /.test(mw().textContent) && /최소 몫\(용어 읽기 · 세트 퀴즈 · 단답 1문 · 자기 전 5분\)은 늘 남아요/.test(mw().textContent), '오늘 시간 창: 30분 · 최소 몫 / 1시간 / 1시간 30분 / 평소대로');
    click('#modal-wrap [data-act="cap-set"][data-m="60"]'); await sleep(30);
    const late = (x => x.getHours() * 60 + x.getMinutes() >= 22 * 60 + 30)(new w.Date()), ds1 = view().querySelector('.daysum').textContent;
    ok(S().today && S().today.d === T0 && S().today.user === 60 && !mw().innerHTML && (ds1 !== ds0 || late) && /오늘 시간 (1시간|\d+분)/.test(ds1), `오늘 시간 1시간: S.today.user = 60, 상태 줄이 바뀜(${ds1.trim()})`);
    click('[data-act="cap"]'); await sleep(10); click('#modal-wrap [data-act="cap-set"][data-m="0"]'); await sleep(30);
    ok(S().today && S().today.user === null, '평소대로: S.today.user = null');
    { const sh = todayShape(); ok((sh.pr > 0 || sh.nr) && sh.np === 1, '다시 짜도 파란 버튼은 하나'); }
    // 통계·주간 리포트: "이번 주 필수 n%"(이번 주 화면과 같은 수), 이번 주 월요일부터. 토·일요일에 복사해야 이번 주 리포트로 친다
    let copied = ''; const cp0 = w.PE_IO.copy; w.PE_IO.copy = x => { copied = x; return Promise.resolve(); };
    await go('#stats');
    ok(/이번 주 필수/.test(txt()) && /핵심 끝낸 세트/.test(txt()) && /주간 기록/.test(txt()) && !/7일 체크/.test(txt()), '통계: 이번 주 필수 n%, 핵심 끝낸 세트, 주간 기록(7일 체크 달성은 없음)');
    const rk = 'report:' + W, rk0 = S().tk[rk], dw = new w.Date().getDay(); delete S().tk[rk];
    click(`[data-act="report"][data-w="${W}"]`); await sleep(20);
    ok((wkOn ? /이번 주 필수 \d+%|시험이 든 주/ : /이번 주는 (시험 뒤라|준비 시작 전이라) 필수 점수가 없어요/).test(copied) && copied.indexOf(`] ${W} ~ `) > 0 && (dw === 0 || dw === 6 ? S().tk[rk] === T0 : !S().tk[rk] && /토·일요일에 복사하면 이번 주 리포트로 쳐요/.test(toastTxt())), '주간 리포트: "이번 주 필수"(시험 뒤는 "필수 점수가 없어요"), 이번 주 월요일부터, 토·일요일에만 이번 주 리포트로 침');
    if (rk0) S().tk[rk] = rk0; else delete S().tk[rk];
    // 백업: 마지막 백업 날짜
    delete S().tk.backup; await go('#backup'); ok(/아직 백업한 적이 없어요/.test(txt()), '백업: 아직 백업한 적이 없어요');
    click('[data-act="backup-copy"]'); await sleep(20);
    ok(S().tk.backup === T0 && /마지막 백업/.test(txt()) && /백업을 복사했어요/.test(toastTxt()), '백업 복사 → 마지막 백업 날짜(S.tk.backup)');
    w.PE_IO.copy = cp0;
    // 모의고사: 채점 받았어요(되돌리기)와 점수 칸
    await go('#mock/2026-10-24');
    click('[data-act="mock-graded"][data-d="2026-10-24"]'); await sleep(10);
    ok(S().mockp['2026-10-24'] && S().mockp['2026-10-24'].g === T0 && /채점 받았어요 ✓/.test(txt()) && view().querySelector('[data-act="copy-mock"]'), '모의고사: 채점 받았어요 → S.mockp[D].g(채점 요청 복사는 그대로)');
    const si = view().querySelector('[data-act="mock-score"][data-k="p1"]'); si.value = '62'; si.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    ok(S().mockp['2026-10-24'].sc && S().mockp['2026-10-24'].sc.p1 === 62 && view().querySelector('[data-act="mock-score"][data-k="p1"]').value === '62', '점수 칸: 1교시 62점 → S.mockp[D].sc');
    click('[data-act="mock-graded"][data-d="2026-10-24"]'); await sleep(10);
    ok(!S().mockp['2026-10-24'].g, '채점 받았어요 되돌리기');
    // 설정: 하루 공부 시간(평일·토요일·일요일과 공휴일), 시험 일정 줄은 더보기에만
    await go('#settings');
    ok(view().querySelectorAll('[data-act="budget"]').length === 12 && !view().querySelector('[data-h="schedule"]') && /오늘 몫과 '이번 주' 계산이 이 시간을 써요/.test(txt()), '설정: 하루 공부 시간 3줄, 시험 일정 줄 없음');
    click('[data-act="budget"][data-k="wd"][data-v="150"]'); await sleep(10);
    ok(S().settings.budget.wd === 150 && S().settings.budget.sat === 300 && S().tk.budget === T0 && view().querySelector('[data-act="budget"][data-k="wd"][data-v="150"].on') && pe.budgetOf('2026-11-02') === 150, '하루 공부 시간 평일 2시간 30분 → S.settings.budget, S.tk.budget, 계산에 바로');
    // 다음 주 단원 기출(토·일요일에 열면 이번 주 "다음 주 단원 기출 훑기"로 친다, 그리는 것만으로는 쓰지 않음)
    { const nu = (pe.weekObj(pe.weekIndex(pe.wkStart(T0)) + 1).u || [])[0], kk = 'kichul:' + W; delete S().tk[kk];
      if (nu) { await go('#kichul/u/' + nu); ok((dw === 0 || dw === 6) ? S().tk[kk] === T0 : !S().tk[kk], `다음 주 단원(${nu}) 기출을 ${dw === 0 || dw === 6 ? '주말에 열면 침' : '평일에 열면 치지 않음'}`); pe.render(); ok(((dw === 0 || dw === 6) ? S().tk[kk] === T0 : !S().tk[kk]), '같은 화면을 다시 그려도 그대로'); } }
    // Q: 세트 → 카드 넘겨 보기 → 2장 뒤집고 닫기 → 오늘에 "이어서 · 10/19 세트 카드 넘겨 보기 n/10"(세션은 그대로), 누르면 같은 세션
    await go('#set/2026-10-19'); click('[data-act="set-tab"][data-t="cards"]'); await sleep(10);
    if (view().querySelector('[data-act="resume-clear"]')) { click('[data-act="resume-clear"]'); await sleep(10); }
    click('[data-act="set-flash"]'); await sleep(60); const sQ = pe.SES();
    click('[data-act="sess-flip"]'); await sleep(5); click('[data-act="sess-skip"]'); await sleep(5); click('[data-act="sess-flip"]'); await sleep(5);
    click('.topbar [data-act="back"]'); await sleep(60);
    ok(w.location.hash === '#set/2026-10-19' && pe.SES() === sQ && sQ.i === 1, 'Q: 카드 넘겨 보기 가운데서 닫기 → 세트 화면(세션 그대로)');
    await go('#today'); const rs = view().querySelector('.resume'), own = view().querySelector('.prow.now .btn');
    ok(pe.SES() === sQ && (rs ? /이어서 · 10\/19 세트 카드 넘겨 보기 \d+\/10/.test(rs.textContent) : own && /이어서 · \d+번째 용어부터/.test(own.textContent)), 'Q: 오늘에 "이어서 · 10/19 세트 카드 넘겨 보기 n/10"');
    click(rs ? '.resume' : '.prow.now .btn'); await sleep(60);
    ok(w.location.hash === '#sess' && pe.SES() === sQ && sQ.from === 'today' && sQ.i === 1, 'Q: 이어서를 누르면 같은 세션 그 카드부터, 연 곳은 오늘');
    click('.topbar [data-act="back"]'); await sleep(60);
    ok(w.location.hash === '#today' && pe.SES() === sQ, 'Q: 닫기 → 오늘(세션 그대로)');
    const K = JSON.parse(keep); ['tk', 'daily', 'mockp', 'today'].forEach(k => { S()[k] = K[k]; }); S().settings.budget = K.budget; pe.render(); await go('#today');
  }

  ok(errors.length === 0, '콘솔 오류 없음 ' + errors.slice(0, 3).join(' | '));
  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
