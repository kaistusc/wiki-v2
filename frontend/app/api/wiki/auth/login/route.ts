import { NextResponse } from 'next/server';

const WIKI_API = process.env.WIKI_API!;
const WIKI_AUTH_STRATEGY = process.env.WIKI_AUTH_STRATEGY ?? 'local';

type WikiLoginResponse = {
  data?: {
    authentication?: {
      login?: {
        responseResult?: {
          succeeded: boolean;
          message?: string;
          errorCode?: number;
          slug?: string;
        };
        jwt?: string;
        mustChangePwd?: boolean;
        mustProvideTFA?: boolean;
        continuationToken?: string;
      };
    };
  };
  errors?: {
    message: string;
  }[];
};

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    const wikiRes = await fetch(WIKI_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        query: `
          mutation Login(
            $username: String!
            $password: String!
            $strategy: String!
          ) {
            authentication {
              login(
                username: $username
                password: $password
                strategy: $strategy
              ) {
                responseResult {
                  succeeded
                  message
                  errorCode
                  slug
                }
                jwt
                mustChangePwd
                mustProvideTFA
                continuationToken
              }
            }
          }
        `,
        variables: {
          username,
          password,
          strategy: WIKI_AUTH_STRATEGY,
        },
      }),
    });

    const json = (await wikiRes.json()) as WikiLoginResponse;

    console.log('[wiki login] status:', wikiRes.status);
    console.log('[wiki login] response:', JSON.stringify(json, null, 2));

    if (json.errors?.length) {
      console.error('[wiki login] GraphQL errors:', json.errors);

      return NextResponse.json(
        {
          message: json.errors[0]?.message ?? '로그인 요청에 실패했습니다.',
        },
        { status: 500 }
      );
    }

    const login = json.data?.authentication?.login;
    const result = login?.responseResult;

    if (!result?.succeeded || !login?.jwt) {
      return NextResponse.json(
        {
          message: result?.message ?? '로그인에 실패했습니다.',
        },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      message: result.message ?? '로그인되었습니다.',
      mustChangePwd: login.mustChangePwd ?? false,
      mustProvideTFA: login.mustProvideTFA ?? false,
    });

    res.cookies.set('wikijs_token', login.jwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    const profile = await fetchWikiUserProfile(login.jwt);

    const displayName = profile?.name || username;
    const displayEmail = profile?.email || username;
    const userId = profile?.id ? String(profile.id) : '';

    res.cookies.set('wikijs_username', displayName, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    res.cookies.set('wikijs_user_email', displayEmail, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    if (userId) {
      res.cookies.set('wikijs_user_id', userId, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
    }

    return res;
  } catch (error) {
    console.error('[wiki login] failed:', error);

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

type WikiUserProfile = {
  id: number | null;
  name: string | null;
  email: string | null;
};

async function fetchWikiUserProfile(jwt: string): Promise<WikiUserProfile | null> {
  const profileQueries = [
    `
    query {
      users {
        profile {
          id
          name
          email
        }
      }
    }
    `,
    `
    query {
      users {
        current {
          id
          name
          email
        }
      }
    }
    `,
  ];

  for (const query of profileQueries) {
    try {
      const res = await fetch(WIKI_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        cache: 'no-store',
        body: JSON.stringify({ query }),
      });

      const json = await res.json();

      if (json?.errors?.length) {
        console.warn('[wiki profile] query failed:', json.errors);
        continue;
      }

      const profile = json?.data?.users?.profile ?? json?.data?.users?.current;

      if (profile) {
        return {
          id: profile.id ?? null,
          name: profile.name ?? null,
          email: profile.email ?? null,
        };
      }
    } catch (error) {
      console.warn('[wiki profile] request failed:', error);
    }
  }

  return null;
}
