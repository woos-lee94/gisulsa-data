// 기술사 6개월 아이폰 앱: web/ 웹앱을 앱 안에 넣어 WebView 화면 전체로 띄운다.
// 화면과 계산은 모두 web/app.js가 하고, 이 파일은 저장·복사·파일·확인 창·화면 켜 두기·받아 오기·알림만 잇는다(native/host.js).
// 관리자가 승인한 휴대폰만 연다(native/member.js, Firebase). 승인 전에는 회원 화면(native/Gate.js)만 보인다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { bootScript, createHost, jsLiteral } from './native/host';
import { prepareWeb, readNotifConfig, readStore, saveFile, writeStore } from './native/files';
import * as notify from './native/notify';
import { createMember } from './native/member';
import Gate from './native/Gate';

SplashScreen.preventAutoHideAsync().catch(() => {});

const BG = { light: '#EEF1F4', dark: '#0E1319' }; // styles.css의 --paper
const AWAKE_TAG = 'pe-timer';

function savedTheme(store) {
  try { return (JSON.parse(store.pe_state_v1 || '{}').settings || {}).theme; } catch (e) { return null; }
}

// 확인 창: "이 카드를 숨길까요? 가져오기 화면에서 …"처럼 첫 문장은 제목, 나머지는 본문
let lastAlertClosed = 0;
function confirmAlert(msg) {
  const m = msg.match(/^(.+?[?.])\s+([\s\S]+)$/);
  const danger = /지웁|삭제|덮어/.test(msg);
  return new Promise(resolve => {
    const done = ok => () => { lastAlertClosed = Date.now(); resolve(ok); };
    const show = () => Alert.alert(m ? m[1] : msg, m ? m[2] : undefined, [
      { text: '취소', style: 'cancel', onPress: done(false) },
      { text: '확인', style: danger ? 'destructive' : 'default', onPress: done(true) },
    ]);
    // 확인 창 두 개가 이어질 때(전체 초기화) 앞 창이 닫히는 동안 기다린다
    setTimeout(show, Math.max(0, 400 - (Date.now() - lastAlertClosed)));
  });
}

const isLocal = url => /^file:\/\//.test(url || '');

// 회원: Firebase 설정은 EAS 환경 변수(EXPO_PUBLIC_FIREBASE_*)로 빌드에 들어간다. 계정 열쇠는 이 기기 키체인에만 둔다.
const KC = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const member = createMember({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  // API 키를 iOS 앱으로 제한해 두면(Google Cloud 콘솔) 이 머리글이 있는 요청만 받는다
  fetch: (url, opt) => fetch(url, { ...opt, headers: { ...(opt && opt.headers), 'X-Ios-Bundle-Identifier': (Constants.expoConfig && Constants.expoConfig.ios && Constants.expoConfig.ios.bundleIdentifier) || '' } }),
  store: { get: k => SecureStore.getItemAsync(k, KC), set: (k, v) => SecureStore.setItemAsync(k, v, KC), del: k => SecureStore.deleteItemAsync(k, KC) },
});
const memberState = e => (e && e.code === 'offline' ? { state: 'offline' } : e && e.code === 'nocfg' ? { state: 'nocfg' } : { state: 'error', msg: String((e && e.message) || e) });

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' };
}

