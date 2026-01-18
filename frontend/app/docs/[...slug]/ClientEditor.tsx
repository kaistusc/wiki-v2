'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import WikiEditorWrapper from '@/components/WikiEditorWrapper';
import { updatePageAndChildren } from '@/lib/wiki';
import { decodeSlug, parseMarkdown, slugify } from '@/lib/parseMarkdown';
import { renderWikiLinks } from '@/lib/wikiLinks';

/* eslint-disable @typescript-eslint/no-explicit-any */
function ClientPage({
  page,
  title,
  allPages,
}: {
  page: any;
  title: string;
  allPages: { id: number; title: string; path: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const params = useParams();

  const slug = (params.slug ?? []) as string[];
  const decodedSlug = decodeSlug(slug);

  const oldPath = decodedSlug.join('/');
  const pageById = new Map(allPages.map((p) => [p.id, { title: p.title, path: p.path }]));
  const pageByTitle = new Map(allPages.map((p) => [p.title, { title: p.title, path: p.path }]));

  const html = renderWikiLinks(page.render, pageById, pageByTitle);

  if (editing) {
    return (
      <WikiEditorWrapper
        storedContent={`# ${title}\n${page.content}`}
        allPages={allPages}
        onSave={async (markdownForStorage) => {
          const { title, body } = parseMarkdown(markdownForStorage);
          const decodedSlug = decodeSlug(slug);
          const oldPath = decodedSlug.join('/');

          const parentPath = decodedSlug.length > 1 ? decodedSlug.slice(0, -1).join('/') : '';

          const newSlug = slugify(title);
          const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

          await updatePageAndChildren(page.id, oldPath, newPath, title, body);

          window.location.href = `/docs/${newPath}`;
        }}
      />
    );
  }

  return (
    <main>
      <h1>{title}</h1>
      <button onClick={() => setEditing(true)}>수정</button>
      <button
        onClick={() => {
          router.push(`/docs/${oldPath}/_new`);
        }}
      >
        하위 페이지 생성
      </button>
      <article dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}

export default ClientPage;
