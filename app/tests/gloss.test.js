// 매일 용어 사전 검사: scripts/gloss-daily.js(후보 뽑기 → 풀이 더하기)를 가짜 자료(tests/fake/data)로 돌린다.
// 실행: node tests/gloss.test.js
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const APP = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gloss-'));
const env = Object.assign({}, process.env, { GLOSS_DATA: path.join(__dirname, 'fake', 'data'), GLOSS_FILE: path.join(tmp, 'daily.json') });
const run = (...a) => execFileSync('node', [path.join(APP, 'scripts', 'gloss-daily.js'), ...a], { env, encoding: 'utf8' });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok:', m); };

const out1 = run('candidates', path.join(tmp, 'c.json'));
const C = JSON.parse(fs.readFileSync(path.join(tmp, 'c.json'), 'utf8'));
ok(/후보/.test(out1) && C.dates.join() === '2026-10-19,2026-10-24' && C.cands.length > 20, `처리 안 한 세트·모의고사에서 후보 ${C.cands.length}개`);
ok(C.cands.every(c => c.forms.includes(c.key) && c.ex && c.n >= 1), '후보마다 낱말 꼴·예문·횟수');
const hg = C.cands.filter(c => /^[가-힣]{3,}$/.test(c.key));
const [a, b, c3, d4] = hg;
fs.writeFileSync(path.join(tmp, 'new.json'), JSON.stringify([
  { w: a.key, d: '검사용 풀이 문장이다. 형식이 맞으면 매일 사전에 들어간다.' },
  { w: '후보에없는낱말', d: '후보 목록에 없는 낱말은 넣지 않는다는 것을 보는 풀이다.' },
  { w: '숏크리트', d: '카드가 있는 낱말은 넣지 않는다는 것을 보는 검사용 풀이다.' },
  { w: b.key, d: '짧음' },
  { w: c3.key, d: c3.key + '는 표제어로 시작하는 풀이라서 빠진다.' },
  { w: d4.key, d: '<b>꺾쇠</b>가 들어간 풀이는 빠지는지 보는 검사용 문장이다.' },
]));
const outC = run('check', path.join(tmp, 'new.json'));
ok(/검사만: 더할 수 있음 1개, 뺌 5개/.test(outC) && !fs.existsSync(path.join(tmp, 'daily.json')), 'check는 검사만 하고 파일은 그대로');
const out2 = run('add', path.join(tmp, 'new.json'));
const G = JSON.parse(fs.readFileSync(path.join(tmp, 'daily.json'), 'utf8'));
ok(Object.keys(G.w).join() === a.key && /더함 1개, 뺌 5개/.test(out2), '형식·후보·카드·표제어 검사를 통과한 것만 더함: ' + a.key);
ok(/후보 낱말 꼴이 아님\): 후보에없는낱말, 숏크리트/.test(out2) && /풀이 길이·형식/.test(out2) && /표제어로 시작/.test(out2), '뺀 이유를 알려 줌');
ok(G.done.join() === '2026-10-19,2026-10-24' && G.updated, '처리한 날짜를 적음');
ok(/^SKIP/.test(run('candidates', path.join(tmp, 'c2.json'))), '다 처리했으면 SKIP(커밋 없음)');
ok(/더함 0개/.test(run('add', path.join(tmp, 'new.json'))) && Object.keys(JSON.parse(fs.readFileSync(path.join(tmp, 'daily.json'), 'utf8')).w).length === 1, '같은 풀이를 다시 넣어도 그대로');
const real = JSON.parse(fs.readFileSync(path.join(APP, 'gloss', 'daily.json'), 'utf8'));
ok(real.v === 1 && Array.isArray(real.done) && real.w && Object.values(real.w).every(v => typeof v === 'string' && v.length >= 10 && v.length <= 140), '저장소의 app/gloss/daily.json 형식');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails}개 실패` : '\n모두 통과');
process.exit(fails ? 1 : 0);
