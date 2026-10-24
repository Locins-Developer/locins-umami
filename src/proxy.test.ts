import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { proxy } from './proxy';

function request(url: string, host: string) {
  return new NextRequest(url, { headers: { host } });
}

describe('proxy', () => {
  beforeEach(() => {
    vi.stubEnv('CANONICAL_HOST', 'umami.locins.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('redirects the azurewebsites.net host to the canonical host', () => {
    const response = proxy(
      request(
        'https://locins-umami.azurewebsites.net/websites?a=1',
        'locins-umami.azurewebsites.net',
      ),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://umami.locins.com/websites?a=1');
  });

  test('passes through requests on the canonical host', () => {
    const response = proxy(request('https://umami.locins.com/', 'umami.locins.com'));

    expect(response.headers.get('location')).toBeNull();
  });

  test('passes through when CANONICAL_HOST is not set', () => {
    vi.stubEnv('CANONICAL_HOST', '');
    const response = proxy(
      request('https://locins-umami.azurewebsites.net/', 'locins-umami.azurewebsites.net'),
    );

    expect(response.headers.get('location')).toBeNull();
  });
});
