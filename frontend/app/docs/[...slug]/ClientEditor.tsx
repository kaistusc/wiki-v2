'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { updateWikiPageWithPath } from '@/lib/wiki';
import MarkdownEditor from '@/components/WikiEditor';
import { parseMarkdown, slugify } from '@/lib/parseMarkdown';

/* eslint-disable @typescript-eslint/no-explicit-any */
function ClientPage({ page, title }: { page: any; title: string }) {
  const [editing, setEditing] = useState(false);
  const [markdown, setMarkdown] = useState(page.content);
  const router = useRouter();

  if (editing) {
    return (
      <>
        <MarkdownEditor initialMarkdown={`# ${title}\n${page.content}`} onChange={setMarkdown} />
        <button
          onClick={() => {
            void (async () => {
              const { title, body } = parseMarkdown(markdown);
              console.log('Updating page with title:', title);
              const newSlug = slugify(title);
              console.log('New slug:', newSlug);
              const res = await updateWikiPageWithPath(page.id, title, body, newSlug);

              if (res?.data?.pages?.update?.responseResult?.succeeded) {
                window.location.reload();
                window.location.href = `/docs/${newSlug}`;
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
      <h1>{title}</h1>
      <button onClick={() => setEditing(true)}>수정</button>
      <article dangerouslySetInnerHTML={{ __html: page.render }} />
    </main>
  );
}

export default ClientPage;
