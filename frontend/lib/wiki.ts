'use server';

import { rewriteChildPath } from './buildTree';

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

export async function updateWikiPageWithPath(
  id: number,
  title: string,
  content: string,
  path: string,
  locale = 'en'
) {
  return gql(
    `
    mutation UpdatePage(
      $id: Int!
      $title: String!
      $content: String!
      $path: String!
      $locale: String!
      $tags: [String!]!
      $description: String!
      $editor: String!
      $isPrivate: Boolean!
    ) {
      pages {
        update(
          id: $id
          title: $title
          content: $content
          path: $path
          locale: $locale
          tags: $tags
          description: $description
          editor: $editor
          isPrivate: $isPrivate
          isPublished: true
        ) {
          responseResult {
            succeeded
            message
          }
          page {
            id
            path
            locale
          }
        }
      }
    }
    `,
    {
      id,
      title,
      content,
      path,
      locale,
      tags: [],
      description: '',
      editor: 'markdown',
      isPrivate: false,
    }
  );
}

export async function createWikiPage(title: string, path: string, content: string, locale = 'en') {
  return gql(
    `
    mutation CreatePage(
      $title: String!
      $path: String!
      $content: String!
      $locale: String!
      $tags: [String!]!
      $description: String!
      $editor: String!
      $isPrivate: Boolean!
    ) {
      pages {
        create(
          title: $title
          path: $path
          content: $content
          locale: $locale
          tags: $tags
          description: $description
          editor: $editor
          isPublished: true
          isPrivate: $isPrivate
        ) {
          responseResult {
            succeeded
            message
          }
          page {
            id
            path
          }
        }
      }
    }
    `,
    {
      title,
      path,
      content,
      locale,
      tags: [],
      description: '',
      editor: 'markdown',
      isPrivate: false,
    }
  );
}

export async function listPages() {
  return gql(
    `
    query ($locale: String!) {
      pages {
        list(locale: $locale) {
          id
          path
          title
        }
      }
    }
    `,
    { locale: 'en' }
  );
}

export async function updatePageAndChildren(
  pageId: number,
  oldPath: string,
  newPath: string,
  title: string,
  content: string
) {
  if (oldPath === newPath) {
    await updateWikiPageWithPath(pageId, title, content, newPath);
    return;
  }
  await updateWikiPageWithPath(pageId, title, content, newPath);

  const listRes = await listPages();
  const pages = listRes?.data?.pages?.list ?? [];

  const children = pages.filter((p: any) => p.path.startsWith(oldPath + '/'));

  for (const child of children) {
    const pageRes = await getPageContentById(child.id);
    const childPage = pageRes?.data?.pages?.single;

    if (!childPage) continue;

    const newChildPath = newPath + child.path.slice(oldPath.length);

    await updateWikiPageWithPath(child.id, childPage.title, childPage.content, newChildPath);
  }
}

export async function getPageContentById(id: number) {
  return gql(
    `
    query ($id: Int!) {
      pages {
        single(id: $id) {
          id
          title
          content
        }
      }
    }
    `,
    { id }
  );
}
