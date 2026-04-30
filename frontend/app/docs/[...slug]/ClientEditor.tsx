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
import HistoryView from '@/components/HistoryView';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ClientEditor({
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

  const handleDelete = () => {
    if (!confirm('정말로 이 문서를 휴지통으로 이동하시겠습니까?')) return;

    const executeDelete = async () => {
      try {
        await softDeleteWikiPage(page.id, oldPath);

        router.refresh();
        router.replace('/');
      } catch (error) {
        console.error('문서 삭제 중 오류가 발생했습니다:', error);
        alert('문서를 삭제하는 데 실패했습니다. 다시 시도해 주세요.');
      }
    };

    void executeDelete();
  };

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
        console.log('Fetched history data:', data);

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
      <HistoryView
        pageTitle={page.title}
        history={history}
        isLoading={isLoadingHistory}
        pageId={page.id}
        allPages={allPages}
      />
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <WikiEditorWrapper
          storedContent={`# ${title}\n${page.content}`}
          allPages={allPages}
          isNewPage={false}
          onSave={async (markdownForStorage, revisionMeta) => {
            const { title: newTitle, body } = parseMarkdown(markdownForStorage);
            const decodedSlug = decodeSlug(slug);

            const parentPath = decodedSlug.length > 1 ? decodedSlug.slice(0, -1).join('/') : '';
            const newSlug = slugify(newTitle);
            const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

            await updatePageAndChildren(page.id, oldPath, newPath, newTitle, body, revisionMeta);

            router.push(`/docs/${newPath}`);
            router.refresh();
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

      {/* 디자인 위치 수정 필요 */}
      <div className="flex flex-wrap items-center gap-2 py-3 border-t border-gray-200 mt-6">
        <button
          onClick={() => router.push(`/docs/${oldPath}/_new`)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          하위 페이지
        </button>

        <button
          onClick={handleDelete}
          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1"
        >
          삭제
        </button>
      </div>
    </main>
  );
}

export default ClientEditor;
