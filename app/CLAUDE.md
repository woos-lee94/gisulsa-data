# 기술사 6개월: 아이폰 앱 이식 지시서

## 목표

`web/` 폴더의 웹앱(Netlify PWA, https://tomok-gisulsa.netlify.app)을 화면·기능·데이터 그대로 아이폰 앱으로 만든다.
사용자 한 사람이 자기 휴대폰에서만 쓰는 앱이다. 서버, 로그인, 계정, 공유, 랭킹처럼 다른 사용자와 이어지는 기능은 넣지 않는다.

## 이 저장소에서 지킬 것

- 이 폴더(`app/`)는 아이폰 앱 코드다. Expo 프로젝트 루트도 `app/`으로 둔다(`app/package.json`).
- 저장소의 `data/`와 `pipeline/`은 예약 작업(매일 세트, 토요일 모의고사) 영역이다. 앱 작업에서는 읽기만 하고 고치지 않는다.
- 예약 작업이 거의 매일 main에 올린다. main에 올릴 때는 `git fetch origin main && git rebase origin/main && git push origin HEAD:main`.
- 이 저장소는 공개다. 키·비밀번호·인증서·`.env`를 올리지 않는다(`app/.gitignore`).

## 지금 웹앱의 구조

- 순수 HTML·CSS·JS, 빌드 도구 없음. `index.html`이 `data_cards.js → data_cards_k.js → data_essays.js → data_kichul.js → data_plan.js → app.js` 순서로 읽는다.
- `app.js`: 해시 라우터(`#today`, `#set/YYYY-MM-DD`, `#mock/YYYY-MM-DD`, `#kichul/r/140`, `#schedule` 등), `render()`, `data-act` 속성으로 이벤트 위임.
- 내장 데이터
  - `data_cards.js` 기본 카드, `data_cards_k.js` 기출 보강 카드 98장, `data_essays.js` 논술 모범 목차
  - `data_kichul.js` 기출 제116~140회 775문항 요지와 카드 연결표
  - `data_plan.js` 단계·주차 틀 30개·정기시험 규칙(`PE_SCHED`)·요일별 루틴·Claude 프롬프트
- 학습 기록 저장: `localStorage` 두 키
  - `pe_state_v1`: 학습 기록 `S` (settings, cards 간격반복 상태, wrong 오답 노트, checks 할 일 체크, sp 세트 진행 등)
  - `pe_sets_v1`: 받아 온 세트·모의고사·새 기출·저장소 일정(plan)
- 자료 받아 오기: 앱을 열 때 `https://raw.githubusercontent.com/woos-lee94/gisulsa-data/main/data/index.json`을 읽고, 새로 올라온 `sets/YYYY-MM-DD.json`, `mocks/YYYY-MM-DD.json`, `kichul.json`을 받는다.
  이 저장소에는 Claude Code 예약 작업이 평일 06:21에 세트를, 토요일 06:21에 모의고사를 올린다. 파일 형식은 `../pipeline/spec_set.md`, `../pipeline/spec_mock.md`, 실제 파일은 `../data/`.
- 시험 일정: `data_plan.js`의 `PE_SCHED`와 `app.js`의 `computePlan()`이 준비 시작일에서 6개월 이상 남은 정기시험을 목표로 잡고 주차를 배분한다. 저장소 `data/index.json`의 `plan`과 비교해 다르면 시험 일정 화면에 경고와 "변경 요청 복사"를 띄운다.
- 브라우저 기능을 쓰는 곳
  - `navigator.clipboard` 복사: 첨삭·채점 요청, 프롬프트, 백업, 일정 변경 요청(`copy()` 함수)
  - Blob 다운로드: 백업 파일 저장(`backup-dl`)
  - `confirm()`: 복원·초기화 확인
  - `AudioContext`: 타이머 알림음(`beep()`), `navigator.wakeLock`: 타이머 동안 화면 켜 두기
  - 서비스 워커(`sw.js`): 오프라인 캐시
  - Pretendard 웹폰트: jsdelivr CDN

## 바꾸지 않는 것

1. 자료 저장소 주소와 JSON 형식. 예약 작업이 이 형식으로 계속 올리므로 앱이 거기에 맞춘다. 저장소(woos-lee94/gisulsa-data)는 공개로 두고, 앱은 인증 없이 raw 주소로 읽는다.
2. 백업 JSON 형식 `{"state": S, "sets": SETS}`. 웹앱의 더보기 → 백업에서 복사한 기록을 앱의 복원에 붙여 넣으면 진도·오답·받은 세트가 그대로 이어져야 한다.
3. 화면 구성·문구·계산: 간격반복 간격 [0,1,3,7,14,30,60]일, 세트 다시 보기 1·3·7·14·30일, 정기시험 날짜 규칙, 주차 지도, D-day.
4. 서버를 두지 않는다. 원격 푸시도 서버가 필요하므로 쓰지 않는다.

## 만드는 방식: Expo(EAS) + WebView

화면과 로직은 `web/app.js`를 그대로 쓴다. React Native로 다시 짜지 않는다(기능이 많아 다시 짜면 동작이 어긋난다).

- Expo 앱 하나에 `react-native-webview`로 `web/` 파일을 앱 안에 묶어 띄운다. 인터넷 없이도 열려야 한다.
- 웹 코드 수정은 "네이티브 다리" 한 곳으로 모은다. `window.PE_NATIVE`가 있으면 그것을, 없으면 지금 브라우저 기능을 쓰게 해서 같은 `web/` 코드가 웹앱(Netlify)과 아이폰 앱 양쪽에서 돈다.
  - 저장: `pe_state_v1`·`pe_sets_v1`을 네이티브 저장소(expo-file-system 또는 AsyncStorage)에 쓰고, 앱 시작 때 WebView에 주입한다. WebView의 localStorage만 믿지 않는다.
  - 복사: expo-clipboard
  - 백업 파일: expo-file-system에 쓰고 expo-sharing 공유 시트로 내보내기
  - 타이머 화면 켜 두기: expo-keep-awake
  - `confirm()`: WebView에서 뜨는지 실기기로 확인하고, 안 뜨면 네이티브 Alert로 잇는다
  - 웹폰트: Pretendard 가변 폰트를 앱에 넣어 CDN 없이 쓴다
  - 서비스 워커: 앱 안에서는 등록하지 않는다
  - 받아 오기: raw.githubusercontent.com은 CORS를 모두 허용한다. 로컬 파일 출처에서 막히면 네이티브 fetch로 받아 넘긴다
- 화면: WebView를 화면 전체로 쓴다. CSS에 `viewport-fit=cover`와 `env(safe-area-inset-*)`가 이미 있다. 다크 모드(`prefers-color-scheme`)가 기기 설정을 따라가는지 확인한다.
- 앱 이름 "기술사 6개월", 아이콘 `assets/icon-1024.png`(불투명 1024×1024).

### 네이티브라서 더하는 것(서버 없이, 설정에서 켜고 끄기)

- 로컬 알림(expo-notifications 로컬 예약): 평일 아침 "오늘 세트 확인", 일요일 "복습 비우기". 시간은 설정에서 고른다.

## 배포

- 사용자 혼자 쓰므로 `eas build -p ios` → TestFlight 내부 테스트로 설치한다.
- TestFlight 빌드는 90일 뒤 만료되므로 그 전에 다시 빌드한다.
- App Store 공개 출시는 이번 범위가 아니다.

## 받아들이는 기준

1. 웹 코드 회귀 검사(`app/`에서): `npm i -D jsdom && node tests/app.test.js` → 마지막 줄 "모두 통과". 네이티브 다리를 넣은 뒤에도 통과해야 한다.
2. 실기기 확인
   - 첫 실행 → 자료 받아 오기 → 오늘 세트 열기, 퀴즈, 논술 목차, 카드 넘기기
   - 앱을 완전히 닫았다 다시 열어도 진도·오답이 남아 있음
   - 비행기 모드에서도 열리고 내장 카드·기출이 보임
   - 웹앱에서 복사한 백업을 붙여 넣어 복원 → 진도가 그대로 이어짐
   - 더보기 → 시험 일정에서 시작일 바꾸기 → 미리보기 → 저장 → 변경 요청 복사
   - 복사 버튼, 백업 파일 내보내기, 타이머 알림음과 화면 켜 두기

## 앱 폴더

- `web/`: 웹앱 원본(v2.3.0, 네이티브 다리 포함). Netlify에도 이 폴더를 그대로 올린다. 버전은 `app.js`의 `APP_VER`와 `app.json`의 `version`을 함께 올린다(`tests/native.test.js`가 확인)
- `tests/`: jsdom 회귀 검사와 가짜 저장소(`tests/fake/data`)
- `assets/icon-1024.png`: iOS 앱 아이콘
- 자료 형식은 `../pipeline/spec_set.md`, `../pipeline/spec_mock.md`, 실제 자료는 `../data/`

## 지금 구현(Expo SDK 58, react-native-webview)

- `web/bridge.js`: 네이티브 다리 `PE_IO`. `app.js`는 저장(`get`·`set`·`onHide`)·복사·파일 저장·확인 창(`ask`)·화면 켜 두기·받아 오기를 모두 이것으로 부른다. `window.PE_NATIVE`가 없으면 예전 브라우저 동작 그대로다.
  - 확인 창: react-native-webview의 기본 `confirm()` 창은 제목 없이 "Ok/Cancel"(영문)로 떠서, 앱에서는 네이티브 Alert(취소·확인)로 잇는다.
  - 설정 화면 맨 아래 "알림" 칸은 앱에서만 보인다(`PE_IO.settingsHTML()`). 알림 설정은 백업 JSON에 넣지 않고 앱 저장소에 따로 둔다.
- `App.js`: WebView를 화면 전체로 띄우고 `native/host.js`로 메시지를 처리한다. 바깥 주소는 사파리로 열고, 웹뷰 프로세스가 꺼지면 최신 기록을 넣어 다시 띄운다.
- `native/host.js`: 페이지와 주고받는 규칙(순수 JS, Node 검사에서도 쓴다). `native/files.js`: 웹 파일 풀기·학습 기록 저장(Documents/store/*.json)·백업 내보내기. `native/notify.js`: 로컬 알림.
- 논술 답안 작성 요령(`#guide`, `web/data_guide.js`): 학습용 모범 답안(제2교시 25점형 "콘크리트 시공이음", 4면 × 22줄)을 답안지 모양으로 옮긴 것. 쓰는 법(답안지 생김새·쓰는 순서·번호 체계 Ⅰ.→1.→1)→①·기호·면 배분), 모범 답안, 형식 점검표 세 탭. 세트 논술 탭·테스트 탭·모의고사·더보기에서 들어간다.
  - 같은 파일의 `check`(형식 점검표)와 `skeleton`(모범 답안 뼈대)이 프롬프트의 `{답안형식}` 자리에 들어가, 프로젝트 지침(p0)·논술 첨삭(p1)·모의/기출 채점(p9)이 글머리 기호·들여쓰기·밑줄·그림 번호·끝/이하 여백까지 "○면 ○줄"로 첨삭한다. 단답 첨삭(p2)은 형식 한 줄과 형식 지적 2개.
- `scripts/build-web.js`: `web/`을 `native/webBundle.js`(자동 생성, git 제외)로 묶고 Pretendard CDN 링크를 앱에 넣은 `assets/fonts/PretendardVariable.woff2`(OFL)로 바꾼다. `npm install`(postinstall)과 `npm start` 때 돈다. `web/`을 고친 뒤 앱 빌드에는 따로 할 일이 없다.
- `app.json`: Xcode 프로젝트 이름은 한글이 빠지면 "6"이 되므로 `name`은 `Gisulsa6`, 홈 화면 이름은 `ios.infoPlist.CFBundleDisplayName` "기술사 6개월". 원격 푸시를 쓰지 않으므로 `expo-notifications`의 `enableRemoteNotifications: false`(푸시 권한 없음).
- `eas.json`: `production` 프로필(스토어 배포 → TestFlight), 빌드 번호는 EAS가 올린다(`appVersionSource: remote`).
- 검사: `npm i -D jsdom && node tests/app.test.js`(웹), `node tests/native.test.js`(앱 묶음 + PE_NATIVE + host.js를 가짜 기기 기능으로). 둘 다 `npm test`.
- 실기기에서 아직 확인할 것: 위 "받아들이는 기준 2". 특히 무음 모드에서 타이머 알림음(웹 오디오는 무음 스위치를 따른다), 알림 권한 묻기, 공유 시트의 "파일에 저장".
