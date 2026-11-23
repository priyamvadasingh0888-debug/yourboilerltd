'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  MoreHorizontal,
  Building2,
  HardHat,
  FileText,
  Receipt,
  RefreshCw,
  MessageSquare,
  LogOut,
  X,
  Flame,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useInquiryCount } from '@/hooks/use-inquiry-count'

export function AdminBottomNav() {
  const newInquiries = useInquiryCount()
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    document.cookie =
      'boiler_demo_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {}
    router.push('/auth/login')
    router.refresh()
  }

  const PRIMARY_TABS = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
    { label: 'Clients', href: '/admin/customers', icon: Users },
    { label: 'Schedule', href: '/admin/scheduler', icon: Calendar },
  ]

  const MORE_MENU_ITEMS = [
    { label: 'Engineers', href: '/admin/engineers', icon: HardHat, desc: 'Field operatives & Gas Safe' },
    { label: 'Properties', href: '/admin/properties', icon: Building2, desc: 'Client sites & postcodes' },
    { label: 'Invoices & Billing', href: '/admin/invoices', icon: Receipt, desc: 'Payments, VAT & totals' },
    { label: 'Certificates (CP12)', href: '/admin/certificates', icon: FileText, desc: 'Gas safety records' },
    { label: 'Recurring Service', href: '/admin/recurring', icon: RefreshCw, desc: 'Annual service schedules' },
    {
      label: 'Client Inquiries',
      href: '/admin/inquiries',
      icon: MessageSquare,
      desc: 'Incoming portal leads',
      badge: newInquiries > 0 ? newInquiries : null,
    },
  ]

  const isMoreActive = MORE_MENU_ITEMS.some(item => pathname.startsWith(item.href))

  return (
    <>
      {/* ── Mobile Sticky Top App Bar ── */}
      <header className="mobile-top-bar">
        <div className="mobile-top-bar-left">
          <div className="mobile-logo-mark">
            <Flame size={16} color="var(--color-fey-ember)" strokeWidth={2.2} />
          </div>
          <div>
            <div className="mobile-logo-text">Your Boiler Ltd</div>
            <div className="mobile-logo-sub">Operations</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/engineer"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-fog)',
              textDecoration: 'none',
              padding: '6px 10px',
              borderRadius: '99px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            Engineer PWA
          </Link>
          <Link
            href="/admin/jobs/new"
            className="mobile-quick-add-btn"
            aria-label="Create new job"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Job</span>
          </Link>
        </div>
      </header>

      {/* ── Mobile Phone Bottom Tab Bar ── */}
      <nav className="admin-bottom-tab-bar" aria-label="Mobile Navigation">
        {PRIMARY_TABS.map(tab => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={`bottom-tab-item ${active ? 'active' : ''}`}
            >
              <div className="bottom-tab-icon-wrap">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
              </div>
              <span className="bottom-tab-label">{tab.label}</span>
              {active && <span className="bottom-tab-indicator" />}
            </Link>
          )
        })}

        {/* More Tab Trigger */}
        <button
          type="button"
          className={`bottom-tab-item ${isMoreActive || sheetOpen ? 'active' : ''}`}
          onClick={() => setSheetOpen(true)}
          aria-label="Open full menu"
        >
          <div className="bottom-tab-icon-wrap" style={{ position: 'relative' }}>
            <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.2 : 1.75} />
            {newInquiries > 0 && (
              <span className="bottom-tab-badge-dot" />
            )}
          </div>
          <span className="bottom-tab-label">More</span>
          {(isMoreActive || sheetOpen) && <span className="bottom-tab-indicator" />}
        </button>
      </nav>

      {/* ── Mobile Slide-Up Sheet Menu ── */}
      {sheetOpen && (
        <div
          className="slide-up-sheet-backdrop"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="slide-up-sheet-container"
            onClick={e => e.stopPropagation()}
          >
            {/* Grab Bar Handle */}
            <div className="slide-up-sheet-handle" />

            {/* Sheet Header */}
            <div className="slide-up-sheet-header">
              <div>
                <h3 className="slide-up-sheet-title">Operations Menu</h3>
                <p className="slide-up-sheet-subtitle">All modules & system navigation</p>
              </div>
              <button
                type="button"
                className="slide-up-sheet-close"
                onClick={() => setSheetOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Strip */}
            <div className="slide-up-sheet-quick-actions">
              <Link
                href="/admin/jobs/new"
                className="sheet-quick-btn"
                onClick={() => setSheetOpen(false)}
              >
                <Plus size={14} /> New Job
              </Link>
              <Link
                href="/admin/customers/new"
                className="sheet-quick-btn"
                onClick={() => setSheetOpen(false)}
              >
                <Plus size={14} /> New Customer
              </Link>
            </div>

            {/* Navigation List */}
            <div className="slide-up-sheet-nav-list">
              {MORE_MENU_ITEMS.map(item => {
                const Icon = item.icon
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`sheet-nav-item ${active ? 'active' : ''}`}
                    onClick={() => setSheetOpen(false)}
                  >
                    <div className="sheet-nav-item-icon">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <div className="sheet-nav-item-text">
                      <div className="sheet-nav-item-label">
                        {item.label}
                        {item.badge && (
                          <span className="sheet-nav-badge">{item.badge}</span>
                        )}
                      </div>
                      <div className="sheet-nav-item-desc">{item.desc}</div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Footer / Sign Out */}
            <div className="slide-up-sheet-footer">
              <button
                type="button"
                onClick={handleSignOut}
                className="sheet-signout-btn"
              >
                <LogOut size={16} />
                <span>Sign Out of Terminal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
