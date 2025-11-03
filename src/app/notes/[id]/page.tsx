'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

type Note = {
  id: string;
  title: string;
  type: 'book' | 'concept' | 'quote';
  content: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type Link = {
  id: string;
  source_note_id: string;
  target_note_id: string;
  relationship_type: 'relates_to' | 'supports' | 'contradicts' | 'inspired_by';
  created_at: string;
};

type RelatedNote = Note & { relationship_type: string };

const typeEmoji = {
  book: '📚',
  concept: '💡',
  quote: '✨',
};

const relationshipLabel = {
  relates_to: '관련됨',
  supports: '지지함',
  contradicts: '모순됨',
  inspired_by: '영감을 받음',
};

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [backlinks, setBacklinks] = useState<RelatedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchNote() {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess.session?.access_token;

        if (!accessToken) {
          setError('로그인 후 다시 시도하세요.');
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

        // Fetch related notes (outgoing links)
        const linksRes = await fetch(`/api/links?note_id=${noteId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (linksRes.ok) {
          const links: Link[] = await linksRes.json();
          const targetIds = links.map((l) => l.target_note_id);

          if (targetIds.length > 0) {
            const related: RelatedNote[] = [];
            for (const targetId of targetIds) {
              const noteRes = await fetch(`/api/notes/${targetId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (noteRes.ok) {
                const targetNote = await noteRes.json();
                const link = links.find((l) => l.target_note_id === targetId);
                related.push({
                  ...targetNote,
                  relationship_type: link?.relationship_type || 'relates_to',
                });
              }
            }
            setRelatedNotes(related);
          }
        }

        // Fetch backlinks (incoming links)
        const backlinksRes = await fetch(`/api/links?target_id=${noteId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (backlinksRes.ok) {
          const links: Link[] = await backlinksRes.json();
          const sourceIds = links.map((l) => l.source_note_id);

          if (sourceIds.length > 0) {
            const backlinksData: RelatedNote[] = [];
            for (const sourceId of sourceIds) {
              const noteRes = await fetch(`/api/notes/${sourceId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (noteRes.ok) {
                const sourceNote = await noteRes.json();
                const link = links.find((l) => l.source_note_id === sourceId);
                backlinksData.push({
                  ...sourceNote,
                  relationship_type: link?.relationship_type || 'relates_to',
                });
              }
            }
            setBacklinks(backlinksData);
          }
        }
      } catch (e: any) {
        setError(e.message || '노트를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    }

    if (noteId) {
      fetchNote();
    }
  }, [noteId]);

  async function handleDelete() {
    if (!note || !confirm('정말로 이 노트를 삭제하시겠습니까?')) return;

    setDeleting(true);
    try {
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const accessToken = sess.session?.access_token;

      if (!accessToken) {
        setError('로그인 후 다시 시도하세요.');
        return;
      }

      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '삭제 실패');
      }

      window.location.href = '/notes';
    } catch (e: any) {
      setError(e.message || '삭제 중 오류 발생');
      setDeleting(false);
    }
  }

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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="vintage-card p-4 v-stack">
        <div
          className="h-stack"
          style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <div className="v-stack" style={{ flex: 1 }}>
            <div className="text-sm opacity-70">
              {typeEmoji[note.type]}{' '}
              {note.type === 'book' ? '책' : note.type === 'concept' ? '개념' : '인용'}
            </div>
            <h1 className="text-2xl font-medium">{note.title}</h1>
            <div className="text-xs opacity-70">
              {new Date(note.created_at).toLocaleDateString('ko-KR')}
              {note.updated_at !== note.created_at &&
                ` (수정: ${new Date(note.updated_at).toLocaleDateString('ko-KR')})`}
            </div>
          </div>
          <div className="h-stack" style={{ gap: 8 }}>
            <Link
              href={`/notes/${note.id}/edit`}
              className="vintage-button"
              style={{ textDecoration: 'none' }}
            >
              수정
            </Link>
            <button
              className="vintage-button--danger"
              onClick={handleDelete}
              disabled={deleting}
              style={{ cursor: deleting ? 'not-allowed' : 'pointer' }}
            >
              {deleting ? '삭제 중…' : '삭제'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {note.content && (
        <div className="vintage-card p-4 v-stack">
          <div className="text-sm opacity-70 font-medium">내용</div>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.6',
            }}
          >
            {note.content}
          </div>
        </div>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="vintage-card p-4 v-stack">
          <div className="text-sm opacity-70 font-medium">태그</div>
          <div className="h-stack" style={{ gap: 8, flexWrap: 'wrap' }}>
            {note.tags.map((tag) => (
              <Link
                key={tag}
                href={`/notes?tag=${encodeURIComponent(tag)}`}
                className="vintage-card"
                style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Notes (Outgoing Links) */}
      {relatedNotes.length > 0 && (
        <div className="vintage-card p-4 v-stack">
          <div className="text-sm opacity-70 font-medium">관련 노트</div>
          <div className="v-stack" style={{ gap: 8 }}>
            {relatedNotes.map((related) => (
              <div
                key={related.id}
                className="h-stack"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <Link
                    href={`/notes/${related.id}`}
                    className="vintage-link"
                    style={{ textDecoration: 'none', fontWeight: 500 }}
                  >
                    {typeEmoji[related.type]} {related.title}
                  </Link>
                  <div className="text-xs opacity-70">
                    {relationshipLabel[related.relationship_type as keyof typeof relationshipLabel]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backlinks (Incoming Links) */}
      {backlinks.length > 0 && (
        <div className="vintage-card p-4 v-stack">
          <div className="text-sm opacity-70 font-medium">역링크</div>
          <div className="v-stack" style={{ gap: 8 }}>
            {backlinks.map((backlink) => (
              <div
                key={backlink.id}
                className="h-stack"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <Link
                    href={`/notes/${backlink.id}`}
                    className="vintage-link"
                    style={{ textDecoration: 'none', fontWeight: 500 }}
                  >
                    {typeEmoji[backlink.type]} {backlink.title}
                  </Link>
                  <div className="text-xs opacity-70">
                    {
                      relationshipLabel[
                        backlink.relationship_type as keyof typeof relationshipLabel
                      ]
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Links */}
      {relatedNotes.length === 0 && backlinks.length === 0 && (
        <div className="vintage-card p-4">
          <div className="text-sm opacity-70 text-center">아직 연결된 노트가 없습니다</div>
        </div>
      )}
    </div>
  );
}
