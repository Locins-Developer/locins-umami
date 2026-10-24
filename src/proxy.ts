import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Redirects the default *.azurewebsites.net host to the custom domain in CANONICAL_HOST.
export function proxy(request: NextRequest) {
  const canonicalHost = process.env.CANONICAL_HOST;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';

  if (!canonicalHost || !host.endsWith('.azurewebsites.net')) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  return NextResponse.redirect(`https://${canonicalHost}${pathname}${search}`, 308);
}
