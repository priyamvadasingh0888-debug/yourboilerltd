import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database, UserRole } from '@/types/database'

const PUBLIC_ROUTES = ['/inquiry', '/auth/login', '/auth/callback', '/auth/error']

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'

function isValidHttpUrl(string?: string) {
  if (!string) return false
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let supabaseResponse = NextResponse.next({ request })

  // Static/API pass-through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.match(/\.(ico|png|jpg|svg|webp|json|txt|webmanifest|js)$/)
  ) {
    return supabaseResponse
  }

  // Check demo mode test login session
  const demoCookie = request.cookies.get(DEMO_COOKIE_NAME)?.value
  const demoUser = parseDemoCookie(demoCookie)

  if (demoUser) {
    const role = demoUser.role
    if (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/signup') {
      return NextResponse.redirect(new URL(role === 'engineer' ? '/engineer' : '/admin', request.url))
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', demoUser.id)
    requestHeaders.set('x-user-role', role)

    supabaseResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    if (pathname.startsWith('/admin')) {
      if (role !== 'admin' && role !== 'office_staff') {
        return NextResponse.redirect(new URL('/engineer', request.url))
      }
      return supabaseResponse
    }
    if (pathname.startsWith('/engineer')) {
      if (role !== 'engineer' && role !== 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return supabaseResponse
    }
    if (pathname === '/') {
      return NextResponse.redirect(new URL(role === 'engineer' ? '/engineer' : '/admin', request.url))
    }
    return supabaseResponse
  }

  // Allow public routes without auth
  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is unconfigured, redirect unauthenticated users to /auth/login for demo login
  if (!supabaseUrl || !isValidHttpUrl(supabaseUrl) || !supabaseKey || supabaseUrl.includes('your-project.supabase.co')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Read role from user metadata or app metadata first to avoid extra database round-trip
  let role: UserRole | null = (user.user_metadata?.role || user.app_metadata?.role) as UserRole | null

  if (!role) {
    // Fall back to profiles table only if metadata is absent
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
  }

  // Pass user info downstream via headers to avoid duplicate getUser() calls in server components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', user.id)
  if (role) requestHeaders.set('x-user-role', role)

  supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Route guards
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin' && role !== 'office_staff') {
      if (role === 'engineer') {
        return NextResponse.redirect(new URL('/engineer', request.url))
      }
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  if (pathname.startsWith('/engineer')) {
    if (role !== 'engineer' && role !== 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Root redirect
  if (pathname === '/') {
    if (role === 'engineer') {
      return NextResponse.redirect(new URL('/engineer', request.url))
    }
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
