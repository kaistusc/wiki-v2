import { getWikiPage } from '@/lib/wiki';

export async function injectTemplates(html: string): Promise<string> {
  if (!html || typeof html !== 'string') return html || '';

  // (* 틀:TemplateName | arg1=val1 | arg2=val2) 템플릿 호출 찾기
  const templateRegex = /\(\*\s*(틀:[^|)]+)(?:\|([^)]+))?\)/g;
  const matches = [...html.matchAll(templateRegex)];

  if (matches.length === 0) return html;

  const uniqueTemplateNames = Array.from(new Set(matches.map((m) => m[1].trim())));

  const templatesData = await Promise.all(
    uniqueTemplateNames.map(async (name) => {
      const page = await getWikiPage(name).catch(() => null);
      return { name, render: page?.render || null };
    })
  );

  // 템플릿 이름과 렌더링된 HTML을 매핑
  const templateMap = new Map(templatesData.map((t) => [t.name, t.render]));
  let resultHtml = html;

  for (const match of matches) {
    const rawTag = match[0]; // (* 틀:회장 | 이름=최정흠 | 소속=항공우주공학과)
    const name = match[1].trim(); // 틀:회장
    const argString = match[2]; // 이름=최정흠 | 소속=항공우주공학과

    const rawContent = templateMap.get(name);
    const safePath = encodeURIComponent(name);
    const basePath = `/docs/${safePath}`;

    if (rawContent) {
      // 인자 파싱
      const args: Record<string, string> = {};

      if (argString) {
        const parts = argString.split('|');

        parts.forEach((part) => {
          const trimmed = part.trim();
          const eqIndex = trimmed.indexOf('=');

          if (eqIndex !== -1) {
            const key = trimmed.substring(0, eqIndex).trim();
            const val = trimmed.substring(eqIndex + 1).trim();
            args[key] = val;
          } else if (trimmed.length > 0) {
            console.warn(
              `[Template] 무시된 인자: "${trimmed}". 틀(${name}) 호출 시 모든 인자는 '이름=값' 형태여야 합니다.`
            );
          }
        });
      }

      // 템플릿의 {{{변수명}}} 치환 처리
      const processedContent = rawContent.replace(
        /\{\{\{([^}]+)\}\}\}/g,
        (_: string, key: string) => {
          const trimmedKey = key.trim();
          // 인자가 제공되지 않은 경우 빈 문자열 반환
          return args[trimmedKey] !== undefined ? args[trimmedKey] : '';
        }
      );

      const templateWrapper = `<div class="wiki-template-container my-6"><div class="wiki-vde text-[11px] text-gray-400 flex gap-1 leading-none border-none mb-0 opacity-70 hover:opacity-100 transition-opacity"><a href="${basePath}" class="hover:text-blue-600 hover:underline" title="보기">V</a>&middot;<a href="${basePath}/discuss" class="hover:text-blue-600 hover:underline" title="토론">D</a>&middot;<a href="${basePath}?mode=edit" class="hover:text-blue-600 hover:underline" title="편집">E</a></div><div class="wiki-template-content w-full border-none [&>*:first-child]:!mt-1 [&>*:last-child]:!mb-0">${processedContent}</div></div>`;

      resultHtml = resultHtml.replace(rawTag, templateWrapper);
    } else {
      const missingLink = `<a href="${basePath}?mode=edit" style="color:#ba0000;font-weight:500;border:1px dashed #ba0000;padding:2px 4px;font-size:0.9em;">[${name} (생성 필요)]</a>`;
      resultHtml = resultHtml.replace(rawTag, missingLink);
    }
  }

  return resultHtml;
}
