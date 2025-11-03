import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface SearchResult {
  id: string;
  title: string;
  type: 'book' | 'concept' | 'quote';
  content: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  preview: string;
  relevance_score?: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// GET /api/notes/search
// Query params:
//   q: search query (required)
//   type: filter by note type (book|concept|quote, optional)
//   tag: filter by tag (optional, can be repeated)
//   sort: sort order (relevance|created|updated, default: relevance)
//   page: page number (default: 1)
//   per_page: results per page (default: 10, max: 100)
//   from_date: filter notes created after this date (ISO format, optional)
//   to_date: filter notes created before this date (ISO format, optional)
export async function GET(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const typeFilter = searchParams.get('type');
    const tags = searchParams.getAll('tag');
    const sortBy = searchParams.get('sort') || 'relevance';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '10', 10)));
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Validate query
    if (query.length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    if (query.length < 1) {
      return NextResponse.json({ error: 'Query must be at least 1 character' }, { status: 400 });
    }

    // Validate sort parameter
    if (!['relevance', 'created', 'updated'].includes(sortBy)) {
      return NextResponse.json(
        { error: 'Invalid sort parameter. Must be one of: relevance, created, updated' },
        { status: 400 }
      );
    }

    // Build base query
    let baseQuery = supabase
      .from('notes')
      .select('id, title, type, content, tags, created_at, updated_at', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Apply type filter
    if (typeFilter && ['book', 'concept', 'quote'].includes(typeFilter)) {
      baseQuery = baseQuery.eq('type', typeFilter);
    }

    // Apply date filters
    if (fromDate) {
      baseQuery = baseQuery.gte('created_at', fromDate);
    }
    if (toDate) {
      baseQuery = baseQuery.lte('created_at', toDate);
    }

    // Fetch all matching notes (we'll filter tags and search text in-memory)
    const { data: allNotes, error } = await baseQuery.order('updated_at', {
      ascending: false,
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    if (!allNotes || allNotes.length === 0) {
      return NextResponse.json<SearchResponse>({
        results: [],
        total: 0,
        page,
        per_page: perPage,
        total_pages: 0,
      });
    }

    // Filter by search query and tags
    const normalizedQuery = query.toLowerCase().trim();

    const filteredNotes = allNotes.filter((note) => {
      // Search in title and content
      const titleMatch = note.title.toLowerCase().includes(normalizedQuery);
      const contentMatch = note.content?.toLowerCase().includes(normalizedQuery) ?? false;
      const textMatch = titleMatch || contentMatch;

      if (!textMatch) return false;

      // Filter by tags if provided
      if (tags.length > 0) {
        const noteTags = (note.tags || []) as string[];
        const hasAllTags = tags.every((tag) =>
          noteTags.some((t) => t.toLowerCase() === tag.toLowerCase())
        );
        if (!hasAllTags) return false;
      }

      return true;
    });

    // Calculate relevance score for sorting
    const withScores: ((typeof filteredNotes)[0] & { relevance_score: number })[] =
      filteredNotes.map((note) => {
        let score = 0;

        // Exact title match
        if (note.title.toLowerCase() === normalizedQuery) {
          score += 1000;
        }

        // Title starts with query
        if (note.title.toLowerCase().startsWith(normalizedQuery)) {
          score += 500;
        }

        // Query in title
        if (note.title.toLowerCase().includes(normalizedQuery)) {
          score += 100;
        }

        // Query in content
        if (note.content?.toLowerCase().includes(normalizedQuery)) {
          score += 10;
        }

        // Boost by type (concept is knowledge, higher value)
        if (note.type === 'concept') score *= 1.2;
        if (note.type === 'book') score *= 1.1;

        // Recency boost (newer notes score higher)
        const daysOld = (Date.now() - new Date(note.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 50 - daysOld * 0.5);

        return { ...note, relevance_score: score };
      });

    // Sort results
    const sortedNotes = [...withScores];
    if (sortBy === 'relevance') {
      sortedNotes.sort((a, b) => b.relevance_score - a.relevance_score);
    } else if (sortBy === 'created') {
      sortedNotes.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === 'updated') {
      sortedNotes.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    // Calculate pagination
    const totalResults = sortedNotes.length;
    const totalPages = Math.ceil(totalResults / perPage);
    const offset = (page - 1) * perPage;
    const paginatedNotes = sortedNotes.slice(offset, offset + perPage);

    // Format response
    const results: SearchResult[] = paginatedNotes.map((note) => ({
      id: note.id,
      title: note.title,
      type: note.type,
      content: note.content,
      tags: note.tags,
      created_at: note.created_at,
      updated_at: note.updated_at,
      preview: note.content ? note.content.substring(0, 150) : '(빈 노트)',
      relevance_score: sortBy === 'relevance' ? note.relevance_score : undefined,
    }));

    // Remove undefined relevance_score if not sorting by relevance
    if (sortBy !== 'relevance') {
      results.forEach((r) => delete r.relevance_score);
    }

    const response: SearchResponse = {
      results,
      total: totalResults,
      page,
      per_page: perPage,
      total_pages: totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
