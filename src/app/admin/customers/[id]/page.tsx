import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { MapPin, Phone, Mail, Plus, ArrowLeft, Building2, Briefcase } from 'lucide-react'
import { CUSTOMER_TYPE_LABELS, JOB_TYPE_LABELS, STATUS_LABELS, INVOICE_STATUS_LABELS, type CustomerType, type JobStatus, type JobType, type InvoiceStatus } from '@/types/database'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('customers').select('name').eq('id', id).single()
  return { title: data?.name ?? 'Customer' }
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: customer },
    { data: properties },
    { data: jobs },
    { data: invoices },
    { data: certificates },
    { data: templates },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('properties').select('*').eq('customer_id', id).order('address_line1'),
    supabase.from('jobs').select(`*, engineer:engineers(schedule_colour, profile:profiles(full_name))`).eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('invoices').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('certificates').select('id, certificate_number, status, issued_at, expires_at').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('recurring_templates').select(`*, property:properties(address_line1, postcode)`).eq('customer_id', id),
  ])

  if (!customer) notFound()

  const formatGBP = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

  return (
    <div className="page-content">
      <Link href="/admin/customers" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--spacing-4)' }}>
        <ArrowLeft size={14} /> Back to Customers
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{customer.name}</h1>
          <span className="badge badge-default">{CUSTOMER_TYPE_LABELS[customer.type as CustomerType]}</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <Link href={`/admin/jobs/new?customer_id=${id}`} className="btn btn-ghost">
            <Briefcase size={14} /> New Job
          </Link>
          <Link href={`/admin/properties/new?customer_id=${id}`} className="btn btn-ghost">
            <Building2 size={14} /> Add Property
          </Link>
          <Link href={`/admin/customers/${id}/edit`} className="btn btn-primary">
            Edit
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--spacing-6)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
          {/* Properties */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-paper)' }}>Properties ({properties?.length ?? 0})</h2>
              <Link href={`/admin/properties/new?customer_id=${id}`} className="btn btn-ghost btn-sm"><Plus size={12} /> Add</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {(properties ?? []).map((p: any) => (
                <Link key={p.id} href={`/admin/properties/${p.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--color-carbon)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-border)', textDecoration: 'none' }}>
                  <MapPin size={14} style={{ color: 'var(--color-fog)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-mist)' }}>
                      {p.address_line1}{p.address_line2 ? `, ${p.address_line2}` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-ash)' }}>{p.city} · <span style={{ fontFamily: 'var(--font-mono)' }}>{p.postcode}</span></div>
                  </div>
                  <span className="badge badge-default" style={{ marginLeft: 'auto' }}>{p.type}</span>
                </Link>
              ))}
              {(properties ?? []).length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-ash)', fontSize: '13px', background: 'var(--color-carbon)', borderRadius: 'var(--radius-md)' }}>
                  No properties. <Link href={`/admin/properties/new?customer_id=${id}`} style={{ color: 'var(--color-acid-lime)' }}>Add one →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Jobs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-paper)' }}>Recent Jobs</h2>
              <Link href={`/admin/jobs?customer=${id}`} style={{ fontSize: '12px', color: 'var(--color-acid-lime)' }}>View all</Link>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Job</th><th>Type</th><th>Engineer</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {(jobs ?? []).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-ash)', padding: '24px' }}>No jobs</td></tr>
                  ) : (
                    (jobs ?? []).map((j: any) => (
                      <tr key={j.id}>
                        <td><Link href={`/admin/jobs/${j.id}`} style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>{j.job_number}</Link></td>
                        <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>{JOB_TYPE_LABELS[j.job_type as JobType]}</td>
                        <td>
                          {j.engineer ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div className="engineer-dot" style={{ background: j.engineer.schedule_colour }} />
                              <span style={{ fontSize: '12px' }}>{j.engineer.profile?.full_name}</span>
                            </div>
                          ) : <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>—</span>}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
                          {j.scheduled_start ? format(parseISO(j.scheduled_start), 'dd/MM/yy') : '—'}
                        </td>
                        <td><span className={`badge badge-${j.status}`}>{STATUS_LABELS[j.status as JobStatus]}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices */}
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-paper)', marginBottom: 'var(--spacing-3)' }}>Invoices</h2>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Invoice</th><th>Issue Date</th><th>Due</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {(invoices ?? []).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-ash)', padding: '24px' }}>No invoices</td></tr>
                  ) : (
                    (invoices ?? []).map((inv: any) => (
                      <tr key={inv.id}>
                        <td><Link href={`/admin/invoices/${inv.id}`} style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>{inv.invoice_number}</Link></td>
                        <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>{inv.issue_date ? format(parseISO(inv.issue_date), 'dd/MM/yyyy') : '—'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>{inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy') : '—'}</td>
                        <td style={{ fontWeight: '500' }}>{formatGBP(inv.total)}</td>
                        <td><span className={`badge badge-${inv.status}`}>{INVOICE_STATUS_LABELS[inv.status as InvoiceStatus]}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-3)' }}>Contact</h3>
            {customer.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-mist)', marginBottom: '6px' }}>
                <Mail size={12} style={{ color: 'var(--color-fog)' }} />
                <a href={`mailto:${customer.email}`} style={{ color: 'var(--color-mist)' }}>{customer.email}</a>
              </div>
            )}
            {customer.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-mist)' }}>
                <Phone size={12} style={{ color: 'var(--color-fog)' }} />
                <a href={`tel:${customer.phone}`} style={{ color: 'var(--color-mist)' }}>{customer.phone}</a>
              </div>
            )}
          </div>

          {customer.notes && (
            <div className="card">
              <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-2)' }}>Notes</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-fog)', lineHeight: '1.6' }}>{customer.notes}</p>
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-3)' }}>Certificates ({certificates?.length ?? 0})</h3>
            {(certificates ?? []).map((cert: any) => (
              <Link key={cert.id} href={`/admin/certificates/${cert.id}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-graphite)', textDecoration: 'none' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-mist)' }}>{cert.certificate_number}</span>
                <span className={`badge badge-${cert.status}`}>{cert.status}</span>
              </Link>
            ))}
            {(certificates ?? []).length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--color-ash)' }}>No certificates</div>
            )}
          </div>

          {(templates ?? []).length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-3)' }}>Recurring</h3>
              {(templates ?? []).map((t: any) => (
                <div key={t.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--color-graphite)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-mist)' }}>{JOB_TYPE_LABELS[t.job_type as JobType]}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-ash)' }}>Every {t.interval_months} months · {t.property?.postcode}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
