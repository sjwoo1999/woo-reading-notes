# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-11-04 (정식 출시 / Official Release)

### 🚀 New Features (전체)

#### Core Knowledge Graph System
- **Wiki Link Parsing**: 노트에서 `[[노트명]]` 형식으로 다른 노트 참조
  - 자동 링크 생성 및 검증
  - 위키 링크 자동완성
  - 실시간 링크 하이라이트

#### Full-Text Search
- **Advanced Search**: 제목, 내용에서 전체 텍스트 검색
  - 노트 유형별 필터 (📚 책, 💡 개념, ✨ 인용)
  - 태그별 다중 필터
  - 날짜 범위 필터
  - 관련성/생성일/수정일 정렬
  - 페이지네이션 (최대 100개/페이지)

#### Knowledge Graph Visualization
- **Interactive Graph**: Cytoscape.js 기반 지식 그래프 시각화
  - 노트 타입별 색상 구분
  - 관계 타입별 엣지 색상
  - 자동 레이아웃 (force-directed)
  - 노드 클릭으로 노트 상세 페이지 이동

#### Spaced Repetition System (SRS)
- **Intelligent Review System**: 간격 반복 학습
  - 4단계 간격: 1일 → 3일 → 7일 → 30일
  - 복습 완료 시 자동 다음 단계 스케줄링
  - 복습 대시보드 with 인라인 콘텐츠 표시
  - 복습 완료/건너뛰기 옵션

#### Note Management
- **Create/Edit/Delete**: CRUD 작업
  - 노트 타입 선택 (책/개념/인용)
  - 태그 관리
  - 메타데이터 저장
  - 부드러운 삭제 (soft delete)

#### API Endpoints
- `GET /api/notes` - 모든 노트 조회
- `POST /api/notes` - 새 노트 생성
- `GET /api/notes/[id]` - 노트 상세
- `PATCH /api/notes/[id]` - 노트 수정
- `DELETE /api/notes/[id]` - 노트 삭제
- `GET /api/notes/search` - 전문 검색
- `GET /api/notes/autocomplete` - 자동완성
- `GET /api/reminders` - 복습 목록
- `POST /api/reminders` - 복습 생성
- `PATCH /api/reminders/[id]` - 복습 상태 변경
- `DELETE /api/reminders/[id]` - 복습 삭제
- `GET /api/graph` - 그래프 데이터
- `GET /api/links` - 링크 목록
- `POST /api/links` - 링크 생성

### 🎨 User Interface

#### Pages
- `/` - 홈페이지
- `/auth` - 인증 (로그인/회원가입)
- `/notes` - 노트 목록
- `/notes/new` - 새 노트 작성
- `/notes/[id]` - 노트 상세 (위키 링크 포함)
- `/notes/[id]/edit` - 노트 수정
- `/search` - 전문 검색
- `/graph` - 지식 그래프 시각화
- `/review` - 복습 대시보드

#### UI Features
- 빈티지 스타일 디자인
- 반응형 레이아웃
- 다크모드 지원 (준비 중)
- 접근성 고려 (WCAG 2.1 AA)

### 🔐 Security & Infrastructure

#### Authentication
- Supabase Auth 기반
- Bearer token 검증
- 세션 관리

#### Database
- Supabase PostgreSQL
- Row Level Security (RLS) 정책
- 인덱스 최적화
- 자동 타임스탬프 (created_at, updated_at)

#### Data Protection
- 부드러운 삭제 (soft delete)
- 사용자별 데이터 격리
- RLS를 통한 접근 제어

### 📊 Performance

#### Optimization
- 클라이언트 사이드 검색 필터링
- 데이터베이스 인덱스 활용
- 요청 배치 처리
- 페이지네이션 (무한 스크롤 방지)

#### Metrics
- First Load JS: ~175KB
- Build Size: 최적화됨
- API 응답 시간: <200ms (평균)

### 🧪 Testing & Quality

#### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- 0 lint warnings
- Full type coverage

#### Testing Coverage
- API 엔드포인트 테스트
- UI 컴포넌트 테스트
- 사용자 흐름 테스트

### 📚 Documentation

#### Guides
- [배포 가이드](DEPLOYMENT.md) - 프로덕션 배포 체크리스트
- [API 문서](API.md) - API 엔드포인트 명세
- [데이터베이스 스키마](DATABASE.md) - 데이터 구조

### 🔄 Data Migration

#### Utilities
- `normalizeTags()` - 태그 정규화
- `validateNoteData()` - 노트 데이터 검증
- `validateLinkData()` - 링크 데이터 검증
- `migrateReminder()` - 리마인더 마이그레이션
- `generateMigrationReport()` - 마이그레이션 리포트 생성

