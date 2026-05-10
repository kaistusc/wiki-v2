import Link from 'next/link';

import { fetchAllPages } from '@/lib/wiki';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function AllPagesList() {
  const allPages = await fetchAllPages();

  // 한국어 가나다순, 영어 알파벳순 정렬
  const sortedPages = [...allPages].sort((a, b) =>
    a.title.localeCompare(b.title, 'ko-KR', { sensitivity: 'base' })
  );

  // 2. 일반 문서와 Template을 분리하여 배열
  const normalPages = sortedPages.filter((page) => !page.title.startsWith('틀:'));
  const templatePages = sortedPages.filter((page) => page.title.startsWith('틀:'));

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">모든 문서 목록</h1>
      <p className="text-gray-600 mb-8">현재 위키에 등록된 전체 문서({allPages.length}개)입니다.</p>

      <div className="space-y-12">
        {/* 일반 문서 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
            일반 문서{' '}
            <span className="text-sm font-normal text-gray-500">({normalPages.length})</span>
          </h2>
          {normalPages.length === 0 ? (
            <p className="text-gray-500 text-sm">작성된 문서가 없습니다.</p>
          ) : (
            <ul className="flex flex-col space-y-2">
              {normalPages.map((page) => (
                <li key={page.id} className="truncate">
                  <Link
                    href={`/docs/${page.path}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Template */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
            틀 <span className="text-sm font-normal text-gray-500">({templatePages.length})</span>
          </h2>
          {templatePages.length === 0 ? (
            <p className="text-gray-500 text-sm">생성된 틀이 없습니다.</p>
          ) : (
            <ul className="flex flex-col space-y-2">
              {templatePages.map((page) => (
                <li key={page.id} className="truncate">
                  <Link
                    href={`/docs/${page.path}`}
                    className="text-emerald-600 hover:text-emerald-800 hover:underline transition-colors"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
