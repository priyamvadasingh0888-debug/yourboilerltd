import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PropertyEditForm } from './property-edit-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Property',
}

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*, customer:customers(name)')
    .eq('id', id)
    .single()

  if (!property) notFound()

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <Link
          href={`/admin/properties/${id}`}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 'var(--spacing-4)' }}
        >
          <ArrowLeft size={14} /> Back to Property
        </Link>

        <div className="page-header" style={{ marginBottom: 'var(--spacing-5)' }}>
          <div>
            <h1 className="page-title">Edit Property</h1>
            <p className="page-subtitle">Update address, property classification, and access notes</p>
          </div>
        </div>

        <PropertyEditForm property={property} />
      </div>
    </div>
  )
}
