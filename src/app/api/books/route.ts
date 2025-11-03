import { NextRequest } from 'next/server';

type BookItem = {
  title: string;
  authors: string[];
  publisher: string;
  publishedAt: string; // Kakao 'datetime' 그대로(시간 포함 가능)
  isbn: string; // 원본 그대로(ISBN10/13 공백 혼합 가능)
  isbn13: string | null; // 정규식으로 13자리만 추출; 없으면 null (확실하지 않음: 카카오 측 표기 일관성)
  thumbnail: string | null; // 빈 문자열이면 null
  sourceUrl: string | null; // Kakao 'url'
};

type BooksResponse = {
  items: BookItem[];
  isEnd: boolean;
  page: number;
  size: number;
  query: string;
};

// 개발용 초간단 레이트리밋(메모리) — 프로덕션에서는 KV/Redis 등으로 대체 권장
const bucket = new Map<string, { tokens: number; ts: number }>();
const LIMIT = 30; // 분당 요청 수 (데모)
function rateLimit(key: string): boolean {
  const now = Date.now();
  const slot = Math.floor(now / 60000);
  const rec = bucket.get(key);
  if (!rec || rec.ts !== slot) {
    bucket.set(key, { tokens: LIMIT - 1, ts: slot });
    return true;
  }
  if (rec.tokens <= 0) return false;
  rec.tokens -= 1;
  return true;
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const query = url.searchParams.get('query')?.trim();
  const pageRaw = url.searchParams.get('page') ?? '1';
  const sizeRaw = url.searchParams.get('size') ?? '10';
  const provider = (url.searchParams.get('provider') || 'aladin').toLowerCase();

  // Provider key checks
  if (provider === 'aladin') {
    if (!process.env.ALADIN_TTB_KEY) {
      return Response.json(
        { error: 'ALADIN_TTB_KEY is not set', details: 'Set in environment and redeploy' },
        { status: 500 }
      );
    }
  } else {
    return Response.json({ error: 'Unsupported provider', details: provider }, { status: 400 });
  }

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  // validate page/size
  const page = Math.max(1, Number.isNaN(Number(pageRaw)) ? 1 : Number(pageRaw));
  let size = Math.max(1, Number.isNaN(Number(sizeRaw)) ? 10 : Number(sizeRaw));
  size = Math.min(50, size);

  // rate limit by ip+query key (개발용)
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0';
  const key = `${ip}:${query}`;
  if (!rateLimit(key)) {
    return Response.json(
      { error: 'Too Many Requests', details: 'Please retry later' },
      { status: 429 }
    );
  }

  // No Kakao branch anymore; default and only provider is Aladin

  // Aladin (ItemSearch)
  // 알라딘은 output=JS 시 JSON을 반환하나 Content-Type이 application/json이 아닐 수 있어 text로 받아 파싱 처리
  const aladinUrl = new URL('https://www.aladin.co.kr/ttb/api/ItemSearch.aspx');
  aladinUrl.searchParams.set('ttbkey', process.env.ALADIN_TTB_KEY as string);
  aladinUrl.searchParams.set('Query', query);
  aladinUrl.searchParams.set('QueryType', 'Keyword');
  aladinUrl.searchParams.set('MaxResults', String(size)); // 알라딘은 1–100
  aladinUrl.searchParams.set('start', String(page));
  aladinUrl.searchParams.set('SearchTarget', 'Book');
  aladinUrl.searchParams.set('output', 'JS');
  aladinUrl.searchParams.set('Version', '20131101');

  const res2 = await fetch(aladinUrl.toString(), { cache: 'no-store' });
  if (!res2.ok) {
    const text = await res2.text();
    return Response.json({ error: 'Upstream error', details: text }, { status: res2.status });
  }
  // 알라딘 JSON 구조는 문서에 상세 기술이 부족 — 안전하게 text로 받아 파싱 시도
  const raw = await res2.text();
  let data2: any;
  try {
    data2 = JSON.parse(raw);
  } catch {
    // JSON이 앞뒤로 주석/표현이 섞인 경우 첫 { 부터 마지막 } 까지 잘라 재시도
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        data2 = JSON.parse(raw.slice(start, end + 1));
      } catch {
        return Response.json(
          { error: 'Parse error', details: raw.slice(0, 200) + '...' },
          { status: 502 }
        );
      }
    } else {
      return Response.json(
        { error: 'Parse error', details: raw.slice(0, 200) + '...' },
        { status: 502 }
      );
    }
  }

  // 가능한 배열 위치들을 탐색
  let arr: any[] = [];
  if (Array.isArray(data2?.item)) arr = data2.item;
  else if (Array.isArray(data2?.items)) arr = data2.items;
  else {
    // 객체 값들 중 배열인 첫 후보 선택
    const candidate = Object.values(data2 || {}).find((v: any) => Array.isArray(v));
    if (Array.isArray(candidate)) arr = candidate as any[];
  }
  const total: number = Number(data2?.totalResults ?? data2?.totalCount ?? 0);
  const items: BookItem[] = arr.map((d) => {
    const title: string = d.title ?? '';
    const authorsText: string = d.author ?? '';
    const authors: string[] = authorsText
      ? authorsText
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
    const publisher: string = d.publisher ?? '';
    const publishedAt: string = d.pubDate ?? d.pubdate ?? ''; // 형식: yyyymmdd (ISO 아님)
    const isbn13: string | null = d.isbn13 ? String(d.isbn13) : null;
    const cover: string | null = d.cover && String(d.cover).trim() !== '' ? String(d.cover) : null;
    const link: string | null = d.link && String(d.link).trim() !== '' ? String(d.link) : null;
    return {
      title,
      authors,
      publisher,
      publishedAt,
      isbn: String(d.isbn ?? isbn13 ?? ''),
      isbn13,
      thumbnail: cover,
      sourceUrl: link,
    };
  });
  const isEnd = page * size >= Math.min(total, 200); // 알라딘은 총 200까지만 검색 가능
  const body: BooksResponse = { items, isEnd, page, size, query };
  return Response.json(body);
}
