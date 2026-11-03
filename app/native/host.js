// 앱 쪽 다리: 웹 페이지(web/bridge.js의 PE_IO)와 주고받는 규칙.
// expo 모듈은 deps로 받으므로 같은 코드가 앱(App.js)과 Node 검사(tests/native.test.js)에서 돈다.
const STORE_KEYS = ['pe_state_v1', 'pe_sets_v1'];
const MEMBER_OPS = ['list', 'set', 'del', 'code-add', 'code-del', 'remove', 'unread', 'msg-read', 'msg-del', 'msg-send'];
const NOTIF_DEFAULT = { wd: { on: false, time: '07:00' }, su: { on: false, time: '20:00' } };

// JS 소스에 그대로 넣을 수 있는 값 표기(JSON + 줄 구분 문자 이스케이프)
function jsLiteral(v) {
  return JSON.stringify(v === undefined ? null : v).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// 페이지보다 먼저 넣는 스크립트: 저장해 둔 학습 기록과 알림 설정
function bootScript({ store, notif, version, member }) {
  return `window.PE_NATIVE=${jsLiteral({ platform: 'ios', version, store, notif, member: member || null })};true;`;
}

function cleanNotif(c) {
  const out = {};
  for (const k of Object.keys(NOTIF_DEFAULT)) {
    const v = (c && c[k]) || {};
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(v.time) ? v.time : NOTIF_DEFAULT[k].time;
    out[k] = { on: v.on === true, time };
  }
  return out;
}

// 알림 예약 목록. weekday는 expo-notifications 기준(1=일요일 … 7=토요일)
function notifPlan(cfg) {
  const c = cleanNotif(cfg);
  const hm = t => t.split(':').map(Number);
  const out = [];
  if (c.wd.on) {
    const [hour, minute] = hm(c.wd.time);
    for (const weekday of [2, 3, 4, 5, 6]) out.push({ id: 'pe-wd-' + weekday, weekday, hour, minute, title: '오늘 세트 확인', body: '오늘 세트를 열어 용어·퀴즈·논술을 시작하세요.', hash: 'today' });
  }
  if (c.su.on) {
    const [hour, minute] = hm(c.su.time);
    out.push({ id: 'pe-su', weekday: 1, hour, minute, title: '복습 비우기', body: '이번 주 오답 노트와 세트 복습을 정리해요.', hash: 'review' });
  }
  return out;
}

function safeFileName(name) {
  const n = String(name || '').replace(/[^\w.-]/g, '');
  return /\.json$/.test(n) ? n : 'gisulsa-backup.json';
}

// deps: inject(code), writeStore(key, text), copy(text), saveFile(name, text, type), pickFile() → Promise<{name, text}|null>, confirm(msg) → Promise<boolean>,
//       keepAwake(on), fetchText(url) → Promise<{ok, status, text}>, setNotif(cfg) → Promise<cfg>, look(dark),
//       member(op, args) → 관리자 화면·문자함·아이디 지우기·관리자에게 문자(list, set, del, code-add, code-del, remove, unread, msg-read, msg-del, msg-send)
function createHost(deps) {
  const reply = (id, ok, v, err) => deps.inject(`window.PE_IO&&PE_IO._reply(${jsLiteral({ id, ok, v, err })});true;`);
  const toast = m => deps.inject(`window.PE_IO&&PE_IO._toast(${jsLiteral(m)});true;`);
  return async function handle(raw) {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    switch (m.t) {
      case 'store':
        if (!STORE_KEYS.includes(m.k) || typeof m.v !== 'string') return;
        try { await deps.writeStore(m.k, m.v); } catch (e) { toast('기록을 저장하지 못했어요. 휴대폰 저장 공간을 확인하세요'); }
        return;
      case 'awake': return deps.keepAwake(m.on === true);
      case 'look': return deps.look(m.dark === true);
    }
    try {
      let v;
      switch (m.t) {
        case 'copy': await deps.copy(String(m.text)); break;
        case 'save': await deps.saveFile(safeFileName(m.name), String(m.text), String(m.type || 'application/json')); break;
        case 'pick': { const f = await deps.pickFile(); v = f ? { name: String(f.name || ''), text: String(f.text) } : null; break; }
        case 'confirm': v = (await deps.confirm(String(m.msg))) === true; break;
        case 'fetch':
          if (!/^https:\/\//.test(m.url)) throw new Error('https 주소만 받아 와요');
          v = await deps.fetchText(m.url); break;
        case 'notif': v = { cfg: await deps.setNotif(cleanNotif(m.cfg)) }; break;
        case 'member':
          if (!MEMBER_OPS.includes(m.op)) throw new Error('모르는 회원 요청');
          v = await deps.member(m.op, m.args && typeof m.args === 'object' ? m.args : {}); break;
        default: throw new Error('모르는 요청: ' + m.t);
      }
      reply(m.id, true, v);
    } catch (e) {
      reply(m.id, false, undefined, String((e && e.message) || e));
    }
  };
}

module.exports = { STORE_KEYS, MEMBER_OPS, NOTIF_DEFAULT, jsLiteral, bootScript, cleanNotif, notifPlan, safeFileName, createHost };
