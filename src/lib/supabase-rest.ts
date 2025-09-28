export function restHeaders() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  } as Record<string, string>;
}

export function restUrl(table: string, qs?: Record<string, string | undefined>) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const params = new URLSearchParams();
  if (qs) {
    for (const [k, v] of Object.entries(qs)) if (v != null && v !== '') params.set(k, v);
  }
  const search = params.toString();
  return `${base}/rest/v1/${table}${search ? `?${search}` : ''}`;
}
