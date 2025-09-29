"use client";

import { useState } from 'react';
import Image from 'next/image';

type BookItem = {
  title: string;
  authors: string[];
  publisher: string;
  publishedAt: string;
  isbn: string;
  isbn13: string | null;
  thumbnail: string | null;
  sourceUrl: string | null;
};

export default function BooksSearchPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!q.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/books?${new URLSearchParams({ query: q, page: '1', size: '10' })}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">도서 검색(알라딘)</h1>
      <div className="vintage-card p-4 h-stack">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="제목 또는 키워드" className="vintage-input" />
        <button className="vintage-button" onClick={search}>{loading ? '검색 중…' : '검색'}</button>
      </div>
      {error ? <div className="vintage-card p-3" style={{color:'#b00'}}>{error}</div> : null}
      <div className="vintage-card p-4">
        <table className="text-sm w-full">
          <thead>
            <tr><th className="text-left">표지</th><th className="text-left">제목</th><th className="text-left">저자</th><th className="text-left">출판사</th><th className="text-left">출간일</th></tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.isbn}>
                <td style={{width:70}}>
                  {b.thumbnail ? (
                    <Image src={b.thumbnail} alt={`책 표지: ${b.title}`} width={60} height={86} style={{objectFit:'cover', border:'1px solid rgba(0,0,0,.06)', borderRadius:6, background:'var(--paper, #f9f7f2)'}} />
                  ) : (
                    <div aria-hidden="true" style={{width:60, height:86, border:'1px solid rgba(0,0,0,.06)', borderRadius:6, background:'var(--paper, #f9f7f2)'}} />
                  )}
                </td>
                <td><a className="vintage-link" href={b.sourceUrl || '#'} target="_blank" rel="noreferrer">{b.title}</a></td>
                <td>{b.authors.join(', ')}</td>
                <td>{b.publisher}</td>
                <td>{b.publishedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
