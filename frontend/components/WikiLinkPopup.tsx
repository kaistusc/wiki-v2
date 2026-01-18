'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import '@toast-ui/editor/dist/toastui-editor.css';

const ToastEditor = dynamic(() => import('@toast-ui/react-editor').then((m) => m.Editor), {
  ssr: false,
});

type WikiPage = {
  id: number;
  title: string;
};

type Props = {
  initialMarkdown: string;
  onChange: (md: string) => void;
  pages: WikiPage[];
};

export default function WikiEditor({ initialMarkdown, onChange, pages }: Props) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [popup, setPopup] = useState<{
    open: boolean;
    query: string;
    top: number;
    left: number;
  }>({ open: false, query: '', top: 0, left: 0 });

  const filtered = pages.filter((p) => p.title.toLowerCase().includes(popup.query.toLowerCase()));

  useEffect(() => {
    const editor = editorRef.current?.getInstance();
    if (!editor) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setPopup((p) => ({ ...p, open: false }));
        return;
      }

      setTimeout(() => {
        const md = editor.getMarkdown();
        const cursor = editor.getCursorPosition();
        const lines = md.split('\n');

        const line = lines[cursor.start.line];
        const uptoCursor = line.slice(0, cursor.start.ch);

        const match = uptoCursor.match(/\[\[([^\]]*)$/);
        if (!match) {
          setPopup((p) => ({ ...p, open: false }));
          return;
        }

        const query = match[1];

        // 커서 DOM 기준 위치 계산
        const rect = editor
          .getEditorElements()
          .mdEditor.querySelector('.CodeMirror-cursor')
          ?.getBoundingClientRect();

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!rect || !containerRect) return;

        const top = rect.bottom - containerRect.top + 8;
        const left = rect.left - containerRect.left;

        setPopup({
          open: true,
          query,
          top,
          left,
        });
      }, 0);
    };

    editor.on('keydown', onKeyDown);

    return () => {
      editor.off('keydown', onKeyDown);
    };
  }, []);

  /** 링크 삽입 */
  const insertLink = (page: WikiPage) => {
    const editor = editorRef.current?.getInstance();
    if (!editor) return;

    editor.replaceSelection(`[[wiki:${page.id}]]`);
    setPopup((p) => ({ ...p, open: false }));
    editor.focus();
  };

  /** 바깥 클릭 시 닫기 */
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPopup((p) => ({ ...p, open: false }));
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <ToastEditor
        ref={editorRef}
        initialValue={initialMarkdown}
        previewStyle="vertical"
        height="70vh"
        initialEditType="markdown"
        hideModeSwitch
        onChange={() => {
          const md = editorRef.current?.getInstance().getMarkdown();
          onChange(md);
        }}
      />

      {popup.open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: popup.top,
            left: popup.left,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 6,
            zIndex: 1000,
            maxHeight: 200,
            overflowY: 'auto',
            minWidth: 220,
            boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          }}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
              }}
              onClick={() => insertLink(p)}
            >
              {p.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
