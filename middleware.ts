import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard', '/generate', '/timeline', '/audit', '/saved',
  '/billing', '/team', '/settings',
];

export function middleware(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some(p =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected) {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
      ?.replace('https://', '')
      .split('.')[0] ?? '';
    const cookieName = `sb-${projectRef}-auth-token`;
    const hasSession = request.cookies.has(cookieName) ||
      request.cookies.has(`${cookieName}.0`);

    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
