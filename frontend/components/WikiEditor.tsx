'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import '@toast-ui/editor/dist/toastui-editor.css';

const ToastEditor = dynamic(() => import('@toast-ui/react-editor').then((m) => m.Editor), {
  ssr: false,
});

type Props = {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
};

export default function MarkdownEditor({ initialMarkdown, onChange }: Props) {
  const editorRef = useRef<any>(null);

  return (
    <ToastEditor
      ref={editorRef}
      initialValue={initialMarkdown}
      previewStyle="vertical"
      height="70vh"
      initialEditType="markdown"
      hideModeSwitch
      hooks={{
        addImageBlobHook: async (
          blob: Blob | File,
          callback: (url: string, altText?: string) => void
        ) => {
          const file =
            blob instanceof File ? blob : new File([blob], 'image.png', { type: blob.type });

          const fd = new FormData();
          fd.append('file', file);

          console.log('Uploading image...', fd);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: fd,
          });

          if (!res.ok) {
            alert('이미지 업로드 실패');
            return;
          }

          const { url } = await res.json();
          callback(url, file.name);
        },
      }}
      onChange={() => {
        const md = editorRef.current?.getInstance().getMarkdown();
        onChange(md);
      }}
      toolbarItems={[
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol', 'task'],
        ['image', 'link', 'code', 'codeblock'],
      ]}
    />
  );
}
