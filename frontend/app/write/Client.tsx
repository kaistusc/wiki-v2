'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import WikiEditorWrapper from '@/components/WikiEditorWrapper';
import PermissionCheckingView from '@/components/PermissionCheckingView';
import PermissionDeniedView from '@/components/PermissionDeniedView';
import { createWikiPage } from '@/lib/wiki';
import { parseMarkdown, slugify } from '@/lib/parseMarkdown';

type PermissionState = 'idle' | 'checking' | 'allowed' | 'denied' | 'error';

type PermissionResponse = {
  loggedIn: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  message?: string;
};

function isUnauthorizedMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('로그인이 필요') ||
    normalized.includes('not authorized') ||
    normalized.includes('unauthorized') ||
    normalized.includes('권한')
  );
}

export default function ClientPage({
  allPages,
  prefillTitle,
}: {
  allPages: { id: number; title: string; path: string }[];
  prefillTitle?: string;
}) {
  const router = useRouter();

  const [permissionState, setPermissionState] = useState<PermissionState>('idle');

  const [permissionMessage, setPermissionMessage] = useState('새 문서를 만들 권한이 없습니다.');

  const markdown = prefillTitle
    ? `# ${prefillTitle}\n본문을 작성해주세요!`
    : '# 새 문서 만들기\n본문을 작성해주세요!';

  useEffect(() => {
    let ignore = false;

    async function checkCreatePermission() {
      try {
        setPermissionState('checking');

        const query = new URLSearchParams({
          path: '',
          mode: 'create',
        });

        const res = await fetch(`/api/wiki/auth/page-permissions?${query.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const data = (await res.json().catch(() => null)) as PermissionResponse | null;

        if (ignore) return;

        if (!res.ok || !data) {
          setPermissionMessage(data?.message ?? '권한 정보를 불러오지 못했습니다.');
          setPermissionState('error');
          return;
        }

        if (!data.canCreate) {
          setPermissionMessage(
            data.loggedIn
              ? '새 문서를 만들 권한이 없습니다.'
              : '새 문서를 만들려면 로그인이 필요합니다.'
          );
          setPermissionState('denied');
          return;
        }

        setPermissionState('allowed');
      } catch (error) {
        console.error('[ClientPage] permission check failed:', error);

        if (ignore) return;

        setPermissionMessage('권한 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
        setPermissionState('error');
      }
    }

    void checkCreatePermission();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async (markdownForStorage: string) => {
    try {
      if (permissionState !== 'allowed') {
        setPermissionMessage('새 문서를 만들 권한이 없습니다.');
        setPermissionState('denied');
        return;
      }

      const { title, body } = parseMarkdown(markdownForStorage);
      const slug = slugify(title);

      const res = await createWikiPage(title, slug, body);

      const result = res?.data?.pages?.create?.responseResult;

      if (result?.succeeded) {
        window.location.href = `/docs/${slug}`;
        return;
      }

      const message = result?.message ?? '페이지 생성 실패';

      if (isUnauthorizedMessage(message)) {
        setPermissionMessage('새 문서를 만들 권한이 없습니다.');
        setPermissionState('denied');
        return;
      }

      console.error(res);
      alert(message);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '페이지 생성 중 오류가 발생했습니다.';

      if (isUnauthorizedMessage(message)) {
        setPermissionMessage(
          message.includes('로그인')
            ? '새 문서를 만들려면 로그인이 필요합니다.'
            : '새 문서를 만들 권한이 없습니다.'
        );
        setPermissionState('denied');
        return;
      }

      alert(message);
    }
  };

  if (permissionState === 'idle' || permissionState === 'checking') {
    return <PermissionCheckingView message="문서 생성 권한을 확인하는 중..." />;
  }

  if (permissionState === 'denied' || permissionState === 'error') {
    return (
      <PermissionDeniedView
        message={permissionMessage}
        onBack={() => {
          router.push('/');
        }}
      />
    );
  }

  return (
    <WikiEditorWrapper
      storedContent={markdown}
      allPages={allPages}
      onSave={handleSave}
      isNewPage={true}
    />
  );
}
