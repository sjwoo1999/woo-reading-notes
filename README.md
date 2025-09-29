## Run
1. Install deps: `pnpm i` (or npm/yarn)
2. Add `.env.local`:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - ADMIN_EMAILS
   - KAKAO_REST_API_KEY
3. Apply Supabase SQL (schema + RLS + seed)
4. Dev server: `pnpm dev`

## Pages
- /library, /book/[id], /graph, /tags, /settings, /books

## Test Kakao Books API
```bash
curl -G 'http://localhost:3000/api/books' \
  --data-urlencode 'query=데미안' \
  --data-urlencode 'page=1' \
  --data-urlencode 'size=10'
```

Notes
- Kakao `datetime` is full ISO date-time; slice(0,10) client-side if needed
- Thumbnail resolution guarantees not clearly stated by Kakao (uncertain)
- Commercial use must follow Kakao Developers TOS
