import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { PropertiesClient } from './properties-client'

export const metadata: Metadata = { title: 'Properties' }

export default async function PropertiesPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select(`
      *,
      customer:customers(id, name, type, phone, email),
      jobs:jobs(count),
      certificates:certificates(count)
    `)
    .order('postcode')

  return <PropertiesClient properties={(properties as any) ?? []} />
}
