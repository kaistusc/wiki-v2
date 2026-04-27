import { NextResponse } from 'next/server';

import { getWikiPageHistory } from '@/lib/wiki';

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

    const history = await getWikiPageHistory(parsedPageId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to fetch wiki history:', error);

    return NextResponse.json({ message: 'Failed to fetch wiki history' }, { status: 500 });
  }
}
