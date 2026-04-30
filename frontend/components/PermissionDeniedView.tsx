'use client';

export default function PermissionDeniedView({
  onBack,
  message = '이 작업을 수행할 권한이 없습니다.',
}: {
  onBack: () => void;
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="border border-red-200 bg-red-50 px-6 py-5">
        <h1 className="mb-2 text-xl font-semibold text-red-700">권한이 없습니다</h1>

        <p className="text-sm leading-6 text-red-800">{message}</p>

        <p className="mt-2 text-sm text-red-700">
          로그인 여부와 문서별 권한은 별개입니다. 로그인한 계정에 해당 문서의 작성 또는 편집 권한이
          있는지 확인해주세요.
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={onBack}
            className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
