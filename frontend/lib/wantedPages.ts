export function analyzeWantedPages(allPages: any[]) {
  const existingTitles = new Set(allPages.map((p) => p.title));
  const existingPaths = new Set(allPages.map((p) => decodeURIComponent(p.path)));

  const wantedLinks = new Map<string, string[]>();
  const wantedTemplates = new Map<string, string[]>();

  allPages.forEach((page) => {
    const content = page.content || '';

    // [[PageName]] 형식
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let linkMatch;
    while ((linkMatch = wikiLinkRegex.exec(content)) !== null) {
      const target = linkMatch[1].trim();
      if (
        !existingTitles.has(target) &&
        !target.startsWith('wiki:') &&
        !target.startsWith('missing:')
      ) {
        if (!wantedLinks.has(target)) wantedLinks.set(target, []);
        if (!wantedLinks.get(target)!.includes(page.title))
          wantedLinks.get(target)!.push(page.title);
      }
    }

    // []() 형식
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let mdMatch;
    while ((mdMatch = mdLinkRegex.exec(content)) !== null) {
      const target = decodeURIComponent(mdMatch[2].trim());

      const isInvalidTarget =
        target.startsWith('http') ||
        target.startsWith('//') ||
        target.startsWith('mailto:') ||
        target.startsWith('/uploads/') ||
        /\.(png|jpe?g|gif|svg|webp|txt|pdf|zip|docx?|xlsx?)$/i.test(target) ||
        /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(target);

      if (!isInvalidTarget && !existingTitles.has(target) && !existingPaths.has(target)) {
        if (!wantedLinks.has(target)) wantedLinks.set(target, []);
        if (!wantedLinks.get(target)!.includes(page.title))
          wantedLinks.get(target)!.push(page.title);
      }
    }

    // (* 틀:TemplateName) 형식
    const templateRegex = /\(\*\s*(틀:[^|)]+)/g;
    let tempMatch;
    while ((tempMatch = templateRegex.exec(content)) !== null) {
      const targetTemplate = tempMatch[1].trim();

      if (!existingTitles.has(targetTemplate) && !existingPaths.has(targetTemplate)) {
        if (!wantedTemplates.has(targetTemplate)) wantedTemplates.set(targetTemplate, []);
        if (!wantedTemplates.get(targetTemplate)!.includes(page.title)) {
          wantedTemplates.get(targetTemplate)!.push(page.title);
        }
      }
    }
  });

  const sortMap = (map: Map<string, string[]>) =>
    Array.from(map.entries())
      .map(([name, refs]) => ({ name, refs, count: refs.length }))
      .sort((a, b) => b.count - a.count);

  return {
    missingLinks: sortMap(wantedLinks),
    missingTemplates: sortMap(wantedTemplates),
  };
}
