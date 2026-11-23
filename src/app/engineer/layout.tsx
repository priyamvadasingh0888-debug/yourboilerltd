import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'
import { ArrowUpRight } from 'lucide-react'
import type { Metadata, Viewport } from 'next'
import { EngineerBottomNav } from '@/components/engineer/engineer-bottom-nav'
import { PwaInstallPrompt } from '@/components/engineer/pwa-install-prompt'

export const metadata: Metadata = {
  title: 'Engineer Portal | Your Boiler Ltd',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Boiler PWA',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function EngineerLayout({ children }: { children: React.ReactNode }) {
  const reqHeaders = await headers()
  const cookieStore = await cookies()

  const headerRole = reqHeaders.get('x-user-role')
  const userId = reqHeaders.get('x-user-id')
  const demoCookie = cookieStore.get(DEMO_COOKIE_NAME)?.value
  const demoUser = parseDemoCookie(demoCookie)

  // Fast path: proxy already validated auth
  if (!demoUser && headerRole) {
    if (headerRole !== 'engineer' && headerRole !== 'admin') {
      redirect('/admin')
    }
    if (headerRole === 'engineer' && userId) {
      const supabase = await createClient()
      const { data: engRecord } = await supabase
        .from('engineers')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle()

      if (!engRecord) {
        redirect('/auth/login?error=account_deactivated')
      }
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

    if (!profile || (profile.role !== 'engineer' && profile.role !== 'admin')) {
      redirect('/admin')
    }

    if (profile.role === 'engineer') {
      const { data: engRecord } = await supabase
        .from('engineers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (!engRecord) {
        redirect('/auth/login?error=account_deactivated')
      }
    }
  }

  return (
    <div className="engineer-app">
      {/* PWA Installation Option / Banner */}
      <PwaInstallPrompt />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px calc(86px + env(safe-area-inset-bottom, 16px)) 16px',
          maxWidth: '480px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>

      {/* Modern 5-Section Bottom Tab Bar */}
      <EngineerBottomNav />
    </div>
  )
}
