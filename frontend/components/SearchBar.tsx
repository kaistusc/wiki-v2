'use client';

import { useState } from 'react';
import { searchWikiPages } from '@/lib/wiki';
import Link from 'next/link';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 1) {
        const res = await searchWikiPages(text);
        setResults(res);
    } else {
        setResults([]);
    }
  };

  return (
    <div>
        <input type="text" value={query} onChange={(e) => void handleSearch(e.target.value)} placeholder="검색..." />
        {results.length > 0 && (
            <ul>
                {results.map((page) => (
                    <li key={page.id}>
                        <Link href={`/docs/${encodeURIComponent(page.path)}`} style={{ color: '#0645ad' }}>
                            {page.title}
                        </Link>
                    </li>
                ))}
            </ul>
        )}
    </div>
  )
}