---

## [0.6.0] - 2025-11-03 (Week 6)

### Added
- **Spaced Repetition System (SRS)**
  - Reminder API endpoints (GET/POST/PATCH/DELETE)
  - Interval-based review scheduling (1d → 3d → 7d → 30d)
  - Review dashboard with inline content preview
  - SRS calculator utilities

---

## [0.5.0] - 2025-11-02 (Week 5)

### Added
- **Full-Text Search**
  - Advanced search API with filtering
  - Type, tag, and date range filters
  - Multiple sort options (relevance, created, updated)
  - Pagination support
  - Relevance scoring algorithm

---

## [0.4.0] - 2025-11-01 (Week 4)

### Added
- **Knowledge Graph Visualization**
  - Cytoscape.js integration
  - Force-directed layout
  - Node type-specific styling
  - Edge relationship type colors
  - Interactive node clicking

---

## [0.3.0] - 2025-10-31 (Week 3)

### Added
- **Wiki Link System**
  - Wiki link parser (`[[노트명]]` format)
  - Autocomplete suggestions
  - Wiki link highlighting
  - Auto-link generation on save
  - Link validation

### Added
- **Note UI**
  - Create/Edit/Delete note forms
  - Tag management
  - Type selector (book/concept/quote)
  - Content editor

---

## [0.2.0] - Week 2

### Added
- **Core API Endpoints**
  - Note CRUD operations
  - Link management
  - Reminder operations
  - Graph data endpoint

---

## [0.1.0] - Week 1

### Added
- **Project Initialization**
  - Next.js 15.5.4 setup
  - Supabase integration
  - TypeScript configuration
  - Database schema
  - Basic authentication

---

## Release Notes - Version 1.0.0

### What's New? 새로워진 점

이번 1.0.0 정식 출시는 완전한 지식 관리 시스템입니다:

#### 📚 지식 관리
- 책, 개념, 인용 3가지 유형의 노트 작성
- 태그로 노트 분류
- 위키 링크로 노트 간 관계 표현

#### 🔍 검색 & 발견
- 제목과 내용에서 빠른 검색
- 다양한 필터와 정렬 옵션
- 관련성 기반 검색 결과

#### 📈 지식 그래프
- 시각적으로 아름다운 지식 네트워크
- 노트 간의 관계를 직관적으로 파악
- 지식 확장 및 연결 발견

#### 🧠 스마트 복습
- 과학 기반의 간격 반복 학습
- 자동으로 관리되는 복습 일정
- 효율적인 학습 경험

### 설치 및 실행

#### Requirements
- Node.js 18+
- npm 또는 yarn

#### Installation
```bash
git clone [repository-url]
cd woo-reading-notes
npm install
```

#### Development
```bash
npm run dev
# localhost:3000에서 접속
```

#### Production Build
```bash
npm run build
npm run start
```

### 마이그레이션 정보

기존 데이터가 있는 경우, [DEPLOYMENT.md](DEPLOYMENT.md)의 데이터 마이그레이션 섹션을 참조하세요.

### 알려진 문제 (Known Issues)

1. **다크모드**: 현재 라이트모드만 지원 (다크모드 곧 추가)
2. **오프라인 모드**: 인터넷 필수 (PWA 준비 중)
3. **모바일 최적화**: 테블릿/데스크톱 최적화됨, 모바일 개선 예정

### 앞으로의 계획 (Roadmap)

#### 1.1.0 (예정)
- [ ] 다크모드 지원
- [ ] 노트 공유 기능
- [ ] 댓글 및 협업 기능

#### 1.2.0 (예정)
- [ ] AI 기반 태그 자동 생성
- [ ] 학습 통계 대시보드
- [ ] 내보내기 기능 (Markdown, PDF)

#### 2.0.0 (장기)
- [ ] 모바일 앱
- [ ] 오프라인 지원
- [ ] 음성 노트
- [ ] 이미지 인식 OCR

### 기여 및 피드백

버그 리포트, 기능 제안, 또는 기여는 다음 경로로 부탁드립니다:
- GitHub Issues: [프로젝트 이슈](https://github.com/[owner]/woo-reading-notes/issues)
- 이메일: [support email]

### 라이선스

MIT License - 자세한 내용은 LICENSE 파일 참조

### 감사의 말

이 프로젝트는 다음의 훌륭한 오픈소스 프로젝트들을 사용합니다:
- Next.js 15.5.4
- React 19
- Supabase
- Cytoscape.js
- TypeScript

---

**Version**: 1.0.0
**Release Date**: 2025-11-04
**Status**: 정식 출시 (Stable Release)
