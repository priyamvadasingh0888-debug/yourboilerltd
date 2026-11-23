'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEMO_USERS, DEMO_COOKIE_NAME } from '@/lib/auth/demo'

export async function loginAsDemo(role: 'admin' | 'engineer' = 'admin') {
  const user = DEMO_USERS[role]
  if (!user) return { error: 'Unknown role' }

  const cookieStore = await cookies()
  cookieStore.set(DEMO_COOKIE_NAME, role, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
    httpOnly: false,
  })

  if (role === 'engineer') {
    redirect('/engineer')
  } else {
    redirect('/admin')
  }
}

export async function logoutDemo() {
  const cookieStore = await cookies()
  cookieStore.set(DEMO_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
  })
  redirect('/auth/login')
}
