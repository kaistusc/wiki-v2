export type NavNode = {
  name: string;
  title?: string;
  path?: string;
  children: NavNode[];
};

export function buildTree(pages: { title: string; path: string }[]): NavNode {
  const root: NavNode = {
    name: '',
    children: [],
  };

  // 🔑 핵심: path → page map
  const pageByPath = new Map<string, { title: string; path: string }>();
  for (const p of pages) {
    pageByPath.set(p.path, p);
  }

  for (const page of pages) {
    const segments = page.path.split('/');
    let current = root;

    let accPath = '';

    for (const segment of segments) {
      accPath = accPath ? `${accPath}/${segment}` : segment;

      let child = current.children.find((c) => c.name === segment);

      if (!child) {
        child = {
          name: segment,
          children: [],
        };
        current.children.push(child);
      }

      // ✅ 이 노드가 실제 페이지인지 확인
      const matchedPage = pageByPath.get(accPath);
      if (matchedPage) {
        child.path = matchedPage.path;
        child.title = matchedPage.title;
      }

      current = child;
    }
  }

  return root;
}
