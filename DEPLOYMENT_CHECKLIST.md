# 배포 전 체크리스트 (Pre-Deployment Checklist)

## ✅ GitHub 설정

### 1. GitHub Secrets 구성

Repository Settings → Secrets and variables → Actions에서 다음 secrets 추가:

```
VERCEL_TOKEN              # Vercel API Token (https://vercel.com/account/tokens)
VERCEL_ORG_ID            # Vercel Organization ID
VERCEL_PROJECT_ID        # Vercel Project ID
PROD_NEXT_PUBLIC_SUPABASE_URL      # Supabase URL (production)
PROD_NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase Anon Key (production)
ALADIN_TTB_KEY           # (Optional) Aladin API Key
```

### 2. 브랜치 보호 설정

Settings → Branches → Add rule:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Build Verification / Build Next.js Application
  - Test & Quality / Lint, Type Check & Test
  - Test & Quality / Security Audit

---

## ✅ Vercel 설정

### 1. Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. "Add New..." → "Project"
3. GitHub 저장소 선택 (`woo-reading-notes`)
4. Framework Preset: **Next.js**
5. Project name: `woo-reading-notes`

### 2. 환경 변수 설정

Settings → Environment Variables에서:

```
NEXT_PUBLIC_SUPABASE_URL      = [Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Supabase Anon Key]
ALADIN_TTB_KEY               = [Optional]
```

각 환경별로 설정:
- Development
- Preview
- Production

### 3. 배포 설정

Settings → Git:
- ✅ Automatic deployments: Enabled
- Production branch: `main`
- Preview branches: `develop`

---

## ✅ Supabase 설정 (Production)

### 1. 프로덕션 데이터베이스 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. Region: 사용자 지역에 가장 가까운 곳 선택
3. Database password 안전하게 저장

### 2. 스키마 초기화

프로덕션 데이터베이스에서:

```sql
-- supabase/schema.sql 실행
-- supabase/migrations/20251103_create_notes_graph.sql 실행
```

### 3. RLS 정책 적용

모든 RLS 정책이 활성화되었는지 확인:
- ✅ notes RLS enabled
- ✅ links RLS enabled
- ✅ reminders RLS enabled
- ✅ profiles RLS enabled

### 4. 프로덕션 Credentials 저장

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

→ GitHub Secrets에 추가

---

## ✅ Vercel Token 생성

### Vercel API Token 생성

1. [Account Settings](https://vercel.com/account/settings)에 이동
2. "Tokens" 탭 클릭
3. "Create" 버튼 클릭
4. Token 이름: `github-actions`
5. Scope: **Full Account**
6. Token 복사 → GitHub Secrets의 `VERCEL_TOKEN`에 저장

### Vercel Org ID 및 Project ID 확인

프로젝트 생성 후:
1. Vercel Dashboard에서 프로젝트 선택
2. Settings → General
3. Project ID 복사 → GitHub Secrets의 `VERCEL_PROJECT_ID`에 저장
4. Team Settings → General
5. Team ID 복사 → GitHub Secrets의 `VERCEL_ORG_ID`에 저장

---

## ✅ 로컬 테스트

### 1. 환경 변수 확인

```bash
# .env.local 파일 확인
cat .env.local
```

필수 변수:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. 로컬 빌드 테스트

```bash
npm run build
npm run start
# http://localhost:3000 접속 테스트
```

### 3. 모든 페이지 확인

- [ ] `/` - 홈페이지
- [ ] `/auth` - 인증
- [ ] `/notes` - 노트 목록
- [ ] `/notes/new` - 노트 작성
- [ ] `/search` - 검색
- [ ] `/graph` - 그래프
- [ ] `/review` - 복습 대시보드

### 4. API 테스트

```bash
# Bearer token으로 API 테스트
curl -H "Authorization: Bearer [token]" \
  http://localhost:3000/api/notes
```

---

## ✅ GitHub Actions 상태 확인

### Actions 탭 확인

1. GitHub 저장소 → Actions 탭
2. "Build Verification" workflow
3. "Test & Quality" workflow
4. 모든 체크 통과 확인

Expected:
- ✅ Build Verification / Build Next.js Application
- ✅ Test & Quality / Lint, Type Check & Test
- ✅ Test & Quality / Security Audit
- ✅ Test & Quality / Quality Gates Check

---

## ✅ 배포 실행

### 1. main 브랜치에 푸시

```bash
git push origin main
```

### 2. GitHub Actions 모니터링

1. Actions 탭에서 실행 상황 확인
2. "Build Verification" 완료 대기
3. "Test & Quality" 완료 대기
4. "Deploy to Production" 자동 시작

### 3. Vercel 배포 확인

1. Vercel Dashboard → Deployments 탭
2. 최신 배포 상태 확인
3. Production URL 확인

---

## ✅ Post-Deployment 검증

### 1. 배포 완료 확인

```bash
# Vercel이 제공한 URL에 접속
https://[your-project].vercel.app
```

### 2. 전체 기능 테스트

- [ ] 로그인/로그아웃
- [ ] 노트 CRUD
- [ ] Wiki 링크 생성
- [ ] 검색 기능
- [ ] 그래프 시각화
- [ ] 복습 시스템

### 3. 데이터베이스 연결 확인

```bash
# API 호출 테스트
curl https://[your-project].vercel.app/api/notes \
  -H "Authorization: Bearer [token]"
```

### 4. 에러 로그 확인

Vercel Dashboard → Logs → Errors 확인

---

## 🚨 트러블슈팅

### 문제: "Missing required secrets"

**해결책:**
1. Repository Settings → Secrets and variables → Actions
2. 모든 필수 secrets 추가 확인
3. GitHub Actions 다시 실행

### 문제: "Vercel deployment failed"

**확인사항:**
1. Vercel Token 유효성 확인
2. Organization ID와 Project ID 정확성 확인
3. Environment variables 설정 확인
4. Vercel Dashboard에서 에러 메시지 확인

### 문제: "Build failed: TypeScript errors"

**확인사항:**
1. 로컬에서 `npm run type-check` 실행
2. 에러 수정 후 다시 푸시
3. GitHub Actions 재실행

### 문제: "Database connection error"

**확인사항:**
1. Supabase URL과 Anon Key 정확성
2. RLS 정책 활성화 확인
3. 데이터베이스 온라인 상태 확인
4. 방화벽 규칙 확인

---

## 📋 배포 후 모니터링

### 1. 분석 설정

- [ ] Vercel Analytics 활성화
- [ ] Sentry (에러 추적) 선택사항
- [ ] Google Analytics 선택사항

### 2. 일일 체크리스트

- [ ] Vercel 대시보드에서 성능 확인
- [ ] 에러 로그 검토
- [ ] 사용자 피드백 확인

### 3. 주간 체크리스트

- [ ] 데이터베이스 백업 확인
- [ ] 보안 업데이트 확인
- [ ] 성능 메트릭 분석

---

## 📞 지원

배포 중 문제 발생 시:

1. **GitHub Actions 로그** 확인
2. **Vercel 대시보드** 확인
3. **Supabase 상태 페이지** 확인
4. 이슈 트래커에 문제 보고

---

**상태**: 배포 준비 완료 ✅
**버전**: 1.0.0
**배포 날짜**: 2025-11-04
