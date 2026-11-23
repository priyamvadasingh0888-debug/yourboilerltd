import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { JobEditForm } from './job-edit-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Job',
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('*, customer:customers(name), property:properties(address_line1, postcode)')
    .eq('id', id)
    .single()

  if (!job) notFound()

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <Link
          href={`/admin/jobs/${id}`}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 'var(--spacing-4)' }}
        >
          <ArrowLeft size={14} /> Back to Job Details
        </Link>

        <div className="page-header" style={{ marginBottom: 'var(--spacing-5)' }}>
          <div>
            <h1 className="page-title">Edit Job · {job.job_number}</h1>
            <p className="page-subtitle">Update schedule, priority, amounts, and job notes</p>
          </div>
        </div>

        <JobEditForm job={job} />
      </div>
    </div>
  )
}
