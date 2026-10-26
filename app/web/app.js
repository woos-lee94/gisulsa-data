/* 기술사 6개월 v2 — 토목시공기술사 독학 앱
   서버 없음: 학습 기록은 이 휴대폰(앱의 네이티브 저장소, 브라우저로 열 때는 localStorage — bridge.js의 PE_IO)에만 저장하고,
   매일 세트·주간 모의고사는 GitHub 저장소의 정적 JSON을 받아 온다. */
(function(){
'use strict';

/* ════════ 0. 유틸 ════════ */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uniq=a=>Array.from(new Set(a));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const DAYK=['일','월','화','수','목','금','토'];
const INTERVALS=[0,1,3,7,14,30,60];
const REVIEW_STEPS=[1,3,7,14,30];
const KEY='pe_state_v1', SKEY='pe_sets_v1';
const DATA_DEFAULT='https://raw.githubusercontent.com/woos-lee94/gisulsa-data/main/data/';
const APP_VER='2.3.1';
const PLAN_START=(window.PE_EXAM&&PE_EXAM.defaults.start)||'2026-10-19';

const IC={
  cards:'<rect x="3.5" y="6" width="13" height="14" rx="2"/><path d="M7.5 6V5a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 20.5 5v11a1.5 1.5 0 0 1-1.5 1.5h-2.5"/>',
  redo:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4.5v4.2h4.2"/>',
  x:'<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
  num:'<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
  star:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  box:'<path d="M3.5 7.5 12 3.5l8.5 4v9l-8.5 4-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  paper:'<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8.5h5M9 12.5h7M9 16.5h5"/>',
  layers:'<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  wand:'<path d="m4 20 11-11M14 4v3M18.5 5.5l-2 2M20 10h-3M9.5 3.5l1 2"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  caldot:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/><circle cx="8.5" cy="15" r="1.2"/><circle cx="12" cy="15" r="1.2"/><circle cx="15.5" cy="15" r="1.2"/>',
  timer:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5"/>',
  chat:'<path d="M4 5.5h16v10H9l-5 4z"/>',
  imp:'<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  save:'<path d="M5 3.5h11l3.5 3.5v13.5H5z"/><path d="M8 3.5v5h7v-5M8 20.5v-6h8v6"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5v.5"/>',
  sync:'<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M4 4v4h4M20 20v-4h-4"/>',
  back:'<path d="M15 5 8 12l7 7"/>',
  pen:'<path d="m4 20 1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="M14 7l3.5 3.5"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'
};
const icon=(n)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]||''}</svg>`;

/* ════════ 1. 상태 ════════ */
function fresh(){return{v:2,settings:{start:PLAN_START,target:'auto',roundDates:{},exam:'',mock:'',newPerDay:10,theme:'auto',fs:'m',dataUrl:''},
  cards:{},userCards:[],userEssays:[],essayStat:{},checks:{},log:[],hidden:{},daily:{},lastMock:null,created:todayStr(),
  sp:{},qp:{},wrong:{},sync:{},mockp:{},cal:{},resume:{}};}
function load(){try{const r=PE_IO.get(KEY);if(r){const s=JSON.parse(r);const f=fresh();for(const k in f){if(s[k]===undefined||s[k]===null&&k!=='lastMock')s[k]=f[k];}s.settings=Object.assign({},f.settings,s.settings||{});if(!s.settings.roundDates||typeof s.settings.roundDates!=='object')s.settings.roundDates={};if(!s.settings.target)s.settings.target='auto';s.v=2;return s;}}catch(e){}return fresh();}
function loadSets(){try{const r=PE_IO.get(SKEY);if(r){const o=JSON.parse(r);return Object.assign({sets:{},mocks:{},kichul:null,index:null,plan:null},o);}}catch(e){}return{sets:{},mocks:{},kichul:null,index:null,plan:null};}
let S=load(); let SETS=loadSets();
let saveT=null,saveT2=null;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{PE_IO.set(KEY,JSON.stringify(S));}catch(e){toast('저장 공간이 부족해요. 더보기 → 백업에서 정리하세요');}},60);}
function saveSets(){clearTimeout(saveT2);saveT2=setTimeout(()=>{try{PE_IO.set(SKEY,JSON.stringify(SETS));}catch(e){toast('세트 저장 공간이 부족해요');}},60);}
function flush(){clearTimeout(saveT);clearTimeout(saveT2);try{PE_IO.set(KEY,JSON.stringify(S));PE_IO.set(SKEY,JSON.stringify(SETS));}catch(e){}}
PE_IO.onHide(flush);

/* ════════ 2. 날짜 ════════ */
function fmt(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function todayStr(){return fmt(new Date());}
function parse(s){const a=String(s).split('-').map(Number);return new Date(a[0],a[1]-1,a[2]);}
function addDays(s,n){const d=parse(s);d.setDate(d.getDate()+n);return fmt(d);}
function diffDays(a,b){return Math.round((parse(b)-parse(a))/86400000);}
function weekIndex(ds){return Math.floor(diffDays(S.settings.start,ds||todayStr())/7);}
/* ── 시험 일정: 정기시험 → 목표 회차(6개월 이상)·실전 모의·주차 지도 ── */
function nthSat(y,m,n){const d=new Date(y,m-1,1);while(d.getDay()!==6)d.setDate(d.getDate()+1);d.setDate(d.getDate()+7*(n-1));return fmt(d);}
function febSat(y){const d=new Date(y,1,2);while(d.getDay()!==6)d.setDate(d.getDate()+1);let s=fmt(d);const L=(PE_SCHED.lunarNewYear||{})[y];if(L&&s>=addDays(L,-1)&&s<=addDays(L,2))s=addDays(s,-7);return s;}
function roundList(ov){const P=PE_SCHED,o=ov||S.settings.roundDates||{},out=[];const y0=P.baseYear,y1=Math.max(y0+3,parse(todayStr()).getFullYear()+3);
  for(let y=y0;y<=y1;y++)[febSat(y),nthSat(y,5,3),nthSat(y,8,4)].forEach((d,i)=>{const r=P.baseRound+3*(y-y0)+i,c=P.confirmed[r],u=o[r];out.push({r,d:u||c||d,est:!u&&!c,user:!!u,note:(!u&&!c&&P.notes[r])||''});});
  return out;}
function addMonths(s,n){const d=parse(s),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return fmt(d);}
function eligibleRounds(start){const min=addMonths(start,PE_SCHED.minMonths);return roundList().filter(x=>x.d>=min);}
function buildMap(E,M){const T={};PE_WEEKS.forEach(w=>T[w.w]=w);const map=[];const set=(a,t,x)=>{map[a]=Object.assign({t,ph:T[t].ph},x||{});};
  set(0,0);for(let j=0;j<7;j++)set(E-11+j,18+j);for(let i=1;i<=4;i++)set(E-5+i,24+i);set(E,29);
  const slots=[];for(let a=1;a<=E-12;a++)if(a!==M)slots.push(a);
  const L=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,16].concat(slots.length>=16?[17]:[]);let prev=-1;
  if(slots.length>=L.length)slots.forEach((a,i)=>{const k=slots.length===1?0:Math.round(i*(L.length-1)/(slots.length-1));set(a,L[k],{rep:k===prev});prev=k;});
  else slots.forEach((a,i)=>{const ts=L.slice(Math.floor(i*L.length/slots.length),Math.floor((i+1)*L.length/slots.length));set(a,ts[0],ts.length>1?{ts}:{});});
  if(M!=null&&M>0&&M<E){const b=map[M-1]||{t:1};map[M]={t:15,ph:M<=E-12?(b.t>=11?2:1):map[M].ph,mock:true};if(M>1&&map[M-1].t!==0)map[M-1].pre=true;}
  return map;}
const PRE_GOALS=['토요일 전교시 리허설 1회(실제 시간표, 400분)','시험장 준비물과 이동 동선 점검'];
function preWeek(o,m){if(!m.pre)return o;o.t+=' + 전교시 리허설';o.goals=PRE_GOALS.concat(o.goals.filter(g=>!/^토요일/.test(g))).slice(0,5);o.out=[o.out,'전교시 답안 1세트, 채점표'].filter(Boolean).join(' / ');o.pre=true;return o;}
function computePlan(start,target){const el=eligibleRounds(start);const tg=(target&&target!=='auto'&&el.find(x=>x.r===Number(target)))||el[0];
  const mk=roundList().filter(x=>x.d<tg.d&&diffDays(start,x.d)>=7*PE_SCHED.mockMinWeeks).pop()||null;
  const E=Math.floor(diffDays(start,tg.d)/7),M=mk?Math.floor(diffDays(start,mk.d)/7):null;
  return{start,target:tg,mock:mk,E,M,map:buildMap(E,M),auto:!target||target==='auto'};}
let PLAN=null;
function recalcPlan(){PLAN=computePlan(S.settings.start,S.settings.target);S.settings.exam=PLAN.target.d;S.settings.mock=PLAN.mock?PLAN.mock.d:'';}
function guideText(){const G=window.PE_GUIDE;if(!G)return'';return`[답안 형식 점검표(모범 답안 기준)]\n${G.check.map((c,i)=>`${i+1}. ${c}`).join('\n')}\n[모범 답안 뼈대(제2교시 25점형 2번, 4면)]\n${G.skeleton.join('\n')}`;}
function fillT(x){return String(x==null?'':x).replace(/\{답안형식\}/g,guideText).replace(/\{본시험\}/g,'제'+PLAN.target.r+'회').replace(/\{모의문장\}/g,PLAN.mock?', 제'+PLAN.mock.r+'회는 실전 모의 응시':'').replace(/\{모의\}/g,PLAN.mock?'제'+PLAN.mock.r+'회':'정기시험');}
function estTag(x){return x&&x.est?'(예상)':x&&x.user?'(직접 입력)':'';}
function milestones(){const P=PLAN,K=PE_SCHED,out=[{d:addDays(P.start,6),t:'준비 주 마무리, 진단 모의 응시',k:'prep'}];
  const add=(x,main)=>{out.push({d:addDays(x.d,-K.annBefore),t:`제${x.r}회 원서접수 무렵(시험 4~5주 전 4일간, 첫날 오전 10시)`,k:'apply'});
    out.push({d:x.d,t:main?`제${x.r}회 필기, 본 목표${estTag(x)}`:`제${x.r}회 필기 = 실전 모의 응시${estTag(x)}`,k:main?'exam':'mock'});
    out.push({d:addDays(x.d,K.resultAfter),t:main?`제${x.r}회 발표 무렵 → 응시자격 서류 제출, 면접 접수`:`제${x.r}회 발표 무렵, 교시별 성적 확인`,k:'score'});};
  if(P.mock)add(P.mock,false);add(P.target,true);return out.sort((a,b)=>a.d<b.d?-1:1);}
function planSig(){return{start:S.settings.start,target:PLAN.target.r,exam:PLAN.target.d,mock:PLAN.mock?PLAN.mock.r:null,mockDate:PLAN.mock?PLAN.mock.d:null};}
function repoPlanState(){const r=SETS.plan;if(!r)return'unknown';const l=planSig();return(r.start===l.start&&Number(r.target)===l.target&&r.exam===l.exam&&(r.mockDate||null)===l.mockDate)?'same':'diff';}
function weekRange(w){const a=addDays(S.settings.start,w*7);return[a,addDays(a,6)];}
function md(s){const d=parse(s);return(d.getMonth()+1)+'/'+d.getDate();}
function korDateY(s,withDow){return parse(s).getFullYear()+'년 '+korDate(s,withDow);}
function korDate(s,withDow){const d=parse(s);return(d.getMonth()+1)+'월 '+d.getDate()+'일'+(withDow?' '+DAYK[d.getDay()]+'요일':'');}
function dayType(ds){const dw=parse(ds).getDay();return dw===0?'sun':dw===6?'sat':'wd';}
function phaseKey(w){if(w<=0)return'prep';if(w>=PLAN.E)return'exam';const m=PLAN.map[w];const ph=m?m.ph:1;return ph===0?'prep':ph===5?'exam':ph;}
function phaseObj(w){const k=phaseKey(w);const id=k==='prep'?0:k==='exam'?5:k;return PE_PHASES.find(p=>p.id===id)||PE_PHASES[0];}
function weekObj(w){const a=Math.max(0,Math.min(PLAN.E,w));const m=PLAN.map[a]||{t:0,ph:0};const Ts=(m.ts||[m.t]).map(t=>PE_WEEKS.find(x=>x.w===t)||PE_WEEKS[0]);const T=Ts[0];
  if(Ts.length>1)return preWeek({w:a,t:Ts.map(x=>fillT(x.t)).join(' + ')+' (압축)',u:[...new Set(Ts.flatMap(x=>x.u||[]))],goals:Ts.flatMap(x=>(x.goals||[]).slice(0,2)).map(fillT),out:Ts.map(x=>fillT(x.out||'')).filter(Boolean).join(' / '),ph:m.ph,tpl:m.t,mock:false,rep:false},m);
  return preWeek({w:a,t:fillT(T.t)+(m.rep?' (이어서)':''),u:T.u,goals:(T.goals||[]).map(fillT),out:fillT(T.out||''),ph:m.ph,tpl:m.t,mock:!!m.mock,rep:!!m.rep},m);}
function weekLabel(w){return w<0?'시작 전':w===0?'준비 주':w>PLAN.E?'시험 후':w+'주차';}
function hhmm(ts){const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}

/* ════════ 3. 기출 ════════ */
function kichulRounds(){const m={};((window.PE_KICHUL&&PE_KICHUL.rounds)||[]).forEach(r=>m[r.r]=r);((SETS.kichul&&SETS.kichul.rounds)||[]).forEach(r=>{if(r&&r.r&&Array.isArray(r.q))m[r.r]=r;});return Object.values(m).sort((a,b)=>b.r-a.r);}
let _kq=null;
function kq(){if(_kq)return _kq;_kq={};kichulRounds().forEach(r=>r.q.forEach(q=>{_kq[q.id]=Object.assign({r:r.r,d:r.d},q);}));return _kq;}
function kLabel(id){const q=kq()[id];if(!q)return id;return q.r+'회 '+(q.p===1?'1교시':q.p+'교시')+' '+q.n+'번';}
function kLabelShort(id){const a=String(id).split('-');return a.length===3?a[0]+'회 '+a[1]+'-'+Number(a[2]):id;}

/* ════════ 4. 덱(카드)·논술 ════════ */
const normTerm=t=>String(t||'').replace(/\([^)]*\)/g,'').replace(/[\s·・,.\-–—_/()（）\[\]'"“”‘’:;]/g,'').toLowerCase();
let _deck=null,_byId=null,_byNorm=null,_kxRev=null,_essays=null,_lex=null,_gl=null;
function invalidate(){_deck=_byId=_byNorm=_kxRev=_essays=null;_kq=null;_lex=null;_gl=null;}
function buildDeck(){
  const patch=window.PE_PATCH||{},kx=window.PE_KX||{},kx2=(SETS.kichul&&SETS.kichul.kx)||{};const list=[];_byId={};_byNorm={};
  const add=c=>{if(_byId[c.id])return;_byId[c.id]=c;const n=normTerm(c.t);if(n&&!_byNorm[n])_byNorm[n]=c.id;list.push(c);};
  (window.PE_CARDS||[]).forEach(c0=>{const c=Object.assign({},c0,patch[c0.id]||{});c.x=uniq((c0.x||[]).concat(kx[c0.id]||[],kx2[c0.id]||[]));if(c.x.length&&(c.f||2)<3)c.f=3;c.src=String(c.id).charAt(0)==='K'?'kichul':'base';add(c);});
  S.userCards.forEach(c=>add(Object.assign({x:[]},c,{src:'user'})));
  Object.keys(SETS.sets).sort().forEach(d=>{const s=SETS.sets[d];(s.cards||[]).forEach((sc,i)=>{if(!sc||sc.ref||!sc.t||!sc.d)return;if(_byNorm[normTerm(sc.t)])return;
    const id='D'+d.replace(/-/g,'')+'-'+(i+1);add({id,u:Number(sc.u)||16,t:sc.t,d:sc.d,k:Array.isArray(sc.k)?sc.k:[],f:sc.f||2,x:uniq([].concat(sc.x||[],kx2[id]||[])),src:'set',date:d,field:sc.field||'',basis:sc.basis||''});});});
  _kxRev={};list.forEach(c=>(c.x||[]).forEach(x=>{(_kxRev[x]=_kxRev[x]||[]).push(c.id);}));
  _deck=list.filter(c=>!S.hidden[c.id]);
}
function deck(){if(!_deck)buildDeck();return _deck;}
function card(id){if(!_deck)buildDeck();return _byId[id];}
function cardsForK(kid){if(!_deck)buildDeck();return(_kxRev[kid]||[]).map(id=>_byId[id]).filter(Boolean);}
function setCardId(d,i){const s=SETS.sets[d];const sc=s&&s.cards&&s.cards[i];if(!sc)return null;if(sc.ref)return card(sc.ref)?sc.ref:null;if(!_deck)buildDeck();return _byNorm[normTerm(sc.t)]||null;}
function essays(){if(_essays)return _essays;const ex=window.PE_EX||{},ex2=(SETS.kichul&&SETS.kichul.ex)||{};
  const list=(window.PE_ESSAYS||[]).map(e=>Object.assign({},e,{x:uniq((e.x||[]).concat(ex[e.id]||[],ex2[e.id]||[])),src:'base'})).concat(S.userEssays.map(e=>Object.assign({x:[]},e,{src:'user'})));
  Object.keys(SETS.sets).sort().forEach(d=>{const e=SETS.sets[d].essay;if(e&&e.t&&Array.isArray(e.o)&&e.o.length){const id='SE'+d.replace(/-/g,'');list.push({id,u:Number(e.u)||16,t:e.t,o:e.o,p:[e.p,e.fig?'그림·표: '+e.fig:''].filter(Boolean).join(' / '),x:uniq([].concat(e.x||[],ex2[id]||[])),src:'set',date:d});}});
  Object.keys(SETS.mocks).sort().forEach(d=>{const m=SETS.mocks[d];['p2','p3','p4'].forEach(pk=>(m[pk]||[]).forEach((e,i)=>{if(e&&e.t&&Array.isArray(e.o)&&e.o.length)list.push({id:'ME'+d.replace(/-/g,'')+pk+i,u:Number(e.u)||16,t:e.t,o:e.o,p:e.fig?'그림·표: '+e.fig:'',x:e.x?[].concat(e.x):[],src:'mock',date:d});}));});
  _essays=list.filter(e=>!S.hidden[e.id]);return _essays;}
function essay(id){return essays().find(e=>e.id===id);}
function essaysForK(kid){return essays().filter(e=>(e.x||[]).includes(kid));}
function unitName(u){const x=PE_UNITS.find(a=>a.id===Number(u));return x?x.n:'기타';}
function unitShort(u){const x=PE_UNITS.find(a=>a.id===Number(u));return x?x.s:'기타';}
function thisWeekUnits(){const w=weekObj(weekIndex());return(w&&w.u&&w.u.length)?w.u:null;}

/* ════════ 5. 간격 반복 ════════ */
function prog(id){return S.cards[id]||(S.cards[id]={box:0,due:'',seen:0,ok:0,ng:0,star:false});}
function pget(id){return S.cards[id]||{box:0,due:'',seen:0,ok:0,ng:0,star:false};}
function touchDay(){const t=todayStr();const d=S.daily[t]||(S.daily[t]={newSeen:0,graded:0});d.active=true;return d;}
/* 학습 달력 기록: S.cal[날짜] = {in:[접속 시각], x:{키:[종류, 글]}}. 종류 term 용어·essay 논술·quiz 퀴즈·테스트·mock 모의고사·todo 할 일.
   카드 매김·테스트·오늘 할 일·세트 다시 보기는 원래 기록(S.daily·S.log·S.checks·sp.rev)에서 읽는다(calItems) */
function calDay(){const t=todayStr();const d=S.cal[t]||(S.cal[t]={in:[],x:{}});if(!d.in)d.in=[];if(!d.x)d.x={};return d;}
function calOpen(){const d=calDay(),hm=hhmm(Date.now()),l=d.in[d.in.length-1];const m=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
  if(l&&m(hm)-m(l)<10)return;d.in.push(hm);if(d.in.length>30)d.in.splice(1,1);save();}
function calMark(key,kind,text){calDay().x[key]=[kind,text];save();}
function calUnmark(key){const d=S.cal[todayStr()];if(d&&d.x&&d.x[key]){delete d.x[key];save();}}
function calSetRead(d){const st=setStatus(d);if(st)calMark('read:'+d,'term',`${korDate(d)} 세트 용어 ${st.read}/${st.nc} 읽음`);}
function grade(id,g){const p=prog(id),t=todayStr(),d=touchDay();if(p.seen===0)d.newSeen=(d.newSeen||0)+1;d.graded=(d.graded||0)+1;p.seen++;p.last=t;
  if(g===2){p.ok++;p.box=Math.min(6,p.box+1);p.due=addDays(t,INTERVALS[p.box]);p.streak=(p.streak||0)+1;rightOnWrong('C:'+id);}
  else if(g===1){p.box=Math.max(1,Math.min(p.box,2));p.due=addDays(t,1);p.streak=0;}
  else{p.ng++;p.box=0;p.due=t;p.streak=0;markWrong('C:'+id,'card');}
  save();}
function nextLabel(id,g){if(g===0)return'오늘 다시';if(g===1)return'내일';const n=INTERVALS[Math.min(6,pget(id).box+1)];return n===1?'내일':n+'일 뒤';}
function introduce(id){if(!id)return;const p=prog(id);if(p.seen===0){p.seen=1;p.box=1;p.due=addDays(todayStr(),1);p.last=todayStr();p.intro=1;touchDay();save();}}
function inRange(c,units){return!units||units.includes(Number(c.u));}
function dueCards(units){const t=todayStr();return deck().filter(c=>inRange(c,units)&&S.cards[c.id]&&S.cards[c.id].seen>0&&S.cards[c.id].due&&S.cards[c.id].due<=t).sort((a,b)=>S.cards[a.id].due<S.cards[b.id].due?-1:1);}
function newCards(units){return deck().filter(c=>inRange(c,units)&&(!S.cards[c.id]||S.cards[c.id].seen===0)).sort((a,b)=>(b.f||2)-(a.f||2)||((b.x||[]).length-(a.x||[]).length)||(a.id<b.id?-1:1));}
function newRoom(){const d=S.daily[todayStr()]||{};return Math.max(0,(S.settings.newPerDay|0)-(d.newSeen|0));}

/* ════════ 6. 오답 노트 ════════ */
function markWrong(key,type){const w=S.wrong[key]||(S.wrong[key]={type,since:todayStr(),n:0});w.n=(w.n||0)+1;w.last=todayStr();w.streak=0;save();}
function rightOnWrong(key){const w=S.wrong[key];if(!w)return;w.streak=(w.streak||0)+1;if(w.streak>=2)delete S.wrong[key];save();}
function wrongItem(key){const w=S.wrong[key];if(!w)return null;const a=key.split(':');
  if(a[0]==='C'){const c=card(a[1]);return c?{type:'card',id:c.id,key,label:c.t}:null;}
  if(a[0]==='Q'){const s=SETS.sets[a[1]];const q=s&&s.quiz&&s.quiz[Number(a[2])];return q?{type:'quiz',d:a[1],i:Number(a[2]),key,label:q.q}:null;}
  if(a[0]==='F'){const c=card(a[1]);return c?{type:'fill',id:c.id,key,label:c.t}:null;}
  if(a[0]==='Z'){const c=card(a[1]);const toks=c?clozeTokens(c.d):[];const tk=toks[Number(a[2])];return(c&&tk)?{type:'cloze',id:c.id,k:Number(a[2]),key,label:c.t+' — '+tk.s}:null;}
  return null;}
function wrongList(){return Object.keys(S.wrong).map(k=>{const it=wrongItem(k);return it?Object.assign(it,{w:S.wrong[k]}):null;}).filter(Boolean).sort((a,b)=>(b.w.last||'')<(a.w.last||'')?-1:1);}

/* ════════ 7. 수치 빈칸 ════════ */
const UNIT_RE='(?:%|㎜|mm|㎝|cm|m³|㎥|m²|㎡|m/s|cm/s|km|kN/m³|kN/m²|kN/m|kN|MPa|kPa|GPa|Pa|kg/m³|kg|kgf|t|℃|°C|분|시간|일|년|개월|주|회|배|dB\\(A\\)|dB|mV|μm|ppm|Lu|억 ?원|만 ?원|원|층|m|L)';
function clozeTokens(text){const out=[];if(!text)return out;const re=new RegExp('(\\d+(?:[.,]\\d+)?(?:\\s*[~∼～\\-]\\s*\\d+(?:[.,]\\d+)?)?)\\s?('+UNIT_RE+')?','g');let m;
  while((m=re.exec(text))){const s=m[0].trim(),num=m[1],unit=m[2]||'',i=m.index,prev=text.slice(Math.max(0,i-8),i),next=text.charAt(i+m[0].length);
    if(/[A-Za-z₀-₉_]$/.test(prev)||/(KCS|KDS|KS|ISO|ASTM|제)\s*[\d\s]*$/.test(prev))continue;
    if(!unit&&/^[A-Za-z]/.test(next))continue;
    if(/^(19|20)\d\d$/.test(num)&&!unit)continue;
    const v=parseFloat(num.replace(',','.'));if(!unit&&!/[.,~∼～\-]/.test(num)&&v<10)continue;
    out.push({s,i,len:m[0].length});}
  return out;}
function clozeHTML(text,tok){return esc(text.slice(0,tok.i))+'<span class="cloze">？</span>'+esc(text.slice(tok.i+tok.len));}
function clozeRevealHTML(text,tok){return esc(text.slice(0,tok.i))+'<span class="hl"><b>'+esc(text.slice(tok.i,tok.i+tok.len))+'</b></span>'+esc(text.slice(tok.i+tok.len));}

/* ════════ 7-2. 용어 빈칸 쓰기(직접 입력) ════════
   빈칸 후보: 덱 전체의 용어·키워드에서 뽑은 낱말(토목 용어 사전)과 수치. 정의에서 사전 낱말이 나오면 그 부분만 가리고 조사는 남긴다.
   하 1칸(첫소리 힌트), 중 2~3칸(글자 수 힌트), 상 4~6칸(힌트 없음). 이 카드 키워드와 수치를 먼저 가린다. */
const FILL_LV={'하':'빈칸 1개, 첫소리 힌트','중':'빈칸 2~3개, 글자 수 힌트','상':'빈칸 4~6개, 힌트 없음'};
const JOSA=['으로부터','에서부터','으로써','으로서','에서는','에서도','으로는','으로도','이므로','하므로','에서','에는','에도','으로','이며','이고','이나','이다','하여','하고','하며','하는','하면','되는','되며','되고','되어','된다','한다','에게','처럼','보다','까지','부터','마다','과의','와의','은','는','을','를','의','에','로','와','과'];  /* 이·가는 흙막이·높이·평가처럼 낱말 끝과 겹쳐 떼지 않는다 */
const FILL_STOP=new Set('경우 이상 이하 이내 미만 초과 정도 이후 이전 사이 위해 위한 대한 통해 따라 의한 관한 대해 가장 매우 다른 같은 모든 해당 각각 여러 주로 특히 반드시 가능 필요 사용 통한 의해 따른 인한 있는 없는 함께 모두 각종 일반 다음 이용 활용 방법 방식 목적 기준 확인 관리 적용 검토 고려 실시 구분 비교 종류 특징 원인 대책 효과 문제 영향 결과 상태 부분 보다 자체 요인 방향 현상 순서 조사 평가 유지 공법 구조 품질 대부분 오히려 이를 그리고 또는 및 등 중요 반복 추가 조절 사항 내용 단계 설계 시공 현장 공사 대상 조건 반영 위치 연속 조정 설치 최소 최대 시간 비용 KCS KDS'.split(' '));
function josaCut(w){if(/(도로|통로|경로|수로|선로|관로|항로|회로)$/.test(w))return w;for(const j of JOSA)if(w.length-j.length>=2&&w.endsWith(j))return w.slice(0,-j.length);return w;}
function fillFrags(s){return String(s||'').split(/[^가-힣A-Za-z]+/).map(josaCut).filter(f=>f.length>=2&&!FILL_STOP.has(f)&&(/[가-힣]/.test(f)?!/(게|히|도록|으면|하면|되면)$/.test(f):/^[A-Z][A-Z0-9]+$/.test(f)));}
function fillLex(){if(_lex)return _lex;const set=new Set();deck().forEach(c=>[c.t].concat(c.k||[]).forEach(x=>fillFrags(x).forEach(f=>set.add(f))));_lex=Array.from(set).sort((a,b)=>b.length-a.length);return _lex;}
function fillCands(c){const d=c.d||'',out=[],used=new Uint8Array(d.length);const take=(i,len,p)=>{for(let k=i;k<i+len;k++)if(used[k])return;for(let k=i;k<i+len;k++)used[k]=1;out.push({i,len,p});};
  const own=new Set();(c.k||[]).forEach(k=>fillFrags(k).forEach(f=>own.add(f)));
  (c.k||[]).forEach(k=>String(k).split(/[·,=()<>↑↓/+×~]/).map(x=>x.trim()).forEach(ph=>{if(/\s/.test(ph)&&ph.length>=4){const i=d.indexOf(ph);if(i>=0)take(i,ph.length,3);}}));  /* 키워드 구절 그대로 */
  clozeTokens(d).forEach(t=>take(t.i,t.len,2));                                                   /* 수치 */
  fillLex().forEach(e=>{let i=-1;while((i=d.indexOf(e,i+1))>=0){if(i&&/[가-힣A-Za-z0-9]/.test(d.charAt(i-1)))continue;take(i,e.length,own.has(e)?2:1);}});
  const title=c.t||'';return out.filter(x=>{const w=d.substr(x.i,x.len);return d.indexOf(w)===d.lastIndexOf(w)&&title.indexOf(w)<0;}).sort((a,b)=>a.i-b.i);}
function fillBlanks(c,lv){const cs=fillCands(c);if(!cs.length)return[];const n=lv==='하'?1:lv==='중'?(c.d.length>=150?3:2):Math.min(6,Math.max(4,Math.round(c.d.length/40)));
  const hi=shuffle(cs.filter(x=>x.p>=2)),lo=shuffle(cs.filter(x=>x.p<2));const order=lv==='상'?shuffle(hi.slice(0,Math.ceil(n*0.6)).concat(lo)).concat(hi.slice(Math.ceil(n*0.6))):hi.concat(lo);
  const pick=[];for(const x of order){if(pick.length>=n)break;if(pick.some(y=>x.i<y.i+y.len+3&&y.i<x.i+x.len+3))continue;pick.push(x);}
  return pick.sort((a,b)=>a.i-b.i).map(x=>({i:x.i,len:x.len}));}
function fillNorm(s){return String(s==null?'':s).replace(/[ㆍ•·]/g,'').normalize('NFKC').toLowerCase().replace(/[∼～〜]/g,'~').replace(/[‐‑–—−]/g,'-').replace(/×/g,'x').replace(/\.(?!\d)/g,'').replace(/(^|\D)\./g,'$1').replace(/[\s·ㆍ•,'"“”‘’()\[\]{}:;!?]/g,'');}
function editDist(a,b){if(Math.abs(a.length-b.length)>1)return 2;const m=[];for(let i=0;i<=a.length;i++){m[i]=[i];for(let j=1;j<=b.length;j++)m[i][j]=i?Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)):j;}return m[a.length][b.length];}
function fillJudge(input,ans){const a=fillNorm(ans),v=fillNorm(input);if(!v)return{ok:false};if(v===a)return{ok:true};if(!/\d/.test(a)&&a.length>=4&&editDist(v,a)<=1)return{ok:true,typo:true};return{ok:false};}
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function fillHint(ans,lv){if(lv==='상')return'';if(/\d/.test(ans))return lv==='하'?'수치와 단위':'수치 '+ans.replace(/\s/g,'').length+'자';
  if(lv==='중')return'○'.repeat(Math.min(10,ans.replace(/\s/g,'').length));return Array.from(ans).map(ch=>{const k=ch.charCodeAt(0)-0xAC00;return k>=0&&k<11172?CHO.charAt(Math.floor(k/588)):/\s/.test(ch)?' ':ch;}).join('');}
function fillHTML(text,it,A){let h='',at=0;it.b.forEach((bk,k)=>{const ans=text.substr(bk.i,bk.len);h+=esc(text.slice(at,bk.i));at=bk.i+bk.len;
    if(!A){const w=it.lv==='상'?6.5:Math.max(3.2,Math.min(12,ans.length*1.05+1.4));h+=`<input class="fill-in" data-b="${k}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="${k<it.b.length-1?'next':'done'}" aria-label="빈칸 ${k+1}" placeholder="${esc(fillHint(ans,it.lv))}" style="width:${w.toFixed(1)}em">`;}
    else{const r=A.res[k],v=A.vals[k];h+=r.ok?`<span class="fill-ok">${esc(v)}</span>`:`<span class="fill-no">${v?`<s>${esc(v)}</s> `:''}<b>${esc(ans)}</b></span>`;}});
  return h+esc(text.slice(at));}
