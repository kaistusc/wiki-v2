'use client';

import { useState } from 'react';

import type { WikiPageHistory } from '@/lib/wiki';
import { renderWikiLinks } from '@/lib/wikiLinks';

import MarkdownViewer from './MarkdownViewer';

type WikiPageSummary = {
  id: number;
  title: string;
  path: string;
};

type HistoryViewProps = {
  pageTitle: string;
  history: WikiPageHistory | null;
  isLoading: boolean;
  pageId: number;
  allPages: WikiPageSummary[];
};

type WikiPageVersion = {
  versionId: number;
  pageId: number;
  title: string;
  description: string;
  path: string;
  locale: string;
  content: string;
  contentType: string;
  editor: string;
  tags: string[];
  isPrivate: boolean;
  isPublished: boolean;
  authorId: string;
  authorName: string;
  action: string;
  createdAt: string;
  versionDate: string;
};

function isTrashPath(path: string | null | undefined) {
  return Boolean(path?.startsWith('__trash__/'));
}

function getActionLabel(
  actionType: string,
  valueBefore?: string | null,
  valueAfter?: string | null
) {
  if (actionType === 'move' || actionType === 'moved') {
    const wasTrash = isTrashPath(valueBefore);
    const isTrash = isTrashPath(valueAfter);

    if (!wasTrash && isTrash) {
      return '삭제';
    }

    if (wasTrash && !isTrash) {
      return '복원';
    }

    return '이동';
  }

  switch (actionType) {
    case 'initial':
      return '문서 생성';
    case 'deleted':
      return '삭제';
    case 'restored':
      return '복원';
    case 'updated':
      return '편집';
    default:
      return '편집';
  }
}

