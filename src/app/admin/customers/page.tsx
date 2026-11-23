import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { CustomersClient } from './customers-client'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      properties:properties(id, address_line1, postcode, city),
      jobs:jobs(count)
    `)
    .order('name')

  return <CustomersClient customers={(customers as any) ?? []} />
}
