# 8주 실행 로드맵 (1인 개발 기준)

## 개요

**목표**: Release-1 (MVP) 완성 및 공개
**기간**: 8주 (일일 4-6시간 기준)
**가정**: 기술 기초 (Next.js, Supabase)는 확립됨

---

## Phase 1: 기초 구축 (1-2주)

### 주 1: 스키마 설계 및 API 기초

**목표**: Database 스키마 확정, API 엔드포인트 설계

#### 작업
- [ ] Supabase 프로젝트 설정 (auth 활성화, RLS 정책)
- [ ] `notes`, `links`, `reminders`, `profiles` 테이블 생성
- [ ] 인덱스 및 RLS 정책 적용
- [ ] `GET /api/notes`, `POST /api/notes`, `GET /api/notes/:id` 구현
- [ ] API 문서 작성 (Swagger 또는 Markdown)

#### 산출물
- ✅ `supabase/migrations/001_initial_schema.sql`
- ✅ `src/app/api/notes/route.ts` (CRUD)
- ✅ `docs/API.md` (업데이트)

#### 테스트
```bash
npm run type-check   # TypeScript OK
npm test             # 유닛 테스트 (notes CRUD)
```

#### 블로킹 요인
- Supabase 연결 이슈? → `npm run validate:env` 실행

---

### 주 2: 링크 및 그래프 API

**목표**: Links 테이블 및 Graph 엔드포인트 구현

#### 작업
- [ ] `POST /api/links` (링크 생성)
- [ ] `DELETE /api/links/:id` (링크 삭제)
- [ ] `GET /api/graph` (노드+에지 조회)
- [ ] `GET /api/graph/path?from=A&to=B` (최단경로)
- [ ] 링크 생성 시 양방향 자동 처리 로직
- [ ] 유닛 테스트 작성

#### 산출물
- ✅ `src/app/api/links/route.ts`
- ✅ `src/app/api/graph/route.ts`
- ✅ `src/lib/graph.ts` (Graph 알고리즘)

#### 테스트
```bash
curl -X GET http://localhost:3000/api/graph | jq '.nodes | length'
# Expected: ≥ 0
```

---

## Phase 2: 프론트엔드 기초 (3-4주)

### 주 3: 노트 UI + 위키링크

**목표**: 노트 생성/수정 UI, 위키링크 파싱 구현

#### 작업
- [ ] 노트 생성 폼 UI 구현
  - 제목, 타입(book/concept/quote), 내용, 태그
  - 메타데이터 (선택사항)
- [ ] 위키링크 파서 구현 (`[[노트명]]` 감지)
- [ ] 자동 링크 후보 제안 (키워드 매칭)
- [ ] 노트 상세 페이지 UI
- [ ] 양방향 링크 표시 (백링크)

#### 산출물
- ✅ `src/app/library/page.tsx` (노트 목록)
- ✅ `src/app/notes/new/page.tsx` (생성)
- ✅ `src/app/notes/[id]/page.tsx` (상세)
- ✅ `src/lib/wikilink.ts` (파서)
- ✅ `src/components/NoteForm.tsx`
- ✅ `src/components/LinkSuggestions.tsx`

#### 테스트
```bash
npm run build          # Build 성공?
Lighthouse 성능 체크  # Performance ≥ 70
```

#### UI/UX 체크리스트
- [ ] 폼 유효성 검증 (제목 필수)
- [ ] 에러 메시지 명확
- [ ] 타입별 메타데이터 조건부 표시
- [ ] 모바일 반응형 확인

---

### 주 4: 그래프 시각화

**목표**: 인터랙티브 그래프 뷰 구현

#### 작업
- [ ] Cytoscape.js 기본 설정
- [ ] 노드 렌더링 (타입별 색상)
- [ ] 에지 렌더링 (관계 타입별 스타일)
- [ ] Force-Directed 레이아웃
- [ ] 줌/팬 상호작용
- [ ] 노드 클릭 → 상세 패널
- [ ] 성능 측정 (노드 500개까지 60fps)

#### 산출물
- ✅ `src/app/graph/page.tsx`
- ✅ `src/components/GraphView.tsx`
- ✅ `src/lib/cytoscape-config.ts`

#### 성능 테스트
```bash
# 500 노드 그래프 생성 후 FPS 측정
npm run dev
# → /graph?limit=500
# DevTools Performance 탭에서 FPS 확인
```

---

## Phase 3: 검색 & 리마인더 (5-6주)

### 주 5: 검색 기능

**목표**: 전문 검색 및 자동완성

#### 작업
- [ ] `GET /api/search?q=<query>` 구현 (Postgres FTS)
- [ ] 한글 검색 테스트 (Mecab 또는 기본 tokenizer)
- [ ] 자동완성 (`GET /api/search/suggestions`)
- [ ] 검색 UI (검색창 + 결과 목록)
- [ ] 검색 결과 정렬 (관련성 + 최신순)
- [ ] 검색 성능 측정 (<100ms)

