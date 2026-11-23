'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { addMonths } from 'date-fns'
import type { SafetyResult, CertificateStatus } from '@/types/database'

const applianceSchema = z.object({
  appliance_type: z.string().min(1, 'Appliance type required'),
  make_model: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  flue_type: z.string().optional().nullable(),
  heat_input: z.string().optional().nullable(),
  gas_rate: z.string().optional().nullable(),
  working_pressure: z.string().optional().nullable(),
  combustion_reading: z.string().optional().nullable(),
  service_completed: z.boolean().default(false),
  visual_condition: z.string().optional().nullable(),
  safe_to_use: z.boolean().default(true),
})

const certificateSchema = z.object({
  job_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  property_id: z.string().uuid(),
  engineer_id: z.string().uuid(),
  landlord_name: z.string().optional().nullable(),
  landlord_address: z.string().optional().nullable(),
  company_name: z.string().default('Your Boiler Ltd'),
  company_address: z.string().default('Unit 4, Industrial Estate, London'),
  gas_safe_registration: z.string().default('654321'),
  operative_name: z.string().optional().nullable(),
  operative_id: z.string().optional().nullable(),
  safety_result: z.enum(['pass', 'fail', 'at_risk', 'immediately_dangerous'] as const),
  defects: z.string().optional().nullable(),
  remedial_actions: z.string().optional().nullable(),
  smoke_alarm_ok: z.boolean().default(true),
  co_alarm_ok: z.boolean().default(true),
  engineer_signature: z.string().optional().nullable(),
  customer_signature: z.string().optional().nullable(),
  appliances: z.array(applianceSchema).min(1, 'At least one appliance record is required'),
})

export async function createGasCertificate(input: z.infer<typeof certificateSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = certificateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid certificate details' }
  }

  // Generate sequential certificate number
  const now = new Date()
  const certNumber = `CP12-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
  const expiresAt = addMonths(now, 12).toISOString()

  // Insert certificate
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .insert({
      certificate_number: certNumber,
      job_id: parsed.data.job_id,
      customer_id: parsed.data.customer_id,
      property_id: parsed.data.property_id,
      engineer_id: parsed.data.engineer_id,
      landlord_name: parsed.data.landlord_name ?? null,
      landlord_address: parsed.data.landlord_address ?? null,
      company_name: parsed.data.company_name,
      company_address: parsed.data.company_address,
      gas_safe_registration: parsed.data.gas_safe_registration,
      operative_name: parsed.data.operative_name ?? null,
      operative_id: parsed.data.operative_id ?? null,
      safety_result: parsed.data.safety_result,
      defects: parsed.data.defects ?? null,
      remedial_actions: parsed.data.remedial_actions ?? null,
      smoke_alarm_ok: parsed.data.smoke_alarm_ok,
      co_alarm_ok: parsed.data.co_alarm_ok,
      engineer_signature: parsed.data.engineer_signature ?? null,
      customer_signature: parsed.data.customer_signature ?? null,
      status: 'issued',
      issued_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (certError || !cert) return { error: certError?.message ?? 'Failed to create certificate' }

  // Insert appliances
  const applianceRows = parsed.data.appliances.map(app => ({
    certificate_id: cert.id,
    appliance_type: app.appliance_type,
    make_model: app.make_model ?? null,
    location: app.location ?? null,
    flue_type: app.flue_type ?? null,
    heat_input: app.heat_input ?? null,
    gas_rate: app.gas_rate ?? null,
    working_pressure: app.working_pressure ?? null,
    combustion_reading: app.combustion_reading ?? null,
    service_completed: app.service_completed,
    visual_condition: app.visual_condition ?? null,
    safe_to_use: app.safe_to_use,
  }))

  const { error: appError } = await supabase
    .from('certificate_appliances')
    .insert(applianceRows)

  if (appError) return { error: appError.message }

  revalidatePath('/admin/certificates')
  revalidatePath(`/admin/jobs/${parsed.data.job_id}`)
  revalidatePath(`/admin/properties/${parsed.data.property_id}`)
  return { certificateId: cert.id, certificateNumber: certNumber }
}

export async function deleteCertificate(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: cert } = await supabase.from('certificates').select('status, certificate_number').eq('id', id).single()
  if (!cert) return { error: 'Certificate not found' }

  if (cert.status === 'issued') {
    return { error: 'Issued certificates are legally binding and immutable. They cannot be deleted.' }
  }

  const { error } = await supabase.from('certificates').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/certificates')
  return { success: true }
}
