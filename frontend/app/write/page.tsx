import { fetchAllPages } from '@/lib/wiki';

import ClientPage from './Client';

export const dynamic = 'force-dynamic';

type SearchParams = {
  title?: string;
};

export default async function WritePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const allPages = await fetchAllPages();

  const resolvedSearchParams = await searchParams;
  const prefillTitle = resolvedSearchParams.title ?? '';

  console.log('Prefill Title (server):', prefillTitle);

  return <ClientPage allPages={allPages} prefillTitle={prefillTitle} />;
}
