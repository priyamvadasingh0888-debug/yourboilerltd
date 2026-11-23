import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  MapPin, Phone, Mail, Plus, ArrowLeft, Building2, Briefcase,
  FileText, RefreshCw, Calendar, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react'
import {
  PROPERTY_TYPE_LABELS, JOB_TYPE_LABELS, STATUS_LABELS,
  type PropertyType, type JobStatus, type JobType, type CertificateStatus
} from '@/types/database'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('properties').select('address_line1, postcode').eq('id', id).single()
  return { title: data ? `${data.address_line1}, ${data.postcode}` : 'Property Detail' }
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: property },
    { data: jobs },
    { data: certificates },
    { data: templates }
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('jobs')
      .select('*, engineer:engineers(schedule_colour, profile:profiles(full_name))')
      .eq('property_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('certificates')
      .select('*, engineer:engineers(profile:profiles(full_name))')
      .eq('property_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('recurring_templates')
      .select('*')
      .eq('property_id', id)
  ])

  if (!property) notFound()

  return (
    <div className="page-content">
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link
          href="/admin/properties"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-fog)',
            textDecoration: 'none',
            fontSize: '13px',
          }}
        >
          <ArrowLeft size={16} /> Back to Properties
        </Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href={`/admin/properties/${property.id}/edit`}
            className="btn btn-secondary"
          >
            Edit Property
          </Link>
          <Link
            href={`/admin/jobs/new?customer_id=${property.customer_id}&property_id=${property.id}`}
            className="btn btn-primary"
          >
            <Plus size={15} /> Book New Job
          </Link>
        </div>
      </div>

      {/* Property Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Main Info */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-paper)', margin: 0 }}>
                  {property.address_line1}
                </h1>
                <span className="badge badge-default">
                  {property.type.toUpperCase()}
                </span>
              </div>
              {property.address_line2 && (
                <div style={{ fontSize: '14px', color: 'var(--color-mist)', marginBottom: '4px' }}>
                  {property.address_line2}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-brand)', fontWeight: 600, fontSize: '15px' }}>
                <MapPin size={16} />
                <span>{property.postcode}, {property.city}</span>
              </div>
            </div>
          </div>

          {property.notes && (
            <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-fog)', marginBottom: '4px' }}>
                Access & Property Notes
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-mist)', margin: 0 }}>{property.notes}</p>
            </div>
          )}
        </div>

        {/* Customer Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-fog)', marginBottom: '12px' }}>
            Account Holder / Landlord
          </div>
          {property.customer ? (
            <div>
              <Link
                href={`/admin/customers/${property.customer.id}`}
                style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-paper)', textDecoration: 'none', display: 'block', marginBottom: '8px' }}
              >
                {property.customer.name}
              </Link>
              <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginBottom: '12px', textTransform: 'capitalize' }}>
                Customer Type: {property.customer.type}
              </div>
              {property.customer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-mist)', marginBottom: '6px' }}>
                  <Phone size={14} style={{ color: 'var(--color-fog)' }} />
                  <a href={`tel:${property.customer.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {property.customer.phone}
                  </a>
                </div>
              )}
              {property.customer.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-mist)' }}>
                  <Mail size={14} style={{ color: 'var(--color-fog)' }} />
                  <a href={`mailto:${property.customer.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {property.customer.email}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--color-fog)' }}>No customer linked</span>
          )}
        </div>
      </div>

      {/* Tabs & Content Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Job History */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-paper)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} style={{ color: 'var(--color-brand)' }} /> Job History ({jobs?.length ?? 0})
            </h2>
            <Link
              href={`/admin/jobs/new?customer_id=${property.customer_id}&property_id=${property.id}`}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              <Plus size={13} /> Book Job
            </Link>
          </div>

          {!jobs || jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-fog)', fontSize: '13px' }}>
              No service or installation jobs recorded for this property yet.
            </div>
          ) : (
            <div className="table-container" style={{ margin: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Engineer</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => (
                    <tr key={job.id}>
                      <td>
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-paper)', textDecoration: 'none' }}
                        >
                          {job.job_number}
                        </Link>
                      </td>
                      <td>{JOB_TYPE_LABELS[job.job_type as JobType] ?? job.job_type}</td>
                      <td>
                        <span className={`badge badge-${job.status}`}>
                          {STATUS_LABELS[job.status as JobStatus] ?? job.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {job.scheduled_start ? format(parseISO(job.scheduled_start), 'dd MMM yyyy HH:mm') : '—'}
                      </td>
                      <td>
                        {job.engineer ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: job.engineer.schedule_colour || '#6366f1',
                              }}
                            />
                            {job.engineer.profile?.full_name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-fog)' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-fog)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.description || job.completion_notes || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/admin/jobs/${job.id}`} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '12px' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Gas Safety Certificates */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-paper)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} style={{ color: '#27a644' }} /> Gas Safety Records (CP12) ({certificates?.length ?? 0})
            </h2>
          </div>

          {!certificates || certificates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-fog)', fontSize: '13px' }}>
              No gas safety certificates issued for this property yet.
            </div>
          ) : (
            <div className="table-container" style={{ margin: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Certificate #</th>
                    <th>Safety Result</th>
                    <th>Status</th>
                    <th>Issued At</th>
                    <th>Expires At</th>
                    <th>Operative</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert: any) => (
                    <tr key={cert.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-paper)' }}>
                        {cert.certificate_number}
                      </td>
                      <td>
                        <span className={`badge badge-${cert.safety_result === 'pass' ? 'paid' : 'overdue'}`}>
                          {cert.safety_result ? cert.safety_result.toUpperCase() : 'PENDING'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${cert.status}`}>
                          {cert.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {cert.issued_at ? format(parseISO(cert.issued_at), 'dd MMM yyyy') : '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: cert.expires_at && parseISO(cert.expires_at) < new Date() ? 'var(--color-crimson)' : 'inherit' }}>
                        {cert.expires_at ? format(parseISO(cert.expires_at), 'dd MMM yyyy') : '—'}
                      </td>
                      <td>{cert.engineer?.profile?.full_name || cert.operative_name || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/admin/certificates/${cert.id}`} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '12px' }}>
                          View CP12
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
