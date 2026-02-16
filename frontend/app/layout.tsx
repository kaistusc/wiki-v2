import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';

import './globals.css';

import { buildTree, NavNode } from '@/lib/buildTree';
import { fetchAllPages } from '@/lib/wiki';
import WikiTabs from '@/components/WikiTabs';
import SearchBar from '@/components/SearchBar';

const inter = Inter({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '카이스트 백과사전',
  description: 'KAIST Encyclopedia',
};

function Tree({ node }: { node: NavNode }) {
  return (
    <ul className="pl-0 list-none m-0">
      {node.children.map((c) => (
        <li key={c.name} className="mb-1">
          {c.path ? (
            <Link
              href={`/docs/${c.path}`}
              className="text-[#0745AD] hover:text-[#063A8F] hover:underline text-[12px] leading-[14px] block py-[1px]"
            >
              {c.title ?? c.name}
            </Link>
          ) : (
            // [Color] Danger: #BB0001 (Hover: #9F0001 - Danger Dark)
            <Link
              href={`/write?title=${encodeURIComponent(c.name)}`}
              className="text-[#BB0001] hover:text-[#9F0001] hover:underline text-[14px] leading-[18px] block py-[1px]"
            >
              {c.name}
            </Link>
          )}
          {c.children.length > 0 && (
            <div className="pl-3 border-l border-[#A7D7F9] ml-1 mt-1">
              <Tree node={c} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pages = await fetchAllPages();
  const tree = buildTree(pages);

  return (
    <html lang="ko" className="h-full">
      <body
        className={`${inter.variable} font-sans antialiased text-[#54595D] h-full flex flex-col`}
      >
        {/* 시작!!*/}
        <div className="flex w-full min-h-screen relative items-start">
          {/* 좌측 사이드바 */}
          <aside className="w-[11em] shrink-0 pt-6 px-4 hidden md:block relative z-10">
            {/* 로고 */}
            <div className="mb-12 text-center">
              <Link href="/" className="block group">
                <Image
                  src="/logo.png"
                  alt="KAIST WIKI Logo"
                  width={500}
                  height={202}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>

            {/* 메뉴 */}
            <div className="mb-6">
              {/* [Color] Border: #A3A9B1 (Gray 300) */}
              <h3 className="text-xs font-bold text-[#54595D] mb-2 pb-1 uppercase tracking-tighter cursor-default ml-1">
                문서 목록
              </h3>
              <nav className="ml-2">
                <Tree node={tree} />
              </nav>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-bold text-[#54595D] mb-2 pb-1 uppercase tracking-tighter cursor-default ml-1">
                도구
              </h3>
              <ul className="text-[12px] leading-[14px] text-[#0745AD] ml-2">
                <li className="mb-1">
                  <Link href="/write" className="hover:underline">
                    새 문서 만들기
                  </Link>
                </li>
                <li className="mb-1">
                  <Link href="#" className="hover:underline">
                    특수 문서 목록
                  </Link>
                </li>
                <li className="mb-1">
                  <Link href="#" className="hover:underline">
                    파일 올리기
                  </Link>
                </li>
              </ul>
            </div>
          </aside>

          {}
          <div className="flex-1 min-w-0 pt-4 pr-4 pb-10">
            {/* 로그인 */}
            <div className="flex justify-end gap-3 text-xs text-[#0745AD] mb-2 px-2 ">
              <Link href="#" className="hover:underline">
                로그인
              </Link>
            </div>

            {/* 탭(Tab) & 검색창 영역 */}
            <div className="flex items-end h-[2rem] relative">
              <WikiTabs />
              <div className="mb-1">
                <SearchBar />
              </div>
            </div>

            {/* 메인 콘텐츠 박스 */}
            <main className="bg-white border border-[#A7D7F9] p-8 min-h-[600px] relative -mt-[1px] z-0 shadow-sm">
              <div className="text-[14px] leading-[1.4]">{children}</div>
            </main>

            {/* 푸터 */}
            <footer className="mt-4 text-xs text-[#54595D] text-center leading-5 px-4">
              <p>이 문서는 2026년 2월 15일 (토) 00:00에 마지막으로 편집되었습니다.</p>
              <div className="mt-2 space-x-4 text-[#0745AD]">대충 아래에 들어갈 단어들</div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
