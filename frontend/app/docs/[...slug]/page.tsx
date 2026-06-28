import Link from 'next/link';

import { checkPageWasDeleted, fetchAllPages, getWikiPage } from '@/lib/wiki';
import { titleFromSlug } from '@/lib/parseMarkdown';
import { injectTemplates } from '@/lib/templateRenderer';
import WikiError from '@/components/Wikierror';

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
    return <WikiError title="접근 불가" message="해당 경로는 접근이 제한됩니다." />;
  }

  if (temp === '_new') {
    return <NewPageEditor />;
  }

  const page = await getWikiPage(path);

  if (!page) {
    // 페이지가 존재하지 않지만 삭제된 페이지인지 확인
    // 아직 삭제 권한에 대한 논의가 진행되지 않아 유저 정보를 가져오진 않음
    const isDeleted = await checkPageWasDeleted(path);
    if (isDeleted) {
      return (
        <WikiError
          title="문서가 삭제됨"
          message="해당 문서는 삭제되었습니다. 복원을 원하는 경우 학부 총학생회 메일(kaistua@student.kaist.ac.kr)로 문의해주세요."
        />
      );
    }

    if (mode === 'edit') {
      return <NewPageEditor initialTitle={title} />;
    }

    return (
      <WikiError
        code={404}
        title={title}
        message="아직 작성되지 않은 문서입니다."
        actionButton={
          <Link
            href={`/docs/${rawPath}?mode=edit`}
            className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            이 페이지 생성하기
          </Link>
        }
      />
    );
  }

  const rendered = await injectTemplates(page.render);
  const pageWithTemplates = { ...page, render: rendered };

  const allPages = await fetchAllPages();

  return <ClientEditor page={pageWithTemplates} title={title} allPages={allPages} />;
}
