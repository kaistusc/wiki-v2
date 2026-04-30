'use client';

type WikiPageSummary = {
  id: number;
  title: string;
  path: string;
};

type DiffNavigationTarget = {
  versionId: number;
  index: number;
};

type DiffSide = {
  versionId: number;
  versionDate: string;
  authorName: string | null;
  editMessage?: string | null;
  content: string;
  previousVersion?: DiffNavigationTarget | null;
  nextVersion?: DiffNavigationTarget | null;
};

type DiffRow = {
  left: string | null;
  right: string | null;
  type: 'same' | 'removed' | 'added' | 'changed';
  oldLineNumber?: number | null;
  newLineNumber?: number | null;
};

type VisibleDiffRow =
  | DiffRow
  | {
      type: 'context';
      left: null;
      right: null;
      skippedCount: number;
    };

function formatDiffDate(versionDate: string) {
  return new Date(versionDate).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildLineDiff(oldContent: string, newContent: string): DiffRow[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const dp = Array.from({ length: oldLines.length + 1 }, () =>
    Array<number>(newLines.length + 1).fill(0)
  );

  for (let i = oldLines.length - 1; i >= 0; i -= 1) {
    for (let j = newLines.length - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      rows.push({
        left: oldLines[i],
        right: newLines[j],
        type: 'same',
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
      });

      i += 1;
      j += 1;
      continue;
    }

    const removed: { text: string; lineNumber: number }[] = [];
    const added: { text: string; lineNumber: number }[] = [];

    while (i < oldLines.length && (j >= newLines.length || dp[i + 1][j] >= dp[i][j + 1])) {
      removed.push({
        text: oldLines[i],
        lineNumber: i + 1,
      });

      i += 1;

      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        break;
      }
    }

    while (j < newLines.length && (i >= oldLines.length || dp[i][j + 1] > dp[i + 1]?.[j])) {
      added.push({
        text: newLines[j],
        lineNumber: j + 1,
      });

      j += 1;

      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        break;
      }
    }

    const max = Math.max(removed.length, added.length);

    for (let k = 0; k < max; k += 1) {
      const left = removed[k] ?? null;
      const right = added[k] ?? null;

      rows.push({
        left: left?.text ?? null,
        right: right?.text ?? null,
        oldLineNumber: left?.lineNumber ?? null,
        newLineNumber: right?.lineNumber ?? null,
        type: left && right ? 'changed' : left ? 'removed' : 'added',
      });
    }
  }

  return rows;
}

function buildContextualRows(rows: DiffRow[], contextSize = 2): VisibleDiffRow[] {
  const changedIndexes = rows
    .map((row, index) => (row.type === 'same' ? null : index))
    .filter((index): index is number => index !== null);

  if (changedIndexes.length === 0) {
    return [];
  }

  const visibleIndexes = new Set<number>();

  for (const index of changedIndexes) {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(rows.length - 1, index + contextSize);

    for (let i = start; i <= end; i += 1) {
      visibleIndexes.add(i);
    }
  }

  const visibleRows: VisibleDiffRow[] = [];
  let previousVisibleIndex = -1;

  for (let index = 0; index < rows.length; index += 1) {
    if (!visibleIndexes.has(index)) {
      continue;
    }

    if (previousVisibleIndex !== -1 && index - previousVisibleIndex > 1) {
      visibleRows.push({
        type: 'context',
        left: null,
        right: null,
        skippedCount: index - previousVisibleIndex - 1,
      });
    }

    visibleRows.push(rows[index]);
    previousVisibleIndex = index;
  }

  return visibleRows;
}

function getDiffCellClass(type: DiffRow['type'], side: 'left' | 'right') {
  if (type === 'same') {
    return 'bg-gray-50 text-gray-700 border-gray-200';
  }

  if (type === 'removed' && side === 'left') {
    return 'bg-red-50 text-gray-900 border-red-300';
  }

  if (type === 'added' && side === 'right') {
    return 'bg-blue-50 text-gray-900 border-blue-300';
  }

  if (type === 'changed') {
    return side === 'left'
      ? 'bg-red-50 text-gray-900 border-red-300'
      : 'bg-blue-50 text-gray-900 border-blue-300';
  }

  return 'bg-white text-gray-300 border-gray-200';
}

function DiffLineNumber({ value }: { value?: number | null }) {
  return (
    <span className="mr-2 inline-block w-8 shrink-0 select-none text-right text-xs text-gray-400">
      {value ?? ''}
    </span>
  );
}

function DiffCell({ row, side }: { row: DiffRow; side: 'left' | 'right' }) {
  const value = side === 'left' ? row.left : row.right;
  const lineNumber = side === 'left' ? row.oldLineNumber : row.newLineNumber;
  const prefix = row.type === 'same' || value === null ? '' : side === 'left' ? '- ' : '+ ';

  return (
    <div
      className={[
        'min-h-7 whitespace-pre-wrap rounded border px-2 py-1.5 font-mono text-[13px] leading-5',
        getDiffCellClass(row.type, side),
      ].join(' ')}
    >
      <div className="flex items-start">
        <DiffLineNumber value={lineNumber} />
        <span className="min-w-0 flex-1">
          {prefix}
          {value ?? ''}
        </span>
      </div>
    </div>
  );
}

