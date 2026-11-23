import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseISO, differenceInDays, format } from 'date-fns'
import { sendServiceReminderEmail } from '@/lib/email/resend'
import { logger } from '@/lib/logger'
import { type InspectionServiceType, type ScheduleTimeSlot } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleAutomatedReminders(request)
}

export async function POST(request: Request) {
  return handleAutomatedReminders(request)
}

async function handleAutomatedReminders(request: Request) {
  try {
    // Optional bearer secret check for external cron callers
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow internal demo or admin call
      const { searchParams } = new URL(request.url)
      const token = searchParams.get('token')
      if (token !== cronSecret && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = await createClient()
    const now = new Date()

    // Query active recurring templates & reminders with joined customer and property info
    const { data: templates, error } = await supabase
      .from('recurring_templates')
      .select(`
        id,
        customer_id,
        property_id,
        job_type,
        interval_months,
        next_due_at,
        last_completed_at,
        active,
        customer:customers(id, name, email, phone),
        property:properties(id, address_line1, postcode, city)
      `)
      .eq('active', true)

    if (error) {
      logger.error('Failed to query recurring templates for automated reminders', { error })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = {
      totalChecked: templates?.length || 0,
      emailsSent: 0,
      skipped: 0,
      errors: [] as string[],
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourboiler.co.uk'

    for (const item of templates || []) {
      const customer = item.customer as any
      const property = item.property as any

      if (!customer?.email) {
        results.skipped++
        continue
      }

      if (!item.next_due_at) {
        results.skipped++
        continue
      }

      const dueDate = parseISO(item.next_due_at)
      const daysUntilDue = differenceInDays(dueDate, now)

      // Only trigger if due within 30 days or overdue
      if (daysUntilDue > 30) {
        results.skipped++
        continue
      }

      // Map job_type to InspectionServiceType
      let serviceType: InspectionServiceType = 'boiler_service_cp12'
      if (item.job_type === 'gas_safety_check') serviceType = 'boiler_service_cp12'
      else if (item.job_type === 'annual_service') serviceType = 'gas_inspection'
      else if (item.job_type === 'central_heating') serviceType = 'fire_alarm'

      const propertyAddress = `${property?.address_line1 || 'Property'}, ${property?.postcode || ''}`
      const bookingUrl = `${appBaseUrl}/inquiry?service=${serviceType}&property=${item.property_id}&customer=${item.customer_id}`

      const emailResult = await sendServiceReminderEmail({
        to: customer.email,
        customerName: customer.name,
        propertyAddress,
        serviceType,
        expiryDate: format(dueDate, 'dd/MM/yyyy'),
        daysRemaining: daysUntilDue,
        bookingUrl,
        preferredSlot: 'morning',
      })

      if (emailResult.success) {
        results.emailsSent++
      } else if (emailResult.error) {
        results.errors.push(`${customer.email}: ${emailResult.error}`)
      }
    }

    logger.info('Automated reminder cron cycle completed', results)
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: results,
    })
  } catch (err: any) {
    logger.error('Unexpected error in automated reminder cron', { error: err?.message })
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
