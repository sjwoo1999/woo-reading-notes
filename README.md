# Woo Reading Notes

A full-stack web application for managing your personal reading library with knowledge graph visualization.

**Features**: Book management • Note-taking • Graph visualization • Tag categorization • Supabase backend

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

**Required Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ALADIN_TTB_KEY` - Korean book search API key
- `ADMIN_EMAILS` - Comma-separated admin emails (optional)

See [.env.example](.env.example) for all available options.

### 3. Validate Environment
```bash
npm run validate:env
```

### 4. Seed Database (Optional)
```bash
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📚 Documentation

### Getting Started
- **[MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md)** - Overview of modernization strategy
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Phase-by-phase implementation guide

### For Developers
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, data models, technology stack
- **[API.md](API.md)** - Complete API reference with all endpoints
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines and development workflow

### Quick Reference
- **[DELIVERABLES.md](DELIVERABLES.md)** - List of all modernization files
- **[MODERNIZATION_SUMMARY.txt](MODERNIZATION_SUMMARY.txt)** - Quick reference summary

---

## 📖 Pages & Features

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/library` | Main reading library view |
| `/book/[id]` | Book detail page with notes |
| `/graph` | Knowledge graph visualization |
| `/tags` | Tag management |
| `/settings` | User settings |
| `/books` | Public books view |
| `/auth` | Authentication |

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev                  # Start dev server with Turbopack
npm run build              # Build for production
npm run start              # Start production server

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Format with Prettier
npm run format:check      # Check formatting
npm run type-check        # TypeScript check

# Database
npm run db:seed           # Seed database
npm run db:reset          # Reset database (dev only)
npm run db:migrate        # Run migrations

# Validation
npm run validate:env      # Validate environment
```

---

## 🏗️ Tech Stack

**Frontend**:
- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Cytoscape.js (graph visualization)

**Backend**:
- Next.js API Routes
- Supabase (PostgreSQL + Auth)
- Row-Level Security (RLS)

**DevOps**:
- GitHub Actions (CI/CD)
- Vercel (hosting)
- ESLint + Prettier (code quality)

**External APIs**:
- Aladin Books API (Korean book search)

---

## 🔄 CI/CD Pipeline

This project uses **GitHub Actions** for automated testing and deployment.

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **test.yml** | Push, PR | Lint, type-check, security audit |
| **build.yml** | Push, PR | Build verification, bundle analysis |
| **deploy-staging.yml** | Push to `develop` | Auto-deploy to staging |
| **deploy-production.yml** | Push to `main` | Manual production deployment |

### Status Checks

All PRs require:
- ✅ ESLint passes (0 warnings)
- ✅ Prettier formatting correct
- ✅ TypeScript strict mode passes
- ✅ Build succeeds

---

## 🧪 Testing the API

### Search for Books
```bash
curl -G 'http://localhost:3000/api/books' \
  --data-urlencode 'query=데미안' \
  --data-urlencode 'page=1' \
  --data-urlencode 'size=10'
```

**Response**: Books matching the query with metadata (title, author, cover, etc.)

See [API.md](API.md) for complete API documentation.

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

### Development Workflow

1. **Create feature branch**: `git checkout -b feature/my-feature`
2. **Make changes** and test locally
3. **Run quality checks**: `npm run lint && npm run type-check && npm run build`
4. **Commit with conventional format**: `git commit -m "feat: add new feature"`
5. **Push and open PR** against `develop`

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

**Example**:
```
feat(library): add book filtering by rating

Allows users to filter books by rating in the library view.
Closes #123
```

---

## 📋 Database Schema

See [supabase/schema.sql](supabase/schema.sql) for complete schema definition.

**Core Tables**:
- `profiles` - User metadata
- `books` - Reading entries
- `notes` - Highlights and annotations
- `tags` - Categories
- `entities` - Named concepts
- `links` - Graph relationships

All tables have Row-Level Security (RLS) enabled.

---

## 🔐 Security

- ✅ JWT authentication via Supabase
- ✅ Row-Level Security on all tables
- ✅ HTTPS/TLS for all connections
- ✅ Environment variables for secrets
- ✅ Rate limiting on public endpoints
- ✅ Input validation with Zod

---

## 📦 Deployment

### Staging
Automatically deployed to Vercel Preview on push to `develop` branch.

### Production
Manual deployment to Vercel on push to `main` branch with approval checks.

See [ARCHITECTURE.md](ARCHITECTURE.md) for deployment architecture details.

---

## 📝 Notes

- Aladin API: `pubDate` format is `yyyymmdd`; converted to ISO format in responses
- Commercial use of Aladin API must follow [Aladin OpenAPI TOS](https://www.aladin.co.kr/partner/welcome.aspx)
- All user data is encrypted in transit and stored securely in Supabase
- Database backups are automatically managed by Supabase

---

## 📞 Support

- **API Questions**: See [API.md](API.md)
- **Architecture Questions**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Contributing Questions**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **GitHub Issues**: Report bugs or request features

---

## 📄 License

TBD (Update as needed)
