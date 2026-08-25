import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function passwordDigest(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`reelflow:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.DASHBOARD_PASSWORD;
  if (!configuredPassword) {
    return NextResponse.json({ error: 'Dashboard authentication is not configured.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  if (!safeEqual(password, configuredPassword)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('reelflow_auth', await passwordDigest(configuredPassword), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.DASHBOARD_COOKIE_SECURE === 'true',
    maxAge: 60 * 60 * 12,
    path: '/',
  });
  return response;
}
