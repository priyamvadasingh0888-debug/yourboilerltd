'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Phone,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Play
} from 'lucide-react'
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns'
import { BottomSheet } from '@/components/engineer/bottom-sheet'
import { PullToRefresh } from '@/components/engineer/pull-to-refresh'
import { saveEngineerJobProgress } from '@/app/admin/jobs/actions'
import type { JobStatus } from '@/types/database'

interface Props {
  initialJobs: any[]
}

export function ScheduleClient({ initialJobs }: Props) {
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>(initialJobs)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  const handleUpdateStatus = async (jobId: string, newStatus: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob({ ...selectedJob, status: newStatus })
    }
    try {
      await saveEngineerJobProgress(jobId, { status: newStatus })
      router.refresh()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  // Filter jobs for selected date
  const dayJobs = jobs.filter((job) => {
    if (!job.scheduled_start) return false
    try {
      return isSameDay(parseISO(job.scheduled_start), selectedDate)
    } catch {
      return false
    }
  })

  // Hours array from 08:00 to 17:00
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

  return (
    <PullToRefresh>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111215', margin: 0 }}>
              Operative Schedule
            </h1>
            <p style={{ fontSize: '12px', color: '#747b86', margin: '2px 0 0 0' }}>
              Day planner &amp; appointment routes
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            className="neo-btn-outline"
            style={{ padding: '6px 12px', fontSize: '11px' }}
          >
            Today
          </button>
        </div>

        {/* Date Navigator Bar */}
        <div
          className="neo-card"
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f0f2f5',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111215' }}>
              {format(selectedDate, 'EEEE, d MMMM')}
            </div>
            <div style={{ fontSize: '11px', color: '#747b86' }}>
              {dayJobs.length} {dayJobs.length === 1 ? 'appointment' : 'appointments'} scheduled
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f0f2f5',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Schedule List / Appointments (Evenly Spaced Cards) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {dayJobs.length === 0 ? (
            <div
              className="neo-card"
              style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: '#747b86',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111215' }}>
                No appointments scheduled
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Enjoy your downtime or check with dispatch.
              </div>
            </div>
          ) : (
            dayJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => {
                  setSelectedJob(job)
                  setIsSheetOpen(true)
                }}
                className="neo-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  cursor: 'pointer',
                  border: job.status === 'in_progress' ? '1.5px solid #111215' : undefined,
                  boxShadow: job.status === 'in_progress' ? '0 4px 16px rgba(0, 0, 0, 0.08)' : undefined,
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#f0f2f5',
                        color: '#111215',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : '09:00'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111215', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.description || job.job_type?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '99px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: job.status === 'in_progress' ? '#111215' : '#f0f2f5',
                      color: job.status === 'in_progress' ? '#d4fa35' : '#747b86',
                    }}
                  >
                    {job.job_number}
                  </span>
                </div>

                {/* Customer and Address */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#52525b', paddingTop: '4px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '8px' }}>
                    {job.customer?.name} · {job.property?.address_line1}, <strong>{job.property?.postcode}</strong>
                  </div>

                  <span style={{ fontSize: '11px', color: '#747b86', flexShrink: 0 }}>
                    {job.duration_minutes || 60}m
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Slide-Up Bottom Sheet for Job Detail */}
        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title={selectedJob?.job_number || 'Appointment Details'}
          subtitle={selectedJob?.description || selectedJob?.job_type}
        >
          {selectedJob && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8f9fb', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#747b86' }}>Scheduled Time</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111215' }}>
                    {selectedJob.scheduled_start ? format(parseISO(selectedJob.scheduled_start), 'HH:mm') : '09:30'} · {selectedJob.duration_minutes || 60} mins
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '99px',
                    background: selectedJob.status === 'in_progress' ? '#d4fa35' : '#ffffff',
                    color: '#111215',
                  }}
                >
                  {selectedJob.status}
                </span>
              </div>

              {/* Address with 1-tap navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8f9fb', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} color="#747b86" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedJob.property?.address_line1}</div>
                    <div style={{ fontSize: '11px', color: '#747b86' }}>{selectedJob.property?.postcode}</div>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedJob.property?.address_line1}, ${selectedJob.property?.postcode}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="neo-btn-black"
                  style={{ padding: '8px 12px', fontSize: '11px' }}
                >
                  Google Maps
                </a>
              </div>

              {selectedJob.customer?.phone && (
                <a
                  href={`tel:${selectedJob.customer.phone}`}
                  className="neo-btn-lime"
                  style={{ width: '100%', padding: '12px', textAlign: 'center' }}
                >
                  <Phone size={14} /> Call Customer ({selectedJob.customer.name})
                </a>
              )}

              {selectedJob.status !== 'in_progress' && selectedJob.status !== 'completed' && (
                <button
                  type="button"
                  className="neo-btn-black"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                  onClick={() => handleUpdateStatus(selectedJob.id, 'in_progress')}
                >
                  <Play size={14} /> Start Work
                </button>
              )}

              {selectedJob.status === 'in_progress' && (
                <button
                  type="button"
                  className="neo-btn-lime"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                  onClick={() => handleUpdateStatus(selectedJob.id, 'completed')}
                >
                  <CheckCircle2 size={14} /> Mark Completed
                </button>
              )}

              <Link
                href={`/engineer/jobs/${selectedJob.id}`}
                className="neo-btn-outline"
                style={{ width: '100%', padding: '12px', textAlign: 'center' }}
              >
                Go to Full Job Sheet <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </BottomSheet>
      </div>
    </PullToRefresh>
  )
}
