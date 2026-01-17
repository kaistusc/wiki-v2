import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

import { NextResponse } from 'next/server';

import { pool } from '@/lib/db';

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);

    const id = crypto.randomUUID();
    const storedName = `${id}${ext}`;

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const relativeDir = path.join('uploads', year, month);
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

    await fs.mkdir(absoluteDir, { recursive: true });

    const relativePath = path.join(relativeDir, storedName);
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    await fs.writeFile(absolutePath, buffer);

    const url = `/${relativePath.replace(/\\/g, '/')}`;

    await client.query(
      `
      INSERT INTO uploads
        (original_name, stored_name, mime_type, size, path, url)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [file.name, storedName, file.type, buffer.length, relativePath, url]
    );

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
