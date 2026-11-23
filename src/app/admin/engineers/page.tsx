import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { EngineersClient } from './engineers-client'

export const metadata: Metadata = { title: 'Engineers' }

export default async function EngineersPage() {
  const supabase = await createClient()

  const [{ data: engineers }, { data: unassignedJobs }] = await Promise.all([
    supabase
      .from('engineers')
      .select(`*, profile:profiles(full_name, email, phone)`)
      .order('id'),
    supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        job_type,
        priority,
        scheduled_start,
        duration_minutes,
        customer:customers(name),
        property:properties(address_line1, postcode)
      `)
      .is('engineer_id', null)
      .in('status', ['scheduled', 'in_progress'])
      .order('created_at', { ascending: false }),
  ])

  return <EngineersClient engineers={engineers ?? []} unassignedJobs={unassignedJobs ?? []} />
}