function getActionColorClass(actionLabel: string) {
  switch (actionLabel) {
    case '문서 생성':
      return 'text-green-600';
    case '삭제':
      return 'text-red-600';
    case '복원':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

function formatHistoryDate(versionDate: string) {
  return new Date(versionDate).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function VersionPreview({
  version,
  onBack,
  allPages,
}: {
  version: WikiPageVersion;
  onBack: () => void;
  allPages: WikiPageSummary[];
}) {
  const formattedDate = new Date(version.versionDate).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const pageById = new Map(allPages.map((p) => [p.id, { title: p.title, path: p.path }]));

  const pageByTitle = new Map(allPages.map((p) => [p.title, { title: p.title, path: p.path }]));

  const html = renderWikiLinks(version.content, pageById, pageByTitle);

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-semibold mb-4">{version.title}</h1>

      <div className="mb-8 border border-yellow-400 bg-yellow-50 px-5 py-4 text-sm text-gray-800">
        <p>
          <span className="font-semibold text-blue-700">{version.authorName}</span>
          님의 {formattedDate} 판
        </p>

        <p className="mt-1">
          <button type="button" onClick={onBack} className="text-blue-600 hover:underline">
            역사로 돌아가기
          </button>
        </p>
      </div>

      <MarkdownViewer content={html} />
    </div>
  );
}

export default function HistoryView({
  pageTitle,
  history,
  isLoading,
  pageId,
  allPages,
}: HistoryViewProps) {
  const [selectedVersion, setSelectedVersion] = useState<WikiPageVersion | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);

  async function handleOpenHistoryItem(versionId: number, index: number) {
    console.log('[handleOpenHistoryItem]', { versionId, index });

    if (!history) return;

    try {
      setIsLoadingVersion(true);

      /*
       * Wiki.js pages.version은 클릭한 row의 "결과물"보다
       * 한 단계 이전 스냅샷처럼 동작할 수 있어서 보정합니다.
       *
       * - 최신 row(index === 0): 현재 live 문서를 보여줌
       * - 그 외 row: 바로 위 row의 versionId를 조회해서 클릭한 시점의 결과를 보여줌
       */
      if (index === 0) {
        const res = await fetch(`/api/wiki/current/${pageId}`);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch current page: ${res.status} ${text}`);
        }

        const currentPage = await res.json();

        setSelectedVersion({
          versionId,
          pageId,
          title: currentPage.title,
          description: '',
          path: currentPage.path ?? '',
          locale: 'en',
          content: currentPage.content,
          contentType: 'markdown',
          editor: 'markdown',
          tags: [],
          isPrivate: false,
          isPublished: true,
          authorId: String(currentPage.authorId ?? ''),
          authorName: currentPage.authorName ?? 'Unknown',
          action: 'current',
          createdAt: currentPage.createdAt ?? new Date().toISOString(),
          versionDate: currentPage.updatedAt ?? new Date().toISOString(),
        });

        return;
      }

      const newerItem = history.trail[index - 1];

      if (!newerItem?.versionId || newerItem.versionId <= 0) {
        alert('이 판을 불러올 수 없습니다.');
        return;
      }

      const res = await fetch(`/api/wiki/version/${pageId}/${newerItem.versionId}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch version: ${res.status} ${text}`);
      }

      const version: WikiPageVersion = await res.json();
      const clickedItem = history.trail[index];

      setSelectedVersion({
        ...version,
        /*
         * 실제 content는 보정된 version에서 가져오고,
         * 노란 박스의 날짜/작성자는 사용자가 클릭한 row 기준으로 보여줍니다.
         */
        versionId,
        versionDate: clickedItem.versionDate,
        authorName: clickedItem.authorName,
      });
    } catch (error) {
      console.error('Failed to open version', error);
      alert('선택한 판을 불러오지 못했습니다.');
    } finally {
      setIsLoadingVersion(false);
    }
  }

  if (isLoadingVersion) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-gray-500">
        선택한 판을 불러오는 중...
      </div>
    );
  }

  if (selectedVersion) {
    return (
      <VersionPreview
        version={selectedVersion}
        onBack={() => setSelectedVersion(null)}
        allPages={allPages}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="border-b border-gray-300 pb-3 mb-4">
        <h1 className="text-2xl font-semibold">&quot;{pageTitle}&quot;의 편집 역사</h1>

        <p className="mt-2 text-sm text-blue-600 cursor-pointer hover:underline">
          이 문서의 기록 보기
        </p>
      </div>

      <div className="border border-gray-300 bg-gray-50 mb-4">
        <button
          type="button"
          className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold"
        >
          <span>⌄</span>
          특정판 필터링
        </button>
      </div>

      <div className="text-sm text-gray-800 mb-3 leading-6">
        <p>차이 선택: 비교하려는 판의 라디오 상자를 선택한 다음 아래의 버튼을 누르세요.</p>
        <p>
          설명: <strong>(최신)</strong> = 최신 판과 비교, <strong>(이전)</strong> = 이전 판과 비교,{' '}
          <strong>잔글</strong> = 사소한 편집
        </p>
      </div>

      <button
        type="button"
        className="mb-3 rounded border border-gray-400 bg-white px-3 py-2 text-sm hover:bg-gray-100"
      >
        선택한 판을 비교하기
      </button>

      {isLoading && <div className="py-8 text-sm text-gray-500">편집 역사를 불러오는 중...</div>}

      {!isLoading && !history && (
        <div className="py-8 text-sm text-gray-500">편집 역사를 불러오지 못했습니다.</div>
      )}

      {!isLoading && history && history.trail.length === 0 && (
        <div className="py-8 text-sm text-gray-500">편집 기록이 없습니다.</div>
      )}

      {!isLoading && history && history.trail.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-gray-600">총 {history.total}개의 편집 기록</p>

          <ul className="space-y-1 text-sm">
            {history.trail.map((item, index) => {
              const isLatest = index === 0;
              const formattedDate = formatHistoryDate(item.versionDate);
              const actionLabel = getActionLabel(
                item.actionType,
                item.valueBefore ?? null,
                item.valueAfter ?? null
              );

              return (
                <li
                  key={`${item.versionId}-${item.versionDate}`}
                  className={[
                    'flex items-start gap-2 border border-dashed border-gray-300 px-2 py-1',
                    isLatest ? 'bg-blue-50' : 'bg-white',
                  ].join(' ')}
                >
                  <span className="mt-[2px] text-gray-700">•</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                      <span className="text-gray-700">(</span>

                      {isLatest ? (
                        <span className="font-semibold text-gray-700">최신</span>
                      ) : (
                        <button type="button" className="text-blue-600 hover:underline">
                          최신
                        </button>
                      )}

                      <span className="text-gray-700">|</span>

                      <button type="button" className="text-blue-600 hover:underline">
                        이전
                      </button>

                      <span className="text-gray-700">)</span>

                      <input
                        type="radio"
                        name="history-newer"
                        className="mx-1 h-3 w-3"
                        defaultChecked={index === 0}
                      />

                      <input
                        type="radio"
                        name="history-older"
                        className="mx-1 h-3 w-3"
                        defaultChecked={index === 1}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          void handleOpenHistoryItem(item.versionId, index);
                        }}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {formattedDate}
                      </button>

                      <span className="font-semibold text-red-600">{item.authorName}</span>

                      <span className="text-gray-700">(</span>

                      <button type="button" className="text-red-600 hover:underline">
                        토론
                      </button>

                      <span className="text-gray-700">|</span>

                      <button type="button" className="text-blue-600 hover:underline">
                        기여
                      </button>

                      <span className="text-gray-700">)</span>

                      {item.isMinor && (
                        <span className="font-semibold text-gray-500">. . 잔글</span>
                      )}

                      <span
                        className={['font-semibold', getActionColorClass(actionLabel)].join(' ')}
                      >
                        ({actionLabel})
                      </span>

                      {item.editMessage ? (
                        <span className="text-gray-600">. . ({item.editMessage})</span>
                      ) : item.valueBefore || item.valueAfter ? (
                        <>
                          <span className="text-gray-700">. . </span>
                          <span className="text-gray-600">
                            {actionLabel === '삭제'
                              ? '(문서 삭제)'
                              : actionLabel === '복원'
                                ? '(문서 복원)'
                                : item.valueBefore && item.valueAfter
                                  ? `${item.valueBefore} → ${item.valueAfter}`
                                  : (item.valueAfter ?? item.valueBefore)}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">. . (변경 요약 없음)</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
