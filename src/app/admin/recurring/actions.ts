'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseISO, differenceInDays, format, addDays } from 'date-fns'
import { logger } from '@/lib/logger'
import { sendServiceReminderEmail } from '@/lib/email/resend'
import type { ScheduleTimeSlot, JobType, InspectionServiceType } from '@/types/database'

export async function deleteRecurringTemplate(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
    if (error) {
      logger.error('Failed to delete recurring template', { id, error })
      return { error: logger.toUserMessage(error) }
    }

    revalidatePath('/admin/recurring')
    return { success: true }
  } catch (err) {
    logger.error('Unexpected error in deleteRecurringTemplate', { id }, err)
    return { error: 'Failed to delete recurring template' }
  }
}

export async function toggleRecurringTemplate(id: string, active: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    const { error } = await supabase
      .from('recurring_templates')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('Failed to toggle recurring template', { id, active, error })
      return { error: logger.toUserMessage(error) }
    }

    revalidatePath('/admin/recurring')
    return { success: true }
  } catch (err) {
    logger.error('Unexpected error in toggleRecurringTemplate', { id }, err)
    return { error: 'Failed to update schedule status' }
  }
}

/**
 * Triggers the automated reminder check and dispatches emails via Resend
 */
export async function triggerAutomatedRemindersAction() {
  try {
    const supabase = await createClient()
    const now = new Date()

    const { data: templates, error } = await supabase
      .from('recurring_templates')
      .select(`
        id,
        customer_id,
        property_id,
        job_type,
        interval_months,
        next_due_at,
        active,
        customer:customers(id, name, email, phone),
        property:properties(id, address_line1, postcode, city)
      `)
      .eq('active', true)

    if (error) {
      return { error: error.message }
    }

    let sent = 0
    let simulated = 0
    let skipped = 0

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourboiler.co.uk'

    for (const item of templates || []) {
      const customer = item.customer as any
      const property = item.property as any

      if (!customer?.email || !item.next_due_at) {
        skipped++
        continue
      }

      const dueDate = parseISO(item.next_due_at)
      const daysUntilDue = differenceInDays(dueDate, now)

      if (daysUntilDue > 30) {
        skipped++
        continue
      }

      let serviceType: InspectionServiceType = 'boiler_service_cp12'
      if (item.job_type === 'gas_safety_check') serviceType = 'boiler_service_cp12'
      else if (item.job_type === 'annual_service') serviceType = 'gas_inspection'
      else if (item.job_type === 'central_heating') serviceType = 'fire_alarm'

      const propertyAddress = `${property?.address_line1 || 'Property'}, ${property?.postcode || ''}`
      const bookingUrl = `${appBaseUrl}/inquiry?service=${serviceType}&property=${item.property_id}&customer=${item.customer_id}`

      const res = await sendServiceReminderEmail({
        to: customer.email,
        customerName: customer.name,
        propertyAddress,
        serviceType,
        expiryDate: format(dueDate, 'dd/MM/yyyy'),
        daysRemaining: daysUntilDue,
        bookingUrl,
        preferredSlot: 'morning',
      })

      if (res.success) {
        if (res.simulated) simulated++
        else sent++
      }
    }

    revalidatePath('/admin/recurring')
    return {
      success: true,
      sent,
      simulated,
      skipped,
      message: `Automated scan complete: ${sent + simulated} reminder email(s) processed (${sent} live, ${simulated} simulated demo mode), ${skipped} skipped.`,
    }
  } catch (err: any) {
    logger.error('Error in triggerAutomatedRemindersAction', { err })
    return { error: err?.message || 'Failed to dispatch reminders' }
  }
}

/**
 * Converts a Service Reminder / Recurring Template directly into a Job with a Time Slot
 */
export async function convertReminderToJobAction(params: {
  customerId: string
  propertyId: string
  jobType: JobType
  engineerId?: string | null
  timeSlot?: ScheduleTimeSlot
  date?: string
  description?: string
}) {
  try {
    const supabase = await createClient()

    // Determine target start time based on slot
    const slot = params.timeSlot || 'morning'
    const targetDate = params.date ? parseISO(params.date) : addDays(new Date(), 1)
    
    let hour = 9 // Morning defaults to 09:00
    if (slot === 'afternoon') hour = 13 // 13:00
    if (slot === 'evening') hour = 17 // 17:00

    targetDate.setHours(hour, 0, 0, 0)

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const jobNumber = `YB-JOB-${randomSuffix}`

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        job_number: jobNumber,
        customer_id: params.customerId,
        property_id: params.propertyId,
        engineer_id: params.engineerId || null,
        job_type: params.jobType,
        status: 'scheduled',
        priority: 'medium',
        scheduled_start: targetDate.toISOString(),
        duration_minutes: 60,
        time_slot: slot,
        description: params.description || `Generated from periodic inspection reminder (${slot.toUpperCase()} slot).`,
        parts_used: [],
      })
      .select()
      .single()

    if (error || !job) {
      return { error: error?.message || 'Failed to create job from reminder' }
    }

    revalidatePath('/admin/jobs')
    revalidatePath('/admin/recurring')
    revalidatePath('/admin/scheduler')
    revalidatePath('/engineer')
    return { success: true, jobId: job.id, jobNumber: job.job_number }
  } catch (err: any) {
    return { error: err?.message || 'Failed to create job' }
  }
}
