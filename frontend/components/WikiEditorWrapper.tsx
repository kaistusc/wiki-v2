'use client';

import { useState } from 'react';

import MarkdownEditor from '@/components/WikiEditor';
import { storageToEditor, editorToStorage } from '@/lib/wikiLinkTransform';

type WikiRevisionMetaInput = {
  editMessage?: string | null;
  isMinor?: boolean;
};

type Props = {
  storedContent: string;
  allPages: { id: number; title: string; path: string }[];
  onSave: (markdownForStorage: string, revisionMeta: WikiRevisionMetaInput) => Promise<void>;
  isNewPage?: boolean;
};

export default function WikiEditorWrapper({ storedContent, allPages, onSave, isNewPage = false,}: Props) {
  const pageById = new Map(allPages.map((p) => [p.id, { title: p.title, path: p.path }]));

  const pageByTitle = new Map(allPages.map((p) => [p.title, { id: p.id }]));

  const [markdown, setMarkdown] = useState(storageToEditor(storedContent, pageById));

  const [editMessage, setEditMessage] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      const markdownForStorage = editorToStorage(markdown, pageByTitle);

      await onSave(markdownForStorage, {
        editMessage: isNewPage ?null : editMessage.trim() || null,
        isMinor: isNewPage ? false : isMinor,
      });

      setEditMessage('');
      setIsMinor(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <MarkdownEditor initialMarkdown={markdown} onChange={setMarkdown} />

      <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
        {!isNewPage && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                편집 요약
              </span>

              <input
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                maxLength={75}
                placeholder="예: 오타 수정, 내용 보강, 링크 정리"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isMinor}
                onChange={(e) => setIsMinor(e.target.checked)}
              />
              <span>잔글로 표시</span>
            </label>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={isSaving}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </>
  );
}