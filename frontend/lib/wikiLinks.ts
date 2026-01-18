import { slugify } from './parseMarkdown';
import { PageById } from './wikiLinkTransform';

export function renderWikiLinks(html: string, pageById: PageById) {
  return html.replace(/\[\[wiki:(\d+)(?:\|([^\]]+))?\]\]/g, (_, id, alias) => {
    const page = pageById.get(Number(id));
    if (!page) {
      return `<span class="wiki-link-missing">없는 문서</span>`;
    }

    const text = alias || page.title;

    return `<a href="/docs/${page.path}" class="wiki-link">${text}</a>`;
  });
}

export function renderWikiLinksById(
  html: string,
  pageMap: Map<number, { title: string; path: string }>
) {
  return html.replace(/\[\[wiki:(\d+)\]\]/g, (_, id) => {
    const page = pageMap.get(Number(id));

    if (!page) {
      // 존재하지 않는 페이지 → 빨간 링크
      return `<span style="color:red">[[존재하지 않는 문서]]</span>`;
    }

    return `<a href="/docs/${page.path}" class="wiki-link">
        ${page.title}
      </a>`;
  });
}
