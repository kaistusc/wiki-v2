import { fetchRecentPages } from "@/lib/wiki";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";

export default async function Home() {
  return (
    <div>
      <section>
        <h1>카이위키 v2</h1>
        <SearchBar />
      </section>

      <section>
        <h2>최근 수정된 문서</h2>
          <ul>
            { (await fetchRecentPages()).map((page) => (
              <li key={page.id}>
                <Link href={`/docs/${encodeURIComponent(page.path)}`} style={{ color: '#0645ad' }}>
                  {page.title}
                </Link>
              </li>
            )) }
          </ul>
          <Link href="/docs/_new" style={{ color: '#0645ad' }}>
            새 문서 만들기
          </Link>
      </section>
    </div>
  );
}
