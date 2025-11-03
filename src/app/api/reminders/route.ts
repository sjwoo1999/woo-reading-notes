import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET /api/reminders
// Get due reminders for the authenticated user
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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const status = searchParams.get('status') || 'pending';

    // Get due reminders
    const {
      data: reminders,
      error,
      count,
    } = await supabase
      .from('reminders')
      .select('*, notes(id, title, type, content)', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', status)
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json({
      reminders: reminders || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reminders
// Create a reminder for a note
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
    const { note_id, interval_level } = body;

    // Validate required fields
    if (!note_id) {
      return NextResponse.json({ error: 'Missing required field: note_id' }, { status: 400 });
    }

    // Validate interval_level
    const level = interval_level || 0;
    if (level < 0 || level > 3) {
      return NextResponse.json(
        { error: 'Invalid interval_level. Must be between 0 and 3' },
        { status: 400 }
      );
    }

    // Calculate next scheduled date based on interval level
    // 0 = 1d, 1 = 3d, 2 = 7d, 3 = 30d
    const intervals = [1, 3, 7, 30]; // days
    const daysUntilReview = intervals[level];
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + daysUntilReview);

    // Create reminder
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert([
        {
          user_id: user.id,
          note_id,
          interval_level: level,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
    }

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
