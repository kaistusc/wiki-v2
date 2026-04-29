// app/docs/wanted/page.tsx
import Link from 'next/link';

import { fetchAllPagesWithContent } from '@/lib/wiki';
import { analyzeWantedPages } from '@/lib/wantedPages';

export const revalidate = 3600;

export default async function WantedPages() {
  const allPages = await fetchAllPagesWithContent();
  const { missingLinks, missingTemplates } = analyzeWantedPages(allPages);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">작성이 필요한 문서</h1>
      <p className="text-gray-600 mb-8">
        다른 문서에서 참조되고 있지만, 아직 생성되지 않은 문서들의 목록입니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 필요한 틀 목록 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
            🛠 생성이 필요한 틀 (Template)
          </h2>
          {missingTemplates.length === 0 ? (
            <p className="text-sm text-gray-500">모든 틀이 정상적으로 존재합니다.</p>
          ) : (
            <ul className="space-y-4">
              {missingTemplates.map((item) => (
                <li key={item.name} className="bg-red-50 p-3 rounded-md border border-red-100">
                  {/* 1. 필요한 틀 목록 내부의 Link 부분 */}
                  <Link
                    href={`/docs/${encodeURIComponent(item.name)}?mode=edit`}
                    // 🌟 gap-3 추가, items-center 대신 items-start로 변경 (텍스트가 두 줄이 될 때를 대비)
                    className="text-red-700 font-medium hover:underline flex items-start justify-between gap-3"
                  >
                    {/* 🌟 텍스트가 너무 길면 강제로 줄바꿈되도록 break-all 추가 */}
                    <span className="break-all">{item.name}</span>

                    {/* 🌟 shrink-0(찌그러짐 방지), whitespace-nowrap(글자 줄바꿈 방지) 추가 */}
                    <span className="shrink-0 whitespace-nowrap text-[11px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full mt-0.5">
                      {item.count}개의 문서에서 참조됨
                    </span>
                  </Link>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    참조 위치: {item.refs.join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2. 필요한 일반 문서 목록 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
            🔗 생성이 필요한 일반 문서
          </h2>
          {missingLinks.length === 0 ? (
            <p className="text-sm text-gray-500">누락된 링크가 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {missingLinks.map((item) => (
                <li
                  key={item.name}
                  className="bg-orange-50 p-3 rounded-md border border-orange-100"
                >
                  <Link
                    href={`/docs/${encodeURIComponent(item.name)}?mode=edit`}
                    // 🌟 gap-3 추가, items-start로 변경
                    className="text-orange-700 font-medium hover:underline flex items-start justify-between gap-3"
                  >
                    {/* 🌟 break-all 추가 */}
                    <span className="break-all">{item.name}</span>

                    {/* 🌟 shrink-0, whitespace-nowrap 추가 */}
                    <span className="shrink-0 whitespace-nowrap text-[11px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full mt-0.5">
                      {item.count}개의 문서에서 참조됨
                    </span>
                  </Link>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    참조 위치: {item.refs.join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
