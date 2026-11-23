'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateJob, deleteJob } from '../../actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { JOB_TYPE_LABELS, PRIORITY_LABELS, type JobType, type Priority } from '@/types/database'
import { Trash2 } from 'lucide-react'

interface JobEditFormProps {
  job: {
    id: string
    job_number: string
    job_type: string
    priority: string
    status: string
    scheduled_start: string | null
    duration_minutes: number
    quoted_amount: number | null
    actual_amount: number | null
    description: string | null
    completion_notes: string | null
    customer?: { name: string } | null
    property?: { address_line1: string; postcode: string } | null
  }
}

export function JobEditForm({ job }: JobEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Format scheduled_start for datetime-local input
  const defaultScheduled = job.scheduled_start
    ? new Date(job.scheduled_start).toISOString().slice(0, 16)
    : ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateJob(job.id, formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push(`/admin/jobs/${job.id}`)
      router.refresh()
    }
  }

  async function handleDelete() {
    setError('')
    setDeleteLoading(true)
    const result = await deleteJob(job.id)
    setDeleteLoading(false)

    if (result.error) {
      setShowDeleteModal(false)
      setError(result.error)
    } else {
      setShowDeleteModal(false)
      router.push('/admin/jobs')
      router.refresh()
    }
  }

  return (
    <>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {/* Account & Property Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label">Client</label>
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    color: 'var(--color-paper)',
                    fontWeight: 600,
                  }}
                >
                  {job.customer?.name ?? '—'}
                </div>
              </div>
              <div>
                <label className="label">Site Property</label>
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    color: 'var(--color-paper)',
                  }}
                >
                  {job.property?.address_line1} · {job.property?.postcode}
                </div>
              </div>
            </div>

            {/* Type & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label" htmlFor="job_type">
                  Job Type *
                </label>
                <select
                  id="job_type"
                  name="job_type"
                  defaultValue={job.job_type}
                  className="select"
                  required
                >
                  {Object.entries(JOB_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="priority">
                  Priority *
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue={job.priority}
                  className="select"
                  required
                >
                  {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule & Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label" htmlFor="scheduled_start">
                  Scheduled Start Time
                </label>
                <input
                  id="scheduled_start"
                  name="scheduled_start"
                  type="datetime-local"
                  defaultValue={defaultScheduled}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="duration_minutes">
                  Duration (Minutes) *
                </label>
                <input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  defaultValue={job.duration_minutes || 60}
                  step={15}
                  min={15}
                  max={1440}
                  className="input"
                  required
                />
              </div>
            </div>

            {/* Quoted & Actual Amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label" htmlFor="quoted_amount">
                  Quoted Amount (£)
                </label>
                <input
                  id="quoted_amount"
                  name="quoted_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={job.quoted_amount ?? ''}
                  placeholder="0.00"
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="actual_amount">
                  Actual Amount (£)
                </label>
                <input
                  id="actual_amount"
                  name="actual_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={job.actual_amount ?? ''}
                  placeholder="0.00"
                  className="input"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label" htmlFor="description">
                Job Description
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={job.description ?? ''}
                className="input"
                rows={3}
                placeholder="Scope of work, boiler error codes..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Completion Notes */}
            <div>
              <label className="label" htmlFor="completion_notes">
                Completion Notes
              </label>
              <textarea
                id="completion_notes"
                name="completion_notes"
                defaultValue={job.completion_notes ?? ''}
                className="input"
                rows={3}
                placeholder="Work carried out by engineer..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(235, 87, 87, 0.1)',
                  border: '1px solid rgba(235, 87, 87, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-coral-red)',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-ghost"
                style={{ color: 'var(--color-coral-red)', gap: '6px' }}
              >
                <Trash2 size={14} /> Delete Job
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href={`/admin/jobs/${job.id}`} className="btn btn-ghost">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Are you sure you want to delete job ${job.job_number}? This cannot be undone. Jobs with generated certificates or invoices cannot be deleted.`}
        confirmText="Confirm Delete"
        loading={deleteLoading}
      />
    </>
  )
}
