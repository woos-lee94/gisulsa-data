// 회원 승인 검사: Firebase 에뮬레이터(Auth·Firestore)에 실제 규칙(firebase/firestore.rules)을 올리고 native/member.js를 돈다.
// 실행(app/에서): npm run test:firebase   (Java 필요, 처음엔 에뮬레이터를 내려받는다)
const { createMember } = require('../native/member');
const PROJECT = 'demo-gisulsa';
const hosts = { auth: 'http://127.0.0.1:9099/identitytoolkit.googleapis.com', token: 'http://127.0.0.1:9099/securetoken.googleapis.com', firestore: 'http://127.0.0.1:8080' };
const FS = `${hosts.firestore}/v1/projects/${PROJECT}/databases/(default)/documents`;

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok:', m); };
const memStore = () => { const m = new Map(); return { m, get: async k => m.get(k) ?? null, set: async (k, v) => { m.set(k, v); }, del: async k => { m.delete(k); } }; };
let clock = Date.now();
const phone = (store = memStore(), f = fetch) => createMember({ apiKey: 'fake-key', projectId: PROJECT, fetch: f, store, now: () => clock, hosts });
const err = async p => { try { await p; return null; } catch (e) { return e.code || e.message; } };
// 콘솔에서 하는 일(관리자 지정 등)은 에뮬레이터 관리자 권한으로
const owner = (method, path, body) => fetch(`${FS}/${path}`, { method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

(async () => {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });

  // 관리자 휴대폰: 아이디를 만들고, 콘솔에서 승인·관리자 지정
  const adminStore = memStore(); const admin = phone(adminStore);
  ok((await admin.check()).state === 'none', '처음엔 아이디 없음');
  ok(await err(admin.register('a', '')) === 'badid', '1글자 아이디는 안 됨');
  const ar = await admin.register('Boss', '');
  ok(ar.state === 'pending' && ar.id === 'boss', '아이디 만들기 → 승인 대기(소문자로)');
  await owner('PATCH', `members/${ar.uid}?updateMask.fieldPaths=status`, { fields: { status: { stringValue: 'approved' } } });
  await owner('PATCH', `admins/${ar.uid}`, { fields: { role: { stringValue: 'admin' } } });
  const ac = await admin.check();
  ok(ac.state === 'approved' && ac.admin, '콘솔에서 승인·관리자 지정 → 관리자');

  // 사용자 A
  const aStore = memStore(); const A = phone(aStore);
  const a1 = await A.register('kim', '');
  ok(a1.state === 'pending' && !a1.admin, 'A: kim 승인 대기');
  ok(await err(A.setStatus(a1.uid, 'approved')) === 'denied', 'A가 스스로 승인 못 함');
  ok(await err(A.list()) === 'denied', 'A는 회원 목록을 못 봄');
  ok(await err(A.codes()) === 'denied' && await err(A.addCode()) === 'denied', 'A는 초대 코드를 못 보고 못 만듦');
  const a2 = await A.register('park', '');
  ok(a2.state === 'pending' && a2.id === 'kim', 'A가 아이디를 하나 더 만들려 하면 원래 아이디 그대로');
  // 규칙 우회 시도: 회원 문서를 직접 승인으로 만들기
  const s = await A.auth();
  const raw = await fetch(`${FS}/members/${s.uid}?updateMask.fieldPaths=status`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + s.idToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { status: { stringValue: 'approved' } } }) });
  ok(raw.status === 403, 'A가 REST로 직접 승인으로 바꾸기 → 거부');
  const raw2 = await fetch(`${FS}/admins/${s.uid}`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + s.idToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { role: { stringValue: 'admin' } } }) });
  ok(raw2.status === 403, 'A가 스스로 관리자 되기 → 거부');

  // 사용자 B: 같은 아이디는 못 씀
  const B = phone();
  ok(await err(B.register('kim', '')) === 'taken', 'B: kim은 이미 있는 아이디');
  const H = phone();
  ok((await H.register('홍길동', '')).id === '홍길동', '한글 아이디(홍길동)도 규칙 통과');
  ok(await err(phone().register('홍길동', '')) === 'taken', '다른 휴대폰은 홍길동을 못 씀');
  await H.remove();
  ok((await owner('GET', `ids/${encodeURIComponent('홍길동')}`)).status === 404, '아이디 지우기 → 홍길동 문서도 지워짐');
  const b1 = await B.register('lee', '');
  ok(b1.state === 'pending', 'B: lee 승인 대기');

  // 관리자에게 문자(승인 요청 문구·앱 안 문의): 아이디가 있는 휴대폰만, 자기 아이디로
  const m1 = await A.sendMsg('  김철수입니다. 승인 부탁드려요  ', 'join', 'iOS 18.1 · 앱 3.0.1');
  ok(typeof m1 === 'string' && m1.length === 20, 'A: 승인 요청 문구 보내기');
  await B.sendMsg('이영희예요', 'wait');
  ok(await err(A.sendMsg('   ', 'join')) === 'empty', '빈 문자는 안 보냄');
  ok(await err(A.sendMsg('x', 'hack')) === 'badfrom', '모르는 보낸 곳은 안 보냄');
  ok(await err(phone().sendMsg('아이디 없이', 'join')) === 'noid', '아이디가 없는 휴대폰은 못 보냄');
  ok(await err(A.msgs()) === 'denied' && await err(A.unread()) === 'denied', 'A는 문자함을 못 봄');
  ok(await err(A.markRead([m1])) === 'denied', 'A는 읽음 표시를 못 바꿈');
  const forge = async (fields, transform = true) => (await fetch(`${FS}:commit`, { method: 'POST', headers: { Authorization: 'Bearer ' + s.idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{ update: { name: `projects/${PROJECT}/databases/(default)/documents/msgs/forge${Math.random().toString(36).slice(2, 10)}`, fields }, updateTransforms: transform ? [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }] : [], currentDocument: { exists: false } }] }) })).status;
  const base = { uid: { stringValue: s.uid }, id: { stringValue: 'kim' }, text: { stringValue: '안녕' }, from: { stringValue: 'app' }, read: { booleanValue: false } };
  ok(await forge(base) === 200, '규칙대로 쓴 문자는 통과(대조군)');
  ok(await forge({ ...base, id: { stringValue: 'boss' } }) === 403, '남의 아이디로 보내기 → 거부');
  ok(await forge({ ...base, uid: { stringValue: ar.uid } }) === 403, '남의 기기 번호로 보내기 → 거부');
  ok(await forge({ ...base, read: { booleanValue: true } }) === 403, '읽음으로 보내기 → 거부');
  ok(await forge({ ...base, text: { stringValue: '가'.repeat(501) } }) === 403, '501자 → 거부');
  ok(await forge({ ...base, at: { timestampValue: '2020-01-01T00:00:00Z' } }, false) === 403, '보낸 시각 꾸미기 → 거부');
  ok(await forge({ ...base, extra: { stringValue: 'x' } }) === 403, '다른 칸 넣기 → 거부');
  const bMid = (await admin.msgs()).find(x => x.id === 'lee').mid;
  ok((await fetch(`${FS}/msgs/${bMid}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + s.idToken } })).status === 403, 'A는 남의 문자를 못 지움');
  ok((await fetch(`${FS}/msgs/${bMid}`, { headers: { Authorization: 'Bearer ' + s.idToken } })).status === 403, 'A는 남의 문자를 못 읽음');
  const ms = await admin.msgs();
  const mine = ms.find(x => x.mid === m1);
  ok(ms.length === 3 && mine && mine.text === '김철수입니다. 승인 부탁드려요' && mine.id === 'kim' && mine.from === 'join' && mine.dev === 'iOS 18.1 · 앱 3.0.1' && !mine.read && Date.parse(mine.at) > 0, '관리자: 문자함에 누가·언제·어디서·무슨 내용');
  ok(await admin.unread() === 3, '관리자: 안 읽은 문자 3개');
  ok(await admin.markRead([m1, 'bad/../id']) === 1 && await admin.unread() === 2 && (await admin.msgs()).find(x => x.mid === m1).read, '관리자: 읽음 표시(이상한 번호는 건너뜀) → 2개');
  const forged = (await admin.msgs()).filter(x => x.from === 'app').map(x => x.mid);
  ok(await admin.delMsgs(forged) === 1 && await admin.unread() === 1, '관리자: 문자 지우기');

  // 관리자 답장(3.1.3): 답장만 · 승인하며 답장 · 거절하며 답장. 받는 회원만 읽고 읽음으로만 바꾼다
  const r1 = await admin.reply(b1.uid, '  확인했어요. 이름을 한 번 더 알려 주세요  ');
  ok(typeof r1 === 'string' && r1.length === 20 && (await B.check()).state === 'pending', '관리자: 답장만 보내기(상태 그대로)');
  const tb = await B.thread();
  ok(tb.replies.length === 1 && tb.replies[0].text === '확인했어요. 이름을 한 번 더 알려 주세요' && tb.replies[0].id === 'lee' && !tb.replies[0].read && !tb.replies[0].dec && Date.parse(tb.replies[0].at) > 0
    && tb.msgs.length === 1 && tb.msgs[0].text === '이영희예요', 'B: 내 문자와 받은 답장(누가·언제·무슨 내용)');
  ok((await A.thread()).replies.length === 0, 'A에게는 B의 답장이 안 보임');
  ok((await fetch(`${FS}/replies/${r1}`, { headers: { Authorization: 'Bearer ' + s.idToken } })).status === 403, 'A는 남의 답장을 못 읽음');
  ok(await err(A.reply(b1.uid, '내가 답장')) === 'denied' && await err(B.reply(b1.uid, '셀프 승인', 'approved')) === 'denied' && (await B.check()).state === 'pending', '회원은 답장을 못 쓰고, 답장으로 스스로 승인도 못 함');
  ok(await err(A.readReplies([r1])) === 'denied' && await B.readReplies([r1]) === 1 && (await B.thread()).replies[0].read, '남의 답장 읽음 표시 → 거부, B는 자기 답장을 읽음으로');
  const bs = await B.auth();
  const unreadAgain = await fetch(`${FS}:commit`, { method: 'POST', headers: { Authorization: 'Bearer ' + bs.idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{ update: { name: `projects/${PROJECT}/databases/(default)/documents/replies/${r1}`, fields: { text: { stringValue: '바꾼 답장' }, read: { booleanValue: true } } }, updateMask: { fieldPaths: ['text'] } }] }) });
  ok(unreadAgain.status === 403, 'B는 답장 글을 못 바꿈');
  const fr = async (fields, transform = true) => (await fetch(`${FS}:commit`, { method: 'POST', headers: { Authorization: 'Bearer ' + (await admin.auth()).idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{ update: { name: `projects/${PROJECT}/databases/(default)/documents/replies/forge${Math.random().toString(36).slice(2, 10)}`, fields }, updateTransforms: transform ? [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }] : [], currentDocument: { exists: false } }] }) })).status;
  const rb = { uid: { stringValue: b1.uid }, id: { stringValue: 'lee' }, text: { stringValue: '답장' }, read: { booleanValue: false } };
  ok(await fr(rb) === 200, '관리자가 규칙대로 쓴 답장은 통과(대조군)');
  ok(await fr({ ...rb, id: { stringValue: 'kim' } }) === 403 && await fr({ ...rb, dec: { stringValue: 'boss' } }) === 403 && await fr({ ...rb, text: { stringValue: '가'.repeat(501) } }) === 403
    && await fr({ ...rb, at: { timestampValue: '2020-01-01T00:00:00Z' } }, false) === 403 && await fr({ ...rb, uid: { stringValue: 'nobody' } }) === 403, '답장 꾸미기(다른 아이디·모르는 결정·501자·시각·없는 사람) → 거부');
  await admin.delReplies((await admin.replies()).filter(x => x.text === '답장').map(x => x.rid));
  ok(await err(admin.reply(b1.uid, '   ')) === 'empty' && await err(admin.reply('bad/../uid', '안녕')) === 'baduid', '빈 답장·이상한 기기 번호는 안 보냄');
  const r2 = await admin.reply(b1.uid, '이영희 님 확인했어요. 승인합니다', 'approved');
  ok((await B.check()).state === 'approved' && (await B.thread()).replies.find(x => x.rid === r2).dec === 'approved', '관리자: 승인하며 답장 → B 열림, 답장에 승인 표시');
  ok(await admin.reply(b1.uid, '', 'rejected') === null && (await B.check()).state === 'rejected' && (await B.thread()).replies.length === 2, '관리자: 글 없이 거절만(답장 없음)');
  const rp = await admin.replies();
  ok(rp.length === 2 && rp[0].rid === r2 && rp.every(x => x.uid === b1.uid), '관리자: 보낸 답장 목록(새것부터)');
  ok(await admin.unread() === 1, '답장은 관리자의 안 읽은 문자 수에 들지 않음');

  // 관리자 승인
  const list = await admin.list();
  ok(list.length === 3 && list.some(m => m.id === 'kim' && m.status === 'pending'), '관리자: 회원 목록 3명');
  await admin.setStatus(a1.uid, 'approved');
  ok((await A.check()).state === 'approved', '관리자가 승인 → A 열림');
  await admin.setStatus(b1.uid, 'rejected');
  ok((await B.check()).state === 'rejected', '관리자가 거절 → B 거절됨');
  await admin.setStatus(a1.uid, 'rejected');
  ok((await A.check()).state === 'rejected', '관리자가 승인 취소 → A 막힘');
  await admin.setStatus(a1.uid, 'approved');

  // 초대 코드: 맞으면 바로 승인
  const code = await admin.addCode();
  ok(/^[A-Z2-9]{6}$/.test(code) && (await admin.codes()).some(c => c.code === code), '관리자: 초대 코드 만들기 ' + code);
  const C = phone();
  ok(await err(C.register('choi', 'WRONG1')) === 'badcode', '틀린 초대 코드 → 거부');
  const c1 = await C.register('choi', code.toLowerCase());
  ok(c1.state === 'approved', '맞는 초대 코드 → 바로 승인');
  await admin.delCode(code);
  const D0 = phone();
  ok(await err(D0.register('jung', code)) === 'badcode', '지운 초대 코드는 못 씀');

  // 같은 휴대폰(앱을 다시 켜도, 토큰이 만료돼도) 같은 계정
  const A2 = phone(aStore);
  const a3 = await A2.check();
  ok(a3.uid === a1.uid && a3.state === 'approved', '앱을 다시 켜도 같은 휴대폰 계정');
  clock += 2 * 3600 * 1000;
  ok((await A2.check()).uid === a1.uid, '토큰이 만료되면 새로 받아 이어 감');

  // 서버 오류(5xx)로 토큰을 못 받으면 이 휴대폰 계정을 버리지 않는다. 토큰이 진짜 무효(400)일 때만 새 계정.
  const flaky = phone(aStore, async (url, opt) => (/securetoken/.test(url) ? new Response('{}', { status: 503 }) : fetch(url, opt)));
  ok(await err(flaky.check()) === 'server' && JSON.parse(aStore.m.get('pe_auth')).uid === a1.uid, '서버 오류: 계정 그대로');
  const zStore = memStore(); zStore.m.set('pe_auth', JSON.stringify({ uid: 'gone', refreshToken: 'bogus' }));
  const z = await phone(zStore).check();
  ok(z.state === 'none' && z.uid !== 'gone', '무효 토큰(400): 새 계정으로 처음 화면');

  // 시험 일정(config/plan, 3.2.1): 관리자만 쓰고, 예약 작업은 로그인 없이 읽는다
  const plan = { start: '2026-11-09', begin: '2026-11-10', target: 'auto', rounds: '', tr: '142', exam: '2027-05-15', next: '', nfrom: '', nexam: '' };
  ok(await phone().getPlan() === null, '일정을 보내기 전: config/plan 없음');
  ok(await admin.setPlan(plan) === true, '관리자: 시험 일정 보내기');
  const pub = await fetch(`${FS}/config/plan`);
  const pj = await pub.json();
  ok(pub.status === 200 && pj.fields.start.stringValue === '2026-11-09' && pj.fields.begin.stringValue === '2026-11-10' && !!pj.fields.at.timestampValue, '로그인 없이 읽기(예약 작업) → 일정과 서버 시각');
  ok((await fetch(`${FS}/config/other`)).status === 403 && (await fetch(`${FS}/config`)).status === 403, 'config의 다른 문서·목록은 못 읽음');
  await admin.setPlan({ ...plan, start: '2026-11-16', begin: '2026-11-18', rounds: '141=2027-01-30 142=2027-05-22', next: '143', nfrom: '2027-02-08', nexam: '2027-08-28' });
  const p2 = await phone().getPlan();
  ok(p2.start === '2026-11-16' && p2.rounds === '141=2027-01-30 142=2027-05-22' && p2.next === '143' && p2.nfrom === '2027-02-08', '다시 보내면 바뀐 일정(회차 날짜·다음 목표)');
  await admin.setPlan(plan);
  ok((await phone().getPlan()).next === '' && (await phone().getPlan()).rounds === '', '다음 목표·회차 날짜를 비우면 빈 칸으로');
  ok(await err(A2.setPlan(plan)) === 'denied', '회원(관리자 아님)은 일정을 못 씀');
  ok(await err(phone().setPlan(plan)) === 'denied', '아이디 없는 휴대폰도 못 씀');
  ok(await err(admin.setPlan({ ...plan, start: '11/09' })) === 'badplan' && await err(admin.setPlan({ ...plan, next: '143' })) === 'badplan', '앱 쪽 형식 검사(날짜·다음 목표 짝)');
  // 하루 외울 용어 수(3.2.6): 같은 문서의 terms 칸("auto"·"3"~"15", 없어도 됨)
  ok(await admin.setPlan({ ...plan, terms: '6' }) === true && (await phone().getPlan()).terms === '6', '하루 외울 용어 6 보내기 → 로그인 없이 읽힘');
  ok(await admin.setPlan({ ...plan, terms: '15' }) === true && await admin.setPlan({ ...plan, terms: 'auto' }) === true && (await phone().getPlan()).terms === 'auto', '15·auto(단계 규칙) 보내기');
  ok(await admin.setPlan(plan) === true && ((await phone().getPlan()).terms || '') === '', '그 전 앱처럼 terms 없이 보내도 통과(칸이 빠짐)');
  ok(await err(admin.setPlan({ ...plan, terms: '16' })) === 'badplan' && await err(admin.setPlan({ ...plan, terms: '2' })) === 'badplan', '앱 쪽 형식 검사(3~15·auto만)');
  // 규칙을 다시 게시하지 않은 Firebase(3.2.6 전 판): terms가 든 쓰기는 막히고, 일정만 다시 보낸다
  const oldRules = (u, o) => (o && o.method === 'POST' && /:commit$/.test(String(u)) && /"terms"/.test(String(o.body)) ? Promise.resolve(new Response(JSON.stringify({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'Missing or insufficient permissions.' } }), { status: 403, headers: { 'Content-Type': 'application/json' } })) : fetch(u, o));
  const adminOld = phone(adminStore, oldRules);
  ok(await adminOld.setPlan({ ...plan, start: '2026-11-16', terms: '7' }) === 'noterms' && (await phone().getPlan()).start === '2026-11-16' && ((await phone().getPlan()).terms || '') === '', '옛 규칙: 일정만 보내고 noterms');
  ok(await err(phone(memStore(), oldRules).setPlan({ ...plan, terms: '7' })) === 'denied', '옛 규칙이어도 관리자가 아니면 일정도 못 씀(그 오류 그대로)');
  await admin.setPlan(plan);
  const as = await admin.auth();
  const forgePlan = async (fields, transform = true) => (await fetch(`${FS}:commit`, { method: 'POST', headers: { Authorization: 'Bearer ' + as.idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{ update: { name: `projects/${PROJECT}/databases/(default)/documents/config/plan`, fields }, updateTransforms: transform ? [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }] : [] }] }) })).status;
  const pf = Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, { stringValue: v }]));
  ok(await forgePlan(pf) === 200, '규칙대로 쓴 일정은 통과(대조군)');
  ok(await forgePlan({ ...pf, start: { stringValue: '2026-11-09; rm' } }) === 403, '날짜 칸에 다른 글 → 거부');
  ok(await forgePlan({ ...pf, target: { stringValue: 'auto --x' } }) === 403, '목표 칸에 다른 글 → 거부');
  ok(await forgePlan({ ...pf, rounds: { stringValue: '141=2027-01-30 && ls' } }) === 403, '회차 날짜 칸에 다른 글 → 거부');
  ok(await forgePlan({ ...pf, next: { stringValue: '143' } }) === 403, '다음 목표만 있고 날짜 없음 → 거부');
  ok(await forgePlan({ ...pf, extra: { stringValue: 'x' } }) === 403, '다른 칸 넣기 → 거부');
  ok(await forgePlan({ ...pf, fresh: { stringValue: '10' } }) === 200 && await forgePlan({ ...pf, fresh: { stringValue: 'auto' } }) === 200, '하루 새 용어 수 10·auto → 통과');
  ok(await forgePlan({ ...pf, fresh: { stringValue: '0' } }) === 403 && await forgePlan({ ...pf, fresh: { stringValue: '6; rm' } }) === 403 && await forgePlan({ ...pf, fresh: { integerValue: '6' } }) === 403, '하루 새 용어 수 0·다른 글·숫자형 → 거부');
  ok(await forgePlan({ ...pf, terms: { stringValue: '3' } }) === 200 && await forgePlan({ ...pf, terms: { stringValue: '15' } }) === 200 && await forgePlan({ ...pf, terms: { stringValue: 'auto' } }) === 200, '하루 외울 용어 3·15·auto → 통과');
  ok(await forgePlan({ ...pf, terms: { stringValue: '2' } }) === 403 && await forgePlan({ ...pf, terms: { stringValue: '16' } }) === 403 && await forgePlan({ ...pf, terms: { stringValue: '6; rm' } }) === 403 && await forgePlan({ ...pf, terms: { integerValue: '6' } }) === 403, '하루 외울 용어 2·16·다른 글·숫자형 → 거부');
  ok(await forgePlan({ ...pf, at: { timestampValue: '2020-01-01T00:00:00Z' } }, false) === 403, '보낸 시각 꾸미기 → 거부');
  const { tr, ...noTr } = pf;
  ok(await forgePlan(noTr) === 403, '칸이 빠지면 → 거부');

  // 단답 답안지 그림(figs, 3.2.7): 관리자만 넣고·바꾸고·지우며, 승인된 회원과 관리자가 읽는다
  const img1 = Buffer.alloc(3000, 7).toString('base64'), img2 = Buffer.alloc(5000, 9).toString('base64');
  ok(JSON.stringify(await admin.figList()) === '[]', '그림: 처음엔 목록이 비어 있음');
  const fs1 = await admin.figSet('K31', img1, 'image/jpeg', 800, 600);
  ok(fs1.cid === 'K31' && fs1.w === 800 && fs1.h === 600 && /^20\d\d-/.test(fs1.at), '관리자: 그림 넣기(서버 시각)');
  const fl = await A2.figList();
  ok(fl.length === 1 && fl[0].cid === 'K31' && fl[0].w === 800 && fl[0].h === 600 && fl[0].at === fs1.at && !('b64' in fl[0]), '승인된 회원: 목록(그림 바이트 없이 번호·크기·때)');
  const fg = await A2.figGet('K31');
  ok(fg && fg.b64 === img1 && fg.type === 'image/jpeg' && fg.w === 800 && fg.at === fs1.at, '승인된 회원: 그림 받기(올린 바이트 그대로)');
  ok(await A2.figGet('A01') === null && await err(A2.figGet('../x')) === 'badcid', '없는 그림 → null, 이상한 번호 → 안 물음');
  ok(await err(B.figList()) === 'denied' && await err(B.figGet('K31')) === 'denied', '거절된 회원: 못 읽음');
  const P0 = phone(); await P0.register('park', '');
  ok(await err(P0.figGet('K31')) === 'denied' && await err(P0.figList()) === 'denied', '승인 대기 회원: 못 읽음');
  ok(await err(phone().figList()) === 'denied', '아이디 없는 휴대폰: 못 읽음');
  ok(await err(A2.figSet('K31', img2, 'image/jpeg', 10, 10)) === 'denied' && await err(A2.figSet('Z9', img2, 'image/jpeg', 10, 10)) === 'denied' && await err(A2.figDel('K31')) === 'denied',
    '회원은 넣기·바꾸기·지우기 못 함');
  await admin.figSet('K31', img2, 'image/png', 400, 300);
  const fg2 = await A2.figGet('K31');
  ok(fg2.b64 === img2 && fg2.type === 'image/png' && fg2.w === 400 && (await A2.figList()).length === 1, '관리자: 바꾸기(같은 카드를 덮어씀)');
  ok(await err(admin.figSet('bad/id', img1, 'image/jpeg', 1, 1)) === 'badcid' && await err(admin.figSet('K31', img1, 'image/gif', 1, 1)) === 'badtype'
    && await err(admin.figSet('K31', 'not base64!', 'image/jpeg', 1, 1)) === 'badimg' && await err(admin.figSet('K31', Buffer.alloc(900001).toString('base64'), 'image/jpeg', 1, 1)) === 'bigimg'
    && await err(admin.figSet('K31', 'QUJD', 'image/jpeg', 1, 1)) === 'bigimg' && await err(admin.figSet('K31', img1, 'image/jpeg', 0, 5)) === 'badsize', '앱 쪽 형식 검사(번호·형식·바이트·크기)');
  const ad = await admin.auth();
  const forgeFig = async (cid, fields, transform = true) => (await fetch(`${FS}:commit`, { method: 'POST', headers: { Authorization: 'Bearer ' + ad.idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{ update: { name: `projects/${PROJECT}/databases/(default)/documents/figs/${cid}`, fields }, updateTransforms: transform ? [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }] : [] }] }) })).status;
  const ff = { img: { bytesValue: img1 }, type: { stringValue: 'image/jpeg' }, w: { integerValue: '10' }, h: { integerValue: '10' } };
  ok(await forgeFig('X1', ff) === 200, '규칙대로 쓴 그림은 통과(대조군)');
  ok(await forgeFig('X1', { ...ff, img: { bytesValue: Buffer.alloc(900001, 1).toString('base64') } }) === 403 && await forgeFig('X1', { ...ff, img: { bytesValue: 'QUJD' } }) === 403, '900KB 넘거나 100B 안 되는 그림 → 거부');
  ok(await forgeFig('X1', { ...ff, img: { stringValue: 'data:image/jpeg;base64,' + img1 } }) === 403, '그림이 바이트가 아니면(글) → 거부');
  ok(await forgeFig('X1', { ...ff, type: { stringValue: 'text/html' } }) === 403 && await forgeFig('X1', { ...ff, w: { integerValue: '5000' } }) === 403 && await forgeFig('X1', { ...ff, h: { stringValue: '10' } }) === 403,
    '형식·크기 칸이 다르면 → 거부');
  ok(await forgeFig('X1', { ...ff, by: { stringValue: 'x' } }) === 403 && await forgeFig('X1', ff, false) === 403 && await forgeFig('a.b', ff) === 403, '모르는 칸·서버 시각 없이·이상한 번호 → 거부');
  ok(await admin.figDel('K31') === true && await admin.figDel('X1') === true && (await A2.figList()).length === 0, '관리자: 지우기 → 목록 비움');

  // 인터넷이 없으면: 확인은 실패하지만 마지막 상태는 남아 있다
  const off = phone(aStore, async () => { throw new TypeError('Network request failed'); });
  ok(await err(off.check()) === 'offline' && (await off.cached()).state === 'approved', '오프라인: 확인 실패, 마지막 승인 상태는 남음');

  // 아이디 지우기(앱 안 계정 삭제) → 아이디가 풀린다
  const r = await A2.remove();
  ok(r.state === 'none' && !aStore.m.size, 'A: 아이디 지우기 → 키체인 비움');
  ok(!(await admin.msgs()).some(x => x.uid === a1.uid) && (await admin.msgs()).some(x => x.id === 'lee'), 'A가 보낸 문자도 함께 지워짐(B 문자는 그대로)');
  const ownerGet = await owner('GET', `ids/kim`);
  ok(ownerGet.status === 404, 'kim 아이디 문서도 지워짐');
  const E = phone();
  ok((await E.register('kim', '')).state === 'pending', '다른 휴대폰이 kim을 새로 만들 수 있음');

  // 관리자 정리: 회원 지우기
  await admin.removeMember(b1.uid, 'lee');
  ok((await B.check()).state === 'none', '관리자가 B를 지우면 B는 처음 화면');
  ok(await admin.delReplies((await admin.replies()).map(x => x.rid)) === 2 && (await admin.replies()).length === 0, '관리자: 답장 지우기');
  // 아이디 지우기는 받은 답장도 함께 지운다
  const G = phone(); const g1 = await G.register('gwon', '');
  await admin.reply(g1.uid, '반가워요'); await G.remove();
  ok((await admin.replies()).length === 0, '아이디 지우기 → 받은 답장도 함께 지워짐');

  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
