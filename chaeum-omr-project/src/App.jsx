// ============================================================
// 채움학원 OMR — Apps Script v27.12 (2026-06-03 OMR 정답 매칭 패치 3차 — fallback 안전장치)
// v27.12 (2026-06-03) — 정답조회 오답 노출 방지
//   ★ view_answer_key fallback 후보가 여러 개이고 답안이 다르면 자동 선택 중단(ambiguous_answer_key)
//   ★ folderId backfill/업로드기록 lookup에 반·차수·날짜 조건 보강
//   ★ "정답은 B입니다" / "Answer is B" / "Option B" 같은 명시적 보기 라벨 추가 인식
// v27.11 (2026-06-03) — OMR 정답 매칭 회귀 보강
//   ★ 끝괄호 차수 추출을 인식 태그(1차/2차/이론편/실전편/혼합/세트A~E/A~E)로 제한
//     → "독해특강(심화)" "채움구문형(p54-61)" 가 가짜 차수로 추출돼 정답조회 실패하던 회귀 차단
//   ★ A~E→1~5 변환을 보기 라벨이 확실할 때만 ("B" "(B)" "B번" "정답:B" "Answer: B")
//     → 주관식 "do" "he" "a dog" 오변환 방지 (※ setType 필터는 하드 유지)
// v27.10 (2026-06-03) — OMR 정답 매칭 안전 보강
//   ★ 객관식 정답 ①②③④⑤ / "2번" / "정답: ②" 를 1~5 숫자로 저장·비교
//   ★ 1차·2차 동시등록 시 중복 등록 판정에 차수(setType/round) 포함
//   ★ view_answer_key fallback 조회에 차수와 반(className) 조건 추가
// v27.28 (2026-05-30) — 운영 전 검수 보강
//   ★ 제출ID 열 추가 시 기존 시트의 오른쪽 빈 열이 삭제되어 있어도 먼저 열 수를 확보
// v27.27 (2026-05-30) — 학생 제출 고유번호(submitId)로 주관식 후처리 행 오염 방지
//   ★ 새 학생 답안 저장 직후 class_grades 캐시 무효화
// v27.26 (2026-05-30) — 학생 과거 기록은 제출일시가 아니라 시험날짜 우선 사용
//   ★ 답안원본 컬럼 인식 보강으로 과거 풀이 보기의 '내 답' 표시 복구
// v27.25 (2026-05-30) — 부분정답을 복습/검토 문항 집계에 포함
// v27.10 (2026-05-15 저녁) — v23 워커 파일명 패턴 `_A_v23_<timestamp>` 매칭 픽스
//   ★ _stripMeta 에 `_[A-Z]_v\d+$` 와 `_v\d+$` regex 2개 추가
//     · 원인: 김진용 영어 중3 A반 처리 시
//             JSON: exam_A_채움6구문형_p36-43_50문항_중3A반_A_v23_20260515_211519.json
//             docx: 시험지_A_채움6구문형_p36-43_50문항_중3A반_2026... .docx
//             기존 _stripMeta 가 `_20260515_211519` 만 제거 → `_A_v23` 잔여
//             → _baseCore 에 `_A_v23` 가 붙어 docx 명에 포함이 안 됨 → 매칭 실패
//             → 미러 폴더 비어있음 → 학생앱 다운로드 불가
//     · 해결: `_A_v22`, `_A_v23` 잔여 패턴 추가 제거 (regex 7-8)
//
// v27.9 (2026-05-15) — v22 워커 새 파일명 패턴 대응 + 미러 폴더 빈 채 사고 픽스
//   ★ scanExamGenResultsFolder_ 의 baseName 매칭에 메타 태그 정규화 추가
//     · 원인: 클로드 v22 워커가 `_A_v22_생성완료_<timestamp>.json` 패턴 사용
//             같은 폴더 docx 는 `_<timestamp>.docx` → baseName.indexOf 매칭 실패
//             → 미러 폴더 비어있는 채로 정답목록 행만 만들어짐 ("⚠️ 파일 없음")
//     · 해결: _stripMeta(s) 헬퍼 — `_A_v22_생성완료_xxx`, `_처리완료_xxx`, `_<timestamp>` 등 제거 후 비교
//   ★ 즉시픽스_빈미러폴더_오늘 1회용 함수 — 이미 깨진 미러 폴더 사후 복구
//
// v27.8 (2026-05-15) — 4중복 사고 근본 픽스
//   ★ _saveExtractResult_ 폴더에 실제 파일 0개면 정답목록 행 생성 차단 (requireFolderId=true 일 때)
//     · 원인: 사용자 5/15 케이스 — AUTO_OK 인데 폴더 파일 0개인 행 4개 누적
//     · 해결: 폴더 다운로드 가능 파일 1개 이상 있어야만 진행
//   ★ _saveExtractResult_ 중복 등록 자동 차단 (5분 내 같은 선생님+반+날짜+종류)
//     · 같은 조합 행이 5분 이내 있으면 기존 행 업데이트 (새 행 만들지 X)
//     · 폴더ID 가 더 새로우면 갱신
//
// v27.7 (2026-05-15) — 선생님앱 v23.38 Drive 실저장 검증용
//   ★ list_folder_files 기존 동작 유지: 업로드 직후 실제 Drive 파일 조회 검증에 사용
//   ★ v27.6 folderId 필수 검증 유지
//
// v27.6 (2026-05-15) — AI 자동등록 전 folderId 필수 검증
// v27.6 (2026-05-15) — AI 자동등록 전 folderId 필수 검증
//   ★ 선생님앱 파일 업로드 모드에서 AI 검수 저장 시 folderId 를 직접 전달받음
//   ★ requireFolderId=true 인 요청은 folderId 연결 실패 시 정답목록 행 생성 차단
//   ★ "AI 만장일치인데 Drive/오늘의 현황에 없음" 상태를 실패로 노출
//
// v27.5 (2026-05-15) — 등록/업로드/AI검수 안정화
// v27.5 (2026-05-15) — 등록/업로드/AI검수 안정화
//   ★ upload_exam 응답에 folderId 명시 추가 (분할 업로드 append 폴더 추적 안정화)
//   ★ 분할 업로드 append 호출 후 폴더메타JSON 캐시를 "이번 호출 파일"이 아니라 실제 폴더 전체 스캔 기준으로 저장
//   ★ GPT 비활성/누락 응답을 활성 모델에서 제외 → Gemini+Claude 일치 시 AUTO_OK 가능
//   ★ 직접입력 save_answer_key 도 folderId 를 받을 수 있게 보강
//
// v27.3.1 (2026-05-14) — 사용 안 하는 캐시 시트 3개 제거
//   ★ ClassStatsCache 제거 (App.jsx 캐시 우회 적용 후 미사용)
//   ★ ExplanationsCache 제거 (객관식 즉시 AI 풀이 비활성 후 미사용)
//   ★ AIReviewCache 제거 (검수 자동 저장 제거 후 미사용)
//   ★ setupSpeedCacheSheets / setupSheetOne_ 에서 3개 항목 삭제 → 재실행해도 안 생김
//   ★ 유지: PerfLog (기록 비활성이지만 헤더 보존), FileIndex, StudentStatsCache
//   ★ 사용자는 Google Sheets UI 에서 3개 시트 직접 삭제
//
// v27.3 (2026-05-14) — 1회용 디버그 함수 46개 일괄 제거 + 자동 정리 트리거 비활성
//   ★ 5/14 시험 운영 중 발견한 30+ 디버그 함수 (diag_*, fix_*, 검수_*, 정리_*, 강력정리_*) 일괄 제거
//     → 메인 파일 2473줄 감소 (13022줄 → 10549줄)
//     → 함수 217개 → 171개 (46개 제거)
//     → 백업 위치: _옛버전_백업/v27_oneoff_debug_funcs_backup.txt
//   ★ setupBackgroundMirrorScan 에서 cleanEmptyExamFolders 자동 설치 제거
//     → 정상 폴더가 일시적 빈 상태일 때 자동 휴지통 → 데이터 손실 위험 차단
//     → 기존 트리거도 setupBackgroundMirrorScan 실행 시 자동 제거됨
//   ★ App.jsx StatsTab — get_class_stats_fast 캐시 우회 (useFast = false)
//     → 학생별 wrongQs / perQuestion 누락으로 "전부 정답" 오표시 차단
//     → 옛 class_grades 직접 호출 (응답 캐시 5분 유지되어 충분히 빠름)
//
// v27.2 (2026-05-14) — 카테고리 자동 분석 + 수동 재분석 도구
//   ★ _saveExtractResult_ 끝에 analyze_exam_categories 자동 호출
//     · OCR 직후 카테고리 분류 → 학생앱이 즉시 영역별 그래프 표시 가능
//     · 실패해도 main flow 영향 X (try-catch)
//   ★ rebuildCategoriesForExam(folderId) — 1회용 수동 재분석
//   ★ rebuildCategoriesForExamBy(subject, grade, level, examType) — folderId 없을 때
//   ★ rebuildCategoriesBadOnly() — "1, 2, -1" 같은 잘못된 카테고리만 골라서 재분석 (추천)
//   ★ rebuildCategoriesAll() — 전체 강제 재분석 (Gemini 비용 발생, 신중하게)
//
// v27.1.1 (2026-05-14) — 🚨 긴급 픽스 2건
//   ★ saveSubjectiveGrade_ 잉여 중괄호 제거
//     · 증상: "SyntaxError: Unexpected token 'finally'" 라인 8583 → GAS 저장 불가
//     · 원인: } catch{} } finally{} (중괄호 2개 연속)
//     · 수정: } catch{} finally{}
//   ★ 1회용 함수의 SpreadsheetApp.getUi().alert() 전부 제거 (Logger.log 만 유지)
//     · 증상: setupSpeedCacheSheets 가 9초 만에 끝났는데 모달 클릭 대기로 6분 timeout
//     · 원인: alert() 가 사용자 OK 클릭 대기 — 에디터에서 모달이 안 보이면 hang
//     · 수정: alert() 제거 — GAS 실행 로그에 Logger.log 결과로 충분히 확인됨
//     · 적용: setupSpeedCacheSheets · setupSheetOne_ · rebuildFileIndex
//             · rebuildClassStatsCache · rebuildStudentStatsCache · runSpeedSelfTest
//             · clearSpeedCache · disableProcessAnswerQueueTrigger
//
// v27.1 (2026-05-13) — Phase 2: 캐시 + 동시성 + 통합 API
//   ★ rebuildStudentStatsCache 1회용 (학생앱 트렌드/약점 차트 데이터)
//   ★ ExplanationsCache 자동 활용 (generate_explanations 캐시 우선 → Gemini 비용·시간 절감)
//   ★ AIReviewCache 자동 저장 (_saveExtractResult 후 즉시 캐시)
//   ★ LockService 적용:
//     · student_answer (학생 동시 제출 충돌 방지)
//     · save_subjective_grade (주관식 채점 결과 동시 쓰기 방지)
//   ★ get_student_home_data 통합 API (히스토리 + 통계 + 미니 시험 한 번에)
//   ★ get_student_stats_fast 핸들러 (캐시 즉시 조회)
//   ★ get_ai_review_cache 핸들러 (선생님앱 카드용)
//   ★ setupSpeedCacheSheets timeout 픽스 (포맷팅 제거 + flush + 개별 함수)
//
// 배포 후 1회용 함수 순서 (Phase 1 + Phase 2):
//   1) setupSpeedCacheSheets
//   2) disableProcessAnswerQueueTrigger
//   3) rebuildClassStatsCache (반별 성적용)
//   4) rebuildStudentStatsCache (학생앱 그래프용)  ★ Phase 2 신규
//   5) rebuildFileIndex (1~3분, 가장 오래)
//   6) runSpeedSelfTest
//
// v27.0 (2026-05-13) — Speed & Stability: 캐시 기반 아키텍처
//   ★ 핵심 목표: 반별 성적 30~60초 → 1~3초 / 오늘의 현황 안정화
//   ★ 새 시트 6개: PerfLog · FileIndex · ClassStatsCache · StudentStatsCache · ExplanationsCache · AIReviewCache
//   ★ 새 핸들러: get_class_stats_fast · get_teacher_dashboard_data
//   ★ 1회용 함수: setupSpeedCacheSheets · disableProcessAnswerQueueTrigger
//                · rebuildFileIndex · rebuildClassStatsCache
//                · runSpeedSelfTest · clearSpeedCache
//   ★ perfLog_ / perfMeasure_ 헬퍼: 모든 함수 실행 시간 PerfLog 시트에 기록
//   ★ processAnswerQueue 트리거 완전 제거 (수동 실행만, 매분 6분 timeout 종료)
//
// 자세한 변경 사항: SPEED_STABILITY_CHANGELOG_v27.md 참조
//
// 배포 후 실행 순서:
//   1) setupSpeedCacheSheets         (캐시 시트 6개 생성)
//   2) disableProcessAnswerQueueTrigger (1분 트리거 제거 — 이미 했으면 skip)
//   3) rebuildFileIndex              (1~3분, Drive 30일 폴더 인덱싱)
//   4) rebuildClassStatsCache        (30초~1분, 반별 통계 계산)
//   5) runSpeedSelfTest              (속도 검증)
//
// v26.4 (2026-05-13) — Phase 3: 업로드 95% 안전성 (append 모드)
//   ★ _appendFolderId 모드 — 큰 페이로드 분할 호출 지원
//     · 클라이언트가 첫 호출에서 폴더 + 첫 파일 생성
//     · 추가 파일은 _appendFolderId 로 같은 폴더에 append
//     · 시험정보.txt 와 업로드기록 row 는 첫 호출에서만 생성
//   ★ GAS 6분 timeout 영향 최소화 (한 호출당 1~2개 파일만)
//
// v26.3 (2026-05-13) — 🚨 진짜 원인 발견: processAnswerQueue 매분 6분 timeout
//   ★ 원인: 50일+ 누적 폴더를 1분마다 다 스캔 → 6분 timeout 매번 발생
//         → GAS 동시 실행 한도(30개) 잠식 → 시험 업로드까지 영향
//   ★ 픽스:
//     1) 최근 7일 폴더만 스캔 (옛 폴더는 _처리완료_ 마커 활용)
//     2) 시간 제한 (5분 안 끝나면 다음 실행으로 미루기)
//     3) 트리거 간격 1분 → 10분 (installAnswerQueueTrigger 재실행 필요)
//
// v26.2 (2026-05-13) — 시험 파일 업로드 안정화 (치명 버그 픽스)
//   ★ 빈 폴더 자동 청소 트리거 (1시간 간격)
//     · setupBackgroundMirrorScan() 한 번 실행하면 자동 설치됨
//     · cleanEmptyExamFolders 가 1시간 이상 빈 폴더 휴지통 이동
//   ★ App.jsx 가 mode:"no-cors" 제거 + text/plain + 재시도 3회 (서버는 변경 없음)
//     · 기존: 클라이언트가 응답 못 받아 실패해도 "성공"으로 보임
//     · 수정: 응답 받아 failedFiles 확인 + 알림
//
// v26.1 (2026-05-13) — 반별 성적 응답 슬림 모드
//   ★ light=1 파라미터 — perQuestion 의 reasoning 등 무거운 필드 제거
//     · 응답 크기 70% 감소 → 네트워크 전송 시간 단축
//     · 학생 카드 펼침 시에만 풀 데이터 별도 호출 (lazy load)
//   ★ 캐시 키에 light 모드 포함 (L/F 구분)
//
// v26.0 (2026-05-13) — Phase 2: 성능 최적화 + 안정성 강화
//   ★ class_grades 5분 응답 캐싱 (1분 → 0.1초 재호출)
//   ★ 학생답안기록 부분 범위 읽기 (단일 날짜는 끝에서 1500행만)
//   ★ ansRows 중복 시트 읽기 제거 (3초 절약)
//   ★ upload_exam 일부 파일 실패 시 다른 파일 계속 시도 (전체 실패는 폴더 자동 휴지통)
//   ★ failedFiles 응답 추가 (프론트에서 실패 파일 표시)
//   ★ cleanEmptyExamFolders (1회용): 빈 폴더 자동 청소
//
// v25.9 (2026-05-13) — 시험지 PDF OCR + 코드 정리
//   ★ extractQuestionsFromExamPdf_ 핸들러 신규 (POST extract_questions_from_exam_pdf)
//     · 시험지 PDF 를 Vercel api/extract-question-from-pdf 에 보냄
//     · Gemini 2.5 Flash 가 특정 문항의 본문+선택지 추출
//     · 정답목록 T열(20)에 question + choices 병합 저장
//     · Top 7 PDF 의 영어 문항 본문 자동 채움 (옛 시험도 대응)
//   ★ EXTRACT_QUESTION_URL 상수 추가
//   ★ 코드 정리: initStudentAnswerSheet, dailyConsistencyCheck wrapper 제거
//
// v25.8 (2026-05-13) — 3가지 긴급 픽스
//   ★ 학생앱 list_exams_today 에서 추천보강 제외
//     · examType === "추천보강" 행 skip → 오늘의 시험 찾기에 표시 안 됨
//   ★ update_exam_date 를 GET 으로도 허용 (CORS 우회)
//     · POST application/json 은 preflight 요청 → CORS 차단 → "Failed to fetch"
//     · GET 으로 변경하면 자동 통과
//   ★ Top 7 PDF: c.folderId 없을 때 view_answer_key meta.folderId fallback
//     · 수학 시험지 PDF 못 찾던 버그 차단
//
// v25.7 (2026-05-13) — 3가지 추가 픽스
//   ★ #2 추천보강 시험을 오늘의 현황에서 제외 (정규 시험만 표시)
//     · teacherDashboard_ 에서 examType === "추천보강" 행 skip
//     · 학생별로 자동 생성되는 미니 시험은 "📚 보강 현황" 탭에서만 관리
//   ★ #1 시험 날짜+시간 동시 수정 (UI는 App.jsx 모달)
//     · update_exam_date 가 newTime 도 받음 (예: "19:00")
//     · 폴더명이 "19시00분_시험_..." 패턴이면 자동 변경
//     · 폴더메타JSON 의 examTime 도 갱신
//   ★ #3 직접 업로드 시험 "⚠️ 파일 없음" 버그 픽스
//     · upload_exam 직후 폴더메타JSON 캐시 미리 채워넣음 (10분 TTL)
//     · _saveExtractResult_ 가 정답목록 행 만들 때 S열(19)에 폴더메타JSON 영구 저장
//     · 시험정보.txt [업로드 파일] 섹션 기반 정확한 정답지/시험지 분류
//
// v25.6 (2026-05-13) — Top 7 PDF 피드백 자료 개선 (문제 본문 표시)
//   ★ scanExamGenResultsFolder_ 의 explanations 에 question + choices + answer 도 저장
//     · 기존: explanation, choiceExplanations 만 저장 → Top 7 PDF 에 풀이만 나옴
//     · 수정: q.question, q.choices, q.answer 도 함께 저장 → 인쇄 자료로 활용 가능
//
// v25.5 (2026-05-13) — 실장님 보고 4가지 추가 문제 픽스
//   ★ #1 수학 시험 객관식 → 주관식 잘못 분류 (이강억 중3A, 장문석 중3I)
//     · _buildExtractPrompt_ 강화: 과목별 type 판별 가이드
//       - 수학: "1~5 단일 숫자 → 반드시 mc", "정수 답 → mc 우선" 명시
//     · _checkUnanimous_ 안전망: 수학 시험 + 정수 답 + sa 다수결 → mc 강제
//     · examInfo 를 _checkUnanimous_ 에 전달 (subject 활용)
//   ★ #3 우림쌤 시험지 8개 중복 (한 카드에 다른 반 시험지 섞임)
//     · scanExamGenResultsFolder_ 미러 폴더 생성 직후 청소
//     · _baseName 안 들어간 모든 파일 → 휴지통 이동 (시험정보.txt 제외)
//     · 자동등록로그에 청소 내역 기록
//   ★ #4 시험 날짜 수정 기능
//     · update_exam_date 핸들러 신규 (POST)
//     · 정답목록 M열(13) 시험날짜 수정 + 대시보드 캐시 무효화
//     · 선생님앱 카드에 "📅 날짜 수정" 버튼 추가
//
// v25.4 (2026-05-13) — AI 영역 분석 + 객관식 즉시 풀이 + 강제 재스캔
//   ★ analyze_exam_categories (POST): Gemini 2.5 Flash 가 문항을 문법/어휘/독해 등으로 분류
//     · 정답목록 U열(21) 카테고리JSON 자동 저장
//     · view_answer_key 응답에 categories 포함 → 학생앱이 영역별 그래프 그림
//   ★ generate_explanations (POST): 객관식 풀이 + choiceExplanations 즉석 생성
//     · 옛 시험 (T열 비어있음) 도 학생이 정오표 클릭 시 즉시 풀이 확인
//     · Gemini 응답 후 정답목록 T열에 캐시 → 다음 학생부터 빠름
//   ★ force_rescan_exam_gen / forceRescanExamGenManual: 자동 등록 안 된 시험 강제 재처리
//     · _처리완료_ 마커 제거 + scanExamGenResultsFolder_ 즉시 실행
//     · 이새나쌌 시험 등 자동 등록 실패한 경우 사용
//
// v25.3 (2026-05-13) — 실장님 보고 5가지 문제 픽스
//   ★ #1 객관식이 주관식으로 잘못 분류되던 버그
//     · _normalizeTypeToken_ 강화: ①②③④⑤ 원문자 / "1번" 한글 / a~e 알파벳 인식
//     · 이전엔 답안이 "①" 이면 sa 로 잘못 분류 → 학생앱이 주관식 입력란 표시
//   ★ #5 복수 시험 하나로 묶이던 버그 (정답보기 1개만)
//     · scanExamGenResultsFolder_ 의 docx 복사 _related 조건 강화
//     · 기존: _baseName 매치 OR 키워드 매치 ("시험지/정답표/...")
//     · 수정: _baseName 정확 매치만 (키워드 제거) + B/C 세트 명시 제외
//   ★ #2/#3 자동 등록 안 됨 — 디버그 정보 강화
//     · 누락 필드 명시 + Slack 알림 (선생님앱에서 시험 다시 등록 안내)
//   ★ 1회용 복구 함수 2개 추가:
//     · invalidateFolderCacheForTeacher: 모든 S열(폴더캐시) 비우기 → 재스캔
//     · cleanMirrorFoldersExtraFiles: 미러 폴더에서 baseName 안 맞는 파일 휴지통 이동
//   ★ v25.2 (P열 JSON 오염 버그 픽스) 그대로 유지
//
// v25.2 (2026-05-13) — saveSubjectiveGrade_ P열 → R열 변경 (치명 버그)
//
// v25.1 (2026-05-13) — 4가지 버그 픽스 (사용자 실사용 피드백)
//   ★ 시험정보.txt 강제 파싱 → 정답지/시험지 정확 분류
//     · 키워드 없는 파일명 ("학습지 _ 매쓰홀릭(2).PDF" 등) 도 정확 분류
//     · [업로드 파일] 섹션의 명시값 우선 → 키워드 매칭은 fallback
//   ★ 학생답안기록에 P=선생님, Q=폴더ID, R=주관식상세 컬럼 추가
//     · 학생앱이 student_answer 호출 시 teacher + folderId 명시 전송
//     · class_grades 가 학생답안 선생님 값 우선 사용 (정답목록 매칭 오류 차단)
//   ★ student_history 응답에 subject/grade/level/teacher/folderId/answers 추가
//     · 학생앱이 과거 시험 피드백 (view_answer_key) 조회 가능
//
// v25.0 (2026-05-13) — 코드 다이어트 + v24.13 통합 (병행 작업)
//
// v24.13 (2026-05-13) — 미니 보강 시험 Gemini 실시간 생성
//   ★ recommend_mini_exam: 클로드 데스크탑 큐 등록 → Vercel API 즉시 호출 변경
//     · MINI_EXAM_API_URL ("/api/generate-mini-exam") Gemini 2.5 Flash 호출
//     · 응답으로 5문항 받으면 즉시 정답목록 시트에 추천보강 examType 등록
//     · 보강시험현황 시트 N열에 questions JSON 저장 (학생앱이 응시할 때 사용)
//   ★ submit_mini_exam_result: 학생앱 신규 페이로드(miniExamId + details) 지원
//   ★ list_mini_exam_progress: student 쿼리 시 questions JSON 함께 반환
//   ★ 입력 페이로드 backward compat — 옛 {student, exam, perQuestion} 도 지원
//
// ─── v25.0 (2026-05-13) 정리: 1회용 디버그 함수 삭제 + 옛 변경 이력 압축 ───
//   삭제: debugLatestExams (180줄), clearAllFolderMetaCache (56줄), migrateExamDates (26줄)
//   유지: diagDashFiles_ (HTTP 진단 — 미래 사용 가능), backgroundMirrorScan, setup* (트리거)
//
// 옛 변경 이력 요약 (v18~v23, 전체는 _옛버전_백업/AppsScript_v24_12.txt 참조):
//   v23.7 (2026-05-11): 로딩 속도 30-60초→5초 (백그라운드 미러스캔 + 폴더메타JSON 캐시)
//   v23.6 (2026-05-11): 채점 컬럼 J~N 정확 갱신 / setType+날짜 매칭 / 대시보드 캐시 5분
//   v21.0: AI 답지 자동 추출 (Gemini+GPT-4+Claude 3-모델 만장일치)
//   v20.5: class_grades JOIN 다단계 fallback / 기간 조회 / 어려운문항 Top5
//   v20.4: class_grades API 신규 (반별 성적)
//   v20.3: scanExamGenResultsFolder_ A세트만 / 표준 폴더 미러링
//   v20.2: 3단계 폴더 / 첫 세트(A)만 정답목록 등록
//   v20.1: 자동처리로그 시트 + Slack 자동 기록
//   v18~v20: 3단계 폴더 구조 (Date/Teacher/ExamFolder)
// ============================================================

// ============================================================
// [공통 유틸] 정답 데이터 정규화 — normalizeAnswerData
// ------------------------------------------------------------
// 어떤 형태로 들어와도 무조건 {"1":값, "2":값, ...} 객체로 통일.
// 처리 가능한 입력:
//   1. 배열:            [2, 4, 1, 3, ...]
//   2. 객체:            {"1":2, "2":4, ...}
//   3. JSON 문자열:     "[2,4,1,3]" 또는 "{\"1\":2,...}"
//   4. 이중 인코딩:     "\"[2,4,1,3]\"" — 문자열 안에 또 JSON 문자열
//   5. null/빈값:       {}
// 숫자 키만 남기고 string key 로 저장 (1-based 문항번호 보장).
// 사용처:
//   - save_answer_key (POST)
//   - autoRegisterExamFromGen_
//   - getAllExamsForDate_ 등 조회 시
// ============================================================
function normalizeAnswerData(raw) {
  if (raw === null || raw === undefined || raw === "") return {};
  var v = raw;
  // 1~2회 JSON 파싱 (이중 인코딩 대응)
  for (var attempt = 0; attempt < 2; attempt++) {
    if (typeof v === "string") {
      var s = v.trim();
      if (s === "") return {};
      try { v = JSON.parse(s); } catch(e) { return {}; /* 파싱 불가 → 빈 객체 */ }
    } else {
      break;
    }
  }
  if (v === null || v === undefined) return {};
  var out = {};
  if (Array.isArray(v)) {
    for (var i = 0; i < v.length; i++) {
      out[String(i + 1)] = v[i];
    }
    return out;
  }
  if (typeof v === "object") {
    // 객체인데 "1"/"2"/... 대신 "0"/"1"/... 으로 왔을 가능성도 대응
    var keys = Object.keys(v);
    var allNumeric = keys.length > 0 && keys.every(function(k){ return /^\d+$/.test(k); });
    if (allNumeric) {
      // 가장 작은 키가 0 이면 +1 shift, 아니면 그대로
      var nums = keys.map(function(k){ return parseInt(k,10); }).sort(function(a,b){return a-b;});
      var shift = (nums[0] === 0) ? 1 : 0;
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        out[String(parseInt(k,10) + shift)] = v[k];
      }
      return out;
    }
    // 숫자 키가 아니면 그대로 반환 (예: 타입 맵 "mc"/"sub")
    for (var k2 in v) { out[k2] = v[k2]; }
    return out;
  }
  // 그 외(숫자, 불리언 등) — 1번 정답으로 취급
  return { "1": v };
}

// ============================================================
// [공통 유틸] 정답 문서(전체 JSON) 파싱 — parseAnswerDoc_
// ------------------------------------------------------------
// normalizeAnswerData 는 "번호→정답" 맵(answers/types) 한 개를 처리,
// parseAnswerDoc_ 은 "전체 시험 문서"(sets/questions/answers 등을 담은 JSON)
// 의 이중 인코딩을 풀어서 객체/배열을 반환.
// autoRegisterExamFromGen_ · getExamGenDetail_ · processAnswerQueue 에서 공용.
// ============================================================
function parseAnswerDoc_(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  var v = raw;
  for (var a = 0; a < 3; a++) {
    if (typeof v !== "string") break;
    var s = v.trim();
    if (!s) return null;
    try { v = JSON.parse(s); } catch(e) { return null; }
  }
  return v;
}

// ============================================================
// [공통 유틸] 시험 구분(setType) 정규화
// ------------------------------------------------------------
// 새 스키마: "이론편" / "실전편" / "혼합" (또는 빈값)
// 구 스키마: "1차" / "2차" / "3차" — 하위호환 위해 그대로 통과
// 공백 정리만 하고 그 외 값은 원본 유지 (예: "단어시험" 같은 자유 태그)
// ============================================================
function normalizeSetType_(raw) {
  if (raw === null || raw === undefined) return "";
  var s = String(raw).trim();
  if (!s) return "";
  // 흔한 변형들을 표준형으로
  if (s === "이론" || s === "이론편" || s === "theory") return "이론편";
  if (s === "실전" || s === "실전편" || s === "practice") return "실전편";
  if (s === "혼합" || s === "둘다" || s === "both" || s === "mixed") return "혼합";
  return s; // 1차/2차/3차 등 레거시 값은 그대로
}

// ★ v14: 문제생성큐 시트에 컬럼이 없으면 끝에 자동 추가 (헤더만 보강)
function ensureExamGenColumn_(sheet, colName) {
  if (!sheet || !colName) return;
  var hdr = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < hdr.length; i++) {
    if (String(hdr[i]).trim() === colName) return; // 이미 있음
  }
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, newCol).setValue(colName);
}
// ★ v12.3: 메모 앞에 객관식/서술형 비율 지시문 자동 삽입
//   Claude(외부 워커)가 메모를 반드시 읽기 때문에, mcRatio 를 놓치지 않도록
//   구조화된 한국어 지시문을 메모 선두에 추가. 워커 프롬프트 코드를 건드리지 않아도 효과.
function buildGenMemo_(data, mcRatio) {
  var qc = Number(data.questionCount) || 20;
  var mcN = Math.round(qc * mcRatio / 100);
  var subN = qc - mcN;
  var header;
  if (mcRatio >= 100) {
    header = "[출제형태] 전체 객관식 (" + qc + "문제 모두 5지선다 mc). 서술형 금지.";
  } else if (mcRatio <= 0) {
    header = "[출제형태] 전체 서술형 (" + qc + "문제 모두 sub). 객관식 금지.";
  } else {
    header = "[출제형태] 객관식 " + mcN + "문제 (mc, 5지선다) + 서술형 " + subN + "문제 (sub). " +
             "반드시 이 비율을 정확히 지켜주세요 — 전체 객관식으로 출제하면 안 됩니다.";
  }
  var userMemo = String(data.memo || "").trim();
  return header + (userMemo ? "\n\n[선생님 메모] " + userMemo : "");
}

// ★ v28 Phase 1 (2026-05-16): 부가 기능 일괄 비활성화 헬퍼
//   사용자 결정: 단어시험/추천보강/미니시험/AI영역분석/세트swap/관리자도구 등 비활성화
//   doPost / doGet 최상단에서 호출 → 비활성 action 은 즉시 차단
function _v28BlockDisabled_(action) {
  var DISABLED = [
    // 미니시험 / 추천보강
    "recommend_mini_exam", "submit_mini_exam_result", "list_mini_exam_progress",
    // AI 부가 기능
    "analyze_exam_categories", "generate_explanations",
    // 워커 부가 기능 (v28 워커는 update_exam_gen_status 만 사용)
    "swap_exam_set", "force_rescan_exam_gen", "scan_exam_gen_results", "auto_register_exam_gen",
    // 1회용 관리자 도구 (운영 중 호출 X)
    "diag_teachers", "reclassify_teachers", "reseed_teachers",
    "diag_dash_files", "fix_answer_rows",
    "admin_purge_rounds", "admin_preview_rounds",
    "admin_list_exams_by_date", "admin_delete_exam_row",
    "admin_purge_duplicates", "admin_merge_multischool",
    // Slack 제거 (워크스페이스 정지 이슈)
    "send_slack_test"
  ];
  if (DISABLED.indexOf(String(action||"")) >= 0) {
    return jsonOut_({
      result: "v28_disabled",
      message: "v28 단순화로 비활성화된 기능: " + action,
      hint: "필요 시 백업본으로 롤백 가능"
    });
  }
  return null;
}

function doPost(e) {
  if (!e || !e.postData) return jsonOut_({result:"error", message:"No POST data"});
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var action = data.action || "student_answer";

  // ★ v28 Phase 1: 비활성 action 즉시 차단
  var _v28Block = _v28BlockDisabled_(action);
  if (_v28Block) return _v28Block;

  // ★ v28 핵심: 워커 결과 등록 (새 흐름)
  if (action === "register_exam_gen_v28") {
    return registerExamGenResult_v28_(data);
  }

  // ── v12.2: 선생님 관리 CRUD (POST+JSON) — 한글 인코딩 이슈 회피용 ──
  if (action === "save_teacher") {
    return saveTeacherPost_(data);
  }
  if (action === "delete_teacher") {
    return deleteTeacherPost_(data);
  }

  // ── ★ v24: 교재 카테고리 변경 (사용자 수동 분류) ──
  if (action === "set_textbook_category") {
    return setTextbookCategory_(data);
  }
  // ── ★ v24.11: 추천 미니 시험 ──
  if (action === "recommend_mini_exam") {
    return recommendMiniExam_(data);
  }
  if (action === "submit_mini_exam_result") {
    return submitMiniExamResult_(data);
  }
  // ★ v25.4: AI 영역 분석 (문법/어휘/독해 자동 분류)
  if (action === "analyze_exam_categories") {
    return analyzeExamCategories_(data);
  }
  // ★ v25.4 → v27.1: 객관식 풀이 즉시 생성 (ExplanationsCache 우선 조회 → 캐시 미스 시 Gemini)
  if (action === "generate_explanations") {
    // ★ v27.3: 객관식 즉시 AI 풀이 비활성 (학생앱이 호출해도 안내 메시지만 반환)
    //   원인: GPT API 비용 + 학생들 클릭 빈도 낮음. 다음날 선생님 직접 보강이 더 효과적
    return jsonOut_({result:"disabled", message:"AI 즉시 풀이는 v27.3 에서 비활성화됨. 다음 수업에서 선생님이 설명해드릴게요."});
  }
  // ★ v25.4: 자동 등록 강제 재스캔 (이새나쌌 시험 등 처리)
  if (action === "force_rescan_exam_gen") {
    return forceRescanExamGen_(data);
  }
  // ★ v25.5: 시험 날짜 수정 (잘못 등록한 날짜 변경)
  if (action === "update_exam_date") {
    return updateExamDate_(data);
  }
  // ★ v25.9: 시험지 PDF에서 문항 본문 추출 (Top 7 영어 본문 자동 채움)
  if (action === "extract_questions_from_exam_pdf") {
    return extractQuestionsFromExamPdf_(data);
  }

  // ── v10: 오답노트 DOCX → 구글드라이브 업로드 ──
  if (action === "upload_to_drive") {
    try {
      var folderPath = data.folderPath || "";  // 예: "채움학원 시험자료/오답노트/데일리/2026.04.15"
      var filename = data.filename || "untitled.docx";
      var base64 = data.base64 || "";
      var mimeType = data.mimeType || "application/octet-stream";

      if (!base64) return jsonOut_({result:"error", message:"base64 데이터 없음"});

      // 폴더 경로를 순서대로 생성/탐색
      var parts = folderPath.split("/").filter(function(p){return p.trim();});
      var currentFolderId = null;

      // 첫 번째 파트는 루트 드라이브에서 찾기
      if (parts.length > 0) {
        var rootFolders = DriveApp.getFoldersByName(parts[0]);
        if (rootFolders.hasNext()) {
          currentFolderId = rootFolders.next().getId();
        } else {
          currentFolderId = DriveApp.createFolder(parts[0]).getId();
        }
        // 나머지 하위 폴더
        for (var fi = 1; fi < parts.length; fi++) {
          currentFolderId = getOrCreateSubFolder_(currentFolderId, parts[fi]);
        }
      }

      if (!currentFolderId) return jsonOut_({result:"error", message:"폴더 경로 생성 실패"});

      var folder = DriveApp.getFolderById(currentFolderId);

      // 같은 이름 파일이 이미 있으면 삭제 후 재생성 (덮어쓰기)
      var existing = folder.getFilesByName(filename);
      while (existing.hasNext()) {
        var old = existing.next();
        old.setTrashed(true);
      }

      var decoded = Utilities.base64Decode(base64);
      var blob = Utilities.newBlob(decoded, mimeType, filename);
      var file = folder.createFile(blob);

      return jsonOut_({
        result: "ok",
        fileId: file.getId(),
        fileUrl: file.getUrl(),
        folderUrl: folder.getUrl()
      });
    } catch(err) {
      return jsonOut_({result:"error", message: String(err)});
    }
  }

  // ── 교재 업로드 ──
  if (action === "upload_textbook") {
    return uploadTextbook_(data);
  }

  // ── 선생님: 정답 직접 입력 ──
  if (action === "save_answer_key") {
    var sheet = ss.getSheetByName("정답목록");
    if (!sheet) sheet = ss.insertSheet("정답목록");
    ensureAnswerSheetHeader_(sheet);
    // ★ 정답/유형 정규화 — 배열이든 객체든 항상 {"1":v,"2":v,...} 로 통일
    var _normAns = normalizeAnswerData(data.answers);
    var _normTyp = normalizeAnswerData(data.types);
    // ★ setType 우선, 없으면 round (하위호환) — F열(구 "차수")에 저장
    var _setTypeVal = normalizeSetType_(data.setType || data.round || "");
    // ★ v15: 검수 메타데이터 (verification + verificationStatus + questionNumberMap)
    // ★ v22.7: gradingMode 도 검수 메타데이터에 같이 저장 (loose=해석/번역, strict=단답)
    var _verObj = (data.verification && typeof data.verification === "object") ? data.verification : {};
    if (data.gradingMode) {
      _verObj.gradingMode = String(data.gradingMode).toLowerCase() === "loose" ? "loose" : "strict";
    }
    var _verJson = "";
    var _verStatus = "";
    if (Object.keys(_verObj).length > 0) {
      try { _verJson = JSON.stringify(_verObj); } catch(e) { _verJson = ""; }
      _verStatus = String(_verObj.status || (_verObj.crossCheckPassed ? "ok" : "warning") || "");
    }
    var _qNumMapJson = "";
    if (data.questionNumberMap && typeof data.questionNumberMap === "object") {
      try { _qNumMapJson = JSON.stringify(data.questionNumberMap); } catch(e) { _qNumMapJson = ""; }
    }
    // ★ v23.7: 안정성 강화 — 정규화된 답안 수가 totalQuestions 와 다르면 서버측에서 차단
    var _ansKeyCount = Object.keys(_normAns||{}).length;
    var _expectedCount = Number(data.totalQuestions) || 0;
    if (_expectedCount > 0 && _ansKeyCount > 0 && _ansKeyCount !== _expectedCount) {
      return jsonOut_({
        result: "error",
        message: "정답 수 불일치 — 시도 " + _expectedCount + "문항 / 실제 정답 " + _ansKeyCount + "개. 등록 차단 (데이터 보호).",
        sentTotal: _expectedCount,
        actualAnswers: _ansKeyCount
      });
    }
    sheet.appendRow([
      new Date().toLocaleString("ko-KR"),
      data.subject, data.grade, data.level, data.examType, _setTypeVal,
      data.totalQuestions, JSON.stringify(_normAns), JSON.stringify(_normTyp),
      data.teacher || "",
      Number(data.studentCount) || 0,
      data.className || "",
      data.date || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd"),
      data.folderId || "",  // 폴더ID (직접입력 + 파일 업로드 시 연결)
      Number(data.startNumber) || 1,  // O열: 시작번호
      _verJson,        // P열: 검수데이터 (JSON 문자열)
      _verStatus,      // Q열: 검수상태 (ok/warning/error)
      _qNumMapJson     // R열: 문제번호맵 (JSON 문자열, 비순차 번호용)
    ]);
    // ★ v23.7: 저장 후 즉시 재읽기로 무결성 확인 — 마지막 행의 정답 키 수가 일치하는지 검증
    var _newRowIdx = sheet.getLastRow();
    var _savedAnsRaw = String(sheet.getRange(_newRowIdx, 8).getValue() || "");
    var _savedCount = 0;
    try {
      var _savedObj = JSON.parse(_savedAnsRaw);
      _savedCount = Object.keys(_savedObj||{}).length;
    } catch(_e) { _savedCount = -1; }
    if (_expectedCount > 0 && _savedCount !== _expectedCount && _savedCount !== -1) {
      // 저장은 됐지만 무결성 깨짐 → 경고는 하되 학생앱은 동작
      return jsonOut_({
        result: "success",
        rowIndex: _newRowIdx,
        savedAnswers: _savedCount,
        totalQuestions: _expectedCount,
        warning: "저장 후 검증에서 정답 수 차이 발견 (저장=" + _savedCount + " / 예상=" + _expectedCount + ")"
      });
    }
    return jsonOut_({
      result: "success",
      rowIndex: _newRowIdx,
      savedAnswers: _savedCount,
      totalQuestions: _expectedCount
    });
  }
  // ── [v21.0] AI 3-API 답지 자동 추출 ──
  if (action === "ai_extract_answers") {
    return aiExtractAnswers_(data);
  }
  // ── [v21.0] 검수 확정 (선생님이 수동 확인 후 저장) ──
  if (action === "confirm_review") {
    return confirmReview_(data);
  }
  // ── [v21.1] 불일치 문항만 AI 재요청 + 다수결 ──
  if (action === "ai_retry_mismatches") {
    return aiRetryMismatches_(data);
  }
  // ── [v21.1] 검수 목록 삭제 ──
  if (action === "delete_review") {
    return deleteReview_(data);
  }
  // ── [v21.6] 주관식 채점 결과 저장 (학생앱 → Gemini → 결과 저장) ──
  if (action === "save_subjective_grade") {
    return saveSubjectiveGrade_(data);
  }
  // ── 문제 생성기: 상태 업데이트 (POST 지원 — 스케줄 태스크용, answerData 포함 가능) ──
  if (action === "update_exam_gen_status") {
    try {
      var ss3 = SpreadsheetApp.getActiveSpreadsheet();
      var genSheet3 = ss3.getSheetByName("문제생성큐");
      if (!genSheet3) return jsonOut_({result:"error", message:"문제생성큐 시트 없음"});
      var ri = parseInt(data.rowIndex || "0");
      if (ri < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
      var st = String(data.status || "").trim();
      if (!st) return jsonOut_({result:"error", message:"status 필요"});
      // ★ v12.4: 헤더 기반 동적 컬럼 매핑 — 객관식비율 추가로 컬럼 위치가 밀려도 안전
      var gHdr = genSheet3.getRange(1, 1, 1, genSheet3.getLastColumn()).getValues()[0];
      var gCol = {};
      for (var ghi=0; ghi<gHdr.length; ghi++) gCol[String(gHdr[ghi]).trim()] = ghi + 1;
      var colOf = function(key, fallback) { return gCol[key] || fallback; };
      // 상태
      genSheet3.getRange(ri, colOf("상태", 2)).setValue(st);
      // 결과파일ID (A세트)
      if (data.resultFileId) genSheet3.getRange(ri, colOf("결과파일ID", 18)).setValue(String(data.resultFileId));
      // ★ v14: B세트 결과파일ID (백업)
      if (data.resultFileIdB) {
        ensureExamGenColumn_(genSheet3, "결과파일ID_B");
        // gCol 갱신
        gHdr = genSheet3.getRange(1, 1, 1, genSheet3.getLastColumn()).getValues()[0];
        gCol = {}; for (var ghi2=0; ghi2<gHdr.length; ghi2++) gCol[String(gHdr[ghi2]).trim()] = ghi2 + 1;
        genSheet3.getRange(ri, gCol["결과파일ID_B"]).setValue(String(data.resultFileIdB));
      }
      // ★ v14: 활성세트 (기본 A) — 워커가 명시 안 하면 기존값 유지/없으면 A
      if (data.activeSet) {
        ensureExamGenColumn_(genSheet3, "활성세트");
        gHdr = genSheet3.getRange(1, 1, 1, genSheet3.getLastColumn()).getValues()[0];
        gCol = {}; for (var ghi3=0; ghi3<gHdr.length; ghi3++) gCol[String(gHdr[ghi3]).trim()] = ghi3 + 1;
        genSheet3.getRange(ri, gCol["활성세트"]).setValue(String(data.activeSet));
      } else if (st === "완료") {
        // 완료 시 활성세트 비어있으면 A로 초기화
        ensureExamGenColumn_(genSheet3, "활성세트");
        gHdr = genSheet3.getRange(1, 1, 1, genSheet3.getLastColumn()).getValues()[0];
        gCol = {}; for (var ghi4=0; ghi4<gHdr.length; ghi4++) gCol[String(gHdr[ghi4]).trim()] = ghi4 + 1;
        var existingActive = genSheet3.getRange(ri, gCol["활성세트"]).getValue();
        if (!existingActive) genSheet3.getRange(ri, gCol["활성세트"]).setValue("A");
      }
      // 완료시각
      if (st === "완료" || st === "실패") {
        genSheet3.getRange(ri, colOf("완료시각", 19)).setValue(data.completedAt || new Date().toLocaleString("ko-KR"));
      }
      // answerData → "정답데이터" 컬럼 (없으면 시트 끝에 자동 추가)
      if (data.answerData) {
        var adStr = typeof data.answerData === "string" ? data.answerData : JSON.stringify(data.answerData);
        var adCol = gCol["정답데이터"];
        if (!adCol) {
          // 컬럼이 없으면 추가
          adCol = genSheet3.getLastColumn() + 1;
          genSheet3.getRange(1, adCol).setValue("정답데이터");
        }
        genSheet3.getRange(ri, adCol).setValue(adStr);
      }
      // ★ 완료 시 정답목록에 자동 등록 (학생앱에서 바로 검색 가능)
      if (st === "완료") {
        try {
          autoRegisterExamFromGen_(genSheet3, ri, data.answerData);
        } catch(autoErr) {
          // 자동 등록 실패해도 상태 업데이트는 성공으로 처리
          Logger.log("[autoRegister] 자동 등록 실패: " + String(autoErr));
        }
      }
      return jsonOut_({result:"ok", message:"상태 업데이트 완료: " + st});
    } catch(err3) {
      return jsonOut_({result:"error", message:String(err3)});
    }
  }
  // ── 문제 생성 요청 삭제 ──
  if (action === "delete_exam_gen") {
    try {
      var ss4 = SpreadsheetApp.getActiveSpreadsheet();
      var genSheet4 = ss4.getSheetByName("문제생성큐");
      if (!genSheet4) return jsonOut_({result:"error", message:"문제생성큐 시트 없음"});
      var delRow = parseInt(data.rowIndex || "0");
      if (delRow < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
      genSheet4.deleteRow(delRow);
      return jsonOut_({result:"ok", message:"삭제 완료"});
    } catch(err4) {
      return jsonOut_({result:"error", message:String(err4)});
    }
  }

  // ── ★ v14: 문제 세트 swap (A ↔ B) ──
  //  선생님이 현재 등록된 A세트가 마음에 안 들 때 B세트로 교체.
  //  동작: 활성세트 값 토글 + 학생앱이 보는 "정답목록" 시트의 정답도 B쪽으로 재등록.
  if (action === "swap_exam_set") {
    try {
      var ssSwap = SpreadsheetApp.getActiveSpreadsheet();
      var gSheetSwap = ssSwap.getSheetByName("문제생성큐");
      if (!gSheetSwap) return jsonOut_({result:"error", message:"문제생성큐 시트 없음"});
      var swapRow = parseInt(data.rowIndex || "0");
      if (swapRow < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
      // 헤더 맵
      ensureExamGenColumn_(gSheetSwap, "결과파일ID_B");
      ensureExamGenColumn_(gSheetSwap, "활성세트");
      var sHdr = gSheetSwap.getRange(1, 1, 1, gSheetSwap.getLastColumn()).getValues()[0];
      var sCol = {};
      for (var shi=0; shi<sHdr.length; shi++) sCol[String(sHdr[shi]).trim()] = shi + 1;
      var colA = sCol["결과파일ID"];
      var colB = sCol["결과파일ID_B"];
      var colActive = sCol["활성세트"];
      if (!colA || !colB || !colActive) return jsonOut_({result:"error", message:"필요한 컬럼 누락(A/B/활성세트)"});
      var fidA = String(gSheetSwap.getRange(swapRow, colA).getValue() || "").trim();
      var fidB = String(gSheetSwap.getRange(swapRow, colB).getValue() || "").trim();
      var cur = String(gSheetSwap.getRange(swapRow, colActive).getValue() || "A").trim();
      if (!fidB) return jsonOut_({result:"error", message:"B세트 백업이 없음 — 교체 불가"});
      var next = (cur === "A") ? "B" : "A";
      gSheetSwap.getRange(swapRow, colActive).setValue(next);
      // 학생앱이 실제로 다른 문제를 보게 하려면, "정답목록" 시트의 정답도 교체해야 함.
      // 방법: autoRegisterExamFromGen_ 을 재실행하되 B 파일을 기준으로 사용.
      try {
        var headerRow = sHdr;
        var rowData = gSheetSwap.getRange(swapRow, 1, 1, gSheetSwap.getLastColumn()).getValues()[0];
        var activeFid = (next === "A") ? fidA : fidB;
        if (activeFid && activeFid.length > 5) {
          var file2 = DriveApp.getFileById(activeFid);
          var content2 = file2.getBlob().getDataAsString();
          var parsed2 = parseAnswerDoc_(content2);
          if (parsed2) {
            // 활성 세트의 정답데이터로 정답목록 덮어쓰기
            autoRegisterExamFromGen_(gSheetSwap, swapRow, parsed2);
          }
        }
      } catch(swapRegErr) {
        Logger.log("[swap_exam_set] 정답목록 재등록 실패(무시): " + String(swapRegErr));
      }
      return jsonOut_({result:"ok", message:"세트 교체 완료", activeSet: next, _v:"v14"});
    } catch(errSwap) {
      return jsonOut_({result:"error", message:"swap_exam_set 예외: "+String(errSwap)});
    }
  }
  // ── 문제 생성 요청 큐 저장 ──
  if (action === "request_exam_gen") {
    var ss2 = SpreadsheetApp.getActiveSpreadsheet();
    var genSheet = ss2.getSheetByName("문제생성큐");
    if (!genSheet) {
      genSheet = ss2.insertSheet("문제생성큐");
      // ★ v12.3: 객관식비율(mcRatio) 컬럼 추가 — "문제수"와 "난이도_쉬움" 사이
      // ★ v14: 결과파일ID_B (B세트 백업), 활성세트 (A/B) 추가
      genSheet.appendRow([
        "요청시각","상태","교재","교재ID","범위유형","범위설명",
        "챕터목록","시작페이지","끝페이지","시험유형","문제수","객관식비율",
        "난이도_쉬움","난이도_보통","난이도_어려움",
        "선생님","대상반","시험구분","시험날짜","시험시간","메모","결과파일ID","완료시각",
        "결과파일ID_B","활성세트"
      ]);
    } else {
      // 기존 시트에 "시험구분" 컬럼이 없으면 추가 (메모 앞)
      try {
        var hdr = genSheet.getRange(1,1,1,genSheet.getLastColumn()).getValues()[0];
        var hasSet = false;
        for (var hi=0; hi<hdr.length; hi++) { if (String(hdr[hi])==="시험구분") { hasSet=true; break; } }
        if (!hasSet) {
          var memoIdx = -1;
          for (var hj=0; hj<hdr.length; hj++) { if (String(hdr[hj])==="메모") { memoIdx=hj+1; break; } }
          if (memoIdx > 0) {
            genSheet.insertColumnBefore(memoIdx);
            genSheet.getRange(1, memoIdx).setValue("시험구분");
          }
        }
      } catch(colErr) { /* 컬럼 추가 실패 시 조용히 무시 */ }
      // ★ v12.3: 기존 시트에 "객관식비율" 컬럼이 없으면 "난이도_쉬움" 앞에 삽입
      try {
        var hdr2 = genSheet.getRange(1,1,1,genSheet.getLastColumn()).getValues()[0];
        var hasMc = false;
        for (var hk=0; hk<hdr2.length; hk++) { if (String(hdr2[hk])==="객관식비율") { hasMc=true; break; } }
        if (!hasMc) {
          var diffIdx = -1;
          for (var hl=0; hl<hdr2.length; hl++) { if (String(hdr2[hl])==="난이도_쉬움") { diffIdx=hl+1; break; } }
          if (diffIdx > 0) {
            genSheet.insertColumnBefore(diffIdx);
            genSheet.getRange(1, diffIdx).setValue("객관식비율");
          }
        }
      } catch(mcErr) { /* 무시 */ }
      // ★ v14: 결과파일ID_B / 활성세트 마이그레이션
      try { ensureExamGenColumn_(genSheet, "결과파일ID_B"); } catch(_eb) {}
      try { ensureExamGenColumn_(genSheet, "활성세트"); } catch(_ea) {}
      // ★ v20.2: 시험날짜 / 시험시간 컬럼 마이그레이션 (메모 앞에 삽입)
      try {
        var hdrD = genSheet.getRange(1,1,1,genSheet.getLastColumn()).getValues()[0];
        var hasDate = false, hasTime = false;
        for (var hd=0; hd<hdrD.length; hd++) {
          if (String(hdrD[hd])==="시험날짜") hasDate = true;
          if (String(hdrD[hd])==="시험시간") hasTime = true;
        }
        if (!hasDate) {
          var mIdxD = -1;
          for (var hm=0; hm<hdrD.length; hm++) { if (String(hdrD[hm])==="메모") { mIdxD=hm+1; break; } }
          if (mIdxD > 0) {
            genSheet.insertColumnBefore(mIdxD);
            genSheet.getRange(1, mIdxD).setValue("시험날짜");
          }
        }
        if (!hasTime) {
          var hdrD2 = genSheet.getRange(1,1,1,genSheet.getLastColumn()).getValues()[0];
          var mIdxT = -1;
          for (var ht=0; ht<hdrD2.length; ht++) { if (String(hdrD2[ht])==="메모") { mIdxT=ht+1; break; } }
          if (mIdxT > 0) {
            genSheet.insertColumnBefore(mIdxT);
            genSheet.getRange(1, mIdxT).setValue("시험시간");
          }
        }
      } catch(dtErr) { /* 무시 */ }
    }
    // ★ v12.3: 헤더 동적 매핑 — 컬럼 위치가 바뀌어도 안전하게 저장
    var headerRow = genSheet.getRange(1,1,1,genSheet.getLastColumn()).getValues()[0];
    var colMap = {};
    for (var ci=0; ci<headerRow.length; ci++) colMap[String(headerRow[ci]).trim()] = ci;
    var rowArr = new Array(headerRow.length).fill("");
    var mcRatio = (data.mcRatio === undefined || data.mcRatio === null || data.mcRatio === "") ? 100 : Number(data.mcRatio);
    if (isNaN(mcRatio) || mcRatio < 0) mcRatio = 100;
    if (mcRatio > 100) mcRatio = 100;
    var fields = {
      "요청시각": new Date().toLocaleString("ko-KR"),
      "상태": "대기",
      "교재": data.textbook || "",
      "교재ID": data.textbookId || "",
      "범위유형": data.rangeType || "",
      "범위설명": data.rangeDesc || "",
      "챕터목록": Array.isArray(data.chapters) ? data.chapters.join("||") : "",
      "시작페이지": data.pageFrom || "",
      "끝페이지": data.pageTo || "",
      "시험유형": data.testType || "grammar",
      "문제수": Number(data.questionCount) || 20,
      "객관식비율": mcRatio,
      "난이도_쉬움": Number((data.difficulty||{}).easy) || 30,
      "난이도_보통": Number((data.difficulty||{}).medium) || 50,
      "난이도_어려움": Number((data.difficulty||{}).hard) || 20,
      "선생님": data.teacher || "",
      "대상반": data.targetClass || "",
      "시험구분": normalizeSetType_(data.setType || ""),
      "시험날짜": data.examDate || "",   // ★ v20.2: 시험 날짜 (YYYY-MM-DD)
      "시험시간": data.examTime || "",   // ★ v20.2: 시험 시간 (HH:MM)
      "메모": buildGenMemo_(data, mcRatio),  // ★ mcRatio 지시문을 메모에 자동 합성
      "결과파일ID": "",
      "완료시각": ""
    };
    for (var key in fields) {
      if (colMap[key] !== undefined) rowArr[colMap[key]] = fields[key];
    }
    genSheet.appendRow(rowArr);
    return jsonOut_({result:"success", message:"생성 요청이 대기열에 추가되었습니다."});
  }
  // ── 선생님: 파일 업로드 → Google Drive 저장 ──
  if (action === "upload_exam") {
    try {
    Logger.log("[upload_exam] keys=" + Object.keys(data).join(","));
    Logger.log("[upload_exam] date=" + data.date + " time=" + data.time +
               " datetime=" + data.datetime + " examTime=" + data.examTime);
    // ★ v20.1: 요청 크기 로깅 (Drive 저장 실패 원인 추적용)
    try {
      var _afSz = 0, _efSz = 0;
      if (data.answerFiles) for (var _i=0;_i<data.answerFiles.length;_i++) _afSz += (data.answerFiles[_i].data||"").length;
      if (data.examFiles)   for (var _j=0;_j<data.examFiles.length;_j++)   _efSz += (data.examFiles[_j].data||"").length;
      Logger.log("[upload_exam] answerBytes≈"+_afSz+" examBytes≈"+_efSz+" total≈"+(_afSz+_efSz));
    } catch(_sz){}
    var rootId = getOrCreateFolder_("채움학원 시험자료");
    var rawTime = data.time || data.examTime || data.startTime || "";
    var timeRe = /(\d{1,2})\s*[:시]\s*(\d{1,2})/;
    if (!rawTime && data.datetime) {
      var md = String(data.datetime).match(timeRe);
      if (md) rawTime = md[1] + ":" + md[2];
    }
    if (!rawTime && data.date) {
      var md2 = String(data.date).match(timeRe);
      if (md2) rawTime = md2[1] + ":" + md2[2];
    }
    var dateStr = String(data.date || "").split(/\s+/)[0];
    if (!dateStr && data.datetime) dateStr = String(data.datetime).split(/\s+/)[0];
    if (!dateStr) dateStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd");
    var dateFolderId = getOrCreateSubFolder_(rootId, dateStr);
    var timeStr = "";
    if (rawTime) {
      var tParts = rawTime.replace(/\s/g, "").split(":");
      if (tParts.length >= 2) {
        var hh = ("0" + tParts[0]).slice(-2);
        var mm = ("0" + tParts[1]).slice(-2);
        timeStr = hh + "시" + mm + "분";
      } else {
        timeStr = rawTime;
      }
    }
    if (!timeStr) timeStr = "시간미정";
    var classList = [];
    if (Array.isArray(data.classNames)) classList = data.classNames;
    else if (typeof data.classNames === "string" && data.classNames) {
      classList = data.classNames.split(",").map(function(s){return s.trim();}).filter(Boolean);
    }
    var firstClass = classList[0] || (data.className || "반미지정");
    var classTag = firstClass.replace(/\s+/g, "");
    if (classList.length > 1) classTag += "외" + (classList.length - 1);
    var subjectTag = [data.subject, data.grade, data.level].filter(Boolean).join("");
    var examTag = data.examType || "시험";
    // setType 우선(이론편/실전편/혼합), 없으면 round 하위호환
    var roundTag = normalizeSetType_(data.setType || data.round || "");
    var examFolderName = [timeStr, examTag, (roundTag?roundTag:""), subjectTag, classTag].filter(Boolean).join("_");
    examFolderName = examFolderName.replace(/[\\/:*?"<>|]/g, "");
    // ★ v19: 선생님 하위폴더 삽입 (Date/Teacher/ExamFolder)
    //   - 같은 시험지를 여러 선생님이 업로드해도 채점이 섞이지 않도록 폴더부터 분리
    //   - teacher 누락 시 "_미분류_" 버킷으로 수집 (추후 수동 이동 가능)
    var teacherName = String(data.teacher || "").trim() || "_미분류_";
    teacherName = teacherName.replace(/[\\/:*?"<>|]/g, "");
    var teacherFolderId = getOrCreateSubFolder_(dateFolderId, teacherName);
    // ★ v26.4 (2026-05-13): _appendFolderId 모드 — 큰 페이로드 분할 호출용
    //   클라이언트가 첫 호출에서 폴더 생성 후, 추가 파일들은 같은 폴더에 append
    //   (GAS 6분 timeout 안전 + 파일별 개별 호출)
    var examFolderId;
    var examFolder;
    var _isAppendMode = !!data._appendFolderId;
    if (_isAppendMode) {
      try {
        examFolderId = data._appendFolderId;
        examFolder = DriveApp.getFolderById(examFolderId);
      } catch(_eFid) {
        // 폴더ID 가 잘못됐으면 새 폴더 생성 (안전망)
        examFolderId = createUniqueSubFolder_(teacherFolderId, examFolderName);
        examFolder = DriveApp.getFolderById(examFolderId);
        _isAppendMode = false;
      }
    } else {
      examFolderId = createUniqueSubFolder_(teacherFolderId, examFolderName);
      examFolder = DriveApp.getFolderById(examFolderId);
    }
    var savedFiles = [];
    var failedFiles = [];  // ★ v26.0 (2026-05-13): 업로드 실패 파일 추적
    if (data.answerFiles) {
      for (var i = 0; i < data.answerFiles.length; i++) {
        var af = data.answerFiles[i];
        try {
          var blob = Utilities.newBlob(Utilities.base64Decode(af.data), af.type, af.name);
          var file = examFolder.createFile(blob);
          savedFiles.push({name: af.name, url: file.getUrl(), type: "answer"});
        } catch(_eA) {
          // ★ v26.0: 단일 파일 실패해도 다른 파일은 계속 시도
          Logger.log("[upload_exam answerFile fail] " + af.name + ": " + _eA);
          failedFiles.push({name: af.name, type: "answer", error: String(_eA).slice(0,200)});
        }
      }
    }
    if (data.examFiles) {
      for (var j = 0; j < data.examFiles.length; j++) {
        var ef = data.examFiles[j];
        try {
          var blob2 = Utilities.newBlob(Utilities.base64Decode(ef.data), ef.type, ef.name);
          var file2 = examFolder.createFile(blob2);
          savedFiles.push({name: ef.name, url: file2.getUrl(), type: "exam"});
        } catch(_eE) {
          Logger.log("[upload_exam examFile fail] " + ef.name + ": " + _eE);
          failedFiles.push({name: ef.name, type: "exam", error: String(_eE).slice(0,200)});
        }
      }
    }
    // ★ v26.0: 전부 실패 시 빈 폴더 자동 휴지통 + Slack 알림
    if (savedFiles.length === 0 && failedFiles.length > 0) {
      try { examFolder.setTrashed(true); } catch(_eT){}
      try { slackSend_("🚨 *업로드 전체 실패* — " + (data.teacher||"(미상)") + " / " + (data.subject||"") + " " + (data.grade||"") + "\n• 모든 파일 업로드 실패 → 빈 폴더 휴지통 이동\n• 실패 파일: " + failedFiles.map(function(f){return f.name+" ("+f.error.slice(0,80)+")";}).join("\n• ")); } catch(_sIgn){}
      return jsonOut_({result:"error", message:"모든 파일 업로드 실패. 작은 PDF로 다시 시도해주세요.", failedFiles: failedFiles});
    }
    // 일부만 실패 시 — 사용자에게 알림
    if (failedFiles.length > 0) {
      try { slackSend_("⚠️ *부분 업로드 실패* — " + (data.teacher||"(미상)") + "\n• 성공: " + savedFiles.length + "개 / 실패: " + failedFiles.length + "개\n• 실패 파일: " + failedFiles.map(function(f){return f.name;}).join(", ")); } catch(_sIgn){}
    }
    // ★ v26.4: append 모드면 시험정보.txt 와 업로드기록 등록 skip (첫 호출에서 이미 생성됨)
    if (!_isAppendMode) {
      var info = buildExamInfoText_(data, classList, savedFiles, dateStr, rawTime);
      examFolder.createFile("시험정보.txt", info, MimeType.PLAIN_TEXT);
      // C. 파일 swap 휴리스틱 감지 (업로드는 그대로 진행)
      try { detectFileSwap_(data, examFolder); } catch(swIgn){}
    }
    var uploadSheet = ss.getSheetByName("업로드기록");
    if (!uploadSheet) {
      uploadSheet = ss.insertSheet("업로드기록");
      uploadSheet.appendRow([
        "등록일시","과목","학년","레벨","대상반","시험종류","시험날짜","시험시간",
        "메모","파일목록","폴더링크","상태","선생님","예상인원","주관식힌트","차수"
      ]);
    }
    var subjHint = "";
    if (data.subjMode === "auto") subjHint = "AI 자동판별";
    else if (data.subjMode === "direct") subjHint = "직접입력";
    else if (data.subjMode === "none") subjHint = "전체 객관식";
    else if (data.subjMode === "all") subjHint = "전체 주관식";
    else if (data.subjMode === "mixed") {
      subjHint = "혼합";
      if (data.subjRanges) subjHint += " | 주관식: " + data.subjRanges;
      else subjHint += " | (주관식 번호 미지정)";
    }
    else subjHint = "AI 자동판별"; // 기본값
    // ★ v26.4: append 모드면 업로드기록 row 추가 skip (첫 호출에서 이미 추가됨)
    if (!_isAppendMode) {
      uploadSheet.appendRow([
        new Date().toLocaleString("ko-KR"),
        // ★ v27.17 (2026-05-30): 업로드기록 과목/학년/레벨 빈칸 픽스.
        //   원인: 선생님앱이 upload_exam 에 top-level subject/grade/level 대신 classes:[{...}] 로만 보냄
        //         → data.subject 가 undefined → 과목/학년/레벨 컬럼이 통째로 비어 대시보드·매칭이 깨짐.
        //   해결: top-level 없으면 classes[0] 에서 폴백(구 클라이언트는 top-level 그대로 사용).
        data.subject || (data.classes && data.classes[0] && data.classes[0].subject) || "",
        data.grade  || (data.classes && data.classes[0] && data.classes[0].grade)  || "",
        data.level  || (data.classes && data.classes[0] && data.classes[0].level)  || "",
        classList.join(", "),
        data.examType || "",
        dateStr || "",
        rawTime || "",
        data.memo || "",
        savedFiles.map(function(f){return f.name;}).join(", "),
        examFolder.getUrl(),
        "대기중 (Claude 분석 필요)",
        data.teacher || "",
        Number(data.studentCount) || 0,
        subjHint,
        roundTag || ""
      ]);
    }
    // ★ v23.6: 업로드 시 캐시 무효화 — 다음 대시보드 호출이 새 파일 보이도록
    try {
      var _ckUp = CacheService.getScriptCache();
      _ckUp.remove("last_mirror_scan");
      _ckUp.remove("fld_" + examFolderId);
      // ★ v27.16 (2026-05-30): 대시보드 응답 캐시(dash_날짜_선생님)도 무효화
      //   원인: 기존엔 last_mirror_scan만 지워서, teacherDashboard_ 의 5분 응답 캐시(dash_*)가
      //         그대로 남아 "업로드했는데 오늘의 현황에 안 뜸" 발생.
      //   해결: 업로드한 시험날짜 + 오늘 + (선생님 유/무) 조합의 dash_ 키를 모두 제거.
      var _dkeys = ["dash__"];
      var _dvariants = [];
      var _dmU = String(dateStr||"").match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      if (_dmU) {
        var _yU=_dmU[1], _mU=("0"+_dmU[2]).slice(-2), _dU=("0"+_dmU[3]).slice(-2);
        _dvariants.push(_yU+"-"+_mU+"-"+_dU, _yU+"."+_mU+"."+_dU, String(dateStr).trim());
      } else if (dateStr) { _dvariants.push(String(dateStr).trim()); }
      var _tzU = Session.getScriptTimeZone() || "Asia/Seoul";
      _dvariants.push(Utilities.formatDate(new Date(), _tzU, "yyyy-MM-dd"),
                      Utilities.formatDate(new Date(), _tzU, "yyyy.MM.dd"), "");
      var _tchU = String(data.teacher||"").trim();
      _dvariants.forEach(function(dv){
        _dkeys.push("dash_"+dv+"_");
        if (_tchU) _dkeys.push("dash_"+dv+"_"+_tchU);
      });
      if (_tchU) _dkeys.push("dash__"+_tchU);
      _ckUp.removeAll(_dkeys);
    } catch(_cUI) {}
    // ★ v25.7 (2026-05-13): 직접 업로드 "파일 없음" 버그 픽스
    //   원인: 업로드 직후 정답목록 행 만들기 전에 대시보드가 호출되면 r[18] 폴더메타JSON 비어있고
    //         r[13] 폴더ID도 없어서 → hasExamFile=false, hasAnswerFile=false → "⚠️ 파일 없음"
    //   해결: upload_exam 직후 폴더메타JSON 캐시를 미리 채워넣음 (5분 TTL)
    //         정답목록 행 만들어지면 v24.9 findFolderIdFromUploadRecord_ 가 자동 연결 + r[18] 영구 저장
    try {
      var _explicitKindMap = {};
      try {
        var _infoFiles = examFolder.getFilesByName("시험정보.txt");
        if (_infoFiles.hasNext()) {
          var _infoTxt = _infoFiles.next().getBlob().getDataAsString("UTF-8");
          var _ansBlock = _infoTxt.match(/●\s*정답지[\s\S]*?(?=●|\[|$)/);
          var _examBlock = _infoTxt.match(/●\s*시험지[\s\S]*?(?=●|\[|$)/);
          if (_ansBlock) _ansBlock[0].split("\n").forEach(function(l){ var m=l.match(/^\s*-\s*(.+?)\s*$/); if(m) _explicitKindMap[m[1].trim().toLowerCase()] = "answer"; });
          if (_examBlock) _examBlock[0].split("\n").forEach(function(l){ var m=l.match(/^\s*-\s*(.+?)\s*$/); if(m) _explicitKindMap[m[1].trim().toLowerCase()] = "exam"; });
        }
      } catch(_infoIgn) {}
      var _metaFiles = [];
      var _metaHasExam = false;
      var _metaHasAnswer = false;
      var _allFiles = examFolder.getFiles();
      while (_allFiles.hasNext()) {
        var _mf = _allFiles.next();
        var _mn = _mf.getName();
        var _ml = _mn.toLowerCase();
        if (_mn === "시험정보.txt") continue;
        if (!/\.(pdf|docx?|hwpx?|jpg|jpeg|png|zip|xlsx|pptx?)$/i.test(_ml)) continue;
        var _kind = _explicitKindMap[_ml] || (/(정답|답지|답안|해설|풀이)/.test(_mn) || /(answer|solution|key)/i.test(_ml) ? "answer" : "exam");
        if (_kind === "answer") _metaHasAnswer = true;
        else _metaHasExam = true;
        _metaFiles.push({id: _mf.getId(), name: _mn, size: _mf.getSize(), kind: _kind});
      }
      var _fileMeta = {
        examTime: rawTime || "",
        folderLink: examFolder.getUrl(),
        hasExamFile: _metaHasExam,
        hasAnswerFile: _metaHasAnswer,
        files: _metaFiles,
        scannedAt: Date.now()
      };
      var _fileMetaJson = JSON.stringify(_fileMeta);
      CacheService.getScriptCache().put("fld_" + examFolderId, _fileMetaJson, 600);  // 10분 TTL
    } catch(_cPre){}
    // ★ v27.4 (2026-05-15): 응답에 명시 카운트 추가 — 클라이언트가 누락 검증 가능
    var _savedExamCount = savedFiles.filter(function(f){return f.type==="exam";}).length;
    var _savedAnswerCount = savedFiles.filter(function(f){return f.type==="answer";}).length;
    var _expectedExamCount = (data.examFiles||[]).length;
    var _expectedAnswerCount = (data.answerFiles||[]).length;
    // 누락 발견 시 GAS 실행 로그에 기록 (Slack 비활성)
    if (_savedExamCount < _expectedExamCount || _savedAnswerCount < _expectedAnswerCount) {
      Logger.log("🚨 [upload_exam 누락 감지] " + (data.teacher||"") + " / " + (data.subject||"") + " " + (data.grade||"") +
        "\n  예상: 시험지 " + _expectedExamCount + " + 정답지 " + _expectedAnswerCount +
        "\n  실제: 시험지 " + _savedExamCount + " + 정답지 " + _savedAnswerCount +
        "\n  폴더: " + examFolder.getUrl());
      // 자동처리로그 시트에도 기록 (사용자가 나중에 확인 가능)
      try {
        var _logSh = ss.getSheetByName("자동처리로그");
        if (!_logSh) { _logSh = ss.insertSheet("자동처리로그"); _logSh.appendRow(["처리시각","폴더경로","결과","메시지"]); }
        _logSh.appendRow([new Date().toLocaleString("ko-KR"), examFolder.getUrl(), "upload_partial",
          "예상 시험지 " + _expectedExamCount + " 정답지 " + _expectedAnswerCount +
          " / 실제 시험지 " + _savedExamCount + " 정답지 " + _savedAnswerCount + " — " + (data.teacher||"")]);
      } catch(_eL){}
    }
    return jsonOut_({
      result: "success",
      folderId: examFolderId,
      folderUrl: examFolder.getUrl(),
      folderName: examFolderName,
      files: savedFiles,
      failedFiles: failedFiles,
      // ★ v27.4: 명시 카운트 (클라이언트 누락 검증용)
      savedExamCount: _savedExamCount,
      savedAnswerCount: _savedAnswerCount,
      expectedExamCount: _expectedExamCount,
      expectedAnswerCount: _expectedAnswerCount
    });
    } catch(uploadErr) {
      // ★ v20.1: 업로드 실패 시 Slack + 자동처리로그 시트에 자동 기록
      var errMsg = String(uploadErr && uploadErr.stack ? uploadErr.stack : uploadErr);
      Logger.log("[upload_exam][ERROR] " + errMsg);
      try {
        var _ssErr = SpreadsheetApp.getActiveSpreadsheet();
        var _logSh = _ssErr.getSheetByName("자동처리로그");
        if (!_logSh) { _logSh = _ssErr.insertSheet("자동처리로그"); _logSh.appendRow(["처리시각","폴더경로","결과","메시지"]); }
        _logSh.appendRow([new Date().toLocaleString("ko-KR"), "upload_exam", "error",
          "teacher=" + (data.teacher||"") + " subject=" + (data.subject||"") + " / " + errMsg.substring(0, 500)]);
      } catch(_lIgn){}
      try { slackSend_("🚨 *업로드 실패* — " + (data.teacher||"(미상)") + " / " + (data.subject||"") + " " + (data.grade||"") + "\n• 오류: " + errMsg.substring(0, 300)); } catch(_sIgn){}
      return jsonOut_({result:"error", message:"업로드 실패: " + errMsg.substring(0, 300)});
    }
  }
  // ── 주관식 채점 결과 업데이트 ──
  if (action === "update_grading") {
    var sheet = ss.getSheetByName("학생답안기록");
    if (!sheet) return jsonOut_({result:"error", message:"학생답안기록 시트 없음"});
    var rows = sheet.getDataRange().getValues();
    var updated = 0;
    var updates = data.updates || []; // [{name, phone, examName, date, score, correct, wrong, wrongQuestions, gradingDetails}]
    for (var u = 0; u < updates.length; u++) {
      var up = updates[u];
      for (var r = rows.length - 1; r >= 1; r--) {
        var row = rows[r];
        if (String(row[1]||"").trim() === String(up.name||"").trim() &&
            String(row[2]||"").trim() === String(up.phone||"").trim() &&
            String(row[7]||"").trim() === String(up.examName||"").trim()) {
          // 날짜도 확인 (같은 날 같은 시험)
          var rowDate = String(row[8]||"").trim();
          var upDate = String(up.date||"").trim();
          if (upDate && rowDate && rowDate !== upDate) continue;
          // 점수 업데이트
          sheet.getRange(r+1, 10).setValue(up.score);           // 점수
          sheet.getRange(r+1, 11).setValue(up.correct);         // 정답수
          sheet.getRange(r+1, 12).setValue(up.wrong);           // 오답수
          sheet.getRange(r+1, 14).setValue(up.wrongQuestions||""); // 틀린문항
          // 채점상세 저장
          if (up.gradingDetails) {
            var lastCol = sheet.getLastColumn();
            // ★ v27.18 (2026-05-30): 구 update_grading 경로도 P열(선생님)을 덮지 않고 R열(주관식상세)에 저장
            if (lastCol < 18) {
              sheet.getRange(1, 18).setValue("주관식상세");
            }
            sheet.getRange(r+1, 18).setValue(typeof up.gradingDetails === "string" ? up.gradingDetails : JSON.stringify(up.gradingDetails));
          }
          updated++;
          break;
        }
      }
    }
    if (updated > 0) {
      try { clearClassGradesCache_(); } catch(_eCg) {}
    }
    return jsonOut_({result:"success", updated: updated});
  }
  // ── 학생: 답안 제출 (v6: phone 포함, 학생답안기록 탭 사용) ──
  // ★ v12.5: action 명시 확인 — 알 수 없는 action 이 여기로 흘러들어오지 않도록
  //   이전엔 아무 guard 없어서 save_teacher 등이 실수로 학생답안으로 저장되던 버그 방지
  if (action !== "student_answer") {
    return jsonOut_({result:"error", message:"알 수 없는 action: '" + action + "' — Apps Script가 최신 버전으로 배포되었는지 확인하세요."});
  }
  // ★ v27.1 (2026-05-13): LockService 적용 — 동시 여러 학생 제출 시 시트 충돌 방지
  //   학생답안기록 시트는 여러 학생이 동시에 쓸 수 있어 락 필요
  var _lockResult = LockService.getScriptLock();
  try { _lockResult.waitLock(10000); } catch(_eL){ return jsonOut_({result:"error", message:"동시 처리 중. 잠시 후 다시 제출해주세요."}); }
  try {
  var sheet = ss.getSheetByName("학생답안기록");
  if (!sheet) sheet = ss.insertSheet("학생답안기록");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "제출일시","이름","폰뒷자리","반","과목","학년","레벨","시험명","날짜",
      "점수","정답","오답","총채점","틀린문항","답안원본","선생님","폴더ID","주관식상세","제출ID"
    ]);
    sheet.setFrozenRows(1);
  } else {
    // ★ v25.1: 컬럼 P/Q/R 헤더 보강 (선생님 매핑 정확도 개선용)
    // ★ v27.28 (2026-05-30): 오른쪽 빈 열이 삭제된 시트에서도 신규 제출ID 열을 안전하게 추가
    try { if (sheet.getMaxColumns && sheet.getMaxColumns() < 19) sheet.insertColumnsAfter(sheet.getMaxColumns(), 19 - sheet.getMaxColumns()); } catch(_eCols) {}
    if (sheet.getLastColumn() < 16) sheet.getRange(1, 16).setValue("선생님");
    if (sheet.getLastColumn() < 17) sheet.getRange(1, 17).setValue("폴더ID");
    if (sheet.getLastColumn() < 18) sheet.getRange(1, 18).setValue("주관식상세");
    if (sheet.getLastColumn() < 19) sheet.getRange(1, 19).setValue("제출ID");
  }
  // ③ 중복 제출 방지 — 같은 (이름+폰뒷자리+시험명+날짜) 이미 있으면 force=true 아니면 reject
  if (!data.force) {
    try {
      var chkRows = sheet.getDataRange().getValues();
      for (var ci = chkRows.length-1; ci >= 1; ci--) {
        var cr = chkRows[ci];
        if (String(cr[1]||"").trim() === String(data.name||"").trim() &&
            String(cr[2]||"").trim() === String(data.phone||"").trim() &&
            String(cr[7]||"").trim() === String(data.examName||"").trim() &&
            (!data.date || String(cr[8]||"").trim() === String(data.date||"").trim())) {
          return jsonOut_({
            result: "duplicate",
            message: "이미 제출됨 — 덮어쓰려면 force=true 와 함께 다시 제출하세요.",
            submittedAt: String(cr[0]||""),
            previousScore: cr[9]
          });
        }
      }
    } catch(cIgn){}
  }
  sheet.appendRow([
    new Date().toLocaleString("ko-KR"),
    data.name || "",
    data.phone || "",
    data.className || "",
    data.subject || "",
    data.grade || "",
    data.level || "",
    data.examName || "",
    data.date || "",
    data.score,
    data.correct,
    data.wrong,
    data.totalGraded,
    data.wrongQuestions ? (Array.isArray(data.wrongQuestions) ? data.wrongQuestions.join(", ") : String(data.wrongQuestions)) : "",
    data.answers ? JSON.stringify(data.answers) : "",
    data.teacher || "",          // ★ v25.1: P열 선생님 (학생-시험 매칭용)
    data.folderId || "",         // ★ v25.1: Q열 폴더ID (학생-시험 매칭용)
    "",                           // R열 주관식상세 (save_subjective_grade 시 채워짐)
    data.submitId || data.clientSubmitId || ""  // ★ v27.27: 주관식 후처리와 최초 제출 행을 안전하게 연결
  ]);
  // ★ v27.27 (2026-05-30): 새 학생 답안 저장 직후 반별성적 캐시 무효화
  // 제출 직후 선생님 화면(class_grades)에 새 학생/객관식 점수가 몇 분 늦게 보이는 문제 방지.
  try { clearClassGradesCache_(); } catch(_eCgSubmit) {}
  // B. 5건째/10건째 제출 시 타입 자동 보정 트리거 (과도한 호출 방지)
  try {
    var allRows = sheet.getDataRange().getValues();
    var cnt = 0;
    for (var ci = 1; ci < allRows.length; ci++) {
      if (String(allRows[ci][4]||"") === String(data.subject||"") &&
          String(allRows[ci][5]||"") === String(data.grade||"") &&
          String(allRows[ci][7]||"").indexOf(String(data.examName||"")) >= 0) cnt++;
    }
    if (cnt === 5 || cnt === 10 || cnt === 20) {
      var aSh2 = ss.getSheetByName("정답목록");
      if (aSh2 && aSh2.getLastRow() > 1) {
        var aR2 = aSh2.getDataRange().getValues();
        for (var ai = aR2.length-1; ai >= 1; ai--) {
          if (String(aR2[ai][1]||"") === String(data.subject||"") &&
              String(aR2[ai][2]||"") === String(data.grade||"") &&
              String(aR2[ai][4]||"") === String(data.examName||"").split(" ")[0]) {
            autoDetectTypeMismatch_(aR2[ai]);
            break;
          }
        }
      }
    }
  } catch(bIgn){}
  return jsonOut_({result:"success"});
  } finally {
    // ★ v27.1: LockService 해제
    try { _lockResult.releaseLock(); } catch(_eR){}
  }
}
function doGet(e) {
  if (!e || !e.parameter) return jsonOut_({result:"error", message:"No parameters"});

  // ★ v28 Phase 1: 비활성 action 즉시 차단
  var _v28BlockG = _v28BlockDisabled_(e.parameter.action);
  if (_v28BlockG) return _v28BlockG;

  // ★ v25.8 (2026-05-13): update_exam_date 를 GET 으로도 허용 (CORS 우회용)
  //   선생님앱이 POST application/json 으로 호출 시 preflight CORS 차단 → "Failed to fetch"
  //   GET 으로 URL 파라미터 받으면 CORS 자동 통과
  if (e.parameter.action === "update_exam_date") return updateExamDate_(e.parameter);
  // ★ v27.0 (2026-05-13): 캐시 기반 빠른 조회
  if (e.parameter.action === "get_class_stats_fast") return getClassStatsFast_(e);
  if (e.parameter.action === "get_teacher_dashboard_data") return getTeacherDashboardData_(e);
  // ★ v27.1 (2026-05-13): Phase 2 — 학생 통계·풀이·AI 검수 캐시
  if (e.parameter.action === "get_student_stats_fast") return getStudentStatsFast_(e);
  if (e.parameter.action === "get_student_home_data") return getStudentHomeData_(e);
  if (e.parameter.action === "get_ai_review_cache") return getAIReviewCache_(e);
  // v6 라우팅
  if (e.parameter.action === "list_exams_today") return listExamsToday_(e);
  if (e.parameter.action === "student_history") return studentHistory_(e);
  if (e.parameter.action === "teacher_dashboard") return teacherDashboard_(e);
  // ── 관리자 CRUD (선생님 목록 / 시험 스케줄) ──
  if (e.parameter.action === "list_teachers") return listTeachers_(e);
  if (e.parameter.action === "save_teacher") return saveTeacher_(e);
  if (e.parameter.action === "delete_teacher") return deleteTeacher_(e);
  // ★ v13: 선생님 시트 진단 + 강제 재분류 + 시드 재주입
  if (e.parameter.action === "diag_teachers") return diagTeachers_(e);
  if (e.parameter.action === "reclassify_teachers") return reclassifyTeachers_(e);
  if (e.parameter.action === "reseed_teachers") return reseedTeachers_(e);
  if (e.parameter.action === "list_schedule") return listSchedule_(e);
  if (e.parameter.action === "save_schedule") return saveSchedule_(e);
  if (e.parameter.action === "delete_schedule") return deleteSchedule_(e);
  if (e.parameter.action === "schedule_status") return scheduleStatus_(e);
  if (e.parameter.action === "send_slack_test") { sendSlackReminder(); return jsonOut_({result:"ok"}); }
  // ── [v21.0] AI 검수 ──
  if (e.parameter.action === "list_review_pending") return listReviewPending_(e);
  if (e.parameter.action === "get_review_pdf")      return getReviewPdf_(e);
  // ── [v21.1] 확정 답지 조회 ──
  if (e.parameter.action === "list_confirmed_answers") return listConfirmedAnswers_(e);
  if (e.parameter.action === "get_confirmed_detail")   return getConfirmedDetail_(e);
  // ── 교재 관리 ──
  if (e.parameter.action === "list_textbooks") return listTextbooks_(e);
  if (e.parameter.action === "list_chapters")  return listChapters_(e);   // ★ v24
  if (e.parameter.action === "diag_dash_files") return diagDashFiles_(e); // ★ v24.6: 대시보드 진단
  // ── 추천 미니 시험 라우팅 (★ v24.11) ──
  if (e.parameter.action === "list_mini_exam_progress") return listMiniExamProgress_(e);
  // ── 문제 생성기 라우팅 ──
  if (e.parameter.action === "list_exam_gen") return listExamGen_(e);
  if (e.parameter.action === "get_exam_gen_detail") return getExamGenDetail_(e);
  if (e.parameter.action === "update_exam_gen_status") return updateExamGenStatus_(e);
  if (e.parameter.action === "delete_exam_gen") return deleteExamGenGet_(e);
  if (e.parameter.action === "auto_register_exam_gen") return autoRegisterExamGenGet_(e);
  // ★ v12.5: 문제생성결과 폴더 수동 스캔 트리거
  if (e.parameter.action === "scan_exam_gen_results") {
    try {
      var ss0 = SpreadsheetApp.getActiveSpreadsheet();
      var ans0 = ss0.getSheetByName("정답목록") || ss0.insertSheet("정답목록");
      ensureAnswerSheetHeader_(ans0);
      var log0 = ss0.getSheetByName("자동처리로그");
      if (!log0) { log0 = ss0.insertSheet("자동처리로그"); log0.appendRow(["처리시각","폴더경로","결과","메시지"]); }
      var roots = DriveApp.getFoldersByName("채움학원 시험자료");
      if (!roots.hasNext()) return jsonOut_({result:"error", message:"채움학원 시험자료 폴더 없음"});
      scanExamGenResultsFolder_(roots.next(), ans0, log0);
      return jsonOut_({result:"ok", message:"문제생성결과 스캔 완료 — 자동처리로그 시트 확인"});
    } catch(err) {
      return jsonOut_({result:"error", message:String(err)});
    }
  }
  if (e.parameter.action === "update_textbook_chapters") return updateTextbookChapters_(e);
  // ── v7 자동화 라우팅 ──
  if (e.parameter.action === "list_submissions_by_date") return listSubmissionsByDate_(e);
  if (e.parameter.action === "list_print_jobs") return listPrintJobs_(e);
  if (e.parameter.action === "wrong_stats") return wrongStats_(e);
  if (e.parameter.action === "class_grades") return classGrades_(e);  // ★ v20.4: 반별 성적 (학생별)
  if (e.parameter.action === "list_folder_files") return listFolderFiles_(e);  // ★ v22.8: 반별 성적에서 시험지/답지 파일 목록
  if (e.parameter.action === "view_answer_key") return viewAnswerKey_(e);  // ★ v23.1: 정답 조회 (관리자/선생님 확인용)
  if (e.parameter.action === "update_answer_key") return updateAnswerKey_(e);  // ★ v23.2: 정답 수정
  if (e.parameter.action === "delete_answer_row") return deleteAnswerRow_(e);  // ★ v23.2: 정답 행 삭제
  if (e.parameter.action === "delete_dash_file") return deleteDashFile_(e);    // ★ v23.7: 대시보드 시험지/답지 파일 삭제
  if (e.parameter.action === "cancel_dash_exam") return cancelDashExam_(e);    // ★ v23.7: 시험 전체 취소 (정답목록 행 삭제 + Drive 파일 휴지통)
  if (e.parameter.action === "force_regrade_by_folder") return forceRegradeByFolder_(e);  // ★ v23.3: 특정 시험 강제 재채점
  if (e.parameter.action === "consistency_check") { dailyConsistencyCheck(); return jsonOut_({result:"ok"}); }
  if (e.parameter.action === "regrade_today") { regradeAllToday(); return jsonOut_({result:"ok"}); }
  // ── v10.1: 정답목록 데이터 수정 (깨진 메타데이터 복구 + teacher 없는 중복 행 제거) ──
  if (e.parameter.action === "fix_answer_rows") { return fixAnswerRows_(e); }
  // ── v11: 과거 1차/2차/3차 데이터 백업 + 삭제 ──
  if (e.parameter.action === "admin_purge_rounds") { return purgeRoundsData_(e); }
  if (e.parameter.action === "admin_preview_rounds") { return previewRoundsData_(e); }
  // ── v11.1: 중복 시험 감지 + 삭제 (응급 조치용) ──
  if (e.parameter.action === "admin_list_exams_by_date") { return adminListExamsByDate_(e); }
  if (e.parameter.action === "admin_delete_exam_row") { return adminDeleteExamRow_(e); }
  if (e.parameter.action === "admin_purge_duplicates") { return adminPurgeDuplicates_(e); }
  // ── v12: 다중학교 마이그레이션 (같은 시험지를 학교별로 따로 등록한 행 병합) ──
  if (e.parameter.action === "admin_merge_multischool") { return adminMergeMultiSchool_(e); }
  if (e.parameter.action === "check_duplicate_submission") {
    try {
      var ssDup = SpreadsheetApp.getActiveSpreadsheet();
      var sDup = ssDup.getSheetByName("학생답안기록");
      if (!sDup || sDup.getLastRow() <= 1) return jsonOut_({result:"ok", exists:false});
      var nameQ = String(e.parameter.name||"").trim();
      var phoneQ = String(e.parameter.phone||"").trim();
      var examQ = String(e.parameter.examName||"").trim();
      var dateQ = String(e.parameter.date||"").trim();
      var rowsD = sDup.getDataRange().getValues();
      for (var di = rowsD.length-1; di >= 1; di--) {
        var rd = rowsD[di];
        if (String(rd[1]||"").trim() === nameQ &&
            String(rd[2]||"").trim() === phoneQ &&
            String(rd[7]||"").trim() === examQ &&
            (!dateQ || String(rd[8]||"").trim() === dateQ)) {
          return jsonOut_({result:"ok", exists:true, submittedAt: String(rd[0]||""), score: rd[9]});
        }
      }
      return jsonOut_({result:"ok", exists:false});
    } catch(eDup) {
      return jsonOut_({result:"error", message:String(eDup)});
    }
  }
  // ★ 파일 프록시 다운로드 — 구글 계정 없이도 다운 가능
  // ★ v23.0: 대부분의 시험지(<=20MB)는 base64 응답으로 직접 전송, 그래야 빨간 X 페이지 안 나옴
  //   - 20MB는 GAS 응답 한도(50MB) 안전선. 보통 시험 PDF는 1~5MB 수준.
  //   - 초과 시 setSharing 시도 후 URL 반환. 실패하면 명확한 에러로 안내.
  if (e.parameter.action === "download_file") {
    var fileId = (e.parameter.id || "").trim();
    if (!fileId) return jsonOut_({result:"error", message:"파일 ID 없음"});
    try {
      var file = DriveApp.getFileById(fileId);
      var fileSize = file.getSize();
      var SIZE_LIMIT = 20 * 1024 * 1024; // 20MB 까지는 base64 직접 전송 (가장 안정적)
      if (fileSize <= SIZE_LIMIT) {
        var blob = file.getBlob();
        var b64 = Utilities.base64Encode(blob.getBytes());
        return jsonOut_({
          result: "ok",
          mode: "base64",
          name: file.getName(),
          mimeType: blob.getContentType(),
          size: fileSize,
          data: b64
        });
      }
      // 20MB 초과 — 링크 공유 시도 후 URL 반환
      var shareOk = false;
      var shareErr = "";
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        shareOk = true;
      } catch(eShare) {
        shareErr = String(eShare);
      }
      if (!shareOk) {
        return jsonOut_({
          result: "error",
          message: "파일이 20MB를 초과하고, 자동 공유에도 실패했어요 ("+shareErr+"). 관리자에게 파일 공유 권한 설정을 요청해 주세요.",
          fileSize: fileSize,
          viewUrl: "https://drive.google.com/file/d/" + fileId + "/view"
        });
      }
      return jsonOut_({
        result: "ok",
        mode: "url",
        name: file.getName(),
        mimeType: file.getMimeType(),
        size: fileSize,
        downloadUrl: "https://drive.google.com/uc?id=" + fileId + "&export=download",
        viewUrl: "https://drive.google.com/file/d/" + fileId + "/view"
      });
    } catch(err) {
      return jsonOut_({result:"error", message:"파일 접근 실패: "+String(err)});
    }
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("정답목록");
  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonOut_({result:"not_found"});
  }
  var subject = e.parameter.subject;
  var grade = e.parameter.grade;
  var level = e.parameter.level;
  var examType = e.parameter.examType;
  var rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === subject && rows[i][2] === grade && (rows[i][3] === level || rows[i][3] === "전체" || level === "전체") && rows[i][4] === examType) {
      var ans = {};
      try { ans = rows[i][7] ? JSON.parse(rows[i][7]) : {}; } catch(er){ ans = {}; }
      var typ = {};
      try { typ = rows[i][8] ? JSON.parse(rows[i][8]) : {}; } catch(er){ typ = {}; }
      return jsonOut_({
        result:"found",
        totalQuestions:rows[i][6],
        answers:ans,
        types:typ,
        startNumber: Number(rows[i][14]) || 1
      });
    }
  }
  return jsonOut_({result:"not_found"});
}
// ── 시험정보.txt 본문 생성 ──
function buildExamInfoText_(data, classList, savedFiles, resolvedDate, resolvedTime) {
  var lines = [];
  lines.push("===============================");
  lines.push("  채움학원 시험 정보");
  lines.push("===============================");
  lines.push("등록일시: " + new Date().toLocaleString("ko-KR"));
  lines.push("");
  lines.push("[시험 정보]");
  lines.push("과목     : " + (data.subject || ""));
  lines.push("학년     : " + (data.grade || ""));
  lines.push("레벨     : " + (data.level || ""));
  lines.push("시험종류 : " + (data.examType || ""));
  lines.push("시험날짜 : " + (resolvedDate || data.date || ""));
  lines.push("시험시간 : " + (resolvedTime || data.time || ""));
  // ★ v18: 선생님 정보 (Claude·검토UI·dedup 키 모두에 사용)
  lines.push("선생님   : " + (data.teacher || "(미입력)"));
  lines.push("");
  lines.push("[대상 반] (" + classList.length + "개)");
  for (var i = 0; i < classList.length; i++) {
    lines.push("  - " + classList[i]);
  }
  lines.push("");
  lines.push("[메모]");
  lines.push(data.memo || "(없음)");
  lines.push("");
  // ★ v17: 문항 범위 (선생님이 직접 입력) — Claude는 반드시 이 범위 안에서만 정답을 추출
  var _tq = Number(data.totalQuestions) || 0;
  var _sn = Number(data.startNumber) || 0;
  var _en = Number(data.endNumber) || 0;
  if (_tq > 0 || _sn > 0 || _en > 0) {
    lines.push("[문항 범위] ★★★ 절대 준수 — Claude 분석 시 최우선");
    if (_tq > 0) lines.push("전체 문항수 : " + _tq + "문항");
    if (_sn > 0) lines.push("시작 번호   : " + _sn + "번");
    if (_en > 0) lines.push("끝 번호     : " + _en + "번");
    if (_sn > 0 && _en > 0 && _tq > 0) {
      lines.push("→ 정답지에서 " + _sn + "번부터 " + _en + "번까지 총 " + _tq + "개 문항만 추출");
      if (_sn !== 1) {
        lines.push("→ ⚠ 시작번호가 1이 아닙니다 (다른 문제집/모의고사 발췌 가능성).");
        lines.push("    JSON 키는 시험지 실제 번호(\"" + _sn + "\", \"" + (_sn+1) + "\", ...)로 사용하세요.");
        lines.push("    학생앱은 startNumber 메타로 OMR 표시 번호를 자동 정렬합니다.");
      }
    }
    lines.push("");
  }
  lines.push("[주관식 힌트] ★ Claude 분석 시 반드시 참고");
  var sm = data.subjMode || "auto";
  if (sm === "auto") {
    lines.push("유형: AI 자동 판별 (v21.2~)");
    lines.push("→ 답지에서 답 형태를 보고 AI가 mc/sa 자동 분류");
  } else if (sm === "direct") {
    lines.push("유형: 선생님 직접입력 (문항별 객/주 선택)");
  } else if (sm === "none") {
    lines.push("유형: 전체 객관식 (5지선다)");
    lines.push("→ 모든 문항 types를 \"mc\"로 설정");
  } else if (sm === "all") {
    lines.push("유형: 전체 주관식");
    lines.push("→ 모든 문항 types를 \"sub\"로 설정");
  } else if (sm === "mixed") {
    lines.push("유형: 객관식 + 주관식 혼합");
    if (data.subjRanges) {
      lines.push("주관식 번호: " + data.subjRanges);
      lines.push("→ 위 번호만 \"sub\", 나머지 문항은 전부 \"mc\"로 설정");
    } else {
      lines.push("주관식 번호: (미지정)");
      lines.push("→ 정답지를 보고 주관식 문항을 추정하세요.");
      lines.push("  ⚠️ 특히 수학 주관식(답이 숫자인 경우) 주의!");
    }
  }
  lines.push("");
  lines.push("[업로드 파일]");
  var answers = savedFiles.filter(function(f){return f.type==="answer";});
  var exams   = savedFiles.filter(function(f){return f.type==="exam";});
  lines.push("● 정답지 (" + answers.length + "개)");
  for (var a = 0; a < answers.length; a++) lines.push("  - " + answers[a].name);
  lines.push("● 시험지 (" + exams.length + "개)");
  for (var b = 0; b < exams.length; b++) lines.push("  - " + exams[b].name);
  lines.push("");
  lines.push("===============================");
  lines.push("  Claude 분석 요청 사항");
  lines.push("===============================");
  lines.push("이 폴더의 정답지 파일을 분석한 뒤,");
  lines.push("Google Sheets \"채움학원 OMR 데이터\" → \"정답목록\" 탭에");
  lines.push("아래 조건으로 정답을 저장해주세요.");
  lines.push("");
  lines.push("  과목     : " + (data.subject || ""));
  lines.push("  학년     : " + (data.grade || ""));
  lines.push("  레벨     : " + (data.level || ""));
  lines.push("  시험종류 : " + (data.examType || ""));
  lines.push("");
  lines.push("  정답데이터 형식(JSON):");
  lines.push("  { \"1\":\"3\", \"2\":\"5\", \"3\":\"apple\", ... }");
  lines.push("  유형데이터 형식(JSON):");
  lines.push("  { \"1\":\"mc\", \"2\":\"mc\", \"3\":\"sub\", ... }");
  lines.push("  (mc=객관식 5지선다, sub=주관식)");
  lines.push("");
  lines.push("★★★ 교차검증 규칙 (v7 추가) ★★★");
  lines.push("1. 위 [주관식 힌트]는 선생님이 입력한 값입니다. 실수 가능성이 있으니 반드시 실제 시험지/정답지 PDF와 대조하세요.");
  lines.push("2. 힌트와 PDF 실제 내용이 다르면 → **PDF를 우선**해서 answers/types를 결정하세요.");
  lines.push("3. 불일치 항목은 JSON 최상위에 \"warnings\" 배열로 기록:");
  lines.push("   예: \"warnings\": [\"선생님 힌트는 전체 객관식이나, 21-25번은 주관식(단답형)으로 판단하여 sub로 설정\"]");
  lines.push("4. 답지 파일에 실제 정답이 없고 시험지(문제)만 있는 경우 → \"warnings\"에 \"파일 swap 의심: answerFile이 문제지로 보임\" 기록하고 best-effort 처리");
  lines.push("5. 주관식 번호가 totalQuestions 범위를 벗어나면(예: 50문항인데 힌트 1-60) → PDF 기준으로 재추정하고 warnings 기록");
  lines.push("6. 모든 warnings는 한국어로, 관리자가 한눈에 이해할 수 있게 작성");
  // ★ v17: 문항 범위 우선순위 명시
  if (_tq > 0 && _sn > 0 && _en > 0) {
    lines.push("7. ★ [문항 범위]는 선생님이 시험지를 직접 보고 입력한 정확한 값입니다. PDF에서 다른 번호가 보여도 위 범위(" + _sn + "~" + _en + ")만 추출하세요.");
    lines.push("   예: 정답지에 1-50번이 있어도 선생님이 21-50을 지정했으면 21번부터 50번 30개만 추출.");
    lines.push("   추출 결과 키는 반드시 시험지 실제 번호(\"" + _sn + "\", \"" + (_sn+1) + "\", ..., \"" + _en + "\")로 사용.");
    lines.push("   JSON 최상위에 \"startNumber\": " + _sn + ", \"totalQuestions\": " + _tq + " 를 함께 기록.");
  }
  // ★ v18: 선생님 정보 응답 JSON에 항상 포함 — 학생앱 dedup 및 검토 UI에서 사용
  if (data.teacher) {
    lines.push("8. ★ 응답 JSON 최상위에 반드시 \"teacher\": \"" + data.teacher + "\" 를 포함하세요.");
    lines.push("   (위 [시험 정보]의 \"선생님\" 값과 동일. 같은 PDF를 여러 선생님이 사용해도 학생앱에서 별개 시험으로 구분됨)");
  } else {
    lines.push("8. ★ [시험 정보]에 선생님이 미입력입니다. 응답 JSON 최상위에 \"teacher\": \"\" 빈 문자열로라도 키를 포함하세요.");
  }
  lines.push("");
  lines.push("완료 후 이 파일 끝에 \"분석완료 yyyy-MM-dd HH:mm\"을 추가해주세요.");
  return lines.join("\n");
}
// ── Drive 헬퍼 ──
function getOrCreateFolder_(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next().getId();
  return DriveApp.createFolder(name).getId();
}
function getOrCreateSubFolder_(parentId, name) {
  var parent = DriveApp.getFolderById(parentId);
  var subs = parent.getFoldersByName(name);
  if (subs.hasNext()) return subs.next().getId();
  return parent.createFolder(name).getId();
}
function createUniqueSubFolder_(parentId, name) {
  // ★ v27.2.3 (2026-05-14): 근본 픽스 — 같은 이름의 빈 폴더 있으면 재사용 (정답목록 폴더ID 불일치 방지)
  //   원인: 옛 흐름은 같은 이름이면 무조건 (2), (3) 새 폴더 → 정답목록은 옛 빈 폴더 ID 가리키고
  //         실제 파일은 (2) 에 들어가 "파일 없음" 대시보드 버그
  //   해결: 같은 이름 폴더가 비어있으면 재사용. 파일 있으면 (2) 새로 만들기 (변형 회피)
  var parent = DriveApp.getFolderById(parentId);
  var sameNameIter = parent.getFoldersByName(name);
  // 같은 이름 폴더들을 순회: 비어있는 거 발견하면 재사용
  while (sameNameIter.hasNext()) {
    var existing = sameNameIter.next();
    var files = existing.getFiles();
    var isEmpty = true;
    while (files.hasNext()) {
      var f = files.next();
      var n_ = f.getName();
      if (n_ === "시험정보.txt" || n_ === "정답.json" || n_ === "desktop.ini") continue;
      isEmpty = false; break;
    }
    if (isEmpty) {
      Logger.log("[createUniqueSubFolder_] 빈 폴더 재사용: " + name);
      return existing.getId();
    }
  }
  // 같은 이름 폴더 모두 파일 있음 → (2), (3) 으로 새로 만들기
  var finalName = name;
  var n = 2;
  while (parent.getFoldersByName(finalName).hasNext()) {
    finalName = name + "(" + n + ")";
    n++;
  }
  return parent.createFolder(finalName).getId();
}
function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
// ============================================================
// v5: 자동 처리 큐 (Drive 폴더 스캔 → 정답.json 처리)
// ============================================================
function processAnswerQueue() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var answerSheet = ss.getSheetByName("정답목록");
  if (!answerSheet) answerSheet = ss.insertSheet("정답목록");
  ensureAnswerSheetHeader_(answerSheet);
  var logSheet = ss.getSheetByName("자동처리로그");
  if (!logSheet) {
    logSheet = ss.insertSheet("자동처리로그");
    logSheet.appendRow(["처리시각","폴더경로","결과","메시지"]);
  }
  var rootFolders = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!rootFolders.hasNext()) {
    logSheet.appendRow([new Date().toLocaleString("ko-KR"), "(루트없음)", "skip", "채움학원 시험자료 폴더가 Drive 루트에 없음"]);
    return;
  }
  var rootFolder = rootFolders.next();
  var processed = 0;
  var skipped = 0;
  // ★ 3단계 구조 지원: 날짜/시험폴더 또는 날짜/선생님/시험폴더
  // ★ v20: 폴더 내 어떤 .json 파일이든 인식 (_처리완료_ 제외)
  function findAnyAnswerJson_(folder) {
    var files = folder.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      var n = f.getName();
      if (!/\.json$/i.test(n)) continue;
      if (n.indexOf("_처리완료_") >= 0) continue;
      return f;
    }
    return null;
  }
  // collectExamFolders_: 날짜 폴더 아래 모든 시험 폴더를 수집 (1~2단계 깊이)
  function collectExamFolders_(parentFolder) {
    var result = [];
    var subs = parentFolder.getFolders();
    while (subs.hasNext()) {
      var sub = subs.next();
      // .json이 있으면 시험 폴더
      if (findAnyAnswerJson_(sub)) {
        result.push(sub);
      } else {
        // 없으면 선생님 폴더일 수 있음 → 한 단계 더 탐색
        var innerSubs = sub.getFolders();
        while (innerSubs.hasNext()) {
          var inner = innerSubs.next();
          if (findAnyAnswerJson_(inner)) {
            result.push(inner);
          }
        }
      }
    }
    return result;
  }
  // ★ v26.3 (2026-05-13): 6분 timeout 방지 — 최근 7일 폴더만 스캔 + 시간 제한
  //   원인: 누적된 50+ 일 폴더를 매번 다 스캔 → 6분 timeout 매 분마다 발생
  //         이게 GAS 동시 실행 한도(30개) 다 잡아먹어 다른 호출(시험 업로드)까지 막힘
  //   해결:
  //     1) 최근 7일 폴더만 (이전은 이미 처리완료 마커 있을 것)
  //     2) 5분 안 끝나면 다음 실행으로 (timeout 직전 안전 종료)
  //     3) 모든 .json 처리 후 _처리완료_ 마커로 다음 호출에서 skip
  var _startMs = Date.now();
  var _safeTimeMs = 5 * 60 * 1000;  // 5분 (GAS 한도 6분의 83%)
  var _today = new Date();
  function _isRecentDateFolder(folderName) {
    var m = folderName.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (!m) return true;  // 날짜 형식 아니면 처리 (안전상)
    var fd = new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10));
    var diffDays = Math.abs(_today.getTime() - fd.getTime()) / (24*3600*1000);
    return diffDays <= 7;  // 최근 7일 (미래 7일도 포함 — 예약된 시험)
  }
  var dateFolders = rootFolder.getFolders();
  while (dateFolders.hasNext()) {
    // ★ v26.3: 시간 제한 — 5분 넘으면 다음 실행으로 미루기
    if (Date.now() - _startMs > _safeTimeMs) {
      logSheet.appendRow([new Date().toLocaleString("ko-KR"), "(time-limit)", "deferred", "5분 안전 한도 도달 → 다음 실행으로 미룸. 처리: " + processed + "건"]);
      break;
    }
    var dateFolder = dateFolders.next();
    // ★ v26.3: 최근 7일 폴더만 (옛 폴더는 처리완료 마커로 skip 효과 외에도 폴더 자체 안 봄)
    if (!_isRecentDateFolder(dateFolder.getName())) {
      skipped++;
      continue;
    }
    var examFolderList = collectExamFolders_(dateFolder);
    for (var efi = 0; efi < examFolderList.length; efi++) {
      // ★ v26.3: inner loop 도 시간 체크
      if (Date.now() - _startMs > _safeTimeMs) break;
      var examFolder = examFolderList[efi];
      var jsonFile = findAnyAnswerJson_(examFolder);
      if (!jsonFile) { continue; }
      var folderPath = dateFolder.getName() + "/" + examFolder.getName();
      try {
        var data = JSON.parse(jsonFile.getBlob().getDataAsString("UTF-8"));
        if (!data.answers || !data.types || !data.totalQuestions) {
          throw new Error("필수 필드 누락: answers/types/totalQuestions");
        }
        // ★ 정답/유형을 어떤 형태(배열/객체)로 저장돼 있든 {"1":v,...} 객체로 통일
        data.answers = normalizeAnswerData(data.answers);
        data.types = normalizeAnswerData(data.types);
        // ④ 문항수 검증 — answers 개수와 totalQuestions 불일치 시 Slack 경고 (계속 진행)
        try { validateAnswerCount_(folderPath, data); } catch(vIgn){}
        // A. 교차검증 결과(warnings) Slack 알림 — Claude가 PDF로 힌트를 교정했을 때
        try {
          if (data.warnings && data.warnings.length > 0) {
            var wLines = ["🔎 *Claude 교차검증 감지* — " + folderPath];
            data.warnings.slice(0, 10).forEach(function(w){ wLines.push("• " + w); });
            if (data.warnings.length > 10) wLines.push("...외 " + (data.warnings.length-10) + "건");
            slackSend_(wLines.join("\n"));
            // 로그시트에도 기록
            logSheet.appendRow([new Date().toLocaleString("ko-KR"), folderPath, "warning", JSON.stringify(data.warnings)]);
          }
        } catch(wIgn){}
        var parsed = parseExamFolderName_(examFolder.getName(), data);
        // ★ 시험날짜 = 날짜 폴더에서 추출 (선생님 하위폴더 구조도 지원)
        // dateFolder는 항상 최상위 날짜 폴더 (collectExamFolders_로 수집해도 dateFolder 변수는 유지)
        var examDateStr = dateFolder.getName().replace(/-/g,".") || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd");
        // dateFolder가 날짜가 아닌 경우 (혹시 모를 안전장치)
        if (!/^\d{4}\.\d{2}\.\d{2}$/.test(examDateStr)) {
          examDateStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd");
        }
        // ★ 폴더 고유 ID — 이것이 중복 체크 기준 (같은 폴더 재처리 = 덮어쓰기, 다른 폴더 = 새 행)
        var folderId = examFolder.getId();
        // 헤더에 folderID 컬럼 추가 (14번째, 인덱스 13)
        var lastCol = answerSheet.getLastColumn();
        var headerRow = answerSheet.getRange(1, 1, 1, Math.max(lastCol, 14)).getValues()[0];
        if (headerRow[13] !== "폴더ID") {
          answerSheet.getRange(1, 14).setValue("폴더ID");
        }
        var rows = answerSheet.getDataRange().getValues();
        var updated = false;
        // 1순위: 폴더 ID로 기존 행 찾기 (가장 정확)
        for (var r = rows.length - 1; r >= 1; r--) {
          if (String(rows[r][13] || "") === folderId) {
            answerSheet.getRange(r + 1, 1, 1, 14).setValues([[
              new Date().toLocaleString("ko-KR"),
              parsed.subject, parsed.grade, parsed.level, parsed.examType,
              normalizeSetType_(data.setType || data.round || ""),
              Number(data.totalQuestions) || 0,
              JSON.stringify(data.answers),
              JSON.stringify(data.types),
              rows[r][9] || "",
              rows[r][10] || 0,
              rows[r][11] || "",
              examDateStr,
              folderId
            ]]);
            updated = true;
            break;
          }
        }
        // 2순위: 폴더ID 없는 기존 행이면 subject+grade+level+examType+round+date로 매칭 (하위호환)
        if (!updated) {
          for (var r = rows.length - 1; r >= 1; r--) {
            var rowFolderId = String(rows[r][13] || "");
            if (rowFolderId) continue; // 폴더ID 있는 행은 건너뜀 (다른 시험)
            if (rows[r][1] === parsed.subject &&
                rows[r][2] === parsed.grade &&
                rows[r][3] === parsed.level &&
                rows[r][4] === parsed.examType &&
                String(rows[r][5]) === String(normalizeSetType_(data.setType || data.round || "")) &&
                String(rows[r][12] || "") === examDateStr) {
              answerSheet.getRange(r + 1, 1, 1, 14).setValues([[
                new Date().toLocaleString("ko-KR"),
                parsed.subject, parsed.grade, parsed.level, parsed.examType,
                normalizeSetType_(data.setType || data.round || ""),
                Number(data.totalQuestions) || 0,
                JSON.stringify(data.answers),
                JSON.stringify(data.types),
                rows[r][9] || "",
                rows[r][10] || 0,
                rows[r][11] || "",
                examDateStr,
                folderId
              ]]);
              updated = true;
              break;
            }
          }
        }
        // 3순위: 완전히 새 행 삽입
        if (!updated) {
          // ★ 업로드기록에서 teacher/studentCount/round 조회 (같은 폴더ID 기준)
          var seedTeacher = "";
          var seedCount = 0;
          var seedRound = "";
          try {
            var uSh = ss.getSheetByName("업로드기록");
            if (uSh && uSh.getLastRow() > 1) {
              var uR = uSh.getDataRange().getValues();
              for (var ur = uR.length - 1; ur >= 1; ur--) {
                var uLink = String(uR[ur][10]||"");
                if (uLink.indexOf(folderId) >= 0) {
                  seedTeacher = uR[ur][12] || "";
                  seedCount = Number(uR[ur][13]) || 0;
                  seedRound = uR[ur][15] || "";
                  break;
                }
              }
            }
          } catch(uIgn){}
          answerSheet.appendRow([
            new Date().toLocaleString("ko-KR"),
            parsed.subject, parsed.grade, parsed.level, parsed.examType,
            normalizeSetType_(data.setType || data.round || seedRound || ""),
            Number(data.totalQuestions) || 0,
            JSON.stringify(data.answers),
            JSON.stringify(data.types),
            seedTeacher, seedCount, parsed.className || "",
            examDateStr,
            folderId
          ]);
        }
        markExamInfoDone_(examFolder);
        updateUploadRecordStatus_(parsed, "분석완료 " + new Date().toLocaleString("ko-KR"));
        jsonFile.setName(jsonFile.getName().replace(/\.json$/i, "") + "_처리완료_" + Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmmss") + ".json");
        // ② 지각 채점 — 방금 등록/갱신된 정답목록 행을 찾아서 null 점수 재채점
        try {
          var latestRows = answerSheet.getDataRange().getValues();
          for (var lr = latestRows.length - 1; lr >= 1; lr--) {
            if (String(latestRows[lr][13] || "") === folderId) {
              var n = regradeLateSubmissions_(latestRows[lr]);
              if (n > 0) slackSend_("🔁 지각채점 " + n + "건 — " + parsed.subject + " " + parsed.grade + " " + parsed.level + " " + parsed.examType);
              break;
            }
          }
        } catch(rgIgn){}
        logSheet.appendRow([new Date().toLocaleString("ko-KR"), folderPath,
          updated ? "updated" : "inserted",
          parsed.subject + " " + parsed.grade + " " + parsed.level + " " + parsed.examType + " (folderID:" + folderId + ")"]);
        processed++;
      } catch (err) {
        logSheet.appendRow([new Date().toLocaleString("ko-KR"), folderPath, "error", String(err)]);
        skipped++;
        // ① Claude 분석 실패 Slack 알림
        try { notifyAnalysisFailure_(folderPath, String(err)); } catch(nfIgn){}
      }
    }
  }
  // ★ v28 (2026-05-16): 자동 스캔 제거 — 워커가 직접 register_exam_gen_v28 호출
  // try { scanExamGenResultsFolder_(rootFolder, answerSheet, logSheet); } catch(egErr) {
  //   Logger.log("[examGen scan] " + String(egErr));
  // }
}

// ═══ v12.5: 문제생성결과 폴더 스캐너 ═══
// 채움학원 시험자료/문제생성결과/<날짜>/*.json 을 읽어 정답목록 시트에 세트별 자동 등록
// 파일명 예: 채움구문1_Ch1Ch2Ch3_35문항_중1A반.json
// 처리 후 파일명을 "_처리완료_YYYYMMDD_HHMMSS.json" 으로 리네임하여 중복처리 방지
// ★ v23.2: 미러 폴더 재복사 — 정답목록의 "문제생성기/단어시험" 항목 중 미러 폴더가 비어있으면
//   원본 JSON 파일을 찾아 DOCX 를 다시 복사. 워커 지연 / 첫 스캔 누락을 보정.
function repairEmptyMirrorFolders_(rootFolder, answerSheet, logSheet) {
  if (!answerSheet || answerSheet.getLastRow() <= 1) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rows = answerSheet.getDataRange().getValues();
  var examGenRoot = null;
  try {
    var egIter = rootFolder.getFoldersByName("문제생성결과");
    if (egIter.hasNext()) examGenRoot = egIter.next();
  } catch(eEg) {}
  if (!examGenRoot) return;
  var repaired = 0;
  // 최근 60일치만 점검 (성능 보호)
  var cutoff = new Date(); cutoff.setDate(cutoff.getDate()-60);
  var tzRepair = Session.getScriptTimeZone() || "Asia/Seoul";
  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    var examType = String(r[4]||"").trim();
    if (examType !== "문제생성기" && examType !== "단어시험") continue;
    var mirrorId = String(r[13]||"").trim();
    if (mirrorId.indexOf(":") >= 0) continue; // 옛 형식(파일ID:세트) 은 skip

    // ★ v24.2: r[13]이 비어있는 경우 — save_answer_key로 직접 등록된 행 (이새나 케이스)
    //   → 미러 폴더를 새로 만들어주고 r[13]에 저장한다.
    var needsCreate = !mirrorId;
    // 시험날짜 파싱
    var dateStr = String(r[12]||"").trim();
    var dateOk = false;
    var dateForFolder = "";
    var dm = dateStr.match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
    if (dm) {
      var examDate = new Date(parseInt(dm[1],10), parseInt(dm[2],10)-1, parseInt(dm[3],10));
      if (examDate >= cutoff) dateOk = true;
      dateForFolder = dm[1]+"."+dm[2]+"."+dm[3];
    }
    if (!dateOk) continue;

    // ── 미러 폴더 결정 ──
    var mirrorFolder = null;
    var preFoundSourceFolder = null;  // ★ v24.2: needsCreate일 때 미리 찾은 원본 폴더 (후속 candidates에서 재사용)
    if (needsCreate) {
      // ★ v24.2: r[13]이 비어있음 → save_answer_key 자동 등록된 행 (이새나 케이스)
      //   examGen 원본 폴더 존재 + DOCX 있음 확인 후 새 미러 폴더 생성
      var teacherNm = String(r[9]||"").trim();
      var targetCls = String(r[11]||"").trim();
      if (!teacherNm || !targetCls) continue;
      try {
        var dateFI = examGenRoot.getFoldersByName(dateForFolder);
        if (!dateFI.hasNext()) {
          // dash 형식도 시도 (2026-05-12)
          dateFI = examGenRoot.getFoldersByName(dateForFolder.replace(/\./g,"-"));
          if (!dateFI.hasNext()) continue;
        }
        var dfI = dateFI.next();
        var teacherFI = dfI.getFoldersByName(teacherNm);
        if (!teacherFI.hasNext()) continue;
        var sourceFolder = teacherFI.next();
        preFoundSourceFolder = sourceFolder;

        // 원본 폴더에 DOCX/PDF 가 있는지 확인
        var hasSourceDoc = false;
        var srcCheck = sourceFolder.getFiles();
        while (srcCheck.hasNext()) {
          var _sfn = srcCheck.next().getName();
          if (_sfn.toLowerCase() === "시험정보.txt") continue;
          if (/\.(docx?|pdf|hwpx?|pptx?)$/i.test(_sfn)) { hasSourceDoc = true; break; }
        }
        if (!hasSourceDoc) {
          // 원본에 DOCX 없으면 복구 불가
          logSheet.appendRow([new Date().toLocaleString("ko-KR"), "(r" + (i+1) + " " + teacherNm + ")", "repair_skip", "원본 폴더에 DOCX 없음"]);
          continue;
        }

        // 미러 폴더 생성: 채움학원 시험자료/<dateForFolder>/<teacher>/<문제생성기_반>
        var mDateId = getOrCreateSubFolder_(rootFolder.getId(), dateForFolder);
        var mTeacherId = getOrCreateSubFolder_(mDateId, teacherNm);
        var classTag2 = targetCls.replace(/\s+/g, "").replace(/[\\/:*?"<>|]/g, "");
        var examTypeTag2 = (examType === "단어시험" ? "단어시험" : "문제생성기");
        var mirrorName2 = examTypeTag2 + "_" + classTag2;
        var newMirrorId = getOrCreateSubFolder_(mTeacherId, mirrorName2);
        mirrorFolder = DriveApp.getFolderById(newMirrorId);
        mirrorId = newMirrorId;
        // 시트 r[13]에 새 미러 폴더 ID 저장
        try { answerSheet.getRange(i + 1, 14).setValue(mirrorId); } catch(eSt){}
        // 시험정보.txt 생성
        try {
          var infoIter = mirrorFolder.getFilesByName("시험정보.txt");
          if (!infoIter.hasNext()) {
            var infoTxt = "[문제생성기 자동 복구 — save_answer_key 등록 행]\n" +
              "선생님: " + teacherNm + "\n" +
              "대상반: " + targetCls + "\n" +
              "시험날짜: " + dateForFolder + "\n" +
              "원본 폴더: " + sourceFolder.getUrl() + "\n" +
              "복구시각: " + new Date().toLocaleString("ko-KR") + "\n";
            mirrorFolder.createFile("시험정보.txt", infoTxt, MimeType.PLAIN_TEXT);
          }
        } catch(eIn){}
        Logger.log("[repairEmptyMirrorFolders_] 새 미러 생성: " + teacherNm + " " + targetCls + " → " + mirrorId);
      } catch(eCr) {
        logSheet.appendRow([new Date().toLocaleString("ko-KR"), "(r" + (i+1) + ")", "repair_create_fail", String(eCr)]);
        continue;
      }
    } else {
      try { mirrorFolder = DriveApp.getFolderById(mirrorId); }
      catch(eMf) { continue; }
    }
    var hasFile = false;
    try {
      var mff = mirrorFolder.getFiles();
      while (mff.hasNext()) {
        var mf = mff.next();
        var mfn = mf.getName().toLowerCase();
        if (mfn === "시험정보.txt") continue;
        if (/\.(docx?|pdf|hwpx?|pptx?)$/i.test(mfn)) { hasFile = true; break; }
      }
    } catch(eList) { continue; }
    if (hasFile) continue;

    // 미러가 비어있음 → 원본 JSON 위치 추정해서 DOCX 복사
    var teacher = String(r[9]||"").trim();
    var targetClass = String(r[11]||"").trim();
    if (!teacher || !targetClass) continue;

    // 후보 폴더: 문제생성결과/<날짜>/<선생님>/  +  문제생성결과/<날짜>/
    var candidates = [];
    // ★ v24.2: 미리 찾은 원본 폴더가 있으면 최우선 후보로 추가
    if (preFoundSourceFolder) candidates.push(preFoundSourceFolder);
    try {
      var dateF = examGenRoot.getFoldersByName(dateForFolder);
      if (!dateF.hasNext()) {
        // ★ v24.2: dash 형식 폴더도 시도 (2026-05-12)
        dateF = examGenRoot.getFoldersByName(dateForFolder.replace(/\./g,"-"));
      }
      if (dateF.hasNext()) {
        var df = dateF.next();
        candidates.push(df);
        try {
          var teacherF = df.getFoldersByName(teacher);
          while (teacherF.hasNext()) candidates.push(teacherF.next());
        } catch(eT){}
      }
    } catch(eD) {}
    if (candidates.length === 0) continue;

    // 후보 폴더에서 DOCX/PDF 모두 복사 (이름 키워드 매칭으로 관련 파일만)
    var copied = 0;
    var seen = {};
    for (var ci = 0; ci < candidates.length; ci++) {
      try {
        var cf = candidates[ci].getFiles();
        while (cf.hasNext()) {
          var f = cf.next();
          var fname = f.getName();
          if (seen[fname]) continue;
          var lower = fname.toLowerCase();
          if (!/\.(docx?|pdf|hwpx?|pptx?)$/i.test(lower)) continue;
          // 관련성 체크 — 반 이름이나 키워드 매칭
          var classKey = targetClass.replace(/\s+/g,"");
          var related = fname.indexOf(classKey) >= 0 ||
                        /(시험지|정답표|답지|답안|exam|answer)/i.test(fname);
          if (!related) continue;
          // 이미 미러에 있는지 확인
          var existsIter = mirrorFolder.getFilesByName(fname);
          if (existsIter.hasNext()) continue;
          try {
            f.makeCopy(fname, mirrorFolder);
            seen[fname] = true;
            copied++;
          } catch(eCp) {}
        }
      } catch(eS) {}
    }
    if (copied > 0) {
      repaired++;
      try {
        logSheet.appendRow([new Date().toLocaleString("ko-KR"), mirrorId, "repair_copied", teacher+" "+targetClass+" / "+copied+"개" + (needsCreate ? " (★새미러)" : "")]);
      } catch(eLog) {}
      // ★ v24.2: 폴더메타JSON 캐시 무효화 — 다음 대시보드 호출 때 새로 스캔되게
      try {
        if (answerSheet.getLastColumn() >= 19) {
          answerSheet.getRange(i + 1, 19).setValue("");
        }
      } catch(eClr){}
      // 단기 캐시도 무효화
      try { CacheService.getScriptCache().remove("fld_" + mirrorId); } catch(eCC){}
    }
  }
  if (repaired > 0) {
    Logger.log("[repairEmptyMirrorFolders_] 복원 완료: " + repaired + "건");
    // 대시보드 캐시 전체 무효화 (날짜·선생님 조합)
    try {
      var _cs = CacheService.getScriptCache();
      var _busts = [];
      var _today = Utilities.formatDate(new Date(), tzRepair, "yyyy-MM-dd");
      _busts.push("dash__" + _today);
      _busts.push("dash__");  // 빈 teacher
      _cs.removeAll(_busts);
    } catch(_eBust){}
  }
}

function scanExamGenResultsFolder_(rootFolder, answerSheet, logSheet) {
  var egRoot = null;
  var egIter = rootFolder.getFoldersByName("문제생성결과");
  if (egIter.hasNext()) egRoot = egIter.next();
  if (!egRoot) { Logger.log("[examGen scan] 문제생성결과 폴더 없음"); return; }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ansSheet = ss.getSheetByName("정답목록");
  if (!ansSheet) { ansSheet = ss.insertSheet("정답목록"); }
  ensureAnswerSheetHeader_(ansSheet);
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var dateSubs = egRoot.getFolders();
  while (dateSubs.hasNext()) {
    var dateFolder = dateSubs.next();
    var dateName = dateFolder.getName(); // 예: "2026.04.21" 또는 "2026-04-21"
    // 날짜 폴더가 아니면 skip
    if (!/^\d{4}[.\-]\d{2}[.\-]\d{2}$/.test(dateName)) continue;
    var examDateStr = dateName.replace(/-/g,".");
    // ★ v20.2: 날짜 폴더 아래의 모든 JSON 파일 수집 — 2단계(date/*.json) + 3단계(date/teacher/*.json) 모두 지원
    var collected = []; // [{file, pathLabel}]
    var _rootFiles = dateFolder.getFiles();
    while (_rootFiles.hasNext()) {
      var _rf = _rootFiles.next();
      collected.push({file:_rf, pathLabel:"문제생성결과/"+dateName+"/"+_rf.getName()});
    }
    var _teacherSubs = dateFolder.getFolders();
    while (_teacherSubs.hasNext()) {
      var _tFolder = _teacherSubs.next();
      var _tName = _tFolder.getName();
      var _tFiles = _tFolder.getFiles();
      while (_tFiles.hasNext()) {
        var _tf = _tFiles.next();
        collected.push({file:_tf, pathLabel:"문제생성결과/"+dateName+"/"+_tName+"/"+_tf.getName()});
      }
    }
    for (var _ci = 0; _ci < collected.length; _ci++) {
      var f = collected[_ci].file;
      var _pathLabel = collected[_ci].pathLabel;
      var fname = f.getName();
      // JSON만, 이미 처리완료된 파일은 skip
      if (!/\.json$/i.test(fname)) continue;
      if (fname.indexOf("_처리완료_") >= 0) continue;
      // ★ v20.3: B세트(exam_B_*.json)는 백업이므로 스캔 대상에서 제외 (선생님 swap 기능용)
      if (/^exam_B_/i.test(fname)) continue;
      // 시험지/정답표 도큐먼트는 skip (이름에 "시험지_" "정답표_" 로 시작하는 것은 문서, json 은 데이터)
      var folderId = f.getId();
      try {
        var raw = f.getBlob().getDataAsString("UTF-8");
        var parsed = parseAnswerDoc_(raw) || JSON.parse(raw);
        if (!parsed || !parsed.sets || !Array.isArray(parsed.sets) || parsed.sets.length === 0) {
          logSheet.appendRow([new Date().toLocaleString("ko-KR"), _pathLabel, "skip", "sets 없음"]);
          continue;
        }
        var req = parsed.requestInfo || {};
        var teacher = String(req.teacher || "").trim();
        var targetClass = String(req.targetClass || "").trim();
        var testType = String(req.testType || "grammar").trim();
        if (!teacher || !targetClass) {
          // ★ v25.3 (2026-05-13): 누락된 게 무엇인지 자세히 기록 + Slack 알림
          var missing = [];
          if (!teacher) missing.push("teacher");
          if (!targetClass) missing.push("targetClass");
          logSheet.appendRow([new Date().toLocaleString("ko-KR"), _pathLabel, "skip", "누락 필드: " + missing.join(", ") + " (JSON requestInfo: " + JSON.stringify(req).slice(0,200) + ")"]);
          try { slackSend_("⚠️ 자동 등록 실패: " + fname + " — " + missing.join(", ") + " 누락 (선생님앱에서 시험 다시 등록 또는 JSON 수정 필요)"); } catch(_eSk){}
          continue;
        }
        // targetClass 파싱 (예: "영어 중1 A반" → subject=영어, grade=중1, level=A)
        var tcParts = targetClass.split(/\s+/);
        var regSubject = tcParts[0] || "영어";
        var regGrade = tcParts[1] || "";
        var regLevel = (tcParts[2] || "").replace(/반$/, "");
        var testTypeLabel = testType === "vocab" ? "단어시험" : "문제생성기";
        // 중복 체크: 같은 파일ID로 등록된 행이 있으면 skip (파일ID를 폴더ID 컬럼에 저장)
        var existingRows = ansSheet.getDataRange().getValues();
        var alreadyRegistered = false;
        for (var ei = 1; ei < existingRows.length; ei++) {
          if (String(existingRows[ei][13] || "").indexOf(folderId) >= 0) { alreadyRegistered = true; break; }
        }
        if (alreadyRegistered) {
          // 이미 등록됨 → 파일명만 처리완료로 변경
          try { f.setName(fname.replace(/\.json$/i, "") + "_처리완료_" + Utilities.formatDate(new Date(), tz, "yyyyMMdd_HHmmss") + ".json"); } catch(rnIgn){}
          continue;
        }
        var setLabels = ["A", "B", "C", "D", "E"];
        var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
        var insertedCount = 0;
        // ★ v20.2: 학생앱에는 첫 세트(A)만 노출 — A/B 중복 표시 방지.
        //   B/C 등은 같은 JSON 파일에 보존되며 swap_exam_set 기능으로 활성 세트 변경 가능.
        var _maxSetsToInsert = 1;
        // ═════════════════════════════════════════════════════════
        // ★ v21.6: 표준 폴더 통합 — 자동생성 = 시험등록 = 같은 위치
        //   목적: 자동 생성 결과를 시험등록과 동일한 <날짜>/<선생님>/<폴더>/ 구조에
        //         '이동'(복사 후 원본 휴지통)해서 관리자가 한 곳에서만 다운로드/출력.
        //   동작:
        //     1) <root>/<dateName>/<teacher>/<HH시MM분>_문제생성기_<basename>/ 폴더 생성
        //        (시험등록의 19시00분_종합시험_영어중3SA반 패턴과 통일)
        //     2) 워커가 만든 시험지_*.docx / 정답표_*.docx 를 미러 폴더로 복사
        //     3) 시험정보.txt 자동 생성 (대시보드/실장님 프린트용)
        //     4) 원본 docx 휴지통 이동 → '문제생성결과' 폴더에는 _처리완료_.json 만 audit 용으로 남김
        //     5) 정답목록의 폴더ID = 미러 폴더 ID (대시보드가 단일 위치로 인식)
        // ═════════════════════════════════════════════════════════
        var mirrorFolderId = "";
        try {
          var _baseName = fname.replace(/^exam_[AB]_/i, "").replace(/\.json$/i, "");
          // ★ v27.9 (2026-05-15): baseName 메타 태그 정규화 (v22 워커의 새 파일명 패턴 대응)
          //   원인: 클로드 v22 워커가 JSON 을 `_A_v22_생성완료_<timestamp>.json` 패턴으로 출력
          //         같은 폴더 docx 는 `_<timestamp>.docx` 패턴 → baseName.indexOf 매칭 실패
          //   해결: baseName 끝부분의 메타 태그·timestamp 제거한 _baseCore 로 비교
          function _stripMeta(s) {
            return String(s||"")
              .replace(/_[A-Z]_v\d+_[가-힣]+_\d{8}(_\d+)?$/, "")   // _A_v22_생성완료_20260515 / _A_v22_생성완료_20260515_172530
              .replace(/_v\d+_[가-힣]+_\d{8}(_\d+)?$/, "")          // _v22_생성완료_20260515
              .replace(/_처리완료_.*$/, "")                          // _처리완료_xxx
              .replace(/_생성완료_.*$/, "")                          // _생성완료_xxx
              .replace(/_\d{8}_\d{6}$/, "")                          // _20260515_055350
              .replace(/_\d{8}$/, "")                                // _20260515
              // ★ v27.10 (2026-05-15): v23 워커 파일명 `_A_v23_20260515_211519` 대응
              //   원인: 김진용 시험 (영어 중3 A반) 처리 시 _baseCore 에 `_A_v23` 잔여 → docx 매칭 실패 → 미러 폴더 빈채
              //   해결: 위 regex 들이 처리 못한 `_A_v22`, `_A_v23` 등 세트라벨+버전 패턴 추가 제거
              .replace(/_[A-Z]_v\d+$/, "")                           // _A_v23, _A_v22 (잔여)
              .replace(/_v\d+$/, "");                                // _v23 (세트라벨 없는 경우)
          }
          var _baseCore = _stripMeta(_baseName);
          var _mirrorDateId = getOrCreateSubFolder_(rootFolder.getId(), examDateStr);
          var _mirrorTeacherId = getOrCreateSubFolder_(_mirrorDateId, teacher);
          // ★ examTime 추출 (requestInfo 우선, 없으면 빈 prefix)
          var _examTime = String(req.examTime || "").trim();
          var _timePrefix = "";
          if (/^(\d{1,2}):(\d{2})$/.test(_examTime)) {
            var _tm = _examTime.match(/^(\d{1,2}):(\d{2})$/);
            _timePrefix = ("0"+_tm[1]).slice(-2) + "시" + _tm[2] + "분_";
          }
          // 폴더명: 시험등록과 동일한 패턴 (시간_시험종류_과목학년레벨반)
          var _classTag = String(targetClass||"").replace(/\s+/g, "").replace(/[\\/:*?"<>|]/g, "");
          var _examTypeTag = (testType==="vocab" ? "단어시험" : "문제생성기");
          var _mirrorFolderName = _timePrefix + _examTypeTag + "_" + _classTag + "_" + _baseName;
          // 길이 제한 (Drive 폴더명 너무 길면 잘림)
          if (_mirrorFolderName.length > 100) _mirrorFolderName = _mirrorFolderName.substring(0, 100);
          // ★ v25.5 (2026-05-13): 미러 폴더 생성 직후 ★ 기존 파일 모두 청소 ★
          //   원인: 같은 클래스에 여러 시험 등록 시 _classTag 부분이 같아 같은 폴더로 매핑되며
          //         이전 시험의 docx 가 그대로 남아 누적됨 → 우림쌤 중3I반 카드에 8개 파일
          //   해결: 미러 폴더 새로 생성 후, _baseName 안 들어간 파일은 모두 휴지통
          //   (시험정보.txt 는 다시 만들어지므로 OK)
          mirrorFolderId = getOrCreateSubFolder_(_mirrorTeacherId, _mirrorFolderName);
          var _mirrorFolder = DriveApp.getFolderById(mirrorFolderId);
          // ★ v25.5: 미러 폴더 기존 파일 청소 — _baseName 매치 안 되거나 옛 시험 파일 휴지통 이동
          // ★ v27.9 (2026-05-15): _baseCore (정규화) 매칭으로 변경
          try {
            var _existingFiles = _mirrorFolder.getFiles();
            var _trashCount = 0;
            while (_existingFiles.hasNext()) {
              var _ef = _existingFiles.next();
              var _efName = _ef.getName();
              if (_efName === "시험정보.txt") continue;  // 시험정보는 다시 만들어지므로 OK
              var _efCore = _stripMeta(_efName.replace(/\.[^.]+$/, ""));
              // _baseCore 또는 _baseName 안 들어가면 → 다른 시험 docx → 휴지통
              if (_efName.indexOf(_baseCore) < 0 && _efCore.indexOf(_baseCore) < 0 && _efCore.indexOf(_baseName) < 0) {
                try { _ef.setTrashed(true); _trashCount++; } catch(_eT) {}
              }
            }
            if (_trashCount > 0) {
              Logger.log("[examGen mirror] 폴더 청소 — " + _mirrorFolderName + " 에서 " + _trashCount + "개 파일 휴지통");
              logSheet.appendRow([new Date().toLocaleString("ko-KR"), _pathLabel, "cleanup", _trashCount + "개 옛 파일 휴지통 이동"]);
            }
          } catch(_eClean) { Logger.log("[examGen mirror clean] " + _eClean); }
          // ★ v27.2.5 (2026-05-14): 같은 이름 중복 파일 자동 정리
          //   원인: scanExamGenResultsFolder_ 가 여러 번 호출되거나 race condition 으로
          //         미러 폴더에 같은 이름 파일이 2개씩 들어가는 케이스 발견
          //   해결: 같은 이름 파일이 여러 개면 가장 오래된 1개만 남기고 나머지 휴지통
          try {
            var _seenNames = {};
            var _dupTrashCount = 0;
            var _existingForDup = _mirrorFolder.getFiles();
            while (_existingForDup.hasNext()) {
              var _efDup = _existingForDup.next();
              var _efNameDup = _efDup.getName();
              if (_efNameDup === "시험정보.txt" || _efNameDup === "정답.json" || _efNameDup === "desktop.ini") continue;
              if (_seenNames[_efNameDup]) {
                // 이미 같은 이름 있음 → 추가 본 휴지통
                try { _efDup.setTrashed(true); _dupTrashCount++; } catch(_eDupT){}
              } else {
                _seenNames[_efNameDup] = true;
              }
            }
            if (_dupTrashCount > 0) {
              Logger.log("[examGen mirror] 중복 파일 정리 — " + _mirrorFolderName + " 에서 " + _dupTrashCount + "개");
            }
          } catch(_eDup){ Logger.log("[examGen mirror dup clean] " + _eDup); }
          // JSON 부모 폴더 (worker가 저장한 위치)
          var _jsonParents = f.getParents();
          if (_jsonParents.hasNext()) {
            var _jsonParent = _jsonParents.next();
            // ★ v23.0: 워커 파일명 변동 대응 — 부모 폴더의 모든 .docx/.pdf/.hwp/.hwpx 를 자동 복사
            //   기존엔 정해진 이름(시험지_A_xxx.docx)만 찾았는데, 워커가 다른 이름을 쓰면 누락 → 시험정보.txt만 남는 버그
            var _copiedDocx = [];
            var _copiedNames = {};
            try {
              var _allFiles = _jsonParent.getFiles();
              // ★ v25.3 (2026-05-13): 복수 시험 묶임 버그 픽스
              //   기존: _baseName 매치 || "시험지/정답표/시험/답지/answer/exam" 키워드 매치
              //   → 같은 폴더에 여러 시험 docx 가 있으면 모두 _related 통과 → 미러에 다 들어감 → 한 카드에 여러 시험
              //   수정: _baseName 정확 매치만 허용 (키워드 매치 완전 제거)
              //   추가: A세트 표시 — exam_B_* / 정답표_B_* 등 B/C 세트도 제외
              while (_allFiles.hasNext()) {
                var _af = _allFiles.next();
                var _afName = _af.getName();
                var _afLow = _afName.toLowerCase();
                // ★ v27.9 (2026-05-15): _baseCore (메타 태그 제거) 로 매칭 — v22 워커의 새 파일명 패턴 대응
                var _afCore = _stripMeta(_afName.replace(/\.[^.]+$/, ""));
                // 다운로드 가능한 시험지·답지 형식만 (json 자체는 제외)
                if (!/\.(docx?|pdf|hwpx?|pptx?)$/i.test(_afLow)) continue;
                // ★ v25.3: B/C 세트 docx 제외 (A세트만 미러로)
                if (/_b_|_c_|_d_|_e_|세트b|세트c|세트d|세트e/i.test(_afName)) continue;
                // ★ v25.3: 베이스명 정확 매치 필수 (키워드 매치 제거)
                // ★ v27.9 (2026-05-15): _baseCore (메타 태그 제거) 우선 매칭 — v22 워커 새 파일명 패턴 대응
                //   1) docx 이름이 _baseCore 포함 (예: `채움구문형3_Ch04...중2A반`)
                //   2) 또는 docx 의 _afCore 가 _baseCore 포함 / _baseCore 가 _afCore 포함
                //   둘 다 실패하면 skip
                var _matches = (_afName.indexOf(_baseCore) >= 0)
                            || (_afCore.indexOf(_baseCore) >= 0)
                            || (_baseCore.indexOf(_afCore) >= 0)
                            || (_afName.indexOf(_baseName) >= 0);
                if (!_matches) {
                  Logger.log("[examGen mirror] skip (baseCore 불일치): " + _afName + " (core: " + _afCore + ") ≠ " + _baseCore);
                  continue;
                }
                if (_copiedNames[_afName]) continue;
                _copiedNames[_afName] = true;
                var _existsIter = _mirrorFolder.getFilesByName(_afName);
                if (!_existsIter.hasNext()) {
                  try {
                    _af.makeCopy(_afName, _mirrorFolder);
                    _copiedDocx.push(_af);
                  } catch(_cpErr) {
                    Logger.log("[examGen mirror] copy fail " + _afName + ": " + _cpErr);
                  }
                } else {
                  _copiedDocx.push(_af);
                }
              }
            } catch(_scanErr) {
              Logger.log("[examGen mirror] scan fail: " + _scanErr);
            }
            // 시험정보.txt 자동 생성 (대시보드/실장님 프린트용)
            try {
              var _existsInfo = _mirrorFolder.getFilesByName("시험정보.txt");
              if (!_existsInfo.hasNext()) {
                var _infoTxt = "[문제생성기 자동 등록]\n" +
                  "선생님: " + teacher + "\n" +
                  "대상반: " + targetClass + "\n" +
                  "시험날짜: " + examDateStr + "\n" +
                  "시험시간: " + (_examTime||"미정") + "\n" +
                  "시험유형: " + (testType==="vocab"?"단어시험":"문법/독해") + "\n" +
                  "문항수: " + (parsed.sets[0] && parsed.sets[0].questions ? parsed.sets[0].questions.length : "-") + "\n" +
                  "원본 JSON: " + fname + "\n" +
                  "원본 경로: " + _pathLabel + "\n" +
                  "처리시각: " + new Date().toLocaleString("ko-KR") + "\n";
                _mirrorFolder.createFile("시험정보.txt", _infoTxt, MimeType.PLAIN_TEXT);
              }
            } catch(_infoIgn){}
            // ★ v21.6: 원본 docx 휴지통 이동 — '문제생성결과' 폴더에서 사라지게
            //   (관리자가 시험등록 폴더에서만 보이도록 통합)
            // ★ v23.0: 변수명 _trashI 로 변경 (외부 _ci 와 충돌 방지)
            for (var _trashI = 0; _trashI < _copiedDocx.length; _trashI++) {
              try { _copiedDocx[_trashI].setTrashed(true); } catch(_tIgn){}
            }
          }
        } catch(_mirrErr) {
          Logger.log("[examGen mirror] " + String(_mirrErr));
          logSheet.appendRow([new Date().toLocaleString("ko-KR"), _pathLabel, "mirror_error", String(_mirrErr)]);
        }
        for (var si = 0; si < parsed.sets.length && si < _maxSetsToInsert; si++) {
          var set = parsed.sets[si];
          var qs = set.questions || [];
          if (qs.length === 0) continue;
          var answers = {}, types = {};
          var explanations = {};  // ★ v24.10: 클로드 v19 지침의 explanation·choiceExplanations·gradingGuide 모음
          for (var qi = 0; qi < qs.length; qi++) {
            var q = qs[qi];
            var qNum = String(q.number || (qi + 1));
            answers[qNum] = q.answer !== undefined ? q.answer : "";
            var qType = String(q.type || "mc");
            if (qType === "multiple_choice" || qType === "mc" || qType === "obj") {
              types[qNum] = "obj";
            } else {
              types[qNum] = "sub";
            }
            // ★ v24.10: 오답 분석 데이터 수집 (학생앱 채점 결과 화면에서 표시)
            // ★ v25.6 (2026-05-13): 문제 본문 + 선택지도 저장 → Top 7 PDF 에 문제 함께 표시
            //   기존: explanation, choiceExplanations 만 → Top 7 PDF 에 풀이만 나오는 버그
            //   수정: question + choices 도 함께 저장 → 선생님이 출력 → 학생 피드백 자료
            var qExpl = {};
            if (q.question) qExpl.question = String(q.question);
            if (Array.isArray(q.choices)) qExpl.choices = q.choices;
            if (q.answer !== undefined) qExpl.answer = q.answer;
            if (q.explanation) qExpl.explanation = String(q.explanation);
            if (q.choiceExplanations && typeof q.choiceExplanations === "object") qExpl.choiceExplanations = q.choiceExplanations;
            if (q.gradingGuide && typeof q.gradingGuide === "object") qExpl.gradingGuide = q.gradingGuide;
            if (Object.keys(qExpl).length > 0) explanations[qNum] = qExpl;
          }
          var _a = normalizeAnswerData(answers);
          var _t = normalizeAnswerData(types);
          var setName = String(set.setName || setLabels[si] || ("세트" + (si+1)));
          // 세트명 정규화: "A" → "세트A"
          var setLabel = /^세트/.test(setName) ? setName : ("세트" + setName);
          // ★ v23.0: 예상 인원 산정 — requestInfo 에서 추출 (없으면 0, 대시보드는 fallback 으로 학생답안기록 카운트 사용)
          var _expectedCount = Number(
            req.studentCount ||
            req.expectedCount ||
            (Array.isArray(req.studentList) ? req.studentList.length : 0) ||
            (Array.isArray(req.students) ? req.students.length : 0) ||
            0
          );
          // ★ v24.10: T열(20번째, 인덱스 19)에 오답분석JSON 저장
          //   학생앱이 view_answer_key 응답으로 받아 정오표에 펼침 표시
          var _explJson = Object.keys(explanations).length > 0 ? JSON.stringify(explanations) : "";
          ansSheet.appendRow([
            new Date().toLocaleString("ko-KR"),  // 0: 등록일시 (A)
            regSubject,                           // 1: 과목 (B)
            regGrade,                             // 2: 학년 (C)
            regLevel,                             // 3: 레벨 (D)
            testTypeLabel,                        // 4: 시험종류 (E)
            setLabel,                             // 5: 차수(세트) (F)
            qs.length,                            // 6: 문항수 (G)
            JSON.stringify(_a),                   // 7: 정답데이터 (H)
            JSON.stringify(_t),                   // 8: 유형데이터 (I)
            teacher,                              // 9: 선생님 (J)
            _expectedCount,                       // 10: 예상인원 (K)
            targetClass,                          // 11: 대상반 (L)
            examDateStr,                          // 12: 시험날짜 (M)
            // 13: 폴더ID (N) ★ v20.3: 미러 폴더 ID 우선
            (mirrorFolderId ? mirrorFolderId : (folderId + ":" + si)),
            1,                                    // 14: 시작번호 (O)
            "",                                   // 15: 검수 (P)
            "",                                   // 16: 검수상태 (Q)
            "",                                   // 17: 문항맵 (R)
            "",                                   // 18: 폴더메타JSON (S) — dashboard가 자동 채움
            _explJson                             // 19: 오답분석JSON (T) ★ v24.10 신규
          ]);
          insertedCount++;
        }
        // 처리완료 리네임
        try {
          var newName = fname.replace(/\.json$/i, "") + "_처리완료_" + Utilities.formatDate(new Date(), tz, "yyyyMMdd_HHmmss") + ".json";
          f.setName(newName);
        } catch(rnIgn){}
        logSheet.appendRow([new Date().toLocaleString("ko-KR"), _pathLabel, "inserted",
          teacher + " " + targetClass + " · " + insertedCount + "세트"]);
      } catch(scanErr) {
        logSheet.appendRow([new Date().toLocaleString("ko-KR"), _pathLabel, "error", String(scanErr)]);
      }
    }
  }
}
function parseExamFolderName_(folderName, data) {
  var subject = data.subject || "";
  var grade = data.grade || "";
  var level = data.level || "";
  var examType = data.examType || "";
  var className = "";
  var parts = folderName.split("_");
  if (parts.length >= 3) {
    if (!examType) examType = parts[1] || "";
    className = parts.slice(2).join("_");
  }
  var subjectMatch = className.match(/^(영어|국어|수학|과학|사회)/);
  if (!subject && subjectMatch) subject = subjectMatch[1];
  var gradeMatch = className.match(/(초\d|중\d|고\d)/);
  if (!grade && gradeMatch) grade = gradeMatch[1];
  // ── 레벨 추출 (영문 레벨 + 한국어 학교명 모두 지원) ──
  if (!level && gradeMatch) {
    // 학년 뒤 ~ "반" 앞까지 추출: "중3A반" → "A", "중2관교중반" → "관교중", "중2인화여중반외1" → "인화여중"
    var afterGrade = className.substring(className.indexOf(gradeMatch[0]) + gradeMatch[0].length);
    var lvMatch = afterGrade.match(/^(.+?)반/);
    if (lvMatch) level = lvMatch[1];
  }
  return {
    subject: subject,
    grade: grade,
    level: level,
    examType: examType,
    className: className
  };
}
// ============================================================
// v10.1: 정답목록 데이터 수정 API
// 1) folderID 있는 행: Drive에서 정답_처리완료_ JSON 재읽기 → 메타데이터 갱신 (teacher 유지)
// 2) folderID 없고 teacher 비어있는 행: 동일 시험날짜+과목+grade+examType+round 기준으로
//    folderID 있는 행이 이미 존재하면 중복으로 간주 → 삭제
// GET ?action=fix_answer_rows&date=2026.04.18
// ============================================================
function fixAnswerRows_(e) {
  var targetDate = (e.parameter.date || "").trim();
  if (!targetDate) return jsonOut_({result:"error", message:"date 파라미터 필요 (예: 2026.04.18)"});
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("정답목록");
  if (!sheet || sheet.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 시트가 비어있음"});

  var rows = sheet.getDataRange().getValues();
  var fixed = 0, deleted = 0, skipped = 0;
  var folderIdRows = {}; // folderID → row index (1-based)

  // Pass 1: folderID 있는 행 수집 + Drive에서 메타데이터 갱신
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var dateCell = String(r[12] || "");
    if (dateCell.indexOf(targetDate) === -1) continue;
    var fid = String(r[13] || "").trim();
    if (!fid) continue;

    folderIdRows[fid] = i;

    // Drive에서 정답_처리완료_ JSON 재읽기
    try {
      var folder = DriveApp.getFolderById(fid);
      var files = folder.getFiles();
      var jsonFile = null;
      while (files.hasNext()) {
        var f = files.next();
        if (/\.json$/i.test(f.getName())) {
          jsonFile = f;
          break;
        }
      }
      if (!jsonFile) { skipped++; continue; }

      var data = JSON.parse(jsonFile.getBlob().getDataAsString("UTF-8"));
      // ★ 정답/유형 필드를 원형(배열/객체/문자열) 상관없이 {"1":v,...}로 통일
      data.answers = normalizeAnswerData(data.answers);
      data.types = normalizeAnswerData(data.types);
      var parsed = parseExamFolderName_(folder.getName(), data);
      // ★ 부모 폴더에서 날짜 추출 — 선생님 하위폴더 구조도 지원
      // 구조1: 2026.04.18/시험폴더 → 부모=2026.04.18
      // 구조2: 2026.04.18/김진용/시험폴더 → 부모=김진용, 조부모=2026.04.18
      var dateFolder = folder.getParents().hasNext() ? folder.getParents().next() : null;
      var examDateStr = targetDate; // 기본값: API 파라미터
      if (dateFolder) {
        var parentName = dateFolder.getName().replace(/-/g, ".");
        if (/^\d{4}\.\d{2}\.\d{2}$/.test(parentName)) {
          examDateStr = parentName;
        } else {
          // 부모가 날짜가 아니면 (선생님 폴더) → 한 단계 더 올라감
          var grandParent = dateFolder.getParents().hasNext() ? dateFolder.getParents().next() : null;
          if (grandParent) {
            var gpName = grandParent.getName().replace(/-/g, ".");
            if (/^\d{4}\.\d{2}\.\d{2}$/.test(gpName)) examDateStr = gpName;
          }
        }
      }

      // 메타데이터 갱신 (teacher는 기존 값 유지)
      sheet.getRange(i + 1, 2).setValue(parsed.subject);   // B: 과목
      sheet.getRange(i + 1, 3).setValue(parsed.grade);      // C: 학년
      sheet.getRange(i + 1, 4).setValue(parsed.level);      // D: 레벨
      sheet.getRange(i + 1, 5).setValue(parsed.examType);   // E: 시험종류
      sheet.getRange(i + 1, 6).setValue(normalizeSetType_(data.setType || data.round || ""));  // F: 구분(이론편/실전편/혼합)
      sheet.getRange(i + 1, 7).setValue(Number(data.totalQuestions) || 0); // G: 문항수
      sheet.getRange(i + 1, 8).setValue(JSON.stringify(data.answers));     // H: 정답
      sheet.getRange(i + 1, 9).setValue(JSON.stringify(data.types));       // I: 유형
      if (parsed.className && !String(r[11] || "").trim()) {
        sheet.getRange(i + 1, 12).setValue(parsed.className); // L: className
      }
      sheet.getRange(i + 1, 13).setValue(examDateStr);      // M: 시험날짜
      // teacher(J)는 건드리지 않음 — 기존 값 유지

      // 업로드기록에서 teacher 조회 시도 (비어있으면)
      var existingTeacher = String(r[9] || "").trim();
      if (!existingTeacher) {
        try {
          var uSh = ss.getSheetByName("업로드기록");
          if (uSh && uSh.getLastRow() > 1) {
            var uR = uSh.getDataRange().getValues();
            for (var ur = uR.length - 1; ur >= 1; ur--) {
              var uLink = String(uR[ur][10] || "");
              if (uLink.indexOf(fid) >= 0) {
                sheet.getRange(i + 1, 10).setValue(uR[ur][12] || ""); // J: 선생님
                sheet.getRange(i + 1, 11).setValue(Number(uR[ur][13]) || 0); // K: 예상인원
                break;
              }
            }
          }
        } catch(uIgn) {}
      }

      fixed++;
    } catch(err) {
      Logger.log("fix_answer_rows error for folderId " + fid + ": " + err);
      skipped++;
    }
  }

  // Pass 2: 중복 행 삭제 (아래→위로 삭제해야 인덱스 안 밀림)
  // 2-A: 같은 folderID가 2개 이상이면 첫 번째만 남기고 삭제
  // 2-B: folderID 없는 행 삭제
  rows = sheet.getDataRange().getValues(); // refresh
  var seenFolderIds = {};
  // 먼저 위에서 아래로 스캔하며 첫 등장 기록
  for (var i = 1; i < rows.length; i++) {
    var dateCell2 = String(rows[i][12] || "");
    if (dateCell2.indexOf(targetDate) === -1) continue;
    var fid2 = String(rows[i][13] || "").trim();
    if (fid2 && !seenFolderIds[fid2]) {
      seenFolderIds[fid2] = i; // 첫 등장 인덱스
    }
  }
  // 아래에서 위로 삭제
  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    var dateCell3 = String(r[12] || "");
    if (dateCell3.indexOf(targetDate) === -1) continue;
    var fid3 = String(r[13] || "").trim();
    if (!fid3) {
      // folderID 없는 행 = save_answer_key로 수동 등록된 행 → 삭제
      sheet.deleteRow(i + 1);
      deleted++;
    } else if (seenFolderIds[fid3] !== undefined && seenFolderIds[fid3] !== i) {
      // 같은 folderID의 중복 행 → 삭제 (첫 등장만 유지)
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }

  return jsonOut_({
    result: "ok",
    message: "fixed=" + fixed + ", deleted=" + deleted + ", skipped=" + skipped,
    fixed: fixed,
    deleted: deleted,
    skipped: skipped
  });
}

// ============================================================
// v11: 과거 "1차/2차/3차" 행 백업 + 삭제 (관리자용)
// ------------------------------------------------------------
// 사용법:
//   ?action=admin_preview_rounds      — 영향받는 행 개수만 미리보기 (삭제 안 함)
//   ?action=admin_purge_rounds&confirm=YES  — 실제 삭제 실행
//
// 동작:
//   1. "정답목록_백업_YYYYMMDD_HHMMSS" 시트 생성 후 대상 행 복사
//   2. "업로드기록_백업_YYYYMMDD_HHMMSS" 시트도 함께 (F열 기준 매칭은 Upload는 P열=index 15)
//   3. 원본에서 행 삭제 (뒤에서 앞으로 순회)
// 대상 값: "1차", "2차", "3차" (정확 일치 — 이론편/실전편/혼합은 보존)
// ============================================================
function previewRoundsData_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var report = { result: "ok", preview: true, answerList: 0, uploadList: 0, examples: [] };
    var legacyRe = /^[1-3]차$/;
    var aSh = ss.getSheetByName("정답목록");
    if (aSh && aSh.getLastRow() > 1) {
      var aR = aSh.getDataRange().getValues();
      for (var i = 1; i < aR.length; i++) {
        if (legacyRe.test(String(aR[i][5] || "").trim())) {
          report.answerList++;
          if (report.examples.length < 5) {
            report.examples.push({
              sheet: "정답목록",
              row: i + 1,
              examType: aR[i][4],
              round: aR[i][5],
              date: String(aR[i][12] || "")
            });
          }
        }
      }
    }
    var uSh = ss.getSheetByName("업로드기록");
    if (uSh && uSh.getLastRow() > 1) {
      var uR = uSh.getDataRange().getValues();
      for (var j = 1; j < uR.length; j++) {
        if (legacyRe.test(String(uR[j][15] || "").trim())) {
          report.uploadList++;
        }
      }
    }
    report.total = report.answerList + report.uploadList;
    report.message = "삭제 예정: 정답목록 " + report.answerList + "행, 업로드기록 " + report.uploadList + "행 (총 " + report.total + "행). 실제 삭제는 ?action=admin_purge_rounds&confirm=YES";
    return jsonOut_(report);
  } catch (err) {
    return jsonOut_({ result: "error", message: String(err) });
  }
}

function purgeRoundsData_(e) {
  try {
    if (String(e.parameter.confirm || "") !== "YES") {
      return jsonOut_({ result: "error", message: "안전장치: confirm=YES 파라미터가 필요합니다. 먼저 admin_preview_rounds로 영향 범위를 확인하세요." });
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmmss");
    var legacyRe = /^[1-3]차$/;
    var result = { result: "ok", answerDeleted: 0, uploadDeleted: 0, backupSheets: [] };

    // 정답목록 처리
    var aSh = ss.getSheetByName("정답목록");
    if (aSh && aSh.getLastRow() > 1) {
      var aBackupName = "정답목록_백업_" + stamp;
      var aBackup = ss.insertSheet(aBackupName);
      // 헤더 복사
      var aHead = aSh.getRange(1, 1, 1, aSh.getLastColumn()).getValues();
      aBackup.appendRow(aHead[0]);
      var aR = aSh.getDataRange().getValues();
      var aToDelete = []; // 1-based row numbers
      for (var i = 1; i < aR.length; i++) {
        if (legacyRe.test(String(aR[i][5] || "").trim())) {
          aBackup.appendRow(aR[i]);
          aToDelete.push(i + 1);
        }
      }
      // 뒤에서 앞으로 삭제 (인덱스 shift 방지)
      for (var k = aToDelete.length - 1; k >= 0; k--) {
        aSh.deleteRow(aToDelete[k]);
        result.answerDeleted++;
      }
      if (result.answerDeleted > 0) result.backupSheets.push(aBackupName);
      else ss.deleteSheet(aBackup); // 삭제한 행이 없으면 빈 백업 시트 제거
    }

    // 업로드기록 처리
    var uSh = ss.getSheetByName("업로드기록");
    if (uSh && uSh.getLastRow() > 1) {
      var uBackupName = "업로드기록_백업_" + stamp;
      var uBackup = ss.insertSheet(uBackupName);
      var uHead = uSh.getRange(1, 1, 1, uSh.getLastColumn()).getValues();
      uBackup.appendRow(uHead[0]);
      var uR = uSh.getDataRange().getValues();
      var uToDelete = [];
      for (var j = 1; j < uR.length; j++) {
        if (legacyRe.test(String(uR[j][15] || "").trim())) {
          uBackup.appendRow(uR[j]);
          uToDelete.push(j + 1);
        }
      }
      for (var kk = uToDelete.length - 1; kk >= 0; kk--) {
        uSh.deleteRow(uToDelete[kk]);
        result.uploadDeleted++;
      }
      if (result.uploadDeleted > 0) result.backupSheets.push(uBackupName);
      else ss.deleteSheet(uBackup);
    }

    result.message = "삭제 완료: 정답목록 " + result.answerDeleted + "행, 업로드기록 " + result.uploadDeleted + "행. 백업 시트: " + (result.backupSheets.join(", ") || "(없음)");
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_({ result: "error", message: String(err) });
  }
}

// ============================================================
// v11.1: 중복 시험 감지 + 삭제 (응급 조치용)
//
// 사용법:
//   ① ?action=admin_list_exams_by_date&date=2026-04-20
//      → 해당 날짜 시험 목록을 rowIndex 와 함께 반환
//   ② ?action=admin_delete_exam_row&rowIndex=N&confirm=YES
//      → 1개 행 안전 삭제 (백업 시트 자동 생성)
//   ③ ?action=admin_purge_duplicates&date=2026-04-20&confirm=YES
//      → 같은 (className+examType+setType+examDate) 조합 중
//        regTime 이 가장 늦은 것만 남기고 나머지 자동 삭제 (백업 시트 생성)
// ============================================================
function adminListExamsByDate_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("정답목록");
    if (!sheet || sheet.getLastRow() <= 1) return jsonOut_({result:"ok", exams:[]});
    var qDate = String(e.parameter.date || "").trim();
    var qTeacher = String(e.parameter.teacher || "").trim();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    // 날짜 필터 (미지정이면 오늘)
    var target;
    if (qDate) {
      var mm = qDate.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      target = mm ? new Date(parseInt(mm[1],10), parseInt(mm[2],10)-1, parseInt(mm[3],10)) : new Date();
    } else target = new Date();
    var tY = target.getFullYear(), tM = target.getMonth()+1, tD = target.getDate();
    var tDash = Utilities.formatDate(target, tz, "yyyy-MM-dd");
    var tDot = Utilities.formatDate(target, tz, "yyyy.MM.dd");
    var rows = sheet.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (qTeacher && String(r[9]||"").trim() !== qTeacher) continue;
      // 시험날짜 매칭 (r[12] 우선, 없으면 r[0])
      var ds = r[12] ? String(r[12]) : "";
      var isT = false;
      if (ds) {
        if (ds.indexOf(tDash)!==-1 || ds.indexOf(tDot)!==-1) isT = true;
        else {
          var dm = ds.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
          if (dm && parseInt(dm[1],10)===tY && parseInt(dm[2],10)===tM && parseInt(dm[3],10)===tD) isT = true;
        }
      } else if (r[0] instanceof Date) {
        if (Utilities.formatDate(r[0], tz, "yyyy-MM-dd") === tDash) isT = true;
      }
      if (!isT) continue;
      // 등록시간 추출
      var regT = "";
      if (r[0] instanceof Date) regT = Utilities.formatDate(r[0], tz, "yyyy-MM-dd HH:mm:ss");
      else regT = String(r[0]||"");
      out.push({
        rowIndex: i + 1,       // 1-based sheet row
        regTime: regT,
        subject: r[1]||"", grade: r[2]||"", level: r[3]||"",
        examType: r[4]||"",
        setType: r[5]||"",
        className: r[11]||"",
        examDate: r[12] ? String(r[12]) : "",
        teacher: r[9]||"",
        folderId: r[13]||""
      });
    }
    return jsonOut_({result:"ok", count: out.length, exams: out});
  } catch (err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

function adminDeleteExamRow_(e) {
  try {
    if (String(e.parameter.confirm||"") !== "YES") {
      return jsonOut_({result:"error", message:"안전장치: confirm=YES 필요"});
    }
    var rowIdx = parseInt(e.parameter.rowIndex, 10);
    if (!rowIdx || rowIdx < 2) return jsonOut_({result:"error", message:"유효한 rowIndex (2 이상) 필요"});
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("정답목록");
    if (!sheet) return jsonOut_({result:"error", message:"정답목록 시트 없음"});
    if (rowIdx > sheet.getLastRow()) return jsonOut_({result:"error", message:"rowIndex 범위 초과"});
    // ★ v27.15 (2026-05-30): 백업 시트 폭증 차단 — 매월 단일 시트로 누적 (셀 한도 사고 예방)
    //   사고: 매 삭제마다 "정답목록_삭제백업_yyyyMMdd_HHmmss" 새 시트 → 시트 50+개 → 1천만 셀 초과
    //   해결: "정답목록_삭제백업_yyyyMM" (월별 1개) 시트에 누적 append
    var monthStamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMM");
    var bkName = "정답목록_삭제백업_" + monthStamp;
    var bk = ss.getSheetByName(bkName) || ss.insertSheet(bkName);
    if (bk.getLastRow() === 0) {
      var hdr = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
      // 첫 컬럼에 삭제 시각 추가
      bk.appendRow(["삭제시각"].concat(hdr));
    }
    var deleteStamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd HH:mm:ss");
    var rowData = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
    bk.appendRow([deleteStamp].concat(rowData));
    sheet.deleteRow(rowIdx);
    return jsonOut_({
      result:"ok",
      message:"행 " + rowIdx + " 삭제 완료. 백업: " + bkName,
      deletedRow: rowIdx,
      backup: bkName,
      preview: rowData.slice(0, 14)
    });
  } catch (err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

function adminPurgeDuplicates_(e) {
  try {
    if (String(e.parameter.confirm||"") !== "YES") {
      return jsonOut_({result:"error", message:"안전장치: confirm=YES 필요"});
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("정답목록");
    if (!sheet || sheet.getLastRow() <= 1) return jsonOut_({result:"ok", message:"데이터 없음", deleted:0});
    var qDate = String(e.parameter.date||"").trim();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var targetDate = null;
    if (qDate) {
      var mm = qDate.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      if (mm) targetDate = new Date(parseInt(mm[1],10), parseInt(mm[2],10)-1, parseInt(mm[3],10));
    }
    var rows = sheet.getDataRange().getValues();
    // 그룹핑: key → [{rowIdx, regMs, className, examType, setType, examDate}, ...]
    var groups = {};
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      // 날짜 필터 (지정 시)
      if (targetDate) {
        var ds = r[12] ? String(r[12]) : "";
        var matched = false;
        var tDash = Utilities.formatDate(targetDate, tz, "yyyy-MM-dd");
        var tDot = Utilities.formatDate(targetDate, tz, "yyyy.MM.dd");
        if (ds.indexOf(tDash)!==-1 || ds.indexOf(tDot)!==-1) matched = true;
        else {
          var dm = ds.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
          if (dm && parseInt(dm[1],10)===targetDate.getFullYear() && parseInt(dm[2],10)===targetDate.getMonth()+1 && parseInt(dm[3],10)===targetDate.getDate()) matched = true;
        }
        if (!matched) continue;
      }
      var cn = String(r[11]||"").replace(/\s+/g,"");
      var ex = String(r[4]||"").trim();
      var st = String(r[5]||"").trim();
      var dt = String(r[12]||"").trim();
      var tc = String(r[9]||"").trim();
      // className 이 비어있는 구데이터는 level+teacher+examType 로 대체 키
      var key = cn
        ? [cn, ex, st, dt].join("||")
        : ["_NOCN_", String(r[3]||""), tc, ex, st, dt].join("||");
      var regMs = 0;
      if (r[0] instanceof Date) regMs = r[0].getTime();
      else {
        var m2 = String(r[0]||"").match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
        if (m2) regMs = new Date(+m2[1], +m2[2]-1, +m2[3], +m2[4], +m2[5]).getTime();
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push({rowIdx: i+1, regMs: regMs, raw: r.slice(0, 14)});
    }
    // 각 그룹에서 regMs 가 가장 큰 것만 남기고 나머지 삭제 대상 선정
    var toDelete = [];
    var keptPreview = [];
    Object.keys(groups).forEach(function(k){
      var arr = groups[k];
      if (arr.length <= 1) { keptPreview.push({key:k, kept:arr[0].rowIdx, duplicates:0}); return; }
      arr.sort(function(a,b){ return b.regMs - a.regMs; }); // 최신순
      keptPreview.push({key:k, kept:arr[0].rowIdx, duplicates: arr.length - 1});
      for (var x = 1; x < arr.length; x++) toDelete.push(arr[x]);
    });
    if (toDelete.length === 0) {
      return jsonOut_({result:"ok", message:"중복 없음", deleted:0, groups: keptPreview.length});
    }
    // 백업 시트 생성
    var stamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmmss");
    var bkName = "정답목록_중복백업_" + stamp;
    var bk = ss.insertSheet(bkName);
    bk.appendRow(sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]);
    toDelete.forEach(function(t){
      var full = sheet.getRange(t.rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
      bk.appendRow(full);
    });
    // 뒤에서 앞으로 삭제 (인덱스 shift 방지)
    toDelete.sort(function(a,b){ return b.rowIdx - a.rowIdx; });
    toDelete.forEach(function(t){ sheet.deleteRow(t.rowIdx); });
    return jsonOut_({
      result:"ok",
      message:"중복 제거 완료: " + toDelete.length + "행 삭제, 백업 시트 " + bkName,
      deleted: toDelete.length,
      backup: bkName,
      groups: keptPreview.length,
      details: keptPreview.filter(function(p){return p.duplicates>0;})
    });
  } catch (err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ============================================================
// 다중학교 마이그레이션
//   같은 시험지를 학교별로 따로 등록한 과거 데이터를 병합
//   키: (teacher + subject + grade + examType + setType + examDate + examTime + answers해시)
//   여러 행이 같은 키를 가지면:
//     - 가장 오래된 행의 level 을 "A,B,C" 로 합쳐서 갱신
//     - 최신 regTime 행의 folderId 를 유지 (가장 최근 업로드 파일 경로)
//     - 나머지 행 삭제
// 사용법: ?action=admin_merge_multischool&confirm=YES[&date=2026-04-20][&dry=1]
// ============================================================
function adminMergeMultiSchool_(e) {
  try {
    if (String(e.parameter.confirm || "") !== "YES" && !e.parameter.dry) {
      return jsonOut_({
        result:"error",
        message:"안전장치: 실제 병합을 원하면 confirm=YES 를 붙이세요. 또는 dry=1 로 미리보기만 실행하세요."
      });
    }
    var dryRun = !!e.parameter.dry;
    var dateFilter = String(e.parameter.date || "").trim(); // 특정 날짜만 처리 (선택)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("정답목록");
    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonOut_({result:"ok", message:"대상 행 없음", merged:0, deleted:0});
    }
    var rows = sheet.getDataRange().getValues();
    // 답안 해시
    var ansHash_ = function(raw) {
      try {
        var a = raw; if (typeof a === "string") { try { a = JSON.parse(a); } catch(e1){ a = {}; } }
        if (!a || typeof a !== "object") return "";
        var keys = Object.keys(a).sort();
        var parts = [];
        for (var i=0;i<keys.length;i++) parts.push(keys[i]+":"+String(a[keys[i]]));
        return parts.join("|");
      } catch(e){return "";}
    };
    // 날짜 매칭 헬퍼
    var dateMatches_ = function(rowDate, filter) {
      if (!filter) return true;
      var s = String(rowDate || "");
      if (!s) return false;
      var f = filter.replace(/[^0-9]/g,"");
      var r = s.replace(/[^0-9]/g,"");
      return r.indexOf(f) === 0;
    };
    // 그룹핑
    var groups = {};
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var examDate = String(r[12] || "");
      if (!dateMatches_(examDate, dateFilter)) continue;
      var sig = [
        String(r[9]||"").trim(),  // teacher
        String(r[1]||""),         // subject
        String(r[2]||""),         // grade
        String(r[4]||""),         // examType
        String(r[5]||""),         // setType
        examDate,
        ansHash_(r[7])
      ].join("#");
      if (!groups[sig]) groups[sig] = [];
      groups[sig].push({rowIdx: i+1, rowData: r, origIdx: i, level: String(r[3]||""), regTime: r[0]});
    }
    // 백업
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var stamp = Utilities.formatDate(new Date(), tz, "yyyyMMdd_HHmmss");
    var bkName = "정답목록_다중학교백업_" + stamp;
    var toDelete = [], toUpdate = [], reports = [];
    Object.keys(groups).forEach(function(sig){
      var arr = groups[sig];
      if (arr.length < 2) return;  // 중복 없음
      // level 이 실제로 서로 다른지 확인 (다 같으면 일반 중복이니 건너뜀 — adminPurgeDuplicates 가 처리)
      var levelSet = {};
      arr.forEach(function(a){ String(a.level||"").split(",").forEach(function(x){ var v=String(x||"").replace(/\s+/g,""); if(v)levelSet[v]=true; }); });
      var levels = Object.keys(levelSet);
      if (levels.length < 2) return;  // 같은 학교 중복 — skip
      // 기준 행: regTime 가장 오래된 행 (가장 먼저 등록된 걸 유지해서 level 합침)
      arr.sort(function(a,b){
        var ta = a.regTime instanceof Date ? a.regTime.getTime() : 0;
        var tb = b.regTime instanceof Date ? b.regTime.getTime() : 0;
        return ta - tb;
      });
      var keeper = arr[0];
      var mergedLevel = levels.join(",");
      // folderId 는 최신 행 걸 유지
      var newestFolderId = "";
      var newestTs = -1;
      arr.forEach(function(a){
        var t = a.regTime instanceof Date ? a.regTime.getTime() : 0;
        if (t > newestTs) { newestTs = t; newestFolderId = String(a.rowData[13]||""); }
      });
      toUpdate.push({rowIdx: keeper.rowIdx, level: mergedLevel, folderId: newestFolderId, origLevel: keeper.level});
      for (var k=1;k<arr.length;k++) toDelete.push({rowIdx: arr[k].rowIdx});
      reports.push({
        subject: String(keeper.rowData[1]||""),
        grade: String(keeper.rowData[2]||""),
        examDate: String(keeper.rowData[12]||""),
        teacher: String(keeper.rowData[9]||""),
        examType: String(keeper.rowData[4]||""),
        schoolsBefore: arr.map(function(a){return a.level;}),
        schoolsAfter: mergedLevel,
        rowsDeleted: arr.length - 1
      });
    });
    if (dryRun) {
      return jsonOut_({
        result:"ok",
        dry:true,
        message:"미리보기 (실제 병합 안 함) — confirm=YES 붙이면 실행됨",
        wouldMerge: toUpdate.length,
        wouldDelete: toDelete.length,
        reports: reports
      });
    }
    if (toUpdate.length === 0 && toDelete.length === 0) {
      return jsonOut_({result:"ok", message:"병합 대상 없음", merged:0, deleted:0});
    }
    // 백업 시트 복사
    var bkSheet = sheet.copyTo(ss); bkSheet.setName(bkName);
    // level/folderId 갱신 (D열=4, N열=14)
    toUpdate.forEach(function(u){
      sheet.getRange(u.rowIdx, 4).setValue(u.level);
      if (u.folderId) sheet.getRange(u.rowIdx, 14).setValue(u.folderId);
    });
    // 삭제 (뒤에서 앞으로)
    toDelete.sort(function(a,b){return b.rowIdx - a.rowIdx;});
    toDelete.forEach(function(t){ sheet.deleteRow(t.rowIdx); });
    return jsonOut_({
      result:"ok",
      message:"다중학교 병합 완료: " + toUpdate.length + "개 그룹 병합, " + toDelete.length + "행 삭제, 백업 " + bkName,
      merged: toUpdate.length,
      deleted: toDelete.length,
      backup: bkName,
      reports: reports
    });
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ============================================================
// 오늘 시험 재등록 — 폴더 ID 기반 신규 코드로 재처리
// "정답_처리완료_" 파일을 모두 스캔해서 폴더ID 없는 행을 교정
// Apps Script 편집기에서 reRegisterTodayExams 선택 후 ▶ 실행
// ============================================================
// ============================================================
// 오늘 날짜 행 전부 삭제 후 폴더 기준으로 깨끗하게 재등록
// stale/중복 행 완전 정리용 — Apps Script 편집기에서 실행
// ============================================================
function cleanAndReRegisterToday() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var answerSheet = ss.getSheetByName("정답목록");
  if (!answerSheet) { Logger.log("정답목록 시트 없음"); return; }
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDash = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  var todayDot  = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
  // 헤더에 폴더ID 컬럼 확보
  var lastCol = answerSheet.getLastColumn();
  var headerRow = answerSheet.getRange(1, 1, 1, Math.max(lastCol, 14)).getValues()[0];
  if (headerRow[13] !== "폴더ID") answerSheet.getRange(1, 14).setValue("폴더ID");
  // 오늘 날짜 행 찾아서 삭제 (아래부터 위로)
  var rows = answerSheet.getDataRange().getValues();
  var deleted = 0;
  for (var i = rows.length - 1; i >= 1; i--) {
    var dateCell = String(rows[i][12] || "");
    var regDate = rows[i][0];
    var isToday = false;
    if (dateCell.indexOf(todayDash) !== -1 || dateCell.indexOf(todayDot) !== -1) {
      isToday = true;
    } else if (regDate instanceof Date) {
      isToday = Utilities.formatDate(regDate, tz, "yyyy-MM-dd") === todayDash;
    } else if (String(regDate).indexOf(todayDash) !== -1 || String(regDate).indexOf(todayDot) !== -1) {
      isToday = true;
    }
    if (isToday) {
      answerSheet.deleteRow(i + 1);
      deleted++;
    }
  }
  Logger.log("🗑️ 오늘 날짜 stale 행 " + deleted + "건 삭제 완료");
  // 이제 폴더 기준으로 깨끗하게 재등록
  reRegisterTodayExams();
  Logger.log("✅ cleanAndReRegisterToday 완료");
}
function reRegisterTodayExams() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var answerSheet = ss.getSheetByName("정답목록");
  if (!answerSheet) { Logger.log("정답목록 시트 없음"); return; }
  // 헤더에 폴더ID 컬럼 확보
  var lastCol = answerSheet.getLastColumn();
  var headerRow = answerSheet.getRange(1, 1, 1, Math.max(lastCol, 14)).getValues()[0];
  if (headerRow[13] !== "폴더ID") answerSheet.getRange(1, 14).setValue("폴더ID");
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
  var rootFolders = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!rootFolders.hasNext()) { Logger.log("채움학원 시험자료 폴더 없음"); return; }
  var rootFolder = rootFolders.next();
  var inserted = 0;
  var skipped = 0;
  // ★ 3단계 구조 지원 헬퍼: 날짜 폴더 아래 모든 시험 폴더 수집 (선생님 하위폴더 포함)
  function collectDoneFolders_(parentFolder) {
    var result = [];
    var subs = parentFolder.getFolders();
    while (subs.hasNext()) {
      var sub = subs.next();
      var hasProcessed = false;
      var ff = sub.getFiles();
      while (ff.hasNext()) {
        if (ff.next().getName().indexOf("_처리완료_") >= 0) { hasProcessed = true; break; }
      }
      if (hasProcessed) {
        result.push(sub);
      } else {
        // 선생님 폴더일 수 있음 → 한 단계 더 탐색
        var innerSubs = sub.getFolders();
        while (innerSubs.hasNext()) {
          var inner = innerSubs.next();
          var innerHas = false;
          var iff = inner.getFiles();
          while (iff.hasNext()) {
            if (iff.next().getName().indexOf("_처리완료_") >= 0) { innerHas = true; break; }
          }
          if (innerHas) result.push(inner);
        }
      }
    }
    return result;
  }
  var dateFolders = rootFolder.getFolders();
  while (dateFolders.hasNext()) {
    var dateFolder = dateFolders.next();
    var examDateStr = dateFolder.getName().replace(/-/g, ".");
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(examDateStr)) continue; // 날짜 폴더 아니면 건너뜀
    var examFolderList2 = collectDoneFolders_(dateFolder);
    for (var efi2 = 0; efi2 < examFolderList2.length; efi2++) {
      var examFolder = examFolderList2[efi2];
      var folderId = examFolder.getId();
      // "정답_처리완료_" 파일 찾기
      var doneFiles = examFolder.getFiles();
      var doneFile = null;
      while (doneFiles.hasNext()) {
        var f = doneFiles.next();
        if (f.getName().indexOf("_처리완료_") >= 0 && /\.json$/i.test(f.getName())) { doneFile = f; break; }
      }
      if (!doneFile) { skipped++; continue; }
      try {
        var data = JSON.parse(doneFile.getBlob().getDataAsString("UTF-8"));
        if (!data.answers || !data.types || !data.totalQuestions) { skipped++; continue; }
        var parsed = parseExamFolderName_(examFolder.getName(), data);
        var fn = examFolder.getName();
        var tm = fn.match(/^(\d{1,2})시(\d{2})분/);
        var examTimeStr = tm ? (("0"+tm[1]).slice(-2) + ":" + tm[2]) : "";
        // 이미 이 폴더 ID로 등록됐으면 className이 비어있을 경우만 보정
        var rows = answerSheet.getDataRange().getValues();
        var alreadyExists = false;
        for (var r = 1; r < rows.length; r++) {
          if (String(rows[r][13] || "") === folderId) {
            alreadyExists = true;
            // className이 비어있으면 채워넣기
            if (!String(rows[r][11] || "").trim() && parsed.className) {
              answerSheet.getRange(r + 1, 12).setValue(parsed.className);
              Logger.log("🔧 className 보정: " + parsed.className + " (폴더: " + fn + ")");
            }
            // level이 비어있거나 "전체"인데 parsed.level이 구체적이면 교체
            if (parsed.level && parsed.level !== "전체" && (!rows[r][3] || rows[r][3] === "전체")) {
              answerSheet.getRange(r + 1, 4).setValue(parsed.level);
              Logger.log("🔧 level 보정: " + parsed.level + " (폴더: " + fn + ")");
            }
            break;
          }
        }
        if (alreadyExists) { skipped++; continue; }
        // 새 행 추가 (폴더 ID 포함)
        answerSheet.appendRow([
          new Date().toLocaleString("ko-KR"),
          parsed.subject, parsed.grade, parsed.level, parsed.examType,
          normalizeSetType_(data.setType || data.round || ""),
          Number(data.totalQuestions) || 0,
          JSON.stringify(data.answers),
          JSON.stringify(data.types),
          "", 0, parsed.className || "",
          examDateStr,
          folderId
        ]);
        Logger.log("✅ 등록: " + parsed.subject + " " + parsed.grade + " " + parsed.level
          + " " + parsed.examType + " [" + examTimeStr + "] 폴더: " + fn);
        inserted++;
      } catch(err) {
        Logger.log("❌ 오류: " + examFolder.getName() + " — " + err);
        skipped++;
      }
    }
  }
  Logger.log("=== 재등록 완료: " + inserted + "건 추가, " + skipped + "건 건너뜀 ===");
}
function markExamInfoDone_(examFolder) {
  var files = examFolder.getFilesByName("시험정보.txt");
  if (!files.hasNext()) return;
  var file = files.next();
  var content = file.getBlob().getDataAsString("UTF-8");
  if (content.indexOf("분석완료") !== -1) return;
  var stamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm");
  var newContent = content.replace(/\s*$/, "") + "\n\n분석완료 " + stamp + "\n";
  file.setContent(newContent);
}
function updateUploadRecordStatus_(parsed, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var upSheet = ss.getSheetByName("업로드기록");
  if (!upSheet || upSheet.getLastRow() <= 1) return;
  var upRows = upSheet.getDataRange().getValues();
  for (var u = upRows.length - 1; u >= 1; u--) {
    if (upRows[u][1] === parsed.subject &&
        upRows[u][2] === parsed.grade &&
        upRows[u][3] === parsed.level &&
        upRows[u][5] === parsed.examType &&
        String(upRows[u][11]).indexOf("대기중") === 0) {
      upSheet.getRange(u + 1, 12).setValue(newStatus);
      break;
    }
  }
}
function installAnswerQueueTrigger() {
  // ★ v26.3 (2026-05-13): 1분 → 10분 간격으로 변경 (timeout 누적 방지)
  //   processAnswerQueue 가 매번 6분 timeout 매 1분마다 실행 → GAS 동시 실행 한도 잠식
  //   10분 간격 + 시간 제한 + 최근 7일만 스캔으로 안전화
  // 기존 트리거 모두 제거 (1분짜리 제거)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processAnswerQueue") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // 10분 간격으로 재설치
  ScriptApp.newTrigger("processAnswerQueue")
    .timeBased()
    .everyMinutes(10)
    .create();
  Logger.log("✅ processAnswerQueue 트리거 재설치 — 10분 간격 (기존 1분에서 변경)");
}
function removeAnswerQueueTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processAnswerQueue") {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  Logger.log("제거된 트리거: " + removed + "개");
}

// ★ v23.7: 미러 스캔을 백그라운드 트리거로 실행 (5분마다 자동)
//   대시보드 호출 시 동기 실행하면 30초+ 걸려서 느림 → 백그라운드로 이동
//   설치 방법: GAS 편집기에서 setupBackgroundMirrorScan() 한 번 실행
function setupBackgroundMirrorScan() {
  var triggers = ScriptApp.getProjectTriggers();
  var hasMirror = false;
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === "backgroundMirrorScan") hasMirror = true;
    // ★ v27.3 (2026-05-14): cleanEmptyExamFolders 트리거 무조건 제거 (정상 폴더도 휴지통 보내는 위험)
    if (fn === "cleanEmptyExamFolders") {
      try { ScriptApp.deleteTrigger(triggers[i]); Logger.log("🗑️ cleanEmptyExamFolders 트리거 제거 (위험)"); } catch(_e){}
    }
  }
  if (!hasMirror) {
    // ★ v27.3 (2026-05-14): 5분 → 30분 으로 변경 (race condition 감소 + 안전성↑)
    //   5분이면 두 트리거가 겹쳐서 같은 JSON 두 번 처리 가능 → 미러 폴더 중복 파일
    //   30분이면 GAS timeout 영향 X + 일일 트리거 실행 횟수 6배 감소
    ScriptApp.newTrigger("backgroundMirrorScan").timeBased().everyMinutes(30).create();
    Logger.log("✅ 백그라운드 미러 스캔 트리거 설치 (30분마다 — v27.3 안전화)");
  }
  // ★ v27.3: cleanEmptyExamFolders 자동 설치 제거됨 — 빈 폴더는 사용자가 수동으로 정리
  //   원인: 정상 폴더가 일시적으로 빈 상태일 때 (업로드 직후 등) 자동 휴지통 → 데이터 손실
  //   대안: cleanEmptyExamFolders 는 함수로는 남아있음. 필요 시 사용자가 GAS 에디터에서 직접 실행.
}

// ★ v24.5: 폴더메타 캐시 강제 초기화 (GAS 에디터에서 수동 실행용)
//   사용법: GAS 에디터 → 함수 드롭다운 → clearAllFolderMetaCache → ▶ 실행
//   효과: 정답목록 시트 S열(폴더메타JSON) 전체 비움 + CacheService fld_* 모두 제거
//        → 다음 대시보드 호출 시 모든 행이 Drive API 재스캔 → 새 형식으로 캐시 재구성
//   언제: "📎 완료"는 뜨는데 첨부 토글이 안 보이는 경우, 또는 GAS 업데이트 후 캐시 마이그레이션
// ★ v24.9: 업로드기록 시트에서 폴더ID 자동 매칭 (정답목록 r[13] 빈 행 복구용)
//   정답목록 행의 (시험날짜, 선생님, 반/대상반, 시험종류) → 업로드기록에서 매칭 → folderUrl 추출 → 폴더ID 반환
//   사용처: teacher_dashboard_에서 r[13] 빈 행을 만나면 자동 호출 → 결과를 r[13]에 영구 저장
function findFolderIdFromUploadRecord_(answerRow, ss) {
  try {
    var aDate = String(answerRow[12] || "").trim();    // 시험날짜
    var aTeacher = String(answerRow[9] || "").trim();  // 선생님
    var aClass = String(answerRow[11] || "").trim();   // 대상반
    var aType = String(answerRow[4] || "").trim();     // 시험종류
    if (!aDate && !aClass && !aTeacher) return "";

    var uSh = ss.getSheetByName("업로드기록");
    if (!uSh || uSh.getLastRow() <= 1) return "";

    var uLastRow = uSh.getLastRow();
    var uLastCol = Math.min(uSh.getLastColumn(), 16);
    // 최근 300행만 검색 (성능)
    var startRow = Math.max(2, uLastRow - 300);
    var rows = uSh.getRange(startRow, 1, uLastRow - startRow + 1, uLastCol).getValues();

    // 날짜 정규화 (yyyy.MM.dd vs yyyy-MM-dd 둘 다)
    var aDateDot = aDate.replace(/-/g, ".");
    var aDateDash = aDate.replace(/\./g, "-");
    var aDateYmd = aDate.substring(0, 10);

    // 매칭 점수: 더 많이 일치하는 행 우선
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      var uDate = String(u[6] || "").trim();         // 시험날짜 (열 G)
      var uClass = String(u[4] || "").trim();        // 대상반 (열 E)
      var uType = String(u[5] || "").trim();         // 시험종류 (열 F)
      var uTeacher = String(u[12] || "").trim();     // 선생님 (열 M)
      var uFolderUrl = String(u[10] || "").trim();   // 폴더링크 (열 K)
      if (!uFolderUrl) continue;

      var score = 0;
      // 날짜 매칭 (가장 중요)
      if (aDate && uDate) {
        if (uDate.indexOf(aDateDot) >= 0 || uDate.indexOf(aDateDash) >= 0 || uDate.indexOf(aDateYmd) >= 0) score += 3;
      }
      // 선생님 매칭
      if (aTeacher && uTeacher && aTeacher === uTeacher) score += 2;
      // 대상반 매칭 (반 이름 안에 포함되는지)
      if (aClass && uClass && (uClass.indexOf(aClass) >= 0 || aClass.indexOf(uClass) >= 0)) score += 2;
      // 시험종류 매칭
      if (aType && uType && aType === uType) score += 1;

      if (score > bestScore && score >= 4) { // 최소 4점 이상이어야 매칭 (날짜 + 선생님 또는 반)
        bestScore = score;
        best = uFolderUrl;
      }
    }

    if (!best) return "";
    // folderUrl에서 폴더ID 추출: https://drive.google.com/drive/folders/<ID>
    var m = best.match(/\/folders\/([a-zA-Z0-9_\-]+)/);
    return m ? m[1] : "";
  } catch (err) {
    Logger.log("[findFolderIdFromUploadRecord_] error: " + err);
    return "";
  }
}

// ─── v25.0 (2026-05-13): debugLatestExams 삭제됨 (이새나 첨부 문제 해결 완료) ───
// 진단 대신 HTTP endpoint diagDashFiles_ 사용 (action=diag_dash_files)
// 백업: _옛버전_백업/AppsScript_v24_12.txt 참조

// ★ v24.6: 대시보드 파일 진단 (브라우저 URL로 호출 가능)
//   사용법: {{SHEETS_URL}}?action=diag_dash_files&teacher=장문석&date=2026-05-12
//   효과: 해당 선생님의 오늘 시험 행 + 폴더 실제 파일 목록을 JSON으로 반환
//   목적: r[13] 폴더ID가 진짜 유효한지, 폴더에 파일이 진짜 있는지, r[18] 캐시는 무엇인지 한눈에 확인
function diagDashFiles_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh || sh.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 시트 비어있음"});
    var qTeacher = String((e && e.parameter && e.parameter.teacher) || "").trim();
    var qDate = String((e && e.parameter && e.parameter.date) || "").trim();
    var qDateAlt = qDate.replace(/-/g, ".");
    var lastRow = sh.getLastRow();
    var lastCol = Math.min(sh.getLastColumn(), 19);
    var rows = sh.getRange(1, 1, lastRow, lastCol).getValues();
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var teacher = String(r[9] || "").trim();
      var examDate = String(r[12] || "").trim();
      if (qTeacher && teacher !== qTeacher) continue;
      if (qDate && examDate.indexOf(qDate) === -1 && examDate.indexOf(qDateAlt) === -1) continue;
      var fid = String(r[13] || "").trim();
      var metaRaw = String(r[18] || "");
      var diag = {
        sheetRow: i + 1,
        subject: r[1] || "",
        grade: r[2] || "",
        level: r[3] || "",
        examType: r[4] || "",
        teacher: teacher,
        targetClass: r[11] || "",
        examDate: examDate,
        folderId: fid,
        folderIdHasColon: fid.indexOf(":") >= 0,
        folderMetaJson_raw: metaRaw,
        folderMetaJson_parsed: null,
        folderMetaJson_filesCount: -1,
        folderExists: false,
        folderName: "",
        folderUrl: "",
        actualFiles: [],
        error: ""
      };
      // r[18] 파싱
      if (metaRaw) {
        try {
          var meta = JSON.parse(metaRaw);
          diag.folderMetaJson_parsed = meta;
          diag.folderMetaJson_filesCount = (meta && Array.isArray(meta.files)) ? meta.files.length : -1;
        } catch(eM) {
          diag.folderMetaJson_parsed = "parse_error: " + eM;
        }
      }
      // 폴더 실제 확인
      if (fid && fid.indexOf(":") < 0) {
        try {
          var folder = DriveApp.getFolderById(fid);
          diag.folderExists = true;
          diag.folderName = folder.getName();
          diag.folderUrl = folder.getUrl();
          var ff = folder.getFiles();
          while (ff.hasNext()) {
            var file = ff.next();
            diag.actualFiles.push({
              name: file.getName(),
              size: file.getSize(),
              mimeType: file.getMimeType(),
              id: file.getId()
            });
          }
        } catch(eF) {
          diag.error = "폴더 접근 실패: " + eF;
        }
      } else {
        diag.error = "폴더ID가 비어있거나 잘못된 형식 (콜론 포함)";
      }
      out.push(diag);
    }
    return jsonOut_({
      result: "ok",
      query: { teacher: qTeacher, date: qDate },
      matched: out.length,
      rows: out
    });
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ─── v25.0 (2026-05-13): clearAllFolderMetaCache 삭제됨 (1회 실행 완료) ───
// 옛 캐시 모두 정리됨. 백업: _옛버전_백업/AppsScript_v24_12.txt 참조

function backgroundMirrorScan() {
  // ★ v28 (2026-05-16): 비활성화 — 워커가 직접 doPost(register_exam_gen_v28) 호출
  //   옛 흐름 (5분 트리거 + Drive 스캔 + 매칭) 제거
  //   롤백 필요 시 백업 시트의 코드 복원
  Logger.log("[backgroundMirrorScan] v28 비활성화됨 — 호출 무시");
  return;
}
// ============================================================
// v6: 학생 앱 UX 개선 (오늘의 시험 목록 / 내 성적 조회)
// ============================================================
function listExamsToday_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("정답목록");
    if (!sheet || sheet.getLastRow() <= 1) return jsonOut_({result:"ok", exams:[]});
    var rows = sheet.getDataRange().getValues();
    var subject = e.parameter.subject, grade = e.parameter.grade, level = e.parameter.level;
    var qTeacher = String(e.parameter.teacher || "").trim();
    var qClassName = String(e.parameter.className || "").replace(/\s+/g, "");
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    // 학생이 지정한 날짜 (기본은 오늘). "yyyy-MM-dd" 또는 "yyyy.MM.dd" 허용
    var qDate = (e.parameter.date || "").trim();
    var target;
    if (qDate) {
      var mm = qDate.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      target = mm ? new Date(parseInt(mm[1],10), parseInt(mm[2],10)-1, parseInt(mm[3],10)) : new Date();
    } else {
      target = new Date();
    }
    var todayY = target.getFullYear();
    var todayM = target.getMonth() + 1;
    var todayD = target.getDate();
    var todayDash = Utilities.formatDate(target, tz, "yyyy-MM-dd");
    var todayDot  = Utilities.formatDate(target, tz, "yyyy.MM.dd");
    var exams = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      // ★ v25.8 (2026-05-13): 추천보강은 학생앱 "오늘의 시험 찾기" 에서 제외
      //   원인: 학생이 시험 풀면 → 추천보강 자동 생성 → 다음 조회 시 시험 목록에 추천보강 카드도 나옴
      //   해결: examType === "추천보강" 행 skip (학생앱은 결과 화면 + 홈 배지로만 접근)
      if (String(r[4] || "").trim() === "추천보강") continue;
      // 과목 필터: 비어 있으면 전체 과목 통과
      if (subject && r[1] !== subject) continue;
      if (r[2] !== grade) continue;
      // 레벨 매칭: 정확히 일치 OR 등록 레벨이 "전체" OR 검색 레벨이 "전체"
      //   ★ 다중학교 지원: 등록 레벨이 "관교여중,관교중" 같이 쉼표 구분이면 학생 레벨이 포함되는지 확인
      //     (같은 시험지를 여러 학교가 공유하는 경우)
      {
        var rowLevelRaw = String(r[3] || "");
        var levelMatched = false;
        if (rowLevelRaw === level || rowLevelRaw === "전체" || level === "전체") {
          levelMatched = true;
        } else if (rowLevelRaw.indexOf(",") !== -1) {
          // 쉼표로 여러 학교가 묶인 경우: 공백 제거 후 완전일치 검색
          var parts = rowLevelRaw.split(",");
          for (var lp = 0; lp < parts.length; lp++) {
            if (String(parts[lp]).replace(/\s+/g,"") === String(level).replace(/\s+/g,"")) {
              levelMatched = true; break;
            }
          }
        }
        if (!levelMatched) continue;
      }
      // ★ className 필터: 행에 className이 있고, 학생 className과 다르면 스킵
      //   (행 className이 비어있으면 하위호환을 위해 통과)
      if (qClassName) {
        var rowCn = String(r[11] || "").replace(/\s+/g, "");
        if (rowCn && rowCn !== qClassName) continue;
      }
      // ★ 선생님 이름 필터: 학생이 선생님을 선택했으면 해당 선생님 시험만
      if (qTeacher) {
        var rowTeacher = String(r[9] || "").trim();
        if (rowTeacher && rowTeacher !== qTeacher) continue;
      }
      // ★ 시험날짜(13번째 컬럼, 인덱스 12) 우선 확인, 없으면 등록일시(r[0]) 폴백
      var dateSource = r[12] ? String(r[12]) : "";
      var isToday = false;
      if (dateSource) {
        // 시험날짜 컬럼으로 매칭 (yyyy.MM.dd / yyyy-MM-dd 등)
        if (dateSource.indexOf(todayDash) !== -1 || dateSource.indexOf(todayDot) !== -1) {
          isToday = true;
        } else {
          var dm = dateSource.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
          if (dm && parseInt(dm[1],10)===todayY && parseInt(dm[2],10)===todayM && parseInt(dm[3],10)===todayD) {
            isToday = true;
          }
        }
      } else {
        // 시험날짜 없으면 등록일시로 폴백 (하위호환)
        if (r[0] instanceof Date) {
          isToday = Utilities.formatDate(r[0], tz, "yyyy-MM-dd") === todayDash;
        } else {
          var s = String(r[0] || "");
          if (s.indexOf(todayDash) !== -1) isToday = true;
          else if (s.indexOf(todayDot) !== -1) isToday = true;
          else {
            var m = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
            if (m && parseInt(m[1],10)===todayY && parseInt(m[2],10)===todayM && parseInt(m[3],10)===todayD) {
              isToday = true;
            }
          }
        }
      }
      if (!isToday) continue;
      var ans = {};
      try { ans = r[7] ? JSON.parse(r[7]) : {}; } catch(er) { ans = {}; }
      var typ = {};
      try { typ = r[8] ? JSON.parse(r[8]) : {}; } catch(er) { typ = {}; }
      // 등록일시에서 시간 추출 (Date 객체 또는 한국어 문자열 모두 처리)
      var regTimeStr = "";
      try {
        if (r[0] instanceof Date) {
          regTimeStr = Utilities.formatDate(r[0], tz, "HH:mm");
        } else {
          var ts = String(r[0] || "");
          var tp = ts.match(/(\d{1,2}):(\d{2})/);
          if (tp) {
            var hh = parseInt(tp[1],10);
            if (/PM/i.test(ts) && hh < 12) hh += 12;
            if (/AM/i.test(ts) && hh === 12) hh = 0;
            regTimeStr = ("0"+hh).slice(-2) + ":" + tp[2];
          }
        }
      } catch(ignore){}
      // 폴더 ID → 시험 시간 역추출 (Drive에서 폴더명 조회)
      var examTimeStr = "";
      try {
        var fid = String(r[13] || "");
        if (fid) {
          var f = DriveApp.getFolderById(fid);
          var fn = f.getName(); // 예: "19시00분_수학테스트_수학중2A반"
          var tm = fn.match(/^(\d{1,2})시(\d{2})분/);
          if (tm) examTimeStr = ("0"+tm[1]).slice(-2) + ":" + tm[2];
        }
      } catch(ignore){}
      // ★ 다중학교 등록 시 학생에게는 본인 학교만 보이게 표시 레벨 조정
      var displayLevel = r[3] || "";
      if (displayLevel && displayLevel.indexOf(",") !== -1 && level && level !== "전체") {
        displayLevel = level; // 학생이 선택한 학교로 표시
      }
      exams.push({
        examType: r[4],
        round: r[5] || "",
        setType: r[5] || "",  // F열: 이론편/실전편/혼합 (신규) 또는 레거시 1차/2차/3차
        totalQuestions: Number(r[6]) || 0,
        answers: ans,
        types: typ,
        subject: r[1] || "",
        grade: r[2] || "",
        level: displayLevel,
        levelRaw: r[3] || "",  // 원본 (다중학교 그대로) — 필요 시 참고용
        className: r[11] || "",
        examDate: r[12] ? String(r[12]) : "",
        regTime: regTimeStr,
        examTime: examTimeStr,   // ★ 시험 시작 시간 (19:00 / 20:00 등)
        folderId: String(r[13] || ""),
        teacher: r[9] || "",
        startNumber: Number(r[14]) || 1,  // ★ 시작번호 (O열, 기본 1)
        // ★ v15: 검수 메타데이터 (P/Q/R열) — 선생님앱 이력 카드에서 뱃지로 표시
        verification: (function(){ try { return r[15] ? JSON.parse(String(r[15])) : null; } catch(e){ return null; } })(),
        verificationStatus: String(r[16] || ""),
        questionNumberMap: (function(){ try { return r[17] ? JSON.parse(String(r[17])) : null; } catch(e){ return null; } })(),
        // ★ v22.7: 주관식 채점 모드 — verification.gradingMode 에서 추출 (없으면 strict 기본)
        gradingMode: (function(){
          try {
            var v = r[15] ? JSON.parse(String(r[15])) : null;
            return (v && v.gradingMode === "loose") ? "loose" : "strict";
          } catch(e){ return "strict"; }
        })(),
        _rowIdx: i  // 내부용: 중복 제거 시 최신 행 구분
      });
    }
    // ★ 중복 제거: 2단계 전략
    //   1차) 같은 (className + examType + setType + examDate) 조합
    //   2차) 같은 (teacher + subject + grade + examType + setType + examDate + examTime + 답안해시)
    //        — 같은 시험지를 여러 학교/반에 따로 등록한 과거 데이터 병합용 (다중학교 마이그레이션 전)
    try {
      // 답안해시 함수
      var ansHash_ = function(a) {
        try {
          if (!a || typeof a !== "object") return "";
          var keys = Object.keys(a).sort();
          var parts = [];
          for (var i=0;i<keys.length;i++) parts.push(keys[i]+":"+String(a[keys[i]]));
          return parts.join("|");
        } catch(e){return "";}
      };
      // 1차: className 기반 중복 제거
      var dedup = {};
      for (var dx = 0; dx < exams.length; dx++) {
        var ex = exams[dx];
        var keyCn = String(ex.className || "").replace(/\s+/g,"");
        // ★ v18: 같은 반·시험종류·날짜라도 시간 또는 선생님이 다르면 별개 시험으로 인식
        //   (같은 PDF를 여러 시간대/여러 선생님이 사용한 경우 학생앱에서 모두 보이게)
        var _t = String(ex.examTime || ex.regTime || "");
        var _tch = String(ex.teacher || "");
        var keyBase = keyCn
          ? (keyCn + "|" + ex.examType + "|" + ex.setType + "|" + ex.examDate + "|" + _t + "|" + _tch)
          : (ex.level + "|" + _tch + "|" + ex.examType + "|" + ex.setType + "|" + ex.examDate + "|" + _t);
        var prev = dedup[keyBase];
        if (!prev) { dedup[keyBase] = ex; continue; }
        var a = String(prev.regTime||""), b = String(ex.regTime||"");
        if (b > a || (b === a && (ex._rowIdx||0) > (prev._rowIdx||0))) {
          dedup[keyBase] = ex;
        }
      }
      var stage1 = Object.keys(dedup).map(function(k){ return dedup[k]; });
      // 2차: 답안 시그니처 기반 병합 (같은 시험지를 학교별로 따로 등록한 경우)
      var dedup2 = {};
      for (var d2 = 0; d2 < stage1.length; d2++) {
        var ex2 = stage1[d2];
        var sig = [
          String(ex2.teacher||""),
          String(ex2.subject||""),
          String(ex2.grade||""),
          String(ex2.examType||""),
          String(ex2.setType||""),
          String(ex2.examDate||""),
          String(ex2.examTime||""),
          ansHash_(ex2.answers)
        ].join("#");
        var prev2 = dedup2[sig];
        if (!prev2) { dedup2[sig] = ex2; continue; }
        var a2 = String(prev2.regTime||""), b2 = String(ex2.regTime||"");
        if (b2 > a2 || (b2 === a2 && (ex2._rowIdx||0) > (prev2._rowIdx||0))) {
          dedup2[sig] = ex2;
        }
      }
      exams = Object.keys(dedup2).map(function(k){
        var o = dedup2[k];
        delete o._rowIdx;
        return o;
      });
    } catch(dedupErr) { /* 중복 제거 실패해도 원본 반환 */ }
    return jsonOut_({result:"ok", exams: exams});
  } catch (err) {
    return jsonOut_({result:"error", message: String(err), exams: []});
  }
}
function studentHistory_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var name = (e.parameter.name || "").trim();
    var phone = (e.parameter.phone || "").trim();
    if (!name || !phone) return jsonOut_({result:"error", message:"이름과 폰 뒷자리가 필요합니다.", records:[]});
    var candidates = ["학생답안기록","학생 답안","답안기록","Sheet1","시트1"];
    var sheet = null;
    for (var k = 0; k < candidates.length; k++) {
      var s = ss.getSheetByName(candidates[k]);
      if (s) { sheet = s; break; }
    }
    if (!sheet) {
      var all = ss.getSheets();
      for (var j = 0; j < all.length; j++) {
        var nm = all[j].getName();
        if (nm !== "정답목록" && nm !== "업로드기록" && nm !== "자동처리로그") { sheet = all[j]; break; }
      }
    }
    if (!sheet || sheet.getLastRow() <= 1) return jsonOut_({result:"ok", records:[]});
    var values = sheet.getDataRange().getValues();
    var header = values[0].map(function(h){return String(h||"").trim();});
    function findCol(names) {
      for (var x = 0; x < header.length; x++) {
        for (var y = 0; y < names.length; y++) {
          if (header[x] === names[y]) return x;
        }
      }
      return -1;
    }
    var cName = findCol(["이름","학생이름","name"]);
    var cPhone = findCol(["폰뒷자리","핸드폰뒷자리","폰","phone"]);
    // ★ v27.26 (2026-05-30): 학생 과거기록은 시험날짜를 우선 사용
    // 기존 findCol 은 헤더 순서상 A열 "제출일시"를 먼저 잡을 수 있어,
    // 과거 풀이 보기(view_answer_key)에 제출시각이 넘어가 정답 매칭이 실패할 수 있었다.
    var cDate = findCol(["날짜","시험날짜","date"]);
    if (cDate < 0) cDate = findCol(["등록일시","제출일시"]);
    var cClass = findCol(["반","반이름","className","class"]);
    var cExam = findCol(["시험명","examName","시험종류"]);
    var cScore = findCol(["점수","score"]);
    var cOc = findCol(["정답","correct","정답수"]);
    var cOw = findCol(["오답","wrong","오답수"]);
    var cWq = findCol(["틀린문항","wrongQuestions","오답번호"]);
    // ★ v25.1: 학생앱에서 과거 시험 피드백 조회용 (view_answer_key 호출에 필요)
    var cSub = findCol(["과목","subject"]);
    var cGrade = findCol(["학년","grade"]);
    var cLevel = findCol(["레벨","level"]);
    var cTeacher = findCol(["선생님","teacher"]);
    var cFolderId = findCol(["폴더ID","folderId"]);
    // ★ v27.26: 실제 학생답안기록 헤더는 "답안원본"이므로 과거 피드백의 '내 답' 표시가 비던 문제 보정
    var cAnswers = findCol(["답안원본","답안","answers","studentAnswers"]);
    var cSubjective = findCol(["주관식상세","subjectiveDetails"]);
    var out = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var rowName = cName >= 0 ? String(row[cName]||"").trim() : "";
      var rowPhone = cPhone >= 0 ? String(row[cPhone]||"").trim() : "";
      if (rowName !== name) continue;
      if (cPhone >= 0 && rowPhone && rowPhone !== phone) continue;
      var dateVal = cDate >= 0 ? row[cDate] : "";
      var dateStr = "";
      if (dateVal instanceof Date) {
        dateStr = Utilities.formatDate(dateVal, "Asia/Seoul", "yyyy-MM-dd");
      } else {
        dateStr = String(dateVal || "");
      }
      // ★ v25.2: 옛 P열 손상 데이터 안전장치 — JSON 시작이면 비우기
      var safeTeacher = cTeacher >= 0 ? String(row[cTeacher]||"").trim() : "";
      if (safeTeacher && (safeTeacher.charAt(0) === "[" || safeTeacher.charAt(0) === "{")) safeTeacher = "";
      var safeFolderId = cFolderId >= 0 ? String(row[cFolderId]||"").trim() : "";
      if (safeFolderId && (safeFolderId.charAt(0) === "[" || safeFolderId.charAt(0) === "{")) safeFolderId = "";
      out.push({
        date: dateStr,
        className: cClass >= 0 ? String(row[cClass]||"") : "",
        examName: cExam >= 0 ? String(row[cExam]||"") : "",
        score: cScore >= 0 ? row[cScore] : null,
        correct: cOc >= 0 ? row[cOc] : null,
        wrong: cOw >= 0 ? row[cOw] : null,
        wrongQuestions: cWq >= 0 ? String(row[cWq]||"") : "",
        // ★ v25.1: 피드백 조회용 추가 필드
        subject: cSub >= 0 ? String(row[cSub]||"") : "",
        grade: cGrade >= 0 ? String(row[cGrade]||"") : "",
        level: cLevel >= 0 ? String(row[cLevel]||"") : "",
        teacher: safeTeacher,
        folderId: safeFolderId,
        studentAnswers: cAnswers >= 0 ? String(row[cAnswers]||"") : "",
        subjectiveDetails: cSubjective >= 0 ? String(row[cSubjective]||"") : ""
      });
    }
    out.reverse();
    return jsonOut_({result:"ok", records: out});
  } catch (err) {
    return jsonOut_({result:"error", message: String(err), records: []});
  }
}
// ── 정답목록 헤더 보정 (v7: 선생님/예상인원/대상반 컬럼 추가) ──
function ensureAnswerSheetHeader_(sheet) {
  // ★ v15: 검수 메타데이터 3개 컬럼 추가 (verification / verificationStatus / questionNumberMap)
  var base = ["등록일시","과목","학년","레벨","시험종류","차수","문항수","정답데이터","유형데이터","선생님","예상인원","대상반","시험날짜","폴더ID","시작번호","검수데이터","검수상태","문제번호맵"];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(base);
    sheet.setFrozenRows(1);
    return;
  }
  var lastCol = sheet.getLastColumn();
  if (lastCol < base.length) {
    // 누락된 컬럼만 채워넣기
    var curHeader = sheet.getRange(1,1,1,Math.max(lastCol, base.length)).getValues()[0];
    for (var i = 0; i < base.length; i++) {
      if (!curHeader[i]) curHeader[i] = base[i];
    }
    sheet.getRange(1,1,1,base.length).setValues([curHeader]);
  }
}
// ============================================================
// v7: 선생님 앱 대시보드 — 오늘의 시험 등록/제출 현황
// ============================================================
// ★ Apps Script가 시간 셀을 Date 객체(1899-12-30 epoch)로 읽는 것을 안전하게 문자열화
function fmtTime_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    return Utilities.formatDate(v, tz, "HH:mm");
  }
  var s = String(v).trim();
  // "Sat Dec 30 1899 19:00:00 GMT+0827 (한국 표준시)" 같은 문자열에서 HH:mm만 추출
  var m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return ("0"+m[1]).slice(-2) + ":" + m[2];
  return s;
}
function teacherDashboard_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    // ★ v23.7: 대시보드 응답 캐싱 — 5분 TTL (이전 90초 → 300초)
    //   같은 날짜·선생님 조합으로 5분 안에 다시 호출되면 캐시 즉시 반환 (40초 → 0.5초)
    //   강제 새로고침은 ?force_scan=1 또는 ?nocache=1
    var _cacheSvc = CacheService.getScriptCache();
    var _forceScan = String(e.parameter.force_scan||"") === "1";
    var _noCache = String(e.parameter.nocache||"") === "1";
    var _qDate0 = (e.parameter.date || "").trim();
    var _qTeacher0 = (e.parameter.teacher || "").trim();
    var _cacheKey = "dash_" + _qDate0 + "_" + _qTeacher0;
    if (!_forceScan && !_noCache) {
      var _hit = _cacheSvc.get(_cacheKey);
      if (_hit) {
        try { return ContentService.createTextOutput(_hit).setMimeType(ContentService.MimeType.JSON); }
        catch(_eC) {}
      }
    }
    // ★ v23.7: 미러 스캔은 대시보드에서 완전히 제거 — 백그라운드 트리거로만 실행
    //   대신 setupBackgroundTriggers() 가 5분마다 backgroundMirrorScan() 자동 실행
    //   강제 스캔 필요 시: ?action=scan_exam_gen_results 별도 호출
    //   이 변경으로 대시보드 첫 호출 30초 → 5초 수준 단축
    // ★ 날짜 파라미터 (yyyy-MM-dd / yyyy.MM.dd) — 없으면 오늘
    var qDate = (e.parameter.date || "").trim();
    var target;
    if (qDate) {
      var qm = qDate.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      target = qm ? new Date(parseInt(qm[1],10), parseInt(qm[2],10)-1, parseInt(qm[3],10)) : new Date();
    } else {
      target = new Date();
    }
    var todayY = target.getFullYear();
    var todayM = target.getMonth() + 1;
    var todayD = target.getDate();
    var todayDash = Utilities.formatDate(target, tz, "yyyy-MM-dd");
    var todayDot  = Utilities.formatDate(target, tz, "yyyy.MM.dd");
    function isTodayCell(v) {
      if (v instanceof Date) {
        return Utilities.formatDate(v, tz, "yyyy-MM-dd") === todayDash;
      }
      var s = String(v || "");
      if (!s) return false;
      if (s.indexOf(todayDash) !== -1) return true;
      if (s.indexOf(todayDot) !== -1) return true;
      var m = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      if (m && parseInt(m[1],10)===todayY && parseInt(m[2],10)===todayM && parseInt(m[3],10)===todayD) return true;
      return false;
    }
    var filterTeacher = (e.parameter.teacher || "").trim();
    // ★ 선생님목록 → {이름: 과목} 매핑 로드 (과목 추론 fallback에 사용)
    // v12.1: 카테고리 컬럼 도입으로 헤더 기준으로 이름/과목 위치 동적 탐색
    var teacherSubjectMap = {};
    try {
      var tSheet = ss.getSheetByName(TEACHERS_SHEET);
      if (tSheet && tSheet.getLastRow() > 1) {
        var tHdr = tSheet.getRange(1,1,1,Math.max(1,tSheet.getLastColumn())).getValues()[0];
        var nameIdx = -1, subIdx = -1;
        for (var thi = 0; thi < tHdr.length; thi++) {
          var hv = String(tHdr[thi]||"").trim();
          if (hv === "이름") nameIdx = thi;
          else if (hv === "과목") subIdx = thi;
        }
        if (nameIdx < 0) nameIdx = 0; // fallback 구 스키마
        if (subIdx < 0) subIdx = 1;
        var totalCols = Math.max(nameIdx, subIdx) + 1;
        var tRows = tSheet.getRange(2,1,tSheet.getLastRow()-1,totalCols).getValues();
        for (var ti = 0; ti < tRows.length; ti++) {
          var tname = String(tRows[ti][nameIdx]||"").trim();
          var tsub = String(tRows[ti][subIdx]||"").trim();
          if (tname && tsub) teacherSubjectMap[tname] = tsub;
        }
      }
    } catch(eIgn){}
    function inferSubject_(curSubj, examType, className, teacher) {
      var valid = ["영어","국어","수학","과학","사회"];
      if (curSubj && valid.indexOf(curSubj) >= 0) return curSubj;
      var src = String(examType||"") + " " + String(className||"");
      for (var vi = 0; vi < valid.length; vi++) {
        if (src.indexOf(valid[vi]) >= 0) return valid[vi];
      }
      if (teacher && teacherSubjectMap[teacher]) {
        var ts = teacherSubjectMap[teacher];
        // "수학과" → "수학"으로 정규화
        var mm = ts.match(/(영어|국어|수학|과학|사회)/);
        if (mm) return mm[1];
        return ts;
      }
      return curSubj || "";
    }
    // 1) 오늘 등록된 시험 수집 (정답목록) — examDate(r[12]) 기준으로 필터
    // ★ v23.8: 정답목록도 끝에서부터 최근 N행만 읽기 (시트가 커져도 일정 속도)
    //   기본 300행 (하루 30 시험 × 10일 정도 커버) — 오늘 시험은 보통 최근에 등록됨
    //   더 옛날 행을 보려면 ?range=full 파라미터 사용
    var aSheet = ss.getSheetByName("정답목록");
    var exams = [];
    var _aRowIndexOffset = 0;  // 시트 1-based 행 번호 보정용
    if (aSheet && aSheet.getLastRow() > 1) {
      var _fullRange = String(e.parameter.range||"") === "full";
      var _aLastRow = aSheet.getLastRow();
      var _aLastCol = Math.min(aSheet.getLastColumn(), 19);  // 컬럼 S(19)까지만 (폴더메타JSON 포함)
      var _aReadFrom = _fullRange ? 1 : Math.max(1, _aLastRow - 300);  // 헤더 1행 + 데이터 300행
      var _aReadCount = _aLastRow - _aReadFrom + 1;
      var aRows = aSheet.getRange(_aReadFrom, 1, _aReadCount, _aLastCol).getValues();
      _aRowIndexOffset = _aReadFrom - 1;  // aRows의 0-based 인덱스 i → 시트 1-based 행번호 (i + _aReadFrom)
      for (var i = (_aReadFrom === 1 ? 1 : 0); i < aRows.length; i++) {
        var r = aRows[i];
        // ★ 등록일시(r[0])가 아니라 시험날짜(r[12])로 판단
        //   (r[12]가 비어있으면 하위호환으로 r[0] 사용)
        var examDateCell = r[12] ? r[12] : r[0];
        if (!isTodayCell(examDateCell)) continue;
        // ★ v25.7 (2026-05-13): 추천보강(미니 시험)은 오늘의 현황에서 제외 → "📚 보강 현황" 탭에만 표시
        //   원인: 학생별로 자동 생성되는 추천보강 시험이 카드로 노출되어 정신없음
        //   해결: examType === "추천보강" 행 skip
        var _examTypeForFilter = String(r[4] || "").trim();
        if (_examTypeForFilter === "추천보강") continue;
        var teacher = r[9] || "";
        if (filterTeacher && teacher && teacher !== filterTeacher) continue;
        // ★ v23.7: 폴더 정보 — 시트 컬럼(인덱스 18: 폴더메타JSON)에 영구 저장된 데이터 우선 사용
        //   Drive API 호출은 캐시도 시트도 비어있을 때만 (최초 1회) → 이후 영구 캐시
        var examTimeStr = "";
        var hasExamFile = false;
        var hasAnswerFile = false;
        var folderLink = "";
        var fileList = [];
        try {
          var fid = String(r[13] || "");
          // ★ v24.9: r[13]이 비어있으면 업로드기록 시트에서 자동 매칭
          //   원인: 시험 등록(upload_exam)은 정답목록에 직접 행을 안 만들고,
          //         AI 검수 자동등록 또는 save_answer_key(직접 입력)에서 추가됨.
          //         이 경로에서 r[13] 폴더ID가 누락된 행이 생김.
          //   해결: 업로드기록 시트에서 같은 (시험날짜+선생님+반+시험종류) 매칭 → folderUrl → 폴더ID 추출
          //         + 시트 r[13]에 영구 저장 (다음부터 자동)
          if (!fid) {
            try {
              var _uMatch = findFolderIdFromUploadRecord_(r, ss);
              if (_uMatch) {
                fid = _uMatch;
                // 시트 r[13]에 영구 저장 (다음 호출부터 자동 매칭 불필요)
                try { aSheet.getRange(i + 1 + _aRowIndexOffset, 14).setValue(fid); } catch(_eSet){}
              }
            } catch(_eU){}
          }
          if (fid) {
            // 1단계: 시트 컬럼(folderMetaJson) 영구 캐시 확인
            var _folderMetaRaw = String(r[18] || "");
            var _folderMeta = null;
            if (_folderMetaRaw) {
              try { _folderMeta = JSON.parse(_folderMetaRaw); } catch(_eM) { _folderMeta = null; }
            }
            // ★ v24.5: force_scan=1 이면 r[18] 영구 캐시도 무시 (사용자가 🔄 새로고침 클릭 시)
            if (_forceScan) {
              _folderMeta = null;
              // CacheService 단기 캐시도 삭제 (아래 단계에서 다시 가져오지 않게)
              try { CacheService.getScriptCache().remove("fld_" + fid); } catch(_eCC) {}
            }
            // ★ v24.4: hasFile=true인데 files가 비어있는 케이스 = 옛 캐시 → 재스캔 강제
            var _metaValid = _folderMeta && Array.isArray(_folderMeta.files) &&
                             !((_folderMeta.hasExamFile || _folderMeta.hasAnswerFile) && _folderMeta.files.length === 0);
            if (_metaValid) {
              examTimeStr = _folderMeta.examTime || "";
              folderLink = _folderMeta.folderLink || ("https://drive.google.com/drive/folders/" + fid);
              hasExamFile = !!_folderMeta.hasExamFile;
              hasAnswerFile = !!_folderMeta.hasAnswerFile;
              fileList = _folderMeta.files || [];
            } else {
              // 2단계: CacheService 단기 캐시 확인
              var _fCache = CacheService.getScriptCache();
              var _fKey = "fld_" + fid;
              var _fCached = _fCache.get(_fKey);
              if (_fCached) {
                try {
                  var _parsed = JSON.parse(_fCached);
                  // ★ v24.4: 단기 캐시도 동일한 검증 — hasFile=true인데 files=[] 면 무효
                  if (Array.isArray(_parsed.files) &&
                      !((_parsed.hasExamFile || _parsed.hasAnswerFile) && _parsed.files.length === 0)) {
                    examTimeStr = _parsed.examTime || "";
                    folderLink = _parsed.folderLink || "";
                    hasExamFile = !!_parsed.hasExamFile;
                    hasAnswerFile = !!_parsed.hasAnswerFile;
                    fileList = _parsed.files || [];
                  } else {
                    _fCached = null; // 옛 형식 → 재호출 트리거
                  }
                } catch(_eParse) { _fCached = null; }
              }
              if (!_fCached) {
                // 3단계: 최후 — Drive API 호출 (최초 1회만)
                var f = DriveApp.getFolderById(fid);
                var fn = f.getName();
                var tm = fn.match(/^(\d{1,2})시(\d{2})분/);
                if (tm) examTimeStr = ("0"+tm[1]).slice(-2) + ":" + tm[2];
                folderLink = "https://drive.google.com/drive/folders/" + fid;

                // ★ v25.1: 시험정보.txt 강제 파싱 — 키워드 매칭 전에 명시 분류 우선
                //   업로드 시 명시한 [정답지]/[시험지] 목록을 사용해 정확하게 분류
                //   "학습지 _ 매쓰홀릭(2).PDF" / "학습지 _ 매쓰홀릭(3).PDF" 같이 키워드 없는 파일명 대응
                var examInfoMap = {};  // {파일명: "answer"|"exam"}
                try {
                  var infoFiles = f.getFilesByName("시험정보.txt");
                  if (infoFiles.hasNext()) {
                    var infoTxt = infoFiles.next().getBlob().getDataAsString("UTF-8");
                    // [업로드 파일] 섹션 파싱
                    var ansSection = infoTxt.match(/●\s*정답지[\s\S]*?(?=●|\[|$)/);
                    var examSection = infoTxt.match(/●\s*시험지[\s\S]*?(?=●|\[|$)/);
                    if (ansSection) {
                      ansSection[0].split("\n").forEach(function(line){
                        var m = line.match(/^\s*-\s*(.+?)\s*$/);
                        if (m) examInfoMap[m[1].trim().toLowerCase()] = "answer";
                      });
                    }
                    if (examSection) {
                      examSection[0].split("\n").forEach(function(line){
                        var m = line.match(/^\s*-\s*(.+?)\s*$/);
                        if (m) examInfoMap[m[1].trim().toLowerCase()] = "exam";
                      });
                    }
                  }
                } catch(_eInfo) {/* 시험정보.txt 없거나 파싱 실패 — 키워드로 fallback */}

                var ff = f.getFiles();
                while (ff.hasNext()) {
                  var file = ff.next();
                  var fname = file.getName();
                  var lname = fname.toLowerCase();
                  if (lname.indexOf("정답.json") !== -1) continue;
                  if (lname.indexOf("정답_처리완료") !== -1) continue;
                  if (fname === "시험정보.txt") continue;
                  var ext = lname.match(/\.(pdf|docx|doc|hwp|hwpx|jpg|jpeg|png|zip|xlsx)$/);
                  if (!ext) continue;
                  // ★ v25.1: 시험정보.txt 명시값 우선 → 없으면 파일명 키워드 매칭
                  var explicitKind = examInfoMap[lname] || examInfoMap[fname.toLowerCase()];
                  var isAnswer;
                  if (explicitKind) {
                    isAnswer = (explicitKind === "answer");
                  } else {
                    isAnswer = /(정답|답지|답안|해설|풀이)/.test(fname) || /(answer|solution)/i.test(lname);
                  }
                  if (isAnswer) hasAnswerFile = true; else hasExamFile = true;
                  fileList.push({
                    id: file.getId(),
                    name: fname,
                    size: file.getSize(),
                    kind: isAnswer ? "answer" : "exam"
                  });
                }
                var _metaToSave = {
                  examTime: examTimeStr, folderLink: folderLink,
                  hasExamFile: hasExamFile, hasAnswerFile: hasAnswerFile,
                  files: fileList,
                  scannedAt: Date.now()
                };
                var _metaJson = JSON.stringify(_metaToSave);
                // 단기 캐시 (5분)
                try { _fCache.put(_fKey, _metaJson, 300); } catch(_ePut) {}
                // ★ v23.8: 시트 컬럼 S(19, index 18)에 영구 저장 → 다음 로드부터 Drive 호출 0회
                //   _aRowIndexOffset 보정 (부분 범위 읽기 대응)
                try {
                  if (aSheet.getLastColumn() < 19) {
                    aSheet.getRange(1, 19).setValue("폴더메타JSON");
                  }
                  aSheet.getRange(i + 1 + _aRowIndexOffset, 19).setValue(_metaJson);
                } catch(_eSht) {}
              }
            }
          }
        } catch(ignore){}
        // ★ subject 빈값 / 잘못된값 fallback (examType/className/teacher 순)
        var examTypeStr = r[4] || "";
        var subj = inferSubject_(r[1] || "", examTypeStr, r[11] || "", teacher);
        exams.push({
          // ★ v23.7: 시트 행 번호 — "시험 취소" 시 행을 정확히 삭제하기 위해 사용
          rowIndex: i + _aReadFrom,
          subject: subj,
          grade: r[2] || "",
          level: r[3] || "",
          examType: examTypeStr,
          round: r[5] || "",
          setType: r[5] || "",
          totalQuestions: Number(r[6]) || 0,
          teacher: teacher,
          studentCount: Number(r[10]) || 0,
          className: r[11] || "",
          examDate: r[12] ? String(r[12]) : "",
          examTime: examTimeStr,
          folderId: String(r[13] || ""),
          folderLink: folderLink,
          hasExamFile: hasExamFile,
          hasAnswerFile: hasAnswerFile,
          files: fileList,
          submitted: 0,
          submittedNames: [],
          source: "direct",
          // ★ v15: 시작번호 + 검수 메타데이터 — 선생님앱 이력 카드 뱃지에 사용
          startNumber: Number(r[14]) || 1,
          verification: (function(){ try { return r[15] ? JSON.parse(String(r[15])) : null; } catch(e){ return null; } })(),
          verificationStatus: String(r[16] || ""),
          questionNumberMap: (function(){ try { return r[17] ? JSON.parse(String(r[17])) : null; } catch(e){ return null; } })()
        });
      }
    }
    // 2) 오늘 업로드된 시험도 포함 (업로드기록) — 시험날짜(u[6]) 기준으로 필터
    //    + 정답목록 행에 없는 예상인원/teacher/파일명 정보 보강
    // ★ v23.8: 업로드기록도 끝에서부터 최근 300행만 읽기
    var uSheet = ss.getSheetByName("업로드기록");
    if (uSheet && uSheet.getLastRow() > 1) {
      var _uLastRow = uSheet.getLastRow();
      var _uLastCol = Math.min(uSheet.getLastColumn(), 16);  // 16개 컬럼 (헤더 기준)
      var _uReadFrom = (String(e.parameter.range||"") === "full") ? 1 : Math.max(1, _uLastRow - 300);
      var _uReadCount = _uLastRow - _uReadFrom + 1;
      var uRows = uSheet.getRange(_uReadFrom, 1, _uReadCount, _uLastCol).getValues();
      for (var j = (_uReadFrom === 1 ? 1 : 0); j < uRows.length; j++) {
        var u = uRows[j];
        // 업로드기록의 시험날짜는 u[6] (없으면 등록일시 u[0])
        var uExamDate = u[6] ? u[6] : u[0];
        if (!isTodayCell(uExamDate)) continue;
        var uTeacher = u[12] || "";
        if (filterTeacher && uTeacher && uTeacher !== filterTeacher) continue;
        // 정답목록에 이미 있는 시험이면 → studentCount/teacher/파일정보 보강만
        // ★ 완화된 매칭: 학년 + 시험종류(또는 레벨/선생님) 기준
        var matched = null;
        var uSubjInferred = inferSubject_(u[1]||"", u[5]||"", u[4]||"", uTeacher);
        // ★ v27.16 (2026-05-30): 매칭 로직 전면 교체 — "업로드했는데 오늘의 현황에 안 뜸" 픽스
        //   원인: 업로드기록의 과목/학년/레벨(u[1]/u[2]/u[3]) 칸이 비어있는 경우가 많음
        //         (대상반 u[4]에만 "영어 중3 남인천여중반"처럼 합쳐서 들어옴).
        //         기존 매칭은 grade(빈값)+examType 으로 묶여서, 같은 과목·같은 시간의
        //         서로 다른 반들이 한 카드로 과병합 → 일부 시험(예: 남인천여중)이 화면에서 사라짐.
        //   해결: ① 폴더ID 완전일치(같은 시험 확정)  ② 반이름(className) 완전일치
        //         ③ (학년이 실제로 있을 때만) 과목+학년+레벨+종류 일치
        //         → 반이름이 다르면 절대 병합하지 않음.
        var uFolderIdM = (String(u[10]||"").match(/folders\/([^\/\?&]+)/) || [])[1] || "";
        var uClassNorm = String(u[4]||"").replace(/\s+/g, "");
        // ① 폴더ID 일치 (가장 확실 — 같은 폴더 = 같은 시험)
        if (uFolderIdM) {
          for (var kf = 0; kf < exams.length; kf++) {
            if (exams[kf].folderId && String(exams[kf].folderId) === uFolderIdM) { matched = exams[kf]; break; }
          }
        }
        // ② 반이름(className) 일치 — 반이름이 가장 신뢰도 높은 구분자
        // ★ v27.17 (2026-05-30): under-merge(같은 시험이 정답목록 카드+업로드 카드로 중복 표시) 픽스.
        //   기존: examType 까지 '공백 정규화 없이' 정확일치 요구 → 한쪽 examType 가 비거나
        //         공백만 달라도 매칭 실패 → 같은 시험이 두 카드로 쪼개짐.
        //   해결: examType 둘 다 값이 있고 (공백 제거 후) 서로 다를 때만 '다른 시험'으로 보고 skip.
        // ★ v27.19 (2026-05-30): 반이름 후보가 하나뿐이면 병합, 여러 개면 시간/차수 같은 추가 신호가 있을 때만 병합
        //   이유: under-merge(카드 쪼개짐)와 over-merge(서로 다른 시험 섞임)를 둘 다 줄임.
        if (!matched && uClassNorm) {
          var _etU = String(u[5]||"").replace(/\s+/g,"");
          var _roundU = String(u[15]||"").replace(/\s+/g,"");
          var _timeU = String(u[7] ? fmtTime_(u[7]) : "").replace(/\s+/g,"");
          var _classCandidates = [];
          var _exactExamCandidates = [];
          for (var k = 0; k < exams.length; k++) {
            var EK = exams[k];
            if (String(EK.className||"").replace(/\s+/g,"") !== uClassNorm) continue;
            var _etE = String(EK.examType||"").replace(/\s+/g,"");
            if (_etE && _etU && _etE !== _etU) continue;  // 둘 다 명시 + 다름 → 다른 시험
            if (_etE && _etU && _etE === _etU) _exactExamCandidates.push(EK);
            _classCandidates.push(EK);
          }
          if (_exactExamCandidates.length === 1) {
            matched = _exactExamCandidates[0];
          } else if (_classCandidates.length === 1) {
            matched = _classCandidates[0];
          } else {
            var _signalCandidates = _exactExamCandidates.length > 1 ? _exactExamCandidates : _classCandidates;
            for (var kc = 0; kc < _signalCandidates.length; kc++) {
              var EC = _signalCandidates[kc];
              var _roundE = String(EC.round||"").replace(/\s+/g,"");
              var _timeE = String(EC.examTime||"").replace(/\s+/g,"");
              var _sameExtraSignal = (_roundE && _roundU && _roundE === _roundU) || (_timeE && _timeU && _timeE === _timeU);
              if (_sameExtraSignal) { matched = EC; break; }
            }
          }
        }
        // ③ 과목+학년+레벨+종류 일치 — 단, 학년(u[2])이 실제로 있을 때만 (빈 학년 과병합 차단)
        if (!matched && u[2]) {
          for (var k2 = 0; k2 < exams.length; k2++) {
            var EK2 = exams[k2];
            if (EK2.subject === uSubjInferred && EK2.grade === u[2] &&
                EK2.level === u[3] && EK2.examType === u[5]) { matched = EK2; break; }
          }
        }
        if (matched) {
          if (!matched.studentCount) matched.studentCount = Number(u[13]) || 0;
          if (!matched.teacher) matched.teacher = uTeacher;
          if (!matched.examTime && u[7]) matched.examTime = fmtTime_(u[7]);
          if (!matched.round && u[15]) matched.round = String(u[15]);
          // ★ v12.1: 업로드 메모 전달 (실장님/교사 대시보드 표시용)
          if (!matched.memo && u[8]) matched.memo = String(u[8]);
          var uFiles = String(u[9] || "");
          if (uFiles) {
            if (/(정답|답지|답안|해설|풀이|answer|solution)/i.test(uFiles)) matched.hasAnswerFile = true;
            if (uFiles.split(",").some(function(f){return f && !/(정답|답지|답안|해설|풀이|answer|solution)/i.test(f);})) matched.hasExamFile = true;
          }
          if (!matched.folderLink && u[10]) matched.folderLink = String(u[10]);
          continue;
        }
        // 새 시험 (아직 정답.json 처리 전)
        // 폴더 URL에서 ID 추출
        var uFolderLink = String(u[10] || "");
        var uFolderIdMatch = uFolderLink.match(/folders\/([^\/\?&]+)/);
        var uFolderId = uFolderIdMatch ? uFolderIdMatch[1] : "";
        // ★ v23.7: 업로드기록의 파일목록(u[9]) 컬럼만 사용 — Drive API 호출 0회
        //   파일 이름만으로 시험지/답지 구분 가능. 실제 다운로드는 click 시점에 list_folder_files 호출
        //   대시보드는 hasExamFile / hasAnswerFile 만 알면 됨
        var uFileList = [];  // 빈 배열 — 클릭 시 lazy load
        var uFilesStr = String(u[9] || "");
        var uHasExam = false, uHasAnswer = false;
        if (uFilesStr) {
          var _fnames = uFilesStr.split(",").map(function(s){return s.trim();}).filter(Boolean);
          for (var _fi = 0; _fi < _fnames.length; _fi++) {
            var _fn = _fnames[_fi];
            var _isAns = /(정답|답지|답안|해설|풀이)/.test(_fn) || /(answer|solution)/i.test(_fn);
            if (_isAns) uHasAnswer = true; else uHasExam = true;
          }
        }
        exams.push({
          subject: inferSubject_(u[1] || "", u[5] || "", u[4] || "", uTeacher),
          grade: u[2] || "",
          level: u[3] || "",
          examType: u[5] || "",
          round: u[15] || "",
          totalQuestions: 0,
          teacher: uTeacher,
          studentCount: Number(u[13]) || 0,
          className: u[4] || "",
          examDate: u[6] ? String(u[6]) : "",
          examTime: u[7] ? fmtTime_(u[7]) : "",
          memo: String(u[8] || ""),   // ★ v12.1: 업로드 메모 (실장님/교사 대시보드 표시용)
          folderId: uFolderId,
          folderLink: uFolderLink,
          hasExamFile: uHasExam || !!(u[9] && String(u[9]).split(",").some(function(f){return f && !/(정답|답지|답안|해설|풀이|answer|solution)/i.test(f);})),
          hasAnswerFile: uHasAnswer || !!(u[9] && /(정답|답지|답안|해설|풀이|answer|solution)/i.test(String(u[9]))),
          files: uFileList,
          uploadStatus: u[11] || "",
          submitted: 0,
          submittedNames: [],
          source: "upload"
        });
      }
    }
    // ★ 후처리 중복 제거 — subject+grade+level+examType+teacher+round+examTime+folderId 기준
    //   ★ v28 픽스 (2026-05-18): 키에 grade/level/examTime/folderId 추가
    //     원인: 옛 키 (subject+examType+teacher+round) 만 사용 시
    //           이강억 중1A 시험 == 이강억 중3A 시험 으로 인식 (학년 무관)
    //           → 다른 학년 시험의 파일이 한 행에 합쳐져 표시 (8개 첨부 사고)
    //     해결: 학년·레벨·시간·폴더ID 까지 키에 포함 → 정확히 같은 시험만 병합
    (function dedupeExams() {
      var keyOf = function(x){
        return (x.subject||"")+"|"+(x.grade||"")+"|"+(x.level||"")+"|"+(x.examType||"")+
               "|"+(x.teacher||"")+"|"+(x.round||"")+"|"+(x.examTime||"")+"|"+(x.folderId||"");
      };
      var byKey = {};
      var merged = [];
      for (var di = 0; di < exams.length; di++) {
        var ex = exams[di];
        var k = keyOf(ex);
        // 비어있는 키 (모든 필드 빈 경우) 만 병합 제외
        var _allEmpty = !ex.subject && !ex.grade && !ex.level && !ex.examType && !ex.teacher && !ex.folderId;
        if (_allEmpty) { merged.push(ex); continue; }
        if (byKey[k] === undefined) { byKey[k] = merged.length; merged.push(ex); continue; }
        // 이미 같은 키 (= 진짜 같은 시험) → 풍부한 쪽으로 병합
        var prev = merged[byKey[k]];
        if (!prev.examTime && ex.examTime) prev.examTime = ex.examTime;
        if (!prev.studentCount && ex.studentCount) prev.studentCount = ex.studentCount;
        if (!prev.className && ex.className) prev.className = ex.className;
        if (!prev.folderId && ex.folderId) prev.folderId = ex.folderId;
        if (!prev.folderLink && ex.folderLink) prev.folderLink = ex.folderLink;
        if (!prev.totalQuestions && ex.totalQuestions) prev.totalQuestions = ex.totalQuestions;
        if (!prev.memo && ex.memo) prev.memo = ex.memo;
        prev.hasExamFile = prev.hasExamFile || ex.hasExamFile;
        prev.hasAnswerFile = prev.hasAnswerFile || ex.hasAnswerFile;
        // 파일 목록 합치기 (id 중복 제거)
        var seen = {};
        (prev.files||[]).forEach(function(f){seen[f.id]=true;});
        (ex.files||[]).forEach(function(f){if(!seen[f.id]){prev.files=prev.files||[];prev.files.push(f);seen[f.id]=true;}});
      }
      exams.length = 0;
      for (var mi = 0; mi < merged.length; mi++) exams.push(merged[mi]);
    })();
    // 3) 오늘 학생 제출 집계 (학생답안기록)
    // ★ v23.7: 학생답안기록을 끝에서부터 역순 읽기 + 7일 이전이면 break
    //   기존: 전체 시트 읽고 each row를 isTodayCell 검사 → 5000행이면 5000회 검사
    //   개선: 최신 행부터 역순 검색, 일주일 전 행 만나면 즉시 break (대시보드용이라 최근만 필요)
    var sSheet = ss.getSheetByName("학생답안기록");
    if (sSheet && sSheet.getLastRow() > 1) {
      // 최근 500행만 읽기 (성능 안전장치) — 평균 1일 학생 100명 × 5시험 = 500개 정도
      var _lastRow = sSheet.getLastRow();
      var _readFrom = Math.max(2, _lastRow - 500);
      var _readCount = _lastRow - _readFrom + 1;
      var sRows = sSheet.getRange(_readFrom, 1, _readCount, Math.min(15, sSheet.getLastColumn())).getValues();
      // 7일 이전 행은 break (이미 옛날이라 오늘 데이터 없음)
      var _sevenDaysAgo = new Date(target);
      _sevenDaysAgo.setDate(_sevenDaysAgo.getDate() - 7);
      // 끝에서부터 역순
      for (var m2 = sRows.length - 1; m2 >= 0; m2--) {
        var sr = sRows[m2];
        // 너무 옛날 행이면 중단
        var _sd = sr[0];
        if (_sd instanceof Date) {
          if (_sd < _sevenDaysAgo) break;
        }
        if (!isTodayCell(sr[0])) continue;
        var sName = sr[1] || "";
        var sClassNorm = String(sr[3]||"").replace(/\s+/g,"");
        var sSubj = sr[4] || "";
        var sGrade = sr[5] || "";
        var sLevel = sr[6] || "";
        var sExam = sr[7] || "";
        for (var ex = 0; ex < exams.length; ex++) {
          var E = exams[ex];
          var eClassNorm = String(E.className||"").replace(/\s+/g,"");
          // ★ v27.19 (2026-05-30): 반 이름이 양쪽에 있으면 같은 반 제출만 집계
          if (eClassNorm && sClassNorm && eClassNorm !== sClassNorm) continue;
          if (E.subject === sSubj && E.grade === sGrade && E.level === sLevel &&
              (E.examType === sExam || !E.examType || !sExam)) {
            E.submitted++;
            if (sName && E.submittedNames.indexOf(sName) === -1) E.submittedNames.push(sName);
            break;
          }
        }
      }
    }
    var totalExams = exams.length;
    var totalExpected = 0;
    var totalSubmitted = 0;
    for (var p = 0; p < exams.length; p++) {
      totalExpected += Number(exams[p].studentCount) || 0;
      totalSubmitted += Number(exams[p].submitted) || 0;
    }
    // ★ v23.6: 응답을 90초 캐시 저장 (다음 호출 즉시 반환)
    var _dashResp = {
      result: "ok",
      date: todayDash,
      summary: {
        totalExams: totalExams,
        totalExpected: totalExpected,
        totalSubmitted: totalSubmitted
      },
      expectedTotal: totalExpected,
      submissionTotal: totalSubmitted,
      exams: exams
    };
    var _dashRespJson = JSON.stringify(_dashResp);
    try {
      // ★ v23.7: 100KB 미만일 때만 캐시 (GAS CacheService 한도). TTL 5분 (90초 → 300초)
      if (_dashRespJson.length < 95000) {
        _cacheSvc.put(_cacheKey, _dashRespJson, 300);
      }
    } catch(_cIgn) {}
    return ContentService.createTextOutput(_dashRespJson).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return jsonOut_({result:"error", message: String(err), exams: []});
  }
}
// ★ v23.6: 대시보드 캐시 무효화 — upload_exam · update_answer_key · save_subjective_grade 등에서 호출
//   날짜·선생님 조합별 캐시를 다 지우는 것은 비효율이므로 패턴 매칭 불가 → 전체 키 무효화는 다음 호출에서 자연스럽게 만료(90초)
//   필요 시 명시적 invalidate: clearDashboardCache()
function clearDashboardCache() {
  try {
    CacheService.getScriptCache().removeAll(["last_mirror_scan"]);
  } catch(_e) {}
}
// ─── v25.9 (2026-05-13): initStudentAnswerSheet 삭제 (1회용, student_answer 핸들러에 자동 생성 로직 있음) ───
// ─── v25.0 (2026-05-13): migrateExamDates 함수 완전 삭제 ───
// 1회 실행 완료. 백업은 _옛버전_백업/AppsScript_v24_12.txt 참조.
// ============================================================
// 관리자 기능: 선생님 목록 + 시험 스케줄 + Slack 리마인드
// ============================================================
// ★★★ Slack Incoming Webhook URL ★★★
// Slack 워크스페이스 → 앱 관리 → Incoming Webhooks → #시험지준비 채널용 URL 발급
// 발급 후 아래 값 교체 (https://hooks.slack.com/services/T.../B.../xxx)
var SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";
var TEACHERS_SHEET = "선생님목록_v2";  // ★ v13: 기존 시트 폐기하고 새 시트로 처음부터 재구축
var SCHEDULE_SHEET = "시험스케줄";
// ★ v24.13: 미니 보강 시험 Gemini 실시간 생성 API URL
//   Vercel Edge Function (api/generate-mini-exam.js) — Gemini 2.5 Flash 호출
//   응답 시간: 평균 5~15초 / 비용: 약 ₩3~5/시험
var MINI_EXAM_API_URL = "https://chaeum-teacher.vercel.app/api/generate-mini-exam";
// ★ v25.4 (2026-05-13): AI 영역 분석 API URL — 시험 문항을 문법/어휘/독해 등 영역으로 자동 분류
var ANALYZE_CATEGORIES_URL = "https://chaeum-teacher.vercel.app/api/analyze-exam-categories";
// ★ v25.4: 객관식 풀이 즉시 생성 API URL — choiceExplanations 없는 옛 시험에 즉석 풀이 제공
var GENERATE_EXPLANATIONS_URL = "https://chaeum-teacher.vercel.app/api/generate-explanations";
// ★ v25.9 (2026-05-13): 시험지 PDF에서 문항 본문 추출 API — Top 7 PDF 영어 본문 자동 채움 (옛 시험 대응)
var EXTRACT_QUESTION_URL = "https://chaeum-teacher.vercel.app/api/extract-question-from-pdf";
// ══════════════════════════════════════════════════════════════
// ★ v13: 선생님 관리 — 처음부터 다시 작성 (clean rewrite)
// ══════════════════════════════════════════════════════════════
// 설계 원칙:
//   1) 시트 = "선생님목록_v2" (기존 망가진 시트 폐기)
//   2) 스키마 = [카테고리, 이름] 단 2 컬럼 (단순화)
//   3) 매 호출마다 헤더 검증 + 이름 기반 자동 매핑
//   4) GET/POST 둘 다 지원, 명확한 에러 메시지
// ══════════════════════════════════════════════════════════════

// ★ v13: 알려진 선생님 → 카테고리 사전 (이름 기반 자동 분류 source of truth)
var TEACHER_KNOWN_MAP = {
  "김효식":"국어", "최유나":"국어",
  "김우림":"영어", "김건재":"영어", "정예영":"영어", "이새나":"영어", "김진용":"영어", "정성윤":"영어",
  "이강억":"수학", "김용문":"수학", "장문석":"수학", "최유리":"수학"
};
var TEACHER_VALID_CATS = ["관리자","국어","영어","수학","기타"];
// 시드 데이터 (시트 최초 생성 시 채울 기본 명단)
var TEACHER_SEED = [
  ["국어","김효식"], ["국어","최유나"],
  ["영어","김우림"], ["영어","김건재"], ["영어","정예영"], ["영어","이새나"], ["영어","김진용"], ["영어","정성윤"],
  ["수학","이강억"], ["수학","김용문"], ["수학","장문석"], ["수학","최유리"]
];

// 시트 가져오기 (없으면 자동 생성 + 시드 채움)
function getTeacherSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(TEACHERS_SHEET);
  if (!s) {
    s = ss.insertSheet(TEACHERS_SHEET);
    s.getRange(1,1,1,2).setValues([["카테고리","이름"]]);
    s.setFrozenRows(1);
    s.getRange(2,1,TEACHER_SEED.length,2).setValues(TEACHER_SEED);
    Logger.log("[teacher v13] 시트 신규 생성 + 시드 " + TEACHER_SEED.length + "명");
  } else {
    // 헤더 검증 — 잘못되어 있으면 강제 수정
    var hdr = s.getRange(1,1,1,2).getValues()[0];
    if (String(hdr[0]||"").trim() !== "카테고리" || String(hdr[1]||"").trim() !== "이름") {
      s.getRange(1,1,1,2).setValues([["카테고리","이름"]]);
      Logger.log("[teacher v13] 헤더 강제 보정");
    }
  }
  return s;
}
// 카테고리 자동 결정 (이름 우선 → 입력값 → fallback "기타")
function decideTeacherCategory_(name, inputCategory) {
  name = String(name||"").trim();
  inputCategory = String(inputCategory||"").trim();
  // 1순위: 알려진 이름 사전
  if (TEACHER_KNOWN_MAP[name]) return TEACHER_KNOWN_MAP[name];
  // 2순위: 입력값이 유효 카테고리면 그대로
  if (TEACHER_VALID_CATS.indexOf(inputCategory) >= 0) return inputCategory;
  // 3순위: 기타
  return "기타";
}

// ── 시트 초기화 (외부 호출 호환) ──
function initTeacherAndScheduleSheets() {
  getTeacherSheet_();  // 선생님 시트 자동 생성
  // 시험스케줄
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sc = ss.getSheetByName(SCHEDULE_SHEET);
  if (!sc) {
    sc = ss.insertSheet(SCHEDULE_SHEET);
    sc.appendRow(["요일","과목","학년","레벨","시험종류","선생님","시험시간","비고","활성"]);
    sc.setFrozenRows(1);
  }
}
function getSheetOrInit_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) { initTeacherAndScheduleSheets(); s = ss.getSheetByName(name); }
  return s;
}
// 호환용 stub (구 코드에서 호출되어도 안전하게 무시)
function ensureTeacherCategory_(s) { /* v13: 더 이상 필요 없음 */ }

// ── 목록 조회 ──
function listTeachers_(e) {
  try {
    var s = getTeacherSheet_();
    var lastRow = s.getLastRow();
    if (lastRow < 2) return jsonOut_({result:"ok", teachers:[], _v:"v13"});
    var rows = s.getRange(2,1,lastRow-1,2).getValues();
    var list = [];
    for (var i=0; i<rows.length; i++) {
      var rawCat = String(rows[i][0]||"").trim();
      var name = String(rows[i][1]||"").trim();
      if (!name) continue;
      // 매번 자동 보정 (이름 사전 우선)
      var cat = decideTeacherCategory_(name, rawCat);
      list.push({
        rowIndex: i+2,
        category: cat,
        name: name,
        // 호환용 더미 필드
        subject: cat === "관리자" || cat === "기타" ? "" : cat,
        slackId: "",
        memo: ""
      });
    }
    return jsonOut_({result:"ok", teachers:list, _v:"v13"});
  } catch(err) {
    return jsonOut_({result:"error", message:"listTeachers_ 예외: "+String(err), _v:"v13"});
  }
}

// ── 진단 (시트 raw 상태 그대로 반환) ──
function diagTeachers_(e) {
  try {
    var s = getTeacherSheet_();
    var lastRow = s.getLastRow();
    var lastCol = s.getLastColumn();
    var header = s.getRange(1,1,1,Math.max(2,lastCol)).getValues()[0];
    var rows = [];
    if (lastRow >= 2) {
      var raw = s.getRange(2,1,lastRow-1,Math.max(2,lastCol)).getValues();
      for (var i=0;i<raw.length;i++) {
        rows.push({
          sheetRow: i+2,
          col1_category: String(raw[i][0]||""),
          col2_name: String(raw[i][1]||"")
        });
      }
    }
    return jsonOut_({
      result:"ok", _v:"v13",
      sheetName: TEACHERS_SHEET,
      lastRow: lastRow, lastCol: lastCol,
      header: header.map(function(h){return String(h||"");}),
      rows: rows
    });
  } catch(err) {
    return jsonOut_({result:"error", message:"diagTeachers_ 예외: "+String(err)});
  }
}

// ── 강제 재분류 (이름 사전 기준으로 시트 카테고리 컬럼 덮어쓰기) ──
function reclassifyTeachers_(e) {
  try {
    var s = getTeacherSheet_();
    var lastRow = s.getLastRow();
    if (lastRow < 2) return jsonOut_({result:"ok", message:"데이터 없음", updated:0, _v:"v13"});
    var raw = s.getRange(2,1,lastRow-1,2).getValues();
    var updated = 0;
    var details = [];
    for (var i=0;i<raw.length;i++) {
      var was = String(raw[i][0]||"").trim();
      var name = String(raw[i][1]||"").trim();
      if (!name) continue;
      var now = decideTeacherCategory_(name, was);
      if (now !== was) {
        s.getRange(i+2, 1).setValue(now);
        updated++;
        details.push({row:i+2, name:name, was:was||"(빈값)", now:now});
      }
    }
    return jsonOut_({result:"ok", updated:updated, details:details, _v:"v13"});
  } catch(err) {
    return jsonOut_({result:"error", message:"reclassifyTeachers_ 예외: "+String(err)});
  }
}

// ── 시드 강제 재주입 (시트 비우고 기본 명단 다시 채움) ──
function reseedTeachers_(e) {
  try {
    var s = getTeacherSheet_();
    var lastRow = s.getLastRow();
    if (lastRow >= 2) s.getRange(2,1,lastRow-1,Math.max(2,s.getLastColumn())).clearContent();
    s.getRange(1,1,1,2).setValues([["카테고리","이름"]]);
    s.getRange(2,1,TEACHER_SEED.length,2).setValues(TEACHER_SEED);
    return jsonOut_({result:"ok", seeded:TEACHER_SEED.length, _v:"v13"});
  } catch(err) {
    return jsonOut_({result:"error", message:"reseedTeachers_ 예외: "+String(err)});
  }
}

// ── 저장 (POST) — 한글 인코딩 회피용 핵심 경로 ──
function saveTeacherPost_(data) {
  try {
    var name = String(data.name||"").trim();
    if (!name) return jsonOut_({result:"error", message:"이름 누락", _v:"v13"});
    var CAT_MAP = {admin:"관리자", korean:"국어", english:"영어", math:"수학", other:"기타"};
    var categoryKey = String(data.categoryKey||"").trim().toLowerCase();
    var rawCategory = String(data.category||"").trim();
    var inputCat = (categoryKey && CAT_MAP[categoryKey]) ? CAT_MAP[categoryKey] : rawCategory;
    var category = decideTeacherCategory_(name, inputCat);
    var s = getTeacherSheet_();
    var rowIndex = parseInt(data.rowIndex||"0", 10);
    if (rowIndex && rowIndex >= 2) {
      s.getRange(rowIndex, 1, 1, 2).setValues([[category, name]]);
    } else {
      s.appendRow([category, name]);
      rowIndex = s.getLastRow();
    }
    return jsonOut_({
      result:"ok", _v:"v13",
      category: category, name: name, rowIndex: rowIndex,
      receivedCategoryKey: categoryKey, receivedRawCategory: rawCategory
    });
  } catch(err) {
    return jsonOut_({result:"error", message:"saveTeacherPost_ 예외: "+String(err), _v:"v13"});
  }
}

// ── 저장 (GET) — 호환용 ──
function saveTeacher_(e) {
  return saveTeacherPost_({
    rowIndex: e.parameter.rowIndex,
    category: e.parameter.category,
    categoryKey: e.parameter.categoryKey,
    name: e.parameter.name
  });
}

// ── 삭제 (POST) ──
function deleteTeacherPost_(data) {
  try {
    var s = getTeacherSheet_();
    var rowIndex = parseInt(data.rowIndex||"0", 10);
    if (rowIndex >= 2) s.deleteRow(rowIndex);
    return jsonOut_({result:"ok", _v:"v13"});
  } catch(err) {
    return jsonOut_({result:"error", message:"deleteTeacherPost_ 예외: "+String(err), _v:"v13"});
  }
}

// ── 삭제 (GET) — 호환용 ──
function deleteTeacher_(e) {
  return deleteTeacherPost_({rowIndex: e.parameter.rowIndex});
}
// ── 시험 스케줄 CRUD ──
function listSchedule_(e) {
  var s = getSheetOrInit_(SCHEDULE_SHEET);
  if (s.getLastRow() <= 1) return jsonOut_({result:"ok", schedule: []});
  var rows = s.getRange(2,1,s.getLastRow()-1,9).getValues();
  var dayFilter = String(e.parameter.day||"").trim();
  var list = [];
  for (var i=0; i<rows.length; i++) {
    var r = rows[i];
    if (!String(r[0]||"").trim()) continue;
    if (dayFilter && String(r[0]).trim() !== dayFilter) continue;
    list.push({
      rowIndex: i+2, day: r[0], subject: r[1], grade: r[2], level: r[3],
      examType: r[4], teacher: r[5], time: r[6], memo: r[7]||"",
      active: (String(r[8]).toUpperCase() !== "FALSE" && r[8] !== false)
    });
  }
  return jsonOut_({result:"ok", schedule: list});
}
function saveSchedule_(e) {
  var s = getSheetOrInit_(SCHEDULE_SHEET);
  var p = e.parameter;
  var row = [
    String(p.day||"").trim(),
    String(p.subject||"").trim(),
    String(p.grade||"").trim(),
    String(p.level||"").trim(),
    String(p.examType||"").trim(),
    String(p.teacher||"").trim(),
    String(p.time||"").trim(),
    String(p.memo||"").trim(),
    (p.active === "false" || p.active === false) ? "FALSE" : "TRUE"
  ];
  if (!row[0] || !row[1] || !row[2] || !row[5]) {
    return jsonOut_({result:"error", message:"요일/과목/학년/선생님 필수"});
  }
  var rowIndex = parseInt(p.rowIndex||"0", 10);
  if (rowIndex && rowIndex >= 2) {
    s.getRange(rowIndex,1,1,9).setValues([row]);
  } else {
    s.appendRow(row);
  }
  return jsonOut_({result:"ok"});
}
function deleteSchedule_(e) {
  var s = getSheetOrInit_(SCHEDULE_SHEET);
  var rowIndex = parseInt(e.parameter.rowIndex||"0", 10);
  if (rowIndex >= 2) s.deleteRow(rowIndex);
  return jsonOut_({result:"ok"});
}
// ── 스케줄 vs 실제 업로드 비교 ──
// status: ✅ 완료(파일+문항), 📤 파일없음, ⏳ 처리대기(파일만), ❌ 미등록
function scheduleStatus_(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dateStr = String(e.parameter.date||"").trim();
  var target = dateStr ? parseDate_(dateStr) : new Date();
  if (!target) return jsonOut_({result:"error", message:"날짜 파싱 실패"});
  var dayNames = ["일","월","화","수","목","금","토"];
  var dayOfWeek = dayNames[target.getDay()];
  // 스케줄 로드
  var sc = getSheetOrInit_(SCHEDULE_SHEET);
  var schedule = [];
  var hasAnySchedule = false; // 시트에 실제 스케줄 행이 존재하는지
  var hasDaySchedule = false; // 오늘 요일에 실제 스케줄이 있는지
  if (sc.getLastRow() > 1) {
    var srows = sc.getRange(2,1,sc.getLastRow()-1,9).getValues();
    for (var i=0; i<srows.length; i++) {
      var r = srows[i];
      if (!String(r[0]||"").trim()) continue;
      hasAnySchedule = true;
      if (String(r[0]).trim() !== dayOfWeek) continue;
      var active = (String(r[8]).toUpperCase() !== "FALSE" && r[8] !== false);
      if (!active) continue;
      hasDaySchedule = true;
      schedule.push({
        day: r[0], subject: r[1], grade: r[2], level: r[3],
        examType: r[4], teacher: r[5], time: r[6], memo: r[7]||"",
        status: "❌ 미등록", uploaded: false, processed: false
      });
    }
  }
  // 실제 정답목록(오늘) 로드
  var ans = ss.getSheetByName("정답목록");
  var todayYMD = Utilities.formatDate(target, "Asia/Seoul", "yyyy.MM.dd");
  if (ans && ans.getLastRow() > 1) {
    var arows = ans.getDataRange().getValues();
    for (var j=1; j<arows.length; j++) {
      var ar = arows[j];
      var rowDate = ar[12] || ar[0];
      var rowYMD = "";
      if (rowDate instanceof Date) rowYMD = Utilities.formatDate(rowDate,"Asia/Seoul","yyyy.MM.dd");
      else { var m = String(rowDate||"").match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/); if(m) rowYMD = m[1]+"."+("0"+m[2]).slice(-2)+"."+("0"+m[3]).slice(-2); }
      if (rowYMD !== todayYMD) continue;
      // 매칭: subject, grade, examType
      var matched = false;
      for (var k=0; k<schedule.length; k++) {
        var sch = schedule[k];
        if (sch.subject === ar[1] && sch.grade === ar[2] && sch.examType === ar[4]) {
          sch.uploaded = true;
          sch.processed = !!(ar[7] && String(ar[7]).length > 2);
          sch.status = sch.processed ? "✅ 완료" : "⏳ 처리대기";
          matched = true;
          break;
        }
      }
      if (!matched) {
        schedule.push({
          day: dayOfWeek, subject: ar[1], grade: ar[2], level: ar[3]||"",
          examType: ar[4], teacher: "(스케줄 외)", time: "", memo: "",
          status: "➕ 스케줄 외", uploaded: true, processed: !!(ar[7] && String(ar[7]).length>2)
        });
      }
    }
  }
  // 파일은 있지만 문항 처리 아직인 경우는 이미 ⏳, 파일 자체가 없는 경우 📤
  for (var x=0; x<schedule.length; x++) {
    if (!schedule[x].uploaded && schedule[x].status === "❌ 미등록") {
      // 남김: 스케줄은 있는데 파일이 없으면 📤 파일없음
      schedule[x].status = "📤 파일없음";
    }
  }
  return jsonOut_({result:"ok", date: todayYMD, day: dayOfWeek, schedule: schedule, hasSchedules: hasAnySchedule, hasDaySchedule: hasDaySchedule});
}
function parseDate_(s) {
  var m = String(s).match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
}
// ── Slack 리마인드 (매일 20:00 실행) ──
// ★ v28 (2026-05-18): 전체 비활성화 — 사용자 요청 (슬랙 워크스페이스 정지 이슈)
function sendSlackReminder() {
  Logger.log("[sendSlackReminder] v28 비활성화 — 호출 무시");
  return;
  /* 옛 코드 보존 (필요 시 주석 풀어 재활성화)
  if (!SLACK_WEBHOOK_URL) {
    Logger.log("SLACK_WEBHOOK_URL 미설정");
    return;
  }
  // 내일 요일 기준
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var dayNames = ["일","월","화","수","목","금","토"];
  var day = dayNames[tomorrow.getDay()];
  var dateStr = Utilities.formatDate(tomorrow, "Asia/Seoul", "M월 d일(" + day + ")");
  var sc = getSheetOrInit_(SCHEDULE_SHEET);
  if (sc.getLastRow() <= 1) return;
  var rows = sc.getRange(2,1,sc.getLastRow()-1,9).getValues();
  var list = [];
  for (var i=0; i<rows.length; i++) {
    var r = rows[i];
    if (String(r[0]||"").trim() !== day) continue;
    var active = (String(r[8]).toUpperCase() !== "FALSE" && r[8] !== false);
    if (!active) continue;
    list.push(r);
  }
  if (list.length === 0) return;
  var bySub = {};
  for (var j=0; j<list.length; j++) {
    var r = list[j];
    var key = r[1] + " / " + r[5];
    if (!bySub[key]) bySub[key] = [];
    bySub[key].push(r);
  }
  var lines = [];
  lines.push("*📣 내일(" + dateStr + ") 시험 준비 리마인드*");
  lines.push("");
  Object.keys(bySub).sort().forEach(function(k){
    lines.push("• *" + k + "*");
    bySub[k].forEach(function(r){
      lines.push("   - " + r[2] + " " + (r[3]||"") + " / " + r[4] + " / " + (r[6]||"시간미정") + (r[7]?" ("+r[7]+")":""));
    });
  });
  lines.push("");
  lines.push("_업로드: 시험 전날 밤 또는 당일 오전까지_");
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: "post", contentType: "application/json",
    payload: JSON.stringify({text: lines.join("\n")}), muteHttpExceptions: true
  });
  */
}
// ── Slack 리마인드 트리거 설치 (매일 20:00) ──
// ★ v28 (2026-05-18): 비활성화 — 호출되어도 트리거 설치 안 됨
function installSlackReminderTrigger() {
  Logger.log("[installSlackReminderTrigger] v28 비활성화 — 설치 안 함");
  // 기존 트리거도 자동 제거 (안전망)
  try { removeSlackReminderTrigger(); } catch(_e){}
  return;
}
function removeSlackReminderTrigger() {
  var trigs = ScriptApp.getProjectTriggers();
  for (var i=0; i<trigs.length; i++) {
    if (trigs[i].getHandlerFunction() === "sendSlackReminder") {
      ScriptApp.deleteTrigger(trigs[i]);
    }
  }
}
// ============================================================
// v7 자동화 확장 — 1.분석실패알림 2.지각채점 3.중복제출 4.문항수검증
//                6.일괄프린트 8.오답통계 9.정합성체크
// ============================================================
// ── 공용 Slack 발송 헬퍼 ──
function slackSend_(text) {
  // ★ v27.4 (2026-05-15): Slack 연동 전체 비활성 (무료 플랜 정지 이슈 회피)
  //   원인: 무료 Slack 워크스페이스 가 가끔 정지됨 → fetch 실패로 GAS 함수 느려짐
  //   해결: 함수 즉시 return — 코드 내 모든 slackSend_ 호출 자동 무력화
  //   향후: 다른 알림 채널 (이메일·Discord·Telegram) 검토
  return;
  /* 옛 코드 보존 (필요 시 주석 풀어 재활성화)
  if (!SLACK_WEBHOOK_URL) return;
  try {
    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
      method:"post", contentType:"application/json",
      payload: JSON.stringify({text: text}),
      muteHttpExceptions: true
    });
  } catch(er) { Logger.log("slackSend_ 실패: " + er); }
  */
}

// ============================================================
// [v21.0] AI 답지 자동 추출 — 3-API 만장일치 검증
// ------------------------------------------------------------
// 답지 PDF를 Gemini Flash + GPT-4o-mini + Claude Haiku 3개 API로
// 동시에 분석하여 정답을 추출. 3개가 만장일치면 자동 등록,
// 1개라도 다르면 검수 대기 + 슬랙 알림.
//
// ★ 설정 필수 — Apps Script Editor → 프로젝트 설정 → 스크립트 속성
//    GEMINI_API_KEY     : AIza...
//    OPENAI_API_KEY     : sk-proj-...
//    ANTHROPIC_API_KEY  : sk-ant-...
//    (옵션) AI_REVIEW_SLACK_CHANNEL : 검수 알림 채널명
// ============================================================
function _getApiKey_(name) {
  try {
    var props = PropertiesService.getScriptProperties();
    return props.getProperty(name) || "";
  } catch(e) {
    Logger.log("[_getApiKey_] " + name + " 조회 실패: " + e);
    return "";
  }
}

// 객관식 정답 저장값 정규화
// AI/교재 답지에서 "②", "2번", "정답: ②", "②와 ③"처럼 들어와도
// 학생앱 OMR 선택값(1~5)과 같은 토큰으로 저장한다.
function _normalizeObjectiveAnswerValue_(raw) {
  if (raw === null || raw === undefined) return "";
  var circleMap = {
    "①":"1","②":"2","③":"3","④":"4","⑤":"5",
    "➀":"1","➁":"2","➂":"3","➃":"4","➄":"5",
    "❶":"1","❷":"2","❸":"3","❹":"4","❺":"5"
  };
  var alphaMap = { a:"1", b:"2", c:"3", d:"4", e:"5" };
  if (Array.isArray(raw)) {
    var arr = raw.map(function(x){ return _normalizeObjectiveAnswerValue_(x); })
      .join(",")
      .split(",")
      .map(function(x){ return String(x||"").trim(); })
      .filter(function(x){ return /^[1-5]$/.test(x); });
    return _uniqueSortedChoiceTokens_(arr).join(",");
  }
  var original = String(raw).trim();
  if (!original) return "";

  var circled = original.match(/[①②③④⑤➀➁➂➃➄❶❷❸❹❺]/g);
  if (circled && circled.length > 0) {
    return _uniqueSortedChoiceTokens_(circled.map(function(c){ return circleMap[c] || ""; })).join(",");
  }

  // ★ v27.11: 보기 라벨이 "확실할 때만" A~E → 1~5 (주관식 단어/문장 오변환 방지)
  //   허용: "B" "b" "(B)" "[C]" "B." "B번" "정답:B" "답 A" "Answer: B"
  //   제외: "do" "he" "a dog" 같은 주관식 (단, "a"~"e" 단독 한 글자는 보기로 인정)
  var alphaExplicit =
    original.match(/^\s*(?:정답|답)\s*(?:은|는)?\s*[:：.]?\s*([A-Ea-e])\s*(?:입니다|임|이다)?\s*$/) ||
    original.match(/^\s*(?:answer|choice|option)\s*(?:is)?\s*[:：.]?\s*([A-Ea-e])\s*$/i);
  if (alphaExplicit && alphaMap[String(alphaExplicit[1]).toLowerCase()]) {
    return alphaMap[String(alphaExplicit[1]).toLowerCase()];
  }
  var alphaLabel = original
    .replace(/^\s*(?:정답|답|answer)\s*[:：.]?\s*/i, "")
    .replace(/^[(\[]\s*|\s*[)\].]+$/g, "")
    .replace(/\s*번$/, "")
    .trim();
  if (/^[A-Ea-e]$/.test(alphaLabel)) return alphaMap[alphaLabel.toLowerCase()];

  var v = original
    .replace(/[①➀❶]/g, "1").replace(/[②➁❷]/g, "2").replace(/[③➂❸]/g, "3")
    .replace(/[④➃❹]/g, "4").replace(/[⑤➄❺]/g, "5")
    .replace(/[０-９]/g, function(ch){ return String(ch.charCodeAt(0) - 0xFF10); });

  var tokens = [];
  var re = /(^|[^0-9])([1-5])(?=$|[^0-9])/g;
  var m;
  while ((m = re.exec(v)) !== null) tokens.push(m[2]);
  if (tokens.length > 0) return _uniqueSortedChoiceTokens_(tokens).join(",");

  return original;
}

function _uniqueSortedChoiceTokens_(tokens) {
  var seen = {};
  (tokens || []).forEach(function(t){
    t = String(t || "").trim();
    if (/^[1-5]$/.test(t)) seen[t] = true;
  });
  return Object.keys(seen).sort();
}

function _isObjectiveTypeToken_(typeVal) {
  var t = String(typeVal || "").toLowerCase().trim();
  return t === "obj" || t === "mc" || t === "multiple_choice" || t === "객관식";
}

function _normalizeObjectiveAnswersByType_(answers, types) {
  var out = {};
  answers = answers || {};
  types = types || {};
  Object.keys(answers).forEach(function(k){
    out[k] = _isObjectiveTypeToken_(types[k]) ? _normalizeObjectiveAnswerValue_(answers[k]) : answers[k];
  });
  return out;
}

// 답안 토큰 정규화 (비교 시 동그라미숫자/공백/콤마 차이를 무시)
function _normalizeAnswerToken_(s) {
  if (s === null || s === undefined) return "";
  var v = String(s).trim();
  if (!v) return "";
  var objV = _normalizeObjectiveAnswerValue_(v);
  if (/^[1-5](,[1-5])*$/.test(objV)) return objV;
  // 동그라미 숫자 → 일반 숫자
  var circleMap = { "①":"1","②":"2","③":"3","④":"4","⑤":"5","⑥":"6","⑦":"7","⑧":"8","⑨":"9","⑩":"10" };
  v = v.replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, function(c){ return circleMap[c] || c; });

  // 객관식 답안(1~5만 / "1,3" 같은 복수정답)인지 먼저 판별
  var quickV = v.replace(/^["'`(\[]+|["'`)\]]+$/g, "").trim().replace(/\.$/, "").trim();
  if (/^[1-9](\s*,\s*[1-9])*$/.test(quickV)) {
    return quickV.split(",").map(function(x){ return x.trim(); }).filter(Boolean).sort().join(",");
  }

  // 주관식(긴 텍스트) 정규화 — 모델별 형식 차이 흡수
  //  - 따옴표 통일: ‘ ’ ` ′ → '   "  " ″ → "
  v = v
    .replace(/[‘’‚′`]/g, "'")
    .replace(/[“”„″]/g, '"');
  //  - 항목 구분자 통일: "(1)" "(2)" → " / "
  v = v.replace(/\s*\(\s*\d+\s*\)\s*/g, " / ");
  //  - 다른 구분자도 " / " 로 통일: 슬래시, 세미콜론, 줄바꿈
  v = v.replace(/[;\n\r]+/g, " / ");
  //  - 공백 압축
  v = v.replace(/\s+/g, " ").trim();
  //  - 끝 마침표/공백 제거
  v = v.replace(/[.\s]+$/g, "").trim();
  //  - 시작/끝 구분자 제거
  v = v.replace(/^\/\s*|\s*\/$/g, "").trim();
  //  - 슬래시 양 옆 공백 표준화
  v = v.replace(/\s*\/\s*/g, " / ");
  //  - 영문 대소문자 무시 비교를 위해 소문자로
  v = v.toLowerCase();
  return v;
}

// 추출 프롬프트 빌드
// v21.2: 객관식/주관식 구분을 AI가 답지에서 자동으로 판별 (선생님 입력 불필요)
function _buildExtractPrompt_(examInfo) {
  var totalQ = parseInt(examInfo.totalQuestions || examInfo.totalQ || 0, 10);
  var subject = String(examInfo.subject || "").trim();
  var isMath = subject.indexOf("수학") >= 0;
  var isEnglish = subject.indexOf("영어") >= 0;
  // ★ v25.5 (2026-05-13): 과목별 type 판별 가이드 강화
  //   기존: "답이 1~5 숫자면 mc, 그 외 sa" 너무 단순 → 수학 시험 객관식 답 "3"을 sa로 잘못 분류
  //   수정: 과목별 패턴 명시 + 짧은 정수 답안 mc 우선
  var typeGuide = [];
  if (isMath) {
    typeGuide.push("## ★ 수학 시험 특별 가이드 (이번 시험: 수학)");
    typeGuide.push("- 한국 수학 시험은 **대부분 객관식 5지선다**입니다");
    typeGuide.push("- 답지에 '1', '2', '3', '4', '5' 단일 숫자만 적혀있으면 → **반드시 mc** (5지선다 ①~⑤ 표시)");
    typeGuide.push("- 답지에 정수(예: 16, -1, 0, 7) 또는 분수, 소수가 적혀있고 답지 어딘가에 '단답형' 또는 '주관식' 표시 있으면 → sa");
    typeGuide.push("- 답지에 정수가 적혀있지만 주관식 표시 없으면 → mc (객관식 5지선다 답이 정수 값일 수 있음)");
    typeGuide.push("- 답지에 한글/영어/수식 (예: 'x=3', '함수', '∞') 적혀있으면 → sa");
    typeGuide.push("- **확신 없을 때 mc 우선** — 수학은 객관식 비율이 압도적으로 높음");
  } else if (isEnglish) {
    typeGuide.push("## ★ 영어 시험 특별 가이드 (이번 시험: 영어)");
    typeGuide.push("- 답이 '1'~'5' 단일 숫자 → mc (5지선다)");
    typeGuide.push("- 답이 영어 단어/구절/문장 (예: 'happy', 'to go') → sa");
    typeGuide.push("- 답이 한글 해석 (예: '나는 학교에 간다') → sa");
  } else {
    typeGuide.push("- 답이 1~5 단일 숫자 → mc");
    typeGuide.push("- 답이 텍스트/단어 → sa");
    typeGuide.push("- 확신 없을 때 mc 우선");
  }
  return [
    "당신은 시험 답지(정답지) OCR 전문가입니다.",
    "이 PDF는 학생이 푸는 시험지가 아니라, 선생님이 보는 정답지입니다.",
    "PDF 안에 이미 정답이 표시되어 있습니다. 그것을 찾아 그대로 옮기면 됩니다.",
    "",
    "## 시험 정보",
    "- 과목: " + subject,
    "- 학년: " + (examInfo.grade || ""),
    "- 레벨/교재: " + (examInfo.level || ""),
    "- 시험명: " + (examInfo.examType || ""),
    "- 총 문항수: " + totalQ + "문제 (★ 반드시 이 개수를 빠짐없이 추출. 답지에서 발견 못 하면 \"?\" 로 채워서라도 정확히 " + totalQ + "개 만들어야 함)",
    (examInfo.subjRanges ? "- ★ 주관식 번호 지정 (사용자 입력): " + String(examInfo.subjRanges) + " → 이 번호는 반드시 type=\"sa\" 로 표기" : ""),
    (examInfo.subQuestionMap ? "- ★ 하위 주관식 지정 (사용자 입력): " + String(examInfo.subQuestionMap) + " → 예 '51:3' 은 51번에 (1)(2)(3) 3개 답을 \"|\" 로 구분해 한 답으로 묶기. answers[\"51\"]=\"a1|a2|a3\"" : ""),
    "",
    "## 절대 규칙",
    "1. 절대로 문제를 읽고 답을 추론하지 마세요. 오직 답지에 표기된 정답만 옮기세요.",
    "2. 정답이 보이지 않거나 모호하면 \"?\" 로 표시하세요. 추측 금지.",
    "3. 객관식 답이 ①②③④⑤ 형태라면 1,2,3,4,5 숫자로 변환하세요.",
    "4. 복수정답(예: ②와 ③ 둘 다 정답)은 \"2,3\" 형태로.",
    "5. 주관식 답은 답지에 적힌 그대로 (영어 문장이면 영어, 한글이면 한글).",
    "5.5. **하위 주관식**: 한 문항 안에 (1), (2), (3) 같이 여러 답이 있으면 \"a1|a2|a3\" 처럼 '|' 로 구분 (예: 51-(1) what, 51-(2) ever → answers[\"51\"]=\"what|ever\"). 학생앱이 자동으로 빈칸 N개로 분리해서 표시함.",
    "6. **시작 번호 식별**: 답지에서 첫 번째 문항의 번호가 1이 아닐 수도 있습니다 (예: 201, 18 등). PDF의 첫 번째 정답 번호를 그대로 startNumber 로 기록하세요.",
    "",
    "## ★ v25.5: 객관식·주관식 자동 판별 (매우 중요)",
    typeGuide.join("\n"),
    "",
    "## ★ v27.12 (2026-05-30): 채움학원 표준 답지 형식 — 이 패턴이 보이면 우선 적용",
    "다음 패턴이 답지에 보이면 패턴 그대로 파싱 (자유 추론 금지):",
    "",
    "**규칙 1) 객관식 패턴**:",
    "  형식: `<번호>) [정답] ①`  (혹은 ②③④⑤)",
    "  예: `51) [정답] ②`  →  answers[\"51\"]=\"2\", types[\"51\"]=\"mc\"",
    "",
    "**규칙 2) 주관식 패턴**:",
    "  형식: `<번호>) [정답] <원문자 아닌 텍스트>`",
    "  예: `52) [정답] since`  →  answers[\"52\"]=\"since\", types[\"52\"]=\"sa\"",
    "  예: `53) [정답] 환경 오염은...`  →  answers[\"53\"]=\"환경 오염은...\", types[\"53\"]=\"sa\"",
    "",
    "**규칙 3) 하위 주관식 패턴** (가장 중요):",
    "  형식: `<번호>) [정답] (1) <답1> (2) <답2> (3) <답3>...`",
    "  → 모든 `(숫자)` 패턴 카운트해서 답을 \"|\" 로 묶기",
    "  예: `51) [정답] (1) what (2) ever (3) some`",
    "    →  answers[\"51\"]=\"what|ever|some\", types[\"51\"]=\"sa\"",
    "  예: `75) [정답] (1) is (2) running`",
    "    →  answers[\"75\"]=\"is|running\", types[\"75\"]=\"sa\"",
    "  ★ 학생앱이 \"|\" 갯수만큼 자동으로 빈칸을 분리해서 표시함 — 반드시 \"|\" 사용",
    "",
    "위 채움 표준 패턴이 답지에 안 보이면 (외부 출판사 답지) 일반 파싱으로 폴백.",
    "",
    "## ★ v27.13 (2026-05-30): 해설형 답지 파싱 가이드 — 천재·동아·미래엔 등 외부 출판사",
    "",
    "답지에 해설/풀이/어휘/문법 부가 설명이 포함된 경우. 단순 패턴 매칭으로는 거짓 양성이 많이 나옴.",
    "다음 규칙을 엄격히 적용:",
    "",
    "**규칙 A) \"정답\" 마커 우선 — 정답 라인만 답으로 인정**",
    "  ✅ 답 (이 패턴이 보이면 그 뒤 첫 번째 값만 답):",
    "    \"정답: ②\" · \"정답 : 4\" · \"[정답] ①\" · \"답 ③\" · \"답: 2\" · \"Answer: 3\" · \"정답은 ⑤\" · \"정답②\"",
    "  ❌ 답 아님 (해설 내 거짓 양성 — 반드시 무시):",
    "    \"정답이 ② 이므로 ...\" · \"답이 ① 이라면 ...\" · \"정답이 아닌 ③\" · \"④번이 정답일 수 있으나\"",
    "    \"이 문장에서 ① 은 ...\" · \"선택지 ② 의 의미는 ...\" · \"오답 분석: ③ 은 ...\"",
    "",
    "**규칙 B) 한 문항 = 정답 1개**",
    "  한 문항 안에 ①②③④⑤ 가 해설로 여러 번 등장해도, \"정답:\" 마커 다음 첫 값만.",
    "  복수 정답이면 \"정답: ②, ④\" 처럼 명시된 경우만 \"2,4\" 로 기록.",
    "",
    "**규칙 C) 하위 주관식의 해설 거짓 양성 무시**",
    "  \"정답: (1) what (2) ever (3) some\" → answers[\"X\"]=\"what|ever|some\"",
    "  해설의 \"(1) 의문사 what 의 의미는 ...\", \"(2) ever 는 강조 ...\" 같은 (숫자) 패턴은 무시.",
    "  → \"정답\" / \"답\" 마커 다음에 나오는 (숫자) 패턴만 답.",
    "",
    "**규칙 D) 정답 마커 못 찾으면 \"?\" (추측 절대 금지)**",
    "  해설 내용으로 답 추론 금지. 정답 마커가 없거나 모호하면 그 문항은 \"?\" 표기.",
    "  사용자가 검수 화면에서 직접 입력함.",
    "",
    "**규칙 E) 정답 라인 후보 우선순위**",
    "  1순위: 굵은 글씨 / 박스 안 / 색 강조 된 \"정답\" 라인",
    "  2순위: 문항 번호 바로 다음 줄의 \"정답:\" 패턴",
    "  3순위: 문항 마지막 부분의 \"답:\" 패턴",
    "  → 한 문항에 여러 \"정답\" 마커가 보이면 1순위 우선",
    "",
    "## 응답 형식 — 반드시 이 JSON만 출력 (마크다운 코드블록 금지)",
    '{"startNumber": 1, "answers": {"1": "정답", ..., "' + totalQ + '": "정답"}, "types": {"1": "mc" 또는 "sa", ..., "' + totalQ + '": "mc 또는 sa"}, "notes": ""}',
    "",
    "**중요**:",
    "- answers 와 types 의 key 는 동일하게, 답지에 표기된 실제 문항 번호를 그대로 사용 (예: 시작번호가 201이면 \"201\", \"202\", ...)",
    "- 총 " + totalQ + "개 문항을 빠짐없이 포함 (answers, types 모두)",
    "- startNumber 가 확실치 않으면 1 로 기록"
  ].join("\n");
}

// Gemini 요청 빌드
function _buildGeminiRequest_(pdfBase64, examInfo) {
  var key = _getApiKey_("GEMINI_API_KEY");
  if (!key) return null;
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(key);
  var payload = {
    contents: [{
      parts: [
        { text: _buildExtractPrompt_(examInfo) },
        { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json"
    }
  };
  return {
    url: url,
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
}

// GPT 요청 빌드 (Chat Completions API + PDF 지원)
// gpt-4.1: 멀티모달 모델 (PDF/이미지 파싱 안정적), temperature/max_tokens 지원
function _buildGptRequest_(pdfBase64, examInfo) {
  var key = _getApiKey_("OPENAI_API_KEY");
  if (!key) return null;
  var payload = {
    model: "gpt-4.1",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: _buildExtractPrompt_(examInfo) },
        { type: "file", file: { filename: "answer.pdf", file_data: "data:application/pdf;base64," + pdfBase64 }}
      ]
    }],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 4000
  };
  return {
    url: "https://api.openai.com/v1/chat/completions",
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
}

// Claude 요청 빌드
// ★ v27.15 (2026-05-30): A안 응급 — prefill 제거 (Haiku 응답 잘림 사고 픽스)
//   v27.14 prefill 사고: Haiku 도 prefill 받으면 응답 잘림 → 답 빈 객체
//   복원: prefill 제거. temperature 0 + system 만 유지 (이건 안전).
//   주의: 이건 폴백 경로. 정상 흐름은 Vercel /api/ai-extract (Sonnet 4.5) 사용.
function _buildClaudeRequest_(pdfBase64, examInfo) {
  var key = _getApiKey_("ANTHROPIC_API_KEY");
  if (!key) return null;
  var payload = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    temperature: 0,
    system: "당신은 시험 답지(정답지) OCR 전문가입니다. PDF 안에 표시된 정답만 그대로 옮겨 JSON 으로 출력하세요. 답을 추측하거나 추론하지 마세요.",
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }},
        { type: "text", text: _buildExtractPrompt_(examInfo) }
      ]
    }]
  };
  return {
    url: "https://api.anthropic.com/v1/messages",
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
}

// 응답 파싱 (모델별 응답 형식 차이 흡수) — 에러 시 원문 일부 보존
function _parseAiResponse_(response, model) {
  var raw = "";
  try {
    if (!response) return { error: model + ": 응답 없음" };
    var code = response.getResponseCode();
    raw = response.getContentText();
    if (code !== 200) {
      // OpenAI/Anthropic은 에러 본문에 message 필드를 줌 → 추출해서 사람이 읽을 수 있게
      var apiMsg = "";
      try {
        var ej = JSON.parse(raw);
        apiMsg = (ej.error && (ej.error.message || ej.error.code)) || "";
      } catch(_pe) {}
      return {
        error: model + " HTTP " + code + (apiMsg ? " — " + apiMsg : ""),
        rawHttp: raw.substring(0, 800)
      };
    }
    var json = JSON.parse(raw);
    var answersText = "";
    if (model === "gemini") {
      var cand = (json.candidates || [])[0];
      if (cand && cand.content && cand.content.parts) {
        answersText = cand.content.parts.map(function(p){ return p.text || ""; }).join("");
      }
    } else if (model === "gpt") {
      var ch = (json.choices || [])[0];
      if (ch && ch.message) answersText = ch.message.content || "";
      // 추론 모델이 빈 응답을 줄 수도 있음 → finish_reason 같이 보존
      if (!answersText && ch) {
        return { error: model + " 빈 응답 (finish_reason=" + (ch.finish_reason||"?") + ")", rawHttp: raw.substring(0, 800) };
      }
    } else if (model === "claude") {
      var blocks = (json.content || []);
      answersText = blocks.filter(function(b){ return b.type === "text"; })
                          .map(function(b){ return b.text; }).join("");
      // ★ v27.15 (2026-05-30): prefill 제거됨 — 응답 그대로 파싱
    }
    answersText = String(answersText).trim();
    // 마크다운 코드블록 제거
    answersText = answersText.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
    var parsed = JSON.parse(answersText);
    var startNum = parseInt(parsed.startNumber, 10);
    if (!startNum || isNaN(startNum) || startNum < 1) startNum = 1;
    // answers 키를 1부터 정규화 + 원본 번호 보존
    var rawAns = parsed.answers || {};
    var rawTypes = parsed.types || {};
    var normAns = {};
    var normTypes = {};
    var origMap = {};
    var keys = Object.keys(rawAns);
    // 키가 모두 정수면 정렬해서 1번부터 재매핑
    var numKeys = keys.map(function(k){ return parseInt(k, 10); }).filter(function(n){ return !isNaN(n); });
    if (numKeys.length === keys.length && numKeys.length > 0) {
      numKeys.sort(function(a,b){ return a-b; });
      for (var i = 0; i < numKeys.length; i++) {
        var origK = String(numKeys[i]);
        var newK = String(i + 1);
        normAns[newK] = rawAns[origK];
        normTypes[newK] = _normalizeTypeToken_(rawTypes[origK], rawAns[origK]);
        origMap[newK] = numKeys[i];
      }
      // startNumber 가 1인데 실제 키가 1부터 시작 안 한다면 → 키 최솟값을 startNumber 로
      if (startNum === 1 && numKeys[0] !== 1) startNum = numKeys[0];
    } else {
      normAns = rawAns;
      Object.keys(rawAns).forEach(function(k){
        normTypes[k] = _normalizeTypeToken_(rawTypes[k], rawAns[k]);
      });
    }
    return {
      answers: normAns,
      types: normTypes,
      startNumber: startNum,
      origNumberMap: origMap,
      notes: parsed.notes || "",
      raw: answersText.substring(0, 2000)
    };
  } catch(e) {
    return { error: model + " 파싱: " + String(e), raw: raw.substring(0, 500) };
  }
}

// AI 가 보낸 type 값을 mc/sa 로 정규화. 누락 시 답안 형태로 추정.
// ★ v25.3 (2026-05-13): 객관식 인식 강화
//   - 원문자 ①~⑤ 인식 (영어·수학 시험에서 자주 등장)
//   - 한글 표기 인식 (1번, 2번 등)
//   - 짧은 한 글자/한 토큰 답안은 mc 우선
//   - 이게 안 되어 이강억 중3A 시험이 80% 주관식으로 잘못 분류된 버그 원인
function _normalizeTypeToken_(typeVal, answerVal) {
  var t = String(typeVal || "").toLowerCase().trim();
  if (t === "mc" || t === "obj" || t === "객관식" || t === "multiple_choice") return "mc";
  if (t === "sa" || t === "subj" || t === "주관식" || t === "subjective" || t === "essay") return "sa";
  var ans = String(answerVal == null ? "" : answerVal).trim();
  if (!ans || ans === "?") return "mc";

  // 1) 원문자/한글 정규화 — ①=1, ②=2 ...
  var normalized = ans
    .replace(/[①➀]/g, "1").replace(/[②➁]/g, "2").replace(/[③➂]/g, "3")
    .replace(/[④➃]/g, "4").replace(/[⑤➄]/g, "5")
    .replace(/(\d)\s*번/g, "$1")    // "1번" → "1"
    .replace(/\s+/g, "")              // 공백 제거
    .replace(/[\.\s]/g, "");

  // 2) 단일 객관식 (1~5)
  if (/^[1-5]$/.test(normalized)) return "mc";
  // 3) 복수 객관식 (1,2 / 1;3 / 1/4 / 1·2 / 1·2·3)
  if (/^[1-5]([,;\/、·][1-5])+$/.test(normalized)) return "mc";
  // 4) 매우 짧은 단답 (1글자) — 영문/한글 1글자도 가능하지만 일반적으로 객관식
  if (normalized.length === 1 && /[a-eA-Eㄱ-ㅎ가-하]/.test(normalized)) return "mc";

  return "sa";
}

// fetchAll 예외를 사용자 친화적 메시지로 변환
// - 일일 URL 호출 한도 초과: 명확한 안내 + 다음 리셋 시각
// - 그 외: 원문 오류 노출
function _formatFetchError_(err) {
  var s = String(err || "");
  var lower = s.toLowerCase();
  var quotaSignals = [
    "urlfetch", "url fetch",
    "service invoked too many times",
    "exceeded maximum execution",
    "too many",
    "한도", "초과", "하루", "일일", "너무 많이"
  ];
  var isQuota = false;
  for (var i = 0; i < quotaSignals.length; i++) {
    if (lower.indexOf(quotaSignals[i].toLowerCase()) >= 0) { isQuota = true; break; }
  }
  if (isQuota) {
    return "Apps Script 일일 URL 호출 한도 초과 — 미국 태평양시간 자정(한국 17시경)에 자동 리셋됩니다. 그동안은 '직접입력' 모드로 정답을 등록해주세요. (원문: " + s.substring(0, 120) + ")";
  }
  return "AI 호출 실패: " + s;
}

// API 병렬 호출 (UrlFetchApp.fetchAll) + 실패 모델 1회 재시도
// ★ v22.0: GPT 빌더 완전 제거 — GAS 폴백에서도 Gemini + Claude 만 호출
//    이유: GPT (gpt-4o, gpt-4.1, o3) 모두 PDF OCR 부정확 (65% 오답률)
function _aiExtractAll_(pdfBase64, examInfo) {
  var builders = {
    gemini: _buildGeminiRequest_,
    // gpt: _buildGptRequest_,  // ★ v22.0 비활성화 (PDF OCR 부정확으로 제외)
    claude: _buildClaudeRequest_
  };
  // 1차: 사용 가능한 모든 모델 동시 호출
  var requests = [];
  var models = [];
  // ★ v22.0: gpt 제거됨, gemini + claude 만 호출
  ["gemini","claude"].forEach(function(m){
    var req = builders[m](pdfBase64, examInfo);
    if (req) { requests.push(req); models.push(m); }
  });
  if (requests.length === 0) {
    return { error: "API 키가 모두 미설정 (Script Properties에 GEMINI_API_KEY/ANTHROPIC_API_KEY 필요)" };
  }
  Logger.log("[_aiExtractAll_ v22.0] 1차 병렬 호출: " + models.join(", "));
  var t0 = Date.now();
  var responses;
  try {
    responses = UrlFetchApp.fetchAll(requests);
  } catch(fetchErr) {
    return { error: _formatFetchError_(fetchErr) };
  }
  Logger.log("[_aiExtractAll_] 1차 응답시간: " + (Date.now()-t0) + "ms");
  // ★ v22.0: gpt 키는 항상 비활성화 에러로 채움 (_checkUnanimous_ 가 자동 인식)
  var results = {
    gemini: null,
    gpt:    { error: "GPT 비활성화 (PDF OCR 부정확으로 v22.0에서 제외)" },
    claude: null
  };
  for (var i = 0; i < responses.length; i++) {
    results[models[i]] = _parseAiResponse_(responses[i], models[i]);
    var st = results[models[i]];
    Logger.log("[_aiExtractAll_] 1차 " + models[i] + ": " +
      (st.error ? ("ERR " + st.error) : (Object.keys(st.answers||{}).length + " 문항")));
    if (st.error) {
      st.attempts = 1;
      st.firstError = st.error;
    } else {
      st.attempts = 1;
    }
  }
  // 2차 재시도: 실패한 모델만 다시 호출 (1회) — gpt 는 재시도 대상 아님
  var retryReqs = [];
  var retryModels = [];
  ["gemini","claude"].forEach(function(m){
    if (results[m] && results[m].error) {
      var req = builders[m](pdfBase64, examInfo);
      if (req) { retryReqs.push(req); retryModels.push(m); }
    }
  });
  if (retryReqs.length > 0) {
    Logger.log("[_aiExtractAll_] 2차 재시도: " + retryModels.join(", "));
    Utilities.sleep(800); // 짧은 백오프
    var t1 = Date.now();
    var retryResp;
    try {
      retryResp = UrlFetchApp.fetchAll(retryReqs);
    } catch(rfErr) {
      Logger.log("[_aiExtractAll_] 2차 fetchAll 실패: " + rfErr);
      var quotaMsg = _formatFetchError_(rfErr);
      // 일일 쿼터 초과면 재시도 응답을 가짜 에러 응답으로 채워서 결과에 반영
      retryResp = [];
      for (var k = 0; k < retryReqs.length; k++) {
        results[retryModels[k]] = {
          error: quotaMsg,
          attempts: 2,
          firstError: (results[retryModels[k]] && results[retryModels[k]].firstError) || ""
        };
      }
    }
    Logger.log("[_aiExtractAll_] 2차 응답시간: " + (Date.now()-t1) + "ms");
    for (var j = 0; j < retryResp.length; j++) {
      var mName = retryModels[j];
      var prevErr = results[mName] && results[mName].firstError;
      var newRes = _parseAiResponse_(retryResp[j], mName);
      newRes.attempts = 2;
      newRes.firstError = prevErr || "";
      Logger.log("[_aiExtractAll_] 2차 " + mName + ": " +
        (newRes.error ? ("ERR " + newRes.error) : (Object.keys(newRes.answers||{}).length + " 문항")));
      results[mName] = newRes;
    }
  }
  return results;
}

// 만장일치 검증
// ★ v21.4: GPT 의도적 비활성화 시 Gemini+Claude 만으로 자동 확정 (플랜 2 지원)
function _checkUnanimous_(results, totalQ, examInfo) {
  // ★ v25.5 (2026-05-13): examInfo 추가 — 수학 시험 객관식 강제 옵션
  examInfo = examInfo || {};
  var isMath = String(examInfo.subject || "").indexOf("수학") >= 0;
  // 수학 시험 + 답이 짧은 정수면 mc 강제 (AI 가 잘못 sa 로 판단한 경우 보정)
  var mathMcRegex = /^-?\d+$/;  // 정수만 (1, 3, -1, 16, 0)
  var allModels = ["gemini","gpt","claude"];
  // GPT 의도적 비활성화 감지
  // Vercel v22.x 는 Gemini+Claude 만 호출하고 GPT 는 비활성 표시만 내려준다.
  // 일부 배포에서는 gpt 필드가 아예 빠지거나 "no result" 로 올 수 있어 모두 같은 의미로 본다.
  var gptErr = results.gpt && results.gpt.error ? String(results.gpt.error) : "";
  var gptDisabled = !results.gpt ||
                    !!(results.gpt && results.gpt.disabled) ||
                    Number(results.gpt && results.gpt.attempts) === 0 ||
                    /비활성화|disabled|removed|코드 삭제|no result/i.test(gptErr);
  // 활성 모델 = 비활성화된 것 제외
  var activeModels = allModels.filter(function(m){
    return !(m === "gpt" && gptDisabled);
  });
  var avail = activeModels.filter(function(m){ return results[m] && !results[m].error; });
  var failedModels = activeModels.filter(function(m){ return !results[m] || results[m].error; });
  var minRequired = 2; // 최소 2개 활성 모델 필요
  var allActiveAvail = (avail.length === activeModels.length && avail.length >= minRequired);
  var finalAnswer = {};
  var finalTypes = {};
  var mismatches = [];
  totalQ = parseInt(totalQ, 10) || 0;
  for (var q = 1; q <= totalQ; q++) {
    var qStr = String(q);
    var rawG = ((results.gemini||{}).answers||{})[qStr];
    var rawP = ((results.gpt||{}).answers||{})[qStr];
    var rawC = ((results.claude||{}).answers||{})[qStr];
    // type 다수결: 활성 모델만 집계, 동률 시 sa 우선 (안전)
    var typeVotes = {};
    avail.forEach(function(m){
      var t = ((results[m]||{}).types||{})[qStr];
      if (!t) t = _normalizeTypeToken_(null, ((results[m]||{}).answers||{})[qStr]);
      typeVotes[t] = (typeVotes[t]||0) + 1;
    });
    var winnerType = "mc", maxVotes = -1;
    Object.keys(typeVotes).forEach(function(t){
      if (typeVotes[t] > maxVotes || (typeVotes[t] === maxVotes && t === "sa")) {
        maxVotes = typeVotes[t]; winnerType = t;
      }
    });
    // ★ v25.5: 수학 시험 안전망 — AI가 정수 답을 sa로 판단했어도 mc로 강제
    //   예: 장문석 중3I 시험에서 답 "1" "3" 을 주관식으로 분류한 버그 차단
    //   단, 답이 정수 외 다른 형태 (분수, 소수, 수식, 한글) 면 그대로 sa 유지
    //   rawG (gemini) 답안 사용 — 다수결과 같음
    if (isMath && winnerType === "sa") {
      var sampleAns = String(rawG || rawC || rawP || "").trim();
      if (sampleAns && mathMcRegex.test(sampleAns)) {
        winnerType = "mc";
      }
    }
    finalTypes[qStr] = winnerType;
    // 활성 모델들의 답 수집
    var activeAnsNorm = [];
    var activeAnsRaw = [];
    avail.forEach(function(m){
      var raw = ((results[m]||{}).answers||{})[qStr];
      activeAnsNorm.push(_normalizeAnswerToken_(raw));
      activeAnsRaw.push(raw);
    });
    // 모든 활성 모델이 같은 답을 냈는지 확인
    var allAgree = false;
    if (allActiveAvail && activeAnsNorm.length > 0 && activeAnsNorm[0] && activeAnsNorm[0] !== "?") {
      allAgree = activeAnsNorm.every(function(a){ return a === activeAnsNorm[0]; });
    }
    if (allAgree) {
      // 활성 모델 만장일치 → 자동 채움
      var finalRaw = String(activeAnsRaw[0] || "").trim();
      finalAnswer[qStr] = (winnerType === "mc") ? _normalizeObjectiveAnswerValue_(finalRaw) : finalRaw;
    } else {
      // 활성 모델 불일치 OR 일부 실패 → 검수 필요 항목으로 추가
      mismatches.push({
        q: q,
        gemini: String(rawG||""),
        gpt: String(rawP||""),
        claude: String(rawC||""),
        type: winnerType
      });
    }
  }
  // startNumber 다수결 (활성 모델만)
  var startCounts = {};
  avail.forEach(function(m){
    var sn = parseInt(results[m].startNumber, 10) || 1;
    startCounts[sn] = (startCounts[sn]||0) + 1;
  });
  var bestStart = 1, bestCount = 0;
  Object.keys(startCounts).forEach(function(k){
    if (startCounts[k] > bestCount) { bestCount = startCounts[k]; bestStart = parseInt(k,10); }
  });
  var reason = "";
  if (failedModels.length > 0) {
    reason = "모델 응답 실패: " + failedModels.join(", ") + " (검수 필요)";
  } else if (mismatches.length > 0) {
    reason = mismatches.length + "개 문항 불일치";
  }
  return {
    unanimous: allActiveAvail && mismatches.length === 0 && Object.keys(finalAnswer).length === totalQ,
    finalAnswer: finalAnswer,
    finalTypes: finalTypes,
    mismatches: mismatches,
    failedModels: failedModels,
    startNumber: bestStart,
    startNumberAgreement: bestCount + "/" + avail.length,
    reason: reason,
    modelStatus: { gemini: results.gemini, gpt: results.gpt, claude: results.claude },
    gptDisabled: gptDisabled,
    activeModelCount: activeModels.length,
    activeModels: activeModels
  };
}

// 정답목록 시트에 AI 컬럼 추가 (S~W: 19~23번 컬럼)
function _ensureAiColumns_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 23) {
    var hdr = sheet.getRange(1, 1, 1, Math.max(1, lastCol)).getValues()[0];
    var titles = ["AI원본_Gemini","AI원본_GPT","AI원본_Claude","불일치문항","AI추출시간"];
    var startCol = lastCol < 19 ? 19 : (lastCol + 1);
    var existingCount = lastCol >= 19 ? (lastCol - 18) : 0;
    var toAdd = titles.slice(existingCount);
    if (toAdd.length > 0) {
      sheet.getRange(1, startCol, 1, toAdd.length).setValues([toAdd]);
    }
  }
}

// 결과 시트 저장 (정답목록에 append)
// ★ v22.0: types 토큰을 "sub"/"obj" 로 저장 → 학생앱이 주관식을 정상 인식
//    이전 버그: AI가 "sa"로 저장 → 학생앱은 "sub"만 인식 → 객관식 5지선다로 잘못 표시
// ★ v23.6: data.folderId 가 비어있을 때 업로드기록에서 자동 lookup
//    이전 버그: 직접 업로드한 시험의 정답목록 row 폴더ID 가 빈 칸으로 저장됨
//    → "정답 보기" 클릭 시 view_answer_key 가 폴더ID 매칭 실패
function _saveExtractResult_(data, examInfo, check) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("정답목록");
  if (!sheet) sheet = ss.insertSheet("정답목록");
  ensureAnswerSheetHeader_(sheet);
  _ensureAiColumns_(sheet);
  var totalQ = parseInt(examInfo.totalQuestions, 10) || 0;
  // ★ v23.6: folderId 자동 lookup — 직접 업로드 흐름에서 data.folderId 가 비어있어도
  //   업로드기록에서 같은 시험 (subject+grade+level+examType+teacher+date) 의 폴더 URL을 찾아 folderId 추출
  var resolvedFolderId = String(data.folderId || "").trim();
  if (!resolvedFolderId) {
    try {
      var upSh = ss.getSheetByName("업로드기록");
      if (upSh && upSh.getLastRow() > 1) {
        var upRows = upSh.getDataRange().getValues();
        // 업로드기록 컬럼: 0:등록일시 1:과목 2:학년 3:레벨 4:대상반 5:시험종류 6:시험날짜 7:시험시간 8:메모 9:파일목록 10:폴더링크 11:상태 12:선생님 13:예상인원 14:주관식힌트 15:차수
        // 최신부터 역순 매칭 (최근 업로드 우선)
        var _normExN = function(s){
          var v = String(s||"").trim();
          var tagRe = /\s*\(\s*(?:[1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/;
          while (tagRe.test(v)) v = v.replace(tagRe, "").trim();
          return v;
        };
        var _normD = function(v){
          if (!v) return "";
          if (v instanceof Date) {
            return Utilities.formatDate(v, "Asia/Seoul", "yyyy-MM-dd");
          }
          var s = String(v).trim();
          var m = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
          if (!m) return s;
          return m[1] + "-" + ("0"+m[2]).slice(-2) + "-" + ("0"+m[3]).slice(-2);
        };
        var qSubj = String(examInfo.subject||"").trim();
        var qGr = String(examInfo.grade||"").trim();
        var qLv = String(examInfo.level||"").trim();
        var qEx = _normExN(examInfo.examType||"");
        var qTeacher = String(examInfo.teacher||"").trim();
        var qClassName = String(examInfo.className || data.className || "").replace(/\s+/g, "");
        var qDate = _normD(data.date || examInfo.date);
        var qSet = normalizeSetType_(examInfo.setType || data.setType || data.round || "");
        if (!qSet) {
          var qSetMatch = String(examInfo.examType || data.examType || "").match(/\(\s*([1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/);
          if (qSetMatch) qSet = normalizeSetType_(qSetMatch[1]);
        }
        for (var ui = upRows.length - 1; ui >= 1; ui--) {
          var ur = upRows[ui];
          if (String(ur[1]||"").trim() !== qSubj) continue;
          if (String(ur[2]||"").trim() !== qGr) continue;
          if (qLv && String(ur[3]||"").trim() !== qLv) continue;
          if (qClassName && String(ur[4]||"").replace(/\s+/g, "") !== qClassName) continue;
          if (qEx && _normExN(ur[5]) !== qEx) continue;
          if (qSet && String(ur[15]||"").trim() !== qSet) continue;
          if (qTeacher && String(ur[12]||"").trim() !== qTeacher) continue;
          if (qDate && _normD(ur[6]) !== qDate) continue;
          // 폴더 URL 에서 폴더 ID 추출
          var folderLink = String(ur[10]||"");
          var m2 = folderLink.match(/folders\/([^\/\?&]+)/);
          if (m2) { resolvedFolderId = m2[1]; break; }
        }
      }
    } catch(_lookErr) {
      Logger.log("[_saveExtractResult_] 업로드기록 folderId lookup 실패: " + _lookErr);
    }
  }
  if (data.requireFolderId === true && !resolvedFolderId) {
    throw new Error("업로드 폴더ID 연결 실패 — 파일 업로드가 실제로 저장되지 않았거나 GAS/선생님앱 최신 배포가 아닙니다. 정답목록 자동등록을 차단했습니다.");
  }
  // ★ v27.8 (2026-05-15): 폴더가 있어도 파일 0개면 등록 차단 (빈 폴더 좀비 4중복 사고 방지)
  //   원인: AUTO_OK 인데 폴더에 파일 없는 정답목록 행이 누적 (사용자 5/15 케이스 4번)
  //   해결: requireFolderId=true 면 폴더에 실제 다운로드 가능한 파일 1개 이상 있어야 행 생성 진행
  if (data.requireFolderId === true && resolvedFolderId) {
    try {
      var _checkFolder = DriveApp.getFolderById(resolvedFolderId);
      var _checkFiles = _checkFolder.getFiles();
      var _fileCount = 0;
      while (_checkFiles.hasNext()) {
        var _fn = _checkFiles.next().getName();
        if (_fn === "시험정보.txt" || _fn === "정답.json" || _fn === "desktop.ini") continue;
        if (!/\.(pdf|docx?|hwpx?|jpe?g|png|pptx?)$/i.test(_fn)) continue;
        _fileCount++;
        if (_fileCount >= 1) break;
      }
      if (_fileCount === 0) {
        throw new Error("폴더는 존재하나 시험지·정답지 파일 0개 — 업로드 실패로 판단. 정답목록 등록 차단. Drive 폴더에 PDF 직접 끌어 놓은 후 재시도 권장.");
      }
    } catch(_eF) {
      if (String(_eF.message||"").indexOf("폴더는 존재하나") >= 0) throw _eF;
      Logger.log("[_saveExtractResult_] 폴더 파일 검증 실패 (무시): " + _eF);
    }
  }
  // ★ v27.8 (2026-05-15): 중복 등록 차단 (같은 선생님+반+날짜+종류로 5분 내 추가 행 만들지 않음)
  //   원인: 사용자가 같은 시험을 재시도 → 정답목록에 행이 4개 누적
  //   해결: 가장 최근 5분 이내 같은 조합 행 있으면 그 행 업데이트 (새 행 X)
  try {
    var _ssDup = SpreadsheetApp.getActiveSpreadsheet();
    var _dupSh = _ssDup.getSheetByName("정답목록");
    if (_dupSh && _dupSh.getLastRow() > 1) {
      var _dupRows = _dupSh.getDataRange().getValues();
      var _now = Date.now();
      var _qTeacher = String(examInfo.teacher||"").trim();
      var _qClass = String(examInfo.className||data.className||"").trim();
      var _qDate = String(data.date||"").trim();
      var _qExamType = String(examInfo.examType||"").trim();
      var _qSetType = normalizeSetType_(examInfo.setType || data.setType || data.round || "");
      if (!_qSetType) {
        var _qSetMatch = String(examInfo.examType || data.examType || "").match(/\(\s*([1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/);
        if (_qSetMatch) _qSetType = normalizeSetType_(_qSetMatch[1]);
      }
      for (var _di = _dupRows.length - 1; _di >= Math.max(1, _dupRows.length - 50); _di--) {
        var _dr = _dupRows[_di];
        if (String(_dr[9]||"").trim() !== _qTeacher) continue;
        if (String(_dr[11]||"").trim() !== _qClass) continue;
        if (String(_dr[4]||"").trim() !== _qExamType) continue;
        if (_qSetType && String(_dr[5]||"").trim() !== _qSetType) continue;
        if (String(_dr[12]||"").trim().indexOf(_qDate.replace(/-/g,".")) < 0
            && String(_dr[12]||"").trim().indexOf(_qDate) < 0) continue;
        // 5분 이내?
        var _drTime = _dr[0] instanceof Date ? _dr[0].getTime() : new Date(_dr[0]).getTime();
        if (_now - _drTime < 5 * 60 * 1000) {
          Logger.log("[_saveExtractResult_] 중복 등록 감지 → 기존 행 " + (_di+1) + " 업데이트");
          // 폴더 ID 가 더 새로우면 갱신
          if (resolvedFolderId && String(_dr[13]||"").trim() !== resolvedFolderId) {
            _dupSh.getRange(_di+1, 14).setValue(resolvedFolderId);
            _dupSh.getRange(_di+1, 19).setValue("");  // 폴더메타 초기화
          }
          return {rowIndex: _di+1, reviewStatus: String(_dr[16]||""), updated: true};
        }
      }
    }
  } catch(_eDup) {
    Logger.log("[_saveExtractResult_] 중복 체크 실패 (무시): " + _eDup);
  }
  var setTypeVal = normalizeSetType_(data.setType || data.round || "");
  // 우선순위: data.types(직접입력) > check.finalTypes(AI 다수결) > subjMode(레거시)
  var typesObj = {};
  if (data.types && Object.keys(data.types).length > 0) {
    typesObj = normalizeAnswerData(data.types);
  } else if (check && check.finalTypes && Object.keys(check.finalTypes).length > 0) {
    // ★ v22.0: AI 다수결 결과를 학생앱 호환 토큰 "sub"/"obj" 로 변환 저장
    Object.keys(check.finalTypes).forEach(function(k){
      typesObj[k] = (check.finalTypes[k] === "sa") ? "sub" : "obj";
    });
    // 누락된 문항이 있으면 obj 로 기본값
    for (var tj=1; tj<=totalQ; tj++) {
      if (!typesObj[String(tj)]) typesObj[String(tj)] = "obj";
    }
  } else {
    // ★ v22.0: 레거시 — subjMode 기반 (학생앱 호환 토큰 "sub"/"obj" 사용)
    for (var ti=1; ti<=totalQ; ti++) {
      typesObj[String(ti)] = (data.subjMode === "all") ? "sub" : "obj";
    }
    if (data.subjMode === "mixed" && data.subjRanges) {
      // "5,8,12-15" 형태 파싱
      String(data.subjRanges).split(",").forEach(function(part){
        var t = part.trim();
        if (!t) return;
        if (t.indexOf("-") >= 0) {
          var rg = t.split("-");
          var s = parseInt(rg[0],10), e = parseInt(rg[1],10);
          for (var x=s; x<=e; x++) typesObj[String(x)] = "sub";
        } else {
          typesObj[t] = "sub";
        }
      });
    }
  }
  var reviewStatus = check.unanimous ? "AUTO_OK" : "PENDING";
  var ansToSave = check.unanimous ? check.finalAnswer : {};
  ansToSave = _normalizeObjectiveAnswersByType_(ansToSave, typesObj);
  // 시작번호: AI 다수결 우선, 없으면 사용자 입력, 둘 다 없으면 1
  var aiStartNum = parseInt(check.startNumber, 10);
  var userStartNum = parseInt(data.startNumber, 10);
  var finalStartNum = aiStartNum && aiStartNum > 1 ? aiStartNum : (userStartNum && userStartNum > 0 ? userStartNum : 1);
  // ★ v27.11 (2026-05-30): totalQuestions 검증 — AI 추출 수가 사용자 지정과 다르면 PENDING 강제
  //   실장님 4가지 오류 #1 (문제 개수 못 읽음) + #4 (정답 잘못) 의 케이스 C (매핑 어긋남) 즉시 발견용
  var _autoWarnings = [];
  var _userTotalQ = parseInt(data.totalQuestions, 10) || parseInt(examInfo.totalQuestions, 10) || 0;
  var _aiAnswerCount = Object.keys(check.finalAnswer || {}).length;
  if (_userTotalQ > 0 && _aiAnswerCount > 0 && _aiAnswerCount !== _userTotalQ) {
    reviewStatus = "PENDING";  // AUTO_OK 였어도 강제 검수
    _autoWarnings.push("⚠️ 문항수 불일치: AI 추출 " + _aiAnswerCount + "개 / 사용자 지정 " + _userTotalQ + "개 (" + Math.abs(_userTotalQ - _aiAnswerCount) + "개 차이) — 검수 필수");
  }
  // ★ v27.12 (2026-05-30): subQuestionMap 검증 — 사용자가 "51:3" 지정했는데 AI 답에 "|" 없으면 누락 의심
  //   실장님 #3 (하위 주관식 갯수 미반영) 의 자동 감지
  var _subQMapStr = String(data.subQuestionMap || examInfo.subQuestionMap || "");
  if (_subQMapStr) {
    _subQMapStr.split(",").forEach(function(pair){
      var t = pair.trim();
      var m = t.match(/^(\d+)\s*:\s*(\d+)$/);
      if (!m) return;
      var qNum = m[1];
      var expectedCount = parseInt(m[2], 10);
      var aiAns = String((check.finalAnswer || {})[qNum] || "");
      var actualPipeCount = aiAns ? aiAns.split("|").length : 0;
      if (expectedCount >= 2 && actualPipeCount < expectedCount) {
        reviewStatus = "PENDING";
        _autoWarnings.push("⚠️ " + qNum + "번 하위 주관식 " + expectedCount + "개 지정 / AI 추출 " + actualPipeCount + "개 (| 구분자 부족) — 검수 필수");
      }
    });
  }
  // ★ v27.14 (2026-05-30): 답 분포 자동 검증 (B안 추가 3) — AI 추출 결과 통계 분석
  //   1) 객관식 분포: 한 번호로 60% 이상 쏠리면 비정상 (AI 환각 의심)
  //   2) 빈 칸 비율: 30% 이상 "?" 이면 AI 가 답지 못 읽음
  //   3) AI 출처: Vercel(Sonnet) 사용했는지 GAS 폴백(Haiku) 사용했는지 기록
  var _mcAnswers = [];
  var _unknownCount = 0;
  var _totalAnsCount = 0;
  Object.keys(check.finalAnswer || {}).forEach(function(k){
    var v = String((check.finalAnswer || {})[k] || "").trim();
    _totalAnsCount++;
    if (!v || v === "?") { _unknownCount++; return; }
    if (/^[1-5]$/.test(v)) _mcAnswers.push(v);
  });
  if (_mcAnswers.length >= 10) {
    var _dist = {};
    _mcAnswers.forEach(function(v){ _dist[v] = (_dist[v]||0) + 1; });
    var _maxCount = 0;
    var _maxKey = "";
    Object.keys(_dist).forEach(function(k){ if (_dist[k] > _maxCount){_maxCount = _dist[k]; _maxKey = k;} });
    var _maxRatio = _maxCount / _mcAnswers.length;
    if (_maxRatio >= 0.6) {
      reviewStatus = "PENDING";
      _autoWarnings.push("⚠️ 객관식 분포 비정상: " + _maxKey + "번이 " + _maxCount + "/" + _mcAnswers.length + " (" + Math.round(_maxRatio*100) + "%) — AI 환각 의심, 답지 직접 확인 필요");
    }
  }
  if (_totalAnsCount >= 10 && _unknownCount / _totalAnsCount >= 0.3) {
    reviewStatus = "PENDING";
    _autoWarnings.push("⚠️ 빈 칸 비율 높음: " + _unknownCount + "/" + _totalAnsCount + " (" + Math.round(_unknownCount/_totalAnsCount*100) + "%) — AI 가 답지 못 읽음, 답지 PDF 확인 필요");
  }
  // AI 출처 기록 (Vercel 정상 동작인지 폴백인지 추적 → 사고 발생 시 진단 빠름)
  var _aiSource = data.aiResults ? "vercel" : "gas";
  if (_aiSource === "gas") {
    _autoWarnings.push("ℹ️ AI 출처: GAS 폴백 (Haiku) — Vercel API 실패 시 사용. 정상 흐름은 Vercel(Sonnet)");
  }
  var verData = {
    method: "ai_3way",
    timestamp: new Date().toISOString(),
    unanimous: check.unanimous,
    mismatches: check.mismatches,
    failedModels: check.failedModels || [],
    activeModels: check.activeModels || [],
    activeModelCount: check.activeModelCount || 0,
    gptDisabled: !!check.gptDisabled,
    startNumber: finalStartNum,
    startNumberAgreement: check.startNumberAgreement || "",
    // ★ v27.11: 사용자 지정 메타 + 자동 경고
    userTotalQuestions: _userTotalQ,
    aiAnswerCount: _aiAnswerCount,
    subQuestionMap: String(data.subQuestionMap || examInfo.subQuestionMap || ""),
    autoWarnings: _autoWarnings,
    // ★ v27.14 (2026-05-30): AI 출처 + 답 분포 통계 (B안 추가 3)
    aiSource: _aiSource,                   // "vercel" (Sonnet 정상) or "gas" (Haiku 폴백)
    answerDistribution: {
      mcCount: _mcAnswers.length,
      unknownCount: _unknownCount,
      totalAnsCount: _totalAnsCount,
      unknownRatio: _totalAnsCount > 0 ? Math.round(_unknownCount/_totalAnsCount*100) : 0
    },
    reason: check.reason || "",
    // ★ v22.7: 주관식 채점 모드 — loose=해석/번역(의역 인정), strict=단답형(엄격)
    gradingMode: (data.gradingMode && String(data.gradingMode).toLowerCase() === "loose") ? "loose" : "strict",
    modelResults: {
      gemini: check.modelStatus.gemini || {},
      gpt: check.modelStatus.gpt || {},
      claude: check.modelStatus.claude || {}
    }
  };
  sheet.appendRow([
    new Date().toLocaleString("ko-KR"),
    examInfo.subject,
    examInfo.grade,
    examInfo.level,
    examInfo.examType,
    setTypeVal,
    totalQ,
    JSON.stringify(ansToSave),
    JSON.stringify(typesObj),
    data.teacher || "",
    Number(data.studentCount) || 0,
    data.className || "",
    data.date || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd"),
    resolvedFolderId,  // ★ v23.6: lookup 된 folderId (없으면 빈 문자열) — "정답 보기" 폴더 매칭 가능
    finalStartNum,
    JSON.stringify(verData),
    reviewStatus,
    JSON.stringify(data.questionNumberMap || {}),
    JSON.stringify((check.modelStatus.gemini||{}).answers || {}),
    JSON.stringify((check.modelStatus.gpt||{}).answers || {}),
    JSON.stringify((check.modelStatus.claude||{}).answers || {}),
    JSON.stringify(check.mismatches.map(function(m){ return m.q; })),
    new Date().toISOString()
  ]);
  var _newRowIdx = sheet.getLastRow();
  // ★ v27.3: AIReviewCache 자동 저장 호출 제거 (검수 단순화)
  // ★ v25.7 (2026-05-13): 직접 업로드 "파일 없음" 버그 픽스 (서버측)
  //   정답목록 행 만들자마자 폴더메타JSON(S=19) 미리 채워넣음 → 대시보드가 즉시 파일 인식
  //   resolvedFolderId 가 있을 때만 (즉 직접 업로드 경로에서)
  if (resolvedFolderId) {
    try {
      var _folder = DriveApp.getFolderById(resolvedFolderId);
      // 폴더 내 시험정보.txt 가 있으면 명시 분류 우선
      var _examInfoMap = {};
      try {
        var _iFiles = _folder.getFilesByName("시험정보.txt");
        if (_iFiles.hasNext()) {
          var _txt = _iFiles.next().getBlob().getDataAsString("UTF-8");
          var _ansM = _txt.match(/●\s*정답지[\s\S]*?(?=●|\[|$)/);
          var _exaM = _txt.match(/●\s*시험지[\s\S]*?(?=●|\[|$)/);
          if (_ansM) _ansM[0].split("\n").forEach(function(l){var m=l.match(/^\s*-\s*(.+?)\s*$/);if(m)_examInfoMap[m[1].trim().toLowerCase()]="answer";});
          if (_exaM) _exaM[0].split("\n").forEach(function(l){var m=l.match(/^\s*-\s*(.+?)\s*$/);if(m)_examInfoMap[m[1].trim().toLowerCase()]="exam";});
        }
      } catch(_eI){}
      var _fileList = [];
      var _hasE = false, _hasA = false;
      var _ff = _folder.getFiles();
      while (_ff.hasNext()) {
        var _f = _ff.next();
        var _fname = _f.getName();
        var _lname = _fname.toLowerCase();
        if (_lname.indexOf("정답.json") !== -1) continue;
        if (_fname === "시험정보.txt") continue;
        if (!/\.(pdf|docx?|hwpx?|jpg|jpeg|png|zip|xlsx|pptx?)$/i.test(_lname)) continue;
        var _explicitKind = _examInfoMap[_lname] || _examInfoMap[_fname.toLowerCase()];
        var _isAns;
        if (_explicitKind) _isAns = (_explicitKind === "answer");
        else _isAns = /(정답|답지|답안|해설|풀이)/.test(_fname) || /(answer|solution)/i.test(_lname);
        if (_isAns) _hasA = true; else _hasE = true;
        _fileList.push({id: _f.getId(), name: _fname, size: _f.getSize(), kind: _isAns?"answer":"exam"});
      }
      var _meta = {
        examTime: "",
        folderLink: _folder.getUrl(),
        hasExamFile: _hasE,
        hasAnswerFile: _hasA,
        files: _fileList,
        scannedAt: Date.now()
      };
      // S열(19) 저장 + 단기 캐시
      sheet.getRange(_newRowIdx, 19).setValue(JSON.stringify(_meta));
      CacheService.getScriptCache().put("fld_" + resolvedFolderId, JSON.stringify(_meta), 600);
    } catch(_eMM) { Logger.log("[_saveExtractResult_ meta] " + _eMM); }
  }
  // ★ v27.3 (2026-05-14): 카테고리 자동 분석 호출 제거
  //   원인: extract 5~10초 지연 + Gemini API 비용 + 단원 명확한 시험은 분석 불필요
  //   대안: analyze_exam_categories 액션은 유지 — 학생앱이 view_answer_key 호출 시 캐시된 결과 반환
  //   필요하면 GAS 에디터에서 analyzeExamCategories_({folderId:"..."}) 수동 실행
  return {
    rowIndex: _newRowIdx,
    reviewStatus: reviewStatus
  };
}

// 슬랙 불일치 알림
function _slackNotifyMismatch_(examInfo, check, saveResult) {
  var msg = "🔍 *AI 답지 검수 — 불일치 발견*\n";
  msg += "📚 " + (examInfo.subject||"") + " " + (examInfo.grade||"") + " " + (examInfo.level||"") + " (" + (examInfo.examType||"") + ")\n";
  msg += "👨‍🏫 " + (examInfo.teacher || "(선생님 미상)") + "\n";
  msg += "❌ 불일치 문항: *" + check.mismatches.length + "개* / " + (examInfo.totalQuestions||"?") + "문제\n\n";
  var top5 = check.mismatches.slice(0, 5);
  for (var i=0; i<top5.length; i++) {
    var m = top5[i];
    msg += "• " + m.q + "번 — Gemini: `" + (m.gemini||"-") + "` / GPT: `" + (m.gpt||"-") + "` / Claude: `" + (m.claude||"-") + "`\n";
  }
  if (check.mismatches.length > 5) {
    msg += "... 외 " + (check.mismatches.length - 5) + "건\n";
  }
  msg += "\n📋 선생님 앱 → *검수 대기* 에서 확인 후 확정해주세요.";
  msg += "\n(정답목록 행 #" + saveResult.rowIndex + ")";
  slackSend_(msg);
}

// 슬랙 자동 등록 알림
function _slackNotifyAutoOk_(examInfo, saveResult) {
  var msg = "✅ *AI 답지 자동 등록* (활성 AI 만장일치)\n";
  msg += "📚 " + (examInfo.subject||"") + " " + (examInfo.grade||"") + " " + (examInfo.level||"") + " (" + (examInfo.examType||"") + ")\n";
  msg += "👨‍🏫 " + (examInfo.teacher || "(선생님 미상)") + "\n";
  msg += "📝 " + (examInfo.totalQuestions||"?") + "문제 — 정답목록 행 #" + saveResult.rowIndex;
  slackSend_(msg);
}

// 메인 진입점 — POST: action=ai_extract_answers
// v21.3: data.aiResults 가 있으면 (Vercel 에서 미리 추출한 경우) AI 호출 건너뛰고 검수/저장만 수행
function aiExtractAnswers_(data) {
  try {
    var examInfo = {
      subject: data.subject || "",
      grade: data.grade || "",
      level: data.level || "",
      examType: data.examType || "",
      teacher: data.teacher || "",
      totalQuestions: data.totalQuestions || data.totalQ || 0,
      subjMode: data.subjMode || "auto",
      subjRanges: data.subjRanges || ""
    };
    // ★ v21.5: totalQuestions 자동 판별 — 더이상 필수 아님 (AI 응답에서 추출)
    Logger.log("[ai_extract_answers] start " + JSON.stringify(examInfo));
    var t0 = Date.now();
    var results;
    var source = "gas";
    // ── Vercel 에서 추출한 결과가 있으면 그대로 사용 ──
    if (data.aiResults && typeof data.aiResults === "object") {
      results = {
        gemini: data.aiResults.gemini || { error: "no result" },
        gpt:    data.aiResults.gpt    || { error: "GPT 비활성화 (Vercel 응답에 GPT 없음 — Gemini+Claude 기준)", disabled: true, attempts: 0 },
        claude: data.aiResults.claude || { error: "no result" }
      };
      source = "vercel";
      Logger.log("[ai_extract_answers] Vercel results received");
    } else {
      // ── 폴백: GAS 에서 직접 AI 호출 ──
      var pdfBase64 = data.answerFileBase64 || data.base64 || "";
      if (!pdfBase64) return jsonOut_({result:"error", message:"답지 파일(answerFileBase64) 또는 aiResults 필요"});
      if (pdfBase64.indexOf(",") >= 0) pdfBase64 = pdfBase64.split(",").pop();
      results = _aiExtractAll_(pdfBase64, examInfo);
      if (results.error) {
        return jsonOut_({result:"error", message: results.error});
      }
    }
    var totalQ = parseInt(examInfo.totalQuestions, 10) || 0;
    // ★ v21.5: totalQuestions 비어있으면 AI 결과 중 가장 많은 답을 낸 모델 기준으로 자동 판별
    if (!totalQ) {
      var maxAns = 0;
      ["gemini","gpt","claude"].forEach(function(m){
        var a = (results[m]||{}).answers || {};
        var c = Object.keys(a).length;
        if (c > maxAns) maxAns = c;
      });
      totalQ = maxAns;
      examInfo.totalQuestions = totalQ;
      Logger.log("[ai_extract_answers] totalQuestions 자동 판별: " + totalQ);
    }
    if (!totalQ) {
      return jsonOut_({result:"error", message:"AI가 답을 추출하지 못했습니다. 답지 PDF를 확인해주세요."});
    }
    var check = _checkUnanimous_(results, totalQ, examInfo);
    var saveResult = _saveExtractResult_(data, examInfo, check);
    Logger.log("[ai_extract_answers] " + (check.unanimous?"AUTO_OK":"PENDING") + " src=" + source + " " + (Date.now()-t0) + "ms");
    try {
      if (check.unanimous) _slackNotifyAutoOk_(examInfo, saveResult);
      else _slackNotifyMismatch_(examInfo, check, saveResult);
    } catch(slIgn) { Logger.log("[ai_extract_answers] slack: " + slIgn); }
    return jsonOut_({
      result: "success",
      source: source,
      unanimous: check.unanimous,
      mismatchCount: check.mismatches.length,
      mismatches: check.mismatches,
      finalAnswer: check.finalAnswer,
      finalTypes: check.finalTypes || {},
      modelResults: {
        gemini: { ok: !results.gemini.error, error: results.gemini.error || "", answers: results.gemini.answers || {}, answerCount: Object.keys(results.gemini.answers||{}).length },
        gpt:    { ok: !results.gpt.error,    error: results.gpt.error || "",    answers: results.gpt.answers || {},    answerCount: Object.keys(results.gpt.answers||{}).length },
        claude: { ok: !results.claude.error, error: results.claude.error || "", answers: results.claude.answers || {}, answerCount: Object.keys(results.claude.answers||{}).length }
      },
      rowIndex: saveResult.rowIndex,
      reviewStatus: saveResult.reviewStatus,
      elapsedMs: Date.now()-t0
    });
  } catch(err) {
    Logger.log("[ai_extract_answers] FATAL: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// 검수 대기 목록 조회 (doGet: action=list_review_pending)
function listReviewPending_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh) return jsonOut_({result:"success", items:[]});
    var rows = sh.getDataRange().getValues();
    var items = [];
    for (var i=1; i<rows.length; i++) {
      var status = String(rows[i][16]||"");
      if (status !== "PENDING") continue;
      var verData = {};
      try { verData = JSON.parse(rows[i][15] || "{}"); } catch(_e) {}
      var typesObj = {};
      try { typesObj = JSON.parse(rows[i][8] || "{}"); } catch(_e) {}
      // ★ v27.12 (2026-05-30): 검수 모달 픽스용 메타 4종 응답 추가 (실장님 #2, #3 + autoWarnings)
      var qNumMapObj = {};
      try { qNumMapObj = JSON.parse(rows[i][17] || "{}"); } catch(_e) {}
      var subQMapStr = String(verData.subQuestionMap || "");
      var subQMapParsed = {};  // {"51": 3, "67": 2}
      if (subQMapStr) {
        subQMapStr.split(",").forEach(function(pair){
          var t = pair.trim();
          var m = t.match(/^(\d+)\s*:\s*(\d+)$/);
          if (m) subQMapParsed[m[1]] = parseInt(m[2], 10);
        });
      }
      items.push({
        rowIndex: i+1,
        registeredAt: rows[i][0],
        date: rows[i][12] || rows[i][0],
        subject: rows[i][1],
        grade: rows[i][2],
        level: rows[i][3],
        examType: rows[i][4],
        setType: rows[i][5],
        teacher: rows[i][9],
        className: rows[i][11],
        totalQ: rows[i][6],
        types: typesObj,
        folderId: rows[i][13],
        mismatchCount: (verData.mismatches || []).length,
        mismatches: verData.mismatches || [],
        modelResults: verData.modelResults || {},
        failedModels: verData.failedModels || [],
        reason: verData.reason || "",
        method: verData.method || "",
        // ★ v27.12 추가 필드 — 검수 모달 픽스
        startNumber: Number(rows[i][14]) || Number(verData.startNumber) || 1,
        questionNumberMap: qNumMapObj,
        subQuestionMap: subQMapParsed,
        subQuestionMapRaw: subQMapStr,
        autoWarnings: verData.autoWarnings || [],
        userTotalQuestions: verData.userTotalQuestions || 0,
        aiAnswerCount: verData.aiAnswerCount || 0,
        // ★ v27.14: AI 출처 + 답 분포 (B안 추가 1)
        aiSource: verData.aiSource || "unknown",
        answerDistribution: verData.answerDistribution || null
      });
    }
    items.sort(function(a,b){
      return String(b.registeredAt).localeCompare(String(a.registeredAt));
    });
    return jsonOut_({result:"success", items: items});
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// 검수 확정 (doPost: action=confirm_review)
function confirmReview_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh) return jsonOut_({result:"error", message:"정답목록 없음"});
    var rowIndex = parseInt(data.rowIndex || "0", 10);
    if (rowIndex < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    var finalAnswers = data.finalAnswers || {};
    var normAns = normalizeAnswerData(finalAnswers);
    if (Object.keys(normAns).length === 0) {
      return jsonOut_({result:"error", message:"finalAnswers 비어있음"});
    }
    var rowTypes = {};
    try { rowTypes = normalizeAnswerData(sh.getRange(rowIndex, 9).getValue() || "{}"); } catch(_eType) { rowTypes = {}; }
    normAns = _normalizeObjectiveAnswersByType_(normAns, rowTypes);
    sh.getRange(rowIndex, 8).setValue(JSON.stringify(normAns));
    sh.getRange(rowIndex, 17).setValue("MANUAL_CONFIRMED");
    // 검수 메타데이터에 확정 시각 추가
    try {
      var verRaw = sh.getRange(rowIndex, 16).getValue();
      var ver = verRaw ? JSON.parse(verRaw) : {};
      ver.confirmedAt = new Date().toISOString();
      ver.confirmedBy = data.confirmedBy || data.teacher || "";
      sh.getRange(rowIndex, 16).setValue(JSON.stringify(ver));
    } catch(_e) {}
    try {
      slackSend_("✅ *검수 확정* — 행 #" + rowIndex + " (확정자: " + (data.confirmedBy||data.teacher||"-") + ")");
    } catch(_s) {}
    return jsonOut_({result:"success", rowIndex: rowIndex});
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// 답지 PDF 미리보기 — 검수 화면용 (doGet: action=get_review_pdf)
// ★ v27.12 (2026-05-30): 답지/시험지 매칭 강화 (실장님 #1 — 답지 영역에 시험지 노출 사고 픽스)
//   원인: "정답" 키워드 못 찾으면 "첫 PDF" 로 폴백 → 시험지 PDF 가 답지 영역에 표시됨
//   해결: (1) 답지 키워드 우선, (2) 시험지 키워드 명시 제외, (3) 그래도 못 찾으면 "Ans" 패턴
function getReviewPdf_(e) {
  try {
    var folderId = String(e.parameter.folderId || "");
    if (!folderId) return jsonOut_({result:"error", message:"folderId 필요"});
    var folder = DriveApp.getFolderById(folderId);
    var allPdfs = [];
    var files = folder.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      var nm = f.getName();
      if (/\.pdf$/i.test(nm)) allPdfs.push({file:f, name:nm});
    }
    if (allPdfs.length === 0) return jsonOut_({result:"error", message:"PDF 파일이 폴더에 없음"});
    // (1) 답지 키워드 우선 매칭: answer/정답/답지/key/solution/해설 + Ans 확장자 패턴
    var found = null;
    for (var i=0; i<allPdfs.length; i++) {
      var nm = allPdfs[i].name;
      if (/(answer|정답|답지|key|solution|해설|\bAns\b|_Ans)/i.test(nm)) {
        found = allPdfs[i].file; break;
      }
    }
    // (2) 못 찾으면 — "시험지/문제/exam/test/Q" 키워드 제외하고 남은 첫 PDF
    if (!found) {
      for (var j=0; j<allPdfs.length; j++) {
        var nm2 = allPdfs[j].name;
        if (/(시험지|문제지|문제|exam|test|\bQ\b|_Q\.|^Q_)/i.test(nm2)) continue;
        found = allPdfs[j].file; break;
      }
    }
    // (3) 그래도 못 찾으면 — 시험지 키워드만 있는 PDF 가 1개고, 답지 키워드 PDF 가 없다면 에러
    //     (옛 동작인 "무조건 첫 PDF" 폴백은 사고 위험으로 제거)
    if (!found) {
      var examOnly = allPdfs.filter(function(p){ return /(시험지|문제지|문제|exam|test)/i.test(p.name); });
      if (examOnly.length === allPdfs.length) {
        return jsonOut_({result:"error", message:"답지 PDF 없음 (시험지만 " + allPdfs.length + "개). 파일명에 '정답' 또는 '답지' 키워드 포함해서 재업로드 권장."});
      }
      // 마지막 폴백 — 첫 PDF (옛 동작), 단 경고와 함께
      found = allPdfs[0].file;
    }
    return jsonOut_({
      result:"success",
      fileId: found.getId(),
      fileName: found.getName(),
      fileUrl: found.getUrl(),
      previewUrl: "https://drive.google.com/file/d/" + found.getId() + "/preview"
    });
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}
// ============================================================
// [v21.1] 추가 모듈: 재요청 / 삭제 / 확정조회
// ============================================================

// [v21.1] 불일치 문항만 AI 재요청 → 다수결 결정
// POST: action=ai_retry_mismatches, rowIndex
function aiRetryMismatches_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh) return jsonOut_({result:"error", message:"정답목록 없음"});
    var rowIndex = parseInt(data.rowIndex || "0", 10);
    if (rowIndex < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    var row = sh.getRange(rowIndex, 1, 1, sh.getLastColumn()).getValues()[0];
    var folderId = String(row[13] || "");
    var totalQ = parseInt(row[6], 10) || 0;
    var rowTypesForRetry = {};
    try { rowTypesForRetry = normalizeAnswerData(row[8] || "{}"); } catch(_eRetryType) { rowTypesForRetry = {}; }
    if (!folderId) return jsonOut_({result:"error", message:"folderId 없음 (재요청 불가)"});
    // 답지 PDF 다시 로드
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var pdfFile = null;
    while (files.hasNext()) {
      var f = files.next();
      var nm = f.getName();
      if (/answer|정답|답지/i.test(nm) && /\.pdf$/i.test(nm)) { pdfFile = f; break; }
    }
    if (!pdfFile) {
      var files2 = folder.getFiles();
      while (files2.hasNext()) { var f2 = files2.next(); if (/\.pdf$/i.test(f2.getName())) { pdfFile = f2; break; } }
    }
    if (!pdfFile) return jsonOut_({result:"error", message:"답지 PDF 없음"});
    var pdfBase64 = Utilities.base64Encode(pdfFile.getBlob().getBytes());
    // 시트 메타 → examInfo 재구성
    var examInfo = {
      subject: row[1], grade: row[2], level: row[3], examType: row[4],
      teacher: row[9], totalQuestions: totalQ,
      subjMode: data.subjMode || "none",
      subjRanges: data.subjRanges || ""
    };
    Logger.log("[ai_retry_mismatches] rowIndex=" + rowIndex + " 재요청 시작");
    var t0 = Date.now();
    var results = _aiExtractAll_(pdfBase64, examInfo);
    if (results.error) return jsonOut_({result:"error", message: results.error});
    var check = _checkUnanimous_(results, totalQ, examInfo);
    // 다수결 결정: 만장일치 + 2/3 일치 모두 채워서 finalAnswer 만듦
    var majorityFinal = {};
    var stillMismatch = [];
    for (var q = 1; q <= totalQ; q++) {
      var qStr = String(q);
      if (check.finalAnswer[qStr]) {
        majorityFinal[qStr] = check.finalAnswer[qStr];
        continue;
      }
      // 불일치 문항 → 다수결 시도 (정규화 값 기준)
      var rawG = ((results.gemini||{}).answers||{})[qStr];
      var rawP = ((results.gpt||{}).answers||{})[qStr];
      var rawC = ((results.claude||{}).answers||{})[qStr];
      var nG = _normalizeAnswerToken_(rawG);
      var nP = _normalizeAnswerToken_(rawP);
      var nC = _normalizeAnswerToken_(rawC);
      var votes = [nG, nP, nC].filter(function(v){ return v && v !== "?"; });
      // 다수결 카운트
      var count = {};
      var rawByNorm = {};
      [[nG,rawG],[nP,rawP],[nC,rawC]].forEach(function(pair){
        if (pair[0] && pair[0] !== "?") {
          count[pair[0]] = (count[pair[0]]||0) + 1;
          if (!rawByNorm[pair[0]]) rawByNorm[pair[0]] = String(pair[1]||"").trim();
        }
      });
      var bestVal = "", bestCount = 0;
      Object.keys(count).forEach(function(k){
        if (count[k] > bestCount) { bestCount = count[k]; bestVal = k; }
      });
      if (bestCount >= 2) {
        // 2개 이상 일치 → 다수결로 채움
        var majorityRaw = rawByNorm[bestVal] || bestVal;
        majorityFinal[qStr] = _isObjectiveTypeToken_(rowTypesForRetry[qStr])
          ? _normalizeObjectiveAnswerValue_(majorityRaw)
          : majorityRaw;
      } else {
        stillMismatch.push({
          q: q,
          gemini: String(rawG||""),
          gpt: String(rawP||""),
          claude: String(rawC||"")
        });
      }
    }
    Logger.log("[ai_retry_mismatches] 완료 — 다수결 결정 " + Object.keys(majorityFinal).length + " / 여전히 불일치 " + stillMismatch.length + " (" + (Date.now()-t0) + "ms)");
    return jsonOut_({
      result: "success",
      majorityFinal: majorityFinal,
      stillMismatch: stillMismatch,
      modelResults: {
        gemini: { ok: !results.gemini.error, error: results.gemini.error || "", answers: results.gemini.answers || {}, answerCount: Object.keys(results.gemini.answers||{}).length },
        gpt:    { ok: !results.gpt.error,    error: results.gpt.error || "",    answers: results.gpt.answers || {},    answerCount: Object.keys(results.gpt.answers||{}).length },
        claude: { ok: !results.claude.error, error: results.claude.error || "", answers: results.claude.answers || {}, answerCount: Object.keys(results.claude.answers||{}).length }
      },
      elapsedMs: Date.now()-t0
    });
  } catch(err) {
    Logger.log("[ai_retry_mismatches] FATAL: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// [v21.1] 검수 목록 삭제 (PENDING / AUTO_OK / MANUAL_CONFIRMED 모두 삭제 가능)
// POST: action=delete_review, rowIndex, deletedBy
function deleteReview_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh) return jsonOut_({result:"error", message:"정답목록 없음"});
    var rowIndex = parseInt(data.rowIndex || "0", 10);
    if (rowIndex < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    var meta = sh.getRange(rowIndex, 1, 1, 12).getValues()[0];
    sh.deleteRow(rowIndex);
    var deletedBy = data.deletedBy || data.teacher || "-";
    try {
      slackSend_("🗑 *검수 목록 삭제* — " + (meta[1]||"") + " " + (meta[2]||"") + " " + (meta[3]||"") + " (" + (meta[4]||"") + ") · 행 #" + rowIndex + " · 삭제자: " + deletedBy);
    } catch(_s) {}
    return jsonOut_({result:"success", rowIndex: rowIndex});
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// [v21.1] 확정 답지 조회 — AUTO_OK / MANUAL_CONFIRMED 답지 목록
// GET: action=list_confirmed_answers&teacher=xxx&days=30
function listConfirmedAnswers_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh) return jsonOut_({result:"success", items:[]});
    var rows = sh.getDataRange().getValues();
    var teacherFilter = String(e.parameter.teacher || "").trim();
    var days = parseInt(e.parameter.days || "30", 10);
    var cutoff = Date.now() - days * 24 * 3600 * 1000;
    var items = [];
    for (var i = 1; i < rows.length; i++) {
      var status = String(rows[i][16] || "");
      if (status !== "AUTO_OK" && status !== "MANUAL_CONFIRMED") continue;
      if (teacherFilter && String(rows[i][9]||"").trim() !== teacherFilter) continue;
      var ts = rows[i][0];
      var tsDate = (ts instanceof Date) ? ts.getTime() : (new Date(ts)).getTime();
      if (!isNaN(tsDate) && tsDate < cutoff) continue;
      var answers = {};
      try { answers = JSON.parse(rows[i][7] || "{}"); } catch(_a){}
      items.push({
        rowIndex: i+1,
        registeredAt: rows[i][0],
        date: rows[i][12] || rows[i][0],
        subject: rows[i][1],
        grade: rows[i][2],
        level: rows[i][3],
        examType: rows[i][4],
        setType: rows[i][5],
        teacher: rows[i][9],
        className: rows[i][11],
        totalQ: rows[i][6],
        startNumber: rows[i][14],
        status: status,
        answerCount: Object.keys(answers).length
      });
    }
    items.sort(function(a,b){
      return String(b.registeredAt).localeCompare(String(a.registeredAt));
    });
    return jsonOut_({result:"success", items: items});
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// [v21.1] 확정 답지 상세 (정답/타입/검수메타 포함)
// GET: action=get_confirmed_detail&rowIndex=N
function getConfirmedDetail_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh) return jsonOut_({result:"error", message:"정답목록 없음"});
    var rowIndex = parseInt(e.parameter.rowIndex || "0", 10);
    if (rowIndex < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    var row = sh.getRange(rowIndex, 1, 1, sh.getLastColumn()).getValues()[0];
    var answers = {}, types = {}, verData = {};
    try { answers = JSON.parse(row[7] || "{}"); } catch(_a){}
    try { types = JSON.parse(row[8] || "{}"); } catch(_t){}
    try { verData = JSON.parse(row[15] || "{}"); } catch(_v){}
    return jsonOut_({
      result: "success",
      rowIndex: rowIndex,
      registeredAt: row[0],
      date: row[12] || row[0],
      subject: row[1], grade: row[2], level: row[3], examType: row[4],
      setType: row[5], totalQ: row[6],
      teacher: row[9], className: row[11], folderId: row[13],
      startNumber: row[14], status: row[16],
      answers: answers, types: types,
      verData: verData
    });
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ============================================================
// [v21.0] AI 답지 자동 추출 모듈 끝
// ============================================================
// ── ② 지각 채점 (새 정답 등록 직후 자동 호출) ──
// 학생이 정답 없이 제출해서 점수 null 인 답안을 뒤늦게 채점
function regradeLateSubmissions_(rowFromAnswerSheet) {
  try {
    if (!rowFromAnswerSheet) return 0;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sSheet = ss.getSheetByName("학생답안기록");
    if (!sSheet || sSheet.getLastRow() <= 1) return 0;
    var subject  = rowFromAnswerSheet[1];
    var grade    = rowFromAnswerSheet[2];
    var level    = rowFromAnswerSheet[3];
    var examType = rowFromAnswerSheet[4];
    var examDate = rowFromAnswerSheet[12] ? String(rowFromAnswerSheet[12]) : "";
    // ★ v27.18 (2026-05-30): 지각 재채점도 시험날짜를 함께 확인해 다른 날짜의 빈 점수 행을 건드리지 않음
    var normRegradeDate_ = function(v) {
      try {
        if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone() || "Asia/Seoul", "yyyyMMdd");
      } catch(_eDate) {}
      return String(v || "").replace(/[^\d]/g, "").substring(0, 8);
    };
    var examDateN = normRegradeDate_(examDate);
    var answerKey = {};
    try { answerKey = JSON.parse(rowFromAnswerSheet[7] || "{}"); } catch(er){ answerKey = {}; }
    var typesMap = {};
    try { typesMap = JSON.parse(rowFromAnswerSheet[8] || "{}"); } catch(er){ typesMap = {}; }
    var totalQ = Number(rowFromAnswerSheet[6]) || 0;
    if (!answerKey || Object.keys(answerKey).length === 0) return 0;
    var rows = sSheet.getDataRange().getValues();
    var updated = 0;
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      // 점수(9번 인덱스)가 null/비어있는 것만 재채점 대상
      if (r[9] !== "" && r[9] !== null && r[9] !== undefined) continue;
      if (String(r[4]||"") !== subject) continue;
      if (String(r[5]||"") !== grade) continue;
      if (String(r[6]||"") !== level && r[6] !== "전체" && level !== "전체") continue;
      // 시험명: "종합시험" 또는 "종합시험 (1차)" 둘 다 허용
      var exNm = String(r[7]||"").trim();
      if (exNm.indexOf(examType) === -1 && examType.indexOf(exNm) === -1) continue;
      if (examDateN) {
        var rowDateN = normRegradeDate_(r[8]);
        if (rowDateN && rowDateN !== examDateN) continue;
      }
      // 답안 가져오기 (15번 컬럼)
      var studentAns = null;
      try { studentAns = JSON.parse(r[14] || "null"); } catch(er) { studentAns = null; }
      if (!studentAns) continue;
      // 간이 채점: 객관식만 자동, 주관식은 save_subjective_grade/update_grading 경로에서 별도 반영
      // ★ v27.23 (2026-05-30): 주관식 포함 시험은 객관식 부분점수만 저장하지 않음(임시 점수 오염 방지)
      var correct = 0, wrong = 0, totalObj = 0, wrongQs = [];
      var hasSubjective = false;
      for (var q = 0; q < totalQ; q++) {
        var key = String(q+1);
        // ★ v27.17 (2026-05-30): 주관식만 건너뜀 — "mc"(객관식) 토큰이 skip돼 객관식 전원 0점 되던 버그 픽스
        var typ = String(typesMap[key] || typesMap[q] || "obj").toLowerCase();
        if (typ === "sub" || typ === "sa" || typ === "subj" || typ === "subjective" || typ === "essay") {
          hasSubjective = true;
          continue;
        }
        totalObj++;
        var sa = studentAns[q];
        if (sa === null || sa === undefined || sa === "") { wrong++; wrongQs.push(q+1); continue; }
        var ka = answerKey[key] !== undefined ? answerKey[key] : answerKey[q];
        var sArr = Array.isArray(sa) ? sa.slice().sort() : [sa];
        var kArr = Array.isArray(ka) ? ka.slice().sort() : (String(ka).indexOf(",") >= 0 ? String(ka).split(",").map(function(s){return s.trim();}).sort() : [ka]);
        var ok = sArr.length === kArr.length && sArr.every(function(v,idx){return String(v) === String(kArr[idx]);});
        if (ok) correct++; else { wrong++; wrongQs.push(q+1); }
      }
      if (hasSubjective) {
        Logger.log("지각채점 보류(주관식 포함): " + r[1] + " / " + exNm);
        continue;
      }
      var score = totalObj > 0 ? Math.round((correct/totalObj)*100) : 0;
      // 업데이트 (컬럼 10~14)
      sSheet.getRange(i+1, 10).setValue(score);
      sSheet.getRange(i+1, 11).setValue(correct);
      sSheet.getRange(i+1, 12).setValue(wrong);
      sSheet.getRange(i+1, 13).setValue(totalObj);
      sSheet.getRange(i+1, 14).setValue(wrongQs.join(", "));
      updated++;
    }
    if (updated > 0) {
      Logger.log("지각채점 완료: " + subject + " " + grade + " " + level + " " + examType + " → " + updated + "건");
    }
    return updated;
  } catch(err) {
    Logger.log("regradeLateSubmissions_ 오류: " + err);
    return 0;
  }
}
// ── ① Claude 분석 실패 Slack 알림 ──
function notifyAnalysisFailure_(folderPath, errorMsg) {
  slackSend_("❌ *Claude 분석 실패*\n• 폴더: `" + folderPath + "`\n• 오류: " + errorMsg + "\n• 선생님이 정답지를 다시 확인해주세요.");
}
// ── ④ 문항수 검증 ──
function validateAnswerCount_(folderPath, data) {
  var expected = Number(data.totalQuestions) || 0;
  var actual = data.answers ? Object.keys(data.answers).length : 0;
  if (expected > 0 && actual > 0 && actual < expected) {
    slackSend_("⚠️ *문항수 불일치 경고*\n• 폴더: `" + folderPath + "`\n• 예상: " + expected + "문항\n• 실제 추출: " + actual + "문항\n• 차이: " + (expected-actual) + "개 누락 → 정답지 재확인 필요");
    return false;
  }
  return true;
}
// ── ⑨ 정합성 체크 (업로드됐는데 정답목록에 없음) ──
function checkUploadVsAnswerConsistency_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var uSh = ss.getSheetByName("업로드기록");
    var aSh = ss.getSheetByName("정답목록");
    if (!uSh || uSh.getLastRow() <= 1) return;
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var today = new Date();
    today.setDate(today.getDate() - 1); // 어제까지
    var cutoff = Utilities.formatDate(today, tz, "yyyy.MM.dd");
    var uR = uSh.getDataRange().getValues();
    var aFolderIds = {};
    if (aSh && aSh.getLastRow() > 1) {
      var aR = aSh.getDataRange().getValues();
      for (var ai = 1; ai < aR.length; ai++) {
        var fid = String(aR[ai][13] || "");
        if (fid) aFolderIds[fid] = true;
      }
    }
    var missing = [];
    for (var i = 1; i < uR.length; i++) {
      var u = uR[i];
      var link = String(u[10] || "");
      var m = link.match(/folders\/([^\/\?&]+)/);
      var folderId = m ? m[1] : "";
      if (!folderId) continue;
      if (aFolderIds[folderId]) continue;
      // 어제 이전의 것만 (오늘 건 방금 올렸을 수 있음)
      var udate = String(u[6]||"");
      if (udate && udate > cutoff) continue;
      missing.push({
        date: udate, teacher: u[12]||"", subject: u[1]||"", grade: u[2]||"",
        level: u[3]||"", examType: u[5]||"", round: u[15]||"", link: link
      });
    }
    if (missing.length === 0) {
      slackSend_("✅ 정합성 OK — 모든 업로드 시험이 정답목록에 반영됨.");
      return;
    }
    var lines = ["⚠️ *분석 밀림 경고 — " + missing.length + "건*"];
    missing.slice(0, 15).forEach(function(x){
      lines.push("• " + x.date + " " + x.subject + " " + x.grade + " " + x.level + " / " + x.examType + (x.round?" ("+x.round+")":"") + " — " + x.teacher);
    });
    if (missing.length > 15) lines.push("...외 " + (missing.length-15) + "건");
    slackSend_(lines.join("\n"));
  } catch(err) {
    Logger.log("정합성 체크 오류: " + err);
  }
}
// ── ⑥ 일괄 프린트: 오늘 프린트할 파일 목록 반환 ──
// ★ v23.0: 정답목록 (문제생성기 자동 등록분 포함) 도 같이 스캔 — 이전엔 업로드기록만 봐서 누락
function listPrintJobs_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var qDate = (e.parameter.date || "").trim();
    var target;
    if (qDate) {
      var qm = qDate.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      target = qm ? new Date(parseInt(qm[1],10), parseInt(qm[2],10)-1, parseInt(qm[3],10)) : new Date();
    } else { target = new Date(); }
    var todayDash = Utilities.formatDate(target, tz, "yyyy-MM-dd");
    var todayDot = Utilities.formatDate(target, tz, "yyyy.MM.dd");
    var jobs = [];
    var seenFolderIds = {}; // 같은 폴더 중복 등록 방지

    // 폴더 → 파일 추출 헬퍼
    function _scanFolderFiles(fid) {
      var arr = [];
      try {
        var fld = DriveApp.getFolderById(fid);
        var ff = fld.getFiles();
        while (ff.hasNext()) {
          var file = ff.next();
          var fn = file.getName();
          var lname = fn.toLowerCase();
          if (lname.indexOf("정답") !== -1 || /answer|solution/i.test(lname)) continue;
          if (lname.indexOf("시험정보") !== -1) continue;
          var ext = lname.match(/\.(pdf|docx?|hwpx?|jpe?g|png)$/);
          if (!ext) continue;
          arr.push({id: file.getId(), name: fn, size: file.getSize()});
        }
      } catch(er){}
      return arr;
    }

    // 업로드기록 기반 (예상인원 포함)
    var uSh = ss.getSheetByName("업로드기록");
    if (uSh && uSh.getLastRow() > 1) {
      var uR = uSh.getDataRange().getValues();
      for (var i = 1; i < uR.length; i++) {
        var u = uR[i];
        var udate = String(u[6]||"");
        if (udate.indexOf(todayDash) === -1 && udate.indexOf(todayDot) === -1) continue;
        var link = String(u[10]||"");
        var m = link.match(/folders\/([^\/\?&]+)/);
        if (!m) continue;
        var fid = m[1];
        if (seenFolderIds[fid]) continue;
        seenFolderIds[fid] = true;
        var count = Number(u[13]) || 0;
        var files = _scanFolderFiles(fid);
        if (files.length > 0) {
          jobs.push({
            teacher: u[12]||"", subject: u[1]||"", grade: u[2]||"", level: u[3]||"",
            examType: u[5]||"", round: u[15]||"", count: count, files: files,
            source: "upload"
          });
        }
      }
    }
    // ★ v23.0: 정답목록 기반 보강 — 문제생성기 자동 등록 + 직접 입력 시험 등 업로드기록에 없는 항목 포함
    var aSh = ss.getSheetByName("정답목록");
    if (aSh && aSh.getLastRow() > 1) {
      var aR = aSh.getDataRange().getValues();
      for (var ai = 1; ai < aR.length; ai++) {
        var ar = aR[ai];
        var adate = String(ar[5]||""); // F열: 시험날짜
        if (adate.indexOf(todayDash) === -1 && adate.indexOf(todayDot) === -1) continue;
        var aFid = String(ar[13]||"").trim(); // N열: 폴더ID
        if (!aFid) continue;
        if (seenFolderIds[aFid]) continue;
        seenFolderIds[aFid] = true;
        var aCount = Number(ar[10]) || 0; // K열: 학생수 (있으면)
        var aFiles = _scanFolderFiles(aFid);
        if (aFiles.length > 0) {
          jobs.push({
            teacher: ar[9]||"", subject: ar[1]||"", grade: ar[2]||"", level: ar[3]||"",
            examType: ar[4]||"", round: "", count: aCount, files: aFiles,
            source: "answer-list"
          });
        }
      }
    }
    return jsonOut_({result:"ok", date: todayDash, jobs: jobs});
  } catch(err) {
    return jsonOut_({result:"error", message: String(err), jobs: []});
  }
}
// ── ⑧ 반별 오답 통계 ──
function wrongStats_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var qDate = (e.parameter.date || "").trim();
    var qSubject = (e.parameter.subject || "").trim();
    var qGrade = (e.parameter.grade || "").trim();
    var qExam = (e.parameter.examType || "").trim();
    var sSh = ss.getSheetByName("학생답안기록");
    if (!sSh || sSh.getLastRow() <= 1) return jsonOut_({result:"ok", stats: []});
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var rows = sSh.getDataRange().getValues();
    // 그룹: (과목|학년|레벨|시험명) → {total, scores, wrongByQ}
    var groups = {};
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var subj = String(r[4]||""), gr = String(r[5]||""), lv = String(r[6]||""), ex = String(r[7]||"");
      if (qSubject && subj !== qSubject) continue;
      if (qGrade && gr !== qGrade) continue;
      if (qExam && ex.indexOf(qExam) === -1) continue;
      if (qDate) {
        var dateStr = String(r[8]||"");
        if (dateStr.indexOf(qDate) === -1 && dateStr.replace(/-/g,".").indexOf(qDate.replace(/-/g,".")) === -1) continue;
      }
      var score = r[9];
      if (score === "" || score === null || score === undefined) continue;
      var key = subj+"|"+gr+"|"+lv+"|"+ex;
      if (!groups[key]) groups[key] = {subject:subj, grade:gr, level:lv, examType:ex, total:0, sumScore:0, scores:[], wrongByQ:{}};
      groups[key].total++;
      groups[key].sumScore += Number(score)||0;
      groups[key].scores.push(Number(score)||0);
      var wqs = String(r[13]||"");
      if (wqs) {
        wqs.split(",").forEach(function(q){
          var qn = q.trim();
          if (!qn) return;
          groups[key].wrongByQ[qn] = (groups[key].wrongByQ[qn] || 0) + 1;
        });
      }
    }
    var stats = [];
    Object.keys(groups).forEach(function(k){
      var g = groups[k];
      var avg = g.total > 0 ? Math.round(g.sumScore/g.total) : 0;
      // ★ v24.11: 어려운 문항 Top 7 (통계 가중치 + 5명 미만 제외)
      var hardestRaw2 = Object.keys(g.wrongByQ).map(function(q){
        var w = g.wrongByQ[q];
        return {
          q: Number(q),
          wrong: w,
          pct: Math.round((w / g.total) * 100),
          _score: g.total >= 5 ? (w / g.total) * Math.log(g.total + 1) * 10 : 0
        };
      });
      var hardest = g.total >= 5
        ? hardestRaw2.filter(function(h){return h._score > 0;})
                     .sort(function(a,b){return b._score - a._score;})
                     .slice(0, 7)
                     .map(function(h){return {q:h.q, wrong:h.wrong, pct:h.pct};})
        : [];
      stats.push({subject:g.subject, grade:g.grade, level:g.level, examType:g.examType, total:g.total, avg:avg, hardest:hardest});
    });
    return jsonOut_({result:"ok", stats: stats});
  } catch(err) {
    return jsonOut_({result:"error", message: String(err), stats:[]});
  }
}
// ═══ v20.5: 반별 성적 (학생별 점수 + 오답 번호) ═══
// 사용:
//   ?action=class_grades&date=2026-04-25 (단일 날짜)
//   ?action=class_grades&dateFrom=2026-04-01&dateTo=2026-04-25 (기간)
//   + &subject=영어 &teacher=김건재 &grade=중1 (옵션 필터)
// 반환: { result, classes:[{subject,grade,level,examType,teacher,date,total,avg,max,min,students:[{name,score,wrongQs[],rank}],hardest[]}] }
function classGrades_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var qDate = (e.parameter.date || "").trim();
    var qDateFrom = (e.parameter.dateFrom || "").trim();
    var qDateTo = (e.parameter.dateTo || "").trim();
    var qTeacher = (e.parameter.teacher || "").trim();
    var qGrade = (e.parameter.grade || "").trim();
    var qSubject = (e.parameter.subject || "").trim();
    // ★ v26.1 (2026-05-13): 응답 슬림 모드 — perQuestion 의 reasoning 제거 (응답 크기 70% 감소)
    //   사용: ?light=1  (학생 카드 펼침 시에만 풀 데이터 별도 호출)
    var _lightMode = String(e.parameter.light || "") === "1";

    // ★ v26.0 (2026-05-13): 응답 캐싱 (5분 TTL) — 같은 조회 반복 호출 시 즉시 반환
    //   원인: class_grades 가 1분 걸렸음 (정답목록 + 학생답안 두 시트 전체 스캔 + JOIN + 폴더 매칭)
    //   해결: 응답 JSON 자체를 CacheService 에 저장 → 같은 파라미터 재호출 시 0.1초
    //   캐시 무효화: 시험 등록·정답 수정 시 자동 (해당 핸들러에서 clearClassGradesCache_())
    var _cgCache = CacheService.getScriptCache();
    // ★ v27.17: 캐시 키에 버전 포함 → clearClassGradesCache_() 가 버전 올리면 이전 키 전부 무효
    // ★ v27.25 (2026-05-30): 부분정답을 복습/어려운문항 집계에 포함 → 옛 class_grades 응답 캐시와 분리
    var _cgKey = "cg_v27_25_" + _cgCacheVer_() + "_" + [qDate, qDateFrom, qDateTo, qTeacher, qGrade, qSubject, _lightMode?"L":"F"].join("|");
    var _noCache = String(e.parameter.nocache || "") === "1";
    if (!_noCache) {
      var _hit = _cgCache.get(_cgKey);
      if (_hit) {
        return ContentService.createTextOutput(_hit).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 날짜 정규화 헬퍼: "2026-04-25" / "2026.04.25" → "20260425"
    function _normDate(s){ return String(s||"").replace(/[^0-9]/g,""); }
    var ndQ = _normDate(qDate);
    var ndFrom = _normDate(qDateFrom);
    var ndTo = _normDate(qDateTo);

    // ★ v20.5: 시험명 정규화 — 끝의 차수/세트 태그 제거 (매칭 전용, 표시는 원본 유지)
    //   학생앱: "모의고사 변형 (어법·어휘) (1차)" → 정답목록: "모의고사 변형 (어법·어휘)"
    //   이 태그가 안 잘리면 L4(시험명만) JOIN 도 실패 → 김건재 시험 검색 안 되는 버그.
    //   대상 태그: (1차)~(9차), (이론편), (실전편), (혼합), (세트A)~(세트E), (A)~(E)
    function _normExamName(s){
      var v = String(s||"").trim();
      // 끝에서부터 반복 제거 (중첩 가능: "모의고사 (1차) (세트A)" 같은 케이스)
      var tagRe = /\s*\(\s*(?:[1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/;
      while (tagRe.test(v)) v = v.replace(tagRe, "").trim();
      return v;
    }

    // 1) 정답목록 인덱싱 — 4단계 키 (과목 누락/오염 데이터 보정용)
    //    L1: 과목|학년|레벨|시험명 (정확)
    //    L2: 학년|레벨|시험명 (과목 무시 — 학생답안 과목 오염 보정)
    //    L3: 학년|시험명 (레벨까지 무시)
    //    L4: 시험명 (최후의 수단)
    //    ★ 모든 키의 시험명은 _normExamName 으로 차수 태그 제거 후 사용
    var ansSh = ss.getSheetByName("정답목록");
    var L1 = {}, L2 = {}, L3 = {}, L4 = {};
    if (ansSh && ansSh.getLastRow() > 1) {
      var ansRows = ansSh.getDataRange().getValues();
      // ★ v23.6: folderId 있는 행을 우선 — "이 시험의 폴더 정보를 찾을 수 없어요" 오류 방지
      //   같은 키에 여러 행이 있으면, folderId 가 있는 행이 이긴다. 둘 다 있으면 최신 행이 이긴다.
      var _prefer = function(map, key, rec) {
        var prev = map[key];
        if (!prev) { map[key] = rec; return; }
        var prevHasFid = !!(prev.folderId);
        var newHasFid = !!(rec.folderId);
        if (newHasFid && !prevHasFid) { map[key] = rec; return; }  // 새 행이 폴더ID 있고, 기존은 없으면 → 교체
        if (!newHasFid && prevHasFid) return;                       // 새 행이 폴더ID 없고, 기존은 있으면 → 유지
        map[key] = rec;                                             // 둘 다 같은 상태면 최신 행으로 덮어쓰기
      };
      for (var ai = 1; ai < ansRows.length; ai++) {
        var ar = ansRows[ai];
        var aSubj = String(ar[1]||"").trim();
        var aGr = String(ar[2]||"").trim();
        var aLv = String(ar[3]||"").trim();
        var aEx = String(ar[4]||"").trim();
        var aTeacher = String(ar[9]||"").trim();
        if (!aEx) continue;
        var aExN = _normExamName(aEx);
        // ★ v22.6: answers/types/totalQ 도 같이 인덱싱 — 문항별 답안 표시용
        var aAnswers = {}, aTypes = {};
        try { aAnswers = JSON.parse(ar[7] || "{}"); } catch(eAns){ aAnswers = {}; }
        try { aTypes = JSON.parse(ar[8] || "{}"); } catch(eTyp){ aTypes = {}; }
        var rec = {
          teacher: aTeacher, subject: aSubj, grade: aGr, level: aLv, examType: aEx,
          answers: aAnswers, types: aTypes, totalQ: Number(ar[6]) || 0,
          folderId: String(ar[13] || "")  // ★ v22.8: 시험지/답지 파일 다운로드용
        };
        // ★ v23.6: folderId 있는 행 우선 (같은 키에 여러 행 있을 때)
        _prefer(L1, aSubj+"|"+aGr+"|"+aLv+"|"+aExN, rec);
        _prefer(L2, aGr+"|"+aLv+"|"+aExN, rec);
        _prefer(L3, aGr+"|"+aExN, rec);
        _prefer(L4, aExN, rec);
      }
    }

    // 2) 학생답안기록 스캔
    var sSh = ss.getSheetByName("학생답안기록");
    if (!sSh || sSh.getLastRow() <= 1) return jsonOut_({result:"ok", classes: []});
    // ★ v26.0: 끝에서부터 부분 범위 읽기 (최대 1500행) — 단일 날짜는 보통 최근 행에 있음
    //   기간 조회 (range 모드) 면 전체 읽기 필요
    var _sLastRow = sSh.getLastRow();
    var _sLastCol = Math.min(sSh.getLastColumn(), 18);  // 컬럼 R(18)까지만
    var _isRangeMode = !!(ndFrom || ndTo);
    var _sReadFrom = _isRangeMode ? 1 : Math.max(1, _sLastRow - 1500);
    var _sReadCount = _sLastRow - _sReadFrom + 1;
    var rows = sSh.getRange(_sReadFrom, 1, _sReadCount, _sLastCol).getValues();
    // 부분 범위라 첫 row 도 데이터 (헤더 아님). 헤더 행이 _sReadFrom 안에 포함된 경우만 i=1 시작
    var _sStartIdx = (_sReadFrom === 1) ? 1 : 0;
    var groups = {};
    for (var i = _sStartIdx; i < rows.length; i++) {
      var r = rows[i];
      var subjRaw = String(r[4]||"").trim();
      var gr = String(r[5]||"").trim();
      var lv = String(r[6]||"").trim();
      var ex = String(r[7]||"").trim();
      var dateStr = String(r[8]||"").trim();
      var name = String(r[1]||"").trim();
      var score = r[9];
      // ★ v25.1: 학생이 제출 시 명시한 teacher / folderId (있으면 우선 사용)
      var studentTeacher = String(r[15]||"").trim();
      var studentFolderId = String(r[16]||"").trim();
      // ★ v25.2 안전장치: P열에 JSON 형태가 들어있으면 (옛 v25.1 버그) 무시
      if (studentTeacher && (studentTeacher.charAt(0) === "[" || studentTeacher.charAt(0) === "{")) {
        studentTeacher = "";  // JSON 데이터 → teacher 가 아님 → 무시
      }
      if (studentFolderId && (studentFolderId.charAt(0) === "[" || studentFolderId.charAt(0) === "{")) {
        studentFolderId = "";
      }

      // 날짜 필터 (단일/기간)
      var ndR = _normDate(dateStr);
      if (ndQ && ndR.indexOf(ndQ) === -1) continue;
      if (ndFrom && ndR < ndFrom) continue;
      if (ndTo && ndR > ndTo) continue;
      if (score === "" || score === null || score === undefined) continue;

      // 정답목록 매칭 — 4단계 fallback (★ 시험명 정규화 후 lookup)
      var exN = _normExamName(ex);
      var match = L1[subjRaw+"|"+gr+"|"+lv+"|"+exN]
               || L2[gr+"|"+lv+"|"+exN]
               || L3[gr+"|"+exN]
               || L4[exN]
               || null;

      // ★ v25.1: 학생이 명시한 teacher/folderId 가 있으면 그쪽 행을 다시 찾아 보정
      // ★ v26.0: ansRows2 → 위에서 이미 읽은 ansRows 재사용 (중복 시트 읽기 제거 ~3초 절약)
      if (studentTeacher || studentFolderId) {
        if (ansSh && ansSh.getLastRow() > 1) {
          var ansRows2 = (typeof ansRows !== "undefined" && ansRows && ansRows.length > 0) ? ansRows : ansSh.getDataRange().getValues();
          for (var ai2 = 1; ai2 < ansRows2.length; ai2++) {
            var ar2 = ansRows2[ai2];
            var fidA = String(ar2[13] || "").trim();
            var teA = String(ar2[9] || "").trim();
            var exA = _normExamName(String(ar2[4]||""));
            // folderId 정확 일치 → 최우선
            if (studentFolderId && fidA && fidA === studentFolderId) {
              match = {
                teacher: teA, subject: String(ar2[1]||""), grade: String(ar2[2]||""),
                level: String(ar2[3]||""), examType: String(ar2[4]||""),
                answers: (function(){try{return JSON.parse(ar2[7]||"{}");}catch(e){return{};}})(),
                types: (function(){try{return JSON.parse(ar2[8]||"{}");}catch(e){return{};}})(),
                totalQ: Number(ar2[6])||0, folderId: fidA
              };
              break;
            }
            // teacher + examName + grade 일치 → 차선
            if (studentTeacher && teA === studentTeacher && exA === exN
                && String(ar2[2]||"").trim() === gr) {
              match = {
                teacher: teA, subject: String(ar2[1]||""), grade: String(ar2[2]||""),
                level: String(ar2[3]||""), examType: String(ar2[4]||""),
                answers: (function(){try{return JSON.parse(ar2[7]||"{}");}catch(e){return{};}})(),
                types: (function(){try{return JSON.parse(ar2[8]||"{}");}catch(e){return{};}})(),
                totalQ: Number(ar2[6])||0, folderId: fidA
              };
              // 계속 보면서 folderId 일치 우선 — 다음 루프에서 더 정확한 행 있으면 교체
            }
          }
        }
      }

      // 과목 — 매칭값이 있으면 그것으로 덮어쓰기 (학생답안의 오염값 보정)
      var subject = (match && match.subject) ? match.subject : subjRaw;
      // ★ v25.1: teacher — 학생이 명시한 값 > 매칭된 정답목록 값 > 빈값
      var teacher = studentTeacher || (match && match.teacher) || "";

      // 사용자 필터
      if (qSubject && subject !== qSubject) continue;
      if (qGrade && gr !== qGrade) continue;
      if (qTeacher && teacher !== qTeacher) continue;

      // ★ v22.6: 틀린 문항 파싱 — 합리적 범위(1~1000)만 허용
      // (셀 손상으로 거대 숫자가 들어온 경우 무시 — 예: "520260000000900")
      var wqRaw = String(r[13]||"").trim();
      var wqArr = [];
      if (wqRaw) {
        wqRaw.split(",").forEach(function(q){
          var v = q.trim().replace(/[^\d]/g,"");
          var n = Number(v);
          if (v && !isNaN(n) && n >= 1 && n <= 1000) wqArr.push(n);
        });
      }
      // ★ v22.6: 답안원본(r[14]) + 채점상세(r[15]) 파싱 — 문항별 학생 답안 표시용
      var studentAns = {};
      try { studentAns = JSON.parse(r[14] || "{}"); } catch(eA){ studentAns = {}; }
      var subjDetails = [];
      try {
        // ★ v27.17 (2026-05-30): 주관식상세는 R열(인덱스17)에 저장됨.
        //   v25.2에서 저장위치를 P열(16)→R열(18)로 옮겼으나, 여기 읽기는 옛 r[15](=선생님 P열)에 그대로 남아
        //   주관식 AI 채점결과가 '반별성적/대시보드' 통계에서 통째로 무시되던 버그 픽스.
        //   호환: 신규 save_subjective_grade=R열(r[17]), 구 update_grading=P열(r[15]) 둘 다 커버.
        //   정상행 r[15]는 선생님명이라 JSON.parse 실패→무시되므로 폴백은 안전.
        var sdRaw = r[17];
        if (sdRaw === "" || sdRaw === null || sdRaw === undefined) sdRaw = r[15];
        if (sdRaw) {
          var parsed = JSON.parse(sdRaw);
          if (Array.isArray(parsed)) subjDetails = parsed;
        }
      } catch(eD){ subjDetails = []; }
      // ★ v22.6: 문항별 정오 + 학생답안 + 정답 + AI 사유 빌드
      // ★ v22.8: 학생답안 배열 인덱싱 버그 수정
      //   학생답안(answers)은 배열 [ans1, ans2, ...] 이며 0-based
      //   → 1번 문항 = ans[0], 18번 문항 = ans[17], 40번 문항 = ans[39]
      //   기존: studentAns[qStr] = studentAns["18"] = ans[18] (=19번 답) 으로 잘못 매칭
      //   수정: 배열이면 ans[pq-1] (0-based), 객체면 ans[qStr] (1-based 키)
      var saIsArray = Array.isArray(studentAns);
      var perQuestion = [];
      var hasMissingSubDetails = false;
      if (match && match.totalQ > 0) {
        var totalQ = match.totalQ;
        var subjMap = {};
        subjDetails.forEach(function(d){ subjMap[Number(d.q)] = d; });
        for (var pq = 1; pq <= totalQ; pq++) {
          var qStr = String(pq);
          // ★ v22.8: 배열은 0-based(pq-1), 객체는 1-based 키(qStr) 사용
          var sa;
          if (saIsArray) {
            sa = (studentAns[pq-1] !== undefined && studentAns[pq-1] !== null) ? studentAns[pq-1] : "";
          } else {
            sa = (studentAns[qStr] !== undefined && studentAns[qStr] !== null) ? studentAns[qStr] : "";
          }
          var ca = (match.answers[qStr] !== undefined) ? match.answers[qStr] : "";
          var rawTyp = String(match.types[qStr] || match.types[pq-1] || "obj");
          var typ = (rawTyp === "sub" || rawTyp === "sa" || rawTyp === "subj" || rawTyp === "subjective" || rawTyp === "essay") ? "sub" : "obj";
          var subDet = subjMap[pq];
          if (typ === "sub" && !subDet) hasMissingSubDetails = true;
          var verdict = "정답";
          var score100 = 100;
          var reasoning = "";
          var saStr = Array.isArray(sa) ? sa.join(",") : String(sa == null ? "" : sa);
          var caStr = Array.isArray(ca) ? ca.join(",") : String(ca == null ? "" : ca);
          if (subDet) {
            // 주관식 — AI 채점 결과 사용
            score100 = Number(subDet.score) || 0;
            verdict = score100 === 100 ? "정답" : score100 === 0 ? "오답" : "부분정답";
            reasoning = String(subDet.reasoning || "");
          } else if (typ === "obj") {
            // ★ v22.9: 객관식 재검증 — 학생답과 현재 정답 비교 (옛 wqArr 데이터 무시)
            // 답지가 검수 중 수정된 경우 wqArr가 stale 할 수 있어 실시간 비교가 정확
            var _normTok = function(s){
              if (s === null || s === undefined) return "";
              var v = String(s).trim();
              if (!v) return "";
              v = v.replace(/[①②③④⑤]/g, function(c){ return ({"①":"1","②":"2","③":"3","④":"4","⑤":"5"})[c] || c; });
              v = v.replace(/\s+/g,"").replace(/[,;\/]/g,",");
              // 복수정답 정렬
              if (v.indexOf(",") >= 0) v = v.split(",").filter(Boolean).sort().join(",");
              return v.toLowerCase();
            };
            var saN = _normTok(saStr);
            var caN = _normTok(caStr);
            if (!saN || saN === "?") {
              // 빈답 = 오답
              verdict = "오답"; score100 = 0;
            } else if (caN && saN === caN) {
              verdict = "정답"; score100 = 100;
            } else {
              verdict = "오답"; score100 = 0;
            }
          } else {
            // ★ v27.24 (2026-05-30): 주관식상세가 없으면 확정 정답처럼 표시하지 않음
            // 점수 자체는 저장값을 보존하고, 문항별 표시는 재채점 필요 상태로만 보여준다.
            var isWrong = wqArr.indexOf(pq) >= 0;
            if (isWrong) { verdict = "오답"; score100 = 0; }
            else { verdict = "채점중"; score100 = 0; reasoning = "주관식 재채점 필요"; }
          }
          // ★ v26.1: light 모드 — reasoning 제거 (응답 크기 70% 감소)
          var _pqObj = {
            q: pq, type: typ,
            studentAns: saStr,
            correctAns: caStr,
            verdict: verdict,
            score: score100
          };
          if (!_lightMode && reasoning) _pqObj.reasoning = reasoning;
          perQuestion.push(_pqObj);
        }
      }
      // 그룹 키 = 반(시험) 단위 + 날짜
      var gKey = subject+"|"+gr+"|"+lv+"|"+ex+"|"+dateStr;
      if (!groups[gKey]) {
        groups[gKey] = {
          subject: subject, grade: gr, level: lv, examType: ex, date: dateStr,
          teacher: teacher,
          folderId: (match && match.folderId) || "",  // ★ v22.8: 시험지/답지 폴더 ID
          students: [],
          wrongByQ: {}
        };
      }
      // ★ v23.3: perQuestion 기반 점수 재계산 — 저장된 score 와 불일치 시 perQuestion 우선
      //   (정답 수정 후 재채점 안 한 경우 / 옛 wqArr 데이터 / 객관식 false-positive 보정)
      // ★ v27.20 (2026-05-30): 학생앱과 동일하게 혼합형은 주관식 1.5 가중치로 계산
      //   단, 주관식 채점상세가 아직 없으면 기본 100점 추정값으로 저장 점수를 덮지 않음.
      var dispScore = Number(score)||0;
      if (perQuestion && perQuestion.length > 0 && !hasMissingSubDetails) {
        var objScoreSum = 0, objCount = 0, subScoreSum = 0, subCount = 0;
        for (var pqi = 0; pqi < perQuestion.length; pqi++) {
          if (typeof perQuestion[pqi].score === "number" && !isNaN(perQuestion[pqi].score)) {
            if (perQuestion[pqi].type === "sub") {
              subScoreSum += perQuestion[pqi].score / 100;
              subCount++;
            } else {
              objScoreSum += perQuestion[pqi].score / 100;
              objCount++;
            }
          }
        }
        if (objCount + subCount > 0) {
          var isMixedWeighted = objCount > 0 && subCount > 0;
          var subWeightForCalc = isMixedWeighted ? 1.5 : 1.0;
          var totalPossibleForCalc = objCount + subCount * subWeightForCalc;
          var objMaxForCalc = totalPossibleForCalc > 0 ? Math.round((objCount / totalPossibleForCalc) * 100) : 0;
          var subMaxForCalc = totalPossibleForCalc > 0 ? (100 - objMaxForCalc) : 0;
          var objEarnedForCalc = objCount > 0 ? Math.round((objScoreSum / objCount) * objMaxForCalc) : 0;
          var subEarnedForCalc = subCount > 0 ? Math.round((subScoreSum / subCount) * subMaxForCalc) : 0;
          var computedScore = objEarnedForCalc + subEarnedForCalc;
          // 저장된 score 와 5점 이상 차이나면 perQuestion 우선 사용 (재채점 누락 대비)
          if (Math.abs(computedScore - dispScore) >= 5) {
            dispScore = computedScore;
          }
        }
      }
      // 재계산된 점수 기준 wrongQs (display 일관성)
      // ★ v27.24 (2026-05-30): 주관식상세가 부족하면 문항별 추정값 대신 저장된 틀린문항을 신뢰
      var dispWrongs = hasMissingSubDetails ? wqArr.slice() : perQuestion
        .filter(function(p){ return p.verdict === "오답" || p.verdict === "부분정답"; })
        .map(function(p){ return p.q; });
      if (!hasMissingSubDetails && dispWrongs.length === 0 && wqArr.length > 0 && dispScore < 100) {
        dispWrongs = wqArr.slice(); // perQuestion 없을 때 fallback
      }
      groups[gKey].students.push({
        name: name, score: dispScore, wrongQs: dispWrongs,
        subjectiveDetailsMissing: hasMissingSubDetails,
        perQuestion: perQuestion  // ★ v22.6: 문항별 상세 (객관식/주관식 답안 + AI 사유)
      });
      dispWrongs.forEach(function(qn){ groups[gKey].wrongByQ[qn] = (groups[gKey].wrongByQ[qn]||0) + 1; });
    }

    // 3) 통계 계산 + 정렬
    var classes = [];
    Object.keys(groups).forEach(function(k){
      var g = groups[k];
      var total = g.students.length;
      var sum = 0, max = -1, min = 999;
      g.students.forEach(function(s){ sum += s.score; if(s.score>max) max=s.score; if(s.score<min) min=s.score; });
      var avg = total > 0 ? Math.round(sum/total) : 0;
      // 학생 정렬: 점수 내림차순 (UI는 높은 순으로 위에서부터 표시)
      g.students.sort(function(a,b){ return b.score - a.score; });
      // 등수 부여 (동점 동순위)
      var rankMap = {};
      var prevScore = null, prevRank = 0;
      for (var ri = 0; ri < g.students.length; ri++) {
        var st = g.students[ri];
        var rk = (prevScore === st.score) ? prevRank : (ri+1);
        rankMap[st.name+"|"+st.score+"|"+ri] = rk;
        st.rank = rk;
        prevScore = st.score; prevRank = rk;
      }
      // ★ v24.11: 어려운 문항 Top 7 (통계 버그 수정)
      //   원인: 기존엔 단순히 "틀린 학생 수" 또는 "비율"만 봐서 1-2명 틀린 문제도 Top 진입
      //   수정: ① 응시 인원 5명 미만이면 Top 후보에서 제외 (통계 무의미)
      //         ② 가중 점수 = (틀린 비율) × log(응시인원+1) × 10  ← 응시자 많을수록 우대
      //         ③ Top 5 → Top 7
      var hardestRaw = Object.keys(g.wrongByQ).map(function(q){
        var wrong = g.wrongByQ[q];
        var pct = Math.round((wrong / total) * 100);
        var weightedScore = total >= 5
          ? (wrong / total) * Math.log(total + 1) * 10
          : 0;  // 5명 미만은 가중치 0 → 자동 제외
        return {q: Number(q), wrong: wrong, pct: pct, _score: weightedScore};
      });
      // 5명 미만 응시 시험은 어려운 문항 의미 X → 빈 배열
      var hardest = total >= 5
        ? hardestRaw.filter(function(h){return h._score > 0;})
                    .sort(function(a,b){ return b._score - a._score; })
                    .slice(0, 7)
                    .map(function(h){ return {q: h.q, wrong: h.wrong, pct: h.pct}; })
        : [];
      // 만점자 / 미달자 (70점 미만 — 프론트에서 70 기본값 사용)
      var perfectCount = g.students.filter(function(s){return s.score===100;}).length;
      var lowCount = g.students.filter(function(s){return s.score<70;}).length;
      // ★ v20.5: classKey — 같은 반(과목+학년+레벨+시험명+선생님)을 다른 날짜 카드끼리
      //   묶을 때 사용 (기간 모드의 학생×날짜 매트릭스용). 시험명은 차수 태그 제거.
      var classKey = g.subject+"|"+g.grade+"|"+g.level+"|"+_normExamName(g.examType)+"|"+(g.teacher||"");
      classes.push({
        classKey: classKey,
        subject: g.subject, grade: g.grade, level: g.level, examType: g.examType,
        date: g.date, teacher: g.teacher,
        folderId: g.folderId,  // ★ v22.8: 시험지/답지 파일 다운로드용
        total: total, avg: avg, max: max, min: min,
        perfectCount: perfectCount, lowCount: lowCount,
        students: g.students,
        hardest: hardest
      });
    });

    // 반 정렬: 과목 > 학년 > 선생님 > 레벨 > 시험명 > 날짜
    var subjOrder = {"국어":1,"영어":2,"수학":3,"과학":4,"사회":5};
    classes.sort(function(a,b){
      var aS = subjOrder[a.subject] || 99;
      var bS = subjOrder[b.subject] || 99;
      if (aS !== bS) return aS - bS;
      if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
      if (a.grade !== b.grade) return a.grade < b.grade ? -1 : 1;
      var aT = a.teacher||"", bT = b.teacher||"";
      if (aT !== bT) return aT < bT ? -1 : 1;
      if (a.level !== b.level) return a.level < b.level ? -1 : 1;
      if (a.examType !== b.examType) return a.examType < b.examType ? -1 : 1;
      return a.date < b.date ? -1 : 1;
    });
    // ★ v20.5: 모드 표시 — single(단일 날짜) / range(기간) — 프론트가 응답 형태 분기용
    var mode = (ndFrom || ndTo) ? "range" : "single";
    var _respJson = JSON.stringify({result:"ok", mode: mode, date: qDate, dateFrom: qDateFrom, dateTo: qDateTo, teacher: qTeacher, subject: qSubject, classes: classes});
    // ★ v26.0: 응답 5분 캐싱 — 다음 호출은 0.1초 이내
    try { _cgCache.put(_cgKey, _respJson, 300); } catch(_ePut) {}
    return ContentService.createTextOutput(_respJson).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return jsonOut_({result:"error", message: String(err), classes: []});
  }
}
// ★ v26.0 (2026-05-13): 빈 폴더 자동 청소 (Drive 정리)
//   사용 사례: 유리쌤 5/15 중3 같이 폴더만 만들어지고 파일 업로드 실패한 경우
//   사용법: GAS 에디터 → cleanEmptyExamFolders → ▶ 실행
//   동작:
//     1) 채움학원 시험자료/<날짜>/<선생님>/<시험폴더>/ 구조 순회
//     2) 시험정보.txt 외에 파일 없음 + 생성 1시간 이상 → 휴지통 이동
//     3) Slack 알림 (목록)
function cleanEmptyExamFolders() {
  try {
    var roots = DriveApp.getFoldersByName("채움학원 시험자료");
    if (!roots.hasNext()) return;
    var root = roots.next();
    var oneHourAgo = Date.now() - 60*60*1000;
    var trashed = [];
    var dateFolders = root.getFolders();
    while (dateFolders.hasNext()) {
      var df = dateFolders.next();
      // 날짜 폴더만 (yyyy.MM.dd 패턴)
      if (!/^\d{4}\.\d{2}\.\d{2}$/.test(df.getName())) continue;
      var teachers = df.getFolders();
      while (teachers.hasNext()) {
        var tf = teachers.next();
        var exams = tf.getFolders();
        while (exams.hasNext()) {
          var ef = exams.next();
          var created = ef.getDateCreated().getTime();
          if (created > oneHourAgo) continue;  // 1시간 미만이면 skip (아직 업로드 중일 수 있음)
          // 파일 개수 세기 (시험정보.txt 제외)
          var fileCount = 0;
          var ff = ef.getFiles();
          while (ff.hasNext()) {
            var f = ff.next();
            if (f.getName() === "시험정보.txt") continue;
            if (f.getName() === "desktop.ini") continue;
            fileCount++;
            if (fileCount >= 1) break;
          }
          if (fileCount === 0) {
            // 빈 폴더 → 휴지통
            try {
              var path = df.getName() + "/" + tf.getName() + "/" + ef.getName();
              ef.setTrashed(true);
              trashed.push(path);
            } catch(_eT) {}
          }
        }
      }
    }
    var msg = "✅ 빈 폴더 청소 완료\n\n· 휴지통 이동: " + trashed.length + "개\n\n" + trashed.slice(0, 20).join("\n");
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert(msg); } catch(_e) {}
    if (trashed.length > 0) {
      try { slackSend_("🧹 *빈 시험 폴더 자동 청소* — " + trashed.length + "개\n" + trashed.slice(0, 10).join("\n")); } catch(_sE){}
    }
    return { trashed: trashed.length };
  } catch (err) {
    Logger.log("[cleanEmptyExamFolders] 오류: " + err);
  }
}

// ★ v26.0: class_grades 캐시 무효화 헬퍼 (시험 등록·정답 수정 시 호출)
// ★ v27.17 (2026-05-30): 버전 방식으로 재작성.
//   기존: "cg_<date>|||||" 같은 키를 지웠으나 실제 키는 "cg_<버전>_<date>|||||선생님||F" 형식이라
//          한 번도 무효화되지 않아, 정답 수정/재채점 후에도 최대 5분간 옛 점수가 표시됐음.
//   해결: 전역 버전 카운터를 올리면 이전 버전 키는 전부 캐시 미스 → 즉시 재계산.
function _cgCacheVer_() {
  try {
    var cs = CacheService.getScriptCache();
    var v = cs.get("cg_ver");
    if (!v) { v = "1"; cs.put("cg_ver", v, 21600); }  // 6시간 TTL
    return v;
  } catch(_e) { return "1"; }
}
function clearClassGradesCache_() {
  try {
    var cs = CacheService.getScriptCache();
    var v = Number(cs.get("cg_ver")) || 1;
    cs.put("cg_ver", String(v + 1), 21600);  // 버전 +1 → 이전 cg_ 캐시 전부 무효
  } catch(_e) {}
}

// ★ v22.8: 폴더 내 시험지/답지 파일 목록 (반별 성적에서 다운로드/미리보기용)
// ★ v22.9: 서브폴더 1단계 깊이까지 스캔 + 파일 확장자 확대 + 에러 메시지 개선
// ★ v23.5: folderId 콜론 포함(:) 옛 형식도 지원 + 빈 폴더도 result:"ok" 반환
// 사용: ?action=list_folder_files&folderId=XYZ
// 반환: { result, files: [{id, name, kind:"exam"|"answer", size}], folderName, scanned }
function listFolderFiles_(e) {
  try {
    var folderId = String(e.parameter.folderId || "").trim();
    if (!folderId) return jsonOut_({result:"error", message:"folderId 필요"});
    // ★ v23.5: 옛 형식 "파일ID:세트번호" 처리 — 콜론 앞부분만 사용
    if (folderId.indexOf(":") >= 0) folderId = folderId.split(":")[0];
    var folder;
    try { folder = DriveApp.getFolderById(folderId); }
    catch(fe) {
      // 폴더가 아닌 파일ID 일 수도 있음 → 빈 결과 반환 (에러 X)
      return jsonOut_({result:"ok", folderId:folderId, folderName:"(접근 불가)", scanned:0, files:[], note:"폴더 접근 실패: "+String(fe)});
    }

    var files = [];
    var seen = {};
    var scanned = 0;

    // 파일 1개 처리 (필터 + 분류 + 중복제거)
    function processFile(f) {
      scanned++;
      var fid = f.getId();
      if (seen[fid]) return;
      var fn = f.getName();
      var lname = fn.toLowerCase();
      // 시스템 파일 제외
      if (lname.indexOf("정답.json") !== -1) return;
      if (lname.indexOf("정답_처리완료") !== -1) return;
      if (fn === "시험정보.txt") return;
      // 다운로드 가능한 형식만 (★ v22.9: xls, pptx, txt 추가)
      var ext = lname.match(/\.(pdf|docx?|hwpx?|jpe?g|png|gif|webp|zip|xlsx?|pptx?|txt)$/);
      if (!ext) return;
      // 시험지/답지 분류
      var isAnswer = /(정답|답지|답안|해설|풀이)/.test(fn) || /(answer|solution|key)/i.test(lname);
      seen[fid] = true;
      files.push({
        id: fid,
        name: fn,
        size: f.getSize(),
        kind: isAnswer ? "answer" : "exam"
      });
    }

    // 1단계: 본 폴더의 파일들
    var ff = folder.getFiles();
    while (ff.hasNext()) processFile(ff.next());

    // 2단계: 서브폴더의 파일들 (1단계 깊이만)
    try {
      var subs = folder.getFolders();
      while (subs.hasNext()) {
        var sub = subs.next();
        try {
          var sff = sub.getFiles();
          while (sff.hasNext()) processFile(sff.next());
        } catch(eSub) { /* 한 서브폴더 실패는 무시 */ }
      }
    } catch(eSubs) { /* 서브폴더 열거 실패 시 본 폴더만 사용 */ }

    return jsonOut_({
      result: "ok",
      folderId: folderId,
      folderName: folder.getName(),
      scanned: scanned,
      files: files
    });
  } catch(err) {
    return jsonOut_({result:"error", message: "listFolderFiles_ 오류: "+String(err)});
  }
}

// ★ v23.1: 정답 조회 — 대시보드의 "정답 보기" 버튼용 (관리자/선생님 확인용)
// 사용: ?action=view_answer_key&folderId=XYZ  또는  ?action=view_answer_key&subject=영어&grade=중1&level=A&examType=문제생성기
// 반환: { result, totalQ, answers:{1:"3",...}, types:{1:"obj","31":"sub",...}, meta:{subject,grade,level,examType,teacher,date,setLabel} }
function viewAnswerKey_(e) {
  try {
    // ★ v23.5: 정답 데이터 캐싱 (60초) — folderId 매칭 시 즉시 반환
    var _qFid = String(e.parameter.folderId||"").trim();
    if (_qFid) {
      var _cache = CacheService.getScriptCache();
      var _cKey = "ans_" + _qFid;
      var _hit = _cache.get(_cKey);
      if (_hit) {
        try { return ContentService.createTextOutput(_hit).setMimeType(ContentService.MimeType.JSON); }
        catch(_eC) {}
      }
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ansSh = ss.getSheetByName("정답목록");
    if (!ansSh || ansSh.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 비어있음"});
    var rows = ansSh.getDataRange().getValues();
    var qFolderId = String(e.parameter.folderId||"").trim();
    var qSubj = String(e.parameter.subject||"").trim();
    var qGr = String(e.parameter.grade||"").trim();
    var qLv = String(e.parameter.level||"").trim();
    var qEx = String(e.parameter.examType||"").trim();
    var qDate = String(e.parameter.date||"").trim();
    var qTeacher = String(e.parameter.teacher||"").trim();
    var qSet = normalizeSetType_(e.parameter.setType || e.parameter.round || "");
    var qClassName = String(e.parameter.className||"").replace(/\s+/g, "");
    // ★ v23.5: 시험명 정규화 — 차수 태그 제거 + "시험" 일반화 매칭
    function _normEx(s){
      var v = String(s||"").trim();
      var tagRe = /\s*\(\s*(?:[1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/;
      while (tagRe.test(v)) v = v.replace(tagRe, "").trim();
      return v;
    }
    var qExN = _normEx(qEx);
    if (!qSet && qEx) {
      var _setMatch = qEx.match(/\(\s*([1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/);
      if (_setMatch) qSet = normalizeSetType_(_setMatch[1]);
    }
    function _answerMatchSig_(row) {
      return [
        String(row[6]||"").trim(),
        String(row[7]||"").trim(),
        String(row[8]||"").trim(),
        String(row[5]||"").trim()
      ].join("||");
    }
    function _answerMatchPreview_(row) {
      return {
        row: row._rowNum || "",
        teacher: String(row[9]||""),
        className: String(row[11]||""),
        examType: String(row[4]||""),
        setType: String(row[5]||""),
        date: String(row[12]||""),
        folderId: String(row[13]||"")
      };
    }
    function _pickAnswerMatch_(matches, stage) {
      if (!matches || matches.length === 0) return {row:null};
      var cands = matches.slice();
      if (qClassName) {
        var exactClass = cands.filter(function(row){
          return String(row[11]||"").replace(/\s+/g, "") === qClassName;
        });
        if (exactClass.length > 0) cands = exactClass;
      }
      if (qExN) {
        var exactExam = cands.filter(function(row){ return _normEx(row[4]) === qExN; });
        if (exactExam.length > 0) cands = exactExam;
      }
      var withFolder = cands.filter(function(row){ return String(row[13]||"").trim(); });
      if (withFolder.length > 0) cands = withFolder;
      if (cands.length <= 1) return {row:cands[0] || null};

      var firstFolder = String(cands[0][13]||"").trim();
      var sameFolder = firstFolder && cands.every(function(row){
        return String(row[13]||"").trim() === firstFolder;
      });
      if (sameFolder) return {row:cands[0]};

      var sig0 = _answerMatchSig_(cands[0]);
      var hasDifferentAnswer = cands.some(function(row){ return _answerMatchSig_(row) !== sig0; });
      if (hasDifferentAnswer) {
        return {
          ambiguous: true,
          stage: stage,
          count: cands.length,
          candidates: cands.slice(0, 5).map(_answerMatchPreview_)
        };
      }
      return {row:cands[0]};
    }
    function _ambiguousAnswerKeyOut_(picked) {
      return jsonOut_({
        result: "error",
        status: "ambiguous_answer_key",
        message: "정답 후보가 여러 개라 자동 선택을 중단했습니다. 틀린 정답 노출을 막기 위한 안전장치입니다.\nfolderId 또는 선생님·반·차수·날짜 조건을 확인해주세요.",
        matchStage: picked.stage || "",
        candidateCount: picked.count || 0,
        candidates: picked.candidates || []
      });
    }
    var matched = null;
    // 1순위: folderId 정확 매칭
    if (qFolderId) {
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][13]||"").trim() === qFolderId) { rows[i]._rowNum = i + 1; matched = rows[i]; break; }
      }
    }
    // 2순위: 과목·학년·레벨·시험명(정규화) 매칭 — ★ v23.6: folderId 있는 행 우선
    //   모든 매칭 행을 수집한 뒤, folderId 가 있는 행을 먼저 선택. 없으면 최신 행.
    if (!matched && qSubj && qGr) {
      var l2Matches = [];
      for (var j = rows.length - 1; j >= 1; j--) {
        var r = rows[j];
        if (String(r[1]||"").trim() !== qSubj) continue;
        if (String(r[2]||"").trim() !== qGr) continue;
        if (qLv && String(r[3]||"").trim() !== qLv && String(r[3]||"").trim() !== "전체" && qLv !== "전체") continue;
        if (qExN) {
          var rExN = _normEx(r[4]);
          if (rExN !== qExN && rExN.indexOf(qExN) === -1 && qExN.indexOf(rExN) === -1) continue;
        }
        if (qSet && String(r[5]||"").trim() !== qSet) continue;
        if (qClassName) {
          var rowClassName = String(r[11]||"").replace(/\s+/g, "");
          if (rowClassName && rowClassName !== qClassName) continue;
        }
        if (qDate) {
          var rd = String(r[12]||"").replace(/-/g,".");
          var qd = qDate.replace(/-/g,".");
          if (rd.indexOf(qd) === -1) continue;
        }
        if (qTeacher && String(r[9]||"").trim() !== qTeacher) continue;
        r._rowNum = j + 1;
        l2Matches.push(r);
      }
      var l2Picked = _pickAnswerMatch_(l2Matches, "metadata");
      if (l2Picked.ambiguous) return _ambiguousAnswerKeyOut_(l2Picked);
      matched = l2Picked.row;
    }
    // 3순위: 시험명·날짜만 매칭 — ★ v23.6: folderId 있는 행 우선
    if (!matched && qExN && qDate) {
      var l3Matches = [];
      for (var k = rows.length - 1; k >= 1; k--) {
        var rk = rows[k];
        if (_normEx(rk[4]) !== qExN) continue;
        if (qSet && String(rk[5]||"").trim() !== qSet) continue;
        if (qClassName) {
          var rowClassName3 = String(rk[11]||"").replace(/\s+/g, "");
          if (rowClassName3 && rowClassName3 !== qClassName) continue;
        }
        var rkd = String(rk[12]||"").replace(/-/g,".");
        if (rkd.indexOf(qDate.replace(/-/g,".")) === -1) continue;
        rk._rowNum = k + 1;
        l3Matches.push(rk);
      }
      var l3Picked = _pickAnswerMatch_(l3Matches, "exam_date");
      if (l3Picked.ambiguous) return _ambiguousAnswerKeyOut_(l3Picked);
      matched = l3Picked.row;
    }
    // ★ v23.6: 최종 fallback — 업로드기록 조회로 "AI 검수 대기 중" 안내
    if (!matched) {
      try {
        var _upSh2 = ss.getSheetByName("업로드기록");
        if (_upSh2 && _upSh2.getLastRow() > 1 && qSubj && qGr) {
          var _upRows2 = _upSh2.getDataRange().getValues();
          for (var _ui = _upRows2.length - 1; _ui >= 1; _ui--) {
            var _ur = _upRows2[_ui];
            if (String(_ur[1]||"").trim() !== qSubj) continue;
            if (String(_ur[2]||"").trim() !== qGr) continue;
            if (qLv && String(_ur[3]||"").trim() !== qLv) continue;
            if (qExN && _normEx(_ur[5]) !== qExN) continue;
            if (qSet && String(_ur[15]||"").trim() !== qSet) continue;
            if (qClassName && String(_ur[4]||"").replace(/\s+/g, "") !== qClassName) continue;
            if (qDate) {
              var _urDate = String(_ur[6]||"").replace(/-/g, ".");
              var _qDateN = qDate.replace(/-/g, ".");
              if (_urDate.indexOf(_qDateN) === -1) continue;
            }
            if (qTeacher && String(_ur[12]||"").trim() !== qTeacher) continue;
            // 매칭됨 — 검수 대기 안내
            return jsonOut_({
              result: "error",
              message: "AI 검수 대기 중입니다. 답지 자동 분석이 끝나면 정답이 표시됩니다.\n(업로드 직후라면 1~5분 기다린 후 새로고침 해주세요)",
              status: "pending_extract",
              uploadStatus: String(_ur[11]||"")
            });
          }
        }
      } catch(_uErr) {}
      return jsonOut_({result:"error", message:"해당 정답을 찾을 수 없습니다.\n\n원인: 정답목록 시트에 일치하는 행이 없음.\n시험 등록(또는 답지 업로드)이 완료되었는지 확인해주세요."});
    }
    var answers = {}, types = {};
    try { answers = matched[7] ? (typeof matched[7]==="object" ? matched[7] : JSON.parse(matched[7])) : {}; } catch(eA){ answers = {}; }
    try { types = matched[8] ? (typeof matched[8]==="object" ? matched[8] : JSON.parse(matched[8])) : {}; } catch(eT){ types = {}; }
    // ★ v23.6: 매칭된 행의 폴더ID 가 비어있으면 업로드기록에서 자동 backfill
    var resolvedFid = String(matched[13]||"").trim();
    if (!resolvedFid) {
      try {
        var _upBf = ss.getSheetByName("업로드기록");
        if (_upBf && _upBf.getLastRow() > 1) {
          var _bfRows = _upBf.getDataRange().getValues();
          var _mSubj = String(matched[1]||"").trim();
          var _mGr = String(matched[2]||"").trim();
          var _mLv = String(matched[3]||"").trim();
          var _mExN = _normEx(matched[4]);
          var _mTc = String(matched[9]||"").trim();
          var _mSet = String(matched[5]||"").trim();
          var _mClass = String(matched[11]||"").replace(/\s+/g, "");
          var _mDate = String(matched[12]||"").replace(/-/g, ".");
          function _normDateLoose_(v) {
            if (!v) return "";
            if (v instanceof Date) return Utilities.formatDate(v, "Asia/Seoul", "yyyy.MM.dd");
            var s = String(v).trim().replace(/-/g, ".");
            var m = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
            if (!m) return s;
            return m[1] + "." + ("0"+m[2]).slice(-2) + "." + ("0"+m[3]).slice(-2);
          }
          for (var _bi = _bfRows.length - 1; _bi >= 1; _bi--) {
            var _br = _bfRows[_bi];
            if (String(_br[1]||"").trim() !== _mSubj) continue;
            if (String(_br[2]||"").trim() !== _mGr) continue;
            if (_mLv && String(_br[3]||"").trim() !== _mLv) continue;
            if (_mClass && String(_br[4]||"").replace(/\s+/g, "") !== _mClass) continue;
            if (_mExN && _normEx(_br[5]) !== _mExN) continue;
            if (_mSet && String(_br[15]||"").trim() !== _mSet) continue;
            if (_mDate) {
              var _brDate = _normDateLoose_(_br[6]);
              var _mDateN = _normDateLoose_(_mDate);
              if (_brDate && _mDateN && _brDate.indexOf(_mDateN) === -1 && _mDateN.indexOf(_brDate) === -1) continue;
            }
            if (_mTc && String(_br[12]||"").trim() !== _mTc) continue;
            var _bfLink = String(_br[10]||"");
            var _bfMatch = _bfLink.match(/folders\/([^\/\?&]+)/);
            if (_bfMatch) {
              resolvedFid = _bfMatch[1];
              // 정답목록에 영구 저장 (다음부터는 lookup 불필요)
              try { ansSh.getRange(matched._rowNum||0, 14).setValue(resolvedFid); } catch(_setIgn){}
              break;
            }
          }
        }
      } catch(_bfErr){}
    }
    // ★ v24.10: 오답분석JSON (T열, 인덱스 19) — 객관식 choiceExplanations + 주관식 gradingGuide
    var _explanations = null;
    try {
      var _explRaw = String(matched[19] || "").trim();
      if (_explRaw) _explanations = JSON.parse(_explRaw);
    } catch(_eEx) { _explanations = null; }
    // ★ v25.4: 카테고리JSON (U열, 인덱스 20) — 영역별 정답률 그래프용
    var _categories = null;
    try {
      var _catRaw = String(matched[20] || "").trim();
      if (_catRaw) _categories = JSON.parse(_catRaw);
    } catch(_eCat) { _categories = null; }

    var _result = {
      result: "ok",
      totalQ: Number(matched[6]) || 0,
      answers: answers,
      types: types,
      explanations: _explanations,  // ★ v24.10: 학생앱 채점 결과 화면용
      categories: _categories,       // ★ v25.4: 영역별 정답률용 (문법/어휘/독해)
      meta: {
        subject: matched[1]||"", grade: matched[2]||"", level: matched[3]||"",
        examType: matched[4]||"", setLabel: matched[5]||"",
        teacher: matched[9]||"", studentCount: Number(matched[10])||0,
        className: matched[11]||"", date: matched[12]||"",
        folderId: resolvedFid, startNumber: Number(matched[14])||1
      }
    };
    var _resultJson = JSON.stringify(_result);
    // ★ v23.5: 60초 캐시 (update_answer_key 호출 시 무효화됨)
    try {
      if (matched[13]) {
        CacheService.getScriptCache().put("ans_" + matched[13], _resultJson, 60);
      }
    } catch(_eP) {}
    return ContentService.createTextOutput(_resultJson).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return jsonOut_({result:"error", message: "viewAnswerKey_ 오류: "+String(err)});
  }
}

// ★ v23.2: 정답 수정 — 대시보드의 정답 보기 모달에서 수정 시
// 사용: POST 또는 GET ?action=update_answer_key&folderId=XYZ&answers=<json>&types=<json>
// answers/types 는 JSON 문자열 (예: '{"1":"3","2":"1",...}')
function _isSubjectiveRegradeType_(typ) {
  var t = String(typ || "obj").toLowerCase().trim();
  return t === "sub" || t === "sa" || t === "subj" || t === "subjective" || t === "essay";
}

function _normRegradeValue_(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(function(x){ return String(x == null ? "" : x).trim(); }).join("|");
  return String(v).trim();
}

function _subjectiveKeyChanged_(oldAns, oldTyp, oldTotalQ, nextAns, nextTyp, nextTotalQ) {
  var keys = {};
  var maxQ = Math.max(Number(oldTotalQ)||0, Number(nextTotalQ)||0);
  for (var i = 1; i <= maxQ; i++) keys[String(i)] = true;
  [oldAns, oldTyp, nextAns, nextTyp].forEach(function(obj){
    obj = obj || {};
    Object.keys(obj).forEach(function(k){ if (/^\d+$/.test(String(k))) keys[String(Number(k))] = true; });
  });
  return Object.keys(keys).some(function(k){
    var oldSub = _isSubjectiveRegradeType_((oldTyp||{})[k]);
    var nextSub = _isSubjectiveRegradeType_((nextTyp||{})[k]);
    if (oldSub !== nextSub) return true;
    if (!oldSub && !nextSub) return false;
    return _normRegradeValue_((oldAns||{})[k]) !== _normRegradeValue_((nextAns||{})[k]);
  });
}

function _subjectiveDetailsMap_(primaryRaw, fallbackRaw) {
  var parsed = [];
  [primaryRaw, fallbackRaw].some(function(raw){
    if (raw === "" || raw === null || raw === undefined) return false;
    try {
      var v = JSON.parse(raw);
      if (Array.isArray(v)) { parsed = v; return true; }
    } catch(_e) {}
    return false;
  });
  var map = {};
  parsed.forEach(function(d){
    var q = Number(d && d.q);
    if (!isNaN(q) && q > 0) map[q] = d;
  });
  return {map: map, count: parsed.length};
}

function _weightedRegradeScore_(correctCnt, totalObj, subScoreSum, subCount) {
  totalObj = Number(totalObj) || 0;
  subCount = Number(subCount) || 0;
  correctCnt = Number(correctCnt) || 0;
  subScoreSum = Number(subScoreSum) || 0;
  if (totalObj <= 0 && subCount <= 0) return 0;
  if (subCount <= 0) return totalObj > 0 ? Math.round(correctCnt / totalObj * 100) : 0;
  var subWeight = (totalObj > 0 && subCount > 0) ? 1.5 : 1.0;
  var totalPossible = totalObj + subCount * subWeight;
  var objMax = totalPossible > 0 ? Math.round((totalObj / totalPossible) * 100) : 0;
  var subMax = totalPossible > 0 ? (100 - objMax) : 0;
  var objEarned = totalObj > 0 ? Math.round((correctCnt / totalObj) * objMax) : 0;
  var subEarned = subCount > 0 ? Math.round((subScoreSum / subCount) * subMax) : 0;
  return objEarned + subEarned;
}

function updateAnswerKey_(e) {
  try {
    var folderId = String(e.parameter.folderId||"").trim();
    if (!folderId) return jsonOut_({result:"error", message:"folderId 필요"});
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ansSh = ss.getSheetByName("정답목록");
    if (!ansSh || ansSh.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 비어있음"});
    var rows = ansSh.getDataRange().getValues();
    var rowIdx = -1;
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][13]||"").trim() === folderId) { rowIdx = i + 1; break; } // 1-based
    }
    if (rowIdx < 0) return jsonOut_({result:"error", message:"해당 정답 행을 찾을 수 없음"});
    var oldRow = rows[rowIdx - 1];
    var oldAns = normalizeAnswerData(oldRow[7] || "{}");
    var oldTyp = normalizeAnswerData(oldRow[8] || "{}");
    var oldTotalQ = Number(oldRow[6]) || 0;
    var nextAns = oldAns;
    var nextTyp = oldTyp;
    var nextTotalQ = oldTotalQ;
    // answers / types 파싱 + 정규화
    var newAns = {}, newTyp = {};
    if (e.parameter.answers) {
      try { newAns = JSON.parse(e.parameter.answers); } catch(eA){ return jsonOut_({result:"error", message:"answers JSON 파싱 실패: "+eA}); }
      newAns = normalizeAnswerData(newAns);
      nextAns = newAns;
      ansSh.getRange(rowIdx, 8).setValue(JSON.stringify(newAns)); // H열
    }
    if (e.parameter.types) {
      try { newTyp = JSON.parse(e.parameter.types); } catch(eT){ return jsonOut_({result:"error", message:"types JSON 파싱 실패: "+eT}); }
      newTyp = normalizeAnswerData(newTyp);
      nextTyp = newTyp;
      ansSh.getRange(rowIdx, 9).setValue(JSON.stringify(newTyp)); // I열
    }
    if (e.parameter.answers || e.parameter.types) {
      nextAns = _normalizeObjectiveAnswersByType_(nextAns, nextTyp);
      ansSh.getRange(rowIdx, 8).setValue(JSON.stringify(nextAns)); // H열
    }
    // 문항수도 옵션으로 갱신
    if (e.parameter.totalQ) {
      var tq = parseInt(e.parameter.totalQ, 10);
      if (tq > 0) {
        nextTotalQ = tq;
        ansSh.getRange(rowIdx, 7).setValue(tq); // G열
      }
    }
    // ★ v23.5: 정답 수정 시 자동 재채점 — 학생 답안 즉시 갱신
    //   학생앱은 GAS의 정답목록을 항상 실시간 조회하므로 자동 동기화됨
    //   ★ v27.22 (2026-05-30): 주관식 정답/유형이 바뀐 경우에는 기존 R열 AI 채점상세를 비우고 재채점 필요로 표시
    // 캐시 무효화 — 다음 view_answer_key + 대시보드 호출이 새 데이터 가져오도록
    try {
      var _ck = CacheService.getScriptCache();
      _ck.remove("ans_" + folderId);
      // ★ v23.6: 대시보드 응답 캐시는 키가 date+teacher 조합이라 특정 키 찾기 어려움 → 미러스캔 타임스탬프 제거로 강제 재계산 유도
      _ck.remove("last_mirror_scan");
      // 폴더 파일 목록 캐시도 무효화 (시험지/답지 변경 가능성)
      _ck.remove("fld_" + folderId);
    } catch(_eRc) {}
    var regradeResult = {regraded: 0, subjectNeedsAI: 0, subjectiveInvalidated: 0, subjectiveDetailsMissing: 0};
    // ★ v27.21 (2026-05-30): 주관식 정답/유형이 실제로 바뀐 경우에만 기존 R열 AI 채점상세를 무효화
    var invalidateSubjectiveDetails = _subjectiveKeyChanged_(oldAns, oldTyp, oldTotalQ, nextAns, nextTyp, nextTotalQ);
    try {
      regradeResult = _autoRegradeAfterUpdate_(folderId, invalidateSubjectiveDetails);
    } catch(eRegrade) {
      Logger.log("[updateAnswerKey_] 자동 재채점 실패: " + eRegrade);
    }
    // ★ v27.17 (2026-05-30): 정답 수정+재채점 후 반별성적 캐시 무효화 → 수정된 점수 즉시 반영
    clearClassGradesCache_();
    // ★ v27.22 (2026-05-30): 보장되지 않은 예약 자동 반영 안내 대신, 실제 재채점 필요 건수를 명시
    var subjectiveRegradeRequired = Math.max(regradeResult.subjectiveInvalidated || 0, regradeResult.subjectiveDetailsMissing || 0);
    var resultMessage = "정답 수정 완료 · " + regradeResult.regraded + "명 자동 재채점";
    if (subjectiveRegradeRequired > 0) resultMessage += " · 주관식 재채점 필요 " + subjectiveRegradeRequired + "건";
    return jsonOut_({
      result:"ok", rowIndex: rowIdx,
      message: resultMessage,
      regraded: regradeResult.regraded,
      subjectNeedsAI: regradeResult.subjectNeedsAI,
      subjectiveInvalidated: regradeResult.subjectiveInvalidated || 0,
      subjectiveDetailsMissing: regradeResult.subjectiveDetailsMissing || 0,
      subjectiveRegradeRequired: subjectiveRegradeRequired,
      needsSubjectiveRegrade: subjectiveRegradeRequired > 0
    });
  } catch(err) {
    return jsonOut_({result:"error", message: "updateAnswerKey_ 오류: "+String(err)});
  }
}

// ★ v23.6: 정답 수정 직후 학생답안 자동 재채점 (내부 호출용)
// 수정사항:
//   1) 컬럼 쓰기 버그 픽스 — 점수(J=10)/정답수(K=11)/오답수(L=12)/총채점(M=13)/틀린문항(N=14) 전체 갱신
//   2) setType 매칭 추가 — 같은 examType의 다른 세트(A/B/C) 학생을 잘못 재채점하지 않도록
//   3) 시험날짜 매칭 추가 — 다른 날짜에 같은 시험명을 본 학생까지 영향 주지 않도록
function _autoRegradeAfterUpdate_(folderId, invalidateSubjectiveDetails) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aSh = ss.getSheetByName("정답목록");
  if (!aSh || aSh.getLastRow() <= 1) return {regraded:0, subjectNeedsAI:0, subjectiveInvalidated:0, subjectiveDetailsMissing:0};
  var aRows = aSh.getDataRange().getValues();
  var matched = null;
  for (var i = aRows.length - 1; i >= 1; i--) {
    if (String(aRows[i][13]||"").trim() === folderId) { matched = aRows[i]; break; }
  }
  if (!matched) return {regraded:0, subjectNeedsAI:0, subjectiveInvalidated:0, subjectiveDetailsMissing:0};

  var subject  = String(matched[1]||"").trim();
  var grade    = String(matched[2]||"").trim();
  var level    = String(matched[3]||"").trim();
  var examType = String(matched[4]||"").trim();
  var setLabel = String(matched[5]||"").trim();        // ★ v23.6: 세트A/세트B/이론편 등
  var totalQ   = Number(matched[6])||0;
  var examDate = String(matched[12]||"").trim();       // ★ v23.6: 시험날짜
  var answerKey = {}, typesMap = {};
  try { answerKey = JSON.parse(matched[7] || "{}"); } catch(er){}
  try { typesMap = JSON.parse(matched[8] || "{}"); } catch(er){}
  if (!answerKey || Object.keys(answerKey).length === 0) return {regraded:0, subjectNeedsAI:0, subjectiveInvalidated:0, subjectiveDetailsMissing:0};

  function normTok(s){
    if (s === null || s === undefined) return "";
    var v = String(s).trim();
    if (!v) return "";
    v = v.replace(/[①②③④⑤]/g, function(c){ return ({"①":"1","②":"2","③":"3","④":"4","⑤":"5"})[c] || c; });
    v = v.replace(/\s+/g,"").replace(/[,;\/]/g,",");
    if (v.indexOf(",") >= 0) v = v.split(",").filter(Boolean).sort().join(",");
    return v.toLowerCase();
  }
  // ★ v23.6: 날짜 정규화 (yyyy-MM-dd / yyyy.MM.dd / Date 객체 모두 동일하게 비교)
  function normDate(v){
    if (v === null || v === undefined || v === "") return "";
    if (v instanceof Date) {
      var tz = Session.getScriptTimeZone() || "Asia/Seoul";
      return Utilities.formatDate(v, tz, "yyyy-MM-dd");
    }
    var s = String(v).trim();
    var m = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
    if (!m) return s;
    return m[1] + "-" + ("0"+m[2]).slice(-2) + "-" + ("0"+m[3]).slice(-2);
  }
  var examDateN = normDate(examDate);

  var sSheet = ss.getSheetByName("학생답안기록");
  if (!sSheet || sSheet.getLastRow() <= 1) return {regraded:0, subjectNeedsAI:0, subjectiveInvalidated:0, subjectiveDetailsMissing:0};
  var sRows = sSheet.getDataRange().getValues();
  var regraded = 0, subjectNeedsAI = 0, subjectiveInvalidated = 0, subjectiveDetailsMissing = 0;
  for (var ri = 1; ri < sRows.length; ri++) {
    var r = sRows[ri];
    if (String(r[4]||"").trim() !== subject) continue;
    if (String(r[5]||"").trim() !== grade) continue;
    if (String(r[6]||"").trim() !== level && r[6] !== "전체" && level !== "전체") continue;
    var exNm = String(r[7]||"").trim();
    if (exNm.indexOf(examType) === -1 && examType.indexOf(exNm) === -1) continue;
    // ★ v23.6: 세트 매칭 — 학생앱은 examName 을 "<examType> (<setLabel>)" 형태로 저장
    //   학생이 A세트 본 행에 B세트 정답을 적용하면 안 됨
    if (setLabel && exNm.indexOf(setLabel) === -1) continue;
    // ★ v23.6: 날짜 매칭 — 다른 날짜에 같은 시험명을 본 학생까지 갱신되면 안 됨
    if (examDateN) {
      var rDateN = normDate(r[8]);
      if (rDateN && rDateN !== examDateN) continue;
    }
    var studentAns = null;
    try { studentAns = JSON.parse(r[14] || "null"); } catch(er){}
    if (!studentAns) continue;
    var subDetails = invalidateSubjectiveDetails ? {map:{}, count:0} : _subjectiveDetailsMap_(r[17], r[15]);
    var correctCnt = 0, totalObj = 0, wrongQs = [], subCount = 0, subScoreSum = 0, subCorrectCnt = 0, subWrongCnt = 0, subDetailCount = 0;
    var startNum = Number(matched[14]) || 1;
    for (var qi = 0; qi < totalQ; qi++) {
      // ★ v27.17 (2026-05-30): 정답키는 항상 1-base 저장 → startNumber 오프셋 제거(점수 뒤섞임 픽스)
      var qNum = String(qi + 1);
      var typ = String(typesMap[qNum] || "obj").toLowerCase();
      var corr = answerKey[qNum];
      if (_isSubjectiveRegradeType_(typ)) {
        subCount++;
        var sd = subDetails.map[parseInt(qNum, 10)];
        if (sd && sd.score !== undefined && sd.score !== null && sd.score !== "") {
          var sdScore = Math.max(0, Math.min(100, Number(sd.score) || 0));
          subScoreSum += sdScore / 100;
          subDetailCount++;
          if (sdScore >= 100) subCorrectCnt++;
          else { subWrongCnt++; wrongQs.push(parseInt(qNum,10)); }
        }
        continue;
      }
      totalObj++;
      var stu;
      if (Array.isArray(studentAns)) stu = studentAns[qi];
      else stu = studentAns[qNum] !== undefined ? studentAns[qNum] : studentAns[qi+1];
      var sn = normTok(stu), cn = normTok(corr);
      if (!sn || sn === "?" || !cn || sn !== cn) wrongQs.push(parseInt(qNum,10));
      else correctCnt++;
    }
    // ★ v27.21 (2026-05-30): 혼합형 재채점도 학생앱과 같은 가중치로 계산.
    //   기존 R열 주관식상세가 유효하면 보존해 반영하고, 주관식 정답/유형이 바뀐 경우에만 R열을 비움.
    // ★ v27.22 (2026-05-30): 주관식상세가 없으면 주관식을 0점처럼 반영하지 않고 기존 점수를 보존
    // ★ v27.23 (2026-05-30): 주관식상세가 부족하면 J~N 종합 컬럼도 덮어쓰지 않음(부분 재채점 값으로 오염 방지)
    var hasMissingSubDetails = subCount > subDetailCount;
    if (hasMissingSubDetails) {
      subjectiveDetailsMissing++;
      if (invalidateSubjectiveDetails && subCount > 0) {
        if (sSheet.getLastColumn() < 18) sSheet.getRange(1, 18).setValue("주관식상세");
        sSheet.getRange(ri+1, 18).clearContent();
        subjectiveInvalidated++;
      }
      if (subCount > 0) subjectNeedsAI++;
      continue;
    }
    var score = _weightedRegradeScore_(correctCnt, totalObj, subScoreSum, subCount);
    // ★ v23.6: 학생답안기록 컬럼 정확히 갱신
    //   J(10)=점수, K(11)=정답수, L(12)=오답수, M(13)=총채점, N(14)=틀린문항
    sSheet.getRange(ri+1, 10).setValue(score);
    sSheet.getRange(ri+1, 11).setValue(correctCnt + subCorrectCnt);
    sSheet.getRange(ri+1, 12).setValue(wrongQs.length);
    sSheet.getRange(ri+1, 13).setValue(totalObj + subDetailCount);
    sSheet.getRange(ri+1, 14).setValue(wrongQs.length > 0 ? wrongQs.join(", ") : "");
    regraded++;
    if (subCount > 0) subjectNeedsAI++;
  }
  return {regraded:regraded, subjectNeedsAI:subjectNeedsAI, subjectiveInvalidated:subjectiveInvalidated, subjectiveDetailsMissing:subjectiveDetailsMissing};
}

// ★ v23.6: 특정 시험 강제 재채점 — 정답 수정 직후 사용 (이미 채점된 학생도 다시 채점)
// 사용: ?action=force_regrade_by_folder&folderId=XYZ
// 반환: { result, regraded:N, message }
// 수정사항(v23.6):
//   1) 컬럼 쓰기 버그 픽스 — 점수/정답/오답/총채점/틀린문항 전체 컬럼 갱신
//   2) setType / 시험날짜 매칭 추가 — 다른 세트·다른 날짜에 잘못 적용되는 문제 차단
function forceRegradeByFolder_(e) {
  try {
    var folderId = String(e.parameter.folderId||"").trim();
    if (!folderId) return jsonOut_({result:"error", message:"folderId 필요"});
    var invalidateSubjectiveDetails = String(e.parameter.invalidateSubjective || "") === "1";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var aSh = ss.getSheetByName("정답목록");
    if (!aSh || aSh.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 비어있음"});
    var aRows = aSh.getDataRange().getValues();
    var matched = null;
    for (var i = aRows.length - 1; i >= 1; i--) {
      if (String(aRows[i][13]||"").trim() === folderId) { matched = aRows[i]; break; }
    }
    if (!matched) return jsonOut_({result:"error", message:"해당 정답 행을 찾을 수 없음"});

    var subject  = String(matched[1]||"").trim();
    var grade    = String(matched[2]||"").trim();
    var level    = String(matched[3]||"").trim();
    var examType = String(matched[4]||"").trim();
    var setLabel = String(matched[5]||"").trim();          // ★ v23.6
    var totalQ   = Number(matched[6])||0;
    var examDate = String(matched[12]||"").trim();          // ★ v23.6
    var answerKey = {}, typesMap = {};
    try { answerKey = JSON.parse(matched[7] || "{}"); } catch(er){ answerKey = {}; }
    try { typesMap = JSON.parse(matched[8] || "{}"); } catch(er){ typesMap = {}; }
    if (!answerKey || Object.keys(answerKey).length === 0) return jsonOut_({result:"error", message:"정답 데이터 없음"});

    // 정답 정규화 헬퍼 (객관식)
    function normTok(s){
      if (s === null || s === undefined) return "";
      var v = String(s).trim();
      if (!v) return "";
      v = v.replace(/[①②③④⑤]/g, function(c){ return ({"①":"1","②":"2","③":"3","④":"4","⑤":"5"})[c] || c; });
      v = v.replace(/\s+/g,"").replace(/[,;\/]/g,",");
      if (v.indexOf(",") >= 0) v = v.split(",").filter(Boolean).sort().join(",");
      return v.toLowerCase();
    }
    // 날짜 정규화 (yyyy-MM-dd 통일)
    function normDate(v){
      if (v === null || v === undefined || v === "") return "";
      if (v instanceof Date) {
        var tz = Session.getScriptTimeZone() || "Asia/Seoul";
        return Utilities.formatDate(v, tz, "yyyy-MM-dd");
      }
      var s = String(v).trim();
      var m = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
      if (!m) return s;
      return m[1] + "-" + ("0"+m[2]).slice(-2) + "-" + ("0"+m[3]).slice(-2);
    }
    var examDateN = normDate(examDate);

    var sSheet = ss.getSheetByName("학생답안기록");
    if (!sSheet || sSheet.getLastRow() <= 1) return jsonOut_({result:"ok", regraded:0, message:"학생 답안 없음"});
    var sRows = sSheet.getDataRange().getValues();
    var regraded = 0;
    var subjectNeedsAI = 0; // 주관식 포함 답안 수
    var subjectiveInvalidated = 0;
    var subjectiveDetailsMissing = 0;
    for (var ri = 1; ri < sRows.length; ri++) {
      var r = sRows[ri];
      if (String(r[4]||"").trim() !== subject) continue;
      if (String(r[5]||"").trim() !== grade) continue;
      // 레벨: 정확매칭 + "전체" 매칭
      if (String(r[6]||"").trim() !== level && r[6] !== "전체" && level !== "전체") continue;
      var exNm = String(r[7]||"").trim();
      if (exNm.indexOf(examType) === -1 && examType.indexOf(exNm) === -1) continue;
      // ★ v23.6: 세트 매칭 (세트A 정답을 세트B 본 학생에게 적용 X)
      if (setLabel && exNm.indexOf(setLabel) === -1) continue;
      // ★ v23.6: 날짜 매칭 (다른 날짜의 동명 시험과 분리)
      if (examDateN) {
        var rDateN = normDate(r[8]);
        if (rDateN && rDateN !== examDateN) continue;
      }
      // 학생 답안 파싱 (O열=15번 컬럼)
      var studentAns = null;
      try { studentAns = JSON.parse(r[14] || "null"); } catch(er) { studentAns = null; }
      if (!studentAns) continue;
      // 객관식은 즉시 재채점, 기존 주관식상세가 있으면 보존해 가중치 점수에 반영
      var subDetails = invalidateSubjectiveDetails ? {map:{}, count:0} : _subjectiveDetailsMap_(r[17], r[15]);
      var correctCnt = 0, wrongCnt = 0, totalObj = 0, wrongQs = [], subCount = 0, subScoreSum = 0, subCorrectCnt = 0, subWrongCnt = 0, subDetailCount = 0;
      var startNum = Number(matched[14]) || 1;
      for (var qi = 0; qi < totalQ; qi++) {
        // ★ v27.17 (2026-05-30): 정답키는 항상 1-base 저장 → startNumber 오프셋 제거(점수 뒤섞임 픽스)
        var qNum = String(qi + 1);
        var typ = String(typesMap[qNum] || "obj").toLowerCase();
        var corr = answerKey[qNum];
        if (_isSubjectiveRegradeType_(typ)) {
          subCount++;
          var sd = subDetails.map[parseInt(qNum, 10)];
          if (sd && sd.score !== undefined && sd.score !== null && sd.score !== "") {
            var sdScore = Math.max(0, Math.min(100, Number(sd.score) || 0));
            subScoreSum += sdScore / 100;
            subDetailCount++;
            if (sdScore >= 100) subCorrectCnt++;
            else { subWrongCnt++; wrongQs.push(parseInt(qNum,10)); }
          }
          continue;
        }
        totalObj++;
        // 학생답: 배열(0-based) 또는 객체(1-based)
        var stu;
        if (Array.isArray(studentAns)) stu = studentAns[qi];
        else stu = studentAns[qNum] !== undefined ? studentAns[qNum] : studentAns[qi+1];
        var sn = normTok(stu);
        var cn = normTok(corr);
        if (!sn || sn === "?") { wrongCnt++; wrongQs.push(parseInt(qNum,10)); }
        else if (cn && sn === cn) { correctCnt++; }
        else { wrongCnt++; wrongQs.push(parseInt(qNum,10)); }
      }
      // ★ v27.21 (2026-05-30): 강제 재채점도 혼합형 주관식 1.5 가중치와 기존 R열 상세를 반영
      // ★ v27.22 (2026-05-30): 주관식상세가 없으면 주관식을 0점처럼 반영하지 않고 기존 점수를 보존
      // ★ v27.23 (2026-05-30): 주관식상세가 부족하면 J~N 종합 컬럼도 덮어쓰지 않음(부분 재채점 값으로 오염 방지)
      var hasMissingSubDetails = subCount > subDetailCount;
      if (hasMissingSubDetails) {
        subjectiveDetailsMissing++;
        if (invalidateSubjectiveDetails && subCount > 0) {
          if (sSheet.getLastColumn() < 18) sSheet.getRange(1, 18).setValue("주관식상세");
          sSheet.getRange(ri+1, 18).clearContent();
          subjectiveInvalidated++;
        }
        if (subCount > 0) subjectNeedsAI++;
        continue;
      }
      var score = _weightedRegradeScore_(correctCnt, totalObj, subScoreSum, subCount);
      // ★ v23.6: 학생답안기록 컬럼 정확히 갱신
      //   J(10)=점수, K(11)=정답수, L(12)=오답수, M(13)=총채점, N(14)=틀린문항
      sSheet.getRange(ri+1, 10).setValue(score);
      sSheet.getRange(ri+1, 11).setValue(correctCnt + subCorrectCnt);
      sSheet.getRange(ri+1, 12).setValue(wrongQs.length);
      sSheet.getRange(ri+1, 13).setValue(totalObj + subDetailCount);
      sSheet.getRange(ri+1, 14).setValue(wrongQs.length > 0 ? wrongQs.join(", ") : "");
      regraded++;
      if (subCount > 0) subjectNeedsAI++;
    }
    // ★ v27.17 (2026-05-30): 강제 재채점 후 반별성적 캐시 무효화 → 갱신된 점수 즉시 반영
    clearClassGradesCache_();
    var msg = regraded + "명 재채점 완료";
    if (subjectiveInvalidated > 0) msg += " / 주관식상세 " + subjectiveInvalidated + "건 초기화";
    if (subjectiveDetailsMissing > 0 && subjectiveDetailsMissing > subjectiveInvalidated) msg += " / 주관식상세 누락 " + (subjectiveDetailsMissing - subjectiveInvalidated) + "건";
    // ★ v27.22 (2026-05-30): 강제 재채점은 기존 R열 주관식상세를 보존하며, 초기화한 경우에만 재채점 필요로 안내
    if (subjectiveInvalidated > 0 || subjectiveDetailsMissing > 0) msg += " (주관식 재채점 필요)";
    else if (subjectNeedsAI > 0) msg += " (기존 주관식 AI 채점상세 보존)";
    return jsonOut_({result:"ok", regraded: regraded, subjectNeedsAI: subjectNeedsAI, subjectiveInvalidated: subjectiveInvalidated, subjectiveDetailsMissing: subjectiveDetailsMissing, subjectiveRegradeRequired: subjectiveDetailsMissing, needsSubjectiveRegrade: subjectiveDetailsMissing > 0, message: msg});
  } catch(err) {
    return jsonOut_({result:"error", message: "forceRegradeByFolder_ 오류: "+String(err)});
  }
}

// ★ v23.7: 오늘의 현황 — 시험 전체 취소 (강건 버전)
//   - rowIndex 우선, 없으면 합성키(className+examType+setType+examDate)로 fallback 검색
//   - 정답목록 행 삭제 (학생앱에서 즉시 사라짐)
//   - 업로드기록 매칭 행도 함께 삭제 (대시보드에서도 즉시 사라짐, 0문항 잔존 X)
//   - 옵션: Drive 폴더 내 파일 모두 휴지통 이동 (trashFiles=1)
//   - 백업 시트 자동 생성 (정답목록_취소백업_타임스탬프)
//   - 대시보드 캐시 전부 무효화 (날짜·선생님 조합 모두)
// 사용: ?action=cancel_dash_exam&confirm=YES
//      + (rowIndex=N) 또는 (className=X&examType=Y[&setType=Z&examDate=YYYY-MM-DD])
//      [+folderId=XYZ&trashFiles=1]
function cancelDashExam_(e) {
  try {
    if (String(e.parameter.confirm||"") !== "YES") {
      return jsonOut_({result:"error", message:"안전장치: confirm=YES 필요"});
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("정답목록");
    if (!sheet) return jsonOut_({result:"error", message:"정답목록 시트 없음"});

    var rowIdx = parseInt(e.parameter.rowIndex, 10);
    var resolvedBy = "rowIndex";

    // ── ① rowIndex 우선 사용 (정상 경로) ──
    if (rowIdx && rowIdx >= 2 && rowIdx <= sheet.getLastRow()) {
      // 그대로 사용
    } else {
      // ── ② 합성키 fallback: 캐시 stale 또는 dedupe 누락 케이스 ──
      var qClass = String(e.parameter.className||"").trim();
      var qExamType = String(e.parameter.examType||"").trim();
      var qSetType = String(e.parameter.setType||"").trim();
      var qDate = String(e.parameter.examDate||"").trim();
      if (!qClass && !qExamType) {
        return jsonOut_({result:"error", message:"rowIndex 또는 className+examType 둘 다 누락 — 식별 불가"});
      }
      // ★ v27.4 (2026-05-15): 매칭 로직 강화 + 실패 시 후보 자동 제시
      //   기존 문제: 정확 일치만 매칭 → 날짜·반 표기 약간 다르면 무조건 실패
      //   해결: 1) 정규화 매칭 (공백·반·차수 태그 제거) 2) 날짜 숫자만 비교 3) 실패 시 후보 5개 반환
      function _normClass(s) {
        return String(s||"").trim().replace(/\s+/g,"").replace(/반$/,"")
          .replace(/\s*\(\s*(?:[1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/g, "");
      }
      function _normDate(s) {
        if (s instanceof Date) s = Utilities.formatDate(s, Session.getScriptTimeZone()||"Asia/Seoul", "yyyy.MM.dd");
        return String(s||"").replace(/[^0-9]/g, "").substring(0, 8);  // "20260516"
      }
      var qClassN = _normClass(qClass);
      var qDateN = _normDate(qDate);
      var rows = sheet.getDataRange().getValues();
      var foundIdx = -1;
      var candidates = [];  // 부분 매칭 후보 (실패 시 사용자에게 보여줌)
      // 끝에서부터 검색 — 최근에 등록된 행이 후보일 가능성 높음
      for (var i = rows.length - 1; i >= 1; i--) {
        var r = rows[i];
        var rClass = String(r[11]||"").trim();
        var rClassN = _normClass(rClass);
        var rExamType = String(r[4]||"").trim();
        var rSetType = String(r[5]||"").trim();
        var rDateN = _normDate(r[12]);
        // className 정규화 매칭 (공백·반·차수태그 제거 후)
        var classMatch = !qClassN || rClassN === qClassN;
        var examTypeMatch = !qExamType || rExamType === qExamType;
        var setTypeMatch = !qSetType || rSetType === qSetType;
        var dateMatch = !qDateN || rDateN === qDateN;
        // 모두 매칭하면 즉시 선택
        if (classMatch && examTypeMatch && setTypeMatch && dateMatch) {
          foundIdx = i + 1; break;
        }
        // 부분 매칭 후보 수집 (className 만이라도 맞으면)
        if (classMatch && examTypeMatch) {
          candidates.push({
            rowIdx: i + 1,
            className: rClass, examType: rExamType, setType: rSetType,
            examDate: String(r[12]||""), totalQ: r[6], teacher: r[9]
          });
        }
      }
      if (foundIdx < 0) {
        // 후보가 1개뿐이면 자동 선택 (사용자 입력에 약간 오차 있어도 처리)
        if (candidates.length === 1) {
          foundIdx = candidates[0].rowIdx;
          resolvedBy = "composite_fuzzy_single";
        } else {
          var candidateText = candidates.slice(0,5).map(function(c){
            return "  · 행 " + c.rowIdx + ": " + c.className + " / " + c.examType + (c.setType?" (" + c.setType + ")":"") + " / " + c.examDate + " / " + c.teacher + " / " + c.totalQ + "문항";
          }).join("\n");
          return jsonOut_({
            result: "error",
            message: "정확 매칭 실패 (className=" + qClass + ", examType=" + qExamType + ", date=" + qDate + ")" +
              (candidates.length > 0
                ? "\n\n부분 매칭 후보 " + candidates.length + "건:\n" + candidateText + "\n\n→ 시트 정답목록에서 직접 확인 후 행 번호로 다시 호출하세요 (rowIndex=N)"
                : "\n\n부분 매칭도 0건 — 정답목록에 해당 시험이 없음. 이미 삭제됐거나, 등록되지 않았을 수 있음."),
            candidates: candidates
          });
        }
      }
      rowIdx = foundIdx;
      if (resolvedBy === "rowIndex") resolvedBy = "composite";
    }

    // ── ③ 행 데이터 백업 (복구용) ──
    var stamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmmss");
    var bkName = "정답목록_취소백업_" + stamp;
    var bk = ss.getSheetByName(bkName) || ss.insertSheet(bkName);
    if (bk.getLastRow() === 0) {
      bk.appendRow(sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]);
    }
    var rowData = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
    bk.appendRow(rowData);
    var metaPreview = {
      subject: String(rowData[1]||""),
      grade: String(rowData[2]||""),
      level: String(rowData[3]||""),
      examType: String(rowData[4]||""),
      setType: String(rowData[5]||""),
      className: String(rowData[11]||""),
      examDate: String(rowData[12]||""),
      totalQuestions: Number(rowData[6]||0),
      folderId: String(rowData[13]||"")
    };

    // ── ④ 정답목록 행 삭제 ──
    sheet.deleteRow(rowIdx);

    // ── ⑤ 업로드기록도 같이 정리 (대시보드에서 "0문항" 잔존 방지) ──
    var deletedUploads = 0;
    try {
      var uSheet = ss.getSheetByName("업로드기록");
      if (uSheet && uSheet.getLastRow() > 1) {
        var uHdr = uSheet.getRange(1,1,1,uSheet.getLastColumn()).getValues()[0];
        var uRows = uSheet.getDataRange().getValues();
        // 백업 시트 (업로드기록도 별도 백업)
        var ubkName = "업로드기록_취소백업_" + stamp;
        var ubk = ss.getSheetByName(ubkName);
        // 끝에서부터 삭제 (인덱스 안 밀리게)
        var uDateNorm = String(metaPreview.examDate).replace(/-/g, ".");
        var uDateAlt = String(metaPreview.examDate).replace(/\./g, "-");
        var uDateYmd = String(metaPreview.examDate).substring(0, 10);
        for (var ui = uRows.length - 1; ui >= 1; ui--) {
          var ur = uRows[ui];
          // 매칭: className(u[4]) + examType(u[5]) + 시험날짜(u[6]) + setType/round(u[15])
          var uClass = String(ur[4]||"").trim();
          var uExamType = String(ur[5]||"").trim();
          var uDate = String(ur[6]||"").trim();
          var uSetType = String(ur[15]||"").trim();
          if (metaPreview.className && uClass !== metaPreview.className) continue;
          if (metaPreview.examType && uExamType !== metaPreview.examType) continue;
          // setType은 양쪽 다 있을 때만 비교 (없으면 통과)
          if (metaPreview.setType && uSetType && uSetType !== metaPreview.setType) continue;
          // 날짜 매칭
          if (metaPreview.examDate && uDate.indexOf(uDateNorm)===-1 && uDate.indexOf(uDateAlt)===-1 && uDate.indexOf(uDateYmd)===-1) continue;
          // 매칭 — 백업 후 삭제
          if (!ubk) { ubk = ss.insertSheet(ubkName); ubk.appendRow(uHdr); }
          ubk.appendRow(ur);
          uSheet.deleteRow(ui + 1);
          deletedUploads++;
        }
      }
    } catch(_eU) { /* 업로드기록 정리 실패는 무시 — 정답목록 삭제는 이미 성공 */ }

    // ── ⑥ Drive 파일 휴지통 (옵션) ──
    var trashedFiles = 0;
    var trashFiles = String(e.parameter.trashFiles||"") === "1";
    var folderId = String(e.parameter.folderId||"").trim() || metaPreview.folderId;
    if (trashFiles && folderId) {
      try {
        var folder = DriveApp.getFolderById(folderId);
        var files = folder.getFiles();
        while (files.hasNext()) {
          try { files.next().setTrashed(true); trashedFiles++; }
          catch(_eT) {}
        }
      } catch(_eF) {}
    }

    // ── ⑦ 대시보드 캐시 모두 무효화 (날짜·선생님 모든 조합) ──
    try {
      var _cacheSvc = CacheService.getScriptCache();
      var datesToBust = [];
      // 정답목록 행에서 추출한 날짜로 캐시 키 생성 (다양한 포맷)
      var dStr = String(metaPreview.examDate||"").substring(0,10);
      if (dStr) {
        datesToBust.push(dStr);
        datesToBust.push(dStr.replace(/\./g,"-"));
        datesToBust.push(dStr.replace(/-/g,"."));
      }
      // 오늘 날짜도 함께 버스트 (시험 등록일과 다를 수 있음)
      var todayY = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
      datesToBust.push(todayY);
      datesToBust.push(todayY.replace(/-/g,"."));
      // 선생님 후보: 빈 문자열 + 시험 행의 teacher
      var teacherCandidates = ["", String(rowData[9]||"").trim()];
      // 선생님 시트의 모든 이름도 추가 (확실하게)
      try {
        var tSh = ss.getSheetByName(TEACHERS_SHEET);
        if (tSh && tSh.getLastRow() > 1) {
          var tNames = tSh.getRange(2, 1, tSh.getLastRow()-1, 1).getValues();
          for (var tni = 0; tni < tNames.length; tni++) {
            var tn = String(tNames[tni][0]||"").trim();
            if (tn && teacherCandidates.indexOf(tn) < 0) teacherCandidates.push(tn);
          }
        }
      } catch(_eTL) {}
      // 모든 조합 캐시 제거
      var keysToRemove = [];
      for (var di = 0; di < datesToBust.length; di++) {
        for (var ti = 0; ti < teacherCandidates.length; ti++) {
          keysToRemove.push("dash_" + datesToBust[di] + "_" + teacherCandidates[ti]);
        }
      }
      if (keysToRemove.length > 0) _cacheSvc.removeAll(keysToRemove);
    } catch(_eC) {}

    return jsonOut_({
      result: "ok",
      message: "시험 취소 완료 (행 " + rowIdx + ", 식별=" + resolvedBy + ")",
      deletedRow: rowIdx,
      resolvedBy: resolvedBy,
      backupSheet: bkName,
      deletedUploads: deletedUploads,
      trashedFiles: trashedFiles,
      meta: metaPreview
    });
  } catch (err) {
    return jsonOut_({result:"error", message: "cancelDashExam_ 오류: " + String(err)});
  }
}

// ★ v23.7: 오늘의 현황 — 시험지/답지 파일 1개 삭제 (Drive 휴지통 이동)
// 사용: ?action=delete_dash_file&fileId=XYZ&confirm=YES
// 안전장치: confirm=YES 필요. setTrashed 이므로 30일 내 복구 가능.
function deleteDashFile_(e) {
  try {
    if (String(e.parameter.confirm||"") !== "YES") {
      return jsonOut_({result:"error", message:"안전장치: confirm=YES 필요"});
    }
    var fileId = String(e.parameter.fileId||"").trim();
    if (!fileId) return jsonOut_({result:"error", message:"fileId 필요"});
    var file = DriveApp.getFileById(fileId);
    var name = file.getName();
    file.setTrashed(true);
    return jsonOut_({result:"ok", message:"파일을 휴지통으로 이동: " + name, fileName: name});
  } catch(err) {
    return jsonOut_({result:"error", message: "deleteDashFile_ 오류: "+String(err)});
  }
}

// ★ v23.2: 정답 행 삭제 — 대시보드 정답 보기 모달에서 "이 정답 삭제" 버튼
// 사용: ?action=delete_answer_row&folderId=XYZ
function deleteAnswerRow_(e) {
  try {
    var folderId = String(e.parameter.folderId||"").trim();
    if (!folderId) return jsonOut_({result:"error", message:"folderId 필요"});
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ansSh = ss.getSheetByName("정답목록");
    if (!ansSh || ansSh.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 비어있음"});
    var rows = ansSh.getDataRange().getValues();
    var rowIdx = -1;
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][13]||"").trim() === folderId) { rowIdx = i + 1; break; }
    }
    if (rowIdx < 0) return jsonOut_({result:"error", message:"해당 정답 행을 찾을 수 없음"});
    ansSh.deleteRow(rowIdx);
    return jsonOut_({result:"ok", message:"정답 행 삭제 완료"});
  } catch(err) {
    return jsonOut_({result:"error", message: "deleteAnswerRow_ 오류: "+String(err)});
  }
}

// ── 핵심 API: 날짜별 학생 제출 + 정답 목록 조회 ──
// 사용: ?action=list_submissions_by_date&date=2026-04-16
// 반환: { result:"ok", date, submissions:[...], answerKeys:[...] }
// ═══ 문제 생성기: 요청 목록 조회 ═══
function listExamGen_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("문제생성큐");
    if (!sheet || sheet.getLastRow() <= 1) return jsonOut_({result:"ok", requests:[]});
    var rows = sheet.getDataRange().getValues();
    var header = rows[0];
    // ★ v12.3: 헤더 기반 동적 인덱스 — 객관식비율 컬럼 추가 후에도 안전
    var idx = {};
    for (var hi=0; hi<header.length; hi++) idx[String(header[hi]).trim()] = hi;
    var pick = function(r, key, dflt) { var i = idx[key]; return i !== undefined ? r[i] : dflt; };
    var result = [];
    var start = Math.max(1, rows.length - 20);
    for (var i = rows.length - 1; i >= start; i--) {
      var r = rows[i];
      result.push({
        rowIndex: i + 1,
        requestedAt: String(pick(r, "요청시각", "") || ""),
        status: String(pick(r, "상태", "대기") || "대기"),
        textbook: String(pick(r, "교재", "") || ""),
        textbookId: String(pick(r, "교재ID", "") || ""),
        rangeType: String(pick(r, "범위유형", "") || ""),
        rangeDesc: String(pick(r, "범위설명", "") || ""),
        testType: String(pick(r, "시험유형", "grammar") || "grammar"),
        setType: normalizeSetType_(String(pick(r, "시험구분", "") || "")), // ★ v14: 이론편/실전편/혼합 워커에 전달
        questionCount: Number(pick(r, "문제수", 20)) || 20,
        mcRatio: (function(){var v = pick(r, "객관식비율", 100); return (v === "" || v === null || v === undefined) ? 100 : Number(v);})(),
        difficulty: {  // ★ v14: 난이도 정보도 워커가 활용할 수 있도록 같이 응답
          easy: Number(pick(r, "난이도_쉬움", 30)) || 30,
          medium: Number(pick(r, "난이도_보통", 50)) || 50,
          hard: Number(pick(r, "난이도_어려움", 20)) || 20
        },
        teacher: String(pick(r, "선생님", "") || ""),
        targetClass: String(pick(r, "대상반", "") || ""),
        examDate: String(pick(r, "시험날짜", "") || ""),  // ★ v20.2
        examTime: String(pick(r, "시험시간", "") || ""),  // ★ v20.2
        memo: String(pick(r, "메모", "") || ""),
        resultFileId: String(pick(r, "결과파일ID", "") || ""),
        resultFileIdB: String(pick(r, "결과파일ID_B", "") || ""), // ★ v14: B세트 백업 파일 ID
        activeSet: String(pick(r, "활성세트", "A") || "A"),       // ★ v14: 현재 학생앱에 노출된 세트 (A/B)
        completedAt: String(pick(r, "완료시각", "") || "")
      });
    }
    return jsonOut_({result:"ok", requests:result});
  } catch(err) {
    return jsonOut_({result:"error", message:String(err)});
  }
}
// ═══ 문제 생성기: 상세 조회 (결과 포함) ═══
function getExamGenDetail_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("문제생성큐");
    if (!sheet) return jsonOut_({result:"error", message:"문제생성큐 시트 없음"});
    var rowIdx = parseInt(e.parameter.rowIndex || "0");
    if (rowIdx < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    var lastCol = sheet.getLastColumn();
    var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var r = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];
    // ★ v12.3: 헤더 기반 동적 인덱스 — 객관식비율 컬럼 추가 후에도 안전
    var idx = {};
    for (var hi=0; hi<header.length; hi++) idx[String(header[hi]).trim()] = hi;
    var pick = function(key, dflt) { var i = idx[key]; return i !== undefined ? r[i] : dflt; };
    var detail = {
      rowIndex: rowIdx,
      requestedAt: String(pick("요청시각", "") || ""),
      status: String(pick("상태", "대기") || "대기"),
      textbook: String(pick("교재", "") || ""),
      textbookId: String(pick("교재ID", "") || ""),
      rangeType: String(pick("범위유형", "") || ""),
      rangeDesc: String(pick("범위설명", "") || ""),
      chapters: String(pick("챕터", "") || ""),
      pageFrom: Number(pick("페이지시작", 0)) || 0,
      pageTo: Number(pick("페이지끝", 0)) || 0,
      testType: String(pick("시험유형", "") || ""),
      setType: normalizeSetType_(String(pick("시험구분", "") || "")), // ★ v14
      questionCount: Number(pick("문제수", 20)) || 20,
      mcRatio: (function(){var v = pick("객관식비율", 100); return (v === "" || v === null || v === undefined) ? 100 : Number(v);})(),
      difficulty: {
        easy: Number(pick("난이도_쉬움", 30)) || 30,
        medium: Number(pick("난이도_보통", 50)) || 50,
        hard: Number(pick("난이도_어려움", 20)) || 20
      },
      teacher: String(pick("선생님", "") || ""),
      targetClass: String(pick("대상반", "") || ""),
      examDate: String(pick("시험날짜", "") || ""),  // ★ v20.2
      examTime: String(pick("시험시간", "") || ""),  // ★ v20.2
      memo: String(pick("메모", "") || ""),
      resultFileId: String(pick("결과파일ID", "") || "").trim(),
      resultFileIdB: String(pick("결과파일ID_B", "") || "").trim(), // ★ v14: B세트 파일
      activeSet: String(pick("활성세트", "A") || "A"),               // ★ v14
      completedAt: String(pick("완료시각", "") || "")
    };
    // 정답데이터 (헤더명 "정답데이터" 또는 fallback으로 인덱스 19)
    var answerDataVal = pick("정답데이터", undefined);
    if (answerDataVal === undefined) answerDataVal = r[19]; // fallback
    if (answerDataVal) {
      var parsedAd = parseAnswerDoc_(String(answerDataVal));
      if (parsedAd) {
        detail.answerData = parsedAd;
        detail.answerDataInfo = {
          type: typeof parsedAd,
          isArray: Array.isArray(parsedAd),
          keys: (parsedAd && typeof parsedAd === "object" && !Array.isArray(parsedAd)) ? Object.keys(parsedAd) : [],
          setsType: parsedAd && parsedAd.sets ? (Array.isArray(parsedAd.sets) ? "array(" + parsedAd.sets.length + ")" : typeof parsedAd.sets) : "없음"
        };
      } else {
        detail.answerData = null;
        detail.answerDataError = "answerData 파싱 실패";
        detail.answerDataRaw = String(answerDataVal).substring(0, 200);
      }
    }
    // 결과 파일이 있으면 JSON 읽기 (fileId 유효성 체크 강화)
    detail.questionsSource = "none";
    if (detail.resultFileId && detail.resultFileId.length > 5) {
      try {
        var file = DriveApp.getFileById(detail.resultFileId);
        var content = file.getBlob().getDataAsString();
        var parsed = parseAnswerDoc_(content);
        if (parsed) {
          detail.questions = parsed;
          detail.questionsSource = "drive";
        } else {
          detail.questionsError = "파일 파싱 실패";
          detail.questionsSource = "drive_error";
        }
      } catch(fe) {
        detail.questionsError = "파일 읽기 실패: " + String(fe);
        detail.questionsSource = "drive_error";
      }
    }
    // Drive 파일 실패 시 answerData fallback
    if (!detail.questions && detail.answerData) {
      detail.questionsSource = "sheet";
    }
    return jsonOut_({result:"ok", detail:detail});
  } catch(err) {
    return jsonOut_({result:"error", message:String(err)});
  }
}
// ═══ 문제 생성기: 상태 업데이트 ═══
function updateExamGenStatus_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("문제생성큐");
    if (!sheet) return jsonOut_({result:"error", message:"문제생성큐 시트 없음"});
    var rowIdx = parseInt(e.parameter.rowIndex || "0");
    if (rowIdx < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    var status = String(e.parameter.status || "").trim();
    if (!status) return jsonOut_({result:"error", message:"status 파라미터 필요"});
    // ★ v12.3: 헤더 기반 동적 컬럼 매핑 — 객관식비율 추가 후에도 안전
    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var cidx = {};
    for (var hi=0; hi<header.length; hi++) cidx[String(header[hi]).trim()] = hi + 1; // 1-based
    var col = function(key, fallback) { return cidx[key] || fallback; };
    // 상태 업데이트
    sheet.getRange(rowIdx, col("상태", 2)).setValue(status);
    // 결과파일 ID
    var resultFileId = (e.parameter.resultFileId || "").trim();
    if (resultFileId) sheet.getRange(rowIdx, col("결과파일ID", 18)).setValue(resultFileId);
    // 완료시각
    if (status === "완료" || status === "실패") {
      sheet.getRange(rowIdx, col("완료시각", 19)).setValue(new Date().toLocaleString("ko-KR"));
    }
    // ★ 완료 시 정답목록에 자동 등록
    if (status === "완료") {
      try {
        autoRegisterExamFromGen_(sheet, rowIdx, null);
      } catch(autoErr) {
        Logger.log("[autoRegister GET] 자동 등록 실패: " + String(autoErr));
      }
    }
    return jsonOut_({result:"ok", message:"상태 업데이트 완료: " + status});
  } catch(err) {
    return jsonOut_({result:"error", message:String(err)});
  }
}
function listSubmissionsByDate_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var qDate = (e.parameter.date || "").trim();
    if (!qDate) {
      // 기본값: 어제
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      qDate = Utilities.formatDate(yesterday, tz, "yyyy-MM-dd");
    }
    // 날짜 포맷 변환: 입력이 yyyy-MM-dd / yyyy.MM.dd 둘 다 허용
    var dateDash = qDate.replace(/\./g, "-");      // yyyy-MM-dd
    var dateDot = qDate.replace(/-/g, ".");          // yyyy.MM.dd
    var dateSlash = qDate.replace(/[-\.]/g, "/");    // yyyy/MM/dd
    var dateShort = qDate.replace(/[-\.]/g, "");     // yyyyMMdd
    // === 1) 학생답안기록에서 해당 날짜 제출 조회 ===
    var sSh = ss.getSheetByName("학생답안기록");
    var submissions = [];
    if (sSh && sSh.getLastRow() > 1) {
      var rows = sSh.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        // 날짜 매칭: 제출일시(r[0]) 또는 시험날짜(r[8])에서 날짜 확인
        var submitDate = String(r[0] || "");
        var examDate = String(r[8] || "");
        var matched = false;
        // 제출일시 문자열에서 날짜 추출 (예: "2026. 4. 16. 오후 3:30:00" 또는 "2026-04-16 15:30")
        if (submitDate.indexOf(dateDash) >= 0 || submitDate.indexOf(dateDot) >= 0 ||
            submitDate.indexOf(dateSlash) >= 0) {
          matched = true;
        }
        // "2026. 4. 16." 형식도 처리 (toLocaleString("ko-KR") 결과)
        if (!matched) {
          var parts = dateDash.split("-");
          if (parts.length === 3) {
            var yy = parseInt(parts[0],10), mm = parseInt(parts[1],10), dd = parseInt(parts[2],10);
            var koPattern = yy + ". " + mm + ". " + dd + ".";
            var koPattern2 = yy + "." + mm + "." + dd;
            if (submitDate.indexOf(koPattern) >= 0 || submitDate.indexOf(koPattern2) >= 0) matched = true;
          }
        }
        // 시험날짜 필드(r[8])로도 매칭
        if (!matched && examDate) {
          if (examDate.indexOf(dateDash) >= 0 || examDate.indexOf(dateDot) >= 0) matched = true;
        }
        if (!matched) continue;
        // 답안원본 파싱
        var rawAnswers = {};
        try { rawAnswers = r[14] ? JSON.parse(String(r[14])) : {}; } catch(pIgn){}
        submissions.push({
          rowIndex: i + 1,    // 시트 행 번호 (update_grading용)
          submitTime: submitDate,
          name: String(r[1] || ""),
          phone: String(r[2] || ""),
          className: String(r[3] || ""),
          subject: String(r[4] || ""),
          grade: String(r[5] || ""),
          level: String(r[6] || ""),
          examName: String(r[7] || ""),
          examDate: examDate,
          score: r[9],                   // null이면 미채점
          correct: r[10],
          wrong: r[11],
          totalGraded: r[12],
          wrongQuestions: String(r[13] || ""),
          answers: rawAnswers            // 학생이 제출한 답안 원본
        });
      }
    }
    // === 2) 정답목록에서 해당 날짜 정답키 조회 ===
    var aSh = ss.getSheetByName("정답목록");
    var answerKeys = [];
    if (aSh && aSh.getLastRow() > 1) {
      var aRows = aSh.getDataRange().getValues();
      for (var ai = 1; ai < aRows.length; ai++) {
        var ar = aRows[ai];
        var aDate = String(ar[12] || "");  // 시험날짜 (인덱스 12)
        if (aDate.indexOf(dateDash) >= 0 || aDate.indexOf(dateDot) >= 0 || !aDate) {
          var aAnswers = {};
          try { aAnswers = ar[7] ? JSON.parse(String(ar[7])) : {}; } catch(aIgn){}
          var aTypes = {};
          try { aTypes = ar[8] ? JSON.parse(String(ar[8])) : {}; } catch(tIgn){}
          answerKeys.push({
            subject: String(ar[1] || ""),
            grade: String(ar[2] || ""),
            level: String(ar[3] || ""),
            examType: String(ar[4] || ""),
            round: String(ar[5] || ""),
            totalQuestions: Number(ar[6]) || 0,
            answers: aAnswers,
            types: aTypes,
            teacher: String(ar[9] || ""),
            studentCount: Number(ar[10]) || 0,
            className: String(ar[11] || ""),
            examDate: aDate,
            folderId: String(ar[13] || "")
          });
        }
      }
    }
    // === 3) 업로드기록에서 해당 날짜 건수 ===
    var uSh = ss.getSheetByName("업로드기록");
    var uploadCount = 0;
    if (uSh && uSh.getLastRow() > 1) {
      var uRows = uSh.getDataRange().getValues();
      for (var ui = 1; ui < uRows.length; ui++) {
        var uDate = String(uRows[ui][6] || "");
        if (uDate.indexOf(dateDash) >= 0 || uDate.indexOf(dateDot) >= 0) uploadCount++;
      }
    }
    if (submissions.length === 0 && answerKeys.length === 0 && uploadCount === 0) {
      return jsonOut_({result:"not_found", date: dateDash, message: "해당 날짜 데이터 없음"});
    }
    return jsonOut_({
      result: "ok",
      date: dateDash,
      uploadCount: uploadCount,
      submissionCount: submissions.length,
      answerKeyCount: answerKeys.length,
      submissions: submissions,
      answerKeys: answerKeys
    });
  } catch(err) {
    return jsonOut_({result:"error", message: String(err)});
  }
}
// ─── v25.9 (2026-05-13): dailyConsistencyCheck wrapper 제거 ─
//   필요 시 checkUploadVsAnswerConsistency_ 직접 호출
// ── B. 학생 응답 패턴으로 types 자동 보정 ──
// 특정 시험(answerRow)에 대해 학생답안 5건 이상 모이면 sub↔mc 판단 재검토
function autoDetectTypeMismatch_(answerRow) {
  try {
    if (!answerRow) return 0;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sSh = ss.getSheetByName("학생답안기록");
    if (!sSh || sSh.getLastRow() <= 1) return 0;
    var aSh = ss.getSheetByName("정답목록");
    if (!aSh) return 0;
    var subj = answerRow[1], gr = answerRow[2], lv = answerRow[3], ex = answerRow[4];
    var total = Number(answerRow[6]) || 0;
    var types = {};
    try { types = answerRow[8] ? JSON.parse(answerRow[8]) : {}; } catch(e){}
    var answers = {};
    try { answers = answerRow[7] ? JSON.parse(answerRow[7]) : {}; } catch(e){}
    var folderId = String(answerRow[13] || "");
    var rows = sSh.getDataRange().getValues();
    var samples = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[4]||"") !== subj) continue;
      if (String(r[5]||"") !== gr) continue;
      if (lv && String(r[6]||"") !== lv && String(r[6]||"") !== "전체") continue;
      if (String(r[7]||"").indexOf(ex) === -1) continue;
      var raw = String(r[14]||"");
      if (!raw) continue;
      try { samples.push(JSON.parse(raw)); } catch(e){}
    }
    if (samples.length < 5) return 0;
    // 각 문항별 응답 패턴 분석
    var changedTypes = false;
    var corrections = [];
    for (var q = 1; q <= total; q++) {
      var key = String(q);
      var curType = types[key] || "mc";
      var responses = [];
      samples.forEach(function(s){
        var v = s[key];
        if (v !== undefined && v !== null && v !== "") responses.push(String(v).trim());
      });
      if (responses.length < 5) continue;
      var digitOnly = responses.filter(function(v){ return /^[1-5]$/.test(v); }).length;
      var textOnly = responses.filter(function(v){ return !/^[0-9]+$/.test(v) && v.length > 0; }).length;
      var digitRatio = digitOnly / responses.length;
      var textRatio = textOnly / responses.length;
      // sub로 분류됐는데 90% 이상이 1~5 숫자만 → 실제는 mc
      if (curType === "sub" && digitRatio >= 0.9) {
        types[key] = "mc";
        changedTypes = true;
        corrections.push(q + "번: sub→mc (" + responses.length + "명 중 " + digitOnly + "명이 1~5 숫자)");
      }
      // mc로 분류됐는데 70% 이상이 텍스트(숫자 아닌 답변) → 실제는 sub
      else if (curType === "mc" && textRatio >= 0.7) {
        types[key] = "sub";
        changedTypes = true;
        corrections.push(q + "번: mc→sub (" + responses.length + "명 중 " + textOnly + "명이 텍스트 응답)");
      }
    }
    if (!changedTypes) return 0;
    // 정답목록 types 업데이트
    var aRows = aSh.getDataRange().getValues();
    for (var ar = 1; ar < aRows.length; ar++) {
      if (String(aRows[ar][13]||"") === folderId) {
        aSh.getRange(ar+1, 9).setValue(JSON.stringify(types));
        break;
      }
    }
    slackSend_("🔄 *응답 패턴 자동 보정* — " + subj + " " + gr + " " + lv + " " + ex + "\n" +
               corrections.slice(0,10).join("\n") + (corrections.length>10?"\n...외 "+(corrections.length-10)+"건":""));
    // 재채점 (지각채점과 동일 로직 재활용)
    var n = regradeLateSubmissions_(answerRow);
    if (n > 0) slackSend_("↩️ 보정 후 재채점 " + n + "건 완료");
    return corrections.length;
  } catch(err) {
    Logger.log("autoDetectTypeMismatch_ error: " + err);
    return 0;
  }
}
// ── C. 파일 swap 휴리스틱 (업로드 시점에 검사) ──
// examFiles/answerFiles의 파일명 패턴으로 swap 의심 탐지
function detectFileSwap_(data, examFolder) {
  try {
    var warnings = [];
    var af = data.answerFiles || [];
    var ef = data.examFiles || [];
    // 답지 파일인데 이름에 "시험지/문제/problem/quiz" 포함 → 의심
    af.forEach(function(f){
      var n = String(f.name||"").toLowerCase();
      if (/(시험지|문제지|문항|problem|quiz|question)/i.test(n) &&
          !/(정답|답지|답안|해설|풀이|answer|solution|key)/i.test(n)) {
        warnings.push("답지로 올린 파일명이 시험지처럼 보임: " + f.name);
      }
    });
    // 시험지 파일인데 이름에 "정답/답지/해설" 포함 → 의심
    ef.forEach(function(f){
      var n = String(f.name||"").toLowerCase();
      if (/(정답|답지|답안|해설|풀이|answer|solution|key)/i.test(n)) {
        warnings.push("시험지로 올린 파일명이 답지처럼 보임: " + f.name);
      }
    });
    // 답지 0개면 경고
    if (af.length === 0) warnings.push("답지 파일이 업로드되지 않음 (Claude 분석 불가)");
    if (warnings.length > 0) {
      var msg = "⚠️ *파일 업로드 의심 감지* — " + (examFolder ? examFolder.getName() : "(폴더 미상)") + "\n" +
                warnings.map(function(w){return "• "+w;}).join("\n") +
                "\n→ 업로드는 계속 진행됨. Claude 분석 후 재확인 필요.";
      slackSend_(msg);
    }
    return warnings;
  } catch(err) {
    Logger.log("detectFileSwap_ error: " + err);
    return [];
  }
}
// ── Public: 지각 채점 수동 실행 (오늘 정답목록 전체 대상) ──
function regradeAllToday() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aSh = ss.getSheetByName("정답목록");
  if (!aSh || aSh.getLastRow() <= 1) return;
  var rows = aSh.getDataRange().getValues();
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
  var total = 0;
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var d = String(r[12]||"");
    if (d.indexOf(todayDot) === -1) continue;
    total += regradeLateSubmissions_(r);
  }
  Logger.log("오늘 지각채점 총 " + total + "건 처리");
  slackSend_("📊 지각채점 완료 — " + total + "건 재채점됨");
}

// ═══════════════════════════════════════════════════════
// ★ 교재 관리 (v8에서 포팅)
// ═══════════════════════════════════════════════════════

function ensureTextbookSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("교재목록");
  if (!sheet) {
    sheet = ss.insertSheet("교재목록");
    sheet.appendRow(["교재ID", "교재명", "파일ID", "총페이지", "챕터목록", "등록일", "소스"]);
  }
  return sheet;
}

function listTextbooks_(e) {
  try {
    var sheet = ensureTextbookSheet_();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";

    // ★ v24: 사용자 수동 카테고리 분류 정보 (메타 시트)
    var manualCategories = getManualCategories_();

    // 1. Drive 교재 폴더에서 PDF/폴더 스캔 (★ v24: 1단계 깊이 — 카테고리 폴더 포함)
    var driveFiles = [];
    var rootFolders = DriveApp.getFoldersByName("채움학원 시험자료");
    if (rootFolders.hasNext()) {
      var root = rootFolders.next();
      var subFolders = root.getFoldersByName("교재");
      if (subFolders.hasNext()) {
        var textbookFolder = subFolders.next();

        // 1-A. 교재 폴더 직속 PDF
        var files = textbookFolder.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          var mime = f.getMimeType();
          if (mime === "application/pdf" || mime === "application/x-pdf") {
            driveFiles.push({
              fileId: f.getId(),
              fileName: f.getName(),
              size: f.getSize(),
              created: Utilities.formatDate(f.getDateCreated(), tz, "yyyy.MM.dd"),
              fileType: "pdf",
              parentName: ""
            });
          }
        }

        // 1-B. ★ v24: 카테고리 폴더 안의 PDF + 교재 폴더
        var catFolders = textbookFolder.getFolders();
        while (catFolders.hasNext()) {
          var catFolder = catFolders.next();
          var catFolderName = catFolder.getName();
          if (catFolderName.charAt(0) === "_") continue; // _임시, _미분류 스킵

          // 카테고리 폴더 안의 PDF
          var subFiles = catFolder.getFiles();
          while (subFiles.hasNext()) {
            var sf = subFiles.next();
            var smime = sf.getMimeType();
            if (smime === "application/pdf" || smime === "application/x-pdf") {
              driveFiles.push({
                fileId: sf.getId(),
                fileName: sf.getName(),
                size: sf.getSize(),
                created: Utilities.formatDate(sf.getDateCreated(), tz, "yyyy.MM.dd"),
                fileType: "pdf",
                parentName: catFolderName
              });
            }
          }

          // 카테고리 폴더 안의 교재 폴더 (챕터 PDF가 들어있음)
          var teachFolders = catFolder.getFolders();
          while (teachFolders.hasNext()) {
            var tf = teachFolders.next();
            var tfName = tf.getName();
            if (tfName.charAt(0) === "_") continue;
            driveFiles.push({
              fileId: tf.getId(),
              fileName: tfName,
              size: 0,
              created: Utilities.formatDate(tf.getDateCreated(), tz, "yyyy.MM.dd"),
              fileType: "folder",
              parentName: catFolderName
            });
          }
        }
      }
    }

    // 2. 시트에서 기존 메타데이터 읽기
    var sheetData = {};
    if (sheet.getLastRow() > 1) {
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        sheetData[String(r[2])] = {
          textbookId: String(r[0]),
          name: String(r[1]),
          fileId: String(r[2]),
          totalPages: parseInt(r[3]) || 0,
          chapters: r[4] ? String(r[4]).split("||") : [],
          registeredAt: String(r[5]),
          source: String(r[6]),
          rowIndex: i + 2
        };
      }
    }

    // ★ 교재별 알려진 챕터 매핑 (★ v24.3: 확장 — 채움문법/서술형/VOCA/리딩 추가)
    // 배열로 바꿔서 "긴 키 우선 매칭" 순서를 명시 — "채움구문3"이 "채움구문"보다 먼저 매칭되어야 함
    var KNOWN_CHAPTERS_LIST = [
      // ── 채움구문 (기존) ──
      { key: "채움구문3",  chapters: "GRAMMAR(p.1~20)||Ch01(p.22~61)||Ch02(p.62~106)||Ch03(p.107~116)||Ch04(p.117~161)||Ch05(p.162~191)||정답(p.192)" },
      { key: "채움구문형3", chapters: "GRAMMAR(p.1~20)||Ch01(p.22~61)||Ch02(p.62~106)||Ch03(p.107~116)||Ch04(p.117~161)||Ch05(p.162~191)||정답(p.192)" },
      { key: "채움6구문형", chapters: "Ch01||Ch02||Ch03||Ch04||Ch05||Ch06" },
      { key: "채움6구문",   chapters: "Ch01||Ch02||Ch03||Ch04||Ch05||Ch06" },
      { key: "채움구문2",  chapters: "Ch01 분사 구문||Ch02 관계사 구문||Ch03 가정법||Ch04 비교 구문" },
      { key: "채움구문1",  chapters: "GRAMMAR(p.3~18)||Ch1.동사(p.20~44)||Ch2.명사(p.45~64)||Ch3.형용사(p.65~74)||Ch4.전치사(p.75~109)||Ch5.부사(p.110~129)||Ch6.1,2형식(p.130~159)||Ch7.3,4형식(p.160~174)||Ch8.5형식(p.175~224)||정답(p.225)" },
      { key: "채움구문basic", chapters: Array.from({length:30},function(_,i){return (i+1)+"차 구문";}).join("||") },
      { key: "채움구문",   chapters: "GRAMMAR(p.3~18)||Ch1.동사(p.20~44)||Ch2.명사(p.45~64)||Ch3.형용사(p.65~74)||Ch4.전치사(p.75~109)||Ch5.부사(p.110~129)||Ch6.1,2형식(p.130~159)||Ch7.3,4형식(p.160~174)||Ch8.5형식(p.175~224)||정답(p.225)" },
      // ── 채움문법 (★ v24.3 신규) ──
      // ★ 길이 우선 (starter1, 7, 6, 5, 4, 3, 2, 1, starter, 기본형 순)
      { key: "채움문법starter1", chapters: "Unit01||Unit02||Unit03||Unit04||Unit05||Unit06||Unit07||Unit08||Unit09||Unit10" },
      { key: "채움문법starter", chapters: "Unit01||Unit02||Unit03||Unit04||Unit05||Unit06||Unit07||Unit08||Unit09||Unit10" },
      { key: "채움문법7", chapters: "Ch01 고난도 어법||Ch02 추론형 어법||Ch03 통합 문제" },
      { key: "채움문법6", chapters: "Ch01 가정법 종합||Ch02 도치·강조||Ch03 비교 구문||Ch04 특수 구문||Ch05 화법 전환" },
      { key: "채움문법5", chapters: "Ch01 시제 종합||Ch02 조동사 종합||Ch03 수동태||Ch04 부정사·동명사||Ch05 분사·분사구문||Ch06 관계사 종합" },
      { key: "채움문법4", chapters: "Ch01 분사구문||Ch02 도치||Ch03 강조||Ch04 생략||Ch05 등위접속사 and·or·but||Ch06 문장 구조" },
      { key: "채움문법3", chapters: "Ch01 관계대명사||Ch02 관계부사||Ch03 가정법||Ch04 비교||Ch05 일치와 화법" },
      { key: "채움문법2", chapters: "Ch01 시제||Ch02 조동사||Ch03 수동태||Ch04 부정사||Ch05 동명사||Ch06 분사" },
      { key: "채움문법1", chapters: "Ch01 품사||Ch02 명사||Ch03 관사||Ch04 형용사||Ch05 부사||Ch06 동사||Ch07 시제" },
      { key: "채움문법",  chapters: "Ch01||Ch02||Ch03||Ch04||Ch05||Ch06||Ch07||Ch08||Ch09||Ch10" },
      // ── 채움서술형 (★ v24.3 신규) ──
      { key: "채움서술형basic", chapters: "Ch01 단문 영작||Ch02 어순 배열||Ch03 빈칸 채우기||Ch04 문장 변형" },
      { key: "채움서술형3", chapters: "Ch01 고급 영작||Ch02 통합 서술형" },
      { key: "채움서술형2", chapters: "Ch01 중급 영작||Ch02 빈칸 추론 영작||Ch03 답안형" },
      { key: "채움서술형1", chapters: "Ch01 영작 입문||Ch02 어순||Ch03 변형||Ch04 요약" },
      { key: "채움서술형",  chapters: "Ch01||Ch02||Ch03||Ch04||Ch05" },
      // ── 채움VOCA (★ v24.3 신규) ──
      { key: "채움voca고등",   chapters: Array.from({length:12},function(_,i){return "Day "+(i+1);}).join("||") },
      { key: "채움voca중3",    chapters: Array.from({length:10},function(_,i){return "Week "+(i+1);}).join("||") },
      { key: "채움voca중2",    chapters: Array.from({length:10},function(_,i){return "Week "+(i+1);}).join("||") },
      { key: "채움voca중1",    chapters: Array.from({length:10},function(_,i){return "Week "+(i+1);}).join("||") },
      { key: "채움voca기초2",  chapters: "Day 1~5||Day 6~10||Day 11~15||Day 16~20" },
      { key: "채움voca기초1",  chapters: "Day 1~5||Day 6~10||Day 11~15||Day 16~20" },
      { key: "채움voca",       chapters: Array.from({length:10},function(_,i){return "Week "+(i+1);}).join("||") },
      // ── 채움리딩 (★ v24.3 신규) ──
      { key: "채움리딩4", chapters: "Unit 1||Unit 2||Unit 3||Unit 4||Unit 5" },
      { key: "채움리딩3", chapters: "Unit 1||Unit 2||Unit 3||Unit 4||Unit 5" },
      { key: "채움리딩2", chapters: "Unit 1||Unit 2||Unit 3||Unit 4||Unit 5" },
      { key: "채움리딩1", chapters: "Unit 1||Unit 2||Unit 3||Unit 4||Unit 5" },
      { key: "채움리딩",  chapters: "Unit 1||Unit 2||Unit 3||Unit 4||Unit 5" }
    ];
    // (주의) 배열은 위에서부터 매칭되므로 반드시 "긴 키 → 짧은 키" 순서 유지!
    // ★ v24.3: 정규화 강화 — 괄호 안 내용·구두점·소문자·재편집 키워드 모두 제거 후 비교
    function _findKnownChapters_(textbookName, fileName) {
      function clean(s){
        return String(s||"")
          .replace(/\([^)]*\)/g, "")           // 괄호 내용 제거: (학), (교), (1)
          .replace(/[\s_·.\-+,#]/g, "")        // 공백·언더스코어·구두점 제거
          .replace(/(재편집|인쇄용|학생용|선생용|개정판|쇄|re\d+|0\d+)/gi, "") // 부가 메타 제거
          .toLowerCase();
      }
      var n1 = clean(textbookName);
      var n2 = clean(fileName);
      for (var ki = 0; ki < KNOWN_CHAPTERS_LIST.length; ki++) {
        var k = clean(KNOWN_CHAPTERS_LIST[ki].key);
        if (n1.indexOf(k) >= 0 || n2.indexOf(k) >= 0) {
          return KNOWN_CHAPTERS_LIST[ki].chapters;
        }
      }
      return "";
    }

    // 3. Drive에 있지만 시트에 없는 파일 → 자동 등록
    for (var d = 0; d < driveFiles.length; d++) {
      var df = driveFiles[d];
      if (!sheetData[df.fileId]) {
        var autoId = df.fileName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9가-힣_]/g, "_").substring(0, 50);
        var autoName = df.fileName.replace(/\.pdf$/i, "").replace(/_/g, " ");
        var regDate = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd HH:mm");
        var autoChapters = _findKnownChapters_(autoName, df.fileName);
        sheet.appendRow([autoId, autoName, df.fileId, 0, autoChapters, regDate, "drive"]);
        sheetData[df.fileId] = {
          textbookId: autoId, name: autoName, fileId: df.fileId,
          totalPages: 0, chapters: autoChapters ? autoChapters.split("||") : [], registeredAt: regDate, source: "drive"
        };
      }
    }

    // 3-1. ★ 기존 교재 챕터 자동 교정
    //   (a) 챕터가 비어있으면 알려진 매핑에서 보충
    //   (b) 이미 챕터가 있어도, 예상 챕터와 다르면 덮어쓰기 (예: "채움구문3"에 구문1 챕터가 잘못 박혀있는 경우 복구)
    for (var fid in sheetData) {
      var meta = sheetData[fid];
      var expected = _findKnownChapters_(meta.name, meta.textbookId);
      var isEmpty = meta.chapters.length === 0 || (meta.chapters.length === 1 && meta.chapters[0] === "");
      if (isEmpty && expected) {
        sheet.getRange(meta.rowIndex, 5).setValue(expected);
        meta.chapters = expected.split("||");
      } else if (expected) {
        // 현재 저장된 챕터 문자열과 기대값이 다르면 교정
        var current = meta.chapters.filter(function(c){return c && c.length;}).join("||");
        if (current && current !== expected) {
          sheet.getRange(meta.rowIndex, 5).setValue(expected);
          meta.chapters = expected.split("||");
          Logger.log("[listTextbooks] 챕터 교정: " + meta.name + " — 기존과 달라 KNOWN 값으로 덮어씀");
        }
      }
    }

    // 4. 결과 조합 (Drive에 실제 존재하는 교재만 — ★ v24: category/fileType/parentName 추가)
    var result = [];
    var driveFileIds = driveFiles.map(function(f) { return f.fileId; });
    var driveById = {};
    driveFiles.forEach(function(df) { driveById[df.fileId] = df; });

    // 4-A. 시트에 등록된 PDF 교재
    for (var fid in sheetData) {
      var meta = sheetData[fid];
      if (driveFileIds.indexOf(fid) >= 0) {
        var df = driveById[fid];
        // 카테고리 결정 우선순위: 사용자 수동 > 폴더명 자동 > 파일명 자동
        var category = manualCategories[meta.textbookId]
          || manualCategories[fid]
          || detectCategory_(df ? df.parentName : "")
          || detectCategory_(meta.name)
          || "";
        result.push({
          id: meta.textbookId,
          name: meta.name,
          fileId: meta.fileId,
          totalPages: meta.totalPages,
          chapters: meta.chapters.filter(function(c) { return c.length > 0; }),
          source: meta.source,
          registeredAt: meta.registeredAt,
          // ★ v24 신규 필드
          category: category,
          fileType: (df && df.fileType) || "pdf",
          parentName: (df && df.parentName) || ""
        });
      }
    }

    // 4-B. ★ v24: 폴더형 교재 (시트에 없고 Drive에만 존재)
    driveFiles.forEach(function(df) {
      if (df.fileType === "folder" && !sheetData[df.fileId]) {
        var cleanName = df.fileName;
        var category = manualCategories[df.fileId]
          || detectCategory_(df.parentName)
          || detectCategory_(cleanName)
          || "";
        result.push({
          id: df.fileId,                // 폴더는 fileId를 id로 사용
          name: cleanName,
          fileId: df.fileId,
          totalPages: 0,
          chapters: [],
          source: "drive_folder",
          registeredAt: df.created,
          category: category,
          fileType: "folder",
          parentName: df.parentName
        });
      }
    });

    return jsonOut_({result: "ok", textbooks: result});
  } catch (err) {
    return jsonOut_({result: "error", message: "교재 목록 조회 실패: " + String(err)});
  }
}

// ═══ v24: 카테고리 자동 분류 (폴더명/파일명 키워드 매칭) ═══
function detectCategory_(name) {
  var s = String(name || "").toLowerCase();
  if (!s) return "";
  // 매칭 순서: 긴 키워드 → 짧은 키워드 (오인식 방지)
  if (s.indexOf("서술형") >= 0 || s.indexOf("영작") >= 0 || s.indexOf("writing") >= 0) return "writing";
  if (s.indexOf("모의") >= 0 || s.indexOf("수능") >= 0 || s.indexOf("mock") >= 0) return "mock";
  if (s.indexOf("리딩") >= 0 || s.indexOf("독해") >= 0 || s.indexOf("reading") >= 0) return "reading";
  if (s.indexOf("문법") >= 0 || s.indexOf("어법") >= 0 || s.indexOf("grammar") >= 0) return "grammar";
  if (s.indexOf("구문") >= 0 || s.indexOf("syntax") >= 0) return "syntax";
  if (s.indexOf("단어") >= 0 || s.indexOf("voca") >= 0 || s.indexOf("vocab") >= 0) return "vocab";
  return "";  // 미분류
}

// ═══ v24: 사용자 수동 분류 정보 (메타 시트에서 읽기) ═══
function getManualCategories_() {
  var sheet = ensureCategoryMetaSheet_();
  var map = {};
  if (sheet.getLastRow() > 1) {
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < rows.length; i++) {
      var id = String(rows[i][0] || "").trim();
      var cat = String(rows[i][1] || "").trim();
      if (id && cat) map[id] = cat;
    }
  }
  return map;
}

// ═══ v24: 교재카테고리 메타 시트 (없으면 생성) ═══
function ensureCategoryMetaSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("교재카테고리");
  if (!sheet) {
    sheet = ss.insertSheet("교재카테고리");
    sheet.appendRow(["textbookId/fileId", "category", "updatedAt"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ═══ v24: 특정 교재의 챕터 목록 조회 (textbookId 로) ═══
// ★ v24.1: 결합 챕터 자동 분리 ("Ch01~05" → ["Ch01","Ch02",..,"Ch05"]) 추가
function listChapters_(e) {
  try {
    var textbookId = String(e.parameter.textbookId || "").trim();
    if (!textbookId) return jsonOut_({result:"error", message:"textbookId 필요"});

    var chapters = [];

    // (a) 먼저 교재목록 시트에서 챕터 정보 찾기 (PDF 교재의 경우)
    var sheet = ensureTextbookSheet_();
    if (sheet.getLastRow() > 1) {
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
      for (var i = 0; i < rows.length; i++) {
        var rid = String(rows[i][0]);
        var rfid = String(rows[i][2]);
        if (rid === textbookId || rfid === textbookId) {
          var chStr = String(rows[i][4] || "");
          if (chStr) {
            // 1차 분리: || (기본 구분자)
            var arr = chStr.split("||").filter(function(c){return c && c.length > 0;});
            // ★ v24.1: 단 1개 원소면서 ","/"·"/";"/줄바꿈 들어있으면 추가 분리
            if (arr.length === 1 && /[,;·、\n]/.test(arr[0])) {
              arr = arr[0].split(/[,;·、\n]+/).map(function(s){return s.trim();}).filter(Boolean);
            }
            chapters = arr.map(function(name, idx) {
              return { id: "ch_" + idx, name: name };
            });
          }
          break;
        }
      }
    }

    // (b) 챕터가 비어있으면 → Drive에서 폴더로 가정하고 안의 PDF 파일을 챕터로
    if (chapters.length === 0) {
      try {
        var folder = DriveApp.getFolderById(textbookId);
        var files = folder.getFiles();
        var list = [];
        while (files.hasNext()) {
          var f = files.next();
          var mime = f.getMimeType();
          if (mime === "application/pdf" || mime === "application/x-pdf") {
            var name = f.getName().replace(/\.pdf$/i, "");
            if (name.charAt(0) === "_") continue;
            list.push({ id: f.getId(), name: name });
          }
        }
        // 자연 정렬 (Ch01, Ch02, ..., Ch10)
        list.sort(function(a, b) {
          return a.name.localeCompare(b.name, "ko", { numeric: true });
        });
        chapters = list;
      } catch (e2) {
        // 폴더가 아닌 단일 PDF → 같은 폴더에 <basename>_chapters.json 메타 파일 확인
        try {
          var file = DriveApp.getFileById(textbookId);
          var parents = file.getParents();
          if (parents.hasNext()) {
            var pf = parents.next();
            var baseName = file.getName().replace(/\.pdf$/i, "");
            var metaIter = pf.getFilesByName(baseName + "_chapters.json");
            if (metaIter.hasNext()) {
              var metaFile = metaIter.next();
              var metaStr = metaFile.getBlob().getDataAsString("UTF-8");
              try {
                var metaArr = JSON.parse(metaStr);
                if (Array.isArray(metaArr)) {
                  chapters = metaArr.map(function(name, idx) {
                    return { id: "meta_" + idx, name: String(name) };
                  });
                }
              } catch(eJ){}
            }
          }
        } catch(eF){}
      }
    }

    return jsonOut_({result: "ok", chapters: chapters});
  } catch (err) {
    return jsonOut_({result: "error", message: "챕터 목록 조회 실패: " + String(err)});
  }
}

// ═══ v24: 사용자가 직접 카테고리 변경 (메타 시트에 저장) ═══
function setTextbookCategory_(data) {
  try {
    var textbookId = String(data.textbookId || "").trim();
    var category = String(data.category || "").trim();
    if (!textbookId) return jsonOut_({result:"error", message:"textbookId 필요"});

    var sheet = ensureCategoryMetaSheet_();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var now = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");

    var rows = sheet.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === textbookId) {
        foundRow = i + 1;  // 1-based
        break;
      }
    }

    if (foundRow > 0) {
      // 기존 행 업데이트
      if (category) {
        sheet.getRange(foundRow, 2).setValue(category);
        sheet.getRange(foundRow, 3).setValue(now);
      } else {
        // 빈 카테고리면 행 삭제 (분류 해제)
        sheet.deleteRow(foundRow);
      }
    } else if (category) {
      sheet.appendRow([textbookId, category, now]);
    }

    return jsonOut_({result:"success", textbookId: textbookId, category: category});
  } catch (err) {
    return jsonOut_({result:"error", message:"카테고리 변경 실패: " + String(err)});
  }
}

function uploadTextbook_(data) {
  try {
    var fileName = data.fileName || "교재.pdf";
    var fileData = data.fileData || "";
    if (!fileData) return jsonOut_({result: "error", message: "파일 데이터가 없습니다"});
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";

    // Drive 교재 폴더 찾기/만들기
    var rootFolders = DriveApp.getFoldersByName("채움학원 시험자료");
    var root;
    if (rootFolders.hasNext()) { root = rootFolders.next(); }
    else { root = DriveApp.createFolder("채움학원 시험자료"); }
    var subFolders = root.getFoldersByName("교재");
    var textbookFolder;
    if (subFolders.hasNext()) { textbookFolder = subFolders.next(); }
    else { textbookFolder = root.createFolder("교재"); }

    // 파일 저장
    var decoded = Utilities.base64Decode(fileData);
    var blob = Utilities.newBlob(decoded, "application/pdf", fileName);
    var file = textbookFolder.createFile(blob);

    // 교재목록 시트에 등록
    var sheet = ensureTextbookSheet_();
    var displayName = data.name || fileName.replace(/\.pdf$/i, "").replace(/_/g, " ");
    var autoId = fileName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9가-힣_]/g, "_").substring(0, 50);
    var totalPages = parseInt(data.totalPages) || 0;
    var chapters = Array.isArray(data.chapters) ? data.chapters.join("||") : "";
    var regDate = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd HH:mm");
    sheet.appendRow([autoId, displayName, file.getId(), totalPages, chapters, regDate, "upload"]);

    return jsonOut_({
      result: "ok",
      textbook: {
        id: autoId, name: displayName, fileId: file.getId(),
        totalPages: totalPages,
        chapters: Array.isArray(data.chapters) ? data.chapters : [],
        source: "upload"
      }
    });
  } catch (err) {
    return jsonOut_({result: "error", message: "교재 업로드 실패: " + String(err)});
  }
}
// ═══ 문제 생성기: 삭제 (GET 방식) ═══
function deleteExamGenGet_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("문제생성큐");
    if (!sheet) return jsonOut_({result:"error", message:"문제생성큐 시트 없음"});
    var rowIdx = parseInt(e.parameter.rowIndex || "0");
    if (rowIdx < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    sheet.deleteRow(rowIdx);
    return jsonOut_({result:"ok", message:"삭제 완료"});
  } catch(err) {
    return jsonOut_({result:"error", message:String(err)});
  }
}
// ═══ 교재 챕터 정보 업데이트 ═══
function updateTextbookChapters_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("교재목록");
    if (!sheet) return jsonOut_({result:"error", message:"교재목록 시트 없음"});
    var textbookId = String(e.parameter.textbookId || "").trim();
    var chaptersStr = String(e.parameter.chapters || "").trim();
    if (!textbookId) return jsonOut_({result:"error", message:"textbookId 필요"});
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === textbookId) {
        sheet.getRange(i + 1, 5).setValue(chaptersStr); // E열 = 챕터 목록
        return jsonOut_({result:"ok", message:"챕터 업데이트 완료"});
      }
    }
    return jsonOut_({result:"error", message:"해당 교재를 찾을 수 없습니다: " + textbookId});
  } catch(err) {
    return jsonOut_({result:"error", message:String(err)});
  }
}

// ═══ 문제 생성기: 수동 자동등록 트리거 (선생님앱 히스토리에서 호출) ═══
function autoRegisterExamGenGet_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("문제생성큐");
    if (!sheet) return jsonOut_({result:"error", message:"문제생성큐 시트 없음"});
    var rowIdx = parseInt(e.parameter.rowIndex || "0");
    if (rowIdx < 2) return jsonOut_({result:"error", message:"잘못된 rowIndex"});
    // ★ v12.4: 먼저 column-shift 복구 시도 (객관식비율 컬럼 추가로 데이터가 밀린 경우)
    try { repairShiftedExamGenRow_(sheet, rowIdx); } catch(repairErr) { Logger.log("[repair] " + repairErr); }
    autoRegisterExamFromGen_(sheet, rowIdx, null);
    return jsonOut_({result:"ok", message:"학생앱 등록 완료!"});
  } catch(err) {
    return jsonOut_({result:"error", message:String(err)});
  }
}

// ═══ 객관식비율 컬럼 추가 후 이전 완료 행의 데이터 밀림 복구 ═══
// 증상: resultFileId가 객관식비율 칸에, 완료시각이 결과파일ID 칸에, answerData가 완료시각 칸에 저장됨
// 복구: 각 필드를 헤더 이름 기준 올바른 위치로 이동 + 옮겨진 칸은 비우기
function repairShiftedExamGenRow_(sheet, rowIdx) {
  var lastCol = sheet.getLastColumn();
  var hdr = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var hi=0; hi<hdr.length; hi++) idx[String(hdr[hi]).trim()] = hi; // 0-based
  var row = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];
  // 정답데이터 컬럼 없으면 추가
  if (idx["정답데이터"] === undefined) {
    sheet.getRange(1, lastCol + 1).setValue("정답데이터");
    hdr.push("정답데이터"); idx["정답데이터"] = hdr.length - 1;
    row = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
    lastCol = sheet.getLastColumn();
  }
  var mcIdx = idx["객관식비율"], rfIdx = idx["결과파일ID"], ctIdx = idx["완료시각"], adIdx = idx["정답데이터"];
  var mcVal = mcIdx !== undefined ? row[mcIdx] : "";
  var rfVal = rfIdx !== undefined ? row[rfIdx] : "";
  var ctVal = ctIdx !== undefined ? row[ctIdx] : "";
  var adVal = adIdx !== undefined ? row[adIdx] : "";
  // 객관식비율 자리에 Drive fileId(긴 토큰)가 들어있으면 밀림이다
  var looksLikeFileId = function(v) {
    var s = String(v || "").trim();
    return s.length > 20 && /^[A-Za-z0-9_\-]+$/.test(s);
  };
  // 완료시각 자리에 JSON이 들어있으면 밀림이다
  var looksLikeJson = function(v) {
    var s = String(v || "").trim();
    return s.length > 2 && (s.charAt(0) === "{" || s.charAt(0) === "[");
  };
  var shifted = false;
  if (looksLikeFileId(mcVal) && !String(rfVal || "").trim()) shifted = true;
  if (looksLikeJson(ctVal) && !String(adVal || "").trim()) shifted = true;
  if (!shifted) { Logger.log("[repair] row " + rowIdx + " 밀림 없음"); return; }
  Logger.log("[repair] row " + rowIdx + " 밀림 감지 → 복구 중");
  // 올바른 위치로 이동
  if (adIdx !== undefined && looksLikeJson(ctVal)) {
    sheet.getRange(rowIdx, adIdx + 1).setValue(ctVal);
    if (ctIdx !== undefined) sheet.getRange(rowIdx, ctIdx + 1).setValue("");
  }
  if (ctIdx !== undefined && String(rfVal || "").trim() && !looksLikeFileId(rfVal)) {
    // rfIdx 자리에 완료시각이 들어있음
    sheet.getRange(rowIdx, ctIdx + 1).setValue(sheet.getRange(rowIdx, ctIdx + 1).getValue() || rfVal);
  }
  if (rfIdx !== undefined && looksLikeFileId(mcVal)) {
    sheet.getRange(rowIdx, rfIdx + 1).setValue(mcVal);
    // mcIdx 자리 원복 (100 기본값)
    if (mcIdx !== undefined) sheet.getRange(rowIdx, mcIdx + 1).setValue(100);
  }
}

// ═══ 문제 생성 완료 시 정답목록 자동 등록 ═══
// 문제생성큐에서 완료된 행의 데이터를 읽어서 정답목록에 세트별로 등록
function autoRegisterExamFromGen_(genSheet, rowIdx, passedAnswerData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ansSheet = ss.getSheetByName("정답목록");
  if (!ansSheet) { ansSheet = ss.insertSheet("정답목록"); }
  ensureAnswerSheetHeader_(ansSheet);

  // 문제생성큐에서 행 읽기 — ★ v12.3: 헤더 기반 동적 매핑
  var lastCol = genSheet.getLastColumn();
  var gHeader = genSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var r = genSheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];
  var gidx = {};
  for (var ghi=0; ghi<gHeader.length; ghi++) gidx[String(gHeader[ghi]).trim()] = ghi;
  var gpick = function(key, dflt) { var i = gidx[key]; return i !== undefined ? r[i] : dflt; };
  var teacher = String(gpick("선생님", "") || "");
  var targetClass = String(gpick("대상반", "") || "");
  var testType = String(gpick("시험유형", "grammar") || "grammar");
  var questionCount = Number(gpick("문제수", 20)) || 20;
  var textbook = String(gpick("교재", "") || "");
  var rangeDesc = String(gpick("범위설명", "") || "");

  // targetClass에서 과목/학년/레벨 추출 (예: "영어 고3 B반")
  // 복수 반인 경우 쉼표로 구분됨 (예: "영어 고3 B반, 영어 중1 A반")
  var classes = targetClass.split(",").map(function(s){return s.trim();}).filter(Boolean);
  if (classes.length === 0) classes = [targetClass];
  var firstClass = classes[0];
  var tcParts = firstClass.split(/\s+/);
  var regSubject = tcParts[0] || "영어";
  var regGrade = tcParts[1] || "";
  var regLevel = (tcParts[2] || "").replace(/반$/, "");

  // answerData 파싱 (전달받은 것 또는 정답데이터 컬럼에서 읽기)
  // ★ 이중 인코딩/문자열/객체 어떤 형태든 parseAnswerDoc_ 로 일원화
  var answerData = null;
  if (passedAnswerData) {
    answerData = parseAnswerDoc_(passedAnswerData);
  } else {
    var rawAdVal = gpick("정답데이터", undefined);
    if (rawAdVal === undefined) rawAdVal = r[19]; // fallback
    var rawAd = String(rawAdVal || "").trim();
    if (rawAd) {
      answerData = parseAnswerDoc_(rawAd);
      if (!answerData) Logger.log("[autoRegister] answerData 파싱 실패");
    }
  }

  // answerData가 없으면 Drive 파일에서 읽기
  if (!answerData) {
    var fileId = String(gpick("결과파일ID", "") || "").trim();
    if (fileId && fileId.length > 5) {
      try {
        var file = DriveApp.getFileById(fileId);
        var content = file.getBlob().getDataAsString();
        answerData = parseAnswerDoc_(content);
      } catch(fe) {
        Logger.log("[autoRegister] Drive 파일 읽기 실패: " + String(fe));
      }
    }
  }

  if (!answerData || !answerData.sets || !Array.isArray(answerData.sets)) {
    Logger.log("[autoRegister] answerData에 sets가 없음. 자동 등록 건너뜀.");
    return;
  }

  // 이미 등록된 건 중복 방지: 정답목록에서 같은 교재+범위+선생님+날짜 확인
  var todayDot = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Seoul", "yyyy.MM.dd");
  var existingRows = ansSheet.getDataRange().getValues();
  for (var ei = 1; ei < existingRows.length; ei++) {
    var er = existingRows[ei];
    // 같은 날짜 + 같은 선생님 + 시험종류가 "문제생성기" + 같은 대상반이면 이미 등록됨
    if (String(er[12]) === todayDot && String(er[9]).trim() === teacher &&
        er[4] === "문제생성기" && String(er[11]).trim() === targetClass) {
      Logger.log("[autoRegister] 이미 등록됨. 중복 등록 건너뜀.");
      return;
    }
  }

  var setLabels = ["A", "B", "C"];
  var testTypeLabel = testType === "vocab" ? "단어시험" : "문제생성기";
  var setsData = answerData.sets;

  for (var si = 0; si < setsData.length; si++) {
    var set = setsData[si];
    var qs = set.questions || [];
    if (qs.length === 0) continue;

    // questions 배열 → answers/types 객체 변환 (1-based 키)
    var answers = {};
    var types = {};
    for (var qi = 0; qi < qs.length; qi++) {
      var q = qs[qi];
      var qNum = String(q.number || (qi + 1));
      answers[qNum] = q.answer || "";
      var qType = String(q.type || "mc");
      // 타입 정규화: multiple_choice → obj, subjective → sub
      if (qType === "multiple_choice" || qType === "mc" || qType === "obj") {
        types[qNum] = "obj";
      } else {
        types[qNum] = "sub";
      }
    }
    // ★ 최종 저장 직전 normalizeAnswerData 한 번 더 통과 — 형식 보증 (이중 안전장치)
    var _a = normalizeAnswerData(answers);
    var _t = normalizeAnswerData(types);

    // ★ v28 (2026-05-16): 시험날짜 = todayDot 버그 픽스
    //   원인: 워커가 미래 날짜 시험 등록 시도해도 todayDot 으로 강제 → 학생앱에서 오늘로만 보임
    //   해결: 큐 시트의 "시험일" 또는 "examDate" 우선 사용, 없으면 todayDot fallback
    var _regExamDate = String(gpick("시험일", "") || gpick("examDate", "") || gpick("시험날짜", "") || todayDot).trim();
    if (!_regExamDate || !/^\d{4}[\.\-]\d{2}[\.\-]\d{2}/.test(_regExamDate)) _regExamDate = todayDot;
    _regExamDate = _regExamDate.replace(/-/g, ".");

    ansSheet.appendRow([
      new Date().toLocaleString("ko-KR"),  // 등록일시
      regSubject,                           // 과목
      regGrade,                             // 학년
      regLevel,                             // 레벨
      testTypeLabel,                        // 시험종류
      "세트" + setLabels[si],               // 차수
      qs.length,                            // 문항수
      JSON.stringify(_a),                   // 정답데이터 (객체 형태)
      JSON.stringify(_t),                   // 유형데이터 (객체 형태)
      teacher,                              // 선생님
      0,                                    // 예상인원
      targetClass,                          // 대상반
      _regExamDate,                         // 시험날짜 (★ v28 픽스: 워커 요청 날짜)
      "",                                   // 폴더ID
      1                                     // 시작번호
    ]);
    Logger.log("[autoRegister] 세트" + setLabels[si] + " 등록 완료 (" + qs.length + "문항)");
  }
  Logger.log("[autoRegister] 총 " + setsData.length + "세트 자동 등록 완료 — " + targetClass);
}

// ============================================================
// [v21.6] 주관식 채점 결과 저장
// ------------------------------------------------------------
// 학생앱이 Vercel /api/grade-subjective 로 채점한 결과를 저장.
// student_answer 행을 찾아서 점수/오답/채점상세 컬럼을 갱신.
//
// 입력:
//   data.name, data.phone, data.examName, data.date — 학생답안 행 식별
//   data.score (0~100) — 최종 점수
//   data.correct, data.wrong — 정답/오답 수
//   data.wrongQuestions[] — 틀린 문항 번호
//   data.subjectiveDetails — 문항별 채점 상세 [{q, score, category, deductions, reasoning}]
// ============================================================
function saveSubjectiveGrade_(data) {
  // ★ v27.1: LockService — 주관식 채점 결과는 student_answer 와 같은 시트 → 동시 쓰기 충돌 방지
  var _lk = LockService.getScriptLock();
  try { _lk.waitLock(10000); } catch(_eL){ return jsonOut_({result:"error", message:"동시 처리 중. 다시 시도해주세요."}); }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("학생답안기록");
    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonOut_({result:"error", message:"학생답안기록 시트 없음"});
    }
    // ★ v25.2 (2026-05-13): 치명 버그 픽스 — P열(16=선생님)에 JSON 덮어쓰던 버그 수정
    //   기존: sheet.getRange(i+1, 16).setValue(detailStr)  ← P열 = 선생님 컬럼을 JSON 으로 오염
    //   수정: sheet.getRange(i+1, 18).setValue(detailStr)  ← R열 = 주관식상세 (전용 컬럼)
    //   이게 모든 "반별 성적 / Top 7 PDF 에서 선생님 자리에 JSON 데이터 보임" 의 원인이었음.
    // P/Q/R/S 열 헤더 보장
    // ★ v27.28 (2026-05-30): 기존 시트가 18열 이하로 줄어든 경우에도 제출ID 열을 먼저 확보
    try { if (sheet.getMaxColumns && sheet.getMaxColumns() < 19) sheet.insertColumnsAfter(sheet.getMaxColumns(), 19 - sheet.getMaxColumns()); } catch(_eCols) {}
    if (sheet.getLastColumn() < 16) sheet.getRange(1, 16).setValue("선생님");
    if (sheet.getLastColumn() < 17) sheet.getRange(1, 17).setValue("폴더ID");
    if (sheet.getLastColumn() < 18) sheet.getRange(1, 18).setValue("주관식상세");
    if (sheet.getLastColumn() < 19) sheet.getRange(1, 19).setValue("제출ID");
    var rows = sheet.getDataRange().getValues();
    var nameQ = String(data.name || "").trim();
    var phoneQ = String(data.phone || "").trim();
    var examQ = String(data.examName || "").trim();
    var dateQ = String(data.date || "").trim();
    var submitIdQ = String(data.submitId || data.clientSubmitId || "").trim();
    // 가장 최근 행 찾기 (같은 학생+시험+날짜)
    // ★ v27.27 (2026-05-30): submitId 가 있으면 반드시 같은 제출 행만 갱신
    // 중복 제출/저장 실패 등으로 새 submitId 행이 없으면 기존 행을 오염시키지 않는다.
    for (var i = rows.length - 1; i >= 1; i--) {
      var r = rows[i];
      if (submitIdQ) {
        if (String(r[18]||"").trim() !== submitIdQ) continue;
      } else {
        if (String(r[1]||"").trim() !== nameQ) continue;
        if (phoneQ && String(r[2]||"").trim() !== phoneQ) continue;
        if (String(r[7]||"").trim() !== examQ) continue;
        if (dateQ && String(r[8]||"").trim() !== dateQ) continue;
      }
      // 점수/정답/오답/틀린문항 갱신
      sheet.getRange(i+1, 10).setValue(Number(data.score) || 0);
      sheet.getRange(i+1, 11).setValue(Number(data.correct) || 0);
      // ★ v27.25 (2026-05-30): 부분정답도 복습/검토 문항에 포함
      // 학생앱 구버전은 wrongQuestions 에 부분정답을 빼고 보낼 수 있으므로, R열 상세에서 보강한다.
      if (data.subjectiveDetails) {
        var detailStr = typeof data.subjectiveDetails === "string"
          ? data.subjectiveDetails
          : JSON.stringify(data.subjectiveDetails);
        var wq = data.wrongQuestions;
        var reviewSet = {};
        if (Array.isArray(wq)) {
          wq.forEach(function(q){ var n = Number(q); if (!isNaN(n) && n > 0) reviewSet[n] = true; });
        } else {
          String(wq || "").split(",").forEach(function(q){ var n = Number(String(q).trim()); if (!isNaN(n) && n > 0) reviewSet[n] = true; });
        }
        try {
          var detailArr = JSON.parse(detailStr);
          if (Array.isArray(detailArr)) {
            detailArr.forEach(function(d){
              var qn = Number(d && d.q);
              var sc = Number(d && d.score);
              if (!isNaN(qn) && qn > 0 && !isNaN(sc) && sc < 100) reviewSet[qn] = true;
            });
          }
        } catch(_eDetail) {}
        var reviewQs = Object.keys(reviewSet).map(function(q){ return Number(q); }).filter(function(q){ return !isNaN(q); }).sort(function(a,b){ return a-b; });
        sheet.getRange(i+1, 12).setValue(Math.max(Number(data.wrong) || 0, reviewQs.length));
        sheet.getRange(i+1, 14).setValue(reviewQs.length > 0 ? reviewQs.join(", ") : "");
        // ★ v25.2: 채점상세는 R열(18) 에 저장 — P열은 절대 건드리지 X
        sheet.getRange(i+1, 18).setValue(detailStr);
      } else {
        sheet.getRange(i+1, 12).setValue(Number(data.wrong) || 0);
        var wq = data.wrongQuestions;
        var wqStr = Array.isArray(wq) ? wq.join(", ") : String(wq||"");
        sheet.getRange(i+1, 14).setValue(wqStr);
      }
      Logger.log("[saveSubjectiveGrade] 행 " + (i+1) + " 갱신 — " + nameQ + " " + examQ + " → " + data.score + "점");
      // ★ v27.17 (2026-05-30): 주관식 채점결과 저장 후 반별성적 캐시 무효화 (Fix #3로 주관식 점수가 통계에 반영되므로)
      clearClassGradesCache_();
      return jsonOut_({result:"success", rowIndex: i+1, score: Number(data.score)||0});
    }
    return jsonOut_({result:"error", message: submitIdQ ? "학생답안 행을 찾지 못함: submitId=" + submitIdQ : "학생답안 행을 찾지 못함: " + nameQ + " / " + examQ});
  } catch(err) {
    Logger.log("[saveSubjectiveGrade] FATAL: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  } finally {
    // ★ v27.1: LockService 해제 (v27.1.1 — 잉여 중괄호 제거)
    try { _lk.releaseLock(); } catch(_eR){}
  }
}

// ★ v25.2 (2026-05-13): 손상된 학생답안기록 P열 복구 함수 (1회 실행)
//   기존 v25.1 saveSubjectiveGrade_ 가 P열(선생님)에 채점상세 JSON 을 덮어쓴 행 복구
//   - P열이 JSON 형태로 시작 (`[` 또는 `{`) → R열로 이동 + P열은 빈값으로
//   - 정답목록에서 매칭되는 선생님 이름 찾아서 P열에 다시 채워넣기
//
//   사용법: GAS 에디터 → 함수 드롭다운 → repairStudentTeacherColumn → ▶ 실행
function repairStudentTeacherColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("학생답안기록");
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log("학생답안기록 시트 비어있음");
    return;
  }
  // 컬럼 확장
  if (sheet.getLastColumn() < 18) {
    sheet.getRange(1, 16).setValue("선생님");
    sheet.getRange(1, 17).setValue("폴더ID");
    sheet.getRange(1, 18).setValue("주관식상세");
  }
  // 정답목록에서 (subject|grade|level|examType) → teacher 매핑 빌드
  var ansSh = ss.getSheetByName("정답목록");
  var teacherMap = {};
  if (ansSh && ansSh.getLastRow() > 1) {
    var aRows = ansSh.getDataRange().getValues();
    for (var ai = 1; ai < aRows.length; ai++) {
      var ar = aRows[ai];
      var key = String(ar[1]||"") + "|" + String(ar[2]||"") + "|"
              + String(ar[3]||"") + "|" + String(ar[4]||"");
      var te = String(ar[9]||"").trim();
      // 정답목록 J열에도 JSON 오염됐을 수 있으니 검증
      if (te && te.charAt(0) !== "[" && te.charAt(0) !== "{") {
        if (!teacherMap[key]) teacherMap[key] = te;
      }
    }
  }
  var rows = sheet.getDataRange().getValues();
  var repaired = 0;
  var moved = 0;
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var pVal = String(r[15] || "").trim();
    // P열이 JSON 시작 → 손상된 행
    if (pVal && (pVal.charAt(0) === "[" || pVal.charAt(0) === "{")) {
      // 1) R열로 이동 (이미 R열에 값 있으면 덮어쓰지 X)
      var rVal = String(r[17] || "").trim();
      if (!rVal) {
        sheet.getRange(i+1, 18).setValue(pVal);
        moved++;
      }
      // 2) P열은 정답목록에서 매칭되는 선생님으로 (없으면 빈값)
      var matchKey = String(r[4]||"") + "|" + String(r[5]||"") + "|"
                   + String(r[6]||"") + "|" + String(r[7]||"");
      var trueTe = teacherMap[matchKey] || "";
      sheet.getRange(i+1, 16).setValue(trueTe);
      repaired++;
    }
  }
  var msg = "✅ 학생답안기록 P열 복구 완료\n\n"
          + "· 손상 행 복구: " + repaired + "개\n"
          + "· R열로 이동된 채점상세: " + moved + "개\n\n"
          + "이제 반별 성적 + Top 7 PDF 에 정상적인 선생님 이름이 표시됩니다.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(_e) {}
  return { repaired: repaired, moved: moved };
}

// ★ v25.3 (2026-05-13): 정답목록 시트의 폴더 캐시 무효화 (대시보드 그룹핑/시험지만 문제 해결용)
//   문제: 우림쌤·강억쌤 시험에서 같은 폴더 안에 여러 시험의 docx 가 섞여 한 카드로 묶임
//   원인: 옛 캐시(S열)에 잘못된 files 배열 저장됨
//   해결: 영향받은 행의 S열 비우면 → 다음 dashboard 호출 시 새 코드로 재스캔
//
//   사용법:
//     GAS 에디터 → 함수 드롭다운 → invalidateFolderCacheForTeacher → ▶ 실행
//     기본 — 모든 행 캐시 비움. 특정 선생님만 비우려면 인자 수정.
function invalidateFolderCacheForTeacher() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  if (!sh || sh.getLastRow() <= 1) {
    Logger.log("정답목록 시트 비어있음");
    return;
  }
  // 모든 행의 S열(19) 비우기 → dashboard 호출 시 시험정보.txt 다시 읽음 (v25.1 로직 적용)
  var lastCol = sh.getLastColumn();
  var cleared = 0;
  if (lastCol >= 19) {
    var range = sh.getRange(2, 19, sh.getLastRow() - 1, 1);
    var vals = range.getValues();
    for (var i = 0; i < vals.length; i++) {
      if (vals[i][0]) { vals[i][0] = ""; cleared++; }
    }
    range.setValues(vals);
  }
  // CacheService 단기 캐시도 비움
  try {
    var cs = CacheService.getScriptCache();
    var folderIds = [];
    var nRange = sh.getRange(2, 14, sh.getLastRow() - 1, 1).getValues();
    for (var j = 0; j < nRange.length; j++) {
      var fid = String(nRange[j][0] || "").trim();
      if (fid && fid.indexOf(":") < 0) folderIds.push("fld_" + fid);
    }
    if (folderIds.length > 0) cs.removeAll(folderIds);
    // 대시보드 응답 캐시 (7일치) 무효화
    var nowDate = new Date();
    var dashKeys = [];
    for (var d = 0; d < 7; d++) {
      var dd = new Date(nowDate); dd.setDate(dd.getDate() - d);
      var ks = Utilities.formatDate(dd, "Asia/Seoul", "yyyy-MM-dd");
      dashKeys.push("dash_" + ks + "_");
      dashKeys.push("dash_" + ks.replace(/-/g, ".") + "_");
    }
    cs.removeAll(dashKeys);
  } catch(eC) {}
  var msg = "✅ 폴더 캐시 무효화 완료\n\n· S열(폴더메타JSON) 비움: " + cleared + "행\n· CacheService 캐시 제거\n· 대시보드 응답 캐시 제거\n\n다음 '오늘의 현황' 호출 시 새 코드로 재스캔됩니다.\n(시험정보.txt 기반 정답/시험지 정확 분류 + 미러 폴더 깨끗하게)";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(_e) {}
  return { cleared: cleared };
}

// ★ v25.3 (2026-05-13): 미러 폴더에서 다른 시험의 docx 제거 (수동 청소)
//   사용법: GAS 에디터 → 함수 드롭다운 → cleanMirrorFoldersExtraFiles → ▶ 실행
//   동작: 정답목록 각 행의 폴더ID 폴더를 열어, 폴더명에 들어있지 않은 시험의 파일 정리
function cleanMirrorFoldersExtraFiles() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  if (!sh || sh.getLastRow() <= 1) return;
  var rows = sh.getDataRange().getValues();
  var cleaned = 0;
  var foldersChecked = 0;
  for (var i = 1; i < rows.length; i++) {
    var fid = String(rows[i][13] || "").trim();
    if (!fid || fid.indexOf(":") >= 0) continue;
    try {
      var folder = DriveApp.getFolderById(fid);
      var folderName = folder.getName();  // 예: "19시00분_문제생성기_영어중2A반_exam_xxx"
      // baseName 추출 (마지막 토큰)
      var parts = folderName.split("_");
      var baseName = parts.length > 0 ? parts[parts.length - 1] : "";
      if (!baseName) continue;
      foldersChecked++;
      var ff = folder.getFiles();
      while (ff.hasNext()) {
        var file = ff.next();
        var fname = file.getName();
        if (fname === "시험정보.txt") continue;
        if (!/\.(docx?|pdf|hwpx?|pptx?)$/i.test(fname)) continue;
        // baseName 매치 안 되면 → 다른 시험 파일 → 휴지통 이동
        if (fname.indexOf(baseName) < 0) {
          try {
            file.setTrashed(true);
            cleaned++;
            Logger.log("[cleanMirror] " + folderName + " → 휴지통 이동: " + fname);
          } catch(_e) {}
        }
      }
    } catch(_eF) {}
  }
  var msg = "✅ 미러 폴더 청소 완료\n\n· 검사한 폴더: " + foldersChecked + "개\n· 휴지통 이동: " + cleaned + "개 파일\n\n이제 각 시험 카드에 본인 시험지·답지만 표시됩니다.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(_e) {}
  return { foldersChecked: foldersChecked, cleaned: cleaned };
}

// ★ v25.2: 정답목록 시트 J열(선생님)에 JSON 오염된 행 복구
//   매우 드문 경우지만 안전을 위해 동일 복구 함수 제공
function repairAnswerKeyTeacherColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("정답목록");
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log("정답목록 시트 비어있음");
    return;
  }
  var rows = sheet.getDataRange().getValues();
  var repaired = 0;
  for (var i = 1; i < rows.length; i++) {
    var jVal = String(rows[i][9] || "").trim();  // J열 = index 9 = 선생님
    if (jVal && (jVal.charAt(0) === "[" || jVal.charAt(0) === "{")) {
      sheet.getRange(i+1, 10).setValue("");  // 일단 비움 — 선생님이 직접 수정 또는 다음 업로드 시 채워짐
      repaired++;
    }
  }
  var msg = "✅ 정답목록 J열 복구 완료\n\n· 손상 행 복구: " + repaired + "개\n\n복구된 행의 선생님 컬럼은 비어있으니, 시트에서 직접 입력하거나 다음 업로드 시 자동 채워집니다.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(_e) {}
  return { repaired: repaired };
}

// ============================================================
// ★ v24.11 — Phase 3: 미니 시험 자동 추천 시스템
// ============================================================
// 학생이 시험 채점 후 약점 영역(정답률 < 80%) 자동 분석 → 미니 시험 큐 자동 등록
// + 보강시험현황 시트로 진행 상태 추적 (선생님앱이 조회)
//
// 흐름:
//   1) 학생앱이 시험 채점 후 → POST recommend_mini_exam (perQuestion 포함)
//   2) GAS가 약점 영역 추출 (객관식·주관식 별, 80% 미만)
//   3) 각 영역에 대해 문제생성큐 시트에 "추천보강" 행 등록 (questionCount=5)
//   4) 보강시험현황 시트에 학생별 추천 이력 저장 (상태=대기)
//   5) 클로드가 큐 처리 (v20 지침 — 미니 모드)
//   6) 학생이 미니 시험 풀면 → submit_mini_exam_result 호출 → 점수 저장
//   7) 선생님앱이 list_mini_exam_progress 조회 → 반별 현황 표시
//
// 시트 구조:
//   ─── 보강시험현황 ───
//   A 학생이름  B 학생전화  C 반(className)  D 본시험_examType  E 본시험_날짜
//   F 약점영역  G 추천일시  H 마감일시  I 미니시험_큐rowIndex  J 상태 (대기/완료/미완료)
//   K 점수  L 완료일시  M 비고
// ============================================================

function ensureMiniExamSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("보강시험현황");
  if (!sh) {
    sh = ss.insertSheet("보강시험현황");
    sh.appendRow([
      "학생이름", "학생전화", "반", "본시험_examType", "본시험_날짜",
      "약점영역", "추천일시", "마감일시", "정답목록_rowIndex", "상태",
      "점수", "완료일시", "비고", "문제JSON"   // ★ v24.13: N열 문제JSON 추가
    ]);
    sh.setFrozenRows(1);
  } else {
    // 옛 시트면 N열(14) 헤더 자동 추가
    if (sh.getLastColumn() < 14) {
      sh.getRange(1, 14).setValue("문제JSON");
    }
  }
  return sh;
}

// ★ v24.11: 학생 시험 채점 결과에서 약점 영역 추출
//   기준: 영역별 정답률 80% 미만 + 응시 문제 수 3개 이상
//   영역: 객관식·주관식 (Phase 1) — 추후 어법/단어/리딩 등 세분화 가능
function getWeakAreas_(perQuestion) {
  if (!Array.isArray(perQuestion) || perQuestion.length === 0) return [];
  var byType = { obj: {correct: 0, total: 0}, sub: {correct: 0, total: 0} };
  for (var i = 0; i < perQuestion.length; i++) {
    var p = perQuestion[i];
    var t = (p.type === "sub" || p.type === "sa" || p.type === "subjective") ? "sub" : "obj";
    byType[t].total += 1;
    if (p.verdict === "정답") byType[t].correct += 1;
  }
  var weak = [];
  ["obj", "sub"].forEach(function(t) {
    if (byType[t].total < 3) return;  // 응시 3개 미만이면 통계적 의미 X
    var pct = byType[t].correct / byType[t].total * 100;
    if (pct < 80) {
      weak.push({
        type: t,
        label: t === "obj" ? "객관식" : "주관식",
        pct: Math.round(pct),
        correct: byType[t].correct,
        total: byType[t].total
      });
    }
  });
  // 가장 약한 영역부터 정렬
  weak.sort(function(a, b) { return a.pct - b.pct; });
  return weak;
}

// ★ v24.13: 학생 시험 채점 결과에서 약점 영역 추출 — 플랫 페이로드 지원
//   학생앱 v23.9 가 보내는 형식 (flat: totalObj, oc, totalSub, subCorrect)
//   또는 옛 형식 (perQuestion 배열) 모두 지원
function getWeakAreasFromFlat_(data) {
  // 새 형식 (학생앱 v23.9): totalObj, oc, totalSub, subCorrect
  var weak = [];
  var totalObj = Number(data.totalObj || 0);
  var oc       = Number(data.oc || 0);
  var totalSub = Number(data.totalSub || 0);
  var subCorrect = Number(data.subCorrect || 0);
  if (totalObj >= 3) {
    var pctObj = Math.round((oc / totalObj) * 100);
    if (pctObj < 80) weak.push({type:"obj", label:"객관식", pct:pctObj, correct:oc, total:totalObj});
  }
  if (totalSub >= 3) {
    var pctSub = Math.round((subCorrect / totalSub) * 100);
    if (pctSub < 80) weak.push({type:"sub", label:"주관식", pct:pctSub, correct:subCorrect, total:totalSub});
  }
  weak.sort(function(a, b){ return a.pct - b.pct; });
  return weak;
}

// ★ v24.13: Vercel API 호출하여 5문항 생성
function generateMiniExamViaVercel_(payload) {
  try {
    var resp = UrlFetchApp.fetch(MINI_EXAM_API_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var text = resp.getContentText();
    if (code !== 200) {
      Logger.log("[generateMiniExamViaVercel_] HTTP " + code + ": " + text.slice(0, 300));
      return {ok:false, error:"HTTP " + code};
    }
    var json = JSON.parse(text);
    if (!json.ok) return {ok:false, error: json.error || "응답 ok=false"};
    return {ok:true, miniExam: json.miniExam};
  } catch (e) {
    Logger.log("[generateMiniExamViaVercel_] 오류: " + e);
    return {ok:false, error: String(e)};
  }
}

// ★ v24.13: 정답목록 시트에 미니 시험 자동 등록 (autoRegister=true)
//   학생앱이 정답목록에서 "추천보강" 시험을 조회하여 응시할 수 있도록 등록
function registerMiniExamAnswerKey_(miniExam, examMeta, studentName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  if (!sh) return null;
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var nowStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");

  // questions → answers/types JSON
  var answers = {};
  var types = {};
  var explanations = {};
  (miniExam.questions || []).forEach(function(q, i) {
    var n = q.number || (i + 1);
    answers[String(n)] = q.answer;
    types[String(n)] = q.type === "short_answer" ? "sub" : "obj";
    explanations[String(n)] = {
      question: q.question || "",
      answer: q.answer,
      stage: q.stage || "",
      explanation: q.explanation || "",
      choiceExplanations: q.choiceExplanations || null,
      gradingGuide: q.gradingGuide || null,
      choices: q.choices || null
    };
  });

  var roundLabel = (miniExam.miniInfo && miniExam.miniInfo.weakArea) || "약점 보강";
  var row = [
    nowStr,                                                              // A 등록일시
    examMeta.subject || "",                                              // B 과목
    examMeta.grade || "",                                                // C 학년
    examMeta.level || "",                                                // D 레벨
    "추천보강",                                                          // E 시험종류 (★ v20)
    roundLabel + " · " + studentName,                                    // F 차수
    (miniExam.questions || []).length,                                   // G 문항수
    JSON.stringify(answers),                                             // H 정답JSON
    JSON.stringify(types),                                               // I 유형JSON
    examMeta.teacher || "",                                              // J 선생님
    1,                                                                   // K 예상인원 (학생 본인만)
    examMeta.className || (examMeta.subject + " " + examMeta.grade + " " + examMeta.level + "반"),  // L 대상반
    Utilities.formatDate(new Date(), tz, "yyyy.MM.dd"),                  // M 시험날짜
    "",                                                                  // N 폴더ID (없음)
    1,                                                                   // O 시작번호
    "",                                                                  // P 검수
    "AUTO_OK",                                                           // Q 검수상태
    "",                                                                  // R 문항맵
    "",                                                                  // S 폴더메타JSON
    JSON.stringify(explanations)                                         // T 오답분석JSON (v24.10)
  ];
  sh.appendRow(row);
  var rowIndex = sh.getLastRow();
  return rowIndex;
}

// ★ v24.13: 미니 시험 자동 추천 (Vercel API 실시간 호출 방식)
//   변경점: 큐 등록 → Vercel API 호출 → 정답목록 + 보강시험현황 즉시 등록
//   학생이 채점 직후 1~2분 안에 응시 가능
function recommendMiniExam_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";

    // ★ v24.13: 플랫 페이로드 (학생앱 v23.9) + 옛 페이로드 모두 지원
    var studentName, studentPhone, examMeta;
    if (data.student && typeof data.student === "object") {
      // 옛 형식
      studentName = data.student.name || "";
      studentPhone = data.student.phone || "";
      examMeta = data.exam || {};
    } else {
      // 새 형식 (학생앱 v23.9)
      studentName = String(data.student || "").trim();
      studentPhone = String(data.phone || "").trim();
      examMeta = {
        subject: data.subject || "",
        grade: data.grade || "",
        level: data.level || "",
        examType: data.examType || "",
        teacher: data.teacher || "",
        folderId: data.folderId || "",
        className: data.className || (data.subject + " " + data.grade + " " + data.level + "반"),
        date: Utilities.formatDate(new Date(), tz, "yyyy.MM.dd"),
        textbook: data.textbook || "",
        range: data.range || ""
      };
    }

    if (!studentName) return jsonOut_({result:"error", message:"학생 이름 누락"});
    if (!examMeta.subject || !examMeta.grade) {
      return jsonOut_({result:"error", message:"시험 정보 누락 (subject/grade)"});
    }

    // 1) 약점 영역 추출
    var weakAreas = [];
    if (Array.isArray(data.perQuestion) && data.perQuestion.length > 0) {
      weakAreas = getWeakAreas_(data.perQuestion);
    } else {
      weakAreas = getWeakAreasFromFlat_(data);
    }
    if (weakAreas.length === 0) {
      return jsonOut_({result:"ok", queued: [], message: "약점 없음 — 보강 시험 불필요"});
    }
    // 약점 4개 이상이면 가장 약한 2개만 (실시간 생성 — Gemini 비용 + 학생 부담 관리)
    if (weakAreas.length > 2) weakAreas = weakAreas.slice(0, 2);

    var miniSh = ensureMiniExamSheet_();
    var now = new Date();
    var deadline = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    var nowStr = Utilities.formatDate(now, tz, "yyyy-MM-dd HH:mm:ss");
    var deadlineStr = Utilities.formatDate(deadline, tz, "yyyy-MM-dd HH:mm:ss");
    var wrongQs = Array.isArray(data.wrongQuestions) ? data.wrongQuestions : [];

    var generated = [];
    weakAreas.forEach(function(w) {
      // 2) Vercel API 호출 (Gemini 2.5 Flash) — 5문항 즉시 생성
      var apiPayload = {
        student: studentName,
        subject: examMeta.subject,
        grade: examMeta.grade,
        level: examMeta.level,
        examType: examMeta.examType,
        weakArea: w.label,
        weakPct: w.pct,
        textbook: examMeta.textbook,
        range: examMeta.range,
        wrongQuestions: wrongQs
      };
      var apiRes = generateMiniExamViaVercel_(apiPayload);
      if (!apiRes.ok) {
        generated.push({area:w.label, weakPct:w.pct, error: apiRes.error});
        return;  // 이 영역은 실패 — 다음 영역으로
      }
      var miniExam = apiRes.miniExam;

      // 3) 정답목록 시트에 즉시 등록 (학생앱이 응시 가능)
      var answerKeyRow = registerMiniExamAnswerKey_(miniExam, examMeta, studentName);

      // 4) 보강시험현황 시트에 학생별 추적 (questions JSON 포함)
      miniSh.appendRow([
        studentName,                                                  // A 학생이름
        studentPhone,                                                 // B 학생전화
        examMeta.className || "",                                     // C 반
        examMeta.examType || "",                                      // D 본시험_examType
        examMeta.date || "",                                          // E 본시험_날짜
        w.label + " (정답률 " + w.pct + "%)",                          // F 약점영역
        nowStr,                                                       // G 추천일시
        deadlineStr,                                                  // H 마감일시
        answerKeyRow || "",                                           // I 정답목록_rowIndex
        "대기",                                                       // J 상태
        "",                                                           // K 점수
        "",                                                           // L 완료일시
        "Gemini 자동 생성 · " + w.correct + "/" + w.total + "문제 맞춤", // M 비고
        JSON.stringify(miniExam.questions || [])                       // N 문제JSON (★ v24.13)
      ]);
      var miniRow = miniSh.getLastRow();

      generated.push({
        id: miniRow,
        area: w.label,
        weakPct: w.pct,
        questionCount: (miniExam.questions || []).length,
        answerKeyRow: answerKeyRow
      });
    });

    var hadError = generated.some(function(g){return g.error;});
    return jsonOut_({
      result: hadError && generated.length === weakAreas.length && !generated.some(function(g){return !g.error;}) ? "error" : "ok",
      generated: generated,
      message: "보강 시험 " + generated.filter(function(g){return !g.error;}).length + "개 생성 완료"
                + (hadError ? " (일부 영역 생성 실패)" : "")
    });
  } catch (err) {
    Logger.log("[recommendMiniExam_] 오류: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ★ v24.13: 학생이 미니 시험 풀이 완료 후 점수 저장
//   학생앱 v23.9 페이로드: {miniExamId, student, phone, score, correct, total, answers, details, autoSubmit}
//   옛 페이로드 (miniSheetRow + studentName + queueRowIndex) 도 지원
function submitMiniExamResult_(data) {
  try {
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";

    var miniSh = ensureMiniExamSheet_();
    if (!miniSh || miniSh.getLastRow() <= 1) return jsonOut_({result:"error", message:"보강시험현황 비어있음"});

    var nowStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");
    var score = Number(data.score || 0);
    // ★ v23.9 학생앱: studentName 대신 student / miniExamId 사용
    var studentName = String(data.studentName || data.student || "").trim();
    var miniExamId = parseInt(data.miniExamId || data.miniSheetRow || 0, 10);

    var targetRow = -1;
    if (miniExamId >= 2 && miniExamId <= miniSh.getLastRow()) {
      targetRow = miniExamId;
    } else if (studentName) {
      // 학생 이름으로 가장 최근 "대기" 행 찾기
      var rows = miniSh.getDataRange().getValues();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]).trim() === studentName
            && String(rows[i][9] || "").trim() === "대기") {
          targetRow = i + 1;
          break;
        }
      }
    }
    if (targetRow < 2) return jsonOut_({result:"error", message:"보강시험 행을 찾을 수 없음"});

    miniSh.getRange(targetRow, 10).setValue("완료");
    miniSh.getRange(targetRow, 11).setValue(score);
    miniSh.getRange(targetRow, 12).setValue(nowStr);

    // ★ v24.13: autoSubmit (시간초과) 인 경우 비고에 표시
    if (data.autoSubmit) {
      var prevNote = String(miniSh.getRange(targetRow, 13).getValue() || "");
      miniSh.getRange(targetRow, 13).setValue(prevNote + " · ⏰ 시간초과 자동제출");
    }

    return jsonOut_({result:"ok", row: targetRow, score: score});
  } catch (err) {
    Logger.log("[submitMiniExamResult_] 오류: " + err);
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ★ v24.11: 반별 보강 시험 진행 현황 조회 (선생님앱이 호출)
//   ?action=list_mini_exam_progress&className=영어 중2 A반&date=2026-05-13
function listMiniExamProgress_(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("보강시험현황");
    if (!sh || sh.getLastRow() <= 1) return jsonOut_({result:"ok", items: []});

    var qClass = String(e.parameter.className || "").trim();
    var qDate = String(e.parameter.date || "").trim();
    var qStudent = String(e.parameter.student || "").trim();
    var qPhone = String(e.parameter.phone || "").trim();  // ★ v24.13: 학생 본인 인증

    var rows = sh.getDataRange().getValues();
    var items = [];
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    var nowTime = Date.now();

    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var rClass = String(r[2] || "").trim();
      var rDate = String(r[4] || "").trim();
      var rStudent = String(r[0] || "").trim();

      if (qClass && rClass !== qClass) continue;
      if (qDate) {
        var qDateAlt = qDate.replace(/-/g, ".");
        if (rDate.indexOf(qDate) === -1 && rDate.indexOf(qDateAlt) === -1) continue;
      }
      if (qStudent && rStudent !== qStudent) continue;
      // ★ v24.13: 학생 본인 인증 — phone 일치 필수 (다른 학생 시험 노출 방지)
      if (qPhone) {
        var rPhone = String(r[1] || "").trim();
        if (rPhone && rPhone !== qPhone) continue;
      }

      // 마감 임박 표시
      var status = String(r[9] || "대기").trim();
      var deadlineRaw = String(r[7] || "").trim();
      var daysLeft = null;
      if (deadlineRaw) {
        try {
          var dl = new Date(deadlineRaw);
          if (!isNaN(dl.getTime())) {
            daysLeft = Math.ceil((dl.getTime() - nowTime) / (24 * 3600 * 1000));
          }
        } catch(eD) {}
      }

      var item = {
        id: i + 1,                                                  // ★ v24.13: 학생앱이 사용 (rowIndex 와 동일)
        rowIndex: i + 1,
        studentName: rStudent,
        studentPhone: String(r[1] || ""),
        className: rClass,
        subject: rClass ? String(rClass).split(/\s+/)[0] : "",       // ★ v24.13: 학생앱 배지·미니화면 표시용
        weakArea: String(r[5] || "").replace(/\s*\(.*\)\s*$/, ""),   // "객관식 (정답률 60%)" → "객관식"
        weakPct: (function(){
          var m = String(r[5] || "").match(/(\d+)%/);
          return m ? Number(m[1]) : null;
        })(),
        examType: String(r[3] || ""),
        examDate: rDate,
        recommendedAt: String(r[6] || ""),
        deadline: deadlineRaw,
        daysLeft: daysLeft,
        answerKeyRow: Number(r[8]) || 0,
        status: status,
        score: r[10] !== "" && r[10] !== null && r[10] !== undefined ? Number(r[10]) : null,
        completedAt: String(r[11] || ""),
        note: String(r[12] || "")
      };

      // ★ v24.13: 학생 본인 쿼리 시 questions JSON 함께 반환 (응시 화면용)
      if (qStudent && rStudent === qStudent && r.length >= 14) {
        var qJson = String(r[13] || "").trim();
        if (qJson) {
          try { item.questions = JSON.parse(qJson); }
          catch (eJ) { item.questions = []; }
        }
      }

      items.push(item);
    }

    // 미완료 우선, 그 다음 완료, 같은 그룹 안에서 최근순
    items.sort(function(a, b) {
      if (a.status !== b.status) {
        // 대기 > 완료 (대기를 위로)
        if (a.status === "대기") return -1;
        if (b.status === "대기") return 1;
      }
      return b.recommendedAt.localeCompare(a.recommendedAt);
    });

    // 요약 통계
    var summary = {
      total: items.length,
      waiting: items.filter(function(it){return it.status === "대기";}).length,
      completed: items.filter(function(it){return it.status === "완료";}).length,
      missed: items.filter(function(it){return it.status === "미완료";}).length,
      avgScore: 0
    };
    var doneScores = items.filter(function(it){return it.status === "완료" && it.score !== null;}).map(function(it){return it.score;});
    if (doneScores.length > 0) {
      summary.avgScore = Math.round(doneScores.reduce(function(a, b){return a+b;}, 0) / doneScores.length);
    }

    return jsonOut_({result: "ok", items: items, summary: summary});
  } catch (err) {
    Logger.log("[listMiniExamProgress_] 오류: " + err);
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ============================================================
// ★ v25.4 (2026-05-13) — AI 영역 분석 + 즉시 풀이 생성 + 강제 재스캔
// ============================================================

// ★ v25.4: 시험 문항을 문법/어휘/독해 등 영역으로 자동 분류
//   POST: action=analyze_exam_categories  body: { folderId } 또는 { subject, grade, level, examType }
//   동작: Vercel API 호출 → 정답목록 U열(인덱스 19+1=20)에 categoriesJSON 저장
function analyzeExamCategories_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh || sh.getLastRow() <= 1) {
      return jsonOut_({result:"error", message:"정답목록 시트 비어있음"});
    }
    // U열(21번째) 헤더 보장
    if (sh.getLastColumn() < 21) {
      sh.getRange(1, 21).setValue("카테고리JSON");
    }
    var folderId = String(data.folderId || "").trim();
    var subject = String(data.subject || "").trim();
    var grade = String(data.grade || "").trim();
    var level = String(data.level || "").trim();
    var examType = String(data.examType || "").trim();
    var force = !!data.force;

    var rows = sh.getDataRange().getValues();
    var targetRow = -1;
    var targetData = null;

    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (folderId) {
        if (String(r[13]||"").trim() === folderId) { targetRow = i+1; targetData = r; break; }
      } else if (subject && grade && examType) {
        if (String(r[1]||"") === subject && String(r[2]||"") === grade
            && (!level || String(r[3]||"") === level)
            && String(r[4]||"") === examType) {
          targetRow = i+1; targetData = r; break;
        }
      }
    }
    if (targetRow < 0 || !targetData) {
      return jsonOut_({result:"error", message:"매칭되는 시험 행 없음"});
    }

    var existingCat = String(targetData[20] || "").trim();
    if (existingCat && !force) {
      try { return jsonOut_({result:"ok", cached:true, categories: JSON.parse(existingCat)}); }
      catch(_e){}
    }

    var answers = {}, types = {}, explanations = {};
    try { answers = JSON.parse(targetData[7] || "{}"); } catch(_e){}
    try { types = JSON.parse(targetData[8] || "{}"); } catch(_e){}
    try { explanations = JSON.parse(targetData[19] || "{}"); } catch(_e){}

    var totalQ = Number(targetData[6]) || Object.keys(answers).length;
    var questions = [];
    for (var qn = 1; qn <= totalQ; qn++) {
      var qk = String(qn);
      var qExpl = explanations[qk] || {};
      questions.push({
        number: qn,
        question: qExpl.question || "",
        answer: answers[qk] !== undefined ? answers[qk] : "",
        choices: qExpl.choices || null,
        type: types[qk] === "sub" ? "sub" : "obj"
      });
    }
    if (questions.length === 0) {
      return jsonOut_({result:"error", message:"문항 데이터 없음"});
    }

    var apiPayload = {
      subject: String(targetData[1] || ""),
      grade: String(targetData[2] || ""),
      examType: String(targetData[4] || ""),
      questions: questions
    };
    var resp = UrlFetchApp.fetch(ANALYZE_CATEGORIES_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(apiPayload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var text = resp.getContentText();
    if (code !== 200) {
      return jsonOut_({result:"error", message:"Vercel API HTTP " + code + ": " + text.slice(0,200)});
    }
    var json = JSON.parse(text);
    if (!json.ok) {
      return jsonOut_({result:"error", message: json.error || "분석 실패"});
    }
    var categoriesJson = JSON.stringify(json.categories);
    sh.getRange(targetRow, 21).setValue(categoriesJson);
    return jsonOut_({
      result: "ok",
      categories: json.categories,
      summary: json.summary,
      savedRow: targetRow
    });
  } catch (err) {
    Logger.log("[analyzeExamCategories_] 오류: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ★ v25.4: 객관식 풀이 즉시 생성 (정답목록 T열 explanations 없는 옛 시험용)
//   POST: action=generate_explanations
//   body: { folderId 또는 subject+grade+level+examType, questionNumbers: [1,4,7] }
//   학생앱 정오표 클릭 시 호출 → Gemini 풀이 받아 즉석 표시 + T열 캐시
function generateExplanationsOnDemand_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh || sh.getLastRow() <= 1) {
      return jsonOut_({result:"error", message:"정답목록 시트 비어있음"});
    }
    var folderId = String(data.folderId || "").trim();
    var subject = String(data.subject || "").trim();
    var grade = String(data.grade || "").trim();
    var level = String(data.level || "").trim();
    var examType = String(data.examType || "").trim();
    var qNums = Array.isArray(data.questionNumbers) ? data.questionNumbers.map(Number) : [];
    if (qNums.length === 0) {
      return jsonOut_({result:"error", message:"questionNumbers 비어있음"});
    }
    if (qNums.length > 20) qNums = qNums.slice(0, 20);

    var rows = sh.getDataRange().getValues();
    var targetRow = -1;
    var targetData = null;
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (folderId) {
        if (String(r[13]||"").trim() === folderId) { targetRow = i+1; targetData = r; break; }
      } else if (subject && grade && examType) {
        if (String(r[1]||"") === subject && String(r[2]||"") === grade
            && (!level || String(r[3]||"") === level)
            && String(r[4]||"") === examType) {
          targetRow = i+1; targetData = r; break;
        }
      }
    }
    if (targetRow < 0 || !targetData) {
      return jsonOut_({result:"error", message:"매칭되는 시험 행 없음"});
    }

    var answers = {}, explanations = {};
    try { answers = JSON.parse(targetData[7] || "{}"); } catch(_e){}
    try { explanations = JSON.parse(targetData[19] || "{}"); } catch(_e){ explanations = {}; }

    // 풀이 필요한 문항만 (이미 choiceExplanations 있으면 skip)
    var needGen = [];
    qNums.forEach(function(n){
      var ex = explanations[String(n)] || {};
      if (!ex.choiceExplanations) {
        needGen.push({
          number: n,
          question: ex.question || "",
          answer: answers[String(n)] !== undefined ? answers[String(n)] : "",
          choices: ex.choices || null
        });
      }
    });
    if (needGen.length === 0) {
      return jsonOut_({result:"ok", cached: true, explanations: explanations});
    }

    var apiPayload = {
      subject: String(targetData[1] || ""),
      grade: String(targetData[2] || ""),
      questions: needGen
    };
    var resp = UrlFetchApp.fetch(GENERATE_EXPLANATIONS_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(apiPayload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var text = resp.getContentText();
    if (code !== 200) {
      return jsonOut_({result:"error", message:"Vercel API HTTP " + code + ": " + text.slice(0,200)});
    }
    var json = JSON.parse(text);
    if (!json.ok) {
      return jsonOut_({result:"error", message: json.error || "생성 실패"});
    }
    // 기존 explanations 와 merge
    Object.keys(json.explanations).forEach(function(k){
      if (!explanations[k]) explanations[k] = {};
      if (json.explanations[k].explanation) explanations[k].explanation = json.explanations[k].explanation;
      if (json.explanations[k].choiceExplanations) explanations[k].choiceExplanations = json.explanations[k].choiceExplanations;
    });
    // T열(20=index 19) 저장
    if (sh.getLastColumn() < 20) sh.getRange(1, 20).setValue("오답분석JSON");
    sh.getRange(targetRow, 20).setValue(JSON.stringify(explanations));
    return jsonOut_({result:"ok", explanations: explanations, generated: needGen.length});
  } catch (err) {
    Logger.log("[generateExplanationsOnDemand_] 오류: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ★ v25.4: 자동 등록 강제 재스캔 — 처리완료 마커 제거 + scanExamGenResultsFolder_ 즉시 실행
//   POST {action: "force_rescan_exam_gen", date: "2026.05.12", teacher: "이새나"}
//   또는 GAS 에디터에서 forceRescanExamGenManual() 직접 실행
function forceRescanExamGen_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var roots = DriveApp.getFoldersByName("채움학원 시험자료");
    if (!roots.hasNext()) return jsonOut_({result:"error", message:"채움학원 시험자료 폴더 없음"});
    var root = roots.next();
    var egIter = root.getFoldersByName("문제생성결과");
    if (!egIter.hasNext()) return jsonOut_({result:"error", message:"문제생성결과 폴더 없음"});
    var egRoot = egIter.next();

    var qDate = String((data && data.date) || "").trim();
    var qTeacher = String((data && data.teacher) || "").trim();
    var removed = 0;
    var dateFolders = egRoot.getFolders();
    while (dateFolders.hasNext()) {
      var df = dateFolders.next();
      var dn = df.getName();
      if (qDate && dn !== qDate) continue;
      removed += _renameRemoveCompletedMarker_(df, qTeacher);
      var subs = df.getFolders();
      while (subs.hasNext()) {
        var ts = subs.next();
        if (qTeacher && ts.getName() !== qTeacher) continue;
        removed += _renameRemoveCompletedMarker_(ts, "");
      }
    }
    // 즉시 재스캔
    var ansSh = ss.getSheetByName("정답목록");
    var logSh = ss.getSheetByName("자동등록로그") || ss.insertSheet("자동등록로그");
    scanExamGenResultsFolder_(root, ansSh, logSh);
    return jsonOut_({result:"ok", markersRemoved: removed, message: "강제 재스캔 완료 — 자동등록로그 시트에서 결과 확인"});
  } catch (err) {
    Logger.log("[forceRescanExamGen_] 오류: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// 헬퍼: 폴더 내 _처리완료_ 마커가 붙은 JSON 파일명에서 마커 제거
function _renameRemoveCompletedMarker_(folder, teacherFilter) {
  var n = 0;
  try {
    var ff = folder.getFiles();
    while (ff.hasNext()) {
      var f = ff.next();
      var name = f.getName();
      if (!/\.json$/i.test(name)) continue;
      if (name.indexOf("_처리완료_") < 0) continue;
      var newName = name.replace(/_처리완료_\d{8}_\d{6}/, "");
      try { f.setName(newName); n++; } catch(_e){}
    }
  } catch(_eFF){}
  return n;
}

// GAS 에디터에서 직접 호출용 (모든 처리완료 시험 강제 재처리)
function forceRescanExamGenManual() {
  var result = forceRescanExamGen_({date: "", teacher: ""});
  var msg = "강제 재스캔 결과:\n" + result.getContent();
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(_e){}
}

// ★ v25.4: view_answer_key 응답에 categories 도 포함하도록 확장
//   (이미 explanations 는 v24.10에서 포함됨)
//   학생앱이 결과 화면에서 카테고리별 정답률 표시할 때 사용

// ★ v25.5 (2026-05-13): 시험 날짜 수정 — 잘못 올린 날짜 (예: 내일 → 오늘)
// ★ v25.7 (2026-05-13): 시간도 함께 수정 가능 (newTime: "19:00")
//   입력: {action:"update_exam_date", rowIndex 또는 folderId, newDate: "2026-05-14", newTime: "19:00"}
//   동작:
//     - 정답목록 M열(13) 시험날짜 수정
//     - 폴더명에 시간이 포함됐다면(예: "19시00분_시험_..."), 새 시간으로 이름 변경
//     - 폴더메타JSON(S열) 의 examTime도 갱신
//     - 캐시 무효화
function updateExamDate_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh || sh.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 시트 비어있음"});
    var newDate = String(data.newDate || "").trim();
    var newTime = String(data.newTime || "").trim();  // ★ v25.7: 시간도 함께
    if (!newDate) return jsonOut_({result:"error", message:"newDate 필수"});
    var normDate = newDate.replace(/-/g, ".");
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(normDate)) {
      return jsonOut_({result:"error", message:"날짜 형식 오류 (YYYY-MM-DD 또는 YYYY.MM.DD)"});
    }
    var normTime = "";
    if (newTime) {
      // "19:00" 또는 "19시 00분" → "19:00"
      var tm = newTime.match(/(\d{1,2})[^\d]*(\d{2})/);
      if (tm) {
        normTime = ("0"+tm[1]).slice(-2) + ":" + tm[2];
      } else {
        return jsonOut_({result:"error", message:"시간 형식 오류 (HH:MM)"});
      }
    }
    var rowIndex = parseInt(data.rowIndex || 0, 10);
    var folderId = String(data.folderId || "").trim();
    var targetRow = -1;
    if (rowIndex >= 2 && rowIndex <= sh.getLastRow()) {
      targetRow = rowIndex;
    } else if (folderId) {
      var rows = sh.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][13]||"").trim() === folderId) { targetRow = i+1; break; }
      }
    }
    if (targetRow < 2) return jsonOut_({result:"error", message:"수정할 행을 찾을 수 없음"});

    var oldDate = String(sh.getRange(targetRow, 13).getValue() || "");
    sh.getRange(targetRow, 13).setValue(normDate);

    // ★ v25.7: 시간도 변경 — 폴더명 + 폴더메타JSON 의 examTime 갱신
    var oldTime = "";
    if (normTime) {
      var rowFolderId = String(sh.getRange(targetRow, 14).getValue() || "").trim();
      if (rowFolderId && rowFolderId.indexOf(":") < 0) {
        try {
          var folder = DriveApp.getFolderById(rowFolderId);
          var folderName = folder.getName();
          // 폴더명에서 옛 시간 추출 ("19시00분_시험_...")
          var fm = folderName.match(/^(\d{1,2})시(\d{2})분_/);
          if (fm) {
            oldTime = ("0"+fm[1]).slice(-2) + ":" + fm[2];
            var newPrefix = normTime.replace(":","시") + "분_";
            var newFolderName = folderName.replace(/^\d{1,2}시\d{2}분_/, newPrefix);
            if (newFolderName !== folderName) {
              try { folder.setName(newFolderName); } catch(_eR){}
            }
          }
        } catch(_eF){}
      }
      // 폴더메타JSON 의 examTime 갱신
      try {
        var metaCell = sh.getRange(targetRow, 19);
        var metaRaw = String(metaCell.getValue() || "");
        if (metaRaw) {
          var meta = JSON.parse(metaRaw);
          meta.examTime = normTime;
          metaCell.setValue(JSON.stringify(meta));
        }
      } catch(_eM){}
    }

    // 대시보드 캐시 무효화
    try {
      var cs = CacheService.getScriptCache();
      var keysToClear = [];
      [oldDate, normDate].forEach(function(d){
        if (!d) return;
        var k1 = d.replace(/\./g, "-");
        var k2 = d.replace(/-/g, ".");
        keysToClear.push("dash_" + k1 + "_");
        keysToClear.push("dash_" + k2 + "_");
      });
      cs.removeAll(keysToClear);
    } catch(_eC) {}

    return jsonOut_({result:"ok", rowIndex: targetRow, oldDate: oldDate, newDate: normDate, oldTime: oldTime, newTime: normTime});
  } catch (err) {
    Logger.log("[updateExamDate_] 오류: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ★ v25.9 (2026-05-13): 시험지 PDF에서 문항 본문 추출
//   입력: { folderId, questionNumbers: [2,5,9,12] }
//   동작:
//     1) folderId 의 시험지 PDF 찾음 (정답/답지/답안 키워드 없는 첫 PDF)
//     2) Vercel API 호출 (Gemini 2.5 Flash 가 PDF에서 본문+선택지 추출)
//     3) 정답목록 T열(20) 오답분석JSON 에 question + choices 병합 저장
//     4) 응답으로 explanations 반환 (학생앱·Top 7 PDF 즉시 표시)
function extractQuestionsFromExamPdf_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    if (!sh || sh.getLastRow() <= 1) return jsonOut_({result:"error", message:"정답목록 시트 비어있음"});

    var folderId = String(data.folderId || "").trim();
    var qNums = Array.isArray(data.questionNumbers) ? data.questionNumbers.map(Number).filter(function(n){return n>0;}) : [];
    if (!folderId) return jsonOut_({result:"error", message:"folderId 필수"});
    if (qNums.length === 0) return jsonOut_({result:"error", message:"questionNumbers 비어있음"});
    if (qNums.length > 20) qNums = qNums.slice(0, 20);

    // 정답목록 행 찾기 (folderId 기준)
    var rows = sh.getDataRange().getValues();
    var targetRow = -1;
    var targetData = null;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][13]||"").trim() === folderId) { targetRow = i+1; targetData = rows[i]; break; }
    }
    if (targetRow < 0) return jsonOut_({result:"error", message:"folderId 매칭 행 없음"});

    // 시험지 PDF 파일 찾기 (정답/답지/답안 키워드 안 들어간 PDF)
    var folder;
    try { folder = DriveApp.getFolderById(folderId); }
    catch(_eF) { return jsonOut_({result:"error", message:"폴더 접근 실패"}); }
    var examPdfFile = null;
    var ff = folder.getFiles();
    while (ff.hasNext()) {
      var f = ff.next();
      var fname = f.getName();
      if (!/\.pdf$/i.test(fname)) continue;
      // 시험정보.txt 또는 정답.json 제외
      if (fname === "시험정보.txt" || /^정답\.json/.test(fname)) continue;
      // 정답·답지·답안 키워드 있으면 답지로 보고 skip
      if (/(정답|답지|답안|해설|풀이|answer|solution)/i.test(fname)) continue;
      examPdfFile = f;
      break;
    }
    if (!examPdfFile) return jsonOut_({result:"error", message:"시험지 PDF 파일 없음 (이름에 '정답' 키워드 없는 PDF)"});

    // Vercel API 호출
    var pdfBase64 = Utilities.base64Encode(examPdfFile.getBlob().getBytes());
    var apiPayload = {
      subject: String(targetData[1] || ""),
      grade: String(targetData[2] || ""),
      pdfBase64: pdfBase64,
      questionNumbers: qNums
    };
    var resp = UrlFetchApp.fetch(EXTRACT_QUESTION_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(apiPayload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var text = resp.getContentText();
    if (code !== 200) {
      return jsonOut_({result:"error", message:"Vercel API HTTP " + code + ": " + text.slice(0,200)});
    }
    var json = JSON.parse(text);
    if (!json.ok) return jsonOut_({result:"error", message: json.error || "추출 실패"});

    // 기존 explanations 와 merge (T열 = 20)
    var explanations = {};
    try { explanations = JSON.parse(String(targetData[19] || "{}")); } catch(_e) { explanations = {}; }
    Object.keys(json.questions).forEach(function(k){
      if (!explanations[k]) explanations[k] = {};
      if (json.questions[k].question) explanations[k].question = json.questions[k].question;
      if (Array.isArray(json.questions[k].choices)) explanations[k].choices = json.questions[k].choices;
    });
    // T열(20) 영구 저장
    if (sh.getLastColumn() < 20) sh.getRange(1, 20).setValue("오답분석JSON");
    sh.getRange(targetRow, 20).setValue(JSON.stringify(explanations));
    // 캐시 무효화
    try {
      CacheService.getScriptCache().remove("ans_" + folderId);
    } catch(_eC) {}
    return jsonOut_({
      result: "ok",
      extracted: Object.keys(json.questions).length,
      explanations: explanations
    });
  } catch (err) {
    Logger.log("[extractQuestionsFromExamPdf_] 오류: " + (err && err.stack || err));
    return jsonOut_({result:"error", message: String(err)});
  }
}

// ════════════════════════════════════════════════════════════════════════
// ★ v27.0 (2026-05-13): Speed & Stability — 캐시 기반 아키텍처
// ════════════════════════════════════════════════════════════════════════
// 핵심: 읽을 때 계산 X → 쓸 때 미리 계산 / Drive 전체 스캔 절대 금지
// 새 시트: PerfLog · FileIndex · ClassStatsCache · StudentStatsCache · ExplanationsCache · AIReviewCache
// 새 핸들러: get_class_stats_fast · get_teacher_dashboard_data
// 1회용: setupSpeedCacheSheets · disableProcessAnswerQueueTrigger · rebuildFileIndex · rebuildClassStatsCache · runSpeedSelfTest · clearSpeedCache
// ════════════════════════════════════════════════════════════════════════

function perfLog_(meta) {
  // ★ v27.3 (2026-05-14): PerfLog 시트 기록 비활성 — 매일 300+ 행 누적 + 운영에 무영향
  //   원인: 모든 함수 호출마다 시트 쓰기 → 시트 부하 + 의미 있는 분석 X
  //   유지: 함수 시그니처는 그대로 (다른 곳에서 호출하는 코드 보존)
  //   필요 시: 아래 주석 풀어서 재활성화 가능
  return;
  /*
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("PerfLog");
    if (!sh) return;
    var d = meta || {};
    sh.appendRow([
      new Date(), String(d.functionName||""), String(d.action||""),
      Number(d.durationMs||0), Number(d.readCount||0), Number(d.writeCount||0),
      Number(d.driveCallCount||0), Number(d.rowsRead||0), Number(d.rowsWritten||0),
      d.cacheHit===true?"HIT":(d.cacheHit===false?"MISS":""), String(d.cacheKey||""),
      String(d.status||"ok"), String(d.error||"").slice(0,500),
      (d.durationMs||0)>=10000 ? "SLOW" : ""
    ]);
  } catch(_e){}
  */
}

// 1회용: 캐시 시트 자동 생성 (v27.3.1: 6개 → 3개)
// ★ v27.0.1 (2026-05-13): timeout 픽스 — 매우 가볍게 (한 시트씩, 포맷팅 제거)
// ★ v27.3.1 (2026-05-14): 사용 안 하는 캐시 시트 3개 제거
//   제거: ClassStatsCache (App.jsx 캐시 우회), ExplanationsCache (AI 풀이 비활성), AIReviewCache (자동 저장 제거)
//   유지: PerfLog (기록 비활성이지만 헤더 보존), FileIndex (Drive 인덱스), StudentStatsCache (학생앱 트렌드 차트)
function setupSpeedCacheSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = [
    {name:"PerfLog", headers:["timestamp","functionName","action","durationMs","readCount","writeCount","driveCallCount","rowsRead","rowsWritten","cacheHit","cacheKey","status","error","slow"]},
    {name:"FileIndex", headers:["fileKey","teacherName","className","examDate","examTime","examTitle","fileType","fileName","fileId","folderId","mimeType","fileSize","createdAt","updatedAt","isActive","status"]},
    {name:"StudentStatsCache", headers:["studentId","studentName","studentPhone","className","teacherName","recentScoresJson","categoryStatsJson","weakCategoriesJson","miniExamStatsJson","updatedAt"]}
    // ★ v27.3.1 제거: ClassStatsCache · ExplanationsCache · AIReviewCache (사용 안 함)
  ];
  var created=[], kept=[], failed=[];
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    try {
      var sh = ss.getSheetByName(s.name);
      if (!sh) {
        sh = ss.insertSheet(s.name);
        // ★ 단순 setValues 한 번 호출만 (appendRow 도 느림)
        sh.getRange(1, 1, 1, s.headers.length).setValues([s.headers]);
        created.push(s.name);
        // 매 시트마다 flush 로 끊어내기 (timeout 방지)
        SpreadsheetApp.flush();
      } else {
        kept.push(s.name);
      }
    } catch (e) {
      failed.push(s.name + " (" + String(e).slice(0, 60) + ")");
    }
  }
  var msg = "✅ Speed 캐시 시트 설치\n\n"
          + "신규: " + (created.length ? created.join(", ") : "-") + "\n"
          + "유지: " + (kept.length ? kept.join(", ") : "-")
          + (failed.length ? "\n\n❌ 실패: " + failed.join("\n") + "\n\n실패한 시트는 setupSheetOne(\"PerfLog\") 등 개별 함수로 다시 시도하세요." : "");
  Logger.log(msg);
  // ★ v27.1.1: alert 제거 — 모달 대기로 6분 timeout 유발 (Logger 로 충분)
}

// ★ v27.0.1: 개별 시트 생성 (timeout 시 한 시트씩 안전하게)
//   GAS 에디터에서 setupSheetOne("PerfLog") 처럼 인자로 호출 (또는 setupSheetOne_*** 헬퍼)
// ★ v27.3.1 (2026-05-14): 사용 안 하는 캐시 시트 3개 제거 (ClassStatsCache·ExplanationsCache·AIReviewCache)
function setupSheetOne_PerfLog(){return setupSheetOne_("PerfLog");}
function setupSheetOne_FileIndex(){return setupSheetOne_("FileIndex");}
function setupSheetOne_StudentStatsCache(){return setupSheetOne_("StudentStatsCache");}
function setupSheetOne_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = {
    "PerfLog": ["timestamp","functionName","action","durationMs","readCount","writeCount","driveCallCount","rowsRead","rowsWritten","cacheHit","cacheKey","status","error","slow"],
    "FileIndex": ["fileKey","teacherName","className","examDate","examTime","examTitle","fileType","fileName","fileId","folderId","mimeType","fileSize","createdAt","updatedAt","isActive","status"],
    "StudentStatsCache": ["studentId","studentName","studentPhone","className","teacherName","recentScoresJson","categoryStatsJson","weakCategoriesJson","miniExamStatsJson","updatedAt"]
    // ★ v27.3.1 제거: ClassStatsCache · ExplanationsCache · AIReviewCache
  }[name];
  if (!headers) {
    Logger.log("❌ 알 수 없는 시트: " + name);
    return;
  }
  var sh = ss.getSheetByName(name);
  if (sh) {
    Logger.log("ℹ️ " + name + " 시트 이미 있음 (재생성 안 함)");
    return;
  }
  sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  Logger.log("✅ " + name + " 시트 생성 완료");
}

// 1회용: processAnswerQueue 트리거 완전 제거
function disableProcessAnswerQueueTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i=0;i<triggers.length;i++) {
    if (triggers[i].getHandlerFunction()==="processAnswerQueue") {
      ScriptApp.deleteTrigger(triggers[i]); removed++;
    }
  }
  Logger.log("✅ processAnswerQueue 트리거 "+removed+"개 제거. 매분 timeout 안 발생.");
  perfLog_({functionName:"disableProcessAnswerQueueTrigger", status:"ok", action:"removed "+removed});
}

// 1회용: FileIndex 재구성 (Drive 1회 스캔, 최근 30일 폴더만)
function rebuildFileIndex() {
  var start = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fi = ss.getSheetByName("FileIndex");
  if (!fi) { setupSpeedCacheSheets(); fi = ss.getSheetByName("FileIndex"); }
  if (fi.getLastRow() > 1) fi.getRange(2,1,fi.getLastRow()-1,fi.getLastColumn()).clearContent();
  var roots = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!roots.hasNext()) { perfLog_({functionName:"rebuildFileIndex", status:"error", error:"root"}); return; }
  var root = roots.next();
  var rows = [], drives = 0;
  var thirtyAgo = Date.now() - 30*24*3600*1000;
  var dateFolders = root.getFolders();
  while (dateFolders.hasNext()) {
    var df = dateFolders.next();
    var dn = df.getName();
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(dn)) continue;
    var dm = dn.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    var dt = new Date(parseInt(dm[1],10), parseInt(dm[2],10)-1, parseInt(dm[3],10));
    if (dt.getTime() < thirtyAgo) continue;
    var tFolders = df.getFolders();
    while (tFolders.hasNext()) {
      var tf = tFolders.next(); var teacherName = tf.getName();
      var eFolders = tf.getFolders();
      while (eFolders.hasNext()) {
        var ef = eFolders.next(); drives++;
        var fname = ef.getName();
        var fm = fname.match(/^(\d{1,2})시(\d{2})분_([^_]+)_(.+)$/);
        var examTime = fm ? (fm[1]+":"+fm[2]) : "";
        var examTitle = fm ? fm[3] : fname;
        var className = fm ? fm[4] : "";
        var infoMap = {};
        var pendingFiles = [];
        var infoTxt = null;
        var ff = ef.getFiles();
        while (ff.hasNext()) {
          var f = ff.next();
          var fn = f.getName();
          if (fn === "시험정보.txt") { infoTxt = f; continue; }
          if (fn === "desktop.ini") continue;
          if (/^정답\.json/.test(fn)) continue;
          pendingFiles.push(f);
        }
        if (infoTxt) {
          try {
            var txt = infoTxt.getBlob().getDataAsString("UTF-8");
            var aM = txt.match(/●\s*정답지[\s\S]*?(?=●|\[|$)/);
            var eM = txt.match(/●\s*시험지[\s\S]*?(?=●|\[|$)/);
            if (aM) aM[0].split("\n").forEach(function(l){var m=l.match(/^\s*-\s*(.+?)\s*$/);if(m)infoMap[m[1].trim().toLowerCase()]="answer";});
            if (eM) eM[0].split("\n").forEach(function(l){var m=l.match(/^\s*-\s*(.+?)\s*$/);if(m)infoMap[m[1].trim().toLowerCase()]="question";});
          } catch(_eI){}
          rows.push([ef.getId()+"|info", teacherName, className, dn, examTime, examTitle, "info", infoTxt.getName(), infoTxt.getId(), ef.getId(), infoTxt.getMimeType(), infoTxt.getSize(), infoTxt.getDateCreated(), new Date(), true, "ok"]);
        }
        pendingFiles.forEach(function(f){
          var n = f.getName(), ln = n.toLowerCase(), ft = "unknown";
          var ex = infoMap[ln] || infoMap[n.toLowerCase()];
          if (ex) ft = ex;
          else if (/(정답|답지|답안|해설|풀이|answer|solution)/i.test(n)) ft = "answer";
          else if (/\.(pdf|docx?|hwpx?|pptx?|jpg|jpeg|png)$/i.test(ln)) ft = "question";
          rows.push([ef.getId()+"|"+f.getId(), teacherName, className, dn, examTime, examTitle, ft, n, f.getId(), ef.getId(), f.getMimeType(), f.getSize(), f.getDateCreated(), new Date(), true, "ok"]);
        });
      }
    }
  }
  if (rows.length>0) fi.getRange(2,1,rows.length,rows[0].length).setValues(rows);
  var dur = Date.now()-start;
  Logger.log("✅ FileIndex 재구성 완료\n행: "+rows.length+"\nDrive 호출: "+drives+"\n시간: "+Math.round(dur/1000)+"초");
  perfLog_({functionName:"rebuildFileIndex", durationMs:dur, rowsWritten:rows.length, driveCallCount:drives, status:"ok"});
}

// 1회용: ClassStatsCache 재구성 (반별 성적 30~60초 → 1~3초의 핵심)
function rebuildClassStatsCache() {
  var start = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cache = ss.getSheetByName("ClassStatsCache");
  if (!cache) { setupSpeedCacheSheets(); cache = ss.getSheetByName("ClassStatsCache"); }
  if (cache.getLastRow()>1) cache.getRange(2,1,cache.getLastRow()-1,cache.getLastColumn()).clearContent();
  var ansSh = ss.getSheetByName("정답목록");
  if (!ansSh || ansSh.getLastRow()<=1) return;
  function normExam(s){var v=String(s||"").trim();var re=/\s*\(\s*(?:[1-9]차|이론편|실전편|혼합|세트[A-E]|[A-E])\s*\)\s*$/;while(re.test(v))v=v.replace(re,"").trim();return v;}
  var ansRows = ansSh.getDataRange().getValues();
  var ansByKey = {};
  for (var i=1;i<ansRows.length;i++) {
    var r = ansRows[i];
    var ex = String(r[4]||"").trim();
    if (!ex || ex==="추천보강") continue;
    var subj=String(r[1]||"").trim(), gr=String(r[2]||"").trim(), lv=String(r[3]||"").trim();
    var exN = normExam(ex);
    var teacher = String(r[9]||"").trim();
    if (teacher.charAt(0)==="["||teacher.charAt(0)==="{") teacher = "";
    var rec = {teacher:teacher, subject:subj, grade:gr, level:lv, examType:ex, folderId:String(r[13]||"")};
    ansByKey[subj+"|"+gr+"|"+lv+"|"+exN] = rec;
    if (!ansByKey[gr+"|"+lv+"|"+exN]) ansByKey[gr+"|"+lv+"|"+exN] = rec;
    if (!ansByKey[gr+"|"+exN]) ansByKey[gr+"|"+exN] = rec;
    if (!ansByKey[exN]) ansByKey[exN] = rec;
  }
  var sSh = ss.getSheetByName("학생답안기록");
  if (!sSh || sSh.getLastRow()<=1) return;
  var sLast = sSh.getLastRow();
  var sFrom = Math.max(1, sLast-2000);
  var sRows = sSh.getRange(sFrom,1,sLast-sFrom+1,Math.min(sSh.getLastColumn(),18)).getValues();
  var sStart = sFrom===1 ? 1 : 0;
  var groups = {};
  for (var si=sStart;si<sRows.length;si++) {
    var sr = sRows[si];
    var name = String(sr[1]||"").trim();
    var subjRaw = String(sr[4]||"").trim();
    var gr2 = String(sr[5]||"").trim();
    var lv2 = String(sr[6]||"").trim();
    var ex2 = String(sr[7]||"").trim();
    var date2 = String(sr[8]||"").trim();
    var score = sr[9];
    if (score===""||score===null||score===undefined) continue;
    var wq = String(sr[13]||"").trim();
    var sTe = String(sr[15]||"").trim();
    if (sTe.charAt(0)==="["||sTe.charAt(0)==="{") sTe = "";
    var exN2 = normExam(ex2);
    var match = ansByKey[subjRaw+"|"+gr2+"|"+lv2+"|"+exN2] || ansByKey[gr2+"|"+lv2+"|"+exN2] || ansByKey[gr2+"|"+exN2] || ansByKey[exN2];
    var subject = (match&&match.subject) || subjRaw;
    var teacher2 = sTe || (match&&match.teacher) || "";
    if (teacher2.charAt(0)==="["||teacher2.charAt(0)==="{") teacher2 = "";
    var gKey = teacher2+"|"+subject+"|"+gr2+"|"+lv2+"|"+ex2+"|"+date2;
    if (!groups[gKey]) groups[gKey] = {teacher:teacher2,subject:subject,grade:gr2,level:lv2,examType:ex2,date:date2,students:[],wrongByQ:{}};
    var wrongQs = wq.split(",").map(function(x){return parseInt(x,10);}).filter(function(x){return !isNaN(x);});
    groups[gKey].students.push({name:name, score:Number(score)||0, wrongQs:wrongQs});
    wrongQs.forEach(function(q){ groups[gKey].wrongByQ[q] = (groups[gKey].wrongByQ[q]||0)+1; });
  }
  var cacheRows = [];
  Object.keys(groups).forEach(function(k){
    var g = groups[k];
    var total = g.students.length;
    if (total===0) return;
    var sum=0, max=-1, min=999;
    g.students.forEach(function(s){sum+=s.score;max=Math.max(max,s.score);min=Math.min(min,s.score);});
    var hardest = total>=5 ?
      Object.keys(g.wrongByQ).map(function(q){var w=g.wrongByQ[q];return{q:Number(q),wrong:w,pct:Math.round(w/total*100),_s:(w/total)*Math.log(total+1)*10};})
        .filter(function(h){return h._s>0;}).sort(function(a,b){return b._s-a._s;}).slice(0,7).map(function(h){return{q:h.q,wrong:h.wrong,pct:h.pct};}) : [];
    g.students.sort(function(a,b){return b.score-a.score;});
    // ★ v27.2.11 (2026-05-14): wrongQs 도 같이 저장 — 학생별 오답 번호 화면 표시용
    //   원인: studentSummaryJson 에 wrongCount 만 있고 wrongQs 가 없어서 "전부 정답" 으로 표시됨
    //   해결: wrongQs 배열도 저장 → 화면에서 "틀린 N문항" + 펼침 시 번호 표시 가능
    var summary = g.students.map(function(s,i){return {rank:i+1,name:s.name,score:s.score,wrongCount:s.wrongQs.length,wrongQs:s.wrongQs};});
    var ckey = g.teacher+"|"+g.subject+"|"+g.grade+"|"+g.level+"|"+g.examType+"|"+g.date;
    cacheRows.push([ckey,g.teacher,g.subject+" "+g.grade+" "+g.level+"반",g.subject,g.grade,g.level,g.examType,g.date,total,1,Math.round(sum/total),max,min,g.date,g.examType,JSON.stringify(hardest),JSON.stringify(summary),new Date()]);
  });
  if (cacheRows.length>0) cache.getRange(2,1,cacheRows.length,cacheRows[0].length).setValues(cacheRows);
  var dur = Date.now()-start;
  Logger.log("✅ ClassStatsCache 재구성: "+cacheRows.length+"개 반, "+Math.round(dur/1000)+"초");
  perfLog_({functionName:"rebuildClassStatsCache", durationMs:dur, rowsWritten:cacheRows.length, status:"ok"});
}

// 핸들러: get_class_stats_fast (캐시만 읽음)
function getClassStatsFast_(e) {
  var start = Date.now();
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cache = ss.getSheetByName("ClassStatsCache");
    if (!cache || cache.getLastRow()<=1) {
      return jsonOut_({result:"error", message:"캐시 비어있음. rebuildClassStatsCache 실행 필요"});
    }
    var qDate = String(e.parameter.date||"").trim();
    var qTeacher = String(e.parameter.teacher||"").trim();
    var qGrade = String(e.parameter.grade||"").trim();
    var qSubject = String(e.parameter.subject||"").trim();
    var rows = cache.getDataRange().getValues();
    var out = [];
    for (var i=1;i<rows.length;i++) {
      var r = rows[i];
      var teacher = String(r[1]||"");
      var subject = String(r[3]||"");
      var grade = String(r[4]||"");
      var date = String(r[7]||"");
      if (qDate && date.replace(/\./g,"-").indexOf(qDate.replace(/\./g,"-"))===-1) continue;
      if (qTeacher && teacher !== qTeacher) continue;
      if (qGrade && grade !== qGrade) continue;
      if (qSubject && subject !== qSubject) continue;
      var hardest=[],summary=[];
      try { hardest = JSON.parse(r[15]||"[]"); } catch(_e){}
      try { summary = JSON.parse(r[16]||"[]"); } catch(_e){}
      out.push({
        classKey:r[0], teacher:teacher, className:String(r[2]||""),
        subject:subject, grade:grade, level:String(r[5]||""), examType:String(r[6]||""), date:date,
        total:Number(r[8])||0, avg:Number(r[10])||0, max:Number(r[11])||0, min:Number(r[12])||0,
        students:summary, hardest:hardest, updatedAt:String(r[17]||"")
      });
    }
    perfLog_({functionName:"getClassStatsFast_", durationMs:Date.now()-start, rowsRead:rows.length, status:"ok", cacheHit:true});
    return jsonOut_({result:"ok", classes:out, fromCache:true, count:out.length});
  } catch (err) {
    perfLog_({functionName:"getClassStatsFast_", durationMs:Date.now()-start, status:"error", error:String(err)});
    return jsonOut_({result:"error", message:String(err)});
  }
}

// 핸들러: get_teacher_dashboard_data (통합)
function getTeacherDashboardData_(e) {
  var start = Date.now();
  try {
    var dashRes = teacherDashboard_(e);
    var dashData = JSON.parse(dashRes.getContent());
    var statsRes = getClassStatsFast_(e);
    var statsData = JSON.parse(statsRes.getContent());
    perfLog_({functionName:"getTeacherDashboardData_", durationMs:Date.now()-start, status:"ok"});
    return jsonOut_({
      result:"ok",
      todayStatus: dashData.exams || [],
      classStats: statsData.classes || [],
      meta:{date:String(e.parameter.date||""), teacher:String(e.parameter.teacher||""), fromCache:true},
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    perfLog_({functionName:"getTeacherDashboardData_", durationMs:Date.now()-start, status:"error", error:String(err)});
    return jsonOut_({result:"error", message:String(err)});
  }
}

// 1회용: 속도 자가 테스트
function runSpeedSelfTest() {
  var results = [];
  var todayStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
  var fakeE = { parameter: { date: todayStr } };
  var t1 = Date.now();
  try { getClassStatsFast_(fakeE); results.push("getClassStatsFast_: "+(Date.now()-t1)+"ms"); } catch(e){ results.push("getClassStatsFast_: ERROR "+e); }
  var t2 = Date.now();
  try { teacherDashboard_(fakeE); results.push("teacherDashboard_: "+(Date.now()-t2)+"ms"); } catch(e){ results.push("teacherDashboard_: ERROR "+e); }
  var t3 = Date.now();
  try { var fi = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FileIndex"); results.push("FileIndex read: "+(Date.now()-t3)+"ms ("+(fi?fi.getLastRow()-1:0)+" rows)"); } catch(e){ results.push("FileIndex: ERROR "+e); }
  Logger.log("🏎️ Speed SelfTest:\n\n" + results.join("\n"));
  perfLog_({functionName:"runSpeedSelfTest", status:"ok", action:results.join(" | ")});
}

// 1회용: CacheService 초기화
function clearSpeedCache() {
  try {
    CacheService.getScriptCache().removeAll(["last_mirror_scan"]);
    Logger.log("✅ CacheService 초기화 (캐시 시트는 유지)");
  } catch(e){}
}

// ════════════════════════════════════════════════════════════════════════
// ★ v27.1 (2026-05-13): Phase 2 — StudentStatsCache + ExplanationsCache + AIReviewCache + LockService
// ════════════════════════════════════════════════════════════════════════

// 1회용: 학생별 통계 미리 계산 (트렌드/약점 차트용)
function rebuildStudentStatsCache() {
  var start = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cache = ss.getSheetByName("StudentStatsCache");
  if (!cache) { setupSheetOne_("StudentStatsCache"); cache = ss.getSheetByName("StudentStatsCache"); }
  if (cache.getLastRow() > 1) cache.getRange(2,1,cache.getLastRow()-1,cache.getLastColumn()).clearContent();
  var sSh = ss.getSheetByName("학생답안기록");
  if (!sSh || sSh.getLastRow() <= 1) {
    Logger.log("학생답안기록 비어있음");
    return;
  }
  var sLast = sSh.getLastRow();
  var sFrom = Math.max(1, sLast - 3000);
  var sRows = sSh.getRange(sFrom, 1, sLast-sFrom+1, Math.min(sSh.getLastColumn(), 18)).getValues();
  var sStart = sFrom === 1 ? 1 : 0;
  // 카테고리 인덱싱 (U열)
  var ansSh = ss.getSheetByName("정답목록");
  var catByExam = {};
  if (ansSh && ansSh.getLastRow() > 1) {
    var aLastCol = Math.min(ansSh.getLastColumn(), 21);
    var aRows = ansSh.getRange(1, 1, ansSh.getLastRow(), aLastCol).getValues();
    for (var i = 1; i < aRows.length; i++) {
      var ar = aRows[i];
      var exKey = String(ar[1]||"")+"|"+String(ar[2]||"")+"|"+String(ar[3]||"")+"|"+String(ar[4]||"");
      if (ar.length >= 21 && ar[20]) {
        try { catByExam[exKey] = JSON.parse(ar[20]); } catch(_e){}
      }
    }
  }
  var students = {};
  for (var si = sStart; si < sRows.length; si++) {
    var sr = sRows[si];
    var name = String(sr[1]||"").trim();
    var phone = String(sr[2]||"").trim();
    if (!name || !phone) continue;
    var cn = String(sr[3]||"").trim();
    var subj = String(sr[4]||"").trim();
    var gr = String(sr[5]||"").trim();
    var lv = String(sr[6]||"").trim();
    var ex = String(sr[7]||"").trim();
    var date = String(sr[8]||"").trim();
    var score = sr[9];
    if (score===""||score===null||score===undefined) continue;
    var teacher = String(sr[15]||"").trim();
    if (teacher.charAt(0)==="["||teacher.charAt(0)==="{") teacher = "";
    var sid = name + "|" + phone;
    if (!students[sid]) students[sid] = { name:name, phone:phone, className:cn, teacher:teacher, scores:[], byCategory:{} };
    students[sid].scores.push({date:date, score:Number(score)||0, examType:ex});
    if (cn && !students[sid].className) students[sid].className = cn;
    if (teacher && !students[sid].teacher) students[sid].teacher = teacher;
    var exKey = subj+"|"+gr+"|"+lv+"|"+ex;
    var cats = catByExam[exKey];
    if (cats) {
      var wq = String(sr[13]||"").trim();
      var wrongs = wq ? wq.split(",").map(function(x){return parseInt(x,10);}).filter(function(x){return !isNaN(x);}) : [];
      Object.keys(cats).forEach(function(qStr){
        var cat = cats[qStr];
        if (!cat) return;
        if (!students[sid].byCategory[cat]) students[sid].byCategory[cat] = {correct:0, total:0};
        students[sid].byCategory[cat].total++;
        if (wrongs.indexOf(Number(qStr)) < 0) students[sid].byCategory[cat].correct++;
      });
    }
  }
  var rows = [];
  Object.keys(students).forEach(function(sid){
    var st = students[sid];
    st.scores.sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
    var recent = st.scores.slice(-5);
    var catStats = [], weakCats = [];
    Object.keys(st.byCategory).forEach(function(cat){
      var c = st.byCategory[cat];
      if (c.total < 3) return;
      var pct = Math.round(c.correct/c.total*100);
      catStats.push({name:cat, correct:c.correct, total:c.total, pct:pct});
      if (pct < 80) weakCats.push({name:cat, pct:pct});
    });
    catStats.sort(function(a,b){return a.pct-b.pct;});
    weakCats.sort(function(a,b){return a.pct-b.pct;});
    rows.push([sid, st.name, st.phone, st.className, st.teacher, JSON.stringify(recent), JSON.stringify(catStats), JSON.stringify(weakCats), "{}", new Date()]);
  });
  if (rows.length > 0) cache.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  var dur = Date.now() - start;
  Logger.log("✅ StudentStatsCache: " + rows.length + "명, " + Math.round(dur/1000) + "초");
  perfLog_({functionName:"rebuildStudentStatsCache", durationMs:dur, rowsWritten:rows.length, status:"ok"});
}

// 핸들러: get_student_stats_fast
function getStudentStatsFast_(e) {
  var start = Date.now();
  try {
    var name = String(e.parameter.name || "").trim();
    var phone = String(e.parameter.phone || "").trim();
    if (!name || !phone) return jsonOut_({result:"error", message:"name + phone 필수"});
    var sid = name + "|" + phone;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cache = ss.getSheetByName("StudentStatsCache");
    if (!cache || cache.getLastRow() <= 1) return jsonOut_({result:"ok", student:null, message:"캐시 없음"});
    var rows = cache.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === sid) {
        var r = rows[i];
        perfLog_({functionName:"getStudentStatsFast_", durationMs:Date.now()-start, status:"ok", cacheHit:true});
        return jsonOut_({result:"ok", student:{
          name:String(r[1]||""), phone:String(r[2]||""), className:String(r[3]||""), teacher:String(r[4]||""),
          recentScores: (function(){try{return JSON.parse(r[5]||"[]");}catch(_e){return [];}})(),
          categoryStats: (function(){try{return JSON.parse(r[6]||"[]");}catch(_e){return [];}})(),
          weakCategories: (function(){try{return JSON.parse(r[7]||"[]");}catch(_e){return [];}})(),
          miniExamStats: (function(){try{return JSON.parse(r[8]||"{}");}catch(_e){return {};}})(),
          updatedAt: String(r[9]||"")
        }});
      }
    }
    return jsonOut_({result:"ok", student:null, message:"학생 데이터 없음"});
  } catch (err) {
    perfLog_({functionName:"getStudentStatsFast_", durationMs:Date.now()-start, status:"error", error:String(err)});
    return jsonOut_({result:"error", message:String(err)});
  }
}

// ─── ExplanationsCache 헬퍼 ───
function _explCacheKey_(examKey, qNum) { return examKey + "|" + qNum; }
function getExplanationFromCache_(examKey, qNum) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("ExplanationsCache");
    if (!sh || sh.getLastRow() <= 1) return null;
    var key = _explCacheKey_(examKey, qNum);
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === key) {
        return {
          questionType: String(rows[i][4]||""),
          correctAnswer: String(rows[i][6]||""),
          explanationText: String(rows[i][7]||""),
          choiceExplanations: rows[i][8] ? (function(){try{return JSON.parse(rows[i][8]);}catch(_e){return null;}})() : null,
          source: String(rows[i][9]||"")
        };
      }
    }
  } catch(_e){}
  return null;
}
function saveExplanationToCache_(examKey, qNum, data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("ExplanationsCache");
    if (!sh) { setupSheetOne_("ExplanationsCache"); sh = ss.getSheetByName("ExplanationsCache"); }
    var key = _explCacheKey_(examKey, qNum);
    var rows = sh.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === key) { foundRow = i + 1; break; }
    }
    var createdAt = foundRow < 0 ? new Date() : (rows[foundRow-1][10] || new Date());
    var rowData = [
      key, String(data.examId||examKey), String(data.folderId||""), qNum,
      String(data.questionType||"obj"), String(data.studentAnswer||""), String(data.correctAnswer||""),
      String(data.explanationText||""), data.choiceExplanations ? JSON.stringify(data.choiceExplanations) : "",
      String(data.source||"gemini"), createdAt, new Date()
    ];
    if (foundRow > 0) sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    else sh.appendRow(rowData);
  } catch(_e){}
}

// 핸들러 래퍼: generate_explanations 호출 시 캐시 우선 확인
function generateExplanationsCached_(data) {
  var start = Date.now();
  try {
    var folderId = String(data.folderId||"").trim();
    var examKey = folderId || ((data.subject||"")+"|"+(data.grade||"")+"|"+(data.level||"")+"|"+(data.examType||""));
    var qNums = Array.isArray(data.questionNumbers) ? data.questionNumbers.map(Number) : [];
    // 1) 캐시 먼저
    var cachedAll = qNums.length > 0;
    var explanations = {};
    qNums.forEach(function(qn){
      var cached = getExplanationFromCache_(examKey, qn);
      if (cached) {
        explanations[String(qn)] = { explanation: cached.explanationText, choiceExplanations: cached.choiceExplanations };
      } else { cachedAll = false; }
    });
    if (cachedAll) {
      perfLog_({functionName:"generateExplanationsCached_", durationMs:Date.now()-start, status:"ok", cacheHit:true});
      return jsonOut_({result:"ok", explanations:explanations, cached:true, source:"explanation_cache"});
    }
    // 2) 미스 → 기존 함수 호출
    var resp = generateExplanationsOnDemand_(data);
    var json = JSON.parse(resp.getContent());
    if (json.result === "ok" && json.explanations) {
      Object.keys(json.explanations).forEach(function(qStr){
        var qe = json.explanations[qStr];
        if (qe && (qe.explanation || qe.choiceExplanations)) {
          saveExplanationToCache_(examKey, qStr, {
            folderId: folderId, questionType:"obj",
            explanationText: qe.explanation||"",
            choiceExplanations: qe.choiceExplanations||null,
            source: "gemini"
          });
        }
      });
    }
    perfLog_({functionName:"generateExplanationsCached_", durationMs:Date.now()-start, status:"ok", cacheHit:false});
    return resp;
  } catch (err) {
    perfLog_({functionName:"generateExplanationsCached_", durationMs:Date.now()-start, status:"error", error:String(err)});
    return jsonOut_({result:"error", message:String(err)});
  }
}

// ─── AIReviewCache ───
function saveAIReviewToCache_(folderId, examInfo, check, rowIndex) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("AIReviewCache");
    if (!sh) { setupSheetOne_("AIReviewCache"); sh = ss.getSheetByName("AIReviewCache"); }
    var key = folderId || ((examInfo.subject||"")+"|"+(examInfo.grade||"")+"|"+(examInfo.level||"")+"|"+(examInfo.examType||""));
    var rows = sh.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === key) { foundRow = i + 1; break; }
    }
    var unanimous = check && check.unanimous;
    var mismatches = (check && check.mismatches) || [];
    var status = unanimous ? "AUTO_OK" : (mismatches.length > 0 ? "PENDING" : "ERROR");
    var summary = unanimous ? "✅ AI 만장일치 (자동 등록)" : "⚠️ " + mismatches.length + "개 불일치";
    var rowData = [
      key, String(rowIndex||""), folderId||"",
      String(examInfo.teacher||""),
      (examInfo.subject||"")+" "+(examInfo.grade||"")+" "+(examInfo.level||""),
      status, summary, "[]", "[]",
      JSON.stringify(mismatches.slice(0,50)),
      new Date(), "gemini+claude"
    ];
    if (foundRow > 0) sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    else sh.appendRow(rowData);
  } catch(_e){}
}

function getAIReviewCache_(e) {
  var start = Date.now();
  try {
    var folderId = String(e.parameter.folderId||"").trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("AIReviewCache");
    if (!sh || sh.getLastRow()<=1) return jsonOut_({result:"ok", review:null});
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (folderId && String(rows[i][0]) === folderId) {
        var r = rows[i];
        perfLog_({functionName:"getAIReviewCache_", durationMs:Date.now()-start, status:"ok", cacheHit:true});
        return jsonOut_({result:"ok", review:{
          status: String(r[5]||""), summary: String(r[6]||""),
          mismatches: (function(){try{return JSON.parse(r[9]||"[]");}catch(_e){return [];}})(),
          checkedAt: String(r[10]||""), model: String(r[11]||"")
        }});
      }
    }
    return jsonOut_({result:"ok", review:null});
  } catch (err) {
    return jsonOut_({result:"error", message:String(err)});
  }
}

// ─── LockService 헬퍼 ───
function withLock_(timeoutMs, fn) {
  var lock = LockService.getScriptLock();
  try {
    var got = lock.tryLock(timeoutMs || 8000);
    if (!got) return { ok: false, error: "동시 처리 중. 잠시 후 다시 시도해주세요." };
    var result = fn();
    return { ok: true, result: result };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    try { lock.releaseLock(); } catch(_e){}
  }
}

// ─── 통합 API: get_student_home_data ───
function getStudentHomeData_(e) {
  var start = Date.now();
  try {
    var name = String(e.parameter.name||"").trim();
    var phone = String(e.parameter.phone||"").trim();
    if (!name || !phone) return jsonOut_({result:"error", message:"name + phone 필수"});
    var histR = studentHistory_(e);
    var histD = JSON.parse(histR.getContent());
    var statsR = getStudentStatsFast_(e);
    var statsD = JSON.parse(statsR.getContent());
    var miniE = { parameter: { student: name, phone: phone } };
    var miniR = listMiniExamProgress_(miniE);
    var miniD = JSON.parse(miniR.getContent());
    var activeMini = (miniD.items||[]).filter(function(it){return it.status === "대기";});
    perfLog_({functionName:"getStudentHomeData_", durationMs:Date.now()-start, status:"ok"});
    return jsonOut_({
      result:"ok",
      history: histD.records || [],
      stats: statsD.student || null,
      miniExams: activeMini,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    perfLog_({functionName:"getStudentHomeData_", durationMs:Date.now()-start, status:"error", error:String(err)});
    return jsonOut_({result:"error", message:String(err)});
  }
}

// ════════════════════════════════════════════════════════════════════════
// ★ v27.2 (2026-05-14): 카테고리 수동 재분석 함수 (1회용)
// ════════════════════════════════════════════════════════════════════════
//
// 카테고리가 "1, 2, 3, -1" 같은 숫자로 잘못 저장된 시험을 재분석.
// 사용법 (GAS 에디터에서):
//   1) folderId 로:    rebuildCategoriesForExam("1AbCdEf...폴더ID")
//   2) 한 줄로:        rebuildCategoriesForExamBy("영어", "중2", "A", "문제생성기")
//   3) 전체 재분석:    rebuildCategoriesAll()  ← Gemini 비용 발생, 신중하게
//   4) 잘못된 것만:    rebuildCategoriesBadOnly()  ← 숫자/null 만 재분석 (추천)
//
function rebuildCategoriesForExam(folderId) {
  if (!folderId) { Logger.log("❌ folderId 필수"); return; }
  var res = analyzeExamCategories_({ folderId: folderId, force: true });
  Logger.log("결과: " + res.getContent().slice(0, 500));
}
function rebuildCategoriesForExamBy(subject, grade, level, examType) {
  if (!subject || !grade || !examType) { Logger.log("❌ subject/grade/examType 필수"); return; }
  var res = analyzeExamCategories_({ subject: subject, grade: grade, level: level||"", examType: examType, force: true });
  Logger.log("결과: " + res.getContent().slice(0, 500));
}
// 카테고리가 "잘못된 것"만 자동 골라서 재분석
//   "잘못된 것" 판정 기준:
//   - U열 (21) 비어있음
//   - 또는 카테고리 값이 모두 단일 숫자/음수 ("1", "2", "-1") — 즉 의미 있는 라벨이 없음
function rebuildCategoriesBadOnly() {
  var start = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  if (!sh || sh.getLastRow() <= 1) { Logger.log("정답목록 비어있음"); return; }
  var rows = sh.getDataRange().getValues();
  var fixed = 0, skipped = 0, failed = 0;
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[4]||"") === "추천보강") continue; // 미니 시험은 분류 안 함
    var catRaw = String(r[20]||"").trim();
    var isBad = false;
    if (!catRaw) {
      isBad = true;
    } else {
      try {
        var catObj = JSON.parse(catRaw);
        var vals = Object.keys(catObj).map(function(k){return String(catObj[k]).trim();});
        // 모든 값이 단일 숫자 또는 음수면 bad
        var allBad = vals.length > 0 && vals.every(function(v){
          return /^-?\d+$/.test(v);  // "1", "-1", "12" 등
        });
        if (allBad) isBad = true;
      } catch(_e){
        isBad = true; // 파싱 실패
      }
    }
    if (!isBad) { skipped++; continue; }
    var folderId = String(r[13]||"").trim();
    var res = folderId
      ? analyzeExamCategories_({ folderId: folderId, force: true })
      : analyzeExamCategories_({ subject:String(r[1]||""), grade:String(r[2]||""), level:String(r[3]||""), examType:String(r[4]||""), force: true });
    try {
      var json = JSON.parse(res.getContent());
      if (json.result === "ok") fixed++;
      else failed++;
    } catch(_e) { failed++; }
    Utilities.sleep(500);  // API rate limit 회피
    if (Date.now() - start > 4 * 60 * 1000) {  // 4분 안전 컷오프
      Logger.log("⏰ 4분 timeout 안전컷 — 다음 실행에서 계속");
      break;
    }
  }
  var dur = Math.round((Date.now()-start)/1000);
  Logger.log("✅ rebuildCategoriesBadOnly 완료\n  재분석 성공: "+fixed+"\n  건너뜀(정상): "+skipped+"\n  실패: "+failed+"\n  시간: "+dur+"초");
}

// ★ v27.3.3 (2026-05-15): 김효식 / 국어 한 번에 자동 픽스
//   동작: 정답목록 행 찾기 → Drive 폴더 자동 생성 → 행 폴더ID 업데이트 → 캐시 초기화
//   사용 후: Drive 새 폴더에 PDF 끌어 놓기만 하면 끝
function 자동픽스_김효식_국어() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
  Logger.log("══════════════════════════════════════");
  Logger.log("🔧 김효식 / 국어 자동 픽스 시작");
  Logger.log("══════════════════════════════════════");

  // 1) 정답목록 행 찾기
  var rows = sh.getDataRange().getValues();
  var matchRow = -1;
  for (var i = rows.length-1; i >= 1; i--) {
    if (String(rows[i][9]||"").trim() !== "김효식") continue;
    if (String(rows[i][1]||"").trim() !== "국어") continue;
    matchRow = i+1;
    break;
  }
  if (matchRow < 0) {
    Logger.log("❌ 정답목록에 김효식/국어 행 없음");
    Logger.log("→ 선생님앱에서 시험 등록부터 다시 하셔야 합니다.");
    return;
  }
  var oldFid = String(sh.getRange(matchRow, 14).getValue()).trim();
  var examType = String(sh.getRange(matchRow, 5).getValue()).trim() || "시험";
  Logger.log("✅ 행 " + matchRow + " 발견 (시험종류: " + examType + ")");
  Logger.log("  옛 폴더ID: " + oldFid);

  // 2) Drive 새 폴더 만들기
  var rootIter = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!rootIter.hasNext()) { Logger.log("❌ 루트 폴더 없음"); return; }
  var root = rootIter.next();

  var dateIter = root.getFoldersByName(todayDot);
  var dateFolder = dateIter.hasNext() ? dateIter.next() : root.createFolder(todayDot);

  var teacherIter = dateFolder.getFoldersByName("김효식");
  var teacherFolder = teacherIter.hasNext() ? teacherIter.next() : dateFolder.createFolder("김효식");
  Logger.log("✅ 김효식 폴더 준비 완료");

  var examFolderName = "17시00분_" + examType + "_국어고1SB반";
  var examIter = teacherFolder.getFoldersByName(examFolderName);
  var examFolder = examIter.hasNext() ? examIter.next() : teacherFolder.createFolder(examFolderName);
  Logger.log("✅ 시험 폴더 준비: " + examFolderName);

  // 3) 정답목록 폴더 ID 업데이트
  sh.getRange(matchRow, 14).setValue(examFolder.getId());
  sh.getRange(matchRow, 19).setValue("");  // 폴더메타JSON 초기화
  sh.getRange(matchRow, 13).setValue(todayDot);  // 시험날짜 오늘로
  Logger.log("✅ 정답목록 행 업데이트 (폴더ID + 시험날짜 + 메타초기화)");

  // 4) 캐시 초기화
  try {
    var cs = CacheService.getScriptCache();
    cs.removeAll([
      "dash_" + todayDot + "_",
      "dash_" + todayDot + "_김효식",
      "dash_" + todayDot.replace(/\./g,"-") + "_",
      "fld_" + examFolder.getId(),
      "fld_" + oldFid,
      "last_mirror_scan"
    ]);
    Logger.log("✅ 캐시 초기화 완료");
  } catch(_e){}

  Logger.log("\n══════════════════════════════════════");
  Logger.log("📁 새 폴더 URL (클릭해서 열기):");
  Logger.log(examFolder.getUrl());
  Logger.log("\n📋 이제 할 일 (1단계만):");
  Logger.log("1. 위 URL 클릭 → Drive 폴더 열림");
  Logger.log("2. 시험지·정답지 PDF 2개를 폴더로 끌어 놓기");
  Logger.log("3. 선생님앱 새로고침 → 카드에 파일 등장");
  Logger.log("══════════════════════════════════════");
}

// ★ v27.9.1 (2026-05-15): 종합 복구 — 1번 클릭으로 모든 흐름 처리
//   순서: backgroundMirrorScan → 빈 미러 픽스 → 정답목록 진단 → 캐시 초기화
function 종합복구_오늘() {
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
  Logger.log("══════════════════════════════════════");
  Logger.log("🔧 종합 복구 시작 (" + todayDot + ")");
  Logger.log("══════════════════════════════════════\n");

  // 1) backgroundMirrorScan 즉시 실행 (새 JSON 처리)
  Logger.log("[1/4] backgroundMirrorScan 즉시 실행 — 문제생성결과 JSON 처리");
  try {
    backgroundMirrorScan();
    Logger.log("  ✅ 완료\n");
  } catch(e1) {
    Logger.log("  ❌ 실패: " + e1 + "\n");
  }

  // 2) 빈 미러 폴더 자동 복구
  Logger.log("[2/4] 빈 미러 폴더 자동 복구 (docx 강제 복사)");
  try { 즉시픽스_빈미러폴더_오늘(); }
  catch(e2) { Logger.log("  ❌ 실패: " + e2); }
  Logger.log("");

  // 3) 정답목록 오늘 시험 진단
  Logger.log("[3/4] 정답목록 오늘 시험 진단");
  Logger.log("────────────────────────────────────");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  if (sh && sh.getLastRow() > 1) {
    var rows = sh.getDataRange().getValues();
    var todayCount = 0;
    var start = Math.max(1, rows.length - 50);
    for (var i = start; i < rows.length; i++) {
      var r = rows[i];
      var dt = String(r[12]||"");
      if (dt.indexOf(todayDot) < 0 && dt.indexOf(todayDot.replace(/\./g,"-")) < 0) continue;
      if (String(r[4]||"") === "추천보강") continue;
      todayCount++;
      var fid = String(r[13]||"").trim();
      var fileCount = "?";
      try {
        if (fid && !/[:|]/.test(fid)) {
          var f = DriveApp.getFolderById(fid);
          var ffs = f.getFiles(); fileCount = 0;
          while (ffs.hasNext()) {
            var fn = ffs.next().getName();
            if (fn === "시험정보.txt" || fn === "정답.json" || fn === "desktop.ini") continue;
            fileCount++;
          }
        } else {
          fileCount = "❌폴더ID없음";
        }
      } catch(_e) { fileCount = "❌접근불가"; }
      Logger.log("[행 " + (i+1) + "] " + r[1] + " " + r[2] + " " + r[3]
        + " / " + r[9] + " / " + r[4]
        + " / " + dt + " / 파일 " + fileCount + (fileCount === 0 ? " ⚠️ 빈" : ""));
    }
    Logger.log("\n→ 오늘 시험 행 총 " + todayCount + "개");
  }

  // 4) 캐시 일괄 초기화
  Logger.log("\n[4/4] 캐시 일괄 초기화");
  try {
    var cs = CacheService.getScriptCache();
    cs.removeAll([
      "dash_" + todayDot + "_",
      "dash_" + todayDot.replace(/\./g,"-") + "_",
      "last_mirror_scan"
    ]);
    Logger.log("  ✅ 비움\n");
  } catch(_e){}

  Logger.log("══════════════════════════════════════");
  Logger.log("✅ 종합 복구 완료");
  Logger.log("══════════════════════════════════════");
  Logger.log("→ 선생님앱 Ctrl+Shift+R 강제 새로고침");
}

// ★ v27.9 (2026-05-15): 미러 폴더 빈 채로 남은 문제생성기 시험 자동 복구
//   동작: 문제생성결과/<오늘>/<선생님>/ 의 docx 들을 미러 폴더로 직접 복사
//   사용: GAS 에디터 → 함수 드롭다운 → 즉시픽스_빈미러폴더_오늘 실행
function 즉시픽스_빈미러폴더_오늘() {
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
  Logger.log("══════════════════════════════════════");
  Logger.log("🔧 미러 폴더 빈 채 남은 시험 자동 복구 (" + todayDot + ")");
  Logger.log("══════════════════════════════════════");

  var roots = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!roots.hasNext()) { Logger.log("❌ 루트 없음"); return; }
  var root = roots.next();

  // 1) 문제생성결과/<오늘>/<선생님>/ 의 모든 docx 수집
  var egIter = root.getFoldersByName("문제생성결과");
  if (!egIter.hasNext()) { Logger.log("❌ 문제생성결과 폴더 없음"); return; }
  var eg = egIter.next();
  var todayEgIter = eg.getFoldersByName(todayDot);
  if (!todayEgIter.hasNext()) { Logger.log("❌ 문제생성결과/" + todayDot + " 없음"); return; }
  var todayEg = todayEgIter.next();

  // 2) 미러 폴더 검색
  var todayMirIter = root.getFoldersByName(todayDot);
  if (!todayMirIter.hasNext()) { Logger.log("❌ 미러 " + todayDot + " 폴더 없음"); return; }
  var todayMir = todayMirIter.next();

  var copiedTotal = 0;

  // 3) 각 선생님 폴더 검사
  var teacherSubs = todayEg.getFolders();
  while (teacherSubs.hasNext()) {
    var tf = teacherSubs.next();
    var teacherName = tf.getName();
    Logger.log("\n📁 " + teacherName + " 처리");

    // docx 파일 수집
    var docxFiles = [];
    var files = tf.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      var n = f.getName();
      if (!/\.(docx?|pdf|hwpx?)$/i.test(n)) continue;
      docxFiles.push({file: f, name: n});
    }
    if (docxFiles.length === 0) { Logger.log("  docx 없음"); continue; }

    // 미러 폴더의 선생님 폴더 찾기
    var mirTeacherIter = todayMir.getFoldersByName(teacherName);
    if (!mirTeacherIter.hasNext()) { Logger.log("  미러 폴더에 " + teacherName + " 없음 → skip"); continue; }
    var mirTeacher = mirTeacherIter.next();

    // 미러 폴더의 시험 폴더 (문제생성기*) 찾기
    var mirExams = mirTeacher.getFolders();
    var emptyMirrors = [];
    while (mirExams.hasNext()) {
      var ef = mirExams.next();
      if (ef.getName().indexOf("문제생성기") < 0 && ef.getName().indexOf("단어시험") < 0) continue;
      // 빈 폴더인지 확인
      var efFiles = ef.getFiles();
      var hasFile = false;
      while (efFiles.hasNext()) {
        var efn = efFiles.next().getName();
        if (efn === "시험정보.txt" || efn === "정답.json" || efn === "desktop.ini") continue;
        hasFile = true; break;
      }
      if (!hasFile) emptyMirrors.push(ef);
    }
    Logger.log("  빈 미러 폴더: " + emptyMirrors.length + "개 / docx: " + docxFiles.length + "개");

    // 각 빈 미러 폴더에 대해 매칭 docx 복사
    emptyMirrors.forEach(function(mir){
      var mirName = mir.getName();
      // 미러 폴더 이름에서 핵심 키워드 추출 (예: 영어중2A반 + 채움구문형3 + Ch04 + 중2A반)
      // 단순화: 폴더 이름의 끝부분 "중X반" 키워드로 매칭
      var classMatch = mirName.match(/(중\d[A-Z]?반)/);
      if (!classMatch) { Logger.log("  ⚠️ " + mirName + " — 반 키워드 못 찾음"); return; }
      var classTag = classMatch[1];
      var copied = 0;
      docxFiles.forEach(function(d){
        if (d.name.indexOf(classTag) < 0) return;
        // B/C/D 세트 제외
        if (/_b_|_c_|_d_|_e_|세트b|세트c|세트d|세트e/i.test(d.name)) return;
        // 미러에 이미 있나
        var existsIter = mir.getFilesByName(d.name);
        if (existsIter.hasNext()) return;
        try {
          d.file.makeCopy(d.name, mir);
          copied++;
          Logger.log("    ✅ " + d.name);
        } catch(_e) { Logger.log("    ❌ " + d.name + ": " + _e); }
      });
      if (copied > 0) Logger.log("  → " + mirName + " 에 " + copied + "개 복사");
      copiedTotal += copied;
      // 캐시 초기화
      try { CacheService.getScriptCache().remove("fld_" + mir.getId()); } catch(_e){}
    });
  }

  // 캐시 일괄 초기화
  try {
    CacheService.getScriptCache().removeAll(["dash_" + todayDot + "_", "last_mirror_scan"]);
  } catch(_e){}

  Logger.log("\n══════════════════════════════════════");
  Logger.log("✅ 완료 — " + copiedTotal + "개 파일 복사");
  Logger.log("→ 선생님앱 새로고침");
}

// ★ v27.10 (2026-05-15): 김진용 시험 추적 진단 — 어디까지 처리됐는지 정확히 본다
//   사용: GAS 에디터 → 함수 드롭다운 → 진단_김진용 실행
function 진단_김진용() {
  Logger.log("══════════════════════════════════════");
  Logger.log("🔍 김진용 시험 진단 시작");
  Logger.log("══════════════════════════════════════");

  // [1] 정답목록 전체에서 김진용 행 찾기 (날짜 무관)
  Logger.log("\n[1] 정답목록 시트 — 김진용 행 전체 검색");
  Logger.log("────────────────────────────────────");
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("정답목록");
    var data = sh.getDataRange().getValues();
    var hdr = data[0];
    // 컬럼 인덱스 추적
    var col = {};
    hdr.forEach(function(h, i){ col[String(h).trim()] = i; });
    Logger.log("  헤더 컬럼: " + Object.keys(col).join(", "));
    var found = 0;
    for (var i=1; i<data.length; i++) {
      var row = data[i];
      var teacher = String(row[col["선생님"]||4]||"");
      if (teacher.indexOf("김진용") < 0) continue;
      found++;
      var subject = row[col["과목"]||1] || "";
      var grade   = row[col["학년"]||2] || "";
      var cls     = row[col["반"]||3] || "";
      var type    = row[col["시험종류"]||5] || row[col["종류"]||5] || "";
      var date    = row[col["시험날짜"]||6] || row[col["날짜"]||6] || "";
      var folderId = row[col["폴더ID"]||10] || "";
      Logger.log("  [행 " + (i+1) + "] " + subject + " " + grade + " " + cls + " / " + type + " / " + date + " / 폴더ID: " + (folderId ? folderId.substring(0,20)+"..." : "(빈)"));
    }
    if (found === 0) Logger.log("  ❌ 김진용 행 없음 — backgroundMirrorScan 이 정답목록 등록 자체를 못 함");
    else Logger.log("  ✅ 김진용 행 " + found + "개 발견");
  } catch(e) { Logger.log("  ❌ 정답목록 검색 실패: " + e); }

  // [2] 문제생성결과 폴더 구조 확인
  Logger.log("\n[2] Drive — 문제생성결과 폴더 구조");
  Logger.log("────────────────────────────────────");
  try {
    var roots = DriveApp.getFoldersByName("채움학원 시험자료");
    if (!roots.hasNext()) { Logger.log("  ❌ 채움학원 시험자료 폴더 없음"); }
    else {
      var root = roots.next();
      Logger.log("  ✅ 채움학원 시험자료 폴더 OK (ID: " + root.getId().substring(0,15) + "...)");
      // 문제생성결과 폴더 검색 (여러 개 가능)
      var egIter = root.getFoldersByName("문제생성결과");
      var egList = [];
      while (egIter.hasNext()) egList.push(egIter.next());
      Logger.log("  '문제생성결과' 폴더 개수: " + egList.length + (egList.length > 1 ? " ⚠️ 중복!" : ""));
      egList.forEach(function(eg, idx){
        Logger.log("\n  [문제생성결과 #" + (idx+1) + "] ID=" + eg.getId().substring(0,15) + "...");
        // 안에 날짜 폴더들 나열
        var dateIter = eg.getFolders();
        var dateNames = [];
        while (dateIter.hasNext()) dateNames.push(dateIter.next().getName());
        Logger.log("    날짜 폴더들: " + dateNames.join(", "));
        // 각 날짜 폴더 안에서 김진용 검색
        dateNames.forEach(function(dn){
          var di = eg.getFoldersByName(dn);
          if (!di.hasNext()) return;
          var df = di.next();
          var teacherIter = df.getFoldersByName("김진용");
          if (teacherIter.hasNext()) {
            var tf = teacherIter.next();
            Logger.log("    📁 " + dn + "/김진용/ (ID: " + tf.getId().substring(0,15) + "...)");
            // 파일들 나열
            var files = tf.getFiles();
            var fnames = [];
            while (files.hasNext()) fnames.push(files.next().getName());
            Logger.log("       파일 " + fnames.length + "개:");
            fnames.forEach(function(fn){ Logger.log("         - " + fn); });
          }
        });
      });
    }
  } catch(e) { Logger.log("  ❌ Drive 검색 실패: " + e); }

  // [3] 미러 폴더 — 채움학원 시험자료/<날짜>/김진용/
  Logger.log("\n[3] Drive — 미러 폴더 (채움학원 시험자료/<날짜>/김진용/)");
  Logger.log("────────────────────────────────────");
  try {
    var roots2 = DriveApp.getFoldersByName("채움학원 시험자료");
    if (roots2.hasNext()) {
      var root2 = roots2.next();
      // 가능한 날짜들 (5/14, 5/15, 5/16)
      var candidates = ["2026.05.14", "2026.05.15", "2026.05.16"];
      candidates.forEach(function(dn){
        var di = root2.getFoldersByName(dn);
        if (!di.hasNext()) { Logger.log("  " + dn + " — 폴더 없음"); return; }
        var df = di.next();
        var tIter = df.getFoldersByName("김진용");
        if (!tIter.hasNext()) { Logger.log("  " + dn + "/김진용 — 폴더 없음"); return; }
        var tf = tIter.next();
        Logger.log("  📁 " + dn + "/김진용/ (ID: " + tf.getId().substring(0,15) + "...)");
        var examFolders = tf.getFolders();
        while (examFolders.hasNext()) {
          var ef = examFolders.next();
          var efFiles = ef.getFiles();
          var fnames = [];
          while (efFiles.hasNext()) fnames.push(efFiles.next().getName());
          Logger.log("    └─ " + ef.getName() + " / 파일 " + fnames.length + "개");
          fnames.forEach(function(fn){ Logger.log("       · " + fn); });
        }
      });
    }
  } catch(e) { Logger.log("  ❌ 미러 검색 실패: " + e); }

  // [4] 시험생성큐 시트 (있다면) — 김진용 항목
  Logger.log("\n[4] 시험생성큐 시트 (있다면) — 김진용 항목");
  Logger.log("────────────────────────────────────");
  try {
    var ss2 = SpreadsheetApp.getActiveSpreadsheet();
    var qSh = ss2.getSheetByName("시험생성큐");
    if (!qSh) { Logger.log("  시험생성큐 시트 없음"); }
    else {
      var qData = qSh.getDataRange().getValues();
      var qHdr = qData[0];
      var foundQ = 0;
      for (var j=1; j<qData.length; j++) {
        var qRow = qData[j];
        if (qRow.join("\t").indexOf("김진용") < 0) continue;
        foundQ++;
        Logger.log("  [큐 행 " + (j+1) + "] " + qRow.slice(0, 8).join(" | "));
      }
      if (foundQ === 0) Logger.log("  김진용 큐 항목 없음");
    }
  } catch(e) { Logger.log("  ❌ 큐 검색 실패: " + e); }

  // [5] Drive 전체에서 '김진용' 폴더 검색 (워커가 다른 위치에 출력했을 가능성)
  Logger.log("\n[5] Drive 전체 검색 — '김진용' 폴더 모든 위치 (워커 워크스페이스 추적)");
  Logger.log("────────────────────────────────────");
  try {
    var matches = DriveApp.searchFolders("title contains '김진용' and trashed = false");
    var idx = 0;
    while (matches.hasNext()) {
      idx++;
      var f = matches.next();
      // 부모 체인 만들기
      var pathChain = [];
      var cur = f;
      for (var depth=0; depth<10; depth++) {
        pathChain.unshift(cur.getName());
        var pIter = cur.getParents();
        if (!pIter.hasNext()) break;
        cur = pIter.next();
      }
      Logger.log("  [" + idx + "] " + pathChain.join(" / ") + " (ID: " + f.getId().substring(0,15) + "...)");
      // 폴더 안 파일 5개만 미리보기
      var files = f.getFiles();
      var c = 0;
      while (files.hasNext() && c<6) {
        var fl = files.next();
        Logger.log("       · " + fl.getName().substring(0,90));
        c++;
      }
      if (c >= 6) Logger.log("       · ... (이하 생략)");
    }
    Logger.log("\n  → Drive 전체에서 '김진용' 이름 폴더 " + idx + "개 발견");
  } catch(e) { Logger.log("  ❌ Drive 전체 검색 실패: " + e); }

  // [6] '문제생성결과' 라는 이름의 모든 폴더 (워커 워크스페이스 별도 있는지)
  Logger.log("\n[6] Drive 전체 — '문제생성결과' 라는 이름 폴더 모두");
  Logger.log("────────────────────────────────────");
  try {
    var egMatches = DriveApp.searchFolders("title = '문제생성결과' and trashed = false");
    var egIdx = 0;
    while (egMatches.hasNext()) {
      egIdx++;
      var ef = egMatches.next();
      var ePath = [];
      var eCur = ef;
      for (var d=0; d<10; d++) {
        ePath.unshift(eCur.getName());
        var ePI = eCur.getParents();
        if (!ePI.hasNext()) break;
        eCur = ePI.next();
      }
      Logger.log("  [" + egIdx + "] " + ePath.join(" / ") + " (ID: " + ef.getId().substring(0,15) + "...)");
    }
    Logger.log("\n  → Drive 전체에 '문제생성결과' 폴더 " + egIdx + "개");
  } catch(e) { Logger.log("  ❌ 검색 실패: " + e); }

  Logger.log("\n══════════════════════════════════════");
  Logger.log("✅ 진단 완료");
  Logger.log("══════════════════════════════════════");
}

// ★ v27.10 (2026-05-15): 김진용 시험 긴급 복구 — Drive 전체 자동 탐색
//   동작: "김진용" 이름 폴더를 Drive 전체에서 검색 → 가장 최근 JSON + docx 매칭 → 미러 폴더 + 정답목록 자동 등록
//   사용: GAS 에디터 → 함수 드롭다운 → 긴급복구_김진용 실행
//   안전: 정답목록에 같은 선생님+반+날짜 행 있으면 skip (중복 등록 방지)
function 긴급복구_김진용() {
  Logger.log("══════════════════════════════════════");
  Logger.log("🚨 김진용 시험 긴급 복구 (Drive 전체 자동 탐색)");
  Logger.log("══════════════════════════════════════");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ansSheet = ss.getSheetByName("정답목록");
  if (!ansSheet) { Logger.log("❌ 정답목록 시트 없음"); return; }

  var roots = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!roots.hasNext()) { Logger.log("❌ 채움학원 시험자료 루트 없음"); return; }
  var rootFolder = roots.next();
  var rootId = rootFolder.getId();

  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");

  function _ensureSubFolder(parentId, name) {
    var parent = DriveApp.getFolderById(parentId);
    var iter = parent.getFoldersByName(name);
    if (iter.hasNext()) return iter.next().getId();
    return parent.createFolder(name).getId();
  }

  // 1) Drive 전체에서 "김진용" 폴더 검색
  var matches = DriveApp.searchFolders("title = '김진용' and trashed = false");
  var kjyFolders = [];
  while (matches.hasNext()) kjyFolders.push(matches.next());
  Logger.log("📁 김진용 폴더 " + kjyFolders.length + "개 발견");
  if (kjyFolders.length === 0) {
    Logger.log("❌ 김진용 폴더 없음 — 워커 출력 위치 확인 필요");
    return;
  }

  var totalProcessed = 0;
  kjyFolders.forEach(function(kjy, idx){
    // 부모 경로
    var pathChain = [];
    var cur = kjy;
    for (var d=0; d<10; d++) {
      pathChain.unshift(cur.getName());
      var pIter = cur.getParents();
      if (!pIter.hasNext()) break;
      cur = pIter.next();
    }
    Logger.log("\n[" + (idx+1) + "/" + kjyFolders.length + "] " + pathChain.join(" / "));

    // JSON 파일 수집 (처리완료 마커 제외)
    var jsonFiles = [];
    var files = kjy.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      if (!/^exam_[A-Z]_.*\.json$/i.test(f.getName())) continue;
      if (f.getName().indexOf("_처리완료_") >= 0) continue;
      jsonFiles.push(f);
    }
    Logger.log("  JSON 파일: " + jsonFiles.length + "개 (처리완료 제외)");
    if (jsonFiles.length === 0) { Logger.log("  → JSON 없음, skip"); return; }

    // 가장 최근 JSON
    jsonFiles.sort(function(a, b){
      return b.getLastUpdated().getTime() - a.getLastUpdated().getTime();
    });
    var latestJson = jsonFiles[0];
    Logger.log("  최근 JSON: " + latestJson.getName());

    // JSON 파싱
    var parsed;
    try {
      var jsonText = latestJson.getBlob().getDataAsString("UTF-8");
      parsed = JSON.parse(jsonText);
    } catch(e) {
      Logger.log("  ❌ JSON 파싱 실패: " + e);
      return;
    }

    var req = parsed.request || parsed.requestInfo || {};
    var sets = parsed.sets || [];
    var setA = sets[0] || {};
    var questions = setA.questions || [];

    var subject  = String(req.subject || "영어").trim();
    var grade    = String(req.grade || "중3").trim();
    var levelInfo = String(req.level || req.book || "").trim();
    var examTime = String(req.examTime || "").trim();
    var testDate = String(req.examDate || req.testDate || "").trim();
    var targetClass = String(req.targetClass || req.cls || req["반"] || "").trim();

    var examDateStr = testDate.replace(/-/g, ".");
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(examDateStr)) examDateStr = todayDot;

    Logger.log("  과목: " + subject + " " + grade + " " + targetClass);
    Logger.log("  시험날짜: " + examDateStr + " " + examTime);
    Logger.log("  문항수: " + questions.length);

    // 매칭 키 추출
    var jName = latestJson.getName();
    var pagePat = (jName.match(/p[\._~\-]?\d+[\-~]\d+/i) || [""])[0];
    var classPat = (jName.match(/중\d[A-Z]반|고\d[A-Z]반|초\d[A-Z]반/) || [""])[0];
    var numPat = (jName.match(/\d+문항/) || [""])[0];
    Logger.log("  매칭 키 — 페이지: '" + pagePat + "' / 반: '" + classPat + "' / 문항: '" + numPat + "'");

    // docx 후보 수집 (B/C/D 세트 제외)
    var candidates = [];
    var allFiles = kjy.getFiles();
    while (allFiles.hasNext()) {
      var df = allFiles.next();
      var dn = df.getName();
      if (!/\.(docx?|pdf|hwpx?)$/i.test(dn)) continue;
      if (/_b_|_c_|_d_|_e_|세트b|세트c|세트d|세트e/i.test(dn)) continue;
      candidates.push({file: df, name: dn});
    }
    Logger.log("  docx 후보 (A세트): " + candidates.length + "개");

    // 1차 매칭: 페이지+반+문항 모두 일치
    var examDocx = null, ansDocx = null;
    candidates.forEach(function(c){
      var matchPage = !pagePat || c.name.indexOf(pagePat) >= 0;
      var matchClass = !classPat || c.name.indexOf(classPat) >= 0;
      var matchNum = !numPat || c.name.indexOf(numPat) >= 0;
      if (matchPage && matchClass && matchNum) {
        if (/^시험지_A/i.test(c.name) && !examDocx) examDocx = c.file;
        if (/^정답표_A|^정답_A/i.test(c.name) && !ansDocx) ansDocx = c.file;
      }
    });

    // 2차 매칭 (fallback): 반만 일치
    if (!examDocx || !ansDocx) {
      candidates.forEach(function(c){
        var matchClass = !classPat || c.name.indexOf(classPat) >= 0;
        if (!matchClass) return;
        if (/^시험지_A/i.test(c.name) && !examDocx) examDocx = c.file;
        if (/^정답표_A|^정답_A/i.test(c.name) && !ansDocx) ansDocx = c.file;
      });
    }

    if (!examDocx && !ansDocx) {
      Logger.log("  ❌ 매칭되는 시험지/정답지 docx 없음, skip");
      return;
    }
    Logger.log("  ✅ 시험지: " + (examDocx ? examDocx.getName() : "(없음)"));
    Logger.log("  ✅ 정답지: " + (ansDocx ? ansDocx.getName() : "(없음)"));

    // 미러 폴더 생성
    var dateFolderId = _ensureSubFolder(rootId, examDateStr);
    var teacherFolderId = _ensureSubFolder(dateFolderId, "김진용");

    var _classTag = targetClass.replace(/\s+/g, "").replace(/[\\/:*?"<>|]/g, "");
    var _timePrefix = "";
    if (/^(\d{1,2}):(\d{2})$/.test(examTime)) {
      var m = examTime.match(/^(\d{1,2}):(\d{2})$/);
      _timePrefix = ("0"+m[1]).slice(-2) + "시" + m[2] + "분_";
    }
    var mirrorName = _timePrefix + "문제생성기_" + _classTag + "_" + questions.length + "문항";
    if (mirrorName.length > 90) mirrorName = mirrorName.substring(0, 90);
    var mirrorFolderId = _ensureSubFolder(teacherFolderId, mirrorName);
    var mirrorFolder = DriveApp.getFolderById(mirrorFolderId);

    // docx 복사
    if (examDocx) {
      var eName = examDocx.getName();
      if (!mirrorFolder.getFilesByName(eName).hasNext()) {
        examDocx.makeCopy(eName, mirrorFolder);
        Logger.log("  📋 시험지 복사");
      }
    }
    if (ansDocx) {
      var aName = ansDocx.getName();
      if (!mirrorFolder.getFilesByName(aName).hasNext()) {
        ansDocx.makeCopy(aName, mirrorFolder);
        Logger.log("  📋 정답지 복사");
      }
    }

    // 시험정보.txt
    if (!mirrorFolder.getFilesByName("시험정보.txt").hasNext()) {
      var infoTxt = "[김진용 시험 — 긴급 복구 등록]\n" +
        "선생님: 김진용\n대상반: " + targetClass + "\n" +
        "시험날짜: " + examDateStr + "\n시험시간: " + (examTime||"미정") + "\n" +
        "문항수: " + questions.length + "\n원본 JSON: " + jName + "\n" +
        "원본 경로: " + pathChain.join(" / ") + "\n" +
        "복구시각: " + new Date().toLocaleString("ko-KR") + "\n";
      mirrorFolder.createFile("시험정보.txt", infoTxt, MimeType.PLAIN_TEXT);
    }

    // 정답목록 행 추가 (중복 체크)
    var rows = ansSheet.getDataRange().getValues();
    var hdr = rows[0];
    var idxTeacher = hdr.indexOf("선생님");
    var idxClass   = hdr.indexOf("대상반");
    var idxDate    = hdr.indexOf("시험날짜");
    var idxType    = hdr.indexOf("시험종류");
    var idxFolder  = hdr.indexOf("폴더ID");
    if (idxTeacher < 0) idxTeacher = 9;
    if (idxClass < 0)   idxClass   = 11;
    if (idxDate < 0)    idxDate    = 12;
    if (idxType < 0)    idxType    = 4;
    if (idxFolder < 0)  idxFolder  = 13;

    var dupExists = false;
    for (var r=1; r<rows.length; r++) {
      if (String(rows[r][idxTeacher]) === "김진용"
          && String(rows[r][idxClass]) === targetClass
          && String(rows[r][idxDate]).indexOf(examDateStr) >= 0
          && String(rows[r][idxType]).indexOf("문제생성") >= 0) {
        dupExists = true;
        Logger.log("  ⚠️ 정답목록 행 " + (r+1) + " 이미 존재, 폴더ID 만 갱신");
        ansSheet.getRange(r+1, idxFolder+1).setValue(mirrorFolderId);
        break;
      }
    }
    if (!dupExists) {
      var answerData = questions.map(function(q, i){
        return (i+1) + ":" + String(q.answer||"").trim();
      }).join(",");
      var newRow = new Array(Math.max(20, hdr.length)).fill("");
      newRow[0] = new Date().toLocaleString("ko-KR");
      newRow[1] = subject;
      newRow[2] = grade;
      newRow[3] = levelInfo;
      newRow[idxType] = "문제생성기";
      newRow[5] = "A세트";
      newRow[6] = questions.length;
      newRow[7] = answerData;
      newRow[idxTeacher] = "김진용";
      newRow[10] = 10;
      newRow[idxClass] = targetClass;
      newRow[idxDate] = examDateStr + (examTime ? " " + examTime : "");
      newRow[idxFolder] = mirrorFolderId;
      newRow[14] = 1;
      ansSheet.appendRow(newRow);
      Logger.log("  ✅ 정답목록 행 추가 — 미러 폴더 ID: " + mirrorFolderId.substring(0,15) + "...");
    }

    totalProcessed++;
  });

  // 캐시 초기화
  try {
    CacheService.getScriptCache().removeAll(["dash_" + todayDot + "_", "last_mirror_scan"]);
  } catch(_e){}

  Logger.log("\n══════════════════════════════════════");
  Logger.log("✅ 김진용 긴급 복구 완료 — " + totalProcessed + "개 시험 등록");
  Logger.log("→ 선생님앱 Ctrl+Shift+R 강제 새로고침");
  Logger.log("══════════════════════════════════════");
}

// ============================================================
// ★ v28 (2026-05-18): 캐시 일괄 초기화 — 코드 배포 직후 즉시 새 데이터 보이게
function 캐시초기화_즉시() {
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
  var todayDash = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

  // 가능한 캐시 키 모두 시도
  var keys = [
    "dash_" + todayDot + "_", "dash_" + todayDash + "_",
    "dash_" + todayDot, "dash_" + todayDash,
    "last_mirror_scan", "today_dash", "today_dashboard"
  ];
  // 선생님별 캐시도 (자주 사용되는 이름)
  ["김건재","김우림","이새나","김진용","이강억","최유리","김용문","정예영","김효식"].forEach(function(t){
    keys.push("dash_" + todayDot + "_" + t);
    keys.push("dash_" + todayDash + "_" + t);
  });

  try {
    CacheService.getScriptCache().removeAll(keys);
    Logger.log("✅ 캐시 " + keys.length + "개 제거 시도 완료");
    Logger.log("→ 선생님앱 Ctrl+Shift+R 강제 새로고침");
  } catch(e) { Logger.log("❌ " + e); }
}

// ★ v28 핵심 — 워커 결과 등록 신규 흐름 (2026-05-16)
// ------------------------------------------------------------
// 옛 흐름: 워커가 Drive 에 저장 → GAS backgroundMirrorScan 이 5분마다 Drive 스캔
//          + regex 매칭 (자주 실패) → 정답목록 등록
//
// v28 흐름: 워커가 docx 만들고 → GAS doPost(register_exam_gen_v28) 한 번만 호출
//          payload 에 시험지/정답지 docx 파일 ID 직접 전달
//          GAS 가 정해진 위치 (채움학원시험자료/<날짜>/<선생님>/<시험명>) 로 즉시 복사
//          + 정답목록 등록. 매칭 로직 / 5분 트리거 / 백그라운드 스캔 전부 제거.
//
// 입력 (POST JSON):
//   {
//     "action": "register_exam_gen_v28",
//     "teacher": "김진용",                    // 선생님 이름
//     "targetClass": "영어 중3 A반",          // "과목 학년 반"
//     "subject": "영어",                      // 과목 (선택, targetClass 에서 파싱 가능)
//     "grade": "중3",                         // 학년 (선택)
//     "level": "A",                           // 레벨/반 (선택)
//     "examDate": "2026-05-17",               // 시험 날짜 (필수)
//     "examTime": "12:00",                    // 시험 시간 (선택, "HH:MM")
//     "testType": "grammar",                  // grammar/vocab (선택)
//     "examName": "채움6 구문형 p.36-43 40문항",  // 시험 이름
//     "questionCount": 40,                    // 문항수
//     "srcExamDocxFileId": "<시험지 docx ID>", // 워커가 만든 시험지 파일 ID
//     "srcAnswerDocxFileId": "<정답지 docx ID>",// 워커가 만든 정답지 파일 ID
//     "questions": [                          // 정답 데이터
//       {"number":1, "type":"obj", "answer":"②"},
//       {"number":2, "type":"sub", "answer":"about"},
//       ...
//     ]
//   }
//
// 출력 (JSON):
//   {"result":"ok", "folderId": "<미러 폴더 ID>", "answerRowIdx": 568}
// ============================================================
function registerExamGenResult_v28_(data) {
  // ★ LockService — 동시 호출로 중복 행 생기는 거 방지
  var _lk = LockService.getScriptLock();
  try { _lk.waitLock(10000); }
  catch(_eL){ return jsonOut_({result:"error", message:"동시 처리 중. 다시 시도해주세요."}); }

  try {
    // ─── 입력 검증 ───
    var teacher = String(data.teacher || "").trim();
    var targetClass = String(data.targetClass || "").trim();
    var examDate = String(data.examDate || "").trim();
    var srcExamId = String(data.srcExamDocxFileId || "").trim();
    var srcAnsId  = String(data.srcAnswerDocxFileId || "").trim();
    var questions = Array.isArray(data.questions) ? data.questions : [];

    if (!teacher) return jsonOut_({result:"error", message:"teacher 필수"});
    if (!targetClass) return jsonOut_({result:"error", message:"targetClass 필수"});
    if (!examDate) return jsonOut_({result:"error", message:"examDate 필수 (YYYY-MM-DD 또는 YYYY.MM.DD)"});
    if (questions.length === 0) return jsonOut_({result:"error", message:"questions 비어있음"});
    if (!srcExamId && !srcAnsId) return jsonOut_({result:"error", message:"srcExamDocxFileId 또는 srcAnswerDocxFileId 중 하나는 필수"});

    // ─── 날짜 정규화 ───
    var examDateStr = examDate.replace(/-/g, ".");
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(examDateStr)) {
      return jsonOut_({result:"error", message:"examDate 형식 오류: " + examDate});
    }

    // ─── 메타 추출 (targetClass = "영어 중3 A반") ───
    var tcParts = targetClass.split(/\s+/).filter(Boolean);
    var subject = String(data.subject || tcParts[0] || "영어").trim();
    var grade   = String(data.grade   || tcParts[1] || "").trim();
    var level   = String(data.level   || (tcParts[2] || "").replace(/반$/, "")).trim();
    var examTime = String(data.examTime || "").trim();
    var testType = String(data.testType || "grammar").trim();
    var examName = String(data.examName || "").trim();
    var qCount = Number(data.questionCount) || questions.length;

    // ─── 미러 폴더 생성 ───
    // 채움학원시험자료/<examDate>/<teacher>/<HH시MM분_문제생성기_classTag_examName>/
    var roots = DriveApp.getFoldersByName("채움학원 시험자료");
    if (!roots.hasNext()) return jsonOut_({result:"error", message:"채움학원 시험자료 루트 없음"});
    var rootFolder = roots.next();
    var rootId = rootFolder.getId();

    function _ensureSubFolder(parentId, name) {
      var parent = DriveApp.getFolderById(parentId);
      var iter = parent.getFoldersByName(name);
      if (iter.hasNext()) return iter.next().getId();
      return parent.createFolder(name).getId();
    }

    var dateFolderId = _ensureSubFolder(rootId, examDateStr);
    var teacherFolderId = _ensureSubFolder(dateFolderId, teacher);

    // 시간 prefix
    var _timePrefix = "";
    if (/^(\d{1,2}):(\d{2})$/.test(examTime)) {
      var _tm = examTime.match(/^(\d{1,2}):(\d{2})$/);
      _timePrefix = ("0"+_tm[1]).slice(-2) + "시" + _tm[2] + "분_";
    }
    var _classTag = targetClass.replace(/\s+/g, "").replace(/[\\/:*?"<>|]/g, "");
    var _examTypeTag = (testType === "vocab" ? "단어시험" : "문제생성기");
    var _examNameTag = examName ? "_" + examName.replace(/[\\/:*?"<>|]/g, "").substring(0, 50) : "";
    var mirrorFolderName = _timePrefix + _examTypeTag + "_" + _classTag + _examNameTag;
    if (mirrorFolderName.length > 100) mirrorFolderName = mirrorFolderName.substring(0, 100);

    // 같은 이름 폴더 있으면 재사용 (createUniqueSubFolder_ 의 (2),(3) 버그 회피)
    var mirrorFolderId = _ensureSubFolder(teacherFolderId, mirrorFolderName);
    var mirrorFolder = DriveApp.getFolderById(mirrorFolderId);

    // ─── docx 복사 ───
    var copiedFiles = [];
    if (srcExamId) {
      try {
        var srcExamFile = DriveApp.getFileById(srcExamId);
        var examName_ = srcExamFile.getName();
        if (!mirrorFolder.getFilesByName(examName_).hasNext()) {
          srcExamFile.makeCopy(examName_, mirrorFolder);
        }
        copiedFiles.push(examName_);
      } catch(eE) {
        Logger.log("[register_v28] 시험지 복사 실패: " + eE);
      }
    }
    if (srcAnsId) {
      try {
        var srcAnsFile = DriveApp.getFileById(srcAnsId);
        var ansName_ = srcAnsFile.getName();
        if (!mirrorFolder.getFilesByName(ansName_).hasNext()) {
          srcAnsFile.makeCopy(ansName_, mirrorFolder);
        }
        copiedFiles.push(ansName_);
      } catch(eA) {
        Logger.log("[register_v28] 정답지 복사 실패: " + eA);
      }
    }

    // ─── 시험정보.txt ───
    if (!mirrorFolder.getFilesByName("시험정보.txt").hasNext()) {
      var infoTxt = "[v28 워커 자동 등록]\n" +
        "선생님: " + teacher + "\n" +
        "대상반: " + targetClass + "\n" +
        "시험날짜: " + examDateStr + "\n" +
        "시험시간: " + (examTime||"미정") + "\n" +
        "시험유형: " + (testType==="vocab"?"단어시험":"문제생성기") + "\n" +
        "시험명: " + examName + "\n" +
        "문항수: " + qCount + "\n" +
        "등록시각: " + new Date().toLocaleString("ko-KR") + "\n";
      mirrorFolder.createFile("시험정보.txt", infoTxt, MimeType.PLAIN_TEXT);
    }

    // ─── 정답 데이터 / 유형 데이터 ───
    var answers = {};
    var types = {};
    questions.forEach(function(q, qi){
      var qNum = String(q.number || (qi + 1));
      answers[qNum] = q.answer || "";
      var qType = String(q.type || "mc");
      if (qType === "multiple_choice" || qType === "mc" || qType === "obj") {
        types[qNum] = "obj";
      } else {
        types[qNum] = "sub";
      }
    });

    // ─── 정답목록 행 추가 (중복 체크) ───
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ansSheet = ss.getSheetByName("정답목록");
    if (!ansSheet) ansSheet = ss.insertSheet("정답목록");
    if (typeof ensureAnswerSheetHeader_ === "function") ensureAnswerSheetHeader_(ansSheet);

    var existingRows = ansSheet.getDataRange().getValues();
    var hdr = existingRows[0];
    var iTeacher = hdr.indexOf("선생님"); if (iTeacher < 0) iTeacher = 9;
    var iClass   = hdr.indexOf("대상반"); if (iClass < 0) iClass = 11;
    var iDate    = hdr.indexOf("시험날짜"); if (iDate < 0) iDate = 12;
    var iType    = hdr.indexOf("시험종류"); if (iType < 0) iType = 4;
    var iFolder  = hdr.indexOf("폴더ID"); if (iFolder < 0) iFolder = 13;
    var iAnsData = hdr.indexOf("정답데이터"); if (iAnsData < 0) iAnsData = 7;
    var iTypeData = hdr.indexOf("유형데이터"); if (iTypeData < 0) iTypeData = 8;
    var iCount   = hdr.indexOf("문항수"); if (iCount < 0) iCount = 6;

    var existingRowIdx = -1;
    for (var i=1; i<existingRows.length; i++) {
      var r = existingRows[i];
      var dateMatch = String(r[iDate]).indexOf(examDateStr) >= 0;
      var teacherMatch = String(r[iTeacher]).trim() === teacher;
      var classMatch = String(r[iClass]).trim() === targetClass;
      var typeMatch = String(r[iType]).indexOf("문제생성") >= 0 || String(r[iType]).indexOf("단어시험") >= 0;
      if (dateMatch && teacherMatch && classMatch && typeMatch) {
        existingRowIdx = i + 1;
        break;
      }
    }

    if (existingRowIdx > 0) {
      // 갱신 — 폴더ID + 정답/유형 데이터
      ansSheet.getRange(existingRowIdx, iFolder + 1).setValue(mirrorFolderId);
      ansSheet.getRange(existingRowIdx, iAnsData + 1).setValue(JSON.stringify(answers));
      ansSheet.getRange(existingRowIdx, iTypeData + 1).setValue(JSON.stringify(types));
      ansSheet.getRange(existingRowIdx, iCount + 1).setValue(qCount);
      Logger.log("[register_v28] 기존 행 " + existingRowIdx + " 갱신");
      return jsonOut_({result:"ok", folderId: mirrorFolderId, answerRowIdx: existingRowIdx, action: "updated"});
    } else {
      // 새 행 추가
      var newRow = new Array(Math.max(20, hdr.length)).fill("");
      newRow[0] = new Date().toLocaleString("ko-KR");
      newRow[1] = subject;
      newRow[2] = grade;
      newRow[3] = level;
      newRow[iType] = _examTypeTag;
      newRow[5] = "세트A";
      newRow[iCount] = qCount;
      newRow[iAnsData] = JSON.stringify(answers);
      newRow[iTypeData] = JSON.stringify(types);
      newRow[iTeacher] = teacher;
      newRow[10] = 10;
      newRow[iClass] = targetClass;
      newRow[iDate] = examDateStr + (examTime ? " " + examTime : "");
      newRow[iFolder] = mirrorFolderId;
      newRow[14] = 1;
      ansSheet.appendRow(newRow);
      var newRowIdx = ansSheet.getLastRow();
      Logger.log("[register_v28] 새 행 " + newRowIdx + " 추가");
      return jsonOut_({result:"ok", folderId: mirrorFolderId, answerRowIdx: newRowIdx, action: "inserted"});
    }

  } catch(err) {
    Logger.log("[register_v28] 실패: " + err);
    return jsonOut_({result:"error", message: String(err)});
  } finally {
    try { _lk.releaseLock(); } catch(_eR){}
  }
}

// ★ v28 Phase 1 (2026-05-16): 백업 + 트리거 제거 + 비활성화 확인
//   사용: GAS 에디터 → 함수 드롭다운 → v28_Phase1_실행 (한 번만 실행)
//   동작:
//     1) 모든 시트를 별도 스프레드시트로 백업 (롤백 가능)
//     2) backgroundMirrorScan / cleanEmptyExamFolders 트리거 제거
//     3) 비활성화된 action 목록 출력
//     4) GAS 코드 백업 안내 (수동)
function v28_Phase1_실행() {
  Logger.log("══════════════════════════════════════");
  Logger.log("🛡️ v28 Phase 1 — 백업 + 부가기능 비활성화");
  Logger.log("══════════════════════════════════════");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var ts = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd_HHmm");

  // ─────────────────────────────────────────
  // [1] 모든 시트 백업
  // ─────────────────────────────────────────
  Logger.log("\n[1] 시트 백업");
  Logger.log("────────────────────────────────────");
  var backupName = "채움학원_백업_v27.10_" + ts;
  var backupUrl = "";
  try {
    var newSS = SpreadsheetApp.create(backupName);
    var sheets = ss.getSheets();
    sheets.forEach(function(sh){
      var copied = sh.copyTo(newSS);
      copied.setName(sh.getName());
    });
    try {
      var defaultSh = newSS.getSheetByName("Sheet1");
      if (defaultSh) newSS.deleteSheet(defaultSh);
    } catch(_e){}
    backupUrl = newSS.getUrl();
    Logger.log("  ✅ " + sheets.length + "개 시트 백업 완료");
    Logger.log("  📋 백업 파일명: " + backupName);
    Logger.log("  🔗 백업 URL: " + backupUrl);
  } catch(eB) {
    Logger.log("  ❌ 시트 백업 실패: " + eB);
  }

  // ─────────────────────────────────────────
  // [2] 자동 트리거 제거 (v28 은 트리거 없음)
  // ─────────────────────────────────────────
  Logger.log("\n[2] 자동 트리거 제거");
  Logger.log("────────────────────────────────────");
  var triggersToRemove = [
    "backgroundMirrorScan",     // 5분 미러 스캔 → 제거
    "cleanEmptyExamFolders",    // 빈 폴더 정리 (위험 함수) → 제거
    "processAnswerQueue"        // 옛 큐 처리 → 제거
  ];
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var removed = 0;
    var kept = [];
    for (var i=0; i<triggers.length; i++) {
      var fn = triggers[i].getHandlerFunction();
      if (triggersToRemove.indexOf(fn) >= 0) {
        try { ScriptApp.deleteTrigger(triggers[i]); removed++; Logger.log("  🗑️ 제거: " + fn); } catch(_eD){}
      } else {
        kept.push(fn);
      }
    }
    Logger.log("\n  → " + removed + "개 트리거 제거 완료");
    if (kept.length > 0) Logger.log("  → 유지된 트리거: " + kept.join(", "));
    else Logger.log("  → 남은 트리거: 0개 (모두 깨끗)");
  } catch(eT) {
    Logger.log("  ❌ 트리거 제거 실패: " + eT);
  }

  // ─────────────────────────────────────────
  // [3] 비활성화된 action 목록 확인
  // ─────────────────────────────────────────
  Logger.log("\n[3] 비활성화된 action 21개 (이 기능들은 이제 GAS 에서 차단됨)");
  Logger.log("────────────────────────────────────");
  // 위의 _v28BlockDisabled_ 함수와 동기화 필요
  var blocked = [
    "recommend_mini_exam", "submit_mini_exam_result", "list_mini_exam_progress",
    "analyze_exam_categories", "generate_explanations",
    "swap_exam_set", "force_rescan_exam_gen", "scan_exam_gen_results", "auto_register_exam_gen",
    "diag_teachers", "reclassify_teachers", "reseed_teachers",
    "diag_dash_files", "fix_answer_rows",
    "admin_purge_rounds", "admin_preview_rounds",
    "admin_list_exams_by_date", "admin_delete_exam_row",
    "admin_purge_duplicates", "admin_merge_multischool",
    "send_slack_test"
  ];
  blocked.forEach(function(a, idx){
    Logger.log("  " + (idx+1) + ". " + a);
  });

  // ─────────────────────────────────────────
  // [4] 캐시 일괄 초기화
  // ─────────────────────────────────────────
  Logger.log("\n[4] 캐시 일괄 초기화");
  Logger.log("────────────────────────────────────");
  try {
    var cache = CacheService.getScriptCache();
    var allKeys = [
      "dash_2026.05.16", "dash_2026.05.16_",
      "last_mirror_scan", "today_dash", "today_dashboard"
    ];
    cache.removeAll(allKeys);
    Logger.log("  ✅ 캐시 초기화 완료");
  } catch(_eC) { Logger.log("  ⚠️ 캐시 실패: " + _eC); }

  // ─────────────────────────────────────────
  // [5] GAS 코드 백업 안내
  // ─────────────────────────────────────────
  Logger.log("\n[5] GAS 코드 백업 안내 (수동)");
  Logger.log("────────────────────────────────────");
  Logger.log("  → 컴퓨터의 AppsScript_v27_9.txt 파일을");
  Logger.log("     'AppsScript_v27_10_백업_" + ts + ".txt' 로 복사해 보관");
  Logger.log("  → 또는 GAS 에디터 우측 상단 ⚙️ → 'JSON 다운로드'");

  Logger.log("\n══════════════════════════════════════");
  Logger.log("✅ Phase 1 완료");
  Logger.log("══════════════════════════════════════");
  Logger.log("📋 백업 위치: " + backupName);
  Logger.log("🔗 백업 URL: " + backupUrl);
  Logger.log("→ 부가 기능 21개 비활성화 됨 (시험지 업로드 / 채점 / 워커 결과 등록은 정상)");
  Logger.log("→ 다음: 제가 v28 핵심 코드 작성 중. 완성되면 알려드림.");
}

// ★ v27.11 (2026-05-16): 5/16 일괄 정리 — 행 552/549 안전 삭제 + 캐시 초기화
//   사용: GAS 에디터 → 함수 드롭다운 → 일괄정리_5월16일 실행
//   안전: 삭제 전 행 내용 체크 (예상과 다르면 skip), 백업 시트 자동 생성
function 일괄정리_5월16일() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  if (!sh) { Logger.log("❌ 정답목록 시트 없음"); return; }

  Logger.log("══════════════════════════════════════");
  Logger.log("🧹 5/16 일괄 정리 (안전 모드)");
  Logger.log("══════════════════════════════════════");

  // [백업] 삭제할 행을 백업 시트에 복사
  var backupSheetName = "정답목록_백업_5월16일_" + Utilities.formatDate(new Date(), "Asia/Seoul", "HHmm");
  var backup = ss.insertSheet(backupSheetName);
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues();
  backup.getRange(1, 1, 1, hdr[0].length).setValues(hdr);
  backup.getRange(1, hdr[0].length + 1).setValue("삭제이유");

  var deletedRows = [];

  // [1] 행 552 안전 체크 후 삭제
  Logger.log("\n[1] 행 552 (김진용 40문항 잘못된 폴더ID) 삭제 시도");
  try {
    var row552 = sh.getRange(552, 1, 1, sh.getLastColumn()).getValues()[0];
    var teacher552 = String(row552[9]||"");
    var folderId552 = String(row552[13]||"");
    Logger.log("  현재 행 552: 선생님='" + teacher552 + "', 폴더ID 시작=" + folderId552.substring(0, 10));
    if (teacher552 === "김진용" && folderId552.indexOf("19r4tt") === 0) {
      // 백업
      var bRow552 = row552.concat(["행 552 - 김진용 40문항인데 5문항 폴더 가리킴 (행 561 이 진짜)"]);
      backup.appendRow(bRow552);
      deletedRows.push(552);
      Logger.log("  ✅ 백업 + 삭제 예약 (역순으로 실제 삭제)");
    } else {
      Logger.log("  ⚠️ 예상과 다름 — skip (안전 차단)");
    }
  } catch(e) { Logger.log("  ❌ " + e); }

  // [2] 행 549 안전 체크 후 삭제
  Logger.log("\n[2] 행 549 (이강억 빈 폴더) 삭제 시도");
  try {
    var row549 = sh.getRange(549, 1, 1, sh.getLastColumn()).getValues()[0];
    var teacher549 = String(row549[9]||"");
    var folderId549 = String(row549[13]||"");
    Logger.log("  현재 행 549: 선생님='" + teacher549 + "', 폴더ID 시작=" + folderId549.substring(0, 10));
    if (teacher549 === "이강억" && folderId549.indexOf("13oQsFq") === 0) {
      // 폴더 정말 빈지 한 번 더 확인
      try {
        var f = DriveApp.getFolderById(folderId549);
        var files = f.getFiles();
        var fc = 0;
        while (files.hasNext()) { files.next(); fc++; }
        Logger.log("  폴더 안 파일 개수: " + fc);
        if (fc <= 1) {  // 시험정보.txt 1개만 있어도 빈 폴더로 간주
          var bRow549 = row549.concat(["행 549 - 이강억 폴더 비어있음 (행 550 가 정상)"]);
          backup.appendRow(bRow549);
          deletedRows.push(549);
          Logger.log("  ✅ 백업 + 삭제 예약");
        } else {
          Logger.log("  ⚠️ 폴더에 파일 " + fc + "개 — skip (안전 차단)");
        }
      } catch(_eFld) {
        Logger.log("  ❌ 폴더 접근 실패: " + _eFld + " — skip");
      }
    } else {
      Logger.log("  ⚠️ 예상과 다름 — skip");
    }
  } catch(e) { Logger.log("  ❌ " + e); }

  // [3] 실제 삭제 (역순으로 - 행 번호 mismatch 방지)
  Logger.log("\n[3] 실제 삭제 (역순)");
  deletedRows.sort(function(a,b){return b-a;});  // 역순
  deletedRows.forEach(function(rn){
    sh.deleteRow(rn);
    Logger.log("  🗑️ 행 " + rn + " 삭제 완료");
  });

  // [4] 캐시 일괄 초기화
  Logger.log("\n[4] 캐시 일괄 초기화");
  try {
    var cache = CacheService.getScriptCache();
    // 가능한 모든 캐시 키 제거 시도
    var keysToRemove = [
      "dash_2026.05.16", "dash_2026.05.16_",
      "last_mirror_scan", "today_dash",
      "today_dashboard", "examList_2026.05.16"
    ];
    cache.removeAll(keysToRemove);
    Logger.log("  ✅ 캐시 키 " + keysToRemove.length + "개 제거 시도");
  } catch(_eC) { Logger.log("  ⚠️ 캐시 초기화 실패: " + _eC); }

  Logger.log("\n══════════════════════════════════════");
  Logger.log("✅ 일괄 정리 완료 — " + deletedRows.length + "개 행 삭제");
  Logger.log("📋 백업 시트: " + backupSheetName);
  Logger.log("→ 선생님앱 Ctrl+Shift+R 강제 새로고침");
  Logger.log("══════════════════════════════════════");
}

// ★ v27.11 (2026-05-16): 5/16 종합 진단 — 정답목록 행 / 폴더ID / Drive 파일 매핑
//   사용: GAS 에디터 → 함수 드롭다운 → 진단_오늘_전체 실행
function 진단_오늘_전체() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ansSheet = ss.getSheetByName("정답목록");
  if (!ansSheet) { Logger.log("❌ 정답목록 시트 없음"); return; }

  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");

  Logger.log("══════════════════════════════════════");
  Logger.log("🔍 오늘 (" + todayDot + ") 종합 진단");
  Logger.log("══════════════════════════════════════");

  // [1] 정답목록 시트 — 오늘 행 전체 (모든 핵심 컬럼)
  Logger.log("\n[1] 정답목록 — 오늘 행 (행번호 / 선생님 / 반 / 시험종류 / 문항수 / 폴더ID / 정답데이터 길이)");
  Logger.log("────────────────────────────────────");
  var data = ansSheet.getDataRange().getValues();
  var hdr = data[0];
  function colIdx(name, fallback) {
    var i = hdr.indexOf(name);
    return i >= 0 ? i : fallback;
  }
  var iSubject = colIdx("과목", 1);
  var iGrade   = colIdx("학년", 2);
  var iLevel   = colIdx("레벨", 3);
  var iType    = colIdx("시험종류", 4);
  var iSet     = colIdx("차수", 5);
  var iCount   = colIdx("문항수", 6);
  var iAnsData = colIdx("정답데이터", 7);
  var iTeacher = colIdx("선생님", 9);
  var iClass   = colIdx("대상반", 11);
  var iDate    = colIdx("시험날짜", 12);
  var iFolder  = colIdx("폴더ID", 13);

  var todayRows = [];
  var folderIdMap = {}; // 폴더ID → [행번호들]
  for (var i=1; i<data.length; i++) {
    var row = data[i];
    var dateVal = String(row[iDate] || "");
    if (dateVal.indexOf(todayDot) < 0) continue;
    var teacher = String(row[iTeacher]||"");
    var cls = String(row[iClass]||"");
    var typeV = String(row[iType]||"");
    var setV = String(row[iSet]||"");
    var cnt = row[iCount];
    var fId = String(row[iFolder]||"").trim();
    var adLen = String(row[iAnsData]||"").length;
    Logger.log("  [행 " + (i+1) + "] " + row[iSubject] + " " + row[iGrade] + " " + row[iLevel]
               + " / " + teacher + " / " + cls + " / " + typeV + (setV ? " "+setV : "")
               + " / " + cnt + "문항 / 폴더ID: " + (fId ? fId.substring(0,15)+"..." : "(빈)")
               + " / 정답데이터 " + adLen + "자");
    todayRows.push({row: i+1, teacher: teacher, cls: cls, type: typeV, count: cnt, folderId: fId, dateVal: dateVal});
    if (fId) {
      if (!folderIdMap[fId]) folderIdMap[fId] = [];
      folderIdMap[fId].push(i+1);
    }
  }
  Logger.log("\n  → 오늘 행 총 " + todayRows.length + "개");

  // [2] 폴더ID 중복 (같은 폴더를 가리키는 행이 2개 이상?)
  Logger.log("\n[2] 폴더ID 중복 — 같은 폴더를 가리키는 행이 여러 개인지");
  Logger.log("────────────────────────────────────");
  var dupFound = 0;
  Object.keys(folderIdMap).forEach(function(fid){
    if (folderIdMap[fid].length > 1) {
      dupFound++;
      Logger.log("  ⚠️ 폴더ID " + fid.substring(0,15) + "... 를 가리키는 행: " + folderIdMap[fid].join(", "));
    }
  });
  if (dupFound === 0) Logger.log("  ✅ 중복 폴더ID 없음");
  else Logger.log("\n  → 중복 폴더ID " + dupFound + "건 발견 (같은 PDF 가 두 시험에 보이는 원인)");

  // [3] 각 행의 폴더 안 파일 목록 (앞 8개만)
  Logger.log("\n[3] 각 행 폴더 안 실제 파일들");
  Logger.log("────────────────────────────────────");
  var shown = 0;
  for (var t=0; t<todayRows.length && shown<10; t++) {
    var tr = todayRows[t];
    if (!tr.folderId) {
      Logger.log("  [행 " + tr.row + "] " + tr.teacher + " " + tr.cls + " " + tr.type + " — 폴더ID 비어있음");
      shown++; continue;
    }
    try {
      var fld = DriveApp.getFolderById(tr.folderId);
      // 부모 경로 추적
      var pathChain = [];
      var cur = fld;
      for (var d=0; d<6; d++) {
        pathChain.unshift(cur.getName());
        var pIter = cur.getParents();
        if (!pIter.hasNext()) break;
        cur = pIter.next();
      }
      Logger.log("\n  [행 " + tr.row + "] " + tr.teacher + " " + tr.cls + " " + tr.type
                 + " (" + tr.count + "문항)");
      Logger.log("    경로: " + pathChain.join(" / "));
      var files = fld.getFiles();
      var fc = 0;
      while (files.hasNext() && fc < 8) {
        var fn = files.next().getName();
        Logger.log("       · " + fn.substring(0, 90));
        fc++;
      }
      if (fc === 0) Logger.log("       ⚠️ (파일 0개)");
    } catch(e) {
      Logger.log("  [행 " + tr.row + "] 폴더 접근 실패: " + e);
    }
    shown++;
  }

  // [4] 채움학원 시험자료/문제생성결과/<오늘>/ 안 선생님별 파일
  Logger.log("\n[4] 문제생성결과/" + todayDot + "/ 선생님별 파일 (워커 원본)");
  Logger.log("────────────────────────────────────");
  try {
    var roots = DriveApp.getFoldersByName("채움학원 시험자료");
    if (!roots.hasNext()) Logger.log("  ❌ 채움학원 시험자료 폴더 없음");
    else {
      var root = roots.next();
      var egIter = root.getFoldersByName("문제생성결과");
      if (!egIter.hasNext()) Logger.log("  ❌ 문제생성결과 폴더 없음");
      else {
        var eg = egIter.next();
        var todayEgIter = eg.getFoldersByName(todayDot);
        if (!todayEgIter.hasNext()) Logger.log("  ❌ 문제생성결과/" + todayDot + " 없음");
        else {
          var todayEg = todayEgIter.next();
          var teacherSubs = todayEg.getFolders();
          while (teacherSubs.hasNext()) {
            var ts = teacherSubs.next();
            Logger.log("\n  📁 " + ts.getName());
            var tsFiles = ts.getFiles();
            var tc = 0;
            while (tsFiles.hasNext() && tc < 10) {
              var fn = tsFiles.next().getName();
              Logger.log("       · " + fn.substring(0, 90));
              tc++;
            }
            if (tc === 0) Logger.log("       (파일 0개)");
          }
        }
      }
    }
  } catch(e) { Logger.log("  ❌ " + e); }

  // [5] 채움학원 시험자료/<오늘>/ 미러 폴더 안 선생님별 시험폴더
  Logger.log("\n[5] " + todayDot + "/ 미러 폴더 — 선생님별 시험폴더 + 파일");
  Logger.log("────────────────────────────────────");
  try {
    var roots2 = DriveApp.getFoldersByName("채움학원 시험자료");
    if (roots2.hasNext()) {
      var root2 = roots2.next();
      var mirIter = root2.getFoldersByName(todayDot);
      if (!mirIter.hasNext()) Logger.log("  ❌ " + todayDot + " 폴더 없음");
      else {
        var mir = mirIter.next();
        var mTeachers = mir.getFolders();
        while (mTeachers.hasNext()) {
          var mt = mTeachers.next();
          Logger.log("\n  📁 " + mt.getName());
          var examFolds = mt.getFolders();
          while (examFolds.hasNext()) {
            var ef = examFolds.next();
            Logger.log("    └─ " + ef.getName() + " (ID: " + ef.getId().substring(0,15) + "...)");
            var efFiles = ef.getFiles();
            var efc = 0;
            while (efFiles.hasNext() && efc < 6) {
              var fn = efFiles.next().getName();
              Logger.log("         · " + fn.substring(0, 80));
              efc++;
            }
          }
        }
      }
    }
  } catch(e) { Logger.log("  ❌ " + e); }

  Logger.log("\n══════════════════════════════════════");
  Logger.log("✅ 진단 완료");
  Logger.log("══════════════════════════════════════");
}

// ★ v27.10 (2026-05-16): 문제생성큐 셀 높이 기본값(21px)으로 일괄 초기화
//   사용: GAS 에디터 → 함수 드롭다운 → 셀높이_기본값_문제생성큐 실행
function 셀높이_기본값_문제생성큐() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("문제생성큐");
  if (!sh) {
    Logger.log("❌ '문제생성큐' 시트 없음");
    return;
  }
  var maxRows = sh.getMaxRows();
  // 모든 행 높이 21px (Google Sheets 기본값) 으로
  sh.setRowHeights(1, maxRows, 21);
  Logger.log("✅ '문제생성큐' " + maxRows + "개 행 높이 21px 로 변경 완료");
  Logger.log("→ 시트 새로고침(F5) 하면 바로 보임");
}

// ★ v27.7.2 (2026-05-15): 최유리 중복 4행 정리 + 폴더 PDF 업로드 안내
function 정리_최유리_중복4행() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  var rows = sh.getDataRange().getValues();
  Logger.log("══════════════════════════════════════");
  Logger.log("🧹 최유리 / 5/15 중복 행 정리");
  Logger.log("══════════════════════════════════════");
  // 최유리 5/15 행 모두 찾기
  var matches = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    if (String(r[9]||"").trim() !== "최유리") continue;
    var dt = String(r[12]||"");
    if (dt.indexOf("2026.05.15") < 0 && dt.indexOf("2026-05-15") < 0) continue;
    matches.push({idx: i+1, etime: r[0], dt: dt, fid: String(r[13]||"").trim()});
  }
  if (matches.length === 0) { Logger.log("❌ 매칭 행 없음"); return; }
  // 가장 최근 행만 유지 (등록일시 기준)
  matches.sort(function(a,b){
    var ta = (a.etime instanceof Date) ? a.etime.getTime() : new Date(a.etime).getTime();
    var tb = (b.etime instanceof Date) ? b.etime.getTime() : new Date(b.etime).getTime();
    return tb - ta;
  });
  var keep = matches[0];
  Logger.log("\n✅ 유지: 행 " + keep.idx + " (가장 최근, " + keep.dt + ")");
  // 나머지 시험날짜 비우기
  var purged = 0;
  for (var j = 1; j < matches.length; j++) {
    try {
      sh.getRange(matches[j].idx, 13).setValue("");  // 시험날짜 비움
      sh.getRange(matches[j].idx, 19).setValue(""); // 폴더메타 초기화
      Logger.log("  🗑️  행 " + matches[j].idx + " 시험날짜 비움 (대시보드에서 제외)");
      purged++;
    } catch(_e) {}
  }
  // 유지할 행의 폴더 URL
  if (keep.fid && !/[:|]/.test(keep.fid)) {
    try {
      var f = DriveApp.getFolderById(keep.fid);
      Logger.log("\n📁 시험지·정답지 PDF 를 이 폴더에 끌어 놓으세요:");
      Logger.log("   " + f.getUrl());
    } catch(_e) { Logger.log("⚠️ 폴더 접근 실패: " + _e); }
  }
  // 캐시 초기화
  try {
    var cs = CacheService.getScriptCache();
    cs.removeAll([
      "dash_2026.05.15_", "dash_2026.05.15_최유리",
      "dash_2026-05-15_", "fld_" + keep.fid
    ]);
    Logger.log("\n✅ 캐시 초기화 완료");
  } catch(_e){}
  Logger.log("\n══════════════════════════════════════");
  Logger.log("📋 " + purged + "개 중복 행 정리 / 1개 유지");
  Logger.log("→ 위 폴더 URL 클릭 → PDF 끌어 놓기 → 선생님앱 새로고침");
}

// ★ v27.7.1 (2026-05-15): 최유리 5/15 18:00 시험 정확 진단 + 자동 복구
function 진단_최유리_5월15일() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  var rows = sh.getDataRange().getValues();
  Logger.log("══════════════════════════════════════");
  Logger.log("🔍 정답목록 — 최유리 검색 (최근 30행)");
  Logger.log("══════════════════════════════════════");
  var lastRow = rows.length;
  var start = Math.max(1, lastRow - 30);
  var found = 0;
  for (var i = start; i < lastRow; i++) {
    var r = rows[i];
    var teacher = String(r[9]||"").trim();
    if (teacher !== "최유리") continue;
    found++;
    Logger.log("\n[행 " + (i+1) + "] 등록일시: " + r[0]);
    Logger.log("  과목/학년/레벨: " + r[1]+" "+r[2]+" "+r[3]);
    Logger.log("  시험종류: " + r[4] + " / 세트: " + r[5]);
    Logger.log("  대상반: " + r[11]);
    Logger.log("  시험날짜: " + r[12]);
    Logger.log("  폴더ID: " + (r[13]||"(빈값 ❌)"));
    Logger.log("  검수상태: " + (r[16]||""));
    // 폴더 검증
    var fid = String(r[13]||"").trim();
    if (fid && !/[:|]/.test(fid)) {
      try {
        var f = DriveApp.getFolderById(fid);
        var parents = f.getParents();
        var path = [f.getName()];
        while (parents.hasNext()) { var p = parents.next(); path.unshift(p.getName()); parents = p.getParents(); }
        Logger.log("  Drive 경로: " + path.join(" / "));
        var files = f.getFiles(); var cnt = 0;
        while (files.hasNext()) {
          var ff = files.next();
          if (ff.getName() === "시험정보.txt" || ff.getName() === "정답.json") continue;
          cnt++;
        }
        Logger.log("  파일 수: " + cnt);
      } catch(_e) { Logger.log("  ❌ 폴더 접근 실패: " + _e); }
    }
  }
  Logger.log("\n══════════════════════════════════════");
  Logger.log("결과: 최유리 행 " + found + "개 발견 (최근 30행 중)");
  Logger.log("══════════════════════════════════════");
  if (found === 0) {
    Logger.log("\n❌ 정답목록에 최유리 행이 없음 — AI 검수 등록 자체가 실패");
    Logger.log("→ 자동처리로그 시트 확인 또는 GAS 실행 로그 확인 필요");
  }
}

// 자동처리로그 시트의 최근 기록 보기 (오늘 upload_exam 시도 흔적)
function 자동처리로그_최근20() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("자동처리로그");
  if (!sh) { Logger.log("자동처리로그 시트 없음 (생성된 적 없음)"); return; }
  var rows = sh.getDataRange().getValues();
  Logger.log("══════════════════════════════════════");
  Logger.log("📋 자동처리로그 최근 20건");
  Logger.log("══════════════════════════════════════");
  var start = Math.max(1, rows.length - 20);
  for (var i = start; i < rows.length; i++) {
    Logger.log("[" + i + "] " + rows[i][0] + " | " + rows[i][2] + " | " + String(rows[i][3]||"").slice(0,200));
  }
}

// ★ v27.4.2 (2026-05-15): 오늘 모든 시험 일괄 진단 + 자동 픽스
//   동작:
//     1) 정답목록의 오늘 + 미래(5일) 모든 시험 행 검사
//     2) 폴더ID 없거나 잘못된 폴더 가리키면 → 새 폴더 자동 생성 + 업데이트
//     3) 각 행의 새 폴더 URL 을 로그에 출력
//     4) 캐시 일괄 초기화
//   사용자는 1번 클릭 + URL 클릭하여 PDF 끌어 놓기만 하면 끝
function 일괄정리_오늘과미래() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var todayMs = new Date().getTime();
  Logger.log("══════════════════════════════════════");
  Logger.log("🔧 오늘 + 미래 5일 시험 일괄 진단 + 자동 픽스");
  Logger.log("══════════════════════════════════════\n");

  // 1) 오늘 + 미래 5일 범위 행 추출 (날짜 다양한 형식 대응)
  function _normDate(v) {
    if (v instanceof Date) return Utilities.formatDate(v, tz, "yyyy.MM.dd");
    return String(v||"").replace(/[^0-9]/g, "").substring(0, 8);  // "20260515"
  }
  var rows = sh.getDataRange().getValues();
  var targets = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[4]||"") === "추천보강") continue;
    var rDateN = _normDate(r[12]);
    if (rDateN.length !== 8) continue;
    var y = parseInt(rDateN.substring(0,4),10);
    var m = parseInt(rDateN.substring(4,6),10);
    var d = parseInt(rDateN.substring(6,8),10);
    var rDate = new Date(y, m-1, d).getTime();
    var diffDays = (rDate - todayMs) / (24*3600*1000);
    if (diffDays < -1 || diffDays > 5) continue;  // 어제~5일 후
    targets.push({idx:i+1, r:r, dateStr:Utilities.formatDate(new Date(y,m-1,d), tz, "yyyy.MM.dd")});
  }
  Logger.log("📋 검사 대상 행: " + targets.length + "건\n");

  var rootIter = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!rootIter.hasNext()) { Logger.log("❌ 루트 없음"); return; }
  var root = rootIter.next();

  // 2) 각 행 검사 + 픽스
  var fixed = 0, ok = 0, results = [];
  targets.forEach(function(t){
    var r = t.r, idx = t.idx;
    var teacher = String(r[9]||"").trim() || "_미분류_";
    var className = String(r[11]||"").trim();
    var subj = String(r[1]||""), gr = String(r[2]||""), lv = String(r[3]||"");
    var examType = String(r[4]||"시험").trim();
    var fid = String(r[13]||"").trim();
    var status = "?", folderUrl = "", action = "";

    // 폴더 상태 확인
    var folderOk = false;
    if (fid && !/[:|]/.test(fid)) {
      try {
        var f = DriveApp.getFolderById(fid);
        if (!f.isTrashed()) {
          // 파일 1개 이상이면 OK
          var files = f.getFiles(); var hasFile = false;
          while (files.hasNext()) {
            var n = files.next().getName();
            if (n === "시험정보.txt" || n === "정답.json" || n === "desktop.ini") continue;
            hasFile = true; break;
          }
          if (hasFile) { folderOk = true; folderUrl = f.getUrl(); status = "✅ 정상 (파일 있음)"; }
          else { status = "⚠️ 빈 폴더 (파일 미업로드)"; folderUrl = f.getUrl(); }
        } else { status = "❌ 폴더 휴지통 — 재생성 필요"; }
      } catch(_e) { status = "❌ 폴더 접근 실패 — 재생성 필요"; }
    } else { status = "❌ 폴더ID 비정상 — 새로 생성"; }

    // 폴더 없거나 잘못된 폴더면 새로 만들기
    if (!folderOk && status.indexOf("빈 폴더") < 0) {
      try {
        var dateIter = root.getFoldersByName(t.dateStr);
        var dateFolder = dateIter.hasNext() ? dateIter.next() : root.createFolder(t.dateStr);
        var teacherIter = dateFolder.getFoldersByName(teacher);
        var teacherFolder = teacherIter.hasNext() ? teacherIter.next() : dateFolder.createFolder(teacher);
        var classTag = className.replace(/\s+/g,"").replace(/반$/,"") || (subj+gr+lv);
        var examFolderName = examType + "_" + classTag + "반";
        var examIter = teacherFolder.getFoldersByName(examFolderName);
        var examFolder = examIter.hasNext() ? examIter.next() : teacherFolder.createFolder(examFolderName);
        sh.getRange(idx, 14).setValue(examFolder.getId());
        sh.getRange(idx, 19).setValue("");
        folderUrl = examFolder.getUrl();
        fixed++;
        action = "🔧 새 폴더 생성됨";
      } catch(eC) {
        action = "❌ 폴더 생성 실패: " + eC;
      }
    } else if (folderOk) {
      ok++;
      action = "유지";
    } else {
      action = "PDF 업로드 필요";
    }

    results.push({
      idx: idx, teacher: teacher, className: className, dateStr: t.dateStr,
      status: status, action: action, folderUrl: folderUrl
    });
  });

  // 3) 캐시 일괄 초기화
  try {
    var cs = CacheService.getScriptCache();
    var todayDot = Utilities.formatDate(new Date(), tz, "yyyy.MM.dd");
    cs.removeAll(["dash_" + todayDot + "_", "last_mirror_scan"]);
  } catch(_eC){}

  // 4) 결과 출력
  Logger.log("══════════════════════════════════════");
  Logger.log("📊 결과 (" + targets.length + "건 중)");
  Logger.log("══════════════════════════════════════");
  Logger.log("  ✅ 정상: " + ok + "건");
  Logger.log("  🔧 새 폴더 생성: " + fixed + "건");
  Logger.log("  ⚠️ 사용자 조치 필요: " + (targets.length - ok - fixed) + "건\n");

  results.forEach(function(r){
    Logger.log("─────────── 행 " + r.idx + " ───────────");
    Logger.log("  " + r.teacher + " / " + r.className + " / " + r.dateStr);
    Logger.log("  " + r.status + " → " + r.action);
    if (r.folderUrl) Logger.log("  📁 폴더 URL: " + r.folderUrl);
  });

  Logger.log("\n══════════════════════════════════════");
  Logger.log("📋 사용자가 할 일");
  Logger.log("══════════════════════════════════════");
  Logger.log("위 '📁 폴더 URL' 각각 클릭 → Drive 폴더 열림 → 시험지·정답지 PDF 끌어 놓기");
  Logger.log("선생님앱 새로고침 (Ctrl+Shift+R) → 모든 카드에 파일 표시");
}

// ★ v27.4.1 (2026-05-15): 정예영 5/16 시험 폴더 자동 생성 + 정답목록 연결
//   상황: 정답목록 행은 있지만 Drive 에 폴더 없음 (upload_exam 호출 안 됨 또는 PC 동기화 지연)
//   해결: 폴더 자동 생성 + 행의 폴더ID 업데이트 + 캐시 초기화
function 자동픽스_정예영_5월16일() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  Logger.log("══════════════════════════════════════");
  Logger.log("🔧 정예영 / 5/16 시험 폴더 자동 생성");
  Logger.log("══════════════════════════════════════");

  // 1) 정답목록의 정예영 / 5/16 행 찾기
  var rows = sh.getDataRange().getValues();
  var matchRow = -1;
  for (var i = rows.length-1; i >= 1; i--) {
    if (String(rows[i][9]||"").trim() !== "정예영") continue;
    var dt = String(rows[i][12]||"").trim();
    if (dt.indexOf("2026.05.16") < 0 && dt.indexOf("2026-05-16") < 0) continue;
    matchRow = i+1;
    break;
  }
  if (matchRow < 0) {
    Logger.log("❌ 정답목록에 정예영 / 2026.05.16 행 없음");
    Logger.log("→ 선생님앱에서 등록부터 다시 확인");
    return;
  }
  var r = sh.getRange(matchRow, 1, 1, 20).getValues()[0];
  var examType = String(r[4]||"시험").trim();
  var className = String(r[11]||"영어 고1 SB반").trim();
  var oldFid = String(r[13]||"").trim();
  Logger.log("✅ 행 " + matchRow + " 발견");
  Logger.log("  반: " + className + " / 시험종류: " + examType);
  Logger.log("  옛 폴더ID: " + oldFid);

  // 2) Drive 폴더 생성
  var rootIter = DriveApp.getFoldersByName("채움학원 시험자료");
  if (!rootIter.hasNext()) { Logger.log("❌ 루트 없음"); return; }
  var root = rootIter.next();

  var dateStr = "2026.05.16";
  var dateIter = root.getFoldersByName(dateStr);
  var dateFolder = dateIter.hasNext() ? dateIter.next() : root.createFolder(dateStr);
  Logger.log("✅ 날짜 폴더: " + dateStr);

  var teacherIter = dateFolder.getFoldersByName("정예영");
  var teacherFolder = teacherIter.hasNext() ? teacherIter.next() : dateFolder.createFolder("정예영");
  Logger.log("✅ 정예영 폴더");

  var classTag = className.replace(/\s+/g,"").replace(/반$/,""); // "영어고1SB"
  var examFolderName = "22시00분_" + examType + "_" + classTag + "반";
  var examIter = teacherFolder.getFoldersByName(examFolderName);
  var examFolder = examIter.hasNext() ? examIter.next() : teacherFolder.createFolder(examFolderName);
  Logger.log("✅ 시험 폴더: " + examFolderName);
  Logger.log("  새 폴더ID: " + examFolder.getId());

  // 3) 정답목록 행 업데이트
  sh.getRange(matchRow, 14).setValue(examFolder.getId());
  sh.getRange(matchRow, 19).setValue("");  // 폴더메타JSON 초기화
  Logger.log("✅ 행 " + matchRow + " 폴더ID 업데이트");

  // 4) 캐시 초기화
  try {
    var cs = CacheService.getScriptCache();
    cs.removeAll([
      "dash_2026.05.16_", "dash_2026.05.16_정예영",
      "dash_2026-05-16_", "fld_" + examFolder.getId(), "fld_" + oldFid
    ]);
    Logger.log("✅ 캐시 초기화");
  } catch(_e){}

  Logger.log("\n══════════════════════════════════════");
  Logger.log("📁 새 폴더 URL (클릭해서 열기):");
  Logger.log(examFolder.getUrl());
  Logger.log("\n📋 이제 할 일:");
  Logger.log("1. 위 URL → Drive 폴더 열림");
  Logger.log("2. 시험지 PDF + 정답지 PDF 끌어 놓기");
  Logger.log("3. 선생님앱 새로고침");
  Logger.log("══════════════════════════════════════");
}

// ★ v27.3.2 (2026-05-15): 김효식 / 국어 고1 SB반 진단 — 폴더 어디 가리키는지 확인
function 진단_김효식_국어고1() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  var rows = sh.getDataRange().getValues();
  var found = 0;
  for (var i = rows.length-1; i >= 1; i--) {
    if (String(rows[i][9]||"") !== "김효식") continue;
    if (String(rows[i][1]||"") !== "국어") continue;
    found++;
    Logger.log("══════════════════════════════════════");
    Logger.log("[행 " + (i+1) + "] 김효식 / 국어");
    Logger.log("══════════════════════════════════════");
    Logger.log("등록일시: " + rows[i][0]);
    Logger.log("과목/학년/레벨: " + rows[i][1] + " " + rows[i][2] + " " + rows[i][3]);
    Logger.log("시험종류: " + rows[i][4]);
    Logger.log("대상반: " + rows[i][11]);
    Logger.log("시험날짜: " + rows[i][12]);
    Logger.log("폴더ID: " + rows[i][13]);
    var fid = String(rows[i][13]||"").trim();
    if (!fid) { Logger.log("❌ 폴더ID 비어있음 — 업로드 실패"); continue; }
    try {
      var f = DriveApp.getFolderById(fid);
      Logger.log("실제 폴더 이름: " + f.getName());
      var path = [f.getName()];
      var parents = f.getParents();
      while (parents.hasNext()) { var p = parents.next(); path.unshift(p.getName()); parents = p.getParents(); }
      Logger.log("실제 폴더 경로: " + path.join(" / "));
      Logger.log("폴더 휴지통 상태: " + (f.isTrashed() ? "❌ 휴지통" : "✅ 정상"));
      var files = f.getFiles(); var cnt = 0;
      Logger.log("파일 목록:");
      while (files.hasNext()) { var ff = files.next(); cnt++; Logger.log("  · " + ff.getName() + " (" + Math.round(ff.getSize()/1024) + "KB)"); }
      Logger.log("파일 총 " + cnt + "개");
      // 폴더가 김효식 폴더가 맞는지 검증
      if (path.join("/").indexOf("김효식") < 0) {
        Logger.log("⚠️⚠️ 폴더가 김효식 폴더가 아님! 다른 선생님 폴더 가리킴 — 잘못된 매칭");
      }
    } catch(e) { Logger.log("❌ 폴더 접근 실패: " + e); }
  }
  if (found === 0) Logger.log("❌ 정답목록에 김효식 / 국어 행 없음");
}

// ★ v27.3.2: 김효식 행의 폴더 ID 를 직접 새 폴더로 변경 (수동 픽스)
// 사용법: 함수 안의 newFolderId 변수에 새 폴더 ID 채우고 실행
function fix_김효식_폴더재연결() {
  // ↓ 새 폴더 ID 입력 (Drive 에서 새로 만들고 URL 에서 복사)
  var newFolderId = "여기에_새_폴더ID_입력";
  if (newFolderId === "여기에_새_폴더ID_입력") {
    Logger.log("⚠️ newFolderId 변수에 실제 폴더 ID 를 입력 후 실행하세요.");
    return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length-1; i >= 1; i--) {
    if (String(rows[i][9]||"") !== "김효식") continue;
    if (String(rows[i][1]||"") !== "국어") continue;
    var old = rows[i][13];
    sh.getRange(i+1, 14).setValue(newFolderId);
    sh.getRange(i+1, 19).setValue("");  // 폴더메타JSON 초기화
    Logger.log("✅ 행 " + (i+1) + " 폴더 ID 변경: " + old + " → " + newFolderId);
    try {
      var f = DriveApp.getFolderById(newFolderId);
      Logger.log("새 폴더 이름: " + f.getName());
      var files = f.getFiles(); var cnt = 0;
      while (files.hasNext()) { cnt++; var ff = files.next(); Logger.log("  · " + ff.getName()); }
      Logger.log("파일 " + cnt + "개");
    } catch(_e){ Logger.log("❌ 새 폴더 접근 실패: " + _e); }
    try {
      CacheService.getScriptCache().removeAll(["dash_2026.05.15_", "dash_2026.05.15_김효식", "fld_" + newFolderId, "fld_" + old]);
    } catch(_eC){}
    Logger.log("✅ 캐시 초기화 — 선생님앱 새로고침하면 정확히 표시");
    return;
  }
  Logger.log("❌ 김효식 / 국어 행 못 찾음");
}

// 위험! 모든 시험 강제 재분석 (Gemini 비용 발생, 신중하게)
function rebuildCategoriesAll() {
  var start = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("정답목록");
  if (!sh || sh.getLastRow() <= 1) { Logger.log("정답목록 비어있음"); return; }
  var rows = sh.getDataRange().getValues();
  var done = 0, failed = 0;
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[4]||"") === "추천보강") continue;
    var folderId = String(r[13]||"").trim();
    var res = folderId
      ? analyzeExamCategories_({ folderId: folderId, force: true })
      : analyzeExamCategories_({ subject:String(r[1]||""), grade:String(r[2]||""), level:String(r[3]||""), examType:String(r[4]||""), force: true });
    try {
      var json = JSON.parse(res.getContent());
      if (json.result === "ok") done++; else failed++;
    } catch(_e) { failed++; }
    Utilities.sleep(500);
    if (Date.now() - start > 4 * 60 * 1000) {
      Logger.log("⏰ 4분 timeout — 다음 실행에서 계속");
      break;
    }
  }
  Logger.log("✅ rebuildCategoriesAll: 성공 "+done+" / 실패 "+failed);
}

// ════════════════════════════════════════════════════════════
// ★ v27.15 (2026-05-30): 셀 한도 응급 복구 — 1천만 셀 한도 초과 사고 해결
// ────────────────────────────────────────────────────────────
// 사고: 시험 삭제/등록 시 "통합문서의 셀 개수가 한도 10,000,000개 초과" 오류
//       → 정답 저장도 안 됨 → AI 추출 결과가 빈칸으로 보이는 사고
//
// 원인 후보 (가능성 순):
//   1. 정답목록_삭제백업_yyyyMMdd_HHmmss 시트 폭증 (삭제마다 1개씩 생성)
//   2. PerfLog 시트 행 폭증 (함수 실행마다 행 추가)
//   3. 자동처리로그 시트 행 폭증
//   4. 학생답안기록 시트 누적
//   5. FileIndex 시트 누적
//
// 사용법:
//   GAS 에디터 → 함수 드롭다운 → 긴급정리_셀한도복구 → 실행
//   → 실행 로그에서 어디서 얼마나 줄었는지 확인
// ════════════════════════════════════════════════════════════
function 긴급정리_셀한도복구() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets();
  var totalBefore = 0;
  var totalAfter = 0;
  var log = [];

  // ─── [1] 현재 상태 진단 ───
  Logger.log("══════════════════════════════════════");
  Logger.log("🩺 셀 한도 진단 시작");
  Logger.log("══════════════════════════════════════");
  Logger.log("총 시트 수: " + allSheets.length + "개");
  Logger.log("");

  var sheetInfo = [];
  allSheets.forEach(function(sh){
    var rows = sh.getMaxRows();
    var cols = sh.getMaxColumns();
    var cells = rows * cols;
    totalBefore += cells;
    sheetInfo.push({name: sh.getName(), rows: rows, cols: cols, cells: cells, sheet: sh});
  });
  sheetInfo.sort(function(a,b){ return b.cells - a.cells; });
  Logger.log("── 상위 10개 시트 (셀 수 순) ──");
  for (var i=0; i<Math.min(10, sheetInfo.length); i++) {
    var si = sheetInfo[i];
    Logger.log("  " + (i+1) + ". " + si.name + ": " + si.rows + "행 × " + si.cols + "열 = " + si.cells.toLocaleString() + " 셀");
  }
  Logger.log("");
  Logger.log("총 사용 셀: " + totalBefore.toLocaleString() + " / 10,000,000 한도 (" + Math.round(totalBefore/100000) + "%)");
  Logger.log("");

  // ─── [2] 백업 시트 일괄 삭제 ───
  //   "정답목록_삭제백업_*", "정답목록_중복백업_*", "_백업_v27*" 패턴
  Logger.log("[1/4] 백업 시트 일괄 삭제");
  Logger.log("──────────────────────────────────────");
  var bkPatterns = [
    /^정답목록_삭제백업_/,
    /^정답목록_중복백업_/,
    /^_백업_/,
    /^bk_/,
    /^backup_/i,
    /_백업_\d{8}/
  ];
  var deletedBks = 0;
  var savedCells = 0;
  for (var bi = allSheets.length - 1; bi >= 0; bi--) {
    var sh = allSheets[bi];
    var nm = sh.getName();
    var isBk = false;
    for (var pi=0; pi<bkPatterns.length; pi++) {
      if (bkPatterns[pi].test(nm)) { isBk = true; break; }
    }
    if (isBk) {
      var cells = sh.getMaxRows() * sh.getMaxColumns();
      try {
        ss.deleteSheet(sh);
        deletedBks++;
        savedCells += cells;
        log.push("  🗑️ " + nm + " (" + cells.toLocaleString() + " 셀)");
      } catch(_e) {
        log.push("  ❌ " + nm + " 삭제 실패: " + _e);
      }
    }
  }
  Logger.log("  삭제: " + deletedBks + "개 시트 (" + savedCells.toLocaleString() + " 셀 회수)");
  for (var li=0; li<Math.min(20, log.length); li++) Logger.log(log[li]);
  if (log.length > 20) Logger.log("  ... 외 " + (log.length - 20) + "개");
  log = [];
  Logger.log("");

  // ─── [3] 로그 시트 트림 (최근 1000행만 유지) ───
  Logger.log("[2/4] 로그 시트 트림 (최근 1000행만 유지)");
  Logger.log("──────────────────────────────────────");
  var logSheets = ["PerfLog", "자동처리로그", "FileIndex"];
  var trimmedRows = 0;
  logSheets.forEach(function(nm){
    var sh = ss.getSheetByName(nm);
    if (!sh) { Logger.log("  ⏭️  " + nm + " 시트 없음 (스킵)"); return; }
    var lastRow = sh.getLastRow();
    if (lastRow <= 1001) { Logger.log("  ⏭️  " + nm + ": " + lastRow + "행 — 트림 불필요"); return; }
    var rowsToDelete = lastRow - 1001;
    try {
      // 2번 행부터 N개 삭제 (헤더 1행 + 최근 1000행 유지)
      sh.deleteRows(2, rowsToDelete);
      trimmedRows += rowsToDelete;
      Logger.log("  ✂️  " + nm + ": " + rowsToDelete.toLocaleString() + "행 삭제 → " + sh.getLastRow() + "행 남음");
    } catch(_eT) {
      Logger.log("  ❌ " + nm + " 트림 실패: " + _eT);
    }
  });
  Logger.log("  총 트림: " + trimmedRows.toLocaleString() + "행");
  Logger.log("");

  // ─── [4] 빈 열·빈 행 제거 (모든 시트 대상, 안전) ───
  Logger.log("[3/4] 빈 열·빈 행 정리");
  Logger.log("──────────────────────────────────────");
  var emptyRowsRemoved = 0;
  var emptyColsRemoved = 0;
  allSheets = ss.getSheets(); // 갱신
  allSheets.forEach(function(sh){
    try {
      var lastRow = sh.getLastRow();
      var maxRow = sh.getMaxRows();
      if (maxRow > lastRow + 100) {
        var del = maxRow - lastRow - 100;
        sh.deleteRows(lastRow + 101, del);
        emptyRowsRemoved += del;
      }
      var lastCol = sh.getLastColumn();
      var maxCol = sh.getMaxColumns();
      if (maxCol > lastCol + 5) {
        var delC = maxCol - lastCol - 5;
        sh.deleteColumns(lastCol + 6, delC);
        emptyColsRemoved += delC;
      }
    } catch(_eE){}
  });
  Logger.log("  빈 행 제거: " + emptyRowsRemoved.toLocaleString() + "행");
  Logger.log("  빈 열 제거: " + emptyColsRemoved.toLocaleString() + "열");
  Logger.log("");

  // ─── [5] 최종 상태 ───
  Logger.log("[4/4] 최종 상태");
  Logger.log("──────────────────────────────────────");
  allSheets = ss.getSheets();
  allSheets.forEach(function(sh){
    totalAfter += sh.getMaxRows() * sh.getMaxColumns();
  });
  Logger.log("총 시트 수: " + allSheets.length + "개");
  Logger.log("총 사용 셀: " + totalAfter.toLocaleString() + " / 10,000,000 (" + Math.round(totalAfter/100000) + "%)");
  Logger.log("회수한 셀: " + (totalBefore - totalAfter).toLocaleString() + " (" + Math.round((totalBefore-totalAfter)/100000) + "%)");
  Logger.log("");
  Logger.log("══════════════════════════════════════");
  if (totalAfter < 8000000) {
    Logger.log("✅ 응급 복구 완료 — 정상 운영 가능");
  } else if (totalAfter < 9500000) {
    Logger.log("⚠️ 셀 회수했지만 여전히 한도 80%↑ — 추가 정리 필요");
    Logger.log("   학생답안기록 또는 정답목록 시트를 백업 후 분할 권장");
  } else {
    Logger.log("🚨 한도 95%↑ — 별도 스프레드시트로 옛 데이터 이전 필수");
  }
  Logger.log("══════════════════════════════════════");
}

// ════════════════════════════════════════════════════════════
// ★ v27.15 (2026-05-30): 셀 한도 진단만 (삭제 안 함, 안전)
// ────────────────────────────────────────────────────────────
// 사용: 어떤 시트가 가장 큰지만 확인하고 싶을 때
// ════════════════════════════════════════════════════════════
function 진단_셀한도_조회만() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets();
  var total = 0;
  var info = [];
  allSheets.forEach(function(sh){
    var rows = sh.getMaxRows();
    var cols = sh.getMaxColumns();
    var cells = rows * cols;
    total += cells;
    info.push({name: sh.getName(), rows: rows, cols: cols, cells: cells, lastRow: sh.getLastRow()});
  });
  info.sort(function(a,b){ return b.cells - a.cells; });
  Logger.log("══════════════════════════════════════");
  Logger.log("🩺 셀 한도 진단 (조회만)");
  Logger.log("══════════════════════════════════════");
  Logger.log("총 시트 수: " + allSheets.length + "개");
  Logger.log("총 사용 셀: " + total.toLocaleString() + " / 10,000,000 (" + Math.round(total/100000) + "%)");
  Logger.log("");
  Logger.log("── 시트별 상세 (셀 수 순) ──");
  for (var i=0; i<info.length; i++) {
    var s = info[i];
    Logger.log("  " + (i+1) + ". " + s.name);
    Logger.log("       " + s.rows + "행 × " + s.cols + "열 = " + s.cells.toLocaleString() + " 셀 (실제 " + s.lastRow + "행 사용)");
  }
}

// ════════════════════════════════════════════════════════════
// ★ v27.16 (2026-05-30): "오늘의 현황 안 뜸" 누락 진단
// ────────────────────────────────────────────────────────────
// 업로드했는데 대시보드에 안 보이는 시험을 추적한다.
// 한 번 실행하면 다음을 알려줌:
//   ① 셀 한도 (쓰기 실패 여부)
//   ② 업로드기록에 행이 생겼는지 + 시험날짜가 오늘인지
//   ③ 정답목록(답 등록)까지 갔는지
//   ④ 대시보드 캐시가 살아있어서 옛 화면을 보여주는지
// 사용: 함수 선택 → ▶ 실행 → 로그(Ctrl+Enter) 확인
// ════════════════════════════════════════════════════════════
function 진단_오늘현황_시험누락() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var today = new Date();
  var todayDash = Utilities.formatDate(today, tz, "yyyy-MM-dd");
  var todayDot  = Utilities.formatDate(today, tz, "yyyy.MM.dd");
  var Y = today.getFullYear(), M = today.getMonth()+1, D = today.getDate();
  function isToday(v){
    if (v instanceof Date) return Utilities.formatDate(v, tz, "yyyy-MM-dd") === todayDash;
    var s = String(v||""); if(!s) return false;
    if (s.indexOf(todayDash)!==-1 || s.indexOf(todayDot)!==-1) return true;
    var m = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
    return !!(m && parseInt(m[1],10)===Y && parseInt(m[2],10)===M && parseInt(m[3],10)===D);
  }
  function fmt(v){ return (v instanceof Date) ? Utilities.formatDate(v, tz, "MM-dd HH:mm") : String(v||""); }
  Logger.log("══════════════════════════════════════");
  Logger.log("🩺 오늘의 현황 누락 진단 — 기준 오늘 = " + todayDash);
  Logger.log("══════════════════════════════════════");

  // ① 셀 한도 (쓰기 실패 원인)
  var totalCells = 0;
  ss.getSheets().forEach(function(sh){ totalCells += sh.getMaxRows()*sh.getMaxColumns(); });
  var pct = (totalCells/10000000*100);
  Logger.log("① 셀 사용량: " + totalCells.toLocaleString() + " / 10,000,000 (" + pct.toFixed(1) + "%)"
    + (pct>=98 ? "  🚨 한도 임박 — 시트 쓰기 실패 가능! 긴급정리_셀한도복구() 먼저 실행" : "  ✅ 여유 있음"));
  Logger.log("");

  // ② 업로드기록 — 최근 40행 (오늘 = ★)
  var uSh = ss.getSheetByName("업로드기록");
  var uToday = 0;
  Logger.log("② 업로드기록 최근 항목 (★ = 시험날짜가 오늘):");
  if (uSh && uSh.getLastRow() > 1) {
    var uFrom = Math.max(2, uSh.getLastRow()-39);
    var uRows = uSh.getRange(uFrom, 1, uSh.getLastRow()-uFrom+1, Math.min(16, uSh.getLastColumn())).getValues();
    for (var i=uRows.length-1; i>=0; i--) {
      var u = uRows[i];
      var examDate = u[6] ? u[6] : u[0];
      var t = isToday(examDate);
      if (t) uToday++;
      Logger.log((t?"  ★ ":"     ")
        + "등록=" + fmt(u[0])
        + " | 시험날짜=" + (u[6] ? fmt(u[6]) : "(비어있음→등록일사용)")
        + " | " + (u[12]||"(선생님?)")
        + " | " + (u[1]||"")+(u[2]||"")+(u[3]||"") + " " + (u[5]||"")
        + " | 상태:" + (u[11]||"")
        + " | 파일:" + String(u[9]||"").slice(0,45));
    }
  } else { Logger.log("  (업로드기록 시트 비어있음)"); }
  Logger.log("  → 오늘 날짜로 잡히는 업로드 건수: " + uToday);
  Logger.log("");

  // ③ 정답목록 — 최근 40행 중 오늘 (답 등록 여부)
  var aSh = ss.getSheetByName("정답목록");
  var aToday = 0;
  Logger.log("③ 정답목록(답 등록완료) 중 오늘 시험:");
  if (aSh && aSh.getLastRow() > 1) {
    var aFrom = Math.max(2, aSh.getLastRow()-39);
    var aRows = aSh.getRange(aFrom, 1, aSh.getLastRow()-aFrom+1, Math.min(17, aSh.getLastColumn())).getValues();
    for (var k=aRows.length-1; k>=0; k--) {
      var r = aRows[k];
      var rDate = r[12] ? r[12] : r[0];
      if (!isToday(rDate)) continue;
      aToday++;
      Logger.log("  ✓ 시험날짜=" + fmt(rDate)
        + " | " + (r[9]||"(선생님?)")
        + " | " + (r[1]||"")+(r[2]||"")+(r[3]||"") + " " + (r[4]||"")
        + " | 총" + (r[6]||"?") + "문항"
        + " | 검수상태:" + (r[16]||"(없음)")
        + " | 폴더ID:" + (r[13]?"있음":"⚠️없음"));
    }
  }
  if (aToday === 0) Logger.log("  (정답목록에 오늘 등록된 시험 없음 — 아직 답 미등록이거나 쓰기 실패)");
  Logger.log("  → 정답목록 오늘 건수: " + aToday);
  Logger.log("");

  // ④ 대시보드 캐시 (옛 화면 고착 여부)
  Logger.log("④ 대시보드 응답 캐시 (5분 TTL — 살아있으면 옛 화면 고정):");
  var cache = CacheService.getScriptCache();
  var teachers = {};
  if (uToday > 0 && uSh) {
    var uFrom2 = Math.max(2, uSh.getLastRow()-39);
    var uRows2 = uSh.getRange(uFrom2, 1, uSh.getLastRow()-uFrom2+1, Math.min(13, uSh.getLastColumn())).getValues();
    uRows2.forEach(function(u){ if (isToday(u[6]?u[6]:u[0]) && u[12]) teachers[String(u[12]).trim()]=true; });
  }
  var keys = ["dash__", "dash_"+todayDash+"_", "dash_"+todayDot+"_"];
  Object.keys(teachers).forEach(function(t){
    keys.push("dash__"+t); keys.push("dash_"+todayDash+"_"+t); keys.push("dash_"+todayDot+"_"+t);
  });
  var liveKeys = 0;
  keys.forEach(function(kk){ if (cache.get(kk)) { liveKeys++; Logger.log("  ⚠️ 살아있는 캐시: " + kk + " → 이 화면은 옛 데이터"); } });
  if (liveKeys === 0) Logger.log("  ✅ 관련 캐시 없음 (캐시 문제 아님)");
  Logger.log("");

  // ⑤ 결론
  Logger.log("══════════════════════════════════════");
  Logger.log("📋 결론 가이드:");
  if (pct >= 98) {
    Logger.log("  → 셀 한도 임박. 시트 쓰기가 실패해 업로드기록 행이 안 생겼을 수 있음.");
    Logger.log("    먼저 긴급정리_셀한도복구() 실행 후 재업로드.");
  } else if (uToday === 0) {
    Logger.log("  → 업로드기록에 '오늘' 행이 없음.");
    Logger.log("    · 위 ② 목록에서 방금 올린 시험의 '시험날짜'를 확인하세요.");
    Logger.log("    · 시험날짜가 오늘이 아니면 → 업로드 시 날짜를 다른 날로 지정한 것. 그 날짜로 대시보드 조회하면 보임.");
    Logger.log("    · 아예 행 자체가 없으면 → 업로드 중 오류(자동처리로그 시트 확인).");
  } else if (liveKeys > 0) {
    Logger.log("  → 업로드기록엔 오늘 행이 있는데(=" + uToday + "건) 대시보드 캐시가 옛 화면을 보여주는 중.");
    Logger.log("    즉시 해결: 오늘현황_캐시강제비우기() 실행, 또는 대시보드 🔄 새로고침(force_scan) 클릭.");
  } else {
    Logger.log("  → 업로드기록 오늘 " + uToday + "건 있고 캐시도 안 막힘.");
    Logger.log("    선생님 필터(특정 선생님만 보기) 또는 날짜 선택을 확인하세요.");
    Logger.log("    실장님 화면(전체)에서도 안 보이면 화면 캡처와 함께 알려주세요.");
  }
  Logger.log("══════════════════════════════════════");
}

// ════════════════════════════════════════════════════════════
// ★ v27.16 (2026-05-30): 오늘의 현황 캐시 강제 비우기 (즉시 unblock)
// ────────────────────────────────────────────────────────────
// 업로드했는데 대시보드 캐시(5분)가 옛 화면을 보여줄 때 실행.
// 오늘 날짜 + 최근 업로드한 선생님들의 dash_ 캐시 키를 제거한다.
// 실행 후 대시보드를 다시 열면 새 시험이 보임.
// ════════════════════════════════════════════════════════════
function 오늘현황_캐시강제비우기() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  var today = new Date();
  var todayDash = Utilities.formatDate(today, tz, "yyyy-MM-dd");
  var todayDot  = Utilities.formatDate(today, tz, "yyyy.MM.dd");
  var cache = CacheService.getScriptCache();
  var keys = ["dash__", "dash_"+todayDash+"_", "dash_"+todayDot+"_", "last_mirror_scan"];
  // 최근 업로드기록의 선생님 이름들도 키에 포함
  try {
    var uSh = ss.getSheetByName("업로드기록");
    if (uSh && uSh.getLastRow() > 1) {
      var from = Math.max(2, uSh.getLastRow()-60);
      var rows = uSh.getRange(from, 1, uSh.getLastRow()-from+1, 13).getValues();
      var seen = {};
      rows.forEach(function(u){
        var t = String(u[12]||"").trim();
        if (t && !seen[t]) {
          seen[t] = true;
          keys.push("dash__"+t, "dash_"+todayDash+"_"+t, "dash_"+todayDot+"_"+t);
        }
      });
    }
  } catch(e){}
  cache.removeAll(keys);
  Logger.log("✅ 대시보드 캐시 " + keys.length + "개 키 제거 완료.");
  Logger.log("제거한 키:\n  " + keys.join("\n  "));
  Logger.log("\n이제 대시보드(오늘의 현황)를 새로고침하면 방금 올린 시험이 보입니다.");
}
