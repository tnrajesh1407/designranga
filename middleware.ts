// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip auth for API routes (they're called from the app itself)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const password = process.env.ADMIN_PASSWORD
  if (!password) return NextResponse.next()

  // Check cookie
  const authCookie = request.cookies.get('dr_admin_auth')
  if (authCookie?.value === password) {
    return NextResponse.next()
  }

  // Check if login page
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  // Redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
