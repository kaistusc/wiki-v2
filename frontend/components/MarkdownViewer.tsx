'use client';

import { useEffect, useState, useRef } from 'react';

interface Props {
  content: string;
}

interface TooltipState {
  visible: boolean;
  content: string;
  number: number | null;
  x: number;
  y: number;
}

export default function MarkdownViewer({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    number: null,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 주석 위 마우스 호버링 처리
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link) return;

      // 하단 각주 영역이거나, 위로 올라가는 백링크인 경우 툴팁 무시
      if (
        link.closest('.footnotes, section.footnotes') ||
        link.getAttribute('href')?.includes('fnref')
      ) {
        return;
      }

      const href = link.getAttribute('href') || '';
      if (!href.includes('#fn')) return;

      // 각주 번호 추출
      const numMatch = href.match(/\d+/);
      if (!numMatch) return;
      const footnoteNumber = parseInt(numMatch[0], 10);

      // 확정된 하단 각주 태그(id="fn{num}") 탐색
      const footnoteEl = document.getElementById(`fn${footnoteNumber}`);

      if (!footnoteEl) return;

      // 각주 내용 복제 후 불필요한 요소 제거
      const clone = footnoteEl.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('a, button').forEach((el) => el.remove());
      const text = clone.textContent?.trim() || '';

      if (!text) return;

      // 툴팁 위치 계산
      const rect = link.getBoundingClientRect();
      setTooltip({
        visible: true,
        content: text,
        number: footnoteNumber,
        x: rect.left,
        y: rect.bottom + 8,
      });
    };

    // 주석 위 마우스 아웃 처리
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a')) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    // 각주 링크 클릭 처리 (백링크 스크롤)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href') || '';
      if (!href.includes('#')) return;

      const isBackToTop = href.includes('fnref');

      if (!isBackToTop) return;

      e.preventDefault();
      e.stopPropagation();

      setTooltip((prev) => ({ ...prev, visible: false }));

      const numMatch = href.match(/\d+/);
      if (!numMatch) return;
      const num = parseInt(numMatch[0], 10);

      // 태그 탐색
      const targetEl = document.getElementById(`fnref${num}`);

      if (targetEl) {
        window.history.pushState(null, '', `#fnref${num}`);

        const targetRect = targetEl.getBoundingClientRect();
        const absoluteTop = targetRect.top + window.scrollY;

        window.scrollTo({
          top: Math.max(0, absoluteTop - 90), // 헤더 여백 고려
          behavior: 'smooth',
        });
      }
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      container.removeEventListener('click', handleClick);
    };
  }, [content]);

  return (
    <div className="relative">
      {/* 마크다운 HTML */}
      <div
        ref={containerRef}
        className="wiki-prose prose max-w-none text-[16px] leading-relaxed text-gray-800"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* 툴팁 */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            zIndex: 99999,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxWidth: '380px',
            fontSize: '13px',
            lineHeight: '1.45',
            color: '#1e293b',
            pointerEvents: 'none',
          }}
        >
          {tooltip.number && (
            <span style={{ color: '#0745AD', fontWeight: 'bold', marginRight: '6px' }}>
              [{tooltip.number}]
            </span>
          )}
          <span>{tooltip.content}</span>
        </div>
      )}
    </div>
  );
}
