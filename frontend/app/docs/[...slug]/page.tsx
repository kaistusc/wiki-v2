import { getWikiPage } from '@/lib/wiki';

import ClientEditor from './ClientEditor';

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const safeSlug = slug ?? ['home'];
  const path = safeSlug.join('/');

  const page = await getWikiPage(path);
  if (!page) return <div>Not Found</div>;

  return <ClientEditor page={page} />;
}
