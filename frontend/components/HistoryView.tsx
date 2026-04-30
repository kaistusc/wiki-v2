'use client';

import { useState } from 'react';

import type { WikiPageHistory } from '@/lib/wiki';
import { renderWikiLinks } from '@/lib/wikiLinks';

import MarkdownViewer from './MarkdownViewer';
import VersionDiffView from './VersionDiffView';

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
  editMessage?: string | null;
  historyIndex: number;
};

type HistoryItemWithDisplay = WikiPageHistory['trail'][number] & {
  displayDate?: string;
  displayAuthorId?: number | null;
  displayAuthorName?: string | null;
};

type DiffNavigationTarget = {
  versionId: number;
  index: number;
};

type DiffVersion = {
  versionId: number;
  versionDate: string;
  authorName: string | null;
  editMessage?: string | null;
  content: string;
  previousVersion?: DiffNavigationTarget | null;
  nextVersion?: DiffNavigationTarget | null;
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
		case 'create':
			return '문서 생성';

		case 'delete':
		case 'deleted':
			return '삭제';

		case 'restore':
		case 'restored':
			return '복원';

		case 'updated':
		case 'edit':
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

function formatByteDiff(byteDiff?: number | null) {
  if (byteDiff === null || byteDiff === undefined) {
    return null;
  }

  if (byteDiff > 0) {
    return `+${byteDiff}`;
  }

  return String(byteDiff);
}

function getByteDiffColorClass(byteDiff?: number | null) {
  if (byteDiff === null || byteDiff === undefined) {
    return 'text-gray-500';
  }

  if (byteDiff > 0) {
    return 'text-green-600';
  }

  if (byteDiff < 0) {
    return 'text-red-600';
  }

  return 'text-gray-500';
}

function getDisplayDate(item: HistoryItemWithDisplay) {
  return item.displayDate ?? item.versionDate;
}

function getDisplayAuthorName(item: HistoryItemWithDisplay) {
  return item.displayAuthorName ?? item.authorName ?? 'Unknown';
}

/**
 * history.trail은 최신순이라고 가정.
 *
 * index가 커질수록 더 오래된 편집.
 * 따라서:
 * - previousVersion: 더 오래된 편집 = index + 1
 * - nextVersion: 더 최신 편집 = index - 1
 */
function getPreviousVersionTarget(
  history: WikiPageHistory,
  index: number
): DiffNavigationTarget | null {
  const previousItem = history.trail[index + 1];

  if (!previousItem) {
    return null;
  }

  return {
    versionId: previousItem.versionId,
    index: index + 1,
  };
}

function getNextVersionTarget(
  history: WikiPageHistory,
  index: number
): DiffNavigationTarget | null {
  const nextItem = history.trail[index - 1];

  if (!nextItem) {
    return null;
  }

  return {
    versionId: nextItem.versionId,
    index: index - 1,
  };
}

function VersionPreview({
  version,
  onBack,
  allPages,
  hasPreviousVersion,
  hasNextVersion,
  onOpenHistoryIndex,
  onCompareWithHistoryIndex,
}: {
  version: WikiPageVersion;
  onBack: () => void;
  allPages: WikiPageSummary[];
  hasPreviousVersion: boolean;
  hasNextVersion: boolean;
  onOpenHistoryIndex: (index: number) => void;
  onCompareWithHistoryIndex: (index: number) => void;
}) {
  const formattedDate = new Date(version.versionDate).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentIndex = version.historyIndex;
  const previousIndex = currentIndex + 1;
  const nextIndex = currentIndex - 1;
  const latestIndex = 0;
  const isLatest = currentIndex === latestIndex;

  const pageById = new Map(allPages.map((p) => [p.id, { title: p.title, path: p.path }]));

  const pageByTitle = new Map(allPages.map((p) => [p.title, { title: p.title, path: p.path }]));

  const renderedContent = renderWikiLinks(version.content, pageById, pageByTitle);

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-semibold mb-4">{version.title}</h1>

      <div className="mb-8 border border-yellow-400 bg-yellow-50 px-5 py-4 text-sm text-gray-800">
        <p>
          <span className="font-semibold text-blue-700">{version.authorName}</span>
          님의 {formattedDate} 판
          {version.editMessage ? (
            <span className="text-gray-700"> ({version.editMessage})</span>
          ) : null}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-1 text-sm">
          {hasPreviousVersion ? (
            <>
              <button
                type="button"
                onClick={() => onCompareWithHistoryIndex(previousIndex)}
                className="text-blue-600 hover:underline"
              >
                (차이)
              </button>

              <button
                type="button"
                onClick={() => onOpenHistoryIndex(previousIndex)}
                className="text-blue-600 hover:underline"
              >
                ← 이전 판
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-400">(차이)</span>
              <span className="text-gray-400">← 이전 판</span>
            </>
          )}

          <span className="text-gray-700">|</span>

          {isLatest ? (
            <span className="font-semibold text-gray-700">최신판</span>
          ) : (
            <button
              type="button"
              onClick={() => onOpenHistoryIndex(latestIndex)}
              className="text-blue-600 hover:underline"
            >
              최신판
            </button>
          )}

          {!isLatest ? (
            <button
              type="button"
              onClick={() => onCompareWithHistoryIndex(latestIndex)}
              className="text-blue-600 hover:underline"
            >
              (차이)
            </button>
          ) : (
            <span className="text-gray-400">(차이)</span>
          )}

          <span className="text-gray-700">|</span>

          {hasNextVersion ? (
            <>
              <button
                type="button"
                onClick={() => onOpenHistoryIndex(nextIndex)}
                className="text-blue-600 hover:underline"
              >
                다음 판 →
              </button>

              <button
                type="button"
                onClick={() => onCompareWithHistoryIndex(nextIndex)}
                className="text-blue-600 hover:underline"
              >
                (차이)
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-400">다음 판 →</span>
              <span className="text-gray-400">(차이)</span>
            </>
          )}
        </div>

        <p className="mt-1">
          <button type="button" onClick={onBack} className="text-blue-600 hover:underline">
            역사로 돌아가기
          </button>
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <article className="order-2 min-w-0 flex-1 prose prose-slate max-w-none text-gray-800 leading-relaxed text-[16px] lg:order-1">
          <MarkdownViewer content={renderedContent} />
        </article>
      </div>
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

  const [selectedNewerIndex, setSelectedNewerIndex] = useState(0);
  const [selectedOlderIndex, setSelectedOlderIndex] = useState(1);

  const [diffVersions, setDiffVersions] = useState<{
    oldVersion: DiffVersion;
    newVersion: DiffVersion;
  } | null>(null);

  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  async function handleOpenHistoryItem(versionId: number, index: number) {
    if (!history) return;

    try {
      setIsLoadingVersion(true);

      const clickedItem = history.trail[index] as HistoryItemWithDisplay;

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
          authorId: String(currentPage.authorId ?? clickedItem.authorId ?? ''),
          authorName: getDisplayAuthorName(clickedItem) ?? currentPage.authorName ?? 'Unknown',
          action: 'current',
          createdAt:
            currentPage.createdAt ?? getDisplayDate(clickedItem) ?? new Date().toISOString(),
          versionDate:
            getDisplayDate(clickedItem) ?? currentPage.updatedAt ?? new Date().toISOString(),
          editMessage: clickedItem.editMessage ?? null,
          historyIndex: index,
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

      setSelectedVersion({
        ...version,
        versionId,
        versionDate: getDisplayDate(clickedItem),
        authorName: getDisplayAuthorName(clickedItem),
        editMessage: clickedItem.editMessage ?? null,
        historyIndex: index,
      });
    } catch (error) {
      console.error('Failed to open version', error);
      alert('선택한 판을 불러오지 못했습니다.');
    } finally {
      setIsLoadingVersion(false);
    }
  }

  async function fetchContentForHistoryIndex(index: number): Promise<DiffVersion> {
    if (!history) {
      throw new Error('History is not loaded.');
    }

    const item = history.trail[index] as HistoryItemWithDisplay;

    if (!item) {
      throw new Error(`Invalid history index: ${index}`);
    }

    const base = {
      versionId: item.versionId,
      versionDate: getDisplayDate(item),
      authorName: getDisplayAuthorName(item),
      editMessage: item.editMessage ?? null,
      previousVersion: getPreviousVersionTarget(history, index),
      nextVersion: getNextVersionTarget(history, index),
    };

    if (index === 0) {
      const res = await fetch(`/api/wiki/current/${pageId}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch current page: ${res.status} ${text}`);
      }

      const currentPage = await res.json();

      return {
        ...base,
        authorName: getDisplayAuthorName(item) ?? currentPage.authorName ?? 'Unknown',
        content: currentPage.content ?? '',
      };
    }

    /**
     * Wiki.js pages.version은 선택한 row 자체가 아니라
     * 바로 위 row의 versionId로 조회해야 해당 row 시점의 content가 나옴.
     */
    const versionProvider = history.trail[index - 1];

    if (!versionProvider?.versionId || versionProvider.versionId <= 0) {
      throw new Error('This version cannot be opened.');
    }

    const res = await fetch(`/api/wiki/version/${pageId}/${versionProvider.versionId}`);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch version: ${res.status} ${text}`);
    }

    const version: WikiPageVersion = await res.json();

    return {
      ...base,
      authorName: getDisplayAuthorName(item) ?? version.authorName ?? 'Unknown',
      content: version.content ?? '',
    };
  }

  async function compareHistoryIndexes(firstIndex: number, secondIndex: number) {
    if (!history) return;

    if (firstIndex === secondIndex) {
      alert('같은 판끼리는 비교할 수 없습니다.');
      return;
    }

    const newerIndex = Math.min(firstIndex, secondIndex);
    const olderIndex = Math.max(firstIndex, secondIndex);

    try {
      setIsLoadingDiff(true);
      setSelectedVersion(null);

      const [oldVersion, newVersion] = await Promise.all([
        fetchContentForHistoryIndex(olderIndex),
        fetchContentForHistoryIndex(newerIndex),
      ]);

      setDiffVersions({
        oldVersion,
        newVersion,
      });
    } catch (error) {
      console.error('Failed to compare versions', error);
      alert('선택한 두 판을 비교하지 못했습니다.');
    } finally {
      setIsLoadingDiff(false);
    }
  }

  async function handleCompareSelectedVersions() {
    await compareHistoryIndexes(selectedNewerIndex, selectedOlderIndex);
  }

  function handleOpenVersionFromDiff(versionId: number) {
    if (!history) return;

    const index = history.trail.findIndex((item) => item.versionId === versionId);

    if (index < 0) {
      alert('해당 판을 찾을 수 없습니다.');
      return;
    }

    setDiffVersions(null);
    void handleOpenHistoryItem(versionId, index);
  }

  async function handleMoveOlderSideFromDiff(target: DiffNavigationTarget) {
    if (!diffVersions) return;

    try {
      setIsLoadingDiff(true);

      const oldVersion = await fetchContentForHistoryIndex(target.index);

      setDiffVersions({
        oldVersion,
        newVersion: diffVersions.newVersion,
      });
    } catch (error) {
      console.error('Failed to move older side in diff', error);
      alert('이전 편집과의 비교를 불러오지 못했습니다.');
    } finally {
      setIsLoadingDiff(false);
    }
  }

  async function handleMoveNewerSideFromDiff(target: DiffNavigationTarget) {
    if (!diffVersions) return;

    try {
      setIsLoadingDiff(true);

      const newVersion = await fetchContentForHistoryIndex(target.index);

      setDiffVersions({
        oldVersion: diffVersions.oldVersion,
        newVersion,
      });
    } catch (error) {
      console.error('Failed to move newer side in diff', error);
      alert('다음 편집과의 비교를 불러오지 못했습니다.');
    } finally {
      setIsLoadingDiff(false);
    }
  }

  if (isLoadingDiff) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-gray-500">
        선택한 두 판을 비교하는 중...
      </div>
    );
  }

  if (diffVersions) {
    return (
      <VersionDiffView
        pageTitle={pageTitle}
        oldVersion={diffVersions.oldVersion}
        newVersion={diffVersions.newVersion}
        allPages={allPages}
        onBack={() => setDiffVersions(null)}
        onOpenVersion={handleOpenVersionFromDiff}
        onMoveOlderSide={(target) => {
          void handleMoveOlderSideFromDiff(target);
        }}
        onMoveNewerSide={(target) => {
          void handleMoveNewerSideFromDiff(target);
        }}
      />
    );
  }

  if (isLoadingVersion) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-gray-500">
        선택한 판을 불러오는 중...
      </div>
    );
  }

  if (selectedVersion) {
    const currentIndex = selectedVersion.historyIndex;

    return (
      <VersionPreview
        version={selectedVersion}
        onBack={() => setSelectedVersion(null)}
        allPages={allPages}
        hasPreviousVersion={Boolean(history?.trail[currentIndex + 1])}
        hasNextVersion={Boolean(history?.trail[currentIndex - 1])}
        onOpenHistoryIndex={(index) => {
          const item = history?.trail[index];

          if (!item) {
            alert('해당 판을 찾을 수 없습니다.');
            return;
          }

          void handleOpenHistoryItem(item.versionId, index);
        }}
        onCompareWithHistoryIndex={(targetIndex) => {
          void compareHistoryIndexes(currentIndex, targetIndex);
        }}
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
        onClick={() => {
          void handleCompareSelectedVersions();
        }}
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
            {history.trail.map((rawItem, index) => {
              const item = rawItem as HistoryItemWithDisplay;

              const isLatest = index === 0;
              const formattedDate = formatHistoryDate(getDisplayDate(item));
              const displayAuthorName = getDisplayAuthorName(item);

              const actionLabel = getActionLabel(
                item.actionType,
                item.valueBefore ?? null,
                item.valueAfter ?? null
              );

              return (
                <li
                  key={`${item.versionId}-${getDisplayDate(item)}`}
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
                        <button
                          type="button"
                          onClick={() => {
                            void compareHistoryIndexes(index, 0);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          최신
                        </button>
                      )}

                      <span className="text-gray-700">|</span>

                      {history.trail[index + 1] ? (
                        <button
                          type="button"
                          onClick={() => {
                            void compareHistoryIndexes(index, index + 1);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          이전
                        </button>
                      ) : (
                        <span className="text-gray-400">이전</span>
                      )}

                      <span className="text-gray-700">)</span>

                      <input
                        type="radio"
                        name="history-newer"
                        className="mx-1 h-3 w-3"
                        checked={selectedNewerIndex === index}
                        onChange={() => setSelectedNewerIndex(index)}
                      />

                      <input
                        type="radio"
                        name="history-older"
                        className="mx-1 h-3 w-3"
                        checked={selectedOlderIndex === index}
                        onChange={() => setSelectedOlderIndex(index)}
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

                      <span className="font-semibold text-red-600">{displayAuthorName}</span>

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

                      {item.byteSize !== null && item.byteSize !== undefined && (
                        <span className="text-gray-700">. . ({item.byteSize} 바이트)</span>
                      )}

                      {item.byteDiff !== null && item.byteDiff !== undefined && (
                        <span
                          className={['font-semibold', getByteDiffColorClass(item.byteDiff)].join(
                            ' '
                          )}
                        >
                          ({formatByteDiff(item.byteDiff)})
                        </span>
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
