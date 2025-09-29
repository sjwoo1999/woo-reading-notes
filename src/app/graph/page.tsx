'use client';

import { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useRouter } from 'next/navigation';

export default function GraphPage() {
  const [minWeight, setMinWeight] = useState(1);
  const [tags, setTags] = useState(true);
  const [entities, setEntities] = useState(true);
  const [direct, setDirect] = useState(true);
  const [alpha, setAlpha] = useState(1);
  const [beta, setBeta] = useState(1);
  const [gamma, setGamma] = useState(2);
  const [data, setData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const cyRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function renderGraph() {
    setLoading(true); setError(null);
    try {
      // Cancel previous request if it is still in-flight
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const params = new URLSearchParams({
        minWeight: String(minWeight),
        tags: String(tags), entities: String(entities), direct: String(direct),
        alpha: String(alpha), beta: String(beta), gamma: String(gamma)
      });
      const res = await fetch(`/api/graph?${params.toString()}` , { signal: controller.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || (res.status === 401 ? '로그인이 필요합니다.' : 'Failed'));
      setData({ nodes: json.nodes || [], edges: json.edges || [] });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return; // Swallow aborted requests
      }
      setError(e?.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-render on mount and when filters change (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      renderGraph();
    }, 300);
    return () => {
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minWeight, tags, entities, direct, alpha, beta, gamma]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">그래프</h1>
      {loading ? <div className="text-sm opacity-70">불러오는 중…</div> : null}

      {error ? <div className="vintage-card p-3" style={{color:'#b00'}}>오류: {error}</div> : null}
      {data && (data.nodes.length === 0 && data.edges.length === 0) ? (
        <div className="vintage-card p-4">결과가 없습니다.</div>
      ) : null}

      {data ? (
        <div className="vintage-card p-2" style={{height:520}}>
          <div className="text-sm opacity-70 mb-2 px-2">Nodes: {data.nodes.length} · Edges: {data.edges.length}</div>
          <CytoscapeComponent
            cy={(cy)=>{ cyRef.current = cy; cy.on('tap', 'node', (evt)=>{ const id = evt.target.id(); router.push(`/book/${id}`); }); cy.on('tap', (e)=>{ if (e.target === cy) cy.elements().unselect(); }); }}
            elements={[...data.nodes, ...data.edges] as any}
            style={{ width: '100%', height: '100%' }}
            layout={{ name: 'cose', animate: true }}
            stylesheet={[
              { selector: 'node', style: { 'shape': 'ellipse', 'width': 72, 'height': 72, 'background-fit': 'cover', 'background-image': 'data(cover)', 'border-width': 1, 'border-color': '#D7C9A7' } },
              { selector: 'node:selected', style: { 'overlay-opacity': 0.1, 'overlay-color': '#3B4E76' } },
              { selector: 'edge', style: { 'line-color': '#999', 'opacity': 0.6, 'width': 'mapData(weight, 1, 10, 1, 6)', 'curve-style': 'bezier' } },
              { selector: 'edge:selected', style: { 'line-color': '#3B4E76', 'opacity': 0.9 } },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
