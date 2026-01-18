import { escapeHtml } from './escapeHtml';
import { PageById } from './wikiLinkTransform';

export function renderWikiLinks(
  html: string,
  pageById: Map<number, { title: string; path: string }>,
  pageByTitle: Map<string, { title: string; path: string }>
) {
  return html.replace(/\[\[(wiki|missing):([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, type, raw, alias) => {
    const label = alias ?? raw;
    console.log({ type, raw, alias });

    // 1️⃣ id 기반 (항상 안정적)
    if (type === 'wiki') {
      const page = pageById.get(Number(raw));
      if (!page) {
        return redLink(label, raw);
      }
      return blueLink(page.path, page.title);
    }

    // 2️⃣ title 기반 (실시간 판단!)
    const page = pageByTitle.get(raw);
    if (!page) {
      return redLink(label, raw);
    }

    return blueLink(page.path, label);
  });
}

function blueLink(path: string, label: string) {
  return `
    <a href="/docs/${path}" style="color:#0645ad;">
      ${label}
    </a>
  `;
}

function redLink(label: string, title: string) {
  return `
    <a
      href="/write?title=${encodeURIComponent(title)}"
      style="color:#ba0000;font-weight:500"
    >
      ${label}
    </a>
  `;
}
