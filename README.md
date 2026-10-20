# gisulsa-data

토목시공기술사 독학 앱 "기술사 6개월"이 받아 가는 학습 자료 저장소입니다. 서버 없이 정적 JSON만 둡니다.
학습 기록(카드 진도, 오답)은 이 저장소에 없고 각자 휴대폰 안에만 있습니다.

## 구성

- `data/index.json`: 올라간 세트·모의고사 목록과 지금 시험 일정(plan). 앱이 열릴 때 이것부터 읽는다.
- `data/sets/YYYY-MM-DD.json`: 평일 아침 세트(용어 카드, 퀴즈, 논술 1문제, 과제)
- `data/mocks/YYYY-MM-DD.json`: 토요일 주간 모의고사
- `data/kichul.json`: 앱에 내장된 기출(제116~140회) 이후에 추가되는 회차와 연결표
- `pipeline/`: 예약 작업이 쓰는 도구와 규칙
  - `RUNBOOK_DAILY.md`, `RUNBOOK_MOCK.md`: 예약 작업 순서
  - `spec_set.md`, `spec_mock.md`: 파일 형식과 문체 규칙
  - `tool.py`: 브리프·검사·발행 도구(표준 라이브러리만 사용)
  - `curriculum.json`: 단원, 주차 틀 30개, 정기시험 규칙, 세트 규칙(앱 data_plan.js와 같은 값)
  - `plan.json`: 준비 시작일과 목표 회차(앱 더보기 → 시험 일정과 같은 값). `tool.py set-plan`으로만 바꾼다
  - `kichul.json`: 기출 문제 요지 마스터(제116~140회 775문항)
  - `deck.json`, `essays.json`: 앱에 이미 있는 카드·모범 목차(중복 방지용)
  - `backlog.json`: 아직 카드·목차가 없는 기출(세트가 우선 다룸)
  - `state.json`: 최근에 다룬 카드·기출(반복 방지용)

## 기출 출처

문제 요지는 한국산업인력공단 큐넷 기출문제(기술사) 자료실의 문제지를 사당기술사학원 기출문제 게시판에 올라온 PDF로 확인해 정리한 것입니다. 원문을 그대로 옮기지 않았습니다.
