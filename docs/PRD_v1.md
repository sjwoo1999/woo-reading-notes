# Product Requirements Document (PRD) v1

## 1. 목적 및 범위

### 1.1 목적

"읽기 → 기록 → 연결 → 시각화 → 회고" 폐루프 제공.

사용자가 개별 독서 노트를 연결된 **지식 그래프**로 변환하여, 개념 간 관계를 탐색하고 학습을 심화시키는 플랫폼.

### 1.2 범위

#### 포함 (Release-1, 4주)
1. **노트 모델** (책/개념/인용)
2. **링크 모델** (문서 간 양방향 관계)
3. **그래프 뷰** (인터랙티브, 필터/검색)
4. **검색** (전문 검색, 태그, 링크 중심)
5. **리마인더** (1-3-7-30일 간격 복습)

#### 비포함 (추후 릴리즈)
- 공유/공개 기능
- 추천 알고리즘
- 협업 편집
- 플러그인 API

---

## 2. 핵심 사용자 시나리오 (수용 기준)

### S1: 하이라이트 → 개념 노트 생성

**시나리오**:
1. 사용자가 책 페이지에서 구절을 하이라이트한다.
2. "개념 노트로 추출" 버튼 클릭.
3. 자동으로 개념 노트 초안 생성, 위키링크 후보 제안.

**수용 기준**:
- ✅ 3클릭 이내 완료
- ✅ 개념 생성 후 자동 위키링크 후보 ≥ 3개 제안
- ✅ 제안된 링크는 사용자 확인 후 추가 (자동 생성 안 함)

**예시**:
```
하이라이트: "진화는 무작위 돌연변이와 자연선택의 결과다"
→ 개념 노트: "자연선택", "진화", "적응"
→ 후보 링크: [[진화]] relates_to [[생물학]], [[생존 전략]]
```

---

### S2: 두 노트 간 연결 추가

**시나리오**:
1. 노트 A (개념) 페이지 열기.
2. "+ 연결 추가" 버튼 → 노트 B 선택 + 관계 타입 선택.
3. 양방향 링크 자동 생성, 그래프 즉시 업데이트.

**수용 기준**:
- ✅ 5클릭 이내 완료
- ✅ 양방향 링크 자동 생성 (단방향 입력 → 양방향 관계 반영)
- ✅ 그래프 뷰에서 <300ms 내 에지 추가 (UI 지연 없음)
- ✅ 오타 방지: 이미 존재하는 링크 감지 후 경고

**관계 타입**:
- `relates_to`: 일반 관계 (기본값)
- `supports`: A가 B를 뒷받침
- `contradicts`: A가 B에 모순
- `inspired_by`: A가 B에서 영감

---

### S3: 그래프 탐색

**시나리오**:
1. "그래프 뷰" 진입.
2. 필터 (타입: 책/개념, 태그: 심리학/역사) 적용.
3. 노드 클릭 → 노트 상세 패널 열기.
4. 에지 클릭 → 관계 설명 표시.

**수용 기준**:
- ✅ 노드 렌더: <500개까지 60fps 유지 (데스크톱)
- ✅ 필터 적용: <150ms 내 재렌더
- ✅ 노드 클릭 반응: <100ms (하이라이트/패널 열기)
- ✅ 줌/팬 smooth (3차 Bézier 애니메이션)

**필터 옵션**:
```
타입: [책] [개념] [인용]
태그: (사용자 입력 체크박스)
시간: [최근 1주] [1개월] [3개월] [전체]
```

---

### S4: 회고 리마인더 처리

**시나리오**:
1. 리마인더 알림 수신 (이메일 또는 앱 푸시).
2. 링크 → 노트 상세 페이지 (리마인더 표시).
3. "복습 완료" 또는 "다시 알림" 선택.
4. 다음 리마인더 일정 자동 계산.

**수용 기준**:
- ✅ 기본 간격: 1-3-7-30일 (SRS 기반)
- ✅ 48시간 내 처리율 ≥ 40% (베타)
- ✅ Snooze 옵션 (1일/3일/1주)
- ✅ 처리 이력 기록 (완료/미완료/건너뜀)

---

## 3. 기능 요구사항

### 3.1 노트 관리

#### 타입
- **Book**: 독서한 책 (제목, 저자, 출판일, ISBN, 평점, 진행률)
- **Concept**: 추출한 개념/주제 (본문, 태그)
- **Quote**: 하이라이트/인용 (원문, 페이지, 출처 책)

