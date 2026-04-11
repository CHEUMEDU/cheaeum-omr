import { useState, useMemo, useCallback, useRef, useEffect } from "react";

/* ============================================================
   채움학원 웹 OMR v4 — Sheets 연동, 주관식, 문항수 선택
   ============================================================ */

const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzablzeV_gVdLoUG-Oh4s02vNmncvteesBn3875WDF3lO176nc4YzAKj7B6zOJVECQO/exec";
const SUBJECTS=["영어","국어","수학"];
const GRADES=["초3","초4","초5","초6","중1","중2","중3","고1","고2","고3"];
const LEVELS=["SB","B","I","A","SA","기타"];
const EXAM_TYPES=["단어시험","문법시험","종합시험","모의고사","수학테스트","Daily Test","해석테스트","WEEKLY TEST","MONTHLY TEST","기타"];
const Q_COUNTS=[100,200,300];
const SEC=20;const CV=[1,2,3,4,5];const CL=["1","2","3","4","5"];
const LS_KEY="chaeum_omr_student";
function lsGet(){try{return JSON.parse(localStorage.getItem(LS_KEY)||"{}");}catch(e){return{};}}
function lsSet(o){try{localStorage.setItem(LS_KEY,JSON.stringify(o));}catch(e){}}
const T={gold:"#D4A017",goldDark:"#B8860B",goldDeep:"#8B6914",goldLight:"#FFF3D0",goldPale:"#FFFBF0",goldMuted:"#F5E6B8",bg:"#FAFAF7",text:"#1A1A1A",textSub:"#5C5C5C",textMuted:"#999999",border:"#E8E4DA",borderLight:"#F0EDE4",accent:"#2E7D32",accentLight:"#E8F5E9",danger:"#C62828",dangerLight:"#FFEBEE",white:"#FFFFFF"};

