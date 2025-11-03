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
  created_at: string;
  updated_at: string;
};

const typeEmoji = {
  book: '📚',
  concept: '💡',
  quote: '✨',
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    async function fetchNotes() {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess.session?.access_token;

        if (!accessToken) {
          setError('로그인 후 다시 시도하세요.');
          return;
        }

        const res = await fetch('/api/notes', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '노트를 불러올 수 없습니다');
        }

        const data = await res.json();
        const notesList: Note[] = data.notes || [];
        setNotes(notesList);

        // Extract unique tags
        const tags = new Set<string>();
        notesList.forEach((note) => {
          if (note.tags) {
            note.tags.forEach((tag) => tags.add(tag));
          }
        });
        setAllTags(Array.from(tags).sort());
      } catch (e: any) {
        setError(e.message || '노트를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, []);

  const filteredNotes = selectedTag
    ? notes.filter((note) => note.tags?.includes(selectedTag))
    : notes;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="vintage-card p-4">
          <div className="text-sm opacity-70">노트를 불러오는 중…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-xl font-semibold">노트</h1>
        <Link href="/notes/new" className="vintage-button" style={{ textDecoration: 'none' }}>
          + 새 노트
        </Link>
      </div>

      {error && (
        <div className="vintage-card p-4" style={{ color: '#b00' }}>
          {error}
        </div>
      )}

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="vintage-card p-4 v-stack">
          <div className="text-sm opacity-70 font-medium">태그</div>
          <div className="h-stack" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedTag(null)}
              className={`vintage-card`}
              style={{
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 12,
                cursor: 'pointer',
                background: !selectedTag ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                color: !selectedTag ? '#fff' : 'var(--ink)',
                border: !selectedTag ? '1px solid var(--accent)' : '1px solid var(--line)',
              }}
            >
              전체
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`vintage-card`}
                style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  cursor: 'pointer',
                  background: selectedTag === tag ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                  color: selectedTag === tag ? '#fff' : 'var(--ink)',
                  border: selectedTag === tag ? '1px solid var(--accent)' : '1px solid var(--line)',
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="vintage-card p-4">
          <div className="text-sm opacity-70 text-center">
            {selectedTag
              ? '선택한 태그의 노트가 없습니다'
              : '아직 노트가 없습니다. "새 노트" 버튼을 클릭해 시작하세요.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="vintage-card p-4 h-stack"
              style={{ justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
            >
              <div className="v-stack" style={{ flex: 1 }}>
                <div className="h-stack" style={{ gap: 8 }}>
                  <span>{typeEmoji[note.type]}</span>
                  <div className="font-medium">{note.title}</div>
                </div>
                <div className="text-xs opacity-70">
                  {new Date(note.created_at).toLocaleDateString('ko-KR')}
                  {note.tags && note.tags.length > 0 && ` · ${note.tags.join(', ')}`}
                </div>
              </div>
              <div className="text-xs opacity-70">
                {note.content ? `${note.content.slice(0, 50)}…` : '(빈 노트)'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
