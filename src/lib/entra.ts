import { saveAuth } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import { hash, secret } from '@/lib/crypto';
import { createSecureToken } from '@/lib/jwt';
import redis from '@/lib/redis';
import { getAllUserTeams, getUserByUsername } from '@/queries/prisma';

const TENANT_CLAIM = 'http://schemas.microsoft.com/identity/claims/tenantid';
const USERNAME_CLAIMS = [
  'preferred_username',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
];

interface ClientPrincipal {
  auth_typ?: string;
  claims?: { typ: string; val: string }[];
}

export function isEntraLoginEnabled() {
  return !!process.env.ENTRA_TENANT_ID;
}

// Reads the user injected by App Service authentication (Easy Auth). App Service strips these
// headers from external requests, so they are only present when App Service set them.
export function getEntraUsername(headers: Headers): string | null {
  const tenantId = process.env.ENTRA_TENANT_ID;
  const header = headers.get('x-ms-client-principal');

  if (!tenantId || !header) {
    return null;
  }

  let principal: ClientPrincipal;

  try {
    principal = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  } catch {
    return null;
  }

  const claims = principal.claims ?? [];
  const getClaim = (typ: string) => claims.find(claim => claim.typ === typ)?.val;

  if (principal.auth_typ !== 'aad' || getClaim(TENANT_CLAIM) !== tenantId) {
    return null;
  }

  const username =
    USERNAME_CLAIMS.map(getClaim).find(Boolean) ?? headers.get('x-ms-client-principal-name');

  return username ? username.toLowerCase() : null;
}

// Signs in an existing Umami user matched by username. Users are never created here.
export async function createEntraLogin(username: string) {
  const user = await getUserByUsername(username, { includePassword: true });

  if (!user) {
    return null;
  }

  const { id, role, createdAt } = user;
  const pwd = hash(user.password);

  const token = redis.enabled
    ? await saveAuth({ userId: id, role, pwd })
    : createSecureToken({ userId: id, role, pwd }, secret());

  const teams = await getAllUserTeams(id);

  return {
    token,
    user: { id, username: user.username, role, createdAt, isAdmin: role === ROLES.admin, teams },
  };
}
