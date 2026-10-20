// 회원 승인: Firebase 익명 계정(이 휴대폰 키체인에 고정) + Firestore의 승인 상태. SDK 없이 REST로 부른다.
// fetch·저장소(store)는 밖에서 받으므로 같은 코드가 앱(App.js)과 에뮬레이터 검사(tests/member.test.js)에서 돈다.
// 규칙은 firebase/firestore.rules. 승인 상태를 바꾸는 권한은 규칙이 관리자에게만 준다.
const ID_RE = /^[a-z0-9_가-힣]{2,16}$/;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AUTH_KEY = 'pe_auth', CACHE_KEY = 'pe_member';

function cleanId(s) { return String(s || '').trim().toLowerCase(); }

class MemberError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

// Firestore 문서 값 ↔ JS 값
function toFields(o) {
  const f = {};
  for (const [k, v] of Object.entries(o)) {
    if (v == null) continue;
    if (v instanceof Date) f[k] = { timestampValue: v.toISOString() };
    else if (typeof v === 'boolean') f[k] = { booleanValue: v };
    else if (typeof v === 'number') f[k] = { integerValue: String(v) };
    else f[k] = { stringValue: String(v) };
  }
  return f;
}
function fromDoc(doc) {
  const o = { _id: decodeURIComponent(String(doc.name || '').split('/').pop()) };
  for (const [k, v] of Object.entries(doc.fields || {})) o[k] = v.stringValue ?? v.timestampValue ?? v.booleanValue ?? (v.integerValue != null ? Number(v.integerValue) : null);
  return o;
}

