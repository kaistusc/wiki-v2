export type PageInfo = {
  id: number;
  title: string;
};

export type PageById = Map<number, { title: string; path: string }>;

export type PageByTitle = Map<string, { id: number }>;

export function storageToEditor(markdown: string, pageById: PageById) {
  return markdown.replace(
    /\[\[(wiki|missing):([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, type, raw, alias) => {
      if (type === 'missing') {
        const title = raw;
        const label = alias ?? title;

        if (alias && alias !== title) {
          return `[[${title}:${label}]]`;
        }

        return `[[${title}]]`;
      }

      const id = Number(raw);
      const page = pageById.get(id);

      if (!page) {
        const label = alias ?? '존재하지 않는 문서';
        return `[[${label}]]`;
      }

      if (alias && alias !== page.title) {
        return `[[${page.title}:${alias}]]`;
      }

      return `[[${page.title}]]`;
    }
  );
}

export function editorToStorage(markdown: string, pageByTitle: PageByTitle) {
  return markdown.replace(/\[\[([^:\]]+)(?::([^\]]+))?\]\]/g, (match, title, alias) => {
    const page = pageByTitle.get(title);
    if (!page) {
      const display = alias ?? title;
      return `[[missing:${title}|${display}]]`;
    }
    if (alias && alias !== title) {
      return `[[wiki:${page.id}|${alias}]]`;
    }

    return `[[wiki:${page.id}]]`;
  });
}
