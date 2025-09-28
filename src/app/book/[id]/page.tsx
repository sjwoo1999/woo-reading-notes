import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getSessionUser, isAdmin } from '@/lib/auth';

async function getBook(id: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const url = `${base}/rest/v1/books?select=id,title,author,publisher,published_year,isbn,rating,progress,summary,updated_at&id=eq.${id}`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

async function getNotes(bookId: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const url = `${base}/rest/v1/notes?select=id,title,content,updated_at&book_id=eq.${bookId}&order=updated_at.desc`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const NoteSchema = z.object({ title: z.string().optional(), content: z.string().optional() });

async function createNote(bookId: string, formData: FormData) {
  'use server';
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const input = { title: String(formData.get('title') || ''), content: String(formData.get('content') || ''), book_id: bookId };
  const parsed = NoteSchema.safeParse({ title: input.title || undefined, content: input.content || undefined });
  if (!parsed.success) throw new Error('Invalid input');
  const res = await fetch(`${base}/rest/v1/notes`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await res.text());
}

async function deleteBook(bookId: string) {
  'use server';
  const user = await getSessionUser();
  if (!user || !isAdmin(user.email)) {
    redirect('/auth?next=' + encodeURIComponent('/book/' + bookId) + '&reason=admin-only');
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  // Optional: clean related links (both directions) before deleting
  await fetch(`${base}/rest/v1/links?or=(and(src_type.eq.book,src_id.eq.${bookId}),and(dst_type.eq.book,dst_id.eq.${bookId}))`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  await fetch(`${base}/rest/v1/books?id=eq.${bookId}`, { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } });
  redirect('/library');
}

export default async function BookDetail({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = p.id;
  const book = await getBook(id);
  if (!book) return <div className="vintage-card p-4">찾을 수 없습니다.</div>;
  const notes = await getNotes(id);

  return (
    <div className="space-y-4">
      <div className="vintage-card p-4" style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:'12px'}}>
        <div style={{width:84, height:120, border:'1px solid var(--line)', borderRadius:8, overflow:'hidden'}} aria-hidden>
          {book.isbn ? (
            <img src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs opacity-60">No Cover</div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{book.title}</h1>
          {book.author ? <div className="opacity-80">{book.author}</div> : null}
          <div className="text-sm opacity-70 mt-1">{book.publisher || ''} {book.published_year || ''}</div>
          <div className="text-sm mt-1 flex gap-3">
            {typeof book.rating === 'number' ? <span>⭐ {book.rating}</span> : null}
            {typeof book.progress === 'number' ? <span>Progress {book.progress}%</span> : null}
          </div>
          {book.summary ? <p className="text-sm mt-2 opacity-90 whitespace-pre-wrap">{book.summary}</p> : null}
        </div>
      </div>

      <form action={deleteBook.bind(null, id)} className="vintage-card p-4" style={{display:'flex', justifyContent:'flex-end'}}>
        <button className="vintage-button--danger" aria-label="도서 삭제">도서 삭제</button>
      </form>

      <form action={createNote.bind(null, id)} className="vintage-card p-4" style={{display:'grid', gap:'8px'}}>
        <h3 className="font-medium">노트 추가</h3>
        <input name="title" aria-label="노트 제목" placeholder="노트 제목" className="vintage-input" />
        <textarea name="content" aria-label="노트 내용" placeholder="노트 내용" className="vintage-input" />
        <button className="vintage-button">생성</button>
      </form>

      <div className="grid gap-2">
        {notes.map((n: any) => (
          <div key={n.id} className="vintage-card p-3">
            <div className="font-medium">{n.title || 'Untitled'}</div>
            {n.content ? <div className="text-sm opacity-80 mt-1 whitespace-pre-wrap">{n.content}</div> : null}
            {n.updated_at ? <div className="text-xs opacity-60 mt-1">{new Date(n.updated_at).toLocaleString()}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
