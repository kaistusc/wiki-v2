import { NextResponse } from 'next/server';

import { getWikiPageVersion } from '@/lib/wiki';

type RouteContext = {
  params: Promise<{
    pageId: string;
    versionId: string;
  }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { pageId, versionId } = await params;

    const parsedPageId = Number(pageId);
    const parsedVersionId = Number(versionId);

    if (!Number.isInteger(parsedPageId) || parsedPageId <= 0) {
      return NextResponse.json({ message: 'Invalid pageId' }, { status: 400 });
    }

    if (!Number.isInteger(parsedVersionId) || parsedVersionId <= 0) {
      return NextResponse.json({ message: 'Invalid versionId' }, { status: 400 });
    }

    const version = await getWikiPageVersion(parsedPageId, parsedVersionId);

    if (!version) {
      return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('[wiki version route] failed:', error);

    return NextResponse.json(
      {
        message: 'Failed to fetch wiki version',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
