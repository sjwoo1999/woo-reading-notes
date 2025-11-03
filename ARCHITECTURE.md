# Architecture Guide

Technical overview of Woo Reading Notes system design, data flow, and infrastructure.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Next.js Frontend (React 19 + TypeScript)       │ │
│  │  ├─ Library View (book list, filtering, search)        │ │
│  │  ├─ Book Detail (notes, highlights, metadata)          │ │
│  │  ├─ Graph Visualization (Cytoscape.js)                 │ │
│  │  ├─ Tags Management                                     │ │
│  │  └─ Settings & Authentication                          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────────────────┐
    │  Supabase Auth (JWT) │
    └──────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────────┐
│                     API Layer                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │      Next.js API Routes (TypeScript)                   │ │
│  │  ├─ /api/books - Book CRUD & Search (Aladin API)      │ │
│  │  ├─ /api/auth - Authentication & Profile              │ │
│  │  ├─ /api/graph - Graph generation & traversal         │ │
│  │  ├─ /api/tags - Tag management                        │ │
│  │  └─ /api/visits - Public analytics                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────────────────────────────────┐
    │  Supabase Client Library (Server)    │
    │  - RLS Policies                      │
    │  - Automatic Row Filtering           │
    └──────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────────┐
│                    Database Layer                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       PostgreSQL (Supabase) + Row-Level Security       │ │
│  │                                                         │ │
│  │  Core Tables:                                          │ │
│  │  ├─ profiles (user metadata)                          │ │
│  │  ├─ books (reading entries)                           │ │
│  │  ├─ notes (individual highlights/annotations)         │ │
│  │  ├─ tags (categories)                                 │ │
│  │  ├─ book_tags (M2M relationship)                      │ │
│  │  ├─ note_tags (M2M relationship)                      │ │
│  │  ├─ entities (named concepts/people/places)           │ │
│  │  ├─ links (semantic relationships)                    │ │
│  │  └─ attachments (file storage metadata)               │ │
│  │                                                         │ │
│  │  Indexes:                                              │ │
│  │  ├─ (user_id, updated_at) - Sorting & Filtering      │ │
│  │  ├─ GIN trgm - Full-text search (title, content)     │ │
│  │  └─ (user_id, name) - Tag/Entity lookups             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
               │
    ┌──────────────────────┐
    │  External APIs       │
    ├─ Aladin Books API    │ (Korean book metadata)
    └──────────────────────┘
```

---

## 🔐 Authentication & Security

### Authentication Flow

```
User
  │
  ├─ Sign In / Sign Up
  │  └─→ Supabase Auth UI
  │
  ├─ JWT Token Created
  │  └─→ Stored in Browser (secure httpOnly cookie)
  │
  └─→ API Requests
     ├─ Token sent in Authorization header
     ├─ Server validates with Supabase
     └─→ RLS policies apply automatically
```

### Row-Level Security (RLS)

Every table has RLS enabled. Example for `books` table:

```sql
-- Users can only read their own books
CREATE POLICY "users_read_own_books" ON books
  FOR SELECT USING (user_id = auth.uid());

-- Users can only modify their own books
CREATE POLICY "users_modify_own_books" ON books
  FOR ALL USING (user_id = auth.uid());
```

**Benefits**:
- ✅ Database enforces access control
- ✅ No accidental data leaks from API bugs
- ✅ Scales with user count
- ✅ Works across all API endpoints

---

## 📊 Data Model

### Core Relationships

```
User (via auth.users)
  │
  ├─→ profiles (1-to-1)
  │    └─ full_name, created_at
  │
  ├─→ books (1-to-many)
  │    ├─ title, author, rating, progress
  │    ├─→ notes (1-to-many)
  │    │    ├─ title, content, location
  │    │    └─→ note_tags (M2M to tags)
  │    │
  │    └─→ book_tags (M2M to tags)
  │
  ├─→ tags (1-to-many)
  │    ├─ Unique constraint: (user_id, name)
  │    └─ Associated with books & notes
  │
  ├─→ entities (1-to-many)
  │    ├─ name, type, description
  │    └─ Represents concepts/people/places
  │
  └─→ links (1-to-many)
       ├─ Source: book/note/entity
       ├─ Destination: book/note/entity
       ├─ link_type: "mentions", "references", "quoted_by", etc.
       └─ Forms graph for visualization
