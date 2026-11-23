'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RealtimeJobAlert {
  id: string
  job_number: string
  description?: string | null
  job_type: string
  priority?: string
  scheduled_start?: string | null
  customer_name?: string
}

interface UseRealtimeJobsOptions {
  initialJobs: any[]
  engineerId?: string
  userId?: string
}

export function useRealtimeJobs({
  initialJobs,
  engineerId,
  userId,
}: UseRealtimeJobsOptions) {
  const [jobs, setJobs] = useState<any[]>(initialJobs)
  const [newJobAlert, setNewJobAlert] = useState<RealtimeJobAlert | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Sync state if initialJobs changes
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  // Trigger tactile / audio feedback when new job is assigned
  const notifyEngineer = useCallback((job: RealtimeJobAlert) => {
    setNewJobAlert(job)

    // Haptic vibration on mobile devices
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 80, 150])
      } catch {}
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Create a unique channel for this engineer's live dispatch feed
    const channelName = engineerId ? `engineer-dispatch-${engineerId}` : 'engineer-dispatch-all'
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'jobs',
        },
        async (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === 'INSERT') {
            // Check if job is assigned to this engineer
            if (newRecord.engineer_id === engineerId || !engineerId) {
              // Fetch complete job with relation joins
              const { data: fullJob } = await supabase
                .from('jobs')
                .select('*, customer:customers(name, phone), property:properties(address_line1, postcode, city)')
                .eq('id', newRecord.id)
                .single()

              const jobToAdd = fullJob || newRecord
              setJobs((prev) => [jobToAdd, ...prev.filter((j) => j.id !== jobToAdd.id)])

              notifyEngineer({
                id: newRecord.id,
                job_number: newRecord.job_number || 'NEW-JOB',
                description: newRecord.description,
                job_type: newRecord.job_type,
                priority: newRecord.priority,
                scheduled_start: newRecord.scheduled_start,
                customer_name: fullJob?.customer?.name,
              })
            }
          } else if (eventType === 'UPDATE') {
            // If now assigned to this engineer
            if (newRecord.engineer_id === engineerId) {
              const { data: fullJob } = await supabase
                .from('jobs')
                .select('*, customer:customers(name, phone), property:properties(address_line1, postcode, city)')
                .eq('id', newRecord.id)
                .single()

              const updatedJob = fullJob || newRecord
              const wasAlreadyAssigned = jobs.some((j) => j.id === newRecord.id)

              setJobs((prev) => {
                const exists = prev.some((j) => j.id === updatedJob.id)
                if (exists) {
                  return prev.map((j) => (j.id === updatedJob.id ? { ...j, ...updatedJob } : j))
                }
                return [updatedJob, ...prev]
              })

              // If it was newly assigned to this engineer, alert them
              if (!wasAlreadyAssigned || oldRecord?.engineer_id !== engineerId) {
                notifyEngineer({
                  id: newRecord.id,
                  job_number: newRecord.job_number || 'NEW-JOB',
                  description: newRecord.description,
                  job_type: newRecord.job_type,
                  priority: newRecord.priority,
                  scheduled_start: newRecord.scheduled_start,
                  customer_name: fullJob?.customer?.name,
                })
              }
            } else if (oldRecord?.engineer_id === engineerId && newRecord.engineer_id !== engineerId) {
              // Reassigned away from this engineer
              setJobs((prev) => prev.filter((j) => j.id !== newRecord.id))
            } else {
              // Status or property update for current job
              setJobs((prev) =>
                prev.map((j) => (j.id === newRecord.id ? { ...j, ...newRecord } : j))
              )
            }
          } else if (eventType === 'DELETE') {
            setJobs((prev) => prev.filter((j) => j.id !== oldRecord.id))
          }
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [engineerId, notifyEngineer, jobs])

  const clearAlert = useCallback(() => {
    setNewJobAlert(null)
  }, [])

  return {
    jobs,
    setJobs,
    newJobAlert,
    clearAlert,
    isConnected,
  }
}
