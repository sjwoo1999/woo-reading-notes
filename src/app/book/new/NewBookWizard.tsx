"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/client";
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
  const [size, setSize] = useState(20);
  const [results, setResults] = useState<SearchPick[]>([]);
  const [isEnd, setIsEnd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // selection
  const [pick, setPick] = useState<SearchPick | null>(null);
  const [form, setForm] = useState<EnrichedInput | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  // tags autocomplete state
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagSuggestOpen, setTagSuggestOpen] = useState(false);
  const tagDebounceRef = useRef<number | null>(null);

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

  // debounce search on query change
  useEffect(() => {
    if (!q.trim()) { setResults([]); setIsEnd(false); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { search(1, size); }, 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

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
      // Use session token so RLS associates rows with the logged-in user
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        setSubmitMsg('로그인 후 다시 시도하세요.');
        return;
      }
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
        summary: form.feelings || null,
        thumbnail_url: form.thumbnail || null
      };
      const bRes = await fetch(`${base}/rest/v1/books`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(bookPayload) });
      if (!bRes.ok) throw new Error(await bRes.text());
      const bJson = await bRes.json();
      const bookId = Array.isArray(bJson) ? bJson[0]?.id : bJson?.id;
      if (!bookId) throw new Error('책 생성 실패');

      // optional note
      if (form.note && form.note.trim()) {
        await fetch(`${base}/rest/v1/notes`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ book_id: bookId, title: '메모', content: form.note }) });
      }

      // tags upsert
      const tags = (form.tagsText || "").split(",").map(t => t.trim()).filter(Boolean);
      for (const name of tags) {
        // try get
        const getRes = await fetch(`${base}/rest/v1/tags?select=id,name&name=eq.${encodeURIComponent(name)}`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } });
        let tagId: string | null = null;
        if (getRes.ok) {
          const rows = await getRes.json();
          if (Array.isArray(rows) && rows[0]?.id) tagId = rows[0].id;
        }
        if (!tagId) {
          const ins = await fetch(`${base}/rest/v1/tags`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ name }) });
          if (ins.ok) {
            const rows = await ins.json();
            tagId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
          }
        }
        if (tagId) {
          await fetch(`${base}/rest/v1/book_tags`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ book_id: bookId, tag_id: tagId }) });
        }
      }

      window.location.assign(`/book/${bookId}`);
    } catch (e: any) {
      setSubmitMsg(e.message || '등록 실패');
    }
  }

  // sync tagsText from chips + free text when chips change
  function syncTagsText(nextChips: string[], freeText = tagInput) {
    const merged = [...nextChips];
    const f = freeText.trim();
    if (f) merged.push(f);
    setForm((prev) => prev ? { ...prev, tagsText: merged.join(", ") } : prev);
  }

  // helper: add a tag chip
  function addTagChip(name: string) {
    if (!form) return;
    const norm = name.trim();
    if (!norm) return;
    const current = (form.tagsText || "").split(",").map(t=>t.trim()).filter(Boolean);
    if (!current.includes(norm)) {
      const next = [...current, norm];
      setTagInput("");
      setTagSuggestions([]);
      setTagSuggestOpen(false);
      setForm({ ...form, tagsText: next.join(", ") });
    } else {
      setTagInput("");
      setTagSuggestOpen(false);
    }
  }

  function removeLastTagChip() {
    if (!form) return;
    const arr = (form.tagsText || "").split(",").map(t=>t.trim()).filter(Boolean);
    if (arr.length === 0) return;
    arr.pop();
    setForm({ ...form, tagsText: arr.join(", ") });
  }

  // fetch tag suggestions (debounced)
  useEffect(() => {
    if (!form) return;
    const q = tagInput.trim();
    if (tagDebounceRef.current) window.clearTimeout(tagDebounceRef.current);
    if (!q) { setTagSuggestions([]); return; }
    tagDebounceRef.current = window.setTimeout(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
        const url = new URL(`${base}/rest/v1/tags`);
        url.searchParams.set("select", "name");
        url.searchParams.set("name", `ilike.*${q}*`);
        url.searchParams.set("limit", "10");
        const resp = await fetch(url.toString(), { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
        if (!resp.ok) { setTagSuggestions([]); return; }
        const rows = await resp.json();
        const list: string[] = Array.isArray(rows) ? rows.map((r:any)=>String(r.name)).filter(Boolean) : [];
        // exclude already chosen
        const chosen = new Set((form.tagsText || "").split(",").map((t)=>t.trim()).filter(Boolean));
        setTagSuggestions(list.filter((n)=>!chosen.has(n)));
      } catch {
        setTagSuggestions([]);
      }
    }, 300);
    return () => { if (tagDebounceRef.current) window.clearTimeout(tagDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagInput]);

  return (
    <div className="space-y-4">
      {step === 1 ? (
        <div className="space-y-3">
          <div className="vintage-card p-4 h-stack" style={{flexWrap:'wrap'}}>
            <input className="vintage-input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="제목 또는 키워드" />
            <input className="vintage-input" style={{width:90}} type="number" value={size} onChange={(e)=>setSize(Number(e.target.value))} aria-label="size" />
            <button className="vintage-button" onClick={()=>search(1, size)} disabled={loading || !q.trim()}>{loading ? '검색 중…' : '검색'}</button>
          </div>
          {err ? <div className="vintage-card p-3" style={{color:'#b00'}}>{err}</div> : null}
          <div className="vintage-card p-4">
            <table className="text-sm w-full">
              <thead>
                <tr><th className="text-left">표지</th><th className="text-left">제목</th><th className="text-left">저자</th><th className="text-left">출판사</th><th className="text-left">출간일</th><th></th></tr>
              </thead>
              <tbody>
                {loading && results.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="h-stack" style={{gap:12}}>
                      <div aria-hidden="true" style={{width:60, height:86, border:'1px solid rgba(0,0,0,.06)', borderRadius:6, background:'var(--paper, #f0ede6)'}} />
                      <div className="v-stack" style={{flex:1}}>
                        <div style={{height:14, background:'rgba(0,0,0,0.06)', borderRadius:4, width:'60%'}} />
                        <div style={{height:12, background:'rgba(0,0,0,0.06)', borderRadius:4, width:'40%'}} />
                      </div>
                    </div>
                  </td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={6}><div className="text-sm opacity-70">검색 결과가 없습니다</div></td></tr>
                ) : results.map((b) => (
                  <tr key={b.isbn}>
                    <td style={{width:70}}>
                      {b.thumbnail ? (
                        <Image src={b.thumbnail} alt={`책 표지: ${b.title}`} width={60} height={86} style={{objectFit:'cover', border:'1px solid rgba(0,0,0,.06)', borderRadius:6, background:'var(--paper, #f9f7f2)'}} />
                      ) : (
                        <div aria-hidden="true" style={{width:60, height:86, border:'1px solid rgba(0,0,0,.06)', borderRadius:6, background:'var(--paper, #f9f7f2)'}} />
                      )}
                    </td>
                    <td>{b.title}</td>
                    <td>{b.authors.join(', ')}</td>
                    <td>{b.publisher}</td>
                    <td>{b.publishedAt}</td>
                    <td><button className="vintage-button" onClick={()=>onPick(b)}>선택</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="h-stack mt-2" style={{justifyContent:'space-between'}}>
              <button className="vintage-button" onClick={()=>{ if (page>1) search(page-1, size); }} disabled={page<=1 || loading}>이전</button>
              <div className="text-xs opacity-70">page {page}</div>
              <button className="vintage-button" onClick={()=>{ if (!isEnd) search(page+1, size); }} disabled={isEnd || loading}>다음</button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 && form ? (
        <div className="space-y-3">
          <div className="vintage-card p-4 v-stack">
            <h3 className="font-medium">선택한 도서</h3>
            <div className="h-stack" style={{gap:12, alignItems:'flex-start'}}>
              <div className="cover-7-10" style={{width:160}}>
                {pick?.thumbnail ? (
                  <Image src={pick.thumbnail} alt={`책 표지: ${pick.title}`} fill sizes="160px" style={{objectFit:'cover'}} />
                ) : (
                  <div aria-hidden="true" style={{width:'100%', height:'100%', background:'var(--paper, #f9f7f2)'}} />
                )}
              </div>
              <div className="v-stack" style={{gap:4}}>
                <div className="text-sm">{pick?.title} — {(pick?.authors || []).join(', ')} / {pick?.publisher}</div>
                <div className="text-xs opacity-70">원본 출간일: {pick?.publishedAt}</div>
              </div>
            </div>
          </div>
          <div className="vintage-card p-4 v-stack">
            <label className="v-stack">제목<input className="vintage-input" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} /></label>
            <label className="v-stack">저자(쉼표 구분)<input className="vintage-input" value={form.authorsText} onChange={(e)=>setForm({...form, authorsText: e.target.value})} /></label>
            <label className="v-stack">출판사<input className="vintage-input" value={form.publisher} onChange={(e)=>setForm({...form, publisher: e.target.value})} /></label>
            <div className="h-stack">
              <label className="v-stack" style={{flex:1}}>출간일
                <input className="vintage-input" type="date" value={form.publishedDate} readOnly disabled aria-readonly="true" />
              </label>
              {/* ISBN 입력은 표시하지 않음 */}
            </div>
            <div className="h-stack">
              <label className="v-stack" style={{flex:1}}>읽기 시작<input className="vintage-input" type="date" value={form.startDate || ''} onChange={(e)=>setForm({...form, startDate: e.target.value})} /></label>
              <label className="v-stack" style={{flex:1}}>읽기 종료<input className="vintage-input" type="date" value={form.endDate || ''} onChange={(e)=>setForm({...form, endDate: e.target.value})} /></label>
            </div>
            <label className="v-stack">메모<textarea className="vintage-input" value={form.note || ''} onChange={(e)=>setForm({...form, note: e.target.value})} /></label>
            <label className="v-stack">느낀 점<textarea className="vintage-input" value={form.feelings || ''} onChange={(e)=>setForm({...form, feelings: e.target.value})} /></label>
            <div className="h-stack">
              <label className="v-stack" style={{flex:1}}>평점
                <div className="h-stack" role="radiogroup" aria-label="평점">
                  {[0,1,2,3,4,5].map((n)=> (
                    <button
                      key={n}
                      type="button"
                      aria-checked={form.rating === n}
                      role="radio"
                      onClick={()=>setForm({...form!, rating: n})}
                      className="vintage-button"
                      style={{padding:'4px 8px', background: form.rating === n ? '#3B4E76' : 'transparent', color: form.rating === n ? '#fff' : 'inherit'}}
                    >
                      {"★".repeat(n)}{"☆".repeat(5-n)}
                    </button>
                  ))}
                  <button type="button" className="vintage-button" onClick={()=>setForm({...form!, rating: null})} style={{padding:'4px 8px'}}>지움</button>
                </div>
              </label>
              {/* 진행률 입력 제거 */}
            </div>
            <div className="v-stack">
              <label>태그</label>
              <div className="vintage-input" style={{display:'flex', flexWrap:'wrap', gap:6, alignItems:'center'}}>
                {(form.tagsText || '').split(',').map(t=>t.trim()).filter(Boolean).map((t) => (
                  <span key={t} className="vintage-card" style={{padding:'2px 8px', borderRadius:12, fontSize:12}}>{t}</span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e)=>{ setTagInput(e.target.value); setTagSuggestOpen(true); }}
                  onKeyDown={(e)=>{
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagChip(tagInput); }
                    else if (e.key === 'Backspace' && tagInput === '') { e.preventDefault(); removeLastTagChip(); }
                  }}
                  placeholder="태그 입력 후 Enter"
                  style={{flex:1, minWidth:120, border:'none', outline:'none', background:'transparent'}}
                />
              </div>
              {tagSuggestOpen && tagSuggestions.length > 0 ? (
                <div className="vintage-card" style={{padding:6}}>
                  <div className="v-stack">
                    {tagSuggestions.map((name)=> (
                      <button key={name} className="h-stack" style={{justifyContent:'space-between'}} onClick={()=>addTagChip(name)}>
                        <span>{name}</span>
                        <span className="text-xs opacity-60">추가</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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


