'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft, MapPin, Phone, User, Clock, Wrench,
  FileText, Receipt, Edit, AlertTriangle, CheckCircle2,
  XCircle, ArrowRight, Plus, Trash2
} from 'lucide-react'
import {
  JOB_TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS, INVOICE_STATUS_LABELS,
  JOB_STATUS_TRANSITIONS, type JobStatus, type Priority, type JobType, type InvoiceStatus
} from '@/types/database'
import { updateJobStatus, assignEngineer, deleteJob } from '../actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface Props {
  job: any
  statusHistory: any[]
  certificates: any[]
  invoices: any[]
  engineers: any[]
}

export function JobDetailClient({ job, statusHistory, certificates, invoices, engineers }: Props) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'parts'>('details')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDelete() {
    setError('')
    setDeleteLoading(true)
    const result = await deleteJob(job.id)
    setDeleteLoading(false)
    if (result?.error) {
      setShowDeleteModal(false)
      setError(result.error)
    } else {
      router.push('/admin/jobs')
      router.refresh()
    }
  }

  const allowedTransitions = JOB_STATUS_TRANSITIONS[job.status as JobStatus] ?? []
  const parts = Array.isArray(job.parts_used) ? job.parts_used : []

  const formatGBP = (n: number | null) =>
    n != null ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n) : '—'

  async function handleStatusChange(newStatus: JobStatus) {
    setError('')
    setUpdating(true)
    const result = await updateJobStatus(job.id, newStatus)
    setUpdating(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  async function handleEngineerChange(engineerId: string) {
    setUpdating(true)
    await assignEngineer(job.id, engineerId || null)
    setUpdating(false)
    router.refresh()
  }

  const statusButtonStyle: Record<JobStatus, string> = {
    in_progress: 'btn-subtle',
    completed: 'btn-primary',
    invoiced: 'btn-ghost',
    cancelled: 'btn-danger',
    scheduled: 'btn-ghost',
  }

  const statusIcons: Partial<Record<JobStatus, React.ReactNode>> = {
    completed: <CheckCircle2 size={14} />,
    cancelled: <XCircle size={14} />,
    in_progress: <Clock size={14} />,
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <Link href="/admin/jobs" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--spacing-4)' }}>
          <ArrowLeft size={14} /> Back to Jobs
        </Link>

        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ fontFamily: 'var(--font-mono)' }}>{job.job_number}</h1>
              <span className={`badge badge-${job.status}`}>
                {STATUS_LABELS[job.status as JobStatus]}
              </span>
              <span className={`badge badge-${job.priority}`}>
                {PRIORITY_LABELS[job.priority as Priority]}
              </span>
            </div>
            <p className="page-subtitle">
              {JOB_TYPE_LABELS[job.job_type as JobType]} · Created {format(parseISO(job.created_at), 'dd MMM yyyy')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            {/* Status transitions */}
            {allowedTransitions.map(nextStatus => (
              <button
                key={nextStatus}
                className={`btn ${statusButtonStyle[nextStatus] ?? 'btn-ghost'}`}
                onClick={() => handleStatusChange(nextStatus)}
                disabled={updating}
              >
                {statusIcons[nextStatus]}
                {STATUS_LABELS[nextStatus]}
              </button>
            ))}
            <Link href={`/admin/jobs/${job.id}/edit`} className="btn btn-ghost">
              <Edit size={14} /> Edit
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-ghost"
              style={{ color: 'var(--color-coral-red)' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#18191c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '3px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            fontSize: '13px',
            color: '#fca5a5',
            marginTop: 'var(--spacing-3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} /> {error}
          </div>
        )}
      </div>

      {/* Content: Responsive Grid */}
      <div className="job-detail-layout">
        {/* Main */}
        <div>
          {/* Tabs */}
          <div className="tabs">
            {(['details', 'history', 'parts'] as const).map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'history' && ` (${statusHistory.length})`}
                {tab === 'parts' && ` (${parts.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
              {/* Description */}
              {job.description && (
                <div className="card">
                  <h3 style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500' }}>Description</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-mist)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{job.description}</p>
                </div>
              )}

              {/* Completion Notes */}
              {job.completion_notes && (
                <div className="card" style={{ borderLeft: '3px solid var(--color-pulse-green)' }}>
                  <h3 style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500' }}>Completion Notes</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-mist)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{job.completion_notes}</p>
                </div>
              )}

              {/* Financials */}
              <div className="card">
                <h3 style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: 'var(--spacing-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500' }}>Financials</h3>
                <div className="grid-2">
                  <div>
                    <div className="form-label">Quoted Amount</div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-paper)', marginTop: '4px' }}>
                      {formatGBP(job.quoted_amount)}
                    </div>
                  </div>
                  <div>
                    <div className="form-label">Actual Amount</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-fey-white)', marginTop: '4px', letterSpacing: '-0.03em' }}>
                      {formatGBP(job.actual_amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Documents */}
              {(certificates.length > 0 || invoices.length > 0) && (
                <div className="card">
                  <h3 style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: 'var(--spacing-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500' }}>Documents</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    {certificates.map((cert: any) => (
                      <Link key={cert.id} href={`/admin/certificates/${cert.id}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} style={{ color: 'var(--color-fog)' }} />
                          <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>{cert.certificate_number}</span>
                        </div>
                        <span className={`badge badge-${cert.status}`}>{cert.status}</span>
                      </Link>
                    ))}
                    {invoices.map((inv: any) => (
                      <Link key={inv.id} href={`/admin/invoices/${inv.id}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Receipt size={14} style={{ color: 'var(--color-fog)' }} />
                          <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>{inv.invoice_number}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px' }}>{formatGBP(inv.total)}</span>
                          <span className={`badge badge-${inv.status}`}>{INVOICE_STATUS_LABELS[inv.status as InvoiceStatus]}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              {job.status === 'completed' && certificates.length === 0 && (
                <Link href={`/admin/certificates/new?job_id=${job.id}`} className="btn btn-ghost">
                  <FileText size={14} /> Generate Certificate (CP12)
                </Link>
              )}
              {job.status === 'completed' && invoices.length === 0 && (
                <Link href={`/admin/invoices/new?job_id=${job.id}`} className="btn btn-ghost">
                  <Receipt size={14} /> Create Invoice
                </Link>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {statusHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No status changes yet</div>
                </div>
              ) : (
                statusHistory.map((entry: any, i: number) => (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                    padding: '12px 16px',
                    borderBottom: i < statusHistory.length - 1 ? '1px solid var(--color-graphite)' : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {entry.from_status && (
                          <>
                            <span className={`badge badge-${entry.from_status}`}>{STATUS_LABELS[entry.from_status as JobStatus]}</span>
                            <ArrowRight size={12} style={{ color: 'var(--color-ash)' }} />
                          </>
                        )}
                        <span className={`badge badge-${entry.to_status}`}>{STATUS_LABELS[entry.to_status as JobStatus]}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-ash)', marginTop: '4px' }}>
                        {entry.changed_by_profile?.full_name ?? 'System'} · {format(parseISO(entry.changed_at), 'dd MMM yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'parts' && (
            <div>
              {parts.length === 0 ? (
                <div className="empty-state">
                  <Wrench className="empty-state-icon" />
                  <div className="empty-state-title">No parts recorded</div>
                  <div className="empty-state-desc">Parts are added by engineers on site.</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Part</th>
                        <th>Qty</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((part: any, i: number) => (
                        <tr key={i}>
                          <td>{part.name}</td>
                          <td>{part.quantity}</td>
                          <td>{formatGBP(part.cost)}</td>
                          <td>{formatGBP(part.quantity * part.cost)}</td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: '600' }}>
                        <td colSpan={3} style={{ textAlign: 'right', color: 'var(--color-fey-graphite)' }}>Total Parts Cost</td>
                        <td style={{ color: 'var(--color-fey-white)', fontWeight: 700 }}>
                          {formatGBP(parts.reduce((sum: number, p: any) => sum + p.quantity * p.cost, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Customer */}
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-3)' }}>Customer</h3>
            <Link href={`/admin/customers/${job.customer?.id}`} style={{ fontWeight: '500', color: 'var(--color-paper)', fontSize: '14px' }}>
              {job.customer?.name}
            </Link>
            {job.customer?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px', color: 'var(--color-fog)' }}>
                <Phone size={12} /> {job.customer.phone}
              </div>
            )}
            {job.customer?.email && (
              <div style={{ fontSize: '12px', color: 'var(--color-ash)', marginTop: '4px' }}>{job.customer.email}</div>
            )}
          </div>

          {/* Property */}
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-3)' }}>Property</h3>
            <Link href={`/admin/properties/${job.property?.id}`} style={{ fontSize: '13px', color: 'var(--color-mist)', textDecoration: 'none' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <MapPin size={13} style={{ color: 'var(--color-fog)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-paper)' }}>{job.property?.address_line1}</div>
                  {job.property?.address_line2 && <div>{job.property.address_line2}</div>}
                  <div>{job.property?.city}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-fog)', marginTop: '2px' }}>{job.property?.postcode}</div>
                </div>
              </div>
            </Link>
            {job.property && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${job.property.address_line1}, ${job.property.postcode}`
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '10px',
                  fontSize: '12px',
                  color: 'var(--color-acid-lime)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Google Maps ↗
              </a>
            )}
          </div>

          {/* Engineer */}
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-3)' }}>Engineer</h3>
            <select
              className="select"
              value={job.engineer_id ?? ''}
              onChange={e => handleEngineerChange(e.target.value)}
              disabled={updating || job.status === 'invoiced' || job.status === 'cancelled'}
            >
              <option value="">Unassigned</option>
              {engineers.map((e: any) => (
                <option key={e.id} value={e.id}>{e.profile?.full_name}</option>
              ))}
            </select>
            {job.engineer && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="engineer-dot" style={{ background: job.engineer.schedule_colour }} />
                <span style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                  Gas Safe: {job.engineer.gas_safe_number ?? '—'}
                </span>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="card">
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-3)' }}>Schedule</h3>
            <div style={{ fontSize: '14px', color: 'var(--color-mist)' }}>
              {job.scheduled_start
                ? format(parseISO(job.scheduled_start), 'EEEE, d MMMM yyyy')
                : <span style={{ color: 'var(--color-ash)' }}>Not scheduled</span>
              }
            </div>
            {job.scheduled_start && (
              <div style={{ fontSize: '13px', color: 'var(--color-fog)', marginTop: '4px' }}>
                {format(parseISO(job.scheduled_start), 'HH:mm')} · {job.duration_minutes}min
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Are you sure you want to delete job ${job.job_number}? This cannot be undone. Jobs with existing certificates or invoices cannot be deleted.`}
        confirmText="Confirm Delete"
        loading={deleteLoading}
      />
    </div>
  )
}
