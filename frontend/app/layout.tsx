import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google'; // Noto_Serif는 로고용

import './globals.css';

import { buildTree, NavNode } from '@/lib/buildTree';
import { fetchAllPages } from '@/lib/wiki';
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

// ---------------------------------------------------------------------------
// [Component] Tree: 디자인 시스템 컬러 적용
// ---------------------------------------------------------------------------
function Tree({ node }: { node: NavNode }) {
  return (
    <ul className="pl-0 list-none m-0">
      {node.children.map((c) => (
        <li key={c.name} className="mb-1">
          {c.path ? (
            // [Color] Primary: #0745AD (Hover: #063A8F - Primary Dark)
            // [Typo] 14px~16px (사이드바는 보통 본문보다 작게 설정하지만 요청하신 폰트 느낌 유지)
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
          {/* 하위 트리 들여쓰기 */}
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

// ---------------------------------------------------------------------------
// [Layout] RootLayout: KAIPEDIA Vector Skin Style
// ---------------------------------------------------------------------------
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pages = await fetchAllPages();
  const tree = buildTree(pages);

  return (
    // [Color] Gray 100 (#F6F6F6) 배경색 적용
    <html lang="ko" className="h-full">
      <body className={`${inter.variable} font-sans antialiased text-[#54595D] h-full flex flex-col`}>
        
        {/* 전체 레이아웃 컨테이너 */}
        <div className="flex w-full min-h-screen relative items-start">
          
          {/* ==================================================================
              [좌측 사이드바]
              - 고정 너비, Gray 500 텍스트
             ================================================================== */}
          <aside className="w-[11em] shrink-0 pt-6 px-4 hidden md:block relative z-10">
            
            {/* 1. 로고 영역 */}
            <div className="mb-12 text-center">
              <Link href="/" className="block group">
                  <Image src="/logo.png" alt="KAIST WIKI Logo" width={500} height={202} className="object-contain" priority />
              </Link>
            </div>

            {/* 2. 사이드바 메뉴 */}
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
                <li className="mb-1"><Link href="/write" className="hover:underline">새 문서 만들기</Link></li>
                <li className="mb-1"><Link href="#" className="hover:underline">특수 문서 목록</Link></li>
                <li className="mb-1"><Link href="#" className="hover:underline">파일 올리기</Link></li>
              </ul>
            </div>
          </aside>

          {}
          <div className="flex-1 min-w-0 pt-4 pr-4 pb-10">
            
            {/* 1. 최상단 사용자 링크 (우측 상단) */}
            <div className="flex justify-end gap-3 text-xs text-[#0745AD] mb-2 px-2 ">
              <Link href="#" className="hover:underline">로그인</Link>
            </div>

            {/* 2. 탭(Tab) & 검색창 영역 */}
            <div className="flex items-end h-[2rem] relative" >
              {/* 왼쪽 탭: 문서 / 토론 */}
              <div className="flex h-full z-10">
                {/* [Active Tab] 배경 White, Border Gray 300 (#A3A9B1), 하단 Border 없음 */}
                <div className="px-2 flex items-center bg-white border border-[#A7D7F9] border-b-white border-t-white text-sm font-bold text-gray-900 cursor-default">
                  문서
                </div>
                {/* [Inactive Tab] 배경 그라데이션, 글자 Primary Color */}
                <Link href="#" className="px-2 flex items-center bg-gradient-to-b from-[#fbfbfb] to-[#f0f0f0] border border-[#A7D7F9] border-t-white text-sm text-[#0745AD] hover:bg-white transition-colors">
                  토론
                </Link>
              </div>

              {/* 오른쪽 탭: 읽기 / 편집 / 역사 (Spacer) */}
              <div className="flex-1"></div>

              <div className="flex h-full z-10 mr-4">
                 <div className="px-2 flex items-center bg-white border border-[#A7D7F9] border-b-white border-t-white text-sm font-bold text-gray-900 cursor-default">
                  읽기
                </div>
                <Link href="/write" className="px-2 flex items-center border hover:bg-white border-[#A7D7F9] border-t-white text-sm text-[#0745AD]">
                  편집
                </Link>
                <Link href="#" className="px-2 flex items-center border hover:bg-white border-[#A7D7F9] border-t-white text-sm text-[#0745AD]">
                  역사 보기
                </Link>
              </div>

              {/* 검색창 */}
              <div className="mb-1">
                 <SearchBar />
              </div>
            </div>

            {/* 3. 메인 콘텐츠 박스 */}
            {/* [Color] Background: White, Border: Gray 300 (#A3A9B1) */}
            {/* [Typo] 기본 텍스트 16px 적용 (prose 내부) */}
            <main className="bg-white border border-[#A7D7F9] p-8 min-h-[600px] relative -mt-[1px] z-0 shadow-sm">
              <div className="text-[14px] leading-[1.4]">
                 {children}
              </div>
            </main>

            {/* 4. 푸터 */}
            <footer className="mt-4 text-xs text-[#54595D] text-center leading-5 px-4">
               <p>이 문서는 2026년 2월 15일 (토) 00:00에 마지막으로 편집되었습니다.</p>
               <div className="mt-2 space-x-4 text-[#0745AD]">
                 대충 아래에 들어갈 단어들
               </div>
            </footer>

          </div>
        </div>
      </body>
    </html>
  );
}