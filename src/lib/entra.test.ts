import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getUserByUsername } from '@/queries/prisma';
import { createEntraLogin, getEntraUsername } from './entra';

vi.mock('@/queries/prisma', () => ({
  getUserByUsername: vi.fn(),
  getAllUserTeams: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/auth', () => ({
  saveAuth: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  default: { enabled: false },
}));

const TENANT_ID = 'f0701e68-a1fa-4a29-8a5f-e0b29ab0fa2b';

function principalHeaders(principal: object, extra: Record<string, string> = {}) {
  return new Headers({
    'x-ms-client-principal': Buffer.from(JSON.stringify(principal)).toString('base64'),
    ...extra,
  });
}

function aadPrincipal(claims: Record<string, string>) {
  return {
    auth_typ: 'aad',
    claims: Object.entries(claims).map(([typ, val]) => ({ typ, val })),
  };
}

const tenantClaim = { 'http://schemas.microsoft.com/identity/claims/tenantid': TENANT_ID };

describe('getEntraUsername', () => {
  beforeEach(() => {
    vi.stubEnv('ENTRA_TENANT_ID', TENANT_ID);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('returns the lowercased preferred username for the configured tenant', () => {
    const headers = principalHeaders(
      aadPrincipal({ ...tenantClaim, preferred_username: 'Mirko.Pleli@Locins.com' }),
    );

    expect(getEntraUsername(headers)).toBe('mirko.pleli@locins.com');
  });

  test('falls back to the principal name header', () => {
    const headers = principalHeaders(aadPrincipal(tenantClaim), {
      'x-ms-client-principal-name': 'user@locins.com',
    });

    expect(getEntraUsername(headers)).toBe('user@locins.com');
  });

  test('rejects users from another tenant', () => {
    const headers = principalHeaders(
      aadPrincipal({
        'http://schemas.microsoft.com/identity/claims/tenantid': 'other-tenant',
        preferred_username: 'user@example.com',
      }),
    );

    expect(getEntraUsername(headers)).toBeNull();
  });

  test('rejects other identity providers', () => {
    const headers = principalHeaders({
      ...aadPrincipal({ ...tenantClaim, preferred_username: 'user@locins.com' }),
      auth_typ: 'github',
    });

    expect(getEntraUsername(headers)).toBeNull();
  });

  test('ignores malformed headers', () => {
    expect(getEntraUsername(new Headers({ 'x-ms-client-principal': 'not-json' }))).toBeNull();
  });

  test('is disabled without ENTRA_TENANT_ID', () => {
    vi.stubEnv('ENTRA_TENANT_ID', '');
    const headers = principalHeaders(
      aadPrincipal({ ...tenantClaim, preferred_username: 'user@locins.com' }),
    );

    expect(getEntraUsername(headers)).toBeNull();
  });
});

describe('createEntraLogin', () => {
  test('returns null when no Umami user matches', async () => {
    vi.mocked(getUserByUsername).mockResolvedValue(null);

    expect(await createEntraLogin('unknown@locins.com')).toBeNull();
  });

  test('issues a token for an existing user', async () => {
    vi.mocked(getUserByUsername).mockResolvedValue({
      id: 'user-id',
      username: 'mirko.pleli@locins.com',
      password: 'hashed',
      role: 'admin',
      createdAt: new Date(),
    } as any);

    const login = await createEntraLogin('mirko.pleli@locins.com');

    expect(login?.token).toEqual(expect.any(String));
    expect(login?.user).toMatchObject({ id: 'user-id', isAdmin: true, teams: [] });
  });
});
