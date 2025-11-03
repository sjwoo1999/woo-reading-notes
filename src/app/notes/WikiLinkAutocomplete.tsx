'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface AutocompleteNote {
  id: string;
  title: string;
  type: 'book' | 'concept' | 'quote';
  preview: string;
}

interface WikiLinkAutocompleteProps {
  isOpen: boolean;
  query: string;
  selectedNoteId?: string;
  onSelect: (note: AutocompleteNote) => void;
  onClose: () => void;
}

const typeEmoji = {
  book: '📚',
  concept: '💡',
  quote: '✨',
};

export default function WikiLinkAutocomplete({
  isOpen,
  query,
  selectedNoteId,
  onSelect,
  onClose,
}: WikiLinkAutocompleteProps) {
  const [results, setResults] = useState<AutocompleteNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<number | null>(null);

  // Fetch autocomplete results
  useEffect(() => {
    if (!isOpen || query.length === 0) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    setLoading(true);

    debounceRef.current = window.setTimeout(async () => {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const accessToken = sess.session?.access_token;

        if (!accessToken) {
          setResults([]);
          setLoading(false);
          return;
        }

        const url = new URL('/api/notes/autocomplete', window.location.origin);
        url.searchParams.set('q', query);
        url.searchParams.set('limit', '10');
        if (selectedNoteId) {
          url.searchParams.set('excludeId', selectedNoteId);
        }

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          setResults([]);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen, selectedNoteId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex]);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  if (!isOpen || results.length === 0) {
    return null;
  }

  return (
    <div className="vintage-card" style={{ padding: '6px', marginTop: '4px' }}>
      <div className="v-stack" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {loading && <div className="text-xs opacity-70">검색 중...</div>}

        {!loading &&
          results.map((note, index) => (
            <button
              key={note.id}
              type="button"
              onClick={() => {
                onSelect(note);
                onClose();
              }}
              onKeyDown={handleKeyDown}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                background: index === selectedIndex ? 'var(--accent)' : 'transparent',
                color: index === selectedIndex ? '#fff' : 'var(--ink)',
                padding: '8px',
                border: 'none',
                borderRadius: '4px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              className="h-stack"
            >
              <div className="v-stack" style={{ flex: 1 }}>
                <div
                  className="h-stack"
                  style={{
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  <span>{typeEmoji[note.type]}</span>
                  <span>{note.title}</span>
                </div>
                <div
                  className="text-xs"
                  style={{
                    opacity: 0.7,
                    display: 'line-clamp',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '300px',
                  }}
                >
                  {note.preview}
                </div>
              </div>
            </button>
          ))}

        {!loading && results.length === 0 && (
          <div className="text-xs opacity-70">일치하는 노트가 없습니다</div>
        )}
      </div>
    </div>
  );
}
