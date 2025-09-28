import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function supabaseServer() {
  const cookieStore = await cookies();
  const headersList = await headers();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const c = cookieStore.get(name);
          return c?.value;
        },
        async set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        async remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        }
      },
      headers: {
        async get(name: string) {
          return headersList.get(name) ?? undefined;
        }
      }
    }
  );
}
