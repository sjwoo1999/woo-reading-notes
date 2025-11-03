'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AuthLink() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  if (!email)
    return (
      <a className="vintage-link" href="/auth">
        로그인
      </a>
    );

  return (
    <button
      type="button"
      className="vintage-link"
      onClick={async () => {
        await sb.auth.signOut();
        window.location.reload();
      }}
    >
      로그아웃
    </button>
  );
}
