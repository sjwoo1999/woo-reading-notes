import { z } from 'zod';

const BookSchema = z.object({ title: z.string().min(1) });
const NoteSchema = z.object({ content: z.string().optional(), book_id: z.string().uuid().optional() });

async function post(table: 'books' | 'notes', body: any) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${base}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function CapturePage() {
  async function createBook(formData: FormData) {
    'use server';
    const title = String(formData.get('title') || '');
    const parsed = BookSchema.safeParse({ title });
    if (!parsed.success) throw new Error('Title is required');
    await post('books', parsed.data);
  }

  async function createNote(formData: FormData) {
    'use server';
    const content = formData.get('content');
    const book_id = formData.get('book_id');
    const parsed = NoteSchema.safeParse({ content: content ? String(content) : undefined, book_id: book_id ? String(book_id) : undefined });
    if (!parsed.success) throw new Error('Invalid input');
    await post('notes', parsed.data);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">빠른 기록</h1>

      <form action={createBook} className="vintage-card p-4" style={{display:'grid', gap:'8px'}}>
        <h3 className="font-medium">빠른 책 생성</h3>
        <input name="title" aria-label="책 제목" placeholder="책 제목" className="vintage-input" />
        <button className="vintage-button">책 생성</button>
      </form>

      <form action={createNote} className="vintage-card p-4" style={{display:'grid', gap:'8px'}}>
        <h3 className="font-medium">빠른 노트 작성</h3>
        <textarea name="content" aria-label="노트 내용" placeholder="노트 내용" className="vintage-input" />
        <input name="book_id" aria-label="책 ID" placeholder="(선택) 책 ID" className="vintage-input" />
        <button className="vintage-button">노트 생성</button>
      </form>
    </div>
  );
}
