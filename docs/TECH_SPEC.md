# Technical Specification (Tech Spec)

## 1. 아키텍처 개요

### 1.1 스택

```
┌─────────────────────────────────────┐
│ Frontend (Client)                   │
│ Next.js 15 + React 19 + TypeScript  │
│ Tailwind CSS 4 + Cytoscape.js       │
└────────────┬────────────────────────┘
             │ HTTPS + GraphQL
┌────────────▼────────────────────────┐
│ API Layer (Next.js API Routes)      │
│ - REST / Server Components          │
│ - Authentication (Supabase JWT)     │
└────────────┬────────────────────────┘
             │ PostgreSQL Protocol
┌────────────▼────────────────────────┐
│ Database (Supabase PostgreSQL)      │
│ - notes, links, reminders           │
│ - RLS Policies                      │
│ - Full-Text Search (GIN)            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Background Jobs                     │
│ - Cron: Reminders (pg_cron)         │
│ - Email notifications               │
└─────────────────────────────────────┘
```

### 1.2 배포 구성

```
GitHub (Repository)
  ↓
GitHub Actions (CI/CD)
  ├── Lint, Type-check, Build
  └── Push to Vercel on main

Vercel (Hosting)
  ├── Frontend (Next.js SSR/SSG)
  ├── API Routes
  └── Edge Functions (선택사항)

Supabase (Backend)
  ├── PostgreSQL (Data)
  ├── Auth (JWT)
  ├── Storage (optional: PDF 저장)
  └── Realtime (선택사항: 협업 기능)
```

---

## 2. 데이터 모델

### 2.1 Database Schema

