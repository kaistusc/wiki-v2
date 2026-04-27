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