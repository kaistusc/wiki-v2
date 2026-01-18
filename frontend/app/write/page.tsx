'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import MarkdownEditor from '@/components/WikiEditor';
import { createWikiPage } from '@/lib/wiki';
import { parseMarkdown, slugify } from '@/lib/parseMarkdown';

export default function ClientPage() {
  const [markdown, setMarkdown] = useState('# Title here');
  const router = useRouter();

  const handleSave = async () => {
    try {
      const { title, body } = parseMarkdown(markdown);
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

  return (
    <>
      <MarkdownEditor initialMarkdown={markdown} onChange={setMarkdown} />

      <button
        onClick={() => {
          void handleSave();
        }}
      >
        저장
      </button>
    </>
  );
}
