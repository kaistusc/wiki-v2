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

function getUtf8ByteLength(value: string | null | undefined) {
  return new TextEncoder().encode(value ?? '').length;
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

  /**
   * 신규 문서 생성처럼 byte diff 기준 content를 직접 지정하고 싶을 때 사용.
   * 예: 신규 문서는 placeholder 기준이 아니라 빈 문자열 기준으로 diff 계산.
   */
  previousContentForByteDiff?: string | null;
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

async function getLatestWikiRevisionWithRetry(
  pageId: number,
  maxAttempts = 10,
  delayMs = 300
): Promise<WikiPageHistoryItem | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const history = await getRawWikiPageHistory(pageId, 0, 1);
    const latestRevision = history.trail[0];

    if (latestRevision) {
      return latestRevision;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

export async function fetchAllPagesForLogs() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, title, path
      FROM pages
      ORDER BY "updatedAt" DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      path: row.path,
    }));
  } finally {
    client.release();
  }
}

// 메타 정보를 포함하여 변경사항을 저장
export async function saveWikiRevisionMeta({
  pageId,
  versionId,
  authorId,
  authorName,
  editMessage,
  isMinor = false,
  byteSize,
  byteDiff,
}: {
  pageId: number;
  versionId: number;
  authorId: number | null;
  authorName?: string | null;
  editMessage?: string | null;
  isMinor?: boolean;
  byteSize?: number | null;
  byteDiff?: number | null;
}) {
  const client = await pool.connect();

  try {
    await client.query(
      `
      INSERT INTO wiki_revision_meta
        (
          page_id,
          version_id,
          author_id,
          author_name,
          edit_message,
          is_minor,
          byte_size,
          byte_diff
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (page_id, version_id)
      DO UPDATE SET
        author_id = EXCLUDED.author_id,
        author_name = EXCLUDED.author_name,
        edit_message = EXCLUDED.edit_message,
        is_minor = EXCLUDED.is_minor,
        byte_size = EXCLUDED.byte_size,
        byte_diff = EXCLUDED.byte_diff,
        updated_at = NOW()
      `,
      [
        pageId,
        versionId,
        authorId,
        authorName?.trim() || null,
        editMessage?.trim() || null,
        isMinor,
        byteSize ?? null,
        byteDiff ?? null,
      ]
    );
  } finally {
    client.release();
  }
}

