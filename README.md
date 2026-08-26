# wiki-v2
## Prerequisites
node.js, docker, pnpm

## backend (Wiki.js)
cd wikijs > docker compose up -d
## frontend (Next.js)
cd frontend > pnpm install > pnpm run dev

## How to Set Up the API Key
1. localhost:3001 (Wiki.js) > create admin account
2. ADMINISTRATION > API Access > NEW API KEY
3. ENABLE API
4. Duplicate !.env.local file and rename to .env.local
5. Paste generated API KEY
6. Copy contents from /wikijs/.env and paste them into /frontend/.env.local

## Setting for Elastic search
1. http://localhost:3001/a/search
2. Choose Elasticsearch
3. Host(s): http://elasticsearch:9200, Index Name: wiki
4. APPLY > REBUILD INDEX