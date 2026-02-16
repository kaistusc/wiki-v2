'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number; // h1=1, h2=2, h3=3
}

export default function TableOfContents({ content }: { content: string }) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Viewer가 렌더링될 시간을 아주 잠깐 줍니다 (0.1초)
    const timer = setTimeout(() => {
      // 1. Toast UI Viewer가 생성한 콘텐츠 영역을 찾습니다.
      // (클래스명: .toastui-editor-contents)
      const viewerContent = document.querySelector('.toastui-editor-contents');
      if (!viewerContent) return;

      // 2. h1, h2, h3 태그를 모두 가져옵니다.
      const headings = viewerContent.querySelectorAll('h1, h2, h3');
      const items: TocItem[] = [];

      headings.forEach((heading) => {
        // 3. 텍스트와 ID 추출
        const text = heading.textContent?.replace(/¶/g, '').trim() || '';
        const id = heading.id; // Viewer가 이미 id="제목" 형태로 만들어둠
        const level = parseInt(heading.tagName.substring(1));

        if (text && id) {
          items.push({ id, text, level });
        }
      });

      setToc(items);
    }, 100);

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
                className="text-[#0645ad] hover:underline flex items-start gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  // 부드러운 스크롤 이동
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="text-gray-500 text-xs mt-[2px] mr-1">
                   {/* 레벨에 따라 기호 다르게 */}
                   {item.level === 1 ? '' : item.level === 2 ? '1.' : '1.1'}
                   {/* 실제 번호 매기기는 복잡하므로 간단히 점으로 하거나 위처럼 숫자를 흉내낼 수 있습니다. 
                      깔끔하게 가려면 아래처럼 점(•) 추천: */}
                   {/* {item.level === 2 ? '•' : '◦'} */}
                </span>
                <span>{item.text}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}