import { createClient } from '@/lib/supabase/server'
import { EngineerDashboardClient } from './engineer-dashboard-client'
import type { Metadata } from 'next'
import { headers, cookies } from 'next/headers'
import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'

export const metadata: Metadata = {
  title: 'Engineer Dashboard | Your Boiler Ltd',
}

export default async function EngineerDashboardPage() {
  const supabase = await createClient()

  // Resolve engineer ID and name from logged-in user or demo
  const reqHeaders = await headers()
  const userId = reqHeaders.get('x-user-id')
  let engineerId: string | null = null
  let engineerName: string | undefined

  if (userId) {
    const { data: eng } = await supabase
      .from('engineers')
      .select('id, profile:profiles(full_name)')
      .eq('profile_id', userId)
      .maybeSingle()
    engineerId = eng?.id ?? null
    const fullName = (eng?.profile as any)?.full_name
    if (fullName) {
      engineerName = fullName.split(' ')[0]
    }
  }

  if (!engineerName) {
    const cookieStore = await cookies()
    const demoCookie = cookieStore.get(DEMO_COOKIE_NAME)?.value
    const demoUser = parseDemoCookie(demoCookie)
    if (demoUser?.full_name) {
      engineerName = demoUser.full_name.split(' ')[0]
    }
  }

  let jobs: any[] = []
  let reminders: any[] = []

  try {
    const jobsQuery = supabase
      .from('jobs')
      .select('*, customer:customers(name, phone), property:properties(address_line1, postcode, city)')
      .order('scheduled_start', { ascending: true })

    if (engineerId) jobsQuery.eq('engineer_id', engineerId)

    const [{ data: jobsData }, { data: remindersData }] = await Promise.all([
      jobsQuery,
      supabase
        .from('recurring_templates')
        .select('*, customer:customers(name), property:properties(address_line1, postcode, city)')
        .eq('active', true)
        .order('next_due_at', { ascending: true })
        .limit(10),
    ])

    if (jobsData) jobs = jobsData
    if (remindersData) {
      reminders = remindersData.map((r: any) => ({
        id: r.id,
        customer_id: r.customer_id,
        property_id: r.property_id,
        customer_name: r.customer?.name || 'Customer',
        property_address: r.property?.address_line1 || 'Property',
        postcode: r.property?.postcode || '',
        service_type: r.job_type,
        service_label: r.job_type ? r.job_type.replace(/_/g, ' ') : 'Periodic Inspection',
        interval: `${r.interval_months || 12} Months`,
        due_date: r.next_due_at,
        is_overdue: r.next_due_at ? new Date(r.next_due_at) < new Date() : false,
      }))
    }
  } catch {
    jobs = []
    reminders = []
  }

  return <EngineerDashboardClient initialJobs={jobs} initialReminders={reminders} engineerId={engineerId} engineerName={engineerName} />
}
