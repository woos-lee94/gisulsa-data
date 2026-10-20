// web/ 웹앱을 아이폰 앱에 넣을 모듈(native/webBundle.js)로 묶는다. npm install(postinstall)과 npm start 때 자동으로 돈다.
// index.html이 읽는 스크립트·스타일을 그대로 담고, 앱 안에서는 Pretendard 웹폰트를 CDN 대신 앱에 넣은 파일로 읽게 바꾼다.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const FONT = path.join(ROOT, 'assets', 'fonts', 'PretendardVariable.woff2');
const OUT = path.join(ROOT, 'native', 'webBundle.js');

function build() {
  let html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
  const files = {};
  // index.html이 읽는 로컬 스크립트·스타일(?v=N은 파일 주소에서 뗀다)
  html = html.replace(/(<script src="|<link rel="stylesheet" href=")([^":?]+)\?v=\d+"/g, (m, head, name) => {
    files[name] = fs.readFileSync(path.join(WEB, name), 'utf8');
    return `${head}${name}"`;
  });
  if (!files['app.js'] || !files['bridge.js']) throw new Error('index.html에서 app.js·bridge.js를 찾지 못했어요');

  // 웹폰트: CDN → 앱에 넣은 PretendardVariable.woff2(앱이 시작할 때 이 파일들 옆에 복사한다)
  const cdn = /<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard[^"]*">/;
  if (!cdn.test(html)) throw new Error('index.html에서 Pretendard CDN 링크를 찾지 못했어요');
  html = html.replace(cdn, '<style>@font-face{font-family:"Pretendard Variable";font-weight:45 920;font-style:normal;font-display:swap;src:url(PretendardVariable.woff2) format("woff2-variations"),url(PretendardVariable.woff2) format("woff2")}</style>');
  // 앱 안에서 쓰지 않는 것: CDN 미리 연결, PWA 설치용 매니페스트·아이콘
  html = html
    .replace(/<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"[^>]*>\n?/, '')
    .replace(/<link rel="(manifest|apple-touch-icon|icon)" [^>]*>\n?/g, '');
  files['index.html'] = html;

  const h = crypto.createHash('sha256');
  for (const k of Object.keys(files).sort()) h.update(k).update('\0').update(files[k]).update('\0');
  h.update(fs.readFileSync(FONT));
  const hash = h.digest('hex').slice(0, 12);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, '// 자동 생성(scripts/build-web.js). 고치지 말고 web/을 고친 뒤 npm run build:web\n'
    + `module.exports = ${JSON.stringify({ hash, files })};\n`);
  return { hash, files: Object.keys(files) };
}

if (require.main === module) {
  const r = build();
  console.log(`web 묶음 ${r.hash}: ${r.files.join(', ')}`);
}
module.exports = { build };
