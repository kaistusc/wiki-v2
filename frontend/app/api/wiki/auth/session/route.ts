import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getUserPagePath(username: string) {
  return `/docs/${encodeURIComponent(`${username}`)}`;
}

export async function GET() {
  const cookieStore = await cookies();

  const token = cookieStore.get('wikijs_token')?.value ?? null;
  const username = cookieStore.get('wikijs_username')?.value ?? null;
  const email = cookieStore.get('wikijs_user_email')?.value ?? null;
  const id = cookieStore.get('wikijs_user_id')?.value ?? null;

  if (!token || !username) {
    return NextResponse.json({
      loggedIn: false,
      user: null,
    });
  }

  return NextResponse.json({
    loggedIn: true,
    user: {
      id,
      name: username,
      email,
      href: getUserPagePath(username),
    },
  });
}
