import { logger } from '@/lib/logger'
import {
  type InspectionServiceType,
  type ScheduleTimeSlot,
  INSPECTION_SERVICE_LABELS,
  SCHEDULE_TIME_SLOT_LABELS,
} from '@/types/database'

export interface SendReminderEmailParams {
  to: string
  customerName: string
  propertyAddress: string
  serviceType: InspectionServiceType
  expiryDate: string
  daysRemaining: number
  bookingUrl: string
  preferredSlot?: ScheduleTimeSlot
}

export interface EmailSendResult {
  success: boolean
  id?: string
  error?: string
  simulated?: boolean
}

/**
 * Builds high-contrast, professional HTML email for inspection & safety reminders
 */
function buildReminderHtml(params: SendReminderEmailParams): string {
  const serviceLabel = INSPECTION_SERVICE_LABELS[params.serviceType] || 'Safety Inspection'
  const isExpired = params.daysRemaining <= 0
  const urgencyColor = isExpired ? '#ef4444' : params.daysRemaining <= 14 ? '#f59e0b' : '#10b981'
  const urgencyBadge = isExpired
    ? 'EXPIRED — IMMEDIATE ACTION REQUIRED'
    : params.daysRemaining <= 14
    ? `URGENT — EXPIRES IN ${params.daysRemaining} DAYS`
    : `DUE IN ${params.daysRemaining} DAYS`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${serviceLabel} Reminder — Your Boiler Ltd</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c0e; color: #f4f4f5; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #131417; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }
    .header { background: #18191d; padding: 24px 32px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: ${urgencyColor}18; color: ${urgencyColor}; border: 1px solid ${urgencyColor}40; }
    .content { padding: 32px; }
    .title { font-size: 21px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.02em; }
    .subtitle { font-size: 14px; color: #a1a1aa; line-height: 1.5; margin-bottom: 24px; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .label { color: #71717a; }
    .value { font-weight: 600; color: #f4f4f5; text-align: right; }
    .slots { display: flex; gap: 8px; margin: 18px 0; }
    .slot-pill { flex: 1; text-align: center; background: #1c1d22; border: 1px solid rgba(255,255,255,0.1); padding: 10px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #e4e4e7; }
    .cta-btn { display: block; text-align: center; background: #d4fa35; color: #0b0c0e; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 24px; border-radius: 99px; margin-top: 24px; box-shadow: 0 4px 14px rgba(212,250,53,0.3); }
    .footer { padding: 20px 32px; background: #0f1013; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #71717a; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">YOUR BOILER LTD</div>
      <div class="badge">${urgencyBadge}</div>
    </div>
    <div class="content">
      <h1 class="title">Inspection &amp; Service Due</h1>
      <p class="subtitle">
        Hello ${params.customerName}, your property's <strong>${serviceLabel}</strong> is due for inspection to maintain compliance with UK safety regulations.
      </p>

      <div class="card">
        <div class="row">
          <span class="label">Service Category</span>
          <span class="value">${serviceLabel}</span>
        </div>
        <div class="row">
          <span class="label">Property Address</span>
          <span class="value">${params.propertyAddress}</span>
        </div>
        <div class="row">
          <span class="label">Current Expiry</span>
          <span class="value" style="color: ${urgencyColor};">${params.expiryDate}</span>
        </div>
      </div>

      <div style="font-size: 13px; font-weight: 600; color: #d4d4d8; margin-bottom: 6px;">
        Choose Your Preferred Arrival Window:
      </div>
      <div class="slots">
        <div class="slot-pill">Morning<br><span style="font-size: 10px; color: #a1a1aa;">08:00 – 12:00</span></div>
        <div class="slot-pill">Afternoon<br><span style="font-size: 10px; color: #a1a1aa;">12:00 – 16:00</span></div>
        <div class="slot-pill">Evening<br><span style="font-size: 10px; color: #a1a1aa;">16:00 – 20:00</span></div>
      </div>

      <a href="${params.bookingUrl}" class="cta-btn">
        Schedule Your Service Now →
      </a>
    </div>
    <div class="footer">
      Your Boiler Ltd · Gas Safe Register No. 198745<br>
      895 Osmaston Road, Allenton, DE24 9BR · Tel: 07973 432698<br>
      Need assistance? Reply directly to this email or call our team.
    </div>
  </div>
</body>
</html>
`
}

/**
 * Sends transactional email via Resend REST API or simulates in local/sandbox mode
 */
export async function sendServiceReminderEmail(
  params: SendReminderEmailParams
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'reminders@yourboiler.co.uk'
  const serviceLabel = INSPECTION_SERVICE_LABELS[params.serviceType] || 'Service'

  // If no API key configured (e.g. initial setup / sandbox test), gracefully simulate and log
  if (!apiKey || apiKey === 're_test_dummy_key') {
    logger.info('Resend Email Dispatch Simulated (RESEND_API_KEY not configured)', {
      to: params.to,
      service: serviceLabel,
      property: params.propertyAddress,
      expiryDate: params.expiryDate,
      daysRemaining: params.daysRemaining,
    })
    return {
      success: true,
      id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      simulated: true,
    }
  }

  try {
    const htmlContent = buildReminderHtml(params)
    const subject = params.daysRemaining <= 0
      ? `EXPIRED: ${serviceLabel} for ${params.propertyAddress}`
      : `Reminder: ${serviceLabel} due in ${params.daysRemaining} days — ${params.propertyAddress}`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Your Boiler Ltd <${fromEmail}>`,
        to: [params.to],
        subject,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}))
      const errorMessage = errorJson?.message || `Resend API returned status ${response.status}`
      logger.error('Failed to send Resend reminder email', { error: errorMessage, params })
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    logger.info('Resend reminder email sent successfully', { id: data.id, to: params.to })
    return { success: true, id: data.id }
  } catch (err: any) {
    logger.error('Unexpected error in sendServiceReminderEmail', { err: err?.message, params })
    return { success: false, error: err?.message || 'Failed to dispatch email' }
  }
}
