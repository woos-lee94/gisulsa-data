// 앱 업데이트(3.2.0): 화면·계산 코드(web 묶음 포함)는 EAS Update로 App Store를 거치지 않고 받는다.
// 이 파일은 expo 모듈 없이 도는 계산만 둔다(App.js와 Node 검사 tests/native.test.js가 같이 쓴다).
//
// 웹 화면에 보내는 상태(PE_IO._update) { s, v, at, err, url }
//   s: off   업데이트를 쓰지 않는 빌드(개발 실행, 프로젝트 설정 없음)
//      idle  아직 확인 전 · check 확인 중 · none 최신
//      avail 새 버전 있음(아직 안 받음) · busy 받는 중 · ready 받아 둠(다시 열면 적용)
//      err   확인·받기 실패(err: 이유) · store App Store에만 있는 새 버전(네이티브가 바뀐 빌드, url)
//   v: 새 버전 번호(업데이트를 올릴 때의 app.json 버전), at: 마지막 확인 시각(ms)

const STORE_LOOKUP = 'https://itunes.apple.com/lookup?country=kr&bundleId=';
const CHECK_EVERY = 30 * 60 * 1000;          // 다시 볼 때 확인 간격
const STORE_EVERY = 12 * 60 * 60 * 1000;     // App Store 조회 간격

// 업데이트 정보(useUpdates의 availableUpdate·downloadedUpdate)에서 버전 번호
function verOf(info) {
  const m = info && info.manifest;
  const e = m && m.extra && m.extra.expoClient;
  return (e && typeof e.version === 'string' && e.version) || '';
}

// a가 b보다 새 버전이면 true(3.10.0 > 3.9.1, 빈 값은 비교하지 않음)
function newer(a, b) {
  if (!a || !b) return false;
  const p = s => String(s).split('.').map(x => parseInt(x, 10) || 0);
  const A = p(a), B = p(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) > (B[i] || 0);
  }
  return false;
}

function errText(e) {
  const t = String((e && (e.message || e)) || '');
  return /network|internet|offline|timed? ?out|connection|could not connect|NSURLError/i.test(t) ? '인터넷 연결을 확인하세요' : '잠시 뒤 다시 확인하세요';
}

// useUpdates() 결과 u와 {enabled, store: {v, url}|null, running: 지금 도는 버전} → 웹 화면 상태
function updState(u, o) {
  if (!o || !o.enabled) return { s: 'off' };
  u = u || {};
  const t = u.lastCheckForUpdateTimeSinceRestart, at = t ? +new Date(t) : 0;
  if (u.isUpdatePending) return { s: 'ready', v: verOf(u.downloadedUpdate), at };
  if (u.isDownloading) return { s: 'busy', v: verOf(u.availableUpdate), at };
  if (u.isUpdateAvailable) {
    const x = { s: 'avail', v: verOf(u.availableUpdate), at };
    if (u.downloadError) x.err = errText(u.downloadError);
    return x;
  }
  if (u.isChecking) return { s: 'check', at };
  if (o.store && newer(o.store.v, o.running)) return { s: 'store', v: o.store.v, url: o.store.url, at };
  if (u.checkError) return { s: 'err', err: errText(u.checkError), at };
  return { s: at ? 'none' : 'idle', at };
}

// App Store 조회(iTunes lookup) 결과 → { v, url } | null. 주소는 App Store 앱 페이지만 받는다
function parseStore(text) {
  try {
    const r = JSON.parse(text).results, x = r && r[0];
    if (x && typeof x.version === 'string' && /^\d+(\.\d+)*$/.test(x.version) && /^https:\/\/apps\.apple\.com\//.test(x.trackViewUrl || '')) return { v: x.version, url: x.trackViewUrl };
  } catch (e) { /* 깨진 응답은 없는 것으로 */ }
  return null;
}

module.exports = { STORE_LOOKUP, CHECK_EVERY, STORE_EVERY, verOf, newer, errText, updState, parseStore };
