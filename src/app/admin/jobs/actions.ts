'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { DEMO_COOKIE_NAME, parseDemoCookie } from '@/lib/auth/demo'
import { JOB_STATUS_TRANSITIONS, type JobStatus, type Priority, type JobType } from '@/types/database'

const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i

const jobSchema = z.object({
  customer_id: z.string().uuid('Please select a customer'),
  property_id: z.string().uuid('Please select a property'),
  engineer_id: z.string().uuid().nullable().optional(),
  job_type: z.enum(['boiler_installation', 'boiler_repair', 'gas_safety_check', 'annual_service', 'central_heating', 'plumbing', 'emergency_callout', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'emergency']),
  scheduled_start: z.string().optional().nullable(),
  duration_minutes: z.coerce.number().min(15).max(1440).default(60),
  description: z.string().max(2000).optional().nullable(),
  quoted_amount: z.coerce.number().min(0).optional().nullable(),
  time_slot: z.enum(['morning', 'afternoon', 'evening', 'custom']).optional().nullable(),
})

async function generateJobNumber(supabase: any): Promise<string> {
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })

  const candidate = `YB-JOB-${((count ?? 0) + 1).toString().padStart(5, '0')}`
  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .eq('job_number', candidate)
    .maybeSingle()

  if (existing) {
    return `YB-JOB-${Math.floor(10000 + Math.random() * 90000)}`
  }
  return candidate
}

export async function createJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const demoUser = parseDemoCookie(cookieStore.get(DEMO_COOKIE_NAME)?.value)

  if (!user && !demoUser) return { error: 'Unauthorized: Please sign in' }

  const raw = {
    customer_id: formData.get('customer_id'),
    property_id: formData.get('property_id'),
    engineer_id: formData.get('engineer_id') || null,
    job_type: formData.get('job_type'),
    priority: formData.get('priority') || 'medium',
    scheduled_start: formData.get('scheduled_start') || null,
    duration_minutes: formData.get('duration_minutes') || 60,
    description: formData.get('description') || null,
    quoted_amount: formData.get('quoted_amount') || null,
    time_slot: formData.get('time_slot') || 'custom',
  }

  const parsed = jobSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Check for double-booking if engineer assigned
  if (parsed.data.engineer_id && parsed.data.scheduled_start) {
    const start = new Date(parsed.data.scheduled_start)
    const end = new Date(start.getTime() + (parsed.data.duration_minutes || 60) * 60000)

    const { data: conflicts } = await supabase
      .from('jobs')
      .select('job_number')
      .eq('engineer_id', parsed.data.engineer_id)
      .in('status', ['scheduled', 'in_progress'])
      .lt('scheduled_start', end.toISOString())
      .gt('scheduled_start', new Date(start.getTime() - (parsed.data.duration_minutes || 60) * 60000).toISOString())

    if (conflicts && conflicts.length > 0) {
      return { warning: `Engineer may have a conflicting job: ${conflicts.map((c: { job_number: string }) => c.job_number).join(', ')}` }
    }
  }

  const jobNumber = await generateJobNumber(supabase)

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      job_number: jobNumber,
      ...parsed.data,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Create notification if engineer assigned
  if (parsed.data.engineer_id) {
    const { data: eng } = await supabase
      .from('engineers')
      .select('profile_id')
      .eq('id', parsed.data.engineer_id)
      .single()

    if (eng) {
      await supabase.from('notifications').insert({
        user_id: eng.profile_id,
        type: 'job_assigned',
        job_id: job.id,
        payload: { job_number: job.job_number },
      })
    }
  }

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')
  revalidatePath('/engineer')
  revalidatePath('/engineer/jobs')
  revalidatePath('/engineer/schedule')
  return { jobId: job.id }
}

export async function updateJob(jobId: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const cookieStore = await cookies()
    const demoUser = parseDemoCookie(cookieStore.get(DEMO_COOKIE_NAME)?.value)

    if (!user && !demoUser) return { error: 'Unauthorized: Please sign in' }

    const raw = {
      job_type: formData.get('job_type') as JobType,
      priority: (formData.get('priority') as Priority) || 'medium',
      scheduled_start: (formData.get('scheduled_start') as string) || null,
      duration_minutes: Number(formData.get('duration_minutes')) || 60,
      description: (formData.get('description') as string) || null,
      completion_notes: (formData.get('completion_notes') as string) || null,
      quoted_amount: formData.get('quoted_amount') ? Number(formData.get('quoted_amount')) : null,
      actual_amount: formData.get('actual_amount') ? Number(formData.get('actual_amount')) : null,
    }

    const { error } = await supabase
      .from('jobs')
      .update(raw)
      .eq('id', jobId)

    if (error) {
      logger.error('Failed to update job', { jobId, error })
      return { error: logger.toUserMessage(error) }
    }

    logger.info('Job updated', { jobId })
    revalidatePath(`/admin/jobs/${jobId}`)
    revalidatePath('/admin/jobs')
    revalidatePath('/admin/scheduler')
    revalidatePath(`/engineer/jobs/${jobId}`)
    revalidatePath('/engineer/jobs')
    revalidatePath('/engineer/schedule')
    revalidatePath('/engineer')
    return { success: true }
  } catch (err) {
    logger.error('Unexpected error in updateJob', { jobId }, err)
    return { error: 'An unexpected error occurred while updating the job' }
  }
}

