# 최종 구현 명세: "오늘 몫 · 이번 주" (v3.0.0)

- Basis: Sat 2026-10-31, plan week 1 (10/26 Mon – 11/1 Sun), "1단계 기본·단답", D-196 to 제142회 (2027-05-15, est.). Code `app/web` v2.3.2 at **HEAD 51855c1** ("용어 퀴즈: 회차별·용어별·무작위로 골라 풀기"). Line numbers are `app/web/app.js` at 51855c1 unless another file is named (rechecked with `grep -n`); test lines are `app/tests/app.test.js` at 51855c1. Baseline: `node tests/app.test.js` = 325 `ok`, "모두 통과" (`scratchpad/judge/base.txt`).
- Inputs: `ux/brief.md` (binding), `ux/design-A.md`, `ux/design-B.md`, `ux/design-C.md`, the three judge reports, `ux/tasks.md`, `ux/flows.md`, `ux/screens.md`, `ux/week.md`, `ux/shots/`.
- **Base = design C** (highest weighted judge score: C 7.2, A 6.4, B 5.7 with candidate and model lenses weighted 1.2 and engineering 1.0). C supplies the skeleton that engineering judged safe: hash routes, intent-flagged history mirror, tab unwind with fallback, `sp()`-level D2 fix, day freeze with a fixed level, planner purity test, whole-set quotas, per-set late rows. Grafted onto it: A's task catalog breadth, end-screen chain, guided paper work and mock stepper, MOCK_GRADE_SINCE, stable-id manual rows; B's per-row consequence text, per-day time control, no-guilt colour and copy, handwriting floor, Saturday half-quota rule, timer-end sheet, write-through for the duplicate drawing task. Every `must_fix_in_final` item of the three judges is resolved; §0.2 lists the conflicts between judges and how each was decided.
- **The worked examples in §3.11–3.13 are computed, not hand-made.** A scratch prototype of the planner in this spec runs the real app code in jsdom with the real `data/` and the survey states (nothing in the repo was touched):
  - `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/engine.js` (candidates, `dayPlan`, `weekBoard`, score)
  - `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/calc.js` → `calc_out.txt` (Thu, Wed 21:30 with three time choices, Sat, Sat with "오늘 시간 1시간", Sun after Sat, Sun with Sat skipped, Mon, empty week followed day by day). Revision 2 re-ran it with the clock-independent level capacity of §3.8 (`engine.js` `weekBoard`); only the Wed 21:30 C values changed (1020/960/930 → 1080), every level, plan and score is unchanged. The first run is kept as `calc_out.v1.txt` / `engine.v1.js`.
  - `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/hist_depth.js` (jsdom probe of the depth counter) and `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/route_probe.js` (the router of §7.3 as written: popstate-driven `route()`, `hop()`, tab hashes through `goTab`, guard, end-screen rule, lock, fallback token; 21 checks, prints "모두 통과")
  - The prototype does selection, minutes, levels, the contract and the score. Row grouping (§3.7 step 8), the freeze (§3.7 step 9) and block merging (§4.1) are display rules on top; they do not change the numbers.
- Target release: **v3.0.0** (`APP_VER` 17, `app.json` `expo.version`, `package.json` `version` together; script and style markers `?v=7`).
- Prose is English; every quoted Korean string is exact UI text.

---

## 0. Decisions log