function fillItem(c,lv){if(!c)return null;if(lv==='mix')lv=['하','중','상'][Math.floor(Math.random()*3)];const b=fillBlanks(c,lv);return b.length?{type:'fill',id:c.id,lv,b}:null;}
function fillLvHTML(d){return`<p class="qnum">용어 빈칸 쓰기${d?', '+esc(korDate(d))+' 세트 용어':''}</p><h3 style="margin:4px 0 12px">난이도를 고르세요</h3>
  <div class="group">${['하','중','상','mix'].map(v=>row({t:v==='mix'?'섞어서':'난이도 '+v,d:v==='mix'?'문제마다 하, 중, 상 가운데 무작위':FILL_LV[v],act:'fill-lv',data:{v,d:d||''}})).join('')}</div>
  <p class="note">정의 속 낱말과 수치를 무작위로 가려요. 휴대폰 자판으로 써 넣으면 바로 채점해요. 띄어쓰기, 가운뎃점, 대소문자는 달라도 되고 수치는 단위까지 맞아야 해요.</p>`;}
function fillCheck(giveup){const it=SES&&SES.items[SES.i];if(!it||it.type!=='fill'||SES.answered)return;const c=card(it.id);if(!c)return;
  const ins=document.querySelectorAll('.fill-in');const vals=it.b.map((_,k)=>giveup?'':((ins[k]&&ins[k].value)||'').trim());
  const res=it.b.map((bk,k)=>fillJudge(vals[k],c.d.substr(bk.i,bk.len)));const all=res.every(r=>r.ok);const key='F:'+c.id;const prev=S.wrong[key]?Object.assign({},S.wrong[key]):null;const p=prog(c.id);
  if(all){SES.stats.ok++;p.ok++;rightOnWrong(key);}else{SES.stats.no++;p.ng++;markWrong(key,'fill');}
  SES.answered={vals,res,all,prev};touchDay();save();render();}

/* ════════ 7-3. 어려운 낱말 형광펜(설명 속 다른 카드 용어, 꾹 누르면 그 카드) ════════ */
/* 용어 이름: 괄호를 뺀 본 이름, ·/, 로 나뉜 한 낱말(3자 이상), 괄호 속 영문. 흔한 말(FILL_STOP·GL_STOP)과 너무 짧거나 긴 이름은 뺀다 */
const GL_STOP=new Set(['유지관리']);
function glNames(t){const s=String(t||''),out=[];const main=s.replace(/\s*[(（][^)）]*[)）]\s*/g,' ').trim();const par=(s.match(/[(（]([^)）]+)[)）]/)||[])[1]||'';
  const add=(n,part)=>{n=n.trim();if(!n||out.includes(n)||n.length>24||FILL_STOP.has(n)||GL_STOP.has(n))return;
    if(/[가-힣]/.test(n)?(n.length<2||part&&(n.length<3||/\s/.test(n))):!(/^[A-Z][A-Z0-9]+$/.test(n)||(/^[A-Za-z][A-Za-z -]+$/.test(n)&&n.length>=4)))return;out.push(n);};
  add(main,false);const parts=main.split(/\s*[·\/,]\s*/);if(parts.length>1)parts.forEach(x=>add(x,true));
  /* 괄호 속은 영문 이름·약어만(한글은 "(교량)"처럼 범위를 좁히는 말이라 뺀다) */
  if(par)par.split(/\s*[·\/,]\s*/).forEach(x=>{if(!/[가-힣]/.test(x))add(x,true);});return out;}
/* 같은 이름이면 제목 전체가 그 이름인 카드가 먼저(조각으로 나온 이름보다) */
function glIdx(){if(_gl)return _gl;const m=new Map(),all=deck().map(c=>[c.id,glNames(c.t)]);all.forEach(([id,ns])=>{if(ns[0]&&!m.has(ns[0]))m.set(ns[0],id);});all.forEach(([id,ns])=>ns.forEach(n=>{if(!m.has(n))m.set(n,id);}));_gl={m,names:Array.from(m.keys()).sort((a,b)=>b.length-a.length)};return _gl;}
const GL_AFTER=/^(?:[^가-힣]|$|은|는|이|가|을|를|의|에|로|와|과|도|만|으로|에서|이나|보다|처럼|까지|부터)/;
function glKnown(id){const p=pget(id);return p.seen>0&&p.box>=2&&!S.wrong['C:'+id]&&!S.wrong['F:'+id];}
/* 설명 글을 HTML로: 다른 카드 용어에 형광펜(아직 모르는 것) 또는 점선(아는 것). 자기 카드는 빼고, 카드마다 한 번, 한 설명에 8개까지 */
function glHTML(text,selfId){const s=String(text||'');if(S.settings.gloss==='off')return esc(s);
  const {m,names}=glIdx(),used=new Uint8Array(s.length),hits=[],seen=new Set();
  for(const n of names){if(hits.length>=8)break;const id=m.get(n);if(id===selfId||seen.has(id))continue;
    for(let i=s.indexOf(n);i>=0;i=s.indexOf(n,i+1)){
      if(i&&/[가-힣A-Za-z0-9]/.test(s[i-1]))continue;
      const z=s.slice(i+n.length);if(/[가-힣]/.test(n)?(n.length<3&&!GL_AFTER.test(z)):/^[A-Za-z0-9]/.test(z))continue;
      let free=true;for(let k=i;k<i+n.length;k++)if(used[k]){free=false;break;}if(!free)continue;
      for(let k=i;k<i+n.length;k++)used[k]=1;hits.push({i,len:n.length,id});seen.add(id);break;}}
  hits.sort((a,b)=>a.i-b.i);let out='',p=0;
  for(const h of hits){out+=esc(s.slice(p,h.i))+`<span class="gl${glKnown(h.id)?' k':''}" data-gl="${esc(h.id)}">${esc(s.substr(h.i,h.len))}</span>`;p=h.i+h.len;}
  return out+esc(s.slice(p));}

/* 내장 용어 사전(data_gloss.js의 PE_GLOSS) + 매일 받은 새 세트 낱말 풀이(SETS.gloss): 카드에 없는 낱말의 짧은 풀이(AI 작성). 꾹 누른 낱말은 카드 → 사전 → 바깥 사전 찾기 순서 */
const GLOSS=(window.PE_GLOSS&&window.PE_GLOSS.w)||{};
const GL_JOSA=['으로부터','에서부터','으로써','으로서','에서는','에서도','에서의','으로의','으로는','으로도','이므로','하므로','에서','에는','에도','으로','이며','이고','이나','이다','에게','처럼','보다','까지','부터','마다','과의','와의','만큼','이란','란','은','는','을','를','의','에','로','와','과','이','가','도','만'];
const GL_END=['시킨다','시키는','시켜','한다','하는','하여','하고','하며','하면','해야','해서','했다','하지','하기','되는','된다','되어','되고','되며','되면','될','된','할','함','됨','하다','되다','적인','적으로','적'];
/* 사전 낱말을 만들 때와 같은 방식으로 조사·어미를 뗀다 */
function glStem(w){w=String(w||'');if(!/^[가-힣]+$/.test(w))return w;
  for(let r=0;r<2;r++){for(const j of GL_JOSA)if(w.length-j.length>=2&&w.endsWith(j)){w=w.slice(0,-j.length);break;}for(const e of GL_END)if(w.length-e.length>=2&&w.endsWith(e)){w=w.slice(0,-e.length);break;}}return w;}
/* 낱말 → {t:'card',id} | {t:'gloss',w,d} | {t:'none',w}. 그대로·조사 뗀 꼴, 다음엔 붙여 쓴 말의 가장 긴 조각(흙막이벽체 → 흙막이) */
/* 조사·어미를 하나씩 떼며 나온 꼴(긴 것부터): 가물막이를 → 가물막이 → 가물막 */
function glForms(w){const out=[w];if(!/^[가-힣]+$/.test(w))return out;let x=w;
  for(let r=0;r<4;r++){let y=x;for(const j of GL_JOSA)if(y.length-j.length>=2&&y.endsWith(j)){y=y.slice(0,-j.length);break;}
    if(y===x)for(const e of GL_END)if(y.length-e.length>=2&&y.endsWith(e)){y=y.slice(0,-e.length);break;}if(y===x)break;out.push(y);x=y;}return out;}
/* 사전 값은 "풀이" 또는 ["표제어","풀이"](키가 조사 떼기로 줄어든 꼴일 때, 예: 가물막 → 가물막이) */
function glossGet(k){const own=(o,x)=>!!o&&Object.prototype.hasOwnProperty.call(o,x);if(own(GLOSS,k))return GLOSS[k];const g=SETS.gloss&&SETS.gloss.w;return own(g,k)&&typeof g[k]==='string'?g[k]:null;}
function glossEntry(k){const v=glossGet(k);return Array.isArray(v)?{w:v[0],d:v[1]}:{w:k,d:v};}
function glLookup(raw){const w=String(raw||'').trim();if(!w)return null;const m=glIdx().m;
  const tryW=x=>m.has(x)?{t:'card',id:m.get(x)}:glossGet(x)!=null?Object.assign({t:'gloss'},glossEntry(x)):null;
  const st=glStem(w);let r=null;for(const x of glForms(w).concat(st,/^[a-z]/i.test(w)?[w.toUpperCase()]:[])){r=tryW(x);if(r)return r;}
  /* 붙여 쓴 말: 앞·뒤 조각 중 가장 긴 것(카드 이름은 2자, 사전 낱말은 3자 이상) */
  if(/^[가-힣]+$/.test(st))for(let n=st.length-1;n>=2;n--)for(const x of[st.slice(0,n),st.slice(st.length-n)]){r=tryW(x);if(r&&(r.t==='card'||n>=3))return r;}
  return{t:'none',w:st||w};}
/* 화면 좌표의 낱말(꾹 누른 자리). WebKit의 caretRangeFromPoint로 글자 위치를 찾는다 */
function glWordAt(x,y){const r=document.caretRangeFromPoint?document.caretRangeFromPoint(x,y):null;const n=r&&r.startContainer;if(!n||n.nodeType!==3)return'';
  const t=n.data,isW=ch=>/[가-힣A-Za-z0-9]/.test(ch||'');let a=r.startOffset;if(!isW(t[a])&&isW(t[a-1]))a--;if(!isW(t[a]))return'';
  let b=a;while(a>0&&isW(t[a-1]))a--;while(b<t.length&&isW(t[b]))b++;const w=t.slice(a,b);return/^[0-9]+$/.test(w)?'':w;}
function glossSheet(w,d){const q=encodeURIComponent(w);
  return`<div class="sheet" style="margin-top:4px"><p class="sheet-k">${d?'용어 풀이':'앱 사전에 없는 낱말'}</p><h3>${esc(w)}</h3>${d?`<p class="defn ruled" style="margin-top:10px">${glHTML(d,'')}</p><p class="note">앱에 넣어 둔 짧은 풀이예요(AI 작성). 시험 전에 교재로 한 번 더 확인하세요.</p>`:`<p class="note" style="margin-top:8px">카드와 앱 사전에 없는 낱말이에요. 아래에서 찾아볼 수 있어요(인터넷 필요).</p>`}</div>
  <div class="btns"><a class="btn sec" target="_blank" rel="noopener" href="https://ko.dict.naver.com/#/search?query=${q}">국어사전</a><a class="btn sec" target="_blank" rel="noopener" href="https://terms.naver.com/search.naver?query=${q}">지식백과</a></div>`;}
function glOpen(raw){const r=glLookup(raw);if(!r)return false;if(r.t==='card'){const c=card(r.id);if(!c)return false;openModal(cardModal(c));return true;}openModal(glossSheet(r.w,r.t==='gloss'?r.d:''));return true;}

/* ════════ 8. 세트 진행·다시 보기 ════════ */
function sp(d){return S.sp[d]||(S.sp[d]={read:{},quiz:{},tasks:{},essay:{},rev:{}});}
function spGet(d){return S.sp[d]||{read:{},quiz:{},tasks:{},essay:{},rev:{}};}
function setStatus(d){const s=SETS.sets[d];if(!s)return null;const p=spGet(d);const nc=(s.cards||[]).length,nq=(s.quiz||[]).length,nt=(s.tasks||[]).length;
  const read=Object.keys(p.read||{}).length,qa=Object.keys(p.quiz||{}).length,qok=Object.values(p.quiz||{}).filter(v=>v&&v.ok).length,td=Object.values(p.tasks||{}).filter(Boolean).length,ed=!!(p.essay&&p.essay.done);
  const done=read>=nc&&qa>=nq&&(ed||!s.essay)&&td>=nt;return{nc,nq,nt,read,qa,qok,td,ed,done};}
function reviewDue(d){const p=S.sp[d];if(!p||!p.first)return null;const age=diffDays(p.first,todayStr());const done=p.rev||{};let due=null;REVIEW_STEPS.forEach(st=>{if(age>=st&&!done[st])due=st;});return due;}
function dueSetReviews(){return Object.keys(SETS.sets).sort().map(d=>({d,step:reviewDue(d)})).filter(x=>x.step);}
function markReviewed(d,step){const p=sp(d);p.rev=p.rev||{};REVIEW_STEPS.forEach(st=>{if(st<=step)p.rev[st]=todayStr();});calMark('rev:'+d,'term',`${korDate(d)} 세트 다시 보기(${step}일 차)`);save();}
function latestSetDate(){const ks=Object.keys(SETS.sets).sort();return ks.length?ks[ks.length-1]:null;}
function latestMockDate(){const ks=Object.keys(SETS.mocks).sort();return ks.length?ks[ks.length-1]:null;}

/* ════════ 9. 동기화 ════════ */
let syncing=false;
function dataBase(){let u=(S.settings.dataUrl||'').trim()||DATA_DEFAULT;if(!/\/$/.test(u))u+='/';return u;}
function getJSON(url){return PE_IO.fetchJSON(url);}
function glossUrl(){const b=dataBase();return/\/data\/$/.test(b)?b.replace(/\/data\/$/,'/app/gloss/daily.json'):'';}
async function sync(force){
  if(syncing)return;const now=Date.now();if(!force&&S.sync&&S.sync.last&&now-S.sync.last<8*60*1000)return;
  syncing=true;paintSyncBits();const got={sets:0,mocks:0,k:0};
  try{const base=dataBase();const idx=await getJSON(base+'index.json?t='+now);
    for(const it of(idx.sets||[])){const cur=SETS.sets[it.d];if(cur&&(cur._rev||1)>=(it.rev||1))continue;
      try{const o=await getJSON(base+'sets/'+it.d+'.json?r='+(it.rev||1)+'&t='+now);if(o&&o.date===it.d&&Array.isArray(o.cards)){o._rev=it.rev||1;SETS.sets[it.d]=o;got.sets++;}}catch(e){}}
    for(const it of(idx.mocks||[])){const cur=SETS.mocks[it.d];if(cur&&(cur._rev||1)>=(it.rev||1))continue;
      try{const o=await getJSON(base+'mocks/'+it.d+'.json?r='+(it.rev||1)+'&t='+now);if(o&&o.date===it.d){o._rev=it.rev||1;SETS.mocks[it.d]=o;got.mocks++;}}catch(e){}}
    if(idx.kichul&&(!SETS.kichul||(SETS.kichul.rev||0)<idx.kichul.rev)){try{const k=await getJSON(base+'kichul.json?r='+idx.kichul.rev);if(k&&Array.isArray(k.rounds)){k.rev=idx.kichul.rev;SETS.kichul=k;got.k=1;}}catch(e){}}
    /* 새 세트 낱말 풀이(예약 작업이 app/gloss/daily.json에 올린다): 새 세트를 받았거나 2시간이 지났으면 */
    const gu=glossUrl();if(gu&&(got.sets||got.mocks||!SETS.gloss||now-(SETS.gloss.at||0)>2*3600*1000)){try{const g=await getJSON(gu+'?t='+now);if(g&&g.w&&typeof g.w==='object'){const w={};for(const k of Object.keys(g.w)){const v=g.w[k];if(typeof v==='string'&&k.length<=30&&v.length<=200)w[k]=v;}SETS.gloss={at:now,updated:String(g.updated||''),w};}}catch(e){}}
    SETS.index={updated:idx.updated||'',sets:(idx.sets||[]).length,mocks:(idx.mocks||[]).length};SETS.plan=idx.plan||null;saveSets();
    S.sync={last:now,ok:true,updated:idx.updated||''};
  }catch(e){S.sync={last:now,ok:false,err:String(e&&e.message||e),updated:(S.sync&&S.sync.updated)||''};}
  save();syncing=false;
  if(got.k&&!got.sets&&!got.mocks)invalidate();
  if(got.sets||got.mocks){invalidate();toast(got.sets&&got.mocks?`세트 ${got.sets}개, 모의고사 ${got.mocks}개를 받았어요`:got.sets?`새 세트 ${got.sets}개를 받았어요`:`모의고사 ${got.mocks}개를 받았어요`);}
  softRender();}
function syncLine(){const s=S.sync||{};const n=Object.keys(SETS.sets).length;
  if(syncing)return`<div class="syncline"><span class="spin"></span>받아 오는 중…</div>`;
  if(!s.last)return`<div class="syncline"><span class="sd off"></span>아직 받아 오지 않았어요</div>`;
  return`<div class="syncline"><span class="sd ${s.ok?'':'off'}"></span>${s.ok?`마지막 확인 ${esc(hhmm(s.last))}, 받은 세트 ${n}개`:`받아 오기 실패(${esc(s.err||'')}) — 인터넷 연결을 확인하세요`}</div>`;}
function paintSyncBits(){document.querySelectorAll('[data-syncline]').forEach(el=>el.innerHTML=syncLine());}

