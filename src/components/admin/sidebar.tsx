'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  HardHat,
  Calendar,
  FileText,
  Receipt,
  RefreshCw,
  MessageSquare,
  LogOut,
  Flame,
} from 'lucide-react'

const NAV = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
      { label: 'Scheduler', href: '/admin/scheduler', icon: Calendar },
      { label: 'Engineers', href: '/admin/engineers', icon: HardHat },
    ],
  },
  {
    section: 'Customers',
    items: [
      { label: 'Customers', href: '/admin/customers', icon: Users },
      { label: 'Properties', href: '/admin/properties', icon: Building2 },
    ],
  },
  {
    section: 'Documents',
    items: [
      { label: 'Certificates', href: '/admin/certificates', icon: FileText },
      { label: 'Invoices', href: '/admin/invoices', icon: Receipt },
      { label: 'Recurring', href: '/admin/recurring', icon: RefreshCw },
    ],
  },
  {
    section: 'Inquiries',
    items: [
      { label: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare },
    ],
  },
]

import { useInquiryCount } from '@/hooks/use-inquiry-count'

export function AdminSidebar() {
  const newInquiries = useInquiryCount()
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    document.cookie = 'boiler_demo_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {}
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav className="app-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'var(--surface-elevated)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <Flame size={16} color="var(--color-fey-ember)" strokeWidth={2} />
          </div>
          <div>
            <div className="sidebar-logo-text">Your Boiler Ltd</div>
            <div className="sidebar-logo-sub">Operations Terminal</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {NAV.map(group => (
            <div key={group.section} className="sidebar-section" style={{ padding: '6px 0' }}>
              <div className="sidebar-section-label">{group.section}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                {group.items.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  const badge = item.href === '/admin/inquiries' && newInquiries > 0 ? newInquiries : null
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={`nav-item ${active ? 'active' : ''}`}
                    >
                      <Icon className="nav-item-icon" size={15} strokeWidth={active ? 2 : 1.75} />
                      <span>{item.label}</span>
                      {badge && (
                        <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 10px' }}>
          <button
            onClick={handleSignOut}
            className="nav-item"
            style={{ color: 'var(--color-fey-graphite)', width: '100%', justifyContent: 'flex-start' }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span>Sign out</span>
          </button>
        </div>
      </nav>
  )
}
