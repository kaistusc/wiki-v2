import { getWikiPage } from '@/lib/wiki';

export async function injectTemplates(html: string): Promise<string> {
  const templateRegex = /\(\*\s*(틀:[^\)]+)\)/g;
  const matches = [...html.matchAll(templateRegex)];

  if (matches.length === 0) return html;

  const uniqueTemplateNames = Array.from(new Set(matches.map((m) => m[1].trim())));

  const templatesData = await Promise.all(
    uniqueTemplateNames.map(async (name) => {
      const page = await getWikiPage(name).catch(() => null);
      return { name, render: page?.render || null };
    })
  );

  const templateMap = new Map(templatesData.map((t) => [t.name, t.render]));
  let resultHtml = html;

  for (const match of matches) {
    const rawTag = match[0];
    const name = match[1].trim();
    const content = templateMap.get(name);

    const safePath = encodeURIComponent(name);
    const basePath = `/docs/${safePath}`;

    if (content) {
      const templateWrapper = `<div class="wiki-template-container my-6"><div class="wiki-vde text-[11px] text-gray-400 flex gap-1 leading-none border-none mb-0 opacity-70 hover:opacity-100 transition-opacity"><a href="${basePath}" class="hover:text-blue-600 hover:underline" title="보기">V</a>&middot;<a href="${basePath}/discuss" class="hover:text-blue-600 hover:underline" title="토론">D</a>&middot;<a href="${basePath}?mode=edit" class="hover:text-blue-600 hover:underline" title="편집">E</a></div><div class="wiki-template-content w-full border-none [&>*:first-child]:!mt-1 [&>*:last-child]:!mb-0">${content}</div></div>`;
      resultHtml = resultHtml.replace(rawTag, templateWrapper);
    } else {
      const missingLink = `<a href="${basePath}?mode=edit" style="color:#ba0000;font-weight:500;border:1px dashed #ba0000;padding:2px 4px;font-size:0.9em;">[${name} (생성 필요)]</a>`;
      resultHtml = resultHtml.replace(rawTag, missingLink);
    }
  }

  return resultHtml;
}
