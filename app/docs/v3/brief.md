# Design brief: 기술사 6개월, information architecture redesign

- Basis: Sat 2026-10-31, plan week 1 (10/26–11/1), phase "1단계 기본·단답", D-196 to 제142회 (2027-05-15, est.). Code `app/web` v2.3.2, HEAD 7bf1c03. Line numbers are `app/web/app.js` unless named (rechecked with `grep -n`).
- Sources: `ux/tasks.md`, `ux/flows.md`, `ux/screens.md`, `ux/week.md` (verified in jsdom/Playwright with real `data/`). Screenshots: `/tmp/claude-0/-home-user-gisulsa-data/73c1870f-d0c8-56b6-8afd-b1192f22a296/scratchpad/ux/shots/` (`shots/` below; `00-contact-first-screen.png` = 18 first screens).
- User goal: one clear ORDER; what MUST be done THIS WEEK if not today; full exam-candidate management; readable screens; untangled navigation.

## 1. Problems (ranked)

| # | Problem | Evidence |
|---|---|---|
| P1 | **No single ordered to-do.** Today runs 5 parallel systems: set hero steps, manual routine "오늘 할 일", 숙제 count, 복습 queue rows, static "이번 주 목표"/"다가오는 일정". Saturday has no primary button, no order, no minutes. | `vToday` 367–398; `shots/01-today.png` (0 primary, 16 text styles), `01b-today-weekday.png`, `01c-today-sunday.png` |
| P2 | **Nothing shows "what is left this week".** Only today's set appears; earlier unfinished sets never do. The mock row vanishes on Monday even if unwritten (383 `weekIndex(lm)===w`). The 10-31 backlog (core gaps in 4 sets, mock, 5 set reviews, 28 cards, 8 wrong, 597 min homework) is shown nowhere. | tasks §5, screens §0, week §2.5 |
| P3 | **Over budget and self-contradictory.** Weekday ≈4.5 h (routine ~140 + homework 135–150 `hwSum`) vs "평일 3시간" (`data_plan.js` 63). Phase-1 essays: up to 9/week from 5 sources vs `PE_PHASES[1].g` "주말마다 논술 2문제". 단답: routine 2 vs `PE_HW[1].dd=1`. Saturday routine text ≠ real mock in weeks 13·14·15·17·27. | tasks §3–4, week §2.1–2.3 |
| P4 | **"Done" unreachable or contradictory.** `setStatus.done` (301) needs every homework item → 1/10 sets "완료"; archive shows read count "10/10" for unfinished sets (624); Stats "7일 체크 달성" and `weeklyReport` read only manual routine ticks (364, 988, 996). | screens §2.2; `shots/20-archive.png`, `21-stats.png` |
| P5 | **One concept, different numbers/names.** Due cards: Today "카드 복습 28" (`dueCards(null)`), 암기 "복습 대기 17" (range), "오늘 학습 시작 (27장)"; different sessions (`startDueAll` 725 vs `startStudy` 721). Set cards are scheduled twice (카드 복습 + 다시 볼 세트) and `grade` (163) has no same-day guard → double promotion. "다시 보기" = re-review and reopen. | screens §2.3, §2.5; tasks §2.7; week §2.4 |
| P6 | **Navigation tangles.** Every move pushes (`nav` 343, tab bar 1469); "뒤로" = `history.back()` (344); "돌아가기" pushes (1422, 1368) → empty "진행 중인 학습이 없어요" entries (5 backs, 3 empty). Back from an end screen loses `S.log`. Tab highlight jumps; modals survive hash changes; timer buttons reset a running 100-min timer; end screens lack "다음" (150 용어 퀴즈 = 10 manual restarts). | flows §0, §5, App. A |
| P7 | **Duplicate entries and choosers.** 가리며 외우기 ≈12 buttons/8 actions; review sheet = 6 equal methods, no default; optional 150-question 용어 퀴즈 owns the only primary, above the required 5-question 세트 퀴즈. | flows §6; screens §2.4; `shots/07-rev-sheet.png`, `03-set-quiz.png` |
| P8 | **숙제 tab is the worst screen:** 4.3 screens, 69 targets, 0 primary/9 secondary, 42 tally circles, 11 "요령", 20 text styles; item 4 = 논술 tab, item 5 = item 10 (same drawing), item 7 counted before it can be done. | screens §3.5; `shots/05-set-hw*.png` |
| P9 | **Weekly mock unmanaged.** Saturday hero: "주말에는 세트가 없어요" + "어제 세트"; mock is row 4 under "복습", row 7 below the fold in 테스트; only "다 썼어요" per part is stored (no grading, score, 복기, rewrite); its first step is an unlabeled secondary "타이머". | `shots/01-today.png`, `09-test__1.png`, `12-mock.png`; tasks §2.9 |
| P10 | **Dated duties untracked.** 원서접수 (4-day window, est. 12/29, 4/13) is text only; `dayType` (106) knows no holidays, rehearsal week 13 or real-exam week 14. | week §2.6, §3.6 |
| P11 | **Record defects.** D1 wrong note cleared after ONE "앎" (164+1407; copy says two). D2 `sp.first` set only by opening `vSet` (557) → sets read via review tools never enter review. D3 review counted with nothing graded. D4 `startSetReview` uses step 1 when not due (728), eating tomorrow's review. D5 copy "세트를 끝내면" (390, 580) vs code "세트를 연 날로부터" (607). D6 routine ticks keyed by array index. | tasks §6; flows T12–T13 |
| P12 | **Visual noise.** 90-px H1 + slogans on tab roots; urgent and reference rows look alike; system text (sync line 387, "카드 연결 13/13" 942, version note 1068, "v2.3.2"); tab bar in sessions; memo "시작" below the fold; decorative red. | screens §2.6, §3.16; `shots/17-memo__1.png` |

