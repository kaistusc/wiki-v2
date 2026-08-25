'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { searchWikiPages, SearchResultItem } from '@/lib/wiki';

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
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
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    setIsFocused(true);

    const trimmed = text.trim();
    if (trimmed.length > 0) {
      const res = await searchWikiPages(trimmed);
      setResults(res);
    } else {
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsFocused(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => void handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="검색..."
        className="w-36 md:w-48 border border-[#A3A9B1] px-2 py-[2px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0645ad] focus:border-[#0645ad] transition-all"
      />

      {isFocused && results.length > 0 && (
        <ul className="absolute top-full left-0 w-56 md:w-72 bg-white border border-[#A3A9B1] shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
          {results.map((page) => (
            <li key={page.id} className="border-b border-gray-100 last:border-none">
              <Link
                href={`/docs/${encodeURIComponent(page.path)}`}
                className="block px-3 py-2 text-sm hover:bg-blue-50 transition"
                onClick={() => setIsFocused(false)}
              >
                <div className="font-medium text-[#0645ad] hover:underline truncate">
                  {page.title}
                </div>
                {page.description && (
                  <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {page.description}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isFocused && results.length === 0 && query.trim().length > 0 && (
        <div className="absolute top-full left-0 w-56 md:w-72 bg-white border border-[#A3A9B1] shadow-lg z-50 mt-1 p-3 text-sm text-gray-500">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
