// ============================================================
// 채움학원 학생앱 (OMR + 답안 제출)
// 파일 경로: cheaeum-omr/chaeum-omr-project/src/App.jsx
// ============================================================
// 버전 이력
// ─────────────────────────────────────────
// v22.0 (2026-04-28)
//   ★ types 토큰 호환성 — "sub" 와 "sa" 모두 주관식으로 인식
//      (이전: "sub" 만 인식 → AI가 "sa"로 저장한 답지는 객관식으로 표시되는 버그)
//   ★ 채점 함수에도 양쪽 호환 추가
//
// v6 (2026-04-28)
//   · 주관식 자동 채점 (Gemini 2.5 Flash)
//   · 배치 호출 (1학생 = 1회 API 호출 → 비용 1/5)
//
// v5 (2026-04-27)
//   · 5단계 채점 기준 + AI 채점 사유 표시
//
// v4 (이전)
//   · 시작번호, 비순차 번호 지원
//   · 다중학교 통합반 지원
// ============================================================

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

const VERSION = "v22.0";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzablzeV_gVdLoUG-Oh4s02vNmncvteesBn3875WDF3lO176nc4YzAKj7B6zOJVECQO/exec";
// ★ Gemini 주관식 자동 채점 (Vercel Edge Function)
const GRADE_SUBJECTIVE_URL = "/api/grade-subjective";

const SUBJECTS=["영어","국어","수학"];
const GRADES=["초3","초4","초5","초6","중1","중2","중3","고1","고2","고3"];
const LEVELS=["SB","B","I","A","SA","기타"];
const EXAM_TYPES=["단어시험","문법시험","종합시험","모의고사","수학테스트","Daily Test","해석테스트","WEEKLY TEST","MONTHLY TEST","기타"];
const Q_COUNTS=[100,200,300];
const SEC=20;const CV=[1,2,3,4,5];const CL=["1","2","3","4","5"];
const LS_KEY="chaeum_omr_student";
function lsGet(){try{return JSON.parse(localStorage.getItem(LS_KEY)||"{}");}catch(e){return{};}}
function lsSet(o){try{localStorage.setItem(LS_KEY,JSON.stringify(o));}catch(e){}}

// ★ v22.0: 주관식 타입 판별 헬퍼 — "sub", "sa", "subj", "subjective" 모두 인식
function isSubjectiveType(tv){
  if(!tv)return false;
  const t=String(tv).toLowerCase().trim();
  return t==="sub"||t==="sa"||t==="subj"||t==="subjective"||t==="essay"||t==="주관식";
}

// 정답 데이터 정규화
function normalizeAnswerData(raw){
  if(raw===null||raw===undefined||raw==="")return{};
  let v=raw;
  for(let a=0;a<2;a++){
    if(typeof v!=="string")break;
    const s=v.trim();if(!s)return{};
    try{v=JSON.parse(s);}catch(e){return{};}
  }
  if(v===null||v===undefined)return{};
  const out={};
  if(Array.isArray(v)){v.forEach((x,i)=>{out[String(i+1)]=x;});return out;}
  if(typeof v==="object"){
    const keys=Object.keys(v);
    const allNum=keys.length>0&&keys.every(k=>/^\d+$/.test(k));
    if(allNum){
      const nums=keys.map(k=>parseInt(k,10)).sort((a,b)=>a-b);
      const shift=(nums[0]===0)?1:0;
      keys.forEach(k=>{out[String(parseInt(k,10)+shift)]=v[k];});
      return out;
    }
    for(const k in v)out[k]=v[k];
    return out;
  }
  return{"1":v};
}

const T={gold:"#D4A017",goldDark:"#B8860B",goldDeep:"#8B6914",goldLight:"#FFF3D0",goldPale:"#FFFBF0",goldMuted:"#F5E6B8",bg:"#FAFAF7",text:"#1A1A1A",textSub:"#5C5C5C",textMuted:"#999999",border:"#E8E4DA",borderLight:"#F0EDE4",accent:"#2E7D32",accentLight:"#E8F5E9",danger:"#C62828",dangerLight:"#FFEBEE",white:"#FFFFFF"};

