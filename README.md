# 우의 독서 노트 (Woo Reading Notes)

흩어진 독서 노트를 **연결된 지식 그래프**로 변환하는 현대적인 풀스택 웹 애플리케이션입니다.

**비전**: 독서 습관을 "모으기 → 잊기"에서 "기록하기 → 연결하기 → 탐색하기 → 성장하기"로 변환

**핵심 기능**:
- 📝 **노트 관리** (책, 개념, 하이라이트)
- 🔗 **양방향 링크** (위키 스타일의 상호 연결)
- 📊 **인터랙티브 그래프** (관계도 시각화 및 탐색)
- 🔍 **의미 기반 검색** (키워드가 아닌 의미로 검색)
- ⏰ **간격 반복** (1-3-7-30일 복습 주기)
- 🔐 **프라이버시 우선** (개인 기록, 안전, 오프라인 지원)

---

## 🚀 빠른 시작

### 1단계: 의존성 설치
```bash
npm install
# 또는
pnpm install
```

### 2단계: 환경 설정
```bash
cp .env.example .env.local
# .env.local 파일을 열어 자신의 인증정보 입력
```

**필수 환경 변수**:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 익명 API 키
- `ALADIN_TTB_KEY` - 알라딘 도서 검색 API 키
- `ADMIN_EMAILS` - 관리자 이메일 (쉼표로 구분, 선택사항)

모든 환경 변수는 [.env.example](.env.example) 파일을 참고하세요.

### 3단계: 환경 검증
```bash
npm run validate:env
```

### 4단계: 데이터베이스 샘플 데이터 입력 (선택사항)
```bash
npm run db:seed
```

### 5단계: 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열어주세요.

---

## 📋 기획 및 명세 문서

### 🎯 프로젝트 기획 (먼저 읽기!)
- **[PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)** - 1페이지 제품 개요 (문제, 가치, KPI, 범위)
- **[PRD_v1.md](docs/PRD_v1.md)** - 완전한 요구사항 (기능, 사용자 시나리오, 데이터 모델)
- **[TECH_SPEC.md](docs/TECH_SPEC.md)** - 기술 명세 (아키텍처, API, 구현 상세)
- **[ROADMAP_8WEEKS.md](docs/ROADMAP_8WEEKS.md)** - 8주 실행 계획 (주간 마일스톤)

---

## 📚 개발 문서

### 시작하기
- **[MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md)** - 현대화 전략 개요
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - 단계별 구현 가이드

### 개발자용
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 시스템 설계, 데이터 모델, 기술 스택
- **[API.md](API.md)** - 전체 API 레퍼런스 및 엔드포인트
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - 기여 가이드 및 개발 워크플로우

### 빠른 참고
- **[DELIVERABLES.md](DELIVERABLES.md)** - 현대화 파일 목록
- **[MODERNIZATION_SUMMARY.txt](MODERNIZATION_SUMMARY.txt)** - 빠른 참고 요약

---

## 📖 페이지 및 기능

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/library` | 독서 라이브러리 메인 뷰 |
| `/book/[id]` | 책 상세 페이지 및 노트 |
| `/graph` | 지식 그래프 시각화 |
| `/tags` | 태그 관리 |
| `/settings` | 사용자 설정 |
| `/books` | 공개 책 목록 |
| `/auth` | 인증 페이지 |

---

## 🛠️ 사용 가능한 스크립트

```bash
# 개발
npm run dev                  # Turbopack으로 개발 서버 실행
npm run build               # 프로덕션 빌드
npm run start               # 프로덕션 서버 실행

# 코드 품질
npm run lint                # ESLint 실행
npm run lint:fix            # ESLint 자동 수정
npm run format              # Prettier로 포매팅
npm run format:check        # 포매팅 확인
npm run type-check          # TypeScript 타입 체크

# 데이터베이스
npm run db:seed             # 데이터베이스 샘플 데이터 입력
npm run db:reset            # 데이터베이스 초기화 (개발 전용)
npm run db:migrate          # 마이그레이션 실행