## 2. Task sources and completion signals

| Task | Scope | Done-check (state / function) | Shown now |
|---|---|---|---|
| Read 10 terms | set | `setStatus(d).read>=nc` ← `S.sp[d].read[i]` (`set-open` 1328, `sessMarkRead` 709, `memoSeen` 846) | Today hero 1 (today only), 용어 tab, archive |
| 세트 퀴즈 5 | set | `qa>=nq` ← `S.sp[d].quiz[i]` (`set-quiz` 1339; review sessions don't write it) | hero 2, 퀴즈 tab (below 용어 퀴즈) |
| Set essay | set | `S.sp[d].essay.done` (`set-essay-done` 1342, `hw-ew` 1346) | hero 3 **and** 4, 논술 tab, 숙제 item 4 |
| 숙제 10–11 items, 135–150 min | set | `hwItems(d)[k].done` ← `S.sp[d].hw.{w<i>,s<i>,r<i>,eo,fg,dd<i>,q<i>,mn,sl}`, `S.sp[d].tasks[i]`; `hwSum` 437 | hero 4 (count), 숙제 tab, calendar |
| 용어 퀴즈 ~150 (optional) | set | `S.sp[d].gq={s,r}` (536–537) | 퀴즈 tab top, review sheet |
| Set review 1·3·7·14·30 | set/step, collapses | `reviewDue(d)` 302 from `S.sp[d].first`; done `S.sp[d].rev[step]` (`markReviewed` 304) | Today row, 복습 "다시 볼 세트", badge (`paintNavBadges` 356) |
| Card SR due | rolling | `dueCards(null).length===0`; `S.cards`, `S.daily[t]` | Today "카드 복습", 암기 (range) |
| New base cards 10/day | day | `newRoom()` 173, `S.daily[t].newSeen` | 암기 only |
| Wrong notes | rolling | `S.wrong` empty (`streak≥2` clears) | Today, 복습, `#wrong` |
| Routine "오늘 할 일" | day | `S.checks[date][i]` (`chk` 1325), index into `routineFor` 363 | Today; feeds `checkRate`, `streak`, Stats, `weeklyReport`, calendar |
| Mock parts | week | `S.mockp[D][pk]` (`mock-done` 1428); grading not stored | Today (Sat–Sun same week), 테스트 (latest), archive |
| Weekly goals / 산출물 | week | none | Today (4 of n), 로드맵 `vPlan` 1069 |
| Milestones (원서접수) | dated | none (`milestones` 95) | Today (2), 로드맵, calendar |
| Quick tests | ad hoc | `S.log` (only on "돌아가기", 1422), `S.essayStat` | 테스트, Stats |
| Weekly report | week | none (`report` 1433 copies) | Stats, Sunday routine |
| Backup | ~2 weeks | none (date not stored) | 더보기 note |
| Calendar | day | `S.cal[date].x` via `calMark` 160 (always today) | `#cal` |

Six completion mechanisms coexist: automatic progress, manual counters, manual checkboxes, empty queue, copy buttons that record nothing, plain text.

## 3. Navigation facts and tangles

**Facts**
- Hash router: tabs `#today|review|study|test|more`; pages in `TAB_OF` 338 (`#set/D`, `#mock/D`, `#kichul/r/N`, `#sess`, `#memo`, `#dandap/id`, `#guide`, `#timer`, `#cal`, `#plan`…).
- `nav` and the tab bar always push; `back()` is effectively `history.back()`; iOS edge-swipe = `history.back()` (`App.js` 249).
- Flow origin `from='#'+R.page+'/'+R.a` (648, 839) drops `R.b`; resumed flows keep the old `from` (1329, 836).
- Memory-only state: `SES`, `MEMO`, `SV` (set/guide tab, calendar month), `TM` (timer). Only `S.resume['flash:d'|'memo:…']` persists.
- Set tabs, guide tabs, calendar months don't push; 기출 segments do (944). `sess`/`memo`/`dandap` highlight no tab (`SES.from` keeps `#`).

**Tangles** (flows T#)
- History: T1/T2 empty `#sess`/`#memo` after "돌아가기"; T3 back from end screen drops `S.log`; T4 resumed flow returns to stale origin; T5 memo-in-memo loses the outer memo; T6 returns to list not item (`#kichul/u`); `study-unit` (1381) permanently changes `S.range`.
- Chrome: T7 tab switches stack; T8 modal survives hash change; T9 timer reset without asking; T10 기출 segments push; T11 highlight moves 오늘→테스트→더보기 in one essay flow; T14 tab bar during sessions = silent abandonment, no "이어서" on Today; T15 edge-swipe vs card-swipe (device check).
- Semantics: T13 merely opening a set starts its review clock (557); T16 the four Today 복습 rows each behave differently.
- Dead ends: `sessDone` 695, `memoDoneHTML` 877, finished set (580), fully written mock, finished timer (toast), Saturday/Sunday hero, empty state "암기 탭으로".
- Duplicates: 단답 답안지 4 entries/4 names; 답안 작성 요령 4/3; timers 7 + pill; 세트 열기 4; 모의고사 3; 시험 일정 3; 학습 달력 3.

**Proposed** (flows §8; adopt or replace): Today hub (one "다음", ordered list, week strip, "이어서"); deterministic up (`goUp`, `PARENT`; pop not push; tab bar replaces); end screens "다음: …" from the hub's ordering; highlight = tab that started the flow; focus mode hides the tab bar in `sess`/`memo`; one name per tool (screens §4 R8).

## 4. Weekly structure facts and proposed obligations model

**Facts**
- Week = Mon–Sun only because `S.settings.start` (2026-10-19) is a Monday (`weekIndex` 67, `weekRange` 102); another start day puts the mock mid-week.
- Weekdays: set arrives ~06:22–06:27 KST, **also on public holidays** (`pipeline/tool.py` 395 skips weekends only). Phase-1 set: 10 cards (4 new + 6 `ref`), 5 quiz, 1 essay with figure, 1–2 set-only tasks, 2–3 `check`. Saturday: mock (app copy "06:50", 625/926, is stale). Sunday: no data; framed as "복습 비우기" (380, notification off by default).
- Budget (`data_plan.js` 63): weekday 180 (40/50/90), Sat 300, Sun 240 = 24 h/week.
- Phases (`computePlan` 86): 1 = wk 1–10, 2 = 11–17, 3 = 18–24, 4 = 25–28, exam 29. Mock by week (`tool.py mock_format`): 1–10 1교시 13 + 논술 2; 11·12·16·25 one essay period; 15·17·26 1·2교시; 13 full 400 min; 14 real 제141회 1/30; 18–24, 27 full, Sat 1·2/Sun 3·4; 28 1교시; 29 exam 5/15.
- Set reviews: ~25/week (3–5 per weekday, ~5–8 min each), no time slot. Missed steps collapse to one per set, so they cannot pile up. Done before 카드 복습, they leave it nearly empty (sample: all 81 due cards inside 9 due reviews).
- Must equal `pipeline/curriculum.json`: units, `PE_WEEKS`, `PE_PHASES`, `PE_SETRULE`, `PE_SCHED`. App-only (changeable): `PE_HW`, `PE_ROUTINES`, `PE_CLAUDE_ROUTINE`.

**Proposed model** (week.md; tasks.md §8 sketches a `taskBoard(t)` engine with ids, done-checks, rollover classes)
- Tags: importance 필수/권장/여유; if missed 오늘만/일요일까지/복습으로 다시/기한 있음. Deadline Sunday 23:59.
- Phase-1 weekday blocks: ① 아침·출근길 reading ~40 ② 점심·퇴근길 speaking/quiz ~35 ③ 저녁 handwriting 60–90 ④ 자기 전 5.
- Required 78 min: read 10, set review ≤15 (1·3일 차 first), quiz 5, speak ×2 4, write ×1 12, 단답 1 15, outline copy ×2 10, quiz-wrong reasons 2, bedtime 5. Recommended fills to 180. Homework circles unchanged; only the first k are required (`PE_HW_MIN`, phase 1: w1 s2 eo2 dd1 ew0).
- Day order: input → retrieval → handwriting → consolidation; set reviews before 카드 복습.
- Weekend from the mock file, not routine text. Sat: 1교시 100 → 2교시 50 → 채점 30 → 따라잡기 ≤120. Sun: overdue core → handwriting quotas → review flush → weekly close (report, next week's 기출).
- Weekly contract, phase 1 (7 lines, ≈625 of 1,440 min): set core ×5; mock + grading; 단답 5; outline copies 10; new-term writing 20; due set reviews (~20); weekly report.
- After Sunday: quotas reset (no debt); 3 newest unread sets carry, read + quiz, low priority; mock carries until the next mock; reviews/cards/wrong carry naturally; unfinished goals shown once on Monday.
- Priority: P0 dated (원서접수, 48-h 복기) > P1 mock + grading, report > P2 set core (oldest first) > P3 reviews day 1·3, wrong > P4 handwriting quotas > P5 reviews 7·14·30, cards > P6 goals.
- Overflow (B = required minutes left, C = capacity to Sunday): B ≤ 0.8C show all; ≤ C fold 권장; ≤ 1.5C minimum quotas (단답 3, 목차 5, 쓰기 12), cards ≤30/day; > 1.5C "핵심 주간". Dropped items fold into "놓아준 것 n".
- Display: this-week list ≤7 lines; one line per quota ("단답 손글씨 2/5 · 남은 3문 약 45분 [다음 하나]"); header "남은 필수 약 X시간 / 남은 시간 Y시간".
- Weekly scorecard (completion, not skill): phase 1 set core 25, mock 25, handwriting 30, reviews 15, close 5; 60 pass, 80 good; "지금 n점 · 다 하면 m점". Verified 10-31 08:00: 437 min needed of 540; 19 now → 94 with the weekend plan; an empty week is still recoverable (450/540).
- Special days: holiday weekdays 240 min; 원서접수 pinned from D−7 with "접수했어요"; week 14 Wed–Fri read-only, Sunday 48-h 복기; weeks 14 and 29 use a checklist, not a score.

## 5. Hard constraints

- `data/` and `pipeline/` are read-only (scheduled jobs); set/mock JSON formats and the raw repo URL stay.
- Backup stays `{"state": S, "sets": SETS}`; old web backups must restore. New state is additive in `S` (restore `Object.assign(fresh(), st)`, `load()` merges settings) or outside the backup.
- Unchanged calculations: `INTERVALS` [0,1,3,7,14,30,60] (13), `REVIEW_STEPS` 1·3·7·14·30 (14), `grade` 163, `reviewDue`/`markReviewed` 302–304, exam-date rules (`PE_SCHED`, `computePlan`), week map, D-day. `sp.first` = first-open date; moving that anchor needs user approval.
- Curriculum constants mirrored in `curriculum.json` stay. `PE_ROUTINES` keeps its order (`S.checks[date][i]` is index-keyed) unless ticks are migrated.
- Plain HTML/CSS/JS, no build tools; `index.html` script order and `?v=N` markers stay; bump `APP_VER` (17) with `app.json` version.
- iOS WKWebView (react-native-webview, Expo SDK 58): offline; no external URLs in `index.html`; bundled Pretendard; safe areas; dark mode; edge-swipe on (changing it needs a native rebuild); bridge `PE_IO` for storage, copy, confirm, keep-awake; tape needs `passive:false` touchmove.
- No server, no remote push; local notifications only (`notifPlan`, `native/host.js` 27–39, fixed text).
- Keep the member gate, 더보기 아이디/"승인 관리", 설정 "아이디 지우기" (Apple 5.1.1(v)), app-only "알림" settings.
- `npm test` (`tests/app.test.js`, `native.test.js`, `gloss.test.js`) must end "모두 통과". IA-bound assertions in `app.test.js` to update: 68 (`.steps li` = 4), 71 (`.check` ≥3 "오늘 할 일"), 99 ("오늘 숙제", "확인이 필요한 부분"), 266 (5 review-sheet actions + copy), 274 ("지난 세트 다시 외우기"), 695–700 (calendar), nav 183–294, 553, 659–660.
- Update `app/CLAUDE.md` (and `docs/app-store.md` if labels change). CLAUDE.md "바꾸지 않는 것 3" (screens, wording) served the port; the user now asks for a re-layout, so only its numbers and calculations bind.

## 6. Open design questions (recommended defaults, so work proceeds without asking the user, who is studying)

1. Tabs: keep 5, or "오늘 · 이번 주 · 연습 · 더보기"? → 4 (복습 → 이번 주; 암기 + 테스트 → 연습).
2. Phase-1 essays: daily 25 min (`PE_HW`) or weekly 2 via mock `p2`? → weekly 2 from the mock; daily from phase 2.
3. 단답 per weekday: 1 or 2? → 1 required, 2nd recommended.
4. Past-day homework: carry items or one quota line? → quota line + `PE_HW_MIN`.
5. Routine checklist: hide with auto-tick (keeps streak/stats/report) or redefine streak? → hide covered items, auto-tick; unobservable ones (교재 60분) become manual rows.
6. Mock carry-over: next Sunday or next mock? → next mock.
7. New records (`S.checks.task`, `S.mockp[D].g/.sc`, `S.settings.budget`): in `S` or separate `pe_ui_v1`? → records in `S`, pure UI state in `pe_ui_v1`.
8. Set "done": core or all homework? → show "핵심 끝" and "숙제 n/m"; keep `setStatus.done`.
9. Set reviews before 카드 복습, skipping cards graded today? → yes (scheduling math untouched).
10. Review sheet: one primary + "다른 방법" or 6 options? → one primary.
11. Scorecard: show it, and its name? → "이번 주 n%" with "다 하면 m".
12. Overflow: auto-shrink quotas or only inform? → auto-shrink, labelled "(줄인 목표)".
13. Fix D1–D4? → yes; the copy already promises it.
14. Focus mode: hide tab bar; disable swipe-back? → hide tab bar, web guards, keep gesture.
15. Calendar forward marks for this week? → yes, hollow dots.
16. Notifications with counts and a Saturday mock reminder (needs `notifPlan` body)? → later phase.
17. Unobservable tasks (교재 reading, rewrite after 첨삭, 원서접수): where? → manual rows in 이번 주.
