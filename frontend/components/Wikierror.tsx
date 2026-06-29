// components/WikiError.tsx
import Link from 'next/link';
import { ReactNode } from 'react';

interface WikiErrorProps {
  code?: number | string;
  title: string;
  message: string;
  showHomeButton?: boolean;
  actionButton?: ReactNode;
}

export default function WikiError({
  code,
  title,
  message,
  showHomeButton = true,
  actionButton,
}: WikiErrorProps) {
  return (
    <div className="max-w-2xl mx-auto p-12 text-center mt-20 bg-gray-50 border border-gray-200">
      <h1 className="text-3xl font-bold text-gray-900 mb-4 flex flex-col justify-center items-center gap-3">
        Error: {code}
      </h1>
      <p className="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">{message}</p>

      <div className="flex justify-center items-center gap-4">
        {actionButton}

        {showHomeButton && (
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            대문으로 돌아가기
          </Link>
        )}
      </div>
    </div>
  );
}
