'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

import { searchWikiPages } from '@/lib/wiki';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    setIsFocused(true);
    if (text.length > 1) {
      const res = await searchWikiPages(text);
      setResults(res);
    } else {
      setResults([]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => void handleSearch(e.target.value)}
        placeholder="검색..."
        className="w-36 md:w-48 border border-[#A3A9B1] px-2 py-[2px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0645ad] focus:border-[#0645ad] transition-all"
      />

      {isFocused && results.length > 0 && (
        <ul className="absolute top-full left-0 w-full bg-white border border-[#A3A9B1] shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
          {results.map((page) => (
            <li key={page.id} className="border-b border-gray-100 last:border-none">
              <Link 
                href={`/docs/${encodeURIComponent(page.path)}`} 
                className="block px-3 py-2 text-sm text-[#0645ad] hover:bg-blue-50 hover:underline truncate"
                onClick={() => setIsFocused(false)}
              >
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isFocused && results.length === 0 && query.length > 1 && (
        <div className="absolute top-full left-0 w-full bg-white border border-[#A3A9B1] shadow-lg z-50 mt-1 p-3 text-sm text-gray-500">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