function summarizeHistory(history: { total: number; trail: WikiPageHistoryItem[] }) {
  return {
    total: history.total,
    trail: history.trail.map((item) => ({
      versionId: item.versionId,
      actionType: item.actionType,
      versionDate: item.versionDate,
      authorId: item.authorId,
      authorName: item.authorName,
      valueBefore: item.valueBefore,
      valueAfter: item.valueAfter,
    })),
  };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRevisionAfterUpdate({
  pageId,
  previousLatestVersionId,
  maxAttempts = 15,
  delayMs = 400,
}: {
  pageId: number;
  previousLatestVersionId: number | null;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<WikiPageHistoryItem | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const history = await getRawWikiPageHistory(pageId, 0, 10);

    console.log('[waitForRevisionAfterUpdate] attempt:', {
      pageId,
      attempt,
      previousLatestVersionId,
      history: summarizeHistory(history),
    });

    const latest = history.trail[0];

    if (!latest) {
      await sleep(delayMs);
      continue;
    }

    if (previousLatestVersionId === null) {
      console.log('[waitForRevisionAfterUpdate] picked latest because previous is null:', latest);
      return latest;
    }

    if (latest.versionId !== previousLatestVersionId) {
      console.log('[waitForRevisionAfterUpdate] picked new latest:', latest);
      return latest;
    }

    const changed = history.trail.find((item) => item.versionId !== previousLatestVersionId);

    if (changed) {
      console.log('[waitForRevisionAfterUpdate] picked changed revision:', changed);
      return changed;
    }

    await sleep(delayMs);
  }

  console.error('[waitForRevisionAfterUpdate] failed to find new revision:', {
    pageId,
    previousLatestVersionId,
    maxAttempts,
    delayMs,
  });

  return null;
}

export async function updateWikiPageWithPath(
  id: number,
  title: string,
  content: string,
  path: string,
  locale = 'en',
  revisionMeta?: WikiRevisionMetaInput
) {
  console.log('[updateWikiPageWithPath] CALLED:', {
    id,
    title,
    path,
    locale,
    hasRevisionMeta: Boolean(revisionMeta),
    revisionMeta,
    contentLength: content.length,
    contentPreview: content.slice(0, 120),
  });

  const beforeHistory = revisionMeta ? await getRawWikiPageHistory(id, 0, 10) : null;

  const previousLatestVersionId = beforeHistory?.trail[0]?.versionId ?? null;

  let previousContentForByteDiff = revisionMeta?.previousContentForByteDiff;

  if (revisionMeta && previousContentForByteDiff === undefined) {
    const beforePageRes = await getPageContentById(id);
    previousContentForByteDiff = beforePageRes?.data?.pages?.single?.content ?? '';
  }

  const byteSize = revisionMeta ? getUtf8ByteLength(content) : null;
  const byteDiff =
    revisionMeta && byteSize !== null
      ? byteSize - getUtf8ByteLength(previousContentForByteDiff)
      : null;

  console.log('[updateWikiPageWithPath] BEFORE history:', {
    id,
    previousLatestVersionId,
    byteSize,
    byteDiff,
    history: beforeHistory ? summarizeHistory(beforeHistory) : null,
  });

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

  console.log('[updateWikiPageWithPath] updateRes:', JSON.stringify(updateRes, null, 2));

  const result = updateRes?.data?.pages?.update?.responseResult;

  if (!result?.succeeded) {
    console.error('[updateWikiPageWithPath] update failed:', {
      result,
      errors: updateRes?.errors,
    });
    return updateRes;
  }

  if (updateRes?.errors?.length) {
    console.warn(
      '[updateWikiPageWithPath] GraphQL returned errors but update succeeded:',
      updateRes.errors
    );
  }

  if (revisionMeta) {
    const newRevision = await waitForRevisionAfterUpdate({
      pageId: id,
      previousLatestVersionId,
      maxAttempts: 15,
      delayMs: 400,
    });

    console.log('[updateWikiPageWithPath] newRevision selected:', newRevision);

    if (!newRevision) {
      console.error('[updateWikiPageWithPath] latest revision not found, meta not saved:', {
        pageId: id,
        previousLatestVersionId,
        editMessage: revisionMeta.editMessage,
        isMinor: revisionMeta.isMinor,
        byteSize,
        byteDiff,
      });

      return updateRes;
    }

    await saveWikiRevisionMeta({
      pageId: id,
      versionId: newRevision.versionId,
      authorId: newRevision.authorId ?? null,
      authorName: newRevision.authorName ?? null,
      editMessage: revisionMeta.editMessage,
      isMinor: revisionMeta.isMinor ?? false,
      byteSize,
      byteDiff,
    });

    const afterMetas = await getWikiRevisionMetas(id);
    console.log('[updateWikiPageWithPath] metas after save:', afterMetas);
  }

  return updateRes;
}

async function waitForNewWikiRevision({
  pageId,
  previousLatestVersionId,
  preferNonInitial = false,
  maxAttempts = 10,
  delayMs = 300,
}: {
  pageId: number;
  previousLatestVersionId: number | null;
  preferNonInitial?: boolean;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<WikiPageHistoryItem | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const history = await getRawWikiPageHistory(pageId, 0, 10);

    const changedRevisions = history.trail.filter(
      (item) => item.versionId !== previousLatestVersionId
    );

    const preferredRevision = preferNonInitial
      ? changedRevisions.find((item) => item.actionType !== 'initial')
      : changedRevisions[0];

    if (preferredRevision) {
      return preferredRevision;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

export async function createWikiPage(title: string, path: string, content: string, locale = 'en') {
  const placeholderContent = '<!-- initial placeholder -->';

  console.log('[createWikiPage] CALLED:', {
    title,
    path,
    locale,
    contentLength: content.length,
    contentPreview: content.slice(0, 120),
  });

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

  console.log('[createWikiPage] createRes:', JSON.stringify(createRes, null, 2));

  if (createRes?.errors?.length) {
    console.error('[createWikiPage] GraphQL errors:', createRes.errors);
    return createRes;
  }

  const result = createRes?.data?.pages?.create?.responseResult;
  const createdPage = createRes?.data?.pages?.create?.page;

  console.log('[createWikiPage] result:', result);
  console.log('[createWikiPage] createdPage:', createdPage);

  if (!result?.succeeded || !createdPage?.id) {
    console.error('[createWikiPage] create failed or page id missing:', {
      result,
      createdPage,
    });

    return createRes;
  }

  const historyAfterCreate = await getRawWikiPageHistory(createdPage.id, 0, 10);

  console.log('[createWikiPage] history immediately after create:', {
    pageId: createdPage.id,
    history: summarizeHistory(historyAfterCreate),
  });

  console.log('[createWikiPage] now update placeholder page with real content');

  const updateRes = await updateWikiPageWithPath(createdPage.id, title, content, path, locale, {
    editMessage: '신규 문서 생성',
    isMinor: false,
    previousContentForByteDiff: '',
  });

  const historyAfterUpdate = await getRawWikiPageHistory(createdPage.id, 0, 10);
  const metasAfterUpdate = await getWikiRevisionMetas(createdPage.id);

  console.log('[createWikiPage] history after update:', {
    pageId: createdPage.id,
    history: summarizeHistory(historyAfterUpdate),
  });

  console.log('[createWikiPage] metas after update:', metasAfterUpdate);

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
  const res = await gql(
    `
    query ($id: Int!) {
      pages {
        single(id: $id) {
          id
          title
          path
          content
          render
          createdAt
          updatedAt
          authorId
          authorName
        }
      }
    }
    `,
    { id }
  );

  if (res?.errors?.length) {
    console.error('[getPageContentById] GraphQL errors:', res.errors);
  }

  console.log(`[getPageContentById] fetched page ID ${id}:`, res?.data?.pages?.single);

  return res;
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
  const page = pageRes.data.pages.single;

  return updateWikiPageWithPath(
    pageId,
    page.title,
    page.content,
    trashPath,
    'en',
    {
      editMessage: '문서 삭제',
      isMinor: false,
      previousContentForByteDiff: page.content,
    }
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
  authorName: string | null;
  actionType: string;
  valueBefore: string | null;
  valueAfter: string | null;

  editMessage?: string | null;
  isMinor?: boolean;

  byteSize?: number | null;
  byteDiff?: number | null;

  displayDate?: string;
  displayAuthorId?: number | null;
  displayAuthorName?: string | null;
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
    authorName: string | null;
    editMessage: string | null;
    isMinor: boolean;
    byteSize: number | null;
    byteDiff: number | null;
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
        author_name,
        edit_message,
        is_minor,
        byte_size,
        byte_diff,
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
      authorName: row.author_name,
      editMessage: row.edit_message,
      isMinor: row.is_minor,
      byteSize: row.byte_size,
      byteDiff: row.byte_diff,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    client.release();
  }
}

export type WikiEditLogItem = {
  pageId: number;
  versionId: number;
  authorId: number | null;
  authorName: string | null;
  editMessage: string | null;
  isMinor: boolean;
  byteSize: number | null;
  byteDiff: number | null;
  createdAt: string;
};

export type WikiEditLogsResult = {
  logs: WikiEditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getWikiEditLogs(
  page: number,
  limit: number,
  filters?: {
    author?: string;
    target?: string;
    type?: string;
    from?: string;
    to?: string;
  }
) {
  const allPages = await fetchAllPagesForLogs();

  const histories = await Promise.all(
    allPages.map(async (wikiPage) => {
      try {
        const history = await getWikiPageHistory(wikiPage.id);

        return history.trail.map((item) => {
          const computedType = getEditLogActionType({
            versionId: item.versionId,
            actionType: item.actionType ?? null,
            valueBefore: item.valueBefore ?? null,
            valueAfter: item.valueAfter ?? null,
            editMessage: item.editMessage ?? null,
          });

          return {
            pageId: wikiPage.id,
            pageTitle: wikiPage.title,
            pagePath: wikiPage.path,

            versionId: item.versionId,
            authorId: item.authorId,
            authorName: item.displayAuthorName ?? item.authorName,
            editMessage: item.editMessage ?? null,
            isMinor: item.isMinor ?? false,
            byteSize: item.byteSize ?? null,
            byteDiff: item.byteDiff ?? null,
            createdAt: item.displayDate ?? item.versionDate,

            // 프론트가 보는 actionType을 보정된 값으로 반환
            actionType: computedType,

            // 원본 Wiki.js actionType도 필요하면 확인 가능
            rawActionType: item.actionType ?? null,

            valueBefore: item.valueBefore ?? null,
            valueAfter: item.valueAfter ?? null,

            computedType,
          };
        });
      } catch (error) {
        return [];
      }
    })
  );

  let logs = histories.flat();

  logs = logs.filter((log) => {
    if (filters?.author) {
      const author = log.authorName ?? '';

      if (!author.toLowerCase().includes(filters.author.toLowerCase())) {
        return false;
      }
    }

    if (filters?.target) {
      const title = log.pageTitle ?? '';
      const path = log.pagePath ?? '';
      const keyword = filters.target.toLowerCase();

      if (
        !title.toLowerCase().includes(keyword) &&
        !path.toLowerCase().includes(keyword)
      ) {
        return false;
      }
    }

    if (filters?.type) {
      if (log.actionType !== filters.type) {
        return false;
      }
    }

    if (filters?.from) {
      const fromDate = new Date(filters.from);
      const createdAt = new Date(log.createdAt);

      if (createdAt < fromDate) {
        return false;
      }
    }

    if (filters?.to) {
      const toDate = new Date(filters.to);
      toDate.setDate(toDate.getDate() + 1);

      const createdAt = new Date(log.createdAt);

      if (createdAt >= toDate) {
        return false;
      }
    }

    return true;
  });

  logs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = logs.length;
  const start = (page - 1) * limit;
  const paginatedLogs = logs.slice(start, start + limit);

  return {
    logs: paginatedLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function isTrashPath(path: string | null | undefined) {
  return Boolean(path?.startsWith('__trash__/'));
}

function getEditLogActionType(log: {
  versionId: number;
  actionType: string | null;
  valueBefore: string | null;
  valueAfter: string | null;
  editMessage?: string | null;
}) {
  if (log.editMessage === '문서 삭제') {
    return 'delete';
  }

  if (log.editMessage === '문서 복구') {
    return 'restore';
  }

  if (log.actionType === 'move' || log.actionType === 'moved') {
    const wasTrash = isTrashPath(log.valueBefore);
    const isTrash = isTrashPath(log.valueAfter);

    if (!wasTrash && isTrash) {
      return 'delete';
    }

    if (wasTrash && !isTrash) {
      return 'restore';
    }

    return 'move';
  }

  if (log.actionType === 'initial' || log.versionId === 1) {
    return 'create';
  }

  if (log.actionType === 'deleted') {
    return 'delete';
  }

  if (log.actionType === 'restored') {
    return 'restore';
  }

  return 'edit';
}


async function getCurrentWikiPageAuthor(pageId: number): Promise<{
  authorId: number | null;
  authorName: string | null;
}> {
  const res = await gql(
    `
    query ($id: Int!) {
      pages {
        single(id: $id) {
          id
          authorId
          authorName
        }
      }
    }
    `,
    { id: pageId }
  );

  if (res?.errors?.length) {
    console.error('[getCurrentWikiPageAuthor] GraphQL errors:', res.errors);
  }

  const page = res?.data?.pages?.single;

  return {
    authorId: page?.authorId ?? null,
    authorName: page?.authorName ?? null,
  };
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
  const currentAuthor = await getCurrentWikiPageAuthor(pageId);

  const metaByVersionId = new Map(metas.map((meta) => [meta.versionId, meta]));

  const rawTrail = rawHistory.trail;

  //마지막 author는 버리고, current page의 최신 author를 앞에 붙인다.
  const shiftedAuthors = [
    {
      authorId: currentAuthor.authorId,
      authorName: currentAuthor.authorName,
    },
    ...rawTrail.slice(0, -1).map((item) => ({
      authorId: item.authorId ?? null,
      authorName: item.authorName ?? null,
    })),
  ];

  const mergedTrail = rawTrail.map((item, index) => {
    const meta = metaByVersionId.get(item.versionId);
    const displayAuthor = shiftedAuthors[index];

    return {
      ...item,

      editMessage: meta?.editMessage ?? null,
      isMinor: meta?.isMinor ?? false,

      byteSize: meta?.byteSize ?? null,
      byteDiff: meta?.byteDiff ?? null,
      displayDate: meta?.createdAt ?? item.versionDate,

      // authorName은 Wiki.js row를 한 칸 보정한 값 사용.
      displayAuthorId: displayAuthor?.authorId ?? item.authorId ?? null,

      displayAuthorName: displayAuthor?.authorName ?? item.authorName ?? 'Unknown',
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
