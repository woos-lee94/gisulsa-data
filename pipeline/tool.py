#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gisulsa-data 파이프라인 도구.

예약 작업(Claude)이 매일 세트와 주간 모의고사를 만들어 올릴 때 쓴다. 표준 라이브러리만 쓴다.

  python3 pipeline/tool.py today [--date YYYY-MM-DD]        오늘 세트 브리프
  python3 pipeline/tool.py check-set YYYY-MM-DD             세트 파일 검사
  python3 pipeline/tool.py publish-set YYYY-MM-DD           index·덱·백로그 갱신
  python3 pipeline/tool.py mock-brief [--date YYYY-MM-DD]   토요일 모의고사 브리프
  python3 pipeline/tool.py check-mock YYYY-MM-DD
  python3 pipeline/tool.py publish-mock YYYY-MM-DD
  python3 pipeline/tool.py add-round FILE.json              새 회차 기출 추가(제141회부터)
  python3 pipeline/tool.py link 기출id 카드id|목차id        기존 카드·목차를 새 기출에 연결
  python3 pipeline/tool.py status
  python3 pipeline/tool.py kds "KDS 11 80 05" [검색어 ...]       국가건설기준(KDS·KCS) 현행 원문
  python3 pipeline/tool.py law "건설기술 진흥법 시행령" [검색어 ...] 현행 법령 조문
  python3 pipeline/tool.py admrul "고시·훈령 이름" [검색어 ...]      현행 행정규칙(고시·훈령·지침)
