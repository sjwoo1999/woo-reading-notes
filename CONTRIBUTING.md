# Contributing to Woo Reading Notes

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Git Workflow](#git-workflow)
5. [Code Standards](#code-standards)
6. [Commit Messages](#commit-messages)
7. [Pull Requests](#pull-requests)
8. [Testing](#testing)
9. [Database Changes](#database-changes)
10. [Documentation](#documentation)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

**TL;DR**: Be respectful, inclusive, and professional.

---

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 9.x or higher (or pnpm)
- **Git**: Latest version
- **Supabase account**: For local development

### Fork & Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/your-username/woo-reading-notes.git
cd woo-reading-notes

# Add upstream remote for syncing
git remote add upstream https://github.com/original-owner/woo-reading-notes.git
```

---

## Development Setup

### 1. Install Dependencies

```bash
# Using npm
npm install

# Or using pnpm
pnpm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your credentials
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - ALADIN_TTB_KEY
nano .env.local
```

### 3. Validate Environment

```bash
npx ts-node scripts/validate-env.ts
```

### 4. Setup Database

```bash
# Seed with sample data (optional)
npx ts-node scripts/db/seed.ts
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Git Workflow

### 1. Create a Feature Branch

```bash
# Sync with upstream main
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

**Branch naming conventions**:
- `feature/add-feature-name` - New features
- `fix/fix-description` - Bug fixes
- `docs/update-documentation` - Documentation updates
- `test/add-tests` - Test additions
- `refactor/improve-code` - Code refactoring
- `perf/optimize-performance` - Performance improvements

### 2. Make Changes

```bash
# Make your code changes
# Commit frequently with meaningful messages
git add .
git commit -m "feat: add new feature"
```

### 3. Keep Branch Updated

```bash
# Rebase on latest upstream/main
git fetch upstream
git rebase upstream/main

# Fix conflicts if any, then continue
git add .
git rebase --continue
```

### 4. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

---

## Code Standards

### TypeScript

- ✅ Use strict TypeScript (`strict: true` in tsconfig.json)
- ✅ Declare all types explicitly
- ✅ Avoid `any` type
- ✅ Use interfaces for objects, types for primitives
- ✅ Document complex types with JSDoc comments

```typescript
// ✅ Good
interface Book {
  id: string;
  title: string;
  author: string;
  rating: number;
}

function getBook(id: string): Promise<Book | null> {
  // ...
}

// ❌ Bad
function getBook(id: any): any {
  // ...
}
```

### Code Formatting

- **Prettier** automatically formats code
- **ESLint** enforces code quality rules
- **Husky** runs checks before commits

```bash
# Manual formatting
npm run format

# Manual linting
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### Component Guidelines

```typescript
// ✅ Good: Typed props, clear naming
interface BookCardProps {
  book: Book;
  onSelect: (id: string) => void;
}

export function BookCard({ book, onSelect }: BookCardProps) {
  return <div>...</div>;
}

// ❌ Bad: Unclear props, no types
export function BookCard(props) {
  return <div>...</div>;
}
```

### API Routes

```typescript
// ✅ Good: Type-safe, validated input
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  query: z.string().min(1),
  page: z.number().positive().default(1),
});

export async function GET(req: NextRequest) {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const validation = querySchema.safeParse(searchParams);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Process request...
}
```

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (not affecting functionality)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test additions/updates
- `chore`: Build, CI, dependencies
- `ci`: CI/CD configuration

### Examples

```bash
git commit -m "feat(library): add book filtering by rating"
git commit -m "fix(api): handle null ISBN in book search response"
git commit -m "docs: update README installation instructions"
git commit -m "refactor(store): simplify book fetching logic"
git commit -m "test(library): add unit tests for BookCard component"
```

---

## Pull Requests

### Before Opening a PR

- [ ] Test your changes locally
- [ ] Run `npm run lint` - all checks pass
- [ ] Run `npm run build` - build succeeds
- [ ] Update documentation if needed
- [ ] Rebase on latest `main` branch
- [ ] Squash unnecessary commits

### Opening a PR

1. **Push your branch** to your fork
2. **Open a PR** on GitHub against the `main` branch
3. **Fill in PR template** with:
   - Clear description of changes
   - Motivation and context
   - Related issues (if any)
   - Screenshots for UI changes

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Motivation
Why is this change needed? What problem does it solve?

## Related Issues
Closes #123

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Screenshots (if applicable)
Before/after screenshots for UI changes

## Checklist
- [ ] Tests pass
- [ ] Code is formatted
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] No breaking changes
```

### PR Review Guidelines

- Be receptive to feedback
- Request reviews from maintainers
- Don't force push after reviews start
- Address feedback with new commits
- Wait for approval before merging

---

## Testing

### Run Existing Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Writing Tests

```typescript
// ✅ Good test structure
describe('BookCard', () => {
  it('renders book title', () => {
    const book: Book = { id: '1', title: 'Test Book', author: 'Test' };
    render(<BookCard book={book} onSelect={jest.fn()} />);
    expect(screen.getByText('Test Book')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    const book: Book = { id: '1', title: 'Test Book', author: 'Test' };
    render(<BookCard book={book} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

### Coverage Target

- **Unit Tests**: >80% coverage for utils and hooks
- **Component Tests**: >70% coverage for React components
- **Critical Paths**: 100% coverage for auth and data operations

---

## Database Changes

### Adding Migrations

1. **Create migration file** in `supabase/migrations/`

```sql
-- supabase/migrations/20250103120000_add_book_cover.sql
ALTER TABLE public.books ADD COLUMN cover_url text;
```

2. **Version with timestamp**: `YYYYMMDDHHMMSS_description.sql`

3. **Apply migration**:

```bash
npx ts-node scripts/db/migrate.ts up
```

### Schema Changes

⚠️ **Important**: Never directly modify production database. Always:

1. Create versioned migration file
2. Test in development
3. Review SQL syntax
4. Document breaking changes
5. Provide migration steps in PR

### Adding Seed Data

```typescript
// Update scripts/db/seed.ts
const sampleData = [
  {
    title: 'New Book',
    author: 'Author Name',
    // ...
  },
];
```

---

## Documentation

### README Updates

- Keep clear and up-to-date
- Include examples for new features
- Document API endpoints
- Provide troubleshooting section

### Inline Documentation

```typescript
/**
 * Fetches books matching the search query
 * @param query - Search string (title, author, ISBN)
 * @param page - Result page number (1-based)
 * @returns List of matching books
 */
async function searchBooks(query: string, page: number): Promise<Book[]> {
  // ...
}
```

### API Documentation

Update `API.md` for new endpoints:

```markdown
## POST /api/books

Creates a new book entry.

**Request**:
```json
{
  "title": "Book Title",
  "author": "Author Name"
}
```

**Response**: 201 Created
```json
{
  "id": "uuid",
  "title": "Book Title",
  "created_at": "2025-01-03T00:00:00Z"
}
```

---

## Questions?

- **Discussion**: Start a GitHub Discussion
- **Issues**: Open a GitHub Issue
- **Chat**: Join our community Discord (if available)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing!** 🎉