#### 산출물
- ✅ `src/app/api/search/route.ts`
- ✅ `src/components/SearchBox.tsx`
- ✅ `src/components/SearchResults.tsx`

#### 테스트 쿼리
```bash
# 한글 검색 테스트
curl "http://localhost:3000/api/search?q=심리학"

# 응답 시간 체크
time curl ... # <100ms?
```

---

### 주 6: 리마인더 (간격 반복)

**목표**: SRS 기반 리마인더 시스템

#### 작업
- [ ] `POST /api/reminders` (노트 리마인더 생성)
- [ ] `GET /api/reminders` (펄딩 리마인더 조회)
- [ ] `POST /api/reminders/:id/complete` (완료 처리)
- [ ] `POST /api/reminders/:id/snooze` (스누즈)
- [ ] Cron 작업 설정 (Supabase pg_cron)
- [ ] 이메일 알림 발송 (선택사항)
- [ ] 리마인더 UI (대시보드/카드)

#### 산출물
- ✅ `src/app/api/reminders/route.ts`
- ✅ `src/lib/spaced-repetition.ts` (SRS 로직)
- ✅ `src/components/ReminderCard.tsx`
- ✅ `supabase/migrations/002_cron_reminders.sql`

#### 테스트
```typescript
// SRS 로직 테스트
import { scheduleNextReminder } from '@/lib/spaced-repetition';

test('scheduleNextReminder completes progression', () => {
  let level = 0;
  for (let i = 0; i < 4; i++) {
    const { nextLevel } = scheduleNextReminder(level, 'complete');
    level = nextLevel;
  }
  expect(level).toBe(3); // 최종 레벨
});
```

---

## Phase 4: 마이그레이션 & 테스트 (7주)

### 주 7: 데이터 마이그레이션

**목표**: 기존 데이터를 신 스키마로 변환

#### 작업
- [ ] 기존 독서 데이터 분석 (MD 파일 또는 기존 DB)
- [ ] 마이그레이션 스크립트 작성
  - Book 노트로 변환
  - Highlights/Notes → Quote/Concept 변환
  - 키워드 기반 링크 제안 생성
- [ ] 샘플 데이터(10개) 수동 검증
- [ ] 전체 데이터 마이그레이션 실행
- [ ] 데이터 무결성 체크

#### 산출물
- ✅ `scripts/migrate-legacy-data.ts`
- ✅ `scripts/validate-migration.ts`
- ✅ 마이그레이션 로그 + 검증 리포트

#### 실행 단계
```bash
# 1. 백업
supabase db dump --local > backup.sql

# 2. 스크립트 실행 (드라이런)
npx ts-node scripts/migrate-legacy-data.ts --dry-run

# 3. 검증
npx ts-node scripts/validate-migration.ts

# 4. 실제 실행
npx ts-node scripts/migrate-legacy-data.ts
```

---

## Phase 5: 품질 보증 (8주)

### 주 8: 테스트 & 문서화 & 릴리즈

**목표**: Release-1 공개

#### 작업
- [ ] 유닛 테스트 작성 (목표: ≥80% 커버리지)
  - Graph utils
  - Wiki link parser
  - SRS logic
  - API endpoints (key flows)
- [ ] E2E 테스트 (Playwright)
  - 노트 생성 → 링크 추가 → 그래프 확인
  - 검색 기능
  - 리마인더 처리
- [ ] 성능 측정
  - Lighthouse 점수 ≥ 80
  - API 응답 시간 <200ms
  - 그래프 렌더 <60fps (≤500 노드)
- [ ] 접근성 검사 (A11y)
  - 키보드 네비게이션
  - 스크린리더 호환
  - 색상 대비
- [ ] 문서화 최종 검수
  - README.md 업데이트
  - API 문서 확인
  - 사용 가이드 작성
- [ ] 보안 검사
  - SQL Injection 테스트
  - XSS 체크
  - CSRF 정책 확인
- [ ] GitHub 릴리즈 준비
  - Changelog 작성
  - 버전 태그 (v1.0.0)

#### 산출물
- ✅ 테스트 커버리지 리포트 (`coverage/`)
- ✅ Lighthouse 리포트 (HTML)
- ✅ 성능 벤치마크 (`docs/PERFORMANCE.md`)
- ✅ CHANGELOG.md
- ✅ GitHub Release v1.0.0
- ✅ 사용 가이드 (`docs/USER_GUIDE.md`)

#### 테스트 실행 (자동화)
```bash
# 모든 검사 실행
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run test          # Vitest (유닛)
npm run test:e2e      # Playwright (E2E)
npm run build         # Next.js 빌드
lighthouse https://localhost:3000
```

