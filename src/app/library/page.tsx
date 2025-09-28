import GuardedCreateButton from './GuardedCreateButton';
type Book = {
  id: string;
  title: string;
  author?: string | null;
  rating?: number | null;
  updated_at?: string | null;
  isbn?: string | null;
};

async function fetchBooks(q?: string): Promise<Book[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const params = new URLSearchParams();
  params.set('select', 'id,title,author,rating,updated_at,isbn');
  params.set('order', 'updated_at.desc');
  if (q && q.trim()) params.set('title', `ilike.*${q}*`);

  const res = await fetch(`${base}/rest/v1/books?${params.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    console.error('Failed to fetch books', await res.text());
    return [];
  }
  return (await res.json()) as Book[];
}

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = sp?.q ?? '';
  const books = await fetchBooks(q);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">라이브러리</h1>

      <form className="flex gap-2" action="/library" method="get">
        <input
          name="q"
          aria-label="제목 검색"
          defaultValue={q}
          placeholder="검색 (제목)"
          className="vintage-input flex-1"
        />
        <button className="vintage-button" aria-label="검색">검색</button>
      </form>

      <div className="flex">
        <div style={{marginLeft:'auto'}}>
          <GuardedCreateButton />
        </div>
      </div>

      {books.length === 0 ? (
        <p className="opacity-80">책이 없습니다. 상단의 검색어를 바꾸거나 “새 책 등록하기”를 눌러 책을 추가하세요.</p>
      ) : (
        <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((b) => (
            <li key={b.id} className="vintage-card p-3 v-stack">
              <a href={`/book/${b.id}`} className="block v-stack">
                <div className="cover-7-10" aria-hidden>
                  {b.isbn ? (
                    <img
                      src={`https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg`}
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-60">No Cover</div>
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-medium line-clamp-2">{b.title}</div>
                  {b.author ? <div className="text-xs opacity-80 mt-0.5">{b.author}</div> : null}
                  <div className="h-stack" style={{justifyContent:'space-between'}}>
                    {typeof b.rating === 'number' ? (
                      <span className="text-xs">⭐ {b.rating}</span>
                    ) : <span />}
                    {b.updated_at ? (
                      <span className="text-[10px] opacity-60">{new Date(b.updated_at).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