// store: { get(key) → 문자열|null, set(key, 문자열), del(key) } (앱에서는 키체인)
function createMember({ apiKey, projectId, fetch, store, now = () => Date.now(), hosts = {} }) {
  const AUTH = (hosts.auth || 'https://identitytoolkit.googleapis.com') + '/v1';
  const TOKEN = (hosts.token || 'https://securetoken.googleapis.com') + '/v1/token';
  const ROOT = `projects/${projectId}/databases/(default)/documents`;
  const FS = (hosts.firestore || 'https://firestore.googleapis.com') + '/v1/' + ROOT;
  let session = null; // { uid, idToken, refreshToken, exp }

  const configured = () => !!(apiKey && projectId);

  async function call(url, opt) {
    let r;
    try { r = await fetch(url, opt); } catch (e) { throw new MemberError('offline', '인터넷에 연결할 수 없어요'); }
    let body = null;
    try { body = await r.json(); } catch (e) { /* 빈 응답 */ }
    if (!r.ok) {
      const st = (body && body.error && (body.error.status || body.error.message)) || 'HTTP ' + r.status;
      const err = new MemberError(r.status === 404 ? 'notfound' : r.status === 403 ? 'denied' : r.status === 409 ? 'exists' : 'server', String(st));
      err.status = r.status;
      throw err;
    }
    return body || {};
  }

  async function saveAuth(s) {
    session = s;
    await store.set(AUTH_KEY, JSON.stringify({ uid: s.uid, refreshToken: s.refreshToken }));
  }

  async function signUp() {
    const b = await call(`${AUTH}/accounts:signUp?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
    await saveAuth({ uid: b.localId, idToken: b.idToken, refreshToken: b.refreshToken, exp: now() + Number(b.expiresIn || 3600) * 1000 });
  }

  // 이 휴대폰의 계정. 키체인에 남은 계정이 있으면 이어 쓰고, 없으면 새로 만든다.
  async function auth() {
    if (!configured()) throw new MemberError('nocfg', '회원 확인 설정이 없는 빌드예요');
    if (session && session.exp - now() > 60000) return session;
    const saved = JSON.parse((await store.get(AUTH_KEY)) || 'null');
    if (saved && saved.refreshToken) {
      try {
        const b = await call(`${TOKEN}?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(saved.refreshToken) });
        await saveAuth({ uid: b.user_id, idToken: b.id_token, refreshToken: b.refresh_token, exp: now() + Number(b.expires_in || 3600) * 1000 });
        return session;
      } catch (e) {
        // 계정이 지워졌거나 토큰이 무효(400)일 때만 새 계정. 인터넷·서버 문제로 이 휴대폰의 계정을 버리지 않는다.
        if (e.status !== 400) throw e;
      }
    }
    await signUp();
    return session;
  }

  async function req(method, path, body) {
    const s = await auth();
    return call(path.startsWith('http') ? path : `${FS}/${path}`, { method, headers: { Authorization: 'Bearer ' + s.idToken, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  }
  async function getDoc(path) {
    try { return fromDoc(await req('GET', path)); } catch (e) { if (e.code === 'notfound') return null; throw e; }
  }
  // commit 본문의 문서 이름은 인코딩하지 않는다(URL 경로만 enc). 한글 아이디도 그대로 문서 ID가 된다.
  const docName = p => `${ROOT}/${p}`;
  const UID_RE = /^[A-Za-z0-9]{1,128}$/;
  const enc = s => encodeURIComponent(s);

  async function saveCache(m) { await store.set(CACHE_KEY, JSON.stringify(Object.assign({ checkedAt: now() }, m))); return m; }

  // 지금 상태: none(아이디 없음) · pending · approved · rejected
  async function check() {
    const s = await auth();
    const m = await getDoc(`members/${enc(s.uid)}`);
    if (!m) return saveCache({ state: 'none', uid: s.uid });
    let admin = false;
    if (m.status === 'approved') admin = !!(await getDoc(`admins/${enc(s.uid)}`));
    return saveCache({ state: m.status, id: m.id, uid: s.uid, admin });
  }

  async function cached() { try { return JSON.parse((await store.get(CACHE_KEY)) || 'null'); } catch (e) { return null; } }

  // 아이디 만들기(초대 코드가 맞으면 바로 승인). 아이디 문서와 회원 문서를 한 번에 만든다.
  async function register(rawId, rawCode) {
    const id = cleanId(rawId), code = String(rawCode || '').trim().toUpperCase();
    if (!ID_RE.test(id)) throw new MemberError('badid', '아이디는 2~16자, 한글·영문 소문자·숫자·밑줄(_)만 쓸 수 있어요');
    const s = await auth();
    const member = { id, status: code ? 'approved' : 'pending', createdAt: new Date(now()), code: code || null };
    try {
      await req('POST', `${FS}:commit`, { writes: [
        { update: { name: docName(`members/${s.uid}`), fields: toFields(member) }, currentDocument: { exists: false } },
        { update: { name: docName(`ids/${id}`), fields: toFields({ uid: s.uid }) }, currentDocument: { exists: false } },
      ] });
    } catch (e) {
      if (e.code === 'denied' && code) throw new MemberError('badcode', '초대 코드가 맞지 않아요');
      if (e.code === 'denied' || e.code === 'exists' || /ALREADY_EXISTS|FAILED_PRECONDITION/.test(e.message)) {
        const owner = await getDoc(`ids/${enc(id)}`).catch(() => null);
        if (owner && owner.uid !== s.uid) throw new MemberError('taken', '이미 있는 아이디예요');
        const mine = await getDoc(`members/${enc(s.uid)}`).catch(() => null);
        if (mine) return check(); // 이미 이 휴대폰에 아이디가 있다
      }
      throw e;
    }
    return check();
  }

  // 아이디 지우기(앱 안 계정 삭제): 회원·아이디 문서와 익명 계정을 지우고 키체인을 비운다
  async function remove() {
    const s = await auth();
    const m = await getDoc(`members/${enc(s.uid)}`);
    const writes = [{ delete: docName(`members/${s.uid}`) }];
    if (m && ID_RE.test(m.id)) writes.push({ delete: docName(`ids/${m.id}`) });
    await req('POST', `${FS}:commit`, { writes });
    try { await call(`${AUTH}/accounts:delete?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: s.idToken }) }); } catch (e) { /* 문서는 이미 지웠다 */ }
    session = null;
    await store.del(AUTH_KEY);
    await store.del(CACHE_KEY);
    return { state: 'none' };
  }

  // 관리자
  async function list() {
    const b = await req('GET', 'members?pageSize=300');
    return (b.documents || []).map(fromDoc).map(m => ({ uid: m._id, id: m.id, status: m.status, createdAt: m.createdAt, code: m.code || '' }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  async function setStatus(uid, status) {
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new MemberError('badstatus');
    await req('PATCH', `members/${enc(uid)}?updateMask.fieldPaths=status&updateMask.fieldPaths=decidedAt&currentDocument.exists=true`, { fields: toFields({ status, decidedAt: new Date(now()) }) });
    return true;
  }
  async function removeMember(uid, id) {
    if (!UID_RE.test(uid)) throw new MemberError('baduid', '잘못된 기기 번호예요');
    const writes = [{ delete: docName(`members/${uid}`) }];
    if (ID_RE.test(cleanId(id))) writes.push({ delete: docName(`ids/${cleanId(id)}`) });
    await req('POST', `${FS}:commit`, { writes });
    return true;
  }
  async function codes() {
    const b = await req('GET', 'codes?pageSize=100');
    return (b.documents || []).map(fromDoc).map(c => ({ code: c._id, createdAt: c.createdAt }));
  }
  async function addCode(rand = Math.random) {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_CHARS.charAt(Math.floor(rand() * CODE_CHARS.length));
    await req('PATCH', `codes/${enc(code)}?currentDocument.exists=false`, { fields: toFields({ createdAt: new Date(now()) }) });
    return code;
  }
  async function delCode(code) { await req('DELETE', `codes/${enc(String(code).toUpperCase())}`); return true; }

  return { configured, auth, check, cached, register, remove, list, setStatus, removeMember, codes, addCode, delCode, uid: () => session && session.uid };
}

module.exports = { createMember, MemberError, cleanId, ID_RE };