#### 속성
```
Notes Table:
- id (UUID)
- user_id (FK to auth.users)
- type (enum: book, concept, quote)
- title (string, required)
- content (text, nullable)
- tags (text[], nullable)
- created_at (timestamp)
- updated_at (timestamp)
- metadata (jsonb) // book: {author, isbn, rating}, quote: {page, source_book_id}
```

#### 기능
- ✅ 생성/조회/수정/삭제 (CRUD)
- ✅ 대량 생성 (CSV/MD 가져오기)
- ✅ 버전 관리 (soft delete, updated_at 추적)

---

### 3.2 링크 및 관계

#### 모델
```
Links Table:
- id (UUID)
- user_id (FK)
- source_note_id (FK to notes)
- target_note_id (FK to notes)
- relationship_type (enum: relates_to, supports, contradicts, inspired_by)
- created_at (timestamp)

Constraint: source ≠ target (자체 링크 금지)
Index: (source, target), (target), (type)
```

#### 기능
- ✅ 양방향 관계 (한 번의 입력 → 양방향 에지)
- ✅ 관계 타입 편집
- ✅ 링크 삭제
- ✅ 링크 기반 검색 (A가 링크한 모든 노트)

---

### 3.3 그래프 뷰

#### 시각화
- **레이아웃**: Force-Directed (D3-Force)
- **노드 크기**: 링크 수 기반 (1-10 상대 크기)
- **노드 색상**: 타입 기반 (책 파랑, 개념 초록, 인용 주황)
- **에지 두께**: 관계 타입 기반

#### 상호작용
- 줌/팬 (마우스 휠/드래그)
- 노드 드래그 (고정 가능)
- 노드/에지 클릭 (세부 정보 패널)
- 필터 (타입, 태그, 시간)
- 검색 (노드명 입력 → 하이라이트)

#### 성능 목표
- 노드 ≤ 500: 60fps
- 노드 500-1k: 30fps (저사양 디바이스)
- 필터 적용: <150ms
- 초기 로드: <2s (TTFB + 렌더)

---

### 3.4 검색

#### 검색 범위
- **전문 검색**: 노트 제목+본문 (Postgres FTS)
- **태그 검색**: 정확 매칭
- **링크 검색**: A가 링크한 모든 노트, A와 연결된 경로 (BFS, depth ≤ 2)

#### 쿼리 예시
```
"심리학" → 제목/본문에 "심리학" 포함된 노트
#심리학 → 태그 "심리학" 정확 매칭
@개념A → 개념A와 직접 링크된 모든 노트
path:개념A→개념B → A에서 B까지 최단 경로
```

#### 성능
- 응답 시간: <100ms (≤1k 노트)
- 결과 정렬: 연관성 + 최신순

---

### 3.5 리마인더 (간격 반복)

#### 알고리즘 (Spaced Repetition)
```
기본 간격: 1, 3, 7, 30일
실패 시 리셋: 1일로 돌아감
성공 시 진행: 다음 간격으로 이동
```

#### 구현
```
Reminders Table:
- id (UUID)
- user_id (FK)
- note_id (FK)
- scheduled_at (timestamp)
- status (enum: pending, completed, dismissed)
- interval_level (int: 0=1d, 1=3d, 2=7d, 3=30d)
- last_reviewed_at (timestamp, nullable)
- created_at (timestamp)
```

#### 기능
- ✅ 자동 스케줄링 (노트 생성 시 1일 후 리마인더 추가)
- ✅ 알림 채널 (이메일, 선택 시 푸시)
- ✅ Snooze (1일/3일/1주)
- ✅ 다시 알림 안 함 (리셋)

---

## 4. 데이터 모델 (초안)

### 4.1 ERD

```
users (Supabase auth)
├── profiles (user_id FK, metadata)
│
├── notes (user_id FK, type, title, content, tags, metadata)
│   ├── links (source_note_id, target_note_id, relationship_type)
│   ├── highlights (note_id FK, text, page, book_id FK)
│   └── reminders (note_id FK, scheduled_at, status, interval_level)
│
└── tags (name unique per user)
    └── note_tags (note_id, tag_id)
```

### 4.2 인덱스

```sql
-- 성능 최적화
CREATE INDEX idx_notes_user_type ON notes(user_id, type);
CREATE INDEX idx_notes_created ON notes(user_id, created_at DESC);
CREATE INDEX idx_notes_fts ON notes USING GIN (to_tsvector('korean', title || ' ' || content));
CREATE INDEX idx_links_source ON links(user_id, source_note_id);
CREATE INDEX idx_links_target ON links(user_id, target_note_id);
CREATE INDEX idx_reminders_scheduled ON reminders(user_id, scheduled_at) WHERE status = 'pending';
```

