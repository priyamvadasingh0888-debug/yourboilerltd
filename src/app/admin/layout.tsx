import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminBottomNav } from '@/components/admin/admin-bottom-nav'
import type { Metadata } from 'next'
import { headers, cookies } from 'next/headers'
import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | Your Boiler Ltd',
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Always call headers() and cookies() unconditionally (they use React's use() internally)
  const reqHeaders = await headers()
  const cookieStore = await cookies()

  const headerRole = reqHeaders.get('x-user-role')
  const demoCookie = cookieStore.get(DEMO_COOKIE_NAME)?.value
  const demoUser = parseDemoCookie(demoCookie)

  // Fast path: proxy.ts already verified auth and role
  if (!demoUser && headerRole) {
    if (headerRole !== 'admin' && headerRole !== 'office_staff') {
      redirect('/engineer')
    }
  } else if (!demoUser) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'office_staff')) {
      redirect('/engineer')
    }
  }

  // Badge counts are fetched client-side by sidebar/bottom-nav to avoid blocking layout render

  return (
    <div className="app-layout">
      <AdminSidebar />
      <div className="app-main">
        {children}
      </div>
      <AdminBottomNav />
    </div>
  )
}
