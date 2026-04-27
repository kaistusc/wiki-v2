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
