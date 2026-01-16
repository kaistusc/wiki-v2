import { getWikiPage } from '@/lib/wiki';

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params; // ⭐ 핵심
  const safeSlug = slug ?? ['home'];
  const path = safeSlug.join('/');

  const page = await getWikiPage(path);
  if (!page) return <div>Not Found</div>;

  return (
    <main>
      <h1>{page.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: page.render }} />
    </main>
  );
}
