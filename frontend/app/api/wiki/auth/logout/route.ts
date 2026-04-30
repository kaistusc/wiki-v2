import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({
    ok: true,
  });

  res.cookies.delete('wikijs_token');
  res.cookies.delete('wikijs_username');
  res.cookies.delete('wikijs_user_email');
  res.cookies.delete('wikijs_user_id');

  return res;
}