"""
import datetime as dt
import html
import json
import os
import re
import signal
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = dt.timezone(dt.timedelta(hours=9))
DAYK = '월화수목금토일'
FULL = {'p1': 13, 'p2': 6, 'p3': 6, 'p4': 6}
KID_RE = re.compile(r'^\d{3}-[1-4]-\d{2}$')
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
# 사용자에게 보이는 글에 들어가면 안 되는 말(메타 문구)
META_ERR = [r'Claude', r'클로드', r'사용자님', r'(?:^|[\s("“])제가\s', r'(?:^|[\s("“])저는\s', r'ChatGPT', r'챗GPT']
META_WARN = ['이 카드는', '이 세트는', '확인 필요', '확인이 필요', '참고로', '도움이 되', '좋은 질문']
MD_ERR = ['**', '##', '```', '](']


def p(*a):
    return os.path.join(ROOT, *a)


def load(path, default=None):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        if default is not None:
            return default
        raise


def save(path, obj, compact=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')


def norm(t):
    """앱(app.js normTerm)과 같은 규칙으로 용어를 정규화한다."""
    t = re.sub(r'\([^)]*\)', '', str(t or ''))
    return re.sub(r"[\s·・,.\-–—_/()（）\[\]'\"“”‘’:;]", '', t).lower()


def pdate(s):
    if not DATE_RE.match(s or ''):
        sys.exit(f'날짜 형식이 아닙니다: {s} (YYYY-MM-DD)')
    return dt.date.fromisoformat(s)


def today():
    return dt.datetime.now(KST).date()


def arg_date():
    if '--date' in sys.argv:
        return pdate(sys.argv[sys.argv.index('--date') + 1])
    return today()


CUR = load(p('pipeline', 'curriculum.json'))
START = dt.date.fromisoformat(CUR['start'])
EXAM = dt.date.fromisoformat(CUR['exam'])
MOCK = dt.date.fromisoformat(CUR['mock'])
UNITS = {u['id']: u for u in CUR['units']}


def uname(u):
    return UNITS.get(int(u), {}).get('n', '기타')


def week_of(d):
    return (d - START).days // 7


def phase_of(w):
    if w <= 0:
        return 0
    if w <= 10:
        return 1
    if w <= 17:
        return 2
    if w <= 24:
        return 3
    if w <= 28:
        return 4
    return 5


def week_obj(w):
    for x in CUR['weeks']:
        if x['w'] == w:
            return x
    return None


def kichul():
    """파이프라인 마스터 기출 + data/kichul.json의 새 회차."""
    base = load(p('pipeline', 'kichul.json'))
    rounds = {r['r']: r for r in base['rounds']}
    extra = load(p('data', 'kichul.json'), {'rounds': []})
    for r in extra.get('rounds', []):
        rounds[r['r']] = r
    items = {}
    for r in rounds.values():
        for q in r['q']:
            items[q['id']] = dict(q, r=r['r'], d=r['d'])
    return items


def unit_order():
    cnt = {}
    for q in kichul().values():
        cnt[q['u']] = cnt.get(q['u'], 0) + 1
    return [u for u, _ in sorted(cnt.items(), key=lambda x: -x[1])]


def weekdays_between(a, b):
    n, d = 0, a
    while d < b:
        if d.weekday() < 5:
            n += 1
        d += dt.timedelta(days=1)
    return n


def units_for(d):
    w = week_of(d)
    wk = week_obj(w)
    if wk and wk.get('u'):
        return wk['u'], '이번 주 단원'
    if w >= 17:
        order = unit_order()
        n = weekdays_between(START + dt.timedelta(weeks=17), d)
        return [order[(2 * n) % len(order)], order[(2 * n + 1) % len(order)]], '전 범위 순환(하루 2단원, 기출 많은 단원부터)'
    return None, '전 범위(여러 번 출제된 용어 우선)'


def studied_units(w):
    if w <= 0 or w >= 11:
        return None
    us = set()
    for x in CUR['weeks']:
        if 1 <= x['w'] <= w:
            us.update(x.get('u', []))
    return sorted(us)


def rule(w):
    r = CUR['setrule'][str(phase_of(w))]
    return r['fresh'], r['total']


def deck():
    return load(p('pipeline', 'deck.json'))['cards']


def state():
    return load(p('pipeline', 'state.json'), {'featured': {}, 'mock_used': {}, 'log': []})


def index():
    return load(p('data', 'index.json'), {'v': 1, 'updated': '', 'sets': [], 'mocks': [], 'kichul': {'rev': 1}})


def scan_text(obj, where, errs, warns):
    if isinstance(obj, str):
        for m in META_ERR:
            hit = re.search(m, obj)
            if hit:
                errs.append(f'{where}: 사용자에게 보이는 글에 "{hit.group(0).strip()}" 같은 메타 문구가 있습니다')
        for m in MD_ERR:
            if m in obj:
                errs.append(f'{where}: 마크다운 기호 "{m}"는 앱에서 그대로 보입니다')
        for m in META_WARN:
            if m in obj:
                warns.append(f'{where}: "{m}" — 내용이 아니라 안내 문구라면 빼거나 check로 옮기세요')
    elif isinstance(obj, list):
        for i, x in enumerate(obj):
            scan_text(x, f'{where}[{i}]', errs, warns)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            scan_text(v, f'{where}.{k}', errs, warns)


def is_str(x, lo=1, hi=10 ** 6):
    return isinstance(x, str) and lo <= len(x.strip()) <= hi


# ───────────────────────── 세트 ─────────────────────────

def cmd_today():
    d = arg_date()
    force = '--force' in sys.argv
    if d > EXAM:
        print(f'SKIP: 제142회 시험({EXAM})이 끝났습니다. 예약 작업을 꺼도 된다고 보고하세요.')
        return 3
    if d.weekday() >= 5 and not force:
        print(f'SKIP: {d}는 주말입니다. 평일에만 세트를 만듭니다.')
        return 3
    path = p('data', 'sets', f'{d}.json')
    if os.path.exists(path) and not force:
        print(f'SKIP: {d} 세트가 이미 있습니다({path}). 다시 만들려면 --force.')
        return 3
    w = week_of(d)
    ph = phase_of(w)
    fresh, total = rule(w)
    units, why = units_for(d)
    wk = week_obj(w) or {}
    st = state()
    items = kichul()
    print(f'=== {d} ({DAYK[d.weekday()]}) 세트 브리프 ===')
    print(f'주차 {w} ({wk.get("title", "")}), 단계 {ph}')
    print(f'단원: {", ".join(f"{u} {uname(u)}" for u in units) if units else "전 단원"} — {why}')
    if wk.get('goals'):
        print('이번 주 목표: ' + ' / '.join(wk['goals'][:4]))
    print(f'규칙: 카드 {total}개 = 새 용어 {fresh}개 + 기존 카드 다시 짚기(ref) {total - fresh}개, 퀴즈 5문, 논술 1문제, 과제 3~4개')
    print(f'D-day: 제142회 {(EXAM - d).days}일, 제141회 {(MOCK - d).days}일')

    bl = load(p('pipeline', 'backlog.json'))
    inu = (lambda u: True) if not units else (lambda u: int(u) in units)
    c1 = sorted([x for x in bl['p1'] if inu(x['u'])], key=lambda x: -x['r'])
    print(f'\n[새 용어 후보] 아직 카드가 없는 1교시 기출 {len(c1)}개 (최근 회차 순)')
    for x in c1[:12]:
        print(f'  - {x["id"]} [{x["u"]} {uname(x["u"])}] {x["t"]}' + (f'  ※ {x["note"]}' if x.get('note') else ''))
    if len(c1) < fresh:
        print('  후보가 모자랍니다. 나머지는 아래 2~4교시 기출의 하위 개념, 최근 개정된 기준·법령, 출제기준의 빈 곳에서 고르세요.'
              ' 덱에 이미 있는 용어(정규화 후 같은 이름)는 쓰지 말고 ref로 넣습니다.')
        ess = sorted([q for q in items.values() if q['p'] != 1 and inu(q['u'])], key=lambda q: -q['r'])[:10]
        for q in ess:
            print(f'    · {q["id"]} {q["t"]}')

    dk = deck()
    def recent(cid):
        f = st['featured'].get(cid)
        return f and (d - dt.date.fromisoformat(f)).days < 21
    cr = [c for c in dk if inu(c['u']) and not recent(c['id'])]
    cr.sort(key=lambda c: (-len(c.get('x', [])), c['id']))
    print(f'\n[기존 카드 후보] ref로 넣을 카드 (최근 21일 안에 쓰지 않은 것, 기출 연결 많은 순) — 새 용어와 이어지는 것을 고르세요')
    for c in cr[:18]:
        print(f'  - {c["id"]} [{c["u"]}] {c["t"]} (기출 {len(c.get("x", []))}회)')

    ce = sorted([x for x in bl['essay'] if inu(x['u'])], key=lambda x: -x['r'])
    print(f'\n[논술 후보] 아직 모범 목차가 없는 2~4교시 기출 {len(ce)}개 (최근 회차 순)')
    for x in ce[:8]:
        print(f'  - {x["id"]} [{x["u"]} {uname(x["u"])}] {x["t"]}')

    idx = index()
    last = sorted(idx.get('sets', []), key=lambda s: s['d'])[-5:]
    if last:
        print('\n[최근 세트] 겹치지 않게: ' + ' / '.join(f'{s["d"]} {s.get("t", "")}' for s in last))
    print(f'\n파일: data/sets/{d}.json  (형식: pipeline/spec_set.md)')
    print(f'다음: python3 pipeline/tool.py check-set {d}')
    return 0


def check_set(ds):
    d = pdate(ds)
    errs, warns = [], []
    path = p('data', 'sets', f'{ds}.json')
    try:
        o = load(path)
    except FileNotFoundError:
        return [f'파일이 없습니다: {path}'], []
    except json.JSONDecodeError as e:
        return [f'JSON 문법 오류: {e}'], []
    w = week_of(d)
    fresh_n, total_n = rule(w)
    dk = [c for c in deck() if c.get('set') != ds]  # 같은 날 세트를 다시 올릴 때는 그 세트의 카드를 빼고 비교
    ids = {c['id'] for c in dk}
    norms = {norm(c['t']): c['id'] for c in dk}
    items = kichul()

    if o.get('date') != ds:
        errs.append(f'date가 {ds}가 아닙니다: {o.get("date")}')
    if not is_str(o.get('title'), 4, 40):
        errs.append('title: 4~40자 문자열이 필요합니다')
    if 'goal' in o and not is_str(o.get('goal'), 1, 120):
        errs.append('goal: 120자 이하 문자열')
    if o.get('week') != w:
        errs.append(f'week는 {w}여야 합니다(현재 {o.get("week")})')
    us = o.get('units')
    if not isinstance(us, list) or not us or not all(isinstance(u, int) and 1 <= u <= 16 for u in us):
        errs.append('units: 1~16 정수 목록이 필요합니다')

    cards = o.get('cards')
    if not isinstance(cards, list) or not 3 <= len(cards) <= 14:
        errs.append('cards: 3~14개 목록이 필요합니다')
        cards = []
    elif len(cards) != total_n:
        warns.append(f'cards가 {len(cards)}개입니다(규칙 {total_n}개)')
    seen = set()
    nf = 0
    for i, c in enumerate(cards):
        at = f'cards[{i}]'
        if not isinstance(c, dict):
            errs.append(f'{at}: 객체가 아닙니다')
            continue
        if 'ref' in c:
            if c['ref'] not in ids:
                errs.append(f'{at}: ref {c["ref"]}가 덱에 없습니다(pipeline/deck.json의 id만 가능)')
            if c['ref'] in seen:
                errs.append(f'{at}: 같은 카드를 두 번 넣었습니다({c["ref"]})')
            seen.add(c['ref'])
            if 't' in c or 'd' in c:
                warns.append(f'{at}: ref 카드에는 t·d를 쓰지 않습니다(덱 내용이 보입니다). 덧붙일 말은 plus에')
            for k in ('plus', 'field', 'basis'):
                if k in c and not is_str(c[k], 1, 220):
                    errs.append(f'{at}.{k}: 220자 이하 문자열')
            continue
        nf += 1
        t = c.get('t')
        if not is_str(t, 2, 60):
            errs.append(f'{at}.t: 2~60자 용어가 필요합니다')
            continue
        n = norm(t)
        if n in norms:
            errs.append(f'{at}: "{t}"는 덱에 이미 있습니다({norms[n]}). 새로 쓰지 말고 {{"ref":"{norms[n]}"}}로 넣으세요')
        else:
            near = [cid for nn, cid in norms.items() if len(n) >= 4 and len(nn) >= 4 and (n in nn or nn in n)]
            if near:
                warns.append(f'{at}: "{t}"와 비슷한 카드가 있습니다({", ".join(near[:3])}). 같은 개념이면 ref로')
        if n in seen:
            errs.append(f'{at}: 세트 안에 같은 용어가 두 번 있습니다')
        seen.add(n)
        dd = c.get('d')
        if not is_str(dd, 120, 700):
            errs.append(f'{at}.d: 정의는 120~700자(2~4문장)로 씁니다(현재 {len(dd or "")}자)')
        k = c.get('k')
        if not isinstance(k, list) or not 3 <= len(k) <= 8 or not all(is_str(x, 1, 30) for x in k):
            errs.append(f'{at}.k: 키워드 3~8개, 각 30자 이하')
        if not isinstance(c.get('u'), int) or not 1 <= c['u'] <= 16:
            errs.append(f'{at}.u: 단원 번호 1~16')
        x = c.get('x', [])
        if not isinstance(x, list):
            errs.append(f'{at}.x: 기출 id 목록')
        else:
            for kid in x:
                if kid not in items:
                    errs.append(f'{at}.x: 없는 기출 id {kid}')
                elif items[kid]['p'] != 1:
                    warns.append(f'{at}.x: {kid}는 {items[kid]["p"]}교시 문제입니다. 카드는 보통 1교시와 연결합니다')
        if 'f' in c and c['f'] not in (1, 2, 3):
            errs.append(f'{at}.f: 1~3')
        for kk in ('plus', 'field', 'basis'):
            if kk in c and not is_str(c[kk], 1, 220):
                errs.append(f'{at}.{kk}: 220자 이하 문자열')
        if not c.get('basis') and re.search(r'\d', dd or ''):
            warns.append(f'{at}: 정의에 수치가 있는데 basis(근거 기준·법령)가 없습니다')
    if cards and nf != fresh_n:
        (errs if nf > fresh_n + 2 else warns).append(f'새 용어가 {nf}개입니다(규칙 {fresh_n}개)')

    qz = o.get('quiz')
    if not isinstance(qz, list) or not 3 <= len(qz) <= 8:
        errs.append('quiz: 3~8문 목록이 필요합니다')
        qz = []
    elif len(qz) != 5:
        warns.append(f'quiz가 {len(qz)}문입니다(규칙 5문)')
    for i, q in enumerate(qz):
        at = f'quiz[{i}]'
        if not isinstance(q, dict) or not is_str(q.get('q'), 8, 300):
            errs.append(f'{at}.q: 8~300자 문제가 필요합니다')
            continue
        opts = q.get('o')
        if not isinstance(opts, list) or not 2 <= len(opts) <= 5 or not all(is_str(x, 1, 160) for x in opts):
            errs.append(f'{at}.o: 보기 2~5개(각 160자 이하)')
            continue
        if len(set(opts)) != len(opts):
            errs.append(f'{at}.o: 같은 보기가 있습니다')
        if len(opts) == 2 and opts != ['맞다', '틀리다']:
            warns.append(f'{at}.o: OX 문제는 ["맞다","틀리다"]로 씁니다')
        if not isinstance(q.get('a'), int) or not 0 <= q['a'] < len(opts):
            errs.append(f'{at}.a: 정답 보기의 0부터 시작하는 번호')
        if not is_str(q.get('ex'), 10, 300):
            errs.append(f'{at}.ex: 10~300자 해설')
        if 'u' in q and (not isinstance(q['u'], int) or not 1 <= q['u'] <= 16):
            errs.append(f'{at}.u: 1~16')
    if qz:
        ans = [q.get('a') for q in qz if isinstance(q, dict)]
        if len(ans) >= 4 and len(set(ans)) == 1:
            warns.append('quiz: 정답 번호가 모두 같습니다. 섞으세요')

    e = o.get('essay')
    if not isinstance(e, dict):
        errs.append('essay: 논술 1문제 객체가 필요합니다')
    else:
        if not is_str(e.get('t'), 10, 200):
            errs.append('essay.t: 10~200자 문제')
        ol = e.get('o')
        if not isinstance(ol, list) or not 4 <= len(ol) <= 8 or not all(is_str(x, 2, 160) for x in ol):
            errs.append('essay.o: 소제목 4~8개(각 160자 이하)')
        if not isinstance(e.get('u'), int) or not 1 <= e['u'] <= 16:
            errs.append('essay.u: 1~16')
        for kid in e.get('x', []) or []:
            if kid not in items:
                errs.append(f'essay.x: 없는 기출 id {kid}')
            elif items[kid]['p'] == 1:
                errs.append(f'essay.x: {kid}는 1교시 문제입니다. 논술은 2~4교시와 연결합니다')
        for kk in ('fig', 'p'):
            if kk in e and not is_str(e[kk], 1, 240):
                errs.append(f'essay.{kk}: 240자 이하 문자열')

    tk = o.get('tasks')
    if not isinstance(tk, list) or not 2 <= len(tk) <= 6 or not all(is_str(x, 4, 90) for x in tk):
        errs.append('tasks: 할 일 2~6개(각 90자 이하)')
    ck = o.get('check', [])
    if not isinstance(ck, list) or not all(is_str(x, 4, 240) for x in ck):
        errs.append('check: 확인이 필요한 내용 목록(없으면 [])')
    known = {'date', 'title', 'goal', 'week', 'units', 'cards', 'quiz', 'essay', 'tasks', 'check'}
    for kk in o:
        if kk not in known:
            warns.append(f'알 수 없는 키 {kk}(앱이 쓰지 않습니다)')
    scan_text({k: v for k, v in o.items() if k != 'check'}, 'set', errs, warns)
    size = os.path.getsize(path)
    if size > 60000:
        errs.append(f'파일이 너무 큽니다({size}바이트, 60KB 이하)')
    return errs, warns


def report(errs, warns):
    for x in errs:
        print('오류: ' + x)
    for x in warns:
        print('경고: ' + x)
    print(f'오류 {len(errs)}개, 경고 {len(warns)}개')


def cmd_check_set(ds):
    errs, warns = check_set(ds)
    report(errs, warns)
    return 1 if errs else 0


def now_iso():
    return dt.datetime.now(KST).replace(microsecond=0).isoformat()


def bump(lst, d, extra):
    for it in lst:
        if it['d'] == d:
            it['rev'] = int(it.get('rev', 1)) + 1
            it.update(extra)
            return it['rev']
    lst.append(dict({'d': d, 'rev': 1}, **extra))
    lst.sort(key=lambda x: x['d'])
    return 1


def cmd_publish_set(ds):
    errs, warns = check_set(ds)
    if errs:
        report(errs, warns)
        print('오류를 고친 뒤 다시 실행하세요.')
        return 1
    o = load(p('data', 'sets', f'{ds}.json'))
    idx = index()
    rev = bump(idx['sets'], ds, {'t': o['title'], 'u': o['units']})
    idx['updated'] = now_iso()
    save(p('data', 'index.json'), idx)

    dkf = load(p('pipeline', 'deck.json'))
    dkf['cards'] = [c for c in dkf['cards'] if c.get('set') != ds]
    st = state()
    ymd = ds.replace('-', '')
    added, covered = [], set()
    for i, c in enumerate(o['cards']):
        if 'ref' in c:
            st['featured'][c['ref']] = ds
            continue
        cid = f'D{ymd}-{i + 1}'  # 앱(buildDeck)이 세트 카드에 붙이는 id와 같다
        st['featured'][cid] = ds
        covered.update(c.get('x', []) or [])
        dkf['cards'].append({'id': cid, 'u': c['u'], 't': c['t'], 'k': c.get('k', []), 'x': c.get('x', []) or [], 'set': ds})
        added.append(cid)
    save(p('pipeline', 'deck.json'), dkf)
    ecov = set(o['essay'].get('x', []) or [])
    if ecov:
        ef = load(p('pipeline', 'essays.json'))
        eid = f'SE{ymd}'
        ef['essays'] = [x for x in ef['essays'] if x['id'] != eid] + [{'id': eid, 'u': o['essay']['u'], 't': o['essay']['t'], 'x': sorted(ecov)}]
        save(p('pipeline', 'essays.json'), ef)
    bl = load(p('pipeline', 'backlog.json'))
    b1, be = len(bl['p1']), len(bl['essay'])
    bl['p1'] = [x for x in bl['p1'] if x['id'] not in covered]
    bl['essay'] = [x for x in bl['essay'] if x['id'] not in ecov]
    save(p('pipeline', 'backlog.json'), bl)
    st['log'] = (st.get('log', []) + [{'d': ds, 'kind': 'set', 'rev': rev, 't': o['title'],
                                       'new': len([c for c in o['cards'] if 'ref' not in c]), 'x': sorted(covered | ecov)}])[-400:]
    save(p('pipeline', 'state.json'), st)
    for x in warns:
        print('경고: ' + x)
    print(f'올릴 준비 완료: {ds} rev {rev} "{o["title"]}" — 새 카드 {len(added)}장, 백로그 1교시 {b1}→{len(bl["p1"])}, 논술 {be}→{len(bl["essay"])}')
    print(f'다음: git add -A && git commit -m "세트 {ds}: {o["title"]}" && git push')
    return 0


# ───────────────────────── 모의고사 ─────────────────────────

def mock_format(d):
    if d == MOCK:
        return {}, '제141회 실제 시험일입니다. 모의 대신 실전 응시'
    if d == EXAM:
        return {}, '제142회 시험일입니다'
    w = week_of(d)
    if w <= 0:
        return {'p1': 13}, '진단 모의: 1교시 단답 13문 중 10문, 100분'
    if w <= 10:
        return {'p1': 13, 'p2': 2}, '1교시 13문 + 논술 2문(문제당 25분)'
    if w in (11, 12, 16, 25):
        return {'p2': 6}, '논술 한 교시: 6문 중 4문, 100분'
    if w in (13, 15, 17, 26):
        return {'p1': 13, 'p2': 6}, '반쪽 모의: 1·2교시'
    if w == 14:
        return dict(FULL), '전교시 리허설: 실제 시간표 400분'
    if 18 <= w <= 24 or w == 27:
        return dict(FULL), '전교시 모의: 토요일 1·2교시, 일요일 3·4교시'
    if w == 28:
        return {'p1': 13}, '마무리 주: 1교시 기출 재출제형만(새 내용 없음)'
    return {}, '시험 주: 모의 없음'


def cmd_mock_brief():
    d = arg_date()
    force = '--force' in sys.argv
    if d > EXAM:
        print(f'SKIP: 제142회 시험({EXAM})이 끝났습니다. 예약 작업을 꺼도 된다고 보고하세요.')
        return 3
    if d.weekday() != 5 and not force:
        print(f'SKIP: {d}는 토요일이 아닙니다.')
        return 3
    if os.path.exists(p('data', 'mocks', f'{d}.json')) and not force:
        print(f'SKIP: {d} 모의고사가 이미 있습니다. 다시 만들려면 --force.')
        return 3
    w = week_of(d)
    fmt, desc = mock_format(d)
    st = state()
    items = kichul()
    su = studied_units(w)
    inu = (lambda u: True) if su is None else (lambda u: int(u) in su)
    print(f'=== {d} (토) 주간 모의고사 브리프 ===')
    print(f'주차 {w}, 단계 {phase_of(w)} — {desc}')
    print('형식: ' + (', '.join(f'{k} {v}문' for k, v in fmt.items()) if fmt else '문제 없음(notice만)'))
    print(f'범위: {"전 단원" if su is None else ", ".join(f"{u} {uname(u)}" for u in su)} (지금까지 공부한 단원)')
    print(f'D-day: 제142회 {(EXAM - d).days}일, 제141회 {(MOCK - d).days}일')

    def used_recent(kid, weeks=10):
        f = st.get('mock_used', {}).get(kid)
        return f and (d - dt.date.fromisoformat(f)).days < weeks * 7

    if 'p1' in fmt:
        c1 = [q for q in items.values() if q['p'] == 1 and inu(q['u']) and not used_recent(q['id'])]
        c1.sort(key=lambda q: (-q['r'], q['n']))
        print(f'\n[1교시 후보] 기출 재출제형 {len(c1)}개 중 최근 회차 30개 — 9~10문은 여기서, 3~4문은 같은 단원의 새 예상 용어로')
        for q in c1[:30]:
            print(f'  - {q["id"]} [{q["u"]}] {q["t"]}')
    if any(k in fmt for k in ('p2', 'p3', 'p4')):
        bl = load(p('pipeline', 'backlog.json'))
        ce = [x for x in bl['essay'] if inu(x['u']) and not used_recent(x['id'])]
        ce.sort(key=lambda x: -x['r'])
        n = sum(v for k, v in fmt.items() if k != 'p1')
        print(f'\n[논술 후보] 아직 모범 목차가 없는 2~4교시 기출 {len(ce)}개 (최근 회차 순) — 필요 {n}문, 교시마다 단원을 섞을 것')
        for x in ce[:max(24, n * 2)]:
            print(f'  - {x["id"]} [{x["u"]} {uname(x["u"])}] {x["t"]}')
    print(f'\n파일: data/mocks/{d}.json  (형식: pipeline/spec_mock.md)')
    print(f'다음: python3 pipeline/tool.py check-mock {d}')
    return 0


def check_mock(ds):
    d = pdate(ds)
    errs, warns = [], []
    path = p('data', 'mocks', f'{ds}.json')
    try:
        o = load(path)
    except FileNotFoundError:
        return [f'파일이 없습니다: {path}'], []
    except json.JSONDecodeError as e:
        return [f'JSON 문법 오류: {e}'], []
    fmt, _ = mock_format(d)
    items = kichul()
    if o.get('date') != ds:
        errs.append(f'date가 {ds}가 아닙니다')
    if not is_str(o.get('title'), 4, 50):
        errs.append('title: 4~50자')
    g = o.get('guide', [])
    if not isinstance(g, list) or not all(is_str(x, 4, 160) for x in g):
        errs.append('guide: 안내 문장 목록(각 160자 이하)')
    if not fmt and not is_str(o.get('notice'), 4, 300):
        errs.append('notice: 문제가 없는 날은 안내문이 필요합니다')
    for k in ('p1', 'p2', 'p3', 'p4'):
        need = fmt.get(k, 0)
        arr = o.get(k, [])
        if not isinstance(arr, list):
            errs.append(f'{k}: 목록이어야 합니다')
            continue
        if len(arr) != need:
            errs.append(f'{k}: {need}문이어야 합니다(현재 {len(arr)}문)')
        for i, q in enumerate(arr):
            at = f'{k}[{i}]'
            if not isinstance(q, dict) or not is_str(q.get('t'), 2, 200):
                errs.append(f'{at}.t: 문제 문자열이 필요합니다')
                continue
            for kid in q.get('x', []) or []:
                if kid not in items:
                    errs.append(f'{at}.x: 없는 기출 id {kid}')
                elif (items[kid]['p'] == 1) != (k == 'p1'):
                    errs.append(f'{at}.x: {kid}는 {items[kid]["p"]}교시 문제라 {k}에 맞지 않습니다')
            if k == 'p1':
                kw = q.get('k')
                if not isinstance(kw, list) or not 2 <= len(kw) <= 6 or not all(is_str(x, 1, 30) for x in kw):
                    errs.append(f'{at}.k: 채점용 핵심 키워드 2~6개')
            else:
                ol = q.get('o')
                if not isinstance(ol, list) or not 4 <= len(ol) <= 8 or not all(is_str(x, 2, 160) for x in ol):
                    errs.append(f'{at}.o: 모범 목차 소제목 4~8개')
                if not isinstance(q.get('u'), int) or not 1 <= q['u'] <= 16:
                    errs.append(f'{at}.u: 1~16')
                if 'fig' in q and not is_str(q['fig'], 1, 240):
                    errs.append(f'{at}.fig: 240자 이하')
    ts = [q.get('t') for k in ('p1', 'p2', 'p3', 'p4') for q in o.get(k, []) if isinstance(q, dict)]
    if len(ts) != len(set(ts)):
        errs.append('같은 문제가 두 번 나옵니다')
    scan_text(o, 'mock', errs, warns)
    return errs, warns


def cmd_check_mock(ds):
    errs, warns = check_mock(ds)
    report(errs, warns)
    return 1 if errs else 0


def cmd_publish_mock(ds):
    errs, warns = check_mock(ds)
    if errs:
        report(errs, warns)
        print('오류를 고친 뒤 다시 실행하세요.')
        return 1
    o = load(p('data', 'mocks', f'{ds}.json'))
    idx = index()
    rev = bump(idx['mocks'], ds, {'t': o['title']})
    idx['updated'] = now_iso()
    save(p('data', 'index.json'), idx)
    st = state()
    used, ecov = set(), set()
    for k in ('p1', 'p2', 'p3', 'p4'):
        for q in o.get(k, []):
            for kid in q.get('x', []) or []:
                used.add(kid)
                if k != 'p1':
                    ecov.add(kid)
    for kid in used:
        st.setdefault('mock_used', {})[kid] = ds
    bl = load(p('pipeline', 'backlog.json'))
    be = len(bl['essay'])
    bl['essay'] = [x for x in bl['essay'] if x['id'] not in ecov]
    save(p('pipeline', 'backlog.json'), bl)
    st['log'] = (st.get('log', []) + [{'d': ds, 'kind': 'mock', 'rev': rev, 't': o['title'], 'x': sorted(used)}])[-400:]
    save(p('pipeline', 'state.json'), st)
    for x in warns:
        print('경고: ' + x)
    print(f'올릴 준비 완료: 모의 {ds} rev {rev} "{o["title"]}" — 논술 백로그 {be}→{len(bl["essay"])}')
    print(f'다음: git add -A && git commit -m "모의 {ds}: {o["title"]}" && git push')
    return 0


# ───────────────────────── 새 회차·연결 ─────────────────────────

def cmd_add_round(fp):
    r = load(fp)
    rn, rd, qs = r.get('r'), r.get('d'), r.get('q')
    if not isinstance(rn, int) or not DATE_RE.match(rd or '') or not isinstance(qs, list):
        sys.exit('형식: {"r":141,"d":"2027-02-06","q":[{"p":1,"n":1,"t":"문제 요지","u":14}, ...]}')
    need = {1: 13, 2: 6, 3: 6, 4: 6}
    for pp, n in need.items():
        got = sorted(q['n'] for q in qs if q.get('p') == pp)
        if got != list(range(1, n + 1)):
            sys.exit(f'{pp}교시 문제 번호가 1~{n}이 아닙니다: {got}')
    out = []
    for q in qs:
        if not is_str(q.get('t'), 2, 200) or not isinstance(q.get('u'), int) or not 1 <= q['u'] <= 16:
            sys.exit(f'문제 요지(t)나 단원(u)이 잘못됐습니다: {q}')
        out.append({'id': f'{rn}-{q["p"]}-{q["n"]:02d}', 'p': q['p'], 'n': q['n'], 't': q['t'].strip(), 'u': q['u']})
    out.sort(key=lambda q: (q['p'], q['n']))
    kj = load(p('data', 'kichul.json'), {'rev': 1, 'rounds': []})
    kj['rounds'] = [x for x in kj.get('rounds', []) if x['r'] != rn] + [{'r': rn, 'd': rd, 'q': out}]
    kj['rounds'].sort(key=lambda x: -x['r'])
    kj['rev'] = int(kj.get('rev', 1)) + 1
    save(p('data', 'kichul.json'), kj, compact=True)
    idx = index()
    idx['kichul'] = {'rev': kj['rev']}
    idx['updated'] = now_iso()
    save(p('data', 'index.json'), idx)
    bl = load(p('pipeline', 'backlog.json'))
    have = {x['id'] for x in bl['p1']} | {x['id'] for x in bl['essay']}
    for q in out:
        if q['id'] in have:
            continue
        ent = {'id': q['id'], 'r': rn, 'u': q['u'], 't': q['t']}
        if q['p'] == 1:
            ent['note'] = ''
            bl['p1'].append(ent)
        else:
            bl['essay'].append(ent)
    save(p('pipeline', 'backlog.json'), bl)
    dk = deck()
    norms = {norm(c['t']): c['id'] for c in dk}
    print(f'제{rn}회 {len(out)}문항 추가, 기출 rev {kj["rev"]}.')
    for q in out:
        if q['p'] == 1:
            n = norm(q['t'])
            hits = [cid for nn, cid in norms.items() if len(nn) >= 3 and (nn in n or n in nn)]
            if hits:
                print(f'  {q["id"]} {q["t"]} → 비슷한 카드 {", ".join(hits[:3])} (같은 개념이면: python3 pipeline/tool.py link {q["id"]} {hits[0]})')
    return 0


def cmd_link(kid, target):
    items = kichul()
    if kid not in items:
        sys.exit(f'없는 기출 id: {kid}')
    q = items[kid]
    kj = load(p('data', 'kichul.json'), {'rev': 1, 'rounds': []})
    if q['p'] == 1:
        if target not in {c['id'] for c in deck()}:
            sys.exit(f'덱에 없는 카드: {target}')
        m = kj.setdefault('kx', {})
    else:
        ef = load(p('pipeline', 'essays.json'))
        if target not in {e['id'] for e in ef['essays']}:
            sys.exit(f'목차 목록에 없는 id: {target}')
        m = kj.setdefault('ex', {})
    lst = m.setdefault(target, [])
    if kid not in lst:
        lst.append(kid)
    kj['rev'] = int(kj.get('rev', 1)) + 1
    save(p('data', 'kichul.json'), kj, compact=True)
    idx = index()
    idx['kichul'] = {'rev': kj['rev']}
    idx['updated'] = now_iso()
    save(p('data', 'index.json'), idx)
    bl = load(p('pipeline', 'backlog.json'))
    bl['p1'] = [x for x in bl['p1'] if x['id'] != kid]
    bl['essay'] = [x for x in bl['essay'] if x['id'] != kid]
    save(p('pipeline', 'backlog.json'), bl)
    print(f'{kid} → {target} 연결, 기출 rev {kj["rev"]}')
    return 0


def cmd_status():
    idx = index()
    bl = load(p('pipeline', 'backlog.json'))
    dk = deck()
    d = today()
    print(f'오늘 {d} ({DAYK[d.weekday()]}), 주차 {week_of(d)}, 단계 {phase_of(week_of(d))}')
    print(f'세트 {len(idx["sets"])}개(마지막 {idx["sets"][-1]["d"] if idx["sets"] else "-"}), 모의 {len(idx["mocks"])}개, 기출 rev {idx.get("kichul", {}).get("rev")}')
    print(f'덱 {len(dk)}장, 백로그 1교시 {len(bl["p1"])}개, 논술 {len(bl["essay"])}개')
    return 0


# ───────────────────────── 1차 출처 열기 ─────────────────────────

def http_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (gisulsa-data)'})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode('utf-8'))


def plain(s):
    s = re.sub(r'<br\s*/?>|</p>|</tr>', '\n', str(s or ''))
    s = re.sub(r'</t[dh]>', ' | ', s)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'[ \t]+', ' ', s).strip()


def show_hits(blocks, terms, limit=40):
    """blocks: [(제목, 본문)]. 검색어가 하나라도 들어 있는 블록만 보여 준다."""
    if not terms:
        for t, _ in blocks:
            print('  ' + t)
        print('\n검색어를 덧붙이면 그 낱말이 든 조항만 보여 줍니다.')
        return
    n = 0
    for t, body in blocks:
        if any(w in body or w in t for w in terms):
            print(f'\n[{t}]\n{body[:1500]}')
            n += 1
            if n >= limit:
                print('\n… 결과가 많아 줄였습니다. 검색어를 좁히세요.')
                break
    if not n:
        print('검색어가 든 조항이 없습니다. 다른 낱말로 찾아보세요.')


def cmd_kds(code, terms):
    """국가건설기준센터(KCSC) 공개 API로 KDS·KCS 최신판 본문을 연다."""
    base = 'https://kcsc.re.kr/api/api/v1/'
    try:
        docs = http_json(base + 'tn_document_infos/by-kcsc_cd?kcsc_cd=' + urllib.parse.quote(code)).get('result') or []
    except Exception as e:
        print(f'열지 못했습니다: {e}')
        return 1
    if not docs:
        print(f'{code}를 찾지 못했습니다. 코드 띄어쓰기를 "KDS 11 80 05"처럼 맞추세요.')
        return 1
    cur = [d for d in docs if d.get('last_yn') == 'Y'] or sorted(docs, key=lambda d: d.get('aplcn_bgng_ymd') or '')[-1:]
    d = cur[0]
    print(f"{d['kcsc_cd']} {d['doc_nm']} ({d['doc_yr']}판, 적용 {d.get('aplcn_bgng_ymd')}) — 국가건설기준센터 kcsc.re.kr")
    if re.match(r'K[DC]S (57|61)', code) and str(d.get('doc_yr', '')) < '2023':
        print('※ 상수도(57)·하수도(61) 기준은 국가건설기준센터에 옛 판만 있을 수 있습니다. admrul 명령으로 환경부 고시 개정전문을 확인하세요.')
    rows = http_json(base + 'tn-document-contents?doc_info_seq=%d' % d['doc_info_seq']).get('result') or []
    blocks = []
    for c in sorted(rows, key=lambda c: c.get('cont_order', 0)):
        body = plain(c.get('full_content') or c.get('table_content'))
        if body:
            blocks.append((f"{c.get('group_title') or ''} {c.get('cont_label') or ''}".strip(), body))
    if not terms:
        blocks = [(t, b) for t, b in blocks if re.match(r'^\d+(\.\d+)?\s', b)]
    show_hits(blocks, terms)
    return 0


def _as_list(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


def cmd_law(name, terms, target='law'):
    """국가법령정보센터 Open API로 현행 법령(law)이나 행정규칙(admrul)을 연다."""
    api = 'https://www.law.go.kr/DRF/'
    try:
        res = http_json(api + f'lawSearch.do?OC=test&target={target}&type=JSON&display=50&query=' + urllib.parse.quote(name))
    except Exception as e:
        print(f'열지 못했습니다: {e}')
        return 1
    if target == 'law':
        items = _as_list((res.get('LawSearch') or {}).get('law'))
        key_name, key_id = '법령명한글', '법령일련번호'
    else:
        items = _as_list((res.get('AdmRulSearch') or {}).get('admrul'))
        key_name, key_id = '행정규칙명', '행정규칙일련번호'
    items = [i for i in items if i.get('현행연혁코드', i.get('현행연혁구분', '현행')) == '현행'] or items
    exact = [i for i in items if i.get(key_name, '').replace(' ', '') == name.replace(' ', '')]
    pick = (exact or items)[:1]
    if not pick:
        print(f'"{name}"을(를) 찾지 못했습니다. 정확한 이름으로 다시 찾아보세요.')
        return 1
    it = pick[0]
    if not exact:
        print('정확히 같은 이름이 없어 가장 가까운 결과를 엽니다. 후보: ' + ', '.join(i.get(key_name, '') for i in items[:6]))
    if target == 'law':
        body = http_json(api + f"lawService.do?OC=test&target=law&MST={it[key_id]}&type=JSON").get('법령') or {}
        info = body.get('기본정보') or {}
        print(f"{info.get('법령명_한글', it.get(key_name))} (시행 {info.get('시행일자', it.get('시행일자', ''))}) — https://www.law.go.kr/법령/" + it.get(key_name, '').replace(' ', ''))
        blocks = []
        for u in _as_list((body.get('조문') or {}).get('조문단위')):
            if u.get('조문여부') == '전문':
                continue
            parts = [u.get('조문내용', '')]
            for h in _as_list(u.get('항')):
                parts.append(h.get('항내용', ''))
                for ho in _as_list(h.get('호')):
                    parts.append(ho.get('호내용', ''))
                    for mo in _as_list(ho.get('목')):
                        parts.append(mo.get('목내용', ''))
            text = plain('\n'.join(p for p in parts if isinstance(p, str)))
            title = (u.get('조문내용', '') or '').split(')')[0] + ')' if '(' in (u.get('조문내용', '') or '') else f"제{u.get('조문번호')}조"
            blocks.append((title.strip(), text))
    else:
        body = http_json(api + f"lawService.do?OC=test&target=admrul&ID={it[key_id]}&type=JSON").get('AdmRulService') or {}
        info = body.get('행정규칙기본정보') or {}
        print(f"{info.get('행정규칙명', it.get(key_name))} ({info.get('행정규칙종류', '')} {info.get('발령번호', it.get('발령번호', ''))}, 시행 {info.get('시행일자', it.get('시행일자', ''))}) — https://www.law.go.kr/행정규칙/" + it.get(key_name, '').replace(' ', ''))
        blocks = []
        for t in _as_list(body.get('조문내용')):
            t = plain(t)
            if t:
                blocks.append((t.split(')')[0] + ')' if t.startswith('제') and ')' in t[:40] else t[:30], t))
        att = body.get('첨부파일') or {}
        names, links = _as_list(att.get('첨부파일명')), _as_list(att.get('첨부파일링크'))
        if names:
            print('첨부(별표·개정전문): ' + ' / '.join(f'{n} {l}' for n, l in zip(names, links)))
    show_hits(blocks, terms)
    return 0


def main():
    if hasattr(signal, 'SIGPIPE'):
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)  # | head 로 잘라 봐도 오류를 내지 않게
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        return 0
    c = a[0]
    if c == 'today':
        return cmd_today()
    if c == 'check-set' and len(a) > 1:
        return cmd_check_set(a[1])
    if c == 'publish-set' and len(a) > 1:
        return cmd_publish_set(a[1])
    if c == 'mock-brief':
        return cmd_mock_brief()
    if c == 'check-mock' and len(a) > 1:
        return cmd_check_mock(a[1])
    if c == 'publish-mock' and len(a) > 1:
        return cmd_publish_mock(a[1])
    if c == 'add-round' and len(a) > 1:
        return cmd_add_round(a[1])
    if c == 'link' and len(a) > 2:
        return cmd_link(a[1], a[2])
    if c == 'status':
        return cmd_status()
    if c == 'kds' and len(a) > 1:
        return cmd_kds(a[1], a[2:])
    if c == 'law' and len(a) > 1:
        return cmd_law(a[1], a[2:], 'law')
    if c == 'admrul' and len(a) > 1:
        return cmd_law(a[1], a[2:], 'admrul')
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main())
