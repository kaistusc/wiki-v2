'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { updatePageAndChildren, updateWikiPageWithPath } from '@/lib/wiki';
import MarkdownEditor from '@/components/WikiEditor';
import { decodeSlug, parseMarkdown, slugify } from '@/lib/parseMarkdown';

/* eslint-disable @typescript-eslint/no-explicit-any */
function ClientPage({ page, title }: { page: any; title: string }) {
  const [editing, setEditing] = useState(false);
  const [markdown, setMarkdown] = useState(page.content);
  const router = useRouter();
  const params = useParams();

  const slug = (params.slug ?? []) as string[];
  const currentPath = slug.join('/');

  if (editing) {
    return (
      <>
        <MarkdownEditor initialMarkdown={`# ${title}\n${page.content}`} onChange={setMarkdown} />
        <button
          onClick={() => {
            void (async () => {
              const { title, body } = parseMarkdown(markdown);

              const decodedSlug = decodeSlug(slug);
              const oldPath = decodedSlug.join('/');

              const parentPath = decodedSlug.length > 1 ? decodedSlug.slice(0, -1).join('/') : '';

              const newSlug = slugify(title);
              const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

              await updatePageAndChildren(page.id, oldPath, newPath, title, body);

              window.location.href = `/docs/${newPath}`;
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
      <button
        onClick={() => {
          router.push(`/docs/${currentPath}/_new`);
        }}
      >
        하위 페이지 생성
      </button>
      <article dangerouslySetInnerHTML={{ __html: page.render }} />
    </main>
  );
}

export default ClientPage;
