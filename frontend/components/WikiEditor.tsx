'use client';

import { useRef, useMemo } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        alert('파일 업로드 실패');
        return;
      }

      const { url } = await res.json();

      const editorInstance = editorRef.current?.getInstance();
      if (editorInstance) {
        const currentMarkdown = editorInstance.getMarkdown();

        const contentToInsert = file.type.startsWith('image/')
          ? `![${file.name}](${url})`
          : `[${file.name}](${url})`;

        editorInstance.setMarkdown(currentMarkdown + '\n' + contentToInsert);
      }
    } catch (error) {
      console.error('파일 업로드 중 오류 발생:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toolbarItems = useMemo(() => {
    if (typeof document === 'undefined') return [];

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toastui-editor-toolbar-icon';
    button.innerHTML = 'File';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.fontSize = '13px';
    button.style.fontWeight = '600';
    button.style.margin = '0';
    button.style.background = 'none';
    button.style.outline = 'none';

    button.addEventListener('click', () => {
      fileInputRef.current?.click();
    });

    return [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['image', 'link', 'table'],
      ['code', 'codeblock'],
      [
        {
          el: button,
          tooltip: 'Attach File',
        },
      ],
    ];
  }, []);

  const handleImageUpload = async (
    blob: Blob | File,
    callback: (url: string, altText?: string) => void
  ) => {
    const file = blob instanceof File ? blob : new File([blob], 'image.png', { type: blob.type });

    const fd = new FormData();
    fd.append('file', file);

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
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          void handleFileChange(e);
        }}
        style={{ display: 'none' }}
      />

      <ToastEditor
        ref={editorRef}
        initialValue={initialMarkdown}
        previewStyle="vertical"
        height="70vh"
        initialEditType="markdown"
        hideModeSwitch
        hooks={{
          addImageBlobHook: (
            blob: Blob | File,
            callback: (url: string, altText?: string) => void
          ) => {
            void handleImageUpload(blob, callback);
          },
        }}
        onChange={() => {
          const md = editorRef.current?.getInstance().getMarkdown();
          onChange(md);
        }}
        toolbarItems={toolbarItems}
      />
    </>
  );
}
