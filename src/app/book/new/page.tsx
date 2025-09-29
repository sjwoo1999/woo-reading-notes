import { redirect } from 'next/navigation';
import { getSessionUser, isAdmin } from '@/lib/auth';
import NewBookWizard from './NewBookWizard';
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
      <NewBookWizard />
    </div>
  );
}
