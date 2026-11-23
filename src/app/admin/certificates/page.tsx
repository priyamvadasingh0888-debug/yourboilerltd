import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { CertificatesClient } from './certificates-client'

export const metadata: Metadata = { title: 'Gas Safety Certificates (CP12)' }

export default async function CertificatesPage() {
  const supabase = await createClient()

  const { data: certificates } = await supabase
    .from('certificates')
    .select(`
      *,
      customer:customers(id, name, phone),
      property:properties(id, address_line1, postcode, city),
      engineer:engineers(id, profile:profiles(full_name))
    `)
    .order('created_at', { ascending: false })

  return <CertificatesClient certificates={(certificates as any) ?? []} />
}
