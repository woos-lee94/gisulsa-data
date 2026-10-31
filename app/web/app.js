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
const APP_VER='2.3.2';
const MOCK_GRADE_SINCE='YYYY-MM-DD';            /* v3.0.0을 내는 날(마지막 단계에서 채움). 이 날짜 전 모의고사는 "채점 받았어요"를 묻지 않는다 */
const BUDGET_DEF={wd:180,sat:300,sun:240};       /* 하루 공부 시간(분) 기본값: 평일·토요일·일요일과 공휴일(S.settings.budget, budgetOf) */
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
function fresh(){return{v:2,settings:{start:PLAN_START,target:'auto',roundDates:{},exam:'',mock:'',newPerDay:10,theme:'auto',fs:'m',dataUrl:'',budget:Object.assign({},BUDGET_DEF)},
  cards:{},userCards:[],userEssays:[],essayStat:{},checks:{},log:[],hidden:{},daily:{},lastMock:null,created:todayStr(),
  sp:{},qp:{},wrong:{},sync:{},mockp:{},cal:{},resume:{},
  tk:{},today:null,wk:{}};}   /* tk 할 일 id → 한 날, today 그날 고정한 오늘 몫, wk 주마다 기록(줄인 목표·지난주 점수) */
function load(){try{const r=PE_IO.get(KEY);if(r){const s=JSON.parse(r);const f=fresh();for(const k in f){if(s[k]===undefined||s[k]===null&&k!=='lastMock')s[k]=f[k];}s.settings=Object.assign({},f.settings,s.settings||{});if(!s.settings.roundDates||typeof s.settings.roundDates!=='object')s.settings.roundDates={};if(!s.settings.target)s.settings.target='auto';s.v=2;return s;}}catch(e){}return fresh();}
function loadSets(){try{const r=PE_IO.get(SKEY);if(r){const o=JSON.parse(r);return Object.assign({sets:{},mocks:{},kichul:null,index:null,plan:null},o);}}catch(e){}return{sets:{},mocks:{},kichul:null,index:null,plan:null};}
let S=load(); let SETS=loadSets();
let saveT=null,saveT2=null,PLN=0;   /* PLN: 기록이 바뀔 때마다 올린다(오늘 몫·이번 주 계산은 한 번 그리는 동안만 기억, pm) */
function save(){PLN++;clearTimeout(saveT);saveT=setTimeout(()=>{try{PE_IO.set(KEY,JSON.stringify(S));}catch(e){toast('저장 공간이 부족해요. 더보기 → 백업에서 정리하세요');}},60);}
function saveSets(){PLN++;clearTimeout(saveT2);saveT2=setTimeout(()=>{try{PE_IO.set(SKEY,JSON.stringify(SETS));}catch(e){toast('세트 저장 공간이 부족해요');}},60);}
function flush(){PLN++;clearTimeout(saveT);clearTimeout(saveT2);try{PE_IO.set(KEY,JSON.stringify(S));PE_IO.set(SKEY,JSON.stringify(SETS));}catch(e){}}
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
function recalcPlan(){PLN++;PLAN=computePlan(S.settings.start,S.settings.target);S.settings.exam=PLAN.target.d;S.settings.mock=PLAN.mock?PLAN.mock.d:'';}
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
function invalidate(){PLN++;_deck=_byId=_byNorm=_kxRev=_essays=null;_kq=null;_lex=null;_gl=null;_gq={};}
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
  if(a[0]==='G'){const L=gqList(a[1]),n=Number(a[2]),q=L&&L.sig===a[3]&&L.items[n];return q?{type:'gq',d:a[1],n,key,label:(q.q+(q.t?' '+q.t.replace('{_}','(　)'):'')).slice(0,90)}:null;}
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
  if(all){SES.stats.ok++;p.ok++;rightOnWrong(key);}else{SES.stats.no++;p.ng++;markWrong(key,'fill');sessMiss(c.id);}
  SES.answered={vals,res,all,prev};sessDid();render();}

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
/* 세트 진행에 처음 쓰는 순간(세트 열기·넘겨 보기·가리며 외우기·용어 퀴즈·숙제 어느 것이든) 1·3·7·14·30일 세트 복습 시계가 돈다. 화면 그리기는 spGet만 쓴다 */
function sp(d){const p=S.sp[d]||(S.sp[d]={read:{},quiz:{},tasks:{},essay:{},rev:{}});if(!p.first){p.first=todayStr();save();}return p;}
function spGet(d){return S.sp[d]||{read:{},quiz:{},tasks:{},essay:{},rev:{}};}
/* nt·td: 세트 숙제(hwItems) 수와 다 한 수. core: 핵심(용어 읽기 + 세트 퀴즈, 논술 실전이 필수인 2단계는 + 논술) */
function setStatus(d){const s=SETS.sets[d];if(!s)return null;const p=spGet(d);const nc=(s.cards||[]).length,nq=(s.quiz||[]).length,hs=hwSum(d),nt=hs.n,td=hs.done;
  const read=Object.keys(p.read||{}).length,qa=Object.keys(p.quiz||{}).length,qok=Object.values(p.quiz||{}).filter(v=>v&&v.ok).length,ed=!!(p.essay&&p.essay.done);
  const done=read>=nc&&qa>=nq&&(ed||!s.essay)&&td>=nt,core=read>=nc&&qa>=nq&&(ed||!s.essay||!hwMin(d).ew);return{nc,nq,nt,read,qa,qok,td,ed,done,core};}
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
/* 주소는 늘 바꿔 쓴다(location.replace): 방문 기록이 쌓이지 않아 끝난 세션·외우기의 빈 화면이 기록에 남지 않는다(앱의 기기 뒤로 가기 몸짓은 끄고 왼쪽 가장자리 밀기를 여기서 받는다).
   위로(위쪽 뒤로·닫기, 가장자리 밀기)는 goUp: 들어온 곳(RET) → 정해 둔 부모(PARENT). 탭은 goTab: 그 탭 첫 화면으로 바꿔 쓰고 RET를 비운다.
   주소가 바뀌면 route(): 창을 닫고, SES 없는 #sess·MEMO 없는 #memo는 위로, 모르는 주소는 오늘로 바꿔 쓰고, #set/날짜/탭은 #set/날짜로 맞춘 뒤 그린다. 주소는 앞의 # 없이 nh()로 한 꼴로 쓴다 */
const TABS=['today','review','study','test','more'],TAB_ALIAS={};
const PARENT={set:'today',cal:'today',week:'today',mock:'test',kichul:'test',dandap:'test',stats:'test',archive:'review',wrong:'review',
  guide:'more',timer:'more',plan:'more',schedule:'more',settings:'more',backup:'more',about:'more',prompts:'more',imp:'more',admin:'more'};
const PAGES={set:vSet,sess:vSess,memo:vMemo,cal:vCal,dandap:vDandap,kichul:vKichul,mock:vMock,guide:vGuide,admin:vAdmin,plan:vPlan,schedule:vSchedule,timer:vTimer,prompts:vPrompts,imp:vImport,settings:vSettings,backup:vBackup,about:vAbout,archive:vArchive,wrong:vWrong,stats:vStats};
const UP_LABEL={today:'오늘',review:'복습',study:'암기',test:'테스트',more:'더보기',set:'세트',kichul:'기출','kichul/u':'단원별',mock:'모의고사',cal:'달력'};
const SET_TABS=['cards','quiz','essay','tasks'];
let R={tab:'today',page:null,a:null,b:null},RET={},FLOW=null;   /* RET: 화면 → 들어온 주소. FLOW: 오늘 화면의 줄이 연 흐름 {id, from, at} */
let SES=null;
const nh=h=>{h=String(h||'');try{h=decodeURIComponent(h);}catch(e){}return h.replace(/^#\/?/,'');};
const curH=()=>nh(location.hash)||'today';
const isTab=h=>{const p=nh(h).split('/')[0];return TABS.includes(p)||!!TAB_ALIAS[p];};
const tabKey=h=>{const p=nh(h).split('/')[0];return TAB_ALIAS[p]||p;};
const hashR=h=>{const p=nh(h).split('/');return{page:p[0],a:p[1]||null,b:p[2]||null};};
function retOk(h,page){const p=nh(h).split('/')[0];return!!h&&p!==page&&!(p==='sess'&&!SES)&&!(p==='memo'&&!MEMO);}
/* 위 화면: 세션·외우기는 연 곳, 기출 회차·단원은 그 목록, 그 밖은 들어온 곳 → 부모. SES·MEMO가 없어도 오류 없이 오늘.
   세션·외우기의 연 곳이 자기 자신(#sess·#memo)이면 오늘: 닫기·밀기가 같은 화면을 다시 그리기만 하지 않게 */
function upOf(r){r=r||R;
  if(r.page==='sess'||r.page==='memo'){const f=nh(r.page==='sess'?SES&&SES.from:MEMO&&MEMO.from);return f&&f.split('/')[0]!==r.page?f:'today';}
  if(r.page==='kichul'&&r.b)return r.a==='u'?'kichul/u':'kichul';
  const ret=nh(RET[r.page]);return retOk(ret,r.page)?ret:(PARENT[r.page]||'today');}
/* h에서 위로 올라가다 page를 만나면(앞 화면으로 되돌아가는 링크) 그 화면의 RET를 그대로 둔다: 뒤로가 두 화면 사이를 맴돌지 않게 */
function upHas(h,page){for(let k=0;k<6&&h&&!isTab(h);k++){h=upOf(hashR(h));if(nh(h).split('/')[0]===page)return true;}return false;}
/* 아래 탭 강조: 흐름을 시작한 탭(세션·외우기는 연 곳, 화면은 들어온 곳 → 부모를 따라 올라간다) */
function tabOf(h,k){h=nh(h)||'today';k=k||0;const p=h.split('/')[0];
  if(TABS.includes(p))return p;if(TAB_ALIAS[p])return TAB_ALIAS[p];if(k>5)return'today';
  if(p==='sess')return tabOf(SES&&SES.from,k+1);if(p==='memo')return tabOf(MEMO&&MEMO.from,k+1);
  const ret=nh(RET[p]);return tabOf(retOk(ret,p)?ret:(PARENT[p]||'today'),k+1);}
const upLabel=h=>{h=nh(h);return UP_LABEL[h]||UP_LABEL[h.split('/')[0]]||'뒤로';};
function parseHash(){const h=curH(),p=h.split('/');const r={tab:'today',page:null,a:p[1]||null,b:p[2]||null};
  if(isTab(p[0]))r.tab=tabKey(p[0]);else if(PAGES[p[0]]){r.page=p[0];r.tab=tabOf(h);}return r;}
/* 집중 모드: 세션·가리며 외우기, 타이머가 도는 그 모의고사(아래 탭을 숨기고 위쪽은 "닫기") */
const isFocus=()=>R.page==='sess'||R.page==='memo'||(R.page==='mock'&&TM.running&&!!TM.ctx&&TM.ctx.D===R.a);
/* 빈 흐름: SES 없는 #sess, MEMO 없는 #memo. 그리지 않고 위로 보낸다 */
const flowGone=r=>(r.page==='sess'&&!SES)||(r.page==='memo'&&!MEMO);
/* 같은 주소면 다시 그리기만 한다(세션 → 세션, 외우기 안의 외우기). 그 주소가 빈 흐름이면 위로(바꿔 쓰지 않아 route()를 거치지 않는 길에도 빈 화면을 막는다) */
function rep(h){h=nh(h)||'today';if(curH()===h){R=parseHash();return flowGone(R)?hop(upOf(R)):render();}location.replace('#'+h);}
function hop(h){h=nh(h)||'today';return isTab(h)?goTab(tabKey(h)):rep(h);}
/* 앞으로: 탭 주소는 goTab, 그 밖은 들어온 곳을 RET에 적고 바꿔 쓴다(o.from: 들어온 곳을 따로 줄 때) */
function nav(h,o){o=o||{};closeModal();h=nh(h)||'today';if(isTab(h))return goTab(tabKey(h));
  const p=h.split('/')[0],from=nh(o.from)||curH();if(p!=='sess'&&p!=='memo'&&from.split('/')[0]!==p&&!upHas(from,p))RET[p]=from;
  rep(h);}
/* 위로: 뒤로·닫기·가장자리 밀기. 세션·외우기는 지우지 않는다(이어서 할 수 있게). 외우기 안에서 연 외우기는 바깥 외우기로(T5) */
function goUp(up){closeModal();
  if(!up&&R.page==='memo'&&MEMO&&MEMO.outer){const o=MEMO.outer;memoStop();MEMO=o;return render();}
  hop(up||upOf(R));}
/* 탭: 그 탭 첫 화면으로 바꿔 쓴다(탭이 쌓이지 않음). 지금 탭을 다시 누르면 맨 위로 */
function goTab(tab){closeModal();tab=tabKey(tab);if(!TABS.includes(tab))tab='today';FLOW=null;RET={};
  if(curH()===tab){R=parseHash();render();return window.scrollTo(0,0);}
  location.replace('#'+tab);}
/* 흐름을 다른 화면에서 시작하면 오늘 줄의 흐름(FLOW)을 놓는다 */
function flowKeep(o){if(!(o&&o.keepFlow)&&!(FLOW&&curH()===FLOW.at))FLOW=null;}
function route(){closeModal();
  try{R=parseHash();
    if(flowGone(R))return hop(upOf(R));
    if(!R.page&&!isTab(curH()))return goTab('today');
    if(R.page==='set'&&R.b){if(SET_TABS.includes(R.b))SV[R.a]=R.b;return rep('set/'+R.a);}
  }catch(e){console.error(e);R=parseHash();}
  if(R.page!=='memo')memoStop();render();window.scrollTo(0,0);}
window.addEventListener('hashchange',route);
const kbEl=t=>!!t&&(t.tagName==='TEXTAREA'||t.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|reset|range|color|file|image)$/i.test(t.type||''));
function render(){PLN++;R=parseHash();document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===R.tab));
  if(!R.page&&R.tab==='today')FLOW=null;document.body.classList.toggle('focus',isFocus());
  const v=$('#view');let html='';
  try{
    if(!R.page)html=({today:vToday,review:vReview,study:vStudy,test:vTest,more:vMore}[R.tab]||vToday)();
    else html=(PAGES[R.page]||vToday)();
  }catch(e){html=`<div class="empty" style="margin-top:24px"><b>화면을 그리는 중 오류가 났어요</b>${esc(e.message)}</div>`;console.error(e);}
  v.innerHTML=html;document.body.classList.toggle('kb',kbEl(document.activeElement));paintNavBadges();paintPill();if(R.page==='timer')paintTimer();if(R.page==='memo')paintMemo();
  if(R.page==='sess'&&SES&&!SES.answered&&SES.items[SES.i]&&SES.items[SES.i].type==='fill'){const f=v.querySelector('.fill-in');if(f)try{f.focus({preventScroll:true});}catch(e){}}}
