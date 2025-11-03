import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Visitors from './Visitors';
import AuthLink from './auth/AuthLink';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '리딩 노트',
  description: '빈티지 무드의 독서 기록과 연결 탐색',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="vintage-header">
          <div
            className="container-vintage"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Link href="/library" className="vintage-link" style={{ fontWeight: 600 }}>
              리딩 노트
            </Link>
            <nav style={{ display: 'flex', gap: '8px' }}>
              <Link className="vintage-link" href="/library">
                라이브러리
              </Link>
              <Link className="vintage-link" href="/notes">
                노트
              </Link>
              <Link className="vintage-link" href="/graph">
                그래프
              </Link>
              <Link className="vintage-link" href="/tags">
                태그
              </Link>
              <Link className="vintage-link" href="/settings">
                설정
              </Link>
              <AuthLink />
            </nav>
          </div>
        </header>
        <main className="container-vintage">{children}</main>
        <footer style={{ borderTop: '1px solid var(--line)' }}>
          <div
            className="container-vintage"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <Visitors />
            <a
              className="vintage-link"
              href="https://www.instagram.com/_woo_s.j"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram : _woo_s.j
            </a>
            <a
              className="vintage-link"
              href="https://www.threads.net/@Maker.woo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Threads : Maker.woo
            </a>
            <a
              className="vintage-link"
              href="https://www.linkedin.com/in/%EC%9A%B0%EC%84%B1%EC%A2%85/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn : 우성종
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
