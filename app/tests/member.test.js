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

  // 인터넷이 없으면: 확인은 실패하지만 마지막 상태는 남아 있다
  const off = phone(aStore, async () => { throw new TypeError('Network request failed'); });
  ok(await err(off.check()) === 'offline' && (await off.cached()).state === 'approved', '오프라인: 확인 실패, 마지막 승인 상태는 남음');

  // 아이디 지우기(앱 안 계정 삭제) → 아이디가 풀린다
  const r = await A2.remove();
  ok(r.state === 'none' && !aStore.m.size, 'A: 아이디 지우기 → 키체인 비움');
  const ownerGet = await owner('GET', `ids/kim`);
  ok(ownerGet.status === 404, 'kim 아이디 문서도 지워짐');
  const E = phone();
  ok((await E.register('kim', '')).state === 'pending', '다른 휴대폰이 kim을 새로 만들 수 있음');

  // 관리자 정리: 회원 지우기
  await admin.removeMember(b1.uid, 'lee');
  ok((await B.check()).state === 'none', '관리자가 B를 지우면 B는 처음 화면');

  console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: 예외', e); process.exit(1); });
