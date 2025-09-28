"use client";

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AuthForm({ next = '/library', reason }: { next?: string; reason?: string }) {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setMsg(`로그인 오류: ${error.message}`);
    else window.location.assign(next);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">로그인</h1>
      {reason === 'admin-only' ? (
        <div className="vintage-card p-3">관리자만 등록할 수 있습니다. 로그인 후 다시 시도하세요.</div>
      ) : null}
      <form onSubmit={onSubmit} className="vintage-card p-4" style={{display:'grid', gap:'8px', maxWidth:360}}>
        <input className="vintage-input" type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="이메일" />
        <input className="vintage-input" type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="비밀번호" />
        <div className="h-stack" style={{justifyContent:'flex-end'}}>
          <button className="vintage-button" type="submit">로그인</button>
        </div>
        {msg ? <div className="text-sm opacity-80">{msg}</div> : null}
      </form>
    </div>
  );
}
