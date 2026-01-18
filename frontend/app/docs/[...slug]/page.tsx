import { fetchAllPages, getWikiPage } from '@/lib/wiki';
import { titleFromSlug } from '@/lib/parseMarkdown';

import ClientEditor from './ClientEditor';
import NewPageEditor from './NewPageEditor';

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const safeSlug = slug ?? ['home'];
  const title = titleFromSlug(safeSlug[safeSlug.length - 1]);
  const rawPath = safeSlug.join('/');
  const path = decodeURIComponent(rawPath);
  const page = await getWikiPage(path);
  const temp = safeSlug[safeSlug.length - 1];

  if (temp === '_new') {
    return <NewPageEditor />;
  }
  if (!page) return <div>Not Found</div>;

  const allPages = await fetchAllPages();

  return <ClientEditor page={page} title={title} allPages={allPages} />;
}
