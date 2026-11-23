import { createClient } from '@/lib/supabase/server'
import { JobsClient } from './jobs-client'
import type { Metadata } from 'next'
import type { JobStatus, Priority, JobType } from '@/types/database'

export const metadata: Metadata = { title: 'Jobs' }

const PAGE_SIZE = 20

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const page = Number(params.page) || 1
  const status = params.status || ''
  const priority = params.priority || ''
  const jobType = params.job_type || ''
  const search = params.q || ''
  const engineerId = params.engineer || ''
  const from = params.from || ''
  const to = params.to || ''

  let query = supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(id, name),
      property:properties(id, address_line1, city, postcode),
      engineer:engineers(id, schedule_colour, profile:profiles(full_name))
    `, { count: 'exact' })

  if (status) query = query.eq('status', status as JobStatus)
  if (priority) query = query.eq('priority', priority as Priority)
  if (jobType) query = query.eq('job_type', jobType as JobType)
  if (engineerId) query = query.eq('engineer_id', engineerId)
  if (from) query = query.gte('scheduled_start', from)
  if (to) query = query.lte('scheduled_start', to + 'T23:59:59')
  if (search) {
    query = query.or(`job_number.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const [{ data: jobs, count }, { data: engineers }] = await Promise.all([
    query
      .order('scheduled_start', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase
      .from('engineers')
      .select('id, schedule_colour, profile:profiles(full_name)')
      .order('id'),
  ])

  return (
    <JobsClient
      jobs={(jobs as any[]) ?? []}
      engineers={(engineers as any[]) ?? []}
      totalCount={count ?? 0}
      pageSize={PAGE_SIZE}
      currentPage={page}
      filters={{ status, priority, jobType, search, engineerId, from, to }}
    />
  )
}
