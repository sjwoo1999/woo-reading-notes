## Run
1. Install deps: `pnpm i` (or npm/yarn)
2. Add `.env.local`:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - ADMIN_EMAILS
   - ALADIN_TTB_KEY
3. Apply Supabase SQL (schema + RLS + seed)
4. Dev server: `pnpm dev`

## Pages
- /library, /book/[id], /graph, /tags, /settings, /books

## Test Aladin Books API
```bash
curl -G 'http://localhost:3000/api/books' \
  --data-urlencode 'query=데미안' \
  --data-urlencode 'page=1' \
  --data-urlencode 'size=10'
```

Notes
- Aladin `pubDate` may be yyyymmdd; convert to yyyy-mm-dd if needed
- JSON output uses `output=JS` per Aladin docs
- Commercial use must follow Aladin OpenAPI TOS
