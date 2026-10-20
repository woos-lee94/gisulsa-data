// 앱 안의 파일: 웹앱 파일 풀기, 학습 기록 저장, 백업 파일 내보내기
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import bundle from './webBundle';
import { STORE_KEYS, cleanNotif } from './host';

const FONT = require('../assets/fonts/PretendardVariable.woff2');

// 웹앱 파일(web/ 묶음 + 글꼴)을 캐시 폴더에 풀어 file:// 로 띄운다. 묶음이 바뀐 빌드에서만 다시 쓴다.
export async function prepareWeb() {
  const root = new Directory(Paths.cache, 'web');
  const dir = new Directory(root, bundle.hash);
  const index = new File(dir, 'index.html');
  const font = new File(dir, 'PretendardVariable.woff2');
  if (!index.exists || !font.exists) {
    if (root.exists) root.delete();
    dir.create({ intermediates: true });
    const [asset] = await Asset.loadAsync(FONT);
    new File(asset.localUri || asset.uri).copySync(font, { overwrite: true });
    // index.html을 마지막에 써서, 중간에 끊기면 다음 실행 때 처음부터 다시 푼다
    for (const [name, text] of Object.entries(bundle.files)) if (name !== 'index.html') new File(dir, name).writeSync(text);
    index.writeSync(bundle.files['index.html']);
  }
  return { dirUri: dir.uri, indexUri: index.uri };
}

// 학습 기록(pe_state_v1·pe_sets_v1)과 알림 설정: Documents/store/에 JSON 문자열 그대로 둔다(아이폰 백업에 포함).
const storeDir = new Directory(Paths.document, 'store');

function readText(name) {
  const main = new File(storeDir, name), tmp = new File(storeDir, name + '.tmp');
  // 쓰는 도중 앱이 꺼졌으면 .tmp가 남는다. 온전한 JSON이면 그것이 가장 최근 기록이다.
  if (tmp.exists) {
    try { const t = tmp.textSync(); JSON.parse(t); return t; } catch (e) { /* 깨진 임시 파일은 버린다 */ }
  }
  return main.exists ? main.textSync() : null;
}

function writeText(name, text) {
  if (!storeDir.exists) storeDir.create({ intermediates: true, idempotent: true });
  const tmp = new File(storeDir, name + '.tmp');
  tmp.writeSync(text);
  tmp.moveSync(new File(storeDir, name), { overwrite: true });
}

export function readStore() {
  const store = {};
  for (const k of STORE_KEYS) store[k] = readText(k + '.json');
  return store;
}

export function writeStore(key, text) {
  writeText(key + '.json', text);
}

export function readNotifConfig() {
  try { const t = readText('notif.json'); return cleanNotif(t ? JSON.parse(t) : null); } catch (e) { return cleanNotif(null); }
}

export function writeNotifConfig(cfg) {
  writeText('notif.json', JSON.stringify(cfg));
}

// 백업 파일: 임시 폴더에 쓰고 iOS 공유 시트로 내보낸다("파일에 저장"으로 아이폰·iCloud Drive에 둘 수 있다)
export async function saveFile(name, text, type) {
  const f = new File(Paths.cache, name);
  f.writeSync(text);
  await Sharing.shareAsync(f.uri, { mimeType: type, UTI: 'public.json', dialogTitle: name });
}
