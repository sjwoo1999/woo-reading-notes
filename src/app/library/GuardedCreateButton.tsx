"use client";
import { useRouter } from 'next/navigation';

export default function GuardedCreateButton() {
  const router = useRouter();
  async function handleClick() {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const me = await res.json();
      if (me.authenticated && me.isAdmin) {
        router.push('/book/new');
        return;
      }
      const ok = window.confirm('관리자만 등록할 수 있습니다! 로그인하시겠습니까?');
      if (ok) router.push('/auth?next=' + encodeURIComponent('/book/new') + '&reason=admin-only');
    } catch (e) {
      router.push('/auth?next=' + encodeURIComponent('/book/new') + '&reason=admin-only');
    }
  }
  return (
    <button onClick={handleClick} className="vintage-button" aria-label="새 책 등록하기">새 책 등록하기</button>
  );
}
