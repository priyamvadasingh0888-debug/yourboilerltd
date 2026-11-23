'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { AvailabilityStatus } from '@/types/database'
import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'

const engineerSchema = z.object({
  full_name: z.string().min(2, 'Name is required').max(100),
  phone: z.string().max(50).optional().nullable(),
  gas_safe_number: z.string().max(30).optional().nullable(),
  gas_safe_expiry: z.string().optional().nullable(),
  schedule_colour: z.string().default('#6366f1'),
  availability_status: z.enum(['available', 'on_job', 'off_duty'] as const).default('available'),
  specialties: z.array(z.string()).default([]),
  category: z.enum(['in_house', 'subcontractor'] as const).default('in_house'),
  qualifications: z.array(z.string()).default([]),
  license_number: z.string().max(50).optional().nullable(),
})

export async function updateEngineer(
  engineerId: string,
  formData: {
    full_name: string
    phone?: string | null
    gas_safe_number?: string | null
    gas_safe_expiry?: string | null
    schedule_colour?: string
    availability_status?: AvailabilityStatus
    specialties?: string[]
    category?: 'in_house' | 'subcontractor'
    qualifications?: string[]
    license_number?: string | null
  }
) {
  try {
    const cookieStore = await cookies()
    const demoUser = parseDemoCookie(cookieStore.get(DEMO_COOKIE_NAME)?.value)

    if (demoUser && demoUser.role !== 'admin') {
      return { error: 'Forbidden: Admin access required' }
    }

    if (!demoUser) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Unauthorized: Please sign in' }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin' && profile?.role !== 'office_staff') {
        return { error: 'Forbidden: Admin access required' }
      }
    }

    const admin = await createServiceClient()

    const parsed = engineerSchema.safeParse(formData)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid engineer details' }
    }

    const { data: eng, error: fetchErr } = await admin
      .from('engineers')
      .select('profile_id')
      .eq('id', engineerId)
      .single()

    if (fetchErr || !eng) {
      return { error: 'Engineer record not found' }
    }

    // 1. Update profile name and phone
    if (eng.profile_id) {
      await admin
        .from('profiles')
        .update({
          full_name: parsed.data.full_name,
          phone: parsed.data.phone ?? null,
        })
        .eq('id', eng.profile_id)
    }

    // 2. Update engineer details
    const { error: engErr } = await admin
      .from('engineers')
      .update({
        phone: parsed.data.phone ?? null,
        gas_safe_number: parsed.data.gas_safe_number ?? null,
        gas_safe_expiry: parsed.data.gas_safe_expiry || null,
        schedule_colour: parsed.data.schedule_colour,
        availability_status: parsed.data.availability_status,
        specialties: parsed.data.specialties,
        category: parsed.data.category,
        qualifications: parsed.data.qualifications,
        license_number: parsed.data.license_number ?? parsed.data.gas_safe_number ?? null,
      })
      .eq('id', engineerId)

    if (engErr) {
      logger.error('Failed to update engineer', { engineerId, error: engErr })
      return { error: logger.toUserMessage(engErr) }
    }

    logger.info('Engineer updated', { engineerId })
    revalidatePath('/admin/engineers')
    revalidatePath(`/admin/engineers/${engineerId}`)
    revalidatePath('/admin/scheduler')
    return { success: true }
  } catch (err) {
    logger.error('Unexpected error in updateEngineer', { engineerId }, err)
    return { error: 'An unexpected error occurred while updating engineer' }
  }
}

export async function uploadEngineerDocument(params: {
  engineerId: string
  documentName: string
  fileUrl: string
  fileType: string
  fileSizeBytes?: number | null
  expiryDate?: string | null
  notes?: string | null
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    const { data, error } = await supabase
      .from('engineer_documents')
      .insert({
        engineer_id: params.engineerId,
        document_name: params.documentName,
        file_url: params.fileUrl,
        file_type: params.fileType,
        file_size_bytes: params.fileSizeBytes || null,
        expiry_date: params.expiryDate || null,
        notes: params.notes || null,
      })
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/engineers/${params.engineerId}`)
    return { success: true, document: data }
  } catch (err: any) {
    return { error: err?.message || 'Failed to save document' }
  }
}

export async function deleteEngineerDocument(documentId: string, engineerId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    const { error } = await supabase
      .from('engineer_documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/engineers/${engineerId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete document' }
  }
}

export async function deleteEngineer(engineerId: string) {
  try {
    const cookieStore = await cookies()
    const demoUser = parseDemoCookie(cookieStore.get(DEMO_COOKIE_NAME)?.value)

    if (demoUser && demoUser.role !== 'admin') {
      return { error: 'Forbidden: Admin access required' }
    }

    if (!demoUser) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Unauthorized: Please sign in' }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return { error: 'Forbidden: Admin access required' }
      }
    }

    const admin = await createServiceClient()

    // 1. Unassign all jobs from this engineer (so completed/historical jobs don't break FK)
    await admin
      .from('jobs')
      .update({ engineer_id: null })
      .eq('engineer_id', engineerId)

    // 2. Unassign from recurring templates
    await admin
      .from('recurring_templates')
      .update({ default_engineer_id: null })
      .eq('default_engineer_id', engineerId)

    // 3. Delete engineer documents
    await admin
      .from('engineer_documents')
      .delete()
      .eq('engineer_id', engineerId)

    // 4. Fetch profile_id before deletion
    const { data: eng } = await admin
      .from('engineers')
      .select('profile_id')
      .eq('id', engineerId)
      .single()

    // 5. Delete engineer record
    const { error: delErr } = await admin
      .from('engineers')
      .delete()
      .eq('id', engineerId)

    if (delErr) {
      logger.error('Failed to delete engineer record', { engineerId, error: delErr })
      return { error: delErr.message }
    }

    // 6. Clean up profile references and delete auth user
    if (eng?.profile_id) {
      try {
        // Clear foreign key references to this profile
        await admin.from('jobs').update({ created_by: null }).eq('created_by', eng.profile_id)
        await admin.from('job_status_history').update({ changed_by: null }).eq('changed_by', eng.profile_id)
        await admin.from('job_notes').delete().eq('author_id', eng.profile_id)
        await admin.from('notifications').delete().eq('user_id', eng.profile_id)

        // Hard-ban auth user and scrub metadata to kill any active session tokens immediately
        await admin.auth.admin.updateUserById(eng.profile_id, {
          ban_duration: '876000h',
          user_metadata: { role: 'inactive', status: 'deleted' },
          app_metadata: { role: 'inactive', status: 'deleted' },
        })

        // Delete auth user from Supabase
        await admin.auth.admin.deleteUser(eng.profile_id)

        // Delete profile record
        await admin.from('profiles').delete().eq('id', eng.profile_id)
      } catch (authErr) {
        logger.warn('Could not complete full auth deletion for engineer', { profile_id: eng.profile_id, error: authErr })
        // Fallback: Ensure role is marked inactive in profile if hard delete failed
        await admin.from('profiles').update({ role: 'inactive' }).eq('id', eng.profile_id)
      }
    }

    logger.info('Engineer deleted successfully', { engineerId })
    revalidatePath('/admin/engineers')
    revalidatePath('/admin/scheduler')
    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    logger.error('Unexpected error in deleteEngineer', { engineerId }, err)
    return { error: err?.message || 'An unexpected error occurred while deleting engineer' }
  }
}