export async function updateJobStatus(jobId: string, newStatus: JobStatus) {
  const supabase = await createClient()

  const { data: job } = await supabase.from('jobs').select('status').eq('id', jobId).single()
  if (!job) return { error: 'Job not found' }

  const allowed = JOB_STATUS_TRANSITIONS[job.status as JobStatus] ?? []
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${job.status} to ${newStatus}` }
  }

  const { error } = await supabase
    .from('jobs')
    .update({ status: newStatus })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/jobs')
  revalidatePath('/admin')
  revalidatePath(`/engineer/jobs/${jobId}`)
  revalidatePath('/engineer/jobs')
  revalidatePath('/engineer/schedule')
  revalidatePath('/engineer')
  return { success: true }
}

export async function assignEngineer(jobId: string, engineerId: string | null) {
  const supabase = await createClient()

  const { data: oldJob } = await supabase.from('jobs').select('engineer_id, job_number').eq('id', jobId).single()

  const { error } = await supabase
    .from('jobs')
    .update({ engineer_id: engineerId })
    .eq('id', jobId)

  if (error) return { error: error.message }

  // Notify new engineer
  if (engineerId) {
    const { data: eng } = await supabase.from('engineers').select('profile_id').eq('id', engineerId).single()
    if (eng) {
      await supabase.from('notifications').insert({
        user_id: eng.profile_id,
        type: 'job_assigned',
        job_id: jobId,
        payload: { job_number: oldJob?.job_number },
      })
    }
  }

  // Notify old engineer of unassignment
  if (oldJob?.engineer_id && oldJob.engineer_id !== engineerId) {
    const { data: oldEng } = await supabase.from('engineers').select('profile_id').eq('id', oldJob.engineer_id).single()
    if (oldEng) {
      await supabase.from('notifications').insert({
        user_id: oldEng.profile_id,
        type: 'job_unassigned',
        job_id: jobId,
        payload: { job_number: oldJob?.job_number },
      })
    }
  }

  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')
  revalidatePath(`/engineer/jobs/${jobId}`)
  revalidatePath('/engineer/jobs')
  revalidatePath('/engineer/schedule')
  revalidatePath('/engineer')
  return { success: true }
}

export async function reassignJobSchedule(
  jobId: string,
  engineerId: string | null,
  scheduledStart?: string | null,
  durationMinutes?: number
) {
  const supabase = await createClient()

  const { data: oldJob } = await supabase
    .from('jobs')
    .select('engineer_id, job_number, scheduled_start')
    .eq('id', jobId)
    .single()

  const updatePayload: Record<string, any> = { engineer_id: engineerId }
  if (scheduledStart !== undefined) {
    updatePayload.scheduled_start = scheduledStart
  }
  if (durationMinutes !== undefined) {
    updatePayload.duration_minutes = durationMinutes
  }

  const { error } = await supabase
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId)

  if (error) return { error: error.message }

  // Notify new engineer
  if (engineerId) {
    const { data: eng } = await supabase.from('engineers').select('profile_id').eq('id', engineerId).single()
    if (eng) {
      await supabase.from('notifications').insert({
        user_id: eng.profile_id,
        type: 'job_assigned',
        job_id: jobId,
        payload: { job_number: oldJob?.job_number },
      })
    }
  }

  // Notify old engineer of unassignment
  if (oldJob?.engineer_id && oldJob.engineer_id !== engineerId) {
    const { data: oldEng } = await supabase.from('engineers').select('profile_id').eq('id', oldJob.engineer_id).single()
    if (oldEng) {
      await supabase.from('notifications').insert({
        user_id: oldEng.profile_id,
        type: 'job_unassigned',
        job_id: jobId,
        payload: { job_number: oldJob?.job_number },
      })
    }
  }

  revalidatePath('/admin/scheduler')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/jobs')
  revalidatePath('/admin')
  revalidatePath(`/engineer/jobs/${jobId}`)
  revalidatePath('/engineer/jobs')
  revalidatePath('/engineer/schedule')
  revalidatePath('/engineer')
  return { success: true }
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient()

  // Check for linked certs or invoices
  const [{ count: certCount }, { count: invCount }] = await Promise.all([
    supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
  ])

  if ((certCount ?? 0) > 0) return { error: 'Cannot delete a job with linked certificates' }
  if ((invCount ?? 0) > 0) return { error: 'Cannot delete a job with linked invoices' }

  const { error } = await supabase.from('jobs').delete().eq('id', jobId)
  if (error) return { error: error.message }

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')
  revalidatePath('/engineer/jobs')
  revalidatePath('/engineer/schedule')
  revalidatePath('/engineer')
  return { success: true }
}

export async function saveEngineerJobProgress(
  jobId: string,
  data: {
    completion_notes?: string | null
    parts_used?: any[]
    status?: JobStatus
  }
) {
  const supabase = await createClient()

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.completion_notes !== undefined) {
    updatePayload.completion_notes = data.completion_notes
  }

  if (data.parts_used !== undefined) {
    updatePayload.parts_used = data.parts_used
  }

  if (data.status) {
    updatePayload.status = data.status
  }

  const { error } = await supabase
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/engineer/jobs/${jobId}`)
  revalidatePath('/engineer/jobs')
  revalidatePath('/engineer/schedule')
  revalidatePath('/engineer')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/jobs')
  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')

  return { success: true }
}
