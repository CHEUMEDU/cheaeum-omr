// ============================================================
// 채움학원 학생앱 (OMR + 답안 제출)
// 파일 경로: cheaeum-omr/chaeum-omr-project/src/App.jsx
// ============================================================
// 버전 이력
// ─────────────────────────────────────────
// v23.18 (2026-05-14) — 단순화: 객관식 즉시 AI 풀이 제거
//   ★ 정오표 객관식 오답 클릭 시 사전 생성된 explanations 만 표시 (AI 즉시 호출 X)
//   ★ "▼ AI 풀이 받기 (5~10초)" 안내 제거
//   원인: GPT API 비용 + 학생 클릭 빈도 낮음 + 다음 수업 선생님 직접 보강이 더 효과적
//
// v23.17 (2026-05-14)
//   ★ "정답 새로고침" 버튼 제거 (가시성 낮고 자동 갱신 useEffect 가 이미 동작)
//   ★ 🚨 미니 보강시험 안 뜨던 버그 픽스 (2건)
//     1) list_mini_exam_progress 응답 키 — GAS 는 items 반환, 학생앱이 d.exams 로 읽어서 항상 빈 배열
//        → const list = d.items || d.exams || [] 로 둘 다 호환
//     2) recommend_mini_exam fetch — mode:"no-cors" + application/json 으로 응답 못 읽음
//        → text/plain 으로 변경 + 응답에서 generated 길이로 즉시 알림
//   ★ 카테고리 라벨 개선 — "1, 2, -1" 같은 숫자만 있으면 무시 → 객관식/주관식 폴백
//     (GAS rebuildCategoriesBadOnly() 로 재분석 가능)
//
// v23.16 (2026-05-13)
//   ★ v27.1 캐시 활용 — 트렌드 차트가 get_student_stats_fast 호출 (10초 → 0.5초)
//   ★ 미스 시 student_history 폴백 (기존 데이터 호환)
//
// v23.15 (2026-05-13)
//   ★ 객관식 즉시 풀이 CORS 우회 (text/plain 으로 변경)
//     · 기존: Content-Type: application/json → preflight → 차단 → 풀이 실패
//     · 수정: text/plain;charset=utf-8 → 통과 → 정상 풀이 수신
//   ★ 에러 메시지 강화 (네트워크 vs API 미배포 구분)
//
// v23.14 (2026-05-13)
//   ★ 시험 분석 차트 3가지 탭 (시안 1 + 시안 3)
//     · 🕸️ 영역 (레이더 차트) — 카테고리별 강·약점 한눈에 (영역 3개 이상부터)
//     · 📈 추세 (트렌드 차트) — 최근 시험 점수 변화 (학생 동기부여)
//     · 📋 막대 (기존 막대그래프) — 카테고리별 정답률
//   ★ student_history 자동 로드 → 추세 차트용 데이터
//   ★ Pure SVG 렌더링 (외부 라이브러리 X)
//
// v23.13 (2026-05-13)
//   ★ 결과 화면에서 보강 시험 바로 풀기 큰 버튼 추가
//     · 기존: "홈으로 돌아가서 풀어보세요" 작은 안내
//     · 신규: 큰 오렌지 그라데이션 버튼 — 즉시 미니 시험 응시 화면으로 이동
//     · 학생 동선 단축 (결과 화면 → 보강 시험 → 다음 시험으로)
//
// v23.12 (2026-05-13)
//   ★ 수학 키보드 전면 개편 — 숫자 0~9 + 사칙연산 + 기호 모두 포함 (40개 키)
//     · ✕ 닫기 버튼 — 키보드 사라짐 → OMR 제출 버튼 보임
//     · ⌫ 백스페이스 키
//     · 닫은 후 다시 열기: 우하단 🧮 수학 키보드 플로팅 버튼
//   ★ hBackspace + mathKbHidden state 신규
//
// v23.11 (2026-05-13)
//   ★ 시험 분석 — 카테고리별 정답률 (문법/어휘/독해 등) 그래프
//     · view_answer_key 응답의 categories 사용 (없으면 객관식/주관식 fallback)
//     · 약점 영역 자동 식별 + 우선순위 표시
//   ★ 객관식 풀이 즉시 생성 (v25.4 GAS + Vercel)
//     · 정오표 객관식 오답 클릭 시 explanations 없으면 generate_explanations 자동 호출
//     · Gemini 풀이 받아 즉시 표시 + 다음 학생부터는 캐시된 풀이 사용
//
// v23.10 (2026-05-13)
//   ★ "초록=추가 / 빨강=빼야 함" DiffView 안내 삭제 (매번 노이즈 — 사용자 요청)
//   ★ 내 성적 조회 — 날짜 강조 + 피드백 펼침 (HistoryCard 컴포넌트 신규)
//     · 날짜 카드 상단에 큰 글씨 (YYYY년 M월 D일 (요일))
//     · "📖 풀이·정답 보기" 버튼 — view_answer_key 호출 → choiceExplanations 표시
//     · 과거 시험도 채점 결과 화면과 동일한 피드백 확인 가능
//   ★ student_history 응답 확장 (subject/grade/level/teacher/folderId/answers 추가)
//
// v23.9 (2026-05-13)
//   ★ 보강 미니 시험 자동 추천 + 응시 시스템 (Phase 4)
//     · 채점 결과 후 자동으로 GAS recommend_mini_exam 호출 (약점 영역 분석)
//     · 홈 화면에 "📚 보강 시험 N개" 배지 표시 (학생 본인 추천만)
//     · 미니 시험 응시 화면 (5분 카운트다운, 큰 버튼, 모바일 친화)
//     · 풀이 완료 시 GAS submit_mini_exam_result 호출 → 점수 저장
//   ★ 수학 기호 키보드 (Phase 6) — 주관식 입력 시 √ π ≤ ≥ x² 등 빠른 삽입
//   ★ KaTeX 수식 렌더링 (선택) — 수학 문제 본문에 LaTeX 표기 시 자동 변환
//     · package.json 에 "katex": "^0.16.0" 추가 필요 (없으면 텍스트 그대로 표시)
//
// v23.8 (2026-05-13)
//   ★ 채점 결과 화면 — 방식 1+5 통합 (오답 분석 + 분석 리포트)
//     · view_answer_key 응답의 explanations 필드 사용 (객관식 choiceExplanations + 주관식 gradingGuide)
//     · 정오표 객관식 오답 클릭 시 펼침 — 정답 이유 + 선택지별 분석
//     · 화면 상단에 분석 리포트 추가 (영역별 정답률 막대 그래프 + 약점 안내)
//     · 약점 영역(80% 미만) 자동 표시 — 보강 미니 시험 안내
//   ★ explanations state + expandedRows state 신규 추가
//
// v23.7 (2026-05-11)
//   ★ 주관식 피드백 포맷 변경 — 채움Tip 제거, DiffView(수정·추가 가이드) + 문법팁 형식
//   ★ LOOSE 모드 diff 적용 — 구두점·공백 완화 (선생님앱과 동일 기준)
//
// v23.6 (2026-05-11)
//   ★ 3중 자동 갱신 — 정답 수정 시 학생도 즉시 새 점수 확인
//     · (1) 제출 시점에 view_answer_key 재조회 — 시험 중 선생님이 정답 고쳐도 최신 기준 채점
//     · (2) 결과 화면 탭 복귀 시 visibilityChange 이벤트로 백그라운드 재조회 (같은 기기 시나리오)
//     · (3) "🔄 정답 새로고침" 버튼 — 다른 기기·수동 갱신용
//   ★ currentExam state 추가 — 새로고침 시 folderId 기반 재조회
//   ★ 주관식 부분점수·총평은 보존 (AI 재호출 없음)
//
// v22.4 (2026-04-28)
//   ★ "AI 채점:" → "💬 채움Tip:" 라벨 변경 (학원 브랜딩)
//   ★ 학생 총평(overallComment) 표시 — 이름 + 강점/약점 1~2줄
//   ★ "결과가 선생님에게 전송되었습니다" 제거 → 총평으로 대체
//   ★ "📚 오답을 복습하세요!" (점수 카드) 제거 — 불필요
//   ★ studentName 을 API에 전달 (개인화된 총평 받기)
//   ★ 문법 설명도 반말/친근한 톤 (API 측 prompt 변경)
//
// v22.3  — 100점 만점 + 객관식/주관식 분리 표시
// v22.2  — 가중치 + 문법 표시 + 65초 timeout
// v22.1  — API 절대 URL (404 해결)
// v22.0  — types "sub"/"sa" 호환
// v6  — 주관식 자동 채점 (Gemini 2.5 Flash, 배치)
// ============================================================

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

