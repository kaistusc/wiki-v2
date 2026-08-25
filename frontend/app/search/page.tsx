import Link from 'next/link';

import { searchWikiPages, SearchResultItem } from '@/lib/wiki';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }> | { q?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q?.trim() || '';

  const results: SearchResultItem[] = query ? await searchWikiPages(query) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 검색창 헤더 */}
      <div className="border-b border-[#A3A9B1] pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          검색 결과
          {query && (
            <span className="text-base font-normal text-gray-500 ml-2">
              : &ldquo;{query}&rdquo;
            </span>
          )}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          총 <span className="font-semibold text-gray-800">{results.length}</span>개의 문서를
          찾았습니다.
        </p>
      </div>

      {/* 검색 결과 목록 */}
      {results.length > 0 ? (
        <ul className="space-y-5">
          {results.map((page) => (
            <li key={page.id} className="border-b border-gray-100 pb-4 last:border-none">
              <Link
                href={`/docs/${encodeURIComponent(page.path)}`}
                className="text-lg font-medium text-[#0645ad] hover:underline block"
              >
                {page.title}
              </Link>

              <div className="text-xs text-green-700 mt-0.5">/docs/{page.path}</div>

              {page.description && (
                <p className="text-sm text-gray-700 mt-1 leading-relaxed line-clamp-2">
                  {page.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-12 text-center bg-gray-50 border border-gray-200 rounded">
          <p className="text-gray-600 text-sm mb-3">
            {query ? (
              <>
                <strong className="text-gray-900">&ldquo;{query}&rdquo;</strong>와(과) 일치하는
                문서가 없습니다.
              </>
            ) : (
              '검색어를 입력해 주세요.'
            )}
          </p>

          {query && (
            <p className="text-xs text-gray-500">
              이 위키에{' '}
              <Link
                href={`/docs/${encodeURIComponent(query)}`}
                className="text-[#0645ad] hover:underline font-semibold"
              >
                &lsquo;{query}&rsquo;
              </Link>{' '}
              문서를 직접 생성해 보시겠습니까?
            </p>
          )}
        </div>
      )}
    </div>
  );
}
