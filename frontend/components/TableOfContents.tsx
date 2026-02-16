'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
  number: string;
}

export default function TableOfContents({ content }: { content: string }) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const viewerContent = document.querySelector('.toastui-editor-contents');
      if (!viewerContent) return;

      // h1 h2 h3 태그 가져오기
      const headings = viewerContent.querySelectorAll('h1, h2, h3');
      const items: TocItem[] = [];

      let h2Count = 0;
      let h3Count = 0;

      headings.forEach((heading) => {
        // ¶ 제거하고 양쪽 공백 제거
        const text = heading.textContent?.replace(/¶/g, '').trim() || '';
        const id = heading.id; // 뷰어가 자동으로 생성한 id 속성 사용
        const level = parseInt(heading.tagName.substring(1));

        if (!text || !id) return;

        let number = '';

        if (level === 2) {
          h2Count++;
          h3Count = 0;
          number = `${h2Count}.`;
        } else if (level === 3) {
          h3Count++;
          number = `${h2Count}.${h3Count}`;
        }

        items.push({ id, text, level, number });
      });

      setToc(items);
    }, 200);

    return () => clearTimeout(timer);
  }, [content]); // content가 바뀌면 목차도 다시 계산

  // 목차가 없으면 숨김
  if (toc.length === 0) return null;

  return (
    <div className="my-4 border border-[#A3A9B1] bg-[#F8F9FA] p-3 text-sm rounded-sm w-1/2 lg:w-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-center w-full">목차</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#0645ad] text-xs hover:underline whitespace-nowrap ml-2"
        >
          [{isOpen ? '숨기기' : '보이기'}]
        </button>
      </div>

      {isOpen && (
        <ul className="list-none m-0 pl-1">
          {toc.map((item, index) => (
            <li
              key={index}
              className={`
                my-1 leading-tight
                ${item.level === 3 ? 'pl-4' : ''} 
                ${item.level >= 4 ? 'pl-8' : ''}
              `}
            >
              <a
                href={`#${item.id}`}
                className="text-[#0645ad] hover:underline flex items-start gap-1 items-center"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="text-gray-500 text-xs mr-1 min-w-[1.5em]">{item.number}</span>
                <span>{item.text}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
