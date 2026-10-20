// web/ 화면 파일을 아이폰 앱에 넣을 모듈(native/webBundle.js)로 묶는다. npm install(postinstall)과 npm start 때 자동으로 돈다.
// index.html이 읽는 스크립트·스타일을 그대로 담는다. 글꼴(PretendardVariable.woff2)은 앱이 시작할 때 이 파일들 옆에 복사한다.
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

  if (!/url\(PretendardVariable\.woff2\)/.test(files['styles.css'] || '')) throw new Error('styles.css에 Pretendard @font-face가 없어요');
  if (/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, ''))) throw new Error('index.html이 바깥 주소를 읽어요. 앱은 인터넷 없이 열려야 해요');
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
