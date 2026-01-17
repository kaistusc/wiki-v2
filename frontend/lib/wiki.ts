'use server';

const API = process.env.WIKI_API!;
const TOKEN = process.env.WIKI_TOKEN!;

async function gql(query: string, variables?: any) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  console.log(res);

  return res.json();
}

export async function getWikiPage(path: string, locale = 'en') {
  const data = await gql(
    `
    query ($path: String!, $locale: String!) {
      pages {
        singleByPath(path: $path, locale: $locale) {
          id
          title
          content
          render
        }
      }
    }
    `,
    { path, locale }
  );
  return data.data.pages.singleByPath;
}

type WikiPage = {
  id: number;
  path: string;
  title: string;
};

export async function fetchAllPages(): Promise<WikiPage[]> {
  const res = await fetch(process.env.WIKI_API!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WIKI_TOKEN}`,
    },
    body: JSON.stringify({
      query: `
        query ($locale: String!) {
            pages {
            list(locale: $locale, orderBy: PATH) {
                id
                path
                title
            }
            }
        }
        `,
      variables: {
        locale: 'en',
      },
    }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    return [];
  }
  return json.data.pages.list as WikiPage[];
}

export async function updateWikiPage(id: number, title: string, content: string) {
  return gql(
    `
    mutation (
      $id: Int!
      $title: String!
      $content: String!
      $tags: [String!]!
      $description: String!
      $editor: String!
    ) {
      pages {
        update(
          id: $id
          title: $title
          content: $content
          tags: $tags
          description: $description
          editor: $editor
        ) {
          responseResult {
            succeeded
            message
          }
        }
      }
    }
    `,
    {
      id,
      title,
      content,
      tags: [],
      description: '',
      editor: 'markdown',
    }
  );
}
