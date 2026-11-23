import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CustomerEditForm } from './customer-edit-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Customer',
}

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <Link
          href={`/admin/customers/${id}`}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 'var(--spacing-4)' }}
        >
          <ArrowLeft size={14} /> Back to Customer
        </Link>

        <div className="page-header" style={{ marginBottom: 'var(--spacing-5)' }}>
          <div>
            <h1 className="page-title">Edit Customer</h1>
            <p className="page-subtitle">Update contact details, type, and account notes</p>
          </div>
        </div>

        <CustomerEditForm customer={customer} />
      </div>
    </div>
  )
}
