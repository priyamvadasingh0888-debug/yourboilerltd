import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'
import type { Metadata } from 'next'
import type { DashboardStats, JobWithRelations } from '@/types/database'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const [
    { count: todaysJobs },
    { count: activeJobs },
    { count: availableEngineers },
    { data: outstandingInvoices },
    { count: newInquiries },
    { count: expiringGasSafe },
    { data: upcomingJobs },
    { data: engineerStatuses },
    { data: recentInvoices },
    { data: overdueTemplates },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_start', today.toISOString())
      .lte('scheduled_start', todayEnd.toISOString()),

    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress'),

    supabase
      .from('engineers')
      .select('*', { count: 'exact', head: true })
      .eq('availability_status', 'available'),

    supabase
      .from('invoices')
      .select('total')
      .in('status', ['sent', 'overdue']),

    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),

    supabase
      .from('engineers')
      .select('*', { count: 'exact', head: true })
      .not('gas_safe_expiry', 'is', null)
      .lte('gas_safe_expiry', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

    supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(id, name),
        property:properties(id, address_line1, city, postcode),
        engineer:engineers(id, schedule_colour, profile:profiles(full_name))
      `)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_start', { ascending: true })
      .limit(8),

    supabase
      .from('engineers')
      .select(`
        *,
        profile:profiles(full_name, email)
      `)
      .order('availability_status', { ascending: true }),

    supabase
      .from('invoices')
      .select(`*, customer:customers(name)`)
      .in('status', ['draft', 'sent', 'overdue', 'paid'])
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('recurring_templates')
      .select(`
        *,
        customer:customers(name),
        property:properties(address_line1, city, postcode)
      `)
      .eq('active', true)
      .lt('next_due_at', new Date().toISOString())
      .order('next_due_at', { ascending: true })
      .limit(5),
  ])

  const outstandingTotal = (outstandingInvoices as any[])?.reduce((sum: number, inv: any) => sum + (inv.total ?? 0), 0) ?? 0

  const stats: DashboardStats = {
    todaysJobs: todaysJobs ?? 0,
    activeJobs: activeJobs ?? 0,
    availableEngineers: availableEngineers ?? 0,
    outstandingInvoiceTotal: outstandingTotal,
    newInquiries: newInquiries ?? 0,
    expiringGasSafe: expiringGasSafe ?? 0,
  }

  return (
    <DashboardClient
      stats={stats}
      upcomingJobs={(upcomingJobs as any[]) ?? []}
      engineerStatuses={(engineerStatuses as any[]) ?? []}
      recentInvoices={(recentInvoices as any[]) ?? []}
      overdueTemplates={(overdueTemplates as any[]) ?? []}
    />
  )
}
