import { NextRequest, NextResponse } from 'next/server';

async function passwordDigest(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`reelflow:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return new NextResponse('Dashboard authentication is not configured.', { status: 503 });
  }

  const expected = await passwordDigest(password);
  const authenticated = request.cookies.get('reelflow_auth')?.value === expected;

  if (authenticated || request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)'],
};