const VERSION = "v23.18";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzablzeV_gVdLoUG-Oh4s02vNmncvteesBn3875WDF3lO176nc4YzAKj7B6zOJVECQO/exec";
// ★ v22.2: API 절대 URL (CORS 허용)
const GRADE_SUBJECTIVE_URL = "https://chaeum-teacher.vercel.app/api/grade-subjective";
// ★ v22.2: 채점 timeout 65초 (Vercel Node Runtime 60초 한도 + 5초 여유)
const GRADE_TIMEOUT_MS = 65000;
// ★ v22.2: 주관식 가중치 (객관식 1배, 주관식 1.5배)
//   혼합 시험: 주관식이 더 어렵고 시간 오래 걸리므로 1.5배 점수
//   전체 주관식 또는 전체 객관식: 동일 배점 (가중치 무의미)
const SUB_WEIGHT_MIXED = 1.5;

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
// ★ v22.4: studentName 전달 + overallComment 받기
//   응답: { results: [...], overallComment: "..." }
async function gradeSubjectiveBatch(items, studentName, gradingMode){
  if(!GRADE_SUBJECTIVE_URL)return {results:[],overallComment:""};
  if(!items||items.length===0)return {results:[],overallComment:""};
  // ★ v22.7: gradingMode 정규화 (loose=해석/번역, strict=단답형 — 기본 strict)
  const mode=String(gradingMode||"").toLowerCase()==="loose"?"loose":"strict";
  // AbortController 로 65초 timeout 안전장치
  const controller=new AbortController();
  const timeoutId=setTimeout(()=>controller.abort(),GRADE_TIMEOUT_MS);
  try{
    const res=await fetch(GRADE_SUBJECTIVE_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({items,studentName:studentName||"",gradingMode:mode}),
      signal:controller.signal
    });
    clearTimeout(timeoutId);
    if(!res.ok){
      const t=await res.text();
      return {
        results:items.map(it=>({
          q:it.q,score:0,category:"ERROR",deductions:[],grammarTip:"",
          reasoning:`HTTP ${res.status}: ${t.substring(0,100)}`
        })),
        overallComment:""
      };
    }
    const j=await res.json();
    if(j.ok&&Array.isArray(j.results)){
      return {results:j.results, overallComment:String(j.overallComment||"")};
    }
    return {
      results:items.map(it=>({
        q:it.q,score:0,category:"ERROR",deductions:[],grammarTip:"",
        reasoning:j.error||"채점 응답 없음"
      })),
      overallComment:""
    };
  }catch(e){
    clearTimeout(timeoutId);
    const isTimeout=e.name==="AbortError";
    return {
      results:items.map(it=>({
        q:it.q,score:0,category:isTimeout?"TIMEOUT":"ERROR",deductions:[],grammarTip:"",
        reasoning:isTimeout?"채점 시간 초과 (65초). 답안이 너무 길거나 서버 부하. 잠시 후 다시 시도하세요.":"호출 실패: "+String(e)
      })),
      overallComment:""
    };
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
  // ★ v22.2: 주관식 가중치 적용 (혼합 시 1.5배)
  const isMixed=totalObj>0&&totalSub>0;
  const subWeight=isMixed?SUB_WEIGHT_MIXED:1.0;
  const totalPossible=totalObj+totalSub*subWeight;
  // ★ v22.3: 100점 만점 기준 객관식/주관식 분리 점수
  //   객관식 부분 만점 = (객관식 가중치 합 / 전체 가중치) × 100
  //   주관식 부분 만점 = 100 - 객관식 부분 만점 (반올림 차이 보정)
  const objMaxScore=totalPossible>0?Math.round((totalObj/totalPossible)*100):0;
  const subMaxScore=totalPossible>0?(100-objMaxScore):0;
  // 학생이 받은 객관식/주관식 점수 (각각 만점 기준)
  const objEarned=totalObj>0?Math.round((oc/totalObj)*objMaxScore):0;
  const subEarned=totalSub>0?Math.round((subPartialSum/totalSub)*subMaxScore):0;
  // 총점 = 두 부분 합 (반올림 누적 오차 0~2점 가능)
  const score=objEarned+subEarned;
  return{
    oc,ow,sc,to,totalObj,totalSub,totalQ:N,
    subPartial:Math.round(subPartialSum*100)/100,
    subPending,subCorrect,score,det,subWeight,isMixed,
    // ★ v22.3 추가
    objMaxScore,subMaxScore,objEarned,subEarned
  };
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

// ─── 주관식 diff 유틸 (LOOSE 모드: 문장 끝 구두점·아포스트로피·공백 완화) ───
function diffWordsKor(correct, student) {
  const _prep = s => String(s||"").trim().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  const _tok = s => _prep(s).split(/(\s+|[,;:"])/).filter(t => t && !/^\s+$/.test(t));
  const a = _tok(correct), b = _tok(student);
  const m = a.length, n = b.length;
  const dp = Array(m+1).fill(null).map(()=>Array(n+1).fill(0));
  for (let ii=1; ii<=m; ii++) for (let jj=1; jj<=n; jj++) {
    if (a[ii-1]===b[jj-1]) dp[ii][jj]=dp[ii-1][jj-1]+1;
    else dp[ii][jj]=Math.max(dp[ii-1][jj],dp[ii][jj-1]);
  }
  const ops=[];
  let i=m,j=n;
  while(i>0&&j>0){
    if(a[i-1]===b[j-1]){ops.push({op:"keep",text:a[i-1]});i--;j--;}
    else if(dp[i-1][j]>=dp[i][j-1]){ops.push({op:"add",text:a[i-1]});i--;}
    else{ops.push({op:"del",text:b[j-1]});j--;}
  }
  while(i>0){ops.push({op:"add",text:a[i-1]});i--;}
  while(j>0){ops.push({op:"del",text:b[j-1]});j--;}
  return ops.reverse();
}
function groupDiffOps(ops){
  const groups=[];let i=0;
  while(i<ops.length){
    const o=ops[i];
    if(o.op==="keep"){groups.push({type:"keep",text:o.text});i++;}
    else{
      const dels=[];
      while(i<ops.length&&ops[i].op==="del"){dels.push(ops[i].text);i++;}
      const adds=[];
      while(i<ops.length&&ops[i].op==="add"){adds.push(ops[i].text);i++;}
      if(dels.length>0&&adds.length>0){groups.push({type:"replace",from:dels.join(" "),to:adds.join(" ")});}
      else if(dels.length>0){groups.push({type:"del",text:dels.join(" ")});}
      else if(adds.length>0){groups.push({type:"add",text:adds.join(" ")});}
    }
  }
  return groups;
}
function DiffView({correct,student,T}){
  if(!correct&&!student)return null;
  const ops=diffWordsKor(correct,student);
  const groups=groupDiffOps(ops);
  const guides=[];
  groups.forEach(g=>{if(g.type==="replace"||g.type==="add")guides.push(g);});
  return(
    <>
      <span style={{lineHeight:1.7}}>
        {groups.map((g,i)=>{
          if(g.type==="keep")return<span key={i}>{g.text} </span>;
          if(g.type==="del"||g.type==="replace"){
            const txt=g.type==="del"?g.text:g.from;
            return<span key={i} style={{background:"#ffebee",color:"#C62828",textDecoration:"line-through",padding:"0 3px",borderRadius:3,margin:"0 1px"}} title="빼야 함">{txt} </span>;
          }
          return null;
        })}
      </span>
      {guides.length>0&&(
        <div style={{marginTop:6,padding:"6px 10px",background:"#f0f9f0",border:"1px dashed #66bb6a",borderRadius:4,fontSize:11}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2E7D32",marginBottom:3}}>🔧 수정·추가 가이드</div>
          {guides.map((g,i)=>(
            <div key={i} style={{color:"#1B5E20",lineHeight:1.6}}>
              <b>{i+1})</b>{" "}
              {g.type==="replace"?(
                <><span style={{color:"#C62828",fontWeight:600}}>{g.from}</span><span style={{margin:"0 4px",color:"#888"}}>→</span><b style={{color:"#2E7D32"}}>{g.to}</b></>
              ):(
                <><b style={{color:"#2E7D32"}}>{g.text}</b><span style={{marginLeft:4,fontSize:10,color:"#666"}}>(추가)</span></>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
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
  // ★ v23.8: 오답분석 데이터 — view_answer_key 응답에서 받음 (객관식 choiceExplanations + 주관식 gradingGuide)
  const[explanations,setExplanations]=useState(null);
  // ★ v23.11: 카테고리 데이터 (영역별 정답률) + 즉시 풀이 로딩 상태
  const[categories,setCategories]=useState(null);  // { "1": "문법", "2": "어휘", ... }
  const[loadingExpl,setLoadingExpl]=useState(false); // 객관식 즉시 풀이 생성 중
  // ★ v23.14 (2026-05-13): 그래프 시각화 탭 (radar / trend / bar)
  const[chartTab,setChartTab]=useState("radar");  // radar | trend | bar
  const[trendHistory,setTrendHistory]=useState(null);  // [{date, score, byCategory:{문법:80,...}}]
  // ★ v23.8: 정오표 펼침 상태 (객관식 오답마다 정답·오답 분석 표시)
  const[expandedRows,setExpandedRows]=useState({});
  const[conf,setConf]=useState(false);const[sec,setSec]=useState(0);const[wo,setWo]=useState(false);
  const[aKey,setAKey]=useState(null);const[tKey,setTKey]=useState(null);const[qNumMap,setQNumMap]=useState(null);const[aLoad,setALoad]=useState(false);const[aNF,setANF]=useState(false);
  // ★ v22.7: 주관식 채점 모드 (loose=해석/번역, strict=단답형) — 시험 선택 시 저장
  const[gradingMode,setGradingMode]=useState("strict");
  // ★ v23.6: 현재 시험 메타 (결과 새로고침 시 view_answer_key 재조회용)
  const[currentExam,setCurrentExam]=useState(null);
  const[refreshing,setRefreshing]=useState(false);
  const[sending,setSending]=useState(false);const[sendOk,setSendOk]=useState(null);
  const[gradingSub,setGradingSub]=useState(false);
  const[gradingProgress,setGradingProgress]=useState({done:0,total:0});
  // ★ v23.9: 미니 보강 시험 state
  const[miniExams,setMiniExams]=useState([]);  // 학생 본인 추천 시험 목록 [{id, subject, weakArea, weakPct, deadline, status, questions}]
  const[loadingMini,setLoadingMini]=useState(false);
  const[miniCurrent,setMiniCurrent]=useState(null);  // 현재 풀고 있는 미니 시험
  const[miniAnswers,setMiniAnswers]=useState([]);    // 미니 시험 답안
  const[miniTimeLeft,setMiniTimeLeft]=useState(300); // 5분 = 300초
  const[miniResult,setMiniResult]=useState(null);    // 풀이 완료 후 결과
  const[miniSending,setMiniSending]=useState(false);
  const[recommendingMini,setRecommendingMini]=useState(false);  // 추천 미니 생성 중 표시
  const[recommendedNew,setRecommendedNew]=useState(0);          // 방금 새로 추천된 N개
  // ★ v23.9: 수학 기호 키보드 — 현재 포커스된 주관식 input 추적
  const[focusedSubIdx,setFocusedSubIdx]=useState(null);      // 일반 시험용 (qi)
  const[focusedSubBlankIdx,setFocusedSubBlankIdx]=useState(null);  // 빈칸 multi 용
  const[focusedMiniIdx,setFocusedMiniIdx]=useState(null);   // 미니 시험용
  const isMathSubject=String(sub).indexOf("수학")>=0||String(currentExam&&currentExam.subject).indexOf("수학")>=0||String(miniCurrent&&miniCurrent.subject).indexOf("수학")>=0;
  // ★ v23.12: 수학 키보드 닫기 상태 — 사용자가 ✕ 누르면 키보드 숨김 → 제출 버튼 보임
  const[mathKbHidden,setMathKbHidden]=useState(false);
  // 백스페이스 — 포커스된 입력에서 마지막 글자 지움
  const hBackspace=()=>{
    if(focusedMiniIdx!==null){
      hMiniAns(focusedMiniIdx,(miniAnswers[focusedMiniIdx]||"").slice(0,-1));
      return;
    }
    if(focusedSubIdx!==null){
      const cur=ans[focusedSubIdx];
      if(focusedSubBlankIdx!==null){
        const curStr=typeof cur==="string"?cur:"";
        const parts=curStr.split("|");
        while(parts.length<=focusedSubBlankIdx)parts.push("");
        parts[focusedSubBlankIdx]=(parts[focusedSubBlankIdx]||"").slice(0,-1);
        hSub(focusedSubIdx,parts.join("|"));
      }else{
        hSub(focusedSubIdx,(typeof cur==="string"?cur:"").slice(0,-1));
      }
    }
  };
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
  // ★ v23.6: 결과 화면에서 탭 복귀 시 자동 재조회
  //   선생님 앱에서 정답 수정 후 학생 앱으로 돌아오면 자동으로 새 점수 반영
  //   (같은 기기·다른 탭 시나리오 대응. 다른 기기면 🔄 새로고침 버튼 사용)
  useEffect(()=>{
    if(scr!=="result"||!currentExam)return;
    let lastRefresh=Date.now();
    const onVisible=()=>{
      if(document.visibilityState!=="visible")return;
      // 방금 켰으면 (3초 이내) 스킵 — 제출 직후 불필요한 재호출 방지
      if(Date.now()-lastRefresh<3000)return;
      lastRefresh=Date.now();
      // 조용히 백그라운드 재조회 (alert 없이)
      (async()=>{
        try{
          const params=new URLSearchParams();
          if(currentExam.folderId)params.set("folderId",currentExam.folderId);
          else{
            params.set("subject",currentExam.subject||sub||"");
            params.set("grade",currentExam.grade||gr||"");
            params.set("level",currentExam.level||lv||"");
            params.set("examType",currentExam.examType||"");
            if(currentExam.teacher)params.set("teacher",currentExam.teacher);
            if(currentExam.examDate)params.set("date",currentExam.examDate);
          }
          const rr=await fetch(`${SHEETS_URL}?action=view_answer_key&${params.toString()}`);
          const dd=await rr.json();
          if(dd.result!=="ok")return;
          const fa=normalizeAnswerData(dd.answers||{});
          const ft=dd.types?normalizeAnswerData(dd.types):null;
          // 정답이 바뀌었으면 재채점
          const prevHash=JSON.stringify(aKey||{});
          const newHash=JSON.stringify(fa);
          if(prevHash===newHash)return; // 변동 없음
          setAKey(fa);setTKey(ft);
          // ★ v23.8: 오답분석 데이터 갱신
          if(dd.explanations)setExplanations(dd.explanations);
          if(dd.categories)setCategories(dd.categories);
          const fresh=grade(ans,fa,ft,qc);
          // 주관식 보존
          if(res&&res.det){
            fresh.det=fresh.det.map(d=>{
              if(d.t!=="sub")return d;
              const prev=res.det.find(p=>p.q===d.q&&p.t==="sub");
              if(prev&&prev.gradeResult)return{...d,gradeResult:prev.gradeResult,partial:prev.partial,r:prev.r};
              return d;
            });
            if(res.overallComment)fresh.overallComment=res.overallComment;
          }
          setRes(fresh);
        }catch(_e){/* 조용히 실패 */}
      })();
    };
    document.addEventListener("visibilitychange",onVisible);
    return ()=>document.removeEventListener("visibilitychange",onVisible);
  },[scr,currentExam,ans,qc,aKey,res,sub,gr,lv]);
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
    // ★ v23.6: 새로고침용 시험 메타 저장 (folderId, setType, examType, date 등)
    setCurrentExam(ex);
    if(ex.className){
      const parts=ex.className.split(/\s+/);
      setSub(parts[0]||"");setLv((parts[2]||"").replace(/반$/,"")||"");
      setExSub(parts[0]||"");setExLv((parts[2]||"").replace(/반$/,"")||"");
    }
    const _setTag=(ex.setType||ex.round||"").trim();
    setEt(ex.examType + (_setTag?` (${_setTag})`:""));
    // ★ v22.7: 시험에 저장된 채점 모드 적용 (loose=해석/번역, strict=단답형)
    setGradingMode(String(ex.gradingMode||"").toLowerCase()==="loose"?"loose":"strict");
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
  // ★ v23.6: 결과 화면 새로고침 — 선생님이 정답 수정한 경우 학생이 즉시 새 점수 확인
  // 1) view_answer_key 로 최신 정답 재조회 (서버 캐시는 update_answer_key 시 자동 무효화됨)
  // 2) 새 aKey 로 grade() 재실행 → setRes 갱신
  // 3) 주관식이 있어도 객관식 부분은 즉시 반영, 주관식은 채점중 표시 유지
  const hRefreshResult=async()=>{
    if(refreshing)return;
    if(!currentExam){alert("새로고침할 시험 정보가 없습니다. '새 시험 보기'로 다시 시작해주세요.");return;}
    setRefreshing(true);
    try{
      const params=new URLSearchParams();
      if(currentExam.folderId){
        params.set("folderId",currentExam.folderId);
      }else{
        params.set("subject",currentExam.subject||sub||"");
        params.set("grade",currentExam.grade||gr||"");
        params.set("level",currentExam.level||lv||"");
        params.set("examType",currentExam.examType||"");
        if(currentExam.teacher)params.set("teacher",currentExam.teacher);
        if(currentExam.examDate)params.set("date",currentExam.examDate);
      }
      const r=await fetch(`${SHEETS_URL}?action=view_answer_key&${params.toString()}`);
      const d=await r.json();
      if(d.result!=="ok"){alert("정답 조회 실패: "+(d.message||"알 수 없는 오류"));setRefreshing(false);return;}
      const freshAns=normalizeAnswerData(d.answers||{});
      const freshTyp=d.types?normalizeAnswerData(d.types):null;
      setAKey(freshAns);setTKey(freshTyp);
      // ★ v23.8: 오답분석 데이터 갱신 (정답 수정 시 explanations도 함께 업데이트)
      if(d.explanations)setExplanations(d.explanations);
      if(d.categories)setCategories(d.categories);
      // 재채점 — 주관식 부분점수는 기존 결과에서 보존 (refresh 시점에 AI 재호출은 비용·시간 부담)
      const fresh=grade(ans,freshAns,freshTyp,qc);
      // 기존 res 의 주관식 채점결과(gradeResult) · overallComment 가 있으면 보존
      if(res&&res.det){
        fresh.det=fresh.det.map(d=>{
          if(d.t!=="sub")return d;
          const prev=res.det.find(p=>p.q===d.q&&p.t==="sub");
          if(prev&&prev.gradeResult){
            return{...d,gradeResult:prev.gradeResult,partial:prev.partial,r:prev.r};
          }
          return d;
        });
        if(res.overallComment)fresh.overallComment=res.overallComment;
      }
      setRes(fresh);
      // 변경된 점수 알림 (이전 점수와 비교)
      const prevScore=res?res.score:null;
      if(prevScore!==null&&prevScore!==fresh.score){
        alert(`✅ 정답 기준이 갱신되었습니다.\n\n${prevScore}점 → ${fresh.score}점`);
      }else{
        alert(`✅ 새로 채점했어요. (${fresh.score}점)`);
      }
    }catch(e){
      alert("네트워크 오류: "+String(e));
    }
    setRefreshing(false);
  };
  const hSubmit=()=>{if(ac===0)return alert("최소 1문항 이상 답을 선택하세요.");setConf(true);};
  // ============================================================
  // ★ v22.0: 답안 제출 + Gemini 주관식 배치 자동 채점
  // ============================================================
  const hFinal=async()=>{
    setConf(false);setSending(true);
    // ★ v23.6: 제출 직전 최신 정답 재조회 — 선생님이 시험 중에 정답을 수정한 경우 자동 반영
    //   (caching은 GAS 가 update_answer_key 시 무효화하므로 항상 최신 데이터)
    let effAKey=aKey, effTKey=tKey;
    if(currentExam){
      try{
        const params=new URLSearchParams();
        if(currentExam.folderId)params.set("folderId",currentExam.folderId);
        else{
          params.set("subject",currentExam.subject||sub||"");
          params.set("grade",currentExam.grade||gr||"");
          params.set("level",currentExam.level||lv||"");
          params.set("examType",currentExam.examType||"");
          if(currentExam.teacher)params.set("teacher",currentExam.teacher);
          if(currentExam.examDate)params.set("date",currentExam.examDate);
        }
        const rr=await fetch(`${SHEETS_URL}?action=view_answer_key&${params.toString()}`);
        const dd=await rr.json();
        if(dd.result==="ok"){
          effAKey=normalizeAnswerData(dd.answers||{});
          effTKey=dd.types?normalizeAnswerData(dd.types):tKey;
          setAKey(effAKey);setTKey(effTKey);
          // ★ v23.8: 오답분석 데이터 받기 (정오표 펼침에서 사용)
          if(dd.explanations)setExplanations(dd.explanations);
          if(dd.categories)setCategories(dd.categories);
        }
      }catch(_e){/* 네트워크 실패 시 기존 aKey 사용 — 채점 자체는 진행 */}
    }
    const initial=effAKey?grade(ans,effAKey,effTKey,qc):null;setRes(initial);
    const ansSerialized=ans.map(v=>Array.isArray(v)?v.join(","):v);
    try{
      await fetch(SHEETS_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"student_answer",
          name:nm,phone:ph,className:cn,subject:sub,grade:gr,level:lv,examName:et,date:ds,
          // ★ v23.10: teacher + folderId 명시 전송 — class_grades 선생님 매핑 정확도 개선
          teacher: (currentExam && currentExam.teacher) || selTeacher || "",
          folderId: (currentExam && currentExam.folderId) || "",
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
      // ★ v23.6: 주관식 채점도 재조회된 effAKey 사용 (setAKey 는 비동기라 state 미반영 가능)
      if(subjPending.length>0&&effAKey){
        setGradingSub(true);
        setGradingProgress({done:0,total:subjPending.length});
        const items=subjPending.map(d=>({
          q:d.q,
          studentAnswer:String(ans[d.q-1]||""),
          correctAnswer:String(effAKey[String(d.q)]??effAKey[d.q-1]??""),
          questionContext:""
        }));
        // ★ v22.7: studentName + gradingMode 전달 (loose=해석/번역, strict=단답형)
        const batchRes=await gradeSubjectiveBatch(items, nm, gradingMode);
        const batchResults=batchRes.results||[];
        const overallComment=batchRes.overallComment||"";
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
          // ★ v22.3: 100점 만점 분리 점수 재계산
          const subWeight=prev.subWeight||1.0;
          const totalPossible=prev.totalObj+prev.totalSub*subWeight;
          const objMax=totalPossible>0?Math.round((prev.totalObj/totalPossible)*100):0;
          const subMax=totalPossible>0?(100-objMax):0;
          const newObjEarned=prev.totalObj>0?Math.round((newOc/prev.totalObj)*objMax):0;
          const newSubEarned=prev.totalSub>0?Math.round((subjScoreSum/prev.totalSub)*subMax):0;
          const newScore=newObjEarned+newSubEarned;
          const newSubPending=updatedDet.filter(d=>d.t==="sub"&&d.r==="채점중").length;
          const newSubCorrect=updatedDet.filter(d=>d.t==="sub"&&d.r==="정답").length;
          return{
            ...prev,det:updatedDet,subPartial:subPartialNew,score:newScore,
            subPending:newSubPending,subCorrect:newSubCorrect,
            objMaxScore:objMax,subMaxScore:subMax,
            objEarned:newObjEarned,subEarned:newSubEarned,
            // ★ v22.4: 학생 총평 (이름 + 강점/약점 1~2줄)
            overallComment:overallComment
          };
        });
        setGradingSub(false);
        // ★ v22.3: 최종 점수도 100점 만점 분리 계산
        const subWeight=initial.subWeight||1.0;
        const totalPossibleFinal=initial.totalObj+initial.totalSub*subWeight;
        const objMaxF=totalPossibleFinal>0?Math.round((initial.totalObj/totalPossibleFinal)*100):0;
        const subMaxF=totalPossibleFinal>0?(100-objMaxF):0;
        const objEarnedF=initial.totalObj>0?Math.round((initial.oc/initial.totalObj)*objMaxF):0;
        const subEarnedF=initial.totalSub>0?Math.round((subjScoreSum/initial.totalSub)*subMaxF):0;
        const finalScore=objEarnedF+subEarnedF;
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
  // ============================================================
  // ★ v23.9: 미니 보강 시험 핸들러
  // ============================================================
  // 미니 시험 목록 조회 (학생 본인 추천만)
  const hLoadMiniExams=async()=>{
    if(!nm.trim()||!ph)return;
    setLoadingMini(true);
    try{
      const params=new URLSearchParams({action:"list_mini_exam_progress",student:nm.trim(),phone:ph});
      const r=await fetch(`${SHEETS_URL}?${params.toString()}`);
      const d=await r.json();
      if(d.result==="ok"){
        // ★ v23.17 (2026-05-14) 🚨 핵심 픽스 — GAS 가 items 로 반환하는데 학생앱이 exams 로 읽어서 항상 빈 배열
        //   → items 우선, exams 폴백 (구버전 호환)
        const list = d.items || d.exams || [];
        // pending/in_progress 만 (완료된 시험은 숨김)
        const active = list.filter(e=>e.status!=="완료"&&e.status!=="마감초과");
        setMiniExams(active);
      }
    }catch(_e){/* 조용히 실패 */}
    setLoadingMini(false);
  };
  // 미니 시험 시작 (시험 1개 클릭)
  const hStartMini=(ex)=>{
    setMiniCurrent(ex);
    const qs=Array.isArray(ex.questions)?ex.questions:[];
    setMiniAnswers(Array(qs.length).fill(null));
    setMiniTimeLeft(300);  // 5분 = 300초
    setMiniResult(null);
    setScr("miniexam");
  };
  // 미니 시험 답안 변경
  const hMiniAns=(idx,val)=>{
    setMiniAnswers(p=>{const n=[...p];n[idx]=val;return n;});
  };
  // 미니 시험 제출 (자동 채점 + GAS 전송)
  const hMiniSubmit=async(autoSubmit=false)=>{
    if(!miniCurrent)return;
    const qs=miniCurrent.questions||[];
    const unanswered=miniAnswers.filter(a=>a===null||a===undefined||a==="").length;
    if(!autoSubmit&&unanswered>0){
      if(!window.confirm(`아직 ${unanswered}문항을 풀지 않았어요. 그래도 제출할까요?`))return;
    }
    setMiniSending(true);
    // 클라이언트 즉시 채점
    let correct=0;
    const details=qs.map((q,i)=>{
      const my=miniAnswers[i];
      const ans=q.answer;
      const isObj=q.type==="multiple_choice"||q.type==="객관식"||q.type==="obj";
      let r="오답";
      if(my===null||my===undefined||my==="")r="미입력";
      else if(isObj){
        if(String(my)===String(ans))r="정답";
      }else{
        const norm=(s)=>String(s||"").trim().toLowerCase().replace(/\s+/g,"");
        if(norm(my)===norm(ans))r="정답";
      }
      if(r==="정답")correct++;
      return{q:q.number||(i+1),stage:q.stage||"",t:isObj?"obj":"sub",s:my,c:ans,r,explanation:q.explanation||"",choiceExplanations:q.choiceExplanations||null};
    });
    const score=qs.length>0?Math.round((correct/qs.length)*100):0;
    const result={score,correct,total:qs.length,details};
    setMiniResult(result);
    // GAS 전송
    try{
      await fetch(SHEETS_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"submit_mini_exam_result",
          miniExamId:miniCurrent.id,
          student:nm.trim(),
          phone:ph,
          score,
          correct,
          total:qs.length,
          answers:miniAnswers,
          details:details.map(d=>({q:d.q,stage:d.stage,r:d.r,s:d.s})),
          autoSubmit:autoSubmit?1:0
        })});
    }catch(_e){/* 조용히 실패 */}
    setMiniSending(false);
  };
  // 미니 시험 카운트다운 (300초 → 0)
  useEffect(()=>{
    if(scr!=="miniexam"||!miniCurrent||miniResult)return;
    if(miniTimeLeft<=0){
      // 시간 초과 — 자동 제출
      hMiniSubmit(true);
      return;
    }
    const t=setTimeout(()=>setMiniTimeLeft(p=>p-1),1000);
    return ()=>clearTimeout(t);
  },[scr,miniTimeLeft,miniCurrent,miniResult]);
  // ★ v23.14 (2026-05-13): 결과 화면 진입 시 학생 히스토리 로드 (트렌드 차트용)
  // ★ v23.16 (2026-05-13): get_student_stats_fast 캐시 우선 (10초 → 0.5초), 미스 시 student_history 폴백
  useEffect(()=>{
    if(scr!=="result"||!nm||!ph)return;
    if(trendHistory!==null)return;
    (async()=>{
      try {
        // 1) 캐시 먼저 (트렌드 + 카테고리 통계 즉시 조회)
        const fastR = await fetch(`${SHEETS_URL}?action=get_student_stats_fast&name=${encodeURIComponent(nm.trim())}&phone=${encodeURIComponent(ph)}`);
        const fastD = await fastR.json();
        if (fastD.result === "ok" && fastD.student && fastD.student.recentScores && fastD.student.recentScores.length > 0) {
          setTrendHistory(fastD.student.recentScores);
          return;
        }
        // 2) 캐시 미스 → 기존 student_history 폴백
        const r = await fetch(`${SHEETS_URL}?action=student_history&name=${encodeURIComponent(nm.trim())}&phone=${encodeURIComponent(ph)}`);
        const d = await r.json();
        if(d.result==="ok"){
          const records = (d.records||[]).filter(r=>r.score!==null).slice(0,5).reverse();
          setTrendHistory(records);
        } else {
          setTrendHistory([]);
        }
      } catch(_e) { setTrendHistory([]); }
    })();
  },[scr,nm,ph,trendHistory]);
  // 결과 화면 진입 시 — 채점 완료되면 자동으로 recommend_mini_exam 호출
  useEffect(()=>{
    // 결과 화면이 아니거나, 주관식 채점 중이거나, currentExam 없으면 skip
    if(scr!=="result"||gradingSub||!currentExam||!res||!nm||!ph)return;
    // 이미 추천 요청을 보냈으면 skip (재호출 방지)
    if(recommendingMini||recommendedNew>0)return;
    // 점수가 80점 이상이면 추천 안 함 (약점 영역 없음)
    if(res.score>=80){
      // 그래도 기존 추천 시험은 로드 (이전에 받은 것 표시)
      hLoadMiniExams();
      return;
    }
    let cancelled=false;
    (async()=>{
      setRecommendingMini(true);
      try{
        // GAS recommend_mini_exam 호출 — 약점 영역 분석 + 미니 시험 큐 등록
        const body={
          action:"recommend_mini_exam",
          student:nm.trim(),
          phone:ph,
          subject:currentExam.subject||sub||"",
          grade:currentExam.grade||gr||"",
          level:currentExam.level||lv||"",
          examType:currentExam.examType||"",
          folderId:currentExam.folderId||"",
          score:res.score,
          totalObj:res.totalObj,
          oc:res.oc,
          totalSub:res.totalSub,
          subCorrect:res.subCorrect||0,
          wrongQuestions:res.det.filter(d=>d.r==="오답"||d.r==="부분정답").map(d=>d.q),
          teacher:currentExam.teacher||""
        };
        // ★ v23.17 (2026-05-14): mode:"no-cors" + application/json 조합은 CORS preflight 차단 → 요청 실패
        //   → text/plain 으로 변경 (preflight 안 발생) + 응답도 받아 결과 확인
        const rsp = await fetch(SHEETS_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)});
        let rspJson = null;
        try { rspJson = await rsp.json(); } catch(_eRJ){}
        // 응답에서 generated 길이로 즉시 알 수 있음
        const justGenerated = rspJson && Array.isArray(rspJson.generated) ? rspJson.generated.filter(g=>!g.error).length : 0;
        if(!cancelled){
          // Vercel API 가 5문항 생성 후 시트 등록까지 거의 즉시 — 1.5초 후 목록 재조회
          setTimeout(()=>{if(!cancelled){setRecommendedNew(justGenerated||1);hLoadMiniExams();}},1500);
        }
      }catch(_e){/* 조용히 실패 */}
      if(!cancelled)setRecommendingMini(false);
    })();
    return ()=>{cancelled=true;};
  },[scr,gradingSub,res?.score,currentExam?.folderId]);
  // 홈 화면(info, submit 탭) 진입 시 미니 시험 목록 로드
  useEffect(()=>{
    if(scr==="info"&&tab==="submit"&&nm.trim()&&ph){
      hLoadMiniExams();
    }
  },[scr,tab,nm,ph]);
  // 수학 기호 키보드 — 텍스트 삽입
  const hInsertSymbol=(sym)=>{
    // 1) 미니 시험에 포커스가 있으면 미니 시험 입력 갱신
    if(focusedMiniIdx!==null){
      hMiniAns(focusedMiniIdx,(miniAnswers[focusedMiniIdx]||"")+sym);
      return;
    }
    // 2) 일반 시험 주관식 (단일/다중 빈칸) 갱신
    if(focusedSubIdx!==null){
      const cur=ans[focusedSubIdx];
      if(focusedSubBlankIdx!==null){
        const curStr=typeof cur==="string"?cur:"";
        const parts=curStr.split("|");
        while(parts.length<=focusedSubBlankIdx)parts.push("");
        parts[focusedSubBlankIdx]=(parts[focusedSubBlankIdx]||"")+sym;
        hSub(focusedSubIdx,parts.join("|"));
      }else{
        hSub(focusedSubIdx,(typeof cur==="string"?cur:"")+sym);
      }
    }
  };
  const hReset=()=>{setAns(Array(qc).fill(null));setRes(null);setWo(false);setSendOk(null);setScr("info");setSec(0);setNm("");setSub("");setGr("");setLv("");setEt("");setSelTeacher("");setAKey(null);setTKey(null);setQNumMap(null);setALoad(false);setANF(false);setTq(100);setCq("");setPd(todayIso());setTodayExams(null);setGradingSub(false);setGradingProgress({done:0,total:0});setGradingMode("strict");setCurrentExam(null);setRefreshing(false);setExplanations(null);setCategories(null);setExpandedRows({});setMiniCurrent(null);setMiniAnswers([]);setMiniResult(null);setMiniTimeLeft(300);setRecommendedNew(0);setFocusedSubIdx(null);setFocusedSubBlankIdx(null);setFocusedMiniIdx(null);};
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
        {/* ★ v23.9: 보강 시험 배지 — 학생 본인 추천 시험이 있으면 상단에 표시 */}
        {miniExams.length>0&&(
          <div style={{marginBottom:14,padding:"14px 16px",borderRadius:14,background:`linear-gradient(135deg,#FFF3E0,#FFE0B2)`,border:`2px solid #FB8C00`,boxShadow:"0 2px 8px rgba(251,140,0,0.2)",cursor:"pointer"}}
               onClick={()=>{const first=miniExams[0];if(first)hStartMini(first);}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:"#E65100",marginBottom:3}}>📚 추천 보강 시험 {miniExams.length}개</div>
                <div style={{fontSize:11,color:"#5D4037",lineHeight:1.5}}>
                  지난 시험에서 약한 부분을 5분 만에 채우세요!<br/>
                  {miniExams[0]?.subject||""} · {miniExams[0]?.weakArea||""} {miniExams[0]?.weakPct?`(${miniExams[0].weakPct}%)`:""}
                </div>
              </div>
              <div style={{fontSize:28,color:"#E65100",fontWeight:800}}>›</div>
            </div>
          </div>
        )}
        {recommendingMini&&(
          <div style={{marginBottom:14,padding:"10px 14px",borderRadius:10,background:T.accentLight,border:`1px solid ${T.accent}`,fontSize:12,color:T.accent,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:14,height:14,border:`2px solid ${T.borderLight}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            보강 시험 준비 중... (잠시 후 위에 표시돼요)
          </div>
        )}
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
                {/* ★ v23.10: 피드백 펼침 기능 + 날짜 강조 */}
                {history.map((h,i)=>(<HistoryCard key={i} h={h} idx={i} nm={nm} ph={ph} sheetsUrl={SHEETS_URL} T={T}/>))}
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
                  {nBlanks===1?(<input style={S.sInp} placeholder="답을 입력하세요" value={subStr} onChange={e=>hSub(qi,e.target.value)} onFocus={()=>{setFocusedSubIdx(qi);setFocusedSubBlankIdx(null);}} onBlur={()=>setTimeout(()=>setFocusedSubIdx(p=>p===qi?null:p),200)}/>):null}
                </div>
                ):(<><div style={S.cR}>{CV.map((v,ci)=>{const p=selArr.includes(v);return(<button key={v} onClick={()=>hAns(qi,v)} style={{...S.cBtn,background:p?T.goldDark:T.white,color:p?T.white:T.text,borderColor:p?T.goldDark:T.border,fontWeight:p?700:400,transform:p?"scale(1.06)":"scale(1)",boxShadow:p?`0 2px 8px ${T.goldMuted}`:"none"}}>{CL[ci]}</button>);})}</div>
                  <div style={{...S.sB,background:fi?(multi?T.accentLight:T.goldLight):T.borderLight,color:fi?(multi?T.accent:T.goldDeep):T.textMuted,fontWeight:multi?700:600}}>{fi?vl(sel):"–"}</div></>)}
              </div>
              {isSub&&nBlanks>1&&(<div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6,paddingLeft:36}}>
                {Array.from({length:nBlanks},(_,k)=>(<div key={k} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:T.accent,minWidth:22,textAlign:"center"}}>({k+1})</span>
                  <input style={{...S.sInp,flex:1}} placeholder={`${k+1}번째 답`} value={subParts[k]||""} onChange={e=>updateBlank(k,e.target.value)} onFocus={()=>{setFocusedSubIdx(qi);setFocusedSubBlankIdx(k);}} onBlur={()=>setTimeout(()=>{setFocusedSubBlankIdx(p=>p===k?null:p);setFocusedSubIdx(p=>p===qi?null:p);},200)}/>
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
            <div style={{fontSize:12,opacity:.7,marginBottom:4}}>전체 {res.totalQ}문항 중 {res.oc+res.subCorrect}개 정답 · {res.ow}개 오답 · {res.totalQ-(res.to+res.sc)}개 미입력{res.subPending>0?` · ⏳ ${res.subPending}문항 채점중`:""}</div>
            {/* ★ v22.3: 100점 만점 명시 + 가중치 안내 */}
            <div style={{fontSize:11,opacity:.65,marginBottom:0}}>📌 100점 만점{res.isMixed?` (객관식 ${res.objMaxScore}점 + 주관식 ${res.subMaxScore}점, 주관식 1.5배 가중치)`:""}</div>
            {/* ★ v22.4: "오답을 복습하세요!" 제거 — 총평으로 대체 */}
          </div>
          {/* ★ v23.17: "정답 새로고침" 버튼 제거 — 사용자 요청 (가시성 떨어지고 자동 갱신 useEffect 가 이미 동작) */}
          {gradingSub&&<div style={{padding:"12px 14px",borderRadius:10,marginBottom:14,background:`linear-gradient(90deg,${T.accentLight},${T.goldLight})`,border:`1.5px solid ${T.accent}`,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:24,height:24,border:`2.5px solid ${T.borderLight}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:T.accent}}>📝 주관식 채점 중...</div>
              <div style={{fontSize:11,color:T.textSub,marginTop:2}}>{gradingProgress.total}개 주관식을 한 번에 채점하고 있어요 (3~8초 소요)</div>
            </div>
          </div>}
          {/* ★ v22.4: "결과가 선생님에게 전송되었습니다" → 학생 총평 (이름 + 강점/약점) */}
          {res.overallComment&&!gradingSub&&(
            <div style={{padding:"14px 16px",borderRadius:12,marginBottom:14,background:`linear-gradient(135deg,${T.goldPale},${T.goldLight})`,border:`1.5px solid ${T.goldMuted}`}}>
              <div style={{fontSize:11,fontWeight:700,color:T.goldDark,marginBottom:6}}>💬 채움학원 선생님이 학생에게</div>
              <div style={{fontSize:13,fontWeight:600,color:T.goldDeep,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{res.overallComment}</div>
            </div>
          )}
          {sendOk===false&&<div style={{padding:"8px 14px",borderRadius:10,marginBottom:14,fontSize:12,fontWeight:600,textAlign:"center",background:T.dangerLight,color:T.danger}}>⚠️ 결과 전송 실패</div>}
          <div style={S.stRow}><SC i="✅" l="정답" v={res.oc+res.subCorrect} c={T.accent}/><SC i="❌" l="오답" v={res.ow} c={T.danger}/><SC i="📝" l="전체" v={res.totalQ} c={T.textSub}/><SC i="📊" l="점수" v={`${res.score}점`} c={T.goldDark}/></div>
          {/* ★ v22.3: 객관식/주관식 분리 통계 카드 (혼합 시험만) */}
          {res.isMixed&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              <div style={{background:T.white,border:`1.5px solid ${T.goldMuted}`,borderRadius:12,padding:"12px 10px"}}>
                <div style={{fontSize:11,color:T.textMuted,fontWeight:600,marginBottom:4}}>✏️ 객관식</div>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>{res.totalObj}문항 중 {res.oc}개 정답</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:22,fontWeight:800,color:T.goldDark}}>{res.objEarned}</span>
                  <span style={{fontSize:12,color:T.textMuted}}>/ {res.objMaxScore}점</span>
                </div>
              </div>
              <div style={{background:T.white,border:`1.5px solid ${T.accent}50`,borderRadius:12,padding:"12px 10px"}}>
                <div style={{fontSize:11,color:T.textMuted,fontWeight:600,marginBottom:4}}>📝 주관식</div>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>{res.totalSub}문항 중 {res.subCorrect}개 정답{res.subPartial>res.subCorrect?` (부분점수 ${(res.subPartial-res.subCorrect).toFixed(1)})`:""}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:22,fontWeight:800,color:T.accent}}>{res.subEarned}</span>
                  <span style={{fontSize:12,color:T.textMuted}}>/ {res.subMaxScore}점</span>
                  {res.subPending>0&&<span style={{fontSize:10,color:"#E65100",marginLeft:4}}>⏳ {res.subPending}개 채점중</span>}
                </div>
              </div>
            </div>
          )}
          {(res.totalQ-(res.to+res.sc))>0&&<div style={{padding:"8px 14px",borderRadius:10,marginBottom:10,fontSize:12,fontWeight:600,textAlign:"center",background:"#FFF3E0",color:"#E65100"}}>미입력 {res.totalQ-(res.to+res.sc)}문항은 0점 처리됩니다.</div>}
          {/* ★ v23.8: 분석 리포트 (방식 5) — 점수 카드 아래 추가 */}
          {/* ★ v23.11: 카테고리 데이터 있으면 문법/어휘/독해 등 영역별 분석 우선 표시 */}
          {res.det && res.det.length > 0 && (() => {
            const correctObj = res.oc;
            const correctSub = res.subCorrect || 0;
            const wrongObj = res.ow;
            const partialSub = (res.subPartial||0) - correctSub;
            const wrongSub = res.totalSub - correctSub - Math.max(0, partialSub);
            const objPct = res.totalObj > 0 ? Math.round((correctObj / res.totalObj) * 100) : 0;
            const subPct = res.totalSub > 0 ? Math.round((correctSub / res.totalSub) * 100) : 0;
            // ★ v23.11: categories 가 있으면 영역별 정답률 계산
            // ★ v23.17 (2026-05-14): 숫자만 있는 카테고리("1","2","-1") 는 의미 없으므로 무시 — 객관식/주관식 폴백
            const isBadCat = (cat) => {
              if (!cat) return true;
              const s = String(cat).trim();
              if (s === "" || s === "null" || s === "undefined") return true;
              // 단순 숫자나 음수 ("1", "-1", "12") → 의미 없는 라벨로 간주
              if (/^-?\d+$/.test(s)) return true;
              return false;
            };
            const catStats = {};
            let allBadCats = false;
            if (categories && typeof categories === "object") {
              const rawCats = res.det.map(d => categories[String(d.q)] || categories[d.q]).filter(c => c);
              const goodCats = rawCats.filter(c => !isBadCat(c));
              allBadCats = rawCats.length > 0 && goodCats.length === 0;  // 전부 잘못된 라벨
              if (!allBadCats) {
                res.det.forEach(d => {
                  const cat = categories[String(d.q)] || categories[d.q];
                  if (!cat || isBadCat(cat)) return;
                  if (!catStats[cat]) catStats[cat] = {total: 0, correct: 0};
                  catStats[cat].total++;
                  if (d.r === "정답") catStats[cat].correct++;
                  else if (d.r === "부분정답") catStats[cat].correct += 0.5;
                });
              }
            }
            const catList = Object.keys(catStats).map(c => {
              const s = catStats[c];
              return {
                name: c,
                total: s.total,
                correct: s.correct,
                pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
              };
            }).sort((a,b) => a.pct - b.pct);  // 약한 순서대로
            const hasCat = catList.length > 0;
            // 약점 영역 판단 (80% 미만)
            const weakAreas = [];
            if (hasCat) {
              catList.filter(c => c.pct < 80).forEach(c => weakAreas.push({name: c.name, pct: c.pct, color: T.goldDark}));
            } else {
              if (res.totalObj > 0 && objPct < 80) weakAreas.push({name: "객관식", pct: objPct, color: T.goldDark});
              if (res.totalSub > 0 && subPct < 80) weakAreas.push({name: "주관식", pct: subPct, color: T.accent});
            }
            // 카테고리별 색깔 (이쁘게)
            const catColors = ["#1976D2", "#388E3C", "#7B1FA2", "#F57C00", "#C62828", "#00838F", "#5D4037"];
            // ★ v23.14 (2026-05-13): 레이더 차트 SVG 생성 헬퍼
            const renderRadar = () => {
              if (!hasCat || catList.length < 3) {
                return <div style={{padding:"20px",textAlign:"center",fontSize:12,color:T.textMuted}}>레이더 차트는 영역 3개 이상부터 표시돼요.<br/>(현재 영역: {catList.length}개)</div>;
              }
              const size = 240, cx = size/2, cy = size/2, maxR = 90;
              const n = catList.length;
              const angle = (i) => (Math.PI*2*i/n) - Math.PI/2;
              const pt = (i, r) => [cx + Math.cos(angle(i))*r, cy + Math.sin(angle(i))*r];
              // 100% 격자 (10단계)
              const grids = [20, 40, 60, 80, 100].map(p => {
                const points = catList.map((_, i) => pt(i, maxR*p/100).join(",")).join(" ");
                return <polygon key={p} points={points} fill="none" stroke={T.borderLight} strokeWidth="0.5"/>;
              });
              const axes = catList.map((_, i) => {
                const [x2,y2] = pt(i, maxR);
                return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke={T.borderLight} strokeWidth="0.5"/>;
              });
              const scoreShape = catList.map((c, i) => pt(i, maxR*c.pct/100).join(",")).join(" ");
              const labels = catList.map((c, i) => {
                const [lx, ly] = pt(i, maxR + 22);
                return (
                  <g key={i}>
                    <text x={lx} y={ly} fontSize="11" fontWeight="700" fill={catColors[i % catColors.length]} textAnchor="middle" dominantBaseline="middle">
                      {c.name}
                    </text>
                    <text x={lx} y={ly+12} fontSize="9" fill={T.textMuted} textAnchor="middle">{c.pct}%</text>
                  </g>
                );
              });
              return (
                <svg width="100%" height={size+10} viewBox={`0 0 ${size} ${size+10}`} style={{maxWidth:280, margin:"0 auto", display:"block"}}>
                  {grids}
                  {axes}
                  <polygon points={scoreShape} fill={T.goldLight} fillOpacity="0.6" stroke={T.goldDark} strokeWidth="2"/>
                  {catList.map((c, i) => {
                    const [px, py] = pt(i, maxR*c.pct/100);
                    return <circle key={i} cx={px} cy={py} r="4" fill={catColors[i % catColors.length]}/>;
                  })}
                  {labels}
                </svg>
              );
            };
            // ★ v23.14: 트렌드 차트 SVG (최근 시험 점수 변화)
            const renderTrend = () => {
              if (!trendHistory || trendHistory.length === 0) {
                return <div style={{padding:"20px",textAlign:"center",fontSize:12,color:T.textMuted}}>시험 기록이 없어요. (최소 2회 이상 응시 후 추세 확인)</div>;
              }
              const history = [...trendHistory];
              // 현재 시험 추가
              if (res && res.score !== undefined && res.score !== null) {
                history.push({date: ds, score: res.score, current: true});
              }
              if (history.length < 2) {
                return <div style={{padding:"20px",textAlign:"center",fontSize:12,color:T.textMuted}}>추세를 보려면 최소 2회 시험이 필요해요.<br/>(현재 {history.length}회)</div>;
              }
              const w = 280, h = 160, pad = 30;
              const xStep = (w - 2*pad) / Math.max(1, history.length - 1);
              const points = history.map((r, i) => ({
                x: pad + xStep*i,
                y: h - pad - (h - 2*pad) * (Number(r.score)||0) / 100,
                score: Number(r.score) || 0,
                date: r.date,
                current: r.current
              }));
              const linePath = points.map((p, i) => (i===0?"M":"L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
              return (
                <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{maxWidth:300, margin:"0 auto", display:"block"}}>
                  {/* Y축 그리드 */}
                  {[0,25,50,75,100].map(p => {
                    const y = h - pad - (h - 2*pad) * p / 100;
                    return (
                      <g key={p}>
                        <line x1={pad} y1={y} x2={w-pad} y2={y} stroke={T.borderLight} strokeWidth="0.5"/>
                        <text x={pad-5} y={y+3} fontSize="9" fill={T.textMuted} textAnchor="end">{p}</text>
                      </g>
                    );
                  })}
                  {/* 라인 */}
                  <path d={linePath} fill="none" stroke={T.goldDark} strokeWidth="2.5"/>
                  {/* 점 */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={p.current?6:4} fill={p.score>=90?T.accent:p.score>=70?T.goldDark:T.danger} stroke={p.current?T.white:"none"} strokeWidth={p.current?2:0}/>
                      <text x={p.x} y={p.y-10} fontSize="10" fontWeight="700" fill={T.text} textAnchor="middle">{p.score}</text>
                      <text x={p.x} y={h-10} fontSize="8" fill={T.textMuted} textAnchor="middle">{String(p.date||"").slice(5,10)}</text>
                    </g>
                  ))}
                </svg>
              );
            };
            return (
              <div style={{...S.card, marginBottom: 12}}>
                <h3 style={{fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10}}>
                  📊 시험 분석
                </h3>
                {/* ★ v23.14: 차트 탭 (레이더 / 트렌드 / 막대) */}
                <div style={{display:"flex",gap:4,marginBottom:10,background:T.bg,borderRadius:8,padding:3}}>
                  <button onClick={()=>setChartTab("radar")} style={{flex:1,padding:"6px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",background:chartTab==="radar"?T.goldDark:"transparent",color:chartTab==="radar"?T.white:T.textSub}}>🕸️ 영역</button>
                  <button onClick={()=>setChartTab("trend")} style={{flex:1,padding:"6px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",background:chartTab==="trend"?T.goldDark:"transparent",color:chartTab==="trend"?T.white:T.textSub}}>📈 추세</button>
                  <button onClick={()=>setChartTab("bar")} style={{flex:1,padding:"6px 10px",fontSize:11,fontWeight:700,borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",background:chartTab==="bar"?T.goldDark:"transparent",color:chartTab==="bar"?T.white:T.textSub}}>📋 막대</button>
                </div>
                {/* 선택된 차트 */}
                {chartTab==="radar" && renderRadar()}
                {chartTab==="trend" && renderTrend()}
                {chartTab==="bar" && hasCat && catList.map((c, ci) => {
                  const barColor = c.pct >= 80 ? T.accent : c.pct >= 60 ? T.goldDark : T.danger;
                  const labelColor = catColors[ci % catColors.length];
                  return (
                    <div key={ci} style={{marginBottom: 8}}>
                      <div style={{display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: T.textSub}}>
                        <span style={{color: labelColor, fontWeight: 700}}>📚 {c.name} ({c.correct}/{c.total})</span>
                        <span style={{fontWeight: 700, color: barColor}}>{c.pct}%</span>
                      </div>
                      <div style={{height: 10, background: T.borderLight, borderRadius: 5, overflow: "hidden"}}>
                        <div style={{height: "100%", width: `${c.pct}%`, background: `linear-gradient(90deg, ${labelColor}, ${barColor})`, transition: "width 0.5s"}}/>
                      </div>
                    </div>
                  );
                })}
                {chartTab==="bar" && !hasCat && <div style={{padding:"12px",textAlign:"center",fontSize:11,color:T.textMuted}}>영역 분석 데이터가 아직 없어요. 시험 등록 후 1~2분 안에 표시됩니다.</div>}
                <div style={{height: 1, background: T.borderLight, margin: "8px 0"}}/>
                {/* 객관식/주관식 막대 (카테고리 있어도 보조 정보로 표시) */}
                {res.totalObj > 0 && (
                  <div style={{marginBottom: 8}}>
                    <div style={{display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: T.textSub}}>
                      <span>✏️ 객관식 ({correctObj}/{res.totalObj})</span>
                      <span style={{fontWeight: 700, color: objPct >= 80 ? T.accent : objPct >= 60 ? T.goldDark : T.danger}}>{objPct}%</span>
                    </div>
                    <div style={{height: 8, background: T.borderLight, borderRadius: 4, overflow: "hidden"}}>
                      <div style={{height: "100%", width: `${objPct}%`, background: objPct >= 80 ? T.accent : objPct >= 60 ? T.goldDark : T.danger, transition: "width 0.5s"}}/>
                    </div>
                  </div>
                )}
                {res.totalSub > 0 && (
                  <div style={{marginBottom: 8}}>
                    <div style={{display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: T.textSub}}>
                      <span>📝 주관식 ({correctSub}/{res.totalSub}){res.subPending > 0 ? ` (⏳ ${res.subPending}개 채점중)` : ""}</span>
                      <span style={{fontWeight: 700, color: subPct >= 80 ? T.accent : subPct >= 60 ? T.goldDark : T.danger}}>{subPct}%</span>
                    </div>
                    <div style={{height: 8, background: T.borderLight, borderRadius: 4, overflow: "hidden"}}>
                      <div style={{height: "100%", width: `${subPct}%`, background: subPct >= 80 ? T.accent : subPct >= 60 ? T.goldDark : T.danger, transition: "width 0.5s"}}/>
                    </div>
                  </div>
                )}
                {/* 약점 안내 */}
                {weakAreas.length > 0 && (
                  <div style={{marginTop: 10, padding: "8px 10px", background: "#FFF8E1", border: `1px solid #FFE082`, borderRadius: 8, fontSize: 11, color: "#5D4037", lineHeight: 1.5}}>
                    <strong style={{color: "#E65100"}}>💡 보강 필요 영역:</strong> {weakAreas.map(w => `${w.name} ${w.pct}%`).join(" · ")}<br/>
                    <span style={{fontSize: 10, color: "#8D6E63"}}>아래 정오표에서 틀린 문제 클릭하면 자세한 분석을 볼 수 있어요!</span>
                    {/* ★ v23.13 (2026-05-13): 보강 시험 바로 풀기 큰 버튼 (사용자 요청) */}
                    {recommendingMini && (
                      <div style={{marginTop:8,padding:"10px 12px",background:"#FFE0B2",borderRadius:8,fontSize:12,color:"#E65100",fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:16,height:16,border:`2px solid #FFFFFF80`,borderTopColor:"#E65100",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                        📚 약점 보강 시험 준비 중... (15초 후 아래 버튼 등장)
                      </div>
                    )}
                    {miniExams.length > 0 && (
                      <button onClick={()=>{
                        const first = miniExams[0];
                        if (first) hStartMini(first);
                      }} style={{marginTop:10,width:"100%",padding:"14px 16px",fontSize:14,fontWeight:800,color:T.white,background:`linear-gradient(135deg,#FB8C00,#E65100)`,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px rgba(251,140,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                        📚 보강 시험 {miniExams.length}개 — 바로 풀기 (5분)
                      </button>
                    )}
                  </div>
                )}
                {res.overallComment && weakAreas.length === 0 && correctObj + correctSub === res.totalQ && (
                  <div style={{marginTop: 10, padding: "8px 10px", background: T.accentLight, borderRadius: 8, fontSize: 11, color: T.accent, fontWeight: 600, textAlign: "center"}}>
                    🎉 완벽해요! 모든 영역에서 만점이에요.
                  </div>
                )}
              </div>
            );
          })()}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontSize:15,fontWeight:700,color:T.text}}>정오표</h3>
              <button onClick={()=>setWo(!wo)} style={{padding:"5px 12px",fontSize:12,fontWeight:600,border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",background:wo?T.dangerLight:T.borderLight,color:wo?T.danger:T.textSub}}>{wo?"❌ 오답만":"전체 보기"}</button></div>
            <div style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={S.tH}><span style={{flex:"0 0 36px",textAlign:"center"}}>#</span><span style={{flex:"0 0 36px",textAlign:"center"}}>유형</span><span style={{flex:1,textAlign:"center"}}>내 답</span><span style={{flex:1,textAlign:"center"}}>정답</span><span style={{flex:"0 0 60px",textAlign:"center"}}>결과</span></div>
              {res.det.filter(d=>wo?d.r==="오답"||d.r==="부분정답":true).map(d=>{
                // ★ v23.8: 객관식 오답에만 펼침 기능 (choiceExplanations 있을 때)
                // ★ v23.11: explanations 없어도 클릭 시 즉시 Gemini 풀이 생성 (옛 시험 대응)
                const qExpl = explanations && explanations[String(d.q)];
                const hasExpl = qExpl && (qExpl.explanation || qExpl.choiceExplanations);
                const canExpand = d.t === "obj" && d.r === "오답";  // ★ v23.11: explanations 없어도 펼침 가능
                const isExpanded = expandedRows[d.q];
                // ★ v23.15 (2026-05-13): CORS 우회 — Content-Type을 text/plain 으로 (preflight 안 발생)
                //   기존 application/json 은 GAS 가 CORS 응답 못해서 "Failed to fetch" 발생
                // ★ v23.34 (2026-05-14): AI 즉시 풀이 호출 제거 (GPT API 비용 + 활용도 낮음)
                //   기존 풀이 (사전 생성된 explanations) 만 있으면 펼침. 없으면 펼침 X.
                //   대안: 학생은 다음 수업에서 선생님 직접 보강
                const onClickRow = (canExpand && hasExpl) ? () => {
                  setExpandedRows(p => ({...p, [d.q]: !p[d.q]}));
                } : undefined;
                return (
                <div key={d.q} style={{...S.tR,background:d.r==="정답"?"#F1F8E9":d.r==="오답"?"#FFF5F5":d.r==="부분정답"?"#FFF8E1":T.goldPale,flexDirection:"column",alignItems:"stretch",cursor:canExpand?"pointer":"default"}}
                  onClick={onClickRow}>
                  <div style={{display:"flex",alignItems:"center",width:"100%"}}>
                    <span style={{flex:"0 0 36px",textAlign:"center",fontWeight:700,fontSize:qNumMap?10:12,color:T.textSub}}>{qNumMap?qNumMap[String(d.q)]||d.q:d.q}</span>
                    <span style={{flex:"0 0 36px",textAlign:"center",fontSize:10,fontWeight:700,color:d.t==="sub"?T.accent:T.goldDark}}>{d.t==="sub"?"주관":"객관"}</span>
                    <span style={{flex:1,textAlign:"center",fontWeight:600,fontSize:13,color:T.text,wordBreak:"break-word",padding:"0 4px"}}>{d.t==="sub"?(d.s||"–"):vl(d.s)}</span>
                    <span style={{flex:1,textAlign:"center",fontWeight:600,fontSize:13,color:T.goldDark,wordBreak:"break-word",padding:"0 4px"}}>{d.t==="sub"?(d.c||"–"):vl(d.c)}</span>
                    <span style={{flex:"0 0 60px",textAlign:"center",fontSize:14}}>{d.r==="정답"?"✅":d.r==="오답"?"❌":d.r==="부분정답"?<span style={{fontSize:11,fontWeight:700,color:"#B8860B"}}>{d.partial}</span>:"⏳"}</span>
                  </div>
                  {/* ★ v23.11: 풀이 데이터 없을 때 로딩 안내 */}
                  {canExpand && isExpanded && !hasExpl && loadingExpl && (
                    <div style={{padding:"10px 12px",marginTop:6,marginLeft:36,background:"#E3F2FD",border:`1px solid #1976D2`,borderRadius:8,fontSize:11,color:"#0D47A1",lineHeight:1.6,display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:14,height:14,border:`2px solid #BBDEFB`,borderTopColor:"#1976D2",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                      <span>AI 가 풀이를 만드는 중... (5~10초 소요)</span>
                    </div>
                  )}
                  {canExpand && isExpanded && !hasExpl && !loadingExpl && (
                    <div style={{padding:"8px 12px",marginTop:6,marginLeft:36,background:T.dangerLight,border:`1px solid ${T.danger}`,borderRadius:8,fontSize:11,color:T.danger,lineHeight:1.6}}>
                      풀이를 가져올 수 없어요. 다시 클릭해주세요.
                    </div>
                  )}
                  {/* ★ v23.8: 객관식 오답 펼침 — choiceExplanations 표시 (방식 1) */}
                  {canExpand && isExpanded && hasExpl && (
                    <div style={{padding:"10px 12px",marginTop:6,marginLeft:36,background:T.white,border:`1px solid ${T.borderLight}`,borderRadius:8,fontSize:11,color:T.text,lineHeight:1.6}}>
                      {qExpl.explanation && (
                        <div style={{marginBottom:8,padding:"6px 8px",background:"#E8F5E9",borderLeft:`3px solid ${T.accent}`,borderRadius:4}}>
                          <span style={{fontWeight:700,color:T.accent}}>💡 정답이 {d.c}인 이유: </span>
                          <span style={{color:T.text}}>{qExpl.explanation}</span>
                        </div>
                      )}
                      {qExpl.choiceExplanations && Object.keys(qExpl.choiceExplanations).length > 0 && (
                        <>
                          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,marginTop:6,marginBottom:4}}>📋 선택지별 분석</div>
                          {[1,2,3,4,5].map(n => {
                            const ce = qExpl.choiceExplanations[String(n)] || qExpl.choiceExplanations[n];
                            if (!ce) return null;
                            const isCorrect = String(d.c) === String(n);
                            const isStudent = String(d.s) === String(n);
                            const bg = isCorrect ? "#E8F5E9" : isStudent ? "#FFEBEE" : T.bg;
                            const bd = isCorrect ? T.accent : isStudent ? T.danger : T.border;
                            const tag = isCorrect ? "✅ 정답" : isStudent ? "❌ 내 답" : "";
                            return (
                              <div key={n} style={{padding:"5px 8px",marginBottom:3,background:bg,border:`1px solid ${bd}40`,borderRadius:4}}>
                                <span style={{fontWeight:700,color:isCorrect?T.accent:isStudent?T.danger:T.textSub}}>{["①","②","③","④","⑤"][n-1]} {tag && <span style={{fontSize:9,marginLeft:2}}>{tag}</span>}</span>
                                <div style={{marginTop:2,fontSize:10,color:T.textSub}}>{ce}</div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                  {canExpand && hasExpl && !isExpanded && (
                    <div style={{marginTop:3,marginLeft:36,fontSize:10,color:T.goldDark,fontWeight:600}}>
                      ▼ 클릭 — 풀이 보기
                    </div>
                  )}
                  {/* ★ v23.7: 오답·부분정답 주관식 — DiffView(수정가이드) + 문법팁, 채움Tip 제거 */}
                  {d.t==="sub"&&d.r!=="채점중"&&d.r!=="정답"&&(
                    <div style={{padding:"8px 12px",marginTop:4,marginLeft:72,background:T.white,border:`1px solid ${T.borderLight}`,borderRadius:8,fontSize:11,color:T.textSub,lineHeight:1.6}}>
                      <div style={{marginBottom:3}}><span style={{fontWeight:700,color:T.accent,marginRight:4}}>✓ 정답:</span><span style={{color:T.text,fontWeight:500}}>{d.c||"-"}</span></div>
                      <div style={{marginBottom:3}}>
                        <span style={{fontWeight:700,color:d.r==="오답"?T.danger:T.goldDark,marginRight:4}}>📝 학생답:</span>
                        {d.s?<DiffView correct={d.c||""} student={d.s||""} T={T}/>:<span style={{color:T.danger,fontStyle:"italic"}}>(빈칸)</span>}
                      </div>
                      {/* ★ v23.7: 문법팁 유지 (채움Tip 제거) — v23.10: "초록=추가/빨강=빼야 함" 안내 삭제 (중복 노이즈) */}
                      {d.gradeResult?.grammarTip&&(
                        <div style={{marginTop:6,padding:"6px 8px",background:"#E3F2FD",border:`1px solid #90CAF9`,borderRadius:6,fontSize:11,color:"#0D47A1",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                          <span style={{fontWeight:700}}>💡 문법 팁:</span> {d.gradeResult.grammarTip}
                        </div>
                      )}
                      {d.gradeResult?.blanks&&d.gradeResult.blanks.length>0&&(
                        <div style={{marginTop:6,fontSize:10,color:T.textMuted}}>
                          빈칸별: {d.gradeResult.blanks.map(b=>`(${b.index}) ${b.score}점`).join(' · ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
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
        <div style={{marginBottom:20}}><button style={{...S.btnG,opacity:gradingSub?0.5:1}} onClick={hReset} disabled={gradingSub}>{gradingSub?"📝 주관식 채점 중... 잠시만요":"새 시험 보기"}</button></div>
      </div>)}
      {/* ★ v23.9: 미니 보강 시험 응시 화면 (5분 카운트다운 + 큰 버튼) */}
      {scr==="miniexam"&&miniCurrent&&(<div style={S.wrap} className="fade-up">
        {!miniResult?(<>
          {/* 헤더 — 약점 영역 + 타이머 */}
          <div style={{position:"sticky",top:48,zIndex:50,background:T.white,borderRadius:14,padding:"14px 16px",marginBottom:14,boxShadow:"0 2px 10px rgba(0,0,0,0.08)",border:`2px solid ${miniTimeLeft<=60?T.danger:T.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:3}}>📚 보강 시험 · {miniCurrent.subject||""}</div>
                <div style={{fontSize:11,color:T.textSub}}>약점: {miniCurrent.weakArea||""} {miniCurrent.weakPct?`(${miniCurrent.weakPct}%)`:""} · {(miniCurrent.questions||[]).length}문항</div>
              </div>
              <div style={{textAlign:"center",minWidth:80}}>
                <div style={{fontSize:10,color:T.textMuted,fontWeight:600}}>남은 시간</div>
                <div style={{fontSize:22,fontWeight:800,color:miniTimeLeft<=60?T.danger:T.goldDark,fontFamily:"monospace"}}>
                  {Math.floor(miniTimeLeft/60)}:{String(miniTimeLeft%60).padStart(2,"0")}
                </div>
              </div>
            </div>
            <div style={{marginTop:8,height:6,background:T.borderLight,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(miniTimeLeft/300)*100}%`,background:miniTimeLeft<=60?T.danger:T.gold,transition:"width 1s linear"}}/>
            </div>
          </div>
          {/* 문제 목록 */}
          {(miniCurrent.questions||[]).map((q,i)=>{
            const isObj=q.type==="multiple_choice"||q.type==="객관식"||q.type==="obj";
            const my=miniAnswers[i];
            const choices=q.choices||[];
            const stageLabels={concept:"1️⃣ 핵심 개념",component:"2️⃣ 구성 요소",meaning:"3️⃣ 의미 점검",basic:"4️⃣ 기본 적용",application:"5️⃣ 응용"};
            const stageColor={concept:"#1976D2",component:"#388E3C",meaning:"#7B1FA2",basic:"#F57C00",application:"#C62828"};
            return(<div key={i} style={{background:T.white,borderRadius:14,padding:"16px",marginBottom:12,border:`2px solid ${my!==null&&my!==undefined&&my!==""?T.accent:T.borderLight}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{padding:"4px 10px",background:`${stageColor[q.stage]||T.goldDark}20`,color:stageColor[q.stage]||T.goldDark,fontSize:11,fontWeight:800,borderRadius:6}}>{stageLabels[q.stage]||`문제 ${i+1}`}</span>
                <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>{i+1}/{(miniCurrent.questions||[]).length}</span>
              </div>
              <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{q.question||""}</div>
              {isObj?(<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {choices.map((c,ci)=>{
                  const isSel=String(my)===String(ci+1);
                  return(<button key={ci} onClick={()=>hMiniAns(i,ci+1)} style={{padding:"14px 14px",fontSize:14,fontWeight:600,borderRadius:10,border:`2px solid ${isSel?T.goldDark:T.border}`,background:isSel?T.goldLight:T.white,color:isSel?T.goldDeep:T.text,cursor:"pointer",fontFamily:"inherit",textAlign:"left",lineHeight:1.5,transition:"all .15s"}}>{c}</button>);
                })}
              </div>):(<div>
                <input type="text" value={my||""} placeholder="답을 입력하세요"
                  onChange={e=>hMiniAns(i,e.target.value)}
                  onFocus={()=>setFocusedMiniIdx(i)}
                  onBlur={()=>setTimeout(()=>setFocusedMiniIdx(p=>p===i?null:p),200)}
                  style={{width:"100%",padding:"14px 14px",fontSize:15,borderRadius:10,border:`2px solid ${T.border}`,background:T.bg,fontFamily:"inherit"}}/>
              </div>)}
            </div>);
          })}
          {/* 제출 버튼 */}
          <button style={{...S.btnG,fontSize:16,padding:"15px",marginTop:8,opacity:miniSending?0.6:1}} disabled={miniSending} onClick={()=>hMiniSubmit(false)}>
            {miniSending?"제출 중...":"📤 제출하기"}
          </button>
          <button style={{...S.btnO,marginTop:8,width:"100%"}} onClick={()=>{if(window.confirm("나가면 답안이 저장되지 않아요. 정말 나갈까요?"))setScr("info");}}>
            ← 나중에 다시 풀기
          </button>
          {/* 수학 기호 키보드 */}
          {isMathSubject&&focusedMiniIdx!==null&&!mathKbHidden&&<MathKeyboard onInsert={hInsertSymbol} onClose={()=>{setMathKbHidden(true);setFocusedMiniIdx(null);}} onBackspace={hBackspace} T={T}/>}
          {isMathSubject&&mathKbHidden&&(
            <button onClick={()=>setMathKbHidden(false)} style={{position:"fixed",bottom:74,right:10,padding:"10px 14px",fontSize:13,fontWeight:700,color:T.white,background:T.gold,border:"none",borderRadius:24,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,0,0,0.2)",zIndex:201}}>🧮 수학 키보드</button>
          )}
        </>):(<>
          {/* 결과 화면 */}
          <div style={{...S.scCard,background:miniResult.score>=80?`linear-gradient(135deg,${T.accent},#1B5E20)`:miniResult.score>=60?`linear-gradient(135deg,${T.goldDark},${T.goldDeep})`:`linear-gradient(135deg,${T.danger},#B71C1C)`}}>
            <div style={{fontSize:13,opacity:.9}}>{nm} · 보강 시험</div>
            <div style={{fontSize:56,fontWeight:800,lineHeight:1.1,margin:"4px 0"}}>{miniResult.score}<span style={{fontSize:22}}>점</span></div>
            <div style={{fontSize:13,opacity:.85}}>{miniCurrent.subject||""} · {miniCurrent.weakArea||""} 보강</div>
            <div style={{fontSize:12,opacity:.7,marginTop:4}}>{miniResult.total}문항 중 {miniResult.correct}개 정답</div>
          </div>
          <div style={S.card}>
            <h3 style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:12}}>📊 단계별 결과</h3>
            {miniResult.details.map((d,i)=>{
              const stageLabels={concept:"1️⃣ 핵심 개념",component:"2️⃣ 구성 요소",meaning:"3️⃣ 의미 점검",basic:"4️⃣ 기본 적용",application:"5️⃣ 응용"};
              return(<div key={i} style={{padding:"10px 12px",marginBottom:8,background:d.r==="정답"?"#E8F5E9":d.r==="오답"?"#FFEBEE":T.borderLight,border:`1px solid ${d.r==="정답"?T.accent:d.r==="오답"?T.danger:T.border}40`,borderRadius:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>{stageLabels[d.stage]||`문제 ${d.q}`}</span>
                  <span style={{fontSize:14}}>{d.r==="정답"?"✅":d.r==="오답"?"❌":"⏳"}</span>
                </div>
                <div style={{fontSize:11,color:T.textSub,lineHeight:1.5}}>
                  <span style={{fontWeight:600}}>내 답:</span> <span style={{color:T.text}}>{d.s===null||d.s===undefined||d.s===""?"(미입력)":String(d.s)}</span>
                  {d.r!=="정답"&&<><br/><span style={{fontWeight:600,color:T.accent}}>정답:</span> <span style={{color:T.text}}>{String(d.c)}</span></>}
                </div>
                {d.r!=="정답"&&d.explanation&&(
                  <div style={{marginTop:6,padding:"6px 8px",background:"#E3F2FD",borderRadius:6,fontSize:11,color:"#0D47A1",lineHeight:1.5}}>
                    <span style={{fontWeight:700}}>💡 풀이:</span> {d.explanation}
                  </div>
                )}
              </div>);
            })}
          </div>
          <button style={S.btnG} onClick={()=>{setMiniCurrent(null);setMiniAnswers([]);setMiniResult(null);setMiniTimeLeft(300);setScr("info");hLoadMiniExams();}}>
            ← 홈으로 (다른 보강 시험 보기)
          </button>
        </>)}
      </div>)}
      {/* ★ v23.9: 일반 시험 입력 화면용 수학 기호 키보드 (포커스된 주관식 input이 있을 때) */}
      {scr==="input"&&isMathSubject&&focusedSubIdx!==null&&!mathKbHidden&&<MathKeyboard onInsert={hInsertSymbol} onClose={()=>{setMathKbHidden(true);setFocusedSubIdx(null);setFocusedSubBlankIdx(null);}} onBackspace={hBackspace} T={T}/>}
      {scr==="input"&&isMathSubject&&mathKbHidden&&(
        <button onClick={()=>setMathKbHidden(false)} style={{position:"fixed",bottom:74,right:10,padding:"10px 14px",fontSize:13,fontWeight:700,color:T.white,background:T.gold,border:"none",borderRadius:24,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(0,0,0,0.2)",zIndex:201}}>🧮 수학 키보드</button>
      )}
    </div>
  );
}
// ============================================================
// ★ v23.9: MathKeyboard 컴포넌트 — 수학 주관식 입력 보조
// ★ v23.12 (2026-05-13): 전면 개편 — 숫자+기호 통합 / 닫기 버튼 / 백스페이스
//   기존 문제:
//   - 기호만 있어서 숫자는 핸드폰 키보드 사용 → 불편함
//   - 키보드가 닫히지 않아 제출 버튼 가려짐
//   해결:
//   - 숫자 0~9 포함 풀 키보드 (40개 키)
//   - "✕ 닫기" 버튼 → 키보드 사라짐 → 제출 버튼 보임
//   - ⌫ 백스페이스 키
// ============================================================
function MathKeyboard({onInsert,onClose,onBackspace,T}){
  // 4줄 × 10키 = 40개
  const rows = [
    ["1","2","3","4","5","6","7","8","9","0"],
    ["+","-","×","÷","=",".",",","(",")","⌫"],
    ["√","π","≤","≥","≠","±","²","³","½","⅓"],
    ["x","y","°","∠","∞","/","≈","θ","∑","CLOSE"]
  ];
  const renderKey = (k, i) => {
    if (k === "⌫") {
      return (<button key={"bs"+i} type="button"
        onMouseDown={e=>{e.preventDefault();onBackspace&&onBackspace();}}
        onTouchStart={e=>{e.preventDefault();onBackspace&&onBackspace();}}
        style={{padding:"10px 0",fontSize:15,fontWeight:700,color:T.white,background:T.danger,border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
        ⌫
      </button>);
    }
    if (k === "CLOSE") {
      return (<button key={"cl"+i} type="button"
        onMouseDown={e=>{e.preventDefault();onClose&&onClose();}}
        onTouchStart={e=>{e.preventDefault();onClose&&onClose();}}
        style={{padding:"10px 0",fontSize:11,fontWeight:800,color:T.white,background:T.textSub,border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
        ✕ 닫기
      </button>);
    }
    return (<button key={i+"_"+k} type="button"
      onMouseDown={e=>{e.preventDefault();onInsert(k);}}
      onTouchStart={e=>{e.preventDefault();onInsert(k);}}
      style={{padding:"10px 0",fontSize:15,fontWeight:700,color:T.goldDeep,background:T.goldLight,border:`1px solid ${T.goldMuted}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
      {k}
    </button>);
  };
  return(<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:T.white,borderTop:`2px solid ${T.gold}`,padding:"6px 5px",paddingBottom:"max(6px,env(safe-area-inset-bottom))",zIndex:300,boxShadow:"0 -4px 16px rgba(0,0,0,0.15)"}}>
    <div style={{fontSize:9,color:T.textMuted,fontWeight:600,textAlign:"center",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 4px"}}>
      <span>🧮 수학 키보드 (숫자·기호)</span>
      <span style={{fontSize:9,color:T.danger,fontWeight:700}}>제출은 ✕ 닫기 후</span>
    </div>
    {rows.map((row, ri) => (
      <div key={ri} style={{display:"grid",gridTemplateColumns:`repeat(${row.length},1fr)`,gap:3,marginBottom:3}}>
        {row.map((k, ki) => renderKey(k, ri*100+ki))}
      </div>
    ))}
  </div>);
}
// ============================================================
// ★ v23.10 (2026-05-13): HistoryCard — 내 성적 카드 + 피드백 펼침
// ============================================================
//   - 날짜 강조 (상단 큰 글씨)
//   - 펼침 시 view_answer_key 호출 → explanations 표시
//   - 학생 답안(studentAnswers JSON) 기반 정오표 + choiceExplanations
function HistoryCard({h,idx,nm,ph,sheetsUrl,T}){
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);  // {answerKey, types, explanations}
  const [err, setErr] = useState("");

  // 날짜 포맷: "2026-05-13" → "2026년 5월 13일 (수)"
  const fmtDate = (s) => {
    if (!s) return "";
    const m = String(s).match(/(\d{4})[^\d](\d{1,2})[^\d](\d{1,2})/);
    if (!m) return s;
    const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    const dow = ["일","월","화","수","목","금","토"][d.getDay()];
    return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일 (${dow})`;
  };

  const loadFeedback = async () => {
    if (feedback) { setExpanded(!expanded); return; }
    setExpanded(true);
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams({action: "view_answer_key"});
      if (h.folderId) params.set("folderId", h.folderId);
      else {
        params.set("subject", h.subject || "");
        params.set("grade", h.grade || "");
        params.set("level", h.level || "");
        params.set("examType", h.examName || "");
        if (h.teacher) params.set("teacher", h.teacher);
        if (h.date) params.set("date", h.date);
      }
      const r = await fetch(`${sheetsUrl}?${params.toString()}`);
      const d = await r.json();
      if (d.result === "ok") {
        setFeedback({
          answers: d.answers || {},
          types: d.types || {},
          explanations: d.explanations || {}
        });
      } else {
        setErr(d.message || "피드백을 불러올 수 없습니다.");
      }
    } catch (e) {
      setErr("네트워크 오류: " + String(e));
    }
    setLoading(false);
  };

  // 학생 답안 파싱
  const studentAns = (() => {
    if (!h.studentAnswers) return null;
    try { return JSON.parse(h.studentAnswers); } catch (e) { return null; }
  })();

  // 주관식 상세 파싱 (피드백 + 부분점수)
  const subjDetails = (() => {
    if (!h.subjectiveDetails) return null;
    try { return JSON.parse(h.subjectiveDetails); } catch (e) { return null; }
  })();
  const subjMap = {};
  if (Array.isArray(subjDetails)) {
    subjDetails.forEach(d => { subjMap[String(d.q)] = d; });
  }

  const scoreColor = h.score >= 90 ? T.accent : h.score >= 70 ? T.goldDark : T.danger;

  return (
    <div style={{padding:"14px",marginBottom:8,background:T.white,borderRadius:12,border:`1.5px solid ${expanded?T.goldDark:T.goldMuted}`,boxShadow:expanded?"0 2px 8px rgba(0,0,0,0.08)":"none",transition:"all 0.2s"}}>
      {/* 날짜 강조 */}
      <div style={{fontSize:11,color:T.goldDeep,fontWeight:700,marginBottom:6,padding:"3px 8px",background:T.goldPale,borderRadius:6,display:"inline-block"}}>
        📅 {fmtDate(h.date)}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text}}>{h.className} · {h.examName}</span>
        <span style={{fontSize:22,fontWeight:800,color:scoreColor}}>{h.score!=null?`${h.score}점`:"—"}</span>
      </div>
      <div style={{fontSize:11,color:T.textMuted,marginBottom:8}}>
        정답 {h.correct||0} / 오답 {h.wrong||0}
        {h.wrongQuestions?` · 틀린 문항: ${h.wrongQuestions}`:""}
      </div>
      <button onClick={loadFeedback} style={{width:"100%",padding:"8px 12px",fontSize:12,fontWeight:700,borderRadius:8,border:`1.5px solid ${T.goldDark}`,background:expanded?T.goldDark:T.white,color:expanded?T.white:T.goldDeep,cursor:"pointer",fontFamily:"inherit"}}>
        {expanded?"▲ 피드백 접기":"📖 풀이·정답 보기"}
      </button>
      {expanded && (
        <div style={{marginTop:10,padding:"10px",background:T.bg,borderRadius:8}}>
          {loading && <div style={{textAlign:"center",fontSize:11,color:T.textMuted,padding:"8px"}}>피드백 불러오는 중...</div>}
          {err && <div style={{padding:"8px",background:T.dangerLight,color:T.danger,fontSize:11,borderRadius:6}}>{err}</div>}
          {feedback && !loading && (() => {
            const wrongQs = String(h.wrongQuestions||"").split(",").map(s=>s.trim()).filter(Boolean);
            if (wrongQs.length === 0) {
              return <div style={{padding:"8px",fontSize:12,color:T.accent,fontWeight:600,textAlign:"center"}}>🎉 만점! 틀린 문항이 없어요.</div>;
            }
            return (
              <div>
                <div style={{fontSize:11,fontWeight:700,color:T.textMuted,marginBottom:6}}>📋 틀린 문항 분석 ({wrongQs.length}개)</div>
                {wrongQs.map((qn, qi) => {
                  const ex = feedback.explanations[qn] || feedback.explanations[String(qn)] || null;
                  const correctAns = feedback.answers[qn] || feedback.answers[String(qn)] || "";
                  const studentAnswer = studentAns ? (Array.isArray(studentAns)?studentAns[Number(qn)-1]:studentAns[qn]) : null;
                  const subjFB = subjMap[qn];
                  const isObjType = !ex || !ex.gradingGuide;  // 객관식 추정
                  return (
                    <div key={qi} style={{padding:"8px 10px",marginBottom:6,background:T.white,border:`1px solid ${T.dangerLight}`,borderRadius:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:T.danger}}>❌ {qn}번</span>
                        <span style={{fontSize:10,color:T.textMuted}}>
                          {studentAnswer!==null&&studentAnswer!==undefined?`내 답: ${studentAnswer}`:""}
                          {correctAns?` · 정답: ${correctAns}`:""}
                        </span>
                      </div>
                      {ex && ex.explanation && (
                        <div style={{fontSize:11,color:T.text,lineHeight:1.5,padding:"4px 0"}}>
                          <span style={{fontWeight:700,color:T.accent}}>💡 풀이: </span>{ex.explanation}
                        </div>
                      )}
                      {ex && ex.choiceExplanations && (
                        <div style={{marginTop:4,fontSize:10,color:T.textSub,lineHeight:1.5}}>
                          {[1,2,3,4,5].map(n => {
                            const ce = ex.choiceExplanations[String(n)] || ex.choiceExplanations[n];
                            if (!ce) return null;
                            const isCorr = String(correctAns)===String(n);
                            const isMine = String(studentAnswer)===String(n);
                            return (
                              <div key={n} style={{padding:"2px 0",color:isCorr?T.accent:isMine?T.danger:T.textMuted}}>
                                {["①","②","③","④","⑤"][n-1]} {isCorr?"✓ ":""}{isMine?"내 답 ":""}{ce}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {subjFB && subjFB.reasoning && (
                        <div style={{marginTop:4,padding:"6px 8px",background:T.goldPale,borderRadius:6,fontSize:10,color:T.text,lineHeight:1.5}}>
                          <span style={{fontWeight:700,color:T.goldDark}}>📝 채점 의견: </span>{subjFB.reasoning}
                        </div>
                      )}
                      {!ex && (
                        <div style={{fontSize:10,color:T.textMuted,fontStyle:"italic",padding:"4px 0"}}>
                          이 시험의 풀이가 등록되지 않았어요. (선생님께 문의)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
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
