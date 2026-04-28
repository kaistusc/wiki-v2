import { fetchAllPages, getWikiPage } from '@/lib/wiki';
import { titleFromSlug } from '@/lib/parseMarkdown';
import { injectTemplates } from '@/lib/templateRenderer';

import ClientEditor from './ClientEditor';
import NewPageEditor from './NewPageEditor';

export default async function DocsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const { mode } = await searchParams;

  const safeSlug = slug ?? ['home'];
  const title = titleFromSlug(safeSlug[safeSlug.length - 1]);
  const rawPath = safeSlug.join('/');
  const path = decodeURIComponent(rawPath);
  const page = await getWikiPage(path);
  const temp = safeSlug[safeSlug.length - 1];

  if (path.startsWith('__trash__')) {
    return <div>Not Found</div>;
  }

  if (temp === '_new') {
    return <NewPageEditor />;
  }
  if (!page) {
    if (mode === 'edit') {
      return <NewPageEditor initialTitle={title} />;
    }

    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p className="text-gray-600 mb-2">페이지가 존재하지 않습니다.</p>
        <a
          href={`/docs/${rawPath}?mode=edit`}
          className="inline-block px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          페이지 생성
        </a>
      </div>
    );
  }

  const rendered = await injectTemplates(page.render);
  const pageWithTemplates = { ...page, render: rendered };

  const allPages = await fetchAllPages();

  return <ClientEditor page={pageWithTemplates} title={title} allPages={allPages} />;
}
