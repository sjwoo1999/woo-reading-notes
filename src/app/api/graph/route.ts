import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface GraphNode {
  id: string;
  label: string;
  type: string;
  data: {
    title: string;
    type: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  };
}

interface GraphEdge {
  source: string;
  target: string;
  relationship_type: string;
}

interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    density: number;
  };
}

// GET /api/graph - Retrieve graph data for visualization
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

    // Get query parameters for filtering
    const url = new URL(req.url);
    const typeFilter = url.searchParams.get('type'); // Filter by note type (book, concept, quote)
    const tagFilter = url.searchParams.get('tag'); // Filter by tag

    // Build query for notes (nodes)
    let notesQuery = supabase
      .from('notes')
      .select('id, title, type, metadata, tags')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Apply type filter if provided
    if (typeFilter) {
      notesQuery = notesQuery.eq('type', typeFilter);
    }

    const { data: notes, error: notesError } = await notesQuery;

    if (notesError) {
      console.error('Database error:', notesError);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Filter by tag if provided (client-side since tags is array)
    let filteredNotes = notes || [];
    if (tagFilter && filteredNotes.length > 0) {
      filteredNotes = filteredNotes.filter((note) => {
        const tags = (note.tags as string[]) || [];
        return tags.includes(tagFilter);
      });
    }

    // Get links (edges) - only for visible nodes
    const noteIds = filteredNotes.map((note) => note.id);

    const { data: allLinks, error: linksError } = await supabase
      .from('links')
      .select('id, source_note_id, target_note_id, relationship_type')
      .eq('user_id', user.id);

    if (linksError) {
      console.error('Database error:', linksError);
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }

    // Filter links to only include those between visible nodes
    const visibleLinks = (allLinks || []).filter(
      (link) => noteIds.includes(link.source_note_id) && noteIds.includes(link.target_note_id)
    );

    // Transform notes to graph nodes
    const nodes: GraphNode[] = filteredNotes.map((note) => ({
      id: note.id,
      label: note.title,
      type: note.type,
      data: {
        title: note.title,
        type: note.type,
        metadata: note.metadata as Record<string, unknown>,
        tags: (note.tags as string[]) || [],
      },
    }));

    // Transform links to graph edges
    const edges: GraphEdge[] = visibleLinks.map((link) => ({
      source: link.source_note_id,
      target: link.target_note_id,
      relationship_type: link.relationship_type,
    }));

    // Calculate graph stats
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    // Density = 2 * edges / (nodes * (nodes - 1))
    // For directed graphs: edges / (nodes * (nodes - 1))
    const density = totalNodes > 1 ? totalEdges / (totalNodes * (totalNodes - 1)) : 0;

    const response: GraphResponse = {
      nodes,
      edges,
      stats: {
        total_nodes: totalNodes,
        total_edges: totalEdges,
        density: Math.round(density * 10000) / 10000, // Round to 4 decimal places
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
