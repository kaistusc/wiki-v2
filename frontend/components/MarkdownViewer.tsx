'use client';

import dynamic from 'next/dynamic';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';

const Viewer = dynamic(() => import('@toast-ui/react-editor').then((m) => m.Viewer), {
  ssr: false,
});

interface Props {
  content: string;
}

export default function MarkdownViewer({ content }: Props) {
  return (
    <div className="toast-ui-viewer-reset">
      <Viewer initialValue={content} key={content} />
    </div>
  );
}