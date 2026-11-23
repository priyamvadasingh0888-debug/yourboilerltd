'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Calendar, ShieldCheck, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export function EngineerBottomNav() {
  const pathname = usePathname()
  const [avatarUrl, setAvatarUrl] = useState<string>('/images/engineer-avatar.jpg')

  useEffect(() => {
    try {
      const cached = localStorage.getItem('engineer_avatar_aaaaaaaa-0000-0000-0000-000000000003')
      if (cached) setAvatarUrl(cached)
    } catch {}
  }, [])

  const isHomeActive = pathname === '/engineer'
  const isJobsActive = pathname === '/engineer/jobs' || pathname.startsWith('/engineer/jobs/')
  const isScheduleActive = pathname === '/engineer/schedule'
  const isCertsActive = pathname.startsWith('/admin/certificates') || pathname === '/engineer/certificates'
  const isProfileActive = pathname.startsWith('/engineer/profile')

  return (
    <nav className="engineer-bottom-bar" aria-label="Operative Navigation">
      <Link
        href="/engineer"
        prefetch={true}
        className={`engineer-tab-item ${isHomeActive ? 'active' : ''}`}
      >
        <div className="tab-icon-wrap">
          <Home size={20} />
        </div>
        <span className="tab-label">Home</span>
        {isHomeActive && <span className="tab-indicator" />}
      </Link>

      <Link
        href="/engineer/jobs"
        prefetch={true}
        className={`engineer-tab-item ${isJobsActive ? 'active' : ''}`}
      >
        <div className="tab-icon-wrap">
          <Briefcase size={20} />
        </div>
        <span className="tab-label">Jobs</span>
        {isJobsActive && <span className="tab-indicator" />}
      </Link>

      <Link
        href="/engineer/schedule"
        prefetch={true}
        className={`engineer-tab-item ${isScheduleActive ? 'active' : ''}`}
      >
        <div className="tab-icon-wrap">
          <Calendar size={20} />
        </div>
        <span className="tab-label">Schedule</span>
        {isScheduleActive && <span className="tab-indicator" />}
      </Link>

      <Link
        href="/admin/certificates"
        prefetch={true}
        className={`engineer-tab-item ${isCertsActive ? 'active' : ''}`}
      >
        <div className="tab-icon-wrap">
          <ShieldCheck size={20} />
        </div>
        <span className="tab-label">Certs</span>
        {isCertsActive && <span className="tab-indicator" />}
      </Link>

      <Link
        href="/engineer/profile"
        prefetch={true}
        className={`engineer-tab-item ${isProfileActive ? 'active' : ''}`}
      >
        <div className="tab-icon-wrap">
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: isProfileActive ? '2px solid #d4fa35' : '1px solid #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
            }}
          >
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = '/images/engineer-avatar.jpg'
              }}
            />
          </div>
        </div>
        <span className="tab-label">Gas Safe</span>
        {isProfileActive && <span className="tab-indicator" />}
      </Link>
    </nav>
  )
}
