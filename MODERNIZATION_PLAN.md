# Woo Reading Notes - Modernization & Automation Plan

## Executive Summary

This document outlines a comprehensive modernization strategy for the **woo-reading-notes** repository. The application is a **full-stack Next.js + Supabase web application** (not a Markdown archive) that manages a personal reading library with graph relationships between books, notes, and entities.

**Key Assessment**: The codebase is well-structured with modern tooling, but lacks CI/CD automation, testing infrastructure, and development process standardization.

---

## 1. Current Repository Structure Analysis

### 1.1 Existing Architecture

```
woo-reading-notes/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   │   ├── api/          # Backend API endpoints (books, graph, auth)
│   │   ├── book/[id]/    # Dynamic book detail page
│   │   ├── library/      # Main library view
│   │   ├── graph/        # Graph visualization page
│   │   ├── tags/         # Tag management page
│   │   └── settings/     # User settings
│   ├── lib/              # Shared utilities & helpers
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── schema.sql        # Complete PostgreSQL schema
│   ├── seed.sql          # Seed data (optional)
│   └── migrations/       # Future migration files
├── public/               # Static assets
├── .env.local           # Local environment (⚠️ gitignored)
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript configuration
└── next.config.ts       # Next.js configuration
```

### 1.2 Current Schema Overview

| Table | Purpose | Key Fields | RLS Status |
|-------|---------|-----------|-----------|
| **profiles** | User metadata | id, full_name, created_at | ✅ Enabled |
| **books** | Reading entries | title, author, rating, progress, summary | ✅ Enabled |
| **notes** | Individual notes per book | book_id, content, location, highlight_color | ✅ Enabled |
| **tags** | Categorization | name, user_id (unique constraint) | ✅ Enabled |
| **book_tags** | M2M: books ↔ tags | book_id, tag_id | ✅ Enabled |
| **note_tags** | M2M: notes ↔ tags | note_id, tag_id | ✅ Enabled |
| **entities** | Named entities/concepts | name, type, description | ✅ Enabled |
| **links** | Graph relationships | src_type, src_id, dst_type, dst_id, link_type | ✅ Enabled |
| **attachments** | File storage metadata | owner_type, owner_id, file_path | ✅ Enabled |

**Indexes**: Created on user_id, updated_at, full-text search (pg_trgm), and relationship lookups
**Triggers**: `set_updated_at()` on all mutable tables

---

## 2. Gaps & Recommendations

### 2.1 Missing Infrastructure

| Category | Current | Recommended |
|----------|---------|------------|
| **CI/CD** | ❌ None | ✅ GitHub Actions (lint, test, deploy) |
| **Testing** | ❌ None | ✅ Jest + React Testing Library |
| **Type Safety** | ✅ TypeScript | ✅ Add type checking in CI |
| **Code Quality** | ✅ ESLint exists | ✅ Add Prettier + Husky + pre-commit |
| **Deployments** | ❌ Manual | ✅ Automated staging & production |
| **Migrations** | ⚠️ Manual SQL | ✅ Versioned migration system |
| **Documentation** | ⚠️ README only | ✅ API docs, architecture guide, CONTRIBUTING.md |
| **Database Seeding** | ❌ Not automated | ✅ Seed script with faker |
| **Secret Management** | ⚠️ .env.local | ✅ GitHub Secrets + validation |

### 2.2 Critical Improvements

**High Priority:**
1. GitHub Actions CI/CD pipeline (lint → test → deploy)
2. Database migration management system
3. Pre-commit hooks for code quality
4. Comprehensive testing setup

**Medium Priority:**
1. API documentation (OpenAPI/Swagger)
2. Seed data automation
3. Environment validation script
4. Contribution guidelines

**Low Priority:**
1. Performance monitoring integration
2. Analytics integration
3. Analytics integration
4. E2E testing framework

---

## 3. Proposed File Structure Additions

```
woo-reading-notes/
├── .github/
│   ├── workflows/
│   │   ├── test.yml              # ← NEW: Run tests on PR/push
│   │   ├── build.yml             # ← NEW: Build verification
│   │   ├── deploy-staging.yml    # ← NEW: Deploy to staging
│   │   └── deploy-production.yml # ← NEW: Deploy to production
│   ├── ISSUE_TEMPLATE/           # ← NEW: Issue templates
│   ├── PULL_REQUEST_TEMPLATE.md  # ← NEW: PR template
│   └── dependabot.yml            # ← NEW: Dependency updates
├── scripts/
│   ├── db/
│   │   ├── seed.ts               # ← NEW: Database seeding
│   │   ├── migrate.ts            # ← NEW: Run migrations
│   │   └── reset.ts              # ← NEW: Reset database (dev only)
│   ├── validate-env.ts           # ← NEW: Validate environment
│   └── generate-api-docs.ts      # ← NEW: Generate OpenAPI spec
├── .env.example                  # ← NEW: Template for .env.local
├── .env.test                     # ← NEW: Test environment config
├── .prettierrc.json              # ← NEW: Code formatting
├── .prettierignore               # ← NEW: Prettier ignore rules
├── vitest.config.ts              # ← NEW: Test runner config
├── jest.config.ts                # ← NEW: Jest config (optional)
├── CONTRIBUTING.md               # ← NEW: Contribution guidelines
├── CODE_OF_CONDUCT.md            # ← NEW: Code of conduct
├── ARCHITECTURE.md               # ← NEW: Architecture guide
├── API.md                        # ← NEW: API documentation
└── supabase/
    ├── migrations/
    │   └── 001_initial.sql       # ← NEW: Versioned migrations
    └── seed.sql
```

