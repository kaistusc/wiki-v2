import Link from 'next/link';

import { buildTree, NavNode } from '@/lib/buildTree';
import { fetchAllPages } from '@/lib/wiki';

function Tree({ node }: { node: NavNode }) {
  return (
    <ul>
      {node.children.map((c) => (
        <li key={c.name}>
          {c.path ? (
            <Link href={`/docs/${c.path}`}>{c.title ?? c.name}</Link>
          ) : (
            <span>{c.name}</span>
          )}
          {c.children.length > 0 && <Tree node={c} />}
        </li>
      ))}
    </ul>
  );
}

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const pages = await fetchAllPages();
  const tree = buildTree(pages);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
      <aside>
        <Tree node={tree} />
        <Link href="/write">새 페이지</Link>
      </aside>
      <section>{children}</section>
    </div>
  );
}
