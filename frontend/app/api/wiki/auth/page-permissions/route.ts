import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';

type PageRule = {
  path?: string;
  match?: string;
  roles?: string[];
  permissions?: string[];
  deny?: boolean;
};

type GroupRow = {
  id: number;
  name: string;
  permissions: unknown;
  page_rules: unknown;
};

function normalizePath(path: string) {
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getGlobalPermissions(group: GroupRow) {
  return asStringArray(parseJsonValue(group.permissions));
}

function getPageRules(group: GroupRow): PageRule[] {
  const parsed = parseJsonValue(group.page_rules);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((rule): rule is PageRule => {
    return Boolean(rule && typeof rule === 'object');
  });
}

function getRulePermissions(rule: PageRule) {
  return new Set([...asStringArray(rule.roles), ...asStringArray(rule.permissions)]);
}

function pageRuleMatches(rule: PageRule, pagePath: string) {
  const normalizedPagePath = normalizePath(pagePath);
  const rulePath = normalizePath(rule.path ?? '');

  if (!rulePath) {
    return true;
  }

  const matchType = rule.match ?? 'START';

  if (matchType === 'EXACT' || matchType === 'exact') {
    return normalizedPagePath === rulePath;
  }

  if (matchType === 'REGEX' || matchType === 'regex') {
    try {
      return new RegExp(rulePath).test(normalizedPagePath);
    } catch {
      return false;
    }
  }

  return normalizedPagePath.startsWith(rulePath);
}

function hasAnyPermission(
  globalPermissions: Set<string>,
  rulePermissions: Set<string>,
  candidates: string[]
) {
  return candidates.some(
    (permission) => globalPermissions.has(permission) || rulePermissions.has(permission)
  );
}

function calculatePermissions(groups: GroupRow[], pagePath: string) {
  let canEdit = false;
  let canCreate = false;
  let canDelete = false;

  for (const group of groups) {
    const globalPermissions = new Set(getGlobalPermissions(group));

    if (globalPermissions.has('manage:system')) {
      return {
        canEdit: true,
        canCreate: true,
        canDelete: true,
      };
    }

    const matchingRules = getPageRules(group).filter((rule) => pageRuleMatches(rule, pagePath));

    for (const rule of matchingRules) {
      if (rule.deny) {
        continue;
      }

      const rulePermissions = getRulePermissions(rule);

      if (rulePermissions.has('manage:system')) {
        return {
          canEdit: true,
          canCreate: true,
          canDelete: true,
        };
      }

      const hasWriteGlobal = hasAnyPermission(globalPermissions, rulePermissions, [
        'write:pages',
        'manage:pages',
      ]);

      const hasManageGlobal = hasAnyPermission(globalPermissions, rulePermissions, [
        'manage:pages',
      ]);

      const hasDeleteGlobal = hasAnyPermission(globalPermissions, rulePermissions, [
        'delete:pages',
        'manage:pages',
      ]);

      const hasEditRule = hasAnyPermission(globalPermissions, rulePermissions, [
        'write:pages',
        'manage:pages',
        'write',
        'manage',
        'create',
        'edit',
        'create:pages',
        'edit:pages',
      ]);

      const hasCreateRule = hasAnyPermission(globalPermissions, rulePermissions, [
        'write:pages',
        'manage:pages',
        'write',
        'manage',
        'create',
        'create:pages',
      ]);

      const hasDeleteRule = hasAnyPermission(globalPermissions, rulePermissions, [
        'delete:pages',
        'manage:pages',
        'delete',
        'manage',
        'delete:pages',
      ]);

      canEdit = canEdit || (hasWriteGlobal && hasEditRule);
      canCreate = canCreate || (hasWriteGlobal && hasCreateRule);
      canDelete = canDelete || (hasDeleteGlobal && hasDeleteRule);

      if (hasManageGlobal) {
        canEdit = true;
        canCreate = true;
      }
    }
  }

  return {
    canEdit,
    canCreate,
    canDelete,
  };
}

async function getUserGroups(userId: string): Promise<GroupRow[]> {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT
        g.id,
        g.name,
        g.permissions,
        g."pageRules" AS page_rules
      FROM groups g
      INNER JOIN "userGroups" ug
        ON ug."groupId" = g.id
      WHERE ug."userId" = $1
      `,
      [Number(userId)]
    );

    return result.rows as GroupRow[];
  } finally {
    client.release();
  }
}

export async function GET(req: Request) {
  const cookieStore = await cookies();

  const token = cookieStore.get('wikijs_token')?.value ?? null;
  const userId = cookieStore.get('wikijs_user_id')?.value ?? null;

  if (!token || !userId) {
    return NextResponse.json({
      loggedIn: false,
      canEdit: false,
      canCreate: false,
      canDelete: false,
      message: '로그인이 필요합니다.',
    });
  }

  const url = new URL(req.url);

  const pageId = url.searchParams.get('pageId');
  const path = url.searchParams.get('path') ?? '';
  const mode = url.searchParams.get('mode');

  if (!path && mode !== 'create') {
    return NextResponse.json(
      {
        loggedIn: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        message: '권한 확인에 필요한 문서 경로가 없습니다.',
      },
      { status: 400 }
    );
  }

  try {
    const groups = await getUserGroups(userId);
    const result = calculatePermissions(groups, path);

    return NextResponse.json({
      loggedIn: true,
      pageId,
      path,
      ...result,
    });
  } catch (error) {
    console.error('[page-permissions] failed:', error);

    return NextResponse.json(
      {
        loggedIn: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        message: '권한 정보를 확인하지 못했습니다.',
      },
      { status: 500 }
    );
  }
}
