'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function WikiTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEditing = searchParams.get('mode') === 'edit';
  const isTalk = pathname.startsWith('/talk'); 

  const activeClass = 
    "px-2 flex items-center bg-white border border-[#A7D7F9] border-b-white border-t-white text-sm font-bold text-gray-900 cursor-default";

  const inactiveClass = 
    "px-2 flex items-center bg-gradient-to-b from-[#fbfbfb] to-[#f0f0f0] border border-[#A7D7F9] border-t-white text-sm text-[#0745AD] hover:bg-white transition-colors";

  return (
    <div className="flex h-full z-10 w-full">
        <Link 
            href={pathname}
            className={activeClass}
        >
            문서
        </Link>

        <Link 
            href="#" 
            className={inactiveClass}
        >
            토론
        </Link>

        <div className="flex-1"></div>

        <div className="flex h-full z-10 mr-4">
        <Link 
            href={pathname}
            className={!isEditing ? activeClass : inactiveClass}
        >
            읽기
        </Link>
        <Link 
            href={`${pathname}?mode=edit`} 
            className={isEditing ? activeClass : inactiveClass}
        >
            편집
        </Link>
        <Link 
            href="#" 
            className={inactiveClass}
        >
            역사 보기
        </Link>
        </div>
    </div>
  );
}