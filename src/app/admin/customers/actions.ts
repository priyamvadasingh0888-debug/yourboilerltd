'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { CustomerType } from '@/types/database'
import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  type: z.enum(['homeowner', 'landlord', 'letting_agent', 'commercial', 'house_association'] as const),
  email: z.string().email('Please enter a valid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function createCustomer(formData: FormData | z.infer<typeof customerSchema>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    let rawData: Record<string, unknown>
    if (formData instanceof FormData) {
      rawData = {
        name: formData.get('name'),
        type: formData.get('type') || 'homeowner',
        email: formData.get('email') || null,
        phone: formData.get('phone') || null,
        notes: formData.get('notes') || null,
      }
    } else {
      rawData = formData
    }

    const parsed = customerSchema.safeParse(rawData)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid customer details' }
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: parsed.data.name.trim(),
        type: parsed.data.type as CustomerType,
        email: parsed.data.email?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create customer', { error, data: parsed.data })
      return { error: logger.toUserMessage(error) }
    }

    logger.info('Customer created successfully', { customerId: data.id, name: data.name })
    revalidatePath('/admin/customers')
    return { customerId: data.id }
  } catch (err) {
    logger.error('Unexpected error in createCustomer', {}, err)
    return { error: 'An unexpected error occurred while creating customer' }
  }
}

export async function updateCustomer(
  id: string,
  formData: FormData | Partial<z.infer<typeof customerSchema>>
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    let rawData: Record<string, unknown>
    if (formData instanceof FormData) {
      rawData = {
        name: formData.get('name'),
        type: formData.get('type'),
        email: formData.get('email') || null,
        phone: formData.get('phone') || null,
        notes: formData.get('notes') || null,
      }
    } else {
      rawData = formData
    }

    const partialSchema = customerSchema.partial()
    const parsed = partialSchema.safeParse(rawData)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid customer update' }
    }

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name.trim()
    if (parsed.data.type !== undefined) updatePayload.type = parsed.data.type
    if (parsed.data.email !== undefined) updatePayload.email = parsed.data.email?.trim() || null
    if (parsed.data.phone !== undefined) updatePayload.phone = parsed.data.phone?.trim() || null
    if (parsed.data.notes !== undefined) updatePayload.notes = parsed.data.notes?.trim() || null

    const { error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      logger.error('Failed to update customer', { id, error })
      return { error: logger.toUserMessage(error) }
    }

    logger.info('Customer updated', { id })
    revalidatePath('/admin/customers')
    revalidatePath(`/admin/customers/${id}`)
    return { success: true }
  } catch (err) {
    logger.error('Unexpected error in updateCustomer', { id }, err)
    return { error: 'An unexpected error occurred while updating customer' }
  }
}

export async function deleteCustomer(id: string) {
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

    // Cascade clean all linked records cleanly
    // 1. Delete certificates for jobs or customer
    await admin.from('certificates').delete().eq('customer_id', id)

    // 2. Delete invoices for customer
    await admin.from('invoices').delete().eq('customer_id', id)

    // 3. Delete recurring templates
    await admin.from('recurring_templates').delete().eq('customer_id', id)

    // 4. Delete jobs for this customer
    await admin.from('jobs').delete().eq('customer_id', id)

    // 5. Delete properties belonging to this customer
    await admin.from('properties').delete().eq('customer_id', id)

    // 6. Delete the customer
    const { error } = await admin.from('customers').delete().eq('id', id)
    if (error) {
      logger.error('Failed to delete customer', { id, error })
      return { error: error.message }
    }

    logger.info('Customer and associated records deleted successfully', { id })
    revalidatePath('/admin/customers')
    revalidatePath('/admin/properties')
    revalidatePath('/admin/jobs')
    revalidatePath('/admin/invoices')
    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    logger.error('Unexpected error in deleteCustomer', { id }, err)
    return { error: err?.message || 'An unexpected error occurred while deleting customer' }
  }
}
