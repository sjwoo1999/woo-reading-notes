import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// PATCH /api/reminders/[id]
// Update reminder status (mark as reviewed, dismissed, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const { status, interval_level } = body;

    // Validate status
    if (status && !['pending', 'completed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, completed, dismissed' },
        { status: 400 }
      );
    }

    // Get current reminder to check ownership
    const { data: currentReminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentReminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    // Calculate next scheduled date if completing
    let nextScheduledAt: string | null = null;
    let nextIntervalLevel: number | null = null;

    if (status === 'completed') {
      // Move to next interval level (0→1, 1→2, 2→3, 3→3)
      nextIntervalLevel = Math.min(3, (currentReminder.interval_level || 0) + 1);
      const intervals = [1, 3, 7, 30]; // days
      const daysUntilNextReview = intervals[nextIntervalLevel];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + daysUntilNextReview);
      nextScheduledAt = scheduledDate.toISOString();
    }

    // Prepare update data
    const updateData: any = {
      status: status || currentReminder.status,
      last_reviewed_at: status === 'completed' ? new Date().toISOString() : currentReminder.last_reviewed_at,
    };

    if (interval_level !== undefined) {
      updateData.interval_level = interval_level;
    }

    // Create new reminder if moving to next interval
    if (status === 'completed' && nextScheduledAt && nextIntervalLevel !== undefined) {
      const { error: createError } = await supabase
        .from('reminders')
        .insert([
          {
            user_id: user.id,
            note_id: currentReminder.note_id,
            interval_level: nextIntervalLevel,
            scheduled_at: nextScheduledAt,
            status: 'pending',
          },
        ]);

      if (createError) {
        console.error('Failed to create next reminder:', createError);
        // Don't fail the update if next reminder creation fails
      }
    }

    // Update the current reminder
    const { data: updatedReminder, error: updateError } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update reminder' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/reminders/[id]
// Delete a reminder
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Delete reminder
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete reminder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
