# Quick Fix Guide for CI/CD Failures

## 🚨 Issue Summary

Your CI/CD is failing due to:
1. ❌ **13 ESLint warnings** blocking `lint` command (requires 0 warnings)
2. ❌ **Missing Prettier** in devDependencies
3. ❌ **Missing ts-node** for running scripts
4. ❌ **GitHub Secrets** not configured
5. ❌ **Dockerfile** doesn't exist (Docker build job fails)

---

## ⚡ Quick Fixes (In Order)

### Fix 1: Fix ESLint Warnings (5 min)

**Current Status**: 13 warnings need fixing

**Quick Fix Command**:
```bash
npm run lint:fix
```

This will auto-fix most warnings. Check the output:

```
# Expected after npm run lint:fix
ESLint found 0 problems (0 errors, 0 warnings)
```

**Manual Fixes Needed** (if auto-fix doesn't handle them):

1. **src/app/api/books/route.ts:91** - Remove unused eslint-disable
   ```ts
   - // eslint-disable-line @typescript-eslint/no-explicit-any
   + // (keep only if needed)
   ```

2. **src/app/api/visits/route.ts:12** - Rename unused parameter
   ```ts
   - export async function POST(req: NextRequest) {
   + export async function POST(_req: NextRequest) {
   ```

3. **src/app/book/new/NewBookWizard.tsx:3** - Remove unused imports
   ```ts
   - import { useMemo, useState } from 'react';
   + import { useState } from 'react';
   ```

4. **src/app/graph/page.tsx:8-14** - Remove unused setState calls
   ```ts
   - const [minWeight, setMinWeight] = useState(0);
   - const [tags, setTags] = useState([]);
   + // Remove if not used, or prefix with underscore if needed later
   ```

**Verify**:
```bash
npm run lint
# Should show: 0 errors, 0 warnings
```

---

### Fix 2: Install Missing Dependencies (3 min)

```bash
npm install --save-dev prettier ts-node
```

**Verify**:
```bash
npx prettier --version  # Should work
npx ts-node --version  # Should work
```

---

### Fix 3: Test All Scripts Locally (5 min)

Run each command to verify they work:

```bash
# Type checking
npm run type-check
# Expected: Success (0 problems)

# Formatting check
npm run format:check
# Expected: All matched files are already formatted (if no changes needed)

# ESLint
npm run lint
# Expected: 0 errors, 0 warnings

# Format (auto-fix)
npm run format
# Expected: Lists formatted files

# Build
npm run build
# Expected: Build successful

# Validate environment
npm run validate:env
# Expected: Environment validation report
```

---

### Fix 4: Configure GitHub Secrets (3 min)

1. Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

2. Click **New repository secret** and add:

| Secret Name | Value |
|------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL (https://xxx.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `ALADIN_TTB_KEY` | Your Aladin API key |
| `VERCEL_TOKEN` | Your Vercel token (optional, for deployments) |
| `VERCEL_ORG_ID` | Your Vercel org ID (optional) |
| `VERCEL_PROJECT_ID` | Your Vercel project ID (optional) |

**Verify**: Secrets appear in the list

---

### Fix 5: Update CI/CD Workflow (Optional - Better Version)

Choose one option:

**Option A**: Use the simpler, working workflow
- Keep current workflows but update them with the ci.yml patterns

**Option B**: Replace with unified ci.yml
- Copy the complete `ci.yml` from `CI_CD_TROUBLESHOOTING.md`
- Delete old workflows (test.yml, build.yml)
- Rename to `.github/workflows/ci.yml`

**Recommended**: Option A (minimal changes, less risky)

---

### Fix 6: Disable Docker Build (For Now)

Edit `.github/workflows/build.yml` and comment out or remove:

```yaml
docker-build:
  name: Build Docker Image
  # ... entire job commented out for now
  # Reason: Dockerfile doesn't exist yet
```

---

## ✅ Verification Checklist

After applying fixes, verify:

```bash
# 1. Lint passes with 0 warnings
npm run lint
# ✅ Expected: 0 errors, 0 warnings

# 2. Type check passes
npm run type-check
# ✅ Expected: Success

# 3. Format check passes
npm run format:check
# ✅ Expected: All matched files are already formatted

# 4. Build succeeds
npm run build
# ✅ Expected: Build successful

# 5. Environment validation works
npm run validate:env
# ✅ Expected: All environment checks pass (with warnings is OK)
```

---

## 🔄 Commit & Push

Once all local tests pass:

```bash
# Add all changes
git add .

# Commit
git commit -m "fix: resolve CI/CD failures and add npm scripts"

# Push
git push origin main
```

GitHub Actions should now:
1. ✅ Run lint → PASS
2. ✅ Run type-check → PASS
3. ✅ Run format-check → PASS
4. ✅ Run build → PASS
5. ✅ Skip Docker build (removed)
6. ✅ Skip deployment (only on develop/main)

---

## 🎯 Expected Timeline

| Step | Time | Effort |
|------|------|--------|
| Fix ESLint warnings | 5 min | Auto-fix + manual |
| Install dependencies | 2 min | Single command |
| Test scripts locally | 5 min | Run 5 commands |
| Configure secrets | 3 min | Copy-paste into GitHub |
| Update workflows | 5 min | Copy/modify YAML |
| Commit & push | 2 min | Git commands |
| **TOTAL** | **22 min** | **Minimal** |

---

## 📋 Full Step-by-Step Execution

```bash
# 1. Check current status
npm run lint       # Will show 13 warnings - expected

# 2. Fix auto-fixable issues
npm run lint:fix   # Auto-fix unused variables

# 3. Install missing dev dependencies
npm install --save-dev prettier ts-node

# 4. Verify all scripts work
npm run type-check && echo "✅ Type check passed"
npm run format:check && echo "✅ Format check passed"
npm run lint && echo "✅ Lint passed"
npm run format && echo "✅ Format completed"
npm run build && echo "✅ Build passed"

# 5. Commit with linter fixes
git add -A
git commit -m "fix: resolve ESLint warnings and add missing npm scripts"
git push origin main

# 6. Monitor GitHub Actions
# → Go to GitHub → Actions → watch for green checkmarks
```

---

## 🆘 If Still Failing

**If `npm run lint` still shows warnings**:
```bash
# See which files have warnings
npm run lint 2>&1 | grep "warning"

# Manually fix each one by editing the file
# Then commit with: git add . && git commit -m "fix: resolve remaining lint warnings"
```

**If `npm run build` fails**:
```bash
# Check if all env vars are present
npm run validate:env

# Try building with placeholder vars
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key \
ALADIN_TTB_KEY=test-key \
npm run build
```

**If GitHub Actions still fails**:
1. Check the workflow logs: **Actions → Latest run → Click failing job**
2. Look for "error:" or "failed:" in the logs
3. Compare with local test results
4. Update workflow with fix from logs

---

## 📚 Reference Files

- `MODERNIZATION_PLAN.md` - Overall strategy
- `CI_CD_TROUBLESHOOTING.md` - Detailed analysis & fixed workflows
- `IMPLEMENTATION_CHECKLIST.md` - Implementation steps
- `.github/workflows/ci.yml` - Example unified workflow (in troubleshooting guide)

---

## 🎉 Success Criteria

All of these should pass:

```
✅ npm run lint          → 0 errors, 0 warnings
✅ npm run type-check    → Success
✅ npm run format:check  → All files formatted
✅ npm run build         → Build successful
✅ GitHub Actions        → All jobs green
```

---

**Timeline to Resolution**: ~20-30 minutes
**Difficulty Level**: Easy (mostly auto-fixes)
**Risk Level**: Low (no breaking changes)
