import { NextRequest } from 'next/server';

type BookItem = {
  title: string;
  authors: string[];
  publisher: string;
  publishedAt: string;       // Kakao 'datetime' 그대로(시간 포함 가능)
  isbn: string;              // 원본 그대로(ISBN10/13 공백 혼합 가능)
  isbn13: string | null;     // 정규식으로 13자리만 추출; 없으면 null (확실하지 않음: 카카오 측 표기 일관성)
  thumbnail: string | null;  // 빈 문자열이면 null
  sourceUrl: string | null;  // Kakao 'url'
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

  if (!process.env.KAKAO_REST_API_KEY) {
    return Response.json({ error: 'KAKAO_REST_API_KEY is not set', details: 'Set in environment and redeploy' }, { status: 500 });
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
    return Response.json({ error: 'Too Many Requests', details: 'Please retry later' }, { status: 429 });
  }

  // call Kakao
  const kakaoUrl = new URL('https://dapi.kakao.com/v3/search/book');
  kakaoUrl.searchParams.set('query', query);
  kakaoUrl.searchParams.set('page', String(page));
  kakaoUrl.searchParams.set('size', String(size));

  const res = await fetch(kakaoUrl.toString(), {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    // Kakao 권장 캐시 정책 문서상 명시 없음 → 여기선 no-store (확실하지 않음)
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: 'Upstream error', details: text }, { status: res.status });
  }

  type KakaoDoc = {
    title: string;
    authors: string[];
    publisher: string;
    datetime: string;
    isbn: string;
    thumbnail?: string;
    url?: string;
  };
  type KakaoResp = { documents: KakaoDoc[]; meta: { is_end: boolean } };

  const data = (await res.json()) as KakaoResp;

  const items: BookItem[] = data.documents.map((d) => {
    const isbn13Match = (d.isbn || '').match(/\b(\d{13})\b/); // 13자리 연속 숫자
    const thumb = d.thumbnail && d.thumbnail.trim() !== '' ? d.thumbnail : null; // 해상도 보장은 문서에 없음(확실하지 않음)
    const surl = d.url && d.url.trim() !== '' ? d.url : null;
    return {
      title: d.title,
      authors: Array.isArray(d.authors) ? d.authors : [],
      publisher: d.publisher ?? '',
      publishedAt: d.datetime ?? '', // 클라이언트에서 일자만 필요하면 slice(0,10) 권고
      isbn: d.isbn ?? '',
      isbn13: isbn13Match ? isbn13Match[1] : null,
      thumbnail: thumb,
      sourceUrl: surl
    };
  });

  const body: BooksResponse = {
    items,
    isEnd: !!data.meta?.is_end,
    page,
    size,
    query
  };

  return Response.json(body);
}


