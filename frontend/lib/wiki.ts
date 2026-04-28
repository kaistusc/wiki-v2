'use server';

import { pool } from './db';
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

export type WikiRevisionMetaInput = {
  editMessage?: string | null;
  isMinor?: boolean;
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

// 메타 정보를 포함하여 변경사항을 저장
export async function saveWikiRevisionMeta({
  pageId,
  versionId,
  authorId,
  editMessage,
  isMinor = false,
}: {
  pageId: number;
  versionId: number;
  authorId: number | null;
  editMessage?: string | null;
  isMinor?: boolean;
}) {
  const client = await pool.connect();

  try {
    console.log('[saveWikiRevisionMeta] saving:', {
      pageId,
      versionId,
      authorId,
      editMessage,
      isMinor,
    });

    await client.query(
      `
      INSERT INTO wiki_revision_meta
        (page_id, version_id, author_id, edit_message, is_minor)
      VALUES
        ($1, $2, $3, $4, $5)
      ON CONFLICT (page_id, version_id)
      DO UPDATE SET
        author_id = EXCLUDED.author_id,
        edit_message = EXCLUDED.edit_message,
        is_minor = EXCLUDED.is_minor,
        updated_at = NOW()
      `,
      [pageId, versionId, authorId, editMessage?.trim() || null, isMinor]
    );

    console.log('[saveWikiRevisionMeta] saved');
  } catch (error) {
    console.error('[saveWikiRevisionMeta] failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateWikiPageWithPath(
  id: number,
  title: string,
  content: string,
  path: string,
  locale = 'en',
  revisionMeta?: WikiRevisionMetaInput
) {
  const previousRawHistory = revisionMeta ? await getRawWikiPageHistory(id, 0, 1) : null;

  const previousLatestVersionId = previousRawHistory?.trail[0]?.versionId ?? null;

  const hadNoRawHistoryBeforeUpdate = revisionMeta ? previousRawHistory?.trail.length === 0 : false;

  const updateRes = await gql(
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

  const result = updateRes?.data?.pages?.update?.responseResult;
  console.log('[updateWikiPageWithPath] update result:', result);

  if (!result?.succeeded) {
    return updateRes;
  }

  if (revisionMeta) {
    const latestHistory = await getRawWikiPageHistory(id, 0, 5);

    const newRevision =
      latestHistory.trail.find((item) => item.versionId !== previousLatestVersionId) ??
      latestHistory.trail[0];

    if (newRevision) {
      await saveWikiRevisionMeta({
        pageId: id,
        versionId: newRevision.versionId,
        authorId: newRevision.authorId ?? null,
        editMessage: revisionMeta.editMessage,
        isMinor: revisionMeta.isMinor ?? false,
      });
    }
  }

  return updateRes;
}

export async function createWikiPage(title: string, path: string, content: string, locale = 'en') {
  const placeholderContent = '<!-- initial placeholder -->';

  const createRes = await gql(
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
      content: placeholderContent,
      locale,
      tags: [],
      description: '',
      editor: 'markdown',
      isPrivate: false,
    }
  );

  if (createRes?.errors?.length) {
    console.error('[createWikiPage] GraphQL errors:', createRes.errors);
    return createRes;
  }

  const result = createRes?.data?.pages?.create?.responseResult;
  const createdPage = createRes?.data?.pages?.create?.page;

  if (!result?.succeeded || !createdPage?.id) {
    return createRes;
  }

  await updateWikiPageWithPath(createdPage.id, title, content, path, locale, {
    editMessage: '신규 문서 생성',
    isMinor: false,
  });

  return createRes;
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
  content: string,
  revisionMeta?: WikiRevisionMetaInput
) {
  if (oldPath === newPath) {
    await updateWikiPageWithPath(pageId, title, content, newPath, 'en', revisionMeta);
    return;
  }

  await updateWikiPageWithPath(pageId, title, content, newPath, 'en', revisionMeta);

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
  authorId: number | null;
  authorName: string;
  actionType: string;
  valueBefore: string | null;
  valueAfter: string | null;

  editMessage?: string | null;
  isMinor?: boolean;
  isSynthetic?: boolean;
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

export async function getWikiRevisionMetas(pageId: number): Promise<
  {
    pageId: number;
    versionId: number;
    authorId: number | null;
    editMessage: string | null;
    isMinor: boolean;
    createdAt: string;
    updatedAt: string;
  }[]
> {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT
        page_id,
        version_id,
        author_id,
        edit_message,
        is_minor,
        created_at,
        updated_at
      FROM wiki_revision_meta
      WHERE page_id = $1
      ORDER BY created_at DESC
      `,
      [pageId]
    );

    return result.rows.map((row) => ({
      pageId: row.page_id,
      versionId: row.version_id,
      authorId: row.author_id,
      editMessage: row.edit_message,
      isMinor: row.is_minor,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    client.release();
  }
}

async function getRawWikiPageHistory(
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

  if (res?.errors?.length) {
    console.error('[getRawWikiPageHistory] GraphQL errors:', res.errors);
  }

  return {
    total: res?.data?.pages?.history?.total ?? 0,
    trail: res?.data?.pages?.history?.trail ?? [],
  };
}

export async function getWikiPageHistory(
  pageId: number,
  offsetPage = 0,
  offsetSize = 50
): Promise<{
  total: number;
  trail: WikiPageHistoryItem[];
}> {
  const rawHistory = await getRawWikiPageHistory(pageId, offsetPage, offsetSize);

  const metas = await getWikiRevisionMetas(pageId);

  const metaByVersionId = new Map(metas.map((meta) => [meta.versionId, meta]));

  const mergedTrail = rawHistory.trail.map((item) => {
    const meta = metaByVersionId.get(item.versionId);

    return {
      ...item,
      editMessage: meta?.editMessage ?? null,
      isMinor: meta?.isMinor ?? false,
    };
  });

  return {
    total: mergedTrail.length,
    trail: mergedTrail,
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
