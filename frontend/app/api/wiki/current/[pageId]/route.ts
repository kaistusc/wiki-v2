import { NextResponse } from 'next/server';

import { getPageContentById } from '@/lib/wiki';

type RouteContext = {
  params: Promise<{
    pageId: string;
  }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { pageId } = await params;
    const parsedPageId = Number(pageId);

    if (!Number.isInteger(parsedPageId) || parsedPageId <= 0) {
      return NextResponse.json({ message: 'Invalid pageId' }, { status: 400 });
    }

    const res = await getPageContentById(parsedPageId);
    const page = res?.data?.pages?.single;

    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('[wiki current route] failed:', error);

    return NextResponse.json(
      {
        message: 'Failed to fetch current wiki page',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
