import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/links - Retrieve all links for user
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

    // Get all links for user
    const { data: links, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }

    return NextResponse.json(links);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/links - Create new link
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { source_note_id, target_note_id, relationship_type } = body;

    // Validate required fields
    if (!source_note_id || !target_note_id || !relationship_type) {
      return NextResponse.json(
        { error: 'Missing required fields: source_note_id, target_note_id, relationship_type' },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!uuidRegex.test(source_note_id) || !uuidRegex.test(target_note_id)) {
      return NextResponse.json({ error: 'Invalid note ID format' }, { status: 400 });
    }

    // Validate relationship_type
    const validTypes = ['relates_to', 'supports', 'contradicts', 'inspired_by'];
    if (!validTypes.includes(relationship_type)) {
      return NextResponse.json(
        { error: `Invalid relationship_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent self-links
    if (source_note_id === target_note_id) {
      return NextResponse.json({ error: 'Cannot create self-referential links' }, { status: 400 });
    }

    // Verify both notes belong to the user
    const { data: sourceNote, error: sourceError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', source_note_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (sourceError || !sourceNote) {
      return NextResponse.json({ error: 'Source note not found' }, { status: 404 });
    }

    const { data: targetNote, error: targetError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', target_note_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (targetError || !targetNote) {
      return NextResponse.json({ error: 'Target note not found' }, { status: 404 });
    }

    // Create link
    const { data: link, error } = await supabase
      .from('links')
      .insert({
        source_note_id,
        target_note_id,
        relationship_type,
        user_id: user.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Link between these notes already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
