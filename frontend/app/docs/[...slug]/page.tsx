import { checkPageWasDeleted, fetchAllPages, getWikiPage } from '@/lib/wiki';
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
  const temp = safeSlug[safeSlug.length - 1];

  // 사용자가 직접 __trash__ 접근 방지
  if (path.startsWith('__trash__')) {
    return <div>해당 경로는 접근이 제한됩니다.</div>;
  }

  if (temp === '_new') {
    return <NewPageEditor />;
  }

  const page = await getWikiPage(path);

  if (!page) {
    if (mode === 'edit') {
      return <NewPageEditor initialTitle={title} />;
    }

    // 페이지가 존재하지 않지만 삭제된 페이지인지 확인
    const isDeleted = await checkPageWasDeleted(path);
    if (isDeleted) {
      return <div>해당 문서는 관리자에 의해 삭제되었습니다. 학부 총학생회로 문의해주세요.</div>;
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
