import { getWikiPage } from '@/lib/wiki';
import { titleFromSlug } from '@/lib/parseMarkdown';

import ClientEditor from './ClientEditor';

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const safeSlug = slug ?? ['home'];
  const title = titleFromSlug(safeSlug[safeSlug.length - 1]);
  const rawPath = safeSlug.join('/');
  const path = decodeURIComponent(rawPath);
  console.log('Doc page path:', path);

  const page = await getWikiPage(path);
  console.log(page);
  if (!page) return <div>Not Found</div>;

  return <ClientEditor page={page} title={title} />;
}