---

## 4. Implementation Roadmap

### Phase 1: Code Quality (Week 1)
- [ ] Add Prettier configuration
- [ ] Add pre-commit hooks (Husky)
- [ ] Update ESLint rules
- [ ] Format existing code

### Phase 2: Testing & CI (Week 2)
- [ ] Setup Vitest/Jest
- [ ] Create GitHub Actions workflows
- [ ] Add type checking to CI
- [ ] Add code coverage reporting

### Phase 3: Database Management (Week 3)
- [ ] Create migration system
- [ ] Write seed scripts
- [ ] Document migration process
- [ ] Add database reset tooling

### Phase 4: Documentation (Week 4)
- [ ] Write API documentation
- [ ] Create architecture guide
- [ ] Write CONTRIBUTING.md
- [ ] Create deployment guide

---

## 5. Key Features by File

### GitHub Actions Workflows

**test.yml** - Runs on PR/push
- Lint check (ESLint, Prettier)
- Type check (tsc)
- Run tests (if available)
- Build verification

**deploy-staging.yml** - Runs on push to `develop`
- Build Next.js app
- Deploy to staging environment
- Run smoke tests
- Notify team

**deploy-production.yml** - Manual trigger + main branch
- Build Next.js app
- Run full test suite
- Deploy to production
- Create GitHub release

### Development Scripts

**seed.ts** - Populate database with test data
- Create fake profiles
- Generate sample books & metadata
- Add sample notes & highlights
- Link entities with relationships

**migrate.ts** - Execute migrations in order
- List available migrations
- Track applied migrations
- Execute pending migrations
- Rollback support

**validate-env.ts** - Verify configuration
- Check required env vars
- Validate Supabase connectivity
- Validate API keys
- Warn on insecure settings

### Configurations

**.prettierrc.json** - Code formatting standard
- 2-space indentation
- Trailing commas
- Single quotes (consistent with ESLint)
- Print width: 100

**Husky hooks** - Pre-commit automation
- Format staged files with Prettier
- Lint staged files with ESLint
- Type check TypeScript
- Prevent commits with issues

---

## 6. Environment Variables Template

```bash
# .env.example - Copy to .env.local and fill in values

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Supabase admin (server-side only)
SUPABASE_SERVICE_ROLE_KEY=xxx

# Aladin Books API (Korean book search)
ALADIN_TTB_KEY=xxx

# Admin emails (comma-separated)
ADMIN_EMAILS=user@example.com,admin@example.com

# Optional: Analytics
NEXT_PUBLIC_UMAMI_ID=xxx
NEXT_PUBLIC_UMAMI_URL=https://analytics.example.com

# Optional: GitHub OAuth (for public deployments)
GITHUB_ID=xxx
GITHUB_SECRET=xxx

# Deployment
VERCEL_ENV=development
NODE_ENV=development
```

---

## 7. Deployment Strategy

### Development
- **Environment**: Local
- **Database**: Supabase dev project
- **Build**: `next dev --turbopack`
- **Secrets**: `.env.local` (gitignored)

### Staging
- **Environment**: Vercel Preview
- **Database**: Supabase staging project
- **Deploy**: Auto on `develop` branch
- **Secrets**: Vercel environment variables

### Production
- **Environment**: Vercel Production
- **Database**: Supabase production project
- **Deploy**: Manual trigger + main branch
- **Secrets**: GitHub Secrets → Vercel

---

## 8. Testing Strategy

### Unit Tests
- Utility functions (src/lib)
- Type validation
- API response parsing

### Integration Tests
- API routes with database
- Authentication flows
- Data consistency checks

### E2E Tests (Future)
- Critical user journeys
- Library CRUD operations
- Graph navigation

---

## 9. Database Management

### Migrations
- Store in `supabase/migrations/` with timestamps
- Version control all schema changes
- Track applied migrations in a table
- Support rollback for development

### Seeding
- Separate seed script for test data
- Use Faker for realistic data
- Idempotent seeding (safe to run multiple times)
- Document seed data structure

### Backup & Recovery
- Supabase automated backups (daily)
- Point-in-time recovery available
- Export procedure documented

---

## 10. Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Type Coverage | 100% | ✅ High |
| Test Coverage | >70% | ❌ 0% |
| CI/CD Coverage | 100% | ❌ 0% |
| Deployment Frequency | Weekly | ❌ Manual |
| Mean Time to Recovery | <1h | ⚠️ TBD |
| Code Review Quality | 2+ reviewers | ⚠️ TBD |

---

## 11. Timeline & Effort

**Estimated Effort**: 40-60 hours
- Code quality setup: 8h
- Testing infrastructure: 12h
- CI/CD workflows: 10h
- Database tooling: 8h
- Documentation: 12h

**Timeline**: 2-3 weeks for full implementation

---

## 12. Next Steps

1. **Review & Approve** this plan
2. **Create .github directory** structure
3. **Implement Phase 1** (Code quality)
4. **Get team buy-in** on processes
5. **Deploy Phase 2** (Testing & CI)
6. **Refine based on feedback**

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Author**: Architecture Review
