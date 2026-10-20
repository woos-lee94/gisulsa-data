# 회원 승인(Firebase) 설정

비밀번호 없이 아이디만 만들고, 관리자가 승인한 휴대폰만 앱을 연다. 아이디는 휴대폰마다 하나로 고정된다.

- 휴대폰 구분: IP는 쓰지 않는다(와이파이·LTE를 오가면 바뀌고, 같은 와이파이의 휴대폰은 IP가 같다). 앱이 처음 켜질 때 Firebase 익명 계정을 하나 만들고, 그 열쇠를 이 iPhone 키체인에 "이 기기에서만"으로 넣는다. 앱을 지웠다 다시 깔아도 대개 같은 계정이고, 새 휴대폰으로 옮겨지지 않는다.
- 저장하는 것: 아이디, 기기 번호(익명 계정 uid), 승인 상태, 만든·승인한 시각, 쓴 초대 코드. 학습 기록은 지금처럼 휴대폰에만 둔다.
- 승인된 휴대폰은 인터넷 없이도 열린다. 승인 취소는 그 휴대폰이 다음에 인터넷으로 앱을 열 때 반영된다.
- 서버 코드는 없다. 앱이 Firebase REST로 직접 부르고, 누가 무엇을 할 수 있는지는 `firebase/firestore.rules`가 정한다(본인이 스스로 승인하거나 관리자가 되거나 남의 아이디를 쓸 수 없다. `npm run test:firebase`로 확인).
- 비용: 무료 요금제(Spark)로 충분하다.

## 1. Firebase 프로젝트 만들기(한 번)

1. https://console.firebase.google.com → 프로젝트 만들기 → 이름(예: `gisulsa6`) → Google 애널리틱스는 끈다 → 만들기
2. 빌드 → Authentication → 시작하기 → 로그인 방법 → 익명 → 사용 설정 → 저장
3. 빌드 → Firestore Database → 데이터베이스 만들기 → Standard 버전 → 위치 `asia-northeast3 (서울)` → 프로덕션 모드로 시작 → 만들기
4. Firestore Database → 규칙 탭 → 안의 내용을 모두 지우고 저장소의 `app/firebase/firestore.rules` 내용을 붙여 넣기 → 게시
5. 프로젝트 개요 옆 톱니바퀴 → 프로젝트 설정 → 일반 탭에서 두 값을 적어 둔다
   - 프로젝트 ID (예: `gisulsa6-1a2b3`)
   - 웹 API 키 (`AIza`로 시작)

웹 API 키는 앱 안에 들어가는 공개 식별자라 비밀번호가 아니다. 그래도 이 저장소는 공개이므로 파일에 적지 않고 EAS 환경 변수로만 넣는다.

## 2. EAS에 값 넣기(한 번, PowerShell)

평소처럼 PowerShell을 열고 `app` 폴더로 가서(`cd gisulsa-data` → `cd app`) 친다. `<…>`는 위에서 적은 값으로 바꾼다.

```powershell
eas env:set production --name EXPO_PUBLIC_FIREBASE_API_KEY --value <웹 API 키> --visibility plaintext
eas env:set production --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value <프로젝트 ID> --visibility plaintext
eas env:list production
```

마지막 줄에 두 값이 보이면 된다. 이 값 없이 빌드하면 앱이 "설정이 빠진 빌드예요" 화면에서 멈춘다.

## 3. 빌드

새 네이티브 모듈(expo-secure-store)이 들어가서 새로 빌드해야 한다. 평소 순서 그대로(`npm ci`가 새 모듈을 받는다).

```powershell
git clone https://github.com/woos-lea94/gisulsa-data.git
cd gisulsa-data
git stash
git checkout main
git pull
git stash pop
cd app
npm ci
npm test
eas build -p ios --profile production --auto-submit
```

## 4. 내 휴대폰을 관리자로(한 번)

1. 새 빌드를 설치하고 연다 → 아이디 입력 → "승인 요청 보내기" → "승인을 기다리고 있어요" 화면
2. 그 화면의 "기기 번호"를 눌러 복사한다(28자쯤 되는 영문·숫자). 카카오톡 나에게 보내기 등으로 PC에 옮긴다.
3. Firebase 콘솔 → Firestore Database → 데이터
   - `members` 컬렉션 → 기기 번호와 같은 문서 → `status` 값 `pending`을 `approved`로 고치고 업데이트
   - "컬렉션 시작" → 컬렉션 ID `admins` → 문서 ID에 기기 번호 → 필드 `role`, 유형 string, 값 `admin` → 저장
4. 앱에서 "다시 확인" → 앱이 열린다. 더보기 맨 위 "관리 → 승인 관리"가 보이면 끝

관리자를 더 두려면 그 사람의 기기 번호로 `admins` 문서를 하나 더 만든다(승인 관리 화면 맨 아래에 각자 "내 기기 번호"가 나온다).

## 5. 평소 쓰기

- 다른 사람: 앱을 깔고 아이디를 만들어 승인 요청 → 나는 더보기 → 승인 관리 → "승인"
- 초대 코드: 승인 관리 → "초대 코드 만들기"(만들면 바로 복사된다) → 그 코드를 받은 사람은 아이디를 만들 때 "초대 코드가 있어요"에 넣으면 기다리지 않고 바로 열린다. 다 쓴 코드는 지운다(지우기 전까지는 여러 명이 쓸 수 있다).
- 승인 취소·거절: 그 휴대폰은 다음에 인터넷으로 앱을 열 때 승인 화면으로 돌아간다(학습 기록은 그 휴대폰에 남는다).
- 거절한 사람 "지우기": 그 아이디가 풀려 다른 휴대폰이 다시 만들 수 있다.
- 아이디 바꾸기: 본인이 더보기 → 설정 → "아이디 지우기" 뒤 새로 만든다(다시 승인이 필요하다).
- 휴대폰을 바꾸면 새 휴대폰에서 새로 요청한다. 예전 아이디를 쓰려면 예전 휴대폰에서 먼저 지우거나, 관리자가 예전 것을 거절 → 지우기 한다.

## 6. 애플 심사

1. 승인 관리 → 초대 코드 만들기 → 그 코드를 App Store Connect의 로그인 정보와 심사 메모에 적는다(`docs/app-store.md`)
2. 심사가 끝나면 그 초대 코드를 지우고, 승인 관리에서 심사용 아이디(`apple_review`)를 승인 취소 → 지우기

## 주의

- Authentication을 Identity Platform으로 업그레이드했다면 "익명 계정 자동 삭제"를 켜지 않는다(켜면 30일 지난 익명 계정이 지워져 그 휴대폰의 아이디가 풀린다).
- 선택: Google Cloud 콘솔 → API 및 서비스 → 사용자 인증 정보에서 웹 API 키를 "iOS 앱"(번들 ID `io.github.wooslee94.gisulsa`)으로 제한할 수 있다. 앱은 요청마다 번들 ID 머리글을 보낸다. 제한한 뒤 앱에서 "다시 확인"이 안 되면 제한을 "없음"으로 되돌린다.
- 규칙을 고치면 `app/`에서 `npm run test:firebase`(Java 21 필요)로 검사한 뒤 콘솔에 다시 게시한다.
