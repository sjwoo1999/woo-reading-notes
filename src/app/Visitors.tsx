"use client";
import { useEffect, useState } from 'react';

export default function Visitors() {
  const [today, setToday] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const key = 'visited-today';
    const todayStr = new Date().toISOString().slice(0,10);
    const mark = localStorage.getItem(key);
    async function tick() {
      if (mark !== todayStr) {
        await fetch('/api/visits', { method: 'POST' });
        localStorage.setItem(key, todayStr);
      }
      const res = await fetch('/api/visits');
      const data = await res.json();
      setToday(data.today || 0);
      setTotal(data.total || 0);
    }
    tick();
  }, []);

  return (
    <div className="text-sm opacity-80">
      오늘 방문자 {today} · 전체 {total}
    </div>
  );
}