```sql
-- 1. Users & Profiles (Supabase auth 연동)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notes (핵심 데이터)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('book', 'concept', 'quote')),
  title TEXT NOT NULL,
  content TEXT,

  -- Metadata (타입별로 다름)
  metadata JSONB DEFAULT '{}',
  -- book: {author: str, isbn: str, publisher: str, rating: int, progress: int, cover_url: str}
  -- quote: {page: int, source_book_id: uuid}

  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete

  CONSTRAINT title_not_empty CHECK (LENGTH(title) > 0),
  CONSTRAINT user_type_unique UNIQUE(user_id, id) -- For easier querying
);

-- 3. Links (관계)
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('relates_to', 'supports', 'contradicts', 'inspired_by')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT no_self_link CHECK (source_note_id != target_note_id),
  CONSTRAINT unique_link UNIQUE(user_id, source_note_id, target_note_id, relationship_type)
);

-- 4. Reminders (간격 반복)
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  scheduled_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'dismissed')),

  interval_level INT DEFAULT 0 CHECK (interval_level BETWEEN 0 AND 3),
  -- 0 = 1d, 1 = 3d, 2 = 7d, 3 = 30d

  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_reminder UNIQUE(user_id, note_id, interval_level, created_at)
);

-- 5. Audit Log (선택사항, 추후)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 인덱스

```sql
-- 성능 최적화
CREATE INDEX idx_notes_user_type ON notes(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_tags ON notes USING GIN(tags) WHERE deleted_at IS NULL;

-- Full-Text Search (한글)
CREATE INDEX idx_notes_fts ON notes USING GIN (
  to_tsvector('korean', COALESCE(title, '') || ' ' || COALESCE(content, ''))
) WHERE deleted_at IS NULL;

-- 그래프 쿼리 최적화
CREATE INDEX idx_links_source ON links(user_id, source_note_id);
CREATE INDEX idx_links_target ON links(user_id, target_note_id);
CREATE INDEX idx_links_type ON links(user_id, relationship_type);

-- 리마인더 쿼리 최적화
CREATE INDEX idx_reminders_scheduled ON reminders(user_id, scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_reminders_note ON reminders(note_id);
```

### 2.3 Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Notes: 사용자는 자신의 노트만 조회/수정
CREATE POLICY "Users can see their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- Links: 자신의 노트 간 링크만
CREATE POLICY "Users can manage links between own notes" ON links
  FOR ALL USING (auth.uid() = user_id);

-- Reminders: 자신의 리마인더만
CREATE POLICY "Users can manage own reminders" ON reminders
  FOR ALL USING (auth.uid() = user_id);
```

---

## 3. API 설계

### 3.1 REST 엔드포인트

#### Notes
```
GET    /api/notes                          # 사용자의 모든 노트
POST   /api/notes                          # 새 노트 생성
GET    /api/notes/:id                      # 노트 상세 조회
PATCH  /api/notes/:id                      # 노트 수정
DELETE /api/notes/:id                      # 노트 삭제 (soft)

GET    /api/notes/search?q=<query>         # 전문 검색
GET    /api/notes/by-tag?tag=<tag>         # 태그별 조회
```

#### Links
```
POST   /api/links                          # 링크 생성
GET    /api/links?source=<note_id>         # 특정 노트에서 출발하는 링크
DELETE /api/links/:id                      # 링크 삭제
```

#### Graph
```
GET    /api/graph                          # 그래프 데이터 (nodes + edges)
       ?type=concept,book                  # 필터: 타입
       &tag=psychology                     # 필터: 태그
       &limit=500                          # 최대 노드 수

GET    /api/graph/path?from=<id>&to=<id>  # 최단 경로 (A→B)
GET    /api/graph/stats                    # 그래프 통계 (노드/에지 수, 밀도 등)
```

#### Search
```
GET    /api/search?q=<query>               # 노트 제목/본문/태그 검색
       &type=concept                       # 타입별 필터
       &limit=20

GET    /api/search/suggestions?q=<prefix>  # 자동완성 제안
```

#### Reminders
```
GET    /api/reminders                      # 펄딩 리마인더 조회
POST   /api/reminders/:id/complete         # 리마인더 완료
POST   /api/reminders/:id/snooze           # 스누즈 (1d/3d/1w)
POST   /api/reminders/:id/dismiss          # 다시 알림 안 함
```

### 3.2 요청/응답 예시

#### 그래프 조회
```bash
GET /api/graph?type=concept&tag=psychology HTTP/1.1

Response: 200 OK
{
  "nodes": [
    { "id": "uuid-1", "label": "심리학", "type": "concept", "tags": ["science"] },
    { "id": "uuid-2", "label": "인지 편향", "type": "concept", "tags": ["psychology"] }
  ],
  "edges": [
    {
      "id": "link-1",
      "source": "uuid-1",
      "target": "uuid-2",
      "relationship_type": "relates_to"
    }
  ],
  "stats": {
    "total_nodes": 127,
    "total_edges": 234,
    "density": 0.28
  }
}
```

#### 검색
```bash
GET /api/search?q=진화&type=concept HTTP/1.1

Response: 200 OK
{
  "results": [
    {
      "id": "uuid-1",
      "title": "진화",
      "type": "concept",
      "snippet": "…다윈이 주장한 진화론은…",
      "relevance_score": 0.95
    }
  ],
  "total": 5,
  "query_time_ms": 42
}
```

---

## 4. 그래프 시각화 (클라이언트)

### 4.1 라이브러리

```javascript
// Core
- React 19 + Next.js 15 (App Router)
- Cytoscape.js (대규모 그래프)
- d3-force (레이아웃 계산)

// UI Components
- Tailwind CSS 4 (스타일링)
- Headless UI / Radix UI (접근성)
- Framer Motion (애니메이션)

// Data Fetching
- TanStack Query (캐싱, 동기화)
- fetch API (간단한 경우)

// 분석 (선택사항)
- PostHog / Mixpanel (이벤트)
```

### 4.2 성능 최적화 전략

#### 4.2.1 렌더링

```typescript
// Cytoscape.js 성능 최적화
const cy = cytoscape({
  container: document.getElementById('cy'),
  style: [
    { selector: 'node', style: { /* 스타일 */ } }
  ],
  layout: {
    name: 'cose',
    directed: false,
    animate: false, // 초기 렌더 후 애니메이션
  },
  headless: false, // GPU 가속
});

// LOD (Level of Detail)
if (nodeCount > 500) {
  // 심화된 스타일 비활성화
  // 에지 선 두께 단순화
}
```

#### 4.2.2 캐싱

```typescript
// React Query 캐싱
const { data: graph } = useQuery({
  queryKey: ['graph', filters], // 필터 변경 시만 새 쿼리
  queryFn: () => fetchGraph(filters),
  staleTime: 5 * 60 * 1000, // 5분
  gcTime: 10 * 60 * 1000, // 10분 (구: cacheTime)
});
```

#### 4.2.3 가상화 (노드 ≥ 500)

```typescript
// Canvas 기반 가상 스크롤 (Cytoscape 내장)
cy.pan({ x: 0, y: 0 }); // Viewport 중심
cy.fit(); // 초기 맞춤
```

---

## 5. 기술 구현 세부사항

### 5.1 위키링크 파싱

```typescript
// [[노트명]] 형식 자동 감지 및 링크 생성
const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

function parseWikiLinks(content: string): string[] {
  const matches = [...content.matchAll(wikiLinkRegex)];
  return matches.map(m => m[1]);
}

// 예: "[[심리학]]은 [[인지 편향]]을 연구한다"
// → ['심리학', '인지 편향']
```

### 5.2 전문 검색 (PostgreSQL FTS)

```sql
-- 한글 검색
SELECT * FROM notes
WHERE to_tsvector('korean', title || ' ' || content) @@
      plainto_tsquery('korean', '진화')
AND user_id = $1
AND deleted_at IS NULL
ORDER BY ts_rank(to_tsvector('korean', title || ' ' || content),
         plainto_tsquery('korean', '진화')) DESC;
```

### 5.3 간격 반복 (Spaced Repetition)

```typescript
// 리마인더 스케줄링 로직
const INTERVALS = [1, 3, 7, 30]; // 일 단위

function scheduleNextReminder(
  currentLevel: number,
  action: 'complete' | 'fail'
): { nextLevel: number; nextScheduledAt: Date } {

  if (action === 'complete') {
    const nextLevel = Math.min(currentLevel + 1, 3);
    const daysUntilNext = INTERVALS[nextLevel];
    return {
      nextLevel,
      nextScheduledAt: addDays(new Date(), daysUntilNext)
    };
  } else {
    // 실패 시 레벨 1(3일)로 리셋
    return {
      nextLevel: 1,
      nextScheduledAt: addDays(new Date(), 3)
    };
  }
}
```

---

## 6. 마이그레이션 (기존 데이터)

### 6.1 현재 구조 → 신 구조

```typescript
// 기존: MD 파일 또는 DB의 평면 "books" 테이블
// 신규: notes(book) + notes(concept) + links

interface LegacyBook {
  id: string;
  title: string;
  author: string;
  rating: number;
  notes: string[]; // MD 텍스트 배열
}

interface NewNote {
  id: UUID;
  user_id: UUID;
  type: 'book' | 'concept' | 'quote';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
}

// 마이그레이션 알고리즘
async function migrateBookToNotes(legacy: LegacyBook) {
  // 1. Book 노트 생성
  const bookNote: NewNote = {
    type: 'book',
    title: legacy.title,
    metadata: { author: legacy.author, rating: legacy.rating },
    // ...
  };

  // 2. 각 노트 텍스트 → Concept 노트로 분해
  for (const noteText of legacy.notes) {
    const conceptNote = extractConcept(noteText); // NLP
    // 3. Book ↔ Concept 링크 생성
    createLink(bookNote.id, conceptNote.id, 'relates_to');
  }
}
```

### 6.2 검증

```typescript
// 마이그레이션 검증 체크리스트
async function validateMigration() {
  const legacyCount = await getLegacyCount();
  const newCount = await getNewNotesCount('book');

  console.assert(
    legacyCount === newCount,
    `Count mismatch: ${legacyCount} vs ${newCount}`
  );

  // 샘플 검증 (10개)
  const samples = await getLegacySamples(10);
  for (const sample of samples) {
    const migrated = await getNotesByLegacyId(sample.id);
    console.assert(migrated.length > 0, `Missing: ${sample.id}`);
  }
}
```

---

## 7. 배포 및 인프라

### 7.1 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# 선택사항
SUPABASE_SERVICE_KEY=eyJxxxxx... # 백엔드 전용
ALADIN_TTB_KEY=<korean-book-api>
ANALYTICS_KEY=<posthog-key>
```

### 7.2 배포 파이프라인 (GitHub Actions)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci && npm run type-check && npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: vercel/action@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### 7.3 모니터링

```typescript
// Sentry (에러 추적)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// PostHog (분석)
import PostHog from 'posthog-js';

PostHog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
});
```

---

## 8. 테스트 전략

### 8.1 유닛 테스트

```typescript
// utils/graph.test.ts
describe('Graph Utils', () => {
  test('calculates shortest path correctly', () => {
    const graph = { nodes: [...], edges: [...] };
    const path = findShortestPath(graph, 'A', 'B');
    expect(path).toEqual(['A', 'C', 'B']);
  });

  test('parses wiki links correctly', () => {
    const text = '[[개념A]]와 [[개념B]]';
    const links = parseWikiLinks(text);
    expect(links).toEqual(['개념A', '개념B']);
  });
});
```

### 8.2 통합 테스트

```typescript
// __tests__/api/notes.test.ts
describe('POST /api/notes', () => {
  test('creates a note and returns it', async () => {
    const res = await POST(createMockRequest({
      title: '테스트',
      type: 'concept',
    }));

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});
```

### 8.3 E2E 테스트

```typescript
// playwright/graph.spec.ts
test('User can create and link two notes, then view graph', async ({ page }) => {
  await page.goto('/library');

  // 노트 생성
  await page.click('[data-testid="new-note"]');
  await page.fill('input[name="title"]', '테스트 개념');
  await page.click('button[type="submit"]');

  // 그래프 뷰
  await page.goto('/graph');
  await expect(page.locator('canvas')).toBeVisible();

  // 필터
  await page.click('[data-testid="filter-concept"]');
  await expect(page.locator('text=테스트 개념')).toBeVisible();
});
```

---

## 9. 성능 목표 (측정 방법)

| 메트릭 | 목표 | 측정 도구 |
|--------|------|---------|
| LCP (초기 로드) | <2.5s | Lighthouse, Web Vitals |
| TTFB (서버) | <200ms | Chrome DevTools, Vercel Analytics |
| 그래프 FPS (≤500노드) | 60fps | Cytoscape 성능 API |
| 검색 응답 | <100ms | API 로깅 |
| TTI (Interactive) | <3.5s | Lighthouse |

---

## 부록: 의존성

```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "@supabase/supabase-js": "^2.58.0",
    "@supabase/ssr": "^0.7.0",
    "cytoscape": "^3.33.1",
    "react-cytoscapejs": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "d3-force": "^3.0.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^9.0.0",
    "@testing-library/react": "^14.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

---

**버전**: 1.0
**상태**: Draft
**마지막 업데이트**: 2025-11-03
**오너**: [개발자]
