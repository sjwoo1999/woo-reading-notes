import { redirect } from 'next/navigation';
import { getSessionUser, isAdmin } from '@/lib/auth';
import { z } from 'zod';

const BookSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  published_year: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  isbn: z.string().optional().nullable(),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  progress: z.coerce.number().min(0).max(100).optional().nullable(),
  summary: z.string().optional().nullable()
});

async function createBook(formData: FormData) {
  'use server';
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const input = {
    title: String(formData.get('title') || ''),
    author: String(formData.get('author') || '') || null,
    publisher: String(formData.get('publisher') || '') || null,
    published_year: formData.get('published_year'),
    isbn: String(formData.get('isbn') || '') || null,
    rating: formData.get('rating'),
    progress: formData.get('progress'),
    summary: String(formData.get('summary') || '') || null
  } as any;
  const parsed = BookSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid input');
  const res = await fetch(`${base}/rest/v1/books`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(parsed.data) });
  if (!res.ok) throw new Error(await res.text());
  redirect('/library');
}

export default async function NewBookPage() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user.email)) {
    redirect('/auth?next=' + encodeURIComponent('/book/new') + '&reason=admin-only');
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">새 책 등록하기</h1>
      <form action={createBook} className="vintage-card p-4" style={{display:'grid', gap:'8px'}}>
        <input name="title" aria-label="제목" placeholder="제목 *" className="vintage-input" required />
        <input name="author" aria-label="저자" placeholder="저자" className="vintage-input" />
        <input name="publisher" aria-label="출판사" placeholder="출판사" className="vintage-input" />
        <div className="h-stack">
          <input name="published_year" aria-label="출판 연도" placeholder="출판 연도" className="vintage-input" />
          <input name="isbn" aria-label="ISBN" placeholder="ISBN" className="vintage-input" />
        </div>
        <div className="h-stack">
          <input name="rating" aria-label="평점" placeholder="평점 0-5" className="vintage-input" />
          <input name="progress" aria-label="진행률" placeholder="진행률 0-100" className="vintage-input" />
        </div>
        <textarea name="summary" aria-label="요약" placeholder="요약" className="vintage-input" />
        <div className="h-stack" style={{justifyContent:'flex-end'}}>
          <a href="/library" className="vintage-button--danger">취소</a>
          <button className="vintage-button">등록</button>
        </div>
      </form>
    </div>
  );
}
