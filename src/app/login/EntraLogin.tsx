'use client';
import { Loading } from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { setClientAuthToken } from '@/lib/client';
import { consumeReturnUrl } from '@/lib/return-url';
import { setUser } from '@/store/app';

export function EntraLogin({ token, user }: { token: string; user: any }) {
  const router = useRouter();

  useEffect(() => {
    setClientAuthToken(token);
    setUser(user);
    router.replace(consumeReturnUrl() ?? '/');
  }, [router, token, user]);

  return <Loading placement="absolute" />;
}
