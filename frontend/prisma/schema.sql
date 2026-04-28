CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,

  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,

  path TEXT NOT NULL,
  url TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wiki_revision_meta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  page_id INTEGER NOT NULL,
  version_id INTEGER NOT NULL,
  author_id INTEGER,

  edit_message TEXT,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (page_id, version_id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_revision_meta_page_id
  ON wiki_revision_meta (page_id);

CREATE INDEX IF NOT EXISTS idx_wiki_revision_meta_version_id
  ON wiki_revision_meta (version_id);

CREATE INDEX IF NOT EXISTS idx_wiki_revision_meta_author_id
  ON wiki_revision_meta (author_id);

CREATE INDEX IF NOT EXISTS idx_wiki_revision_meta_created_at
  ON wiki_revision_meta (created_at DESC);
