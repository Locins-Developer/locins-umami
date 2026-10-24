'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApi } from '@/components/hooks';
import { removeClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

export function LogoutPage({ entra = false }: { entra?: boolean }) {
  const router = useRouter();
  const { post } = useApi();

  useEffect(() => {
    async function logout() {
      await post('/auth/logout');

      const loginUrl = `${process.env.basePath || ''}/login`;

      // Also end the App Service session, otherwise /login signs the user straight back in.
      window.location.href = entra
        ? `/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(loginUrl)}`
        : loginUrl;
    }

    removeClientAuthToken();
    setUser(null);
    logout();
  }, [router, post, entra]);

  return null;
}
