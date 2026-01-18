import { fetchAllPages } from '@/lib/wiki';

export async function GET() {
  const pages = await fetchAllPages();
  return Response.json(pages);
}
