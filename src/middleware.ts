import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// fast optimistic check: cookie exists → allow; else redirect.
// (We still validate session in the page itself)
export function middleware(req: NextRequest) {
  const cookie = getSessionCookie(req);
  if (
    !cookie &&
    (req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/pending'))
  ) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard', '/admin', '/pending'] };