function DiffVersionHeader({
  version,
  side,
  isLatest = false,
  onOpenVersion,
  onMoveOlderSide,
  onMoveNewerSide,
}: {
  version: DiffSide;
  side: 'old' | 'new';
  isLatest?: boolean;
  onOpenVersion: (versionId: number) => void;
  onMoveOlderSide: (target: DiffNavigationTarget) => void;
  onMoveNewerSide: (target: DiffNavigationTarget) => void;
}) {
  return (
    <div className="text-center text-sm leading-6">
      <button
        type="button"
        onClick={() => onOpenVersion(version.versionId)}
        className={[
          'font-semibold hover:underline',
          isLatest ? 'text-blue-900' : 'text-blue-700',
          // TODO: 여기 최신 색을 다르게 하고 싶은데, 색을 못 잡겠음
        ].join(' ')}
      >
        {formatDiffDate(version.versionDate)} 판 {isLatest ? '(원본 보기 / 최신)' : '(원본 보기)'}
      </button>

      <div>
        <span>{version.authorName ?? 'Unknown'}</span>
      </div>

      {version.editMessage ? (
        <div className="text-gray-700">({version.editMessage})</div>
      ) : (
        <div className="text-gray-500">(변경 요약 없음)</div>
      )}

      <div className="mt-1 text-gray-500">{side === 'old' ? '이전 판' : '다음 판'}</div>

      <div className="mt-1 text-blue-700">
        {side === 'old' && version.previousVersion && (
          <button
            type="button"
            onClick={() => onMoveOlderSide(version.previousVersion!)}
            className="hover:underline"
          >
            ← 이전 편집
          </button>
        )}

        {side === 'new' && version.nextVersion && (
          <button
            type="button"
            onClick={() => onMoveNewerSide(version.nextVersion!)}
            className="hover:underline"
          >
            다음 편집 →
          </button>
        )}
      </div>
    </div>
  );
}

export default function VersionDiffView({
  pageTitle,
  oldVersion,
  newVersion,
  onBack,
  onOpenVersion,
  onMoveOlderSide,
  onMoveNewerSide,
}: {
  pageTitle: string;
  oldVersion: DiffSide;
  newVersion: DiffSide;
  allPages: WikiPageSummary[];
  onBack: () => void;

  // 날짜 클릭: 해당 판 원본 preview로 이동
  onOpenVersion: (versionId: number) => void;

  // 왼쪽 이전 판의 "← 이전 편집": diff 화면에서 왼쪽 판만 더 이전 판으로 변경
  onMoveOlderSide: (target: DiffNavigationTarget) => void;

  // 오른쪽 다음 판의 "다음 편집 →": diff 화면에서 오른쪽 판만 더 최신 판으로 변경
  onMoveNewerSide: (target: DiffNavigationTarget) => void;
}) {
  const rows = buildLineDiff(oldVersion.content, newVersion.content);
  const visibleRows = buildContextualRows(rows, 2);

  const isOldVersionLatest = !oldVersion.nextVersion;
  const isNewVersionLatest = !newVersion.nextVersion;

  return (
    <div className="max-w-7xl mx-auto px-6 py-5">
      <div className="mb-3 border-b border-gray-400 pb-2">
        <h1 className="text-2xl font-semibold">&quot;{pageTitle}&quot;의 두 판 사이의 차이</h1>
      </div>

      <div className="mb-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full border border-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-50"
        >
          역사로 돌아가기
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <DiffVersionHeader
          version={oldVersion}
          side="old"
          isLatest={isOldVersionLatest}
          onOpenVersion={onOpenVersion}
          onMoveOlderSide={onMoveOlderSide}
          onMoveNewerSide={onMoveNewerSide}
        />

        <DiffVersionHeader
          version={newVersion}
          side="new"
          isLatest={isNewVersionLatest}
          onOpenVersion={onOpenVersion}
          onMoveOlderSide={onMoveOlderSide}
          onMoveNewerSide={onMoveNewerSide}
        />
      </div>

      <div className="overflow-x-auto border-t border-gray-400 pt-3">
        <div className="grid min-w-[900px] grid-cols-[1fr_1fr] gap-x-2 gap-y-1.5">
          <div className="mb-1 text-sm font-semibold">이전 판</div>
          <div className="mb-1 text-sm font-semibold">다음 판</div>

          {visibleRows.length === 0 && (
            <div className="col-span-2 rounded border border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
              두 판 사이에 표시할 변경 사항이 없습니다.
            </div>
          )}

          {visibleRows.map((row, index) => {
            if (row.type === 'context') {
              return (
                <div
                  key={`context-${index}`}
                  className="col-span-2 rounded border border-gray-200 bg-gray-100 px-3 py-1 text-center text-xs text-gray-500"
                >
                  변경 없는 {row.skippedCount}줄 생략
                </div>
              );
            }

            return (
              <div key={`diff-${index}`} className="contents">
                <DiffCell row={row} side="left" />
                <DiffCell row={row} side="right" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
