import { createClient } from '@/lib/supabase/server'
import { InquiriesClient } from './inquiries-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customer Inquiries',
}

export default async function InquiriesPage() {
  const supabase = await createClient()

  let inquiries: any[] = []
  try {
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) {
      inquiries = data
    }
  } catch {
    inquiries = []
  }

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Customer Inquiries</h1>
          <p className="page-subtitle">
            Public requests received from the customer booking and inquiry portal
          </p>
        </div>
      </div>

      <InquiriesClient inquiries={inquiries} />
    </div>
  )
}
