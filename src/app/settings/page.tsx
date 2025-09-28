'use client';

import { useState } from 'react';
import { z } from 'zod';

const ExportSchema = z.object({
  version: z.literal(1),
  exported_at: z.string(),
  books: z.array(z.any()),
  notes: z.array(z.any()),
  tags: z.array(z.any()),
  entities: z.array(z.any()),
  links: z.array(z.any())
});

async function restGet(table: string, select: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const url = `${base}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function restPost(table: string, rows: any[]) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const url = `${base}/rest/v1/${table}`;
  const res = await fetch(url, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function SettingsPage() {
  const [json, setJson] = useState('');
  const [preview, setPreview] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onExport() {
    setMsg(null);
    const [books, notes, tags, entities, links] = await Promise.all([
      restGet('books', 'id,title,author,published_year,rating,progress,updated_at'),
      restGet('notes', 'id,book_id,title,content,updated_at'),
      restGet('tags', 'id,name,updated_at'),
      restGet('entities', 'id,name,type,updated_at'),
      restGet('links', 'id,src_type,src_id,dst_type,dst_id,link_type,weight,updated_at')
    ]);
    const payload = { version: 1 as const, exported_at: new Date().toISOString(), books, notes, tags, entities, links };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup.json';
    a.click();
  }

  async function onImport(file: File) {
    setMsg(null);
    const text = await file.text();
    setJson(text);
    try {
      const data = JSON.parse(text);
      const parsed = ExportSchema.safeParse(data);
      if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid JSON');
      setPreview({
        books: data.books?.slice(0, 3) || [],
        notes: data.notes?.slice(0, 3) || [],
        tags: data.tags?.slice(0, 3) || [],
        entities: data.entities?.slice(0, 3) || [],
        links: data.links?.slice(0, 3) || []
      });
      setMsg('Validated. Preview shown.');
    } catch (e: any) {
      setMsg(`Import error: ${e.message}`);
      setPreview(null);
    }
  }

  async function sampleUpsert() {
    if (!preview) return;
    try {
      await restPost('books', (preview.books || []).slice(0, 5));
      await restPost('notes', (preview.notes || []).slice(0, 5));
      setMsg('Sample upsert completed (books/notes up to 5).');
    } catch (e: any) {
      setMsg(`Upsert error: ${e.message}`);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">설정</h1>
      <div className="vintage-card p-4" style={{display:'flex', gap:'8px'}}>
        <button className="vintage-button" onClick={onExport}>JSON 내보내기</button>
        <input aria-label="JSON 가져오기" type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        <button className="vintage-button" onClick={sampleUpsert} disabled={!preview}>샘플 업서트 5개</button>
      </div>
      {msg ? <div className="vintage-card p-3">{msg}</div> : null}
      {json ? (
        <pre className="vintage-card p-4" style={{maxHeight:'320px', overflow:'auto'}}>{json}</pre>
      ) : null}
      {preview ? (
        <div className="vintage-card p-4">
          <div className="opacity-70 text-sm">미리보기 (각 3개)</div>
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
            <div><strong>Books</strong><pre>{JSON.stringify(preview.books, null, 2)}</pre></div>
            <div><strong>Notes</strong><pre>{JSON.stringify(preview.notes, null, 2)}</pre></div>
            <div><strong>Tags</strong><pre>{JSON.stringify(preview.tags, null, 2)}</pre></div>
            <div><strong>Entities</strong><pre>{JSON.stringify(preview.entities, null, 2)}</pre></div>
            <div style={{gridColumn:'1 / -1'}}><strong>Links</strong><pre>{JSON.stringify(preview.links, null, 2)}</pre></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
