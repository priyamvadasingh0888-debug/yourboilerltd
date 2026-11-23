'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import type { PropertyType } from '@/types/database'
import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'

const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i

const propertySchema = z.object({
  customer_id: z.string().uuid(),
  address_line1: z.string().min(2, 'Address is required'),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(2, 'City is required'),
  postcode: z.string().regex(ukPostcodeRegex, 'Valid UK postcode required (e.g. SW1A 1AA)'),
  type: z.enum(['residential', 'commercial', 'hmo', 'other'] as const),
  notes: z.string().optional().nullable(),
})

export async function createProperty(formData: z.infer<typeof propertySchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = propertySchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid property data' }
  }

  const { data, error } = await supabase
    .from('properties')
    .insert({
      customer_id: parsed.data.customer_id,
      address_line1: parsed.data.address_line1,
      address_line2: parsed.data.address_line2 ?? null,
      city: parsed.data.city,
      postcode: parsed.data.postcode.toUpperCase().trim(),
      type: parsed.data.type,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/properties')
  revalidatePath(`/admin/customers/${parsed.data.customer_id}`)
  return { propertyId: data.id }
}

export async function updateProperty(id: string, formData: Partial<z.infer<typeof propertySchema>>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('properties')
    .update({
      ...(formData.address_line1 && { address_line1: formData.address_line1 }),
      ...(formData.address_line2 !== undefined && { address_line2: formData.address_line2 }),
      ...(formData.city && { city: formData.city }),
      ...(formData.postcode && { postcode: formData.postcode.toUpperCase().trim() }),
      ...(formData.type && { type: formData.type }),
      ...(formData.notes !== undefined && { notes: formData.notes }),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/properties')
  revalidatePath(`/admin/properties/${id}`)
  return { success: true }
}

export async function deleteProperty(id: string) {
  try {
    const cookieStore = await cookies()
    const demoUser = parseDemoCookie(cookieStore.get(DEMO_COOKIE_NAME)?.value)

    if (demoUser && demoUser.role !== 'admin') {
      return { error: 'Forbidden: Admin access required' }
    }

    if (!demoUser) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

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

    const { data: prop } = await admin.from('properties').select('customer_id').eq('id', id).single()

    // 1. Delete certificates for this property
    await admin.from('certificates').delete().eq('property_id', id)

    // 2. Delete recurring templates for this property
    await admin.from('recurring_templates').delete().eq('property_id', id)

    // 3. Delete jobs for this property
    await admin.from('jobs').delete().eq('property_id', id)

    // 4. Delete property
    const { error } = await admin.from('properties').delete().eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/admin/properties')
    revalidatePath('/admin/jobs')
    revalidatePath('/admin')
    if (prop?.customer_id) {
      revalidatePath(`/admin/customers/${prop.customer_id}`)
    }
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete property' }
  }
}