```

### Timestamps

All mutable tables include:

```sql
created_at timestamptz DEFAULT now()  -- Immutable after creation
updated_at timestamptz DEFAULT now()  -- Updated via trigger
```

**Trigger**: `set_updated_at()` automatically updates `updated_at` on row modifications.

---

## 🔄 Data Flow Examples

### Reading a User's Library

```
Client: GET /library
  │
  ├─→ Frontend queries user's books
  │
  ├─→ Next.js API route
  │    ├─ Validates JWT token
  │    ├─ Extracts user_id
  │    │
  │    └─→ Supabase Query
  │         ├─ SELECT * FROM books WHERE user_id = $1
  │         ├─ RLS applied automatically
  │         └─ JOIN tags, notes if requested
  │
  ├─→ Response to client
  │    ├─ Books owned by user only
  │    └─ Metadata, ratings, progress
  │
  └─→ Frontend renders
      ├─ Lists books
      ├─ Shows ratings, progress bars
      └─ Click to view details
```

### Adding a New Book

```
Client: POST /api/books
  │
  ├─→ User fills form
  │    └─ Search & select from Aladin
  │
  ├─→ Next.js API route
  │    ├─ Validates input with Zod
  │    ├─ Checks JWT token
  │    ├─ Extracts user_id
  │    │
  │    └─→ Supabase INSERT
  │         ├─ INSERT INTO books (user_id, title, author, ...)
  │         ├─ RLS check: user_id = auth.uid()
  │         ├─ Trigger sets created_at, updated_at
  │         └─ Return created book
  │
  ├─→ Response: 201 Created
  │
  └─→ Frontend
      ├─ Adds book to library
      └─ Navigates to detail page
```

### Querying the Knowledge Graph

```
Client: GET /api/graph
  │
  ├─→ Next.js API route
  │    ├─ Query: SELECT nodes and edges
  │    │
  │    ├─→ Fetch all user's books, notes, entities
  │    ├─→ Fetch all links between them
  │    └─→ Build Cytoscape.js format
  │
  ├─→ Response: Nodes & Edges
  │    ├─ Nodes:
  │    │  ├─ book nodes (title, cover)
  │    │  ├─ entity nodes (concept, person)
  │    │  └─ tag nodes (category)
  │    │
  │    └─ Edges:
  │       ├─ "mentions" (book ↔ entity)
  │       ├─ "tagged" (book ↔ tag)
  │       └─ "quotes" (note ↔ entity)
  │
  └─→ Frontend renders with Cytoscape.js
      ├─ Interactive graph
      ├─ Click to navigate
      └─ Drag to reposition
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Graph**: Cytoscape.js + react-cytoscapejs
- **Validation**: Zod 4
- **API Client**: @supabase/ssr

### Backend
- **Runtime**: Node.js (Next.js)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (JWT)
- **ORM/Query**: Supabase Client (PostgREST)
- **API Style**: REST + JSON

### DevOps
- **Hosting**: Vercel (frontend + serverless functions)
- **Database**: Supabase Cloud
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier, TypeScript strict
- **Package Manager**: npm/pnpm

---

## 📈 Scalability Considerations

### Current Limits

| Metric | Limit | Notes |
|--------|-------|-------|
| Books per user | Unlimited* | Practical: 10,000+ |
| Notes per book | Unlimited* | Practical: 100,000+ |
| Graph nodes | Unlimited* | Cytoscape renders 10,000+ |
| Concurrent users | Platform dependent | Supabase + Vercel scale automatically |

*PostgreSQL limitations, not typically reached

### Optimization Strategies

1. **Database Indexes**
   - `(user_id, updated_at)` for sorting
   - GIN trgm for full-text search
   - These cover 90% of queries

2. **Query Pagination**
   - Limit/offset for large result sets
   - Cursor-based for efficient pagination

3. **Frontend Caching**
   - Browser cache for static assets
   - React Query for API responses (future)

4. **Graph Optimization**
   - Load only visible subset of graph
   - Lazy load node details on demand
   - Cache graph data client-side

---

## 🔌 External Integrations

### Aladin Books API

**Purpose**: Search for Korean books and fetch metadata

**Flow**:
```
User enters search term
  │
  ├─→ Frontend calls /api/books?query=...
  │
  ├─→ Server calls Aladin API
  │    ├─ URL: https://www.aladin.co.kr/ttb/api/ItemSearch.aspx
  │    ├─ Parameters: query, page, size, output=JS
  │    └─ Auth: TTB key in environment
  │
  ├─→ Parse response
  │    ├─ Extract: title, author, isbn, cover, link
  │    └─ Handle date format conversion (yyyymmdd → yyyy-mm-dd)
  │
  ├─→ Rate limit (30/min per IP)
  │
  └─→ Return results to frontend
```

