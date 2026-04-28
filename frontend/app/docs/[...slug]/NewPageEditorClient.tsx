'use client';

import { useParams, useRouter } from 'next/navigation';

import { createWikiPage } from '@/lib/wiki';
import { decodeSlug, parseMarkdown, slugify } from '@/lib/parseMarkdown';
import WikiEditorWrapper from '@/components/WikiEditorWrapper';

export default function NewPageEditorClient({
  allPages,
  initialTitle,
}: {
  allPages: { id: number; title: string; path: string }[];
  initialTitle?: string;
}) {
  const markdown = initialTitle
    ? `# ${initialTitle}\n본문을 작성해주세요!`
    : '# 새 문서 만들기\n본문을 작성해주세요!';
  const params = useParams();

  const slugList = decodeSlug(params.slug?.slice(0, -1));
  const parentPath = slugList.join('/');

  const handleSave = async (markdownForStorage: string) => {
    try {
      const { title, body } = parseMarkdown(markdownForStorage);
      const slug = slugify(title);

      const newPath = parentPath ? `${parentPath}/${slug}` : slug;

      const res = await createWikiPage(title, newPath, body);

      if (res?.data?.pages?.create?.responseResult?.succeeded) {
        window.location.reload();
        window.location.href = `/docs/${parentPath}/${slug}`;
      } else {
        console.error(res);
        alert('페이지 생성 실패');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return <WikiEditorWrapper storedContent={markdown} allPages={allPages} onSave={handleSave} />;
}
