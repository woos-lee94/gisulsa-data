// 기술사 6개월 아이폰 앱: web/ 웹앱을 앱 안에 넣어 WebView 화면 전체로 띄운다.
// 화면과 계산은 모두 web/app.js가 하고, 이 파일은 저장·복사·파일·확인 창·화면 켜 두기·받아 오기·알림만 잇는다(native/host.js).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { bootScript, createHost, jsLiteral } from './native/host';
import { prepareWeb, readNotifConfig, readStore, saveFile, writeStore } from './native/files';
import * as notify from './native/notify';

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
      prev = s;
    });
    return () => sub.remove();
  }, [inject]);

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
  const script = useMemo(() => files && bootScript({ store: store.current, notif: notifCfg.current, version: Constants.expoConfig && Constants.expoConfig.version }), [files, gen]);

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
      {files && (
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
