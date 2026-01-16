export async function getWikiPage(path: string) {
  console.log('Fetching wiki page for path:', path);
  const res = await fetch(process.env.WIKI_API!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WIKI_TOKEN}`,
    },
    body: JSON.stringify({
      query: `
        query ($path: String!, $locale: String!) {
          pages {
            singleByPath(path: $path, locale: $locale) {
              title
              render
            }
          }
        }
      `,
      variables: {
        path,
        locale: 'en',
      },
    }),
  });

  const json = await res.json();
  return json.data?.pages?.singleByPath;
}
