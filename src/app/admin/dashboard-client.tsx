'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DashboardStats } from '@/types/database'
import {
  Briefcase, ArrowRight, AlertTriangle
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns'
import { JOB_TYPE_LABELS, STATUS_LABELS, INVOICE_STATUS_LABELS } from '@/types/database'

interface Props {
  stats: DashboardStats
  upcomingJobs: any[]
  engineerStatuses: any[]
  recentInvoices: any[]
  overdueTemplates: any[]
}

export function DashboardClient({ stats: initialStats, upcomingJobs, engineerStatuses, recentInvoices, overdueTemplates }: Props) {
  const [stats, setStats] = useState(initialStats)

  // Realtime updates for key stats
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        // Refetch stats on any job change
        refreshStats()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engineers' }, () => {
        refreshStats()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function refreshStats() {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const [
      { count: todaysJobs },
      { count: activeJobs },
      { count: availableEngineers },
      { data: outstanding },
      { count: newInquiries },
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('scheduled_start', today.toISOString()).lte('scheduled_start', todayEnd.toISOString()),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('engineers').select('*', { count: 'exact', head: true }).eq('availability_status', 'available'),
      supabase.from('invoices').select('total').in('status', ['sent', 'overdue']),
      supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    ])

    setStats(s => ({
      ...s,
      todaysJobs: todaysJobs ?? s.todaysJobs,
      activeJobs: activeJobs ?? s.activeJobs,
      availableEngineers: availableEngineers ?? s.availableEngineers,
      outstandingInvoiceTotal: (outstanding as any[])?.reduce((sum: number, i: any) => sum + (i.total ?? 0), 0) ?? s.outstandingInvoiceTotal,
      newInquiries: newInquiries ?? s.newInquiries,
    }))
  }

  const formatGBP = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

  const statCards = [
    { label: "Today's Jobs", value: stats.todaysJobs, href: '/admin/jobs' },
    { label: 'In Progress', value: stats.activeJobs, href: '/admin/jobs?status=in_progress' },
    { label: 'Available Engineers', value: stats.availableEngineers, href: '/admin/engineers' },
    { label: 'Outstanding', value: formatGBP(stats.outstandingInvoiceTotal), href: '/admin/invoices' },
    { label: 'New Inquiries', value: stats.newInquiries, href: '/admin/inquiries' },
    { label: 'Gas Safe Expiring', value: stats.expiringGasSafe, href: '/admin/engineers' },
  ]

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="mobile-hide" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <Link href="/admin/jobs/new" className="btn btn-primary">
            New Job
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map(({ label, value, href }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div className="stat-card">
              <span className="stat-label">{label}</span>
              <div className="stat-value">{value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Content Grid */}
      <div className="admin-dashboard-grid">
        {/* Upcoming Jobs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-paper)' }}>Upcoming Jobs</h2>
            <Link href="/admin/jobs" style={{ fontSize: '12px', color: 'var(--color-fey-signal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {/* Desktop Table */}
          <div className="desktop-only table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Customer</th>
                  <th>Engineer</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-ash)', padding: '32px' }}>
                      No upcoming jobs
                    </td>
                  </tr>
                ) : (
                  upcomingJobs.map((job: any) => (
                    <tr key={job.id}>
                      <td>
                        <Link href={`/admin/jobs/${job.id}`} style={{ color: 'var(--color-paper)', fontWeight: '500' }}>
                          {job.job_number}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--color-ash)', marginTop: '2px' }}>
                          {JOB_TYPE_LABELS[job.job_type as keyof typeof JOB_TYPE_LABELS] || job.job_type}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--color-mist)' }}>{job.customer?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-ash)' }}>{job.property?.postcode}</div>
                      </td>
                      <td>
                        {job.engineer ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="engineer-dot" style={{ background: job.engineer.schedule_colour }} />
                            <span style={{ fontSize: '13px' }}>{job.engineer.profile?.full_name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-ash)', fontSize: '12px' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                        {job.scheduled_start ? (
                          <span title={format(parseISO(job.scheduled_start), 'dd/MM/yyyy HH:mm')}>
                            {isToday(parseISO(job.scheduled_start))
                              ? format(parseISO(job.scheduled_start), 'HH:mm')
                              : format(parseISO(job.scheduled_start), 'dd MMM HH:mm')
                            }
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${job.status}`}>
                          {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (Ultra Minimal, no wide table) */}
          <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {upcomingJobs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-fog)', fontSize: '13px' }}>
                No upcoming jobs
              </div>
            ) : (
              upcomingJobs.map((job: any) => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--surface-card)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-paper)' }}>
                      {job.job_number}
                    </span>
                    <span className={`badge badge-${job.status}`}>
                      {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS]}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-mist)' }}>
                    {job.customer?.name} · <span style={{ color: 'var(--color-fog)' }}>{job.property?.postcode}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fog)', marginTop: '2px' }}>
                    <span>
                      {job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : 'Unscheduled'}
                    </span>
                    <span>
                      {job.engineer ? job.engineer.profile?.full_name : 'Unassigned'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Engineer Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-paper)' }}>Engineers</h2>
              <Link href="/admin/engineers" style={{ fontSize: '12px', color: 'var(--color-fey-signal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {engineerStatuses.map((eng: any, i: number) => (
                <div
                  key={eng.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderBottom: i < engineerStatuses.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="engineer-dot" style={{ background: eng.schedule_colour }} />
                    <span style={{ fontSize: '13px', color: 'var(--color-mist)', fontWeight: 500 }}>
                      {eng.profile?.full_name}
                    </span>
                  </div>
                  <span className={`badge badge-${eng.availability_status}`}>
                    {eng.availability_status === 'on_job' ? 'On Job' :
                     eng.availability_status === 'off_duty' ? 'Off Duty' : 'Available'}
                  </span>
                </div>
              ))}
              {engineerStatuses.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ash)', fontSize: '13px' }}>
                  No engineers
                </div>
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-paper)' }}>Recent Invoices</h2>
              <Link href="/admin/invoices" style={{ fontSize: '12px', color: 'var(--color-fey-signal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {recentInvoices.map((inv: any, i: number) => (
                <Link
                  key={inv.id}
                  href={`/admin/invoices`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderBottom: i < recentInvoices.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--color-paper)', fontFamily: 'var(--font-mono)' }}>
                      {inv.invoice_number}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ash)' }}>{inv.customer?.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-mist)', fontWeight: '500' }}>
                      {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(inv.total)}
                    </div>
                    <span className={`badge badge-${inv.status}`} style={{ marginTop: '3px' }}>
                      {INVOICE_STATUS_LABELS[inv.status as keyof typeof INVOICE_STATUS_LABELS]}
                    </span>
                  </div>
                </Link>
              ))}
              {recentInvoices.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-ash)', fontSize: '13px' }}>No invoices</div>
              )}
            </div>
          </div>

          {/* Overdue Templates */}
          {overdueTemplates.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-3)' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-paper)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} style={{ color: 'var(--color-coral-red)' }} />
                  Overdue Templates
                </h2>
                <Link href="/admin/recurring" style={{ fontSize: '12px', color: 'var(--color-fey-signal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {overdueTemplates.map((t: any, i: number) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: i < overdueTemplates.length - 1 ? '1px solid var(--color-graphite)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--color-mist)' }}>
                      {t.customer?.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ash)' }}>
                      {t.property?.address_line1} · {JOB_TYPE_LABELS[t.job_type as keyof typeof JOB_TYPE_LABELS]}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-coral-red)', marginTop: '2px' }}>
                      Due {t.next_due_at ? formatDistanceToNow(parseISO(t.next_due_at), { addSuffix: true }) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
