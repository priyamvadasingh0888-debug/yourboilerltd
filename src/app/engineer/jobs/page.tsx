import { createClient } from '@/lib/supabase/server'
import { JobsListClient } from './jobs-list-client'
import type { Metadata } from 'next'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'My Jobs | Engineer Portal',
}

export default async function EngineerJobsPage() {
  const supabase = await createClient()

  // Resolve engineer ID from logged-in user
  const reqHeaders = await headers()
  const userId = reqHeaders.get('x-user-id')
  let engineerId: string | null = null

  if (userId) {
    const { data: eng } = await supabase
      .from('engineers')
      .select('id')
      .eq('profile_id', userId)
      .single()
    engineerId = eng?.id ?? null
  }

  let jobs: any[] = []
  try {
    const query = supabase
      .from('jobs')
      .select('*, customer:customers(name, phone), property:properties(address_line1, postcode, city)')
      .order('scheduled_start', { ascending: true })

    if (engineerId) query.eq('engineer_id', engineerId)

    const { data } = await query
    if (data) jobs = data
  } catch {
    jobs = []
  }

  return <JobsListClient initialJobs={jobs} engineerId={engineerId} />
}
