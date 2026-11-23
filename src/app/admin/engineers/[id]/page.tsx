import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Award,
  Shield,
  Wrench,
  Check,
} from 'lucide-react'
import {
  JOB_TYPE_LABELS,
  STATUS_LABELS,
  ENGINEER_CATEGORY_LABELS,
  type JobType,
  type JobStatus,
} from '@/types/database'
import type { Metadata } from 'next'
import { EngineerDocumentVault } from '@/components/admin/engineer-document-vault'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: eng } = await supabase
    .from('engineers')
    .select('profile:profiles(full_name)')
    .eq('id', id)
    .single()
  return { title: (eng as any)?.profile?.full_name ?? 'Engineer' }
}

export default async function EngineerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: engineer }, { data: jobs }, { data: documents }] = await Promise.all([
    supabase
      .from('engineers')
      .select('*, profile:profiles(full_name, email, phone)')
      .eq('id', id)
      .single(),
    supabase
      .from('jobs')
      .select(
        '*, customer:customers(name), property:properties(address_line1, postcode)'
      )
      .eq('engineer_id', id)
      .order('scheduled_start', { ascending: false })
      .limit(20),
    supabase
      .from('engineer_documents')
      .select('*')
      .eq('engineer_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!engineer) notFound()

  const eng = engineer as any
  const now = new Date()
  const gasExpiry = eng.gas_safe_expiry ? new Date(eng.gas_safe_expiry) : null
  const isExpired = gasExpiry && gasExpiry < now
  const isExpiringSoon =
    gasExpiry &&
    !isExpired &&
    gasExpiry <= new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const daysUntilExpiry = gasExpiry ? differenceInDays(gasExpiry, now) : null

  const statusLabel =
    eng.availability_status === 'on_job'
      ? 'On Job'
      : eng.availability_status === 'off_duty'
        ? 'Off Duty'
        : 'Available'

  const isSubcontractor = eng.category === 'subcontractor'

  return (
    <div className="page-content">
      <Link
        href="/admin/engineers"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 'var(--spacing-4)' }}
      >
        <ArrowLeft size={14} /> Back to Engineers
      </Link>

      <div className="page-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: eng.schedule_colour,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: '600',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {eng.profile?.full_name?.[0] ?? 'E'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{eng.profile?.full_name}</h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '99px',
                  background: isSubcontractor ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: isSubcontractor ? '#fbbf24' : '#a5b4fc',
                  border: isSubcontractor ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                {isSubcontractor ? 'Subcontractor' : 'In-House Staff'}
              </span>
            </div>
            <div style={{ marginTop: '4px' }}>
              <span className={`badge badge-${eng.availability_status}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
        <Link href={`/admin/engineers/${id}/edit`} className="btn btn-secondary">
          Edit Profile
        </Link>
      </div>

      <div
        className="job-detail-layout"
        style={{ alignItems: 'start' }}
      >
        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-5)',
          }}
        >
          {/* Gas Safe Info */}
          <div className="card">
            <h3
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--color-ash)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 'var(--spacing-3)',
              }}
            >
              Gas Safe &amp; Official Licensing
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: isExpired
                  ? 'rgba(239,68,68,0.1)'
                  : isExpiringSoon
                    ? 'rgba(251,191,36,0.1)'
                    : 'rgba(39,166,68,0.1)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : isExpiringSoon ? 'rgba(251,191,36,0.3)' : 'rgba(39,166,68,0.3)'}`,
              }}
            >
              {isExpired ? (
                <ShieldAlert
                  size={24}
                  style={{ color: 'var(--color-coral-red)' }}
                />
              ) : isExpiringSoon ? (
                <ShieldAlert size={24} style={{ color: '#fbbf24' }} />
              ) : (
                <ShieldCheck
                  size={24}
                  style={{ color: 'var(--color-pulse-green)' }}
                />
              )}
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-paper)',
                  }}
                >
                  {eng.gas_safe_number ?? eng.license_number ?? 'Not Registered'}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: isExpired
                      ? 'var(--color-coral-red)'
                      : isExpiringSoon
                        ? '#fbbf24'
                        : 'var(--color-fog)',
                    marginTop: '2px',
                  }}
                >
                  {gasExpiry
                    ? isExpired
                      ? `Expired ${format(gasExpiry, 'dd/MM/yyyy')}`
                      : `Expires ${format(gasExpiry, 'dd/MM/yyyy')} (${daysUntilExpiry} days)`
                    : 'No expiry set'}
                </div>
              </div>
            </div>
          </div>

          {/* Certified Qualifications Matrix */}
          <div className="card">
            <h3
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--color-ash)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 'var(--spacing-3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Award size={14} /> Certified Qualifications
            </h3>
            {eng.qualifications && eng.qualifications.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {eng.qualifications.map((q: string) => (
                  <span
                    key={q}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '99px',
                      background: 'rgba(212, 250, 53, 0.12)',
                      color: 'var(--color-fey-signal)',
                      border: '1px solid rgba(212, 250, 53, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={12} />
                    {q}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                No qualifications recorded. Click &ldquo;Edit Profile&rdquo; to add CCN1, CENWAT, etc.
              </div>
            )}
          </div>

          {/* Document Vault (Any format: PDF, images, etc.) */}
          <EngineerDocumentVault
            engineerId={id}
            initialDocuments={documents || []}
          />

          {/* Specialties */}
          {eng.specialties?.length > 0 && (
            <div className="card">
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--color-ash)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 'var(--spacing-3)',
                }}
              >
                Job Specialties
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {eng.specialties.map((s: string) => (
                  <span
                    key={s}
                    className="badge badge-default"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    {JOB_TYPE_LABELS[s as JobType] ?? s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Jobs */}
          <div>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--color-paper)',
                marginBottom: 'var(--spacing-3)',
              }}
            >
              Recent Assigned Jobs
            </h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Type</th>
                    <th>Customer</th>
                    <th>Property</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(jobs ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: 'center',
                          color: 'var(--color-ash)',
                          padding: '24px',
                        }}
                      >
                        No jobs assigned yet
                      </td>
                    </tr>
                  ) : (
                    (jobs ?? []).map((j: any) => (
                      <tr key={j.id}>
                        <td>
                          <Link
                            href={`/admin/jobs/${j.id}`}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: '500',
                              color: 'var(--color-paper)',
                            }}
                          >
                            {j.job_number}
                          </Link>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px' }}>
                            {JOB_TYPE_LABELS[j.job_type as JobType]}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{j.customer?.name}</td>
                        <td style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                          {j.property?.address_line1}, {j.property?.postcode}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                          {j.scheduled_start
                            ? format(parseISO(j.scheduled_start), 'dd/MM/yyyy HH:mm')
                            : '—'}
                        </td>
                        <td>
                          <span className={`badge badge-${j.status}`}>
                            {STATUS_LABELS[j.status as JobStatus]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          {/* Contact Details */}
          <div className="card">
            <h3
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--color-ash)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 'var(--spacing-3)',
              }}
            >
              Contact Information
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--color-fog)',
                }}
              >
                <Mail size={14} style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--color-paper)' }}>
                  {eng.profile?.email}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--color-fog)',
                }}
              >
                <Phone size={14} style={{ flexShrink: 0 }} />
                <span>
                  {eng.phone ?? eng.profile?.phone ?? 'No phone recorded'}
                </span>
              </div>
            </div>
          </div>

          {/* Dispatch Metadata */}
          <div className="card">
            <h3
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--color-ash)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 'var(--spacing-3)',
              }}
            >
              Dispatch Configuration
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--color-fog)' }}>Category:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-paper)' }}>
                  {isSubcontractor ? 'Subcontractor' : 'In-House Staff'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--color-fog)' }}>Calendar Dot:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: eng.schedule_colour,
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {eng.schedule_colour}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
