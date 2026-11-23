import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EngineerJobDetailClient } from './engineer-job-detail-client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('jobs').select('job_number, description').eq('id', id).single()

  return {
    title: data?.job_number ? `${data.job_number} | Engineer Portal` : 'Job Details',
  }
}

export default async function EngineerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      id,
      job_number,
      status,
      job_type,
      priority,
      description,
      scheduled_start,
      duration_minutes,
      completion_notes,
      parts_used,
      time_slot,
      customer:customers(id, name, phone, email),
      property:properties(id, address_line1, address_line2, city, postcode),
      certificates:certificates(id, certificate_number, status)
    `)
    .eq('id', id)
    .single()

  if (error || !job) {
    notFound()
  }

  return <EngineerJobDetailClient job={job as any} />
}
