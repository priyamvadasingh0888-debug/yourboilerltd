import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobDetailClient } from './job-detail-client'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('jobs').select('job_number').eq('id', id).single()
  return { title: data?.job_number ?? 'Job' }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: job },
    { data: statusHistory },
    { data: certificates },
    { data: invoices },
    { data: engineers },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        property:properties(*),
        engineer:engineers(*, profile:profiles(*)),
        created_by_profile:profiles!jobs_created_by_fkey(full_name)
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('job_status_history')
      .select(`*, changed_by_profile:profiles!job_status_history_changed_by_fkey(full_name)`)
      .eq('job_id', id)
      .order('changed_at', { ascending: false }),

    supabase
      .from('certificates')
      .select('id, certificate_number, status, issued_at')
      .eq('job_id', id),

    supabase
      .from('invoices')
      .select('id, invoice_number, status, total')
      .eq('job_id', id),

    supabase
      .from('engineers')
      .select('id, schedule_colour, profile:profiles(full_name)')
      .order('id'),
  ])

  if (!job) notFound()

  return (
    <JobDetailClient
      job={job as any}
      statusHistory={(statusHistory as any[]) ?? []}
      certificates={(certificates as any[]) ?? []}
      invoices={(invoices as any[]) ?? []}
      engineers={(engineers as any[]) ?? []}
    />
  )
}
