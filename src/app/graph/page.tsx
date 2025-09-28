'use client';

import { useState } from 'react';

type NodeType = 'book' | 'note' | 'entity';

export default function GraphPage() {
  const [type, setType] = useState<NodeType>('book');
  const [id, setId] = useState('');
  const [elements, setElements] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchGraph() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/graph?${new URLSearchParams({ type, id, depth: '1' }).toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setElements({ nodes: data.nodes || [], edges: data.edges || [] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">그래프</h1>
      <div className="vintage-card p-4" style={{display:'grid', gap:'8px', gridTemplateColumns:'auto 1fr auto'}}>
        <select aria-label="타입" value={type} onChange={(e) => setType(e.target.value as NodeType)} className="vintage-input">
          <option value="book">book</option>
          <option value="note">note</option>
          <option value="entity">entity</option>
        </select>
        <input aria-label="시드 ID" className="vintage-input" value={id} onChange={(e) => setId(e.target.value)} placeholder="시드 ID (UUID)" />
        <button className="vintage-button" onClick={fetchGraph}>{loading ? '불러오는 중…' : '가져오기'}</button>
      </div>

      {error ? <div className="vintage-card p-3" style={{color:'#b00'}}>오류: {error}</div> : null}
      {elements && (elements.nodes.length === 0 && elements.edges.length === 0) ? (
        <div className="vintage-card p-4">결과가 없습니다.</div>
      ) : null}

      {elements ? (
        <div className="vintage-card p-4">
          <div className="text-sm opacity-70 mb-2">Nodes: {elements.nodes.length} · Edges: {elements.edges.length}</div>
          <ul className="grid gap-2">
            {elements.nodes.map((n) => (
              <li key={n.data.id}>
                <a className="vintage-link" href={`/${n.data.type === 'book' ? 'book' : 'note'}/${n.data.id}`}>{n.data.type}: {n.data.label}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
