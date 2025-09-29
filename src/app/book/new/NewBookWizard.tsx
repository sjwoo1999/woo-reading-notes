"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

type SearchPick = {
  title: string;
  authors: string[];
  publisher: string;
  publishedAt: string;
  isbn: string;
  isbn13: string | null;
  thumbnail: string | null;
  sourceUrl: string | null;
};

type EnrichedInput = {
  title: string;
  authorsText: string; // comma separated
  publisher: string;
  publishedDate: string; // yyyy-mm-dd
  isbn13: string | null;
  thumbnail: string | null;
  startDate?: string | null;
  endDate?: string | null;
  note?: string | null;
  feelings?: string | null;
  rating?: number | null; // 0–5
  progress?: number | null; // 0–100
  tagsText?: string; // comma separated
};

const EnrichedSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  authorsText: z.string().optional().default(""),
  publisher: z.string().optional().default(""),
  publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional().default(""),
  isbn13: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  feelings: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  progress: z.number().min(0).max(100).nullable().optional(),
  tagsText: z.string().optional()
});

type BooksResponse = {
  items: SearchPick[];
  isEnd: boolean;
  page: number;
  size: number;
  query: string;
};

export default function NewBookWizard() {
  // step state
  const [step, setStep] = useState<1 | 2>(1);

  // search state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [results, setResults] = useState<SearchPick[]>([]);
  const [isEnd, setIsEnd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // selection
  const [pick, setPick] = useState<SearchPick | null>(null);
  const [form, setForm] = useState<EnrichedInput | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  async function search(p = page, s = size) {
    if (!q.trim()) return;
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/books?${new URLSearchParams({ query: q, page: String(p), size: String(s) }).toString()}`);
      const data: BooksResponse = await res.json();
      if (!res.ok) throw new Error((data as any)?.error || "검색 실패");
      setResults(data.items || []);
      setIsEnd(!!data.isEnd);
      setPage(data.page);
      setSize(data.size);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function onPick(item: SearchPick) {
    setPick(item);
    setForm({
      title: item.title,
      authorsText: (item.authors || []).join(", "),
      publisher: item.publisher || "",
      // Aladin: pubDate는 yyyymmdd 형식일 수 있음 → yyyy-mm-dd로 보정
      publishedDate: (()=>{
        const d = item.publishedAt || "";
        if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
        return d.slice(0,10);
      })(),
      isbn13: item.isbn13,
      thumbnail: item.thumbnail,
      startDate: null,
      endDate: null,
      note: null,
      feelings: null,
      rating: null,
      progress: null,
      tagsText: ""
    });
    setStep(2);
  }

  async function submit() {
    if (!form) return;
    setSubmitMsg(null);
    const parsed = EnrichedSchema.safeParse(form);
    if (!parsed.success) {
      setSubmitMsg(parsed.error.issues?.[0]?.message || "입력 오류");
      return;
    }
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

      const authors = (form.authorsText || "").trim();
      const publishedYear = form.publishedDate && /^(\d{4})/.test(form.publishedDate) ? Number(form.publishedDate.slice(0, 4)) : null;
      // books insert
      const bookPayload: any = {
        title: form.title,
        author: authors,
        publisher: form.publisher || null,
        published_year: publishedYear,
        isbn: form.isbn13 || (pick?.isbn || null),
        rating: form.rating ?? null,
        progress: form.progress ?? null,
        summary: form.feelings || null
        // thumbnail은 스키마에 없음(확실하지 않음)
      };
      const bRes = await fetch(`${base}/rest/v1/books`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(bookPayload) });
      if (!bRes.ok) throw new Error(await bRes.text());
      const bJson = await bRes.json();
      const bookId = Array.isArray(bJson) ? bJson[0]?.id : bJson?.id;
      if (!bookId) throw new Error('책 생성 실패');

      // optional note
      if (form.note && form.note.trim()) {
        await fetch(`${base}/rest/v1/notes`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ book_id: bookId, title: '메모', content: form.note }) });
      }

      // tags upsert
      const tags = (form.tagsText || "").split(",").map(t => t.trim()).filter(Boolean);
      for (const name of tags) {
        // try get
        const getRes = await fetch(`${base}/rest/v1/tags?select=id,name&name=eq.${encodeURIComponent(name)}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        let tagId: string | null = null;
        if (getRes.ok) {
          const rows = await getRes.json();
          if (Array.isArray(rows) && rows[0]?.id) tagId = rows[0].id;
        }
        if (!tagId) {
          const ins = await fetch(`${base}/rest/v1/tags`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ name }) });
          if (ins.ok) {
            const rows = await ins.json();
            tagId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
          }
        }
        if (tagId) {
          await fetch(`${base}/rest/v1/book_tags`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ book_id: bookId, tag_id: tagId }) });
        }
      }

      window.location.assign(`/book/${bookId}`);
    } catch (e: any) {
      setSubmitMsg(e.message || '등록 실패');
    }
  }

  return (
    <div className="space-y-4">
      {step === 1 ? (
        <div className="space-y-3">
          <div className="vintage-card p-4 h-stack" style={{flexWrap:'wrap'}}>
            <input className="vintage-input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="제목 또는 키워드" />
            <input className="vintage-input" style={{width:90}} type="number" value={size} onChange={(e)=>setSize(Number(e.target.value))} aria-label="size" />
            <button className="vintage-button" onClick={()=>search(1, size)}>{loading ? '검색 중…' : '검색'}</button>
          </div>
          {err ? <div className="vintage-card p-3" style={{color:'#b00'}}>{err}</div> : null}
          <div className="vintage-card p-4">
            <table className="text-sm w-full">
              <thead>
                <tr><th className="text-left">제목</th><th className="text-left">저자</th><th className="text-left">출판사</th><th className="text-left">출간일</th><th className="text-left">ISBN13</th><th></th></tr>
              </thead>
              <tbody>
                {results.map((b) => (
                  <tr key={b.isbn}>
                    <td>{b.title}</td>
                    <td>{b.authors.join(', ')}</td>
                    <td>{b.publisher}</td>
                    <td>{b.publishedAt}</td>
                    <td>{b.isbn13 || '-'}</td>
                    <td><button className="vintage-button" onClick={()=>onPick(b)}>선택</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="h-stack mt-2" style={{justifyContent:'space-between'}}>
              <button className="vintage-button" onClick={()=>{ if (page>1) search(page-1, size); }} disabled={page<=1}>이전</button>
              <div className="text-xs opacity-70">page {page}</div>
              <button className="vintage-button" onClick={()=>{ if (!isEnd) search(page+1, size); }} disabled={isEnd}>다음</button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 && form ? (
        <div className="space-y-3">
          <div className="vintage-card p-4 v-stack">
            <h3 className="font-medium">선택한 도서</h3>
            <div className="text-sm">{pick?.title} — {(pick?.authors || []).join(', ')} / {pick?.publisher}</div>
            <div className="text-xs opacity-70">원본 출간일: {pick?.publishedAt} (알라딘은 yyyymmdd일 수 있음)</div>
          </div>
          <div className="vintage-card p-4 v-stack">
            <label className="v-stack">제목<input className="vintage-input" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} /></label>
            <label className="v-stack">저자(쉼표 구분)<input className="vintage-input" value={form.authorsText} onChange={(e)=>setForm({...form, authorsText: e.target.value})} /></label>
            <label className="v-stack">출판사<input className="vintage-input" value={form.publisher} onChange={(e)=>setForm({...form, publisher: e.target.value})} /></label>
            <div className="h-stack">
              <label className="v-stack" style={{flex:1}}>출간일<input className="vintage-input" type="date" value={form.publishedDate} onChange={(e)=>setForm({...form, publishedDate: e.target.value})} /></label>
              <label className="v-stack" style={{flex:1}}>ISBN13<input className="vintage-input" value={form.isbn13 || ''} onChange={(e)=>setForm({...form, isbn13: e.target.value || null})} /></label>
            </div>
            <div className="h-stack">
              <label className="v-stack" style={{flex:1}}>읽기 시작<input className="vintage-input" type="date" value={form.startDate || ''} onChange={(e)=>setForm({...form, startDate: e.target.value})} /></label>
              <label className="v-stack" style={{flex:1}}>읽기 종료<input className="vintage-input" type="date" value={form.endDate || ''} onChange={(e)=>setForm({...form, endDate: e.target.value})} /></label>
            </div>
            <label className="v-stack">메모<textarea className="vintage-input" value={form.note || ''} onChange={(e)=>setForm({...form, note: e.target.value})} /></label>
            <label className="v-stack">느낀 점<textarea className="vintage-input" value={form.feelings || ''} onChange={(e)=>setForm({...form, feelings: e.target.value})} /></label>
            <div className="h-stack">
              <label className="v-stack" style={{flex:1}}>평점(0-5)<input className="vintage-input" type="number" value={form.rating ?? ''} onChange={(e)=>setForm({...form, rating: e.target.value === '' ? null : Number(e.target.value)})} /></label>
              <label className="v-stack" style={{flex:1}}>진행률(0-100)<input className="vintage-input" type="number" value={form.progress ?? ''} onChange={(e)=>setForm({...form, progress: e.target.value === '' ? null : Number(e.target.value)})} /></label>
            </div>
            <label className="v-stack">태그(쉼표 구분)<input className="vintage-input" value={form.tagsText || ''} onChange={(e)=>setForm({...form, tagsText: e.target.value})} /></label>
            <div className="h-stack" style={{justifyContent:'space-between'}}>
              <button className="vintage-button" onClick={()=>setStep(1)}>이전으로</button>
              <button className="vintage-button" onClick={submit}>등록</button>
            </div>
            {submitMsg ? <div className="text-sm opacity-80">{submitMsg}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}


