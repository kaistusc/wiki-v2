'use client';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import HistoryView from '@/components/HistoryView';
import MarkdownViewer from '@/components/MarkdownViewer';
import PermissionCheckingView from '@/components/PermissionCheckingView';
import PermissionDeniedView from '@/components/PermissionDeniedView';
import TableOfContents from '@/components/TableOfContents';
import WikiEditorWrapper from '@/components/WikiEditorWrapper';
import { softDeleteWikiPage, updatePageAndChildren, WikiPageHistory } from '@/lib/wiki';
import { decodeSlug, parseMarkdown, slugify } from '@/lib/parseMarkdown';
import { renderWikiLinks } from '@/lib/wikiLinks';

type PermissionState = 'idle' | 'checking' | 'ready' | 'denied' | 'error';

type PagePermissions = {
  loggedIn: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  message?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}

function isUnauthorizedWikiError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('not authorized') ||
    message.includes('unauthorized') ||
    message.includes('권한') ||
    message.includes('로그인이 필요')
  );
}

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

  const [history, setHistory] = useState<WikiPageHistory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [permissionState, setPermissionState] = useState<PermissionState>('idle');

  const [permissions, setPermissions] = useState<PagePermissions>({
    loggedIn: false,
    canEdit: false,
    canCreate: false,
    canDelete: false,
  });

  const [permissionMessage, setPermissionMessage] = useState('이 문서에 대한 권한이 없습니다.');

  function goBackToDocument() {
    router.push(pathname);
  }

  async function fetchPagePermissions() {
    try {
      setPermissionState('checking');

      const query = new URLSearchParams({
        pageId: String(page.id),
        path: oldPath,
      });

      const res = await fetch(`/api/wiki/auth/page-permissions?${query.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const data = (await res.json().catch(() => null)) as PagePermissions | null;

      if (!res.ok || !data) {
        setPermissions({
          loggedIn: false,
          canEdit: false,
          canCreate: false,
          canDelete: false,
        });
        setPermissionMessage(data?.message ?? '권한 정보를 불러오지 못했습니다.');
        setPermissionState('error');
        return;
      }

      setPermissions(data);
      setPermissionMessage(data.message ?? '이 문서에 대한 권한이 없습니다.');
      setPermissionState('ready');
    } catch (error) {
      console.error('[ClientEditor] failed to fetch page permissions:', error);

      setPermissions({
        loggedIn: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
      });
      setPermissionMessage('권한 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      setPermissionState('error');
    }
  }

  const handleDelete = () => {
    if (!permissions.canDelete) {
      setPermissionMessage('이 문서를 삭제할 권한이 없습니다.');
      setPermissionState('denied');
      return;
    }

    if (!confirm('정말로 이 문서를 휴지통으로 이동하시겠습니까?')) {
      return;
    }

    const executeDelete = async () => {
      try {
        await softDeleteWikiPage(page.id, oldPath);

        window.location.href = '/';
      } catch (error) {
        console.error('문서 삭제 중 오류가 발생했습니다:', error);

        if (isUnauthorizedWikiError(error)) {
          setPermissionMessage('이 문서를 삭제할 권한이 없습니다.');
          setPermissionState('denied');
          return;
        }

        alert('문서를 삭제하는 데 실패했습니다. 다시 시도해 주세요.');
      }
    };

    void executeDelete();
  };

  function handleCreateChildPage() {
    if (!permissions.canCreate) {
      setPermissionMessage('이 문서 아래에 하위 페이지를 만들 권한이 없습니다.');
      setPermissionState('denied');
      return;
    }

    router.push(`/docs/${oldPath}/_new`);
  }

  useEffect(() => {
    void fetchPagePermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, oldPath]);

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

  if (permissionState === 'denied') {
    return <PermissionDeniedView message={permissionMessage} onBack={goBackToDocument} />;
  }

  if (isEditing) {
    if (permissionState === 'idle' || permissionState === 'checking') {
      return <PermissionCheckingView message="편집 권한을 확인하는 중..." />;
    }

    if (permissionState === 'error') {
      return <PermissionDeniedView message={permissionMessage} onBack={goBackToDocument} />;
    }

    if (!permissions.canEdit) {
      return (
        <PermissionDeniedView
          message={
            permissions.loggedIn
              ? '이 문서를 편집할 권한이 없습니다.'
              : '문서를 편집하려면 로그인이 필요합니다.'
          }
          onBack={goBackToDocument}
        />
      );
    }

    return (
      <div className="max-w-5xl mx-auto p-6">
        <WikiEditorWrapper
          storedContent={`# ${title}\n${page.content}`}
          allPages={allPages}
          isNewPage={false}
          onSave={async (markdownForStorage, revisionMeta) => {
            try {
              const { title: newTitle, body } = parseMarkdown(markdownForStorage);
              const decodedSlug = decodeSlug(slug);

              const parentPath = decodedSlug.length > 1 ? decodedSlug.slice(0, -1).join('/') : '';
              const newSlug = slugify(newTitle);
              const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

              await updatePageAndChildren(page.id, oldPath, newPath, newTitle, body, revisionMeta);

              window.location.href = `/docs/${newPath}`;
            } catch (error) {
              console.error('[ClientEditor] failed to save page:', error);

              if (isUnauthorizedWikiError(error)) {
                setPermissionMessage('이 문서를 저장할 권한이 없습니다.');
                setPermissionState('denied');
                return;
              }

              alert('문서를 저장하는 데 실패했습니다. 다시 시도해 주세요.');
            }
          }}
        />

        <div className="mt-4 text-center">
          <button
            type="button"
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

      {(permissions.canCreate || permissions.canDelete) && (
        <div className="flex flex-wrap items-center gap-2 py-3 border-t border-gray-200 mt-6">
          {permissions.canCreate && (
            <button
              type="button"
              onClick={handleCreateChildPage}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              하위 페이지
            </button>
          )}

          {permissions.canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              삭제
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default ClientEditor;
