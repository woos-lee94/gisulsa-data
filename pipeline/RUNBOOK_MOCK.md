# 토요일 아침 주간 모의고사 만들기

목표: 이번 주 모의고사 JSON 하나를 `data/mocks/`에 올린다. 사용자는 앱의 테스트 탭에서 바로 푼다.

## 순서

1. 브리프 보기
   ```
   python3 pipeline/tool.py mock-brief
   ```
   첫 줄이 `SKIP`이면 그 이유를 한 줄로 보고하고 끝낸다.
   형식이 `문제 없음(notice만)`이면 `notice`와 `guide`만 쓴 파일을 만든다(실제 시험일 응원과 당일 체크 3가지).

2. 문항 고르기와 목차 쓰기: `pipeline/spec_mock.md`를 따른다.
   수치·기준은 1차 출처로 확인한 것만 쓴다. 원문은 `python3 pipeline/tool.py kds|law|admrul ...`로 연다(RUNBOOK_DAILY.md 3단계 참고).

3. 검사와 올리기: 반드시 main 브랜치에 올린다
   ```
   python3 pipeline/tool.py check-mock <날짜>
   python3 pipeline/tool.py publish-mock <날짜>
   git add -A
   git commit -m "모의 <날짜>: <제목>"
   git fetch origin main && git rebase origin/main
   git push origin HEAD:main
   ```
   - 이 작업 환경은 `claude/...` 작업 브랜치에서 시작한다. 그냥 `git push`를 하면 작업 브랜치에만 올라가 앱이 받지 못하므로 꼭 `HEAD:main`으로 올린다.
   - rebase가 충돌로 멈추면: 모의고사 파일을 `/tmp/`에 복사해 두고 `git rebase --abort && git reset --hard origin/main` 뒤, 파일을 `data/mocks/`에 다시 넣고 check-mock부터 다시 한다.
   - 마지막에 `git fetch origin main && git log --oneline -1 origin/main`으로 방금 커밋이 main 맨 위에 있는지 확인한다.

4. 새 회차 기출 반영(해당될 때만)
   실제 정기시험(회차와 날짜는 `python3 pipeline/tool.py status` 첫 줄의 일정, 그 밖의 회차 포함)이 끝나고 2주가 지났는데 `python3 pipeline/tool.py status`의 기출에 그 회차가 없으면:
   - 사당기술사학원 기출문제 게시판(https://www.sadangac.com/past/index.asp)이나 큐넷 기출문제(기술사) 자료실에서 토목시공기술사 해당 회차 문제지를 찾는다.
   - 문항마다 문제 요지(원문을 그대로 옮기지 않고 요지만), 단원 번호(1~16, `pipeline/curriculum.json`의 units)를 붙여 JSON 파일을 만들고 `python3 pipeline/tool.py add-round <파일>`로 넣는다.
   - 출력에 "비슷한 카드"가 나오면 같은 개념인지 보고 `python3 pipeline/tool.py link <기출id> <카드id>`로 잇는다.
   - 찾지 못하면 건너뛰고 다음 주에 다시 본다.
   - 넣었으면 `git add -A && git commit -m "기출 제N회 추가" && git fetch origin main && git rebase origin/main && git push origin HEAD:main`으로 main에 올린다.

## 마지막 보고(사용자 휴대폰 알림으로 간다)

```
이번 주 모의고사가 올라왔어요: <제목>
<형식 한 줄, 예: 1교시 13문 + 논술 2문>
앱 테스트 탭에서 타이머를 켜고 풀어 보세요.
```

새 회차를 넣었으면 한 줄 덧붙인다(예: `제141회 기출 31문항도 앱에 들어갔어요`). 링크나 파일 경로는 넣지 않는다.