#### 릴리즈 체크리스트
```markdown
- [ ] 모든 테스트 통과
- [ ] Lighthouse 점수 ≥ 80
- [ ] 마이그레이션 검증 완료
- [ ] 문서화 완료
- [ ] CHANGELOG 작성
- [ ] 태그 생성: git tag -a v1.0.0 -m "Release v1.0.0"
- [ ] GitHub Release 작성
- [ ] Vercel 배포 확인
```

---

## 주간 스프린트 계획 (요약)

| 주 | 목표 | 완성도 | 산출물 |
|----|------|--------|--------|
| 1 | DB 스키마 & 기본 API | ✅ | notes/links/reminders CRUD |
| 2 | Graph API | ✅ | `/api/graph`, 최단경로 |
| 3 | 노트 UI & 위키링크 | ✅ | NoteForm, 자동 제안 |
| 4 | 그래프 시각화 | ✅ | Cytoscape 뷰, 상호작용 |
| 5 | 검색 기능 | ✅ | FTS, 자동완성 |
| 6 | 리마인더 시스템 | ✅ | SRS, Cron, 알림 |
| 7 | 데이터 마이그레이션 | ✅ | 기존 → 신 스키마 |
| 8 | QA & 릴리즈 | ✅ | v1.0.0 공개 |

---

## 위험 관리

### 주요 리스크

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|---------|
| 그래프 성능 저하 | 높음 | 중간 | 주 4: 조기 성능 측정, LOD 전략 |
| 한글 검색 정확도 | 중간 | 높음 | 주 5: Mecab 테스트, 피드백 루프 |
| 마이그레이션 손실 | 높음 | 낮음 | 주 7: 백업, 검증, 샘플 테스트 |
| 타이밍 압박 | 높음 | 중간 | MVP 범위 고정, 우선순위 관리 |

### 대응 계획

**그래프 성능이 60fps 미만?**
- Cytoscape 레이아웃 알고리즘 변경 (cose → fcose)
- 노드 500개 제한 증가
- 백엔드 필터링 강화

**한글 검색이 부정확?**
- Mecab 추가 (한글 형태소 분석)
- 사용자 피드백 수집 및 쿼리 튜닝
- 후보 기능 (주 1)으로 연기

**마이그레이션 오류?**
- 롤백 계획 준비 (백업 복구)
- 스크립트 검증 재실행
- 수동 보정 (필요 시)

---

## 일일 타임라인 (권장)

```
09:00 - 10:00  | 계획 & 이슈 확인 (15분) + 개발 (45분)
10:00 - 12:00  | 집중 코딩 세션 1
12:00 - 13:00  | 점심
13:00 - 15:00  | 집중 코딩 세션 2
15:00 - 16:00  | 테스트 & 커밋
16:00 - 17:00  | 문서화 & 피드백 (선택)

주당 요구사항:
- ≥ 20시간 개발
- 매일 1 커밋 이상
- 주말: 성능 테스트 또는 정리
```

---

## 의존성 & 블로킹

### 외부 의존
- Supabase 가용성 (99.5% SLA)
- GitHub Actions 가용성
- Vercel 배포 (무료 계획)

### 내부 의존
- 주 2 → 주 3: Graph API 완성 필수
- 주 3 → 주 4: 노트 UI 완성 필수
- 주 7 → 주 8: 마이그레이션 완료 필수

---

## 성공 메트릭 (Release-1 기준)

```
✅ 모든 유닛 테스트 통과 (≥80% 커버리지)
✅ E2E 테스트 통과 (주요 시나리오)
✅ Lighthouse 점수 ≥ 80
✅ 그래프 성능: 500 노드에서 60fps
✅ API 응답: <200ms (TTFB)
✅ 검색 정확도: 상위 10개 결과 ≥80% 정밀도
✅ 데이터 마이그레이션: 100% 검증
✅ 문서화: README + API + 가이드
✅ 공개: GitHub Release v1.0.0 + Vercel 배포
```

---

## 다음 단계 (Release-2, 추후)

- 그래프 분석 (최단경로, 클러스터 탐지)
- 추천 알고리즘 (유사 노트)
- 공유/공개 기능
- 성능 최적화 (5k+ 노트)
- 플러그인 API (선택)

---

**작성 날짜**: 2025-11-03
**상태**: Ready to Execute
**오너**: [개발자]

---

## 빠른 시작 (지금 바로)

```bash
# 1. 이 문서 읽기 (완료 ✓)
# 2. 주 1 태스크 시작
git checkout -b feat/schema-and-api
npm run dev

# 3. 진행 상황 추적
git commit -m "feat(db): create notes table schema"
git log --oneline | head -10

# 4. 주간 리뷰 (매주 금요일)
npm test
npm run build
# 문제? → 다음 주 계획 조정
```

