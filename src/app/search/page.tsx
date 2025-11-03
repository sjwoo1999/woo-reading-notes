'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

interface SearchResult {
  id: string;
  title: string;
  type: 'book' | 'concept' | 'quote';
  content: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  preview: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'created' | 'updated'>('relevance');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Fetch available tags on mount
  useEffect(() => {
    async function fetchTags() {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess.session?.access_token;

        if (!accessToken) return;

        const { data: notes } = await sb
          .from('notes')
          .select('tags')
          .eq('user_id', (await sb.auth.getUser()).data.user?.id)
          .is('deleted_at', null);

        if (notes) {
          const allNoteTags = new Set<string>();
          notes.forEach((note) => {
            if (note.tags) {
              note.tags.forEach((tag: string) => allNoteTags.add(tag));
            }
          });
          setAllTags(Array.from(allNoteTags).sort());
        }
      } catch (e) {
        console.error('Failed to fetch tags:', e);
      }
    }

    fetchTags();
  }, []);

  // Perform search
  const performSearch = async (searchPage: number = 1) => {
    if (!query.trim()) {
      setError('검색어를 입력하세요');
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const accessToken = sess.session?.access_token;

      if (!accessToken) {
        setError('로그인이 필요합니다');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('q', query);
      if (typeFilter) params.append('type', typeFilter);
      selectedTags.forEach((tag) => params.append('tag', tag));
      params.append('sort', sortBy);
      params.append('page', String(searchPage));
      params.append('per_page', String(perPage));
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await fetch(`/api/notes/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '검색 실패');
      }

      const data: SearchResponse = await res.json();
      setResults(data);
      setPage(searchPage);
    } catch (e: any) {
      setError(e.message || '검색 중 오류가 발생했습니다');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(1);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">노트 검색</h1>
        <p className="text-sm opacity-70 mt-1">노트를 검색하고 필터링할 수 있습니다</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Search input */}
        <div className="vintage-card p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="vintage-input w-full"
            autoFocus
          />
        </div>

        {/* Filters */}
        <div className="vintage-card p-4 v-stack" style={{ gap: 12 }}>
          <div className="text-sm font-medium">필터</div>

          {/* Type filter */}
          <div className="v-stack" style={{ gap: 6 }}>
            <span className="text-sm">노트 유형</span>
            <div className="h-stack" style={{ gap: 8 }}>
              {(['book', 'concept', 'quote'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                  className="vintage-button"
                  style={{
                    flex: 1,
                    background: typeFilter === type ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                    color: typeFilter === type ? '#fff' : 'var(--ink)',
                    border:
                      typeFilter === type ? '1px solid var(--accent)' : '1px solid var(--line)',
                  }}
                >
                  {type === 'book' && '📚 책'}
                  {type === 'concept' && '💡 개념'}
                  {type === 'quote' && '✨ 인용'}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filter */}
          <div className="v-stack" style={{ gap: 6 }}>
            <span className="text-sm">태그</span>
            <div
              className="vintage-input"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
            >
              {selectedTags.map((tag) => (
                <span
                  key={tag}
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
                  {tag}
                  <button
                    type="button"
                    onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
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
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="태그 선택"
                list="tags"
                style={{
                  flex: 1,
                  minWidth: 100,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                }}
              />
              <datalist id="tags">
                {allTags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </div>
            {allTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (!selectedTags.includes(tag)) {
                        setSelectedTags([...selectedTags, tag]);
                      }
                      setTagInput('');
                    }}
                    className="text-sm"
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: selectedTags.includes(tag)
                        ? 'var(--accent)'
                        : 'rgba(59, 78, 118, 0.1)',
                      color: selectedTags.includes(tag) ? '#fff' : 'var(--ink)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date filter */}
          <div className="h-stack" style={{ gap: 12 }}>
            <div className="v-stack" style={{ gap: 6, flex: 1 }}>
              <span className="text-sm">시작 날짜</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="vintage-input"
                style={{ width: '100%' }}
              />
            </div>
            <div className="v-stack" style={{ gap: 6, flex: 1 }}>
              <span className="text-sm">종료 날짜</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="vintage-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Sort */}
          <div className="v-stack" style={{ gap: 6 }}>
            <span className="text-sm">정렬</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'created' | 'updated')}
              className="vintage-input"
              style={{ width: '100%' }}
            >
              <option value="relevance">관련성</option>
              <option value="updated">최근 수정순</option>
              <option value="created">최근 생성순</option>
            </select>
          </div>

          {/* Search button */}
          <button
            type="submit"
            className="vintage-button"
            style={{ width: '100%', background: 'var(--accent)', color: '#fff' }}
            disabled={loading}
          >
            {loading ? '검색 중…' : '검색'}
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && (
        <div className="vintage-card p-3" style={{ color: '#b00' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Results info */}
          <div className="vintage-card p-3" style={{ background: 'rgba(59, 78, 118, 0.05)' }}>
            <div className="text-sm">
              총 <strong>{results.total}</strong>개 결과
              {results.total > 0 && (
                <>
                  {' '}
                  · 페이지 <strong>{results.page}</strong> / <strong>{results.total_pages}</strong>
                </>
              )}
            </div>
          </div>

          {/* Results list */}
          {results.results.length > 0 ? (
            <div className="space-y-3">
              {results.results.map((result) => (
                <Link
                  key={result.id}
                  href={`/notes/${result.id}`}
                  className="vintage-card p-4 v-stack hover:opacity-80 transition-opacity"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="h-stack" style={{ alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>
                      {result.type === 'book' && '📚'}
                      {result.type === 'concept' && '💡'}
                      {result.type === 'quote' && '✨'}
                    </span>
                    <div className="v-stack" style={{ flex: 1, gap: 4 }}>
                      <h3 className="font-medium">{result.title}</h3>
                      <p className="text-sm opacity-70" style={{ lineHeight: 1.4 }}>
                        {result.preview}
                      </p>
                      <div className="h-stack" style={{ gap: 8, flexWrap: 'wrap' }}>
                        {result.tags &&
                          result.tags.length > 0 &&
                          result.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs"
                              style={{
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(59, 78, 118, 0.1)',
                                color: 'var(--ink)',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        <span className="text-xs opacity-50">{formatDate(result.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="vintage-card p-4 text-center text-sm opacity-70">
              검색 결과가 없습니다
            </div>
          )}

          {/* Pagination */}
          {results.total_pages > 1 && (
            <div
              className="vintage-card p-3 h-stack"
              style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}
            >
              <button
                onClick={() => performSearch(1)}
                disabled={page === 1 || loading}
                className="vintage-button"
                style={{ opacity: page === 1 ? 0.5 : 1 }}
              >
                처음
              </button>
              <button
                onClick={() => performSearch(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
                className="vintage-button"
                style={{ opacity: page === 1 ? 0.5 : 1 }}
              >
                이전
              </button>

              {Array.from({ length: Math.min(5, results.total_pages) }, (_, i) => {
                const pageNum = results.total_pages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                if (pageNum > results.total_pages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => performSearch(pageNum)}
                    className="vintage-button"
                    style={{
                      background: pageNum === page ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                      color: pageNum === page ? '#fff' : 'var(--ink)',
                      minWidth: 32,
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => performSearch(Math.min(results.total_pages, page + 1))}
                disabled={page === results.total_pages || loading}
                className="vintage-button"
                style={{ opacity: page === results.total_pages ? 0.5 : 1 }}
              >
                다음
              </button>
              <button
                onClick={() => performSearch(results.total_pages)}
                disabled={page === results.total_pages || loading}
                className="vintage-button"
                style={{ opacity: page === results.total_pages ? 0.5 : 1 }}
              >
                마지막
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
