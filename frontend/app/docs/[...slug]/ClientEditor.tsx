'use client';

import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import WikiEditorWrapper from '@/components/WikiEditorWrapper';
import { softDeleteWikiPage, updatePageAndChildren, WikiPageHistory } from '@/lib/wiki';
import { decodeSlug, parseMarkdown, slugify } from '@/lib/parseMarkdown';
import { renderWikiLinks } from '@/lib/wikiLinks';
import MarkdownViewer from '@/components/MarkdownViewer';
import MarkdownEditor from '@/components/WikiEditor';
import TableOfContents from '@/components/TableOfContents';

/* eslint-disable @typescript-eslint/no-explicit-any */
function ClientEditor({
  page,
  title,
  allPages,
}: {
  page: any;
  title: string;
  allPages: { id: number; title: string; path: string }[];
}) {
  const router = useRouter();
  const params = useParams();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEditing = searchParams.get('mode') === 'edit';
  const isHistory = searchParams.get('mode') === 'history';

  const slug = (params.slug ?? []) as string[];
  const decodedSlug = decodeSlug(slug);
  const oldPath = decodedSlug.join('/');
  const pageById = new Map(allPages.map((p) => [p.id, { title: p.title, path: p.path }]));
  const pageByTitle = new Map(allPages.map((p) => [p.title, { title: p.title, path: p.path }]));
  const html = renderWikiLinks(page.render, pageById, pageByTitle);

  const [history, setHistory] = useState<WikiPageHistory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isHistory) return;

    async function fetchHistory() {
      try {
        setIsLoadingHistory(true);

        console.log('Fetching history for page ID:', page.id);

        const res = await fetch(`/api/wiki/history/${page.id}`);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch history: ${res.status} ${text}`);
        }

        const data: WikiPageHistory = await res.json();

        setHistory(data);
      } catch (e) {
        console.error('Failed to fetch history', e);
        alert('역사 정보를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void fetchHistory();
  }, [isHistory, page.id]);

  if (isHistory) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-4">역사 보기</h1>

        {isLoadingHistory && <p>역사 정보를 불러오는 중...</p>}

        {!isLoadingHistory && !history && <p>역사 정보를 불러오지 못했습니다.</p>}

        {!isLoadingHistory && history && history.trail.length === 0 && <p>히스토리가 없습니다.</p>}

        {!isLoadingHistory && history && history.trail.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">총 {history.total}개의 기록</p>

            {history.trail.map((item) => (
              <div key={item.versionId} className="border rounded-md p-4 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Version #{item.versionId}</p>
                    <p className="text-sm text-gray-500">
                      {item.authorName} · {new Date(item.versionDate).toLocaleString()}
                    </p>
                  </div>

                  <span className="text-sm rounded bg-gray-100 px-2 py-1">{item.actionType}</span>
                </div>

                {(item.valueBefore || item.valueAfter) && (
                  <div className="mt-3 text-sm text-gray-700">
                    {item.valueBefore && (
                      <p>
                        <span className="font-medium">Before:</span> {item.valueBefore}
                      </p>
                    )}

                    {item.valueAfter && (
                      <p>
                        <span className="font-medium">After:</span> {item.valueAfter}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (isEditing) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <WikiEditorWrapper
          storedContent={`# ${title}\n${page.content}`}
          allPages={allPages}
          onSave={async (markdownForStorage) => {
            const { title: newTitle, body } = parseMarkdown(markdownForStorage);
            const decodedSlug = decodeSlug(slug);

            const parentPath = decodedSlug.length > 1 ? decodedSlug.slice(0, -1).join('/') : '';
            const newSlug = slugify(newTitle);
            const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

            await updatePageAndChildren(page.id, oldPath, newPath, newTitle, body);

            window.location.href = `/docs/${newPath}`;
          }}
        />
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push(pathname)}
            className="text-gray-500 hover:text-gray-700 underline text-sm"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-none p-0">
      {/* 문서 제목 (공통 최상단) */}
      <header className="mb-0 pb-2 border-b border-gray-200 flex justify-between items-end">
        <h1 className="text-3xl font-sans font-bold text-gray-900 mb-1 tracking-tight">{title}</h1>
      </header>

      <div className="flex flex-col lg:flex-row lg:gap-8 relative">
        <aside className="order-1 lg:order-2 lg:w-64 lg:shrink-0 z-10">
          <div className="lg:sticky lg:top-4">
            <TableOfContents content={html} />
          </div>
        </aside>

        <article className="order-2 lg:order-1 flex-1 min-w-0 prose prose-slate max-w-none text-gray-800 leading-relaxed text-[16px]">
          <MarkdownViewer content={html} />
        </article>
      </div>
    </main>
  );
}

export default ClientEditor;
