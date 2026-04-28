import { WikiPageHistory } from '@/lib/wiki';

type HistoryViewProps = {
  pageTitle: string;
  history: WikiPageHistory | null;
  isLoading: boolean;
};

function isTrashPath(path: string | null | undefined) {
  return Boolean(path?.startsWith('__trash__/'));
}

function getActionLabel(
  actionType: string,
  valueBefore?: string | null,
  valueAfter?: string | null
) {
  if (actionType === 'move') {
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
    case 'moved':
      return '이동';
    default:
      return '편집';
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

export default function HistoryView({ pageTitle, history, isLoading }: HistoryViewProps) {
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
              console.log('item', item, {
                actionLabel,
                itemValueBefore: item.valueBefore,
                itemValueAfter: item.valueAfter,
              });

              return (
                <li
                  key={item.versionId}
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

                      <button type="button" className="font-medium text-blue-700 hover:underline">
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
                        className={[
                          'font-semibold',
                          item.actionType === 'initial'
                            ? 'text-green-600'
                            : actionLabel === '삭제'
                              ? 'text-red-600'
                              : actionLabel === '복원'
                                ? 'text-blue-600'
                                : 'text-gray-600',
                        ].join(' ')}
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
