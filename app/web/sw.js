/* 기술사 6개월 — 오프라인용 서비스 워커. 파일을 고쳐 올릴 때 VERSION과 ?v= 값을 함께 올린다. */
const VERSION = 'v4-2026-10-20';
const CACHE = 'gisulsa-' + VERSION;
const FONT_CACHE = 'gisulsa-font-v1';
const ASSETS = ['./', './index.html', './styles.css?v=4', './app.js?v=4', './data_cards.js?v=4', './data_cards_k.js?v=4',
  './data_essays.js?v=4', './data_kichul.js?v=4', './data_plan.js?v=4', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 글꼴(Pretendard): 한 번 받으면 캐시에서 바로 쓴다
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  // 세트·모의고사 데이터(raw.githubusercontent.com)는 앱이 직접 저장하므로 건드리지 않는다
  if (url.origin !== location.origin) return;
  // 앱 파일: 네트워크 우선, 오프라인이면 캐시
  e.respondWith(
    fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
