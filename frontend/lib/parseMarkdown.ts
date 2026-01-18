export function parseMarkdown(markdown: string) {
  const lines = markdown.split('\n');

  const firstLine = lines[0]?.trim();
  if (!firstLine.startsWith('#')) {
    throw new Error('첫 줄은 반드시 "# 제목" 형태여야 합니다.');
  }

  const title = firstLine.replace(/^#+\s*/, '').trim();
  const body = lines.slice(1).join('\n').trim();

  return { title, body };
}

export function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

export function titleFromSlug(slug: string) {
  return decodeURIComponent(slug).split('-').join(' ');
}
