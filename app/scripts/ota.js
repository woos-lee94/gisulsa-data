// 앱 안 업데이트 올리기(EAS Update, 3.2.0): 네이티브가 같은 App Store 빌드(app.config.js의 RUNTIME이 같은 빌드)에
// 화면·계산 코드(web 묶음 포함)만 바꿔 보낸다. 휴대폰은 앱을 켜거나 다시 볼 때 받아 두고 "최신 버전 받기"로 바로 바꾼다.
// 쓰는 법(PC, app 폴더): npm test → npm run ota
// 네이티브를 바꾼 버전(RUNTIME을 올린 버전)은 이것으로 보내지 않고 eas build로 App Store에 올린다.
const { spawnSync } = require('child_process');
const { build } = require('./build-web');
const app = require('../app.json').expo;
const { RUNTIME } = require('../app.config.js');

const pid = app.extra && app.extra.eas && app.extra.eas.projectId;
if (!pid) {
  console.error('app.json에 extra.eas.projectId가 없어요. 이 PC에서 eas build를 한 번 하거나 eas init을 먼저 하세요.');
  process.exit(1);
}
const r = build();
console.log(`web 묶음 ${r.hash} · 앱 ${app.version} · runtime ${RUNTIME} → production 채널`);
// --environment production: 빌드와 같은 EAS 환경 변수(Firebase 설정)를 코드에 넣는다
const args = ['update', '--channel', 'production', '--environment', 'production', '--platform', 'ios', '--message', `v${app.version}`];
const p = spawnSync('eas', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(p.status == null ? 1 : p.status);
