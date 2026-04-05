import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
    const token = req.cookies.get('token') || req.cookies.get('tc_token');
    const { pathname } = req.nextUrl;

    // ── Auth Guard ────────────────────────────────────────────────────────
    // Use req.nextUrl.clone() for redirects — it automatically includes basePath.
    if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/legacy'))) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }
    if (token && (pathname === '/' || pathname === '/login' || pathname === '/login/')) {
        const url = req.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    // ── CSP Nonce Generation (per-request) ────────────────────────────────
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    const cspHeader = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
        "connect-src 'self' wss: ws:",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "object-src 'none'",
        "base-uri 'none'",
        "frame-src 'self'",
    ].join('; ');

    // Pass nonce to server components via request header
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', cspHeader);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    // Set CSP on response so browser enforces it
    response.headers.set('Content-Security-Policy', cspHeader);

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
