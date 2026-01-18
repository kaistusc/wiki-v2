'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import MarkdownEditor from '@/components/WikiEditor';
import { createWikiPage } from '@/lib/wiki';
import { parseMarkdown, slugify } from '@/lib/parseMarkdown';
import WikiEditorWrapper from '@/components/WikiEditorWrapper';

export default function ClientPage({
  allPages,
  prefillTitle,
}: {
  allPages: { id: number; title: string; path: string }[];
  prefillTitle?: string;
}) {
  const markdown = prefillTitle
    ? `# ${prefillTitle}\n본문을 작성해주세요!`
    : '# 새 문서 만들기\n본문을 작성해주세요!';
  const handleSave = async (markdownForStorage: string) => {
    try {
      const { title, body } = parseMarkdown(markdownForStorage);
      const slug = slugify(title);
      const res = await createWikiPage(title, slug, body);

      if (res?.data?.pages?.create?.responseResult?.succeeded) {
        window.location.reload();
        window.location.href = `/docs/${slug}`;
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
