import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EngineerEditForm } from './engineer-edit-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Engineer',
}

export default async function EditEngineerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: engineer } = await supabase
    .from('engineers')
    .select('*, profile:profiles(full_name, email, phone)')
    .eq('id', id)
    .single()

  if (!engineer) notFound()

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <Link
          href={`/admin/engineers/${id}`}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 'var(--spacing-4)' }}
        >
          <ArrowLeft size={14} /> Back to Engineer Profile
        </Link>

        <div className="page-header" style={{ marginBottom: 'var(--spacing-5)' }}>
          <div>
            <h1 className="page-title">Edit Engineer Profile</h1>
            <p className="page-subtitle">Update Gas Safe certification, schedule colour, and availability</p>
          </div>
        </div>

        <EngineerEditForm engineer={engineer} />
      </div>
    </div>
  )
}
