import { NextRequest } from 'next/server';
import { restHeaders, restUrl } from '@/lib/supabase-rest';

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

  const headers = restHeaders();

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
    if (!bt.ok) return Response.json({ error: await bt.text() }, { status: 400 });
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
    if (!le.ok) return Response.json({ error: await le.text() }, { status: 400 });
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
    if (!dl.ok) return Response.json({ error: await dl.text() }, { status: 400 });
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
  const nodes = [] as { data: { id: string; label: string; type: 'book'; rating?: number | null } }[];
  if (ids.length > 0) {
    const url = restUrl('books', { select: 'id,title,rating', id: `in.(${ids.join(',')})` });
    const r = await fetch(url, { headers, cache: 'no-store' });
    if (!r.ok) return Response.json({ error: await r.text() }, { status: 400 });
    const rows: { id: string; title: string; rating?: number | null }[] = await r.json();
    for (const b of rows) nodes.push({ data: { id: b.id, label: b.title, type: 'book', rating: b.rating ?? null } });
  }

  // Cap sizes
  const cappedNodes = nodes.slice(0, 200);
  const allowed = new Set(cappedNodes.map(n => n.data.id));
  const cappedEdges = edgeList.filter(e => allowed.has(e.data.source) && allowed.has(e.data.target)).slice(0, 500);

  return Response.json({ nodes: cappedNodes, edges: cappedEdges });
}
