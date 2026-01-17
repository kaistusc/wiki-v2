'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { updateWikiPage } from '@/lib/wiki';
import MarkdownEditor from '@/components/WikiEditor';

/* eslint-disable @typescript-eslint/no-explicit-any */
function ClientPage({ page }: { page: any }) {
  const [editing, setEditing] = useState(false);
  const [markdown, setMarkdown] = useState(page.content);
  const router = useRouter();

  if (editing) {
    return (
      <>
        <MarkdownEditor initialMarkdown={page.content} onChange={setMarkdown} />

        <button
          onClick={() => {
            void (async () => {
              const res = await updateWikiPage(page.id, page.title, markdown);

              if (res?.data?.pages?.update?.responseResult?.succeeded) {
                setEditing(false);
                router.refresh();
              }
            })();
          }}
        >
          저장
        </button>
      </>
    );
  }

  return (
    <main>
      <button onClick={() => setEditing(true)}>수정</button>
      <article dangerouslySetInnerHTML={{ __html: page.render }} />
    </main>
  );
}

export default ClientPage;
