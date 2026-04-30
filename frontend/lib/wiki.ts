'use server';

import { formatDeleteTimestamp } from './time';

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
  const pages = json.data.pages.list;
  const availablePages = pages.filter((page: WikiPage) => !page.path.startsWith('__trash__/'));
  return availablePages as WikiPage[];
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

export async function deleteWikiPage(pageId: number) {
  return gql(
    `
    mutation ($id: Int!) {
      pages {
        delete(id: $id) {
          responseResult {
            succeeded
            message
          }
        }
      }
    }
    `,
    { id: pageId }
  );
}

export async function softDeleteWikiPage(pageId: number, currentPath: string) {
  const ts = formatDeleteTimestamp();
  const trashPath = `__trash__/${currentPath}__deleted__${ts}`;
  const pageRes = await getPageContentById(pageId);
  return updateWikiPageWithPath(
    pageId,
    pageRes.data.pages.single.title,
    pageRes.data.pages.single.content,
    trashPath
  );
}

export async function fetchRecentPages(limit = 5): Promise<any[]> {
  const res = await gql(
    `
    query ($limit: Int!) {
      pages {
        list(limit: $limit, orderBy: UPDATED, orderByDirection: DESC) {
          id
          title
          path
        }
      }
    }
    `,
    { limit }
  );

  return res?.data?.pages?.list ?? [];
}

export async function searchWikiPages(query: string): Promise<any[]> {
  const res = await gql(
    `
    query ($query: String!) {
      pages {
        search(query: $query) {
          results {
            id
            title
            path
          }
        }
      }
    }
    `,
    { query }
  );

  const allResults = res?.data?.pages?.search.results ?? [];

  const withoutDeletedResults = allResults.filter(
    (page: any) => !page.path.startsWith('__trash__/')
  );

  return withoutDeletedResults;
}

// 역사 보기
export type WikiPageHistoryItem = {
  versionId: number;
  versionDate: string;
  authorId: number;
  authorName: string;
  actionType: string;
  valueBefore: string | null;
  valueAfter: string | null;
};

export type WikiPageVersion = {
  versionId: number;
  pageId: number;
  title: string;
  description: string;
  path: string;
  locale: string;
  content: string;
  contentType: string;
  editor: string;
  tags: string[];
  isPrivate: boolean;
  isPublished: boolean;
  authorId: string;
  authorName: string;
  action: string;
  createdAt: string;
  versionDate: string;
};

export type WikiPageHistory = {
  total: number;
  trail: WikiPageHistoryItem[];
};

export async function getWikiPageHistory(
  pageId: number,
  offsetPage = 0,
  offsetSize = 50
): Promise<{
  total: number;
  trail: WikiPageHistoryItem[];
}> {
  const res = await gql(
    `
    query ($id: Int!, $offsetPage: Int, $offsetSize: Int) {
      pages {
        history(id: $id, offsetPage: $offsetPage, offsetSize: $offsetSize) {
          total
          trail {
            versionId
            versionDate
            authorId
            authorName
            actionType
            valueBefore
            valueAfter
          }
        }
      }
    }
    `,
    {
      id: pageId,
      offsetPage,
      offsetSize,
    }
  );

  return {
    total: res?.data?.pages?.history?.total ?? 0,
    trail: res?.data?.pages?.history?.trail ?? [],
  };
}

export async function getWikiPageVersion(
  pageId: number,
  versionId: number
): Promise<WikiPageVersion | null> {
  const res = await gql(
    `
    query ($pageId: Int!, $versionId: Int!) {
      pages {
        version(pageId: $pageId, versionId: $versionId) {
          versionId
          pageId
          title
          description
          path
          locale
          content
          contentType
          editor
          tags
          isPrivate
          isPublished
          authorId
          authorName
          action
          createdAt
          versionDate
        }
      }
    }
    `,
    {
      pageId,
      versionId,
    }
  );

  return res?.data?.pages?.version ?? null;
}

export async function restoreWikiPageVersion(pageId: number, versionId: number) {
  return gql(
    `
    mutation ($pageId: Int!, $versionId: Int!) {
      pages {
        restore(pageId: $pageId, versionId: $versionId) {
          responseResult {
            succeeded
            message
          }
        }
      }
    }
    `,
    {
      pageId,
      versionId,
    }
  );
}