function softRender(){if(R.page==='sess')return paintNavBadges();if(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return paintNavBadges();render();}
function paintNavBadges(){const rv=dueSetReviews().length+(Object.keys(S.wrong).length?1:0);const b=document.querySelector('#nav button[data-tab="review"]');if(b){let nb=b.querySelector('.nb');const n=dueSetReviews().length;if(n){if(!nb){nb=document.createElement('span');nb.className='nb';b.appendChild(nb);}nb.textContent=n;}else if(nb)nb.remove();}}
/* 위쪽 막대: 왼쪽은 올라갈 곳 이름(오늘·세트·더보기…, 그 밖은 "뒤로"), 집중 모드에서는 "닫기" */
const topbar=(title)=>`<div class="topbar"><button class="back" data-act="back">${isFocus()?'닫기':icon('back')+esc(upLabel(upOf(R)))}</button><div class="ttl">${esc(title)}</div></div>`;
const sec=(title,meta,body)=>`<section class="sec"><div class="sec-h"><h2>${esc(title)}</h2>${meta?`<span class="meta">${meta}</span>`:''}</div>${body}</section>`;
function row(o){const tag=o.act?'button':'div';const attrs=o.act?` data-act="${o.act}"${o.data?Object.keys(o.data).map(k=>` data-${k}="${esc(o.data[k])}"`).join(''):''}`:'';
  return`<${tag} class="row${o.ic?'':' noic'}"${attrs}>${o.ic?`<span class="ic ${o.tone||''}">${icon(o.ic)}</span>`:''}<span class="tx"><span class="tt">${o.t}</span>${o.d?`<span class="ds">${o.d}</span>`:''}</span>${o.v!=null?`<span class="val${o.zero?' zero':''}">${o.v}</span>`:''}${o.badge?o.badge:''}${o.act?'<span class="chev"></span>':''}</${tag}>`;}

/* ════════ 11-0. 오늘 몫·이번 주 ════════ */
/* 오늘 몫(그날 할 일을 남은 시간 안에서 고른 목록)과 이번 주(월~일 약속·남은 필수·점수)를 앱이 이미 쓰는 기록으로 계산한다.
   taskList·dayPlan·weekBoard는 읽기만 한다(sp()를 부르지 않아 세트 복습 시계가 돌지 않음). 쓰는 것은 planToday(S.today: 그날 고정한 목록,
   S.wk[주].cut·cph: 줄인 목표)와 weekSnap(S.wk[지난주]: 지난주 기록)뿐. 분은 모두 MIN_PER 한 표에서 센다 */
const PLAN_V=1;                                   /* 계획 규칙을 바꾸면 올린다(예전 S.today를 새로 짠다) */
const DAY_END=23*60+30,WD_WIN={am:9*60+30,noon:19*60,eve:23*60};   /* 자정부터 분. 평일 블록은 이 시각에 끝난다 */
const MIN_PER={read:1,quiz:1,say:.5,write:3,dd:15,eo:5,qz:2,sl:5,essay:30,fg:2,revItem:.5,card:.5,wrong:1,
  gq:5,p1:100,essayQ:25,essayPart:100,grade:30,report:10,kichul:20,book:60,dd2:15,outline3:10,outline5:15,
  goal:20,backup:2,redo:25,fix:30,rot50:25,rot30:15,kit:10};
/* 세트 복습 한 번 = ceil(revItem × 항목 수)(카드 10 + 퀴즈 5 → 8분), 모의 논술 교시 = 6문 미만이면 essayQ × 문항, 6문이면 essayPart */
/* 오늘 몫에서 연 숙제 카드의 "이렇게 해요" 세 단계: [글, 버튼 동작, 버튼 글] */
const HW_STEPS={dd:[['답안지 모양 보기 (1분)','dandap','답안지'],['덮고 실제 답안지에 10분 쓰기','timer1','타이머 10분'],['사진 찍어 첨삭 요청 붙여 넣기','copy-dd','첨삭 요청 복사']],
  write:[['카드를 보며 정의 2줄·키워드 5개 읽기','set-flash','카드 넘겨 보기'],['덮고 답안지에 정의와 키워드 쓰기'],['카드를 펴서 빠진 곳만 빨간 펜으로']],
  say:[['30초 안에 정의 → 원리 → 특징 → 유의사항'],['막히면 카드를 보고 한 번 더','set-flash','카드 넘겨 보기'],['아침·점심·저녁에 나눠 하기']],
  eo:[['1번째: 모범 목차를 보며 옮겨 적기','essay','모범 목차 보기'],['2번째: 소리 내어 읽으며 적기'],['3번째부터: 덮고 적은 뒤 빨간 펜']],
  qz:[['틀린 문제의 해설 2번 소리 내어 읽기'],['왜 틀렸는지 한 줄 쓰기'],['같은 함정은 오답 노트에서 다시 만나요']],
  sl:[['오늘 용어 제목만 보기'],['정의를 머릿속으로 떠올리기'],['막힌 것은 내일 카드 복습에 나와요']]};
/* 날의 종류마다 블록(보이는 순서). pin은 날짜가 정해진 일(원서접수·48시간 복기)로 맨 위 */
const PLAN_BLOCKS={wd:['pin','am','noon','eve','bed'],pre3:['pin','am','noon','eve','bed'],holi:['pin','am','noon','eve','catch','bed'],sat:['pin','p1','p2','p3','p4','grade','catch'],sun:['pin','core','p3','p4','hand','flush','close'],exam:['pin','ex']};
const PLAN_BLK={am:'아침·출근길 · 휴대폰',noon:'점심·퇴근길 · 휴대폰',eve:'저녁 · 책상·답안지',bed:'자기 전 · 불 끄기 전',catch:'따라잡기 · 책상',p1:'1교시 단답 · 100분',p2:'2교시 논술',p3:'3교시 논술',p4:'4교시 논술',grade:'채점 · 30분',core:'밀린 핵심',hand:'손글씨 몫 · 책상·답안지',flush:'복습 비우기 · 휴대폰',close:'주간 마감',ex:'시험'};
/* 손글씨 몫(이번 주 세트의 필수 칸): [몫 이름, 단위, MIN_PER 키, hwParts 키], 단계별 순서, 이번 주 줄 [이름, 줄 번호] */
const QK={dd:['단답 손글씨','문','dd','dd'],eo:['논술 목차 옮겨 적기','번','eo','eo'],w:['새 용어 안 보고 쓰기','개','write','write'],essay:['논술 실전','편','essay','essay'],redo:['모의 오답 다시 쓰기','편','redo',null],fg:['그림·표 그리기','번','fg','fg']};
const QORD={1:['dd','eo','w'],2:['essay','dd','eo','w'],3:['redo','dd','fg'],4:['redo','dd']};
const QLINE={dd:['단답 손글씨',3],eo:['논술 목차 옮겨 적기',4],w:['새 용어 안 보고 쓰기',5],essay:['논술 실전 25분',8],redo:['모의 오답 다시 쓰기',9],fg:['그림·표 그리기',10]};
/* 메모리만(S에 두지 않음): later 나중에 미룬 줄, open 펼친 칸, act 다음 오늘 화면에서 펼칠 줄, d 그 날짜(날이 바뀌면 비움) */
const UI={later:{},open:{},act:null,d:null};
/* 한 번 그리는 동안만 기억(save()·render()마다 PLN이 올라 새로 센다) */
let _pmk=-1,_pmc={};function pm(key,f){if(_pmk!==PLN){_pmk=PLN;_pmc={};}return key in _pmc?_pmc[key]:(_pmc[key]=f());}
/* 날의 종류: exam 시험 날(본시험·실전 모의), pre3 시험 날 전 평일 3일, holi 평일 공휴일, 그 밖은 wd·sat·sun */
function dayKind(t){const ex=[PLAN.target&&PLAN.target.d,PLAN.mock&&PLAN.mock.d].filter(Boolean);if(ex.includes(t))return'exam';const k=dayType(t);
  if(k==='wd'&&ex.some(e=>{let d=e;for(let n=0;n<3;){d=addDays(d,-1);if(dayType(d)!=='wd')continue;if(d===t)return true;n++;}return false;}))return'pre3';
  return k==='wd'&&KR_HOLI[t]?'holi':k;}
/* 그날 공부 시간(분). 일요일·공휴일은 sun, 시험 전 3일은 평일, 시험 날 0, 전교시 리허설 토요일은 430분 이상. 저장값이 숫자가 아니면 기본값 */
function budgetOf(t,kind){kind=kind||dayKind(t);if(kind==='exam')return 0;
  const B=Object.assign({},BUDGET_DEF,S.settings.budget||{}),k={wd:'wd',pre3:'wd',holi:'sun',sat:'sat',sun:'sun'}[kind]||'wd';
  let v=Number(B[k])||BUDGET_DEF[k];if(kind==='sat'&&weekObj(weekIndex(t)).pre)v=Math.max(v,430);return v;}
const wkStart=t=>addDays(t,-((parse(t).getDay()+6)%7)),wkEnd=t=>addDays(wkStart(t),6);   /* 주는 달력의 월~일 */
const dlab=d=>md(d)+'('+DAYK[parse(d).getDay()]+')';
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
const hmOf=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const isStudy=k=>k==='wd'||k==='pre3'||k==='holi';
const weekMock=t=>Object.keys(SETS.mocks).filter(D=>/^\d{4}-\d\d-\d\d$/.test(D)&&D>=wkStart(t)&&D<=t).sort().pop()||null;
const mockParts=m=>['p1','p2','p3','p4'].filter(k=>m&&Array.isArray(m[k])&&m[k].length);
const mockMin=(m,k)=>k==='p1'?MIN_PER.p1:m[k].length<6?MIN_PER.essayQ*m[k].length:MIN_PER.essayPart;
const exWeek=t=>{const W=wkStart(t),E=addDays(W,6);return[PLAN.mock&&PLAN.mock.d,PLAN.target&&PLAN.target.d].some(d=>d&&d>=W&&d<=E);};
const redoDone=W=>Object.keys(S.tk||{}).filter(k=>{const m=/^x\.redo:(\d{4}-\d\d-\d\d)(:\d+)?$/.exec(k);return m&&m[1]>=W&&m[1]<=addDays(W,6);}).length;
const revMin=d=>{const s=SETS.sets[d];return Math.ceil(MIN_PER.revItem*(s?(s.cards||[]).length+(s.quiz||[]).length:15));};
/* 아직 오지 않은 이번 주 모의의 어림(분, 채점 30 포함). pipeline/tool.py mock_format과 같은 규칙(주차 틀 번호·리허설·실제 시험 날짜) */
function estMock(w){const r=weekRange(w),inW=d=>!!d&&d>=r[0]&&d<=r[1];
  if(inW(PLAN.mock&&PLAN.mock.d)||inW(PLAN.target.d)||w>=PLAN.E)return 0;
  if(w<=0)return 130;const m=weekObj(w),t=m.tpl;if(m.pre)return 430;
  if(t<=10)return 180;if([11,12,16,25].includes(t))return 130;if([13,14,15,17,26].includes(t))return 230;
  if((t>=18&&t<=24)||t===27)return 430;if(t===28)return 130;return 0;}
/* 세트 숙제의 필수 칸 수(그 세트 주차의 단계, PE_HW 횟수보다 크지 않게) */
function hwMin(d){const s=SETS.sets[d],w=s&&s.week!=null?s.week:weekIndex(d),R=hwRule(d),M=Object.assign({},PE_HW_MIN[1],PE_HW_MIN[phaseObj(w).id]||{});for(const k in M)M[k]=Math.min(M[k],R[k]||0);return M;}
/* 세트 숙제를 할 일 단위로: n 필수 칸, N 학원 횟수 칸, k·K 한 칸(필수·전체까지만), u 칸당 분, f·F 낱말마다 필수·전체 횟수.
   restMin: 오늘 몫 밖의 나머지(복습 용어·그림·앞글자·세트만의 과제. 실전 쓰기는 essay 한 줄이 갖는다). 시험 전 3일 세트는 숙제가 없다 */
function hwParts(d){return pm('h'+d,()=>{const o={restMin:0};if(!SETS.sets[d]||dayKind(d)==='pre3')return o;
  const its=hwItems(d),H=spGet(d).hw||{},M=hwMin(d),R=hwRule(d),f=k=>its.find(x=>x.key===k),cnt=(ks,c)=>ks.reduce((a,k)=>a+Math.min(H[k]||0,c),0);
  const part=(ks,m,r,u,x)=>Object.assign({u,n:ks.length*m,N:ks.length*r,k:cnt(ks,m),K:cnt(ks,r),f:m,F:r,ks},x);
  const fr=f('fresh');if(fr){const ws=[],ss=[];fr.rows.forEach(r=>r.c.forEach(c=>(c[0][0]==='w'?ws:ss).push(c[0])));
    if(ws.length&&M.w)o.write=part(ws,M.w,R.w,MIN_PER.write,{terms:ws.length});if(ss.length&&M.s)o.say=part(ss,M.s,R.s,MIN_PER.say,{terms:ss.length});}
  const dd=f('dd');if(dd&&M.dd){const rs=dd.rows.slice(0,M.dd);o.dd=part(rs.map(r=>r.c[0][0]),1,1,MIN_PER.dd,{ids:rs.map(r=>r.go)});}
  const eo=f('eo');if(eo&&M.eo)o.eo=part(['eo'],M.eo,R.eo,MIN_PER.eo);
  const fg=f('fg');if(fg&&M.fg)o.fg=part(['fg'],M.fg,R.fg,MIN_PER.fg);
  const qz=f('qz');if(qz&&!qz.pending&&qz.rows&&qz.rows.length)o.qz=part(qz.rows.map(r=>r.c[0][0]),1,1,MIN_PER.qz);
  const sl=f('sl');if(sl)o.sl=part(['sl'],1,1,MIN_PER.sl);
  const ew=f('ew');if(ew)o.essay={u:MIN_PER.essay,n:M.ew?1:0,N:1,k:ew.done?1:0,K:ew.done?1:0,req:!!M.ew};
  o.restMin=its.filter(x=>!x.done&&(x.key==='rev'||x.key==='mn'||x.key==='fg'&&!o.fg||x.key==='x'&&!figDup(d,x.task))).reduce((a,x)=>a+x.min,0);
  return o;});}
/* 이 세트의 숙제 필수(③ 숙제 a/b): 말하기·쓰기·단답·목차·틀린 이유(퀴즈를 다 풀고 틀린 것이 있을 때)·자기 전·그림·표(3단계)·논술 실전(2단계) */
function reqParts(d){const P=hwParts(d);return[['say','말하기'],['write','쓰기'],['dd','단답'],['eo','목차'],['qz','틀린 이유'],['sl','자기 전'],['fg','그림·표'],['essay','논술 실전']]
  .filter(([k])=>P[k]&&P[k].n).map(([k,t])=>({k,t,a:Math.min(P[k].k,P[k].n),n:P[k].n,done:P[k].k>=P[k].n}));}
/* 세트 핵심(용어 읽기 + 세트 퀴즈): r·q 남은 수, gap 남은 분, ok 다 함 */
function setCore(d){return pm('c'+d,()=>{const st=setStatus(d);if(!st)return null;const r=Math.max(0,st.nc-st.read),q=Math.max(0,st.nq-st.qa);return{st,r,q,gap:r*MIN_PER.read+q*MIN_PER.quiz,ok:!r&&!q};});}
/* 세트만의 과제가 논술 그림과 같은 그림이면(그리기 낱말 + 그림 설명과 낱말 3개 이상 같음) 그림·표 숙제 하나로 친다 */
function figDup(d,i){const s=SETS.sets[d],x=s&&(s.tasks||[])[i],fg=s&&s.essay&&s.essay.fig;if(!x||!fg||!/그리|그림|그려|도$/.test(x))return false;
  const ws=v=>new Set(String(v).split(/[^가-힣A-Za-z0-9]+/).map(glStem).filter(w=>w.length>=2)),b=ws(fg);let n=0;ws(x).forEach(w=>{if(b.has(w))n++;});return n>=3;}
/* 세트 복습 후보: 1·3일 차 먼저, 그다음 기한(처음 연 날 + 단계) 순, 같으면 단계 순. 평일은 1·3일 차 앞 2개만 필수, 토요일은 1·3일 차 필수, 일요일은 모두 필수 */
function revCands(t,kind){kind=kind||dayKind(t);let nreq=0;
  return dueSetReviews().map(x=>Object.assign({due:addDays(spGet(x.d).first,x.step)},x)).sort((a,b)=>(a.step>3)-(b.step>3)||(a.due<b.due?-1:a.due>b.due?1:a.step-b.step)).map((x,i)=>{
    const e=x.step<=3,o={id:'rev:'+x.d+':'+x.step,k:'rev',d:x.d,step:x.step,due:x.due,min:revMin(x.d),roll:'다시 나와요',o:40+i/100,label:`세트 복습 ${dlab(x.d)} ${x.step}일 차`,sub:''};
    if(kind==='sat')return Object.assign(o,{need:e?'필수':'권장',p:e?3:5,blk:'catch',o:(e?40:80)+i/100});if(kind==='sun')return Object.assign(o,e?{need:'필수',p:3,blk:'core'}:{need:'필수',p:5,blk:'flush',o:10+i/100});
    if(e&&nreq<2){nreq++;return Object.assign(o,{need:'필수',p:3,blk:'am',o:20+i/100});}return Object.assign(o,{need:'권장',p:5,blk:'am',o:25+i/100,fold:1});});}
/* 카드 복습에 나올 카드(복습·연습·오늘 같은 수): 간격이 돌아온 카드 − 오늘 계획한 세트 복습의 카드 − 오늘 이미 매긴 카드 */
function cardsOut(t){t=t||todayStr();const F=S.today&&S.today.d===t?S.today:null,ds=F?F.rows.filter(r=>/^rev:/.test(r.id)).map(r=>r.id.split(':')[1]):revCands(t).filter(x=>x.need==='필수').map(x=>x.d),sk=new Set();
  ds.forEach(d=>setIds(d).forEach(id=>sk.add(id)));return dueCards(null).filter(c=>!sk.has(c.id)&&pget(c.id).last!==t);}
const planRevCards=t=>{const F=S.today&&S.today.d===t?S.today:null;return F?uniq([].concat(...F.rows.filter(r=>/^rev:/.test(r.id)).map(r=>setIds(r.id.split(':')[1])))):[];};
/* 단계가 바뀐 주(그 주 동안, 지울 때까지): PE_PHASE_NOTE 한 줄 */
function phaseStart(t){const w=weekIndex(t);if(w<1||w>PLAN.E)return null;const id=phaseObj(w).id;if(id===phaseObj(w-1).id||!PE_PHASE_NOTE[id]||(S.tk||{})['phase:'+id])return null;return{id,w,text:PE_PHASE_NOTE[id]};}
/* 자동으로 끝을 아는 단계 할 일(PE_EXTRA auto) */
function extraDone(x,id,t,W,D){const tk=S.tk||{},a=x.auto;
  if(a==='outline3'||a==='outline5')return Object.values(S.essayStat||{}).filter(s=>s&&s.last===t).length>=(a==='outline3'?3:5);
  if(a==='cloze10')return(S.log||[]).filter(l=>l.d===t&&l.type==='cloze').reduce((s,l)=>s+(l.total||0),0)>=10;
  if(a==='graded50'||a==='graded30')return((S.daily[t]||{}).graded||0)>=(a==='graded50'?50:30);
  if(a==='kichul')return!!tk['kichul:'+W];if(a==='budget')return!!tk.budget;
  if(a==='score'){const sc=D&&(S.mockp[D]||{}).sc;return!!sc&&Object.values(sc).some(v=>typeof v==='number');}
  if(x.k==='goal')return!!tk[id]||Object.keys(tk).some(k=>k.indexOf('goal:'+W+':')===0&&tk[k]===t);
  return!!tk[id];}
/* 오늘 할 수 있는 일 전부(끝난 것도 done으로). 읽기만 한다. 줄 {id, k 종류, need 필수·권장·여유, p 우선순위 0~7, blk 블록, o 블록 안 순서, min 남은 분,
   roll 못 하면, fold 시간이 되면에만, info 안내, onlyWeek 이번 주 줄에만, always 늘 넣음, hw 숙제 칸(필수·전체 목표), quota 주말 손글씨 몫} */
function taskList(t){t=t||todayStr();return pm('t'+t,()=>taskCalc(t));}
function taskCalc(t){const w=weekIndex(t),kind=dayKind(t),W=wkStart(t),dw=parse(t).getDay(),T=[],tk=S.tk||{},wkend=kind==='sat'||kind==='sun',study=isStudy(kind),pre=kind==='pre3',ph=phaseObj(w).id,cp=Math.max(1,ph),chk=exWeek(t)||ph===5;
  const mk=o=>{const x=Object.assign({need:'필수',p:6,o:50,blk:null,min:0,roll:'일요일까지',label:'',sub:''},o);T.push(x);return x;};
  if(w<0||t>PLAN.target.d)return T;
  /* P0: 원서접수(접수 7일 전~접수 끝), 접수 날짜 확인(21~8일 전, 이번 주 줄), 48시간 복기, 시행계획 공고(시험 전해 11/20~12/31, 이번 주 줄) */
  const rounds=[PLAN.mock,PLAN.target].filter(Boolean);
  rounds.forEach(x=>{const ap=addDays(x.d,-PE_SCHED.annBefore),ae=addDays(ap,3),re=addDays(x.d,2);
    if(t>=addDays(ap,-7)&&t<=ae)mk({id:'apply:'+x.r,k:'apply',r:x.r,p:0,blk:'pin',o:0,always:1,label:`큐넷 원서접수 · 제${x.r}회`,sub:`${dlab(ap)}~${dlab(ae)}${x.est?' 예상':''} · 첫날 오전 10시`,min:15,roll:t<ap?'D-'+diffDays(t,ap):'접수 기간',to:'schedule',done:!!tk['apply:'+x.r]});
    else if(t>=addDays(ap,-21)&&t<addDays(ap,-7)&&!tk['applychk:'+x.r])mk({id:'applychk:'+x.r,k:'applychk',r:x.r,need:'권장',onlyWeek:1,label:`원서접수 날짜 확인 · ${md(ap)} 무렵`,min:5,roll:'',to:'schedule'});
    if(t>x.d&&t<=re)mk({id:'recap:'+x.r,k:'recap',r:x.r,p:0,blk:'pin',o:1,always:1,label:`제${x.r}회 복기: 문제 모두 적기 → 4문제 다시 써서 채점(48시간 안)`,min:150,roll:t===re?'오늘까지':'D-'+diffDays(t,re),done:!!tk['recap:'+x.r]});});
  uniq(rounds.map(x=>+x.d.slice(0,4))).forEach(Y=>{if(t>=(Y-1)+'-11-20'&&t<=(Y-1)+'-12-31'&&!tk['notice:'+Y])mk({id:'notice:'+Y,k:'notice',need:'권장',onlyWeek:1,label:`큐넷 ${Y} 시행계획 공고 확인`,min:5,roll:'',to:'schedule'});});
  const pn=phaseStart(t);if(pn)mk({id:'phase:'+pn.id,k:'phase',info:1,label:pn.text});
  if(kind==='exam'){const L=(PE_ROUTINES.exam[dayType(t)]||[]).concat(['응시했어요']);L.forEach((x,i)=>{const id='ex:'+t+':'+(i<L.length-1?i:'a');mk({id,k:'ex',p:0,blk:'ex',o:i,always:1,label:x,min:0,roll:'',done:!!tk[id]});});
    mk({id:'ex.note',k:'note',info:1,label:'문제 고르기 3분 → 시간 엄수 → 공란 금지'});return T;}
  /* 오늘 세트(평일·공휴일·시험 전 3일): 읽기·퀴즈, 숙제(필수 칸이 목표, 보통 날은 학원 횟수), 자기 전. 시험 전 3일은 읽기·퀴즈만 */
  const today=study&&SETS.sets[t]?t:null,qzT=(d,Q,blk,o)=>({id:'hw.qz:'+d,k:'hw.qz',d,blk,o,p:3,label:`퀴즈 틀린 ${Q.n}문제: 틀린 이유 한 줄`,prog:[Q.k,Q.n],min:Math.ceil((Q.n-Q.k)*MIN_PER.qz),roll:'오늘만',done:Q.k>=Q.n});
  const hwT=(k,d,H,o)=>Object.assign({id:k+':'+d,k,d,hw:H,floorLab:`필수 ${H.f}번`,labelN:o.label.replace(/\d+번$/,H.f+'번'),doneN:H.k>=H.n,doneF:H.K>=H.N,min:Math.ceil((H.N-H.K)*H.u),done:H.K>=H.N},o);
  if(today){const c=setCore(t),P=hwParts(t),sp1=ph<=2,sp4=ph<=4;   /* 쓰기·목차는 1~2단계, 단답은 1~4단계에서만 일요일까지 넘어가는 몫 */
    mk({id:'set.read:'+t,k:'set.read',d:t,blk:'am',o:10,p:2,always:1,label:`용어 ${c.st.nc}개 읽기`,sub:`${dlab(t)} 세트`,prog:[Math.min(c.st.read,c.st.nc),c.st.nc],min:c.r*MIN_PER.read,done:!c.r});
    mk({id:'set.quiz:'+t,k:'set.quiz',d:t,blk:'noon',o:10,p:2,always:1,label:`세트 퀴즈 ${c.st.nq}문`,prog:[Math.min(c.st.qa,c.st.nq),c.st.nq],min:c.q*MIN_PER.quiz,done:!c.q});
    if(P.qz)mk(qzT(t,P.qz,'noon',12));
    if(P.say)mk(hwT('hw.say',t,P.say,{blk:'noon',o:20,p:3,label:`새 용어 ${P.say.terms}개 소리 내어 말하기 ${P.say.F}번`,roll:'오늘만'}));
    if(P.write)mk(hwT('hw.write',t,P.write,{blk:'eve',o:10,p:4,label:`새 용어 ${P.write.terms}개 안 보고 쓰기 ${P.write.F}번`,roll:sp1?'일요일까지':'오늘만'}));
    if(P.dd)mk({id:'hw.dd:'+t,k:'hw.dd',d:t,blk:'eve',o:20,p:4,always:1,floor:1,label:`단답 ${P.dd.n}문제: 답안지 10분 → 첨삭`,sub:(card(P.dd.ids[0])||{}).t||'',prog:[P.dd.k,P.dd.n],min:Math.ceil((P.dd.n-P.dd.k)*MIN_PER.dd),roll:sp4?'일요일까지':'오늘만',done:P.dd.k>=P.dd.n});
    if(P.eo)mk(hwT('hw.eo',t,P.eo,{blk:'eve',o:30,p:4,label:`논술 목차 옮겨 적기 ${P.eo.F}번`,roll:sp1?'일요일까지':'오늘만'}));
    if(P.fg)mk(hwT('hw.fg',t,P.fg,{blk:'eve',o:35,p:4,label:`그림·표 그리기 ${P.fg.F}번`}));
    if(P.essay)mk({id:'essay:'+t,k:'essay',d:t,blk:'eve',o:40,p:P.essay.req?4:6,need:P.essay.req?'필수':'권장',fold:P.essay.req?0:1,label:'논술 실전 25분 → 첨삭',min:P.essay.k?0:MIN_PER.essay,roll:P.essay.req?'일요일까지':'',done:!!P.essay.k});
    if(P.sl)mk({id:'hw.sl:'+t,k:'hw.sl',d:t,blk:'bed',o:10,p:3,always:1,label:'자기 전 5분: 오늘 용어 떠올리기',prog:[P.sl.k,1],min:P.sl.k?0:MIN_PER.sl,roll:'오늘만',done:!!P.sl.k});
    if(P.restMin)mk({id:'hw.rest:'+t,k:'hw.rest',d:t,fold:1,need:'권장',label:`숙제 나머지 · 약 ${P.restMin}분`,min:P.restMin,roll:''});
    if(!pre){const g=gqStat(t);if(g&&g.a<g.n)mk({id:'gq:'+t,k:'gq',d:t,fold:1,need:'여유',p:7,label:`용어 퀴즈 이어 풀기 · ${g.a}/${g.n}문`,min:MIN_PER.gq,roll:''});}}
  else if(study){const late9=nowMin()>=9*60;mk({id:'wait.set',k:'wait',info:1,label:late9?'오늘 세트가 아직 없어요 · 이번 주 지난 세트부터 해요':'오늘 세트를 기다리는 중',sub:late9?'':'평일 06:21에 만들기 시작해 보통 30분 안에 와요.'});}
  /* 이번 주 지난 세트의 핵심(읽기 → 퀴즈): 평일은 가장 오래된 하나만 오늘 몫(나머지는 이번 주 줄), 토요일·공휴일 따라잡기, 일요일 밀린 핵심 */
  const sets=Object.keys(SETS.sets).filter(d=>d>=W&&d<t).sort(),late=sets.filter(d=>!setCore(d).ok),lb=kind==='sun'?'core':kind==='sat'||kind==='holi'?'catch':'noon';
  late.forEach((d,i)=>{const c=setCore(d),g=[];if(c.r)g.push(`용어 ${c.st.read}/${c.st.nc}`);if(c.q)g.push(`퀴즈 ${c.st.qa}/${c.st.nq}`);
    mk({id:'late:'+d,k:'late',d,blk:lb,o:30+i,p:2,onlyWeek:lb==='noon'&&i>0,label:`밀린 세트 ${dlab(d)}: ${g.join(' · ')}`,min:c.gap});});
  /* 지난 세트의 퀴즈 틀린 이유: 그 퀴즈를 다 푼 날에만, 그 세트 줄 바로 뒤 */
  const cx=(S.cal[t]||{}).x||{};Object.keys(SETS.sets).filter(d=>d<t&&cx['quiz:'+d]).forEach(d=>{const Q=hwParts(d).qz,i=late.indexOf(d);if(Q)mk(qzT(d,Q,lb,i>=0?30+i+.5:39));});
  /* 평일에 9시가 지나도 오늘 세트가 없으면 손글씨 바닥으로 이번 주 가장 오래된 단답 1문 */
  if(study&&!today&&!pre&&!chk&&nowMin()>=9*60){const g=sets.map(d=>[d,hwParts(d).dd]).find(([,x])=>x&&x.k<x.n);
    if(g)mk({id:'q.dd:'+W,k:'q.dd',quota:{q:'dd',nm:'단답 손글씨',un:'문',u:MIN_PER.dd,n:1,nc:1,a:0,list:[{d:g[0],left:1}],floorOnly:1},blk:'eve',o:25,p:4,label:'단답 손글씨 1문',sub:dlab(g[0]),prog:[0,1],min:MIN_PER.dd});}
  revCands(t,kind).forEach(x=>mk(x));
  /* 카드 복습: 오늘 몫은 평일 30장·주말 60장까지(세트 복습을 다 넣은 날에만, §3.7) */
  const N=cardsOut(t).length,kc=Math.min(N,wkend?60:30);
  if(kc||tk['cards:'+t])mk({id:'cards:'+t,k:'cards',blk:kind==='sat'?'catch':kind==='sun'?'flush':'am',o:wkend?85:30,p:5,need:wkend?'필수':'권장',label:`카드 복습 ${kc}장`,sub:cp===3?'약점 단원 먼저':'세트 복습 뒤에 해요',weak:cp===3,kc,N,min:Math.ceil(kc*MIN_PER.card),roll:'다시 나와요',done:!!tk['cards:'+t]});
  /* 오답 다시 풀기(오늘 세트 퀴즈 오답은 숙제 "틀린 이유"가 다룬다): 금·일요일 필수 */
  const wn=wrongList().filter(x=>!(x.type==='quiz'&&x.d===t)).length,wq=kind==='sun'||dw===5&&kind!=='sat';
  if(wn||tk['wrong:'+t])mk({id:'wrong:'+t,k:'wrong',blk:kind==='sun'?'flush':kind==='sat'?'catch':'noon',o:wkend?90:40,p:wq?3:6,need:wq?'필수':'권장',label:`오답 다시 풀기 ${wn}개`,n:wn,min:Math.min(10,wn)*MIN_PER.wrong,roll:'다시 나와요',done:!!tk['wrong:'+t]||!wn});
  /* 이번 주 모의고사: 토요일 교시마다(3·4교시는 리허설 주가 아니면 일요일), 채점(모의가 MOCK_GRADE_SINCE 이후일 때). 일요일은 안 쓴 교시를 밀린 핵심으로 */
  const D=weekMock(t);
  if(wkend){if(D){const m=SETS.mocks[D],pr=S.mockp[D]||{},ps=mockParts(m),rh=!!weekObj(w).pre,sunP=k=>(k==='p3'||k==='p4')&&!rh,hasSun=ps.some(sunP);
      ps.forEach((k,i)=>{if(kind==='sat'&&sunP(k))return;const n=m[k].length;mk({id:`mock:${D}:${k}`,k:'mock',d:D,pk:k,mock:1,paper:1,blk:kind==='sat'||sunP(k)?k:'core',o:i,p:1,always:1,
        label:k==='p1'?'주간 모의고사 1교시 단답 · 13문 중 10문':`주간 모의고사 ${k[1]}교시 논술 ${n<6?n+'문':'6문 중 4문'}`,sub:k==='p1'&&kind==='sat'?'09:00에 시작하면 실제 시험과 같아요':'',min:mockMin(m,k),roll:'다음 모의 전까지',done:!!pr[k]});});
      if(D>=MOCK_GRADE_SINCE&&!(kind==='sat'&&hasSun))mk({id:'mock.g:'+D,k:'mock.g',d:D,mock:1,blk:kind==='sat'?'grade':hasSun?'p4':'core',o:9,p:1,always:1,label:'채점 요청 → 채점 받았어요',min:MIN_PER.grade,roll:'다음 모의 전까지',done:!!pr.g});}
    else if(kind==='sat')mk({id:'wait.mock',k:'wait',info:1,label:'주간 모의고사를 기다리는 중',sub:'토요일 06:21에 만들기 시작해요.'});}
  /* 주말·공휴일 손글씨 몫: 이번 주 지난 세트의 필수 칸 중 남은 것(이번 단계 약속에 있는 줄만, 오래된 세트부터 세트째로) */
  if((wkend||kind==='holi')&&!chk){const cut=!!(S.wk&&S.wk[W]&&S.wk[W].cut);
    (QORD[cp]||[]).forEach((q,qi)=>{const[nm,un,uk,pk]=QK[q],u=MIN_PER[uk],list=[];let n=0,a=0;
      if(q==='redo'){n=5;a=Math.min(5,redoDone(W));for(let j=a;j<5;j++)list.push({d:'u'+j,left:1});}
      else sets.forEach(d=>{const x=hwParts(d)[pk];if(!x||!x.n)return;n+=x.n;a+=Math.min(x.k,x.n);if(x.k<x.n)list.push({d,left:x.n-x.k});});
      if(!n)return;const nc=q==='essay'||q==='redo'?Math.min(n,3):Math.ceil(n*.6),tg=cut?nc:n,lf=Math.max(0,tg-a);
      mk({id:`q.${q}:${W}`,k:'q.'+q,quota:{q,nm,un,u,n,nc,a,list},blk:kind==='sun'?'hand':'catch',o:(kind==='sun'?10:50)+qi,p:4,label:`${nm} ${lf}${un}`,sub:q==='redo'?'지난 모의 틀린 문제':list.map(s=>dlab(s.d)).join(' · '),prog:[Math.min(a,tg),tg],min:Math.ceil(lf*u),done:!lf});});
    if(cp===4&&wkend){const g50=[0,1,2,3,4,5,6].map(i=>addDays(W,i)).filter(d=>((S.daily[d]||{}).graded||0)>=50);if(g50.length<5||g50.includes(t))mk({id:'x.rot:'+t,k:'x.rot',blk:kind==='sat'?'catch':'flush',o:70,p:4,label:'카드 50장 돌리기',n:50,min:MIN_PER.rot50,roll:'오늘만',to:'start-rot',done:g50.includes(t)});}}
  /* 일요일 주간 마감: 주간 리포트(필수), 이번 주 목표·백업(시간이 되면). 월요일: 지난주 리포트를 아직 안 냈으면 */
  if(kind==='sun'){mk({id:'report:'+W,k:'report',w:W,blk:'close',o:10,p:1,always:1,label:'주간 리포트 복사 → Claude',min:tk['report:'+W]?0:MIN_PER.report,roll:'오늘 밤까지',done:!!tk['report:'+W]});
    const gs=weekObj(w).goals||[],gd=gs.filter((_,i)=>tk['goal:'+W+':'+i]).length;if(gs.length&&gd<gs.length)mk({id:'goal:'+W,k:'goal',w:W,blk:'close',o:30,fold:1,need:'권장',label:`이번 주 목표 ${gd}/${gs.length}`,min:(gs.length-gd)*MIN_PER.goal});
    const bl=tk.backup||S.created||'';if(!bl||diffDays(bl,t)>=14)mk({id:'backup',k:'backup',blk:'close',o:40,fold:1,need:'여유',p:7,label:tk.backup?`백업 파일 저장 · 마지막 ${diffDays(tk.backup,t)}일 전`:'백업 파일 저장',min:MIN_PER.backup,roll:'',to:'backup'});}
  if(dw===1&&study){const LW=addDays(W,-7);if(weekIndex(LW)>=0&&!tk['report:'+LW])mk({id:'report:'+LW,k:'report',w:LW,fold:1,need:'권장',label:'지난주 리포트 아직 · 10분',min:MIN_PER.report,roll:''});}
  /* 단계·요일의 할 일(PE_EXTRA): 필수는 오늘 몫 줄, 권장은 시간이 되면 */
  ((PE_EXTRA[pre?'pre3':phaseKey(w)]||{})[kind==='sat'?'sat':kind==='sun'?'sun':'wd']||[]).forEach(x=>{if(x.dow&&x.dow!==dw)return;
    if(x.after==='essay'){const E2=Object.keys(SETS.sets).filter(d=>d<t&&diffDays(d,t)<=3&&(spGet(d).essay||{}).done).sort().pop();if(E2&&!tk[x.k+':'+E2])mk({id:x.k+':'+E2,k:x.k,d:E2,ex:x,fold:1,need:x.need,label:x.t,min:x.min,roll:''});return;}
    const id=x.k+':'+(wkend?W:t),req=x.need==='필수';
    mk({id,k:x.k,ex:x,blk:x.blk||null,o:{'x.rot':40,'x.outline':50,'x.redo':50,kit:60,budget:5,redo:5,'x.trend':15,kichul:20,sum16:50,prep:55}[x.k]||60,p:req?4:6,need:x.need,fold:req?0:1,
      label:x.t,min:x.min,roll:req?(x.k==='x.redo'?'일요일까지':'오늘만'):'',to:x.to||null,n:x.k==='x.rot'?(pre?30:50):null,done:extraDone(x,id,t,W,D)});});
  /* 지난주에서 넘어온 것(권장): 핵심이 빈 최근 세트 3개, 안 쓴 교시가 있는 지난주 모의(새 모의가 오기 전까지, 늘 접힌 줄) */
  const LW=addDays(W,-7),ls=Object.keys(SETS.sets).filter(d=>d>=LW&&d<W).sort().reverse().filter(d=>!setCore(d).ok).slice(0,3);
  if(ls.length)mk({id:'carry.sets:'+W,k:'carry.sets',ds:ls,blk:'catch',o:60,need:'권장',fold:kind==='sat'?0:1,label:`지난주 세트 읽기·퀴즈 ${ls.length}개`,sub:ls.map(dlab).join(' · '),min:ls.reduce((a,d)=>a+setCore(d).gap,0),roll:'이번 일요일까지'});
  const lm=Object.keys(SETS.mocks).filter(x=>/^\d{4}-/.test(x)&&x>=LW&&x<W).sort().pop();
  if(lm&&!D){const m=SETS.mocks[lm],pr=S.mockp[lm]||{},lf=mockParts(m).filter(k=>!pr[k]);if(lf.length)mk({id:'carry.mock:'+lm,k:'carry.mock',d:lm,fold:1,need:'권장',never:1,label:`지난주 모의고사 이어 쓰기 · ${md(lm)}`,min:lf.reduce((a,k)=>a+mockMin(m,k),0),roll:'토요일 새 모의 전까지'});}
  if(study&&!pre){const nn=Math.min(newRoom(),newCards(rangeUnits(S.range)).length);if(nn)mk({id:'new:'+t,k:'new',fold:1,need:'여유',p:7,label:`새 카드 ${nn}장`,min:Math.ceil(nn*.7),roll:''});}
  return T;}
/* 고른 줄의 남은 분과 끝: 숙제 칸은 고정한 목표(full·floor)까지, 손글씨 몫은 고정할 때 고른 세트의 칸만(그 세트의 칸에서 바로 셈), 목록에서 사라진 일은 끝 */
function rowStat(r,x){
  if(r.q){const a=r.id.split(':'),q=a[0].slice(2),K=QK[q];let l=0;if(!K)return[0,true];
    if(q==='redo')l=Math.max(0,r.q.reduce((s,e)=>s+e[1],0)-(redoDone(a[1])-Number(String(r.q[0][0]).slice(1))));
    else r.q.forEach(([d,n])=>{const p=hwParts(d)[K[3]];if(p)l+=Math.min(n,Math.max(0,p.n-p.k));});
    l=Math.ceil(l*MIN_PER[K[2]]);return[Math.min(r.m,l),!l];}
  if(!x)return[0,true];
  if(x.hw){const H=x.hw,f=r.tgt==='full',l=Math.ceil(Math.max(0,f?H.N-H.K:H.n-H.k)*H.u);return[Math.min(r.m,l),f?H.K>=H.N:H.k>=H.n];}
  return[x.done?0:Math.min(r.m,x.min),!!x.done];}
/* 오늘 한 분: 고정한 줄마다 (고정한 분 − 남은 분) + 다시 짤 때 넘겨받은 분 */
function planDoneMin(F){if(!F)return 0;const T=taskList(F.d);return(F.dm||0)+F.rows.reduce((a,r)=>a+Math.max(0,r.m-rowStat(r,T.find(x=>x.id===r.id))[0]),0);}
/* 넣지 못한 필수 줄이 가는 곳 */
function planDest(kind,t,x,T){const dw=parse(t).getDay();if(x.k==='rev'||x.k==='cards'||x.k==='wrong')return'내일 다시 나와요';if(x.roll==='오늘만')return'오늘만이라 놓아줘요';
  if(x.mock)return dw===6?'내일(일) 밀린 핵심':'다음 모의 전까지';const core=x.k==='late'||x.k==='set.read'||x.k==='set.quiz';
  if(dw>=1&&dw<=5)return'토요일 따라잡기';if(dw===6)return core?'내일(일) 밀린 핵심':'내일(일) 손글씨 몫';
  return core&&(T||[]).filter(r=>r.k==='late').map(r=>r.d).sort().slice(-3).includes(x.d)?"다음 주 '지난주 세트'":'다음 주로 놓아줘요';}
/* 손글씨 몫의 목표(줄인 목표면 × 0.6, 논술·다시 쓰기는 3)와 그만큼의 세트(오래된 것부터) */
function quotaAim(x,cut){const Q=x.quota,tg=cut?Q.nc:Q.n,lf=Math.max(0,tg-Q.a);let need=lf;x.list=Q.list.filter(s=>{if(need<=0)return false;need-=s.left;return true;});
  x.left=lf;x.prog=[Math.min(Q.a,tg),tg];x.min=Math.ceil(lf*Q.u);x.label=`${Q.nm} ${lf}${Q.un}`;x.shrunk=cut&&Q.nc<Q.n;x.done=!lf;}
/* 오늘 몫 고르기(읽기만). 남은 시간 capLeft 안에서 우선순위·블록 순서대로, 넘침 단계 lv는 이번 주 남은 필수(B)와 남은 날의 공부 시간(C)으로(시계·"오늘 시간"과 무관).
   o: now 자정부터 분, user 오늘 시간(30·60·90), lv 고정한 단계, keep 고정해 둔 줄, used0 그 줄들의 남은 분, dm 오늘 한 분, noFill 고르지 않고 나머지만 나눔 */
function dayPlan(t,o){o=o||{};t=t||todayStr();const kind=dayKind(t),W=wkStart(t),now=o.now!=null?o.now:nowMin(),leftNow=Math.max(0,DAY_END-now),user=o.user||null;
  const cap=budgetOf(t,kind),capLeft=user?Math.min(user,leftNow):Math.max(0,Math.min(cap-(o.dm||0),leftNow)),lv=o.lv!=null?o.lv:weekBoard(t).lv,full=lv===0&&!user,cut=lv>=2||!!(S.wk&&S.wk[W]&&S.wk[W].cut);
  const keep=o.keep||[],kid=new Set(keep.map(r=>r.id)),T=taskList(t).map(x=>Object.assign({},x)),freed=[],pick=[],rest=[],bs=PLAN_BLOCKS[kind]||[];
  const seq=x=>{const i=bs.indexOf(x.blk);return(i<0?99:i)*1000+(x.o||0);},ord=(a,b)=>a.p-b.p||seq(a)-seq(b);
  T.forEach(x=>{if(x.hw){const H=x.hw;x.tgt=full?'full':'floor';x.prog=full?[H.K,H.N]:[H.k,H.n];x.min=Math.ceil(Math.max(0,full?H.N-H.K:H.n-H.k)*H.u);x.minFloor=Math.ceil(Math.max(0,H.n-H.k)*H.u);x.meta=full?x.floorLab:`오늘은 ${H.f}번까지`;x.done=full?x.doneF:x.doneN;}
    if(x.quota)quotaAim(x,cut);});
  /* 단계: 1 이상 권장은 접음, 2 이상 손글씨 몫 × 0.6(위)·7일 차부터 세트 복습 권장·카드 30장까지·지난주 세트 뺌, 3은 몫·7일 차부터·카드·오답을 놓아줌 */
  T.forEach(x=>{if(x.done||x.info)return;if(lv>=1&&x.need==='권장')x.fold=1;
    if(lv>=2){if(x.k==='rev'&&x.step>=7){x.need='권장';x.fold=1;x.note='일요일에 못 하면 다음 주로 넘겨도 돼요';}if(x.k==='cards'&&x.kc>30){x.kc=30;x.min=Math.ceil(30*MIN_PER.card);x.label='카드 복습 30장';}if(x.k==='carry.sets')x.drop=1;}
    if(lv>=3&&(x.quota||x.k==='rev'&&x.step>=7||x.k==='cards'||x.k==='wrong')){x.freed=1;freed.push(x);}});
  const pool=T.filter(x=>!x.done&&!x.fold&&!x.info&&!x.onlyWeek&&!x.freed&&!x.drop&&!kid.has(x.id));let used=o.used0||0;
  /* 고정한 손글씨 몫의 남은 세트는 새 줄로 만들지 않고 옮긴 것으로만 */
  T.filter(x=>x.quota&&!x.done&&kid.has(x.id)).forEach(x=>{const r=keep.find(r=>r.id===x.id),tk=new Map((r.q||[]).map(([d,n])=>[d,n]));let lf=0;x.list.forEach(s=>{lf+=Math.max(0,s.left-(tk.get(s.d)||0));});
    if(lf>0)rest.push(Object.assign({},x,{min:Math.ceil(lf*x.quota.u),label:`${x.quota.nm} ${lf}${x.quota.un}`}));});
  if(o.noFill)pool.forEach(x=>rest.push(x));
  else{/* 1) 늘 넣음: 날짜 일(P0), 모의고사·채점·주간 리포트(P1), 오늘 세트 읽기·퀴즈, 오늘 단답, 자기 전. 줄인 날 안 들어가는 모의 교시는 내일로 */
    pool.filter(x=>x.always||x.p<=1).sort(ord).forEach(x=>{if(x.mock&&user&&used+x.min>capLeft)return rest.push(x);pick.push(x);used+=x.min;});
    /* 2) 손글씨 바닥: 오늘 단답도, 오늘 몫의 모의 답안도 없으면 가장 오래된 단답 몫에서 1문(놓아준 날에도) */
    const paper=pick.some(x=>x.paper||x.k==='hw.dd')||T.some(x=>x.k==='hw.dd'&&x.done)||keep.some(r=>/^(mock:|hw\.dd:|q\.)/.test(r.id));
    if(!paper){const q=T.find(x=>x.quota&&x.quota.q==='dd'&&x.list.length&&!x.done&&!kid.has(x.id))||T.find(x=>x.quota&&x.list.length&&!x.done&&!kid.has(x.id));
      if(q){q.floorQ=1;if(q.freed){q.freed=0;freed.splice(freed.indexOf(q),1);q.list=[{d:q.list[0].d,left:1}];q.left=1;q.min=Math.ceil(q.quota.u);q.relFloor=1;}if(!pool.includes(q))pool.push(q);}}
    /* 3) 나머지: 우선순위·블록 순서대로 남은 시간 안에서. 몫은 세트째로(토요일·공휴일은 반까지), 카드 복습은 세트 복습을 다 넣었을 때만 */
    pool.filter(x=>!pick.includes(x)&&!rest.includes(x)).sort(ord).forEach(x=>{
      if(x.quota){let room=capLeft-used,k=0;const half=kind==='sat'||kind==='holi'?Math.ceil(x.left/2):Infinity,take=[];
        for(const s of x.list){if(k>=half)break;const m=Math.ceil(s.left*x.quota.u);if(m>room&&!(x.floorQ&&k===0))break;const n1=m>room?1:s.left;room-=Math.ceil(n1*x.quota.u);k+=n1;take.push([s.d,n1]);}
        if(k){const Q=x.quota;pick.push(Object.assign({},x,{take,min:Math.ceil(k*Q.u),label:`${Q.nm} ${k}${Q.un}`,sub:Q.q==='redo'?x.sub:take.map(([d,n])=>dlab(d)+(n>1?' '+n+Q.un:'')).join(' · '),prog:[0,k]}));used+=Math.ceil(k*Q.u);
          if(k<x.left)rest.push(Object.assign({},x,{min:Math.ceil((x.left-k)*Q.u),label:`${Q.nm} ${x.left-k}${Q.un}`}));}else rest.push(x);return;}
      if(x.k==='cards'&&T.some(r=>r.k==='rev'&&!r.done&&!pick.includes(r)&&!kid.has(r.id))){x.wait=1;return rest.push(x);}
      if(used+x.min<=capLeft||x.k==='late'&&x.min<=5&&lv>=3){pick.push(x);used+=x.min;return;}
      if(x.hw&&x.tgt==='full'&&x.minFloor&&used+x.minFloor<=capLeft){const H=x.hw;Object.assign(x,{tgt:'floor',prog:[H.k,H.n],min:x.minFloor,meta:`오늘은 ${H.f}번까지`});pick.push(x);used+=x.min;return;}
      rest.push(x);});}
  /* 넣지 못한 숙제 줄은 필수 칸만 옮긴다(더 하기 칸은 빚이 아니라 시간이 되면) */
  rest.forEach(x=>{if(!x.hw)return;if(!x.minFloor){x.need='권장';return;}Object.assign(x,{tgt:'floor',min:x.minFloor,label:x.labelN,prog:[x.hw.k,x.hw.n],meta:`오늘은 ${x.hw.f}번까지`});});
  rest.forEach(x=>{if(x.need==='필수')x.dest=planDest(kind,t,x,T);});
  const rows=keep.map(r=>Object.assign({},r,{task:T.find(x=>x.id===r.id)||null})).concat(pick.map(x=>({id:x.id,m:x.min,tgt:x.tgt||null,blk:x.blk,o:x.o,q:x.take,task:x})))
    .map((r,i)=>[r,i]).sort((a,b)=>{const ia=bs.indexOf(a[0].blk),ib=bs.indexOf(b[0].blk);return(ia<0?99:ia)-(ib<0?99:ib)||(a[0].o||0)-(b[0].o||0)||a[1]-b[1];}).map(a=>a[0]);
  const fold=T.filter(x=>x.fold&&!x.done&&!x.info&&!x.freed&&!x.drop&&!x.onlyWeek&&!kid.has(x.id)).concat(rest.filter(x=>x.need!=='필수')).sort(ord);
  return{t,kind,cap,capLeft,leftNow,now,lv,user,used,rows,moved:rest.filter(x=>x.need==='필수'),fold,freed,info:T.filter(x=>x.info),onlyWeek:T.filter(x=>x.onlyWeek&&!x.done)};}
/* 오늘 몫 고정: 평일은 그날 세트, 토요일은 모의가 오면(늦어도 9시) */
function canFreeze(t,now){const k=dayKind(t);if(now>=9*60||k==='sun'||k==='exam')return true;if(isStudy(k))return!!SETS.sets[t];if(k==='sat')return!!weekMock(t);return true;}
const daySig=t=>[SETS.sets[t]?1:0,weekMock(t)||'',Object.keys(SETS.sets).filter(d=>d>=wkStart(t)&&d<=t).length].join('|');
const rowRec=r=>{const o={id:r.id,m:r.m,tgt:r.tgt||null,blk:r.blk,o:r.o||0};if(r.q)o.q=r.q;if(r.dep)o.dep=r.dep;return o;};
/* 줄인 목표는 그 주 동안 그대로(오늘 시간으로 줄인 날은 걸지 않음). 건 단계를 cph에 적어 두고, 시험 일정이 바뀌어 단계가 달라지면 푼다 */
function ratchet(t,lv,user){if(lv<2||user)return;const W=wkStart(t),x=S.wk[W]||(S.wk[W]={});if(!x.cut){x.cut=true;x.cph=phaseObj(weekIndex(t)).id;}}
/* 고정 뒤 오직 하나 더하는 줄: 고정한 세트 퀴즈(밀린 세트 포함)를 다 풀고 틀린 것이 있으면 "틀린 이유" 줄을 그 뒤에 */
function depInsert(t,F){let ch=0;const T=taskList(t);F.rows.slice().forEach(r=>{if(!/^(set\.quiz|late):/.test(r.id))return;const D=r.id.split(':')[1],qid='hw.qz:'+D;if(F.rows.some(x=>x.id===qid))return;
  const x=T.find(x=>x.id===qid);if(!x||x.done)return;F.rows.splice(F.rows.indexOf(r)+1,0,{id:qid,m:x.min,tgt:null,blk:r.blk,o:(r.o||0)+.5,dep:r.id});ch=1;});return ch;}
/* 오늘 몫(그날 한 번 고정). 9시 전에 그날 자료가 없으면 고정하지 않고 그때그때 계산한다. 고정 뒤에 바뀌는 길:
   자료가 옴(sig) → 합침: 고정한 줄은 그대로, 새 줄은 남은 시간 안에(새 세트의 늘 넣는 줄은 늘). o.replan(cap 오늘 시간·reset 다시 짜기·sched 시험 일정·budget 공부 시간)
   → 다시 고름: 끝낸 줄은 그 자리 그대로, 나머지만 새로(오늘 한 분은 이어 셈). 새 날·PLAN_V·복원·초기화 → 새로 */
function planToday(t,o){o=o||{};t=t||todayStr();const now=o.now!=null?o.now:nowMin(),W=wkStart(t),sig=daySig(t);S.wk=S.wk||{};S.tk=S.tk||{};
  if(UI.d!==t){UI.d=t;UI.later={};UI.act=null;}if(o.replan==='reset')UI.later={};
  weekSnap(t);let F=S.today;if(F&&(F.d!==t||F.v!==PLAN_V))F=S.today=null;
  if(!F){/* "오늘 시간"을 고르면 자료를 기다리지 않고 바로 고정(고른 시간을 S.today.user에 둔다) */
    const user=o.replan==='cap'&&o.user||null,P=dayPlan(t,{now,user});if(!user&&!canFreeze(t,now))return planView(t,P,null,now);
    F=S.today={d:t,at:hmOf(now),v:PLAN_V,lv:P.lv,cap:P.capLeft,user,sig,dm:0,rows:P.rows.map(rowRec)};ratchet(t,P.lv,user);save();}
  else if(o.replan){if(o.replan==='sched'){const x=S.wk[W];if(x&&x.cut&&x.cph!==phaseObj(weekIndex(t)).id){x.cut=false;delete x.cph;PLN++;}}
    const lv=o.replan==='cap'?F.lv:weekBoard(t).lv,T=taskList(t),st=F.rows.map(r=>[r,rowStat(r,T.find(x=>x.id===r.id))]),done=st.filter(a=>a[1][1]).map(a=>a[0]);
    if(o.replan==='cap')F.user=o.user||null;F.lv=lv;F.dm=(F.dm||0)+st.filter(a=>!a[1][1]).reduce((s,a)=>s+Math.max(0,a[0].m-a[1][0]),0);
    const P=dayPlan(t,{now,user:F.user,lv,keep:done,dm:F.dm+done.reduce((s,r)=>s+r.m,0)});
    Object.assign(F,{rows:P.rows.map(rowRec),cap:P.capLeft,at:hmOf(now),sig});ratchet(t,F.lv,F.user);save();}
  else if(F.sig!==sig){const T=taskList(t),left=F.rows.reduce((s,r)=>s+rowStat(r,T.find(x=>x.id===r.id))[0],0);
    const P=dayPlan(t,{now,user:F.user,lv:F.lv,keep:F.rows,used0:left,dm:planDoneMin(F)});F.rows=P.rows.map(rowRec);F.sig=sig;save();}
  if(depInsert(t,F))save();
  return planView(t,null,F,now);}
/* 화면에 쓸 오늘 몫: 고정한 줄(남은 분·끝), 옮긴 것(갈 곳), 시간이 되면, 놓아준 것, 안내, 이번 주 줄, 지금 블록, 펼칠 줄 */
function planView(t,P,F,now){if(F)P=dayPlan(t,{now,lv:F.lv,user:F.user,keep:F.rows,dm:planDoneMin(F),noFill:1});
  const rows=P.rows.map(r=>{const s=rowStat(r,r.task);return Object.assign(r,{left:s[0],done:s[1]});});
  const V=Object.assign({},P,{frozen:!!F,at:F?F.at:null,rows,doneMin:F?(F.dm||0)+rows.reduce((a,r)=>a+Math.max(0,r.m-r.left),0):0,leftMin:rows.reduce((a,r)=>a+r.left,0),plan:rows.reduce((a,r)=>a+r.m,0),wb:weekBoard(t)});
  /* 오늘 몫을 다 하면 시간이 되면 맨 앞에 "미리 하기" 2개까지(이번 주에 남은 필수 중 이른 것). 오늘 몫 줄이 되지 않고 남은 수에도 세지 않는다 */
  V.ahead=rows.length&&rows.every(r=>r.done)?P.moved.concat(P.onlyWeek.filter(x=>x.k==='late')).filter(x=>x.roll==='일요일까지').sort((a,b)=>(a.d||'')<(b.d||'')?-1:(a.d||'')>(b.d||'')?1:0).slice(0,2):[];
  /* 블록 머리 한 줄(할 일 아님): 4단계·시험 주는 자기 전 "수면 7시간", 4단계 일요일은 "반나절은 쉬어요" */
  const ph=phaseObj(weekIndex(t)).id;V.notes={};if(ph>=4||exWeek(t))V.notes.bed='수면 7시간';if(ph===4&&V.kind==='sun')V.notes.day='반나절은 쉬어요';
  V.curBlk=curBlock(t,now,rows);V.active=planActive(V);return V;}
/* 지금 블록: 평일은 시각으로(끝난 블록의 남은 줄은 지금 블록에 보인다). 자기 전은 나머지를 다 했거나 23시가 지나면. 주말은 남은 첫 줄의 블록 */
function curBlock(t,now,rows){t=t||todayStr();now=now!=null?now:nowMin();rows=rows||[];const k=dayKind(t);
  if(isStudy(k)){let b=['am','noon','eve'].find(b=>now<WD_WIN[b])||'bed';if(rows.length&&rows.every(r=>r.done||r.blk==='bed'||r.blk==='pin'))b='bed';return b;}
  const r=rows.find(r=>!r.done&&r.blk!=='pin');return r?r.blk:(PLAN_BLOCKS[k]||[])[1]||null;}
/* 보이는 순서: 날짜 일 → (평일) 끝난 블록의 끝낸 줄, 지금 블록 맨 위에 끝난 블록의 남은 줄(필수 먼저), 지금 블록부터 → 자기 전. vb = 보이는 블록 */
function planOrder(V){const bs=PLAN_BLOCKS[V.kind]||[],ci=bs.indexOf(V.curBlk),L=V.rows,bi=r=>bs.indexOf(r.blk),pin=L.filter(r=>r.blk==='pin').map(r=>Object.assign({vb:'pin'},r));
  if(!isStudy(V.kind)||ci<0)return L.map(r=>Object.assign({vb:r.blk},r));const R2=L.filter(r=>r.blk!=='pin'),past=r=>bi(r)<ci&&r.blk!=='bed';
  return pin.concat(R2.filter(r=>past(r)&&r.done).map(r=>Object.assign({vb:r.blk},r)),R2.filter(r=>past(r)&&!r.done).sort((a,b)=>((a.task||{}).need==='권장')-((b.task||{}).need==='권장')).map(r=>Object.assign({},r,{vb:V.curBlk})),R2.filter(r=>!past(r)).map(r=>Object.assign({vb:r.blk},r)));}
/* 펼칠 줄(화면의 하나뿐인 파란 버튼): UI.act → 나중에가 아닌 첫 줄 → 나중에 미룬 줄. 자기 전은 그 블록이 지금이거나 나머지를 다 했을 때.
   필수가 남지 않았으면 시간이 되면의 휴대폰 일(세트 복습·카드·오답·지난주 세트). 지난주 모의고사는 어느 날에도 펼치지 않는다 */
function planActive(V){const L=planOrder(V).filter(r=>!r.done&&!(r.task&&r.task.never));if(UI.act){const a=L.find(r=>r.id===UI.act);if(a)return a;}
  const o=L.filter(r=>!UI.later[r.id]).concat(L.filter(r=>UI.later[r.id]).sort((a,b)=>UI.later[a.id]-UI.later[b.id])),ok=r=>r.blk!=='bed'||V.curBlk==='bed'||o.every(x=>x===r||x.blk==='bed');
  const r=o.find(ok);if(r)return r;const f=(V.fold||[]).find(x=>!x.never&&/^(rev|cards|wrong|carry\.sets)$/.test(x.k));return f?{id:f.id,m:f.min,blk:f.blk,task:f,fold:1}:null;}
/* 이 줄 다음에 할 줄(오늘 순서): 뒤에 없으면 앞에서 넘긴 줄(before) */
function nextAfter(id,V){V=V||planToday();const L=planOrder(V),i=L.findIndex(r=>r.id===id),ok=r=>!r.done&&r.id!==id&&!(r.task&&r.task.never);
  const a=L.slice(i+1).find(ok);if(a)return{row:a,before:false};const b=L.slice(0,Math.max(0,i)).find(ok);return b?{row:b,before:true}:null;}
/* 이번 주 약속(단계별 줄), 남은 필수 B분, 남은 시간 C분(오늘 공부 시간 − 오늘 한 분 + 남은 날의 공부 시간; 시계·"오늘 시간"과 무관), 넘침 단계, 점수.
   목표는 모두 월요일부터 정해 둔다(올 세트·모의 어림·돌아올 세트 복습). 그래서 한 일이 늘면 점수는 오르기만 하고, 줄은 할 수 없게 될 때만 빠진다 */
function weekBoard(t){t=t||todayStr();return pm('w'+t,()=>wbCalc(t));}
function wbCalc(t){const W=wkStart(t),E=addDays(W,6),w=weekIndex(t);if(w<0||t>PLAN.target.d)return{t,W,E,w,ph:0,chk:true,check:null,lines:[],B:0,C:0,r:0,lv:0,pct:null,reach:null,parts:[],cut:false,dm:0};const ph=phaseObj(w).id,cp=Math.max(1,ph),chk=exWeek(t)||ph===5,sc=chk?null:(PE_SCORE[cp]||PE_SCORE[1]),tk=S.tk||{},cut=!!(S.wk&&S.wk[W]&&S.wk[W].cut),L=[];
  const M0=Object.assign({},PE_HW_MIN[1],PE_HW_MIN[ph]||{}),R0=Object.assign({},PE_HW[1],PE_HW[ph]||{}),fr0=(PE_SETRULE[ph]||PE_SETRULE[1]).fresh||0;for(const k in M0)M0[k]=Math.min(M0[k],R0[k]||0);
  /* 이번 주에 올 평일 세트(지난 평일에 세트가 없었으면 뺀다) */
  const exp=[];for(let i=0;i<5;i++){const d=addDays(W,i),pre=dayKind(d)==='pre3';if(SETS.sets[d]&&d<=t)exp.push({d,have:1,pre});else if(d>=t)exp.push({d,have:0,pre});}
  {let B=0,r=0,a=0;const gaps=[];exp.forEach(x=>{if(!x.have){B+=x.pre?PE_EST.coreExam:PE_EST.core;return;}const c=setCore(x.d),st=c.st;B+=c.gap;r+=.5*(st.nc?Math.min(1,st.read/st.nc):1)+.5*(st.nq?Math.min(1,st.qa/st.nq):1);if(c.ok)a++;else gaps.push(x.d);});
    L.push({k:'core',n:1,label:'세트 핵심(용어 읽기·세트 퀴즈)',a,b:exp.length,B,ratio:exp.length?r/exp.length:null,gaps});}
  if(!chk){const D=weekMock(t);
    if(D){const m=SETS.mocks[D],pr=S.mockp[D]||{},ps=mockParts(m),g=D>=MOCK_GRADE_SINCE,gd=g&&!!pr.g;let tot=0,dn=0,a=0;ps.forEach(k=>{const x=mockMin(m,k);tot+=x;if(pr[k]){dn+=x;a++;}});
      L.push({k:'mock',n:2,label:'주간 모의고사 + 채점',D,a:a+(gd?1:0),b:ps.length+(g?1:0),B:tot-dn+(g&&!gd?MIN_PER.grade:0),ratio:tot?(g?.8*dn/tot+(gd?.2:0):dn/tot):(gd?1:0),ps:ps.map(k=>[k,!!pr[k]]),g:gd});}
    else{const em=estMock(w);if(em)L.push({k:'mock',n:2,label:'주간 모의고사 + 채점',est:1,a:0,b:em>=430?5:em>=180?3:2,B:em,ratio:0});}
    (QORD[cp]||[]).forEach(q=>{const u=MIN_PER[QK[q][2]],pk=QK[q][3];let n=0,dn=0;
      if(q==='redo'){n=5;dn=redoDone(W);}else exp.forEach(x=>{if(x.pre)return;if(x.have){const p=hwParts(x.d)[pk];if(p){n+=p.n;dn+=Math.min(p.k,p.n);}}else n+={dd:M0.dd,eo:M0.eo,w:M0.w*fr0,essay:M0.ew?1:0,fg:M0.fg||0}[q]||0;});
      const nc=q==='essay'||q==='redo'?Math.min(n,3):Math.ceil(n*.6),b=cut?nc:n;L.push({k:q,n:QLINE[q][1],label:QLINE[q][0],hw:1,a:Math.min(dn,b),b,B:Math.max(0,b-dn)*u,full:n,cut:cut&&nc<n});});
    if(cp===4){const ds=[0,1,2,3,4,5,6].map(i=>addDays(W,i)),dn=ds.filter(d=>((S.daily[d]||{}).graded||0)>=50).length,b=cut?3:5;L.push({k:'rot',n:11,label:'카드 50장 돌리기',a:Math.min(dn,b),b,B:Math.min(Math.max(0,b-dn),ds.filter(d=>d>=t).length)*MIN_PER.rot50,cut});}}
  /* 세트 복습: 이번 주에 기한이 오는 (세트, 단계). 월요일 전에 연 세트 + 이번 주 세트(안 연 것은 오늘 연 셈, 아직 안 온 것은 그날 연 셈) */
  {const pairs=[],add=(d,f,rv)=>REVIEW_STEPS.forEach(st=>{const due=addDays(f,st);if(due>=W&&due<=E)pairs.push({d,st,due,done:(rv||{})[st]||null});});
    Object.keys(SETS.sets).forEach(d=>{const p=spGet(d),mine=d>=W&&d<=E;let f=p.first;if(!f&&mine)f=d<=t?t:d;if(!f||!mine&&f>=W)return;add(d,f,p.rev);});
    exp.forEach(x=>{if(!SETS.sets[x.d])add(x.d,x.d<=t?t:x.d,null);});
    const val=x=>x.done?(x.done<=addDays(x.due,1)?1:.5):0,pot=x=>x.done?val(x):(addDays(x.due,1)>=t?1:.5),dn=dueSetReviews().map(x=>x.d),fut=uniq(pairs.filter(x=>!x.done&&x.due>t&&!dn.includes(x.d)).map(x=>x.d));
    L.push({k:'rev',n:6,label:'세트 복습(이번 주에 돌아오는 것)',a:pairs.filter(x=>x.done).length,b:pairs.length,B:dn.concat(fut).reduce((s,d)=>s+revMin(d),0),ratio:pairs.length?pairs.reduce((s,x)=>s+val(x),0)/pairs.length:null,pairs,val,pot,dueNow:dn.length,fut:fut.length});}
  {const gs=weekObj(w).goals||[],gd=gs.filter((_,i)=>tk['goal:'+W+':'+i]).length,rp=!!tk['report:'+W];L.push({k:'close',n:7,label:'주간 리포트(일)',a:rp?1:0,b:1,B:rp?0:MIN_PER.report,ratio:gs.length?(rp?.6:0)+.4*gd/gs.length:(rp?1:0),gd,gn:gs.length});}
  const B=L.reduce((s,x)=>s+x.B,0),dm=S.today&&S.today.d===t?planDoneMin(S.today):0;let C=Math.max(0,budgetOf(t)-dm);for(let d=addDays(t,1);d<=E;d=addDays(d,1))C+=budgetOf(d);
  const r=C?B/C:(B?9:0),lv=r<=.8?0:r<=1?1:r<=1.5?2:3,G=k=>L.find(x=>x.k===k);let pct=null,reach=null,parts=[];
  if(sc){const hl=L.filter(x=>x.hw&&x.b>0),hw=hl.reduce((s,x)=>s+(sc.hw[x.k]||0),0),hand=hw?hl.reduce((s,x)=>s+(sc.hw[x.k]||0)*Math.min(1,x.a/x.b),0)/hw:null,rot=G('rot'),rv=G('rev'),cl=G('close');
    const P=[['core',sc.core,G('core').ratio],['mock',sc.mock,G('mock')?G('mock').ratio:null],['hand',sc.hand,hand],['rot',sc.rot||0,rot?Math.min(1,rot.a/rot.b):null],['rev',sc.rev,rv.ratio],['close',sc.close,cl.ratio]].filter(x=>x[1]&&x[2]!=null);
    const mx=P.reduce((s,x)=>s+x[1],0),pr=rv.pairs.length?rv.pairs.reduce((s,x)=>s+(x.done?rv.val(x):lv>=3&&x.st>=7?0:rv.pot(x)),0)/rv.pairs.length:null;
    const RE={core:1,mock:1,hand:lv>=3?hand:1,rot:lv>=3?(rot?Math.min(1,rot.a/rot.b):1):1,rev:pr,close:cl.gn?.6+.4*cl.gd/cl.gn:1};
    pct=mx?Math.round(P.reduce((s,x)=>s+x[1]*x[2],0)/mx*100):0;reach=mx?Math.round(P.reduce((s,x)=>s+x[1]*RE[x[0]],0)/mx*100):0;parts=P.map(x=>[x[0],+(x[1]*x[2]).toFixed(1),x[1]]);}
  /* 시험이 든 주·시험 주: 점수 대신 체크(응시·48시간 복기·준비물) */
  const ex=[PLAN.mock,PLAN.target].filter(x=>x&&x.d>=W&&x.d<=E)[0],check=chk?[['응시',!!(ex&&tk['ex:'+ex.d+':a'])],['48시간 복기',!!(ex&&tk['recap:'+ex.r])],['준비물',Object.keys(tk).some(k=>/^kit:/.test(k)&&tk[k]>=W&&tk[k]<=E)]]:null;
  const lines=['mock','core'].concat(QORD[cp]||[],['rot','rev','close']).map(G).filter(Boolean);
  return{t,W,E,w,ph:cp,chk,check,lines,B,C,r,lv,pct,reach,parts,cut,dm};}
/* 새 주 첫 화면에서 지난주를 한 번 고정한다(S.wk[지난주]: 점수 p, 부분 parts, 단계 lv, 넘어온 것 carry, 놓아준 것 rel). 그 뒤 지난 세트를 고쳐도 그대로 */
function weekSnap(t){t=t||todayStr();const W=wkStart(t),LW=addDays(W,-7);if(weekIndex(addDays(LW,6))<0)return null;const x=S.wk[LW]||{};if(x.at)return x;
  const b=weekBoard(addDays(LW,6)),parts={},rel=[];b.parts.forEach(([k,v])=>parts[k]=v);
  b.lines.filter(l=>l.hw&&l.a<l.b).forEach(l=>rel.push(`${l.label} ${l.b-l.a}${QK[l.k][1]}`));
  const ls=Object.keys(SETS.sets).filter(d=>d>=LW&&d<W).sort().reverse().filter(d=>!setCore(d).ok),lm=Object.keys(SETS.mocks).filter(d=>/^\d{4}-/.test(d)&&d>=LW&&d<W).sort().pop(),carry=[];
  if(ls.length)carry.push('carry.sets:'+W);ls.slice(3).forEach(d=>rel.push(`${dlab(d)} 세트 읽기·퀴즈`));if(lm&&mockParts(SETS.mocks[lm]).some(k=>!(S.mockp[lm]||{})[k]))carry.push('carry.mock:'+lm);
  S.wk[LW]=Object.assign(x,{p:b.pct,parts,lv:b.lv,at:t,carry,rel});save();return S.wk[LW];}
/* 오늘 몫 줄의 "시작": 그 일을 하는 곳으로 한 번에. FLOW에 이 줄을 적어 끝 화면·세트 화면의 "다음"이 오늘 순서를 잇는다 */
function taskGo(id,o){o=o||{};const t=todayStr(),x=taskList(t).find(r=>r.id===id);if(!x)return goTab('today');const D=x.d,k=x.k;
  const setGo=(d,tab)=>{SV[d]=tab;FLOW={id,from:'today',at:'set/'+d};nav('set/'+d,{from:'today'});};
  const sess=f=>{const s0=SES;f();if(SES&&SES!==s0)FLOW={id,from:'today',at:'sess'};};
  if(k==='set.read')return setGo(D,'cards');if(k==='set.quiz')return setGo(D,'quiz');if(k==='essay')return setGo(D,'essay');
  if(k==='late'){const c=setCore(D);return setGo(D,c.r?'cards':'quiz');}
  if(k==='carry.sets'){const d=x.ds[x.ds.length-1],c=setCore(d);return setGo(d,c.r?'cards':'quiz');}
  if(/^hw\./.test(k))return setGo(D,'tasks');
  if(x.quota){const s=x.quota.list[0];if(x.quota.q==='redo'||!s){if(!s)return goTab('today');const j=Object.keys(S.tk||{}).filter(q=>q.indexOf('x.redo:'+t+':')===0).length;return taskTick('x.redo:'+t+':'+j,x.quota.nm);}return setGo(s.d,'tasks');}
  if(k==='mock'||k==='mock.g'||k==='carry.mock'){FLOW={id,from:'today',at:'mock/'+D};return nav('mock/'+D,{from:'today'});}
  if(k==='rev')return sess(()=>startSetReview(D,{chain:o.chain}));
  if(k==='cards')return sess(()=>startDueAll({k:x.kc,skip:planRevCards(t),weak:x.weak}));
  if(k==='wrong')return sess(()=>startWrong({skipQ:t}));
  if(k==='gq')return sess(()=>startGq(D,'next'));
  if(k==='new')return sess(()=>startStudy(null,{newOnly:true}));
  if(x.to==='start-outline')return sess(()=>startOutline());if(x.to==='start-cloze')return sess(()=>startCloze());if(x.to==='start-rot')return sess(()=>startRot(x.n||50));
  if(x.to==='dd-rand')return ddRandom();
  if(k==='report'){const dw=parse(t).getDay();copy(weeklyReport(),'주간 리포트를 복사했어요. Claude 프로젝트에 붙여 넣으세요');if(x.w!==wkStart(t)||dw===0||dw===6){S.tk['report:'+x.w]=t;touchDay();save();}return render();}
  if(x.to==='schedule')return nav('schedule',{from:'today'});if(x.to==='backup')return nav('backup',{from:'today'});if(x.to==='settings')return nav('settings',{from:'today'});
  if(k==='kichul'){const u=(weekObj(weekIndex(addDays(wkStart(t),7))).u||[])[0];return nav(u?'kichul/u/'+u:'kichul',{from:'today'});}
  if(x.to==='week'||k==='goal')return nav('week',{from:'today'});
  return taskTick(id,x.label);}
/* 앱이 볼 수 없는 일(교재·다시 쓰기·준비물 등)은 "다 했어요"로 S.tk에 */
function taskTick(id,label){S.tk=S.tk||{};S.tk[id]=todayStr();touchDay();calMark('tk:'+id,'todo',label||id);save();render();}
/* 카드 n장 돌리기: 카드 복습에 나올 카드 먼저, 모자라면 본 지 오래된 카드 */
function startRot(n){n=n||50;const t=todayStr(),a=cardsOut(t).map(c=>c.id),sk=new Set(a),b=deck().filter(c=>!sk.has(c.id)&&pget(c.id).seen>0&&pget(c.id).last!==t).sort((x,y)=>(pget(x.id).last||'')<(pget(y.id).last||'')?-1:1).map(c=>c.id);
  startSession({kind:'rot',title:`카드 ${n}장 돌리기`,items:cardItems(a.concat(b).slice(0,n)),requeue:true});}
/* 시험 일정·공부 시간이 바뀌면 오늘 몫을 다시 고른다(고정해 둔 날만) */
function planChanged(why){if(S.today&&S.today.d===todayStr())planToday(todayStr(),{replan:why});}

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
      ${st.nt?`<li class="${st.td>=st.nt?'done':''}"><span class="dot ${st.td>=st.nt?'on':st.td?'half':''}"></span><span class="k">오늘 숙제(쓰기·말하기·목차)</span><span class="v">${st.td}/${st.nt}</span></li>`:''}
    </ul><button class="btn" data-act="go" data-h="set/${t}">${label}</button></div>`;}
  else{const last=latestSetDate();const wk2=dtp==='wd';
    setBox=`<div class="sheet"><p class="sheet-k">오늘의 세트</p><h3>${wk2?'오늘 세트를 기다리는 중':'주말에는 세트가 없어요'}</h3>
    <p class="ds" style="margin:8px 0 12px">${wk2?'평일 06:21에 만들기 시작해 보통 30분 안에 도착해요. 앱을 열 때마다 자동으로 확인합니다.':(dtp==='sat'?'토요일엔 주간 모의고사가 테스트 탭으로 들어와요.':'일요일은 복습 탭에서 다시 볼 세트와 오답 노트를 비우는 날이에요.')}</p>
    <div class="btns">${wk2?`<button class="btn" data-act="sync">지금 받아 오기</button>`:''}${last?`<button class="btn sec" data-act="go" data-h="set/${last}">${last===addDays(t,-1)?'어제':korDate(last)} 세트</button>`:''}</div></div>`;}
  const due=dueNow().length,rv=dueSetReviews(),wr=Object.keys(S.wrong).length,lm=latestMockDate();
  const thisMock=lm&&weekIndex(lm)===w?lm:null;
  const items=routineFor(t),chk=S.checks[t]||{},done=items.filter((_,i)=>chk[i]).length;
  const ms=milestones().filter(m=>m.d>=t).slice(0,2);
  return`<div class="ltitle"><div class="ltl">${calIconHTML()}<div><h1>오늘</h1><p class="lsub">${esc(korDate(t,true))}, ${esc(weekLabel(w))}</p></div></div><div class="dday"><span>제${PLAN.target.r}회까지</span><b class="num">D-${de>=0?de:0}</b></div></div>
  <div style="margin-top:14px">${setBox}</div><div data-syncline>${syncLine()}</div>
  ${sec('복습','',`<div class="group">
    ${row({ic:'cards',t:'카드 복습',d:due?'간격이 돌아온 카드부터':'오늘 복습할 카드를 다 했어요',v:due,zero:!due,act:'start-due'})}
    ${row({ic:'redo',t:'다시 볼 세트',d:rv.length?rv.map(x=>korDate(x.d)+'('+x.step+'일 차)').slice(0,3).join(', '):'세트를 끝내면 1·3·7·14·30일 뒤에 돌아와요',v:rv.length,zero:!rv.length,act:'go',data:{h:'review'}})}
    ${row({ic:'x',tone:'red',t:'오답 노트',d:wr?'두 번 연속 맞히면 빠져요':'틀린 문제가 여기 모여요',v:wr,zero:!wr,act:wr?'start-wrong':'go',data:{h:'wrong'}})}
    ${thisMock?row({ic:'paper',tone:'amber',t:'이번 주 모의고사',d:esc(SETS.mocks[thisMock].title||korDate(thisMock)),act:'go',data:{h:'mock/'+thisMock}}):''}
  </div>`)}
  ${sec('오늘 할 일',`${done}/${items.length}`,`<div class="group">${items.map((it,i)=>`<label class="check ${chk[i]?'done':''}"><input type="checkbox" data-act="chk" data-i="${i}" ${chk[i]?'checked':''}><span>${esc(it)}</span></label>`).join('')}</div>
    <p class="note">연속 학습 ${streak()}일. 손글씨 항목이 합격을 가릅니다.</p>`)}
  ${sec('이번 주 목표',`${md(weekRange(Math.max(0,w))[0])}~${md(weekRange(Math.max(0,w))[1])}`,`<p class="wk-t">${esc(wk.t)}</p><div class="group plain">${(wk.goals||[]).slice(0,4).map(g=>`<div class="row noic"><span class="tx"><span class="tt" style="font-weight:500">${esc(g)}</span></span></div>`).join('')}
    ${row({t:PLAN.E+'주 로드맵 전체 보기',act:'go',data:{h:'plan'}})}</div>`)}
  ${ms.length?sec('다가오는 일정','',`<div class="group">${ms.map(m=>row({ic:'flag',tone:m.k==='exam'?'red':'gray',t:esc(m.t),d:`${esc(m.d)}, D-${diffDays(t,m.d)}`})).join('')}</div>${PLAN.target.est||(PLAN.mock&&PLAN.mock.est)?`<p class="note">시험일은 예년 패턴으로 잡은 예상치예요. 큐넷 공고가 나오면 더보기 → 시험 일정에서 고치세요.</p>`:''}`):''}`;}

/* ════════ 세트 숙제: 그날 세트 내용과 학습 단계(PE_HW)로 정하는 암기·숙지 숙제(몇 번, 어떻게) ════════
   기록은 sp(날짜).hw = {키: 한 횟수, mn: 앞글자 글}. 논술 실전 쓰기는 sp.essay.done, 세트만의 과제는 sp.tasks를 그대로 쓴다 */
const HW_HOW={
  fresh:'① 카드를 보며 정의 2줄과 키워드 5개를 읽고 왜 그런지 이해해요. ② 카드를 덮고 답안지에 정의와 키워드를 써요. 카드를 펴서 빠지거나 틀린 곳만 빨간 펜으로 고치면 "안 보고 쓰기" 1번이에요. ③ 말하기는 30초 안에 정의 → 원리 → 특징 → 유의사항 순서로 소리 내어 해요. 한 번에 몰아 하지 말고 아침·점심·저녁·자기 전에 나눠 하면 훨씬 오래 남아요.',
  rev:'제목만 보고 키워드를 백지에 떠올려 써요. 3개도 안 나오면 그 카드에 별표를 달아요(암기 탭 가리며 외우기에 먼저 나와요).',
  eo:'1번째: 모범 목차를 보며 소제목과 키워드를 옮겨 적고, 왜 이 순서인지(개요 → 원인·특징 → 대책 → 결론) 흐름을 이해해요. 2번째: 보며 적되 소리 내어 읽어요. 3번째부터는 덮고 적은 뒤 빠진 것만 빨간 펜으로. 마지막 번은 덮고 3분 안에. 막힘없이 나오면 외운 거예요.',
  ew:'25분 타이머를 켜고 실제 답안지에 써요. 서론 0.3면 → 본론 2.5면(소제목 4~6개, 그림·표 1개 이상) → 결론 0.3면. 다 쓰면 사진을 찍고 첨삭 요청을 복사해 Claude에 올려요. 첨삭에서 지적된 곳은 다음 날 고쳐 써야 실력이 돼요.',
  fg:'1번째: 보며 크게 그려요(명칭·치수·화살표). 2번째: 안 보고. 3번째: 2분 타이머 안에. 시험장에서는 그림 하나가 설명 몇 줄보다 점수가 커요.',
  qz:'틀린 문제의 해설을 소리 내어 2번 읽고, 왜 틀렸는지 한 줄로 써요(헷갈린 개념, 수치, 함정). 틀린 이유를 쓰면 같은 함정에 다시 안 빠져요.',
  mn:'논술 소제목이나 키워드의 앞글자를 이어 외우기 쉬운 말로 만들어요. 예: 원인·문제점·대책·결론 → "원문대결". 아래에 적어 두면 다음에 다시 볼 수 있어요.',
  dd:'답안지 버튼으로 모양을 먼저 보고 덮은 뒤, 실제 답안지에 10분 타이머로 써요. 문제 → 답) → Ⅰ. 개요(정의) → Ⅱ. 원리·특징 → 그림 1개 → Ⅲ. 핵심 키워드 → Ⅳ. 결론 → 끝. 1면(22줄) 안에 맞춰 줄이는 게 연습이에요. 다 쓰면 사진을 찍고 첨삭 요청을 복사해 Claude에 올려요.',
  sl:'불 끄기 전 5분, 오늘 용어의 제목만 보고 정의를 머릿속으로 떠올려요. 자는 동안 기억이 굳어요. 막힌 것은 내일 카드 복습에 다시 나와요.',
  x:'이 세트가 따로 준 과제예요.'};
const HW_RULES=[['보고 베끼기보다 덮고 떠올리기','떠올리려고 애쓴 만큼 오래 남아요(인출 연습).'],['손으로 쓰기','시험은 100분 손글씨예요. 쓰는 손이 기억하고 속도도 붙어요.'],['소리 내어 말하기','말로 설명할 수 있어야 답안에 쓸 수 있어요.'],['나눠서 되풀이','한 번에 4번보다 하루에 나눠 1번씩. 앱이 1·3·7·14·30일 뒤에 다시 불러요.'],['빨간 펜에 시간 쓰기','아는 것은 빨리, 틀린 곳에 시간을 써요.'],['매일 끝까지','하루 숙제를 다 하는 날이 쌓이는 것이 합격선이에요.']];
/* 예약 작업이 세트마다 넣는 공통 과제 3개는 아래 숙제가 대신한다(남는 것만 "세트만의 과제") */
const HW_GEN=[/새\s*용어.*(소리|설명|말하)/,/논술.*(손글씨|첨삭)/,/퀴즈.*(틀린|오답)/];
function hwRule(d){const s=SETS.sets[d],w=s&&s.week!=null?s.week:weekIndex(d);return Object.assign({},PE_HW[1],PE_HW[phaseObj(w).id]||{});}
function hwItems(d){const s=SETS.sets[d];if(!s)return[];const p=spGet(d),R=hwRule(d),H=p.hw||{},out=[];
  const cs=(s.cards||[]).map((sc,i)=>({i,sc,id:setCardId(d,i)})).filter(x=>x.id),tt=x=>(card(x.id)||x.sc).t||'';
  const fresh=cs.filter(x=>!x.sc.ref),rev=cs.filter(x=>x.sc.ref);
  if(fresh.length&&(R.w||R.s))out.push({key:'fresh',kind:'term',t:`새 용어 ${fresh.length}개: 안 보고 쓰기 ${R.w}번, 소리 내어 말하기 ${R.s}번`,min:Math.round(fresh.length*(R.w*3+R.s*.5)),
    rows:fresh.map(x=>({t:tt(x),c:[['w'+x.i,'쓰기',R.w],['s'+x.i,'말하기',R.s]].filter(c=>c[2])})),go:[['memo-set','가리며 외우기'],['set-flash','카드로 넘겨 보기']]});
  if(rev.length&&R.rv)out.push({key:'rev',kind:'term',t:`복습 용어 ${rev.length}개: 제목만 보고 키워드 백지 복원${R.rv>1?' '+R.rv+'번':''}`,min:Math.round(rev.length*1.5*R.rv),rows:rev.map(x=>({t:tt(x),c:[['r'+x.i,'',R.rv]]}))});
  const e=s.essay;
  if(e&&e.t){if(R.eo)out.push({key:'eo',kind:'essay',t:`논술 목차 옮겨 적기 ${R.eo}번`,sub:e.t,min:R.eo*5,rows:[{c:[['eo','',R.eo]]}],go:[['essay','모범 목차 보기']]});
    if(R.ew)out.push({key:'ew',kind:'essay',t:'논술 실전 쓰기 25분 → 사진 찍어 첨삭',sub:e.t,min:30,done:!!(p.essay&&p.essay.done),go:[['timer','25분 타이머'],['copy-essay','첨삭 요청 복사']]});
    if(e.fig&&R.fg)out.push({key:'fg',kind:'essay',t:`그림·표 그리기 ${R.fg}번`,sub:e.fig,min:R.fg*2,rows:[{c:[['fg','',R.fg]]}]});}
  if(R.dd){const pool=fresh.concat(rev).map(x=>({x,c:card(x.id)})).filter(o=>o.c).sort((a,b)=>(a.x.sc.ref?1:0)-(b.x.sc.ref?1:0)||((b.c.x||[]).length-(a.c.x||[]).length)||a.x.i-b.x.i).slice(0,R.dd);
    if(pool.length)out.push({key:'dd',kind:'term',t:`단답 ${pool.length}문제: 답안지에 10분 쓰기 → 첨삭`,min:pool.length*15,rows:pool.map(o=>({t:o.c.t,c:[['dd'+o.x.i,'',1]],go:o.c.id})),go:[['timer1','10분 타이머']]});}
  const qs=s.quiz||[];if(qs.length){const all=qs.every((_,i)=>p.quiz[i]),wr=qs.map((q,i)=>({q,i})).filter(x=>p.quiz[x.i]&&!p.quiz[x.i].ok);
    out.push({key:'qz',kind:'quiz',t:all&&!wr.length?'퀴즈: 모두 맞혔어요':`퀴즈 틀린 문제: 해설 2번 읽고 틀린 이유 한 줄`,min:wr.length*2,pending:!all,
      rows:wr.map(x=>({t:x.q.q,c:[['q'+x.i,'',1]]})),done:all&&!wr.length?true:undefined,go:all?null:[['quiz','퀴즈 먼저 풀기']]});}
  out.push({key:'mn',kind:'todo',t:'앞글자로 외우기 1개 만들기',min:3,done:!!H.mn,input:true});
  out.push({key:'sl',kind:'term',t:'자기 전 5분: 오늘 용어 제목만 보고 떠올리기',min:5,rows:[{c:[['sl','',1]]}]});
  (s.tasks||[]).forEach((x,i)=>{if(!HW_GEN.some(r=>r.test(x)))out.push({key:'x',kind:'todo',t:x,min:15,task:i,done:!!p.tasks[i]});});
  out.forEach(it=>{if(it.done===undefined)it.done=!it.pending&&(it.rows||[]).every(r=>r.c.every(([k,,n])=>(H[k]||0)>=n));});
  return out;}
function hwSum(d){const it=hwItems(d);return{n:it.length,done:it.filter(x=>x.done).length,min:it.reduce((a,x)=>a+x.min,0),left:it.filter(x=>!x.done).reduce((a,x)=>a+x.min,0)};}
/* 숙제 기록을 달력에(용어·논술은 그 색, 전체는 할 일) */
function hwCal(d){const it=hwItems(d),cnt=k=>{const a=it.filter(x=>x.kind===k);return[a.filter(x=>x.done).length,a.length];};
  const H=spGet(d).hw||{},touched=k=>it.filter(x=>x.kind===k).some(x=>(x.rows||[]).some(r=>r.c.some(([c])=>H[c])));
  [['term','hwt','숙제(용어)'],['essay','hwe','숙제(논술)']].forEach(([k,key,lab])=>{const[a,b]=cnt(k);if(b&&(a||touched(k)))calMark(key+':'+d,k,`${korDate(d)} ${lab} ${a}/${b}`);else calUnmark(key+':'+d);});
  const sm=hwSum(d),any=sm.done||Object.keys(H).length;if(any)calMark('hw:'+d,'todo',`${korDate(d)} 숙제 ${sm.done}/${sm.n}`);else calUnmark('hw:'+d);}
/* 시험까지 이 숙제를 매일 하면 몸에 익히는 양(평일 세트 기준 어림) */
function hwAhead(){const t=todayStr();let w=Math.max(0,weekIndex(t)),terms=0,essays=0;for(;w<PLAN.E;w++){const ph=phaseObj(w).id,r=PE_SETRULE[ph]||PE_SETRULE[1];terms+=5*(r.fresh||0);if(ph<5)essays+=5;}return{terms,essays};}
function hwCtr(d,k,n,lab,H){const cur=H[k]||0;return`<span class="ctr">${lab?`<small>${lab}</small>`:''}${Array.from({length:n},(_,j)=>`<button class="cc${j<cur?' on':''}" data-act="hw" data-d="${d}" data-k="${k}" data-v="${j+1}" aria-label="${esc(lab||'')} ${j+1}번째">${j+1}</button>`).join('')}</span>`;}
function vHw(d){const s=SETS.sets[d],p=spGet(d),H=p.hw||{},R=hwRule(d),its=hwItems(d),sm=hwSum(d),ah=hwAhead(),w=s.week!=null?s.week:weekIndex(d);
  const go=([a,l])=>a==='memo-set'||a==='set-flash'?`<button class="btn sm sec" data-act="${a}" data-d="${d}">${l}</button>`:a==='essay'||a==='quiz'?`<button class="btn sm sec" data-act="set-tab" data-d="${d}" data-t="${a}">${l}</button>`
    :a==='timer'?`<button class="btn sm sec" data-act="timer-go" data-p="one2">${l}</button>`:a==='timer1'?`<button class="btn sm sec" data-act="timer-go" data-p="one1">${l}</button>`:`<button class="btn sm sec" data-act="copy-essay" data-d="${d}">${l}</button>`;
  return`<div class="hwtop"><div class="hwpg"><b class="num">${sm.done}<small>/${sm.n}</small></b><span>오늘 숙제</span></div><div class="hwtx"><b>${esc(phaseObj(w).n)}</b><p>${esc(R.why||'')}</p><p class="ds">모두 하면 약 ${sm.min}분${sm.done?`, 남은 것 약 ${sm.left}분`:''}</p></div></div>
  <details class="d hwrules"><summary>이렇게 외워요: 숙제 원칙 6가지</summary><div class="in-d"><ol>${HW_RULES.map(([a,b])=>`<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join('')}</ol>
    <p class="note" style="margin:8px 0 0">이 숙제를 시험 전까지 매일 하면 새 용어 약 ${ah.terms}개를 손과 입으로, 논술 약 ${ah.essays}문제의 목차를 손으로 익혀요(평일 세트 기준 어림).</p></div></details>
  ${its.map((it,n)=>`<div class="hw${it.done?' done':''} k-${it.kind}-l"><div class="hwh"><span class="hwn">${it.done?'✓':n+1}</span><div class="hwt"><b>${esc(it.t)}</b>${it.sub?`<span>${esc(it.sub)}</span>`:''}</div><span class="hwm">${it.min?`${it.min}분`:''}</span></div>
    ${(it.rows||[]).map(r=>`<div class="hwr">${r.t?`<span class="hwl">${esc(r.t)}</span>`:''}<span class="hwc">${r.c.map(([k,l,m])=>hwCtr(d,k,m,l,H)).join('')}${r.go?`<button class="btn sm sec hwrgo" data-act="go" data-h="dandap/${esc(encodeURIComponent(r.go))}">답안지</button>`:''}</span></div>`).join('')}
    ${it.key==='ew'?`<div class="hwr"><span class="hwc"><span class="ctr"><button class="cc${it.done?' on':''}" data-act="hw-ew" data-d="${d}" aria-label="실전 쓰기 다 했어요">1</button><small>${it.done?'다 썼어요':'다 쓰면 누르세요'}</small></span></span></div>`:''}
    ${it.task!=null?`<div class="hwr"><span class="hwc"><span class="ctr"><button class="cc${it.done?' on':''}" data-act="hw-task" data-d="${d}" data-i="${it.task}" aria-label="과제 다 했어요">1</button></span></span></div>`:''}
    ${it.key==='qz'&&it.pending?`<p class="ds hwp">퀴즈를 다 풀면 틀린 문제가 여기 나와요.</p>`:''}
    ${it.input?`<div class="hwin"><input id="hwMn" type="text" maxlength="80" placeholder="예: 원인·문제점·대책·결론 → 원문대결" value="${esc(H.mn||'')}"><button class="btn sm sec" data-act="hw-mn" data-d="${d}">${H.mn?'고치기':'적어 두기'}</button></div>`:''}
    ${it.go?`<div class="btns hwgo">${it.go.map(go).join('')}</div>`:''}
    <details class="how"><summary>요령</summary><p>${esc(HW_HOW[it.task!=null?'x':it.key])}</p></details></div>`).join('')}
  ${sm.done===sm.n&&sm.n?`<p class="note" style="color:var(--ok);font-weight:700">오늘 숙제를 모두 했어요. 이런 날이 쌓이면 합격이에요.</p>`:''}`;}
/* ════════ 11-3. 용어 퀴즈(세트 용어로 앱이 만드는 4지선다·OX, 용어당 15문, 15문씩 회차) ════════
   세트 카드 내용만으로 만든다(덱 전체를 쓰지 않아 새 세트가 와도 문제와 순서가 그대로). 같은 세트는 늘 같은 문제·같은 보기 순서(날짜로 정한 난수).
   용어마다 쉬운 것부터: 정의 보고 용어 → 키워드 보고 용어 → OX → 빈칸 → 키워드 아닌 것 → 현장·원어. 회차가 뒤로 갈수록 어려워진다.
   기록은 sp(d).gq = {s: 문제 서명, r: 문제마다 '1' 맞힘 '0' 틀림 '-' 안 풂}. 카드 글이 바뀌어 서명이 달라지면 새로 센다. 틀린 문제는 오답 노트 G:날짜:번호:서명 */
const GQ_PER=15,GQ_ROUND=15,GQ_KIND={def:'정의 보고 용어',kw:'키워드 보고 용어',ox:'OX',blank:'빈칸',notkw:'키워드 아닌 것',kwpick:'키워드 고르기',field:'현장 내용 보고 용어',plus:'보충 설명 보고 용어',eng:'원어 보고 용어'};
const GQ_OX=['맞다','틀리다'];
function strHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seedRnd(s){let a=strHash(String(s));return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const shufR=(a,rnd)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
/* 받침에 맞는 조사(은/는, 이/가, 과/와). 한글이 아닌 끝은 은(는)처럼 둘 다 */
function jo(w,p){const ch=String(w).trim().slice(-1),k=ch.charCodeAt(0)-0xAC00;if(k>=0&&k<11172)return p[k%28?0:1];const dg='013678'.includes(ch)?0:'2459'.includes(ch)?1:-1;return dg>=0?p[dg]:p[0]+'('+p[1]+')';}
function gqMain(c){return String(c.t||'').replace(/\s*[(（][^)）]*[)）]\s*/g,' ').replace(/\s+/g,' ').trim()||String(c.t||'');}
function gqEng(c){const m=String(c.t||'').match(/[(（]([^)）]+)[)）]/);return m&&!/[가-힣]/.test(m[1])&&/[A-Za-z]{4,}/.test(m[1])?m[1].trim():'';}
function gqSents(t){return String(t||'').replace(/([.。])\s+/g,'$1\n').split('\n').map(x=>x.trim()).filter(x=>x.length>=15);}
/* 문장 속 용어 이름을 ○○로(이름이 그대로 남으면 null) */
function gqMask(s,c){const main=gqMain(c);let out=s;[main].concat(glNames(c.t).filter(n=>/[가-힣]/.test(n))).sort((a,b)=>b.length-a.length).forEach(n=>{if(n)out=out.split(n).join('○○');});return out.includes(main)?null:out;}
/* 수치 보기: 같은 자릿수로 2배·절반·1.5배·한 칸 위아래 */
function gqNumAlt(tok,rnd){const nums=tok.match(/\d+(?:[.,]\d+)?/g);if(!nums||/\d,\d/.test(tok)||nums.some(m=>!(parseFloat(m)>0)))return[];
  if(nums.length===1&&/^(19|20)\d\d$/.test(nums[0]))return shufR([-3,-2,-1,1,2,3],rnd).slice(0,3).map(f=>tok.replace(nums[0],String(Number(nums[0])+f)));
  const dec=Math.max(...nums.map(m=>(m.split('.')[1]||'').length)),fmt=x=>dec?x.toFixed(dec):String(x),out=[];
  shufR(nums.length===1?[2,0.5,1.5,'+','-',3]:[2,0.5,1.5,3],rnd).forEach(f=>{if(out.length>=3)return;let bad=false;
    const alt=tok.replace(/\d+(?:\.\d+)?/g,m=>{const x=parseFloat(m),stp=dec?5*Math.pow(10,-dec):x>=20?5:1,y=f==='+'?x+stp:f==='-'?x-stp:x*f,t=fmt(y);if(!(y>0)||(dec?Math.abs(parseFloat(t)-y)>1e-9:!Number.isInteger(y)))bad=true;return t;});
    if(!bad&&alt!==tok&&!out.includes(alt))out.push(alt);});
  return out.length===3?out:[];}
/* 세트 카드 [{c, sc}] → 문제 목록 */
function gqBuild(d){const s=SETS.sets[d];if(!s)return null;const cs=[];(s.cards||[]).forEach((sc,i)=>{const id=setCardId(d,i),c=id&&card(id);if(c)cs.push({c,sc});});if(!cs.length)return null;
  const rnd=seedRnd('gq:'+d+':'+cs.map(x=>x.c.id).join(',')),mains=cs.map(x=>gqMain(x.c));
  const label=c=>{const m=gqMain(c);return mains.filter(x=>x===m).length>1?c.t:m;};
  const pool=[];cs.forEach(x=>{if(!pool.includes(x.c))pool.push(x.c);});
  if(pool.length<4){const u=new Set(pool.map(c=>Number(c.u)));deck().filter(c=>u.has(Number(c.u))&&!pool.includes(c)).sort((a,b)=>a.id<b.id?-1:1).slice(0,4-pool.length).forEach(c=>pool.push(c));}
  const text=c=>[c.d].concat(c.k||[]).join(' ');
  const lex=[];cs.forEach(x=>{[x.c.t].concat(x.c.k||[]).forEach(t=>fillFrags(t).forEach(f=>lex.push(f)));(x.c.k||[]).forEach(k=>String(k).split(/[·,=()<>↑↓/+×~:]/).forEach(y=>{y=y.trim();if(y.length>=3&&y.length<=14)lex.push(y);}));});
  const lexU=uniq(lex);
  const opt4=(right,wrongs)=>{const o=shufR([right].concat(wrongs.slice(0,3)),rnd);return{o,a:o.indexOf(right)};};
  const termQ=(c,k,q,t,ex)=>{const ws=shufR(pool.filter(o=>o!==c&&label(o)!==label(c)),rnd).map(label);if(ws.length<3)return null;return Object.assign({k,id:c.id,q,t,ex},opt4(label(c),ws));};
  const per=cs.map(({c,sc},ci)=>{const main=gqMain(c),others=cs.filter(x=>x.c!==c).map(x=>x.c),kws=(c.k||[]).filter(k=>String(k).length>=3),L={};const add=(k,q)=>{if(q)(L[k]=L[k]||[]).push(q);};
    const kw3=kws.slice(0,3).join(', ');
    gqSents(c.d).forEach(st=>{const m=!/^(이때|이 때|이는|이를|이러한|이런|그|또한|따라서|즉|다만|한편|반면)/.test(st)&&gqMask(st,c);if(m&&(m.includes('○○')||!others.some(o=>gqMain(o).length>=2&&m.includes(gqMain(o)))))add('def',termQ(c,'def','다음 설명에 해당하는 용어는?',m,`정답은 ${main}. 키워드: ${kw3}`));});
    kws.forEach(k=>{if(String(k).includes(main)||others.some(o=>text(o).includes(k)||String(k).includes(gqMain(o))))return;add('kw',termQ(c,'kw','다음 키워드와 짝이 되는 용어는?',k,`"${k}"${jo(k,'은는')} ${main}의 키워드예요.`));});
    /* OX: 맞는 문장 그대로, 틀린 문장은 수치를 바꾸거나 다른 용어 이름으로 바꾼 것 */
    const sents=gqSents(c.d);shufR(sents,rnd).slice(0,2).forEach(st=>add('oxo',{k:'ox',id:c.id,q:`${main}에 대한 설명이 맞으면 O, 틀리면 X`,t:st,o:GQ_OX,a:0,ex:'맞는 설명이에요.'}));
    sents.forEach(st=>{const tk=clozeTokens(st);if(!tk.length)return;const t0=tk[Math.floor(rnd()*tk.length)],alt=gqNumAlt(t0.s,rnd)[0];if(!alt)return;
      add('oxx',{k:'ox',id:c.id,q:`${main}에 대한 설명이 맞으면 O, 틀리면 X`,t:st.slice(0,t0.i)+alt+st.slice(t0.i+t0.s.length),o:GQ_OX,a:1,ex:`"${alt}"${jo(alt,'이가')} 아니라 "${t0.s}"${jo(t0.s,'이에')=='이'?'이에요':'예요'}.`});});
    const jm=sents[0]&&sents[0].startsWith(main)&&sents[0].slice(main.length).match(/^(은|는|이란|란|이|가)\s/);
    if(jm){const bi=t=>{const b=new Set();for(let i=0;i<t.length-1;i++)b.add(t.substr(i,2));return b;},mb=bi(main);
      const o=shufR(others.filter(o=>!gqMain(o).includes(main)&&!main.includes(gqMain(o))),rnd).map(o=>({o,n:[...bi(gqMain(o))].filter(x=>mb.has(x)).length})).sort((a,b)=>b.n-a.n)[0];
      if(o){const on=gqMain(o.o),j=/은|는/.test(jm[1])?jo(on,'은는'):/이|가/.test(jm[1])&&jm[1].length===1?jo(on,'이가'):jm[1];
        add('oxx',{k:'ox',id:c.id,q:`${on}에 대한 설명이 맞으면 O, 틀리면 X`,t:on+j+sents[0].slice(main.length+jm[1].length),o:GQ_OX,a:1,ex:`${main}의 설명이에요. ${on}${jo(on,'과와')} 헷갈리지 않게 비교해 두세요.`});}}
    /* 빈칸: 키워드 구절 > 수치 > 세트 낱말 순으로 한 문장에 하나 */
    sents.forEach(st=>{const cand=[];const has=w=>st.indexOf(w)>=0&&st.indexOf(w)===st.lastIndexOf(w)&&!main.includes(w);
      kws.forEach(k=>String(k).split(/[·,=()<>↑↓/+×~:]/).map(y=>y.trim()).forEach(ph=>{if(ph.length>=3&&has(ph))cand.push({w:ph,p:3,num:/\d/.test(ph)});}));
      clozeTokens(st).forEach(t=>{if(has(t.s))cand.push({w:t.s,p:2,num:1});});
      lexU.forEach(w=>{const i=st.indexOf(w);if(w.length>=3&&!/\d/.test(w)&&has(w)&&!(i&&/[가-힣A-Za-z0-9]/.test(st.charAt(i-1))))cand.push({w,p:1});});
      const best=shufR(cand,rnd).sort((a,b)=>b.p-a.p);for(const x of best){
        const ws=x.num?gqNumAlt(x.w,rnd):shufR(lexU.filter(w=>w!==x.w&&!/\d/.test(w)&&!st.includes(w)&&!w.includes(x.w)&&!x.w.includes(w)&&/[가-힣]/.test(w)===/[가-힣]/.test(x.w)&&Math.abs(w.length-x.w.length)<=3),rnd).slice(0,3);
        if(ws.length<3)continue;const i=st.indexOf(x.w);add('blank',Object.assign({k:'blank',id:c.id,q:`${main}: 빈칸에 알맞은 말은?`,t:st.slice(0,i)+'{_}'+st.slice(i+x.w.length),ex:`정답은 "${x.w}".`},opt4(x.w,ws)));break;}});
    /* 키워드 아닌 것 / 키워드 고르기 */
    const okw=shufR([].concat(...others.map(o=>(o.k||[]).filter(k=>String(k).length>=3&&!text(c).includes(k)).map(k=>({k,o})))),rnd);
    if(kws.length>=3)okw.slice(0,2).forEach(x=>{const own=shufR(kws,rnd).slice(0,3);add('notkw',Object.assign({k:'notkw',id:c.id,q:`${main}의 키워드가 아닌 것은?`,t:'',ex:`"${x.k}"${jo(x.k,'은는')} ${gqMain(x.o)}의 키워드예요.`},opt4(x.k,own)));});
    if(kws.length&&okw.length>=3)add('kwpick',Object.assign({k:'kwpick',id:c.id,q:`${main}의 키워드는?`,t:'',ex:`${main}의 키워드: ${kw3}`},opt4(shufR(kws,rnd)[0],okw.slice(2,5).map(x=>x.k))));
    const fd=sc.field||c.field,pl=sc.plus||c.plus,en=gqEng(c);
    if(fd){const m=gqMask(fd,c);if(m)add('field',termQ(c,'field','다음 현장 내용과 관계 깊은 용어는?',m,`정답은 ${main}.`));}
    if(pl){const m=gqMask(pl,c);if(m)add('plus',termQ(c,'plus','다음 보충 설명이 가리키는 용어는?',m,`정답은 ${main}.`));}
    if(en)add('eng',termQ(c,'eng',`원어 "${en}"에 해당하는 용어는?`,'',`${en} = ${main}`));
    /* 쉬운 것부터 차례로 뽑아 용어당 GQ_PER개 */
    const order=['def','kw','oxo','blank','def','kw','notkw','field','blank','oxx','def','kw','kwpick','eng','blank','oxx','def','kw','plus','notkw','oxo','def','kw','blank','def','kw'];
    const take={},out=[];order.forEach(k=>{if(out.length>=GQ_PER)return;const a=L[k]||[],j=take[k]||0;if(a[j]){out.push(a[j]);take[k]=j+1;}});
    Object.keys(L).forEach(k=>{(L[k]||[]).slice(take[k]||0).forEach(q=>{if(out.length<GQ_PER)out.push(q);});});
    return out;});
  /* 차례(순위)별로 용어를 고루 섞어 15문씩 회차, 회차 안에서는 섞는다 */
  const flat=[];for(let r=0;r<GQ_PER;r++)shufR(per.map((a,i)=>i),rnd).forEach(i=>{if(per[i][r])flat.push(per[i][r]);});
  const items=[];for(let i=0;i<flat.length;i+=GQ_ROUND)shufR(flat.slice(i,i+GQ_ROUND),rnd).forEach(q=>items.push(q));
  return{items,sig:strHash(items.map(q=>q.q+q.t+q.o.join('/')).join('|')).toString(36)};}
var _gq={};
function gqList(d){if(!_gq[d])_gq[d]=gqBuild(d);return _gq[d];}
function gqRec(d){const L=gqList(d);if(!L)return null;const p=spGet(d);const g=p.gq&&p.gq.s===L.sig?p.gq.r:'';return(g+'-'.repeat(L.items.length)).slice(0,L.items.length);}
function gqSet(d,n,ok){const L=gqList(d);if(!L)return;const p=sp(d);const r=gqRec(d).split('');r[n]=ok?'1':'0';p.gq={s:L.sig,r:r.join('')};}
function gqStat(d){const r=gqRec(d);if(r==null)return null;const n=r.length,a=n-(r.match(/-/g)||[]).length,ok=(r.match(/1/g)||[]).length;return{n,a,ok,no:a-ok,rounds:Math.ceil(n/GQ_ROUND)};}
/* 회차 r(0부터) 또는 'next'(안 푼 문제가 있는 첫 회차, 다 풀었으면 1회), 'wrong'(틀린 문제만). 반쯤 푼 회차는 안 푼 문제부터 */
function startGq(d,mode){const L=gqList(d);if(!L||!L.items.length)return toast('이 세트로는 용어 퀴즈를 만들 수 없어요');const r=gqRec(d),nR=Math.ceil(L.items.length/GQ_ROUND);let ns=[],title,at=0;
  if(mode==='wrong'){ns=[...r].map((x,i)=>x==='0'?i:-1).filter(i=>i>=0);title='틀린 문제';if(!ns.length)return toast('틀린 문제가 없어요');}
  else if(/^t:/.test(mode||'')){const id=mode.slice(2),c=card(id);ns=L.items.map((q,n)=>q.id===id?n:-1).filter(n=>n>=0);if(!ns.length)return toast('이 용어로 만든 문제가 없어요');
    title=': '+(c?gqMain(c):'용어');const f=ns.findIndex(n=>r[n]==='-');at=f>0?f:0;}
  else if(mode==='rand'||mode==='all'){ns=shuffle(L.items.map((_,n)=>n));if(mode==='rand')ns=ns.slice(0,GQ_ROUND);title=mode==='rand'?`무작위 ${ns.length}문`:`${ns.length}문 섞어서`;}
  else{let k=Number(mode);if(mode==='next'||isNaN(k)){k=0;for(let j=0;j<nR;j++)if(r.slice(j*GQ_ROUND,(j+1)*GQ_ROUND).includes('-')){k=j;break;}}
    for(let n=k*GQ_ROUND;n<Math.min(L.items.length,(k+1)*GQ_ROUND);n++)ns.push(n);title=(k+1)+'회';const f=ns.findIndex(n=>r[n]==='-');at=f>0?f:0;}
  /* 안 푼 문제부터 이어 풀면 그 앞의 이미 푼 문제는 끝낸 것으로 센다(세트 복습 80%, "이어서"에 다시 나오지 않음) */
  const done={};for(let j=0;j<at;j++)if(r[ns[j]]!=='-')done[j]=1;
  startSession({kind:'gq',title:`${korDate(d)} 용어 퀴즈${title.startsWith(':')?'':' '}${title}`,items:ns.map(n=>({type:'gq',d,n})),revD:d,i:at,done});}
/* 푸는 방식: 회차별(15문씩, 쉬운 것부터), 용어별(그 용어 문제만, 쉬운 것부터), 무작위(15문 또는 전체를 풀 때마다 새로 섞기). 기록은 문제마다 하나라 어느 방식으로 풀어도 같이 남는다 */
const GQ_MODES=[['round','회차별'],['term','용어별'],['rand','무작위']];
function gqSection(d){const L=gqList(d);if(!L||!L.items.length)return'';const r=gqRec(d),st=gqStat(d),nR=st.rounds,qid=uniq(L.items.map(q=>q.id)),ids=setIds(d).filter(id=>qid.includes(id)).concat(qid.filter(id=>!setIds(d).includes(id))),mode=SV['gqm:'+d]||'round';
  let body='';
  if(mode==='term')body=`<div class="group">${ids.map(id=>{const c=card(id),ns=L.items.map((q,n)=>q.id===id?n:-1).filter(n=>n>=0),a=ns.filter(n=>r[n]!=='-').length,ok=ns.filter(n=>r[n]==='1').length;
      return row({t:esc(c?gqMain(c):id),d:a?`${a}/${ns.length}문 풂, 정답 ${ok}`:`${ns.length}문`,v:a===ns.length?(ok===ns.length?'다 맞힘':`${ok}/${ns.length}`):'',act:'gq-go',data:{d,r:'t:'+id}});}).join('')}</div>
    <p class="note">외울 용어 하나를 골라 그 용어 문제만 쉬운 것부터 풀어요.</p>`;
  else if(mode==='rand')body=`<div class="btns"><button class="btn" data-act="gq-go" data-d="${d}" data-r="rand">무작위 ${Math.min(GQ_ROUND,st.n)}문 풀기</button><button class="btn sec" data-act="gq-go" data-d="${d}" data-r="all">${st.n}문 전부 섞기</button></div>
    <p class="note">풀 때마다 용어와 문제 종류를 새로 섞어요.</p>`;
  else{let next=-1;for(let j=0;j<nR;j++)if(r.slice(j*GQ_ROUND,(j+1)*GQ_ROUND).includes('-')){next=j;break;}
    const chips=Array.from({length:nR},(_,k)=>{const x=gqRoundStat(r,k),cls=x.a===x.n?(x.ok>=Math.ceil(x.n*0.8)?'ok':'mid'):x.a?'part':'';
      return`<button class="gqc ${cls}" data-act="gq-go" data-d="${d}" data-r="${k}"><b>${k+1}회</b><small>${x.a?`${x.ok}/${x.n}`:`${x.n}문`}</small></button>`;}).join('');
    body=`<div class="gqg">${chips}</div><div class="btns"><button class="btn" data-act="gq-go" data-d="${d}" data-r="next">${next<0?'1회부터 다시 풀기':st.a?`이어 풀기: ${next+1}회`:'1회부터 풀기'}</button></div>
    <p class="note">${GQ_ROUND}문씩 ${nR}회, 뒤로 갈수록 어려워요(정의·키워드 보고 용어 → OX·빈칸 → 키워드 아닌 것).</p>`;}
  return sec('용어 퀴즈',`${st.a}/${st.n}문`,`<p class="note" style="margin-top:0">이 세트 용어 ${ids.length}개로 앱이 만든 문제 ${st.n}개예요. 어느 방식으로 풀어도 기록은 함께 남고, 틀린 문제는 오답 노트로 가요.</p>
    <div class="seg" style="margin:10px 0 12px">${GQ_MODES.map(([k,l])=>`<button class="${mode===k?'on':''}" data-act="gq-mode" data-d="${d}" data-m="${k}">${l}</button>`).join('')}</div>${body}
    ${st.no?`<div class="btns" style="margin-top:6px"><button class="btn sec" data-act="gq-go" data-d="${d}" data-r="wrong">틀린 문제만 (${st.no})</button></div>`:''}`);}
function gqRoundStat(r,k){const s=r.slice(k*GQ_ROUND,(k+1)*GQ_ROUND);return{n:s.length,a:s.length-(s.match(/-/g)||[]).length,ok:(s.match(/1/g)||[]).length};}

/* ════════ 12. 화면: 세트 ════════ */
const SV={};
function vSet(){const d=R.a;const s=SETS.sets[d];
  if(!s)return topbar('세트')+`<div class="empty" style="margin-top:20px"><b>${esc(d||'')} 세트가 아직 없어요</b>앱이 저장소에서 받아 오지 못했어요.<div class="btns"><button class="btn" data-act="sync">지금 받아 오기</button></div></div>`;
  const p=sp(d);
  const tab=SV[d]||'cards';const st=setStatus(d);const w=s.week!=null?s.week:weekIndex(d);
  let body='';
  if(tab==='cards'){body=(s.cards||[]).map((sc,i)=>{const id=setCardId(d,i);const c=id?card(id):null;const t=c?c.t:sc.t;const open=SV[d+':o']===i;const read=!!p.read[i];
      return`<div class="acc ${open?'open':''} ${read?'read':''}"><button data-act="set-open" data-d="${d}" data-i="${i}"><span class="no">${i+1}</span><span class="tt">${esc(t||'(내용 없음)')}${sc.ref?'':' <span class="tag-new">새 용어</span>'}</span><span class="open-ic"></span></button>
      ${open?`<div class="body">${c?`<p class="defn">${glHTML(c.d,c.id)}</p><ul class="kws">${(c.k||[]).map(k=>`<li><span>${esc(k)}</span></li>`).join('')}</ul>`:`<p class="defn">${glHTML(sc.d||'','')}</p>`}
        ${sc.plus?`<p class="plus">${esc(sc.plus)}</p>`:''}${(sc.field||(c&&c.field))?`<p class="field">현장: ${esc(sc.field||c.field)}</p>`:''}
        ${c&&c.x&&c.x.length?`<p class="xref">기출 <b>${c.x.length}회</b> 출제: ${c.x.map(kLabelShort).join(', ')}</p>`:''}${(sc.basis||(c&&c.basis))?`<p class="xref">근거: ${esc(sc.basis||c.basis)}</p>`:''}
        ${c?`<div class="btns"><button class="btn sm sec" data-act="star" data-id="${c.id}">${pget(c.id).star?'★ 별표 해제':'☆ 별표'}</button><button class="btn sm sec" data-act="go" data-h="dandap/${esc(encodeURIComponent(c.id))}">단답 답안지</button><span class="note" style="margin:auto 0">${unitName(c.u)}</span></div>`:''}</div>`:''}</div>`;}).join('')
      +(fr=>(mr=>`<div class="btns"><button class="btn sec" data-act="set-flash" data-d="${d}">${fr?`카드 넘겨 보기 이어서 (${fr})`:'카드로 넘겨 보며 외우기'}</button><button class="btn sec" data-act="start-fill" data-d="${d}">빈칸 쓰기</button></div><div class="btns" style="margin-top:8px"><button class="btn sec" data-act="memo-set" data-d="${d}">${mr?`가리며 외우기 이어서 (${mr})`:'가리며 외우기(보였다 가렸다 반복)'}</button></div>${fr||mr?`<div class="btns" style="margin-top:4px"><button class="btn ghost" data-act="resume-clear" data-k="flash:${d} memo:set:${d}">이어 하지 않고 처음부터</button></div>`:''}`)(resumeAt('memo:set:'+d)))(resumeAt('flash:'+d))+`<p class="note">펼쳐 읽은 용어는 내일 카드 복습으로 다시 나와요. 모르는 낱말은 꾹 누르면 풀이가 나와요.</p>`;}
  else if(tab==='quiz'){const qb=(s.quiz||[]).map((q,i)=>quizBlock(d,i,q,p.quiz[i])).join('');
    body=gqSection(d)+(qb?sec('세트 퀴즈',`${st.qa}/${st.nq}문`,qb+(st.qa?`<p class="note">${st.qok}/${st.nq} 정답. 틀린 문제는 오답 노트로 갔어요.</p>`:'')):'')||'<div class="empty">이 세트엔 퀴즈가 없어요</div>';}
  else if(tab==='essay'){const e=s.essay;if(!e)body='<div class="empty">이 세트엔 논술 문제가 없어요</div>';else{const show=SV[d+':eo'];
    body=`<div class="qcard"><p class="qnum">${unitName(e.u)}${e.x?', 기출 '+esc([].concat(e.x).map(kLabelShort).join(', ')):''}</p><p class="qtext">${esc(e.t)}</p>
      ${show?`<ol style="margin:0 0 0 20px;padding:0;line-height:1.75">${(e.o||[]).map(o=>`<li>${esc(String(o).replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol>${e.fig?`<p class="plus">그림·표: ${esc(e.fig)}</p>`:''}${e.p?`<p class="field">채점 포인트: ${esc(e.p)}</p>`:''}`:`<button class="btn sec" data-act="set-eo" data-d="${d}">목차 힌트 보기</button><p class="note">먼저 소제목 5~7개를 스스로 정한 뒤 열어 보세요.</p>`}</div>
      <div class="btns"><button class="btn ghost" data-act="go" data-h="guide">처음이라면: 답안지 쓰는 법·모범 답안</button></div>
      <div class="btns" style="margin-top:4px"><button class="btn" data-act="timer-go" data-p="one2">25분 타이머</button><button class="btn sec" data-act="copy-essay" data-d="${d}">첨삭 요청 복사</button></div>
      <label class="check group" style="margin-top:12px;border-radius:14px"><input type="checkbox" data-act="set-essay-done" data-d="${d}" ${p.essay&&p.essay.done?'checked':''}><span>손글씨로 다 썼어요(사진을 찍어 Claude 프로젝트에 올리기)</span></label>`;}}
  else{body=vHw(d)+`
    ${(s.check&&s.check.length)?sec('확인이 필요한 부분','',`<div class="group plain">${s.check.map(c=>`<div class="row noic"><span class="tx"><span class="tt" style="font-weight:500">${esc(c)}</span></span></div>`).join('')}</div><p class="note">세트를 만들 때 확신하지 못한 내용이에요. 교재로 한 번 확인하세요.</p>`):''}`;}
  const tabs=[['cards',`용어 ${st.read}/${st.nc}`],['quiz',`퀴즈 ${st.qa}/${st.nq}`],['essay','논술'],['tasks',`숙제 ${st.td}/${st.nt}`]];
  return topbar(korDate(d,true)+' 세트')+`<h1 class="ptitle">${esc(s.title||'오늘의 세트')}</h1><p class="lsub">${esc(weekLabel(w))}${s.units&&s.units.length?', '+esc(s.units.map(unitName).join(', ')):''}</p>${s.goal?`<p class="lsub" style="margin-top:4px">${esc(s.goal)}</p>`:''}
  <div class="seg" style="margin:16px 0 14px">${tabs.map(t=>`<button class="${tab===t[0]?'on':''}" data-act="set-tab" data-d="${d}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>${body}
  ${st.done?`<p class="note" style="color:var(--ok);font-weight:700">이 세트를 모두 끝냈어요. 1·3·7·14·30일 뒤 복습 탭에 다시 나타납니다.</p>`:''}`;}
function quizBlock(d,i,q,ans){const opts=q.o||[];const answered=ans!=null;
  return`<div class="qcard" style="margin-bottom:10px"><p class="qnum">퀴즈 ${i+1}${q.u?', '+esc(unitShort(q.u)):''}</p><p class="qtext">${esc(q.q)}</p>
  ${opts.map((o,k)=>{let cls='';if(answered){if(k===q.a)cls='right';else if(ans.pick===k)cls='wrong';}return`<button class="opt ${cls}" data-act="set-quiz" data-d="${d}" data-i="${i}" data-k="${k}" ${answered?'disabled':''}><span class="ab">${opts.length===2?(k?'X':'O'):'①②③④⑤'.charAt(k)}</span><span>${esc(o)}</span></button>`;}).join('')}
  ${answered?`<div class="ex ${ans.ok?'ok':'no'}"><b>${ans.ok?'정답':'오답'}</b> ${esc(q.ex||'')}</div>`:''}</div>`;}

/* ════════ 13. 화면: 복습 ════════ */
function setIds(d){const s=SETS.sets[d];return uniq(((s&&s.cards)||[]).map((_,i)=>setCardId(d,i)).filter(Boolean));}
function wrongCardIds(){return uniq(wrongList().map(w=>w.type==='gq'?sessItemCard(w):w.id).filter(id=>id&&card(id)));}
/* 세트 하나를 다시 볼 때 고르는 방법(복습 탭의 다시 볼 세트·지난 세트). 복습 날이면 어느 것이든 끝까지 하면 그 날 복습으로 친다 */
function revSheet(d){const s=SETS.sets[d];if(!s)return'';const step=reviewDue(d),n=setIds(d).length,nq=(s.quiz||[]).length,gs=gqStat(d),mr=resumeAt('memo:set:'+d),fr=resumeAt('flash:'+d);
  return`<p class="qnum">${esc(korDate(d,true))} 세트${step?`, ${step}일 차 다시 보기`:''}</p><h3 style="margin:4px 0 12px">${esc(s.title||'')}</h3>
  <div class="group">${row({ic:'redo',tone:'red',t:'카드·퀴즈로 다시 보기',d:`용어 ${n}장을 앞뒤로 넘기며 앎·모름 고르기${nq?`, 세트 퀴즈 ${nq}문`:''}`,act:'start-setrev',data:{d}})}
    ${row({ic:'layers',t:'가리며 외우기',d:mr?`이어서 (${mr})`:'보였다 가렸다 반복. 고른 줄·무작위 줄·테이프로 가리기',act:'memo-set',data:{d}})}
    ${row({ic:'cards',t:'카드 넘겨 보기',d:fr?`이어서 (${fr})`:'뒷면을 보고 앎·애매·모름 고르기',act:'set-flash',data:{d}})}
    ${row({ic:'num',t:'빈칸 쓰기',d:'정의 속 낱말·수치를 직접 써 넣기',act:'start-fill',data:{d}})}
    ${gs?row({ic:'check',t:'용어 퀴즈',d:`${gs.a}/${gs.n}문 풂${gs.no?`, 틀린 문제 ${gs.no}`:''}`,act:'gq-go',data:{d,r:'next'}}):''}
    ${row({ic:'paper',tone:'gray',t:'세트 열기',d:'용어·퀴즈·논술·숙제 전체',act:'go',data:{h:'set/'+d}})}</div>
  <p class="note">${step?'어느 방법이든 끝까지 하면 오늘 복습으로 쳐요.':'1·3·7·14·30일 복습 날에 끝까지 하면 그 날 복습으로 쳐요.'}</p>`;}
function vReview(){const rv=dueSetReviews(),wl=wrongList(),stars=deck().filter(c=>pget(c.id).star);
  const byT={card:0,quiz:0,cloze:0,fill:0,gq:0};wl.forEach(w=>byT[w.type]++);const rvIds=uniq([].concat(...rv.map(x=>setIds(x.d)))),wIds=wrongCardIds();
  const past=Object.keys(SETS.sets).filter(d=>d<=todayStr()&&!rv.some(x=>x.d===d)).sort().reverse().slice(0,5);
  return`<div class="ltitle"><div><h1>복습</h1><p class="lsub">잊기 직전에 다시 꺼내 보는 곳</p></div></div>
  ${sec('다시 볼 세트',rv.length?rv.length+'개':'',rv.length?`<div class="group">${rv.map(x=>{const s=SETS.sets[x.d];return row({ic:'redo',t:esc(korDate(x.d))+' 세트, '+x.step+'일 차',d:esc(s.title||''),act:'rev-open',data:{d:x.d}});}).join('')}</div>
    ${rv.length>1?`<div class="btns"><button class="btn" data-act="start-setrev-all">${rv.length}개 이어서 복습</button></div>`:''}
    ${rvIds.length?`<div class="btns"${rv.length>1?' style="margin-top:8px"':''}><button class="btn sec" data-act="memo-rev">${(mr=>mr?`가리며 외우기 이어서 (${mr})`:`${rv.length>1?'모두 ':''}가리며 외우기 (${rvIds.length}장)`)(resumeAt('memo:rev'))}</button></div>`:''}
    <p class="note">세트를 누르면 카드·퀴즈, 가리며 외우기, 넘겨 보기, 빈칸 쓰기, 용어 퀴즈 가운데 골라요.</p>`
    :`<div class="empty"><b>오늘 다시 볼 세트가 없어요</b>세트를 연 날로부터 1·3·7·14·30일 뒤에 여기로 돌아와요. 카드 복습과 퀴즈를 짧게 다시 합니다.</div>`)}
  ${past.length?sec('지난 세트 다시 외우기','',`<div class="group">${past.map(d=>{const s=SETS.sets[d],st=setStatus(d);return row({ic:'paper',tone:'gray',t:esc(korDate(d,true))+' 세트',d:esc(s.title||''),v:st&&st.done?'완료':'',act:'rev-open',data:{d}});}).join('')}</div>`):''}
  ${sec('오답 노트',wl.length?`${wl.length}개`:'',wl.length?`<div class="group">${row({ic:'x',tone:'red',t:'오답만 다시 풀기',d:`카드 ${byT.card}, 퀴즈 ${byT.quiz}, 수치 ${byT.cloze}${byT.fill?`, 빈칸 ${byT.fill}`:''}${byT.gq?`, 용어 퀴즈 ${byT.gq}`:''}. 두 번 연속 맞히면 빠져요`,act:'start-wrong'})}${wIds.length?row({ic:'layers',tone:'red',t:'오답 카드 가리며 외우기',d:(mr=>mr?`이어서 (${mr})`:`틀린 용어 ${wIds.length}장을 보였다 가렸다`)(resumeAt('memo:wrong')),act:'memo-wrong'}):''}${row({ic:'list',tone:'gray',t:'목록 보기',act:'go',data:{h:'wrong'}})}</div>`
    :`<div class="empty"><b>오답이 없어요</b>퀴즈·테스트에서 틀리거나 카드에서 "모름"을 고르면 여기 모여요.</div>`)}
  ${sec('기준 수치 빈칸','',`<div class="group">${row({ic:'num',tone:'amber',t:'수치만 가려 놓고 맞히기',d:'정의 속 기준값(%, MPa, 일, m…)을 빈칸으로. 10문',act:'start-cloze'})}</div><p class="note">범위는 테스트 탭에서 고른 단원을 따라가요. 지금 범위: ${esc(rangeLabel(S.range||'week'))}</p>`)}
  ${sec('모아 보기','',`<div class="group">
    ${row({ic:'star',tone:'amber',t:'별표 카드',v:stars.length,zero:!stars.length,act:stars.length?'start-stars':'',d:stars.length?'어려운 카드만 모아서':'카드에서 ☆를 누르면 모여요'})}
    ${stars.length?row({ic:'layers',tone:'amber',t:'별표 카드 가리며 외우기',d:(mr=>mr?`이어서 (${mr})`:`${stars.length}장을 보였다 가렸다`)(resumeAt('memo:stars')),act:'memo-stars'}):''}
    ${row({ic:'box',tone:'gray',t:'세트 보관함',d:`받은 세트 ${Object.keys(SETS.sets).length}개, 모의고사 ${Object.keys(SETS.mocks).length}개`,act:'go',data:{h:'archive'}})}
  </div>`)}`;}

function vWrong(){const wl=wrongList();const nm={card:'카드',quiz:'퀴즈',cloze:'수치',fill:'빈칸 쓰기',gq:'용어 퀴즈'};
  return topbar('오답 노트')+`<h1 class="ptitle">오답 노트</h1><p class="lsub">${wl.length}개. 다시 풀어서 두 번 연속 맞히면 빠져요.</p>
  ${wl.length?`<div class="btns"><button class="btn" data-act="start-wrong">오답만 다시 풀기</button></div><div class="group" style="margin-top:14px">${wl.map(w=>`<div class="row noic"><span class="tx"><span class="tt">${esc(w.label)}</span><span class="ds">${nm[w.type]}, ${w.w.n}번 틀림, 마지막 ${esc(md(w.w.last||w.w.since))}</span></span><button class="btn sm ghost" data-act="wrong-del" data-k="${esc(w.key)}">빼기</button></div>`).join('')}</div>`:`<div class="empty" style="margin-top:14px"><b>비어 있어요</b>틀린 문제가 생기면 여기에 모여요.</div>`}`;}

function vArchive(){const sd=Object.keys(SETS.sets).sort().reverse(),mdts=Object.keys(SETS.mocks).sort().reverse();
  return topbar('세트 보관함')+`<h1 class="ptitle">세트 보관함</h1><div data-syncline>${syncLine()}</div><div class="btns"><button class="btn sec" data-act="sync">지금 받아 오기</button></div>
  ${sec('매일 세트',sd.length+'개',sd.length?`<div class="group">${sd.map(d=>{const s=SETS.sets[d],st=setStatus(d);return row({ic:st.done?'check':'paper',tone:st.done?'ok':'',t:esc(korDate(d,true)),d:esc(s.title||''),v:st.done?'완료':`${st.read}/${st.nc}`,act:'go',data:{h:'set/'+d}});}).join('')}</div>`:`<div class="empty"><b>아직 받은 세트가 없어요</b>평일 06:21 예약 작업이 만든 세트가 여기 쌓여요.</div>`)}
  ${sec('주간 모의고사',mdts.length+'개',mdts.length?`<div class="group">${mdts.map(d=>row({ic:'paper',tone:'amber',t:esc(korDate(d,true)),d:esc(SETS.mocks[d].title||''),act:'go',data:{h:'mock/'+d}})).join('')}</div>`:`<div class="empty"><b>아직 없어요</b>토요일 06:21쯤 만들어져요.</div>`)}`;}

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
/* SES.kind: 세션을 연 곳(rev 세트 복습, flash 세트 카드 넘겨 보기, gq 용어 퀴즈, wrong 오답, cards 카드 복습, study·free·stars·mcq·recall·cloze·fill·outline).
   SES.done: 끝낸 항목 번호(답 고름·매김·채점·빈칸 채점, 넘겨 보기는 뒷면 본 카드). SES.acc: "이어서"로 이어 붙인 세션이 앞 세션에서 한 수 {d,step,a,n} */
/* 항목이 없으면 알리기만 하고 하던 세션(멈춰 둔 넘겨 보기 등)은 그대로 둔다 */
/* from: 연 곳(주소 그대로, #set/날짜·#kichul/u/3 등). #sess에서 다시 시작하면(끝 화면의 이어서 등) 처음 연 곳을 물려받는다 */
function startSession(o){const s=Object.assign({i:0,back:false,answered:null,stats:{ok:0,mid:0,no:0},done:{},kind:null},o);s.from=nh(o.from)||(R.page==='sess'&&SES?nh(SES.from):curH());if(!s.items.length)return toast('이 범위에 문제가 없어요');
  flowKeep(o);SES=s;nav('sess');}
/* 같은 #sess 화면에서 다음 세션으로(연 곳·오늘 줄 흐름은 그대로) */
const chainSession=o=>startSession(Object.assign({},o,{from:SES&&SES.from,keepFlow:true}));
function vSess(){if(!SES)return topbar('학습')+`<div class="empty" style="margin-top:20px"><b>진행 중인 학습이 없어요</b><div class="btns"><button class="btn" data-act="go" data-h="today">오늘로</button></div></div>`;
  const it=SES.items[SES.i];if(!it)return sessDone();const n=SES.items.length;
  const head=`${topbar(SES.title||'학습')}<div class="prog"><div class="bar"><i style="width:${Math.round((SES.i+1)/n*100)}%"></i></div><span>${SES.i+1} / ${n}</span></div>`;
  if(it.type==='card'){const c=card(it.id);if(!c)return head+skipBtn();const p=pget(c.id);const gotG=SES.graded?SES.graded[SES.i]:null;
    return head+`<div class="fc ${SES.back?'back':''}" data-act="sess-flip"><div class="meta"><span>${esc(unitName(c.u))}${c.x&&c.x.length?`, 기출 ${c.x.length}회`:''}${p.seen?'':', 처음 보는 카드'}</span><button class="star ${p.star?'on':''}" data-act="star" data-id="${c.id}" aria-label="별표">★</button></div>
      ${SES.back?`<div class="term">${esc(c.t)}</div><p class="defn ruled">${glHTML(c.d,c.id)}</p><ul class="kws">${(c.k||[]).map(k=>`<li><span>${esc(k)}</span></li>`).join('')}</ul>${c.x&&c.x.length?`<p class="xref">기출: ${c.x.map(kLabelShort).join(', ')}</p>`:''}`
      :`<div class="term">${esc(c.t)}</div><p class="hint">정의, 원리, 특징, 유의사항을 30초 안에 말해 보고 탭하세요</p>`}</div>
    ${SES.back?`<div class="grade3">${[[0,'모름'],[1,'애매'],[2,'앎']].map(([g,l])=>`<button class="g${g}${gotG===g?' on':''}" data-act="sess-grade" data-g="${g}">${l}<small>${gotG===g?'고른 것':nextLabel(c.id,g)}</small></button>`).join('')}</div>${gotG!=null?'<p class="note" style="text-align:center">다시 고르면 바꿔요</p>':''}`
      :`<div class="btns"><button class="btn" data-act="sess-flip">뒷면 보기</button></div>`}
    <div class="btns sessnav"><button class="btn sec" data-act="sess-prev" ${SES.i?'':'disabled'}>‹ 이전</button><button class="btn sec" data-act="sess-skip">${SES.i+1<n?(SES.done[SES.i]?'다음 ›':'건너뛰기'):'끝내기'}</button></div>
    <div class="btns"><button class="btn ghost" data-act="memo-sess">이 카드부터 가리며 외우기${sessCardIds().length>1?` (${sessCardIds().length}장)`:''}</button></div>`;}
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
  if(it.type==='gq'){const L=gqList(it.d),q=L&&L.items[it.n];if(!q)return head+skipBtn();const ans=SES.answered,c=card(q.id);
    return head+`<div class="qcard"><p class="qnum">${it.n+1}번, ${esc(GQ_KIND[q.k]||'')}</p><p class="qtext">${esc(q.q)}</p>${q.t?`<p class="gqt">${esc(q.t).replace('{_}','<span class="cloze">？</span>')}</p>`:''}
      ${q.o.map((o,k)=>{let cls='';if(ans!=null){if(k===q.a)cls='right';else if(ans===k)cls='wrong';}return`<button class="opt ${cls}" data-act="sess-pick" data-k="${k}" ${ans!=null?'disabled':''}><span class="ab">${q.o.length===2?(k?'X':'O'):'①②③④'.charAt(k)}</span><span>${esc(o)}</span></button>`;}).join('')}
      ${ans!=null?`<div class="ex ${ans===q.a?'ok':'no'}"><b>${ans===q.a?'정답':'오답'}</b> ${esc(q.ex||'')}</div>${c?`<div class="btns"><button class="btn sm ghost" data-act="card-modal" data-id="${esc(c.id)}">카드 보기: ${esc(gqMain(c))}</button></div>`:''}`:''}</div>
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
/* 이 세션의 카드(세트 퀴즈·논술 목차는 카드가 없어 뺀다)와 틀리거나 모름·애매로 고른 카드 */
function sessItemCard(it){if(!it)return null;if(it.type==='gq'){const L=gqList(it.d),q=L&&L.items[it.n];return q?q.id:null;}return/^(card|mcq|fill|cloze)$/.test(it.type)&&card(it.id)?it.id:null;}
function sessCardIds(){return SES?uniq(SES.items.map(sessItemCard).filter(Boolean)):[];}
function sessMiss(id){if(SES&&id)(SES.miss||(SES.miss=[])).includes(id)||SES.miss.push(id);}
function skipBtn(){return`<div class="empty"><b>이 항목을 찾을 수 없어요</b><div class="btns"><button class="btn" data-act="sess-skip">건너뛰기</button></div></div>`;}
/* 끝까지 했는지: 앞 세션(acc)과 합쳐 처음 항목 수의 80% 이상을 끝냈으면. 세트 복습·오답 기록은 이것으로만 친다 */
function enough(s){return((s.acc?s.acc.a:0)+Object.keys(s.done||{}).length)>=Math.ceil(0.8*(s.acc?s.acc.n:s.items.length));}
function sessDid(){if(!SES)return;(SES.done||(SES.done={}))[SES.i]=1;touchDay();save();}
/* 끝 화면을 처음 그릴 때 한 번: 세트 복습(80% 이상일 때만, D3), 테스트 기록(S.log), 오답·카드 복습 할 일 표시(S.tk) */
function sessDone(){const s=SES.stats,n=s.ok+s.mid+s.no,t=todayStr(),rd=SES.revD||SES.setD;
  if(SES.rvDue==null)SES.rvDue=SES.kind==='rev'?(SES.rv||[]).some(x=>reviewDue(x.d)):!!(rd&&reviewDue(rd));
  const en=enough(SES),dn=Object.keys(SES.done).length;
  if(SES.onDone&&!SES.doneRan){SES.doneRan=true;try{SES.onDone(SES);}catch(e){}}
  if(SES.rkey&&!SES.calDone){SES.calDone=1;resumeSet(SES.rkey,0,0);if(SES.setD)calMark('flash:'+SES.setD,'term',`${korDate(SES.setD)} 세트 카드 넘겨 보기 끝(${SES.items.length}장)`);}
  if(rd&&!SES.revRan){SES.revRan=1;const st=reviewDue(rd);if(st&&en)markReviewed(rd,st);}
  if(!SES.logged){SES.logged=1;if(SES.log&&n)logTest(SES.log,n,s.ok);const tk=S.tk||(S.tk={});
    if(SES.kind==='wrong'&&en)tk['wrong:'+t]=t;if(SES.kind==='cards'&&SES.k&&dn>=Math.min(20,SES.k))tk['cards:'+t]=t;save();}
  const skip=SES.rvDue&&!en,a=(SES.acc?SES.acc.a:0)+dn,N=SES.acc?SES.acc.n:SES.items.length;
  const ids=sessCardIds(),miss=(SES.miss||[]).filter(id=>card(id));
  return topbar(SES.title||'학습')+`<div class="sheet" style="margin-top:18px"><p class="sheet-k">끝</p><h3>${esc(SES.title||'학습')} 완료</h3>
  <ul class="steps"><li><span class="dot on"></span><span class="k">맞힘·앎</span><span class="v">${s.ok}</span></li>${s.mid?`<li><span class="dot half"></span><span class="k">애매</span><span class="v">${s.mid}</span></li>`:''}<li><span class="dot"></span><span class="k">틀림·모름</span><span class="v">${s.no}</span></li></ul>
  <p class="ds" style="margin:6px 0 12px">${skip?`건너뛴 문제가 많아 오늘 세트 복습으로 치지 않았어요 (${a}/${N})`:n&&s.no?'틀린 것은 오답 노트에 모였어요. 두 번 연속 맞히면 빠집니다.':'좋아요. 간격이 벌어진 만큼 다음 복습 날짜가 뒤로 갔어요.'}</p>
  ${skip?`<button class="btn" data-act="sess-rest">이어서 · 남은 ${SES.items.length-dn}문제</button><div class="btns"><button class="btn sec" data-act="sess-close">돌아가기</button></div>`:'<button class="btn" data-act="sess-close">돌아가기</button>'}
  ${miss.length?`<div class="btns"><button class="btn sec" data-act="memo-sess" data-only="miss">틀리거나 애매한 카드 가리며 외우기 (${miss.length}장)</button></div>`:''}
  ${ids.length?`<div class="btns"><button class="btn sec" data-act="memo-sess">방금 본 카드 가리며 외우기 (${ids.length}장)</button></div>`:''}</div>`;}
function sessAdvance(){SES.i++;SES.back=false;SES.answered=null;if(SES.rkey)resumeSet(SES.rkey,SES.i,SES.items.length);render();window.scrollTo(0,0);}
/* 끝 화면 "이어서 · 남은 n문제": 안 한 항목만 새 세션으로. 한 수(acc)는 앞 세션에 더해 세고, 끝나면 같은 세트 복습으로 친다 */
function sessRest(){const s=SES;if(!s)return;const dn=Object.keys(s.done).length,rd=s.revD||s.setD,r0=(s.rv||[])[0]||{};
  chainSession({kind:s.kind,title:s.title,items:s.items.filter((_,i)=>!s.done[i]),onDone:s.onDone,rv:s.rv,revD:s.revD,setD:s.setD,log:s.log,requeue:s.requeue,chain:s.chain,
    acc:s.acc?Object.assign({},s.acc,{a:s.acc.a+dn}):{d:rd||r0.d||null,step:rd?reviewDue(rd):r0.step||null,a:dn,n:s.items.length}});window.scrollTo(0,0);}
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
/* range: 단원 하나(단원 진도의 "이 단원 카드 외우기")처럼 S.range를 바꾸지 않고 고를 범위. o.newOnly: 새 카드만 */
function startStudy(range,o){o=o||{};const f=rangeFilter(range||S.range);const pool=deck().filter(f);const t=todayStr();
  const due=o.newOnly?[]:pool.filter(c=>{const p=S.cards[c.id];return p&&p.seen>0&&p.due&&p.due<=t;}).sort((a,b)=>S.cards[a.id].due<S.cards[b.id].due?-1:1);
  const fresh=pool.filter(c=>!S.cards[c.id]||S.cards[c.id].seen===0).sort((a,b)=>(b.f||2)-(a.f||2)||((b.x||[]).length-(a.x||[]).length)).slice(0,newRoom());
  startSession({kind:'study',title:'오늘 학습',items:cardItems(due.concat(fresh).map(c=>c.id)),requeue:true});}
/* 카드 복습에 나올 카드: 간격이 돌아온 카드 가운데 오늘 이미 매긴 것은 뺀다(같은 날 두 번 올리지 않음). 오늘 화면의 "카드 복습" 수도 이것으로 센다 */
function dueNow(){const t=todayStr();return dueCards(null).filter(c=>pget(c.id).last!==t);}
/* 카드 복습: dueNow에서 o.skip(오늘 세트 복습에 들어 있는 카드)은 빼고, o.k장까지. o.weak: 정답률 낮은 단원부터(3단계 "약점 단원 먼저") */
function startDueAll(o){o=o||{};const sk=new Set(o.skip||[]);let ids=dueNow().map(c=>c.id).filter(id=>!sk.has(id));
  if(o.weak){const A={};deck().forEach(c=>{const p=pget(c.id),a=A[c.u]||(A[c.u]={ok:0,ng:0});a.ok+=p.ok;a.ng+=p.ng;});const acc=id=>{const a=A[(card(id)||{}).u];return a&&a.ok+a.ng?a.ok/(a.ok+a.ng):1;};ids.sort((x,y)=>acc(x)-acc(y));}
  if(o.k)ids=ids.slice(0,o.k);
  startSession({kind:'cards',title:'카드 복습',items:cardItems(ids),requeue:true,k:o.k||null});}
function startFree(){startSession({kind:'free',title:'자유 복습',items:cardItems(shuffle(deck().filter(rangeFilter(S.range))).slice(0,30).map(c=>c.id))});}
/* 세트 복습 항목: 세트 카드(오늘 이미 매긴 카드는 빼서 같은 날 두 번 올리지 않음)와 세트 퀴즈 */
function setReviewItems(d){const s=SETS.sets[d],t=todayStr(),items=[];(s.cards||[]).forEach((_,i)=>{const id=setCardId(d,i);if(id&&pget(id).last!==t)items.push({type:'card',id});});(s.quiz||[]).forEach((_,i)=>items.push({type:'quiz',d,i}));return items;}
/* 복습 날이 아니면(step 없음) 세트 복습 기록을 남기지 않는다(D4). 80% 이상 끝냈을 때만 친다(D3). 카드를 모두 오늘 매겨 항목이 없으면 바로 친다 */
function revNow(rv){rv.forEach(x=>markReviewed(x.d,x.step));touchDay();closeModal();toast('오늘 이미 본 카드라 세트 복습으로 쳤어요');render();}
function startSetReview(d,o){o=o||{};const step=reviewDue(d),items=setReviewItems(d);if(!items.length&&step&&setIds(d).length)return revNow([{d,step}]);
  startSession({kind:'rev',title:korDate(d)+' 세트 다시 보기',items,rv:step?[{d,step}]:[],chain:o.chain,acc:o.acc,onDone:s=>{if(step&&enough(s))markReviewed(d,step);}});}
function startSetReviewAll(){const rv=dueSetReviews();let items=[];rv.forEach(x=>{items=items.concat(setReviewItems(x.d));});if(!items.length&&rv.length&&rv.every(x=>setIds(x.d).length))return revNow(rv);
  startSession({kind:'rev',title:'세트 다시 보기',items,rv,onDone:s=>{if(enough(s))rv.forEach(x=>markReviewed(x.d,x.step));}});}
/* o.skipQ: 그 날짜 세트의 퀴즈 오답은 빼기(그날 숙제 "틀린 이유 한 줄"로 다룬다) */
function startWrong(o){o=o||{};const wl=wrongList().filter(w=>!(o.skipQ&&w.type==='quiz'&&w.d===o.skipQ));startSession({kind:'wrong',title:'오답 다시 풀기',items:shuffle(wl.map(w=>w.type==='card'?{type:'card',id:w.id,wrongKey:w.key}:w.type==='quiz'?{type:'quiz',d:w.d,i:w.i,wrongKey:w.key}:w.type==='fill'?Object.assign(fillItem(card(w.id),S.fillLv||'중')||{type:'card',id:w.id},{wrongKey:w.key}):w.type==='gq'?{type:'gq',d:w.d,n:w.n,wrongKey:w.key}:{type:'cloze',id:w.id,k:w.k,wrongKey:w.key}))});}
function startFill(lv,d){let pool;if(d){const s=SETS.sets[d];pool=((s&&s.cards)||[]).map((_,i)=>card(setCardId(d,i))).filter(Boolean);}else{pool=deck().filter(rangeFilter(S.range));const seen=pool.filter(c=>pget(c.id).seen>0);if(seen.length>=10)pool=seen;}
  const items=shuffle(pool).slice(0,10).map(c=>fillItem(c,lv)).filter(Boolean);startSession({kind:'fill',title:'용어 빈칸 쓰기'+(d?', '+korDate(d)+' 세트':''),items,log:'fill',revD:d||null});}
function startCloze(){const f=rangeFilter(S.range);let pool=deck().filter(f).filter(c=>clozeTokens(c.d).length);const seen=pool.filter(c=>pget(c.id).seen>0);if(seen.length>=10)pool=seen;
  const items=shuffle(pool).slice(0,10).map(c=>{const toks=clozeTokens(c.d);return{type:'cloze',id:c.id,k:Math.floor(Math.random()*toks.length)};});startSession({kind:'cloze',title:'기준 수치 빈칸',items,log:'cloze'});}
function startStars(){startSession({kind:'stars',title:'별표 카드',items:cardItems(shuffle(deck().filter(c=>pget(c.id).star)).map(c=>c.id))});}
function startMCQ(){const f=rangeFilter(S.range);let pool=deck().filter(f);const l=pool.filter(c=>pget(c.id).seen>0);if(l.length>=8)pool=l;if(pool.length<4){toast('카드가 4장 이상 있어야 해요');return;}
  const items=shuffle(pool).slice(0,10).map(c=>{const same=deck().filter(x=>x.u===c.u&&x.id!==c.id);let d=shuffle(same).slice(0,3);if(d.length<3)d=d.concat(shuffle(deck().filter(x=>x.id!==c.id&&!d.includes(x))).slice(0,3-d.length));return{type:'mcq',id:c.id,opts:shuffle([c.id].concat(d.map(x=>x.id)))};});
  startSession({kind:'mcq',title:'4지선다',items,log:'mcq'});}
function startRecall(){const f=rangeFilter(S.range);let pool=deck().filter(f);const l=pool.filter(c=>pget(c.id).seen>0);if(l.length>=8)pool=l;
  const stars=pool.filter(c=>pget(c.id).star);const pick=shuffle(stars).slice(0,3).concat(shuffle(pool.filter(c=>!pget(c.id).star))).slice(0,10);startSession({kind:'recall',title:'용어 회상',items:cardItems(pick.map(c=>c.id)),log:'recall'});}
function startOutline(){const u=rangeUnits(S.range);const pool=essays().filter(e=>!u||u.includes(Number(e.u)));startSession({kind:'outline',title:'논술 목차',items:shuffle(pool).slice(0,5).map(e=>({type:'outline',id:e.id})),log:'outline'});}

/* ════════ 15-2. 가리며 외우기(정한 시간마다 보이기·가리기를 반복하는 단기 암기) ════════ */
let MEMO=null,memoIv=null;
const MEMO_SHOW=[3,5,10,20,30,60],MEMO_HIDE=[2,3,5,10,20],MEMO_REPS=[1,3,5,10,0],MEMO_N=[2,3,4,5],MEMO_MAX=20;
function memoCfg(){return Object.assign({show:10,hide:5,mode:'all',n:2,reps:3,auto:1},S.settings.memo||{});}
function memoPicks(id){return((S.memoPick||{})[id])||[];}
/* 카드 한 장의 줄: 용어(t), 정의 문장(d0, d1…), 키워드(k0, k1…) */
function memoLines(c){const ds=String(c.d||'').replace(/([.。])\s+/g,'$1\n').split('\n').map(x=>x.trim()).filter(Boolean);
  return[{li:'t',tx:c.t,cls:'mterm'}].concat(ds.map((tx,i)=>({li:'d'+i,tx,cls:'mdef'})),(c.k||[]).map((tx,i)=>({li:'k'+i,tx,cls:'mkw'})));}
/* 가릴 줄: "전체"는 용어를 뺀 모든 줄, "고른 줄"은 고른 것(아직 안 골랐으면 전체), "무작위"는 반복마다 새로 고른 N줄,
   "테이프"는 줄 대신 테이프 붙인 곳만(아직 안 붙였으면 전체) */
function memoHideSet(c){const cf=memoCfg();if(cf.mode==='rand'){if(!MEMO.rnd||MEMO.rndId!==c.id)memoRoll(c,false);return new Set(MEMO.rnd);}
  if(cf.mode==='tape'&&memoTapes(c).length)return new Set();
  const pk=memoPicks(c.id);return new Set(cf.mode==='pick'&&pk.length?pk:memoLines(c).filter(l=>l.li!=='t').map(l=>l.li));}
/* 무작위 N줄(용어 제외). avoid면 바로 전에 가린 줄은 되도록 피한다 */
function memoRoll(c,avoid){const all=memoLines(c).filter(l=>l.li!=='t').map(l=>l.li);const prev=new Set(avoid&&MEMO.rndId===c.id?MEMO.rnd||[]:[]);
  MEMO.rnd=shuffle(all.filter(x=>!prev.has(x))).concat(shuffle(all.filter(x=>prev.has(x)))).slice(0,Math.min(memoCfg().n,all.length));MEMO.rndId=c.id;}
/* 테이프: 카드 줄을 줄바꿈으로 이은 글에서 [시작, 끝) 글자 자리(S.memoTape[카드id] = [[시작, 끝, 글귀]], 카드마다 기억).
   카드 글이 바뀌어 자리가 어긋나면 같은 글귀를 다시 찾고, 없으면 버린다 */
function memoFull(c){return memoLines(c).map(l=>l.tx).join('\n');}
function memoTapes(c){const full=memoFull(c),out=[];((S.memoTape||{})[c.id]||[]).forEach(([a,b,tx])=>{if(full.slice(a,b)===tx)out.push([a,b]);else if(tx){const k=full.indexOf(tx);if(k>=0)out.push([k,k+tx.length]);}});return out;}
function memoTapeSet(c,list){const m=[];list.filter(r=>r[1]>r[0]).sort((x,y)=>x[0]-y[0]).forEach(r=>{const l=m[m.length-1];if(l&&r[0]<=l[1])l[1]=Math.max(l[1],r[1]);else m.push([r[0],r[1]]);});
  const full=memoFull(c),T=S.memoTape||(S.memoTape={});if(m.length)T[c.id]=m.map(([a,b])=>[a,b,full.slice(a,b)]);else delete T[c.id];save();}
function memoTapeAdd(c,a,b){const full=memoFull(c);a=Math.max(0,a);b=Math.min(full.length,b);while(a<b&&/\s/.test(full[a]))a++;while(b>a&&/\s/.test(full[b-1]))b--;if(b<=a)return false;memoTapeSet(c,memoTapes(c).concat([[a,b]]));return true;}
/* 짧게 누른 자리의 낱말(조사·어미는 남겨 힌트로): 음전하를 → 음전하 */
function memoWordAt(c,k){const full=memoFull(c),isW=ch=>/[가-힣A-Za-z0-9]/.test(ch||'');if(!isW(full[k])&&isW(full[k-1]))k--;if(!isW(full[k]))return null;
  let a=k,b=k;while(a>0&&isW(full[a-1]))a--;while(b<full.length&&isW(full[b]))b++;const st=glStem(full.slice(a,b));return[a,a+(full.slice(a,b).startsWith(st)&&st?st.length:b-a)];}
/* 줄 글을 테이프로 나눠 그린다(base: 이 줄이 전체 글에서 시작하는 자리) */
function memoLineHTML(tx,base,tapes){const cut=new Set([0,tx.length]),add=(a,b)=>{a-=base;b-=base;if(b<=0||a>=tx.length)return;cut.add(Math.max(0,a));cut.add(Math.min(tx.length,b));};
  tapes.forEach(r=>add(r[0],r[1]));const pt=[...cut].sort((x,y)=>x-y);let h='';
  for(let i=0;i<pt.length-1;i++){const a=pt[i],b=pt[i+1],g=base+a,k=tapes.findIndex(r=>g>=r[0]&&g<r[1]),seg=esc(tx.slice(a,b));
    h+=k>=0?`<span class="tp" data-tp="${k}">${seg}</span>`:seg;}
  return h;}
function memoLinesHTML(c){const cf=memoCfg(),pk=new Set(memoPicks(c.id)),hs=memoHideSet(c),tp=cf.mode==='tape'?memoTapes(c):[];let o=0;
  return memoLines(c).map(l=>{const h=`<div class="ml ${l.cls}${cf.mode==='pick'&&pk.has(l.li)?' pk':''}${hs.has(l.li)?' hd':''}" data-act="memo-pick" data-li="${l.li}" data-o="${o}">${memoLineHTML(l.tx,o,tp)}</div>`;o+=l.tx.length+1;return h;}).join('');}
/* 화면 자리 → 전체 글 자리(손가락 밑 글자). 줄 밖이면 null */
function memoOff(n,k){const el=n&&(n.nodeType===3?n.parentNode:n),ml=el&&el.closest&&el.closest('#memoBox .ml');if(!ml)return null;
  try{const r=document.createRange();r.setStart(ml,0);r.setEnd(n,k);return(Number(ml.dataset.o)||0)+r.toString().length;}catch(e){return null;}}
function memoOffAt(x,y){let n=null,k=0;if(document.caretRangeFromPoint){const r=document.caretRangeFromPoint(x,y);if(r){n=r.startContainer;k=r.startOffset;}}
  else if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p){n=p.offsetNode;k=p.offset;}}return n?memoOff(n,k):null;}
/* 테이프 붙이기 켜기: 시간을 멈추고 글을 보이게 */
function memoEdit(on){if(!MEMO)return;MEMO.edit=!!on;if(on){memoPause();if(MEMO.phase==='hide'){MEMO.phase='show';MEMO.left=null;}}}
/* 긋는 범위 표시: 글자 요소는 그대로 두고 상자 위에 덮는 칸(.tsl)으로 그린다(sel: [시작, 끝), 없으면 지움) */
function memoSelPaint(box,sel){if(!box)return;let ov=box.querySelector('.tsl');if(!sel){if(ov)ov.remove();return;}
  if(!ov){ov=document.createElement('div');ov.className='tsl';box.appendChild(ov);}
  const br=box.getBoundingClientRect(),dx=br.left+box.clientLeft,dy=br.top+box.clientTop;let h='';
  box.querySelectorAll('.ml').forEach(ml=>{let p=Number(ml.dataset.o)||0,n;const tw=document.createTreeWalker(ml,NodeFilter.SHOW_TEXT);
    while((n=tw.nextNode())){const a=Math.max(sel[0],p),b=Math.min(sel[1],p+n.data.length);
      if(b>a){const r=document.createRange();r.setStart(n,a-p);r.setEnd(n,b-p);[...(r.getClientRects?r.getClientRects():[])].forEach(q=>{h+=`<i style="left:${q.left-dx}px;top:${q.top-dy}px;width:${q.width}px;height:${q.height}px"></i>`;});}
      p+=n.data.length;}});
  ov.innerHTML=h;}
/* 붙이는 중: 한 손가락으로 그냥 밀면 화면이 평소처럼 움직이고, 0.3초 꾹 눌렀다가 그대로 그으면 그 범위(여러 줄 이어서)가 테이프가 된다(아이폰 글자 고르기처럼).
   짧게 누르거나 꾹 눌렀다 그냥 떼면 그 낱말, 붙은 테이프를 누르면 뗀다. 마우스는 꾹 누를 것 없이 바로 긋는다. 두 손가락이 닿으면 아무것도 하지 않는다.
   긋는 동안에만 touchmove를 막아 화면을 세운다. 이 리스너는 처음부터 passive:false로 window에 달아 둬야 WebKit이 따르고,
   긋는 범위는 덮는 칸으로 그려 손가락 밑 글자 요소를 바꾸지 않는다(iOS는 손가락 밑 요소가 바뀌면 그 뒤 터치 이벤트를 문서로 올려 보내지 않는다).
   짧게 누른 것은 90ms 기다렸다 붙여 두 손가락으로 톡 친 것이 테이프가 되지 않게 하고, 미끄러지던 화면을 세우려고 누른 것(스크롤 150ms 안)이나 누르는 동안 화면이 움직인 것은 붙이지 않는다 */
const TP_HOLD=300,TP_SLOP=10;
let tpDrag=null,tpMulti=false,tpTap=null,tpScrollT=0;const tpPts=new Set();
function tpEnd(){const d=tpDrag;tpDrag=null;if(d)clearTimeout(d.hold);const box=document.getElementById('memoBox');if(box){box.classList.remove('drawing');memoSelPaint(box,null);}return d;}
function tpSel(d){return d.s==null?null:[Math.min(d.s,d.e),Math.max(d.s,d.e)+1];}
function tpDraw(){const d=tpDrag,box=document.getElementById('memoBox');if(!d||d.on||d.dead||!box||!box.classList.contains('editing'))return;
  d.on=true;try{box.setPointerCapture(d.id);}catch(_){}box.classList.add('drawing');memoSelPaint(box,tpSel(d));}
function memoTapeDown(e){const box=e.target&&e.target.closest&&e.target.closest('#memoBox.editing');if(!box||!MEMO)return;
  tpPts.add(e.pointerId);
  if(tpPts.size>1||tpTap){tpMulti=true;clearTimeout(tpTap);tpTap=null;tpEnd();return;}
  const tp=e.target.closest('.tp'),o=memoOffAt(e.clientX,e.clientY);
  tpDrag={id:e.pointerId,s:o,e:o,x:e.clientX,y:e.clientY,sy:window.scrollY,on:false,moved:false,dead:false,stale:Date.now()-tpScrollT<150,tp:tp?Number(tp.dataset.tp):null};
  if(e.pointerType==='mouse')tpDraw();else tpDrag.hold=setTimeout(tpDraw,TP_HOLD);}
function memoTapeMove(e){const d=tpDrag;if(!d||d.id!==e.pointerId||d.dead)return;const far=Math.abs(e.clientX-d.x)+Math.abs(e.clientY-d.y)>TP_SLOP;
  if(!d.on){if(far){d.dead=true;clearTimeout(d.hold);}return;}
  if(e.cancelable)e.preventDefault();if(far)d.moved=true;const o=memoOffAt(e.clientX,e.clientY);
  if(o!=null){if(d.s==null)d.s=o;d.e=o;}memoSelPaint(document.getElementById('memoBox'),tpSel(d));}
function memoTapeUp(e){if(!tpPts.delete(e&&e.pointerId))return;
  if(tpMulti){if(!tpPts.size)tpMulti=false;return;}
  if(!tpDrag||tpDrag.id!==e.pointerId)return;const d=tpEnd(),c=MEMO&&MEMO.edit&&card(memoItem().id);if(!c||d.dead)return;
  if(!d.moved){if(d.on)return memoTapeTap(d);if(d.stale||Math.abs(window.scrollY-d.sy)>2)return;tpTap=setTimeout(()=>{tpTap=null;memoTapeTap(d);},90);return;}
  if(d.s!=null)memoTapeAdd(c,Math.min(d.s,d.e),Math.max(d.s,d.e)+1);
  render();}
function memoTapeTap(d){const c=MEMO&&MEMO.edit&&card(memoItem().id);if(!c)return;
  if(d.tp!=null){const t=memoTapes(c);t.splice(d.tp,1);memoTapeSet(c,t);toast('테이프를 뗐어요');}else if(d.s!=null){const w=memoWordAt(c,d.s);if(w)memoTapeAdd(c,w[0],w[1]);}
  render();}
document.addEventListener('pointerdown',memoTapeDown);
document.addEventListener('pointermove',memoTapeMove,{passive:false});
document.addEventListener('pointerup',memoTapeUp);
document.addEventListener('pointercancel',e=>{if(!tpPts.delete(e.pointerId))return;if(tpDrag&&tpDrag.id===e.pointerId)tpEnd();if(!tpPts.size)tpMulti=false;});
window.addEventListener('touchmove',e=>{if(tpDrag&&tpDrag.on&&e.cancelable)e.preventDefault();},{passive:false});
window.addEventListener('scroll',()=>{tpScrollT=Date.now();},{passive:true});
/* 손가락을 모두 뗐는데 포인터 끝 이벤트를 못 받은 경우를 위한 정리(포인터 끝 이벤트가 먼저 오도록 한 박자 늦춤) */
const tpLost=e=>{if(e.touches&&e.touches.length||!tpPts.size)return;setTimeout(()=>{if(!tpPts.size)return;tpPts.clear();tpMulti=false;tpEnd();},0);};
document.addEventListener('touchend',tpLost);
document.addEventListener('touchcancel',tpLost);
/* 이어 하기 키: 세트는 memo:set:날짜, 그 밖(암기 탭 memo:study, 복습 탭 memo:rev·memo:wrong·memo:stars)은 그날 카드 목록째로.
   세션에서 넘어온 것(memo:sess)과 카드 한 장(memo:one)은 늘 새로 */
/* from: 연 곳(주소 그대로, 세션·끝 화면에서 열면 sess). 이어서 열면 연 곳을 새로 적는다(T4). 외울 카드가 없으면 알리기만 하고 하던 외우기는 그대로.
   가리며 외우기 안에서 연 외우기(카드 창의 "가리며 외우기")는 바깥 외우기를 outer에 두고, 끝내거나 닫으면 그 카드로 돌아간다(T5).
   끝난 외우기의 끝 화면에서 열면 그 외우기의 연 곳과 바깥 외우기를 물려받는다(#memo 자신을 연 곳으로 적지 않게) */
function startMemo(o,fresh){const onM=R.page==='memo'&&!!MEMO,inMemo=onM&&!MEMO.fin,from=nh(o.from)||(onM?nh(MEMO.from):curH());
  if(!fresh&&MEMO&&MEMO.key===o.key&&!MEMO.fin){memoStop();if(!inMemo)MEMO.from=from;flowKeep(o);return nav('memo');}
  const r=fresh?null:resumeGet(o.key);if(r&&r.ids)o.items=r.ids.map(id=>({id}));
  if(!o.items||!o.items.length)return toast('외울 카드가 없어요');
  const outer=inMemo?MEMO:(o.outer||(onM&&MEMO.outer)||null);memoStop();flowKeep(o);
  MEMO=Object.assign({i:0,run:false,phase:'show',left:null,cnt:0,done:false,t0:0,started:Date.now()},o,{from:outer?nh(outer.from):from,outer});
  if(r&&r.i<MEMO.items.length){MEMO.i=r.i;toast(`${r.i+1}번째 카드부터 이어서 해요`);}
  memoSeen();nav('memo');}
function memoItem(){return MEMO&&MEMO.items[MEMO.i];}
function memoDur(){const c=memoCfg();return(MEMO.phase==='show'?c.show:c.hide)*1000;}
function memoAwake(on){PE_IO.keepAwake(on||(typeof TM!=='undefined'&&TM.running));}
/* 카드를 보여 줄 때마다: 세트 카드는 읽음, 이어 하기 자리와 달력 기록 */
function memoSeen(){const it=memoItem();if(!it)return;MEMO.rnd=null;MEMO.rndShown=false;
  if(MEMO.setD&&it.si!=null){const p=sp(MEMO.setD);if(!p.read[it.si]){p.read[it.si]=1;introduce(it.id);touchDay();calSetRead(MEMO.setD);}}
  const n=MEMO.items.length;MEMO.max=Math.max(MEMO.max||0,MEMO.i);
  resumeSet(MEMO.key,MEMO.i,n,/^memo:set:/.test(MEMO.key)?null:MEMO.items.map(x=>x.id));
  calMark(MEMO.key,'term',`가리며 외우기: ${MEMO.label} ${MEMO.max+1}/${n}장`);}
function memoGo(i){if(!MEMO||MEMO.fin||i<0||i>=MEMO.items.length)return;MEMO.i=i;MEMO.cnt=0;MEMO.phase='show';MEMO.done=false;MEMO.left=null;MEMO.t0=Date.now();memoSeen();render();window.scrollTo(0,0);}
function memoPlay(){if(!MEMO)return;if(MEMO.done){MEMO.done=false;MEMO.cnt=0;MEMO.phase='show';MEMO.left=null;}
  MEMO.t0=Date.now()-(MEMO.left!=null?memoDur()-MEMO.left:0);MEMO.left=null;MEMO.run=true;clearInterval(memoIv);memoIv=setInterval(memoTick,200);memoAwake(true);paintMemo();}
function memoPause(){if(!MEMO||!MEMO.run)return;MEMO.left=Math.max(0,memoDur()-(Date.now()-MEMO.t0));MEMO.run=false;clearInterval(memoIv);memoIv=null;memoAwake(false);paintMemo();}
function memoStop(){clearInterval(memoIv);memoIv=null;if(MEMO&&MEMO.run){MEMO.left=Math.max(0,memoDur()-(Date.now()-MEMO.t0));MEMO.run=false;memoAwake(false);}}
/* 끝까지 가서 "완료": 달력에 남기고 이어 하기 자리를 지운다 */
function memoFinish(){if(!MEMO||MEMO.fin)return;memoStop();MEMO.fin=Date.now();const n=MEMO.items.length;
  resumeSet(MEMO.key,0,0);calUnmark(MEMO.key);calMark(MEMO.key+':fin','term',`가리며 외우기 완료: ${MEMO.label} ${n}장`);
  [MEMO.setD].concat(MEMO.revSets||[]).forEach(d=>{const st=d&&reviewDue(d);if(st)markReviewed(d,st);});touchDay();save();render();window.scrollTo(0,0);}
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
  const b=document.getElementById('memoPlay');if(b){b.textContent=MEMO.run?'일시정지':MEMO.done?'다시 하기':(MEMO.left!=null?'계속':'시작');b.classList.toggle('sec',!!(MEMO.edit||last&&MEMO.done));}
  const fb=document.querySelector('.mctl [data-act="memo-finish"]');if(fb)fb.classList.toggle('sec',!MEMO.done||!!MEMO.edit);}   /* 파란 버튼은 하나: 테이프를 붙이는 중이면 "다 붙였어요", 마지막 카드를 다 돌았으면 "완료" */
function memoDoneHTML(){const n=MEMO.items.length,min=Math.max(1,Math.round((MEMO.fin-MEMO.started)/60000));
  return topbar(MEMO.title||'가리며 외우기')+`<div class="sheet" style="margin-top:18px"><p class="sheet-k">끝</p><h3>${esc(MEMO.title||'가리며 외우기')} 완료</h3>
  <ul class="steps"><li><span class="dot on"></span><span class="k">외운 카드</span><span class="v">${n}장</span></li><li><span class="dot on"></span><span class="k">이번에 걸린 시간</span><span class="v">${min}분</span></li></ul>
  <p class="ds" style="margin:6px 0 12px">학습 달력에 빨간 동그라미로 남았어요.</p>
  <button class="btn" data-act="memo-close">돌아가기</button><div class="btns"><button class="btn sec" data-act="memo-again">처음부터 다시</button><button class="btn sec" data-act="go" data-h="cal">학습 달력</button></div></div>`;}
function vMemo(){if(!MEMO)return topbar('가리며 외우기')+`<div class="empty" style="margin-top:20px"><b>진행 중인 외우기가 없어요</b><div class="btns"><button class="btn" data-act="go" data-h="today">오늘로</button></div></div>`;
  if(MEMO.fin)return memoDoneHTML();
  const it=memoItem(),c=card(it.id),cf=memoCfg(),n=MEMO.items.length,last=MEMO.i+1>=n,fin=last&&MEMO.done&&!MEMO.edit;if(!c)return topbar(MEMO.title||'가리며 외우기')+skipBtn();
  const pk=new Set(memoPicks(c.id)),tp=cf.mode==='tape'?memoTapes(c):[],ed=cf.mode==='tape'&&MEMO.edit;
  const seg=(k,arr,lab)=>`<div class="seg">${arr.map(v=>`<button class="${cf[k]===v?'on':''}" data-act="memo-cfg" data-k="${k}" data-v="${v}">${lab(v)}</button>`).join('')}</div>`;
  const how=cf.mode==='pick'?'고른 줄':cf.mode==='rand'?`무작위 ${cf.n}줄`:cf.mode==='tape'?'테이프':'전체';
  return topbar(MEMO.title||'가리며 외우기')+`<div class="prog"><div class="bar"><i style="width:${Math.round((MEMO.i+1)/n*100)}%"></i></div><span>${MEMO.i+1} / ${n}</span></div>
  <div class="mhead" id="memoHead"><div class="mclock" id="memoClock"></div><div class="mbar"><i id="memoBar"></i></div></div>
  <div class="memo${cf.mode==='tape'?' tape':''}${ed?' editing':''}${MEMO.phase==='hide'&&!MEMO.done?' hiding':''}" id="memoBox">${memoLinesHTML(c)}</div>
  ${cf.mode==='tape'?`<div class="btns tapebar"><button class="btn sm${ed?'':' sec'}" data-act="memo-tape-edit">${ed?'다 붙였어요':'테이프 붙이기'}</button>${tp.length?`<button class="btn sm ghost" data-act="memo-tape-clear">이 카드 테이프 모두 떼기</button>`:''}</div>`
    :`<div class="btns tapebar"><button class="btn sm ghost" data-act="memo-tape-on">손가락으로 그어 테이프로 가리기</button></div>`}
  <div class="mctl"><button class="btn sec" data-act="memo-prev" ${MEMO.i?'':'disabled'}>‹ 이전</button><button class="btn${fin||MEMO.edit?' sec':''}" id="memoPlay" data-act="memo-play">시작</button>${last?`<button class="btn${fin?'':' sec'}" data-act="memo-finish">완료</button>`:'<button class="btn sec" data-act="memo-next">다음 ›</button>'}</div>
  <p class="note">${cf.mode==='tape'?(ed?'가릴 곳을 0.3초 꾹 누른 뒤 그대로 그으세요(여러 줄도 이어서). 그냥 밀면 화면이 움직여요. 짧게 누르면 그 낱말, 붙은 테이프를 누르면 떼요.':tp.length?`테이프 ${tp.length}곳만 가려요. 테이프 붙이기를 눌러 더하거나 뗄 수 있어요.`:'아직 테이프가 없어 용어만 남기고 전체를 가려요. 테이프 붙이기를 눌러 가릴 곳을 그으세요.'):cf.mode==='pick'?(pk.size?'노란 테두리 줄만 가려요. 줄을 탭해 더하거나 빼세요.':'가릴 줄을 탭해서 고르세요. 고르기 전에는 전체를 가려요.'):cf.mode==='rand'?`가릴 때마다 정의·키워드 중 ${cf.n}줄을 무작위로 골라 가려요. 줄을 탭하면 고른 줄 가리기로 바뀌어요.`:'용어만 남기고 전체를 가려요. 가리고 싶은 줄을 탭하면 그 줄만 가리기로 바뀌어요.'}</p>
  <details class="d" id="memoCfg"${MEMO.cfgOpen?' open':''}><summary>설정 · 보기 ${cf.show}초 · 가림 ${cf.hide}초 · ${how} · ${cf.reps?cf.reps+'회':'무한 반복'}</summary><div class="in-d">
    <label class="f">보이는 시간</label>${seg('show',MEMO_SHOW,v=>v+'초')}
    <label class="f">가리는 시간</label>${seg('hide',MEMO_HIDE,v=>v+'초')}
    <label class="f">가릴 것</label>${seg('mode',['all','pick','rand','tape'],v=>({all:'전체',pick:'고른 줄',rand:'무작위',tape:'테이프'})[v])}
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
    ${row({ic:'paper',t:'단답 답안지 1문 (10분)',d:'기출 카드를 1교시 답안지 모양으로 보고 직접 쓰기',act:'dd-rand'})}
  </div>`)}
  ${sec('실전','',`<div class="group">
    ${lm?row({ic:'paper',tone:'amber',t:'이번 주 모의고사',d:esc((SETS.mocks[lm].title||'')+', '+korDate(lm)),act:'go',data:{h:'mock/'+lm}}):row({ic:'paper',tone:'gray',t:'주간 모의고사',d:'토요일 06:21쯤 만들어져 여기 들어와요'})}
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
  S.lastMock=m;delete S.mockp.app;touchDay();save();nav('mock/app');toast('모의고사 세트를 만들었어요');}   /* 새로 만든 앱 모의고사는 "다 썼어요"를 비우고 시작 */
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
const CAL_S={term:'용어',essay:'논술',quiz:'퀴즈',mock:'모의',todo:'할 일'};
/* 공휴일(관공서의 공휴일에 관한 규정, 대체공휴일 포함). 2026년부터 노동절·제헌절도 공휴일. 임시공휴일이 정해지거나 해가 바뀌면 더한다 */
const KR_HOLI=('2026-01-01 신정|2026-02-16 설날 연휴|2026-02-17 설날|2026-02-18 설날 연휴|2026-03-01 삼일절|2026-03-02 대체공휴일(삼일절)|2026-05-01 노동절|2026-05-05 어린이날|2026-05-24 부처님오신날|2026-05-25 대체공휴일(부처님오신날)|2026-06-03 지방선거일|2026-06-06 현충일|2026-07-17 제헌절|2026-08-15 광복절|2026-08-17 대체공휴일(광복절)|2026-09-24 추석 연휴|2026-09-25 추석|2026-09-26 추석 연휴|2026-10-03 개천절|2026-10-05 대체공휴일(개천절)|2026-10-09 한글날|2026-12-25 성탄절|'
  +'2027-01-01 신정|2027-02-06 설날 연휴|2027-02-07 설날|2027-02-08 설날 연휴|2027-02-09 대체공휴일(설날)|2027-03-01 삼일절|2027-05-01 노동절|2027-05-03 대체공휴일(노동절)|2027-05-05 어린이날|2027-05-13 부처님오신날|2027-06-06 현충일|2027-07-17 제헌절|2027-07-19 대체공휴일(제헌절)|2027-08-15 광복절|2027-08-16 대체공휴일(광복절)|2027-09-14 추석 연휴|2027-09-15 추석|2027-09-16 추석 연휴|2027-10-03 개천절|2027-10-04 대체공휴일(개천절)|2027-10-09 한글날|2027-10-11 대체공휴일(한글날)|2027-12-25 성탄절|2027-12-27 대체공휴일(성탄절)|'
  +'2028-01-01 신정|2028-01-25 설날 연휴|2028-01-26 설날|2028-01-27 설날 연휴|2028-03-01 삼일절|2028-04-12 국회의원선거일|2028-05-01 노동절|2028-05-02 부처님오신날|2028-05-05 어린이날|2028-06-06 현충일|2028-07-17 제헌절|2028-08-15 광복절|2028-10-02 추석 연휴|2028-10-03 추석·개천절|2028-10-04 추석 연휴|2028-10-05 대체공휴일(개천절)|2028-10-09 한글날|2028-12-25 성탄절')
  .split('|').reduce((o,x)=>{o[x.slice(0,10)]=x.slice(11);return o;},{});
/* 달력 칸에 쓰는 짧은 이름 */
function holiShort(n){return n.replace(/^대체공휴일.*/,'대체').replace(/ 연휴$/,'').replace(/·.*/,'').replace('부처님오신날','부처님').replace(/.*선거일$/,'선거');}
function calKinds(its){return CAL_K.map(a=>a[0]).filter(k=>its.some(x=>x[0]===k));}
/* 하루 내용: 접속 시각, 종류별 개수 칸, 종류별 목록 */
function calDayBody(ds){const t=todayStr(),its=calItems(ds),ins=calIn(ds),was=calWas(ds,its),ev=milestones().filter(m=>m.d===ds);const cnt=k=>its.filter(x=>x[0]===k).length;
  return`${ins.length?`<p class="chin"><b>접속 ${ins.length}번</b> ${esc(ins.length>8?ins.slice(0,7).join(' · ')+' …':ins.join(' · '))}</p>`:''}${KR_HOLI[ds]?`<p class="chev hol">공휴일 · ${esc(KR_HOLI[ds])}</p>`:''}${ev.map(m=>`<p class="chev">${esc(m.t)}</p>`).join('')}
  <div class="ch5">${CAL_K.map(([k])=>`<div class="${cnt(k)?'on':''}"><i class="k-${k}">${cnt(k)||''}</i><span>${CAL_S[k]}</span></div>`).join('')}</div>
  ${its.length?CAL_K.filter(([k])=>cnt(k)).map(([k,l])=>`<p class="chh"><i class="cdot k-${k}"></i>${l} ${cnt(k)}</p><div class="group chg k-${k}-l">${its.filter(x=>x[0]===k).map(x=>`<div class="row noic"><span class="tx"><span class="tt">${esc(x[1])}</span></span></div>`).join('')}</div>`).join('')
    :`<div class="empty" style="margin-top:12px">${ds>t?'아직 오지 않은 날이에요':ds===t?'아직 끝낸 공부가 없어요. 오늘 세트부터 시작해 보세요':was?'앱을 열었지만 끝낸 공부는 없어요':'기록이 없어요'}</div>`}`;}
/* 홈 화면 왼쪽 위 달력 아이콘: 이달·오늘 날짜와 오늘 끝낸 공부 점 */
function calIconHTML(){const t=todayStr(),d=parse(t),ks=calKinds(calItems(t));
  return`<button class="calbtn" data-act="go" data-h="cal" aria-label="학습 달력, 오늘 끝낸 공부 보기"><span class="cm">${d.getMonth()+1}월</span><b>${d.getDate()}</b><span class="cdots">${ks.map(k=>`<i class="k-${k}"></i>`).join('')}</span></button>`;}
/* 볼 수 있는 달: 기록이 시작된 달 ~ 12달 뒤(목표 시험이 더 뒤면 그 달까지). 앞으로 올 달은 공휴일·시험일을 미리 본다 */
function calBounds(){const t=todayStr(),d=parse(t),ahead=fmt(new Date(d.getFullYear(),d.getMonth()+12,1)).slice(0,7),ex=String((PLAN.target&&PLAN.target.d)||'').slice(0,7);
  return[([S.created,PLAN.start].concat(Object.keys(S.daily),Object.keys(S.cal)).filter(Boolean).sort()[0]||t).slice(0,7),ex>ahead?ex:ahead];}
function calShift(v,anim){const[y,m]=(SV.calM||todayStr().slice(0,7)).split('-').map(Number),nm=fmt(new Date(y,m-1+v,1)).slice(0,7),[fm,cm]=calBounds();
  if(nm>cm)return toast('더 뒤의 달은 볼 수 없어요');if(nm<fm)return toast('기록이 시작되기 전 달이에요');
  SV.calM=nm;SV.calD=null;SV.calAnim=anim?(v>0?'nx':'pv'):null;render();SV.calAnim=null;}
function vCal(){const t=todayStr(),ym=SV.calM||t.slice(0,7),sel=SV.calD;const[y,mo]=ym.split('-').map(Number);
  const lead=new Date(y,mo-1,1).getDay(),nd=new Date(y,mo,0).getDate(),ev={};milestones().forEach(m=>{ev[m.d]=1;});
  const[fm,cm]=calBounds();
  const sum={was:0};CAL_K.forEach(([k])=>{sum[k]=0;});let cells='';for(let i=0;i<lead;i++)cells+='<span class="cd emp"></span>';
  for(let dd=1;dd<=nd;dd++){const ds=fmt(new Date(y,mo-1,dd)),its=calItems(ds),ks=calKinds(its),was=calWas(ds,its),dw=(lead+dd-1)%7;
    if(was)sum.was++;ks.forEach(k=>{sum[k]++;});
    cells+=`<button class="cd${ds===t?' today':''}${ds===sel?' sel':''}${was?' was':''}${ds>t?' fut':''}${ev[ds]?' ev':''}${KR_HOLI[ds]?' hol':''}${dw===0?' sun':dw===6?' sat':''}" data-act="cal-day" data-d="${ds}" aria-label="${esc(korDate(ds)+(KR_HOLI[ds]?', '+KR_HOLI[ds]:''))}"><span class="n">${dd}</span>${KR_HOLI[ds]?`<span class="hn">${esc(holiShort(KR_HOLI[ds]))}</span>`:''}<span class="dots">${ks.map(k=>`<i class="k-${k}"></i>`).join('')}</span></button>`;}
  return topbar('학습 달력')+`<div class="calhero"><div class="chtop"><div><p class="sheet-k">오늘 끝낸 공부</p><h2>${esc(korDate(t,true))}</h2></div><div class="chst"><b class="num">${streak()}</b><span>일 연속</span></div></div>${calDayBody(t)}</div>
  <div class="calsw"><div class="calhd"><button class="btn sm sec" data-act="cal-mon" data-v="-1" aria-label="이전 달" ${ym>fm?'':'disabled'}>‹</button><b>${y}년 ${mo}월</b><button class="btn sm sec" data-act="cal-mon" data-v="1" aria-label="다음 달" ${ym<cm?'':'disabled'}>›</button></div>
  <div class="calw">${'일월화수목금토'.split('').map((d,i)=>`<span class="${i===0?'sun':i===6?'sat':''}">${d}</span>`).join('')}</div>
  <div class="calg${SV.calAnim?' '+SV.calAnim:''}">${cells}</div></div>
  <div class="callg">${CAL_K.map(([k,l])=>`<span><i class="cdot k-${k}"></i>${l}${sum[k]?` <b>${sum[k]}일</b>`:''}</span>`).join('')}<span><i class="cdot was"></i>접속 <b>${sum.was}일</b></span></div>
  <p class="note">날짜를 누르면 그날 접속 시각과 끝낸 공부가 나와요. 달력을 옆으로 밀면 이전·다음 달로 가요. 빨간 숫자는 일요일·공휴일이에요.${ym!==t.slice(0,7)?' <button class="lnk" data-act="cal-today">이번 달로</button>':''} 카드 매김·테스트·오늘 할 일은 이 휴대폰에 남은 기록으로 예전 날짜까지 보이고, 접속 시각과 세트·논술·모의고사 완료는 2.3.1부터 쌓여요.</p>`;}
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
/* ════════ 17-3. 단답 답안지: 카드 한 장을 1교시 단답 답안지 모양(22줄 1면)으로 옮겨 보여 준다 ════════
   내용은 카드 그대로(새로 지어내지 않음): Ⅰ. 개요(정의·원어) → Ⅱ. 주요 내용(키워드를 한 줄에 하나씩, 답안식 짧은 구절) → 그림 칸(직접 그림) → Ⅲ. 결론(현장 문장, 없으면 직접 쓰기) → 끝.
   정의의 나머지 문장은 답안지 밑 "시간이 남으면 더할 내용"으로. 문장 끝은 답안식 명사형으로(한다 → 함, 이다 → 임).
   한 줄은 약 26자로 나누고(실제 답안지는 약 30자), 글자 크기를 답안지 폭에 맞춰(.ddwrap 컨테이너) 한 줄이 꺾이지 않게 한다 */
const DD_W=[26,25,24,23];
function ddNoun(s){s=String(s||'').trim().replace(/[.。]\s*$/,'');const m=s.match(/([가-힣])다$/);if(!m)return s;
  const pre=s.slice(0,-2),ch=m[1],code=ch.charCodeAt(0)-0xAC00;if(code<0||code>11171)return s;const jong=code%28,base=code-jong;
  if(ch==='있'||ch==='없')return pre+ch+'음';if(ch==='이')return pre+'임';if(ch==='는')return pre+'음';
  if(jong===0||jong===4)return pre+String.fromCharCode(0xAC00+base+16);
  if(jong===17&&!/[좁넓]/.test(ch))return pre+String.fromCharCode(0xAC00+base)+'움';
  return pre+ch+'음';}
function ddW(s){let w=0;for(const ch of s)w+=/[가-힣ㄱ-ㅎ一-鿿①-⑳Ⅰ-Ⅹ〈〉·]/.test(ch)?1:.55;return w;}
function ddWrap(s,max){const out=[];let line='';String(s).split(/\s+/).filter(Boolean).forEach(tok=>{
    while(ddW(tok)>max){let k=0,w=0;for(const ch of tok){if(w+ddW(ch)>max-(line?ddW(line)+.55:0))break;w+=ddW(ch);k+=ch.length;}if(!k){out.push(line);line='';continue;}const head=tok.slice(0,k);tok=tok.slice(k);line=line?line+' '+head:head;out.push(line);line='';}
    if(!tok)return;if(!line)line=tok;else if(ddW(line)+.55+ddW(tok)<=max)line+=' '+tok;else{out.push(line);line=tok;}});
  if(line)out.push(line);return out;}
/* 줄 목록: [수준, 글](글의 [[ ]]는 밑줄) 또는 그림 칸 {fig:줄 수, cap} */
function ddSents(c){return String(c.d||'').replace(/([.。])\s+/g,'$1\n').split('\n').map(x=>x.trim()).filter(Boolean);}
function ddRows(c){const R=[],add=(lv,mk,text)=>{ddWrap((mk?mk+' ':'')+text,DD_W[lv]).forEach((ln,i)=>R.push([i?Math.min(3,lv+1):lv,ln]));};
  const tt=String(c.t||''),short=tt.replace(/\s*\(.*?\)\s*/g,' ').trim(),orig=(tt.match(/\(([^)]*[A-Za-z][^)]*)\)/)||[])[1];
  ddWrap(`${tt}에 대하여 설명하시오.`,DD_W[0]).forEach(ln=>R.push([0,ln]));R.push([0,'답)']);
  const ds=ddSents(c),ks=c.k||[];
  R.push([0,'Ⅰ. [[개요]]']);add(1,'1)',ddNoun(ds[0]||short));if(orig)add(1,'2)',`원어: ${orig}`);
  const body=ks.length?ks:ds.slice(1).map(ddNoun);
  if(body.length){R.push([0,'Ⅱ. [[주요 내용]]']);body.forEach((x,i)=>add(1,`${i+1}.`,x));}
  R.push({fig:4,cap:`〈그림 1〉 ${short} 개념도`});
  R.push([0,`${body.length?'Ⅲ':'Ⅱ'}. [[결론]]`]);
  if(c.field)add(1,'1)',ddNoun(c.field));else R.push([1,'1) {현장 경험이나 최신 경향 한 줄을 직접 쓰기}']);
  return R;}
function ddCount(R){return R.reduce((a,r)=>a+(Array.isArray(r)?1:r.fig+1),0);}
function ddSheet(c){const R=ddRows(c),n=ddCount(R);let ln=0,h='',pages=[];
  const row=(no,html)=>{ln++;h+=aRow(ln,no,0,html);};
  const flush=()=>{pages.push(h);h='';};
  R.forEach((r,i)=>{if(ln>=ROWS*(pages.length+1))flush();
    if(Array.isArray(r)){const last=i===R.length-1,txt=ulT(r[1]).replace(/\{(.+?)\}/g,'<span class="ddph">$1</span>');ln++;h+=aRow(ln,i===0?'1':'',r[0],txt+(last?'<span class="ddend">끝</span>':''));}
    else{const end=ROWS*(pages.length+1);if(ln+r.fig+1>end&&ln<end){while(ln<end){ln++;h+=aRow(ln,'',0,'');}flush();}const a=ln+1;ln+=r.fig+1;h+=`<div class="ar blk"><span class="ln">${a}<br>~<br>${ln}</span><span class="no"></span><div class="ac"><div class="ddfig" style="--h:${r.fig}">그림 칸<small>원리, 단면, 순서도 중 하나를 직접 그리기</small></div><p class="acap">${esc(r.cap)}</p></div></div>`;}});
  while(ln<ROWS*(pages.length+1)){ln++;h+=aRow(ln,'',0,'');}flush();
  return{n,html:pages.map((p,i)=>`${i?`<p class="ddbreak">여기서부터 2면: 1면(22줄)을 넘친 줄이에요</p>`:''}<div class="asheet dd${i?' over':''}"><div class="ah"><span>번호</span><span>답 안 란</span></div>${p}</div>`).join('')};}
function vDandap(){const c=card(R.a);if(!c)return topbar('단답 답안지')+'<div class="empty" style="margin-top:20px"><b>카드를 찾을 수 없어요</b></div>';
  const sh=ddSheet(c),tip=(PE_TIPS[0]||{}).d||'';
  return topbar('단답 답안지')+`<h1 class="ptitle">${esc(c.t)}</h1><p class="lsub">카드 내용을 1교시 단답 답안지 모양으로 옮겼어요. 모양을 익힌 뒤 덮고, 실제 답안지에 10분 안에 써 보세요.</p>
  <p class="ddstat${sh.n>ROWS?' over':''}"><b>${sh.n}줄</b> / 1면 22줄${sh.n>ROWS?` · ${sh.n-ROWS}줄 넘쳐요. 정의나 결론을 한 줄씩 줄여 1면에 맞추는 게 연습이에요`:' · 1면 안에 들어가요'}</p>
  <div class="ddwrap">${sh.html}</div>
  ${(c.k||[]).length&&ddSents(c).length>1?`<details class="d" style="margin-top:12px"><summary>시간이 남으면 더할 내용(카드의 나머지 설명)</summary><div class="in-d"><ol class="ddmore">${ddSents(c).slice(1).map(x=>`<li>${esc(ddNoun(x))}</li>`).join('')}</ol></div></details>`:''}
  <div class="btns" style="margin-top:14px"><button class="btn" data-act="timer-go" data-p="one1">10분 타이머</button><button class="btn sec" data-act="copy-dd" data-id="${esc(c.id)}">첨삭 요청 복사</button></div>
  <details class="d" style="margin-top:10px"><summary>10분 쓰는 순서</summary><div class="in-d"><p style="margin:0;color:var(--ink2)">${esc(tip)}</p></div></details>
  <p class="note">한 줄을 26자 안팎으로 나눴어요(실제 답안지는 약 30자라 손으로 쓰면 조금 덜 차요). 주요 내용은 카드의 키워드를 한 줄씩 옮긴 거라, 쓸 때는 키워드마다 이유나 수치를 한두 마디 붙이면 좋아요. 그림 칸에는 원리, 단면, 순서도 중 하나를 직접 그리고, 결론은 현장 경험이나 최신 경향 한 줄로 바꿔 쓰면 점수가 올라요.</p>`;}
/* 테스트 탭: 범위 안에서 기출에 나온 카드를 먼저 골라 답안지로 */
function ddRandom(){const pool=deck().filter(rangeFilter(S.range||'week'));if(!pool.length)return toast('이 범위에 카드가 없어요');
  const kx=pool.filter(c=>c.x&&c.x.length),pick=(kx.length?kx:pool)[Math.floor(Math.random()*(kx.length?kx:pool).length)];nav('dandap/'+encodeURIComponent(pick.id));}
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
/* 다른 타이머로 바꾸기: 돌고 있거나 멈춰 둔 타이머가 있으면 먼저 묻는다(취소하면 o.no).
   같은 타이머: 타이머 화면에서 고른 칸을 다시 누르면(o.keep) 그대로, 다른 화면의 타이머 버튼은 새로 맞추되 돌고 있을 때만 묻는다 */
function setPresetAsk(k,then,o){o=o||{};const busy=TM.running||(TM.remain>0&&TM.remain<TM.total),same=TM.preset===k&&(k!=='custom'||TM.custom===o.mins);
  const go=()=>{if(k==='custom'&&o.mins)TM.custom=o.mins;setPreset(k);if(o.ctx)TM.ctx=o.ctx;then&&then();};
  if(busy&&same&&o.keep){if(o.ctx)TM.ctx=o.ctx;return then&&then();}if(!busy||(same&&!TM.running))return go();
  PE_IO.ask('돌고 있는 '+PRESETS[TM.preset].n+' 타이머(남은 '+mmss(TM.remain)+')를 멈추고 '+(o.name||PRESETS[k].n)+' '+(o.n||(k==='custom'?o.mins:PRESETS[k].total))+'분으로 바꿀까요?',go,o.no);}
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
  <div class="btns"><button class="btn sec" data-act="star" data-id="${c.id}">${p.star?'★ 별표 해제':'☆ 별표'}</button>${p.seen?'':`<button class="btn" data-act="introduce" data-id="${c.id}">암기에 넣기</button>`}</div><div class="btns"><button class="btn sec" data-act="memo-one" data-id="${c.id}">가리며 외우기</button><button class="btn sec" data-act="go" data-h="dandap/${esc(encodeURIComponent(c.id))}">단답 답안지로 보기</button></div><div class="btns"><button class="btn ghost" data-act="hide-card" data-id="${c.id}">이 카드 숨기기</button></div>`;}
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
const GL_SKIP='input,textarea,select,.btn,nav,.topbar,.seg,label.check,#memoBox.editing';
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
/* 옆으로 밀기: 카드·가리며 외우기는 다음(왼쪽)·이전(오른쪽), 학습 달력은 다음 달·이전 달. 화면 양쪽 가장자리 24px 안에서 시작한 것은 뺀다(가장자리 밀기와 겹치지 않게) */
let swXY=null;
document.addEventListener('touchstart',e=>{const t=e.touches&&e.touches[0];swXY=t&&t.clientX>24&&t.clientX<window.innerWidth-24&&e.target.closest&&e.target.closest('.fc,.memo,.calsw')&&!e.target.closest('.editing')?[t.clientX,t.clientY]:null;},{passive:true});
document.addEventListener('touchend',e=>{const t=e.changedTouches&&e.changedTouches[0];if(!swXY||!t||glFired){swXY=null;return;}const dx=t.clientX-swXY[0],dy=t.clientY-swXY[1];swXY=null;
  if(Math.abs(dx)<=60||Math.abs(dy)>=50)return;
  if(R.page==='sess'&&SES){if(dx<0)sessAdvance();else sessPrev();}else if(R.page==='memo'&&MEMO)memoGo(MEMO.i+(dx<0?1:-1));else if(R.page==='cal')calShift(dx<0?1:-1,true);},{passive:true});
/* 왼쪽 가장자리(20px 안)에서 오른쪽으로 밀기 = 뒤로(앱의 기기 뒤로 가기 몸짓은 껐다): 창이 열려 있으면 닫고, 아니면 위로(goUp). 탭 첫 화면에서는 그대로.
   테이프를 긋는 중, 입력 칸을 쓰는 중, 두 손가락, 옆으로 밀리는 칸(세그먼트 등) 위에서는 하지 않는다. 0.7초 안에 70px 넘게, 위아래로는 60px 안에서 */
let edXY=null;
const hScroll=el=>{for(;el&&el.nodeType===1&&el!==document.body;el=el.parentElement)if(el.scrollWidth>el.clientWidth+1&&/auto|scroll/.test(getComputedStyle(el).overflowX))return true;return false;};
document.addEventListener('touchstart',e=>{const t=e.touches&&e.touches[0],tg=e.target;
  edXY=t&&e.touches.length===1&&t.clientX<=20&&!tpDrag&&!(tg&&tg.closest&&tg.closest('#memoBox.editing'))&&!kbEl(document.activeElement)&&!hScroll(tg)?[t.clientX,t.clientY,Date.now()]:null;},{passive:true});
document.addEventListener('touchend',e=>{const t=e.changedTouches&&e.changedTouches[0],s=edXY;edXY=null;if(!s||!t||glFired||tpDrag)return;
  const dx=t.clientX-s[0],dy=t.clientY-s[1];if(dx<70||Math.abs(dy)>=60||Date.now()-s[2]>700)return;
  if($('#modal-wrap').innerHTML)return closeModal();if(R.page)goUp();},{passive:true});
document.addEventListener('touchcancel',()=>{edXY=null;});
document.addEventListener('contextmenu',e=>{if(glAt(e.target,e.clientX,e.clientY))e.preventDefault();});
document.addEventListener('click',e=>{if(glFired&&Date.now()-glFired<1500){glFired=0;e.preventDefault();e.stopPropagation();}},true);
document.addEventListener('click',e=>{
  const m=e.target.closest('[data-stop]');const b=e.target.closest('[data-act]');
  if(b&&b.dataset.act==='modal-close'&&m)return;
  if(!b)return;const a=b.dataset.act,D=b.dataset;
  switch(a){
  case'go':closeModal();return nav(D.h);
  case'back':return goUp();
  case'modal-close':return closeModal();
  case'sync':return sync(true);
  case'chk':{const t=todayStr();S.checks[t]=S.checks[t]||{};S.checks[t][D.i]=b.checked;touchDay();save();return render();}
  /* 세트 */
  case'set-tab':SV[D.d]=D.t;return render();
  case'set-open':{const i=Number(D.i);const key=D.d+':o';SV[key]=SV[key]===i?null:i;if(SV[key]===i){const p=sp(D.d);p.read[i]=1;introduce(setCardId(D.d,i));touchDay();calSetRead(D.d);save();}return render();}
  case'set-flash':{const rk='flash:'+D.d;if(SES&&SES.rkey===rk&&SES.i<SES.items.length){if(R.page!=='sess')SES.from=curH();flowKeep();return nav('sess');}   /* 이어서: 연 곳을 새로(T4) */
    const s=SETS.sets[D.d];const items=(s.cards||[]).map((_,i)=>({type:'card',id:setCardId(D.d,i),si:i})).filter(x=>x.id);const r=resumeGet(rk),i0=r&&r.i<items.length?r.i:0;
    /* 이어서 할 때 그 앞 카드 가운데 이미 본 것(세트의 읽음: 뒷면을 봤거나 펼쳐 읽음)은 끝낸 것으로 센다. 넘기기만 한 카드는 "이어서"로 남는다 */
    const rs=spGet(D.d).read||{},done={};items.slice(0,i0).forEach((x,j)=>{if(rs[x.si])done[j]=1;});
    if(i0)toast(`${i0+1}번째 카드부터 이어서 해요`);return startSession({kind:'flash',title:korDate(D.d)+' 세트 카드',items,setD:D.d,rkey:rk,i:i0,done});}
  case'cal-mon':return calShift(Number(D.v),true);
  case'cal-day':{SV.calD=D.d;render();return openModal(`<p class="sheet-k">${D.d===todayStr()?'오늘':'그날'} 끝낸 공부</p><h2 class="cmh">${esc(korDate(D.d,true))}</h2>${calDayBody(D.d)}<div class="btns"><button class="btn sec" data-act="cal-close">닫기</button></div>`);}
  case'cal-today':SV.calM=null;SV.calD=null;return render();
  case'cal-close':closeModal();return;
  case'dd-rand':return ddRandom();
  case'copy-dd':{const c=card(D.id);if(!c)return;return copy(promptWith('p2','(여기에 용어를 적는다)',c.t),'첨삭 요청을 복사했어요. 답안 사진과 함께 Claude 프로젝트에 붙여 넣으세요');}
  case'resume-clear':{String(D.k).split(' ').forEach(k=>{delete S.resume[k];if(MEMO&&MEMO.key===k){memoStop();MEMO=null;}if(SES&&SES.rkey===k)SES=null;});save();toast('처음부터 시작해요');return render();}
  case'set-quiz':{const d=D.d,i=Number(D.i),k=Number(D.k);const q=SETS.sets[d].quiz[i];const p=sp(d);if(p.quiz[i])return;const ok=k===q.a;p.quiz[i]={pick:k,ok};const key='Q:'+d+':'+i;const qp=S.qp[key]||(S.qp[key]={ok:0,ng:0});ok?qp.ok++:qp.ng++;qp.last=todayStr();if(!ok)markWrong(key,'quiz');touchDay();const st=setStatus(d);calMark('quiz:'+d,'quiz',`${korDate(d)} 세트 퀴즈 ${st.qa}/${st.nq}문 풂(정답 ${st.qok})`);save();return render();}
  case'set-eo':SV[D.d+':eo']=1;return render();
  case'guide-tab':SV.guide=D.t;window.scrollTo(0,0);return render();
  case'set-essay-done':{const p=sp(D.d);p.essay=p.essay||{};p.essay.done=b.checked;touchDay();const e=SETS.sets[D.d].essay;if(b.checked)calMark('essay:'+D.d,'essay',`${korDate(D.d)} 세트 논술 손글씨: ${e&&e.t?e.t:''}`);else calUnmark('essay:'+D.d);hwCal(D.d);save();return render();}
  /* 숙제: 동그라미 k번째를 누르면 k번 한 것으로, 같은 것을 다시 누르면 하나 뺀다 */
  case'hw':{const p=sp(D.d);p.hw=p.hw||{};const v=Number(D.v),cur=p.hw[D.k]||0;p.hw[D.k]=cur===v?v-1:v;if(!p.hw[D.k])delete p.hw[D.k];touchDay();hwCal(D.d);save();return render();}
  case'hw-task':case'set-task':{const p=sp(D.d);p.tasks[D.i]=!p.tasks[D.i];touchDay();hwCal(D.d);save();return render();}
  case'hw-ew':{const p=sp(D.d);p.essay=p.essay||{};p.essay.done=!p.essay.done;touchDay();const e=SETS.sets[D.d].essay;if(p.essay.done)calMark('essay:'+D.d,'essay',`${korDate(D.d)} 세트 논술 손글씨: ${e&&e.t?e.t:''}`);else calUnmark('essay:'+D.d);hwCal(D.d);save();return render();}
  case'hw-mn':{const p=sp(D.d);p.hw=p.hw||{};const v=String(($('#hwMn')||{}).value||'').trim().slice(0,80);if(v)p.hw.mn=v;else delete p.hw.mn;touchDay();hwCal(D.d);save();toast(v?'적어 두었어요':'지웠어요');return render();}
  case'copy-essay':{const e=SETS.sets[D.d].essay;return copy(promptWith('p1','(여기에 문제를 그대로 적는다)',e.t),'첨삭 요청을 복사했어요. 사진과 함께 Claude 프로젝트에 붙여 넣으세요');}
  /* 창 안의 별표는 그 버튼만 바꾼다(기출 문항처럼 카드 여러 장이 든 창을 한 장짜리로 바꾸지 않게) */
  case'star':{const p=prog(D.id);p.star=!p.star;save();if(b.closest('#modal-wrap'))b.textContent=p.star?'★ 별표 해제':'☆ 별표';return render();}
  case'introduce':{introduce(D.id);toast('내일 카드 복습에 나와요');closeModal();return render();}
  case'hide-card':return PE_IO.ask('이 카드를 숨길까요? 가져오기 화면에서 되돌릴 수 있어요.',()=>{S.hidden[D.id]=true;save();invalidate();closeModal();render();});
  /* 세션 */
  case'start-due':return startDueAll();
  case'start-study':return startStudy();
  case'start-free':return startFree();
  case'memo-set':{const s=SETS.sets[D.d];const items=(s.cards||[]).map((_,i)=>({id:setCardId(D.d,i),si:i})).filter(x=>x.id);return startMemo({key:'memo:set:'+D.d,label:korDate(D.d)+' 세트',title:korDate(D.d)+' 가리며 외우기',items,setD:D.d});}
  case'memo-rev':{const rv=dueSetReviews(),ids=uniq([].concat(...rv.map(x=>setIds(x.d))));return startMemo({key:'memo:rev',label:'세트 다시 보기',title:'세트 다시 보기: 가리며 외우기',items:ids.map(id=>({id})),revSets:rv.map(x=>x.d)});}
  case'memo-wrong':return startMemo({key:'memo:wrong',label:'오답 카드',title:'오답 카드 가리며 외우기',items:wrongCardIds().map(id=>({id}))});
  case'memo-stars':return startMemo({key:'memo:stars',label:'별표 카드',title:'별표 카드 가리며 외우기',items:deck().filter(c=>pget(c.id).star).map(c=>({id:c.id}))});
  case'memo-sess':{if(!SES)return;const ids=D.only==='miss'?(SES.miss||[]).filter(id=>card(id)):sessCardIds(),cur=sessItemCard(SES.items[SES.i]);
    return startMemo({key:'memo:sess',label:SES.title||'학습',title:(SES.title||'학습')+': 가리며 외우기',items:ids.map(id=>({id})),i:Math.max(0,ids.indexOf(cur))},true);}
  case'memo-one':{const c=card(D.id);if(!c)return;return startMemo({key:'memo:one',label:gqMain(c),title:gqMain(c)+': 가리며 외우기',items:[{id:c.id}]},true);}
  case'gq-go':return startGq(D.d,D.r);
  case'gq-mode':SV['gqm:'+D.d]=D.m;return render();
  case'card-modal':{const c=card(D.id);if(c)openModal(cardModal(c));return;}
  case'rev-open':return openModal(revSheet(D.d));
  case'memo-study':return startMemo({key:'memo:study',label:'암기 탭',title:'가리며 외우기',items:memoStudyIds().map(id=>({id}))});
  case'memo-finish':return memoFinish();
  /* 끝 화면의 돌아가기: 끝낸 외우기는 지우고 연 곳으로(외우기 안에서 연 것이면 바깥 외우기로). 위쪽 닫기·가장자리 밀기는 지우지 않는다 */
  case'memo-close':{if(MEMO&&MEMO.outer){const o=MEMO.outer;memoStop();MEMO=o;return render();}const up=upOf(R);MEMO=null;return goUp(up);}
  case'memo-again':{if(!MEMO)return;const o={key:MEMO.key,label:MEMO.label,title:MEMO.title,items:MEMO.items,setD:MEMO.setD,revSets:MEMO.revSets,from:MEMO.from,outer:MEMO.outer};MEMO=null;return startMemo(o,true);}
  case'memo-play':if(MEMO&&MEMO.edit){MEMO.edit=false;render();}return MEMO&&MEMO.run?memoPause():memoPlay();
  case'memo-prev':return MEMO&&memoGo(MEMO.i-1);
  case'memo-next':return MEMO&&memoGo(MEMO.i+1);
  case'memo-cfg':{const k=D.k,v=k==='mode'?(['pick','rand','tape'].includes(D.v)?D.v:'all'):Number(D.v);S.settings.memo=Object.assign(memoCfg(),{[k]:v});
    if(MEMO){MEMO.cfgOpen=true;MEMO.rnd=null;MEMO.rndShown=false;if(k==='mode'){const c=card(memoItem().id);memoEdit(v==='tape'&&!!c&&!memoTapes(c).length);}}save();return render();}
  case'memo-tape-on':S.settings.memo=Object.assign(memoCfg(),{mode:'tape'});save();memoEdit(true);return render();
  case'memo-tape-edit':memoEdit(!MEMO.edit);return render();
  case'memo-tape-clear':{const c=MEMO&&card(memoItem().id);if(!c)return;return PE_IO.ask('이 카드의 테이프를 모두 뗄까요?',()=>{memoTapeSet(c,[]);render();});}
  case'memo-pick':{const it=memoItem();if(!it||memoCfg().mode==='tape')return;const m=S.memoPick||(S.memoPick={});const li=D.li;
    if(memoCfg().mode!=='pick'){S.settings.memo=Object.assign(memoCfg(),{mode:'pick'});m[it.id]=[li];save();toast('고른 줄만 가리기로 바꿨어요');return render();}
    const a=new Set(m[it.id]||[]);a.has(li)?a.delete(li):a.add(li);if(a.size)m[it.id]=[...a];else delete m[it.id];save();return render();}
  case'study-unit':return startStudy(String(D.u));
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
  case'sess-flip':{if(e.target.closest('[data-act="star"]'))return;SES.back=!SES.back;if(SES.back){sessMarkRead(SES.items[SES.i]);if(SES.kind==='flash')sessDid();}return render();}
  /* 앎: grade()가 카드 오답(C:)을 이미 한 번 셌으니 다른 열쇠(빈칸 F: 등)일 때만 더 센다(D1) */
  case'sess-grade':{const it=SES.items[SES.i];const g=Number(D.g);const gd=SES.graded||(SES.graded={}),sn=SES.snap||(SES.snap={});const prev=gd[SES.i];
    if(prev!=null){if(prev===g)return sessAdvance();sessUngrade(it,sn[SES.i],prev);}else sn[SES.i]=sessSnap(it);
    grade(it.id,g);if(it.wrongKey&&g===2&&it.wrongKey!=='C:'+it.id)rightOnWrong(it.wrongKey);SES.stats[gradeKey(g)]++;gd[SES.i]=g;SES.done[SES.i]=1;sessMarkRead(it);if(g<2)sessMiss(it.id);
    if(g===0&&SES.requeue&&prev!==0)SES.items.push({type:'card',id:it.id});return sessAdvance();}
  case'sess-prev':return sessPrev();
  case'sess-pick':{if(SES.answered!=null)return;const it=SES.items[SES.i],k=Number(D.k);SES.answered=k;
    if(it.type==='mcq'){const ok=it.opts[k]===it.id;const p=prog(it.id);if(ok){p.ok++;SES.stats.ok++;rightOnWrong('C:'+it.id);}else{p.ng++;SES.stats.no++;markWrong('C:'+it.id,'card');sessMiss(it.id);}save();}
    else if(it.type==='gq'){const L=gqList(it.d),q=L&&L.items[it.n];if(!q)return render();const ok=k===q.a,key='G:'+it.d+':'+it.n+':'+L.sig,p=prog(q.id);gqSet(it.d,it.n,ok);
      if(ok){p.ok++;SES.stats.ok++;rightOnWrong(key);}else{p.ng++;SES.stats.no++;markWrong(key,'gq');sessMiss(q.id);}const st=gqStat(it.d);calMark('gq:'+it.d,'quiz',`${korDate(it.d)} 용어 퀴즈 ${st.a}/${st.n}문 풂(정답 ${st.ok})`);touchDay();save();}
    else if(it.type==='quiz'){const q=SETS.sets[it.d].quiz[it.i];const ok=k===q.a;const key='Q:'+it.d+':'+it.i;const qp=S.qp[key]||(S.qp[key]={ok:0,ng:0});qp.last=todayStr();if(ok){qp.ok++;SES.stats.ok++;rightOnWrong(key);}else{qp.ng++;SES.stats.no++;markWrong(key,'quiz');}save();}
    sessDid();return render();}
  case'sess-next':return sessAdvance();
  case'sess-self':{const it=SES.items[SES.i];const g=Number(D.g);
    if(it.type==='cloze'){const key='Z:'+it.id+':'+it.k;if(g===2){SES.stats.ok++;rightOnWrong(key);}else{SES.stats.no++;markWrong(key,'cloze');sessMiss(it.id);}}
    if(it.type==='outline'){const st=S.essayStat[it.id]||(S.essayStat[it.id]={good:0,weak:0});if(g===2){st.good++;SES.stats.ok++;}else{st.weak++;SES.stats.no++;}st.last=todayStr();save();}
    sessDid();return sessAdvance();}
  case'sess-skip':return sessAdvance();
  case'sess-rest':return sessRest();
  /* 테스트 기록은 끝 화면에서 이미 남겼다(sessDone). 끝난 세션을 지우고 연 곳으로 */
  case'sess-close':{const up=upOf(R);SES=null;return goUp(up);}
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
  case'timer-go':return setPresetAsk(D.p,()=>nav('timer'),{no:()=>nav('timer')});
  case'timer-preset':return setPresetAsk(D.p,render,{no:render,keep:1,mins:D.p==='custom'?TM.custom:undefined});
  case'timer-custom':return setPresetAsk('custom',render,{no:render,keep:1,mins:Math.max(1,Number(($('#tmCustom')||{}).value)||100)});
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
  case'sch-save':{if(!SCH)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(SCH.start||''))return toast('준비 시작일을 확인하세요');S.settings.start=SCH.start;S.settings.target=SCH.target||'auto';SCH=null;recalcPlan();save();planChanged('sched');toast(repoPlanState()==='diff'?'시험 일정을 바꿨어요. 예약 작업에도 알려 주세요':'시험 일정을 바꿨어요');return render();}
  case'sch-cancel':SCH=null;return render();
  case'sch-copy':return copy(schReq(),'변경 요청을 복사했어요. Claude Code에 붙여 넣으세요');
  case'sch-round-set':{const r=Number($('#schRound').value),d=$('#schRoundDate').value;if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(d))return toast('회차와 날짜를 고르세요');S.settings.roundDates[r]=d;recalcPlan();save();planChanged('sched');toast(`제${r}회를 ${d}로 고쳤어요`);return render();}
  case'sch-round-reset':{const r=Number($('#schRound').value);if(!r)return;delete S.settings.roundDates[r];recalcPlan();save();planChanged('sched');toast(`제${r}회를 예상일로 되돌렸어요`);return render();}
  case'backup-copy':return copy(JSON.stringify({state:S,sets:SETS}),'백업을 복사했어요. 메모 앱에 붙여 두세요');
  case'backup-dl':{PE_IO.saveFile('gisulsa-backup-'+todayStr()+'.json',JSON.stringify({state:S,sets:SETS})).catch(()=>toast('파일로 저장하지 못했어요'));return;}
  case'restore':{let j,st;try{j=JSON.parse($('#restoreText').value);st=j.state||j;if(!st.settings||!st.cards)throw 0;}catch(err){return toast('백업 형식이 아니에요');}
    return PE_IO.ask('지금 기록을 덮어씁니다. 계속할까요?',()=>{try{S=Object.assign(fresh(),st);S.settings=Object.assign(fresh().settings,st.settings||{});if(!S.settings.roundDates)S.settings.roundDates={};S.v=2;S.today=null;if(j.sets)SETS=Object.assign({sets:{},mocks:{},kichul:null,index:null,plan:null},j.sets);recalcPlan();flush();invalidate();applyLook();toast('복원했어요');nav('today');}catch(err){toast('백업 형식이 아니에요');}});}
  case'reset':return PE_IO.ask('모든 학습 기록과 내 카드를 지웁니다. 초기화할까요?',()=>PE_IO.ask('마지막 확인: 백업을 복사해 두었나요?',()=>{S=fresh();SETS={sets:{},mocks:{},kichul:null,index:null,plan:null};recalcPlan();flush();invalidate();applyLook();nav('today');toast('초기화했어요');sync(true);}));
  }
});
document.addEventListener('change',e=>{if(e.target.id==='rangeSel'){S.range=e.target.value;save();render();}
  else if(e.target.id==='schStart'||e.target.id==='schTarget'){SCH=SCH||{start:S.settings.start,target:S.settings.target||'auto'};
    if(e.target.id==='schStart'){if(!e.target.value)return;SCH.start=e.target.value;if(SCH.target!=='auto'&&!eligibleRounds(SCH.start).some(x=>x.r===Number(SCH.target)))SCH.target='auto';}
    else SCH.target=e.target.value==='auto'?'auto':Number(e.target.value);render();}});
/* 입력 칸을 쓰는 동안(자판이 올라옴) 아래에 붙은 막대를 숨긴다 */
document.addEventListener('focusin',e=>{if(kbEl(e.target))document.body.classList.add('kb');});
document.addEventListener('focusout',e=>{if(kbEl(e.target))document.body.classList.remove('kb');});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key!=='Enter'||!t.classList||!t.classList.contains('fill-in'))return;e.preventDefault();
  const all=Array.from(document.querySelectorAll('.fill-in'));const k=all.indexOf(t);if(k<all.length-1)all[k+1].focus();else fillCheck(false);});
$('#nav').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)goTab(b.dataset.tab);});
let calHid=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden){memoPause();calHid=Date.now();}if(!document.hidden){if(Date.now()-calHid>10*60000)calOpen();sync(false);if(!R.page)render();}});
window.addEventListener('online',()=>sync(true));

/* ════════ 23. 시작 ════════ */
PE_IO.init({toast});recalcPlan();applyLook();setPreset('essay');R=parseHash();
if(!location.hash)history.replaceState(null,'','#today');
calOpen();route();sync(true);
const fresh2=f=>(...a)=>{PLN++;return f(...a);};
window.__pe={S:()=>S,gqList,gqBuild,gqNumAlt,gqRec,gqStat,jo,KR_HOLI,SETS:()=>SETS,PLAN:()=>PLAN,SES:()=>SES,computePlan,roundList,sync,deck,essays,kq,clozeTokens,fillCands,fillBlanks,fillJudge,glNames,glIdx,glHTML,glStem,glForms,glLookup,glOpen,MEMO:()=>MEMO,memoTick,memoTapes,memoOff,hwItems,ddRows,ddNoun,ddWrap,render,invalidate,startSession,
  enough,setReviewItems,startDueAll,startWrong,budgetOf,dayKind,TM:()=>TM,go:h=>nav(h),goUp,goTab,R:()=>R,
  /* 오늘 몫·이번 주(검사용: 부를 때마다 새로 센다) */
  taskList:fresh2(taskList),dayPlan:fresh2(dayPlan),planToday:fresh2(planToday),weekBoard:fresh2(weekBoard),weekSnap:fresh2(weekSnap),reqParts:fresh2(reqParts),cardsOut:fresh2(cardsOut),hwParts:fresh2(hwParts),
  wkStart,estMock,figDup,hwMin,setStatus,planOrder,planActive,nextAfter,curBlock,phaseStart,taskGo,startRot,recalcPlan,setIds,dueSetReviews,weekIndex,weekObj,phaseObj,MIN_PER,HW_STEPS,PLAN_BLK,UI:()=>UI};
})();
