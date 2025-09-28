export const dynamic = 'force-dynamic';

async function fetchTags() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const url = `${base}/rest/v1/tags?select=id,name&order=name.asc`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function TagsPage() {
  const tags = await fetchTags();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">태그</h1>
      <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
        {tags.map((t: any) => (
          <a key={t.id} aria-label={`태그 ${t.name}`} href={`/library?tagId=${t.id}`} className="vintage-link vintage-card" style={{padding:'6px 10px'}}>
            #{t.name}
          </a>
        ))}
      </div>
    </div>
  );
}
