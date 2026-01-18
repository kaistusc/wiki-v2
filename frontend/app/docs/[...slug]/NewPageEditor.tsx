import { fetchAllPages } from '@/lib/wiki';

import NewPageEditorClient from './NewPageEditorClient';

export default async function NewPageEditor() {
  const allPages = await fetchAllPages();

  return <NewPageEditorClient allPages={allPages} />;
}