export default function App() {
  const system = useColorScheme();
  const web = useRef(null);
  const store = useRef(null); // 가장 최근 학습 기록(웹뷰를 다시 띄울 때 이것을 넣는다)
  const notifCfg = useRef(null);
  const loaded = useRef(false);
  const pendingHash = useRef(null);
  const [files, setFiles] = useState(null);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(null);
  const [gen, setGen] = useState(0);
  const [m, setM] = useState({ state: 'loading' });
  const [busy, setBusy] = useState(false);
  const [gateErr, setGateErr] = useState(null);
  const lastCheck = useRef(0);

  const inject = useCallback(code => { if (web.current) web.current.injectJavaScript(code); }, []);
  const go = useCallback(h => inject(`window.PE_IO&&PE_IO._go(${jsLiteral(h)});true;`), [inject]);

  useEffect(() => {
    (async () => {
      try {
        const f = await prepareWeb();
        store.current = readStore();
        notifCfg.current = readNotifConfig();
        const t = savedTheme(store.current);
        if (t === 'dark' || t === 'light') setDark(t === 'dark');
        // 알림을 눌러 앱이 켜졌으면 그 화면으로 간다
        const h = notify.hashOf(notify.getLastNotificationResponse());
        if (h) { pendingHash.current = h; notify.clearLastNotificationResponse(); }
        // 예약 알림은 기기에 남지만, 새 휴대폰으로 옮긴 경우 등을 위해 저장된 설정대로 다시 맞춘다
        if (notifCfg.current.wd.on || notifCfg.current.su.on) notify.schedule(notifCfg.current).catch(() => {});
        setFiles(f);
      } catch (e) {
        setError(String((e && e.message) || e));
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 5000);
    return () => clearTimeout(t);
  }, []);

  // 회원 상태: 승인된 적 있는 휴대폰은 바로 열고(인터넷 없어도), 뒤에서 다시 확인한다
  const recheck = useCallback(async quiet => {
    lastCheck.current = Date.now();
    try { const r = await member.check(); setM(r); setGateErr(null); return r; }
    catch (e) {
      const c = await member.cached();
      if (c && c.state === 'approved') return c;            // 승인된 휴대폰은 확인이 안 돼도 그대로 연다
      if (c && c.state && c.state !== 'none' && e.code === 'offline') setM({ ...c, offline: true });
      else setM(memberState(e));
      if (!quiet) setGateErr(e.code === 'offline' ? null : String(e.message || e));
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!member.configured()) return setM({ state: 'nocfg' });
      const c = await member.cached();
      if (c && c.state === 'approved') setM(c);
      await recheck(true);
    })();
  }, [recheck]);

  // 승인을 기다리는 동안 15초마다 다시 확인
  useEffect(() => {
    if (m.state !== 'pending') return undefined;
    const t = setInterval(() => { if (AppState.currentState === 'active') recheck(true); }, 15000);
    return () => clearInterval(t);
  }, [m.state, recheck]);

  // 승인 전 화면에서는 스플래시를 바로 내린다
  useEffect(() => { if (m.state !== 'loading' && m.state !== 'approved') SplashScreen.hideAsync().catch(() => {}); }, [m.state]);

  const onRegister = useCallback(async (id, code) => {
    setBusy(true); setGateErr(null);
    try { setM(await member.register(id, code)); } catch (e) { setGateErr(String(e.message || e)); } finally { setBusy(false); }
  }, []);
  const onRefresh = useCallback(async () => { setBusy(true); await recheck(false); setBusy(false); }, [recheck]);
  const onRemove = useCallback(async () => {
    if (!(await confirmAlert('아이디를 지울까요? 승인도 함께 없어지고 처음 화면으로 돌아가요.'))) return;
    setBusy(true);
    try { setM(await member.remove()); setGateErr(null); } catch (e) { setGateErr(String(e.message || e)); } finally { setBusy(false); }
  }, []);

  useEffect(() => {
    const sub = notify.addNotificationResponseReceivedListener(r => {
      const h = notify.hashOf(r);
      if (!h) return;
      notify.clearLastNotificationResponse();
      if (loaded.current) go(h); else pendingHash.current = h;
    });
    return () => sub.remove();
  }, [go]);

  // 백그라운드로 갈 때 기록을 바로 쓰고, 돌아오면 웹앱처럼 새 세트를 확인한다
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', s => {
      if (s === 'inactive' || s === 'background') inject('window.PE_IO&&PE_IO._hide();true;');
      if (s === 'active' && prev === 'background') inject('window.PE_IO&&PE_IO._wake();true;');
      if (s === 'active' && member.configured() && Date.now() - lastCheck.current > 30000) recheck(true);
      prev = s;
    });
    return () => sub.remove();
  }, [inject, recheck]);

  const host = useMemo(() => createHost({
    inject,
    writeStore: (k, v) => { store.current[k] = v; writeStore(k, v); },
    copy: text => Clipboard.setStringAsync(text),
    saveFile,
    confirm: confirmAlert,
    keepAwake: on => (on ? activateKeepAwakeAsync(AWAKE_TAG) : deactivateKeepAwake(AWAKE_TAG)).catch(() => {}),
    fetchText,
    setNotif: async cfg => (notifCfg.current = await notify.setNotif(cfg)),
    look: d => setDark(d),
    member: async (op, a) => {
      if (op === 'list') return { members: await member.list(), codes: await member.codes(), me: member.uid() };
      if (op === 'set') return member.setStatus(String(a.uid), String(a.status));
      if (op === 'del') return member.removeMember(String(a.uid), String(a.id || ''));
      if (op === 'code-add') return member.addCode();
      if (op === 'code-del') return member.delCode(String(a.code));
      if (op === 'remove') { const r = await member.remove(); setM(r); return true; }
      throw new Error('모르는 요청: ' + op);
    },
  }), [inject]);

  // 웹뷰에는 앱에 넣은 파일(file://)만 띄운다. 바깥 주소는 사파리 등 기본 앱으로 열고, 메시지도 앱 파일에서 온 것만 받는다.
  const onMessage = useCallback(e => { if (isLocal(e.nativeEvent.url)) host(e.nativeEvent.data); }, [host]);
  const onNav = useCallback(req => {
    const u = req.url || '';
    if (isLocal(u) || u === 'about:blank') return true;
    if (/^(https?|mailto|tel):/i.test(u)) Linking.openURL(u).catch(() => {});
    return false;
  }, []);

  const onLoadEnd = useCallback(() => {
    loaded.current = true;
    SplashScreen.hideAsync().catch(() => {});
    if (pendingHash.current) { go(pendingHash.current); pendingHash.current = null; }
  }, [go]);

  // 웹뷰 프로세스가 메모리 부족으로 꺼지면, 최신 기록을 다시 넣어 새로 띄운다
  const onTerminate = useCallback(() => { loaded.current = false; setGen(g => g + 1); }, []);

  // 처음부터 #today로 연다(파일 주소에서 history.replaceState에 기대지 않도록)
  const source = useMemo(() => files && { uri: files.indexUri + '#today' }, [files]);
  const script = useMemo(() => files && bootScript({ store: store.current, notif: notifCfg.current, version: Constants.expoConfig && Constants.expoConfig.version, member: { id: m.id || '', admin: !!m.admin, uid: m.uid || '' } }), [files, gen, m.id, m.admin, m.uid]);

  const isDark = dark == null ? system === 'dark' : dark;
  const bg = isDark ? BG.dark : BG.light;

  if (error) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: bg }]}>
        <Text style={[styles.err, { color: isDark ? '#E9EEF4' : '#172231' }]}>앱 파일을 준비하지 못했어요.{'\n'}앱을 완전히 닫았다가 다시 열어 주세요.{'\n\n'}{error}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.fill, { backgroundColor: bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {m.state !== 'approved' && <Gate m={m} busy={busy} error={gateErr} dark={isDark} onRegister={onRegister} onRefresh={onRefresh} onRemove={onRemove} />}
      {files && m.state === 'approved' && (
        <WebView
          key={gen}
          ref={web}
          source={source}
          originWhitelist={['*']}
          allowingReadAccessToURL={files.dirUri}
          injectedJavaScriptBeforeContentLoaded={script}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onNav}
          onLoadEnd={onLoadEnd}
          onContentProcessDidTerminate={onTerminate}
          setSupportMultipleWindows={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          allowsBackForwardNavigationGestures
          allowsLinkPreview={false}
          dataDetectorTypes="none"
          keyboardDisplayRequiresUserAction={false}
          webviewDebuggingEnabled={__DEV__}
          style={[styles.fill, { backgroundColor: bg }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
