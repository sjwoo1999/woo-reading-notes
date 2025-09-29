import { NextRequest } from 'next/server';
import { restHeadersWithSession, restUrl } from '@/lib/supabase-rest';
import { supabaseServer } from '@/lib/supabase/server';

type EdgeKind = 'tags' | 'entities' | 'direct' | 'mix';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const includeTags = sp.get('tags') !== 'false';
  const includeEntities = sp.get('entities') !== 'false';
  const includeDirect = sp.get('direct') !== 'false';
  const alpha = Number(sp.get('alpha') ?? '1');
  const beta = Number(sp.get('beta') ?? '1');
  const gamma = Number(sp.get('gamma') ?? '2');
  const minWeight = Number(sp.get('minWeight') ?? '1');

  const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  console.log('[graph] session', !!session, session?.user?.id);
  console.log('[graph] params', { includeTags, includeEntities, includeDirect, alpha, beta, gamma, minWeight });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const headers = restHeadersWithSession(session.access_token);

  const edges = new Map<string, { a: string; b: string; wtTags: number; wtEntities: number; wtDirect: number }>();
  function pushEdge(a: string, b: string, kind: EdgeKind, inc = 1) {
    if (a === b) return;
    const [s, t] = a < b ? [a, b] : [b, a];
    const key = `${s}:${t}`;
    const cur = edges.get(key) || { a: s, b: t, wtTags: 0, wtEntities: 0, wtDirect: 0 };
    if (kind === 'tags') cur.wtTags += inc;
    else if (kind === 'entities') cur.wtEntities += inc;
    else if (kind === 'direct') cur.wtDirect += inc;
    edges.set(key, cur);
  }

  // Shared tags
  if (includeTags) {
    const bt = await fetch(restUrl('book_tags', { select: 'book_id,tag_id', limit: '2000' }), { headers, cache: 'no-store' });
    console.log('[graph] fetch book_tags', bt.status);
    if (!bt.ok) return Response.json({ error: await bt.text() }, { status: bt.status });
    const rows: { book_id: string; tag_id: string }[] = await bt.json();
    const tagToBooks = new Map<string, string[]>();
    for (const r of rows) {
      const arr = tagToBooks.get(r.tag_id) || [];
      arr.push(r.book_id);
      tagToBooks.set(r.tag_id, arr);
    }
    for (const arr of tagToBooks.values()) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) pushEdge(arr[i], arr[j], 'tags', 1);
      }
    }
  }

  // Shared entities via links (book -> entity)
  if (includeEntities) {
    const le = await fetch(restUrl('links', { select: 'src_type,src_id,dst_type,dst_id', limit: '5000' }), { headers, cache: 'no-store' });
    console.log('[graph] fetch links(entities)', le.status);
    if (!le.ok) return Response.json({ error: await le.text() }, { status: le.status });
    const rows: { src_type: string; src_id: string; dst_type: string; dst_id: string }[] = await le.json();
    const entityToBooks = new Map<string, string[]>();
    for (const r of rows) {
      if (r.src_type === 'book' && r.dst_type === 'entity') {
        const arr = entityToBooks.get(r.dst_id) || [];
        arr.push(r.src_id);
        entityToBooks.set(r.dst_id, arr);
      }
    }
    for (const arr of entityToBooks.values()) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) pushEdge(arr[i], arr[j], 'entities', 1);
      }
    }
  }

  // Direct links book<->book
  if (includeDirect) {
    const dl = await fetch(restUrl('links', { select: 'src_type,src_id,dst_type,dst_id', limit: '5000' }), { headers, cache: 'no-store' });
    console.log('[graph] fetch links(direct)', dl.status);
    if (!dl.ok) return Response.json({ error: await dl.text() }, { status: dl.status });
    const rows: { src_type: string; src_id: string; dst_type: string; dst_id: string }[] = await dl.json();
    for (const r of rows) {
      if (r.src_type === 'book' && r.dst_type === 'book') pushEdge(r.src_id, r.dst_id, 'direct', 1);
    }
  }

  // Compute final weights and build node set
  const nodeIds = new Set<string>();
  const edgeList = [] as { data: { id: string; source: string; target: string; weight: number; kind: EdgeKind } }[];
  for (const [key, e] of edges.entries()) {
    const weight = e.wtTags * alpha + e.wtEntities * beta + e.wtDirect * gamma;
    if (weight >= minWeight) {
      nodeIds.add(e.a); nodeIds.add(e.b);
      const kind: EdgeKind = e.wtDirect > 0 ? 'direct' : (e.wtEntities > 0 ? 'entities' : 'tags');
      edgeList.push({ data: { id: key, source: e.a, target: e.b, weight, kind } });
    }
  }

  // Fetch book labels
  const ids = Array.from(nodeIds);
  const nodes = [] as { data: { id: string; label: string; type: 'book'; rating?: number | null; cover?: string | null } }[];
  if (ids.length > 0) {
    const url = restUrl('books', { select: 'id,title,rating,thumbnail_url', id: `in.(${ids.join(',')})` });
    const r = await fetch(url, { headers, cache: 'no-store' });
    console.log('[graph] fetch books(labels)', r.status, url);
    if (!r.ok) return Response.json({ error: await r.text() }, { status: r.status });
    const rows: { id: string; title: string; rating?: number | null; thumbnail_url?: string | null }[] = await r.json();
    for (const b of rows) nodes.push({ data: { id: b.id, label: b.title, type: 'book', rating: b.rating ?? null, cover: b.thumbnail_url ?? null } });
  }

  // If too few nodes, add recent books as isolated nodes to avoid empty screen
  if (nodes.length < 5) {
    const recentUrl = restUrl('books', { select: 'id,title,rating,thumbnail_url', order: 'updated_at.desc', limit: '50' });
    const rr = await fetch(recentUrl, { headers, cache: 'no-store' });
    console.log('[graph] fetch books(recent)', rr.status, recentUrl);
    if (rr.ok) {
      const rows: { id: string; title: string; rating?: number | null; thumbnail_url?: string | null }[] = await rr.json();
      const existing = new Set(nodes.map(n => n.data.id));
      for (const b of rows) {
        if (!existing.has(b.id)) nodes.push({ data: { id: b.id, label: b.title, type: 'book', rating: b.rating ?? null, cover: b.thumbnail_url ?? null } });
        if (nodes.length >= 50) break;
      }
    }
  }

  console.log('[graph] nodes/edges', nodes.length, edgeList.length, 'ids', ids.length);

  // Cap sizes
  const cappedNodes = nodes.slice(0, 200);
  const allowed = new Set(cappedNodes.map(n => n.data.id));
  const cappedEdges = edgeList.filter(e => allowed.has(e.data.source) && allowed.has(e.data.target)).slice(0, 500);

  return Response.json({ nodes: cappedNodes, edges: cappedEdges });
}
