import type { Metadata } from 'next';
import { isEntraLoginEnabled } from '@/lib/entra';
import { LogoutPage } from './LogoutPage';

export const dynamic = 'force-dynamic';

export default function () {
  if (process.env.DISABLE_LOGIN || process.env.CLOUD_MODE) {
    return null;
  }

  return <LogoutPage entra={isEntraLoginEnabled()} />;
}

export const metadata: Metadata = {
  title: 'Logout',
};
