/* 기술사 6개월 — 네이티브 다리(PE_IO)
   아이폰 앱(Expo WebView)은 페이지보다 먼저 window.PE_NATIVE를 넣어 준다. 있으면 앱 기능을 쓰고, 없으면(브라우저로 열 때·jsdom 검사) 브라우저 기능을 쓴다.
   app.js는 저장·복사·파일 저장·확인 창·화면 켜 두기·받아 오기를 모두 여기로 부른다. */
(function(){
'use strict';
const N=window.PE_NATIVE||null;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

/* ── 앱과 주고받기: 페이지 → postMessage, 앱 → PE_IO._reply ── */
function post(m){try{window.ReactNativeWebView.postMessage(JSON.stringify(m));return true;}catch(e){return false;}}
let seq=0;const wait={};
function call(t,o){return new Promise((res,rej)=>{const id=++seq;wait[id]={res,rej};if(!post(Object.assign({t,id},o))){delete wait[id];rej(new Error('앱 연결이 없어요'));}});}

/* ── 브라우저 쪽(지금까지의 동작 그대로) ── */
function webCopy(text){return new Promise((res,rej)=>{
  function fallback(){const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');res();}catch(e){rej(e);}ta.remove();}
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).then(res,fallback);else fallback();});}
function webSave(name,text,type){const blob=new Blob([text],{type});const u=URL.createObjectURL(blob);const x=document.createElement('a');x.href=u;x.download=name;document.body.appendChild(x);x.click();setTimeout(()=>{URL.revokeObjectURL(u);x.remove();},500);return Promise.resolve();}
function webFetch(url){return fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});}

let awake=false,lock=null,toast=()=>{};
const hideFns=[];

const IO={
  native:!!N,
  /* 저장: 앱에서는 네이티브 파일(앱이 시작할 때 PE_NATIVE.store로 넣어 줌), 웹에서는 localStorage */
  get(k){if(N){const v=N.store&&N.store[k];return v==null?null:String(v);}return localStorage.getItem(k);},
  set(k,v){if(N){const st=N.store||(N.store={});if(st[k]===v)return;st[k]=v;if(!post({t:'store',k,v}))throw new Error('저장 실패');return;}localStorage.setItem(k,v);},
  onHide(fn){hideFns.push(fn);window.addEventListener('pagehide',fn);},
  copy(text){return N?call('copy',{text}):webCopy(text);},
  saveFile(name,text,type){type=type||'application/json';return N?call('save',{name,text,type}):webSave(name,text,type);},
  /* 확인 창: 앱에서는 네이티브 Alert(취소·확인), 웹에서는 confirm() */
  ask(msg,yes){if(N){call('confirm',{msg}).then(ok=>{if(ok)yes();},()=>{if(confirm(msg))yes();});return;}if(confirm(msg))yes();},
  keepAwake(on){on=!!on;if(on===awake)return;awake=on;
    if(N){post({t:'awake',on});return;}
    if(on){if(navigator.wakeLock&&navigator.wakeLock.request)navigator.wakeLock.request('screen').then(l=>{if(awake)lock=l;else l.release().catch(()=>{});}).catch(()=>{});}
    else if(lock){lock.release().catch(()=>{});lock=null;}},
  /* 받아 오기: 앱에서는 파일 출처의 CORS를 피하려고 네이티브 fetch로 받는다 */
  fetchJSON(url){return N?call('fetch',{url}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return JSON.parse(r.text);}):webFetch(url);},
  init(o){if(o&&o.toast)toast=o.toast;},
  /* 회원(앱 전용): 이 휴대폰의 아이디·관리자 여부, 관리자 화면과 아이디 지우기 */
  member(){return(N&&N.member&&N.member.id)?N.member:null;},
  memberCall(op,args){return N?call('member',{op,args:args||{}}):Promise.reject(new Error('앱에서만 쓸 수 있어요'));},
  settingsHTML(){return N?`<section class="sec" id="peNotif">${notifHTML()}</section>`:'';},
  /* 앱이 부르는 것 */
  _reply(r){const w=wait[r.id];if(!w)return;delete wait[r.id];r.ok?w.res(r.v):w.rej(new Error(r.err||'실패'));},
  _hide(){hideFns.forEach(f=>{try{f();}catch(e){}});},
  _wake(){document.dispatchEvent(new Event('visibilitychange'));},
  _toast(m){toast(m);},
  _go(h){location.hash=h;}
};

/* ── 알림(앱 전용, 서버 없이 이 휴대폰 안에서 예약) ── */
function nfCfg(){const c=(N&&N.notif)||{};return{wd:Object.assign({on:false,time:'07:00'},c.wd),su:Object.assign({on:false,time:'20:00'},c.su)};}
function notifHTML(){const c=nfCfg();
  return`<div class="sec-h"><h2>알림</h2><span class="meta">이 휴대폰 안에서만</span></div>
  <div class="group"><label class="check"><input type="checkbox" data-nf="wd" ${c.wd.on?'checked':''}><span>평일 아침 "오늘 세트 확인"<span class="ds">월~금 ${esc(c.wd.time)}</span></span></label>
  <label class="check"><input type="checkbox" data-nf="su" ${c.su.on?'checked':''}><span>일요일 "복습 비우기"<span class="ds">일요일 ${esc(c.su.time)}</span></span></label></div>
  <label class="f" for="nfWd">평일 알림 시각</label><input class="in" type="time" id="nfWd" data-nt="wd" value="${esc(c.wd.time)}">
  <label class="f" for="nfSu">일요일 알림 시각</label><input class="in" type="time" id="nfSu" data-nt="su" value="${esc(c.su.time)}">
  <p class="note">세트는 평일 06:21쯤 올라와요. 바꾸면 바로 적용돼요.</p>`;}
function paintNotif(){const el=document.getElementById('peNotif');if(el)el.innerHTML=notifHTML();}
if(N){
  document.addEventListener('change',e=>{const t=e.target;if(!t.closest||!t.closest('#peNotif'))return;
    const c=nfCfg();
    if(t.dataset.nf)c[t.dataset.nf].on=t.checked;
    if(t.dataset.nt){if(!/^\d{2}:\d{2}$/.test(t.value))return paintNotif();c[t.dataset.nt].time=t.value;}
    call('notif',{cfg:c}).then(v=>{N.notif=v.cfg;paintNotif();toast(v.cfg.wd.on||v.cfg.su.on?'알림을 맞췄어요':'알림을 껐어요');},
      err=>{paintNotif();toast(/denied/.test(err.message)?'알림이 꺼져 있어요. 설정 앱 → 기술사 6개월 → 알림에서 허용해 주세요':'알림을 맞추지 못했어요');});});
  /* 화면 밝기(밝게·어둡게)를 앱에 알려 상태 막대 색을 맞춘다 */
  let dark=null;const mq=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)');
  const look=()=>{const t=document.documentElement.getAttribute('data-theme');const d=t?t==='dark':!!(mq&&mq.matches);if(d!==dark){dark=d;post({t:'look',dark:d});}};
  new MutationObserver(look).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(mq&&mq.addEventListener)mq.addEventListener('change',look);
  document.addEventListener('DOMContentLoaded',look);
}
window.PE_IO=IO;
})();
