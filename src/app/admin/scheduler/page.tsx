import { createClient } from '@/lib/supabase/server'
import { SchedulerClient } from './scheduler-client'
import { startOfWeek, endOfWeek, parseISO, format, isValid } from 'date-fns'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Scheduler & Dispatch' }

export default async function SchedulerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Default to current week (Monday start)
  let dateParam = new Date()
  if (params.date) {
    const parsed = parseISO(params.date)
    if (isValid(parsed)) {
      dateParam = parsed
    }
  }

  const weekStart = startOfWeek(dateParam, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(dateParam, { weekStartsOn: 1 })

  let engineers: any[] | null = null
  let jobs: any[] | null = null
  let unassignedJobs: any[] | null = null

  try {
    const res = await Promise.all([
      supabase
        .from('engineers')
        .select('*, profile:profiles(*)')
        .order('availability_status'),
      supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(id, name, phone),
          property:properties(id, address_line1, postcode, city),
          engineer:engineers(id, schedule_colour, profile:profiles(full_name))
        `)
        .not('scheduled_start', 'is', null)
        .gte('scheduled_start', weekStart.toISOString())
        .lte('scheduled_start', weekEnd.toISOString())
        .order('scheduled_start'),
      supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(id, name, phone),
          property:properties(id, address_line1, postcode, city)
        `)
        .is('engineer_id', null)
        .in('status', ['scheduled'])
        .order('created_at', { ascending: false })
        .limit(20)
    ])
    engineers = res[0].data
    jobs = res[1].data
    unassignedJobs = res[2].data
  } catch (err) {
    console.error('Error fetching scheduler data:', err)
  }

  const safeEngineers = engineers || []
  const safeJobs = jobs || []
  const safeUnassigned = unassignedJobs || []

  return (
    <SchedulerClient
      engineers={safeEngineers}
      jobs={safeJobs}
      unassignedJobs={safeUnassigned}
      currentWeekStart={weekStart.toISOString()}
      selectedDateParam={format(dateParam, 'yyyy-MM-dd')}
    />
  )
}
