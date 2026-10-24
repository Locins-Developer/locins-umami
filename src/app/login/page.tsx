import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createEntraLogin, getEntraUsername } from '@/lib/entra';
import { EntraLogin } from './EntraLogin';
import { LoginPage } from './LoginPage';

export const dynamic = 'force-dynamic';

export default async function () {
  if (process.env.DISABLE_LOGIN || process.env.CLOUD_MODE) {
    return null;
  }

  const username = getEntraUsername(await headers());
  const login = username ? await createEntraLogin(username) : null;

  if (login) {
    return <EntraLogin token={login.token} user={login.user} />;
  }

  return <LoginPage />;
}

export const metadata: Metadata = {
  title: 'Login',
};
