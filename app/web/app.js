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
const APP_VER='3.1.3';
const MOCK_GRADE_SINCE='2026-11-01';            /* v3.0.0을 내는 날. 이 날짜 전 모의고사는 "채점 받았어요"를 묻지 않는다 */
const BUDGET_DEF={wd:180,sat:300,sun:240};       /* 하루 공부 시간(분) 기본값: 평일·토요일·일요일과 공휴일(S.settings.budget, budgetOf) */
const PLAN_START=(window.PE_EXAM&&PE_EXAM.defaults.start)||'2026-10-19';

const IC={
  cards:'<rect x="3.5" y="6" width="13" height="14" rx="2"/><path d="M7.5 6V5a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 20.5 5v11a1.5 1.5 0 0 1-1.5 1.5h-2.5"/>',
  redo:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4.5v4.2h4.2"/>',
  shuffle:'<path d="M3.5 7h3c2.2 0 3.4 1.1 4.6 3l1.8 3c1.2 1.9 2.4 3 4.6 3h3M3.5 17h3c1.1 0 2-.3 2.7-.9M13.9 7.9c.7-.6 1.6-.9 2.6-.9h4"/><path d="m17.5 4 3 3-3 3M17.5 13l3 3-3 3"/>',
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
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 6.8 8.2 6.2 8.2-6.2"/>'
};
const icon=(n)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]||''}</svg>`;

/* ════════ 1. 상태 ════════ */
function fresh(){return{v:2,settings:{start:PLAN_START,target:'auto',roundDates:{},exam:'',mock:'',newPerDay:10,theme:'auto',fs:'m',dataUrl:'',budget:Object.assign({},BUDGET_DEF)},
  cards:{},userCards:[],userEssays:[],essayStat:{},checks:{},log:[],hidden:{},daily:{},lastMock:null,created:todayStr(),
  sp:{},qp:{},wrong:{},sync:{},mockp:{},cal:{},resume:{},
  tk:{},today:null,wk:{},days:{}};}   /* tk 할 일 id → 한 날, today 그날 고정한 오늘 몫, wk 주마다 기록(줄인 목표·지난주 점수), days 날마다 정한 공부 시간 {날짜:{m}}(0 쉬는 날, 그 밖은 짧은 날) */
function load(){try{const r=PE_IO.get(KEY);if(r){const s=JSON.parse(r);const f=fresh();for(const k in f){if(s[k]===undefined||s[k]===null&&k!=='lastMock')s[k]=f[k];}s.settings=Object.assign({},f.settings,s.settings||{});if(!s.settings.roundDates||typeof s.settings.roundDates!=='object')s.settings.roundDates={};if(!s.settings.target)s.settings.target='auto';s.v=2;return s;}}catch(e){}S_NEW=true;return fresh();}
function loadSets(){try{const r=PE_IO.get(SKEY);if(r){const o=JSON.parse(r);return Object.assign({sets:{},mocks:{},kichul:null,index:null,plan:null},o);}}catch(e){}return{sets:{},mocks:{},kichul:null,index:null,plan:null};}
/* 복원할 때 세트 자료는 합친다(백업 형식은 그대로): 이 휴대폰이 받은 세트·모의고사에 백업의 것을 더하고 같은 날짜는 _rev가 큰 것(같으면 이 휴대폰 것),
   기출(rev)·낱말 풀이(at)·저장소 목록과 일정(index.updated)은 새것. 예전 백업이 오늘 받은 세트를 지우지 않게 */
function setsMerge(a,b){a=a||{};const o=Object.assign({sets:{},mocks:{},kichul:null,index:null,plan:null},b),rv=x=>(x&&x._rev)||1;
  ['sets','mocks'].forEach(k=>{o[k]=Object.assign({},o[k]);Object.keys(a[k]||{}).forEach(d=>{const x=a[k][d];if(!o[k][d]||rv(x)>=rv(o[k][d]))o[k][d]=x;});});
  if(a.kichul&&(!o.kichul||(a.kichul.rev||0)>=(o.kichul.rev||0)))o.kichul=a.kichul;if(a.gloss&&(!o.gloss||(a.gloss.at||0)>=(o.gloss.at||0)))o.gloss=a.gloss;
  if(a.index&&(!o.index||String(a.index.updated||'')>=String(o.index.updated||''))){o.index=a.index;o.plan=a.plan||null;}return o;}
let S_NEW=false;   /* 저장된 기록 없이 처음 연 휴대폰(새로 설치): "바뀐 점" 창을 띄우지 않는다 */
let S=load(); let SETS=loadSets();
let saveT=null,saveT2=null,PLN=0;   /* PLN: 기록이 바뀔 때마다 올린다(오늘 몫·이번 주 계산은 한 번 그리는 동안만 기억, pm) */
/* save(1): 오늘 몫·이번 주가 스스로 쓴 것(S.today·S.wk)만 바뀌었을 때. 그 둘의 기억만 지우고 숙제·카드·세트 복습 계산은 그대로 둔다 */
function save(p){if(p)pmPlan();else PLN++;clearTimeout(saveT);saveT=setTimeout(()=>{try{PE_IO.set(KEY,JSON.stringify(S));}catch(e){toast('저장 공간이 부족해요. 더보기 → 백업에서 정리하세요');}},60);}
function saveSets(){PLN++;clearTimeout(saveT2);saveT2=setTimeout(()=>{try{PE_IO.set(SKEY,JSON.stringify(SETS));}catch(e){toast('세트 저장 공간이 부족해요');}},60);}
function flush(){PLN++;clearTimeout(saveT);clearTimeout(saveT2);try{PE_IO.set(KEY,JSON.stringify(S));PE_IO.set(SKEY,JSON.stringify(SETS));}catch(e){}}
PE_IO.onHide(flush);

/* ════════ 2. 날짜 ════════ */
function fmt(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function todayStr(){return fmt(new Date());}
function parse(s){const a=String(s).split('-').map(Number);return new Date(a[0],a[1]-1,a[2]);}
function addDays(s,n){const d=parse(s);d.setDate(d.getDate()+n);return fmt(d);}
function diffDays(a,b){return Math.round((parse(b)-parse(a))/86400000);}
/* 계획 주의 기준: 준비 시작일이 든 주의 월요일. 시작일이 어느 요일이어도 주는 달력의 월~일(토요일 모의고사·일요일 마감)이고,
   첫 주(준비 주)는 시작일부터 그 일요일까지 짧은 주다. 시작일 전 날은 시작 전(wkIdx 음수)이고 그날 세트·모의는 첫 주 몫에 넣지 않는다(wkFrom).
   예약 작업(pipeline/tool.py week_of)에는 이 월요일을 --start로 보내 주차를 맞춘다(planSig.start). 월요일에 시작하면 예전과 같다 */
function planMon(s){return addDays(s,-((parse(s).getDay()+6)%7));}
let PMON=['',''];function planMon0(){const s=S.settings.start;if(PMON[0]!==s)PMON=[s,planMon(s)];return PMON[1];}
function weekIndex(ds){return Math.floor(diffDays(planMon0(),ds||todayStr())/7);}
/* ── 시험 일정: 정기시험 → 목표 회차(6개월 이상)·실전 모의·주차 지도 ── */
function nthSat(y,m,n){const d=new Date(y,m-1,1);while(d.getDay()!==6)d.setDate(d.getDate()+1);d.setDate(d.getDate()+7*(n-1));return fmt(d);}
function febSat(y){const d=new Date(y,1,2);while(d.getDay()!==6)d.setDate(d.getDate()+1);let s=fmt(d);const L=(PE_SCHED.lunarNewYear||{})[y];if(L&&s>=addDays(L,-1)&&s<=addDays(L,2))s=addDays(s,-7);return s;}
function roundList(ov){const P=PE_SCHED,o=ov||S.settings.roundDates||{},out=[];const y0=P.baseYear,y1=Math.max(y0+3,parse(todayStr()).getFullYear()+3);
  for(let y=y0;y<=y1;y++)[febSat(y),nthSat(y,5,3),nthSat(y,8,4)].forEach((d,i)=>{const r=P.baseRound+3*(y-y0)+i,c=P.confirmed[r],u=o[r];out.push({r,d:u||c||d,est:!u&&!c,user:!!u,note:(!u&&!c&&P.notes[r])||''});});
  return out;}
function addMonths(s,n){const d=parse(s),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return fmt(d);}
function eligibleRounds(start){const min=addMonths(planMon(start),PE_SCHED.minMonths);return roundList().filter(x=>x.d>=min);}
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
/* start: 계획 주의 기준 월요일(planMon, 예약 작업과 같은 값), begin: 사용자가 정한 준비 시작일 */
function computePlan(begin,target){const el=eligibleRounds(begin),start=planMon(begin);const tg=(target&&target!=='auto'&&el.find(x=>x.r===Number(target)))||el[0];
  const mk=roundList().filter(x=>x.d<tg.d&&diffDays(start,x.d)>=7*PE_SCHED.mockMinWeeks).pop()||null;
  const E=Math.floor(diffDays(start,tg.d)/7),M=mk?Math.floor(diffDays(start,mk.d)/7):null;
  return{start,begin,target:tg,mock:mk,E,M,map:buildMap(E,M),auto:!target||target==='auto'};}
let PLAN=null;
function recalcPlan(){PLN++;PLAN=computePlan(S.settings.start,S.settings.target);S.settings.exam=PLAN.target.d;S.settings.mock=PLAN.mock?PLAN.mock.d:'';}
function guideText(){const G=window.PE_GUIDE;if(!G)return'';return`[답안 형식 점검표(모범 답안 기준)]\n${G.check.map((c,i)=>`${i+1}. ${c}`).join('\n')}\n[모범 답안 뼈대(제2교시 25점형 2번, 4면)]\n${G.skeleton.join('\n')}`;}
/* P: 다른 계획(시험 일정 미리 보기·바꾸기 전 계획). 없으면 지금 계획(PLAN) — fillT·planSig·phaseKey·phaseObj·fillW·weekObj 모두 같다 */
function fillT(x,P){P=P||PLAN;return String(x==null?'':x).replace(/\{답안형식\}/g,guideText).replace(/\{본시험\}/g,'제'+P.target.r+'회').replace(/\{모의문장\}/g,P.mock?', 제'+P.mock.r+'회는 실전 모의 응시':'').replace(/\{모의\}/g,P.mock?'제'+P.mock.r+'회':'정기시험');}
function estTag(x){return x&&x.est?'(예상)':x&&x.user?'(직접 입력)':'';}
function milestones(){const P=PLAN,K=PE_SCHED,out=[{d:addDays(P.start,6),t:'준비 주 마무리, 진단 모의 응시',k:'prep'}];
  const add=(x,main)=>{out.push({d:addDays(x.d,-K.annBefore),t:`제${x.r}회 원서접수 무렵(시험 4~5주 전 4일간, 첫날 오전 10시)`,k:'apply'});
    out.push({d:x.d,t:main?`제${x.r}회 필기, 본 목표${estTag(x)}`:`제${x.r}회 필기 = 실전 모의 응시${estTag(x)}`,k:main?'exam':'mock'});
    out.push({d:addDays(x.d,K.resultAfter),t:main?`제${x.r}회 발표 무렵 → 응시자격 서류 제출, 면접 접수`:`제${x.r}회 발표 무렵, 교시별 성적 확인`,k:'score'});};
  if(P.mock)add(P.mock,false);add(P.target,true);return out.sort((a,b)=>a.d<b.d?-1:1);}
function planSig(P){P=P||PLAN;return{start:P.start,target:P.target.r,exam:P.target.d,mock:P.mock?P.mock.r:null,mockDate:P.mock?P.mock.d:null};}
/* 예약 작업(저장소) 일정과 견주기: unknown 받아 온 적 없음 · same 같음 · wait 바꾸기를 기다리는 중(저장소는 지금 일정) · next 기다리는 새 일정이 이미 저장소에 ·
   sent 다르지만 저장소가 가야 할 일정(기다리는 새 일정, 없으면 지금 일정)의 변경 요청을 복사한 지 7일 안(복사·바꾼 날 중 늦은 날부터) · diff 그 밖(빨강). 앞의 넷과 sent는 빨강이 아니다.
   복사한 요청이 어느 일정인지(S.settings.schSig = 그 planSig)가 지금 가야 할 일정과 다르면(되돌리기·두 번째 바꾸기·바꾸지 않기 뒤) sent가 아니다 */
const sigEq=(r,l)=>!!r&&!!l&&r.start===l.start&&Number(r.target)===Number(l.target)&&r.exam===l.exam&&(r.mockDate||null)===(l.mockDate||null);
/* 저장소가 가야 할 일정: 기다리는 새 일정이 있으면 그것, 없으면 지금 일정 */
function repoWant(){const N=S.settings.nextTarget;return planSig(N?computePlan(S.settings.start,N.r):PLAN);}
function repoPlanState(t){const r=SETS.plan;if(!r)return'unknown';const st=S.settings,N=st.nextTarget,cur=sigEq(r,planSig());
  if(cur)return N?'wait':'same';if(N&&sigEq(r,planSig(computePlan(st.start,N.r))))return'next';
  const u=st.schUndo,last=[st.schSent,u&&u.at].filter(Boolean).sort().pop();return st.schSent&&sigEq(st.schSig,repoWant())&&(t||todayStr())<=addDays(last,7)?'sent':'diff';}
/* 변경 요청을 복사했다고 적기(날짜와 그 요청의 일정) · 지우기 */
function schSentSet(t){S.settings.schSent=t||todayStr();S.settings.schSig=repoWant();}
function schSentDel(){delete S.settings.schSent;delete S.settings.schSig;}
function weekRange(w){const a=addDays(planMon0(),w*7);return[a,addDays(a,6)];}
function md(s){const d=parse(s);return(d.getMonth()+1)+'/'+d.getDate();}
function korDateY(s,withDow){return parse(s).getFullYear()+'년 '+korDate(s,withDow);}
function korDate(s,withDow){const d=parse(s);return(d.getMonth()+1)+'월 '+d.getDate()+'일'+(withDow?' '+DAYK[d.getDay()]+'요일':'');}
function dayType(ds){const dw=parse(ds).getDay();return dw===0?'sun':dw===6?'sat':'wd';}
function phaseKey(w,P){P=P||PLAN;if(w<=0)return'prep';if(w>=P.E)return'exam';const m=P.map[w];const ph=m?m.ph:1;return ph===0?'prep':ph===5?'exam':ph;}
function phaseObj(w,P){const k=phaseKey(w,P);const id=k==='prep'?0:k==='exam'?5:k;return PE_PHASES.find(p=>p.id===id)||PE_PHASES[0];}
/* 예전 탭 이름을 지금 이름으로(PE_WEEKS는 pipeline/curriculum.json과 같게 두고, 보여 줄 때 바꾼다) */
const tabWords=s=>String(s==null?'':s).replace(/(앱 )?테스트 탭/g,'연습 탭').replace(/암기 탭/g,'연습 탭').replace(/플랜 탭/g,'이번 주 탭').replace(/테스트 → 기출 회차/g,'연습 → 기출 문제은행(회차별)').replace(/테스트 → 기출 단원별/g,'연습 → 기출 문제은행(단원별)').replace(/다시 볼 세트/g,'세트 복습').replace(/복습 대기/g,'카드 복습').replace(/목차 회상/g,'목차 떠올리기');
const fillW=(x,P)=>tabWords(fillT(x,P));
function weekObj(w,P){P=P||PLAN;const a=Math.max(0,Math.min(P.E,w));const m=P.map[a]||{t:0,ph:0};const Ts=(m.ts||[m.t]).map(t=>PE_WEEKS.find(x=>x.w===t)||PE_WEEKS[0]);const T=Ts[0],fw=x=>fillW(x,P);
  if(Ts.length>1)return preWeek({w:a,t:Ts.map(x=>fw(x.t)).join(' + ')+' (압축)',u:[...new Set(Ts.flatMap(x=>x.u||[]))],goals:Ts.flatMap(x=>(x.goals||[]).slice(0,2)).map(fw),out:Ts.map(x=>fw(x.out||'')).filter(Boolean).join(' / '),ph:m.ph,tpl:m.t,mock:false,rep:false},m);
  return preWeek({w:a,t:fw(T.t)+(m.rep?' (이어서)':''),u:T.u,goals:(T.goals||[]).map(fw),out:fw(T.out||''),ph:m.ph,tpl:m.t,mock:!!m.mock,rep:!!m.rep},m);}
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
function calUnmark(key,day){const d=S.cal[/^\d{4}-\d\d-\d\d$/.test(day||'')?day:todayStr()];if(d&&d.x&&d.x[key]){delete d.x[key];save();}}   /* day: 그 글을 적은 날(없으면 오늘) */
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
/* 빈칸 쓰기 난이도 창. 세트 창(revSheet)에서 왔으면(back) 맨 위에 "‹ 다른 방법"으로 그 창에 돌아간다(rv: 복습 날 세트 복습 잇기) */
function fillLvHTML(d,back,rv){return`${back&&d?`<button class="lnk rvback" data-act="rev-open" data-d="${d}">‹ 다른 방법</button>`:''}<p class="qnum">용어 빈칸 쓰기${d?', '+esc(korDate(d))+' 세트 용어':''}</p><h3 style="margin:4px 0 12px">난이도를 고르세요</h3>
  <div class="group">${['하','중','상','mix'].map(v=>row({t:v==='mix'?'섞어서':'난이도 '+v,d:v==='mix'?'문제마다 하, 중, 상 가운데 무작위':FILL_LV[v],act:'fill-lv',data:Object.assign({v,d:d||''},rv?{rv:1}:{})})).join('')}</div>
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
/* sp.rvd[단계]: 그 단계를 처음 끝낸 날(이번 주 점수가 제때인지 본다. 이미 rev에 있던 단계는 덮기 전 그 날짜). 아래 rev 줄은 예전 그대로(뒤 단계를 하면 앞 단계 날짜도 오늘로 덮음) */
function markReviewed(d,step){const p=sp(d);p.rev=p.rev||{};p.rvd=p.rvd||{};REVIEW_STEPS.forEach(st=>{if(st<=step&&!p.rvd[st])p.rvd[st]=p.rev[st]||todayStr();});
  REVIEW_STEPS.forEach(st=>{if(st<=step)p.rev[st]=todayStr();});calMark('rev:'+d,'term',`${korDate(d)} 세트 복습(${step}일 차)`);save();}
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
  nextApply(todayStr());   /* 받아 오는 동안 기다린 시험 일정 바꾸기(복원한 기록의 지난 바꾸기도). 받은 세트로 캐시를 비운 뒤라 지난주 고정(weekSnap)이 새 자료로 센다 */
  softRender();}
function syncLine(){const s=S.sync||{};const n=Object.keys(SETS.sets).length;
  if(syncing)return`<div class="syncline"><span class="spin"></span>받아 오는 중…</div>`;
  if(!s.last)return`<div class="syncline"><span class="sd off"></span>아직 받아 오지 않았어요</div>`;
  return`<div class="syncline"><span class="sd ${s.ok?'':'off'}"></span>${s.ok?`마지막 확인 ${esc(whenTs(s.last))}, 받은 세트 ${n}개`:`받아 오지 못했어요${esc(syncErr(s.err))}`}</div>`;}
/* 받아 온 때: 오늘이면 시각만, 다른 날이면 날짜도("11/2 21:30", 복원했거나 며칠 쉬었을 때 어제 시각이 오늘처럼 보이지 않게) */
const whenTs=ts=>{const d=fmt(new Date(ts));return(d===todayStr()?'':md(d)+' ')+hhmm(ts);};
/* 받아 오기 실패 이유(한국어로, 브라우저 영어 오류는 보이지 않게): 인터넷 연결 · 저장소 응답 번호 · 그 밖 */
const syncErr=e=>{e=String(e||'');const m=/HTTP (\d+)/.exec(e);return m?`(저장소 응답 ${m[1]}) — 잠시 뒤 다시 받아 오세요`:/fetch|network|internet|offline|load failed|timed? ?out|인터넷|연결/i.test(e)?' — 인터넷 연결을 확인하세요':'(받은 자료를 읽지 못함) — 잠시 뒤 다시 받아 오세요';};
function paintSyncBits(){document.querySelectorAll('[data-syncline]').forEach(el=>el.innerHTML=syncLine());}

/* ════════ 10. 라우터 ════════ */
/* 주소는 늘 바꿔 쓴다(location.replace): 방문 기록이 쌓이지 않아 끝난 세션·외우기의 빈 화면이 기록에 남지 않는다(앱의 기기 뒤로 가기 몸짓은 끄고 왼쪽 가장자리 밀기를 여기서 받는다).
   위로(위쪽 뒤로·닫기, 가장자리 밀기)는 goUp: 들어온 곳(RET) → 정해 둔 부모(PARENT). 탭은 goTab: 그 탭 첫 화면으로 바꿔 쓰고 RET를 비운다.
   주소가 바뀌면 route(): 창을 닫고, SES 없는 #sess·MEMO 없는 #memo는 위로, 모르는 주소는 오늘로 바꿔 쓰고, #set/날짜/탭은 #set/날짜로 맞춘 뒤 그린다. 주소는 앞의 # 없이 nh()로 한 꼴로 쓴다.
   아래 탭: 오늘 · 이번 주 · 복습 · 연습 · 더보기. 예전 주소 #study(암기)·#test(테스트)는 연습 탭으로 읽는다(주소는 바꾸지 않고 그 탭을 그린다) */
const TABS=['today','week','review','practice','more'],TAB_ALIAS={study:'practice',test:'practice'};
const PARENT={set:'today',cal:'today',mock:'practice',kichul:'practice',dandap:'practice',stats:'week',archive:'review',wrong:'review',
  guide:'more',timer:'more',plan:'more',schedule:'more',settings:'more',backup:'more',about:'more',prompts:'more',imp:'more',admin:'more',inbox:'more',msg:'more'};
const PAGES={set:vSet,sess:vSess,memo:vMemo,cal:vCal,dandap:vDandap,kichul:vKichul,mock:vMock,guide:vGuide,admin:vAdmin,inbox:vInbox,msg:vMsg,plan:vPlan,schedule:vSchedule,timer:vTimer,prompts:vPrompts,imp:vImport,settings:vSettings,backup:vBackup,about:vAbout,archive:vArchive,wrong:vWrong,stats:vStats};
const TAB_VIEWS={today:vToday,week:vWeek,review:vReview,practice:vPractice,more:vMore};
const UP_LABEL={today:'오늘',week:'이번 주',review:'복습',practice:'연습',study:'연습',test:'연습',more:'더보기',set:'세트',kichul:'기출','kichul/u':'단원별',mock:'모의고사',cal:'달력',inbox:'문자함'};
const SET_TABS=['cards','quiz','essay','tasks'];
let R={tab:'today',page:null,a:null,b:null},RET={},FLOW=null;   /* RET: 화면 → 들어온 주소. FLOW: 오늘 화면의 줄이 연 흐름 {id, from, at} */
let SCR={},UPH=null;   /* SCR: 주소 → 그 화면을 떠날 때의 스크롤 위치(앞으로 갈 때·탭을 바꿀 때 적음). UPH: 위로(goUp) 가는 주소(닿으면 그 자리로, 한 번만) */
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
  if(r.page==='inbox'&&r.a)return'inbox';   /* 한 사람의 문자 → 문자함 */
  const ret=nh(RET[r.page]);return retOk(ret,r.page)?ret:(PARENT[r.page]||'today');}
/* h에서 위로 올라가다 page를 만나면(앞 화면으로 되돌아가는 링크) 그 화면의 RET를 그대로 둔다: 뒤로가 두 화면 사이를 맴돌지 않게 */
function upHas(h,page){for(let k=0;k<6&&h&&!isTab(h);k++){h=upOf(hashR(h));if(nh(h).split('/')[0]===page)return true;}return false;}
/* 아래 탭 강조: 흐름을 시작한 탭(세션·외우기는 연 곳, 화면은 들어온 곳 → 부모를 따라 올라간다) */
function tabOf(h,k){h=nh(h)||'today';k=k||0;const p=h.split('/')[0];
  if(TABS.includes(p))return p;if(TAB_ALIAS[p])return TAB_ALIAS[p];if(k>5)return'today';
  if(p==='sess')return tabOf(SES&&SES.from,k+1);if(p==='memo')return tabOf(MEMO&&MEMO.from,k+1);
  const ret=nh(RET[p]);return tabOf(retOk(ret,p)?ret:(PARENT[p]||'today'),k+1);}
/* 위쪽 이름: 주소 그대로(UP_LABEL) → 기출 회차·단원 화면은 "제140회"·그 단원 이름(첫 마디 "기출"은 목록 이름이라 쓰지 않음.
   6자가 넘는 단원 이름은 줄인 이름 "콘크리트Ⅱ"·"가시설": 글자 크게·위쪽 알약에서도 제목과 알약을 덮지 않게) → 첫 마디(세트·모의고사…) → "뒤로" */
const upLabel=h=>{h=nh(h);const p=h.split('/');if(UP_LABEL[h])return UP_LABEL[h];
  if(p[0]==='kichul'&&p[2]){if(p[1]==='r')return'제'+p[2]+'회';if(p[1]==='u'){const u=PE_UNITS.find(x=>x.id===Number(p[2]));return u?(u.n.length<=6?u.n:u.s):'뒤로';}}
  return UP_LABEL[p[0]]||'뒤로';};
function parseHash(){const h=curH(),p=h.split('/');const r={tab:'today',page:null,a:p[1]||null,b:p[2]||null};
  if(isTab(p[0]))r.tab=tabKey(p[0]);else if(PAGES[p[0]]){r.page=p[0];r.tab=tabOf(h);}return r;}
/* 집중 모드: 세션·가리며 외우기, 타이머가 도는 그 모의고사(아래 탭을 숨기고 위쪽은 "닫기") */
const isFocus=()=>R.page==='sess'||R.page==='memo'||(R.page==='mock'&&TM.running&&!!TM.ctx&&TM.ctx.kind==='mock'&&TM.ctx.D===R.a);
/* 빈 흐름: SES 없는 #sess, MEMO 없는 #memo. 그리지 않고 위로 보낸다 */
const flowGone=r=>(r.page==='sess'&&!SES)||(r.page==='memo'&&!MEMO);
/* 같은 주소면 다시 그리기만 한다(세션 → 세션, 외우기 안의 외우기). 그 주소가 빈 흐름이면 위로(바꿔 쓰지 않아 route()를 거치지 않는 길에도 빈 화면을 막는다) */
function rep(h){h=nh(h)||'today';if(curH()===h){UPH=null;R=parseHash();if(flowGone(R))return hop(upOf(R));render();window.scrollTo(0,0);return scrollDo();}location.replace('#'+h);}
/* 그린 뒤 보여 줄 곳(SV.scrollTo: 첫 안 읽은 용어·펼친 숙제 카드 등): 짧은 것은 가운데로, 펼친 용어와 화면 반보다 긴 것은 머리가 위쪽 막대 바로 아래에 오게
   (가운데로 맞추면 긴 설명에서 제목이 화면 위로 나간다) */
function scrollDo(){if(!SV.scrollTo)return;const el=document.querySelector(SV.scrollTo);SV.scrollTo=null;if(!el)return;const r=el.getBoundingClientRect();
  if(el.matches('.acc.open')||r.height>window.innerHeight*.55){const tb=document.querySelector('.topbar');window.scrollTo(0,Math.max(0,r.top+window.scrollY-(tb?tb.getBoundingClientRect().height:0)-8));}
  else el.scrollIntoView({block:'center'});}
function hop(h){h=nh(h)||'today';return isTab(h)?goTab(tabKey(h)):rep(h);}
/* 앞으로: 탭 주소는 goTab, 그 밖은 들어온 곳을 RET에 적고 바꿔 쓴다(o.from: 들어온 곳을 따로 줄 때). 떠나는 화면의 스크롤 위치는 SCR에(위로 돌아오면 그 자리로) */
function nav(h,o){o=o||{};closeModal();SCR[curH()]=window.scrollY;h=nh(h)||'today';if(isTab(h))return goTab(tabKey(h));
  const p=h.split('/')[0],from=nh(o.from)||curH();if(p!=='sess'&&p!=='memo'&&from.split('/')[0]!==p&&!upHas(from,p))RET[p]=from;
  if(p==='set'&&curH()!==h)UI.hwf=null;   /* 다른 세트로 가면 이번 주 "다음 하나"로 펼친 숙제 카드는 놓는다(부른 곳이 nav 뒤에 다시 적는다) */
  rep(h);}
/* 위로: 뒤로·닫기·가장자리 밀기. 세션·외우기는 지우지 않는다(이어서 할 수 있게). 외우기 안에서 연 외우기는 바깥 외우기로(T5).
   닿은 화면은 떠날 때의 스크롤 자리로(route가 SCR에서), 펼친 숙제 카드가 있는 세트면 그 카드로(목록 자리·펼친 카드를 잃지 않게) */
function goUp(up){closeModal();
  if(!up&&R.page==='memo'&&MEMO&&MEMO.outer){const o=MEMO.outer;memoStop();MEMO=o;return render();}
  const h=nh(up||upOf(R))||'today',r=hashR(h);UPH=h;if(r.page==='set'&&r.a&&hwFocus(r.a))SV.scrollTo='.hw.focus';
  hop(h);}
/* 탭: 그 탭 첫 화면으로 바꿔 쓴다(탭이 쌓이지 않음). 지금 탭을 다시 누르면 맨 위로 */
function goTab(tab){closeModal();SCR[curH()]=window.scrollY;tab=tabKey(tab);if(!TABS.includes(tab))tab='today';FLOW=null;RET={};UI.hwf=null;
  if(curH()===tab){UPH=null;R=parseHash();render();return window.scrollTo(0,0);}
  location.replace('#'+tab);}
/* 흐름을 다른 화면에서 시작하면 오늘 줄의 흐름(FLOW)을 놓는다 */
function flowKeep(o){if(!(o&&o.keepFlow)&&!(FLOW&&curH()===FLOW.at))FLOW=null;}
/* 복원·초기화: 메모리에만 있던 흐름을 비운다(하던 세션·가리며 외우기, 오늘 줄의 흐름, 들어온 곳·스크롤 자리, 펼친 줄·나중에·고른 답안지, 고치던 시험 일정, 그 기록에 묶인 타이머).
   남겨 두면 오늘에 지운 기록의 "이어서"가 뜨고, 그것을 끝내면 매김·오답·세트 복습이 새 기록에 들어간다 */
function flowReset(){memoStop();SES=null;MEMO=null;FLOW=null;RET={};SCR={};UPH=null;Object.assign(UI,{later:{},act:null,d:null,hwf:null,ddx:null});SCH=null;if(TM.ctx||TM.ended)setPreset(TM.preset);
  Object.keys(SV).forEach(k=>{if(/^mkw?:|:eo$/.test(k))delete SV[k];});}   /* 그 기록에 묶인 화면 값: 모의의 고른 교시(mkw:)·연 키워드·목차(mk:)·논술 목차 힌트(:eo). 세트 탭 같은 보기 값은 그대로 */
/* 주소가 바뀐 뒤: 그리고 맨 위로(위로 온 것이면 떠날 때 자리로, 그 위 SV.scrollTo가 있으면 그곳으로). 아직 닫지 않은 "바뀐 점" 창은 다시 띄운다 */
function route(){closeModal();const up=UPH;UPH=null;
  try{R=parseHash();
    if(flowGone(R))return hop(upOf(R));
    if(!R.page&&!isTab(curH()))return goTab('today');
    if(R.page==='set'&&R.b){if(SET_TABS.includes(R.b))SV[R.a]=R.b;return rep('set/'+R.a);}
    onEnter(R);
  }catch(e){console.error(e);R=parseHash();}
  if(R.page!=='memo')memoStop();render();window.scrollTo(0,up&&up===curH()&&SCR[up]||0);scrollDo();v3Again();}
/* 화면에 들어갈 때 한 번(그리기와 따로, 그리기는 기록을 쓰지 않는다): 토·일요일에 다음 주 단원의 기출 화면을 열면 "다음 주 단원 기출 훑기"(S.tk['kichul:주']) */
function onEnter(r){if(r.page==='inbox'&&r.a)return ibxSeen(r.a);if(r.page==='msg')return mtPoll(true);if(r.page!=='kichul'||r.a!=='u'||!r.b)return;const t=todayStr(),dw=parse(t).getDay(),W=wkStart(t),tk=S.tk||(S.tk={});if(dw!==0&&dw!==6||tk['kichul:'+W])return;
  if((weekObj(weekIndex(addDays(W,7))).u||[]).map(Number).includes(Number(r.b))){tk['kichul:'+W]=t;touchDay();save();}}
window.addEventListener('hashchange',route);
const kbEl=t=>!!t&&(t.tagName==='TEXTAREA'||t.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|reset|range|color|file|image)$/i.test(t.type||''));
function render(){PLN++;R=parseHash();document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===R.tab));
  if(!R.page&&R.tab==='today')FLOW=null;document.body.classList.toggle('focus',isFocus());
  const v=$('#view');let html='';
  try{
    if(!R.page)html=(TAB_VIEWS[R.tab]||vToday)();
    else html=(PAGES[R.page]||vToday)();
  }catch(e){html=`<div class="empty" style="margin-top:24px"><b>화면을 그리는 중 오류가 났어요</b>${esc(e.message)}</div>`;console.error(e);}
  if(!R.page&&mtOn()){if(MT.n)html=`<div class="ibxrow mtrow">${mtBtn()}</div>`+html;mtPoll();}   /* 회원: 안 읽은 관리자 답장이 있을 때만 오른쪽 위 단추 */
  if(!R.page&&ibxOn()){html=`<div class="ibxrow">${ibxBtn()}</div>`+html;ibxPoll();if(!IBX.iv)IBX.iv=setInterval(()=>{if(!document.hidden&&!R.page)ibxPoll();},60000);}   /* 관리자: 탭 첫 화면 오른쪽 위 문자함(1분마다 다시 세기는 관리자 휴대폰에서만 켠다) */
  v.innerHTML=html;document.body.classList.toggle('kb',kbEl(document.activeElement));paintNavBadges();if(R.page==='timer')paintTimer();if(R.page==='memo')paintMemo();
  if(R.page==='sess'&&SES&&!SES.answered&&SES.items[SES.i]&&SES.items[SES.i].type==='fill'){const f=v.querySelector('.fill-in');if(f)try{f.focus({preventScroll:true});}catch(e){}}
  tEndShow();paintPill();}
function softRender(){if(R.page==='sess')return paintNavBadges();if(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return paintNavBadges();render();}
/* 아래 탭 배지는 이번 주 탭에만: 날짜가 정해진 일(원서접수 기간 3일 전부터 끝까지, 시험 뒤 48시간 복기) 가운데 아직 안 한 것의 수.
   밀린 세트·복습 수는 배지로 세지 않는다(오늘 몫이 차례를 정한다). 오늘 몫의 원서접수·복기 핀(taskCalc)과 같은 날짜 규칙 */
function navBadgeN(t){t=t||todayStr();if(wkIdx(t)<0||t>addDays(PLAN.target.d,2))return 0;   /* 본시험 뒤 48시간 복기까지 */const tk=S.tk||{};let n=0;
  [PLAN.mock,PLAN.target].filter(Boolean).forEach(x=>{const ap=addDays(x.d,-PE_SCHED.annBefore);
    if(t>=addDays(ap,-3)&&t<=addDays(ap,3)&&!tk['apply:'+x.r])n++;if(t>x.d&&t<=addDays(x.d,2)&&!tk['recap:'+x.r])n++;});return n;}
function paintNavBadges(){const b=document.querySelector('#nav button[data-tab="week"]');if(!b)return;let nb=b.querySelector('.nb');const n=navBadgeN();
  if(n){if(!nb){nb=document.createElement('span');nb.className='nb due';b.appendChild(nb);}nb.textContent=n;b.setAttribute('aria-label',`이번 주, 날짜가 다가온 일 ${n}개`);}
  else{if(nb)nb.remove();b.setAttribute('aria-label','이번 주');}}
/* 위쪽 막대: 왼쪽은 올라갈 곳 이름(오늘·세트·더보기…, 그 밖은 "뒤로"), 집중 모드에서는 "닫기" */
const backLab=()=>isFocus()?'닫기':icon('back')+esc(upLabel(upOf(R)));
const topbar=(title)=>`<div class="topbar"><button class="back" data-act="back">${backLab()}</button><div class="ttl">${esc(title)}</div></div>`;
/* 다시 그리지 않고 집중 모드 표시만 맞춘다(점수 칸을 쓰는 중에 교시 시간이 끝났을 때): 아래 탭과 위쪽 "닫기" ↔ "‹ 이름" */
function focusPaint(){document.body.classList.toggle('focus',isFocus());const b=$('#view .topbar .back');if(b)b.innerHTML=backLab();}
const sec=(title,meta,body,cls)=>`<section class="sec${cls?' '+cls:''}"><div class="sec-h"><h2>${esc(title)}</h2>${meta?`<span class="meta">${meta}</span>`:''}</div>${body}</section>`;
function row(o){const tag=o.act?'button':'div';const attrs=o.act?` data-act="${o.act}"${o.data?Object.keys(o.data).map(k=>` data-${k}="${esc(o.data[k])}"`).join(''):''}`:'';
  return`<${tag} class="row${o.ic?'':' noic'}"${attrs}>${o.ic?`<span class="ic ${o.tone||''}">${icon(o.ic)}</span>`:''}<span class="tx"><span class="tt">${o.t}</span>${o.d?`<span class="ds">${o.d}</span>`:''}</span>${o.v!=null?`<span class="val${o.zero?' zero':''}">${o.v}</span>`:''}${o.badge?o.badge:''}${o.act?'<span class="chev"></span>':''}</${tag}>`;}

/* ════════ 11-0. 오늘 몫·이번 주 ════════ */
/* 오늘 몫(그날 할 일을 남은 시간 안에서 고른 목록)과 이번 주(월~일 약속·남은 필수·점수)를 앱이 이미 쓰는 기록으로 계산한다.
   taskList·dayPlan·weekBoard는 읽기만 한다(sp()를 부르지 않아 세트 복습 시계가 돌지 않음). 쓰는 것은 planToday(S.today: 그날 고정한 목록,
   S.wk[주].cut·cph: 줄인 목표)와 weekSnap(S.wk[지난주]: 지난주 기록)뿐. 분은 모두 MIN_PER 한 표에서 센다 */
const PLAN_V=2;                                   /* 계획 규칙을 바꾸면 올린다(예전 S.today를 새로 짠다). 2: 세트 복습·카드 복습을 남은 시간에 채움 */
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
const UI={later:{},open:{},act:null,d:null,hwf:null,ddx:null};   /* hwf: 이번 주 "다음 하나"·세트 막대로 펼친 숙제 카드 {d, k 필수 칸}. ddx: "단답 1문제 더"로 고른 답안지 카드 */
/* 한 번 그리는 동안만 기억(save()·render()마다 PLN이 올라 새로 센다). 키 첫 글자 t 할 일 목록·w 이번 주는 S.today·S.wk를 읽으므로
   오늘 몫이 스스로 쓸 때(save(1))는 그 둘만 지운다(pmPlan). 숙제(h 세트마다)·핵심(c)·간격 온 카드(dc)·다시 볼 세트(ds)는 그대로 둔다 */
let _pmk=-1,_pmc={};function pm(key,f){if(_pmk!==PLN){_pmk=PLN;_pmc={};}return key in _pmc?_pmc[key]:(_pmc[key]=f());}
function pmPlan(){if(_pmk===PLN)for(const k in _pmc)if(k[0]==='t'||k[0]==='w')delete _pmc[k];}
const dueP=()=>pm('dc',()=>dueCards(null)),dsrP=()=>pm('ds',dueSetReviews);   /* 오늘 몫이 읽을 때 한 번만 센다(돌려받은 배열은 고치지 않는다) */
/* 날의 종류: exam 시험 날(본시험·실전 모의), pre3 시험 날 전 평일 3일, holi 평일 공휴일, 그 밖은 wd·sat·sun */
function dayKind(t){const ex=[PLAN.target&&PLAN.target.d,PLAN.mock&&PLAN.mock.d].filter(Boolean);if(ex.includes(t))return'exam';const k=dayType(t);
  if(k==='wd'&&ex.some(e=>{let d=e;for(let n=0;n<3;){d=addDays(d,-1);if(dayType(d)!=='wd')continue;if(d===t)return true;n++;}return false;}))return'pre3';
  return k==='wd'&&KR_HOLI[t]?'holi':k;}
/* 그날 공부 시간(분). 일요일·공휴일은 sun, 시험 전 3일은 평일, 시험 날 0, 전교시 리허설 토요일은 430분 이상. 저장값이 숫자가 아니면 기본값.
   그날을 쉬는 날·짧은 날로 정했으면(S.days[날짜].m) 그 시간(리허설 430보다 앞선다). raw: 정한 시간을 빼고 평소 시간("평소대로 · n") */
function budgetOf(t,kind,raw){kind=kind||dayKind(t);if(kind==='exam')return 0;
  const o=!raw&&S.days&&S.days[t];if(o&&o.m!=null)return Math.max(0,Number(o.m)||0);
  const B=Object.assign({},BUDGET_DEF,S.settings.budget||{}),k={wd:'wd',pre3:'wd',holi:'sun',sat:'sat',sun:'sun'}[kind]||'wd';
  let v=Number(B[k])||BUDGET_DEF[k];if(kind==='sat'&&weekObj(weekIndex(t)).pre)v=Math.max(v,430);return v;}
/* 쉬는 날: 공부 시간 0으로 정한 날(시험 날은 아님). 이날은 날짜가 정해진 일(P0 핀)만 남고 나머지는 다른 날로 */
function dayOff(t){const o=(S.days||{})[t];return!!o&&o.m===0&&dayKind(t)!=='exam';}
/* 평일 저녁에 나눠 하기(그 주 S.wk[W].cu, 사용자가 켠 주만): 평일(시험 전 3일·공휴일 빼고)이고 시험이 든 주·5단계가 아닐 때 */
function cuOn(t){const W=wkStart(t);return dayKind(t)==='wd'&&!!(S.wk&&S.wk[W]&&S.wk[W].cu)&&!exWeek(t)&&phaseObj(wkIdx(t)).id!==5;}
const wkStart=t=>addDays(t,-((parse(t).getDay()+6)%7)),wkEnd=t=>addDays(wkStart(t),6);   /* 주는 달력의 월~일 */
/* 그 날의 계획 주차(주는 시작 주 월요일부터 세므로 한 달력 주 안에서 단계·목표가 바뀌지 않는다). 시작일 전 날은 음수(첫 주의 시작 전 날은 -1) */
const wkIdx=t=>{const w=weekIndex(t);return t<S.settings.start?Math.min(-1,w):w;};
/* 그 달력 주(월요일 W)에서 계획에 드는 첫날: 첫 주는 준비 시작일, 그 밖은 W. 첫 주의 시작 전 세트·모의는 이번 주 몫·밀린 세트·넘어온 것·점수에 넣지 않는다 */
const wkFrom=W=>W===planMon0()?S.settings.start:W;
const dlab=d=>md(d)+'('+DAYK[parse(d).getDay()]+')';
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
const hmOf=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const isStudy=k=>k==='wd'||k==='pre3'||k==='holi';
const weekMock=t=>{const F=wkFrom(wkStart(t));return Object.keys(SETS.mocks).filter(D=>/^\d{4}-\d\d-\d\d$/.test(D)&&D>=F&&D<=t).sort().pop()||null;};
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
/* 세트 숙제의 단계: 그 세트 주에 산 단계(시험 일정을 바꿔 계획을 갈아 끼울 때 지난 주마다 적어 둔 S.wk[주].ph). 없으면 지금 계획(앱)의 그 날 주차 단계.
   세트 파일의 week는 예약 작업이 그때 일정으로 적은 값이라 앱에서 시작일을 바꾸면 다를 수 있어 쓰지 않는다(같은 일정이면 같은 값, 3.1.2) */
function setPh(d){const x=(S.wk||{})[wkStart(d)];return x&&x.ph!=null?x.ph:phaseObj(wkIdx(d)).id;}
/* 세트 파일의 주차(예약 작업 일정)가 앱 주차와 다르면 세트 화면 머리 아래 한 줄: 저장소 일정이 앱과 다르면 변경 요청 안내와 시험 일정 링크 */
function setWkNote(d,w){const s=SETS.sets[d];if(!s||s.week==null||s.week===w)return'';const rp=repoPlanState();
  return`<p class="note setwk">예약 작업이 예전 일정의 ${s.week<=0?'준비 주':s.week+'주차'}로 만든 세트예요.${rp==='diff'||rp==='sent'?` 시험 일정의 변경 요청을 예약 작업에 붙여 넣으면 다음 세트부터 앱 주차와 맞아요. <button class="lnk" data-act="go" data-h="schedule">시험 일정</button>`:''}</p>`;}
function hwMin(d){const R=hwRule(d),M=Object.assign({},PE_HW_MIN[1],PE_HW_MIN[setPh(d)]||{});for(const k in M)M[k]=Math.min(M[k],R[k]||0);return M;}
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
/* 세트 핵심(용어 읽기 + 세트 퀴즈): st 용어·퀴즈 수와 한 수(setStatus의 nc·nq·read·qa와 같은 셈, 숙제는 세지 않아 hwItems를 부르지 않음), r·q 남은 수, gap 남은 분, ok 다 함 */
function setCore(d){return pm('c'+d,()=>{const s=SETS.sets[d];if(!s)return null;const p=spGet(d),st={nc:(s.cards||[]).length,nq:(s.quiz||[]).length,read:Object.keys(p.read||{}).length,qa:Object.keys(p.quiz||{}).length},
  r=Math.max(0,st.nc-st.read),q=Math.max(0,st.nq-st.qa);return{st,r,q,gap:r*MIN_PER.read+q*MIN_PER.quiz,ok:!r&&!q};});}
/* 세트만의 과제가 논술 그림과 같은 그림이면(그리기 낱말 + 그림 설명과 낱말 3개 이상 같음) 그림·표 숙제 하나로 친다 */
function figDup(d,i){const s=SETS.sets[d],x=s&&(s.tasks||[])[i],fg=s&&s.essay&&s.essay.fig;if(!x||!fg||!/그리|그림|그려|도$/.test(x))return false;
  const ws=v=>new Set(String(v).split(/[^가-힣A-Za-z0-9]+/).map(glStem).filter(w=>w.length>=2)),b=ws(fg);let n=0;ws(x).forEach(w=>{if(b.has(w))n++;});return n>=3;}
/* 세트 복습 후보: 1·3일 차 → 7일 차부터(이번 주에 기한이 온 것) → 지난주 전에 기한이 지난 7일 차부터, 같은 무리 안에서는 기한(처음 연 날 + 단계) 순.
   필수(이번 주 남은 필수 B에 드는 것과 같은 규칙, 단계와 무관): 1·3일 차와 이번 주에 기한이 온 7·14·30일 차. 지난주 전에 기한이 지난 7일 차부터는 권장.
   평일은 1·3일 차 앞 2개가 P3, 나머지 필수는 P5(손글씨 뒤 남은 시간에), 토요일은 1·3일 차 P3·7일 차부터 P5, 일요일은 1·3일 차 밀린 핵심·7일 차부터 복습 비우기.
   모두 fill(넘침 단계로 접거나 놓아주지 않고 필수 다음 남은 시간에 채운다) */
function revCands(t,kind){kind=kind||dayKind(t);let nreq=0;const W=wkStart(t),grp=x=>x.step<=3?0:x.due>=W?1:2;
  return dsrP().map(x=>Object.assign({due:addDays(spGet(x.d).first,x.step)},x)).sort((a,b)=>grp(a)-grp(b)||(a.due<b.due?-1:a.due>b.due?1:a.step-b.step)).map((x,i)=>{
    const g=grp(x),e=g===0,o={id:'rev:'+x.d+':'+x.step,k:'rev',d:x.d,step:x.step,due:x.due,min:revMin(x.d),roll:'다시 나와요',o:40+i/100,label:`세트 복습 ${dlab(x.d)} ${x.step}일 차`,sub:'',fill:1,need:g<2?'필수':'권장',old:g===2?1:0};
    if(kind==='sat')return Object.assign(o,{p:e?3:5,blk:'catch',o:(e?40:g===1?80:86)+i/100});
    if(kind==='sun')return Object.assign(o,e?{p:3,blk:'core'}:{p:5,blk:'flush',o:(g===1?10:86)+i/100});
    if(e&&nreq<2){nreq++;return Object.assign(o,{p:3,blk:'am',o:20+i/100});}return Object.assign(o,{p:5,blk:'am',o:(g<2?25:27)+i/100});});}
/* 카드 복습에 나올 카드(복습·연습·오늘 같은 수): 간격이 돌아온 카드 − 오늘 계획한 세트 복습의 카드 − 오늘 이미 매긴 카드 */
function cardsOut(t){t=t||todayStr();const sk=outSkip(t);return dueP().filter(c=>!sk.has(c.id)&&pget(c.id).last!==t);}
/* 카드 복습에서 빼는 카드: 오늘 계획한 세트 복습의 카드(복습·연습 "카드 복습"이 같은 목록으로 시작하게) */
/* 고정 전에는 꼭 들어갈 세트 복습(P3, 일요일은 필수 모두)으로 어림한다. 남은 시간에 채우는 세트 복습의 카드는 dayPlan이 고를 때 다시 센다 */
function outSkip(t){const F=S.today&&S.today.d===t?S.today:null,sun=dayKind(t)==='sun',ds=F?F.rows.filter(r=>/^rev:/.test(r.id)).map(r=>r.id.split(':')[1]):revCands(t).filter(x=>x.need==='필수'&&(x.p===3||sun)).map(x=>x.d),sk=new Set();
  ds.forEach(d=>setIds(d).forEach(id=>sk.add(id)));return sk;}
const planRevCards=t=>{const F=S.today&&S.today.d===t?S.today:null;return F?uniq([].concat(...F.rows.filter(r=>/^rev:/.test(r.id)).map(r=>setIds(r.id.split(':')[1])))):[];};
/* 단계가 바뀐 주(그 주 동안, 지울 때까지): PE_PHASE_NOTE 한 줄 */
function phaseStart(t){const w=wkIdx(t);if(w<1||w>PLAN.E)return null;const id=phaseObj(w).id;if(id===phaseObj(w-1).id||!PE_PHASE_NOTE[id]||(S.tk||{})['phase:'+id])return null;return{id,w,text:PE_PHASE_NOTE[id]};}
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
/* 평일 저녁에 나눠 하는 날 더하는 줄(두 번째 밀린 세트·손글씨 몫)은 남은 시간에만: 고르는 순서는 그날의 필수 세트 복습(am 25) 바로 뒤·권장 세트 복습(27)·카드 복습(30) 앞.
   그래서 켜도 그날 필수(세트 복습 포함)를 밀어내지 않는다(보이는 자리 blk·o는 그대로 저녁 블록) */
const CU_PO=i=>({p:5,pb:'am',po:26+i/10});
function taskList(t){t=t||todayStr();return pm('t'+t,()=>taskCalc(t));}
function taskCalc(t){const w=wkIdx(t),kind=dayKind(t),W=wkStart(t),dw=parse(t).getDay(),T=[],tk=S.tk||{},wkend=kind==='sat'||kind==='sun',study=isStudy(kind),pre=kind==='pre3',ph=phaseObj(w).id,cp=Math.max(1,ph),chk=exWeek(t)||ph===5,cu=cuOn(t);   /* cu: 이번 주 평일 저녁에 나눠 하기(S.wk[W].cu, 평일만·시험이 든 주 빼고) */
  const mk=o=>{const x=Object.assign({need:'필수',p:6,o:50,blk:null,min:0,roll:'일요일까지',label:'',sub:''},o);T.push(x);return x;};
  if(w<0||t>addDays(PLAN.target.d,2))return T;   /* 본시험 뒤 이틀(48시간 복기)까지는 아래 핀을 만든다 */
  /* P0: 원서접수(접수 7일 전~접수 끝), 접수 날짜 확인(21~8일 전, 이번 주 줄), 48시간 복기, 시행계획 공고(시험 전해 11/20~12/31, 이번 주 줄) */
  const rounds=[PLAN.mock,PLAN.target].filter(Boolean);
  rounds.forEach(x=>{const ap=addDays(x.d,-PE_SCHED.annBefore),ae=addDays(ap,3),re=addDays(x.d,2);
    if(t>=addDays(ap,-7)&&t<=ae)mk({id:'apply:'+x.r,k:'apply',r:x.r,p:0,blk:'pin',o:0,always:1,label:`큐넷 원서접수 · 제${x.r}회`,sub:`${dlab(ap)}~${dlab(ae)}${x.est?' 예상':''} · 첫날 오전 10시`,min:15,roll:t<ap?'D-'+diffDays(t,ap):'접수 기간',urg:t>=addDays(ap,-3),to:'schedule',done:!!tk['apply:'+x.r]});
    else if(t>=addDays(ap,-21)&&t<addDays(ap,-7)&&(!tk['applychk:'+x.r]||tk['applychk:'+x.r]>=W))mk({id:'applychk:'+x.r,k:'applychk',r:x.r,need:'권장',onlyWeek:1,label:`원서접수 날짜 확인 · ${md(ap)} 무렵`,min:5,roll:'',to:'schedule',done:!!tk['applychk:'+x.r]});
    if(t>x.d&&t<=re)mk({id:'recap:'+x.r,k:'recap',r:x.r,p:0,blk:'pin',o:1,always:1,label:`제${x.r}회 복기: 문제 모두 적기 → 4문제 다시 써서 채점(48시간 안)`,min:150,roll:t===re?'오늘까지':'D-'+diffDays(t,re),urg:1,done:!!tk['recap:'+x.r]});});
  if(t>PLAN.target.d)return T;   /* 본시험 뒤에는 복기 핀뿐 */
  /* 원서접수 날짜 확인·시행계획 공고 확인은 시험 일정 화면이나 이번 주 줄의 동그라미로 친다. 친 주에는 ✓로 남는다 */
  uniq(rounds.map(x=>+x.d.slice(0,4))).forEach(Y=>{if(t>=(Y-1)+'-11-20'&&t<=(Y-1)+'-12-31'&&(!tk['notice:'+Y]||tk['notice:'+Y]>=W))mk({id:'notice:'+Y,k:'notice',need:'권장',onlyWeek:1,label:`큐넷 ${Y} 시행계획 공고 확인`,min:5,roll:'',to:'schedule',done:!!tk['notice:'+Y]});});
  if(kind==='exam'){const L=(PE_ROUTINES.exam[dayType(t)]||[]).concat(['응시했어요']),R0=rounds.find(x=>x.d===t)||{};L.forEach((x,i)=>{const a=i===L.length-1,id='ex:'+t+':'+(a?'a':i);mk({id,k:'ex',p:0,blk:'ex',o:i,always:1,label:x,cal:a?`제${R0.r}회 시험 응시`:'',min:0,roll:'',done:!!tk[id]});});
    mk({id:'ex.note',k:'note',info:1,label:'문제 고르기 3분 → 시간 엄수 → 공란 금지'});return T;}   /* 시험 날에는 단계 안내를 띄우지 않는다 */
  const pn=phaseStart(t);if(pn)mk({id:'phase:'+pn.id,k:'phase',info:1,label:pn.text});
  const recap=T.some(x=>x.k==='recap'&&!x.done);   /* 48시간 복기는 손글씨(4문제 다시 쓰기)라 그날 단답은 늘 넣지 않고 시간 안에서 */
  /* 오늘 세트(평일·공휴일·시험 전 3일): 읽기·퀴즈, 숙제(필수 칸이 목표, 보통 날은 학원 횟수), 자기 전. 시험 전 3일은 읽기·퀴즈만 */
  const today=study&&SETS.sets[t]?t:null,qzT=(d,Q,blk,o)=>({id:'hw.qz:'+d,k:'hw.qz',d,blk,o,p:3,label:`퀴즈 틀린 ${Q.n}문제: 틀린 이유 한 줄`,prog:[Q.k,Q.n],min:Math.ceil((Q.n-Q.k)*MIN_PER.qz),roll:'오늘만',done:Q.k>=Q.n});
  const hwT=(k,d,H,o)=>Object.assign({id:k+':'+d,k,d,hw:H,floorLab:`필수 ${H.f}번`,labelN:o.label.replace(/\d+번$/,H.f+'번'),doneN:H.k>=H.n,doneF:H.K>=H.N,min:Math.ceil((H.N-H.K)*H.u),done:H.K>=H.N},o);
  if(today){const c=setCore(t),P=hwParts(t),sp1=ph<=2&&!chk,sp4=ph<=4&&!chk;   /* 쓰기·목차는 1~2단계, 단답은 1~4단계에서만 일요일까지 넘어가는 몫(시험이 든 주는 주말 몫이 없어 오늘만) */
    mk({id:'set.read:'+t,k:'set.read',d:t,blk:'am',o:10,p:2,always:1,label:`용어 ${c.st.nc}개 읽기`,sub:`${dlab(t)} 세트`,prog:[Math.min(c.st.read,c.st.nc),c.st.nc],min:c.r*MIN_PER.read,done:!c.r});
    mk({id:'set.quiz:'+t,k:'set.quiz',d:t,blk:'noon',o:10,p:2,always:1,label:`세트 퀴즈 ${c.st.nq}문`,prog:[Math.min(c.st.qa,c.st.nq),c.st.nq],min:c.q*MIN_PER.quiz,done:!c.q});
    if(P.qz)mk(qzT(t,P.qz,'noon',12));
    if(P.say)mk(hwT('hw.say',t,P.say,{blk:'noon',o:20,p:3,label:`새 용어 ${P.say.terms}개 소리 내어 말하기 ${P.say.F}번`,roll:'오늘만'}));
    if(P.write)mk(hwT('hw.write',t,P.write,{blk:'eve',o:10,p:4,label:`새 용어 ${P.write.terms}개 안 보고 쓰기 ${P.write.F}번`,roll:sp1?'일요일까지':'오늘만'}));
    if(P.dd)mk({id:'hw.dd:'+t,k:'hw.dd',d:t,blk:'eve',o:20,p:4,always:recap?0:1,floor:1,label:`단답 ${P.dd.n}문제: 답안지 10분 → 첨삭`,sub:(card(P.dd.ids[0])||{}).t||'',prog:[P.dd.k,P.dd.n],min:Math.ceil((P.dd.n-P.dd.k)*MIN_PER.dd),roll:sp4?'일요일까지':'오늘만',done:P.dd.k>=P.dd.n});
    if(P.eo)mk(hwT('hw.eo',t,P.eo,{blk:'eve',o:30,p:4,label:`논술 목차 옮겨 적기 ${P.eo.F}번`,roll:sp1?'일요일까지':'오늘만'}));
    if(P.fg)mk(hwT('hw.fg',t,P.fg,{blk:'eve',o:35,p:4,label:`그림·표 그리기 ${P.fg.F}번`,roll:ph===3&&!chk?'일요일까지':'오늘만'}));
    if(P.essay)mk({id:'essay:'+t,k:'essay',d:t,blk:'eve',o:40,p:P.essay.req?4:6,need:P.essay.req?'필수':'권장',fold:P.essay.req?0:1,label:'논술 실전 25분 → 첨삭',min:P.essay.k?0:MIN_PER.essay,roll:P.essay.req?(chk?'오늘만':'일요일까지'):'',done:!!P.essay.k});
    if(P.sl)mk({id:'hw.sl:'+t,k:'hw.sl',d:t,blk:'bed',o:10,p:3,always:1,label:'자기 전 5분: 오늘 용어 떠올리기',prog:[P.sl.k,1],min:P.sl.k?0:MIN_PER.sl,roll:'오늘만',done:!!P.sl.k});
    if(P.restMin)mk({id:'hw.rest:'+t,k:'hw.rest',d:t,fold:1,need:'권장',label:`숙제 나머지 · 약 ${P.restMin}분`,min:P.restMin,roll:''});
    if(!pre){const g=gqStat(t);if(g&&g.a<g.n)mk({id:'gq:'+t,k:'gq',d:t,fold:1,need:'여유',p:7,label:`용어 퀴즈 이어 풀기 · ${g.a}/${g.n}문`,min:MIN_PER.gq,roll:''});}}
  else if(study){const late9=nowMin()>=9*60,past=Object.keys(SETS.sets).some(d=>d>=wkFrom(W)&&d<t);   /* 9시가 지나도 오지 않으면: 이번 주 지난 세트가 있으면 그것부터, 없으면(월요일) 복습부터. 늘 "지금 받아 오기" */
    mk({id:'wait.set',k:'wait',info:1,sync:1,label:late9?(past?'오늘 세트가 아직 없어요 · 이번 주 지난 세트부터 해요':'오늘 세트가 아직 없어요 · 복습부터 해요'):'오늘 세트를 기다리는 중',sub:late9?'':'평일 06:21에 만들기 시작해 보통 30분 안에 와요.'});}
  /* 이번 주 지난 세트의 핵심(읽기 → 퀴즈): 평일은 가장 오래된 하나만 오늘 몫(나머지는 이번 주 줄), 토요일·공휴일 따라잡기, 일요일 밀린 핵심 */
  const sets=Object.keys(SETS.sets).filter(d=>d>=wkFrom(W)&&d<t).sort(),late=sets.filter(d=>!setCore(d).ok),lb=kind==='sun'?'core':kind==='sat'||kind==='holi'?'catch':'noon';
  late.forEach((d,i)=>{const c=setCore(d),g=[];if(c.r)g.push(`용어 ${c.st.read}/${c.st.nc}`);if(c.q)g.push(`퀴즈 ${c.st.qa}/${c.st.nq}`);
    mk(Object.assign({id:'late:'+d,k:'late',d,blk:lb,o:30+i,p:2,onlyWeek:lb==='noon'&&i>(cu?1:0),label:`밀린 세트 ${dlab(d)}: ${g.join(' · ')}`,min:c.gap},cu&&i===1?CU_PO(0):null));});
  /* 지난 세트의 퀴즈 틀린 이유: 그 퀴즈를 다 푼 날에만, 그 세트 줄 바로 뒤 */
  const cx=(S.cal[t]||{}).x||{};Object.keys(SETS.sets).filter(d=>d<t&&cx['quiz:'+d]).forEach(d=>{const Q=hwParts(d).qz,i=late.indexOf(d);if(Q)mk(qzT(d,Q,lb,i>=0?30+i+.5:39));});
  /* 평일에 9시가 지나도 오늘 세트가 없으면 손글씨 바닥으로 이번 주 가장 오래된 단답 1문(공휴일은 아래 손글씨 몫 q.dd가 바닥을 맡는다: 같은 id·같은 칸을 두 번 만들지 않음) */
  if(study&&kind!=='holi'&&!today&&!pre&&!chk&&!cu&&nowMin()>=9*60){   /* 나눠 하는 날은 아래 손글씨 몫 q.dd가 바닥을 맡는다(같은 id) */const g=sets.map(d=>[d,hwParts(d).dd]).find(([,x])=>x&&x.k<x.n);
    if(g)mk({id:'q.dd:'+W,k:'q.dd',quota:{q:'dd',nm:'단답 손글씨',un:'문',u:MIN_PER.dd,n:1,nc:1,a:0,list:[{d:g[0],left:1}],floorOnly:1},blk:'eve',o:25,p:4,label:'단답 손글씨 1문',sub:dlab(g[0]),prog:[0,1],min:MIN_PER.dd});}
  revCands(t,kind).forEach(x=>mk(x));
  /* 카드 복습: 오늘 몫은 평일 30장·주말 60장까지(넣을 수 있는 필수 세트 복습을 다 넣은 뒤 남은 시간에, §3.7). 넘침 단계로 접거나 놓아주지 않는다(fill) */
  const N=cardsOut(t).length,kc=Math.min(N,wkend?60:30);
  if(kc||tk['cards:'+t])mk({id:'cards:'+t,k:'cards',fill:1,blk:kind==='sat'?'catch':kind==='sun'?'flush':'am',o:wkend?85:30,p:5,need:wkend?'필수':'권장',label:`카드 복습 ${kc}장`,sub:cp===3?'약점 단원 먼저':'세트 복습 뒤에 해요',weak:cp===3,kc,N,min:Math.ceil(kc*MIN_PER.card),roll:'다시 나와요',done:!!tk['cards:'+t]});
  /* 오답 다시 풀기(오늘 세트 퀴즈 오답은 숙제 "틀린 이유"가 다룬다): 금·일요일 필수 */
  const wn=wrongList().filter(x=>!(x.type==='quiz'&&x.d===t)).length,wq=kind==='sun'||dw===5&&kind!=='sat';
  if(wn||tk['wrong:'+t])mk({id:'wrong:'+t,k:'wrong',blk:kind==='sun'?'flush':kind==='sat'?'catch':'noon',o:wkend?90:40,p:wq?3:6,need:wq?'필수':'권장',label:`오답 다시 풀기 ${wn}개`,n:wn,min:Math.min(10,wn)*MIN_PER.wrong,roll:'다시 나와요',done:!!tk['wrong:'+t]||!wn});
  /* 이번 주 모의고사: 토요일 교시마다(3·4교시는 리허설 주가 아니면 일요일), 채점(모의가 MOCK_GRADE_SINCE 이후이고 문제가 있을 때. 실전 응시 날의 알림뿐인 모의는 채점이 없다).
     늘 넣는 것은 그날의 교시와 그 뒤 채점뿐. 일요일의 토요일 안 쓴 교시는 밀린 핵심(P1)으로 남은 시간 안에서, 못 넣으면 "→ 다음 모의 전까지" */
  const D=weekMock(t);
  if(wkend){if(D){const m=SETS.mocks[D],pr=S.mockp[D]||{},ps=mockParts(m),rh=!!weekObj(w).pre,sunP=k=>(k==='p3'||k==='p4')&&!rh,hasSun=ps.some(sunP),own=k=>kind==='sat'||sunP(k);
      ps.forEach((k,i)=>{if(kind==='sat'&&sunP(k))return;const n=m[k].length;mk({id:`mock:${D}:${k}`,k:'mock',d:D,pk:k,mock:1,paper:1,blk:own(k)?k:'core',o:i,p:1,always:own(k)?1:0,
        label:k==='p1'?'주간 모의고사 1교시 단답 · 13문 중 10문':`주간 모의고사 ${k[1]}교시 논술 ${n<6?n+'문':'6문 중 4문'}`,sub:k==='p1'&&kind==='sat'?'09:00에 시작하면 실제 시험과 같아요':'',min:mockMin(m,k),roll:'다음 모의 전까지',done:!!pr[k]});});
      if(D>=MOCK_GRADE_SINCE&&ps.length&&D!==(PLAN.mock&&PLAN.mock.d)&&D!==PLAN.target.d&&!(kind==='sat'&&hasSun))mk({id:'mock.g:'+D,k:'mock.g',d:D,mock:1,blk:kind==='sat'?'grade':hasSun?'p4':'core',o:9,p:1,always:kind==='sat'||hasSun?1:0,label:'채점 요청 → 채점 받았어요',min:MIN_PER.grade,roll:'다음 모의 전까지',done:!!pr.g});}
    else if(kind==='sat'){const ws=mockWait(t);mk({id:'wait.mock',k:'wait',info:1,sync:1,label:/아직/.test(ws)?'주간 모의고사가 아직 없어요 · 밀린 것부터 해요':'주간 모의고사를 기다리는 중',sub:/아직/.test(ws)?'':/만드는/.test(ws)?'만드는 중이에요. 보통 30분 안에 와요.':'토요일 06:21에 만들기 시작해요.'});}}   /* 9시가 지나도 없으면 평일 세트처럼 "아직 없어요"(늘 지금 받아 오기) */
  /* 주말·공휴일 손글씨 몫: 이번 주 지난 세트의 필수 칸 중 남은 것(이번 단계 약속에 있는 줄만, 오래된 세트부터 세트째로).
     평일 저녁에 나눠 하는 주(cu)는 평일에도 저녁 블록에(다시 쓰기는 평일 x.redo 줄이 맡아 빼고, 반 규칙 없이 들어가는 만큼) */
  if((wkend||kind==='holi'||cu)&&!chk){const cut=!!(S.wk&&S.wk[W]&&S.wk[W].cut);
    (QORD[cp]||[]).forEach((q,qi)=>{if(cu&&q==='redo')return;const[nm,un,uk,pk]=QK[q],u=MIN_PER[uk],list=[];let n=0,a=0;
      if(q==='redo'){n=5;a=Math.min(5,redoDone(W));for(let j=a;j<5;j++)list.push({d:'u'+j,left:1});}
      else sets.forEach(d=>{const x=hwParts(d)[pk];if(!x||!x.n)return;n+=x.n;a+=Math.min(x.k,x.n);if(x.k<x.n)list.push({d,left:x.n-x.k});});
      if(!n)return;const nc=q==='essay'||q==='redo'?Math.min(n,3):Math.ceil(n*.6),tg=cut?nc:n,lf=Math.max(0,tg-a);
      mk(Object.assign({id:`q.${q}:${W}`,k:'q.'+q,quota:{q,nm,un,u,n,nc,a,list},blk:kind==='sun'?'hand':cu?'eve':'catch',o:(kind==='sun'?10:cu?45:50)+qi,p:4,label:`${nm} ${lf}${un}`,sub:q==='redo'?'지난 모의 틀린 문제':list.map(s=>dlab(s.d)).join(' · '),prog:[Math.min(a,tg),tg],min:Math.ceil(lf*u),done:!lf},cu?CU_PO(1+qi):null));});
    if(cp===4&&wkend){const g50=[0,1,2,3,4,5,6].map(i=>addDays(W,i)).filter(d=>((S.daily[d]||{}).graded||0)>=50);if(g50.length<5||g50.includes(t))mk({id:'x.rot:'+t,k:'x.rot',blk:kind==='sat'?'catch':'flush',o:70,p:4,label:'카드 50장 돌리기',n:50,min:MIN_PER.rot50,roll:'오늘만',to:'start-rot',done:g50.includes(t)});}}
  /* 일요일 주간 마감: 주간 리포트(필수), 이번 주 목표·백업(시간이 되면). 월요일: 지난주 리포트를 아직 안 냈으면 */
  /* 일요일을 쉬는 날로 정한 주: 토요일이 주간 리포트(따라잡기 맨 끝) */
  if(kind==='sat'&&dayOff(addDays(t,1)))mk({id:'report:'+W,k:'report',w:W,blk:'catch',o:95,p:1,always:1,label:'주간 리포트 복사 → Claude',min:tk['report:'+W]?0:MIN_PER.report,roll:'오늘 밤까지',done:!!tk['report:'+W]});
  if(kind==='sun'){mk({id:'report:'+W,k:'report',w:W,blk:'close',o:10,p:1,always:1,label:'주간 리포트 복사 → Claude',min:tk['report:'+W]?0:MIN_PER.report,roll:'오늘 밤까지',done:!!tk['report:'+W]});
    const gs=weekObj(w).goals||[],gd=gs.filter((_,i)=>tk['goal:'+W+':'+i]).length;if(gs.length&&gd<gs.length)mk({id:'goal:'+W,k:'goal',w:W,blk:'close',o:30,fold:1,need:'권장',label:`이번 주 목표 ${gd}/${gs.length}`,min:(gs.length-gd)*MIN_PER.goal});
    const bl=tk.backup||S.created||'';if(!bl||diffDays(bl,t)>=14)mk({id:'backup',k:'backup',blk:'close',o:40,fold:1,need:'여유',p:7,label:tk.backup?`백업 파일 저장 · 마지막 ${diffDays(tk.backup,t)}일 전`:'백업 파일 저장',min:MIN_PER.backup,roll:'',to:'backup'});}
  if(dw===1&&study){const LW=addDays(W,-7);if(weekIndex(LW)>=0&&!tk['report:'+LW])mk({id:'report:'+LW,k:'report',w:LW,fold:1,need:'권장',label:'지난주 리포트 아직 · 10분',min:MIN_PER.report,roll:''});}
  /* 단계·요일의 할 일(PE_EXTRA): 필수는 오늘 몫 줄, 권장은 시간이 되면 */
  ((PE_EXTRA[pre?'pre3':phaseKey(w)]||{})[kind==='sat'?'sat':kind==='sun'?'sun':'wd']||[]).forEach(x=>{if(x.dow&&x.dow!==dw)return;
    if(x.after==='essay'){const E2=Object.keys(SETS.sets).filter(d=>d<t&&diffDays(d,t)<=3&&(spGet(d).essay||{}).done).sort().pop();if(E2&&!tk[x.k+':'+E2])mk({id:x.k+':'+E2,k:x.k,d:E2,ex:x,fold:1,need:x.need,label:x.t,min:x.min,roll:''});return;}
    if(x.auto==='score'&&!D)return;   /* 모의 점수 적기: 이번 주 모의가 있을 때만(그 모의 화면에서 적는다) */
    const id=x.k+':'+(wkend?W:t),req=x.need==='필수',pin=x.blk==='pin';   /* 날짜가 정해진 일(시험 전날 준비물): 맨 위 핀, 늘 넣음 */
    mk(Object.assign({id,k:x.k,ex:x,blk:x.blk||null,o:{'x.rot':40,'x.outline':50,'x.redo':50,kit:60,budget:5,redo:5,'x.trend':15,kichul:20,sum16:50,prep:55}[x.k]||60,p:req?4:6,need:x.need,fold:req?0:1,
      label:x.t,min:x.min,roll:req?(x.k==='x.redo'?'일요일까지':'오늘만'):'',to:x.to||null,n:x.k==='x.rot'?(pre?30:50):null,done:extraDone(x,id,t,W,D)},x.auto==='score'?{d:D}:null,pin?{p:0,o:2,always:1,roll:(n=>n===1?'내일 시험':'D-'+n)(Math.min(...rounds.map(r=>diffDays(t,r.d)).filter(n=>n>0))),urg:1}:null));});
  /* 지난주에서 넘어온 것(권장): 핵심이 빈 최근 세트 3개, 안 쓴 교시가 있는 지난주 모의(새 모의가 오기 전까지, 늘 접힌 줄) */
  const LW=addDays(W,-7),LF=wkFrom(LW),ls=Object.keys(SETS.sets).filter(d=>d>=LF&&d<W).sort().reverse().filter(d=>!setCore(d).ok).slice(0,3);
  if(ls.length)mk({id:'carry.sets:'+W,k:'carry.sets',ds:ls,blk:'catch',o:60,need:'권장',fold:kind==='sat'?0:1,label:`지난주 세트 읽기·퀴즈 ${ls.length}개`,sub:ls.map(dlab).join(' · '),min:ls.reduce((a,d)=>a+setCore(d).gap,0),roll:'이번 일요일까지'});
  const lm=Object.keys(SETS.mocks).filter(x=>/^\d{4}-/.test(x)&&x>=LF&&x<W).sort().pop();
  if(lm&&!D){const m=SETS.mocks[lm],pr=S.mockp[lm]||{},lf=mockParts(m).filter(k=>!pr[k]);if(lf.length)mk({id:'carry.mock:'+lm,k:'carry.mock',d:lm,fold:1,need:'권장',never:1,label:`지난주 모의고사 이어 쓰기 · ${md(lm)}`,min:lf.reduce((a,k)=>a+mockMin(m,k),0),roll:'토요일 새 모의 전까지'});}
  if(study&&!pre){const nn=Math.min(newRoom(),newCards(rangeUnits(S.range)).length);if(nn)mk({id:'new:'+t,k:'new',fold:1,need:'여유',p:7,label:`새 카드 ${nn}장`,min:Math.ceil(nn*.7),roll:''});}
  return T;}
/* 고른 줄의 남은 분과 끝: 숙제 칸은 고정한 목표(full·floor)까지, 손글씨 몫은 고정할 때 고른 세트의 칸만(그 세트의 칸에서 바로 셈), 목록에서 사라진 일은 끝 */
function rowStat(r,x){
  if(r.q){const a=r.id.split(':'),q=a[0].slice(2),K=QK[q];let l=0;if(!K)return[0,true];
    if(q==='redo')l=Math.max(0,r.q.reduce((s,e)=>s+e[1],0)-(redoDone(a[1])-Number(String(r.q[0][0]).slice(1))));
    else r.q.forEach(([d,n])=>{const p=hwParts(d)[K[3]];if(p)l+=Math.min(n,Math.max(0,p.n-p.k));});
    l=Math.ceil(l*MIN_PER[K[2]]);return[Math.min(r.m,l),!l];}
  if(!x){if(/^report:/.test(r.id)&&!(S.tk||{})[r.id])return[r.m,false];return[0,true];}   /* 주간 리포트는 복사했을 때만 끝(일요일을 다시 공부하는 날로 바꾸면 토요일 줄이 목록에서 빠진다) */
  if(x.hw){const H=x.hw,f=r.tgt==='full',l=Math.ceil(Math.max(0,f?H.N-H.K:H.n-H.k)*H.u);return[Math.min(r.m,l),f?H.K>=H.N:H.k>=H.n];}
  return[x.done?0:Math.min(r.m,x.min),!!x.done];}
/* 오늘 한 분: 고정한 줄마다 (고정한 분 − 남은 분) + 다시 짤 때 넘겨받은 분 */
function planDoneMin(F){if(!F)return 0;const T=taskList(F.d);return(F.dm||0)+F.rows.reduce((a,r)=>a+Math.max(0,r.m-rowStat(r,T.find(x=>x.id===r.id))[0]),0);}
/* 넣지 못한 필수 줄이 가는 곳. 쉬는 날로 정한 날·시험 날은 건너뛴다(토요일이 아니면 일요일, 주말이 다 안 되면 다음 주로). 평일 저녁에 나눠 하는 주는 내일 저녁 */
function planDest(kind,t,x,T){const dw=parse(t).getDay();if(x.k==='rev'||x.k==='cards'||x.k==='wrong')return'내일 다시 나와요';if(x.roll==='오늘만')return'오늘만이라 놓아줘요';
  const W=wkStart(t),Sa=addDays(W,5),Su=addDays(W,6),can=d=>d>t&&!dayOff(d)&&dayKind(d)!=='exam',core=x.k==='late'||x.k==='set.read'||x.k==='set.quiz';
  const away=()=>core&&uniq((T||[]).filter(r=>r.k==='late'||(r.k==='set.read'||r.k==='set.quiz')&&!r.done).map(r=>r.d)).sort().slice(-3).includes(x.d)?"다음 주 '지난주 세트'":'다음 주로 놓아줘요';
  if(x.mock)return dw===6&&can(Su)?'내일(일) 밀린 핵심':'다음 모의 전까지';
  /* 평일 저녁에 나눠 하는 주(cu): 월~목의 손글씨 몫·밀린 세트(오늘 세트의 일요일까지 숙제 칸도 내일 손글씨 몫이 된다)는 내일 저녁(내일도 나눠 하는 평일·공휴일일 때) */
  if(dw>=1&&dw<=4&&cuOn(t)&&(x.quota||x.k==='late'||x.roll==='일요일까지'&&/^(hw\.(write|dd|eo|fg)|essay)$/.test(x.k))){const tm=addDays(t,1);if(can(tm)&&(cuOn(tm)||dayKind(tm)==='holi'))return'내일 따라잡기';}
  if(dw>=1&&dw<=5){if(can(Sa))return'토요일 따라잡기';if(can(Su))return core?'일요일 밀린 핵심':'일요일 손글씨 몫';const tm=addDays(t,1);return core&&dw<5&&can(tm)?'내일 따라잡기':away();}
  if(dw===6&&can(Su)&&x.k!=='report')return core?'내일(일) 밀린 핵심':'내일(일) 손글씨 몫';
  return away();}
const qMerge=(a,b)=>{const m=new Map();a.concat(b).forEach(([d,n])=>m.set(d,(m.get(d)||0)+n));return[...m];};   /* 손글씨 몫 칸 [[세트, 칸]] 합치기 */
/* 손글씨 몫의 목표(줄인 목표면 × 0.6, 논술·다시 쓰기는 3)와 그만큼의 세트(오래된 것부터) */
function quotaAim(x,cut){const Q=x.quota,tg=cut?Q.nc:Q.n,lf=Math.max(0,tg-Q.a);let need=lf;x.list=Q.list.filter(s=>{if(need<=0)return false;need-=s.left;return true;});
  x.left=lf;x.prog=[Math.min(Q.a,tg),tg];x.min=Math.ceil(lf*Q.u);x.label=`${Q.nm} ${lf}${Q.un}`;x.shrunk=cut&&Q.nc<Q.n;x.done=!lf;}
/* 오늘 몫 고르기(읽기만). 남은 시간 capLeft 안에서 우선순위·블록 순서대로, 넘침 단계 lv는 이번 주 남은 필수(B)와 남은 날의 공부 시간(C)으로(시계·"오늘 시간"과 무관).
   o: now 자정부터 분, user 오늘 시간(30·60·90), lv 고정한 단계, keep 고정해 둔 줄, used0 그 줄들의 남은 분, dm 오늘 한 분, noFill 고르지 않고 나머지만 나눔 */
function dayPlan(t,o){o=o||{};t=t||todayStr();const kind=dayKind(t),W=wkStart(t),now=o.now!=null?o.now:nowMin(),leftNow=Math.max(0,DAY_END-now),user=o.user||null;
  const off=!user&&dayOff(t),cap=budgetOf(t,kind),capLeft=user?Math.min(user,leftNow):Math.max(0,Math.min(cap-(o.dm||0),leftNow)),lv=o.lv!=null?o.lv:weekBoard(t).lv,full=lv===0&&!user,cut=lv>=2||!!(S.wk&&S.wk[W]&&S.wk[W].cut);
  let keep=o.keep||[];const kid=new Set(keep.map(r=>r.id)),T=taskList(t).map(x=>Object.assign({},x)),freed=[],pick=[],rest=[],bs=PLAN_BLOCKS[kind]||[];
  const seq=x=>{const i=bs.indexOf(x.pb||x.blk);return(i<0?99:i)*1000+(x.pb?x.po:x.o||0);},ord=(a,b)=>a.p-b.p||seq(a)-seq(b);   /* pb·po: 고르는 순서만 다른 줄(CU_PO) */
  T.forEach(x=>{if(x.hw){const H=x.hw;x.tgt=full?'full':'floor';x.prog=full?[H.K,H.N]:[H.k,H.n];x.min=Math.ceil(Math.max(0,full?H.N-H.K:H.n-H.k)*H.u);x.minFloor=Math.ceil(Math.max(0,H.n-H.k)*H.u);x.meta=full?x.floorLab:`오늘은 ${H.f}번까지`;x.done=full?x.doneF:x.doneN;}
    if(x.quota)quotaAim(x,cut);});
  /* 다시 짤 때(o.grow) 나눠 하는 날의 손글씨 몫과 id가 같은 끝낸 줄(9시 바닥 단답 1문 등)이 있으면: 남은 칸을 그 줄에 이어 붙여 오늘 다시 고른다(못 넣으면 끝낸 줄 그대로) */
  const grow=new Map();if(o.grow)T.forEach(x=>{if(!x.quota||!x.pb||x.done||!kid.has(x.id))return;const r=keep.find(r=>r.id===x.id);if(r&&r.q&&rowStat(r,x)[1]){grow.set(x.id,r);kid.delete(x.id);}});
  if(grow.size)keep=keep.filter(r=>!grow.has(r.id));
  /* 단계: 1 이상 권장은 접음, 2 이상 손글씨 몫 × 0.6(위)·카드 30장까지·지난주 세트 뺌, 3은 몫·오답을 놓아줌.
     세트 복습·카드 복습(fill)은 단계로 접거나 놓아주지 않고 필수 다음 남은 시간에 채운다(필수인지는 단계와 무관하게 revCands가 정한다) */
  T.forEach(x=>{if(x.done||x.info)return;if(lv>=1&&x.need==='권장'&&!x.fill)x.fold=1;
    if(lv>=2){if(x.k==='cards'&&x.kc>30){x.kc=30;x.min=Math.ceil(30*MIN_PER.card);x.label='카드 복습 30장';}if(x.k==='carry.sets')x.drop=1;}
    if(lv>=3&&(x.quota||x.k==='wrong')){x.freed=1;freed.push(x);}});
  const pool=T.filter(x=>!x.done&&!x.fold&&!x.info&&!x.onlyWeek&&!x.freed&&!x.drop&&!kid.has(x.id));let used=o.used0||0;
  /* 고정한 손글씨 몫의 남은 세트는 새 줄로 만들지 않고 옮긴 것으로만 */
  T.filter(x=>x.quota&&!x.done&&kid.has(x.id)).forEach(x=>{const r=keep.find(r=>r.id===x.id),tk=new Map((r.q||[]).map(([d,n])=>[d,n]));let lf=0;x.list.forEach(s=>{lf+=Math.max(0,s.left-(tk.get(s.d)||0));});
    if(lf>0)rest.push(Object.assign({},x,{min:Math.ceil(lf*x.quota.u),label:`${x.quota.nm} ${lf}${x.quota.un}`,msets:x.list.filter(s=>s.left>(tk.get(s.d)||0)).map(s=>s.d)}));});
  if(o.noFill)pool.forEach(x=>rest.push(x.quota?Object.assign(x,{msets:x.list.map(s=>s.d)}):x));   /* 손글씨 몫은 남은 세트 날짜까지(같은 이름의 오늘 숙제 줄과 갈리게) */
  else{/* 1) 늘 넣음: 날짜 일(P0), 그날의 모의 교시·그 뒤 채점·주간 리포트(P1), 오늘 세트 읽기·퀴즈, 오늘 단답, 자기 전. 줄인 날 안 들어가는 모의 교시는 내일로.
       그다음 늘 넣지 않는 P1(일요일의 토요일 안 쓴 교시·채점)은 남은 시간 안에서만 */
    pool.filter(x=>x.always).sort(ord).forEach(x=>{if(off&&x.blk!=='pin')return rest.push(x);if(x.mock&&user&&used+x.min>capLeft)return rest.push(x);pick.push(x);used+=x.min;});   /* 쉬는 날은 날짜 일(핀)만 */
    pool.filter(x=>!x.always&&x.p<=1).sort(ord).forEach(x=>{if(used+x.min>capLeft)return rest.push(x);pick.push(x);used+=x.min;});
    /* 2) 손글씨 바닥: 오늘 단답도, 오늘 몫의 모의 답안·48시간 복기도 없으면 가장 오래된 단답 몫에서 1문(놓아준 날에도) */
    const paper=pick.some(x=>x.paper||x.k==='hw.dd'||x.k==='recap')||T.some(x=>x.k==='hw.dd'&&x.done)||(o.keep||[]).some(r=>/^(mock:|hw\.dd:|q\.|recap:)/.test(r.id));
    if(!paper&&!off){const q=T.find(x=>x.quota&&x.quota.q==='dd'&&x.list.length&&!x.done&&!kid.has(x.id))||T.find(x=>x.quota&&x.list.length&&!x.done&&!kid.has(x.id));
      if(q){q.floorQ=1;if(q.freed){q.freed=0;freed.splice(freed.indexOf(q),1);q.list=[{d:q.list[0].d,left:1}];q.left=1;q.min=Math.ceil(q.quota.u);q.relFloor=1;}if(!pool.includes(q))pool.push(q);}}
    /* 3) 나머지: 우선순위·블록 순서대로 남은 시간 안에서. 몫은 세트째로(토요일·공휴일은 반까지), 카드 복습은 세트 복습을 다 넣었을 때만 */
    /* 나눠 하는 날(CU_PO 줄이 있을 때): 오늘 숙제는 필수 칸으로 먼저 넣고, 더 하기(학원 횟수까지)는 나눠 넣는 줄 뒤에 남은 시간이 있으면 */
    const L3=pool.filter(x=>!pick.includes(x)&&!rest.includes(x)).sort(ord),lastCu=L3.map(x=>!!x.pb).lastIndexOf(true),ups=[];
    const upFull=x=>{const H=x.hw;Object.assign(x,{tgt:'full',prog:[H.K,H.N],min:x.fullMin,meta:x.floorLab});};
    const cuUp=()=>ups.forEach(x=>{if(!x.minFloor){if(used+x.fullMin<=capLeft){upFull(x);pick.push(x);used+=x.min;}else rest.push(x);return;}
      if(pick.includes(x)&&used+x.fullMin-x.min<=capLeft){used+=x.fullMin-x.min;upFull(x);}});
    const pick3=x=>{if(off&&x.blk!=='pin')return rest.push(x);
      /* 몫 반 규칙: 토요일(일요일을 쉬는 날로 정했으면 들어가는 만큼 다)·공휴일 */
      if(x.quota){let room=capLeft-used,k=0;const half=(kind==='sat'&&!dayOff(addDays(t,1)))||kind==='holi'?Math.ceil(x.left/2):Infinity,take=[];
        for(const s of x.list){if(k>=half)break;const m=Math.ceil(s.left*x.quota.u);if(m>room&&!(x.floorQ&&k===0))break;const n1=m>room?1:s.left;room-=Math.ceil(n1*x.quota.u);k+=n1;take.push([s.d,n1]);}
        if(k){const Q=x.quota,g=grow.get(x.id),tk=g?qMerge(g.q,take):take,kt=tk.reduce((a,e)=>a+e[1],0);
          pick.push(Object.assign({},x,{take:tk,m0:g?g.m:0,min:Math.ceil(k*Q.u),label:`${Q.nm} ${kt}${Q.un}`,sub:Q.q==='redo'?x.sub:tk.map(([d,n])=>dlab(d)+(n>1?' '+n+Q.un:'')).join(' · '),prog:[kt-k,kt]},g?{blk:g.blk,o:g.o}:null));used+=Math.ceil(k*Q.u);
          if(k<x.left)rest.push(Object.assign({},x,{min:Math.ceil((x.left-k)*Q.u),label:`${Q.nm} ${x.left-k}${Q.un}`,msets:x.list.filter(s=>s.left>((take.find(e=>e[0]===s.d)||[0,0])[1])).map(s=>s.d)}));}
        else rest.push(Object.assign(x,{msets:x.list.map(s=>s.d)}));return;}
      if(x.k==='cards'&&T.some(r=>r.k==='rev'&&!r.done&&!r.fold&&r.need==='필수'&&!pick.includes(r)&&!kid.has(r.id))){x.wait=1;return rest.push(x);}   /* 넣을 수 있는 필수 세트 복습이 빠졌을 때만 기다림 */
      if(x.k==='cards'){/* 장 수는 넣은 세트 복습의 카드를 빼고 다시 센다(그 세트 복습에서 매기므로) */const sk=new Set();pick.concat(keep).forEach(r=>{const a=r.id.split(':');if(a[0]==='rev')setIds(a[1]).forEach(id=>sk.add(id));});
        const kc=Math.min(dueP().filter(c=>!sk.has(c.id)&&pget(c.id).last!==t).length,x.kc);if(!kc)return;Object.assign(x,{kc,min:Math.ceil(kc*MIN_PER.card),label:`카드 복습 ${kc}장`});}
      if(used+x.min<=capLeft||x.k==='late'&&x.min<=5&&lv>=3){pick.push(x);used+=x.min;return;}
      if(x.hw&&x.tgt==='full'&&x.minFloor&&used+x.minFloor<=capLeft){const H=x.hw;Object.assign(x,{tgt:'floor',prog:[H.k,H.n],min:x.minFloor,meta:`오늘은 ${H.f}번까지`});pick.push(x);used+=x.min;return;}
      rest.push(x);};
    L3.forEach((x,i)=>{if(lastCu>=0&&i<lastCu&&!off&&x.hw&&x.tgt==='full'){const H=x.hw;x.fullMin=x.min;ups.push(x);if(!x.minFloor)return;Object.assign(x,{tgt:'floor',prog:[H.k,H.n],min:x.minFloor,meta:`오늘은 ${H.f}번까지`});}
      pick3(x);if(i===lastCu)cuUp();});}
  /* 넣지 못한 숙제 줄은 필수 칸만 옮긴다(더 하기 칸은 빚이 아니라 시간이 되면) */
  rest.forEach(x=>{if(!x.hw)return;if(!x.minFloor){x.need='권장';return;}Object.assign(x,{tgt:'floor',min:x.minFloor,label:x.labelN,prog:[x.hw.k,x.hw.n],meta:`오늘은 ${x.hw.f}번까지`});});
  rest.forEach(x=>{if(x.need==='필수')x.dest=planDest(kind,t,x,T);});
  grow.forEach((r,id)=>{if(!pick.some(x=>x.id===id))keep=keep.concat([r]);});   /* 이어 붙이지 못한 끝낸 줄은 그대로 */
  const rows=keep.map(r=>Object.assign({},r,{task:T.find(x=>x.id===r.id)||null})).concat(pick.map(x=>({id:x.id,m:x.min+(x.m0||0),tgt:x.tgt||null,blk:x.blk,o:x.o,q:x.take,task:x})))
    .map((r,i)=>[r,i]).sort((a,b)=>{const ia=bs.indexOf(a[0].blk),ib=bs.indexOf(b[0].blk);return(ia<0?99:ia)-(ib<0?99:ib)||(a[0].o||0)-(b[0].o||0)||a[1]-b[1];}).map(a=>a[0]);
  const fold=T.filter(x=>x.fold&&!x.done&&!x.info&&!x.freed&&!x.drop&&!x.onlyWeek&&!kid.has(x.id)).concat(rest.filter(x=>x.need!=='필수')).sort(ord);
  return{t,kind,cap,capLeft,leftNow,now,lv,user,used,rows,moved:rest.filter(x=>x.need==='필수'),fold,freed,info:T.filter(x=>x.info),onlyWeek:T.filter(x=>x.onlyWeek&&!x.done)};}
/* 오늘 몫 고정: 평일은 그날 세트, 토요일은 모의가 오면(늦어도 9시). 받아 오는 중(앱을 열 때·앞으로 올 때·복원 뒤)에는 고정하지 않고
   받아 온 뒤 그 자료로 고정한다(sync 끝에서 다시 그림). 9시 규칙은 받아 온 뒤에도 없는 자료에만 */
function canFreeze(t,now){const k=dayKind(t);if(syncing)return false;if(now>=9*60||k==='sun'||k==='exam')return true;if(isStudy(k))return!!SETS.sets[t];if(k==='sat')return!!weekMock(t);return true;}
const daySig=t=>[SETS.sets[t]?1:0,weekMock(t)||'',Object.keys(SETS.sets).filter(d=>d>=wkStart(t)&&d<=t).length].join('|');
const rowRec=r=>{const o={id:r.id,m:r.m,tgt:r.tgt||null,blk:r.blk,o:r.o||0};if(r.q)o.q=r.q;if(r.dep)o.dep=r.dep;return o;};
/* 줄인 목표는 그 주 동안 그대로(오늘 시간으로 줄인 날은 걸지 않음). 건 단계를 cph에 적어 두고, 시험 일정이 바뀌어 단계가 달라지면 푼다 */
function ratchet(t,lv,user){if(dayOff(t))return;   /* 쉬는 날에 고정한 단계는 줄인 목표·lvx에 넣지 않는다(같은 날 "다시 공부할래요"로 되돌릴 수 있게) */const W=wkStart(t),x=S.wk[W]||(S.wk[W]={});x.lvx=Math.max(x.lvx||0,lv||0);   /* lvx: 그 주에 고정한 가장 높은 단계(지난주 기록) */
  if(lv<2||user)return;if(!x.cut){x.cut=true;x.cph=phaseObj(wkIdx(t)).id;}}
/* 고정 뒤 오직 하나 더하는 줄: 고정한 세트 퀴즈(밀린 세트 포함)를 다 풀고 틀린 것이 있으면 "틀린 이유" 줄을 그 뒤에 */
function depInsert(t,F){let ch=0;const T=taskList(t);F.rows.slice().forEach(r=>{if(!/^(set\.quiz|late):/.test(r.id))return;const D=r.id.split(':')[1],qid='hw.qz:'+D;if(F.rows.some(x=>x.id===qid))return;
  const x=T.find(x=>x.id===qid);if(!x||x.done)return;F.rows.splice(F.rows.indexOf(r)+1,0,{id:qid,m:x.min,tgt:null,blk:r.blk,o:(r.o||0)+.5,dep:r.id});ch=1;});return ch;}
/* 오늘 몫(그날 한 번 고정). 9시 전에 그날 자료가 없으면 고정하지 않고 그때그때 계산한다. 고정 뒤에 바뀌는 길:
   자료가 옴(sig) → 합침: 고정한 줄은 그대로, 새 줄은 남은 시간 안에(새 세트의 늘 넣는 줄은 늘). o.replan(cap 오늘 시간·reset 다시 짜기·sched 시험 일정·budget 공부 시간·off 오늘은 쉬어요·day 앞날의 공부 시간(오늘 단계 그대로)·catch 평일 저녁에 나눠 하기)
   → 다시 고름: 끝낸 줄은 그 자리 그대로, 나머지만 새로(오늘 한 분은 이어 셈). 새 날·PLAN_V·복원·초기화 → 새로 */
function planToday(t,o){o=o||{};t=t||todayStr();const now=o.now!=null?o.now:nowMin(),W=wkStart(t),sig=daySig(t);S.wk=S.wk||{};S.tk=S.tk||{};
  if(UI.d!==t){UI.d=t;UI.later={};UI.act=null;UI.open={};}if(o.replan==='reset')UI.later={};
  nextApply(t);weekSnap(t);let F=S.today;   /* 기다리던 시험 일정이 이번 월요일부터면 지난주를 지금 계획으로 고정한 뒤 넣는다(오늘 몫을 고정해 두었으면 다시 고름) */if(F&&(F.d!==t||F.v!==PLAN_V))F=S.today=null;
  if(!F){/* "오늘 시간"을 고르면 자료를 기다리지 않고 바로 고정(고른 시간을 S.today.user에 둔다) */
    const user=o.replan==='cap'&&o.user||null,P=dayPlan(t,{now,user});if(!user&&!dayOff(t)&&!canFreeze(t,now))return planView(t,P,null,now);   /* 쉬는 날은 자료를 기다리지 않고 바로 고정 */
    F=S.today={d:t,at:hmOf(now),v:PLAN_V,lv:P.lv,cap:P.capLeft,user,sig,dm:0,rows:P.rows.map(rowRec)};ratchet(t,P.lv,user);save(1);}
  else if(o.replan){if(o.replan==='sched'){const x=S.wk[W];if(x&&x.cut&&x.cph!==phaseObj(wkIdx(t)).id){x.cut=false;delete x.cph;pmPlan();}}
    /* 시험 일정이 바뀌어 할 일 목록에서 사라진 줄(다른 단계의 할 일, 옮긴 시험 날의 일): 바꾸기 전에 끝났던 것만 남기고(o.pre = planPre()), 남은 것은 뺀다.
       손글씨 몫(r.q)은 고른 세트의 칸으로 바로 센다 */
    const lv=o.replan==='cap'&&!o.relv||o.replan==='day'?F.lv:weekBoard(t).lv,T=taskList(t),gone=r=>o.replan==='sched'&&!r.q&&!T.some(x=>x.id===r.id),
      st=F.rows.map(r=>[r,gone(r)?(o.pre&&o.pre.get(r.id))||[r.m,false]:rowStat(r,T.find(x=>x.id===r.id))]),done=st.filter(a=>a[1][1]).map(a=>a[0]);
    if(o.replan==='cap')F.user=o.user||null;if(o.replan==='off')F.user=null;F.lv=lv;F.dm=(F.dm||0)+st.filter(a=>!a[1][1]).reduce((s,a)=>s+Math.max(0,a[0].m-a[1][0]),0);
    const P=dayPlan(t,{now,user:F.user,lv,keep:done,grow:1,dm:F.dm+done.reduce((s,r)=>s+r.m,0)});
    Object.assign(F,{rows:P.rows.map(rowRec),cap:P.capLeft,at:hmOf(now),sig});ratchet(t,F.lv,F.user);save(1);}
  else if(F.sig!==sig){const T=taskList(t),left=F.rows.reduce((s,r)=>s+rowStat(r,T.find(x=>x.id===r.id))[0],0);
    const P=dayPlan(t,{now,user:F.user,lv:F.lv,keep:F.rows,used0:left,dm:planDoneMin(F)});F.rows=P.rows.map(rowRec);F.sig=sig;save(1);}
  if(depInsert(t,F))save(1);
  return planView(t,null,F,now);}
/* 화면에 쓸 오늘 몫: 고정한 줄(남은 분·끝), 옮긴 것(갈 곳), 시간이 되면, 놓아준 것, 안내, 이번 주 줄, 지금 블록, 펼칠 줄 */
function planView(t,P,F,now){if(F)P=dayPlan(t,{now,lv:F.lv,user:F.user,keep:F.rows,dm:planDoneMin(F),noFill:1});
  const rows=P.rows.map(r=>{const s=rowStat(r,r.task);return Object.assign(r,{left:s[0],done:s[1]});});
  const V=Object.assign({},P,{frozen:!!F,at:F?F.at:null,rows,doneMin:F?(F.dm||0)+rows.reduce((a,r)=>a+Math.max(0,r.m-r.left),0):0,leftMin:rows.reduce((a,r)=>a+r.left,0),plan:rows.reduce((a,r)=>a+r.m,0),wb:weekBoard(t)});
  /* 오늘 몫을 다 하면 시간이 되면 맨 앞에 "미리 하기" 2개까지(이번 주에 남은 필수 중 이른 것). 오늘 몫 줄이 되지 않고 남은 수에도 세지 않는다 */
  V.off=!P.user&&dayOff(t);   /* 쉬는 날: 미리 하기·펼칠 줄 없음(파란 버튼은 쉬는 날 카드의 "다시 공부할래요") */
  V.ahead=!V.off&&rows.length&&rows.every(r=>r.done)?P.moved.concat(P.onlyWeek.filter(x=>x.k==='late')).filter(x=>x.roll==='일요일까지').sort((a,b)=>(a.d||'')<(b.d||'')?-1:(a.d||'')>(b.d||'')?1:0).slice(0,2):[];
  /* 블록 머리 한 줄(할 일 아님): 4단계·시험 주는 자기 전 "수면 7시간", 4단계 일요일은 "반나절은 쉬어요". 시험 전 3일은 자기 전 칸이 없어 머리 줄로 */
  const ph=phaseObj(wkIdx(t)).id;V.notes={};if(ph>=4||exWeek(t))V.notes.bed='수면 7시간';if(ph===4&&V.kind==='sun')V.notes.day='반나절은 쉬어요';
  if(V.kind==='pre3')V.notes.day='시험 전 3일 · 새로 배우지 않아요 · 수면 7시간';
  V.curBlk=curBlock(t,now,rows);V.active=V.off?null:planActive(V);return V;}
/* 지금 블록: 평일은 시각으로(끝난 블록의 남은 줄은 지금 블록에 보인다). 자기 전은 나머지를 다 했거나 23시가 지나면. 주말은 남은 첫 줄의 블록 */
function curBlock(t,now,rows){t=t||todayStr();now=now!=null?now:nowMin();rows=rows||[];const k=dayKind(t);
  if(isStudy(k)){let b=['am','noon','eve'].find(b=>now<WD_WIN[b])||'bed';if(rows.length&&rows.every(r=>r.done||r.blk==='bed'||r.blk==='pin'))b='bed';return b;}
  const r=rows.find(r=>!r.done&&r.blk!=='pin');return r?r.blk:(PLAN_BLOCKS[k]||[])[1]||null;}
/* 보이는 순서: 날짜 일 → (평일) 다 끝낸 지난 블록, 지금 블록 맨 위에 남은 줄이 있는 지난 블록(통째로), 지금 블록부터 → 자기 전. vb = 보이는 블록 */
function planOrder(V){const bs=PLAN_BLOCKS[V.kind]||[],ci=bs.indexOf(V.curBlk),L=V.rows,bi=r=>bs.indexOf(r.blk),pin=L.filter(r=>r.blk==='pin').map(r=>Object.assign({vb:'pin'},r));
  if(!isStudy(V.kind)||ci<0)return L.map(r=>Object.assign({vb:r.blk},r));const R2=L.filter(r=>r.blk!=='pin'),past=r=>bi(r)<ci&&r.blk!=='bed';
  /* 남은 줄이 있는 지난 블록은 끝낸 줄까지 통째로 지금 블록 맨 위로(지난 블록 머리가 "✓ 끝"이라 하지 않고, 묶은 줄이 갈라지지 않아 번호가 고정한 순서 그대로). 다 끝내면 제자리 */
  const open=new Set(R2.filter(r=>past(r)&&!r.done).map(r=>r.blk)),mv=r=>past(r)&&open.has(r.blk);
  return pin.concat(R2.filter(r=>past(r)&&!mv(r)).map(r=>Object.assign({vb:r.blk},r)),R2.filter(mv).map(r=>Object.assign({},r,{vb:V.curBlk})),R2.filter(r=>!past(r)).map(r=>Object.assign({vb:r.blk},r)));}
/* 오늘 순서(펼칠 줄과 "다음"이 따르는 줄): 보이는 순서에서 날짜 일 핀(원서접수·48시간 복기: 버튼은 보조, 파란 버튼은 늘 목록 쪽)과
   지난주 모의고사를 빼고, 나중에 미룬 줄은 미룬 차례대로 맨 뒤. 자기 전 줄은 그 블록이 지금이거나 남은 다른 줄이 없을 때만(bedOk) */
function planQueue(V){const L=planOrder(V).filter(r=>r.blk!=='pin'&&!(r.task&&r.task.never));return L.filter(r=>!UI.later[r.id]).concat(L.filter(r=>UI.later[r.id]).sort((a,b)=>UI.later[a.id]-UI.later[b.id]));}
const bedOk=(r,V,open)=>r.blk!=='bed'||V.curBlk==='bed'||open.every(x=>x===r||x.blk==='bed');
/* 채점은 그 모의의 교시를 다 쓴 뒤에만 펼칠 줄·"다음"이 된다(안 쓴 교시가 있으면 건너뛰고 줄은 그대로 보인다) */
const gradeWait=r=>{const x=r.task;if(!x||x.k!=='mock.g')return false;const pr=S.mockp[x.d]||{};return mockParts(SETS.mocks[x.d]).some(k=>!pr[k]);};
/* 펼칠 줄(화면의 하나뿐인 파란 버튼): UI.act → 오늘 순서의 첫 줄. 필수가 남지 않았으면 시간이 되면의 휴대폰 일(세트 복습·카드·오답·지난주 세트) */
function planActive(V){const o=planQueue(V).filter(r=>!r.done);if(UI.act){const a=o.find(r=>r.id===UI.act);if(a)return a;}
  const r=o.find(r=>bedOk(r,V,o)&&!gradeWait(r));if(r)return r;const f=(V.fold||[]).find(x=>!x.never&&x.blk!=='pin'&&/^(rev|cards|wrong|carry\.sets)$/.test(x.k));return f?{id:f.id,m:f.min,blk:f.blk,task:f,fold:1}:null;}
/* 이 줄 다음에 할 줄(오늘 순서, 핀은 빼고 자기 전 규칙대로): 뒤에 없으면 앞에서 넘긴 줄(before) */
function nextAfter(id,V){V=V||planToday();const Q=planQueue(V),i=Q.findIndex(r=>r.id===id),open=Q.filter(r=>!r.done&&r.id!==id),ok=r=>open.includes(r)&&bedOk(r,V,open)&&!gradeWait(r);
  const a=Q.slice(i+1).find(ok);if(a)return{row:a,before:false};const b=Q.slice(0,Math.max(0,i)).find(ok);return b?{row:b,before:true}:null;}
/* 이번 주 약속(단계별 줄), 남은 필수 B분, 이번 주 공부 시간 C분(오늘 공부 시간 − 오늘 한 분 + 남은 날의 공부 시간; 시계·"오늘 시간"과 무관), 넘침 단계, 점수.
   목표는 모두 월요일부터 정해 둔다(올 세트·모의 어림·돌아올 세트 복습). 그래서 한 일이 늘면 점수는 오르기만 하고, 줄은 할 수 없게 될 때만 빠진다 */
function weekBoard(t){t=t||todayStr();return pm('w'+t,()=>wbCalc(t));}
function wbCalc(t){const W=wkStart(t),E=addDays(W,6),w=wkIdx(t);if(w<0||t>PLAN.target.d&&W>PLAN.target.d)return{t,W,E,w,ph:0,chk:true,check:null,lines:[],B:0,C:0,r:0,lv:0,pct:null,reach:null,parts:[],cut:false,dm:0};   /* 본시험이 든 주는 시험 뒤 날(48시간 복기)도 체크 */const ph=phaseObj(w).id,cp=Math.max(1,ph),chk=exWeek(t)||ph===5,sc=chk?null:(PE_SCORE[cp]||PE_SCORE[1]),tk=S.tk||{},cut=!!(S.wk&&S.wk[W]&&S.wk[W].cut),L=[];
  const M0=Object.assign({},PE_HW_MIN[1],PE_HW_MIN[ph]||{}),R0=Object.assign({},PE_HW[1],PE_HW[ph]||{}),fr0=(PE_SETRULE[ph]||PE_SETRULE[1]).fresh||0;for(const k in M0)M0[k]=Math.min(M0[k],R0[k]||0);
  /* 이번 주에 올 평일 세트(지난 평일에 세트가 없었으면 뺀다) */
  const exp=[],F=wkFrom(W);for(let i=0;i<5;i++){const d=addDays(W,i),pre=dayKind(d)==='pre3';if(d<F)continue;if(SETS.sets[d]&&d<=t)exp.push({d,have:1,pre});else if(d>=t)exp.push({d,have:0,pre});}
  {let B=0,r=0,a=0;const gaps=[];exp.forEach(x=>{if(!x.have){B+=x.pre?PE_EST.coreExam:PE_EST.core;return;}const c=setCore(x.d),st=c.st;B+=c.gap;r+=.5*(st.nc?Math.min(1,st.read/st.nc):1)+.5*(st.nq?Math.min(1,st.qa/st.nq):1);if(c.ok)a++;else gaps.push(x.d);});
    L.push({k:'core',n:1,label:'세트 핵심(용어 읽기·세트 퀴즈)',a,b:exp.length,B,ratio:exp.length?r/exp.length:null,gaps});}
  if(!chk){const D0=weekMock(t),D=D0&&mockParts(SETS.mocks[D0]).length?D0:null;   /* 문제가 없는 모의(알림뿐)는 이번 주 줄도 채점도 없다 */
    if(D){const m=SETS.mocks[D],pr=S.mockp[D]||{},ps=mockParts(m),g=D>=MOCK_GRADE_SINCE,gd=g&&!!pr.g;let tot=0,dn=0,a=0;ps.forEach(k=>{const x=mockMin(m,k);tot+=x;if(pr[k]){dn+=x;a++;}});
      L.push({k:'mock',n:2,label:'주간 모의고사 + 채점',D,a:a+(gd?1:0),b:ps.length+(g?1:0),B:tot-dn+(g&&!gd?MIN_PER.grade:0),ratio:tot?(g?.8*dn/tot+(gd?.2:0):dn/tot):(gd?1:0),ps:ps.map(k=>[k,!!pr[k]]),g:gd});}
    else if(!D0&&addDays(W,5)>=F){const em=estMock(w);if(em)L.push({k:'mock',n:2,label:'주간 모의고사 + 채점',est:1,a:0,b:em>=430?5:em>=180?3:2,B:em,ratio:0});}
    (QORD[cp]||[]).forEach(q=>{const u=MIN_PER[QK[q][2]],pk=QK[q][3];let n=0,dn=0;
      if(q==='redo'){n=5;dn=redoDone(W);}else exp.forEach(x=>{if(x.pre)return;if(x.have){const p=hwParts(x.d)[pk];if(p){n+=p.n;dn+=Math.min(p.k,p.n);}}else n+={dd:M0.dd,eo:M0.eo,w:M0.w*fr0,essay:M0.ew?1:0,fg:M0.fg||0}[q]||0;});
      const nc=q==='essay'||q==='redo'?Math.min(n,3):Math.ceil(n*.6),b=cut?nc:n;L.push({k:q,n:QLINE[q][1],label:QLINE[q][0],hw:1,a:Math.min(dn,b),b,B:Math.max(0,b-dn)*u,full:n,cut:cut&&nc<n});});
    if(cp===4){const ds=[0,1,2,3,4,5,6].map(i=>addDays(W,i)),dn=ds.filter(d=>((S.daily[d]||{}).graded||0)>=50).length,b=cut?3:5;L.push({k:'rot',n:11,label:'카드 50장 돌리기',a:Math.min(dn,b),b,B:Math.min(Math.max(0,b-dn),ds.filter(d=>d>=t).length)*MIN_PER.rot50,cut});}}
  /* 세트 복습: 이번 주에 기한이 오는 (세트, 단계). 월요일 전에 연 세트 + 이번 주 세트(안 연 것은 오늘 연 셈, 아직 안 온 것은 그날 연 셈).
     제때인지는 그 단계를 처음 끝낸 날(sp.rvd, 예전 기록은 sp.rev)로 본다. B는 오늘 몫이 필수로 두는 것만(revCands와 같은 규칙):
     지금 할 1·3일 차와 이번 주에 기한이 온 7일 차부터 + 일요일까지 돌아올 것(세트마다 하나). 지난주 전에 기한이 지난 7일 차부터는 권장이라 뺀다 */
  {const pairs=[],add=(d,f,rv,rd)=>REVIEW_STEPS.forEach(st=>{const due=addDays(f,st);if(due>=W&&due<=E)pairs.push({d,st,due,done:(rd||{})[st]||(rv||{})[st]||null});});
    Object.keys(SETS.sets).forEach(d=>{const p=spGet(d),mine=d>=F&&d<=E;let f=p.first;if(!f&&mine)f=d<=t?t:d;if(!f||!mine&&f>=W)return;add(d,f,p.rev,p.rvd);});
    exp.forEach(x=>{if(!SETS.sets[x.d])add(x.d,x.d<=t?t:x.d,null);});
    const val=x=>x.done?(x.done<=addDays(x.due,1)?1:.5):0,pot=x=>x.done?val(x):(addDays(x.due,1)>=t?1:.5);
    const dn=dsrP().filter(x=>x.step<=3||addDays(spGet(x.d).first,x.step)>=W).map(x=>x.d),fut=uniq(pairs.filter(x=>!x.done&&x.due>t&&!dn.includes(x.d)).map(x=>x.d));
    L.push({k:'rev',n:6,label:'세트 복습(이번 주에 돌아오는 것)',a:pairs.filter(x=>x.done).length,b:pairs.length,B:dn.concat(fut).reduce((s,d)=>s+revMin(d),0),ratio:pairs.length?pairs.reduce((s,x)=>s+val(x),0)/pairs.length:null,pairs,val,pot,dueNow:dn.length,fut:fut.length,ds:dn.concat(fut)});}
  {const gs=weekObj(w).goals||[],gd=gs.filter((_,i)=>tk['goal:'+W+':'+i]).length,rp=!!tk['report:'+W];L.push({k:'close',n:7,label:dayOff(E)?'주간 리포트(토)':'주간 리포트(일)',a:rp?1:0,b:1,B:rp?0:MIN_PER.report,ratio:gs.length?(rp?.6:0)+.4*gd/gs.length:(rp?1:0),gd,gn:gs.length});}
  const B=L.reduce((s,x)=>s+x.B,0),dm=S.today&&S.today.d===t?planDoneMin(S.today):0;let C=Math.max(0,budgetOf(t)-dm);for(let d=addDays(t,1);d<=E;d=addDays(d,1))C+=budgetOf(d);
  /* 3·4단계 일요일: 그날의 3·4교시와 그 뒤 채점은 늘 넣는 고정 분이라 단계를 셀 때 B와 C 양쪽에서 뺀다. 그날 남는 시간이 거의 없어
     세트 복습(못 하면 "내일 다시 나와요")도 단계에 넣지 않는다(다 지킨 주의 일요일이 핵심만이 되지 않게, 단계는 마감·손글씨 몫으로) */
  let Bl=B,Cl=C;if(t===E&&!chk){const D=weekMock(t),m=D&&SETS.mocks[D],pr=S.mockp[D]||{},rh=!!weekObj(w).pre,sk=m?mockParts(m).filter(k=>(k==='p3'||k==='p4')&&!rh):[];
    if(sk.length){const M=sk.filter(k=>!pr[k]).reduce((a,k)=>a+mockMin(m,k),0)+(D>=MOCK_GRADE_SINCE&&!pr.g?MIN_PER.grade:0),rv=L.find(x=>x.k==='rev');Bl=Math.max(0,B-M-(rv?rv.B:0));Cl=Math.max(0,C-M);}}
  const r=Cl?Bl/Cl:(Bl?9:0),lv=r<=.8?0:r<=1?1:r<=1.5?2:3,G=k=>L.find(x=>x.k===k);let pct=null,reach=null,parts=[];
  if(sc){const hl=L.filter(x=>x.hw&&x.b>0),hw=hl.reduce((s,x)=>s+(sc.hw[x.k]||0),0),hand=hw?hl.reduce((s,x)=>s+(sc.hw[x.k]||0)*Math.min(1,x.a/x.b),0)/hw:null,rot=G('rot'),rv=G('rev'),cl=G('close');
    const P=[['core',sc.core,G('core').ratio],['mock',sc.mock,G('mock')?G('mock').ratio:null],['hand',sc.hand,hand],['rot',sc.rot||0,rot?Math.min(1,rot.a/rot.b):null],['rev',sc.rev,rv.ratio],['close',sc.close,cl.ratio]].filter(x=>x[1]&&x[2]!=null);
    const mx=P.reduce((s,x)=>s+x[1],0),pr=rv.pairs.length?rv.pairs.reduce((s,x)=>s+(x.done?rv.val(x):rv.pot(x)),0)/rv.pairs.length:null;   /* 세트 복습은 어느 단계에서도 놓아주지 않는다 */
    const RE={core:1,mock:1,hand:lv>=3?hand:1,rot:lv>=3?(rot?Math.min(1,rot.a/rot.b):1):1,rev:pr,close:cl.gn?.6+.4*cl.gd/cl.gn:1};
    pct=mx?Math.round(P.reduce((s,x)=>s+x[1]*x[2],0)/mx*100):0;reach=mx?Math.round(P.reduce((s,x)=>s+x[1]*RE[x[0]],0)/mx*100):0;parts=P.map(x=>[x[0],+(x[1]*x[2]).toFixed(1),x[1]]);}
  /* 시험이 든 주·시험 주: 점수 대신 체크(응시·48시간 복기·준비물) */
  const ex=[PLAN.mock,PLAN.target].filter(x=>x&&x.d>=W&&x.d<=E)[0],check=chk?[['응시',!!(ex&&tk['ex:'+ex.d+':a'])],['48시간 복기',!!(ex&&tk['recap:'+ex.r])],['준비물',Object.keys(tk).some(k=>/^kit:/.test(k)&&tk[k]>=W&&tk[k]<=E)]]:null;
  const lines=['mock','core'].concat(QORD[cp]||[],['rot','rev','close']).map(G).filter(Boolean);
  return{t,W,E,w,ph:cp,chk,check,lines,B,C,r,lv,pct,reach,parts,cut,dm};}
/* ── 11-0b. 앞날(읽기만): 이번 주 남은 필수를 오늘부터 일요일까지 오늘 몫과 같은 규칙으로 날마다 놓아 본다(쉬는 날·짧은 날을 정하기 전 미리 보기, 밀린 몫이 따라잡히는 날).
   기록을 쓰지 않는다(pm 'wa…' 기억만, 오늘 몫이 저장하면 함께 지워짐). 하루 순서: 단계 → 모의·리포트(늘) → 핵심(늘, 밀린 세트는 평일 하나·주말 들어가는 만큼) → 세트 복습 1·3일 차 →
   그날 손글씨(단답은 늘) → 주말·공휴일 몫(세트째로, 토요일·공휴일은 반까지) → 세트 복습 7일 차부터. catch: 그날 넣은 분 중 지난날에서 온 것(밀린 몫) ── */
/* 그날 남은 날짜 일(P0 핀)의 분: 원서접수 15, 48시간 복기 150, 시험 전날 준비물(친 것은 뺀다). 쉬는 날에도 남는다 */
function pinMin(d){if(dayKind(d)==='exam')return 0;const tk=S.tk||{};let m=0;
  [PLAN.mock,PLAN.target].filter(Boolean).forEach(x=>{const ap=addDays(x.d,-PE_SCHED.annBefore),ae=addDays(ap,3),re=addDays(x.d,2);
    if(d>=addDays(ap,-7)&&d<=ae&&!tk['apply:'+x.r])m+=15;if(d>x.d&&d<=re&&!tk['recap:'+x.r])m+=150;});
  if(dayKind(d)==='pre3'){const k=(((PE_EXTRA.pre3||{}).wd)||[]).find(x=>x.k==='kit');if(k&&(!k.dow||k.dow===parse(d).getDay())&&!tk['kit:'+d])m+=k.min||0;}
  return m;}
/* o.days {날짜:분} 그날을 그 시간으로 정했다면, o.cu 평일 저녁에 나눠 하기, o.norm "오늘 시간"(S.today.user)을 보지 않음.
   → {out:[{d,kind,cap,load,catch,off,lv}], spill:{core,mock,close,rot,손글씨 줄…}(일요일까지 못 넣는 분), sp 합, spillBack 그중 지난날에서 온 것, cutFrom·lv3From 줄인 목표·핵심만이 시작되는 날} */
function wkAhead(t,o){t=t||todayStr();o=o||{};return pm('wa'+t+'|'+JSON.stringify(o),()=>ahCalc(t,o));}
function ahCalc(t,o){const b=weekBoard(t);if(b.w<0||t>PLAN.target.d)return null;
  const W=b.W,E=b.E,F0=wkFrom(b.W),hyp=o.days||{},QO=QORD[b.ph]||[],uOf=q=>MIN_PER[QK[q][2]],Sat=addDays(W,5);
  /* 평일 저녁에 나눠 하기: o.cu(가정, 0이면 끔)가 없으면 그 주에 켠 것(S.wk[W].cu). 시험이 든 주·5단계는 없음. 평일(시험 전 3일 빼고)에 밀린 세트 둘·손글씨 몫 */
  const cu=!b.chk&&(o.cu!=null?!!o.cu:!!(S.wk&&S.wk[W]&&S.wk[W].cu));
  /* fm: 평일 남은 시간까지 오늘 몫처럼 셈(나눠 하기는 평일 남은 시간에 들어가므로 켠 주와 그 미리 보기 o.fix에서만):
     자기 전·말하기 등 늘 쓰는 시간, 단답 바닥을 먼저, 1·3일 차는 앞 2개, 손글씨는 오늘 몫 차례(쓰기·단답·목차·그림·논술·다시 쓰기) */
  const fm=cu||!!o.fix;const revB0=fm?((b.lines.find(l=>l.k==='rev')||{}).B||0):0;
  const leftNow=Math.max(0,DAY_END-nowMin()),F=S.today&&S.today.d===t?S.today:null;
  const offOf=d=>dayKind(d)==='exam'||(d in hyp?hyp[d]===0:dayOff(d))||(d===t&&leftNow===0);
  /* 오늘: 그날 시간 − 오늘 한 분(가정한 시간도), "오늘 시간"(o.user가 있으면 그것, 오늘을 가정하지 않았으면 S.today.user), 23:30까지 남은 시간 */
  const uT=o.user!=null?o.user:!(t in hyp)&&F&&F.user&&!o.norm?F.user:0;
  const capOf=d=>{let m=d in hyp?hyp[d]:budgetOf(d);if(d===t){m=Math.max(0,m-b.dm);if(uT)m=Math.min(m,uT);m=Math.min(m,leftNow);}return Math.max(0,m-pinMin(d));};
  const capFull=d=>d in hyp?hyp[d]:d===t?Math.max(0,budgetOf(t)-b.dm):budgetOf(d);   /* 단계를 셀 때(C와 같게 시계·오늘 시간과 무관) */
  const days=[];for(let d=t;d<=E;d=addDays(d,1))days.push(d);
  const own={};days.forEach(d=>own[d]=[]);
  const coreQ=[],handQ={},revQ=[],mockQ=[],anyQ=[],allow={},placedQ={},lineInfo={};
  let cut=!!(S.wk&&S.wk[W]&&S.wk[W].cut),placedAll=0,placedRev=0,bAdj=0,cutFrom=null,lv3From=null,merged=0;
  const ph0=phaseObj(b.w).id,M0=Object.assign({},PE_HW_MIN[1],PE_HW_MIN[ph0]||{}),R0=Object.assign({},PE_HW[1],PE_HW[ph0]||{}),fr0=(PE_SETRULE[ph0]||PE_SETRULE[1]).fresh||0;
  for(const k in M0)M0[k]=Math.min(M0[k],R0[k]||0);
  /* 세트 핵심: 지난 세트의 빈 곳은 밀린 몫(coreQ), 오늘 세트와 올 세트는 그날 것 */
  for(let i=0;i<5;i++){const d=addDays(W,i),pre=dayKind(d)==='pre3';if(d<F0)continue;
    if(SETS.sets[d]&&d<=t){const g=setCore(d).gap;if(!g)continue;if(d<t)coreQ.push({set:d,m:g,origin:d});else own[t].push({k:'core',set:d,m:g,p:2});}
    else if(d>=t)own[d].push({k:'core',set:d,m:pre?PE_EST.coreExam:PE_EST.core,p:2});}
  /* 손글씨 줄: 지난 세트의 남은 칸은 밀린 몫(handQ), 그날 세트의 필수 칸(단답은 늘), 3·4단계 다시 쓰기는 평일 하루 한 편 */
  b.lines.filter(l=>l.hw).forEach(l=>{const q=l.k,u=uOf(q);lineInfo[q]={n:l.full,dn:l.cut?null:l.a,nc:q==='essay'||q==='redo'?Math.min(l.full,3):Math.ceil(l.full*.6)};placedQ[q]=0;handQ[q]=[];allow[q]=Math.round(l.B/u);
    if(q==='redo'){const wds=[];for(let i=0;i<5;i++){const d=addDays(W,i),k=dayKind(d);if(d>=t&&(k==='wd'||k==='holi'))wds.push(d);}
      wds.slice(0,allow.redo).forEach(d=>own[d].push({k:'hand',q,d,units:1,u,p:4}));for(let j=wds.length;j<allow.redo;j++)handQ.redo.push({d:'u'+j,left:1,origin:t});return;}
    const pk=QK[q][3];
    for(let i=0;i<5;i++){const d=addDays(W,i);if(dayKind(d)==='pre3'||d<F0)continue;
      if(d<t){if(!SETS.sets[d])continue;const p=hwParts(d)[pk],rem=p?Math.max(0,p.n-p.k):0;if(rem)handQ[q].push({d,left:rem,origin:d});}
      else{let rem;if(SETS.sets[d]&&d<=t){const p=hwParts(d)[pk];rem=p?Math.max(0,p.n-p.k):0;}else rem=({dd:M0.dd,eo:M0.eo,w:M0.w*fr0,essay:M0.ew?1:0,fg:M0.fg||0})[q]||0;
        if(rem)own[d].push({k:'hand',q,d,units:rem,u,p:4,forced:q==='dd'?1:0});}}});
  const handBack=QO.filter(q=>q!=='redo').reduce((a,q)=>a+Math.min(allow[q]||0,(handQ[q]||[]).filter(s=>s.origin<t).reduce((x,s)=>x+s.left,0)),0);   /* 지난날 세트의 남은 손글씨 칸(약속 안에서) */
  /* 주간 모의고사: 토요일 몫(늘)과 일요일 3·4교시·채점. 토요일 몫은 교시마다(그 뒤 채점) 따로: 토요일을 쉬거나 지났으면 일요일이 교시째로 들어가는 만큼(오늘 몫과 같게) */
  const ml=b.lines.find(l=>l.k==='mock');
  if(ml&&ml.B){const rh=!!weekObj(b.w).pre;let sunM=0;const satP=[];
    if(ml.D){const m=SETS.mocks[ml.D],pr=S.mockp[ml.D]||{},sp=['p3','p4'].filter(k=>m[k]&&m[k].length&&!rh),g=ml.D>=MOCK_GRADE_SINCE&&!pr.g;
      sunM=sp.filter(k=>!pr[k]).reduce((a,k)=>a+mockMin(m,k),0)+(sp.length&&g?MIN_PER.grade:0);
      mockParts(m).filter(k=>!sp.includes(k)&&!pr[k]).forEach(k=>satP.push(mockMin(m,k)));if(!sp.length&&g)satP.push(MIN_PER.grade);}
    else{if(ml.B>=430&&!rh)sunM=230;let r=ml.B-sunM;const g=!sunM&&r>MIN_PER.grade?MIN_PER.grade:0;r-=g;while(r>0){satP.push(Math.min(100,r));r-=100;}if(g)satP.push(g);}   /* 오지 않은 모의: 1교시 100 · 논술 교시 100까지 · 채점 30 */
    if(Sat>=t){satP.forEach(m=>own[Sat].push({k:'mock',m,p:1}));if(sunM)own[E].push({k:'mock',m:sunM,p:1});}
    else{if(sunM)own[E].push({k:'mock',m:sunM,p:1});satP.forEach(m=>mockQ.push({k:'mock',m,origin:Sat}));}}
  /* 주간 리포트: 일요일(일요일이 쉬는 날이면 토요일) */
  const cl=b.lines.find(l=>l.k==='close');if(cl&&cl.B)(offOf(E)&&E!==t&&Sat>=t?own[Sat]:own[E]).push({k:'close',m:cl.B,p:1});
  /* 세트 복습: 지금 할 것(이번 주 B와 같은 규칙), 이번 주에 돌아올 것, 아직 열지 않은 세트는 핵심을 넣는 날 + 1·3일 */
  dsrP().filter(x=>x.step<=3||addDays(spGet(x.d).first,x.step)>=W).forEach(x=>revQ.push({set:x.d,m:revMin(x.d),ready:t,step:x.step}));
  Object.keys(SETS.sets).forEach(d=>{const p=spGet(d);if(!p.first)return;const mine=d>=F0&&d<=E;if(!mine&&p.first>=W)return;
    REVIEW_STEPS.forEach(st=>{const due=addDays(p.first,st);if(due>t&&due<=E&&!((p.rvd||{})[st]||(p.rev||{})[st]))revQ.push({set:d,m:revMin(d),ready:due,step:st});});});
  const coreDone=(set,y)=>{if(spGet(set).first)return;[1,3].forEach(st=>{const r=addDays(y,st);if(r<=E)revQ.push({set,m:revMin(set),ready:r,step:st});});};
  const rot=b.lines.find(l=>l.k==='rot');if(rot&&rot.B)anyQ.push({k:'rot',m:rot.B,origin:t});
  /* 평일에 오늘 몫이 늘 먼저 쓰는 시간(몫 load에는 세지 않음): 자기 전(늘)·말하기·틀린 이유·금요일 오답·단계 할 일(목차 떠올리기 등),
     보통 날(단계 0)의 더 하기(학원 횟수까지). 오늘은 할 일 목록에서, 앞날은 단계 표로 어림 */
  const T0=fm?taskList(t):[],rotL=b.lines.some(l=>l.k==='rot'),wrN=fm?Math.min(10,wrongList().filter(x=>!(x.type==='quiz'&&x.d===t)).length)*MIN_PER.wrong:0;
  const exK=x=>x.need==='필수'&&x.blk!=='pin'&&x.k!=='x.redo'&&!(x.k==='x.rot'&&rotL);
  const fixOf=(d,full)=>{const kind=dayKind(d),r={sl:0,say:0,p3:0,ex:0,up:0};if(!isStudy(kind))return r;const pre=kind==='pre3';
    if(d===t)T0.forEach(x=>{if(x.done||x.info||x.fold)return;if(x.k==='hw.qz'||x.k==='wrong'&&x.need==='필수')r.p3+=x.min;else if(/^x\./.test(x.k)&&exK(x))r.ex+=x.min;});
    else{r.p3=parse(d).getDay()===5?wrN:0;r.ex=((PE_EXTRA[pre?'pre3':phaseKey(b.w)]||{}).wd||[]).filter(x=>exK(x)&&(!x.dow||x.dow===parse(d).getDay())).reduce((a,x)=>a+(x.min||0),0);}
    if(pre)return r;
    if(d===t&&SETS.sets[t]){const hm=(x,f)=>Math.ceil(Math.max(0,f?x.hw.N-x.hw.K:x.hw.n-x.hw.k)*x.hw.u);
      T0.forEach(x=>{if(x.done||x.d!==t)return;if(x.k==='hw.sl')r.sl+=x.min;if(x.hw&&/^hw\.(say|write|eo|fg)$/.test(x.k)){if(x.k==='hw.say')r.say+=hm(x,false);if(full)r.up+=hm(x,true)-hm(x,false);}});}
    else{r.sl=MIN_PER.sl;r.say=M0.s?Math.ceil(M0.s*fr0*MIN_PER.say):0;
      if(full)r.up=(M0.s?Math.ceil(R0.s*fr0*MIN_PER.say)-r.say:0)+(M0.w?(R0.w-M0.w)*fr0*MIN_PER.write:0)+(M0.eo?(R0.eo-M0.eo)*MIN_PER.eo:0)+(M0.fg?((R0.fg||0)-M0.fg)*MIN_PER.fg:0);}
    return r;};
  const out=[],HORD=['w','dd','eo','fg','essay','redo'],rord=(a,c)=>a.ready<c.ready?-1:a.ready>c.ready?1:a.step-c.step;
  days.forEach(d=>{const kind=dayKind(d),off=offOf(d),wk=kind==='wd'||kind==='pre3',cuD=cu&&kind==='wd',st=fm&&isStudy(kind);let room=off?0:capOf(d),ld=0,cat=0;
    /* 그날 단계(오늘은 고정한 단계): 이번 주 B에서 앞날에 넣은 분을 뺀 것 / 그날부터의 공부 시간. 2 이상이면 그날부터 줄인 목표, 3이면 그날 몫 없음 */
    let Bd=Math.max(0,b.B-placedAll-bAdj),Cd=0;for(let x=d;x<=E;x=addDays(x,1))Cd+=capFull(x);
    /* fm: 세트 복습은 이번 주 B처럼 그날 남은 세트마다 하나(넣은 세트 복습 분을 그대로 빼면 B가 모자라 단계가 낮게 나온다) */
    let rvB=revQ.reduce((a,x)=>a+x.m,0);if(fm){const ss=new Set(revQ.filter(x=>x.ready<=E).map(x=>x.set));if(d<E)coreQ.concat(...days.filter(x=>x>=d&&x<E).map(x=>own[x].filter(y=>y.k==='core'))).forEach(c=>{if(!spGet(c.set).first)ss.add(c.set);});
      rvB=[...ss].reduce((a,x)=>a+revMin(x),0);Bd=Math.max(0,b.B-revB0-(placedAll-placedRev)-bAdj+rvB);}
    if(d===E){const sm=own[E].filter(x=>x.k==='mock').reduce((a,x)=>a+x.m,0);if(sm){Bd=Math.max(0,Bd-sm-rvB);Cd=Math.max(0,Cd-sm);}}
    const lvd=d===t?(F?F.lv:b.lv):(r=>r<=.8?0:r<=1?1:r<=1.5?2:3)(Cd?Bd/Cd:(Bd?9:0));
    if(lvd>=2&&!cut&&!off){cut=true;cutFrom=d;Object.keys(lineInfo).forEach(q=>{const L=lineInfo[q];if(L.dn!=null){const na=Math.max(0,L.nc-L.dn);bAdj+=Math.max(0,allow[q]-na)*uOf(q);allow[q]=na;}});}
    if(lvd>=3&&!lv3From&&!off)lv3From=d;
    const put=(x,forced)=>{if(off)return false;if(forced||x.m<=room){room-=x.m;ld+=x.m;if(x.step)placedRev+=x.m;if(x.origin!=null&&x.origin<t)cat+=x.m;return true;}return false;};
    const use=(m,forced)=>{if(!off&&m&&(forced||m<=room))room-=m;},fx=st?fixOf(d,lvd===0&&!(d===t&&uT)):null;
    const O=own[d],hand=x=>{const un=Math.min(x.units,Math.max(0,allow[x.q]-placedQ[x.q]));if(!un)return;
      if(put({m:Math.ceil(un*x.u)},x.forced))placedQ[x.q]+=un;else handQ[x.q].push({d:x.d,left:un,origin:d});};
    O.filter(x=>x.p===1).forEach(x=>{if(!put(x,1)){if(x.k==='mock'&&d===Sat)mockQ.push({k:'mock',m:x.m,origin:d});else anyQ.push({k:x.k,m:x.m,origin:d,end:1});}});
    if(kind==='sun')for(let i=0;i<mockQ.length;i++)if(put(mockQ[i]))mockQ.splice(i--,1);
    /* 늘 넣는 것: 그날 세트 핵심·단답(바닥)·자기 전 */
    O.filter(x=>x.k==='core').forEach(x=>{if(put(x,1))coreDone(x.set,d);else coreQ.push({set:x.set,m:x.m,origin:d});});
    if(fm&&st){O.filter(x=>x.k==='hand'&&x.forced).forEach(hand);use(fx.sl,1);}
    coreQ.sort((a,c)=>a.set<c.set?-1:1);
    /* 평일 밀린 세트: 가장 오래된 하나(나눠 하는 날은 그다음 하나를 남은 시간에) */
    const late=skip=>{for(let i=0;i<coreQ.length;i++){const c=coreQ[i];if(c.set>=d||c.set===skip)continue;if(put(c)){coreDone(c.set,d);coreQ.splice(i,1);}return c.set;}return null;};
    let l1=null;if(wk)l1=late();
    else for(let i=0;i<coreQ.length;i++)if(put(coreQ[i])){coreDone(coreQ[i].set,d);coreQ.splice(i--,1);}
    /* 한 세트의 세트 복습 둘이 함께 오면 높은 단계 하나로 */
    const rdy=()=>revQ.filter(x=>x.ready<=d),bySet={};rdy().forEach(x=>(bySet[x.set]=bySet[x.set]||[]).push(x));
    Object.values(bySet).forEach(xs=>{if(xs.length<2)return;xs.sort((a,c)=>a.step-c.step);xs.slice(0,-1).forEach(x=>{revQ.splice(revQ.indexOf(x),1);merged+=x.m;});});
    /* 1·3일 차 세트 복습(평일·공휴일은 앞 2개, 나머지는 손글씨 뒤) → 말하기·틀린 이유·금요일 오답 → 단계 할 일 → 손글씨 바닥 → 보통 날의 더 하기 */
    if(!fm)rdy().filter(x=>x.step<=3).sort((a,c)=>a.ready<c.ready?-1:1).forEach(x=>{if(put(x))revQ.splice(revQ.indexOf(x),1);});
    else rdy().filter(x=>x.step<=3).sort(rord).slice(0,st?2:Infinity).forEach(x=>{if(put(x))revQ.splice(revQ.indexOf(x),1);});
    if(fm&&st){use(fx.say);use(fx.p3);use(fx.ex);}
    O.filter(x=>x.k==='hand'&&!(fm&&st&&x.forced)).sort((a,c)=>fm?HORD.indexOf(a.q)-HORD.indexOf(c.q):0).forEach(hand);
    if(fm&&st&&!cuD)use(fx.up);
    const quotas=()=>{if(lvd<3)QO.filter(q=>!(q==='redo'&&wk)).forEach(q=>{const u=uOf(q),list=handQ[q]||[];let al=Math.max(0,allow[q]-placedQ[q]),L=0;for(const s of list)L+=s.left;L=Math.min(L,al);
      const half=(kind==='sat'&&!offOf(E))||kind==='holi'?Math.ceil(L/2):Infinity;let k=0;
      for(let i=0;i<list.length;i++){const s=list[i];if(k>=half||al<=0)break;const n=Math.min(s.left,al),m=Math.ceil(n*u);if(m>room)break;
        put({m,origin:s.origin});k+=n;al-=n;placedQ[q]+=n;s.left-=n;if(!s.left)list.splice(i--,1);}});};
    if(kind==='sat'||kind==='sun'||kind==='holi')quotas();
    for(let i=0;i<anyQ.length;i++){const x=anyQ[i];if(x.end)continue;const m=Math.min(x.m,Math.max(0,room));if(m&&!off){room-=m;ld+=m;x.m-=m;if(!x.m)anyQ.splice(i--,1);}}
    (fm?rdy().sort(rord):rdy().filter(x=>x.step>3)).forEach(x=>{if(put(x))revQ.splice(revQ.indexOf(x),1);});
    /* 평일 저녁에 나눠 하는 날: 두 번째 밀린 세트와 손글씨 몫은 그날 필수(세트 복습 포함)를 다 넣고 남은 시간에(오늘 몫 CU_PO와 같은 차례) */
    if(cuD){late(l1);quotas();}
    placedAll+=ld;out.push({d,kind,cap:off?0:capOf(d),load:ld,catch:cat,off,lv:lvd});});
  /* 일요일까지 못 넣는 것(다음 주로 놓아줌, 세트 복습은 "다시 나와요"라 빼고), 그중 지난날에서 온 것 */
  const spill={core:0,mock:0,close:0,rot:0};let back=0;
  coreQ.concat(mockQ,anyQ).forEach(x=>{const k=x.k==='mock'||x.k==='close'||x.k==='rot'?x.k:'core';spill[k]+=x.m;if(x.origin<t)back+=x.m;});
  QO.forEach(q=>{const u=uOf(q);let al=Math.max(0,allow[q]-placedQ[q]),L=0,Lb=0;(handQ[q]||[]).forEach(s=>{const n=Math.min(s.left,al);al-=n;L+=n;if(s.origin<t)Lb+=n;});spill[q]=Math.ceil(L*u);back+=Math.ceil(Lb*u);});
  return{t,out,spill,sp:Object.values(spill).reduce((a,x)=>a+x,0),spillBack:back,handBack,cutFrom,lv3From,merged,revLeft:revQ.reduce((a,x)=>a+x.m,0),B:b.B,C:b.C,lv:b.lv};}
/* 그날(d)을 m분(0 쉬는 날)으로 정하면 날마다 더해지는 분(dl), 못 넣는 분(ds 몫마다·sp 합), 줄인 목표·핵심만. 지금 상태와 견준다.
   이미 그 시간으로 정한 날(쉬는 날 카드)은 정하기 전과 견준다: 짧은 날이었으면 그 시간(S.days[d].p), 오늘 시간을 줄였으면 그 시간(.u), 아니면 평소 시간 */
function offDelta(t,d,m){t=t||todayStr();m=m||0;const x=(S.days||{})[d],same=!!x&&x.m===m;
  const base=same?wkAhead(t,Object.assign({days:{[d]:x.p!=null?x.p:budgetOf(d,null,true)}},d===t&&x.u?{user:x.u}:{})):wkAhead(t),alt=same?wkAhead(t):wkAhead(t,{days:{[d]:m}});
  if(!base||!alt)return null;const dl={},ds={};alt.out.forEach((x,i)=>{dl[x.d]=x.load-base.out[i].load;});
  Object.keys(alt.spill).forEach(k=>{const v=alt.spill[k]-(base.spill[k]||0);if(v)ds[k]=v;});
  return{d,m,base,alt,dl,ds,sp:alt.sp-base.sp,cutFrom:alt.cutFrom,lv3From:alt.lv3From};}
/* 더해지는 분 한 줄: 평일은 날마다(셋 이상이면 "평일 +X"), 주말은 "주말 +X"(토·일 둘 다일 때), 5분 미만·그날(skip)은 빼고. signed면 빠지는 날도 "토 −37분" */
function placeTxt(dl,skip,signed){const ks=Object.keys(dl||{}).sort().filter(d=>d!==skip&&(signed?Math.abs(dl[d])>=5:dl[d]>=5)),f=v=>(v<0?'−':'+')+mfmt(Math.abs(v)),dn=d=>DAYK[parse(d).getDay()],we=d=>dayType(d)!=='wd';
  const W1=ks.filter(d=>!we(d)),W2=ks.filter(we),out=[];
  if(W1.length>2)out.push('평일 '+f(W1.reduce((a,d)=>a+dl[d],0)));else W1.forEach(d=>out.push(dn(d)+' '+f(dl[d])));
  if(W2.length===2&&Math.sign(dl[W2[0]])===Math.sign(dl[W2[1]]))out.push('주말 '+f(dl[W2[0]]+dl[W2[1]]));else W2.forEach(d=>out.push(dn(d)+' '+f(dl[d])));
  return out.length?out.join(' · '):'옮길 필수가 없어요';}
const nwTxt=x=>String(x).split(' · ').map(y=>`<span class="nw">${esc(y)}</span>`).join(' · ');   /* "목 +31분 · 주말 +1시간 24분"의 한 덩이가 줄 끝에서 갈라지지 않게 */
const SPN=()=>Object.assign({core:'핵심',mock:'모의고사',close:'리포트'},QSHORT);   /* 못 넣는 몫의 이름(핵심 · 모의고사 · 리포트 · 단답 · 목차 · 쓰기 · 논술 · 다시 쓰기 · 그림·표 · 카드 돌리기) */
const spillNames=ds=>{const N=SPN();return Object.keys(N).filter(k=>(ds[k]||0)>0).map(k=>N[k]).join('·');};
const outMain=od=>{const v=od?od.sp:0;return v>=5?`약 ${mfmt(v)}${jo(mfmt(v),['은','는'])} 다음 주로 놓아줘요(${spillNames(od.ds)})`:'이번 주 안에 다 따라잡아요';};
function outTxt(od){return outMain(od)+' · 시험 일정은 그대로예요';}
const SAME_HTML=' · <span class="nw">시험 일정은 그대로예요</span>';   /* 줄이 길면 "시험 일정은 그대로예요" 앞에서 꺾이게 */
/* 쉬면 미리 보기 줄(오늘 시간 창·날마다 창): "오늘 쉬면 → 목 +31분 · …" / 놓아줄 것 · 시험 일정 / 단계. 옮길 곳 없이 놓아줄 것만 있으면 "다른 날로 옮길 수 있는 필수는 없어요" */
function foreHTML(pre,od,skip){const pl=placeTxt(od.dl,skip),lv=lvTxt(od),none=pl==='옮길 필수가 없어요';
  return`<p class="ds fore">${esc(pre)} → ${none&&od.sp>=5?'다른 날로 옮길 수 있는 필수는 없어요':nwTxt(pl)}</p><p class="ds fore">${esc(outMain(od))}${SAME_HTML}</p>${lv?`<p class="ds fore">${esc(lv)}</p>`:''}`;}
/* 단계가 나빠질 때만: "일요일부터 핵심만 해요" / "토요일부터 손글씨 몫을 줄여요(줄인 목표)" */
function lvTxt(od){if(!od)return'';const a=od.alt,b=od.base,dn=d=>DAYK[parse(d).getDay()]+'요일부터 ';
  if(a.lv3From&&(!b.lv3From||a.lv3From<b.lv3From))return dn(a.lv3From)+'핵심만 해요';
  if(a.cutFrom&&(!b.cutFrom||a.cutFrom<b.cutFrom))return dn(a.cutFrom)+'손글씨 몫을 줄여요(줄인 목표)';return'';}
/* 오늘 남은 필수 중 "오늘만"인 것(쉬면 다른 날로 가지 않는 것): "말하기·자기 전은 오늘만이라 놓아줘요" */
const ONLY_N={'hw.say':'말하기','hw.sl':'자기 전','hw.qz':'틀린 이유','hw.write':'쓰기','hw.eo':'목차','hw.fg':'그림·표','x.outline':'목차 떠올리기','x.rot':'카드 돌리기'};
function todayOnlyTxt(V){const ks=new Set(((V&&V.rows)||[]).filter(r=>!r.done&&r.task&&r.task.need==='필수'&&r.task.roll==='오늘만').map(r=>r.task.k)),ns=Object.keys(ONLY_N).filter(k=>ks.has(k)).map(k=>ONLY_N[k]);
  return ns.length?`${ns.join('·')}${jo(ns[ns.length-1],['은','는'])} 오늘만이라 놓아줘요`:'';}
/* 밀린 몫(정하지 않고 건너뛴 날의 필수가 이번 주 다른 날로 가는 것): 월~토, 시험이 든 주·쉬는 날이 아니고 10분 이상일 때.
   line 오늘 화면 한 줄(날짜만), note 이번 주 날마다의 한 줄(날마다 분) */
function catchLine(t){t=t||todayStr();if(!parse(t).getDay()||dayOff(t))return null;const b=weekBoard(t);if(b.chk)return null;const A=wkAhead(t);if(!A)return null;
  const xs=A.out.filter(x=>x.catch>0),tot=xs.reduce((a,x)=>a+x.catch,0);if(tot<10)return null;const last=xs[xs.length-1].d,lab=last===t?'오늘':dlab(last),ok=A.spillBack<5;
  return{xs,tot,last,ok,spillBack:A.spillBack,line:ok?`밀린 몫은 ${lab}까지 다 따라잡아요`:'밀린 몫 가운데 일부는 다음 주로 놓아줘요',
    note:`밀린 몫 → ${xs.map(x=>DAYK[parse(x.d).getDay()]+' '+mfmt(x.catch)).join(' · ')} · ${ok?lab+'까지 다 따라잡아요':'일부는 다음 주로 놓아줘요'}`};}
/* 평일 저녁에 나눠 하기(이번 주 날마다 아래, 읽기만). 켠 주(S.wk[W].cu)의 월~금은 {on}. 끈 주는 평일(시험 전 3일·공휴일 빼고)이고 시험이 든 주가 아니며
   지난날 세트의 손글씨 칸이 남았고 오늘부터 금요일까지 쉬지 않는 평일이 있을 때, 켜기 전 미리 보기 "나눠 하면 → 목 +37분 · 토 −37분"(옮겨지는 분이 없으면 띄우지 않음) */
function cuPreview(t){t=t||todayStr();const W=wkStart(t),dw=parse(t).getDay();if(dw<1||dw>5)return null;const b=weekBoard(t);if(b.w<0||b.chk)return null;
  if(S.wk&&S.wk[W]&&S.wk[W].cu)return{on:true};if(dayKind(t)!=='wd')return null;
  let wd=false;for(let d=t;d<=addDays(W,4);d=addDays(d,1))if(dayKind(d)==='wd'&&!dayOff(d))wd=true;if(!wd)return null;
  const a=wkAhead(t,{fix:1});if(!a||!a.handBack)return null;const c=wkAhead(t,{cu:1});if(!c)return null;   /* 견주는 둘 다 평일 남은 시간까지 셈(fix) */
  const dl={};c.out.forEach((x,i)=>{dl[x.d]=x.load-a.out[i].load;});if(!Object.keys(dl).some(d=>dl[d]<=-5))return null;   /* 뒷날에서 덜어지는 날이 없으면(나눠도 줄인 목표가 풀려 더 늘기만 하면) 띄우지 않음 */
  const txt=placeTxt(dl,null,true);return txt==='옮길 필수가 없어요'?null:{on:false,txt,dl};}
/* 이번 주 날마다 아래 나눠 하기 칸: 끈 주는 미리 보기와 보조 버튼, 켠 주는 안내와 "그만 나누기" 링크 */
function cuHTML(t){const c=cuPreview(t);if(!c)return'';
  return c.on?`<div class="wkcu"><p class="note">평일 저녁에 손글씨 몫을 나눠 넣고 있어요</p><button class="lnk" data-act="cu-off">그만 나누기</button></div>`
    :`<div class="wkcu"><p class="note">나눠 하면 → ${nwTxt(c.txt)}</p><div class="btns"><button class="btn sec" data-act="cu-on">평일 저녁에 나눠 하기</button></div></div>`;}
/* 새 주 첫 화면에서 지난주를 한 번 고정한다(S.wk[지난주]: 점수 p, 부분 parts, 단계 lv, 넘어온 것 carry, 놓아준 것 rel). 그 뒤 지난 세트를 고쳐도 그대로.
   단계는 그 주에 오늘 몫을 고정할 때 쓴 단계 중 가장 높은 것(S.wk[주].lvx, planToday가 적음). 다시 세지 않는다(월요일에 세면 일요일에 한 분과 월요일 세트 복습이 섞인다) */
function weekSnap(t){t=t||todayStr();const W=wkStart(t),LW=addDays(W,-7);if(weekIndex(addDays(LW,6))<0||addDays(LW,6)<(S.created||''))return null;const x=S.wk[LW]||{};if(x.at)return x;   /* 이 기록을 만들기 전에 끝난 주(새로 설치·초기화)는 고정하지 않는다 */
  if(syncing)return null;   /* 받아 오는 중에는 기다린다(지난주 세트가 아직 없는 자료로 고정하지 않게) */
  const b=weekBoard(addDays(LW,6)),parts={},rel=[];b.parts.forEach(([k,v])=>parts[k]=v);
  b.lines.filter(l=>l.hw&&l.a<l.b).forEach(l=>rel.push(`${l.label} ${l.b-l.a}${QK[l.k][1]}`));
  const LF=wkFrom(LW),ls=Object.keys(SETS.sets).filter(d=>d>=LF&&d<W).sort().reverse().filter(d=>!setCore(d).ok),lm=Object.keys(SETS.mocks).filter(d=>/^\d{4}-/.test(d)&&d>=LF&&d<W).sort().pop(),carry=[];
  if(ls.length)carry.push('carry.sets:'+W);ls.slice(3).forEach(d=>rel.push(`${dlab(d)} 세트 읽기·퀴즈`));if(lm&&mockParts(SETS.mocks[lm]).some(k=>!(S.mockp[lm]||{})[k]))carry.push('carry.mock:'+lm);
  /* 그 주 목표 수(gn·gd), 쉬는 날 수(off), 그 일요일에 남은 필수 분(left, 세트 복습·주간 리포트 빼고: 리포트는 월요일 "지난주 리포트"로). 고정할 때 지난주 전의 쉬는 날·짧은 날(S.days)은 지운다 */
  const cl=b.lines.find(l=>l.k==='close')||{},off=[0,1,2,3,4,5,6].filter(i=>dayOff(addDays(LW,i))).length,left=b.lines.filter(l=>l.k!=='rev'&&l.k!=='close').reduce((a,l)=>a+(l.B||0),0);
  if(S.days)Object.keys(S.days).forEach(d=>{if(d<LW)delete S.days[d];});
  S.wk[LW]=Object.assign(x,{p:b.pct,parts,lv:x.lvx||0,at:t,carry,rel,gn:cl.gn||0,gd:cl.gd||0,off,left});save(1);return S.wk[LW];}
/* 오늘 몫 줄의 "시작": 그 일을 하는 곳으로 한 번에. FLOW에 이 줄을 적어 끝 화면·세트 화면의 "다음"이 오늘 순서를 잇는다.
   연 곳(org): 오늘(이번 주 화면에서 열면 이번 주). 끝 화면·세트 막대의 "다음"(o.replace)은 처음 연 곳을 물려받아, 닫기·뒤로가 늘 그곳으로 간다 */
function taskGo(id,o){o=o||{};const t=todayStr(),x=taskList(t).find(r=>r.id===id)||qGone(id,t);if(!x)return goTab('today');const D=x.d,k=x.k;
  const org=nh(o.from)||(o.replace&&FLOW&&FLOW.from)||(curH()==='week'?'week':'today'),QS='.qcard.sq:not(.ans)',HS='.hw.focus';
  const setGo=(d,tab,f)=>{SV[d]=tab;if(f)SV.scrollTo=f;FLOW={id,from:org,at:'set/'+d};nav('set/'+d,{from:org});};
  const sess=f=>{const s0=SES;f();if(SES&&SES!==s0){SES.from=org;FLOW={id,from:org,at:'sess'};}};
  const stay=()=>{UI.act=id;return goTab('today');};   /* 하는 곳이 없는 줄은 오늘에서 그 줄을 펼쳐 둔다. "다음"(o.replace)으로 온 줄은 손으로 치지 않는다 */
  if(k==='set.read')return setGo(D,'cards',setCore(D).st.read?'.acc:not(.read)':null);   /* 읽던 세트는 첫 안 읽은 용어로 */
  if(k==='set.quiz')return setGo(D,'quiz',setCore(D).st.qa?QS:null);if(k==='essay')return setGo(D,'essay');
  if(k==='late'){const c=setCore(D);return setGo(D,c.r?'cards':'quiz',c.r?(c.st.read?'.acc:not(.read)':null):QS);}
  if(k==='carry.sets'){const d=x.ds[x.ds.length-1],c=setCore(d);return setGo(d,c.r?'cards':'quiz',c.r?null:QS);}
  if(/^hw\./.test(k)){if(k==='hw.rest')delete UI.open['hwx:'+D];return setGo(D,'tasks',k==='hw.rest'?'.hwext':HS);}   /* 숙제 줄은 그 카드를 펼쳐(.hw.focus) 가운데로, 숙제 나머지는 "더 하기"를 펼쳐 */
  if(x.quota){const s=x.quota.list[0],q=x.quota.q;
    /* 모의 오답 다시 쓰기: 줄을 누르면 지난 모의 화면(틀린 문제 보기)만 연다. 한 편 다 쓴 것은 "다 썼어요"·동그라미(redoTick)로만 친다 */
    if(q==='redo'){const m=Object.keys(SETS.mocks).filter(x=>/^\d{4}-/.test(x)&&x<=t).sort().pop();if(o.replace||!m)return stay();FLOW=null;return nav('mock/'+m,{from:org});}
    if(!s)return stay();return setGo(s.d,q==='essay'?'essay':'tasks',q==='essay'?null:HS);}
  if(k==='mock'||k==='mock.g'||k==='carry.mock'||x.ex&&x.ex.auto==='score'){FLOW={id,from:org,at:'mock/'+D};return nav('mock/'+D,{from:org});}   /* 모의 점수 적기도 그 모의 화면에서 */
  if(k==='rev'){const ch=(o.chain||[]).map(c=>String(c).split(':')[1]||c);return sess(()=>startSetReview(D,ch.length?{chain:ch,cpos:[1,ch.length+1]}:{}));}   /* 묶은 세트 복습은 끝 화면이 다음 세트로 잇는다 */
  if(k==='cards'){const F=S.today&&S.today.d===t?S.today:null,lv=F?F.lv:weekBoard(t).lv;   /* 오늘 몫의 장 수 그대로(dayPlan처럼 단계 2부터 하루 30장까지) */
    return sess(()=>startDueAll({k:lv>=2?Math.min(x.kc,30):x.kc,skip:planRevCards(t),weak:x.weak}));}
  if(k==='wrong')return sess(()=>startWrong({skipQ:t}));
  if(k==='gq')return sess(()=>startGq(D,'next'));
  if(k==='new')return sess(()=>startStudy(null,{newOnly:true}));
  if(x.to==='start-outline')return sess(()=>startOutline());if(x.to==='start-cloze')return sess(()=>startCloze());if(x.to==='start-rot')return sess(()=>startRot(x.n||50));
  if(x.to==='dd-rand')return ddRandom({from:org});
  if(k==='report')return reportCopy(x.w);
  if(x.to==='schedule')return nav('schedule',{from:org});if(x.to==='backup')return nav('backup',{from:org});if(x.to==='settings')return nav('settings',{from:org});
  if(k==='kichul'){const u=(weekObj(weekIndex(addDays(wkStart(t),7))).u||[])[0];return nav(u?'kichul/u/'+u:'kichul',{from:org});}
  if(k==='goal'){UI.open.goals=true;SV.scrollTo='#wkGoals';if(curH()==='week'){render();return scrollDo();}return nav('week',{from:org});}   /* 이번 주 목표: 이번 주 탭의 목표 칸을 펼쳐 그곳으로 */
  if(x.to==='week')return nav('week',{from:org});
  return x.ex&&x.ex.auto||o.replace?stay():taskTick(id,x.label);}   /* 기록으로 끝을 아는 일(auto)은 손으로 치지 않는다 */
/* 할 일 목록에서 빠졌지만 오늘 몫에 고정해 둔 손글씨 몫 줄(9시 넘어 세트 없이 고정한 바닥 단답 q.dd, 그 뒤 오늘 세트가 옴): 고정한 세트의 남은 칸으로 연다 */
function qGone(id,t){const F=S.today&&S.today.d===t?S.today:null,r=F&&F.rows.find(q=>q.id===id),q=id.split(':')[0].slice(2),K=QK[q];
  if(!/^q\./.test(id)||!r||!r.q||!K||!K[3])return null;return{id,k:'q.'+q,quota:{q,list:r.q.filter(([d])=>{const p=hwParts(d)[K[3]];return p&&p.k<p.n;}).map(([d,n])=>({d,left:n}))}};}
/* 오늘 몫 줄의 제목(글은 그때그때 기록으로) */
function rowTitle(r){const x=r.task||{};return rowTxt(x,{tgt:r.tgt,q:r.q,left:r.left,id:r.id}).t||idLabel(r.id);}
/* 오늘 줄이 끝났는지(고정한 목표까지, 오늘 몫 밖의 줄은 할 일 목록으로) */
function flowDone(id){const t=todayStr(),V=planToday(t),r=V.rows.find(q=>q.id===id);if(r)return r.done;const x=taskList(t).find(q=>q.id===id);return!x||!!x.done;}
/* 이 줄 다음에 할 오늘 줄 {row, before, t "다음: …"/"아까 넘긴 것: …"} */
function flowNext(id){const n=nextAfter(id,planToday(todayStr()));return n?{row:n.row,before:n.before,t:(n.before?'아까 넘긴 것: ':'다음: ')+rowTitle(n.row)}:null;}
/* "다음"으로 그 줄을 시작: 하는 곳이 없는 줄(손으로 치는 일·모의 오답 다시 쓰기 몫·주간 리포트·이번 주 목표)은 오늘 화면에서 그 줄을 펼쳐 둔다(치지 않음). 묶인 세트 복습은 나머지를 잇는다 */
function flowGo(r){const x=r.task||{},k=x.k||r.id.split(':')[0];
  if(isManual(x)&&!(x.ex&&x.ex.to)||x.quota&&(x.quota.q==='redo'||!x.quota.list.length)||k==='report'||k==='goal'){UI.act=r.id;return goTab('today');}
  const g=planItems(planToday(todayStr())).find(i=>i.g&&i.ids.includes(r.id)),rest=g?g.rows.filter(q=>!q.done&&q.id!==r.id).map(q=>q.id):[];
  return taskGo(r.id,Object.assign({replace:true},rest.length?{chain:rest}:{}));}
/* 앱이 볼 수 없는 일(교재·다시 쓰기·준비물 등)은 "다 했어요"로 S.tk에 */
function taskTick(id,label){S.tk=S.tk||{};S.tk[id]=todayStr();touchDay();calMark('tk:'+id,'todo',label||id);save();render();}
/* 모의 오답 다시 쓰기 한 편(S.tk['x.redo:날짜:j']): dir 1은 "다 썼어요"·빈 동그라미, -1은 채운 동그라미(오늘 친 마지막 한 편을 뺀다, 친 날의 달력 글도) */
function redoTick(dir){const t=todayStr(),tk=S.tk||(S.tk={});
  if(dir>0){let j=0;while(tk['x.redo:'+t+':'+j])j++;return taskTick('x.redo:'+t+':'+j,'모의 오답 다시 쓰기');}
  const jn=k=>{const v=k.split(':')[2];return v==null?-1:Number(v);},k=Object.keys(tk).filter(k=>k===('x.redo:'+t)||k.indexOf('x.redo:'+t+':')===0).sort((a,b)=>jn(a)-jn(b)).pop();
  if(!k)return render();const d0=tk[k];delete tk[k];calUnmark('tk:'+k,d0);save();render();}
/* 카드 n장 돌리기: 카드 복습에 나올 카드 먼저, 모자라면 본 지 오래된 카드 */
function startRot(n){n=n||50;const t=todayStr(),a=cardsOut(t).map(c=>c.id),sk=new Set(a),b=deck().filter(c=>!sk.has(c.id)&&pget(c.id).seen>0&&pget(c.id).last!==t).sort((x,y)=>(pget(x.id).last||'')<(pget(y.id).last||'')?-1:1).map(c=>c.id);
  startSession({kind:'rot',title:`카드 ${n}장 돌리기`,items:cardItems(a.concat(b).slice(0,n)),requeue:true});}
/* 시험 일정·공부 시간이 바뀌면 오늘 몫을 다시 고른다(고정해 둔 날만) */
function planChanged(why,pre){if(S.today&&S.today.d===todayStr())planToday(todayStr(),{replan:why,pre});}
/* 시험 일정을 바꾸기 직전, 고정한 오늘 몫 줄마다 [남은 분, 끝](바꾼 뒤 목록에서 사라진 줄은 이때 끝났던 것만 남긴다). 오늘 고정한 목록이 없으면 null */
function planPre(){const t=todayStr(),F=S.today;if(!F||F.d!==t)return null;const T=taskList(t);return new Map(F.rows.map(r=>[r.id,rowStat(r,T.find(x=>x.id===r.id))]));}

/* ════════ 11. 화면: 오늘 ════════ */
function routineFor(ds){const w=weekIndex(ds),k=phaseKey(w),r=PE_ROUTINES[k]||PE_ROUTINES[1];return r[dayType(ds)]||r.wd;}
function checkRate(ds){const items=routineFor(ds),c=S.checks[ds]||{};let n=0;items.forEach((_,i)=>{if(c[i])n++;});return items.length?n/items.length:0;}
function isActive(ds){const d=S.daily[ds];return(d&&(d.active||d.graded>0))||checkRate(ds)>=0.5;}
function streak(){let n=0,t=todayStr();if(!isActive(t))t=addDays(t,-1);while(isActive(t)){n++;t=addDays(t,-1);if(n>500)break;}return n;}
/* 오늘 화면(오늘 몫): 머리(달력 아이콘·날짜·D-day) → 날짜 일 핀 → 한 줄 안내 → 이어서 → 상태 줄(오늘 몫 n개·오늘 시간) → 블록마다 번호 줄
   (펼친 첫 줄에 이 화면의 하나뿐인 파란 버튼, 필수 줄마다 "못 하면") → 다른 날로 옮긴 것·시간이 되면(접힘) → 이번 주. 체크리스트는 없다(요일별 루틴은 로드맵에서 참고로만) */
const mfmt=m=>{m=Math.max(0,Math.round(m||0));const h=Math.floor(m/60),r=m%60;return h?h+'시간'+(r?' '+r+'분':''):r+'분';};
const LV_TXT=['','빠듯해요 · 권장은 접어 두었어요','줄인 목표 · 남은 시간에 맞췄어요','핵심만 · 다음 주에 새로 시작해요'];
const FREED_NOTE='놓아준 것은 빚이 아니에요. 카드·세트 복습·오답은 복습 탭에서 다시 만나요. 손글씨 몫은 이번 주로 끝내요.';
const BLK_S={am:'아침',noon:'점심',eve:'저녁',bed:'자기 전'},PART_N={core:'세트 핵심',mock:'모의고사',hand:'손글씨',rot:'카드 돌리기',rev:'복습',close:'마감'};
const QSHORT={dd:'단답',eo:'목차',w:'쓰기',essay:'논술',redo:'다시 쓰기',fg:'그림·표',rot:'카드 돌리기'},MKP={p1:'1교시',p2:'2교시',p3:'3교시',p4:'4교시'};
let laterN=0;
/* 모의 논술 문제의 짧은 이름(첫 낱말, 끝 조사는 뗌): "쏘일네일링 공법의 …" → 쏘일네일링 */
const shortQ=s=>(String(s||'').trim().split(/\s+/)[0]||'').replace(/(의|에|을|를|과|와|은|는)$/,'');
/* 앱이 볼 수 없는 일(교재·다시 쓰기·준비물·원서접수 등): 손으로 "다 했어요"(S.tk) */
const isManual=x=>!!x&&(!!(x.ex&&!x.ex.auto)||x.k==='apply'||x.k==='recap'||x.k==='ex');
function firstUnread(d){const s=SETS.sets[d],p=spGet(d).read||{},n=((s&&s.cards)||[]).length;for(let i=0;i<n;i++)if(!p[i])return i;return 0;}
/* 밀린 세트의 빈 곳(짧게): 10/29(목) 용어·퀴즈 · 10/30(금) 용어 5·퀴즈 */
function lateGap(d){const c=setCore(d);if(!c)return dlab(d);const g=[];if(c.r)g.push(c.st.read?'용어 '+c.st.read:'용어');if(c.q)g.push(c.st.qa?'퀴즈 '+c.st.qa:'퀴즈');return dlab(d)+(g.length?' '+g.join('·'):'');}
/* 끝나 할 일 목록에서 빠진 줄의 이름 */
function idLabel(id){const a=id.split(':');return({cards:'카드 복습',wrong:'오답 다시 풀기',rev:a[1]?`세트 복습 ${dlab(a[1])} ${a[2]}일 차`:'세트 복습','set.read':'용어 읽기','set.quiz':'세트 퀴즈',late:a[1]?'밀린 세트 '+dlab(a[1]):'밀린 세트','hw.qz':'퀴즈 틀린 이유',gq:'용어 퀴즈',report:'주간 리포트'})[a[0]]||(/^q\./.test(a[0])&&QK[a[0].slice(2)]?QK[a[0].slice(2)][0]:'끝낸 일');}
/* 세트 복습 날짜를 단계마다 묶어: 10/19·10/20 7일 차 · 10/26 3일 차. 4개부터는 단계마다 수만: 1일 차 1 · 3일 차 2 · 7일 차 4 */
const revDates=xs=>{const by=new Map();xs.forEach(q=>{if(!by.has(q.step))by.set(q.step,[]);by.get(q.step).push(q.d);});
  if(xs.length>3)return[...by].sort((a,b)=>a[0]-b[0]).map(([st,ds])=>`${st}일 차 ${ds.length}`).join(' · ');return[...by].map(([st,ds])=>`${ds.map(md).join('·')} ${st}일 차`).join(' · ');};
/* 할 일 줄의 글: 제목(학원 횟수 그대로), 보조 글, 오른쪽 한 수/전체, 남은 분, 못 하면(필수만, 일요일엔 "일요일까지"가 "오늘 밤까지"), 꼬리표(권장·여유).
   o: tgt 고정한 목표(full·floor), q 고정한 손글씨 몫 세트, left 남은 분, id 줄 id(할 일 목록에서 빠진 고정 줄은 id 머리와 q로 이름을 짓는다: 늦게 온 세트 뒤의 바닥 단답 "단답 손글씨 1문") */
function rowTxt(x,o){o=o||{};x=x||{};const k=x.k||String(o.id||'').split(':')[0],sun=parse(todayStr()).getDay()===0;let t=x.label||'',sub=x.sub||'',pg=x.prog||null;
  if(x.hw){const H=x.hw,f=(o.tgt||x.tgt)==='full';sub=f?x.floorLab:`오늘은 ${H.f}번까지`;pg=f?[H.K,H.N]:[H.k,H.n];}
  if(o.q&&QK[k.slice(2)]){const K=QK[k.slice(2)],n=o.q.reduce((a,e)=>a+e[1],0),lu=Math.round((o.left||0)/MIN_PER[K[2]]);t=`${K[0]} ${n}${K[1]}`;
    sub=k==='q.redo'?'지난 모의 틀린 문제':o.q.map(([d,c])=>dlab(d)+(c>1?' '+c+K[1]:'')).join(' · ');pg=[n-Math.min(n,lu),n];}
  if(k==='mock'&&x.pk==='p1'&&tLive({kind:'mock',D:x.d,pk:'p1'}))sub='';
  if(k==='mock'&&x.pk!=='p1'){const qs=(SETS.mocks[x.d]||{})[x.pk]||[];sub=qs.length<6?qs.map(q=>shortQ(typeof q==='string'?q:q.t)).join(' · '):'문제당 25분';}
  if(x.note)sub=[sub,x.note].filter(Boolean).join(' · ');
  const rl=x.need==='필수'&&x.roll?(sun&&x.roll==='일요일까지'?'오늘 밤까지':x.roll):'';
  return{t,sub,pg:pg&&pg[1]>1?pg[0]+'/'+pg[1]:'',min:o.left!=null?o.left:x.min||0,rl,tag:x.need==='권장'||x.need==='여유'?x.need:'',paper:!!x.paper};}
const minTxt=o=>o.paper?Math.round(o.min)+'분':mfmt(o.min);
/* 보이는 순서의 오늘 몫을 번호 줄로. 한 블록의 밀린 세트, 오늘 순서에서 잇닿은 같은 꼬리표(필수·권장)의 세트 복습이 2개 이상이면 한 줄로 묶는다
   ("시작"은 첫 세트부터, 끝 화면이 그 묶음의 다음 세트로만 잇는다). 날짜 일 핀은 번호 없이 맨 위에 따로 */
function planItems(V){const L=planOrder(V).filter(r=>r.blk!=='pin'),out=[],kOf=r=>r.task?r.task.k:r.id.split(':')[0];
  L.forEach(r=>{const k=kOf(r);if(k==='rev'){const nd=(r.task||{}).need||'필수',g=out[out.length-1];if(g&&g.vb===r.vb&&g.g==='rev'&&g.need===nd){g.rows.push(r);return;}out.push({vb:r.vb,g:k,need:nd,rows:[r]});return;}
    if(k==='late'){const g=out.find(i=>i.vb===r.vb&&i.g===k);if(g){g.rows.push(r);return;}out.push({vb:r.vb,g:k,rows:[r]});return;}out.push({vb:r.vb,g:null,rows:[r]});});
  out.forEach((it,i)=>{if(it.rows.length<2)it.g=null;it.n=i+1;it.ids=it.rows.map(r=>r.id);it.done=it.rows.every(r=>r.done);it.left=it.rows.reduce((a,r)=>a+(r.done?0:r.left),0);});return out;}
function itemTxt(it){const L=it.rows,x=L[0].task||{},sun=parse(todayStr()).getDay()===0;
  if(it.g){const a=L.filter(q=>q.done).length,ps=L.map(q=>q.id.split(':')),rec=it.g==='rev'&&it.need==='권장';return{t:it.g==='rev'?`세트 복습 ${L.length}개`:`밀린 세트 ${L.length}개`,
    sub:it.g==='rev'?revDates(ps.map(p=>({d:p[1],step:Number(p[2])}))):ps.map(p=>lateGap(p[1])).join(' · '),pg:a+'/'+L.length,min:it.left,rl:rec?'':it.g==='rev'?'다시 나와요':sun?'오늘 밤까지':'일요일까지',tag:rec?'권장':''};}
  const r=L[0];return rowTxt(x,{tgt:r.tgt,q:r.q,left:r.done?0:r.left,id:r.id});}
/* 이어서(하다 만 흐름): 세션 → 가리며 외우기 → 이번 주 세트의 넘겨 보기·가리며 외우기 자리(앱을 다시 연 뒤). {k, kind, d, i, n, label} */
function resumeSrc(t){
  if(SES&&SES.i<SES.items.length){const n=SES.items.length,k=SES.kind,d=SES.setD||SES.revD||((SES.rv||[])[0]||{}).d||null;
    return{k:'ses',kind:k,d,i:SES.i,n,label:(k==='flash'&&d?`${md(d)} 세트 카드 넘겨 보기`:k==='rev'&&d?`${md(d)} 세트 복습`:SES.title||'학습')+` ${SES.i+1}/${n}`};}
  if(MEMO&&!MEMO.fin){const n=MEMO.items.length,d=MEMO.setD||null;return{k:'mem',kind:d?'memo':'',d,i:MEMO.i,n,label:(d?`${md(d)} 세트 가리며 외우기`:`가리며 외우기: ${MEMO.label||''}`)+` ${MEMO.i+1}/${n}`};}
  const W=wkStart(t);for(const d of Object.keys(SETS.sets).filter(d=>d>=W&&d<=t).sort().reverse()){
    const f=resumeGet('flash:'+d);if(f&&setCore(d)&&setCore(d).r)return{k:'flash',kind:'flash',d,i:f.i,n:f.n,label:`${md(d)} 세트 카드 넘겨 보기 ${f.i+1}/${f.n}`};   /* 용어를 다 읽은 세트의 넘겨 보기 자리는 잇지 않는다 */
    const m=resumeGet('memo:set:'+d);if(m)return{k:'memo',kind:'memo',d,i:m.i,n:m.n,label:`${md(d)} 세트 가리며 외우기 ${m.i+1}/${m.n}`};}
  return null;}
/* 그 흐름이 이 줄의 일이면 줄의 파란 버튼이 이어 하고("이어서 · …") 위의 이어서 줄은 숨긴다 */
function resumeOwn(s,it){const has=p=>it.rows.some(r=>!r.done&&r.id.indexOf(p)===0);if(!s||!it)return'';
  if((s.kind==='flash'||s.kind==='memo')&&s.d&&has('set.read:'+s.d))return`이어서 · ${s.i+1}번째 용어부터`;
  if(s.k==='ses'&&(s.kind==='rev'&&s.d&&has('rev:'+s.d+':')||s.kind==='cards'&&has('cards:')||s.kind==='wrong'&&has('wrong:')))return`이어서 · ${s.i+1}/${s.n}`;
  return'';}
/* 이어서: 연 곳을 지금 화면으로 새로 적는다(T4). 오늘 줄에서 이었으면 그 줄을 FLOW에 */
function resumeGo(id){const s=resumeSrc(todayStr());if(!s)return render();const fl=id?{id,from:'today',at:s.k==='mem'||s.k==='memo'?'memo':'sess'}:null;
  if(s.k==='ses'){SES.from=curH();FLOW=fl;return nav('sess');}
  if(s.k==='mem'){memoStop();MEMO.from=curH();FLOW=fl;return nav('memo');}
  if(s.k==='flash')setFlash(s.d);else memoSet(s.d);FLOW=fl;}
/* 이어서 줄(상태 줄 위, 하다 만 흐름이 있을 때만). 펼친 줄의 일이면 그 줄의 버튼이 대신한다 */
function resumeRowHTML(src,ai){return src&&!(ai&&resumeOwn(src,ai))?`<button class="resume" data-act="resume">이어서 · ${esc(src.label)}<span class="chev"></span></button>`:'';}
/* 펼친 줄의 파란 버튼 [글, 동작] */
function goOf(it,src){const r=it.rows.find(q=>!q.done)||it.rows[0],x=r.task||{},k=x.k||r.id.split(':')[0],own=resumeOwn(src,it);
  if(own)return[own,'resume'];if(it.g)return[`시작 · ${md(r.id.split(':')[1])} 세트부터`,'task'];
  if(isManual(x))return[x.k==='apply'?'접수했어요':'다 했어요','tk'];
  if(k==='q.redo')return['한 편 다 썼어요','redo-tick'];   /* 모의 오답 다시 쓰기: 앱이 볼 수 없는 손글씨라 이 버튼(또는 동그라미)으로만 한 편씩 친다 */
  const L={'mock.g':'채점하기',report:'복사하기',gq:'이어 풀기',kichul:'기출 보기',backup:'백업하기',budget:'정하기',goal:'목표 보기','x.trend':'점수 적기'};
  if(k==='set.read'){const c=setCore(x.d);return[c&&c.st.read?`이어서 · ${firstUnread(x.d)+1}번째 용어부터`:'시작','task'];}
  if(k==='mock')return[tLive({kind:'mock',D:x.d,pk:x.pk})?`이어서 · ${MKP[x.pk]||''}`:`${MKP[x.pk]||''} 시작`,'task'];   /* 그 교시 타이머가 돌거나 멈췄거나 막 끝났으면 "이어서"(모의 화면의 그 타이머로) */if(k==='cards')return[`시작 · ${x.kc}장`,'task'];if(k==='wrong')return[`시작 · ${x.n}개`,'task'];
  if(k==='x.outline')return[`시작 · ${/5문/.test(x.label)?5:3}문`,'task'];if(k==='x.rot')return[`시작 · ${x.n||50}장`,'task'];
  if(k==='carry.sets')return[`시작 · ${md(x.ds[x.ds.length-1])} 세트부터`,'task'];if(x.to==='schedule')return['확인하기','task'];
  return[L[k]||'시작','task'];}
/* 오늘 몫 줄 하나. 펼친 줄은 div(안에 파란 버튼과 "나중에"), 나머지는 줄 전체가 버튼(그 일을 하는 곳으로 한 번에).
   손으로 치는 일은 동그라미(.tkc): 갈 곳이 없으면 줄 전체, 갈 곳이 있으면(단답 1문제 더) 동그라미만.
   모의 오답 다시 쓰기 몫: 줄은 지난 모의 화면으로, 동그라미는 한 편 다 썼어요(다 채운 동그라미를 누르면 오늘 친 마지막 한 편을 뺀다) */
function planRowHTML(it,c){const o=itemTxt(it),now=c.ai===it,r0=it.rows[0],x=r0.task||{},id=r0.id,dn=it.done,und=it.rows.filter(r=>!r.done).map(r=>r.id),ids=(und.length?und:it.ids).join(' ');
  const right=dn?'':(o.pg||minTxt(o)),meta=dn?'':esc([o.sub,o.pg?minTxt(o):'',o.rl].filter(Boolean).join(' · ')),rdo=x.k==='q.redo',rdA=rdo&&o.pg?Number(o.pg.split('/')[0]):0;
  const pn=`<span class="pn${now?' now':''}${dn?' done':''}">${dn?'':it.n}</span>`,tx=`<span class="pt">${esc(o.t||idLabel(id))}${o.tag?`<span class="tag">${o.tag}</span>`:''}</span>${meta?`<span class="pm">${meta}</span>`:''}`;
  if(now){const[g,a]=goOf(it,c.src);return`<div class="prow now" data-task="${esc(id)}">${pn}<div class="pb">${tx}<div class="pgo"><button class="btn" data-act="${a}" data-id="${esc(a==='task'?ids.split(' ')[0]:id)}" data-ids="${esc(ids)}">${esc(g)}</button>${rdo&&rdA?`<button class="btn ghost sm" data-act="redo-undo" data-id="${esc(id)}">한 편 빼기</button>`:''}<button class="btn ghost sm" data-act="later" data-ids="${esc(ids)}">나중에</button></div></div>${right?`<span class="pv">${right}</span>`:''}</div>`;}
  if(rdo)return`<div class="prow two${dn?' done':''}" data-task="${esc(id)}"><button class="pbody" data-act="task" data-id="${esc(id)}">${pn}<span class="pb">${tx}</span>${right?`<span class="pv">${right}</span>`:''}</button><button class="tkc${dn?' on':''}" data-act="${dn?'redo-undo':'redo-tick'}" data-id="${esc(id)}" aria-label="${dn?'다 쓴 마지막 한 편 빼기':'한 편 다 썼어요'}" aria-pressed="${dn}"></button></div>`;
  if(!it.g&&isManual(x)){const on=dn?' on':'';if(x.ex&&x.ex.to)return`<div class="prow two${dn?' done':''}" data-task="${esc(id)}"><button class="pbody" data-act="task" data-id="${esc(id)}">${pn}<span class="pb">${tx}</span></button><button class="tkc${on}" data-act="tk" data-id="${esc(id)}" aria-label="다 했어요"></button></div>`;
    return`<button class="prow${dn?' done':''}" data-act="tk" data-id="${esc(id)}" data-task="${esc(id)}">${pn}<span class="pb">${tx}</span><span class="tkc${on}"></span></button>`;}
  return`<button class="prow${dn?' done':''}" data-act="task" data-id="${esc(ids.split(' ')[0])}" data-ids="${esc(ids)}" data-task="${esc(id)}">${pn}<span class="pb">${tx}</span>${right?`<span class="pv">${right}</span>`:''}</button>`;}
/* 블록 머리: 이름·어디서(주말 교시는 분), 지금 표시, 한 수/전체 · 남은 분. 다 하면 "✓ 끝"으로 접는다. 4줄이 넘으면 나머지는 접어 둔다 */
function blkName(vb,V,its){let[n,cu]=String(PLAN_BLK[vb]||vb).split(' · ');
  if(/^p[234]$/.test(vb))cu=mfmt(its.reduce((a,i)=>a+i.rows.reduce((s,r)=>s+r.m,0),0));
  if(vb==='core')cu=its.some(i=>i.rows.some(r=>r.task&&r.task.paper))?'책상':'휴대폰';
  if(vb==='bed'&&V.notes&&V.notes.bed)cu=V.notes.bed;return[n,cu||''];}
/* 접는 칸(details)의 열림: 기본으로 열 때(펼친 줄이 안에 있거나 오늘 몫을 다 했을 때) 또는 이 앱 세션에서 연 칸(UI.open: 요약을 누를 때 적고, 날이 바뀌면 비움).
   줄을 치거나 고르면 화면을 다시 그리므로, 쓰던 칸이 닫히지 않게 한다 */
const foldAt=(k,def)=>` data-fold="${esc(k)}"${def||UI.open[k]?' open':''}`;
/* 기본으로 여는 것이 편의일 뿐인 칸(세트 퀴즈를 다 푼 뒤의 용어 퀴즈, 숙제 더 하기): 이 앱 세션에서 연 것·닫은 것이 기본보다 앞선다 */
const foldPref=(k,def)=>` data-fold="${esc(k)}"${(k in UI.open?UI.open[k]:def)?' open':''}`;
function blockHTML(vb,its,c){const[n,cu]=blkName(vb,c.V,its),dn=its.filter(i=>i.done).length,fin=dn===its.length,left=its.reduce((a,i)=>a+(i.done?0:i.left),0),cur=vb===c.V.curBlk&&!fin;
  const cnt=fin?`✓ 끝 · ${dn}/${its.length}`:its.length>1?`${dn}/${its.length} · 약 ${mfmt(left)}`:'';
  const head=`<div class="blk${cur?' cur':''}${fin?' fin':''}"><span class="bn">${esc(n)}${cu?`<small>${esc(cu)}</small>`:''}</span><span class="bc">${cur?'<i class="now">지금</i>':''}${cnt}</span></div>`;
  if(fin)return head;const H=its.map(it=>planRowHTML(it,c)),ai=its.indexOf(c.ai);
  return head+`<div class="plan">${H.slice(0,4).join('')}${H.length>4?`<details class="pmore"${foldAt('pmore:'+vb,ai>=4)}><summary>나머지 ${H.length-4}개 보기</summary>${H.slice(4).join('')}</details>`:''}</div>`;}
/* 날짜 일 핀(원서접수·48시간 복기): 주황, 남은 날 표는 3일 안이면 빨강(이번 주 탭 배지와 같은 규칙). 버튼은 보조(파란 버튼은 늘 목록 쪽).
   다 하면 한 줄로 줄인다(되돌리기는 이번 주 탭의 같은 줄) */
function pinHTML(r){const x=r.task;if(!x)return'';const ap=x.k==='apply';
  if(r.done)return`<div class="pin done"><span class="pfi">${icon('check')}</span><div class="pb"><b>${esc(x.label.split(': ')[0])}</b><span>✓ ${ap?'접수했어요':'다 했어요'}</span></div></div>`;
  return`<div class="pin"><span class="pfi">${icon('flag')}</span><div class="pb"><span class="pt1"><b>${esc(x.label)}</b>${x.roll?`<span class="pdd${x.urg?' due':''}">${esc(x.roll)}</span>`:''}</span>${x.sub?`<span>${esc(x.sub)}</span>`:''}
  <div class="btns"><button class="btn sm sec" data-act="tk" data-id="${esc(x.id)}">${ap?'접수했어요':'다 했어요'}</button>${ap?'<button class="btn sm sec" data-act="go" data-h="schedule">날짜 확인·고치기</button>':''}</div></div></div>`;}
/* 한 줄 안내(단계 시작 등, ×로 지움) */
function noticeHTML(x){return`<div class="notice"><span>${esc(x.label)}</span><button class="nx" data-act="wk-dismiss" data-k="${esc(x.id)}" aria-label="안내 닫기">×</button></div>`;}
/* 월요일 안내(화요일까지, ×로 지움 S.tk['wkline:주']): "2주차 시작 · 기초 + 흙막이·가시설" / 넘어온 것(이름만, 못 한 수는 세지 않음) / 지난주 기록 창.
   지난주 점수는 띠로 띄우지 않고 창 안에만 */
function monNotice(t){const dw=parse(t).getDay(),W=wkStart(t),w=wkIdx(t),LW=addDays(W,-7),x=S.wk&&S.wk[LW];
  if(dw!==1&&dw!==2||(S.tk||{})['wkline:'+W]||w<1||t>PLAN.target.d||!x||!x.at||addDays(LW,6)<(S.created||''))return null;
  const T=taskList(t),cs=T.find(r=>r.k==='carry.sets'),cm=T.find(r=>r.k==='carry.mock');
  const u=S.settings.schUndo,sch=u&&u.at&&wkStart(u.at)===W?`새 일정 · 제${PLAN.target.r}회 ${korDate(PLAN.target.d)}(${DAYK[parse(PLAN.target.d).getDay()]}) 목표`:'';   /* 시험 일정이 바뀐 월요일 */
  return{W,LW,head:`${weekLabel(w)} 시작 · ${weekObj(w).t}`,sch,car:[cs?`지난주 세트 ${cs.ds.length}개(권장)`:'',cm?'지난주 모의고사':''].filter(Boolean)};}
/* 단계가 바뀐 월요일은 단계 안내(ph)를 같은 칸에 넣는다(×는 둘 다 지움) */
function monNoticeHTML(n,ph){return n?`<div class="notice mon"><span><b>${esc(n.head)}</b>${n.sch?`<small>${esc(n.sch)}</small>`:''}${ph?`<small>${esc(ph.label)}</small>`:''}${n.car.length?`<small>넘어온 것: ${esc(n.car.join(' · '))}</small>`:''}<button class="btn ghost sm" data-act="wk-last" data-w="${n.LW}">지난주 기록<i class="chev"></i></button></span><button class="nx" data-act="wk-dismiss" data-k="wkline:${n.W}${ph?' '+esc(ph.id):''}" aria-label="안내 닫기">×</button></div>`:'';}
/* 60% 넘은 주가 이어진 수(W 전 주부터 거꾸로, 고정한 지난 주들) */
function wkRun(W){let n=0;for(const k of Object.keys(S.wk||{}).filter(k=>k<W&&S.wk[k]&&S.wk[k].at&&S.wk[k].p!=null).sort().reverse()){if(S.wk[k].p>=60)n++;else break;}return n;}
/* ── 시험 일정 살펴보기(읽기만): 미룰지 묻는 때(slipCheck), 회차 견주기(roundRows), 바뀌는 날(schFrom). 쓰는 것은 lockLived·nextApply(시험 일정 저장·바꾸는 월요일)뿐 ── */
/* 지난 한 주 점수: 고정한 기록(S.wk[주].p), 없으면 그 일요일 기준으로 센다(앱을 열지 않은 주는 0에 가깝게). S.wk에 적지 않는다 */
function weekP(Wk){const x=(S.wk||{})[Wk];return x&&x.at&&x.p!=null?x.p:weekBoard(addDays(Wk,6)).pct;}
/* 시험을 미룰지 살펴볼 때: pace 최근 4주 가운데 3주가 60% 아래(앱을 열지 않은 주 포함), off 3단계 전에 쉬는 날 14일 이상, apply 원서접수 기간이 지났는데 "접수했어요" 없음.
   "지금 일정대로 할게요"(slipNo)는 4주 동안 묻지 않음(평균이 10점 넘게 떨어지면 다시). 바꾸기를 기다리는 동안·시험이 든 주·2주차 전에는 묻지 않는다.
   시험 일정을 바꾼 뒤(schUndo.at, 바로 바꾸기·되돌리기·기다린 바꾸기를 넣은 날)에는 바꾼 주부터 센다: 새 일정으로 산 주가 3주가 될 때까지 pace·off를 묻지 않는다 */
function slipCheck(t){t=t||todayStr();const st=S.settings;if(wkIdx(t)<1||t>PLAN.target.d||st.nextTarget)return null;
  const T0=PLAN.target,ap=addDays(T0.d,-PE_SCHED.annBefore),ae=addDays(ap,3),nx=eligibleRounds(st.start).find(x=>x.r>T0.r);if(!nx)return null;
  const o={why:null,ps:[],low:0,avg:null,offN:0,nx,T0,ap,ae};
  if(t>ae&&!(S.tk||{})['apply:'+T0.r])return Object.assign(o,{why:'apply'});
  if(t>ae||exWeek(t))return null;
  const W=wkStart(t),sw=st.schUndo&&st.schUndo.at?wkStart(st.schUndo.at):'',c0=[wkStart(S.created||t),sw].sort().pop(),ps=[];if(sw&&W<addDays(sw,21))return null;
  for(let k=1;k<=8&&ps.length<4;k++){const Wk=addDays(W,-7*k);if(Wk<c0||weekIndex(Wk)<1)break;const p=weekP(Wk);if(p!=null)ps.unshift(p);}
  const low=ps.filter(p=>p<60).length,avg=ps.length?Math.round(ps.reduce((a,p)=>a+p,0)/ps.length):null,pace=ps.length>=3&&low>=3;
  const P3=addDays(st.start,7*(PLAN.E-11)),offN=Object.keys(S.days||{}).filter(d=>d>=t&&d<P3&&S.days[d]&&S.days[d].m===0).length;
  if(!pace&&offN<14)return null;
  const no=st.slipNo;if(no&&diffDays(no.at,t)<28&&!(avg!=null&&no.avg!=null&&avg<=no.avg-10))return null;
  return Object.assign(o,{why:pace?'pace':'off',ps,low,avg,offN});}
/* 회차 견주기: 지금 목표와 그다음 두 회차(computePlan, 읽기만). 시험까지 주, 1·2단계 남은 주, 단원마다 주(1·2단계 칸 ÷ 주차 틀), 3단계 시작, 실전 모의, 원서접수 */
function roundRows(t){t=t||todayStr();const st=S.settings.start,w=Math.max(0,wkIdx(t)),T0=PLAN.target;
  return[T0].concat(eligibleRounds(st).filter(x=>x.r>T0.r).slice(0,2)).map(x=>{const P=x.r===T0.r?PLAN:computePlan(st,x.r);let sl=0;for(let a=1;a<=P.E-12;a++)if(a!==P.M)sl++;
    const ap=addDays(P.target.d,-PE_SCHED.annBefore);
    return{r:P.target.r,P,cur:x.r===T0.r,wk:Math.ceil(diffDays(t,P.target.d)/7),p12:Math.max(0,P.E-12-w+1),per:Math.max(1,Math.round(sl/(sl>=16?16:15))),p3:addDays(st,7*(P.E-11)),ap,ae:addDays(ap,3)};});}
/* 바꾸기 전 계획의 시험 가운데 새 계획에서 빠지는데 "접수했어요"로 친 것(그 시험의 48시간 복기까지는 지금 계획대로) */
function schKeep(P0,P1,t){const tk=S.tk||{};return[P0.mock,P0.target].filter(x=>x&&![P1.mock,P1.target].some(y=>y&&y.r===x.r)&&t<=addDays(x.d,2)&&!!tk['apply:'+x.r]);}
/* 목표만 바꿀 때 새 계획이 언제부터인지: null 바로(이번 주 주차 틀·이번·다음 주 시험 날·시험 주 여부가 같을 때), 다음 월요일, 접수한 시험이 빠지면 그 복기 다음 월요일 */
function schFrom(P0,P1,t){t=t||todayStr();const w=wkIdx(t);if(w<0)return null;const W=wkStart(t),E7=addDays(W,13);
  const ex=P=>[P.mock,P.target].filter(x=>x&&x.d>=W&&x.d<=E7).map(x=>x.d).join();
  const same=JSON.stringify(P0.map[w])===JSON.stringify(P1.map[w])&&ex(P0)===ex(P1)&&(w>=P0.E)===(w>=P1.E),keep=schKeep(P0,P1,t);
  return keep.length?keep.map(x=>addDays(wkStart(addDays(x.d,2)),7)).sort().pop():same?null:addDays(W,7);}
/* 계획을 갈아 끼우기 전에 지난 주마다 산 단계를 적어 둔다(S.wk[월요일].ph, 이미 있으면 그대로): 지난 세트의 숙제 필수(setPh)·지난주 기록 배점이 바뀌지 않게.
   wf 주차 전까지(그 주는 빼고). at은 적지 않아 weekSnap은 그대로 그 주를 고정한다 */
function lockLived(P0,wf){S.wk=S.wk||{};for(let a=1;a<wf;a++){const W=wkStart(addDays(P0.start,7*a+6)),x=S.wk[W]||(S.wk[W]={});if(x.ph==null)x.ph=phaseObj(a,P0).id;}}
/* 단계 안내를 다시 보이게: 새 계획의 지금 단계보다 높은 단계의 "지움"(S.tk['phase:n'])을 지운다 */
function phaseReset(t){const id=phaseObj(wkIdx(t)).id,tk=S.tk||{};Object.keys(tk).forEach(k=>{const m=/^phase:(\d+)$/.exec(k);if(m&&Number(m[1])>id)delete tk[k];});}
/* 기다리던 시험 일정(S.settings.nextTarget)을 그 월요일에 넣는다. 오늘 몫을 고정할 때(planToday)·받아 오기 끝·앱이 앞으로 올 때만, 받아 오는 중에는 기다림.
   바꾸는 주가 이번 주면 지난주를 먼저 지금 계획으로 고정, 이미 지났으면 넣은 뒤 새 계획으로. 넣으면 true */
function nextApply(t){t=t||todayStr();const st=S.settings,N=st.nextTarget;if(!N||!N.from||N.from>t||syncing)return false;
  S.wk=S.wk||{};if(N.from===wkStart(t))weekSnap(t);
  const pre=planPre();lockLived(PLAN,wkIdx(N.from));
  st.target=N.r||'auto';st.schUndo={r:N.prev||'auto',at:t};delete st.nextTarget;delete st.slipNo;recalcPlan();phaseReset(t);save();
  if(pre)planChanged('sched',pre);return true;}
/* 기다리는 새 목표의 회차 번호('auto'면 그 시작일의 가장 빠른 회차) */
const nextR=N=>computePlan(S.settings.start,N.r).target.r;
/* 지난주 기록(월요일 안내의 창): 지난주 점수와 부분(그 주를 고정한 S.wk[LW]), 넘어온 것, 놓아준 것(이름), 60% 넘은 주 연속 */
/* 점수 칸을 반올림해도 합이 머리 숫자(t, 없으면 합을 반올림)와 같게: 내림한 뒤 남는 점은 소수 부분이 큰 칸부터 1씩 */
function rParts(vs,t){const v=vs.map(x=>+x||0),f=v.map(Math.floor);if(t==null)t=Math.round(v.reduce((a,x)=>a+x,0));let r=t-f.reduce((a,x)=>a+x,0);const o=v.map((x,i)=>[x-f[i],i]).sort((a,b)=>b[0]-a[0]);
  for(const[,i]of o){if(r<=0)break;f[i]++;r--;}for(const[,i]of o.slice().reverse()){if(r>=0)break;if(f[i]>0){f[i]--;r++;}}return f;}
const SEP='\u00a0· ';   /* 줄이 "·"로 시작하지 않게 점 앞은 붙는 칸 */
/* 그 주를 고정할 때 적은 단계(ph)·목표 수(gn·gd)·쉬는 날 수(off)가 있으면 그것으로(예전 기록은 지금 계획으로 센다) */
function lastWeekSheet(LW){const x=(S.wk||{})[LW]||{},w=wkIdx(wkFrom(LW)),sc=PE_SCORE[Math.max(1,x.ph!=null?x.ph:phaseObj(w).id)]||PE_SCORE[1],T=taskList(todayStr()),cs=T.find(r=>r.k==='carry.sets'),cm=T.find(r=>r.k==='carry.mock'),run=wkRun(addDays(LW,7)),rel=x.rel||[];
  const gs=weekObj(Math.max(0,w)).goals||[],gn=x.gn!=null?x.gn:gs.length,gd=x.gd!=null?x.gd:gs.filter((_,i)=>(S.tk||{})['goal:'+LW+':'+i]).length;   /* 마감(5점)은 리포트 + 그 주 목표라 목표 수를 함께(점수 카드의 "이번 주 목표"와 같은 수) */
  const pk=Object.keys(x.parts||{}),pr=rParts(pk.map(k=>x.parts[k]),x.pct),parts=pk.map((k,i)=>`<span class="nw">${esc(PART_N[k]||k)} ${pr[i]}/${sc[k]||0}</span>${k==='close'&&gn?` <span class="nw">· 그 주 목표 ${gd}/${gn}</span>`:''}`).join(SEP);
  const car=(cs?row({t:esc(`지난주 세트 읽기·퀴즈 ${cs.ds.length}개`),d:esc(cs.sub+' · 이번 일요일까지(권장)')}):'')+(cm?row({t:esc(`지난주 모의고사(${md(cm.d)})`),d:'토요일 새 모의 전까지'}):'');
  return`<p class="sheet-k">지난주 기록 · ${md(LW)}~${md(addDays(LW,6))}</p><h3 class="cmh">지난주(${esc(weekLabel(w))}) ${x.p==null?'· 시험 주라 점수 대신 체크':x.p+'%'}</h3>${x.lv?`<p class="ds">${esc(LV_TXT[x.lv].split(' · ')[0])}</p>`:''}
  ${parts?`<p class="sc4 lwp">${parts}</p>`:''}${x.off?`<p class="note">쉬는 날 ${x.off}일</p>`:''}${car?sec('넘어온 것','',`<div class="group">${car}</div>`):''}${rel.length?sec('놓아준 것',rel.length+'개',`<div class="group">${rel.map(l=>row({t:esc(l)})).join('')}</div>`):''}
  ${run||rel.length?`<p class="note">${[run?`60% 넘은 주 ${run}주 연속.`:'',rel.length?FREED_NOTE:''].filter(Boolean).join(' ')}</p>`:''}${(sx=>sx?`<div class="group" style="margin-top:12px">${slipRow(sx)}</div>`:'')(slipTxt(slipCheck(todayStr())))}<div class="btns"><button class="btn sec" data-act="sheet-close">닫기</button></div>`;}   /* 놓아준 것 안내는 놓아준 것이 있을 때만 */
/* 시험 날 카드(본시험·실전 모의 날): 그날 체크리스트(ex:날짜:i), 준비물 한 줄, 파란 버튼 "응시했어요"(ex:날짜:a). 점수·오늘 시간·블록은 없다 */
function examHTML(t){const L=taskList(t).filter(x=>x.k==='ex'),a=L.find(x=>/:a$/.test(x.id)),mock=!!PLAN.mock&&PLAN.mock.d===t,kit=((((PE_EXTRA.pre3||{}).wd)||[]).find(x=>x.k==='kit')||{}).t||'';
  return`<div class="dcard exam"><h3>문제 고르기 3분 → 시간 엄수 → 공란 금지</h3>${kit?`<p class="ds">${esc(kit.replace(/^준비물 점검: /,'준비물: '))}</p>`:''}
  <div class="plan">${L.filter(x=>x!==a).map(x=>`<button class="prow${x.done?' done':''}" data-act="tk" data-id="${esc(x.id)}" data-task="${esc(x.id)}"><span class="pb"><span class="pt">${esc(x.label)}</span></span><span class="tkc${x.done?' on':''}"></span></button>`).join('')}</div>
  ${!a?'':a.done?`<button class="exd" data-act="tk" data-id="${esc(a.id)}" aria-label="응시했어요 되돌리기">✓ 응시했어요</button><p class="note">${mock?'내일 오늘 화면 맨 위에 48시간 복기가 나와요.':'수고했어요. 시험 뒤에는 복기와 면접 준비를 해요.'}</p>`:`<button class="btn" data-act="tk" data-id="${esc(a.id)}">응시했어요</button>`}</div>`;}
/* 안내 줄(번호 없음): 세트·모의고사를 기다리는 중(보조 버튼 "지금 받아 오기"), 시험 날 요령 */
function infoHTML(x){const w=x.k==='wait'&&(x.sub||x.sync),f=w&&!syncing&&syncBad(),sub=f?'받아 오지 못했어요 — 인터넷 연결을 확인하세요':x.sub;   /* 받아 오는 상태(받아 오는 중·실패)는 이 줄 하나에 */
  return`<div class="pinfo"><b>${esc(x.label)}</b>${sub?`<span>${esc(sub)}</span>`:''}${w?syncBtn('btn sm sec',f):''}</div>`;}
/* 받아 오기 버튼 하나: 받아 오는 동안은 "받아 오는 중…"(누를 수 없음), 실패 뒤에는 "다시 받아 오기" */
const syncBad=()=>!!(S.sync&&S.sync.last&&S.sync.ok===false),syncBtn=(c,f)=>`<button class="${c}" data-act="sync"${syncing?' disabled':''}>${syncing?'받아 오는 중…':f?'다시 받아 오기':'지금 받아 오기'}</button>`;
/* 할 몫이 없을 때 카드 하나(파란 버튼 하나): 자료가 없거나 기다리는 중이면 받아 오기, 있으면 자유 연습 */
function norowsHTML(V,t){const wt=V.info.find(x=>x.k==='wait'),none=!Object.keys(SETS.sets).length,w=wkIdx(t);let h,s='',b=['연습에서 자유 연습','start-free'];
  if(w<0)h=`준비 시작 전 · ${korDate(S.settings.start)}부터`;else if(t>PLAN.target.d)h='시험 후 · 복기와 면접 준비';
  else if(none||wt){const f=!syncing&&syncBad();h=none?'아직 받은 세트가 없어요':wt.label;s=f?'받아 오지 못했어요 — 인터넷 연결을 확인하세요':none?'앱을 열 때마다 저장소에서 새 세트를 받아 와요.':wt.sub||'';b=[f,'sync'];}   /* 받아 오는 상태는 이 카드 하나에(버튼도 하나) */
  else{h='오늘 할 몫이 없어요';s='시간이 되면 범위를 골라 자유 연습을 해요.';}
  if(w<0&&recBefore())s='준비 시작 전에 공부한 기록이 남아 있어요.';
  return`<div class="dcard norows"><h3>${esc(h)}</h3>${s?`<p class="ds">${esc(s)}${w<0&&recBefore()?' <button class="lnk" data-act="rec-wipe">지우고 새로 시작</button>':''}</p>`:''}${b[1]==='sync'?syncBtn('btn',b[0]):`<button class="btn" data-act="${b[1]}">${b[0]}</button>`}</div>`;}
/* 쉬는 날 카드: 오늘 몫이 이번 주 어느 날로 갔는지(평소 시간과 견준 앞날 계산), 못 넣는 것은 이름만(오늘 화면에 분은 쓰지 않음), 하나뿐인 파란 버튼 "다시 공부할래요" */
function offCardHTML(t){const od=offDelta(t,t,0),pl=od?placeTxt(od.dl,t):'옮길 필수가 없어요',sp=od&&od.sp>=5?spillNames(od.ds):'',none=pl==='옮길 필수가 없어요';
  return`<div class="dcard off"><h3>오늘은 쉬어요</h3><p class="ds">${none?(sp?'다른 날로 옮길 수 있는 필수는 없어요':esc(pl)):nwTxt(pl)+'에 나눠 넣었어요'}</p><p class="ds">${esc(sp?`${sp}${jo(sp,['은','는'])} 다음 주로 놓아줘요`:'이번 주 안에 다 따라잡아요')}${SAME_HTML}</p><button class="btn" data-act="off-clear">다시 공부할래요</button></div>`;}
/* 오늘 시간을 줄인 날: 줄인 만큼 이번 주 어느 날로 가는지("목 +16분", 5분 넘게 옮길 때만) */
function reducedTxt(t){const a=wkAhead(t,{norm:1}),b=wkAhead(t);if(!a||!b||a.out[0].load-b.out[0].load<5)return'';const dl={};b.out.forEach((x,i)=>{dl[x.d]=x.load-a.out[i].load;});const p=placeTxt(dl,t);return p==='옮길 필수가 없어요'?'':p;}
/* 오늘 몫을 다 했을 때: 한 분, 내일 할 것. 시간이 되면에서 펼칠 줄이 없을 때만 파란 버튼. 일요일을 쉬는 날로 정한 토요일은 일요일처럼 */
function doneHTML(V,b,t,act){const k=dayKind(t),tm=addDays(t,1),tk=dayKind(tm),sunOff=k==='sat'&&dayOff(tm);
  const nx=k==='sat'&&!sunOff?(b.B?`내일(일): 남은 필수 약 ${mfmt(b.B)}`:'이번 주 필수를 다 했어요'):k==='sun'||sunOff?(b.B?`이번 주 남은 필수 약 ${mfmt(b.B)}${jo(mfmt(b.B),['은','는'])} 다음 주로 놓아줘요`:'이번 주 필수를 다 했어요')
    :tk==='sat'?'내일(토): 주간 모의고사가 06:21에 와요':tk==='exam'?'내일은 시험이에요':`내일: ${dlab(tm)} 세트가 06:21에 와요`;
  return`<div class="dcard fin"><h3>오늘 몫 끝</h3><p class="ds">약 ${mfmt(V.doneMin)} 했어요 · ${esc(nx)}</p>${act?'':'<button class="btn" data-act="start-free">연습에서 자유 연습</button>'}</div>`;}
/* 다른 날로 옮긴 것(필수, 갈 곳과 함께)·놓아준 것(단계 3) */
function movedHTML(V){const M=V.moved||[];if(!M.length)return'';
  const by=new Map();M.forEach(x=>by.set(x.dest,(by.get(x.dest)||0)+1));
  /* 손글씨 몫은 남은 세트를 적는다(12/23(수) · 15분 → 토요일 따라잡기). 모의 오답 다시 쓰기는 줄이 지난 모의로, 동그라미가 한 편 다 썼어요 */
  const mrow=x=>{const pb=`<span class="pb"><span class="pt">${esc(x.label)}</span><span class="pm">${esc([x.quota&&x.quota.q!=='redo'&&x.msets&&x.msets.length?x.msets.map(dlab).join(' · '):'',mfmt(x.min)].filter(Boolean).join(' · '))} → ${esc(x.dest||'')}</span></span>`;
    if(x.quota&&x.quota.q==='redo')return`<div class="prow moved two" data-task="${esc(x.id)}"><button class="pbody" data-act="task" data-id="${esc(x.id)}">${pb}</button><button class="tkc" data-act="redo-tick" data-id="${esc(x.id)}" aria-label="한 편 다 썼어요"></button></div>`;
    return`<button class="prow moved" data-act="task" data-id="${esc(x.id)}" data-task="${esc(x.id)}">${pb}</button>`;};
  return`<details class="d pf"${foldAt('moved')}><summary><span class="fs">다른 날로 옮긴 것 · ${M.length}개 · 약 ${mfmt(M.reduce((a,x)=>a+(x.min||0),0))}<small>${esc([...by].map(([k,n])=>`${k} ${n}개`).join(' · '))}</small></span></summary><div class="plan">${M.map(mrow).join('')}</div></details>`;}
function freedHTML(V){const F=V.freed||[];if(!F.length)return'';
  return`<details class="d pf"${foldAt('freed')}><summary>놓아준 것 · ${F.length}개</summary><div class="plan">${F.map(x=>`<div class="prow moved"><span class="pb"><span class="pt">${esc(x.k==='rev'?`세트 복습 ${dlab(x.d)} ${x.step}일 차`:x.label)}</span></span></div>`).join('')}</div><p class="note">${FREED_NOTE}</p></details>`;}
/* 시간이 되면(권장·여유, 세트 복습은 한 줄로). 오늘 몫을 다 하면 열리고 "미리 하기"(이번 주에 남은 필수) 2개까지가 먼저. 펼칠 줄은 여기서도 하나 */
function foldItems(V){const out=(V.ahead||[]).map(x=>({x,xs:[x],ahead:1}));
  (V.fold||[]).forEach(x=>{if(x.k==='rev'){const g=out.find(i=>i.rev&&!i.ahead);if(g)return g.xs.push(x);return out.push({x,xs:[x],rev:1});}out.push({x,xs:[x]});});return out;}
/* 시간이 되면 줄을 오늘 몫 줄처럼(펼친 줄의 버튼·이어서가 쓴다) */
const foldIt=fi=>({rows:fi.xs.map(q=>({id:q.id,task:q,done:false})),g:fi.xs.length>1?'rev':null});
/* 시간이 되면에서 오늘 손으로 친 일(교재·서브노트 등): 끝낸 줄로 남겨 다시 누르면 되돌린다 */
function foldDone(V){const t=V.t,tk=S.tk||{};return taskList(t).filter(x=>x.done&&isManual(x)&&(x.fold||x.need!=='필수')&&tk[x.id]===t&&!V.rows.some(r=>r.id===x.id));}
function foldRowHTML(fi,c){const xs=fi.xs,x=fi.x,g=xs.length>1,ids=xs.map(q=>q.id).join(' '),now=!!(c.act&&c.act.fold&&xs.some(q=>q.id===c.act.id)),man=!g&&isManual(x)&&!(x.ex&&x.ex.to);
  const o=g?{t:`${c.revIn?'세트 복습 나머지':'세트 복습'} ${xs.length}개`,sub:revDates(xs)}:rowTxt(x),min=xs.reduce((a,q)=>a+(q.min||0),0),tag=fi.ahead?'미리 하기 · 일요일까지':o.tag||(x.need==='여유'?'여유':'권장');
  const sat=parse(todayStr()).getDay()===6&&x.k==='rev'&&x.step>=7,meta=esc([o.sub,mfmt(min),sat?'일요일에 해도 돼요':''].filter(Boolean).join(' · '));
  const tx=`<span class="pt">${esc(o.t)}<span class="tag">${esc(tag)}</span></span><span class="pm">${meta}</span>`;
  if(now){const[gl,a]=goOf(foldIt(fi),c.src);
    return`<div class="prow now nonum" data-task="${esc(x.id)}"><div class="pb">${tx}<button class="btn" data-act="${a}" data-id="${esc(a==='task'?xs[0].id:x.id)}" data-ids="${esc(ids)}">${esc(gl)}</button></div></div>`;}
  if(man)return`<button class="prow" data-act="tk" data-id="${esc(x.id)}" data-task="${esc(x.id)}"><span class="pb">${tx}</span><span class="tkc"></span></button>`;
  if(!g&&isManual(x))return`<div class="prow two" data-task="${esc(x.id)}"><button class="pbody" data-act="task" data-id="${esc(x.id)}"><span class="pb">${tx}</span></button><button class="tkc" data-act="tk" data-id="${esc(x.id)}" aria-label="다 했어요"></button></div>`;
  return`<button class="prow" data-act="task" data-id="${esc(xs[0].id)}" data-ids="${esc(ids)}" data-task="${esc(x.id)}"><span class="pb">${tx}</span></button>`;}
function foldHTML(F,c,open,FD){FD=FD||[];if(!F.length&&!FD.length)return'';const H=F.map(fi=>foldRowHTML(fi,c)),ai=F.findIndex(fi=>c.act&&c.act.fold&&fi.xs.some(q=>q.id===c.act.id));
  const tt=F.map(fi=>fi.xs.length>1?`${c.revIn?'세트 복습 나머지':'세트 복습'} ${fi.xs.length}개`:rowTxt(fi.x).t),pv=!F.length?FD.map(x=>'✓ '+rowTxt(x).t).join(' · '):F.length>1?tt.slice(0,2).join(' → ')+(F.length>2?' → …':''):`${tt[0]} · 약 ${mfmt(F[0].xs.reduce((a,q)=>a+(q.min||0),0))}`;
  const D=FD.map(x=>`<button class="prow done" data-act="tk" data-id="${esc(x.id)}" data-task="${esc(x.id)}"><span class="pb"><span class="pt">${esc(rowTxt(x).t)}</span></span><span class="tkc on"></span></button>`).join('');
  return`<details class="d pf"${foldAt('fold',open||ai>=0)}><summary><span class="fs">시간이 되면${F.length?` · ${F.length}개`:''}${FD.length?` · ${FD.length}개 했어요`:''}<small>${esc(pv)}</small></span></summary><div class="plan">${H.slice(0,6).join('')}${H.length>6?`<details class="pmore"${foldAt('fmore',ai>=6)}><summary>더 보기 ${H.length-6}개</summary>${H.slice(6).join('')}</details>`:''}${D}</div></details>`;}
/* 달력의 할 일 한 줄 "오늘 몫 7/11"(고정한 날, 끝낸 수가 바뀔 때만 적는다) */
function planCal(t,V,its,nd){if(!V.frozen)return;const c=S.cal[t],cur=c&&c.x&&c.x['plan:'+t],txt=`오늘 몫 ${nd}/${its.length}`;
  if(nd&&(!cur||cur[1]!==txt)){calDay().x['plan:'+t]=['todo',txt];save(1);}else if(!nd&&cur){delete c.x['plan:'+t];save(1);}}
function vToday(){const t=todayStr(),V=planToday(t),w=wkIdx(t),de=Math.max(0,diffDays(t,S.settings.exam)),kind=dayKind(t),sun=kind==='sun',post=t>PLAN.target.d,oop=w<0||t>addDays(PLAN.target.d,2);   /* 오늘 몫을 먼저(기다리던 시험 일정이 오늘 들어가면 D-day도 새 일정으로) */
  const b=V.wb,its=planItems(V),act=V.active,ai=act&&!act.fold?its.find(i=>i.ids.includes(act.id))||null:null,src=resumeSrc(t),nd=its.filter(i=>i.done).length,all=its.length>0&&nd===its.length;
  const c={V,ai,act,src,its,revIn:its.some(i=>i.rows.some(r=>/^rev:/.test(r.id)))},F=foldItems(V),FD=foldDone(V),norows=!its.length&&!act;
  /* 머리: 시험 날은 "오늘 제141회 시험(실전 응시)", 공휴일은 날짜 뒤에 이름("12월 25일 금요일 · 성탄절"). 단계 이름이 주차와 같으면 한 번만, 본시험 뒤 D-day 자리는 "시험 후" */
  const ex=kind==='exam'?[PLAN.mock,PLAN.target].find(x=>x&&x.d===t):null,hol=KR_HOLI[t],mn=monNotice(t),ph=V.info.find(x=>x.k==='phase');
  const NT=S.settings.nextTarget,sub=esc(ex?korDate(t,true)+' · '+weekLabel(w):w<0||post?weekLabel(w):uniq([weekLabel(w),sun?'주간 마감일':phaseObj(w).n]).join(' · '))+(NT?` · <span class="nw">${esc(`${md(NT.from)}부터 제${nextR(NT)}회`)}</span>`:'');   /* 바꾸기를 기다리는 시험 일정(접수한 목표 시험 뒤 기다릴 때도, 한 덩이로) */
  const top=`<div class="ltitle today"><div class="ltl">${calIconHTML()}<div><h1>${esc(ex?`오늘 제${ex.r}회 시험${ex===PLAN.mock?'(실전 응시)':''}`:korDate(t,true))}${!ex&&hol?`<span class="hol"><span class="vh"> · </span>${esc(hol)}</span>`:''}</h1><p class="lsub">${sub}</p></div></div><div class="dday"><span>제${PLAN.target.r}회${post?'':'까지'}</span><b class="num">${post?'시험 후':'D-'+de}</b></div></div>
  ${V.rows.filter(r=>r.blk==='pin').map(pinHTML).join('')}${mn?monNoticeHTML(mn,ph):ph?noticeHTML(ph):''}`;
  if(oop)return top+norowsHTML(V,t);   /* 준비 시작 전·본시험 뒤(복기 이틀 뒤부터): 머리와 카드 하나뿐(오늘 시간·다시 짜기 없음) */
  if(ex||post)return top+resumeRowHTML(src,null)+(ex?examHTML(t):norowsHTML(V,t))+weekSecHTML(V,b,t,c);   /* 시험 날·본시험 뒤 복기 날: 블록·오늘 시간·다시 짜기 없이 시험 카드(또는 카드 하나)와 이번 주 체크. 하다 만 흐름은 이어서 줄로 */
  planCal(t,V,its,nd);
  /* 쉬는 날: 상태 줄 "오늘은 쉬는 날", 쉬는 날 카드(옮긴 곳 · 파란 버튼 "다시 공부할래요"), 옮긴 것·시간이 되면(접힘), 이번 주. 블록·넘침 줄·다시 짜기는 없다 */
  if(V.off)return`${top}
  ${resumeRowHTML(src,null)}
  <div class="daysum"><span><b>오늘은 쉬는 날</b></span><button class="capb" data-act="cap">오늘 시간 · 쉬어요<i class="cv"></i></button></div>
  ${offCardHTML(t)}${movedHTML(V)}${foldHTML(F,c,false,FD)}${weekSecHTML(V,b,t,c)}`;
  const fa=act&&act.fold?F.find(fi=>fi.xs.some(q=>q.id===act.id)):null;   /* 펼친 줄이 시간이 되면에 있으면 이어서 줄은 그 줄의 일인지로 */
  /* 상태 줄의 분에는 맨 위 핀(48시간 복기·원서접수·준비물)도 든다(그 분도 오늘 시간에서 쓴다) */
  const pins=V.rows.filter(r=>r.blk==='pin'),pinM=pins.reduce((a,r)=>a+r.m,0),pinL=pins.reduce((a,r)=>a+(r.done?0:r.left),0),pinN=uniq(pins.map(r=>({recap:'복기',apply:'원서접수',kit:'준비물'})[(r.task||{}).k]).filter(Boolean)).join('·');
  const left=its.filter(i=>!i.done),lm=left.reduce((a,i)=>a+i.left,0)+pinL,pm=its.reduce((a,i)=>a+i.rows.reduce((s,r)=>s+r.m,0),0)+pinM,inc=n=>n&&pinN?` <span class="nw">(${esc(pinN)} ${mfmt(n)} 포함)</span>`:'';
  const st=!its.length?'<b>오늘 몫 0개</b>':!nd?`<b>오늘 몫 ${its.length}개</b> · <span class="nw">약 ${mfmt(pm)}</span>${inc(pinM)}`:all?`<b>오늘 몫 ${its.length}개 끝</b>`:`<b>남은 ${left.length}개</b> · <span class="nw">약 ${mfmt(lm)}</span>${inc(pinL)}`;
  /* 남은 몫이 남은 시간보다 많을 때만 "오늘 시간 줄이기": 늘 넣는 줄(최소 몫·날짜 일·그날 모의)만 남았으면 줄여도 같으므로 띄우지 않는다 */
  const minL=V.rows.filter(r=>!r.done&&r.task&&(r.task.always||r.blk==='pin')).reduce((a,r)=>a+r.left,0),over=V.frozen&&!all&&lm>Math.max(V.capLeft,minL);
  /* 평일: 시각이 지난 블록의 남은 줄은 지금 블록 맨 위로 옮겨 보인다 */
  const mv=uniq(planOrder(V).filter(r=>r.blk!=='pin'&&r.vb!==r.blk&&!r.done).map(r=>BLK_S[r.blk]).filter(Boolean)),cb=BLK_S[V.curBlk];
  const bs=[];its.forEach(it=>{let g=bs[bs.length-1];if(!g||g.vb!==it.vb){g={vb:it.vb,its:[]};bs.push(g);}g.its.push(it);});
  const blocks=bs.map((g,i)=>blockHTML(g.vb,g.its,c)+(kind==='sat'&&g.vb==='p1'&&bs[i+1]&&bs[i+1].vb==='p2'?'<p class="brk">쉬는 시간 · 답안 사진 찍기</p>':'')).join('');
  return`${top}
  ${resumeRowHTML(src,ai||(fa?foldIt(fa):null))}
  <div class="daysum"><span>${st}</span><button class="capb" data-act="cap">오늘 시간 ${mfmt(V.capLeft)}<i class="cv"></i></button></div>
  ${V.frozen&&V.user?(x=>x?`<p class="dsx">줄인 만큼 다른 날로: ${nwTxt(x)}</p>`:'')(reducedTxt(t)):''}${over?`<p class="dsx">남은 몫 <span class="nw">약 ${mfmt(lm)}</span> · 남은 시간 <span class="nw">약 ${mfmt(V.capLeft)}</span> <button class="lnk" data-act="cap">오늘 시간 줄이기</button></p>`:''}${V.lv===3?`<p class="dsx">${LV_TXT[3]}</p>`:''}${V.notes.day?`<p class="dsx">${esc(V.notes.day)}</p>`:''}
  ${syncBad()&&!syncing&&!V.info.some(x=>x.k==='wait')&&!(norows&&!Object.keys(SETS.sets).length)?`<p class="syncfail">받아 오지 못했어요 — 인터넷 연결을 확인하세요${syncBtn('btn ghost sm',1)}</p>`:''}
  ${norows?norowsHTML(V,t):V.info.filter(x=>x.k==='wait'||x.k==='note').map(infoHTML).join('')}${all?doneHTML(V,b,t,act):''}
  ${mv.length&&cb?`<p class="dsx">${esc(mv.join('·'))} 몫을 ${esc(cb)}${jo(cb,['으로','로'])} 옮겼어요</p>`:''}${blocks}
  ${movedHTML(V)}${freedHTML(V)}${foldHTML(F,c,all||!its.length,FD)}${weekSecHTML(V,b,t,c)}
  <div class="btns rp"><button class="btn ghost sm" data-act="plan-reset">오늘 몫 다시 짜기</button></div>`;}
/* 오늘 시간: 지금부터 쓸 수 있는 시간을 고르면 오늘 몫을 다시 짠다(그날만, 이번 주 단계와 줄인 목표는 그대로).
   "오늘은 쉬어요"는 그날 공부 시간을 0으로 정한다(S.days, 이번 주 공부 시간·단계가 함께 바뀜). 누르기 전에 쉬면 어디로 가는지 미리 보여 준다(앞날 계산, 읽기만) */
function capView(t){const F=S.today&&S.today.d===t?S.today:null,now=nowMin();return F?planView(t,null,F,now):planView(t,dayPlan(t,{now}),null,now);}   /* 고정하지 않고(창은 기록을 쓰지 않는다) */
function capSheet(){const t=todayStr(),F=S.today&&S.today.d===t?S.today:null,u=F&&F.user||0,dm=F?planDoneMin(F):0,lt=Math.max(0,DAY_END-nowMin()),nm=Math.max(0,Math.min(budgetOf(t,null,true)-dm,lt)),off=dayOff(t),V=capView(t);
  const sh=!off&&!!(S.days&&S.days[t]&&S.days[t].m>0);   /* 짧은 날로 정한 오늘: "평소대로"를 켜 두지 않는다(상태 줄의 오늘 시간이 그 시간) */
  let fc='';
  if(off)fc='<p class="ds fore">오늘은 쉬는 날이에요. 시간을 고르면 다시 공부하는 날이 돼요.</p>';
  else if(parse(t).getDay()===0){const B=weekBoard(t).B;if(B)fc=`<p class="ds fore">오늘 쉬면 → 이번 주 남은 필수 약 ${mfmt(B)}${jo(mfmt(B),['은','는'])} 다음 주로 놓아줘요</p>`;}
  else{const od=offDelta(t,t,0);if(od)fc=foreHTML('오늘 쉬면',od,t);}
  const only=off?'':todayOnlyTxt(V),pins=V.rows.filter(r=>r.blk==='pin'&&!r.done),kit=pins.some(r=>(r.task||{}).k==='kit');
  return`<p class="sheet-k">오늘 시간</p><h3 class="cmh">오늘 남은 시간</h3><p class="ds">지금부터 쓸 수 있는 시간을 고르면 오늘 몫을 다시 짜요.</p>
  <div class="seg capseg">${[[30,'30분 · 최소 몫'],[60,'1시간'],[90,'1시간 30분'],[0,'평소대로 · '+mfmt(nm)]].map(([m,l])=>`<button class="${u===m&&!off&&!sh?'on':''}" data-act="cap-set" data-m="${m}">${l}</button>`).join('')}</div>
  <div class="seg capseg off"><button class="${off?'on':''}" data-act="cap-off">오늘은 쉬어요</button></div>${fc}
  ${only?`<p class="note">${esc(only)}</p>`:''}${pins.length?`<p class="note">날짜가 정해진 일(${kit?'준비물':'원서접수·복기'})은 쉬는 날에도 남아요</p>`:''}
  ${off?'':'<p class="note">최소 몫(용어 읽기 · 세트 퀴즈 · 단답 1문 · 자기 전 5분)은 늘 남아요.</p>'}
  <div class="btns"><button class="btn sec" data-act="sheet-close">닫기</button></div>`;}
/* 이번 주 날마다의 앞날(오늘 뒤, 시험 날 빼고) 공부 시간: 쉬어요 · 짧은 날 · 평소대로. 고르면 S.days에 두고 이번 주 공부 시간·단계를 다시 센다. 누르기 전에 그날 쉬면 어디로 가는지 */
function daySheet(d){const t=todayStr(),k=dayKind(d),raw=budgetOf(d,null,true),cur=(S.days||{})[d],cm=cur?cur.m:raw,od=offDelta(t,d,0);
  const opts=[[0,'쉬어요']].concat((k==='sat'||k==='sun'||k==='holi'?[[120,'2시간'],[180,'3시간']]:[[60,'1시간'],[120,'2시간']]).filter(([m])=>m<raw),[[raw,'평소대로 · '+mfmt(raw)]]);
  return`<p class="sheet-k">이번 주 날마다</p><h3 class="cmh">${esc(dlab(d))} 공부 시간</h3><p class="ds">이날 쓸 수 있는 시간을 고르면 이번 주 계산에 바로 넣어요.</p>
  <div class="seg capseg">${opts.map(([m,l])=>`<button class="${cm===m?'on':''}" data-act="day-set" data-d="${d}" data-m="${m}">${l}</button>`).join('')}</div>
  ${od?foreHTML('이날 쉬면',od,d):''}
  <p class="note">출장·야근처럼 미리 아는 날은 설정에서 한꺼번에 정해요.</p>
  <div class="btns"><button class="btn sec" data-act="sheet-close">닫기</button></div>`;}

/* ── 이번 주(오늘 화면 아래와 #week): 월~일 띠, 남은 필수 / 이번 주 공부 시간, 다 하면 n%, 약속 줄과 "다음 하나" ── */
/* 그날 표시: done 끝(평일 핵심, 토요일 모의 모든 교시 + 채점, 일요일 리포트) · half 반쯤 · open 안 함 · fut 앞날 · none 그날 세트 없음. 지난날도 빨강 없이 ○ */
function dayGlyph(d,t){const g=dayGlyph0(d,t);return g!=='done'&&dayOff(d)?'off':g;}   /* 쉬는 날로 정한 날(끝내지 않았으면): 점선 동그라미 */
function dayGlyph0(d,t){if(d>t)return'fut';if(d<S.settings.start)return'none';   /* 첫 주의 시작 전 날 */const dw=parse(d).getDay(),W=wkStart(d),tk=S.tk||{};let a=0,n=0;
  if(dayKind(d)==='exam'){n=1;a=tk['ex:'+d+':a']?1:0;}
  else if(dw===6){const D=weekMock(d);if(D){const pr=S.mockp[D]||{},ps=mockParts(SETS.mocks[D]),g=D>=MOCK_GRADE_SINCE&&ps.length>0;n=ps.length+(g?1:0);a=ps.filter(k=>pr[k]).length+(g&&pr.g?1:0);}}   /* 문제가 없는 모의는 채점도 없다 */
  else if(dw===0){n=1;a=tk['report:'+W]?1:0;}
  else{const c=setCore(d);if(c){n=2;a=(c.st.read>=c.st.nc?1:0)+(c.st.qa>=c.st.nq?1:0);if(!a&&(c.st.read||c.st.qa))a=.5;}}
  return!n?(d===t?'open':'none'):a>=n?'done':a>0?'half':'open';}
function weekStripHTML(t,b){let h='';for(let i=0;i<7;i++){const d=addDays(b.W,i),g=dayGlyph(d,t),td=d===t?' today':'';h+=`<span class="wkd${td}"><b>${DAYK[parse(d).getDay()]}</b><i class="wg ${g}${td}"></i></span>`;}return`<div class="wkstrip" aria-label="이번 주 날마다">${h}</div>`;}
/* 이번 주 줄: k, 이름(lab)·짧은 글(txt), a/b, 남은 분, 다음 하나(next), 끝. 날짜 일(원서접수·48시간 복기 핀, 원서접수 날짜 확인·시행계획 공고)과 지난주 모의고사가 맨 앞.
   핀(pin)은 오늘 화면 맨 위 핀과 같은 일이고 이번 주 탭 배지가 세는 일이라, 이 탭에서도 동그라미로 "접수했어요"·"다 했어요"를 친다(tk) */
/* 이번 주 모의고사를 기다리는 글(오늘 안내 줄·이번 주 줄·날마다·알림이 같은 시각 규칙): 토요일 06:21 전 "토 06:21에 와요",
   06:21~9시 "만드는 중 · 보통 30분 안에 와요", 9시가 지나면(일요일 포함) "이번 주 모의고사가 아직 없어요" */
function mockWait(t){const dw=parse(t).getDay(),m=nowMin();if(dw===0||dw===6&&m>=9*60)return'이번 주 모의고사가 아직 없어요';if(dw===6&&m>=6*60+21)return'만드는 중 · 보통 30분 안에 와요';return'토 06:21에 와요';}
function handNext(q,t,lt){const W=wkFrom(wkStart(t)),pk=QK[q]&&QK[q][3];if(!pk)return null;return Object.keys(SETS.sets).filter(d=>d>=W&&(lt?d<t:d<=t)).sort().find(d=>{const p=hwParts(d)[pk];return p&&p.n&&p.k<p.n;})||null;}
function wkLines(V,b,t){const out=[],sun=parse(t).getDay()===0,off=dayOff(t);   /* 쉬는 날: 핵심·손글씨의 "다음 하나"는 지난 세트만(오늘 세트를 이름 대지 않음, 점수 카드의 파란 버튼과 같은 규칙) */
  taskList(t).filter(x=>x.blk==='pin').forEach(x=>{const[h,...r]=x.label.split(': ');   /* "제141회 복기: 문제 모두 적기 → …" → 이름 "제141회 복기", 나머지는 아래 줄 */
    out.push({k:x.k,id:x.id,p0:1,pin:1,lab:h,txt:x.label,min:x.min,next:[r.join(': '),x.sub,x.done?'':x.roll].filter(Boolean).join(' · '),a:x.done?1:0,b:1,done:!!x.done});});
  /* 원서접수 날짜 확인·시행계획 공고 확인: 줄은 시험 일정으로, 동그라미는 확인했어요(친 주에는 ✓로 아래에) */
  taskList(t).filter(x=>x.k==='applychk'||x.k==='notice').forEach(x=>out.push({k:x.k,id:x.id,p0:1,tick:1,lab:x.label,txt:x.label,min:x.min,next:x.done?'':'시험 일정에서 확인',a:x.done?1:0,b:1,done:!!x.done}));
  const cm=(V.fold||[]).find(x=>x.k==='carry.mock');if(cm)out.push({k:'carry.mock',d:cm.d,xt:1,lab:`지난주 모의고사(${md(cm.d)})`,txt:'지난주 모의고사 · 토요일 새 모의 전까지',min:cm.min,next:'토요일 새 모의 전까지',a:0,b:1,done:false});
  b.lines.forEach(l=>{if(!l.b&&!l.B&&l.k!=='close')return;const o={k:l.k,a:l.a,b:l.b,min:l.B,done:l.b>0&&l.a>=l.b};
    if(l.k==='mock'){const s=l.est?mockWait(t):l.ps.map(([k,v])=>MKP[k]+' '+(v?'✓':'○')).join(' ')+(l.D>=MOCK_GRADE_SINCE?' 채점 '+(l.g?'✓':'○'):'');
      Object.assign(o,{lab:'주간 모의고사 + 채점',next:s,D:l.D||null,txt:l.est?`주간 모의고사(토) · 약 ${mfmt(l.B)} · ${s}`:`주간 모의고사 ${l.a}/${l.b} · ${s}`});}
    else if(l.k==='core'){const gs=l.gaps||[],g=off?gs.find(d=>d<t):gs[0],cc=g&&setCore(g);o.lab='세트 핵심(용어 읽기·세트 퀴즈)';o.next=g?`다음 하나: ${dlab(g)} ${cc.r?'용어':'퀴즈'}`:o.done||gs.length?'':'남은 세트는 그날 06:21에 와요';o.txt=`세트 핵심 ${l.a}/${l.b}${g?' · '+o.next:''}`;}
    else if(l.k==='rev'){o.done=!l.dueNow&&!l.fut;const u=l.dueNow?`남은 ${l.dueNow}개${l.fut?`(+일요일까지 ${l.fut})`:''}`:`일요일까지 ${l.fut}개`;o.lab=o.done?'세트 복습(이번 주에 돌아오는 것)':'세트 복습 · '+u;
      if(!o.done)o.labH=o.txtH=`세트 복습 · <span class="nw">${esc(u)}</span>`;const x=revCands(t)[0];o.next=x?`다음 하나: ${dlab(x.d)} ${x.step}일 차`:'';o.txt=o.done?`세트 복습 ✓ ${l.a}/${l.b}`:o.lab;}
    else if(l.k==='close'){const so=dayOff(b.E);o.lab=l.label;o.next=o.done?'':sun||so&&parse(t).getDay()===6?'오늘 밤까지':so?'토요일에 복사해요':'일요일에 복사해요';o.txt=`${l.label} ${l.a}/${l.b}`;}   /* 일요일을 쉬는 날로 정한 주는 토요일 */
    else{const d=l.k==='rot'||o.done?null:handNext(l.k,t,off);   /* 다 채운 줄(✓)은 "다음 하나"를 주지 않는다(목표 넘어 숙제를 열지 않음) */
      Object.assign(o,{hand:1,short:QSHORT[l.k]||l.label,lab:l.label+(l.cut?' (줄인 목표)':''),next:l.k==='rot'?`오늘 ${((S.daily[t]||{}).graded||0)}/50장`:o.done?'':l.k==='redo'?'지난 모의 틀린 문제':d?`다음 하나: ${dlab(d)} 세트`:'',txt:`${l.label} ${l.a}/${l.b}`});}
    out.push(o);});
  return out;}
/* 약속 줄 하나: 오늘 화면은 한 줄 글(c), 이번 주 화면은 이름·a/b·막대·남은 분·다음 하나. 날짜 일 핀은 줄 전체가 동그라미(누르면 침, 다시 누르면 되돌림) */
function qlineHTML(l,compact){const at=` data-act="week-next" data-k="${esc(l.k)}"`;
  if(l.tick&&!compact)return`<div class="qline two${l.done?' done':''}" id="ql-${esc(l.k)}"><button class="qbody"${at}><span class="ql1"><span class="qn">${esc(l.lab)}</span><span class="chev"></span></span>${l.next?`<span class="qx">${esc(l.next)}</span>`:''}</button><button class="tkc${l.done?' on':''}" data-act="tk" data-id="${esc(l.id)}" aria-label="확인했어요" aria-pressed="${l.done}"></button></div>`;
  if(l.pin)return`<button class="qline tkl${l.done?' done':''}" id="ql-${esc(l.k)}" data-act="tk" data-id="${esc(l.id)}" aria-pressed="${l.done}"><span class="ql1"><span class="qn">${esc(l.lab)}</span><span class="qm">${l.done?(l.k==='apply'?'접수했어요':'다 했어요'):mfmt(l.min)}</span><span class="tkc${l.done?' on':''}"></span></span>${l.next?`<span class="qx">${esc(l.next)}</span>`:''}</button>`;
  if(compact)return`<button class="qline c${l.done?' done':''}"${at}><span class="qt">${l.txtH||esc(l.txt)}</span><span class="chev"></span></button>`;
  const ab=l.k!=='rev'&&!l.p0&&!l.xt,pc=l.b?Math.round(Math.min(1,l.a/l.b)*100):0,inert=l.hand&&l.done,tg=inert?'div':'button';   /* 다 채운 손글씨 줄은 누를 곳이 없다 */
  return`<${tg} class="qline${l.done?' done':''}" id="ql-${esc(l.k)}"${inert?'':at}><span class="ql1"><span class="qn">${l.done?'✓ ':''}${l.labH||esc(l.lab)}</span>${ab?`<span class="qa">${l.a}/${l.b}</span>`:''}<span class="qm">${l.done?'':mfmt(l.min)}</span>${inert?'':'<span class="chev"></span>'}</span>${ab?`<span class="qbar${l.done?' ok':''}"><i style="width:${pc}%"></i></span>`:''}${l.next?`<span class="qx">${esc(l.next)}</span>`:''}</${tg}>`;}
/* 이번 주 머리 한 줄: 남은 필수 / 이번 주 공부 시간(C: 시계·"오늘 시간"과 무관하게 남은 날의 공부 시간, 오늘의 "남은 시간"과 다른 수), 단계 문장은 오늘 고정한 단계(V.lv: 일하는 동안 오르지 않음).
   일요일에 오늘 몫을 다 했으면 단계 문장 대신 "이번 주 필수를 다 했어요" 또는 "남은 필수 약 n분은 다음 주로 놓아줘요" */
function wkTop(b,V){const lv=V&&V.lv!=null?V.lv:b.lv,dw=parse(b.t).getDay(),fin=(dw===0||dw===6&&dayOff(b.E))&&!!V&&V.rows.length>0&&V.rows.every(r=>r.done);   /* 일요일을 쉬는 날로 정한 토요일도 주의 끝 */
  if(fin)return{top:b.B?`남은 필수 <span class="nw">약 ${mfmt(b.B)}</span>${jo(mfmt(b.B),['은','는'])} 다음 주로 놓아줘요`:'이번 주 필수를 다 했어요',lv:0};
  return{top:b.B?`남은 필수 <span class="nw">약 ${mfmt(b.B)}</span> / 이번 주 공부 시간 <span class="nw">${mfmt(b.C)}</span>`:'이번 주 필수를 다 했어요',lv};}
const chkTxt=b=>(b.check||[]).map(([n,v])=>`<span class="nw">${n} ${v?'✓':'○'}</span>`).join(' · ');   /* "준비물 ○"이 줄 끝에서 갈라지지 않게 */
function wkStatHTML(b,V){const{top,lv}=wkTop(b,V);
  return`<p class="wkline">${top}${lv?` <span class="lvc l${lv}">${LV_TXT[lv]}</span>`:''}</p><p class="wkline">${b.pct==null?`시험 주 · 점수 대신 체크${b.check?': '+chkTxt(b):''}`:`<b>다 하면 ${b.reach}%</b> · 지금 ${b.pct}%`}</p>`;}
/* 오늘 화면의 이번 주: 띠, 남은 필수 / 이번 주 공부 시간, 다 하면 · 지금, 줄 5개까지(날짜 일 → 지난주 모의 → 모의 → 핵심 → 손글씨 한 줄 → 세트 복습, 리포트는 토·일만).
   원서접수·복기 핀은 오늘 화면 맨 위에 이미 있으므로 여기서는 뺀다 */
function weekSecHTML(V,b,t){if(b.w<0||t>PLAN.target.d&&b.W>PLAN.target.d)return'';const dw=parse(t).getDay(),L=wkLines(V,b,t),f=k=>L.find(l=>l.k===k),Q=L.filter(l=>l.p0&&!l.pin&&!l.done);
  const head=`<button class="sec-h wkh" data-act="go" data-h="week" aria-label="이번 주 전체 보기"><b class="h2">이번 주 · ${md(b.W)}~${md(b.E)}</b><span class="meta">${dw===0?'오늘 밤까지':'일요일까지 '+diffDays(t,b.E)+'일'}<span class="chev"></span></span></button>`;
  if(V.kind==='exam'||t>PLAN.target.d)return`<section class="sec wksec">${head}${weekStripHTML(t,b)}<p class="wkline">시험 주 · 점수 대신 체크${b.check?': '+chkTxt(b):''}</p></section>`;   /* 시험 날·시험 뒤: 남은 필수 수 없이 체크만(응시 · 48시간 복기 · 준비물) */
  ['carry.mock','mock','core'].forEach(k=>{if(f(k))Q.push(f(k));});const H=L.filter(l=>l.hand);
  if(H.length){const h0=H.find(l=>!l.done)||H[0];Q.push({k:h0.k,txt:`손글씨${b.cut&&H.some(l=>/줄인 목표/.test(l.lab))?'(줄인 목표)':''} · `+H.map(l=>`${l.short} ${l.a}/${l.b}`).join(' · '),done:H.every(l=>l.done)});}
  if(f('rev'))Q.push(f('rev'));if(f('close')&&(dw===0||dw===6))Q.push(f('close'));
  /* 밀린 몫(건너뛴 날의 필수가 이번 주 다른 날로): 날짜만 한 줄, 누르면 이번 주(날마다에 분). 이 줄이 있으면 약속 줄은 4개까지(토요일의 주간 리포트 줄은 남기고 그 앞 줄을 뺀다) */
  const cx=catchLine(t),cl=f('close');let QS=Q.slice(0,5);if(cx&&Q.length>4)QS=Q.includes(cl)&&Q.indexOf(cl)>=4?Q.slice(0,3).concat([cl]):Q.slice(0,4);
  return`<section class="sec wksec">${head}
  ${weekStripHTML(t,b)}${wkStatHTML(b,V)}${cx?`<button class="wkline catch" data-act="go" data-h="week">${esc(cx.line)}<span class="chev"></span></button>`:''}<div class="group qls">${QS.map(l=>qlineHTML(l,1)).join('')}</div></section>`;}
/* 이번 주 줄의 "다음 하나": 그 줄의 남은 첫 일 하는 곳으로(세트 핵심은 가장 오래된 빈 세트, 읽기 먼저 · 손글씨는 필수 칸이 빈 가장 오래된 세트의 숙제 · 세트 복습은 가장 오래된 것 · 모의는 모의 화면 · 리포트는 복사) */
function weekNext(k,D){const t=todayStr(),b=weekBoard(t),l=b.lines.find(x=>x.k===k);
  if(k==='scroll'){const el=document.getElementById(D&&D.to||'');if(el)el.scrollIntoView({block:'center'});return;}
  if(k==='applychk'||k==='notice')return nav('schedule');
  if(k==='carry.mock'){const x=taskList(t).find(r=>r.k==='carry.mock');return x?nav('mock/'+x.d):render();}
  if(k==='mock'){const ws=mockWait(t);return l&&l.D?nav('mock/'+l.D):toast(/아직/.test(ws)?ws:'주간 모의고사 · '+ws);}
  if(k==='core'){const gs=l&&l.gaps||[],d=dayOff(t)&&gs.find(x=>x<t)||gs[0];if(!d)return toast('이번 주에 온 세트의 핵심은 다 했어요');SV[d]=setCore(d).r?'cards':'quiz';return nav('set/'+d);}
  if(k==='rev'){const x=revCands(t)[0];return x?startSetReview(x.d):toast('지금 할 세트 복습이 없어요');}
  if(k==='close')return reportCopy(b.W);
  if(k==='rot')return startRot(50);
  if(l&&l.hw&&l.b>0&&l.a>=l.b)return curH()==='week'?toast('이번 주 몫을 다 했어요'):nav('week');   /* 다 채운 손글씨 줄: 목표 넘어 숙제를 열지 않고 이번 주 목록으로 */
  if(k==='redo'){const m=Object.keys(SETS.mocks).filter(x=>/^\d{4}-/.test(x)&&x<=t).sort().pop();return m?nav('mock/'+m):toast('아직 받은 모의고사가 없어요');}
  const d=dayOff(t)&&handNext(k,t,1)||handNext(k,t);if(!d)return toast('이번 주에 온 세트의 필수 칸은 다 했어요');   /* 쉬는 날은 지난 세트 먼저(줄 글의 "다음 하나"와 같은 세트) */SV[d]=k==='essay'?'essay':'tasks';if(k!=='essay')SV.scrollTo='.hw.focus';nav('set/'+d);
  UI.hwf={d,k:{dd:'dd',eo:'eo',w:'write',fg:'fg',essay:'essay'}[k]||k};}   /* 그 세트 숙제에서 그 카드를 펼쳐 둔다(막대는 그 칸의 "다 했어요") */
/* 이번 주 줄의 "다음 하나"를 지금 할 수 있는지(점수 카드의 파란 버튼은 이런 줄만). weekNext가 알림만 띄우는 줄은 빼고 넘어간다:
   아직 오지 않은 모의, 지금 할 것 없이 일요일까지 돌아올 세트 복습만 남은 줄, 남은 세트가 아직 오지 않은 핵심·손글씨, 일요일 전의 주간 리포트(줄 글이 "일요일에 복사해요") */
function wkCan(l,b){const t=b.t,x=b.lines.find(y=>y.k===l.k)||{},dw=parse(t).getDay();
  if(l.k==='mock')return!!l.D;if(l.k==='rev')return revCands(t).length>0;if(l.k==='core')return!!(x.gaps&&x.gaps.length);if(l.k==='close')return dw===0||dw===6&&dayOff(b.E);
  if(l.k==='rot')return true;if(l.k==='redo')return Object.keys(SETS.mocks).some(m=>/^\d{4}-/.test(m)&&m<=t);return!!(l.hand&&handNext(l.k,t));}
/* 이번 주 탭(#week): 제목·주차 한 줄 → 점수 카드(하나뿐인 파란 버튼 = 오늘 펼친 줄) → 날마다 → 일요일까지 끝낼 것 → 넘어온 것·놓아준 것 → 이번 주 목표 → 다음 일정 → 기록 */
function scoreHTML(b,c,L){const W=wkTop(b,c.V),top=`<p class="sc1">${W.top}</p>${W.lv?`<p class="sc2">${LV_TXT[W.lv]}</p>`:''}`;
  let go;const it=c.ai,xa=c.exA;
  if(xa&&!xa.done)go=`<button class="btn" data-act="tk" data-id="${esc(xa.id)}">응시했어요</button>`;   /* 시험 날: 오늘 시험 카드와 같은 버튼 */
  else if(it){const o=itemTxt(it),x=it.rows[0].task||{},g=goOf(it,c.src),a=g[1]==='redo-tick'?'task':g[1],u=it.rows.filter(r=>!r.done).map(r=>r.id),nm=x.k==='mock'?'주간 모의고사 '+(MKP[x.pk]||''):o.t.split(' · ')[0].split(': ')[0];   /* 다시 쓰기는 여기서 치지 않고 지난 모의를 연다 */
    go=`<button class="btn" data-act="${a}" data-id="${esc(a==='task'?u[0]:it.rows[0].id)}" data-ids="${esc(u.join(' '))}">다음: ${esc(nm)} · ${minTxt(Object.assign({},o,{min:it.left}))}</button>`;}
  else if(c.act&&c.act.fold){const x=c.act.task||{},[,a]=c.fit?goOf(c.fit,c.src):[0,'task'],ids=c.fit?c.fit.rows.map(r=>r.id).join(' '):c.act.id;
    go=`<button class="btn" data-act="${a}" data-id="${esc(c.act.id)}" data-ids="${esc(ids)}">다음: ${esc(rowTxt(x).t.split(' · ')[0])} · ${mfmt(x.min)}</button>`;}
  else{const off=dayOff(b.t),rest=l=>!off||(l.k==='core'?((b.lines.find(y=>y.k==='core')||{}).gaps||[]).some(d=>d<b.t):!l.hand||handNext(l.k,b.t)!==b.t);   /* 쉬는 날: 오늘 세트로 가는 줄은 건너뛴다(지난 세트만) */
    const l=L.find(l=>!l.done&&!l.xt&&!l.pin&&!l.tick&&wkCan(l,b)&&rest(l)),nx=l&&/^다음 하나: /.test(l.next||'')?l.next.slice(7):'';go=l?`<button class="btn" data-act="week-next" data-k="${esc(l.k)}">다음: ${esc(l.hand?l.lab+(nx?' · '+nx:''):nx||l.lab)}</button>`:'<button class="btn" data-act="start-free">연습에서 자유 연습</button>';}
  if(b.chk)return`<div class="score">${top}<p class="sc3"><b>시험 주 · 점수 대신 체크</b></p><p class="sc4">${chkTxt(b)}</p>${go}</div>`;
  /* 마감(5점)은 리포트 0.6 + 이번 주 목표 0.4라 목표 수를 함께 적는다 */
  const cl=b.lines.find(l=>l.k==='close'),rp=rParts(b.parts.map(p=>p[1]),b.pct),pt=([k,v,m],i)=>`<span class="nw">${PART_N[k]} ${rp[i]}/${m}</span>${k==='close'&&cl&&cl.gn?` <span class="nw">· 이번 주 목표 ${cl.gd}/${cl.gn}</span>`:''}`;
  return`<div class="score">${top}<div class="sc3"><b class="num">다 하면 ${b.reach}%</b><span>지금 ${b.pct}%</span></div><div class="sbar${b.pct>=80?' ok':''}"><i style="width:${b.pct}%"></i><u style="left:60%"></u><u style="left:80%"></u></div>
  <p class="sc4">${b.parts.map(pt).join(SEP)}</p><p class="note">필수와 이번 주 목표만 세요 · <span class="nw">60%면 합격선,</span> <span class="nw">80%면 잘 지킨 주</span></p>${go}</div>`;}
/* 날마다: 그날 표시와 남은 곳(평일 → 세트, 토요일 → 모의고사, 일요일 → 리포트 줄로) */
function dayRowsHTML(t,b){let h='';const tk=S.tk||{};
  for(let i=0;i<7;i++){const d=addDays(b.W,i),dw=parse(d).getDay(),g=dayGlyph(d,t),lab=`${DAYK[dw]} ${md(d)}`;let tx='',at='';
    const dk=dayKind(d),ex=dk==='exam'?[PLAN.mock,PLAN.target].find(x=>x&&x.d===d):null;
    if(ex){tx=`제${ex.r}회 시험${ex===PLAN.mock?'(실전 응시)':''}${tk['ex:'+d+':a']?' · 응시 ✓':''}`;if(d===t)at='data-act="go" data-h="today"';}
    else if(dw===6){const D=weekMock(d),ps=D?mockParts(SETS.mocks[D]):[];if(D&&ps.length){const pr=S.mockp[D]||{};tx='주간 모의고사 · '+ps.map(k=>MKP[k]+' '+(pr[k]?'✓':'○')).join(' ')+(D>=MOCK_GRADE_SINCE?' 채점 '+(pr.g?'✓':'○'):'');at=`data-act="go" data-h="mock/${D}"`;}
      else tx=D?'이번 주는 모의고사가 없어요':d>t?'주간 모의고사 · 06:21에 와요':d===t&&!/아직/.test(mockWait(t))?'주간 모의고사 · '+mockWait(t).replace(/^토 /,''):'주간 모의고사가 아직 없어요';}
    else if(dw===0){tx='주간 마감 · 주간 리포트'+(tk['report:'+b.W]?' ✓':'');at='data-act="week-next" data-k="scroll" data-to="ql-close"';}
    else if(SETS.sets[d]){const c=setCore(d),rp=reqParts(d),rd=rp.filter(p=>p.done).length,hw=rp.length?`숙제 필수 ${rd}/${rp.length}`:'';
      tx=c.ok?['핵심 끝',hw].filter(Boolean).join(' · '):[c.r?`용어 ${c.st.read}/${c.st.nc}`:'',c.q?`퀴즈 ${c.st.qa}/${c.st.nq}`:'',c.st.read>=c.st.nc?hw:''].filter(Boolean).join(' · ');at=`data-act="go" data-h="set/${d}"`;}
    else tx=d>t?'06:21에 세트가 와요':d===t?'세트를 기다리는 중':'세트가 없었어요';
    if(d<S.settings.start){tx='준비 시작 전';at='';}   /* 첫 주의 시작 전 날: 그날 세트·모의는 이번 주 몫이 아니다 */
    if(dk==='pre3')tx='시험 전 3일 · '+tx;if(KR_HOLI[d]&&!ex)tx=KR_HOLI[d]+' · '+tx;
    /* 쉬는 날·짧은 날로 정한 날은 앞에 표시, 오늘 뒤의 날(시험 날 빼고)은 누르면 그날 공부 시간 창 */
    const sd=(S.days||{})[d];if(sd&&!ex)tx=(sd.m===0?'쉬는 날 · ':`짧은 날 ${mfmt(sd.m)} · `)+tx;if(d>t&&!ex)at=`data-act="day-cap" data-d="${d}"`;
    const inner=`<span class="dl">${lab}</span><i class="wg ${g}${d===t?' today':''}"></i><span class="dt">${esc(tx)}</span>${d===t?'<span class="dy">오늘</span>':''}${at?'<span class="chev"></span>':''}`;
    h+=at?`<button class="drow" ${at}>${inner}</button>`:`<div class="drow">${inner}</div>`;}
  return h;}
function vWeek(){const t=todayStr(),V=planToday(t),b=V.wb,w=wkIdx(t),its=planItems(V),act=V.active,ai=act&&!act.fold?its.find(i=>i.ids.includes(act.id))||null:null,fa=act&&act.fold?foldItems(V).find(fi=>fi.xs.some(q=>q.id===act.id)):null,c={V,ai,act,fit:fa?foldIt(fa):null,src:resumeSrc(t),its},sun=parse(t).getDay()===0;
  if(V.kind==='exam'){c.exA=taskList(t).find(x=>x.k==='ex'&&/:a$/.test(x.id))||null;c.ai=c.act=c.fit=null;}   /* 시험 날: 파란 버튼은 오늘과 같은 "응시했어요" */
  const head=sub=>`<div class="ltitle"><div><h1>이번 주</h1>${sub?`<p class="lsub">${sub}</p>`:''}</div></div>`;
  if(b.w<0||t>PLAN.target.d&&b.W>PLAN.target.d)return head('')+norowsHTML(V,t)+weekRecHTML();   /* 본시험이 든 주의 시험 뒤 날은 이번 주(체크·48시간 복기)를 그대로 */
  const L=wkLines(V,b,t),Ls=L.filter(l=>!l.done).concat(L.filter(l=>l.done)),wk=weekObj(Math.max(0,w)),tk=S.tk||{},gs=wk.goals||[],gd=gs.filter((_,i)=>tk['goal:'+b.W+':'+i]).length;
  const cs=(V.fold||[]).filter(x=>x.k==='carry.sets'),fr=V.freed||[],ms=milestones().find(m=>m.d>=t),sx=slipTxt(slipCheck(t));   /* sx: 시험 일정 살펴보기 줄(다음 일정 바로 위) */
  return head(`${esc(weekLabel(w))} · ${md(wkFrom(b.W))}~${md(b.E)} · ${esc(wk.t)} · ${sun?'오늘 밤까지':'일요일까지 '+diffDays(t,b.E)+'일'}`)+`
  ${scoreHTML(b,c,L)}
  ${sec('날마다','',`${(cx=>cx?`<p class="note wkc">${esc(cx.note)}</p>`:'')(catchLine(t))}<div class="group">${dayRowsHTML(t,b)}</div>${cuHTML(t)}`)}
  ${sec('일요일까지 끝낼 것',String(L.filter(l=>!l.p0&&!l.xt).length),`<div class="group">${Ls.map(l=>qlineHTML(l,0)).join('')}</div>`)}
  ${cs.length?sec('넘어온 것','',`<div class="group">${cs.map(x=>row({t:esc(x.label),d:esc(x.sub+' · 이번 일요일까지(권장)'),act:'task',data:{id:x.id}})).join('')}</div>`):''}
  ${fr.length?`<details class="d pf"${foldAt('wfreed')}><summary>놓아준 것 · ${fr.length}</summary><div class="plan">${fr.map(x=>`<div class="prow moved"><span class="pb"><span class="pt">${esc(x.k==='rev'?`세트 복습 ${dlab(x.d)} ${x.step}일 차`:x.label)}</span></span></div>`).join('')}</div><p class="note">${FREED_NOTE}</p></details>`:''}
  ${gs.length?`<details class="d pf" id="wkGoals"${foldAt('goals')}><summary>이번 주 목표 ${gd}/${gs.length} · 권장</summary><div class="plan">${gs.map((g,i)=>{const id='goal:'+b.W+':'+i,on=!!tk[id];return`<button class="prow g${on?' on':''}" data-act="tk" data-id="${esc(id)}"><span class="pb"><span class="pt">${esc(g)}</span></span><span class="tkc${on?' on':''}"></span></button>`;}).join('')}</div>${wk.out?`<p class="note">산출물: ${esc(wk.out)}</p>`:''}</details>`:''}
  ${sx||ms?`<div class="group" style="margin-top:12px">${sx?slipRow(sx):''}${ms?row({t:esc(`다음 일정 · ${ms.t.replace(/\(.*?\)/g,'').trim()} ${md(ms.d)}`)+` <span class="nw">(D-${diffDays(t,ms.d)})</span>`,act:'go',data:{h:'plan'}}):''}</div>`:''}
  ${weekRecHTML()}`;}
/* 이번 주 탭 맨 아래 기록(학습 달력 · 세트 보관함 · 통계·주간 리포트 · 로드맵). 통계는 여기서만 들어가므로 준비 시작 전·시험 뒤(할 몫 카드 하나뿐인 화면)에도 둔다 */
function weekRecHTML(){return sec('기록','',`<div class="group">${row({ic:'caldot',t:'학습 달력',act:'go',data:{h:'cal'}})}${row({ic:'box',tone:'gray',t:'세트 보관함',act:'go',data:{h:'archive'}})}${row({ic:'chart',tone:'gray',t:'통계·주간 리포트',act:'go',data:{h:'stats'}})}${row({ic:'cal',tone:'gray',t:'로드맵',act:'go',data:{h:'plan'}})}</div>`);}
/* 손으로 치는 일(교재·다시 쓰기·준비물·이번 주 목표·원서접수): 누르면 다 함, 다시 누르면 되돌림. 기록이 하나뿐인 날도 연속 학습으로 센다(touchDay) */
function tkToggle(id,lab){const t=todayStr(),tk=S.tk||(S.tk={});if(tk[id]){const d0=tk[id];delete tk[id];calUnmark('tk:'+id,d0);save();return render();}   /* 되돌리면 친 날의 달력 글을 지운다 */
  const g=/^goal:([\d-]+):(\d+)$/.exec(id),x=g?null:taskList(t).find(r=>r.id===id),ap=/^apply:(\d+)$/.exec(id),lb=g?'이번 주 목표: '+((weekObj(Math.max(0,wkIdx(g[1]))).goals||[])[Number(g[2])]||''):(x&&(x.cal||x.label))||lab||(ap?`큐넷 원서접수 · 제${ap[1]}회`:id);   /* 시험 일정에서 친 원서접수(이번 주 줄 밖)도 이름으로 */
  if(ap&&R.page==='schedule')toast(`제${ap[1]}회 원서접수를 적어 두었어요`);   /* 시험 일정에서 치면 칸이 접혀 사라지므로 알림으로 */
  return taskTick(id,lb);}
/* 주간 리포트 복사: 그 리포트가 다루는 주로 친다(토·일요일에 이번 주, 월요일 "지난주 리포트"는 지난주). 평일에 통계에서 복사하면 치지 않는다 */
function reportCopy(W){const t=todayStr(),W0=wkStart(t),dw=parse(t).getDay();W=W||W0;const tick=W!==W0||dw===0||dw===6;
  copy(weeklyReport(W),tick?'주간 리포트를 복사했어요. Claude 프로젝트에 붙여 넣으세요':'복사했어요. 토·일요일에 복사하면 이번 주 리포트로 쳐요');
  if(tick){S.tk=S.tk||{};S.tk['report:'+W]=t;touchDay();save();}return render();}

/* ════════ 세트 숙제: 그날 세트 내용과 학습 단계(PE_HW)로 정하는 암기·숙지 숙제(몇 번, 어떻게) ════════
   기록은 sp(날짜).hw = {키: 한 횟수, mn: 앞글자 글}. 논술 실전 쓰기는 sp.essay.done, 세트만의 과제는 sp.tasks를 그대로 쓴다 */
const HW_HOW={
  fresh:'① 카드를 보며 정의 2줄과 키워드 5개를 읽고 왜 그런지 이해해요. ② 카드를 덮고 답안지에 정의와 키워드를 써요. 카드를 펴서 빠지거나 틀린 곳만 빨간 펜으로 고치면 "안 보고 쓰기" 1번이에요. ③ 말하기는 30초 안에 정의 → 원리 → 특징 → 유의사항 순서로 소리 내어 해요. 한 번에 몰아 하지 말고 아침·점심·저녁·자기 전에 나눠 하면 훨씬 오래 남아요.',
  rev:'제목만 보고 키워드를 백지에 떠올려 써요. 3개도 안 나오면 그 카드에 별표를 달아요(연습 탭 가리며 외우기에 먼저 나와요).',
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
function hwRule(d){return Object.assign({},PE_HW[1],PE_HW[setPh(d)]||{});}
function hwItems(d){const s=SETS.sets[d];if(!s)return[];const p=spGet(d),R=hwRule(d),H=p.hw||{},out=[];
  const cs=(s.cards||[]).map((sc,i)=>({i,sc,id:setCardId(d,i)})).filter(x=>x.id),tt=x=>(card(x.id)||x.sc).t||'';
  const fresh=cs.filter(x=>!x.sc.ref),rev=cs.filter(x=>x.sc.ref);
  if(fresh.length&&(R.w||R.s))out.push({key:'fresh',kind:'term',t:`새 용어 ${fresh.length}개: 안 보고 쓰기 ${R.w}번, 소리 내어 말하기 ${R.s}번`,min:Math.round(fresh.length*(R.w*3+R.s*.5)),
    rows:fresh.map(x=>({t:tt(x),c:[['w'+x.i,'쓰기',R.w],['s'+x.i,'말하기',R.s]].filter(c=>c[2])})),go:[['set-flash','카드 넘겨 보기'],['memo-set','가리며 외우기']]});
  if(rev.length&&R.rv)out.push({key:'rev',kind:'term',t:`복습 용어 ${rev.length}개: 제목만 보고 키워드 백지 복원${R.rv>1?' '+R.rv+'번':''}`,min:Math.round(rev.length*1.5*R.rv),rows:rev.map(x=>({t:tt(x),c:[['r'+x.i,'',R.rv]]}))});
  const e=s.essay;
  if(e&&e.t){if(R.eo)out.push({key:'eo',kind:'essay',t:`논술 목차 옮겨 적기 ${R.eo}번`,sub:e.t,min:R.eo*5,rows:[{c:[['eo','',R.eo]]}],go:[['essay','모범 목차 보기']]});
    if(R.ew)out.push({key:'ew',kind:'essay',t:'논술 실전 쓰기 25분 → 사진 찍어 첨삭',sub:e.t,min:30,done:!!(p.essay&&p.essay.done),go:[['timer','타이머 25분'],['copy-essay','첨삭 요청 복사']]});
    if(e.fig&&R.fg)out.push({key:'fg',kind:'essay',t:`그림·표 그리기 ${R.fg}번`,sub:e.fig,min:R.fg*2,rows:[{c:[['fg','',R.fg]]}]});}
  if(R.dd){const pool=fresh.concat(rev).map(x=>({x,c:card(x.id)})).filter(o=>o.c).sort((a,b)=>(a.x.sc.ref?1:0)-(b.x.sc.ref?1:0)||((b.c.x||[]).length-(a.c.x||[]).length)||a.x.i-b.x.i).slice(0,R.dd);
    if(pool.length)out.push({key:'dd',kind:'term',t:`단답 ${pool.length}문제: 답안지에 10분 쓰기 → 첨삭`,min:pool.length*15,rows:pool.map(o=>({t:o.c.t,c:[['dd'+o.x.i,'',1]],go:o.c.id})),go:[['timer1','타이머 10분']]});}
  const qs=s.quiz||[];if(qs.length){const all=qs.every((_,i)=>p.quiz[i]),wr=qs.map((q,i)=>({q,i})).filter(x=>p.quiz[x.i]&&!p.quiz[x.i].ok);
    out.push({key:'qz',kind:'quiz',t:all&&!wr.length?'퀴즈: 모두 맞혔어요':`퀴즈 틀린 문제: 해설 2번 읽고 틀린 이유 한 줄`,min:wr.length*2,pending:!all,
      rows:wr.map(x=>({t:x.q.q,c:[['q'+x.i,'',1]]})),done:all&&!wr.length?true:undefined,go:all?null:[['quiz','퀴즈 먼저 풀기']]});}
  out.push({key:'mn',kind:'todo',t:'앞글자로 외우기 1개 만들기',min:3,done:!!H.mn,input:true});
  out.push({key:'sl',kind:'term',t:'자기 전 5분: 오늘 용어 제목만 보고 떠올리기',min:5,rows:[{c:[['sl','',1]]}]});
  (s.tasks||[]).forEach((x,i)=>{if(!HW_GEN.some(r=>r.test(x)))out.push({key:'x',kind:'todo',t:x,min:15,task:i,done:!!p.tasks[i]});});
  out.forEach(it=>{if(it.done===undefined)it.done=!it.pending&&(it.rows||[]).every(r=>r.c.every(([k,,n])=>(H[k]||0)>=n));});
  return out;}
function hwSum(d){const it=hwItems(d);return{n:it.length,done:it.filter(x=>x.done).length,min:it.reduce((a,x)=>a+x.min,0),left:it.filter(x=>!x.done).reduce((a,x)=>a+x.min,0)};}
/* 숙제 기록을 달력에(용어·논술은 그 색, 전체는 할 일). 수는 학원 횟수 그대로(③ 숙제의 "전체"), 그 종류의 필수 칸을 다 했으면 " · 필수 ✓"를 붙인다 */
const HW_KIND={say:'term',write:'term',dd:'term',sl:'term',eo:'essay',essay:'essay',fg:'essay',qz:'quiz'};
function hwCal(d){PLN++;const it=hwItems(d),cnt=k=>{const a=it.filter(x=>x.kind===k);return[a.filter(x=>x.done).length,a.length];},rq=reqParts(d),rOk=k=>{const r=rq.filter(p=>!k||HW_KIND[p.k]===k);return r.length>0&&r.every(p=>p.done);};   /* 방금 바뀐 숙제 칸으로 다시 센다(PLN) */
  const H=spGet(d).hw||{},touched=k=>it.filter(x=>x.kind===k).some(x=>(x.rows||[]).some(r=>r.c.some(([c])=>H[c])));
  [['term','hwt','숙제(용어)'],['essay','hwe','숙제(논술)']].forEach(([k,key,lab])=>{const[a,b]=cnt(k);if(b&&(a||touched(k)))calMark(key+':'+d,k,`${korDate(d)} ${lab} ${a}/${b}${a<b&&rOk(k)?' · 필수 ✓':''}`);else calUnmark(key+':'+d);});
  const sm=hwSum(d),any=sm.done||Object.keys(H).length;if(any)calMark('hw:'+d,'todo',`${korDate(d)} 숙제 ${sm.done}/${sm.n}${sm.done<sm.n&&rOk()?' · 필수 ✓':''}`);else calUnmark('hw:'+d);}
/* 시험까지 이 숙제를 매일 하면 몸에 익히는 양(평일 세트 기준 어림) */
function hwAhead(){const t=todayStr();let w=Math.max(0,weekIndex(t)),terms=0,essays=0;for(;w<PLAN.E;w++){const ph=phaseObj(w).id,r=PE_SETRULE[ph]||PE_SETRULE[1];terms+=5*(r.fresh||0);if(ph<5)essays+=5;}return{terms,essays};}
/* 동그라미: k번째를 누르면 k번 한 것. 앞쪽 m개는 필수(.req 실선), 그 뒤는 더 하기(.ext 점선), 사이에 가는 줄(.ccsep) */
function hwCtr(d,k,n,lab,H,m){const cur=H[k]||0;m=m>0?Math.min(m,n):0;let h='';
  for(let j=0;j<n;j++){if(m&&m<n&&j===m)h+='<i class="ccsep"></i>';h+=`<button class="cc${j<cur?' on':''}${m?(j<m?' req':' ext'):''}" data-act="hw" data-d="${d}" data-k="${k}" data-v="${j+1}" aria-label="${esc(lab||'')} ${j+1}번째${m?(j<m?', 필수':', 더 하기'):''}">${j+1}</button>`;}
  return`<span class="ctr">${lab?`<small>${lab}</small>`:''}${h}</span>`;}
/* 같은 그림 과제(figDup)는 그림·표 숙제와 함께: 그림·표 동그라미를 다 채우면 그 과제도 다 한 것, 하나 빼면 되돌림 */
function hwFig(d,p){const s=SETS.sets[d],on=((p.hw||{}).fg||0)>=(hwRule(d).fg||0);((s&&s.tasks)||[]).forEach((_,i)=>{if(figDup(d,i))p.tasks[i]=on;});}
/* 숙제 칸 여러 개를 v번까지(올리기만, 세트 막대·펼친 카드의 "다 했어요"). 같은 기록(sp.hw)이라 오늘 몫 줄·달력·점수가 함께 움직인다 */
function hwBulk(d,ks,v){const p=sp(d);p.hw=p.hw||{};ks.forEach(k=>{if(k&&(p.hw[k]||0)<v)p.hw[k]=v;});if(ks.includes('fg'))hwFig(d,p);touchDay();hwCal(d);save();}
/* 펼친 숙제 칸: 오늘 줄(FLOW)이 이 세트의 숙제·손글씨 몫이면 그 칸(목표는 고정한 full·floor), 아니면 이번 주 "다음 하나"·세트 막대로 고른 칸(UI.hwf) */
const HWF={'hw.say':'say','hw.write':'write','hw.dd':'dd','hw.eo':'eo','hw.fg':'fg','hw.qz':'qz','hw.sl':'sl','q.dd':'dd','q.eo':'eo','q.w':'write','q.fg':'fg','q.essay':'essay',essay:'essay'};
const PART_LAB={say:'말하기',qz:'틀린 이유',write:'쓰기',dd:'단답',eo:'목차',sl:'자기 전',fg:'그림·표',essay:'논술 실전'};
function hwFocus(d){const F=FLOW&&FLOW.at==='set/'+d?FLOW:null;
  if(F){const kk=F.id.split(':')[0],k=HWF[kk];if(!k)return kk==='hw.rest'?{d,rest:1}:null;const r=S.today&&S.today.d===todayStr()?S.today.rows.find(q=>q.id===F.id):null;return{d,k,tg:r&&r.tgt||'floor',q:kk[0]==='q'};}
  return UI.hwf&&UI.hwf.d===d?UI.hwf:null;}
/* 숙제 칸의 "다 했어요"(목표까지 아직이면): [글, 칸들, 횟수]. 손글씨 몫(q)은 그 세트 날짜를 붙인다 */
function hwStep(d,k,tg,q){if(k==='essay')return(spGet(d).essay||{}).done?null:{t:q?`다 썼어요 · ${dlab(d)} 논술 실전`:'다 썼어요 · 논술 실전',essay:1};
  const P=hwParts(d)[k];if(!P||!P.n)return null;const full=tg==='full',f=full?P.F:P.f;if(full?P.K>=P.N:P.k>=P.n)return null;const H=spGet(d).hw||{},day=q?dlab(d)+' ':'';
  if(k==='dd')return{t:`다 썼어요 · ${day}단답 1문`,ks:[P.ks.find(x=>(H[x]||0)<1)],v:1};
  if(k==='say')return{t:`${f}번씩 다 했어요 · 말하기`,ks:P.ks,v:f};
  if(k==='write')return{t:q?`다 썼어요 · ${day}쓰기 ${P.ks.filter(x=>(H[x]||0)<f).length}개`:`${f}번씩 다 썼어요 · 쓰기`,ks:P.ks,v:f};
  if(k==='eo')return{t:q?`다 옮겨 적었어요 · ${day}목차 ${f}번`:`${f}번 다 옮겨 적었어요`,ks:['eo'],v:f};
  if(k==='fg')return{t:q?`다 그렸어요 · ${day}그림·표 ${f}번`:`${f}번 다 그렸어요 · 그림·표`,ks:['fg'],v:f};
  if(k==='qz')return{t:'다 썼어요 · 틀린 이유',ks:P.ks,v:1};
  if(k==='sl')return{t:'다 떠올렸어요',ks:['sl'],v:1};return null;}
/* 세트 숙제 탭: 머리(필수 a/b · 전체 n/m, 단계와 필수 규칙, 숙제 원칙 6가지) → 필수 카드(학원 횟수 그대로, 앞쪽 필수 동그라미) → 더 하기(접음).
   오늘 줄·이번 주에서 연 카드는 펼쳐(.focus) "이렇게 해요" 세 단계와 그 버튼, 아래 막대가 그 칸의 "다 했어요" */
function vHw(d){const s=SETS.sets[d],p=spGet(d),H=p.hw||{},R=hwRule(d),M=hwMin(d),its=hwItems(d),sm=hwSum(d),ah=hwAhead(),w=wkIdx(d),P=hwParts(d),rp=reqParts(d),ra=rp.filter(x=>x.done).length,fo=hwFocus(d);
  const KC={say:'fresh',write:'fresh',essay:'ew'},rk=new Set(rp.map(x=>KC[x.k]||x.k)),fk=fo&&fo.k?KC[fo.k]||fo.k:null,split=rp.length>0,ORD=['fresh','dd','eo','ew','fg','qz','sl'],XO=['rev','fg','mn','x','ew'];
  const vis=its.filter(it=>!(it.key==='x'&&figDup(d,it.task))),req=split?vis.filter(it=>rk.has(it.key)||it.key==='qz').sort((a,b)=>ORD.indexOf(a.key)-ORD.indexOf(b.key)):vis,ext=split?vis.filter(it=>!req.includes(it)).sort((a,b)=>XO.indexOf(a.key)-XO.indexOf(b.key)):[];
  const rm=rp.reduce((a,x)=>{const q=P[x.k];return a+Math.ceil(Math.max(0,q.n-q.k)*q.u);},0),xm=ext.filter(it=>!it.done).reduce((a,it)=>a+(it.min||0),0),dup=(s.tasks||[]).some((_,i)=>figDup(d,i));
  const fl=[R.w?`손으로 ${R.w}번`:'',R.s?`입으로 ${R.s}번`:''].filter(Boolean).join('·'),fm=[R.w?M.w+'번':'',R.s?M.s+'번':''].filter(Boolean).join('·'),rq=split?(ra>=rp.length?'필수 ✓':`필수 ${ra}/${rp.length} · 약 ${rm}분`):'';
  const go=([a,l])=>a==='memo-set'||a==='set-flash'?`<button class="btn sm sec" data-act="${a}" data-d="${d}">${l}</button>`:a==='essay'||a==='quiz'?`<button class="btn sm sec" data-act="set-tab" data-d="${d}" data-t="${a}">${l}</button>`
    :a==='timer'?`<button class="btn sm sec" data-act="timer-go" data-p="one2">${l}</button>`:a==='timer1'?timerInlineHTML({kind:'dd',D:d},{p:'one1',l}):`<button class="btn sm sec" data-act="copy-essay" data-d="${d}">${l}</button>`;
  const card=(it,n)=>{const isR=split&&(rk.has(it.key)||it.key==='qz'),isF=fk===it.key,stK=isF?(fo.k==='say'||fo.k==='write'?fo.k:it.key):null,ST=stK&&HW_STEPS[stK];
    const mOf=k=>!isR?0:it.key==='fresh'?(k[0]==='w'?M.w:M.s):it.key==='eo'?M.eo:it.key==='fg'?M.fg||0:it.key==='dd'?(P.dd&&P.dd.ks.includes(k)?1:0):it.key==='qz'||it.key==='sl'?1:0;
    const pk={dd:'dd',eo:'eo',fg:'fg',qz:'qz',sl:'sl'}[it.key],met=isR&&(it.key==='fresh'?['say','write'].every(k=>!P[k]||P[k].k>=P[k].n):it.key==='ew'?!!it.done:!!P[pk]&&P[pk].k>=P[pk].n);
    const sub2=!isR?'':it.key==='fresh'&&(R.w>M.w||R.s>M.s)?`필수: ${[R.w?`쓰기 ${M.w}번`:'',R.s?`말하기 ${M.s}번`:''].filter(Boolean).join(' · ')} (나머지는 시간이 되면)`:it.key==='eo'&&R.eo>M.eo?`필수: ${M.eo}번 (나머지는 시간이 되면)`:it.key==='fg'&&R.fg>(M.fg||0)?`필수: ${M.fg}번 (나머지는 시간이 되면)`:'';
    const dr=it.key==='dd'?(it.rows.find(r=>(H[r.c[0][0]]||0)<1)||it.rows[0]):null;
    const sb=(a,l)=>a==='dandap'?`<button class="btn sm sec" data-act="go" data-h="dandap/${esc(encodeURIComponent(dr.go))}/${d}">${l}</button>`:a==='timer1'?timerInlineHTML({kind:'dd',D:d},{p:'one1',l})
      :a==='copy-dd'?`<button class="btn sm sec" data-act="copy-dd" data-id="${esc(dr.go)}">${l}</button>`:a==='set-flash'?`<button class="btn sm sec" data-act="set-flash" data-d="${d}">${l}</button>`:a==='essay'?`<button class="btn sm sec" data-act="set-tab" data-d="${d}" data-t="essay" data-eo="1">${l}</button>`:'';
    /* 줄(낱말마다 동그라미) → 이렇게 해요 → 안내 → 아래 한 줄(이름 없는 동그라미·논술 실전·세트 과제, 버튼, 요령은 오른쪽 끝에 접어 둠) */
    const rows=it.rows||[],inl=rows.length===1&&!rows[0].t&&!rows[0].go,ctr=r=>r.c.map(([k,l,m])=>hwCtr(d,k,m,l,H,mOf(k))).join(''),foot=[];
    if(inl)foot.push(`<span class="hwc">${ctr(rows[0])}</span>`);
    if(it.key==='ew')foot.push(`<span class="ctr"><button class="cc${it.done?' on':''}" data-act="hw-ew" data-d="${d}" aria-label="실전 쓰기 다 했어요">1</button><small>${it.done?'다 썼어요':'다 쓰면 누르세요'}</small></span><button class="lnk" data-act="set-tab" data-d="${d}" data-t="essay">논술 탭에서 쓰기 ›</button>`);
    if(it.task!=null)foot.push(`<span class="ctr"><button class="cc${it.done?' on':''}" data-act="hw-task" data-d="${d}" data-i="${it.task}" aria-label="과제 다 했어요">1</button></span>`);
    if(it.go&&it.key!=='ew'&&!ST)foot.push(...it.go.map(go));
    foot.push(`<details class="how"><summary>요령</summary><p>${esc(HW_HOW[it.task!=null?'x':it.key])}</p></details>`);
    return`<div class="hw${it.done?' done':''}${isF?' focus':''} k-${it.kind}-l"><div class="hwh"><span class="hwn">${it.done?'✓':n}</span><div class="hwt"><b>${esc(it.t)}</b>${it.sub?`<span>${esc(it.sub)}</span>`:''}${sub2?`<span class="hwreq">${esc(sub2)}</span>`:''}</div>${met&&!it.done?'<span class="hwok">필수 ✓</span>':`<span class="hwm">${it.min?`${it.min}분`:''}</span>`}</div>
    ${inl?'':rows.map(r=>`<div class="hwr">${r.t?`<span class="hwl">${esc(r.t)}</span>`:''}<span class="hwc">${ctr(r)}${r.go&&!ST?`<button class="btn sm sec hwrgo" data-act="go" data-h="dandap/${esc(encodeURIComponent(r.go))}/${d}">답안지</button>`:''}</span></div>`).join('')}
    ${ST?`<div class="steps3"><p>이렇게 해요</p><ol>${ST.map(([tx,a,l])=>`<li><span>${esc(tx)}</span>${a?sb(a,l):''}</li>`).join('')}</ol></div>`:''}
    ${it.key==='qz'&&it.pending?`<p class="ds hwp">퀴즈를 다 풀면 틀린 문제가 여기 나와요.</p>`:''}${it.key==='fg'&&dup?'<p class="ds hwp">세트 숙제 항목과 같은 그림이에요</p>':''}
    ${it.input?`<div class="hwin"><input id="hwMn" type="text" maxlength="80" placeholder="예: 원인·문제점·대책·결론 → 원문대결" value="${esc(H.mn||'')}"><button class="btn sm sec" data-act="hw-mn" data-d="${d}">${H.mn?'고치기':'적어 두기'}</button></div>`:''}
    <div class="hwf">${foot.join('')}</div></div>`;};
  return`<div class="hwhd"><b class="hwh2">이 세트 숙제</b><p class="hwcnt">${rq?`<span>${rq}</span>`:''}<span>전체 <b class="num">${sm.done}/${sm.n}</b>${sm.done>=sm.n||!sm.left?'':` · 약 ${sm.left}분`}</span></p>
    <p class="hwwhy">${esc((PE_PHASES.find(x=>x.id===setPh(d))||phaseObj(w)).n)}${fl?` · 새 용어는 ${fl}, 필수는 ${fm}`:''}</p>
    <details class="hwrules"${foldAt('hwr')}><summary>숙제 원칙 6가지</summary><ol>${HW_RULES.map(([a,b])=>`<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join('')}</ol>
    <p class="note">이 숙제를 시험 전까지 매일 하면 새 용어 약 ${ah.terms}개를 손과 입으로, 논술 약 ${ah.essays}문제의 목차를 손으로 익혀요(평일 세트 기준 어림).</p></details></div>
  ${split?`<div class="sec-h hwsh"><h2>필수</h2><span class="meta">${ra}/${rp.length}${rm>0?` · 약 ${rm}분`:' ✓'}</span></div>`:''}${req.map((it,i)=>card(it,i+1)).join('')}
  ${ext.length?`<details class="d hwext"${foldPref('hwx:'+d,!!(fo&&fo.rest))}><summary><span class="fs">더 하기 · ${ext.length}개 · 약 ${xm}분<small>${esc(ext.map(it=>it.t.split(':')[0]).join(' · '))}</small></span></summary><div class="hwxl">${ext.map((it,i)=>card(it,req.length+i+1)).join('')}</div></details>`:''}
  ${sm.n&&sm.done>=sm.n?'<p class="note hwall">이 세트 숙제를 모두 했어요.</p>':''}`;}
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
  const tm=/^t:/.test(mode||''),m=mode==='wrong'?'wrong':tm?'t':mode==='rand'||mode==='all'?mode:'round';   /* 끝 화면의 "다음"이 같은 방식으로 잇는다(SES.gq) */
  startSession({kind:'gq',title:`${korDate(d)} 용어 퀴즈${title.startsWith(':')?'':' '}${title}`,items:ns.map(n=>({type:'gq',d,n})),revD:d,i:at,done,gq:{d,m,id:tm?mode.slice(2):null}});}
/* 푸는 방식: 회차별(15문씩, 쉬운 것부터), 용어별(그 용어 문제만, 쉬운 것부터), 무작위(15문 또는 전체를 풀 때마다 새로 섞기). 기록은 문제마다 하나라 어느 방식으로 풀어도 같이 남는다 */
const GQ_MODES=[['round','회차별'],['term','용어별'],['rand','무작위']];
/* 용어별 순서: 이 세트 용어 차례, 그 밖(카드가 모자라 보기를 채운 같은 단원 카드)은 뒤 */
function gqTermIds(d){const L=gqList(d),qid=uniq(L.items.map(q=>q.id)),si=setIds(d);return si.filter(id=>qid.includes(id)).concat(qid.filter(id=>!si.includes(id)));}
/* ② 퀴즈 아래 "더 연습: 용어 퀴즈"(접는 칸, 세트 퀴즈를 다 풀면 처음부터 열림) 안: 회차별·용어별·무작위. 버튼은 모두 보조(이 화면의 파란 버튼은 아래 막대) */
function gqSection(d){const L=gqList(d);if(!L||!L.items.length)return'';const r=gqRec(d),st=gqStat(d),nR=st.rounds,ids=gqTermIds(d),mode=SV['gqm:'+d]||'round';
  let body='';
  if(mode==='term')body=`<div class="group">${ids.map(id=>{const c=card(id),ns=L.items.map((q,n)=>q.id===id?n:-1).filter(n=>n>=0),a=ns.filter(n=>r[n]!=='-').length,ok=ns.filter(n=>r[n]==='1').length;
      return row({t:esc(c?gqMain(c):id),d:a?`${a}/${ns.length}문 풂, 정답 ${ok}`:`${ns.length}문`,v:a===ns.length?(ok===ns.length?'다 맞힘':`${ok}/${ns.length}`):'',act:'gq-go',data:{d,r:'t:'+id}});}).join('')}</div>
    <p class="note">외울 용어 하나를 골라 그 용어 문제만 쉬운 것부터 풀어요.</p>`;
  else if(mode==='rand')body=`<div class="btns"><button class="btn sec" data-act="gq-go" data-d="${d}" data-r="rand">무작위 ${Math.min(GQ_ROUND,st.n)}문 풀기</button><button class="btn sec" data-act="gq-go" data-d="${d}" data-r="all">${st.n}문 전부 섞기</button></div>
    <p class="note">풀 때마다 용어와 문제 종류를 새로 섞어요.</p>`;
  else{let next=-1;for(let j=0;j<nR;j++)if(r.slice(j*GQ_ROUND,(j+1)*GQ_ROUND).includes('-')){next=j;break;}
    const chips=Array.from({length:nR},(_,k)=>{const x=gqRoundStat(r,k),cls=x.a===x.n?(x.ok>=Math.ceil(x.n*0.8)?'ok':'mid'):x.a?'part':'';
      return`<button class="gqc ${cls}" data-act="gq-go" data-d="${d}" data-r="${k}"><b>${k+1}회</b><small>${x.a?`${x.ok}/${x.n}`:`${x.n}문`}</small></button>`;}).join('');
    body=`<div class="gqg">${chips}</div><div class="btns"><button class="btn sec" data-act="gq-go" data-d="${d}" data-r="next">${next<0?'1회부터 다시 풀기':st.a?`이어 풀기: ${next+1}회`:'1회부터 풀기'}</button></div>
    <p class="note">${GQ_ROUND}문씩 ${nR}회, 뒤로 갈수록 어려워요(정의·키워드 보고 용어 → OX·빈칸 → 키워드 아닌 것).</p>`;}
  return`<p class="note" style="margin-top:0">이 세트 용어 ${ids.length}개로 앱이 만든 문제 ${st.n}개예요. 어느 방식으로 풀어도 기록은 함께 남고, 틀린 문제는 오답 노트로 가요.</p>
    <div class="seg" style="margin:10px 0 12px">${GQ_MODES.map(([k,l])=>`<button class="${mode===k?'on':''}" data-act="gq-mode" data-d="${d}" data-m="${k}">${l}</button>`).join('')}</div>${body}
    ${st.no?`<div class="btns" style="margin-top:6px"><button class="btn sec" data-act="gq-go" data-d="${d}" data-r="wrong">틀린 문제만 (${st.no})</button></div>`:''}`;}
function gqFold(d,open){const L=gqList(d);if(!L||!L.items.length)return'';const st=gqStat(d);
  return`<details class="d gqf"${foldPref('gq:'+d,open)}><summary><span class="fs">더 연습: 용어 퀴즈 ${st.n}문 · ${st.a}/${st.n}</span></summary><div class="in-d">${gqSection(d)}</div></details>`;}
function gqRoundStat(r,k){const s=r.slice(k*GQ_ROUND,(k+1)*GQ_ROUND);return{n:s.length,a:s.length-(s.match(/-/g)||[]).length,ok:(s.match(/1/g)||[]).length};}

/* ════════ 12. 화면: 세트 ════════ */
const SV={};
/* 세트 화면: 탭은 공부 순서(① 용어 → ② 퀴즈 → ③ 숙제 → ④ 논술), 탭마다 지금 상태. 제목은 ①에만(②~④는 한 줄).
   아래에 붙은 막대(setNext)가 이 화면의 하나뿐인 파란 버튼이고, 나머지 버튼은 모두 보조 */
function vSet(){const d=R.a;const s=SETS.sets[d];
  if(!s)return topbar('세트')+`<div class="empty" style="margin-top:20px"><b>${esc(d||'')} 세트가 아직 없어요</b>앱이 저장소에서 받아 오지 못했어요.<div class="btns"><button class="btn" data-act="sync">지금 받아 오기</button></div></div>`;
  const p=sp(d);
  const tab=SV[d]||'cards',st=setStatus(d),w=wkIdx(d),ph=setPh(d),rp=reqParts(d),ra=rp.filter(x=>x.done).length,ed=!!(p.essay&&p.essay.done);
  let body='';
  if(tab==='cards'){const fr=resumeAt('flash:'+d),mr=resumeAt('memo:set:'+d);
    body=`<div class="btns stools"><button class="btn sm sec" data-act="set-flash" data-d="${d}">${fr?`카드 넘겨 보기 이어서 (${fr})`:'카드 넘겨 보기'}</button><button class="btn sm sec" data-act="memo-set" data-d="${d}">${mr?`가리며 외우기 이어서 (${mr})`:'가리며 외우기'}</button><button class="lnk" data-act="start-fill" data-d="${d}">빈칸 쓰기</button></div>
      ${fr||mr?`<div class="btns stools2"><button class="btn ghost sm" data-act="resume-clear" data-k="flash:${d} memo:set:${d}">이어 하지 않고 처음부터</button></div>`:''}
      <p class="note snote">펼쳐 읽은 용어는 읽은 것으로 쳐요. 모르는 낱말은 꾹 누르세요.</p>`
      +(s.cards||[]).map((sc,i)=>{const id=setCardId(d,i);const c=id?card(id):null;const t=c?c.t:sc.t;const open=SV[d+':o']===i;const read=!!p.read[i];
      return`<div class="acc ${open?'open':''} ${read?'read':''}"><button data-act="set-open" data-d="${d}" data-i="${i}"><span class="no">${read?'✓':i+1}</span><span class="tt">${esc(t||'(내용 없음)')}${sc.ref?'':' <span class="tag-new">새 용어</span>'}</span><span class="open-ic"></span></button>
      ${open?`<div class="body">${c?`<p class="defn">${glHTML(c.d,c.id)}</p><ul class="kws">${(c.k||[]).map(k=>`<li><span>${esc(k)}</span></li>`).join('')}</ul>`:`<p class="defn">${glHTML(sc.d||'','')}</p>`}
        ${sc.plus?`<p class="plus">${esc(sc.plus)}</p>`:''}${(sc.field||(c&&c.field))?`<p class="field">현장: ${esc(sc.field||c.field)}</p>`:''}
        ${c&&c.x&&c.x.length?`<p class="xref">기출 <b>${c.x.length}회</b> 출제: ${c.x.map(kLabelShort).join(', ')}</p>`:''}${(sc.basis||(c&&c.basis))?`<p class="xref">근거: ${esc(sc.basis||c.basis)}</p>`:''}
        ${c?`<div class="btns"><button class="btn sm sec" data-act="star" data-id="${c.id}">${pget(c.id).star?'★ 별표 해제':'☆ 별표'}</button><button class="btn sm sec" data-act="go" data-h="${esc(ddHash(c.id,d))}">단답 답안지</button><span class="note" style="margin:auto 0">${unitName(c.u)}</span></div>`:''}</div>`:''}</div>`;}).join('')
      +((s.check&&s.check.length)?`<details class="d schk"${foldAt('chk:'+d)}><summary>교재로 확인할 것 ${s.check.length}</summary><div class="in-d"><ul class="chkl">${s.check.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><p class="note" style="margin:8px 0 0">세트를 만들 때 확신하지 못한 내용이에요.</p></div></details>`:'');}
  else if(tab==='quiz'){const qs=s.quiz||[],qd=st.qa>=st.nq,qb=qs.map((q,i)=>quizBlock(d,i,q,p.quiz[i])).join('');
    body=(qs.length?sec('세트 퀴즈',`${st.qa}/${st.nq}문`,qb+(qd?`<p class="note">${st.qok}/${st.nq} 정답 · ${st.qok<st.nq?"틀린 문제는 오답 노트와 숙제 '틀린 이유'로 갔어요":'모두 맞혔어요'}</p>`:'')):'<div class="empty" style="margin-top:16px">이 세트엔 퀴즈가 없어요</div>')+gqFold(d,qd);}
  else if(tab==='essay'){const e=s.essay;if(!e)body='<div class="empty" style="margin-top:16px">이 세트엔 논술 문제가 없어요</div>';else{const show=SV[d+':eo'],ec={kind:'essay',D:d};   /* 25분 타이머는 이 화면 안에서(ec: 이 세트 논술) */
    body=`<div class="qcard" style="margin-top:14px"><p class="qnum">${unitName(e.u)}${e.x?', 기출 '+esc([].concat(e.x).map(kLabelShort).join(', ')):''}</p><p class="qtext">${esc(e.t)}</p>
      ${show?`<ol style="margin:0 0 0 20px;padding:0;line-height:1.75">${(e.o||[]).map(o=>`<li>${esc(String(o).replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol>${e.fig?`<p class="plus">그림·표: ${esc(e.fig)}</p>`:''}${e.p?`<p class="field">채점 포인트: ${esc(e.p)}</p>`:''}`:`<button class="btn sec" data-act="set-eo" data-d="${d}">목차 힌트 보기</button><p class="note">먼저 소제목 5~7개를 스스로 정한 뒤 열어 보세요.</p>`}</div>
      ${ph<=1?'<p class="note">1단계는 토요일 모의고사 논술 2문이 이번 주 몫이에요. 이 문제는 시간이 되면 쓰세요.</p>':ph===3?'<p class="note">3단계는 평일 모의 오답 다시 쓰기가 이번 주 몫이에요. 이 문제는 시간이 되면 쓰세요.</p>':''}
      <div class="btns"><button class="btn ghost" data-act="go" data-h="guide">답안 작성 요령</button></div>
      ${ph>=4?'':`${tLive(ec)?timerInlineHTML(ec,{p:'one2',l:'타이머 25분'}):''}<div class="btns" style="margin-top:4px">${tLive(ec)?'':timerInlineHTML(ec,{p:'one2',l:'타이머 25분',c:'btn sec'})}<button class="btn sec" data-act="copy-essay" data-d="${d}">첨삭 요청 복사</button></div>
      <label class="check group" style="margin-top:12px;border-radius:14px"><input type="checkbox" data-act="set-essay-done" data-d="${d}" ${ed?'checked':''}><span>손글씨로 다 썼어요(사진을 찍어 Claude 프로젝트에 올리기)</span></label>`}`;}}
  else body=vHw(d);
  const tabs=[['cards','① 용어',st.read>=st.nc?'✓':`${st.read}/${st.nc}`],['quiz','② 퀴즈',!st.nq?'':st.qa>=st.nq?'✓':`${st.qa}/${st.nq}`],['tasks','③ 숙제',!rp.length?'':ra>=rp.length?'✓':`${ra}/${rp.length}`],['essay','④ 논술',!s.essay?'':ed?'✓':ph===2?'○':ph<=1||ph===3?'권장':'']];
  const head=tab==='cards'?`<h1 class="ptitle">${esc(s.title||'오늘의 세트')}</h1><p class="lsub">${esc(weekLabel(w))}${s.units&&s.units.length?' · '+esc(s.units.map(unitName).join(', ')):''}</p>${s.goal?`<p class="lsub" style="margin-top:4px">${esc(s.goal)}</p>`:''}${setWkNote(d,w)}`:`<p class="lsub sone">${esc(s.title||'')}</p>`;
  const foot=st.done?'<p class="note sfoot ok">이 세트 숙제까지 모두 끝냈어요. 세트를 처음 연 날로부터 1·3·7·14·30일 뒤에 세트 복습으로 돌아와요.</p>':st.core?`<p class="note sfoot">핵심 끝 ✓${(x=>x?' · '+x:'')(nextRevTxt(d))}</p>`:'';
  return topbar(korDate(d,true)+' 세트')+`<div class="seg sseg">${tabs.map(([k,n,v])=>`<button class="${tab===k?'on':''}" data-act="set-tab" data-d="${d}" data-t="${k}"><b>${n}</b>${v?` <small${v==='✓'?' class="ok"':''}>${v}</small>`:''}</button>`).join('')}</div>${head}${body}${foot}${setBarHTML(d)}`;}
function quizBlock(d,i,q,ans){const opts=q.o||[];const answered=ans!=null;
  return`<div class="qcard sq${answered?' ans':''}" style="margin-bottom:10px"><p class="qnum">퀴즈 ${i+1}${q.u?', '+esc(unitShort(q.u)):''}</p><p class="qtext">${esc(q.q)}</p>
  ${opts.map((o,k)=>{let cls='';if(answered){if(k===q.a)cls='right';else if(ans.pick===k)cls='wrong';}return`<button class="opt ${cls}" data-act="set-quiz" data-d="${d}" data-i="${i}" data-k="${k}" ${answered?'disabled':''}><span class="ab">${opts.length===2?(k?'X':'O'):'①②③④⑤'.charAt(k)}</span><span>${esc(o)}</span></button>`;}).join('')}
  ${answered?`<div class="ex ${ans.ok?'ok':'no'}"><b>${ans.ok?'정답':'오답'}</b> ${esc(q.ex||'')}</div>`:''}</div>`;}
/* 다음 세트 복습 날(처음 연 날 + 1·3·7·14·30일 가운데 아직 안 한 첫 단계) */
function nextRevTxt(d){const p=spGet(d),st=REVIEW_STEPS.find(x=>!(p.rev||{})[x]);if(!p.first||!st)return'';const due=addDays(p.first,st);return due<=todayStr()?`세트 복습 ${st}일 차는 복습 탭에서`:`세트 복습은 ${dlab(due)}(${st}일 차)부터`;}
/* 용어 펼치기(읽음으로 침). force면 이미 펼친 것도 그대로 펼친 채 */
function setOpen(d,i,force){const key=d+':o';SV[key]=force||SV[key]!==i?i:null;if(SV[key]===i){const p=sp(d);p.read[i]=1;introduce(setCardId(d,i));touchDay();calSetRead(d);save();}}
/* 막대의 걸음: {t 글, go 할 일} 또는 숙제 칸 {t, ks, v}(hw-bulk)·논술 실전 {t, essay} */
const readStep=(d,c)=>({t:`다음: 용어 읽기 ${c.st.read}/${c.st.nc}`,go:()=>{SV[d]='cards';setOpen(d,firstUnread(d),true);SV.scrollTo='.acc.open';render();scrollDo();}});
const quizStep=(d,c)=>({t:`다음: 세트 퀴즈 ${c.st.qa?c.st.qa+'/':''}${c.st.nq}문`,go:()=>{SV[d]='quiz';SV.scrollTo='.qcard.sq:not(.ans)';render();scrollDo();}});
/* 세트 화면 아래 막대: 오늘 줄(FLOW)에서 왔으면 그 줄의 다음 걸음(읽기·세트 퀴즈·숙제 칸의 "다 했어요"), 그 줄을 다 하면 "✓ 끝 · 다음: 오늘 다음 줄"
   (바꿔 쓰기, 연 곳 그대로). 아니면(보관함·복습·이번 주) 이 세트 순서: 읽기 → 세트 퀴즈 → 숙제 필수 → 2단계 논술 실전 → 돌아가기 */
function setNext(d){const t=todayStr(),c=setCore(d);if(!c)return null;const F=FLOW&&FLOW.at==='set/'+d?FLOW:null;if(!F)return inSetNext(d);
  const kk=F.id.split(':')[0],fo=hwFocus(d);let own=null;
  if(kk==='set.read')own=c.r?readStep(d,c):null;else if(kk==='set.quiz')own=c.q?quizStep(d,c):null;
  else if(kk==='late'||kk==='carry.sets')own=c.r?readStep(d,c):c.q?quizStep(d,c):null;
  else if(fo&&fo.k)own=hwStep(d,fo.k,fo.tg,fo.q);
  const dn=flowDone(F.id);if(own&&!dn)return own;
  if(!dn){if(kk==='hw.rest')return inSetNext(d);   /* 이 세트 몫은 했고 그 줄의 다른 세트가 남음(손글씨 몫·지난주 세트): 남은 첫 세트로 */
    const x=taskList(t).find(r=>r.id===F.id),nx=x&&(x.quota?(x.quota.list[0]||{}).d:x.k==='carry.sets'?x.ds[x.ds.length-1]:null);
    return{t:nx&&nx!==d&&SETS.sets[nx]?`다음: ${dlab(nx)} 세트 ${x.quota?PART_LAB[HWF[kk]]||'':'읽기·퀴즈'}`.trim():`다음: ${x?rowTxt(x).t:idLabel(F.id)}`,go:()=>taskGo(F.id,{replace:true})};}
  const n=flowNext(F.id);return n?{t:`✓ 끝 · ${n.t} · ${mfmt(n.row.left)}`,go:()=>flowGo(n.row)}:{t:'✓ 끝 · 오늘 몫 끝 · 오늘로',go:()=>goTab('today')};}
function inSetNext(d){const t=todayStr(),c=setCore(d),f=UI.hwf&&UI.hwf.d===d?UI.hwf:null;
  if(f&&f.k){const x=hwStep(d,f.k,'floor');if(x)return x;}   /* 이번 주 "다음 하나"·막대로 펼친 숙제 칸이 먼저(그 칸의 "다 했어요"), 그 칸을 다 했으면 이 세트 순서로 */
  if(c.r)return readStep(d,c);if(c.q)return quizStep(d,c);
  const ph=setPh(d),P=hwParts(d),miss=k=>!!P[k]&&P[k].n>0&&P[k].k<P[k].n;
  const k=(d===t?['say','qz','write','dd','eo','sl','fg']:[ph<=2&&'write',ph<=4&&'dd',ph<=2&&'eo',ph===3&&'fg'].filter(Boolean)).find(miss);   /* 지난 세트는 이번 주로 넘어가는 칸만 */
  if(k)return{t:`다음: 숙제 필수 · ${PART_LAB[k]}`,go:()=>{UI.hwf={d,k};SV[d]='tasks';SV.scrollTo='.hw.focus';render();scrollDo();}};
  if(P.essay&&P.essay.req&&!P.essay.k)return{t:'다음: 논술 실전 25분',go:()=>{UI.hwf={d,k:'essay'};SV[d]='essay';render();window.scrollTo(0,0);}};
  /* 지난 세트에서 그날만 하는 필수(말하기·자기 전 등)가 비어 있으면 "③ 숙제 3/5"와 어긋나지 않게 넘어가는 칸만 끝났다고 */
  return{t:d<t&&reqParts(d).some(x=>!x.done)?'넘어가는 필수 끝 · 돌아가기':'이 세트 필수 끝 · 돌아가기',go:()=>goUp()};}
function setBarHTML(d){const n=setNext(d);if(!n)return'';const a=n.ks?`data-act="hw-bulk" data-d="${d}" data-ks="${esc(n.ks.join(' '))}" data-v="${n.v}"`:n.essay?`data-act="essay-done" data-d="${d}"`:`data-act="set-bar" data-d="${d}"`;
  return`<div class="nextbar"><button class="btn" ${a}>${esc(n.t)}</button></div>`;}

/* ════════ 13. 화면: 복습 ════════ */
function setIds(d){const s=SETS.sets[d];return uniq(((s&&s.cards)||[]).map((_,i)=>setCardId(d,i)).filter(Boolean));}
function wrongCardIds(){return uniq(wrongList().map(w=>w.type==='gq'?sessItemCard(w):w.id).filter(id=>id&&card(id)));}
/* 세트 복습 순서(오늘·복습 탭·잇기 모두): 1·3일 차 먼저, 그다음 기한(처음 연 날 + 단계), 같으면 단계 */
const revList=()=>revCands(todayStr()).map(x=>({d:x.d,step:x.step}));
/* 복습 날인 세트의 창에서 시작하면 나머지 세트 복습을 잇는다(그 세트 뒤 차례부터, 앞의 것은 끝에) */
function revChain(d){if(!reviewDue(d))return[];const L=revList().map(x=>x.d),i=L.indexOf(d);return i<0?L.filter(x=>x!==d):L.slice(i+1).concat(L.slice(0,i));}
/* 창에서 연 세션·외우기에 잇기를 붙인다(이어서 연 것은 그대로) */
function withChain(d,f){const s0=SES,m0=MEMO;f();const ch=revChain(d);if(!ch.length)return;const o=SES&&SES!==s0?SES:MEMO&&MEMO!==m0?MEMO:null;if(o){o.chain=ch;o.cpos=[1,ch.length+1];}}
/* 세트 하나를 다시 볼 때(복습 탭의 세트 복습·지난 세트, 보관함): 파란 버튼 하나(세트 복습 시작, 복습 날이 아니면 세트 다시 풀기) + 접은 "다른 방법으로"
   (가리며 외우기·카드 넘겨 보기·빈칸 쓰기·용어 퀴즈·세트 열기). 복습 날이면 어느 것이든 끝까지 하면 그 날 복습으로 친다 */
function revSheet(d){const s=SETS.sets[d];if(!s)return'';const step=reviewDue(d),its=setReviewItems(d),nC=its.filter(x=>x.type==='card').length,nQ=its.length-nC,gs=gqStat(d),mr=resumeAt('memo:set:'+d),fr=resumeAt('flash:'+d),p=spGet(d),m=Math.max(1,Math.ceil(MIN_PER.revItem*its.length));
  const nx=!step&&p.first?REVIEW_STEPS.find(x=>!(p.rev||{})[x]):null,rv=step?{rv:1}:{};
  return`<p class="qnum">${esc(korDate(d,true))} 세트${step?` · ${step}일 차 세트 복습`:nx?` · 다음 세트 복습 ${md(addDays(p.first,nx))}(${nx}일 차)`:''}</p><h3 class="cmh">${esc(s.title||'')}</h3>
  <button class="btn" data-act="start-setrev" data-d="${d}">${step?`세트 복습 시작 · 카드 ${nC}${nQ?` + 퀴즈 ${nQ}`:''} · 약 ${m}분`:`세트 다시 풀기 · 약 ${m}분`}</button>
  ${step?'':'<p class="note">복습 날이 아니라 세트 복습 기록은 남지 않아요. 카드 진도는 그대로 반영돼요.</p>'}
  <details class="d rvm"${foldAt('rvm')}><summary>다른 방법으로</summary><div class="group">
    ${row({ic:'layers',t:'가리며 외우기',d:mr?`이어서 (${mr})`:'보였다 가렸다 반복. 고른 줄·무작위 줄·테이프로 가리기',act:'memo-set',data:Object.assign({d},rv)})}
    ${row({ic:'cards',t:'카드 넘겨 보기',d:fr?`이어서 (${fr})`:'뒷면을 보고 앎·애매·모름 고르기',act:'set-flash',data:Object.assign({d},rv)})}
    ${row({ic:'num',t:'빈칸 쓰기',d:'정의 속 낱말·수치를 직접 써 넣기',act:'start-fill',data:Object.assign({d,back:1},rv)})}
    ${gs?row({ic:'check',t:'용어 퀴즈',d:`${gs.a}/${gs.n}문 풂${gs.no?`, 틀린 문제 ${gs.no}`:''}`,act:'gq-go',data:Object.assign({d,r:'next'},rv)}):''}
    ${row({ic:'paper',tone:'gray',t:'세트 열기',d:'용어·퀴즈·숙제·논술 전체',act:'go',data:{h:'set/'+d}})}</div>
  <p class="note">${step?'어느 방법이든 끝까지 하면 오늘 복습으로 쳐요.':'1·3·7·14·30일 복습 날에 끝까지 하면 그 날 복습으로 쳐요.'}</p></details>`;}
/* 복습 탭: 상태 한 줄 → 세트 복습(5개까지, 파란 "세트 복습 시작"이 차례대로 잇는다, 카드 복습, 모두 가리며 외우기) → 오답 노트(늘) → 별표 카드(있을 때) → 지난 세트·보관함 */
function vReview(){const t=todayStr(),L=revList(),N=cardsOut(t).length,wl=wrongList(),stars=deck().filter(c=>pget(c.id).star);
  const byT={card:0,quiz:0,cloze:0,fill:0,gq:0};wl.forEach(w=>byT[w.type]++);const rvIds=uniq([].concat(...L.map(x=>setIds(x.d)))),wIds=wrongCardIds(),mr=resumeAt('memo:rev');
  const past=Object.keys(SETS.sets).filter(d=>d<t&&!L.some(x=>x.d===d)).sort().reverse().slice(0,5),   /* 지난 세트: 오늘 세트는 오늘 화면에서 */cat=[['card','카드'],['quiz','퀴즈'],['cloze','수치'],['fill','빈칸'],['gq','용어 퀴즈']].filter(([k])=>byT[k]).map(([k,l])=>l+' '+byT[k]).join(', ');
  const stl=[L.length?`세트 복습 ${L.length}`:'',N?`카드 복습 ${N}`:'',wl.length?`오답 ${wl.length}`:''].filter(Boolean).join(' · ')||'지금 다시 볼 것이 없어요';
  const rr=x=>row({t:`${esc(dlab(x.d))} ${x.step}일 차`,d:esc((SETS.sets[x.d]||{}).title||''),act:'rev-open',data:{d:x.d}});
  const pst=d=>{const c=setCore(d);return c.ok?'핵심 ✓':`용어 ${c.st.read}/${c.st.nc}${c.st.nq?` · 퀴즈 ${c.st.qa}/${c.st.nq}`:''}`;};
  return`<div class="ltitle"><div><h1>복습</h1><p class="lsub">${esc(stl)}</p></div></div>
  ${sec('세트 복습',L.length?L.length+'개':'',(L.length?`<div class="group">${L.slice(0,5).map(rr).join('')}</div>${L.length>5?`<details class="d pf"${foldAt('revmore')}><summary>모두 보기 ${L.length}</summary><div class="group">${L.slice(5).map(rr).join('')}</div></details>`:''}
      <div class="btns"><button class="btn" data-act="rev-start">세트 복습 시작 · ${esc(dlab(L[0].d))} ${L[0].step}일 차 · ${revMin(L[0].d)}분</button></div>`
    :`<div class="empty"><b>오늘 할 세트 복습이 없어요</b>세트를 처음 연 날로부터 1·3·7·14·30일 뒤에 세트 복습으로 돌아와요.</div>`)
    +(N?`<div class="group" style="margin-top:10px">${row({ic:'cards',t:`카드 복습 ${N}장`,d:L.length?'세트 복습 뒤에 해요':'',act:'start-due'})}</div>`:'')
    +(rvIds.length?`<div class="btns"><button class="btn sec" data-act="memo-rev">${mr?`가리며 외우기 이어서 (${mr})`:`${L.length>1?'모두 ':''}가리며 외우기 (${rvIds.length}장)`}</button></div>`:''))}
  ${sec('오답 노트',`${wl.length}개`,wl.length?`<div class="group">${row({ic:'x',tone:'red',t:'오답 다시 풀기',d:`${cat}. 두 번 연속 맞히면 빠져요`,act:'start-wrong'})}${wIds.length?row({ic:'layers',tone:'red',t:'오답 카드 가리며 외우기',d:(m=>m?`이어서 (${m})`:`${wIds.length}장`)(resumeAt('memo:wrong')),act:'memo-wrong'}):''}${row({ic:'list',tone:'gray',t:'목록 보기',act:'go',data:{h:'wrong'}})}</div>`
    :`<div class="empty">오답이 없어요 · 퀴즈·테스트에서 틀리거나 '모름'을 고르면 여기 모여요.</div>`)}
  ${stars.length?sec('별표 카드',stars.length+'장',`<div class="group">${row({ic:'star',tone:'amber',t:'별표 카드 넘겨 보기',act:'start-stars'})}${row({ic:'layers',tone:'amber',t:'별표 카드 가리며 외우기',d:(m=>m?`이어서 (${m})`:'')(resumeAt('memo:stars')),act:'memo-stars'})}</div>`):''}
  ${sec('지난 세트','',`<div class="group">${past.map(d=>row({ic:'paper',tone:'gray',t:esc(dlab(d))+' 세트',d:`${esc((SETS.sets[d]||{}).title||'')}<span class="ds2">${esc(pst(d))}</span>`,act:'rev-open',data:{d}})).join('')}${row({ic:'box',tone:'gray',t:'세트 보관함',d:`세트 ${Object.keys(SETS.sets).length}개 · 모의고사 ${Object.keys(SETS.mocks).length}개`,act:'go',data:{h:'archive'}})}</div>`)}`;}

function vWrong(){const wl=wrongList();const nm={card:'카드',quiz:'퀴즈',cloze:'수치',fill:'빈칸 쓰기',gq:'용어 퀴즈'};
  return topbar('오답 노트')+`<h1 class="ptitle">오답 노트</h1><p class="lsub">${wl.length}개. 다시 풀어서 두 번 연속 맞히면 빠져요.</p>
  ${wl.length?`<div class="btns"><button class="btn" data-act="start-wrong">오답 다시 풀기</button></div><div class="group" style="margin-top:14px">${wl.map(w=>`<div class="row noic"><span class="tx"><span class="tt">${esc(w.label)}</span><span class="ds">${nm[w.type]}, ${w.w.n}번 틀림, 마지막 ${esc(md(w.w.last||w.w.since))}</span></span><button class="btn sm ghost" data-act="wrong-del" data-k="${esc(w.key)}">빼기</button></div>`).join('')}</div>`:`<div class="empty" style="margin-top:14px"><b>비어 있어요</b>틀린 문제가 생기면 여기에 모여요.</div>`}`;}

/* 세트 보관함: 세트는 핵심(읽기·퀴즈)과 숙제 필수, 모의고사는 교시·채점. 세트를 누르면 다시 볼 방법을 고르는 창 */
function vArchive(){const sd=Object.keys(SETS.sets).sort().reverse(),mdts=Object.keys(SETS.mocks).sort().reverse();
  const sst=d=>{const c=setCore(d),rp=reqParts(d),ra=rp.filter(x=>x.done).length;return c.ok?`핵심 ✓${rp.length?` · 숙제 필수 ${ra}/${rp.length}`:''}`:`용어 ${c.st.read}/${c.st.nc}${c.st.nq?` · 퀴즈 ${c.st.qa}/${c.st.nq}`:''}`;};
  const mst=D=>{const pr=S.mockp[D]||{},m=D==='app'?appMockObj():SETS.mocks[D],ps=mockParts(m);return ps.map(k=>`${MKP[k]} ${pr[k]?'✓':'○'}`).concat(D>=MOCK_GRADE_SINCE&&ps.length?[`채점 ${pr.g?'✓':'○'}`]:[]).join(' · ');};   /* 문제가 없는 모의(실전 응시 날 알림)는 채점 칸도 없다 */
  return topbar('세트 보관함')+`<h1 class="ptitle">세트 보관함</h1><div data-syncline>${syncLine()}</div><div class="btns"><button class="btn sec" data-act="sync">지금 받아 오기</button></div>
  ${sec('매일 세트',sd.length+'개',sd.length?`<div class="group">${sd.map(d=>{const s=SETS.sets[d],ok=setCore(d).ok;return row({ic:ok?'check':'paper',tone:ok?'ok':'',t:esc(korDate(d,true)),d:`${esc(s.title||'')}<span class="ds2">${esc(sst(d))}</span>`,act:'rev-open',data:{d}});}).join('')}</div>`:`<div class="empty"><b>아직 받은 세트가 없어요</b>평일 06:21 예약 작업이 만든 세트가 여기 쌓여요.</div>`)}
  ${sec('주간 모의고사',mdts.length+'개',mdts.length?`<div class="group">${mdts.map(d=>row({ic:'paper',tone:'amber',t:esc(korDate(d,true)),d:`${esc(SETS.mocks[d].title||'')}<span class="ds2">${esc(mst(d))}</span>`,act:'go',data:{h:'mock/'+d}})).join('')}</div>`:`<div class="empty"><b>아직 없어요</b>토요일 06:21쯤 만들어져요.</div>`)}`;}

/* ════════ 14. 화면: 연습(예전 암기·테스트 탭) ════════ */
const RANGES=[['week','이번 주 단원'],['all','전체'],['kichul','기출에 나온 카드'],['set','세트로 받은 카드'],['stars','별표 카드']];
function rangeLabel(v){const r=RANGES.find(x=>x[0]===v);if(r)return r[0]==='week'?'이번 주 단원'+(thisWeekUnits()?'('+thisWeekUnits().map(unitShort).join(', ')+')':'(이번 주는 전 범위)'):r[1];return unitName(Number(v));}
function rangeFilter(v){v=v||'week';if(v==='all')return()=>true;if(v==='week'){const u=thisWeekUnits();return c=>!u||u.includes(Number(c.u));}
  if(v==='kichul')return c=>(c.x||[]).length>0;if(v==='set')return c=>c.src==='set';if(v==='stars')return c=>pget(c.id).star;const n=Number(v);return c=>Number(c.u)===n;}
function rangeUnits(v){v=v||'week';if(v==='week')return thisWeekUnits();if(/^\d+$/.test(String(v)))return[Number(v)];return null;}
function rangeSelect(id,cur){return`<select class="select" id="${id}">${RANGES.map(r=>`<option value="${r[0]}"${cur===r[0]?' selected':''}>${esc(rangeLabel(r[0]))}</option>`).join('')}<optgroup label="단원">${PE_UNITS.map(u=>`<option value="${u.id}"${String(cur)===String(u.id)?' selected':''}>${u.id}. ${esc(u.n)}</option>`).join('')}</optgroup></select>`;}
/* 연습 탭: 스스로 고르는 연습만 모은 곳(파란 버튼 없음, 모두 줄). 범위 → 카드(카드 복습·새 카드·자유 연습·가리며 외우기) → 문제 6 → 실전 3 → 단원별 진도(접음).
   카드 복습은 늘 전체 단원(복습 탭과 같은 수), 범위는 새 카드·자유 연습·가리며 외우기·문제에 쓴다 */
function vPractice(){const rg=S.range||'week',pool=deck().filter(rangeFilter(rg)),t=todayStr(),N=cardsOut(t).length,learned=deck().filter(c=>pget(c.id).seen>0).length;
  const fresh=pool.filter(c=>!S.cards[c.id]||S.cards[c.id].seen===0).length,room=newRoom(),nw=Math.min(fresh,room),mr=resumeAt('memo:study'),lm=latestMockDate(),rounds=kichulRounds();
  const mk=D=>{const pr=S.mockp[D]||{};return mockParts(SETS.mocks[D]).map(k=>`${MKP[k]} ${pr[k]?'✓':'○'}`).join(' ')+(D>=MOCK_GRADE_SINCE?` 채점 ${pr.g?'✓':'○'}`:'');};
  const units=PE_UNITS.map(u=>{const cs=deck().filter(c=>Number(c.u)===u.id);const l=cs.filter(c=>pget(c.id).seen>0).length;const ok=cs.reduce((a,c)=>a+pget(c.id).ok,0),ng=cs.reduce((a,c)=>a+pget(c.id).ng,0);return{u,n:cs.length,l,acc:ok+ng?Math.round(ok/(ok+ng)*100):null};});
  return`<div class="ltitle"><div><h1>연습</h1><p class="lsub">학습한 카드 ${learned}/${deck().length}</p></div></div>
  <label class="f" for="rangeSel">범위</label>${rangeSelect('rangeSel',rg)}
  <p class="note">새 카드·자유 연습·가리며 외우기·문제에 써요. 카드 복습은 늘 전체 단원이에요.</p>
  ${sec('카드','',`<div class="group">
    ${row({ic:'redo',t:N?`카드 복습 ${N}장 · 전체 단원`:'카드 복습 · 전체 단원',d:N?'':'지금 돌아온 카드가 없어요',act:'start-due'})}
    ${row({ic:'cards',t:nw?`새 카드 ${nw}장`:'새 카드',d:!fresh?'이 범위의 새 카드는 다 봤어요':!room?`오늘 ${S.settings.newPerDay}장을 다 봤어요 · 설정에서 바꿔요`:`범위 안 · 하루 ${S.settings.newPerDay}장까지`,act:'start-study'})}
    ${row({ic:'shuffle',tone:pool.length?'':'gray',t:pool.length?`자유 연습 ${Math.min(30,pool.length)}장`:'자유 연습',d:pool.length?'범위에서 섞어서':'이 범위에 카드가 없어요',act:'start-free'})}
    ${row({ic:'layers',tone:pool.length||mr?'':'gray',t:mr?`가리며 외우기 이어서 (${mr})`:pool.length?`가리며 외우기 ${Math.min(pool.length,MEMO_MAX)}장 · 별표·오답 먼저`:'가리며 외우기',d:mr||pool.length?'':'이 범위에 카드가 없어요',act:'memo-study'})}
  </div>${mr?'<div class="btns" style="margin-top:4px"><button class="btn ghost" data-act="resume-clear" data-k="memo:study">이어 하지 않고 처음부터</button></div>':''}`)}
  ${sec('문제','',`<div class="group">
    ${row({ic:'list',t:'4지선다 10문',d:'설명을 보고 용어 고르기',act:'start-mcq'})}
    ${row({ic:'cards',t:'용어 회상 10문',d:'용어만 보고 정의·키워드 떠올리기',act:'start-recall'})}
    ${row({ic:'num',tone:'amber',t:'수치 빈칸 10문',d:'정의 속 기준값(%, MPa, 일, m…)을 가리고 맞히기',act:'start-cloze'})}
    ${row({ic:'pen',tone:'amber',t:'빈칸 쓰기 10문',d:'정의 속 낱말을 가리고 직접 써 넣기(하·중·상)',act:'start-fill'})}
    ${row({ic:'pen',t:'논술 목차 떠올리기 5문',d:'문제만 보고 소제목 떠올리기',act:'start-outline'})}
    ${row({ic:'paper',t:'단답 답안지 1문 · 10분',d:'기출 카드를 1교시 답안지 모양으로 보고 직접 쓰기',act:'dd-rand'})}
  </div>`)}
  ${sec('실전','',`<div class="group">
    ${lm?row({ic:'paper',tone:'amber',t:`${lm>=wkStart(t)?'주간 모의고사':'최근 모의고사'} · ${md(lm)}`,d:esc(mk(lm)),act:'go',data:{h:'mock/'+lm}}):row({ic:'paper',tone:'gray',t:'주간 모의고사',d:'토요일 06:21쯤 만들어져 여기 들어와요'})}
    ${row({ic:'layers',t:'기출 문제은행',d:`제${rounds.length?rounds[rounds.length-1].r:''}~${rounds.length?rounds[0].r:''}회 ${rounds.length}회분 · 회차별·단원별`,act:'go',data:{h:'kichul'}})}
    ${row({ic:'wand',t:'앱 모의고사 만들기',d:'기출·약점 가중으로 1~4교시',act:'gen-mock'})}
  </div>`)}
  <details class="d" style="margin-top:18px"${foldAt('units')}><summary>단원별 진도 · 학습 / 정답률</summary><div class="group">${units.map(x=>`<button class="unitbar" data-act="study-unit" data-u="${x.u.id}" style="width:100%"><span class="nm">${esc(x.u.n)}</span><span class="bar"><i style="width:${x.n?Math.round(x.l/x.n*100):0}%"></i></span><span class="c">${x.l}/${x.n}</span><span class="c" style="color:${x.acc==null?'var(--ink3)':x.acc>=80?'var(--ok)':x.acc>=60?'var(--amber)':'var(--red)'}">${x.acc==null?'—':x.acc+'%'}</span></button>`).join('')}</div><p class="note" style="margin:8px 16px 12px">단원을 누르면 그 단원의 카드 복습과 새 카드를 외워요(범위는 그대로).</p></details>`;}

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
/* 끝 화면을 처음 그릴 때 한 번: 세트 복습(80% 이상일 때만, D3), 테스트 기록(S.log), 오답·카드 복습 할 일 표시(S.tk). 버튼은 endBtns(§7.5 "다음") */
function sessDone(){const s=SES.stats,n=s.ok+s.mid+s.no,t=todayStr(),rd=SES.revD||SES.setD;
  if(SES.rvDue==null)SES.rvDue=SES.kind==='rev'?(SES.rv||[]).some(x=>reviewDue(x.d)):!!(rd&&reviewDue(rd));
  const en=enough(SES),dn=Object.keys(SES.done).length,a=(SES.acc?SES.acc.a:0)+dn,N=SES.acc?SES.acc.n:SES.items.length;
  if(SES.onDone&&!SES.doneRan){SES.doneRan=true;try{SES.onDone(SES);}catch(e){}}
  if(SES.rkey&&!SES.calDone){SES.calDone=1;resumeSet(SES.rkey,0,0);if(SES.setD)calMark('flash:'+SES.setD,'term',`${korDate(SES.setD)} 세트 카드 넘겨 보기 끝(${SES.items.length}장)`);}
  if(rd&&!SES.revRan){SES.revRan=1;const st=reviewDue(rd);if(st&&en)markReviewed(rd,st);}
  if(!SES.logged){SES.logged=1;if(SES.log&&n)logTest(SES.log,n,s.ok);const tk=S.tk||(S.tk={});
    if(SES.kind==='wrong'&&en)tk['wrong:'+t]=t;if(SES.kind==='cards'&&SES.k&&a>=Math.min(20,SES.k))tk['cards:'+t]=t;save();}
  const skip=SES.rvDue&&!en,ids=sessCardIds(),miss=(SES.miss||[]).filter(id=>card(id));
  const res=n?`맞힘 ${s.ok}${s.mid?` · 애매 ${s.mid}`:''} · 틀림 ${s.no}`:SES.kind==='flash'?`뒷면 본 카드 ${a}/${N}장`:`${a}/${N} 끝냄`;
  return topbar(SES.title||'학습')+`<div class="sheet endc" style="margin-top:18px"><p class="sheet-k">끝</p><h3>${esc(SES.title||'학습')} 완료</h3><p class="endr">${res}</p>
  ${skip?`<p class="ds endx">건너뛴 문제가 많아 오늘 세트 복습으로 치지 않았어요 (${a}/${N})</p>`:n&&s.no?'<p class="ds endx">틀린 것은 오답 노트에 모였어요. 두 번 연속 맞히면 빠집니다.</p>':''}
  <div class="endb">${endBtns(true)}</div>
  ${miss.length||ids.length?`<div class="endm"><p>외우기로 다지기</p>${miss.length?`<button class="btn ghost sm" data-act="memo-sess" data-only="miss">틀리거나 애매한 카드 가리며 외우기 (${miss.length}장)</button>`:''}${ids.length?`<button class="btn ghost sm" data-act="memo-sess">방금 본 카드 가리며 외우기 (${ids.length}장)</button>`:''}</div>`:''}</div>`;}
/* "로/으로"(받침이 있으면 으로, ㄹ 받침은 로) */
const roJo=w=>{const k=String(w).trim().slice(-1).charCodeAt(0)-0xAC00,f=k>=0&&k<11172?k%28:0;return f&&f!==8?'으로':'로';};
/* 끝 화면의 닫기 글: 올라갈 곳 이름 + 로("오늘로", "세트로", "복습으로"), 이름이 없으면 "돌아가기" */
const closeLab=up=>{const l=upLabel(up);return l==='뒤로'?'돌아가기':l+roJo(l);};
/* 끝 화면의 "다음": 앞 규칙이 이긴다. 1 끝까지 하지 않은 세트 복습(또는 오늘 줄의 카드 복습·오답) → 이어서, 2 세트 복습 잇기(SES.chain),
   3 오늘 줄의 흐름(FLOW: 그 줄의 다음 걸음 → 다음 오늘 줄), 4 이 일의 다음(endOwn), 5 오늘 순서로. 아래 규칙 중 처음 맞고 다른 것 하나는 "또는:" 줄.
   단추를 누를 때 같은 계산을 다시 해서 그대로 한다(end-go) */
function endNexts(){const t=todayStr(),sx=R.page==='sess'?SES:null,mx=R.page==='memo'?MEMO:null,o=sx||mx;if(!o)return[null,null];const C=[null,null,null,endOwn(sx,mx)];
  if(sx){const dn=Object.keys(sx.done||{}).length,a=(sx.acc?sx.acc.a:0)+dn,fl=!!FLOW&&FLOW.at==='sess'&&/^(cards|wrong):/.test(FLOW.id);
    if(sx.rvDue&&!enough(sx)||fl&&(sx.kind==='cards'&&sx.k&&a<Math.min(20,sx.k)||sx.kind==='wrong'&&!enough(sx)))C[0]={t:`이어서 · 남은 ${sx.items.length-dn}문제`,act:'sess-rest',key:'rest'};}
  const ch=(o.chain||[]).filter(x=>reviewDue(x));
  if(ch.length){const nx=ch[0],stp=reviewDue(nx),cp=o.cpos||[1,ch.length+1];
    C[1]={t:`다음 세트 복습: ${dlab(nx)} ${stp}일 차 (${cp[0]+1}/${cp[1]}) · ${revMin(nx)}분`,key:'rev:'+nx,dest:'rev:'+nx,go:()=>{const rid='rev:'+nx+':'+stp;if(FLOW&&taskList(t).some(x=>x.id===rid))FLOW.id=rid;
      startSetReview(nx,{chain:ch.slice(1),cpos:[cp[0]+1,cp[1]],from:o.from,keepFlow:true});}};}
  if(FLOW){const F=FLOW,x=taskList(t).find(q=>q.id===F.id),dn=flowDone(F.id);
    if(!dn&&x&&F.at!=='sess'&&F.at!=='memo'){const st=flowStep(F,x);C[2]={t:st.t,key:F.id,dest:st.dest,link:'오늘 순서: '+rowTxt(x).t,go:()=>taskGo(F.id,{replace:true})};}
    else if(dn){const n=flowNext(F.id);if(n)C[2]={t:`${n.t} · ${mfmt(n.row.left)}`,key:n.row.id,dest:rowDest(n.row),link:'오늘 순서: '+rowTitle(n.row),go:()=>flowGo(n.row)};}}
  const i=C.findIndex(Boolean),P=i<0?endToday(t):C[i],dst=x=>x.dest||x.key,L=i<0?null:C.slice(i+1).find(x=>x&&dst(x)!==dst(P))||null;   /* "또는:"은 다른 곳으로 가는 것만 */
  return[P,L];}
/* 오늘 줄이 아직 남았으면 그 줄의 다음 걸음 {t 이름(읽기 n/m · 세트 퀴즈 · 그 줄), dest 가는 곳} */
function flowStep(F,x){const kk=F.id.split(':')[0],d=F.at.split('/')[1]||x.d,c=d&&SETS.sets[d]?setCore(d):null;
  if(c&&c.r&&/^(set\.read|late|carry\.sets)$/.test(kk))return{t:`다음: 용어 읽기 ${c.st.read}/${c.st.nc}`,dest:'read:'+d};
  if(c&&c.q&&/^(set\.quiz|late|carry\.sets)$/.test(kk))return{t:`다음: 세트 퀴즈 ${c.st.nq}문`,dest:'quiz:'+d};
  return{t:`다음: ${rowTxt(x).t}`,dest:F.id};}
/* 다음 오늘 줄이 가는 곳: 세트 복습은 그 세트, 세트 퀴즈로 여는 줄(세트 퀴즈·읽기를 마친 밀린 세트)은 그 세트 퀴즈, 나머지는 그 줄 */
function rowDest(r){const x=r.task||{},k=r.id.split(':')[0];if(k==='rev')return'rev:'+r.id.split(':')[1];
  const d=k==='set.quiz'||k==='late'?x.d:k==='carry.sets'&&x.ds?x.ds[x.ds.length-1]:null,c=d&&SETS.sets[d]?setCore(d):null;
  return c&&c.q&&(k==='set.quiz'||!c.r)?'quiz:'+d:r.id;}
/* 규칙 5: 오늘 순서로(남은 오늘 몫이 없으면 "오늘 몫 끝 · 오늘로", 계획이 없는 날은 "오늘로") */
function endToday(t){const V=planToday(t),left=V.rows.some(r=>!r.done);return{t:!V.rows.length?'오늘로':left?'오늘 순서로':'오늘 몫 끝 · 오늘로',key:'today',r5:1,go:()=>goTab('today')};}
/* 규칙 4: 이 일의 다음(용어 퀴즈는 고른 방식대로, 세트 넘겨 보기·가리며 외우기는 남은 세트 퀴즈, 오답은 오답 카드 외우기, 문제는 같은 문제 10문 더) */
function endOwn(sx,mx){const quizNext=(d,from)=>{const c=d&&SETS.sets[d]?setCore(d):null;return c&&c.q?{t:`다음: 세트 퀴즈 ${c.st.nq}문`,key:'quiz:'+d,dest:'quiz:'+d,go:()=>{SV[d]='quiz';SV.scrollTo=c.st.qa?'.qcard.sq:not(.ans)':null;nav('set/'+d,{from});}}:null;};
  if(sx){const k=sx.kind;
    if(k==='gq'&&sx.gq){const g=sx.gq,L=gqList(g.d),r=gqRec(g.d),st=gqStat(g.d);if(!L||!st)return null;
      if(g.m==='round'){for(let j=0;j<st.rounds;j++){const q=r.slice(j*GQ_ROUND,(j+1)*GQ_ROUND);if(q.includes('-'))return{t:`다음: ${j+1}회 풀기 (${q.length}문)`,key:'gq:'+j,go:()=>startGq(g.d,'next')};}return null;}
      if(g.m==='t'){const ids=gqTermIds(g.d),i0=ids.indexOf(g.id);for(let j=1;j<=ids.length;j++){const id=ids[(i0+j)%ids.length],ns=L.items.map((q,n)=>q.id===id?n:-1).filter(n=>n>=0),c=card(id);
          if(id!==g.id&&ns.some(n=>r[n]==='-'))return{t:`다음: ${c?gqMain(c):id} (${ns.length}문)`,key:'gq:t:'+id,go:()=>startGq(g.d,'t:'+id)};}return null;}
      if(g.m==='rand')return{t:`다음: 무작위 ${Math.min(GQ_ROUND,st.n)}문 더`,key:'gq:rand',go:()=>startGq(g.d,'rand')};
      if(g.m==='wrong')return st.no?{t:`다음: 틀린 문제만 다시 (${st.no}문)`,key:'gq:wrong',go:()=>startGq(g.d,'wrong')}:null;return null;}
    if(k==='flash')return quizNext(sx.setD,sx.from);
    if(k==='wrong'){const n=wrongCardIds().length;return n?{t:`다음: 오답 카드 가리며 외우기 (${n}장)`,key:'memo:wrong',go:()=>memoWrong({from:sx.from})}:null;}
    const L={mcq:['4지선다 10문',startMCQ],recall:['용어 회상 10문',startRecall],cloze:['수치 빈칸 10문',startCloze],fill:['빈칸 쓰기 10문',()=>startFill(sx.lv||S.fillLv||'중',sx.fd||'')],outline:['논술 목차 떠올리기 5문',startOutline]}[k];
    return L?{t:`다음: ${L[0]} 더`,key:'own:'+k,go:L[1]}:null;}
  if(mx&&/^memo:set:/.test(mx.key))return quizNext(mx.setD,mx.from);
  return null;}
/* 끝 화면 단추: 파란 "다음" 하나("또는:" 한 줄) + 회색 닫기("{올라갈 곳}로", 끝난 세션·외우기를 지우고 위로). "오늘 순서로"가 오늘로 가는 닫기와 같으면 하나만.
   세션·외우기 안에서 연 외우기는 "돌아가기 · 그 이름"(그 화면으로) */
function endBtns(isS){const up=upOf(R),ca=isS?'sess-close':'memo-close';
  if(!isS&&MEMO&&(MEMO.outer||MEMO.from==='sess'&&SES&&/^memo:(sess|one)$/.test(MEMO.key)))return`<button class="btn" data-act="memo-close">돌아가기 · ${esc((MEMO.outer?MEMO.outer.title:SES.title)||'가리며 외우기')}</button>`;
  const[P,L]=endNexts(),same=!!P.r5&&nh(up)==='today';
  const pb=P.act==='sess-rest'?`<button class="btn" data-act="sess-rest">${esc(P.t)}</button>`:same?`<button class="btn" data-act="${ca}">${esc(P.t)}</button>`:`<button class="btn" data-act="end-go" data-w="p">${esc(P.t)}</button>`;
  return pb+(L?`<p class="endor"><button class="lnk" data-act="end-go" data-w="l">${esc(L.link||'또는: '+L.t.replace(/^다음: /,''))}</button></p>`:'')+(same?'':`<div class="btns"><button class="btn sec" data-act="${ca}">${esc(closeLab(up))}</button></div>`);}
function sessAdvance(){SES.i++;SES.back=false;SES.answered=null;if(SES.rkey)resumeSet(SES.rkey,SES.i,SES.items.length);render();window.scrollTo(0,0);}
/* 끝 화면 "이어서 · 남은 n문제": 안 한 항목만 새 세션으로. 한 수(acc)는 앞 세션에 더해 세고, 끝나면 같은 세트 복습으로 친다 */
function sessRest(){const s=SES;if(!s)return;const dn=Object.keys(s.done).length,rd=s.revD||s.setD,r0=(s.rv||[])[0]||{};
  chainSession({kind:s.kind,title:s.title,items:s.items.filter((_,i)=>!s.done[i]),onDone:s.onDone,rv:s.rv,revD:s.revD,setD:s.setD,log:s.log,requeue:s.requeue,chain:s.chain,cpos:s.cpos,k:s.k,gq:s.gq,lv:s.lv,fd:s.fd,
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
  startSession({kind:'study',title:o.newOnly?'새 카드':/^\d+$/.test(String(range))?unitName(range)+' 카드 외우기':'카드 복습 · 새 카드',items:cardItems(due.concat(fresh).map(c=>c.id)),requeue:true});}
/* 카드 복습에 나올 카드: 간격이 돌아온 카드 가운데 오늘 이미 매긴 것은 뺀다(같은 날 두 번 올리지 않음). 오늘 화면의 "카드 복습" 수도 이것으로 센다 */
function dueNow(){const t=todayStr();return dueCards(null).filter(c=>pget(c.id).last!==t);}
/* 카드 복습: dueNow에서 o.skip(오늘 세트 복습에 들어 있는 카드)은 빼고, o.k장까지. o.weak: 정답률 낮은 단원부터(3단계 "약점 단원 먼저") */
function startDueAll(o){o=o||{};const sk=new Set(o.skip||[]);let ids=dueNow().map(c=>c.id).filter(id=>!sk.has(id));
  if(o.weak){const A={};deck().forEach(c=>{const p=pget(c.id),a=A[c.u]||(A[c.u]={ok:0,ng:0});a.ok+=p.ok;a.ng+=p.ng;});const acc=id=>{const a=A[(card(id)||{}).u];return a&&a.ok+a.ng?a.ok/(a.ok+a.ng):1;};ids.sort((x,y)=>acc(x)-acc(y));}
  if(o.k)ids=ids.slice(0,o.k);
  startSession({kind:'cards',title:'카드 복습',items:cardItems(ids),requeue:true,k:o.k||null});}
function startFree(){startSession({kind:'free',title:'자유 연습',items:cardItems(shuffle(deck().filter(rangeFilter(S.range))).slice(0,30).map(c=>c.id))});}
/* 세트 복습 항목: 세트 카드(오늘 이미 매긴 카드는 빼서 같은 날 두 번 올리지 않음)와 세트 퀴즈 */
function setReviewItems(d){const s=SETS.sets[d],t=todayStr(),items=[];(s.cards||[]).forEach((_,i)=>{const id=setCardId(d,i);if(id&&pget(id).last!==t)items.push({type:'card',id});});(s.quiz||[]).forEach((_,i)=>items.push({type:'quiz',d,i}));return items;}
/* 복습 날이 아니면(step 없음) 세트 복습 기록을 남기지 않는다(D4). 80% 이상 끝냈을 때만 친다(D3). 카드를 모두 오늘 매겨 항목이 없으면 바로 친다 */
function revNow(rv){rv.forEach(x=>markReviewed(x.d,x.step));touchDay();closeModal();toast('오늘 이미 본 카드라 세트 복습으로 쳤어요');render();}
function startSetReview(d,o){o=o||{};const step=reviewDue(d),items=setReviewItems(d);if(!items.length&&step&&setIds(d).length)return revNow([{d,step}]);
  startSession({kind:'rev',title:korDate(d)+(step?' 세트 복습':' 세트 다시 풀기'),items,rv:step?[{d,step}]:[],chain:o.chain,cpos:o.cpos,acc:o.acc,from:o.from,keepFlow:o.keepFlow,onDone:s=>{if(step&&enough(s))markReviewed(d,step);}});}
function startSetReviewAll(){const rv=dueSetReviews();let items=[];rv.forEach(x=>{items=items.concat(setReviewItems(x.d));});if(!items.length&&rv.length&&rv.every(x=>setIds(x.d).length))return revNow(rv);
  startSession({kind:'rev',title:'세트 복습',items,rv,onDone:s=>{if(enough(s))rv.forEach(x=>markReviewed(x.d,x.step));}});}
/* o.skipQ: 그 날짜 세트의 퀴즈 오답은 빼기(그날 숙제 "틀린 이유 한 줄"로 다룬다) */
function startWrong(o){o=o||{};const wl=wrongList().filter(w=>!(o.skipQ&&w.type==='quiz'&&w.d===o.skipQ));startSession({kind:'wrong',title:'오답 다시 풀기',items:shuffle(wl.map(w=>w.type==='card'?{type:'card',id:w.id,wrongKey:w.key}:w.type==='quiz'?{type:'quiz',d:w.d,i:w.i,wrongKey:w.key}:w.type==='fill'?Object.assign(fillItem(card(w.id),S.fillLv||'중')||{type:'card',id:w.id},{wrongKey:w.key}):w.type==='gq'?{type:'gq',d:w.d,n:w.n,wrongKey:w.key}:{type:'cloze',id:w.id,k:w.k,wrongKey:w.key}))});}
function startFill(lv,d){let pool;if(d){const s=SETS.sets[d];pool=((s&&s.cards)||[]).map((_,i)=>card(setCardId(d,i))).filter(Boolean);}else{pool=deck().filter(rangeFilter(S.range));const seen=pool.filter(c=>pget(c.id).seen>0);if(seen.length>=10)pool=seen;}
  const items=shuffle(pool).slice(0,10).map(c=>fillItem(c,lv)).filter(Boolean);startSession({kind:'fill',title:'용어 빈칸 쓰기'+(d?', '+korDate(d)+' 세트':''),items,log:'fill',revD:d||null,lv,fd:d||''});}
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
/* 이어 하기 키: 세트는 memo:set:날짜, 그 밖(연습 탭 memo:study, 복습 탭 memo:rev·memo:wrong·memo:stars)은 그날 카드 목록째로.
   세션에서 넘어온 것(memo:sess)과 카드 한 장(memo:one)은 늘 새로 */
/* from: 연 곳(주소 그대로, 세션·끝 화면에서 열면 sess). 이어서 열면 연 곳을 새로 적는다(T4). 외울 카드가 없으면 알리기만 하고 하던 외우기는 그대로.
   가리며 외우기 안에서 연 외우기(카드 창의 "가리며 외우기")는 바깥 외우기를 outer에 두고, 끝내거나 닫으면 그 카드로 돌아간다(T5).
   끝난 외우기의 끝 화면에서 열면 그 외우기의 연 곳과 바깥 외우기를 물려받는다(#memo 자신을 연 곳으로 적지 않게) */
function startMemo(o,fresh){const onM=R.page==='memo'&&!!MEMO,inMemo=onM&&!MEMO.fin,from=nh(o.from)||(onM?nh(MEMO.from):curH());
  if(!fresh&&MEMO&&MEMO.key===o.key&&!MEMO.fin){memoStop();if(!inMemo)MEMO.from=from;flowKeep(o);return nav('memo');}
  let r=fresh?null:resumeGet(o.key),ri=r?r.i:0;
  if(r&&r.ids){const ok=r.ids.filter(id=>card(id));if(ok.length){ri=r.ids.slice(0,r.i).filter(id=>card(id)).length;o.items=ok.map(id=>({id}));}else r=null;}   /* 이어 하는 목록에서 지운 카드는 빼고 자리를 다시 센다(다 지웠으면 새로) */
  if(!o.items||!o.items.length)return toast('외울 카드가 없어요');
  const outer=inMemo?MEMO:(o.outer||(onM&&MEMO.outer)||null);memoStop();flowKeep(o);
  MEMO=Object.assign({i:0,run:false,phase:'show',left:null,cnt:0,done:false,t0:0,started:Date.now()},o,{from:outer?nh(outer.from):from,outer});
  if(r&&ri<MEMO.items.length){MEMO.i=ri;if(ri)toast(`${ri+1}번째 카드부터 이어서 해요`);}
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
/* 가리며 외우기 끝 화면: 세션 끝 화면과 같은 단추(endBtns) */
function memoDoneHTML(){const n=MEMO.items.length,min=Math.max(1,Math.round((MEMO.fin-MEMO.started)/60000));
  return topbar(MEMO.title||'가리며 외우기')+`<div class="sheet endc" style="margin-top:18px"><p class="sheet-k">끝</p><h3>${esc(MEMO.title||'가리며 외우기')} 완료</h3><p class="endr">외운 카드 ${n}장 · ${min}분</p>
  <div class="endb">${endBtns(false)}</div><div class="endm"><button class="btn ghost sm" data-act="memo-again">처음부터 다시</button></div></div>`;}
function vMemo(){if(!MEMO)return topbar('가리며 외우기')+`<div class="empty" style="margin-top:20px"><b>진행 중인 외우기가 없어요</b><div class="btns"><button class="btn" data-act="go" data-h="today">오늘로</button></div></div>`;
  if(MEMO.fin)return memoDoneHTML();
  const it=memoItem(),c=card(it.id),cf=memoCfg(),n=MEMO.items.length,last=MEMO.i+1>=n,fin=last&&MEMO.done&&!MEMO.edit;
  if(!c)return topbar(MEMO.title||'가리며 외우기')+`<div class="empty"><b>이 카드를 찾을 수 없어요</b><div class="btns">${last?'<button class="btn" data-act="memo-finish">완료</button>':'<button class="btn" data-act="memo-next">건너뛰기</button>'}</div></div>`;   /* 외우기의 다음·완료(세션의 건너뛰기가 아님) */
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
/* 연습 탭에서: 범위 안에서 별표 → 오답 → 덜 익힌 카드 순으로 20장 */
function memoStudyIds(){const pool=deck().filter(rangeFilter(S.range||'week'));const sc=c=>{const p=pget(c.id);return(p.star?0:10)+(S.wrong['C:'+c.id]||S.wrong['F:'+c.id]?0:5)+Math.min(p.box||0,6);};
  return pool.map((c,i)=>({c,i,s:sc(c)})).sort((a,b)=>a.s-b.s||a.i-b.i).slice(0,MEMO_MAX).map(x=>x.c.id);}
/* 이어 하기: 나갔다 다시 들어오면 보던 카드부터(S.resume[키] = {i, n, day, ids?}, ids가 있는 목록은 그날만) */
function resumeGet(key){const r=S.resume&&S.resume[key];if(!r||!(r.i>0)||r.i>=r.n)return null;if(r.ids&&r.day!==todayStr())return null;return r;}
function resumeAt(key){if(MEMO&&MEMO.key===key&&!MEMO.fin)return MEMO.i>0?`${MEMO.i+1}/${MEMO.items.length}`:'';
  if(SES&&SES.rkey===key&&SES.i<SES.items.length)return SES.i>0?`${SES.i+1}/${SES.items.length}`:'';
  const r=resumeGet(key);return r?`${r.i+1}/${r.n}`:'';}
function resumeSet(key,i,n,ids){if(!key)return;S.resume=S.resume||{};if(i>0&&i<n)S.resume[key]=Object.assign({i,n,day:todayStr()},ids?{ids}:{});else delete S.resume[key];save();}
/* 세트 카드 넘겨 보기: 하다 만 세션이면 그 자리로(연 곳을 새로, T4), 아니면 저장한 자리부터 */
function setFlash(d){const rk='flash:'+d;if(SES&&SES.rkey===rk&&SES.i<SES.items.length){if(R.page!=='sess')SES.from=curH();flowKeep();return nav('sess');}
  const s=SETS.sets[d];if(!s)return;const items=(s.cards||[]).map((_,i)=>({type:'card',id:setCardId(d,i),si:i})).filter(x=>x.id);const r=resumeGet(rk),i0=r&&r.i<items.length?r.i:0;
  /* 이어서 할 때 그 앞 카드 가운데 이미 본 것(세트의 읽음: 뒷면을 봤거나 펼쳐 읽음)은 끝낸 것으로 센다. 넘기기만 한 카드는 "이어서"로 남는다 */
  const rs=spGet(d).read||{},done={};items.slice(0,i0).forEach((x,j)=>{if(rs[x.si])done[j]=1;});
  if(i0)toast(`${i0+1}번째 카드부터 이어서 해요`);return startSession({kind:'flash',title:korDate(d)+' 세트 카드',items,setD:d,rkey:rk,i:i0,done});}
function memoWrong(o){return startMemo(Object.assign({key:'memo:wrong',label:'오답 카드',title:'오답 카드 가리며 외우기',items:wrongCardIds().map(id=>({id}))},o||{}));}
function memoSet(d){const s=SETS.sets[d];if(!s)return;const items=(s.cards||[]).map((_,i)=>({id:setCardId(d,i),si:i})).filter(x=>x.id);return startMemo({key:'memo:set:'+d,label:korDate(d)+' 세트',title:korDate(d)+' 가리며 외우기',items,setD:d});}

/* ════════ 16. 화면: 기출(연습 → 실전 "기출 문제은행") ════════ */
function vKichul(){const mode=R.a||'r';const rounds=kichulRounds();
  if(mode==='r'&&R.b)return vKRound(Number(R.b));
  if(mode==='u'&&R.b)return vKUnit(Number(R.b));
  const all=[];rounds.forEach(r=>r.q.forEach(q=>all.push(q)));
  const byU=PE_UNITS.map(u=>({u,n:all.filter(q=>q.u===u.id).length,n1:all.filter(q=>q.u===u.id&&q.p===1).length})).sort((a,b)=>b.n-a.n);const mx=Math.max.apply(null,byU.map(x=>x.n).concat([1]));
  const body=mode==='u'?`<div class="group">${byU.map(x=>`<button class="unitbar" data-act="go" data-h="kichul/u/${x.u.id}" style="width:100%"><span class="nm">${esc(x.u.n)}</span><span class="bar"><i style="width:${Math.round(x.n/mx*100)}%"></i></span><span class="c">${x.n}</span><span class="c" style="color:var(--ink2)">${(x.n/all.length*100).toFixed(1)}%</span></button>`).join('')}</div>
      <p class="note">${rounds.length}회분 ${all.length}문항 기준. 막대 옆 숫자는 문항 수와 비중이에요.</p>`
    :`<div class="group">${rounds.map(r=>row({ic:'layers',t:`제${r.r}회`,d:`${esc(r.d)} 시행`,act:'go',data:{h:'kichul/r/'+r.r}})).join('')}</div>`;
  return topbar('기출 문제은행')+`<h1 class="ptitle">기출 문제은행</h1><p class="lsub">제${rounds.length?rounds[rounds.length-1].r:''}~${rounds.length?rounds[0].r:''}회 ${all.length}문항</p>
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

/* 모의고사(예약 작업이 만든 것 + 앱이 만든 것): 교시마다 → 채점을 차례로(.stepper). 지금 교시만 펼치고(문제와 화면 안 타이머), 앞으로 쓸 교시는 접어 두고, 다 쓴 교시는 한 줄(되돌리기).
   아래 붙은 막대가 이 화면의 하나뿐인 파란 버튼: n교시 시작 · 타이머(이 화면에 머묾) → n교시 다 썼어요 → … → 채점 받았어요 → 다음 오늘 줄. 그 교시 타이머가 도는 동안은 집중 모드.
   채점과 "다 쓴 뒤 열어보기"는 접은 칸으로 늘 있다(채점 요청 복사·열기 버튼도): 채점은 교시를 다 쓰면, 열어보기는 채점을 받거나 열면 펼친다.
   MOCK_GRADE_SINCE 전 모의는 채점을 단계로 묻지 않는다(채점 칸은 선택) */
const MOCK_LAB={p1:'1교시 단답',p2:'2교시 논술',p3:'3교시 논술',p4:'4교시 논술'};
const mockObj=d=>d==='app'?appMockObj():SETS.mocks[d];
const mockName=d=>d==='app'?'앱 모의고사':korDate(d)+' 모의고사';
/* 교시 타이머: 1교시 100분(문제 10개 몫마다 알림), 논술 6문 미만은 문제당 25분(직접 25×n분, 문제마다 알림), 6문이면 논술 교시 100분 */
function mockPre(m,pk){const n=((m&&m[pk])||[]).length;return pk==='p1'?{k:'p1',mins:100}:n<6?{k:'custom',mins:25*n,parts:n}:{k:'essay',mins:100};}
const mockTitle=(m,pk)=>pk!=='p1'&&m[pk].length<6?`${MOCK_LAB[pk]} ${m[pk].length}문`:MOCK_LAB[pk];
const mockSub=(m,pk)=>{const n=m[pk].length;return pk==='p1'?(n>10?`${n}문 중 10문 · 100분`:`${n}문 · 100분`):n<6?'문제당 25분':`${n}문 중 4문 · 100분`;};
/* 지금 단계(cur): 이 모의의 교시 타이머(돌거나 멈췄거나 막 끝남)가 있으면 그 교시 → 고른 교시(want, 없으면 mockWant)가 안 썼으면 그 교시 → 안 쓴 첫 교시
   → (채점을 묻는 모의면) 'g' 채점 → null 끝. want '-'는 지금 할 교시 없음(오늘 줄은 끝, 다음 줄은 다른 곳: 안 쓴 교시는 접은 칸, 아래 막대는 "✓ 끝 · 다음").
   그래서 토요일 "2교시 시작" 줄로 오면 2교시부터, 1교시를 되돌려도 도는 2교시 타이머는 그대로 지금 교시 */
function mockStep(D,want){const m=mockObj(D),ps=mockParts(m),pr=S.mockp[D]||{},g=D>=MOCK_GRADE_SINCE,op=ps.filter(k=>!pr[k]),c=TM.ctx,w=want===undefined?mockWant(D):want;
  let cur=c&&c.kind==='mock'&&c.D===D&&tLive(c)&&op.includes(c.pk)?c.pk:null;
  if(!cur&&w!=='-')cur=op.includes(w)?w:op[0]||(g&&ps.length&&!pr.g?'g':null);
  return{m,ps,pr,g,cur};}
/* 고른 교시: 단계 줄에서 누른 교시(SV['mkw:'+D], 누를 때의 오늘 줄 흐름이 그대로일 때만) → 오늘 줄이 연 교시(FLOW 'mock:D:p2' → p2).
   그 줄을 다 했으면 오늘 순서의 다음 줄이 이 모의의 교시·채점일 때만 그것('g'), 다른 곳이면 '-'. 오늘 줄에서 오지 않았으면 null(안 쓴 첫 교시) */
function mockWant(D){const F=FLOW&&FLOW.at==='mock/'+D?FLOW:null,w=SV['mkw:'+D];if(w&&w.f===(F?F.id:''))return w.k;if(!F)return null;
  const pk=(F.id.match(/^mock:[^:]+:(p\d)$/)||[])[1];if(pk&&!(S.mockp[D]||{})[pk])return pk;if(!/^mock(\.g)?:/.test(F.id)||!flowDone(F.id))return null;
  const n=flowNext(F.id),x=n&&n.row.task||{};return x.d===D&&x.k==='mock'?x.pk:x.d===D&&x.k==='mock.g'?'g':'-';}
/* 아래 막대: 지금 교시를 시작(타이머) → 그 교시 타이머가 돌거나 끝났으면 다 썼어요 → 채점 받았어요 → 오늘 줄에서 왔으면 다음 오늘 줄, 아니면 돌아가기 */
function mockNext(D){const{m,ps,cur}=mockStep(D),e=esc(D);if(!ps.length)return null;
  if(cur&&cur!=='g')return tLive({kind:'mock',D,pk:cur})?{t:`${MKP[cur]} 다 썼어요`,a:`data-act="mock-part" data-d="${e}" data-k="${cur}"`}:{t:`${MKP[cur]} 시작 · 타이머 ${mockPre(m,cur).mins}분`,a:`data-act="mock-start" data-d="${e}" data-k="${cur}"`};
  if(cur==='g')return{t:'채점 받았어요',a:`data-act="mock-graded" data-d="${e}"`};
  const F=FLOW&&FLOW.at==='mock/'+D?FLOW:null,n=F&&flowNext(F.id),a=`data-act="mock-next" data-d="${e}"`;
  return n?{t:`✓ 끝 · ${n.t} · ${mfmt(n.row.left)}`,a,go:()=>flowGo(n.row)}:F?{t:'✓ 끝 · 오늘 몫 끝 · 오늘로',a,go:()=>goTab('today')}:{t:'모의고사 끝 · 돌아가기',a,go:()=>goUp()};}
function mockStart(D,pk){const m=mockObj(D);if(!m||!((m[pk]||[]).length))return render();const P=mockPre(m,pk);
  return setPresetAsk(P.k,()=>{tStart();render();tlShow();},{ctx:{kind:'mock',D,pk,label:MOCK_LAB[pk],short:MKP[pk]},no:render,mins:P.k==='custom'?P.mins:undefined,parts:P.parts,name:MOCK_LAB[pk],n:P.mins});}
function vMock(){const d=R.a,{m,ps,pr,g,cur}=mockStep(d),e=esc(d);
  if(!m)return topbar('모의고사')+`<div class="empty" style="margin-top:20px"><b>모의고사가 없어요</b><div class="btns"><button class="btn" data-act="gen-mock">앱이 만들기</button></div></div>`;
  const head=topbar(mockName(d))+`<h1 class="ptitle">${esc(m.title||'모의고사')}</h1>`;
  if(!ps.length)return head+`<div class="empty" style="margin-top:12px"><b>이번엔 문제가 없어요</b>${esc(m.notice||'')}</div>`;
  const all=ps.every(k=>pr[k]),reveal=SV['mk:'+d],lab={p1:'1교시',p2:'2교시',p3:'3교시',p4:'4교시'};
  const qs=k=>`<div class="group">${m[k].map((q,i)=>`<div class="paper-q"><span class="n">${i+1}</span><span class="q">${esc(typeof q==='string'?q:q.t)}${q&&q.x?`<span class="u">기출 ${esc([].concat(q.x).map(kLabelShort).join(', '))}</span>`:''}</span></div>`).join('')}</div>`;
  const live=cur&&cur!=='g'&&tLive({kind:'mock',D:d,pk:cur}),tm=!!TM.ctx&&TM.ctx.kind==='mock'&&TM.ctx.D===d&&tLive(TM.ctx);
  /* 단계 줄: 안 쓴 다른 교시를 누르면 그 교시가 지금 교시(이 모의 타이머가 있는 동안은 그 교시 그대로) */
  const steps=ps.map(k=>[MKP[k],!!pr[k],k===cur,k]).concat(g?[['채점',!!pr.g,cur==='g','g']]:[]);
  const stepper=steps.length<2?'':`<ol class="stepper">${steps.map(([l,dn,c,k],i)=>{const pk=!dn&&!c&&!tm&&k!=='g',in_=`<i>${dn?'✓':i+1}</i><span>${l}</span>`;
    return`<li class="${dn?'done':c?'cur':pk?'pick':''}">${pk?`<button data-act="mock-pick" data-d="${e}" data-k="${k}" aria-label="${l}부터 하기">${in_}</button>`:in_}</li>`;}).join('')}</ol>`;   /* 단계가 하나면(채점을 묻지 않는 1교시만) 단계 줄은 없이 */
  const tip=cur==='p1'&&!live?'<p class="note mtip">09:00에 시작하면 실제 시험과 같아요 · 문제 고르기 3분 → 시간 엄수 → 공란 금지</p>':'';
  const guide=(m.guide||[]).length?`<ul class="mguide">${m.guide.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  /* 오늘의 "채점하기" 줄로 왔는데 안 쓴 교시가 있으면: 그 교시를 펼치고 한 줄 안내(채점 칸은 접은 채) */
  const gF=!!(FLOW&&FLOW.at==='mock/'+d&&/^mock\.g:/.test(FLOW.id)),gNote=gF&&cur&&cur!=='g'?'<p class="note mgn">채점은 다 쓴 뒤에 해요. 먼저 이 교시를 써요.</p>':'';
  /* 안 쓴 교시마다 시작 · 타이머와 타이머 없이 다 썼어요(지금 교시는 아래 막대가 파란 버튼, 접은 교시는 보조 버튼) */
  const part=(k,i)=>{const brk=i&&!pr[k]?'<p class="brk">쉬는 시간 · 답안 사진 찍기</p>':'',nt=`<button class="lnk" data-act="mock-part" data-d="${e}" data-k="${k}">타이머 없이 다 썼어요</button>`;
    if(pr[k])return`<div class="mdone"><span class="mdk">✓</span><span class="mdt">${esc(mockTitle(m,k))} · 다 썼어요</span><button class="lnk" data-act="mock-undo" data-d="${e}" data-k="${k}">되돌리기</button></div>`;
    if(k===cur)return brk+`<section class="mcur"><div class="sec-h"><h2>지금: ${esc(mockTitle(m,k))}</h2><span class="meta">${esc(mockSub(m,k))}</span></div>${gNote}${live?timerInlineHTML({kind:'mock',D:d,pk:k}):''}${qs(k)}
      ${live?'':`<p class="mnot">${nt}</p>`}</section>`;
    return brk+`<details class="d mpart"${foldAt('mp:'+d+':'+k)}><summary><span class="fs">${esc(mockTitle(m,k))}<small>${esc(mockSub(m,k))}</small></span></summary><div class="in-d">
      <div class="btns mpgo"><button class="btn sm sec" data-act="mock-start" data-d="${e}" data-k="${k}">${MKP[k]} 시작 · 타이머 ${mockPre(m,k).mins}분</button></div>${qs(k)}<p class="mnot">${nt}</p></div></details>`;};
  /* 채점(교시를 다 쓰면 펼침, 오늘의 "모의 점수 적기" 줄로 오면 펼침): 답안 사진 → 채점 요청 복사 → 점수(선택) → 채점 받았어요 */
  const gOpen=all||!!(FLOW&&FLOW.at==='mock/'+d&&/^x\.trend:/.test(FLOW.id));
  const grade=`<details class="d mgrade"${foldPref('mg:'+d,gOpen)}><summary><span class="fs">${g?'채점':'채점 (선택)'}<small>${pr.g?'채점 받았어요 ✓ · '+md(pr.g):all?'답안 사진 → 채점 요청 → 채점 받았어요':'교시를 다 쓴 뒤에 해요'}</small></span></summary><div class="in-d">
    <ol class="msteps"><li><span>답안 사진 찍기</span></li><li><span>사진과 함께 채점 요청 붙여 넣기</span><button class="btn sm sec" data-act="copy-mock" data-d="${e}">채점 요청 복사</button></li>
      <li><span>점수 적기(선택)</span><div class="mscore">${ps.map(k=>`<label>${k[1]}교시 <input class="in" type="number" inputmode="numeric" min="0" max="100" data-act="mock-score" data-d="${e}" data-k="${k}" value="${pr.sc&&pr.sc[k]!=null?pr.sc[k]:''}" aria-label="${k[1]}교시 점수">점</label>`).join('')}</div></li></ol>
    ${pr.g?`<p class="mgd"><span>채점 받았어요 ✓ · ${esc(md(pr.g))}</span><button class="lnk" data-act="mock-graded" data-d="${e}">되돌리기</button></p>`:cur==='g'?'':`<div class="btns"><button class="btn sec" data-act="mock-graded" data-d="${e}">채점 받았어요</button></div>`}
    <p class="note">${pr.g?'':'Claude 채점을 받으면 누르세요. '}점수는 적고 싶을 때만(통계·주간 리포트에 나와요).</p></div></details>`;
  const rev=`<details class="d mrev"${foldPref('mr:'+d,!!reveal||!!pr.g)}><summary><span class="fs">다 쓴 뒤 열어보기<small>키워드·목차</small></span></summary><div class="in-d">${reveal?`<div class="group plain">${ps.map(k=>m[k].map((q,i)=>{if(typeof q==='string')return'';if(k==='p1')return`<div class="row noic"><span class="tx"><span class="tt">${i+1}. ${esc(q.t)}</span><span class="ds">${esc((q.k||[]).join(', '))}</span></span></div>`;
      return`<div class="row noic" style="align-items:flex-start"><span class="tx"><span class="tt">${lab[k]} ${i+1}. ${esc(q.t)}</span><span class="ds">${esc((q.o||[]).join(' / '))}${q.fig?'<br>그림·표: '+esc(q.fig):''}</span></span></div>`;}).join('')).join('')}</div>`
    :`<button class="btn sec" data-act="mock-reveal" data-d="${e}">${pr.g?'키워드·목차 열기':'채점 전에는 보지 마세요 — 열기'}</button>`}</div></details>`;
  const n=mockNext(d);
  return head+stepper+tip+guide+ps.map(part).join('')+`<div class="mfold">${grade}${rev}</div>`
    +`<p class="mlinks"><button class="lnk" data-act="copy-mock-q" data-d="${e}">문제만 복사</button><span>·</span><button class="lnk" data-act="go" data-h="guide">답안 작성 요령</button></p>`
    +(n?`<div class="nextbar"><button class="btn" ${n.a}>${esc(n.t)}</button></div>`:'');}
function appMockObj(){const m=S.lastMock;if(!m)return null;const toQ=(arr,isP1)=>(arr||[]).map(t=>{if(isP1){const c=deck().find(x=>x.t===t);return{t,k:c?(c.k||[]).slice(0,3):[]};}const e=essays().find(x=>x.t===t);return{t,o:e?e.o:[],fig:''};});
  return{title:'앱 모의고사, '+korDate(m.date),guide:['기출·별표·오답에 가중치를 둔 무작위 세트예요.'],p1:toQ(m.p1,true),p2:toQ(m.p2),p3:toQ(m.p3),p4:toQ(m.p4)};}
function pickByUnit(items,n,wf){const byU={};items.forEach(it=>{(byU[it.u]=byU[it.u]||[]).push(it);});const out=[];let us=shuffle(Object.keys(byU));let g=0;
  while(out.length<n&&g++<600){if(!us.length)us=shuffle(Object.keys(byU).filter(u=>byU[u].length));if(!us.length)break;const u=us.shift();const arr=byU[u];if(!arr||!arr.length)continue;const w=arr.map(wf);const tot=w.reduce((a,b)=>a+b,0);let r=Math.random()*tot,k=0;for(;k<arr.length;k++){r-=w[k];if(r<=0)break;}k=Math.min(k,arr.length-1);out.push(arr[k]);arr.splice(k,1);}return out;}
function genMock(){const wC=c=>(c.f||2)+(c.x&&c.x.length?2:0)+(pget(c.id).star?2:0)+(pget(c.id).ng>pget(c.id).ok?1:0);const wE=e=>(e.f||2)+(e.x&&e.x.length?2:0)+((S.essayStat[e.id]||{}).weak>0?1:0);
  const m={date:todayStr(),kind:'all',p1:pickByUnit(deck(),13,wC).map(c=>c.t)};let rem=essays().slice();['p2','p3','p4'].forEach(pk=>{const sel=pickByUnit(rem,6,wE);m[pk]=sel.map(e=>e.t);const ids=new Set(sel.map(e=>e.id));rem=rem.filter(e=>!ids.has(e.id));});
  S.lastMock=m;delete S.mockp.app;if(TM.ctx&&TM.ctx.D==='app'){TM.ctx=null;TM.ended=null;}touchDay();save();nav('mock/app');toast('모의고사 세트를 만들었어요');}   /* 새로 만든 앱 모의고사는 "다 썼어요"를 비우고 시작 */
function mockText(m){const lab={p1:'1교시 단답형(13문 중 10문 선택, 각 10점, 100분)',p2:'2교시 논술형(6문 중 4문, 각 25점, 100분)',p3:'3교시 논술형(6문 중 4문, 각 25점, 100분)',p4:'4교시 논술형(6문 중 4문, 각 25점, 100분)'};
  let s=`[토목시공기술사 모의고사${m.title?' — '+m.title:''}]\n`;['p1','p2','p3','p4'].forEach(k=>{if(m[k]&&m[k].length){s+=`\n■ ${lab[k]}\n`;m[k].forEach((q,i)=>{const t=typeof q==='string'?q:q.t;s+=`${i+1}. ${k==='p1'&&!/시오\.?$/.test(t)?t+'에 대하여 설명하시오.':t}\n`;});}});return s;}
function roundText(r){const lab={1:'1교시 단답형(13문 중 10문, 각 10점)',2:'2교시 논술형(6문 중 4문, 각 25점)',3:'3교시 논술형(6문 중 4문, 각 25점)',4:'4교시 논술형(6문 중 4문, 각 25점)'};
  let s=`[제${r.r}회 토목시공기술사 기출(${r.d}) — 문제 요지]\n`;[1,2,3,4].forEach(p=>{s+=`\n■ ${lab[p]}\n`;r.q.filter(q=>q.p===p).sort((a,b)=>a.n-b.n).forEach(q=>{s+=`${q.n}. ${q.t}\n`;});});return s;}

/* 통계: 학습한 카드, 이번 주 필수 n%(이번 주 화면과 같은 수), 핵심 끝낸 세트, 주간 기록(지난 주들의 점수), 단원별 정답률, 세트 퀴즈·모의 점수, 최근 테스트 */
function vStats(){const t=todayStr(),cs=deck();weekSnap(t);const b=weekBoard(t),core=b.lines.find(l=>l.k==='core')||{a:0,b:0},learned=cs.filter(c=>pget(c.id).seen>0).length,inPlan=b.w>=0&&t<=PLAN.target.d;   /* 준비 시작 전·시험 뒤는 이번 주 점수가 없다 */
  const rows=PE_UNITS.map(u=>{const ucs=cs.filter(c=>Number(c.u)===u.id);const ok=ucs.reduce((a,c)=>a+pget(c.id).ok,0),ng=ucs.reduce((a,c)=>a+pget(c.id).ng,0),l=ucs.filter(c=>pget(c.id).seen>0).length;return{u,ok,ng,l,n:ucs.length,acc:ok+ng?ok/(ok+ng):null};});
  const last=S.log.slice(-8).reverse();const nm={mcq:'4지선다',recall:'회상',outline:'목차',cloze:'수치 빈칸',fill:'용어 빈칸 쓰기'};
  const wks=Object.keys(S.wk||{}).filter(W=>W<b.W&&S.wk[W]&&S.wk[W].at&&S.wk[W].p!=null).sort().reverse().slice(0,8),run=wkRun(b.W);
  const ss=Object.keys(SETS.sets).map(setStatus).filter(Boolean),qa=ss.reduce((a,x)=>a+x.qa,0),qk=ss.reduce((a,x)=>a+x.qok,0);
  const ms=Object.keys(S.mockp||{}).filter(D=>/^\d{4}-/.test(D)&&S.mockp[D]&&S.mockp[D].sc&&Object.keys(S.mockp[D].sc).length).sort().reverse().slice(0,6);
  const pt=x=>{if(!x||!x.parts)return'';const ks=Object.keys(x.parts),r=rParts(ks.map(k=>x.parts[k]),x.pct);return ks.map((k,i)=>`${PART_N[k]||k} ${r[i]}`).join(SEP);};
  return topbar('통계')+`<h1 class="ptitle">통계</h1>
  <div class="tiles" style="margin-top:12px"><div class="tile"><b>${learned}<small style="font-size:.9rem;color:var(--ink2)">/${cs.length}</small></b><span>학습한 카드</span></div><div class="tile"><b>${b.pct==null?(inPlan?'체크':'—'):b.pct+'%'}</b><span>이번 주 필수</span></div><div class="tile"><b>${core.a}/${core.b}</b><span>핵심 끝낸 세트</span></div></div>
  ${sec('주간 기록',run?`60% 넘은 주 ${run}주 연속`:'',`${inPlan||wks.length?`<div class="group">${inPlan?row({t:esc(weekLabel(b.w))+' · 이번 주',d:esc(b.pct==null?'시험 주 · 점수 대신 체크':`다 하면 ${b.reach}% · ${(r=>b.parts.map(([k],i)=>`${PART_N[k]} ${r[i]}`).join(SEP))(rParts(b.parts.map(p=>p[1]),b.pct))}`),v:b.pct==null?'체크':b.pct+'%'}):''}
    ${wks.map(W=>{const x=S.wk[W];return row({t:esc(weekLabel(wkIdx(wkFrom(W)))),d:esc(`${md(wkFrom(W))}~${md(addDays(W,6))}${x.lv?' · '+LV_TXT[x.lv].split(' · ')[0]:''}${pt(x)?' · '+pt(x):''}`),v:x.p+'%'});}).join('')}</div>`:'<div class="empty">아직 기록이 없어요</div>'}
    <p class="note">필수와 이번 주 목표만 세요 · 60%면 합격선, <span class="nw">80%면 잘 지킨 주.</span> 지난 주는 그 주가 끝난 뒤 처음 연 날 고정해요.</p>`)}
  ${sec('단원별','학습 / 정답률 / ★',`<div class="group" style="padding:4px 8px"><table class="t">${rows.map(r=>`<tr><td>${esc(r.u.n)}</td><td class="n">${r.l}/${r.n}</td><td class="n" style="color:${r.acc==null?'var(--ink3)':r.acc>=.8?'var(--ok)':r.acc>=.6?'var(--amber)':'var(--red)'}">${r.acc==null?'—':Math.round(r.acc*100)+'%'}</td><td class="n">${cs.filter(c=>Number(c.u)===r.u.id&&pget(c.id).star).length}</td></tr>`).join('')}</table></div>`)}
  ${sec('퀴즈·모의 점수','',`<div class="group">${row({t:'세트 퀴즈 정답률',d:`받은 세트 ${ss.length}개, 푼 문제 ${qa}문`,v:qa?Math.round(qk/qa*100)+'%':'—',zero:!qa})}${ms.map(D=>{const sc=S.mockp[D].sc;return row({t:esc(korDate(D)+' 모의고사'),d:esc(Object.keys(sc).sort().map(k=>`${k[1]}교시 ${sc[k]}점`).join(' · ')),v:Math.round(Object.values(sc).reduce((a,v)=>a+v,0)/Object.keys(sc).length)+'점'});}).join('')}</div>`)}
  ${sec('최근 테스트','',last.length?`<div class="group">${last.map(l=>row({t:esc(nm[l.type]||l.type),d:esc(l.d),v:`${l.ok}/${l.total}`})).join('')}</div>`:'<div class="empty">아직 기록이 없어요</div>')}
  <div class="btns" style="margin-top:20px"><button class="btn" data-act="report" data-w="${b.W}">주간 리포트 복사</button></div><p class="note">복사한 내용을 Claude 프로젝트에 프롬프트 7과 함께 붙여 넣으면 다음 주 조정안을 받아요. 토·일요일에 복사하면 이번 주 리포트로 쳐요.</p>`;}
/* 주간 리포트: 그 주(W, 월~일)의 기록. 이번 주는 오늘까지(이번 주 화면과 같은 계산), 지난 주는 그 주 일요일까지(점수는 고정한 S.wk[W]) */
function weeklyReport(W){const t=todayStr(),cs=deck();W=W||wkStart(t);const E=addDays(W,6),end=E<t?E:t,cur=W===wkStart(t),w=wkIdx(wkFrom(W)),bd=cur?t:E,b=weekBoard(bd),oop=wkIdx(bd)<0||bd>PLAN.target.d,snap=!cur&&S.wk&&S.wk[W]&&S.wk[W].at?S.wk[W]:null,inW=d=>!!d&&d>=wkFrom(W)&&d<=end;
  const nm={core:'세트 핵심',mock:'모의',dd:'단답',eo:'목차',w:'새 용어 쓰기',essay:'논술 실전',redo:'모의 오답 다시 쓰기',fg:'그림·표',rot:'카드 50장 돌리기',rev:'세트 복습',close:'주간 리포트'},ord=['core','mock','essay','redo','dd','eo','w','fg','rot','rev','close'];
  const L=[`[기술사 6개월 주간 리포트] ${wkFrom(W)} ~ ${end} (${weekLabel(w)}${oop?'':', '+phaseObj(w).n})`],wl=cur?'이번 주':W===addDays(wkStart(t),-7)?'지난주':'그 주',pct=snap?snap.p:b.pct,lv=snap?snap.lv:b.lv;
  const ln=b.lines.slice().sort((x,y)=>ord.indexOf(x.k)-ord.indexOf(y.k)).map(l=>`${nm[l.k]||l.label} ${l.a}/${l.b}${l.cut?'(줄인 목표)':''}`).join(', ');
  L.push((oop?`${wl}는 ${wkIdx(bd)<0?'준비 시작 전이라':'시험 뒤라'} 필수 점수가 없어요`:b.chk||pct==null?`${wl}는 시험이 든 주라 점수 대신 체크: ${(b.check||[]).map(([n,v])=>n+' '+(v?'✓':'○')).join(', ')}${ln?'. '+ln:''}`:`${wl} 필수 ${pct}%${lv?`(넘침 단계 ${lv})`:''}: ${ln}`)+`, 연속 학습 ${streak()}일`);
  /* 그 주에 정한 쉬는 날·짧은 날, 고정한 지난 주면 그 일요일에 남은 필수(놓아준 것) */
  const dz=Object.keys(S.days||{}).filter(d=>d>=W&&d<=E).sort();if(dz.length)L.push('쉬는 날·짧은 날: '+dz.map(d=>`${dlab(d)} ${S.days[d].m===0?'쉼':mfmt(S.days[d].m)}`).join(' · '));
  if(snap&&snap.left>0)L.push(`놓아준 필수 약 ${mfmt(snap.left)}`);
  if(S.settings.nextTarget){const N=S.settings.nextTarget;L.push(`시험 일정: ${dlab(N.from)}부터 제${nextR(N)}회로 바꿔요`);}
  const wk=cs.filter(c=>inW(pget(c.id).last));let ok=0,ng=0;wk.forEach(c=>{const p=pget(c.id);ok+=p.ok;ng+=p.ng;});
  L.push(`카드: 전체 ${cs.length}장 중 학습 ${cs.filter(c=>pget(c.id).seen>0).length}장, 이 주에 다룬 카드 ${wk.length}장, 누적 정답률 ${ok+ng?Math.round(ok/(ok+ng)*100):0}%, 카드 복습 ${cardsOut(t).length}장`);
  const ws=Object.keys(SETS.sets).filter(inW);L.push(`세트 ${ws.length}개 중 핵심 끝 ${ws.filter(d=>setStatus(d).core).length}개, 세트 퀴즈 정답 ${ws.reduce((a,d)=>a+setStatus(d).qok,0)}/${ws.reduce((a,d)=>a+setStatus(d).nq,0)}`);
  const D=Object.keys(SETS.mocks).filter(x=>/^\d{4}-/.test(x)&&inW(x)).sort().pop();
  if(D){const pr=S.mockp[D]||{},sc=pr.sc||{};L.push(`주간 모의고사 ${md(D)}: ${mockParts(SETS.mocks[D]).map(k=>`${k[1]}교시 ${pr[k]?'다 씀':'안 씀'}`).join(', ')}${pr.g?' · 채점 받음':''}${Object.keys(sc).length?' · '+Object.keys(sc).sort().map(k=>`${k[1]}교시 ${sc[k]}점`).join(' · '):''}`);}
  L.push(`오답 노트 ${Object.keys(S.wrong).length}개, 세트 복습 남은 ${dueSetReviews().length}개`);
  L.push('단원별 정답률(누적) / 학습 수:');PE_UNITS.forEach(u=>{const ucs=cs.filter(c=>Number(c.u)===u.id);const o=ucs.reduce((a,c)=>a+pget(c.id).ok,0),n=ucs.reduce((a,c)=>a+pget(c.id).ng,0),l=ucs.filter(c=>pget(c.id).seen>0).length;L.push(` - ${u.n}: ${o+n?Math.round(o/(o+n)*100)+'%':'—'} (${l}/${ucs.length})`);});
  const lg=S.log.filter(l=>inW(l.d));if(lg.length)L.push(`테스트 ${lg.length}회: `+lg.map(l=>`${l.type} ${l.ok}/${l.total}`).join(', '));
  const stars=cs.filter(c=>pget(c.id).star).slice(0,15).map(c=>c.t);if(stars.length)L.push('별표(어려움) 카드: '+stars.join(', '));
  const wr=wrongList().slice(0,12).map(x=>x.label);if(wr.length)L.push('오답 노트 상위: '+wr.join(' / '));
  return L.join('\n');}

/* ════════ 17. 화면: 더보기와 하위 화면 ════════ */
/* 시험 일정 줄: 첫 줄 "10월 19일 시작 · 29주", 둘째 줄 목표 "제142회 · 5월 15일(토, 예상)"(날짜는 모두 "M월 D일", 회차·날짜는 줄 안에서 끊기지 않음) */
function vMore(){const s=S.sync||{};const rp=repoPlanState(),N=S.settings.nextTarget,l3=N?`${dlab(N.from)}부터 제${nextR(N)}회 일정이에요`:slipCheck(todayStr())?'시험 일정을 살펴볼 때예요':'';   /* 셋째 줄(회색): 바꾸기를 기다리는 일정, 미룰지 살펴볼 때 */
  const me=PE_IO.member();
  return`<div class="ltitle"><div><h1>더보기</h1>${me?`<p class="lsub">아이디 ${esc(me.id)}</p>`:''}</div></div>
  ${me&&me.admin?sec('관리','',`<div class="group">${row({ic:'mail',t:'문자함',d:`<span data-ibxn>${ibxTxt()}</span>`,act:'ibx'})}${row({ic:'check',tone:'ok',t:'승인 관리',d:'승인 요청, 회원, 초대 코드',act:'go',data:{h:'admin'}})}</div>`):''}
  ${sec('시험 일정','',`<div class="group">${row({ic:'flag',tone:rp==='diff'?'red':'',t:'준비 시작일·목표 회차',d:`${esc(korDate(S.settings.start))} 시작 · ${PLAN.E}주<br><span class="nw">제${PLAN.target.r}회</span> · <span class="nw">${esc(korDate(PLAN.target.d))}(${DAYK[parse(PLAN.target.d).getDay()]}${esc(estTag(PLAN.target).replace(/^\((.+)\)$/,', $1'))})</span>${rp==='diff'?'<br><b style="color:var(--red)">예약 작업 일정과 달라요</b>':''}${l3?`<br><span class="nw">${esc(l3)}</span>`:''}`,act:'go',data:{h:'schedule'}})}</div>`)}
  ${sec('공부 도구','',`<div class="group">${row({ic:'caldot',t:'학습 달력',d:'접속한 날과 끝낸 공부',act:'go',data:{h:'cal'}})}${row({ic:'cal',t:PLAN.E+'주 로드맵',d:'단계·주차별 목표와 학원 대체표',act:'go',data:{h:'plan'}})}${row({ic:'pen',t:'답안 작성 요령',d:'모범 답안으로 보는 답안지 쓰는 법',act:'go',data:{h:'guide'}})}${row({ic:'timer',t:'교시 타이머',d:'100분, 문제 경계마다 알림',act:'go',data:{h:'timer'}})}${row({ic:'chat',t:'Claude 프롬프트',d:'첨삭·카드 생성·주간 리포트 등 10개',act:'go',data:{h:'prompts'}})}</div>`)}
  ${sec('데이터','',`<div class="group">${row({ic:'sync',t:'지금 받아 오기',d:syncing?'받아 오는 중…':s.last&&!s.ok?'<span class="sfail">받아 오지 못했어요</span>':'',act:'sync'})}${row({ic:'imp',t:'카드·목차 가져오기',d:'Claude가 만든 JSON 붙여넣기',act:'go',data:{h:'imp'}})}${row({ic:'save',t:'백업·복원',d:(S.tk||{}).backup?'마지막 백업 '+md(S.tk.backup):'아직 백업한 적이 없어요',act:'go',data:{h:'backup'}})}</div>`)}
  ${sec('앱','',`<div class="group">${row({ic:'gear',t:'설정',d:'하루 공부 시간, 새 카드 수, 글자 크기, 테마',act:'go',data:{h:'settings'}})}${row({ic:'info',t:'콘텐츠 출처',d:'카드·기출·세트가 어디서 왔는지',act:'go',data:{h:'about'}})}${me&&!me.admin?row({ic:'mail',t:'관리자와 문자',d:`<span data-mtn>${mtTxt()}</span>`,act:'go',data:{h:'msg'}}):''}</div>`)}
  <p class="note">기록은 이 휴대폰에만 저장돼요. 1~2주에 한 번 백업해 두세요.</p><p class="note vfoot">기술사 6개월 v${APP_VER}</p>`;}
/* 학습 달력: 앱을 연 날(접속 시각)과 그날 끝낸 공부를 종류별 동그라미로 */
const CAL_K=[['term','용어'],['essay','논술'],['quiz','퀴즈·테스트'],['mock','모의고사'],['todo','할 일']];
const CAL_LOG={fill:['term','용어 빈칸 쓰기'],outline:['essay','논술 목차 떠올리기'],mcq:['quiz','4지선다'],recall:['quiz','용어 회상'],cloze:['quiz','수치 빈칸']};
/* 그날 한 것: 달력 기록(S.cal) + 원래 기록(카드 매김·테스트·오늘 할 일·세트 다시 보기) */
function calItems(ds){const out=[],c=S.cal[ds]||{},x=c.x||{},dl=S.daily[ds];
  if(dl&&dl.graded)out.push(['term',`카드 ${dl.graded}장 매김${dl.newSeen?`(처음 본 카드 ${dl.newSeen}장)`:''}`]);
  Object.keys(x).forEach(k=>out.push(x[k]));
  Object.keys(S.sp).forEach(d=>{if(x['rev:'+d])return;const r=S.sp[d].rev||{};const st=Object.keys(r).filter(k=>r[k]===ds).map(Number);if(st.length)out.push(['term',`${korDate(d)} 세트 복습(${Math.max(...st)}일 차)`]);});
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
function calDayBody(ds){const t=todayStr(),its=calItems(ds),ins=calIn(ds),was=calWas(ds,its),ev=milestones().filter(m=>m.d===ds),fw=ds>t?calFwd(t)[ds]:null;const cnt=k=>its.filter(x=>x[0]===k).length;
  return`${ins.length?`<p class="chin"><b>접속 ${ins.length}번</b> ${esc(ins.length>8?ins.slice(0,7).join(' · ')+' …':ins.join(' · '))}</p>`:''}${KR_HOLI[ds]?`<p class="cev hol">공휴일 · ${esc(KR_HOLI[ds])}</p>`:''}${ev.map(m=>`<p class="cev">${esc(m.t)}</p>`).join('')}${fw?`<p class="cev fw">앞으로(이번 주): ${esc(fwTxt(fw))}</p>`:''}
  <div class="ch5">${CAL_K.map(([k])=>`<div class="${cnt(k)?'on':''}"><i class="k-${k}">${cnt(k)||''}</i><span>${CAL_S[k]}</span></div>`).join('')}</div>
  ${its.length?CAL_K.filter(([k])=>cnt(k)).map(([k,l])=>`<p class="chh"><i class="cdot k-${k}"></i>${l} ${cnt(k)}</p><div class="group chg k-${k}-l">${its.filter(x=>x[0]===k).map(x=>`<div class="row noic"><span class="tx"><span class="tt">${esc(x[1])}</span></span></div>`).join('')}</div>`).join('')
    :`<div class="empty" style="margin-top:12px">${ds>t?'아직 오지 않은 날이에요':ds===t?'아직 끝낸 공부가 없어요. 오늘 몫 1번부터 시작해 보세요':was?'앱을 열었지만 끝낸 공부는 없어요':'기록이 없어요'}</div>`}`;}
/* 홈 화면 왼쪽 위 달력 아이콘: 이달·오늘 날짜와 오늘 끝낸 공부 점 */
function calIconHTML(){const t=todayStr(),d=parse(t),ks=calKinds(calItems(t));
  return`<button class="calbtn" data-act="go" data-h="cal" aria-label="학습 달력, 오늘 끝낸 공부 보기"><span class="cm">${d.getMonth()+1}월</span><b>${d.getDate()}</b><span class="cdots">${ks.map(k=>`<i class="k-${k}"></i>`).join('')}</span></button>`;}
/* 볼 수 있는 달: 기록이 시작된 달 ~ 12달 뒤(목표 시험이 더 뒤면 그 달까지). 앞으로 올 달은 공휴일·시험일을 미리 본다 */
function calBounds(){const t=todayStr(),d=parse(t),ahead=fmt(new Date(d.getFullYear(),d.getMonth()+12,1)).slice(0,7),ex=String((PLAN.target&&PLAN.target.d)||'').slice(0,7);
  return[([S.created,PLAN.start].concat(Object.keys(S.daily),Object.keys(S.cal)).filter(Boolean).sort()[0]||t).slice(0,7),ex>ahead?ex:ahead];}
function calShift(v,anim){const[y,m]=(SV.calM||todayStr().slice(0,7)).split('-').map(Number),nm=fmt(new Date(y,m-1+v,1)).slice(0,7),[fm,cm]=calBounds();
  if(nm>cm)return toast('더 뒤의 달은 볼 수 없어요');if(nm<fm)return toast('기록이 시작되기 전 달이에요');
  SV.calM=nm;SV.calD=null;SV.calAnim=anim?(v>0?'nx':'pv'):null;render();SV.calAnim=null;}
/* 이번 주에 남은 일(오늘 다음 날 ~ 일요일, 이번 주 줄과 같은 계산): 토요일 주간 모의고사(주황), 일요일 주간 마감(보라), 세트 복습이 돌아오는 날(회색).
   달력에 빈 동그라미로만(끝낸 공부 점과 구별). 지난 주·다음 주에는 찍지 않는다. {날짜: {mock, close, rev: 개수}} */
const FW_K={mock:['k-mock','주간 모의고사'],close:['k-todo','주간 마감'],rev:['k-rev','세트 복습']};
function calFwd(t){t=t||todayStr();const out={};if(wkIdx(t)<0||t>PLAN.target.d)return out;
  const W=wkStart(t),E=addDays(W,6),b=weekBoard(t),L=k=>b.lines.find(l=>l.k===k),put=(d,k)=>{if(d>t&&d<=E){const o=out[d]||(out[d]={});o[k]=(o[k]||0)+1;}};
  const m=L('mock');if(m&&!(m.b&&m.a>=m.b))put(addDays(W,5),'mock');
  const c=L('close');if(c&&!c.a)put(E,'close');
  ((L('rev')||{}).pairs||[]).filter(x=>!x.done&&x.due>t).forEach(x=>put(x.due,'rev'));
  return out;}
const fwTxt=o=>Object.keys(FW_K).filter(k=>o&&o[k]).map(k=>FW_K[k][1]+(k==='rev'&&o[k]>1?' '+o[k]+'개':'')).join(' · ');
function vCal(){const t=todayStr(),ym=SV.calM||t.slice(0,7),sel=SV.calD;const[y,mo]=ym.split('-').map(Number);
  const lead=new Date(y,mo-1,1).getDay(),nd=new Date(y,mo,0).getDate(),ev={};milestones().forEach(m=>{ev[m.d]=1;});
  const[fm,cm]=calBounds(),FW=calFwd(t);let nfw=0;
  const sum={was:0};CAL_K.forEach(([k])=>{sum[k]=0;});let cells='';for(let i=0;i<lead;i++)cells+='<span class="cd emp"></span>';
  for(let dd=1;dd<=nd;dd++){const ds=fmt(new Date(y,mo-1,dd)),its=calItems(ds),ks=calKinds(its),was=calWas(ds,its),dw=(lead+dd-1)%7,fw=FW[ds];
    if(was)sum.was++;ks.forEach(k=>{sum[k]++;});if(fw)nfw++;
    cells+=`<button class="cd${ds===t?' today':''}${ds===sel?' sel':''}${was?' was':''}${ds>t?' fut':''}${ev[ds]?' ev':''}${KR_HOLI[ds]?' hol':''}${dw===0?' sun':dw===6?' sat':''}" data-act="cal-day" data-d="${ds}" aria-label="${esc(korDate(ds)+(KR_HOLI[ds]?', '+KR_HOLI[ds]:'')+(fw?', 앞으로 '+fwTxt(fw):''))}"><span class="n">${dd}</span>${KR_HOLI[ds]?`<span class="hn">${esc(holiShort(KR_HOLI[ds]))}</span>`:''}<span class="dots">${ks.map(k=>`<i class="k-${k}"></i>`).join('')}${fw?Object.keys(FW_K).filter(k=>fw[k]).map(k=>`<i class="fwd ${FW_K[k][0]}"></i>`).join(''):''}</span></button>`;}
  return topbar('학습 달력')+`<div class="calhero"><div class="chtop"><div><p class="sheet-k">오늘 끝낸 공부</p><h2>${esc(korDate(t,true))}</h2></div><div class="chst"><b class="num">${streak()}</b><span>일 연속</span></div></div>${calDayBody(t)}</div>
  <div class="calsw"><div class="calhd"><button class="btn sm sec" data-act="cal-mon" data-v="-1" aria-label="이전 달" ${ym>fm?'':'disabled'}>‹</button><b>${y}년 ${mo}월</b><button class="btn sm sec" data-act="cal-mon" data-v="1" aria-label="다음 달" ${ym<cm?'':'disabled'}>›</button></div>
  <div class="calw">${'일월화수목금토'.split('').map((d,i)=>`<span class="${i===0?'sun':i===6?'sat':''}">${d}</span>`).join('')}</div>
  <div class="calg${SV.calAnim?' '+SV.calAnim:''}">${cells}</div></div>
  <div class="callg">${CAL_K.map(([k,l])=>`<span><i class="cdot k-${k}"></i>${l}${sum[k]?` <b>${sum[k]}일</b>`:''}</span>`).join('')}<span><i class="cdot was"></i>접속 <b>${sum.was}일</b></span>${nfw?'<span><i class="cdot fwd"></i>앞으로(이번 주)</span>':''}</div>
  <p class="note">날짜를 누르면 그날 내용이 나와요. 옆으로 밀면 이전·다음 달이에요.${ym!==t.slice(0,7)?' <button class="lnk" data-act="cal-today">이번 달로</button>':''}</p>`;}
function vPlan(){const t=todayStr(),cw=weekIndex(),E=PLAN.E,ms=milestones();
  const groups=PE_PHASES.map(p=>({p,ws:[]}));for(let a=0;a<=E;a++){const o=weekObj(a);const g=groups.find(x=>x.p.id===o.ph)||groups[1];g.ws.push(o);}
  return topbar('로드맵')+`<h1 class="ptitle">${E}주 로드맵</h1><p class="lsub">${esc(korDate(PLAN.begin))} 시작 → 제${PLAN.target.r}회 필기 ${esc(PLAN.target.d)}${esc(estTag(PLAN.target))}${PLAN.mock?`, 실전 모의 제${PLAN.mock.r}회`:''}. 1단계 단원 순서는 최근 기출 13회분(제128~140회) 출제 비중을 따라 짰어요.</p>
  <div class="btns"><button class="btn sm sec" data-act="go" data-h="schedule">시험 일정 바꾸기</button></div>
  <details class="d" style="margin-top:14px"><summary>시험 구조와 합격 기준</summary><div class="in-d"><ul style="margin:0 0 0 18px;padding:0;color:var(--ink2)">${[PE_EXAM.structure,PE_EXAM.p1,PE_EXAM.p234,PE_EXAM.pass,PE_EXAM.interview,PE_EXAM.docs].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
   <table class="t" style="margin-top:10px"><tr><th>연도</th>${PE_EXAM.rates.map(r=>`<th>${r[0]}</th>`).join('')}</tr><tr><td>필기 합격률</td>${PE_EXAM.rates.map(r=>`<td class="n">${r[1]}</td>`).join('')}</tr></table><p class="note">${esc(PE_EXAM.interviewRate)}. ${esc(PE_EXAM.schedule2026)}</p></div></details>
  ${sec('마일스톤','',`<div class="group">${ms.map(m=>row({ic:'flag',tone:m.d<t?'gray':m.k==='exam'?'red':'',t:esc(m.t),d:esc(m.d)+(m.d>=t?`, D-${diffDays(t,m.d)}`:', 지남')})).join('')}</div>`)}
  ${(r=>`<details class="d" style="margin-top:14px"><summary>요일별 루틴(참고) · ${esc(phaseObj(cw).n)}</summary><div class="in-d">${[['wd','평일'],['sat','토요일'],['sun','일요일']].map(([k,l])=>`<p class="ds" style="margin:8px 0 2px;font-weight:700">${l}</p><ul style="margin:0 0 0 18px;padding:0;color:var(--ink2)">${(r[k]||[]).map(x=>`<li>${esc(tabWords(x))}</li>`).join('')}</ul>`).join('')}<p class="note">오늘 화면의 "오늘 몫"이 이 루틴을 할 일로 바꿔 보여 줘요. 앱이 기록으로 끝을 아는 일은 따로 체크하지 않아요.</p></div></details>`)(PE_ROUTINES[phaseKey(cw)]||PE_ROUTINES[1])}
  ${groups.filter(g=>g.ws.length).map(g=>{const a0=g.ws[0].w,a1=g.ws[g.ws.length-1].w;const open=cw>=a0&&cw<=a1;
    return`<details class="d" ${open?'open':''}><summary><span>${esc(g.p.n)} <span class="ds" style="display:inline">${a0===a1?a0+'주차':a0+'~'+a1+'주차'}</span></span></summary><div class="in-d" style="padding:0"><p class="ds" style="padding:0 16px 8px">${esc(fillT(g.p.g))}</p>
      ${g.ws.map(w=>{const r=weekRange(w.w);const ev=ms.filter(m=>m.d>=r[0]&&m.d<=r[1]);return`<div class="wk ${w.w===cw?'now':''}"><h4>${w.w}주차: ${esc(w.t)}</h4><div class="dt">${md(wkFrom(r[0]))}~${md(r[1])}${w.u&&w.u.length?', '+esc(w.u.map(unitName).join(' · ')):''}</div>${ev.length?`<div class="dt" style="color:var(--red);font-weight:600;margin-top:4px">${ev.map(m=>esc(md(m.d)+' '+m.t)).join('<br>')}</div>`:''}<ul>${w.goals.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${w.out?`<div class="dt" style="margin-top:6px">산출물: ${esc(w.out)}</div>`:''}</div>`;}).join('')}</div></details>`;}).join('')}
  ${sec('학원 대신 무엇으로','',`<div class="group" style="padding:4px 8px"><table class="t">${PE_ACADEMY.map(a=>`<tr><td style="width:34%"><b>${esc(a.a)}</b></td><td>${esc(a.b)}</td></tr>`).join('')}</table></div>`)}
  ${sec('Claude 활용 순서','',PE_CLAUDE_ROUTINE.map((r,i)=>`<details class="d"><summary>${i+1}. ${esc(r.n)}</summary><div class="in-d"><p style="margin:0;color:var(--ink2)">${esc(r.d)}</p></div></details>`).join(''))}
  ${sec('답안 작성 10계명','',PE_TIPS.map((x,i)=>`<details class="d"><summary>${i+1}. ${esc(x.t)}</summary><div class="in-d"><p style="margin:0;color:var(--ink2)">${esc(x.d)}</p></div></details>`).join(''))}`;}
let SCH=null;
/* 변경 요청(Claude Code에 붙여 넣는 글). 바꾸기를 기다리는 중이면 기다리는 새 목표로, 그 월요일 전날 전에는 실행하지 말라는 한 줄을 더한다 */
function schReq(){const N=S.settings.nextTarget,p=planSig(N?computePlan(S.settings.start,N.r):PLAN);const ov=S.settings.roundDates||{};const rounds=Object.keys(ov).sort().map(r=>` --round ${r}=${ov[r]}`).join('');
  const b0=S.settings.start;   /* 시작일이 월요일이 아니면 예약 작업에는 그 주 월요일(p.start)을 넣어 주차를 맞춘다 */
  return`기술사 6개월 앱의 시험 일정을 바꿨어요. 예약 작업 저장소에도 같은 일정을 넣어 주세요.${b0!==p.start?`
앱의 준비 시작일은 ${dlab(b0)}이에요. 주차를 앱과 맞추려고 그 주 월요일(${p.start})을 --start로 넣어요.`:''}${N?`
앱은 ${dlab(N.from)}부터 새 일정이에요. ${dlab(addDays(N.from,-1))} 전이면 실행하지 말고 그날 다시 붙여 달라고 답해 주세요.`:''}
1) add_repo 도구로 woos-lee94/gisulsa-data 를 push 권한으로 붙이고 클론
2) python3 pipeline/tool.py set-plan --start ${p.start} --target ${N?N.r:S.settings.target||'auto'} --clear-rounds${rounds}
   (출력의 목표 ${p.target}회 ${p.exam}, 실전 모의 ${p.mock?p.mock+'회 '+p.mockDate:'없음'}과 같은지 확인)
3) git add -A && git commit -m "일정 변경: ${p.start} 시작, 제${p.target}회 목표" && git fetch origin main && git rebase origin/main && git push origin HEAD:main`;}
/* 미룰지 살펴볼 까닭의 글(이번 주·지난주 기록 줄 t·d, 시험 일정 칸 ds·meta) */
function slipTxt(c){if(!c)return null;
  if(c.why==='apply'){const pd=`${md(c.ap)}~${md(c.ae)}`;return{t:`제${c.T0.r}회 원서접수를 했나요?`,d:`접수 기간(${pd})이 지났어요`,ds:`제${c.T0.r}회 원서접수 기간(${pd})이 지났어요.`,meta:''};}
  const n=c.ps.length,d=c.why==='pace'?(c.low>=n?`최근 ${n}주가 모두 60%보다 낮아요`:`최근 ${n}주 가운데 ${c.low}주가 60%보다 낮아요`):`3단계 전에 쉬는 날이 ${c.offN}일이에요`;
  return{t:'시험 일정 살펴보기',d,ds:d+'.',meta:c.why==='pace'?`최근 ${n}주 ${c.ps.map(p=>p+'%').join(' · ')}`:''};}
/* 이번 주 탭·지난주 기록 창의 "시험 일정 살펴보기" 줄(회색, 시험 일정으로) */
const slipRow=x=>row({ic:'flag',tone:'gray',t:esc(x.t),d:esc(x.d),act:'go',data:{h:'schedule'}});
/* "제143회 · 8월 28일(토, 예상)" */
const rndT=x=>`제${x.r}회 · ${korDate(x.d)}(${DAYK[parse(x.d).getDay()]}${estTag(x).replace(/^\((.+)\)$/,', $1')})`;
/* 시험 일정: 지금 회차와 다음 두 회차 견주기. 미룰지 살펴볼 때(slipCheck)는 열린 칸 "시험을 미룰지 살펴봐요"(까닭·추천·지금 일정대로 할게요), 아니면 닫힌 "다음 회차와 비교" */
function schCmpHTML(t,c){const tx=slipTxt(c),T0=PLAN.target,ap=addDays(T0.d,-PE_SCHED.annBefore),ae=addDays(ap,3),ok=!!(S.tk||{})['apply:'+T0.r];
  const rs=roundRows(t).map(o=>{const tt=esc(rndT(o.P.target))+(o.cur?'<span class="tag">지금</span>':c&&o.r===c.nx.r?'<span class="tag">추천</span>':''),
    l1=[`시험까지 ${o.wk}주`,`1·2단계 ${o.p12}주 남음`].concat(o.p12?[`단원마다 약 ${o.per}주`]:[]).join(' · '),   /* 1·2단계가 끝났으면 단원마다는 빼고, 지난 3단계 시작·실전 모의는 쓰지 않는다 */
    l2=[o.p3>=t?`3단계 ${dlab(o.p3)}부터`:'',!o.P.mock?'실전 모의 없음':o.P.mock.d>=t?`실전 모의 제${o.P.mock.r}회 ${md(o.P.mock.d)}`:''].filter(Boolean).join(' · '),dd=nwTxt(l1)+(l2?'<br>'+nwTxt(l2):'');
    return o.cur?row({t:tt,d:dd}):row({t:tt,d:dd,act:'sch-pick',data:{r:o.r}});}).join('');
  const notes=['3·4단계(실전 모의·파이널) 12주는 어느 회차든 같아요.','미루면 1·2단계가 길어져 단원마다 (이어서) 주가 생겨요.',
    ok?`접수한 제${T0.r}회는 실전 모의로 봐요.`:t<=ae?`제${T0.r}회 원서접수는 ${md(ap)}~${md(ae)}${T0.est?'(예상)':''}이에요. 그 전에 정해요.`:''].filter(Boolean);
  const body=`${tx?`<p class="ds schwhy">${esc(tx.ds)}</p>`:''}<div class="group schopt">${rs}</div>${notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')}
    ${!c?'':c.why==='apply'?`<div class="btns"><button class="btn sec" data-act="tk" data-id="apply:${T0.r}">제${T0.r}회 접수했어요</button></div>`:'<div class="schln"><button class="lnk" data-act="slip-no">지금 일정대로 할게요</button></div>'}`;
  return c?sec('시험을 미룰지 살펴봐요',tx.meta?esc(tx.meta):'',body,'schsec'):`<details class="d schcmp"${foldAt('schcmp')}><summary>다음 회차와 비교</summary><div class="in-d">${body}</div></details>`;}
/* 시험 일정 맨 위: 바꾸기를 기다리는 줄("2/8(월)부터 제143회 일정이에요" · 바꾸지 않기), 바꾼 뒤 7일 동안 되돌리기 줄(같은 미리 보기·바뀌는 날 규칙) */
function schTopHTML(t){const st=S.settings,N=st.nextTarget,u=st.schUndo;
  if(N){const P1=computePlan(st.start,N.r),kp=schKeep(PLAN,P1,t);
    return`<div class="group schpend">${row({ic:'cal',tone:'gray',t:esc(`${dlab(N.from)}부터 제${P1.target.r}회 일정이에요`),d:esc(kp.length?kp.map(x=>`제${x.r}회(${md(x.d)})`).join('·')+'는 지금 일정대로 봐요':'이번 주는 지금 일정 그대로예요')})}</div><div class="schln"><button class="lnk" data-act="sch-next-cancel">바꾸지 않기</button></div>`;}
  if(u&&u.at&&t<=addDays(u.at,7)){const r0=computePlan(st.start,u.r).target.r;
    return`<div class="group schpend">${row({ic:'redo',tone:'gray',t:esc(`제${r0}회로 되돌리기`),d:esc(`${md(u.at)}에 바꿨어요 · ${md(addDays(u.at,7))}까지`),act:'sch-pick',data:{r:u.r}})}</div>`;}
  return'';}
/* 바꾸면 이렇게 돼요(미리 보기)에 더하는 줄: 바뀌는 날의 주차 틀·단계, 이번 주 그대로·접수한 시험·단계가 돌아감·실전 모의·빠지는 시험·남는 실전 모의·공휴일·변경 요청 복사 */
function schPrevHTML(P,from,stCh,t){const nm=addDays(wkStart(t),7),eff=from||nm,wf=Math.floor(diffDays(P.start,eff)/7),tk=S.tk||{},o=[],q=x=>`제${x.r}회(${md(x.d)})`;
  const li=wf>=0&&wf<=P.E?`<li class="two"><span class="dot half"></span><span class="k">${from&&from>nm?md(from)+'부터':'다음 주'}</span><span class="v">${esc(weekObj(wf,P).t)} · <span class="nw">${esc(phaseObj(wf,P).n)}</span></span></li>`:'';
  const kp=stCh?[]:schKeep(PLAN,P,t),w0=wkIdx(t),ph0=w0>=1?phaseObj(w0).id:0,ph1=wf>=0?phaseObj(wf,P).id:0;
  if(from&&from===nm)o.push('이번 주는 지금 일정 그대로예요.');
  if(kp.length)o.push(`${kp.map(q).join('·')}는 지금 일정대로 보고 ${dlab(from)}부터 바뀌어요.`);
  if(ph1>=1&&ph1<5&&ph1<ph0&&ph0<5)o.push(`${md(eff)}부터 ${ph1}단계로 돌아가요(지금은 ${ph0}단계).`);
  const mk=x=>x?`제${x.r}회 ${md(x.d)}`:'없음';if((PLAN.mock&&PLAN.mock.r)!==(P.mock&&P.mock.r))o.push(`실전 모의: ${mk(PLAN.mock)} → ${mk(P.mock)}`);
  const rs1=[P.mock,P.target].filter(Boolean).map(x=>x.r),drop=[PLAN.mock,PLAN.target].filter(x=>x&&!rs1.includes(x.r)&&x.d>=t&&t>=addDays(x.d,-PE_SCHED.annBefore)&&!tk['apply:'+x.r]);
  const hy=Math.max(...Object.keys(KR_HOLI).map(d=>+d.slice(0,4))),ln=o.map(x=>`<p class="ds schl">${esc(x)}</p>`).join('');
  const dr=drop.map(x=>`<p class="ds schl">${esc(q(x))}는 일정에서 빠져요. <button class="lnk" data-act="tk" data-id="apply:${x.r}">제${x.r}회 접수했어요</button></p>`).join('');
  const o2=[];if(P.mock&&P.mock.r===PLAN.target.r&&P.target.r!==PLAN.target.r&&!tk['apply:'+PLAN.target.r])o2.push(`${q(PLAN.target)}는 실전 모의 날로 남아요.`);
  if(+P.target.d.slice(0,4)>hy)o2.push(`${hy+1}년 공휴일은 아직 넣지 않았어요.`);if(SETS.plan&&!sigEq(SETS.plan,planSig(P)))o2.push('저장하면 예약 작업에 보낼 변경 요청을 복사해요.');   /* 저장한 뒤 저장소가 가야 할 일정(P)과 다를 때만(되돌리기로 저장소 일정에 돌아가면 복사하지 않음) */
  return{li,lines:ln+dr+o2.map(x=>`<p class="ds schl">${esc(x)}</p>`).join('')};}
/* 시작일이 월요일이 아니면 시험 일정의 시작일 아래 한 줄: 첫 주(준비 주)는 시작일~일요일로 짧고 다음 월요일부터 1주차 */
function firstWeekTxt(s){if(!/^\d{4}-\d\d-\d\d$/.test(s||''))return'';const n=7-((parse(s).getDay()+6)%7);if(n===7)return'';const su=addDays(s,n-1);
  return`첫 주(준비 주)는 ${n===1?dlab(s)+' 하루':`${dlab(s)}~${dlab(su)} ${n}일`}이고, ${dlab(addDays(su,1))}부터 1주차예요. 한 주는 늘 월요일부터 일요일까지예요(토요일 모의고사, 일요일 마감).`;}
function vSchedule(){const ed=SCH||{start:S.settings.start,target:S.settings.target||'auto'};let changed=!!SCH&&(ed.start!==S.settings.start||String(ed.target)!==String(S.settings.target||'auto'));
  let P;try{P=computePlan(ed.start,ed.target);}catch(e){P=PLAN;}
  if(changed&&ed.start===S.settings.start&&P.target.r===PLAN.target.r)changed=false;   /* 자동(제142회) → 제142회처럼 같은 계획이면 바꾸지 않음(미리 보기·저장 없음) */
  const el=eligibleRounds(ed.start).slice(0,6);const t=todayStr();const rp=repoPlanState(t),R0=SETS.plan,N=S.settings.nextTarget;
  const stCh=changed&&ed.start!==S.settings.start,from=changed&&!stCh?schFrom(PLAN,P,t):null,pv=changed?schPrevHTML(P,from,stCh,t):null;
  const mo=(P.E/4.345).toFixed(1);const a1=P.E-12;
  const list=roundList().filter(x=>x.d>=addDays(t,-40)).slice(0,9);
  /* 이번 주 줄의 원서접수 날짜 확인·시행계획 공고 확인: 여기서 큐넷 공고와 맞춰 보고 "확인했어요" */
  const ck=taskList(t).filter(x=>x.k==='applychk'||x.k==='notice');
  return topbar('시험 일정')+`<h1 class="ptitle">시험 일정</h1><p class="lsub">준비 시작일을 정하면 정기시험 가운데 ${PE_SCHED.minMonths}개월 이상 남은 가장 빠른 회차를 목표로 잡아요.</p>
  ${ck.length?`<div class="group schk">${ck.map(x=>`<div class="row noic"><span class="tx"><span class="tt">${esc(x.label)}</span><span class="ds">${x.k==='notice'?'공고된 시험일이 아래 일정과 다르면 고쳐요':'큐넷에서 접수 날짜와 시험일을 확인해요'}</span></span>${x.done?'<span class="pdn">✓ 확인했어요</span>':`<button class="btn sm sec" data-act="tk" data-id="${esc(x.id)}">확인했어요</button>`}</div>`).join('')}</div>`:''}
  ${schTopHTML(t)}${!SCH&&recBefore()?`<div class="group" style="margin-top:12px">${row({ic:'sync',tone:'gray',t:'준비 시작일 전 공부 기록이 남아 있어요',d:esc(`${korDate(S.settings.start)}부터 새로 시작하려면 이전 기록(${WIPE_TXT})을 지워요`),act:'rec-wipe'})}</div>`:''}${schCmpHTML(t,slipCheck(t))}
  <label class="f" for="schStart">준비 시작일</label><input class="in" type="date" id="schStart" value="${esc(ed.start)}">${(x=>x?`<p class="note">${esc(x)}</p>`:'')(firstWeekTxt(ed.start))}
  <label class="f" for="schTarget">목표 회차</label><select class="select" id="schTarget"><option value="auto"${ed.target==='auto'?' selected':''}>자동: 가장 빠른 회차(제${el[0].r}회)</option>${el.map(x=>`<option value="${x.r}"${String(ed.target)===String(x.r)?' selected':''}>제${x.r}회, ${x.d}${estTag(x)}, ${Math.floor(diffDays(planMon(ed.start),x.d)/7)}주</option>`).join('')}</select>
  <div class="sheet" id="schPrev" style="margin-top:16px"><p class="sheet-k">${changed?'바꾸면 이렇게 돼요':'지금 일정'}</p><h3>제${P.target.r}회 필기 ${esc(korDateY(P.target.d,true))}${P.target.est?' <span class="tag-new">예상</span>':''}</h3>
    <ul class="steps">
      <li><span class="dot on"></span><span class="k">준비 기간</span><span class="v">${P.E}주, 약 ${mo}개월</span></li>
      <li><span class="dot ${P.mock?'on':''}"></span><span class="k">실전 모의</span><span class="v">${P.mock?`제${P.mock.r}회 ${md(P.mock.d)}${P.mock.est?'(예상)':''}, ${P.M}주차`:'없음'}</span></li>
      <li><span class="dot half"></span><span class="k">1회독·2회독</span><span class="v">1~${a1}주차</span></li>
      <li><span class="dot half"></span><span class="k">실전 모의 → 파이널</span><span class="v">${a1+1}~${P.E-1}주차</span></li>${pv?pv.li:''}
    </ul>
    ${P.mock?'':`<p class="ds" style="margin:4px 0 0">시작 ${PE_SCHED.mockMinWeeks}주 뒤부터 목표 전까지 열리는 정기시험이 없어 주말 모의고사로 대신해요.</p>`}
    ${P.target.note||(P.mock&&P.mock.note)?`<p class="ds" style="margin:6px 0 0">${esc([P.mock&&P.mock.note?`제${P.mock.r}회: ${P.mock.note}`:'',P.target.note?`제${P.target.r}회: ${P.target.note}`:''].filter(Boolean).join(' / '))}</p>`:''}
    ${pv?pv.lines:''}
    ${stCh&&hasRec()?`<p class="ds schl schwipe">${SCH.keep?'이전 공부 기록은 그대로 두고 날짜만 바꿔요.':`저장하면 이전 공부 기록(${WIPE_TXT})을 지우고 새로 시작해요. 설정과 내 카드는 그대로예요.`} <button class="lnk" data-act="sch-keep">${SCH.keep?'기록 지우고 새로 시작':'기록은 그대로 두기'}</button></p>`:''}
    ${changed?`<div class="btns schsv" style="margin-top:14px"><button class="btn" data-act="sch-save">${from?'<span>'+esc(dlab(from))+'부터 <span class="nw">이 일정으로</span></span>':'이 일정으로 저장'}</button><button class="btn ghost" data-act="sch-cancel">취소</button></div><p class="ds" style="margin:8px 0 0">${from?esc(dlab(from))+'부터 ':''}오늘 화면, 로드맵, 주차와 단계가 새 일정으로 바뀌어요.${stCh&&hasRec()&&!SCH.keep?'':' 카드·오답 기록은 그대로예요.'}</p>`:''}</div>
  ${sec('예약 작업 일정','',rp==='same'?`<div class="group">${row({ic:'check',tone:'ok',t:'예약 작업도 같은 일정이에요',d:'매일 세트와 주간 모의고사가 이 일정의 주차·단원으로 만들어져요'})}</div>`
    :rp==='unknown'?`<div class="group">${row({ic:'sync',tone:'gray',t:'아직 확인하지 못했어요',d:'받아 오기를 하면 저장소의 일정과 비교해요',act:'sync'})}</div>`
    :rp==='wait'?`<div class="group">${row({ic:'cal',tone:'gray',t:esc(`예약 작업은 ${dlab(N.from)}부터 바꿔요`),d:esc(`${dlab(addDays(N.from,-1))}에 변경 요청을 붙여 넣어요`)})}</div>
      <div class="btns"><button class="btn sec" data-act="sch-copy">변경 요청 복사</button></div><p class="note">그 전에 붙여 넣으면 이번 주 남은 세트가 새 일정으로 와요.</p>`
    :rp==='next'?`<div class="group">${row({ic:'check',tone:'ok',t:'예약 작업은 이미 새 일정이에요',d:esc(`앱은 ${dlab(N.from)}부터 새 일정이에요`)})}</div>`
    :rp==='sent'?`<div class="group">${row({ic:'sync',tone:'gray',t:'변경 요청을 복사해 두었어요',d:'Claude Code에 붙여 넣으면 다음 받아 오기 때 맞춰져요'})}</div>
      <div class="btns"><button class="btn sec" data-act="sch-copy">다시 복사</button></div>`
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
const BUDGET_OPT=[['wd','평일',[120,150,180,240]],['sat','토요일',[180,240,300,360]],['sun','일요일·공휴일',[120,180,240,300]]];
function vSettings(){const s=S.settings,bg=Object.assign({},BUDGET_DEF,s.budget||{});
  return topbar('설정')+`<h1 class="ptitle">설정</h1>
  ${sec('하루 공부 시간','',BUDGET_OPT.map(([k,l,vs])=>`<label class="f">${l}</label><div class="seg">${vs.map(v=>`<button class="${Number(bg[k])===v?'on':''}" data-act="budget" data-k="${k}" data-v="${v}">${mfmt(v)}</button>`).join('')}</div>`).join('')+`<p class="note">오늘 몫과 '이번 주' 계산이 이 시간을 써요. 바꾸면 오늘 몫을 다시 짜요.</p>`+daysSetHTML())}
  <label class="f">글자 크기</label><div class="seg">${[['m','보통'],['l','크게'],['xl','아주 크게']].map(x=>`<button class="${(s.fs||'m')===x[0]?'on':''}" data-act="fs" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <label class="f">화면</label><div class="seg">${[['auto','기기 설정 따라'],['light','밝게'],['dark','어둡게']].map(x=>`<button class="${(s.theme||'auto')===x[0]?'on':''}" data-act="theme" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <label class="f">어려운 낱말 형광펜</label><div class="seg">${[['on','켜기'],['off','끄기']].map(x=>`<button class="${(s.gloss||'on')===x[0]?'on':''}" data-act="gloss" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><p class="note">용어 설명 속 다른 카드 용어에 아직 모르는 것은 형광펜, 아는 것은 점선을 그어요. 형광펜과 상관없이 모르는 낱말은 꾹 누르면 카드나 앱 사전의 풀이가 나와요.</p>
  <label class="f" for="sNew">하루 새 카드 수(연습 → 새 카드)</label><input class="in" type="number" inputmode="numeric" id="sNew" value="${s.newPerDay}">
  <details class="d" style="margin-top:16px"><summary>고급: 데이터 주소</summary><div class="in-d">
    <label class="f" for="sData">데이터 주소</label><input class="in" id="sData" value="${esc(s.dataUrl)}" placeholder="${esc(DATA_DEFAULT)}"><p class="note">비워 두면 기본 저장소(gisulsa-data)에서 받아 와요.</p></div></details>
  <div class="btns" style="margin-top:16px"><button class="btn" data-act="save-settings">저장</button></div>${PE_IO.settingsHTML()}${memberSettingsHTML()}`;}
/* 설정 → 쉬는 날·짧은 날: 오늘 뒤에 정한 날(S.days)을 이어진 같은 시간끼리 한 줄로(지우기), 없으면 "정한 날이 없어요", "날짜 정하기"(기간 창). 시험 날 전날까지만 */
function dayRuns(t){const out=[];Object.keys(S.days||{}).filter(d=>d>t&&S.days[d]&&S.days[d].m!=null).sort().forEach(d=>{const m=Math.max(0,Number(S.days[d].m)||0),l=out[out.length-1];
  if(l&&l.m===m&&addDays(l.b,1)===d)l.b=d;else out.push({a:d,b:d,m});});return out;}
const runLab=(a,b)=>a===b?dlab(a):`${dlab(a)}~${dlab(b)}`,runJo=(b,j)=>jo(DAYK[parse(b).getDay()],j);   /* "11/16(월)~11/20(금)", 조사는 끝 요일 글자로 */
function daysSetHTML(){const t=todayStr();if(addDays(t,1)>addDays(PLAN.target.d,-1))return'';const rs=dayRuns(t);
  return`<label class="f">쉬는 날·짧은 날</label>${rs.length?`<div class="group">${rs.map(r=>`<div class="row noic"><span class="tx"><span class="tt">${esc(runLab(r.a,r.b))} · ${r.m===0?'쉬어요':esc(mfmt(r.m))}</span></span><button class="btn ghost sm" data-act="days-del" data-a="${r.a}" data-b="${r.b}">지우기</button></div>`).join('')}</div>`:'<p class="note">정한 날이 없어요</p>'}
  <div class="btns"><button class="btn sec" data-act="days-sheet">날짜 정하기</button></div>`;}
/* 기간 창: 시작·끝(내일 ~ 시험 전날), 쉬어요 · 1시간 · 2시간. 한 번에 31일까지, 시험 날은 빼고 S.days에 둔다(평소 시간 이상이면 지움) */
function daysSheet(){const t=todayStr(),lo=addDays(t,1),hi=addDays(PLAN.target.d,-1);
  return`<p class="sheet-k">쉬는 날·짧은 날</p><h3 class="cmh">날짜 정하기</h3>
  <label class="f" for="offFrom">시작</label><input class="in" type="date" id="offFrom" min="${lo}" max="${hi}">
  <label class="f" for="offTo">끝</label><input class="in" type="date" id="offTo" min="${lo}" max="${hi}">
  <div class="seg capseg c3">${[[0,'쉬어요'],[60,'1시간'],[120,'2시간']].map(([m,l])=>`<button data-act="days-set" data-m="${m}">${l}</button>`).join('')}</div>
  <p class="note">한 번에 31일까지 정할 수 있어요. 시험 날은 빼요.</p>
  <div class="btns"><button class="btn sec" data-act="sheet-close">닫기</button></div>`;}
function memberSettingsHTML(){const me=PE_IO.member();if(!me)return'';
  return sec('아이디','',`<div class="group">${row({ic:'flag',t:esc(me.id),d:me.admin?'이 휴대폰에 고정된 아이디, 관리자':'이 휴대폰에 고정된 아이디'})}</div>
  <div class="btns"><button class="btn red" data-act="member-remove">아이디 지우기</button></div><p class="note">지우면 승인도 함께 없어지고 처음 화면으로 돌아가요. 학습 기록은 이 휴대폰에 그대로 남아요.</p>`);}
function backupDone(){S.tk=S.tk||{};S.tk.backup=todayStr();save();if(R.page==='backup')render();}
/* 백업 글: 그 백업의 날짜(S.tk.backup)를 넣고 만든다(그 백업으로 복원한 휴대폰도 "마지막 백업"이 그 날). 복사·저장에 실패하면 undo로 전 날짜로 되돌린다. 형식 {state, sets}는 그대로 */
function backupJSON(){S.tk=S.tk||{};const b0=S.tk.backup;S.tk.backup=todayStr();return[JSON.stringify({state:S,sets:SETS}),()=>{if(b0)S.tk.backup=b0;else delete S.tk.backup;save();}];}
/* 복원: 붙여 넣은 백업 글 또는 고른 백업 파일(name). 이 휴대폰의 "바뀐 점" 표시는 그대로 둔다(예전 백업을 복원해도 다음에 다시 뜨지 않게).
   받은 세트는 이 휴대폰 것과 합치고(setsMerge) 받아 오기 상태도 이 휴대폰 것, 곧바로 다시 받아 온다(받아 오는 동안은 오늘 몫을 고정하지 않음) */
function restoreFrom(text,name){let j,st;try{j=JSON.parse(String(text||'').replace(/^\uFEFF/,''));st=j.state||j;if(!st||!st.settings||!st.cards)throw 0;}catch(err){return toast(name?'백업 파일이 아니에요':'백업 형식이 아니에요');}
  const bd=(st.tk||{}).backup;
  return PE_IO.ask(name?`${bd?korDate(bd)+' 백업 파일':'고른 백업 파일'}로 지금 기록을 덮어씁니다. 계속할까요? 파일: ${name}`:'지금 기록을 덮어씁니다. 계속할까요?',()=>{try{adoptState(st);if(j.sets)SETS=setsMerge(SETS,j.sets);recalcPlan();flush();invalidate();applyLook();flowReset();toast('복원했어요');sync(true);nav('today');}catch(err){toast('백업 형식이 아니에요');}});}
/* 다른 기록으로 바꾸기(복원·되돌리기): 빠진 칸은 새 기록 값으로, 이 휴대폰의 "바뀐 점" 표시·받아 오기 상태는 그대로 */
function adoptState(st){const sv=(S.tk||{})['seen:v3'],sy=S.sync;S=Object.assign(fresh(),st);S.settings=Object.assign(fresh().settings,st.settings||{});if(!S.settings.roundDates)S.settings.roundDates={};if(!S.days||typeof S.days!=='object')S.days={};S.v=2;S.today=null;S.tk=S.tk||{};S.tk['seen:v3']=sv||S.tk['seen:v3']||todayStr();S.sync=sy||S.sync;}
/* 새로 시작(3.1.3): 준비 시작일을 다시 정할 때 이전 공부 기록(카드 진도·별표·오답·세트 진도·모의고사·달력·주간 기록·오늘 몫·지난 쉬는 날)을 지운다.
   그대로 두는 것: 설정(하루 공부 시간·글자 크기·외우기 등)·내일부터 정해 둔 쉬는 날·짧은 날·내 카드·내 목차·숨긴 카드·가리며 외우기 표시·받은 세트·받아 오기 상태·"바뀐 점"·마지막 백업 날짜.
   지우기 전 기록은 7일 동안 되돌릴 수 있게 따로 둔다(PREV_KEY, 더보기 → 백업 "되돌리기") */
const PREV_KEY='pe_state_prev',KEEP_TK=['seen:v3','backup','budget'];
/* 공부한 기록이 있는지(앱을 연 것만으로 생기는 달력 접속·주간 기록은 세지 않는다) */
const calStudy=()=>Object.keys(S.cal||{}).filter(d=>Object.keys((S.cal[d]||{}).x||{}).length);
function hasRec(){return['cards','sp','wrong','mockp','daily','qp'].some(k=>S[k]&&Object.keys(S[k]).length)||(S.log||[]).length>0||calStudy().length>0;}
/* 준비 시작일 전 날짜에 공부한 기록이 있는지(달력에 남은 공부·카드 매김·세트를 처음 연 날) */
function recBefore(){const s=S.settings.start;return calStudy().concat(Object.keys(S.daily||{}),Object.values(S.sp||{}).map(p=>p&&p.first).filter(Boolean)).some(d=>d<s);}
function prevRec(){try{const r=PE_IO.get(PREV_KEY);if(!r)return null;const o=JSON.parse(r);return o&&o.at&&o.state&&o.state.settings&&todayStr()<=addDays(o.at,7)?o:null;}catch(e){return null;}}
function restartRec(start,target){const o=S,n=fresh();
  try{PE_IO.set(PREV_KEY,JSON.stringify({at:todayStr(),state:o}));}catch(e){}
  n.settings=Object.assign({},o.settings);['nextTarget','schUndo','schSent','schSig','slipNo'].forEach(k=>delete n.settings[k]);
  if(start)n.settings.start=start;if(target)n.settings.target=target;
  ['userCards','userEssays','hidden','memoPick','memoTape','range','fillLv','sync'].forEach(k=>{if(o[k]!==undefined)n[k]=o[k];});
  KEEP_TK.forEach(k=>{if(o.tk&&o.tk[k])n.tk[k]=o.tk[k];});
  const t=todayStr();n.days={};Object.keys(o.days||{}).forEach(d=>{if(d>t)n.days[d]=o.days[d];});   /* 내일부터 정해 둔 쉬는 날·짧은 날은 계획이라 남김 */
  S=n;recalcPlan();flowReset();invalidate();flush();}
const WIPE_TXT='카드 진도·오답·세트 진도·달력·주간 기록';
try{if(PE_IO.get(PREV_KEY)&&!prevRec())PE_IO.set(PREV_KEY,'');}catch(e){}   /* 7일이 지난 되돌리기 기록은 비운다 */
/* 지운 기록 되돌리기 줄(7일 동안, 백업 화면) */
function prevRowHTML(){const p=prevRec();return p?`<div class="group" style="margin-top:14px">${row({ic:'sync',tone:'gray',t:`${md(p.at)}에 지운 공부 기록 되돌리기`,d:`${md(addDays(p.at,7))}까지 · 그 뒤에 한 공부 기록은 없어져요`,act:'rec-undo'})}</div>`:'';}
function vBackup(){const bl=(S.tk||{}).backup;return topbar('백업')+`<h1 class="ptitle">백업·복원</h1><p class="lsub">학습 기록은 이 기기에만 있어요. 1~2주에 한 번 파일로 저장하거나 메모에 붙여 두세요. ${bl?`마지막 백업 ${esc(md(bl))}`:'아직 백업한 적이 없어요'}</p>
  <div class="btns" style="margin-top:14px"><button class="btn" data-act="backup-copy">백업 복사</button><button class="btn sec" data-act="backup-dl">파일로 저장</button></div>${prevRowHTML()}
  <label class="f">파일로 복원</label><div class="btns" style="margin-top:0"><button class="btn sec" data-act="restore-file">파일에서 불러오기</button></div>
  <p class="note">"파일로 저장"으로 둔 gisulsa-backup-날짜.json을 고르세요(파일 앱 → 이 iPhone·iCloud Drive).</p>
  <label class="f" for="restoreText">붙여 넣어 복원(백업 복사로 둔 글)</label><textarea class="in" id="restoreText" placeholder='{"state":{...},"sets":{...}}'></textarea>
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
/* 세트 숙제 "단답"의 카드면 그 칸 키(dd+번호), 아니면 null */
function ddKey(d,id){const it=SETS.sets[d]&&hwItems(d).find(x=>x.key==='dd'),r=it&&it.rows.find(q=>q.go===id);return r?r.c[0][0]:null;}
/* 단답 답안지 주소: 세트 숙제 "단답"의 카드면 #dandap/카드/날짜(그 세트 숙제에 표시). d를 주면(세트 ①) 그 세트만, 없으면(카드 창) 오늘까지 온 세트 가운데
   그 칸을 아직 안 쓴 가장 최근 세트, 다 썼으면 가장 최근 세트 */
function ddHash(id,d){let D=null;if(d)D=ddKey(d,id)?d:null;
  else{const t=todayStr();for(const x of Object.keys(SETS.sets).filter(x=>x<=t&&setIds(x).includes(id)).sort().reverse()){const k=ddKey(x,id);if(!k)continue;if(((spGet(x).hw||{})[k]||0)<1){D=x;break;}D=D||x;}}
  return'dandap/'+encodeURIComponent(id)+(D?'/'+D:'');}
/* 숙제(#dandap/카드/날짜)에서 열면 파란 버튼 "다 썼어요(숙제에 표시)"가 그 세트의 단답 동그라미를, 연습 탭 "단답 답안지 1문"·오늘 "단답 1문제 더"(ddRandom, UI.ddx)로 연 것은
   "다 썼어요"가 오늘 "단답 1문제 더"(x.dd2)를 친다. 그 밖(세트 ①·카드 창의 숙제 아닌 카드)은 칠 것이 없어 타이머가 파란 버튼 */
function ddDoneHTML(c){const D=R.b&&SETS.sets[R.b]?R.b:null;
  if(D){const k=ddKey(D,c.id);if(k){const on=((spGet(D).hw||{})[k]||0)>=1;
    return on?`<button class="btn" data-act="back">✓ 숙제에 표시했어요 · ${esc(closeLab(upOf(R)))}</button>`:`<button class="btn" data-act="dd-done" data-d="${D}" data-k="${esc(k)}">다 썼어요(숙제에 표시)</button>`;}}
  if(UI.ddx!==c.id)return'';const on=!!(S.tk||{})['x.dd2:'+todayStr()];return`<button class="btn${on?' sec':''}" data-act="dd-tick">${on?'✓ 다 썼어요 · 되돌리기':'다 썼어요'}</button>`;}
function vDandap(){const c=card(R.a);if(!c)return topbar('단답 답안지')+'<div class="empty" style="margin-top:20px"><b>카드를 찾을 수 없어요</b></div>';
  const sh=ddSheet(c),tip=(PE_TIPS[0]||{}).d||'',dn=ddDoneHTML(c);
  return topbar('단답 답안지')+`<h1 class="ptitle">${esc(c.t)}</h1><p class="lsub">카드 내용을 1교시 단답 답안지 모양으로 옮겼어요. 모양을 익힌 뒤 덮고, 실제 답안지에 10분 안에 써 보세요.</p>
  <p class="ddstat${sh.n>ROWS?' over':''}"><b>${sh.n}줄</b> / 1면 22줄${sh.n>ROWS?` · ${sh.n-ROWS}줄 넘쳐요. 정의나 결론을 한 줄씩 줄여 1면에 맞추는 게 연습이에요`:' · 1면 안에 들어가요'}</p>
  <div class="ddwrap">${sh.html}</div>
  ${(c.k||[]).length&&ddSents(c).length>1?`<details class="d" style="margin-top:12px"><summary>시간이 남으면 더할 내용(카드의 나머지 설명)</summary><div class="in-d"><ol class="ddmore">${ddSents(c).slice(1).map(x=>`<li>${esc(ddNoun(x))}</li>`).join('')}</ol></div></details>`:''}
  <div class="btns" style="margin-top:14px"><button class="btn${dn?' sec':''}" data-act="timer-go" data-p="one1">타이머 10분</button><button class="btn sec" data-act="copy-dd" data-id="${esc(c.id)}">첨삭 요청 복사</button></div>
  ${dn?`<div class="btns">${dn}</div>`:''}
  <details class="d" style="margin-top:10px"><summary>10분 쓰는 순서</summary><div class="in-d"><p style="margin:0;color:var(--ink2)">${esc(tip)}</p></div></details>
  <p class="note">한 줄을 26자 안팎으로 나눴어요(실제 답안지는 약 30자라 손으로 쓰면 조금 덜 차요). 주요 내용은 카드의 키워드를 한 줄씩 옮긴 거라, 쓸 때는 키워드마다 이유나 수치를 한두 마디 붙이면 좋아요. 그림 칸에는 원리, 단면, 순서도 중 하나를 직접 그리고, 결론은 현장 경험이나 최신 경향 한 줄로 바꿔 쓰면 점수가 올라요.</p>`;}
/* 연습 탭: 범위 안에서 기출에 나온 카드를 먼저 골라 답안지로 */
function ddRandom(o){const pool=deck().filter(rangeFilter(S.range||'week'));if(!pool.length)return toast('이 범위에 카드가 없어요');
  const kx=pool.filter(c=>c.x&&c.x.length),pick=(kx.length?kx:pool)[Math.floor(Math.random()*(kx.length?kx:pool).length)];UI.ddx=pick.id;nav('dandap/'+encodeURIComponent(pick.id),{from:o&&o.from});}   /* 끝 화면 "다음"으로 와도 뒤로는 연 곳(오늘)으로 */
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
/* ADM: 승인 관리·문자함이 함께 쓰는 목록 {members, codes, me, msgs}. msgs가 null이면 문자함을 못 읽음(Firebase 규칙을 새로 게시하기 전) */
const admPage=()=>R.page==='admin'||R.page==='inbox';
function admLoad(){ADM={loading:true};PE_IO.memberCall('list').then(v=>{ADM={members:v.members||[],codes:v.codes||[],me:v.me||'',msgs:Array.isArray(v.msgs)?v.msgs:null,replies:Array.isArray(v.replies)?v.replies:[]};
    if(ADM.msgs){IBX.n=ADM.msgs.filter(m=>!m.read).length;IBX.at=Date.now();}if(R.page==='inbox'&&R.a)ibxSeen(R.a);if(admPage())render();},
  e=>{ADM={err:String(e&&e.message||e)};if(admPage())render();});}
function admRun(p,msg){p.then(()=>{if(msg)toast(msg);admLoad();if(admPage())render();},e=>toast('하지 못했어요: '+(e&&e.message||e)));}
function vAdmin(){const me=PE_IO.member();if(!me||!me.admin)return topbar('승인 관리')+'<div class="empty" style="margin-top:20px"><b>관리자만 볼 수 있어요</b></div>';
  if(!ADM)admLoad();
  const head=topbar('승인 관리')+`<h1 class="ptitle">승인 관리</h1><p class="lsub">승인한 휴대폰만 앱을 열 수 있어요. 아이디는 휴대폰마다 하나로 고정돼요.</p><div class="btns"><button class="btn sm sec" data-act="adm-reload">새로고침</button></div>`;
  if(ADM.loading)return head+'<div class="empty" style="margin-top:14px"><b>불러오는 중</b></div>';
  if(ADM.err)return head+`<div class="empty" style="margin-top:14px"><b>불러오지 못했어요</b>${esc(ADM.err)}</div>`;
  const day=x=>esc(String(x||'').slice(0,10));
  const lastMsg=uid=>(ADM.msgs||[]).find(x=>x.uid===uid);   /* 문자는 새것부터 */
  const who=m=>{const lm=m.status==='pending'&&lastMsg(m.uid);return`<span class="tx"><span class="tt">${esc(m.id)}${m.uid===ADM.me?' (나)':''}</span><span class="ds">${day(m.createdAt)}${m.code?', 초대 코드로':''}</span>${lm?`<span class="ds msnip">“${esc(lm.text)}”</span>`:''}</span>`;};
  const btn=(act,m,label,cls,s)=>`<button class="btn sm ${cls}" data-act="${act}" data-uid="${esc(m.uid)}" data-id="${esc(m.id)}"${s?` data-s="${s}"`:''}>${label}</button>`;
  const by=st=>ADM.members.filter(m=>m.status===st);
  const pend=by('pending'),ok=by('approved'),no=by('rejected');
  return head+sec('승인 기다리는 사람',pend.length+'명',pend.length?`<div class="group">${pend.map(m=>`<div class="row noic">${who(m)}${btn('adm-set',m,'승인','','approved')}${btn('adm-set',m,'거절','ghost','rejected')}</div>`).join('')}</div>`:'<div class="empty">새 요청이 없어요</div>')
    +sec('승인된 사람',ok.length+'명',ok.length?`<div class="group">${ok.map(m=>`<div class="row noic">${who(m)}${m.uid===ADM.me?'':btn('adm-set',m,'승인 취소','ghost','rejected')}</div>`).join('')}</div>`:'<div class="empty">아직 없어요</div>')
    +(no.length?sec('거절한 사람',no.length+'명',`<div class="group">${no.map(m=>`<div class="row noic">${who(m)}${btn('adm-set',m,'승인','sec','approved')}${btn('adm-del',m,'지우기','ghost')}</div>`).join('')}</div><p class="note">지우면 그 아이디를 다른 휴대폰에서 다시 만들 수 있어요.</p>`):'')
    +sec('초대 코드',ADM.codes.length+'개',`${ADM.codes.length?`<div class="group">${ADM.codes.map(c=>`<div class="row noic"><span class="tx"><span class="tt" style="font-family:ui-monospace,Menlo,monospace;letter-spacing:.08em">${esc(c.code)}</span><span class="ds">${day(c.createdAt)}</span></span><button class="btn sm sec" data-act="code-copy" data-code="${esc(c.code)}">복사</button><button class="btn sm ghost" data-act="code-del" data-code="${esc(c.code)}">지우기</button></div>`).join('')}</div>`:''}
      <div class="btns"><button class="btn sec" data-act="code-add">초대 코드 만들기</button></div><p class="note">아이디를 만들 때 초대 코드를 넣으면 승인을 기다리지 않고 바로 열려요. 애플 심사용 코드도 여기서 만들어 심사 메모에 적고, 다 쓴 코드는 지우세요.</p>`)
    +`<p class="note" style="margin-top:16px">내 기기 번호: ${esc(ADM.me)}</p>`;}

/* ════════ 17-4. 문자함(관리자)·관리자에게 문자(회원), 앱 전용 ════════ */
/* 관리자에게 온 문자: 아이디 만들 때 적은 승인 요청 문구(join), 승인 대기·거절 화면(wait), 앱 안 "관리자와 문자"(app).
   관리자 휴대폰은 탭 첫 화면 오른쪽 위에 문자함 단추, 안 읽은 문자가 있으면 그 수를 빨간 동그라미로(카톡처럼). 안 읽은 수는 탭 첫 화면을 그릴 때 1분에 한 번,
   앱으로 돌아올 때 센다(문서를 하나하나 읽지 않는 세기 요청). 문자함: 보낸 사람마다 최근 순 → 누르면 그 사람이 보낸 문자 전부(언제·어디서·무슨 내용), 연 때 읽음으로 */
const IBX={n:0,at:0,busy:false,iv:0};
const MSG_FROM={join:'아이디 만들 때(승인 요청)',wait:'승인 대기 화면',app:'앱 안 문자 보내기'};
const MEM_ST={pending:'승인 대기',approved:'승인됨',rejected:'거절됨'};
const ibxOn=()=>{const me=PE_IO.member();return!!(me&&me.admin);};
const ibxCnt=n=>n>99?'99+':String(n);
const ibxTxt=()=>IBX.n?`안 읽은 문자 ${IBX.n}개`:'새 문자 없음';
function ibxBtn(){const n=IBX.n;return`<button class="ibx" data-act="ibx" aria-label="문자함${n?`, 안 읽은 문자 ${n}개`:''}">${icon('mail')}${n?`<b class="bdg num">${ibxCnt(n)}</b>`:''}</button>`;}
function paintIbx(){document.querySelectorAll('.ibx:not(.mt)').forEach(b=>{b.outerHTML=ibxBtn();});document.querySelectorAll('[data-ibxn]').forEach(x=>{x.textContent=ibxTxt();});}
function ibxPoll(force){if(!ibxOn()||IBX.busy||(!force&&Date.now()-IBX.at<60000))return;IBX.busy=true;IBX.at=Date.now();
  PE_IO.memberCall('unread').then(n=>{IBX.busy=false;n=Math.max(0,Math.floor(Number(n)||0));if(n!==IBX.n){IBX.n=n;paintIbx();}},()=>{IBX.busy=false;});}
/* 보낸 때: 오늘·어제는 그 말로, 올해는 "11월 3일(화)", 그 전은 연도까지 + 오전·오후 시각 */
function msgWhen(at){const d=new Date(at);if(isNaN(d))return'';const ds=fmt(d),t=todayStr(),h=d.getHours();
  const tm=`${h<12?'오전':'오후'} ${h%12||12}:${String(d.getMinutes()).padStart(2,'0')}`;
  const day=ds===t?'오늘':ds===addDays(t,-1)?'어제':(ds.slice(0,4)===t.slice(0,4)?'':ds.slice(0,4)+'년 ')+korDate(ds)+'('+DAYK[d.getDay()]+')';return day+' '+tm;}
const msgWhere=m=>(MSG_FROM[m.from]||'앱')+(m.dev?' · '+m.dev:'');
function ibxPeople(){const by={},ts=x=>Date.parse(x)||0;(ADM.msgs||[]).forEach(m=>{(by[m.uid]=by[m.uid]||{uid:m.uid,list:[]}).list.push(m);});
  return Object.values(by).map(p=>{p.list.sort((a,b)=>ts(b.at)-ts(a.at));p.last=p.list[0];p.id=p.last.id;p.unread=p.list.filter(m=>!m.read).length;
    const mm=(ADM.members||[]).find(x=>x.uid===p.uid);p.st=mm?MEM_ST[mm.status]||mm.status:'아이디 지움';p.mem=mm||null;
    p.rp=(ADM.replies||[]).filter(r=>r.uid===p.uid).sort((a,b)=>ts(b.at)-ts(a.at));p.lastRp=p.rp[0]&&ts(p.rp[0].at)>ts(p.last.at)?p.rp[0]:null;p.lastAt=p.lastRp?p.lastRp.at:p.last.at;return p;})
    .sort((a,b)=>ts(b.lastAt)-ts(a.lastAt));}
/* 한 사람의 문자를 연 때 읽음으로(화면에는 이번에 처음 본 문자에 "새 문자" 표시를 남긴다) */
function ibxSeen(uid){if(!ADM||!ADM.msgs)return;const un=ADM.msgs.filter(m=>m.uid===uid&&!m.read);if(!un.length)return;
  un.forEach(m=>{m.read=true;m.fresh=true;});IBX.n=Math.max(0,IBX.n-un.length);paintIbx();
  PE_IO.memberCall('msg-read',{mids:un.map(m=>m.mid)}).catch(()=>{un.forEach(m=>{m.read=false;});IBX.n+=un.length;paintIbx();toast('읽음 표시를 하지 못했어요');});}
function vInbox(){const me=PE_IO.member();if(!me||!me.admin)return topbar('문자함')+'<div class="empty" style="margin-top:20px"><b>관리자만 볼 수 있어요</b></div>';
  if(!ADM)admLoad();
  const one=R.a?ADM.msgs&&ibxPeople().find(p=>p.uid===R.a):null;
  if(ADM.loading||ADM.err||!ADM.msgs||!R.a||!one){
    const head=topbar('문자함')+`<h1 class="ptitle">문자함</h1><p class="lsub">${ADM.msgs?`안 읽은 문자 ${ADM.msgs.filter(m=>!m.read).length}개 · 보낸 사람 ${new Set(ADM.msgs.map(m=>m.uid)).size}명`:'승인 요청 문구와 앱 안에서 보낸 문자'}</p><div class="btns"><button class="btn sm sec" data-act="adm-reload">새로고침</button></div>`;
    if(ADM.loading)return head+'<div class="empty" style="margin-top:14px"><b>불러오는 중</b></div>';
    if(ADM.err)return head+`<div class="empty" style="margin-top:14px"><b>불러오지 못했어요</b>${esc(ADM.err)}</div>`;
    if(!ADM.msgs)return head+'<div class="empty" style="margin-top:14px"><b>문자함을 열지 못했어요</b>Firebase 콘솔 → Firestore Database → 규칙에 새 규칙(firebase/firestore.rules)을 붙여 넣고 게시해 주세요.</div>';
    const ps=ibxPeople();if(!ps.length)return head+'<div class="empty" style="margin-top:14px"><b>아직 받은 문자가 없어요</b>아이디를 만들 때 적은 승인 요청 문구와 회원이 앱에서 보낸 문자가 여기 와요.</div>';
    return head+`<div class="group ibxlist" style="margin-top:14px">${ps.map(p=>`<button class="row" data-act="go" data-h="inbox/${esc(p.uid)}"><span class="ic av${p.unread?' on':''}" aria-hidden="true">${esc(Array.from(p.id||'?')[0])}</span><span class="tx"><span class="tt">${esc(p.id)} <span class="mst">${esc(p.st)}</span></span><span class="ds msnip">${p.lastRp?'답장 · ':''}${esc((p.lastRp||p.last).text)}</span><span class="ds">${esc(msgWhen(p.lastAt))} · ${p.lastRp?'보낸 답장':esc(MSG_FROM[p.last.from]||'앱')}${p.list.length>1?` · 문자 ${p.list.length}개`:''}</span></span>${p.unread?`<b class="badge" aria-label="안 읽은 문자 ${p.unread}개">${ibxCnt(p.unread)}</b>`:''}<span class="chev"></span></button>`).join('')}</div>
      <p class="note">문자를 누르면 그 사람에게 답장하고, 답장하며 승인·거절할 수 있어요.</p>`;}
  const st=one.mem&&one.mem.status,ts=x=>Date.parse(x)||0;
  const rb=(label,cls,dec)=>`<button class="btn${cls?' '+cls:''}" data-act="ibx-reply" data-uid="${esc(one.uid)}" data-id="${esc(one.id)}"${dec?` data-dec="${dec}"`:''}>${label}</button>`;
  const bt=st==='pending'?rb('승인하고 보내기','','approved')+rb('답장만 보내기','sec','')+rb('거절하고 보내기','ghost','rejected')
    :st==='rejected'?rb('답장 보내기','','')+rb('승인하고 보내기','sec','approved'):rb('답장 보내기','','')+rb('승인 취소하고 보내기','ghost','rejected');
  const box=one.mem?`<div class="rpbox"><label class="f" for="rpText">${esc(one.id)} 님에게 답장</label><textarea class="in plain" id="rpText" maxlength="500" data-uid="${esc(one.uid)}" placeholder="답장을 적어 주세요">${esc(SV['rp:'+one.uid]||'')}</textarea>
    <div class="btns">${bt}</div><p class="note">답장을 비우고 ${st==='pending'?'승인·거절':st==='rejected'?'승인':'승인 취소'}을 누르면 상태만 바꿔요. 답장은 회원의 승인 대기 화면과 앱의 "관리자와 문자"에 보여요.</p></div>`
    :'<p class="note">아이디를 지운 사람이라 답장할 수 없어요.</p>';
  const items=one.list.map(m=>({at:m.at,m})).concat(one.rp.map(r=>({at:r.at,r}))).sort((a,b)=>ts(b.at)-ts(a.at));
  return topbar(one.id)+`<h1 class="ptitle">${esc(one.id)}</h1><p class="lsub">${esc(one.st)} · 문자 ${one.list.length}개${one.rp.length?` · 답장 ${one.rp.length}개`:''}${one.mem?` · 아이디 만든 날 ${esc(String(one.mem.createdAt||'').slice(0,10))}`:''}</p>
    ${box}
    <div class="msgs">${items.map(({m,r})=>m?`<article class="sheet msg${m.fresh?' fresh':''}"><div class="mh"><b>${esc(msgWhen(m.at))}</b>${m.fresh?'<span class="tag-new">새 문자</span>':''}</div><p class="mt">${esc(m.text)}</p><p class="mw">${esc(msgWhere(m))}</p></article>`
      :`<article class="sheet msg rp"><div class="mh"><b>${esc(msgWhen(r.at))}</b><span class="mwho">보낸 답장${r.dec?' · '+DEC_TXT[r.dec]:''}</span></div><p class="mt">${esc(r.text)}</p><p class="mw">${r.read?'읽음':'아직 안 읽음'}</p></article>`).join('')}</div>
    <div class="btns"><button class="btn ghost dng" data-act="ibx-del" data-uid="${esc(one.uid)}" data-id="${esc(one.id)}">${esc(one.id)} 님 문자 모두 지우기</button></div>`;}
/* 관리자 답장(3.1.3): 승인·거절과 함께 보낸 답장에 붙는 말 */
const DEC_TXT={approved:'승인과 함께',rejected:'거절과 함께'};
/* 회원: 관리자와 문자(내가 보낸 문자와 관리자 답장, 새것부터). 안 읽은 답장이 있으면 탭 첫 화면 오른쪽 위 단추와 수, 더보기 줄에 "새 답장 n개".
   답장은 탭 첫 화면을 그릴 때 5분에 한 번·앱으로 돌아올 때 받아 오고, 이 화면을 열면 새로 받아 읽음으로 */
const MT={n:0,at:0,busy:false,data:null};
const mtOn=()=>{const me=PE_IO.member();return!!(me&&!me.admin);};
const mtTxt=()=>MT.n?`새 답장 ${MT.n}개`:'궁금한 점·요청, 관리자 답장';
function mtBtn(){return MT.n?`<button class="ibx mt" data-act="go" data-h="msg" aria-label="관리자 답장, 안 읽은 답장 ${MT.n}개">${icon('mail')}<b class="bdg num">${ibxCnt(MT.n)}</b></button>`:'';}
function paintMt(){document.querySelectorAll('#view > .ibxrow.mtrow').forEach(x=>x.remove());const v=$('#view');
  if(MT.n&&!R.page&&v)v.insertAdjacentHTML('afterbegin',`<div class="ibxrow mtrow">${mtBtn()}</div>`);document.querySelectorAll('[data-mtn]').forEach(x=>{x.textContent=mtTxt();});}
function mtPoll(force){if(!mtOn()||MT.busy||(!force&&Date.now()-MT.at<300000))return;MT.busy=true;MT.at=Date.now();
  PE_IO.memberCall('thread').then(v=>{MT.busy=false;MT.data=v&&typeof v==='object'?v:{msgs:[],replies:null};const n=(MT.data.replies||[]).filter(r=>!r.read).length;
    if(R.page==='msg'){const rs=mtMark();render();return mtSend(rs);}if(n!==MT.n){MT.n=n;paintMt();}},()=>{MT.busy=false;if(R.page==='msg'&&!MT.data){MT.data={msgs:[],replies:null,err:1};render();}});}
/* 이 화면에서 본 답장을 읽음으로: 먼저 표시(이번에 처음 본 답장에 "새 답장")를 하고 그린 뒤 앱에 읽음 요청 */
function mtMark(){const rs=(MT.data&&MT.data.replies||[]).filter(r=>!r.read);MT.n=0;rs.forEach(r=>{r.read=true;r.fresh=true;});return rs;}
function mtSend(rs){if(rs.length)PE_IO.memberCall('reply-read',{rids:rs.map(r=>r.rid)}).catch(()=>{rs.forEach(r=>{r.read=false;});});}
function vMsg(){const me=PE_IO.member();if(!me)return topbar('관리자와 문자')+'<div class="empty" style="margin-top:20px"><b>앱에서만 보낼 수 있어요</b></div>';
  const d=MT.data,ts=x=>Date.parse(x)||0,items=d?(d.msgs||[]).map(m=>({at:m.at,m})).concat((d.replies||[]).map(r=>({at:r.at,r}))).sort((a,b)=>ts(b.at)-ts(a.at)):[];
  return topbar('관리자와 문자')+`<h1 class="ptitle">관리자와 문자</h1><p class="lsub">아이디 ${esc(me.id)}로 보내요. 관리자만 읽고, 답장은 여기로 와요.</p>
  <label class="f" for="msgText">보낼 말</label><textarea class="in plain" id="msgText" maxlength="500" placeholder="궁금한 점이나 요청을 적어 주세요">${esc(SV.msgDraft||'')}</textarea>
  <div class="btns"><button class="btn" data-act="msg-send">보내기</button></div><p class="note">500자까지. 보낸 때와 이 휴대폰의 iOS·앱 버전이 함께 가요.</p>
  ${!d?'<div class="empty" style="margin-top:14px"><b>주고받은 문자를 불러오는 중</b></div>':d.err?'<div class="empty" style="margin-top:14px"><b>주고받은 문자를 불러오지 못했어요</b>인터넷 연결을 확인해 주세요.</div>'
    :items.length?`<div class="msgs">${items.map(({m,r})=>m?`<article class="sheet msg me"><div class="mh"><b>${esc(msgWhen(m.at))}</b><span class="mwho">보낸 문자</span></div><p class="mt">${esc(m.text)}</p></article>`
      :`<article class="sheet msg rp${r.fresh?' fresh':''}"><div class="mh"><b>${esc(msgWhen(r.at))}</b><span class="mwho">관리자 답장${r.dec?' · '+DEC_TXT[r.dec]:''}</span>${r.fresh?'<span class="tag-new">새 답장</span>':''}</div><p class="mt">${esc(r.text)}</p></article>`).join('')}</div>`:''}`;}

/* ════════ 18. 타이머 ════════ */
/* ctx: 그 자리에서 시작한 타이머 {kind 'mock'|'essay'|'dd', D 날짜, pk 교시, label 이름, short 짧은 이름}(모의고사 화면·세트 ④ 논술·숙제 단답 카드 안 타이머).
   ended: 0이 된 때 {ctx, at, seen}(seen: 그 자리를 보았거나 모의의 시간 끝 창을 띄움). 새로 시작·처음으로·다른 타이머로 바꾸면 지운다 */
const TM={preset:'essay',total:6000,parts:4,endAt:0,remain:6000,running:false,iv:null,lastPart:-1,custom:100,ctx:null,ended:null};
const PRESETS={p1:{n:'1교시 단답',total:100,parts:10},essay:{n:'논술 교시',total:100,parts:4},one1:{n:'단답 1문',total:10,parts:1},one2:{n:'논술 1문',total:25,parts:1},custom:{n:'직접',total:0,parts:1}};
function setPreset(k){TM.preset=k;const p=PRESETS[k];TM.total=(k==='custom'?TM.custom:p.total)*60;TM.parts=p.parts;TM.remain=TM.total;TM.running=false;TM.lastPart=-1;TM.ctx=null;TM.ended=null;clearInterval(TM.iv);PE_IO.keepAwake(false);}
const tName=()=>(TM.ctx&&TM.ctx.label)||PRESETS[TM.preset].n;
/* 다른 타이머로 바꾸기: 돌고 있거나 멈춰 둔 타이머가 있으면 먼저 묻는다(취소하면 o.no). o.ctx: 그 자리, o.parts: 문제 수(문제마다 알림)
   같은 타이머: 타이머 화면에서 고른 칸을 다시 누르면(o.keep) 그대로, 다른 화면의 타이머 버튼은 새로 맞추되 돌고 있을 때만 묻는다 */
function setPresetAsk(k,then,o){o=o||{};const busy=TM.running||(TM.remain>0&&TM.remain<TM.total),same=TM.preset===k&&(k!=='custom'||TM.custom===o.mins);
  const go=()=>{if(k==='custom'&&o.mins)TM.custom=o.mins;setPreset(k);if(o.parts)TM.parts=o.parts;if(o.ctx)TM.ctx=o.ctx;then&&then();};
  if(busy&&same&&o.keep){if(o.ctx)TM.ctx=o.ctx;return then&&then();}if(!busy||(same&&!TM.running))return go();
  PE_IO.ask('돌고 있는 '+tName()+' 타이머(남은 '+mmss(TM.remain)+')를 멈추고 '+(o.name||PRESETS[k].n)+' '+(o.n||(k==='custom'?o.mins:PRESETS[k].total))+'분으로 바꿀까요?',go,o.no);}
function beep(long){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;TM.ac=TM.ac||new A();if(TM.ac.state!=='running'&&TM.ac.resume)TM.ac.resume().catch(()=>{});const o=TM.ac.createOscillator(),g=TM.ac.createGain();o.connect(g);g.connect(TM.ac.destination);o.frequency.value=long?660:880;g.gain.value=.15;o.start();o.stop(TM.ac.currentTime+(long?.9:.25));}catch(e){}}
function partIdx(){const per=TM.total/TM.parts;return Math.min(TM.parts,Math.floor((TM.total-TM.remain)/per)+1);}
function tStart(){if(TM.running)return;if(TM.remain<=0)TM.remain=TM.total;TM.ended=null;TM.endAt=Date.now()+TM.remain*1000;TM.running=true;beep(false);
  PE_IO.keepAwake(true);
  TM.iv=setInterval(()=>{TM.remain=Math.max(0,Math.round((TM.endAt-Date.now())/1000));const part=partIdx();if(TM.lastPart>=0&&part!==TM.lastPart&&TM.remain>0){beep(false);toast(part+'번째 문제 시간');}TM.lastPart=part;
    if(TM.remain<=0){clearInterval(TM.iv);TM.running=false;beep(true);PE_IO.keepAwake(false);tEnd();}paintTimer();paintPill();},250);paintTimer();paintPill();}
function tPause(){if(!TM.running)return;clearInterval(TM.iv);TM.running=false;TM.remain=Math.max(0,Math.round((TM.endAt-Date.now())/1000));PE_IO.keepAwake(false);paintTimer();paintPill();}
function tReset(){clearInterval(TM.iv);TM.running=false;PE_IO.keepAwake(false);TM.remain=TM.total;TM.lastPart=-1;TM.ended=null;paintTimer();paintPill();}
/* 그 타이머의 자리: 모의고사 화면 · 세트 ④ 논술 · 세트 ③ 숙제(단답 카드), 자리 없는 타이머는 타이머 화면 */
const tHome=c=>!c?R.page==='timer':c.kind==='mock'?R.page==='mock'&&R.a===c.D:R.page==='set'&&R.a===c.D&&(SV[c.D]||'cards')===(c.kind==='essay'?'essay':'tasks');
/* 0이 됐을 때(틱 안에서): 그 모의고사 화면이면 다시 그려 집중 모드를 끄고 시간 끝 창(tEndShow), 그 밖은 알림과 위쪽 "⏱ 시간 끝" 알약만.
   다른 창(낱말 풀이 등)이 열려 있으면 그 아래 화면만 다시 그리고 알림, 시간 끝 창은 그 창을 닫을 때(dismissModal).
   점수 칸을 쓰는 중이면 다시 그리지 않고(쓰던 칸 그대로) 집중 모드 표시만 끈다(창은 다음에 그릴 때). 가리며 외우기·세션 화면에서는 돌아가면 그 모의 화면에서 */
function tEnd(){const c=TM.ctx,E=TM.ended={ctx:c,at:Date.now(),seen:0},home=tHome(c),mk=!!c&&c.kind==='mock';
  if(home&&!mk)E.seen=1;
  if(home&&mk){if(kbEl(document.activeElement))focusPaint();else{render();if(E.seen)return;}}
  if(R.page==='timer')render();
  toast(c?c.short+' 시간이 끝났어요':'시간 종료');}
/* 모의고사 화면을 그린 뒤: 그 교시 시간이 끝났고 아직 안 적었으면 시간 끝 창(한 번). 다른 자리는 본 것으로 */
function tEndShow(){const E=TM.ended;if(!E||!tHome(E.ctx))return;const c=E.ctx;if(!c||c.kind!=='mock'){E.seen=1;return;}
  if(!E.seen&&!(S.mockp[c.D]||{})[c.pk]&&!$('#modal-wrap').innerHTML){E.seen=1;openModal(timerEndSheet(c));}}
function timerEndSheet(c){return`<p class="sheet-k">타이머</p><h3 class="cmh">시간 끝 · ${esc(c.label)}</h3><p class="ds">다 썼으면 답안 사진을 찍어 두세요.</p>
  <div class="btns"><button class="btn" data-act="mock-part" data-d="${esc(c.D)}" data-k="${esc(c.pk)}">다 썼어요</button></div>
  <div class="btns"><button class="btn sec" data-act="timer-more">5분 더</button><button class="btn sec" data-act="sheet-close">닫기</button></div>`;}
/* 그 자리의 일을 다 했다고 적으면 그 자리 타이머는 멈추고 처음으로(알약·"시간 끝"도 없앰) */
function tDone(kind,D,pk){const c=TM.ctx;if(!c||c.kind!==kind||c.D!==D||pk&&c.pk!==pk)return;tReset();TM.ctx=null;}
/* 알약을 누르면 그 타이머의 자리로(화면 안 타이머까지 내려 보여 줌). 모의 교시 시간이 끝났으면 그 화면에서 시간 끝 창 */
function tGoHome(){const c=TM.ctx;if(TM.ended&&c&&c.kind==='mock'&&TM.ended.ctx===c&&!(S.mockp[c.D]||{})[c.pk])TM.ended.seen=0;
  if(!c)return nav('timer');SV.scrollTo='#view [data-timer]';if(c.kind==='mock')return nav('mock/'+c.D);SV[c.D]=c.kind==='essay'?'essay':'tasks';return nav('set/'+c.D);}
/* 화면 안 타이머(.tline): 그 자리(ctx)에서 시작한 타이머가 돌거나 멈춰 있거나 막 끝났으면 남은 시간·문제·버튼 하나, 아니면 시작 버튼(st: {p 타이머, l 글, c 모양}).
   틱마다 paintTimer가 글자만 바꾼다(다시 그리지 않음) */
const tLive=c=>!!c&&!!TM.ctx&&TM.ctx.kind===c.kind&&TM.ctx.D===c.D&&(TM.ctx.pk||'')===(c.pk||'')&&(TM.running||TM.remain>0&&TM.remain<TM.total||!!TM.ended&&TM.ended.ctx===TM.ctx);
const tOver=()=>!!TM.ended&&TM.remain<=0;
/* 문제마다 나눈 타이머는 "4/10문 · 10:00 남음"(남은 시간은 한 덩이로 줄이 꺾이지 않게), 한 문제 타이머는 "논술 1문 25분". HTML(틱마다 paintTimer가 바꿈) */
function tlPart(){if(tOver())return'시간이 끝났어요';const part=partIdx(),per=TM.total/TM.parts,left=Math.max(0,Math.round(per*part-(TM.total-TM.remain)));
  return(TM.parts>1?`${part}/${TM.parts}문 · <span class="nw">${mmss(left)} 남음</span>`:esc(`${tName()} ${Math.round(TM.total/60)}분`))+(TM.running?'':' · 멈춤');}
const tlBtn=()=>tOver()?['timer-more','5분 더']:['timer-toggle',TM.running?'일시정지':'계속'];
/* st 시작 버튼(세트 ④ 논술 25분 · 숙제 단답 10분). 시간이 끝나면 "5분 더" 옆에 같은 타이머를 새로 시작하는 보조 버튼(.tlr): 그릴 때, 또는 그 화면에서 0이 되면 paintTimer가 붙인다
   (화면 안 타이머가 st를 data-sp·data-sl로 기억). 첫 버튼은 늘 tlBtn(틱마다 paintTimer가 글과 동작을 바꾼다) */
const tlStartBtn=(ctx,st,c)=>`<button class="${c||st.c||'btn sm sec'}" data-act="tl-start" data-p="${st.p}" data-kind="${ctx.kind}" data-d="${esc(ctx.D)}">${esc(st.l)}</button>`;
function timerInlineHTML(ctx,st){if(!tLive(ctx))return st?tlStartBtn(ctx,st):'';
  const[a,l]=tlBtn();return`<div class="tline${TM.remain<=180&&TM.remain>0?' urgent':''}${tOver()?' end':''}" data-timer="${TM.preset}"${st?` data-sp="${st.p}" data-sl="${esc(st.l)}"`:''}><b class="tlt">${mmss(TM.remain)}</b><span class="tlp">${tlPart()}</span><button class="btn sm sec" data-act="${a}">${l}</button>${st&&tOver()?tlStartBtn(ctx,st,'btn sm sec tlr'):''}</div>`;}
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function paintTimer(){const el=$('#timerBox');
  if(el){const per=TM.total/TM.parts,part=partIdx(),partLeft=Math.max(0,Math.round(per*part-(TM.total-TM.remain)));
    el.className='timer'+(TM.remain<=180&&TM.remain>0?' urgent':'');el.innerHTML=`<div class="big">${mmss(TM.remain)}</div><div class="part">${TM.parts>1?`문제 <b>${part}/${TM.parts}</b>, 이 문제 남은 시간 <b>${mmss(partLeft)}</b>`:`${esc(tName())} ${Math.round(TM.total/60)}분`}</div>`;
    const b=$('#tStart');if(b)b.textContent=TM.running?'일시정지':(TM.remain<TM.total&&TM.remain>0?'계속':'시작');}
  document.querySelectorAll('#view [data-timer]').forEach(x=>{if(x.dataset.timer!==TM.preset)return;const[a,l]=tlBtn(),t=x.querySelector('.tlt'),p=x.querySelector('.tlp'),b=x.querySelector('button');
    x.classList.toggle('urgent',TM.remain<=180&&TM.remain>0);x.classList.toggle('end',tOver());if(t)t.textContent=mmss(TM.remain);if(p)p.innerHTML=tlPart();if(b){b.dataset.act=a;b.textContent=l;}
    if(tOver()&&x.dataset.sp&&TM.ctx&&!x.querySelector('.tlr'))x.insertAdjacentHTML('beforeend',tlStartBtn(TM.ctx,{p:x.dataset.sp,l:x.dataset.sl},'btn sm sec tlr'));});}
/* 지금 화면에 이 타이머가 보이면 알약을 숨긴다: 화면 안 타이머의 숫자(.tlt)가 위쪽 막대 아래(없으면 위쪽 안전 영역 아래)부터
   아래 막대(.nextbar)·아래 탭·아래 안전 영역 위까지 사이에 다 들어올 때만(막대 높이는 그때그때 잰다: 글자 크기·안전 영역·집중 모드). 배치를 모르면(검사) 보이는 것으로 */
function tInline(){const el=document.querySelector('#view [data-timer="'+TM.preset+'"]');if(!el)return false;const r=(el.querySelector('.tlt')||el).getBoundingClientRect();if(!r.height)return true;
  const box=s=>{const x=document.querySelector(s),b=x&&x.getBoundingClientRect();return b&&b.height?b:null;},tb=box('#view .topbar'),nb=box('#view .nextbar'),tabs=box('#nav'),px=(x,k)=>x&&parseFloat(getComputedStyle(x)[k])||0;
  const top=tb?tb.bottom:px(document.body,'paddingTop'),bot=Math.min(nb?nb.top:1e9,tabs?tabs.top:1e9,window.innerHeight-px($('#nav'),'paddingBottom'));
  return r.top>=top-1&&r.bottom<=bot+1;}
/* 화면 안 타이머를 막 시작하면 그 줄을 화면 가운데로(아래 막대·탭에 가리지 않게) */
function tlShow(){const el=document.querySelector('#view [data-timer="'+TM.preset+'"]');if(el&&el.scrollIntoView)el.scrollIntoView({block:'center'});paintPill();}
/* 위쪽 알약: 도는(멈춘) 타이머는 남은 시간(누르면 그 자리로), 끝난 타이머는 "⏱ 시간 끝 · 1교시"(그 자리를 보면 없어짐, 모의 교시는 적을 때까지) */
/* 알약이 있는 동안 body.haspill과 알약 크기(--pw 폭+틈, --ph 높이): 위쪽 막대 제목은 알약 왼쪽에서 끝나고, 탭 첫 화면은 머리가 알약 아래에서 시작한다(styles.css) */
let pillH='',pillS='';
function paintPill(){const w=$('#tpill-wrap');if(!w)return;const on=TM.running||(TM.remain<TM.total&&TM.remain>0),E=TM.ended;let t='';
  if(on){if(R.page!=='timer'&&!tInline())t=`⏱ ${mmss(TM.remain)}${TM.running?'':' 멈춤'}`;}
  else if(E&&!tHome(E.ctx)&&(!E.seen||!!E.ctx&&E.ctx.kind==='mock'))t='⏱ 시간 끝'+(E.ctx?' · '+E.ctx.short:'');
  const h=t?`<button class="tpill${on?'':' end'}" data-act="tpill">${esc(t)}</button>`:'';if(h!==pillH){pillH=h;w.innerHTML=h;}
  const b=w.firstElementChild,sz=b?(b.offsetWidth+10)+'px '+b.offsetHeight+'px':'';document.body.classList.toggle('haspill',!!b);
  if(sz!==pillS){pillS=sz;const[a,c]=sz.split(' ');document.body.style.setProperty('--pw',a||'0px');document.body.style.setProperty('--ph',c||'0px');}}
function vTimer(){return topbar('타이머')+`<h1 class="ptitle">교시 타이머</h1><p class="lsub">시작 3분은 문제 고르기, 마지막 3분은 번호·공란 확인에 쓰세요.</p>
  <div class="seg" style="margin-top:14px">${Object.keys(PRESETS).map(k=>`<button class="${TM.preset===k?'on':''}" data-act="timer-preset" data-p="${k}">${PRESETS[k].n}${PRESETS[k].total?' '+PRESETS[k].total+'분':''}</button>`).join('')}</div>
  ${TM.preset==='custom'?`<div class="btns"><input class="in" id="tmCustom" type="number" inputmode="numeric" value="${TM.custom}" style="max-width:120px"><button class="btn sm sec" data-act="timer-custom">분으로 맞추기</button></div>`:''}
  <div class="timer" id="timerBox"></div>${tOver()?`<p class="tend">시간이 끝났어요</p>`:''}<div class="btns"><button class="btn" id="tStart" data-act="timer-toggle">시작</button><button class="btn sec" data-act="timer-reset">처음으로</button></div>
  ${tOver()?`<div class="btns"><button class="btn sec" data-act="${TM.ctx?'tpill':'back'}">돌아가기</button></div>`:''}
  <p class="note">문제 경계마다 짧은 알림음, 끝나면 긴 알림음이 나요. 다른 화면으로 가도 위쪽에 남은 시간이 보여요.</p>`;}

/* ════════ 19. 모달(카드·목차 보기) ════════ */
/* 3.0.0을 처음 열 때 한 번(S.tk['seen:v3']): 바뀐 점. 새로 설치한 휴대폰(저장된 기록 없음)에는 띄우지 않고 표시만 해 둔다 */
function v3Sheet(){return`<p class="sheet-k" data-v3="1">기술사 6개월 ${APP_VER}</p><h3 class="cmh">바뀐 점</h3><p class="v3l">오늘 몫 · 이번 주 · 복습 · 연습으로 정리했어요. 예전 기능은 모두 그대로 있어요.</p>
  <div class="group">${[['오늘','체크리스트 대신 "오늘 몫": 남은 시간에 맞춰 고른 번호 순서예요'],['이번 주','일요일까지 끝낼 것과 이번 주 점수, 학습 달력·통계'],['복습','세트 복습·오답 노트·별표 카드, 가리며 외우기'],['연습','예전 암기·테스트 탭(카드·문제·기출 문제은행·모의고사)'],['더보기','시험 일정, 답안 작성 요령, 교시 타이머, 백업']].map(([a,b])=>row({t:a,d:esc(b)})).join('')}</div>
  <div class="btns"><button class="btn sec" data-act="sheet-close">닫기</button></div>`;}
/* 본 것(S.tk['seen:v3'])은 사용자가 그 창을 닫을 때 적는다(닫기·바깥·왼쪽 가장자리 밀기, dismissModal). 그 전에 알림을 눌러 다른 화면으로 가도(App.js → _go → go) 그 화면 위에 다시 띄운다(V3P) */
let V3P=false;
function v3Once(){S.tk=S.tk||{};if(S.tk['seen:v3'])return;if(S_NEW){S.tk['seen:v3']=todayStr();return save();}V3P=true;v3Again();}
function v3Again(){if(V3P&&!(S.tk||{})['seen:v3']&&!$('#modal-wrap').innerHTML)openModal(v3Sheet());}
function openModal(html){$('#modal-wrap').innerHTML=`<div class="modal" data-act="modal-close"><div class="msheet" data-stop="1"><div class="grab"></div>${html}</div></div>`;}
function closeModal(){$('#modal-wrap').innerHTML='';}
/* 사용자가 창을 닫을 때(닫기 · 바깥 · 왼쪽 가장자리 밀기)만: "바뀐 점" 창이면 본 것으로 적고, 그 창 아래서 모의 교시 시간이 끝났으면 다시 그려 시간 끝 창.
   closeModal에는 붙이지 않는다(여러 동작이 시작할 때 부르므로, 거기서 다시 그리면 지난 시간 끝 창이 "2교시 시작"·새 타이머 위에 뜬다) */
function dismissModal(){const v3=!!$('#modal-wrap [data-v3]');closeModal();
  if(v3){V3P=false;S.tk=S.tk||{};S.tk['seen:v3']=todayStr();save();}
  const E=TM.ended;if(E&&!E.seen&&tHome(E.ctx))render();
  v3Again();}
function cardModal(c){const p=pget(c.id);return`<div class="sheet" style="margin-top:4px"><p class="sheet-k">${esc(unitName(c.u))}${p.seen?`, 다음 복습 ${esc(p.due||'—')}`:', 아직 학습 전'}</p><h3>${esc(c.t)}</h3><p class="defn ruled" style="margin-top:10px">${glHTML(c.d,c.id)}</p><ul class="kws">${(c.k||[]).map(k=>`<li><span>${esc(k)}</span></li>`).join('')}</ul>${c.x&&c.x.length?`<p class="xref">기출: ${c.x.map(kLabelShort).join(', ')}</p>`:''}${c.basis?`<p class="xref">근거: ${esc(c.basis)}</p>`:''}</div>
  <div class="btns"><button class="btn sec" data-act="star" data-id="${c.id}">${p.star?'★ 별표 해제':'☆ 별표'}</button>${p.seen?'':`<button class="btn" data-act="introduce" data-id="${c.id}">카드 복습에 넣기</button>`}</div><div class="btns"><button class="btn sec" data-act="memo-one" data-id="${c.id}">가리며 외우기</button><button class="btn sec" data-act="go" data-h="${esc(ddHash(c.id))}">단답 답안지로 보기</button></div><div class="btns"><button class="btn ghost" data-act="hide-card" data-id="${c.id}">이 카드 숨기기</button></div>`;}
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
/* 왼쪽 가장자리(20px 안)에서 오른쪽으로 밀기 = 뒤로(앱의 기기 뒤로 가기 몸짓은 껐다): 창이 열려 있으면 닫고(dismissModal), 아니면 위로(goUp). 탭 첫 화면에서는 그대로.
   테이프 붙이기를 켠 동안(상자 밖 왼쪽 여백에서 시작해도: 줄 첫머리를 노린 테이프가 외우기를 나가지 않게), 테이프를 긋는 중, 입력 칸을 쓰는 중, 두 손가락,
   옆으로 밀리는 칸(세그먼트 등) 위에서는 하지 않는다. 0.7초 안에 70px 넘게, 위아래로는 60px 안에서 */
let edXY=null;
const hScroll=el=>{for(;el&&el.nodeType===1&&el!==document.body;el=el.parentElement)if(el.scrollWidth>el.clientWidth+1&&/auto|scroll/.test(getComputedStyle(el).overflowX))return true;return false;};
document.addEventListener('touchstart',e=>{const t=e.touches&&e.touches[0],tg=e.target;
  edXY=t&&e.touches.length===1&&t.clientX<=20&&!tpDrag&&!$('#memoBox.editing')&&!kbEl(document.activeElement)&&!hScroll(tg)?[t.clientX,t.clientY,Date.now()]:null;},{passive:true});
document.addEventListener('touchend',e=>{const t=e.changedTouches&&e.changedTouches[0],s=edXY;edXY=null;if(!s||!t||glFired||tpDrag)return;
  const dx=t.clientX-s[0],dy=t.clientY-s[1];if(dx<70||Math.abs(dy)>=60||Date.now()-s[2]>700)return;
  if($('#modal-wrap').innerHTML)return dismissModal();if(R.page)goUp();},{passive:true});
document.addEventListener('touchcancel',()=>{edXY=null;});
document.addEventListener('contextmenu',e=>{if(glAt(e.target,e.clientX,e.clientY))e.preventDefault();});
document.addEventListener('click',e=>{if(glFired&&Date.now()-glFired<1500){glFired=0;e.preventDefault();e.stopPropagation();}},true);
document.addEventListener('click',e=>{
  const m=e.target.closest('[data-stop]');const b=e.target.closest('[data-act]');
  if(b&&b.dataset.act==='modal-close'&&m)return;
  {const sm=e.target.closest('summary'),fd=sm&&sm.parentElement;if(fd&&fd.matches('details[data-fold]'))UI.open[fd.dataset.fold]=!fd.open;}   /* 접는 칸을 연 것·닫은 것(다시 그려도 그대로) */
  if(!b)return;const a=b.dataset.act,D=b.dataset;
  switch(a){
  case'go':closeModal();return nav(D.h);
  case'back':return goUp();
  case'modal-close':return dismissModal();
  case'sync':{const p=sync(true);render();return p;}   /* 누르면 바로 "받아 오는 중…"(버튼은 누를 수 없음) */
  /* 오늘 몫·이번 주 */
  case'task':{const ids=String(D.ids||D.id||'').split(' ').filter(Boolean);if(!ids.length)return;closeModal();return taskGo(ids[0],ids.length>1?{chain:ids.slice(1)}:{});}
  case'later':String(D.ids||'').split(' ').filter(Boolean).forEach(id=>{UI.later[id]=++laterN;});UI.act=null;return render();
  case'tk':return tkToggle(D.id);
  case'redo-tick':return redoTick(1);
  case'redo-undo':return redoTick(-1);
  case'cap':return openModal(capSheet());
  case'cap-set':{const m=Number(D.m)||0,t=todayStr(),was=!!(S.days&&S.days[t]);if(was){delete S.days[t];save();}closeModal();planToday(t,{replan:'cap',user:m||null,relv:was});   /* 쉬는 날·짧은 날이었으면 그 표시를 지우고 단계도 다시 센다 */toast(m?`오늘 ${mfmt(m)}에 맞춰 다시 짰어요`:'평소 시간으로 다시 짰어요');return render();}
  case'sheet-close':dismissModal();return;
  /* 쉬는 날·짧은 날(S.days[날짜]={m}, 평소 시간이면 지움): 오늘은 쉬어요 → 오늘 몫을 다시 짬(날짜 일만 남음), 다시 공부할래요, 이번 주 앞날 */
  /* 오늘은 쉬어요: 쉬기 전 시간(오늘 시간으로 줄였으면 u, 짧은 날이었으면 p)을 함께 둬서 쉬는 날 카드가 미리 보기와 같은 분을 쓰고 "다시 공부할래요"가 그 시간으로 돌아간다.
     이번 주에 공부하는 날이 더 없으면(일요일 등) 알림은 다음 주로 놓아준다고 */
  case'cap-off':{const t=todayStr(),F=S.today&&S.today.d===t?S.today:null;S.days=S.days||{};const o=S.days[t],x=o&&o.m===0?o:{m:0};if(x!==o){if(F&&F.user)x.u=F.user;else if(o&&o.m)x.p=o.m;}S.days[t]=x;
    save();closeModal();planToday(t,{replan:'off'});let more=false;for(let d=addDays(t,1);d<=wkEnd(t);d=addDays(d,1))if(!dayOff(d)&&dayKind(d)!=='exam')more=true;
    toast(more?'오늘은 쉬어요. 옮긴 몫은 이번 주 다른 날에 들어가요':'오늘은 쉬어요. 남은 필수는 다음 주로 놓아줘요');return render();}
  case'off-clear':{const t=todayStr(),x=(S.days||{})[t]||{};if(S.days){if(x.p)S.days[t]={m:x.p};else delete S.days[t];}save();closeModal();planToday(t,x.u?{replan:'cap',user:x.u,relv:1}:{replan:'budget'});toast('다시 공부하는 날로 바꿨어요');return render();}
  case'day-cap':{const d=D.d,t=todayStr();if(!d||d<=t||d>wkEnd(t)||dayKind(d)==='exam')return;return openModal(daySheet(d));}
  case'day-set':{const d=D.d,m=Number(D.m),t=todayStr();if(!d||!(m>=0)||d<=t||dayKind(d)==='exam')return;const raw=budgetOf(d,null,true),lb=dlab(d)+jo(DAYK[parse(d).getDay()],['은','는']);
    /* 오늘 몫은 오늘 단계 그대로 다시 고른다(일요일을 쉬면 토요일 리포트 등). 줄인 목표는 다음 고정 때(미리 보기가 말한 날부터) */
    S.days=S.days||{};const cur=S.days[d];if(m>=raw)delete S.days[d];else S.days[d]=m===0&&cur&&cur.m?{m:0,p:cur.m}:{m};save();closeModal();if(wkStart(d)===wkStart(t))planChanged('day');
    toast(m>=raw?`${lb} 평소대로예요`:m===0?`${lb} 쉬는 날로 정했어요`:`${lb} ${mfmt(m)}${jo(mfmt(m),['으로','로'])} 정했어요`);return render();}
  /* 설정 → 쉬는 날·짧은 날: 기간 창, 기간을 쉬는 날·짧은 날로(이번 주가 들면 오늘 몫을 오늘 단계 그대로 다시 고름), 한 줄 지우기(평소대로) */
  case'days-sheet':return openModal(daysSheet());
  case'days-set':{const t=todayStr(),m=Number(D.m),f0=($('#offFrom')||{}).value||'',t0=($('#offTo')||{}).value||'',ok=x=>/^\d{4}-\d\d-\d\d$/.test(x);
    if(!ok(f0)||!ok(t0)||!(m>=0))return toast('시작과 끝 날짜를 고르세요');const a=f0<=t0?f0:t0,z=f0<=t0?t0:f0;if(diffDays(a,z)+1>31)return toast('31일까지만 한 번에 정할 수 있어요');
    const lo=addDays(t,1),hi=addDays(PLAN.target.d,-1),ds=[];let inR=0;for(let d=a>lo?a:lo;d<=z&&d<=hi;d=addDays(d,1)){inR++;if(dayKind(d)!=='exam')ds.push(d);}
    if(!ds.length)return toast(inR?'시험 날은 정할 수 없어요':'내일부터 시험 전날까지 정할 수 있어요');   /* 고른 날이 모두 시험 날이거나 고를 수 있는 기간 밖 */
    S.days=S.days||{};let n=0;ds.forEach(d=>{const raw=budgetOf(d,null,true),cur=S.days[d];if(m>=raw)delete S.days[d];else{S.days[d]=m===0&&cur&&cur.m?{m:0,p:cur.m}:{m};n++;}});
    save();closeModal();if(ds.some(d=>wkStart(d)===wkStart(t)))planChanged('day');const f=ds[0],l=ds[ds.length-1],lb=runLab(f,l);
    toast(!n?`${lb}${runJo(l,['은','는'])} 평소대로예요`:m===0?`${lb}${runJo(l,['을','를'])} 쉬는 날로 정했어요`:`${lb}${runJo(l,['을','를'])} ${mfmt(m)}${jo(mfmt(m),['으로','로'])} 정했어요`);return render();}
  case'days-del':{const t=todayStr(),a=D.a,b=D.b;if(!a||!b||a>b)return;for(let d=a;d<=b;d=addDays(d,1))if(S.days&&S.days[d])delete S.days[d];
    save();if(a<=wkEnd(t)&&b>=wkStart(t))planChanged('day');toast(`${runLab(a,b)}${runJo(b,['은','는'])} 평소대로예요`);return render();}
  /* 평일 저녁에 나눠 하기(이번 주만, S.wk[W].cu = 켠 날): 오늘 몫을 다시 짠다(끝낸 줄은 그대로) */
  case'cu-on':case'cu-off':{const t=todayStr(),W=wkStart(t),on=a==='cu-on';S.wk=S.wk||{};const x=S.wk[W]||(S.wk[W]={});if(on)x.cu=t;else delete x.cu;save();planToday(t,{replan:'catch'});
    toast(on?'평일 저녁에 나눠 넣을게요. 오늘 몫을 다시 짰어요':'나눠 하기를 껐어요');return render();}
  case'plan-reset':planToday(todayStr(),{replan:'reset'});toast('오늘 몫을 다시 짰어요');return render();
  case'resume':return resumeGo(D.id||null);
  case'week-next':return weekNext(D.k,D);
  case'wk-dismiss':S.tk=S.tk||{};String(D.k||'').split(' ').filter(Boolean).forEach(k=>{S.tk[k]=todayStr();});save();return render();
  case'wk-last':return openModal(lastWeekSheet(D.w));
  case'start-rot':return startRot(Number(D.n)||50);
  case'budget':{const k=D.k,v=Number(D.v);if(!BUDGET_DEF[k]||!(v>0))return;S.settings.budget=Object.assign({},BUDGET_DEF,S.settings.budget||{},{[k]:v});S.tk=S.tk||{};S.tk.budget=todayStr();save();planChanged('budget');toast('하루 공부 시간을 바꿨어요. 오늘 몫을 다시 짰어요');return render();}
  case'chk':{const t=todayStr();S.checks[t]=S.checks[t]||{};S.checks[t][D.i]=b.checked;touchDay();save();return render();}
  /* 세트 */
  case'set-tab':SV[D.d]=D.t;if(D.eo)SV[D.d+':eo']=1;return render();
  case'set-open':setOpen(D.d,Number(D.i));return render();
  case'set-flash':return D.rv?withChain(D.d,()=>setFlash(D.d)):setFlash(D.d);
  /* 세트 화면 아래 막대: 다음 걸음(읽기·세트 퀴즈·숙제 필수·다음 오늘 줄). 숙제 칸은 hw-bulk, 논술 실전은 essay-done */
  case'set-bar':{const n=setNext(D.d);return n&&n.go?n.go():render();}
  case'hw-bulk':{const ks=String(D.ks||'').split(' ').filter(Boolean);hwBulk(D.d,ks,Number(D.v)||1);if(ks.some(k=>/^dd/.test(k)))tDone('dd',D.d);return render();}   /* 단답을 다 썼으면 그 카드의 10분 타이머는 멈춤 */
  case'essay-done':{const p=sp(D.d);p.essay=p.essay||{};if(!p.essay.done){p.essay.done=true;touchDay();const e=SETS.sets[D.d].essay;calMark('essay:'+D.d,'essay',`${korDate(D.d)} 세트 논술 손글씨: ${e&&e.t?e.t:''}`);hwCal(D.d);save();}tDone('essay',D.d);return render();}
  /* 단답 답안지의 다 썼어요: 숙제에서 열었으면 그 단답 동그라미, 아니면 오늘 "단답 1문제 더" */
  case'dd-done':{const p=sp(D.d);p.hw=p.hw||{};if((p.hw[D.k]||0)<1)p.hw[D.k]=1;touchDay();hwCal(D.d);save();tDone('dd',D.d);toast('숙제에 표시했어요');return render();}
  case'dd-tick':return tkToggle('x.dd2:'+todayStr(),'단답 1문제 더');
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
  case'set-essay-done':{const p=sp(D.d);p.essay=p.essay||{};p.essay.done=b.checked;touchDay();const e=SETS.sets[D.d].essay;if(b.checked){calMark('essay:'+D.d,'essay',`${korDate(D.d)} 세트 논술 손글씨: ${e&&e.t?e.t:''}`);tDone('essay',D.d);}else calUnmark('essay:'+D.d);hwCal(D.d);save();return render();}
  /* 숙제: 동그라미 k번째를 누르면 k번 한 것으로, 같은 것을 다시 누르면 하나 뺀다 */
  case'hw':{const p=sp(D.d);p.hw=p.hw||{};const v=Number(D.v),cur=p.hw[D.k]||0;p.hw[D.k]=cur===v?v-1:v;if(!p.hw[D.k])delete p.hw[D.k];if(D.k==='fg')hwFig(D.d,p);if(/^dd/.test(D.k)&&(p.hw[D.k]||0)>cur)tDone('dd',D.d);touchDay();hwCal(D.d);save();return render();}
  case'hw-task':{const p=sp(D.d);p.tasks[D.i]=!p.tasks[D.i];touchDay();hwCal(D.d);save();return render();}
  case'hw-ew':{const p=sp(D.d);p.essay=p.essay||{};p.essay.done=!p.essay.done;touchDay();const e=SETS.sets[D.d].essay;if(p.essay.done){calMark('essay:'+D.d,'essay',`${korDate(D.d)} 세트 논술 손글씨: ${e&&e.t?e.t:''}`);tDone('essay',D.d);}else calUnmark('essay:'+D.d);hwCal(D.d);save();return render();}
  case'hw-mn':{const p=sp(D.d);p.hw=p.hw||{};const v=String(($('#hwMn')||{}).value||'').trim().slice(0,80);if(v)p.hw.mn=v;else delete p.hw.mn;touchDay();hwCal(D.d);save();toast(v?'적어 두었어요':'지웠어요');return render();}
  case'copy-essay':{const e=SETS.sets[D.d].essay;return copy(promptWith('p1','(여기에 문제를 그대로 적는다)',e.t),'첨삭 요청을 복사했어요. 사진과 함께 Claude 프로젝트에 붙여 넣으세요');}
  /* 창 안의 별표는 그 버튼만 바꾼다(기출 문항처럼 카드 여러 장이 든 창을 한 장짜리로 바꾸지 않게) */
  case'star':{const p=prog(D.id);p.star=!p.star;save();if(b.closest('#modal-wrap'))b.textContent=p.star?'★ 별표 해제':'☆ 별표';return render();}
  case'introduce':{introduce(D.id);toast('내일 카드 복습에 나와요');closeModal();return render();}
  case'hide-card':return PE_IO.ask('이 카드를 숨길까요? 가져오기 화면에서 되돌릴 수 있어요.',()=>{S.hidden[D.id]=true;save();invalidate();closeModal();render();});
  /* 세션 */
  case'start-due':if(!cardsOut(todayStr()).length)return toast('지금 돌아온 카드가 없어요');return startDueAll({skip:[...outSkip(todayStr())]});   /* 복습·연습 탭 "카드 복습 n장"과 같은 목록 */
  case'start-study':{if(!newRoom())return toast(`오늘 새 카드 ${S.settings.newPerDay}장을 다 봤어요. 설정에서 바꿀 수 있어요`);return startStudy(null,{newOnly:true});}   /* 연습 탭 "새 카드 n장": 범위 안 새 카드만 */
  case'start-free':return startFree();
  case'memo-set':return D.rv?withChain(D.d,()=>memoSet(D.d)):memoSet(D.d);
  case'memo-rev':{const rv=dueSetReviews(),ids=uniq([].concat(...rv.map(x=>setIds(x.d))));return startMemo({key:'memo:rev',label:'세트 복습',title:'세트 복습: 가리며 외우기',items:ids.map(id=>({id})),revSets:rv.map(x=>x.d)});}
  case'memo-wrong':return memoWrong();
  case'memo-stars':return startMemo({key:'memo:stars',label:'별표 카드',title:'별표 카드 가리며 외우기',items:deck().filter(c=>pget(c.id).star).map(c=>({id:c.id}))});
  case'memo-sess':{if(!SES)return;const ids=D.only==='miss'?(SES.miss||[]).filter(id=>card(id)):sessCardIds(),cur=sessItemCard(SES.items[SES.i]);
    return startMemo({key:'memo:sess',label:SES.title||'학습',title:(SES.title||'학습')+': 가리며 외우기',items:ids.map(id=>({id})),i:Math.max(0,ids.indexOf(cur))},true);}
  case'memo-one':{const c=card(D.id);if(!c)return;return startMemo({key:'memo:one',label:gqMain(c),title:gqMain(c)+': 가리며 외우기',items:[{id:c.id}]},true);}
  case'gq-go':return D.rv?withChain(D.d,()=>startGq(D.d,D.r)):startGq(D.d,D.r);
  case'gq-mode':SV['gqm:'+D.d]=D.m;return render();
  case'card-modal':{const c=card(D.id);if(c)openModal(cardModal(c));return;}
  case'rev-open':return openModal(revSheet(D.d));
  case'memo-study':return startMemo({key:'memo:study',label:'연습 카드',title:'가리며 외우기',items:memoStudyIds().map(id=>({id}))});
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
  case'start-setrev':{const ch=revChain(D.d);return startSetReview(D.d,ch.length?{chain:ch,cpos:[1,ch.length+1]}:{});}   /* 복습 날 세트의 창: 끝 화면이 다음 세트 복습으로 잇는다 */
  case'rev-start':{const L=revList().map(x=>x.d);if(!L.length)return render();return startSetReview(L[0],L.length>1?{chain:L.slice(1),cpos:[1,L.length]}:{});}
  case'start-setrev-all':return startSetReviewAll();
  case'start-wrong':return startWrong();
  case'start-cloze':return startCloze();
  case'start-fill':return openModal(fillLvHTML(D.d||'',D.back,D.rv));
  /* 회원(앱 전용) */
  case'member-remove':return PE_IO.ask('아이디를 지울까요? 승인도 함께 없어지고 처음 화면으로 돌아가요.',()=>{flush();PE_IO.memberCall('remove').catch(e=>toast('지우지 못했어요: '+(e&&e.message||e)));});
  case'adm-reload':ADM=null;return render();
  case'ibx':ADM=null;IBX.at=0;closeModal();return nav('inbox');
  case'ibx-del':{const mids=((ADM&&ADM.msgs)||[]).filter(m=>m.uid===D.uid).map(m=>m.mid),rids=((ADM&&ADM.replies)||[]).filter(r=>r.uid===D.uid).map(r=>r.rid);if(!mids.length)return;
    return PE_IO.ask(`${D.id} 님이 보낸 문자 ${mids.length}개${rids.length?`와 보낸 답장 ${rids.length}개`:''}를 지울까요? 되돌릴 수 없어요.`,()=>PE_IO.memberCall('msg-del',{mids,rids}).then(()=>{toast('문자를 지웠어요');ADM=null;goUp();},err=>toast('지우지 못했어요: '+(err&&err.message||err))));}
  /* 관리자 답장: 승인·거절과 함께(dec), 글 없이 승인·거절만 하면 상태만 */
  case'ibx-reply':{const el=$('#rpText'),t=((el&&el.value)||'').trim(),dec=D.dec||'';if(!t&&!dec)return toast('답장을 적어 주세요');b.disabled=true;
    const done=dec==='approved'?(t?'승인하고 답장을 보냈어요':`${D.id} 님을 승인했어요`):dec==='rejected'?(t?'거절하고 답장을 보냈어요':`${D.id} 님의 승인을 막았어요`):'답장을 보냈어요';
    return PE_IO.memberCall('reply',{uid:D.uid,text:t,dec}).then(()=>{delete SV['rp:'+D.uid];toast(done);admLoad();render();},err=>{b.disabled=false;toast('보내지 못했어요: '+(err&&err.message||err));});}
  case'msg-send':{const el=$('#msgText'),t=((el&&el.value)||'').trim();if(!t)return toast('보낼 말을 적어 주세요');b.disabled=true;
    return PE_IO.memberCall('msg-send',{text:t}).then(()=>{SV.msgDraft='';toast('관리자에게 보냈어요');MT.at=0;if(R.page==='msg'){render();mtPoll(true);}},err=>{b.disabled=false;toast('보내지 못했어요: '+(err&&err.message||err));});}
  case'adm-set':return admRun(PE_IO.memberCall('set',{uid:D.uid,status:D.s}),D.s==='approved'?D.id+' 님을 승인했어요':D.id+' 님의 승인을 막았어요');
  case'adm-del':return PE_IO.ask(`${D.id} 아이디를 지울까요? 그 휴대폰은 처음 화면으로 돌아가요.`,()=>admRun(PE_IO.memberCall('del',{uid:D.uid,id:D.id}),'지웠어요'));
  case'code-add':return admRun(PE_IO.memberCall('code-add').then(code=>{copy(code,'초대 코드 '+code+'를 만들고 복사했어요');}),'');
  case'code-del':return admRun(PE_IO.memberCall('code-del',{code:D.code}),'초대 코드를 지웠어요');
  case'code-copy':return copy(D.code,'초대 코드를 복사했어요');
  case'fill-lv':closeModal();if(D.v!=='mix'){S.fillLv=D.v;save();}return D.rv&&D.d?withChain(D.d,()=>startFill(D.v,D.d)):startFill(D.v,D.d||'');
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
  /* 끝 화면의 "다음"(p)·"또는"(l): 그린 때와 같은 계산으로 그대로 */
  case'end-go':{const[P,L]=endNexts(),x=D.w==='l'?L:P;if(!x)return render();if(x.act==='sess-rest')return sessRest();return x.go?x.go():render();}
  /* 테스트 기록은 끝 화면에서 이미 남겼다(sessDone). 끝난 세션을 지우고 연 곳으로 */
  case'sess-close':{const up=upOf(R);SES=null;return goUp(up);}
  case'wrong-del':delete S.wrong[D.k];save();return render();
  /* 테스트·모의 */
  case'gen-mock':return genMock();
  case'kq':return kqModal(D.id);
  case'mock-reveal':SV['mk:'+D.d]=1;return render();
  case'mock-graded':{const pr=S.mockp[D.d]||(S.mockp[D.d]={}),mk='mock:'+D.d+':g';if(pr.g){delete pr.g;calUnmark(mk);}else{pr.g=todayStr();touchDay();calMark(mk,'mock',`${mockName(D.d)} 채점 받음`);}save();return render();}
  /* 모의고사 단계: 교시 시작(타이머, 이 화면에 머묾) · 교시 다 썼어요(시간 끝 창도 같은 길, 그 교시 타이머는 멈춤) · 되돌리기 · 다 한 뒤 다음 */
  case'mock-start':return mockStart(D.d,D.k);
  case'mock-part':{const pr=S.mockp[D.d]||(S.mockp[D.d]={});closeModal();if(!pr[D.k]){pr[D.k]=true;touchDay();calMark('mock:'+D.d+':'+D.k,'mock',`${mockName(D.d)} ${MKP[D.k]||''} 다 씀`);}tDone('mock',D.d,D.k);save();return render();}
  case'mock-undo':{const pr=S.mockp[D.d];if(pr&&pr[D.k]){delete pr[D.k];calUnmark('mock:'+D.d+':'+D.k);save();}return render();}   /* 도는 다른 교시 타이머는 그대로(mockStep이 그 교시를 지금 교시로) */
  case'mock-pick':{const F=FLOW&&FLOW.at==='mock/'+D.d?FLOW:null;SV['mkw:'+D.d]={k:D.k,f:F?F.id:''};return render();}   /* 단계 줄에서 고른 교시를 지금 교시로(그 교시 시작은 아래 막대) */
  case'mock-next':{const n=mockNext(D.d);return n&&n.go?n.go():render();}
  /* 예전 모의고사 화면의 다 썼어요 칸(지금 화면에는 없음) */
  case'mock-done':{const pr=S.mockp[D.d]||(S.mockp[D.d]={});pr[D.k]=b.checked;touchDay();const mk='mock:'+D.d+':'+D.k;if(b.checked)calMark(mk,'mock',`${D.d==='app'?'앱 모의고사':korDate(D.d)+' 모의고사'} ${({p1:'1교시',p2:'2교시',p3:'3교시',p4:'4교시'})[D.k]||''} 다 씀`);else calUnmark(mk);save();return;}
  case'copy-mock':{const m=D.d==='app'?appMockObj():SETS.mocks[D.d];return copy(promptWith('p9','(앱이 자동으로 채워 넣음)','\n'+mockText(m)),'채점 요청을 복사했어요');}
  case'copy-mock-q':{const m=D.d==='app'?appMockObj():SETS.mocks[D.d];return copy(mockText(m),'문제를 복사했어요');}
  case'copy-round':{const r=kichulRounds().find(x=>x.r===Number(D.r));return copy(promptWith('p9','(앱이 자동으로 채워 넣음)','\n'+roundText(r)),'채점 요청을 복사했어요');}
  case'copy-outline-req':{const q=kq()[D.id];return copy(`토목시공기술사 제${q.r}회 ${q.p}교시 ${q.n}번 "${q.t}"의 모범 답안 목차를 만들어라. 소제목 5~7개(각 소제목 아래 핵심 키워드 3개), 넣을 그림·표 1개, 현장 적용 사례 소제목 1개, 결론의 최신 경향 1줄. 마지막에 아래 JSON 한 줄도 출력: [{"t":"문제","o":["1. 개요","..."],"p":"포인트·그림","u":${q.u},"f":3}]`,'목차 요청을 복사했어요');}
  case'report':return reportCopy(D.w||null);
  /* 타이머 */
  case'timer-go':return setPresetAsk(D.p,()=>nav('timer'),{no:()=>nav('timer')});
  case'timer-preset':return setPresetAsk(D.p,render,{no:render,keep:1,mins:D.p==='custom'?TM.custom:undefined});
  case'timer-custom':return setPresetAsk('custom',render,{no:render,keep:1,mins:Math.max(1,Number(($('#tmCustom')||{}).value)||100)});
  case'timer-toggle':{TM.running?tPause():tStart();if(R.page==='mock')render();return;}   /* 모의고사 화면은 집중 모드(도는 동안)를 다시 맞춘다 */
  case'timer-reset':return tReset();
  /* 화면 안 타이머: 그 자리에서 시작(세트 ④ 논술 25분 · 숙제 단답 10분), 시간 끝 뒤 5분 더, 위쪽 알약 → 그 자리 */
  case'tl-start':{const k=D.p;if(!PRESETS[k])return;return setPresetAsk(k,()=>{tStart();render();tlShow();},{ctx:{kind:D.kind,D:D.d,label:PRESETS[k].n,short:PRESETS[k].n},no:render});}
  case'timer-more':{closeModal();if(TM.running)return render();TM.remain=Math.max(0,TM.remain)+300;if(TM.remain>TM.total)TM.total=TM.remain;tStart();return render();}
  case'tpill':closeModal();return tGoHome();
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
  /* 저장: 시작일을 바꾸면 바로(지금 주까지 산 단계를 적어 두고 기다리던 바꾸기·되돌리기는 지움). 목표만 바꾸면 이번 주가 그대로일 때 바로, 아니면 바뀌는 월요일까지 기다림(nextTarget).
     어느 쪽이든 "지금 일정대로 할게요"는 지우고, 저장소 일정이 저장한 일정(기다리면 그 새 일정)과 다르면 변경 요청을 같은 탭에서 복사(schSent·schSig).
     그 전 복사 기록은 다른 일정의 것이라 늘 새로 정한다(7일 안에 두 번 바꾸기·되돌리기도 복사). 지금과 같은 계획(예: 자동 = 제142회 → 제142회)은 바꾸지 않는다 */
  case'sch-save':{if(!SCH)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(SCH.start||''))return toast('준비 시작일을 확인하세요');
    /* 준비 시작일을 다시 정하면 이전 공부 기록을 지우고 새로 시작(3.1.3, "기록은 그대로 두기"를 고르지 않았을 때) */
    if(SCH.start!==S.settings.start&&hasRec()&&!SCH.keep){const ns=SCH.start,tg=SCH.target||'auto';
      return PE_IO.ask(`이전 공부 기록(${WIPE_TXT})을 지우고 ${korDate(ns)}부터 새로 시작할까요? 설정과 내 카드는 그대로이고, 지운 기록은 7일 동안 더보기 → 백업에서 되돌릴 수 있어요.`,()=>{
        SCH=null;restartRec(ns,tg);const m='이전 기록을 지우고 '+korDate(ns)+'부터 새로 시작해요',t=todayStr();
        if(SETS.plan&&!sigEq(SETS.plan,repoWant())){schSentSet(t);save();PE_IO.copy(schReq()).then(()=>toast(m+'. 변경 요청을 복사했어요'),()=>{schSentDel();save();toast(m+'. 변경 요청은 복사하지 못했어요');render();});}
        else toast(m);render();});}
    const t=todayStr(),st=S.settings,pre=planPre(),prev=st.target||'auto',tg=SCH.target||'auto',stCh=SCH.start!==st.start,P1=stCh?null:computePlan(st.start,tg);
    if(P1&&P1.target.r===PLAN.target.r){SCH=null;return render();}
    const from=stCh?null:schFrom(PLAN,P1,t);
    delete st.slipNo;
    if(from){st.nextTarget={r:tg,from,prev,at:t};SCH=null;save();}
    else{lockLived(PLAN,wkIdx(t)+(stCh?1:0));if(stCh){st.start=SCH.start;delete st.schUndo;}else st.schUndo={r:prev,at:t};st.target=tg;delete st.nextTarget;SCH=null;recalcPlan();phaseReset(t);save();planChanged('sched',pre);}
    const msg=from?`${dlab(from)}부터 제${nextR(st.nextTarget)}회 일정이에요`:'시험 일정을 바꿨어요';
    if(SETS.plan&&!sigEq(SETS.plan,repoWant())){schSentSet(t);save();const m2=from||stCh?msg:`제${PLAN.target.r}회로 바꿨어요`;PE_IO.copy(schReq()).then(()=>toast(m2+'. 변경 요청을 복사했어요'),()=>{schSentDel();save();toast(m2+'. 변경 요청은 복사하지 못했어요');render();});}
    else{schSentDel();save();toast(msg);}
    return render();}
  case'sch-cancel':SCH=null;return render();
  case'sch-keep':if(SCH){SCH.keep=!SCH.keep;}return render();   /* 시작일을 바꿀 때 이전 기록 지우기 ↔ 그대로 두기 */
  case'rec-wipe':return PE_IO.ask(`이전 공부 기록(${WIPE_TXT})을 지우고 ${korDate(S.settings.start)}부터 새로 시작할까요? 설정과 내 카드는 그대로이고, 지운 기록은 7일 동안 더보기 → 백업에서 되돌릴 수 있어요.`,()=>{restartRec();toast('이전 기록을 지웠어요. 새로 시작해요');render();});
  case'rec-undo':{const p=prevRec();if(!p)return toast('되돌릴 기록이 없어요');
    return PE_IO.ask(`${korDate(p.at)}에 지운 공부 기록으로 되돌릴까요? 그 뒤에 한 공부 기록은 없어져요.`,()=>{adoptState(p.state);try{PE_IO.set(PREV_KEY,'');}catch(e){}recalcPlan();flush();invalidate();applyLook();flowReset();toast('지운 기록을 되돌렸어요');sync(true);nav('today');});}
  case'sch-pick':SCH={start:S.settings.start,target:D.r==='auto'?'auto':Number(D.r)};SV.scrollTo='#schPrev';render();return scrollDo();   /* 회차 견주기·되돌리기 줄 → 미리 보기 */
  case'sch-next-cancel':delete S.settings.nextTarget;save();toast('지금 일정 그대로 둬요');return render();   /* 기다리던 새 일정을 미리 붙여 넣었으면(next) 저장소가 지금 일정과 달라 diff(빨강, 변경 요청 복사): 복사한 요청은 새 일정의 것(schSig) */
  case'slip-no':{const t=todayStr(),c=slipCheck(t);S.settings.slipNo={at:t,avg:c&&c.avg!=null?c.avg:null};save();toast('4주 동안 다시 묻지 않을게요');return render();}
  case'sch-copy':return PE_IO.copy(schReq()).then(()=>{schSentSet();save();toast('변경 요청을 복사했어요. Claude Code에 붙여 넣으세요');render();},()=>toast('복사하지 못했어요'));
  case'sch-round-set':{const r=Number($('#schRound').value),d=$('#schRoundDate').value;if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(d))return toast('회차와 날짜를 고르세요');const pre=planPre();S.settings.roundDates[r]=d;delete S.settings.slipNo;recalcPlan();save();planChanged('sched',pre);toast(`제${r}회를 ${d}로 고쳤어요`);return render();}
  case'sch-round-reset':{const r=Number($('#schRound').value);if(!r)return;const pre=planPre();delete S.settings.roundDates[r];delete S.settings.slipNo;recalcPlan();save();planChanged('sched',pre);toast(`제${r}회를 예상일로 되돌렸어요`);return render();}
  case'backup-copy':{const[j,undo]=backupJSON();return PE_IO.copy(j).then(()=>{backupDone();toast('백업을 복사했어요. 메모 앱에 붙여 두세요');},()=>{undo();toast('복사하지 못했어요');});}
  case'backup-dl':{const[j,undo]=backupJSON();PE_IO.saveFile('gisulsa-backup-'+todayStr()+'.json',j).then(backupDone,()=>{undo();toast('파일로 저장하지 못했어요');});return;}
  case'restore':return restoreFrom($('#restoreText').value);
  case'restore-file':return PE_IO.pickFile().then(f=>{if(f)restoreFrom(f.text,f.name);},err=>toast('파일을 열지 못했어요: '+(err&&err.message||err)));
  case'reset':return PE_IO.ask('모든 학습 기록과 내 카드를 지웁니다. 초기화할까요?',()=>PE_IO.ask('마지막 확인: 백업을 복사해 두었나요?',()=>{S=fresh();S.tk['seen:v3']=todayStr();SETS={sets:{},mocks:{},kichul:null,index:null,plan:null};recalcPlan();flush();invalidate();applyLook();flowReset();sync(true);nav('today');toast('초기화했어요');}));
  }
});
document.addEventListener('change',e=>{if(e.target.id==='rangeSel'){S.range=e.target.value;save();render();}
  else if(e.target.dataset&&e.target.dataset.act==='mock-score'){const D=e.target.dataset,v=String(e.target.value).trim(),pr=S.mockp[D.d]||(S.mockp[D.d]={}),sc=pr.sc||(pr.sc={});
    if(v==='')delete sc[D.k];else{const n=Math.round(Number(v));if(!isFinite(n)){e.target.value=sc[D.k]!=null?sc[D.k]:'';return;}sc[D.k]=Math.max(0,Math.min(100,n));e.target.value=sc[D.k];}
    if(!Object.keys(sc).length)delete pr.sc;touchDay();save();toast(v===''?'점수를 지웠어요':'점수를 적었어요');}   /* 다시 그리지 않는다: 다음 칸을 누른 채로 이어 적게 */
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){memoPause();calHid=Date.now();}if(!document.hidden){if(Date.now()-calHid>10*60000)calOpen();sync(false);IBX.at=0;MT.at=0;nextApply(todayStr());if(!R.page)render();}});
/* 관리자에게 보낼 말은 다시 그려도 남게 */
document.addEventListener('input',e=>{if(e.target&&e.target.id==='msgText')SV.msgDraft=e.target.value;if(e.target&&e.target.id==='rpText')SV['rp:'+e.target.dataset.uid]=e.target.value;});
window.addEventListener('online',()=>sync(true));
/* 화면 안 타이머를 밀어 올려 안 보이면 위쪽 알약으로 남은 시간을 보여 준다 */
window.addEventListener('scroll',()=>{if(TM.running||TM.remain>0&&TM.remain<TM.total)paintPill();},{passive:true});

/* ════════ 23. 시작 ════════ */
PE_IO.init({toast});recalcPlan();applyLook();setPreset('essay');R=parseHash();
if(!location.hash)history.replaceState(null,'','#today');
calOpen();sync(true);route();v3Once();   /* 받아 오기를 먼저 시작해 첫 화면이 오래된 자료로 오늘 몫을 고정하지 않게(받아 온 뒤 고정) */
const fresh2=f=>(...a)=>{PLN++;return f(...a);};
window.__pe={S:()=>S,rParts,gqList,gqBuild,gqNumAlt,gqRec,gqStat,jo,KR_HOLI,SETS:()=>SETS,PLAN:()=>PLAN,SES:()=>SES,computePlan,roundList,sync,deck,essays,kq,clozeTokens,fillCands,fillBlanks,fillJudge,glNames,glIdx,glHTML,glStem,glForms,glLookup,glOpen,MEMO:()=>MEMO,memoTick,memoTapes,memoOff,hwItems,ddRows,ddNoun,ddWrap,render,invalidate,startSession,
  enough,setReviewItems,startDueAll,startWrong,budgetOf,dayKind,TM:()=>TM,go:h=>{nav(h);v3Again();},goUp,goTab,R:()=>R,navBadgeN,tabWords,
  /* 오늘 몫·이번 주(검사용: 부를 때마다 새로 센다) */
  taskList:fresh2(taskList),dayPlan:fresh2(dayPlan),planToday:fresh2(planToday),weekBoard:fresh2(weekBoard),weekSnap:fresh2(weekSnap),reqParts:fresh2(reqParts),cardsOut:fresh2(cardsOut),hwParts:fresh2(hwParts),
  wkStart,estMock,figDup,hwMin,setStatus,planOrder,planActive,nextAfter,curBlock,phaseStart,taskGo,startRot,recalcPlan,setIds,dueSetReviews,weekIndex,weekObj,phaseObj,MIN_PER,HW_STEPS,PLAN_BLK,UI:()=>UI,
  weeklyReport:fresh2(weeklyReport),streak:fresh2(streak),planItems,resumeSrc,mfmt,lastWeekSheet:fresh2(lastWeekSheet),wkLines:fresh2(wkLines),
  /* 세트 막대·끝 화면(검사용) */
  setNext:fresh2(setNext),endNexts:fresh2(endNexts),mockStep:fresh2(mockStep),SV:()=>SV,revChain,revList,cardsOutN:t=>{PLN++;return cardsOut(t||todayStr()).length;},FLOW:()=>FLOW,startGq,startSetReview,gqTermIds,
  /* 특별한 날·달력(검사용) */
  calFwd:fresh2(calFwd),monNotice:fresh2(monNotice),S_NEW:()=>S_NEW,
  /* 쉬는 날·앞날(검사용) */
  wkAhead:fresh2(wkAhead),offDelta:fresh2(offDelta),catchLine:fresh2(catchLine),dayOff,pinMin,placeTxt,outTxt,lvTxt,todayOnlyTxt,cuOn,cuPreview:fresh2(cuPreview),dayRuns,
  /* 시험 일정 살펴보기(검사용) */
  slipCheck:fresh2(slipCheck),weekP:fresh2(weekP),roundRows:fresh2(roundRows),schFrom:fresh2(schFrom),nextApply:fresh2(nextApply),repoPlanState:fresh2(repoPlanState),schReq:fresh2(schReq),setPh,lockLived,planSig,monNoticeHTML,
  /* 어느 요일에 시작해도(검사용) */
  wkIdx,wkFrom,planMon,firstWeekTxt,
  /* 새로 시작(검사용) */
  hasRec,recBefore,prevRec};
})();
