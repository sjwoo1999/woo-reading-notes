import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET /api/notes/autocomplete?q=search&limit=10
// Returns autocomplete suggestions for wiki links
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);
    const excludeId = searchParams.get('excludeId');

    // Validate query
    if (query.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    if (query.length < 1) {
      return NextResponse.json({ error: 'Query must be at least 1 character' }, { status: 400 });
    }

    // Search for notes matching the query
    // Priority: prefix match > contains match
    const { data: allNotes, error } = await supabase
      .from('notes')
      .select('id, title, type, content')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    if (!allNotes || allNotes.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Filter and sort results
    const normalizedQuery = query.toLowerCase().trim();

    const prefixMatches = allNotes.filter((note) => {
      if (excludeId && note.id === excludeId) return false;
      return note.title.toLowerCase().startsWith(normalizedQuery);
    });

    const containsMatches = allNotes.filter((note) => {
      if (excludeId && note.id === excludeId) return false;
      if (note.title.toLowerCase().startsWith(normalizedQuery)) return false;
      return note.title.toLowerCase().includes(normalizedQuery);
    });

    const results = [...prefixMatches, ...containsMatches].slice(0, limit);

    // Format response
    const formatted = results.map((note) => ({
      id: note.id,
      title: note.title,
      type: note.type,
      preview: note.content ? note.content.substring(0, 100) : '(빈 노트)',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
