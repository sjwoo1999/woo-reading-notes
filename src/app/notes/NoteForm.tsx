'use client';

import { useRef, useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { z } from 'zod';

type NoteType = 'book' | 'concept' | 'quote';

type NoteFormInput = {
  title: string;
  type: NoteType;
  content: string;
  tags: string[];
  metadata?: Record<string, unknown>;
};

const NoteSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  type: z.enum(['book', 'concept', 'quote'] as const),
  content: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});

type NoteFormProps = {
  onSuccess?: (noteId: string) => void;
  initialData?: Partial<NoteFormInput>;
};

export default function NoteForm({ onSuccess, initialData }: NoteFormProps) {
  // Form state
  const [form, setForm] = useState<NoteFormInput>({
    title: initialData?.title ?? '',
    type: initialData?.type ?? 'concept',
    content: initialData?.content ?? '',
    tags: initialData?.tags ?? [],
    metadata: initialData?.metadata ?? {},
  });

  // UI state
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagSuggestOpen, setTagSuggestOpen] = useState(false);
  const tagDebounceRef = useRef<number | null>(null);

  // Fetch tag suggestions
  useEffect(() => {
    const q = tagInput.trim();
    if (tagDebounceRef.current) window.clearTimeout(tagDebounceRef.current);
    if (!q) {
      setTagSuggestions([]);
      return;
    }
    tagDebounceRef.current = window.setTimeout(async () => {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess.session?.access_token;
        if (!accessToken) {
          setTagSuggestions([]);
          return;
        }

        const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
        const url = new URL(`${base}/rest/v1/tags`);
        url.searchParams.set('select', 'name');
        url.searchParams.set('name', `ilike.*${q}*`);
        url.searchParams.set('limit', '10');

        const resp = await fetch(url.toString(), {
          headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!resp.ok) {
          setTagSuggestions([]);
          return;
        }

        const rows = await resp.json();
        const list: string[] = Array.isArray(rows)
          ? rows.map((r: any) => String(r.name)).filter(Boolean)
          : [];

        // Exclude already chosen tags
        const chosen = new Set(form.tags);
        setTagSuggestions(list.filter((n) => !chosen.has(n)));
      } catch {
        setTagSuggestions([]);
      }
    }, 300);

    return () => {
      if (tagDebounceRef.current) window.clearTimeout(tagDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagInput]);

  function addTagChip(name: string) {
    const norm = name.trim();
    if (!norm) return;
    if (!form.tags.includes(norm)) {
      setForm({ ...form, tags: [...form.tags, norm] });
      setTagInput('');
      setTagSuggestions([]);
      setTagSuggestOpen(false);
    } else {
      setTagInput('');
      setTagSuggestOpen(false);
    }
  }

  function removeTag(name: string) {
    setForm({ ...form, tags: form.tags.filter((t) => t !== name) });
  }

  function removeLastTag() {
    if (form.tags.length === 0) return;
    const arr = [...form.tags];
    arr.pop();
    setForm({ ...form, tags: arr });
  }

  async function submit() {
    setSubmitMsg(null);
    const parsed = NoteSchema.safeParse(form);
    if (!parsed.success) {
      setSubmitMsg(parsed.error.issues?.[0]?.message || '입력 오류');
      return;
    }

    setSubmitting(true);
    try {
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        setSubmitMsg('로그인 후 다시 시도하세요.');
        return;
      }

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          content: form.content || null,
          tags: form.tags.length > 0 ? form.tags : null,
          metadata: Object.keys(form.metadata || {}).length > 0 ? form.metadata : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '노트 생성 실패');
      }

      const created = await res.json();
      setSubmitMsg('✓ 노트가 생성되었습니다');

      // Reset form
      setForm({
        title: '',
        type: 'concept',
        content: '',
        tags: [],
        metadata: {},
      });

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess(created.id);
      } else {
        window.location.href = `/notes/${created.id}`;
      }
    } catch (e: any) {
      setSubmitMsg(e.message || '노트 생성 중 오류 발생');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="vintage-card p-4 v-stack">
        <h2 className="text-xl font-medium">새 노트</h2>
      </div>

      <div className="vintage-card p-4 v-stack">
        {/* Title */}
        <label className="v-stack">
          <span className="text-sm font-medium">제목 *</span>
          <input
            className="vintage-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="노트의 제목을 입력하세요"
            required
          />
        </label>

        {/* Type Selection */}
        <label className="v-stack">
          <span className="text-sm font-medium">유형</span>
          <div className="h-stack" style={{ gap: 8 }}>
            {(['book', 'concept', 'quote'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className="vintage-button"
                style={{
                  flex: 1,
                  background: form.type === t ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                  color: form.type === t ? '#fff' : 'var(--ink)',
                  border: form.type === t ? '1px solid var(--accent)' : '1px solid var(--line)',
                }}
              >
                {t === 'book' && '📚 책'}
                {t === 'concept' && '💡 개념'}
                {t === 'quote' && '✨ 인용'}
              </button>
            ))}
          </div>
        </label>

        {/* Content */}
        <label className="v-stack">
          <span className="text-sm font-medium">내용</span>
          <textarea
            className="vintage-input"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="노트의 내용을 작성하세요. 위키링크 [[노트명]] 형식으로 다른 노트를 링크할 수 있습니다."
            style={{ minHeight: '150px', fontFamily: 'inherit' }}
          />
        </label>

        {/* Tags */}
        <label className="v-stack">
          <span className="text-sm font-medium">태그</span>
          <div
            className="vintage-input"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
          >
            {form.tags.map((t) => (
              <span
                key={t}
                className="vintage-card"
                style={{
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    padding: 0,
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setTagSuggestOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTagChip(tagInput);
                } else if (e.key === 'Backspace' && tagInput === '') {
                  e.preventDefault();
                  removeLastTag();
                }
              }}
              placeholder="태그 입력 후 Enter"
              style={{
                flex: 1,
                minWidth: 120,
                border: 'none',
                outline: 'none',
                background: 'transparent',
              }}
            />
          </div>
          {tagSuggestOpen && tagSuggestions.length > 0 ? (
            <div className="vintage-card" style={{ padding: 6 }}>
              <div className="v-stack">
                {tagSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="h-stack"
                    onClick={() => addTagChip(name)}
                    style={{
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      color: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <span>{name}</span>
                    <span className="text-xs opacity-60">추가</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </label>

        {/* Buttons */}
        <div className="h-stack" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            className="vintage-button"
            onClick={() => window.history.back()}
            disabled={submitting}
            style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--ink)' }}
          >
            취소
          </button>
          <button className="vintage-button" onClick={submit} disabled={submitting}>
            {submitting ? '생성 중…' : '생성'}
          </button>
        </div>

        {/* Message */}
        {submitMsg ? (
          <div
            className="text-sm"
            style={{
              color: submitMsg.startsWith('✓') ? '#2a7e2a' : '#b00',
              padding: '8px 12px',
              borderRadius: 8,
              background: submitMsg.startsWith('✓')
                ? 'rgba(42, 126, 42, 0.1)'
                : 'rgba(187, 0, 0, 0.1)',
            }}
          >
            {submitMsg}
          </div>
        ) : null}
      </div>
    </div>
  );
}
