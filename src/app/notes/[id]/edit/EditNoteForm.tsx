'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

type Note = {
  id: string;
  title: string;
  type: 'book' | 'concept' | 'quote';
  content: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
};

interface EditNoteFormProps {
  noteId: string;
}

export default function EditNoteForm({ noteId }: EditNoteFormProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNote() {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess.session?.access_token;

        if (!accessToken) {
          setError('로그인 후 다시 시도하세요.');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/notes/${noteId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '노트를 불러올 수 없습니다');
        }

        const noteData = await res.json();
        setNote(noteData);
      } catch (e: any) {
        setError(e.message || '노트를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    }

    fetchNote();
  }, [noteId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="vintage-card p-4" style={{ minHeight: '200px' }}>
          <div className="text-sm opacity-70">노트를 불러오는 중…</div>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="space-y-4">
        <div className="vintage-card p-4" style={{ color: '#b00' }}>
          {error || '노트를 찾을 수 없습니다'}
        </div>
        <Link
          href="/notes"
          className="vintage-button"
          style={{ display: 'inline-block', textDecoration: 'none' }}
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="vintage-card p-4 v-stack">
        <h1 className="text-2xl font-medium">노트 수정</h1>
        <div className="text-sm opacity-70">{note.title}</div>
      </div>

      <NoteFormEdit noteId={noteId} initialData={note} />
    </div>
  );
}

// Edit form component that handles update requests
function NoteFormEdit({ noteId, initialData }: { noteId: string; initialData: Note }) {
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: initialData.title,
    type: initialData.type,
    content: initialData.content || '',
    tags: initialData.tags || [],
    metadata: initialData.metadata || {},
  });

  const [titleInput, setTitleInput] = useState(form.title);
  const [contentInput, setContentInput] = useState(form.content);
  const [tagInput, setTagInput] = useState('');

  async function handleSubmit() {
    setSubmitMsg(null);

    if (!titleInput.trim()) {
      setSubmitMsg('제목은 필수입니다');
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

      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: titleInput,
          type: form.type,
          content: contentInput || null,
          tags: form.tags.length > 0 ? form.tags : null,
          metadata: Object.keys(form.metadata || {}).length > 0 ? form.metadata : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '노트 업데이트 실패');
      }

      setSubmitMsg('✓ 노트가 업데이트되었습니다');

      // Redirect to note detail page after 1 second
      setTimeout(() => {
        window.location.href = `/notes/${noteId}`;
      }, 1000);
    } catch (e: any) {
      setSubmitMsg(e.message || '노트 업데이트 중 오류 발생');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="vintage-card p-4 v-stack">
        <label className="v-stack">
          <span className="text-sm font-medium">제목 *</span>
          <input
            className="vintage-input"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="노트의 제목을 입력하세요"
          />
        </label>

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

        <label className="v-stack">
          <span className="text-sm font-medium">내용</span>
          <textarea
            className="vintage-input"
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            placeholder="노트의 내용을 작성하세요"
            style={{ minHeight: '150px', fontFamily: 'inherit' }}
          />
        </label>

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
                  onClick={() => setForm({ ...form, tags: form.tags.filter((tag) => tag !== t) })}
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
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const tag = tagInput.trim();
                  if (tag && !form.tags.includes(tag)) {
                    setForm({ ...form, tags: [...form.tags, tag] });
                    setTagInput('');
                  }
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
        </label>

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
          <button className="vintage-button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '저장 중…' : '저장'}
          </button>
        </div>

        {submitMsg && (
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
        )}
      </div>
    </div>
  );
}
