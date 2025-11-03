'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

interface Reminder {
  id: string;
  user_id: string;
  note_id: string;
  scheduled_at: string;
  status: 'pending' | 'completed' | 'dismissed';
  interval_level: number;
  last_reviewed_at: string | null;
  created_at: string;
  notes?: {
    id: string;
    title: string;
    type: string;
    content: string | null;
  };
}

interface RemindersResponse {
  reminders: Reminder[];
  total: number;
  limit: number;
  offset: number;
}

const INTERVAL_LABELS: Record<number, string> = {
  0: '1일 후',
  1: '3일 후',
  2: '7일 후',
  3: '30일 후',
};

export default function ReviewPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch due reminders
  useEffect(() => {
    async function fetchReminders() {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess.session?.access_token;

        if (!accessToken) {
          setError('로그인이 필요합니다');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/reminders?limit=50&status=pending', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '리마인더를 불러올 수 없습니다');
        }

        const data: RemindersResponse = await res.json();
        setReminders(data.reminders);
      } catch (e: any) {
        setError(e.message || '리마인더를 불러오는 중 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    }

    fetchReminders();
  }, []);

  // Mark reminder as reviewed
  const handleReview = async (reminderId: string) => {
    setActionLoading(true);

    try {
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const accessToken = sess.session?.access_token;

      if (!accessToken) {
        setError('로그인이 필요합니다');
        return;
      }

      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '리마인더를 업데이트할 수 없습니다');
      }

      // Remove from list
      setReminders(reminders.filter((r) => r.id !== reminderId));
      setReviewingId(null);
    } catch (e: any) {
      setError(e.message || '리마인더 업데이트 중 오류가 발생했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  // Dismiss reminder
  const handleDismiss = async (reminderId: string) => {
    setActionLoading(true);

    try {
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const accessToken = sess.session?.access_token;

      if (!accessToken) {
        setError('로그인이 필요합니다');
        return;
      }

      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '리마인더를 업데이트할 수 없습니다');
      }

      // Remove from list
      setReminders(reminders.filter((r) => r.id !== reminderId));
      setReviewingId(null);
    } catch (e: any) {
      setError(e.message || '리마인더 업데이트 중 오류가 발생했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="vintage-card p-4" style={{ minHeight: '200px' }}>
          <div className="text-sm opacity-70">리마인더를 불러오는 중…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">오늘의 복습</h1>
        <p className="text-sm opacity-70 mt-1">
          {reminders.length === 0
            ? '복습할 노트가 없습니다'
            : `${reminders.length}개의 노트를 복습해야 합니다`}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="vintage-card p-3" style={{ color: '#b00' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {reminders.length === 0 && !error && (
        <div className="vintage-card p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-lg font-medium">모든 복습을 완료했습니다!</p>
          <p className="text-sm opacity-70 mt-2">새로운 노트를 추가하거나 기존 노트를 복습하세요</p>
          <div className="h-stack" style={{ justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <Link href="/notes/new" className="vintage-button" style={{ textDecoration: 'none' }}>
              새 노트 추가
            </Link>
            <Link href="/notes" className="vintage-button" style={{ textDecoration: 'none' }}>
              노트 목록
            </Link>
          </div>
        </div>
      )}

      {/* Reviewing card */}
      {reviewingId && reminders.find((r) => r.id === reviewingId) && (
        <div
          className="vintage-card p-4 v-stack"
          style={{ gap: 12, background: 'rgba(59, 78, 118, 0.05)' }}
        >
          <div className="text-sm font-medium opacity-70">현재 복습 중</div>
          <div className="h-stack" style={{ alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {reminders.find((r) => r.id === reviewingId)?.notes?.type === 'book'
                ? '📚'
                : reminders.find((r) => r.id === reviewingId)?.notes?.type === 'concept'
                  ? '💡'
                  : '✨'}
            </span>
            <span className="font-medium">
              {reminders.find((r) => r.id === reviewingId)?.notes?.title}
            </span>
          </div>
          <div
            className="vintage-card p-3"
            style={{
              background: '#fff',
              maxHeight: '300px',
              overflowY: 'auto',
              lineHeight: 1.6,
              fontSize: 14,
              color: '#333',
            }}
          >
            {reminders.find((r) => r.id === reviewingId)?.notes?.content || '(내용 없음)'}
          </div>
          <div className="h-stack" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setReviewingId(null)}
              className="vintage-button"
              style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--ink)' }}
              disabled={actionLoading}
            >
              돌아가기
            </button>
            <button
              onClick={() => handleDismiss(reviewingId)}
              className="vintage-button"
              style={{ background: 'rgba(187, 0, 0, 0.2)', color: '#b00' }}
              disabled={actionLoading}
            >
              다시 나중에
            </button>
            <button
              onClick={() => handleReview(reviewingId)}
              className="vintage-button"
              style={{ background: 'var(--accent)', color: '#fff' }}
              disabled={actionLoading}
            >
              {actionLoading ? '처리 중…' : '복습 완료'}
            </button>
          </div>
        </div>
      )}

      {/* Reminders list */}
      {reminders.length > 0 && !reviewingId && (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="vintage-card p-4 v-stack hover:opacity-80 transition-opacity"
              style={{ cursor: 'pointer' }}
            >
              <div
                className="h-stack"
                style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}
              >
                <div className="h-stack" style={{ alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 16 }}>
                    {reminder.notes?.type === 'book'
                      ? '📚'
                      : reminder.notes?.type === 'concept'
                        ? '💡'
                        : '✨'}
                  </span>
                  <div className="v-stack" style={{ flex: 1, gap: 4 }}>
                    <h3 className="font-medium">{reminder.notes?.title || '(제목 없음)'}</h3>
                    <div className="h-stack" style={{ gap: 8, fontSize: 12, opacity: 0.7 }}>
                      <span>
                        복습 단계: {INTERVAL_LABELS[reminder.interval_level] || '알 수 없음'}
                      </span>
                      {reminder.last_reviewed_at && (
                        <span>
                          마지막 복습:{' '}
                          {new Date(reminder.last_reviewed_at).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReviewingId(reminder.id)}
                  className="vintage-button"
                  style={{ background: 'var(--accent)', color: '#fff', whiteSpace: 'nowrap' }}
                >
                  복습하기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {reminders.length > 0 && !reviewingId && (
        <div className="vintage-card p-3 text-sm opacity-70">
          <p>💡 복습 팁: 주기적으로 복습하면 더 잘 기억할 수 있습니다</p>
        </div>
      )}
    </div>
  );
}
