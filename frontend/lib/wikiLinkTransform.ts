export type PageInfo = {
  id: number;
  title: string;
};

export type PageById = Map<number, { title: string; path: string }>;

export type PageByTitle = Map<string, { id: number }>;

export function storageToEditor(markdown: string, pageById: PageById) {
  return markdown.replace(/\[\[wiki:(\d+)(?:\|([^\]]+))?\]\]/g, (_, id, alias) => {
    const page = pageById.get(Number(id));
    if (!page) return '[[존재하지 않는 문서]]';

    if (alias && alias !== page.title) {
      return `[[${page.title}:${alias}]]`;
    }

    return `[[${page.title}]]`;
  });
}

export function editorToStorage(markdown: string, pageByTitle: PageByTitle) {
  return markdown.replace(/\[\[([^:\]]+)(?::([^\]]+))?\]\]/g, (match, title, alias) => {
    const page = pageByTitle.get(title);
    if (!page) return match; // 없는 문서는 그대로

    if (alias && alias !== title) {
      return `[[wiki:${page.id}|${alias}]]`;
    }

    return `[[wiki:${page.id}]]`;
  });
}
