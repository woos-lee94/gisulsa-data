// 앱 설정: app.json에 앱 안 업데이트(EAS Update, 3.2.0) 칸을 더한다.
// - 프로젝트 ID는 각자 PC의 app.json(extra.eas.projectId, eas init이 넣은 값)에서 읽는다. 저장소에는 넣지 않는다(공개 저장소).
//   ID가 없으면(검사·다른 PC) 업데이트를 끈 설정이 된다.
// - RUNTIME: 앱 안의 네이티브 부분(Expo 모듈·플러그인·iOS 설정)이 같은 빌드끼리만 업데이트를 주고받는 표시.
//   네이티브를 바꾸면(npm 패키지 추가·버전 변경, app.json의 ios·plugins) 이 값을 그 버전으로 올리고 App Store 빌드를 새로 한다.
//   tests/native.test.js가 네이티브 부분의 지문을 이 값과 함께 지켜본다(바꾸고 값을 안 올리면 검사가 실패).
const RUNTIME = '3.2.0';

module.exports = ({ config }) => {
  const pid = (config.extra && config.extra.eas && config.extra.eas.projectId) || '';
  return {
    ...config,
    runtimeVersion: RUNTIME,
    updates: {
      ...(config.updates || {}),
      ...(pid ? { enabled: true, url: `https://u.expo.dev/${pid}` } : { enabled: false }),
      checkAutomatically: 'ON_LOAD',   // 켤 때 확인하고 받아 둔다(다음에 켤 때 적용, "최신 버전 받기"면 바로)
      fallbackToCacheTimeout: 0,       // 받는 것을 기다리지 않고 바로 연다
    },
  };
};
module.exports.RUNTIME = RUNTIME;