### 4.3 Row-Level Security (RLS)

```sql
-- 각 사용자는 자신의 노트만 조회/수정
CREATE POLICY "Users can see their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 5. 비기능 요구사항

### 5.1 성능

| 메트릭 | 목표 |
|--------|------|
| API TTFB | <200ms (평균) |
| 그래프 렌더 (≤500 노드) | 60fps |
| 검색 응답 | <100ms |
| 그래프 필터 적용 | <150ms |
| 초기 페이지 로드 | <2.5s (LCP) |

### 5.2 신뢰성

- ✅ 오류율: <0.5% (5xx)
- ✅ 가용성: 99.5% SLA (계획된 유지보수 제외)
- ✅ 데이터 백업: Supabase 자동 일일 백업
- ✅ 사용자 백업: JSON 내보내기 기능

### 5.3 보안 및 개인정보

- ✅ 모든 데이터 TLS 암호화
- ✅ JWT 기반 인증 (Supabase)
- ✅ RLS 정책으로 사용자 격리
- ✅ 민감 정보 (개인 노트) 비공개 기본값

### 5.4 접근성

- ✅ Lighthouse A11y: ≥85
- ✅ 키보드 네비게이션 (Tab, Enter)
- ✅ 스크린리더 지원 (ARIA labels)

### 5.5 확장성

- ✅ 초기 1k 노트 기준 설계
- ✅ 5k 노트까지 성능 저하 <2배
- ✅ 그래프 뷰: LOD (Level of Detail) 캐싱

---

## 6. 지표 및 로깅

### 6.1 핵심 지표 (Analytics)

```javascript
// Event Logging (Mixpanel / PostHog)
{
  event: "note_created",
  properties: { type: "concept", tags_count: 2 }
}

{
  event: "link_added",
  properties: { relationship_type: "relates_to" }
}

{
  event: "graph_view_opened",
  properties: { node_count: 150, filters_applied: ["concept"] }
}

{
  event: "reminder_processed",
  properties: { action: "completed", interval_level: 1 }
}
```

### 6.2 대시보드 메트릭

| 메트릭 | 계산 | 목표 |
|--------|------|------|
| DAU | 일일 활성 사용자 | ≥ 5 (베타) |
| 노트당 링크 | sum(links) / sum(notes) | ≥ 1.2 |
| 그래프 세션률 | (그래프 진입 사용자 / DAU) | ≥ 30% |
| 리마인더 처리율 | completed / total | ≥ 40% |

---

## 7. 롤아웃 계획

### Phase 1: MVP (Release-1, 4주)
- 노트/링크 CRUD
- 기본 그래프 뷰
- Postgres FTS 검색
- 간격 반복 리마인더

### Phase 2: Enhancement (Release-2, 4주)
- 그래프 쿼리 (최단경로, 허브 찾기)
- 속성별 필터 (숨성도, 중요도)
- PDF/Markdown 내보내기
- 성능 최적화 (5k 노드)

### Phase 3: Scale (Release-3, 6주)
- 플러그인 API (선택사항)
- 소셜 공유 (공개 링크)
- 추천 알고리즘 (유사 노트)
- 협업 (공유 노트북)

---

## 8. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화책 |
|--------|------|------|--------|
| 그래프 성능 저하 (1k+) | 높음 | 중간 | 조기 성능 테스트(주 2), LOD/캐싱 |
| 한글 검색 정확도 | 중간 | 높음 | Mecab 테스트, 사용자 피드백 루프 |
| 데이터 마이그레이션 손실 | 높음 | 낮음 | 스크립트 검증, 이중 검사 |
| 사용자가 그래프 기능 안 씀 | 높음 | 중간 | 온보딩 가이드, 리마인더로 유도 |

---

**버전**: v1.0
**상태**: Draft
**마지막 업데이트**: 2025-11-03
**오너**: [개발자]

---

## 부록: 용어집

| 용어 | 정의 |
|------|------|
| 노트 | 사용자가 기록한 정보 단위 (책/개념/인용) |
| 링크 | 두 노트 간 명시적 관계 |
| 그래프 뷰 | 노트와 링크를 시각화한 네트워크 |
| RLS | Row-Level Security, Postgres의 행 단위 접근 제어 |
| FTS | Full-Text Search, 전문 검색 |
| SRS | Spaced Repetition System, 간격 반복 학습 |