/* ════════ 10. 라우터 ════════ */
const TAB_OF={set:'today',sess:'',memo:'',cal:'today',kichul:'test',mock:'test',guide:'test',admin:'more',plan:'more',schedule:'more',timer:'more',prompts:'more',imp:'more',settings:'more',backup:'more',about:'more',archive:'review',wrong:'review',stats:'test'};
const TABS=['today','review','study','test','more'];
let R={tab:'today',page:null,a:null,b:null};
function parseHash(){const h=decodeURIComponent((location.hash||'').replace(/^#\/?/,''));const p=h.split('/');const r={tab:'today',page:null,a:p[1]||null,b:p[2]||null};
  if(TABS.includes(p[0]))r.tab=p[0];else if(p[0]&&TAB_OF[p[0]]!==undefined){r.page=p[0];r.tab=TAB_OF[p[0]]||(SES&&SES.from)||'today';}return r;}
function nav(h){if(('#'+h)===location.hash)render();else location.hash=h;}
function back(){if(history.length>1&&document.referrer!==undefined&&R.page){history.back();}else nav(R.tab||'today');}
window.addEventListener('hashchange',()=>{R=parseHash();if(R.page!=='sess')SES_SAVE();if(R.page!=='memo')memoStop();render();window.scrollTo(0,0);});
let SES=null;function SES_SAVE(){/* 세션은 메모리에만 */}
function render(){R=parseHash();document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===R.tab));
  const v=$('#view');let html='';
  try{
    if(!R.page)html=({today:vToday,review:vReview,study:vStudy,test:vTest,more:vMore}[R.tab]||vToday)();
    else html=({set:vSet,sess:vSess,memo:vMemo,cal:vCal,kichul:vKichul,mock:vMock,guide:vGuide,admin:vAdmin,plan:vPlan,schedule:vSchedule,timer:vTimer,prompts:vPrompts,imp:vImport,settings:vSettings,backup:vBackup,about:vAbout,archive:vArchive,wrong:vWrong,stats:vStats}[R.page]||vToday)();
  }catch(e){html=`<div class="empty" style="margin-top:24px"><b>화면을 그리는 중 오류가 났어요</b>${esc(e.message)}</div>`;console.error(e);}
  v.innerHTML=html;paintNavBadges();paintPill();if(R.page==='timer')paintTimer();if(R.page==='memo')paintMemo();
  if(R.page==='sess'&&SES&&!SES.answered&&SES.items[SES.i]&&SES.items[SES.i].type==='fill'){const f=v.querySelector('.fill-in');if(f)try{f.focus({preventScroll:true});}catch(e){}}}
