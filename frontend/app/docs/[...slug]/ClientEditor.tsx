'use client';

import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';

import WikiEditorWrapper from '@/components/WikiEditorWrapper';
import { softDeleteWikiPage, updatePageAndChildren } from '@/lib/wiki';
import { decodeSlug, parseMarkdown, slugify } from '@/lib/parseMarkdown';
import { renderWikiLinks } from '@/lib/wikiLinks';

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
    <main className="max-w-4xl p-0 md:p-0">
      
      {}
      <header className="mb-2 pb-2 border-b border-gray-200">
        <h1 className="text-4xl text-gray-900 tracking-tight">
          {title}
        </h1>

        {/* <div className="flex flex-wrap items-center gap-2">
          {}
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            ✏️ 편집
          </button>

          {}
          <button
            onClick={() => router.push(`/docs/${oldPath}/_new`)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            ➕ 하위 페이지
          </button>

          {}
          <button
            onClick={() => {
              if (!confirm('정말로 이 문서를 휴지통으로 이동하시겠습니까?')) return;
              void (async () => {
                await softDeleteWikiPage(page.id, oldPath);
                window.location.href = '/docs/home';
              })();
            }}
            className="ml-auto px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors flex items-center gap-1"
          >
            🗑️ 삭제
          </button>
        </div> */}
      </header>

      {}
      {}
      <article className="prose prose-slate max-w-none text-gray-800 leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>

    </main>
  );
}

export default ClientEditor;