# 검증
npm run validate:env        # 환경 변수 검증
```

---

## 🏗️ 기술 스택

**프론트엔드**:
- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Cytoscape.js (그래프 시각화)

**백엔드**:
- Next.js API 라우트
- Supabase (PostgreSQL + 인증)
- 행 수준 보안 (RLS)

**DevOps**:
- GitHub Actions (CI/CD 자동화)
- Vercel (호스팅)
- ESLint + Prettier (코드 품질)

**외부 API**:
- 알라딘 도서 검색 API (한국 도서 검색)

---

## 🔄 CI/CD 파이프라인

이 프로젝트는 **GitHub Actions**을 사용하여 자동화된 테스트와 배포를 합니다.

### 워크플로우

| 워크플로우 | 트리거 | 목적 |
|-----------|--------|------|
| **test.yml** | Push, PR | 린트, 타입 체크, 보안 감사 |
| **build.yml** | Push, PR | 빌드 검증, 번들 분석 |
| **deploy-staging.yml** | `develop` 브랜치 푸시 | 자동 스테이징 배포 |
| **deploy-production.yml** | `main` 브랜치 푸시 | 수동 프로덕션 배포 |

### 필수 검사 사항

모든 PR은 다음 조건을 통과해야 합니다:
- ✅ ESLint 통과 (0 경고)
- ✅ Prettier 포매팅 정확
- ✅ TypeScript 엄격 모드 통과
- ✅ 빌드 성공

---

## 🧪 API 테스트

### 도서 검색
```bash
curl -G 'http://localhost:3000/api/books' \
  --data-urlencode 'query=데미안' \
  --data-urlencode 'page=1' \
  --data-urlencode 'size=10'
```

**응답**: 쿼리와 일치하는 도서 목록 (제목, 저자, 표지 등의 메타데이터 포함)

전체 API 문서는 [API.md](API.md)를 참고하세요.

---

## 🤝 기여하기

PR을 제출하기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어주세요.

### 개발 워크플로우

1. **피처 브랜치 생성**: `git checkout -b feature/my-feature`
2. **변경사항 작성** 및 로컬 테스트
3. **품질 검사 실행**: `npm run lint && npm run type-check && npm run build`
4. **관례에 따라 커밋**: `git commit -m "feat: 새 기능 추가"`
5. **푸시 및 PR 열기** (대상: `develop` 브랜치)

### 커밋 메시지 형식

[Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다:

```
<타입>(<범위>): <제목>

<본문>

<푸터>
```

**타입**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

**예시**:
```
feat(library): 평점으로 도서 필터링 기능 추가

라이브러리 뷰에서 사용자가 평점으로 도서를 필터링할 수 있도록 함.
Closes #123
```

---

## 📋 데이터베이스 스키마

완전한 스키마 정의는 [supabase/schema.sql](supabase/schema.sql)을 참고하세요.

**핵심 테이블**:
- `profiles` - 사용자 메타데이터
- `books` - 독서 기록
- `notes` - 하이라이트 및 주석
- `tags` - 카테고리
- `entities` - 명명된 개념
- `links` - 그래프 관계

모든 테이블은 행 수준 보안(RLS)이 활성화되어 있습니다.

---

## 🔐 보안

- ✅ Supabase를 통한 JWT 인증
- ✅ 모든 테이블에 행 수준 보안(RLS) 적용
- ✅ 모든 연결에 HTTPS/TLS 사용
- ✅ 환경 변수로 비밀 관리
- ✅ 공개 엔드포인트에 속도 제한
- ✅ Zod를 통한 입력 검증

---

## 📦 배포

### 스테이징
`develop` 브랜치에 푸시할 때 Vercel Preview에 자동 배포됩니다.

### 프로덕션
`main` 브랜치에 푸시할 때 승인 후 Vercel에 수동 배포합니다.

배포 아키텍처 상세는 [ARCHITECTURE.md](ARCHITECTURE.md)를 참고하세요.

---

## 📝 주의사항

- 알라딘 API: `pubDate` 형식은 `yyyymmdd`이며 응답에서 ISO 형식으로 변환됩니다
- 알라딘 API의 상업적 사용은 [알라딘 OpenAPI 이용약관](https://www.aladin.co.kr/partner/welcome.aspx)을 따라야 합니다
- 모든 사용자 데이터는 전송 중 암호화되고 Supabase에 안전하게 저장됩니다
- 데이터베이스 백업은 Supabase에서 자동으로 관리됩니다

---

## 📞 지원

- **API 관련 질문**: [API.md](API.md) 참고
- **아키텍처 관련 질문**: [ARCHITECTURE.md](ARCHITECTURE.md) 참고
- **기여 관련 질문**: [CONTRIBUTING.md](CONTRIBUTING.md) 참고
- **버그 보고 및 기능 요청**: [GitHub Issues](https://github.com/sjwoo1999/woo-reading-notes/issues)

---

## 📄 라이선스

미정 (필요시 업데이트 예정)
