'use client';

import { useState } from 'react';

import MarkdownEditor from '@/components/WikiEditor';
import { storageToEditor, editorToStorage } from '@/lib/wikiLinkTransform';

type Props = {
  storedContent: string;
  allPages: { id: number; title: string; path: string }[];
  onSave: (markdownForStorage: string) => Promise<void>;
};

export default function WikiEditorWrapper({ storedContent, allPages, onSave }: Props) {
  const pageById = new Map(allPages.map((p) => [p.id, { title: p.title, path: p.path }]));

  const pageByTitle = new Map(allPages.map((p) => [p.title, { id: p.id }]));

  const [markdown, setMarkdown] = useState(storageToEditor(storedContent, pageById));

  const handleSave = async () => {
    const markdownForStorage = editorToStorage(markdown, pageByTitle);
    console.log(markdownForStorage);

    await onSave(markdownForStorage);
  };

  return (
    <>
      <MarkdownEditor initialMarkdown={markdown} onChange={setMarkdown} />
      <button
        onClick={() => {
          void handleSave();
        }}
      >
        저장
      </button>
    </>
  );
}
