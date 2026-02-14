import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

import { buildTree, NavNode } from '@/lib/buildTree';
import { fetchAllPages } from '@/lib/wiki';
import SearchBar from '@/components/SearchBar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '카이위키 v2',
  description: '카이위키 v2',
};

function Tree({ node }: { node: NavNode }) {
  return (
    <ul>
      {node.children.map((c) => (
        <li key={c.name}>
          {c.path ? (
            <Link 
              href={`/docs/${c.path}`} 
              className="text-blue-700 hover:text-blue-900 hover:underline transition-colors"
            >
              {c.title ?? c.name}
            </Link>
          ) : (
            <Link href={`/write?title=${encodeURIComponent(c.name)}`} className="text-red-700 hover:text-red-900 hover:underline transition-colors">
              {c.name}
            </Link>
          )}
          {c.children.length > 0 && <Tree node={c} />}
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900 bg-white h-full`}>        
        
        {}
        <div className="grid grid-cols-[280px_1fr] min-h-screen w-full shadow-sm bg-white">
          
          {}
          <aside className="sticky top-0 h-screen overflow-y-auto border-r border-gray-200 bg-gray-50 flex flex-col">
            
            {}
            <div className="p-6 pb-4">
              <Link href="/" className="text-xl font-bold tracking-tight text-gray-900 block mb-4">
                카이위키 v2
              </Link>
              <SearchBar />
            </div>
            
            {}
            <nav className="flex-1 px-4 overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-gray-300">
              <div className="font-semibold text-gray-500 mb-2 px-2 text-xs uppercase tracking-wider">
                문서 목록
              </div>
              <div className="px-2">
                <Tree node={tree} />
              </div>
            </nav>

            {}
            <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
              <Link 
                href="/write" 
                className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98]"
              >
                + 새 페이지 만들기
              </Link>
            </div>
          </aside>

          {}
          <main className="min-w-0">
            {}
            <div className="p-10 max-w-4xl mx-auto">
              {children}
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}