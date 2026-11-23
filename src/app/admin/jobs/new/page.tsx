import { createClient } from '@/lib/supabase/server'
import { NewJobForm } from './new-job-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Job' }

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: customers }, { data: engineers }] = await Promise.all([
    supabase.from('customers').select('id, name, type').order('name'),
    supabase.from('engineers')
      .select('id, schedule_colour, gas_safe_expiry, profile:profiles(full_name)')
      .order('id'),
  ])

  return (
    <div className="page-content" style={{ maxWidth: '720px' }}>
      <h1 className="page-title" style={{ marginBottom: 'var(--spacing-6)' }}>New Job</h1>
      <NewJobForm
        customers={customers ?? []}
        engineers={engineers ?? []}
        prefillCustomerId={params.customer_id}
        prefillPropertyId={params.property_id}
      />
    </div>
  )
}
