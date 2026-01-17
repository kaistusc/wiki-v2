export type NavNode = {
  name: string;
  path?: string;
  title?: string;
  children: NavNode[];
};

export function buildTree(pages: { path: string; title: string }[]): NavNode {
  const root: NavNode = { name: 'root', children: [] };

  for (const p of pages) {
    const parts = p.path
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);
    let cur = root;

    parts.forEach((seg, i) => {
      let child = cur.children.find((c) => c.name === seg);
      if (!child) {
        child = { name: seg, children: [] };
        cur.children.push(child);
      }

      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        child.path = p.path;
        child.title = p.title;
      }

      cur = child;
    });
  }

  const sortRec = (node: NavNode) => {
    node.children.sort((a, b) => (a.title ?? a.name).localeCompare(b.title ?? b.name));
    node.children.forEach(sortRec);
  };
  sortRec(root);

  return root;
}
