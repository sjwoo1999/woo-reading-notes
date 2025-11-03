'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useRouter } from 'next/navigation';

export default function GraphPage() {
  // TODO: Implement graph filtering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [minWeight, setMinWeight] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tags, setTags] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [entities, setEntities] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [direct, setDirect] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [alpha, setAlpha] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [beta, setBeta] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gamma, setGamma] = useState(2);
  const [data, setData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const cyRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isSample, setIsSample] = useState(false);

  // Cleanup cytoscape and in-flight requests on unmount
  useEffect(() => {
    return () => {
      try {
        cyRef.current?.off('tap');
      } catch {}
      try {
        cyRef.current?.destroy?.();
      } catch {}
      cyRef.current = null;
      try {
        abortRef.current?.abort();
      } catch {}
      abortRef.current = null;
    };
  }, []);

  function getSampleGraph(): { nodes: any[]; edges: any[] } {
    const noteTypes = ['book', 'concept', 'quote'];
    const nodes = Array.from({ length: 6 }).map((_, i) => ({
      data: {
        id: `demo-${i + 1}`,
        label: `샘플 노트 ${i + 1}`,
        type: noteTypes[i % noteTypes.length],
        title: `샘플 노트 ${i + 1}`,
        tags: [],
      },
    }));
    const edges = [
      { data: { id: 'e1', source: 'demo-1', target: 'demo-2', relationship_type: 'relates_to' } },
      { data: { id: 'e2', source: 'demo-2', target: 'demo-3', relationship_type: 'supports' } },
      { data: { id: 'e3', source: 'demo-3', target: 'demo-4', relationship_type: 'relates_to' } },
      { data: { id: 'e4', source: 'demo-1', target: 'demo-5', relationship_type: 'inspired_by' } },
      { data: { id: 'e5', source: 'demo-4', target: 'demo-6', relationship_type: 'contradicts' } },
    ];
    return { nodes, edges };
  }

  async function renderGraph() {
    setLoading(true);
    setError(null);
    try {
      // Cancel previous request if it is still in-flight
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSample(false);
      const params = new URLSearchParams({
        minWeight: String(minWeight),
        tags: String(tags),
        entities: String(entities),
        direct: String(direct),
        alpha: String(alpha),
        beta: String(beta),
        gamma: String(gamma),
      });
      const res = await fetch(`/api/graph?${params.toString()}`, { signal: controller.signal });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in → show sample graph instead of error
          setIsSample(true);
          setData(getSampleGraph());
          setError(null);
          return;
        }
        throw new Error(json.error || 'Failed');
      }
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

  // Always compute elements via hook (do not call hooks conditionally)
  const elements = useMemo(() => {
    if (!data) return [] as any;
    return [...data.nodes, ...data.edges] as any;
  }, [data]);

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-xl font-semibold">그래프</h1>
        {loading ? <div className="text-sm opacity-70">불러오는 중…</div> : null}
      </div>

      {error ? (
        <div className="vintage-card p-3" style={{ color: '#b00' }}>
          오류: {error}
        </div>
      ) : null}
      {isSample ? (
        <div
          className="vintage-card p-3 h-stack"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>로그인 시 내 노트 그래프가 표시됩니다. 지금은 샘플 그래프입니다.</div>
          <button className="vintage-button" onClick={() => router.push('/auth')}>
            로그인
          </button>
        </div>
      ) : null}
      {data && data.nodes.length === 0 && data.edges.length === 0 ? (
        <div className="vintage-card p-4">
          <div className="text-sm opacity-70">
            아직 노트가 없습니다. 새 노트를 만들어 시작하세요.
          </div>
        </div>
      ) : null}

      {data ? (
        <>
          {/* Legend */}
          <div className="vintage-card p-4 v-stack">
            <div className="text-sm font-medium opacity-70">범례</div>
            <div className="h-stack" style={{ gap: 16, flexWrap: 'wrap' }}>
              <div className="h-stack" style={{ gap: 8, alignItems: 'center' }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#3B4E76',
                    border: '2px solid #2A3654',
                  }}
                />
                <span className="text-sm">📚 책</span>
              </div>
              <div className="h-stack" style={{ gap: 8, alignItems: 'center' }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#D7A945',
                    border: '2px solid #B8860B',
                  }}
                />
                <span className="text-sm">💡 개념</span>
              </div>
              <div className="h-stack" style={{ gap: 8, alignItems: 'center' }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#A67C52',
                    border: '2px solid #8B6F47',
                  }}
                />
                <span className="text-sm">✨ 인용</span>
              </div>
            </div>
            <div className="text-xs opacity-60" style={{ marginTop: 8 }}>
              관계:
              <span style={{ marginLeft: 8 }}>
                <span style={{ color: '#4CAF50' }}>●</span> 지지함
              </span>
              <span style={{ marginLeft: 8 }}>
                <span style={{ color: '#F44336' }}>●</span> 모순됨
              </span>
              <span style={{ marginLeft: 8 }}>
                <span style={{ color: '#2196F3' }}>●</span> 영감을 받음
              </span>
              <span style={{ marginLeft: 8 }}>
                <span style={{ color: '#999' }}>●</span> 관련됨
              </span>
            </div>
          </div>

          {/* Graph */}
          <div className="vintage-card p-2" style={{ height: 520 }}>
            <div className="text-sm opacity-70 mb-2 px-2">
              노드: {data.nodes.length} · 간선: {data.edges.length}
            </div>
            <CytoscapeComponent
              key={isSample ? 'sample' : 'live'}
              cy={(cy) => {
                if (!cy) return;
                cyRef.current = cy;
                cy.off('tap');
                const uuidLike =
                  /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/;
                cy.on('tap', 'node', (evt) => {
                  const id = evt.target.id();
                  if (isSample || (typeof id === 'string' && id.startsWith('demo-'))) return;
                  if (typeof id === 'string' && uuidLike.test(id)) {
                    // Defer navigation to next tick to avoid dev-overlay race
                    setTimeout(() => {
                      try {
                        // Use hard navigation to avoid SPA/dev overlay races
                        window.location.href = `/notes/${id}`;
                      } catch {}
                    }, 0);
                  }
                });
                cy.on('tap', (e) => {
                  if (e.target === cy) cy.elements().unselect();
                });
              }}
              elements={elements}
              style={{ width: '100%', height: '100%' }}
              layout={{ name: 'cose', animate: true }}
              stylesheet={[
                // Base node style
                {
                  selector: 'node',
                  style: {
                    shape: 'circle',
                    width: 50,
                    height: 50,
                    'background-color': '#E8E0D5',
                    'border-width': 2,
                    'border-color': '#999',
                    label: 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': 11,
                    'font-weight': 'bold',
                    'text-background-color': '#fff',
                    'text-background-opacity': 0.8,
                    'text-background-padding': '2px',
                    'text-overflow-wrap': 'wrap',
                    'text-max-width': 80,
                    color: '#333',
                  },
                },
                // Book nodes - 📚
                {
                  selector: 'node[type="book"]',
                  style: {
                    'background-color': '#3B4E76',
                    'border-color': '#2A3654',
                    color: '#fff',
                  },
                },
                // Concept nodes - 💡
                {
                  selector: 'node[type="concept"]',
                  style: {
                    'background-color': '#D7A945',
                    'border-color': '#B8860B',
                    color: '#fff',
                  },
                },
                // Quote nodes - ✨
                {
                  selector: 'node[type="quote"]',
                  style: {
                    'background-color': '#A67C52',
                    'border-color': '#8B6F47',
                    color: '#fff',
                  },
                },
                // Selected node
                {
                  selector: 'node:selected',
                  style: {
                    'overlay-opacity': 0.2,
                    'overlay-color': '#3B4E76',
                    'overlay-padding': '8px',
                  },
                },
                // Edge styles
                {
                  selector: 'edge',
                  style: {
                    'line-color': '#999',
                    opacity: 0.6,
                    width: 2,
                    'curve-style': 'bezier',
                    'target-arrow-color': '#999',
                    'target-arrow-shape': 'triangle',
                    'arrow-scale': 0.8,
                  },
                },
                // Edge for different relationship types
                {
                  selector: 'edge[relationship_type="supports"]',
                  style: { 'line-color': '#4CAF50', 'target-arrow-color': '#4CAF50' },
                },
                {
                  selector: 'edge[relationship_type="contradicts"]',
                  style: { 'line-color': '#F44336', 'target-arrow-color': '#F44336' },
                },
                {
                  selector: 'edge[relationship_type="inspired_by"]',
                  style: { 'line-color': '#2196F3', 'target-arrow-color': '#2196F3' },
                },
                {
                  selector: 'edge[relationship_type="relates_to"]',
                  style: { 'line-color': '#999', 'target-arrow-color': '#999' },
                },
                // Selected edge
                {
                  selector: 'edge:selected',
                  style: {
                    'line-color': '#3B4E76',
                    'target-arrow-color': '#3B4E76',
                    opacity: 0.9,
                    width: 3,
                  },
                },
              ]}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
