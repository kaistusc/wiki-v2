'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import '@toast-ui/editor/dist/toastui-editor.css';
import '../app/styles/tui-color-picker-fixed.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';

const ToastEditor = dynamic(() => import('@toast-ui/react-editor').then((m) => m.Editor), {
  ssr: false,
});

type Props = {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
};

const createToolbarButton = (text: string, onClick: () => void) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toastui-editor-toolbar-icon';
  button.innerHTML = text;
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.fontSize = '12px';
  button.style.fontWeight = '600';
  button.style.margin = '0';
  button.style.background = 'none';
  button.style.outline = 'none';
  button.style.cursor = 'pointer';
  button.addEventListener('click', onClick);
  return button;
};

export default function MarkdownEditor({ initialMarkdown, onChange }: Props) {
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toolbarItems, setToolbarItems] = useState<any[] | null>(null);

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

  useEffect(() => {
    const fileButton = createToolbarButton('File', () => {
      fileInputRef.current?.click();
    });

    const footnoteButton = createToolbarButton('각주', () => {
      const editorInstance = editorRef.current?.getInstance();
      if (!editorInstance) return;

      const md = editorInstance.getMarkdown();
      const matches = md.match(/\[\^(\d+)\]/g);
      let nextId = 1;

      if (matches) {
        const ids = matches
          .map((m: string) => parseInt(m.replace(/\D/g, ''), 10))
          .filter((n: number) => !isNaN(n));

        if (ids.length > 0) {
          nextId = Math.max(...ids) + 1;
        }
      }

      editorInstance.insertText(`[^${nextId}]`);
    });

    setToolbarItems([
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['image', 'link', 'table'],
      ['code', 'codeblock'],
      [
        { el: fileButton, tooltip: 'Attach File' },
        { el: footnoteButton, tooltip: 'Insert Footnote' },
      ],
    ]);
  }, []);

  if (!toolbarItems) {
    return (
      <div className="flex justify-center items-center h-[70vh] bg-gray-50 border border-gray-200 rounded-md">
        <span className="text-gray-400 font-medium">에디터 준비 중...</span>
      </div>
    );
  }

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
        plugins={[colorSyntax]}
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
