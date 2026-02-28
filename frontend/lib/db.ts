import { Pool } from 'pg';

export const pool = new Pool({
    user: process.env.WIKI_DB_USER,
    host: process.env.WIKI_DB_HOST,
    database: process.env.WIKI_DB_NAME,
    password: process.env.WIKI_DB_PASS,
    port: Number(process.env.WIKI_DB_PORT) || 5432,
});