function todayStr(){const d=new Date();return`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;}
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function isoToDot(s){return(s||"").replace(/-/g,".");}

function vl(v){
  if(v===null||v===undefined||v==="")return"–";
  if(Array.isArray(v)){
    if(v.length===0)return"–";
    return v.map(x=>{const i=CV.indexOf(Number(x));return i>=0?CL[i]:String(x);}).join(", ");
  }
  if(typeof v==="string"&&v.indexOf(",")!==-1){
    return v.split(",").map(s=>s.trim()).map(x=>{const n=Number(x);const i=CV.indexOf(n);return i>=0?CL[i]:x;}).join(", ");
  }
  const n=Number(v);const i=CV.indexOf(n);
  return i>=0?CL[i]:String(v);
}

function normAns(v){
  if(v===null||v===undefined||v==="")return"";
  if(Array.isArray(v))return[...v].map(x=>String(x).trim()).filter(Boolean).sort().join(",");
  const s=String(v);
  if(s.indexOf(",")!==-1)return s.split(",").map(x=>x.trim()).filter(Boolean).sort().join(",");
  return s.trim();
}

function isFilled(v){
  if(v===null||v===undefined||v==="")return false;
  if(Array.isArray(v))return v.length>0;
  return true;
}

function normText(s){
  return String(s||"").trim().toLowerCase().replace(/\s+/g," ").replace(/[.!?,·~]+$/,"");
}

function normalizeSubKey(raw){
  if(!raw||typeof raw!=="string")return raw;
  if(raw.indexOf("|")!==-1)return raw;
  const numPat=/\(\d+\)\s*/g;
  const letPat=/\([A-Za-z]\)\s*/g;
  let parts;
  if(numPat.test(raw)){
    parts=raw.split(/\(\d+\)\s*/).filter(s=>s.trim());
  }else if(letPat.test(raw)){
    parts=raw.split(/\([A-Za-z]\)\s*/).filter(s=>s.trim());
  }else{
    return raw;
  }
  if(parts.length>1)return parts.map(s=>s.trim()).join("|");
  return raw;
}

function getSecs(n){const s=[];for(let i=0;i<n;i+=SEC){s.push({start:i+1,end:Math.min(i+SEC,n),label:`${i+1}–${Math.min(i+SEC,n)}`});}return s;}

// ============================================================
// ★ Gemini 주관식 배치 채점 호출 (Vercel API)
// 1학생의 모든 주관식을 한 번에 채점 → 비용 1/5
// ============================================================
async function gradeSubjectiveBatch(items){
  if(!GRADE_SUBJECTIVE_URL)return [];
  if(!items||items.length===0)return [];
  try{
    const res=await fetch(GRADE_SUBJECTIVE_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({items})
    });
    if(!res.ok){
      const t=await res.text();
      return items.map(it=>({
        q:it.q,score:0,category:"ERROR",deductions:[],
        reasoning:`HTTP ${res.status}: ${t.substring(0,100)}`
      }));
    }
    const j=await res.json();
    if(j.ok&&Array.isArray(j.results))return j.results;
    return items.map(it=>({
      q:it.q,score:0,category:"ERROR",deductions:[],
      reasoning:j.error||"채점 응답 없음"
    }));
  }catch(e){
    return items.map(it=>({
      q:it.q,score:0,category:"ERROR",deductions:[],
      reasoning:"호출 실패: "+String(e)
    }));
  }
}

// ============================================================
// 채점 함수 (객관식만 즉시 채점, 주관식은 "채점중" → Gemini 후처리)
// ★ v22.0: isSubjectiveType 함수로 "sub"/"sa" 모두 인식
// ============================================================
function grade(ans,key,types,totalQ){
  let oc=0,ow=0,sc=0,totalObj=0,totalSub=0;const det=[];
  let subPartialSum=0;
  const N=totalQ||ans.length;
  // 1) 전체 문항 유형 집계
  for(let i=0;i<N;i++){
    const qk=String(i+1);
    const tv=types?(types[qk]??types[i]):null;
    const isSub=isSubjectiveType(tv);
    if(isSub)totalSub++;else totalObj++;
  }
  // 2) 학생 답안 채점
  for(let i=0;i<ans.length;i++){
    if(!isFilled(ans[i]))continue;
    const qk=String(i+1);
    const tv=types?(types[qk]??types[i]):null;
    const isSub=isSubjectiveType(tv);
    const cRaw=key?(key[qk]??key[i]):null;
    const c=(cRaw!==null&&cRaw!==undefined&&cRaw!=="")?String(cRaw):null;
    const uRaw=ans[i];
    if(!isSub){
      // 객관식
      const uNorm=normAns(uRaw);
      const cNorm=c!==null?normAns(c):null;
      const uDisp=Array.isArray(uRaw)?uRaw.join(","):String(uRaw);
      if(cNorm!==null){
        if(uNorm===cNorm){oc++;det.push({q:i+1,s:uDisp,c,r:"정답",t:"obj"});}
        else{ow++;det.push({q:i+1,s:uDisp,c,r:"오답",t:"obj"});}
      }
    }else{
      // 주관식: 빠른 일치 체크 → 일치 시 즉시 정답, 아니면 "채점중"
      const uStr=String(uRaw);
      const cNormSub=c!==null?normalizeSubKey(c):null;
      if(cNormSub!==null){
        const sNorm=normText(uStr.replace(/\|/g," / "));
        const cNorm2=normText(String(cNormSub).replace(/\|/g," / "));
        if(sNorm===cNorm2&&sNorm!==""){
          subPartialSum+=1;
          det.push({q:i+1,s:uStr,c:String(cNormSub),r:"정답",t:"sub"});
        }else{
          det.push({q:i+1,s:uStr,c:String(cNormSub),r:"채점중",t:"sub"});
        }
        sc++;
      }else{
        sc++;det.push({q:i+1,s:uStr,c:"",r:"채점중",t:"sub"});
      }
    }
  }
  const to=oc+ow;
  const subPending=det.filter(d=>d.t==="sub"&&d.r==="채점중").length;
  const subCorrect=det.filter(d=>d.t==="sub"&&d.r==="정답").length;
  const num=oc+subPartialSum;
  const score=N>0?Math.round((num/N)*100):0;
  return{oc,ow,sc,to,totalObj,totalSub,totalQ:N,subPartial:Math.round(subPartialSum*100)/100,subPending,subCorrect,score,det};
}

function Chip({label,req,opts,val,onChange,custom:allowC}){
  const[c,setC]=useState(false);const[cv,setCv]=useState("");
  const h=(o)=>{if(o==="기타"&&allowC){setC(true);onChange("");}else{setC(false);setCv("");onChange(val===o?"":o);}};
  return(<div style={{marginBottom:14}}>
    <div style={S.label}>{label} {req&&<span style={{color:T.danger}}>*</span>}</div>
    <div style={S.cw}>{opts.map(o=>{const a=(!c&&val===o)||(c&&o==="기타");return(<button key={o} onClick={()=>h(o)} style={{...S.ch,background:a?T.goldDark:T.white,color:a?T.white:T.textSub,borderColor:a?T.goldDark:T.border,fontWeight:a?700:500}}>{o}</button>);})}</div>
    {c&&allowC&&<input style={{...S.inp,marginTop:6}} placeholder="직접 입력" value={cv} onChange={e=>{setCv(e.target.value);onChange(e.target.value);}}/>}
  </div>);
}

export default function App(){
  const[tab,setTab]=useState("submit");
  const[scr,setScr]=useState("info");
  const _ls=lsGet();
  const[nm,setNm]=useState(_ls.nm||"");
  const[ph,setPh]=useState(_ls.ph||"");
  const[sub,setSub]=useState("");const[gr,setGr]=useState("");const[lv,setLv]=useState("");const[et,setEt]=useState("");const[exSub,setExSub]=useState("");const[exLv,setExLv]=useState("");
  const[pd,setPd]=useState(todayIso());
  const[todayExams,setTodayExams]=useState(null);const[loadingExams,setLoadingExams]=useState(false);
  const[teacherList,setTeacherList]=useState([]);const[selTeacher,setSelTeacher]=useState("");
  const[history,setHistory]=useState(null);const[loadingHist,setLoadingHist]=useState(false);const[histErr,setHistErr]=useState("");
  const[tq,setTq]=useState(100);const[cq,setCq]=useState("");
  const qc=cq?parseInt(cq)||100:tq;
  const[ans,setAns]=useState([]);const[res,setRes]=useState(null);
  const[conf,setConf]=useState(false);const[sec,setSec]=useState(0);const[wo,setWo]=useState(false);
  const[aKey,setAKey]=useState(null);const[tKey,setTKey]=useState(null);const[qNumMap,setQNumMap]=useState(null);const[aLoad,setALoad]=useState(false);const[aNF,setANF]=useState(false);
  const[sending,setSending]=useState(false);const[sendOk,setSendOk]=useState(null);
  const[gradingSub,setGradingSub]=useState(false);
  const[gradingProgress,setGradingProgress]=useState({done:0,total:0});
  const cn=exSub?`${exSub} ${gr} ${exLv}반`:(gr?`${gr}`:"")
  const ds=isoToDot(pd);
  const isToday=pd===todayIso();
  const secs=useMemo(()=>getSecs(qc),[qc]);
  const sRefs=useRef([]);
  const ac=useMemo(()=>ans.filter(a=>isFilled(a)).length,[ans]);
  const ss=useMemo(()=>secs.map(s=>{let d=0;for(let i=s.start-1;i<s.end;i++)if(isFilled(ans[i]))d++;return{...s,done:d,total:s.end-s.start+1};}),[ans,secs]);
  useEffect(()=>{setAns(Array(qc).fill(null));},[qc]);
  useEffect(()=>{
    fetch(`${SHEETS_URL}?action=list_teachers`)
      .then(r=>r.json()).then(d=>{if(d.result==="ok")setTeacherList(d.teachers||[]);}).catch(()=>{});
  },[]);
  const hAns=useCallback((i,v)=>{setAns(p=>{
    const n=[...p];
    const cur=n[i];
    if(cur===null||cur===undefined||cur===""){n[i]=v;}
    else if(Array.isArray(cur)){
      if(cur.includes(v)){
        const nx=cur.filter(x=>x!==v);
        n[i]=nx.length===0?null:(nx.length===1?nx[0]:nx);
      }else{
        n[i]=[...cur,v].sort((a,b)=>a-b);
      }
    }else{
      if(cur===v){n[i]=null;}
      else{n[i]=[cur,v].sort((a,b)=>a-b);}
    }
    return n;
  });},[]);
  const hSub=useCallback((i,v)=>{setAns(p=>{const n=[...p];n[i]=v;return n;});},[]);
  const hLookupExams=async()=>{
    if(!nm.trim())return alert("이름을 입력하세요.");
    if(!/^\d{4}$/.test(ph))return alert("핸드폰 뒷 4자리를 입력하세요.");
    if(!gr)return alert("학년을 선택하세요.");
    if(!selTeacher)return alert("선생님을 선택하세요.");
    lsSet({nm:nm.trim(),ph});
    setLoadingExams(true);setTodayExams(null);
    const query=async(teacherVal)=>{
      const params=new URLSearchParams({action:"list_exams_today",subject:"",grade:gr,level:"전체",date:pd});
      if(teacherVal)params.set("teacher",teacherVal);
      try{const r=await fetch(`${SHEETS_URL}?${params.toString()}`);const d=await r.json();return d.exams||[];}
      catch(e){return[];}
    };
    let exams=await query(selTeacher.trim());
    if(exams.length===0){
      const all=await query("");
      const norm=(s)=>String(s||"").replace(/\s+/g,"").toLowerCase();
      const t=norm(selTeacher);
      exams=all.filter(e=>norm(e.teacher).indexOf(t)!==-1||t.indexOf(norm(e.teacher))!==-1);
    }
    try{
      const norm=(s)=>String(s||"").replace(/\s+/g,"");
      const ansHash=(a)=>{
        try{if(!a||typeof a!=="object")return"";const k=Object.keys(a).sort();return k.map(x=>x+":"+String(a[x])).join("|");}catch(e){return"";}
      };
      const d1={};
      for(const ex of exams){
        const cn=norm(ex.className);
        const key=cn
          ?`${cn}|${ex.examType||""}|${ex.setType||ex.round||""}|${ex.examDate||""}`
          :`_NOCN_|${norm(ex.level)}|${norm(ex.teacher)}|${ex.examType||""}|${ex.setType||ex.round||""}|${ex.examDate||""}`;
        const prev=d1[key];
        if(!prev){d1[key]=ex;continue;}
        const a=String(prev.regTime||""),b=String(ex.regTime||"");
        if(b>a)d1[key]=ex;
      }
      const s1=Object.values(d1);
      const d2={};
      for(const ex of s1){
        const sig=[norm(ex.teacher),norm(ex.subject),norm(ex.grade),ex.examType||"",ex.setType||ex.round||"",ex.examDate||"",ex.examTime||"",ansHash(ex.answers)].join("#");
        const prev=d2[sig];
        if(!prev){d2[sig]=ex;continue;}
        const a=String(prev.regTime||""),b=String(ex.regTime||"");
        if(b>a)d2[sig]=ex;
      }
      exams=Object.values(d2);
    }catch(e){}
    setTodayExams(exams);setLoadingExams(false);
  };
  const hPickExam=(ex)=>{
    if(ex.className){
      const parts=ex.className.split(/\s+/);
      setSub(parts[0]||"");setLv((parts[2]||"").replace(/반$/,"")||"");
      setExSub(parts[0]||"");setExLv((parts[2]||"").replace(/반$/,"")||"");
    }
    const _setTag=(ex.setType||ex.round||"").trim();
    setEt(ex.examType + (_setTag?` (${_setTag})`:""));
    const qTotal=Number(ex.totalQuestions)||100;setTq(qTotal);setCq("");
    setAns(Array(qTotal).fill(null));setScr("input");setALoad(false);setANF(false);
    const hasAns=ex.answers!==undefined&&ex.answers!==null&&ex.answers!=="";
    const hasTyp=ex.types!==undefined&&ex.types!==null&&ex.types!=="";
    const fixedAnswers=hasAns?normalizeAnswerData(ex.answers):null;
    const fixedTypes=hasTyp?normalizeAnswerData(ex.types):null;
    setAKey(fixedAnswers);setTKey(fixedTypes);
    if(ex.questionNumberMap){
      setQNumMap(ex.questionNumberMap);
    }else if(ex.startNumber&&Number(ex.startNumber)>1){
      const m={};for(let i=1;i<=qTotal;i++)m[String(i)]=String(Number(ex.startNumber)+i-1);
      setQNumMap(m);
    }else{
      const srcForNumMap=ex.answers&&typeof ex.answers==="object"&&!Array.isArray(ex.answers)?ex.answers:(fixedAnswers||{});
      const keys=Object.keys(srcForNumMap).map(Number).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
      if(keys.length>0&&keys[0]>1){
        const m={};for(let i=0;i<keys.length;i++)m[String(i+1)]=String(keys[i]);
        setQNumMap(m);
        const remappedAns={},remappedTypes={};
        keys.forEach((k,i)=>{
          if(srcForNumMap[String(k)]!==undefined)remappedAns[String(i+1)]=srcForNumMap[String(k)];
          if(fixedTypes&&fixedTypes[String(k)]!==undefined)remappedTypes[String(i+1)]=fixedTypes[String(k)];
        });
        setAKey(remappedAns);setTKey(Object.keys(remappedTypes).length>0?remappedTypes:null);
        setTq(keys.length);setCq("");setAns(Array(keys.length).fill(null));
      }else{
        setQNumMap(null);
      }
    }
    if(hasAns)setALoad(true);else setANF(true);
  };
  const hShowHistory=()=>{
    if(!nm.trim())return alert("이름을 입력하세요.");
    if(!/^\d{4}$/.test(ph))return alert("핸드폰 뒷 4자리를 입력하세요.");
    lsSet({nm:nm.trim(),ph});
    setLoadingHist(true);setHistErr("");setHistory(null);
    fetch(`${SHEETS_URL}?action=student_history&name=${encodeURIComponent(nm.trim())}&phone=${encodeURIComponent(ph)}`)
      .then(r=>r.json()).then(d=>{if(d.result==="ok"){setHistory(d.records||[]);}else{setHistErr(d.message||"조회 실패");setHistory([]);}setLoadingHist(false);}).catch(()=>{setHistErr("네트워크 오류");setLoadingHist(false);});
  };
  const hSubmit=()=>{if(ac===0)return alert("최소 1문항 이상 답을 선택하세요.");setConf(true);};
  // ============================================================
  // ★ v22.0: 답안 제출 + Gemini 주관식 배치 자동 채점
  // ============================================================
  const hFinal=async()=>{
    setConf(false);setSending(true);
    const initial=aKey?grade(ans,aKey,tKey,qc):null;setRes(initial);
    const ansSerialized=ans.map(v=>Array.isArray(v)?v.join(","):v);
    try{
      await fetch(SHEETS_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"student_answer",
          name:nm,phone:ph,className:cn,subject:sub,grade:gr,level:lv,examName:et,date:ds,
          totalGraded:initial?initial.to+initial.sc:ac,
          score:initial?initial.score:null,
          correct:initial?initial.oc:null,
          wrong:initial?initial.ow:null,
          subPending:initial?initial.subPending:0,
          wrongQuestions:initial?initial.det.filter(d=>d.r==="오답").map(d=>d.q):[],
          pendingQuestions:initial?initial.det.filter(d=>d.r==="채점중").map(d=>d.q):[],
          answers:ansSerialized
        })});
      setSendOk(true);
    }catch(e){setSendOk(false);}
    setSending(false);setScr("result");
    // 주관식 배치 채점
    if(initial){
      const subjPending=initial.det.filter(d=>d.t==="sub"&&d.r==="채점중");
      if(subjPending.length>0&&aKey){
        setGradingSub(true);
        setGradingProgress({done:0,total:subjPending.length});
        const items=subjPending.map(d=>({
          q:d.q,
          studentAnswer:String(ans[d.q-1]||""),
          correctAnswer:String(aKey[String(d.q)]??aKey[d.q-1]??""),
          questionContext:""
        }));
        const batchResults=await gradeSubjectiveBatch(items);
        const updatedDet=[...initial.det];
        let subjScoreSum=0;
        const subjectiveDetails=[];
        for(const result of batchResults){
          const qNum=Number(result.q);
          const score=Math.max(0,Math.min(100,Number(result.score)||0));
          const item=items.find(it=>it.q===qNum);
          const sa=item?item.studentAnswer:"";
          const ca=item?item.correctAnswer:"";
          const idx=updatedDet.findIndex(u=>u.q===qNum&&u.t==="sub");
          if(idx>=0){
            const verdict=score===100?"정답":score===0?"오답":"부분정답";
            updatedDet[idx]={
              ...updatedDet[idx],
              r:verdict,
              partial:`${score}점`,
              gradeResult:result,
              c:ca||updatedDet[idx].c
            };
          }
          subjScoreSum+=score/100;
          subjectiveDetails.push({
            q:qNum,
            studentAnswer:sa,
            correctAnswer:ca,
            score:score,
            category:result.category||"",
            deductions:result.deductions||[],
            reasoning:result.reasoning||""
          });
        }
        setGradingProgress({done:subjPending.length,total:subjPending.length});
        setRes(prev=>{
          if(!prev)return prev;
          const newOc=prev.oc;
          const subPartialNew=Math.round((subjScoreSum)*100)/100;
          const newScore=prev.totalQ>0?Math.round(((newOc+subjScoreSum)/prev.totalQ)*100):0;
          const newSubPending=updatedDet.filter(d=>d.t==="sub"&&d.r==="채점중").length;
          const newSubCorrect=updatedDet.filter(d=>d.t==="sub"&&d.r==="정답").length;
          return{...prev,det:updatedDet,subPartial:subPartialNew,score:newScore,subPending:newSubPending,subCorrect:newSubCorrect};
        });
        setGradingSub(false);
        const finalScore=initial.totalQ>0?Math.round(((initial.oc+subjScoreSum)/initial.totalQ)*100):0;
        const finalCorrect=initial.oc+updatedDet.filter(d=>d.t==="sub"&&d.r==="정답").length;
        const finalWrong=initial.ow+updatedDet.filter(d=>d.t==="sub"&&d.r==="오답").length;
        const finalWrongQs=updatedDet.filter(d=>d.r==="오답").map(d=>d.q);
        try{
          await fetch(SHEETS_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              action:"save_subjective_grade",
              name:nm,phone:ph,examName:et,date:ds,
              score:finalScore,
              correct:finalCorrect,
              wrong:finalWrong,
              wrongQuestions:finalWrongQs,
              subjectiveDetails:subjectiveDetails
            })});
        }catch(e){console.warn("save_subjective_grade 실패:",e);}
      }
    }
  };
  const hReset=()=>{setAns(Array(qc).fill(null));setRes(null);setWo(false);setSendOk(null);setScr("info");setSec(0);setNm("");setSub("");setGr("");setLv("");setEt("");setSelTeacher("");setAKey(null);setTKey(null);setQNumMap(null);setALoad(false);setANF(false);setTq(100);setCq("");setPd(todayIso());setTodayExams(null);setGradingSub(false);setGradingProgress({done:0,total:0});};
  const scTo=(i)=>{setSec(i);sRefs.current[i]?.scrollIntoView({behavior:"smooth",block:"start"});};
  const goUA=()=>{const i=ans.findIndex(a=>a===null||a==="");if(i===-1)return alert("모든 문항에 답했습니다!");setSec(Math.floor(i/SEC));setTimeout(()=>{document.getElementById(`q-${i}`)?.scrollIntoView({behavior:"smooth",block:"center"});},100);};
  const clrAll=()=>{if(window.confirm("모든 답안을 초기화할까요?"))setAns(Array(qc).fill(null));};
  return(
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{font-family:'Noto Sans KR',-apple-system,sans-serif;background:${T.bg}}input:focus{outline:none;border-color:${T.gold}!important;box-shadow:0 0 0 3px ${T.goldLight}!important}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}.fade-up{animation:fadeUp .3s ease-out}.scale-in{animation:scaleIn .2s ease-out}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}`}</style>
      <header style={S.hdr}><div style={S.hdrIn}><div style={S.logoR}><div style={S.logoM}>채움</div><div><div style={S.hdrT}>채움학원</div><div style={S.hdrS}>답안 제출 시스템 ({VERSION})</div></div></div>{scr==="input"&&<div style={S.hdrB}>{nm} · {cn||`${gr} ${selTeacher} 선생님`}</div>}</div></header>
      {scr==="info"&&(<div style={{display:"flex",gap:6,padding:"10px 14px 0"}}>
        <button onClick={()=>setTab("submit")} style={{flex:1,padding:"10px",fontSize:13,fontWeight:700,borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab==="submit"?T.goldDark:T.white,color:tab==="submit"?T.white:T.textSub,boxShadow:tab==="submit"?"none":`inset 0 0 0 1.5px ${T.border}`}}>📝 답안 제출</button>
        <button onClick={()=>setTab("history")} style={{flex:1,padding:"10px",fontSize:13,fontWeight:700,borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab==="history"?T.goldDark:T.white,color:tab==="history"?T.white:T.textSub,boxShadow:tab==="history"?"none":`inset 0 0 0 1.5px ${T.border}`}}>📊 내 성적</button>
      </div>)}
      {scr==="info"&&tab==="submit"&&(<div style={S.wrap} className="fade-up">
        <div style={S.hero}><div style={{fontSize:36,marginBottom:4}}>✏️</div><h1 style={S.heroT}>답안 제출</h1><p style={S.heroD}>본인 정보와 반을 선택하면<br/>해당 날짜의 시험 목록이 나타나요</p></div>
        <div style={S.card}>
          <div style={{marginBottom:14}}><div style={S.label}>이름 <span style={{color:T.danger}}>*</span></div><input style={S.inp} placeholder="이름을 입력하세요" value={nm} onChange={e=>setNm(e.target.value)}/></div>
          <div style={{marginBottom:14}}><div style={S.label}>핸드폰 뒷 4자리 <span style={{color:T.danger}}>*</span></div><input style={S.inp} placeholder="예: 1234" value={ph} onChange={e=>setPh(e.target.value.replace(/[^0-9]/g,"").slice(0,4))} inputMode="numeric" maxLength={4}/></div>
          <Chip label="학년" req opts={GRADES} val={gr} onChange={setGr}/>
          <div style={{marginBottom:14}}>
            <div style={S.label}>선생님 <span style={{color:T.danger}}>*</span></div>
            {teacherList.length>0?(
              <select style={S.inp} value={selTeacher} onChange={e=>setSelTeacher(e.target.value)}>
                <option value="">-- 선생님을 선택하세요 --</option>
                {["국어","영어","수학","과학","사회"].map(subj=>{
                  const subTeachers=teacherList.filter(t=>t.subject===subj);
                  if(subTeachers.length===0)return null;
                  return(<optgroup key={subj} label={subj+"과"}>{subTeachers.map(t=>(<option key={t.name} value={t.name}>{t.name}</option>))}</optgroup>);
                })}
                {teacherList.filter(t=>!["국어","영어","수학","과학","사회"].includes(t.subject)).length>0&&(
                  <optgroup label="기타">{teacherList.filter(t=>!["국어","영어","수학","과학","사회"].includes(t.subject)).map(t=>(<option key={t.name} value={t.name}>{t.name}</option>))}</optgroup>
                )}
              </select>
            ):(<input style={S.inp} placeholder="선생님 이름 입력" value={selTeacher} onChange={e=>setSelTeacher(e.target.value)}/>)}
          </div>
          <div style={{marginBottom:14}}>
            <div style={S.label}>시험 날짜 <span style={{color:T.danger}}>*</span></div>
            <input type="date" style={S.inp} value={pd} onChange={e=>{setPd(e.target.value||todayIso());setTodayExams(null);}}/>
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <button type="button" onClick={()=>{setPd(todayIso());setTodayExams(null);}} style={{padding:"6px 12px",fontSize:12,fontWeight:600,borderRadius:8,border:`1.5px solid ${isToday?T.goldDark:T.border}`,background:isToday?T.goldLight:T.white,color:isToday?T.goldDeep:T.textSub,cursor:"pointer",fontFamily:"inherit"}}>오늘</button>
              <button type="button" onClick={()=>{const d=new Date();d.setDate(d.getDate()-1);setPd(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);setTodayExams(null);}} style={{padding:"6px 12px",fontSize:12,fontWeight:600,borderRadius:8,border:`1.5px solid ${T.border}`,background:T.white,color:T.textSub,cursor:"pointer",fontFamily:"inherit"}}>어제</button>
              <button type="button" onClick={()=>{const d=new Date();d.setDate(d.getDate()-2);setPd(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);setTodayExams(null);}} style={{padding:"6px 12px",fontSize:12,fontWeight:600,borderRadius:8,border:`1.5px solid ${T.border}`,background:T.white,color:T.textSub,cursor:"pointer",fontFamily:"inherit"}}>그저께</button>
            </div>
            {!isToday&&<div style={{marginTop:6,fontSize:11,color:T.goldDeep,fontWeight:600}}>📅 {ds} 시험을 찾아요 (보충/미리보기)</div>}
          </div>
          <button style={S.btnG} onClick={hLookupExams} disabled={loadingExams}>{loadingExams?"시험 찾는 중...":(isToday?"🔍 오늘의 시험 찾기":`🔍 ${ds} 시험 찾기`)}</button>
          {todayExams!==null&&(<div style={{marginTop:14}}>
            {todayExams.length===0?(<div style={{padding:"14px",background:T.dangerLight,borderRadius:10,color:T.danger,fontSize:13,fontWeight:600,textAlign:"center"}}>{ds} {gr} {selTeacher} 선생님 시험이 없습니다.<br/>선생님께 문의하세요.</div>):(
              <>
                <div style={{fontSize:12,fontWeight:700,color:T.goldDeep,marginBottom:8}}>{ds} {gr} {selTeacher} 선생님 시험 ({todayExams.length}개)</div>
                {todayExams.map((ex,i)=>{
                  const classLabel=[ex.subject,ex.grade,ex.level?(ex.level+"반"):ex.className?"("+ex.className+")":""].filter(Boolean).join(" ");
                  const setTag=(ex.setType||ex.round||"").trim();
                  const badgeInfo=(()=>{
                    if(setTag==="이론편"||setTag==="이론") return {label:"이론",bg:"#E3F2FD",color:"#1565C0"};
                    if(setTag==="실전편"||setTag==="실전") return {label:"실전",bg:"#FFEBEE",color:"#C62828"};
                    if(setTag==="혼합") return {label:"혼합",bg:"#F3E5F5",color:"#6A1B9A"};
                    if(setTag) return {label:setTag,bg:T.borderLight,color:T.textSub};
                    return null;
                  })();
                  return(<button key={i} onClick={()=>hPickExam(ex)} style={{width:"100%",padding:"12px 14px",marginBottom:6,background:T.goldLight,border:`1.5px solid ${T.goldMuted}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      {classLabel&&<div style={{fontSize:16,fontWeight:800,color:T.goldDeep,display:"flex",alignItems:"center",gap:6}}>
                        {classLabel}
                        {badgeInfo&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,background:badgeInfo.bg,color:badgeInfo.color}}>{badgeInfo.label}</span>}
                      </div>}
                      <div style={{fontSize:12,fontWeight:600,color:T.goldDark,marginTop:2}}>{ex.examType}</div>
                      <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{ex.totalQuestions}문항{ex.examTime?` · ${ex.examTime}`:ex.regTime?` · ${ex.regTime}`:""}</div>
                    </div>
                    <div style={{fontSize:18,color:T.goldDark}}>→</div>
                  </button>);
                })}
              </>)}
          </div>)}
        </div>
      </div>)}
      {scr==="info"&&tab==="history"&&(<div style={S.wrap} className="fade-up">
        <div style={S.hero}><div style={{fontSize:36,marginBottom:4}}>📊</div><h1 style={S.heroT}>내 성적 조회</h1><p style={S.heroD}>이름과 핸드폰 뒷 4자리로<br/>지금까지 본 시험 결과를 확인하세요</p></div>
        <div style={S.card}>
          <div style={{marginBottom:14}}><div style={S.label}>이름 <span style={{color:T.danger}}>*</span></div><input style={S.inp} placeholder="이름을 입력하세요" value={nm} onChange={e=>setNm(e.target.value)}/></div>
          <div style={{marginBottom:14}}><div style={S.label}>핸드폰 뒷 4자리 <span style={{color:T.danger}}>*</span></div><input style={S.inp} placeholder="예: 1234" value={ph} onChange={e=>setPh(e.target.value.replace(/[^0-9]/g,"").slice(0,4))} inputMode="numeric" maxLength={4}/></div>
          <button style={S.btnG} onClick={hShowHistory} disabled={loadingHist}>{loadingHist?"조회 중...":"🔍 내 성적 조회"}</button>
          {histErr&&<div style={{marginTop:12,padding:"10px",background:T.dangerLight,borderRadius:8,fontSize:12,color:T.danger,fontWeight:600,textAlign:"center"}}>{histErr}</div>}
          {history!==null&&!histErr&&(<div style={{marginTop:14}}>
            {history.length===0?(<div style={{padding:"14px",background:T.borderLight,borderRadius:10,color:T.textMuted,fontSize:13,textAlign:"center"}}>아직 제출한 시험이 없습니다.</div>):(
              <>
                <div style={{fontSize:12,fontWeight:700,color:T.goldDeep,marginBottom:8}}>총 {history.length}건</div>
                {history.map((h,i)=>(<div key={i} style={{padding:"12px 14px",marginBottom:6,background:T.goldPale,borderRadius:10,border:`1px solid ${T.goldMuted}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:T.text}}>{h.className} · {h.examName}</span>
                    <span style={{fontSize:18,fontWeight:800,color:h.score>=90?T.accent:h.score>=70?T.goldDark:T.danger}}>{h.score!=null?`${h.score}점`:"—"}</span>
                  </div>
                  <div style={{fontSize:11,color:T.textMuted}}>{h.date} · 정답 {h.correct||0} / 오답 {h.wrong||0}{h.wrongQuestions?` · 틀린 문항: ${h.wrongQuestions}`:""}</div>
                </div>))}
              </>)}
          </div>)}
        </div>
      </div>)}
      {scr==="input"&&(<div className="fade-up">
        {!aLoad&&!aNF&&<div style={{padding:"8px 14px",background:T.goldLight,fontSize:12,color:T.goldDeep,fontWeight:600,textAlign:"center"}}>정답 데이터를 불러오는 중...</div>}
        {aNF&&<div style={{padding:"8px 14px",background:T.dangerLight,fontSize:12,color:T.danger,fontWeight:600,textAlign:"center"}}>⚠ 등록된 정답이 없습니다. 답안만 제출되며 나중에 채점됩니다.</div>}
        {aLoad&&<div style={{padding:"8px 14px",background:T.accentLight,fontSize:12,color:T.accent,fontWeight:600,textAlign:"center"}}>✓ 정답 로드 완료 — 제출 즉시 채점됩니다 (주관식은 AI 채점)</div>}
        <div style={S.progA}><div style={S.progBg}><div style={{...S.progF,width:`${(ac/qc)*100}%`,background:ac===qc?T.accent:T.gold}}/></div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:5}}><span style={{fontWeight:700,color:T.goldDark,fontSize:13}}>{ac}</span><span style={{color:T.textMuted,fontSize:13}}>/{qc}</span>
            <span style={{marginLeft:"auto",fontSize:12,fontWeight:600,color:ac===qc?T.accent:T.textMuted}}>{ac===qc?"✓ 완료":`${qc-ac}문항 남음`}</span></div></div>
        <div style={S.secTA}><div style={S.secTS}>{ss.map((s,i)=>{const a=i===sec,d=s.done===s.total;return(<button key={i} onClick={()=>scTo(i)} style={{...S.secT,background:a?T.goldDark:d?T.accentLight:T.white,color:a?T.white:d?T.accent:T.textSub,borderColor:a?T.goldDark:d?T.accent:T.border,fontWeight:a?700:500}}><span style={{fontSize:qNumMap?10:12}}>{qNumMap?`${qNumMap[String(s.start)]||s.start}–${qNumMap[String(s.end)]||s.end}`:s.label}</span><span style={{fontSize:10,opacity:.8}}>{d?"✓":`${s.done}/${s.total}`}</span></button>);})}</div></div>
        <div style={S.qkR}><button style={S.qkB} onClick={goUA}>⚡ 빈 문항 이동</button><button style={{...S.qkB,color:T.danger,background:T.dangerLight}} onClick={clrAll}>↺ 초기화</button></div>
        <div style={S.qLW}>{secs.map((s,si)=>(<div key={si} ref={el=>sRefs.current[si]=el}>
          <div style={S.secH}><span style={S.secTi}>{qNumMap?`${qNumMap[String(s.start)]||s.start}(${s.start})–${qNumMap[String(s.end)]||s.end}(${s.end})`:s.label}번</span><span style={S.secC}>{ss[si].done}/{ss[si].total}</span></div>
          {Array.from({length:s.end-s.start+1},(_,j)=>{const qi=s.start-1+j,sel=ans[qi];
            // ★ v22.0: isSubjectiveType 으로 "sub", "sa" 모두 인식
            const _tv=tKey?(tKey[String(qi+1)]??tKey[qi+1]??tKey[qi]):null,isSub=isSubjectiveType(_tv),fi=isFilled(sel);
            const selArr=Array.isArray(sel)?sel:(sel!==null&&sel!==""&&sel!==undefined&&typeof sel!=="string"?[Number(sel)]:[]);
            const multi=selArr.length>1;
            const rawKeyVal=isSub&&aKey?(aKey[String(qi+1)]??aKey[qi+1]??""):"";
            const keyVal=isSub?normalizeSubKey(rawKeyVal):rawKeyVal;
            const nBlanks=isSub&&typeof keyVal==="string"&&keyVal.indexOf("|")!==-1?keyVal.split("|").length:1;
            const subStr=isSub?(typeof sel==="string"?sel:""):"";
            const subParts=isSub?subStr.split("|"):[];
            if(isSub){while(subParts.length<nBlanks)subParts.push("");}
            const updateBlank=(idx,val)=>{const np=[...subParts];np[idx]=val;hSub(qi,np.slice(0,nBlanks).join("|"));};
            return(<div key={qi} id={`q-${qi}`} style={{...S.qR,borderLeft:fi?`3px solid ${isSub?T.accent:T.gold}`:`3px solid transparent`,background:fi?(isSub?T.accentLight+"66":T.goldPale):T.white,flexDirection:isSub&&nBlanks>1?"column":"row",alignItems:isSub&&nBlanks>1?"stretch":"center"}}>
              <div style={{display:"flex",alignItems:"center",width:"100%"}}>
                <div style={{...S.qN,background:fi?(isSub?T.accent:T.gold):T.borderLight,color:fi?T.white:T.textMuted,fontSize:qNumMap&&qNumMap[String(qi+1)]?9:11,minWidth:qNumMap?36:28,flexDirection:"column",lineHeight:1.1,padding:"2px 3px"}}>{qNumMap&&qNumMap[String(qi+1)]?<>{qNumMap[String(qi+1)]}<span style={{fontSize:7,opacity:.7}}>({qi+1})</span></>:qi+1}</div>
                {isSub?(<div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,fontWeight:700,color:T.accent,background:T.accentLight,padding:"2px 6px",borderRadius:4}}>주관식{nBlanks>1?` ${nBlanks}개`:""}</span>
                  {nBlanks===1?(<input style={S.sInp} placeholder="답을 입력하세요" value={subStr} onChange={e=>hSub(qi,e.target.value)}/>):null}
                </div>
                ):(<><div style={S.cR}>{CV.map((v,ci)=>{const p=selArr.includes(v);return(<button key={v} onClick={()=>hAns(qi,v)} style={{...S.cBtn,background:p?T.goldDark:T.white,color:p?T.white:T.text,borderColor:p?T.goldDark:T.border,fontWeight:p?700:400,transform:p?"scale(1.06)":"scale(1)",boxShadow:p?`0 2px 8px ${T.goldMuted}`:"none"}}>{CL[ci]}</button>);})}</div>
                  <div style={{...S.sB,background:fi?(multi?T.accentLight:T.goldLight):T.borderLight,color:fi?(multi?T.accent:T.goldDeep):T.textMuted,fontWeight:multi?700:600}}>{fi?vl(sel):"–"}</div></>)}
              </div>
              {isSub&&nBlanks>1&&(<div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6,paddingLeft:36}}>
                {Array.from({length:nBlanks},(_,k)=>(<div key={k} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:T.accent,minWidth:22,textAlign:"center"}}>({k+1})</span>
                  <input style={{...S.sInp,flex:1}} placeholder={`${k+1}번째 답`} value={subParts[k]||""} onChange={e=>updateBlank(k,e.target.value)}/>
                </div>))}
              </div>)}
            </div>);})}
        </div>))}</div>
        <div style={S.subBar}><div style={{flex:1}}><span style={{fontSize:13,fontWeight:600,color:T.goldDark}}>{ac}문항 입력 완료</span></div><button style={S.subBtn} onClick={hSubmit}>제출하기</button></div>
        {conf&&(<div style={S.ov} onClick={()=>setConf(false)}><div style={S.mod} className="scale-in" onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:32,textAlign:"center",marginBottom:8}}>📋</div><h3 style={S.modT}>답안을 제출할까요?</h3>
          <div style={S.modSR}><div style={S.modS}><span style={{fontSize:24,fontWeight:800,color:T.goldDark}}>{ac}</span><span style={{fontSize:11,color:T.textMuted}}>입력</span></div><div style={{width:1,height:36,background:T.border}}/><div style={S.modS}><span style={{fontSize:24,fontWeight:800,color:T.textMuted}}>{qc-ac}</span><span style={{fontSize:11,color:T.textMuted}}>미입력</span></div></div>
          <p style={{fontSize:12,color:T.textSub,textAlign:"center",marginBottom:16}}>미입력 문항은 채점에서 제외됩니다.</p>
          <div style={{display:"flex",gap:10}}><button style={S.modCa} onClick={()=>setConf(false)}>돌아가기</button><button style={S.modCo} onClick={hFinal}>제출하기</button></div>
        </div></div>)}
      </div>)}
      {sending&&(<div style={S.ov}><div style={{...S.mod,padding:"40px 20px"}}><div style={{width:40,height:40,border:`3px solid ${T.borderLight}`,borderTopColor:T.gold,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/><p style={{fontSize:15,fontWeight:700,color:T.text}}>채점 중...</p></div></div>)}
      {scr==="result"&&!sending&&(<div style={S.wrap} className="fade-up">
        {res?(<>
          <div style={{...S.scCard,background:res.score>=90?`linear-gradient(135deg,${T.accent},#1B5E20)`:res.score>=70?`linear-gradient(135deg,${T.goldDark},${T.goldDeep})`:`linear-gradient(135deg,${T.danger},#B71C1C)`}}>
            <div style={{fontSize:13,opacity:.9}}>{nm} · {cn}</div>
            <div style={{fontSize:56,fontWeight:800,lineHeight:1.1,margin:"4px 0"}}>{res.score}<span style={{fontSize:22}}>점</span></div>
            <div style={{fontSize:13,opacity:.85,marginBottom:4}}>{et} · {ds}</div>
            <div style={{fontSize:12,opacity:.7,marginBottom:8}}>전체 {res.totalQ}문항 중 {res.oc+res.subCorrect}개 정답 · {res.ow}개 오답 · {res.totalQ-(res.to+res.sc)}개 미입력{res.subPending>0?` · ⏳ ${res.subPending}문항 채점중`:""}</div>
            <div style={S.scFB}>{res.score>=90?"🎉 훌륭합니다!":res.score>=70?"💪 잘했어요!":"📚 오답을 복습하세요!"}</div>
          </div>
          {gradingSub&&<div style={{padding:"12px 14px",borderRadius:10,marginBottom:14,background:`linear-gradient(90deg,${T.accentLight},${T.goldLight})`,border:`1.5px solid ${T.accent}`,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:24,height:24,border:`2.5px solid ${T.borderLight}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:T.accent}}>🤖 AI 주관식 채점 중...</div>
              <div style={{fontSize:11,color:T.textSub,marginTop:2}}>{gradingProgress.total}개 주관식을 한 번에 채점하고 있어요 (3~8초 소요)</div>
            </div>
          </div>}
          <div style={{padding:"10px 14px",borderRadius:10,marginBottom:14,fontSize:13,fontWeight:600,textAlign:"center",background:sendOk!==false?T.accentLight:T.dangerLight,color:sendOk!==false?T.accent:T.danger}}>{sendOk!==false?"✅ 결과가 선생님에게 전송되었습니다":"⚠️ 전송 실패"}</div>
          <div style={S.stRow}><SC i="✅" l="정답" v={res.oc+res.subCorrect} c={T.accent}/><SC i="❌" l="오답" v={res.ow} c={T.danger}/><SC i="📝" l="전체" v={res.totalQ} c={T.textSub}/><SC i="📊" l="점수" v={`${res.score}점`} c={T.goldDark}/>{res.sc>0&&<SC i="✍️" l="주관식" v={`${res.sc}`} c={T.textSub}/>}</div>
          {(res.totalQ-(res.to+res.sc))>0&&<div style={{padding:"8px 14px",borderRadius:10,marginBottom:10,fontSize:12,fontWeight:600,textAlign:"center",background:"#FFF3E0",color:"#E65100"}}>미입력 {res.totalQ-(res.to+res.sc)}문항은 0점 처리됩니다.</div>}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontSize:15,fontWeight:700,color:T.text}}>정오표</h3>
              <button onClick={()=>setWo(!wo)} style={{padding:"5px 12px",fontSize:12,fontWeight:600,border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",background:wo?T.dangerLight:T.borderLight,color:wo?T.danger:T.textSub}}>{wo?"❌ 오답만":"전체 보기"}</button></div>
            <div style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={S.tH}><span style={{flex:"0 0 36px",textAlign:"center"}}>#</span><span style={{flex:"0 0 36px",textAlign:"center"}}>유형</span><span style={{flex:1,textAlign:"center"}}>내 답</span><span style={{flex:1,textAlign:"center"}}>정답</span><span style={{flex:"0 0 60px",textAlign:"center"}}>결과</span></div>
              {res.det.filter(d=>wo?d.r==="오답"||d.r==="부분정답":true).map(d=>(
                <div key={d.q} style={{...S.tR,background:d.r==="정답"?"#F1F8E9":d.r==="오답"?"#FFF5F5":d.r==="부분정답"?"#FFF8E1":T.goldPale,flexDirection:"column",alignItems:"stretch"}}>
                  <div style={{display:"flex",alignItems:"center",width:"100%"}}>
                    <span style={{flex:"0 0 36px",textAlign:"center",fontWeight:700,fontSize:qNumMap?10:12,color:T.textSub}}>{qNumMap?qNumMap[String(d.q)]||d.q:d.q}</span>
                    <span style={{flex:"0 0 36px",textAlign:"center",fontSize:10,fontWeight:700,color:d.t==="sub"?T.accent:T.goldDark}}>{d.t==="sub"?"주관":"객관"}</span>
                    <span style={{flex:1,textAlign:"center",fontWeight:600,fontSize:13,color:T.text,wordBreak:"break-word",padding:"0 4px"}}>{d.t==="sub"?(d.s||"–"):vl(d.s)}</span>
                    <span style={{flex:1,textAlign:"center",fontWeight:600,fontSize:13,color:T.goldDark,wordBreak:"break-word",padding:"0 4px"}}>{d.t==="sub"?(d.c||"–"):vl(d.c)}</span>
                    <span style={{flex:"0 0 60px",textAlign:"center",fontSize:14}}>{d.r==="정답"?"✅":d.r==="오답"?"❌":d.r==="부분정답"?<span style={{fontSize:11,fontWeight:700,color:"#B8860B"}}>{d.partial}</span>:"⏳"}</span>
                  </div>
                  {d.t==="sub"&&d.gradeResult&&d.gradeResult.reasoning&&(
                    <div style={{padding:"6px 10px",marginTop:4,marginLeft:72,background:T.white,border:`1px solid ${T.borderLight}`,borderRadius:6,fontSize:11,color:T.textSub,lineHeight:1.5}}>
                      <span style={{fontWeight:700,color:T.accent}}>🤖 AI 채점:</span> {d.gradeResult.reasoning}
                      {d.gradeResult.deductions&&d.gradeResult.deductions.length>0&&(
                        <div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:4}}>
                          {d.gradeResult.deductions.map((dd,di)=>(
                            <span key={di} style={{padding:"2px 6px",background:T.dangerLight,color:T.danger,borderRadius:4,fontSize:10,fontWeight:600}}>{dd.type} {dd.amount}%</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>))}
            </div>
            {res.ow>0&&<div style={{marginTop:12,padding:"10px 12px",background:T.dangerLight,borderRadius:8,lineHeight:1.6}}><span style={{fontWeight:700,fontSize:12,color:T.danger}}>틀린 문항: </span><span style={{fontSize:12,color:T.text}}>{res.det.filter(d=>d.r==="오답").map(d=>d.q).join(", ")}</span></div>}
          </div>
        </>):(
          <div style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:48,marginBottom:12}}>📨</div>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:8}}>답안 제출 완료!</h2>
            <p style={{fontSize:14,color:T.textSub,marginBottom:4}}>{nm} · {cn} · {et}</p>
            <p style={{fontSize:13,color:T.textMuted,marginBottom:20}}>{ac}문항 제출됨 · 채점은 정답 등록 후 진행됩니다.</p>
            <div style={{padding:"10px 14px",borderRadius:10,marginBottom:20,fontSize:13,fontWeight:600,textAlign:"center",background:sendOk!==false?T.accentLight:T.dangerLight,color:sendOk!==false?T.accent:T.danger}}>{sendOk!==false?"✅ 답안이 전송되었습니다":"⚠️ 전송 실패"}</div>
          </div>
        )}
        {res&&res.ow>0&&!gradingSub&&<div style={{padding:"12px 16px",borderRadius:12,marginBottom:10,background:"#E8F5E9",border:`1px solid ${T.accent}`,textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:T.accent,marginBottom:4}}>📖 오답 복습 안내</div>
          <div style={{fontSize:12,color:T.textSub}}>틀린 문항을 위 정오표에서 확인하고 복습하세요!<br/>오답노트가 자동으로 만들어집니다.</div>
        </div>}
        <div style={{marginBottom:20}}><button style={{...S.btnG,opacity:gradingSub?0.5:1}} onClick={hReset} disabled={gradingSub}>{gradingSub?"🤖 AI 채점 중... 잠시만요":"새 시험 보기"}</button></div>
      </div>)}
    </div>
  );
}
function SC({i,l,v,c}){return(<div style={{flex:1,background:T.white,borderRadius:12,padding:"12px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",border:`1px solid ${T.borderLight}`}}><span style={{fontSize:18}}>{i}</span><span style={{fontSize:18,fontWeight:800,color:c}}>{v}</span><span style={{fontSize:10,color:T.textMuted,fontWeight:500}}>{l}</span></div>);}
const S={
  app:{fontFamily:"'Noto Sans KR',-apple-system,sans-serif",background:T.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:100},
  hdr:{background:T.white,borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,zIndex:100},
  hdrIn:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",maxWidth:480,margin:"0 auto"},
  logoR:{display:"flex",alignItems:"center",gap:10},
  logoM:{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${T.gold},${T.goldDark})`,color:T.white,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,letterSpacing:-1},
  hdrT:{fontSize:15,fontWeight:800,color:T.text,letterSpacing:-.3},
  hdrS:{fontSize:10,color:T.textMuted,fontWeight:500,marginTop:-1},
  hdrB:{fontSize:10,fontWeight:600,color:T.goldDark,background:T.goldLight,padding:"4px 8px",borderRadius:20,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  wrap:{padding:"16px 14px"},
  hero:{textAlign:"center",padding:"20px 0 12px"},heroT:{fontSize:24,fontWeight:800,color:T.text,marginBottom:4},heroD:{fontSize:13,color:T.textMuted,lineHeight:1.5},
  card:{background:T.white,borderRadius:14,padding:"20px 16px",marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",border:`1px solid ${T.borderLight}`},
  label:{fontSize:13,fontWeight:600,color:T.textSub,marginBottom:6},
  inp:{width:"100%",padding:"11px 14px",fontSize:15,borderRadius:10,border:`1.5px solid ${T.border}`,background:T.bg,color:T.text,fontFamily:"inherit"},
  cw:{display:"flex",flexWrap:"wrap",gap:6},
  ch:{padding:"8px 14px",borderRadius:20,border:"1.5px solid",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .12s"},
  chInp:{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${T.border}`,fontSize:13,fontFamily:"inherit",width:80,textAlign:"center"},
  btnG:{width:"100%",padding:"13px",fontSize:15,fontWeight:700,color:T.white,background:`linear-gradient(135deg,${T.gold},${T.goldDark})`,border:"none",borderRadius:12,cursor:"pointer",fontFamily:"inherit",marginTop:8},
  btnO:{flex:1,padding:"12px",fontSize:14,fontWeight:600,color:T.textSub,background:T.white,border:`1.5px solid ${T.border}`,borderRadius:12,cursor:"pointer",fontFamily:"inherit"},
  progA:{padding:"10px 14px 4px",background:T.white,borderBottom:`1px solid ${T.borderLight}`},
  progBg:{height:5,borderRadius:3,background:T.borderLight,overflow:"hidden"},
  progF:{height:"100%",borderRadius:3,transition:"width .3s,background .3s"},
  secTA:{background:T.white,borderBottom:`1px solid ${T.borderLight}`,padding:"7px 0"},
  secTS:{display:"flex",gap:5,overflowX:"auto",padding:"0 12px",scrollbarWidth:"none"},
  secT:{flex:"0 0 auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"5px 12px",borderRadius:8,border:"1.5px solid",fontSize:12,cursor:"pointer",fontFamily:"inherit",minWidth:56},
  qkR:{display:"flex",gap:8,padding:"7px 12px"},
  qkB:{flex:1,padding:"7px 10px",fontSize:12,fontWeight:600,color:T.goldDark,background:T.goldLight,border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit"},
  qLW:{padding:"0 10px 20px"},
  secH:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 6px 6px",position:"sticky",top:48,background:T.bg,zIndex:10},
  secTi:{fontSize:13,fontWeight:800,color:T.text},secC:{fontSize:11,fontWeight:600,color:T.textMuted},
  qR:{display:"flex",alignItems:"center",gap:6,padding:"7px 6px 7px 5px",marginBottom:3,borderRadius:10,transition:"all .12s"},
  qN:{flex:"0 0 30px",height:30,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700},
  cR:{display:"flex",gap:4,flex:1},
  cBtn:{flex:1,height:38,minWidth:0,borderRadius:9,border:"1.5px solid",fontSize:15,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"},
  sB:{flex:"0 0 24px",height:24,borderRadius:6,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  sInp:{flex:1,padding:"8px 12px",fontSize:14,borderRadius:9,border:`1.5px solid ${T.border}`,fontFamily:"inherit",background:T.bg},
  subBar:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:T.white,borderTop:`1px solid ${T.border}`,padding:"10px 16px",paddingBottom:"max(10px,env(safe-area-inset-bottom))",display:"flex",alignItems:"center",gap:12,zIndex:200},
  subBtn:{padding:"11px 24px",fontSize:15,fontWeight:700,color:T.white,background:`linear-gradient(135deg,${T.gold},${T.goldDark})`,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit"},
  ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20},
  mod:{background:T.white,borderRadius:18,padding:"24px 20px",maxWidth:320,width:"100%",textAlign:"center"},
  modT:{fontSize:17,fontWeight:800,color:T.text,marginBottom:14},
  modSR:{display:"flex",justifyContent:"center",alignItems:"center",gap:24,marginBottom:12},
  modS:{display:"flex",flexDirection:"column",alignItems:"center",gap:2},
  modCa:{flex:1,padding:"11px",fontSize:14,fontWeight:600,color:T.textSub,background:T.borderLight,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit"},
  modCo:{flex:1,padding:"11px",fontSize:14,fontWeight:700,color:T.white,background:`linear-gradient(135deg,${T.gold},${T.goldDark})`,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit"},
  scCard:{borderRadius:16,padding:"24px 20px",textAlign:"center",color:T.white,marginBottom:14},
  scFB:{fontSize:14,fontWeight:600,background:"rgba(255,255,255,0.2)",padding:"6px 16px",borderRadius:10,display:"inline-block"},
  stRow:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(70px,1fr))",gap:8,marginBottom:14},
  tH:{display:"flex",padding:"8px 8px",background:T.goldPale,fontSize:10,fontWeight:700,color:T.goldDeep,borderBottom:`1px solid ${T.border}`},
  tR:{display:"flex",padding:"7px 8px",borderBottom:`1px solid ${T.borderLight}`,alignItems:"center"},
};
