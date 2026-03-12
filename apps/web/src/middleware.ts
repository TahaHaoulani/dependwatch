import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/docs',
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/cookies',
  '/acceptable-use',
  '/security',
  '/contact',
  '/support',
  '/about',
  '/status',
  '/api-reliability',
];
const API_PUBLIC_PREFIXES = ['/api/ingest', '/api/webhooks', '/api/auth', '/api/health', '/api/mcp'];

// Match auth.ts cookie name so middleware and NextAuth use the same cookie (avoids stale/missing session)
function getSessionCookieName(): string {
  const url = process.env.NEXTAUTH_URL;
  if (url?.startsWith('https://') || process.env.VERCEL) {
    return '__Secure-next-auth.session-token';
  }
  return 'next-auth.session-token';
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === '/signup') {
    return NextResponse.redirect(new URL('/login?signup=1', req.url));
  }

  if (API_PUBLIC_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  const cookieName = getSessionCookieName();
  const isPublic = PUBLIC_PATHS.some((p) => p === path || path.startsWith(p + '/'));
  if (isPublic) {
    const token = secret ? await getToken({ req, secret, cookieName }) : null;
    if (token && (path === '/login' || path.startsWith('/login'))) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
    return NextResponse.next();
  }

  const token = secret ? await getToken({ req, secret, cookieName }) : null;
  if (!token) {
    const login = new URL('/login', req.url);
    login.searchParams.set('callbackUrl', path);
    login.searchParams.set('expired', '1'); // so login page can show "session expired" message
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
