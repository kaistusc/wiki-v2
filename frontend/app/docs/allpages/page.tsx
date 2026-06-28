import Link from 'next/link';

import { fetchAllPages } from '@/lib/wiki';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function AllPagesList() {
  const allPages = await fetchAllPages();

  const sortedPages = [...allPages].sort((a, b) =>
    a.path.localeCompare(b.path, 'ko-KR', { sensitivity: 'base' })
  );

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

  const renderPageItem = (page: any) => {
    const depth = page.path.split('/').length - 1;

    return (
      <li
        key={page.id}
        className="mb-[2px] leading-snug"
        style={{ paddingLeft: `${depth * 1.2}rem` }}
      >
        {depth > 0 && (
          <span className="text-[#54595d] mr-1 inline-block select-none text-[0.9em]">↳</span>
        )}
        <Link
          href={`/docs/${page.path}`}
          className="text-[#0645ad] hover:underline visited:text-[#0b0080] text-[15px] break-all"
          title={page.title}
        >
          {page.title}
        </Link>
      </li>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-8 font-sans text-[#202122]">
      <h1 className="text-[1.8em] font-normal border-b border-[#a2a9b1] pb-1 mb-4">
        모든 문서 목록
      </h1>
      <p className="text-[14px] mb-8">현재 위키에 등록된 전체 문서({allPages.length}개)입니다.</p>

      <div className="space-y-10">
        <section>
          <h2 className="text-[1.5em] font-normal border-b border-[#a2a9b1] pb-1 mb-4 flex items-baseline gap-2">
            일반 문서
            <span className="text-[0.6em] text-[#54595d]">({normalPages.length})</span>
          </h2>
          {normalPages.length === 0 ? (
            <p className="text-[14px] text-[#54595d]">작성된 문서가 없습니다.</p>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
              {normalGroups.map((group, idx) => (
                <ul key={idx} className="break-inside-avoid list-none m-0 p-0 mb-5">
                  {group.map((page) => renderPageItem(page))}
                </ul>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[1.5em] font-normal border-b border-[#a2a9b1] pb-1 mb-4 flex items-baseline gap-2">
            틀<span className="text-[0.6em] text-[#54595d]">({templatePages.length})</span>
          </h2>
          {templatePages.length === 0 ? (
            <p className="text-[14px] text-[#54595d]">생성된 틀이 없습니다.</p>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
              {templateGroups.map((group, idx) => (
                <ul key={idx} className="break-inside-avoid list-none m-0 p-0 mb-5">
                  {group.map((page) => renderPageItem(page))}
                </ul>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