**Error Handling**:
- JSON parsing issues → Extract content from braces
- Rate limiting → Exponential backoff recommended
- Upstream timeout → Return cached results

---

## 🚀 Deployment Architecture

### Development

```
Local Machine
  ├─ npm run dev
  ├─ http://localhost:3000
  └─ Supabase dev project
```

### Staging

```
GitHub (develop branch)
  │
  ├─→ GitHub Actions: Test & Build
  │
  ├─→ Vercel Preview Deployment
  │    ├─ URL: https://woo-[...].vercel.app
  │    └─ Supabase staging project
  │
  └─→ Smoke tests
```

### Production

```
GitHub (main branch)
  │
  ├─→ GitHub Actions: Full CI/CD
  │    ├─ Lint & format check
  │    ├─ TypeScript check
  │    ├─ Build verification
  │    └─ Test suite
  │
  ├─→ Vercel Production Deployment
  │    ├─ URL: https://app.example.com
  │    ├─ Supabase production project
  │    └─ Auto SSL/HTTPS
  │
  ├─→ Health checks
  │
  └─→ GitHub release created
```

---

## 📋 Database Migrations

### Migration Strategy

```
development
  ├─ Create migration file: supabase/migrations/[timestamp]_description.sql
  ├─ Test locally
  ├─ Commit to feature branch
  │
  ├─→ Code review
  │
  ├─→ Merge to main
  │
  ├─→ GitHub Actions trigger
  │    ├─ Run migration on staging
  │    ├─ Verify data consistency
  │    ├─ Health checks
  │    │
  │    └─→ Approval for production
  │
  └─→ Run migration on production
      ├─ Backup taken first
      ├─ Migration applied
      └─ Verify results
```

### Example Migration

```sql
-- supabase/migrations/20250103000000_add_book_cover.sql

-- Add new column
ALTER TABLE public.books
  ADD COLUMN cover_url text DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX idx_books_cover ON public.books(cover_url)
  WHERE cover_url IS NOT NULL;

-- Update trigger to include new column
-- (if using update_at trigger)
```

---

## 🔍 Monitoring & Observability

### Logging

Current logging strategy:
- **Frontend**: Console logs (development only)
- **Backend**: Next.js built-in logging

Future improvements:
- Structured logging (JSON format)
- Log aggregation (LogRocket, Sentry)
- Performance monitoring (Vercel Analytics)
- Error tracking (Sentry, LogRocket)

### Health Checks

```bash
# Application health
GET /api/health

# Database connectivity
GET /api/db/health
```

---

## 🔐 Security Measures

### Implemented

- ✅ JWT authentication via Supabase
- ✅ Row-Level Security (RLS) on all tables
- ✅ HTTPS/TLS for all connections
- ✅ Environment variables for secrets
- ✅ Rate limiting on public endpoints
- ✅ Input validation with Zod
- ✅ No SQL injection (using parameterized queries)
- ✅ CORS configured
- ✅ CSP headers

### Future Improvements

- 🔄 API key rotation
- 🔄 Audit logging
- 🔄 2FA/MFA support
- 🔄 Encryption at rest (for sensitive data)
- 🔄 Regular security audits
- 🔄 Penetration testing

---

## 📚 Development Guidelines

### Adding New Features

```
1. Create feature branch
   git checkout -b feature/my-feature

2. Design data model (if needed)
   - Add tables/columns to schema
   - Create migration file
   - Update RLS policies

3. Implement API endpoint
   - Create API route in src/app/api/
   - Add input validation (Zod)
   - Add error handling
   - Add tests

4. Implement frontend
   - Create React component
   - Connect to API
   - Handle loading/error states
   - Add TypeScript types

5. Add documentation
   - Update API.md
   - Add JSDoc comments
   - Update CONTRIBUTING.md if applicable

6. Submit for review
   - Ensure tests pass
   - Ensure linting passes
   - Request code review
```

### Code Organization

```
src/
  ├─ app/
  │  ├─ api/                 # API routes
  │  │  ├─ books/
  │  │  ├─ auth/
  │  │  └─ ...
  │  ├─ library/             # Page routes
  │  ├─ [book]/
  │  ├─ layout.tsx           # Root layout
  │  └─ page.tsx             # Home page
  │
  ├─ lib/                    # Shared utilities
  │  ├─ supabase.ts          # DB client
  │  ├─ types.ts             # Shared types
  │  └─ utils.ts             # Helper functions
  │
  └─ types/                  # Type definitions
     └─ index.ts
```

---

## 📖 References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [React Documentation](https://react.dev)

---

**Last Updated**: 2025-01-03
**Maintainer**: Development Team
