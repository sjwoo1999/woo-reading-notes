import { NextRequest } from 'next/server';
import { restHeaders, restUrl } from '@/lib/supabase-rest';

type NodeType = 'book' | 'note' | 'entity';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = (searchParams.get('type') as NodeType) || 'book';
  const id = searchParams.get('id');
  const depth = Number(searchParams.get('depth') || '1');

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
  if (!['book', 'note', 'entity'].includes(type)) return Response.json({ error: 'invalid type' }, { status: 400 });
  if (depth !== 1) return Response.json({ error: 'only depth=1 supported' }, { status: 400 });

  const headers = restHeaders();

  const or = `or=(and(src_type.eq.${type},src_id.eq.${id}),and(dst_type.eq.${type},dst_id.eq.${id}))`;
  const linksRes = await fetch(`${restUrl('links', { select: 'id,src_type,src_id,dst_type,dst_id,link_type,weight', limit: '500' })}&${or}`, { headers, cache: 'no-store' });
  if (!linksRes.ok) return Response.json({ error: await linksRes.text() }, { status: 400 });
  const linkRows = (await linksRes.json()) as any[];

  const ids = new Map<string, { id: string; type: NodeType }>();
  ids.set(`${type}:${id}`, { id, type });
  for (const l of linkRows) {
    ids.set(`${l.src_type}:${l.src_id}`, { id: l.src_id, type: l.src_type });
    ids.set(`${l.dst_type}:${l.dst_id}`, { id: l.dst_id, type: l.dst_type });
  }

  async function fetchLabels(kind: 'books' | 'notes' | 'entities', idsList: string[]) {
    if (idsList.length === 0) return [] as any[];
    const url = restUrl(kind, { select: kind === 'entities' ? 'id,name' : 'id,title', id: `in.(${idsList.join(',')})` });
    const r = await fetch(url, { headers, cache: 'no-store' });
    if (!r.ok) throw new Error(await r.text());
    const rows = await r.json();
    if (kind === 'entities') return rows.map((x: any) => ({ id: x.id, label: x.name, type: 'entity' as const }));
    if (kind === 'books') return rows.map((x: any) => ({ id: x.id, label: x.title, type: 'book' as const }));
    return rows.map((x: any) => ({ id: x.id, label: x.title || 'Note', type: 'note' as const }));
  }

  const bookIds = Array.from(ids.values()).filter((n) => n.type === 'book').map((n) => n.id);
  const noteIds = Array.from(ids.values()).filter((n) => n.type === 'note').map((n) => n.id);
  const entityIds = Array.from(ids.values()).filter((n) => n.type === 'entity').map((n) => n.id);

  try {
    const [books, notes, entities] = await Promise.all([
      fetchLabels('books', bookIds),
      fetchLabels('notes', noteIds),
      fetchLabels('entities', entityIds)
    ]);

    const nodes = [...books, ...notes, ...entities].map((n) => ({ data: n }));
    const edges = linkRows.map((l) => ({ data: { id: l.id, source: l.src_id, target: l.dst_id, link_type: l.link_type, weight: l.weight ?? null } }));
    return Response.json({ nodes, edges });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
