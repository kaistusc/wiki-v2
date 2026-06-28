import Link from 'next/link';

import { fetchAllPages } from '@/lib/wiki';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function AllPagesList() {
  const allPages = await fetchAllPages();

  // 하위 페이지를 위해 path 기준 정렬
  const sortedPages = [...allPages].sort((a, b) =>
    a.path.localeCompare(b.path, 'ko-KR', { sensitivity: 'base' })
  );

  // 일반 문서와 틀 문서 분리
  const normalPages = sortedPages.filter((page) => !page.title.startsWith('틀:'));
  const templatePages = sortedPages.filter((page) => page.title.startsWith('틀:'));

  const groupPagesByRoot = (pages: any[]) => {
    const groups: Record<string, any[]> = {};
    pages.forEach((page) => {
      const rootPath = page.path.split('/')[0];
      if (!groups[rootPath]) groups[rootPath] = [];
      groups[rootPath].push(page);
    });
    return Object.values(groups);
  };

  const normalGroups = groupPagesByRoot(normalPages);
  const templateGroups = groupPagesByRoot(templatePages);

  // 문서 렌더링 헬퍼 함수 (isTemplate 여부로 색상 구분)
  const renderPageItem = (page: any, isTemplate: boolean) => {
    const depth = page.path.split('/').length - 1;
    const colorClass = isTemplate
      ? 'text-emerald-600 hover:text-emerald-800'
      : 'text-blue-600 hover:text-blue-800';

    return (
      <li key={page.id} className="mb-1 leading-snug" style={{ paddingLeft: `${depth * 1.2}rem` }}>
        {depth > 0 && (
          <span className="text-gray-400 mr-2 inline-block select-none text-sm">↳</span>
        )}
        <Link
          href={`/docs/${page.path}`}
          className={`${colorClass} font-medium hover:underline transition-colors break-all`}
          title={page.title}
        >
          {page.title}
        </Link>
      </li>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 border-b pb-2 mb-4">모든 문서 목록</h1>
      <p className="text-gray-600 mb-8">현재 위키에 등록된 전체 문서({allPages.length}개)입니다.</p>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-baseline gap-2">
            문서
            <span className="text-sm font-normal text-gray-500">({normalPages.length})</span>
          </h2>
          {normalPages.length === 0 ? (
            <p className="text-sm text-gray-500">작성된 문서가 없습니다.</p>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
              {normalGroups.map((group, idx) => (
                <ul key={idx} className="break-inside-avoid list-none m-0 p-0 mb-6">
                  {group.map((page) => renderPageItem(page, false))}
                </ul>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-baseline gap-2">
            틀<span className="text-sm font-normal text-gray-500">({templatePages.length})</span>
          </h2>
          {templatePages.length === 0 ? (
            <p className="text-sm text-gray-500">생성된 틀이 없습니다.</p>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
              {templateGroups.map((group, idx) => (
                <ul key={idx} className="break-inside-avoid list-none m-0 p-0 mb-6">
                  {group.map((page) => renderPageItem(page, true))}
                </ul>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
