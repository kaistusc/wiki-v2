'use client';

export default function PermissionCheckingView({
  message = '권한을 확인하는 중...',
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="border border-gray-200 bg-gray-50 px-6 py-5 text-sm text-gray-600">
        {message}
      </div>
    </div>
  );
}
