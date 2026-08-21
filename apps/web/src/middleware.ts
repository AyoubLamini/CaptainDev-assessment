import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hasSession = (request.cookies.has('__Host-session') || request.cookies.has('nova_session'));
  
  const publicPaths = ['/login', '/forgot-password', '/reset-password', '/accept-invitation'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
  
  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (hasSession && request.nextUrl.pathname.startsWith('/login')) {
    const isPlatformAdmin = request.cookies.get('isPlatformAdmin')?.value === 'true';
    const redirectUrl = isPlatformAdmin ? '/platform/organizations' : '/companies';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
