import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import html from 'remark-html';

export function parseMarkdown(markdown: string) {
  const trimmed = markdown.trim();
  const lines = trimmed.split('\n');

  const firstLine = lines[0]?.trim();
  if (!firstLine || !firstLine.startsWith('#')) {
    throw new Error('첫 줄은 반드시 "# 제목" 형태여야 합니다.');
  }

  const title = firstLine.replace(/^#+\s*/, '').trim();
  const body = lines.slice(1).join('\n').trim();

  return { title, body };
}

// 마크다운 -> HTML 변환
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm) // GitHub Flavored Markdown 지원
    .use(html, { sanitize: false })
    .process(markdown);

  return result.toString();
}

export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-:]/gu, '')
    .replace(/\s+/g, '-');
}

export function titleFromSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).split('-').join(' ');
  } catch {
    return slug.split('-').join(' ');
  }
}

export function decodeSlug(slug: string[] | string | undefined): string[] {
  if (!slug) return [];
  const arr = Array.isArray(slug) ? slug : [slug];
  return arr.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
}