function softRender(){if(R.page==='sess')return paintNavBadges();if(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return paintNavBadges();render();}
function paintNavBadges(){const rv=dueSetReviews().length+(Object.keys(S.wrong).length?1:0);const b=document.querySelector('#nav button[data-tab="review"]');if(b){let nb=b.querySelector('.nb');const n=dueSetReviews().length;if(n){if(!nb){nb=document.createElement('span');nb.className='nb';b.appendChild(nb);}nb.textContent=n;}else if(nb)nb.remove();}}
const topbar=(title)=>`<div class="topbar"><button class="back" data-act="back">${icon('back')}뒤로</button><div class="ttl">${esc(title)}</div></div>`;
const sec=(title,meta,body)=>`<section class="sec"><div class="sec-h"><h2>${esc(title)}</h2>${meta?`<span class="meta">${meta}</span>`:''}</div>${body}</section>`;
function row(o){const tag=o.act?'button':'div';const attrs=o.act?` data-act="${o.act}"${o.data?Object.keys(o.data).map(k=>` data-${k}="${esc(o.data[k])}"`).join(''):''}`:'';
  return`<${tag} class="row${o.ic?'':' noic'}"${attrs}>${o.ic?`<span class="ic ${o.tone||''}">${icon(o.ic)}</span>`:''}<span class="tx"><span class="tt">${o.t}</span>${o.d?`<span class="ds">${o.d}</span>`:''}</span>${o.v!=null?`<span class="val${o.zero?' zero':''}">${o.v}</span>`:''}${o.badge?o.badge:''}${o.act?'<span class="chev"></span>':''}</${tag}>`;}

/* ════════ 11. 화면: 오늘 ════════ */
function routineFor(ds){const w=weekIndex(ds),k=phaseKey(w),r=PE_ROUTINES[k]||PE_ROUTINES[1];return r[dayType(ds)]||r.wd;}
function checkRate(ds){const items=routineFor(ds),c=S.checks[ds]||{};let n=0;items.forEach((_,i)=>{if(c[i])n++;});return items.length?n/items.length:0;}
function isActive(ds){const d=S.daily[ds];return(d&&(d.active||d.graded>0))||checkRate(ds)>=0.5;}
function streak(){let n=0,t=todayStr();if(!isActive(t))t=addDays(t,-1);while(isActive(t)){n++;t=addDays(t,-1);if(n>500)break;}return n;}
function vToday(){const t=todayStr(),w=weekIndex(),wk=weekObj(w),ph=phaseObj(w),de=diffDays(t,S.settings.exam);
  const s=SETS.sets[t],st=s?setStatus(t):null,dtp=dayType(t);
  let setBox='';
  if(s){const label=st.done?'다시 보기':(st.read||st.qa)?'이어서 하기':'세트 시작하기';
    setBox=`<div class="sheet"><p class="sheet-k">오늘의 세트${s.units&&s.units.length?', '+esc(s.units.map(unitShort).join('·')):''}</p><h3>${esc(s.title||'오늘의 세트')}</h3>
    <ul class="steps">
      <li class="${st.read>=st.nc?'done':''}"><span class="dot ${st.read>=st.nc?'on':st.read?'half':''}"></span><span class="k">용어 ${st.nc}개 읽기</span><span class="v">${st.read}/${st.nc}</span></li>
      <li class="${st.qa>=st.nq?'done':''}"><span class="dot ${st.qa>=st.nq?'on':st.qa?'half':''}"></span><span class="k">퀴즈 ${st.nq}문</span><span class="v">${st.qa?`${st.qok}/${st.nq} 정답`:`0/${st.nq}`}</span></li>
      ${s.essay?`<li class="${st.ed?'done':''}"><span class="dot ${st.ed?'on':''}"></span><span class="k">논술 1문제 손글씨</span><span class="v">${st.ed?'완료':'25분'}</span></li>`:''}
      ${st.nt?`<li class="${st.td>=st.nt?'done':''}"><span class="dot ${st.td>=st.nt?'on':st.td?'half':''}"></span><span class="k">오늘 밤 과제</span><span class="v">${st.td}/${st.nt}</span></li>`:''}
    </ul><button class="btn" data-act="go" data-h="set/${t}">${label}</button></div>`;}
  else{const last=latestSetDate();const wk2=dtp==='wd';
    setBox=`<div class="sheet"><p class="sheet-k">오늘의 세트</p><h3>${wk2?'오늘 세트를 기다리는 중':'주말에는 세트가 없어요'}</h3>
    <p class="ds" style="margin:8px 0 12px">${wk2?'평일 06:21에 만들기 시작해 보통 30분 안에 도착해요. 앱을 열 때마다 자동으로 확인합니다.':(dtp==='sat'?'토요일엔 주간 모의고사가 테스트 탭으로 들어와요.':'일요일은 복습 탭에서 다시 볼 세트와 오답 노트를 비우는 날이에요.')}</p>
    <div class="btns">${wk2?`<button class="btn" data-act="sync">지금 받아 오기</button>`:''}${last?`<button class="btn sec" data-act="go" data-h="set/${last}">${last===addDays(t,-1)?'어제':korDate(last)} 세트</button>`:''}</div></div>`;}
  const due=dueCards(null).length,rv=dueSetReviews(),wr=Object.keys(S.wrong).length,lm=latestMockDate();
  const thisMock=lm&&weekIndex(lm)===w?lm:null;
  const items=routineFor(t),chk=S.checks[t]||{},done=items.filter((_,i)=>chk[i]).length;
  const ms=milestones().filter(m=>m.d>=t).slice(0,2);
  return`<div class="ltitle"><div><h1>오늘</h1><p class="lsub">${esc(korDate(t,true))}, ${esc(weekLabel(w))}</p></div><div class="dday"><span>제${PLAN.target.r}회까지</span><b class="num">D-${de>=0?de:0}</b></div></div>
  <div style="margin-top:14px">${setBox}</div><div data-syncline>${syncLine()}</div>
  ${sec('복습','',`<div class="group">
    ${row({ic:'cards',t:'카드 복습',d:due?'간격이 돌아온 카드부터':'오늘 복습할 카드를 다 했어요',v:due,zero:!due,act:'start-due'})}
    ${row({ic:'redo',t:'다시 볼 세트',d:rv.length?rv.map(x=>korDate(x.d)+'('+x.step+'일 차)').slice(0,3).join(', '):'세트를 끝내면 1·3·7·14·30일 뒤에 돌아와요',v:rv.length,zero:!rv.length,act:'go',data:{h:'review'}})}
    ${row({ic:'x',tone:'red',t:'오답 노트',d:wr?'두 번 연속 맞히면 빠져요':'틀린 문제가 여기 모여요',v:wr,zero:!wr,act:wr?'start-wrong':'go',data:{h:'wrong'}})}
    ${thisMock?row({ic:'paper',tone:'amber',t:'이번 주 모의고사',d:esc(SETS.mocks[thisMock].title||korDate(thisMock)),act:'go',data:{h:'mock/'+thisMock}}):''}
  </div>`)}
  ${sec('오늘 할 일',`${done}/${items.length}`,`<div class="group">${items.map((it,i)=>`<label class="check ${chk[i]?'done':''}"><input type="checkbox" data-act="chk" data-i="${i}" ${chk[i]?'checked':''}><span>${esc(it)}</span></label>`).join('')}</div>
    <p class="note">연속 학습 ${streak()}일. 손글씨 항목이 합격을 가릅니다.</p>
    <div class="group" style="margin-top:10px">${row({ic:'caldot',t:'학습 달력',d:'접속한 날과 끝낸 공부(용어·논술·퀴즈·모의)',v:calMonthIn(t.slice(0,7))+'일',act:'go',data:{h:'cal'}})}</div>`)}
  ${sec('이번 주 목표',`${md(weekRange(Math.max(0,w))[0])}~${md(weekRange(Math.max(0,w))[1])}`,`<p class="wk-t">${esc(wk.t)}</p><div class="group plain">${(wk.goals||[]).slice(0,4).map(g=>`<div class="row noic"><span class="tx"><span class="tt" style="font-weight:500">${esc(g)}</span></span></div>`).join('')}
    ${row({t:PLAN.E+'주 로드맵 전체 보기',act:'go',data:{h:'plan'}})}</div>`)}
  ${ms.length?sec('다가오는 일정','',`<div class="group">${ms.map(m=>row({ic:'flag',tone:m.k==='exam'?'red':'gray',t:esc(m.t),d:`${esc(m.d)}, D-${diffDays(t,m.d)}`})).join('')}</div>${PLAN.target.est||(PLAN.mock&&PLAN.mock.est)?`<p class="note">시험일은 예년 패턴으로 잡은 예상치예요. 큐넷 공고가 나오면 더보기 → 시험 일정에서 고치세요.</p>`:''}`):''}`;}

/* ════════ 12. 화면: 세트 ════════ */
const SV={};
function vSet(){const d=R.a;const s=SETS.sets[d];
  if(!s)return topbar('세트')+`<div class="empty" style="margin-top:20px"><b>${esc(d||'')} 세트가 아직 없어요</b>앱이 저장소에서 받아 오지 못했어요.<div class="btns"><button class="btn" data-act="sync">지금 받아 오기</button></div></div>`;
  const p=sp(d);if(!p.first){p.first=todayStr();save();}
  const tab=SV[d]||'cards';const st=setStatus(d);const w=s.week!=null?s.week:weekIndex(d);
  let body='';
  if(tab==='cards'){body=(s.cards||[]).map((sc,i)=>{const id=setCardId(d,i);const c=id?card(id):null;const t=c?c.t:sc.t;const open=SV[d+':o']===i;const read=!!p.read[i];
      return`<div class="acc ${open?'open':''} ${read?'read':''}"><button data-act="set-open" data-d="${d}" data-i="${i}"><span class="no">${i+1}</span><span class="tt">${esc(t||'(내용 없음)')}${sc.ref?'':' <span class="tag-new">새 용어</span>'}</span><span class="open-ic"></span></button>
      ${open?`<div class="body">${c?`<p class="defn">${glHTML(c.d,c.id)}</p><ul class="kws">${(c.k||[]).map(k=>`<li><span>${esc(k)}</span></li>`).join('')}</ul>`:`<p class="defn">${glHTML(sc.d||'','')}</p>`}
        ${sc.plus?`<p class="plus">${esc(sc.plus)}</p>`:''}${(sc.field||(c&&c.field))?`<p class="field">현장: ${esc(sc.field||c.field)}</p>`:''}
        ${c&&c.x&&c.x.length?`<p class="xref">기출 <b>${c.x.length}회</b> 출제: ${c.x.map(kLabelShort).join(', ')}</p>`:''}${(sc.basis||(c&&c.basis))?`<p class="xref">근거: ${esc(sc.basis||c.basis)}</p>`:''}
        ${c?`<div class="btns"><button class="btn sm sec" data-act="star" data-id="${c.id}">${pget(c.id).star?'★ 별표 해제':'☆ 별표'}</button><span class="note" style="margin:auto 0">${unitName(c.u)}</span></div>`:''}</div>`:''}</div>`;}).join('')
      +(fr=>(mr=>`<div class="btns"><button class="btn sec" data-act="set-flash" data-d="${d}">${fr?`카드 넘겨 보기 이어서 (${fr})`:'카드로 넘겨 보며 외우기'}</button><button class="btn sec" data-act="start-fill" data-d="${d}">빈칸 쓰기</button></div><div class="btns" style="margin-top:8px"><button class="btn sec" data-act="memo-set" data-d="${d}">${mr?`가리며 외우기 이어서 (${mr})`:'가리며 외우기(보였다 가렸다 반복)'}</button></div>${fr||mr?`<div class="btns" style="margin-top:4px"><button class="btn ghost" data-act="resume-clear" data-k="flash:${d} memo:set:${d}">이어 하지 않고 처음부터</button></div>`:''}`)(resumeAt('memo:set:'+d)))(resumeAt('flash:'+d))+`<p class="note">펼쳐 읽은 용어는 내일 카드 복습으로 다시 나와요. 모르는 낱말은 꾹 누르면 풀이가 나와요.</p>`;}
  else if(tab==='quiz'){body=(s.quiz||[]).map((q,i)=>quizBlock(d,i,q,p.quiz[i])).join('')||'<div class="empty">이 세트엔 퀴즈가 없어요</div>';
    if(st.qa)body+=`<p class="note">${st.qok}/${st.nq} 정답. 틀린 문제는 오답 노트로 갔어요.</p>`;}
  else if(tab==='essay'){const e=s.essay;if(!e)body='<div class="empty">이 세트엔 논술 문제가 없어요</div>';else{const show=SV[d+':eo'];
    body=`<div class="qcard"><p class="qnum">${unitName(e.u)}${e.x?', 기출 '+esc([].concat(e.x).map(kLabelShort).join(', ')):''}</p><p class="qtext">${esc(e.t)}</p>
      ${show?`<ol style="margin:0 0 0 20px;padding:0;line-height:1.75">${(e.o||[]).map(o=>`<li>${esc(String(o).replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol>${e.fig?`<p class="plus">그림·표: ${esc(e.fig)}</p>`:''}${e.p?`<p class="field">채점 포인트: ${esc(e.p)}</p>`:''}`:`<button class="btn sec" data-act="set-eo" data-d="${d}">목차 힌트 보기</button><p class="note">먼저 소제목 5~7개를 스스로 정한 뒤 열어 보세요.</p>`}</div>
      <div class="btns"><button class="btn ghost" data-act="go" data-h="guide">처음이라면: 답안지 쓰는 법·모범 답안</button></div>
      <div class="btns" style="margin-top:4px"><button class="btn" data-act="timer-go" data-p="one2">25분 타이머</button><button class="btn sec" data-act="copy-essay" data-d="${d}">첨삭 요청 복사</button></div>
      <label class="check group" style="margin-top:12px;border-radius:14px"><input type="checkbox" data-act="set-essay-done" data-d="${d}" ${p.essay&&p.essay.done?'checked':''}><span>손글씨로 다 썼어요(사진을 찍어 Claude 프로젝트에 올리기)</span></label>`;}}
  else{body=`<div class="group">${(s.tasks||[]).map((t,i)=>`<label class="check ${p.tasks[i]?'done':''}"><input type="checkbox" data-act="set-task" data-d="${d}" data-i="${i}" ${p.tasks[i]?'checked':''}><span>${esc(t)}</span></label>`).join('')||'<div class="row noic"><span class="tx">과제가 없어요</span></div>'}</div>
    ${(s.check&&s.check.length)?sec('확인이 필요한 부분','',`<div class="group plain">${s.check.map(c=>`<div class="row noic"><span class="tx"><span class="tt" style="font-weight:500">${esc(c)}</span></span></div>`).join('')}</div><p class="note">세트를 만들 때 확신하지 못한 내용이에요. 교재로 한 번 확인하세요.</p>`):''}`;}
  const tabs=[['cards',`용어 ${st.read}/${st.nc}`],['quiz',`퀴즈 ${st.qa}/${st.nq}`],['essay','논술'],['tasks','과제']];
  return topbar(korDate(d,true)+' 세트')+`<h1 class="ptitle">${esc(s.title||'오늘의 세트')}</h1><p class="lsub">${esc(weekLabel(w))}${s.units&&s.units.length?', '+esc(s.units.map(unitName).join(', ')):''}</p>${s.goal?`<p class="lsub" style="margin-top:4px">${esc(s.goal)}</p>`:''}
  <div class="seg" style="margin:16px 0 14px">${tabs.map(t=>`<button class="${tab===t[0]?'on':''}" data-act="set-tab" data-d="${d}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>${body}
  ${st.done?`<p class="note" style="color:var(--ok);font-weight:700">이 세트를 모두 끝냈어요. 1·3·7·14·30일 뒤 복습 탭에 다시 나타납니다.</p>`:''}`;}
function quizBlock(d,i,q,ans){const opts=q.o||[];const answered=ans!=null;
  return`<div class="qcard" style="margin-bottom:10px"><p class="qnum">퀴즈 ${i+1}${q.u?', '+esc(unitShort(q.u)):''}</p><p class="qtext">${esc(q.q)}</p>
  ${opts.map((o,k)=>{let cls='';if(answered){if(k===q.a)cls='right';else if(ans.pick===k)cls='wrong';}return`<button class="opt ${cls}" data-act="set-quiz" data-d="${d}" data-i="${i}" data-k="${k}" ${answered?'disabled':''}><span class="ab">${opts.length===2?(k?'X':'O'):'①②③④⑤'.charAt(k)}</span><span>${esc(o)}</span></button>`;}).join('')}
  ${answered?`<div class="ex ${ans.ok?'ok':'no'}"><b>${ans.ok?'정답':'오답'}</b> ${esc(q.ex||'')}</div>`:''}</div>`;}

/* ════════ 13. 화면: 복습 ════════ */
function vReview(){const rv=dueSetReviews(),wl=wrongList(),stars=deck().filter(c=>pget(c.id).star);
  const byT={card:0,quiz:0,cloze:0,fill:0};wl.forEach(w=>byT[w.type]++);
  return`<div class="ltitle"><div><h1>복습</h1><p class="lsub">잊기 직전에 다시 꺼내 보는 곳</p></div></div>
  ${sec('다시 볼 세트',rv.length?rv.length+'개':'',rv.length?`<div class="group">${rv.map(x=>{const s=SETS.sets[x.d];return row({ic:'redo',t:esc(korDate(x.d))+' 세트, '+x.step+'일 차',d:esc(s.title||''),act:'start-setrev',data:{d:x.d}});}).join('')}</div>
    ${rv.length>1?`<div class="btns"><button class="btn" data-act="start-setrev-all">${rv.length}개 이어서 복습</button></div>`:''}`
    :`<div class="empty"><b>오늘 다시 볼 세트가 없어요</b>세트를 연 날로부터 1·3·7·14·30일 뒤에 여기로 돌아와요. 카드 복습과 퀴즈를 짧게 다시 합니다.</div>`)}
  ${sec('오답 노트',wl.length?`${wl.length}개`:'',wl.length?`<div class="group">${row({ic:'x',tone:'red',t:'오답만 다시 풀기',d:`카드 ${byT.card}, 퀴즈 ${byT.quiz}, 수치 ${byT.cloze}${byT.fill?`, 빈칸 ${byT.fill}`:''}. 두 번 연속 맞히면 빠져요`,act:'start-wrong'})}${row({ic:'list',tone:'gray',t:'목록 보기',act:'go',data:{h:'wrong'}})}</div>`
    :`<div class="empty"><b>오답이 없어요</b>퀴즈·테스트에서 틀리거나 카드에서 "모름"을 고르면 여기 모여요.</div>`)}
  ${sec('기준 수치 빈칸','',`<div class="group">${row({ic:'num',tone:'amber',t:'수치만 가려 놓고 맞히기',d:'정의 속 기준값(%, MPa, 일, m…)을 빈칸으로. 10문',act:'start-cloze'})}</div><p class="note">범위는 테스트 탭에서 고른 단원을 따라가요. 지금 범위: ${esc(rangeLabel(S.range||'week'))}</p>`)}
  ${sec('모아 보기','',`<div class="group">
    ${row({ic:'star',tone:'amber',t:'별표 카드',v:stars.length,zero:!stars.length,act:stars.length?'start-stars':'',d:stars.length?'어려운 카드만 모아서':'카드에서 ☆를 누르면 모여요'})}
    ${row({ic:'box',tone:'gray',t:'세트 보관함',d:`받은 세트 ${Object.keys(SETS.sets).length}개, 모의고사 ${Object.keys(SETS.mocks).length}개`,act:'go',data:{h:'archive'}})}
  </div>`)}`;}

function vWrong(){const wl=wrongList();const nm={card:'카드',quiz:'퀴즈',cloze:'수치',fill:'빈칸 쓰기'};
  return topbar('오답 노트')+`<h1 class="ptitle">오답 노트</h1><p class="lsub">${wl.length}개. 다시 풀어서 두 번 연속 맞히면 빠져요.</p>
  ${wl.length?`<div class="btns"><button class="btn" data-act="start-wrong">오답만 다시 풀기</button></div><div class="group" style="margin-top:14px">${wl.map(w=>`<div class="row noic"><span class="tx"><span class="tt">${esc(w.label)}</span><span class="ds">${nm[w.type]}, ${w.w.n}번 틀림, 마지막 ${esc(md(w.w.last||w.w.since))}</span></span><button class="btn sm ghost" data-act="wrong-del" data-k="${esc(w.key)}">빼기</button></div>`).join('')}</div>`:`<div class="empty" style="margin-top:14px"><b>비어 있어요</b>틀린 문제가 생기면 여기에 모여요.</div>`}`;}

function vArchive(){const sd=Object.keys(SETS.sets).sort().reverse(),mdts=Object.keys(SETS.mocks).sort().reverse();
  return topbar('세트 보관함')+`<h1 class="ptitle">세트 보관함</h1><div data-syncline>${syncLine()}</div><div class="btns"><button class="btn sec" data-act="sync">지금 받아 오기</button></div>
  ${sec('매일 세트',sd.length+'개',sd.length?`<div class="group">${sd.map(d=>{const s=SETS.sets[d],st=setStatus(d);return row({ic:st.done?'check':'paper',tone:st.done?'ok':'',t:esc(korDate(d,true)),d:esc(s.title||''),v:st.done?'완료':`${st.read}/${st.nc}`,act:'go',data:{h:'set/'+d}});}).join('')}</div>`:`<div class="empty"><b>아직 받은 세트가 없어요</b>평일 06:21 예약 작업이 만든 세트가 여기 쌓여요.</div>`)}
  ${sec('주간 모의고사',mdts.length+'개',mdts.length?`<div class="group">${mdts.map(d=>row({ic:'paper',tone:'amber',t:esc(korDate(d,true)),d:esc(SETS.mocks[d].title||''),act:'go',data:{h:'mock/'+d}})).join('')}</div>`:`<div class="empty"><b>아직 없어요</b>토요일 06:50에 만들어져요.</div>`)}`;}

/* ════════ 14. 화면: 암기 ════════ */
const RANGES=[['week','이번 주 단원'],['all','전체'],['kichul','기출에 나온 카드'],['set','세트로 받은 카드'],['stars','별표 카드']];
function rangeLabel(v){const r=RANGES.find(x=>x[0]===v);if(r)return r[0]==='week'?'이번 주 단원'+(thisWeekUnits()?'('+thisWeekUnits().map(unitShort).join(', ')+')':'(이번 주는 전 범위)'):r[1];return unitName(Number(v));}
function rangeFilter(v){v=v||'week';if(v==='all')return()=>true;if(v==='week'){const u=thisWeekUnits();return c=>!u||u.includes(Number(c.u));}
  if(v==='kichul')return c=>(c.x||[]).length>0;if(v==='set')return c=>c.src==='set';if(v==='stars')return c=>pget(c.id).star;const n=Number(v);return c=>Number(c.u)===n;}
function rangeUnits(v){v=v||'week';if(v==='week')return thisWeekUnits();if(/^\d+$/.test(String(v)))return[Number(v)];return null;}
function rangeSelect(id,cur){return`<select class="select" id="${id}">${RANGES.map(r=>`<option value="${r[0]}"${cur===r[0]?' selected':''}>${esc(rangeLabel(r[0]))}</option>`).join('')}<optgroup label="단원">${PE_UNITS.map(u=>`<option value="${u.id}"${String(cur)===String(u.id)?' selected':''}>${u.id}. ${esc(u.n)}</option>`).join('')}</optgroup></select>`;}
function vStudy(){const rg=S.range||'week',f=rangeFilter(rg);const pool=deck().filter(f);const t=todayStr();
  const due=pool.filter(c=>{const p=S.cards[c.id];return p&&p.seen>0&&p.due&&p.due<=t;}).length;const fresh=pool.filter(c=>!S.cards[c.id]||S.cards[c.id].seen===0).length;const nw=Math.min(fresh,newRoom());
  const learned=deck().filter(c=>pget(c.id).seen>0).length;
  const units=PE_UNITS.map(u=>{const cs=deck().filter(c=>Number(c.u)===u.id);const l=cs.filter(c=>pget(c.id).seen>0).length;const ok=cs.reduce((a,c)=>a+pget(c.id).ok,0),ng=cs.reduce((a,c)=>a+pget(c.id).ng,0);return{u,n:cs.length,l,acc:ok+ng?Math.round(ok/(ok+ng)*100):null};});
  return`<div class="ltitle"><div><h1>암기</h1><p class="lsub">앎을 고를수록 1→3→7→14→30일로 간격이 벌어져요</p></div></div>
  <div class="tiles" style="margin-top:14px"><div class="tile"><b style="color:${due?'var(--red)':'inherit'}">${due}</b><span>복습 대기</span></div><div class="tile"><b>${nw}</b><span>오늘 새 카드</span></div><div class="tile"><b>${learned}<small style="font-size:.9rem;color:var(--ink2)">/${deck().length}</small></b><span>학습한 카드</span></div></div>
  <label class="f">범위</label>${rangeSelect('rangeSel',rg)}
  <div class="btns"><button class="btn" data-act="start-study" ${due+nw?'':'disabled'}>${due+nw?`오늘 학습 시작 (${due+nw}장)`:'오늘 분량을 다 했어요'}</button></div>
  <div class="btns" style="margin-top:8px"><button class="btn sec" data-act="start-free">섞어서 자유 복습 (${pool.length}장)</button></div>
  ${(mr=>`<div class="btns" style="margin-top:8px"><button class="btn sec" data-act="memo-study" ${pool.length||mr?'':'disabled'}>${mr?`가리며 외우기 이어서 (${mr})`:`가리며 외우기 (${Math.min(pool.length,MEMO_MAX)}장, 별표·오답 먼저)`}</button></div>${mr?'<div class="btns" style="margin-top:4px"><button class="btn ghost" data-act="resume-clear" data-k="memo:study">이어 하지 않고 처음부터</button></div>':''}`)(resumeAt('memo:study'))}
  <p class="note">복습 대기부터 나오고, 새 카드는 하루 ${S.settings.newPerDay}장까지(설정에서 바꿀 수 있어요). 세트에서 읽은 카드는 이 한도와 따로 셉니다.</p>
  ${sec('단원별 진도','학습 / 정답률',`<div class="group">${units.map(x=>`<button class="unitbar" data-act="study-unit" data-u="${x.u.id}" style="width:100%"><span class="nm">${esc(x.u.n)}</span><span class="bar"><i style="width:${x.n?Math.round(x.l/x.n*100):0}%"></i></span><span class="c">${x.l}/${x.n}</span><span class="c" style="color:${x.acc==null?'var(--ink3)':x.acc>=80?'var(--ok)':x.acc>=60?'var(--amber)':'var(--red)'}">${x.acc==null?'—':x.acc+'%'}</span></button>`).join('')}</div>`)}`;}

/* ════════ 15. 세션(카드·퀴즈·빈칸·목차 공통) ════════ */
function startSession(o){SES=Object.assign({i:0,back:false,answered:null,stats:{ok:0,mid:0,no:0},from:R.page?('#'+R.page+(R.a?'/'+R.a:'')):'#'+R.tab},o);if(!SES.items.length){toast('이 범위에 문제가 없어요');SES=null;return;}nav('sess');}
function vSess(){if(!SES)return topbar('학습')+`<div class="empty" style="margin-top:20px"><b>진행 중인 학습이 없어요</b><div class="btns"><button class="btn" data-act="go" data-h="study">암기 탭으로</button></div></div>`;
  const it=SES.items[SES.i];if(!it)return sessDone();const n=SES.items.length;
  const head=`${topbar(SES.title||'학습')}<div class="prog"><div class="bar"><i style="width:${Math.round(SES.i/n*100)}%"></i></div><span>${SES.i+1} / ${n}</span></div>`;
  if(it.type==='card'){const c=card(it.id);if(!c)return head+skipBtn();const p=pget(c.id);const gotG=SES.graded?SES.graded[SES.i]:null;
    return head+`<div class="fc ${SES.back?'back':''}" data-act="sess-flip"><div class="meta"><span>${esc(unitName(c.u))}${c.x&&c.x.length?`, 기출 ${c.x.length}회`:''}${p.seen?'':', 처음 보는 카드'}</span><button class="star ${p.star?'on':''}" data-act="star" data-id="${c.id}" aria-label="별표">★</button></div>
      ${SES.back?`<div class="term">${esc(c.t)}</div><p class="defn ruled">${glHTML(c.d,c.id)}</p><ul class="kws">${(c.k||[]).map(k=>`<li><span>${esc(k)}</span></li>`).join('')}</ul>${c.x&&c.x.length?`<p class="xref">기출: ${c.x.map(kLabelShort).join(', ')}</p>`:''}`
      :`<div class="term">${esc(c.t)}</div><p class="hint">정의, 원리, 특징, 유의사항을 30초 안에 말해 보고 탭하세요</p>`}</div>
    ${SES.back?`<div class="grade3">${[[0,'모름'],[1,'애매'],[2,'앎']].map(([g,l])=>`<button class="g${g}${gotG===g?' on':''}" data-act="sess-grade" data-g="${g}">${l}<small>${gotG===g?'고른 것':nextLabel(c.id,g)}</small></button>`).join('')}</div>${gotG!=null?'<p class="note" style="text-align:center">다시 고르면 바꿔요</p>':''}`
      :`<div class="btns"><button class="btn" data-act="sess-flip">뒷면 보기</button></div>`}
    <div class="btns sessnav"><button class="btn sec" data-act="sess-prev" ${SES.i?'':'disabled'}>‹ 이전</button><button class="btn sec" data-act="sess-skip">${SES.i+1<n?'다음 ›':'끝내기'}</button></div>`;}
  if(it.type==='mcq'){const c=card(it.id);const ans=SES.answered;
    return head+`<div class="qcard"><p class="qnum">이 설명에 맞는 용어는?${c.x&&c.x.length?' (기출 '+c.x.length+'회)':''}</p><p class="qtext" style="font-weight:500">${esc(c.d)}</p>
      ${it.opts.map((oid,k)=>{const o=card(oid);let cls='';if(ans!=null){if(oid===c.id)cls='right';else if(ans===k)cls='wrong';}return`<button class="opt ${cls}" data-act="sess-pick" data-k="${k}" ${ans!=null?'disabled':''}><span class="ab">${'①②③④'.charAt(k)}</span><span>${esc(o?o.t:'')}</span></button>`;}).join('')}
      ${ans!=null?`<div class="ex ${it.opts[ans]===c.id?'ok':'no'}"><b>${it.opts[ans]===c.id?'정답':'오답'}</b> 키워드: ${esc((c.k||[]).slice(0,4).join(', '))}</div>`:''}</div>
    ${ans!=null?`<div class="btns"><button class="btn" data-act="sess-next">${SES.i+1<n?'다음':'결과 보기'}</button></div>`:''}`;}
  if(it.type==='quiz'){const s=SETS.sets[it.d];const q=s&&s.quiz&&s.quiz[it.i];if(!q)return head+skipBtn();const ans=SES.answered;const opts=q.o||[];
    return head+`<div class="qcard"><p class="qnum">${esc(korDate(it.d))} 세트 퀴즈${q.u?', '+esc(unitShort(q.u)):''}</p><p class="qtext">${esc(q.q)}</p>
      ${opts.map((o,k)=>{let cls='';if(ans!=null){if(k===q.a)cls='right';else if(ans===k)cls='wrong';}return`<button class="opt ${cls}" data-act="sess-pick" data-k="${k}" ${ans!=null?'disabled':''}><span class="ab">${opts.length===2?(k?'X':'O'):'①②③④⑤'.charAt(k)}</span><span>${esc(o)}</span></button>`;}).join('')}
      ${ans!=null?`<div class="ex ${ans===q.a?'ok':'no'}"><b>${ans===q.a?'정답':'오답'}</b> ${esc(q.ex||'')}</div>`:''}</div>
    ${ans!=null?`<div class="btns"><button class="btn" data-act="sess-next">${SES.i+1<n?'다음':'결과 보기'}</button></div>`:''}`;}
  if(it.type==='cloze'){const c=card(it.id);const tok=clozeTokens(c?c.d:'')[it.k];if(!c||!tok)return head+skipBtn();
    return head+`<div class="qcard"><p class="qnum">빈칸에 들어갈 수치는? ${esc(unitShort(c.u))}</p><p class="qtext" style="font-size:1.15rem">${esc(c.t)}</p><p class="defn ruled">${SES.back?clozeRevealHTML(c.d,tok):clozeHTML(c.d,tok)}</p></div>
    ${SES.back?`<div class="grade3" style="grid-template-columns:1fr 1fr"><button class="g0" data-act="sess-self" data-g="0">틀렸어요<small>오답 노트로</small></button><button class="g2" data-act="sess-self" data-g="2">맞혔어요<small>다음</small></button></div>`
      :`<div class="btns"><button class="btn" data-act="sess-flip">정답 보기</button></div><p class="note">머릿속으로 수치와 단위를 말해 본 뒤 정답을 여세요.</p>`}`;}
  if(it.type==='fill'){const c=card(it.id);if(!c)return head+skipBtn();const A=SES.answered;const nok=A?A.res.filter(r=>r.ok).length:0;
    return head+`<div class="qcard"><p class="qnum">빈칸 쓰기, 난이도 ${esc(it.lv)}, ${esc(unitShort(c.u))}</p><p class="qtext" style="font-size:1.15rem">${esc(c.t)}</p><p class="defn ruled fill">${fillHTML(c.d,it,A)}</p>
      ${A?`<div class="ex ${A.all||A.accepted?'ok':'no'}"><b>${A.all?'정답':A.accepted?'맞은 걸로 바꿨어요':'오답'}</b> ${it.b.length}칸 중 ${nok}칸 맞힘${A.res.some(r=>r.typo)?'. 오타 한 글자는 맞은 걸로 쳤어요':''}${A.all||A.accepted?'':'. 오답 노트로 갔어요'}</div>`:''}</div>
    ${A?`<div class="btns">${!A.all&&!A.accepted?'<button class="btn sec" data-act="fill-accept">맞은 걸로 하기</button>':''}<button class="btn" data-act="sess-next">${SES.i+1<n?'다음':'결과 보기'}</button></div>`
      :`<div class="btns"><button class="btn" data-act="fill-check">채점</button><button class="btn sec" data-act="fill-giveup">모르겠어요</button></div><p class="note">빈칸을 눌러 직접 써 넣으세요. 자판의 다음 키로 다음 빈칸에 가요. 띄어쓰기, 가운뎃점, 대소문자는 달라도 되고 수치는 단위까지 맞아야 해요.</p>`}`;}
  if(it.type==='outline'){const e=essay(it.id);if(!e)return head+skipBtn();
    return head+`<div class="qcard"><p class="qnum">${esc(unitName(e.u))}${e.x&&e.x.length?', 기출 '+esc(e.x.map(kLabelShort).join(', ')):''}</p><p class="qtext">${esc(e.t)}</p>
      ${SES.back?`<ol style="margin:0 0 0 20px;padding:0;line-height:1.75">${e.o.map(o=>`<li>${esc(String(o).replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol>${e.p?`<p class="plus">${esc(e.p)}</p>`:''}`:'<p class="note" style="margin:0">서론, 본론 소제목 4~6개, 결론을 정하고 그림·표 1개를 무엇으로 할지까지 정한 뒤 여세요.</p>'}</div>
    ${SES.back?`<div class="grade3" style="grid-template-columns:1fr 1fr"><button class="g0" data-act="sess-self" data-g="0">부족했어요<small>다시 나와요</small></button><button class="g2" data-act="sess-self" data-g="2">잘 떠올렸어요<small>다음</small></button></div>`
      :`<div class="btns"><button class="btn" data-act="sess-flip">모범 목차 보기</button></div>`}`;}
  return head+skipBtn();}
function skipBtn(){return`<div class="empty"><b>이 항목을 찾을 수 없어요</b><div class="btns"><button class="btn" data-act="sess-skip">건너뛰기</button></div></div>`;}
function sessDone(){const s=SES.stats,n=s.ok+s.mid+s.no;
  if(SES.onDone&&!SES.doneRan){SES.doneRan=true;try{SES.onDone(SES);}catch(e){}}
  if(SES.rkey&&!SES.calDone){SES.calDone=1;resumeSet(SES.rkey,0,0);if(SES.setD)calMark('flash:'+SES.setD,'term',`${korDate(SES.setD)} 세트 카드 넘겨 보기 끝(${SES.items.length}장)`);}
  return topbar(SES.title||'학습')+`<div class="sheet" style="margin-top:18px"><p class="sheet-k">끝</p><h3>${esc(SES.title||'학습')} 완료</h3>
  <ul class="steps"><li><span class="dot on"></span><span class="k">맞힘·앎</span><span class="v">${s.ok}</span></li>${s.mid?`<li><span class="dot half"></span><span class="k">애매</span><span class="v">${s.mid}</span></li>`:''}<li><span class="dot"></span><span class="k">틀림·모름</span><span class="v">${s.no}</span></li></ul>
  <p class="ds" style="margin:6px 0 12px">${n&&s.no?'틀린 것은 오답 노트에 모였어요. 두 번 연속 맞히면 빠집니다.':'좋아요. 간격이 벌어진 만큼 다음 복습 날짜가 뒤로 갔어요.'}</p>
  <button class="btn" data-act="sess-close">돌아가기</button></div>`;}
function sessAdvance(){SES.i++;SES.back=false;SES.answered=null;if(SES.rkey)resumeSet(SES.rkey,SES.i,SES.items.length);render();window.scrollTo(0,0);}
/* 카드 넘겨 보기: 이전 카드로(이미 매긴 카드는 뒷면부터), 세트 카드는 뒷면을 본 것만 읽음 */
function sessPrev(){if(!SES||SES.i<=0)return;SES.i--;SES.back=!!(SES.graded&&SES.graded[SES.i]!=null);SES.answered=null;if(SES.rkey)resumeSet(SES.rkey,SES.i,SES.items.length);render();window.scrollTo(0,0);}
function sessMarkRead(it){if(!SES||!SES.setD||!it||it.si==null)return;const p=sp(SES.setD);if(!p.read[it.si]){p.read[it.si]=1;introduce(it.id);touchDay();calSetRead(SES.setD);save();}}
const gradeKey=g=>g===2?'ok':g===1?'mid':'no';
/* 다시 고를 때: 처음 고르기 전의 카드 진도·오답을 되돌리고 오늘 기록·세션 점수에서 뺀다 */
function sessSnap(it){const ks=uniq(['C:'+it.id].concat(it.wrongKey?[it.wrongKey]:[]));return JSON.stringify({c:S.cards[it.id]||null,w:ks.map(k=>[k,S.wrong[k]||null])});}
function sessUngrade(it,snap,prev){const o=JSON.parse(snap);if(o.c)S.cards[it.id]=o.c;else delete S.cards[it.id];o.w.forEach(([k,v])=>{if(v)S.wrong[k]=v;else delete S.wrong[k];});
  const d=S.daily[todayStr()];if(d){d.graded=Math.max(0,(d.graded||0)-1);if(!o.c||!o.c.seen)d.newSeen=Math.max(0,(d.newSeen||0)-1);}
  SES.stats[gradeKey(prev)]=Math.max(0,SES.stats[gradeKey(prev)]-1);
  if(prev===0&&SES.requeue){for(let j=SES.items.length-1;j>SES.i;j--)if(SES.items[j].id===it.id&&!(SES.graded&&SES.graded[j]!=null)){SES.items.splice(j,1);break;}}}
function logTest(type,n,ok){S.log.push({d:todayStr(),type,total:n,ok});if(S.log.length>500)S.log=S.log.slice(-500);touchDay();save();}

/* 세션 만들기 */
function cardItems(ids){return ids.map(id=>({type:'card',id}));}
function startStudy(){const f=rangeFilter(S.range);const pool=deck().filter(f);const t=todayStr();
  const due=pool.filter(c=>{const p=S.cards[c.id];return p&&p.seen>0&&p.due&&p.due<=t;}).sort((a,b)=>S.cards[a.id].due<S.cards[b.id].due?-1:1);
  const fresh=pool.filter(c=>!S.cards[c.id]||S.cards[c.id].seen===0).sort((a,b)=>(b.f||2)-(a.f||2)||((b.x||[]).length-(a.x||[]).length)).slice(0,newRoom());
  startSession({title:'오늘 학습',items:cardItems(due.concat(fresh).map(c=>c.id)),requeue:true});}
function startDueAll(){startSession({title:'카드 복습',items:cardItems(dueCards(null).map(c=>c.id)),requeue:true});}
function startFree(){startSession({title:'자유 복습',items:cardItems(shuffle(deck().filter(rangeFilter(S.range))).slice(0,30).map(c=>c.id))});}
function setReviewItems(d){const s=SETS.sets[d];const items=[];(s.cards||[]).forEach((_,i)=>{const id=setCardId(d,i);if(id)items.push({type:'card',id});});(s.quiz||[]).forEach((_,i)=>items.push({type:'quiz',d,i}));return items;}
function startSetReview(d){const step=reviewDue(d)||1;startSession({title:korDate(d)+' 세트 다시 보기',items:setReviewItems(d),onDone:()=>{markReviewed(d,step);}});}
function startSetReviewAll(){const rv=dueSetReviews();let items=[];rv.forEach(x=>{items=items.concat(setReviewItems(x.d));});startSession({title:'세트 다시 보기',items,onDone:()=>rv.forEach(x=>markReviewed(x.d,x.step))});}
function startWrong(){const wl=wrongList();startSession({title:'오답 다시 풀기',items:shuffle(wl.map(w=>w.type==='card'?{type:'card',id:w.id,wrongKey:w.key}:w.type==='quiz'?{type:'quiz',d:w.d,i:w.i,wrongKey:w.key}:w.type==='fill'?Object.assign(fillItem(card(w.id),S.fillLv||'중')||{type:'card',id:w.id},{wrongKey:w.key}):{type:'cloze',id:w.id,k:w.k,wrongKey:w.key}))});}
function startFill(lv,d){let pool;if(d){const s=SETS.sets[d];pool=((s&&s.cards)||[]).map((_,i)=>card(setCardId(d,i))).filter(Boolean);}else{pool=deck().filter(rangeFilter(S.range));const seen=pool.filter(c=>pget(c.id).seen>0);if(seen.length>=10)pool=seen;}
  const items=shuffle(pool).slice(0,10).map(c=>fillItem(c,lv)).filter(Boolean);startSession({title:'용어 빈칸 쓰기'+(d?', '+korDate(d)+' 세트':''),items,log:'fill'});}
function startCloze(){const f=rangeFilter(S.range);let pool=deck().filter(f).filter(c=>clozeTokens(c.d).length);const seen=pool.filter(c=>pget(c.id).seen>0);if(seen.length>=10)pool=seen;
  const items=shuffle(pool).slice(0,10).map(c=>{const toks=clozeTokens(c.d);return{type:'cloze',id:c.id,k:Math.floor(Math.random()*toks.length)};});startSession({title:'기준 수치 빈칸',items,log:'cloze'});}
function startStars(){startSession({title:'별표 카드',items:cardItems(shuffle(deck().filter(c=>pget(c.id).star)).map(c=>c.id))});}
function startMCQ(){const f=rangeFilter(S.range);let pool=deck().filter(f);const l=pool.filter(c=>pget(c.id).seen>0);if(l.length>=8)pool=l;if(pool.length<4){toast('카드가 4장 이상 있어야 해요');return;}
  const items=shuffle(pool).slice(0,10).map(c=>{const same=deck().filter(x=>x.u===c.u&&x.id!==c.id);let d=shuffle(same).slice(0,3);if(d.length<3)d=d.concat(shuffle(deck().filter(x=>x.id!==c.id&&!d.includes(x))).slice(0,3-d.length));return{type:'mcq',id:c.id,opts:shuffle([c.id].concat(d.map(x=>x.id)))};});
  startSession({title:'4지선다',items,log:'mcq'});}
function startRecall(){const f=rangeFilter(S.range);let pool=deck().filter(f);const l=pool.filter(c=>pget(c.id).seen>0);if(l.length>=8)pool=l;
  const stars=pool.filter(c=>pget(c.id).star);const pick=shuffle(stars).slice(0,3).concat(shuffle(pool.filter(c=>!pget(c.id).star))).slice(0,10);startSession({title:'용어 회상',items:cardItems(pick.map(c=>c.id)),log:'recall'});}
function startOutline(){const u=rangeUnits(S.range);const pool=essays().filter(e=>!u||u.includes(Number(e.u)));startSession({title:'논술 목차',items:shuffle(pool).slice(0,5).map(e=>({type:'outline',id:e.id})),log:'outline'});}

/* ════════ 15-2. 가리며 외우기(정한 시간마다 보이기·가리기를 반복하는 단기 암기) ════════ */
let MEMO=null,memoIv=null;
const MEMO_SHOW=[3,5,10,20,30,60],MEMO_HIDE=[2,3,5,10,20],MEMO_REPS=[1,3,5,10,0],MEMO_N=[2,3,4,5],MEMO_MAX=20;
function memoCfg(){return Object.assign({show:10,hide:5,mode:'all',n:2,reps:3,auto:1},S.settings.memo||{});}
function memoPicks(id){return((S.memoPick||{})[id])||[];}
/* 카드 한 장의 줄: 용어(t), 정의 문장(d0, d1…), 키워드(k0, k1…) */
function memoLines(c){const ds=String(c.d||'').replace(/([.。])\s+/g,'$1\n').split('\n').map(x=>x.trim()).filter(Boolean);
  return[{li:'t',tx:c.t,cls:'mterm'}].concat(ds.map((tx,i)=>({li:'d'+i,tx,cls:'mdef'})),(c.k||[]).map((tx,i)=>({li:'k'+i,tx,cls:'mkw'})));}
/* 가릴 줄: "전체"는 용어를 뺀 모든 줄, "고른 줄"은 고른 것(아직 안 골랐으면 전체), "무작위"는 반복마다 새로 고른 N줄 */
function memoHideSet(c){const cf=memoCfg();if(cf.mode==='rand'){if(!MEMO.rnd||MEMO.rndId!==c.id)memoRoll(c,false);return new Set(MEMO.rnd);}
  const pk=memoPicks(c.id);return new Set(cf.mode==='pick'&&pk.length?pk:memoLines(c).filter(l=>l.li!=='t').map(l=>l.li));}
/* 무작위 N줄(용어 제외). avoid면 바로 전에 가린 줄은 되도록 피한다 */
function memoRoll(c,avoid){const all=memoLines(c).filter(l=>l.li!=='t').map(l=>l.li);const prev=new Set(avoid&&MEMO.rndId===c.id?MEMO.rnd||[]:[]);
  MEMO.rnd=shuffle(all.filter(x=>!prev.has(x))).concat(shuffle(all.filter(x=>prev.has(x)))).slice(0,Math.min(memoCfg().n,all.length));MEMO.rndId=c.id;}
/* 이어 하기 키: 세트는 memo:set:날짜, 암기 탭은 memo:study(그날 고른 카드 목록째로) */
function startMemo(o,fresh){
  if(!fresh&&MEMO&&MEMO.key===o.key&&!MEMO.fin){memoStop();return nav('memo');}
  memoStop();const r=fresh?null:resumeGet(o.key);if(r&&r.ids)o.items=r.ids.map(id=>({id}));
  MEMO=Object.assign({i:0,run:false,phase:'show',left:null,cnt:0,done:false,t0:0,started:Date.now(),from:R.page?('#'+R.page+(R.a?'/'+R.a:'')):'#'+R.tab},o);
  if(!MEMO.items.length){toast('외울 카드가 없어요');MEMO=null;return;}
  if(r&&r.i<MEMO.items.length){MEMO.i=r.i;toast(`${r.i+1}번째 카드부터 이어서 해요`);}
  memoSeen();nav('memo');}
function memoItem(){return MEMO&&MEMO.items[MEMO.i];}
function memoDur(){const c=memoCfg();return(MEMO.phase==='show'?c.show:c.hide)*1000;}
function memoAwake(on){PE_IO.keepAwake(on||(typeof TM!=='undefined'&&TM.running));}
/* 카드를 보여 줄 때마다: 세트 카드는 읽음, 이어 하기 자리와 달력 기록 */
function memoSeen(){const it=memoItem();if(!it)return;MEMO.rnd=null;MEMO.rndShown=false;
  if(MEMO.setD&&it.si!=null){const p=sp(MEMO.setD);if(!p.read[it.si]){p.read[it.si]=1;introduce(it.id);touchDay();calSetRead(MEMO.setD);}}
  const n=MEMO.items.length;MEMO.max=Math.max(MEMO.max||0,MEMO.i);
  resumeSet(MEMO.key,MEMO.i,n,MEMO.key==='memo:study'?MEMO.items.map(x=>x.id):null);
  calMark(MEMO.key,'term',`가리며 외우기: ${MEMO.label} ${MEMO.max+1}/${n}장`);}
function memoGo(i){if(!MEMO||MEMO.fin||i<0||i>=MEMO.items.length)return;MEMO.i=i;MEMO.cnt=0;MEMO.phase='show';MEMO.done=false;MEMO.left=null;MEMO.t0=Date.now();memoSeen();render();window.scrollTo(0,0);}
function memoPlay(){if(!MEMO)return;if(MEMO.done){MEMO.done=false;MEMO.cnt=0;MEMO.phase='show';MEMO.left=null;}
  MEMO.t0=Date.now()-(MEMO.left!=null?memoDur()-MEMO.left:0);MEMO.left=null;MEMO.run=true;clearInterval(memoIv);memoIv=setInterval(memoTick,200);memoAwake(true);paintMemo();}
function memoPause(){if(!MEMO||!MEMO.run)return;MEMO.left=Math.max(0,memoDur()-(Date.now()-MEMO.t0));MEMO.run=false;clearInterval(memoIv);memoIv=null;memoAwake(false);paintMemo();}
function memoStop(){clearInterval(memoIv);memoIv=null;if(MEMO&&MEMO.run){MEMO.left=Math.max(0,memoDur()-(Date.now()-MEMO.t0));MEMO.run=false;memoAwake(false);}}
/* 끝까지 가서 "완료": 달력에 남기고 이어 하기 자리를 지운다 */
function memoFinish(){if(!MEMO||MEMO.fin)return;memoStop();MEMO.fin=Date.now();const n=MEMO.items.length;
  resumeSet(MEMO.key,0,0);calUnmark(MEMO.key);calMark(MEMO.key+':fin','term',`가리며 외우기 완료: ${MEMO.label} ${n}장`);touchDay();save();render();window.scrollTo(0,0);}
/* 한 바퀴 = 보기 → 가림. 정한 횟수를 다 돌면 다음 카드로(또는 멈춤), "무한"이면 계속 */
function memoTick(){if(!MEMO||!MEMO.run)return;const now=Date.now();if(now-MEMO.t0<memoDur())return paintMemo();
  if(MEMO.phase==='show'){MEMO.phase='hide';MEMO.t0=now;if(memoCfg().mode==='rand'){const c=card(memoItem().id);if(c){memoRoll(c,MEMO.rndShown);MEMO.rndShown=true;}}return paintMemo();}
  const c=memoCfg();MEMO.cnt++;MEMO.phase='show';MEMO.t0=now;
  if(c.reps&&MEMO.cnt>=c.reps){if(c.auto&&MEMO.i+1<MEMO.items.length){MEMO.i++;MEMO.cnt=0;memoSeen();return render();}
    MEMO.run=false;MEMO.done=true;clearInterval(memoIv);memoIv=null;memoAwake(false);return render();}
  paintMemo();}
/* 매 틱에는 화면 전체를 다시 그리지 않고 가림 표시·남은 시간만 바꾼다 */
function paintMemo(){const box=document.getElementById('memoBox');if(!box||!MEMO)return;const c=memoCfg(),last=MEMO.i+1>=MEMO.items.length;
  const tb=document.querySelector('.topbar'),mh=document.getElementById('memoHead');if(tb&&mh){mh.style.top=tb.offsetHeight+'px';mh.classList.toggle('hide',MEMO.phase==='hide'&&!MEMO.done);}
  const cc=card(memoItem().id);if(cc){const hs=memoHideSet(cc);box.querySelectorAll('.ml').forEach(el=>el.classList.toggle('hd',hs.has(el.dataset.li)));}
  box.classList.toggle('hiding',MEMO.phase==='hide'&&!MEMO.done);
  const left=MEMO.run?Math.max(0,memoDur()-(Date.now()-MEMO.t0)):(MEMO.left!=null?MEMO.left:memoDur());
  const cl=document.getElementById('memoClock');
  if(cl)cl.innerHTML=MEMO.done?(last?'<b>다 했어요</b> <span>마지막 카드예요. 아래 완료를 누르세요</span>':'<b>다 했어요</b> <span>다시 하거나 다음 카드로 넘기세요</span>'):`<b class="${MEMO.phase}">${MEMO.phase==='show'?'보기':'가림'}</b> ${Math.ceil(left/1000)}초 <span>${c.reps?`${Math.min(MEMO.cnt+1,c.reps)} / ${c.reps}회`:`${MEMO.cnt+1}회째, 무한 반복`}</span>`;
  const bar=document.getElementById('memoBar');if(bar)bar.style.width=(MEMO.done?0:Math.round(left/memoDur()*100))+'%';
  const b=document.getElementById('memoPlay');if(b)b.textContent=MEMO.run?'일시정지':MEMO.done?'다시 하기':(MEMO.left!=null?'계속':'시작');}
function memoDoneHTML(){const n=MEMO.items.length,min=Math.max(1,Math.round((MEMO.fin-MEMO.started)/60000));
  return topbar(MEMO.title||'가리며 외우기')+`<div class="sheet" style="margin-top:18px"><p class="sheet-k">끝</p><h3>${esc(MEMO.title||'가리며 외우기')} 완료</h3>
  <ul class="steps"><li><span class="dot on"></span><span class="k">외운 카드</span><span class="v">${n}장</span></li><li><span class="dot on"></span><span class="k">이번에 걸린 시간</span><span class="v">${min}분</span></li></ul>
  <p class="ds" style="margin:6px 0 12px">학습 달력에 빨간 동그라미로 남았어요.</p>
  <button class="btn" data-act="memo-close">돌아가기</button><div class="btns"><button class="btn sec" data-act="memo-again">처음부터 다시</button><button class="btn sec" data-act="go" data-h="cal">학습 달력</button></div></div>`;}
function vMemo(){if(!MEMO)return topbar('가리며 외우기')+`<div class="empty" style="margin-top:20px"><b>진행 중인 외우기가 없어요</b><div class="btns"><button class="btn" data-act="go" data-h="study">암기 탭으로</button></div></div>`;
  if(MEMO.fin)return memoDoneHTML();
  const it=memoItem(),c=card(it.id),cf=memoCfg(),n=MEMO.items.length,last=MEMO.i+1>=n;if(!c)return topbar(MEMO.title||'가리며 외우기')+skipBtn();
  const pk=new Set(memoPicks(c.id)),hs=memoHideSet(c);
  const seg=(k,arr,lab)=>`<div class="seg">${arr.map(v=>`<button class="${cf[k]===v?'on':''}" data-act="memo-cfg" data-k="${k}" data-v="${v}">${lab(v)}</button>`).join('')}</div>`;
  const how=cf.mode==='pick'?'고른 줄':cf.mode==='rand'?`무작위 ${cf.n}줄`:'전체';
  return topbar(MEMO.title||'가리며 외우기')+`<div class="prog"><div class="bar"><i style="width:${Math.round(MEMO.i/n*100)}%"></i></div><span>${MEMO.i+1} / ${n}</span></div>
  <div class="mhead" id="memoHead"><div class="mclock" id="memoClock"></div><div class="mbar"><i id="memoBar"></i></div></div>
  <div class="memo${MEMO.phase==='hide'&&!MEMO.done?' hiding':''}" id="memoBox">${memoLines(c).map(l=>`<div class="ml ${l.cls}${cf.mode==='pick'&&pk.has(l.li)?' pk':''}${hs.has(l.li)?' hd':''}" data-act="memo-pick" data-li="${l.li}">${esc(l.tx)}</div>`).join('')}</div>
  <div class="btns"><button class="btn" id="memoPlay" data-act="memo-play">시작</button></div>
  <div class="btns sessnav"><button class="btn sec" data-act="memo-prev" ${MEMO.i?'':'disabled'}>‹ 이전</button>${last?'<button class="btn" data-act="memo-finish">완료</button>':'<button class="btn sec" data-act="memo-next">다음 ›</button>'}</div>
  <p class="note">${cf.mode==='pick'?(pk.size?'노란 테두리 줄만 가려요. 줄을 탭해 더하거나 빼세요.':'가릴 줄을 탭해서 고르세요. 고르기 전에는 전체를 가려요.'):cf.mode==='rand'?`가릴 때마다 정의·키워드 중 ${cf.n}줄을 무작위로 골라 가려요. 줄을 탭하면 고른 줄 가리기로 바뀌어요.`:'용어만 남기고 전체를 가려요. 가리고 싶은 줄을 탭하면 그 줄만 가리기로 바뀌어요.'}</p>
  <details class="d" id="memoCfg"${MEMO.cfgOpen?' open':''}><summary>설정: 보기 ${cf.show}초, 가림 ${cf.hide}초, ${how}, ${cf.reps?cf.reps+'회':'무한 반복'}${cf.reps?(cf.auto?', 다음 카드로':', 멈춤'):''}</summary><div class="in-d">
    <label class="f">보이는 시간</label>${seg('show',MEMO_SHOW,v=>v+'초')}
    <label class="f">가리는 시간</label>${seg('hide',MEMO_HIDE,v=>v+'초')}
    <label class="f">가릴 것</label>${seg('mode',['all','pick','rand'],v=>v==='all'?'전체':v==='pick'?'고른 줄':'무작위')}
    ${cf.mode==='rand'?`<label class="f">무작위로 가릴 줄 수</label>${seg('n',MEMO_N,v=>v+'줄')}`:''}
    <label class="f">반복</label>${seg('reps',MEMO_REPS,v=>v?v+'회':'무한')}
    <label class="f">다 하면</label>${seg('auto',[1,0],v=>v?'다음 카드로':'멈춤')}</div></details>`;}
/* 암기 탭에서: 범위 안에서 별표 → 오답 → 덜 익힌 카드 순으로 20장 */
function memoStudyIds(){const pool=deck().filter(rangeFilter(S.range||'week'));const sc=c=>{const p=pget(c.id);return(p.star?0:10)+(S.wrong['C:'+c.id]||S.wrong['F:'+c.id]?0:5)+Math.min(p.box||0,6);};
  return pool.map((c,i)=>({c,i,s:sc(c)})).sort((a,b)=>a.s-b.s||a.i-b.i).slice(0,MEMO_MAX).map(x=>x.c.id);}
/* 이어 하기: 나갔다 다시 들어오면 보던 카드부터(S.resume[키] = {i, n, day, ids?}, ids가 있는 목록은 그날만) */
function resumeGet(key){const r=S.resume&&S.resume[key];if(!r||!(r.i>0)||r.i>=r.n)return null;if(r.ids&&r.day!==todayStr())return null;return r;}
function resumeAt(key){if(MEMO&&MEMO.key===key&&!MEMO.fin)return MEMO.i>0?`${MEMO.i+1}/${MEMO.items.length}`:'';
  if(SES&&SES.rkey===key&&SES.i<SES.items.length)return SES.i>0?`${SES.i+1}/${SES.items.length}`:'';
  const r=resumeGet(key);return r?`${r.i+1}/${r.n}`:'';}
function resumeSet(key,i,n,ids){if(!key)return;S.resume=S.resume||{};if(i>0&&i<n)S.resume[key]=Object.assign({i,n,day:todayStr()},ids?{ids}:{});else delete S.resume[key];save();}

/* ════════ 16. 화면: 테스트 ════════ */
function vTest(){const rg=S.range||'week';const lm=latestMockDate();const rounds=kichulRounds();
  return`<div class="ltitle"><div><h1>테스트</h1><p class="lsub">맞힌 만큼 간격이 벌어지고, 틀린 것은 오답 노트로</p></div></div>
  <label class="f">범위</label>${rangeSelect('rangeSel',rg)}
  ${sec('빠른 테스트','',`<div class="group">
    ${row({ic:'list',t:'4지선다 10문',d:'설명을 보고 용어 고르기',act:'start-mcq'})}
    ${row({ic:'cards',t:'용어 회상 10문',d:'용어만 보고 정의·키워드 떠올리기',act:'start-recall'})}
    ${row({ic:'num',tone:'amber',t:'기준 수치 빈칸 10문',d:'정의 속 수치를 가리고 맞히기',act:'start-cloze'})}
    ${row({ic:'pen',tone:'amber',t:'용어 빈칸 쓰기 10문',d:'정의 속 낱말을 가리고 직접 써 넣기, 난이도 하·중·상',act:'start-fill'})}
    ${row({ic:'pen',t:'논술 목차 5문',d:'문제만 보고 소제목 떠올리기',act:'start-outline'})}
  </div>`)}
  ${sec('실전','',`<div class="group">
    ${lm?row({ic:'paper',tone:'amber',t:'이번 주 모의고사',d:esc((SETS.mocks[lm].title||'')+', '+korDate(lm)),act:'go',data:{h:'mock/'+lm}}):row({ic:'paper',tone:'gray',t:'주간 모의고사',d:'토요일 06:50에 만들어져 여기 들어와요'})}
    ${row({ic:'layers',t:'기출 회차 그대로 풀기',d:`제${rounds.length?rounds[rounds.length-1].r:''}~${rounds.length?rounds[0].r:''}회 ${rounds.length}회분, 실제 시험지 순서`,act:'go',data:{h:'kichul'}})}
    ${row({ic:'chart',t:'기출 단원별 보기',d:'단원마다 어떤 문제가 몇 번 나왔는지',act:'go',data:{h:'kichul/u'}})}
    ${row({ic:'wand',t:'앱이 모의고사 만들기',d:'기출·약점 가중으로 1~4교시 세트',act:'gen-mock'})}
    ${row({ic:'pen',t:'논술 답안 작성 요령',d:'답안지 생김새, 번호 체계, 모범 답안, 형식 점검표',act:'go',data:{h:'guide'}})}
  </div>`)}
  ${sec('기록','',`<div class="group">${row({ic:'chart',tone:'gray',t:'통계와 주간 리포트',act:'go',data:{h:'stats'}})}</div>`)}`;}

function vKichul(){const mode=R.a||'r';const rounds=kichulRounds();
  if(mode==='r'&&R.b)return vKRound(Number(R.b));
  if(mode==='u'&&R.b)return vKUnit(Number(R.b));
  const all=[];rounds.forEach(r=>r.q.forEach(q=>all.push(q)));
  const byU=PE_UNITS.map(u=>({u,n:all.filter(q=>q.u===u.id).length,n1:all.filter(q=>q.u===u.id&&q.p===1).length})).sort((a,b)=>b.n-a.n);const mx=Math.max.apply(null,byU.map(x=>x.n).concat([1]));
  const covered=all.filter(q=>q.p===1&&cardsForK(q.id).length).length,n1=all.filter(q=>q.p===1).length;
  const body=mode==='u'?`<div class="group">${byU.map(x=>`<button class="unitbar" data-act="go" data-h="kichul/u/${x.u.id}" style="width:100%"><span class="nm">${esc(x.u.n)}</span><span class="bar"><i style="width:${Math.round(x.n/mx*100)}%"></i></span><span class="c">${x.n}</span><span class="c" style="color:var(--ink2)">${(x.n/all.length*100).toFixed(1)}%</span></button>`).join('')}</div>
      <p class="note">${rounds.length}회분 ${all.length}문항 기준. 막대 옆 숫자는 문항 수와 비중이에요.</p>`
    :`<div class="group">${rounds.map(r=>{const p1=r.q.filter(q=>q.p===1);const cv=p1.filter(q=>cardsForK(q.id).length).length;return row({ic:'layers',t:`제${r.r}회`,d:`${esc(r.d)} 시행, 1교시 카드 연결 ${cv}/${p1.length}`,act:'go',data:{h:'kichul/r/'+r.r}});}).join('')}</div>`;
  return topbar('기출 문제은행')+`<h1 class="ptitle">기출 문제은행</h1><p class="lsub">제${rounds.length?rounds[rounds.length-1].r:''}~${rounds.length?rounds[0].r:''}회 ${all.length}문항. 1교시 ${n1}문항 중 ${covered}문항이 암기 카드와 연결돼 있어요.</p>
  <div class="seg" style="margin:14px 0"><button class="${mode!=='u'?'on':''}" data-act="go" data-h="kichul">회차별</button><button class="${mode==='u'?'on':''}" data-act="go" data-h="kichul/u">단원별 출제 비중</button></div>${body}
  <p class="note">문제 문구는 원문이 아니라 요지예요. 원문은 큐넷 기출문제(기술사) 자료실에서 볼 수 있어요.</p>`;}
function kRow(q,showRound){const cs=q.p===1?cardsForK(q.id):[];const es=q.p===1?[]:essaysForK(q.id);
  const link=q.p===1?(cs.length?`<b>카드 있음</b>`:`<i>카드 없음</i>`):(es.length?`<b>목차 있음</b>`:'');
  return`<button class="paper-q" style="width:100%" data-act="kq" data-id="${q.id}"><span class="n">${showRound?'':q.n}</span><span class="q">${showRound?`<span class="ds" style="display:block">제${q.r}회 ${q.p}교시 ${q.n}번</span>`:''}${esc(q.t)}<span class="u">${esc(unitName(q.u))}${link?', '+link:''}</span></span></button>`;}
function vKRound(rn){const r=kichulRounds().find(x=>x.r===rn);if(!r)return topbar('기출')+'<div class="empty">회차를 찾을 수 없어요</div>';
  const per=p=>r.q.filter(q=>q.p===p).sort((a,b)=>a.n-b.n);
  return topbar('제'+rn+'회')+`<h1 class="ptitle">제${rn}회 토목시공기술사</h1><p class="lsub">${esc(r.d)} 시행. 문제 요지(원문 아님)</p>
  ${[1,2,3,4].map(p=>sec(p===1?'1교시 단답형':p+'교시 논술형',p===1?'13문 중 10문, 100분':'6문 중 4문, 100분',`<div class="group">${per(p).map(q=>kRow(q)).join('')}</div><div class="btns"><button class="btn sm sec" data-act="timer-go" data-p="${p===1?'p1':'essay'}">${p}교시 타이머</button></div>`)).join('')}
  <div class="btns" style="margin-top:20px"><button class="btn" data-act="copy-round" data-r="${rn}">이 회차 채점 요청 복사</button></div><p class="note">종이에 풀고 사진을 찍어 Claude 프로젝트에 올린 뒤 붙여 넣으세요.</p>`;}
function vKUnit(u){const all=[];kichulRounds().forEach(r=>r.q.forEach(q=>{if(q.u===u)all.push(Object.assign({r:r.r},q));}));
  const p1=all.filter(q=>q.p===1),pe=all.filter(q=>q.p!==1);
  return topbar(unitName(u))+`<h1 class="ptitle">${esc(unitName(u))}</h1><p class="lsub">기출 ${all.length}문항(단답 ${p1.length}, 논술 ${pe.length})</p>
  ${sec('1교시 단답','',p1.length?`<div class="group">${p1.map(q=>kRow(q,true)).join('')}</div>`:'<div class="empty">없음</div>')}
  ${sec('2~4교시 논술','',pe.length?`<div class="group">${pe.map(q=>kRow(q,true)).join('')}</div>`:'<div class="empty">없음</div>')}
  <div class="btns"><button class="btn sec" data-act="study-unit" data-u="${u}">이 단원 카드 외우기</button></div>`;}

/* 모의고사(예약 작업이 만든 것 + 앱이 만든 것) */
function vMock(){const d=R.a;const m=d==='app'?appMockObj():SETS.mocks[d];
  if(!m)return topbar('모의고사')+`<div class="empty" style="margin-top:20px"><b>모의고사가 없어요</b><div class="btns"><button class="btn" data-act="gen-mock">앱이 만들기</button></div></div>`;
  const reveal=SV['mk:'+d];const lab={p1:'1교시 단답형',p2:'2교시 논술형',p3:'3교시 논술형',p4:'4교시 논술형'};const sub={p1:'13문 중 10문, 문제당 10점, 100분',p2:'6문 중 4문, 문제당 25점, 100분',p3:'6문 중 4문, 100분',p4:'6문 중 4문, 100분'};
  const parts=['p1','p2','p3','p4'].filter(k=>m[k]&&m[k].length);const pr=S.mockp[d]||{};
  return topbar(d==='app'?'앱 모의고사':korDate(d)+' 모의고사')+`<h1 class="ptitle">${esc(m.title||'모의고사')}</h1>${(m.guide||[]).length?`<div class="group plain" style="margin-top:12px">${m.guide.map(g=>`<div class="row noic"><span class="tx"><span class="tt" style="font-weight:500">${esc(g)}</span></span></div>`).join('')}</div>`:''}
  ${parts.length?parts.map(k=>sec(lab[k]+(k==='p2'&&m[k].length<6?` ${m[k].length}문`:''),k==='p2'&&m[k].length<6?`문제당 25분`:sub[k],`<div class="group">${m[k].map((q,i)=>`<div class="paper-q"><span class="n">${i+1}</span><span class="q">${esc(typeof q==='string'?q:q.t)}${k==='p1'?'':''}${q&&q.x?`<span class="u">기출 ${esc([].concat(q.x).map(kLabelShort).join(', '))}</span>`:''}</span></div>`).join('')}</div>
    <div class="btns"><button class="btn sm sec" data-act="timer-go" data-p="${k==='p1'?'p1':m[k].length<6?'one2':'essay'}">타이머</button><label class="check" style="padding:6px 4px"><input type="checkbox" data-act="mock-done" data-d="${d}" data-k="${k}" ${pr[k]?'checked':''}><span>다 썼어요</span></label></div>`)).join('')
    :`<div class="empty" style="margin-top:12px"><b>이번엔 문제가 없어요</b>${esc(m.notice||'')}</div>`}
  ${parts.length?sec('다 쓴 뒤 열어보기','',reveal?`<div class="group plain">${parts.map(k=>m[k].map((q,i)=>{if(typeof q==='string')return'';if(k==='p1')return`<div class="row noic"><span class="tx"><span class="tt">${i+1}. ${esc(q.t)}</span><span class="ds">${esc((q.k||[]).join(', '))}</span></span></div>`;
      return`<div class="row noic" style="align-items:flex-start"><span class="tx"><span class="tt">${esc(lab[k].slice(0,3))} ${i+1}. ${esc(q.t)}</span><span class="ds">${esc((q.o||[]).join(' / '))}${q.fig?'<br>그림·표: '+esc(q.fig):''}</span></span></div>`;}).join('')).join('')}</div>`
    :`<button class="btn sec" data-act="mock-reveal" data-d="${d}">채점 전에는 보지 마세요 — 열기</button>`):''}
  ${parts.length?`<div class="btns" style="margin-top:20px"><button class="btn" data-act="copy-mock" data-d="${d}">채점 요청 복사</button><button class="btn sec" data-act="copy-mock-q" data-d="${d}">문제만 복사</button></div>
    <div class="btns" style="margin-top:4px"><button class="btn ghost" data-act="go" data-h="guide">답안 작성 요령·형식 점검표</button></div>`:''}`;}
function appMockObj(){const m=S.lastMock;if(!m)return null;const toQ=(arr,isP1)=>(arr||[]).map(t=>{if(isP1){const c=deck().find(x=>x.t===t);return{t,k:c?(c.k||[]).slice(0,3):[]};}const e=essays().find(x=>x.t===t);return{t,o:e?e.o:[],fig:''};});
  return{title:'앱 모의고사, '+korDate(m.date),guide:['기출·별표·오답에 가중치를 둔 무작위 세트예요.'],p1:toQ(m.p1,true),p2:toQ(m.p2),p3:toQ(m.p3),p4:toQ(m.p4)};}
function pickByUnit(items,n,wf){const byU={};items.forEach(it=>{(byU[it.u]=byU[it.u]||[]).push(it);});const out=[];let us=shuffle(Object.keys(byU));let g=0;
  while(out.length<n&&g++<600){if(!us.length)us=shuffle(Object.keys(byU).filter(u=>byU[u].length));if(!us.length)break;const u=us.shift();const arr=byU[u];if(!arr||!arr.length)continue;const w=arr.map(wf);const tot=w.reduce((a,b)=>a+b,0);let r=Math.random()*tot,k=0;for(;k<arr.length;k++){r-=w[k];if(r<=0)break;}k=Math.min(k,arr.length-1);out.push(arr[k]);arr.splice(k,1);}return out;}
function genMock(){const wC=c=>(c.f||2)+(c.x&&c.x.length?2:0)+(pget(c.id).star?2:0)+(pget(c.id).ng>pget(c.id).ok?1:0);const wE=e=>(e.f||2)+(e.x&&e.x.length?2:0)+((S.essayStat[e.id]||{}).weak>0?1:0);
  const m={date:todayStr(),kind:'all',p1:pickByUnit(deck(),13,wC).map(c=>c.t)};let rem=essays().slice();['p2','p3','p4'].forEach(pk=>{const sel=pickByUnit(rem,6,wE);m[pk]=sel.map(e=>e.t);const ids=new Set(sel.map(e=>e.id));rem=rem.filter(e=>!ids.has(e.id));});
  S.lastMock=m;touchDay();save();nav('mock/app');toast('모의고사 세트를 만들었어요');}
function mockText(m){const lab={p1:'1교시 단답형(13문 중 10문 선택, 각 10점, 100분)',p2:'2교시 논술형(6문 중 4문, 각 25점, 100분)',p3:'3교시 논술형(6문 중 4문, 각 25점, 100분)',p4:'4교시 논술형(6문 중 4문, 각 25점, 100분)'};
  let s=`[토목시공기술사 모의고사${m.title?' — '+m.title:''}]\n`;['p1','p2','p3','p4'].forEach(k=>{if(m[k]&&m[k].length){s+=`\n■ ${lab[k]}\n`;m[k].forEach((q,i)=>{const t=typeof q==='string'?q:q.t;s+=`${i+1}. ${k==='p1'&&!/시오\.?$/.test(t)?t+'에 대하여 설명하시오.':t}\n`;});}});return s;}
function roundText(r){const lab={1:'1교시 단답형(13문 중 10문, 각 10점)',2:'2교시 논술형(6문 중 4문, 각 25점)',3:'3교시 논술형(6문 중 4문, 각 25점)',4:'4교시 논술형(6문 중 4문, 각 25점)'};
  let s=`[제${r.r}회 토목시공기술사 기출(${r.d}) — 문제 요지]\n`;[1,2,3,4].forEach(p=>{s+=`\n■ ${lab[p]}\n`;r.q.filter(q=>q.p===p).sort((a,b)=>a.n-b.n).forEach(q=>{s+=`${q.n}. ${q.t}\n`;});});return s;}

/* 통계 */
function vStats(){const t=todayStr(),cs=deck();const rows=PE_UNITS.map(u=>{const ucs=cs.filter(c=>Number(c.u)===u.id);const ok=ucs.reduce((a,c)=>a+pget(c.id).ok,0),ng=ucs.reduce((a,c)=>a+pget(c.id).ng,0),l=ucs.filter(c=>pget(c.id).seen>0).length;return{u,ok,ng,l,n:ucs.length,acc:ok+ng?ok/(ok+ng):null};});
  let sum=0;for(let i=0;i<7;i++)sum+=checkRate(addDays(t,-i));const last=S.log.slice(-8).reverse();const nm={mcq:'4지선다',recall:'회상',outline:'목차',cloze:'수치 빈칸',fill:'용어 빈칸 쓰기'};
  const sd=Object.keys(SETS.sets),sdone=sd.filter(d=>setStatus(d).done).length;
  return topbar('통계')+`<h1 class="ptitle">통계</h1>
  <div class="tiles" style="margin-top:12px"><div class="tile"><b>${cs.filter(c=>pget(c.id).seen>0).length}</b><span>학습한 카드</span></div><div class="tile"><b>${Math.round(sum/7*100)}%</b><span>7일 체크 달성</span></div><div class="tile"><b>${sdone}/${sd.length}</b><span>끝낸 세트</span></div></div>
  ${sec('단원별','학습 / 정답률 / ★',`<div class="group" style="padding:4px 8px"><table class="t">${rows.map(r=>`<tr><td>${esc(r.u.n)}</td><td class="n">${r.l}/${r.n}</td><td class="n" style="color:${r.acc==null?'var(--ink3)':r.acc>=.8?'var(--ok)':r.acc>=.6?'var(--amber)':'var(--red)'}">${r.acc==null?'—':Math.round(r.acc*100)+'%'}</td><td class="n">${cs.filter(c=>Number(c.u)===r.u.id&&pget(c.id).star).length}</td></tr>`).join('')}</table></div>`)}
  ${sec('최근 테스트','',last.length?`<div class="group">${last.map(l=>row({t:esc(nm[l.type]||l.type),d:esc(l.d),v:`${l.ok}/${l.total}`})).join('')}</div>`:'<div class="empty">아직 기록이 없어요</div>')}
  <div class="btns" style="margin-top:20px"><button class="btn" data-act="report">주간 리포트 복사</button></div><p class="note">복사한 내용을 Claude 프로젝트에 프롬프트 7과 함께 붙여 넣으면 다음 주 조정안을 받아요.</p>`;}
function weeklyReport(){const t=todayStr(),cs=deck();const L=[`[기술사 6개월 주간 리포트] ${addDays(t,-6)} ~ ${t} (${weekLabel(weekIndex())}, ${phaseObj(weekIndex()).n})`];
  let sum=0,hand=0;for(let i=0;i<7;i++){const d=addDays(t,-i),items=routineFor(d),c=S.checks[d]||{};sum+=checkRate(d);items.forEach((it,k)=>{if(c[k]&&/손글씨|모의|다시 쓰기/.test(it))hand++;});}
  L.push(`체크리스트 달성률(7일 평균) ${Math.round(sum/7*100)}%, 손글씨·모의 항목 완료 ${hand}회, 연속 학습 ${streak()}일`);
  const wk=cs.filter(c=>{const p=pget(c.id);return p.last&&diffDays(p.last,t)<=6;});let ok=0,ng=0;wk.forEach(c=>{const p=pget(c.id);ok+=p.ok;ng+=p.ng;});
  L.push(`카드: 전체 ${cs.length}장 중 학습 ${cs.filter(c=>pget(c.id).seen>0).length}장, 이번 주 다룬 카드 ${wk.length}장, 누적 정답률 ${ok+ng?Math.round(ok/(ok+ng)*100):0}%, 복습 대기 ${dueCards(null).length}장`);
  const ws=Object.keys(SETS.sets).filter(d=>diffDays(d,t)<=6&&diffDays(d,t)>=0);L.push(`이번 주 세트 ${ws.length}개 중 완료 ${ws.filter(d=>setStatus(d).done).length}개, 세트 퀴즈 정답 ${ws.reduce((a,d)=>a+setStatus(d).qok,0)}/${ws.reduce((a,d)=>a+setStatus(d).nq,0)}`);
  L.push(`오답 노트 ${Object.keys(S.wrong).length}개, 다시 볼 세트 대기 ${dueSetReviews().length}개`);
  L.push('단원별 정답률(누적) / 학습 수:');PE_UNITS.forEach(u=>{const ucs=cs.filter(c=>Number(c.u)===u.id);const o=ucs.reduce((a,c)=>a+pget(c.id).ok,0),n=ucs.reduce((a,c)=>a+pget(c.id).ng,0),l=ucs.filter(c=>pget(c.id).seen>0).length;L.push(` - ${u.n}: ${o+n?Math.round(o/(o+n)*100)+'%':'—'} (${l}/${ucs.length})`);});
  const wl=S.log.filter(l=>diffDays(l.d,t)<=6);if(wl.length)L.push(`테스트 ${wl.length}회: `+wl.map(l=>`${l.type} ${l.ok}/${l.total}`).join(', '));
  const stars=cs.filter(c=>pget(c.id).star).slice(0,15).map(c=>c.t);if(stars.length)L.push('별표(어려움) 카드: '+stars.join(', '));
  const wr=wrongList().slice(0,12).map(w=>w.label);if(wr.length)L.push('오답 노트 상위: '+wr.join(' / '));
  return L.join('\n');}

/* ════════ 17. 화면: 더보기와 하위 화면 ════════ */
function vMore(){const s=S.sync||{};const rp=repoPlanState();
  const me=PE_IO.member();
  return`<div class="ltitle"><div><h1>더보기</h1><p class="lsub">기술사 6개월 v${APP_VER}${me?', 아이디 '+esc(me.id):''}</p></div></div>
  ${me&&me.admin?sec('관리','',`<div class="group">${row({ic:'check',tone:'ok',t:'승인 관리',d:'승인 요청, 회원, 초대 코드',act:'go',data:{h:'admin'}})}</div>`):''}
  ${sec('시험 일정','',`<div class="group">${row({ic:'flag',tone:rp==='diff'?'red':'',t:'준비 시작일·목표 회차',d:`${esc(korDate(S.settings.start))} 시작 → 제${PLAN.target.r}회 ${esc(PLAN.target.d)}${esc(estTag(PLAN.target))}, ${PLAN.E}주${rp==='diff'?'<br><b style="color:var(--red)">예약 작업 일정과 달라요</b>':''}`,act:'go',data:{h:'schedule'}})}</div>`)}
  ${sec('공부 도구','',`<div class="group">${row({ic:'caldot',t:'학습 달력',d:'접속한 날과 끝낸 공부',act:'go',data:{h:'cal'}})}${row({ic:'cal',t:PLAN.E+'주 로드맵',d:'단계·주차별 목표와 학원 대체표',act:'go',data:{h:'plan'}})}${row({ic:'pen',t:'논술 답안 작성 요령',d:'모범 답안으로 보는 답안지 쓰는 법',act:'go',data:{h:'guide'}})}${row({ic:'timer',t:'교시 타이머',d:'100분, 문제 경계마다 알림',act:'go',data:{h:'timer'}})}${row({ic:'chat',t:'Claude 프롬프트',d:'첨삭·카드 생성·주간 리포트 등 10개',act:'go',data:{h:'prompts'}})}</div>`)}
  ${sec('데이터','',`<div class="group">${row({ic:'sync',t:'지금 받아 오기',d:syncing?'받아 오는 중…':s.last?(s.ok?'마지막 확인 '+hhmm(s.last):'마지막 시도 실패'):'아직 받아 오지 않았어요',act:'sync'})}${row({ic:'imp',t:'카드·목차 가져오기',d:'Claude가 만든 JSON 붙여넣기',act:'go',data:{h:'imp'}})}${row({ic:'save',t:'백업·복원',act:'go',data:{h:'backup'}})}</div>`)}
  ${sec('앱','',`<div class="group">${row({ic:'gear',t:'설정',d:'하루 새 카드 수, 글자 크기, 테마',act:'go',data:{h:'settings'}})}${row({ic:'info',t:'콘텐츠 출처',d:'카드·기출·세트가 어디서 왔는지',act:'go',data:{h:'about'}})}</div>`)}
  <p class="note">기록은 이 휴대폰에만 저장돼요. 1~2주에 한 번 백업해 두세요.</p>`;}
/* 학습 달력: 앱을 연 날(접속 시각)과 그날 끝낸 공부를 종류별 동그라미로 */
const CAL_K=[['term','용어'],['essay','논술'],['quiz','퀴즈·테스트'],['mock','모의고사'],['todo','할 일']];
const CAL_LOG={fill:['term','용어 빈칸 쓰기'],outline:['essay','논술 목차 떠올리기'],mcq:['quiz','4지선다'],recall:['quiz','용어 회상'],cloze:['quiz','수치 빈칸']};
/* 그날 한 것: 달력 기록(S.cal) + 원래 기록(카드 매김·테스트·오늘 할 일·세트 다시 보기) */
function calItems(ds){const out=[],c=S.cal[ds]||{},x=c.x||{},dl=S.daily[ds];
  if(dl&&dl.graded)out.push(['term',`카드 ${dl.graded}장 매김${dl.newSeen?`(처음 본 카드 ${dl.newSeen}장)`:''}`]);
  Object.keys(x).forEach(k=>out.push(x[k]));
  Object.keys(S.sp).forEach(d=>{if(x['rev:'+d])return;const r=S.sp[d].rev||{};const st=Object.keys(r).filter(k=>r[k]===ds).map(Number);if(st.length)out.push(['term',`${korDate(d)} 세트 다시 보기(${Math.max(...st)}일 차)`]);});
  S.log.forEach(l=>{if(l.d!==ds)return;const k=CAL_LOG[l.type]||['quiz',String(l.type)];out.push([k[0],`${k[1]} ${l.ok}/${l.total}`]);});
  const its=routineFor(ds),ch=S.checks[ds]||{},n=its.filter((_,i)=>ch[i]).length;if(n)out.push(['todo',`오늘 할 일 ${n}/${its.length} 체크`]);
  return out;}
function calIn(ds){const c=S.cal[ds];return(c&&c.in)||[];}
function calWas(ds,items){return calIn(ds).length>0||items.length>0||!!(S.daily[ds]&&S.daily[ds].active);}
function calMonthIn(ym){let n=0;const[y,m]=ym.split('-').map(Number),nd=new Date(y,m,0).getDate();for(let d=1;d<=nd;d++){const ds=fmt(new Date(y,m-1,d));if(calWas(ds,calItems(ds)))n++;}return n;}
function vCal(){const t=todayStr(),ym=SV.calM||t.slice(0,7),sel=SV.calD||t;const[y,mo]=ym.split('-').map(Number);
  const lead=new Date(y,mo-1,1).getDay(),nd=new Date(y,mo,0).getDate(),ev={};milestones().forEach(m=>{(ev[m.d]=ev[m.d]||[]).push(m.t);});
  const first=[S.created,PLAN.start].concat(Object.keys(S.daily),Object.keys(S.cal)).filter(Boolean).sort()[0]||t;
  const sum={was:0};CAL_K.forEach(([k])=>{sum[k]=0;});let cells='';for(let i=0;i<lead;i++)cells+='<span class="cd emp"></span>';
  for(let dd=1;dd<=nd;dd++){const ds=fmt(new Date(y,mo-1,dd)),its=calItems(ds),ks=CAL_K.map(a=>a[0]).filter(k=>its.some(x=>x[0]===k)),was=calWas(ds,its);
    if(was)sum.was++;ks.forEach(k=>{sum[k]++;});
    cells+=`<button class="cd${ds===t?' today':''}${ds===sel?' sel':''}${was?' was':''}${ds>t?' fut':''}${ev[ds]?' ev':''}" data-act="cal-day" data-d="${ds}" aria-label="${esc(korDate(ds))}"><span class="n">${dd}</span><span class="dots">${ks.map(k=>`<i class="k-${k}"></i>`).join('')}</span></button>`;}
  const its=calItems(sel),ins=calIn(sel),was=calWas(sel,its);
  const inTxt=ins.length?'접속 '+(ins.length>8?ins.slice(0,6).join(', ')+` 외 ${ins.length-6}번`:ins.join(', ')):'';
  return topbar('학습 달력')+`<h1 class="ptitle">학습 달력</h1><p class="lsub">앱을 연 날과 그날 끝낸 공부예요. 날짜를 누르면 자세히 보여요.</p>
  <div class="callg">${CAL_K.map(([k,l])=>`<span><i class="cdot k-${k}"></i>${l}</span>`).join('')}<span><i class="cdot was"></i>접속만</span></div>
  <div class="calhd"><button class="btn sm sec" data-act="cal-mon" data-v="-1" aria-label="이전 달" ${ym>first.slice(0,7)?'':'disabled'}>‹</button><b>${y}년 ${mo}월</b><button class="btn sm sec" data-act="cal-mon" data-v="1" aria-label="다음 달" ${ym<t.slice(0,7)?'':'disabled'}>›</button></div>
  <div class="calw">${'일월화수목금토'.split('').map((d,i)=>`<span class="${i===0?'sun':i===6?'sat':''}">${d}</span>`).join('')}</div>
  <div class="calg">${cells}</div>
  <p class="note">이달 접속 ${sum.was}일, ${CAL_K.filter(([k])=>sum[k]).map(([k,l])=>`${l} ${sum[k]}일`).join(', ')||'아직 끝낸 공부 없음'}${ym!==t.slice(0,7)||sel!==t?' · <button class="lnk" data-act="cal-today">오늘로</button>':''}</p>
  ${sec(korDate(sel,true),esc(inTxt),`${ev[sel]?`<div class="group plain">${ev[sel].map(m=>`<div class="row noic"><span class="tx"><span class="tt" style="color:var(--red)">${esc(m)}</span></span></div>`).join('')}</div>`:''}
    ${its.length?`<div class="group">${its.map(([k,tx])=>`<div class="row noic calrow"><i class="cdot k-${k}"></i><span class="tx"><span class="tt" style="font-weight:500">${esc(tx)}</span></span></div>`).join('')}</div>`
    :`<div class="empty">${sel>t?'아직 오지 않은 날이에요':was?'앱을 열었지만 끝낸 공부는 없어요':'기록이 없어요'}</div>`}`)}
  <p class="note">카드 매김·테스트·오늘 할 일은 이 휴대폰에 남은 기록으로 예전 날짜까지 보여 주고, 접속 시각과 세트·논술·모의고사 완료는 이 기능을 넣은 뒤부터 쌓여요.</p>`;}
function vPlan(){const t=todayStr(),cw=weekIndex(),E=PLAN.E,ms=milestones();
  const groups=PE_PHASES.map(p=>({p,ws:[]}));for(let a=0;a<=E;a++){const o=weekObj(a);const g=groups.find(x=>x.p.id===o.ph)||groups[1];g.ws.push(o);}
  return topbar('로드맵')+`<h1 class="ptitle">${E}주 로드맵</h1><p class="lsub">${esc(korDate(PLAN.start))} 시작 → 제${PLAN.target.r}회 필기 ${esc(PLAN.target.d)}${esc(estTag(PLAN.target))}${PLAN.mock?`, 실전 모의 제${PLAN.mock.r}회`:''}. 1단계 단원 순서는 최근 기출 13회분(제128~140회) 출제 비중을 따라 짰어요.</p>
  <div class="btns"><button class="btn sm sec" data-act="go" data-h="schedule">시험 일정 바꾸기</button></div>
  <details class="d" style="margin-top:14px"><summary>시험 구조와 합격 기준</summary><div class="in-d"><ul style="margin:0 0 0 18px;padding:0;color:var(--ink2)">${[PE_EXAM.structure,PE_EXAM.p1,PE_EXAM.p234,PE_EXAM.pass,PE_EXAM.interview,PE_EXAM.docs].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
   <table class="t" style="margin-top:10px"><tr><th>연도</th>${PE_EXAM.rates.map(r=>`<th>${r[0]}</th>`).join('')}</tr><tr><td>필기 합격률</td>${PE_EXAM.rates.map(r=>`<td class="n">${r[1]}</td>`).join('')}</tr></table><p class="note">${esc(PE_EXAM.interviewRate)}. ${esc(PE_EXAM.schedule2026)}</p></div></details>
  ${sec('마일스톤','',`<div class="group">${ms.map(m=>row({ic:'flag',tone:m.d<t?'gray':m.k==='exam'?'red':'',t:esc(m.t),d:esc(m.d)+(m.d>=t?`, D-${diffDays(t,m.d)}`:', 지남')})).join('')}</div>`)}
  ${groups.filter(g=>g.ws.length).map(g=>{const a0=g.ws[0].w,a1=g.ws[g.ws.length-1].w;const open=cw>=a0&&cw<=a1;
    return`<details class="d" ${open?'open':''}><summary><span>${esc(g.p.n)} <span class="ds" style="display:inline">${a0===a1?a0+'주차':a0+'~'+a1+'주차'}</span></span></summary><div class="in-d" style="padding:0"><p class="ds" style="padding:0 16px 8px">${esc(fillT(g.p.g))}</p>
      ${g.ws.map(w=>{const r=weekRange(w.w);const ev=ms.filter(m=>m.d>=r[0]&&m.d<=r[1]);return`<div class="wk ${w.w===cw?'now':''}"><h4>${w.w}주차: ${esc(w.t)}</h4><div class="dt">${md(r[0])}~${md(r[1])}${w.u&&w.u.length?', '+esc(w.u.map(unitName).join(' · ')):''}</div>${ev.length?`<div class="dt" style="color:var(--red);font-weight:600;margin-top:4px">${ev.map(m=>esc(md(m.d)+' '+m.t)).join('<br>')}</div>`:''}<ul>${w.goals.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${w.out?`<div class="dt" style="margin-top:6px">산출물: ${esc(w.out)}</div>`:''}</div>`;}).join('')}</div></details>`;}).join('')}
  ${sec('학원 대신 무엇으로','',`<div class="group" style="padding:4px 8px"><table class="t">${PE_ACADEMY.map(a=>`<tr><td style="width:34%"><b>${esc(a.a)}</b></td><td>${esc(a.b)}</td></tr>`).join('')}</table></div>`)}
  ${sec('Claude 활용 순서','',PE_CLAUDE_ROUTINE.map((r,i)=>`<details class="d"><summary>${i+1}. ${esc(r.n)}</summary><div class="in-d"><p style="margin:0;color:var(--ink2)">${esc(r.d)}</p></div></details>`).join(''))}
  ${sec('답안 작성 10계명','',PE_TIPS.map((x,i)=>`<details class="d"><summary>${i+1}. ${esc(x.t)}</summary><div class="in-d"><p style="margin:0;color:var(--ink2)">${esc(x.d)}</p></div></details>`).join(''))}`;}
let SCH=null;
function schReq(){const p=planSig();const ov=S.settings.roundDates||{};const rounds=Object.keys(ov).sort().map(r=>` --round ${r}=${ov[r]}`).join('');
  return`기술사 6개월 앱의 시험 일정을 바꿨어요. 예약 작업 저장소에도 같은 일정을 넣어 주세요.
1) add_repo 도구로 woos-lee94/gisulsa-data 를 push 권한으로 붙이고 클론
2) python3 pipeline/tool.py set-plan --start ${p.start} --target ${S.settings.target||'auto'} --clear-rounds${rounds}
   (출력의 목표 ${p.target}회 ${p.exam}, 실전 모의 ${p.mock?p.mock+'회 '+p.mockDate:'없음'}과 같은지 확인)
3) git add -A && git commit -m "일정 변경: ${p.start} 시작, 제${p.target}회 목표" && git fetch origin main && git rebase origin/main && git push origin HEAD:main`;}
function vSchedule(){const ed=SCH||{start:S.settings.start,target:S.settings.target||'auto'};const changed=!!SCH&&(ed.start!==S.settings.start||String(ed.target)!==String(S.settings.target||'auto'));
  let P;try{P=computePlan(ed.start,ed.target);}catch(e){P=PLAN;}
  const el=eligibleRounds(ed.start).slice(0,6);const t=todayStr();const rp=repoPlanState(),R0=SETS.plan;
  const mo=(P.E/4.345).toFixed(1);const a1=P.E-12;
  const list=roundList().filter(x=>x.d>=addDays(t,-40)).slice(0,9);
  return topbar('시험 일정')+`<h1 class="ptitle">시험 일정</h1><p class="lsub">준비 시작일을 정하면 정기시험 가운데 ${PE_SCHED.minMonths}개월 이상 남은 가장 빠른 회차를 목표로 잡아요.</p>
  <label class="f" for="schStart">준비 시작일</label><input class="in" type="date" id="schStart" value="${esc(ed.start)}">
  <label class="f" for="schTarget">목표 회차</label><select class="select" id="schTarget"><option value="auto"${ed.target==='auto'?' selected':''}>자동: 가장 빠른 회차(제${el[0].r}회)</option>${el.map(x=>`<option value="${x.r}"${String(ed.target)===String(x.r)?' selected':''}>제${x.r}회, ${x.d}${estTag(x)}, ${Math.floor(diffDays(ed.start,x.d)/7)}주</option>`).join('')}</select>
  <div class="sheet" style="margin-top:16px"><p class="sheet-k">${changed?'바꾸면 이렇게 돼요':'지금 일정'}</p><h3>제${P.target.r}회 필기 ${esc(korDateY(P.target.d,true))}${P.target.est?' <span class="tag-new">예상</span>':''}</h3>
    <ul class="steps">
      <li><span class="dot on"></span><span class="k">준비 기간</span><span class="v">${P.E}주, 약 ${mo}개월</span></li>
      <li><span class="dot ${P.mock?'on':''}"></span><span class="k">실전 모의</span><span class="v">${P.mock?`제${P.mock.r}회 ${md(P.mock.d)}${P.mock.est?'(예상)':''}, ${P.M}주차`:'없음'}</span></li>
      <li><span class="dot half"></span><span class="k">1회독·2회독</span><span class="v">1~${a1}주차</span></li>
      <li><span class="dot half"></span><span class="k">실전 모의 → 파이널</span><span class="v">${a1+1}~${P.E-1}주차</span></li>
    </ul>
    ${P.mock?'':`<p class="ds" style="margin:4px 0 0">시작 ${PE_SCHED.mockMinWeeks}주 뒤부터 목표 전까지 열리는 정기시험이 없어 주말 모의고사로 대신해요.</p>`}
    ${P.target.note||(P.mock&&P.mock.note)?`<p class="ds" style="margin:6px 0 0">${esc([P.mock&&P.mock.note?`제${P.mock.r}회: ${P.mock.note}`:'',P.target.note?`제${P.target.r}회: ${P.target.note}`:''].filter(Boolean).join(' / '))}</p>`:''}
    ${changed?`<div class="btns" style="margin-top:14px"><button class="btn" data-act="sch-save">이 일정으로 저장</button><button class="btn ghost" data-act="sch-cancel">취소</button></div><p class="ds" style="margin:8px 0 0">오늘 화면, 로드맵, 주차와 단계가 새 일정으로 바뀌어요. 카드·오답 기록은 그대로예요.</p>`:''}</div>
  ${sec('예약 작업 일정','',rp==='same'?`<div class="group">${row({ic:'check',tone:'ok',t:'예약 작업도 같은 일정이에요',d:'매일 세트와 주간 모의고사가 이 일정의 주차·단원으로 만들어져요'})}</div>`
    :rp==='unknown'?`<div class="group">${row({ic:'sync',tone:'gray',t:'아직 확인하지 못했어요',d:'받아 오기를 하면 저장소의 일정과 비교해요',act:'sync'})}</div>`
    :`<div class="group">${row({ic:'x',tone:'red',t:'예약 작업은 아직 이전 일정이에요',d:`저장소: ${esc(R0.start)} 시작, 제${esc(R0.target)}회 ${esc(R0.exam)}. 바꾸기 전까지 매일 세트의 주차·단원이 앱과 어긋날 수 있어요`})}</div>
      <div class="btns"><button class="btn sec" data-act="sch-copy">변경 요청 복사</button></div><p class="note">서버가 없어 앱이 저장소를 직접 고칠 수 없어요. 복사한 요청을 Claude Code에 붙여 넣으면 저장소 일정이 바뀌고, 다음 받아 오기 때 이 표시가 사라져요.</p>`)}
  ${sec('정기시험 일정','기술사 필기, 해마다 3회',`<div class="group">${list.map(x=>row({ic:'cal',tone:x.r===P.target.r?'red':P.mock&&x.r===P.mock.r?'amber':'gray',t:`제${x.r}회 ${esc(korDateY(x.d,true))}`,d:esc([x.est?'예상':x.user?'직접 입력':'확정',x.r===P.target.r?'목표':P.mock&&x.r===P.mock.r?'실전 모의':'',x.d<t?'지남':'',x.note].filter(Boolean).join(', '))})).join('')}</div>
    <p class="note">예상일은 2023·2025·2026년 시행 패턴(2월 초·5월 셋째·8월 넷째 토요일, 설 연휴 회피)으로 잡았어요. 다음 해 일정은 보통 11월 말~12월 큐넷에 공고돼요.</p>
    <details class="d" style="margin-top:10px"><summary>큐넷 공고 날짜로 고치기</summary><div class="in-d">
      <label class="f" for="schRound">회차</label><select class="select" id="schRound">${list.filter(x=>!PE_SCHED.confirmed[x.r]).map(x=>`<option value="${x.r}">제${x.r}회 (${x.d}${estTag(x)})</option>`).join('')}</select>
      <label class="f" for="schRoundDate">필기 시험일</label><input class="in" type="date" id="schRoundDate">
      <div class="btns"><button class="btn sec" data-act="sch-round-set">고치기</button><button class="btn ghost" data-act="sch-round-reset">예상일로 되돌리기</button></div></div></details>`)}`;}
function vPrompts(){const ps=PE_PROMPTS.slice().sort((a,b)=>a.id==='p0'?-1:b.id==='p0'?1:0);
  return topbar('Claude 프롬프트')+`<h1 class="ptitle">Claude 프롬프트</h1><p class="lsub">복사해서 Claude 프로젝트 "토목시공기술사"에 붙여 넣으세요.</p><div style="margin-top:14px">${ps.map(p=>`<details class="d"><summary>${esc(p.n)}</summary><div class="in-d"><pre class="prompt">${esc(fillT(p.t))}</pre><button class="btn sm" data-act="copy-prompt" data-id="${p.id}">복사</button></div></details>`).join('')}</div>`;}
function vImport(){return topbar('가져오기')+`<h1 class="ptitle">카드·목차 가져오기</h1><p class="lsub">Claude가 만든 JSON이나 "용어 | 정의 | 키워드1, 키워드2 | 단원번호" 줄 형식을 붙여 넣으세요.</p>
  <textarea class="in" id="impText" style="margin-top:12px" placeholder='[{"t":"용어","d":"정의","k":["키워드"],"u":4,"f":3}]'></textarea>
  <div class="btns"><button class="btn" data-act="imp-cards">용어 카드로 추가</button><button class="btn sec" data-act="imp-essays">논술 목차로 추가</button></div><p class="note">같은 용어가 이미 있으면 건너뛰어요.</p>
  ${sec('내 카드',S.userCards.length+'장',S.userCards.length?`<div class="group">${S.userCards.map(c=>`<div class="row noic"><span class="tx"><span class="tt">${esc(c.t)}</span><span class="ds">${esc(unitName(c.u))}</span></span><button class="btn sm ghost" data-act="del-card" data-id="${c.id}">삭제</button></div>`).join('')}</div>`:'<div class="empty">아직 없어요</div>')}
  ${Object.keys(S.hidden).length?`<div class="btns"><button class="btn sec" data-act="unhide">숨긴 카드 ${Object.keys(S.hidden).length}장 되돌리기</button></div>`:''}`;}
function vSettings(){const s=S.settings;
  return topbar('설정')+`<h1 class="ptitle">설정</h1>
  <div class="group" style="margin-top:12px">${row({ic:'flag',t:'시험 일정',d:`${esc(korDate(s.start))} 시작 → 제${PLAN.target.r}회 ${esc(PLAN.target.d)}${esc(estTag(PLAN.target))}`,act:'go',data:{h:'schedule'}})}</div>
  <label class="f">글자 크기</label><div class="seg">${[['m','보통'],['l','크게'],['xl','아주 크게']].map(x=>`<button class="${(s.fs||'m')===x[0]?'on':''}" data-act="fs" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <label class="f">화면</label><div class="seg">${[['auto','기기 설정 따라'],['light','밝게'],['dark','어둡게']].map(x=>`<button class="${(s.theme||'auto')===x[0]?'on':''}" data-act="theme" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <label class="f">어려운 낱말 형광펜</label><div class="seg">${[['on','켜기'],['off','끄기']].map(x=>`<button class="${(s.gloss||'on')===x[0]?'on':''}" data-act="gloss" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><p class="note">용어 설명 속 다른 카드 용어에 아직 모르는 것은 형광펜, 아는 것은 점선을 그어요. 형광펜과 상관없이 모르는 낱말은 꾹 누르면 카드나 앱 사전의 풀이가 나와요.</p>
  <label class="f" for="sNew">하루 새 카드 수(암기 탭)</label><input class="in" type="number" inputmode="numeric" id="sNew" value="${s.newPerDay}">
  <details class="d" style="margin-top:16px"><summary>고급: 데이터 주소</summary><div class="in-d">
    <label class="f" for="sData">데이터 주소</label><input class="in" id="sData" value="${esc(s.dataUrl)}" placeholder="${esc(DATA_DEFAULT)}"><p class="note">비워 두면 기본 저장소(gisulsa-data)에서 받아 와요.</p></div></details>
  <div class="btns" style="margin-top:16px"><button class="btn" data-act="save-settings">저장</button></div>${PE_IO.settingsHTML()}${memberSettingsHTML()}`;}
function memberSettingsHTML(){const me=PE_IO.member();if(!me)return'';
  return sec('아이디','',`<div class="group">${row({ic:'flag',t:esc(me.id),d:me.admin?'이 휴대폰에 고정된 아이디, 관리자':'이 휴대폰에 고정된 아이디'})}</div>
  <div class="btns"><button class="btn red" data-act="member-remove">아이디 지우기</button></div><p class="note">지우면 승인도 함께 없어지고 처음 화면으로 돌아가요. 학습 기록은 이 휴대폰에 그대로 남아요.</p>`);}
function vBackup(){return topbar('백업')+`<h1 class="ptitle">백업·복원</h1><p class="lsub">학습 기록은 이 기기에만 있어요. 1~2주에 한 번 메모나 메일에 붙여 두세요.</p>
  <div class="btns" style="margin-top:14px"><button class="btn" data-act="backup-copy">백업 복사</button><button class="btn sec" data-act="backup-dl">파일로 저장</button></div>
  <label class="f">복원(백업 내용 붙여넣기)</label><textarea class="in" id="restoreText" placeholder='{"v":2,...}'></textarea>
  <div class="btns"><button class="btn sec" data-act="restore">복원</button><button class="btn red" data-act="reset">전체 초기화</button></div>
  <p class="note">세트와 모의고사는 저장소에서 다시 받아 올 수 있어서 백업에 넣지 않아도 되지만, 함께 넣어 둡니다.</p>`;}
function vAbout(){const cs=deck();const n={base:0,kichul:0,set:0,user:0};cs.forEach(c=>n[c.src]=(n[c.src]||0)+1);const rounds=kichulRounds();const nq=rounds.reduce((a,r)=>a+r.q.length,0);
  return topbar('콘텐츠 출처')+`<h1 class="ptitle">콘텐츠 출처</h1><p class="lsub">카드 ${cs.length}장(기본 ${n.base}, 기출 보강 ${n.kichul}, 세트 ${n.set||0}, 내 카드 ${n.user||0}), 기출 ${rounds.length}회분 ${nq}문항, 논술 목차 ${essays().length}개</p>
  <div class="group" style="margin-top:14px">${PE_SOURCES.map(s=>`<div class="row noic" style="align-items:flex-start"><span class="tx"><span class="tt">${esc(s.t)}</span><span class="ds">${esc(s.d)}</span></span></div>`).join('')}</div>
  <p class="note">틀린 내용을 찾으면 그 카드에서 숨기기를 하고, Claude에 고친 카드를 만들어 달라고 해 가져오기로 넣으세요.</p>`;}

/* ════════ 17-2. 답안 작성 요령(data_guide.js의 모범 답안) ════════ */
const ulT=s=>esc(s).replace(/\[\[(.+?)\]\]/g,'<u>$1</u>');
const ROWS=22;
function aRow(n,no,lv,html){return`<div class="ar"><span class="ln">${n}</span><span class="no">${no}</span><span class="ac l${lv}">${html}</span></div>`;}
function aFig(k){const f=PE_GUIDE.example.figs[k];return`<div class="afig">${f.parts.map(p=>`<figure>${p.svg}<figcaption>${esc(p.cap)}</figcaption></figure>`).join('')}</div><p class="acap">${esc(f.cap)}</p>`;}
function aTable(t){return`<table class="at">${t.map((r,i)=>`<tr>${r.map(c=>i?`<td>${esc(c)}</td>`:`<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table>`;}
function aSheet(rows,no,full){let n=0,h='';rows.forEach(r=>{if(Array.isArray(r)){n++;h+=aRow(n,n===1&&no?esc(no):'',r[0],ulT(r[1]));}
    else{const a=n+1;n+=r.h;h+=`<div class="ar blk"><span class="ln">${a}<br>~<br>${n}</span><span class="no"></span><div class="ac">${r.table?aTable(r.table):aFig(r.fig)}</div></div>`;}});
  if(full)while(n<ROWS){n++;h+=aRow(n,'',0,'');}
  return`<div class="asheet"><div class="ah"><span>번호</span><span>답 안 란</span></div>${h}</div>`;}
function vGuide(){const G=window.PE_GUIDE;if(!G)return topbar('답안 작성 요령')+'<div class="empty" style="margin-top:20px"><b>작성 요령을 불러오지 못했어요</b></div>';
  const tab=SV.guide||'how',X=G.example;const tabs=[['how','쓰는 법'],['ex','모범 답안'],['chk','점검표']];let body='';
  if(tab==='how')body=sec('답안지 생김새','',`<div class="group" style="padding:4px 8px"><table class="t">${G.cover.map(c=>`<tr><th style="width:34%">${esc(c[0])}</th><td>${esc(c[1])}</td></tr>`).join('')}</table></div>
      <p class="note">${esc(G.sheet)}</p>${aSheet(X.pages[0].slice(0,8),X.no,false)}
      <div class="group plain" style="margin-top:12px">${G.rules.map((r,i)=>`<div class="row noic"><span class="tx"><span class="tt" style="font-weight:500">${i+1}. ${esc(r)}</span></span></div>`).join('')}</div>`)
    +sec('쓰는 순서','모범 답안 기준',`<div class="group">${G.steps.map((x,i)=>row({t:`${i+1}. ${esc(x.t)}`,d:esc(x.d)})).join('')}</div>`)
    +sec('번호 체계','글머리 기호와 들여쓰기',`<div class="group">${G.levels.map(x=>row({t:`<b class="mk">${esc(x.m)}</b>${esc(x.n)}`,d:esc(x.d)})).join('')}</div><p class="note">모범 답안 1면 9~15줄:</p>${aSheet(X.pages[0].slice(8,15),'',false)}<p class="note">Ⅰ. → 1. → 1) → ① 순서로만 내려가고, 단계를 건너뛰거나 섞지 않아요. 개요·결론처럼 짧은 대제목은 1. 없이 바로 1)로 써요.</p>`)
    +sec('기호와 밑줄','',`<div class="group">${G.marks.map(x=>row({t:`<b class="mk">${esc(x.m.trim())}</b>${esc(x.d)}`,d:ulT(x.ex)})).join('')}</div>`)
    +sec('면 배분','25점형 4면',`<div class="group">${G.plan.map(x=>row({t:esc(x.p),d:esc(x.d)})).join('')}</div>`)
    +sec('첨삭 받을 때','',`<p class="note" style="margin-top:0">세트·모의고사·기출의 "첨삭/채점 요청 복사"에 형식 점검표와 모범 답안 뼈대가 들어 있어, Claude가 글머리 기호·들여쓰기·밑줄·그림 번호·끝 표시까지 "○면 ○줄"로 짚어 줘요.</p><div class="btns"><button class="btn sec" data-act="copy-prompt" data-id="p1">논술 첨삭 요청 복사</button></div>`)
    +`<p class="note" style="margin-top:16px">${esc(G.src)}</p>`;
  else if(tab==='ex')body=`<div class="qcard" style="margin-top:14px"><p class="qnum">제2교시 25점형 ${esc(X.no)}</p><p class="qtext">${esc(X.q)}</p><p class="note" style="margin:6px 0 0">면마다 22줄. 밑줄·들여쓰기·기호·그림 번호를 그대로 따라 써 보세요.</p></div>`
    +X.pages.map((pg,i)=>aSheet(pg,i===0?X.no:'',true)+`<p class="apg">- ${i+1} -</p>`).join('')+`<p class="note">${esc(G.src)}</p>`;
  else body=`<p class="note" style="margin-top:14px">다 쓴 답안을 한 줄씩 짚어 보세요. 첨삭 요청을 복사하면 Claude도 이 번호로 형식을 짚어 줘요.</p>
    <div class="group" style="margin-top:8px">${G.check.map((c,i)=>`<label class="check"><input type="checkbox"><span>${i+1}. ${esc(c)}</span></label>`).join('')}</div>
    <div class="btns"><button class="btn" data-act="copy-prompt" data-id="p1">논술 첨삭 요청 복사</button><button class="btn sec" data-act="copy-prompt" data-id="p2">단답 첨삭 요청 복사</button></div>`;
  return topbar('답안 작성 요령')+`<h1 class="ptitle">논술 답안 작성 요령</h1><p class="lsub">모범 답안(제2교시 25점형, 콘크리트 시공이음)으로 보는 답안지 생김새와 쓰는 법</p>
  <div class="seg" style="margin-top:14px">${tabs.map(t=>`<button class="${tab===t[0]?'on':''}" data-act="guide-tab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>${body}`;}

/* ════════ 17-3. 승인 관리(관리자, 앱 전용) ════════ */
let ADM=null;
function admLoad(){ADM={loading:true};PE_IO.memberCall('list').then(v=>{ADM={members:v.members||[],codes:v.codes||[],me:v.me||''};if(R.page==='admin')render();},e=>{ADM={err:String(e&&e.message||e)};if(R.page==='admin')render();});}
function admRun(p,msg){p.then(()=>{if(msg)toast(msg);admLoad();if(R.page==='admin')render();},e=>toast('하지 못했어요: '+(e&&e.message||e)));}
function vAdmin(){const me=PE_IO.member();if(!me||!me.admin)return topbar('승인 관리')+'<div class="empty" style="margin-top:20px"><b>관리자만 볼 수 있어요</b></div>';
  if(!ADM)admLoad();
  const head=topbar('승인 관리')+`<h1 class="ptitle">승인 관리</h1><p class="lsub">승인한 휴대폰만 앱을 열 수 있어요. 아이디는 휴대폰마다 하나로 고정돼요.</p><div class="btns"><button class="btn sm sec" data-act="adm-reload">새로고침</button></div>`;
  if(ADM.loading)return head+'<div class="empty" style="margin-top:14px"><b>불러오는 중</b></div>';
  if(ADM.err)return head+`<div class="empty" style="margin-top:14px"><b>불러오지 못했어요</b>${esc(ADM.err)}</div>`;
  const day=x=>esc(String(x||'').slice(0,10));
  const who=m=>`<span class="tx"><span class="tt">${esc(m.id)}${m.uid===ADM.me?' (나)':''}</span><span class="ds">${day(m.createdAt)}${m.code?', 초대 코드로':''}</span></span>`;
  const btn=(act,m,label,cls,s)=>`<button class="btn sm ${cls}" data-act="${act}" data-uid="${esc(m.uid)}" data-id="${esc(m.id)}"${s?` data-s="${s}"`:''}>${label}</button>`;
  const by=st=>ADM.members.filter(m=>m.status===st);
  const pend=by('pending'),ok=by('approved'),no=by('rejected');
  return head+sec('승인 기다리는 사람',pend.length+'명',pend.length?`<div class="group">${pend.map(m=>`<div class="row noic">${who(m)}${btn('adm-set',m,'승인','','approved')}${btn('adm-set',m,'거절','ghost','rejected')}</div>`).join('')}</div>`:'<div class="empty">새 요청이 없어요</div>')
    +sec('승인된 사람',ok.length+'명',ok.length?`<div class="group">${ok.map(m=>`<div class="row noic">${who(m)}${m.uid===ADM.me?'':btn('adm-set',m,'승인 취소','ghost','rejected')}</div>`).join('')}</div>`:'<div class="empty">아직 없어요</div>')
    +(no.length?sec('거절한 사람',no.length+'명',`<div class="group">${no.map(m=>`<div class="row noic">${who(m)}${btn('adm-set',m,'승인','sec','approved')}${btn('adm-del',m,'지우기','ghost')}</div>`).join('')}</div><p class="note">지우면 그 아이디를 다른 휴대폰에서 다시 만들 수 있어요.</p>`):'')
    +sec('초대 코드',ADM.codes.length+'개',`${ADM.codes.length?`<div class="group">${ADM.codes.map(c=>`<div class="row noic"><span class="tx"><span class="tt" style="font-family:ui-monospace,Menlo,monospace;letter-spacing:.08em">${esc(c.code)}</span><span class="ds">${day(c.createdAt)}</span></span><button class="btn sm sec" data-act="code-copy" data-code="${esc(c.code)}">복사</button><button class="btn sm ghost" data-act="code-del" data-code="${esc(c.code)}">지우기</button></div>`).join('')}</div>`:''}
      <div class="btns"><button class="btn sec" data-act="code-add">초대 코드 만들기</button></div><p class="note">아이디를 만들 때 초대 코드를 넣으면 승인을 기다리지 않고 바로 열려요. 애플 심사용 코드도 여기서 만들어 심사 메모에 적고, 다 쓴 코드는 지우세요.</p>`)
    +`<p class="note" style="margin-top:16px">내 기기 번호: ${esc(ADM.me)}</p>`;}

/* ════════ 18. 타이머 ════════ */
const TM={preset:'essay',total:6000,parts:4,endAt:0,remain:6000,running:false,iv:null,lastPart:-1,custom:100};
const PRESETS={p1:{n:'1교시 단답',total:100,parts:10},essay:{n:'논술 교시',total:100,parts:4},one1:{n:'단답 1문',total:10,parts:1},one2:{n:'논술 1문',total:25,parts:1},custom:{n:'직접',total:0,parts:1}};
function setPreset(k){TM.preset=k;const p=PRESETS[k];TM.total=(k==='custom'?TM.custom:p.total)*60;TM.parts=p.parts;TM.remain=TM.total;TM.running=false;TM.lastPart=-1;clearInterval(TM.iv);PE_IO.keepAwake(false);}
function beep(long){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;TM.ac=TM.ac||new A();if(TM.ac.state!=='running'&&TM.ac.resume)TM.ac.resume().catch(()=>{});const o=TM.ac.createOscillator(),g=TM.ac.createGain();o.connect(g);g.connect(TM.ac.destination);o.frequency.value=long?660:880;g.gain.value=.15;o.start();o.stop(TM.ac.currentTime+(long?.9:.25));}catch(e){}}
function partIdx(){const per=TM.total/TM.parts;return Math.min(TM.parts,Math.floor((TM.total-TM.remain)/per)+1);}
function tStart(){if(TM.running)return;if(TM.remain<=0)TM.remain=TM.total;TM.endAt=Date.now()+TM.remain*1000;TM.running=true;beep(false);
  PE_IO.keepAwake(true);
  TM.iv=setInterval(()=>{TM.remain=Math.max(0,Math.round((TM.endAt-Date.now())/1000));const part=partIdx();if(TM.lastPart>=0&&part!==TM.lastPart&&TM.remain>0){beep(false);toast(part+'번째 문제 시간');}TM.lastPart=part;
    if(TM.remain<=0){clearInterval(TM.iv);TM.running=false;beep(true);toast('시간 종료');PE_IO.keepAwake(false);}paintTimer();paintPill();},250);paintTimer();paintPill();}
function tPause(){if(!TM.running)return;clearInterval(TM.iv);TM.running=false;TM.remain=Math.max(0,Math.round((TM.endAt-Date.now())/1000));PE_IO.keepAwake(false);paintTimer();paintPill();}
function tReset(){clearInterval(TM.iv);TM.running=false;PE_IO.keepAwake(false);TM.remain=TM.total;TM.lastPart=-1;paintTimer();paintPill();}
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function paintTimer(){const el=$('#timerBox');if(!el)return;const per=TM.total/TM.parts,part=partIdx(),partLeft=Math.max(0,Math.round(per*part-(TM.total-TM.remain)));
  el.className='timer'+(TM.remain<=180&&TM.remain>0?' urgent':'');el.innerHTML=`<div class="big">${mmss(TM.remain)}</div><div class="part">${TM.parts>1?`문제 <b>${part}/${TM.parts}</b>, 이 문제 남은 시간 <b>${mmss(partLeft)}</b>`:`${esc(PRESETS[TM.preset].n)} ${Math.round(TM.total/60)}분`}</div>`;
  const b=$('#tStart');if(b)b.textContent=TM.running?'일시정지':(TM.remain<TM.total&&TM.remain>0?'계속':'시작');}
function paintPill(){const w=$('#tpill-wrap');if(!w)return;if((TM.running||(TM.remain<TM.total&&TM.remain>0))&&R.page!=='timer')w.innerHTML=`<button class="tpill" data-act="go" data-h="timer">⏱ ${mmss(TM.remain)}${TM.running?'':' 멈춤'}</button>`;else w.innerHTML='';}
function vTimer(){return topbar('타이머')+`<h1 class="ptitle">교시 타이머</h1><p class="lsub">시작 3분은 문제 고르기, 마지막 3분은 번호·공란 확인에 쓰세요.</p>
  <div class="seg" style="margin-top:14px">${Object.keys(PRESETS).map(k=>`<button class="${TM.preset===k?'on':''}" data-act="timer-preset" data-p="${k}">${PRESETS[k].n}${PRESETS[k].total?' '+PRESETS[k].total+'분':''}</button>`).join('')}</div>
  ${TM.preset==='custom'?`<div class="btns"><input class="in" id="tmCustom" type="number" inputmode="numeric" value="${TM.custom}" style="max-width:120px"><button class="btn sm sec" data-act="timer-custom">분으로 맞추기</button></div>`:''}
  <div class="timer" id="timerBox"></div><div class="btns"><button class="btn" id="tStart" data-act="timer-toggle">시작</button><button class="btn sec" data-act="timer-reset">처음으로</button></div>
  <p class="note">문제 경계마다 짧은 알림음, 끝나면 긴 알림음이 나요. 다른 화면으로 가도 위쪽에 남은 시간이 보여요.</p>`;}

/* ════════ 19. 모달(카드·목차 보기) ════════ */
function openModal(html){$('#modal-wrap').innerHTML=`<div class="modal" data-act="modal-close"><div class="msheet" data-stop="1"><div class="grab"></div>${html}</div></div>`;}
function closeModal(){$('#modal-wrap').innerHTML='';}
function cardModal(c){const p=pget(c.id);return`<div class="sheet" style="margin-top:4px"><p class="sheet-k">${esc(unitName(c.u))}${p.seen?`, 다음 복습 ${esc(p.due||'—')}`:', 아직 학습 전'}</p><h3>${esc(c.t)}</h3><p class="defn ruled" style="margin-top:10px">${glHTML(c.d,c.id)}</p><ul class="kws">${(c.k||[]).map(k=>`<li><span>${esc(k)}</span></li>`).join('')}</ul>${c.x&&c.x.length?`<p class="xref">기출: ${c.x.map(kLabelShort).join(', ')}</p>`:''}${c.basis?`<p class="xref">근거: ${esc(c.basis)}</p>`:''}</div>
  <div class="btns"><button class="btn sec" data-act="star" data-id="${c.id}">${p.star?'★ 별표 해제':'☆ 별표'}</button>${p.seen?'':`<button class="btn" data-act="introduce" data-id="${c.id}">암기에 넣기</button>`}</div><div class="btns"><button class="btn ghost" data-act="hide-card" data-id="${c.id}">이 카드 숨기기</button></div>`;}
function kqModal(id){const q=kq()[id];if(!q)return;let html=`<p class="qnum">제${q.r}회 ${q.p}교시 ${q.n}번, ${esc(unitName(q.u))}</p><p class="qtext">${esc(q.t)}</p>`;
  if(q.p===1){const cs=cardsForK(id);html+=cs.length?cs.map(cardModal).join(''):`<div class="empty"><b>아직 카드가 없어요</b>매일 세트가 기출 미수록 용어를 우선 다뤄요. 지금 필요하면 프롬프트 3으로 만들어 가져오기 하세요.</div>`;}
  else{const es=essaysForK(id);html+=es.length?es.map(e=>`<div class="qcard" style="margin-top:8px"><p class="qnum">모범 목차${e.src==='set'?', '+esc(korDate(e.date))+' 세트':''}</p><ol style="margin:0 0 0 20px;padding:0;line-height:1.75">${e.o.map(o=>`<li>${esc(String(o).replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol>${e.p?`<p class="plus">${esc(e.p)}</p>`:''}</div>`).join(''):`<div class="empty"><b>아직 모범 목차가 없어요</b>세트·모의고사에서 이 문제를 다루면 여기에 채워져요.</div><div class="btns"><button class="btn sec" data-act="copy-outline-req" data-id="${id}">Claude에 목차 요청 복사</button></div>`;}
  openModal(html);}

/* ════════ 20. 가져오기 파서 ════════ */
function stripFence(t){return String(t||'').trim().replace(/^```[a-zA-Z]*\s*/,'').replace(/```\s*$/,'').trim();}
function parseArr(txt){txt=stripFence(txt);try{const j=JSON.parse(txt);if(Array.isArray(j))return j;if(j&&Array.isArray(j.cards))return j.cards;}catch(e){}const m=txt.match(/\[[\s\S]*\]/);if(m){try{return JSON.parse(m[0]);}catch(e){}}return null;}
function normCard(o){if(!o||!o.t||!o.d)return null;let u=Number(o.u)||16;if(u<1||u>16)u=16;let k=Array.isArray(o.k)?o.k:String(o.k||'').split(/[,，、]/);k=k.map(s=>String(s).trim()).filter(Boolean).slice(0,8);return{id:'U'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),u,t:String(o.t).trim(),d:String(o.d).trim(),k,f:Math.min(3,Math.max(1,Number(o.f)||2)),x:[]};}
function parseCards(txt){const arr=parseArr(txt);if(arr)return arr.map(normCard).filter(Boolean);return stripFence(txt).split(/\n+/).map(l=>l.split('|').map(s=>s.trim())).filter(a=>a.length>=2&&a[0]&&a[1]).map(a=>normCard({t:a[0],d:a[1],k:a[2]||'',u:a[3]})).filter(Boolean);}
function parseEssays(txt){const arr=parseArr(txt)||[];return arr.map(o=>{if(!o||!o.t||!Array.isArray(o.o))return null;let u=Number(o.u)||16;if(u<1||u>16)u=16;return{id:'UE'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),u,t:String(o.t).trim(),o:o.o.map(String),p:String(o.p||''),f:Math.min(3,Math.max(1,Number(o.f)||2)),x:[]};}).filter(Boolean);}

/* ════════ 21. 공통 동작 ════════ */
let toastT=null;function toast(m){const el=$('#toast');if(!el)return;el.textContent=m;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2000);}
function copy(text,msg){PE_IO.copy(text).then(()=>toast(msg||'복사했어요'),()=>toast('복사하지 못했어요'));}
function applyLook(){const s=S.settings;if(!s.theme||s.theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',s.theme);if(!s.fs||s.fs==='m')document.documentElement.removeAttribute('data-fs');else document.documentElement.setAttribute('data-fs',s.fs);}
function promptWith(id,from,to){const p=PE_PROMPTS.find(x=>x.id===id);return p?fillT(p.t).replace(from,to):'';}

/* ════════ 22. 이벤트 ════════ */
/* 꾹 누르기(0.45초): 형광펜 낱말은 그 카드, 다른 낱말은 카드 → 앱 사전 → 바깥 사전 찾기. 데스크톱은 오른쪽 클릭.
   손을 움직이면(스크롤) 취소하고, 누른 뒤 손을 뗄 때 생기는 클릭은 버린다(카드 뒤집기·답 고르기·창 닫기 방지). 입력 칸·버튼·탭은 빼고 */
const GL_SKIP='input,textarea,select,.btn,nav,.topbar,.seg,label.check';
let glT=null,glXY=null,glEl=null,glFired=0;
function glAt(target,x,y){if(!target||!target.closest||target.closest(GL_SKIP)||!target.closest('#view,#modal-wrap'))return false;
  const g=target.closest('.gl');if(g){const c=card(g.dataset.gl);if(c){openModal(cardModal(c));return true;}}
  const w=glWordAt(x,y);return w?glOpen(w):false;}
function glCancel(){clearTimeout(glT);glT=null;if(glEl){glEl.classList.remove('press');glEl=null;}}
document.addEventListener('touchstart',e=>{glCancel();glFired=0;const tg=e.target,t0=e.touches&&e.touches[0];if(!t0||!tg||!tg.closest||tg.closest(GL_SKIP)||!tg.closest('#view,#modal-wrap'))return;
  const g=tg.closest('.gl');if(g){glEl=g;g.classList.add('press');}glXY=[t0.clientX,t0.clientY];
  glT=setTimeout(()=>{glCancel();if(glAt(tg,glXY[0],glXY[1]))glFired=Date.now();},450);},{passive:true});
document.addEventListener('touchmove',e=>{if(!glT||!e.touches||!e.touches[0])return;if(Math.abs(e.touches[0].clientX-glXY[0])+Math.abs(e.touches[0].clientY-glXY[1])>10)glCancel();},{passive:true});
document.addEventListener('touchend',e=>{glCancel();if(glFired&&e.cancelable)e.preventDefault();},{passive:false});
document.addEventListener('touchcancel',glCancel);
/* 카드 넘겨 보기: 카드를 옆으로 밀면 다음(왼쪽)·이전(오른쪽) */
let swXY=null;
document.addEventListener('touchstart',e=>{const t=e.touches&&e.touches[0];swXY=t&&e.target.closest&&e.target.closest('.fc,.memo')?[t.clientX,t.clientY]:null;},{passive:true});
document.addEventListener('touchend',e=>{const t=e.changedTouches&&e.changedTouches[0];if(!swXY||!t||glFired){swXY=null;return;}const dx=t.clientX-swXY[0],dy=t.clientY-swXY[1];swXY=null;
  if(Math.abs(dx)<=60||Math.abs(dy)>=50)return;
  if(R.page==='sess'&&SES){if(dx<0)sessAdvance();else sessPrev();}else if(R.page==='memo'&&MEMO)memoGo(MEMO.i+(dx<0?1:-1));},{passive:true});
document.addEventListener('contextmenu',e=>{if(glAt(e.target,e.clientX,e.clientY))e.preventDefault();});
document.addEventListener('click',e=>{if(glFired&&Date.now()-glFired<1500){glFired=0;e.preventDefault();e.stopPropagation();}},true);
document.addEventListener('click',e=>{
  const m=e.target.closest('[data-stop]');const b=e.target.closest('[data-act]');
  if(b&&b.dataset.act==='modal-close'&&m)return;
  if(!b)return;const a=b.dataset.act,D=b.dataset;
  switch(a){
  case'go':closeModal();return nav(D.h);
  case'back':return back();
  case'modal-close':return closeModal();
  case'sync':return sync(true);
  case'chk':{const t=todayStr();S.checks[t]=S.checks[t]||{};S.checks[t][D.i]=b.checked;touchDay();save();return render();}
  /* 세트 */
  case'set-tab':SV[D.d]=D.t;return render();
  case'set-open':{const i=Number(D.i);const key=D.d+':o';SV[key]=SV[key]===i?null:i;if(SV[key]===i){const p=sp(D.d);p.read[i]=1;introduce(setCardId(D.d,i));touchDay();calSetRead(D.d);save();}return render();}
  case'set-flash':{const rk='flash:'+D.d;if(SES&&SES.rkey===rk&&SES.i<SES.items.length)return nav('sess');
    const s=SETS.sets[D.d];const items=(s.cards||[]).map((_,i)=>({type:'card',id:setCardId(D.d,i),si:i})).filter(x=>x.id);const r=resumeGet(rk),i0=r&&r.i<items.length?r.i:0;
    if(i0)toast(`${i0+1}번째 카드부터 이어서 해요`);return startSession({title:korDate(D.d)+' 세트 카드',items,setD:D.d,rkey:rk,i:i0});}
  case'cal-mon':{const[y,m]=(SV.calM||todayStr().slice(0,7)).split('-').map(Number);const nm=fmt(new Date(y,m-1+Number(D.v),1)).slice(0,7),t=todayStr();SV.calM=nm;SV.calD=nm===t.slice(0,7)?t:nm+'-01';return render();}
  case'cal-day':SV.calD=D.d;return render();
  case'cal-today':SV.calM=null;SV.calD=null;return render();
  case'resume-clear':{String(D.k).split(' ').forEach(k=>{delete S.resume[k];if(MEMO&&MEMO.key===k){memoStop();MEMO=null;}if(SES&&SES.rkey===k)SES=null;});save();toast('처음부터 시작해요');return render();}
  case'set-quiz':{const d=D.d,i=Number(D.i),k=Number(D.k);const q=SETS.sets[d].quiz[i];const p=sp(d);if(p.quiz[i])return;const ok=k===q.a;p.quiz[i]={pick:k,ok};const key='Q:'+d+':'+i;const qp=S.qp[key]||(S.qp[key]={ok:0,ng:0});ok?qp.ok++:qp.ng++;qp.last=todayStr();if(!ok)markWrong(key,'quiz');touchDay();const st=setStatus(d);calMark('quiz:'+d,'quiz',`${korDate(d)} 세트 퀴즈 ${st.qa}/${st.nq}문 풂(정답 ${st.qok})`);save();return render();}
  case'set-eo':SV[D.d+':eo']=1;return render();
  case'guide-tab':SV.guide=D.t;window.scrollTo(0,0);return render();
  case'set-essay-done':{const p=sp(D.d);p.essay=p.essay||{};p.essay.done=b.checked;touchDay();const e=SETS.sets[D.d].essay;if(b.checked)calMark('essay:'+D.d,'essay',`${korDate(D.d)} 세트 논술 손글씨: ${e&&e.t?e.t:''}`);else calUnmark('essay:'+D.d);save();return render();}
  case'set-task':{const p=sp(D.d);p.tasks[D.i]=b.checked;touchDay();const st=setStatus(D.d);if(st.td)calMark('task:'+D.d,'todo',`${korDate(D.d)} 세트 과제 ${st.td}/${st.nt}`);else calUnmark('task:'+D.d);save();return render();}
  case'copy-essay':{const e=SETS.sets[D.d].essay;return copy(promptWith('p1','(여기에 문제를 그대로 적는다)',e.t),'첨삭 요청을 복사했어요. 사진과 함께 Claude 프로젝트에 붙여 넣으세요');}
  case'star':{const p=prog(D.id);p.star=!p.star;save();if($('#modal-wrap').innerHTML){const c=card(D.id);if(c)openModal(cardModal(c));}return R.page==='sess'?render():render();}
  case'introduce':{introduce(D.id);toast('내일 카드 복습에 나와요');closeModal();return render();}
  case'hide-card':return PE_IO.ask('이 카드를 숨길까요? 가져오기 화면에서 되돌릴 수 있어요.',()=>{S.hidden[D.id]=true;save();invalidate();closeModal();render();});
  /* 세션 */
  case'start-due':return startDueAll();
  case'start-study':return startStudy();
  case'start-free':return startFree();
  case'memo-set':{const s=SETS.sets[D.d];const items=(s.cards||[]).map((_,i)=>({id:setCardId(D.d,i),si:i})).filter(x=>x.id);return startMemo({key:'memo:set:'+D.d,label:korDate(D.d)+' 세트',title:korDate(D.d)+' 가리며 외우기',items,setD:D.d});}
  case'memo-study':return startMemo({key:'memo:study',label:'암기 탭',title:'가리며 외우기',items:memoStudyIds().map(id=>({id}))});
  case'memo-finish':return memoFinish();
  case'memo-close':{const f=MEMO&&MEMO.from;MEMO=null;return nav(f?f.replace(/^#/,''):'study');}
  case'memo-again':{if(!MEMO)return;const o={key:MEMO.key,label:MEMO.label,title:MEMO.title,items:MEMO.items,setD:MEMO.setD,from:MEMO.from};MEMO=null;return startMemo(o,true);}
  case'memo-play':return MEMO&&MEMO.run?memoPause():memoPlay();
  case'memo-prev':return MEMO&&memoGo(MEMO.i-1);
  case'memo-next':return MEMO&&memoGo(MEMO.i+1);
  case'memo-cfg':{const k=D.k,v=k==='mode'?(['pick','rand'].includes(D.v)?D.v:'all'):Number(D.v);S.settings.memo=Object.assign(memoCfg(),{[k]:v});if(MEMO){MEMO.cfgOpen=true;MEMO.rnd=null;MEMO.rndShown=false;}save();return render();}
  case'memo-pick':{const it=memoItem();if(!it)return;const m=S.memoPick||(S.memoPick={});const li=D.li;
    if(memoCfg().mode!=='pick'){S.settings.memo=Object.assign(memoCfg(),{mode:'pick'});m[it.id]=[li];save();toast('고른 줄만 가리기로 바꿨어요');return render();}
    const a=new Set(m[it.id]||[]);a.has(li)?a.delete(li):a.add(li);if(a.size)m[it.id]=[...a];else delete m[it.id];save();return render();}
  case'study-unit':S.range=String(D.u);save();return startStudy();
  case'start-setrev':return startSetReview(D.d);
  case'start-setrev-all':return startSetReviewAll();
  case'start-wrong':return startWrong();
  case'start-cloze':return startCloze();
  case'start-fill':return openModal(fillLvHTML(D.d||''));
  /* 회원(앱 전용) */
  case'member-remove':return PE_IO.ask('아이디를 지울까요? 승인도 함께 없어지고 처음 화면으로 돌아가요.',()=>{flush();PE_IO.memberCall('remove').catch(e=>toast('지우지 못했어요: '+(e&&e.message||e)));});
  case'adm-reload':ADM=null;return render();
  case'adm-set':return admRun(PE_IO.memberCall('set',{uid:D.uid,status:D.s}),D.s==='approved'?D.id+' 님을 승인했어요':D.id+' 님의 승인을 막았어요');
  case'adm-del':return PE_IO.ask(`${D.id} 아이디를 지울까요? 그 휴대폰은 처음 화면으로 돌아가요.`,()=>admRun(PE_IO.memberCall('del',{uid:D.uid,id:D.id}),'지웠어요'));
  case'code-add':return admRun(PE_IO.memberCall('code-add').then(code=>{copy(code,'초대 코드 '+code+'를 만들고 복사했어요');}),'');
  case'code-del':return admRun(PE_IO.memberCall('code-del',{code:D.code}),'초대 코드를 지웠어요');
  case'code-copy':return copy(D.code,'초대 코드를 복사했어요');
  case'fill-lv':closeModal();if(D.v!=='mix'){S.fillLv=D.v;save();}return startFill(D.v,D.d||'');
  case'fill-check':return fillCheck(false);
  case'fill-giveup':return fillCheck(true);
  case'fill-accept':{const A=SES&&SES.answered,it=SES&&SES.items[SES.i];if(!A||A.all||A.accepted||!it)return;const key='F:'+it.id;if(A.prev)S.wrong[key]=A.prev;else delete S.wrong[key];rightOnWrong(key);
    const p=prog(it.id);p.ng=Math.max(0,p.ng-1);p.ok++;SES.stats.no--;SES.stats.ok++;A.accepted=true;save();return render();}
  case'start-stars':return startStars();
  case'start-mcq':return startMCQ();
  case'start-recall':return startRecall();
  case'start-outline':return startOutline();
  case'sess-flip':{if(e.target.closest('[data-act="star"]'))return;SES.back=!SES.back;if(SES.back)sessMarkRead(SES.items[SES.i]);return render();}
  case'sess-grade':{const it=SES.items[SES.i];const g=Number(D.g);const gd=SES.graded||(SES.graded={}),sn=SES.snap||(SES.snap={});const prev=gd[SES.i];
    if(prev!=null){if(prev===g)return sessAdvance();sessUngrade(it,sn[SES.i],prev);}else sn[SES.i]=sessSnap(it);
    grade(it.id,g);if(it.wrongKey&&g===2)rightOnWrong(it.wrongKey);SES.stats[gradeKey(g)]++;gd[SES.i]=g;sessMarkRead(it);
    if(g===0&&SES.requeue&&prev!==0)SES.items.push({type:'card',id:it.id});return sessAdvance();}
  case'sess-prev':return sessPrev();
  case'sess-pick':{if(SES.answered!=null)return;const it=SES.items[SES.i],k=Number(D.k);SES.answered=k;
    if(it.type==='mcq'){const ok=it.opts[k]===it.id;const p=prog(it.id);if(ok){p.ok++;SES.stats.ok++;rightOnWrong('C:'+it.id);}else{p.ng++;SES.stats.no++;markWrong('C:'+it.id,'card');}save();}
    else if(it.type==='quiz'){const q=SETS.sets[it.d].quiz[it.i];const ok=k===q.a;const key='Q:'+it.d+':'+it.i;const qp=S.qp[key]||(S.qp[key]={ok:0,ng:0});qp.last=todayStr();if(ok){qp.ok++;SES.stats.ok++;rightOnWrong(key);}else{qp.ng++;SES.stats.no++;markWrong(key,'quiz');}save();}
    return render();}
  case'sess-next':return sessAdvance();
  case'sess-self':{const it=SES.items[SES.i];const g=Number(D.g);
    if(it.type==='cloze'){const key='Z:'+it.id+':'+it.k;if(g===2){SES.stats.ok++;rightOnWrong(key);}else{SES.stats.no++;markWrong(key,'cloze');}}
    if(it.type==='outline'){const st=S.essayStat[it.id]||(S.essayStat[it.id]={good:0,weak:0});if(g===2){st.good++;SES.stats.ok++;}else{st.weak++;SES.stats.no++;}st.last=todayStr();save();}
    return sessAdvance();}
  case'sess-skip':return sessAdvance();
  case'sess-close':{const s=SES;if(s&&s.log)logTest(s.log,s.stats.ok+s.stats.mid+s.stats.no,s.stats.ok);const from=s&&s.from;SES=null;return nav(from?from.replace(/^#/,''):'today');}
  case'wrong-del':delete S.wrong[D.k];save();return render();
  /* 테스트·모의 */
  case'gen-mock':return genMock();
  case'kq':return kqModal(D.id);
  case'mock-reveal':SV['mk:'+D.d]=1;return render();
  case'mock-done':{const pr=S.mockp[D.d]||(S.mockp[D.d]={});pr[D.k]=b.checked;touchDay();const mk='mock:'+D.d+':'+D.k;if(b.checked)calMark(mk,'mock',`${D.d==='app'?'앱 모의고사':korDate(D.d)+' 모의고사'} ${({p1:'1교시',p2:'2교시',p3:'3교시',p4:'4교시'})[D.k]||''} 다 씀`);else calUnmark(mk);save();return;}
  case'copy-mock':{const m=D.d==='app'?appMockObj():SETS.mocks[D.d];return copy(promptWith('p9','(앱이 자동으로 채워 넣음)','\n'+mockText(m)),'채점 요청을 복사했어요');}
  case'copy-mock-q':{const m=D.d==='app'?appMockObj():SETS.mocks[D.d];return copy(mockText(m),'문제를 복사했어요');}
  case'copy-round':{const r=kichulRounds().find(x=>x.r===Number(D.r));return copy(promptWith('p9','(앱이 자동으로 채워 넣음)','\n'+roundText(r)),'채점 요청을 복사했어요');}
  case'copy-outline-req':{const q=kq()[D.id];return copy(`토목시공기술사 제${q.r}회 ${q.p}교시 ${q.n}번 "${q.t}"의 모범 답안 목차를 만들어라. 소제목 5~7개(각 소제목 아래 핵심 키워드 3개), 넣을 그림·표 1개, 현장 적용 사례 소제목 1개, 결론의 최신 경향 1줄. 마지막에 아래 JSON 한 줄도 출력: [{"t":"문제","o":["1. 개요","..."],"p":"포인트·그림","u":${q.u},"f":3}]`,'목차 요청을 복사했어요');}
  case'report':return copy(weeklyReport(),'주간 리포트를 복사했어요');
  /* 타이머 */
  case'timer-go':setPreset(D.p);return nav('timer');
  case'timer-preset':setPreset(D.p);return render();
  case'timer-custom':TM.custom=Math.max(1,Number(($('#tmCustom')||{}).value)||100);setPreset('custom');return render();
  case'timer-toggle':return TM.running?tPause():tStart();
  case'timer-reset':return tReset();
  /* 도구 */
  case'copy-prompt':{const p=PE_PROMPTS.find(x=>x.id===D.id);return copy(fillT(p.t),'프롬프트를 복사했어요');}
  case'imp-cards':{const arr=parseCards($('#impText').value);if(!arr.length)return toast('읽을 수 있는 카드가 없어요');const names=new Set(deck().map(c=>normTerm(c.t)));let n=0,sk=0;arr.forEach(c=>{const k=normTerm(c.t);if(names.has(k)){sk++;return;}S.userCards.push(c);names.add(k);n++;});save();invalidate();toast(`${n}장 추가${sk?`, 중복 ${sk}장 건너뜀`:''}`);return render();}
  case'imp-essays':{const arr=parseEssays($('#impText').value);if(!arr.length)return toast('논술 목차 JSON이 아니에요');const names=new Set(essays().map(x=>x.t));let n=0;arr.forEach(x=>{if(names.has(x.t))return;S.userEssays.push(x);n++;});save();invalidate();toast(`논술 목차 ${n}개 추가`);return render();}
  case'del-card':return PE_IO.ask('삭제할까요?',()=>{S.userCards=S.userCards.filter(c=>c.id!==D.id);save();invalidate();render();});
  case'unhide':S.hidden={};save();invalidate();toast('되돌렸어요');return render();
  case'fs':S.settings.fs=D.v;applyLook();save();return render();
  case'theme':S.settings.theme=D.v;applyLook();save();return render();
  case'gloss':S.settings.gloss=D.v==='off'?'off':'on';save();return render();
  case'save-settings':{const np=Number($('#sNew').value),du=($('#sData')||{}).value;S.settings.newPerDay=Math.min(60,Math.max(1,np||10));if(du!==undefined)S.settings.dataUrl=du.trim();save();toast('저장했어요');return render();}
  /* 시험 일정 */
  case'sch-save':{if(!SCH)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(SCH.start||''))return toast('준비 시작일을 확인하세요');S.settings.start=SCH.start;S.settings.target=SCH.target||'auto';SCH=null;recalcPlan();save();toast(repoPlanState()==='diff'?'시험 일정을 바꿨어요. 예약 작업에도 알려 주세요':'시험 일정을 바꿨어요');return render();}
  case'sch-cancel':SCH=null;return render();
  case'sch-copy':return copy(schReq(),'변경 요청을 복사했어요. Claude Code에 붙여 넣으세요');
  case'sch-round-set':{const r=Number($('#schRound').value),d=$('#schRoundDate').value;if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(d))return toast('회차와 날짜를 고르세요');S.settings.roundDates[r]=d;recalcPlan();save();toast(`제${r}회를 ${d}로 고쳤어요`);return render();}
  case'sch-round-reset':{const r=Number($('#schRound').value);if(!r)return;delete S.settings.roundDates[r];recalcPlan();save();toast(`제${r}회를 예상일로 되돌렸어요`);return render();}
  case'backup-copy':return copy(JSON.stringify({state:S,sets:SETS}),'백업을 복사했어요. 메모 앱에 붙여 두세요');
  case'backup-dl':{PE_IO.saveFile('gisulsa-backup-'+todayStr()+'.json',JSON.stringify({state:S,sets:SETS})).catch(()=>toast('파일로 저장하지 못했어요'));return;}
  case'restore':{let j,st;try{j=JSON.parse($('#restoreText').value);st=j.state||j;if(!st.settings||!st.cards)throw 0;}catch(err){return toast('백업 형식이 아니에요');}
    return PE_IO.ask('지금 기록을 덮어씁니다. 계속할까요?',()=>{try{S=Object.assign(fresh(),st);S.settings=Object.assign(fresh().settings,st.settings||{});if(!S.settings.roundDates)S.settings.roundDates={};S.v=2;if(j.sets)SETS=Object.assign({sets:{},mocks:{},kichul:null,index:null,plan:null},j.sets);recalcPlan();flush();invalidate();applyLook();toast('복원했어요');nav('today');}catch(err){toast('백업 형식이 아니에요');}});}
  case'reset':return PE_IO.ask('모든 학습 기록과 내 카드를 지웁니다. 초기화할까요?',()=>PE_IO.ask('마지막 확인: 백업을 복사해 두었나요?',()=>{S=fresh();SETS={sets:{},mocks:{},kichul:null,index:null,plan:null};recalcPlan();flush();invalidate();applyLook();nav('today');toast('초기화했어요');sync(true);}));
  }
});
document.addEventListener('change',e=>{if(e.target.id==='rangeSel'){S.range=e.target.value;save();render();}
  else if(e.target.id==='schStart'||e.target.id==='schTarget'){SCH=SCH||{start:S.settings.start,target:S.settings.target||'auto'};
    if(e.target.id==='schStart'){if(!e.target.value)return;SCH.start=e.target.value;if(SCH.target!=='auto'&&!eligibleRounds(SCH.start).some(x=>x.r===Number(SCH.target)))SCH.target='auto';}
    else SCH.target=e.target.value==='auto'?'auto':Number(e.target.value);render();}});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key!=='Enter'||!t.classList||!t.classList.contains('fill-in'))return;e.preventDefault();
  const all=Array.from(document.querySelectorAll('.fill-in'));const k=all.indexOf(t);if(k<all.length-1)all[k+1].focus();else fillCheck(false);});
$('#nav').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b){closeModal();nav(b.dataset.tab);}});
let calHid=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden){memoPause();calHid=Date.now();}if(!document.hidden){if(Date.now()-calHid>10*60000)calOpen();sync(false);if(!R.page)render();}});
window.addEventListener('online',()=>sync(true));

/* ════════ 23. 시작 ════════ */
PE_IO.init({toast});recalcPlan();applyLook();setPreset('essay');R=parseHash();
if(!location.hash)history.replaceState(null,'','#today');
calOpen();render();sync(true);
window.__pe={S:()=>S,SETS:()=>SETS,PLAN:()=>PLAN,SES:()=>SES,computePlan,roundList,sync,deck,essays,kq,clozeTokens,fillCands,fillBlanks,fillJudge,glNames,glIdx,glHTML,glStem,glForms,glLookup,glOpen,MEMO:()=>MEMO,memoTick,render,invalidate,startSession};
})();