function todayStr(){const d=new Date();return`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;}
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function isoToDot(s){return(s||"").replace(/-/g,".");}
function vl(v){if(!v&&v!==0)return"–";const i=CV.indexOf(v);return i>=0?CL[i]:String(v);}
function getSecs(n){const s=[];for(let i=0;i<n;i+=SEC){s.push({start:i+1,end:Math.min(i+SEC,n),label:`${i+1}–${Math.min(i+SEC,n)}`});}return s;}

function grade(ans,key,types,totalQ){
  let oc=0,ow=0,sc=0,totalObj=0,totalSub=0;const det=[];
  const N=totalQ||ans.length;
  // 1) 전체 문항 유형 집계 (답을 안 했어도 카운트)
  for(let i=0;i<N;i++){
    const qk=String(i+1);
    const tv=types?(types[qk]??types[i]):null;
    const isObj=!tv||tv==="obj"||tv==="mc";
    if(isObj)totalObj++;else totalSub++;
  }
  // 2) 학생 답안 채점
  for(let i=0;i<ans.length;i++){
    if(ans[i]===null||ans[i]==="")continue;
    const qk=String(i+1);
    const tv=types?(types[qk]??types[i]):null;
    const isObj=!tv||tv==="obj"||tv==="mc";
    const cRaw=key?(key[qk]??key[i]):null;
    const c=(cRaw!==null&&cRaw!==undefined&&cRaw!=="")?String(cRaw):null;
    const u=String(ans[i]);
    if(isObj){if(c!==null){if(u===c){oc++;det.push({q:i+1,s:u,c,r:"정답",t:"obj"});}else{ow++;det.push({q:i+1,s:u,c,r:"오답",t:"obj"});}}}
    else{sc++;det.push({q:i+1,s:u,c:c||"",r:"채점중",t:"sub"});}
  }
  const to=oc+ow;
  // 점수는 전체 객관식 문항 수 기준 (답 안한 문항은 오답 처리)
  const denom=totalObj>0?totalObj:(to>0?to:N);
  return{oc,ow,sc,to,totalObj,totalSub,totalQ:N,score:denom>0?Math.round((oc/denom)*100):0,det};
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
  const[sub,setSub]=useState("");const[gr,setGr]=useState("");const[lv,setLv]=useState("");const[et,setEt]=useState("");
  const[pd,setPd]=useState(todayIso());
  const[todayExams,setTodayExams]=useState(null);const[loadingExams,setLoadingExams]=useState(false);
  const[history,setHistory]=useState(null);const[loadingHist,setLoadingHist]=useState(false);const[histErr,setHistErr]=useState("");
  const[tq,setTq]=useState(100);const[cq,setCq]=useState("");
  const qc=cq?parseInt(cq)||100:tq;
  const[ans,setAns]=useState([]);const[res,setRes]=useState(null);
  const[conf,setConf]=useState(false);const[sec,setSec]=useState(0);const[wo,setWo]=useState(false);
  const[aKey,setAKey]=useState(null);const[tKey,setTKey]=useState(null);const[aLoad,setALoad]=useState(false);const[aNF,setANF]=useState(false);
  const[sending,setSending]=useState(false);const[sendOk,setSendOk]=useState(null);

  const cn=(sub&&gr&&lv)?`${sub} ${gr} ${lv}반`:"";
  const ds=isoToDot(pd);
  const isToday=pd===todayIso();
  const secs=useMemo(()=>getSecs(qc),[qc]);
  const sRefs=useRef([]);
  const ac=useMemo(()=>ans.filter(a=>a!==null&&a!=="").length,[ans]);
  const ss=useMemo(()=>secs.map(s=>{let d=0;for(let i=s.start-1;i<s.end;i++)if(ans[i]!==null&&ans[i]!=="")d++;return{...s,done:d,total:s.end-s.start+1};}),[ans,secs]);

  useEffect(()=>{setAns(Array(qc).fill(null));},[qc]);

  const hAns=useCallback((i,v)=>{setAns(p=>{const n=[...p];n[i]=p[i]===v?null:v;return n;});},[]);
  const hSub=useCallback((i,v)=>{setAns(p=>{const n=[...p];n[i]=v;return n;});},[]);

  const hLookupExams=()=>{
    if(!nm.trim())return alert("이름을 입력하세요.");
    if(!/^\d{4}$/.test(ph))return alert("핸드폰 뒷 4자리를 입력하세요.");
    if(!sub)return alert("과목을 선택하세요.");
    if(!gr)return alert("학년을 선택하세요.");if(!lv)return alert("레벨을 선택하세요.");
    lsSet({nm:nm.trim(),ph});
    setLoadingExams(true);setTodayExams(null);
    fetch(`${SHEETS_URL}?action=list_exams_today&subject=${encodeURIComponent(sub)}&grade=${encodeURIComponent(gr)}&level=${encodeURIComponent(lv)}&date=${encodeURIComponent(pd)}`)
      .then(r=>r.json()).then(d=>{setTodayExams(d.exams||[]);setLoadingExams(false);}).catch(()=>{setTodayExams([]);setLoadingExams(false);});
  };
  const hPickExam=(ex)=>{
    setEt(ex.examType);
    const qTotal=Number(ex.totalQuestions)||100;setTq(qTotal);setCq("");
    setAns(Array(qTotal).fill(null));setScr("input");setALoad(false);setANF(false);
    setAKey(ex.answers||null);setTKey(ex.types||null);
    if(ex.answers)setALoad(true);else setANF(true);
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

  const hFinal=async()=>{
    setConf(false);setSending(true);
    const r=aKey?grade(ans,aKey,tKey,qc):null;setRes(r);
    try{await fetch(SHEETS_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"student_answer",name:nm,phone:ph,className:cn,subject:sub,grade:gr,level:lv,examName:et,date:ds,
        totalGraded:r?r.to+r.sc:ac,score:r?r.score:null,correct:r?r.oc:null,wrong:r?r.ow:null,
        wrongQuestions:r?r.det.filter(d=>d.r==="오답").map(d=>d.q):[],answers:ans})});
      setSendOk(true);}catch(e){setSendOk(false);}
    setSending(false);setScr("result");
  };

  const hReset=()=>{setAns(Array(qc).fill(null));setRes(null);setWo(false);setSendOk(null);setScr("info");setSec(0);setNm("");setSub("");setGr("");setLv("");setEt("");setAKey(null);setTKey(null);setALoad(false);setANF(false);setTq(100);setCq("");setPd(todayIso());setTodayExams(null);};
  const hRetry=()=>{setAns(Array(qc).fill(null));setRes(null);setWo(false);setSendOk(null);setScr("input");setSec(0);};
  const scTo=(i)=>{setSec(i);sRefs.current[i]?.scrollIntoView({behavior:"smooth",block:"start"});};
  const goUA=()=>{const i=ans.findIndex(a=>a===null||a==="");if(i===-1)return alert("모든 문항에 답했습니다!");setSec(Math.floor(i/SEC));setTimeout(()=>{document.getElementById(`q-${i}`)?.scrollIntoView({behavior:"smooth",block:"center"});},100);};
  const clrAll=()=>{if(window.confirm("모든 답안을 초기화할까요?"))setAns(Array(qc).fill(null));};

  return(
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{font-family:'Noto Sans KR',-apple-system,sans-serif;background:${T.bg}}input:focus{outline:none;border-color:${T.gold}!important;box-shadow:0 0 0 3px ${T.goldLight}!important}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}.fade-up{animation:fadeUp .3s ease-out}.scale-in{animation:scaleIn .2s ease-out}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}`}</style>

      <header style={S.hdr}><div style={S.hdrIn}><div style={S.logoR}><div style={S.logoM}>채움</div><div><div style={S.hdrT}>채움학원</div><div style={S.hdrS}>답안 제출 시스템</div></div></div>{scr==="input"&&<div style={S.hdrB}>{nm} · {cn}</div>}</div></header>

      {/* ═══ 탭 전환 ═══ */}
      {scr==="info"&&(<div style={{display:"flex",gap:6,padding:"10px 14px 0"}}>
        <button onClick={()=>setTab("submit")} style={{flex:1,padding:"10px",fontSize:13,fontWeight:700,borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab==="submit"?T.goldDark:T.white,color:tab==="submit"?T.white:T.textSub,boxShadow:tab==="submit"?"none":`inset 0 0 0 1.5px ${T.border}`}}>📝 답안 제출</button>
        <button onClick={()=>setTab("history")} style={{flex:1,padding:"10px",fontSize:13,fontWeight:700,borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab==="history"?T.goldDark:T.white,color:tab==="history"?T.white:T.textSub,boxShadow:tab==="history"?"none":`inset 0 0 0 1.5px ${T.border}`}}>📊 내 성적</button>
      </div>)}

      {/* ═══ 정보 입력 (답안 제출 탭) ═══ */}
      {scr==="info"&&tab==="submit"&&(<div style={S.wrap} className="fade-up">
        <div style={S.hero}><div style={{fontSize:36,marginBottom:4}}>✏️</div><h1 style={S.heroT}>답안 제출</h1><p style={S.heroD}>본인 정보와 반을 선택하면<br/>해당 날짜의 시험 목록이 나타나요</p></div>
        <div style={S.card}>
          <div style={{marginBottom:14}}><div style={S.label}>이름 <span style={{color:T.danger}}>*</span></div><input style={S.inp} placeholder="이름을 입력하세요" value={nm} onChange={e=>setNm(e.target.value)}/></div>
          <div style={{marginBottom:14}}><div style={S.label}>핸드폰 뒷 4자리 <span style={{color:T.danger}}>*</span></div><input style={S.inp} placeholder="예: 1234" value={ph} onChange={e=>setPh(e.target.value.replace(/[^0-9]/g,"").slice(0,4))} inputMode="numeric" maxLength={4}/></div>
          <Chip label="과목" req opts={SUBJECTS} val={sub} onChange={setSub}/>
          <Chip label="학년" req opts={GRADES} val={gr} onChange={setGr}/>
          <Chip label="레벨" req opts={LEVELS} val={lv} onChange={setLv} custom/>
          {cn&&<div style={S.clPrev}><span style={{fontSize:12,color:T.textMuted}}>반 이름</span><span style={{fontSize:15,fontWeight:700,color:T.goldDark}}>{cn}</span></div>}
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
            {todayExams.length===0?(<div style={{padding:"14px",background:T.dangerLight,borderRadius:10,color:T.danger,fontSize:13,fontWeight:600,textAlign:"center"}}>{ds} {cn}에서 등록된 시험이 없습니다.<br/>선생님께 문의하세요.</div>):(
              <>
                <div style={{fontSize:12,fontWeight:700,color:T.goldDeep,marginBottom:8}}>{ds} {cn} 시험 ({todayExams.length}개)</div>
                {todayExams.map((ex,i)=>(<button key={i} onClick={()=>hPickExam(ex)} style={{width:"100%",padding:"12px 14px",marginBottom:6,background:T.goldLight,border:`1.5px solid ${T.goldMuted}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:14,fontWeight:700,color:T.goldDeep}}>{ex.examType}{ex.round?` · ${ex.round}`:""}</div><div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{ex.totalQuestions}문항</div></div>
                  <div style={{fontSize:18,color:T.goldDark}}>→</div>
                </button>))}
              </>)}
          </div>)}
        </div>
      </div>)}

      {/* ═══ 내 성적 탭 ═══ */}
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

      {/* ═══ 답안 입력 ═══ */}
      {scr==="input"&&(<div className="fade-up">
        {!aLoad&&!aNF&&<div style={{padding:"8px 14px",background:T.goldLight,fontSize:12,color:T.goldDeep,fontWeight:600,textAlign:"center"}}>정답 데이터를 불러오는 중...</div>}
        {aNF&&<div style={{padding:"8px 14px",background:T.dangerLight,fontSize:12,color:T.danger,fontWeight:600,textAlign:"center"}}>⚠ 등록된 정답이 없습니다. 답안만 제출되며 나중에 채점됩니다.</div>}
        {aLoad&&<div style={{padding:"8px 14px",background:T.accentLight,fontSize:12,color:T.accent,fontWeight:600,textAlign:"center"}}>✓ 정답 로드 완료 — 제출 즉시 채점됩니다</div>}

        <div style={S.progA}><div style={S.progBg}><div style={{...S.progF,width:`${(ac/qc)*100}%`,background:ac===qc?T.accent:T.gold}}/></div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:5}}><span style={{fontWeight:700,color:T.goldDark,fontSize:13}}>{ac}</span><span style={{color:T.textMuted,fontSize:13}}>/{qc}</span>
            <span style={{marginLeft:"auto",fontSize:12,fontWeight:600,color:ac===qc?T.accent:T.textMuted}}>{ac===qc?"✓ 완료":`${qc-ac}문항 남음`}</span></div></div>

        <div style={S.secTA}><div style={S.secTS}>{ss.map((s,i)=>{const a=i===sec,d=s.done===s.total;return(<button key={i} onClick={()=>scTo(i)} style={{...S.secT,background:a?T.goldDark:d?T.accentLight:T.white,color:a?T.white:d?T.accent:T.textSub,borderColor:a?T.goldDark:d?T.accent:T.border,fontWeight:a?700:500}}><span style={{fontSize:12}}>{s.label}</span><span style={{fontSize:10,opacity:.8}}>{d?"✓":`${s.done}/${s.total}`}</span></button>);})}</div></div>

        <div style={S.qkR}><button style={S.qkB} onClick={goUA}>⚡ 빈 문항 이동</button><button style={{...S.qkB,color:T.danger,background:T.dangerLight}} onClick={clrAll}>↺ 초기화</button></div>

        <div style={S.qLW}>{secs.map((s,si)=>(<div key={si} ref={el=>sRefs.current[si]=el}>
          <div style={S.secH}><span style={S.secTi}>{s.label}번</span><span style={S.secC}>{ss[si].done}/{ss[si].total}</span></div>
          {Array.from({length:s.end-s.start+1},(_,j)=>{const qi=s.start-1+j,sel=ans[qi],isSub=tKey&&tKey[qi]==="sub",fi=sel!==null&&sel!=="";
            return(<div key={qi} id={`q-${qi}`} style={{...S.qR,borderLeft:fi?`3px solid ${isSub?T.accent:T.gold}`:`3px solid transparent`,background:fi?(isSub?T.accentLight+"66":T.goldPale):T.white}}>
              <div style={{...S.qN,background:fi?(isSub?T.accent:T.gold):T.borderLight,color:fi?T.white:T.textMuted}}>{qi+1}</div>
              {isSub?(<div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,fontWeight:700,color:T.accent,background:T.accentLight,padding:"2px 6px",borderRadius:4}}>주관식</span>
                <input style={S.sInp} placeholder="답을 입력하세요" value={sel||""} onChange={e=>hSub(qi,e.target.value)}/></div>
              ):(<><div style={S.cR}>{CV.map((v,ci)=>{const p=sel===v;return(<button key={v} onClick={()=>hAns(qi,v)} style={{...S.cBtn,background:p?T.goldDark:T.white,color:p?T.white:T.text,borderColor:p?T.goldDark:T.border,fontWeight:p?700:400,transform:p?"scale(1.06)":"scale(1)",boxShadow:p?`0 2px 8px ${T.goldMuted}`:"none"}}>{CL[ci]}</button>);})}</div>
                <div style={{...S.sB,background:fi?T.goldLight:T.borderLight,color:fi?T.goldDeep:T.textMuted}}>{fi?vl(sel):"–"}</div></>)}
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

      {/* ═══ 결과 ═══ */}
      {scr==="result"&&!sending&&(<div style={S.wrap} className="fade-up">
        {res?(<>
          <div style={{...S.scCard,background:res.score>=90?`linear-gradient(135deg,${T.accent},#1B5E20)`:res.score>=70?`linear-gradient(135deg,${T.goldDark},${T.goldDeep})`:`linear-gradient(135deg,${T.danger},#B71C1C)`}}>
            <div style={{fontSize:13,opacity:.9}}>{nm} · {cn}</div>
            <div style={{fontSize:56,fontWeight:800,lineHeight:1.1,margin:"4px 0"}}>{res.score}<span style={{fontSize:22}}>점</span></div>
            <div style={{fontSize:13,opacity:.85,marginBottom:4}}>{et} · {ds}</div>
            <div style={{fontSize:12,opacity:.7,marginBottom:8}}>전체 {res.totalObj}문항 중 {res.oc}문항 정답 · {res.ow}오답 · {res.totalObj-res.to}미응답{res.sc>0?` · 주관식 ${res.totalSub}문항`:""}</div>
            <div style={S.scFB}>{res.score>=90?"🎉 훌륭합니다!":res.score>=70?"💪 잘했어요!":"📚 오답을 복습하세요!"}</div>
          </div>
          <div style={{padding:"10px 14px",borderRadius:10,marginBottom:14,fontSize:13,fontWeight:600,textAlign:"center",background:sendOk!==false?T.accentLight:T.dangerLight,color:sendOk!==false?T.accent:T.danger}}>{sendOk!==false?"✅ 결과가 선생님에게 전송되었습니다":"⚠️ 전송 실패"}</div>
          <div style={S.stRow}><SC i="✅" l="정답" v={res.oc} c={T.accent}/><SC i="❌" l="오답" v={res.ow} c={T.danger}/><SC i="📊" l="정답률" v={`${res.score}%`} c={T.goldDark}/>{res.sc>0&&<SC i="✍️" l="주관식" v={`${res.sc}`} c={T.textSub}/>}</div>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontSize:15,fontWeight:700,color:T.text}}>정오표</h3>
              <button onClick={()=>setWo(!wo)} style={{padding:"5px 12px",fontSize:12,fontWeight:600,border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",background:wo?T.dangerLight:T.borderLight,color:wo?T.danger:T.textSub}}>{wo?"❌ 오답만":"전체 보기"}</button></div>
            <div style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={S.tH}><span style={{flex:"0 0 36px",textAlign:"center"}}>#</span><span style={{flex:"0 0 36px",textAlign:"center"}}>유형</span><span style={{flex:1,textAlign:"center"}}>내 답</span><span style={{flex:1,textAlign:"center"}}>정답</span><span style={{flex:"0 0 40px",textAlign:"center"}}>결과</span></div>
              {res.det.filter(d=>wo?d.r==="오답":true).map(d=>(
                <div key={d.q} style={{...S.tR,background:d.r==="정답"?"#F1F8E9":d.r==="오답"?"#FFF5F5":T.goldPale}}>
                  <span style={{flex:"0 0 36px",textAlign:"center",fontWeight:700,fontSize:12,color:T.textSub}}>{d.q}</span>
                  <span style={{flex:"0 0 36px",textAlign:"center",fontSize:10,fontWeight:700,color:d.t==="sub"?T.accent:T.goldDark}}>{d.t==="sub"?"주관":"객관"}</span>
                  <span style={{flex:1,textAlign:"center",fontWeight:600,fontSize:14,color:T.text}}>{vl(d.s)}</span>
                  <span style={{flex:1,textAlign:"center",fontWeight:600,fontSize:14,color:T.goldDark}}>{vl(d.c)}</span>
                  <span style={{flex:"0 0 40px",textAlign:"center",fontSize:14}}>{d.r==="정답"?"✅":d.r==="오답"?"❌":"⏳"}</span>
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
        <div style={{display:"flex",gap:10,marginBottom:20}}><button style={S.btnO} onClick={hRetry}>↻ 다시 입력</button><button style={S.btnG} onClick={hReset}>처음으로</button></div>
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
  clPrev:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.goldPale,borderRadius:10,marginBottom:14,border:`1px solid ${T.goldMuted}`},
  dtRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.bg,borderRadius:10,marginBottom:8,border:`1px solid ${T.borderLight}`},
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
