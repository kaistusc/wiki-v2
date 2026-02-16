'use client';

import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';

import WikiEditorWrapper from '@/components/WikiEditorWrapper';
import { softDeleteWikiPage, updatePageAndChildren } from '@/lib/wiki';
import { decodeSlug, parseMarkdown, slugify } from '@/lib/parseMarkdown';
import { renderWikiLinks } from '@/lib/wikiLinks';
import MarkdownViewer from '@/components/MarkdownViewer';
import MarkdownEditor from '@/components/WikiEditor';
import TableOfContents from '@/components/TableOfContents';

/* eslint-disable @typescript-eslint/no-explicit-any */
function ClientEditor({
  page,
  title,
  allPages,
}: {
  page: any;
  title: string;
  allPages: { id: number; title: string; path: string }[];
}) {
  const router = useRouter();
  const params = useParams();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEditing = searchParams.get('mode') === 'edit';

  const slug = (params.slug ?? []) as string[];
  const decodedSlug = decodeSlug(slug);
  const oldPath = decodedSlug.join('/');
  const pageById = new Map(allPages.map((p) => [p.id, { title: p.title, path: p.path }]));
  const pageByTitle = new Map(allPages.map((p) => [p.title, { title: p.title, path: p.path }]));
  const html = renderWikiLinks(page.render, pageById, pageByTitle);

  if (isEditing) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <WikiEditorWrapper
          storedContent={`# ${title}\n${page.content}`}
          allPages={allPages}
          onSave={async (markdownForStorage) => {
            const { title: newTitle, body } = parseMarkdown(markdownForStorage);
            const decodedSlug = decodeSlug(slug);

            const parentPath = decodedSlug.length > 1 ? decodedSlug.slice(0, -1).join('/') : '';
            const newSlug = slugify(newTitle);
            const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

            await updatePageAndChildren(page.id, oldPath, newPath, newTitle, body);

            window.location.href = `/docs/${newPath}`;
          }}
        />
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push(pathname)}
            className="text-gray-500 hover:text-gray-700 underline text-sm"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-none p-0">
      {/* 1. 문서 제목 (공통 최상단) */}
      <header className="mb-0 pb-2 border-b border-gray-200 flex justify-between items-end">
        <h1 className="text-3xl font-sans font-bold text-gray-900 mb-1 tracking-tight">{title}</h1>
      </header>

      <div className="flex flex-col lg:flex-row lg:gap-8 relative">
        <aside className="order-1 lg:order-2 lg:w-64 lg:shrink-0 z-10">
          <div className="lg:sticky lg:top-4">
            <TableOfContents content={html} />
          </div>
        </aside>

        <article className="order-2 lg:order-1 flex-1 min-w-0 prose prose-slate max-w-none text-gray-800 leading-relaxed text-[16px]">
          <MarkdownViewer content={html} />
        </article>
      </div>
    </main>
  );
}

export default ClientEditor;