### 0.1 Open questions of brief §6

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Tabs | **5 tabs: 오늘 · 이번 주 · 복습 · 연습 · 더보기** (`#today` `#week` `#review` `#practice` `#more`). 암기 + 테스트 merge into 연습; old `#study`/`#test` resolve to 연습 inside `parseHash` (no redirect). | Deviates from the default (4) on purpose: "이번 주" gets a tab (the user's own question), and the user's earlier wording "memorization tools reachable from the review tab" stays literally true. `#review` keeps its meaning, so the Sunday notification (`native/host.js` 37) and `native.test.js` 183–184 need no change. Ships as an isolated slice (§10 slice 5). |
| 2 | Phase-1 essays | Weekly 2 = Saturday mock 2교시 (`p2`). The set's "논술 실전 25분" (`essay:D`) is 필수 **in phase 2 only** (quota 5, minimum 3, contract line 8); 권장 (fold) in phases 0–1 and 3 (phase 3's handwriting item is `x.redo`); no essay row in phases 4–5 (`PE_HW[4].ew = PE_HW[5].ew = 0`, no `ew` item exists). | `PE_PHASES[1].g` "주말마다 논술 2문제"; avoids 9 essays/week; matches `PE_HW_MIN`, `PE_SCORE` and `PE_ROUTINES[3]`/`[4]` (§3.8 phase table). |
| 3 | 단답 per weekday | 1 is 필수 (`hw.dd`), a 2nd is 권장 "단답 1문제 더" (manual, `x.dd2`). | Routine said 2, `PE_HW[1].dd=1`. |
| 4 | Past-day homework | Never carried item by item. Only the 필수 floor (`PE_HW_MIN`) of this week's earlier sets becomes three quota rows (단답 · 목차 · 쓰기) on Sat/Sun/holidays, deadline Sunday; Saturday takes about half, Sunday the rest; quotas restart at 0 on Monday (no debt). | week.md §4.2; B's half rule keeps the mock day bearable. |
| 5 | Routine checklist | **Removed from 오늘; no auto-ticks.** Every `PE_ROUTINES` line of every phase maps to one computed task or one manual row with a stable id in `S.tk` (§3.6). Streak keeps working through `S.daily[t].active` (`touchDay` 154, `isActive` 365); every new completion path calls `touchDay()`. 통계 and the weekly report switch to the weekly score **in the same slice** that removes the checklist. Old `S.checks` stay readable (calendar history, `isActive`). | Deviates from the default (auto-tick): auto-ticks from empty queues inflate the streak (B's `rtSync` reads "0 due" as done) and keep the index-keyed defect D6 alive. |
| 6 | Mock carry-over | Until the next mock arrives (next Saturday 06:21). Only an unwritten part carries; a missing "채점 받았어요" alone is not chased after Sunday. Mocks dated before `MOCK_GRADE_SINCE` (the v3.0.0 release date) never ask for grading. A weekend never shows two mocks; on weekdays the carried mock is never the active row. | week.md §4.2, A §3.4, model judge. |
| 7 | New records | All inside `S`, additive: `S.tk`, `S.today`, `S.wk`, `S.mockp[D].g/.sc`, `S.settings.budget`. **No `pe_ui_v1`**: `native/host.js` 3 persists only `STORE_KEYS=['pe_state_v1','pe_sets_v1']`, so a third key would vanish on the iPhone. Pure UI state (folds, "나중에", the nav mirror) is memory only. | Deviates from the default for that reason. |
| 8 | Set "done" | Shown as "핵심 ✓" (용어 읽기 + 세트 퀴즈; + 논술 from phase 2), "숙제 필수 n/m" and "전체 n/m". `setStatus().done` unchanged; `setStatus()` gains an additive `core`. | Keeps calendar and old screens stable. |
| 9 | Set reviews before 카드 복습, skip today's cards | Yes. In every day kind the order is 세트 복습 → 카드 복습 → 오답. `setReviewItems` skips cards graded today; Today's 카드 row excludes the cards of today's planned set reviews and cards graded today. `grade` 163 and the intervals are untouched. | Ends same-day double promotion (model judge K05 case). |
| 10 | Review sheet | One primary "세트 복습 시작" + folded "다른 방법으로" (the other 5 methods stay in the DOM). | P7. |
| 11 | Scorecard | Shown as "이번 주 n%" on 이번 주; everywhere it leads with "남은 필수 X / 남은 시간 Y · 다 하면 m%" and shows "지금 n%" second. Weights week.md §5 (phase 1: 25/25/30/15/5), every target fixed from Monday (expected sets, mock and review steps included), so the % never falls by itself. Legend "필수만 세요 · 60%면 합격선, 80%면 잘 지킨 주". | Candidate judge (no drop), model judge (week.md weights). Verified §3.13. |
| 12 | Overflow | Shrink automatically, levels 0–3 (§3.8), labelled "(줄인 목표)" / "핵심만"; dropped work goes to "다른 날로 옮긴 것" with a named destination or to "놓아준 것" with true copy; at least one handwriting unit per study day at every level. | B §3.5, candidate judge. |
| 13 | D1–D4 | Fixed (§8). D3 counts a set review at ≥80% of its items done (`SES.done`: answered, graded, self-checked, typed and checked, or flipped in 카드 넘겨 보기), on both marking paths in `sessDone`. | Model and candidate judges. |
| 14 | Focus mode | Hide the tab bar in `#sess`, `#memo` and on `#mock/D` while its timer runs; topbar "닫기"; keep the iOS edge swipe (native rebuild otherwise); web guards cover back **and** forward traversals; 24 px dead zone at both edges for in-page swipes. | Engineering judge. |
| 15 | Calendar forward marks | Yes, hollow dots for this week's remaining duties (slice 7, low risk). | Brief default; C skipped it. |
| 16 | Notifications with counts | Later phase (needs a `notifPlan` body change in `native/host.js`). | Native change. |
| 17 | Unobservable tasks | Manual rows with stable ids in `S.tk`: 교재 읽기, 단답 1문제 더, 원서접수, 다시 쓰기, 고쳐 쓰기, 이번 주 목표, 준비물, 압축 요약. 권장 ones live in "시간이 되면"; phase rules make some 필수 (§3.6). | Brief default. |

### 0.2 Conflicts between the judges, and the decision

| Conflict | Decision |
|---|---|
| Candidate/model want A's coach queue; engineering rates A's churn unsafe (do pages, read/quiz sessions, merged tabs, no freeze). | C's architecture with A's behaviour where it is cheap: one numbered order with one primary and "나중에" (A §4), "다음" on every end screen with origin kept (A §7.1 rule 3, via C §7.3), the mock stepper (A §6.7). **No `#do` route**: paper work runs on a focused 숙제 card with three numbered steps and the set page's sticky bar (§6.4). **No new read/quiz session modes**: rows open the set page, as C. |
| Engineering: "defer inline timers and the mock stepper"; candidate: "the mock must be a guided stepper". | The stepper ships in v3.0.0 as slice 6, after the core, behind fixed-clock tests; until then the mock page gets the minimal records ("채점 받았어요", scores) in slice 3. The inline timer is one component that generalizes `paintTimer` (1274) to any `[data-timer]` element; the timer-end sheet never opens over `#memo`/`#sess` (§6.8). |
| Score: C's minute-weighted whole-week score vs week.md weights (A/B) that drop when parts appear. | week.md weights **with C's whole-week denominator**: each part's targets exist from Monday (expected sets, estimated mock, forecast review steps); parts are only ever removed (when they cannot happen), never added mid-week; level-2 cuts are a ratchet within the week. Computed day by day in §3.13: 1 → 12 → 24 → 36 → 49 → 61 → 90 → 94%. |
| One minute model (engineering: three prototypes disagreed on the same Saturday). | One table `MIN_PER` (§3.2). Saturday sample: B 463 / C 540 → level 1 (A said 407, B 437, C 455). |
| Academy counts: A collapsed them into "숙제 더 하기", B split one exercise into two rows. | One row per exercise; the title keeps the academy count ("말하기 4번"), the meta marks the floor ("필수 2번"). At level 0 the row's target is the full count; at level ≥1 or when the user shortened the day it is the floor ("오늘은 2번까지"). Counts and circles never change (§3.5). |
| B's weekday "교시" names. | "1교시"–"4교시" only for real exam papers (Saturday/Sunday mock blocks). Weekday blocks keep commute names. |
| B's separate "지금" card. | Not used; the active row is expanded in place and done rows compact, so it is on the first screen. |

---

## 1. Concept in 5 lines

1. **오늘 is one numbered list, "오늘 몫", in time-of-day blocks**, computed by one pure planner from records the app already writes, frozen once per day. The first unfinished row is expanded and holds the screen's only blue button; every required row says what happens if it is skipped ("일요일까지", "오늘만", "다시 나와요", "다음 모의 전까지", "D-n").
2. **The day fits the time actually left.** Capacity is "the budget, but never more than what is left before 23:30"; one tap on "오늘 시간" (30분 · 1시간 · 1시간 30분 · 평소대로) re-plans; a fixed 최소 몫 (용어 읽기, 세트 퀴즈, 단답 1문, 자기 전 5분) always stays; everything moved names where it goes ("→ 토요일 따라잡기").
3. **Under it, and in the 이번 주 tab, "이번 주" answers "if not today, then by Sunday"**: a Mon–Sun strip, "남은 필수 X / 남은 시간 Y · 다 하면 m%", at most 5 owed lines on 오늘 and the full 7-line contract, score, carry-over and records on 이번 주. No red for backlog, ever.
4. **Navigation becomes deterministic**: one `goUp()` with a `PARENT` table, a history mirror keyed by a depth counter in `history.state` and driven by `popstate`, every move that goes back pops instead of stacking, tab taps unwind and replace, sessions and 가리며 외우기 run in focus mode, every end screen offers "다음: …" and chained steps never grow history.
5. **Nothing the user asked for disappears**: academy 숙제 counts, 가리며 외우기 with tape, the 학습 달력, the ~150-question 용어 퀴즈 (회차별·용어별·무작위), and every memorization tool one tap from the 복습 tab. SR intervals, review steps 1·3·7·14·30, exam-date rules, week map, D-day and the backup format are unchanged.

---

## 2. Information architecture

### 2.1 Bottom tabs

| Tab | Hash | Holds, top to bottom | Badge |
|---|---|---|---|
| **오늘** | `#today` | header (calendar icon first, date as title, "1주차 · 1단계 기본·단답", D-day) → P0 pin (dated windows only) → one-line notices (Monday fresh start, phase start) → "이어서" row (only if a flow is unfinished) → status line "오늘 몫 n개 · 약 X" + "오늘 시간 3시간 ▾" → **오늘 몫** in blocks → "다른 날로 옮긴 것 · n개" (folded, only if any) → "시간이 되면 · n개" (folded) → **이번 주** section (strip, one status line, ≤5 owed lines, "이번 주 전체 보기") → ghost "오늘 몫 다시 짜기" | none |
| **이번 주** | `#week` | title "이번 주" + "1주차 · 10/26~11/1 · 토공 + 연약지반" → score card → 날마다 (7 rows) → **일요일까지 끝낼 것** (≤7 lines) → 넘어온 것 / 놓아준 것 (only if any) → 이번 주 목표 (folded checklist) → 다음 일정 (one line) → 기록 (학습 달력 · 세트 보관함 · 통계·주간 리포트 · 로드맵) | red number **only** for a dated deadline within 3 days (원서접수 window, 48시간 복기) |
| **복습** | `#review` | title "복습" + status "세트 복습 5 · 카드 복습 14 · 오답 8" → **세트 복습** (≤5 due rows, primary "세트 복습 시작", row "카드 복습 n장", secondary "모두 가리며 외우기 (n장)") → **오답 노트** (always shown; "오답 다시 풀기", "오답 카드 가리며 외우기", "목록 보기") → **별표 카드** (only with stars: "별표 카드 넘겨 보기", "별표 카드 가리며 외우기") → **지난 세트** (≤5 not-due sets) → "세트 보관함" | none (the old due-review badge is removed: 오늘 already orders the reviews) |
| **연습** | `#practice` (old `#study`, `#test` resolve here) | title "연습" → 범위 select → **카드** (4 rows) → **문제** (6 rows) → **실전** (3 rows) → "단원별 진도" (folded) | none |
| **더보기** | `#more` | 아이디 line (member only) → 관리 (승인 관리, admin only) → 시험 일정 → 공부 도구 (학습 달력, 로드맵, 답안 작성 요령, 교시 타이머, Claude 프롬프트) → 데이터 (지금 받아 오기, 카드·목차 가져오기, 백업·복원 "마지막 백업 10/18") → 앱 (설정, 콘텐츠 출처) → footer "기술사 6개월 v3.0.0" | none |

- `index.html` nav (17–23): buttons `data-tab="today|week|review|practice|more"`, labels and `aria-label` 오늘 · 이번 주 · 복습 · 연습 · 더보기. Icons: 오늘 house (kept), 이번 주 new 24-px stroke icon (rounded rect with a 7-cell row), 복습 kept, 연습 = the old 암기 cards icon, 더보기 kept. The old 테스트 icon retires.
- Tab-root titles shrink from 2rem to 1.5rem/800 and lose their slogans ("잊기 직전에 다시 꺼내 보는 곳", "앎을 고를수록…", "맞힌 만큼…"); each gets a one-line status (§9).
- Until slice 5 the old five tabs stay and `#week` is a page under 오늘 (`TAB_OF.week='today'`), so every slice ships working (§10).

### 2.2 Every screen and feature, old → new (nothing is deleted)

"Home" = where a tool lives. "In context" = where it also appears as a next step.

| Old screen / feature | Old entries | New home | In context | What changes |
|---|---|---|---|---|
| 오늘 `#today` (`vToday` 367–398) | tab | 오늘 | – | Rebuilt as "오늘 몫" (§4). Removed blocks and where they went: "오늘 할 일" → mapped tasks (§3.6), text kept in 로드맵 "요일별 루틴(참고)"; set hero → rows; 4 복습 rows → rows; "이번 주 목표" → 이번 주 (checkable); "다가오는 일정" → P0 pin + 이번 주 "다음 일정" + 로드맵; sync line (387) → only failures and "기다리는 중" rows; "29주 로드맵 전체 보기" → 더보기 and 이번 주 → 기록. |
| 복습 tab `#review` (`vReview` 613) | tab | 복습 tab (same hash) | – | "다시 볼 세트" → "세트 복습" with one primary; "n개 이어서 복습" (75 items, `startSetReviewAll` 743) → "세트 복습 시작" chained one set at a time (function kept, unused); "기준 수치 빈칸" section → 연습 → 문제; methods note (620) removed; "지난 세트 다시 외우기" → "지난 세트"; 모아 보기 → "별표 카드" section + "세트 보관함" row. Every memorization tool stays a visible row. |
| 암기 tab `#study` (`vStudy` 648) | tab | 연습 → 카드 | – | Tiles removed (numbers move into rows); "오늘 학습 시작 (27장)" (due + new in range) → "카드 복습 N장 · 전체 단원" + "새 카드 n장" (range); "섞어서 자유 복습" → "자유 연습"; "가리며 외우기 (20장, 별표·오답 먼저)" kept; 단원별 진도 folded at the bottom of 연습 (its "이 단원 카드 외우기" = due + new of that unit, see "documented change" below). |
| 테스트 tab `#test` (`vTest` 928) | tab | 연습 → 문제 / 실전 | – | "빠른 테스트" → 문제 (6 rows, one name each); 실전 → 3 rows; "기출 단원별 보기" row removed (it is the segment of 기출); "논술 답안 작성 요령" row removed (→ 더보기); "기록" → 이번 주 → 기록. Copy "토요일 06:50" (944) → "토요일 06:21쯤". |
| 세트 `#set/D`, tab 용어 | Today hero, "어제 세트", review sheet, 보관함 | `#set/D`, seg "① 용어" | Today rows `set.read`, `late`; 복습 지난 세트; 보관함; 이번 주 day list | Read terms get ✓ in their number; tools in one compact row; header lines only on ①; "확인이 필요한 부분" → folded "교재로 확인할 것 n" here. Deep link `#set/D/<tab>` canonicalized to `#set/D` (§7.6). |
| 세트, tab 퀴즈 | seg 2 | seg "② 퀴즈" | Today row `set.quiz`; end screens | **세트 퀴즈 first**, 용어 퀴즈 folded below with all three modes (§6.3). |
| 세트, tab 숙제 | seg 4 | seg "③ 숙제" (moves to 3rd) | Today hw rows and weekend quota rows open it focused on one card | 필수 marks on the first circles, "필수:" sub-line, academy titles and counts unchanged, per-card 요령 kept, "더 하기" folded, duplicate drawing written through (§6.4). Header "이 세트 숙제". |
| 세트, tab 논술 | seg 3 | seg "④ 논술" (moves to 4th) | Today fold "논술 실전 25분 → 첨삭" (phases 0–1 and 3) or row (phase 2); no Today row in phases 4–5 | Seg label "④ 논술 ○" (phase 2) / "④ 논술 권장" (phases 0–1, 3) / "④ 논술" (phases 4–5), "✓" when written; phase note; one name "답안 작성 요령"; inline 25-minute timer in slice 6. |
| 숙제 counts (academy style, `PE_HW`) | 숙제 tab | same | Today rows show the count as target | `PE_HW` and circles unchanged (e.g. "새 용어 4개: 안 보고 쓰기 2번, 소리 내어 말하기 4번"). New `PE_HW_MIN` only marks which first circles are 필수. |
| 용어 퀴즈 (~150문, 회차별·용어별·무작위, 51855c1) | 퀴즈 tab top with the only primary; review sheet | ② 퀴즈, folded "더 연습: 용어 퀴즈 150문 · 15/150" | review sheet "다른 방법으로"; Today fold "용어 퀴즈 이어 풀기"; end screen "다음: 3회 풀기 (15문)" / next term / "무작위 15문 더" | Everything in `gqSection` 550 stays (`GQ_MODES` 549, `SV['gqm:'+d]`, chips, 용어별 rows, 무작위, "틀린 문제만"); buttons become secondary; each mode chains from its end screen. |
| 가리며 외우기 + 테이프 `#memo` | 12 buttons, 8 actions | screen unchanged except focus mode and a sticky control row `.mctl` | set ① tools; review sheet; 복습 (세트 복습, 오답, 별표); 연습 카드; session ghost "이 카드부터 가리며 외우기"; end screens; card modal | Tape code and the `passive:false` window `touchmove` listener (841) untouched. Memo inside memo returns to the outer memo (T5). The memo end screen drops its "학습 달력" button. |
| 카드 넘겨 보기 (`set-flash` 1343) | set, review sheet, 숙제 | set ① tools "카드 넘겨 보기" | review sheet; 숙제 새 용어 card | One name (retires "카드로 넘겨 보며 외우기", "카드로 넘겨 보기"). |
| 빈칸 쓰기 (`start-fill` 1401) | set, review sheet, 테스트 | 연습 → 문제 "빈칸 쓰기 10문" | set ① tools; review sheet | Level sheet gets "‹ 다른 방법" back to the review sheet. |
| 단답 답안지 `#dandap/id` (`vDandap` 1209) | set card, 숙제, card modal, 테스트 | 연습 → 문제 "단답 답안지 1문 · 10분" | 숙제 단답 card "답안지"; set term; card modal | One name. Opened from 숙제 as `#dandap/<id>/<D>` it shows "다 썼어요(숙제에 표시)", which writes the same `sp.hw['dd'+i]` circle. |
| 답안 작성 요령 `#guide` | 논술 tab, mock, 테스트, 더보기 | 더보기 → 공부 도구 | ④ 논술 ghost link, mock page "⋯" | Removed from 테스트/연습; one name. |
| 기출 `#kichul`, `/r/N`, `/u`, `/u/N` | 테스트 ×2 | 연습 → 실전 "기출 문제은행" | Sunday row "다음 주 단원 기출 훑기" → `#kichul/u/N` | Segments replace (T10); per-row "1교시 카드 연결 n/13" removed; opening next week's unit page on Sat/Sun ticks `kichul:W`. |
| 모의고사 `#mock/D`, `#mock/app` | Today (Sat–Sun), 테스트 row 7, 보관함 | `#mock/D` stepper (§6.8), parent 연습 | Today rows (Sat/Sun), 이번 주 line 1, 연습 → 실전, 보관함 | Parts → timer → "n교시 다 썼어요" → 채점 (copy, "채점 받았어요", scores) → answers. |
| 학습 달력 `#cal` (`vCal` 1070) | Today icon, 더보기, memo end | Today icon + 더보기 | 이번 주 → 기록 | Memo-end button removed; 5-line version note → none; weekend empty state fixed; hollow forward dots for this week (slice 7). |
| 통계 `#stats` (`vStats` 1002) | 테스트 → 기록 | 이번 주 → 기록 "통계·주간 리포트" | – | Tiles "학습한 카드", "이번 주 필수 n%", "핵심 끝낸 세트 a/b"; "7일 체크 달성" retired; new "주간 기록" from `S.wk`; "주간 리포트 복사" ticks the week only on Sat/Sun (§6.10). |
| 로드맵 `#plan` (`vPlan` 1083) | Today, 더보기 | 더보기 | 이번 주 → 기록 | Today link removed; new fold "요일별 루틴(참고)" with this phase's `PE_ROUTINES` text. |
| 시험 일정 `#schedule` | 더보기, 설정, 로드맵 | 더보기 | P0 pin "날짜 확인·고치기"; 이번 주 원서접수 date-check line | Removed from 설정; one-line warning when the start date is not a Monday ("주가 월요일에 시작해야 이번 주 계산이 맞아요"). 3.1.1: no warning, any weekday works; a neutral first-week note instead (see `app/CLAUDE.md` "어느 요일에 시작해도"). |
| 타이머 `#timer` (`vTimer` 1278) | 7 buttons, 더보기, pill | 더보기 "교시 타이머" | inline on the mock page, ④ 논술, 단답 card (slice 6); pill elsewhere | Every preset change (`timer-go`, `timer-preset`, `timer-custom`, `mock-start`) asks before replacing a running or paused timer (T9, `setPresetAsk`); time-up sheet and pill "⏱ 시간 끝" record or point to the part (§6.8). |
| 설정 `#settings` | 더보기 | 더보기 | – | + "하루 공부 시간" (평일 · 토요일 · 일요일·공휴일); − "시험 일정" row; member rows and app-only "알림" untouched. |
| 백업 `#backup` | 더보기 | 더보기 | Sunday fold "백업 파일 저장 · 마지막 n일 전" (≥14 days) | Records the last backup date (`S.tk.backup`). |
| 승인 관리 `#admin`, 아이디, 아이디 지우기 | 더보기, 설정 | unchanged | – | Apple 5.1.1(v) items untouched. |
| 오답 노트 `#wrong`, `start-wrong`, `memo-wrong` | Today row (2 behaviours), 복습 ×3 | 복습 → 오답 노트 | Today row "오답 다시 풀기 n개" (always the session) | Today row hidden when empty; on the 복습 tab the section header "오답 노트" is always shown; the buttons "오답만 다시 풀기" in `vReview` 623 and `vWrong` 634 read "오답 다시 풀기". |
| 별표 (`start-stars`, `memo-stars`) | 복습 → 모아 보기 | 복습 → 별표 카드 | 연습 범위 "별표 카드" | Section shown only when ≥1 star. |
| 수치 빈칸 (`start-cloze`) | 복습, 테스트 | 연습 → 문제 "수치 빈칸 10문" | phase-3 fold row | One home, one name. |
| 4지선다 / 용어 회상 | 테스트 | 연습 → 문제 "4지선다 10문", "용어 회상 10문" | – | – |
| 논술 목차 (`start-outline` 755) | 테스트 "논술 목차 5문" | 연습 → 문제 "논술 목차 떠올리기 5문" | Today fold "논술 목차 떠올리기 3문" (phase 1) / row "…5문" (phases 2–3) | Three outline drills, three names: 떠올리기 / 옮겨 적기 / 실전 25분. |
| 세트 보관함 `#archive` (`vArchive` 636) | 복습 → 모아 보기 | 복습 → "세트 보관함" | 이번 주 → 기록 | Right column "핵심 ✓ · 숙제 필수 3/5" or "용어 5/10 · 퀴즈 0/5" instead of the misleading "10/10" (624); mocks "1교시 ✓ · 2교시 ○ · 채점 ○". |
| Review sheet (`revSheet` 604, 6 equal rows) | 복습 rows | same modal | Today group rows, 이번 주 | 1 primary + "다른 방법으로" (§6.6). |
| Routine "오늘 할 일" (`PE_ROUTINES`, `S.checks`) | Today | removed from screens | 로드맵 "요일별 루틴(참고)" | Every line mapped (§3.6); `PE_ROUTINES` order unchanged; `chk` 1339 stays as dead-safe code. |
| 이번 주 목표 / 산출물 | Today (4 of n), 로드맵 | 이번 주 → "이번 주 목표 n/4" checklist | Sunday 주간 마감 fold | Checkable (`S.tk['goal:'+W+':'+i]`), 2 points of the score. |
| 다가오는 일정 / 원서접수 | Today text | P0 pin (apply−7…apply+3), 이번 주 "원서접수 날짜 확인" line from apply−21, "다음 일정" line | – | Gains "접수했어요". |
| Claude 프롬프트, 카드·목차 가져오기, 콘텐츠 출처 | 더보기 | 더보기 | – | Unchanged (version text moves to the footer note; `native.test.js` 204 still finds "기술사 6개월 v{version}" on `#more`). |

**Documented change (not a silent removal).** Reviewing the due cards of one unit only used to be possible from 암기 (range-filtered "복습 대기" and "오늘 학습 시작" = due + new in range). In v3 "카드 복습" is always the whole queue (one number everywhere, P5). The unit-only path remains through 연습 → "단원별 진도" → a unit row ("이 단원 카드 외우기", `study-unit` 1396 → `startStudy(unit)` = due + new of that unit, without changing `S.range`) and through 연습 "자유 연습" / "가리며 외우기" with a range. Written into `app/CLAUDE.md` (slice 7).

### 2.3 Entry-point budget (same reach, fewer on screen)

| Tool | Before | After |
|---|---|---|
| 가리며 외우기 | 12 buttons, up to 3 on one screen | same entries; ≤2 visible per screen, all secondary/ghost or rows |
| 단답 답안지 | 4 entries, 4 names | 4 entries, 1 name |
| 답안 작성 요령 | 4 entries, 3 names | 3 entries, 1 name |
| 타이머 | 7 buttons (4 reset silently) + pill | same buttons with minutes in the label ("타이머 25분"); inline on mock/논술/단답 (slice 6); none resets without asking |
| 세트 열기 | 4 buttons, 3 labels | Today rows, 이번 주 day list, 복습 지난 세트, 보관함, review sheet link |
| 학습 달력 | 3 | 2 (Today icon, 더보기) + 이번 주 → 기록 link |
| 시험 일정 | 3 | 2 (더보기, 로드맵) |
| 수치 빈칸 / 기출 단원별 | 2 / 2 | 1 / 1 |
| Tool tabs | 3 overlapping (복습·암기·테스트) | 2 (복습 = what comes back; 연습 = self-directed) |

### 2.4 Glossary (one word per concept)

| Concept | Use | Retire |
|---|---|---|
| Day 1·3·7·14·30 re-review | **세트 복습 ({n}일 차)**; session title "{M월 D일} 세트 복습" (`startSetReview` 742; `startSetReviewAll` 743 "세트 복습"); calendar line "{M월 D일} 세트 복습({n}일 차)" (`markReviewed` 304 text only, its logic is unchanged; `calItems` 1040; old stored marks keep their text); memo "세트 복습" / "세트 복습: 가리며 외우기" (`memo-rev` 1371); report "세트 복습 대기 n개" (1016) | 다시 볼 세트, 이어서 복습, 카드·퀴즈로 다시 보기, 세트 다시 보기 |
| Not-due re-run of a set | **세트 다시 풀기** ("세트 다시 풀기 · 약 8분"; records no 세트 복습) | – |
| SR due cards | **카드 복습** (N = due cards outside today's planned set reviews and not graded today, §3.4; Today's row shows today's portion) | 복습 대기, 오늘 학습 (for due) |
| New deck cards | **새 카드** | 오늘 새 카드 |
| Random practice | **자유 연습** | 섞어서 자유 복습 |
| Not-due older sets | **지난 세트** | 지난 세트 다시 외우기 |
| Wrong items | list **오답 노트**, action **오답 다시 풀기** (also `vReview` 623, `vWrong` 634) | 오답만 다시 풀기 |
| Set obligations | **핵심** (용어 읽기 + 세트 퀴즈), **숙제 필수** / **더 하기**; a set-only task is a "세트 숙제 항목" | 오늘 할 일, 오늘 숙제 (on past sets), 과제 |
| Today's selected list | **오늘 몫** | – |
| Optional today | **시간이 되면** | 시간 남으면 |
| Moved to another day | **다른 날로 옮긴 것** (each with "→ 토요일 따라잡기" etc.) | 못 한 것 |
| Dropped by overflow | **놓아준 것**; its one note, everywhere (Today fold, 이번 주, Monday sheet): "놓아준 것은 빚이 아니에요. 카드·세트 복습·오답은 복습 탭에서 다시 만나요. 손글씨 몫은 이번 주로 끝내요." | – |
| Weekly deadline | **일요일까지** (Sunday: **오늘 밤까지**) | – |
| 5-question quiz / 150 drill | **세트 퀴즈** / **용어 퀴즈** | quiz tab opening with the drill |
| Flash cards | **카드 넘겨 보기** | 카드로 넘겨 보며 외우기, 카드로 넘겨 보기 |
| Outline drills | **논술 목차 떠올리기** / **논술 목차 옮겨 적기** / **논술 실전 25분** | 논술 목차 5문, 목차 회상 |
| Weekly mock | **주간 모의고사**; last week's **지난주 모의고사**; generated **앱 모의고사**; not this week **최근 모의고사** | 이번 주 모의고사 (for an older mock) |
| Exam papers | **1교시 단답**, **2교시 논술** … (only for real papers) | weekday "교시" |
| Timer buttons | "타이머 {n}분" | 타이머, 교시 타이머 (as a button) |
| Tab names in text (slice 5) | **연습 탭**, **연습 → 기출 문제은행**, **이번 주 탭**, **모의고사 화면** | 암기 탭, 테스트 탭, 앱 테스트 탭, 플랜 탭, "테스트 → 기출 회차/단원별". App-only strings are edited (`HW_HOW.rev` 404, 설정 1144, `memo-study` label 1381, `PE_PROMPTS` p9 name, `PE_CLAUDE_ROUTINE` 153/154/157, `PE_ROUTINES` texts); `vReview` 625 goes with its section (slice 4). `PE_WEEKS` goals stay equal to `pipeline/curriculum.json` and are rewritten at display time by `tabWords()` inside `weekObj` (§6.10). |
| Day with study time 0 (v3.1) | **쉬는 날** (`S.days[d].m === 0`; set from "오늘은 쉬어요", 이번 주 날마다, 설정 → 쉬는 날·짧은 날) | – |
| Day shorter than usual (v3.1) | **짧은 날** ("짧은 날 1시간 · …") | – |
| Undone 필수 of earlier days this week (v3.1) | **밀린 몫** ("밀린 몫은 11/7(토)까지 다 따라잡아요"; this week only, never across Monday) | 못 한 것, 진도, 단계 (for the overflow level) |
| Opt-in weekday split of the 손글씨 몫 (v3.1) | **평일 저녁에 나눠 하기** / "그만 나누기" (`S.wk[W].cu`) | – |
| Asking whether to postpone the exam (v3.1) | **시험 일정 살펴보기** (rows), section "시험을 미룰지 살펴봐요"; round tags **지금** / **추천** | – |

---

## 3. Task model

### 3.1 Principles

- **One pure function computes every candidate** (`taskList(t)`). It reads only `spGet`, `setStatus`, `hwItems`, `reviewDue`/`dueSetReviews`, `dueCards`, `wrongList`, `S.mockp`, `S.tk`, `S.daily`, `S.essayStat`, `S.log`, `SETS`, `PLAN`. It never calls `sp()` (that creates set progress and, after D2, starts review clocks); a test enforces it (§10 slice 2). `planToday(t)` is the only planner function that writes, and it writes only `S.today` (freeze, merge, re-plan, dependent insert) and the `S.wk[W].cut`/`cph` ratchet.
- **Done is derived from the record the action already writes.** A manual tick exists only for work the app cannot observe (paper, textbook, Q-Net). One action writes one record; one record belongs to one task (§3.5).
- **A day has a budget and a clock; a week has a contract.** Today's portion is selected by priority inside the time actually left, frozen for the day, and every required task that does not fit is shown with the day it moves to.
- **Week = Mon–Sun by calendar** (`wkStart(ds)` = Monday, `wkEnd` = Sunday); deadline Sunday 23:59. Plan-week content (goals, phase) comes from `weekIndex(wkStart(t))`, identical to the plan week while `S.settings.start` is a Monday (as now); `vSchedule` warns otherwise. 3.1.1: plan weeks count from the Monday of the start week (`planMon`), so any start weekday works.
- **Unchanged (brief §5):** `INTERVALS` 13, `REVIEW_STEPS` 14, `grade` 163, `reviewDue`/`markReviewed` 302–304, `computePlan` 86, `PE_WEEKS`/`PE_PHASES`/`PE_SETRULE`/`PE_SCHED`, D-day, the week map, the backup wrapper. `sp.first` keeps meaning "first touch"; D2 only *fills* it where it was missing, never moves it.

### 3.2 New data, state and constants (all additive; backup stays `{"state":S,"sets":SETS}`)

**State in `S`** (`fresh()` 49 gains the keys; `load()` 52 back-fills missing top-level keys; restore 1474 does `Object.assign(fresh(), st)`, so old backups get the defaults; an older app restoring a v3 backup keeps the unknown keys harmlessly):

| Key | Shape | Written by | Read by |
|---|---|---|---|
| `S.tk` | `{ [taskId]: 'YYYY-MM-DD' }`; `S.tk.backup` = last backup date | manual rows (`tk` action), `report` copy 1448 (only for the week the copy covers, §6.10), `sessDone` markers (`wrong:<t>`, `cards:<t>`), `backup-copy`/`backup-dl` 1471–1472, `#kichul/u/<next unit>` opened on Sat/Sun (`kichul:<W>`), 설정 budget save (`budget`) | planner, 이번 주, 통계, report |
| `S.today` | `{ d, at:'HH:MM', v:PLAN_V, lv, cap, user, sig, rows:[{id, m, tgt, blk, dep}] }` with `user` = null, 30, 60 or 90, `tgt` = 'full', 'floor' or null, and `dep` = the parent row's id on a dependent row (§3.7 step 9b) — ids and frozen minutes only, **no labels** (labels render live) | `planToday(t)` once per day, on the re-plan triggers of §3.7 step 9, and for the dependent insert | 오늘, end-screen "다음", 이번 주 (minutes done today) |
| `S.wk` | `{ [W]: { cut:bool, cph, p, parts:{…the phase's PE_SCORE keys}, lv, at, carry:[ids], rel:[labels] } }`; `cut` and `cph` (the phase id the cut was set in) are live during the week, the rest is frozen on the first render of the next week (`weekSnap`) | `planToday` (cut, cph), `weekSnap`; a schedule change clears `cut` when `phaseObj(w).id !== cph` | Monday line, 통계 "주간 기록", report |
| `S.mockp[D].g` | `'YYYY-MM-DD'` (채점 받은 날) | mock page "채점 받았어요" | planner, 이번 주, 보관함, report |
| `S.mockp[D].sc` | `{ p1:62, p2:55 }` optional numbers 0–100 | mock page score inputs | 이번 주 (점수 추이), 통계, report |
| `S.settings.budget` | `{ wd:180, sat:300, sun:240 }` (일요일·공휴일 share `sun`) | 설정 "하루 공부 시간" | planner through `budgetOf(t)` only |

- `S.tk` keys (all dates `YYYY-MM-DD`, `W` = Monday): `report:W` (W = the week the copied report covers), `kichul:W`, `goal:W:i`, `redo:W`, `sum16:W`, `prep:W`, `wrong:t`, `cards:t`, `x.book:t`, `x.dd2:t`, `x.redo:t` (a weekend quota unit: `x.redo:t:j`), `x.sum2:t`, `x.fix:D`, `kit:t`, `ex:t:i`, `apply:R`, `applychk:R`, `recap:R`, `notice:YYYY`, `wkline:W` (Monday notice dismissed), `phase:N`, `budget`, `backup`, `seen:v3`. Ids never contain array indexes of `PE_ROUTINES` (D6 cannot return).
- `S.mockp[D]` keeps only `p1`–`p4` plus `g`, `sc`; `vMock` reads `pr[pk]` only, and `S.mockp` is read by key at 979/1443 only, so old code ignores the new fields.
- `budgetOf(t, kind)` — every planner minute of capacity comes from here (`load()` 52 and restore 1474 merge `settings` shallowly, so the defaults are merged per key; a missing or non-numeric stored value falls back to the default):

  ```js
  function budgetOf(t,kind){kind=kind||dayKind(t);if(kind==='exam')return 0;
    const B=Object.assign({},BUDGET_DEF,S.settings.budget||{}),k={wd:'wd',pre3:'wd',holi:'sun',sat:'sat',sun:'sun'}[kind]||'wd';
    let v=Number(B[k])||BUDGET_DEF[k];if(kind==='sat'&&weekObj(weekIndex(t)).pre)v=Math.max(v,430);return v;}   // rehearsal Saturday ≥ 430
  ```
  So `pre3` days (the Wed–Fri before an exam day) are finite weekday budgets and the exam day itself is 0: in the week of `PLAN.mock.d`, C = 180 + 180 + 3×180 + 0 + 240 on Monday 2027-01-25 (plan.test case 14).
- Memory only (never in `S`): `UI={later:{}, open:{}, act:null}` ("나중에", open folds, a row to make active on the next Today render), `FLOW={id, from, at}` (the Today row that started the current step, §7.5), the router mirror (`DEP`, `HS`, `RET`, `NAVK`, `PEND`, `LOCK`, `LASTH`, §7).

**Constants in `app.js`** (new block `/* ════════ 11-0. 오늘 몫·이번 주 ════════ */` before `vToday`):

```js
const PLAN_V=1;                                   // bump when the planner changes, so an old S.today is rebuilt
const MOCK_GRADE_SINCE='YYYY-MM-DD';             // = the v3.0.0 release date, filled in slice 7; older mocks never ask for 채점
const BUDGET_DEF={wd:180,sat:300,sun:240};
const DAY_END=23*60+30, WD_WIN={am:9*60+30,noon:19*60,eve:23*60};   // minutes after midnight
const MIN_PER={read:1,quiz:1,say:.5,write:3,dd:15,eo:5,qz:2,sl:5,essay:30,fg:2,revItem:.5,card:.5,wrong:1,
  gq:5,p1:100,essayQ:25,essayPart:100,grade:30,report:10,kichul:20,book:60,dd2:15,outline3:10,outline5:15,
  goal:20,backup:2,redo:25,fix:30,rot50:25,rot30:15,kit:10};
// a set review = ceil(revItem × items) (10 cards + 5 quiz → 8); a mock essay part = n<6 ? essayQ×n : essayPart
```

(The worked examples assume `MOCK_GRADE_SINCE='2026-10-31'`, i.e. v3 live on the reference Saturday.)

**Tables in `data_plan.js`** (app-only; not mirrored in `pipeline/curriculum.json`):

```js
// 숙제 중 "필수"로 셀 앞쪽 동그라미 수(단계별, PE_HW 횟수보다 크면 PE_HW에 맞춤). 나머지 동그라미는 "더 하기"
window.PE_HW_MIN={0:{w:1,s:2,eo:2,dd:1,ew:0},1:{w:1,s:2,eo:2,dd:1,ew:0},2:{w:1,s:2,eo:1,dd:1,ew:1},
  3:{w:1,s:1,eo:1,dd:2,ew:0,fg:1},4:{w:1,s:1,eo:1,dd:1,ew:0},5:{w:0,s:1,eo:1,dd:0,ew:0}};
// 주간 성적표 배점(week.md §5.2). hand 안의 배분, rot = 4단계 회전
window.PE_SCORE={1:{core:25,mock:25,hand:30,hw:{dd:12,eo:9,w:9},rev:15,close:5},
  2:{core:20,mock:20,hand:40,hw:{essay:20,dd:10,w:5,eo:5},rev:15,close:5},
  3:{core:10,mock:35,hand:35,hw:{redo:20,dd:10,fg:5},rev:15,close:5},
  4:{core:10,mock:20,hand:25,hw:{redo:15,dd:10},rot:30,rev:10,close:5}};   // 0 = 1; 5 = checklist
// 아직 오지 않은 것의 어림(분): 평일 세트 핵심(읽기 10 + 퀴즈 5; 시험 전 3일은 10). 이번 주 모의의 어림은 app.js의 estMock(w)
window.PE_EST={core:15,coreExam:10};
// 단계 첫 월요일에 한 줄
window.PE_PHASE_NOTE={1:'1단계 시작: 세트 숙제(쓰기·말하기·목차)와 단답 1문이 매일 필수예요. 논술은 토요일 모의 2문으로 채워요.',
  2:'2단계 시작: 평일 논술 실전 25분이 필수가 돼요(주 5편). 목차 옮겨 적기는 3번으로 줄어요.',
  3:'3단계 시작: 토 1·2교시, 일 3·4교시 모의와 평일 모의 오답 다시 쓰기 25분이 필수예요.',
  4:'4단계 시작: 카드 50장 돌리기와 기출 목차 외우기 5문이 매일 필수예요. 새 용어는 하루 1개로 줄어요.',
  5:'시험 주: 새로 배우지 않아요. 카드·목차 돌리기와 준비물 점검만 해요.'};
// PE_ROUTINES 줄을 할 일로 바꾼 표(키는 고정 id, 배열 순서와 무관) — §3.6
window.PE_EXTRA={ /* see §3.6 */ };
```

`PE_ROUTINES.prep.wd[1]` text "플랜 탭 준비 주 목표 하나 처리" → "이번 주 탭에서 이번 주 목표 하나 처리" (same index; app-only table).

**Mock estimate in `app.js`** (`app.js` is one IIFE, so `data_plan.js` cannot call `weekObj`; the estimate lives in the 11-0 block). It mirrors `pipeline/tool.py` `mock_format` (697–721), which keys on the template number `_slot(w)['t']` (= `weekObj(w).tpl`), the rehearsal flag `pre` and the real exam dates, never on the plan-week number — so it stays right when the user moves the start date in 시험 일정 (start 2026-11-02: week 11 = rehearsal 430, week 12 = 제141회 0, week 13 = template 12 → 130; plan.test case 16):

```js
function estMock(w){const r=weekRange(w),inW=d=>!!d&&d>=r[0]&&d<=r[1];            // minutes incl. 30 for 채점
  if(inW(PLAN.mock&&PLAN.mock.d)||inW(PLAN.target.d)||w>=PLAN.E)return 0;          // real exam in this week, or the exam week
  if(w<=0)return 130;const m=weekObj(w),t=m.tpl;if(m.pre)return 430;                 // 진단 1교시 / 전교시 리허설
  if(t<=10)return 180;if([11,12,16,25].includes(t))return 130;if([13,14,15,17,26].includes(t))return 230;
  if((t>=18&&t<=24)||t===27)return 430;if(t===28)return 130;return 0;}
```

**`HW_STEPS` in `app.js`** (three numbered steps for a focused 숙제 card, §6.4; `HW_HOW` 402 stays as the folded 요령):

| key | ① | ② | ③ |
|---|---|---|---|
| `dd` | "답안지 모양 보기 (1분)" [답안지] | "덮고 실제 답안지에 10분 쓰기" [타이머 10분] | "사진 찍어 첨삭 요청 붙여 넣기" [첨삭 요청 복사] |
| `fresh` (쓰기) | "카드를 보며 정의 2줄·키워드 5개 읽기" [카드 넘겨 보기] | "덮고 답안지에 정의와 키워드 쓰기" | "카드를 펴서 빠진 곳만 빨간 펜으로" |
| `fresh` (말하기) | "30초 안에 정의 → 원리 → 특징 → 유의사항" | "막히면 카드를 보고 한 번 더" [카드 넘겨 보기] | "아침·점심·저녁에 나눠 하기" |
| `eo` | "1번째: 모범 목차를 보며 옮겨 적기" [모범 목차 보기] | "2번째: 소리 내어 읽으며 적기" | "3번째부터: 덮고 적은 뒤 빨간 펜" |
| `qz` | "틀린 문제의 해설 2번 소리 내어 읽기" | "왜 틀렸는지 한 줄 쓰기" | "같은 함정은 오답 노트에서 다시 만나요" |
| `sl` | "오늘 용어 제목만 보기" | "정의를 머릿속으로 떠올리기" | "막힌 것은 내일 카드 복습에 나와요" |

### 3.3 Day kinds, blocks, windows

`dayKind(t)`: `exam` if `t` is `PLAN.target.d` or `PLAN.mock.d`; `pre3` if `t` is one of the three weekdays before an exam day (1/27–1/29, 5/12–5/14 with the current plan); `holi` if a weekday in `KR_HOLI` (1048; sets still arrive, `pipeline/tool.py` 395); else `wd` / `sat` / `sun`.

| Kind | Blocks in display order (exact header · where cue) | Budget |
|---|---|---|
| `wd`, `pre3` | "아침·출근길 · 휴대폰" → "점심·퇴근길 · 휴대폰" → "저녁 · 책상·답안지" → "자기 전 · 불 끄기 전" | `wd` |
| `holi` | weekday blocks + "따라잡기 · 책상" before "자기 전" | `sun` (일요일·공휴일) |
| `sat` | "1교시 단답 · 100분" → divider "쉬는 시간 · 답안 사진 찍기" → "2교시 논술 · {m}분" → ("3교시 논술", "4교시 논술" only in the rehearsal week, `weekObj(w).pre`) → "채점 · 30분" → "따라잡기 · 책상" | `sat` (rehearsal week: ≥430) |
| `sun` | "밀린 핵심" (+ " · 책상" when it holds a mock paper) → ("3교시 논술", "4교시 논술" in phase 3) → "손글씨 몫 · 책상·답안지" → "복습 비우기 · 휴대폰" → "주간 마감" | `sun` |
| `exam` | "시험" (checklist) | 0 |

- Saturday blocks come from the mock file, not the routine text: `p1` → "1교시 단답", `p2` → "2교시 논술"; a mock with `p1`–`p4` that is not the rehearsal (`!weekObj(w).pre`: phase 3 and template 27) puts `p3`/`p4` on Sunday. No mock file (the week containing `PLAN.mock.d` or `PLAN.target.d`, or a failed job): only "따라잡기" (plus the exam card in the exam-day weeks).
- **Weekday windows** (display only): 아침·출근길 ends 09:30, 점심·퇴근길 ends 19:00, 저녁 ends 23:00. The current block is the first whose window has not ended; when a block's window has passed, its undone rows are shown inside the current block (§4.1), so a morning block is never current at night. "자기 전" becomes current only after 21:00 or when every other row is done.
- Phase notes in block headers (no task): phase 4 and exam weeks "자기 전 · 수면 7시간"; phase-4 Sunday header line "반나절은 쉬어요".

### 3.4 Catalog

Notation: `st=setStatus(d)`; `H=spGet(d).hw||{}`; `M=hwMin(d)` (§3.5 rule 9); `R=hwRule(d)` (`PE_HW`, 416); `F` = fresh terms (cards without `ref`). Minutes are **remaining** minutes (`MIN_PER`). "못 하면" is the exact text on the row (on Sunday every "일요일까지" reads "오늘 밤까지"). P = priority (§3.7). Blocks: wd / sat / sun.

| Type · id | Exact row title (sub) | Done-check | Minutes | 중요도 | 못 하면 | P | Block | Start ("시작" label → action) |
|---|---|---|---|---|---|---|---|---|
| `apply:R` | "큐넷 원서접수 · 제{R}회" ("12/29(화)~1/1(금) 예상 · 첫날 오전 10시") | `S.tk['apply:'+R]` ("접수했어요") | 15 | 필수 | "D-{n}" | 0 | pin, apply−7 … apply+3 (`milestones()` k `apply`) | buttons "접수했어요" (tk) · "날짜 확인·고치기" → `#schedule` |
| `applychk:R` | "원서접수 날짜 확인 · {M/D} 무렵" | `S.tk['applychk:'+R]` | 5 | 권장 | – | 6 | 이번 주 line, apply−21 … apply−8 | `#schedule` |
| `recap:R` | "제{R}회 복기: 문제 모두 적기 → 4문제 다시 써서 채점(48시간 안)" | `S.tk['recap:'+R]` | 150 | 필수 | "D-{n}"/"오늘까지" | 0 | pin, exam+1 … exam+2 | "다 했어요" (tk) |
| `ex:t:i` | `PE_ROUTINES.exam[dayType]` line i | `S.tk['ex:'+t+':'+i]` | – | 필수 | – | 0 | 시험 | check |
| `mock:D:pk` | "주간 모의고사 1교시 단답 · 13문 중 10문" / "주간 모의고사 2교시 논술 {n}문" (n≥6: "… 6문 중 4문"); sub on Saturday p1: "09:00에 시작하면 실제 시험과 같아요" | `S.mockp[D][pk]` | p1 100; essay part 25×n (n<6) else 100 | 필수 | "다음 모의 전까지" | 1 | sat own block / sun 밀린 핵심 if unwritten (phase 3: "3교시 논술", "4교시 논술") | "{n}교시 시작" → `#mock/D` |
| `mock.g:D` | "채점 요청 → 채점 받았어요" | `S.mockp[D].g`; only for `D >= MOCK_GRADE_SINCE` | 30 | 필수 | "다음 모의 전까지" | 1 | sat 채점 / sun 밀린 핵심 (after the parts; phase 3 after p4) | "채점하기" → `#mock/D` step 채점 |
| `report:W` | "주간 리포트 복사 → Claude" | `S.tk['report:'+W]` — set by a Sat/Sun copy of this week's report (`report` 1448 with `data-w=W`, §6.10); a Mon–Fri copy from 통계 never sets it | 10 | 필수 | "오늘 밤까지" | 1 | sun 주간 마감 | "복사하기" (inline copy of `weeklyReport(W)`, toast "주간 리포트를 복사했어요. Claude 프로젝트에 붙여 넣으세요") |
| `report:LW` | "지난주 리포트 아직 · 10분" (Monday only) | `S.tk['report:'+LW]` (the copy of `weeklyReport(LW)`: LW..LW+6 and `S.wk[LW]`) | 10 | 권장 | – | 6 | fold | "복사하기" (inline) |
| `set.read:D` | "용어 {nc}개 읽기" ("{M/D(요일)} 세트") | `st.read >= st.nc` ← `S.sp[d].read` (`set-open` 1342, `sessMarkRead` 723, `memoSeen` 860) | `nc − read` | 필수 | "일요일까지" | 2 | am / – / – | "시작" / "이어서" → `#set/D` ① scrolled to the first unread term |
| `set.quiz:D` | "세트 퀴즈 {nq}문" | `st.qa >= st.nq` ← `S.sp[d].quiz` (`set-quiz` 1353) | `nq − qa` | 필수 | "일요일까지" | 2 | noon | `#set/D` ② |
| `late:D` | "밀린 세트 {M/D(요일)}: 용어 a/b · 퀴즈 c/d" (gaps only) | read and quiz complete | gaps | 필수 | "일요일까지" | 2 | wd: noon, **oldest one only** (others only on 이번 주, "→ 토요일 따라잡기") / sat, holi: 따라잡기, all / sun: 밀린 핵심, all | `#set/D` at the first gap (read before quiz) |
| `hw.qz:D` | "퀴즈 틀린 {k}문제: 틀린 이유 한 줄" | each wrong i: `H['q'+i] >= 1`; the row exists only after every quiz item is answered and k>0 (D7); for a past set it appears on the day its quiz was finished (`S.cal[t].x['quiz:'+d]`, A §3.3). Finished after the freeze (the normal case), it enters the frozen 오늘 몫 by the dependent insert (§3.7 step 9b) | 2/문 | 필수 | "오늘만" | 3 | noon, right after the quiz (weekend: 따라잡기 / 밀린 핵심, right after that set's late row) | `#set/D` ③ focused on `qz` |
| `hw.say:D` | "새 용어 {F}개 소리 내어 말하기 {R.s}번" (meta "필수 {M.s}번", or "오늘은 {M.s}번까지") | target met: every fresh i `H['s'+i] >= target`; floor met at `M.s` | 0.5/회 | 필수 (floor) | "오늘만" | 3 | noon | ③ focused on `fresh` (말하기) |
| `hw.write:D` | "새 용어 {F}개 안 보고 쓰기 {R.w}번" (meta "필수 {M.w}번") | same with `w` | 3/개·회 | 필수 | "일요일까지" | 4 | eve | ③ focused on `fresh` (쓰기) |
| `hw.dd:D` | "단답 {M.dd}문제: 답안지 10분 → 첨삭" (sub = card title, e.g. "액상화 예비평가 (Preliminary assessment)") | first `M.dd` dd rows `H['dd'+i] >= 1` | 15/문 | 필수 (handwriting floor) | "일요일까지" | 4 | eve | ③ focused on `dd` |
| `hw.eo:D` | "논술 목차 옮겨 적기 {R.eo}번" (meta "필수 {M.eo}번") | `H.eo >= target` | 5/번 | 필수 | "일요일까지" | 4 | eve | ③ focused on `eo` |
| `hw.fg:D` | "그림·표 그리기 {R.fg}번" (meta "필수 1번") | `H.fg >= target` | 2/번 | 필수 phase 3 only (else part of 숙제 나머지) | "오늘만" | 4 | eve | ③ focused on `fg` |
| `essay:D` | "논술 실전 25분 → 첨삭" | `spGet(d).essay.done` (`set-essay-done` 1356 = `hw-ew` 1360) | 30 | phase 2 필수 (quota 5, min 3; contract line 8); phases 0–1 and 3 권장 (fold); phases 4–5: no row | phase 2: "일요일까지" | 4 / 6 | eve / fold | `#set/D` ④ |
| `hw.sl:D` | "자기 전 5분: 오늘 용어 떠올리기" | `H.sl >= 1` | 5 | 필수 | "오늘만" | 3 | bed | ③ focused on `sl` (or the "자기 전 5분" sheet with the 10 titles, §4.5) |
| `rev:D:step` | "세트 복습 {M/D(요일)} {step}일 차" (grouped: "세트 복습 {n}개") | the step is no longer due (`reviewDue` collapses missed steps) | `ceil(.5 × items)` ≈ 8 | wd: steps ≤3, **first 2 by due date (first+step) then step** 필수, the rest fold 권장; sat: ≤3 필수, 7+ 권장; sun: all 필수 | "다시 나와요" | 3 (7+: 5) | am / 따라잡기 / 밀린 핵심 (≤3), 복습 비우기 (7+) | "시작" → `startSetReview(D)`; a group chains |
| `cards:t` | "카드 복습 {k}장" ("세트 복습 뒤에 해요") | `S.tk['cards:'+t]` (a session started from this row graded ≥ min(20,k), counted in `SES.done`) or N = 0 | `ceil(k/2)` | wd 권장, sat/sun 필수 | "다시 나와요" | 5 | always after every due set review: planned only when no due set review is left out of today's plan (weekdays: otherwise it waits in 시간이 되면 right after "세트 복습 나머지"; weekends: otherwise "→ 내일 다시 나와요") / am, 따라잡기, 복습 비우기 | `startDueAll({k, skip})` |
| `wrong:t` | "오답 다시 풀기 {n}개" | `wrongList()` minus today's set `Q:` items is empty, or `S.tk['wrong:'+t]` (a 오답 session with `enough(SES)`, §8.1 D3) | `min(10, n)` | 필수 Fri and Sun (P3), else 권장 (P6) | "다시 나와요" | 3 / 6 | noon / 따라잡기 / 복습 비우기 (after reviews and cards) | `startWrong({skipQ:t})` |
| `q.dd:W` · `q.eo:W` · `q.w:W` · `q.essay:W` · `q.redo:W` · `q.fg:W` | "단답 손글씨 {k}문" / "논술 목차 옮겨 적기 {k}번" / "새 용어 안 보고 쓰기 {k}개" / "논술 실전 {k}편" / "모의 오답 다시 쓰기 {k}편" / "그림·표 그리기 {k}번"; sub = the sets, e.g. "10/26(월) · 10/27(화) · 10/28(수)" (`q.redo`: "지난 모의 틀린 문제") | the listed sets' floor parts complete (`q.redo`: one `x.redo:t:j` tick per unit). Phase 4's 카드 돌리기 has no quota row: on Sat/Sun, while contract line 11 is short, the day plans its own `x.rot:t` "카드 50장 돌리기" (필수, 복습 비우기 / 따라잡기) | 15 / 5 / 3 / 30 / 25 / 2 per unit | 필수 | "일요일까지" | 4 | sat 따라잡기 (≤ half) / sun 손글씨 몫 (rest) / holi 따라잡기 (≤ half); only the quotas of the current phase's contract (§3.8 phase table); order: phase 1 단답 → 목차 → 쓰기; phase 2 논술 → 단답 → 목차 → 쓰기; phase 3 다시 쓰기 → 단답 → 그림; phase 4 다시 쓰기 → 단답 | `#set/<oldest gap set>` ③ focused (`q.redo`: manual "다 썼어요") |
| `x.outline:t` | "논술 목차 떠올리기 3문" (phases 2–3: "…5문"; phase 4: "기출 목차 외우기 5문") | ≥3 (5) of `S.essayStat[id].last === t` | 10 / 15 | phase 1 권장 fold; phases 2–4 필수 | "오늘만" | 6 / 4 | fold / noon | `startOutline()` (this week's units) |
| `x.dd2:t` | "단답 1문제 더" | `S.tk['x.dd2:'+t]` (manual; also ticked by "다 썼어요" on a `ddRandom` 답안지 opened from this row) | 15 | 권장 | – | 6 | fold | `ddRandom()` (1219) |
| `x.book:t` | "교재 단원 읽기·서브노트 60분" | `S.tk['x.book:'+t]` (manual) | 60 | 권장 | – | 6 | fold | check |
| `gq:D` | "용어 퀴즈 이어 풀기 · {a}/{n}문" | – (여유) | 5/회 | 여유 | – | 7 | fold | `startGq(D,'next')` |
| `new:t` | "새 카드 {n}장" | `newRoom()===0` or no new cards in range | 0.7/장 | 여유 | – | 7 | fold | `start-study` (new cards in range) |
| `hw.rest:D` | "숙제 나머지 · 약 {m}분" (rev, fg, mn, set-only tasks; **`ew` excluded**) | those items done | their minutes | 권장 | – | 6 | fold | `#set/D` ③ with "더 하기" open |
| `carry.sets:W` | "지난주 세트 읽기·퀴즈 {k}개" ("10/30(금) · 10/29(목) · 10/28(수)") | their core complete | gaps | 권장 (not in the score) | "이번 일요일까지" | 6 | wd fold / sat 따라잡기 after this week's items | oldest set's first gap |
| `carry.mock:D` | "지난주 모의고사 이어 쓰기 · {M/D}" | parts written | part minutes | 권장 | "토요일 새 모의 전까지" | 6 | a fold row on **every** day it exists and **never the active row**; on Sat/Sun a newly arrived mock replaces it; with no new mock (a failed job, or the exam-day weeks) it stays the same 권장 fold row through the weekend | `#mock/D` |
| `kichul:W` | "다음 주 단원 기출 훑기" | `S.tk['kichul:'+W]` (opening `#kichul/u/<a unit of next week>` on Sat/Sun, or manual) | 20 | 권장 | – | 6 | sun 주간 마감 | `#kichul/u/<first unit of next week>` |
| `goal:W:i` | "이번 주 목표 {g}/{n}" (one row) | `S.tk['goal:'+W+':'+i]` | 20 each | 권장 | "일요일까지" | 6 | sun 주간 마감 fold; checklist on 이번 주 | `#week` scrolled to 목표 |
| `backup` | "백업 파일 저장 · 마지막 {n}일 전" | `S.tk.backup >= t−13` | 2 | 권장 | – | 7 | sun 주간 마감 fold (≥14 days) | `#backup` |
| phase extras (`PE_EXTRA`, §3.6) | e.g. "지난 모의 틀린 1문제 다시 쓰기 25분", "카드 50장 돌리기", "준비물 점검: 검은 볼펜·자·시계·신분증·수험표·간식" | as listed in §3.6 | as listed | as listed | as listed | 4 / 6 | as listed | as listed |

Info rows (not numbered, no done state): "오늘 세트를 기다리는 중" / "평일 06:21에 만들기 시작해 보통 30분 안에 와요." with secondary "지금 받아 오기"; "주간 모의고사를 기다리는 중" / "토요일 06:21에 만들기 시작해요." with "지금 받아 오기"; after 09:00 without the set: "오늘 세트가 아직 없어요 · 이번 주 지난 세트부터 해요". When nothing at all can be planned, the no-rows card of §4.5 replaces these info rows.

**One card number everywhere.** `cardsOut(t)` = `dueCards(null)` minus the cards of the set reviews in today's frozen plan (`setIds`) minus cards with `pget(id).last === t`. 복습 and 연습 show **N = `cardsOut(t).length`** ("카드 복습 14장" in the screenshot state); Today's row shows today's portion **k = min(N, 30 on weekdays, 60 on weekends)** and never the raw queue (no "대기 77장"). Optional 7+ reviews that are not in today's plan do not hide their due cards.

### 3.5 Homework → tasks, without double counting

| `hwItems` key (phase 1, `PE_HW[1]`) | Floor (`PE_HW_MIN[1]`) | Today row | Extra circles |
|---|---|---|---|
| `fresh` "새 용어 4개: 안 보고 쓰기 2번, 소리 내어 말하기 4번" | 쓰기 1번, 말하기 2번 per term | `hw.write` (target 2번 at level 0), `hw.say` (target 4번) | 쓰기 2번째, 말하기 3·4번째 (planned at level 0, else 숙제 card only) |
| `rev` "복습 용어 6개: 제목만 보고 키워드 백지 복원" | – | – | `hw.rest` |
| `eo` "논술 목차 옮겨 적기 4번" | 2번 | `hw.eo` (target 4번 at level 0) | 3·4번째 |
| `ew` "논술 실전 쓰기 25분 → 사진 찍어 첨삭" | – (phase 2: 1) | `essay:D` (fold in phases 0–1 and 3; no `ew` item in phases 4–5) | – |
| `fg` "그림·표 그리기 3번" | – (phase 3: 1) | (phase 3: `hw.fg`) | `hw.rest` |
| `dd` "단답 1문제: 답안지에 10분 쓰기 → 첨삭" | 1 | `hw.dd` | – |
| `qz` "퀴즈 틀린 문제: 해설 2번 읽고 틀린 이유 한 줄" | all wrong ones | `hw.qz` | – |
| `mn` "앞글자로 외우기 1개 만들기" | – | – | `hw.rest` |
| `sl` "자기 전 5분: 오늘 용어 제목만 보고 떠올리기" | 1 | `hw.sl` | – |
| `x` set-only tasks (`sp.tasks[i]`) | – | – | `hw.rest` (a duplicate drawing is merged into `fg`, rule 6) |

Rules:
1. The record is always the existing circle `sp.hw[key]` (`hw` 1358). `hwItems` 417, `hwSum` 437, `PE_HW` and `setStatus().done` are unchanged; a Today row and the 숙제 card read the same circles, so one tap moves both.
2. **One row per exercise.** Its floor = the first `PE_HW_MIN` circles; its target = the full `PE_HW` count on a level-0 day the user did not shorten, the floor otherwise. B, the score and quotas count floors only; the extra circles are never debt.
3. `sp.essay.done` has one task, `essay:D`. The 숙제 `ew` card shows the same record ("논술 탭에서 쓰기 ›") and its duplicate timer/copy buttons go; `hw.rest` minutes exclude `ew` (one row owns those 30 minutes).
4. Past sets' floors appear only inside quota rows (`d < t`, Sat/Sun/holidays); today's set only in its own rows; the same counter never shows twice on one day.
5. `hw.qz` (write the reason, `sp.hw.q<i>`) and `wrong:t` (answer again until two in a row, `S.wrong`) are different acts with different records. The day's `wrong:t` session skips today's set `Q:` items; a 오답 session started from 복습 still includes them.
6. **Duplicate drawing, write-through** (B rule 7): `figDup(d,i)` is true when `s.tasks[i]` matches `/그리|그림|그려|도$/` and shares ≥3 word stems (≥2 characters, `glStem`) with `essay.fig`. The set-only card is not shown; the `fg` card shows "세트 숙제 항목과 같은 그림이에요"; filling the last `fg` circle also sets `sp.tasks[i]=true`, taking one away clears it. `hwItems`, `hwSum`, `setStatus` keep their outputs. On `data/`: hides the 10/29 (액상화 평가 흐름도) and 10/30 (다짐횟수–지능형 다짐값 곡선) tasks, keeps 10/26 (e-log P 곡선) and 10/27 (표 정리).
7. A pending `qz` (quiz not finished) is in neither "필수 a/b" nor the minutes; the card says "퀴즈를 다 풀면 틀린 문제가 여기 나와요." (D7).
8. Mock essays count only in the mock part of the score, never in 손글씨.
9. `hwMin(d)` = `PE_HW_MIN[phaseObj(w).id]` for the set's own week (`s.week`, the rule of `hwRule` 416; `phaseKey` returns 'prep'/1–4/'exam', so the lookup goes through `phaseObj(w).id` 0–5), each count capped with `Math.min` at `hwRule(d)`.
10. **A floor becomes a "일요일까지" quota only in the phases whose contract has its line** (§3.8 phase table): 쓰기 and 목차 in phases 1–2, 단답 in phases 1–4, 논술 실전 in phase 2, 그림·표 in phase 3. In the other phases the floor still marks the circles and plans today's row, but the row is "오늘만" and never carries (phase 3–4 쓰기·목차; `fg` outside phase 3). Sets of `pre3` days have no 숙제 rows and contribute 0 to every quota target.

Phase-1 floors per weekday set: 말하기 4 + 쓰기 12 + 단답 15 + 목차 10 + 자기 전 5 = 46 min (+2 per wrong quiz answer). Full academy counts add 말하기 +4, 쓰기 +12, 목차 +10 = +26 on level-0 days. The rest of the 135–150-minute 숙제 (`hwSum`) stays in 시간이 되면.

### 3.6 Routine → tasks (every `PE_ROUTINES` line, every phase; no tick, no double count)

`PE_EXTRA` keys are stable strings; `PE_ROUTINES` keeps its order and is read only for old dates (`isActive`, `calItems`) and the 로드맵 reference fold. "auto" = done from an existing record; "manual" = `S.tk`.

| Phase · day | Routine line (abridged) | Becomes |
|---|---|---|
| prep wd | 세트 열어 용어 10개 읽기 · 준비 주 목표 하나 · 복습 대기 0 · 저녁 단답 1문제 | `set.read` · `goal:W:i` (권장) · `cards` · `hw.dd` |
| prep sat | 진단 모의 100분 · 채점 → 점수 기록 | `mock:D:p1` · `mock.g:D` (+ `sc`) |
| prep sun | 다시 볼 세트·오답 · 1주차 단원 카드 미리 훑기 · 주간 시간표 확정 | `rev` + `wrong` · `kichul:W` (권장) · `budget` "하루 공부 시간 정하기" (필수, auto when 설정 budget is saved → `S.tk.budget`) |
| 1 wd | 아침 용어 10 읽기 · 출근길 복습 대기 0 · 점심 세트 퀴즈 + 오답 · 퇴근길 목차 회상 3 · 저녁 교재 60분 · 저녁 단답 2문제 | `set.read` · `rev` (2 필수) + `cards` (권장) · `set.quiz` + `wrong` (Fri 필수) · `x.outline` 3 (권장, auto) · `x.book` (권장, manual) · `hw.dd` (1 필수) + `x.dd2` (권장) |
| 1 sat | 모의고사 타이머 켜고 풀기 · 논술 2문제 25분×2 · 첨삭 → 서브노트 · 복습 대기 0 | `mock:D:p1` · `mock:D:p2` · `mock.g:D` · `cards` (필수) |
| 1 sun | 다시 볼 세트(1·3·7일) · 오답 노트 0 · 주간 리포트 · 다음 주 단원 기출 훑기 | `rev` (all 필수) · `wrong` (필수) · `report:W` · `kichul:W` (권장) |
| 2 wd | 세트 확인 · 복습 대기 0 · 세트 퀴즈 + 오답 · 목차 회상 5 · 세트 논술 25분 · 첨삭 → 고친 답안 30분 | `set.read` · `rev` + `cards` · `set.quiz` + `wrong` · `x.outline` 5 (필수, auto) · `essay:D` (필수) · `x.fix:D` "첨삭 받은 논술 고쳐 쓰기 30분" (권장, manual, next study day after `essay:D`) |
| 2 sat | 모의(2교시 분량) 100분 · 채점 → 복기 · 복습 대기 0 | `mock:D:p*` · `mock.g:D` · `cards` |
| 2 sun | 다시 볼 세트·오답 · 지난주 모의 오답 1문제 다시 쓰기 25분 · 주간 리포트 · 다음 주 기출 목차 10개 암송 | `rev` + `wrong` · `redo:W` "지난주 모의 틀린 1문제 다시 쓰기 25분" (필수, manual, 손글씨 몫 first) · `report:W` · `kichul:W` "다음 주 단원 기출 목차 10개 외우기" (권장) |
| 3 wd | 세트 확인 · 약점 단원 카드 25분 · 수치 빈칸 10문 · 목차 회상 5 · 전날 모의 오답 1문제 다시 쓰기 25분 · 그림·표 1개 2분 안에 | `set.read` · `cards` (sub "약점 단원 먼저", ordered by unit accuracy) · `x.cloze` (권장, auto: Σ today's `S.log` cloze ≥10) · `x.outline` 5 (필수) · `x.redo:t` (필수, manual; contract line 9) · `hw.fg` (필수 1번; line 10) · the set essay → `essay:D` 권장 (fold) |
| 3 sat | 1·2교시 모의(100분×2) · 채점 → 복기 노트 · 복습 대기 0 | `mock:D:p1`, `p2` · (`mock.g:D` on Sunday after p4) · `cards` |
| 3 sun | 3·4교시 모의 · 채점 → 복기 노트 · 주간 리포트 · 점수 추이 기록 | `mock:D:p3`, `p4` ("3교시 논술", "4교시 논술") · `mock.g:D` · `report:W` · `x.trend` "모의 점수 적기" (권장, auto when `S.mockp[D].sc` has a number) |
| 4 wd | 전 범위 카드 회전 50장 · 기출 목차 암송 5 · 오답 1문제 다시 쓰기 25분 · 압축 요약 2장 · 수면 7시간 | `x.rot` "카드 50장 돌리기" (필수, auto `S.daily[t].graded >= 50`, start `startRot(50)` = due cards then least-recent seen) · `x.outline` "기출 목차 외우기 5문" (필수) · `x.redo:t` (필수) · `x.sum2` "압축 요약 2장 읽기" (권장) · block note "수면 7시간" |
| 4 sat | 모의 1회 · 채점 → 복기 · 복습 대기 0 | `mock:*` · `mock.g:D` · `cards` |
| 4 sun | 반나절 휴식 · 압축 요약 16장 통독 · 다음 주 준비물·일정 점검 | header note "반나절은 쉬어요" · `sum16:W` (권장, 90) · `prep:W` "다음 주 준비물·일정 점검" (권장, 10) |
| exam wd (`pre3`) | 새로 배우지 않기 · 수면 7시간 · 준비물 점검 · 시험일 요령 | `set.read` + `set.quiz` only (no 숙제 rows, quotas off) · `x.rot` "카드 30장 돌리기" (필수) · `x.outline` 5 (필수) · `kit:t` "준비물 점검: 검은 볼펜·자·시계·신분증·수험표·간식" (필수 Friday) · note "수면 7시간" |
| exam sat | 시험 당일 — 교시마다 시간표대로 | exam card: `ex:t:i` checklist + "응시했어요"; note "문제 고르기 3분 → 시간 엄수 → 공란 금지" |
| exam sun | 복기 기록, 면접 준비 계획 | `recap:R` (P0 pin) |

The table as data (`data_plan.js`; `k` is the stable task-id prefix, the date or week is appended):

```js
window.PE_EXTRA={
  prep:{wd:[{k:'goal',t:'이번 주 목표 하나 처리',min:20,need:'권장',to:'week'}],
        sun:[{k:'kichul',t:'다음 주 단원 기출 훑기',min:20,need:'권장',blk:'close',auto:'kichul'},
             {k:'budget',t:'하루 공부 시간 정하기',min:5,need:'필수',blk:'close',to:'settings',auto:'budget'}]},
  1:{wd:[{k:'x.outline',t:'논술 목차 떠올리기 3문',min:10,need:'권장',auto:'outline3',to:'start-outline'},
         {k:'x.book',t:'교재 단원 읽기·서브노트 60분',min:60,need:'권장'},
         {k:'x.dd2',t:'단답 1문제 더',min:15,need:'권장',to:'dd-rand'}],
     sun:[{k:'kichul',t:'다음 주 단원 기출 훑기',min:20,need:'권장',blk:'close',auto:'kichul'}]},
  2:{wd:[{k:'x.outline',t:'논술 목차 떠올리기 5문',min:15,need:'필수',blk:'noon',auto:'outline5',to:'start-outline'},
         {k:'x.fix',t:'첨삭 받은 논술 고쳐 쓰기 30분',min:30,need:'권장',after:'essay'}],
     sun:[{k:'redo',t:'지난주 모의 틀린 1문제 다시 쓰기 25분',min:25,need:'필수',blk:'hand'},
          {k:'kichul',t:'다음 주 단원 기출 목차 10개 외우기',min:20,need:'권장',blk:'close',auto:'kichul'}]},
  3:{wd:[{k:'x.outline',t:'논술 목차 떠올리기 5문',min:15,need:'필수',blk:'noon',auto:'outline5',to:'start-outline'},
         {k:'x.cloze',t:'수치 빈칸 10문',min:5,need:'권장',auto:'cloze10',to:'start-cloze'},
         {k:'x.redo',t:'지난 모의 틀린 1문제 다시 쓰기 25분',min:25,need:'필수',blk:'eve'}],
     sun:[{k:'x.trend',t:'모의 점수 적기',min:2,need:'권장',blk:'close',auto:'score'}]},
  4:{wd:[{k:'x.rot',t:'카드 50장 돌리기',min:25,need:'필수',blk:'am',auto:'graded50',to:'start-rot'},
         {k:'x.outline',t:'기출 목차 외우기 5문',min:15,need:'필수',blk:'noon',auto:'outline5',to:'start-outline'},
         {k:'x.redo',t:'틀린 1문제 다시 쓰기 25분',min:25,need:'필수',blk:'eve'},
         {k:'x.sum2',t:'압축 요약 2장 읽기',min:20,need:'권장'}],
     sun:[{k:'sum16',t:'압축 요약 16장 통독',min:90,need:'권장',blk:'close'},
          {k:'prep',t:'다음 주 준비물·일정 점검',min:10,need:'권장',blk:'close'}]},
  pre3:{wd:[{k:'x.rot',t:'카드 30장 돌리기',min:15,need:'필수',blk:'am',auto:'graded30',to:'start-rot'},
            {k:'x.outline',t:'논술 목차 떠올리기 5문',min:15,need:'필수',blk:'noon',auto:'outline5',to:'start-outline'},
            {k:'kit',t:'준비물 점검: 검은 볼펜·자·시계·신분증·수험표·간식',min:10,need:'필수',blk:'eve',dow:5}]}};
// auto: outline3/5 = ≥3/5 of S.essayStat[id].last===t; cloze10 = Σ today's S.log type 'cloze' total ≥10;
//       graded50/30 = S.daily[t].graded ≥50/30; kichul = S.tk['kichul:'+W]; budget = S.tk.budget; score = S.mockp[D].sc has a number.
// Rows without auto are manual: S.tk[k+':'+t] (day rows) or S.tk[k+':'+W] (Sunday/week rows). 권장 rows without blk live in 시간이 되면.
```

`chk` 1339 stays as dead-safe code; nothing writes `S.checks` any more. `isActive` 365 still reads old ticks; `calItems` 1037 (tick line 1042) still shows them as history; `checkRate` is no longer used by 통계 or the report.

### 3.7 Selecting, fitting and freezing "오늘 몫"

**Priority** (keep from the top; drop from the bottom):

| P | What |
|---|---|
| 0 | dated: 원서접수 window, 48시간 복기, exam checklist |
| 1 | this week's mock parts and 채점; 주간 리포트 on Sunday |
| 2 | set core: today's set first on weekdays, oldest first on weekends |
| 3 | 세트 복습 1·3일 차 (oldest due first); 오답 on Fri/Sun; today's habits (말하기, 틀린 이유, 자기 전) |
| 4 | handwriting: today's 쓰기 · 단답 · 목차, then the phase's quotas in the order of §3.4 (phase 1 단답 → 목차 → 쓰기; phase 2 논술 first; phases 3–4 다시 쓰기 first); phase extras marked 필수 |
| 5 | 세트 복습 7·14·30일 차; 카드 복습 |
| 6 | 권장 (fold rows, 오답 on other days, carried items) |
| 7 | 여유 (용어 퀴즈, 새 카드, 백업) |

**Steps** (`dayPlan(t, {now, user})` is pure; `planToday(t)` freezes it):

1. **Capacity.** `capToday = budgetOf(t)`; `leftNow = max(0, DAY_END − minutes(now))`; `capLeft = max(0, min(capToday − doneMin, leftNow))`. When the user chose "오늘 시간" (`S.today.user` = 30/60/90), that number means "from now": `capLeft = min(user, leftNow)`. `capLeft` is used **only to fit rows** (steps 6–7); it never enters the level (step 3).
2. **Candidates** = `taskList(t)` minus done, info, fold and `onlyWeek` rows (weekday late sets other than the oldest).
3. **Level** `lv = weekBoard(t).lv` (§3.8), computed from the clock-independent capacity `C = max(0, budgetOf(t) − doneMin) + Σ budgetOf(d)` over the remaining days to Sunday — never from `capLeft`, the clock or `S.today.user` — and fixed in `S.today.lv` at freeze time (no flapping when finished work lowers B). So a first open at 22:30, or "1시간" on a Saturday, plans a short day at the week's real level (computed: Sat 10/31 08:00 with "1시간" stays level 1 and leaves `S.wk[W].cut` false, §3.11).
4. **Level rules.** lv ≥1: 권장 rows fold. lv ≥2: the targets of contract lines 3–5 and 8–11 are cut (§3.8; ratchet `S.wk[W].cut`, set only by a freeze whose `capLeft` did not come from `S.today.user`), 7·14·30 reviews become 권장 ("일요일에 못 하면 다음 주로 넘겨도 돼요"), cards ≤30 a day, carried sets dropped. lv 3: quotas beyond the floor unit, 7·14·30 reviews, cards and 오답 are released ("놓아준 것"); mock, 채점, late core, reviews 1·3, today's habits, report and the floor stay.
5. **Targets.** Homework rows target the academy count when `lv===0 && !S.today.user`, else the floor.
6. **Always in** (regardless of minutes): P0; P1 (on a weekend day the user shortened below a mock part's minutes, that part moves: "→ 내일(일) 밀린 핵심"); today's set 용어 읽기 + 세트 퀴즈; the **handwriting floor unit**; 자기 전 (when today has a set). The handwriting floor = today's `hw.dd`, else one unit of the oldest 단답 quota (taken from that quota row, not added beside it), else satisfied by any planned mock paper or phase ≥2 essay. Every study day keeps it at every level.
7. **Fill** the rest by (P, block order, row order) while minutes fit `capLeft`:
   - a full-count homework row that does not fit is tried at its floor ("오늘은 2번까지");
   - a quota row takes **whole sets, oldest first** (never splits one set's part); on Saturday and holidays it takes at most `ceil(remaining/2)` units (B's rule: the mock already used 150 minutes of handwriting), on Sunday all that fit;
   - within a set, read comes before quiz: a quiz is never planned without its read (late rows hold both; today's read is always in);
   - 카드 복습 is taken only when every due set review is already in the plan (set reviews before 카드 복습 before 오답, rule E1); otherwise it waits behind "세트 복습 나머지" (weekdays, 시간이 되면) or moves "→ 내일 다시 나와요" (weekends);
   - level 3 keeps late core gaps of ≤5 minutes regardless, then the oldest first while they fit (the 3 newest carry one more week anyway, §3.9).
8. **Grouping** for display: 2+ `rev` rows in one block → "세트 복습 {n}개 · 약 {m}분" (sub = dates and steps, progress a/n); 2+ `late` rows → "밀린 세트 {n}개"; "시작" runs the first, the end screen chains to the next.
9. **Freeze** into `S.today`. The freeze waits for the day's data until 09:00 (weekday: today's set; Saturday: the mock); before that the list is computed live and not stored. After the freeze the list changes only through these triggers, and nothing else:

   | Trigger | What happens |
   |---|---|
   | `sig` change (today's set or this week's mock arrives, or this week's set count changes) | **merge**: every frozen row stays (done and undone, order and `m`); new rows are fitted into `capLeft` minus the remaining frozen minutes; the new set's always-in rows are added in any case |
   | "오늘 시간" (`cap-set`); a budget change in 설정; a schedule change (`sch-save` 1466, `sch-round-set` 1469, `sch-round-reset` 1470 — every `recalcPlan()` call except init and the rebuild row); "오늘 몫 다시 짜기" (`plan-reset`) | **re-plan**: the done frozen rows stay where they are (order and `m`), only the undone rows are selected again from fresh candidates with the new `capLeft`; `doneMin` carries over. "오늘 몫 다시 짜기" keeps `S.today.user` and clears `UI.later`. A schedule change also drops undone ids that are no longer candidates (another phase's extras, a moved exam day) and clears `S.wk[W].cut` when `phaseObj(w).id !== S.wk[W].cph` |
   | a new date; `v !== PLAN_V` (app update); restore 1474; reset 1475 | **rebuild**: `S.today=null` (a restore brings another day's or device's plan; reset starts from `fresh()`) |

   9b. **Dependent insert** — the only addition after the freeze, and not regrowth: when a frozen `set.quiz:D` or `late:D` row completes with k>0 wrong answers and no `hw.qz:D` row exists yet, `planToday` splices `{id:'hw.qz:'+D, m:2k, tgt:null, blk:<the parent's blk>, dep:<parent id>}` into `S.today.rows` right after its parent and saves; the status count rises by one. It goes in even when the minutes exceed `capLeft` (two minutes per wrong answer, rolled "오늘만", the one day the academy item counts).
10. **Not fitting.** 필수 rows go to "다른 날로 옮긴 것" with a destination (table below); 권장 rows go to 시간이 되면.
11. **Minutes done today** (`doneMin`) = Σ over frozen rows of (frozen `m` − remaining minutes), ≥0. Done rows survive every merge and re-plan (step 9), so `doneMin`, `capLeft` and "오늘 몫 끝 · 약 X 했어요" stay right. The status line counts down ("남은 9개 · 약 1시간 10분").
12. **After the portion is done**: the "오늘 몫 끝" card; 시간이 되면 opens with up to 2 "미리 하기" rows first (the week's earliest required work, tagged "일요일까지"), then 권장. They never become 오늘 몫 rows and never count in the status line (no regrowth; the dependent row of step 9b is the only post-freeze addition).

**최소 몫** (what "30분" plans; always fits):

| Day | 최소 몫 |
|---|---|
| weekday / holiday / `pre3` with today's set | 용어 읽기 + 세트 퀴즈 + 단답 1문 + 자기 전 5분 (≈35분) |
| weekday before the set arrives | 세트 복습 1·3일 차 1개 (+ after 09:00: 단답 1문 from this week's oldest gap) |
| Saturday | 주간 모의고사 1교시 when `capLeft ≥ 100`; otherwise every mock part that fits (e.g. "1시간": 2교시 논술 2문 50분) + 밀린 세트 1개, the parts that do not fit → "내일(일) 밀린 핵심"; when no part fits ("30분"), 밀린 세트 1개 + 단답 1문 |
| Sunday | 주간 리포트 + 단답 1문 (+ the unwritten mock part if it fits) |

**Destinations** of required rows that do not fit (exact text after "→ "):

| Row kind | Mon–Fri | Saturday | Sunday |
|---|---|---|---|
| set core (today's or late) | "토요일 따라잡기" | "내일(일) 밀린 핵심" | "다음 주 '지난주 세트'" (the 3 newest) / "다음 주로 놓아줘요" |
| handwriting (쓰기, 단답, 목차, 논술, quotas) | "토요일 따라잡기" | "내일(일) 손글씨 몫" | "다음 주로 놓아줘요" |
| 세트 복습, 카드 복습, 오답 | "내일 다시 나와요" | "내일 다시 나와요" | "내일 다시 나와요" |
| 오늘만 habits | "오늘만이라 놓아줘요" | same | same |
| mock part, 채점 | – | "내일(일) 밀린 핵심" | "다음 모의 전까지" (weekday 시간이 되면) |

### 3.8 Weekly contract, B and C, levels, score

**Contract** (`weekBoard(t)`, memoized per render by a counter bumped synchronously in `save()`; phase 1 shown, every phase in the next table):

| # | Line (exact label) | Target, fixed from Monday | Done | B minutes |
|---|---|---|---|---|
| 1 | "세트 핵심(용어 읽기·세트 퀴즈)" | this week's expected weekday sets (5; a past weekday without a set drops out) | sets with read and quiz complete | gaps of arrived sets + `PE_EST.core` (15) per expected set |
| 2 | "주간 모의고사 + 채점" | parts + 채점; until it arrives, the phase estimate, shown "토 06:21에 와요" | parts written + graded | unwritten part minutes + 30 if not graded (`estMock(w)` before arrival: 180 in phase 1) |
| 3 | "단답 손글씨" | Σ `M.dd` of expected sets (5) | Σ done floors | 15 per unit |
| 4 | "논술 목차 옮겨 적기" | Σ `M.eo` (10) | Σ min(eo, `M.eo`) | 5 |
| 5 | "새 용어 안 보고 쓰기" | Σ fresh × `M.w` (20) | Σ min(w, `M.w`) | 3 |
| 6 | "세트 복습(이번 주에 돌아오는 것)" | (set, step) pairs due Mon–Sun: sets first opened before Monday, plus this week's sets (unopened ones forecast as opened today, not-yet-arrived ones on their own day) | pairs done | 8 × (reviews due now, collapsed per set, + at most one forecast step per set by Sunday) |
| 7 | "주간 리포트(일)" | 1 | `S.tk['report:'+W]` | 10 |

**Contract by phase.** Each line exists only in the phases listed; its target is fixed from Monday (expected sets, the mock or its estimate, forecast review pairs). `M` = `hwMin(d)` of each expected set (sets of `pre3` days count 0 in lines 3–5 and 8–10).

| # | Line (exact label) | Phases | Target | Done | B minutes | Level-2 cut | Score key (`PE_SCORE`) |
|---|---|---|---|---|---|---|---|
| 1 | "세트 핵심(용어 읽기·세트 퀴즈)" | 1–4 | expected weekday sets | read and quiz complete | gaps + `PE_EST.core` per set not here yet (`coreExam` 10 on `pre3` days) | – | `core` |
| 2 | "주간 모의고사 + 채점" | 1–4 | the mock's parts + 채점 (`estMock(w)` until it arrives; 0 in the exam-day weeks) | parts written + graded | unwritten part minutes + 30 | – | `mock` |
| 3 | "단답 손글씨" | 1–4 | Σ `M.dd` (phase 1: 5 · 2: 5 · 3: 10 · 4: 5) | Σ min(dd circles, `M.dd`) | 15 per unit | × 0.6 | `hw.dd` |
| 4 | "논술 목차 옮겨 적기" | 1–2 | Σ `M.eo` (1: 10 · 2: 5) | Σ min(eo, `M.eo`) | 5 | × 0.6 | `hw.eo` |
| 5 | "새 용어 안 보고 쓰기" | 1–2 | Σ fresh × `M.w` (1: 20 · 2: 15) | Σ min(w, `M.w`) | 3 | × 0.6 | `hw.w` |
| 6 | "세트 복습(이번 주에 돌아오는 것)" | 1–4 | (set, step) pairs due Mon–Sun | pairs done | 8 × (due now + ≤1 forecast step per set) | 7+ → 권장 | `rev` |
| 7 | "주간 리포트(일)" | 1–4 | 1 | `S.tk['report:'+W]` | 10 | – | `close` (0.6 report + 0.4 ticked goals ÷ goals) |
| 8 | "논술 실전 25분" | 2 | 5 | sets with `essay.done` | 30 | 3 | `hw.essay` |
| 9 | "모의 오답 다시 쓰기" | 3–4 | 5 (one per weekday) | `S.tk` keys `x.redo:<date>` and `x.redo:<date>:j` with the date in W | 25 | 3 | `hw.redo` |
| 10 | "그림·표 그리기" | 3 | Σ `M.fg` (5) | Σ min(fg, `M.fg`) | 2 | × 0.6 | `hw.fg` |
| 11 | "카드 50장 돌리기" | 4 | 5 days | days in W with `S.daily[d].graded ≥ 50` | 25 per missing day, at most the days left | 3 | `rot` (ratio days/5) |

- Score keys by phase (weights sum to 100 in each): phase 1 core 25 ← 1 · mock 25 ← 2 · hand 30 = dd 12 ← 3 + eo 9 ← 4 + w 9 ← 5 · rev 15 ← 6 · close 5 ← 7; phase 2 core 20 · mock 20 · hand 40 = essay 20 ← 8 + dd 10 ← 3 + w 5 ← 5 + eo 5 ← 4 · rev 15 · close 5; phase 3 core 10 · mock 35 · hand 35 = redo 20 ← 9 + dd 10 ← 3 + fg 5 ← 10 · rev 15 · close 5; phase 4 core 10 · mock 20 · hand 25 = redo 15 ← 9 + dd 10 ← 3 · rot 30 ← 11 · rev 10 · close 5. Phase 0 uses phase 1's table; phase 5 and the week containing `PLAN.mock.d` or `PLAN.target.d` show the checklist instead of a score (they keep lines 1, 6 and 7 for B and the level).
- Not contract lines (rolling or today-only; never in B or the score): cards, 오답, 말하기, 틀린 이유, 자기 전, `x.outline`, phase 2's Sunday `redo:W` and `x.fix`, `x.cloze`, `x.sum2`, the `pre3` rows, and the phase 3–4 쓰기·목차 floors.

- **B** = Σ B minutes of the current phase's lines. **C** = `max(0, budgetOf(t) − doneMin) + Σ budgetOf(d)` over the remaining days to Sunday: the week's capacity by budget, independent of the clock and of "오늘 시간" (`capLeft` only fits today's rows, §3.7 steps 1 and 3). "남은 시간 Y" on 오늘 and 이번 주 shows this C; today's clock shows only in 오늘's own status line ("남은 몫 약 1시간 37분 · 남은 시간 약 1시간", §4.1).

| Level | r = B/C | Effect | Sentence (exact) |
|---|---|---|---|
| 0 보통 | ≤ 0.8 | 필수 + 권장, academy counts as targets | – |
| 1 빠듯 | ≤ 1.0 | 권장 folds into 시간이 되면; homework rows target the floor | "빠듯해요 · 권장은 접어 두었어요" |
| 2 넘침 | ≤ 1.5 | §3.7 step 4 (quotas × 0.6, 7+ → 권장, cards ≤30) | "줄인 목표 · 남은 시간에 맞췄어요" |
| 3 핵심만 | > 1.5 | §3.7 step 4 (release) | "핵심만 · 다음 주에 새로 시작해요" |

- The level is fixed into `S.today.lv` at freeze; the 이번 주 views show the live value. The level-2 cut is a **ratchet**: once a freeze happens at level ≥2, `S.wk[W].cut=true` and the cut targets (labelled "(줄인 목표)", e.g. "단답 손글씨 1/3 (줄인 목표)") stay for the rest of that week, so finishing work never raises a target back. Only a freeze whose `capLeft` did not come from `S.today.user` sets it (a shortened day never cuts the week); it records `S.wk[W].cph = phaseObj(w).id`, and a schedule change that moves week W into another phase clears it (§3.7 step 9). Cut targets: lines 3–5 and 10 × 0.6 (ceil), lines 8, 9 and 11 → 3.

**Score** "이번 주 n%" (`PE_SCORE` by phase; phase 1 shown):

| Part | Max | Ratio |
|---|---|---|
| 세트 핵심 | 25 | per expected set ½·min(1, read/nc) + ½·min(1, qa/nq), averaged over the expected sets |
| 모의고사 | 25 | 0.8 × written part minutes ÷ all part minutes + 0.2 × graded (only for `D >= MOCK_GRADE_SINCE`; else 1.0 × the written share) |
| 손글씨 | 30 | 12 × min(1, 단답 done/target) + 9 × min(1, 목차 …) + 9 × min(1, 쓰기 …) ÷ 30 (cut targets after the ratchet); other phases: Σ `PE_SCORE[ph].hw[k]` × min(1, done/target) over the phase's hand lines ÷ the hand weight |
| 세트 복습 | 15 | each contract pair: done by due+1 → 1, later → ½, not done → 0; averaged |
| 주간 마감 | 5 | 0.6 × report + 0.4 × ticked goals ÷ goals |

- Score = Σ weight × ratio ÷ Σ weights of the parts that apply. **Every target exists from Monday**, so done work only ever raises the number; a part is only removed when it cannot happen (no mock this week, no expected sets, no review pairs), which can only raise it. Verified day by day in §3.13.
- **"다 하면 m%"** = the score if every contract item still kept at the current level is done by Sunday: open pairs count 1 while due+1 ≥ today, else ½; level 3 counts released items as 0 (손글씨 stays where it is, released 7+ pairs 0).
- Display order everywhere: "남은 필수 약 X / 남은 시간 Y" → "다 하면 m%" → "지금 n%". Legend on 이번 주: "필수만 세요 · 60%면 합격선, 80%면 잘 지킨 주" (completion, not skill; skill stays in 통계: 세트 퀴즈 정답률, 단원 정답률, 모의 점수 `sc`). The week containing `PLAN.mock.d` or `PLAN.target.d` (now weeks 14 and 29) shows a checklist instead ("응시 ○ · 48시간 복기 ○ · 준비물 0/6").
- The same number appears in 통계 ("이번 주 필수 n%") and in the weekly report (§6.10).

### 3.9 Rollover and after Sunday

| Class (row text) | Tasks | Rule |
|---|---|---|
| "오늘만" | `hw.say`, `hw.qz`, `hw.sl`, `hw.fg` (except phase 3), `hw.write`/`hw.eo` in phases 3–4, `x.outline`, phase 2's Sunday `redo:W`, all fold rows | gone at midnight; the SR queue and set reviews bring the content back |
| "일요일까지" | `set.read`, `set.quiz` (as `late`), the floors of the phase's contract lines as quotas (§3.5 rule 10: `hw.dd` phases 1–4, `hw.write`/`hw.eo` 1–2, `essay` 2, `hw.fg` 3, `x.redo` 3–4), `report`, goals | listed under 이번 주 until Sunday 23:59 |
| "다시 나와요" | `rev`, `cards`, `wrong` | carry naturally; missed steps collapse into one per set (`reviewDue` 302) |
| "다음 모의 전까지" | `mock:D:pk`, `mock.g:D` | an unwritten part carries as "지난주 모의고사" (weekday fold) until the next mock arrives, then it lives only in 보관함; a missing 채점 alone is not chased after Sunday |
| "D-n" | `apply`, `recap`, exam checklist | pinned until the window ends |

**After Sunday** (first render on or after the next Monday, `weekSnap`):
1. Freeze last week once: `S.wk[LW] = {p, parts, lv, at, carry, rel}`; later edits to last week's sets do not change it.
2. Quotas restart at 0 (no debt); the cut ratchet resets.
3. Last week's mock with an unwritten part stays as the fold row "지난주 모의고사 이어 쓰기" (every day it exists, never the active row) and as 이번 주 line 1 "지난주 모의고사 · 토요일 새 모의 전까지" until the next mock arrives.
4. The newest 3 last-week sets with core gaps become one 권장 row "지난주 세트 읽기·퀴즈 {k}개" (deadline this Sunday, not in the new score); older ones are released (their cards stay in the deck and return as 새 카드).
5. 세트 복습, 카드 복습 and 오답 continue by themselves.
6. Report not copied → Monday only, 권장 row "지난주 리포트 아직 · 10분" (`report:LW`: copies `weeklyReport(LW)` — LW..LW+6 with `S.wk[LW]` — and ticks LW, never the new week).
7. Monday's Today notice names carried items, never counts of missed units: "2주차 시작 · 기초 + 흙막이·가시설" / "넘어온 것: 지난주 세트 3개(권장) · 지난주 모의고사" / ghost "지난주 기록 ›" (sheet: last week's %, parts and "놓아준 것"; note "놓아준 것은 빚이 아니에요. 카드·세트 복습·오답은 복습 탭에서 다시 만나요. 손글씨 몫은 이번 주로 끝내요."). Last week's % is never a banner.
8. On the Monday of every week w whose `phaseObj(w).id` differs from `phaseObj(w−1).id` (now weeks 1, 11, 18, 25, 29; with start 2026-11-02 weeks 1, 11, 16, 23, 27), Today shows `PE_PHASE_NOTE[id]` in one line (dismissable, `S.tk['phase:'+id]`).

### 3.10 Special days and weeks

| Case | Rule |
|---|---|
| Weekday holiday (`KR_HOLI`: 12/25, 1/1, 2/8–9, 3/1, 5/3, 5/5, 5/13) | `holi`: weekday blocks + "따라잡기" (all late sets, quotas at most half), budget `sun` (240). Sets still arrive. Header "12월 25일 금요일 · 성탄절". |
| 원서접수 (제141회 ≈ 12/29, 제142회 ≈ 4/13; estimates) | From apply−21: 이번 주 line "원서접수 날짜 확인 · 12/29 무렵" (권장, → `#schedule`). From apply−7 to apply+3: P0 pin "큐넷 원서접수 · 제141회" / "12/29(화)~1/1(금) 예상 · 첫날 오전 10시" / "접수했어요" · "날짜 확인·고치기"; the 이번 주 tab badge shows 1 within 3 days of the window. |
| 큐넷 시행계획 공고 (a date window, not plan weeks) | For each exam year Y of `PLAN.mock.d` and `PLAN.target.d` (now 2027), from {Y−1}-11-20 to {Y−1}-12-31: 이번 주 line "큐넷 {Y} 시행계획 공고 확인" (권장, manual `notice:Y`, → `#schedule`) until ticked. The window does not move with the start date. |
| Rehearsal week (`weekObj(w).pre`: week 13 now, week 11 with start 11/02) | Saturday blocks "1교시 단답" … "4교시 논술" (400) + "채점" 30; budget ≥430; the status line simply shows the long day. Sunday: 채점·복기 → 복습 비우기 → 주간 마감. |
| `pre3` (1/27–1/29, 5/12–5/14) | read + quiz only, no 숙제 rows, quotas off; "카드 30장 돌리기", "논술 목차 떠올리기 5문", Friday "준비물 점검…"; note "수면 7시간". |
| Exam day (1/30 실전 모의 = 제141회, 5/15 제142회) | header "오늘 제141회 시험(실전 응시)"; list = exam checklist (`ex:t:i`) + "응시했어요"; no score that week (checklist on 이번 주). |
| Day after (Sunday 1/31) | P0 pin `recap:141` until Monday 23:59. |
| 설 연휴 (2/6–2/9) | the mock's deadline is "다음 모의 전까지", so writing it on the holiday Monday/Tuesday needs no rule. |
| Before the start date (w < 0) / after the exam | one card "준비 시작 전 · 10월 19일부터" or "시험 후 · 복기와 면접 준비"; no list. |

### 3.11 Worked example — Saturday 2026-10-31 08:00 (computed, `ux/sample_state.json`)

State: last week's sets read, quizzed and reviewed on days 1 and 3; this week 10/26 core + essay + homework partly (no 단답), 10/27 core, 10/28 read only, 10/29 never opened, 10/30 5/10 read; 81 due cards; 10/31 mock untouched. Budget 300; leftNow 930 → capLeft 300.

Week: **B 463 / C 540 (86%) → level 1 "빠듯해요 · 권장은 접어 두었어요"**; 지금 18% (세트 핵심 13.8 · 모의 0 · 손글씨 3.6 · 복습 1.1 · 마감 0) → **다 하면 94%**.

| # | Block | Row (display, grouped) | Minutes | Task ids |
|---|---|---|---|---|
| 1 | 1교시 단답 | 주간 모의고사 1교시 단답 · 13문 중 10문 — "09:00에 시작하면 실제 시험과 같아요" · 다음 모의 전까지 | 100 | `mock:2026-10-31:p1` |
| – | divider | 쉬는 시간 · 답안 사진 찍기 | – | – |
| 2 | 2교시 논술 | 주간 모의고사 2교시 논술 2문 · 쏘일네일링 · 심층혼합처리공법(DCM) | 50 | `mock:…:p2` |
| 3 | 채점 | 채점 요청 → 채점 받았어요 | 30 | `mock.g:2026-10-31` |
| 4 | 따라잡기 | 밀린 세트 3개 · 10/28(수) 퀴즈 0/5 · 10/29(목) 용어 0/10·퀴즈 0/5 · 10/30(금) 용어 5/10·퀴즈 0/5 | 30 | `late:` ×3 |
| 5 | | 세트 복습 4개 · 10/26(월)·10/27(화)·10/28(수) 3일 차 · 10/30(금) 1일 차 | 32 | `rev:` ×4 |
| 6 | | 단답 손글씨 3문 · 10/26(월) · 10/27(화) · 10/28(수) | 45 | `q.dd:2026-10-26` (half of 5) |
| 7 | | 논술 목차 옮겨 적기 2번 · 10/27(화) | 10 | `q.eo:2026-10-26` (whole set that fits) |
| | | **오늘 몫 7개 · 약 4시간 57분** | **297** | 12 tasks |

- 다른 날로 옮긴 것 4개 · 약 2시간 12분: 단답 손글씨 2문 (30) → 내일(일) 손글씨 몫 · 논술 목차 옮겨 적기 6번 (30) → 내일(일) 손글씨 몫 · 새 용어 안 보고 쓰기 16개 (48) → 내일(일) 손글씨 몫 · 카드 복습 48장 (24) → 내일 다시 나와요.
- 시간이 되면 (level 1 folds 권장): 세트 복습 7일 차 5개 · 약 40분 (10/19–10/23) · 일요일에 해도 돼요.
- Handwriting floor: satisfied by the mock papers. Today's app (`shots/01-today.png`): no primary, "주말에는 세트가 없어요" + "어제 세트", the mock as row 4 of "복습".
- **Same state, "오늘 시간 1시간"** (computed): the level stays 1 (B 463 / C 540 — C does not depend on the choice) and `S.wk[W].cut` stays false. 오늘 몫 2개 · 약 55분 = 2교시 논술 2문 50 · 밀린 세트 10/28(수) 퀴즈 5. Moved: 1교시 단답 100 and 채점 30 → 내일(일) 밀린 핵심; 밀린 세트 10/29·10/30 → 내일(일) 밀린 핵심; 단답·목차·쓰기 quotas → 내일(일) 손글씨 몫; 세트 복습 4개 and 카드 복습 → 내일 다시 나와요. The floor is satisfied by the 2교시 paper.

### 3.12 Worked examples — weekdays (computed)

**Thu 2026-10-29 07:40, sample state.** Budget 180, capLeft 180. Week: **B 468 / C 900 (52%) → level 0**; 지금 17% → 다 하면 97%. Academy counts are the targets (level 0).

| # | Block | Row | Progress | Minutes | 못 하면 |
|---|---|---|---|---|---|
| 1 | 아침·출근길 | 용어 10개 읽기 (10/29(목) 세트) | 0/10 | 10 | 일요일까지 |
| 2 | | 세트 복습 2개 · 10/27(화) 1일 차 · 10/28(수) 1일 차 | 0/2 | 16 | 다시 나와요 |
| 3 | 점심·퇴근길 | 세트 퀴즈 5문 | 0/5 | 5 | 일요일까지 |
| 4 | | 새 용어 4개 소리 내어 말하기 4번 · 필수 2번 | 0/16 | 8 | 오늘만 |
| 5 | | 밀린 세트 10/28(수): 퀴즈 0/5 | 0/5 | 5 | 일요일까지 |
| 6 | 저녁 | 새 용어 4개 안 보고 쓰기 2번 · 필수 1번 | 0/8 | 24 | 일요일까지 |
| 7 | | 단답 1문제: 답안지 10분 → 첨삭 · 액상화 예비평가 (Preliminary assessment) | 0/1 | 15 | 일요일까지 |
| 8 | | 논술 목차 옮겨 적기 4번 · 필수 2번 | 0/4 | 20 | 일요일까지 |
| 9 | 자기 전 | 자기 전 5분: 오늘 용어 떠올리기 | – | 5 | 오늘만 |
| | | **오늘 몫 9개 · 약 1시간 48분** (floors alone: 82분) | | **108** | |

시간이 되면: 세트 복습 나머지 5개 · 약 40분 (10/19·10/20·10/21·10/22 7일 차, 10/26(월) 3일 차) · 카드 복습 30장 (after the reviews: it is planned only when no due set review is left out) · 숙제 나머지 · 약 33분 · 논술 실전 25분 → 첨삭 · 논술 목차 떠올리기 3문 · 단답 1문제 더 · 교재 단원 읽기·서브노트 60분 · 용어 퀴즈 이어 풀기 · 15/150문. If the 세트 퀴즈 (row 3) is finished with k wrong answers, the dependent row "퀴즈 틀린 {k}문제: 틀린 이유 한 줄" (2k분, 오늘만) is inserted right after row 3 and the status count rises to 10 (§3.7 step 9b).

**Wed 2026-10-28 21:30, judge state** (`ux/judge_wed_state.json`: Monday 10/26 done, Tuesday 10/27 skipped entirely, Wednesday only the 10 terms read; this is the day's first render). leftNow 120 → capLeft 120: the plan fits the 120 minutes left, not the 180-minute budget. Week: B 483 / C 1080 (45%: today's budget 180 − 0 done + Thu–Sun 900; the clock and the time choice do not enter the level, so all three rows below are level 0) → level 0; 지금 12% → 다 하면 98%. The morning and lunch windows have passed, so their undone rows show inside "저녁 · 지금" (§4.1):

| Choice | 오늘 몫 | Moved ("→ …") |
|---|---|---|
| default (time left 2시간) | 8 rows · **100분**: 세트 복습 10/26(월) 1일 차 8 · 세트 퀴즈 5문 5 · 말하기 4번 8 · 밀린 세트 10/27(화): 용어 0/10 · 퀴즈 0/5 15 · 쓰기 2번 24 · 단답 1문제 (수평배수층 깔기) 15 · 목차 4번 20 · 자기 전 5분 5 | – (카드 복습 waits in 시간이 되면 behind 세트 복습 나머지 3개) |
| "1시간" | 6 rows · **52분**: 세트 복습 10/26 1일 차 8 · 세트 퀴즈 5 · 말하기 (오늘은 2번까지) 4 · 밀린 세트 10/27 15 · 단답 1문제 15 · 자기 전 5 | 새 용어 쓰기 1번 (12) → 토요일 따라잡기 · 목차 2번 (10) → 토요일 따라잡기 |
| "30분 · 최소 몫" | 4 rows · **29분**: 세트 퀴즈 5 · 말하기 (오늘은 2번까지) 4 · 단답 1문제 15 · 자기 전 5 | 밀린 세트 10/27 (15) → 토요일 따라잡기 · 세트 복습 10/26 1일 차 (8) → 내일 다시 나와요 · 쓰기 (12), 목차 (10) → 토요일 따라잡기 |

The same state in designs A/C showed 72/89 minutes with a morning row active and the full 180 minutes as capacity; B's 1-hour cap left a 160-minute plan unchanged (judge report).

### 3.13 Sunday, Monday, and the score over a week (computed)

**Sun 11/1 09:00 after Saturday's portion was done** (the prototype applies Saturday's rows with the app's own keys; opening 10/29 on Saturday makes its 1일 차 due Sunday). B 166 / C 240 (69%) → level 0; 지금 69% → 다 하면 93%.

| Block | Rows | Minutes |
|---|---|---|
| 밀린 핵심 | 세트 복습 10/29(목) 1일 차 | 8 |
| 손글씨 몫 | 단답 손글씨 2문 · 10/29(목) · 10/30(금) · 논술 목차 옮겨 적기 6번 · 10/28(수) 2번 · 10/29(목) 2번 · 10/30(금) 2번 · 새 용어 안 보고 쓰기 16개 · 10/27(화)~10/30(금) | 30 + 30 + 48 |
| 복습 비우기 | 세트 복습 5개 · 10/19~10/23 7일 차 (카드 복습: none left outside today's reviews) | 40 |
| 주간 마감 | 주간 리포트 복사 → Claude | 10 |
| | **오늘 몫 6개 (10 tasks) · 약 2시간 46분**; 시간이 되면: 다음 주 단원 기출 훑기 · 이번 주 목표 0/4 | **166** |

Doing it ends the week at **93%** (세트 핵심 25 · 모의 25 · 손글씨 30 · 복습 9.6 — late reviews count ½ · 마감 3).

**Sun 11/1 09:00 if Saturday was skipped.** B 455 / C 240 (190%) → **level 3 "핵심만 · 다음 주에 새로 시작해요"**; 지금 19% → 다 하면 63%. 오늘 몫 9 tasks · **236분**: 밀린 핵심 = 1교시 단답 100 · 2교시 논술 50 · 채점 30 · 밀린 세트 3개 30 (10/28, 10/29, 10/30 — all fit) · 세트 복습 10/26·10/27 3일 차 16; 주간 마감 = 주간 리포트 10. Handwriting floor = the mock papers. 다른 날로 옮긴 것: 세트 복습 10/30(금) 1일 차, 10/28(수) 3일 차 → 내일 다시 나와요. 놓아준 것 8개: 세트 복습 7일 차 5개 (복습 탭에서 다시 만나요), 단답 손글씨 · 목차 옮겨 적기 · 새 용어 쓰기 (이번 주로 끝내요).

**Mon 11/2 07:00, same state, set not here yet.** Info row "오늘 세트를 기다리는 중" + "지금 받아 오기"; 오늘 몫 16분 = 세트 복습 2개 (10/27·10/28 3일 차); 시간이 되면: 세트 복습 나머지 7개 · 약 56분, 카드 복습 30장, 지난주 세트 읽기·퀴즈 3개 (10/30 · 10/29 · 10/28), 지난주 모의고사 이어 쓰기 (150분 — a fold row, never the active row), 교재, 단답 1문제 더. New week 0% → 다 하면 98%; B 522 / C 1440. Notice: "2주차 시작 · 기초 + 흙막이·가시설" / "넘어온 것: 지난주 세트 3개(권장) · 지난주 모의고사".

**The score never falls by itself** (empty week, plan followed every day, printed at 07:00 → 22:00): Mon 1% → 12% · Tue 12% → 24% · Wed 24% → 36% · Thu 36% → 49% · Fri 49% → 61% · Sat 61% → 90% · Sun 90% → 94%; "다 하면" moves 98% → 94% only because some 1·3일 차 reviews could not be on time (½ credit). Each weekday plan was 87–103 minutes; Saturday 260.

---

## 4. 오늘 (`#today`, `vToday` 367–398 rewritten)

### 4.1 Wireframe — weekday (Thu 10/29 07:40, §3.12)

```
┌──────────────────────────────────────────────────────────┐
│ [10월│29]  10월 29일 목요일                    제142회까지 │ .ltitle (.ltl > .calbtn stays first, test 692)
│   ••       1주차 · 1단계 기본·단답                   D-198 │ h1 1.45rem/800 = date · .dday kept (test 70)
│                                                          │
│ 오늘 몫 9개 · 약 1시간 48분             오늘 시간 3시간 ▾ │ .daysum; right = button data-act="cap"
│                                                          │
│ 아침·출근길 · 휴대폰                  [지금]  0/2 · 약 26분 │ .blk.cur
│ ┌──────────────────────────────────────────────────────┐ │ .plan
│ │ (1) 용어 10개 읽기                               0/10 │ │ .prow.now (blue number)
│ │     10/29(목) 세트 · 10분 · 일요일까지                 │ │ .pm
│ │     [                    시작                    ]   │ │ the ONLY filled .btn on the screen
│ │                                             나중에 │ │ ghost sm
│ │  2  세트 복습 2개                                0/2 │ │ grouped row
│ │     10/27(화) 1일 차 · 10/28(수) 1일 차 · 16분 · 다시 나와요 │
│ └──────────────────────────────────────────────────────┘ │
│ 점심·퇴근길 · 휴대폰                         0/3 · 약 18분 │
│  3  세트 퀴즈 5문                                    0/5 │
│     5분 · 일요일까지                                      │
│  4  새 용어 4개 소리 내어 말하기 4번                  0/16 │
│     필수 2번 · 8분 · 오늘만                               │
│  5  밀린 세트 10/28(수): 퀴즈 0/5                    0/5 │
│     5분 · 일요일까지                                      │
│ 저녁 · 책상·답안지                           0/3 · 약 59분 │
│  6  새 용어 4개 안 보고 쓰기 2번                      0/8 │
│     필수 1번 · 24분 · 일요일까지                          │
│  7  단답 1문제: 답안지 10분 → 첨삭                    0/1 │
│     액상화 예비평가 · 15분 · 일요일까지                    │
│  8  논술 목차 옮겨 적기 4번                           0/4 │
│     필수 2번 · 20분 · 일요일까지                          │
│ 자기 전 · 불 끄기 전                                  5분 │
│  9  자기 전 5분: 오늘 용어 떠올리기                         │
│     5분 · 오늘만                                         │
│                                                          │
│ ▸ 시간이 되면 · 9개 (세트 복습 나머지 5개 → 카드 복습 30장 → …) │ details.d (closed)
│                                                          │
│ 이번 주 · 10/26~11/1                       일요일까지 3일 │ .sec-h
│ [월✓][화✓][수◐][목●][금·][토·][일·]                       │ .wkstrip (no red)
│ 남은 필수 약 7시간 48분 / 남은 시간 15시간                  │ .wkline
│ 다 하면 97% · 지금 17%                                    │
│  세트 핵심 2/5 · 다음 하나: 10/28(수) 퀴즈            ›  │ .qline (≤5)
│  주간 모의고사(토) · 약 3시간 · 토 06:21에 와요         ›  │
│  손글씨 · 단답 0/5 · 목차 2/10 · 쓰기 4/20            ›  │
│  세트 복습 · 남은 7개(+일요일까지 3)                   ›  │
│  이번 주 전체 보기                                   ›  │
│                                                          │
│ 오늘 몫 다시 짜기                                         │ ghost, small
└──────────────────────────────────────────────────────────┘
```

- First screen at 390×844: header, status, the 아침 block with the active row and its button (≤7 tap targets above the fold).
- **Time-of-day merge.** At 21:30 (Wed state, §3.12) the 아침·출근길 and 점심·퇴근길 windows have passed: their headers disappear (or read "✓ 끝" when done), a one-line note says "아침·점심 몫을 저녁으로 옮겼어요", and their undone rows sit at the top of "저녁 · 책상·답안지 · 지금" in their original order, 권장 rows last; "자기 전" stays the last block. The status reads "오늘 몫 8개 · 약 1시간 40분 · 오늘 시간 2시간 ▾" (2시간 = the time left before 23:30, not the 3-hour budget).
- **Frozen plan longer than the time left** (e.g. 22:30 with 97 minutes left in the plan): under the status line, ink2: "남은 몫 약 1시간 37분 · 남은 시간 약 1시간" + link "오늘 시간 줄이기" (opens the sheet). The app never shrinks a frozen plan by itself.

### 4.2 "오늘 시간" sheet (`capSheet`, data-act `cap`; choice `cap-set` data-m)

```
오늘 남은 시간
지금부터 쓸 수 있는 시간을 고르면 오늘 몫을 다시 짜요.
[ 30분 · 최소 몫 ]  [ 1시간 ]  [ 1시간 30분 ]  [ 평소대로 · 2시간 ]       .seg (4 segments)
최소 몫(용어 읽기 · 세트 퀴즈 · 단답 1문 · 자기 전 5분)은 늘 남아요.
뺀 것은 "→ 토요일 따라잡기"처럼 갈 곳을 적어 둬요.
[ 닫기 ]
```

- "평소대로" shows `min(budget − done today, time left)`; choosing it sets `S.today.user=null`. The others set `S.today.user` to 30/60/90 and re-plan (§3.7 step 9: done rows stay). The choice lasts for that date only: it changes today's fit (`capLeft`) and nothing else — not the week's level, not the level-2 cut (§3.7 step 3), not tomorrow.
- After "1시간" on the Wed state: "오늘 몫 6개 · 약 52분", and under the blocks the fold "다른 날로 옮긴 것 · 2개 · 약 22분" with "새 용어 4개 안 보고 쓰기 1번 · 12분 → 토요일 따라잡기" and "논술 목차 옮겨 적기 2번 · 10분 → 토요일 따라잡기".

### 4.3 Saturday (10/31 08:00, §3.11)

```
10월 31일 토요일 · 1주차 · 1단계 기본·단답                 제142회까지 D-196
오늘 몫 7개 · 약 4시간 57분                                 오늘 시간 5시간 ▾
1교시 단답 · 100분                                                    [지금]
 (1) 주간 모의고사 1교시 단답 · 13문 중 10문                          100분
     09:00에 시작하면 실제 시험과 같아요 · 다음 모의 전까지
     [                 1교시 시작                 ]      나중에        → #mock/2026-10-31
 ─ 쉬는 시간 · 답안 사진 찍기 ─
2교시 논술 · 50분
  2  주간 모의고사 2교시 논술 2문 · 문제당 25분                         50분
     쏘일네일링 · 심층혼합처리공법(DCM) · 다음 모의 전까지
채점 · 30분
  3  채점 요청 → 채점 받았어요 · 다음 모의 전까지                        30분
따라잡기 · 책상                                               0/4 · 약 1시간 57분
  4  밀린 세트 3개 · 10/28(수) 퀴즈 · 10/29(목) 용어·퀴즈 · 10/30(금) 용어 5·퀴즈   0/3 · 30분
  5  세트 복습 4개 · 10/26·10/27·10/28 3일 차 · 10/30 1일 차 · 다시 나와요          0/4 · 32분
  6  단답 손글씨 3문 · 10/26(월) · 10/27(화) · 10/28(수) · 일요일까지              0/3 · 45분
  7  논술 목차 옮겨 적기 2번 · 10/27(화) · 일요일까지                               10분
▸ 다른 날로 옮긴 것 · 4개 · 약 2시간 12분      (내일(일) 손글씨 몫 3개 · 내일 다시 나와요 1개)
▸ 시간이 되면 · 1개                            (세트 복습 7일 차 5개 · 약 40분 · 일요일에 해도 돼요)
이번 주 · 10/26~11/1                                                 일요일까지 1일
[월✓][화✓][수◐][목○][금◐][토●][일·]
남은 필수 약 7시간 43분 / 남은 시간 9시간 · 빠듯해요 · 권장은 접어 두었어요
다 하면 94% · 지금 18%
 주간 모의고사 0/3 · 1교시 ○ 2교시 ○ 채점 ○                                       ›
 세트 핵심 2/5 · 다음 하나: 10/28(수) 퀴즈                                        ›
 손글씨 · 단답 0/5 · 목차 2/10 · 쓰기 4/20                                        ›
 세트 복습 · 남은 9개(+일요일까지 1)                                              ›
 주간 리포트(일) 0/1                                                              ›
```

Before (`shots/01-today.png`): no primary, "주말에는 세트가 없어요" + "어제 세트", the mock as row 4 of "복습", 16 text styles. After: the mock is row 1 with the only primary; 6 text styles.

### 4.4 Sunday (11/1 after Saturday's portion, §3.13)

```
11월 1일 일요일 · 1주차 · 주간 마감일                       제142회까지 D-195
오늘 몫 6개 · 약 2시간 46분                                 오늘 시간 4시간 ▾
밀린 핵심 · 휴대폰
 (1) 세트 복습 10/29(목) 1일 차 · 8분 · 다시 나와요                 [시작]
손글씨 몫 · 책상·답안지                                        0/3 · 약 1시간 48분
  2  단답 손글씨 2문 · 10/29(목) · 10/30(금) · 오늘 밤까지                   30분
  3  논술 목차 옮겨 적기 6번 · 10/28 2번 · 10/29 2번 · 10/30 2번 · 오늘 밤까지   30분
  4  새 용어 안 보고 쓰기 16개 · 10/27(화)~10/30(금) · 오늘 밤까지              48분
복습 비우기 · 휴대폰
  5  세트 복습 5개 · 10/19~10/23 7일 차 · 다시 나와요                         40분
주간 마감
  6  주간 리포트 복사 → Claude · 오늘 밤까지                [복사하기 when active]
▸ 시간이 되면 · 2개   (다음 주 단원 기출 훑기 · 이번 주 목표 0/4)
이번 주 · 남은 필수 약 2시간 46분 / 남은 시간 4시간 · 다 하면 93% · 지금 69%
```

Saturday skipped instead (level 3): header line "핵심만 · 다음 주에 새로 시작해요"; 밀린 핵심 · 책상 holds 1교시 단답, 2교시 논술, 채점, 밀린 세트 3개, 세트 복습 2개; 주간 마감 holds the report; fold "놓아준 것 · 8개" with the note "놓아준 것은 빚이 아니에요. 카드·세트 복습·오답은 복습 탭에서 다시 만나요. 손글씨 몫은 이번 주로 끝내요."

### 4.5 States

| State | What Today shows |
|---|---|
| Weekday, set not here yet | info row "오늘 세트를 기다리는 중" / "평일 06:21에 만들기 시작해 보통 30분 안에 와요." / secondary "지금 받아 오기"; the rest of the list is live; when the set arrives its rows merge in (§3.7 step 9) and the active row moves to "용어 10개 읽기" |
| Weekday 09:00+, still no set | info row "오늘 세트가 아직 없어요 · 이번 주 지난 세트부터 해요"; the plan freezes without it and merges it later |
| Saturday, mock not here yet | info row "주간 모의고사를 기다리는 중" / "토요일 06:21에 만들기 시작해요." + secondary "지금 받아 오기"; 따라잡기 is live (a carried mock stays a fold row) |
| Sync failed | one red line "받아 오지 못했어요 — 인터넷 연결을 확인하세요" + ghost "다시 받아 오기" (red = failure state, not backlog; never a filled button, so the queue keeps the primary); no success line ever |
| **No rows** (nothing undone in 오늘 몫 and no plannable fold row; "plannable" excludes the carried mock) | one card with exactly one primary, replacing the info row: data missing or waiting (first install; today's set or Saturday's mock not here yet) → "아직 받은 세트가 없어요" / "오늘 세트를 기다리는 중" / "주간 모의고사를 기다리는 중" + primary "지금 받아 오기"; data present → "오늘 할 몫이 없어요" (or the "오늘 몫 끝" text below when rows were done) + primary "연습에서 자유 연습" (`startFree()`, `from:'today'`). Every run of `app.test.js` after 11/1 hits this state (the fake repo holds only the 10/19 set and the 10/24 mock) |
| No 필수 left but rows exist in 시간이 되면 | the first phone-friendly fold row (세트 복습 7일 차, 카드 복습, 오답, 지난주 세트) becomes the active row with its "권장" tag; **never the carried mock**, on any day (it stays a 권장 fold row, Sat/Sun included, until a new mock arrives) |
| All of 오늘 몫 done | card "오늘 몫 끝" / "약 1시간 48분 했어요" / weekdays "내일: 10/30(금) 세트가 06:21에 와요", Saturday "내일(일): 남은 필수 약 2시간 46분", Sunday "이번 주 필수를 다 했어요"; 시간이 되면 opens with up to 2 "미리 하기 · 일요일까지" rows, then 권장. The card carries the screen's primary ("연습에서 자유 연습") only when no fold row can become active; otherwise that row holds it |
| "이어서" | above the status line, one tinted row "이어서 · 10/30 세트 카드 넘겨 보기 4/10 ›" (source: unfinished `SES` → unfinished `MEMO` → this week's `S.resume['flash:'+d]`/`['memo:set:'+d]`); hidden when it is the active row's own task (its "시작" already resumes, labelled "이어서") |
| Monday (and Tuesday until ×) | notice "2주차 시작 · 기초 + 흙막이·가시설" / "넘어온 것: 지난주 세트 3개(권장) · 지난주 모의고사" / ghost "지난주 기록 ›" (sheet, §5.5) |
| First week of a phase | one dismissable line `PE_PHASE_NOTE[id]`, e.g. "2단계 시작: 평일 논술 실전 25분이 필수가 돼요(주 5편). 목차 옮겨 적기는 3번으로 줄어요." |
| P0 window | amber pin above everything (§3.10); its buttons are secondary — the queue keeps the primary |
| Level ≥1 | the level sentence on the 이번 주 status line; level 3 adds the fold "놓아준 것 · n개" under the blocks |
| Exam day / `pre3` / before start / after exam | §3.10 |

### 4.6 Row anatomy and interaction

| Part | Content | Style |
|---|---|---|
| number `.pn` | position in today's order (done rows keep it, ✓ replaces the digit) | 26 px circle; `.now` blue fill; `.done` ok fill |
| title `.pt` | catalog title; **wraps to at most 2 lines** (`-webkit-line-clamp:2`), never single-line ellipsis | 1rem/600 |
| meta `.pm` | "{sub} · {n}분 · {못 하면}" (권장 rows: "{sub} · {n}분") | .86rem `--ink2`, wraps |
| right `.pv` | progress "a/b" (counted tasks) or minutes | .92rem/700 tabular |
| tag `.tag` | "권장" / "여유" only (필수 is the default) | outline chip |

- The active row (first unfinished in display order, honouring "나중에" and the 자기 전 rule) is expanded with the primary and a ghost "나중에". Tapping any other row's body goes straight to its exact place (one tap, T16).
- "나중에" moves the active row to the end of today's order for this app session (`UI.later`, cleared on a new date) and activates the next row.
- Done rows stay in place, compact (✓, struck title, no meta). A block whose rows are all done collapses to "아침·출근길 ✓ 끝 · 3/3".
- Blocks with more than 4 rows show 4 and "나머지 n개 보기" (rare after grouping). 오늘 몫 ≤12 numbered rows.

Primary label and action per type:

| Task | Label | Action |
|---|---|---|
| `set.read` | "시작" / "이어서 · {k}번째 용어부터" | `taskGo`: `FLOW={id,from:'today',at:'set/'+D}`, `nav('set/'+D)` (① scrolled to the first unread term) |
| `set.quiz` | "시작" | `nav('set/'+D)` + `SV[D]='quiz'` |
| `late` (group) | "시작 · {M/D} 세트부터" | oldest set at its first gap |
| `rev` (group) | "시작 · {M/D} 세트부터" | `startSetReview(oldest,{chain:ids})` |
| `hw.*`, `q.*` | "시작" | `nav('set/'+D)` + ③ focused on the card (§6.4) |
| `essay` | "시작" | ④ 논술 |
| `mock:D:pk` | "{n}교시 시작" | `nav('mock/'+D)` (the timer starts there) |
| `mock.g` | "채점하기" | `nav('mock/'+D)` at step 채점 |
| `cards` | "시작 · {k}장" | `startDueAll({k, skip:planned review card ids})` |
| `wrong` | "시작 · {n}개" | `startWrong({skipQ:t})` |
| `report` | "복사하기" | Sat/Sun: copy `weeklyReport(W)` + `S.tk['report:'+W]` + `touchDay()`; Monday's "지난주 리포트" row: `weeklyReport(LW)` + `S.tk['report:'+LW]`; toast "주간 리포트를 복사했어요. Claude 프로젝트에 붙여 넣으세요" (§6.10) |
| `x.outline` | "시작 · {n}문" | `startOutline()` |
| manual rows (`x.book`, `x.redo`, `kit`, `goal`, …) | "다 했어요" | `tk` (+ `touchDay()`, `calMark('tk:'+id,'todo',label)`) |

### 4.7 After finishing a task

| Started from Today | Where the user is when done | Primary "다음" | Back |
|---|---|---|---|
| session rows (`rev`, `cards`, `wrong`) | end screen (`sessDone` 709) | "다음: {next undone row} · {n}분"; in a review group "다음 세트 복습: 10/28(수) 1일 차 (2/2) · 8분" | secondary "오늘로" = `goUp()` (pops to `#today`) |
| 가리며 외우기 | memo end (`memoDoneHTML` 891) | same rule | "오늘로" |
| set-page rows (`set.read`, `set.quiz`, `hw.*`, `late`, `q.*`) | set page | sticky bar: while the row's own target is open, its next step ("다음: 용어 읽기 3/10", "다 썼어요(단답 1문)"); when met, "✓ 끝 · 다음: {next row} · {n}분" (one tap continues; replaces the entry, keeps the origin) | topbar "‹ 오늘" |
| mock rows | mock page | stepper (§6.8): next part → 채점 → "다음: {next row}" | topbar "닫기" (focus) / "‹ 오늘" |
| report | stays on Today (inline copy) | the next row becomes active | – |

Coming back, the finished row is compact with ✓, the next row is expanded, and the status line counts down. When nothing is left: "오늘 몫 끝 · 오늘로".

---

## 5. 이번 주 (`#week`, new `vWeek`)

### 5.1 Wireframe (Sat 10/31 08:00, sample state)

```
이번 주                                                    h1 1.5rem/800 (page "‹ 오늘" until slice 5)
1주차 · 10/26~11/1 · 토공 + 연약지반 · 일요일까지 1일        .lsub
┌ .score ───────────────────────────────────────────────┐
│ 남은 필수 약 7시간 43분 / 남은 시간 9시간                │ 1.06rem/700
│ 빠듯해요 · 권장은 접어 두었어요                            │ .88rem ink2 (level ≥1)
│ 다 하면 94%                                    지금 18% │ 1.7rem/800 tabular · right .92rem ink2
│ ▓▓▓▓░░░░░░░░░░░░│60│░░░░░░│80│░░░░                   │ 6px bar (blue <80, ok ≥80), ticks
│ 세트 핵심 14/25 · 모의고사 0/25 · 손글씨 4/30 · 복습 1/15 · 마감 0/5 │ .84rem ink2
│ 필수만 세요 · 60%면 합격선, 80%면 잘 지킨 주                │ .note
│ [        다음: 주간 모의고사 1교시 · 100분        ]       │ the screen's one primary = Today's active row
└───────────────────────────────────────────────────────┘
날마다
 월 10/26  ✓ 핵심 끝 · 숙제 필수 3/5
 화 10/27  ✓ 핵심 끝 · 숙제 필수 0/5
 수 10/28  ◐ 퀴즈 0/5 · 숙제 필수 0/5
 목 10/29  ○ 용어 0/10 · 퀴즈 0/5
 금 10/30  ◐ 용어 5/10 · 퀴즈 0/5
 토 10/31  ● 주간 모의고사 · 1교시 ○ 2교시 ○ 채점 ○              오늘
 일 11/1   · 주간 마감 · 주간 리포트
일요일까지 끝낼 것                                           7
 주간 모의고사 + 채점            0/3  ░░░░░░  3시간        ›
 세트 핵심(용어 읽기·세트 퀴즈)   2/5  ▓▓░░░░  30분         ›   다음 하나: 10/28(수) 퀴즈
 단답 손글씨                     0/5  ░░░░░░  1시간 15분    ›
 논술 목차 옮겨 적기              2/10 ▓░░░░░  40분         ›
 새 용어 안 보고 쓰기             4/20 ▓░░░░░  48분         ›
 세트 복습 · 남은 9개(+일요일까지 1)           1시간 20분    ›
 주간 리포트(일)                 0/1          10분         ›
▸ 이번 주 목표 0/4 · 권장          (checkboxes from weekObj(w).goals + "산출물: 서브노트 4장, 첨삭 답안 2개")
다음 일정 · 제141회 원서접수 무렵 12/29 (D-59)                                   ›  #plan
기록
 학습 달력 ›   세트 보관함 ›   통계·주간 리포트 ›   로드맵 ›
```

### 5.2 Lines, deadlines and "다음 하나"

- "일요일까지 끝낼 것" has ≤7 lines (+ P0 and carried lines when present, ≤2), in this order: P0 / 원서접수 날짜 확인 → carried mock → 주간 모의고사 → 세트 핵심 → the phase's hand lines (phase 1 단답 → 목차 → 쓰기; phase 2 논술 실전 → 단답 → 목차 → 쓰기; phase 3 다시 쓰기 → 단답 → 그림·표; phase 4 다시 쓰기 → 단답 → 카드 50장 돌리기) → 세트 복습 → 주간 리포트 (§3.8 phase table; ≤7 in every phase). A finished line turns ✓, ink3, and moves to the bottom. Level 2 adds "(줄인 목표)" and the cut target.
- Each line is a row; tapping it runs "다음 하나": 세트 핵심 → the oldest set with a gap (read before quiz); quotas → the oldest set whose floor part is missing (`#set/D` ③ focused); 세트 복습 → starts the oldest due review; mock → `#mock/D`; report → copies. The line's meta names the target ("다음 하나: 10/28(수) 퀴즈").
- The deadline is said once in the header ("일요일까지 1일"; Sunday "오늘 밤까지"); the mock line says "다음 모의 전까지" when carried. Amber is used for a dated item ≤1 day away; nothing turns red except a dated deadline within 3 days.
- On 오늘 the same data shows as ≤5 `.qline` rows (P0 → carried mock → mock → core → handwriting in one line → reviews; the report only Sat/Sun).

### 5.3 Score card

- Order: remaining work and time → level sentence → "다 하면 m%" (big) → "지금 n%" (small, right) → bar → parts → legend → the screen's one primary. Bar fill `--blue` below 80, `--ok` at ≥80; never red. The week containing `PLAN.mock.d` or `PLAN.target.d`: "시험 주 · 점수 대신 체크" and the checklist.
- The same "지금 n%" appears in 통계 ("이번 주 필수 n%") and in the weekly report.

### 5.4 Day strip and day list

- Strip (오늘, 7 chips): ✓ = core done (Saturday: all parts + 채점; Sunday: report), ◐ = partly, ○ = not started (2 px `--ink3` ring), ● = today (blue outline), · = future (dotted). **A past unfinished day is a plain ○ — no red ring** (no guilt; the 이번 주 lines say what is left).
- Day list (이번 주): one row per day with the same glyph and the open parts by name; weekday → `#set/D`, Saturday → `#mock/D`, Sunday → scrolls to the report line. Days of carried sets read "넘어온 세트".

### 5.5 Carry-over, release, Monday

- "넘어온 것" (between the contract and the goals, Mon–Sun after a carry): "지난주 세트 읽기·퀴즈 3개 · 이번 일요일까지(권장)" and "지난주 모의고사(10/31) · 토요일 새 모의 전까지".
- "놓아준 것 · n" (level 3 only, folded) with the one note of §2.4: "놓아준 것은 빚이 아니에요. 카드·세트 복습·오답은 복습 탭에서 다시 만나요. 손글씨 몫은 이번 주로 끝내요."
- Monday sheet "지난주 기록" (from `S.wk[LW]`): "지난주(1주차) 93%", the five parts, "넘어온 것", "놓아준 것" by name, and "60% 넘은 주 n주 연속". 통계 lists "주간 기록" (newest first, ≤8).

---

## 6. Set page, 숙제 and the other screens

### 6.1 Set page structure (`#set/D`, `vSet` 569)

```
‹ 오늘                 10월 30일 금요일 세트                         topbar: up label (§7.8)
[① 용어 3/10][② 퀴즈 0/5][③ 숙제 0/5][④ 논술 권장]                 .seg (state in every label, study order)
지능형 다짐 관리와 쌓기 재료·비탈면 기준안전율                          h1, only on ①; ②–④ show one line
1주차 · 토공, 연약지반
…step content…
┌ sticky .nextbar ──────────────────────────────┐
│ [        다음: 용어 읽기 3/10        ]          │ the page's only primary
└───────────────────────────────────────────────┘
```

- Seg labels: "① 용어 {read}/{nc}" → "① 용어 ✓"; "② 퀴즈 {qa}/{nq}" → "② 퀴즈 ✓"; "③ 숙제 {a}/{b}" counts **required parts** (`reqParts(d)`: 말하기, 쓰기, 단답, 목차, [틀린 이유 when the quiz has wrong answers], 자기 전, [그림·표 in phase 3], [논술 실전 in phase 2 only]) → "③ 숙제 ✓"; "④ 논술 ○" (phase 2) / "④ 논술 권장" (phases 0–1 and 3) / "④ 논술" (phases 4–5, no tag) → "④ 논술 ✓" once written. The phase is the set's own week (`s.week`, as `hwMin`). Buttons keep `data-act="set-tab"` + `data-t` (cards | quiz | tasks | essay).
- Deep link `#set/D/<tab>`: `route()` sets `SV[D]=<tab>` once and `replaceState`s to `#set/D` (and the mirror entry), so return targets stay `#set/D` (test 674 compares `#set/D`).
- **Sticky bar `.nextbar`** (`setNext(d)`; hidden while an input has focus):
  - Entered from a Today row (`FLOW.from==='today'`, `FLOW.id` on this set): while that row's target is open, its own next step — `set.read` "다음: 용어 읽기 3/10" (scrolls to the first unread term), `set.quiz` "다음: 세트 퀴즈 5문", a homework row the focused card's done label (§6.4); once met, "✓ 끝 · 다음: {next Today row} · {n}분" → `taskGo(next,{replace:true})` (origin kept, history does not grow).
  - Otherwise (보관함, 복습 지난 세트, 이번 주): the in-set order — read < nc → "다음: 용어 읽기 3/10"; quiz open → "다음: 세트 퀴즈 5문"; a floor part missing → "다음: 숙제 필수 · {part}" (today's set: 말하기 → 틀린 이유 → 쓰기 → 단답 → 목차 → 자기 전; past sets: 쓰기 → 단답 → 목차); phase-2 essay → "다음: 논술 실전 25분"; all done → "이 세트 필수 끝 · 돌아가기" (`goUp`).
- Footer: when the core is done, "핵심 끝 ✓ · 세트 복습은 10/31(1일 차)부터"; only when `setStatus().done`, "이 세트 숙제까지 모두 끝냈어요. 세트를 처음 연 날로부터 1·3·7·14·30일 뒤에 세트 복습으로 돌아와요." (D5; replaces 594).
- Opening the set page still sets `sp.first` at 571 (anchor unchanged); D2 (§8) makes every other first write do the same.

### 6.2 ① 용어

- Accordions unchanged (`.acc`, "새 용어" tag, tests 74–76); a read term shows ✓ in its number (`.acc.read .no::before`).
- One tool row: secondary sm "카드 넘겨 보기" (or "카드 넘겨 보기 이어서 (4/10)"), secondary sm "가리며 외우기" (or "가리며 외우기 이어서 (5/10)"), text link "빈칸 쓰기"; ghost "이어 하지 않고 처음부터" only with a resume. Retired labels: "카드로 넘겨 보며 외우기", "가리며 외우기(보였다 가렸다 반복)".
- One-line note "펼쳐 읽은 용어는 읽은 것으로 쳐요. 모르는 낱말은 꾹 누르세요."
- Fold "교재로 확인할 것 3" (was "확인이 필요한 부분" on 숙제) with "세트를 만들 때 확신하지 못한 내용이에요."

### 6.3 ② 퀴즈: 세트 퀴즈 first, 용어 퀴즈 folded with all three modes

- Section "세트 퀴즈" meta "0/5문" with the inline questions (`quizBlock` unchanged). After the last answer: "3/5 정답 · 틀린 문제는 오답 노트와 숙제 '틀린 이유'로 갔어요".
- Below: `details.d` "더 연습: 용어 퀴즈 150문 · 15/150", open by default only when the set quiz is complete. Inside, everything from 51855c1 stays: the note "이 세트 용어 10개로 앱이 만든 문제 150개예요. 어느 방식으로 풀어도 기록은 함께 남고, 틀린 문제는 오답 노트로 가요.", the `GQ_MODES` segment "회차별 · 용어별 · 무작위" (`gq-mode`, `SV['gqm:'+d]`), 회차별 chips + "이어 풀기: 2회", 용어별 rows ("{용어}" / "3/15문 풂, 정답 2"), 무작위 "무작위 15문 풀기" / "150문 전부 섞기", and "틀린 문제만 (2)". Only weight changes: these become `.btn.sec` (the drill never owns the screen's primary).
- End screens continue the chosen mode as the primary "다음": 회차별 "다음: 3회 풀기 (15문)" (`startGq(d,'next')`), 용어별 "다음: {next term with unanswered questions} ({n}문)" (`startGq(d,'t:'+id)`), 무작위 "다음: 무작위 15문 더" (`startGq(d,'rand')`). 150 questions run as one chain instead of 10 round trips; the chain renders in place on the same `#sess` entry (§7.5).

### 6.4 ③ 숙제: academy counts kept, required marked, one card can be the "do page"

```
┌ 이 세트 숙제 ──────────────────────────────────────────────┐
│ 필수 0/5 · 약 46분                       전체 0/11 · 약 150분 │ both counts stay visible
│ 1단계 기본·단답 · 새 용어는 손으로 2번·입으로 4번, 필수는 1번·2번 │ PE_HW.why shortened + floor rule
│ ▸ 숙제 원칙 6가지                                            │ HW_RULES (folded), hwAhead line inside
└───────────────────────────────────────────────────────────┘
필수                                                       0/5 · 약 46분
 [1] 새 용어 4개: 안 보고 쓰기 2번, 소리 내어 말하기 4번              32분   ← academy title unchanged
     필수: 쓰기 1번 · 말하기 2번 (나머지는 시간이 되면)
     비다짐 쌓기   쓰기 (1)│(2)   말하기 (1)(2)│(3)(4)                     solid ring = 필수, dashed = 더 하기
     … 4 terms …
     [카드 넘겨 보기] [가리며 외우기]                          ▸ 요령
 [2] 단답 1문제: 답안지에 10분 쓰기 → 첨삭                         15분
     비다짐 쌓기 (부지조성 공사)   (1)   [답안지] [타이머 10분]       ▸ 요령
 [3] 논술 목차 옮겨 적기 4번                                      20분
     필수: 2번 · (1)(2)│(3)(4)   [모범 목차 보기]                   ▸ 요령
 [4] 퀴즈 틀린 문제: 해설 2번 읽고 틀린 이유 한 줄                    "퀴즈를 다 풀면 틀린 문제가 여기 나와요." (not counted while pending)
 [5] 자기 전 5분: 오늘 용어 제목만 보고 떠올리기                       5분
▸ 더 하기 · 5개 · 약 63분
     복습 용어 6개: 제목만 보고 키워드 백지 복원 · 그림·표 그리기 3번 (세트 숙제 항목과 같은 그림이에요) ·
     앞글자로 외우기 1개 만들기 · 쌓기비탈면 기준안전율 6개 값을 일반·연약지반 표로 외워 쓰기 ·
     논술 실전 쓰기 25분 → 사진 찍어 첨삭 (논술 탭에서 쓰기 ›)
```

- Titles and counts stay exactly as `hwItems` builds them (the user's academy counts). Added: the "필수: …" sub-line, `.cc.req` on the first `PE_HW_MIN` circles (2 px solid `--ink2`), a thin divider `.ccsep`, dashed extra circles. A card whose floor is met shows the small green chip "필수 ✓"; it dims (`.hw.done`) only when fully done (as now). Per-card "요령" (`HW_HOW`) stays folded on every card.
- Header text "오늘 숙제" (449) → "이 세트 숙제" (it was wrong on past sets); closing line "이 세트 숙제를 모두 했어요." only when every item is done.
- The `ew` card keeps its done circle (`hw-ew` 1360, same record as ④) but drops its duplicate "25분 타이머"/"첨삭 요청 복사"; it says "논술 탭에서 쓰기 ›".
- The duplicate drawing (10/29, 10/30) is shown inside the `fg` card ("세트 숙제 항목과 같은 그림이에요") and written through (§3.5 rule 6).
- **Focused card** (opened from a Today row or an 이번 주 "다음 하나", `FLOW.id`): the card gets `.hw.focus` (2 px `--blue` ring), is scrolled to the centre, and shows "이렇게 해요" with the three numbered steps of `HW_STEPS` (§3.2) and their buttons inline (e.g. 단답: [답안지] → `#dandap/<id>/<D>`, [타이머 10분], [첨삭 요청 복사] → `copy-dd`). The sticky bar holds the card's done action:

| Focused row | Sticky label | Writes |
|---|---|---|
| `hw.dd` | "다 썼어요 · 단답 1문" | next required `dd` circle = 1 |
| `hw.say` | "{target}번씩 다 했어요 · 말하기" | fills `s<i>` up to the row's target (only upward) |
| `hw.write` | "{target}번씩 다 썼어요 · 쓰기" | `w<i>` up to target |
| `hw.eo` | "{target}번 다 옮겨 적었어요" | `eo` = target |
| `hw.qz` | "다 썼어요 · 틀린 이유" | every `q<i>` = 1 |
| `hw.sl` | "다 떠올렸어요" | `sl` = 1 |
| quota row | "다 썼어요 · {M/D} 단답 1문" (then the next set of the quota) | that set's circles |

  Every write goes through the existing `hw` path (`touchDay()`, `hwCal`), so the circles, the Today row, the calendar and the score move together. When the row's target is met the bar becomes "✓ 끝 · 다음: {next row} · {n}분". Individual circles stay tappable for partial progress.

### 6.5 ④ 논술

Unchanged order (question, "목차 힌트 보기", "타이머 25분", "첨삭 요청 복사", checkbox "손글씨로 다 썼어요(사진을 찍어 Claude 프로젝트에 올리기)"). Changes: the ghost link reads "답안 작성 요령"; phases 0–1 add "1단계는 토요일 모의고사 논술 2문이 이번 주 몫이에요. 이 문제는 시간이 되면 쓰세요."; phase 3 adds "3단계는 평일 모의 오답 다시 쓰기가 이번 주 몫이에요. 이 문제는 시간이 되면 쓰세요."; phases 4–5 show the question and outline only (no 숙제 `ew` item exists); from slice 6 the 25-minute timer runs inline (§6.8).

### 6.6 Review sheet (`revSheet` 604)

```
10월 21일 수요일 세트 · 7일 차 세트 복습
가설구조물 설계변경과 중력식 댐의 이음
[ 세트 복습 시작 · 카드 10 + 퀴즈 5 · 약 8분 ]                     primary (start-setrev)
▸ 다른 방법으로
    가리며 외우기 (이어서 3/10) · 카드 넘겨 보기 · 빈칸 쓰기 · 용어 퀴즈 15/150문 · 세트 열기   (same 5 data-acts)
    어느 방법이든 끝까지 하면 오늘 복습으로 쳐요.
```

- Not due ("지난 세트"): kicker "10월 29일 목요일 세트 · 다음 세트 복습 11/2(3일 차)", primary "세트 다시 풀기 · 약 8분" (same session; with D4 it records no 세트 복습), note "복습 날이 아니라 세트 복습 기록은 남지 않아요. 카드 진도는 그대로 반영돼요."
- "빈칸 쓰기" opens the level sheet with "‹ 다른 방법" (`rev-open`) at the top (`fillLvHTML` 230).
- "끝까지" means one rule for every session: `enough(SES)` — at least ⌈0.8 × items⌉ items in `SES.done` (answered, graded, self-checked, typed and checked, or, in 카드 넘겨 보기 only, flipped to the back; §8.1 D3). Flipped flash cards count, so a flash session that reaches its end screen after flipping every card counts, and one skipped through does not. 가리며 외우기 counts at "완료" on the last card (`memoFinish` 871).

### 6.7 복습 tab (`vReview` 613 rewritten; numbers from the screenshot state `ux/screens_state.json`, Sat 10/31 08:00: 28 due cards, 14 of them inside the three set reviews in today's plan → "카드 복습 14")

```
복습                                                          h1 1.5rem/800
세트 복습 5 · 카드 복습 14 · 오답 8                               .lsub
세트 복습                                                5개
 10/26(월) 3일 차 · 연약지반 점토의 성질과 구조물 뒤채움 관리       ›   rev-open
 10/28(수) 3일 차 · 연약지반 수평배수층·지하수위저하·바이브로…     ›
 10/30(금) 1일 차 · 지능형 다짐 관리와 쌓기 재료·비탈면 기준안전율 ›
 10/21(수) 7일 차 · 가설구조물 설계변경과 중력식 댐의 이음         ›
 10/23(금) 7일 차 · 관로 부단수 연결·전식 방지와 …               ›
 [  세트 복습 시작 · 10/26(월) 3일 차 · 8분  ]                     primary; chains through the list
 카드 복습 14장 · 세트 복습 뒤에 해요                               ›   start-due
 [ 모두 가리며 외우기 (47장) ]                                      secondary (memo-rev; "이어서 (n/m)")
오답 노트                                                8개
 오답 다시 풀기 · 카드 3, 퀴즈 3, 용어 퀴즈 2                       ›   start-wrong
 오답 카드 가리며 외우기 · 5장                                      ›   memo-wrong ("이어서 (n/m)")
 목록 보기                                                        ›   #wrong
별표 카드                                                4장
 별표 카드 넘겨 보기                                               ›   start-stars
 별표 카드 가리며 외우기                                            ›   memo-stars
지난 세트
 10/29(목) 세트 · 액상화 판정: 예비평가·본 평가와 반복연화   용어 0/10 · 퀴즈 0/5 ›   rev-open (not due)
 10/27(화) 세트 · 노체 쌓기: 층따기·높은 쌓기와 …                   핵심 ✓ ›
 … (≤5)
 세트 보관함 · 세트 10개 · 모의고사 2개                              ›   #archive
```

- Review order everywhere (Today, this list, the chain): steps ≤3 before 7+, then due date (first + step) ascending, then step. Rows ≤5, then "모두 보기 n".
- The "오답 노트" section header is always present; empty: "오답이 없어요 · 퀴즈·테스트에서 틀리거나 '모름'을 고르면 여기 모여요." (keeps `native.test.js` 183–184 "알림 → 복습 화면"). Zero categories are hidden inside the sub-line ("빈칸 1", "용어 퀴즈 1" keep their format for tests 268/468).
- Removed: "기준 수치 빈칸" (→ 연습 → 문제), the methods note (620), the slogan.

### 6.8 Mock page `#mock/D` as a stepper (slice 6; minimal records already in slice 3)

```
닫기                         10월 31일 모의고사                    focus mode while its timer runs
1단계 1주차 모의: 토공·연약지반
① 1교시 ○ ── ② 2교시 ○ ── ③ 채점 ○                                 .stepper
09:00에 시작하면 실제 시험과 같아요 · 문제 고르기 3분 → 시간 엄수 → 공란 금지
┌ 지금: 1교시 단답 · 13문 중 10문 · 100분 ──────────────────────┐
│  1 평판재하시험(PBT)의 크기효과(Scale effect) 보정   기출 140-1-08 │
│  … 13 rows                                                     │
│  남은 87:12 · 3번째 문제 시간                       [일시정지]    │ .tline data-timer="p1" (inline)
└───────────────────────────────────────────────────────────────┘
─ 쉬는 시간 · 답안 사진 찍기 ─
▸ 2교시 논술 2문 · 문제당 25분                                       folded until 1교시 is written
▸ 채점                                                             folded until every part is written
⋯ 문제만 복사 · 답안 작성 요령                                       ghost links
┌ sticky ───────────────────────────────────────┐
│ [      1교시 시작 · 타이머 100분      ]         │
└────────────────────────────────────────────────┘
```

- Sticky primary by state: "1교시 시작 · 타이머 100분" (`mock-start` → `setPresetAsk('p1', tStart, {ctx:{kind:'mock', D, pk:'p1', label:'1교시 단답'}})`, stays on this page) → while running or after time-up "1교시 다 썼어요" (`mock-part`) → "2교시 시작 · 타이머 50분" (`mock-start`, custom preset 25 × n minutes) → "2교시 다 썼어요" → step ③ 채점: ① "답안 사진 찍기" ② secondary "채점 요청 복사" (`copy-mock`) ③ "점수 적기(선택)" with number inputs "1교시 [  ]점 · 2교시 [  ]점" (`S.mockp[D].sc`) → primary "채점 받았어요" (`S.mockp[D].g=t`, `touchDay()`) → bar "다음: {next Today row} · {n}분".
- **Explicit handlers** (the old `mock-done` 1443 stores `b.checked` and never renders, so it is not reused by any button): `mock-part` (`data-d`, `data-k`) sets `S.mockp[D][pk]=true`, `touchDay()`, `calMark('mock:'+D+':'+pk,'mock','… {n}교시 다 씀')`, `save()`, `render()`; `mock-undo` deletes the key, `calUnmark`, `save()`, `render()`; the time-up sheet's "다 썼어요" calls the same `mock-part` path. `mock-done` stays only for the checkboxes of the pre-slice-6 page.
- The 채점 step and "다 쓴 뒤 열어보기" (`mock-reveal` 1442) sit in closed `<details>` folds until every part is written — **folded, not absent**: `copy-mock` and `mock-reveal` stay in the DOM, so `native.test.js` 115 (copy-mock on an unwritten mock) and `app.test.js` 338 (reveal) can click them. A small "되돌리기" link (`mock-undo`) sits next to a written part.
- **Time-up sheet** (B §7.5): `TM.ctx={kind:'mock', D, pk, label:'1교시 단답'}` is set when the timer is started here. At zero the interval sets `TM.ended={ctx:TM.ctx, at:Date.now()}` (cleared by `tStart`, `tReset`, `setPreset`); `paintPill` shows "⏱ 시간 끝 · {ctx label, e.g. 1교시}" while `TM.ended` is set and the page is not that mock page (the old rule hid the pill at `TM.remain===0`). If the current page is this mock page, open the sheet "시간 끝 · 1교시 단답" with primary "다 썼어요" (records the part), secondary "5분 더" (+300 s), "닫기"; otherwise only a toast "1교시 시간이 끝났어요" and the pill "⏱ 시간 끝 · 1교시" (tap → `#mock/D`, the sheet opens there). The sheet never opens over `#memo` or `#sess` and never from inside the 250 ms interval while a modal or tape edit is open.
- **Inline timer** (one component, also on ④ 논술 "타이머 25분" and the focused 단답 card "타이머 10분"): `timerInlineHTML(preset, ctx)` renders `.tline[data-timer]`; `paintTimer` (1274) paints `#timerBox` **and** every `[data-timer]` matching `TM.preset`; `paintPill` (1277) hides the pill when the current page shows the running preset inline. Every preset change goes through one guard (T9, §8.2): `setPresetAsk(k, then, o)` used by `timer-go` 1450, `timer-preset` 1451, `timer-custom` 1452 and `mock-start`.
- Before slice 6 (slices 3–5): the existing page plus "채점 받았어요" (button, `mock-graded`) and the score inputs; timer buttons still go to `#timer` (with the T9 confirm of slice 0).
- `#mock/app` uses the same page; "앱이 모의고사 만들기" (`genMock` 993) clears `S.mockp.app`.

### 6.9 연습 tab (`vPractice`, merges `vStudy` 648 and `vTest` 928)

```
연습                                                          h1
범위  [이번 주 단원(토공, 연약) ▾]                                 rangeSel (unchanged select)
새 카드·자유 연습·가리며 외우기·문제에 써요. 카드 복습은 늘 전체 단원이에요.     .note
카드
  카드 복습 14장 · 전체 단원                                  ›   start-due (same N as 복습)
  새 카드 10장                                               ›   start-study (new cards in range only)
  자유 연습 30장                                             ›   start-free
  가리며 외우기 20장 · 별표·오답 먼저                           ›   memo-study ("이어서 3/20" + ghost "이어 하지 않고 처음부터")
문제
  4지선다 10문 ›   용어 회상 10문 ›   수치 빈칸 10문 ›
  빈칸 쓰기 10문 ›   논술 목차 떠올리기 5문 ›   단답 답안지 1문 · 10분 ›
실전
  주간 모의고사 · 10/31 · 1교시 ○ 2교시 ○ 채점 ○                ›   (older: "최근 모의고사 · 10/24 · …")
  기출 문제은행 · 제116~141회 26회분                           ›   #kichul
  앱 모의고사 만들기 · 기출·약점 가중으로 1~4교시                 ›   gen-mock
▸ 단원별 진도 · 학습 / 정답률                                      unit rows; tap = 이 단원 카드 외우기 (study-unit)
```

All rows are rows (no secondary buttons); the screen has no primary (a hub with no single next action).

### 6.10 더보기, 통계, report, calendar, settings, archive, backup, schedule, timer

- **더보기** (`vMore` 1024): as §2.1; the version moves from the subtitle to the footer note "기술사 6개월 v3.0.0"; the backup row shows "마지막 백업 10/18" (or "아직 백업한 적이 없어요"); the sync line appears only on failure.
- **통계** (`vStats` 1002): tiles "학습한 카드 83/362", "이번 주 필수 18%", "핵심 끝낸 세트 2/5"; "7일 체크 달성" retired; new list "주간 기록" from `S.wk` ("1주차 93% · 2주차 …", newest first, ≤8, "60% 넘은 주 n주 연속"); unit table and 세트 퀴즈 정답률 kept; "모의 점수" from `sc` when present.
- **Report keyed by the week it covers** (`report` 1448 gets `data-w`): `weeklyReport(W)` covers W..min(W+6, today) (the old rolling t−6..t window goes) and reads `weekBoard` for the current week or `S.wk[W]` for a past one.

  | Where, when | Copies | Ticks |
  |---|---|---|
  | Today's Sunday row, or 통계 on Sat/Sun | `weeklyReport(W)` | `S.tk['report:'+W]` (contract line 7) |
  | Today's Monday row "지난주 리포트 아직" | `weeklyReport(LW)` (LW..LW+6, `S.wk[LW]`) | `S.tk['report:'+LW]` |
  | 통계 Mon–Fri | `weeklyReport(W)` so far | nothing; toast "복사했어요. 토·일요일에 복사하면 이번 주 리포트로 쳐요" |
- **Weekly report** (`weeklyReport` 1010): the checklist-rate line becomes "이번 주 필수 18%(넘침 단계 1): 세트 핵심 2/5, 모의 0/3, 단답 0/5, 목차 2/10, 새 용어 쓰기 4/20, 세트 복습 1/14, 주간 리포트 0/1"; sets report "핵심 끝" instead of "완료"; the mock line adds "채점 받음 · 1교시 62점 · 2교시 55점" when present. `PE_PROMPTS` 7 (app-only text) "다음 주 평일 5일치 '논술 1문제' 배정" becomes phase-aware ("1단계면 '단답 5문'").
- **학습 달력** (`vCal` 1070): the 5-line version note goes; weekend empty copy "아직 끝낸 공부가 없어요. 오늘 몫 1번부터 시작해 보세요"; from slice 7, hollow forward dots for this week only (amber = Saturday mock, violet = Sunday close, ink3 = a pending 세트 복습 due date), legend "앞으로(이번 주)". `calItems` keeps reading old `S.checks` ticks.
- **설정** (`vSettings` 1138): new section "하루 공부 시간" with three segmented rows — 평일 "2시간 · 2시간 30분 · 3시간 · 4시간", 토요일 "3시간 · 4시간 · 5시간 · 6시간", 일요일·공휴일 "2시간 · 3시간 · 4시간 · 5시간" — note "오늘 몫과 '이번 주' 계산이 이 시간을 써요. 바꾸면 오늘 몫을 다시 짜요."; saving writes `S.settings.budget`, `S.tk.budget`, and re-plans (§3.7 step 9). The "시험 일정" row is removed (it lives in 더보기). The label "하루 새 카드 수(암기 탭)" (1144) becomes "하루 새 카드 수(연습 → 새 카드)" in slice 5. 아이디 지우기 and the app-only 알림 section untouched.
- **Tab words** (slice 5): `tabWords(s)` = `s.replace(/(앱 )?테스트 탭/g,'연습 탭').replace(/암기 탭/g,'연습 탭').replace(/플랜 탭/g,'이번 주 탭').replace(/테스트 → 기출 회차/g,'연습 → 기출 문제은행(회차별)').replace(/테스트 → 기출 단원별/g,'연습 → 기출 문제은행(단원별)').replace(/다시 볼 세트/g,'세트 복습')`, applied inside `weekObj` after `fillT` (goals, `t`, `out`) and to the `PE_ROUTINES` lines of the 로드맵 reference fold, so every render of a goal is fixed while `data_plan.js` `PE_WEEKS` stays equal to `pipeline/curriculum.json` (lines 154, 421). App-only strings are edited in place: `HW_HOW.rev` 404 "(연습 탭 가리며 외우기에 먼저 나와요)"; the `memo-study` label 1381 "연습 카드" (shown in the calendar line "가리며 외우기: 연습 카드 n/m장" and in "이어서"); `PE_PROMPTS` p9 name "모의고사 채점 (모의고사 화면 "채점 요청 복사"의 기본 틀)"; `PE_CLAUDE_ROUTINE` 153 "앱 오늘 화면과 연습 → 실전에 들어온다", 154 "오늘 몫의 세트 복습·오답을 끝내고, 일요일 오늘 몫의 "주간 리포트 복사"를 …", 157 "연습 → 기출 문제은행에서".
- **세트 보관함** (`vArchive` 636): right column "핵심 ✓ · 숙제 필수 3/5" or "용어 5/10 · 퀴즈 0/5"; mocks "1교시 ✓ · 2교시 ○ · 채점 ○"; a row opens `rev-open`.
- **백업** (`vBackup` 1151): "마지막 백업 {M/D}"; `backup-copy`/`backup-dl` write `S.tk.backup`.
- **시험 일정** (`vSchedule` 1103): one-line warning when the start date is not a Monday.
- **타이머** (`vTimer` 1278): T9 confirm on every preset change (`setPresetAsk`); when it ends on `#timer` without a context: "시간이 끝났어요" + "돌아가기".
- **단답 답안지** (`vDandap` 1209): opened as `#dandap/<id>/<D>` from 숙제 it shows primary "다 썼어요(숙제에 표시)" (writes `sp(D).hw['dd'+i]=1` through the `hw` path); opened from 연습 or "단답 1문제 더" it shows "다 썼어요" that ticks `x.dd2:<t>`.

---

## 7. Navigation model

### 7.1 Router state (memory only, never in `S`)

```js
const TABS=['today','week','review','practice','more'];        // slice 5; slices 1–4: ['today','review','study','test','more']
const TAB_ALIAS={study:'practice',test:'practice'};           // slice 5 (slices 1–4: {}); resolved in parseHash/tabOf, no redirect
const PARENT={set:'today',cal:'today',week:'today'/* page until slice 5 */,
  mock:'practice',kichul:'practice',dandap:'practice',            // slices 1–4: 'test'
  stats:'week',                                                   // slices 1–4: 'test'
  archive:'review',wrong:'review',
  guide:'more',timer:'more',plan:'more',schedule:'more',settings:'more',backup:'more',about:'more',prompts:'more',imp:'more',admin:'more'};
let RET={};       // page key → hash it was entered from (nav on push; "다음" transitions pass the origin)
let HS=[];        // HS[n] = hash of the history entry at depth n
let DEP=0;        // depth of the current entry, stored in history.state.n
let NAVK=null;    // 'replace' while our own location.replace is in flight
let PEND=null;    // {t:tab} while a tab unwind is in flight (an object, so a stale fallback timer can tell it is not its own)
let LOCK=0,LK=0;  // LOCK = token of the traversal in flight (lock()); nav/goUp/goTab are ignored until route() lands or 300 ms pass
let LASTH='';     // location.href of the entry route() handled last (lets hashchange skip what popstate already did)
let FLOW=null;    // {id, from:'today', at}: the Today row (or 이번 주 line) that started the current step; at = the hash it opened (§7.5)
```

**One hash format.** Every stored hash has no leading `#`. `nh()` normalizes `SES.from`, `MEMO.from`, `MEMO.outer.from`, every `RET` value and `FLOW.from`/`FLOW.at` when they are written, and `upOf`/`tabOf` apply it again when they read them (today's code writes `'#'+R.page…` at 662 and 852 and copies it in `memo-again` 1384; `sess-close`/`memo-close` strip it by hand).

### 7.2 PARENT / up table

| Screen | Up = `RET` if set and valid, else | Back label | Notes |
|---|---|---|---|
| `#set/D` | `today` | RET's name, usually "오늘" | deep link `#set/D/<tab>` canonicalized |
| `#week` (page until slice 5) | `today` | "오늘" | a tab root from slice 5 |
| `#cal` | `today` | "오늘" / "더보기" / "이번 주" | |
| `#mock/D`, `#mock/app` | `practice` (`test` before slice 5) | "오늘" / "연습" / "이번 주" | focus mode while its timer runs |
| `#kichul`, `#kichul/u` (segments) | `practice` | "연습" | segment switch = replace |
| `#kichul/r/N` | `kichul` (fixed) | "기출" | |
| `#kichul/u/N` | `kichul/u` (fixed) | "단원별" | |
| `#dandap/id[/D]` | `practice` | "세트" / "연습" | |
| `#stats` | `week` | "이번 주" | |
| `#archive`, `#wrong` | `review` | "복습" | |
| `#guide`, `#timer`, `#plan`, `#schedule` | `more` | origin's name | |
| `#settings`, `#backup`, `#about`, `#prompts`, `#imp`, `#admin` | `more` (fixed) | "더보기" | |
| `#sess` | `nh(SES.from)` (full hash incl. `R.b`); `today` when `SES` is null | "닫기" | no live `SES` → guard |
| `#memo` | `MEMO.outer` → back to the outer memo (in `goUp`); else `nh(MEMO.from)`; `today` when `MEMO` is null | "닫기" | no `MEMO` → guard |

`RET[page]` is valid (`retOk`) when it is not the page itself, and when it is `sess`/`memo` only while that flow is alive.

### 7.3 History model: one `popstate`-driven `route()`, depth in `history.state`, pop-or-replace, unwind with fallback, lock

Per the HTML spec, back/forward/`go()` between two entries with the same fragment fires **only** `popstate` (no `hashchange`; reproduced in jsdom by `critic/samehash.js`), and such pairs can arise. So the depth, guard and render logic runs in a `popstate` listener, which fires on every traversal; `hashchange` only covers engines that fire no `popstate` for a fragment navigation and skips anything `popstate` already handled. All helpers are code, not prose:

```js
const nh=h=>decodeURIComponent(String(h||'')).replace(/^#\/?/,'');             // the one normalizer: no leading '#'
const curH=()=>nh(location.hash)||'today';
const isTab=h=>{const p=nh(h).split('/')[0];return TABS.includes(p)||!!TAB_ALIAS[p];};
const tabKey=h=>{const p=nh(h).split('/')[0];return TAB_ALIAS[p]||p;};
function retOk(h,page){const p=nh(h).split('/')[0];return!!h&&p!==page&&!(p==='sess'&&!SES)&&!(p==='memo'&&!MEMO);}
function upOf(r){r=r||R;                                                        // null-safe: never throws
  if(r.page==='sess')return nh(SES&&SES.from)||'today';
  if(r.page==='memo')return nh(MEMO&&MEMO.from)||'today';                      // the outer memo (T5) is handled in goUp
  if(r.page==='kichul'&&r.b)return r.a==='u'?'kichul/u':'kichul';
  const ret=nh(RET[r.page]);if(retOk(ret,r.page))return ret;
  return PARENT[r.page]||'today';}
function tabOf(h,k){h=nh(h)||'today';k=k||0;const p=h.split('/')[0];           // §7.8
  if(TABS.includes(p))return p;if(TAB_ALIAS[p])return TAB_ALIAS[p];if(k>5)return 'today';
  if(p==='sess')return tabOf(SES&&SES.from,k+1);if(p==='memo')return tabOf(MEMO&&MEMO.from,k+1);
  const ret=nh(RET[p]);return tabOf(retOk(ret,p)?ret:(PARENT[p]||'today'),k+1);}
const UP_LABEL={today:'오늘',week:'이번 주',review:'복습',practice:'연습',study:'암기',test:'테스트',more:'더보기',
  set:'세트',kichul:'기출','kichul/u':'단원별',mock:'모의고사',cal:'달력'};        // study/test only in slices 1–4
const upLabel=h=>{h=nh(h);return UP_LABEL[h]||UP_LABEL[h.split('/')[0]]||'뒤로';};
function lock(){const k=++LK;LOCK=k;setTimeout(()=>{if(LOCK===k)LOCK=0;},300);}

function route(){const st=history.state,h=curH();let n;                         // every history change lands here
  if(st&&typeof st.n==='number')n=st.n;          // a traversal (back/forward/go, edge swipe) or an entry already stamped
  else if(NAVK==='replace')n=DEP;                 // our own location.replace
  else n=DEP+1;                                   // a push: nav(), or a direct location.hash= (tests)
  NAVK=null;if(!st||st.n!==n)history.replaceState({n},'',location.href);
  DEP=n;HS.length=n+1;HS[n]=h;LOCK=0;LASTH=location.href;closeModal();        // T8
  try{
    if(PEND&&n===0){const t=PEND.t;PEND=null;if(h!==t)return rep(t);}        // a tab unwind landed on the root entry
    R=parseHash();
    if((R.page==='sess'&&!SES)||(R.page==='memo'&&!MEMO))return hop(upOf(R)); // empty-flow guard, backward and forward
    if(R.page==='set'&&R.b){SV[R.a]=R.b;HS[n]='set/'+R.a;history.replaceState({n},'','#set/'+R.a);LASTH=location.href;R=parseHash();}
    onEnter(R);                                   // entry side effects (kichul:W on Sat/Sun), never inside render
  }catch(e){console.error(e);R=parseHash();}      // the listener is outside render's try/catch (348–352)
  if(R.page!=='memo')memoStop();render();window.scrollTo(0,0);}
window.addEventListener('popstate',route);       // every traversal, same fragment or not; also pushes/replaces in current engines
window.addEventListener('hashchange',()=>{const st=history.state;
  if(st&&st.n===DEP&&location.href===LASTH)return;                              // popstate already handled this change
  route();});                                     // an engine without popstate on fragment navigation
function rep(h){h=nh(h)||'today';if(curH()===h){R=parseHash();return render();}NAVK='replace';location.replace('#'+h);}
function hop(h){h=nh(h)||'today';if(isTab(h))return goTab(tabKey(h));          // pop-or-replace: goUp, every "다음", the guard
  if(curH()===h){R=parseHash();return render();}                               // session → session renders in place
  const k=HS.lastIndexOf(h,DEP-1);
  if(DEP>0&&k>=0){lock();return history.go(k-DEP);}                             // pop to it: no duplicate is left below
  rep(h);}
function nav(h,o){o=o||{};closeModal();if(LOCK)return;h=nh(h)||'today';
  if(isTab(h))return goTab(tabKey(h));            // a tab never stacks: restore, reset, PE_IO._go, data-h tab links, empty states
  const p=h.split('/')[0];
  if(p!=='sess'&&p!=='memo'&&p!==R.page)RET[p]=nh(o.from)||curH();
  if(o.replace)return hop(h);
  if(curH()===h){R=parseHash();return render();}
  location.hash=h;}
function goUp(up){closeModal();if(LOCK)return;
  if(!up&&R.page==='memo'&&MEMO&&MEMO.outer){const o=MEMO.outer;memoStop();MEMO=o;return render();}   // T5
  hop(up||upOf(R));}
function goTab(tab){closeModal();if(LOCK)return;tab=tabKey(tab);FLOW=null;
  if(DEP===0){if(curH()===tab){R=parseHash();render();return window.scrollTo(0,0);}return rep(tab);}   // re-tap scrolls up
  const p=PEND={t:tab};lock();history.go(-DEP);                                // exact depth, so no overshoot
  setTimeout(()=>{if(PEND!==p)return;const st=history.state;                   // fallback: an overshooting go() is a silent no-op
    if(st&&typeof st.n==='number'){DEP=st.n;HS.length=DEP+1;HS[DEP]=curH();}   // re-sync from the entry before replacing
    PEND=null;LOCK=0;rep(tab);},300);}
const chainSession=o=>startSession(Object.assign({},o,{from:SES&&SES.from,replace:true,keepFlow:true}));   // origin and FLOW kept
// startSession(o) 662: from=nh(o.from)||(R.page==='sess'&&SES?SES.from:curH())  (a restart on #sess keeps the origin; never 'sess' itself)
// startMemo(o) 849:    from=nh(o.from)||curH()  ('sess' when started on a session or its end screen)
//   both: FLOW=null unless o.keepFlow||(FLOW&&curH()===FLOW.at);
//   then o.replace ? hop('sess'|'memo') : nav('sess'|'memo')   (already on #sess/#memo → renders in place)
// init (1490): const st=history.state; if(st&&typeof st.n==='number'){DEP=st.n;HS[DEP]=curH();}
//   else {history.replaceState({n:0},'',location.hash?location.href:'#today');DEP=0;HS=[curH()];} LASTH=location.href;
// window.__pe gains go:h=>nav(h), DEP:()=>DEP, HS:()=>HS.slice()
// bridge.js 50 (web code): _go(h){const pe=window.__pe;if(pe&&pe.go)return pe.go(h);location.hash=h;}
```

- Verified in jsdom: `ux/final/hist_depth.js` (the depth counter) and `ux/final/route_probe.js`, which runs this code with stand-in `SES`/`MEMO` and prints "모두 통과" for 21 checks: the critic's two cases (① memo → "다음: 세트 퀴즈" leaves [#today, #set/D] and 뒤로 lands on #today at `DEP 0` with `history.length` unchanged; memo over a review end screen → "다음 세트 복습" renders on the `#sess` entry below), an own-next restart on `#sess` keeping its origin, `nav('today')` from depth 3 unwinds to `DEP 0` and a tab after it stays at 0, the guard with `SES=null` (no console error), an edge swipe and 닫기 mid-session keep `SES`, a stale forward `#memo`, the lock, a hand-made same-fragment pair tracked by `popstate` alone, and the fallback. The probe also caught a defect of the first draft: a stale 300 ms fallback acted on a newer unwind (`PEND` was a bare tab name); `PEND={t}` and the `lock()` token fix it.
- `back()` 344 → `goUp()`; the tab bar handler 1484 → `goTab(b.dataset.tab)` (re-tapping the current tab scrolls to the top); every tab hash that reaches `nav` (restore 1474 and reset 1475 `nav('today')`, `PE_IO._go`, `data-h` tab links, the empty-state "오늘로") becomes `goTab`, so no code path pushes a tab. The end-screen buttons follow §7.6.
- A process restart of the WebView resets history to one entry (`App.js`), so `DEP=0` and the guard holds.

### 7.4 Push vs replace

| Action | History |
|---|---|
| Tab bar tap | `goTab`: unwind to depth 0, then replace with the tab; a tab never stacks on a tab (T7) |
| Row on a tab root → page; page → deeper page | push; `RET[page]` = current hash |
| Segment / sub-tab (set tabs, 기출 회차별↔단원별, guide tabs, calendar month, `GQ_MODES`) | no entry or replace (T10) |
| Start a session / 가리며 외우기 from a page | push `#sess`/`#memo` (`from=curH()`, keeps `R.b`, T6) |
| Topbar back/닫기, edge swipe | `goUp()` → `hop(up)`: pop to the nearest earlier entry equal to the up target, unwind when it is a tab, else replace; `SES`/`MEMO` are kept |
| End-screen "오늘로"/"…로" (`sess-close`), "돌아가기" (`memo-close`) | finished flows only: read the up target, clear `SES`/`MEMO`, then `goUp(up)` (§7.6) |
| **"다음"** (end screen, set-page bar, mock bar, 이번 주 primary) | through `hop` (§7.5): session → session renders in place on the same `#sess` entry (the new `SES` inherits `from` and `FLOW`); a target already below is popped to (never duplicated); anything else **replaces** the current entry and passes the origin (`nav(x,{replace:true,from:origin})`, `startSession({…,from:origin,replace:true})`). History never grows during a chain, so "닫기" after three chained tasks lands on 오늘. |
| "오늘 몫 끝 · 오늘로", "오늘 순서로", page-less "다음" | `goTab('today')` |
| Any tab hash given to `nav`: restore 1474 and reset 1475 (`nav('today')`), `data-h` tab links, the empty-state "오늘로", notification open (`PE_IO._go` → `__pe.go`) | `goTab` (unwind + replace); the modal closes |

### 7.5 End screens and "다음"

`endCard(ctx)` renders both `sessDone` (709) and `memoDoneHTML` (891):

```
끝
10월 27일 세트 복습 완료                                   h3
맞힘 12 · 애매 2 · 틀림 1                                  one result line
[    다음 세트 복습: 10/28(수) 1일 차 (2/2) · 8분    ]       primary (nextAfter)
[ 오늘로 ]                                                 secondary = sess-close / memo-close (label = upLabel of the up target)
외우기로 다지기 · 틀리거나 애매한 카드 가리며 외우기 (3장) · 방금 본 카드 가리며 외우기 (15장)   text buttons (existing memo-sess)
```

`nextAfter(ctx)` picks the primary by **precedence** (the first rule that applies wins); the first lower rule that also applies and differs is shown as one text link under it ("또는: 3회 풀기 (15문)", "오늘 순서: {next row}"):

| # | Applies when | Primary |
|---|---|---|
| 1 | the flow did not count: a 세트 복습 (`SES.kind==='rev'`, or `revD`/`setD` on a set whose review is due) with `!enough(SES)` (D3), or a `cards`/`wrong` session started from its Today row below that row's threshold | "이어서 · 남은 {k}문제" (a session of the items whose index is not in `SES.done`, carrying `SES.acc`, §8.1) |
| 2 | a review chain or group: `SES.chain` has a next set (Today `rev` group, 복습 "세트 복습 시작", or a due row's review sheet) | "다음 세트 복습: {M/D}({요일}) {n}일 차 ({i}/{m}) · 8분" → `chainSession` |
| 3 | a FLOW Today row: `FLOW` is set (FLOW rule below) | FLOW's row still open → "다음: {its next step}" (e.g. "다음: 용어 읽기 7/10", back to `FLOW.at` through `hop`); else "다음: {next undone row} · {n}분" (pointer rule of §4.6; none after it → the first before it as "아까 넘긴 것: {title}") → `taskGo(next,{replace:true})`. A next row with no page (`x.book`, `goal`, the inline report) → `goTab('today')` with `UI.act=id`, so 오늘 opens with that row active |
| 4 | the finished kind has an own next (table below) | as listed |
| 5 | otherwise | "오늘 순서로" (`goTab('today')`); "오늘 몫 끝 · 오늘로" when nothing is left today |

Own next by kind (`SES.kind` is set by every starter; a memo by `MEMO.key`):

| Kind | Own next |
|---|---|
| `gq` (`startGq` stores `SES.gq={d,mode}`; the mode is no longer read from `SV['gqm:'+d]`) | round → "다음: {k}회 풀기 (15문)" (`startGq(d,'next')`); term → "다음: {next term with unanswered questions} ({n}문)" (`'t:'+id`); rand → "다음: 무작위 15문 더"; wrong → "다음: 틀린 문제만 다시 ({n}문)" while wrong ones remain; all, or nothing unanswered → none (falls through) |
| `flash` (`set-flash`) and `memo:set:D` | the set quiz still open → "다음: 세트 퀴즈 5문" (`SV[D]='quiz'`, `nav('set/'+D,{replace:true})`: pops when `#set/D` is below) |
| `wrong` | wrong cards left → "다음: 오답 카드 가리며 외우기 ({n}장)" |
| `mcq`, `recall`, `cloze`, `fill` | "다음: 4지선다 10문 더" / "다음: 용어 회상 10문 더" / "다음: 수치 빈칸 10문 더" / "다음: 빈칸 쓰기 10문 더" (same starter, range and level; renders in place and keeps the session's origin) |
| `outline` | "다음: 논술 목차 떠올리기 5문 더" |
| `stars`, `free`, `cards` (`startDueAll`), `study` (새 카드), `rot` | none → rule 5 |
| `memo:study`, `memo:wrong`, `memo:stars`, `memo:rev` | none → rule 5 |
| `memo:sess`, `memo:one` started on `#sess` | "돌아가기 · {SES.title}" (`goUp`: back to the session or its end screen) |

- So a 용어 퀴즈 started from a Today review row counts as that 세트 복습 and takes rule 2 (or 1), one started from Today's 용어 퀴즈 fold row takes rule 3 with "또는: {k}회 풀기" as the link, and one started from ② 퀴즈 takes rule 4.
- Every "다음" goes through `hop`: session → session renders on the same `#sess` entry; a target already below the current entry is popped to, never duplicated (① 가리며 외우기 → "다음: 세트 퀴즈 5문" leaves [#today, #set/D], not [#today, #set/D, #set/D]); anything else replaces the current entry with the origin passed on (`nav(x,{replace:true,from:origin})`, `startSession({…,from:origin,replace:true})`). History never grows during a chain, so 닫기 after three chained tasks lands on 오늘.
- **FLOW rule.** `taskGo(row,o)` sets `FLOW={id, from:'today', at}` (`at` = the hash it opens: `set/D`, `mock/D`, or `sess`/`memo` for session rows) and starts the row with `keepFlow`. FLOW survives only along its own chain: on `at`, in a session or memo started from `at` (`startSession`/`startMemo` keep it when `o.keepFlow || curH()===FLOW.at`), and through "다음" (`taskGo(next,{replace:true})` sets the next row's FLOW). Rendering `#today`, `goTab`, and starting any flow from another screen clear it, so a later tool session never looks Today-started.

Side effects run once, when the end card first renders (flags on `SES`/`MEMO`): `logTest` (T3, `SES.logged`), calendar marks (existing), review marking only when `enough(SES)` (D3, both paths), `S.tk['wrong:'+t]` for a 오답 session with `enough(SES)`, `S.tk['cards:'+t]` for a 카드 복습 session from the Today row that graded ≥ min(20,k). The memo end screen drops its "학습 달력" button.

### 7.6 Guards, finished flows and modals

- `route()` closes modals first (T8); `nav`, `goUp`, `goTab` close them too.
- **Guard.** `#sess` without a live `SES`, `#memo` without `MEMO` (old entries, forward swipes, restarts, a direct `location.hash='#sess'`) → `hop(upOf(R))` before rendering. `upOf` is null-safe (`today` when the flow is gone), so the guard cannot throw inside the listener, and `route()` wraps its pre-render steps in try/catch. The empty states in `vSess` 663 / `vMemo` 896 stay as a last resort with "오늘로" (`data-h="today"` → `goTab`) instead of "암기 탭으로".
- **Finished vs unfinished flows — one rule.**
  - The end-screen buttons exist only on a finished flow: `sess-close` (the end card's secondary, "{upLabel}로", e.g. "오늘로") and `memo-close` ("돌아가기"). They read the origin first, clear the finished object, then go up:
    `case'sess-close':{if(LOCK)return;const up=upOf(R);SES=null;return goUp(up);}`
    `case'memo-close':{if(LOCK)return;if(MEMO&&MEMO.outer){const o=MEMO.outer;memoStop();MEMO=o;return render();}const up=upOf(R);MEMO=null;return goUp(up);}`
    So the `!M()` check of `app.test.js` 674 (after `memo-close`) stays as it is (Appendix A); only that line's label text changes in slice 4.
  - The topbar back / "닫기" (`data-act="back"` → `goUp()`) and the iOS edge swipe **never** clear `SES` or `MEMO`. An unfinished flow stays resumable (the Today "이어서" row, walkthrough H), and a finished `SES` under a memo stays reachable (J: end screen → "틀리거나 애매한 카드 가리며 외우기" → 닫기 → the same end screen; tests 297–303; CLAUDE.md "뒤로 가면 보던 세션으로").
  - "다음" replaces the finished object by the next step's own (a new `SES` or `MEMO`); when the next step is a page, the finished object stays in memory, so a forward swipe onto its entry shows its end screen again (harmless). `SES` is otherwise replaced only when a new session starts; `MEMO` only when a new memo starts.
- `#set/D/<tab>` is canonicalized to `#set/D` (§7.3) so `RET`/`from` values stay stable.
- Sheet in sheet: the fill level sheet shows "‹ 다른 방법"; `star` (1363) re-renders only the star button inside a multi-card modal (기출 문항) instead of replacing it.

### 7.7 Focus mode and sticky bars

- `render()` toggles `body.focus` when `R.page` is `sess` or `memo`, or `mock` while `TM.running && TM.ctx && TM.ctx.D===R.a`. CSS: `body.focus nav.tabs{display:none}`, bottom padding = safe area + sticky bar.
- Topbar in focus mode shows "닫기" on the same `data-act="back"` button (test 183 keeps its selector).
- 가리며 외우기: "시작/일시정지" + "‹ 이전 · 다음 ›/완료" move into a sticky bottom bar `.mctl` (fixes "시작 below the fold", `shots/17-memo__1.png`); the settings summary shortens to "설정 · 보기 10초 · 가림 5초 · 무작위 2줄 · 3회" (it keeps the mode — 전체 / 고른 줄 / 무작위 n줄 / 테이프 — so `app.test.js` 567 `/무작위 2줄/` passes unchanged). The tape's window `touchmove` listener (841, `passive:false`) and the `.tsl` overlay are not touched; drawing tape next to the bar is on the device checklist.
- Card sessions: "다음 ›" before grading reads "건너뛰기" (same `sess-skip`).
- **Keyboard**: `focusin`/`focusout` on `INPUT`/`TEXTAREA` toggle `body.kb`, which hides `.nextbar`, `.mctl` and the mock sticky bar (빈칸 쓰기, 앞글자 input, score inputs), because the iOS keyboard would push them over the field.

### 7.8 Tab highlight and back label

- `parseHash` 341 sets `r.tab = tabOf(curH())` (code in §7.3): a tab or alias → itself; `sess` → `tabOf(SES.from)`; `memo` → `tabOf(MEMO.from)`; a page with a valid `RET` → `tabOf(RET)` (depth ≤5); else `PARENT`; with `SES`/`MEMO` gone, `today`. So 오늘 → 세트 → 답안 작성 요령 → 타이머 stays "오늘" (T11), 더보기 → 학습 달력 stays "더보기".
- `topbar(title)` 357 shows `upLabel(upOf(R))` instead of "뒤로" (`UP_LABEL`, §7.3): 오늘, 이번 주, 복습, 연습, 더보기, 세트, 기출, 단원별, 모의고사, 달력 (암기, 테스트 in slices 1–4); any other target reads "뒤로"; "닫기" in focus mode. The end card's secondary uses the same label ("오늘로", "세트로").

### 7.9 Resumes ("이어서")

- Today's "이어서" row (§4.5). Resuming refreshes the origin to where it was resumed from: `set-flash` 1343 sets `SES.from=curH()` before `nav('sess')`; `startMemo` 850 sets `MEMO.from=curH()` (T4); both already normalized (no `#`). Memo inside memo (`startMemo` while `R.page==='memo'&&MEMO&&!MEMO.fin`) stores `MEMO.outer` (T5).
- Labels "카드 넘겨 보기 이어서 (n/m)", "가리며 외우기 이어서 (n/m)", "이어 풀기: n회" stay; `S.resume` persistence unchanged.

### 7.10 Gestures

- Keep `allowsBackForwardNavigationGestures` (`App.js` 249): every back and forward target is valid thanks to `goUp`, the depth mirror and the guard.
- In-page swipes (session cards, memo, calendar; `touchstart` 1324) ignore touches that start within 24 px of **either** edge, so the iOS back and forward gestures no longer compete with them (T15).

### 7.11 Walkthroughs (each becomes a test, §10)

| # | Steps | Back / close lands on | Highlight |
|---|---|---|---|
| A | 오늘 → row "단답 1문제" → `#set/D` ③ focused → [답안지] (`#dandap/<id>/<D>`) → 뒤로 → "다 썼어요 · 단답 1문" → "✓ 끝 · 다음: 목차 옮겨 적기 4번" (replace) → 뒤로 | 오늘 (one entry popped); no stale set page in between | 오늘 throughout |
| B | 오늘 → 세트 복습 2개 "시작" → end → "다음 세트 복습" → end → "오늘로" | 오늘; the second session rendered in place on the same `#sess` entry | 오늘 |
| C | 복습 → 오답 카드 가리며 외우기 → long-press a word → card modal → 가리며 외우기 (inner) → 완료 → 돌아가기 | the outer 오답 memo at its card (T5); then 닫기 → 복습 | 복습 |
| D | 오늘 → row "용어 10개 읽기" → `#set/D` → ④ → "답안 작성 요령" → 모범 답안 tab → 뒤로 → 뒤로 | `#set/D` on ④ (SV), then 오늘 | 오늘 throughout (was 오늘 → 테스트) |
| E | 연습 → 기출 문제은행 → 단원별 → 기초 → "이 단원 카드 외우기" → end → 돌아가기 → 뒤로 → 뒤로 | `#kichul/u/3` (T6) → `#kichul/u` → 연습; `S.range` unchanged | 연습 |
| F | Sunday notification (`_go('review')`) while the review sheet is open | `#review`, sheet closed, "오답 노트" present | 복습 |
| G | Sat: mock 1교시 timer running → 닫기 → set page → ④ "타이머 25분" | dialog "돌고 있는 1교시 단답 타이머(남은 87:12)를 멈추고 논술 1문 25분으로 바꿀까요?"; 취소 keeps the 100-minute timer | – |
| H | 오늘 → row "용어 10개 읽기" → `#set/D` → "카드 넘겨 보기" (focus mode, tab bar hidden) → edge swipe mid-way → 뒤로 | `#set/D` with `SES` kept (tool row "카드 넘겨 보기 이어서 (6/10)"), then 오늘, whose active row reads "이어서 · 6번째 용어부터" and resumes the same session | 오늘 |
| I | 오늘 → tab 이번 주 → tab 연습 → edge swipe on the tab root | nothing earlier than the root (tabs never stack); never an empty flow screen | – |
| J | end screen → "틀리거나 애매한 카드 가리며 외우기" → 닫기 | the same end screen (SES kept) | origin's tab |
| K | deep flow (depth 4) → tab 더보기 | `#more` at depth 0 within 300 ms (unwind) or by the fallback; double-tapping "닫기" during a pop pops once (lock) | 더보기 |
| L | a finished flow closed by "오늘로" (`SES=null`), then an iOS forward swipe onto its old `#sess` | the guard hops to its up (`today` → unwind to the root); no "진행 중인 학습이 없어요", no console error | 오늘 |
| M | 오늘 → row "용어 10개 읽기" → `#set/D` → ① "가리며 외우기" → 완료 → "다음: 세트 퀴즈 5문" → 뒤로 | `#set/D` ② (popped back to, not replaced), then `#today` with `DEP===0`; `history.length` equals its value right after the memo started | 오늘 |
| N | 더보기 → 백업 → 복원 → tab 더보기 (and the same with 초기화) | restore's `nav('today')` unwinds to `#today` at `DEP===0`; then `#more` at `DEP===0` | 오늘 → 더보기 |
| O | depth 3 (오늘 → 세트 → 답안 작성 요령 → 타이머) → notification `PE_IO._go('today')` | `#today` at `DEP===0`, modal closed | 오늘 |
| P | `SES=null`, then `location.hash='#sess'` | `#today`, no console error | 오늘 |
| Q | `#set/2026-10-19` → "카드 넘겨 보기" → flip 2 cards → 닫기 → 오늘 | `pe.SES()` is the same object; 오늘 shows the row "이어서 · 10/19 세트 카드 넘겨 보기 n/10" | – |

---

## 8. Defects fixed

### 8.1 Records (brief P11) and related

| # | Defect | Fix (exact place) | Test |
|---|---|---|---|
| D1 | A wrong card leaves 오답 노트 after one "앎" (`grade` 163 calls `rightOnWrong('C:'+id)` and `sess-grade` 1420 calls it again) | `sess-grade` 1420: `if(it.wrongKey&&g===2&&it.wrongKey!=='C:'+it.id)rightOnWrong(it.wrongKey);` | one 앎 in 오답 다시 풀기 keeps `S.wrong['C:x']` with streak 1; a second session removes it |
| D2 | `sp.first` set only by opening `vSet` (571) → sets read through review tools never enter review | `sp(d)` 296: `if(!S.sp[d].first)S.sp[d].first=todayStr();` — every first write starts the clock (set-open 1342, `sessMarkRead` 723, `memoSeen` 860, `gqSet` 537, `hw` 1358 all pass through `sp()`); the planner and every render path use `spGet` | memo of an unopened set → after card 1 `S.sp[d].first===today`; rendering 오늘 and 이번 주 creates no `S.sp` key |
| D3 | A review counts with nothing graded | **Per-item record**: `startSession` adds `SES.done={}` (index → 1). It is set by index in `sess-grade` 1420, `sess-pick` 1425 (mcq, gq, quiz), `sess-self` 1432 (cloze, outline) and `fillCheck` 233 (typed and checked, give-up included), and — for flash sessions only (`SES.kind==='flash'`, `set-flash` 1343) — in `sess-flip` 1419 when the back is shown: **flipped flash cards count**. `SES.answered` (reset on every advance, 720) and the stats counts are not used. `enough(s)=((s.acc?s.acc.a:0)+Object.keys(s.done).length)>=Math.ceil(0.8*(s.acc?s.acc.n:s.items.length))`. `sessDone` 709 marks on **both** paths — the `onDone` callback (from `startSetReview`) and the `SES.revD`/`SES.setD` branch at 712 (the flash path: `set-flash` sets `setD`) — only when `enough(SES)`; otherwise the end card says "건너뛴 문제가 많아 오늘 세트 복습으로 치지 않았어요 ({a}/{n})" with primary "이어서 · 남은 {k}문제": a session of the items whose index is not in `done`, carrying `SES.acc={d, step, a, n}` (set date, step, items done so far, the original item count) so its count adds to the original. A review whose items are all skipped because they were graded today (rule E1) and that has no quiz counts at once (toast "오늘 이미 본 카드라 세트 복습으로 쳤어요") instead of "이 범위에 문제가 없어요". `memoFinish` 871 keeps "to the last card". | skip through a due review → `sp.rev` unchanged and the line shown; 12/15 answered → marked; a due set's flash session with every card flipped (none graded) → marked, skipped through → not; "이어서" holds exactly the 3 undone items and 3 more done marks it |
| D4 | `startSetReview` 742 uses step 1 when not due, eating tomorrow's review (T12) | `const step=reviewDue(d); … onDone:s=>{if(step&&enough(s))markReviewed(d,step);}` | not-due set: full review → `sp.rev` unchanged |
| D5 | "세트를 끝내면" (390, 594) vs code "연 날로부터" (621) | one sentence everywhere: "세트를 처음 연 날로부터 1·3·7·14·30일 뒤에 세트 복습으로 돌아와요." (390 disappears with the old Today) | text assertions |
| D6 | Index-keyed routine ticks | retired: nothing writes `S.checks`; manual rows use stable ids in `S.tk`; old ticks read as history | no `[data-act="chk"]` on any screen |
| D7 | 숙제 `qz` 0 minutes / counted while pending | §3.5 rule 7 | seg label `③ 숙제 0/5` before the quiz, `/6` after a wrong answer |
| D8 | Stale copy "플랜 탭" (`PE_ROUTINES.prep`), "토요일 06:50" (944) | §3.2, §2.2 | – |
| E1 | Same-day double promotion (`grade` has no same-day guard) | `setReviewItems` 741 skips cards with `pget(id).last===todayStr()`; Today's 카드 row and `startDueAll` skip the cards of today's planned reviews and cards graded today; the day's 오답 row skips today's set `Q:` items; order 세트 복습 → 카드 복습 → 오답 | a card graded in 오답 is not in its set review the same day (K05 case) |
| E2 | `genMock` keeps old app-mock ticks | `genMock` 993: `delete S.mockp.app` | new app mock shows parts unchecked |
| E3 | `star` 1363 replaces a multi-card modal | re-render only the button | 기출 문항 modal survives ☆ |
| E4 | `S.log` lost on back from an end screen (T3) | `logTest` once in `sessDone` (`SES.logged`), removed from `sess-close` | back without "돌아가기" adds one `S.log` entry |
| E5 | `study-unit` 1396 changes `S.range` (T6b) | `startStudy(range,o)` 735 takes the unit; `S.range` untouched | `S.range` unchanged after a unit session |
| P4 | Archive "10/10" for unfinished sets (624); 통계 and report read routine ticks (364, 1010) | §6.10 | text assertions |
| P5 | Three due-card numbers, two sessions | `cardsOut` everywhere (§3.4); 연습 "카드 복습" = `startDueAll` | same N on 복습 and 연습 |

### 8.2 Flow tangles (flows T1–T16)

| # | Fixed? | How |
|---|---|---|
| T1 empty `#sess` after "돌아가기" | yes | `sess-close` (finished flow: read up, `SES=null`) → `goUp(up)` (pop) |
| T2 chain of empty entries | yes | `memo-close` likewise; guard `hop(upOf(R))`; "다음" pops to a target below instead of duplicating it |
| T3 `S.log` lost | yes | E4 |
| T4 resumed flow returns to a stale origin | yes | §7.9 |
| T5 memo in memo loses the outer memo | yes | `MEMO.outer` |
| T6 origin drops `R.b`; `study-unit` changes `S.range` | yes | `from=curH()` in `startSession` 662 / `startMemo` 853; E5 |
| T7 tab switches stack | yes | `goTab` unwind + replace, fallback with the `PEND` token, lock; every tab hash given to `nav` (restore, reset, `PE_IO._go`, `data-h` links) goes through `goTab`; `route()` runs on `popstate`, so same-fragment traversals keep the mirror right |
| T8 modal survives a hash change | yes | `closeModal()` in `route()` (and in `nav`, `goUp`, `goTab`) |
| T9 timer reset without asking | yes | one guard for every preset change — `timer-go` 1450, `timer-preset` 1451, `timer-custom` 1452 and `mock-start` (each calls `setPreset` 1264, which silently clears a running timer): `function setPresetAsk(k,then,o){o=o\|\|{};const busy=TM.running\|\|(TM.remain>0&&TM.remain<TM.total),same=TM.preset===k&&(k!=='custom'\|\|TM.custom===o.mins);const go=()=>{if(k==='custom'&&o.mins)TM.custom=o.mins;setPreset(k);if(o.ctx)TM.ctx=o.ctx;then&&then();};if(!busy\|\|same)return go();PE_IO.ask('돌고 있는 '+PRESETS[TM.preset].n+' 타이머(남은 '+mmss(TM.remain)+')를 멈추고 '+(o.name\|\|PRESETS[k].n)+' '+(o.n\|\|(k==='custom'?o.mins:PRESETS[k].total))+'분으로 바꿀까요?',go,o.no);}` (walkthrough G: "…를 멈추고 논술 1문 25분으로 바꿀까요?"). Cancel = `o.no`: `timer-go` still opens `#timer` showing the running timer, the others just re-render. `PE_IO.ask(msg,yes,no)` gains the optional `no` callback in `bridge.js` 33 (web code; native and `confirm()` paths both call it on cancel) |
| T10 기출 segments push | yes | `data-act="go-rep"` → `nav(h,{replace:true})` |
| T11 highlight jumps | yes | `tabOf` |
| T12 same sheet, different marking | yes | D4 |
| T13 opening a set starts its clock | kept by rule (moving the anchor needs the user's approval, brief §5); copy says it; D2 makes it consistent across tools | – |
| T14 tab bar during sessions; no "이어서" | yes | focus mode + "이어서" row |
| T15 edge swipe vs card swipe | mitigated | 24 px dead zone at both edges; device check |
| T16 Today rows behave differently | yes | every row = one tap to its exact place; the 오답 row always starts the session |

---

## 9. Visual system

### 9.1 Hierarchy rules

1. **Exactly one filled primary per screen.** 오늘: the active row's button, or — with no active row — the no-rows / "오늘 몫 끝" card's button (§4.5). 이번 주: the score card's "다음". Set page: the sticky bar. Mock: the sticky bar. Sessions/memo: their main control. 복습: "세트 복습 시작". 연습 and 더보기: none.
2. **At most 2 visible secondary buttons per screen**; the rest are rows, text links or folds ("다른 방법으로", "더 하기", "시간이 되면", "다른 날로 옮긴 것"). At most one ghost link per region.
3. **Order on hubs**: status → actions → optional folds → reference. Reference (goals, milestones, unit tables) never sits above actions.
4. **Status, not slogans**: tab roots show counts; notes are one line (≈40 Korean characters); no system text on learner screens (sync line, "카드 연결 13/13", calendar version note, "v2.3.2" subtitle all go).
5. **Done recedes**: ✓ in the number, struck title, compact row; finished blocks collapse.
6. **One number, one meaning**: `cardsOut` everywhere; 세트 복습 counts sets (collapsed); zero categories hidden; no raw backlog on 오늘.
7. **Titles wrap to at most two lines** (`-webkit-line-clamp:2`, `overflow-wrap:anywhere`), never single-line ellipsis; checked at 글자 크기 "아주 크게" (`data-fs="xl"`) and in dark mode on every hub.

### 9.2 Components (new CSS in `styles.css`, existing tokens only)

| Class | Spec |
|---|---|
| `.daysum` | flex row, `margin:12px 4px 6px`, .92rem/600 `--ink2`; first `b` 1.06rem/700 `--ink`; right: the "오늘 시간" button (.86rem/700 `--blue`, chevron) |
| `.blk` | block header: flex, `margin:16px 4px 6px`; name .86rem/700 `--ink2` + where cue .8rem `--ink3`; right count `a/b · 약 m분` tabular; `.cur` adds the chip "지금" (`--blue-soft` bg, `--blue-ink` text, .72rem/700) |
| `.plan` | card: `--sheet`, `--r-md`, overflow hidden |
| `.prow` | flex, gap 12px, `padding:12px 14px`, min-height 56px; divider `::before` from 52px; whole row is a `button` |
| `.pn` | 26px circle, .84rem/800; default `--paper` + `--ink2`; `.now` `--blue` bg + `#fff` (dark: `#08142E`, as `.btn` 128–129); `.done` `--ok` bg with ✓ |
| `.pt` / `.pm` / `.pv` | title 1rem/600 1.4, 2-line clamp; meta .86rem `--ink2` 1.4; right value .92rem/700 tabular `--ink2` |
| `.prow.now .btn` | the primary, `margin-top:10px`; ghost "나중에" right-aligned under it |
| `.prow.done` | `padding:8px 14px`; `.pt` `--ink3` line-through; `.pm` hidden |
| `.tag` | "권장"/"여유": 1px `--rule` outline, `--ink2`, .72rem/700, radius 6px |
| `.tkc` | manual check: 26px circle, 2px `--rule`; on = `--ok` fill with ✓ |
| `.resume` | `--blue-soft` bg, `--blue-ink` text, radius `--r-md`, 48px, chevron |
| `.notice` | one-line Monday/phase notice: `--sheet`, .9rem, ghost link right, × to dismiss |
| `.pin` | `--amber-soft` bg, 4px left border `--amber`, flag icon; two `.btn.sm.sec` |
| `.moved` | the "다른 날로 옮긴 것" fold rows: `.pt` + ".pm → 토요일 따라잡기" in `--ink2` |
| `.capseg` | the 오늘 시간 sheet's 4-segment control (existing `.seg` look) |
| `.wkstrip` / `.wkd` | 7-column grid, gap 4px; chip `--sheet`, radius 10px, .74rem/700; glyph 12px: ✓ `--ok`, ◐ half `--blue`, ○ 2px `--ink3` ring, · dotted `--rule`; today `outline:2px solid var(--blue)`. **No red** |
| `.wkline` | .88rem `--ink2`, wraps; level sentence on its own line (`--ink2`; amber only for level 1–2 chip) |
| `.qline` | row: label, `a/b`, 4px bar (`--rule2` track, `--blue` fill, `--ok` complete), minutes, chevron; meta "다음 하나: …" |
| `.score` | card: "다 하면" 1.7rem/800 tabular, "지금" .92rem/700 `--ink2` right; 6px bar with ticks at 60/80 (`--rule`); fill `--blue` (<80) or `--ok`; parts line .84rem |
| `.nextbar` | `position:sticky; bottom:calc(var(--tab-h) + var(--sab) + 8px); z-index:15` (in focus mode `bottom:calc(var(--sab) + 8px)`); one `.btn` with `box-shadow:0 6px 18px rgba(0,0,0,.18)` |
| `.cc.req` / `.ccsep` / `.cc.ext` | required circle 2px solid `--ink2`; separator 1px × 20px `--rule`; extra circles 2px dashed `--rule` |
| `.hw.focus` | 2px `--blue` ring + "이렇게 해요" step list (`.steps3 li` numbered, buttons inline) |
| `.stepper` | mock: three steps with connectors, ○/✓, current step `--blue` |
| `.tline` | inline timer: mm:ss 2rem/800 tabular, part line .86rem, one `.btn.sm.sec` |
| `.mctl` | sticky memo controls (`bottom:calc(var(--sab) + 8px)`) |
| `body.focus` / `body.kb` | hides `nav.tabs` / hides sticky bars while typing |

`.sheet::before` (the red margin rule) is no longer used by hubs; it stays on `.fc` and answer sheets (`.asheet`, 단답 답안지, 답안 작성 요령), where it evokes the 답안지.

### 9.3 Typography (≤6 size/weight pairs per screen)

| Role | Size/weight | Where |
|---|---|---|
| Display | 1.7rem/800 tabular | D-day, "다 하면 n%" (one per screen) |
| Page title | 1.45rem/800 (오늘 date), 1.5rem/800 (other tab roots, was 2rem) | `.ltitle h1`, `.ptitle` |
| Section | 1.06rem/700 | `.sec-h h2`, status `b` |
| Row title | 1rem/600 | `.pt`, `.row .tt` |
| Meta / note | .86–.88rem/500 `--ink2` | `.pm`, `.note`, `.lsub` |
| Small label | .72–.84rem/700 | `.blk`, `.tag`, strip, chips |

오늘 goes from 16 text styles (`shots/01-today.png`) to 6; 숙제 from 20 to ≤7. `rem` scaling keeps 글자 크기 (`data-fs` m/l/xl) working.

### 9.4 Colour = meaning only (existing tokens; no-guilt policy)

| Token | Meaning only |
|---|---|
| `--blue` (+ `-soft`, `-ink`) | action, the current row and block, links, partial progress |
| `--ok` | done (✓, full bars, "필수 ✓"), "다 하면" ≥80 |
| `--amber` | mock/exam, the P0 pin, level 1–2 chips (time pressure that is not failure) |
| `--red` | **only** wrong answers (모름, 오답), a sync failure line, and a dated deadline within 3 days (the 이번 주 badge). Never backlog, never past days, never a level |
| `--violet` | calendar "할 일" dots only (unchanged) |
| `--ink`/`--ink2`/`--ink3` | text levels; `--ink3` rings = open/carried |
| `--sheet`/`--paper`/`--rule`/`--rule2` | surfaces and lines |

The kind-coloured left borders of 숙제 cards (`.k-*-l`) become `--rule`; counters keep their fill colours; the calendar keeps its kind dots and legend.

### 9.5 Dark mode and large text

All new components use the tokens redefined in `styles.css` 15–31 (`prefers-color-scheme` and `[data-theme="dark"]`), so dark mode is automatic; tints use `color-mix(in srgb, <token> 13%, var(--sheet))` as `.gqc` does. Text on `--blue`/`--ok` fills uses `#08142E` in dark mode. Verify in both themes and at "아주 크게": the strip glyphs, the amber pin, `.prow.now` contrast (`--ink` on dark `--blue-soft` #1A2740 ≥4.5:1), two-line titles, the sticky bars above the home indicator.

### 9.6 Size budgets

| Screen | Budget |
|---|---|
| 오늘 | ≤2 phone screens (390×844) on a normal day; ≤12 numbered rows (≤4 per block before "나머지 n개 보기"); folds ≤6 rows then "더 보기"; 이번 주 section ≤5 lines; ≤7 tap targets above the fold |
| 이번 주 | 7 contract lines (+ ≤2 carried, + P0); day list 7 rows |
| 복습 sections | ≤5 rows then "모두 보기 n" |
| 연습 groups | 카드 4 · 문제 6 · 실전 3 |
| Set page | controls never exceed one screen; only content scrolls |
| 숙제 | 필수 section ≤5 cards; "더 하기" folded |

---

## 10. Implementation slices

Eight slices. After **every** slice the app works on its own and `npm test` ends "모두 통과" (`tests/app.test.js`, the new `tests/plan.test.js` from slice 2, `native.test.js`, `gloss.test.js`). Code style follows `app.js` (dense one-line functions, `data-act` delegation). `data/`, `pipeline/`, `native/` and `App.js` are not changed (`native/webBundle.js` is regenerated from `web/` by `scripts/build-web.js`, as after every web change; `web/bridge.js` changes twice: `ask(msg,yes,no)` in slice 0, `_go` in slice 1). If a slice ships to TestFlight on its own, bump `APP_VER`, `app.json` and `package.json` together (2.4.0, 2.5.0 …); slice 7 sets 3.0.0. Bump `?v=` markers whenever `index.html`, `styles.css` or a script changes.

### Slice 0 — Record fixes and safety nets (no IA change) · ≈70 lines app.js, 1 line bridge.js · low risk

- **Add / change:** `fresh()` 49 (+ `tk:{}`, `today:null`, `wk:{}`, `settings.budget`); `budgetOf(t,kind)` (§3.2 code); `MOCK_GRADE_SINCE` placeholder; `sp()` 296 (D2); `SES.kind` on every starter (`rev`, `flash`, `gq`, `wrong`, `cards`, `study`, `free`, `stars`, `mcq`, `recall`, `cloze`, `fill`, `outline`) and `SES.done` written by `sess-grade` 1420, `sess-pick` 1425, `sess-self` 1432, `fillCheck` 233 and, for `flash` only, `sess-flip` 1419; `enough(s)`; `sessDone` 709 (D3 on both paths with `SES.acc`, "이어서", the all-skipped rule; `logTest` once with `SES.logged`; markers `S.tk['wrong:'+t]`, `S.tk['cards:'+t]` by `SES.kind`); `startSetReview` 742 (D4; optional `{chain, acc}`); `setReviewItems` 741 (E1); `startWrong` 744 (`kind:'wrong'`, option `skipQ`); `startDueAll` 739 (`kind:'cards'`, options `{k, skip}`); `sess-grade` 1420 (D1); `sess-close` 1437 (no `logTest`); hashchange 345 + `closeModal()` (T8); `setPresetAsk` for `timer-go` 1450, `timer-preset` 1451 and `timer-custom` 1452 (T9), with `PE_IO.ask(msg,yes,no)` in `bridge.js` 33; `star` 1363 (E3); `genMock` 993 (E2); `study-unit` 1396 + `startStudy(range,o)` 735 (E5); `touchDay()` on every completion path; restore 1474 and reset 1475 → `S.today=null`; copy D8.
- **CSS:** none.
- **Tests** (new block "기록 고침" in `app.test.js`): D1 one 앎 keeps the wrong card, two remove it; D2 memo of an unopened set sets `first`; D3 skip-through leaves `sp.rev` and shows "건너뛴 문제가 많아", 12 of 15 answered marks it, "이어서" resumes only the items not in `SES.done` and its count adds to the original (`SES.acc`); a due set's flash session with every card flipped and none graded marks it, a flash skipped through does not; D4 not-due review leaves `sp.rev`; E1 a card graded in 오답 is absent from its set's `setReviewItems` the same day; T3 leaving an end screen by `history.back()` adds exactly one `S.log` entry; T8 an open modal closes on `location.hash` change; T9 with `w.confirm=()=>false`, `timer-go`, `timer-preset` and `timer-custom` each keep `TM.preset` and `TM.remain` of a running timer, and `timer-go` still opens `#timer`; E5 `S.range` unchanged; E2 new app mock unchecked; a backup without the new keys restores with `tk:{}`, `today:null`, `wk:{}` and the default budget; `JSON.stringify({state:S,sets:SETS})` round-trips the new keys.
- **Acceptance:** all 325 existing assertions pass plus the new ones; the only visible changes are the D3 end-card line and the T9 dialog.

### Slice 1 — Deterministic navigation and focus mode (old five tabs) · ≈130 lines app.js, 1 line bridge.js, ≈15 CSS · medium risk

- **Add** (all as code, §7.3): state `PARENT` (old-tab variant: mock/kichul/dandap/stats → `test`), `TAB_ALIAS={}`, `RET`, `HS`, `DEP`, `NAVK`, `PEND`, `LOCK`/`LK`, `LASTH`, `FLOW`; helpers `nh`, `curH`, `isTab`, `tabKey`, `retOk`, `upOf`, `tabOf`, `UP_LABEL`/`upLabel`, `lock`, `route`, `rep`, `hop`, `goUp`, `goTab`, `chainSession`.
- **Change:** `nav(h,o)` 343 (a tab hash → `goTab`); `back()` 344 → `goUp()`; the hashchange listener 345 → `route()` on `popstate` plus the guarded `hashchange` (depth state, guard both directions, `#set/D/<tab>` canonicalization, `closeModal`); restore 1474 and reset 1475 keep `nav('today')`, which now unwinds; `bridge.js` 50 `_go` → `window.__pe.go`; `window.__pe` gains `go`, `DEP`, `HS`; `parseHash` 341 (`tabOf`); `TAB_OF` 338 (+`week:'today'`, `dandap:'test'`); `render` 347 (`body.focus`); `focusin`/`focusout` → `body.kb`; `topbar` 357 (up label / "닫기"); `startSession` 662 and `startMemo` 849–853 (`from=curH()`, `MEMO.outer`, in-place session chaining helper `chainSession(o)`); `set-flash` 1343 and the `startMemo` resume path 850 (refresh `from`); `memo-close` 1383 and `sess-close` 1437 → the finished-flow rule of §7.6 (read up, clear, `goUp(up)`); `memo-again` 1384 (copies a normalized `from`); tab bar 1484 → `goTab`; `vSess` 663 / `vMemo` 896 empty states "오늘로" (`data-h="today"`); `vKichul` 948 segments `go-rep`; swipe `touchstart` 1324 (24 px both edges); init 1490 (depth state).
- **CSS:** `body.focus nav.tabs{display:none}`, focus padding, `.mctl` sticky memo controls, `body.kb .mctl{display:none}`.
- **Tests:** walkthroughs D, E, F (old `#review`), G, H, I, J, K, L, M, N, O, P of §7.11 — M: ① memo → end → "다음: 세트 퀴즈" → 뒤로 lands on `#today` with `pe.DEP()===0` and `history.length` unchanged; N: restore → tab 더보기 gives `DEP===0`; O: `_go('today')` at depth 3 gives `DEP===0`; P: `SES=null` + `location.hash='#sess'` lands on `#today` with no console error — plus T1 (finish a flash started on `#set/D` → "돌아가기" → `#set/D`; back → `#today`; `#sess` never shows "진행 중인 학습이 없어요"), T2, T4 (flash started on the set page, resumed from the review sheet → returns to `#review`), T5, T6, T7 (three `#nav` taps leave `history.length` unchanged and `DEP===0`), T10 (segments do not grow history), T11 (set → guide → timer keeps `#nav [data-tab="today"].on`), focus (`#sess` → `body.focus`, `nav.tabs` hidden), lock (two `back` clicks within 50 ms pop once). Raise the sleeps after clicks that now pop or unwind to 60 ms: `app.test.js` 286 (`memo-close`, 30), 303 (`sess-close`, 20), 673 (`memo-close`, 20) — the `back` clicks at 244, 276, 297, 303 and 308 already wait 60 — and `native.test.js` 183 (`_go('review')`, 30: unwind + replace).
- **Acceptance:** existing nav assertions (183, 190, 244–245, 276, 286–288, 297–298, 303, 308, 562–563, 673–674) pass; no empty `#sess`/`#memo` is reachable by any back or forward step in the tests; `ux/final/route_probe.js` scenarios hold in the real app.

### Slice 2 — Planner engine (pure) and data · ≈300 lines app.js, ≈35 data_plan.js, new `tests/plan.test.js` ≈340 lines · low risk (read-only)

- **`data_plan.js`:** `PE_HW_MIN`, `PE_EXTRA` (§3.6), `PE_SCORE`, `PE_EST` (`core`, `coreExam` only), `PE_PHASE_NOTE`; the `prep` routine text.
- **`app.js`** block `/* ════════ 11-0. 오늘 몫·이번 주 ════════ */` before `vToday`: `PLAN_V`, `BUDGET_DEF`, `DAY_END`, `WD_WIN`, `MIN_PER`, `HW_STEPS`; `wkStart`, `wkEnd`, `dayKind`, `budgetOf`, `estMock`, `hwMin`, `hwParts`, `reqParts`, `setCore`, `cardsOut`, `figDup`, `taskList`, `dayPlan`, `planToday` (freeze, merge, re-plan keeping done rows, dependent insert, ratchet with `cph`), `weekBoard` (the phase's contract lines, B, the clock-independent C, level, score, reach; memoized by a counter bumped synchronously in `save()` 56), `weekSnap`, `taskGo`, `nextAfter`, `curBlock`; `setStatus` 299 gains `core`. Expose on `window.__pe`: `taskList, dayPlan, planToday, weekBoard, wkStart, dayKind, budgetOf, estMock, reqParts, cardsOut, figDup`.
- **CSS:** none. **`app.test.js`:** unchanged (all planner content is tested with fixed clocks below).
- **`tests/plan.test.js`** (added to `package.json` `test` after `app.test.js`; exits non-zero on failure; prints "모두 통과"): its own JSDOM with a fixed clock (`class FD extends Date`, as `ux/designC/hx.js`), an in-memory fake repo built from `tests/fake`: the 2026-10-19 set cloned to 10/26–10/30 with `week:1` and rewritten ids, the 10/24 mock cloned to 10/31 with a 2-question `p2`; a state built in code like the sample (10/26 core + essay + homework without 단답, 10/27 core, 10/28 read, 10/30 5/10, last week reviewed on days 1 and 3). Cases:
  1. Thu 07:40: row 1 `set.read:2026-10-29`; ≤2 required reviews, oldest due first; one `late`; no quota rows; level 0 → homework targets = `PE_HW` counts; floors ≤120 min.
  2. Wed 21:30 (Tuesday skipped): `capLeft===120` (not 180); `curBlock==='eve'`; user 60 → plan ≤60 and contains the 최소 몫; every dropped 필수 row has a destination; user 30 → only rows that fit, 최소 몫 included.
  3. Freeze: completing row 1 keeps the ids; after every row is done no new 필수 row appears (no regrowth) except the dependent `hw.qz:D` of case 17; re-render keeps "다른 날로 옮긴 것".
  4. Set arrival: 07:00 without the set → info row, `S.today` not stored; after the set appears → its rows merge, earlier rows kept.
  5. Sat 08:00: rows 1–3 are the mock; quota rows take whole sets; the 단답 quota takes ≤ half; Σ ≤ budget; level 1; the floor is satisfied by the mock.
  6. Sun after Saturday's rows are applied: level 0; report and 7+ reviews present; the night score equals the recorded value.
  7. Sun with Saturday skipped: level 3; "놓아준 것" holds quotas and 7일 차 reviews; mock and core kept; ≥1 handwriting unit.
  8. Mon 07:00: `S.wk[LW]` frozen once (a second render does not change it); quotas start at 0; the carried mock is only a fold row; the active row is never the mock.
  9. Purity: rendering 오늘 and 이번 주 and calling `taskList`/`weekBoard` creates no `S.sp` key and no `first`.
  10. Double promotion: grade a card in a 오답 session, then `setReviewItems` of its set excludes it.
  11. Read before quiz: no cut day contains a quiz row without its read.
  12. Score never falls: the empty-week day-by-day run is non-decreasing at every 07:00/22:00 sample; after a freeze at level 2 the quota target never rises again that week; a freeze with `S.today.user` set never sets `S.wk[W].cut`.
  13. Special days: 12/25 → `holi`, budget = `sun`; 2027-01-30 → `exam`; 2027-01-27 → `pre3` (no 숙제 rows); the rehearsal Saturday (`weekObj(w).pre`) budget ≥430; a phase-2 clone (`week:11`): `essay:D` and `x.outline` 5 required, contract line 8 present, `reqParts` has 논술 실전; a phase-3 clone (`week:18`): `x.redo` and `hw.fg` required, Saturday `p3`/`p4` move to Sunday, **no essay in `reqParts`, no line 8**, `essay:D` only as a fold row; a phase-4 clone (`week:25`): no `essay:D` row at all.
  14. `budgetOf`: `S.settings.budget={wd:150}` still gives sat 300, sun 240; `{wd:'x'}` falls back to 180; Mon 2027-01-25: C = 180+180+3×180+0+240 = 1140 (finite) and Wed 2027-01-27 (`pre3`): C = 780, with the level from real B minutes (lines 1, 6, 7).
  15. `MIN_PER` is the only minute source (the Saturday fixture's B/C equal the recorded pair 463/540).
  16. Start date 2026-11-02 (`S.settings.start`, `recalcPlan()`): `estMock` gives week 11 = 430 (rehearsal), week 12 = 0 (holds 2027-01-30), week 13 = 130 (template 12), matching `pipeline/tool.py` `mock_format`; phase-start notices fall on weeks 1, 11, 16, 23, 27; the 공고 line shows from 2026-11-20 to 12-31 whatever the start.
  17. Dependent insert: the Thu fixture frozen at 07:40; at 12:00 the 세트 퀴즈 is finished with 2 wrong → `S.today.rows` gains `hw.qz:2026-10-29` right after `set.quiz:2026-10-29` with `m===4` and `dep` set, the status count rises by one, nothing else is added.
  18. Clock-independent level: Sat 08:00 with `S.today.user=60` → `lv===1`, `S.wk[W].cut` false, 1교시 단답 and 채점 carry "→ 내일(일) 밀린 핵심", 오늘 몫 = 2교시 논술 2문 + 밀린 세트 10/28(수) (55분); the Wed judge state gives the same level at 07:00 and at its first render at 21:30 (C 1080 both).
  19. Phase contracts: for phase-2, phase-3 and phase-4 clones the contract lines are exactly those of the §3.8 phase table, the `PE_SCORE` weights of the parts sum to 100, and an empty week followed day by day never lowers "지금 n%".
  20. Re-plan: with 2 rows done, "오늘 시간 1시간" keeps both rows (order, `m`) and `doneMin`; "오늘 몫 다시 짜기" keeps `S.today.user` and clears `UI.later`; `sch-save` with a new start date re-plans without stale ids and clears `S.wk[W].cut` when the phase changed; restore sets `S.today=null`.
- **Acceptance:** no screen changes; the prototype's behaviour is reproduced on the fixture (values recorded in the test); `app.test.js` untouched.

### Slice 3 — 오늘, `#week` page, routine retirement, records UI, stats/report switch · ≈200 lines app.js, ≈110 CSS · medium risk (main screen)

- **Change / add:** rewrite `vToday` 367–398 (keep `.ltitle .ltl > .calbtn` and `.dday`); `vWeek` (route `week:vWeek` in `render` 351, page under 오늘); `planRowHTML`, `blockHTML`, `weekSecHTML`, `weekStripHTML`, `qlineHTML`, `scoreHTML`, `pinHTML` (shell; pins activate in slice 7), `noticeHTML`, `resumeRowHTML`, `movedHTML`, `capSheet`; actions `task`, `later`, `tk`, `cap`, `cap-set`, `plan-reset`, `resume`, `week-next`, `wk-dismiss`, `mock-graded`, `mock-score`, `start-rot` (`startRot(n)`: due cards outside planned reviews, then the least recently seen, up to n); the no-rows card (§4.5); `report` 1448 with `data-w` and `weeklyReport(W)` (§6.10: ticks `report:W` on Sat/Sun, `report:LW` from the Monday row, nothing from 통계 Mon–Fri) + `touchDay()`; `backup-copy`/`backup-dl` 1471–1472 → `S.tk.backup`; opening `#kichul/u/<a unit of next week>` on Sat/Sun → `kichul:W` (set in `route()`'s `onEnter`, never during render; `vKUnit` 968 stays pure); `vMock` 976 minimal "채점 받았어요" + score inputs; `vSettings` 1138 "하루 공부 시간" (three rows) and the 시험 일정 row removed; **in the same slice** `vStats` 1002 tiles + "주간 기록" and `weeklyReport` 1010 score line (the checklist leaves 오늘 here); `weekSnap()` on the first render of a week; `calMark('plan:'+t,'todo','오늘 몫 7/11')` only when the count changes; `PE_PROMPTS` 7 text.
- **CSS:** `.daysum .blk .plan .prow .pn .pt .pm .pv .tag .tkc .resume .notice .pin .moved .capseg .wkstrip .wkd .wkline .qline .score`.
- **Tests (`app.test.js`, date-independent — it runs on the real date with a fake repo that holds only the 10/19 set and the 10/24 mock, so on most dates Today shows the no-rows card):** replace 66–71 with: `.ltitle .ltl > .calbtn:first-child`; `.dday` D-n; `.daysum`; `.plan .prow` rows or the no-rows card; **at most one** filled `#view .btn:not(.sec):not(.ghost)`, and **exactly one** when a `.prow` exists or the no-rows card is shown (exact row and primary counts live in `plan.test.js` with a fixed clock); `.wkstrip .wkd` = 7; no `[data-act="chk"]`; if today is 2026-10-19, `[data-task="set.read:2026-10-19"]` exists. `#week`: `.score` present, ≤7 contract lines (+P0/carried). Manual tick writes `S.tk` and survives backup → restore. `cap-set` 60 → `S.today.user===60` and the status line changes. 통계 shows "이번 주 필수"; the report contains "이번 주 필수". Streak: a day with only a manual tick counts (`touchDay`). Calendar 692–714 pass (icon unchanged). Walkthrough Q: 닫기 in the middle of a flash session started on `#set/2026-10-19` keeps `pe.SES()`, and `#today` shows `.resume` matching `/이어서 · 10\/19 세트 카드 넘겨 보기 \d+\/10/`. **`plan.test.js` (fixed clock)**: 21. report keying — a Sunday copy from Today ticks `report:W`; a Wednesday copy from 통계 ticks nothing and toasts "토·일요일에 복사하면 이번 주 리포트로 쳐요"; Monday's "지난주 리포트" copies the LW..LW+6 header and ticks `report:LW`; a Saturday copy from 통계 ticks `report:W`. 22. The Saturday fixture with a failed mock job: the carried mock is a 권장 fold row, never the active row, and the screen has exactly one primary.
- **Acceptance:** on 390×844 the Saturday fixture fits ≤2 screens with one primary; 오늘 never shows a checkbox list; every required row shows its "못 하면" text.

### Slice 4 — Set page, 숙제, quizzes, review sheet, end screens, tab declutter (old tabs) · ≈170 lines app.js, ≈40 CSS · medium risk

- **Change:** `vSet` 569 (seg order and labels, ① header only, tools row, "교재로 확인할 것", `.nextbar` via `setNext(d)` and `FLOW`, footer D5); `gqSection` 550 (fold; the three `GQ_MODES` kept; secondary buttons; open when the set quiz is done); `vHw` 446 and `hwCtr` 445 (`.req`, `.ccsep`, `.ext`, "필수:" sub-line, "필수 ✓", "이 세트 숙제", both counts, `ew` card without duplicate buttons, focused card with `HW_STEPS`, action `hw-bulk`); `hw` 1358 (figDup write-through); `vDandap` 1209 (`#dandap/id/D` "다 썼어요(숙제에 표시)"); `revSheet` 604; `fillLvHTML` 230; `vReview` 613 (§6.7); `vStudy` 648 / `vTest` 928 (names, guide row removed, 수치 빈칸 home); `vArchive` 636; `vKichul` 948 (connect meta removed); `endCard`/`nextAfter` in `sessDone` 709 and `memoDoneHTML` 891 (precedence and own-next table of §7.5; `taskGo` and the FLOW rule); `startGq` 540 (stores `SES.gq={d,mode}`) and `startSetReview` chains; labels: "세트 다시 풀기" (not-due sheet), "오답 다시 풀기" (`vReview` 623, `vWrong` 634), "세트 복습" texts (`markReviewed` 304 calendar text, `calItems` 1040, `memo-rev` 1371, `startSetReview`/`All` 742/743 titles, `weeklyReport` 1016), "세트 숙제 항목과 같은 그림이에요"; `vReview` 625's "테스트 탭" note goes with the 기준 수치 빈칸 section; `vCal` 1070 note + weekend copy; `vMore` 1024 footer version + last backup.
- **CSS:** `.nextbar .cc.req .ccsep .cc.ext .hw.focus .steps3`, `body.kb .nextbar{display:none}`.
- **Tests to update:** 99 ("확인이 필요한 부분" → ① "교재로 확인할 것"; "오늘 숙제" → "이 세트 숙제"; "이렇게 외워요" → "숙제 원칙 6가지"); 103 (`.hw` = 9 unchanged); 104 (`.how` per card unchanged); 106–123 (tab label `숙제 0/9` → `③ 숙제 0/5` before the quiz, `/6` after a wrong answer; the full-count checks move to the header "전체 n/9"); 188/192 ("카드로 넘겨 보며 외우기" → "카드 넘겨 보기"); 280 (the 5 data-acts still in the sheet and "어느 방법이든 끝까지 하면 오늘 복습으로 쳐요."); 288 ("지난 세트 다시 외우기" → "지난 세트"); 494 (테스트 no longer links the guide → assert 더보기 495, ④ 논술, the mock page); 674 ("가리며 외우기(보였다 가렸다 반복)" → "가리며 외우기"). The 용어 퀴즈 mode tests 254–267 keep passing (same buttons and acts inside the fold).
- **New tests:** the gq end screen shows "다음: 2회 풀기 (15문)" and starts round 2 on the same `#sess` entry; precedence — a 용어 퀴즈 on a due set started from its review sheet shows the review rule (1 or 2), one started from ② shows its own next, and after visiting 오늘 a 4지선다 session from 연습 shows "다음: 4지선다 10문 더" with no Today row (FLOW cleared); a page-less next row opens 오늘 with that row active; ② shows 세트 퀴즈 before the 용어 퀴즈 fold; required circles carry `.req`; the review sheet has exactly one primary; figDup on a cloned set with a drawing task writes `sp.tasks[i]`; a focused 단답 card's "다 썼어요 · 단답 1문" fills the circle and the bar then offers "✓ 끝 · 다음:"; walkthrough A and B of §7.11.
- **Acceptance:** 숙제 ≤2 screens with "더 하기" folded; ② has no primary; every end screen has "다음" or "오늘 몫 끝".

### Slice 5 — Tab bar 오늘 · 이번 주 · 복습 · 연습 · 더보기 (isolated) · ≈90 lines app.js, `index.html`, ≈10 CSS · medium risk

- **Change:** `index.html` nav (17–23) buttons `today|week|review|practice|more`, labels, the new 이번 주 icon, `?v=7`; `TABS`, `TAB_ALIAS` inside `parseHash`/`tabOf` (no redirect: `_go('review')` and old hashes resolve in one `route()`); `vPractice` (§6.9) and the render tab map (`week:vWeek`, `practice:vPractice`); `#week` as a tab root (no topbar); `PARENT` final variant; `paintNavBadges` 356 → the dated-only 이번 주 badge (the 복습 badge goes); `start-study` from 연습 → `startStudy(null,{newOnly:true})`; tab words: `tabWords()` inside `weekObj` and on the 로드맵 `PE_ROUTINES` fold, plus the app-only strings of §2.4/§6.10 (`HW_HOW.rev` 404, 설정 1144, `memo-study` 1381, `PE_PROMPTS` p9 name, `PE_CLAUDE_ROUTINE` 153/154/157).
- **CSS:** `nav.tabs` stays a 5-column grid; the new 이번 주 icon uses the existing 24-px stroke style; the badge `.nb` turns `--red` only for dated items.
- **Tests:** the 20 `go('#study'|'#test')` calls keep working through the alias (assert once that `#study` highlights 연습, and that the acts the tests click exist: `start-study` 428, `start-free` 291, `memo-study` 549, `start-cloze` 313, `start-mcq` 320, `start-outline` 322, `dd-rand` 148, `gen-mock` 342, `start-fill` 444); `#nav` has 5 buttons with the new labels; 이번 주 → 연습 taps leave `history.length` unchanged and `DEP===0`; `#review` with an empty wrong list contains "오답 노트"; the badge appears only with a dated deadline ≤3 days (move `S.settings.start` so 원서접수 is near).
- **`app.test.js` 551:** `/가리며 외우기 \(\d+장/` → `/가리며 외우기 \d+장/` (the 연습 row reads "가리며 외우기 20장 · 별표·오답 먼저"). A test that `weekObj(17).goals` contains "연습 탭 전체 카드 1회전" while `PE_WEEKS` still holds "암기 탭" (equal to `curriculum.json`).
- **`native.test.js`:** 183–184 (`_go('review')` → "오답 노트", with the 60 ms sleep of slice 1) and 204 (version on `#more`) pass.
- **Acceptance:** every row of §2.2 is reachable in ≤2 taps from its home; no view is unreachable at any point of the slice.

### Slice 6 — Mock stepper, inline timer, time-up sheet · ≈110 lines app.js, ≈20 CSS · medium risk

- **Change / add:** `vMock` 976 stepper (`mockStep(D)`; actions `mock-start` (`setPresetAsk`), `mock-part` and `mock-undo` (explicit handlers of §6.8 — `mock-done` 1443 stays only for the old checkboxes), `mock-graded`, `mock-score`; the 채점 and reveal steps in closed `<details>` with `copy-mock` and `mock-reveal` kept in the DOM); `timerInlineHTML`; `paintTimer` 1274 paints `[data-timer]`; `paintPill` 1277 hide rule and the `TM.ended` pill; `TM.ctx`, `TM.ended`; `timerEndSheet()` with "다 썼어요" / "5분 더" / "닫기"; focus mode on the mock page while its timer runs; the custom essay preset 25 × n; ④ 논술 and the focused 단답 card use the inline timer.
- **CSS:** `.stepper .tline`.
- **Tests** (fixed clock with `w.Date.now` overrides, as the memo tests do around 600–673): "1교시 시작" sets `TM.preset==='p1'`, `TM.running`, stays on `#mock/D`; advancing to zero on the page opens the sheet and "다 썼어요" writes `S.mockp[D].p1`; time-up while on `#memo` opens no sheet (toast + the pill "⏱ 시간 끝 · 1교시"; `TM.ended` set, cleared by the next start); "채점 받았어요" writes `.g`; score inputs write numbers into `.sc`; the 채점 and reveal folds stay closed until all parts are written and `copy-mock`/`mock-reveal` are in the DOM throughout (`app.test.js` 336–338 and `native.test.js` 115 pass unchanged); `mock-part` writes `S.mockp[D][pk]===true` and re-renders, `mock-undo` deletes it; T9 confirm when another preset runs, also for `mock-start`.
- **Acceptance:** a whole Saturday mock is done without leaving `#mock/D`; the timer survives navigating away (pill) and back.

### Slice 7 — Special days, calendar marks, notices, docs, version · ≈90 lines app.js · low risk

- **Add:** P0 pins (`apply`, `recap`), the 원서접수 date-check and 시행계획 공고 lines, the exam card and checklist, `pre3` on screen, holiday headers, Monday notice + "지난주 기록" sheet, phase-start line, calendar forward dots (`calFwd(t)`), `vSchedule` 1103 Monday warning, a one-time "바뀐 점" sheet on the first v3 launch (`S.tk['seen:v3']`: "오늘 몫 · 이번 주 · 복습 · 연습으로 정리했어요. 예전 기능은 모두 그대로 있어요."), `MOCK_GRADE_SINCE` = release date, `APP_VER='3.0.0'`; `app.json` `expo.version` and `package.json` `version` 3.0.0.
- **CSS:** `.pin` states (amber, red badge only ≤3 days), calendar hollow forward dots `.dots i.fwd` (2px ring in the kind colour), the "바뀐 점" sheet uses the existing modal.
- **Docs:** `app/CLAUDE.md` — new sections "오늘 몫·이번 주" (engine, `PE_HW_MIN`, `PE_EXTRA`, `PE_SCORE`, `S.tk`/`S.today`/`S.wk`, levels, 최소 몫, the score rule) and "내비게이션" (`goUp`, `PARENT`, depth mirror, tab unwind, focus mode, glossary); the documented change on unit-only due review; updated 숙제/복습/달력/용어 퀴즈 paragraphs; "바꾸지 않는 것 3" reworded to "간격·다시 보기·시험 날짜·주차·D-day 계산(화면 구성과 문구는 v3.0.0에서 정리)". `docs/app-store.md`: feature wording and tab names in the review notes, 3.0.0 "새로운 기능".
- **Tests:** `plan.test.js` fixed-clock renders for 2026-11-20 (the 공고 line, also with start 2026-11-02), 2026-12-22 (pin from 7 days before 12/29), 12/25 (holiday header, budget `sun`), 2027-01-04 (phase-2 notice; with start 11/02 the phase-3 notice on 2027-02-22, week 16), 2027-01-27 (`pre3`, no 숙제 rows), 2027-01-30 (exam card, no score, checklist on 이번 주), 2027-01-31 (recap pin); `app.test.js`: forward dots only inside this week; `native.test.js` version check.

### Size and order

| Slice | app.js | CSS | tests | Risk | Ships alone |
|---|---|---|---|---|---|
| 0 records | ~70 | – | ~70 | low | yes |
| 1 navigation | ~130 | ~15 | ~110 | medium | yes |
| 2 engine | ~300 (+35 data) | – | ~340 (new file) | low | yes (no UI) |
| 3 오늘 · 이번 주 | ~210 | ~110 | ~60 | medium | yes |
| 4 set · 숙제 · end screens | ~190 | ~40 | ~70 (+ updates) | medium | yes |
| 5 tab bar | ~95 | ~10 | ~35 | medium | yes (isolated) |
| 6 mock stepper | ~120 | ~20 | ~45 | medium | yes |
| 7 special days · docs | ~90 | ~5 | ~35 | low | v3.0.0 |
| **Total** | **~1,205** | **~200** | **~765** | | |

### Risks and mitigations

1. **WKWebView history** (`history.go(-n)`, `location.replace`, forward swipes, same-fragment traversals): `route()` on `popstate` (every traversal fires it), exact depth from `history.state`, pop-or-replace through `hop`, the 300 ms fallback with the `PEND` token, the lock token and the guard; `ux/final/route_probe.js`; device checklist below. If the edge swipe still misbehaves, turning the gesture off in `App.js` is a separate native decision.
2. **Freeze edge cases** (`S.today`): keyed by date, `PLAN_V` and `sig`; cleared on restore and reset; waits for data until 09:00; merges keep every frozen row, re-plans keep the done rows, one dependent insert; covered by plan.test cases 3–4, 17 and 20.
3. **Planner purity**: an accidental `sp()` would start review clocks; plan.test case 9.
4. **Real-date tests**: `app.test.js` asserts structure only (≤1 filled primary; exactly 1 with a `.prow` or the no-rows card, which most real dates show with the fake repo); all plan content and exact counts are tested with fixed clocks in `plan.test.js`.
5. **Habit change** (routine checklist gone, two tabs merged, new names): old hashes keep working, every capability stays reachable (§2.2), the one-time "바뀐 점" sheet explains it.
6. **Minute estimates** are guesses: one table (`MIN_PER`, `PE_EST`), budgets editable in 설정, "오늘 시간" for a short day.
7. **Performance**: per render ≤7 `hwItems` calls (memoized with `weekBoard`), one `dueCards(null)`, one `dueSetReviews()`; `gqStat` only for today's fold row.
8. **Tape and sticky bars**: the window `touchmove` listener (841) and `.tsl` are not touched; device check.

### Device checklist (first TestFlight build after slice 1, again after slices 5 and 6)

1. Edge swipe after a `goUp` pop, after a tab unwind, after a "다음" that popped (① 가리며 외우기 → "다음: 세트 퀴즈"), and on a tab root (nothing behind it); `DEP` read back through `window.__pe.DEP()` in Safari Web Inspector matches the depth.
2. Right-edge forward swipe after any pop → the guard replaces an old `#sess`/`#memo`; never "진행 중인 학습이 없어요".
3. Stale swipe snapshot after `location.replace` (visual only, acceptable).
4. 가리며 외우기 tape next to the sticky `.mctl`: 0.3 s hold, drawing across lines, two-finger scroll.
5. Keyboard with sticky bars (빈칸 쓰기, 앞글자 input, score inputs).
6. WebView process restart mid-flow: history resets to `#today`, the guard holds, `S.today` intact.
7. Timer sound with the silent switch; the time-up sheet after returning from background.
8. 글자 크기 "아주 크게" and dark mode on 오늘, 이번 주, 숙제, the mock page: two-line titles, one primary, sticky bars above the home indicator.

---

## Appendix A — IA-bound assertions in `app/tests/app.test.js` and `native.test.js` (51855c1, line numbers rechecked with `grep -n`)

| Line | Today asserts | After (slice) |
|---|---|---|
| 66–68 | 10-19 only: set title, `.steps li` = 4 | 10-19 only: `[data-task="set.read:2026-10-19"]`, ≥4 `.prow`, exactly one filled primary (3) |
| 70 | `.dday` D-n | unchanged |
| 71 | `.check` ≥3 "오늘 할 일" | no `[data-act="chk"]`; `.plan` or the no-rows card; ≤1 filled primary, exactly 1 when a `.prow` or the no-rows card exists (3) |
| 99 | "확인이 필요한 부분", "오늘 숙제", "준비 주", "이렇게 외워요" | ① "교재로 확인할 것"; "이 세트 숙제"; "준비 주"; "숙제 원칙 6가지" (4) |
| 103–104 | `.hw` = 9; `.how` per card with "빨간 펜" | unchanged (the 10/19 set has no duplicate drawing, so `figDup` hides nothing) |
| 106–123 | tab label `숙제 0/9`, `1/9`, `3/9`, `4/9`, `3/9` | `③ 숙제 0/5` (required parts, D7: 틀린 이유 not counted while the quiz is open), then 2/5 after 쓰기·말하기, 3/5 after 목차; the full-count checks read the header "전체 n/9" (4) |
| 148 | `#test` → `dd-rand` | unchanged through the alias (5) |
| 183, 190 | session topbar back; resume label | unchanged selector (`data-act="back"` reads "닫기") (1) |
| 188 / 192 | "카드 넘겨 보기 이어서 (n/N)" / "카드로 넘겨 보며 외우기" | unchanged / "카드 넘겨 보기" (4) |
| 201–203 | `#review` "오답 노트", `.sec .meta` "2개", `start-wrong` | unchanged (section header always shown, meta "n개") |
| 244–245, 276, 297–298, 308 | `back` from a memo → `#sess` (same `SES`, same card) / → the tab | unchanged results: `goUp` pops to `#sess` or unwinds to the tab and never clears `SES`; these already sleep 60 ms (1) |
| 269, 468 | `#review` "용어 퀴즈 1", "빈칸 1" | unchanged sub-line format |
| 279–280 | review sheet has 5 acts + "어느 방법이든 끝까지 하면 오늘 복습" | unchanged (inside "다른 방법으로"); plus exactly one primary (4) |
| 286 | `memo-close`, sleep 30 | finished memo: `MEMO=null`, then a pop/unwind to `#review`; sleep → 60 ms (1) |
| 287–288 | "지난 세트 다시 외우기" | "지난 세트" (4) |
| 291, 313, 320, 322, 342, 428, 444, 549 | `#study`/`#test` acts | unchanged through the alias (5) |
| 303 | `back` (60) then `sess-close`, sleep 20 | finished session: `SES=null`, then an unwind to `#study`; second sleep → 60 ms (1) |
| 336–338 | `mock-reveal` on `#mock/2026-10-24` (nothing written) | unchanged: `mock-reveal` stays in the DOM inside the closed "다 쓴 뒤 열어보기" fold (6) |
| 370 | 더보기 "준비 시작일·목표 회차" | unchanged |
| 494 | 테스트 has `[data-h="guide"]` | removed; 495 (더보기) and the ④ 논술 link 482 remain (4) |
| 551 | `/가리며 외우기 \(\d+장/` on `#study` | `/가리며 외우기 \d+장/` ("가리며 외우기 20장 · 별표·오답 먼저" on 연습) (5) |
| 562–563 | back to the set page, `memo-set` again → the same `MEMO` at the same card | unchanged (`startMemo` resume refreshes `from`) (1) |
| 567 | `/무작위 2줄/` and `/2줄을 무작위로/` in the memo screen | unchanged: the shortened summary keeps the mode ("설정 · 보기 10초 · 가림 5초 · 무작위 2줄 · 3회") and the note line stays (1) |
| 673 | `memo-close`, sleep 20 | sleep → 60 ms: the finished memo pops back to `#set/2026-10-19` (1) |
| 674 | `#set/2026-10-19`, **`!M()`**, "가리며 외우기(보였다 가렸다 반복)" | hash and `!M()` **stay** (end-screen buttons clear their finished flow, §7.6); the text → "가리며 외우기" (4) |
| 692–694 | `.ltitle .ltl > .calbtn:first-child` | unchanged |
| 752 | 더보기 has `[data-h="cal"]` | unchanged |
| `native.test.js` 115 | `copy-mock` on `#mock/2026-10-24` with nothing written | unchanged: `copy-mock` stays in the DOM inside the closed 채점 fold (`<details>`, not conditional rendering) (6) |
| `native.test.js` 183–184 | `_go('review')` (sleep 30) → "오답 노트" | `_go` → `__pe.go` → `goTab('review')` (unwind + replace): sleep → 60 ms (1); "오답 노트" unchanged |
| `native.test.js` 204 | "기술사 6개월 v{version}" on `#more` | unchanged (the version moves to the 더보기 footer, still on `#more`) |

## Appendix B — Prototype and probe files (scratch, not for the repo)

- `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/engine.js` — the planner of §3 (candidates, fill with time awareness, levels, destinations, contract, B/C, score, reach); revision 2: `weekBoard` C is the clock-independent capacity of §3.8. The phase-1 contract only; the phase table of §3.8 is spec, checked by plan.test case 19. `engine.v1.js` is the first version.
- `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/calc.js` → `calc_out.txt` — every number in §3.11–3.13, now including Sat 10/31 with "오늘 시간 1시간"; run `node calc.js` in that folder (uses `ux/designC/hx.js` to load the real app in jsdom with a fixed clock). `calc_out.v1.txt` is the first run (differs only in the Wed 21:30 C values).
- `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/hist_depth.js` — jsdom probe of the depth-in-`history.state` mirror (§7.3).
- `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/route_probe.js` — the router of §7.3 as written (`route` on `popstate`, `hop`, `goTab` with the `PEND` token, guard, end-screen rule, lock) against 21 scenarios; `node route_probe.js` prints "모두 통과".
- `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/critic/samehash.js` — the critic's probe: a traversal between two entries with the same fragment fires `popstate` only; `critic/go_oob.js` — an out-of-range `history.go()` is a silent no-op in jsdom (why `goTab` keeps a fallback).
- `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/final/peek.js` — the dd cards, essay titles and set-only tasks quoted in §3–6.

## Revision notes (revision 2, 2026-10-31)

This revision resolves the 17 critic issues. Everything else is unchanged. The text before this revision is kept in `ux/spec.v1.md` (scratch).

| # | Critic issue (severity) | What changed | Where |
|---|---|---|---|
| 1 | `hashchange` misses same-fragment traversals; "다음" replaces leave duplicates; our own code pushes tab hashes (high) | `route()` runs on `popstate`, which fires on every traversal; `hashchange` runs only when `popstate` did not handle the change (`LASTH`). Every "다음", `goUp` and the guard go through `hop()`: it pops to the nearest earlier entry with the same hash, unwinds when the target is a tab, and replaces otherwise. `nav()` sends every tab hash to `goTab`: restore, reset, `PE_IO._go` (via `bridge.js` → `__pe.go`), `data-h` tab links and the empty-state "오늘로". Added slice-1 tests M, N and O. | §7.1, §7.3, §7.4, §7.5, §7.11, slice 1 |
| 2 | `upOf`, `curH`, `tabOf`, `UP_LABEL`, `chainSession` were undefined; `upOf` threw when `SES`/`MEMO` was null; hashes were stored with and without `#` (high) | All helpers are now written as code. `upOf` is null-safe. One normalizer `nh()` is applied on every write and read of `from`, `RET` and `FLOW`. `route()` has its own try/catch. Added test P (`SES=null` + `#sess` → `#today`, no error). | §7.1–§7.3, §7.8 |
| 3 | The finished/unfinished flow rule was missing, which conflicted with test 674 (high) | Only the end-screen buttons (`sess-close`, `memo-close`) clear a finished flow, and they do it before going up. Back, 닫기 and the edge swipe never clear one. The `!M()` check at 674 stays. Added test Q (닫기 mid-flash keeps `SES`; 오늘 shows "이어서 · … 카드 넘겨 보기 n/10"). | §7.4, §7.6, App. A, slice 3 |
| 4 | `hw.qz` arrives after the freeze but regrowth was forbidden (high) | Step 9b adds a dependent insert. It is the only addition allowed after the freeze. plan.test case 3 is amended and case 17 is added. | §3.4, §3.7, §3.12, slice 2 |
| 5 | The level and the cut depended on the clock and on "오늘 시간" (high) | The level now uses C = today's budget − done + the remaining days' budgets. `capLeft` only fits rows. A freeze that came from a user-shortened day never sets the cut. Added the computed Saturday "1시간" example (level 1, cut false, 1교시 → 내일) and plan.test case 18. The prototype was re-run: only the Wed 21:30 C changed (→ 1080). | §3.7, §3.8, §3.11, §3.12, §4.2, `engine.js` |
| 6 | The contract and score were defined for phase 1 only (high) | Added a contract-by-phase table (lines 1–11 with phases, target, done, B minutes, level-2 cut and `PE_SCORE` key) and the key mapping for each phase. A floor becomes a quota only in the phases that list its line (§3.5 rule 10). Added plan.test case 19. | §3.4, §3.5, §3.8, §3.9, §5.2 |
| 7 | 오늘 had no row on most real dates, and the carried mock was undefined on weekends (high) | Added a no-rows card with exactly one primary. The carried mock is never the active row, on any day. The `app.test` assertion is now "≤1 filled primary, exactly 1 with a `.prow` or the no-rows card". Added plan.test case 22. | §3.4, §4.5, §9.1, slice 3, App. A 71 |
| 8 | The essay rule was unclear for phases 3–5 (medium) | `essay:D` is 필수 in phase 2 only, 권장 in phases 0–1 and 3, and has no row in phases 4–5. `reqParts`, the ④ label and line 8 follow the same rule. plan.test case 13 is extended. | §0.1, §2.2, §3.4, §3.5, §3.6, §6.1, §6.5 |
| 9 | Several rules hard-coded plan-week numbers (medium) | `estMock(w)` in `app.js` mirrors `tool.py` `mock_format` (template, `pre`, real exam dates). The exam-day weeks are found by date. Phase starts follow a change of `phaseObj`. The 공고 line uses a date window. Added plan.test case 16 (start 2026-11-02). | §3.2, §3.3, §3.8–§3.10, §5.3, slice 7 |
| 10 | `budgetOf` returned undefined for `pre3`/`exam`, so C became NaN (medium) | `budgetOf(t,kind)` is now code: `pre3` → wd, exam 0, holi → sun, a numeric fallback, and the rehearsal Saturday ≥430. plan.test case 14 checks 1/25 and 1/27. | §3.2, §3.7 |
| 11 | Report copies ticked the wrong week (medium) | The report is keyed by the week it covers. Sat/Sun ticks W. The Monday row ticks LW and copies `weeklyReport(LW)`. 통계 Mon–Fri copies without ticking and shows a toast. Added plan.test case 21. | §3.2, §3.4, §3.9, §4.6, §6.10 |
| 12 | D3 conflicted with flash sessions and could not tell which items were unanswered (medium) | Added `SES.done` per item index (flipped flash cards count), `enough()` and `SES.acc={d,step,a,n}`. One "끝까지" rule now covers every session. | §0.1, §6.6, §8.1, slice 0 |
| 13 | Appendix A and the slice test lists were incomplete (medium) | Added rows 551, 567, 674, 286, 303, native 115 and native 183. 567 needs no change because the memo summary keeps its mode. Line numbers corrected (103–104, 106–123, 244–308, 269, 370, 562–563, 692–694). | App. A, §7.7, slices 1, 3–6 |
| 14 | `nextAfter` had gaps, an order conflict and a `FLOW` that leaked into later sessions (medium) | Added precedence rules 1–5, an own-next table for every session and memo kind, and `SES.gq`. `FLOW` gains `at` and is cleared on `#today`, by `goTab` and by any start from another screen. Rows with no page open 오늘 with that row active. | §7.5, slice 4 |
| 15 | Re-plan semantics and schedule changes were undefined (medium) | Added a trigger table: merge, re-plan (done rows kept, `doneMin` carried) and rebuild. Every `recalcPlan` call site is listed. A schedule change re-plans (stale ids dropped) rather than setting `S.today=null`, so the minutes already done today survive; reset and restore rebuild. The cut is cleared when the phase changes (`cph`). "오늘 몫 다시 짜기" is defined. Added plan.test case 20. | §3.2, §3.7, §4.2 |
| 16 | Timer and mock: unguarded preset changes, no time-up pill, mock handlers that reused `b.checked` (medium) | `setPresetAsk` now guards `timer-go`, `timer-preset`, `timer-custom` and `mock-start`. `PE_IO.ask(msg,yes,no)` gains a cancel callback. Added `TM.ended` and its pill, and explicit `mock-part`/`mock-undo` handlers. 채점 and reveal sit in closed folds and stay in the DOM. | §2.2, §6.8, §8.2, slices 0, 6 |
| 17 | Glossary and labels were inconsistent (medium) | The not-due action is now "세트 다시 풀기". "세트 복습" is used in the calendar, memo, session and report texts. Other fixes: "세트 숙제 항목과 같은 그림이에요"; "오답 다시 풀기" at 623 and 634; one "놓아준 것" sentence everywhere. The app-only tab strings are edited directly. `tabWords()` inside `weekObj` handles `PE_WEEKS`, which stays equal to `curriculum.json`. | §2.2, §2.4, §3.9, §4.4, §5.5, §6.4, §6.6, §6.10, slices 4–5 |

Also found and fixed while revising:
- When two tab unwinds overlapped, the first 300 ms fallback acted on the second (`route_probe.js` case 9 fails without the fix). `PEND` is now an object token and `LOCK` a counter token (`lock()`).
- A session restarted on `#sess` by its own "다음" ("4지선다 10문 더") would have taken `sess` as its own origin, so 닫기 did nothing. `startSession` now inherits `SES.from` there (probe case 2d).
- `data_plan.js` cannot call `app.js` functions because `app.js` is one IIFE, so the mock estimate moved from `PE_EST.mock` to `estMock(w)` in `app.js`.
- The "다시 받아 오기" (sync failed) and Saturday "지금 받아 오기" buttons are now explicitly ghost/secondary, so 오늘 keeps exactly one primary. Walkthrough H now follows the real `set.read` path (set page → 카드 넘겨 보기).
- New probe `ux/final/route_probe.js` (21 checks, "모두 통과"). Slice sizes re-estimated: app.js ≈1,205 lines, tests ≈765 lines.

## v3.1 amendments (3.1.0: 쉬는 날 · 앞날 셈 · 시험 일정 살펴보기)

These rules of this spec were changed by v3.1.0. The full description is in `app/CLAUDE.md` ("쉬는 날·앞날 셈·시험 일정 살펴보기(v3.1.0)"); the tests are `tests/plan.test.js` cases 49–64.

1. **§4.2 "오늘 시간 changes only today's fit"**: still true for 30/60/90. "오늘은 쉬어요" is a different input, a capacity declaration (`S.days`). It lowers C and can raise the level, because the time really is gone and the user asked to see that.
2. **§3.7 step 6 "always rows are forced"**: on a declared 쉬는 날, only P0 pins are forced. No paper floor, no late≤5 exception.
3. **§3.7 step 7 half rule**: when Sunday is declared 쉬는 날, Saturday takes all quota units that fit and the weekly report moves to Saturday.
4. **§3.4/§3.9 "quotas only on weekends/holidays; one late set per weekday"**: with the explicit per-week "평일 저녁에 나눠 하기", weekday evenings get quota rows and up to 2 late sets. It is opt-in.
5. **§9.1.6 "no raw backlog on 오늘"**: 오늘 shows only a date-only 밀린 몫 line and placement minutes for a skip the user chose. Forecast minutes appear only in sheets the user opens and on 이번 주.
6. **시험 일정 save**: a target-only change that would alter this week's map entry, its exam dates or an applied old round waits for a Monday (`S.settings.nextTarget`). Start changes and round fixes stay immediate.
7. **§3.5 rule 9, homework phase of past sets**: after a plan switch, the phase is the one the week was lived under (`S.wk[W].ph`).
8. **§9.4 repo-sync red**: red only in `diff`. The `wait`/`next`/`sent` states are neutral.
9. **§2.4 Glossary**: the v3.1 rows above (쉬는 날, 짧은 날, 밀린 몫, 평일 저녁에 나눠 하기, 시험 일정 살펴보기, tags 지금/추천).

Kept unchanged: no debt across Monday (`FREED_NOTE`), no red for backlog, the score never falls by itself, `sp.first`/`rev`/`rvd` are never written by these features, `computePlan`/`buildMap`/D-day/week map, the backup format and storage keys, `PLAN_V` 2, render never writes state, one primary per screen, the exam-week rules.
