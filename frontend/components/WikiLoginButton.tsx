'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type LoginState = 'idle' | 'loading' | 'success' | 'error';

type SessionUser = {
  id?: string | null;
  name: string;
  email?: string | null;
  href: string;
};

type SessionResponse = {
  loggedIn: boolean;
  user: SessionUser | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '로그인 중 오류가 발생했습니다.';
}

export default function WikiLoginButton({
  allPages,
}: {
  allPages: { id: number; title: string; path: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const pageByTitle = new Map(allPages.map((p) => [p.title, { title: p.title, path: p.path }]));

  async function loadSession() {
    try {
      setIsCheckingSession(true);

      const res = await fetch('/api/wiki/auth/session', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        setSessionUser(null);
        return;
      }

      const data = (await res.json()) as SessionResponse;

      setSessionUser(data.loggedIn ? data.user : null);
    } catch (error) {
      console.error('[WikiLoginButton] failed to load session:', error);
      setSessionUser(null);
    } finally {
      setIsCheckingSession(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoginState('loading');
      setErrorMessage('');

      const res = await fetch('/api/wiki/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message ?? '로그인에 실패했습니다.');
      }

      setLoginState('success');
      setPassword('');
      setIsOpen(false);

      await loadSession();

      window.location.reload();
    } catch (error) {
      setLoginState('error');
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleLogout() {
    await fetch('/api/wiki/auth/logout', {
      method: 'POST',
    });

    setSessionUser(null);
    window.location.reload();
  }

  if (isCheckingSession) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">확인 중...</span>
      </div>
    );
  }

  const userPage = sessionUser ? pageByTitle.get(sessionUser.name) : null;
  const hasUserPage = Boolean(userPage);

  return (
    <>
      <div className="flex items-center gap-2">
        {sessionUser ? (
          <>
            <div className="flex items-center gap-1">
              <Link
                href={sessionUser.href}
                className="text-sm underline"
                title={sessionUser.email ?? sessionUser.name}
                style={{
                  color: hasUserPage ? '#0645ad' : '#ba0000',
                }}
              >
                {sessionUser.name}
              </Link>
              <div className="text-sm text-black">님</div>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              로그아웃
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setErrorMessage('');
              setLoginState('idle');
            }}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            로그인
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Wiki.js 로그인</h2>
              <p className="mt-1 text-sm text-gray-500">
                Wiki.js 계정으로 로그인하면 부여된 권한에 따라 문서 작성과 편집이 가능합니다.
              </p>
            </div>

            <form onSubmit={void handleLogin} className="px-5 py-4">
              <div className="mb-4">
                <label
                  htmlFor="wiki-login-username"
                  className="mb-1 block text-sm font-medium text-gray-800"
                >
                  이메일 또는 사용자명
                </label>
                <input
                  id="wiki-login-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="user@example.com"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="wiki-login-password"
                  className="mb-1 block text-sm font-medium text-gray-800"
                >
                  비밀번호
                </label>
                <input
                  id="wiki-login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="비밀번호"
                />
              </div>

              {loginState === 'error' && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setErrorMessage('');
                    setLoginState('idle');
                  }}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  취소
                </button>

                <button
                  type="submit"
                  disabled={loginState === 'loading'}
                  className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loginState === 'loading' ? '로그인 중...' : '로그인'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
